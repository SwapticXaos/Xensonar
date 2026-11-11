
function __F33CurrentKey(){const s=Vt.getSnapshot(),v=pe.getState(),m=s.model;
 const stamp=[s.sourceRevision,m?.renderMethod,m?.bodyV3?.registerPolicy,v.renderVersion,v.materialExport.bars,v.materialExport.bpm,v.materialExport.beatsPerBar,__F341Workbench.fingerprint()].join(':');
 if(stamp!==__F33KeyStamp){__F33KeyStamp=stamp;__F33KeyValue=pU({sourceRevision:s.sourceRevision,renderMethod:m?.renderMethod??'spectral',registerPolicy:m?.bodyV3?.registerPolicy??'resonance',spectralSignature:ER(v.createProjectSnapshot()),durationSec:Zp(v.materialExport.bars,v.materialExport.bpm,v.materialExport.beatsPerBar)})}
 return __F33KeyValue;
}
__ForgeF33.attachDonorDiagnostics({runtime:Vt,store:pe,key:__F33CurrentKey});
// F3.33: the drawing owns synthesis; PCM is an explicit reference.
// These functions run only in the offline Forge workspace, never in the live engine.
let __f333Epoch = 0;
let __f333RestoreBarrier = 0;
let __f333Persistence = null;
const __f333HearingCache = new Map();
const __f433HearingBudgetBytes=192*1024*1024,__f433HearingMaxEntries=16;
const __f447HearingJobs=new Map();
// The transport indicator reads the same completed PCM cache as Play; its old
// prewarm token alone cannot describe cached A/B listening variants.
let __f333CacheReadyRevision = 0;
const __f333CacheReadyListeners = new Set();
let __f333ReadyMemo=null;
function __f333CacheReadySubscribe(listener){__f333CacheReadyListeners.add(listener);return()=>__f333CacheReadyListeners.delete(listener)}
function __f333CacheReadySnapshot(){return __f333CacheReadyRevision}
function __f333CacheReadyNotify(){__f333ReadyMemo=null;++__f333CacheReadyRevision;for(const listener of __f333CacheReadyListeners)listener()}

// Cached AudioBuffers are RAM-only. Retain useful A/B variants without unbounded allocation.

function __f433CacheBytes(buffer){return Math.max(0,(buffer?.length||0)*(buffer?.numberOfChannels||1)*4)}
function __f433RememberHearing(key,buffer){
 const wasCached=__f333HearingCache.has(key);
 __f333HearingCache.delete(key);__f333HearingCache.set(key,buffer);
 let total=0;for(const value of __f333HearingCache.values())total+=__f433CacheBytes(value);
 while(__f333HearingCache.size>1&&(__f333HearingCache.size>__f433HearingMaxEntries||total>__f433HearingBudgetBytes)){
  const oldest=__f333HearingCache.keys().next().value,removed=__f333HearingCache.get(oldest);
  total-=__f433CacheBytes(removed);__f333HearingCache.delete(oldest);
 }
 if(!wasCached)__f333CacheReadyNotify();
}

// A cache hit is not proof of audible readiness. In particular, an empty
// Fractalia/Carrier render can produce an AudioBuffer containing only zeros.
// Check at control rate and memoize by buffer identity, never on the audio thread.
const __f333AudibleBuffers=new WeakMap();
function __f333AudiblePCM(buffer){
 if(!buffer||typeof buffer.getChannelData!=='function'||!Number.isFinite(buffer.length)||buffer.length<1)return false;
 if(__f333AudibleBuffers.has(buffer))return __f333AudibleBuffers.get(buffer);
 let audible=false;
 for(let ch=0;ch<buffer.numberOfChannels&&!audible;ch++)audible=__f333SamplesHaveSignal(buffer.getChannelData(ch));
 __f333AudibleBuffers.set(buffer,audible);return audible;
}
const __f333AudibleSamples=new WeakMap();
function __f333SamplesHaveSignal(samples){
 if(!samples?.length)return false;
 if(__f333AudibleSamples.has(samples))return __f333AudibleSamples.get(samples);
 let audible=false;
 for(let at=0;at<samples.length;at++)if(Number.isFinite(samples[at])&&Math.abs(samples[at])>1e-8){audible=true;break;}
 __f333AudibleSamples.set(samples,audible);return audible;
}
function __f333AudibleSource(source){
 // The legacy reference/body readers consume monoSamples; their readiness
 // must describe that signal rather than unused original stereo channels.
 return __f333SamplesHaveSignal(source?.monoSamples);
}

// F4.4.9 trial: a return to the main room keeps the drawing and source
// assets, but not Forge-owned PCM previews and measured donor analyses.
function __f449ReleaseForgeDerivedCaches(){
 if(__f333HearingCache.size){__f333HearingCache.clear();__f333CacheReadyNotify();}
 __f447HearingJobs.clear();
 if(typeof __F353AnalysisCache!=='undefined')__F353AnalysisCache.clear();
 if(typeof __f449ReleaseForgeDisplayCache==='function')__f449ReleaseForgeDisplayCache();
}
// The cache key is shared by the renderer and the readiness indicator.
// Reading it never causes audio rendering or changes the LRU order.
function __f333HearingCacheKey(request,context){
 const soundSettings=settings=>{const {updatedAt,...sound}=settings??{};return sound};
 return Ti({version:'forge-hearing-f333',carrierDetune:request.snapshot.carrierDetune??0,spectral:ER(request.snapshot),carrier:request.snapshot.melodicCarrier,
    dimensions:[request.snapshot.spectralWidth??null,request.snapshot.spectralHeight??null],machine:request.machineId,selection:soundSettings(context.auditionSelection),lab:soundSettings(context.synthLab),hx:soundSettings(context.harmonicXplore),
    // The raw renderer is controlled by these *project* fields, not by Synth Lab.
    // Excluding them reused the wrong PCM after switching Additive/IFFT/Granular/Glyph.
    rawSynthesis:request.machineId==='raw-darkpsy-oscillator'?{
      mode:request.snapshot.synthMode,waveforms:request.snapshot.waveformMix}:null,
    fractaliaDonor:request.machineId==='fractalia-self-carrier'&&(request.snapshot.fractaliaInstrument??__Fractalia.snapshot()).donor?fractaliaDonorSnapshot().key:null,
    fractalia:request.machineId==='fractalia-self-carrier'?__Fractalia.semanticKey(request.snapshot.fractaliaInstrument??__Fractalia.snapshot()):null,
    emilia:request.machineId==='emilia-nodal-carrier'?__Emilia.semanticKey(request.snapshot.emiliaInstrument??__Emilia.snapshot()):null,
    ...(__ForgeVoices.is(request.machineId)?{forgeVoice:__ForgeVoices.semanticKey(request.machineId,request.snapshot.forgeVoices)}:null),
    duration:context.durationSec,pitch:context.previewPitchRatio,sampleRate:xt.getContext().sampleRate});
 }
