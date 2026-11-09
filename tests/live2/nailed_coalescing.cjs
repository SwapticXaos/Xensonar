'use strict';
// RED/GREEN regression: rapid gestures must be coalesced *before* expensive
// RBJ trigonometry and typed-array allocation, not merely before port delivery.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/quickrack/equalizer/eq-worklet.js'),'utf8');
const timers=new Map();let clock=0,timerId=0,sines=0,moduleAttempts=0;
const math=Object.create(Math);
math.sin=(...args)=>{sines++;return Math.sin(...args)};
const posts=[];
class NodeMock{
 constructor(){this.port={postMessage:(m)=>posts.push(m),close(){}}}
 disconnect(){}
}
const globals={Math:math,Float64Array,AudioWorkletNode:NodeMock,Date:{now:()=>clock},
 setTimeout:(fn,delay)=>{timers.set(++timerId,fn);return timerId},clearTimeout:(id)=>timers.delete(id),
 Blob:class BlobMock{constructor(x){this.content=x}},
 URL:{createObjectURL:()=> 'blob:fake',revokeObjectURL:()=>{}}};
vm.createContext(globals);
vm.runInContext(source,globals);
const eq=vm.runInContext('__XenEqLive',globals);
function plan(f){return {base:0,filters:[{gain:4,frequency:f,q:1},{gain:-3,frequency:f*1.7,q:2}]}}
async function run(){
 const ctx={sampleRate:48000,audioWorklet:{addModule:async()=>{moduleAttempts++}}};
 const instance=eq.create(ctx,plan(400),12);
 const initialSines=sines;
 for(let i=0;i<60;i++)instance.apply(plan(200+i*5),12);
 assert.equal(sines,initialSines,'RBJ coefficients computed during gesture burst before coalescing');
 assert.equal(posts.length,0,'No messages should be sent before the scheduled flush');
 for(const fn of timers.values())fn();timers.clear();
 assert.equal(posts.length,1,'Exactly one latest plan should be sent');
 assert.equal(posts[0].revision,60,'Must not apply any earlier gesture');
 assert.ok(sines>initialSines,'Latest coefficients must be computed on flush');
 instance.dispose();
 // Failed registration must not poison the entire AudioContext forever.
 let blocked=true;
 const flaky={sampleRate:48000,audioWorklet:{addModule:async()=>{moduleAttempts++;if(blocked)throw Error('temporary')}}};
 await assert.rejects(eq.prepare(flaky));
 blocked=false;
 await eq.prepare(flaky);
 assert.equal(moduleAttempts,3,'Expected two failed modes then one successful retry');
 console.log('PASS EQ coalesce-before-coefficients + recoverable per-context module loading');
}
run().catch(e=>{console.error(e);process.exitCode=1});
