import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
const source=fs.readFileSync(path.join(root,'src/features/xensonar/audio/postMasterPcmWorkerSource.ts'),'utf8');
const sandbox={};vm.runInNewContext(source.replace('export const POST_MASTER_PCM_WORKER_SOURCE','globalThis.source'),sandbox);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
function fixture(options={}) {
  const messages=[], packets=[], fetches=[], sockets=[];
  const audioSab=new SharedArrayBuffer(8+(32768*2+1)*4), controlSab=new SharedArrayBuffer(64);
  const control=new Int32Array(controlSab), wr=new Uint32Array(audioSab,0,1), rd=new Uint32Array(audioSab,4,1), data=new Float32Array(audioSab,8);
  let origin=4800, produced=0, acknowledged=false;
  const timers=new Set();
  const later=(fn,ms=0)=>{const t=setTimeout(()=>{timers.delete(t);fn();},ms);timers.add(t);return t;};
  const reply=(ws,m,delay=0)=>later(()=>ws.onmessage?.({data:JSON.stringify({generation:7,...m})}),delay);
  class Socket {
    static OPEN=1;
    readyState=0;bufferedAmount=0;
    constructor(){sockets.push(this);later(()=>{this.readyState=1;this.onopen?.();});}
    send(buffer){
      const copy=buffer.slice(0),v=new DataView(copy),type=v.getUint32(0,true);
      packets.push({type,copy,beforeAck:!acknowledged});
      if(type===4)reply(this,{type:'BARRIER',fillFrames:2048,fault:false});
      if(type===2){later(()=>{acknowledged=true;reply(this,{type:'COMMITTED',fillFrames:2048});},options.commitDelay??0);}
      if(type===3&&!options.stopTimeout)reply(this,{type:'STOPPED',confirmed:true});
    }
    close(){this.readyState=3;later(()=>this.onclose?.());}
  }
  const fetch=async(url,init)=>{
    const route=new URL(url).pathname;fetches.push({route,init});
    if(route.endsWith('/session'))return {ok:true,json:async()=>({physicalAudio:options.physical!==false,postMasterProtocol:options.protocol??2,
      postMasterExclusive:true,sampleRate:48000,token:'mock-token',sessionId:'mock-session'})};
    if(route.endsWith('/begin')){if(options.begin)await options.begin;return{ok:true,json:async()=>({generation:7})};}
    if(route.endsWith('/stop')){if(options.stopTimeout)throw new Error('network-unavailable');return{ok:true,json:async()=>({confirmed:true,generation:7})};}
    throw new Error('unexpected-route');
  };
  const self={postMessage:m=>messages.push(m)};
  const context=vm.createContext({self,fetch,WebSocket:Socket,performance,SharedArrayBuffer,Uint32Array,Float32Array,Int32Array,DataView,ArrayBuffer,Atomics,AbortController,
    setTimeout:later,clearTimeout:t=>{clearTimeout(t);timers.delete(t);}});
  vm.runInContext(sandbox.source,context);
  const send=m=>self.onmessage({data:m});
  const produce=frames=>{
    let at=Atomics.load(wr,0);
    for(let f=0;f<frames;f++){data[at]=((produced+f)%997)/997;at=(at+1)%data.length;data[at]=-((produced+f)%997)/997;at=(at+1)%data.length;}
    produced+=frames;Atomics.store(wr,0,at);Atomics.store(control,0,origin);Atomics.store(control,2,1);
  };
  const wait=async type=>{for(let i=0;i<2500;i++){const m=messages.find(m=>m.type===type);if(m)return m;await sleep(1);}throw new Error('missing '+type+JSON.stringify(messages));};
  return{messages,packets,fetches,sockets,send,produce,wait,init(){send({type:'INIT',audioSab,controlSab,sampleRate:48000,blockFrames:1024,prefillFrames:2048,baseUrl:'http://127.0.0.1:1'});},
    async close(){send({type:'STOP'});await wait('STOPPED');await sleep(2);for(const t of timers)clearTimeout(t);}};
}
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
await test('prefill is silent; real PCM pump continues during a delayed commit ACK',async()=>{
  const f=fixture({commitDelay:80});f.produce(2048);f.init();await f.wait('PREFILLED');
  assert.equal(f.packets.filter(p=>p.type===2).length,0);
  f.produce(2048);f.send({type:'COMMIT',generation:7});await sleep(15);
  const pcm=f.packets.filter(p=>p.type===1);assert.equal(pcm.length,4);assert.ok(pcm.every(p=>p.beforeAck));
  for(let b=0;b<pcm.length;b++){
    const v=new DataView(pcm[b].copy);assert.equal(v.getBigUint64(8,true),BigInt(b));
    assert.equal(v.getBigUint64(16,true),BigInt(4800+b*1024));
    const samples=new Float32Array(pcm[b].copy,32);
    for(let i=0;i<1024;i++){assert.equal(samples[i*2],Math.fround(((b*1024+i)%997)/997));assert.equal(samples[i*2+1],Math.fround(-((b*1024+i)%997)/997));}
  }
  await f.wait('COMMITTED');await f.close();assert.equal(f.messages.find(m=>m.type==='STOPPED').confirmed,true);
});
await test('cancellation during BEGIN cleans the late generation without committing',async()=>{
  const begin=deferred(),f=fixture({begin:begin.promise});f.init();await sleep(5);f.send({type:'STOP'});
  begin.resolve();const stopped=await f.wait('STOPPED');assert.equal(stopped.confirmed,true);
  assert.equal(f.sockets.length,0);assert.ok(f.fetches.some(x=>x.route.endsWith('/stop')));await f.close();
});
await test('lost STOP ACK and failed control fallback report unknown ownership',async()=>{
  const f=fixture({stopTimeout:true});f.produce(2048);f.init();await f.wait('PREFILLED');
  f.send({type:'COMMIT',generation:7});await f.wait('COMMITTED');f.send({type:'STOP'});
  const stopped=await f.wait('STOPPED');assert.equal(stopped.confirmed,false);await f.close();
});
await test('old protocol and null driver are rejected before native BEGIN',async()=>{
  for(const options of [{protocol:1},{physical:false}]){
    const f=fixture(options);f.init();await f.wait('FAULT');
    assert.ok(!f.fetches.some(x=>x.route.endsWith('/begin')));await f.close();
  }
});
await test('socket failure is retained; a stale generation cannot confirm commit',async()=>{
  const f=fixture({commitDelay:100});f.produce(2048);f.init();await f.wait('PREFILLED');
  f.send({type:'COMMIT',generation:7});f.sockets[0].onmessage({data:JSON.stringify({type:'COMMITTED',generation:8})});
  const fault=await f.wait('FAULT');assert.match(fault.error,/generation/);await f.close();
  assert.ok(!f.messages.some(m=>m.type==='COMMITTED'));
});
console.log(JSON.stringify({pass:true,tests:passed,proof:'real-worker-code-with-model-transport-and-clock',physicalAudio:false}));
