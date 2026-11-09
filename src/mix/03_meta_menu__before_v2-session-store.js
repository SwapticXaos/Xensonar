/* 🎧 Meta-Menu · Session = one ordered set of references, never a sequencer or Part editor.
   The five existing libraries remain owners. Editor actions never select/play library items. */
const __XenMetaLabels=Object.freeze({grid:'Threadboard',material:'Material Track',rootFollow:'Root Follow Loop',drum:'Drums',bass:'Bass'});
function __xenMetaValidateItems(value){return __xenValidateQuickItems(value)}
/* Visual annotation only: never insert styling into the original library reference. */
const __xenMetaColorKey=e=>__xenGridKey(e);
const __xenMetaHex=c=>typeof c==='string'&&/^#[0-9a-fA-F]{6}$/.test(c)?c.toLowerCase():null;
function __xenMetaValidateColors(items,raw){
 if(raw===undefined)return {};
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid session palette.');
 const allowed=new Set(items.map(__xenMetaColorKey)),out={};
 for(const [key,pair] of Object.entries(raw)){
  if(!allowed.has(key))continue; // A deleted entry cannot leave stray styling behind.
  if(!pair||typeof pair!=='object'||Array.isArray(pair)||Object.keys(pair).some(k=>k!=='border'&&k!=='background'))throw Error('Invalid entry palette.');
  const result={};for(const key of ['border','background'])if(pair[key]!==undefined){const value=__xenMetaHex(pair[key]);if(!value)throw Error('Invalid '+key+' color.');result[key]=value}
  if(Object.keys(result).length)out[key]=result;
 }
 return out;
}
/* Optional snapshot of existing Main Room controls, not a new settings editor.
   Active live params come from the existing instrument side-panel owner. */
/* Factory start is a real Meta Session source snapshot. Global fallbacks only
   seed genuinely new states; loading a saved session restores its own values. */