// These are the same sound inputs as the full cache key. Store fields and
// instrument recipes are immutable; grid edits commit through renderVersion.
// Never memoize createProjectSnapshot itself: callers own and may edit that copy.
function __f333ReadyInputs(state,route){
 const machine=route==='carrier'?'raw-darkpsy-oscillator':state.carrierIntegralSelection?.machineId;
 const fractalia=machine==='fractalia-self-carrier'?__Fractalia.snapshot():null;
 return [route,state.spectralData,state.renderVersion,state.spectralData?.carrierDetune??0,
  state.spectralData?.melodicCarrier,state.carrierIntegralSelection,state.carrierIntegralSynthLab,
  state.carrierIntegralHarmonicXplore,state.synthMode,state.waveformMix,
  state.materialExport.bars,state.materialExport.bpm,state.materialExport.beatsPerBar,
  __f3565PitchSemis(),xt.getContext().sampleRate,fractalia,
  fractalia?.donor?fractaliaDonorSnapshot().key:null,
  machine==='emilia-nodal-carrier'?__Emilia.snapshot():null,__ForgeVoices.is(machine)?__ForgeVoices.snapshot():null,__f333CacheReadyRevision];
}
function __f333CachedPreviewReady(state){
 const route=__f333Route(state);
 if(route==='hybrid')return __f333AudiblePCM(__F352Runtime.current()?.buffer);
 if(route==='reference')return __f333AudibleSource(state.sourceAsset);
 // A loaded Audio Body is already available without an asynchronous Forge render.
 if(route==='body')return __f333AudibleSource(state.sourceAsset);
 if((route!=='hearing'&&route!=='carrier')||__f333HearingCache.size===0)return false;
 try{
  const inputs=__f333ReadyInputs(state,route),memo=__f333ReadyMemo;
  if(memo&&inputs.length===memo.inputs.length&&inputs.every((value,i)=>Object.is(value,memo.inputs[i]))&&__f333HearingCache.get(memo.key)===memo.buffer)return memo.ready;
  const request=__f333HearingRequest(state,undefined,route);
  const key=__f333HearingCacheKey(request,IB(request)),buffer=__f333HearingCache.get(key),ready=__f333AudiblePCM(buffer);
  __f333ReadyMemo={inputs,key,buffer,ready};return ready;
 }catch{return false}
}
function __f333Stop() {
  __XenStampFigureAudition.stopAll();
  ++__f333Epoch;
  if(typeof __PureDieter!=='undefined')__PureDieter.cancel();
  if(typeof __F352Runtime!=='undefined'&&__F352Runtime)__F352Runtime.stop();
  xt.stop();
  xt.invalidateBuffer();
  Vt.stop();
}
function __f333Idle() {
  return {isPlaying:false,playheadPosition:0,showPlayheadMarker:false,activeMediatedBody:null,
    basisHearingTransportBridge:{requestKey:null,optionId:null,machineId:null,phase:'idle',progress:0,loopPreview:false,updatedAt:Date.now()}};
}
function __f333WorkingSource(state) {
  return !!state.sourceAsset && state.sourceAssetContext === 'forge3_main' &&
    state.sourcePreviewMode === 'forge' && state.carrierIntegralSelection.source === 'default';
}
function __f333AttachTransitionGuard(store) {
  let previous=store.getState(),handling=false;
  return store.subscribe(()=>{
    const state=store.getState(),before=previous;previous=state;
    if(handling)return;
    const changed=state.renderVersion!==before.renderVersion||state.synthMode!==before.synthMode||state.waveformMix!==before.waveformMix||state.sourceAsset!==before.sourceAsset||
      state.sourcePreviewMode!==before.sourcePreviewMode||state.sourceAssetContext!==before.sourceAssetContext||
      state.carrierIntegralSelection!==before.carrierIntegralSelection||state.carrierIntegralSynthLab!==before.carrierIntegralSynthLab||
      state.carrierIntegralHarmonicXplore!==before.carrierIntegralHarmonicXplore||
      state.materialExport.bars!==before.materialExport.bars||state.materialExport.bpm!==before.materialExport.bpm||
      state.materialExport.beatsPerBar!==before.materialExport.beatsPerBar||state.materialExport.loopPreview!==before.materialExport.loopPreview;
    if(!changed)return;
    handling=true;
    try{__f333Stop();store.setState(__f333Idle());}finally{handling=false;}
  });
}
function __f333Signature(grid) {
  const words = new Uint32Array(grid.data.buffer,grid.data.byteOffset,grid.data.length);
  let hash=2166136261;
  for(let i=0;i<words.length;i++) hash=Math.imul(hash^words[i],16777619);
  return `${grid.width}:${grid.height}:${hash>>>0}`;
}
function __f333Curve(curve,t,fallback) {
  if(!curve?.length) return fallback;
  const at=Math.max(0,Math.min(curve.length-1,t*(curve.length-1))),a=Math.floor(at),b=Math.min(curve.length-1,a+1);
  return curve[a]+(curve[b]-curve[a])*(at-a);
}
function __f333BuildCarrier(composer,trackIds) {
  const normalized=$n(composer),score=L9e({loopComposer:normalized}).synthPattern;
  const chosen=new Set(trackIds),tracks=new Map(score.tracks.map(t=>[t.id,t]));
  const audible=new Set(normalized.notes.filter(n=>{
    const index=wa(normalized,n);
    return chosen.has(n.trackId)&&!normalized.pitchSteps[index]?.muted;
  }).map(n=>n.id));
  const notes=score.notes.filter(n=>audible.has(n.id)||[...audible].some(id=>n.id.startsWith(id+':'))).map(n=>{
    const track=tracks.get(n.trackId),pitch=w1(n.localField,'pitch-elastic'),gain=w1(n.localField,'dynamic-fade');
    const baseHz=(n.lineHz??score.baseHz)*Math.pow(l9e(score.repetitionModel),n.octaveOffset??0);
    const pitchHz=[],gainCurve=[];
    for(let i=0;i<96;i++) {
      const at=i/95,semitones=__f333Curve(n.compiledPitchSemitones,at,12*pitch(at));
      pitchHz.push(baseHz*Math.pow(2,semitones/12));
      gainCurve.push(Math.max(0,Math.min(1,(n.velocity??.8)*(track?.volume??.8)*
        __f333Curve(n.compiledGainCurve,at,1+.95*gain(at)))));
    }
    return {id:n.id,voiceId:n.id,trackId:n.trackId,startBeat:n.startBeat,durationBeats:n.durationBeats,
      pitchHz,gainCurve,fadeInBeats:n.fadeInBeats??0,fadeOutBeats:n.fadeOutBeats??0};
  });
  return {version:'melodic-carrier-v1',durationBeats:score.bars*score.beatsPerBar,notes,
    tracks:score.tracks.filter(t=>chosen.has(t.id)),origin:'melodic-loop'};
}
function __f333CarrierColumn(document,x,width,height) {
  const beat=(x+.5)/width*document.durationBeats,peaks=[];
  for(const note of document.notes) {
    if(beat<note.startBeat||beat>=note.startBeat+note.durationBeats) continue;
    const at=(beat-note.startBeat)/note.durationBeats,hz=__f333Curve(note.pitchHz,at,220);
    if(!(hz>=20&&hz<=20000)) continue;
    let energy=__f333Curve(note.gainCurve,at,.6);
    if(note.fadeInBeats>0) energy*=Math.min(1,(beat-note.startBeat)/note.fadeInBeats);
    if(note.fadeOutBeats>0) energy*=Math.min(1,(note.startBeat+note.durationBeats-beat)/note.fadeOutBeats);
    if(energy>.00001) peaks.push({id:note.id,voiceId:note.voiceId,trackId:note.trackId,hz,energy,
      logHz:Math.log2(hz),bin:Rt(hz,height),grain:.5});
  }
  return peaks;
}
function __f333MaterializeCarrier(document,grid) {
  if(document?.version!=='melodic-carrier-v1'||!Array.isArray(document.notes)) throw new Error("Invalid Melodic carrier data.");
  grid.clear();
  for(let x=0;x<grid.width;x++) for(const p of __f333CarrierColumn(document,x,grid.width,grid.height)) {
    // Narrow sub-bin ridge: a fundamental, never a cloud of inferred harmonics.
    const center=Math.max(0,Math.min(grid.height-1,p.bin));
    for(let y=Math.max(0,Math.floor(center)-1);y<=Math.min(grid.height-1,Math.ceil(center)+1);y++) {
      const weight=Math.exp(-.5*((y-center)/.65)**2);
      if(weight>.015) grid.set(x,y,Math.max(grid.get(x,y),p.energy*weight));
    }
  }
  const result={...document,rasterSignature:__f333Signature(grid)};
  grid.melodicCarrier=result;
  return result;
}
function __f333ReadCarrier(grid) {
  const doc=grid.melodicCarrier;
  return doc?.version==='melodic-carrier-v1'&&doc.rasterSignature===__f333Signature(grid)?doc:null;
}
function __f333CarrierSkeleton(document,grid,durationSec) {
  return {width:grid.width,height:grid.height,durationSec,anchorsByTime:Array.from({length:grid.width},(_,x)=>
    __f333CarrierColumn(document,x,grid.width,grid.height).map(p=>({id:`${p.id}:${x}`,voiceId:p.voiceId,trackId:p.trackId,
      timeIndex:x,centerBin:p.bin,centerHz:p.hz,bandwidthBins:1,bandwidthHz:p.hz*.008,
      energy:p.energy,ridgeness:1,continuity:1,regime:'tonal',clusterId:null})))};
}
// Readiness, prewarm, Play and export build their raw PCM request here.
// The editable project snapshot remains a private copy owned by this request.
function __f333HearingRequest(state,progress,route='hearing') {
  const snapshot=state.createProjectSnapshot();
  const machineId=route==='carrier'?'raw-darkpsy-oscillator':state.carrierIntegralSelection.machineId;
  return OB({projectName:state.materialExport.name,snapshot,machineId,
    valueSource:'right-override',selection:state.carrierIntegralSelection,synthLab:state.carrierIntegralSynthLab,
    harmonicXplore:state.carrierIntegralHarmonicXplore,previewBpm:state.materialExport.bpm,
    previewGain:1,previewPitchSemitones:__f3565PitchSemis(),loopPreview:route==='carrier'||state.materialExport.loopPreview,onRenderProgress:progress});
}
// One DSP dispatch for full Figure Projects and stamp miniatures. The caller
// owns cancellation/cache/playback; synthesis never installs a drawing in pe.
async function __f333SynthesizeHearing(request,context,{check=()=>{},signal,preparedDonorKey,rawRenderer=__PureDieter,transient=false}={}){
 check();const duration=context.durationSec,grid=TR(request.snapshot);
  let buffer;
  const branch=xK(String(request.machineId));
  if(request.machineId==='fractalia-self-carrier') {
    buffer=await __Fractalia.renderCarrier({grid,durationSec:duration,previewPitchRatio:context.previewPitchRatio,instrument:request.snapshot.fractaliaInstrument,preparedDonorKey,onProgress:request.onRenderProgress,signal});
  } else if(request.machineId==='emilia-nodal-carrier') {
    buffer=await __Emilia.renderCarrier({grid,durationSec:duration,previewPitchRatio:context.previewPitchRatio,
      instrument:request.snapshot.emiliaInstrument,onProgress:request.onRenderProgress,signal});
  } else if(__ForgeVoices.is(request.machineId)) {
    buffer=await __ForgeVoices.renderCarrier({machineId:request.machineId,grid,durationSec:duration,previewPitchRatio:context.previewPitchRatio,
      instrument:request.snapshot.forgeVoices,onProgress:request.onRenderProgress,signal});
  } else if(branch) {
    const carrier=DR({request,context,spectralData:grid}).rootFollowBuild;
    if(!carrier.summary.eligible) throw new Error(carrier.summary.reason||"The figure is empty.");
    const rendered=await vK({request,context,spectralData:grid,baseHz:AK(carrier.summary.baseHz*context.previewPitchRatio),...branch,check,transient});
    buffer=rendered.buffer;
  } else if(request.machineId==='raw-darkpsy-oscillator') {
    buffer=await rawRenderer.render({grid:__f3565PitchGrid(grid,context.previewPitchRatio),mode:request.snapshot.synthMode,mix:request.snapshot.waveformMix,durationSec:duration,context:xt.getContext(),onProgress:request.onRenderProgress,check});
  } else if(request.machineId==='harmonic-xplore-direct-carrier'||request.machineId==='spektral-synthese-body') {
    const args={spectralData:grid,synthLab:LR(context.synthLab),harmonicXplore:context.harmonicXplore,
      durationSec:duration,previewDurationSec:duration,rootHz:JU(grid,context.previewPitchRatio),gain:context.previewGain,
      onProgress:request.onRenderProgress,cooperative:!!request.onRenderProgress};
    buffer=(request.machineId==='spektral-synthese-body'?await DB(args):await BR(args)).buffer;
  } else throw new Error("This listening mode is unavailable for the active figure.");
 check();return buffer;
}
async function __f333RenderHearing(request) {
  // Progress is observation, not synthesis. A failed UI consumer must not abort
  // another listener's shared render or remove its in-flight registry entry.
  const publish=(listener,value,job)=>{
    try{
      listener(value);
    }catch(error){
      job?.listeners.delete(listener);
      console.warn('[Forge] Progress listener detached after an error',error);
    }
  };
  // Capture ownership before any asynchronous preparation. Stop during donor
  // analysis cancels this request just as Stop during PCM synthesis does.
  const epoch=typeof __f333Epoch==='number'?__f333Epoch:0;
  const machine=request.machineId;
  if(machine==='fractalia-self-carrier'&&!request.snapshot.fractaliaInstrument)
    request={...request,snapshot:{...request.snapshot,fractaliaInstrument:__Fractalia.snapshot()}};
  if(machine==='emilia-nodal-carrier'&&!request.snapshot.emiliaInstrument)
    request={...request,snapshot:{...request.snapshot,emiliaInstrument:__Emilia.snapshot()}};
  if(__ForgeVoices.is(machine)&&!request.snapshot.forgeVoices)
    request={...request,snapshot:{...request.snapshot,forgeVoices:__ForgeVoices.snapshot()}};
  // A Fractalia material recipe uses the selected purple mask as its Donor.
  // Prepare it before constructing the exact PCM cache key, not after a cache lookup.
  if(machine==='fractalia-self-carrier'&&request.snapshot.fractaliaInstrument.donor)
    await __f3562EnsureDonor();
  const preparedDonorKey=machine==='fractalia-self-carrier'&&request.snapshot.fractaliaInstrument.donor?fractaliaDonorSnapshot().key:undefined;
  const isCurrent=()=>epoch===(typeof __f333Epoch==='number'?__f333Epoch:0)&&
    (preparedDonorKey===undefined||preparedDonorKey===fractaliaDonorSnapshot().key);
  const check=()=>{if(!isCurrent())throw new DOMException('Hearing render superseded','AbortError')};
  check();
  const context=IB(request),duration=context.durationSec;
  // Preview and export share this exact full-cycle buffer. Loop changes playback, not the render.
  context.previewDurationSec=duration;
  context.loopPreview=true;
  const key=__f333HearingCacheKey(request,context);
  const hit=__f333HearingCache.get(key);
  if(hit){__f433RememberHearing(key,hit);if(request.onRenderProgress)publish(request.onRenderProgress,1);return {buffer:hit,cacheKey:key,cacheHit:true,context};}
  const existing=__f447HearingJobs.get(key);
  // Play, automatic preview and export may join the same PCM calculation.
  // Subscribe each consumer, replay completed work, and detach when it settles.
  const listener=request.onRenderProgress;
  const listen=async job=>{
    try{
      if(listener){job.listeners.add(listener);publish(listener,job.progress,job);}
      return {...await job.promise,context};
    }
    finally{if(listener)job.listeners.delete(listener);}
  };
  if(existing?.epoch===epoch)return listen(existing);
  const job={epoch,progress:0,listeners:new Set(),promise:null};
  const report=value=>{
    if(epoch!==(typeof __f333Epoch==='number'?__f333Epoch:0)||!Number.isFinite(value))return;
    const next=Math.max(job.progress,Math.min(.99,Math.max(0,value)));
    if(next===job.progress)return;
    job.progress=next;
    for(const listener of job.listeners)publish(listener,next,job);
  };
  request={...request,onRenderProgress:report};
  // Install before synthesis starts, including synchronous initial callbacks.
  __f447HearingJobs.set(key,job);
  job.promise=Promise.resolve().then(async()=>{
  check();
  // Reconstruct the raster only for a cache miss that owns the render.
  const buffer=await __f333SynthesizeHearing(request,context,{check,preparedDonorKey});
  check();
  __f433RememberHearing(key,buffer);
  job.progress=1;for(const listener of job.listeners)publish(listener,1,job);
  return {buffer,cacheKey:key,cacheHit:false,context};
  });
  try{return await listen(job)}finally{if(__f447HearingJobs.get(key)===job)__f447HearingJobs.delete(key)}
}

