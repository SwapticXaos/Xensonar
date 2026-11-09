/* P0: project-scoped performance envelope. Stored inside the existing V2
 * session records (Package Station already classifies that archive as sessions).
 * Quickrack references remain canonical; no extra fields are added to them. */
const __f48BassVoices = Object.freeze({
 classic:{label:'Classic Forge',wave:'sawtooth',second:'triangle',detune:1.004,sub:1,color:1,gain:1},
 sub:{label:'Pure Sub',wave:'sine',sub:0,color:.65,gain:.85},
 round:{label:'Round & Warm',wave:'triangle',second:'sine',detune:1.002,sub:.38,color:.8,gain:.8},
 acid:{label:'Acid Pulse',wave:'square',sub:.45,color:1.65,gain:.68},
 hollow:{label:'Hollow Reed',wave:'triangle',second:'square',detune:2.002,sub:.3,color:1.25,gain:.58},
 wire:{label:'Wire Pluck',wave:'sawtooth',second:'triangle',detune:1.009,sub:.3,color:1.8,gain:.68}
});
/* P1: one owned sound description; never include mixer, grid or global rack values.
 * Legacy clips without timbre remain distinguishable from saved Classic Forge. */
/* BVE-01: factory bass recipes remain immutable; snapshots carry portable custom recipes.
   "detune" is the established oscillator FREQUENCY RATIO, not cents. */
const __xenBassVoiceWaves=Object.freeze(['sine','triangle','sawtooth','square']);
const __xenBassVoiceRecipeBounds=Object.freeze({detune:[.25,4],sub:[0,1.5],color:[.2,2.5],gain:[.05,1.25]});
function __xenBassVoiceRecipeClean(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||
    !__xenBassVoiceWaves.includes(value.wave)||
    !(value.second===null||value.second===''||__xenBassVoiceWaves.includes(value.second)))return null;
 const out={wave:value.wave,second:value.second||null};
 for(const [key,[min,max]] of Object.entries(__xenBassVoiceRecipeBounds)){
  if(!Number.isFinite(value[key]))return null;
  out[key]=Math.max(min,Math.min(max,value[key]));
 }
 out.classicMode=value.classicMode===true;
 return out;
}
function __xenBassVoiceFactoryRecipe(id){
 const key=Object.hasOwn(__f48BassVoices,id)?id:'classic',v=__f48BassVoices[key];
 return __xenBassVoiceRecipeClean({wave:v.wave,second:v.second||null,detune:v.detune??1,
  sub:v.sub,color:v.color,gain:v.gain,classicMode:key==='classic'});
}
function __xenBassVoiceResolve(params){
 if(params?.bassVoice==='custom'){
  const recipe=__xenBassVoiceRecipeClean(params.bassVoiceRecipe);
  if(recipe)return recipe;
 }
 return __xenBassVoiceFactoryRecipe(params?.bassVoice);
}
const __xenBassUserVoicesKey='xensonar.bass.userVoices.v1';
const __xenBassUserVoicesChanged='xensonar:bass-user-voices-changed';
function __xenBassUserVoicesLoad(){
 let payload=null;
 try{payload=JSON.parse(window.localStorage.getItem(__xenBassUserVoicesKey)||'null')}catch{}
 const voices=Array.isArray(payload?.voices)?payload.voices:[];
 const seen=new Set();
 return voices.slice(0,80).flatMap(raw=>{
  if(typeof raw?.id!=='string'||!/^bassvoice:[a-zA-Z0-9-]+$/.test(raw.id)||raw.id.length>95||seen.has(raw.id))return [];
  const recipe=__xenBassVoiceRecipeClean(raw.recipe),name=typeof raw.name==='string'?raw.name.trim().slice(0,60):'';
  if(!recipe||!name)return [];
  seen.add(raw.id);return [{id:raw.id,name,recipe}];
 });
}
function __xenBassUserVoicesWrite(voices){
 const clean=voices.slice(0,80);
 window.localStorage.setItem(__xenBassUserVoicesKey,JSON.stringify({version:1,voices:clean}));
 window.dispatchEvent(new Event(__xenBassUserVoicesChanged));
 return clean;
}
function __xenBassUserVoiceSaveAs(name,recipe){
 const label=String(name??'').trim().slice(0,60);
 if(!label)throw Error('Enter a name for the new Voice.');
 const clean=__xenBassVoiceRecipeClean(recipe);
 if(!clean)throw Error('Voice recipe is invalid.');
 const voices=__xenBassUserVoicesLoad();
 if(voices.length>=80)throw Error('The 80-Voice library limit has been reached.');
 if(voices.some(v=>v.name.toLocaleLowerCase()===label.toLocaleLowerCase()))throw Error('A Voice with this name already exists.');
 const id='bassvoice:'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
 const saved={id,name:label,recipe:clean};
 __xenBassUserVoicesWrite([...voices,saved]);
 return saved;
}
function __xenBassUserVoiceUpdate(id,recipe){
 const voices=__xenBassUserVoicesLoad(),entry=voices.find(v=>v.id===id);
 if(!entry)throw Error('The selected saved Voice is no longer in the library.');
 const clean=__xenBassVoiceRecipeClean(recipe);
 if(!clean)throw Error('Voice recipe is invalid.');
 const updated={...entry,recipe:clean};
 __xenBassUserVoicesWrite(voices.map(v=>v.id===id?updated:v));
 return updated;
}
function __xenBassUserVoiceRemove(id){
 const voices=__xenBassUserVoicesLoad();
 if(!voices.some(v=>v.id===id))throw Error('The selected saved Voice is missing.');
 __xenBassUserVoicesWrite(voices.filter(v=>v.id!==id));
}
const __xenBassTimbreDefaults=Object.freeze({bassVoice:'classic',bassTone:.48,bassGrit:.18,
 bassResonance:0,bassEnvelope:1,bassDecay:1,bassSub:1});
const __xenBassTimbreBounds=Object.freeze({bassTone:[0,1],bassGrit:[0,1],
 bassResonance:[0,1],bassEnvelope:[0,2],bassDecay:[.25,2],bassSub:[0,1.5]});
function __xenBassTimbreClean(value){
 const input=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 const recipe=input.bassVoice==='custom'?__xenBassVoiceRecipeClean(input.bassVoiceRecipe):null;
 const out={bassVoice:recipe?'custom':Object.hasOwn(__f48BassVoices,input.bassVoice)?input.bassVoice:'classic'};
 for(const [key,[min,max]] of Object.entries(__xenBassTimbreBounds)){
  const n=input[key];out[key]=Number.isFinite(n)?Math.max(min,Math.min(max,n)):__xenBassTimbreDefaults[key];
 }
 out.bassVoiceRecipe=recipe;
 out.bassVoiceUserId=recipe&&typeof input.bassVoiceUserId==='string'?input.bassVoiceUserId.slice(0,95):'';
 out.bassVoiceUserName=recipe&&typeof input.bassVoiceUserName==='string'?input.bassVoiceUserName.slice(0,60):'';
 return out;
}
function __xenBassTimbreCapture(params){return __xenBassTimbreClean(params)}
function __xenBassTimbrePatch(value){return value&&typeof value==='object'&&!Array.isArray(value)?__xenBassTimbreClean(value):null}
function __xenBassTuningClean(value){
 if(!value||value.version!==1||!['main','nested','original'].includes(value.source))return null;
 if(value.source!=='nested')return {version:1,source:value.source};
 if(typeof value.tuningId!=='string'||!value.tuningId||value.tuningId.length>=160||JSON.stringify(value).length>24000)return null;
 const c=value.config??{};
 if(typeof c!=='object'||Array.isArray(c))return null;
 for(const k of ['linkedMutedDegrees','stageMutedDegrees','mutedDegrees'])
  if(c[k]!=null&&(!Array.isArray(c[k])||c[k].length>256||c[k].some(n=>!Number.isInteger(n)||n<0||n>=256)))return null;
 if(c.offsetsCents!=null&&(typeof c.offsetsCents!=='object'||Array.isArray(c.offsetsCents)||Object.entries(c.offsetsCents).some(([k,n])=>!Number.isInteger(Number(k))||Number(k)<0||Number(k)>=256||!Number.isFinite(n)||Math.abs(n)>1200)))return null;
 return {version:1,source:'nested',tuningId:value.tuningId,config:JSON.parse(JSON.stringify(c))};
}
/* P5: Persist musical Drone Workbench controls, never Web Audio nodes or rhythm timers. */
const __xenDronePersist=(()=>{
 const KEY='xensonar:refucktor-drone-workbench.v1',VOLUME='xensonar:refucktor-drone-volume.v1';
 const fields=['dronePreset','droneFixedHz','droneSnapToGrid','droneTimbre','droneVibrato','droneFlanger','droneRefucktorEcho','droneRefucktorFeedback','droneRhythm','droneRhythmCustomSteps','droneWobbleDepth','droneWobbleShape','droneWobbleRate','droneDubDrive','droneCursorFollow','droneCursorAmount','droneStepWobbleShapes','droneDriveOn','droneDriveAmount','droneDriveTone','droneDriveMix','droneDriveOutput','droneEnabled'];
 const allowed=new Set(fields);
 const normalize=(input)=>{
  const out={};if(!input||typeof input!=='object')return out;
  for(const key of fields){const value=input[key];
   if(key==='droneStepWobbleShapes'){if(Array.isArray(value)&&value.length===16)out[key]=value.map(n=>Number.isInteger(n)&&n>=0&&n<=4?n:0);continue}
   if(key==='droneRhythmCustomSteps'){if(Array.isArray(value)&&value.length===16)out[key]=value.map(n=>n?1:0);continue}
   const booleans=['droneSnapToGrid','droneCursorFollow','droneDriveOn','droneEnabled'];
   const strings=['dronePreset','droneRhythm','droneWobbleShape','droneWobbleRate'];
   if(booleans.includes(key)){if(typeof value==='boolean')out[key]=value;}
   else if(strings.includes(key)){if(typeof value==='string'&&value.length<=64)out[key]=value;}
   else if(typeof value==='number'&&Number.isFinite(value))out[key]=value;
  }return out;
 };
 const load=()=>{try{const raw=localStorage.getItem(KEY);if(raw&&raw.length<8192)return normalize(JSON.parse(raw))}catch{}return {}};
 const save=(state,patch)=>{if(!patch||!Object.keys(patch).some(k=>allowed.has(k)))return;try{localStorage.setItem(KEY,JSON.stringify(normalize(state)))}catch{}};
 const loadVolume=()=>{try{const n=Number(localStorage.getItem(VOLUME));return n>=0&&n<=1&&localStorage.getItem(VOLUME)!==null?n:.06}catch{return .06}};
 const saveVolume=n=>{if(Number.isFinite(n)&&n>=0&&n<=1)try{localStorage.setItem(VOLUME,String(n))}catch{}};
 return {load,save,loadVolume,saveVolume,normalize,hadPreviousVolume:()=>{try{return localStorage.getItem(VOLUME)!==null}catch{return false}}};
})();
function __xenSongSourcesSafe(value){
 const sources=value==null?null:JSON.parse(JSON.stringify(value));
 if(sources&&(typeof sources!=='object'||Array.isArray(sources)||JSON.stringify(sources).length>512000||
  Object.keys(sources).some(k=>!['particle','waveStarter','keyboard','octaves','pan','entrophon','definitions','bass','drone','samplePlaybackProfiles'].includes(k))))throw Error('Invalid song input configuration.');
 if(sources?.bass){const b=sources.bass;
  if(b.version!==1||!['clip','preset'].includes(b.mode)||typeof b.clipId!=='string'||b.clipId.length>150||
   typeof b.preset!=='string'||b.preset.length>100||!b.timbre||
   b.clip!==null&&b.clip!==undefined&&(b.mode!=='clip'||b.clip.id!==b.clipId||!Array.isArray(b.clip.events)||b.clip.events.length>512||JSON.stringify(b.clip).length>200000))throw Error('Invalid song Bass role.');
  b.timbre=__xenBassTimbreClean(b.timbre);
  if(b.tuning!=null){b.tuning=__xenBassTuningClean(b.tuning);if(!b.tuning)throw Error('Invalid song Bass tuning reference.');}
  if(b.tuningContext!=null){const c=b.tuningContext;
   if(typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(k=>!['gridTuning','gridBase','gridMode','manualGridMutedSteps','manualGridStepOffsets'].includes(k))||
    ['gridTuning','gridMode'].some(k=>c[k]!=null&&(typeof c[k]!=='string'||c[k].length>160))||
    c.gridBase!=null&&(!Number.isFinite(c.gridBase)||c.gridBase<=0||c.gridBase>20000)||
    c.manualGridMutedSteps!=null&&(!Array.isArray(c.manualGridMutedSteps)||c.manualGridMutedSteps.length>256||c.manualGridMutedSteps.some(n=>!Number.isInteger(n)||n<0||n>=256))||
    c.manualGridStepOffsets!=null&&(!Array.isArray(c.manualGridStepOffsets)||c.manualGridStepOffsets.length>256||c.manualGridStepOffsets.some(n=>!Number.isFinite(n)||Math.abs(n)>120)))throw Error('Invalid song Bass tuning context.');
  }
  if(b.root!=null){
   if(!['auto','fixed'].includes(b.root.mode)||!Number.isFinite(b.root.hz)||b.root.hz<=0||b.root.hz>20000)throw Error('Invalid song Bass root.');
   b.root={mode:b.root.mode,hz:b.root.hz};
  }
 }
 if(sources?.drone){const d=sources.drone;
  if(d.version!==1||!d.params||typeof d.params!=='object'||Array.isArray(d.params)||
   d.volume!==null&&d.volume!==undefined&&(!Number.isFinite(d.volume)||d.volume<0||d.volume>1))throw Error('Invalid song Drone role.');
  if(typeof __xenDronePersist!=='undefined'&&typeof __xenDronePersist.normalize==='function')d.params=__xenDronePersist.normalize(d.params);
 }
 if(sources?.entrophon){const value=sources.entrophon;
  if(value.version!==1||!value.configs||typeof value.configs!=='object'||Array.isArray(value.configs)||
   ['wave','particle','spectral'].some(key=>!value.configs[key]||typeof value.configs[key]!=='object'||Array.isArray(value.configs[key])))throw Error('Invalid song Entrophon configuration.');
 }
 if(sources?.definitions){const value=sources.definitions;
  if(value.version!==1||!value.nodal||!value.entrophon||[value.nodal,value.entrophon].some(bank=>typeof bank!=='object'||Array.isArray(bank))||
   Object.keys(value.nodal).length+Object.keys(value.entrophon).length>48)throw Error('Invalid song instrument definitions.');
 }
 return sources;
}
/* Pure musical EQ codec: no audio/runtime dependency during cold archive load. */
function __xenSongEQSafe(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||[value.a,value.b].some(c=>c!=null&&(!Array.isArray(c)||c.length>360)))throw Error('Invalid per-entry EQ curve.');
 const eqClamp=(x,min,max,fallback=0)=>Number.isFinite(Number(x))?Math.max(min,Math.min(max,Number(x))):fallback;
 const curve=c=>Array.from({length:360},(_,i)=>eqClamp(Array.isArray(c)?c[Math.round(i*(c.length-1)/359)]:0,-1,1));
 return {a:curve(value.a),b:curve(value.b),morph:eqClamp(value.morph,0,1),bands:Math.round(eqClamp(value.bands,4,24,12)),mode:value.mode==='raster'?'raster':'adaptive',
  low:eqClamp(value.low,-60,-6,-36),high:eqClamp(value.high,0,12,12),enabled:value.enabled!==false,
  manualCenters:Array.isArray(value.manualCenters)?value.manualCenters.slice(0,24).map(v=>typeof v==='number'&&Number.isFinite(v)?Math.max(20,Math.min(20000,v)):null):[]};
}
function __xenSongHoldEQSafe(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['klaviatur','wellenstart'].includes(k)))throw Error('Invalid Hold EQ assignment.');
 const out={};
 for(const [lane,binding] of Object.entries(value)){
  if(!binding||typeof binding!=='object'||Array.isArray(binding)||typeof binding.sourceKey!=='string'||!binding.sourceKey||binding.sourceKey.length>200||
    binding.label!==undefined&&(typeof binding.label!=='string'||binding.label.length>120)||!binding.definition)throw Error('Invalid Hold EQ assignment.');
  out[lane]={sourceKey:binding.sourceKey,label:binding.label??'EQ',definition:__xenSongEQSafe(binding.definition)};
 }
 return out;
}
function __xenSongPerformanceSafe(raw,items,rollbackOnly=false){
 if(raw==null)return null;
 if(!raw||![1,2].includes(raw.version)||!Array.isArray(raw.entries)||raw.entries.length>(rollbackOnly?483:240))throw Error('Invalid song performance snapshot.');
 const allowed=new Set(items.filter(e=>e.kind!=='grid').map(e=>e.kind+'\0'+e.id));
 const rows=[],seen=new Set(),clamp=(x,min,max,fallback)=>Number.isFinite(x)?Math.max(min,Math.min(max,x)):fallback;
 for(const e of raw.entries){
  if(!e||typeof e!=='object'||!['material','bass','drum','rootFollow'].includes(e.kind)||typeof e.id!=='string'||!allowed.has(e.kind+'\0'+e.id))throw Error('Song entry does not belong to session.');
  const key=e.kind+'\0'+e.id;if(seen.has(key))throw Error('Duplicate song performance entry.');seen.add(key);
  const mix=e.kind==='material'&&e.mix?{volume:clamp(e.mix.volume,0,1.5,1),pan:clamp(e.mix.pan,-1,1,0),
   pitch:clamp(e.mix.pitch,-1200,1200,0),att:Number.isFinite(e.mix.att)?e.mix.att:0,
   nudgeMode:e.mix.nudgeMode==='vinyl'?'vinyl':'granular',nudgeFeel:e.mix.nudgeFeel==='hard'?'hard':'soft'}:null;
  const eq=e.eq||raw.version===2?__xenSongEQSafe(e.eq??{}):null;
  // BVE04: optional sound snapshot owned by this Session Bass entry.
  const timbre=e.kind==='bass'&&e.timbre!=null?__xenBassTimbreClean(e.timbre):null;
  rows.push({kind:e.kind,id:e.id,mix,eq,...(timbre?{timbre}:{})});
 }
 const sources=__xenSongSourcesSafe(raw.sources);
 const hold=Object.hasOwn(raw,'holdEQ')?{holdEQ:__xenSongHoldEQSafe(raw.holdEQ)}:{};
 // Persist live instrument EQs as song-owned values, even when the optional
 // full Main Room snapshot is omitted. Legacy records may lack this envelope.
 const instrumentEQ={};
 if(Object.hasOwn(raw,'instrumentEQ')){
  const value=raw.instrumentEQ;
  if(raw.version!==2||!value||typeof value!=='object'||Array.isArray(value)||
   Object.keys(value).some(key=>!['particle','wave','keyboard'].includes(key)))throw Error('Invalid song instrument EQ.');
  for(const role of ['particle','wave','keyboard'])if(Object.hasOwn(value,role))instrumentEQ[role]=__xenSongEQSafe(value[role]);
 }
 const instrumentEnvelope=Object.hasOwn(raw,'instrumentEQ')?{instrumentEQ}:{};
 if(raw.version===1)return {version:1,entries:rows,sources,...hold};
 const placement=raw.materialPlacement,materialIds=new Set(items.filter(e=>e.kind==='material').map(e=>e.id));
 if(!placement||typeof placement!=='object'||Array.isArray(placement)||
  Object.keys(placement).some(k=>!['primaryId','secondaryIds','primaryMuted','enabled','activationOrder'].includes(k))||
  !(placement.primaryId===null||(typeof placement.primaryId==='string'&&materialIds.has(placement.primaryId)))||
  !Array.isArray(placement.secondaryIds)||placement.secondaryIds.length>2||
  placement.secondaryIds.some(id=>typeof id!=='string'||!materialIds.has(id)||id===placement.primaryId)||
  new Set(placement.secondaryIds).size!==placement.secondaryIds.length||
  placement.activationOrder!==undefined&&(!Array.isArray(placement.activationOrder)||
   placement.activationOrder.length>3||new Set(placement.activationOrder).size!==placement.activationOrder.length||
   placement.activationOrder.some(id=>typeof id!=='string'||!materialIds.has(id)||
    id!==placement.primaryId&&!placement.secondaryIds.includes(id)))||
  typeof placement.primaryMuted!=='boolean'||typeof placement.enabled!=='boolean'||
  placement.enabled&&placement.primaryId===null)throw Error('Invalid song material placement.');
 const activePlaced=[...(placement.enabled&&!placement.primaryMuted&&placement.primaryId?[placement.primaryId]:[]),
  ...(placement.enabled?placement.secondaryIds:[])];
 if(Object.hasOwn(placement,'activationOrder')&&(!Array.isArray(placement.activationOrder)||
   placement.activationOrder.length!==activePlaced.length||
   new Set(placement.activationOrder).size!==activePlaced.length||
   placement.activationOrder.some(id=>!activePlaced.includes(id))))throw Error('Invalid saved material activation order.');
 for(const id of [placement.primaryId,...placement.secondaryIds].filter(Boolean)){
  const row=rows.find(e=>e.kind==='material'&&e.id===id);
  if(!row?.mix)throw Error('Missing placed material mix.');
  if(id===placement.primaryId)row.mix.volume=Math.min(1,row.mix.volume);
 }
 const mixer=raw.mixer;
 if(!mixer||typeof mixer!=='object'||Array.isArray(mixer)||Object.keys(mixer).some(k=>!['bass','rootFollow','drum'].includes(k)))throw Error('Invalid song mixer.');
 const cleanMixer={};
 for(const role of ['bass','rootFollow','drum']){
  const value=mixer[role],ranges=role==='drum'?{volume:[0,1],pan:[-1,1]}:{volume:[0,1],pan:[-1,1],pitch:[-1200,1200],att:[-2,2]};
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!Object.prototype.hasOwnProperty.call(ranges,k)))throw Error('Invalid song mixer role.');
  const clean={};
  for(const [key,[min,max]] of Object.entries(ranges)){
   if(!Number.isFinite(value[key])||value[key]<min||value[key]>max)throw Error('Invalid song mixer value.');
   clean[key]=value[key];
  }
  cleanMixer[role]=clean;
 }
 return {version:2,entries:rows,sources,...hold,...instrumentEnvelope,materialPlacement:{primaryId:placement.primaryId,secondaryIds:[...placement.secondaryIds],primaryMuted:placement.primaryMuted,enabled:placement.enabled,
  ...(placement.activationOrder?{activationOrder:[...placement.activationOrder]}:{})},mixer:cleanMixer};
}
function __xenSongPerformanceCapture(items,rollbackOnly=false,previous=null){
 if(typeof __XenMaterialVoiceMix!=='undefined'&&__XenMaterialVoiceMix.isSettling?.(items))throw Error('Nudge position is still settling. Please save again after releasing the control.');
 if(typeof __XenMainRoomSessionBridge==='undefined'||!__XenMainRoomSessionBridge.available()||typeof __XenMainRoomSessionBridge.captureSongMix!=='function')throw Error('Song mixer is not ready to capture.');
 const songMix=__XenMainRoomSessionBridge.captureSongMix(items);
 if(!songMix||typeof songMix!=='object')throw Error('Song mixer is not ready to capture.');
 if(typeof __XenEQ==='undefined'||typeof __XenEQ.capture!=='function')throw Error('Song EQ is not ready to capture.');
  const eq=__XenEQ.capture(items);
  const priorBass=new Map((previous?.entries??[]).filter(e=>e.kind==='bass'&&e.timbre)
   .map(e=>[e.id,__xenBassTimbreCapture(e.timbre)]));
 const entries=items.filter(e=>['material','bass','drum','rootFollow'].includes(e.kind)).map(e=>{
  const m=e.kind==='material'&&typeof __XenMaterialVoiceMix!=='undefined'?__XenMaterialVoiceMix.get(e.id):null;
  const mix=m?{volume:m.volume,pan:m.pan,pitch:m.pitch,att:m.att,nudgeMode:m.nudgeMode,nudgeFeel:m.nudgeFeel}:null;
  if(mix&&e.id===songMix.materialPlacement?.primaryId){
   if(!songMix.primaryMix||!Number.isFinite(songMix.primaryMix.volume)||!Number.isFinite(songMix.primaryMix.pan))throw Error('Primary song mixer is not ready to capture.');
   mix.volume=songMix.primaryMix.volume;mix.pan=songMix.primaryMix.pan;
  }
  // BVE04: freeze every Bass clip Voice as part of its own Session tile.
  const bassClipId=e.kind==='bass'&&e.id.startsWith('clip:')?e.id.slice(5):null;
  // The clip library is authoritative for inactive tiles; session-bound live
  // clip overlays must never silently replace another library entry at Save.
  const libraryClip=bassClipId&&typeof sc==='function'?sc().clips.find(c=>c.id===bassClipId):null;
  const sourceClip=libraryClip??(bassClipId&&typeof eH==='function'?eH(bassClipId):null);
  // The selected Bass lane is an intentional live edit. Save Session captures
  // what is currently heard for that tile; other tiles keep their saved sounds.
  const activeClip=bassClipId&&__XenMainRoomSessionBridge.activeBassClipId?.()===bassClipId;
  const timbre=bassClipId?__xenBassTimbreCapture(activeClip?
   __XenMainRoomSessionBridge.readBassTimbre():priorBass.get(e.id)??sourceClip?.timbre):null;
  return {kind:e.kind,id:e.id,mix,
   eq:eq[e.kind+':'+e.id]??null,...(timbre?{timbre}:{})};
 });
 const sources=__XenMainRoomSessionBridge.captureSongSources();
 return __xenSongPerformanceSafe({version:2,entries,sources,holdEQ:eq.__avalancheBindings??{},
  instrumentEQ:Object.fromEntries(['particle','wave','keyboard'].map(role=>[role,eq[role+':instrument']??__XenEQ.neutral()])),
  materialPlacement:songMix.materialPlacement,mixer:songMix.mixer},items,rollbackOnly);
}
/* Keep saved placement aligned when an editor/library operation removes a
 * reference. Catalog reordering never changes the three live roles. */
