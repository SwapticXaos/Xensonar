'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.resolve(__dirname,'..');
const SRC=fs.readFileSync(path.join(ROOT,'src/startup/02_runtime_hygiene.js'),'utf8');

function makeEnv({protocol='https:',workerImpl}={}){
 const created=[],revoked=[];
 let seq=0;
 class FakeBlob{constructor(parts,opts){this.parts=parts;this.type=opts?.type||''}}
 const env={
  Blob:FakeBlob,
  URL:{
   createObjectURL(b){const u='blob:xen-'+(++seq);created.push({url:u,blob:b});return u},
   revokeObjectURL(u){revoked.push(u)}
  },
  location:{protocol},
  Worker:workerImpl||class{constructor(){throw Error('no worker')}},
  DOMException,Error,Number,Object,Promise,setTimeout,clearTimeout,encodeURIComponent
 };
 env.globalThis=env;
 vm.createContext(env);
 vm.runInContext(SRC,env);
 return {env,created,revoked};
}

test('__xenAddWorkletModule uses blob first on https and revokes URL in finally',async()=>{
 const calls=[];
 const {env,revoked}=makeEnv({protocol:'https:'});
 const ctx={audioWorklet:{addModule:async u=>{calls.push(u)}}};
 const mode=await env.__XenRuntimeHygiene.addWorkletModule(ctx,'registerProcessor("a",class{})');
 assert.equal(mode,'blob');
 assert.equal(calls.length,1);
 assert.ok(calls[0].startsWith('blob:xen-'));
 assert.deepEqual(revoked,[calls[0]]);
});

test('__xenAddWorkletModule falls back to data URL when blob fails and revokes blob',async()=>{
 const calls=[];
 const {env,revoked}=makeEnv({protocol:'https:'});
 const ctx={audioWorklet:{addModule:async u=>{calls.push(u);if(u.startsWith('blob:'))throw Error('blocked')}}};
 const mode=await env.__XenRuntimeHygiene.addWorkletModule(ctx,'registerProcessor("a",class{})');
 assert.equal(mode,'data');
 assert.equal(calls.length,2);
 assert.ok(calls[1].startsWith('data:application/javascript;charset=utf-8,'));
 assert.deepEqual(revoked,[calls[0]]);
});

test('__xenAddWorkletModule prefers data URL first on file: protocol',async()=>{
 const calls=[];
 const {env,revoked}=makeEnv({protocol:'file:'});
 const ctx={audioWorklet:{addModule:async u=>{calls.push(u)}}};
 const mode=await env.__XenRuntimeHygiene.addWorkletModule(ctx,'registerProcessor("a",class{})');
 assert.equal(mode,'data');
 assert.equal(calls.length,1);
 assert.equal(revoked.length,0);
});

test('__xenRunBlobWorker resolves result, forwards progress, terminates and revokes URL',async()=>{
 let terminated=0;
 class FakeWorker{
  constructor(url){this.url=url}
  postMessage(payload){
   setTimeout(()=>{this.onmessage?.({data:{progress:0.5}});this.onmessage?.({data:{result:{ok:true,n:payload.n}}})},5);
  }
  terminate(){terminated++}
 }
 const {env,revoked}=makeEnv({workerImpl:FakeWorker});
 const prog=[];
 const res=await env.__XenRuntimeHygiene.runBlobWorker({code:'1',payload:{n:7},onProgress:p=>prog.push(p)});
 assert.deepEqual(res,{ok:true,n:7});
 assert.deepEqual(prog,[0.5]);
 assert.equal(terminated,1);
 assert.equal(revoked.length,1);
});

test('__xenRunBlobWorker cleans up on abort, worker error, timeout, and constructor failure',async()=>{
 let terminated=0;
 class HangWorker{
  postMessage(){}
  terminate(){terminated++}
 }
 const {env,revoked}=makeEnv({workerImpl:HangWorker});
 // Pre-aborted
 const pre=new AbortController();pre.abort();
 await assert.rejects(()=>env.__XenRuntimeHygiene.runBlobWorker({code:'1',payload:{},signal:pre.signal}),/Abgebrochen/);
 assert.equal(revoked.length,0);
 // Mid-flight abort
 const mid=new AbortController();
 const p=env.__XenRuntimeHygiene.runBlobWorker({code:'1',payload:{},signal:mid.signal});
 setTimeout(()=>mid.abort(),5);
 await assert.rejects(()=>p,/Abgebrochen/);
 assert.equal(terminated,1);
 assert.equal(revoked.length,1);
 // Timeout
 await assert.rejects(()=>env.__XenRuntimeHygiene.runBlobWorker({code:'1',payload:{},timeoutMs:15,timeoutMessage:'too slow'}),/too slow/);
 assert.equal(terminated,2);
 assert.equal(revoked.length,2);
 // Constructor failure still revokes URL
 const {env:env2,revoked:rev2}=makeEnv({workerImpl:class{constructor(){throw Error('csp')}}});
 await assert.rejects(()=>env2.__XenRuntimeHygiene.runBlobWorker({code:'1',payload:{}}),/csp/);
 assert.equal(rev2.length,1);
});
