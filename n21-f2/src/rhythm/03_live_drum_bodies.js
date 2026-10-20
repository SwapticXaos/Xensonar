
/* F3.56.27: finite PCM bodies share the original recipes, noise and audio bus.
 * Preparation is serial and deferred; a cache miss always sounds via the original synth.
 * Hi-hat output envelopes stay live so choke remains the original AudioParam operation. */
const __drumLiveMachines=new WeakMap();
let __f53ActiveLiveDrumMachine=null;
if(typeof window!=='undefined')window.addEventListener('xensonar:melodic-sample-library-updated',ev=>{
 const machine=__f53ActiveLiveDrumMachine;if(!machine)return;
 machine.invalidateSample(ev?.detail?.sampleId);
 const grid=__mlSharedDrumMachine.liveEdit?.grid||__mlSharedDrumMachine.snapshot?.exported;
 void machine.prepareSamples(grid).catch(()=>{});
});
const __drumBodyQueue=new Map();
let __drumBodyWorker=false,__drumLiveBuildHold=0;
function __drumPumpBodies(){
 if(__drumBodyWorker||!__drumBodyQueue.size)return;
 __drumBodyWorker=true;
 const run=async()=>{
  if(__drumLiveBuildHold){setTimeout(run,40);return}
  const [ticket,job]=__drumBodyQueue.entries().next().value;
  __drumBodyQueue.delete(ticket);
  try{if(job.ctx.state!=="closed")await job.build()}catch(error){job.fail(error)}
  finally{__drumBodyWorker=false;__drumPumpBodies()}
 };
 if(typeof requestIdleCallback==="function")requestIdleCallback(run,{timeout:600});
 else setTimeout(run,24);
}
function D9(ctx,bus){
 if(typeof ctx.startRendering==="function")return __drumLegacySynth(ctx,bus);
 let destinations=__drumLiveMachines.get(ctx);
 if(!destinations){destinations=new WeakMap();__drumLiveMachines.set(ctx,destinations)}
 const previous=destinations.get(bus);if(previous){__f53ActiveLiveDrumMachine=previous;return previous;}
 const noise=r2e(ctx),noiseTable=noise.getChannelData(0),cache=new Map(),pending=new Set(),failed=new Set();
 const diagnostics={hits:0,misses:0,compiled:0,compileErrors:0,activeVoices:0,peakVoices:0,cacheBytes:0};
 let group=null,openHat=null;
 // Only cold voices use the factory facade; warm voices create at most three nodes.
 const facade={sampleRate:ctx.sampleRate};
 for(const method of ["createBuffer","createBufferSource","createOscillator","createGain","createBiquadFilter","createWaveShaper","createStereoPanner"]){
  if(typeof ctx[method]!=="function")continue;
  facade[method]=(...args)=>{const node=ctx[method](...args);if(group&&method!=="createBuffer")group.push(node);return node};
 }
 const legacy=__drumLegacySynth(facade,bus,noise,true);
 const retire=(nodes,voice)=>{
  diagnostics.activeVoices++;diagnostics.peakVoices=Math.max(diagnostics.peakVoices,diagnostics.activeVoices);
  const sources=nodes.filter(node=>typeof node.start==="function"&&typeof node.stop==="function");
  let left=sources.length,done=false;
  const disconnect=()=>{if(done)return;done=true;for(const node of nodes)try{node.disconnect()}catch{}
   diagnostics.activeVoices--;if(openHat===voice)openHat=null};
  const ended=()=>{if(--left>0)return;
   // Cached buffers already contain the filter tail; legacy graphs retain the compiler's tail margin.
   if(voice?.cached)disconnect();else setTimeout(disconnect,500)};
  for(const source of sources)source.addEventListener("ended",ended,{once:true});
  if(!sources.length)disconnect();
 };
 const queue=(key,voice,level,kit,style)=>{
  if(pending.has(key)||failed.has(key)||typeof OfflineAudioContext!=="function")return;
  const recipe=PIe({voice,level,kit,style});if(!recipe)return;
  const ticket={};pending.add(key);
  const job={ctx,fail:()=>{pending.delete(key);failed.add(key);diagnostics.compileErrors++;if(failed.size>128)failed.delete(failed.values().next().value)},
   build:async()=>{
    const body=await VIe(recipe.kind==="hat"?{...recipe,liveOutputEnvelope:true}:recipe,{sampleRate:ctx.sampleRate,noiseTable});
    if(ctx.state==="closed"){pending.delete(key);return}
    const buffer=ctx.createBuffer(1,body.samples.length,ctx.sampleRate);buffer.copyToChannel(body.samples,0);
    const bytes=buffer.length*4;
    cache.set(key,{buffer,recipe});diagnostics.cacheBytes+=bytes;diagnostics.compiled++;pending.delete(key);
    while(cache.size>128||diagnostics.cacheBytes>12*1024*1024){const oldest=cache.keys().next().value;
     diagnostics.cacheBytes-=cache.get(oldest).buffer.length*4;cache.delete(oldest)}
   }};
  // Discard only obsolete preparation requests, never an audible event.
  if(__drumBodyQueue.size>=64){const first=__drumBodyQueue.keys().next().value;__drumBodyQueue.get(first).cancel();__drumBodyQueue.delete(first)}
  job.cancel=()=>pending.delete(key);__drumBodyQueue.set(ticket,job);__drumPumpBodies();
 };
 const trigger=(voice,time,level,kit,inputStyle)=>{
  if(!["kick","snare","hat_closed","hat_open","clap","perc"].includes(voice))return;
  const style=tO(inputStyle),value=Ql(level,0,1.5);
  if(value<=1e-4||!Number.isFinite(time))return;
  const key=CIe(voice,kit,value,style),entry=cache.get(key);
  let output,nodes=[],hat={gain:null,cached:!!entry};
  if(entry){
   diagnostics.hits++;cache.delete(key);cache.set(key,entry);
   const source=ctx.createBufferSource(),gain=ctx.createGain();nodes.push(source,gain);
   source.buffer=entry.buffer;source.connect(gain);
   if(entry.recipe.kind==="hat")xk(gain,time,entry.recipe.outputEnvelope);else gain.gain.setValueAtTime(1,time);
   if(typeof ctx.createStereoPanner==="function"){const pan=ctx.createStereoPanner();pan.pan.setValueAtTime(style.pan,time);gain.connect(pan);pan.connect(bus);nodes.push(pan)}else gain.connect(bus);
   output=gain;source.start(time);
  }else{
   diagnostics.misses++;group=nodes;
   try{output=legacy.trigger(voice,time,value,kit,{...style,chokeGroup:"none"})}finally{group=null}
   queue(key,voice,value,kit,style);
  }
  if(style.chokeGroup==="hat"){
   if(voice==="hat_closed"&&openHat?.gain){openHat.gain.gain.cancelScheduledValues(time);openHat.gain.gain.setTargetAtTime(1e-4,time,.01)}
   if(voice==="hat_open"){hat.gain=output;openHat=hat}
  }
  retire(nodes,hat);
 };
 /* Loaded outside the scheduler; pending/failed samples drop rather than being replayed late.
    Drum samples share the established main-room drum bus and never allocate worklets. */
 const sampleBuffers=new Map(),sampleLoads=new Map(),sampleVoices=new Set();let wantedSampleIds=new Set();
 const sampleStats={ready:0,loads:0,loadErrors:0,misses:0,dropped:0,played:0,active:0};
 const prepareSamples=grid=>{
  if(ctx.state==='closed')return Promise.resolve([]);
  const ids=[...new Set(__f52SampleLanes.map(lane=>grid?.sampleSlots?.[lane]?.id).filter(Boolean))];
  wantedSampleIds=new Set(ids);
  for(const old of sampleBuffers.keys())if(!wantedSampleIds.has(old))sampleBuffers.delete(old);
  sampleStats.ready=sampleBuffers.size;
  return Promise.all(ids.map(id=>{
   if(sampleBuffers.has(id))return Promise.resolve(sampleBuffers.get(id));
   if(sampleLoads.has(id))return sampleLoads.get(id);
   sampleStats.loads++;
   const load=(async()=>{
    const blob=await gw(id);if(!blob)throw Error('Missing sample '+id);
    const audio=await ctx.decodeAudioData(await blob.arrayBuffer());
    if(ctx.state!=='closed'&&audio?.length&&wantedSampleIds.has(id)){sampleBuffers.set(id,audio);sampleStats.ready=sampleBuffers.size;}
    return audio;
   })().catch(error=>{sampleStats.loadErrors++;console.warn('[xensonar][live-drum-sample]',id,error);return null}).finally(()=>sampleLoads.delete(id));
   sampleLoads.set(id,load);return load;
  }));
 };
 const triggerSample=(id,time,level,options={})=>{
  const audio=sampleBuffers.get(id);
  if(!audio||ctx.state==='closed'){sampleStats.misses++;return false}
  if(sampleVoices.size>=24){sampleStats.dropped++;return false}
  if(!Number.isFinite(time)||!Number.isFinite(level)||level<=0)return false;
  const at=Math.max(ctx.currentTime,time),duration=audio.duration;
  const decay=Math.max(.2,Math.min(2,options.decayLock??1));
  const playSec=decay>=1?duration:duration*decay;
  if(playSec<.003)return false;
  const source=ctx.createBufferSource(),gain=ctx.createGain(),nodes=[source,gain];
  const when=Math.min(playSec,.008),release=Math.min(.015,playSec*.2);
  source.buffer=audio;source.connect(gain);
  gain.gain.setValueAtTime(0,at);
  gain.gain.linearRampToValueAtTime(Math.min(1.8,level),at+when);
  if(decay<1){gain.gain.setValueAtTime(Math.min(1.8,level),Math.max(at+when,at+playSec-release));gain.gain.linearRampToValueAtTime(0,at+playSec)}
  const tone=Math.max(0,Math.min(1,options.toneLock??1));let output=gain;
  if(tone<.995){const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(Math.min(ctx.sampleRate*.47,500*Math.pow(40,tone)),at);gain.connect(filter);output=filter;nodes.push(filter)}
  const pan=Math.max(-1,Math.min(1,options.pan??0));
  if(typeof ctx.createStereoPanner==='function'){
   const panner=ctx.createStereoPanner();panner.pan.setValueAtTime(pan,at);output.connect(panner);panner.connect(bus);nodes.push(panner);
  }else output.connect(bus);
  sampleVoices.add(source);sampleStats.played++;sampleStats.active=sampleVoices.size;
  source.addEventListener('ended',()=>{
   sampleVoices.delete(source);sampleStats.active=sampleVoices.size;
   for(const node of nodes)try{node.disconnect()}catch{}
  },{once:true});
  source.start(at);if(decay<1)source.stop(at+playSec);
  return true;
 };
 const machine={trigger,triggerSample,prepareSamples,invalidateSample:(id)=>{if(id)sampleBuffers.delete(id);else sampleBuffers.clear();sampleStats.ready=sampleBuffers.size},schedulePattern:(pattern,step,time,level,kit,inputStyle,overrides)=>{
  const style=tO(inputStyle),delay=.004+style.swing*.018;
  for(const event of PL(pattern,step))trigger(event.laneId==="hatClosed"?"hat_closed":event.laneId==="hatOpen"?"hat_open":event.laneId,
   event.timing==="late"?time+delay:event.timing==="early"?Math.max(0,time-delay*.45):time,
   level*(event.levelMultiplier??1),C0({laneId:event.laneId,globalKit:kit,overrides}),style);
 },getDiagnostics:()=>({...diagnostics,cacheEntries:cache.size,pendingBodies:pending.size,samples:{...sampleStats}})};
 destinations.set(bus,machine);__f53ActiveLiveDrumMachine=machine;
 const active=__mlSharedDrumMachine.liveEdit?.grid||__mlSharedDrumMachine.snapshot?.exported;
 void machine.prepareSamples(active);
 return machine;
}

