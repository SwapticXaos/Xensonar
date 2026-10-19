
function __mlCacheDescriptor(e,t={}){
 const composer=e.composer;
 const {zoom,zoomY,scrollX,scrollY,selectedTrackId,selectedNoteId,timeGuideMarkers,segmentCount,...musical}=composer;
 const {notes,...shared}=musical;
 const stableNotes=notes.map(note=>JSON.parse(JSON.stringify(note)));
 const trackIds=[...(e.trackIds||[])].sort();
 const meta=JSON.stringify({shared,bpm:e.bpm,bars:e.bars,trackIds,sampleEpoch:__mlSampleEpoch,
  customDrumPattern:e.customDrumPattern,drumPattern:e.drumPattern,drumKit:e.drumKit,
  drumLaneSettings:e.drumLaneSettings,drumLaneKitOverrides:e.drumLaneKitOverrides,drumLevel:e.drumLevel,
  noteId:e.noteId??null,sampleRate:t.sampleRate??44100,tailSec:t.tailSec??.18});
 const noteMap=new Map(stableNotes.filter(note=>e.noteId?note.id===e.noteId:trackIds.includes(note.trackId)).map(note=>[String(note.id),JSON.stringify(note)]));
 return {meta,noteMap,notes:stableNotes,key:meta+"|"+JSON.stringify([...noteMap].sort(([a],[b])=>a.localeCompare(b)))};
}
function __mlNoteSpan(note,composer,bpm){
 // Must use the same time coordinates as N$: Ax and F$ in units of seconds per step.
 const secStep=lD({composer,bpm})/iD(composer);
 const start=Ax(composer,note)*secStep,duration=Math.max(.04,F$(composer,note)*secStep);
 const release=Math.max(.12,duration*.8)+.12; // conservative tail bound for any supported preset release
 return {start,end:start+duration+release};
}
function __mlPartialSpan(previous,next,e,priorBuffer){
 if(nodalHasMelodicNotes(e) || (typeof hasEntrophonMelodicNotes==="function"&&hasEntrophonMelodicNotes(e)) || previous.meta!==next.meta || e.noteId || c9e(e) || priorBuffer?.sampleRate!==44100)return null;
 const changed=new Set();
 for(const [id,s] of previous.noteMap)if(next.noteMap.get(id)!==s)changed.add(id);
 for(const [id,s] of next.noteMap)if(previous.noteMap.get(id)!==s)changed.add(id);
 if(!changed.size)return null;
 const oldNotes=previous.notes,newNotes=next.notes;
 const oldById=new Map(oldNotes.map(n=>[String(n.id),n])),newById=new Map(newNotes.map(n=>[String(n.id),n]));
 let start=Infinity,end=0;
 for(const id of changed)for(const note of [oldById.get(id),newById.get(id)])if(note){const span=__mlNoteSpan(note,e.composer,e.bpm);start=Math.min(start,span.start);end=Math.max(end,span.end)}
 if(!Number.isFinite(start))return null;
 // Include all overlapping voices, preserving attacks rather than starting their envelopes mid-note.
 // Bounds are constant for this request. Prepare them once, preserving the
 // old/new traversal order and the same overlap-growth/convergence policy.
 const selectedTracks=new Set(e.trackIds),candidates=[];
 for(const note of [...oldNotes,...newNotes]){
  if(e.noteId?note.id!==e.noteId:!selectedTracks.has(note.trackId))continue;
  candidates.push(__mlNoteSpan(note,e.composer,e.bpm));
 }
 let updated=true,iterations=0;
 while(updated&&iterations++<256){updated=false;
  for(const span of candidates){
   if(span.start<end+.025 && span.end>start-.025){
    const ns=Math.max(0,Math.min(start,span.start)),ne=Math.max(end,span.end);
    if(ns<start-1e-6||ne>end+1e-6)start=ns,end=ne,updated=true;
   }
  }
 }
 const duration=E$(e),lo=Math.max(0,start),hi=Math.min(duration+.02,end+.04);
 if(hi<=lo||hi-lo>duration*.7)return null;
 return {startSec:lo,endSec:hi};
}
function __mlSpliceBuffer(oldBuffer,fragment,region){
 const sr=oldBuffer.sampleRate,begin=Math.max(0,Math.round(region.startSec*sr)),end=Math.min(oldBuffer.length,begin+fragment.length);
 const out=new AudioBuffer({numberOfChannels:oldBuffer.numberOfChannels,length:oldBuffer.length,sampleRate:sr});
 const fade=Math.min(Math.round(sr*.009),Math.floor((end-begin)/4));
 for(let ch=0;ch<oldBuffer.numberOfChannels;ch++){
  const dest=out.getChannelData(ch),old=oldBuffer.getChannelData(ch),patch=fragment.getChannelData(Math.min(ch,fragment.numberOfChannels-1));
  dest.set(old);for(let i=begin;i<end;i++){
   const k=i-begin,alpha=Math.min(1,fade>0?k/fade:1,fade>0?(end-1-i)/fade:1);
   dest[i]=old[i]*(1-alpha)+patch[k]*alpha;
  }
 }
 return out;
}
async function __mlRenderCached(e,opts={}){
 const desc=__mlCacheDescriptor(e,opts),optionsKey=JSON.stringify(opts),old=__mlCacheEntries.find(item=>item.optionsKey===optionsKey)??null;
 const match=__mlCacheEntries.find(item=>item.descriptor.key===desc.key);
 if(match)return match.buffer;
 if(__mlInFlight?.key===desc.key)return __mlInFlight.promise;
 const region=old?.descriptor?__mlPartialSpan(old.descriptor,desc,e,old.buffer):null;
 // Without a compatible unchanged background, fall back to the complete offline mix.
 const work=(async()=>{
  const partial=region?await z$(e,{...opts,regionSec:region}):null;
  const buffer=partial?__mlSpliceBuffer(old.buffer,partial,region):await z$(e,opts);
  if(__mlInFlight?.key===desc.key && buffer.length*buffer.numberOfChannels*4<90*1024*1024){
    __mlPrepared={descriptor:desc,buffer,optionsKey};
    __mlCacheEntries=__mlCacheEntries.filter(item=>item.optionsKey!==optionsKey).concat(__mlPrepared).slice(-3);
    while(__mlCacheEntries.length>1&&__mlCacheEntries.reduce((bytes,item)=>bytes+item.buffer.length*item.buffer.numberOfChannels*4,0)>90*1024*1024)
      __mlCacheEntries.shift();
  }
  return buffer;
 })();
 __mlInFlight={key:desc.key,promise:work};
 try{return await work}finally{if(__mlInFlight?.key===desc.key)__mlInFlight=null}
}


// F3.25: session-local synchronized independent track stems for live solo audition.
// Does not mutate notes, does not touch Forge / instrument realtime hotpath.
let __mlSoloTrackId=null;
const __mlStemCache=new Map();
let __mlStemCacheBytes=0;
const __mlStemCacheLimit=112*1024*1024;
function __mlStemDescriptor(e,trackId){
 const normalized=trackId==="__drums__"?{...e.composer,notes:[],tracks:[],activeTrackIds:[]}:{...e.composer,tracks:e.composer.tracks.map(t=>({...t,enabled:true,volume:.8,pan:0})),
  activeTrackIds:e.composer.tracks.map(t=>t.id)};
 const request={...e,composer:normalized,trackIds:trackId==="__drums__"?[]:[trackId],noteId:null};
 if(trackId==="__drums__"){
  // Render precisely the drum source's own cycle, not the larger Melodic timeline.
  const drumBars=u9e(e);request.bars=drumBars;request.composer={...normalized,bars:drumBars};
 }
 const spec={tailSec:.02,excludeDrums:trackId!=="__drums__",drumOnly:trackId==="__drums__"};
 if(trackId==="__drums__")return {request,spec,key:trackId+"|"+JSON.stringify({
  duration:E$(request),barDuration:sD(request),sampleRate:44100,tailSec:.02,
  customDrumPattern:request.customDrumPattern,drumPattern:request.drumPattern,drumKit:request.drumKit,
  drumSegmentsPerBar:request.drumSegmentsPerBar,drumSegmentMarkers:request.drumSegmentMarkers,
  drumLevel:request.drumLevel,drumStyle:request.drumStyle,drumLaneKitOverrides:request.drumLaneKitOverrides,drumLaneSettings:request.drumLaneSettings})};
 // Cache only this stem's musical inputs; editing another instrument keeps it reusable.
 const ownNotes=request.composer.notes.filter(note=>note.trackId===trackId),ownTrack=request.composer.tracks.find(track=>track.id===trackId);
 const referenced=new Set([ownTrack?.instrumentPreset,...ownNotes.map(note=>note.instrumentPresetOverride)].filter(Boolean));
 const localComposer={...request.composer,tracks:ownTrack?[ownTrack]:[],notes:ownNotes,activeTrackIds:[trackId]};
 for(const bank of ['nodalInstruments','entrophonInstruments'])if(localComposer[bank])localComposer[bank]=Object.fromEntries(Object.entries(localComposer[bank]).filter(([id])=>referenced.has(id)));
 const descriptor=__mlCacheDescriptor({...request,composer:localComposer},spec);
 return {request,spec,key:trackId+"|"+E$(request)+"|"+descriptor.key};
}
/* One active drum-stem render and one latest request; transport owns its timing snapshot. */
const __mlStemInFlight=new Map();
let __mlDrumRefreshRunning=null,__mlDrumRefreshPending=null;
function __mlSnapshotDrumRequest(e,playing){
 const clock=playing.drumRenderRequest||e;
 const result={...clock,composer:{...clock.composer,notes:[],tracks:[],activeTrackIds:[]}};
 for(const key of ["customDrumPattern","drumPattern","drumKit","drumLaneSettings","drumLaneKitOverrides","drumLevel","drumSegmentsPerBar","drumSegmentMarkers","drumCycleBars"])
  result[key]=e[key];
 return JSON.parse(JSON.stringify(result));
}
async function __mlGetStem(e,trackId){
 const {request,spec,key}=__mlStemDescriptor(e,trackId);
 const found=__mlStemCache.get(key);
 if(found){__mlStemCache.delete(key);__mlStemCache.set(key,found);return found}
 const pending=__mlStemInFlight.get(key);
 if(pending?.preparationSignal?.aborted)__mlStemInFlight.delete(key);
 else if(pending)return pending;
 const promise=(async()=>{
  let buffer;
  if(trackId!=="__drums__"&&!e.composer.notes.some(note=>note.trackId===trackId))
   buffer=new AudioBuffer({numberOfChannels:1,sampleRate:44100,length:Math.ceil((E$(e)+.02)*44100)});
  else{if(trackId==="__drums__")__drumLiveBuildHold++;
   try{buffer=await z$(request,spec)}finally{if(trackId==="__drums__")__drumLiveBuildHold--}}
  const bytes=buffer.length*buffer.numberOfChannels*4;
  if(bytes<=__mlStemCacheLimit){
   const previous=__mlStemCache.get(key);if(previous)__mlStemCacheBytes-=previous.length*previous.numberOfChannels*4;
   __mlStemCache.set(key,buffer);__mlStemCacheBytes+=bytes;
   while(__mlStemCacheBytes>__mlStemCacheLimit&&__mlStemCache.size>1){
    const first=__mlStemCache.keys().next().value,evicted=__mlStemCache.get(first);
    __mlStemCache.delete(first);__mlStemCacheBytes-=evicted.length*evicted.numberOfChannels*4;
   }
  }
  return buffer;
 })();
 promise.preparationSignal=e.signal;
 __mlStemInFlight.set(key,promise);
 try{return await promise}finally{if(__mlStemInFlight.get(key)===promise)__mlStemInFlight.delete(key)}
}

