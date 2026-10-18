'use strict';
// Real worker_threads run the production serialized Web Worker. Browser-only
// MessagePorts/AudioWorkletNode are bridged; the actual processor and DSP run.
const fs=require('node:fs'),assert=require('node:assert/strict'),{Worker:Thread}=require('node:worker_threads'),read=p=>fs.readFileSync(p,'utf8');
const sources=['01_instrument_model','02_synthesis_kernel','07_sound_designer','03_preparation_worker'].map(n=>read('src/nodal/'+n+'.js')).join('\n');
let workletTrigs=0;const measured=Object.create(Math);for(const key of ['cos','sin','tan'])measured[key]=(...args)=>{workletTrigs++;return Math[key](...args);};
const blobs=new Map(),threads=[],jobs=[],packets=[];let blobId=0,node,api,hostPreparation=0,physical=0;
class BlobShim{constructor(parts){this.body=parts.join('');}}
const URLShim={createObjectURL:b=>{const id=String(++blobId);blobs.set(id,b.body);return id;},revokeObjectURL:id=>blobs.delete(id)};
class WorkerShim{
 constructor(url){const body=blobs.get(url);this.thread=new Thread("const {parentPort}=require('node:worker_threads');globalThis.self=globalThis;globalThis.postMessage=x=>parentPort.postMessage(x);parentPort.on('message',data=>globalThis.onmessage({data}));"+body,{eval:true});threads.push(this.thread);this.thread.on('message',data=>this.onmessage?.({data}));this.thread.on('error',error=>this.onerror?.({message:error.message,preventDefault(){}}));}
 postMessage(m){jobs.push(m);this.thread.postMessage(m);}terminate(){return this.thread.terminate();}
}
api=new Function('Worker','Blob','URL','Math',sources+';return {model:__XenNodalModel,modelFactory:createNodalInstrumentModel,kernel:createNodalSynthesisKernel,starter:nodalOpenStarter,coordinator:createNodalPreparationCoordinator};')(WorkerShim,BlobShim,URLShim,measured);
let frame=48000;
class WorkletNode{
 constructor(ctx,name,options){node=this;let Processor;const host=this;class Base{constructor(){this.port={postMessage:data=>queueMicrotask(()=>host.port.onmessage?.({data}))};}}
  api.factory(api.kernel,(_,C)=>Processor=C,Base,ctx.sampleRate,()=>frame);this.processor=new Processor({processorOptions:options.processorOptions});this.sent=[];
  this.port={onmessage:null,postMessage:m=>{this.sent.push(m);if(m.prepared?.bank==='grid')packets.push(m);queueMicrotask(()=>this.processor.port.onmessage({data:structuredClone(m)}));},close(){this.onmessage=null;}};
 }connect(){}disconnect(){}
}
const hostKernel=()=>{const k=api.kernel();return {...k,preparePacket(){hostPreparation++;throw Error('Main-thread coefficient preparation forbidden');}};};
const queue=read('src/instruments/07_pitch_preparation.js'),runtime=read('src/nodal/04_audio_runtime.js');
const surfaceSource=read('src/nodal/12_surface_runtime.js').replace('const __XenNodalSurfaces=createNodalSurfaceRuntime({library:__XenNodalLibrary,live:__XenNodalLive,model:__XenNodalModel});','');
const live=new Function('jF','AudioWorkletNode','Worker','createNodalPreparationCoordinator','createNodalInstrumentModel','resolveNodalArticulationFields','createNodalSynthesisKernel','__XenNodalModel',queue+'\n'+runtime+'\n'+surfaceSource+';return {create:createNodalLiveRuntime,factory:nodalWorkletProcessorFactory,surface:createNodalSurfaceRuntime};')(
 async()=>{},WorkletNode,WorkerShim,options=>api.coordinator({...options,kernelFactory:api.kernel}),api.modelFactory,()=>({volumeCurve:null,pitchCurve:null}),hostKernel,api.model);