function __xenSongPerformancePrune(raw,items){
 if(!raw)return raw;
 const valid=new Set(items.map(e=>e.kind+'\0'+e.id));
 raw.entries=raw.entries.filter(e=>valid.has(e.kind+'\0'+e.id));
 if(raw.version===2){const p=raw.materialPlacement;
  if(p.primaryId&&!valid.has('material\0'+p.primaryId)){p.primaryId=null;p.enabled=false;p.primaryMuted=false}
  p.secondaryIds=p.secondaryIds.filter(id=>valid.has('material\0'+id));
  if(p.activationOrder){
   const placed=p.enabled?[...(p.primaryMuted||!p.primaryId?[]:[p.primaryId]),...p.secondaryIds]:[];
   p.activationOrder=[...placed.filter(id=>!p.activationOrder.includes(id)),
    ...p.activationOrder.filter(id=>placed.includes(id))];
  }
 }
 return raw;
}
function __xenSongPerformanceApply(performance,items,roomSettings=null,rollbackOnly=false,allowUnloaded=false){
 const cfg=__xenSongPerformanceSafe(performance,items,rollbackOnly),mix={},eq={};
 const rows=new Map((cfg?.entries??[]).map(e=>[e.kind+'\0'+e.id,e]));
 // Every relevant entry gets an explicit default; an absent legacy envelope
 // must never inherit another song's Nudge, Pitch or EQ.
 for(const item of items){
  if(!['material','bass','rootFollow','drum'].includes(item.kind))continue;
  const entry=rows.get(item.kind+'\0'+item.id),key=item.kind+':'+item.id;
  if(item.kind==='material'&&entry?.mix)mix[item.id]=entry.mix;
  eq[key]=entry?.eq??(cfg?.version!==2?roomSettings?.eq?.[key]:null)??
   {a:[0,0],b:[0,0],morph:0,bands:12,mode:'adaptive',low:-36,high:12,enabled:true};
 }
 __XenMainRoomSessionBridge.clearPendingSongSources?.();
 __XenMainRoomSessionBridge.applySongMix(cfg,items,roomSettings,allowUnloaded);
 if(typeof __XenMaterialVoiceMix!=='undefined')__XenMaterialVoiceMix.restoreSession(items,mix);
 // A song with instrumentEQ wins over old optional room snapshots.
 // Legacy sessions can still restore their instrument EQ via roomSettings.
 // Missing values are reset rather than accidentally inherited from another song.
 for(const role of ['particle','wave','keyboard']){
  const key=role+':instrument';
  eq[key]=cfg?.instrumentEQ?.[role]??roomSettings?.eq?.[key]??__XenEQ.neutral();
 }
 if(cfg&&Object.hasOwn(cfg,'holdEQ'))eq.__avalancheBindings=cfg.holdEQ;
 else if(roomSettings?.eq&&Object.hasOwn(roomSettings.eq,'__avalancheBindings'))eq.__avalancheBindings=__xenSongHoldEQSafe(roomSettings.eq.__avalancheBindings);
 if(typeof __XenEQ!=='undefined')__XenEQ.restore(eq);
 // BVE04: an active role must not contradict its saved Session Bass tile.
 if(cfg?.sources?.bass?.mode==='clip'){
  const tile=rows.get('bass\0clip:'+cfg.sources.bass.clipId);
  if(tile?.timbre)cfg.sources.bass.timbre=__xenBassTimbreCapture(tile.timbre);
 }
 if(cfg?.sources)__XenMainRoomSessionBridge.applySongSources(cfg.sources,roomSettings?.nParamsUI);
 else {__xenBassSessionClipInstall(null,null);__XenP36SessionSampleLength.activate(null);__XenLiveSampleProfiles.restore(null);} // Source-less Engage clears Bass clip, sample cap, and Live sample role profiles.
}
/* LR2: tiny, JSON-safe references; WAV data remains in IndexedDB. */
function __xenLoopRecSafeTakes(raw){
 if(!Array.isArray(raw))return [];
 const seen=new Set();return raw.filter(row=>{if(!row||typeof row.id!=='string'||!row.id.startsWith('loop-rec-')||seen.has(row.id))return false;seen.add(row.id);return true}).slice(0,2000).map(row=>{
  return {id:row.id,name:String(row.name||'Loop-Rec').slice(0,100),durationSec:Number.isFinite(row.durationSec)?Math.max(0,row.durationSec):0,bars:Number.isFinite(row.bars)?Math.max(1,Math.round(row.bars)):1,createdAt:String(row.createdAt||'').slice(0,50)};
 });
}
/* M3 compatibility: an explicitly session-owned Loop-Rec take is also a
   valid material reference in that *same* session's song performance. This is
   read-time normalization only. Never infer ownership from a WAV name/ID or
   global catalog, never create or delete PCM, never silently adopt foreign IDs. */
function __xenMetaMergeOwnedTakeRefs(entry){
 if(!entry||typeof entry!=="object"||!Array.isArray(entry.items))return entry;
 const takes=__xenLoopRecSafeTakes(entry.sessionTakes);
 if(!takes.length)return entry;
 const ids=new Set(entry.items.filter(e=>e?.kind==='material').map(e=>e.id));
 const missing=takes.filter(t=>!ids.has(t.id));
 if(!missing.length)return entry;
 return {...entry,items:[...entry.items,...missing.map(t=>({kind:'material',id:t.id,name:t.name}))]};
}
/* M5: inspect actual archive provenance without normalizing, accepting foreign
   references, writing storage or modifying the audio/session owners. */
function __xenM5ArchiveInspection(storage){
 const key='xensonar.meta-sessions.v2';
 const raw=storage.getItem(key),results={version:1,archive:{present:raw!==null,bytes:raw?.length??0,savedCount:null},conflicts:[],errors:[],readOnly:true};
 if(raw===null){results.errors.push('Canonical V2 archive is missing.');return results;}
 let archive;
 try{archive=JSON.parse(raw)}catch(e){results.errors.push('V2 archive cannot be parsed: '+e.message);return results}
 if(!archive||typeof archive!=='object'||!Array.isArray(archive.saved)||!Array.isArray(archive.items)){
  results.errors.push('V2 archive does not contain the expected items/saved arrays.');return results;
 }
 results.archive.savedCount=archive.saved.length;results.archive.loadedId=archive.loadedId??null;
 const row=(value,location)=>{
  if(!value||typeof value!=='object')return;
  const items=Array.isArray(value.items)?value.items:[];
  const allowed=new Set(items.filter(e=>e&&typeof e.id==='string'&&typeof e.kind==='string').map(e=>e.kind+'\0'+e.id));
  // Only explicitly owned takes from THIS same record are added to allowed IDs.
  for(const take of Array.isArray(value.sessionTakes)?value.sessionTakes:[]){
   if(typeof take?.id==='string'&&take.id.startsWith('loop-rec-'))allowed.add('material\0'+take.id);
  }
  const perf=value.songPerformance;
  if(!perf)return;
  if(!Array.isArray(perf.entries)){results.errors.push(location+': invalid performance entries array.');return}
  for(const e of perf.entries){
   if(!e||typeof e.kind!=='string'||typeof e.id!=='string'){
    results.errors.push(location+': malformed song performance entry.');continue;
   }
   if(!allowed.has(e.kind+'\0'+e.id)&&results.conflicts.length<200){
    results.conflicts.push({location,sessionId:value.id??(location==='editor'?archive.loadedId??null:null),sessionName:value.name??null,kind:e.kind,id:e.id,
     reason:'Performance reference absent from this record items and explicit sessionTakes'});
   }
  }
  const placement=perf.materialPlacement;
  if(placement&&typeof placement==='object'){
   const ids=[placement.primaryId,...(Array.isArray(placement.secondaryIds)?placement.secondaryIds:[])].filter(Boolean);
   for(const id of ids){if(typeof id==='string'&&!allowed.has('material\0'+id)&&results.conflicts.length<200&&
    !results.conflicts.some(c=>c.location===location&&c.kind==='material'&&c.id===id)){
    results.conflicts.push({location,sessionId:value.id??null,sessionName:value.name??null,kind:'material',id,
     reason:'Song material placement references absent item'});
   }}
  }
 };
 row(archive,'editor');
 archive.saved.forEach((value,i)=>row(value,'saved['+i+']'));
 row(archive.activePalette,'activePalette');
 results.archive.checkedRows=archive.saved.length+1+(archive.activePalette?1:0);
 // Working Copy is independent and never silently used to authorize another saved row.
 const workingRaw=storage.getItem('xensonar.working-session.v1');
 if(workingRaw){try{const working=JSON.parse(workingRaw);row(working.row,'workingCopy')}catch(e){results.errors.push('Working Copy JSON cannot be parsed: '+e.message)}}
 return results;
}
function __xenM5ExportArchiveRescue(){
 const keys=['xensonar.meta-sessions.v2','xensonar.meta-sessions.v1','xensonar.working-session.v1',
  'xensonar.meta-sessions.m13.boot.v1','xensonar.meta-sessions.v2.before-delete.v1','xensonar.quick-menu.v2'];
 const payload={description:'READ-ONLY backup of XenSonar session-related localStorage keys; may contain private project data.',
  exportedAt:new Date().toISOString(),diagnosis:__xenM5ArchiveInspection(localStorage),
  rawKeys:Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]))};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download='XenSonar_M5_Archive_Rescue_'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
/* M6 · manual, fail-closed recovery for cross-session performance references.
   Deliberately NOT a WAV-deleter: an invalid performance pointer may reference
   an audio asset actually owned by another session. IDB stays untouched. */
function __xenM6PreviewRemoval(storage,selection){
 const KEY='xensonar.meta-sessions.v2',raw=storage.getItem(KEY);
 if(typeof raw!=='string'||!raw)throw Error('Original session archive is missing.');
 const report=__xenM5ArchiveInspection(storage);
 if(report.errors.length)throw Error('Structural errors require separate manual review; archive unchanged.');
 if(!report.conflicts.length)throw Error('No conflicts to remove.');
 if(report.conflicts.length>=200)throw Error('Conflict report is truncated. Manual review required.');
 if(!Array.isArray(selection)||!selection.length)throw Error('Select the problem references to remove.');
 const key=x=>x.location+'\u0000'+x.kind+'\u0000'+x.id;
 const reported=new Map(report.conflicts.map(x=>[key(x),x]));
 const chosen=new Set();
 for(const s of selection){if(!s||!reported.has(key(s)))throw Error('Selected reference is not a reported conflict.');chosen.add(key(s));}
 if(chosen.size!==reported.size)throw Error('Some incompatible references remain. Select all reported conflicts to restore normal Meta-Menu access.');
 const archive=JSON.parse(raw);
 const modified=JSON.parse(raw),changes=[];
 for(const [position,row] of modified.saved.entries()){
  const location='saved['+position+']';
  const forRow=report.conflicts.filter(x=>x.location===location);
  if(!forRow.length)continue;
  if(!row||!row.songPerformance||!Array.isArray(row.songPerformance.entries))throw Error('Malformed song-performance record at '+location);
  const invalid=forRow.filter(x=>x.reason==='Performance reference absent from this record items and explicit sessionTakes');
  if(invalid.length!==forRow.length)throw Error('Incompatible material placement or unknown reference at '+location+'; manual review required.');
  const targets=new Set(invalid.map(x=>x.kind+'\u0000'+x.id));
  const placement=row.songPerformance.materialPlacement;
  if(placement){
   const inPlacement=[placement.primaryId,...(Array.isArray(placement.secondaryIds)?placement.secondaryIds:[]),...(Array.isArray(placement.activationOrder)?placement.activationOrder:[])].filter(Boolean);
   if(inPlacement.some(id=>invalid.some(c=>c.kind==='material'&&c.id===id)))throw Error('Selected material is also referenced by active song placement at '+location+'; separate manual review required.');
  }
  const before=row.songPerformance.entries.length;
  row.songPerformance.entries=row.songPerformance.entries.filter(x=>!targets.has(x.kind+'\u0000'+x.id));
  const removed=before-row.songPerformance.entries.length;
  if(removed<targets.size)throw Error('Performance entries changed or cannot be located in '+location+'.');
  changes.push({location,sessionId:row.id,sessionName:row.name,removed:invalid.map(x=>({kind:x.kind,id:x.id}))});
 }
 if(changes.reduce((n,x)=>n+x.removed.length,0)!==chosen.size)throw Error('Unsafe conflict location. No changes proposed.');
 const repairedRaw=JSON.stringify(modified);
 const testStorage={getItem:k=>k===KEY?repairedRaw:storage.getItem(k)};
 const afterwards=__xenM5ArchiveInspection(testStorage);
 if(afterwards.errors.length||afterwards.conflicts.length)throw Error('Proposed repair is incomplete; archive unchanged.');
 return {repairedRaw,changes,removedCount:chosen.size,remainingIssues:0,originalArchive:raw};
}
function __xenM6ApplySelectedRemoval(storage,selection,confirmFn){
 const KEY='xensonar.meta-sessions.v2',WORKKEY='xensonar.working-session.v1';
 const plan=__xenM6PreviewRemoval(storage,selection);
 if(typeof confirmFn!=='function'||confirmFn(plan)!==true)return {applied:false};
 // Do not overwrite data that changed after preview or across another tab.
 if(storage.getItem(KEY)!==plan.originalArchive)throw Error('Session archive changed while confirming. Retry.');
 const originalWork=storage.getItem(WORKKEY);
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 const backupKey='xensonar.archive-rescue.m6.original.'+stamp+'-'+Math.random().toString(36).slice(2,9);
 const backup=JSON.stringify({version:1,createdAt:new Date().toISOString(),originalArchive:plan.originalArchive,originalWorking:originalWork,changes:plan.changes});
 // Backup MUST succeed and read back exactly before we touch the canonical archive.
 storage.setItem(backupKey,backup);
 if(storage.getItem(backupKey)!==backup)throw Error('Original archive backup verification failed. Nothing was changed.');
 if(storage.getItem(KEY)!==plan.originalArchive||storage.getItem(WORKKEY)!==originalWork)throw Error('Session data changed during backup. No changes applied.');
 try{
  storage.setItem(KEY,plan.repairedRaw);
  if(storage.getItem(KEY)!==plan.repairedRaw)throw Error('Archive write verification failed.');
  const afterwards=__xenM5ArchiveInspection(storage);
  if(afterwards.errors.length||afterwards.conflicts.length)throw Error('Archive verification detected unresolved conflicts.');
 }catch(error){
  try{if(storage.getItem(KEY)===plan.repairedRaw)storage.setItem(KEY,plan.originalArchive)}catch(_){/* durable backup key remains */}
  throw Error('Repair could not finish: '+error.message+'; backup: '+backupKey);
 }
 return {applied:true,removedCount:plan.removedCount,backupKey,changes:plan.changes};
}

/* M7 quota-safe rescue: verify the exact archive backup by READING a file saved outside
   localStorage. Do not allocate any additional localStorage key or touch IndexedDB. */