let __mlDrumsAudible=false,__mlDrumSwitchGeneration=0;
// Separate instrument faders from immutable PCM stem preparation. When the user
// moves a slider while playing, only the already-existing WebAudio GainNode ramps.
function __mlTrackFaderValue(playing,trackId){
 const raw=playing?.liveTrackVolumes?.get(trackId);
 const level=Number.isFinite(raw)?raw:.8;
 return Math.max(0,Math.min(1,level))/.8;
}
function __mlApplyLiveSolo(id,enabledIds=null){
 const playing=b9e();
 if(!playing?.stemGains)return false;
 const enabled=enabledIds?new Set(enabledIds):playing.liveEnabledIds;
 if(enabledIds)playing.liveEnabledIds=enabled;
 const now=playing.ctx.currentTime;
 for(const [trackId,gain] of playing.stemGains){
  const isActive=id!==null?trackId===id:(trackId==="__drums__"?(playing.drumMonitorExplicit||__mlDrumsAudible):enabled.has(trackId));
  const target=isActive?(trackId==="__drums__"?1:__mlTrackFaderValue(playing,trackId)):0;
  if(typeof gain.gain.cancelAndHoldAtTime==="function")gain.gain.cancelAndHoldAtTime(now);
  else{
   const current=Math.max(0,Math.min(1.25,gain.gain.value));
   gain.gain.cancelScheduledValues(now);
   gain.gain.setValueAtTime(current,now);
  }
  gain.gain.linearRampToValueAtTime(target,now+.014);
 }
 return true;
}
function __mlSetLiveTrackVolume(trackId,value){
 const playing=b9e();
 if(!playing?.stemGains?.has(trackId))return false;
 if(!(typeof value==="number"&&Number.isFinite(value)))return false;
 playing.liveTrackVolumes.set(trackId,Math.max(0,Math.min(1,value)));
 // Include the current solo state; avoid recalculating any stem buffer.
 return __mlApplyLiveSolo(__mlSoloTrackId);
}

function __mlFadeGain(gain,target,now,seconds=.018){
 if(!gain)return;
 if(typeof gain.gain.cancelAndHoldAtTime==="function")gain.gain.cancelAndHoldAtTime(now);
 else{const current=gain.gain.value;gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(current,now)}
 gain.gain.linearRampToValueAtTime(target,now+seconds);
}
function __mlToggleDrums(enabled){
 __mlDrumsAudible=!!enabled;
 const playing=b9e();if(!playing?.stemGains)return false;
 __mlFadeGain(playing.stemGains.get("__drums__"),
  (playing.drumMonitorExplicit||__mlDrumsAudible)&&__mlSoloTrackId===null?1:0,playing.ctx.currentTime);
 return true;
}
function __mlRefreshLiveDrumStem(e){
 const playing=b9e();if(!playing?.stemGains||!playing.stemBuffers.has("__drums__"))return Promise.resolve(false);
 const request=__mlSnapshotDrumRequest(e,playing),key=__mlStemDescriptor(request,"__drums__").key;
 if(__mlDrumRefreshPending?.playing===playing&&__mlDrumRefreshPending.key===key)return __mlDrumRefreshPending.promise;
 if(__mlDrumRefreshRunning?.playing===playing&&__mlDrumRefreshRunning.key===key&&__mlDrumRefreshRunning.generation===__mlDrumSwitchGeneration)return __mlDrumRefreshRunning.promise;
 const generation=++__mlDrumSwitchGeneration;
 if(__mlDrumRefreshPending){__mlDrumRefreshPending.resolve(false);__mlDrumRefreshPending=null}
 if(key===playing.drumDescriptorKey)return Promise.resolve(true);
 let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});
 __mlDrumRefreshPending={playing,request,key,generation,promise,resolve,reject};
 __mlPumpDrumRefresh();return promise;
}
async function __mlPumpDrumRefresh(){
 if(__mlDrumRefreshRunning||!__mlDrumRefreshPending)return;
 const job=__mlDrumRefreshPending;__mlDrumRefreshPending=null;__mlDrumRefreshRunning=job;
 const {playing,request,key,generation}=job;
 const current=()=>generation===__mlDrumSwitchGeneration&&b9e()===playing&&uP(playing.token);
 try{
  if(!current()){job.resolve(false);return}
  const buffer=await __mlGetStem(request,"__drums__");
  if(!current()){job.resolve(false);return}
  const ctx=playing.ctx,now=ctx.currentTime,start=Math.max(now+.024,playing.drumSwapUntilSec||0);
  const duration=Math.min(buffer.duration,__mlStemPeriodSec(playing,"__drums__",request));
  const pos=((playing.loopOffsetSec+start-playing.startTime)%duration+duration)%duration;
  const nextSource=ctx.createBufferSource(),nextGain=ctx.createGain();
  nextSource.buffer=buffer;nextSource.loop=true;nextSource.loopStart=0;nextSource.loopEnd=duration;
  nextSource.connect(nextGain);nextGain.connect(__f48GetDrumRack(ctx,playing.master).input);
  nextGain.gain.setValueAtTime(0,start);
  const level=(playing.drumMonitorExplicit||__mlDrumsAudible)&&__mlSoloTrackId===null?1:0;
  nextGain.gain.linearRampToValueAtTime(level,start+.03);
  nextSource.start(start,pos);Mx(nextSource);Mx(nextGain);
  const oldGain=playing.stemGains.get("__drums__"),oldSource=playing.stemSourceById?.get("__drums__");
  __mlFadeGain(oldGain,0,start,.03);
  if(oldSource){oldSource.addEventListener("ended",()=>{
    try{oldSource.disconnect()}catch{}try{oldGain?.disconnect()}catch{}h9e(oldSource);h9e(oldGain);
    playing.stemSources=playing.stemSources.filter(source=>source!==oldSource)
   },{once:true});try{oldSource.stop(start+.045)}catch{}}
  playing.stemSources=playing.stemSources.concat(nextSource);
  playing.stemSourceById?.set("__drums__",nextSource);
  playing.stemGains.set("__drums__",nextGain);playing.stemBuffers.set("__drums__",buffer);
  playing.drumSource=nextSource;playing.drumRenderRequest=request;playing.drumDescriptorKey=key;playing.drumSwapUntilSec=start+.045;
  job.resolve(true);
 }catch(error){if(current())job.reject(error);else job.resolve(false)}
 finally{__mlDrumRefreshRunning=null;__mlPumpDrumRefresh()}
}