api.factory=live.factory;
const context={state:'running',sampleRate:48000,get currentTime(){return frame/48000;},audioWorklet:{},addEventListener(){},removeEventListener(){}};
const flush=()=>new Promise(r=>setImmediate(r));
async function complete(player){for(let i=0;i<500;i++){const s=player.snapshot().gridPreparation[0];if(s?.phase==='failed')throw Error(s.error);if(s?.phase==='submitted'){await flush();return s;}await new Promise(r=>setTimeout(r,2));}throw Error('Grid preparation did not finish');}
(async()=>{
 let player;const roots=Array.from({length:64},(_,i)=>110.137+i*3.719),lines=roots.map(freq=>({freq})),agents=[1,9/8,5/4,3/2,15/8].map(ratio=>({ratio}));
 const instrument=api.starter('hollow'),alias=api.model.normalize({...instrument,name:'Alias'});assert.equal(api.model.semanticKey(alias),api.model.semanticKey(instrument));
 const runtime=live.surface({library:{list:()=>[{id:'A',revision:1,instrument},{id:'Alias',revision:1,instrument:alias}]},model:api.model,live:{createPlayer:async(ctx,out,admission,policy)=>{
  player=await live.create({model:api.model,kernelFactory:hostKernel}).createPlayer(ctx,out,admission,policy);return player;
 }}});
 const source=read('src/audio/01_voice_and_rfl_ownership.js'),pitch=source.slice(source.indexOf('function DT('),source.indexOf('function jhe('));const resolvers=new Function(pitch+';return {zhe,NT};')();
 const config={getContext:()=>context,ensureReady:async()=>context,getOutput:()=>({}),acquire:()=>{physical++;return {release(){physical--;}};},readWaveGridLines:()=>lines,gridFrequencyToWaveBase:hz=>hz,readParticleGridAgents:()=>agents,resolveWaveFrequency:(baseFreq,isSector,octaveHeld)=>resolvers.zhe({baseFreq,isSector,octaveHeld}).playbackFreq,resolveParticleFrequency:(root,ratio)=>resolvers.NT({rootFreq:root,ratio,minHz:80,maxHz:2400}).playbackFreq};
 runtime.configure(config);
 try{
  await runtime.select('particle','nodal:A@1');await complete(player);assert.equal(physical,0);
  const particleFrequencies=new Set();for(const root of roots)for(const a of agents)particleFrequencies.add(config.resolveParticleFrequency(root,a.ratio));
  const installed=new Set(packets.flatMap(p=>p.prepared.pitches.map(p=>p.hz)));for(const hz of particleFrequencies)assert(installed.has(hz),'all finite Root×Ratio coefficients must reach the actual processor');
  assert.equal(runtime.snapshot().gridPrograms[0].wave,false);
  await runtime.select('wave','nodal:Alias@1');await complete(player);assert.equal(player.snapshot().readyPlans,1,'different names share actual compiled program');assert.equal(runtime.snapshot().gridPrograms.length,1);
  const stable=jobs.length;runtime.warmWaveField(context);await flush();assert.equal(jobs.length,stable);
  const noteJobs=jobs.length;workletTrigs=0;
  for(const root of roots.slice(0,4))assert(runtime.note('particle','nodal:A@1',{frequency:config.resolveParticleFrequency(root,5/4),gain:.2,held:true},context));
  assert(runtime.note('wave','nodal:Alias@1',{frequency:config.resolveWaveFrequency(roots[4],true,true),gain:.2,held:true},context));await flush();
  assert.equal(workletTrigs,0,'real prepared onsets copy coefficients without pitch trigonometry');assert.equal(jobs.length,noteJobs,'actual surface Note-On never prepares');assert.equal(physical,5);
  let wavePcm=false,particlePcm=false;for(let i=0;i<80;i++){const pcm=Array.from({length:2},()=>[new Float32Array(128),new Float32Array(128)]);node.processor.process([],pcm);wavePcm||=pcm[0][0].some(v=>Math.abs(v)>1e-8);particlePcm||=pcm[1][0].some(v=>Math.abs(v)>1e-8);frame+=128;}assert(wavePcm&&particlePcm);
  runtime.releaseHeld();await flush();for(let i=0;i<1500;i++){node.processor.process([],Array.from({length:2},()=>[new Float32Array(128),new Float32Array(128)]));frame+=128;}await flush();assert.equal(physical,0,'natural tails release actual tickets');
  const changedBefore=jobs.filter(j=>j.bank==='grid').length;agents[2].ratio=1.37191;runtime.warmWaveField(context);await complete(player);const changes=jobs.filter(j=>j.bank==='grid').slice(changedBefore).flatMap(j=>j.frequencies);
  const newFrequencies=new Set(roots.map(root=>config.resolveParticleFrequency(root,1.37191)));assert(changes.length>0);for(const hz of changes)assert(newFrequencies.has(hz),'ratio edit prepares only new exact frequencies');
  agents[2].ratio=1.39113;runtime.warmWaveField(context);await runtime.select('particle','classic');await complete(player);assert.equal(runtime.snapshot().gridPrograms[0].particle,false,'deselected family is removed from the shared program');
  assert.equal(hostPreparation,0);assert(jobs.filter(j=>j.bank==='grid').every(j=>j.frequencies.length<=16));
  const report={roots:roots.length,ratios:agents.length,particleFrequencies:particleFrequencies.size,programs:player.snapshot().readyPlans,preparedOnsets:5,pitchTrigonometryOnPreparedOnsets:0,ratioEditNewFrequencies:changes.length,nonzeroWavePcm:wavePcm,nonzeroParticlePcm:particlePcm,mainThreadCoefficientJobs:hostPreparation};fs.writeFileSync('results/p4c2-n3-particle-worker.json',JSON.stringify(report,null,2)+'\n');console.log('PASS N3 actual surface→Worker→shared queue→processor',report);
 }finally{runtime.dispose();assert.equal(physical,0);}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{for(const thread of threads)await thread.terminate();});
