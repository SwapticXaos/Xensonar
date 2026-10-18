'use strict';
// Real worker_threads run the production serialized Web Worker. Browser-only
// MessagePorts/AudioWorkletNode are bridged; the actual processor and DSP run.
const fs=require('node:fs'),assert=require('node:assert/strict'),{Worker:Thread}=require('node:worker_threads'),read=p=>fs.readFileSync(p,'utf8');
const sources=['01_instrument_model','02_synthesis_kernel','07_sound_designer','03_preparation_worker'].map(n=>read('src/nodal/'+n+'.js')).join('\n');
const blobs=new Map(),threads=[],jobs=[],packets=[];let blobId=0,node,api,hostPreparation=0,physical=0;
class BlobShim{constructor(parts){this.body=parts.join('');}}
const URLShim={createObjectURL:b=>{const id=String(++blobId);blobs.set(id,b.body);return id;},revokeObjectURL:id=>blobs.delete(id)};
class WorkerShim{
 constructor(url){const body=blobs.get(url);this.thread=new Thread("const {parentPort}=require('node:worker_threads');globalThis.self=globalThis;globalThis.postMessage=x=>parentPort.postMessage(x);parentPort.on('message',data=>globalThis.onmessage({data}));"+body,{eval:true});threads.push(this.thread);this.thread.on('message',data=>this.onmessage?.({data}));this.thread.on('error',error=>this.onerror?.({message:error.message,preventDefault(){}}));}
 postMessage(m){jobs.push(m);this.thread.postMessage(m);}terminate(){return this.thread.terminate();}
}
api=new Function('Worker','Blob','URL',sources+';return {model:__XenNodalModel,modelFactory:createNodalInstrumentModel,kernel:createNodalSynthesisKernel,starter:nodalOpenStarter,coordinator:createNodalPreparationCoordinator};')(WorkerShim,BlobShim,URLShim);
let frame=48000;
class WorkletNode{
 constructor(ctx,name,options){node=this;let Processor;const host=this;class Base{constructor(){this.port={postMessage:data=>queueMicrotask(()=>host.port.onmessage?.({data}))};}}
  api.factory(api.kernel,(_,C)=>Processor=C,Base,ctx.sampleRate,()=>frame);this.processor=new Processor({processorOptions:options.processorOptions});this.sent=[];
  this.port={onmessage:null,postMessage:m=>{this.sent.push(m);if(m.prepared?.bank==='grid')packets.push(m);queueMicrotask(()=>this.processor.port.onmessage({data:structuredClone(m)}));},close(){this.onmessage=null;}};
 }connect(){}disconnect(){}
}
const hostKernel=()=>{const k=api.kernel();return {...k,preparePacket(){hostPreparation++;throw Error('Main-thread coefficient preparation forbidden');}};};
const queue=read('src/instruments/07_pitch_preparation.js'),runtime=read('src/nodal/04_audio_runtime.js');
const live=new Function('jF','AudioWorkletNode','Worker','createNodalPreparationCoordinator','createNodalInstrumentModel','resolveNodalArticulationFields','createNodalSynthesisKernel','__XenNodalModel',queue+'\n'+runtime+';return {create:createNodalLiveRuntime,factory:nodalWorkletProcessorFactory};')(
 async()=>{},WorkletNode,WorkerShim,options=>api.coordinator({...options,kernelFactory:api.kernel}),api.modelFactory,()=>({volumeCurve:null,pitchCurve:null}),hostKernel,api.model);
api.factory=live.factory;
const context={state:'running',sampleRate:48000,currentTime:1,audioWorklet:{},addEventListener(){},removeEventListener(){}};
const flush=()=>new Promise(r=>setImmediate(r));
async function complete(player){for(let i=0;i<500;i++){const s=player.snapshot().gridPreparation[0];if(s?.phase==='failed')throw Error(s.error);if(s?.phase==='submitted'){await flush();return s;}await new Promise(r=>setTimeout(r,2));}throw Error('Grid preparation did not finish');}
(async()=>{
 const player=await live.create({model:api.model,kernelFactory:hostKernel}).createPlayer(context,{}, {acquire:()=>{physical++;return {release(){physical--;}};}}, {prepareOnControl:true,maxCost:16,maxVoices:32});
 try{
  const instrument=api.starter('hollow');await player.prepare(instrument);
  const grid=Array.from({length:320},(_,i)=>55.137+i*3.731);
  assert(player.prepareGridFrequencies(instrument,grid));const done=await complete(player);assert.equal(done.resident,320);assert.equal(done.jobs,20);assert.equal(physical,0,'preparing never takes a voice ticket');
  const gridJobs=()=>jobs.filter(j=>j.bank==='grid');assert.equal(gridJobs().length,20);assert(gridJobs().every(j=>j.frequencies.length<=16));
  const old=jobs.length;player.prepareGridFrequencies(instrument,grid);await flush();assert.equal(jobs.length,old);
  const moved=grid.slice();moved[17]=1799.713;player.prepareGridFrequencies(instrument,moved);await complete(player);assert.deepEqual(gridJobs().at(-1).frequencies,[1799.713]);assert.deepEqual(packets.find(p=>p.prepared.removeFrequencies)?.prepared.removeFrequencies,[grid[17]]);
  // Rapid revisions while the real Worker is pending: old PCM never scheduled,
  // and only the latest control result enters the audio processor.
  player.prepareGridFrequencies(instrument,[911.71]);player.prepareGridFrequencies(instrument,[977.13]);const latest=await complete(player);assert(latest.stale>=1);assert(!packets.some(p=>p.prepared.pitches.some(x=>x.hz===911.71)));assert(packets.some(p=>p.prepared.pitches.some(x=>x.hz===977.13)));
  player.pin(instrument);player.pin(instrument);player.prepareGridFrequencies(instrument,[1011.713]);player.unpin(instrument);await complete(player);assert(packets.some(p=>p.prepared.pitches.some(x=>x.hz===1011.713)),'one remaining selection retains preparation');
  player.prepareGridFrequencies(instrument,[1023.719]);player.unpin(instrument);const unpinned=packets.length;await new Promise(r=>setTimeout(r,20));assert.equal(packets.length,unpinned,'last selection cancels speculative grid work');assert.equal(player.snapshot().gridPreparation.length,0);
  player.pin(instrument);player.prepareGridFrequencies(instrument,[977.13]);await complete(player);
  const onsetJobs=jobs.length,voice=player.noteOn(instrument,{frequency:977.13,gain:.2,held:true},1.008);assert(voice);await voice.accepted;await flush();assert.equal(jobs.length,onsetJobs,'actual Note-On never enqueues preparation');assert.equal(physical,1);
  let nonzero=false;for(let i=0;i<100;i++){const pcm=[[new Float32Array(128),new Float32Array(128)]];node.processor.process([],pcm);nonzero||=pcm[0][0].some(v=>Math.abs(v)>1e-8);frame+=128;}assert(nonzero,'actual prepared processor emits PCM');
  player.prepareGridFrequencies(instrument,[1117.13]);const installed=packets.length;player.dispose();await new Promise(r=>setTimeout(r,20));assert.equal(packets.length,installed,'disposed work never installs');assert.equal(physical,0);assert.equal(hostPreparation,0);
  console.log('PASS N2 real Worker→shared queue→actual Worklet processor/DSP: 320 tones/20 packets, one-tone delta, rapid revisions, no onset work, nonzero PCM, disposal');
 }finally{player.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{for(const thread of threads)await thread.terminate();});
