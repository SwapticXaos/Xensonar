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
  const pitches=Array.from({length:41},(_,i)=>173.137+i*3.731);
  await player.warmFrequencies(instrument,pitches);await flush();
  assert(player.hasPreparedFrequencies(instrument,pitches));assert.equal(physical,0);
  const before=jobs.length,voice=player.noteOn(instrument,{frequency:pitches[17],gain:.2,held:true,confirmStart:true},1);
  assert(voice);await voice.started;await flush();assert.equal(jobs.length,before,'A note never waits for or creates a worker job');
  const out=[[new Float32Array(128),new Float32Array(128)]];node.processor.process([],out);assert(out[0][0].some(x=>x!==0));
  assert.equal(hostPreparation,0,'Every compile/pitch packet belongs to a real worker thread');
  const pending=player.warmFrequencies(instrument,[977.13,1117.731]);player.dispose();
  await assert.rejects(pending,/cancelled/);assert.equal(physical,0);
  console.log('PASS N20 real Worker preparation barrier, exact pitches, immediate note path and cancellation');
 }finally{player.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{for(const thread of threads)await thread.terminate();});