// F3.56.5: one carrier pitch offset shared across listener and renderers.
function __f3565PitchSemis(){return __F3564Master.getSnapshot().tuning;}
function __f3565PitchRatio(){return 2**(__f3565PitchSemis()/12);}
// Legacy pixel-frequency renderers have no root-pitch parameter. Re-bin only the
// private OFFLINE render copy; the editable figure and persisted JSON stay untouched.
function __f3565PitchGrid(grid,ratio){
 if(!grid||!Number.isFinite(ratio)||Math.abs(ratio-1)<1e-10)return grid;
 const width=grid.width,height=grid.height,shift=height*Math.log(ratio)/Math.log(1000);
 const output=new ph(width,height); output.melodicCarrier=grid.melodicCarrier??null;
 for(let y=0;y<height;y++){
  const pos=y+shift,lo=Math.floor(pos),t=pos-lo;
  if(lo>=height||lo+1<0)continue;
  for(let x=0;x<width;x++){
   const a=lo>=0&&lo<height?grid.get(x,lo):0;
   const b=lo+1>=0&&lo+1<height?grid.get(x,lo+1):0;
   output.set(x,y,a*(1-t)+b*t);
   const ga=lo>=0&&lo<height?grid.getGrain(x,lo):.5;
   const gb=lo+1>=0&&lo+1<height?grid.getGrain(x,lo+1):.5;
   output.setGrain(x,y,ga*(1-t)+gb*t);
  }
 }
 return output;
}
// Shift only the voice reference of the frozen carrier support. No extra
// transpose in the donor material config, so Cecilia and donor never double-tune.
function __f3565PitchSupport(support,semitones){
 if(!support||!semitones)return support;
 const plan=support.plan,root=plan.rootReferenceHz*2**(semitones/12);
 return Object.freeze({...support,plan:Object.freeze({...plan,rootReferenceHz:root})});
}
// F3.56.4: transport-level controls; not part of saved Donor recipes or source PCM.
const __F3564Master=(()=>{
 const listeners=new Set();
 let state=Object.freeze({tuning:0,volume:100,revision:0});
 const subscribe=fn=>(listeners.add(fn),()=>listeners.delete(fn));
 return Object.freeze({subscribe,getSnapshot:()=>state,set(name,value){
  if(!['tuning','volume'].includes(name)||!Number.isFinite(value))return;
  const bound=name==='tuning'?Math.max(-12,Math.min(12,value)):Math.max(0,Math.min(400,value));
  if(state[name]===bound)return;
  state=Object.freeze({...state,[name]:bound,revision:state.revision+1});
  for(const listener of listeners)listener();
  if(name==='volume')__f3564UpdateLiveGain();
 }});
})();
// Live Forge-Donor listening controls the EXISTING audio-engine gain node;
// exports instead apply the equivalent transform to an independent PCM copy.
let __f3564Live=null;
const __f3564PeakMemo=new WeakMap();
function __f3564BufferPeak(buffer){
 if(__f3564PeakMemo.has(buffer))return __f3564PeakMemo.get(buffer);
 let peak=0;
 for(let c=0;c<buffer.numberOfChannels;c++){
  const samples=buffer.getChannelData(c);
  for(let i=0;i<samples.length;i++)peak=Math.max(peak,Math.abs(samples[i]));
 }
 __f3564PeakMemo.set(buffer,peak);
 return peak;
}
function __f3564SafeGain(buffer,volume){
 if(volume===100)return 1;
 const gain=volume/100,peak=__f3564BufferPeak(buffer);
 return peak>0?Math.min(gain,.985/peak):gain;
}
function __f3564ActivateLiveGain(buffer){
 const node=xt.__f340OutputGain;
 if(!node||!xt.isPlaying)return;
 __f3564Live={buffer,node};
 __f3564UpdateLiveGain();
}
function __f3564UpdateLiveGain(){
 const live=__f3564Live;
 if(!live||!xt.isPlaying||xt.__f340OutputGain!==live.node||xt.__f340PreviewSession?.buffer!==live.buffer)return;
 const context=xt.getContext(),gain=__f3564SafeGain(live.buffer,__F3564Master.getSnapshot().volume);
 live.node.gain.cancelScheduledValues(context.currentTime);
 live.node.gain.setTargetAtTime(gain,context.currentTime,.008);
}
// Gain is applied on a COPY after synthesis, so revising the transport volume
// never destroys a cached raw PCM result. A shared, full-buffer peak guard
// prevents hard clipping on WAV/FLAC/material export when boosting quiet donors.
function __f3564ApplyGain(original){
 const volume=__F3564Master.getSnapshot().volume;
 if(volume===100)return original;
 const channels=original.numberOfChannels;
 const buffer=xt.getContext().createBuffer(channels,original.length,original.sampleRate);
 const safeGain=__f3564SafeGain(original,volume);
 for(let c=0;c<channels;c++){
  const src=original.getChannelData(c),dst=buffer.getChannelData(c);
  for(let i=0;i<src.length;i++)dst[i]=src[i]*safeGain;
 }
 return buffer;
}