const __XenFactoryStartSounds=Object.freeze({
 particle:'dust_chime',
 waveStarter:'entrophon:factory:glas-zerrbild@1',
 keyboard:'entrophon:factory:marimba-holz@1'
});
function __xenFactorySongPerformance(){return {version:1,entries:[],sources:__xenStarterSourceSettings()};}
const __XenMainRoomSessionBridge=(()=>{
 let owner=null,starterInitialized=false,starterFrame=null,pendingSongSources=null,defaultsReady=false,bootRestored=false;
 const restoreBoot=()=>{
  if(!owner||!defaultsReady||bootRestored)return;
  bootRestored=true;
  try{__XenMetaSessions.restoreBootSources();__XenMetaSessions.startWorkingCopy?.()}catch(error){console.warn('[xensonar][song] Startup instruments could not be restored:',error)}
 };
 const clone=data=>JSON.parse(JSON.stringify(data));
 // The owner exposes its synchronous parameter ref: Save immediately after a
 // slider change must not read the previous React render's props.
 const params=()=>owner?.getSongParams?.()??owner?.nParamsUI??{};
 const wave=()=>owner?.getSongWave?.()??{preset:owner?.waveSoundPreset??null,enabled:!!owner?.waveSoundEnabled,volume:Number(owner?.waveSoundVolume??0)};
 const bounded=(v,lo,hi,f)=>Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):f;
 const sourcePanKeys=['particle','wave','keyboard',...Array.from({length:32},(_,i)=>'particle:'+i)];
 const laneDefaults=()=>({bass:{volume:.1,pan:0,pitch:0,att:0},rootFollow:{volume:.22,pan:0,pitch:0,att:0},drum:{volume:.52,pan:0}});
 const safe=value=>{
  if(value==null)return null;
  value=__xenMetaUnpackRoomSettings(value);
  if(!value||value.version!==1||!value.nParamsUI||typeof value.nParamsUI!=='object'||Array.isArray(value.nParamsUI))throw Error('Invalid Main Room settings snapshot.');
  const encoded=JSON.stringify(value);
  if(encoded.length>512000)throw Error('Main Room settings exceed the 512 KB session limit.');
  return clone(value);
 };
 return {safe,liveClock(){const p=params();return {bpm:Number(p.quantizeBpm??120),beatsPerBar:Number(p.beatsPerBar??p.timeSignatureNumerator??4)}},activeBassClipId(){const p=params();return p.bassPatternMode==='clip'?p.bassClipId:null},defaultsReady(){defaultsReady=true;restoreBoot()},patch(value){if(!owner)throw Error("Main Room unavailable.");owner.updateNParams(value)},applyGridProfile(entry){if(!owner||typeof owner.updateNParams!=='function'||entry?.kind!=='grid')return false;const p=__xenGridProfile(entry.gridProfile);owner.updateNParams({gridTuning:entry.id,gridMode:__xenGridCompatibleMode(entry.id,p.modeId),manualGridMutedSteps:p.mainMutedDegrees,manualGridStepOffsets:p.mainStepOffsets.length?p.mainStepOffsets:Array.from({length:Kp(entry.id).length},()=>0)});__XenBassGrid.setLiveOverride({instanceId:entry.instanceId||'legacy:'+entry.id,tuningId:entry.id,profile:p});return true;},initializeStarter(){
   if((typeof __XenMetaSessions!=='undefined'&&__XenMetaSessions.hasWorkingSession?.())||!__XenStarterInstalled||starterInitialized||starterFrame!==null||!owner||!__XenQuick.adapters.has('grid'))return;
   // Wait for the mounting owners' initial React effects to commit, once. The
   // frame reads the latest owner values; a user selection before it wins.
   starterFrame=requestAnimationFrame(()=>{starterFrame=null;if(starterInitialized||!owner||!__XenQuick.adapters.has('grid'))return;
    const p=owner.nParamsUI??{};starterInitialized=true;
    if(p.gridTuning==='12edo'&&p.gridMode==='ionian'&&(p.manualGridMutedSteps??[]).join(',')===xF('ionian','12edo').join(',')&&!(p.manualGridStepOffsets??[]).some(x=>x!==0)&&!p.materialLoopActive&&!p.rootFollowLoopActive){
     const entry=__xenStarterPresetRecords().primary.items[0];
     if(__XenMainRoomSessionBridge.applyGridProfile(entry))__XenQuick.setSelected('grid',entry.instanceId);
    }
   });
  },attach(props){if(!props)return()=>{};owner=props;__XenMainRoomSessionBridge.initializeStarter();
   if(__xenRestoredWorkspace4?.main){bootRestored=true;const value=__xenRestoredWorkspace4.main;delete __xenRestoredWorkspace4.main;requestAnimationFrame(()=>{try{__XenMainRoomSessionBridge.apply(value);__XenMetaSessions.startWorkingCopy?.();void __xenPackageStation4().consumeRuntime('main').catch(console.error)}catch(error){console.error('[package-station][restore-main]',error)}})}
   if(pendingSongSources){const pending=pendingSongSources;pendingSongSources=null;try{__XenMainRoomSessionBridge.applySongSources(pending)}catch(error){console.warn('[xensonar][song] Pending sources could not be applied:',error);pendingSongSources=pending;}}
   restoreBoot();if(typeof __XenMetaSessions!=='undefined')__XenMetaSessions.scheduleWorkingCopy?.();
   return()=>{if(owner===props)owner=null}},available:()=>!!owner,clearPendingSongSources:()=>{pendingSongSources=null},
  startMuted(){if(!owner||typeof owner.updateNParams!=='function')return false;owner.updateNParams({materialLoopActive:false,rootFollowLoopActive:false});return true},
  enableMaterialTrack(){if(!owner||typeof owner.updateNParams!=='function')return false;owner.updateNParams({materialLoopActive:true});return true},
  capture(){if(!owner)throw Error('Main Room controls are not currently available.');
   const p=owner;
   return safe({version:1,nParamsUI:clone(params()),
    wave:clone(wave()),
    eq:__XenEQ.capture(),
    pan:typeof __XenPan!=='undefined'?clone(__XenPan.snapshot()):null,
    octaves:typeof __XenOctaves!=='undefined'?clone(__XenOctaves.snapshot()):null,
    bassGridSource:typeof __XenBassGrid!=='undefined'?__XenBassGrid.snapshot().source:null});
  },
  captureSongMix(items){
   if(!owner||typeof owner.updateNParams!=='function')throw Error('Song mixer is not available.');
   const p=params(),pan=__XenPan.snapshot(),attack=__XenAttackLanes.snapshot();
   const allowed=new Set(items.filter(e=>e.kind==='material').map(e=>e.id));
   const primaryId=allowed.has(p.materialLoopId)?p.materialLoopId:null;
   const secondaryIds=__XenMaterialLayers.snapshot().filter(id=>allowed.has(id)&&id!==primaryId).slice(0,2);
   const primaryMuted=__XenMaterialPrimarySwitch.snapshot(),enabled=!!p.materialLoopActive&&!!primaryId;
   // Session membership is authoritative; the live chronology may still
   // contain a voice belonging to a different working rack during rollover.
   const activePlaced=enabled?[...(primaryMuted?[]:[primaryId]),...secondaryIds]:[];
   const liveOrder=enabled?__XenMaterialLayers.oldestFirst(primaryId,primaryMuted):[];
   const activationOrder=[...activePlaced.filter(id=>!liveOrder.includes(id)),
    ...liveOrder.filter(id=>activePlaced.includes(id))];
   return {materialPlacement:{primaryId,secondaryIds,primaryMuted,enabled,activationOrder},
    primaryMix:{volume:bounded(p.materialLoopVolume,0,1,.22),pan:pan.material??0},
    mixer:{bass:{volume:bounded(p.bassVolume,0,1,.1),pan:pan.bass??0,pitch:__XenBassPitch.snapshot(),att:attack.bass},
     rootFollow:{volume:bounded(p.rootFollowLoopVolume,0,1,.22),pan:pan.rootFollow??0,pitch:__XenRootFollowPitch.snapshot(),att:attack.rootFollow},
     drum:{volume:bounded(p.drumVolume,0,1,.52),pan:bounded(p.drumPan,-1,1,0)}}};
  },
  applySongMix(cfg,items,roomSettings=null,allowUnloaded=false){
   if(!owner||typeof owner.updateNParams!=='function')throw Error('Song mixer cannot be restored right now.');
   const legacy=cfg?.version!==2,room=roomSettings?.nParamsUI??{},savedPan=roomSettings?.pan??{};
   const allowed=items.filter(e=>e.kind==='material').map(e=>e.id);
   // Old optional room snapshots contain the true primary level/pan. Old
   // per-ID values cannot identify a primary voice, so never guess one active.
   const primaryId=legacy?(allowed.includes(room.materialLoopId)?room.materialLoopId:null):cfg.materialPlacement.primaryId;
   const placement=legacy?{primaryId,secondaryIds:[],primaryMuted:false,enabled:!!primaryId&&!!room.materialLoopActive}:cfg.materialPlacement;
   const adapter=__XenQuick.adapters?.get('material');
   if(adapter&&!allowUnloaded){const missing=[primaryId,...placement.secondaryIds].filter(Boolean).find(id=>!adapter.entries.some(e=>e.id===id));
    if(missing)throw Error('Song material is unavailable: '+missing+'. Load its sample library and try again.');}
   const mixer=legacy?laneDefaults():cfg.mixer;
   if(legacy){
    for(const [lane,key] of [['bass','bassVolume'],['rootFollow','rootFollowLoopVolume'],['drum','drumVolume']]){
     mixer[lane].volume=bounded(room[key],0,1,mixer[lane].volume);
     mixer[lane].pan=bounded(lane==='drum'?room.drumPan:savedPan[lane],-1,1,0);
    }
   }
   const primary=cfg?.entries?.find(e=>e.kind==='material'&&e.id===primaryId)?.mix;
   const volume=legacy?bounded(room.materialLoopVolume,0,1,.22):bounded(primary?.volume,0,1,.22);
   const pan=legacy?bounded(savedPan.material,-1,1,0):bounded(primary?.pan,-1,1,0);
   // Pure configuration setters; never adapter.choose(), which also previews
   // or activates a library entry. Power/AudioContext remain untouched.
   owner.updateNParams({materialLoopId:primaryId??'',materialLoopActive:placement.enabled,
    materialLoopVolume:volume,bassVolume:mixer.bass.volume,rootFollowLoopVolume:mixer.rootFollow.volume,
    drumVolume:mixer.drum.volume,drumPan:mixer.drum.pan});
   __XenPan.set('material',pan);
   for(const lane of ['bass','rootFollow']){__XenPan.set(lane,mixer[lane].pan);__XenAttackLanes.set(lane,mixer[lane].att)}
   __XenBassPitch.set(mixer.bass.pitch);__XenRootFollowPitch.set(mixer.rootFollow.pitch);
   __XenMaterialLayers.restore(placement.secondaryIds,allowed,primaryId);
   __XenMaterialLayers.restoreOrder(placement.activationOrder,placement.enabled?primaryId:null,placement.primaryMuted||!placement.enabled);
   __XenMaterialPrimarySwitch.restore(placement.primaryMuted,primaryId??'');
   __XenQuick.setSelected?.('material',primaryId??'');
   return true;
  },
  // A song's three performance input surfaces are independent of the optional
  // full Main Room snapshot. No live Wave Starter particles or voices are stored.
  readBassTimbre(){return __xenBassTimbreCapture(params())},
  captureSongSources(){
   if(!owner)return null;
   const p=params(),pick=re=>Object.fromEntries(Object.entries(p).filter(([k,v])=>re.test(k)&&
    (v===null||['boolean','number','string'].includes(typeof v)||Array.isArray(v)&&v.length<=64||
     v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length<=64&&Object.values(v).every(Number.isFinite))).map(([k,v])=>[k,clone(v)]));
   const result={samplePlaybackProfiles:__XenLiveSampleProfiles.capture(),particle:pick(/^(particle|agent|nexus.*(Gradient|Volume|Overtone))/i),
    waveStarter:{...pick(/^(wave|waveStarter|waveSound)/i),...wave()},
    keyboard:pick(/^(keyboard|keyHold|keyboardWindow)/i),
    // Durable musical roles, independent of the optional all-Main-Room snapshot.
    ...(typeof p.bassVoice==='string'?{bass:{version:1,timbre:__xenBassTimbreCapture(p),mode:p.bassPatternMode==='clip'?'clip':'preset',
     clipId:p.bassPatternMode==='clip'&&typeof p.bassClipId==='string'?p.bassClipId:'',
     preset:typeof p.bassPattern==='string'?p.bassPattern:'offbeat',
     root:{mode:p.bassRootMode==='fixed'?'fixed':'auto',hz:Number.isFinite(p.bassRootHz)&&p.bassRootHz>0?p.bassRootHz:49},
     tuning:typeof __XenBassGrid!=='undefined'&&__XenBassGrid.captureTuning?__XenBassGrid.captureTuning(p,{includeSharedUsage:true}):null,
     tuningContext:Object.fromEntries(['gridTuning','gridBase','gridMode','manualGridMutedSteps','manualGridStepOffsets'].filter(k=>p[k]!==undefined).map(k=>[k,clone(p[k])])),
     clip:p.bassPatternMode==='clip'&&typeof eH==='function'&&eH(p.bassClipId)?clone(eH(p.bassClipId)):null}}:{}),
    ...(typeof p.dronePreset==='string'?{drone:{version:1,params:typeof __xenDronePersist!=='undefined'&&typeof __xenDronePersist.normalize==='function'?__xenDronePersist.normalize(p):{},
     volume:typeof owner.getSongDroneVolume==='function'?owner.getSongDroneVolume():null}}:{}),
    octaves:typeof __XenOctaves!=='undefined'?clone(__XenOctaves.snapshot()):null,
    pan:typeof __XenPan!=='undefined'?Object.fromEntries(sourcePanKeys.filter(k=>Object.hasOwn(__XenPan.snapshot(),k)).map(k=>[k,__XenPan.snapshot()[k]])):null,
    ...(typeof __XenEntrophonSongConfig!=='undefined'?{entrophon:__XenEntrophonSongConfig.capture()}:{})};
   if(typeof __XenSongInstrumentDefinitions!=='undefined'){
    const ids=[],collect=value=>{if(typeof value==='string')ids.push(value);else if(value&&typeof value==='object')for(const nested of Object.values(value))collect(nested);};
    for(const lane of ['particle','waveStarter','keyboard'])collect(result[lane]);
    result.definitions=__XenSongInstrumentDefinitions.capture(ids);
   }
   if(JSON.stringify(result).length>512000)throw Error('Song input settings exceed 512 KB.');
   return result;
  },
  applySongSources(value,pitchFallback=null){
   if(!value){__XenP36SessionSampleLength.activate(null);__XenLiveSampleProfiles.restore(null);return true;}
   const definitions=typeof __XenSongInstrumentDefinitions!=='undefined'?__XenSongInstrumentDefinitions.normalize(value.definitions):null;
   const entrophon=value.entrophon&&typeof __XenEntrophonSongConfig!=='undefined'?__XenEntrophonSongConfig.normalize(value.entrophon):null;
   if(!owner||typeof owner.updateNParams!=='function'){pendingSongSources=clone(value);return false;}
   pendingSongSources=null;
   if(definitions)__XenSongInstrumentDefinitions.restore(definitions);
   if(entrophon)__XenEntrophonSongConfig.restore(entrophon);
   const params={waveStarterHoldPitchCents:Array.isArray(pitchFallback?.waveStarterHoldPitchCents)?pitchFallback.waveStarterHoldPitchCents.slice(0,256):[],
    keyboardHoldPitchCents:Array.isArray(pitchFallback?.keyboardHoldPitchCents)?pitchFallback.keyboardHoldPitchCents.slice(0,256):[]
   };for(const lane of ['particle','waveStarter','keyboard'])for(const [k,v] of Object.entries(value[lane]??{}))
    if(/^(particle|agent|nexus.*(Gradient|Volume|Overtone))/i.test(k)&&lane==='particle'||
       /^(wave|waveStarter|waveSound)/i.test(k)&&lane==='waveStarter'||
       /^(keyboard|keyHold|keyboardWindow)/i.test(k)&&lane==='keyboard')params[k]=clone(v);
    // Explicit song roles override the previous song's last-used global sound.
    // Avoid no-op updates to the audio owner when a role is already identical.
    if(typeof __xenBassSessionClipInstall==='function')
     __xenBassSessionClipInstall(value.bass?.clip??null,value.bass?.clipId);
    if(value.bass){const b=value.bass;
     Object.assign(params,__xenBassTimbrePatch(b.timbre),{bassPatternMode:b.mode,bassClipId:b.mode==='clip'?b.clipId:'',bassPattern:b.preset});
     if(b.root)Object.assign(params,{bassRootMode:b.root.mode,bassRootHz:b.root.hz});
     if(b.tuningContext)Object.assign(params,clone(b.tuningContext));
     if(b.tuning&&typeof __XenBassGrid!=='undefined')__XenBassGrid.applyTuning?.(b.tuning,{...(owner.getSongParams?.()??owner.nParamsUI),...params},{restoreSharedUsage:true});
    }
    else if(Object.hasOwn(value,'bass')&&value.bass===null)Object.assign(params,{bassPatternMode:'preset',bassClipId:'',bassActive:false});
    if(value.drone&&typeof __xenDronePersist!=='undefined'&&typeof __xenDronePersist.normalize==='function')Object.assign(params,__xenDronePersist.normalize(value.drone.params));
    const live=owner.getSongParams?.()??owner.nParamsUI??{},changed={};
    for(const [key,v] of Object.entries(params))if(JSON.stringify(live[key])!==JSON.stringify(v))changed[key]=v;
    if(Object.keys(changed).length)owner.updateNParams(changed);
    if(value.drone&&Number.isFinite(value.drone.volume)&&typeof owner.setSongDroneVolume==='function'&&
      value.drone.volume!==owner.getSongDroneVolume?.())owner.setSongDroneVolume(value.drone.volume);
    if(value.waveStarter){const wave=value.waveStarter;
    if(wave.preset&&typeof owner.setWaveSoundPreset==='function')owner.setWaveSoundPreset(wave.preset);
    if(typeof wave.enabled==='boolean'&&typeof owner.setWaveSoundEnabled==='function')owner.setWaveSoundEnabled(wave.enabled);
    if(Number.isFinite(wave.volume)&&typeof owner.setWaveSoundVolume==='function')owner.setWaveSoundVolume(wave.volume);
   }
   if(value.octaves&&typeof __XenOctaves!=='undefined')for(const lane of ['particle','wave','keyboard'])if(Number.isInteger(value.octaves[lane]))__XenOctaves.set(lane,value.octaves[lane]);
   if(value.pan&&typeof __XenPan!=='undefined')for(const lane of sourcePanKeys)if(Number.isFinite(value.pan[lane]))__XenPan.set(lane,value.pan[lane]);
   __XenP36SessionSampleLength.activate(value);
   __XenLiveSampleProfiles.restore(value.samplePlaybackProfiles);
   return true;
  },
  apply(value){const cfg=safe(value);if(!cfg)return true;
   if(!owner||typeof owner.updateNParams!=='function')throw Error('Main Room controls cannot be restored right now.');
   const p=owner;
   // The real Main Room state setter owns grid, drum, drone, RFL and source IDs.
   p.updateNParams(clone(cfg.nParamsUI));
   if(cfg.wave){
    if(cfg.wave.preset&&typeof p.setWaveSoundPreset==='function')p.setWaveSoundPreset(cfg.wave.preset);
    if(typeof p.setWaveSoundEnabled==='function')p.setWaveSoundEnabled(!!cfg.wave.enabled);
    if(Number.isFinite(cfg.wave.volume)&&typeof p.setWaveSoundVolume==='function')p.setWaveSoundVolume(cfg.wave.volume);
   }
   __XenEQ.restore(cfg.eq||{});
   if(cfg.pan&&typeof __XenPan!=='undefined')for(const [kind,v] of Object.entries(cfg.pan))if(Number.isFinite(v))__XenPan.set(kind,v);
   if(cfg.octaves&&typeof __XenOctaves!=='undefined')for(const lane of ['particle','wave','keyboard'])if(Number.isInteger(cfg.octaves[lane]))__XenOctaves.set(lane,cfg.octaves[lane]);
   if(['main','bass'].includes(cfg.bassGridSource)&&typeof __XenBassGrid!=='undefined')__XenBassGrid.setSource(cfg.bassGridSource);
   return true;
  }
 };
})();
/* P7.38.11 · Both starters are ordinary v2 Meta Sessions (references + colors).
   Distinct Grid instance IDs preserve three different mute profiles in one rack.
   The underlying Drum, Bass and tuning libraries are not modified. */