function __mlStemPeriodSec(playing,trackId,drumRequest=playing.drumRenderRequest){
 if(trackId==="__drums__")return Math.max(.05,cD(drumRequest)||playing.totalDurationSec);
 return Math.max(.05,playing.melodicDurationSec||playing.totalDurationSec);
}
function __mlLaunchStemSources(playing,offset,when){
 const starts=[];playing.stemSourceById=new Map();
 for(const [trackId,buffer] of playing.stemBuffers){
  const source=playing.ctx.createBufferSource();
  const period=Math.min(buffer.duration,__mlStemPeriodSec(playing,trackId));
  // The shared audio clock stays put; each source wraps on its OWN musical cycle.
  const localOffset=((offset%period)+period)%period;
  source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=period;
  source.connect(playing.trackPanners?.get(trackId)??playing.stemGains.get(trackId));
  source.start(when,localOffset);
  Mx(source);starts.push(source);playing.stemSourceById.set(trackId,source);
 }
 playing.stemSources=starts;playing.drumSource=playing.stemSourceById?.get("__drums__")||null;
 return starts;
}

let cP=null,pS=[],xx=null,JM=0,iv=null,__mlPhase="idle";const __mlPhaseListeners=new Set;function __mlSetPhase(e){if(__mlPhase===e)return;__mlPhase=e;__mlPhaseListeners.forEach(t=>t(e))}function __mlSubscribe(e){__mlPhaseListeners.add(e);e(__mlPhase);return()=>__mlPhaseListeners.delete(e)}function p9e(){return cP||(cP=new AudioContext({sampleRate:44100})),cP}function Mx(e){pS.push(e)}function h9e(e){pS=pS.filter(t=>t!==e)}function f9e(){const nodes=pS;pS=[];const master=nodes.find(node=>node.__f49PreviewMaster);__f49FadeAndRelease(master,.012,()=>{for(const node of nodes){try{if(typeof node.stop==='function')node.stop()}catch{}try{node.disconnect()}catch{}}})}function g9e(){return JM+=1,JM}function uP(e){return e===JM}function b9e(){return iv}function y9e(e){iv=e}function yA(e){xx=e}function L$(e,t,n,r){const a=e.createBufferSource();return a.buffer=t.renderedBuffer,a.loop=!0,a.loopStart=0,a.loopEnd=Math.max(.05,t.totalDurationSec),a.connect(t.master),a.start(r,n),Mx(a),a}function S9e(){return iv!==null}function v9e(e){const t=iv;if(!t)return!1;if(t.nodalTransport)return t.nodalTransport.seek(e);const n=Math.max(1,t.totalSteps),r=(e%n+n)%n,a=t.totalDurationSec>0?r/n*t.totalDurationSec:0,o=t.ctx.currentTime,s=o+.012;(t.stemSources??[t.source]).filter(Boolean).forEach(source=>{try{source.stop(o)}catch{}try{source.disconnect()}catch{}h9e(source)});t.master.gain.cancelScheduledValues(o);t.master.gain.setValueAtTime(Math.max(1e-4,t.master.gain.value||.82),o);t.master.gain.linearRampToValueAtTime(1e-4,o+.005);t.master.gain.linearRampToValueAtTime(.82,s+.012);if(t.stemBuffers)__mlLaunchStemSources(t,a,s);else t.source=L$(t.ctx,t,a,s);return t.startTime=s,t.loopOffsetSec=a,t.playheadCallback?.(r),t.globalPlayheadCallback?.(Math.max(0,Math.min(1,a/Math.max(.001,t.totalDurationSec)))),!0}function hS(){if(typeof cancelEntrophonMelodicPreparation==="function")cancelEntrophonMelodicPreparation();iv?.nodalTransport?.stop();JM+=1,iv=null,xx!=null&&typeof cancelAnimationFrame<"u"&&(cancelAnimationFrame(xx),xx=null),f9e(),__mlSetPhase("idle")}function xz(e){return e.currentTime}const A9e={kick:"kick",snare:"snare",hatClosed:"hat_closed",hatOpen:"hat_open",clap:"clap",perc:"perc"};function ZM(e,t,n){return Math.max(t,Math.min(n,e))}function ew(e,t){const n=e.length;if(!n)return 0;const a=ZM(t,0,1)*Math.max(0,n-1),o=Math.floor(a),i=Math.min(n-1,o+1),s=a-o,l=Number(e[o]??0),c=Number(e[i]??l);return l+(c-l)*s}function B$(e,t=96){const n=e.map(a=>({field:a,curve:gc(a,Math.max(32,t)).resolved})),r=new Float32Array(Math.max(32,t));for(let a=0;a<r.length;a+=1){const o=r.length<=1?0:a/Math.max(1,r.length-1);let i=0;n.forEach(({curve:s})=>{i+=vS(ew(s,o))}),r[a]=i}return r}function D$(e){const{param:t,noteStart:n,noteEnd:r,oscStart:a,oscStop:o,baseFrequency:i,semitoneCurve:s}=e,l=Math.max(a+.01,Math.min(r,o)),c=l-a;if(c<=.01||s.length<2){t.setValueAtTime(i,a);return}const d=Math.max(1e-4,r-n),p=ZM((a-n)/d,0,1),f=ZM((l-n)/d,p,1),b=Math.max(24,Math.ceil(c*180)),g=new Float32Array(b);for(let y=0;y<b;y+=1){const x=b<=1?0:y/Math.max(1,b-1),A=p+(f-p)*x,M=ew(s,A);g[y]=Math.max(20,Math.min(12e3,i*Math.pow(2,M/12)))}t.setValueAtTime(g[0]??i,a),t.setValueCurveAtTime(g,a,c),t.setValueAtTime(g[g.length-1]??i,l)}function x9e(e){const t=e.carrierIntegralTimbre;if(!t||t.schemaVersion!=="carrier-integral-timbre-v1"||!Array.isArray(t.oscillators)||t.oscillators.length===0)return null;const n=t.oscillators.map(r=>({type:r.type==="sine"||r.type==="triangle"||r.type==="sawtooth"||r.type==="square"?r.type:"sine",gain:Math.max(0,Math.min(1.2,Number.isFinite(r.gain??NaN)?Number(r.gain):0)),freqMul:Math.max(.125,Math.min(8,Number.isFinite(r.freqMul??NaN)?Number(r.freqMul):1)),detune:Math.max(-1200,Math.min(1200,Number.isFinite(r.detune??NaN)?Number(r.detune):0))})).filter(r=>r.gain>1e-4);return n.length===0?null:{oscillators:n,filterType:t.filterType??"lowpass",filterFrequency:Math.max(80,Math.min(12e3,Number.isFinite(t.filterFrequency??NaN)?Number(t.filterFrequency):1800)),filterQ:Math.max(.05,Math.min(20,Number.isFinite(t.filterQ??NaN)?Number(t.filterQ):.7)),attackScale:Math.max(.002,Math.min(.8,Number.isFinite(t.attackScale??NaN)?Number(t.attackScale):.04)),releaseScale:Math.max(.01,Math.min(1.8,Number.isFinite(t.releaseScale??NaN)?Number(t.releaseScale):.22)),transientGain:Math.max(0,Math.min(1.5,Number.isFinite(t.transientGain??NaN)?Number(t.transientGain):.08)),panSpread:Math.max(0,Math.min(1,Number.isFinite(t.panSpread??NaN)?Number(t.panSpread):.12))}}function M9e(e){const{clipPitchCurve:t,voiceLocalField:n,voiceStart:r,voiceDur:a,noteStart:o,nominalDur:i}=e,s=n?$p(Zr(n),"pitch-elastic"):null,l=s&&s.enabled&&!s.bypassed?B$([s],128):null;if((!t||t.length<2)&&(!l||l.length<2))return null;const c=128,d=new Float32Array(c);for(let p=0;p<c;p+=1){const f=p/Math.max(1,c-1),b=ZM((r-o+a*f)/Math.max(1e-4,i),0,1),g=t&&t.length>1?ew(t,b):0,y=l&&l.length>1?ew(l,f):0;d[p]=g+y}return d}function w9e(e){const{ctx:t,destination:n,note:r,preset:a,baseFrequency:o,noteStart:i,nominalDur:s,fadeOut:l,trackVolume:c,liveSynthPitchCurve:d,registerNode:p}=e,f=r.carrierIntegralField;if(!f||f.schemaVersion!=="carrier-integral-field-v1"||!Array.isArray(f.voices)||f.voices.length===0)return!1;const b=a.releaseScale??.12,g=a.attackScale??.02,y=a.transientGain??.08,x=i+s+l+.04,A=Math.max(1,Math.min(192,f.voices.length));return f.voices.slice(0,A).forEach((M,v)=>{const w=i+Math.max(0,Math.min(1,M.startRatio))*s,R=Math.max(.018,Math.min(Math.max(.02,s),Math.max(.001,M.durationRatio)*s)),k=t.createGain(),I=t.createGain(),E=Math.max(0,Math.min(1.5,Number.isFinite(M.trackVolume??NaN)?Number(M.trackVolume):.75)),F=Math.max(.05,Math.min(1.5,c)),L=Math.max(1e-4,Math.min(1.4,(M.velocity??.75)*E*F*.42)),B=Math.min(R*.48,Math.max(.002,R*g)),O=Math.min(R*.68,Math.max(.006,R*b));k.gain.setValueAtTime(1e-4,w),k.gain.linearRampToValueAtTime(L,w+B),k.gain.setValueAtTime(L,Math.max(w+B,w+R*.78)),k.gain.linearRampToValueAtTime(1e-4,Math.min(x,w+R+O)),I.gain.setValueAtTime(1,w),$F(I,[M.localField??null],w,R,Math.min(x,w+R+O)),I.connect(k),k.connect(n),p?.(k),p?.(I);const T=M9e({clipPitchCurve:d,voiceLocalField:M.localField??null,voiceStart:w,voiceDur:R,noteStart:i,nominalDur:s});a.oscillators.forEach((_,G)=>{const j=t.createOscillator(),N=t.createGain(),W=w+Math.max(0,_.startOffsetSec??0),V=Math.min(x,Math.max(W+.02,w+R*Math.max(.16,_.durationMul??1)+O+.02)),U=Number.isFinite(M.relativeSemitones??NaN)?Number(M.relativeSemitones):0,H=Math.max(20,Math.min(12e3,o*Math.pow(2,U/12)*Math.max(.125,_.freqMul??1)));j.type=_.type,T?D$({param:j.frequency,noteStart:w,noteEnd:w+R,oscStart:W,oscStop:V,baseFrequency:H,semitoneCurve:T}):j.frequency.setValueAtTime(H,W),_.detune&&j.detune.setValueAtTime(_.detune,W),N.gain.setValueAtTime(Math.max(1e-4,_.gain*(1+y)),W),N.gain.exponentialRampToValueAtTime(Math.max(1e-4,_.gain),W+Math.max(.01,R*.25)),j.connect(N),N.connect(I),j.start(W),j.stop(V),p?.(j),p?.(N)})}),!0}function R9e(e){const t=OT({laneId:e.laneId,laneSettings:e.laneSettings});return{swing:.24,edge:e.laneId==="hatClosed"||e.laneId==="hatOpen"?.58:.46,snap:e.value>=.95?.68:.52,air:e.laneId==="hatOpen"||e.laneId==="clap"?.54:.36,softness:e.laneId==="kick"?.42:.5,pan:t.pan,decayScale:t.decay,chokeGroup:t.chokeGroup}}function N$(e,t,n,r,a,o,i,s,l=null){const nodalSource=s.get(yW(a,r));if(nodalSource?.kind==="entrophon"){entrophonScheduleMelodic(e,t,n,r,a,o,i,nodalSource,l);return}if(nodalSource?.kind==="nodal"){nodalScheduleOffline(e,t,n,r,a,o,i,nodalSource,l);return}const noteFields=[...(r.instrumentFields??[]),...(r.localField?[r.localField]:[])].map(field=>Zr(field));const c=dL(yW(a,r),s),d=c.kind==="synth"?x9e(r):null,p=c.kind==="synth"?d??c.voice:null,f=Ax(n,r),b=F$(n,r),g=o+f*i,y=Math.max(.04,b*i),x=p?.attackScale??.02,A=p?.releaseScale??.12,M=p?.transientGain??.08,v=p?.panSpread??.12,w=fs(r),R=u7(r),k=w?.0035:.002,I=w?.0055:.006,E=Math.min(y*.8,Number.isFinite(r.edgeFadeInMs)?Math.max(.001,r.edgeFadeInMs/1e3):Math.max(k,d9e(r)*i||y*x)),F=Math.min(y*.8,Number.isFinite(r.edgeFadeOutMs)?Math.max(.001,r.edgeFadeOutMs/1e3):Math.max(I,T$(r)*i||y*A)),L=g+y+F+.02,B=Math.max(20,Math.min(12e3,m9e(n,r,c))),O=e.createGain(),T=e.createGain(),_=e.__mlMonoRender?null:e.createStereoPanner(),G=__mlPan(a.pan);_?.pan.setValueAtTime(G,g),T.gain.setValueAtTime(1,g),T.connect(O);let j=O;if(p?.filterType){const H=e.createBiquadFilter();H.type=p.filterType,H.frequency.setValueAtTime(p.filterFrequency??1200,g),H.Q.setValueAtTime(p.filterQ??.7,g),O.connect(H),j=H,l?.(H)}const W=!!r.carrierIntegralField&&r.carrierIntegralField.schemaVersion==="carrier-integral-field-v1"?1:Math.max(.001,r.velocity*a.volume*.45);O.gain.setValueAtTime(1e-4,g),O.gain.linearRampToValueAtTime(W,g+E),O.gain.setValueAtTime(W,g+y*.82),O.gain.linearRampToValueAtTime(1e-4,g+y+F),$F(T,[c.kind==="sample"?c.volumeEnvelope:null,...noteFields],g,y,L),_?(j.connect(_),_.connect(t)):j.connect(t),l?.(O),l?.(T),_&&l?.(_);const V=c.kind==="synth"?noteFields.map(field=>$p(field,"pitch-elastic")).filter(H=>!!H&&H.enabled&&!H.bypassed):[],U=V.length>0?B$(V,96):null;if(c.kind==="sample"){const H=vg({loaded:c,targetHz:B,minRate:.125,maxRate:8,fallbackHz:n.baseHz??220,requestedDurationSec:y}),q=Math.max(0,Number.isFinite(r.sampleOffsetSec)?Number(r.sampleOffsetSec):0),K=Number.isFinite(r.samplePlaybackDurationSec)?Math.max(.005,Number(r.samplePlaybackDurationSec)):null,Y=Math.max(.005,c.buffer.duration-q),J=K!=null?Math.max(.005,Math.min(Y,K)):Math.max(.005,Y),Z=r.materialPitchMode,te=Z==="source-fixed",X=Z==="source-granular",Q=te?B:Number.isFinite(r.anchorHz)?Math.max(1,Number(r.anchorHz)):c.baseHz??B,ne=w&&!te?"open-musical":"bounded",ee=UF({targetHz:B,anchorHz:Q,ratePolicy:ne}),ie=[c.pitchEnvelope,...noteFields.map(field=>$p(field,"pitch-elastic"))].filter(Ce=>!!Ce&&Ce.enabled&&!Ce.bypassed),de=ie.length>0,oe=w&&!te?Math.abs(1200*Math.log2(Math.max(1e-4,B/Math.max(1e-4,Q)))):0,ue=oe>6,fe=w&&!te&&oe<=6,he=R?Math.max(.024,J*.08):Math.max(.018,J*.05),re=w?Math.abs(y-J)>he:!1,le=w&&J>.005&&!fe&&(X||ue||re);if(de){Kne({ctx:e,destination:T,buffer:c.buffer,noteStart:g,noteEnd:L,nominalDur:y,safeOffsetSec:q,sliceDurationSec:J,basePlaybackRate:te?1:le?ee.elasticRate:H.playbackRate,fields:ie,quality:R?"fragment":"base",registerNode:l,ratePolicy:ne});return}if(le){Qne({ctx:e,destination:T,buffer:c.buffer,noteStart:g,noteEnd:L,nominalDur:y,safeOffsetSec:q,sliceDurationSec:J,playbackRate:te?1:ee.elasticRate,quality:R?"fragment":"base",registerNode:l,ratePolicy:ne});return}const Ae=e.createBufferSource();Ae.buffer=c.buffer;const ce=K==null?y>Math.max(.08,H.naturalDurationSec*.95)||H.shouldLoop:!1,ge=fe?1:H.playbackRate;if(Ae.playbackRate.setValueAtTime(ge,g),Ae.loop=ce,ce&&(Ae.loopStart=q,Ae.loopEnd=Math.min(c.buffer.duration,q+J)),Ae.connect(T),K!=null){const Ce=Math.min(Y,J/Math.max(ge,1e-4));Ae.start(g,q,Ce)}else Ae.start(g,q);Ae.stop(L),l?.(Ae);return}p&&(w9e({ctx:e,destination:T,note:r,preset:p,baseFrequency:B,noteStart:g,nominalDur:y,fadeOut:F,trackVolume:a.volume,liveSynthPitchCurve:U,registerNode:l})||p.oscillators.forEach(H=>{const q=e.createOscillator(),K=e.createGain(),Y=g+Math.max(0,H.startOffsetSec??0),J=Math.max(Y+.02,g+y*Math.max(.16,H.durationMul??1)+F+.02),Z=Math.max(20,Math.min(12e3,B*Math.max(.125,H.freqMul??1)));q.type=H.type,U?D$({param:q.frequency,noteStart:g,noteEnd:g+y,oscStart:Y,oscStop:J,baseFrequency:Z,semitoneCurve:U}):q.frequency.setValueAtTime(Z,Y),H.detune&&q.detune.setValueAtTime(H.detune,Y),K.gain.setValueAtTime(Math.max(1e-4,H.gain*(1+M)),Y),K.gain.exponentialRampToValueAtTime(Math.max(1e-4,H.gain),Y+Math.max(.01,y*.25)),q.connect(K),K.connect(T),q.start(Y),q.stop(J),l?.(q),l?.(K)}))}function C9e(e,t,n,r,a){if(!n.drumPattern||!n.drumKit)return;const o=IL({pattern:n.drumPattern,bars:Math.max(1,n.bars),segmentsPerBar:n.drumSegmentsPerBar??16,segmentMarkers:n.drumSegmentMarkers});O$(e,t,{...n,customDrumPattern:{useCustom:!0,presetSource:n.drumPattern,bars:o.bars,segmentsPerBar:o.segmentsPerBar,segmentMarkers:[...o.segmentMarkers],stepCount:o.stepCount,laneOrder:[...o.laneOrder],laneSteps:Object.fromEntries(o.laneOrder.map(i=>[i,[...(o.laneSteps??{})[i]??[]]]))}},r,a)}function O$(e,t,n,r,a){const o=n.drumKit;if(!n.customDrumPattern||!o)return;const i=D9(e,t),s=jT({presetSource:n.customDrumPattern.presetSource,globalKit:n.drumKit??"synthetic-kit",bars:n.customDrumPattern.bars||n.bars,segmentsPerBar:n.customDrumPattern.segmentsPerBar,segmentMarkers:n.customDrumPattern.segmentMarkers??[],stepCount:n.customDrumPattern.stepCount,laneOrder:n.customDrumPattern.laneOrder,laneSteps:n.customDrumPattern.laneSteps,laneKitOverrides:dce(n.drumLaneKitOverrides,void 0),laneSettings:n.drumLaneSettings,stepPrograms:n.customDrumPattern.stepPrograms});GT(s,l=>{if(__f52SampleLanes.includes(l.laneId)||!__f53StepAllowed(l.probability,l.laneId,l.stepIndex,0))return;const c=r+l.startRatio*a,d=(n.drumLevel??.84)*l.laneSettings.level*(Math.max(0,Math.min(1.25,l.value)));(l.layers.length?l.layers:[{id:"primary",active:!0,levelScale:1,decayScale:1,panOffset:0,gradient:0}]).forEach(f=>{if(!f.active)return;const b=n.drumStyle?PPe({laneId:l.laneId,value:l.value,laneSettings:n.drumLaneSettings,drumStyle:n.drumStyle}):R9e({laneId:l.laneId,value:l.value,laneSettings:n.drumLaneSettings});i.trigger(A9e[l.laneId],c,d*f.levelScale,f.kit??l.kit??C0({laneId:l.laneId,globalKit:o,overrides:s.laneKitOverrides}),{...b,pan:Math.max(-1,Math.min(1,b.pan+f.panOffset)),decayScale:b.decayScale*f.decayScale*l.decayLock,snap:Math.max(0,Math.min(1,(b.snap+f.gradient*.08)*l.toneLock)),air:Math.max(0,Math.min(1,(b.air+Math.max(0,f.gradient)*.06)*l.toneLock)),edge:Math.max(0,Math.min(1,(b.edge+Math.max(0,-f.gradient)*.06)*l.toneLock)),softness:Math.min(1,b.softness+(1-l.toneLock)*.55)})})})}function _$(e,t,n,r,a){if(n.customDrumPattern?.useCustom){O$(e,t,n,r,a);return}C9e(e,t,n,r,a)}
/* F3.56.52: Offline raw-sample overdub onto the existing cyclic drum stem.
 * All hit offsets use the canonical marked segment clock. Each long tail wraps through
 * the rendered loop (it is never choked at the next step, nor scheduled on main thread).
 * Sample originals remain in IndexedDB, never inside the grid/scratchpad.
 */
