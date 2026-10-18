'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const create=new Function(fs.readFileSync('src/instruments/07_pitch_preparation.js','utf8')+';return createInstrumentPitchPreparation;')();
const flush=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const requests=[],installs=[],timers=[];let finish;
 const q=create({capacity:64,batchSize:8,prepare:xs=>{requests.push(xs);return new Promise(r=>finish=r);},install:(packet,batch)=>installs.push(batch),schedule:fn=>{timers.push(fn);return fn;},cancel:fn=>{const i=timers.indexOf(fn);if(i>=0)timers.splice(i,1)}});
 const grid=Array.from({length:64},(_,i)=>100+i);q.update(grid);
 const generation=q.snapshot().generation;q.prioritize([160,161,162,163]);
 assert.equal(q.snapshot().generation,generation,'priority is ordering, not a new acoustic revision');
 finish({});await flush();assert.deepEqual(installs[0],grid.slice(0,8),'keep valid batch already in flight');
 timers.shift()();assert.deepEqual(requests[1].slice(0,4),[160,161,162,163],'next batch prepares impending arrivals first');
 assert(q.covers(160));assert(!q.covers(1000));
 finish({});await flush();q.prioritize([160,161]);assert.equal(requests.length,2,'already installed priority is free');
 while(timers.length){timers.shift()();finish({});await flush();}
 assert.equal(q.snapshot().resident,64);assert.equal(q.snapshot().stale,0);
 q.dispose();assert(!q.covers(160));assert.equal(timers.length,0);
 fs.writeFileSync('results/p4c2-n7-priority-queue.json',JSON.stringify({genericFor:'Nodal and Entrophon adapters',resident:64,imminentFirst:true,keepsInflightBatch:true,extraRevision:0,stale:0},null,2)+'\n');
 console.log('PASS N7 shared priority queue: imminent grid entries first, valid in-flight batch retained, no redundant priority work, clean disposal');
})().catch(e=>{console.error(e);process.exitCode=1});
