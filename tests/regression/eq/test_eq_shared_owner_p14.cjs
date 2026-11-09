'use strict';
// If one of two identical material-track presets changes, the shared in-flight
// result must still finish for its remaining consumer rather than be cancelled.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const core=fs.readFileSync(path.resolve(__dirname,'../../../src/quickrack/equalizer/eq-core.js'),'utf8');
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
let jobs=0,cancels=0;
class B{constructor(parts){this.source=parts.join('')}}
class W{constructor(source){this.vm=vm.createContext({self:{postMessage:out=>setTimeout(()=>this.onmessage({data:out}),0)},setTimeout,clearTimeout,Date,performance,Math,Number,Array,Object,Map,Set,WeakMap,WeakSet,JSON,Float32Array,Float64Array});vm.runInContext(source,this.vm)}
 postMessage(message){if('cancel' in message)cancels++;else jobs++;setTimeout(()=>this.vm.self.onmessage({data:message}),0)}terminate(){}}
const context={localStorage:{getItem:()=>null,setItem(){}},window:{addEventListener(){}},requestAnimationFrame:()=>1,Worker:W,Blob:B,URL:{createObjectURL:b=>b.source,revokeObjectURL(){}},setTimeout,clearTimeout,Date,Math,Number,Array,Object,Map,Set,WeakMap,WeakSet,JSON};
vm.runInNewContext(core+'\nglobalThis.eq=__XenEQ;',context);const eq=context.eq;
const a=Array.from({length:360},(_,i)=>i%70<35?.8:-.8);
(async()=>{
 const keys=['material:p14-owner-A','material:p14-owner-B'];
 for(const key of keys){eq.set(key,{mode:'adaptive',bands:24,a,b:a});eq.livePlan(eq.get(key),48000,key)}
 for(let i=0;i<100&&!jobs;i++)await sleep(10);
 assert.equal(jobs,1);
 eq.set(keys[0],{morph:.4,a:a.map((v,i)=>i<180?v:-v)});
 eq.livePlan(eq.get(keys[0]),48000,keys[0]);
 assert.equal(cancels,0,'a second material track still needs the in-flight fit');
 for(let i=0;i<300&&eq.livePlan(eq.get(keys[1]),48000,keys[1]).provisional;i++)await sleep(10);
 assert.ok(!eq.livePlan(eq.get(keys[1]),48000,keys[1]).provisional,'the non-superseded material track must receive original fit');
 for(let i=0;i<300&&eq.livePlan(eq.get(keys[0]),48000,keys[0]).provisional;i++)await sleep(10);
 assert.ok(!eq.livePlan(eq.get(keys[0]),48000,keys[0]).provisional,'changed material track must receive its new fit');
 assert.equal(jobs,2,'shared original and changed successor require two fits, not three');
 console.log('PASS P1.4 preserves shared fit when only one source moves on');
})().catch(err=>{console.error(err);process.exitCode=1})