const __f52RawDecodedCache=new Map();let __f52RawDecodedBytes=0,__f52RawDecodedEpoch=0;
if(typeof window!=='undefined')window.addEventListener('xensonar:melodic-sample-library-updated',event=>{
 const id=event?.detail?.sampleId;__f52RawDecodedEpoch++;
 if(id&&__f52RawDecodedCache.has(id)){
  const old=__f52RawDecodedCache.get(id);__f52RawDecodedBytes-=old.length*old.numberOfChannels*4;__f52RawDecodedCache.delete(id);
 }else if(!id){__f52RawDecodedCache.clear();__f52RawDecodedBytes=0;}
});
function __f52CacheDecoded(id,decoded){const bytes=decoded.length*decoded.numberOfChannels*4;if(bytes>32*1024*1024)return;
 const previous=__f52RawDecodedCache.get(id);if(previous)__f52RawDecodedBytes-=previous.length*previous.numberOfChannels*4;
 __f52RawDecodedCache.delete(id);__f52RawDecodedCache.set(id,decoded);__f52RawDecodedBytes+=bytes;
 while(__f52RawDecodedBytes>32*1024*1024){const first=__f52RawDecodedCache.keys().next().value,old=__f52RawDecodedCache.get(first);__f52RawDecodedCache.delete(first);__f52RawDecodedBytes-=old.length*old.numberOfChannels*4;}
}
async function __f52PrepareDrumRaw(grid,ctx){
 const decoded=new Map();if(!grid?.sampleSlots)return decoded;
 for(const lane of __f52SampleLanes){const id=grid.sampleSlots[lane]?.id;if(!id||decoded.has(id))continue;try{let audio=__f52RawDecodedCache.get(id);if(!audio){const epoch=__f52RawDecodedEpoch,blob=await gw(id);if(!blob)continue;audio=await ctx.decodeAudioData((await blob.arrayBuffer()).slice(0));if(epoch===__f52RawDecodedEpoch)__f52CacheDecoded(id,audio);}else{__f52RawDecodedCache.delete(id);__f52RawDecodedCache.set(id,audio);}decoded.set(id,audio)}catch(err){console.warn("[xensonar][drum-sample] decode failed",id,err)}}
 return decoded;
}
function __f52BlendDrumRaw(buffer,grid,cycleSec,decodedById,drumLevel=1){
 if(!grid?.sampleSlots)return buffer;
 const tracks=__f52SampleLanes.filter(lane=>grid.sampleSlots[lane]?.id&&(grid.laneSteps?.[lane]||[]).some(v=>v>0));
 if(!tracks.length)return buffer;
 const frameCount=Math.max(1,Math.min(buffer.length,Math.round(cycleSec*buffer.sampleRate)));
 const output=[buffer.getChannelData(0),buffer.getChannelData(Math.min(1,buffer.numberOfChannels-1))];
 for(const lane of tracks){
  const slot=grid.sampleSlots[lane],decoded=decodedById.get(slot.id);if(!decoded)continue;
  const srcRate=decoded.sampleRate,dstRate=buffer.sampleRate;
  const src0=decoded.getChannelData(0),src1=decoded.getChannelData(Math.min(1,decoded.numberOfChannels-1));
  const slotGain=Math.max(0,Math.min(2,slot.volume??1))*Math.max(0,Math.min(1.5,drumLevel))*.55;
  // Fold the entire sound, including its tail, into one cyclic buffer once per lane.
  // Then each active step shifts that folded signal. Complexity is source + hits*cycle,
  // rather than source*hits (important for 1980s reverb snares and long field recordings).
  const foldedL=new Float32Array(frameCount),foldedR=new Float32Array(frameCount);
  const scale=srcRate/dstRate;
  for(let i=0,end=Math.ceil(src0.length/scale);i<end;i++){
    const p=i*scale,a=Math.floor(p),b=Math.min(src0.length-1,a+1),f=p-a,dest=i%frameCount;
    foldedL[dest]+=(src0[a]*(1-f)+src0[b]*f);
    foldedR[dest]+=(src1[a]*(1-f)+src1[b]*f);
  }
  for(let step=0;step<grid.stepCount;step++){
   const velocity=grid.laneSteps[lane]?.[step]||0;if(velocity<=0)continue;
   const program=WH(grid.stepPrograms?.[lane]?.[step],lane,step,velocity);
   if(!__f53StepAllowed(program.probability,lane,step,0))continue;
   const offset=Math.max(-.24,Math.min(.24,program?.microOffsetRatio??0));
   const base=Td(step,grid.bars,grid.segmentsPerBar,grid.segmentMarkers,'start');
   const start=((Math.round((base+offset/Math.max(1,grid.stepCount))*cycleSec*dstRate)%frameCount)+frameCount)%frameCount;
   const pan=Math.max(-1,Math.min(1,(slot.pan||0)+(program?.layers?.[0]?.panOffset||0)));
   const fold=buffer.numberOfChannels===1?.5:1;
   const left=Math.cos((pan+1)*Math.PI/4)*slotGain*velocity*fold,right=Math.sin((pan+1)*Math.PI/4)*slotGain*velocity*fold;
   if(program.decayLock<.999||program.toneLock<.999){
     const timeLimit=program.decayLock>=1?decoded.duration:decoded.duration*program.decayLock;
     const sampleFrames=Math.min(Math.ceil(src0.length/scale),Math.ceil(timeLimit*dstRate));
     const cutoff=Math.min(dstRate*.47,500*Math.pow(40,program.toneLock));
     const alpha=1-Math.exp(-2*Math.PI*cutoff/dstRate);let stateL=0,stateR=0;
     const fadeFrames=Math.max(1,Math.round(Math.min(.015,timeLimit*.2)*dstRate));
     for(let i=0;i<sampleFrames;i++){
       const pos=i*scale,a=Math.floor(pos),b=Math.min(src0.length-1,a+1),frac=pos-a;
       let leftIn=src0[a]*(1-frac)+src0[b]*frac,rightIn=src1[a]*(1-frac)+src1[b]*frac;
       if(program.toneLock<.995){stateL+=alpha*(leftIn-stateL);stateR+=alpha*(rightIn-stateR);leftIn=stateL;rightIn=stateR;}
       const fade=program.decayLock<1&&i>sampleFrames-fadeFrames?(sampleFrames-i)/fadeFrames:1;
       const dest=(start+i)%frameCount;output[0][dest]+=leftIn*left*fade;output[1][dest]+=rightIn*right*fade;
     }
     continue;
   }
   for(let i=0;i<frameCount;i++){
    const dest=(start+i)%frameCount;
    output[0][dest]+=foldedL[i]*left;
    output[1][dest]+=foldedR[i]*right;
   }
  }
 }
 return buffer;
}