function __f352Enabled(){return __F341Workbench.getConfig().params.materialPilot===true;}
async function LU(e,t,n={}){return __f352Enabled()?__F352Runtime.play(pe.getState(),n):__f352LegacyPlayDonor(e,t,n);}
async function KO(e,t,returnPcmBuffer=false){if(!__f352Enabled())return __f352LegacyExportDonor(e,t,returnPcmBuffer);const artifact=await __F352Runtime.render();return returnPcmBuffer?artifact.buffer:xt.encodeSamplesToWAV(artifact.pcm,artifact.sampleRate);}
function __f333Route(state) {
  // F3.5: the EXPLICIT selected Donor hearing mode always beats a stale Emilia/Fractalia machine.
  // Never silently play the previous carrier when the donor is not prepared.
  if(__F35611DonorIntent){
    if(!Vt.getSnapshot().selected)return 'donor-pending';
    return __f352Enabled()?'hybrid':'donor';
  }
  // When no explicit choice exists, stored machine choices retain their earlier semantics.
  if(__forgeSelfMachine(state.carrierIntegralSelection?.machineId))return 'hearing';
  if(Vt.getSnapshot().selected&&__f352Enabled()) return 'hybrid';
  if(Vt.getSnapshot().selected) return 'donor';
  if(state.sourceAsset&&state.sourcePreviewMode!=='forge') return 'reference';
  if(state.carrierIntegralSelection.source!=='default') return 'hearing';
  if(__f333WorkingSource(state)) return 'body';
  return 'carrier';
}
async function __f333RenderCurrentRaw(state,options={}) {
  // A prepared/cache donor wins over a newly painted purple mask. When no mask
  // is committed, Play/Save prepares the current mask automatically via the
  // same resolver used by the primary transport; never demand another click.
  if(__f333Route(state)==='donor-pending'){
    const epoch=__f333Epoch,source=state.sourceAsset;
    if(typeof __ForgeNavigatorSample!=='undefined'&&__ForgeNavigatorSample.current()&&
        (__ForgeNavigatorSample.snapshot().previewBusy||__ForgeNavigatorSample.snapshot().busy))
      __ForgeNavigatorSample.update({message:'Preparing donor timbre …'});
    await __f3562EnsureDonor();
    if(epoch!==__f333Epoch||pe.getState().sourceAsset!==source)
      throw new DOMException('Donor preparation superseded','AbortError');
    if(!Vt.selectDonor())throw Error('The chosen donor could not be prepared.');
    state=pe.getState();
  }
  const duration=Zp(state.materialExport.bars,state.materialExport.bpm,state.materialExport.beatsPerBar),route=__f333Route(state);
  if(route==='donor-pending')throw Error('No valid donor is available for the selected listening mode.');
  if(route==='hybrid'){const artifact=await __F352Runtime.render(state);return {buffer:artifact.buffer,duration:artifact.durationSec,route,artifact};}
  if(route==='donor') return options.flacBuffer?{buffer:await KO(state.spectralData,duration,true),duration,route}:{blob:await KO(state.spectralData,duration),duration,route};
  if(route==='reference') {
    const source=state.sourceAsset,full=state.sourcePreviewMode==='sourceFull',start=full?0:source.importStartSec;
    const frames=Math.min(source.monoSamples.length-Math.round(start*source.sampleRate),
      Math.round((full?source.originalDuration:source.importDurationSec)*source.sampleRate));
    const buffer=xt.getContext().createBuffer(1,Math.max(1,frames),source.sampleRate);
    buffer.copyToChannel(source.monoSamples.subarray(Math.round(start*source.sampleRate),Math.round(start*source.sampleRate)+frames),0);
    return {buffer,duration:buffer.duration,route};
  }
  if(route==='hearing'||route==='carrier') return {...await __f333RenderHearing(__f333HearingRequest(state,options.onProgress,route)),duration,route};
  if(route==='body') {
    const buffer=options.audioMode==='body'?xt.renderFromMediatedAudioBodyToBuffer(
      state.activeMediatedBody??FR(state.spectralData,ys(),state.sourceAsset),{sourceAsset:state.sourceAsset,loopDurationSec:duration,renderMode:'body_contract_preview'}):
      xt.renderForge3BodyPreviewToBuffer(state.sourceAsset,state.spectralData,ys(),duration);
    return {buffer,duration,route};
  }
  throw new Error('Unsupported Forge listening route: '+route);
}
async function __f333RenderCurrent(state,options={}) {
 const needsGain=__F3564Master.getSnapshot().volume!==100;
 const result=await __f333RenderCurrentRaw(state,needsGain?{...options,flacBuffer:true}:options);
 if(!needsGain||!result.buffer)return result;
 return {...result,buffer:__f3564ApplyGain(result.buffer),signalBuffer:result.buffer,blob:undefined};
}
async function __f333PlayCurrent(state,options={}) {
  // Transport Play and "Listen to Figure with Donor" share the exact same lazy
  // mask resolution. Never require the user to press "Extract Timbre" first.
  const requestedEpoch=__f333Epoch;
  if(__F35611DonorIntent||(!__forgeSelfMachine(state.carrierIntegralSelection?.machineId)&&Vt.getSnapshot().selected)){
    await __f3562EnsureDonor();
    if(__f333Epoch!==requestedEpoch)return false; // Stop/cancel during analysis
    if(!Vt.selectDonor())throw Error("The selected donor mask could not be prepared.");
    state=pe.getState();
  }
  const epoch=__f333Epoch,revision=state.renderVersion,source=state.sourceAsset,route=__f333Route(state);
  const current=()=>epoch===__f333Epoch&&pe.getState().renderVersion===revision&&pe.getState().sourceAsset===source&&__f333Route(pe.getState())===route;
  if(route==='hybrid') return __F352Runtime.play(state,options);
  if(route==='donor'&&__F3564Master.getSnapshot().volume===100) return LU(state.spectralData,Zp(state.materialExport.bars,state.materialExport.bpm,state.materialExport.beatsPerBar),
    {...options,isCurrent:current,loopPreview:state.materialExport.loopPreview});
  const rendered=await __f333RenderCurrent(state,options);
  if(!current())return false;
  if(!__f333AudiblePCM(rendered.signalBuffer??rendered.buffer))
   throw Error('The selected listening mode has no audible signal. Check the carrier figure and sound source.');
  const played=await xt.playBufferInternal(rendered.buffer,rendered.buffer.duration,options.fromPosition??0,
    p=>{if(current())options.onPosition?.(p)},()=>{if(current())options.onEnd?.()},
    {isCurrent:current,playbackRate:1,loopPreview:route!=='reference'&&!!state.materialExport.loopPreview,lifecycleMode:`forge-f333-${route}`,
      beatGuide:{...state.materialExport,loopDurationSec:rendered.duration}});
  return played&&current();
}
/* Navigator routing always cuts the audible listening mode, not the source or
   spectrogram. Rendering is offline and guarded against stale selection changes. */