const __XenStarterPrimaryId='built-in-starter-minor-worlds-v1';
const __XenStarterSecondaryId='built-in-starter-alternate-views-v1';
const __XenStarterPendingKey='xensonar.starter-demo-pending.v1';
const __XenStarterDemoIds=Object.freeze(['a','b','c'].map(letter=>'xensonar-starter-random-demo-'+letter+'-v1'));
function __xenStarterDemoReferences(){
 return __XenStarterDemoIds.flatMap((id,i)=>[
  {kind:'material',id,name:'Random Demo · Pattern '+ 'ABC'[i]},
  {kind:'rootFollow',id,name:'Random Demo · Pattern '+ 'ABC'[i]}]);
}
/* One demand seam for starter PCM. Metadata installs independently; the late
   renderer attaches after module initialization and never runs on cold boot. */
const __XenStarterMaterial=(()=>{
 let provider=null,ready=()=>false,task=null,retryValue='material',status=Object.freeze({phase:'idle',error:''});const listeners=new Set();
 const requested=value=>{const id=typeof value==='string'?value:value?.id;return __XenStarterDemoIds.includes(id)&&(!value?.kind||['material','rootFollow'].includes(value.kind))};
 const pending=()=>{try{return localStorage.getItem(__XenStarterPendingKey)==='pending'}catch{return false}};
 const publish=(phase,error='')=>{status=Object.freeze({phase,error});for(const fn of listeners)fn()};
 const ensure=value=>{
  if(!requested(value)&&!(['material','rootFollow'].includes(value)&&pending()))return Promise.resolve(false);
  retryValue=value;
  if(task)return task;
  if(ready(value)){if(status.phase!=='ready')publish('ready');return Promise.resolve(true);}
  if(!provider)return Promise.reject(Error('Starter materials are not ready for preparation.'));
  publish('preparing');
  const run=Promise.resolve().then(()=>provider()).then(()=>{publish('ready');return true},error=>{publish('failed',error?.message||String(error));throw error});
  task=run;run.finally(()=>{if(task===run)task=null}).catch(()=>{});return run;
 };
 return Object.freeze({requested,pending,ensure,snapshot:()=>status,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),attach:(fn,isReady)=>{provider=fn;ready=isReady??(()=>false)},request:(value=retryValue)=>{void ensure(value).catch(error=>console.warn('[xensonar][starter-material]',error))}});
})();
function __XenStarterMaterialStatus(){
 const status=P.useSyncExternalStore(__XenStarterMaterial.subscribe,__XenStarterMaterial.snapshot,__XenStarterMaterial.snapshot);
 return status.phase==='preparing'?u.jsx('small',{role:'status',children:'Preparing starter materials…'}):status.phase==='failed'?u.jsxs('small',{role:'status',children:['Starter materials: '+status.error+' ',u.jsx('button',{type:'button',onClick:()=>__XenStarterMaterial.request(),children:'Retry'})]}):null;
}
/* Initial input settings live in the ordinary factory song record. Runtime
   defaults may read this data, but never replay it over a working song. */
