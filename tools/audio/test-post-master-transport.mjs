import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),esbuild=require(process.env.XENSONAR_ESBUILD_MODULE||'esbuild');
const root=path.resolve(import.meta.dirname,'../..');
const result=esbuild.buildSync({entryPoints:[path.join(root,'src/features/xensonar/audio/postMasterPcmTransport.ts')],bundle:true,write:false,format:'esm',platform:'browser'});
const {createPostMasterPcmTransport:create}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const tick=()=>new Promise(r=>setImmediate(r));
const globals={AudioWorkletNode:globalThis.AudioWorkletNode,Worker:globalThis.Worker,crossOriginIsolated:globalThis.crossOriginIsolated};
const connections=new Set(),workers=[],taps=[];let terminated=0,moduleLoads=0;
class Node {
  port={onmessage:null,postMessage:m=>{if(m.type==='FENCE')queueMicrotask(()=>this.port.onmessage?.({data:{type:'TAP_FENCED'}}));},close:()=>{this.closed=true;}};
  constructor(){taps.push(this);}connect(to){connections.add(to);}disconnect(){this.disconnected=true;}
}
class Worker {
  constructor(){workers.push(this);}postMessage(m){
    if(m.type==='INIT')queueMicrotask(()=>{this.onmessage({data:{type:'ARMED',generation:5}});this.onmessage({data:{type:'PREFILLED',generation:5}});});
    if(m.type==='COMMIT')queueMicrotask(()=>this.onmessage({data:{type:'COMMITTED',generation:5}}));
    if(m.type==='STOP')queueMicrotask(()=>this.onmessage({data:{type:'STOPPED',generation:5,confirmed:true}}));
  }
  terminate(){terminated++;}
}
Object.assign(globalThis,{AudioWorkletNode:Node,Worker,crossOriginIsolated:true});
try {
  let finishLoad;
  const ctx={audioWorklet:{addModule:()=>{moduleLoads++;return new Promise(r=>finishLoad=r);}},sampleRate:48000,destination:{},createGain:()=>({gain:{},connect:()=>{},disconnect:()=>{}})};
  const master={connect:node=>connections.add(node),disconnect:node=>connections.delete(node)};
  const ports=()=>create({context:ctx,master,baseUrl:'http://127.0.0.1:1',onProgress:()=>{},onFault:m=>{throw new Error(m);}});
  const first=ports(),abort=new AbortController(),preparing=first.prepare(abort.signal);
  abort.abort();await assert.rejects(preparing,/cancelled/);assert.equal((await first.stop()).confirmed,true);first.dispose();
  finishLoad();await tick();assert.equal(workers.length,0);assert.equal(taps.length,0);
  for(let i=0;i<3;i++){
    const t=ports(),signal=new AbortController().signal;await t.prepare(signal);await t.settleBrowserMaster(signal);await t.commit(signal);
    assert.equal((await t.stop()).confirmed,true);t.dispose();t.dispose();
  }
  assert.equal(moduleLoads,1);assert.equal(terminated,3);assert.ok(taps.every(t=>t.closed&&t.disconnected));
  assert.ok(taps.every(t=>!connections.has(t)));
  console.log(JSON.stringify({pass:true,proof:'real-transport-with-audio-worker-models',checks:['late-module-cancel','shared-module-registration','fence','three-clean-teardowns','targeted-master-tap-disconnect'],physicalAudio:false}));
} finally {Object.assign(globalThis,globals);}