function __f333NavigatorTypedName(){return String(__ForgeNavigatorSample.snapshot().nameDraft||'')
 .replace(/[\x00-\x1f<>:"/\\|?*]/g,' ').replace(/\s+/g,' ').trim()
 .replace(/\.wav$/i,'').replace(/[. ]+$/g,'').slice(0,74);}
function __f333NavigatorName(projectName){
 // Project Name is a local editable draft in the rack. Read the visible draft
 // at export, rather than silently using the older persisted material name.
 const draft=typeof document!=='undefined'?
  document.querySelector('[data-forge-project-save-in-rack="true"] input[aria-label="Project Name"]')?.value:null;
 return __f333NavigatorTypedName()||String(draft||projectName||'Forge').trim().slice(0,74)||'Forge';
}
async function __f333RenderNavigatorClip(selected,{oneShot=false,maxSeconds=null,float=false}={}){
 if(!selected||__ForgeNavigatorSample.current()!==selected)throw Error('Navigator selection is no longer valid.');
 const state=pe.getState(),revision=state.renderVersion,source=state.sourceAsset,
       route=__f333Route(state),masterRevision=__F3564Master.getSnapshot().revision,
       hybridIdentity=route==='hybrid'?__F352Runtime.identity(state):null;
 const result=await __f333RenderCurrent(state,{flacBuffer:true});
 if(__ForgeNavigatorSample.current()!==selected||pe.getState().renderVersion!==revision||
    pe.getState().sourceAsset!==source||__f333Route(pe.getState())!==route||
    __F3564Master.getSnapshot().revision!==masterRevision||
    (hybridIdentity&&__F352Runtime.identity()!==hybridIdentity))
   throw Error('Figure or listening mode changed during navigator export.');
 const buffer=result.buffer;
 if(!buffer?.length||!buffer.sampleRate)throw Error('No playable PCM available for this listening mode.');
 const start=Math.min(buffer.length-1,Math.floor(selected.start*buffer.length));
 const requestedEnd=Math.min(buffer.length,Math.max(start+1,Math.ceil(selected.end*buffer.length)));
 // Role cap = one free-phase bar of the current Live Room. Not a new sample store.
 // Shared Forge sample export has a separate 5-second safe-sample bound.
 const clock=oneShot?__XenMainRoomSessionBridge.liveClock():null;
 const oneBarSec=oneShot?__XenOneShotAssignments.barSeconds(clock.bpm,clock.beatsPerBar):null;
 const exportMaxSec=oneShot?oneBarSec:maxSeconds;
 const maxFrames=Number.isFinite(exportMaxSec)&&exportMaxSec>0?Math.max(1,Math.floor(exportMaxSec*buffer.sampleRate)):requestedEnd-start;
 const end=Math.min(requestedEnd,start+maxFrames);
 const frames=end-start,seconds=frames/buffer.sampleRate;
 if(seconds<.025)throw Error('Navigator sample selection must be at least 25 ms.');
 const channels=[];let peak=0;
 const fade=Math.min(Math.floor(buffer.sampleRate*.003),Math.floor(frames/4));
 for(let ch=0;ch<Math.min(2,buffer.numberOfChannels||1);ch++){
  const pcm=new Float32Array(frames),sourcePcm=buffer.getChannelData(ch);
  for(let i=0;i<frames;i++){
   let value=sourcePcm[start+i];
   if(!Number.isFinite(value))throw Error('The selected audio contains invalid samples. Nothing was exported.');
   if(fade){if(i<fade)value*=i/fade;if(i>frames-1-fade)value*=(frames-1-i)/fade;}
   pcm[i]=value;peak=Math.max(peak,Math.abs(value));
  }channels.push(pcm);
 }
 if(peak<1e-8)throw Error('The selected region is silent. Nothing was exported.');
 const wav=float?await __xenRecorderFloatWav(channels[0],channels[1]||channels[0],buffer.sampleRate):channels.length===1?xt.encodeSamplesToWAV(channels[0],buffer.sampleRate):gU(channels,buffer.sampleRate);
 return {blob:wav instanceof Blob?wav:new Blob([wav],{type:'audio/wav'}),durationSec:seconds};
}
/* W06 — direct audition-to-editor bridge. No sample store and no parallel DSP.
   The Wave Editor receives the same rendered listening mode as Play, limited to
   the Navigator's complete mask if selected (not Save as Sample's 5 s cap). */
/* ROOM4-03: target 'multitrack' shares the render and the stale-checks; it keeps the
   whole figure as Float32 WAV (lossless) and hands it to __XenMultitrackInbox. */
async function __f333SendToEditor(target='editor'){
 const toMultitrack=target==='multitrack',where=toMultitrack?'Multitrack':'Editor';
 if(toMultitrack&&!globalThis.__XenMultitrackInbox){__ForgeNavigatorSample.update({message:'Multitrack is not available in this build.'});return false}
 const selection=__ForgeNavigatorSample.current(),sampleState=__ForgeNavigatorSample.snapshot();
 if(sampleState.busy)return false;
 const name=__f333NavigatorName(pe.getState().materialExport?.name);
 __ForgeNavigatorSample.update({busy:true,message:'Preparing current listening mode for '+where+' …'});
 try{
  let state=pe.getState();
  // Match Play's donor preflight, including an already selected library donor.
  if(__F35611DonorIntent||(!__forgeSelfMachine(state.carrierIntegralSelection?.machineId)&&Vt.getSnapshot().selected)){
   const before=__f333Epoch,asset=state.sourceAsset;
   await __f3562EnsureDonor();
   if(before!==__f333Epoch||pe.getState().sourceAsset!==asset)throw new DOMException('Sound changed during donor preparation.','AbortError');
   if(!Vt.selectDonor())throw Error('The selected donor could not be prepared.');
   state=pe.getState();
  }
  const epoch=__f333Epoch,revision=state.renderVersion,asset=state.sourceAsset,
    mode=__ForgeListeningMode.value(),route=__f333Route(state),masterRevision=__F3564Master.getSnapshot().revision,
    hybridIdentity=route==='hybrid'?__F352Runtime.identity(state):null;
  let blob;
  if(selection){
   // The canonical Navigator renderer already checks mask, route, revisions and
   // volume. No extra trim, no 5-second safety cap for an editor transfer.
   const clip=await __f333RenderNavigatorClip(selection,{maxSeconds:null,float:toMultitrack});
   blob=clip.blob;
  }else{
   const rendered=await __f333RenderCurrent(state,{flacBuffer:true});
   const buffer=rendered.buffer;
   if(!buffer?.length||!buffer.sampleRate||!__f333AudiblePCM(rendered.signalBuffer??buffer))
    throw Error('The selected listening mode has no audible audio to edit.');
   const channels=Array.from({length:Math.min(2,buffer.numberOfChannels||1)},(_,ch)=>buffer.getChannelData(ch));
   const wav=toMultitrack?await __xenRecorderFloatWav(channels[0],channels[1]||channels[0],buffer.sampleRate):channels.length===1?xt.encodeSamplesToWAV(channels[0],buffer.sampleRate):gU(channels,buffer.sampleRate);
   blob=wav instanceof Blob?wav:new Blob([wav],{type:'audio/wav'});
  }
  if(epoch!==__f333Epoch||pe.getState().renderVersion!==revision||pe.getState().sourceAsset!==asset||
      __ForgeListeningMode.value()!==mode||__f333Route(pe.getState())!==route||
      __F3564Master.getSnapshot().revision!==masterRevision||
      (hybridIdentity&&__F352Runtime.identity()!==hybridIdentity)||
      (selection&&__ForgeNavigatorSample.current()!==selection))
   throw new DOMException('Selection or listening mode changed. Nothing was sent.','AbortError');
  const safe=name.replace(/[\\/<>:"|?*]/g,' ').trim()||'Forge';
  if(toMultitrack){
   const sent=await globalThis.__XenMultitrackInbox.sendBlob({blob,name:safe+(selection?' · Selection':''),origin:'spectral-forge',bpm:Number(state.materialExport?.bpm)||null});
   __ForgeNavigatorSample.update({message:'🎚 Sent to Multitrack · new track'+(sent.sourceBpm?' · '+sent.sourceBpm+' BPM':'')+' · '+(selection?'Navigator selection':'Whole figure')});
   return true;
  }
  const file=new File([blob],safe+(selection?' · Selection':' · Whole Figure')+'.wav',{type:'audio/wav',lastModified:Date.now()});
  await new Promise((resolve,reject)=>{
   const request={file,claimed:false,resolve,reject};
   window.dispatchEvent(new CustomEvent('xensonar:forge:send-to-editor-file',{detail:request}));
   if(!request.claimed)reject(Error('Audio Import / Wave Editor is not mounted. Open Material Forge → SpectralForge.'));
  });
  __ForgeNavigatorSample.update({message:'✂ Sent to Editor · '+(selection?'Navigator selection':'Whole figure')+' · '+__f333CurrentLabel(state)});
  return true;
 }catch(error){
  __ForgeNavigatorSample.update({message:where+' transfer failed · '+(error?.message||'Unknown error')});
  return false;
 }finally{__ForgeNavigatorSample.update({busy:false});}
}
function __ForgeSendToEditorButton(){
 const snapshot=P.useSyncExternalStore(__ForgeNavigatorSample.subscribe,__ForgeNavigatorSample.snapshot,__ForgeNavigatorSample.snapshot);
 return P.createElement('button',{type:'button','data-forge-send-to-editor':true,
  'aria-label':'Send currently audible listening mode to Editor',
  title:'✂ Send the currently selected listening mode to the Wave Editor · purple Navigator mask if selected, otherwise whole figure',
  disabled:snapshot.busy,onClick:()=>void __f333SendToEditor(),
  className:'f35-rack-send-editor rounded border border-fuchsia-700 bg-fuchsia-950/45 text-xs font-semibold text-fuchsia-100 hover:bg-fuchsia-900 disabled:opacity-50'},
  snapshot.busy?'Preparing …':'Send to Editor');
}
function __ForgeSendToMultitrackButton(){
 const snapshot=P.useSyncExternalStore(__ForgeNavigatorSample.subscribe,__ForgeNavigatorSample.snapshot,__ForgeNavigatorSample.snapshot);
 return P.createElement('button',{type:'button','data-forge-send-to-multitrack':true,
  'aria-label':'Send currently audible listening mode to Multitrack',
  title:'🎚 Send the current listening mode to Room IV · Multitrack as a new track · purple Navigator mask if selected, otherwise whole figure · lossless Float32, Forge tempo is kept as source tempo',
  disabled:snapshot.busy,onClick:()=>void __f333SendToEditor('multitrack'),
  className:'f35-rack-send-multitrack rounded border border-amber-600/70 bg-amber-950/40 text-xs font-semibold text-amber-100 hover:bg-amber-900/40 disabled:opacity-50'},
  snapshot.busy?'Preparing …':'🎚 Send to Multitrack');
}
// Forge Navigator one-shots reuse the canonical IndexedDB sample registry.
// They deliberately do not change room, transport or active sample selection.
async function __f333SaveNavigatorSample(){
 const selected=__ForgeNavigatorSample.current();
 if(!selected||__ForgeNavigatorSample.snapshot().busy)return false;
 const projectName=pe.getState().materialExport?.name,typed=__f333NavigatorTypedName();
 __ForgeNavigatorSample.update({busy:true,message:'Rendering sample …'});
 try{
  const clip=await __f333RenderNavigatorClip(selected,{maxSeconds:5});
  const name=typed?typed+'.wav':__f333NavigatorName(projectName)+' · Sample '+
   Math.round(selected.start*100)+'–'+Math.round(selected.end*100)+'%.wav';
  const saved=await xS(name,clip.blob);
  __ForgeNavigatorSample.update({message:'Sample saved · '+saved.name});
  return saved;
 }catch(error){__ForgeNavigatorSample.update({message:error?.message||'Sample could not be saved.'});return false;}
 finally{__ForgeNavigatorSample.update({busy:false});}
}
async function __f333ExportCurrent(state,options={}) {
  const epoch=__f333Epoch,revision=state.renderVersion,masterRevision=__F3564Master.getSnapshot().revision,hybridIdentity=__f333Route(state)==='hybrid'?__F352Runtime.identity(state):null;
  const result=await __f333RenderCurrent(state,options);
  if(epoch!==__f333Epoch||pe.getState().renderVersion!==revision||__F3564Master.getSnapshot().revision!==masterRevision||(hybridIdentity&&__F352Runtime.identity()!==hybridIdentity))throw new DOMException("The figure changed during export.",'AbortError');
  // Gahjer, Holgriot and Ingor are stereo instruments: their file keeps both channels.
  if(!result.blob&&__f333StereoVoice(state,result.buffer))return gU([result.buffer.getChannelData(0),result.buffer.getChannelData(1)],result.buffer.sampleRate);
  return result.blob??xt.encodeSamplesToWAV(result.buffer.getChannelData(0),result.buffer.sampleRate);
}
// Only the Forge Voices export two channels; every earlier listening mode keeps its channel-zero file.
function __f333StereoVoice(state,buffer){return buffer?.numberOfChannels===2&&__f333Route(state)==='hearing'&&__ForgeVoices.is(state.carrierIntegralSelection?.machineId)}
// F3_45: download-format adapter. Preserve the original PCM-16 WAV source channel;
// F3.19.1 recorder FLAC worker writes an identical first channel and duplicates mono to stereo.
// It does not change the Forge hearing, re-render for format conversion, or attach a new DSP path.
async function __f345ExportFlacCurrent(state,options={}) {
  const epoch=__f333Epoch,revision=state.renderVersion,source=state.sourceAsset,route=__f333Route(state),masterRevision=__F3564Master.getSnapshot().revision,hybridIdentity=route==='hybrid'?__F352Runtime.identity(state):null;
  const valid=()=>epoch===__f333Epoch&&pe.getState().renderVersion===revision&&
    pe.getState().sourceAsset===source&&__f333Route(pe.getState())===route&&__F3564Master.getSnapshot().revision===masterRevision&&(!hybridIdentity||__F352Runtime.identity()===hybridIdentity);
  const rendered=await __f333RenderCurrent(state,{...options,flacBuffer:true});
  if(!valid())throw new DOMException("Listening mode changed during FLAC preparation.",'AbortError');
  if(!rendered.buffer)throw new Error("No audio buffer available for FLAC export.");
  const pcm=rendered.buffer;
  // Ordinary Forge WAV uses channel zero. Do not introduce an implicit stereo remix.
  const sourceBuffer=__f333StereoVoice(state,pcm)?pcm:{sampleRate:pcm.sampleRate,duration:pcm.duration,numberOfChannels:1,
    getChannelData:(channel)=>{if(channel!==0)throw new RangeError('Unbekannter Audiokanal');return pcm.getChannelData(0);}};
  const blob=await f319RecorderFlacEncode(sourceBuffer,null,options.onEncodeProgress);
  if(!valid())throw new DOMException("Listening mode changed during FLAC encoding.",'AbortError');
  return blob;
}
function __f333CurrentLabel(state) {
  const route=__f333Route(state);
  return route==='hybrid'?(__F352Session.getSnapshot().recipe.enabled&&__F352Session.getSnapshot().recipe.amount>0?'Donor + Cecilia':"Figure with Donor"):route==='donor'?"Figure with Donor":route==='reference'?"Original · Reference":route==='hearing'?
    (LGe.find(option=>option.machineId===state.carrierIntegralSelection.machineId)?.label??"Carrier Listening Mode"):
    route==='body'?"Audio Body":'Carrier';
}
function __f333PersistNow() {
  // Clear/Undo are committed immediately; ordinary paint stays debounced.
  if(__f333Persistence)void __f333Persistence.saveNow();
}

// Melodic Loop -> Forge: score only, one synchronous commit after workspace setup.
// No mixed-WAV analysis, audio intake, body lens or intermediate embodiment.
const __f334TransferEvent='xensonar:forge:carrier-transfer';
const __f334NoticeEvent='xensonar:forge:carrier-transfer-status';
let __f334TransferNotice='';

/* xen-lazy:lab */


/* xen-lazy:lab */


/* xen-lazy:canonical */


/* xen-lazy:lab */


/* xen-lazy:lab */


// F3_40: navigator click changes audio transport; never rerender an existing buffer.

/* xen-lazy:lab */


// F3_41 React interface; raw evidence and editable annotations use different lanes.
const __F341Spectrograms=new WeakMap();

/* xen-lazy:lab */

// Rendered Nodal audio follows the same workspace-ready transaction as score
// transfers. This prevents the Spectral workspace's mount/restore from clearing it.

/* xen-lazy:canonical */


/* xen-lazy:lab */



/* xen-lazy:lab */


/* xen-lazy:lab */


const __F343HeatCanvas=new WeakMap();

/* xen-lazy:lab */

// Stable per-selection PCM index. Full-resolution PCM stays in place for hearing/export.
const __F343WaveIndices=new WeakMap();

/* xen-lazy:lab */


/* xen-lazy:lab */


/* xen-lazy:lab */



/* xen-lazy:lab */


/* xen-lazy:lab */

function __f342ProjectState(state){const runtime=Vt.getSnapshot();return {version:1,config:__F341Workbench.export(),session:__F341Workbench.exportSession(),combinationDraft:__F351Combination.export(),source:runtime.source,selected:runtime.selected,registerPolicy:runtime.model?.bodyV3?.registerPolicy??'resonance',donorUseMode:state.carrierDonorV2?.donorUseMode??'timbre_projection'};}
async function __f342RestoreProject(value){
 Vt.stop();Vt.invalidateInput(null);__F341Workbench.restore(value?.config);__F341Workbench.restoreSession(value?.session);__F351Combination.restore(value?.combinationDraft??__F351Combination.defaults);
 const source=value?.source;pe.getState().setSpectralEmbodimentSourceAsset(source??null);
 if(!source)return;
 const ticket=Vt.beginExtraction(source);
 try{const prepared=await kE(source);if(!Vt.commitExtraction(ticket,source,prepared))return;Vt.setRegisterPolicy(value.registerPolicy??'resonance');pe.getState().setCarrierDonorV2DonorUseMode(value.donorUseMode??'timbre_projection');if(value.selected)Vt.selectDonor();}catch(e){Vt.failExtraction(ticket,e);}
}

/* xen-lazy:lab */


/* xen-lazy:lab */



// P9/M3: materialize the hybrid offline Worker source only on first run.
const __F352WorkerScript=()=>["// F3-50. Pure offline donor module. Original PCM is the source of every grain.\n// The carrier controls timing, gain and voiced pitch; it never masks the source spectrum.\n\n/* F3-55: original PCM loop bodies, bounded seam repair and independent pitch transport.\n * Offline only. No synthetic layer is added; transformed frames come from the body.\n * FFT peaks keep their neighbourhood phases (Laroche/Dolson 1999). */\n\n\n\n\n\n\n\n\n/* F3.53: donor-conditioned structural planning. No oscillator or PCM is returned\n * by this module. Carrier run boundaries and target curves remain unchanged.\n * Historical inspirations: Bert (continuity), Antonia (event role), Cecilia\n * (within-event energy movement), HX (measured native register). L1 transfers.\n */\n\n\nconst Kc=1024;\nconst v3e=199.834572;\nconst a_=[.0533437,.1280363,.7784623,.5341669,.0620899,.1369675,.2177907,.1049711,.0172901,.0059834,.0045256,.0039858,.0036316,.0035388,.003048,.0029331,.0024074,.0025647,.0024391,.0020912,.0018565,.0022511,.0020288,.0018316,.0016913,.0015208,.0014905,.0014174,.0015873,.0016795,.0014376,.0012828,9072e-7,8462e-7,8299e-7,8723e-7,8148e-7,175e-6,0,0];\nconst Vk=[[650,1400,2600],[450,1900,2800],[300,2300,3e3],[450,900,2500],[300,700,2400]];\nconst xd=Math.PI*2;\n",A3e.toString()+'\n',"\n",x3e.toString()+'\n',"\n",M3e.toString()+'\n',"\n/* Combination DSP keeps donor PCM intact; only the synthetic stem is spectrally shaped. */\n/* Combination DSP keeps donor PCM intact; only the synthetic stem is spectrally shaped. */\n","const __F352DSP=("+__f347CeciliaDSPFactory.toString()+")();\n","\n\n/* Cecilia's proven vocal oscillator, driven directly by the common carrier plan.\n * No second peak tracker, chord inference, autonomous vibrato or attack envelope.\n */\n/* Cecilia's proven vocal oscillator, driven directly by the common carrier plan.\n * No second peak tracker, chord inference, autonomous vibrato or attack envelope.\n */\n",__f352RenderCecilia.toString()+'\n',"\n\n","const __F352DSPOriginal=("+__f347OriginalCeciliaDSPFactory.toString()+")();\n","\n",__f352RenderCeciliaOriginal.toString()+'\n',"\n\nconst __f352Cancelled=new Set();let __f352WorkerQueue=Promise.resolve();\nself.onmessage=event=>{const message=event.data;if(message.cancel!=null){__f352Cancelled.add(message.cancel);return;}\n __f352WorkerQueue=__f352WorkerQueue.catch(()=>{}).then(async()=>{const {id,stage,job,input}=message;\n  const options={isCancelled:()=>__f352Cancelled.has(id),onProgress:progress=>postMessage({id,progress})};\n  try{if(options.isCancelled())throw new DOMException('Offline-Berechnung abgebrochen.','AbortError');let value;\n   if(stage==='synthetic')value=await (job.recipe?.variantRevision==='original'?__f352RenderCeciliaOriginal:__f352RenderCecilia)(job,{material:input.material},options);\n   else if(stage==='combine'){\n    // Use the same mask semantics as the main carrier owner; no function crosses threads.\n    const bands=job.support.plan.bands;job.support.activeAt=(at,length)=>bands.some(b=>b.gainCurve[Math.round(at/Math.max(1,length-1)*(b.gainCurve.length-1))]>0);\n    value=await (job.recipe?.variantRevision==='original'?__F352DSPOriginal:__F352DSP).combine(job,input.donor,input.synthetic,options);\n   }else if(stage==='spectrum')value=await __F352DSP.spectrum(input.pcm,job.sampleRate,options);\n   else throw Error('Unbekannter Offline-Auftrag.');\n   if(options.isCancelled())throw new DOMException('Offline-Berechnung abgebrochen.','AbortError');postMessage({id,value},value.pcm?.buffer?[value.pcm.buffer]:value.values?.buffer?[value.values.buffer]:[]);\n  }catch(e){postMessage({id,error:String(e.message??e),name:e.name});}finally{__f352Cancelled.delete(id);}\n });\n};\n"].join('');