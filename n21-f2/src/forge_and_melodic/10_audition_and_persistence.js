
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
function __f333CacheReadySubscribe(listener){__f333CacheReadyListeners.add(listener);return()=>__f333CacheReadyListeners.delete(listener)}
function __f333CacheReadySnapshot(){return __f333CacheReadyRevision}
function __f333CacheReadyNotify(){++__f333CacheReadyRevision;for(const listener of __f333CacheReadyListeners)listener()}

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
 for(let ch=0;ch<Math.max(1,buffer.numberOfChannels||1)&&!audible;ch++){
  const samples=buffer.getChannelData(ch);
  for(let at=0;at<samples.length;at+=16){if(Number.isFinite(samples[at])&&Math.abs(samples[at])>1e-8){audible=true;break;}}
 }
 __f333AudibleBuffers.set(buffer,audible);
 return audible;
}
const __f333AudibleSamples=new WeakMap();
function __f333AudibleSource(source){
 const samples=source?.monoSamples;
 if(!samples?.length)return false;
 if(__f333AudibleSamples.has(samples))return __f333AudibleSamples.get(samples);
 let audible=false;
 for(let at=0;at<samples.length;at+=16)if(Number.isFinite(samples[at])&&Math.abs(samples[at])>1e-8){audible=true;break;}
 __f333AudibleSamples.set(samples,audible);
 return audible;
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
    machine:request.machineId,selection:soundSettings(context.auditionSelection),lab:soundSettings(context.synthLab),hx:soundSettings(context.harmonicXplore),
    // The raw renderer is controlled by these *project* fields, not by Synth Lab.
    // Excluding them reused the wrong PCM after switching Additive/IFFT/Granular/Glyph.
    rawSynthesis:request.machineId==='raw-darkpsy-oscillator'?{
      mode:request.snapshot.synthMode,waveforms:request.snapshot.waveformMix}:null,
    fractaliaDonor:request.machineId==='fractalia-self-carrier'&&(request.snapshot.fractaliaInstrument??__Fractalia.snapshot()).donor?fractaliaDonorSnapshot().key:null,
    fractalia:request.machineId==='fractalia-self-carrier'?__Fractalia.semanticKey(request.snapshot.fractaliaInstrument??__Fractalia.snapshot()):null,
    emilia:request.machineId==='emilia-nodal-carrier'?__Emilia.semanticKey(request.snapshot.emiliaInstrument??__Emilia.snapshot()):null,
    duration:context.durationSec,pitch:context.previewPitchRatio,sampleRate:xt.getContext().sampleRate});
 }
