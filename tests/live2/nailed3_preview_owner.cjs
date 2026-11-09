'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'../..');
const src=fs.readFileSync(path.join(root,'src/quickrack/equalizer/eq-core.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'src/quickrack/equalizer/eq-ui.js'),'utf8');
let now=0,next=0;const timers=new Map(),frames=new Map(),messages=[];
const param=()=>({value:1,cancelScheduledValues(){},setValueAtTime(v){this.value=v},setTargetAtTime(v){this.value=v}});
const node=()=>({gain:param(),frequency:param(),Q:param(),connect(){},disconnect(){}});
const ctx={sampleRate:48000,currentTime:0,state:'running',createGain:node,createBiquadFilter:node,addEventListener(){},removeEventListener(){}};
const scope={Math,console,Date:{now:()=>now},localStorage:{getItem:()=>null,setItem(){}},window:{addEventListener(){}},
 setTimeout:(fn,ms)=>{const id=++next;timers.set(id,{at:now+ms,fn});return id},clearTimeout:id=>timers.delete(id),
 requestAnimationFrame:fn=>{const id=++next;frames.set(id,fn);return id},cancelAnimationFrame:id=>frames.delete(id),
 Worker:class{constructor(){this.onmessage=null;}postMessage(d){messages.push({at:now,kind:d.cancel===undefined?'fit':'cancel',id:d.id??d.cancel,first:d.cfg?.a?.[0]})}terminate(){}},
 Blob:class{},URL:{createObjectURL:()=>'blob:worker',revokeObjectURL(){}},performance:{now:()=>now},Object,Array,Float32Array,Float64Array,Map,Set,WeakMap,WeakSet};
vm.createContext(scope);vm.runInContext(src,scope);const eq=vm.runInContext('__XenEQ',scope);
function frame(){const f=[...frames.values()];frames.clear();for(const fn of f)fn()}
function advance(ms){const end=now+ms;let k=0;for(;;){const due=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;assert(++k<1000,'timer runaway');timers.delete(due[0]);now=due[1].at;due[1].fn();frame()}now=end;frame()}
const key='drum:owner',old=Array.from({length:360},(_,i)=>i<180?-.7:.8),fresh=Array.from({length:360},(_,i)=>i<180?.7:-.8);
const stale=eq.clean({a:old,b:Array(360).fill(0),mode:'adaptive'});
const d=eq.create(ctx,key);frame();eq.startGesture(key);eq.set(key,{a:fresh,mode:'adaptive'});advance(145);eq.endGesture(key);frame();advance(47);
const current=eq.get(key);assert.equal(current.a[0],.7);eq.livePlan(current,48000,key);
const before=eq.diagnostics();
// UI must consume a read-only response: no epoch advance, delayed/cancelled audio fit, or new worker.
const p=eq.peekPlan(stale,48000,key);
assert(p&&Array.isArray(p.filters));
assert.equal(eq.diagnostics().fitQueued,before.fitQueued);
assert.equal(eq.diagnostics().fitRunning,before.fitRunning);
advance(130);
assert(messages.some(x=>x.kind==='fit'&&x.first===.7),'current audio fit must win');
assert(!messages.some(x=>x.kind==='fit'&&x.first===-.7),'stale UI preview must not queue audio worker');
assert(/__XenEQ\.peekPlan\(previewCfg,rate,sourceKey\)/.test(ui),'UI must call read-only preview');
assert(!/__XenEQ\.livePlan\(previewCfg/.test(ui),'UI must never own fit epoch');
// Current preview result may read the audio owner, but must not mutate it.
const latest=eq.peekPlan(current,48000,key);assert(latest&&Array.isArray(latest.filters));
console.log('PASS preview is a read-only consumer, old snapshot cannot displace audio fit');
