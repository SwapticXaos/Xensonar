'use strict';
// P1.4 RED test: a superseded costly adaptive fit must cooperate with a newer
// request and must not occupy the worker until its complete 24-band solution.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.resolve(__dirname,'../../../src/quickrack/equalizer/eq-core.js'),'utf8');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
class B{constructor(parts){this.source=parts.join('')}}
let jobs=0,cancelMessages=0,cancelledReplies=0,slices=0,results=[];
class W{
 constructor(source){this.terminated=false;this.scope=vm.createContext({
  self:{postMessage:reply=>{if(reply.cancelled)cancelledReplies++;results.push(reply);setTimeout(()=>this.onmessage({data:reply}),0)}},
  console,Date,performance,Math,Number,Array,Object,Map,Set,WeakMap,WeakSet,JSON,Float32Array,Float64Array,
  clearTimeout,setTimeout:(fn,time=0)=>{slices++;return setTimeout(fn,time)}
 });vm.runInContext(source,this.scope)}
 postMessage(msg){if('cancel' in msg)cancelMessages++;else jobs++;setTimeout(()=>this.scope.self.onmessage({data:msg}),0)}
 terminate(){this.terminated=true}
}
const context={window:{addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame:()=>1,
 Worker:W,Blob:B,URL:{createObjectURL:b=>b.source,revokeObjectURL(){}},console,Date,Math,Number,Array,Object,
 Map,Set,WeakMap,WeakSet,JSON,Float32Array,Float64Array,setTimeout,clearTimeout};
vm.runInNewContext(code+'\nglobalThis.eq=__XenEQ;',context);
const eq=context.eq;
const curve=Array.from({length:360},(_,i)=> i%65<32? .93 : -.92);
(async()=>{
 const key='material:cooperative-p14';
 eq.set(key,{mode:'adaptive',bands:24,a:curve,b:curve,morph:0});
 eq.livePlan(eq.get(key),48000,key);
 for(let i=0;i<100&&jobs===0;i++)await sleep(10);
 assert.equal(jobs,1,'initial worker task should dispatch');
 // Preserve a costly job long enough for a new render to supersede it.
 eq.set(key,{morph:.77,a:curve.map((x,i)=>i>200?-x:x)});
 eq.livePlan(eq.get(key),48000,key);
 for(let i=0;i<300&&eq.livePlan(eq.get(key),48000,key).provisional;i++)await sleep(10);
 assert.equal(jobs,2,'newest configuration must receive a full worker fit');
 assert.ok(cancelMessages>=1,'obsolete worker fit should be cooperatively cancelled');
 assert.ok(cancelledReplies>=1,'worker must acknowledge cancellation without treating it as failure');
 assert.ok(slices>=3,'expensive fit must yield to its worker event loop');
 assert.equal(eq.diagnostics().workerFailed,false);
 assert.ok(!eq.livePlan(eq.get(key),48000,key).provisional,'newest fit must resolve');
 assert.ok(!results.some(r=>r.error),'cancellation is not a worker failure');
 console.log('PASS P1.4 cooperative preemption, bounded worker scheduling and fresh-result fencing; jobs',jobs,'slices',slices);
})().catch(e=>{console.error(e);process.exitCode=1});
