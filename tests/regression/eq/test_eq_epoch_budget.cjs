'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.resolve(__dirname,'../../../src/quickrack/equalizer/eq-core.js'),'utf8');
let posted=0,maxActive=0,inflight=0;
class BlobFake{constructor(p){this.code=p.join('')}}
class WorkerFake{constructor(src){
 this.vm=vm.createContext({self:{postMessage:result=>setTimeout(()=>{inflight--;this.onmessage({data:result})},80)},console,Math,Number,Array,Object,Float32Array,Float64Array,Map,Set,WeakMap,WeakSet,JSON,Date,setTimeout,clearTimeout});
 vm.runInContext(src,this.vm);
 } postMessage(item){if(item.cancel===undefined){posted++;inflight++;maxActive=Math.max(maxActive,inflight)}setTimeout(()=>this.vm.self.onmessage({data:item}),0)} terminate(){} }
const s={window:{addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},Worker:WorkerFake,Blob:BlobFake,URL:{createObjectURL(b){return b.code},revokeObjectURL(){}},requestAnimationFrame:()=>1,setTimeout,clearTimeout,console,Math,Number,Array,Object,JSON,Map,Set,WeakMap,WeakSet};
vm.runInNewContext(code+'\nglobalThis.eq=__XenEQ;',s);const eq=s.eq;
const sleep=x=>new Promise(r=>setTimeout(r,x));
const a=Array.from({length:360},(_,i)=>i<180?1:-1);
async function main(){
 const key='material:epoch';eq.set(key,{bands:24,a,b:a});
 eq.livePlan(eq.get(key),48000,key);
 await sleep(145);assert.equal(posted,1,'first worker started');
 eq.set(key,{morph:.23});eq.livePlan(eq.get(key),48000,key);
 eq.set(key,{morph:.71});eq.livePlan(eq.get(key),48000,key);
 await sleep(160);
 assert.ok(posted>=2,'newest fit must dispatch after old');
 for(let i=0;i<300&&eq.livePlan(eq.get(key),48000,key).provisional;i++)await sleep(10);
 assert.equal(maxActive,1,'never run two adaptive optimizers concurrently');
 assert.equal(eq.livePlan(eq.get(key),48000,key).provisional,undefined,'newest result must be committed');
 const samePlan=eq.livePlan(eq.get(key),48000,key);
 eq.set(key,{morph:.23});eq.livePlan(eq.get(key),48000,key);
 eq.set(key,{morph:.71});const cached=eq.livePlan(eq.get(key),48000,key);
 assert.strictEqual(cached,samePlan,'return cached final plan for exact same fingerprint');
 const before=posted;eq.releaseLiveKey(key);
 eq.livePlan(eq.get(key),48000,key);
 assert.equal(posted,before,'released cache can be reused without new worker');
 console.log('PASS adaptive epoch fencing, bounded worker concurrency, exact reusable settled results; dispatched',posted);
}
main().catch(e=>{console.error(e);process.exitCode=1});
