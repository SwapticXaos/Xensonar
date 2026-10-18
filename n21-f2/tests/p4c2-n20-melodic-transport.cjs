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
const context={state:'running',sampleRate:48000,get currentTime(){return frame/48000;},audioWorklet:{},addEventListener(){},removeEventListener(){}};
const flush=()=>new Promise(r=>setImmediate(r));
async function complete(player){for(let i=0;i<500;i++){const s=player.snapshot().gridPreparation[0];if(s?.phase==='failed')throw Error(s.error);if(s?.phase==='submitted'){await flush();return s;}await new Promise(r=>setTimeout(r,2));}throw Error('Grid preparation did not finish');}
const instrument=api.starter('hollow'),preset='nodal:test@1',composer={tracks:[{id:'a',enabled:true,volume:.7,pan:0,instrumentPreset:preset}],notes:[{id:'one',trackId:'a',frequency:221.731,durationUnits:2,atUnit:0},{id:'two',trackId:'a',frequency:317.137,durationUnits:2,atUnit:4}],pitchSteps:[{}]};
const resources=[];let currentToken=0,session=null,globalRequests=[];
const graph=()=>({gain:{value:1},pan:{value:0},connect(){},disconnect(){}});
context.createGain=graph;context.createStereoPanner=graph;
const env={nodalLivePlanCosts:new Function(read('src/nodal/04_audio_runtime.js').split('function nodalWorkletProcessorFactory')[0]+';return nodalLivePlanCosts;')(),
 hS(){currentToken++;for(const r of resources.splice(0)){r.stop?.();r.disconnect?.();}},beginEntrophonMelodicPreparation:()=>({aborted:false}),g9e:()=>++currentToken,uP:t=>t===currentToken,
 __mlSetPhase(){},__XenNodalInstallation:{current:{ensureAudio:async()=>context,getOutput:()=>({}),acquireVoice:cost=>{globalRequests.push(cost);physical++;return {release(){physical--;}};}}},
 SW:async()=>new Map([[preset,{instrument,plan:api.model.compile(instrument)}]]),iD:()=>16,lD:()=>1,__mlSoloTrackId:null,Mx:x=>resources.push(x),
 __XenNodalLive:live.create({model:api.model,kernelFactory:hostKernel}),yW:(t,n)=>n.instrumentPresetOverride??t.instrumentPreset,
 c9e:()=>false,Ax:(_,n)=>n.atUnit,F$:(c,n)=>n.durationUnits,E$:()=>1,y9e:s=>session=s,uD:()=>0,
 m9e:(c,n)=>n.frequency,d9e:()=>0,T$:()=>0,resolveNodalArticulationFields:()=>({volumeCurve:null,pitchCurve:null}),
 __mlGetStem(){throw Error('Unexpected legacy path')},N$(){throw Error('Unexpected legacy path')},_$(){},cD:()=>.0625,__mlDrumsAudible:false
};
const bridge=read('src/nodal/06_melodic_bridge.js'),transport=read('src/nodal/08_melodic_live_transport.js');
// Load the actual note option/timing functions; unrelated UI/menu adapters are
// not needed by this transport fixture.
const options=bridge.slice(bridge.indexOf('function nodalMelodicNoteTiming('),bridge.indexOf('function nodalRenderTailSeconds('));
const start=new Function(...Object.keys(env),options+'\n'+transport+';return nodalStartMelodic;')(...Object.values(env));
(async()=>{
 try{
  assert(await start({composer,trackIds:['a'],loop:true,onPhase(){}}));
  assert(session);assert.equal(hostPreparation,0);assert.equal(nodesForTest(),1);
  const messages=node.sent,first=messages.findIndex(m=>m.type==='note');assert(first>0);
  const prepared=messages.slice(0,first).filter(m=>m.prepared?.bank==='grid').flatMap(m=>m.prepared.pitches.map(x=>x.hz));
  assert(prepared.includes(221.731)&&prepared.includes(317.137),'All exact composition pitches must be installed before the first note is sent');
  assert(messages.filter(m=>m.type==='plan').every(m=>m.paced&&m.prepared),'Melodic uses paced prepared banks');
  assert(globalRequests.length>0&&globalRequests.every(x=>x===1),'Physical occupancy must not multiply by DSP complexity');
  const before=jobs.length;
  for(let i=0;i<80;i++){frame+=128;const out=[[new Float32Array(128),new Float32Array(128)]];node.processor.process([],out);await flush();}
  assert.equal(jobs.length,before,'Scheduled playing creates no worker preparation');
  const diag=(await env.__XenNodalLive.diagnostics())[0];assert(diag.consumer.renderStarted>0);assert.equal(diag.host.sharedCapacity.primaryOwners,1);
  env.hS();await flush();assert.equal(physical,0);assert.equal((await env.__XenNodalLive.diagnostics()).length,0);
  assert.equal(urlsForTest(),0);console.log('PASS N20 actual Melodic transport: real Worker/paced pools, exact microtonal preflight, primary ledger, one ticket per voice, play/stop cleanup');
 }finally{env.hS();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{for(const thread of threads)await thread.terminate();});
function nodesForTest(){return node?1:0}function urlsForTest(){return blobs.size}