/* The drum grid owns its audition entry point, even before Melodic Loop mounts. */
async function __mlPreviewSharedDrums(){
 const bridge=__mlSharedDrumMachine,context=bridge.previewContext;
 const grid=im(bridge.liveEdit?.grid||__mlGridFromSelection(bridge.snapshot));grid.useCustom=true;
 const bars=Math.max(1,grid.bars||1),seg=Math.max(1,grid.segmentsPerBar||16);
 const fallback={drumKit:bridge.snapshot?.kit||"dusty_tape",drumLaneKitOverrides:{},drumLaneSettings:{}};
 const spec=__mlCanonicalDrumSpec(bridge.snapshot,context?.groove||fallback,context?.computer||grid);
 const composer={...(context?.composer||{beatsPerBar:4,stepsPerBar:16}),bars,notes:[],tracks:[],activeTrackIds:[]};
 bridge.previewOwned=true;bridge.setPreview("preparing",-1);let token=null;
 try{
  const started=await hh({composer,bpm:context?.bpm||bridge.snapshot?.bpm||108,bars,trackIds:[],
   ...spec,customDrumPattern:grid,drumPattern:undefined,drumMonitorEnabled:true,drumPreviewOnly:true,loop:true,
   onToken:next=>{token=next;bridge.previewToken=next},
   onPhase:phase=>{if(bridge.previewOwned&&bridge.previewToken===token)bridge.setPreview(phase,phase==="playing"?0:-1)},
   onGlobalPlayheadRatio:ratio=>{if(bridge.previewOwned&&bridge.previewToken===token&&Number.isFinite(ratio))bridge.setPreview("playing",__mlPreviewMarkerIndex(ratio,bars,seg,grid.segmentMarkers))}});
  if(!started||!bridge.previewOwned||bridge.previewToken!==token){if(bridge.previewToken===token){bridge.previewOwned=false;bridge.setPreview("idle",-1)}return false}
  return true;
 }catch(error){if(bridge.previewToken===token){bridge.previewOwned=false;bridge.setPreview("idle",-1)}throw error}
}
function __mlStopSharedDrums(){
 const bridge=__mlSharedDrumMachine;if(!bridge.previewOwned)return false;
 bridge.previewOwned=false;const stillOwner=bridge.previewToken!==null&&uP(bridge.previewToken);
 if(stillOwner)hS();bridge.previewToken=null;bridge.setPreview("idle",-1);return stillOwner;
}
const aE=e=>e==="normal"||e==="double"||e==="half",rx=e=>e==="flowing"||e==="grainy",N9=(e,t=.22)=>{const n=typeof e=="number"&&Number.isFinite(e)?e:t;return Math.min(1,Math.max(0,n))},a2e=()=>({active:!1,id:"",syncToBeat:!0,volume:.22,timeMode:"normal"}),o2e=()=>({active:!1,id:"",volume:.22,timeMode:"normal",granulationMode:"flowing",granularSettings:Ese("flowing"),impulsRasterEvery:Xl.every,impulsRasterCycleDiv:Xl.cycleDiv,impulsRasterClockMode:Xl.clockMode,impulsRasterPattern:[...Xl.pattern]}),i2e=()=>{const e=a2e(),t=o2e();return{materialLoopActive:e.active,materialLoopSyncToBeat:e.syncToBeat,materialLoopId:e.id,materialLoopVolume:e.volume,materialLoopTimeMode:e.timeMode,rootFollowImpulsRasterMuted:false,rootFollowLoopActive:t.active,rootFollowLoopId:t.id,rootFollowLoopVolume:t.volume,rootFollowLoopTimeMode:t.timeMode,rootFollowLoopGranulationMode:t.granulationMode,rootFollowGranularSettings:t.granularSettings,rootFollowImpulsRasterEvery:t.impulsRasterEvery,rootFollowImpulsRasterCycleDiv:t.impulsRasterCycleDiv,rootFollowImpulsRasterClockMode:t.impulsRasterClockMode,rootFollowImpulsRasterPattern:t.impulsRasterPattern}},s2e=e=>{const t=rx(e.rootFollowLoopGranulationMode)?e.rootFollowLoopGranulationMode:"flowing";return{active:!!e.rootFollowLoopActive,id:e.rootFollowLoopId??"",timeMode:aE(e.rootFollowLoopTimeMode)?e.rootFollowLoopTimeMode:"normal",volume:N9(e.rootFollowLoopVolume),granulationMode:t,granularSettings:Jr(e.rootFollowGranularSettings,t),impulsRasterEvery:Lo(e.rootFollowImpulsRasterEvery),impulsRasterCycleDiv:Lo(e.rootFollowImpulsRasterCycleDiv),impulsRasterClockMode:hT(e.rootFollowImpulsRasterClockMode),impulsRasterPattern:Wy(e.rootFollowImpulsRasterPattern,{counterDiv:e.rootFollowImpulsRasterEvery,everyFallback:e.rootFollowImpulsRasterEvery})}},l2e=e=>({rootFollowLoopActive:e.active,rootFollowLoopId:e.id,rootFollowLoopTimeMode:e.timeMode,rootFollowLoopVolume:e.volume,rootFollowLoopGranulationMode:e.granulationMode,rootFollowGranularSettings:e.granularSettings,rootFollowImpulsRasterEvery:e.impulsRasterEvery,rootFollowImpulsRasterCycleDiv:e.impulsRasterCycleDiv,rootFollowImpulsRasterClockMode:e.impulsRasterClockMode,rootFollowImpulsRasterPattern:e.impulsRasterPattern}),EL="xensonar-particle-sample-profile-mode",c2e=()=>{if(typeof window>"u")return"current_db_v2";try{return window.localStorage.getItem(EL)==="legacy_90_40"?"legacy_90_40":"current_db_v2"}catch{return"current_db_v2"}},u2e=e=>({...__XenDroneStart,echoOn:!1,echoTempo:400,echoDecay:.6,waveRadius:1.09,waveDecay:"abrupt",gridOn:!0,gridBase:440,gridTuning:"12edo",gridMode:"ionian",rememberGrid:!1,gridStates:{},manualGridMutedSteps:xF("ionian","12edo"),manualGridStepOffsets:Array.from({length:12},()=>0),particleSystem:"ji",churchMode:"ionian",lockCursorToGrid:!1,cursorSpeed:4,droneDriveOn:!1,droneDriveAmount:.22,droneDriveTone:.52,droneDriveMix:.26,droneDriveOutput:.82,droneRhythmCustomSteps:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],drumActive:!0,drumPattern:"broken_lilt",drumKit:"dusty_tape",drumLaneKits:{...Ky},drumVolume:.52,drumEdge:Kn.edge,drumSoftness:Kn.softness,drumAir:Kn.air,drumSnap:Kn.snap,grooveSwing:Kn.swing,drumConfigMode:"preset",drumConfigId:"",bassActive:!0,bassPattern:"forge_fractured",bassPatternMode:"preset",bassClipId:"",psyBassPitchMode:"classic-semitone",...__f48RackParams,bassVolume:.1,bassTone:.48,bassGrit:.18,bassRootMode:"auto",bassRootHz:55,particlePreset:"dust_chime",particleSampleProfileMode:c2e(),particleGradientX:"edge_spark",particleGradientY:"warm_center",waveTimbreGradientEnabled:!0,waveTimbreGradientX:"wire_to_psy",waveVolumeGradientEnabled:!1,waveVolumeGradientX:"none",waveOvertonesEnabled:!1,droneOvertoneWaveform:"triangle",waveOvertoneWaveform:"triangle",waveOvertoneMode:"arp",waveOvertoneArpRate:64,waveOvertoneArpPattern:"updown",waveOvertoneArpSteps:8,waveOvertoneGlobalLevel:1,waveOvertones:Ud(),waveStarterHoldSegments:24,waveStarterHoldCustomSegments:48,waveStarterHoldReferenceBars:1,waveStarterHoldPatternSteps:Array.from({length:24},()=>1),waveStarterHoldSoundPreset:"tape_halo",keyboardHoldSegments:24,keyboardHoldCustomSegments:48,keyboardHoldReferenceBars:1,keyboardHoldPatternSteps:Array.from({length:24},(_,i)=>i===0||i>=3?1:0),keyboardHoldSoundPreset:"tape_halo",particleVolume:.165,particleMute:!1,quantizeOn:!1,quantizeBpm:108,...i2e(),resonanceHotkeyMode:"material",agentEnabled:MF("ji","ionian"),agentVolumes:lw("ji").map(()=>1),droneJIOvertones:{...(e[__XenDroneStart.dronePreset]??Ud())},droneJIOvertonesByPreset:pj(e)}),d2e=(e,t)=>{const n={...e,...t};n.particleVolume=Math.min(hF,Math.max(0,n.particleVolume));const r=jH(n.particlePreset);return["crystal_bowl","shimmer_pad","velvet_bloom"].includes(r)&&(n.particleVolume=Math.min(n.particleVolume,r==="crystal_bowl"?.24:.22)),n},m2e=()=>{const t="ionian",n="12edo",r="ionian",a=MF("ji",t);return{...__XenDroneStart,gridOn:!0,showGrid:!0,lockCursorToGrid:!0,cursorSnap:!0,gridTuning:n,gridMode:r,manualGridMutedSteps:xF(r,n),manualGridStepOffsets:Array.from({length:12},()=>0),particleSystem:"ji",particlePreset:"dust_chime",churchMode:t,quantizeEvents:!0,quantizeOn:!0,quantizeBpm:108,drumActive:!0,drumOn:!0,drumPattern:"broken_lilt",drumKit:"dusty_tape",drumLaneKits:{...Ky},drumVolume:.52,drumEdge:Kn.edge,drumSoftness:Kn.softness,drumAir:Kn.air,drumSnap:Kn.snap,grooveSwing:Kn.swing,bassActive:!0,bassOn:!0,bassPattern:"forge_fractured",bassVolume:.1,bassTone:.48,bassGrit:.18,droneRhythmCustomSteps:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],droneDriveOn:!1,droneDriveAmount:.22,droneDriveTone:.52,droneDriveMix:.26,droneDriveOutput:.82,particleGradientX:"edge_spark",particleGradientY:"warm_center",particleVolume:.165,particleMute:!1,resonanceHotkeyMode:"material",agentEnabled:a,agentVolumes:a.map(()=>1)}};function p2e(e){P.useEffect(()=>{(()=>{const restored=__xenDronePersist.load();e.setDronePreset(restored.dronePreset||__XenDroneStart.dronePreset);e.updateNParams({...Object.fromEntries(Object.entries(m2e()).filter(([key])=>!__f350IsRhythmKey(key))),...restored});e.setDroneVolume(__xenDronePersist.loadVolume())})(),e.setWaveSoundVolume(.22),e.setWaveSoundPreset("tape_halo")},[])}const h2e=IT(Fd(),0),f2e={...h2e,formantWet:0};function g2e(e){const{enabled:t,myceliumSnapshotRef:n,myceliumDroneAmountRef:r,myceliumDroneModRef:a}=e;P.useEffect(()=>{if(!t){a.current=f2e;return}let o=0;const i=()=>{a.current=IT(n.current,r.current),o=requestAnimationFrame(i)};return o=requestAnimationFrame(i),()=>cancelAnimationFrame(o)},[t])}const b2e=(e,t,n)=>Math.min(n,Math.max(t,e));function y2e(e){const{audioCtx:t,impactDecayOn:n,particleVolume:r,nexusParamsRef:a,waveLaunchAtRef:o,waveImpactDecayRef:i}=e;P.useEffect(()=>{if(!n){i.current=1,a.current.particleVolume=r;return}let s=0;const l=()=>{const c=a.current,d=r;if(n&&o.current>0){const p=Ii(t),f=Math.max(0,p-o.current),b=b2e(1-f/1.25,.2,1);i.current=b,c.particleVolume=d*b}else i.current=1,c.particleVolume=d;s=requestAnimationFrame(l)};return s=requestAnimationFrame(l),()=>cancelAnimationFrame(s)},[t,n,r])}const S2e=(e,t,n)=>Math.min(n,Math.max(t,e));function v2e(e){const{audioCtx:t,nexusActive:n,resonanceInputActive:r,myzelEnabled:a,tParams:o,nParamsUI:i,myzelBallMode:s,myzelNodeMode:l,myzelDriveEnabled:c,myzelInterpreterMix:d,installationSharedFieldActive:p,myceliumSnapshotRef:f,myceliumDroneAmountRef:b,myceliumDroneModRef:g,myzelGateRef:y,myzelLayerModRef:x,installationSharedFieldActiveRef:A,keyboardWindowOffsetRef:M,setKeyboardWindowStamp:v,commitResonanceCursorY:w,nexusRefs:R,nexusParamsRef:k,impactDecayOn:I,waveLaunchAtRef:E,waveImpactDecayRef:F,resetResonanceActionHolds:L,releaseHeldScheduledTones:B}=e,O=P.useRef(w),T=P.useRef(B);P.useEffect(()=>{O.current=w},[w]),P.useEffect(()=>{T.current=B},[B]),P.useEffect(()=>{b.current=S2e(.12+o.intensityGlobal*.68,0,1)},[o.intensityGlobal]),g2e({enabled:a,myceliumSnapshotRef:f,myceliumDroneAmountRef:b,myceliumDroneModRef:g}),P.useEffect(()=>{if(a)return;y.current=0,x.current=ET(Fd(),o.intensityGlobal,i.bassRootHz,s,l);const _=R.current,G=t?.currentTime??0;_.myzelMasterGain?.gain.setTargetAtTime(1e-4,G,.05)},[a,t,o.intensityGlobal,i.bassRootHz,s,l]),P.useEffect(()=>{A.current=p},[p]),P.useEffect(()=>{M.current=0,v(_=>_+1),!__xenGridMuted(i)&&i.lockCursorToGrid&&O.current(R.current.cursorY,{syncHud:!1})},[i.lockCursorToGrid,i.gridBase,i.gridTuning,i.manualGridMutedSteps,i.manualGridStepOffsets,i.rootFollowImpulsRasterMuted]),y2e({audioCtx:t,impactDecayOn:I,particleVolume:i.particleVolume,nexusParamsRef:k,waveLaunchAtRef:E,waveImpactDecayRef:F}),P.useEffect(()=>{r||(L(),T.current())},[r,L]),P.useEffect(()=>{const _=R.current.myzelDriveShaper,G=R.current.myzelDriveGain;!_||!G||(_.curve=c?Tx(d.driveAmount):null,_.oversample=c?"4x":"none",G.gain.setTargetAtTime(c?Math.max(1,1+d.driveAmount*2.5):1,t?.currentTime??0,.04))},[t,c,d.driveAmount,n])}const g0=[];let O9=0;const Hb=(e,t)=>{const n=t.current;g0.push({sequence:++O9,atMs:typeof performance<"u"?performance.now():Date.now(),event:e,filterPresent:!!n.filter,gainPresent:!!n.gain,overtoneMasterPresent:!!n.overtoneMaster,jiVoiceCount:Object.keys(n.jiOscs).length,manualJiVoiceCount:Object.keys(n.manualJiOscs).length}),g0.length>128&&g0.splice(0,g0.length-128)},A2e=()=>g0.map(e=>({...e})),x2e=()=>{g0.length=0,O9=0};if(typeof globalThis<"u"){const e=globalThis;e.__XENSONAR_JI_OWNERSHIP_PROBE__??={read:A2e,clear:x2e}}function M2e(e,t,n){Object.keys(n.current.jiOscs).length===0&&oc.forEach(r=>{const a=e.createOscillator(),o=e.createGain();a.type="sine",o.gain.value=0,a.connect(o),o.connect(t),a.start(),n.current.jiOscs[r.label]=a,n.current.jiGains[r.label]=o})}function w2e(e){Object.values(e.current.jiOscs).forEach(t=>{t.stop(),t.disconnect()}),Object.values(e.current.jiGains).forEach(t=>t.disconnect()),e.current.jiOscs={},e.current.jiGains={}}function R2e(e){const{ctx:t,getLiveMasterBus:n,nexusRefs:r}=e,a=t.createOscillator(),o=t.createBiquadFilter(),i=t.createGain();a.type="sawtooth",a.frequency.value=110,o.type="lowpass",o.frequency.value=400,o.Q.value=2,i.gain.value=.02,a.connect(o),o.connect(i),a.start();const s=t.createDelay(3),l=t.createGain();return s.connect(l),l.connect(s),s.connect(n(t,"space")),r.current.osc=a,r.current.filter=o,r.current.gain=i,r.current.delayNode=s,r.current.delayFeedback=l,{osc:a,filter:o,gain:i,ensureJiLayer:()=>M2e(t,o,r),dispose:()=>{a.stop(),a.disconnect(),o.disconnect(),i.disconnect(),r.current.delayNode&&r.current.delayNode.disconnect(),r.current.delayFeedback&&r.current.delayFeedback.disconnect(),w2e(r)}}}function C2e(e,t,n){const r=e.createRadialGradient(t.cursorX,t.cursorY,0,vr/2,ir/2,vr);r.addColorStop(0,"#1a1525"),r.addColorStop(1,"#050508"),e.fillStyle=r,e.fillRect(0,0,vr,ir),e.strokeStyle="rgba(120, 90, 160, 0.06)",e.lineWidth=2;for(let a=0;a<8;a++){e.beginPath();for(let o=0;o<vr;o+=50){const i=ir/2+Math.sin(o*.005+n+a)*150*Math.sin(n*.2+a*.5);o===0?e.moveTo(o,i):e.lineTo(o,i)}e.stroke()}}
/* Refucktor Drone Pilot N21-F2: scale is owned by the existing instrument grid,
   pitch by the slider. Existing cursor-follow resonance/particles remain untouched. */