/* KH04: unlabelled first-run Keyboard-Hold demonstration. Normal user/session
   state takes precedence; Root Reset removes its pitches without reapplying it. */
const __XenKeyboardHoldStartupDemo=Object.freeze({
 segments:16,bars:1,steps:Object.freeze(Array(16).fill(1)),
 cents:Object.freeze([0,386,702,1200,702,386,0,702,1200,702,386,0,702,386,1200,702])
});
function __xenStarterSourceSettings(){
 return {particle:{particleSystem:'ji',churchMode:'ionian',particlePreset:__XenFactoryStartSounds.particle,particleSampleProfileMode:'current_db_v2',
   particleGradientX:'edge_spark',particleGradientY:'warm_center',particleVolume:.165,particleMute:false},
  waveStarter:{preset:__XenFactoryStartSounds.waveStarter,enabled:true,volume:.22,waveTimbreGradientEnabled:true,waveTimbreGradientX:'wire_to_psy',
   waveVolumeGradientEnabled:false,waveVolumeGradientX:'none',waveOvertonesEnabled:false,waveOvertoneWaveform:'triangle',waveOvertoneMode:'arp',
   waveOvertoneArpRate:64,waveOvertoneArpPattern:'updown',waveOvertoneArpSteps:8,waveOvertoneGlobalLevel:1,
   waveStarterHoldSegments:24,waveStarterHoldCustomSegments:48,waveStarterHoldReferenceBars:1,
   waveStarterHoldPatternSteps:Array.from({length:24},()=>1),waveStarterHoldSoundPreset:__XenFactoryStartSounds.waveStarter},
  keyboard:{keyboardHoldSegments:__XenKeyboardHoldStartupDemo.segments,keyboardHoldCustomSegments:48,keyboardHoldReferenceBars:__XenKeyboardHoldStartupDemo.bars,
   keyboardHoldPatternSteps:__XenKeyboardHoldStartupDemo.steps.slice(),keyboardHoldPitchCents:__XenKeyboardHoldStartupDemo.cents.slice(),keyboardHoldSoundPreset:__XenFactoryStartSounds.keyboard},
  octaves:{particle:0,wave:0,keyboard:0},pan:Object.fromEntries(['particle','wave','keyboard',...Array.from({length:32},(_,i)=>'particle:'+i)].map(k=>[k,0]))};
}
function __xenStarterPresetRecords(){
 const modeMasks={
  '12edo|aeolian':[1,4,6,9,11],
  'ji|harmonic_minor':[3,5,8,9,10],
  'bp|bp_minor':[2,4,7,10],
  '19edo|phrygian':[1,3,4,6,7,9,10,12,14,15,17,18],
  '31edo|dorian':[1,2,3,4,6,7,9,10,11,12,14,15,16,17,19,20,21,22,24,25,27,28,29,30]
 };
 const profile=(id,name,instanceId,modeId,bassDegrees=null)=>{
   // Both enabled starters have twelve degrees. Avoid Kp's later bundle TDZ during bootstrap.
   const tuningSteps=bassDegrees?Array.from({length:12},(_,idx)=>idx):[];
   const bassEnabled=Array.isArray(bassDegrees);
   const wanted=bassEnabled?new Set(bassDegrees.map(degree=>degree-1)):null;
   const bassConfig=bassEnabled?{...__XenBassGrid.normalize(null),bassUsesGrid:true,
     // Both bass patterns use independent degree selections in the same tuning.
     inheritMainMutes:false,
     mutedDegrees:tuningSteps.map((_,idx)=>idx).filter(idx=>!wanted.has(idx))}:null;
   return {kind:'grid',id,name,instanceId,
     gridProfile:{modeId,mainMutedDegrees:[...(modeMasks[id+'|'+modeId]??[])],mainStepOffsets:[],bassEnabled,
       ...(bassConfig?{bassConfig}:{} )}};
  };
 const entry=(kind,id,name)=>({kind,id,name});
 const initial=[
  profile('12edo','12 EDO · Aeolian','starter-grid-aeolian-12', 'aeolian',[1,8,11]),
  // Native harmonic minor projects to JI ratios at indices [0,1,2,4,6,7,11].
  profile('ji','Just Intonation · Harmonic Minor','starter-grid-ji-harmonic','harmonic_minor',[1,6,7,10,12]),
  profile('bp','Bohlen–Pierce · BP Moll','starter-grid-bp-minor','bp_minor'),
  entry('drum','preset:broken_lilt','Broken Lilt · Default'),
  entry('drum','preset:four_on_floor','Four on the Floor'),
  entry('drum','preset:forge_fractured','RhythmForge · Fractured'),
  entry('bass','preset:stotter','Stutter Sub · Default'),
  entry('bass','preset:forge_fractured','RhythmForge · Fractured'),
  entry('bass','preset:psy_classic','PsyBass · Classic Offbeat'),
   ...__xenStarterDemoReferences()];
 const alternate=[
  profile('19edo','19 EDO · Phrygian','starter-grid-19-phrygian','phrygian'),
  profile('31edo','31 EDO · Dorian','starter-grid-31-dorian','dorian'),
  entry('drum','preset:breakbeat','Breakbeat'),
  entry('drum','preset:minimal_techno','Minimal HiHat'),
  entry('bass','preset:psy_dark','PsyBass · Dark Forest'),
  entry('bass','preset:psy_gallop','PsyBass · Gallop')];
 // Primary: column-family backgrounds, individual border per tile.
 // Secondary: intentionally irregular, high-contrast color clashes, saved deterministically.
 const primaryPairs=[
  ['#83c5ed','#122d40'],['#b5f0d1','#122d40'],['#d5b6f1','#122d40'],
  ['#f5a167','#3b291e'],['#f0d080','#3b291e'],['#e9a0a5','#3b291e'],
  ['#8bd7ac','#17382d'],['#73d4d7','#17382d'],['#95b7e9','#17382d'],
   ['#69d8df','#1d344a'],['#d2a0e8','#352940'],['#8be7ae','#1d344a'],
   ['#e6b07a','#352940'],['#8dc4f2','#1d344a'],['#efa5a8','#352940']];
 const secondaryPairs=[
  ['#e8ab54','#4a1d68'],['#ffb4d5','#115c57'],
  ['#82dbf4','#643016'],['#e2a1ff','#25427b'],
  ['#ffcc70','#4a611f'],['#a6f0a0','#6d294c']];
 const record=(id,name,items,pairs,sounds=false)=>({id,name,items,
  colors:Object.fromEntries(items.map((item,i)=>[__xenMetaColorKey(item),{border:pairs[i][0],background:pairs[i][1]}])),
  roomSettings:null});
 const primary=record(__XenStarterPrimaryId,'01 · Three Minor Worlds',initial,primaryPairs);
 primary.songPerformance={version:1,entries:[],sources:__xenStarterSourceSettings()};
 return {primary,
  secondary:record(__XenStarterSecondaryId,'02 · Alternate Rhythms',alternate,secondaryPairs)};
}
/* Repair only the known P7.38.11 defaults. Identity alone does not establish
   provenance: renamed tiles, copied instances and any authored offset stay put. */
