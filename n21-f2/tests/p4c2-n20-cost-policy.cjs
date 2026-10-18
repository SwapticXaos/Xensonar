'use strict';
const fs=require('fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('src/nodal/04_audio_runtime.js','utf8');
const {costs,ledger}=new Function(src.slice(0,src.indexOf('function nodalWorkletProcessorFactory'))+';return {costs:nodalLivePlanCosts,ledger:createNodalCapacityLedger};')();
for(const rate of [44100,48000,96000,192000])for(const n of [1,2,3,7,12]){
 const plan={kernelVersion:'coupled-modal-v2',nodes:Array(n).fill({}),cost:Math.max(1,Math.ceil(n/3)),tailSec:1};
 const c=costs(plan,rate),old=Math.max(plan.cost,Math.ceil(n/2))*Math.max(1,rate/48000);
 assert(c.attack>=plan.cost);assert(c.attack>=old*.8);assert(c.attack<=old);
 assert.equal(c.tail,Math.min(c.attack,old*.75),'Tail cannot compound the full-voice discount');
 assert.equal(c.baseline,old);
 const v1=costs({...plan,kernelVersion:'coupled-modal-v1'},rate);assert.equal(v1.attack,old);assert.equal(v1.tail,old);
}
const c=ledger({maxCost:16,maxVoices:32,primaryReserve:2});
const s=c.register('secondary'),p=c.register('primary');
const tickets=Array.from({length:8},()=>s.acquire(1.6));assert(tickets.every(Boolean));
assert.equal(s.acquire(1.6),null,'Primary transport keeps two cost units available');
const pt=p.acquire(1.6);assert(pt);assert.equal(c.snapshot().activeVoices,9);
pt.release();pt.release();assert.equal(c.snapshot().activeVoices,8);
assert(tickets[0].reduce(1.5));assert(!tickets[0].reduce(2));
p.dispose();assert(s.acquire(1.6),'Unused primary reservation disappears on disposal');
s.dispose();assert.equal(c.snapshot().activeCost,0);assert.equal(c.snapshot().activeVoices,0);
assert.equal(tickets[0].reduce(1),false);tickets.forEach(t=>t.release());
assert.equal(s.acquire(1),null);assert.equal(c.snapshot().activeCost,0);
console.log('PASS N20 full/tail costs, rates, one shared ledger, primary reserve, exact once cleanup');