function __xenM7VerifyExternalBackup(storage,payload){
 const mandatory=['xensonar.meta-sessions.v2','xensonar.meta-sessions.v1','xensonar.working-session.v1',
  'xensonar.meta-sessions.m13.boot.v1','xensonar.meta-sessions.v2.before-delete.v1','xensonar.quick-menu.v2'];
 if(!payload||!payload.rawKeys||typeof payload.rawKeys!=='object'||Array.isArray(payload.rawKeys))throw Error('Backup file is not an archive-rescue export.');
 const keys=payload.rawKeys;
 for(const k of mandatory){
  if(!Object.prototype.hasOwnProperty.call(keys,k))throw Error('Backup file is incomplete: missing '+k);
  if(keys[k]!==null&&typeof keys[k]!=='string')throw Error('Backup file contains an invalid storage value for '+k);
  if(storage.getItem(k)!==keys[k])throw Error('Backup differs from the current browser storage ('+k+'). Export a fresh copy and verify it.');
 }
 if(typeof keys['xensonar.meta-sessions.v2']!=='string')throw Error('Backup contains no session archive.');
 return {ok:true,verifiedKeys:mandatory.length,archiveChars:keys['xensonar.meta-sessions.v2'].length};
}
function __xenM7ApplyWithVerifiedBackup(storage,selection,payload,confirmFn){
 // Verify all protected keys, not just the visible conflict ids; never use a stale backup.
 __xenM7VerifyExternalBackup(storage,payload);
 const plan=__xenM6PreviewRemoval(storage,selection);
 if(plan.repairedRaw.length>=plan.originalArchive.length)throw Error('Correction does not shrink the archive; manual review is required.');
 if(typeof confirmFn!=='function'||confirmFn(plan)!==true)return {applied:false};
 __xenM7VerifyExternalBackup(storage,payload);
 const KEY='xensonar.meta-sessions.v2';
 if(storage.getItem(KEY)!==plan.originalArchive)throw Error('Archive changed during confirmation; no changes made.');
 try{
  // Replacement is atomic in Web Storage; unlike M6 no second full copy is stored.
  storage.setItem(KEY,plan.repairedRaw);
 }catch(error){
  throw Error('Archive replacement failed ('+error.message+'). External backup is preserved; no new copy was created in browser storage.');
 }
 try{
  if(storage.getItem(KEY)!==plan.repairedRaw)throw Error('Archive readback is different from the proposed correction.');
  const check=__xenM5ArchiveInspection(storage);
  if(check.errors.length||check.conflicts.length)throw Error('Archive still contains incompatible references.');
  for(const [k,v] of Object.entries(payload.rawKeys))if(k!==KEY&&storage.getItem(k)!==v)throw Error('Another tab modified '+k+' during repair.');
 }catch(error){
  try{storage.setItem(KEY,plan.originalArchive)}catch(_){/* original is also held in verified external backup */}
  throw Error('Post-commit validation failed: '+error.message+'. The external backup was not altered.');
 }
 return {applied:true,removedCount:plan.removedCount,changes:plan.changes,externalBackupVerified:true};
}
function __XenM5ArchiveRescuePanel({onClose}){
 const d=__xenM5ArchiveInspection(localStorage);
 const [selected,setSelected]=P.useState({}),[confirming,setConfirming]=P.useState(false),[message,setMessage]=P.useState('');
 const [backup,setBackup]=P.useState(null),[backupStatus,setBackupStatus]=P.useState('No verified external backup selected.');
 const key=c=>c.location+'\\u0000'+c.kind+'\\u0000'+c.id;
 const selectedRefs=d.conflicts.filter(c=>selected[key(c)]);
 const allReady=d.conflicts.length>0&&selectedRefs.length===d.conflicts.length&&d.errors.length===0&&!!backup;
 const toggle=c=>{setConfirming(false);setSelected(v=>({...v,[key(c)]:!v[key(c)]}));};
 const chooseAll=()=>{setConfirming(false);setSelected(Object.fromEntries(d.conflicts.map(c=>[key(c),true])));};
 const verifyBackupFile=async ev=>{
  setBackup(null);setConfirming(false);setMessage('');
  const f=ev.target.files&&ev.target.files[0];if(!f){setBackupStatus('No backup file selected.');return;}
  try{
   if(f.size>30*1024*1024)throw Error('File is unusually large (>30 MB).');
   const payload=JSON.parse(await f.text());
   const check=__xenM7VerifyExternalBackup(localStorage,payload);
   setBackup(payload);
   setBackupStatus('Verified external file: '+f.name+' · '+check.verifiedKeys+' current storage keys match exactly.');
  }catch(e){setBackupStatus('Backup NOT verified: '+e.message);}
 };
 const run=()=>{try{
   const result=__xenM7ApplyWithVerifiedBackup(localStorage,selectedRefs,backup,()=>true);
   if(result.applied){setMessage('Removed '+result.removedCount+' invalid links. Your original archive remains in the verified downloaded JSON. Reloading…');window.location.reload();}
  }catch(e){setConfirming(false);setMessage('No complete repair: '+e.message);}};
 const button=(label,onClick,disabled=false)=>u.jsx('button',{type:'button',disabled,onClick,style:{background:disabled?'#252638':'#37314f',color:'#f1eafa',border:'1px solid #a8a0c9',padding:'10px 13px',borderRadius:5,cursor:disabled?'not-allowed':'pointer',opacity:disabled?.65:1},children:label});
 const actions=[button('Select all incompatible references',chooseAll,d.conflicts.length===0),button('Close',onClose)];
 return ao.createPortal(u.jsx('div',{style:{position:'fixed',inset:0,zIndex:2147483600,background:'rgba(0,0,0,.76)',display:'flex',justifyContent:'center',alignItems:'center',padding:20},
  children:u.jsxs('section',{role:'dialog','aria-modal':'true','aria-label':'Session archive rescue',style:{maxWidth:760,maxHeight:'85vh',overflow:'auto',width:'100%',boxSizing:'border-box',padding:24,background:'#141725',color:'#eee',border:'1px solid #8d8db4',borderRadius:9},children:[
   u.jsx('h2',{style:{fontSize:22,margin:'0 0 12px'},children:'Meta-Menu · Manual Archive Rescue M7'}),
   u.jsx('p',{children:'One or more song-performance references do not belong to their saved session. Select the incompatible references to remove. Only those references will be removed; actual Loop WAV assets, their owner sessions, Quick Rack and all other session contents stay intact.'}),
   u.jsx('p',{style:{color:'#ffb7a2'},children:__XenMetaSessions.snapshot().error||'Archive hydration failed.'}),
   u.jsx('p',{children:'Saved sessions: '+String(d.archive.savedCount??'unknown')+' · incompatible references: '+d.conflicts.length+' · structural errors: '+d.errors.length}),
   ...d.conflicts.slice(0,200).map(c=>u.jsx('label',{style:{display:'flex',gap:10,alignItems:'start',padding:'7px 4px',borderBottom:'1px solid #373848',cursor:'pointer'},children:[u.jsx('input',{type:'checkbox',checked:!!selected[key(c)],onChange:()=>toggle(c),style:{marginTop:4,width:18,height:18}}),u.jsx('span',{style:{overflowWrap:'anywhere'},children:(c.sessionName||c.location)+' · '+c.kind+' · '+c.id+' · '+c.reason})],key:key(c)})),
   d.errors.length>0&&u.jsx('p',{style:{color:'#ffb7a2'},children:'Structural errors are present. Manual reference removal is disabled; export the archive for review.'}),
   u.jsx('p',{style:{fontSize:13,color:'#f8dbad'},children:'Your browser storage is nearly full. M7 requires a downloaded external JSON backup, verified by re-selecting it below, instead of duplicating the archive in localStorage.'}),
   u.jsx('p',{style:{fontSize:12,color:'#b9bed7'},children:'Step 1: Export original archive + diagnosis (or use your existing M5/M6 archive-rescue JSON). Step 2: Select that downloaded file below. Step 3: Select all incompatible references and confirm. No WAV assets are deleted; other sessions and the Working Copy remain intact.'}),
   button('1. Export original archive + diagnosis',__xenM5ExportArchiveRescue),
   u.jsxs('label',{style:{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',padding:'10px 0'},children:[u.jsx('span',{children:'Verify downloaded backup JSON:'}),u.jsx('input',{type:'file',accept:'.json,application/json',onChange:verifyBackupFile,style:{maxWidth:'100%',fontSize:14,color:'#eee'}})]}),
   u.jsx('p',{role:'status',style:{fontSize:12,color:backup?'#a4efbd':'#ffcaab',overflowWrap:'anywhere'},children:backupStatus}),
   message&&u.jsx('p',{role:'status',style:{color:'#f8dbad'},children:message}),
   confirming?u.jsxs('div',{style:{padding:12,border:'1px solid #ba916d',margin:'8px 0'},children:[
    u.jsx('strong',{children:'Confirm: remove '+selectedRefs.length+' invalid song-performance link(s)?'}),
    u.jsx('p',{children:'Other sessions and WAV assets remain. Your previously downloaded and verified JSON file is the backup. No duplicate will be written into localStorage.'}),
    button('Confirm removing these references',run),button('Cancel',()=>setConfirming(false))
   ]}):button('Remove selected links and reopen Meta-Menu',()=>setConfirming(true),!allReady),
   u.jsx('div',{style:{display:'flex',gap:12,flexWrap:'wrap',marginTop:12},children:actions})
  ]})
 }),document.body);
}
/* One-Shot Session field: compact resource references, never audio assets.
   Existing Sessions without this field stay readable until edited/migrated. */
// P36-5G: instance suffix is for a separate assigned Fill, not a new sound.
// Hydration remains pure and independent of the React or audio runtime.
function __xenP36FillInstanceIdValid(id,base){
 if(typeof id!=='string'||typeof base!=='string'||id.length>240)return false;
 if(id===base)return true;
 if(!id.startsWith(base+'~'))return false;
 const suffix=id.slice(base.length+1);
 return /^(?:[2-9]|1[0-2])$/.test(suffix);
}
// P36-5A: pure typed snapshot validator, safe during early Session V2 hydration.
function __xenP36InstrumentFillValid(item){
 const p=item?.sourceProvenance;
 const role=p?.role,preset=p?.presetId;
 const parsed=role==='particle'&&typeof preset==='string'
  ? (preset.startsWith('resident-elastic-sample:')?preset.slice(24):
     preset.startsWith('resident-sample:')?preset.slice(16):
     preset.startsWith('sample:')?preset.slice(7):null)
  : (role==='wave'||role==='keyboard')&&typeof preset==='string'&&preset.startsWith('sample:')?preset.slice(7):null;
 return item?.kind==='instrumentSample'&&typeof item.id==='string'&&item.id.length<=240&&
  typeof item.name==='string'&&item.name.trim().length>0&&item.name.length<=240&&
  typeof preset==='string'&&preset.length<=240&&typeof p.sampleId==='string'&&p.sampleId.length<=240&&
  __xenP36FillInstanceIdValid(item.id,role+':'+preset)&&parsed===p.sampleId&&!!parsed&&
  typeof p.assetDigest==='string'&&/^[0-9a-f]{64}$/.test(p.assetDigest)&&
  Number.isFinite(item.volume)&&item.volume>=0&&item.volume<=2&&
  Number.isFinite(item.pan)&&Math.abs(item.pan)<=1&&Number.isInteger(item.pitch)&&Math.abs(item.pitch)<=24&&
  (item.samplePlaybackLengthSec==null||(Number.isFinite(item.samplePlaybackLengthSec)&&
    item.samplePlaybackLengthSec>=.05&&item.samplePlaybackLengthSec<=600));
}
// P36-5F: pure codec validator; no lazy UI, IndexedDB or AudioContext access.
function __xenP36InstrumentRenderedValid(item){
 const p=item?.sourceProvenance;
 return item?.kind==='instrumentRendered'&&typeof item.id==='string'&&item.id.length<=240&&
  typeof item.name==='string'&&item.name.trim().length>0&&item.name.length<=240&&
  p&&['particle','wave','keyboard'].includes(p.role)&&
  typeof p.presetId==='string'&&p.presetId.length>0&&p.presetId.length<=240&&
  typeof p.renderPresetId==='string'&&p.renderPresetId.length>0&&p.renderPresetId.length<=240&&
  p.rendererId==='xensonar-melodic-native-adapter-v1'&&
  __xenP36FillInstanceIdValid(item.id,p.role+':'+p.presetId)&&
  Number.isFinite(item.volume)&&item.volume>=0&&item.volume<=2&&
  Number.isFinite(item.pan)&&Math.abs(item.pan)<=1&&
  Number.isInteger(item.pitch)&&Math.abs(item.pitch)<=24&&
  item.samplePlaybackLengthSec==null;
}
function __xenOneShotSafe(value){
 const result={melodic:[],drum:[]};
 for(const role of ['melodic','drum']){
  const entries=Array.isArray(value?.[role])?value[role]:[];
  for(const item of entries.slice(0,12)){
   if(!item||!['material','rootFollow','drum','instrumentSample','instrumentRendered'].includes(item.kind)||
      (role==='drum')!==(item.kind==='drum')||
      typeof item.id!=='string'||!item.id||item.id.length>240||
      typeof item.name!=='string'||!item.name||item.name.length>240)continue;
   const bounded=(v,lo,hi,defaultValue)=>Number.isFinite(Number(v))?Math.min(hi,Math.max(lo,Number(v))):defaultValue;
   const row={kind:item.kind,id:item.id,name:item.name,playbackRole:'one-shot',
     volume:bounded(item.volume,0,2,1),pan:bounded(item.pan,-1,1,0),
     ...(role==='melodic'?{pitch:Math.round(bounded(item.pitch,-24,24,0))}:{})};
   if(item.kind==='instrumentSample'||item.kind==='instrumentRendered'){
    if(role!=='melodic'||(item.kind==='instrumentSample'?!__xenP36InstrumentFillValid(item):!__xenP36InstrumentRenderedValid(item)))continue;
    row.sourceProvenance={...item.sourceProvenance};
    row.samplePlaybackLengthSec=item.kind==='instrumentSample'?(item.samplePlaybackLengthSec??null):null;
   }
   if(/^#[0-9a-f]{6}$/i.test(item.fillFrame||''))row.fillFrame=item.fillFrame.toLowerCase();
   if(/^#[0-9a-f]{6}$/i.test(item.fillPlate||''))row.fillPlate=item.fillPlate.toLowerCase();
   if(!result[role].some(previous=>previous.kind===row.kind&&previous.id===row.id))result[role].push(row);
  }
 }
 return result;
}
/* XLR-LIVE-BAR-02: compact, schema-safe Session metadata, never PCM. */
function __xenLoopBarEditsSafe(rows,items){
 const material=new Set((Array.isArray(items)?items:[]).filter(e=>e?.kind==='material').map(e=>e.id));
 const result=[],seen=new Set();
 if(!Array.isArray(rows))return result;
 for(const row of rows.slice(0,240)){
  if(typeof row?.id!=='string'||!material.has(row.id)||seen.has(row.id))continue;
  const front=row.front,back=row.back;
  if(!Number.isInteger(front)||!Number.isInteger(back)||Math.abs(front)>128||Math.abs(back)>128||front+back===0&&front===0)continue;
  seen.add(row.id);result.push({id:row.id,front,back});
 }
 return result;
}
/* DM1: The canonical Meta Session owns Drum Workspace data. Never PCM or samples. */
function __xenDrumWorkspaceSafe(value){
 const empty=()=>({version:1,eqByKit:{},playground:null,selection:null});
 if(value==null)return empty();
 if(typeof value!=='object'||value.version!==1)throw Error('Unsupported Drum Workspace schema; original Session archive protected.');
 const kits={},validLane=new Set(['kick','snare','hatClosed','hatOpen','clap','perc']);
 const clamp=(number,min,max,fallback)=>Number.isFinite(Number(number))?Math.max(min,Math.min(max,Number(number))):fallback;
 try{
  if(value.eqByKit&&typeof value.eqByKit==='object'&&!Array.isArray(value.eqByKit)){
   for(const [kit,lanes] of Object.entries(value.eqByKit).slice(0,24)){
    if(!/^[a-z0-9][a-z0-9_]{0,39}$/.test(kit)||!lanes||typeof lanes!=='object'||Array.isArray(lanes))continue;
    const row={};
    for(const [lane,eq] of Object.entries(lanes)){
     if(!validLane.has(lane)||!eq||typeof eq!=='object')continue;
     if(eq.schema==='drum-lane-eq-v2'&&Array.isArray(eq.curve)&&eq.curve.length===360){
      row[lane]={schema:'drum-lane-eq-v2',enabled:eq.enabled===true,
       bands:Math.round(clamp(eq.bands,4,24,12)),curve:eq.curve.map(n=>clamp(n,-1,1,0))};
     }else if(eq.schema==='drum-lane-eq-v1'){
      row[lane]={schema:'drum-lane-eq-v1',enabled:eq.enabled===true,
       lowDb:clamp(eq.lowDb,-12,12,0),midDb:clamp(eq.midDb,-12,12,0),highDb:clamp(eq.highDb,-12,12,0)};
     }
    }
    if(Object.keys(row).length)kits[kit]=row;
   }
  }
  let playground=null;
  if(value.playground&&typeof value.playground.source==='string'&&value.playground.source.length<=1024){
   // No runtime Grid normalizer here: Session V2 decodes BEFORE the Drum bundle is initialized.
   const e=value.playground.edit,g=e?.grid;
   if(!g||!Number.isInteger(g.stepCount)||g.stepCount<1||g.stepCount>768||
      !Array.isArray(g.laneOrder)||g.laneOrder.length>24||!g.laneSteps||typeof g.laneSteps!=='object')
    throw Error('Drum Playground record is invalid; refusing destructive migration.');
   const edit=JSON.parse(JSON.stringify({grid:g,
    kit:typeof e.kit==='string'?e.kit:'dusty_tape',
    laneKitOverrides:e.laneKitOverrides||{},laneSettings:e.laneSettings||{},
    __xenNewPatternDraft:e.__xenNewPatternDraft===true},
    (key,v)=>['__proto__','constructor','prototype'].includes(key)?undefined:v));
   playground={source:value.playground.source,edit};
  }
  const source=value.selection;
  const selection=source&&typeof source==='object'&&
   typeof source.kit==='string'&&/^[a-z0-9][a-z0-9_]{0,39}$/.test(source.kit)?{
    kit:source.kit,
    pattern:typeof source.pattern==='string'?source.pattern.slice(0,120):'broken_lilt',
    mode:source.mode==='exported'?'exported':'preset',
    configId:typeof source.configId==='string'?source.configId.slice(0,160):'',
    laneKitOverrides:Object.fromEntries(['kick','snare','hatClosed','hatOpen','clap','perc'].map(lane=>{
     const kit=source.laneKitOverrides?.[lane];return [lane,typeof kit==='string'&&/^[a-z0-9][a-z0-9_]{0,39}$/.test(kit)?kit:null];
    }))}:null;
  const result={version:1,eqByKit:kits,playground,selection};
  if(JSON.stringify(result).length>900000)throw Error('Drum Workspace exceeds 900 KB safety limit.');
  return result;
 }catch(error){throw Error('Invalid Drum Workspace: '+error.message)}
}
function __createXenMetaSessionStore(storage,quick){
 const WORKKEY='xensonar.working-session.v1';
 const KEY='xensonar.meta-sessions.v2',BOOTKEY='xensonar.meta-sessions.m13.boot.v1',listeners=new Set(),clone=x=>JSON.parse(JSON.stringify(x));
 const uid=()=> 'session-'+(globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2));
 const safeName=name=>{if(typeof name!=='string'||!name.trim()||name.length>100)throw Error('Session name must contain 1–100 characters.');return name.trim()};
 function validate(entry){if(!entry||typeof entry!=='object'||typeof entry.id!=='string'||!entry.id||entry.id.length>100)return null;entry=__xenMetaMergeOwnedTakeRefs(entry);const items=__xenMetaValidateItems(entry.items);return {id:entry.id,name:safeName(entry.name),items,colors:__xenMetaValidateColors(items,entry.colors),roomSettings:__XenMainRoomSessionBridge.safe(entry.roomSettings),songPerformance:__xenSongPerformanceSafe(entry.songPerformance??(typeof __XenStarterPrimaryId!=='undefined'&&entry.id===__XenStarterPrimaryId&&typeof __xenStarterSourceSettings==='function'?{version:1,entries:[],sources:__xenStarterSourceSettings()}:null),items),sessionTakes:__xenLoopRecSafeTakes(entry.sessionTakes),loopBarEdits:__xenLoopBarEditsSafe(entry.loopBarEdits,items),drumWorkspace:__xenDrumWorkspaceSafe(entry.drumWorkspace),...(Object.hasOwn(entry,'oneShotFills')?{oneShotFills:__xenOneShotSafe(entry.oneShotFills)}:{}),loopRecOwnerKey:typeof entry.loopRecOwnerKey==='string'?entry.loopRecOwnerKey:null,...(entry.legacyOrigin?{legacyOrigin:clone(entry.legacyOrigin)}:{})}}
 /* M13: compact opt-in boot seed. No V2 getItem, JSON parse or archived record
    validation is performed at startup when the seed is present. The seed is a
    UI/live hint, NOT an authority; every archive read/write hydrates canonical
    V2 first, including mutations initiated outside the Meta Editor. */
 const emptyState=()=>({version:2,name:'Untitled Session',items:__xenMetaValidateItems(quick.getItems()),colors:{},roomSettings:null,songPerformance:null,sessionTakes:[],loopBarEdits:[],drumWorkspace:__xenDrumWorkspaceSafe(null),saved:[],loadedId:null,activePalette:null,dirty:true,error:''});
 function decodeV2(raw){
  const next=emptyState();if(!raw)return next;
  const found=JSON.parse(raw);
  if(![1,2].includes(found.version)||!Array.isArray(found.saved)||!Array.isArray(found.items))throw Error('Invalid session library');
  const canonical=__xenMetaMergeOwnedTakeRefs(found);const items=__xenMetaValidateItems(canonical.items);
  const saved=found.saved.map(validate);
  if(saved.some(x=>!x)||new Set(saved.map(x=>x.id)).size!==saved.length)throw Error('Invalid saved sessions');
  return {...next,name:typeof found.name==='string'&&found.name.length<=100?(found.name==='Freie Session'&&!found.loadedId?'Untitled Session':found.name):'Untitled Session',items,colors:__xenMetaValidateColors(items,found.colors),roomSettings:__XenMainRoomSessionBridge.safe(found.roomSettings),songPerformance:__xenSongPerformanceSafe(found.songPerformance,items),saved,sessionTakes:__xenLoopRecSafeTakes(found.sessionTakes),loopBarEdits:__xenLoopBarEditsSafe(found.loopBarEdits,items),drumWorkspace:__xenDrumWorkspaceSafe(found.drumWorkspace),loopRecOwnerKey:found.loopRecOwnerKey??null,loadedId:found.loadedId??null,activePalette:found.activePalette?{...validate({id:'active',name:'Active',items:found.activePalette.items,colors:found.activePalette.colors,sessionTakes:found.activePalette.sessionTakes,loopBarEdits:found.activePalette.loopBarEdits,loopRecOwnerKey:found.activePalette.loopRecOwnerKey}),id:found.activePalette.id??null,name:found.activePalette.name??null}:null,dirty:!!found.dirty};
 }
 function activeSongSources(source){
  const row=source.saved.find(row=>row.id===source.activePalette?.id);
  if(row?.songPerformance?.sources)return clone(row.songPerformance.sources);
  // Older projects may have saved instruments only in the optional room snapshot.
  const room=row?.roomSettings;if(!room)return null;
  const pick=re=>Object.fromEntries(Object.entries(room.nParamsUI??{}).filter(([key])=>re.test(key)));
  return __xenSongSourcesSafe({particle:pick(/^(particle|agent|nexus.*(Gradient|Volume|Overtone))/i),
   waveStarter:{...pick(/^(wave|waveStarter|waveSound)/i),...room.wave},keyboard:pick(/^(keyboard|keyHold|keyboardWindow)/i),pan:room.pan,octaves:room.octaves});
 }
 function compactSeed(source){
  const maximum=__xenQuickGlobalRows(source.saved,quick.getItems());
  return {version:1,archiveRows:maximum,activePalette:source.activePalette?clone(source.activePalette):null,
   // The current Quickrack is already restored separately. Never cache full
   // saved session records or an unsaved editor draft in localStorage twice.
   name:source.activePalette?.name??'',count:source.saved.length,songSources:activeSongSources(source)};
 }
 function safeSeed(raw){
  if(!raw)return null;
  try{const seed=JSON.parse(raw);
   if(seed?.version!==1||!Number.isInteger(seed.archiveRows)||seed.archiveRows<5||seed.archiveRows>256||
      !Number.isInteger(seed.count)||seed.count<0||seed.count>200000)return null;
   if(seed.activePalette){
    const row=validate({id:'boot-active',name:'Active',items:seed.activePalette.items,colors:seed.activePalette.colors,sessionTakes:seed.activePalette.sessionTakes,loopBarEdits:seed.activePalette.loopBarEdits,loopRecOwnerKey:seed.activePalette.loopRecOwnerKey});
    if(!row)return null;
    seed.activePalette={id:typeof seed.activePalette.id==='string'?seed.activePalette.id:null,
      name:typeof seed.activePalette.name==='string'?seed.activePalette.name:null,items:row.items,colors:row.colors,sessionTakes:row.sessionTakes,loopBarEdits:row.loopBarEdits,loopRecOwnerKey:row.loopRecOwnerKey};
   }
   if(Object.prototype.hasOwnProperty.call(seed,'songSources'))seed.songSources=__xenSongSourcesSafe(seed.songSources);
   return seed;
  }catch{return null}
 }
 const bootSeed=safeSeed(storage.getItem(BOOTKEY));
 let dormant=!!bootSeed,bootSourcesRestored=false;
 let state=emptyState(),lastRaw=null,libraryDeletePending=false,readFailure=false;
 // D1: missing V2 + durable XenSonar user artifacts is NOT an empty archive.
 // Fail closed instead of populating an apparently blank Meta Menu and committing it.
 const hasPriorSessionFootprint=()=>[
   'xensonar.quick-menu.v2','xensonar.quick-menu.v1',WORKKEY,BOOTKEY
  ].some(key=>storage.getItem(key)!==null);
 if(bootSeed){state={...state,activePalette:bootSeed.activePalette,archiveRows:bootSeed.archiveRows,archiveCount:bootSeed.count};}
 else{
  try{
   lastRaw=storage.getItem(KEY);
   const legacy=lastRaw===null?storage.getItem('xensonar.meta-sessions.v1'):null;
   if(lastRaw===null&&legacy===null&&hasPriorSessionFootprint())
    throw Error('Session archive key is missing but other session/Quick Rack data exists in this browser context. Writes are blocked; inspect or restore the original archive first.');
   state=decodeV2(lastRaw??legacy);
  }catch(error){readFailure=true;state={...state,error:'Session data could not be loaded; archive left untouched: '+error.message}}
 }
 // One replaceable working row uses the same project envelope as named songs.
 // It never contains saved[] or the offline editor draft.
 let workingRaw=null,workingRow=null,workingError='',workingReady=false,workingRestored=false,workingTimer=null,workingIdle=null,workingPreview=false,workingLegacyDrum=false;
 try{workingRaw=storage.getItem(WORKKEY);if(workingRaw){
  if(workingRaw.length>2*1024*1024)throw Error('Working session exceeds 2 MB.');
  const value=JSON.parse(workingRaw);
  workingLegacyDrum=value?.row?.id===null&&!Object.hasOwn(value.row,'drumWorkspace');
  if(value.version!==1||!value.row||!(value.row.id===null||typeof value.row.id==='string'))throw Error('Invalid working session.');
  const row=validate({...value.row,id:value.row.id??'working-session'});if(!row)throw Error('Invalid working session.');
  workingRow={...row,id:value.row.id};
 }}catch(error){workingError=error.message;}
  let transientBassPalette=false;
  let workingOneShots=workingRow?.id===null&&Object.hasOwn(workingRow,'oneShotFills')?
  __xenOneShotSafe(workingRow.oneShotFills):null;
 if(workingOneShots===null){
  try{const legacy=JSON.parse(storage.getItem('xensonar.one-shot-fill-probe.v0')||'{}');
   if(legacy?.working)workingOneShots=__xenOneShotSafe(legacy.working);
  }catch{}
 }
 const anonymousLoopRecKey=workingRow?.id===null&&workingRow.loopRecOwnerKey?workingRow.loopRecOwnerKey:uid();
 const loopRecOwnerKey=()=>state.activePalette?.loopRecOwnerKey||state.activePalette?.id||(workingRow?.id===null?workingRow.loopRecOwnerKey:null)||anonymousLoopRecKey;
 let loopRecPublicationPending=false;
 function liveTakes(){
  const id=state.activePalette?.id??null;
  // Working copy owns live additions; the named archive is a saved snapshot.
  return __xenLoopRecSafeTakes(workingRow?.id===id?workingRow.sessionTakes:state.activePalette?.sessionTakes);
 }
 function liveItems(){return __xenMetaValidateItems(loopRecPublicationPending?(workingRow?.id===(state.activePalette?.id??null)?workingRow.items:state.activePalette?.items??quick.getItems()):quick.getItems())}
 function captureWorking(identity=state.activePalette){
  const items=identity===state.activePalette?liveItems():__xenMetaValidateItems(quick.getItems());
  return {id:identity?.id??null,loopRecOwnerKey:identity===state.activePalette?loopRecOwnerKey():(identity?.loopRecOwnerKey||identity?.id||uid()),name:identity?.name||'Untitled Session',items,colors:__xenMetaValidateColors(items,identity?.colors),
   roomSettings:__XenMainRoomSessionBridge.capture(),
   songPerformance:__xenSongPerformanceCapture(items,false,
    (identity?.id?state.saved.find(row=>row.id===identity.id)?.songPerformance:null)??
    (workingRow?.id===identity?.id?workingRow?.songPerformance:null)??state.songPerformance),
   oneShotFills:__xenOneShotSafe(identity?.id?__XenOneShotAssignments.read(identity.id):workingOneShots??__XenOneShotAssignments.read(null)),
   sessionTakes:identity===state.activePalette?liveTakes():__xenLoopRecSafeTakes(identity?.sessionTakes),
   loopBarEdits:identity===state.activePalette?__XenRackLiveBarEdits.snapshot(items):__xenLoopBarEditsSafe(identity?.loopBarEdits,items),
   drumWorkspace:identity===state.activePalette?__XenDrumSessionWorkspace.capture():__xenDrumWorkspaceSafe(identity?.drumWorkspace)};
 }
 function writeWorking(row){
  if(storage.getItem(WORKKEY)!==workingRaw)throw Error('Working session changed in another tab. Reload before replacing it.');
  const raw=JSON.stringify({version:1,row});if(raw.length>2*1024*1024)throw Error('Working session exceeds 2 MB.');
  if(raw!==workingRaw)storage.setItem(WORKKEY,raw);
  workingRaw=raw;workingRow=row;workingError='';
   if(row.id===null)workingOneShots=__xenOneShotSafe(row.oneShotFills);
 }
 let workingFlushedAt=-1e9;
 function flushWorkingCopy(){
  workingFlushedAt=performance.now();
  clearTimeout(workingTimer);workingTimer=null;
  if(workingIdle!==null&&typeof cancelIdleCallback==='function')cancelIdleCallback(workingIdle);workingIdle=null;
  if(!workingReady||workingPreview||libraryDeletePending||readFailure)return false;
  try{if(workingError)throw Error(workingError);writeWorking(captureWorking());return true;}
  catch(error){state={...state,error:'Working Session: '+error.message};emit();return false;}
 }
 function scheduleWorkingCopy(){
  if(!workingReady||workingPreview||readFailure)return;
  clearTimeout(workingTimer);
  if(workingIdle!==null&&typeof cancelIdleCallback==='function')cancelIdleCallback(workingIdle);workingIdle=null;
  // LIVEPATH-01: the main room re-attaches on every render (several per beat while playing);
  // each flush serializes the whole session. Flush at most every 1.5 s; the last state is
  // always written (trailing), and pagehide still flushes immediately.
  const wait=Math.max(120,1500-(performance.now()-workingFlushedAt));
  workingTimer=setTimeout(()=>{workingTimer=null;if(typeof requestIdleCallback==='function')workingIdle=requestIdleCallback(()=>{workingIdle=null;flushWorkingCopy()});else flushWorkingCopy()},wait);
 }
 function startWorkingCopy(){
  if(workingReady||readFailure)return;workingReady=true;
  for(const owner of [quick,__XenEQ,__XenMaterialVoiceMix,__XenMaterialLayers,__XenMaterialPrimarySwitch,__XenPan,__XenOctaves,__XenBassPitch,__XenRootFollowPitch,__XenAttackLanes,__XenRackLiveBarEdits,__XenDrumSessionWorkspace])owner?.subscribe?.(scheduleWorkingCopy);
  if(typeof Kie==='function')Kie(scheduleWorkingCopy);
  if(typeof window!=='undefined')window.addEventListener('pagehide',flushWorkingCopy);
  scheduleWorkingCopy();
 }
 const undoStack=[],redoStack=[];
 // Only a pending recapture guard, not another parameter store: values live in songPerformance.entries[].mix.att.
 const pendingOfflineNudge=new Set();
 const clearPendingNudgeFor=id=>{if(id)for(const key of [...pendingOfflineNudge])if(key.startsWith(id+'\0'))pendingOfflineNudge.delete(key)};
 const capture=(source,fillHistoryId=undefined,instrumentHistoryId=undefined)=>{
  const checkpoint={name:source.name,items:clone(source.items),colors:clone(source.colors),roomSettings:clone(source.roomSettings),songPerformance:clone(source.songPerformance),sessionTakes:clone(source.sessionTakes??[]),loopBarEdits:clone(source.loopBarEdits??[]),drumWorkspace:clone(source.drumWorkspace??__xenDrumWorkspaceSafe(null)),loopRecOwnerKey:source.loopRecOwnerKey??null,loadedId:source.loadedId,dirty:source.dirty};
  // A Fill delta travels with the *existing* Meta-Session undo/redo stack.
  // Other Session edits never overwrite unrelated saved Sessions' Fill records.
  if(fillHistoryId!==undefined){
   const slots=fillHistoryId===null?workingOneShots:source.saved.find(row=>row.id===fillHistoryId)?.oneShotFills;
   checkpoint.__oneShotUndo={id:fillHistoryId,slots:__xenOneShotSafe(slots)};
  }
  if(instrumentHistoryId!==undefined){
   const row=source.saved.find(r=>r.id===instrumentHistoryId);
   checkpoint.__instrumentSettingsUndo={id:instrumentHistoryId,songPerformance:clone(row?.songPerformance??null)};
  }
  return checkpoint;
 };
 let loopRecEpoch=0;
 let snapshot={...state,canUndo:false,canRedo:false};
 const emit=()=>{snapshot={...state,canUndo:undoStack.length>0,canRedo:redoStack.length>0};for(const listener of listeners)listener()};
 const ensureHydrated=()=>{
  if(readFailure)return false;
  if(!dormant)return true;
  try{
   const raw=storage.getItem(KEY);
   if(!raw)throw Error('V2 archive is missing; no writes permitted. Disable Fast Boot and inspect the original data.');
   const restored=decodeV2(raw);
   lastRaw=raw;dormant=false;state={...restored,...(workingRestored?{activePalette:state.activePalette}:{}),error:''};
   undoStack.length=0;redoStack.length=0;emit();
   // Starter repairs are deliberately not run during dormant boot.
   // After a real archive operation, recheck without touching live playback.
   queueMicrotask(()=>{try{__XenMetaSessions.repairStarterBass();__XenMetaSessions.repairStarterGridProfiles();__XenMetaSessions.ensureStarterCatalog();__xenUpgradeStarterBassGridDefaults();__XenMetaSessions.upgradeStarterFactorySounds()}catch(error){console.warn("[xensonar][starter-catalog][hydrate]",error)}});
   return true;
  }catch(error){state={...state,error:'Fast Boot: '+error.message};emit();return false}
 };
 const fastBootEnabled=()=>storage.getItem(BOOTKEY)!==null;
 const safetyReport=()=>{
  const inspect=raw=>{if(raw===null)return {present:false};try{const data=JSON.parse(raw);return {present:true,bytes:raw.length,savedCount:Array.isArray(data.saved)?data.saved.length:null,validShape:data.version===2&&Array.isArray(data.saved)}}catch{return {present:true,validShape:false}}};
  const previous=storage.getItem('xensonar.meta-sessions.v2.before-delete.v1');
  let recoverableCount=0;
  if(previous&&lastRaw!==null){try{const backup=decodeV2(previous),currentIds=new Set(state.saved.map(row=>row.id));recoverableCount=backup.saved.filter(row=>!currentIds.has(row.id)).length}catch{}}
  return {origin:typeof location==='undefined'?null:location.origin,pathname:typeof location==='undefined'?null:location.pathname,
   canonical:inspect(storage.getItem(KEY)),beforeDelete:inspect(previous),recoverableCount,
   fastBootPresent:storage.getItem(BOOTKEY)!==null,workingPresent:storage.getItem(WORKKEY)!==null,
   quickRackPresent:storage.getItem('xensonar.quick-menu.v2')!==null,readOnly:true};
 };
 const updateSeed=source=>{
  if(!fastBootEnabled())return;
  try{const value=JSON.stringify(compactSeed(source));
   if(value.length>250000)throw Error('Active session too large for boot snapshot.');
   storage.setItem(BOOTKEY,value);
  }catch(error){try{storage.removeItem(BOOTKEY)}catch{}
   console.warn('[xensonar][M13] Fast Boot cache disabled:',error);}
 };
 const enableFastBoot=()=>{
  if(!ensureHydrated())return false;
  try{
   const raw=storage.getItem(KEY);
   if(!raw||raw!==lastRaw)throw Error('V2 archive changed; reload before enabling.');
   // Existing snapshot and reference integrity were checked by decodeV2.
   // No V2 bytes are altered. An old XenSonar may still edit V2: on the
   // next actual archive operation, canonical V2 will be read again.
   const seed=JSON.stringify(compactSeed(state));
   if(seed.length>250000)throw Error('Live snapshot exceeds 250 KB.');
   storage.setItem(BOOTKEY,seed);emit();return true;
  }catch(error){state={...state,error:'Fast Boot: '+error.message};emit();return false}
 };
 const disableFastBoot=()=>{try{storage.removeItem(BOOTKEY);emit();return true}catch{return false}};

 // MERGE-SEAM SP-P0 x LD1: the V2 transaction must preserve the performance envelope
 // while forbidding concurrent edits during a guarded library-owner deletion.
 function update(mutator,opts={}){if(!ensureHydrated())return false;try{if(libraryDeletePending&&!opts.libraryDelete)throw Error('A library deletion is being committed. Try the edit again after it completes.');const next=clone(state);mutator(next);next.items=__xenMetaValidateItems(next.items);next.colors=__xenMetaValidateColors(next.items,next.colors);next.loopBarEdits=__xenLoopBarEditsSafe(next.loopBarEdits,next.items);next.drumWorkspace=__xenDrumWorkspaceSafe(next.drumWorkspace);next.songPerformance=__xenSongPerformanceSafe(__xenSongPerformancePrune(next.songPerformance,next.items),next.items);
  // D1: global invariant -- no unrelated operation, including Wheel, may erase
  // even one saved session ID. Deletion is authorized only for the exact row.
  const beforeIds=new Set(state.saved.map(row=>row.id)),afterIds=new Set(next.saved.map(row=>row.id));
  const removed=[...beforeIds].filter(id=>!afterIds.has(id));
  if(removed.length&&(removed.length!==1||removed[0]!==opts.allowSavedRemoval))
   throw Error('Saved sessions changed unexpectedly. The write was blocked.');
  const envelope={version:2,name:next.name,items:next.items,colors:next.colors,roomSettings:next.roomSettings,songPerformance:next.songPerformance,saved:next.saved,loadedId:next.loadedId,activePalette:next.activePalette,sessionTakes:next.sessionTakes,loopBarEdits:next.loopBarEdits,drumWorkspace:next.drumWorkspace,loopRecOwnerKey:next.loopRecOwnerKey??null,dirty:next.dirty};
  const payload=JSON.stringify(envelope);
  if(storage.getItem(KEY)!==lastRaw)throw Error('Session archive changed in another tab. Nothing was overwritten; reload to reconcile.');
  if(removed.length){
   // Durable single-step rescue checkpoint BEFORE explicit deletion. If quota
   // prevents the checkpoint, we reject deletion rather than lose the last copy.
   if(!lastRaw)throw Error('Cannot delete sessions without an existing archive.');
   storage.setItem('xensonar.meta-sessions.v2.before-delete.v1',lastRaw);
  }
  // Preserve byte-for-byte historical V2 records when the origin has room.
  // On quota exhaustion, pack ONLY the optional Live Room snapshots. Existing
  // session IDs, musical references, takes, song sources and other keys stay intact.
  let written=payload;
  const compactPayload=()=>JSON.stringify({...envelope,
   roomSettings:__xenMetaPackRoomSettings(next.roomSettings),
   saved:next.saved.map(row=>({...row,roomSettings:__xenMetaPackRoomSettings(row.roomSettings)}))});
  const storageLimit=2*1024*1024;
  if(payload.length>storageLimit){written=compactPayload();if(written.length>storageLimit)throw Error('Session archive exceeds the 2 MB safety limit, even after lossless Live Room packing. Original archive unchanged.');}
  try{storage.setItem(KEY,written)}catch(error){
   if(error?.name!=='QuotaExceededError')throw error;
   if(written===payload){written=compactPayload();}
   if(written===payload||written.length>=payload.length||written.length>storageLimit)
    throw Error('Browser storage quota exhausted. Session not saved; existing sessions untouched. Export a session backup before freeing browser storage.');
   try{storage.setItem(KEY,written)}catch(again){
    if(again?.name==='QuotaExceededError')throw Error('Browser storage remains full after lossless Live Room packing. Session not saved; existing sessions untouched. Export a backup before freeing storage.');
    throw again;
   }
  }
  lastRaw=written;
  if(written!==payload)console.warn('[xensonar][meta] Live Room snapshots were losslessly packed after a storage-quota limit. Older XenSonar versions cannot read the packed settings; keep an external archive backup.');
  if(opts.record){const before=capture(state,opts.recordFillId,opts.recordInstrumentId),after=capture(next,opts.recordFillId,opts.recordInstrumentId);if(JSON.stringify(before)!==JSON.stringify(after)){undoStack.push(before);if(undoStack.length>80)undoStack.shift();redoStack.length=0}}
  if(opts.reset){undoStack.length=0;redoStack.length=0}
  state={...next,error:''};updateSeed(state);emit();scheduleWorkingCopy();return true}catch(error){state={...state,error:'Meta-Menu: '+error.message};emit();return false}}
 /* M1 / LD1: cold-path reference deletion, independent of any library owner.
    This mutates canonical V2 once, never audio assets, IDB or an AudioWorklet.
    A physical library owner invokes this function *instead* of deleting directly.
    There is no global event interception or fragile menu-text matching. */
 const libraryReferenceCodecs=new Map();
 function registerLibraryReferenceCodec(kind,codec){
  if(typeof kind!=='string'||!kind||!codec||typeof codec.inspect!=='function'||typeof codec.prune!=='function'||libraryReferenceCodecs.has(kind))
   throw new TypeError('Session deletion requires one inspect/prune codec per additional reference kind.');
  libraryReferenceCodecs.set(kind,codec);
  return ()=>{if(libraryReferenceCodecs.get(kind)===codec)libraryReferenceCodecs.delete(kind)};
 }
 const supportedLibraryKind=kind=>['grid','material','rootFollow','drum','bass'].includes(kind)||libraryReferenceCodecs.has(kind);
 // Material and Root Follow can reference the same physical audio asset.
 const libraryKinds=entry=>entry.kind==='material'&&entry.relatedKinds?.includes('rootFollow')?['material','rootFollow']:[entry.kind];
 // Grid instances keep a distinct instanceId but share the library tuning id.
 // Other reference kinds in the current schema have kind/id ownership; P3 Bass
 // Clone & Deviate is NOT present yet and must not be simulated by name matching.
 const matchLibraryRef=(item,entry)=>libraryKinds(entry).includes(item?.kind)&&item?.id===entry.id;
 const bassSourceMatches=(owner,entry)=>entry.kind==='bass'&&entry.id.startsWith('clip:')&&
  owner?.songPerformance?.sources?.bass?.mode==='clip'&&
  owner.songPerformance.sources.bass.clipId===entry.id.slice(5);
 const roomBassMatches=(owner,entry)=>entry.kind==='bass'&&entry.id.startsWith('clip:')&&
  owner?.roomSettings?.nParamsUI?.bassPatternMode==='clip'&&
  owner.roomSettings.nParamsUI.bassClipId===entry.id.slice(5);
 const roomDrumMatches=(owner,entry)=>entry.kind==='drum'&&
  (entry.id.startsWith('preset:')?owner?.roomSettings?.nParamsUI?.drumConfigMode!=='exported'&&
    entry.id.slice(7)===owner?.roomSettings?.nParamsUI?.drumPattern:
   entry.id.startsWith('exported:')?owner?.roomSettings?.nParamsUI?.drumConfigMode==='exported'&&
    entry.id.slice(9)===owner?.roomSettings?.nParamsUI?.drumConfigId:false);
 const roomDirectMatches=(owner,entry)=>{
  const room=owner?.roomSettings?.nParamsUI;
  if(!room)return 0;
  if(entry.kind==='grid')return Number(room.gridTuning===entry.id);
  if(entry.kind==='material')return Number(room.materialLoopId===entry.id)+
   (entry.relatedKinds?.includes('rootFollow')?Number(room.rootFollowLoopId===entry.id):0);
  if(entry.kind==='rootFollow')return Number(room.rootFollowLoopId===entry.id);
  return 0;
 };
 const ownerRefCount=(owner,entry)=>(owner?.items??[]).filter(item=>matchLibraryRef(item,entry)).length+
  (entry.kind==='material'&&entry.id.startsWith('loop-rec-')?(owner?.sessionTakes??[]).filter(t=>t.id===entry.id).length:0)+
  (bassSourceMatches(owner,entry)?1:0)+(roomBassMatches(owner,entry)?1:0)+(roomDrumMatches(owner,entry)?1:0)+roomDirectMatches(owner,entry)+
  (['melodic','drum'].reduce((sum,role)=>sum+(owner?.oneShotFills?.[role]??[]).filter(item=>matchLibraryRef(item,entry)).length,0));
 function inspectLibraryReferences(entry){
  if(!entry||typeof entry.kind!=='string'||typeof entry.id!=='string'||!entry.id||!supportedLibraryKind(entry.kind))
   return Object.freeze({supported:false,savedProjectCount:0,savedProjectNames:Object.freeze([]),savedReferenceCount:0,draftReferenceCount:0,liveReferenceCount:0});
  if(!ensureHydrated())return Object.freeze({supported:true,unavailable:true,savedProjectCount:0,savedProjectNames:Object.freeze([]),savedReferenceCount:0,draftReferenceCount:0,liveReferenceCount:0});
  const matches=state.saved.filter(row=>ownerRefCount(row,entry)>0);
  const codec=libraryReferenceCodecs.get(entry.kind);
  // An extension reports saved project IDs, never arbitrary display strings:
  // the canonical archive supplies the names for the deletion warning.
  const extra=codec?.inspect(state,entry)??{};
  const ids=new Set(matches.map(row=>row.id));
  for(const id of extra.savedProjectIds??[]){
   if(!state.saved.some(row=>row.id===id))throw Error('Deletion codec reported an unknown saved session ID.');
   ids.add(id);
  }
  for(const count of [extra.savedReferenceCount??0,extra.draftReferenceCount??0,extra.liveReferenceCount??0])
   if(!Number.isSafeInteger(count)||count<0)throw Error('Deletion codec returned invalid reference counts.');
  return Object.freeze({supported:true,unavailable:false,quickReferenceCount:quick.getItems().filter(item=>matchLibraryRef(item,entry)).length,workingReferenceCount:ownerRefCount(workingRow,entry),savedProjectCount:ids.size,
   savedProjectNames:Object.freeze(state.saved.filter(row=>ids.has(row.id)).map(row=>row.name)),
   savedReferenceCount:matches.reduce((count,row)=>count+ownerRefCount(row,entry),0)+(extra.savedReferenceCount??0),
   draftReferenceCount:ownerRefCount(state,entry)+(extra.draftReferenceCount??0),
   liveReferenceCount:ownerRefCount(state.activePalette,entry)+(extra.liveReferenceCount??0)});
 }
 function pruneLibraryOwner(owner,entry){
   if(!owner?.items)return;
   // One-Shot slots are references to the same library owner, not new assets.
   // Remove only matching assignments when that owner is explicitly deleted.
   if(owner.oneShotFills)for(const role of ['melodic','drum']){
    if(Array.isArray(owner.oneShotFills[role]))owner.oneShotFills[role]=owner.oneShotFills[role].filter(item=>!matchLibraryRef(item,entry));
   }
   // Session-owned loop audio is also referenced outside Quick Rack items.
   if(entry.kind==='material'&&entry.id.startsWith('loop-rec-')&&Array.isArray(owner.sessionTakes))
    owner.sessionTakes=owner.sessionTakes.filter(t=>t.id!==entry.id);
   const removed=owner.items.filter(item=>matchLibraryRef(item,entry));
   if(removed.length){
    owner.items=owner.items.filter(item=>!matchLibraryRef(item,entry));
    for(const item of removed)if(owner.colors)delete owner.colors[__xenMetaColorKey(item)];
    // Prune the mixer/EQ entries with their references; never leave orphaned audio state.
    if(owner.songPerformance?.entries)__xenSongPerformancePrune(owner.songPerformance,owner.items);
   }
   // Bass Song Role P2 can own a snapshot even without a Quickrack tile.
   // A clip deletion may not leave that independently serialized derivative alive.
   if(bassSourceMatches(owner,entry))owner.songPerformance.sources.bass=null; // explicit removed-role tombstone
   if(roomBassMatches(owner,entry))Object.assign(owner.roomSettings.nParamsUI,
    {bassPatternMode:'preset',bassClipId:'',bassActive:false});
   if(roomDrumMatches(owner,entry))Object.assign(owner.roomSettings.nParamsUI,
    {drumConfigMode:'preset',drumPattern:'',drumConfigId:'',drumActive:false});
   if(roomDirectMatches(owner,entry)){
    const room=owner.roomSettings.nParamsUI;
    if(entry.kind==='grid'&&room.gridTuning===entry.id)room.gridTuning='12edo';
    if(entry.kind==='material'&&room.materialLoopId===entry.id){room.materialLoopId='';room.materialLoopActive=false;}
    if((entry.kind==='rootFollow'||entry.kind==='material'&&entry.relatedKinds?.includes('rootFollow'))&&room.rootFollowLoopId===entry.id){room.rootFollowLoopId='';room.rootFollowLoopActive=false;}
   }
 }
 function removeReferences(next,entry){
  for(const row of next.saved)pruneLibraryOwner(row,entry);
  pruneLibraryOwner(next,entry);
  pruneLibraryOwner(next.activePalette,entry);
  libraryReferenceCodecs.get(entry.kind)?.prune(next,entry);
 }
 async function deleteReferencedLibraryEntry(entry,deleteAsset,confirmDelete){
  if(libraryDeletePending)return {status:'busy',error:'Another library deletion is already running.'};
  if(typeof deleteAsset!=='function')throw new TypeError('Library owner must supply a deletion function.');
  let impact;
  try{impact=inspectLibraryReferences(entry)}catch(error){return {status:'failed',error:'Session reference inspection failed: '+error.message};}
  if(!impact.supported)return {status:'unsupported',error:'Unregistered library reference type; deletion was blocked.'};
  if(impact.unavailable)return {status:'failed',error:state.error||'Session archive unavailable.'};
  if(workingError&&workingRaw!==null)return {status:'failed',error:'Working Session could not be inspected: '+workingError,impact};
  const beforeRaw=lastRaw, beforeState=clone(state),quickBefore=quick.getItems(),beforeWorkingRaw=workingRaw,beforeWorkingRow=clone(workingRow);
  const prevUndo=undoStack.map(clone),prevRedo=redoStack.map(clone);
  const savedAffected=impact.savedProjectCount>0;
  if(savedAffected||impact.draftReferenceCount||impact.liveReferenceCount||impact.quickReferenceCount||impact.workingReferenceCount||confirmDelete?.alwaysConfirm===true){
   const prompt='“'+String(entry.name||entry.id).slice(0,120)+'” '+
    (savedAffected?'wird in '+impact.savedProjectCount+' Session-Projekt'+(impact.savedProjectCount===1?'':'en')+' verwendet.':'wird in der aktuellen Session / Quick Access verwendet.')+
    (savedAffected&&(impact.draftReferenceCount||impact.liveReferenceCount||impact.quickReferenceCount)?' Auch die aktuelle Session / Quick Access verwendet diesen Eintrag.':'')+'\n\n'+
    'Aus allen Session-Projekten löschen?\n\n'+
    'Ja: Eintrag aus allen betroffenen Projekten entfernen und diese speichern.\n'+
    'Nein: Löschen vollständig abbrechen.\n\nDiese Bibliothekslöschung kann nicht mit Session-Undo rückgängig gemacht werden.';
   let approved=false;
   try{
    const ask=confirmDelete??(typeof __xenConfirmLibraryDeletion==='function'?__xenConfirmLibraryDeletion:null);
    if(!ask)return {status:'confirmation-required',impact};
    approved=await ask(prompt,entry,impact);
   }catch(error){return {status:'failed',error:'Confirmation failed: '+error.message,impact};}
   if(approved!==true)return {status:'cancelled',impact};
  }
  if(lastRaw!==beforeRaw||JSON.stringify(state)!==JSON.stringify(beforeState)||storage.getItem(KEY)!==beforeRaw||storage.getItem(WORKKEY)!==beforeWorkingRaw||JSON.stringify(quick.getItems())!==JSON.stringify(quickBefore))
   return {status:'stale',error:'Session archive changed during confirmation; please retry.',impact};
  libraryDeletePending=true;
  let sessionCommitted=false,quickChanged=false,workingCommitted=false;
  try{
   if(impact.savedReferenceCount||impact.draftReferenceCount||impact.liveReferenceCount){
    if(!update(n=>removeReferences(n,entry),{libraryDelete:true,reset:true}))
     throw Error(state.error||'Could not save cleaned session archive.');
    sessionCommitted=true;
   }
   const remaining=quickBefore.filter(item=>!matchLibraryRef(item,entry));
   if(remaining.length!==quickBefore.length){quickChanged=true;quick.replaceItems(remaining);}
   if(impact.workingReferenceCount){
    const cleaned=clone(workingRow);
    pruneLibraryOwner(cleaned,entry);
    writeWorking(cleaned);workingCommitted=true;
   }
   // Library owners may be asynchronous (IDB); a strict false is a failed delete.
   const deleted=await deleteAsset();
   if(deleted===false)throw Error('Library deletion was not committed.');
   // History must not resurrect references after an irreversible owner commit.
   undoStack.length=0;redoStack.length=0;try{emit()}catch(error){console.warn('[xensonar][library-delete][notify]',error)}
   if(workingReady)scheduleWorkingCopy();
   return {status:'deleted',impact};
  }catch(error){
   const recovery=[];
   if(workingCommitted)try{
    if(storage.getItem(WORKKEY)!==workingRaw)throw Error('Working Session changed in another tab; rollback refused.');
    if(beforeWorkingRaw===null)storage.removeItem(WORKKEY);else storage.setItem(WORKKEY,beforeWorkingRaw);
    workingRaw=beforeWorkingRaw;workingRow=beforeWorkingRow;workingError='';
   }catch(e){recovery.push('Working Session rollback failed: '+e.message);}
   if(quickChanged)try{quick.replaceItems(quickBefore)}catch(e){recovery.push('Live Quickrack rollback failed: '+e.message);}
   if(sessionCommitted){
    try{
     if(storage.getItem(KEY)!==lastRaw)throw Error('Session archive changed in another tab; rollback cannot overwrite it.');
     if(beforeRaw===null)storage.removeItem(KEY);else storage.setItem(KEY,beforeRaw);
     lastRaw=beforeRaw;state=beforeState;
     undoStack.splice(0,undoStack.length,...prevUndo);redoStack.splice(0,redoStack.length,...prevRedo);
     updateSeed(state);emit();
    }catch(e){recovery.push('Session rollback failed: '+e.message);}
   }
   const message=error.message+(recovery.length?' · '+recovery.join('; '):'');
   state={...state,error:'Library deletion: '+message};emit();
   return {status:recovery.length?'recovery-required':'failed',error:message,impact};
  }finally{libraryDeletePending=false;}
 }
 function engage(row,clearGrid,options={}){loopRecEpoch++;
  const previousTransientBassPalette=transientBassPalette;
  const previousWorkingOneShots=workingOneShots;
  const previousQuick=quick.getItems(),selection={...(quick.snapshot?.().selectedByKind??{})};
  let previousRoom=null,previousPerformance=null,rollbackItems=null,override=null,changedQuick=false,attemptedLive=false,workingWritten=false;
  const beforeWorkingRaw=workingRaw,beforeWorkingRow=workingRow,beforeWorkingError=workingError;
   const beforeDrum=__XenDrumSessionWorkspace.capture();
  try{
   if(!__XenMainRoomSessionBridge.available())throw Error('Main Room controls are unavailable.');
   if(typeof __XenBassGrid!=='undefined')override=__XenBassGrid.liveOverride?.()??null;
   previousRoom=__XenMainRoomSessionBridge.capture();
   const ids=[previousRoom.nParamsUI?.materialLoopId,...(typeof __XenMaterialLayers!=='undefined'?__XenMaterialLayers.snapshot?.()??[]:[])].filter(Boolean);
   const all=[...previousQuick,...row.items,...ids.map(id=>({kind:'material',id,name:id}))],seen=new Set();
   rollbackItems=all.filter(e=>{const key=e.kind+'\0'+e.id;if(seen.has(key))return false;seen.add(key);return true});
   // Two legal 240-entry racks plus up to three out-of-rack live voices.
   // This temporary union is never written to the 240-entry project archive.
   previousPerformance=__xenSongPerformanceCapture(rollbackItems,true);
   if(options.transient)quick.replaceItemsTransient(row.items);else quick.replaceItems(row.items);changedQuick=true;
   if(clearGrid)quick.clearGridSelection?.();
   attemptedLive=true;
   if(row.roomSettings)__XenMainRoomSessionBridge.apply(row.roomSettings);
   else if(!row.songPerformance?.sources)__XenMainRoomSessionBridge.patch({waveStarterHoldPitchCents:[],keyboardHoldPitchCents:[]});
   __xenSongPerformanceApply(row.songPerformance,row.items,row.roomSettings,false,!!options.boot);
   if(!row.roomSettings&&row.drumWorkspace?.selection&&!options.transient){
    const d=row.drumWorkspace.selection;
    __XenMainRoomSessionBridge.patch({drumKit:d.kit,drumPattern:d.pattern,drumConfigMode:d.mode,drumConfigId:d.configId,drumLaneKits:d.laneKitOverrides});
   }
   if(options.boot){__XenDrumSessionWorkspace.restore(row.drumWorkspace,{sessionId:row.id,allowLegacy:row.id===null&&workingLegacyDrum});transientBassPalette=false;clearPendingNudgeFor(row.id);__XenRackLiveBarEdits.restoreSession(row.loopBarEdits,row.items);state={...state,activePalette:{id:row.id??null,name:row.name,items:clone(row.items),colors:clone(row.colors??{}),sessionTakes:__xenLoopRecSafeTakes(row.sessionTakes),loopBarEdits:__xenLoopBarEditsSafe(row.loopBarEdits,row.items),loopRecOwnerKey:row.loopRecOwnerKey||row.id||uid()}};workingRestored=true;emit();return true;}
   if(options.transient){transientBassPalette=true;return true;} // no V2 / Working Session mutation during Preview
   if(row.id===null)workingOneShots=__xenOneShotSafe(row.oneShotFills);
   if(!workingPreview){writeWorking(captureWorking(row));workingWritten=true;}
   if(!update(n=>{n.activePalette={id:row.id??null,name:row.name,items:clone(row.items),colors:clone(row.colors??{}),sessionTakes:__xenLoopRecSafeTakes(row.sessionTakes),loopBarEdits:__xenLoopBarEditsSafe(row.loopBarEdits,row.items),loopRecOwnerKey:row.loopRecOwnerKey||row.id||uid()}}))throw Error(state.error||'Could not activate session.');
   // The new Session is committed. Retire the previous Playground edit scope;
   // the named Session's compact edits are restored without changing source IDs.
   __XenRackLiveBarEdits.restoreSession(row.loopBarEdits,row.items);
    __XenDrumSessionWorkspace.restore(row.drumWorkspace,{sessionId:row.id,allowLegacy:row.id===null&&workingLegacyDrum});
    // Transient instrument power does not follow a committed song/session selection.
   clearPendingNudgeFor(row.id);transientBassPalette=false;
   if(typeof window!=="undefined")window.dispatchEvent(new Event("xensonar:mycelium-session-engaged"));
   return true;
  }catch(error){
    transientBassPalette=previousTransientBassPalette;workingOneShots=previousWorkingOneShots;
   const failures=[];
   if(workingWritten)try{
    if(storage.getItem(WORKKEY)!==workingRaw)throw Error('Working session changed during rollback.');
    if(beforeWorkingRaw===null)storage.removeItem(WORKKEY);else storage.setItem(WORKKEY,beforeWorkingRaw);
    workingRaw=beforeWorkingRaw;workingRow=beforeWorkingRow;workingError=beforeWorkingError;
   }catch(failure){failures.push(failure.message)}
   if(!options.transient)try{__XenDrumSessionWorkspace.restore(beforeDrum,{sessionId:state.activePalette?.id??null})}catch(failure){failures.push(failure.message)}
    if(changedQuick)try{(options.transient?quick.replaceItemsTransient:quick.replaceItems).call(quick,previousQuick)}catch(failure){failures.push(failure.message)}
   if(attemptedLive&&previousRoom)try{__XenMainRoomSessionBridge.apply(previousRoom)}catch(failure){failures.push(failure.message)}
   if(attemptedLive&&previousPerformance)try{__xenSongPerformanceApply(previousPerformance,rollbackItems,null,true)}catch(failure){failures.push(failure.message)}
   if(changedQuick)try{if(quick.restoreSelection)quick.restoreSelection(selection,override);else quick.restoreGridSelection?.(selection.grid,override)}catch(failure){failures.push(failure.message)}
   state={...state,error:'Could not activate session: '+error.message+(failures.length?' · Restore failed: '+failures.join('; '):'')};emit();return false;
  }
 }
 const mark=n=>{n.dirty=true};
 function travel(from,to){
  if(!from.length)return false;
  const next=from[from.length-1],fill=next.__oneShotUndo,instrument=next.__instrumentSettingsUndo;
  const current=capture(state,fill?.id,instrument?.id);
  if(!update(n=>{
   const checkpoint=clone(next);delete checkpoint.__oneShotUndo;delete checkpoint.__instrumentSettingsUndo;
   Object.assign(n,checkpoint);
   if(instrument){
    const saved=n.saved.find(row=>row.id===instrument.id);
    if(!saved)throw Error('Saved Session for instrument Undo no longer exists.');
    saved.songPerformance=__xenSongPerformanceSafe(clone(instrument.songPerformance),saved.items);
   }
   if(fill?.id){const saved=n.saved.find(row=>row.id===fill.id);
    if(!saved)throw Error('Saved Session for Fill Undo no longer exists.');
    saved.oneShotFills=__xenOneShotSafe(fill.slots);
   }
  }))return false;
  if(fill&&fill.id===null){workingOneShots=__xenOneShotSafe(fill.slots);scheduleWorkingCopy()}
  from.pop();to.push(current);emit();
  if(fill)queueMicrotask(()=>__XenOneShotAssignments.refresh());
  return true;
 }
  /* META-APPLY-01: Save captures the Live mix, but a changed instrument choice
     in the Session editor is authoritative for that role. No parallel storage. */
  function preserveDraftInstrumentChoices(n,captured){
   const saved=n.loadedId?n.saved.find(row=>row.id===n.loadedId):null;
   const draft=n.songPerformance?.sources,previous=saved?.songPerformance?.sources;
   if(!saved||!draft||!captured)return;
   for(const [role,key,field] of [['particle','particle','particlePreset'],['wave','waveStarter','preset'],['keyboard','keyboard','keyboardHoldSoundPreset']]){
    const chosen=draft[key]?.[field];
    if(typeof chosen!=='string'||!chosen||chosen===previous?.[key]?.[field])continue;
    captured.sources={...(captured.sources||{})};
    captured.sources[key]={...(captured.sources[key]||{}),[field]:chosen};
    if(role==='wave')captured.sources[key].waveStarterHoldSoundPreset=chosen;
   }
  }
 return {
  // Temporary wheel experiment. The session owner keeps its native draft/live contracts;
  // saved rows are deliberately excluded from rollback so explicit saves survive Return.
  beginSuggestion:()=>{
   if(!ensureHydrated())throw Error(state.error);
   if(workingReady)flushWorkingCopy();
   // S1: Wheel suggestions are transient. Never replace the Meta editor draft or saved sessions.
   let stagedItems=null;
   const items=quick.getItems(),selected={...quick.snapshot().selectedByKind},
    choices=Object.fromEntries([...quick.adapters].map(([kind,adapter])=>[kind,adapter.selected])),
    room=__XenMainRoomSessionBridge.capture(),
    liveIds=[room.nParamsUI?.materialLoopId,...__XenMaterialLayers.snapshot()].filter(Boolean),
    rollbackItems=[...items,...liveIds.filter(id=>!items.some(item=>item.kind==='material'&&item.id===id)).map(id=>({kind:'material',id,name:id}))],
    performance=__xenSongPerformanceCapture(rollbackItems,true),override=__XenBassGrid.liveOverride();
   const rhythm=__f351BeginPreview();workingPreview=true;
   let liveChanged=false,closed=false,staged=false;
   const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
   const restoreLive=async(force=false)=>{
    if(!liveChanged&&!force)return;
    quick.cancelActivation();quick.replaceItemsTransient(items);
    for(const [kind,id] of Object.entries(choices))if(id!=null&&id!==''&&!['drum','bass'].includes(kind)){const adapter=quick.adapters.get(kind);if(!adapter?.entries.some(e=>e.id===id))throw Error('Original '+kind+' entry is unavailable.');adapter.choose(id);await frame()}
    __XenMainRoomSessionBridge.apply(room);await frame();rhythm.restore();
    __xenSongPerformanceApply(performance,rollbackItems,room,true);
    quick.restoreSelection(selected,override);liveChanged=false;
   };
   return {
    async stage(value){if(closed)throw Error('Experiment has ended.');await restoreLive(staged);
     stagedItems=__xenMetaValidateItems(value);staged=true;
    },
    async preview(){if(closed||!stagedItems)throw Error('No Session suggestion is staged.');const entries=clone(stagedItems);
     // Prepare before touching the live selection, using the existing resource owner.
     for(const entry of entries)await __XenStarterMaterial.ensure(entry);
     liveChanged=true;
     try{
      if(!__XenMetaSessions.activateTransient(entries))throw Error(state.error);
      for(const entry of entries){if(!quick.activate(entry))throw Error('Cannot activate '+entry.name);await frame()}
      const missing=kind=>!entries.some(e=>e.kind===kind),patch={};
      for(const [kind,key] of [['material','materialLoopActive'],['rootFollow','rootFollowLoopActive'],['drum','drumActive'],['bass','bassActive']])if(missing(kind))patch[key]=false;
      __XenMainRoomSessionBridge.patch(patch);
     }catch(error){await restoreLive();throw error}
    },
    async restore(){if(closed)return;await restoreLive(true);rhythm.finish();closed=true;workingPreview=false;scheduleWorkingCopy()},
    async accept(){if(closed||!stagedItems)throw Error('No Session suggestion is staged.');if(!liveChanged)await this.preview();
     // Keep confirms the LIVE palette only; the Meta editor draft stays unchanged.
     // The only V2 write in the Wheel flow happens here, after explicit consent.
     if(!update(n=>{n.activePalette={id:null,name:'Wheel Session',items:clone(stagedItems),colors:{}}}))throw Error(state.error);
     // Only Keep makes the generated live Quickrack persistent.
     quick.replaceItems(stagedItems);
     rhythm.finish();closed=true;workingPreview=false;flushWorkingCopy()}

   };
  },
  scheduleWorkingCopy,flushWorkingCopy,startWorkingCopy,hasWorkingSession:()=>!!workingRow,
  workingOneShots:()=>workingOneShots,
  updateWorkingOneShots:slots=>{
   if(readFailure||workingError)return false;
    const normalized=__xenOneShotSafe(slots);
    if(JSON.stringify(normalized)===JSON.stringify(__xenOneShotSafe(workingOneShots)))return false;
    undoStack.push(capture(state,null));if(undoStack.length>80)undoStack.shift();
    redoStack.length=0;
    workingOneShots=normalized;
    emit();scheduleWorkingCopy();return true;
   },
  restoreBootSources:()=>{
   if(bootSourcesRestored)return false;
   bootSourcesRestored=true;
   if(workingRow)return engage(workingRow,false,{boot:true});
   // New compact seeds contain only the small instrument configuration. Older
   // seeds resolve the active saved record once through the existing decoder.
   const cached=bootSeed&&Object.prototype.hasOwnProperty.call(bootSeed,'songSources');
   if(!cached&&!ensureHydrated())return false;
   const sources=(cached?bootSeed.songSources:activeSongSources(state))??(typeof __xenStarterSourceSettings==='function'?__xenStarterSourceSettings():null);
   return sources?__XenMainRoomSessionBridge.applySongSources(sources):false;
  },
  isDormant:()=>dormant,ensureHydrated,fastBootEnabled,enableFastBoot,disableFastBoot,
  inspectLibraryReferences,deleteReferencedLibraryEntry,registerLibraryReferenceCodec,
  /* P7: one-time factory snapshot upgrade. No changing selected live source;
     private archived sessions and authored performance settings are sovereign. */
  upgradeStarterFactorySounds:()=>{
   if(dormant||!ensureHydrated())return false;
   const marker='xensonar.starter-factory-sounds.v1';
   if(storage.getItem(marker)==='ready')return false;
   const factory=__xenStarterPresetRecords().primary;
   const isPristine=row=>row?.id===factory.id&&row.name===factory.name&&!row.legacyOrigin&&
     row.songPerformance==null&&row.roomSettings==null&&Array.isArray(row.items)&&
     row.items.length===factory.items.length&&row.items.every((item,i)=>{
      const canonical=factory.items[i];
      return __xenGridKey(item)===__xenGridKey(canonical)&&item.name===canonical.name&&
       (item.kind!=='grid'||JSON.stringify(__xenGridProfile(item.gridProfile))===JSON.stringify(__xenGridProfile(canonical.gridProfile)));
     });
   const hasOld=state.saved.some(isPristine);
   if(hasOld){
    if(!update(n=>{
     for(const row of n.saved)if(isPristine(row))row.songPerformance=__xenFactorySongPerformance();
     if(!n.dirty&&n.loadedId===factory.id&&n.songPerformance==null&&
        isPristine({id:n.loadedId,name:n.name,items:n.items,roomSettings:n.roomSettings,songPerformance:n.songPerformance}))
       n.songPerformance=__xenFactorySongPerformance();
    }))return false;
   }
   try{storage.setItem(marker,'ready')}catch(error){console.warn('[xensonar][factory-sounds] Marker unavailable:',error)}
   return hasOld;
  },
  /* Installer is private in intent, but uses exactly the same validation and
     transaction boundary as manually saved sessions. It never starts playback. */
  repairStarterBass:()=>{
   if(!state.saved.some(row=>row.id===__XenStarterPrimaryId&&__xenStarterKnownRecord(row)&&__xenStarterLegacyBass(row.items)))return false;
   const fresh=__xenStarterPresetRecords().primary.items.filter(e=>e.kind==='bass');
   return update(n=>{
    const replace=row=>{
     if(row?.id!==__XenStarterPrimaryId||!__xenStarterKnownRecord(row)||!__xenStarterLegacyBass(row.items))return;
     const old=row.items.filter(e=>e.kind==='bass'),colors={...(row.colors??{})};
     // Colors belong to the three slot positions, even when IDs overlap.
     for(const item of old)delete row.colors?.[__xenMetaColorKey(item)];
     let index=0;row.items=row.items.map(item=>{
      if(item.kind!=='bass')return item;
      const next={...fresh[index++]},color=colors[__xenMetaColorKey(item)];
      if(color)(row.colors??={})[__xenMetaColorKey(next)]={...color};
      return next;
     });
    };
    for(const row of n.saved)replace(row);
    replace(n.activePalette);
    if(!n.dirty){const draft={id:n.loadedId,name:n.name,items:n.items,colors:n.colors};replace(draft);n.items=draft.items;n.colors=draft.colors}
   });
  },
  repairStarterGridProfiles:()=>{
    const wanted=[...__xenStarterPresetRecords().primary.items,...__xenStarterPresetRecords().secondary.items].filter(x=>x.kind==='grid');
    const originals=new Map(wanted.map(x=>[x.instanceId,x]));
    const isLegacy=item=>__xenStarterLegacyGridProfile(item,originals.get(item?.instanceId));
    const currentRecord={id:state.loadedId,name:state.name,items:state.items};
    const eligible=[...state.saved,state.activePalette,...(!state.dirty?[currentRecord]:[])].some(row=>__xenStarterKnownRecord(row)&&row.items?.some(isLegacy));
    if(!eligible)return false;
    return update(n=>{
      const fix=items=>{if(!Array.isArray(items))return;
        for(const item of items){if(!isLegacy(item))continue;
          const p=originals.get(item.instanceId).gridProfile;
          item.gridProfile={...item.gridProfile,modeId:p.modeId,mainMutedDegrees:[...p.mainMutedDegrees]};
        }
      };
      for(const row of n.saved)if(__xenStarterKnownRecord(row))fix(row.items);
      if(__xenStarterKnownRecord({id:n.loadedId,name:n.name})&&!n.dirty)fix(n.items);
      if(__xenStarterKnownRecord(n.activePalette))fix(n.activePalette.items);
    });
  },
     // One-time update of unmodified P3 starter Bass Grid defaults. Personal Grid edits
   // and user-created copies are never touched; neither live audio nor selected slot changes.
   upgradeStarterBassGridDefaults:()=>{
    if(dormant||!ensureHydrated())return false;
    const marker='xensonar.starter-bassgrid-defaults.v1';
    if(storage.getItem(marker)==='ready')return false;
    const originals=new Map(__xenStarterPresetRecords().primary.items.filter(e=>e.kind==='grid').map(e=>[e.instanceId,e]));
    const candidate=item=>__xenStarterBassGridUpgradeCandidate(item,originals.get(item?.instanceId));
    const eligible=[...state.saved,state.activePalette,...(!state.dirty?[{id:state.loadedId,name:state.name,items:state.items}]:[])].some(row=>
     __xenStarterKnownRecord(row)&&row.items?.some(candidate));
    if(eligible){
     const committed=update(n=>{
      const apply=items=>{if(!Array.isArray(items))return;for(const item of items){
       const target=originals.get(item.instanceId);
       if(candidate(item))item.gridProfile=clone(target.gridProfile);
      }};
      for(const row of n.saved)if(__xenStarterKnownRecord(row))apply(row.items);
      if(__xenStarterKnownRecord(n.activePalette))apply(n.activePalette.items);
      if(!n.dirty&&__xenStarterKnownRecord({id:n.loadedId,name:n.name}))apply(n.items);
     });
     if(!committed)return false;
    }
    storage.setItem(marker,'ready');return eligible;
   },
  /* P3: catalog adoption is a reference-only, one-time transaction.
     It never starts audio, never opens a track, and does not replace user sessions.
     The marker is a deletion tombstone: removal of the starter after adoption
     must not cause it to reappear on the next reload. */
  ensureStarterCatalog:()=>{
    if(dormant||!ensureHydrated())return {changed:false,activated:false};
    const marker='xensonar.starter-catalog.v2';
    if(storage.getItem(marker)==='ready')return {changed:false,activated:false};
    const {primary,secondary}=__xenStarterPresetRecords();
    const base=primary.items.filter(e=>e.kind!=='material'&&e.kind!=='rootFollow');
    const demo=__xenStarterDemoReferences();
    const original=row=>row?.id===__XenStarterPrimaryId&&!row.legacyOrigin&&
      (row.name===primary.name||row.name==='01 · Three Minor Worlds');
    const pristine=row=>original(row)&&Array.isArray(row.items)&&row.items.length===base.length&&
      row.items.every((e,i)=>__xenGridKey(e)===__xenGridKey(base[i])&&e.name===base[i].name&&
        (e.kind!=='grid'||JSON.stringify(__xenGridProfile(e.gridProfile))===JSON.stringify(__xenGridProfile(base[i].gridProfile))||__xenStarterBassGridUpgradeCandidate(e,base[i])));
    const fresh=state.saved.length===0&&state.items.length===0&&!state.loadedId&&
      !state.activePalette&&quick.getItems().length===0;
    const beforeQuick=quick.getItems();
    const oldActive=state.activePalette;
    const upgradeQuick=!!oldActive&&pristine(oldActive)&&
      beforeQuick.length===base.length&&beforeQuick.every((e,i)=>__xenGridKey(e)===__xenGridKey(base[i]));
    const addTo=row=>{
      if(!pristine(row))return;
      row.items=__xenMetaValidateItems([...row.items,...demo]);
      row.colors={...Object.fromEntries(demo.map(e=>[__xenMetaColorKey(e),primary.colors[__xenMetaColorKey(e)]])),...row.colors};
    };
    let alteredQuick=false;
    try{
      if(fresh||upgradeQuick){quick.replaceItems(fresh?primary.items:[...beforeQuick,...demo]);alteredQuick=true;}
      const committed=update(n=>{
        if(fresh){
          const a=validate(primary),b=validate(secondary);
          if(!a||!b)throw Error('Invalid catalog starter.');
          n.saved=[a,b];n.items=clone(a.items);n.colors=clone(a.colors);
          n.name=a.name;n.roomSettings=clone(a.roomSettings);n.songPerformance=clone(a.songPerformance);
          n.loadedId=a.id;n.activePalette={id:a.id,name:a.name,items:clone(a.items),colors:clone(a.colors)};n.dirty=false;
        }else{
          // Preserve the user's session archive and current live selection.
          const currentPrimary=n.saved.find(row=>row.id===primary.id);
          const currentSecondary=n.saved.find(row=>row.id===secondary.id);
          if(!currentPrimary)n.saved.push(validate(primary));
          if(!currentSecondary)n.saved.push(validate(secondary));
          if(currentPrimary)addTo(currentPrimary);
          if(n.activePalette)addTo(n.activePalette);
          if(!n.dirty&&n.loadedId===primary.id){const row={id:n.loadedId,name:n.name,items:n.items,colors:n.colors};addTo(row);n.items=row.items;n.colors=row.colors;}
        }
      });
      if(!committed)throw Error(state.error||'Starter catalog transaction failed.');
      // Persistence marker follows the successful canonical V2 commit.
      try{storage.setItem(marker,'ready')}catch(error){console.warn('[xensonar][starter-catalog] Marker unavailable:',error)}
      return {changed:true,activated:fresh};
    }catch(error){
      if(alteredQuick)try{quick.replaceItems(beforeQuick)}catch(rollback){console.warn('[xensonar][starter-catalog] Quickrack rollback failed:',rollback)}
      console.warn('[xensonar][starter-catalog] Installation skipped:',error);
      return {changed:false,activated:false};
    }
  },
  installStarterPresets:(primary,secondary)=>update(n=>{
    if(n.saved.length||n.items.length||n.loadedId||n.activePalette)throw Error('Existing sessions are not starter-installable.');
    const base=validate(primary),alt=validate(secondary);
    if(!base||!alt)throw Error('Invalid starter sessions.');
    n.saved=[base,alt];n.items=clone(base.items);n.colors=clone(base.colors);
    n.name=base.name;n.roomSettings=__XenMainRoomSessionBridge.safe(base.roomSettings);n.songPerformance=clone(base.songPerformance);n.loadedId=base.id;
    n.activePalette={id:base.id,name:base.name,items:clone(base.items),colors:clone(base.colors)};
    n.dirty=false;
  },{reset:true}),
  // Catalog owns the references; audio preparation only verifies their identity.
  completeStarterDemo:demoRows=>{
    if(!ensureHydrated()||!Array.isArray(demoRows)||demoRows.length!==3||
       demoRows.some((row,i)=>row?.id!==__XenStarterDemoIds[i]||!row?.name))return false;
    return state.saved.some(row=>row.id===__XenStarterPrimaryId);
  },
  captureRoomSettings:()=>{try{const captured=__XenMainRoomSessionBridge.capture();return update(n=>{n.roomSettings=captured;mark(n)},{record:true})}catch(error){state={...state,error:'Main Room settings: '+error.message};emit();return false}},
  clearRoomSettings:()=>update(n=>{n.roomSettings=null;mark(n)},{record:true}),
  loopRecEpoch:()=>loopRecEpoch,loopRecOwnerKey,
  prepareLoopRec:()=>{
   if(!ensureHydrated()||workingPreview||workingError||readFailure||libraryDeletePending)throw Error('Working Session is unavailable.');
   writeWorking(captureWorking());
   return {session:state.activePalette?.id??null,epoch:loopRecEpoch,ownerKey:loopRecOwnerKey()};
  },
   activeSessionTakeIds:()=>liveTakes().map(t=>t.id),
   // LR9: right-click on ordinary material removes THIS Session's reference,
   // never deletes the globally reusable audio asset or other Sessions' refs.
   detachLiveMaterial:(entry)=>{
    if(!entry||entry.kind!=='material'||typeof entry.id!=='string'||!ensureHydrated()||libraryDeletePending||workingPreview||workingError||readFailure)return false;
    const isTake=entry.id.startsWith('loop-rec-')&&liveTakes().some(t=>t.id===entry.id);
    // A TAKE belonging to another Session must not be detached in this one;
    // a previously released, ordinary Material with the same ID prefix is fine.
    if(entry.id.startsWith('loop-rec-')&&!isTake){
     const source=typeof bs==='function'?bs().entries.find(row=>row.id===entry.id):null;
     if(!source||source.sessionTake){state={...state,error:'Take belongs to another Session. No reference changed.'};emit();return false;}
    }
    const current=quick.getItems(),candidate=current.filter(x=>!(x.kind==='material'&&x.id===entry.id));
    if(candidate.length===current.length){state={...state,error:'Material is not present in the Live Quick Rack.'};emit();return false}
    const before=clone(state),beforeWorking=workingRow?clone(workingRow):null,beforeRaw=lastRaw;
    const beforeUndo=undoStack.slice(),beforeRedo=redoStack.slice();
    const sessionId=state.activePalette?.id??null;
    const activeSaved=sessionId?state.saved.find(x=>x.id===sessionId):null;
    // M4: Quick Rack is live, not the library. A live-only item must not
    // serialise the multi-megabyte Meta archive simply to remove a tile.
    const needsArchiveMutation=isTake||ownerRefCount(state,entry)>0||ownerRefCount(state.activePalette,entry)>0||ownerRefCount(activeSaved,entry)>0;
    let quickDone=false,archiveDone=false,workingDone=false;
    try{
     // Shrink the compact Quick Rack first; this frees quota BEFORE the
     // large archive/working-copy commits, unlike the earlier LR9 order.
     quick.replaceItems(candidate);quickDone=true;
     if(needsArchiveMutation){
      if(!update(n=>{
       pruneLibraryOwner(n,entry);
       pruneLibraryOwner(n.activePalette,entry);
       if(sessionId)pruneLibraryOwner(n.saved.find(x=>x.id===sessionId),entry);
       if(isTake)for(const owner of [n,n.activePalette,sessionId?n.saved.find(x=>x.id===sessionId):null]){
        if(owner&&Array.isArray(owner.sessionTakes))owner.sessionTakes=owner.sessionTakes.filter(t=>t.id!==entry.id);
       }
       mark(n);
      },{record:true}))throw Error(state.error||'Session archive could not be updated.');
      archiveDone=true;
     }
     const row=captureWorking();
     if(isTake)row.sessionTakes=__xenLoopRecSafeTakes(row.sessionTakes).filter(t=>t.id!==entry.id);
     writeWorking(row);workingDone=true;
     if(isTake&&liveTakes().some(t=>t.id===entry.id))throw Error('Take is still owned by active Session.');
     scheduleWorkingCopy();return true;
    }catch(error){
     const recovery=[];
     // Restore byte-identical canonical archive, never a second computed
     // normalization. Only restore while our own write is still current.
     if(archiveDone){
      try{
       if(storage.getItem(KEY)!==lastRaw)throw Error('Session archive changed concurrently.');
       storage.setItem(KEY,beforeRaw);lastRaw=beforeRaw;state=before;
       undoStack.splice(0,undoStack.length,...beforeUndo);redoStack.splice(0,redoStack.length,...beforeRedo);
       archiveDone=false;
      }catch(e){recovery.push('archive rollback: '+e.message)}
     }
     if(quickDone)try{quick.replaceItems(current)}catch(e){recovery.push('Quick Rack rollback: '+e.message)}
     if(workingDone&&beforeWorking)try{writeWorking(beforeWorking)}catch(e){recovery.push('Working Copy rollback: '+e.message)}
     state={...state,error:'Material Session removal failed: '+error.message+(recovery.length?' · INCOMPLETE ROLLBACK ('+recovery.join('; ')+'). Keep this tab open and make an external backup.':'')};
     emit();return false;
    }
   },
   appendLoopRec:(entry,sessionId,epoch)=>{
    if(!ensureHydrated()||(epoch!==undefined&&epoch!==loopRecEpoch)||(state.activePalette?.id??null)!==sessionId)return false;
    if(workingPreview||workingError||readFailure||libraryDeletePending)return false;
    try{
     if(!entry?.id?.startsWith('loop-rec-'))throw Error('Invalid Session Take.');
     const current=liveTakes(),existing=current.some(t=>t.id===entry.id);
     if(!existing&&current.length>=2000)throw Error('Session Take limit reached (2000); audio retained for recovery.');
     const sessionTakes=__xenLoopRecSafeTakes(existing?current:[...current,entry]);
     if(!sessionTakes.some(t=>t.id===entry.id))throw Error('Session Take reference was not retained.');
     const ids=new Set(sessionTakes.map(t=>t.id));
     const previousTakeIds=new Set(liveTakes().map(t=>t.id));
     const refs=quick.getItems().filter(x=>x.kind!=='material'||!previousTakeIds.has(x.id)||ids.has(x.id));
     for(const t of sessionTakes)if(!refs.some(x=>x.kind==='material'&&x.id===t.id))refs.push({kind:'material',id:t.id,name:t.name});
     const nextQuick=__xenMetaValidateItems(refs);
     const row=captureWorking();row.items=nextQuick;row.sessionTakes=sessionTakes;
     // Durable owner first. Publication may fail, but cannot erase this row.
     writeWorking(row);loopRecPublicationPending=true;
     // Named Session Take inventory survives navigation independently of saved
     // performance edits. Only these references are added to the named row.
     if(sessionId&&state.saved.some(saved=>saved.id===sessionId)){
      if(!update(n=>{const saved=n.saved.find(saved=>saved.id===sessionId);
       const previousOwnedIds=new Set(__xenLoopRecSafeTakes(saved.sessionTakes).map(t=>t.id));
       saved.sessionTakes=clone(sessionTakes);
       saved.items=__xenMetaValidateItems([...saved.items.filter(x=>x.kind!=='material'||!previousOwnedIds.has(x.id)), ...sessionTakes.map(t=>({kind:'material',id:t.id,name:t.name}))]);
      }))throw Error(state.error||'Named Session Take inventory could not be saved.');
     }

     if(state.activePalette)state={...state,activePalette:{...state.activePalette,items:clone(nextQuick),sessionTakes}};
     if(state.loadedId===sessionId)state={...state,items:clone(nextQuick),sessionTakes,dirty:true};
     quick.replaceItemsTransient(nextQuick);
     if(!quick.getItems().some(x=>x.kind==='material'&&x.id===entry.id))throw Error('Take publication did not retain the tile.');
     loopRecPublicationPending=false;emit();scheduleWorkingCopy();return true;
    }catch(error){state={...state,error:'Loop-Rec: '+error.message};emit();return false}
   },
  /* M-ID1: reconcile a successfully persisted canonical material name in existing reference caches.
     This method never writes audio data and never creates a session-local alias. */
  reconcileMaterialName:(id,label)=>{
   if(typeof id!=='string'||!id||typeof label!=='string'||!label||!ensureHydrated()||libraryDeletePending||readFailure||workingPreview||workingError)return false;
   const touch=owner=>{if(!owner)return owner;
    for(const row of owner.items??[])if(row.kind==='material'&&row.id===id)row.name=label;
    for(const take of owner.sessionTakes??[])if(take.id===id)take.name=label;
    return owner;
   };
   const before=clone(state),qBefore=quick.getItems(),wBefore=workingRow?clone(workingRow):null;
   const qNext=clone(qBefore);for(const item of qNext)if(item.kind==='material'&&item.id===id)item.name=label;
   if(!update(next=>{touch(next);touch(next.activePalette);for(const saved of next.saved)touch(saved);})){return false;}
   try{
    if(qNext.some((item,i)=>item.name!==qBefore[i]?.name))quick.replaceItems(qNext);
    if(wBefore){const row=touch(clone(wBefore));writeWorking(row);}
    // Historical editor Undo/Redo state must not resurrect a prior canonical title.
    for(const stack of [undoStack,redoStack])for(const snapshot of stack)touch(snapshot);
    scheduleWorkingCopy();return true;
   }catch(error){
    const failures=[];
    try{quick.replaceItems(qBefore)}catch(e){failures.push('Quick Rack rollback: '+e.message)}
    if(!update(next=>Object.assign(next,clone(before)),{reset:true}))failures.push('Session archive rollback: '+state.error);
    if(wBefore)try{writeWorking(wBefore)}catch(e){failures.push('Working session rollback: '+e.message)}
    state={...state,error:'Material name synchronization failed: '+error.message+(failures.length?' · MANUAL RECOVERY: '+failures.join(' / '):'')};emit();return false;
   }
  },
  // BVE04: a Song tile owns its captured Voice; ordinary library playback does not.
  bassTimbreForTile:(id)=>{
   const active=state.activePalette;
   if(transientBassPalette||!active?.id||!active.items?.some(e=>e.kind==='bass'&&e.id===id))return null;
   const saved=state.saved.find(row=>row.id===active.id);
   const entry=saved?.songPerformance?.entries?.find(e=>e.kind==='bass'&&e.id===id);
   return entry?.timbre?__xenBassTimbreCapture(entry.timbre):null;
  },
  liveSessionLabel:()=>state.activePalette?.name||'', 
  reorderSaved:(visibleIds,draggedId,targetId,operation)=>{
   if(!['swap','insert-before','insert-after'].includes(operation))return false;
   if(!Array.isArray(visibleIds))return false;
   const full=state.saved.map(row=>row.id),all=new Set(full);
   const visible=[...new Set(visibleIds.filter(id=>all.has(id)))];
   if(visible.length<2||!visible.includes(draggedId)||!visible.includes(targetId))return false;
   const reordered=ww({ids:visible,draggedId,targetId,operation});
   if(reordered.every((id,i)=>id===visible[i]))return false;
   const members=new Set(visible),cursor=reordered[Symbol.iterator]();
   const expected=full.map(id=>members.has(id)?cursor.next().value:id);
   // Persistence runs through the authoritative V2 transaction, preserving every payload.
   return update(n=>{
    const current=n.saved.map(row=>row.id);
    if(current.length!==full.length||current.some((id,i)=>id!==full[i]))throw Error('Session order changed during drag');
    const byId=new Map(n.saved.map(row=>[row.id,row]));
    n.saved=expected.map(id=>byId.get(id));
   });
  },
  key:KEY,snapshot:()=>snapshot,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),
  undo:()=>travel(undoStack,redoStack),redo:()=>travel(redoStack,undoStack),
  setName:name=>update(n=>{if(typeof name!=='string'||name.length>100)throw Error('Session title exceeds 100 characters.');n.name=name;mark(n)},{record:true}),
  newSession:()=>update(n=>{n.name='Untitled Session';n.items=[];n.colors={};n.roomSettings=null;n.songPerformance=null;n.sessionTakes=[];n.loopBarEdits=[];n.drumWorkspace=__xenDrumWorkspaceSafe(null);n.loopRecOwnerKey=null;n.loadedId=null;n.dirty=true},{reset:true}),
  /* Meta library rows can carry display-only metadata (e.g. bars). Both the
     + button and positioned drag/drop must store only canonical references. */
  addItem:(entry,beforeId=null)=>{if(!ensureHydrated())return false;if(!entry||typeof entry!=='object')return false;
   const reference={kind:entry.kind,id:entry.id,name:entry.name};
   if(entry.kind==='grid')reference.gridProfile=entry.gridProfile;
   if(state.items.some(e=>e.kind===reference.kind&&e.id===reference.id))return false;
   return update(n=>{const index=beforeId===null?-1:n.items.findIndex(e=>e.kind===reference.kind&&(e.instanceId||e.id)===beforeId);
    n.items.splice(index<0?n.items.length:index,0,reference.kind==='grid'?{...reference,instanceId:__xenGridUid(),gridProfile:__xenGridProfile(reference.gridProfile)}:reference);mark(n)},{record:true})},

  /* M3 Shift+drag: exchange two independently compatible Session references.
     Neither native library, playback, nor Live is touched. */
  exchangeLanes:(first,second)=>{
   if(!ensureHydrated()||!first||!second||first.kind===second.kind||first.id===second.id)return false;
   const firstCheck=__xenMetaLaneCompatibility(first,second.kind),secondCheck=__xenMetaLaneCompatibility(second,first.kind);
   if(!firstCheck.ok||!secondCheck.ok){state={...state,error:'Cross-lane swap blocked: '+(!firstCheck.ok?firstCheck.reason:secondCheck.reason)};emit();return false;}
   return update(n=>{
    const i=n.items.findIndex(e=>__xenGridKey(e)===__xenGridKey(first)),j=n.items.findIndex(e=>__xenGridKey(e)===__xenGridKey(second));
    if(i<0||j<0||i===j)throw Error('Cross-lane swap blocked: A source changed during drag.');
    const source=n.items[i],target=n.items[j];
    if(!__xenMetaLaneCompatibility(source,target.kind).ok||!__xenMetaLaneCompatibility(target,source.kind).ok)
     throw Error('Cross-lane swap blocked: One destination owner is unavailable.');
    const a={kind:target.kind,id:source.id,name:source.name},b={kind:source.kind,id:target.id,name:target.name};
    if(n.items.some((e,k)=>k!==i&&k!==j&&(__xenGridKey(e)===__xenGridKey(a)||__xenGridKey(e)===__xenGridKey(b))))
     throw Error('Cross-lane swap blocked: One resulting reference already exists.');
    const firstColor=__xenMetaColorKey(source),secondColor=__xenMetaColorKey(target);
    const firstStyle=n.colors[firstColor],secondStyle=n.colors[secondColor];
    delete n.colors[firstColor];delete n.colors[secondColor];
    n.items[i]=a;n.items[j]=b;
    if(firstStyle)n.colors[__xenMetaColorKey(a)]=firstStyle;
    if(secondStyle)n.colors[__xenMetaColorKey(b)]=secondStyle;
    mark(n);
   },{record:true});
  },
  patchGridProfile:(entry,patch)=>update(n=>{const target=n.items.find(e=>__xenGridKey(e)===__xenGridKey(entry));if(!target||target.kind!=='grid')throw Error('Grid profile not found.');target.gridProfile=__xenGridProfile({...target.gridProfile,...patch,...(typeof patch.modeId==='string'&&!Object.hasOwn(patch,'mainMutedDegrees')?{mainMutedDegrees:xF(__xenGridCompatibleMode(target.id,patch.modeId),target.id)}:{})});mark(n)},{record:true}),
  createTuningVariation:(entry,periodDraft)=>{if(!ensureHydrated())return false;
   if(entry.kind!=='grid'||!periodDraft||!Array.isArray(periodDraft.stepCents))return false;
   const family=periodDraft.periodFamily==='tritave'?'tritave':'octave';
   const cents=Number(periodDraft.periodCents),steps=periodDraft.stepCents.map(Number);
   if(!Number.isFinite(cents)||cents<400||cents>4000||steps.length<2||steps.length>__xenGridStepLimit||steps[0]!==0||steps.some((c,i)=>!Number.isFinite(c)||c<0||c>=cents||(i>0&&c<=steps[i-1]+.05)))return false;
   const original=x2(entry.id),same=family===original.periodFamily&&Math.abs(cents-original.periodCents)<.05&&steps.length===original.stepCents.length&&steps.every((c,i)=>Math.abs(c-original.stepCents[i])<.05);
   if(same)return true; // no duplicate library record for an unchanged tuning
   const type=z6(family,cents,steps),id=Voe(),label=typeof periodDraft.name==='string'&&periodDraft.name.trim()?periodDraft.name.trim().slice(0,100):entry.name+' · Tuning Variation';
   const saved=LJ({id,label,family:type.family,periodFamily:family,divisionKind:type.divisionKind,steps:steps.length,defaultModePolicy:typeof SF==='function'&&SF(entry.id)==='bp_native'?'bp_native':'church_projection',hotkeyCycleEligible:false,description:'Session Grid Profile tuning variation · '+entry.name,periodCents:cents,stepCents:steps,updatedAt:Date.now()});
   if(!saved)return false;
   const result=update(n=>{const target=n.items.find(e=>__xenGridKey(e)===__xenGridKey(entry));if(!target||target.kind!=='grid')throw Error('Original session tile no longer exists.');
    target.id=id;target.name=label;
    const config=__xenGridProfile(target.gridProfile);
    config.mainMutedDegrees=config.mainMutedDegrees.filter(degree=>degree<steps.length);
    config.mainStepOffsets=[];
    config.bassConfig={...config.bassConfig,mutedDegrees:config.bassConfig.mutedDegrees.filter(degree=>degree<steps.length)};
    target.gridProfile=config;mark(n)},{record:true});
   if(!result)BJ(id);return result;
  },
  cloneGrid:(entry)=>{if(!ensureHydrated())return null;if(entry.kind!=='grid')return null;const fresh={...JSON.parse(JSON.stringify(entry)),instanceId:__xenGridUid(),gridProfile:__xenGridProfile(entry.gridProfile),name:entry.name+' · Variation'};
   return update(n=>{const index=n.items.findIndex(e=>__xenGridKey(e)===__xenGridKey(entry));if(index<0)throw Error('Original grid missing.');n.items.splice(index+1,0,fresh);
    if(n.colors[__xenMetaColorKey(entry)])n.colors[__xenMetaColorKey(fresh)]=clone(n.colors[__xenMetaColorKey(entry)]);mark(n)},{record:true})?fresh:null;},
  removeItem:entry=>{if(!ensureHydrated())return false;if(!state.items.some(e=>__xenGridKey(e)===__xenGridKey(entry)))return false;return update(n=>{n.items=n.items.filter(e=>__xenGridKey(e)!==__xenGridKey(entry));delete n.colors[__xenMetaColorKey(entry)];mark(n)},{record:true})},
  moveItem:(entry,beforeId=null)=>{if(!ensureHydrated())return false;if(!state.items.some(e=>__xenGridKey(e)===__xenGridKey(entry)))return false;return update(n=>{const group=n.items.filter(e=>e.kind===entry.kind),at=group.findIndex(e=>__xenGridKey(e)===__xenGridKey(entry));const [moving]=group.splice(at,1);let insertion=beforeId===null?group.length:group.findIndex(e=>(e.instanceId||e.id)===beforeId);if(insertion<0)insertion=group.length;group.splice(insertion,0,moving);n.items=[...n.items.filter(e=>e.kind!==entry.kind),...group];mark(n)},{record:true})},

  /* M3: commit one canonical Session V2 transaction; native libraries, Quick Rack,
     Active Palette and Root Follow bank are neither written nor activated. */
  reassignLane:(entry,targetKind,beforeId=null)=>{
   if(!ensureHydrated())return false;
   if(!entry||entry.kind===targetKind)return false;
   const proposal=__xenMetaLaneCompatibility(entry,targetKind);
   if(!proposal.ok){state={...state,error:'Cross-lane move blocked: '+proposal.reason};emit();return false;}
   const originalKey=__xenGridKey(entry);
   if(!state.items.some(e=>__xenGridKey(e)===originalKey)||state.items.some(e=>e.kind===targetKind&&e.id===entry.id)){
    state={...state,error:'Cross-lane move blocked: Missing source or duplicate target reference.'};emit();return false;
   }
   return update(n=>{
    const fresh=__xenMetaLaneCompatibility(entry,targetKind);
    if(!fresh.ok)throw Error('Cross-lane move blocked: '+fresh.reason);
    const index=n.items.findIndex(e=>__xenGridKey(e)===originalKey);
    if(index<0||n.items.some(e=>e.kind===targetKind&&e.id===entry.id))throw Error('Cross-lane move blocked: Source changed or target is already present.');
    const [old]=n.items.splice(index,1);
    const moved={kind:targetKind,id:old.id,name:old.name};
    const nextIndex=beforeId===null?-1:n.items.findIndex(e=>e.kind===targetKind&&(e.instanceId||e.id)===beforeId);
    n.items.splice(nextIndex<0?n.items.length:nextIndex,0,moved);
    const previousColorKey=__xenMetaColorKey(old),newColorKey=__xenMetaColorKey(moved);
    if(Object.hasOwn(n.colors,previousColorKey)){
     if(!Object.hasOwn(n.colors,newColorKey))n.colors[newColorKey]=n.colors[previousColorKey];
     delete n.colors[previousColorKey];
    }
    mark(n);
   },{record:true});
  },

  /* Saved-Session instrument edit: update only the selected archived source;
     other instruments, takes, rooms and active Live Room playback remain unchanged. */
  updateSavedOneShots:(id,slots)=>{
   if(typeof id!=='string'||!id)return false;
   const normalized=__xenOneShotSafe(slots);
   return update(n=>{
    const row=n.saved.find(row=>row.id===id);
    if(!row)throw Error('Cannot assign a Fill without a saved Session.');
    row.oneShotFills=normalized;
   },{record:true,recordFillId:id});
  },
  /* META-APPLY-01: Applies ONLY to this Session's working editor. The saved
     Session row remains byte-for-byte unchanged until the top Save is used.
     The Live Room remains unchanged until Engage. */
  applyDraftInstrument:(id,role,preset)=>{
   if(!id||!['particle','wave','keyboard'].includes(role)||typeof preset!=='string'||!preset||preset.length>240)return false;
   return update(n=>{
    if(n.loadedId!==id)throw Error('Selected Session changed; Apply was cancelled.');
    const row=n.saved.find(x=>x.id===id);
    if(!row)throw Error('The selected saved Session is unavailable.');
    const legacy=row.roomSettings?.nParamsUI??{};
    const seed=row.songPerformance?.sources??(row.roomSettings?{
     particle:legacy.particlePreset?{particlePreset:legacy.particlePreset}:undefined,
     waveStarter:row.roomSettings.wave?.preset||legacy.waveSoundPreset?{preset:row.roomSettings.wave?.preset??legacy.waveSoundPreset}:undefined,
     keyboard:legacy.keyboardHoldSoundPreset?{keyboardHoldSoundPreset:legacy.keyboardHoldSoundPreset}:undefined
    }:{});
    const key=role==='particle'?'particle':role==='wave'?'waveStarter':'keyboard';
    const field=role==='particle'?'particlePreset':role==='wave'?'preset':'keyboardHoldSoundPreset';
    const perf=n.songPerformance?clone(n.songPerformance):{version:1,entries:[],sources:{}};
    perf.sources={...seed,...(perf.sources||{})};
    perf.sources[key]={...(perf.sources[key]||{}),[field]:preset};
    if(role==='wave')perf.sources[key].waveStarterHoldSoundPreset=preset;
    n.songPerformance=__xenSongPerformanceSafe(perf,n.items);
    mark(n);
   },{record:true});
  },
  updateSavedInstrument:(id,role,preset)=>{
   if(!id||!['particle','wave','keyboard'].includes(role)||typeof preset!=='string'||!preset||preset.length>240)return false;
   return update(n=>{
    const row=n.saved.find(row=>row.id===id);if(!row)throw Error('Select a saved Session before saving instruments.');
    const legacy=row.roomSettings?.nParamsUI??{};
    const seed=row.songPerformance?.sources?clone(row.songPerformance.sources):{
     ...(row.roomSettings?{
      particle:legacy.particlePreset?{particlePreset:legacy.particlePreset}:undefined,
      waveStarter:row.roomSettings.wave?.preset||legacy.waveSoundPreset?{preset:row.roomSettings.wave?.preset??legacy.waveSoundPreset}:undefined,
      keyboard:legacy.keyboardHoldSoundPreset?{keyboardHoldSoundPreset:legacy.keyboardHoldSoundPreset}:undefined
     }:{})};
    const key=role==='particle'?'particle':role==='wave'?'waveStarter':'keyboard';
    const field=role==='particle'?'particlePreset':role==='wave'?'preset':'keyboardHoldSoundPreset';
    const modify=perf=>{
     const copy=perf?clone(perf):{version:1,entries:[],sources:{}};
     copy.sources={...(copy.sources||{}),...seed};
     copy.sources[key]={...(copy.sources[key]||{}),[field]:preset};
     // Wave Hold uses an independent cached sound preset. Keep it consistent.
     if(role==='wave')copy.sources[key].waveStarterHoldSoundPreset=preset;
     return __xenSongPerformanceSafe(copy,row.items);
    };
    row.songPerformance=modify(row.songPerformance);
    // The working editor belongs to the same saved Session; do not silently
    // replace its other draft changes, and do not touch a different Session.
    if(n.loadedId===id){
     const original=n.songPerformance;
     n.songPerformance=original?clone(original):{version:1,entries:[],sources:{}};
     n.songPerformance.sources={...(n.songPerformance.sources||{}),...seed};
     n.songPerformance.sources[key]={...(n.songPerformance.sources[key]||{}),[field]:preset};
     if(role==='wave')n.songPerformance.sources[key].waveStarterHoldSoundPreset=preset;
     // This source edit was committed immediately; preserve pre-existing draft dirty state.
    }
   },{record:true});
  },
  /* P36-3: edits the existing saved performance source owner, never global
     __XenPan/__XenOctaves, nParamsUI or another Session. One Save = one history
     checkpoint. Opening/dragging/cancelling the popover does not write. */
  updateSavedInstrumentSettings:(id,role,settings)=>{
   if(!id||!['particle','wave','keyboard'].includes(role)||!settings||typeof settings!=='object'||Array.isArray(settings))return false;
   const wanted={};
   for(const field of ['volume','pan','octave','samplePlaybackLengthSec'])if(Object.hasOwn(settings,field)){
    const v=settings[field];
    if(field==='samplePlaybackLengthSec'&&v===null){wanted[field]=null;continue;}
    if(typeof v!=='number'||!Number.isFinite(v))return false;
    if(field==='volume'&&(role==='keyboard'||v<0||v>1))return false;
    if(field==='pan'&&(v< -1||v>1))return false;
    if(field==='octave'&&(!Number.isInteger(v)||v< -3||v>3))return false;
    if(field==='samplePlaybackLengthSec'&&(v<.05||v>600||!['particle','wave','keyboard'].includes(role)))return false;
    wanted[field]=v;
   }
   if(!Object.keys(wanted).length)return false;
   return update(n=>{
    const row=n.saved.find(e=>e.id===id);
    if(!row)throw Error('Cannot edit another or unavailable Session.');
    const key=role==='wave'?'waveStarter':role;
    const selectedId=role==='particle'?row.songPerformance?.sources?.particle?.particlePreset:role==='wave'?row.songPerformance?.sources?.waveStarter?.preset:row.songPerformance?.sources?.keyboard?.keyboardHoldSoundPreset;
    if(Object.hasOwn(wanted,'samplePlaybackLengthSec')&&!(typeof selectedId==='string'&&__XenP36SessionSampleLength.sampleId(role,selectedId)))throw Error('Playback Length requires a saved Raw Sample preset.');
    // Preserve every existing source field, including held instrument identity,
    // tuning, material, pan of unrelated roles and authored draft changes.
    const legacy=row.roomSettings;
    const seed= row.songPerformance?.sources??(legacy?{
     particle:{...Object.fromEntries(Object.entries(legacy.nParamsUI??{}).filter(([k])=>/^(particle|agent|nexus.*(Gradient|Volume|Overtone))/i.test(k)))},
     waveStarter:{...Object.fromEntries(Object.entries(legacy.nParamsUI??{}).filter(([k])=>/^(wave|waveStarter|waveSound)/i.test(k))),...(legacy.wave??{})},
     keyboard:{...Object.fromEntries(Object.entries(legacy.nParamsUI??{}).filter(([k])=>/^(keyboard|keyHold|keyboardWindow)/i.test(k)))},
     pan:legacy.pan??{},octaves:legacy.octaves??{}
    }:{});
    const mutate=(perf,items)=>{
     const next=perf?clone(perf):{version:1,entries:[],sources:{}};
     const sources=next.sources?clone(next.sources):clone(seed);
     const lane={...(sources[key]??{})};
     if(Object.hasOwn(wanted,'volume')){
      if(role==='particle')lane.particleVolume=wanted.volume;
      else lane.volume=wanted.volume;
     }
     if(Object.hasOwn(wanted,'samplePlaybackLengthSec')){
      if(wanted.samplePlaybackLengthSec===null)delete lane.samplePlaybackLengthSec;
      else lane.samplePlaybackLengthSec=wanted.samplePlaybackLengthSec;
     }
     sources[key]=lane;
     if(Object.hasOwn(wanted,'pan'))sources.pan={...(sources.pan??{}),[role]:wanted.pan};
     if(Object.hasOwn(wanted,'octave'))sources.octaves={...(sources.octaves??{}),[role]:wanted.octave};
     next.sources=sources;
     return __xenSongPerformanceSafe(next,items);
    };
    row.songPerformance=mutate(row.songPerformance,row.items);
    if(n.loadedId===id)n.songPerformance=mutate(n.songPerformance,n.items);
   },{record:true,recordInstrumentId:id});
  },
  /* P36-4b: Material Nudge uses existing Song V2 performance mix.att, not a second clock or global Live slider.
     Meta Save commits to the selected saved Session; live transport changes only on Engage.
     Edits are one native History checkpoint and survive a later Session Save recapture. */
  savedMaterialNudge:(sessionId,entryId)=>{
   const row=state.saved.find(r=>r.id===sessionId);
   if(!row?.items?.some(e=>e.kind==='material'&&e.id===entryId))return null;
   const lane=row.songPerformance?.entries?.find(e=>e.kind==='material'&&e.id===entryId);
   return Number.isFinite(lane?.mix?.att)?lane.mix.att:0;
  },
  updateSavedMaterialNudge:(sessionId,entryId,beats)=>{
   if(typeof sessionId!=='string'||!sessionId||typeof entryId!=='string'||!entryId||
      !Number.isFinite(beats)||beats < -2||beats > 2)return false;
   const ok=update(n=>{
    const saved=n.saved.find(r=>r.id===sessionId);
    if(!saved||!saved.items.some(e=>e.kind==='material'&&e.id===entryId))throw Error('Material is absent from the selected saved Session.');
    if(n.loadedId!==sessionId||!n.items.some(e=>e.kind==='material'&&e.id===entryId))throw Error('Select the owning saved Session before editing Nudge.');
    const patch=(perf,items)=>{
     const next=perf?clone(perf):{version:1,entries:[],sources:null};
     const i=next.entries.findIndex(e=>e.kind==='material'&&e.id===entryId);
     const base=i>=0?next.entries[i]:{kind:'material',id:entryId,eq:null};
     const mix={volume:1,pan:0,pitch:0,att:0,nudgeMode:'granular',nudgeFeel:'soft',...(base.mix||{}),att:beats};
     if(i>=0)next.entries[i]={...base,mix};else next.entries.push({...base,mix});
     return __xenSongPerformanceSafe(next,items);
    };
    saved.songPerformance=patch(saved.songPerformance,saved.items);
    n.songPerformance=patch(n.songPerformance,n.items);
   },{record:true,recordInstrumentId:sessionId});
   if(ok)pendingOfflineNudge.add(sessionId+'\0'+entryId);
   return ok;
  },
  // Bass/RootFollow Attack Nudge belongs to the existing Song V2 mixer, in beats.
  // No new scheduler, phase accumulator, or global Live owner is introduced here.
  savedLaneAttackNudge:(sessionId,role)=>{
   if(role!=='bass'&&role!=='rootFollow')return null;
   const row=state.saved.find(r=>r.id===sessionId);
   if(!row?.items?.some(e=>e.kind===role)||row.songPerformance?.version!==2)return null;
   const beats=row.songPerformance?.mixer?.[role]?.att;
   return Number.isFinite(beats)?beats:null;
  },
  updateSavedLaneAttackNudge:(sessionId,role,beats)=>{
   if(typeof sessionId!=='string'||!sessionId||!['bass','rootFollow'].includes(role)||
      !Number.isFinite(beats)||beats < -2||beats > 2)return false;
   const row=state.saved.find(r=>r.id===sessionId);
   if(!row?.items?.some(e=>e.kind===role)||row.songPerformance?.version!==2)return false;
   const ok=update(n=>{
    const saved=n.saved.find(r=>r.id===sessionId);
    if(!saved||!saved.items.some(e=>e.kind===role)||saved.songPerformance?.version!==2 ||
       n.loadedId!==sessionId||!n.items.some(e=>e.kind===role))throw Error('Select the owning Song V2 Session before editing Attack Nudge.');
    const patch=(perf,items)=>{
     if(perf?.version!==2)return null;
     const next=clone(perf);
     if(!next.mixer?.[role])throw Error('Missing native Song V2 mixer role.');
     next.mixer[role].att=beats;
     return __xenSongPerformanceSafe(next,items);
    };
    saved.songPerformance=patch(saved.songPerformance,saved.items);
    n.songPerformance=patch(n.songPerformance?.version===2?n.songPerformance:saved.songPerformance,n.items);
   },{record:true,recordInstrumentId:sessionId});
   if(ok)pendingOfflineNudge.add(sessionId+'\0@'+role);
   return ok;
  },
  /* The former 'Add settings to session' action is folded into Save.
     Capturing a different live session while editing a saved OFFLINE draft would
     silently overwrite that draft's restored settings; guard that case. */
  save:name=>update(n=>{n.name=safeName(name??n.name);
    if(!n.loadedId||n.activePalette?.id===n.loadedId){
     const captured=__xenSongPerformanceCapture(n.items,false,n.songPerformance);
     if(n.loadedId){for(const e of captured.entries){
      if(e.kind!=='material'||!pendingOfflineNudge.has(n.loadedId+'\0'+e.id))continue;
      const edited=n.songPerformance?.entries?.find(x=>x.kind==='material'&&x.id===e.id);
      if(edited?.mix&&Number.isFinite(edited.mix.att))e.mix={...(e.mix||{}),att:edited.mix.att};
     }}
     if(n.loadedId&&n.songPerformance?.version===2&&captured.version===2){
      for(const role of ['bass','rootFollow']){
       if(!pendingOfflineNudge.has(n.loadedId+'\0@'+role))continue;
       const beats=n.songPerformance?.mixer?.[role]?.att;
       if(Number.isFinite(beats))captured.mixer[role].att=beats;
      }
     }
     preserveDraftInstrumentChoices(n,captured);
     n.songPerformance=__xenSongPerformanceSafe(captured,n.items);
    }
    if(__XenMainRoomSessionBridge.available()&&(!n.loadedId||n.activePalette?.id===n.loadedId))n.roomSettings=__XenMainRoomSessionBridge.capture();
    if(!n.loadedId||n.activePalette?.id===n.loadedId)n.drumWorkspace=__XenDrumSessionWorkspace.capture();
    const id=n.loadedId??uid();const previous=n.saved.find(e=>e.id===id);const row={id,name:n.name,items:clone(n.items),colors:clone(n.colors),roomSettings:clone(n.roomSettings),songPerformance:clone(n.songPerformance),oneShotFills:__xenOneShotSafe(__XenOneShotAssignments.read(n.loadedId)),loopRecOwnerKey:n.loopRecOwnerKey||id,sessionTakes:__xenLoopRecSafeTakes(n.sessionTakes??n.activePalette?.sessionTakes),loopBarEdits:__xenLoopBarEditsSafe(n.loopBarEdits,n.items),drumWorkspace:__xenDrumWorkspaceSafe(n.drumWorkspace),...(previous?.legacyOrigin?{legacyOrigin:clone(previous.legacyOrigin)}:{})},index=n.saved.findIndex(e=>e.id===id);if(index>=0)n.saved[index]=row;else n.saved.push(row);n.loadedId=id;n.dirty=false}),
  saveAsNew:name=>update(n=>{
    n.name=safeName(name??n.name);
    if(n.saved.some(row=>row.name.toLocaleLowerCase()===n.name.toLocaleLowerCase()))throw Error('Session name already exists. Choose another name to save as new.');
    if(__XenMainRoomSessionBridge.available()&&(!n.loadedId||n.activePalette?.id===n.loadedId))n.roomSettings=__XenMainRoomSessionBridge.capture();
    if(!n.loadedId||n.activePalette?.id===n.loadedId)n.drumWorkspace=__XenDrumSessionWorkspace.capture();
    if(!n.loadedId||n.activePalette?.id===n.loadedId){
     const captured=__xenSongPerformanceCapture(n.items,false,n.songPerformance);
     if(n.loadedId){for(const e of captured.entries){
      if(e.kind!=='material'||!pendingOfflineNudge.has(n.loadedId+'\0'+e.id))continue;
      const edited=n.songPerformance?.entries?.find(x=>x.kind==='material'&&x.id===e.id);
      if(edited?.mix&&Number.isFinite(edited.mix.att))e.mix={...(e.mix||{}),att:edited.mix.att};
     }}
     if(n.loadedId&&n.songPerformance?.version===2&&captured.version===2){
      for(const role of ['bass','rootFollow']){
       if(!pendingOfflineNudge.has(n.loadedId+'\0@'+role))continue;
       const beats=n.songPerformance?.mixer?.[role]?.att;
       if(Number.isFinite(beats))captured.mixer[role].att=beats;
      }
     }
     preserveDraftInstrumentChoices(n,captured);
     n.songPerformance=__xenSongPerformanceSafe(captured,n.items);
    }
    const id=uid(),ownerKey=n.loadedId?id:(n.loopRecOwnerKey||id);n.saved.push({id,name:n.name,items:clone(n.items),colors:clone(n.colors),roomSettings:clone(n.roomSettings),songPerformance:clone(n.songPerformance),oneShotFills:__xenOneShotSafe(__XenOneShotAssignments.read(n.loadedId)),loopRecOwnerKey:ownerKey,sessionTakes:__xenLoopRecSafeTakes(n.sessionTakes??n.activePalette?.sessionTakes),loopBarEdits:__xenLoopBarEditsSafe(n.loopBarEdits,n.items),drumWorkspace:__xenDrumWorkspaceSafe(n.drumWorkspace)});n.loadedId=id;n.loopRecOwnerKey=ownerKey;n.dirty=false;
  }),
  /* Explicitly discarding a draft is destructive; never call this for X/Escape/backdrop or menu navigation. */
  discardDraft:()=>update(n=>{
    const existing=n.saved.find(row=>row.id===n.loadedId);
    if(existing){n.name=existing.name;n.items=clone(existing.items);n.colors=clone(existing.colors);n.roomSettings=clone(existing.roomSettings);n.songPerformance=clone(existing.songPerformance);n.sessionTakes=__xenLoopRecSafeTakes(existing.sessionTakes);n.loopBarEdits=__xenLoopBarEditsSafe(existing.loopBarEdits,existing.items);n.drumWorkspace=__xenDrumWorkspaceSafe(existing.drumWorkspace);n.loopRecOwnerKey=existing.loopRecOwnerKey??existing.id;n.dirty=false}
    else{n.name='Untitled Session';n.items=[];n.colors={};n.roomSettings=null;n.songPerformance=null;n.sessionTakes=[];n.loopBarEdits=[];n.drumWorkspace=__xenDrumWorkspaceSafe(null);n.loopRecOwnerKey=null;n.loadedId=null;n.dirty=true}
  },{reset:true}),
  load:id=>update(n=>{const row=n.saved.find(x=>x.id===id);if(!row)throw Error('Unknown session.');n.name=row.name;n.items=clone(row.items);n.colors=clone(row.colors??{});n.roomSettings=clone(row.roomSettings);n.songPerformance=clone(row.songPerformance);n.sessionTakes=__xenLoopRecSafeTakes(row.sessionTakes);n.loopBarEdits=__xenLoopBarEditsSafe(row.loopBarEdits,row.items);n.drumWorkspace=__xenDrumWorkspaceSafe(row.drumWorkspace);n.loopRecOwnerKey=row.loopRecOwnerKey??row.id;n.loadedId=row.id;n.dirty=false},{reset:true}),
  /* The quick-dock disk writes the LIVE quick-access palette, not an editor draft.
     Saving never activates music, switches the editor selection or mutates a library. */
  saveFromQuickAsNew:(name,includeMainRoomSettings=false)=>update(n=>{
    const label=safeName(name);
    if(n.saved.some(e=>e.name.toLocaleLowerCase()===label.toLocaleLowerCase()))throw Error('Session name already exists. Choose Update Session or another name.');
    const items=liveItems();
    const liveColors=__xenMetaValidateColors(items,n.activePalette?.colors);
    const roomSettings=includeMainRoomSettings===true?__XenMainRoomSessionBridge.capture():null;
    // First naming retains the anonymous recovery identity; named copies own only their future pending takes.
    const sessionTakes=liveTakes(),id=uid(),ownerKey=n.activePalette?.id?id:loopRecOwnerKey();n.saved.push({id,loopRecOwnerKey:ownerKey,name:label,items:clone(items),colors:clone(liveColors),roomSettings,songPerformance:__xenSongPerformanceCapture(items,false,
   (n.activePalette?.id?n.saved.find(row=>row.id===n.activePalette.id)?.songPerformance:null)??n.songPerformance),oneShotFills:__xenOneShotSafe(__XenOneShotAssignments.read(n.activePalette?.id??null)),sessionTakes,loopBarEdits:__XenRackLiveBarEdits.snapshot(items),drumWorkspace:__XenDrumSessionWorkspace.capture()});n.activePalette={id,loopRecOwnerKey:ownerKey,name:label,items:clone(items),colors:clone(liveColors),sessionTakes:clone(sessionTakes),loopBarEdits:__XenRackLiveBarEdits.snapshot(items)};
  }),
  updateSavedFromQuick:(id,name,includeMainRoomSettings=false)=>update(n=>{
    const row=n.saved.find(e=>e.id===id);if(!row)throw Error('Choose an existing session to update.');
    const label=safeName(name??row.name);
    if(n.saved.some(e=>e.id!==id&&e.name.toLocaleLowerCase()===label.toLocaleLowerCase()))throw Error('Another session already has this name.');
    const items=liveItems();
    const colors={...__xenMetaValidateColors(items,n.activePalette?.colors),...__xenMetaValidateColors(items,row.colors)};
    // Unchecked means keep any previously saved room settings, not erase them.
    const roomSettings=includeMainRoomSettings===true?__XenMainRoomSessionBridge.capture():row.roomSettings;
    // Update copies committed references, not the source session's pending recovery identity.
    row.name=label;row.items=clone(items);row.colors=clone(colors);row.roomSettings=roomSettings;row.songPerformance=__xenSongPerformanceCapture(items,false,row.songPerformance);row.oneShotFills=__xenOneShotSafe(__XenOneShotAssignments.read(n.activePalette?.id??null));row.sessionTakes=liveTakes();row.loopBarEdits=__XenRackLiveBarEdits.snapshot(items);if(n.activePalette?.id===id)row.drumWorkspace=__XenDrumSessionWorkspace.capture();row.loopRecOwnerKey=n.activePalette?.id===id?loopRecOwnerKey():(row.loopRecOwnerKey??row.id);if(n.activePalette?.id===id)n.activePalette={id,name:label,items:clone(items),colors:clone(colors),sessionTakes:row.sessionTakes,loopBarEdits:row.loopBarEdits,loopRecOwnerKey:row.loopRecOwnerKey};
    // If the editor has this session loaded, its unsaved working draft remains intact.
    if(n.loadedId===id)n.dirty=true;
  }),

  importLegacyPart:record=>update(n=>{
    if(!record?.origin||typeof record.name!=='string')throw Error('Choose a P7.24 song part.');
    const origin=clone(record.origin),key=JSON.stringify(origin);
    if(n.saved.some(row=>JSON.stringify(row.legacyOrigin)===key))throw Error('This saved/draft part was already imported.');
    const items=__xenMetaValidateItems(record.items),id=uid();
    const row={id,name:safeName(record.name.slice(0,100)),items:clone(items),colors:{},roomSettings:null,legacyOrigin:origin};
    n.saved.push(row);n.name=row.name;n.items=clone(items);n.colors={};n.roomSettings=null;n.songPerformance=null;n.loadedId=id;n.dirty=false;
  },{reset:true}),

  deleteSaved:id=>update(n=>{if(!n.saved.some(x=>x.id===id))throw Error('Choose a stored session to delete.');n.saved=n.saved.filter(x=>x.id!==id);if(n.loadedId===id){n.loadedId=null;n.dirty=true}},{allowSavedRemoval:id}),
  /* Live palette navigation: uses the same transactional Engage path, but does
     not touch the Meta Menu editor's current draft or its undo/redo history. */
  safetyReport,
  restoreLastDeleted:()=>{
   if(!ensureHydrated())return false;
   try{
    const raw=storage.getItem('xensonar.meta-sessions.v2.before-delete.v1');
    if(!raw)throw Error('No deletion checkpoint available in this browser context.');
    const backup=decodeV2(raw);
    const currentIds=new Set(state.saved.map(row=>row.id));
    const missing=backup.saved.filter(row=>!currentIds.has(row.id));
    if(!missing.length)throw Error('Checkpoint contains no missing saved sessions.');
    // Merge without rolling back newer draft, colors, Quick Rack or saved rows.
    return update(n=>{n.saved.push(...clone(missing))});
   }catch(error){state={...state,error:'Session recovery: '+error.message};emit();return false}
  },
  activateSaved:id=>{
   if(!ensureHydrated())return false;
   const row=state.saved.find(entry=>entry.id===id);
   if(!row){state={...state,error:'Saved session no longer found in the current archive. Original storage was not modified.'};emit();return false;}
   return engage(row,false);
  },
  // Wheel preview: use the live session-engage owner without touching canonical
  // Session V2, the saved list, the editor draft, or Working Session storage.
  activateTransient:items=>{
   if(!ensureHydrated())return false;
   const entries=__xenMetaValidateItems(items);
   return engage({id:null,name:'Wheel Session',items:entries,colors:{},roomSettings:null,songPerformance:null},true,{transient:true});
  },
  use:()=>{if(!ensureHydrated())return false;return engage({id:state.loadedId,name:state.loadedId?state.name:null,items:state.items,colors:state.colors,roomSettings:state.roomSettings,songPerformance:state.songPerformance,sessionTakes:state.sessionTakes,loopRecOwnerKey:state.loopRecOwnerKey||state.saved.find(row=>row.id===state.loadedId)?.loopRecOwnerKey,drumWorkspace:state.drumWorkspace},true)},
  itemColor:e=>state.colors[__xenMetaColorKey(e)]??{},
  liveItemColor:e=>state.activePalette?.items.some(x=>__xenGridKey(x)===__xenGridKey(e))?state.activePalette.colors[__xenMetaColorKey(e)]??{}:{},
  setItemColor:(entry,property,value)=>update(n=>{if(property!=='border'&&property!=='background')throw Error('Unknown color property.');const hex=__xenMetaHex(value);if(!hex)throw Error('Color must be a #RRGGBB value.');if(!n.items.some(e=>__xenGridKey(e)===__xenGridKey(entry)))throw Error('Entry is not in this session.');const key=__xenMetaColorKey(entry);n.colors[key]={...(n.colors[key]??{}),[property]:hex};mark(n)},{record:true}),
  /* Bulk visual edit, scoped to the editor draft. One atomic store write and one Undo.
     Unselected channel is copied untouched, including an unset/default channel. */
  setGlobalColor:(mode,value,targetKind=null)=>update(n=>{
    if(!['border','background','both'].includes(mode))throw Error('Unknown global color mode.');
    if(targetKind!==null&&!__XenSongKinds.includes(targetKind))throw Error('Unknown session column.');
    const targets=targetKind===null?n.items:n.items.filter(e=>e.kind===targetKind);
    if(!targets.length)throw Error('No matching session entries to recolor.');
    const raw=mode==='both'?value:{[mode]:value};
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid global color input.');
    const changes={};
    for(const channel of mode==='both'?['border','background']:[mode]){
      const hex=__xenMetaHex(raw[channel]);
      if(!hex)throw Error('Global '+channel+' must be a #RRGGBB color.');
      changes[channel]=hex;
    }
    for(const entry of targets){const key=__xenMetaColorKey(entry);n.colors[key]={...(n.colors[key]??{}),...changes}}
    mark(n);
  },{record:true}),
  resetItemColor:entry=>update(n=>{delete n.colors[__xenMetaColorKey(entry)];mark(n)},{record:true}),
  /* Open the actual live Quick Access as an editable session draft. A named live
     session may retain its saved identity, but the stored row is untouched until Save.
     Avoid accidentally overwriting an unrelated session selected in the editor. */
  editCurrentLive:()=>update(n=>{
    const items=__xenMetaValidateItems(quick.getItems());
    n.roomSettings=null;
    const active=n.activePalette;
    const source=active?.id?n.saved.find(row=>row.id===active.id):null;
    // Stage edits belong to the selected live Grid *instance*, not to its library tuning.
    if(typeof __XenBassGrid!=='undefined'&&__XenBassGrid.hasVisualEdits()){
     const current=__XenMainRoomSessionBridge.available()?__XenMainRoomSessionBridge.capture():null;
     const activeId=current?.nParamsUI?.gridTuning;
     const selected=quick.snapshot?.().selectedByKind?.grid;
     const target=items.find(row=>row.kind==='grid'&&(row.instanceId===selected||(!selected&&row.id===activeId)));
     if(target){
      const main=current.nParamsUI;
      target.gridProfile=__xenGridProfile({...target.gridProfile,modeId:main.gridMode,
       mainMutedDegrees:main.manualGridMutedSteps??[],mainStepOffsets:main.manualGridStepOffsets??[],
       bassEnabled:__XenBassGrid.effectiveSource()==='bass'||!!target.gridProfile?.bassEnabled,
       bassConfig:__XenBassGrid.sessionConfig()});
      n.roomSettings=current;
     }
    }
    n.items=items;n.sessionTakes=liveTakes();n.loopBarEdits=__XenRackLiveBarEdits.snapshot(items);n.loopRecOwnerKey=loopRecOwnerKey();
    n.colors=__xenMetaValidateColors(items,active?.colors);
    n.loadedId=source?.id??null;
    n.name=source?.name??'Untitled Session';
    n.roomSettings=n.roomSettings??(source?clone(source.roomSettings):null);
    n.drumWorkspace=__xenDrumWorkspaceSafe(source?.drumWorkspace??__XenDrumSessionWorkspace.capture());
    n.dirty=true;
  },{reset:true}),
  fromQuick:()=>update(n=>{n.sessionTakes=liveTakes();n.loopBarEdits=__XenRackLiveBarEdits.snapshot(liveItems());n.loopRecOwnerKey=n.loadedId?(n.saved.find(row=>row.id===n.loadedId)?.loopRecOwnerKey??n.loadedId):(n.activePalette?.id?uid():loopRecOwnerKey());n.items=__xenMetaValidateItems(quick.getItems());n.colors=__xenMetaValidateColors(n.items,n.colors);mark(n)},{record:true}),
  diagnostics:()=>state.items.filter(e=>{const a=quick.adapters.get(e.kind);return a&&a.entries&&!a.entries.some(x=>String(x.id)===e.id)}),
  reportError:message=>{state={...state,error:String(message)};emit()}
 };
}
