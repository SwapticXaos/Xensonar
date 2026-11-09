'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.resolve(__dirname,'../../../src/quickrack/equalizer/eq-core.js'),'utf8');
let dispatched=0;
class BlobMock {constructor(parts){this.source=parts.join('')}}
class WorkerMock{
 constructor(source){this.scope=vm.createContext({self:{postMessage:msg=>setTimeout(()=>this.onmessage({data:msg}),0)},console,Float32Array,Float64Array,Math,Number,Array,Object,Map,Set,WeakMap,WeakSet,JSON,Date,setTimeout,clearTimeout});vm.runInContext(source,this.scope)}
 postMessage(request){if(request.cancel===undefined)dispatched++;setTimeout(()=>this.scope.self.onmessage({data:request}),0)}
 terminate(){}
}
const s={localStorage:{getItem:()=>null,setItem(){}},window:{addEventListener(){}},requestAnimationFrame:()=>1,Worker:WorkerMock,Blob:BlobMock,URL:{createObjectURL:b=>b.source,revokeObjectURL(){}},console,Math,Number,Array,Object,Map,Set,WeakMap,WeakSet,JSON,Date,setTimeout,clearTimeout};
vm.runInNewContext(code+'\nglobalThis.eq=__XenEQ;',s);const eq=s.eq;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const a=Array.from({length:360},(_,i)=>i<95?.8:i<200?-.8:i<275?.5:-.3);
 const key1='material:duplicate-1',key2='material:duplicate-2';
 for(const key of [key1,key2])eq.set(key,{mode:'adaptive',bands:12,a,b:a,morph:.2});
 const first=eq.livePlan(eq.get(key1),48000,key1),second=eq.livePlan(eq.get(key2),48000,key2);
 assert.equal(first.provisional,true);assert.equal(second.provisional,true);
 await sleep(650);
 const p1=eq.livePlan(eq.get(key1),48000,key1),p2=eq.livePlan(eq.get(key2),48000,key2);
 assert.equal(dispatched,1,'identical simultaneous material-track presets must share one expensive Worker fit');
 assert.ok(!p1.provisional&&!p2.provisional,'both independent sources must receive the completed response');
 assert.equal(p1,p2,'identical immutable plan should be safely reused');
 assert.ok(eq.diagnostics().fitCache>0);
 console.log('PASS p1.3 shared in-flight worker fit across 2 material tracks');
})().catch(e=>{console.error(e);process.exitCode=1});