function __xenDroneIsPilot(p){return p==='dark_sub'||p==='ethereal_halo';}
function __xenDroneTargetHz(params){
  const raw=Math.max(27.5,Math.min(110,Number.isFinite(params.droneFixedHz)?params.droneFixedHz:55));
  if(!params.droneSnapToGrid)return raw;
  const notes=Fx(params.gridBase??440,params.gridTuning??'12edo',params.manualGridMutedSteps??[],params.manualGridStepOffsets??[]);
  let best=raw, distance=Infinity;
  for(const note of notes){
    if(!Number.isFinite(note)||note<27.5||note>110)continue;
    const d=Math.abs(Math.log2(note/raw));
    if(d<distance){distance=d;best=note;}
  }
  return best;
}

/* REFUCKTOR P2: this is the May 2026 Refucktor's REAL createDroneVoice graph.
   The old main-room drone graph is isolated by a zero-gain legacy gate.
   The new oscillator->filter->gain feeds ARCHIVED Refucktor echo/master/compressor;
   that independent output joins the shared DRONE VOLUME bus, bypassing Legacy FX.
   AudioNode LFO performs detune autonomously. Cursor visuals never retune it. */
function __xenRefucktorCreateDroneVoice(ctx, destination, frequency, preset) {
  const root = ctx.createOscillator();
  const upper = ctx.createOscillator();
  const gain = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = "lowpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.7;

  root.frequency.value = frequency;
  upper.frequency.value = frequency * 1.5;
  lfo.frequency.value = 0.11;
  lfoGain.gain.value = 14;
  lfo.connect(lfoGain);
  lfoGain.connect(root.detune);
  lfoGain.connect(upper.detune);

  switch (preset) {
    case "warm_pad":
      root.type = "triangle";
      upper.type = "sine";
      gain.gain.value = 0.08;
      break;
    case "reed_drone":
      root.type = "sawtooth";
      upper.type = "triangle";
      gain.gain.value = 0.055;
      filter.frequency.value = 1400;
      break;
    case "pulse_matrix":
      root.type = "square";
      upper.type = "square";
      gain.gain.value = 0.03;
      lfo.frequency.value = 1.4;
      lfoGain.gain.value = 22;
      break;
    case "dark_sub":
      root.type = "sine";
      upper.type = "triangle";
      gain.gain.value = 0.11;
      filter.frequency.value = 700;
      break;
    case "ethereal_halo":
      root.type = "sine";
      upper.type = "sine";
      gain.gain.value = 0.06;
      filter.frequency.value = 2200;
      break;
  }

  const targetGain = Math.max(gain.gain.value, 0.0001);
  gain.gain.value = 0.0001;

  root.connect(filter);
  upper.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  const startAt = ctx.currentTime + 0.01;
  gain.gain.cancelScheduledValues(startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(targetGain, startAt + 0.28);

  root.start(startAt);
  upper.start(startAt);
  lfo.start(startAt);

  return {
    root, upper, gain, filter, lfo, lfoGain,
    stop: () => {
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      root.stop(t + 0.7);
      upper.stop(t + 0.7);
      lfo.stop(t + 0.7);
    },
  };
}

function __xenRefucktorCreateEcho(ctx) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const wet = ctx.createGain();
  const dry = ctx.createGain();
  const feedback = ctx.createGain();
  const delayA = ctx.createDelay(1.5);
  const delayB = ctx.createDelay(1.5);
  delayA.delayTime.value = 0.27;
  delayB.delayTime.value = 0.41;
  feedback.gain.value = 0.28;
  wet.gain.value = 0.22;
  dry.gain.value = 1;

  input.connect(dry);
  input.connect(delayA);
  delayA.connect(delayB);
  delayB.connect(feedback);
  feedback.connect(delayA);
  delayB.connect(wet);
  dry.connect(output);
  wet.connect(output);

  return { input, output, wet, dry, feedback };
}

// Source: Refucktor room mix graph, May 2026. Power gate is already owned
// by XenSonar's main-room mixer and must not be duplicated in the Drone.

