'use strict';
// Catch axis crosstalk and pointer-rate native rebuilds using the real control + EQ cores.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const frames=new Map(),timers=new Map(),listeners=new Map();let serial=0,writes=0;
const box={console,Map,Set,WeakMap,WeakSet,Math,JSON,Float32Array,Float64Array,ArrayBuffer,
 localStorage:{getItem:()=>null,setItem(){writes++}},window:{addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)},
 requestAnimationFrame:fn=>(frames.set(++serial,fn),serial),cancelAnimationFrame:id=>frames.delete(id),
 setTimeout:fn=>(timers.set(++serial,fn),serial),clearTimeout:id=>timers.delete(id)};
vm.createContext(box);
for(const f of ['src/quickrack/equalizer/eq-core.js','src/audio/avalanche.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),box);
const [A,eq]=vm.runInContext('[__XenAvalanche,__XenEQ]',box),calls=[];
const flush=()=>{const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(0));};
eq.set('material:source',{morph:.3,a:Array(360).fill(.1),b:Array(360).fill(-.2)});
A.assign('klaviatur','material:source','source');A.assign('wellenstart','material:source','source');
const snapshot=JSON.stringify(eq.snapshot());flush();
eq.runtime('avalanche:1:klaviatur',eq.get('material:source'));eq.runtime('avalanche:1:wellenstart',eq.get('material:source'));flush();
const gs={klaviatur:{KeyA:{active:true,targetHz:217.37}},wellenstart:{}},ctx={state:'running'},root={cursorX:250,cursorY:170};
const e={audioCtx:ctx,gameWidth:1000,gameHeight:500,nexusRefs:{current:root,__f35640HoldState:{current:{gestures:gs}}},yFromFreq:()=>170};
const stage={getBoundingClientRect:()=>({width:500,height:250}),parentElement:null},event=(x,y)=>({button:0,buttons:1,clientX:x,clientY:y,currentTarget:stage});
A.onTimbre('klaviatur',(u,w)=>calls.push([u,w]));
A.begin(event(125,125),e);
for(let i=1;i<=100;i++)A.move(event(125,125-i*.5),e);
flush();assert.equal(calls.length,0,'pure Y must not request any native timbre program');
assert.equal(A.value('klaviatur'),.25);assert.equal(eq.get('avalanche:1:klaviatur').morph,.5);
assert.equal(eq.get('avalanche:1:wellenstart').morph,.3,'inactive Hold lane isolated');
for(let i=1;i<=100;i++)A.move(event(125+i,75),e);
assert.equal(calls.length,0,'native preparation must wait for one control frame');
flush();assert.deepEqual(calls,[[.45,1000]],'one latest target for 100 pointer events');
assert.equal(eq.get('avalanche:1:klaviatur').morph,.5,'pure X preserves EQ');
A.move(event(275,75),e);A.end();assert.deepEqual(calls.at(-1),[.55,1000],'pointer-up flushes final target');flush();assert.equal(calls.length,2,'no duplicate final delivery');
A.begin(event(275,75),e);A.move(event(300,75),e);A.cancel();flush();assert.equal(calls.length,2,'cancel drops queued native work');
A.begin(event(275,75),e);A.move(event(300,75),e);listeners.get('pointercancel')({type:'pointercancel'});flush();assert.equal(calls.length,2,'pointer cancellation drops queued native work');
A.begin(event(125,125),e);A.move(event(225,125),e);gs.klaviatur.KeyA.active=false;A.sync();flush();assert.equal(calls.length,2,'key release drops queued native work');
assert.equal(JSON.stringify(eq.snapshot()),snapshot,'all drag state remains transient');assert.equal(writes,0);
assert.deepEqual(root,{cursorX:250,cursorY:170},'root/pitch position preserved');
console.log('PASS independent X/Y with real EQ, 100-event coalescing, final flush, cancel/key-up fencing, source/lane isolation');
