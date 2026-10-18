const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const dir=path.resolve(__dirname,'..');
const src=n=>fs.readFileSync(path.join(dir,'src/nodal',n+'.js'),'utf8');
const ctx=vm.createContext({console,Float32Array,Float64Array,Uint32Array,Math,setTimeout,clearTimeout,performance,structuredClone});
vm.runInContext(['01_instrument_model','02_synthesis_kernel','03_library','04_audio_runtime','05_installation_bridge','07_sound_designer'].map(src).join('\n')+'\nglobalThis.api={model:__XenNodalModel,dsp:__XenNodalDSP,backend:createNodalInstallationBackend,starter:nodalStarter};',ctx);
const {model,dsp,backend,starter}=ctx.api;
let state='running',connected=null,connectCount=0,source=null,stopped=false,releaseCount=0,admitCount=0,bufSamples=null;
const output={kind:'MASTER-BUS'};
const context={sampleRate:48000,get state(){return state},currentTime:5,
 createBuffer:(channels,frames,rate)=>({numberOfChannels:channels,length:frames,sampleRate:rate,copyToChannel:(samples)=>{bufSamples=samples}}),
 createBufferSource:()=>{source={buffer:null,onended:null,connect(dest){connected=dest;connectCount++},start(time){this.startAt=time},stop(){stopped=true;this.onended?.()},disconnect(){}};return source;},
 resume:async()=>{state='running'}};
const originalNodes=[{residentId:'a',x:25,y:25,freq:220},{residentId:'b',x:90,y:90,freq:330},{residentId:'c',x:150,y:45,freq:440},{residentId:'d',x:210,y:90,freq:660}];
const ref={current:{nodes:structuredClone(originalNodes)}};
const b=backend({model,dsp,library:{},live:{createPlayer:async()=>{throw Error('WORKLET MUST NOT BE USED BY DESIGNER PREVIEW')}}}).attach(ref,{width:500,height:500,referenceHz:220,
 audio:{ensureReady:async()=>{},getContext:()=>context,getOutput:()=>output,acquire:cost=>{admitCount++;return{release(){releaseCount++}}}}});
(async()=>{
 const before=JSON.stringify(ref.current.nodes);
 for(const [name,ratio] of [['glass',1],['ember',1.5],['breath',2]]){
   source=null;const instrument=starter(name),handle=await b.preview(instrument,{frequency:instrument.referenceHz*ratio,velocity:.8});
   assert(handle && source,'preview must create a real AudioBufferSourceNode');
   assert.equal(connected,output,'preview must connect only to the shared master bus');
   assert.equal(source.buffer.sampleRate,context.sampleRate);
   assert(bufSamples instanceof Float32Array && bufSamples.length>1000);
   assert(bufSamples.some(v=>Math.abs(v)>.005),'preview must deliver audible PCM to AudioBufferSource');
   assert(source.startAt>=context.currentTime,'start in future');
   b.stop(); assert.equal(releaseCount,admitCount,'stopping must release global voice admission');
 }
 assert.equal(JSON.stringify(ref.current.nodes),before,'sounddesigner must preserve the historical installation');
 assert(stopped,'preview stop must stop owned source');
 state='suspended';await assert.rejects(b.preview(starter('glass'),{}),/Audio.*running|Audio.*aktiv|audio/i);
 // Worker startup failure must fall back to deterministic local synthesis rather
 // than turning a real user click into a soundless failure.
 ctx.URL={createObjectURL:()=> 'blob:nodal-test', revokeObjectURL:()=>{}};
 ctx.Blob=class Blob{constructor(chunks){this.chunks=chunks}};
 ctx.Worker=class FailingWorker{constructor(){throw Error('Blob workers blocked by browser policy')}};
 state='running'; const fallback=await b.preview(starter('glass'),{frequency:330});
 assert(fallback && source && bufSamples.some(x=>Math.abs(x)>.005));b.stop();
 assert.equal(releaseCount,admitCount);
 // A cancelled, pending Worker render must neither claim global audio admission
 // nor emit a late preview after the user has switched mode.
 let renderRequested=false,terminateCount=0;
 ctx.Worker=class SlowWorker{constructor(){this.onmessage=null}postMessage(){renderRequested=true}terminate(){terminateCount++}};
 const promise=b.preview(starter('glass'),{frequency:330});
 await new Promise(resolve=>setTimeout(resolve,10));assert(renderRequested);
 const previousAdmissions=admitCount;b.stop();
 await assert.rejects(promise,/cancel/i);
 assert.equal(admitCount,previousAdmissions);assert(terminateCount>0);
 // Execute the actual serializable worker entry, not just a fake acknowledgement.
 let workerSource='';
 ctx.URL={createObjectURL:blob=>{workerSource=blob.chunks.join('');return 'blob:worker-live-test'},revokeObjectURL:()=>{}};
 ctx.Worker=class EvaluatingWorker{
   constructor(){this.onmessage=null}
   postMessage(message){
     const scope={postMessage:msg=>setTimeout(()=>this.onmessage?.({data:msg}),0)};
     const workerContext=vm.createContext({self:scope,Float32Array,Float64Array,Uint32Array,Math});
     vm.runInContext(workerSource,workerContext);
     scope.onmessage({data:message});
   }
   terminate(){}
 };
 const realWorker=await b.preview(starter('ember'),{frequency:250});
 assert(realWorker.offlinePreview && source && bufSamples.some(x=>Math.abs(x)>.005));b.stop();
 assert.equal(releaseCount,admitCount);
 console.log('PASS: three audible preview routes, real worker DSP, worker fallback/cancel, shared bus, installation preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