/* P3: independent Refucktor Drone Workbench, native AudioNode modulation. */
function __xenRefucktorWobbleCurve(shape){
  const out=new Float32Array(1024);
  for(let i=0;i<out.length;i++){
    const x=2*i/(out.length-1)-1;
    let y=(x+1)*.5;
    if(shape==='Square')y=.5+.5*Math.tanh(7*x);
    else if(shape==='Growl')y=.5+.5*Math.tanh(2.5*x+.5*Math.sin(7*x));
    else if(shape==='Triangle')y=Math.abs(x);
    // Saw Down uses a native sawtooth oscillator, with a linear unipolar transfer.
    out[i]=Math.min(1,Math.max(0,y));
  }
  return out;
}
const __xenRefucktorStepCurveCache=new Map();
function __xenRefucktorStepCurve(type){
  const cached=__xenRefucktorStepCurveCache.get(type);if(cached)return cached;
  const curve=new Float32Array(64);
  for(let i=0;i<64;i++){
    const p=i/63;
    let v=1;
    if(type===1)v=.5+.5*Math.cos(2*Math.PI*p); // smooth falling and rising sweep
    if(type===2)v=(p<.25||p>.75)?1:.04;  // chop / center cut
    if(type===3)v=p; // rising ramp
    if(type===4)v=.5+.5*Math.cos(4*Math.PI*p); // double growl
    curve[i]=Math.max(0,Math.min(1,v));
  }
  __xenRefucktorStepCurveCache.set(type,curve);return curve;
}
function __xenRefucktorBuildWorkbenchFX(ctx,destination){
  const input=ctx.createGain(),dry=ctx.createGain(),pre=ctx.createGain();
  const crusher=ctx.createWaveShaper(),wet=ctx.createGain(),tone=ctx.createBiquadFilter();
  tone.type='lowpass';tone.frequency.value=6500;tone.Q.value=.6;
  const output=ctx.createGain(),mute=ctx.createGain();
  dry.gain.value=1;wet.gain.value=0;mute.gain.value=1;
  const curve=new Float32Array(1024);
  for(let i=0;i<curve.length;i++){const x=2*i/(curve.length-1)-1;curve[i]=Math.tanh(x*3)/Math.tanh(3);}
  crusher.curve=curve;crusher.oversample='2x';pre.gain.value=1;
  input.connect(dry);dry.connect(output);
  input.connect(pre);pre.connect(crusher);crusher.connect(tone);tone.connect(wet);wet.connect(output);
  const flangerDry=ctx.createGain(),flangerDelay=ctx.createDelay(.1),flangerWet=ctx.createGain();
  const flangerFeedback=ctx.createGain(),flangerLfo=ctx.createOscillator(),flangerMod=ctx.createGain();
  flangerDry.gain.value=1;flangerWet.gain.value=0;flangerFeedback.gain.value=.22;
  flangerDelay.delayTime.value=.009;flangerLfo.frequency.value=.23;flangerMod.gain.value=.003;
  output.connect(flangerDry);flangerDry.connect(mute);
  output.connect(flangerDelay);flangerDelay.connect(flangerWet);flangerWet.connect(mute);
  flangerDelay.connect(flangerFeedback);flangerFeedback.connect(flangerDelay);
  flangerLfo.connect(flangerMod);flangerMod.connect(flangerDelay.delayTime);flangerLfo.start();
  mute.connect(destination);
  const wobbleOsc=ctx.createOscillator(),wobbleShaper=ctx.createWaveShaper(),stepShape=ctx.createGain(),wobbleDepth=ctx.createGain();
  wobbleOsc.type='sine';wobbleOsc.frequency.value=2;wobbleShaper.curve=__xenRefucktorWobbleCurve('Sine');
  wobbleDepth.gain.value=0;stepShape.gain.value=1;
  wobbleOsc.connect(wobbleShaper);wobbleShaper.connect(stepShape);stepShape.connect(wobbleDepth);wobbleOsc.start();
  return {ctx,input,dry,pre,crusher,tone,wet,output,mute,wobbleOsc,wobbleShaper,stepShape,wobbleDepth,
          flangerDry,flangerDelay,flangerWet,flangerFeedback,flangerLfo,flangerMod,flangerAmount:null,
          patternTimer:null,patternUntil:0,patternStep:0,patternLastValue:1,patternKey:null,shape:null,rate:null,depth:null,drive:null};
}
function __xenRefucktorStopPattern(fx){
  if(fx?.patternTimer!=null){clearInterval(fx.patternTimer);fx.patternTimer=null;}
  if(!fx)return;
  const t=fx.ctx.currentTime;fx.mute.gain.cancelScheduledValues(t);
  fx.stepShape.gain.cancelScheduledValues(t);fx.stepShape.gain.setTargetAtTime(1,t,.009);
  fx.mute.gain.setTargetAtTime(1,t,.009);fx.patternKey=null;
  fx.patternUntil=0;fx.patternStep=0;fx.patternLastValue=1;
}
function __xenRefucktorScheduleMute(fx,params){
  const ctx=fx.ctx,bpm=Math.min(260,Math.max(40,Number(params.quantizeBpm)||120));
  const mode=params.droneRhythm||'Off';
  if(fx.patternMode===mode&&fx.patternBpm===bpm&&fx.patternStepsRef===params.droneRhythmCustomSteps&&
     fx.patternShapesRef===params.droneStepWobbleShapes&&
     (fx.patternTimer!=null || (mode==='Off'&&!fx.patternHasShapes)))return;
  fx.patternMode=mode;fx.patternBpm=bpm;
  fx.patternStepsRef=params.droneRhythmCustomSteps;fx.patternShapesRef=params.droneStepWobbleShapes;
  const stepTypes=Array.isArray(params.droneStepWobbleShapes)?params.droneStepWobbleShapes:[];
  const hasStepShapes=stepTypes.some(v=>v>0);fx.patternHasShapes=hasStepShapes;
  if(mode==='Off'&&!hasStepShapes){
    if(fx.patternTimer!=null||fx.patternKey!==null)__xenRefucktorStopPattern(fx);
    return;
  }
  const steps=mode==='Custom'?Sy(params.droneRhythmCustomSteps):$6(mode,params.droneRhythmCustomSteps);
  const stepDuration=60/bpm/4;
  const key=mode+'|'+bpm+'|'+steps.join('')+'|'+stepTypes.join(',');
  if(fx.patternKey!==key){
    if(fx.patternTimer!=null){clearInterval(fx.patternTimer);fx.patternTimer=null;}
    const now=ctx.currentTime;fx.mute.gain.cancelScheduledValues(now);
    fx.mute.gain.setTargetAtTime(1,now,.007);
    fx.stepShape.gain.cancelScheduledValues(now);fx.stepShape.gain.setTargetAtTime(1,now,.007);
    fx.patternKey=key;fx.patternStep=0;fx.patternLastValue=1;fx.patternUntil=now+.04;
  }
  if(fx.patternTimer==null){
    fx.patternTimer=setInterval(()=>{
      if(fx.ctx.state==='closed'){__xenRefucktorStopPattern(fx);return;}
      __xenRefucktorFillPattern(fx,params);
    },25);
  }
  __xenRefucktorFillPattern(fx,params);
}
function __xenRefucktorFillPattern(fx,params){
  const ctx=fx.ctx,bpm=Math.min(260,Math.max(40,Number(params.quantizeBpm)||120));
  const mode=params.droneRhythm||'Off';
  const stepTypes=Array.isArray(params.droneStepWobbleShapes)?params.droneStepWobbleShapes:[];
  if(mode==='Off'&&!stepTypes.some(v=>v>0))return;
  const steps=mode==='Custom'?Sy(params.droneRhythmCustomSteps):$6(mode,params.droneRhythmCustomSteps);
  const duration=60/bpm/4;
  const now=ctx.currentTime;
  // Never catch up stale patterns after a main-thread stall; skip historical steps.
  if(fx.patternUntil < now+.012){
    fx.mute.gain.cancelScheduledValues(now);
    fx.mute.gain.setValueAtTime(fx.patternLastValue,now);
    fx.stepShape.gain.cancelScheduledValues(now);fx.stepShape.gain.setValueAtTime(1,now);
    fx.patternUntil=now+.035;
    // Resynchronize the index to the next scheduled step, avoiding a burst of old events.
  }
  let count=0;
  while(fx.patternUntil<now+.23 && count++<8){
    const i=fx.patternStep%16;
    const on=steps[i]!==0;
    // For pulse patterns a single ON step remains open until the next OFF step.
    const value=on?1:.0001,at=fx.patternUntil;
    fx.mute.gain.setValueAtTime(fx.patternLastValue,at);
    fx.mute.gain.linearRampToValueAtTime(value,at+Math.min(.008,duration*.12));
    const stepType=Math.max(0,Math.min(4,Number(stepTypes[i])||0));
    if(stepType){fx.stepShape.gain.setValueCurveAtTime(__xenRefucktorStepCurve(stepType),at,duration*.98);}
    else fx.stepShape.gain.setValueAtTime(1,at);
    fx.patternLastValue=value;fx.patternUntil+=duration;fx.patternStep++;
  }
}
const __xenRefucktorRateMultipliers=Object.freeze({'1/4':1,'1/8':2,'1/8T':3,'1/16':4,'1/32':8});
function __xenRefucktorSyncWorkbench(fx,voice,params){
  const ctx=fx.ctx,t=ctx.currentTime;
  // A completely neutral Workbench leaves the archived Refucktor PCM unchanged.
  const shape=params.droneWobbleShape||'Sine';
  if(fx.shape!==shape){fx.wobbleOsc.type=shape==='Saw Down'?'sawtooth':shape==='Triangle'?'triangle':shape==='Square'?'square':'sine';
    fx.wobbleShaper.curve=__xenRefucktorWobbleCurve(shape);fx.shape=shape;}
  const rate=params.droneWobbleRate||'1/8';
  const rateMultiplier=__xenRefucktorRateMultipliers[rate]||2;
  const bpm=Math.min(260,Math.max(40,Number(params.quantizeBpm)||120));
  const hz=bpm/60*rateMultiplier;
  if(fx.rate!==hz){fx.wobbleOsc.frequency.setTargetAtTime(hz,t,.04);fx.rate=hz;}
  const wobble=Math.max(0,Math.min(1,params.droneWobbleDepth??0));
  const baseCut=voice&&((params.dronePreset==='dark_sub'?700:2200)*Math.pow(2,((params.droneTimbre??.5)-.5)*2))||700;
  const depth=wobble*baseCut*3.5;
  if(fx.depth!==depth){fx.wobbleDepth.gain.setTargetAtTime(depth,t,.035);fx.depth=depth;}
  if(fx.wobbleTarget!==voice?.filter){
    try{fx.wobbleDepth.disconnect()}catch{}
    if(voice?.filter)fx.wobbleDepth.connect(voice.filter.frequency);
    fx.wobbleTarget=voice?.filter||null;
  }
  const drive=Math.max(0,Math.min(1,params.droneDubDrive??0));
  if(fx.drive!==drive){
    fx.pre.gain.setTargetAtTime(1+22*drive,t,.035);
    fx.dry.gain.setTargetAtTime(1-.72*drive,t,.035);
    fx.wet.gain.setTargetAtTime(.62*drive,t,.035);
    fx.tone.frequency.setTargetAtTime(6500-3900*drive,t,.06);
    fx.drive=drive;
  }
  const flanger=Math.max(0,Math.min(1,params.droneFlanger??0));
  if(fx.flangerAmount!==flanger){
    fx.flangerWet.gain.setTargetAtTime(.53*flanger,t,.04);
    fx.flangerDry.gain.setTargetAtTime(1-.19*flanger,t,.04);
    fx.flangerAmount=flanger;
  }
  __xenRefucktorScheduleMute(fx,params);
}