async function z$(e, t = {}) {
  e=__mlResolveCustomRequest(e);
 const rate = Math.max(22050, Math.min(96000, t.sampleRate ?? 44100)), steps = iD(e.composer), duration = lD(e), drumDuration = cD(e), end = E$(e), stepSec = duration / steps;
 const region = t.regionSec ?? null, seconds = region ? Math.max(.02, region.endSec - region.startSec) : end + Math.max(.02, t.tailSec ?? .18, t.drumOnly ? 0 : Math.max(nodalRenderTailSeconds(e), entrophonRenderTailSeconds(e)));
 const initialChannels = __mlOutputChannels(e, t), frames = Math.ceil(seconds * rate);
 let ctx = new OfflineAudioContext(initialChannels, frames, rate);
 const sources = await SW(e, ctx);
 const rawGrid = !region && !t.excludeDrums ? e.customDrumPattern : null;
 const raw = rawGrid?.sampleSlots ? await __f52PrepareDrumRaw(rawGrid, ctx) : null;
 const channels = __mlOutputChannels(e, t, sources, raw);
 // Loaded stereo samples are known only after source preparation. AudioBuffers
 // are reusable across contexts at this same rate; no synthesis is repeated.
 if (channels !== initialChannels) ctx = new OfflineAudioContext(channels, frames, rate);
 ctx.__mlMonoRender = channels === 1;
 const master = ctx.createGain(); master.gain.setValueAtTime(.85, 0); master.connect(ctx.destination);
 const notes = t.drumOnly ? [] : e.noteId ? e.composer.notes.filter(note => note.id === e.noteId) : e.composer.notes.filter(note => e.trackIds.includes(note.trackId));
 for (const note of notes) {
  const track = e.composer.tracks.find(item => item.id === note.trackId), pitch = e.composer.pitchSteps[uD(e.composer, note)] ?? e.composer.pitchSteps[0], span = region ? __mlNoteSpan(note, e.composer, e.bpm) : null;
  if (region && (span.end <= region.startSec || span.start >= region.endSec)) continue;
  if (track?.enabled && pitch && !pitch.muted) N$(ctx, master, e.composer, note, track, region ? -region.startSec : 0, stepSec, sources, null);
 }
 if (!region && !t.excludeDrums) _$(ctx, master, e, 0, drumDuration || end);
 const rendered = await ctx.startRendering();
 if (raw?.size) __f52BlendDrumRaw(rendered, rawGrid, drumDuration || end, raw, e.drumLevel ?? .84);
 return rendered;
}async function j$(e,t){
 const n=await __mlRenderCached(e,t??{}),duration=t?.exactDurationSec;
 if(!(Number.isFinite(duration)&&duration>0))return lg(n);
 const frames=Math.max(1,Math.round(duration*n.sampleRate));
 if(frames>n.length)throw new Error(`Melodic-Loop-Renderer liefert ${n.length} Frames, ${frames} are required for exact bar length.`);
 // WAV encodes only the musical cycle; the render cache keeps the trailing note release.
 // No PCM buffer copy, no change to offline synthesis, and no silent padding.
 return lg({numberOfChannels:n.numberOfChannels,sampleRate:n.sampleRate,length:frames,getChannelData:channel=>n.getChannelData(channel)});
}async function hh(e){e=__mlResolveCustomRequest(e);try{return await __mlPlayWithPreparation(e)}catch(error){if(error?.name==="AbortError")return false;throw error}}
async function __mlPlayWithPreparation(e){// Single-note auditions remain live Nodal Worklet synthesis. The composed loop
 // uses exactly the same already-present, deterministic per-track PCM stem
 // rendering as the ordinary instruments and the export. This prevents
 // overlapping melodic notes from competing for the transient live-voice budget.
 if(nodalHasMelodicNotes(e) && e.noteId)return nodalPlayMelodic(e);hS();e={...e,signal:beginEntrophonMelodicPreparation()};const n=g9e();e.onToken?.(n);e.onPhase?.("preparing");const t=p9e();t.state==="suspended"&&await t.resume();if(!uP(n))return!1;const r=iD(e.composer),a=lD(e),o=cD(e),i=E$(e),s=a/r,l=()=>{const w=Number.isFinite(t.outputLatency)?Math.max(0,t.outputLatency):0,R=Number.isFinite(t.baseLatency)?Math.max(0,t.baseLatency):0;return Math.max(.018,Math.min(.05,R+w*.35+.006))},c=e.noteId?e.composer.notes.filter(w=>w.id===e.noteId):e.composer.notes.filter(w=>e.trackIds.includes(w.trackId)),d=e.onComposerPlayhead??e.onPlayhead;if(e.loop&&!e.noteId){
 // Prepare each instrument regardless of temporary solo/mute; all four stay phase-locked.
 // A later Only You click adjusts gains only, without re-rendering or resetting position.
 const trackIds=e.drumPreviewOnly?[]:e.composer.tracks.map(track=>track.id);
 if(__mlSoloTrackId!==null&&!e.composer.tracks.every(track=>track.enabled===(track.id===__mlSoloTrackId)))__mlSoloTrackId=null;
 const stems=new Map();
 for(const trackId of trackIds){
  const buffer=await __mlGetStem(e,trackId);
  if(!uP(n))return false;
  stems.set(trackId,buffer);
 }
 if(c9e(e)){
  const drumBuffer=await __mlGetStem(e,"__drums__");
  if(!uP(n))return false;
  stems.set("__drums__",drumBuffer);
 }
 if(!uP(n))return false;
 const start=t.currentTime+l(),master=t.createGain();
 master.gain.setValueAtTime(.0001,start);
 master.gain.linearRampToValueAtTime(.82,start+.02);
 master.__f49PreviewMaster=true;master.connect(t.destination);Mx(master);
 const gains=new Map(),trackPanners=new Map();
 for(const [id] of stems){
  const gain=t.createGain();
  const slot=e.composer.tracks.find(track=>track.id===id);
  const active=!e.drumPreviewOnly&&__mlSoloTrackId!==null?id===__mlSoloTrackId:(id==="__drums__"?(e.drumMonitorEnabled===true||__mlDrumsAudible):!!slot?.enabled);
  gain.gain.setValueAtTime(active?(id==="__drums__"?1:Math.max(0,Math.min(1,Number.isFinite(slot?.volume)?slot.volume:.8))/.8):0,start);
  if(id==="__drums__"){const rack=__f48GetDrumRack(t,master);gain.connect(rack.input);Mx({disconnect:()=>rack.dispose()})}else{gain.connect(master);const pan=t.createStereoPanner();pan.pan.setValueAtTime(__mlPan(slot?.pan),start);pan.connect(gain);trackPanners.set(id,pan);Mx(pan);}Mx(gain);gains.set(id,gain);
 }
 const session={drumRenderRequest:JSON.parse(JSON.stringify(e)),token:n,ctx:t,source:null,master,stemBuffers:stems,stemGains:gains,trackPanners,drumDescriptorKey:c9e(e)?__mlStemDescriptor(e,"__drums__").key:null,drumMonitorExplicit:e.drumMonitorEnabled===true,
  stemSources:[],liveEnabledIds:new Set(e.composer.tracks.filter(track=>track.enabled).map(track=>track.id)),liveTrackVolumes:new Map(e.composer.tracks.map(track=>[track.id,Number.isFinite(track.volume)?track.volume:.8])),melodicDurationSec:Math.max(.25,Math.max(1,e.composer.bars||1)*sD(e)),totalDurationSec:e.drumPreviewOnly?Math.max(.25,cD(e)||i):Math.max(.25,Math.max(1,e.composer.bars||1)*sD(e)),totalSteps:r,stepDurationSec:s,startTime:start,
  loopOffsetSec:0,playheadCallback:d,globalPlayheadCallback:e.onGlobalPlayheadRatio};
 __mlLaunchStemSources(session,0,start);
 y9e(session);e.onPhase?.("playing");d?.(0);e.onGlobalPlayheadRatio?.(0);
 const tick=()=>{
  const current=b9e();if(!current||current.token!==n)return;
  const delta=Math.max(0,xz(current.ctx)-current.startTime);
  const pos=current.totalDurationSec>0?(current.loopOffsetSec+delta)%current.totalDurationSec:0;
  current.playheadCallback?.(Math.min(current.totalSteps,pos/current.stepDurationSec));
  current.globalPlayheadCallback?.(Math.max(0,Math.min(1,pos/Math.max(.001,current.totalDurationSec))));
  if(typeof requestAnimationFrame!=="undefined")yA(requestAnimationFrame(tick));
 };
 if(typeof requestAnimationFrame!=="undefined")yA(requestAnimationFrame(tick));
 return true;
}const p=await SW(e,t);if(!uP(n))return!1;const f=t.currentTime+l(),b=t.createGain();b.gain.setValueAtTime(1e-4,f),b.gain.linearRampToValueAtTime(.8,f+.02),b.__f49PreviewMaster=true,b.connect(t.destination),Mx(b);const g=e.noteId?c[0]:void 0,y=g?Ax(e.composer,g)*s:0,x=e.noteId?f-y:f;c.forEach(w=>{const R=e.composer.tracks.find(I=>I.id===w.trackId),k=e.composer.pitchSteps[uD(e.composer,w)]??e.composer.pitchSteps[0];!R||!R.enabled||!k||k.muted||N$(t,b,e.composer,w,R,x,s,p,I=>Mx(I))}),e.noteId||_$(t,b,e,f,o||i);const entAudition=g?p.get(yW(e.composer.tracks.find(track=>track.id===g.trackId),g))?.noteBuffers?.get(g.id)?.durationSec:null;const A=entAudition??(g?Math.max(.45,Math.min(2.4,F$(e.composer,g)*s+T$(g)*s)):i+entrophonRenderTailSeconds(e)),M=f+A;d?.(g?Ax(e.composer,g):0),e.onGlobalPlayheadRatio?.(0);const v=()=>{if(!uP(n))return;const w=xz(t);if(w>=M){d?.(null),e.onGlobalPlayheadRatio?.(null),e.onEnded?.(),hS();return}const R=Math.max(0,w-f),k=g?Ax(e.composer,g)+R/s:Math.min(r,R/s);d?.(k),e.onGlobalPlayheadRatio?.(Math.max(0,Math.min(1,R/Math.max(.001,i)))),typeof requestAnimationFrame<"u"&&yA(requestAnimationFrame(v))};typeof requestAnimationFrame<"u"&&yA(requestAnimationFrame(v));return!0}async function P9e(e){
 const{loopComposer:t,material:n}=e,r=t.activeTrackIds.filter(c=>Bo(t,c)?.enabled),a=r.length>0?r:t.tracks.filter(c=>c.enabled).map(c=>c.id);
 if(a.length===0)throw new Error("No active Melodic Loop track to send.");
 const bars=Math.max(1,Math.round(t.bars||1)),beatsPerBar=Math.max(1,Math.round(t.beatsPerBar||4)),bpm=Math.max(40,n.bpm||108),duration=bars*beatsPerBar*60/bpm;
 const blob=await j$({composer:t,bpm,bars,trackIds:a},{exactDurationSec:duration});
 const markers=ni(t).filter(c=>c.kind==="guide"&&c.repeatPerBar).map(c=>c.beat/beatsPerBar),name=Wp(n.name||"melodic-loop");
 return{blob,durationSec:duration,bars,bpm,beatsPerBar,guideSegments:Math.max(1,Math.round(t.segmentCount||4)),guideMarkers:markers,carrier:__f333BuildCarrier(t,a),fileName:`${name}.wav`,safeName:name};
}function I9e(e){const{material:t,loopComposer:n,rendered:r,handoff:a}=e;return{name:t.name,role:t.role,
 bpm:r.bpm??Math.max(40,t.bpm||108),bars:r.bars,beatsPerBar:r.beatsPerBar,
 guideSegments:r.guideSegments,guideMarkers:r.guideMarkers,loopStartSec:0,loopEndSec:r.durationSec,
 rootHz:Math.max(30,Math.min(1200,Number.isFinite(n.baseHz)?n.baseHz:220)),sourceVersion:"loop-composer-v1",renderMode:"microtonal-logic:loop-composer",
 durationSec:r.durationSec,intendedLoopDurationSec:r.durationSec,preferredMyzelGroup:a.preferredMyzelGroup,workspaceOrigin:"microtonal-logic",transitionGuard:a.transitionGuard,balanceCarrier:a.balanceCarrier,
 routeSummary:"The Melodic Loop synth is sent to Xensonar as its own microtonal logic loop; Material Track receives the rendered loop and none of the old Forge 2 glyph/synesthetic render paths.",
 stabilizeBy:"Melodic Loop tuning lines and the timing guide are rendered directly from the Loop Composer before handoff."}}function E9e(e){const{materialName:t,rendered:n}=e;return{nextMaterialName:t||n.safeName,nextRole:"loop",nextBars:n.bars,nextSourceView:"synesthetic",nextSecondaryView:"harmonic",nextViewBlend:.26}}function F9e(e,t,n){if(!t||e.renderSourceKind!=="synth-live")return[e];if(!t.voices.length)return[];const r=w1(e.localField,"dynamic-fade"),a=w1(e.localField,"pitch-elastic");return t.voices.map(o=>{const i=w1(o.localField,"dynamic-fade"),s=w1(o.localField,"pitch-elastic"),l=[],c=[];for(let d=0;d<96;d++){const p=d/95,f=o.startRatio+p*o.durationRatio,b=1+.95*r(f),g=1+.95*i(p);l.push(b*g),c.push(12*(a(f)+s(p)))}return{...e,id:`${e.id}:${o.id}`,startBeat:e.startBeat+Math.max(0,o.startRatio)*e.durationBeats,durationBeats:Math.max(.0625,o.durationRatio*e.durationBeats),lineHz:(e.lineHz??n)*Math.pow(2,o.relativeSemitones/12),velocity:Math.max(0,Math.min(1,o.velocity*(o.trackVolume??.75))),localField:null,compiledGainCurve:l,compiledPitchSemitones:c,panOverride:Number.isFinite(o.pan)?o.pan:null,spectralWindowMeta:o.spectralWindowMeta??null}})}function T9e(e){if(!e.pitchLines.length)return 0;let t=0,n=Number.POSITIVE_INFINITY;return e.pitchLines.forEach((r,a)=>{const o=Math.abs(Su(r)-e.baseHz);o<n&&(n=o,t=a)}),t}function L9e(e){const t=$n(e.loopComposer),n=Li(t),r=T9e(t);return{sourceKind:"synth",renderMode:"direct",anchorGridStep:r,formantWindowPlan:null,synthPattern:{bars:Math.max(1,t.bars),beatsPerBar:Math.max(1,t.beatsPerBar||4),stepsPerBar:Math.max(1,t.stepsPerBar),segmentCount:Math.max(1,t.segmentCount||1),baseHz:Math.max(1,t.baseHz||220),tuning:t.tuning||"12edo",repetitionModel:t.repetitionModel||"octave",activeTrackIds:[...t.activeTrackIds],tracks:t.tracks.map(a=>({id:a.id,label:a.label,color:a.color,instrumentRole:a.instrumentRole,instrumentPreset:a.instrumentPreset??null,patternPresetId:a.patternPresetId??null,enabled:a.enabled!==!1,volume:Number.isFinite(a.volume)?a.volume:.8,pan:Number.isFinite(a.pan??NaN)?Number(a.pan):0})),notes:t.notes.flatMap(a=>{const o=wa(t,a),i=t.pitchLines[o]??null,s={carrierIntegralTimbre:a.carrierIntegralTimbre??null,materialPitchMode:a.materialPitchMode??null,id:a.id,trackId:a.trackId,startBeat:cn(t,a)/n,durationBeats:yr(t,a)/n,gridStepOffset:o-r,channelIndex:o,octaveOffset:om(),velocity:Number.isFinite(a.velocity)?a.velocity:.8,gate:1,lineId:typeof a.lineId=="string"?a.lineId:null,lineHz:i?Su(i):null,instrumentPresetOverride:a.instrumentPresetOverride??null,noteClass:a.noteClass??"standard",renderSourceKind:f7(t,a),sourceMaterialId:typeof a.sourceMaterialId=="string"?a.sourceMaterialId:null,anchorHz:Number.isFinite(a.anchorHz??NaN)?Math.max(1,Number(a.anchorHz)):null,sourceTempoBpm:Number.isFinite(a.sourceTempoBpm??NaN)?Math.max(1,Number(a.sourceTempoBpm)):null,sourceLoopDurationSec:Number.isFinite(a.sourceLoopDurationSec??NaN)?Math.max(.005,Number(a.sourceLoopDurationSec)):null,sampleOffsetSec:Number.isFinite(a.sampleOffsetSec??NaN)?Math.max(0,Number(a.sampleOffsetSec)):null,samplePlaybackDurationSec:Number.isFinite(a.samplePlaybackDurationSec??NaN)?Math.max(.005,Number(a.samplePlaybackDurationSec)):null,fadeInBeats:rR(a)/n,fadeOutBeats:aR(a)/n,localField:a.localField?Zr(a.localField):null};return F9e(s,a.carrierIntegralField,t.baseHz)})},synthPatch:{compositionPresetId:t.compositionPresetId||"jazz",baseHz:Math.max(1,t.baseHz||220),tuning:t.tuning||"12edo",repetitionModel:t.repetitionModel||"octave",carrierIntegralTimbre:null,trackPatches:t.tracks.map(a=>({id:a.id,instrumentPreset:a.instrumentPreset??null,patternPresetId:a.patternPresetId??null,enabled:a.enabled!==!1,volume:Number.isFinite(a.volume)?a.volume:.8,pan:Number.isFinite(a.pan??NaN)?Number(a.pan):0}))}}}async function VR(e){return P9e({loopComposer:e.loopComposer,material:{name:e.materialExport.name,bpm:e.materialExport.bpm}})}async function B9e(e){ULe("legacy");const t=await VR(e),n=I9e({material:{name:e.materialExport.name,role:e.materialExport.role,bpm:e.materialExport.bpm},loopComposer:e.loopComposer,rendered:t,handoff:e.activeHandoffProfile,referenceBpm:e.referenceBpm}),r=$M(e.materialExport.adapterId,Ly(n,t.blob,e.canonicalProducer)),a=bu(r);e.materialExport.rootFollowPreferred&&ri("rootFollowBankMembership",{entryId:a.id,enabled:!0,config:__mlNodalRflConfig(e.loopComposer)}),e.setStatus(e.materialExport.rootFollowPreferred?`Melodic Loop sent to Xensonar via ${e.selectedAdapterName} · ${__mlContainsNodalTracks(e.loopComposer)?"rendered audio assigned to Root Follow (no direct Nodal RFL synth yet)":"marked as Root Follow Loop"}.`:`Melodic Loop sent to Xensonar via ${e.selectedAdapterName}.`)}async function D9e(e){
 const transfer=__f334CreateTransfer(e.loopComposer,e.materialExport);
 QLe(transfer);e.onRequestModeChange?.('experimental');
 e.setStatus("Carrier figure ready for Spectral Forge · "+transfer.bars+" bars · "+transfer.beatsPerBar+'/4 · '+transfer.bpm+' BPM');
}async function N9e(e){const t=await VR(e);e.stopAllForge2Preview("Transferring Melodic Loop to the Wave/Material canvas …");const n=new File([t.blob],t.fileName,{type:t.blob.type||"audio/wav"}),r=await Cg(n,i=>e.setStatus(`Decoding source ${(i*100).toFixed(0)}%`)),a=Math.min(Math.max(1,r.importDurationSec),r.originalDuration);e.setPendingImageImport(null),e.setRawSourceAsset(r),e.setSelectionStartSec(0),e.setSelectionDurationSec(a);const o=E9e({materialName:e.materialExport.name,rendered:t});e.setMaterialExport(i=>({...i,name:o.nextMaterialName,role:o.nextRole,bars:Da(o.nextBars)})),e.setLastAutoCorrect(null),e.setSourceView(o.nextSourceView),e.setSecondaryView(o.nextSecondaryView),e.setViewBlend(o.nextViewBlend),await e.applySelection(r,0,a),e.setActiveWorkspace("wave-material"),e.setStatus("Melodic Loop is now ready in SyntheticForge.")}function Jd(e){const{actions:t,statusMessage:n="Preview stopped."}=e;xt.stop(),t.stopPreviewAudio(),hS(),t.stopSelectionLoopPreview(),t.stopSourceAuditionPreview?.(!1),t.setIsPlaying(!1),t.setPlayheadPosition(0),t.setClipPreviewStep(null),t.setStatus(n)}async function O9e(e){const{withDrums:t,trackMode:n="visible",spectralData:r,synthMode:a,waveformMix:o,loopDurationSec:i,materialExport:s,loopComposer:l,grooveMachine:c,drumComputer:d,actions:p}=e;try{Jd({actions:p,statusMessage:"Starting Material Track with Groove ..."});const f=(n==="visible"?l.activeTrackIds:l.tracks.filter(y=>y.enabled).map(y=>y.id)).filter(y=>Bo(l,y)?.enabled);p.setIsPlaying(!0);const b=()=>{p.setIsPlaying(!1),p.setPlayheadPosition(0),hS(),p.setClipPreviewStep(null),p.setStatus(t?"Material Track + Groove stopped.":"Material Track + Clip Tracks stopped.")},g=10/Math.max(.05,i);await xt.play(r,a,o,0,p.setPlayheadPosition,b,void 0,{beatGuideAudible:s.beatGuideAudible,beatGuideVolume:s.beatGuideVolume,bars:s.bars,guideSegments:s.guideSegments,guideMarkers:s.guideMarkers,loopPreview:s.loopPreview,loopDurationSec:i,playbackRate:g}),await hh({composer:l,bpm:s.bpm,bars:l.bars,trackIds:f,drumPattern:t&&!d.useCustom?c.drumPattern:void 0,drumKit:t?c.drumKit:void 0,drumLevel:t?.9:void 0,customDrumPattern:t&&d.useCustom?d:null,drumLaneKitOverrides:t?c.drumLaneKitOverrides:void 0,drumLaneSettings:t?c.drumLaneSettings:void 0,onPlayhead:y=>p.setClipPreviewStep(y),onEnded:()=>{p.setClipPreviewStep(null)}}),p.setStatus(t?"Previewed Material Track with drums + Clip Tracks.":"Previewed Material Track with Clip Tracks.")}catch(f){console.error("[xensonar][forge2][material-groove-preview]",f),Jd({actions:p,statusMessage:`Material/Groove preview failed: ${f instanceof Error?f.message:String(f)}`})}}async function _9e(e){const{withTracks:t="none",loopComposer:n,materialExport:r,grooveMachine:a,drumComputer:o,actions:i}=e;let token=null;try{Jd({actions:i,statusMessage:"Starting drum preview ..."});const s=t==="visible"?n.activeTrackIds.filter(l=>Bo(n,l)?.enabled):t==="enabled"?n.tracks.filter(l=>l.enabled).map(l=>l.id):[];const started=await hh({composer:t==="none"?{...n,notes:[],tracks:[],activeTrackIds:[]}:n,drumPreviewOnly:t==="none",onToken:value=>{token=value},bpm:r.bpm,bars:n.bars,trackIds:s,drumPattern:o.useCustom?void 0:a.drumPattern,drumKit:a.drumKit,drumLevel:.92,drumMonitorEnabled:!0,customDrumPattern:o.useCustom?o:null,drumLaneKitOverrides:a.drumLaneKitOverrides,drumLaneSettings:a.drumLaneSettings,loop:!0,onPlayhead:l=>i.setClipPreviewStep(l),onEnded:()=>{i.setClipPreviewStep(null),i.setStatus(t==="none"?"Drum preview stopped.":"Groove preview stopped.")}});if(!started||token===null||!uP(token))return false;i.setStatus(t==="none"?"Drum Pattern is running in the preview loop.":"Drums with Clip Tracks are running in the preview loop.")}catch(s){if(token!==null&&!uP(token))return false;console.error("[xensonar][forge2][drum-preview]",s),i.setClipPreviewStep(null),i.setStatus(`Drum preview failed: ${s instanceof Error?s.message:String(s)}`)}}async function z9e(e){const{loopComposer:t,materialExport:n,actions:r}=e;let a=null;try{Jd({actions:r,statusMessage:"Starting loop preview of active instruments ..."});const o=t.tracks.filter(i=>i.enabled).map(i=>i.id),i=await hh({composer:t,bpm:n.bpm,bars:t.bars,trackIds:o,...__mlCanonicalDrumSpec(__mlSharedDrumMachine.snapshot,e.grooveMachine,e.drumComputer),loop:!0,onPlayhead:l=>r.setClipPreviewStep(l),onToken:l=>{a=l},onPhase:__mlSetPhase});i&&a!==null&&uP(a)&&(void __mlRefreshLiveDrumStem({composer:t,bpm:n.bpm,bars:t.bars,trackIds:o,loop:true,...__mlCanonicalDrumSpec(__mlSharedDrumMachine.snapshot,e.grooveMachine,e.drumComputer)}).catch(err=>console.error("[ml drum ready reconciliation]",err)),r.setStatus("Active instruments are running in the preview loop."))}catch(o){if(a===null||uP(a)){__mlSetPhase("idle"),r.setClipPreviewStep(null),r.setStatus(`Preview of active instruments failed: ${o instanceof Error?o.message:String(o)}`)}console.error("[xensonar][forge2][enabled-track-preview]",o)}}async function j9e(e){const{trackId:t,presetId:n,loopComposer:r,materialExport:a,actions:o}=e;try{Jd({actions:o,statusMessage:"Previewing instrument selection ..."});const i=$n(r),s=i.tracks.find(d=>d.id===t);if(!s)throw new Error("Track not found");s.instrumentPreset=n,s.enabled=!0,i.selectedTrackId=t,i.activeTrackIds=Array.from(new Set([...i.activeTrackIds,t]));const l=i.notes.find(d=>d.trackId===t),c=pr(i,l?{...l,id:`audition-${t}`}:{id:`audition-${t}`,trackId:t,channelIndex:Math.max(0,Math.min(i.pitchSteps.length-1,Math.floor(i.pitchSteps.length*.45))),lineId:i.pitchLines[Math.max(0,Math.min(i.pitchLines.length-1,Math.floor(i.pitchLines.length*.45)))]?.id,octaveOffset:0,startUnit:0,durationUnits:Math.max(1.5,i.stepsPerBar/2),fadeInUnits:0,fadeOutUnits:Math.max(.5,i.stepsPerBar/6),velocity:.92});i.notes=[c],i.selectedNoteId=c.id,await hh({composer:i,bpm:a.bpm,bars:i.bars,trackIds:[t],noteId:c.id,onPlayhead:d=>o.setClipPreviewStep(d),onEnded:()=>{o.setClipPreviewStep(null),o.setStatus("Instrument selection previewed.")}}),o.setStatus("Instrument selection is playing.")}catch(i){console.error("[xensonar][forge2][instrument-audition]",i),o.setClipPreviewStep(null),o.setStatus(`Instrument preview failed: ${i instanceof Error?i.message:String(i)}`)}}