function __xenStarterLegacyGridProfile(item,standard){
 if(item?.kind!=='grid'||!standard||item.id!==standard.id||item.instanceId!==standard.instanceId||item.name!==standard.name||!item.gridProfile)return false;
 const p=__xenGridProfile(item.gridProfile),legacyMode=item.instanceId==='starter-grid-ji-harmonic'?'chromatic':standard.gridProfile.modeId;
 const legacyMutes=item.instanceId==='starter-grid-ji-harmonic'?[3,5,8,9,10]:[];
 return p.modeId===legacyMode&&p.mainMutedDegrees.join(',')===legacyMutes.join(',')&&
  p.mainStepOffsets.every(offset=>offset===0)&&!p.bassEnabled;
}
function __xenStarterBassGridUpgradeCandidate(item,standard){
 if(item?.kind!=='grid'||!standard||!standard.gridProfile?.bassEnabled||item.id!==standard.id||
    item.instanceId!==standard.instanceId||item.name!==standard.name||!item.gridProfile)return false;
 const p=__xenGridProfile(item.gridProfile);
 if(p.bassEnabled||p.modeId!==standard.gridProfile.modeId||
    p.mainMutedDegrees.join(',')!==standard.gridProfile.mainMutedDegrees.join(',')||
    p.mainStepOffsets.some(cents=>Math.abs(cents)>1e-6))return false;
 const untouched=__XenBassGrid.normalize(null);
 return JSON.stringify(p.bassConfig)===JSON.stringify({...untouched,bassUsesGrid:true});
}
function __xenStarterKnownRecord(row){
 if(!row||row.legacyOrigin)return false;
 return Object.values(__xenStarterPresetRecords()).some(standard=>row.id===standard.id&&
   (row.name===standard.name||row.id===__XenStarterPrimaryId&&row.name==='01 · Three Minor Worlds'));
}