function __xenRefucktorBuildSubmix(ctx,destination){
  const echo=__xenRefucktorCreateEcho(ctx);
  const master=ctx.createGain();master.gain.value=.72;
  const compressor=ctx.createDynamicsCompressor();
  compressor.threshold.value=-22;compressor.knee.value=18;compressor.ratio.value=4;
  compressor.attack.value=.003;compressor.release.value=.18;
  const output=ctx.createGain();output.gain.value=.92;
  const fx=__xenRefucktorBuildWorkbenchFX(ctx,echo.input);
  echo.output.connect(master);master.connect(compressor);
  compressor.connect(output);output.connect(destination);
  // Original DEFAULT_PARAMS are applied once after the createEcho defaults.
  echo.feedback.gain.value=.32;echo.wet.gain.value=.24;
  return {ctx,echo,master,compressor,output,fx};
}
function __xenRefucktorDispose(state){
  __xenRefucktorStop(state);
  const mix=state?.__xenRefucktorSubmix;
  if(mix){
    __xenRefucktorStopPattern(mix.fx);
    try{mix.fx.wobbleOsc.stop()}catch{}
    try{mix.fx.flangerLfo.stop()}catch{}
    try{mix.fx.wobbleDepth.disconnect()}catch{}
    for(const node of [mix.fx.input,mix.fx.dry,mix.fx.pre,mix.fx.crusher,mix.fx.tone,mix.fx.wet,
                       mix.fx.output,mix.fx.mute,mix.fx.wobbleOsc,mix.fx.wobbleShaper,mix.fx.stepShape,mix.fx.wobbleDepth,
                       mix.fx.flangerDry,mix.fx.flangerDelay,mix.fx.flangerWet,mix.fx.flangerFeedback,mix.fx.flangerLfo,mix.fx.flangerMod]){
      try{node.disconnect()}catch{}
    }
    for(const node of [mix.echo.input,mix.echo.output,mix.echo.wet,mix.echo.dry,mix.echo.feedback,
                       mix.master,mix.compressor,mix.output]){
      try{node.disconnect()}catch{}
    }
    state.__xenRefucktorSubmix=null;
  }
}
function __xenRefucktorStop(state){
  const voice=state?.__xenRefucktorVoice;
  if(!voice)return;
  state.__xenRefucktorVoice=null;
  state.__xenRefucktorPreset=null;
  state.__xenRefucktorHz=undefined;
  try{voice.stop()}catch{}
  // When oscillator ends, unlink its isolated graph, not the common mixer.
  voice.root.onended=()=>{
    for(const node of [voice.root,voice.upper,voice.filter,voice.gain,voice.lfo,voice.lfoGain]){
      try{node.disconnect()}catch{}
    }
  };
}
function __xenRefucktorSync(e){
  const {ctx,state:n,params:r}=e;
  // Nothing in this standalone sound controls other cursor-driven instruments.
  const cursorFreq=55+(1-n.cursorY/ir)*385;
  const on=__xenDroneIsPilot(r.dronePreset);
  if(n.__xenLegacyDroneGate&&n.__xenLegacyDroneGateValue!==on){
    n.__xenLegacyDroneGate.gain.setTargetAtTime(on?0:1,ctx.currentTime,.013);
    n.__xenLegacyDroneGateValue=on;
  }
  if(!on){if(n.__xenRefucktorSubmix)__xenRefucktorDispose(n);return cursorFreq;}
  // The regular routing boundary installs the shared volume bus once per ctx.
  if(!n.droneVolumeBus)return cursorFreq;
  const preset=r.dronePreset;
  if(!n.__xenRefucktorSubmix||n.__xenRefucktorSubmix.ctx!==ctx){
    if(n.__xenRefucktorSubmix)__xenRefucktorDispose(n);
    n.__xenRefucktorSubmix=__xenRefucktorBuildSubmix(ctx,n.droneVolumeBus);
    n.__xenRefucktorEcho=.24;n.__xenRefucktorFeedback=.32;
  }
  // The anchor stays free or snapped. Cursor movement only affects pitch when explicitly enabled.
  const baseRaw=Math.max(27.5,Math.min(110,Number.isFinite(r.droneFixedHz)?r.droneFixedHz:55));
  const derivedGridRev=__XenBassGrid.revision();
  const now=ctx.currentTime,follow=!!r.droneCursorFollow;
  const heldY=__xenKeyboardFoundationDetach.cursorY();
   const cursorPos=Math.max(0,Math.min(1,1-(heldY??n.cursorY)/ir));
  const depth=Math.max(0,Math.min(1,r.droneCursorAmount??.5));
  const movePitch=follow?Math.max(27.5,Math.min(110,baseRaw*Math.pow(2,(cursorPos-.5)*4*depth))):baseRaw;
  const gridChanged=n.__xenRefucktorGridBase!==r.gridBase||n.__xenRefucktorGridTuning!==r.gridTuning||
    n.__xenRefucktorMutedSteps!==r.manualGridMutedSteps||n.__xenRefucktorOffsets!==r.manualGridStepOffsets;
  if(gridChanged){
    n.__xenRefucktorSnapNotes=Fx(r.gridBase??440,r.gridTuning??'12edo',r.manualGridMutedSteps??[],r.manualGridStepOffsets??[])
      .filter(h=>Number.isFinite(h)&&h>=27.5&&h<=110);
    n.__xenRefucktorGridBase=r.gridBase;n.__xenRefucktorGridTuning=r.gridTuning;
    n.__xenRefucktorMutedSteps=r.manualGridMutedSteps;n.__xenRefucktorOffsets=r.manualGridStepOffsets;
  }
  if(!follow||now-(n.__xenRefucktorPitchAt??-1)>.035||n.__xenRefucktorGridRaw!==r.droneFixedHz||
     n.__xenRefucktorGridSnap!==r.droneSnapToGrid||n.__xenRefucktorGridFollow!==follow||
     n.__xenRefucktorCursorAmount!==depth||n.__xenRefucktorDerivedGridRev!==derivedGridRev||gridChanged){
    let target=movePitch;
    if(__XenBassGrid.droneUsesGrid(r)){target=__XenBassGrid.quantizeDrone(movePitch)}
    else if(r.droneSnapToGrid){let best=Infinity;for(const h of n.__xenRefucktorSnapNotes||[]){
      const dist=Math.abs(Math.log2(h/movePitch));if(dist<best){best=dist;target=h;}
    }}
    n.__xenRefucktorTargetHz=target;n.__xenRefucktorPitchAt=now;
    n.__xenRefucktorGridRaw=r.droneFixedHz;n.__xenRefucktorGridSnap=r.droneSnapToGrid;
    n.__xenRefucktorGridFollow=follow;n.__xenRefucktorCursorAmount=depth;
    n.__xenRefucktorDerivedGridRev=derivedGridRev;
  }
  const hz=n.__xenRefucktorTargetHz;
  if(n.__xenRefucktorPreset!==preset||n.__xenRefucktorContext!==ctx){
    __xenRefucktorStop(n);
    n.__xenRefucktorVoice=__xenRefucktorCreateDroneVoice(ctx,n.__xenRefucktorSubmix.fx.input,hz,preset);
    n.__xenRefucktorPreset=preset;
    n.__xenRefucktorContext=ctx;
    n.__xenRefucktorHz=hz;
    n.__xenRefucktorTimbre=.5;
    n.__xenRefucktorWobble=.5;
  }
  const voice=n.__xenRefucktorVoice;
  if(!voice)return cursorFreq;
  const echoAmt=Math.max(0,Math.min(.85,r.droneRefucktorEcho??.24));
  const feedbackAmt=Math.max(0,Math.min(.85,r.droneRefucktorFeedback??.32));
  if(echoAmt!==n.__xenRefucktorEcho){
    n.__xenRefucktorSubmix.echo.wet.gain.setTargetAtTime(echoAmt,ctx.currentTime,.045);
    n.__xenRefucktorEcho=echoAmt;
  }
  if(feedbackAmt!==n.__xenRefucktorFeedback){
    n.__xenRefucktorSubmix.echo.feedback.gain.setTargetAtTime(feedbackAmt,ctx.currentTime,.045);
    n.__xenRefucktorFeedback=feedbackAmt;
  }
  if(hz!==n.__xenRefucktorHz){
    voice.root.frequency.setTargetAtTime(hz,ctx.currentTime,.07);
    voice.upper.frequency.setTargetAtTime(hz*1.5,ctx.currentTime,.07);
    n.__xenRefucktorHz=hz;
  }
  // Neutral controls exactly reproduce the archived sound, including filter.
  const timbre=Math.max(0,Math.min(1,r.droneTimbre??.5));
  if(timbre!==n.__xenRefucktorTimbre){
    const archiveCutoff=preset==='dark_sub'?700:2200;
    voice.filter.frequency.setTargetAtTime(archiveCutoff*Math.pow(2,(timbre-.5)*2),ctx.currentTime,.15);
    n.__xenRefucktorTimbre=timbre;
  }
  const wobble=Math.max(0,Math.min(1,r.droneVibrato??.5));
  if(wobble!==n.__xenRefucktorWobble){
    voice.lfoGain.gain.setTargetAtTime(28*wobble,ctx.currentTime,.12);
    n.__xenRefucktorWobble=wobble;
  }
  __xenRefucktorSyncWorkbench(n.__xenRefucktorSubmix.fx,voice,r);
  return cursorFreq;
}
function k2e(e){if(__xenDroneIsPilot(e.params.dronePreset))return __xenRefucktorSync(e);__xenRefucktorSync(e);const{ctx:t,state:n,params:r,t:a,osc:o,filter:i,gain:s,myceliumDroneModRef:l,myzelEnabled:c,myzelLayerModRef:d,myzelGateRef:p,room3BodyEnabled:f,room3TimbreStateRef:b,droneVolume:g}=e,y=Ix[r.dronePreset]??Ix.warm_pad,x=Me(r.droneTimbre,0,1),A=Math.pow(x,1.15),M=Math.log2(y.overtoneRatio)*1200,v=l.current,w=c?d.current:null,R=c?p.current:0,k=f&&c?b.current:null,I=55+(1-n.cursorY/ir)*385,E=w?Me(.88+w.lowpassHz/3200*.28+R*.12+w.shimmer*1.5,.78,1.45):1,F=w?1+R*.06+w.shimmer*.55:1,L=w?DF(I,w.baseHz,Me(.08+R*.12+w.shimmer*.22,0,.32),kx,Up):I,B=k?Me(.92+k.air*.16+k.resonanceFocus*.14-k.damping*.08,.82,1.34):1,O=(y.cutoffBase+n.cursorX/vr*y.cutoffSpan)*(1+v.filterBias)*E*B*Math.pow(2,(x-.5)*(y.timbreCutoffOctaves??0));n.wobble*=.975,n.wobblePhase+=.15+n.wobble*.25;const T=Math.sin(n.wobblePhase)*n.wobble,_=Me((r.droneVibrato||0)+v.vibratoBias,0,1),G=Math.pow(2,Math.sin(a*(y.vibratoRateHz??5)*Math.PI*2)*(y.vibratoCents??50)*_/1200),j=(L+T*4)*G,N=t.currentTime,W=g<=5e-4;return n.myceliumFormantFilter&&n.myceliumFormantGain&&(n.myceliumFormantFilter.frequency.setTargetAtTime(v.formantCenterHz,N,.18),n.myceliumFormantFilter.Q.setTargetAtTime(v.formantQ,N,.18),n.myceliumFormantGain.gain.setTargetAtTime(W?0:v.formantWet,N,W?.025:.18)),y.colourMorph?__xenDroneColour(t,o,x,n):o.type!==y.oscA&&(o.type=y.oscA),i.type!==y.filterType&&(i.type=y.filterType),o.frequency.setTargetAtTime(j,N,.15),i.frequency.setTargetAtTime(O+T*800,N,.15),i.Q.setTargetAtTime(y.qBase+x*y.qSpan+(k?.resonanceFocus??0)*.9,N,.15),s.gain.setTargetAtTime(W?1e-4:(y.gainA+x*y.gainASpan+T*.015)*F*(1+(k?.bodyMix??0)*.06),N,W?.025:.15),n.oscB&&n.gainB&&(n.oscB.type!==y.oscB&&(n.oscB.type=y.oscB),n.oscB.frequency.setTargetAtTime(j,N,.15),n.oscB.detune.setTargetAtTime(M+A*y.overtoneDriftCents+(k?.inharmonicity??0)*22,N,.15),n.gainB.gain.setTargetAtTime(W?1e-4:(y.gainBBase+A*y.gainBProfile)*(1+R*.08+(k?.partialGroups.formant??0)*.04),N,W?.025:.15)),n.lfo&&n.lfoGain&&(n.lfo.frequency.setTargetAtTime(y.lfoBase+x*y.lfoSpan,N,.15),n.lfoGain.gain.setTargetAtTime(2+x*10,N,.15)),oc.forEach(V=>{const U=n.jiOscs[V.label],H=n.jiGains[V.label];if(U&&H){U.frequency.setTargetAtTime(j*V.ratio,N,.15);const K=r.droneJIOvertones[V.label]||0;H.gain.setTargetAtTime(W?0:K*.015,N,W?.025:.15)}const q=n.manualJiOscs[V.label];q&&q.frequency.setTargetAtTime(j*V.ratio,N,.15)}),n.delayNode&&n.delayFeedback&&(n.delayNode.delayTime.setTargetAtTime(r.echoTempo/1e3,N,.1),n.delayFeedback.gain.setTargetAtTime(!W&&r.echoOn?Me(r.echoDecay??.6,0,.96):0,N,W?.025:.1)),I}function P2e(e){const{active:t,config:n,cursor:r,oscillatorBall:a}=e;if(!t)return[{x:r.x,y:r.y,weight:1}];const o=[];return n.nomadAttractors.cursor&&o.push({x:r.x,y:r.y,weight:1}),n.nomadAttractors.oscillatorBall&&a&&o.push({x:a.x,y:a.y,weight:1.2}),o}function nO(e){return Tj(e.eventSoundSelectionId??e.fallbackResidentSound,{elasticPitch:!!e.elasticPitchEnabled})}function I2e(e){const t=LRe({active:e.active,config:e.config,nodes:e.nodes,oscillatorBall:e.oscillatorBall,sourceWidth:e.sourceWidth,sourceHeight:e.sourceHeight,targetWidth:e.targetWidth,targetHeight:e.targetHeight}),n=BRe({frame:t,active:e.active,config:e.config,ripples:e.ripples,sectorPulses:e.sectorPulses,nowMs:e.nowMs,targetFreq:e.targetFreq});if(n.length===0)return{residentEventCount:0,queuedEventCount:0,directEventCount:0,quantized:e.quantizeOn};if(e.quantizeOn){const r=e.audioCtx;if(!r)return{residentEventCount:n.length,queuedEventCount:0,directEventCount:0,quantized:!0};const a=Ii(r),o=yS(e.gridTempoBpm,e.quantizeGrid,e.quantizeReferenceBars??1),i=OH(e.quantizeAnchorRef.current,a);return e.quantizeAnchorRef.current=i,n.forEach(s=>{const l=nO({eventSoundSelectionId:s.soundSelectionId,elasticPitchEnabled:s.elasticPitchEnabled,fallbackResidentSound:e.config.residentSound}),c=`resident:${s.targetId}:${s.sourceKind}`,d=_H({nowSec:a,stepSec:o,anchorSec:i,sourceKey:c,targetKind:"resident"});zH(e.waveCollisionQueueRef.current,{dueTime:d.dueTime,macroDueTime:d.macroDueTime,sourceKey:c,freq:s.freq*l.collision.freqMul,amp:jP(e.config,s.amp,l.collision.ampMul),preset:l.collision.preset,x:s.x,y:s.y,waveGain:s.waveGain,targetKind:"resident"})}),{residentEventCount:n.length,queuedEventCount:n.length,directEventCount:0,quantized:!0}}return n.forEach(r=>{const a=nO({eventSoundSelectionId:r.soundSelectionId,elasticPitchEnabled:r.elasticPitchEnabled,fallbackResidentSound:e.config.residentSound});e.playNexusAgentTone(r.freq*a.collision.freqMul,jP(e.config,r.amp,a.collision.ampMul),e.echoOn&&e.delayNode?e.delayNode:void 0,void 0,a.collision.preset,void 0,"resident")}),{residentEventCount:n.length,queuedEventCount:0,directEventCount:n.length,quantized:!1}}const E2e={passThroughCount:5,denseFrameMaxIntents:10,strongGainThreshold:.68,diversityBonus:.075},F2e=e=>e.particleMute,T2e=e=>e.quantizeOn||e.particleMute;function oE(e,t){const n=Math.max(0,t.agentVolumes[e.agentIndex]??1),r=t.agentEnabled[e.agentIndex]===!1?0:1,a=e.sourceKind==="sector"?1.035:1,o=t.performancePolicy?.preferDiverseImpacts?1+(t.performancePolicy.diversityBonus??0):1;return r*a*o*Math.pow(Math.max(0,e.waveGain),1.35)*Math.sqrt(Math.max(.01,n))}function L2e(e,t){const n={...E2e,...t.performancePolicy??{}},r=e.filter(g=>t.agentEnabled[g.agentIndex]!==!1&&oE(g,t)>0);if(r.length<=n.passThroughCount)return r.length;const a=Math.max(0,Math.min(1,(r.length-n.passThroughCount)/Math.max(1,n.denseFrameMaxIntents+n.passThroughCount))),o=DH(t.performancePolicy,a,"audio-intent"),i=(g,y=n.passThroughCount)=>Math.min(r.length,Math.max(Math.max(1,y),Math.round(g*o)));if(n.crisisMode==="off")return i(Math.min(r.length,Math.max(n.passThroughCount,n.denseFrameMaxIntents)),n.passThroughCount);const s=r.filter(g=>g.waveGain>=n.strongGainThreshold).length,l=n.passThroughCount+Math.floor(Math.sqrt(r.length)),c=Math.ceil(s*.5),d=n.smoothBeforeThin?Math.min(3,Math.ceil((n.maxMicroDelayMs??0)/8)):0,p=n.crisisMode==="quantization-liberation"?Math.min(3,n.liberationMaxEventsPerWindow??0):0,f=Math.min(r.length,Math.max(1,n.denseFrameMaxIntents),Math.max(n.passThroughCount+1,l+c+d+p)),b=n.loadReduction?.preserveStrongImpacts?Math.min(f,Math.max(n.passThroughCount,Math.ceil(s*.55))):n.passThroughCount;return i(f,b)}function B2e(e){const{candidates:t,params:n}=e;if(F2e(n)||t.length===0)return[];const r=L2e(t,n);if(t.length<=r)return t.filter(s=>n.agentEnabled[s.agentIndex]!==!1);const a=[],o=new Set,i=[...t].filter(s=>n.agentEnabled[s.agentIndex]!==!1).sort((s,l)=>oE(l,n)-oE(s,n));for(const s of i){if(a.length>=r)break;o.has(s.agentIndex)||(a.push(s),o.add(s.agentIndex))}for(const s of i){if(a.length>=r)break;a.includes(s)||a.push(s)}return a.sort((s,l)=>s.agentIndex-l.agentIndex)}function D2e(e){const{candidate:t,params:n,onParticleTone:r}=e,{agent:a,agentIndex:o,targetFreq:i,waveGain:s}=t;if(a.lastAudioIntentHit=t.frameNowMs,a.lastAudioIntentAudioTimeSec=t.audioTimeSec,a.lastAudioIntentGain=s,a.lastAudioIntentX=t.x,a.lastAudioIntentY=t.y,T2e(n))return;const l=n.particleVolume*(n.agentVolumes[o]??1)*Math.pow(s,2.2),c=NT({rootFreq:i,ratio:a.ratio,minHz:80,maxHz:2400});r({agentIndex:o,playbackFreq:c.playbackFreq,rootFreq:c.rootFreq,volume:l,position:{x:t.x,y:t.y}})}const _9={maxImpactRipples:260,maxAgentSpeed:2.5,hitCooldownMs:400,shellThicknessPx:8,impactRippleMaxRadius:64,impactRippleMinLife:.02,impactRippleRadiusStep:1.85,impactRippleLifeStep:.046,historyLimit:25,edgeMarginPx:50,edgePush:.1,randomDrift:.15,attractorRadiusPx:250,attractorStrength:.04};function rO(e){const t=bj(e.params.particleSystem,e.agentIndex,e.state.agents.length);e.state.impactRipples.push({x:e.x,y:e.y,radius:2,life:1,hue:t});const n=e.state.impactRipples.length-_9.maxImpactRipples;n>0&&e.state.impactRipples.splice(0,n)}function N2e(e){const{state:t,params:n,frameNowMs:r,particleMotionScale:a,waveMotionScale:o,baseWaveSpeed:i,targetFreq:s,installationAttractors:l,fieldWidth:c,fieldHeight:d,audioNowSec:p,onParticleTone:f}=e,b=_9,g=i*o,y=[],w=a;t.impactRipples=t.impactRipples.filter(k=>k.life>b.impactRippleMinLife&&k.radius<b.impactRippleMaxRadius);for(let k=0;k<t.impactRipples.length;k+=1){const I=t.impactRipples[k];I.radius+=b.impactRippleRadiusStep*a,I.life-=b.impactRippleLifeStep*a}for(let k=0;k<t.agents.length;k+=1){const I=t.agents[k];I.vx+=(Math.random()-.5)*b.randomDrift*w,I.vy+=(Math.random()-.5)*b.randomDrift*w;for(let O=0;O<l.length;O+=1){const T=l[O],_=T.x-I.x,G=T.y-I.y,j=Math.max(1,Math.hypot(_,G));if(j<b.attractorRadiusPx){const N=b.attractorStrength*T.weight*w;I.vx+=_/j*N,I.vy+=G/j*N}}for(let O=0;O<t.ripples.length;O+=1){const T=t.ripples[O],_=T.x-I.x,G=T.y-I.y,j=Math.hypot(_,G),N=T.prevRadius??Math.max(0,T.radius-g);if(!AM(j,N,T.radius,b.shellThicknessPx)||r-I.lastHit<=b.hitCooldownMs)continue;const W=xM(j,N,T.radius);I.lastHit=r,I.lastHitAudioTimeSec=p(),rO({state:t,params:n,agentIndex:k,x:I.x,y:I.y});const V=T.maxRadius>0?(N+(T.radius-N)*W)/T.maxRadius:0,U=Ex(V,T.decay);I.lastHitGain=U,I.lastHitX=I.x,I.lastHitY=I.y,I.vx-=_/Math.max(1,j)*3,I.vy-=G/Math.max(1,j)*3,t.wobble=Math.min(1,t.wobble+.35),y.push({agent:I,agentIndex:k,frameNowMs:r,audioTimeSec:I.lastHitAudioTimeSec??p(),waveGain:U,x:I.x,y:I.y,targetFreq:s,sourceKind:"ripple"})}for(let O=0;O<t.sectorPulses.length;O+=1){const T=t.sectorPulses[O];if(T.hitAgents.includes(k))continue;const _=I.x-T.x,G=I.y-T.y,j=Math.hypot(_,G),N=T.prevRadius??Math.max(0,T.radius-g);if(!AM(j,N,T.radius,b.shellThicknessPx))continue;const W=k9(T.direction),V=Math.PI/4,U=Math.atan2(G,_),H=C9(U,W);if(Math.abs(H)>V)continue;const q=xM(j,N,T.radius);T.hitAgents.push(k),I.lastHit=r,I.lastHitAudioTimeSec=p(),rO({state:t,params:n,agentIndex:k,x:I.x,y:I.y});const K=T.maxRadius>0?(N+(T.radius-N)*q)/T.maxRadius:0,Y=Ex(K,T.decay);I.lastHitGain=Y,I.lastHitX=I.x,I.lastHitY=I.y,I.vx+=_/Math.max(1,j)*3,I.vy+=G/Math.max(1,j)*3,t.wobble=Math.min(1,t.wobble+.35),y.push({agent:I,agentIndex:k,frameNowMs:r,audioTimeSec:I.lastHitAudioTimeSec??p(),waveGain:Y,x:I.x,y:I.y,targetFreq:s,sourceKind:"sector"})}const E=Math.hypot(I.vx,I.vy);E>b.maxAgentSpeed&&(I.vx=I.vx/E*b.maxAgentSpeed,I.vy=I.vy/E*b.maxAgentSpeed);I.previousX=I.x,I.previousY=I.y,I.x+=I.vx*a,I.y+=I.vy*a,I.x<b.edgeMarginPx&&(I.vx+=b.edgePush*w),I.x>c-b.edgeMarginPx&&(I.vx-=b.edgePush*w),I.y<b.edgeMarginPx&&(I.vy+=b.edgePush*w),I.y>d-b.edgeMarginPx&&(I.vy-=b.edgePush*w),I.history.push({x:I.x,y:I.y}),I.history.length>b.historyLimit&&I.history.shift()}const R=B2e({candidates:y,params:n});for(const k of R)D2e({candidate:k,params:n,onParticleTone:f})}function O2e(e){const{ctx:t,state:n,params:r,frameNowMs:a,t:o}=e;for(let i=0;i<n.impactRipples.length;i+=1){const s=n.impactRipples[i];t.beginPath(),t.arc(s.x,s.y,s.radius,0,Math.PI*2),t.strokeStyle=s.hue===null?`rgba(255, 255, 255, ${Math.max(0,s.life*.9)})`:`hsla(${s.hue}, 92%, 64%, ${Math.max(0,s.life*.86)})`,t.lineWidth=1.15,t.stroke()}for(let i=0;i<n.agents.length;i+=1){const s=n.agents[i],alpha=Math.max(0,Math.min(1,e.presentationAlpha??1)),px=(s.previousX??s.x)+(s.x-(s.previousX??s.x))*alpha,py=(s.previousY??s.y)+(s.y-(s.previousY??s.y))*alpha,l=bj(r.particleSystem,i,n.agents.length)??220,enabled=r.agentEnabled?.[i]!==!1;if(s.history.length>1){t.beginPath(),t.moveTo(s.history[0].x,s.history[0].y);for(let d=1;d<s.history.length;d+=1)t.lineTo(d===s.history.length-1?px:s.history[d].x,d===s.history.length-1?py:s.history[d].y);t.strokeStyle=enabled?`hsla(${l}, 88%, 68%, ${.13+Math.sin(o*2+s.phase)*.1})`:'rgba(90,92,102,0.065)',t.lineWidth=enabled?3:1,t.stroke()}const c=enabled?Math.max(0,1-(a-s.lastHit)*.002):0;t.fillStyle=enabled?`hsla(${l}, 90%, ${72+c*10}%, ${.38+c*.58})`:'rgba(65,70,82,0.35)',t.beginPath(),t.arc(px,py,4+c*3,0,Math.PI*2),t.fill(),t.fillStyle=enabled?`hsla(${l}, 98%, ${82+c*8}%, ${.34+c*.66})`:'rgba(113,117,129,0.48)',t.font="10px monospace",t.fillText(s.label,px+8,py+4)}}function _2e(e){N2e({state:e.state,params:e.params,frameNowMs:e.frameNowMs,particleMotionScale:e.particleMotionScale,waveMotionScale:e.waveMotionScale,baseWaveSpeed:e.baseWaveSpeed,targetFreq:e.targetFreq,installationAttractors:e.installationAttractors,fieldWidth:e.fieldWidth,fieldHeight:e.fieldHeight,audioNowSec:e.audioNowSec,onParticleTone:t=>{e.playNexusAgentTone(t.playbackFreq,t.volume,e.echoOn&&e.delayNode?e.delayNode:void 0,void 0,void 0,t.position,"particle",t.rootFreq,{agentIndex:t.agentIndex})}})}function z2e(e){O2e({ctx:e.ctx,state:e.state,params:e.params,frameNowMs:e.frameNowMs,t:e.t,presentationAlpha:e.presentationAlpha})}const j2e={nominalFrameMs:1e3/60,presentationHalfLifeMs:42,maxCatchupFramesPerFrame:3.4,softLagPx:18,hardLagPx:54},aO=(e,t)=>Number.isFinite(e)?e:t,Of=(e,t,n)=>Math.min(n,Math.max(t,e));function oO(e){const t=j2e,n=Of(aO(e.rawFrameMs,t.nominalFrameMs),0,96),r=Of(aO(e.displayRadius,e.previousTruthRadius),0,e.maxRadius+16),a=Of(e.truthRadius,0,e.maxRadius+16);if(a<=r)return a;const o=1-Math.pow(.5,n/t.presentationHalfLifeMs),i=r+(a-r)*Of(o,0,1),s=Of(n/t.nominalFrameMs,1,t.maxCatchupFramesPerFrame),l=Math.max(e.baseWaveSpeed,e.baseWaveSpeed*s+t.softLagPx*.06);let c=Math.min(a,Math.min(i,r+l));return a-c>t.hardLagPx&&(c=a-t.hardLagPx),Of(c,0,e.maxRadius+16)}function iO(e,t){if(!Number.isFinite(e??NaN))return null;const n=e,r=t-n;return r<5.5?null:n+r*.52}function G2e(e){const{ctx:t,state:n,clockState:r,frameNowMs:a}=e,o=ihe(r,a),i=o.steps;return{fieldStepFrame:o,fieldSteps:i,advanceFieldWaveStep:c=>{n.ripples=n.ripples.filter(d=>d.life>0&&d.radius<=d.maxRadius+16),n.ripples.forEach(d=>{const p=d.radius;d.prevRadius=p,d.radius=Math.min(d.maxRadius+16,p+ny*c),d.life=Math.max(0,1-d.radius/Math.max(1,d.maxRadius))}),n.sectorPulses=n.sectorPulses.filter(d=>d.life>.01&&d.radius<=d.maxRadius+16),n.sectorPulses.forEach(d=>{const p=d.radius;d.prevRadius=p,d.radius=Math.min(d.maxRadius+16,p+ny*c),d.life=Math.max(0,1-d.radius/Math.max(1,d.maxRadius))})},renderFieldWaves:()=>{n.ripples.forEach(c=>{const d=c.displayRadius??c.prevRadius??c.radius;c.displayPrevRadius=d,c.displayRadius=oO({displayRadius:c.displayRadius,previousTruthRadius:c.prevRadius??c.radius,truthRadius:c.radius,rawFrameMs:o.rawFrameMs,maxRadius:c.maxRadius,baseWaveSpeed:ny});const p=c.displayRadius??c.radius,f=Math.max(0,1-p/Math.max(1,c.maxRadius)),b=c.maxRadius>0?p/c.maxRadius:0,g=Ex(b,c.decay),y=iO(c.displayPrevRadius,p);y!==null&&(t.beginPath(),t.arc(c.x,c.y,y,0,Math.PI*2),t.strokeStyle=`rgba(200, 150, 255, ${Math.max(0,f*g*.32)})`,t.lineWidth=1+g*1.2,t.stroke()),t.beginPath(),t.arc(c.x,c.y,p,0,Math.PI*2),t.strokeStyle=`rgba(200, 150, 255, ${Math.max(0,f*g)})`,t.lineWidth=1.5+g*1.8,t.stroke()}),n.sectorPulses.forEach(c=>{const d=c.displayRadius??c.prevRadius??c.radius;c.displayPrevRadius=d,c.displayRadius=oO({displayRadius:c.displayRadius,previousTruthRadius:c.prevRadius??c.radius,truthRadius:c.radius,rawFrameMs:o.rawFrameMs,maxRadius:c.maxRadius,baseWaveSpeed:ny});const p=c.direction==="right"?0:c.direction==="up"?-Math.PI/2:c.direction==="left"?Math.PI:Math.PI/2,f=Math.PI/4,b=p-f,g=p+f,y=c.displayRadius??c.radius,x=Math.max(0,1-y/Math.max(1,c.maxRadius)),A=c.maxRadius>0?y/c.maxRadius:0,M=Ex(A,c.decay),v=iO(c.displayPrevRadius,y);t.save(),v!==null&&(t.strokeStyle=`rgba(196, 181, 253, ${Math.max(0,x*M*.32)})`,t.lineWidth=1+M*1.2,t.beginPath(),t.arc(c.x,c.y,v,b,g),t.stroke()),t.strokeStyle=`rgba(196, 181, 253, ${Math.max(0,x*M)})`,t.lineWidth=1.5+M*1.8,t.beginPath(),t.arc(c.x,c.y,y,b,g),t.stroke(),t.restore()})}}}function H2e(e){const{ctx:t,state:n,params:r,frameNowMs:a,t:o,targetFreq:i,fieldClockState:s,installationSharedFieldActive:l,topologyRefs:c,installationFieldConfigRef:d,performanceCrisisRuntimePolicy:p,audioCtx:f,audioCtxRef:b,playNexusAgentTone:g,gridTempoBpm:y,quantizeGrid:x,particleQuantizeReferenceBars:A,quantizeAnchorRef:M,waveCollisionQueueRef:v}=e,{fieldStepFrame:w,fieldSteps:R,advanceFieldWaveStep:k,renderFieldWaves:I}=G2e({ctx:t,state:n,clockState:s,frameNowMs:a}),E=l?{x:c.current.cursor.x/mu*vr,y:c.current.cursor.y/tc*ir}:null,F=P2e({active:l&&d.current.residentsEnabled,config:d.current,cursor:{x:n.cursorX,y:n.cursorY},oscillatorBall:E});__XenNodalSurfaces.warmWaveField(b.current??f);if(n.ripples.length||n.sectorPulses.length)__XenNodalSurfaces.warmParticleField(n.agents,i,b.current??f,e,ny,k9);for(const L of R)k(L.motionScale),_2e({ctx:t,state:n,params:{particleSystem:r.particleSystem,particleVolume:r.particleVolume,agentVolumes:r.agentVolumes,agentEnabled:r.agentEnabled,quantizeOn:r.quantizeOn,particleMute:r.particleMute,echoOn:r.echoOn,performancePolicy:p.particles},frameNowMs:L.nowMs,t:o,particleMotionScale:L.motionScale,waveMotionScale:L.motionScale,baseWaveSpeed:ny,targetFreq:i,installationAttractors:F,fieldWidth:vr,fieldHeight:ir,audioNowSec:()=>Ii(b.current??f),playNexusAgentTone:g,echoOn:r.echoOn,delayNode:n.delayNode,noUiChangedByBoundary:!0,noParticlePolicyRewrite:!0,noResidentTrafficPolicyOwnedHere:!0,noWellenstarterOrRootFollowPolicyOwnedHere:!0,noStableLanePolicyOwnedHere:!0});if(w.reset)for(const agent of n.agents){agent.previousX=agent.x;agent.previousY=agent.y;}I(),z2e({ctx:t,state:n,params:{particleSystem:r.particleSystem,particleVolume:r.particleVolume,agentVolumes:r.agentVolumes,agentEnabled:r.agentEnabled,quantizeOn:r.quantizeOn,particleMute:r.particleMute,echoOn:r.echoOn,performancePolicy:p.particles},frameNowMs:a,t:o,particleMotionScale:w.motionScale,waveMotionScale:w.motionScale,presentationAlpha:w.renderAlpha,echoOn:r.echoOn,delayNode:n.delayNode}),I2e({active:l&&d.current.residentsEnabled,config:d.current,nodes:c.current.nodes,oscillatorBall:E,sourceWidth:mu,sourceHeight:tc,targetWidth:vr,targetHeight:ir,ripples:n.ripples,sectorPulses:n.sectorPulses,nowMs:a,targetFreq:i,quantizeOn:r.quantizeOn,audioCtx:b.current??f,gridTempoBpm:y,quantizeGrid:x,quantizeReferenceBars:A,quantizeAnchorRef:M,waveCollisionQueueRef:v,echoOn:r.echoOn,delayNode:n.delayNode,playNexusAgentTone:g,noUiChangedByBoundary:!0,noFrameOrderMoved:!0,noQuantizeAnchorRewrite:!0,noQueuePolicyRewrite:!0,noDirectVsQueuedBranchCollapse:!0,noResidentSoundNormalization:!0,noWellenstarterOrRootFollowPolicyOwnedHere:!0,noStableLanePolicyOwnedHere:!0})}function V2e(e){const{ctx:t,state:n,params:r,t:a,focusCursorRef:o,getVisibleGridLines:i,activeGridLineFreqRef:s,activeGridLineSinceRef:l,previousGridLineFreqRef:c,previousGridLineAtRef:d,keyboardWindowOffsetRef:p}=e,f=o.current,b=f.x-n.cursorX,g=f.y-n.cursorY,y=Math.hypot(b,g),x=t.createRadialGradient(n.cursorX,n.cursorY,0,n.cursorX,n.cursorY,120);if(x.addColorStop(0,"rgba(220, 180, 255, 0.15)"),x.addColorStop(1,"rgba(220, 180, 255, 0)"),t.fillStyle=x,t.beginPath(),t.arc(n.cursorX,n.cursorY,120,0,Math.PI*2),t.fill(),y>2.5&&(t.save(),t.strokeStyle=`rgba(150, 210, 255, ${Me(.14+y/180,.16,.34)})`,t.lineWidth=1,t.setLineDash([4,4]),t.beginPath(),t.moveTo(f.x,f.y),t.lineTo(n.cursorX,n.cursorY),t.stroke(),t.restore()),t.fillStyle="rgba(6, 8, 12, 0.98)",t.strokeStyle="rgba(214, 226, 242, 0.58)",t.lineWidth=1.1,t.beginPath(),t.arc(n.cursorX,n.cursorY,4.5+Math.sin(a*5)*1.0,0,Math.PI*2),t.fill(),t.stroke(),!r.gridOn){s.current=null;l.current=0;c.current=null;d.current=0;return;}t.lineWidth=3;t.fillStyle="rgba(255, 255, 255, 0.35)",t.font="10px monospace",t.textAlign="left";const A=i(),M=performance.now();if(r.lockCursorToGrid){const W=Qa(n.cursorY),V=Zs(W);let U=null,H=Number.POSITIVE_INFINITY;for(const q of A){const K=Zs(q.freq),Y=Math.abs(K-V);Y<H&&(H=Y,U=q.freq)}if(U!==null){const q=s.current;(q===null||Math.abs(q-U)>.001)&&(q!==null&&(c.current=q,d.current=M),s.current=U,l.current=M)}}else s.current!==null&&(c.current=s.current,d.current=M),s.current=null,l.current=0;const v=s.current,w=l.current,R=c.current,k=d.current,I=v!==null?Zs(v):null,E=w>0?Me((M-w)/1e3,0,1):0,F=R!==null?Zs(R):null,L=k>0?Me(1-(M-k)/650,0,1):0,B=Me(n.cursorX/vr,0,1),O=.92+.08*(.5+.5*Math.sin(M*.007)),T=uw(r.gridBase,r.gridTuning,r.manualGridMutedSteps,r.manualGridStepOffsets),_=Math.max(0,Math.min(Math.round(p.current),Math.max(0,T.length-1))),G=Math.max(_,Math.min(T.length-1,_+iw.length-1)),j=T.slice(_,G+1),N=W=>j.some(V=>Math.abs(V-W)<.12);A.forEach(W=>{const V=Zs(W.freq);t.beginPath(),t.moveTo(0,V),t.lineTo(vr,V);const U=W.manualMuted||W.modeMuted,H=r.lockCursorToGrid&&I!==null&&Math.abs(V-I)<=1.4,q=!H&&F!==null&&L>0&&Math.abs(V-F)<=1.4;if(U)t.strokeStyle="rgba(255, 255, 255, 0.03)";else if(H){const Y=E*O,J=`rgba(165, 255, 190, ${.30+.44*Y})`,Z=`rgba(145, 235, 165, ${.22+.20*Y})`,te=t.createLinearGradient(0,V,vr,V),X=Me(B-.16,0,1),Q=Me(B+.16,0,1);te.addColorStop(0,Z),te.addColorStop(X,Z),te.addColorStop(B,J),te.addColorStop(Q,Z),te.addColorStop(1,Z),t.strokeStyle=te}else if(q){const Y=.18+.22*L;t.strokeStyle=`rgba(165, 255, 190, ${Y})`}else t.strokeStyle="rgba(255, 255, 255, 0.12)";t.stroke();const K=N(W.freq);t.fillStyle=U?K?"rgba(255, 196, 196, 0.22)":"rgba(255, 160, 160, 0.1)":K?"rgba(235, 245, 255, 0.48)":"rgba(255, 255, 255, 0.24)",t.fillText(W.label,20,V-4),W.stepIndex!==void 0&&(t.beginPath(),t.moveTo(15,V),t.lineTo(0,V-5),t.lineTo(0,V+5),t.closePath(),U?t.fillStyle=K?"rgba(255, 110, 110, 0.42)":"rgba(110, 44, 44, 0.32)":H?t.fillStyle="rgba(78, 164, 98, 0.92)":K?t.fillStyle="rgba(132, 200, 255, 0.96)":t.fillStyle="rgba(86, 126, 168, 0.38)",t.fill())})}function W2e(e){const{audioCtx:t,osc:n,filter:r,gain:a,nexusRefs:o,nexusParamsRef:i,applyRealtimeDroneOvertones:s,nexusCanvasRef:l,myceliumDroneModRef:c,myzelEnabled:d,myzelLayerModRef:p,myzelGateRef:f,room3BodyEnabled:b,room3TimbreStateRef:g,droneVolume:y,resonanceFieldStepClockRef:x,installationSharedFieldActive:A,topologyRefs:M,installationFieldConfigRef:v,performanceCrisisRuntimePolicy:w,audioCtxRef:R,playNexusAgentTone:k,gridTempoBpm:I,quantizeGrid:E,particleQuantizeReferenceBars:F,quantizeAnchorRef:L,waveCollisionQueueRef:B,focusCursorRef:O,getVisibleGridLines:T,activeGridLineFreqRef:_,activeGridLineSinceRef:G,previousGridLineFreqRef:j,previousGridLineAtRef:N,keyboardWindowOffsetRef:W}=e;o.current.agents.length===0&&(o.current.agents=fc.map((J,Z)=>({x:vr*(.1+Math.random()*.8),y:ir*(.1+Math.random()*.8),vx:(Math.random()-.5)*2,vy:(Math.random()-.5)*2,ratio:J.ratio,label:J.label,phase:Math.random()*Math.PI*2,lastHit:i.current.agentEnabled[Z]?0:Number.POSITIVE_INFINITY,lastHitAudioTimeSec:void 0,lastHitGain:1,lastHitX:vr*.5,lastHitY:ir*.5,history:[]}))),s();let V=0,U=0,startedAt=performance.now(),H=null,q=null,K=null;const Y=()=>{const J=performance.now();U=(J-startedAt)/1000;const Z=l.current;if(!Z)return;const te=Z.getContext("2d");if(!te)return;const X=o.current,Q=__xenLiveGridParams(i.current);H===null?H={ctx:t,state:X,params:Q,t:U,osc:n,filter:r,gain:a,myceliumDroneModRef:c,myzelEnabled:d,myzelLayerModRef:p,myzelGateRef:f,room3BodyEnabled:b,room3TimbreStateRef:g,droneVolume:y}:(H.state=X,H.params=Q,H.t=U);const ne=k2e(H);C2e(te,X,U),q===null?q={ctx:te,state:X,params:Q,frameNowMs:J,t:U,targetFreq:ne,fieldClockState:x.current,installationSharedFieldActive:A,topologyRefs:M,installationFieldConfigRef:v,performanceCrisisRuntimePolicy:w,audioCtx:t,audioCtxRef:R,playNexusAgentTone:k,gridTempoBpm:I,quantizeGrid:E,particleQuantizeReferenceBars:F,quantizeAnchorRef:L,waveCollisionQueueRef:B}:(q.ctx=te,q.state=X,q.params=Q,q.frameNowMs=J,q.t=U,q.targetFreq=ne,q.fieldClockState=x.current),H2e(q),K===null?K={ctx:te,state:X,params:Q,t:U,focusCursorRef:O,getVisibleGridLines:T,activeGridLineFreqRef:_,activeGridLineSinceRef:G,previousGridLineFreqRef:j,previousGridLineAtRef:N,keyboardWindowOffsetRef:W}:(K.ctx=te,K.state=X,K.params=Q,K.t=U),V2e(K),V=requestAnimationFrame(Y)};return Y(),{stop:()=>cancelAnimationFrame(V)}}function q2e(e){const{room:t,nexusActive:n,audioCtx:r,getLiveMasterBus:a,nexusRefs:o}=e;P.useEffect(()=>{if(t!=="RESONANCE"||!n||!r)return;Hb("mainloop-enter",o);const i=R2e({ctx:r,getLiveMasterBus:a,nexusRefs:o});Hb("mainloop-primary-ready",o),Object.keys(o.current.jiOscs).length===0&&Hb("mainloop-canonical-ji-filter-layer",o),i.ensureJiLayer(),e.ensureDroneGraphRouting?.(r),Hb("mainloop-ready",o);const s=W2e({...e,audioCtx:r,osc:i.osc,filter:i.filter,gain:i.gain});return()=>{Hb("mainloop-cleanup",o),s.stop(),__xenRefucktorDispose(o.current),i.dispose()}},[t,n,r])}