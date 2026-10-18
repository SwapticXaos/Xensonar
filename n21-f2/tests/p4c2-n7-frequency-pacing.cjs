'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/nodal/04_audio_runtime.js','utf8');
const requests=[],packets=[],timers=new Set();let finish;
const model={semanticKey:i=>i.key};const kernel=()=>({});
class Worklet{constructor(){this.port={postMessage:m=>{if(m.type==='plan')queueMicrotask(()=>this.port.onmessage({data:{type:'ready',id:m.id}}));if(m.type==='pitches')packets.push(m);},close(){}};}connect(){}disconnect(){}}
const coordinator=()=>({prepare:async i=>({plan:{key:i.key,cost:1,kernelVersion:'coupled-modal-v2',referenceHz:220,silent:false,tailSec:0,articulation:{durationSec:1}},prepared:{pitches:[{hz:220}]},workerPlanId:1}),prepareFrequencies:(_,hz)=>{requests.push(hz);return new Promise(r=>finish=r);},forget(){},dispose(){}});
const schedule=(fn,ms)=>{const t={fn,ms};timers.add(t);return t;},cancel=t=>timers.delete(t),flush=()=>new Promise(r=>setImmediate(r));
const create=new Function('jF','AudioWorkletNode','Worker','createNodalPreparationCoordinator','createNodalInstrumentModel','createNodalSynthesisKernel','__XenNodalModel','setTimeout','clearTimeout',source+';return createNodalLiveRuntime;')(async()=>{},Worklet,class Worker{},coordinator,()=>model,kernel,model,schedule,cancel);
(async()=>{
 const ctx={state:'running',sampleRate:48000,currentTime:0,audioWorklet:{},addEventListener(){},removeEventListener(){}},instrument=Object.freeze({key:'A',articulation:{durationSec:1}}),player=await create({model,kernelFactory:kernel}).createPlayer(ctx,{}, {acquire:()=>null},{prepareOnControl:true});await player.prepare(instrument);
 assert(player.hasPreparedFrequencies(instrument,[220]),'initial reference pitch is already prepared');
 const hz=Array.from({length:24},(_,i)=>100+i);player.prepareFrequencies(instrument,hz,'particle');assert.deepEqual(requests[0],hz.slice(0,8));
 const priority=hz.slice().reverse();player.prepareFrequencies(instrument,priority,'particle');
 finish({pitches:requests[0].map(hz=>({hz}))});await flush();assert.equal(packets.length,1,'same exact set with changed priority retains valid in-flight packet');
 assert.equal(requests.length,1,'remaining packet yields to the host');
 const next=()=>{const t=[...timers].find(x=>x.ms===12);assert(t,'12 ms pacing timer');timers.delete(t);t.fn();};
 next();assert.deepEqual(requests[1],priority.slice(0,8));finish({pitches:requests[1].map(hz=>({hz}))});await flush();next();assert.deepEqual(requests[2],priority.slice(8,16));finish({pitches:requests[2].map(hz=>({hz}))});await flush();
 assert(player.hasPreparedFrequencies(instrument,hz));assert.equal(timers.size,0);
 const old=requests.length;player.prepareFrequencies(instrument,hz,'particle');await flush();assert.equal(requests.length,old,'prepared exact set is free despite another ordering');
 player.prepareFrequencies(instrument,[700,701],'particle');const oldFinish=finish;player.prepareFrequencies(instrument,[800,801],'particle');oldFinish({old:true});await flush();assert.equal(packets.length,3,'obsolete exact-Hz family cannot reach DSP');assert.deepEqual(requests.at(-1),[800,801]);
 player.dispose();finish({afterDispose:true});await flush();assert(!player.hasPreparedFrequencies(instrument,hz));assert.equal(timers.size,0);assert.equal(packets.length,3);
 fs.writeFileSync('results/p4c2-n7-frequency-pacing.json',JSON.stringify({frequencies:24,batchSize:8,pauseMs:12,inflightKeptOnReorder:true,staleDropped:true,initialPitchKnown:true,disposalClean:true},null,2)+'\n');console.log('PASS N7 dynamic preparation: first 8 exact Hz, paced priority continuation, cached set free, stale and disposed results dropped');
})().catch(e=>{console.error(e);process.exitCode=1});
