'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'src/quickrack/equalizer/eq-core.js'),'utf8');
let now=0,nextId=0;const timers=new Map(),frames=new Map();let madeFilters=0;
const param=()=>({value:1,cancelScheduledValues(){},setValueAtTime(v){this.value=v},setTargetAtTime(v){this.value=v}});
const makeNode=(filter=false)=>({gain:param(),frequency:param(),Q:param(),connect(){},disconnect(){}});
const ctx={sampleRate:48000,currentTime:0,state:'running',createGain:()=>makeNode(),createBiquadFilter:()=>{madeFilters++;return makeNode(true)},addEventListener(){},removeEventListener(){}};
const scope={console,Math,Date:{now:()=>now},localStorage:{getItem:()=>null,setItem(){}},window:{addEventListener(){}},
 setTimeout:(fn,ms)=>{const id=++nextId;timers.set(id,{at:now+ms,fn});return id},clearTimeout:id=>timers.delete(id),
 requestAnimationFrame:fn=>{const id=++nextId;frames.set(id,fn);return id},cancelAnimationFrame:id=>frames.delete(id),
 performance:{now:()=>now},Object,Array,Float32Array,Float64Array,Map,Set,WeakMap,WeakSet};
vm.createContext(scope);vm.runInContext(source,scope);const eq=vm.runInContext('__XenEQ',scope);
function frame(){const fs=[...frames.values()];frames.clear();for(const f of fs)f()}
function advance(ms){const end=now+ms;let guard=0;while(true){const due=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;assert.ok(++guard<1000,'timer loop');timers.delete(due[0]);now=due[1].at;due[1].fn();frame()}now=end;frame()}
const key='material:priority-eq';const d=eq.create(ctx,key);frame();
const positive=Array(360).fill(.8),negative=Array(360).fill(-.8);
eq.startGesture(key);eq.set(key,{mode:'raster',bands:4,a:positive});frame();
assert.equal(madeFilters,0,'RED: sketch immediately planned and created audio filters instead of deferring');
advance(90);assert.equal(madeFilters,0,'Painting should yield to primary audio for at least 90 ms');
advance(70);assert.ok(madeFilters>0,'Painting must eventually become audible during a sustained gesture');
const beforeMorph=eq.get(key);
eq.set(key,{b:negative,morph:.1});frame(); // structural paint still deferred
const oldPlan=d.appliedPlan;
eq.set(key,{morph:.8});frame();
assert.notEqual(d.appliedPlan,oldPlan,'Morph gesture must not inherit a paint delay');
assert.equal(eq.get(key).morph,.8,'Canonical state must retain latest user control');
eq.endGesture(key);advance(160);
assert.equal(eq.get(key).morph,.8);
console.log('PASS paint defers audio planning, sustained painting progresses and morph bypasses painting backlog');
