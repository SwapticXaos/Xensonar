import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
const host=process.argv[2], legacy=process.argv.includes('--baseline');
if(!host)throw new Error('usage: node test_post_master_stream.mjs HOST [--baseline]');
const child=spawn(host,[legacy?'--service-null':'--post-master-null'],{stdio:['ignore','pipe','pipe']});
const lines=createInterface({input:child.stdout});
const ready=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('host-ready-timeout')),3000);lines.on('line',line=>{const m=JSON.parse(line);if(m.type==='sidecar-ready'){clearTimeout(t);resolve(m);}});child.on('exit',code=>reject(new Error('host-exit-'+code)));});
const base=ready.origin;
const session=await(await fetch(base+'/v1/session')).json();
assert.equal(session.physicalAudio,false);
const headers={'Origin':base,'X-Xensonar-Token':session.token,'X-Xensonar-Session':session.sessionId,'Content-Type':'application/x-www-form-urlencoded'};
const request=async(route,body='')=>{const r=await fetch(base+route,{method:'POST',headers,body});return{status:r.status,body:await r.json()};};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ws;
try {
  if(!legacy){assert.equal(session.postMasterProtocol,2);assert.equal(session.postMasterExclusive,true);
    assert.equal((await request('/v1/state','revision=10&root=330&gain=1')).status,409);}
  const begin=await request('/v1/post-master/begin','sampleRate=48000&channels=2&prefillFrames=2048');assert.equal(begin.status,202);
  const gen=begin.body.generation;
  if(!legacy)assert.notEqual((await request('/v1/post-master/begin','sampleRate=48000&channels=2&prefillFrames=2048')).status,202);
  ws=new WebSocket(base.replace('http:','ws:')+'/v1/post-master/stream?token='+session.token+'&session='+session.sessionId+'&generation='+gen);
  const messages=[];
  ws.addEventListener('message',e=>messages.push({...JSON.parse(e.data),at:performance.now()}));
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=()=>reject(new Error('open-failed'));});
  const wait=async(type,after=0)=>{for(let i=0;i<1200;i++){const m=messages.find(m=>m.type===type&&m.at>=after);if(m)return m;const fault=messages.find(m=>m.type==='FAULT');if(fault)throw new Error(fault.error);await sleep(1);}throw new Error(type+'-timeout');};
  let seq=0,frame=123456;
  const send=type=>{
    const count=type===1?1024:0,b=new ArrayBuffer(count?32+count*8:8),d=new DataView(b);
    d.setUint32(0,type,true);d.setUint32(4,gen,true);
    if(count){d.setBigUint64(8,BigInt(seq++),true);d.setBigUint64(16,BigInt(frame),true);d.setUint32(24,count,true);d.setUint32(28,48000,true);
      const a=new Float32Array(b,32);for(let i=0;i<count;i++){a[i*2]=Math.sin((frame+i)*Math.PI*2*440/48000)*0.05;a[i*2+1]=-a[i*2];}frame+=count;}
    ws.send(b);
  };
  send(1);send(1);
  const barrierAt=performance.now();send(4);const barrier=await wait('BARRIER',barrierAt);
  const commitAt=performance.now();send(2);
  // The candidate keeps the data plane alive during ACK latency. Baseline mode
  // reproduces the old pause, so this comparison covers the actual transition.
  let producer;
  if(!legacy)producer=setInterval(()=>send(1),1024*1000/48000);
  const commit=await wait('COMMITTED',commitAt);
  if(legacy)producer=setInterval(()=>send(1),1024*1000/48000);
  await sleep(800);
  const status=(await request('/v1/status')).body;
  clearInterval(producer);
  const stopAt=performance.now();send(3);const stopped=legacy ? await wait('STOPPED',stopAt).catch(()=>({at:performance.now(),confirmed:false})) : await wait('STOPPED',stopAt);
  ws.close(); await sleep(20);
  if(!legacy){assert.equal(stopped.generation,gen);assert.equal(stopped.confirmed,true);
    assert.equal((await request('/v1/post-master/stop','generation='+gen)).body.confirmed,true);
    assert.equal((await request('/v1/post-master/begin','sampleRate=48000&channels=2&prefillFrames=2048')).status,202);}
  const result={variant:legacy?'398-baseline':'399',physicalAudio:false,proof:'real-localhost-websocket-and-null-callback',
    barrierAckMs:+(barrier.at-barrierAt).toFixed(2),commitAckMs:+(commit.at-commitAt).toFixed(2),
    stopAckMs:+(stopped.at-stopAt).toFixed(2),underruns:status.postMasterUnderrunCallbacks,
    continuityErrors:status.postMasterContinuityErrors,ingressFrames:status.postMasterIngressFrames,minFill:status.postMasterMinFillFrames,
    pass:status.postMasterUnderrunCallbacks===0&&status.postMasterContinuityErrors===0};
  console.log(JSON.stringify(result));
  if(!legacy)assert.equal(result.pass,true);
} finally {
  ws?.close();
  try{await request('/v1/shutdown');}catch{}
  if(child.exitCode===null)await Promise.race([once(child,'exit'),sleep(2500)]);
  if(child.exitCode===null)child.kill('SIGKILL');
  lines.close();
}
