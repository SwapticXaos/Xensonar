'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.resolve(__dirname,'../../../src/quickrack/equalizer/eq-core.js'),'utf8');
const s={localStorage:{getItem:()=>null,setItem:()=>{}},window:{addEventListener(){}},requestAnimationFrame:()=>1,clearTimeout,setTimeout,console,Math,Number,Array,Object,JSON,Set,WeakMap,WeakSet,Date,Map};
vm.runInNewContext(code+'\nglobalThis.eq=__XenEQ;',s);const eq=s.eq;
const events=[];
function param(name){return {value:0,setTargetAtTime(v){this.value=v;events.push(name)},cancelScheduledValues(){},cancelAndHoldAtTime(){}}}
function node(type,index){const n={connect(){},disconnect(){}};if(type==='gain')n.gain=param('base');else{n.frequency=param('freq'),n.Q=param('q'),n.gain=param('gain')}return n;}
const ctx={state:'running',sampleRate:48000,currentTime:0,createGain:()=>node('gain'),createBiquadFilter:()=>node('biquad'),addEventListener(){},removeEventListener(){}};
const key='material:no-redundant-automation';
const cfg=eq.clean({...eq.neutral(),mode:'raster',bands:24,a:Array.from({length:360},(_,i)=>i>150&&i<160?1:0)});
eq.set(key,cfg);const d=eq.create(ctx,key);events.length=0;
const c2=[...eq.get(key).a];c2.fill(0,Math.floor(220/359*360),Math.floor(240/359*360));
for(let i=220;i<240;i++)c2[i]=-.5;
eq.set(key,{a:c2});d.apply(eq.get(key));
const freq=events.filter(x=>x==='freq').length,qs=events.filter(x=>x==='q').length,gains=events.filter(x=>x==='gain').length;
assert.equal(freq,0,`raster drawing did not move frequency anchors yet scheduled ${freq} frequency ramps`);
assert.ok(qs>0&&qs<=4,`only nearby bands may change their adaptive bandwidth, got ${qs} Q ramps`);
assert.ok(gains<=24,'all filter gains at most');
events.length=0;d.apply(eq.get(key));
assert.equal(events.length,0,'same effective filter plan must not reschedule any AudioParam ramps');
console.log('PASS audio automation only for changed parameters:',{freq,qs,gains});d.dispose();