function __f333CachedPreviewReady(state){
 const route=__f333Route(state);
 if(route==='hybrid')return __f333AudiblePCM(__F352Runtime.current()?.buffer);
 if(route==='reference')return __f333AudibleSource(state.sourceAsset);
 // A loaded Audio Body is already available without an asynchronous Forge render.
 if(route==='body')return __f333AudibleSource(state.sourceAsset);
 if((route!=='hearing'&&route!=='carrier')||__f333HearingCache.size===0)return false;
 try{
  const request=route==='hearing'?__f333HearingRequest(state):OB({
   projectName:state.materialExport.name,snapshot:state.createProjectSnapshot(),machineId:'raw-darkpsy-oscillator',
   valueSource:'right-override',selection:state.carrierIntegralSelection,synthLab:state.carrierIntegralSynthLab,
   harmonicXplore:state.carrierIntegralHarmonicXplore,previewBpm:state.materialExport.bpm,
   previewGain:1,previewPitchSemitones:__f3565PitchSemis(),loopPreview:true});
  return __f333AudiblePCM(__f333HearingCache.get(__f333HearingCacheKey(request,IB(request))));
 }catch{return false}
}
function __f333Stop() {
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
function __f333HearingRequest(state,progress) {
  const snapshot=state.createProjectSnapshot();
  return OB({projectName:state.materialExport.name,snapshot,machineId:state.carrierIntegralSelection.machineId,
    valueSource:'right-override',selection:state.carrierIntegralSelection,synthLab:state.carrierIntegralSynthLab,
    harmonicXplore:state.carrierIntegralHarmonicXplore,previewBpm:state.materialExport.bpm,
    previewGain:1,previewPitchSemitones:__f3565PitchSemis(),loopPreview:state.materialExport.loopPreview,onRenderProgress:progress});
}
async function __f333RenderHearing(request) {
  // A Fractalia material recipe uses the selected purple mask as its Donor.
  // Prepare it before constructing the exact PCM cache key, not after a cache lookup.
  if(request.machineId==='fractalia-self-carrier'&&(request.snapshot.fractaliaInstrument??__Fractalia.snapshot()).donor)
    await __f3562EnsureDonor();
  const context=IB(request),duration=context.durationSec;
  // Preview and export share this exact full-cycle buffer. Loop changes playback, not the render.
  context.previewDurationSec=duration;
  context.loopPreview=true;
  const key=__f333HearingCacheKey(request,context);
  const hit=__f333HearingCache.get(key);
  if(hit){__f433RememberHearing(key,hit);request.onRenderProgress?.(1);return {buffer:hit,cacheKey:key,cacheHit:true,context};}
  const epoch=typeof __f333Epoch==='number'?__f333Epoch:0,existing=__f447HearingJobs.get(key);
  // Play, automatic preview and export may join the same PCM calculation.
  // Subscribe each consumer, replay completed work, and detach when it settles.
  const listener=request.onRenderProgress;
  const listen=async job=>{
    try{
      if(listener){job.listeners.add(listener);listener(job.progress);}
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
    for(const listener of job.listeners)listener(next);
  };
  request={...request,onRenderProgress:report};
  // Install before synthesis starts, including synchronous initial callbacks.
  __f447HearingJobs.set(key,job);
  job.promise=Promise.resolve().then(async()=>{
  if(epoch!==(typeof __f333Epoch==='number'?__f333Epoch:0))throw new DOMException('Hearing render superseded','AbortError');
  // Reconstruct the raster only for a cache miss that owns the render.
  const grid=TR(request.snapshot);
  let buffer;
  const branch=xK(String(request.machineId));
  if(request.machineId==='fractalia-self-carrier') {
    buffer=await __Fractalia.renderCarrier({grid,durationSec:duration,previewPitchRatio:context.previewPitchRatio,instrument:request.snapshot.fractaliaInstrument??__Fractalia.snapshot(),onProgress:request.onRenderProgress});
  } else if(request.machineId==='emilia-nodal-carrier') {
    buffer=await __Emilia.renderCarrier({grid,durationSec:duration,previewPitchRatio:context.previewPitchRatio,
      instrument:request.snapshot.emiliaInstrument??__Emilia.snapshot(),onProgress:request.onRenderProgress});
  } else if(branch) {
    const carrier=DR({request,context,spectralData:grid}).rootFollowBuild;
    if(!carrier.summary.eligible) throw new Error(carrier.summary.reason||"The figure is empty.");
    const rendered=await vK({request,context,spectralData:grid,baseHz:AK(carrier.summary.baseHz*context.previewPitchRatio),...branch,check:()=>{if(epoch!==(typeof __f333Epoch==='number'?__f333Epoch:0))throw new DOMException('Hearing render superseded','AbortError')}});
    buffer=rendered.buffer;
  } else if(request.machineId==='raw-darkpsy-oscillator') {
    const epoch=__f333Epoch;
    buffer=await __PureDieter.render({grid:__f3565PitchGrid(grid,context.previewPitchRatio),mode:request.snapshot.synthMode,mix:request.snapshot.waveformMix,durationSec:duration,context:xt.getContext(),onProgress:request.onRenderProgress,check:()=>{if(epoch!==__f333Epoch)throw new DOMException('Pure Dieter cancelled','AbortError')}});
  } else if(request.machineId==='harmonic-xplore-direct-carrier'||request.machineId==='spektral-synthese-body') {
    const args={spectralData:grid,synthLab:LR(context.synthLab),harmonicXplore:context.harmonicXplore,
      durationSec:duration,previewDurationSec:duration,rootHz:JU(grid,context.previewPitchRatio),gain:context.previewGain,
      onProgress:request.onRenderProgress,cooperative:!!request.onRenderProgress};
    buffer=(request.machineId==='spektral-synthese-body'?await DB(args):await BR(args)).buffer;
  } else throw new Error("This listening mode is unavailable for the active figure.");
  if(epoch!==(typeof __f333Epoch==='number'?__f333Epoch:0))throw new DOMException('Hearing render superseded','AbortError');
  __f433RememberHearing(key,buffer);
  job.progress=1;for(const listener of job.listeners)listener(1);
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
  if(['emilia-nodal-carrier','fractalia-self-carrier'].includes(state.carrierIntegralSelection?.machineId))return 'hearing';
  if(Vt.getSnapshot().selected&&__f352Enabled()) return 'hybrid';
  if(Vt.getSnapshot().selected) return 'donor';
  if(state.sourceAsset&&state.sourcePreviewMode!=='forge') return 'reference';
  if(state.carrierIntegralSelection.source!=='default') return 'hearing';
  if(__f333WorkingSource(state)) return 'body';
  return 'carrier';
}
async function __f333RenderCurrentRaw(state,options={}) {
  const duration=Zp(state.materialExport.bars,state.materialExport.bpm,state.materialExport.beatsPerBar),route=__f333Route(state);
  if(route==='donor-pending')throw Error('Donor selected, but no donor mask is prepared. Extract a timbre or choose a saved donor first.');
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
  if(route==='hearing') return {...await __f333RenderHearing(__f333HearingRequest(state,options.onProgress)),duration,route};
  if(route==='body') {
    const buffer=options.audioMode==='body'?xt.renderFromMediatedAudioBodyToBuffer(
      state.activeMediatedBody??FR(state.spectralData,ys(),state.sourceAsset),{sourceAsset:state.sourceAsset,loopDurationSec:duration,renderMode:'body_contract_preview'}):
      xt.renderForge3BodyPreviewToBuffer(state.sourceAsset,state.spectralData,ys(),duration);
    return {buffer,duration,route};
  }
  const snapshot=state.createProjectSnapshot();
  return {...await __f333RenderHearing(OB({projectName:state.materialExport.name,snapshot,machineId:'raw-darkpsy-oscillator',
    valueSource:'right-override',selection:state.carrierIntegralSelection,synthLab:state.carrierIntegralSynthLab,
    harmonicXplore:state.carrierIntegralHarmonicXplore,previewBpm:state.materialExport.bpm,previewGain:1,
    previewPitchSemitones:__f3565PitchSemis(),loopPreview:true,onRenderProgress:options.onProgress})),duration,route};
}
async function __f333RenderCurrent(state,options={}) {
 const needsGain=__F3564Master.getSnapshot().volume!==100;
 const result=await __f333RenderCurrentRaw(state,needsGain?{...options,flacBuffer:true}:options);
 if(!needsGain||!result.buffer)return result;
 return {...result,buffer:__f3564ApplyGain(result.buffer),blob:undefined};
}
async function __f333PlayCurrent(state,options={}) {
  // Transport Play and "Listen to Figure with Donor" share the exact same lazy
  // mask resolution. Never require the user to press "Extract Timbre" first.
  const requestedEpoch=__f333Epoch;
  if(__F35611DonorIntent||(!['emilia-nodal-carrier','fractalia-self-carrier'].includes(state.carrierIntegralSelection?.machineId)&&Vt.getSnapshot().selected)){
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
  if(!__f333AudiblePCM(rendered.buffer))
   throw Error('The selected listening mode has no audible signal. Check the carrier figure and sound source.');
  const played=await xt.playBufferInternal(rendered.buffer,rendered.buffer.duration,options.fromPosition??0,
    p=>{if(current())options.onPosition?.(p)},()=>{if(current())options.onEnd?.()},
    {isCurrent:current,playbackRate:1,loopPreview:route!=='reference'&&!!state.materialExport.loopPreview,lifecycleMode:`forge-f333-${route}`,
      beatGuide:{...state.materialExport,loopDurationSec:rendered.duration}});
  return played&&current();
}
// Forge Navigator one-shots reuse the canonical IndexedDB sample registry.
// They deliberately do not change room, transport or active sample selection.
async function __f333SaveNavigatorSample(){
 const selected=__ForgeNavigatorSample.current();
 if(!selected)return false;
 const state=pe.getState(),revision=state.renderVersion,source=state.sourceAsset,route=__f333Route(state);
 if(__ForgeNavigatorSample.snapshot().busy)return false;
 __ForgeNavigatorSample.update({busy:true,message:'Rendering one-shot …'});
 try{
  // Render exactly the audible Forge listening route. Force an AudioBuffer even
  // on the legacy donor path, which otherwise exports a WAV blob directly.
  const render=await __f333RenderCurrent(state,{flacBuffer:true});
  if(__ForgeNavigatorSample.current()!==selected||pe.getState().renderVersion!==revision||pe.getState().sourceAsset!==source||__f333Route(pe.getState())!==route)
   throw new Error('Figure or listening mode changed during sample rendering.');
  const buffer=render.buffer;
  if(!buffer||!buffer.length||!buffer.sampleRate)throw new Error('No playable PCM available for this listening mode.');
  const start=Math.min(buffer.length-1,Math.floor(selected.start*buffer.length));
  const end=Math.min(buffer.length,Math.max(start+1,Math.ceil(selected.end*buffer.length)));
  const frames=end-start,seconds=frames/buffer.sampleRate;
  if(seconds<.025||seconds>5.001)throw new Error('One-shot selection must be between 25 ms and 5 seconds.');
  // Preserve mono/stereo exactly as the current listening route rendered it.
  // Never fold the right channel away or apply a new synthesis/pitch stage.
  const channels=[];
  let peak=0;
  const fade=Math.min(Math.floor(buffer.sampleRate*.003),Math.floor(frames/4));
  for(let ch=0;ch<Math.min(2,buffer.numberOfChannels||1);ch++){
   const pcm=new Float32Array(frames),sourcePcm=buffer.getChannelData(ch);
   for(let i=0;i<frames;i++){
    let value=sourcePcm[start+i]||0;
    if(fade){if(i<fade)value*=i/fade;if(i>frames-1-fade)value*=(frames-1-i)/fade;}
    pcm[i]=value;peak=Math.max(peak,Math.abs(value));
   }
   channels.push(pcm);
  }
  if(peak<1e-8)throw new Error('The selected sample is silent. Nothing was saved.');
  const title=(state.materialExport?.name||'Forge').trim().slice(0,74)||'Forge';
  const fileName=title+' · One Shot '+Math.round(selected.start*100)+'–'+Math.round(selected.end*100)+'%.wav';
  const wav=channels.length===1?xt.encodeSamplesToWAV(channels[0],buffer.sampleRate):gU(channels,buffer.sampleRate);
  const blob=wav instanceof Blob?wav:new Blob([wav],{type:'audio/wav'});
  const saved=await xS(fileName,blob);
  __ForgeNavigatorSample.update({message:'Sample saved · '+saved.name});
  return saved;
 }catch(error){__ForgeNavigatorSample.update({message:error?.message||'Sample could not be saved.'});return false;
 }finally{__ForgeNavigatorSample.update({busy:false});}
}
async function __f333ExportCurrent(state,options={}) {
  const epoch=__f333Epoch,revision=state.renderVersion,masterRevision=__F3564Master.getSnapshot().revision,hybridIdentity=__f333Route(state)==='hybrid'?__F352Runtime.identity(state):null;
  const result=await __f333RenderCurrent(state,options);
  if(epoch!==__f333Epoch||pe.getState().renderVersion!==revision||__F3564Master.getSnapshot().revision!==masterRevision||(hybridIdentity&&__F352Runtime.identity()!==hybridIdentity))throw new DOMException("The figure changed during export.",'AbortError');
  return result.blob??xt.encodeSamplesToWAV(result.buffer.getChannelData(0),result.buffer.sampleRate);
}
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
  const sourceBuffer={sampleRate:pcm.sampleRate,duration:pcm.duration,numberOfChannels:1,
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
function __f334Notice(message){
  __f334TransferNotice=message;
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent(__f334NoticeEvent,{detail:message}));
}
function __f334HasPendingCarrier(){const pending=DM.get('legacy');return pending?.carrier?.version==='melodic-carrier-v1'||pending?.audioPrepared?.version==='melodic-audio-v1';}
function __f334CreateTransfer(composer,material){
  const normalized=$n(composer);
  const active=normalized.activeTrackIds.filter(id=>Bo(normalized,id)?.enabled);
  const tracks=active.length?active:normalized.tracks.filter(track=>track.enabled).map(track=>track.id);
  if(!tracks.length)throw new Error("No active Melodic Loop track to send.");
  const carrier=__f333BuildCarrier(normalized,tracks);
  if(!carrier.notes.length)throw new Error("No audible Melodic Loop notes to send.");
  const bars=Math.max(1,Math.round(normalized.bars||1));
  const beatsPerBar=Math.max(1,Math.round(normalized.beatsPerBar||4));
  const bpm=Math.max(40,material.bpm||108);
  return {target:'legacy',transferVersion:3,origin:'melodic-loop',role:'loop',carrier,
    name:material.name||'Melodic Loop',bars,beatsPerBar,bpm,durationSec:bars*beatsPerBar*60/bpm,
    guideSegments:Math.max(1,Math.round(normalized.segmentCount||4)),
    guideMarkers:ni(normalized).filter(marker=>marker.kind==='guide'&&marker.repeatPerBar).map(marker=>marker.beat/beatsPerBar)};
}
function __f334CommitCarrier(transfer,{neutral=false,message="Melodic Loop transferred as carrier figure."}={}){const state=pe.getState(),target=state.spectralData,grid=new ph(target.width,target.height);
    // Validate and prepare everything before touching the current drawing.
    const carrier=__f333MaterializeCarrier(transfer.carrier,grid);
    const materialExport=IDe(state.materialExport,{name:transfer.name,role:'loop',bars:transfer.bars,
      bpm:transfer.bpm,beatsPerBar:transfer.beatsPerBar,guideSegments:transfer.guideSegments,guideMarkers:transfer.guideMarkers});
    const canvas=typeof document==='undefined'?null:document.querySelector('[data-forge-carrier-canvas="true"]');
    const bounds=canvas?.getBoundingClientRect();
    // The element's premount bounding height is not the painted canvas height.
    // Let the mounted drawing surface own vertical fit; keep the request across resizes.
    const viewPort={offsetX:0,offsetY:0,zoomX:bounds?.width>0?bounds.width/target.width:1,
      zoomY:1,autoFitY:true};
    state.pushUndo();if(neutral){Vt.selectCarrier();__F35611DonorIntent=false;}++__f333RestoreBarrier;__f333Stop();ys().clear();
    target.restoreData(grid.cloneData());target.melodicCarrier=carrier;
    pe.setState(current=>({...__f333Idle(),melodicCarrier:carrier,lastCommitDomain:'carrier',
      sourceAsset:null,sourceAssetContext:'none',sourcePreviewMode:'forge',forge3EditTarget:'workbench',
      spectralEmbodimentSourceAsset:null,embodimentField:null,embodimentStatus:'missing',
      embodimentMessage:message,
      stampData:null,stampPhase:'idle',stampSelStart:null,lineStart:null,
      carrierDonorV2:{...current.carrierDonorV2,skeleton:null,summary:null,continuityGraph:null,
        bindingPreview:[],overlayVisible:false,continuityOverlayVisible:false,bindingOverlayVisible:false},
      carrierIntegralSelection:{...current.carrierIntegralSelection,source:"user"},
      materialExport,viewPort,showGrainLayer:false,renderVersion:current.renderVersion+1,audioBufferDirty:true}));return carrier;}
function __f334ReceiveCarrier(){
  const transfer=DM.get('legacy');
  if(!transfer)return false;
  try{
    if(transfer.audioPrepared)return __mlReceiveRenderedAudio(transfer);
    if(transfer.origin!=='melodic-loop'||!transfer.carrier)throw new Error("This transfer contains no Melodic carrier figure. Please send again from Melodic Loop.");
    const carrier=__f334CommitCarrier(transfer);
    // Acknowledge only the exact successfully committed item.
    if(DM.get('legacy')===transfer)DM.delete('legacy');
    __f333PersistNow();
    __f334Notice("Pitch figure transferred · "+carrier.notes.length+' Noten · '+transfer.bars+" bars · carrier without body lens");
    requestAnimationFrame(()=>document.querySelector('#spectralforge-station-draw')?.scrollIntoView({block:'start',behavior:'auto'}));
    return true;
  }catch(error){
    __f334Notice(error instanceof Error?error.message:"Melodic carrier transfer failed.");
    return false;
  }
}

// F3_40: navigator click changes audio transport; never rerender an existing buffer.
function __f340SeekFromNavigator(position) {
  if(!Number.isFinite(position))return false;
  const at=Math.max(0,Math.min(1,position));
  const state=pe.getState();
  state.setPlayheadPosition(at);
  state.setShowPlayheadMarker(true);
  // Seek the active Forge transport, regardless of its listening mode.
  // The session owns the actual audio buffer; moving the marker alone is not a seek.
  if(state.isPlaying&&xt.isPlaying&&xt.__f340PreviewSession?.buffer){
    void xt.seekNormalized(at).catch(error=>console.warn('Spectral Forge Navigator Seek fehlgeschlagen',error));
  }
  return true;
}

// F3_41 React interface; raw evidence and editable annotations use different lanes.
const __F341Spectrograms=new WeakMap();
async function __f341Spectrogram(samples,sampleRate,isCancelled=()=>false){
 const width=Math.max(64,Math.min(360,Math.ceil(samples.length/sampleRate*55))),height=150,size=2048,values=new Float32Array(width*height),input=new Float32Array(size);
 let maximum=0;
 for(let x=0;x<width;x++){
  if(isCancelled())return null;
  const center=Math.round((x+.5)/width*samples.length);
  for(let i=0;i<size;i++)input[i]=(samples[center+i-size/2]??0)*(.5-.5*Math.cos(2*Math.PI*i/(size-1)));
  const spectrum=ah(input);
  for(let y=0;y<height;y++){
   const high=35*(sampleRate*.46/35)**(1-y/height),low=35*(sampleRate*.46/35)**(1-(y+1)/height);
   const a=Math.max(1,Math.floor(low/sampleRate*size)),b=Math.min(spectrum.length-1,Math.max(a,Math.ceil(high/sampleRate*size)));
   let power=0;for(let k=a;k<=b;k++)power=Math.max(power,spectrum[k]);values[y*width+x]=power;maximum=Math.max(maximum,power);
  }
  if(x%24===23)await new Promise(resolve=>setTimeout(resolve,0));
 }
 return {width,height,values,maximum};
}
// Rendered Nodal audio follows the same workspace-ready transaction as score
// transfers. This prevents the Spectral workspace's mount/restore from clearing it.
async function __mlSendRenderedAudioToSpectral(request) {
  const rendered = await VR(request);
  const raw = await Cg(new File([rendered.blob], rendered.fileName, {type: rendered.blob.type || 'audio/wav'}));
  const source = sg(raw, {startSec: 0});
  const target = pe.getState().spectralData, grid = new ph(target.width, target.height);
  await PB(source, grid, {readMode: 'hybrid'}, progress => request.setStatus('Preparing Spectral Forge audio ' + Math.round(progress * 65) + '%'));
  const asset = await av(source, progress => request.setStatus('Preparing Spectral Forge audio ' + Math.round(65 + progress * 35) + '%'));
  request.stopAllForge2Preview('Transferring rendered composition to Spectral Forge…');
  QLe({target: 'legacy', origin: 'melodic-loop', name: request.materialExport.name,
    bars: rendered.bars, beatsPerBar: rendered.beatsPerBar, bpm: rendered.bpm,
    guideSegments: rendered.guideSegments, guideMarkers: rendered.guideMarkers,
    audioPrepared: {version: 'melodic-audio-v1', asset, data: grid.cloneData(), width: grid.width, height: grid.height}});
  request.onRequestModeChange?.('experimental');
  request.setStatus('Rendered composition prepared for Spectral Forge.');
}
function __mlReceiveRenderedAudio(transfer) {
  const state = pe.getState(), prepared = transfer.audioPrepared, target = state.spectralData;
  if (transfer.origin !== 'melodic-loop' || prepared.version !== 'melodic-audio-v1' ||
      prepared.width !== target.width || prepared.height !== target.height ||
      !(prepared.data instanceof Float32Array) || prepared.data.length !== target.width * target.height * 2 || !prepared.asset)
    throw new Error('Invalid prepared Melodic audio transfer. Please send again.');
  const materialExport = IDe(state.materialExport, {name: transfer.name, role: 'loop', bars: transfer.bars,
    beatsPerBar: transfer.beatsPerBar, bpm: transfer.bpm, guideSegments: transfer.guideSegments, guideMarkers: transfer.guideMarkers});
  state.pushUndo(); __f333Stop(); ys().clear(); xt.invalidateBuffer();
  target.restoreData(prepared.data); delete target.melodicCarrier;
  state.setSourceAsset(prepared.asset, 'forge3_main');
  pe.setState(current => ({...__f333Idle(), melodicCarrier: null, lastCommitDomain: 'audio',
    materialExport, stampData: null, stampPhase: 'idle', stampSelStart: null, lineStart: null,
    renderVersion: current.renderVersion + 1, audioBufferDirty: true}));
  if (DM.get('legacy') === transfer) DM.delete('legacy');
  __f333PersistNow();
  __f334Notice('Rendered composition received · ' + transfer.name);
  return true;
}
