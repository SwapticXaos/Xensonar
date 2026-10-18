'use strict';
const assert=require('node:assert/strict'),create=require('../src/forge/fractalia/07_compile_jobs.js');
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 let calls=0,release;const gate=new Promise(r=>release=r);const jobs=create(async({check,onProgress})=>{calls++;onProgress(.2);await gate;check();return {ok:true}}),a=new AbortController(),b=new AbortController();
 const first=jobs.request('shared',{}, {signal:a.signal}).catch(e=>e.name),second=jobs.request('shared',{}, {signal:b.signal});await tick();a.abort();release();assert.equal(await first,'AbortError');assert.deepEqual(await second,{ok:true});assert.equal(calls,1);assert.deepEqual(jobs.stats(),{running:0,pending:0,cached:1,consumers:0});console.log('PASS shared compile survives one consumer abort');
 let releases=[];let active=0,max=0;const race=create(async({check,tag})=>{active++;max=Math.max(max,active);try{await new Promise(r=>releases.push(r));check();return tag}finally{active--}});
 const oldSignal=new AbortController(),old=race.request('same',{tag:'old'},{signal:oldSignal.signal}).catch(e=>e.name);await tick();oldSignal.abort();const next=race.request('same',{tag:'new'});assert.equal(race.stats().pending,1);releases.shift()();await tick();assert.equal(race.stats().pending,1);releases.shift()();assert.equal(await old,'AbortError');assert.equal(await next,'new');assert.equal(max,1);console.log('PASS aborted generation cannot delete or cache over its same-key successor; work stays bounded');
 let current=true,steps=0;const stale=create(async({check})=>{for(let i=0;i<20;i++){check();steps++;await tick()}return true});const p=stale.request('stale',{}, {check:()=>{if(!current)throw new DOMException('stale','AbortError')}}).catch(e=>e.name);await tick();current=false;assert.equal(await p,'AbortError');assert(steps<20);assert.equal(stale.stats().cached,0);console.log('PASS stale check stops real work before completion');
})();
