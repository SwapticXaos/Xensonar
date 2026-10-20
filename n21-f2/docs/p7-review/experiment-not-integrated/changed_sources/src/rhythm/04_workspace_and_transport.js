/* F3.56.50: Last selected live Drum/Bass setup, including kit/lane settings and active flags.
   Stored separately from the rhythm rack FX's existing localStorage snapshot. */
/* F3.56.51: one restart-resilient scratchpad per instrument, NOT an automatically saved preset.
   Rhythm settings remain in F350; only the edited musical figures live in this store. */
const __f351DraftStorageKey='xensonar:main:rhythm-scratchpad:v1';
const __f351BassScratchId='xensonar-bass-live-scratch-v1';
function __f351ReadWorkspace(){
 if(typeof window==='undefined')return {};
 try{const raw=window.localStorage.getItem(__f351DraftStorageKey);
  if(!raw||raw.length>524288)return {};
  const data=JSON.parse(raw);return data&&data.version===1&&typeof data==='object'&&!Array.isArray(data)?data:{};
 }catch{return {}}
}
function __f351SaveDraft(which,value){
 if(typeof window==='undefined'||!['drum','bass'].includes(which))return;
 try{const current=__f351ReadWorkspace();const next={version:1,
  drum:which==='drum'?value??null:current.drum??null,
  bass:which==='bass'?value??null:current.bass??null};
  const raw=JSON.stringify(next);if(raw.length<=524288)window.localStorage.setItem(__f351DraftStorageKey,raw);
 }catch{}
}
function __f351DrumSource(snapshot){
 if(!snapshot)return '';
 return JSON.stringify([snapshot.mode||'preset',snapshot.pattern||'',snapshot.configId||'']);
}
function __f351CleanDrumDraft(input){
 if(!input||typeof input!=='object'||!input.grid)return null;
 try{const grid=im(input.grid);if(!grid||!Array.isArray(grid.laneOrder)||!grid.stepCount||grid.stepCount>768)return null;
  return {grid,kit:typeof input.kit==='string'?input.kit:'standard',
   laneKitOverrides:JSON.parse(JSON.stringify(input.laneKitOverrides||{})),
   laneSettings:JSON.parse(JSON.stringify(input.laneSettings||{}))};
 }catch{return null}
}
let __f351BassDraft=(function(){
 const record=__f351ReadWorkspace().bass;
 if(!record||record.id!==__f351BassScratchId||!record.source||!record.clip)return null;
 try{const clip=Pr(record.clip);
  return clip?.id===__f351BassScratchId?{id:__f351BassScratchId,source:record.source,clip}:null;
 }catch{return null}
})();
function __f351CommitBass(clip,params,update){
 if(!clip||typeof clip!=='object')return null;
 const source=__f351BassDraft?.source||(params?.bassPatternMode==='clip'&&params.bassClipId!==__f351BassScratchId
   ?'clip:'+params.bassClipId:'preset:'+(params?.bassPattern||'offbeat'));
 let next;
 try{next=Pr({...clip,id:__f351BassScratchId,name:clip.name||'Bass Entwurf',
   generatorMeta:{...clip.generatorMeta,kind:'manual'}})}catch{return null}
 __f351BassDraft={id:__f351BassScratchId,source,clip:next};
 __f351SaveDraft('bass',__f351BassDraft);
 if(params?.bassPatternMode!=='clip'||params.bassClipId!==__f351BassScratchId)
   update?.({bassPatternMode:'clip',bassClipId:__f351BassScratchId});
 // Same library-update event refreshes not-yet-started steps, never restarts the clock.
 kce();
 return next;
}
function __f351ClearBassDraft(){
 __f351BassDraft=null;__f351SaveDraft('bass',null);kce();
}
const __f350RhythmStorageKey='xensonar:main:drum-bass-memory:v1';
function __f350IsRhythmKey(key){return /^(?:drum|bass)/.test(key)||key==='grooveSwing'||key==='quantizeBpm'}
function __f350RhythmSnapshot(params){
 const out={};
 for(const [key,value] of Object.entries(params||{})){
  if(!__f350IsRhythmKey(key)||value===undefined)continue;
  if(value!==null&&typeof value==='number'&&!Number.isFinite(value))continue;
  if(['string','number','boolean'].includes(typeof value)||(value&&typeof value==='object'))out[key]=value;
 }
 return out;
}
function __f350RestoreRhythm(defaults){
 if(typeof window==='undefined')return defaults;
 try{
  const raw=window.localStorage.getItem(__f350RhythmStorageKey);
  if(!raw||raw.length>131072)return defaults;
  const data=JSON.parse(raw);if(data?.version!==1||!data.params||typeof data.params!=='object'||Array.isArray(data.params))return defaults;
  const patch={};
  for(const [key,value] of Object.entries(data.params)){
   if(!__f350IsRhythmKey(key)||!Object.hasOwn(defaults,key))continue;
   const original=defaults[key];
   if(typeof value!==typeof original||(typeof value==='number'&&!Number.isFinite(value)))continue;
   if(value&&typeof value==='object'){
    if(!Array.isArray(value)&&Array.isArray(original)||Array.isArray(value)&&!Array.isArray(original))continue;
    // Convert through JSON to ensure an owned plain structure, never prototypes.
    const clean=JSON.parse(JSON.stringify(value,(k,v)=>['__proto__','constructor','prototype'].includes(k)?undefined:v));
    if(JSON.stringify(clean).length>32768)continue;
    patch[key]=clean;
   }else if(typeof value==='string'&&value.length<=512||typeof value==='number'||typeof value==='boolean')patch[key]=value;
  }
  if(patch.bassClipId===__f351BassScratchId&&
    (!__f351BassDraft||__f351BassDraft.clip?.id!==__f351BassScratchId)){
    patch.bassPatternMode='preset';patch.bassClipId='';
  }
  return {...defaults,...patch};
 }catch{return defaults}
}
function __f350PersistRhythm(params){
 if(typeof window==='undefined')return;
 try{window.localStorage.setItem(__f350RhythmStorageKey,JSON.stringify({version:1,params:__f350RhythmSnapshot(params)}))}catch{}
}
const tR="xensonar-root-follow-loop-ui-v1",z9=e=>typeof window>"u"?null:window.localStorage,Q2e=e=>{const t=z9();if(!t)return{};try{const n=t.getItem(tR);if(!n)return{};const r=JSON.parse(n),a={active:typeof r.rootFollowLoopActive=="boolean"?r.rootFollowLoopActive:!1,id:typeof r.rootFollowLoopId=="string"?r.rootFollowLoopId:"",timeMode:aE(r.rootFollowLoopTimeMode)?r.rootFollowLoopTimeMode:"normal",volume:N9(r.rootFollowLoopVolume),granulationMode:rx(r.rootFollowLoopGranulationMode)?r.rootFollowLoopGranulationMode:"flowing",granularSettings:Jr(r.rootFollowGranularSettings,rx(r.rootFollowLoopGranulationMode)?r.rootFollowLoopGranulationMode:"flowing"),impulsRasterEvery:Lo(r.rootFollowImpulsRasterEvery),impulsRasterCycleDiv:Lo(r.rootFollowImpulsRasterCycleDiv),impulsRasterClockMode:hT(r.rootFollowImpulsRasterClockMode),impulsRasterPattern:Wy(r.rootFollowImpulsRasterPattern,{counterDiv:r.rootFollowImpulsRasterEvery,everyFallback:r.rootFollowImpulsRasterEvery})},o={};return typeof r.rootFollowLoopActive=="boolean"&&(o.rootFollowLoopActive=a.active),typeof r.rootFollowLoopId=="string"&&(o.rootFollowLoopId=a.id),aE(r.rootFollowLoopTimeMode)&&(o.rootFollowLoopTimeMode=a.timeMode),typeof r.rootFollowLoopVolume=="number"&&Number.isFinite(r.rootFollowLoopVolume)&&(o.rootFollowLoopVolume=a.volume),rx(r.rootFollowLoopGranulationMode)&&(o.rootFollowLoopGranulationMode=a.granulationMode),r.rootFollowGranularSettings&&typeof r.rootFollowGranularSettings=="object"&&(o.rootFollowGranularSettings=a.granularSettings),typeof r.rootFollowImpulsRasterEvery=="number"&&Number.isFinite(r.rootFollowImpulsRasterEvery)&&(o.rootFollowImpulsRasterEvery=a.impulsRasterEvery),typeof r.rootFollowImpulsRasterCycleDiv=="number"&&Number.isFinite(r.rootFollowImpulsRasterCycleDiv)&&(o.rootFollowImpulsRasterCycleDiv=a.impulsRasterCycleDiv),(r.rootFollowImpulsRasterClockMode==="fragment-compress"||r.rootFollowImpulsRasterClockMode==="mute-pattern")&&(o.rootFollowImpulsRasterClockMode=a.impulsRasterClockMode),Array.isArray(r.rootFollowImpulsRasterPattern)&&(o.rootFollowImpulsRasterPattern=a.impulsRasterPattern),o}catch{return{}}},U2e=e=>l2e(s2e(e)),K2e=(e,t)=>{const n=z9();if(n)try{n.setItem(tR,JSON.stringify(U2e(e)))}catch{}},$2e=()=>{const e=P.useRef(pj(QJ)),t=P.useRef(__f350RestoreRhythm({...u2e(e.current),...__xenDronePersist.load()})),[n,r]=P.useState(t.current);P.useEffect(()=>{nZ(n.gridBase)},[n.gridBase]),P.useEffect(()=>{try{window.localStorage.setItem(EL,n.particleSampleProfileMode??"current_db_v2")}catch{}},[n.particleSampleProfileMode]),P.useEffect(()=>{const o=Q2e();Object.keys(o).length!==0&&(Object.assign(t.current,o),r({...t.current}))},[]),P.useEffect(()=>{__f350PersistRhythm(n)},[n]),P.useEffect(()=>{K2e(n)},[n.rootFollowLoopActive,n.rootFollowLoopId,n.rootFollowLoopTimeMode,n.rootFollowLoopVolume,n.rootFollowLoopGranulationMode,n.rootFollowGranularSettings,n.rootFollowImpulsRasterEvery,n.rootFollowImpulsRasterCycleDiv,n.rootFollowImpulsRasterClockMode,n.rootFollowImpulsRasterPattern]);const a=P.useCallback(o=>{Object.assign(t.current,d2e(t.current,o)),Object.keys(o).some(key=>Object.hasOwn(__f48RackDefaults,key))&&__f48PatchRack(t.current),Object.keys(o).some(key=>key.startsWith("bass"))&&window.dispatchEvent(new Event(__f48BassParamsEvent)),r({...t.current});__xenDronePersist.save(t.current,o)},[]);return{initialOvertonesByPreset:e,nexusParamsRef:t,nParamsUI:n,updateNParams:a,rootFollowUiStorageKey:tR}},ax={ripples:32,sectorPulses:18},j9=({waveRadius:e,baseWaveMaxRadius:t,clampValue:n})=>t*n(e??1,.35,2.2),G9=()=>typeof performance<"u"&&typeof performance.now=="function"?performance.now():Date.now(),H9=({refs:e,waveRadius:t,waveDecay:n,baseWaveMaxRadius:r,clampValue:a,direction:o,cursorAtEvent:h})=>{const x=h?.x??e.cursorX,y=h?.y??e.cursorY;if(e.ripples.length>=ax.ripples)return{cursorX:x,cursorY:y,isSector:!1,direction:o};const i=G9(),s={x,y,radius:0,life:1,maxRadius:j9({waveRadius:t,baseWaveMaxRadius:r,clampValue:a}),decay:n??"linear",direction:o,hitAgents:[],launchedAtMs:i,timeLocked:!0,displayRadius:0,displayPrevRadius:0};return e.ripples.push(s),{cursorX:x,cursorY:y,isSector:!1,direction:o}},X2e=({refs:e,waveRadius:t,waveDecay:n,baseWaveMaxRadius:r,clampValue:a,direction:o,maxSectorPulses:i=ax.sectorPulses})=>{const s=Number.isNaN(i)?ax.sectorPulses:Math.max(0,Math.min(ax.sectorPulses,Math.floor(i)));if(e.sectorPulses.length>=s)return{cursorX:e.cursorX,cursorY:e.cursorY,isSector:!0,direction:o};const l=G9(),c={x:e.cursorX,y:e.cursorY,radius:0,life:1,maxRadius:j9({waveRadius:t,baseWaveMaxRadius:r,clampValue:a}),decay:n??"linear",direction:o,hitAgents:[],launchedAtMs:l,timeLocked:!0,displayRadius:0,displayPrevRadius:0};return e.sectorPulses.push(c),{cursorX:e.cursorX,cursorY:e.cursorY,isSector:!0,direction:o}},V9=(e,t)=>(e.markWaveLaunch(),e.playWaveStartSound(e.freqFromY(t.cursorY),t.isSector,{waveLaunchX:t.cursorX}),t);function Y2e(e,t,cursorAtEvent){if(!e.nexusActive)return null;const n=H9({refs:e.refs,waveRadius:e.params.waveRadius,waveDecay:e.params.waveDecay,baseWaveMaxRadius:e.baseWaveMaxRadius,clampValue:e.clampValue,direction:t,cursorAtEvent});return V9(e,n)}function J2e(e,t){if(!e.nexusActive)return null;const n=X2e({refs:e.refs,waveRadius:e.params.waveRadius,waveDecay:e.params.waveDecay,baseWaveMaxRadius:e.baseWaveMaxRadius,clampValue:e.clampValue,direction:t});return V9(e,n)}const Z2e={CUT_UPLOAD:"cut-upload"},eke={MATERIAL_INTAKE_GATEWAY:"material-intake-gateway"},FL=Z2e.CUT_UPLOAD,wp=eke.MATERIAL_INTAKE_GATEWAY;function tke(e,t=Date.now()){return{reason:FL,target:wp,token:`cut-upload:${e}`,createdAt:t}}function nke(e){if(!e||typeof e!="object")return!1;const t=e;return t.reason===FL&&t.target===wp&&typeof t.token=="string"&&t.token.length>0&&typeof t.createdAt=="number"&&Number.isFinite(t.createdAt)}function dy(e){return nke(e)}function rke({spectralForgeCutUploadRafIdsRef:e,spectralForgeCutUploadSequenceRef:t,setSpectralForgeExternalAudioFile:n,setSpectralForgeExternalAudioOrigin:r,setSpectralForgeEntryScrollIntent:a,setRoom:o}){P.useEffect(()=>{const i=()=>{e.current.forEach(c=>window.cancelAnimationFrame(c)),e.current=[]},s=c=>{const d=t.current+1;t.current=d,i(),n(null),r(null),a(null);try{CT("experimental")}catch{}o("L3LAB");const p=window.requestAnimationFrame(()=>{const f=window.requestAnimationFrame(()=>{e.current=e.current.filter(b=>b!==p&&b!==f),t.current===d&&(r(FL),a(tke(d)),n(c))});e.current.push(f)});e.current.push(p)},l=Xd("spectralForgeAudioCutUpload",c=>{const d=c?.file??null;d&&s(d)});return()=>{i(),l()}},[o,a,n,r,e,t])}function H1(e,t,n){return{...e,[t]:{...e[t],...n}}}function ake(){const[e,t]=P.useState(!0),[n,r]=P.useState(8),[a,o]=P.useState(()=>FSe()),[i,s]=P.useState(null),l=(q,K)=>{o(Y=>H1(Y,q,K))},[c,d]=P.useState(!1),[p,f]=P.useState(.42),[b,g]=P.useState(()=>TSe()),[y,x]=P.useState(()=>LSe()),A=(q,K)=>{g(Y=>H1(Y,q,K))},[M,v]=P.useState(!1),[w,R]=P.useState(()=>BSe()),[k,I]=P.useState(()=>DSe()),E=(q,K)=>{I(Y=>H1(Y,q,K))},[F,L]=P.useState(!1),[B,O]=P.useState(()=>NSe()),[T,_]=P.useState(null),G=(q,K)=>{O(Y=>H1(Y,q,K))},j=P.useRef(OSe()),N=P.useRef(_Se()),W=P.useCallback(q=>{j.current=q,Eie(q)},[]),V=P.useCallback(q=>{N.current=q,Fie(q)},[]),U=j.current,H=N.current;return{collectiveMemoryEnabled:e,setCollectiveMemoryEnabled:t,collectiveMemoryWindow:n,setCollectiveMemoryWindow:r,collectiveMemoryUi:a,setCollectiveMemoryUi:o,collectiveMemoryMonitor:i,setCollectiveMemoryMonitor:s,updateCollectiveMemoryUi:l,psychedelicSpiralEnabled:c,setPsychedelicSpiralEnabled:d,psychedelicSpiralFollow:p,setPsychedelicSpiralFollow:f,psychedelicSpiralUi:b,setPsychedelicSpiralUi:g,psychedelicSpiralMonitor:y,setPsychedelicSpiralMonitor:x,updatePsychedelicSpiralSource:A,enterHoldPsyFxEnabled:M,setEnterHoldPsyFxEnabled:v,enterHoldPsyFxUi:w,setEnterHoldPsyFxUi:R,transientDriveUi:k,setTransientDriveUi:I,updateTransientDriveSource:E,schwarmEnabled:F,setSchwarmEnabled:L,schwarmUi:B,setSchwarmUi:O,schwarmMonitor:T,setSchwarmMonitor:_,updateSchwarmSource:G,controlPerfMonitor:U,setControlPerfMonitor:W,transientRuntimeMonitor:H,setTransientRuntimeMonitor:V}}const oke=(e,t,n)=>Math.min(n,Math.max(t,e));function rS(e,t){const n=Ka(e);return n.some(r=>r.value===t)?t:n[0]?.value??"chromatic"}function ike(e,t){const n=lw(e),r=rS(e,t),a=MF(e,r),o=n.map(()=>1);return{nodes:n,resolvedMode:r,nextEnabled:a,nextVolumes:o,nexusPatch:{particleSystem:e,churchMode:r,agentEnabled:a,agentVolumes:o}}}function ske(e,t){const n=rS(e,t),r=Au(n,e);return{resolvedMode:n,nextEnabled:r,nexusPatch:{churchMode:n,agentEnabled:r}}}function lke(e,t){const n=rS(e,t),r=Au(n,e),a=Zd(e),o=[];for(let i=0;i<a;i+=1)r[i]||o.push(i);return{resolvedMode:n,nextMutes:o,nexusPatch:{gridMode:n,manualGridMutedSteps:o}}}function cke(e,t){const n=t.nexusPatch??{},r=uke(e,n),a=HSe(r.gridTuning,r.gridMode,t.gridAllowedSteps),o=VSe(r.gridTuning,t.gridOffsets),i=lw(r.particleSystem),s=Au(r.churchMode,r.particleSystem).slice(0,i.length),l=t.agentEnabledSteps&&t.agentEnabledSteps.length?Array.from({length:i.length},(d,p)=>t.agentEnabledSteps?.includes(p)??!1):s,c=Array.from({length:i.length},(d,p)=>{const f=t.agentVolumes?.[p];return typeof f=="number"?oke(f,0,1.5):l[p]?1:0});return{resolvedSelections:r,normalizedNexusPatch:dke(e,r),nextGridMutes:a,nextGridOffsets:o,nextAgentEnabled:l,nextAgentVolumes:c}}function uke(e,t){const n=t.gridTuning??e.gridTuning,r=t.particleSystem??e.particleSystem,a=t.gridMode??e.gridMode,o=t.churchMode??e.churchMode,i=rS(n,a),s=rS(r,o);return{gridTuning:n,gridMode:i,particleSystem:r,churchMode:s}}function dke(e,t){const n={};return t.gridTuning!==e.gridTuning&&(n.gridTuning=t.gridTuning),(t.gridMode!==e.gridMode||t.gridTuning!==e.gridTuning)&&(n.gridMode=t.gridMode),t.particleSystem!==e.particleSystem&&(n.particleSystem=t.particleSystem),(t.churchMode!==e.churchMode||t.particleSystem!==e.particleSystem)&&(n.churchMode=t.churchMode),n}const mke=["drone","particles","waves","myzel"],iE=(e,t)=>{const n={...e};for(const r of mke){const a=t?.[r];a&&(n[r]={...e[r]??{},...a})}return n},pke=(e,t)=>{const n=iE(e,t);for(const r of["drive","color","motion","feedback","bloom","mix","stereoWidth","outputGain"]){const a=t?.[r];typeof a=="number"&&(n[r]=a)}return n};function hke(e){return{applyMetaPreset:n=>{const r=pH(n,e.sessionMetaOverrides);if(!r)return;const a=e.sessionMetaOverrides[n]?.uiPatch??{};e.setActiveMetaPresetId(n),e.setActiveOvertoneMixer("drone"),r.tParams&&e.setTParams(r.tParams),typeof r.myzelEnabled=="boolean"&&(e.topologyLoopErrorRef.current=null,e.setSystemState("Flowing Mycelium"),e.setMyzelEnabled(r.myzelEnabled)),r.myzelPattern&&e.setMyzelPattern(r.myzelPattern),r.myzelBallMode&&e.setMyzelBallMode(r.myzelBallMode),r.myzelNodeMode&&e.setMyzelNodeMode(r.myzelNodeMode),typeof r.myzelStep16ths=="number"&&e.setMyzelStep16ths(r.myzelStep16ths),typeof r.droneVolume=="number"&&e.setDroneVolume(r.droneVolume),typeof r.waveSoundEnabled=="boolean"&&e.setWaveSoundEnabled(r.waveSoundEnabled),typeof r.waveSoundVolume=="number"&&e.setWaveSoundVolume(r.waveSoundVolume),e.setWaveSoundPreset(r.waveSoundPreset),typeof r.quantizeGrid=="number"&&e.setQuantizeGridMode(r.quantizeGrid),typeof r.gridTempoBpm=="number"&&e.setGridTempoBpmWithTrafficReset(r.gridTempoBpm),r.room3Body&&(typeof r.room3Body.enabled=="boolean"&&e.setRoom3BodyEnabled(r.room3Body.enabled),r.room3Body.controls&&e.setRoom3BodyControls(g=>({...g,...r.room3Body?.controls}))),r.collectiveMemory&&(typeof r.collectiveMemory.enabled=="boolean"&&e.setCollectiveMemoryEnabled(r.collectiveMemory.enabled),typeof r.collectiveMemory.window=="number"&&e.setCollectiveMemoryWindow(r.collectiveMemory.window),e.setCollectiveMemoryUi(g=>iE(g,r.collectiveMemory))),r.spiral&&(typeof r.spiral.enabled=="boolean"&&e.setPsychedelicSpiralEnabled(r.spiral.enabled),typeof r.spiral.follow=="number"&&e.setPsychedelicSpiralFollow(r.spiral.follow),e.setPsychedelicSpiralUi(g=>pke(g,r.spiral))),r.transientDrive&&e.setTransientDriveUi(g=>iE(g,r.transientDrive)),r.liveMastering&&(typeof r.liveMastering.enabled=="boolean"&&e.setLiveMasteringEnabled(r.liveMastering.enabled),typeof r.liveMastering.strength=="number"&&e.setLiveMasteringStrength(r.liveMastering.strength),typeof r.liveMastering.glue=="number"&&e.setLiveMasteringGlue(r.liveMastering.glue),typeof r.liveMastering.air=="number"&&e.setLiveMasteringAir(r.liveMastering.air));const o=r.nexusPatch??{},{normalizedNexusPatch:i,nextGridMutes:s,nextGridOffsets:l,nextAgentEnabled:c,nextAgentVolumes:d}=cke(e.nexusParamsRef.current,r);i.gridTuning&&e.changeGridTuning(i.gridTuning),i.gridMode&&e.setGridMode(i.gridMode),i.particleSystem&&e.setParticleSystem(i.particleSystem),i.churchMode&&e.setChurchMode(i.churchMode);const p={...e.initialOvertonesByPreset.current[r.dronePreset]??Ud()},f=Ta({...p,...r.droneOvertones??{}}),b=Ta({...r.waveOvertones??{}});e.nexusRefs.current.agents.forEach((g,y)=>{if(y>=c.length){g.lastHit=Number.POSITIVE_INFINITY,g.lastHitAudioTimeSec=void 0;return}g.lastHit=c[y]?0:Number.POSITIVE_INFINITY,g.lastHitAudioTimeSec=void 0}),e.updateNParams({...o,...i,...a,quantizeBpm:r.gridTempoBpm??o.quantizeBpm??e.nexusParamsRef.current.quantizeBpm,dronePreset:r.dronePreset,particlePreset:r.particlePreset,droneJIOvertones:f,droneJIOvertonesByPreset:{...e.nexusParamsRef.current.droneJIOvertonesByPreset,[r.dronePreset]:f},waveOvertones:b,manualGridMutedSteps:s,manualGridStepOffsets:l,agentEnabled:c,agentVolumes:d}),e.primeMyzelFromY(e.nexusRefs.current.cursorY,"toggle"),requestAnimationFrame(()=>{const g=e.nexusParamsRef.current;e.applyRealtimeDroneOvertones(g.droneJIOvertones,g.droneTimbre)})},metaPresetActionBoundaryExtractedFromAppTsx:!0,sourceGroupMergeRitualUnified:!0,noWaveStarterBassRootFollowOrRoom3BodyHotPathMoved:!0}}function fke(){const[e,t]=P.useState({}),[n,r]=P.useState(null),[a,o]=P.useState(null),[i,s]=P.useState(!1),l=P.useRef(2654435769),c=P.useRef(0),d=P.useRef(0),p=P.useRef(0);return{mandalaPresetColorOverrides:e,setMandalaPresetColorOverrides:t,mandalaRandomizingPresetId:n,setMandalaRandomizingPresetId:r,roulettePreviewPresetId:a,setRoulettePreviewPresetId:o,rouletteIsSpinning:i,setRouletteIsSpinning:s,mouseEntropyRef:l,lastMouseEntropyStampRef:c,mandalaSpinTokenRef:d,rouletteSpinTokenRef:p}}function gke(){const[e,t]=P.useState("drone"),[n,r]=P.useState(null),[a,o]=P.useState({}),i=fke();return{activeOvertoneMixer:e,setActiveOvertoneMixer:t,activeMetaPresetId:n,setActiveMetaPresetId:r,sessionMetaOverrides:a,setSessionMetaOverrides:o,metaPresetRouletteState:i}}const bke=(e,t,n=0,r=0)=>{let a=(e^Math.floor(t*1e3)^Math.floor(n*1e6)^r)>>>0;return a||(a=2654435769),a>>>0},sO=e=>{let t=e>>>0;return()=>(t^=t<<13,t>>>=0,t^=t>>>17,t>>>=0,t^=t<<5,t>>>=0,(t>>>0)/4294967296)},Cr=(e,t)=>{if(e.length===0)throw new Error("Cannot choose from an empty option list.");const n=Math.floor(t()*e.length)%e.length,r=e[n];if(r===void 0)throw new Error("Random option index resolved outside the option list.");return r},$t=(e,t,n,r=2)=>Number((t+(n-t)*e()).toFixed(r)),Va=(e,t=.5)=>e()<t,lO=e=>{const t=Ud(),n=Object.keys(t),r={};let a=0;return n.forEach((o,i)=>{e()<(i<4?.62:.32)&&(a+=1,r[o]=$t(e,.04,i<3?.92:.58))}),!a&&n[0]&&(r[n[0]]=.82),r},yke=e=>{const t=Cr(j0.map(s=>s.value),e),n=Cr(["ji","bp",...RJ],e),r=Cr(Ka(t).map(s=>s.value),e),a=Cr(Ka(n).map(s=>s.value),e),o=(s=.38)=>({enabled:Va(e,s),send:$t(e,.04,.72)}),i=()=>({enabled:Va(e,.44),send:$t(e,.02,.52),wet:$t(e,.05,.64)});return{preset:{dronePreset:Cr(dg.map(s=>s.value),e),particlePreset:Cr(gS.map(s=>s.value),e),waveSoundPreset:Cr(bS.map(s=>s.value),e),waveSoundEnabled:Va(e,.12),waveSoundVolume:$t(e,.14,.34),droneVolume:$t(e,.02,.24),quantizeGrid:Cr([8,16,32,64],e),gridTempoBpm:Math.round($t(e,82,148,0)),myzelEnabled:!0,myzelPattern:Cr(aj.map(s=>s.value),e),myzelBallMode:Cr(oj.map(s=>s.value),e),myzelNodeMode:Cr(ij.map(s=>s.value),e),myzelStep16ths:Cr([1,2,4,8],e),tParams:{tension:$t(e,.18,.96),slimLayers:$t(e,.08,.94),rawReality:$t(e,.12,.96),intensityGlobal:$t(e,.28,1)},room3Body:{enabled:Va(e,.14),controls:{coupling:$t(e,.14,.96),material:$t(e,0,1),air:$t(e,0,1),roughness:$t(e,0,1),resonance:$t(e,.12,.96)}},collectiveMemory:{enabled:Va(e,.48),window:$t(e,3,15,1),drone:i(),particles:i(),waves:i(),myzel:i()},spiral:{enabled:Va(e,.52),follow:$t(e,0,1),drive:$t(e,0,1),color:$t(e,0,1),motion:$t(e,0,1),feedback:$t(e,.04,.82),bloom:$t(e,0,1),mix:$t(e,.4,.96),stereoWidth:$t(e,.08,1),outputGain:$t(e,.38,1),drone:o(),particles:o(),waves:o(),myzel:o()},transientDrive:{drone:o(),particles:o(),waves:o(),myzel:o()},liveMastering:{enabled:Va(e,.52),strength:$t(e,0,1),glue:$t(e,0,1),air:$t(e,0,1)},nexusPatch:{echoOn:Va(e,.62),echoTempo:Math.round($t(e,180,720,0)),echoDecay:$t(e,.16,.84),waveRadius:$t(e,.88,1.42),waveDecay:Cr(mj.map(s=>s.value),e),gridOn:!0,gridBase:Cr([110,123.47,130.81,146.83,164.81,174.61,196,220,246.94,261.63,293.66,329.63,392,415.3,440],e),gridTuning:t,gridMode:r,particleSystem:n,churchMode:a,lockCursorToGrid:Va(e,.24),cursorSpeed:Math.round($t(e,2,8,0)),droneTimbre:$t(e,0,1),droneVibrato:$t(e,0,1),droneFlanger:$t(e,0,1),droneRhythm:Cr(["Off","Puls 1/4","Puls 1/8","Puls 1/16","Syncopation"],e),droneDriveOn:Va(e,.58),droneDriveAmount:$t(e,0,.82),droneDriveTone:$t(e,0,1),droneDriveMix:$t(e,0,1),droneDriveOutput:$t(e,.22,1),drumActive:Va(e,.08),drumPattern:Cr(sw.map(s=>s.value),e),drumKit:Cr(Ny.map(s=>s.value),e),drumVolume:$t(e,.2,.72),bassActive:Va(e,.12),bassPattern:Cr(fF.map(s=>s.value),e),bassVolume:$t(e,.16,.62),bassRootMode:Va(e,.68)?"auto":"fixed",bassRootHz:Cr([41.2,55,61.74,73.42,82.41,98,110],e),particleGradientX:Cr(MP.map(s=>s.value),e),particleGradientY:Cr(MP.map(s=>s.value),e),waveTimbreGradientEnabled:Va(e,.52),waveTimbreGradientX:Cr(uj.map(s=>s.value),e),waveVolumeGradientEnabled:Va(e,.36),waveVolumeGradientX:Cr(dj.map(s=>s.value),e),waveOvertonesEnabled:Va(e,.56),droneOvertoneWaveform:Cr(["sine","triangle","square","sawtooth"],e),waveOvertoneWaveform:Cr(["sine","triangle","square","sawtooth"],e),particleVolume:$t(e,.08,.28),particleMute:!1,quantizeOn:Va(e,.48),quantizeBpm:Math.round($t(e,84,156,0))},droneOvertones:lO(e),waveOvertones:lO(e)},uiPatch:{drumEdge:$t(e,0,1),drumSoftness:$t(e,0,1),drumAir:$t(e,0,1),drumSnap:$t(e,0,1),grooveSwing:$t(e,0,1),bassTone:$t(e,0,1),bassGrit:$t(e,0,1)}}};function Ske(e,t,n,r,a){const o=((t+1)*73856093^(n+1)*19349663^(Math.round(r*1e3)+1)*83492791^Math.round(a*1e3))>>>0;let i=e^o;return i=Math.imul(i^i>>>15,2246822519)>>>0,i^=i>>>13,i>>>0}function vke(e,t,n,r){return bke(e,t,n,r)}function Ake(e){const{metaPresetRouletteState:t}=e;P.useEffect(()=>{const o=i=>{const s=performance.now(),l=Math.max(0,s-t.lastMouseEntropyStampRef.current);t.lastMouseEntropyStampRef.current=s,t.mouseEntropyRef.current=Ske(t.mouseEntropyRef.current,i.clientX,i.clientY,l,s)};return window.addEventListener("mousemove",o,{passive:!0}),()=>window.removeEventListener("mousemove",o)},[t.lastMouseEntropyStampRef,t.mouseEntropyRef]);const n=()=>{const o=typeof performance<"u"&&"memory"in performance?Number(performance.memory?.usedJSHeapSize??0):0;return vke(t.mouseEntropyRef.current,performance.now(),e.audioCtxRef.current?.currentTime??0,o)};return{readEntropySeed:n,randomizeMetaPresetForSession:o=>{if(t.mandalaRandomizingPresetId||t.rouletteIsSpinning)return;const i=++t.mandalaSpinTokenRef.current;t.setMandalaRandomizingPresetId(o);const s=sO(n());let l=Math.floor(s()*F1.length),c=14+Math.floor(s()*18);const d=Math.max(c,1),p=()=>{if(i!==t.mandalaSpinTokenRef.current)return;if(t.setMandalaPresetColorOverrides(g=>({...g,[o]:F1[l%F1.length]})),c<=0){const g=yke(s);e.setSessionMetaOverrides(y=>({...y,[o]:g})),t.setMandalaRandomizingPresetId(null),e.applyMetaPreset(o);return}l=(l+1)%F1.length,c-=1;const f=1-c/d,b=48+f*f*260+s()*26;window.setTimeout(p,b)};p()},startMetaPresetRoulette:()=>{if(t.rouletteIsSpinning||t.mandalaRandomizingPresetId||!Zy.length)return;const o=++t.rouletteSpinTokenRef.current;t.setRouletteIsSpinning(!0);let i=n();i||(i=2738958700);const s=sO(i),l=Zy.map(y=>y.id);let c=Math.floor(s()*l.length);const d=Math.floor(s()*l.length);let f=(3+Math.floor(s()*4))*l.length+(d-c+l.length)%l.length;const b=Math.max(f,1),g=()=>{if(o!==t.rouletteSpinTokenRef.current)return;if(t.setRoulettePreviewPresetId(l[c]),f<=0){const A=l[d];t.setRoulettePreviewPresetId(A),t.setRouletteIsSpinning(!1),e.applyMetaPreset(A),window.setTimeout(()=>{t.rouletteSpinTokenRef.current===o&&t.setRoulettePreviewPresetId(null)},260);return}c=(c+1)%l.length,f-=1;const y=1-f/b,x=44+y*y*310+s()*24;window.setTimeout(g,x)};g()},metaPresetRouletteBoundaryExtractedFromAppTsx:!0,rouletteChoosesPresetButDoesNotApplyPresetSemantics:!0,noWaveStarterBassRootFollowOrRoom3BodyHotPathMoved:!0}}function xke(){const e=P.useRef(null);e.current===null&&(e.current=Qa(ir/2));const t=P.useRef(e.current),n=P.useRef(0),r=P.useRef({x:vr/2,y:ir/2}),a=P.useRef("auto"),o=P.useCallback(i=>{const s=typeof i=="function"?i(t.current):i;Number.isFinite(s)&&(t.current=s,Toe(s))},[]);return{cursorHudHz:t.current,setCursorHudHz:o,cursorHudHzRef:t,cursorHudLastUpdateRef:n,focusCursorRef:r,focusCursorLastInputRef:a}}function Mke(){const e=P.useRef(null),t=P.useRef({left:!1,right:!1,up:!1,down:!1}),n=P.useRef(0),r=P.useRef(1);return P.useMemo(()=>({nexusCanvasRef:e,nexusArrowRef:t,waveLaunchAtRef:n,waveImpactDecayRef:r}),[])}function wke(){const e=P.useRef(null),t=P.useRef(null),n=P.useRef(null),r=P.useRef(null),a=P.useRef(null),o=P.useRef(null),i=P.useRef(null),s=P.useRef(null),l=P.useRef(null),c=P.useRef(null),d=P.useRef({pre_fx:null,post_fx:null,monitor:null}),p=P.useRef(null),f=P.useRef(null),b=P.useRef(null),g=P.useRef(null),y=P.useRef(null),x=P.useRef(null),A=P.useRef(null),M=P.useRef(new Set),v=P.useMemo(()=>({finalMixBusRef:e,drumMixBusRef:t,masterMixBusRef:n,finalLimiterRef:r,finalClipperRef:a,finalOutputTrimRef:o,finalMixAnalyserRef:i,preFxTapAnalyserRef:s,postFxTapAnalyserRef:l,monitorTapAnalyserRef:c,audioTapScratchRef:d,liveMasteringRef:p,noDrumRecordClipperRef:f,noDrumRecordLimiterRef:b,noDrumRecordOutputRef:g,recordingDestinationWithDrumsRef:y,recordingDestinationWithoutDrumsRef:x,externalGameRecordingBusRef:A,externalGameRecordingBusConnectionTargetsRef:M}),[]);return{...v,liveMasterBusRuntimeRefs:v}}function gk(){return{pendingIntents:[],latestDecisions:[],latestTapSnapshots:[]}}const Rke=()=>({main:0,drone:0,rhythm:0,space:0,density:0,trim:.92});function Cke(){const[e,t]=P.useState(!1),[n,r]=P.useState(.68),[a,o]=P.useState(.54),[i,s]=P.useState(.48),[l,c]=P.useState(()=>Rke()),[d,p]=P.useState(()=>gk()),f=P.useRef(gk()),[b,g]=P.useState(()=>vj(gk()));return{liveMasteringEnabled:e,setLiveMasteringEnabled:t,liveMasteringStrength:n,setLiveMasteringStrength:r,liveMasteringGlue:a,setLiveMasteringGlue:o,liveMasteringAir:i,setLiveMasteringAir:s,liveMasterMonitor:l,setLiveMasterMonitor:c,audioEventIntakeMonitor:d,setAudioEventIntakeMonitor:p,audioEventIntakeMonitorRef:f,audioTapMonitor:b,setAudioTapMonitor:g}}function kke(){const e=wke(),t=Cke();return{...e,...t}}class Pke{constructor(t){this.ports=t}abort=new AbortController;startPromise=null;stopPromise=null;disconnected=!1;stopRequested=!1;error=null;phase="idle";publish(t){this.phase=t,this.ports.publish(t,this.error)}start(){return this.startPromise??=Promise.resolve().then(async()=>{if(!this.stopRequested)try{if(this.publish("preparing"),await this.ports.prepare(this.abort.signal),this.stopRequested||(this.publish("armed"),this.ports.disconnectBrowserMaster(),this.disconnected=!0,this.publish("activating"),await this.ports.settleBrowserMaster(this.abort.signal),this.stopRequested))return;await this.ports.commit(this.abort.signal),this.stopRequested||this.publish("native-owned")}catch(t){this.stopRequested||(this.error=t instanceof Error?t.message:String(t),this.stopRequested=!0,this.abort.abort())}}).then(async()=>{this.stopRequested&&await this.finish()})}stop(t){return t&&!this.error&&(this.error=t),this.stopRequested=!0,this.abort.abort(),this.startPromise?this.startPromise.then(()=>this.finish()):this.finish()}finish(){return this.stopPromise??=Promise.resolve().then(async()=>{this.publish("stopping");let t;try{t=await this.ports.stop()}catch(n){t={confirmed:!1,reason:String(n)}}if(this.disconnected&&!t.confirmed){this.error=[this.error,t.reason||"native-stop-unconfirmed"].filter(Boolean).join("; "),this.ports.dispose(),this.publish("owner-unknown");return}try{this.disconnected&&this.ports.reconnectBrowserMaster(),this.disconnected=!1,this.ports.dispose(),this.publish(this.error?"fault":"stopped")}catch(n){this.error=[this.error,String(n)].filter(Boolean).join("; "),this.ports.dispose(),this.publish("owner-unknown")}})}}const cO=new WeakMap;function Ike(e,t){const n=cO.get(e);let r=null,a=!1,o;const i=new Promise(l=>{o=l});cO.set(e,i);const s=(async()=>{if(n&&await n,a){o();return}r=t(),await r.start(),(r.phase==="fault"||r.phase==="stopped")&&o()})();return async()=>{a=!0,await s,r&&await r.stop(),r?.phase!=="owner-unknown"&&o()}}const W9="xensonar-post-master-pcm-tap",Eke=String.raw`
class XensonarPostMasterPcmTap extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = options.processorOptions || {};
    this.audioSab = opts.audioSab;
    this.controlSab = opts.controlSab;
    this.writePtr = new Uint32Array(this.audioSab, 0, 1);
    this.readPtr = new Uint32Array(this.audioSab, 4, 1);
    this.storage = new Float32Array(this.audioSab, 8);
    this.control = new Int32Array(this.controlSab);
    this.storageCapacity = this.storage.length;
    this.fenceQuanta = 0;
    this.port.onmessage = ({data}) => { if (data.type === 'FENCE') this.fenceQuanta = 2; };
  }

  availableWrite() {
    const rd = Atomics.load(this.readPtr, 0);
    const wr = Atomics.load(this.writePtr, 0);
    const readable = (wr + this.storageCapacity - rd) % this.storageCapacity;
    return (this.storageCapacity - 1) - readable;
  }

  latchOrigin() {
    if (Atomics.load(this.control, 2) !== 0) return;
    const frame = currentFrame;
    Atomics.store(this.control, 0, frame >>> 0);
    Atomics.store(this.control, 1, Math.floor(frame / 4294967296) >>> 0);
    Atomics.store(this.control, 2, 1);
  }

  writeStereo(left, right, frames) {
    const samples = frames * 2;
    if (this.availableWrite() < samples) {
      Atomics.add(this.control, 3, frames);
      Atomics.store(this.control, 6, 1);
      return false;
    }
    let wr = Atomics.load(this.writePtr, 0);
    for (let i = 0; i < frames; i += 1) {
      this.storage[wr] = left ? (left[i] || 0) : 0;
      wr += 1;
      if (wr === this.storageCapacity) wr = 0;
      this.storage[wr] = right ? (right[i] || 0) : 0;
      wr += 1;
      if (wr === this.storageCapacity) wr = 0;
    }
    Atomics.store(this.writePtr, 0, wr);
    Atomics.add(this.control, 4, 1);
    Atomics.add(this.control, 5, frames);
    return true;
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (output) {
      for (let c = 0; c < output.length; c += 1) output[c].fill(0);
    }
    if (Atomics.load(this.control, 7) !== 0) return false;
    const input = inputs[0];
    const left = input && input[0];
    const frames = (output && output[0] && output[0].length) || (left && left.length) || 0;
    if (!frames) return true;
    const right = (input && input[1]) || left;
    // Before ownership changes, require a quiet start. A live cross-clock
    // handover is deliberately not disguised as a seamless output switch.
    if (left && Atomics.load(this.control, 10) === 0 && Atomics.load(this.control, 8) === 0) {
      for (let i = 0; i < left.length; i++) {
        if (Math.abs(left[i]) > 0.0000001 || Math.abs(right[i]) > 0.0000001) {
          Atomics.store(this.control, 8, 1); break;
        }
      }
    }
    if (Atomics.load(this.control, 9) !== 0) {
      this.latchOrigin();
      // Empty upstream input is musical silence, not a missing PCM interval.
      this.writeStereo(left, right, frames);
    }
    // WebAudio applies graph control messages before rendering. Waiting two
    // process calls also covers a port task arriving during the current quantum.
    if (this.fenceQuanta > 0 && --this.fenceQuanta === 0) {
      this.port.postMessage({ type: 'TAP_FENCED', frame: currentFrame });
    }
    return true;
  }
}
registerProcessor('${W9}', XensonarPostMasterPcmTap);
`,Fke=String.raw`
let initialized = false, stopping = false, faultSent = false;
let writePtr, readPtr, storage, control, capacity;
let sampleRate, blockFrames, prefillFrames, baseUrl;
let token = '', sessionId = '', generation = 0, sequence = 0, consumedFrames = 0, originFrame = null;
let socket = null, packetBuffer, packetView, packetSamples;
let setupPromise = null, stopPromise = null, commitSent = false, prefilled = false;
let latestNativeFillFrames = 0, latestNativeMinFillFrames = 0, lastProgressMs = 0;
let activateResolve;
const activation = new Promise(resolve => { activateResolve = resolve; });
const waiters = new Map();
const WS_PCM = 1, WS_COMMIT = 2, WS_STOP = 3, WS_BARRIER = 4;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const post = message => self.postMessage({ ...message, generation });
const availableRead = () => (Atomics.load(writePtr, 0) + capacity - Atomics.load(readPtr, 0)) % capacity;
function checkRunning() { if (stopping) throw new Error('output-session-stopped'); }
function checkRing() {
  if (Atomics.load(control, 6)) throw new Error('browser-pcm-ring-overflow');
  // Storage capacity is not permission to grow latency without limit.
  if (availableRead() / 2 > prefillFrames + blockFrames * 2) throw new Error('browser-pcm-backlog');
}
async function getJson(path, init = {}) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 1200);
  try {
    const response = await fetch(baseUrl + path, { cache: 'no-store', ...init, signal: abort.signal });
    const body = await response.json();
    if (!response.ok) throw new Error(path + '-' + response.status + ':' + String(body.error || ''));
    return body;
  } finally { clearTimeout(timer); }
}
const headers = () => ({ 'X-Xensonar-Token': token, 'X-Xensonar-Session': sessionId,
  'Content-Type': 'application/x-www-form-urlencoded' });
function controlPacket(type) {
  const buffer = new ArrayBuffer(8), view = new DataView(buffer);
  view.setUint32(0, type, true); view.setUint32(4, generation, true);
  return buffer;
}
function waitFor(type, timeout = 1200) {
  if (waiters.has(type)) throw new Error('duplicate-waiter-' + type);
  return new Promise((resolve, reject) => {
    const finish = (error, value) => {
      clearTimeout(timer); waiters.delete(type);
      if (error) reject(error); else resolve(value);
    };
    const timer = setTimeout(() => finish(new Error(type + '-timeout')), timeout);
    waiters.set(type, { resolve: value => finish(null, value), reject: error => finish(error) });
  });
}
function rejectWaiters(error) { for (const waiter of [...waiters.values()]) waiter.reject(error); }
async function openStream() {
  const wsBase = baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  socket = new WebSocket(wsBase + '/v1/post-master/stream?token=' + encodeURIComponent(token) +
    '&session=' + encodeURIComponent(sessionId) + '&generation=' + generation);
  socket.binaryType = 'arraybuffer';
  const opened = waitFor('OPEN');
  socket.onopen = () => waiters.get('OPEN')?.resolve({});
  socket.onerror = () => {
    const error = new Error('post-master-stream-error');
    rejectWaiters(error); if (!stopping) fail(error);
  };
  socket.onclose = () => {
    const error = new Error('post-master-stream-closed');
    rejectWaiters(error); if (!stopping) fail(error);
  };
  socket.onmessage = event => {
    if (typeof event.data !== 'string') return;
    let message;
    try { message = JSON.parse(event.data); } catch { fail(new Error('invalid-native-message')); return; }
    if (Number(message.generation) !== generation) { fail(new Error('native-generation-mismatch')); return; }
    if (message.type === 'FAULT') {
      const error = new Error(String(message.error || 'native-stream-fault'));
      rejectWaiters(error); if (!stopping) fail(error); return;
    }
    if (message.fillFrames !== undefined) latestNativeFillFrames = Number(message.fillFrames);
    if (message.minFillFrames !== undefined) latestNativeMinFillFrames = Number(message.minFillFrames);
    waiters.get(message.type)?.resolve(message);
  };
  await opened;
}
async function bootstrap() {
  const session = await getJson('/v1/session');
  checkRunning();
  if (session.physicalAudio !== true) throw new Error('physical-audio-not-ready');
  if (session.postMasterProtocol !== 2 || session.postMasterExclusive !== true) throw new Error('exclusive-post-master-host-v2-required');
  if (Number(session.sampleRate) !== sampleRate) throw new Error('post-master-sample-rate-mismatch');
  token = String(session.token || ''); sessionId = String(session.sessionId || '');
  if (!token || !sessionId) throw new Error('session-identity-missing');
  const begin = await getJson('/v1/post-master/begin', { method: 'POST', headers: headers(),
    body: 'sampleRate=' + sampleRate + '&channels=2&prefillFrames=' + prefillFrames });
  generation = Number(begin.generation) >>> 0;
  if (!generation) throw new Error('native-generation-missing');
  checkRunning();
  await openStream();
  checkRunning();
  Atomics.store(control, 9, 1); // Start capture only after the transport is ready.
  post({ type: 'ARMED' });
}
function sendBlock() {
  if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error('post-master-stream-not-open');
  // Fail a blocked delivery path instead of queueing an ever older performance.
  if (socket.bufferedAmount > 4 * packetBuffer.byteLength) throw new Error('post-master-socket-backlog');
  const count = blockFrames * 2, rd = Atomics.load(readPtr, 0);
  if (availableRead() < count) return false;
  const first = Math.min(capacity - rd, count);
  packetSamples.set(storage.subarray(rd, rd + first));
  if (first < count) packetSamples.set(storage.subarray(0, count - first), first);
  if (originFrame === null) originFrame = (Atomics.load(control, 1) >>> 0) * 4294967296 + (Atomics.load(control, 0) >>> 0);
  packetView.setUint32(0, WS_PCM, true); packetView.setUint32(4, generation, true);
  packetView.setBigUint64(8, BigInt(sequence), true);
  packetView.setBigUint64(16, BigInt(originFrame + consumedFrames), true);
  packetView.setUint32(24, blockFrames, true); packetView.setUint32(28, sampleRate, true);
  socket.send(packetBuffer);
  Atomics.store(readPtr, 0, (rd + count) % capacity);
  consumedFrames += blockFrames; sequence++;
  return true;
}
async function fill() {
  while (!stopping && consumedFrames < prefillFrames) {
    checkRing();
    if (Atomics.load(control, 2) && sendBlock()) continue;
    await sleep(1);
  }
  checkRunning();
  const barrier = waitFor('BARRIER');
  socket.send(controlPacket(WS_BARRIER));
  const ready = await barrier;
  if (ready.fault || Number(ready.fillFrames) < prefillFrames) throw new Error('native-prefill-not-established');
  if (Atomics.load(control, 8)) throw new Error('select-master-output-before-playing');
  prefilled = true;
  post({ type: 'PREFILLED', fillFrames: Number(ready.fillFrames) });
}
async function pump() {
  await setupPromise;
  await fill();
  // No native output before the browser confirms its master edge is disconnected.
  const activate = await activation;
  if (!activate || stopping) return;
  checkRing();
  if (Atomics.load(control, 8)) throw new Error('select-master-output-before-playing');
  Atomics.store(control, 10, 1);
  const committed = waitFor('COMMITTED');
  // Attach the rejection handler immediately. Do not await ACK on the PCM path.
  void committed.then(message => { if (!stopping) post({ type: 'COMMITTED', fillFrames: message.fillFrames }); }, fail);
  commitSent = true;
  socket.send(controlPacket(WS_COMMIT));
  while (!stopping) {
    checkRing();
    if (!sendBlock()) { await sleep(1); continue; }
    const now = performance.now();
    if (now - lastProgressMs >= 900) {
      lastProgressMs = now;
      post({ type: 'PROGRESS', browserRingFrames: availableRead() / 2,
        nativeFillFrames: latestNativeFillFrames, nativeMinFillFrames: latestNativeMinFillFrames,
        sequence, consumedFrames, socketBufferedBytes: socket.bufferedAmount });
    }
  }
}
async function stopNative() {
  return stopPromise ??= (async () => {
    stopping = true; activateResolve(false);
    try { await setupPromise; } catch { /* Reconcile a late successful BEGIN below. */ }
    let confirmed = !commitSent, error = '';
    if (generation) {
      try {
        if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error('stream-not-open');
        const stopped = waitFor('STOPPED', 700);
        socket.send(controlPacket(WS_STOP));
        const proof = await stopped;
        if (proof.confirmed !== true) throw new Error('native-stop-unconfirmed');
        confirmed = true;
      } catch (streamError) {
        // Generation-qualified control fallback. A socket close alone is no proof.
        try {
          const proof = await getJson('/v1/post-master/stop', { method: 'POST', headers: headers(), body: 'generation=' + generation });
          if (proof.confirmed !== true || Number(proof.generation) !== generation) throw new Error('native-stop-unconfirmed');
          confirmed = true;
        } catch (httpError) { error = String(httpError || streamError); }
      }
    }
    socket?.close();
    rejectWaiters(new Error('output-session-stopped'));
    return { type: 'STOPPED', confirmed, error };
  })();
}
function fail(error) {
  if (faultSent || stopping) return;
  faultSent = true;
  post({ type: 'FAULT', error: String(error?.message || error) });
  void stopNative().then(post);
}
self.onmessage = ({ data: message }) => {
  if (message.type === 'INIT') {
    if (initialized) { fail(new Error('duplicate-init')); return; }
    initialized = true;
    sampleRate = Number(message.sampleRate); blockFrames = Number(message.blockFrames); prefillFrames = Number(message.prefillFrames);
    baseUrl = String(message.baseUrl).replace(/\/$/, '');
    writePtr = new Uint32Array(message.audioSab, 0, 1); readPtr = new Uint32Array(message.audioSab, 4, 1);
    storage = new Float32Array(message.audioSab, 8); control = new Int32Array(message.controlSab); capacity = storage.length;
    packetBuffer = new ArrayBuffer(32 + blockFrames * 2 * 4); packetView = new DataView(packetBuffer);
    packetSamples = new Float32Array(packetBuffer, 32);
    setupPromise = bootstrap();
    void pump().catch(fail);
  } else if (message.type === 'COMMIT') {
    if (!stopping && prefilled && Number(message.generation) === generation) activateResolve(true);
    else if (!stopping) fail(new Error('commit-before-prefill-or-stale-generation'));
  } else if (message.type === 'STOP') { void stopNative().then(post); }
};
`,bk=new WeakMap,q9=e=>URL.createObjectURL(new Blob([e],{type:"text/javascript"}));function Tke(e){let t=bk.get(e);if(!t){const n=q9(Eke);t=e.audioWorklet.addModule(n).finally(()=>URL.revokeObjectURL(n)),bk.set(e,t),t.catch(()=>bk.delete(e))}return t}function Lke(e){let t=null,n=null,r=null,a=null,o=null,i=!1,s=0,l=null;const c=new Map,d=(p,f,b)=>new Promise((g,y)=>{const x=(v,w={})=>{clearTimeout(M),b?.removeEventListener("abort",A),c.delete(p),v?y(v):g(w)},A=()=>x(new Error("output-session-cancelled")),M=setTimeout(()=>x(new Error(p.toLowerCase()+"-timeout")),f);c.set(p,{resolve:v=>x(null,v),reject:v=>x(v)}),b?.aborted?A():b?.addEventListener("abort",A,{once:!0})});return{async prepare(p){if(!globalThis.crossOriginIsolated||typeof SharedArrayBuffer>"u")throw new Error("cross-origin-isolation-required");if(!e.context.audioWorklet)throw new Error("audio-worklet-required");if(await new Promise((y,x)=>{const A=()=>{clearTimeout(M),x(new Error("output-session-cancelled"))},M=setTimeout(()=>{p.removeEventListener("abort",A),x(new Error("tap-load-timeout"))},4e3);if(p.aborted){A();return}p.addEventListener("abort",A,{once:!0}),Tke(e.context).then(y,x).finally(()=>{clearTimeout(M),p.removeEventListener("abort",A)})}),p.aborted||i)throw new Error("output-session-cancelled");const f=new SharedArrayBuffer(8+(32768*2+1)*4),b=new SharedArrayBuffer(64);o=new Int32Array(b),n=new AudioWorkletNode(e.context,W9,{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1],channelCount:2,channelCountMode:"explicit",processorOptions:{audioSab:f,controlSab:b}}),n.port.onmessage=({data:y})=>{!i&&y.type==="TAP_FENCED"&&c.get("TAP_FENCED")?.resolve(y)},n.onprocessorerror=()=>e.onFault("post-master-tap-error"),r=e.context.createGain(),r.gain.value=0,e.master.connect(n),n.connect(r),ih.existing(e.context)?.authorizeSilent(r,"post-master:keepalive(0)"),r.connect(e.context.destination),a=q9(Fke),t=new Worker(a,{name:"xensonar-master-output"}),t.onmessage=({data:y})=>{if(i)return;const x=String(y.type||"");if(x==="ARMED"&&(s=Number(y.generation)),!(y.generation&&s&&Number(y.generation)!==s)){if(x==="FAULT"){const A=String(y.error||"post-master-worker-fault");c.get("PREFILLED")?.reject(new Error(A)),c.get("COMMITTED")?.reject(new Error(A)),e.onFault(A)}else(x==="PROGRESS"||x==="ARMED")&&e.onProgress({...y,droppedFrames:o?Atomics.load(o,3):0});c.get(x)?.resolve(y)}},t.onerror=y=>{const x=y.message||"post-master-worker-error";for(const A of[...c.values()])A.reject(new Error(x));e.onFault(x)};const g=d("PREFILLED",5e3,p);t.postMessage({type:"INIT",audioSab:f,controlSab:b,sampleRate:e.context.sampleRate,blockFrames:1024,prefillFrames:2048,baseUrl:e.baseUrl}),await g},async settleBrowserMaster(p){if(!n||p.aborted)throw new Error("output-session-cancelled");const f=d("TAP_FENCED",1500,p);n.port.postMessage({type:"FENCE"}),await f},async commit(p){if(!t||p.aborted)throw new Error("output-session-cancelled");const f=d("COMMITTED",1500,p);t.postMessage({type:"COMMIT",generation:s}),await f},stop(){return l??=(async()=>{if(!t)return{confirmed:!0};try{const p=d("STOPPED",4500);t.postMessage({type:"STOP"});const f=await p;return{confirmed:f.confirmed===!0,reason:String(f.error||"native-stop-unconfirmed")}}catch(p){return{confirmed:!1,reason:String(p)}}})()},dispose(){if(!i){i=!0;for(const p of[...c.values()])p.reject(new Error("output-transport-disposed"));o&&Atomics.store(o,7,1);try{n&&e.master.disconnect(n)}catch{}try{n?.disconnect()}catch{}try{n?.port.close()}catch{}try{r?.disconnect()}catch{}t?.terminate(),a&&URL.revokeObjectURL(a),n=null,r=null,t=null}}}}function Bke(){try{return typeof window<"u"&&new URLSearchParams(window.location.search).get("postMasterPcm")==="1"}catch{return!1}}function Dke(){return location.protocol==="http:"&&location.hostname==="127.0.0.1"?location.origin:_F}function Nke(){if(typeof document>"u")return null;const e="xensonar-post-master-pcm-status",t=document.getElementById(e);if(t instanceof HTMLDivElement)return t;const n=document.createElement("div");return n.id=e,Object.assign(n.style,{position:"fixed",right:"12px",top:"12px",zIndex:"2147483647",padding:"7px 10px",borderRadius:"8px",font:"600 11px/1.2 monospace",background:"rgba(5,8,12,.88)",color:"#b8c7d9",border:"1px solid rgba(184,199,217,.35)",pointerEvents:"none",whiteSpace:"pre-line"}),n.textContent="MASTER OUTPUT · STARTING",document.body.appendChild(n),n}function Oke(e,t){if(!e)return;const n=t.state==="native-owned",r=t.state==="fault"||t.state==="owner-unknown";e.style.color=n?"#93f7ba":r?"#ff9c9c":"#f7d993",e.style.borderColor=n?"rgba(147,247,186,.5)":r?"rgba(255,156,156,.5)":"rgba(247,217,147,.45)",e.textContent=n?`MASTER OUTPUT · NATIVE OWNER
N ${t.nativeFillFrames}f · B ${t.browserRingFrames}f · D ${t.droppedFrames}f`:r?`MASTER OUTPUT · FAULT
${t.lastError??"unknown"}`:`MASTER OUTPUT · ${t.state.toUpperCase()}`}function _ke(e){const t=P.useRef(Bke()).current,[n,r]=P.useState({enabled:t,state:t?"waiting-audio":"disabled",crossOriginIsolated:globalThis.crossOriginIsolated===!0,generation:0,nativeFillFrames:0,browserRingFrames:0,droppedFrames:0,lastError:null});return P.useEffect(()=>{t&&Oke(Nke(),n)},[t,n]),P.useEffect(()=>{const a=e.audioCtx;if(!t||!a)return;let o=!1,i=null;const s=d=>{o||r(p=>({...p,...d}))},l=()=>{const d=e.finalOutputTrimRef.current;if(!(o||i||!d)){if(zF()||new URLSearchParams(location.search).get("nativeWaveStarter")==="1"){s({state:"fault",lastError:"post-master-requires-browser-source-ownership"}),clearInterval(c);return}i=Ike(a,()=>{let p;const f=Lke({context:a,master:d,baseUrl:Dke(),onProgress:b=>s({generation:Number(b.generation||0),nativeFillFrames:Number(b.nativeFillFrames||0),browserRingFrames:Number(b.browserRingFrames||0),droppedFrames:Number(b.droppedFrames||0)}),onFault:b=>{p.stop(b)}});return p=new Pke({...f,disconnectBrowserMaster:()=>{d.disconnect(a.destination),wj(d,a.destination,"native-master-output")},reconnectBrowserMaster:()=>{a.state!=="closed"&&La(d,a.destination,{label:"master:output-trim->destination",subsystem:"master"})},publish:(b,g)=>s({state:b,lastError:g})}),p}),clearInterval(c)}},c=window.setInterval(l,100);return l(),()=>{o=!0,clearInterval(c),i&&i()}},[e.audioCtx,e.finalOutputTrimRef,t]),n}const yk=()=>({drone:null,particles:null,waves:null,myzel:null}),zke=()=>({drone:null,particles:null,waves:null,myzel:null});function jke(){const e=P.useRef(null),t=P.useRef([]),n=P.useRef(8),r=P.useRef(null),a=P.useRef(zke()),o=P.useRef(null),i=P.useRef(yk()),s=P.useRef(null),l=P.useRef(null),c=P.useRef(yk()),d=P.useRef({waves:null,bass:null}),p=P.useRef(null),f=P.useRef(yk()),b=P.useMemo(()=>({finalMixProbeRef:e,collectiveMemoryFramesRef:t,collectiveMemoryWindowRef:n,collectiveMemorySummaryRef:r,collectiveFxRef:a,psychedelicSpiralRef:o,psychedelicSpiralSendsRef:i,transientDriveFxRef:s,enterHoldPsyFxRef:l,transientDriveSendsRef:c,enterHoldPsyFxSendsRef:d,schwarmdeuterRef:p,schwarmdeuterSendsRef:f}),[]);return{...b,resonanceFxRuntimeRefs:b}}function Gke({transientRuntimeRef:e,setTransientRuntimeMonitor:t,intervalMs:n=320}){P.useEffect(()=>{const r=()=>{document.hidden||t(e.current.getSnapshot())};r();const a=window.setInterval(r,n),o=()=>{document.hidden||r()};return document.addEventListener("visibilitychange",o),()=>{window.clearInterval(a),document.removeEventListener("visibilitychange",o)}},[n,t,e])}function Hke(e){const t=e instanceof HTMLElement?e:document.activeElement;if(!(t instanceof HTMLElement))return!1;const n=t.tagName.toLowerCase();return n==="input"||n==="textarea"||t.isContentEditable}function Vke({audioBurstRuntime:e,room:t,audioCtx:n,audioEventIntakeMonitorRef:r}){const a=P.useRef({audioBurstRuntime:e,room:t,audioCtx:n,audioEventIntakeMonitorRef:r});a.current={audioBurstRuntime:e,room:t,audioCtx:n,audioEventIntakeMonitorRef:r},P.useEffect(()=>{const o=i=>{if(i.code!=="F8"||i.repeat||Hke(i.target))return;const s=performance.now(),l=Number(i.timeStamp),c=Number.isFinite(l)&&l>=0&&Math.abs(l-s)<=6e4?l:s,d=a.current;d.audioBurstRuntime.recordMarker({room:d.room,audioNowSec:d.audioCtx?.currentTime??null,target:i.target,intakeState:d.audioEventIntakeMonitorRef.current,inputPerfNowMs:c,handledPerfNowMs:s,inputQueueDelayMs:Math.max(0,s-c),markerSource:"f8"}),$j({source:"f8",perfNowMs:c,handledPerfNowMs:s,inputQueueDelayMs:Math.max(0,s-c),audioNowSec:d.audioCtx?.currentTime??null,room:d.room})};return window.addEventListener("keydown",o),()=>window.removeEventListener("keydown",o)},[])}function Wke(e){return{resonanceKeyCaptureGate:{resonanceInputActive:e.resonanceInputActive,nexusParamsRef:e.nexusParamsRef},globalBrowserInput:{gameInputActive:e.gameInputActive,resonanceInputActive:e.resonanceInputActive,keyRef:e.keyRef},stableMetronomeVisualPulse:{metronomePulse:e.metronomePulse,scheduleStableRhythmMetronomePulse:e.scheduleStableRhythmMetronomePulse,clearStableRhythmMetronomeTimeouts:e.clearStableRhythmMetronomeTimeouts,sourceOwnerStillApp:!0},sourceOwnerStillApp:!0,normalizesOnlyLowRiskCallsites:!0,highRiskBodiesStillInlineInApp:!0,runtimeOwned:!1,audioOwned:!1,schedulingOwned:!1}}function qke({gameInputActive:e,keyRef:t}){P.useEffect(()=>{const n=a=>{!e||Qp(a.target)||ng(a.target)||Y3(a,!0,t.current)},r=a=>{!e||Qp(a.target)||ng(a.target)||Y3(a,!1,t.current)};return window.addEventListener("keydown",n),window.addEventListener("keyup",r),()=>{window.removeEventListener("keydown",n),window.removeEventListener("keyup",r)}},[e,t])}const Qke=new Set(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"]);function Uke({gameInputActive:e,resonanceInputActive:t}){P.useEffect(()=>{const n=r=>{Qp(r.target)||Qke.has(r.key)&&(ng(r.target)||e||t)&&r.preventDefault()};return window.addEventListener("keydown",n,{capture:!0}),()=>{window.removeEventListener("keydown",n,!0)}},[e,t])}function Kke(){P.useEffect(()=>{const e=t=>{if(t.ctrlKey||t.metaKey){t.preventDefault();return}PSe(t.target)||t.preventDefault()};return window.addEventListener("wheel",e,{passive:!1,capture:!0}),()=>{window.removeEventListener("wheel",e,!0)}},[])}function $ke({gameInputActive:e,resonanceInputActive:t,keyRef:n}){Kke(),Uke({gameInputActive:e,resonanceInputActive:t}),qke({gameInputActive:e,keyRef:n})}function Xke({resonanceInputActive:e,nexusParamsRef:t}){P.useEffect(()=>{const n=r=>{!e||Qp(r.target)||ng(r.target)||ISe(r,t.current.quantizeOn)&&r.preventDefault()};return window.addEventListener("keydown",n,!0),()=>window.removeEventListener("keydown",n,!0)},[t,e])}function Yke(e){const t=Wke(e);return Xke(t.resonanceKeyCaptureGate),{globalBrowserInput:t.globalBrowserInput,metronomePulse:t.stableMetronomeVisualPulse.metronomePulse,keyCaptureMountedAtLegacyCallsite:!0,browserBoundaryMustMountAtLegacyCallsite:!0,ownsKeyboardMusicalCommands:!1,ownsArrowMotionRaf:!1,ownsStableRhythmLaneScheduler:!1,ownsAudio:!1}}function Jke(e){$ke(e.globalBrowserInput)}function Zke(e){
 // P7.6: B + LEFT Alt switches the expression gesture between temporary piano
 // pedals and a latched knob. The chord is consumed until BOTH keys are released.
 const [t,n]=P.useState({octave:!1,sustain:!1,swell:!1,damp:!1,expressionMode:'pedal'});
 const swellHeld=P.useRef(!1),dampHeld=P.useRef(!1),expression=P.useRef(0);
 const mode=P.useRef('pedal'),comboConsumed=P.useRef(!1);
 const octave=P.useRef(!1),sustain=P.useRef(!1),enter=P.useRef(!1);
 const setSustain=P.useCallback(held=>{const was=sustain.current;sustain.current=held;n(v=>v.sustain===held?v:{...v,sustain:held});return was},[]);
 const updateExpressionHold=P.useCallback((which,held)=>{
  const ref=which==='swell'?swellHeld:dampHeld;
  const changed=ref.current!==held;ref.current=held;
  if(held&&changed&&swellHeld.current&&dampHeld.current&&!comboConsumed.current){
   comboConsumed.current=!0;
   mode.current=mode.current==='pedal'?'knob':'pedal';
   __XenPan.setKeyboardExpression(1);expression.current=0; // Do not carry the previous mode's trim into the new mode.
  }
  if(!swellHeld.current&&!dampHeld.current)comboConsumed.current=!1;
  n(v=>v[which]===held&&v.expressionMode===mode.current?v:{...v,[which]:held,expressionMode:mode.current});
 },[]);
 const setSwell=P.useCallback(held=>updateExpressionHold('swell',held),[updateExpressionHold]);
 const setDamp=P.useCallback(held=>updateExpressionHold('damp',held),[updateExpressionHold]);
 const setOctave=P.useCallback(held=>{octave.current=held;n(v=>v.octave===held?v:{...v,octave:held})},[]);
 const setEnter=P.useCallback(held=>{enter.current=held},[]);
 const reset=P.useCallback(()=>{swellHeld.current=!1;dampHeld.current=!1;comboConsumed.current=!1;expression.current=0;__XenPan.setKeyboardExpression(1);octave.current=!1;sustain.current=!1;enter.current=!1;n({octave:!1,sustain:!1,swell:!1,damp:!1,expressionMode:mode.current})},[]);
 P.useEffect(()=>{
  if(!e){swellHeld.current=!1;dampHeld.current=!1;comboConsumed.current=!1;expression.current=0;__XenPan.setKeyboardExpression(1);return}
  // The physical chord does not produce a volume gesture, and a latched knob
  // at rest requires no RAF work at all.
  if((comboConsumed.current||(!t.swell&&!t.damp))&&(mode.current==='knob'||Math.abs(expression.current)<.001)){
   if(mode.current==='pedal'&&Math.abs(expression.current)<.001)expression.current=0;
   __XenPan.setKeyboardExpression(1+expression.current);return;
  }
  let frame=0,last=0;
  const tick=now=>{
   const dt=last?Math.min(48,Math.max(0,now-last)):16.667;last=now;
   const direction=comboConsumed.current?0:(swellHeld.current?1:0)-(dampHeld.current?1:0);
   if(direction){
    expression.current=Math.max(-.26,Math.min(1,expression.current+direction*dt*(mode.current==='pedal'? .00065:.00155)));
   }else if(mode.current==='pedal'){
    const next=expression.current*Math.exp(-dt/220);
    expression.current=Math.abs(next)<.001?0:next;
   }
   __XenPan.setKeyboardExpression(1+expression.current);
   if(direction||(mode.current==='pedal'&&expression.current!==0))frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>{if(frame)cancelAnimationFrame(frame)};
 },[e,t.swell,t.damp,t.expressionMode]);
 P.useEffect(()=>{
  if(!e)return;
  const cancel=()=>{setSwell(!1);setDamp(!1)};
  const onVisibility=()=>{if(document.hidden)cancel()};
  window.addEventListener('blur',cancel);
  document.addEventListener('visibilitychange',onVisibility);
  return()=>{window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',onVisibility)};
 },[e,setSwell,setDamp]);
 return{resonanceActionBadges:t,waveSoundSwellHeldRef:swellHeld,waveSoundSwellRef:expression,
 waveStartOctaveHoldRef:octave,longToneHoldRef:sustain,enterHoldRef:enter,
 setSustainHoldActive:setSustain,setSwellHoldActive:setSwell,setDampHoldActive:setDamp,
 setOctaveHoldActive:setOctave,setEnterHoldActive:setEnter,resetResonanceActionHolds:reset}
}function ePe(e){const[t,n]=P.useState(!1),r=P.useCallback(()=>{n(Qp(document.activeElement))},[]);return P.useEffect(()=>{if(!e){n(!1);return}return r(),window.addEventListener("focusin",r),window.addEventListener("focusout",r),window.addEventListener("pointerdown",r),()=>{window.removeEventListener("focusin",r),window.removeEventListener("focusout",r),window.removeEventListener("pointerdown",r)}},[r,e]),t}function tPe({room:e,nexusActive:t}){const n=P.useRef({left:!1,right:!1,shoot:!1}),r=e==="RESONANCE"&&t,a=e==="GAME",o=ePe(r),i=Zke(r);return{keyRef:n,gameInputActive:a,resonanceInputActive:r,resonanceInputIndicator:o,...i}}const nPe=e=>({probeKind:"app-resonance-arrow-motion-raf-callsite-source-probe",callsiteOwnerStillApp:!0,rafLoopStillInlineInApp:!0,requestAnimationFrameOwnerStillApp:!0,cancelAnimationFrameOwnerStillApp:!0,cursorCommitOwnerStillApp:!0,runtimeOwned:!1,audioOwned:!1,schedulingOwned:!1,...e}),rPe=e=>nPe({effectGate:{resonanceInputActive:e.resonanceInputActive,sourceOwnerStillApp:!0},closureDependencies:{resonanceInputActive:e.resonanceInputActive,myzelEnabled:e.myzelEnabled,bassRootMode:e.bassRootMode},runtimeRefs:{nexusParamsRef:e.nexusParamsRef,nexusArrowRef:e.nexusArrowRef,nexusRefs:e.nexusRefs,focusCursorLastInputRef:e.focusCursorLastInputRef},frameBounds:{gameWidth:e.gameWidth},provenance:{arrowInputSource:"arrow"},actions:{clampValue:e.clampValue,commitCursorY:e.commitCursorY}}),aPe=e=>{const{nexusParamsRef:t,nexusArrowRef:n,nexusRefs:r,focusCursorLastInputRef:a}=e.runtimeRefs,o=t.current.cursorSpeed;if(n.current.left||n.current.right||n.current.up||n.current.down)__cancelResonancePointerMotion(r);let i=!1,s=!1;n.current.left&&(r.current.cursorX-=o,i=!0),n.current.right&&(r.current.cursorX+=o,i=!0),__xenLiveGridParams(t.current).lockCursorToGrid||(n.current.up&&(r.current.cursorY-=o,s=!0),n.current.down&&(r.current.cursorY+=o,s=!0)),i&&(r.current.cursorX=e.actions.clampValue(r.current.cursorX,0,e.frameBounds.gameWidth)),(i||s)&&(a.current=e.provenance.arrowInputSource),s&&e.actions.commitCursorY(r.current.cursorY,{syncHud:!0,primeSource:"resonance"})},oPe=e=>{P.useEffect(()=>{const t=rPe(e);if(!t.effectGate.resonanceInputActive)return;let n=0;const r=()=>{aPe(t),n=requestAnimationFrame(r)};return n=requestAnimationFrame(r),()=>cancelAnimationFrame(n)},[e.resonanceInputActive,e.myzelEnabled,e.bassRootMode])};function iPe(e){return e.code==="Backquote"&&!e.ctrlKey&&!e.metaKey&&!e.altKey}function sPe(e){const{key:t,hotkeyMode:n,recentLoopHotkeyEntries:r,selectLoopDirect:a,toggleLoopDirect:o,browseLoopWithUmlaut:i}=e;if(n==="particle-classic")return!1;const s=kT.indexOf(t);return s!==-1&&s<r.length?(a(r[s].id,"hotkey"),!0):t==="#"||t==="'"?(o(),!0):t==="ö"||t==="ä"?(i(t),!0):!1}function lPe(e){return e.resonanceHotkeyMode}function cPe(e){const{event:t,currentMode:n,updateNParams:r,preventDefault:a}=e;return iPe(t)?(r({resonanceHotkeyMode:n==="root-follow"?"material":"root-follow"}),a(),!0):!1}function uPe(e){const{key:t,currentMode:n,recentLoopHotkeyEntries:r,recentRootFollowHotkeyEntries:a,selectMaterialLoopDirect:o,selectRootFollowLoopDirect:i,toggleMaterialLoopDirect:s,toggleRootFollowLoopDirect:l,browseMaterialLoopWithUmlaut:c,browseRootFollowLoopWithUmlaut:d,preventDefault:p}=e,f=n==="root-follow";return sPe({key:t,hotkeyMode:n,recentLoopHotkeyEntries:f?a:r,selectLoopDirect:g=>{if(f)i(g);else o(g,"hotkey");if(typeof __XenQuick!=="undefined")__XenQuick.pulseEntry(f?"rootFollow":"material",g)},toggleLoopDirect:f?l:s,browseLoopWithUmlaut:f?d:c})?(p(),!0):!1}function dPe(e){const{event:t,key:n,runWithAudio:r,triggerDirectedPulse:a,previewKeyboardWindowShift:o}=e;if(Yz(n)){const i=uJ(n);return i&&r(()=>a(i)),!0}if(dJ(t.code)){const i=mJ(t.code);return i!==null&&r(()=>o(i)),!0}return!1}function mPe(e){const{event:t,key:n,params:r,exportedDrumConfigs:a,updateNParams:o,toggleNexusAgent:i,runWithAudio:s,preventDefault:l}=e,c=Eoe(t);if(c!==null){const p=Ace({drumPatterns:sw,exportedDrumConfigs:a,drumConfigMode:r.drumConfigMode,drumPattern:r.drumPattern,drumConfigId:r.drumConfigId,direction:c});return p&&o(p),l(),!0}const d=ej.indexOf(n);return d!==-1&&d<r.agentEnabled.length?(l(),s(()=>i(d,{pingOnEnable:!0}),{agentIndex:d,command:"nexus-agent-toggle"}),!0):!1}function pPe(e){const{event:t,params:n,runWithAudio:r,changeGridTuning:a,setGridMode:o,resetKeyboardWindow:i}=e;if(pJ(t.key))return r(()=>{a(C5(n.gridTuning,-1))}),!0;if(hJ(t.key))return r(()=>{a(C5(n.gridTuning,1))}),!0;if(!fJ(t))return!1;const s=Ka(n.gridTuning),l=s.findIndex(c=>c.value===n.gridMode);return l!==-1&&r(()=>{const c=gJ(t),d=(l+c+s.length)%s.length,p=s[d].value;o(p),i()}),!0}function hPe(e,t,n){const r=Ka(e),a=r.findIndex(i=>i.value===t);if(a===-1)return null;const o=(a+n+r.length)%r.length;return r[o]?.value??null}function fPe(e){const{event:t,params:n,setChurchMode:r,cycleParticleSystem:a,preventDefault:o}=e,i=t.key;if(i==="m"||i==="n"){const s=hPe(n.particleSystem,n.churchMode,i==="n"?1:-1);return s&&r(s),o(),!0}return i==="-"||i==="_"?(a(i==="_"?-1:1),o(),!0):!1}function gPe({params:e,pitchIdx:t,keyboardWindowOffset:n}){e=__xenLiveGridParams(e);const r=wF(e.gridBase,e.gridTuning,n,t,e.manualGridMutedSteps,e.manualGridStepOffsets);return r===null||!Number.isFinite(r)||r<55?{kind:"muted-keyboard-wsb-position",pitchIdx:t}:{kind:"keyboard-wsb-position",pitchIdx:t,targetHz:r,targetY:Zs(r)}}function bPe(e){const{event:t,keyboardMirrorActive:n,keyboardWindowOffset:r,params:a,pitchLaneState:o,nowMs:i,rootFollowLoopActive:s,preventDefault:l,ensureKeyboardPitchAudioReadyOnce:c,recordAdaptiveAction:d,commitCursorY:p,shouldEmitKeyboardHoldWavePreview:f,resolveKeyboardWaveStarterSoundPreset:b}=e,g=AJ(t,HJ,VJ);if(g<0)return!1;l();const y=n?yJ(g,iw.length):g;if(gPe({params:a,pitchIdx:y,keyboardWindowOffset:r}).kind==="muted-keyboard-wsb-position")return!0;
 // P7.4: OS key-repeat of the SAME held note is not a new root gesture.
 // Do not steal the latest pending pointer update from mouse navigation.
 const A=i1e({state:o,params:a,pitchIdx:y,keyboardWindowOffset:r,nowMs:i,isRepeat:t.repeat});if(A.kind==="muted-pitch")return!0;
 if(t.repeat&&o.lastPitchIdx===y)return d("keyboard-input-hold-repeat-coalesced"),p(A.targetY,{keyboardHoldRepeat:true,keyboardFoundationGesture:true,previewWave:!1,syncHud:!1,syncRootFollowInput:!1}),!0;if(A.kind==="continuous-gliss-target"&&t.repeat)return d("keyboard-input-gliss-coalesced"),d("keyboard-input-wave-preview-suppressed"),p(A.targetY,{keyboardFoundationGesture:true,previewWave:!1,syncHud:!0,syncRootFollowInput:s}),!0;const M=c(),v=f?.(t,{targetY:A.targetY,targetHz:A.targetHz})??!0;v||d("keyboard-input-hold-repeat-coalesced");const w=M&&v&&!t.repeat,preset=b?.();return w||d("keyboard-input-wave-preview-suppressed"),p(A.targetY,{keyboardFoundationGesture:true,previewWave:w,syncHud:!0,syncRootFollowInput:s,waveStarterOptions:{requestedAtMs:t.timeStamp,keyboardGestureSource:"keyboard-direct",...b?{waveStarterPresetOverride:preset,entrophonWaveActive:preset==="entrophon"||(typeof preset==="string"&&preset.startsWith("entrophon:"))}:{}}}),!0}function yPe({event:e,params:t,arrowState:n,cursorY:r,preventDefault:a,commitCursorY:o}){t=__xenLiveGridParams(t);if(e.key==="ArrowLeft"||e.key==="ArrowRight")return XI(n,e.key,!0),a(),!0;if(e.key!=="ArrowUp"&&e.key!=="ArrowDown")return!1;if(a(),t.lockCursorToGrid){if(e.repeat)return!0;const i=e.key==="ArrowUp"?1:-1,s=uZ(r,i,t.gridBase,t.gridTuning,t.manualGridMutedSteps,t.manualGridStepOffsets);return s!==r&&o(s),!0}return XI(n,e.key,!0),!0}function SPe(e,t,n){return Yw(e)&&e.repeat?(e.preventDefault(),n?.("keyboard-input-hold-repeat-coalesced"),!0):Xxe(e,t)}function vPe({event:e,arrowState:t,holdActions:n}){return $q(e)?!1:(XI(t,e.key,!1),Yxe(e,n),!0)}function APe({runtime:e,actions:t}){const{event:n,managedLoopMaterial:r,params:a,arrowState:o,cursorY:i,keyboardMirrorActive:s,keyboardWindowOffset:l,pitchLaneState:c,exportedDrumConfigs:d,recentLoopHotkeyEntries:p,recentRootFollowHotkeyEntries:f,rootFollowLoopActive:b}=e,{holdActions:g,ensureAudioReady:y,reportAudioReadyFailure:x,ensureKeyboardPitchAudioReadyOnce:A,cycleQuantizeGrid:M,runEnterWaveGesture:v,updateNParams:w,toggleKeyboardMirror:R,triggerDirectedPulse:k,previewKeyboardWindowShift:I,changeGridTuning:E,setGridMode:F,resetKeyboardWindow:L,setChurchMode:B,cycleParticleSystem:O,selectMaterialLoopDirect:T,selectRootFollowLoopDirect:_,toggleMaterialLoopDirect:G,toggleRootFollowLoopDirect:j,browseMaterialLoopWithUmlaut:N,browseRootFollowLoopWithUmlaut:W,toggleNexusAgent:V,nowMs:U,recordAdaptiveAction:H,commitCursorY:q}=t;if(Kxe(n,r))return{handled:!1,route:"ignored"};const K=n.key.toLowerCase(),Y=()=>n.preventDefault(),J=(te,X={})=>{$xe({event:n,key:K,ensureAudioReady:y,command:te,failureContext:X,reportFailure:x})};if(yPe({event:n,params:a,arrowState:o,cursorY:i,preventDefault:Y,commitCursorY:te=>q(te,{previewWave:!0})}))return{handled:!0,route:"arrow-keydown"};if(SPe(n,g,H))return{handled:!0,route:"momentary-hold-keydown"};if(n.code==="Tab"&&a.quantizeOn)return Y(),M(),{handled:!0,route:"quantize-grid-cycle"};if(n.key==="Enter")return g.setEnterHoldActive(!0),J(()=>v({isRepeat:n.repeat})),{handled:!0,route:"enter-wave-hotkey"};const Z=lPe(a);if(cPe({event:n,currentMode:Z,updateNParams:w,preventDefault:Y}))return{handled:!0,route:"hotkey-mode-toggle"};if(!n.repeat&&(K==="-"||K==="_")&&fPe({event:n,params:a,setChurchMode:B,cycleParticleSystem:O,preventDefault:Y}))return{handled:!0,route:"particle-system-hotkey"};if(dPe({event:n,key:K,runWithAudio:J,triggerDirectedPulse:k,previewKeyboardWindowShift:I}))return{handled:!0,route:"auxiliary-hotkey"};if(pPe({event:n,params:a,runWithAudio:J,changeGridTuning:E,setGridMode:F,resetKeyboardWindow:L}))return{handled:!0,route:"grid-hotkey"};if(!n.repeat){if(fPe({event:n,params:a,setChurchMode:B,cycleParticleSystem:O,preventDefault:Y}))return{handled:!0,route:"particle-system-hotkey"};if(uPe({key:K,currentMode:Z,recentLoopHotkeyEntries:p,recentRootFollowHotkeyEntries:f,selectMaterialLoopDirect:T,selectRootFollowLoopDirect:_,toggleMaterialLoopDirect:G,toggleRootFollowLoopDirect:j,browseMaterialLoopWithUmlaut:N,browseRootFollowLoopWithUmlaut:W,preventDefault:Y}))return{handled:!0,route:"loop-hotkey-mode"};if(mPe({event:n,key:K,params:a,exportedDrumConfigs:d,updateNParams:w,toggleNexusAgent:V,runWithAudio:J,preventDefault:Y}))return{handled:!0,route:"non-repeat-auxiliary-hotkey"}}return bPe({event:n,keyboardMirrorActive:s,keyboardWindowOffset:l,params:a,pitchLaneState:c,nowMs:U(),rootFollowLoopActive:b,preventDefault:Y,ensureKeyboardPitchAudioReadyOnce:A,recordAdaptiveAction:H,commitCursorY:q,shouldEmitKeyboardHoldWavePreview:t.shouldEmitKeyboardHoldWavePreview,resolveKeyboardWaveStarterSoundPreset:t.resolveKeyboardWaveStarterSoundPreset})?{handled:!0,route:"keyboard-pitch-command"}:{handled:!1,route:"unhandled"}}function xPe({runtime:e,actions:t}){const{event:n,arrowState:r}=e,{holdActions:a}=t;return vPe({event:n,arrowState:r,holdActions:a})?{handled:!0,route:"arrow-hold-release"}:{handled:!1,route:"ignored"}}function MPe(e){P.useEffect(()=>{if(!e.resonanceInputActive){__xenKeyboardFoundationDetach.resume();return;}const t={holdActions:{setSustainHoldActive:e.actions.setSustainHoldActive,setSwellHoldActive:e.actions.setSwellHoldActive,setDampHoldActive:e.actions.setDampHoldActive,
 setKeyboardFoundationDetached:on=>on?__xenKeyboardFoundationDetach.press((Number.isFinite(e.rootFollowInputTargetHzRef.current)&&e.rootFollowInputTargetHzRef.current>0?e.rootFollowInputTargetHzRef.current:e.actions.freqFromY(e.nexusRefs.current.cursorY)),e.nexusRefs.current.cursorY):__xenKeyboardFoundationDetach.release(),
 setOctaveHoldActive:e.actions.setOctaveHoldActive,setEnterHoldActive:e.actions.setEnterHoldActive},ensureAudioReady:e.actions.ensureAudioReady,reportAudioReadyFailure:e.actions.reportAudioReadyFailure,ensureKeyboardPitchAudioReadyOnce:e.actions.ensureKeyboardPitchAudioReadyOnce,cycleQuantizeGrid:e.actions.cycleQuantizeGrid,runEnterWaveGesture:e.actions.runEnterWaveGesture,updateNParams:e.actions.updateNParams,toggleKeyboardMirror:()=>{e.keyboardMirrorRef.current=!e.keyboardMirrorRef.current},triggerDirectedPulse:e.actions.triggerDirectedPulse,previewKeyboardWindowShift:e.actions.previewKeyboardWindowShift,changeGridTuning:e.actions.changeGridTuning,setGridMode:e.actions.setGridMode,resetKeyboardWindow:()=>{e.keyboardWindowOffsetRef.current=0,e.actions.setKeyboardWindowStamp(i=>i+1)},setChurchMode:e.actions.setChurchMode,cycleParticleSystem:e.actions.cycleParticleSystem,selectMaterialLoopDirect:e.actions.selectMaterialLoopDirect,selectRootFollowLoopDirect:e.actions.selectRootFollowLoopDirect,toggleMaterialLoopDirect:e.actions.toggleMaterialLoopDirect,toggleRootFollowLoopDirect:e.actions.toggleRootFollowLoopDirect,browseMaterialLoopWithUmlaut:e.actions.browseMaterialLoopWithUmlaut,browseRootFollowLoopWithUmlaut:e.actions.browseRootFollowLoopWithUmlaut,toggleNexusAgent:e.actions.toggleNexusAgent,nowMs:()=>performance.now(),setRootFollowInputTargetHz:i=>{e.rootFollowInputTargetHzRef.current=i},getAudioPressureBias:e.actions.getAudioPressureBias,getActiveScheduledToneCount:e.actions.getActiveScheduledToneCount,recordAdaptiveAction:e.actions.recordAdaptiveAction,commitCursorY:e.actions.commitCursorY,shouldEmitKeyboardHoldWavePreview:e.actions.shouldEmitKeyboardHoldWavePreview,resolveKeyboardWaveStarterSoundPreset:e.actions.resolveKeyboardWaveStarterSoundPreset};let n=null,r=null;const a=i=>{n===null?(n={event:i,managedLoopMaterial:e.managedLoopMaterial,params:e.paramsRef.current,arrowState:e.arrowStateRef.current,cursorY:e.nexusRefs.current.cursorY,keyboardMirrorActive:e.keyboardMirrorRef.current,keyboardWindowOffset:e.keyboardWindowOffsetRef.current,pitchLaneState:e.pitchLaneStateRef.current,exportedDrumConfigs:e.exportedDrumConfigs,recentLoopHotkeyEntries:e.recentLoopHotkeyEntries,recentRootFollowHotkeyEntries:e.recentRootFollowHotkeyEntries,rootFollowLoopActive:e.rootFollowLoopActive===!0},r={runtime:n,actions:t}):(n.event=i,n.params=e.paramsRef.current,n.arrowState=e.arrowStateRef.current,n.cursorY=e.nexusRefs.current.cursorY,n.keyboardMirrorActive=e.keyboardMirrorRef.current,n.keyboardWindowOffset=e.keyboardWindowOffsetRef.current,n.pitchLaneState=e.pitchLaneStateRef.current),APe(r)},o=i=>{e.actions.releaseWaveStarterHoldGestureForKey?.(i),xPe({runtime:{event:i,arrowState:e.arrowStateRef.current},actions:{holdActions:{setSustainHoldActive:e.actions.setSustainHoldActive,setSwellHoldActive:e.actions.setSwellHoldActive,setDampHoldActive:e.actions.setDampHoldActive,
 setKeyboardFoundationDetached:on=>on?__xenKeyboardFoundationDetach.press((Number.isFinite(e.rootFollowInputTargetHzRef.current)&&e.rootFollowInputTargetHzRef.current>0?e.rootFollowInputTargetHzRef.current:e.actions.freqFromY(e.nexusRefs.current.cursorY)),e.nexusRefs.current.cursorY):__xenKeyboardFoundationDetach.release(),
 setOctaveHoldActive:e.actions.setOctaveHoldActive,setEnterHoldActive:e.actions.setEnterHoldActive,releaseHeldScheduledTones:e.actions.releaseHeldScheduledTones}}})};return window.addEventListener("keydown",a),window.addEventListener("keyup",o),()=>{window.removeEventListener("keydown",a),window.removeEventListener("keyup",o);__xenKeyboardFoundationDetach.resume()}},[e.resonanceInputActive,e.audioCtx,e.myzelEnabled,e.managedLoopMaterial,e.exportedDrumConfigs,e.recentLoopHotkeyEntries,e.recentRootFollowHotkeyEntries,e.rootFollowLoopActive])}const wPe=["kick","snare","hatClosed","hatOpen","clap","perc"];function RPe(e,t){const n=Math.max(1,e.bars||1);return{presetSource:e.presetSource,globalKit:e.drumKit,bars:n,segmentsPerBar:e.segmentsPerBar,segmentMarkers:e.segmentMarkers,stepCount:e.stepCount,laneOrder:e.laneOrder?.length?e.laneOrder:[...wPe],laneSteps:e.laneSteps,laneKitOverrides:e.laneKitOverrides,laneSettings:e.laneSettings??t,stepPrograms:e.stepPrograms}}function CPe(e=jT){const t=new WeakMap;let n=0,r=0;return{resolve:(i,s)=>{const l=t.get(i);if(l&&l.laneSettings===s)return n+=1,l.program;r+=1;const c=e(RPe(i,s));return t.set(i,{laneSettings:s,program:c}),c},stats:()=>({hits:n,misses:r})}}const kPe=CPe(),Rp=(e,t,n)=>Math.min(n,Math.max(t,e));function PPe(e){const t=OT({laneId:e.laneId,laneSettings:e.laneSettings});return{...e.drumStyle,edge:e.laneId==="hatClosed"||e.laneId==="hatOpen"?Math.max(e.drumStyle.edge,.58):e.drumStyle.edge,air:e.laneId==="hatOpen"||e.laneId==="clap"?Math.max(e.drumStyle.air,.54):e.drumStyle.air,snap:(e.value??0)>=.95?Math.max(e.drumStyle.snap,.68):e.drumStyle.snap,softness:e.laneId==="kick"?Math.min(e.drumStyle.softness,.42):e.drumStyle.softness,pan:t.pan,decayScale:t.decay*(e.drumStyle.decayScale??1),chokeGroup:t.chokeGroup}}function IPe(e){if(e.bassRootMode==="fixed")return e.bassRootHz;
 const heldRoot=__xenKeyboardFoundationDetach.rootHz();
 let t=heldRoot??e.freqFromY(e.cursorY);
 for(;t>80;)t/=2;return t}function Q9(e){return{edge:Rp(e.drumEdge??Kn.edge,0,1),softness:Rp(e.drumSoftness??Kn.softness,0,1),air:Rp(e.drumAir??Kn.air,0,1),snap:Rp(e.drumSnap??Kn.snap,0,1),swing:Rp(e.grooveSwing??Kn.swing,0,1),pan:Kn.pan,decayScale:__f48RackParams.drumDecay,chokeGroup:Kn.chokeGroup}}function EPe(e){const{drumMachine:t,pattern:n,step:r,time:a,drumLevel:o,kit:i,drumStyle:s,laneKitOverrides:l}=e,c=(n.swing-.5)*.032,d=r%2===1?c:-c*.3,p=Math.max(0,a+d),f=n.kick[r],b=n.snare[r],g=n.hat[r];if(f?.active&&t.trigger("kick",p,o*(.72+(f.accent??.6)*.55),C0({laneId:"kick",globalKit:i,overrides:l}),s),b?.active){const y=(b.accent??.6)>.78?"snare":"clap",x=y==="snare"?"snare":"clap";t.trigger(y,p,o*(.42+(b.accent??.6)*.5),C0({laneId:x,globalKit:i,overrides:l}),s)}if(g?.active){const y=(g.accent??.4)>.62&&r%4===3?"hat_open":"hat_closed";t.trigger(y,p,o*(.2+(g.accent??.4)*.34),C0({laneId:y==="hat_open"?"hatOpen":"hatClosed",globalKit:i,overrides:l}),s)}}/* F3.56.53: repeatable per-step chance, cheap on audio scheduler path.
   Live patterns may vary by musical round; exported offline preview renders round 0. */
function __f53StepAllowed(chance,lane,index,round=0){
 if(chance>=1)return true;if(chance<=0)return false;
 let h=(Math.imul((index|0)+1,2654435761)^Math.imul((round|0)+1,2246822519))>>>0;
 for(let i=0;i<lane.length;i++)h=Math.imul(h^lane.charCodeAt(i),16777619)>>>0;
 h^=h>>>15;h=Math.imul(h,2246822519)>>>0;h^=h>>>13;
 return (h>>>0)/4294967296<chance;
}
function FPe(e){const{drumMachine:t,entry:n,stepIndex:r,time:a,stepDurationSec:o,drumLevel:i,drumStyle:s,runtimeGlobalKit:l,laneKitOverrides:c,laneSettings:d}=e;if(!n)return;const p=Math.max(1,n.bars||1),f=Math.max(1,p*16),b=(r%f+f)%f,g=b/f,y=(b+1)/f,x=a-b*o,A=o*f,M=kPe.resolve(n,d);rfe(M,{windowStartRatio:g,windowEndRatio:y},v=>{
 if(!__f53StepAllowed(v.probability,v.laneId,v.stepIndex,Math.floor(r/f)))return;
 const w=i*(v.laneSettings?.level??1)*Math.max(0,Math.min(1.25,v.value)),R=x+v.startRatio*A;
 if(__f52SampleLanes.includes(v.laneId)){
  const slot=n.sampleSlots?.[v.laneId];if(!slot?.id)return;
  const layer=v.layers?.[0];t.triggerSample?.(slot.id,R,w*Math.max(0,Math.min(2,slot.volume??1))*.55* (layer?.levelScale??1),{
    pan:(slot.pan||0)+(layer?.panOffset||0),decayLock:v.decayLock,toneLock:v.toneLock});return;
 }
 const k=v.laneId==="hatClosed"?"hat_closed":v.laneId==="hatOpen"?"hat_open":v.laneId;(v.layers.length?v.layers:[{id:"primary",active:!0,levelScale:1,decayScale:1,panOffset:0,gradient:0}]).forEach(E=>{if(!E.active)return;const F=PPe({laneId:v.laneId,drumStyle:s,laneSettings:M.laneSettings,value:v.value});t.trigger(k,R,w*E.levelScale,C0({laneId:v.laneId,globalKit:l,overrides:c}),{...F,pan:Math.max(-1,Math.min(1,F.pan+E.panOffset)),decayScale:F.decayScale*E.decayScale*v.decayLock,snap:Math.max(0,Math.min(1,(F.snap+E.gradient*.08)*v.toneLock)),air:Math.max(0,Math.min(1,(F.air+Math.max(0,E.gradient)*.06)*v.toneLock)),edge:Math.max(0,Math.min(1,(F.edge+Math.max(0,-E.gradient)*.06)*v.toneLock)),softness:Math.min(1,F.softness+(1-v.toneLock)*.55)})})})}function TPe(e){const{pattern:t,step:n,time:r,bassLevel:a,quantizeBpm:o,rootHz:i,playBassNote:s}=e,l=(t.swing-.5)*.032,c=n%2===1?l:-l*.3,d=Math.max(0,r+c),p=t.bass[n];if(p?.active){const f=60/Math.max(40,o)/4*(.66+t.noteLength),b=p.tie?f*1.55:f,g=i*p.ratio*Math.pow(2,p.octave);s(d,g,a,b,p.accent??.7,{glideToNext:p.glideToNext,ghost:(p.accent??.7)<.45})}}function LPe(e){return{classicOffbeat:.04,rolling:.36,gallop:.62,tripletGhost:.72,darkForest:.9}[e]}function BPe(e){return{barIndex:e.barIndex,seed:e.seed,rootHz:e.rootHz,stepCount:16,baseSwing:.02+e.swing*.08,styleMorph:LPe(e.style),density:Rp(.68+e.bassGrit*.16+e.pressure*.1,0,1),descriptors:e.descriptors,pitchMode:e.pitchMode,tuningId:e.tuningId}}function DPe(e){const{pattern:t,step:n,time:r,bassLevel:a,quantizeBpm:o,playBassNote:i}=e,s=t.swing*.028,l=n%2===1?s:-s*.18,c=Math.max(0,r+l),d=t.steps[n%t.steps.length];if(!d?.active)return;const p=t.rootHz*(d.pitchRatio??Math.pow(2,(d.semitone+d.octave*12)/12)),b=60/Math.max(40,o)/4*Rp(.22+d.length*1.25,.12,1.7);i(c,p,a*(d.ghost?.64:1),b,d.accent,{glideToNext:d.glideToNext,ghost:d.ghost})}const NPe=new ML(64,e=>{const n=new Float32Array(1024),r=.65+e*2.6;for(let a=0;a<1024;a+=1){const o=a/1023*2-1;n[a]=Math.tanh(o*r)}return n}),OPe=e=>{
 const ctx=e.audioCtx;
 return {playBassNote:(time,hz,level,duration,accent=.72,options)=>{
  if(!Number.isFinite(time)||!Number.isFinite(hz)||hz<=0||!Number.isFinite(level)||level<=1e-5||ctx.state==='closed')return null;
  hz=__XenBassGrid.quantize(hz);if(!(hz>0))return null;const params=e.nexusParamsRef.current,tone=Me(params.bassTone??.48,0,1),grit=Me(params.bassGrit??.18,0,1),ghost=!!options?.ghost;
  const key=Object.hasOwn(__f48BassVoices,params.bassVoice)?params.bassVoice:'classic',voice=__f48BassVoices[key],classic=key==='classic';
  const length=Me(duration*(params.bassDecay??1),.025,8),at=Math.max(time,ctx.currentTime),nodes=[],sources=[];
  const own=node=>(nodes.push(node),node),mix=own(ctx.createGain()),filter=own(ctx.createBiquadFilter()),output=own(ctx.createGain());
  let shaper=null;
  if(classic||grit>.001){shaper=own(ctx.createWaveShaper());shaper.curve=NPe.get(grit);mix.connect(shaper);shaper.connect(filter)}else mix.connect(filter);
  filter.connect(output);output.connect(__XenPan.route(ctx,"bass",e.ensureFinalMixBus(ctx)));
  if(e.enterHoldPsyFxEnabled&&e.enterHoldRef.current){e.ensureEnterHoldPsyFxDevice(ctx);const send=e.enterHoldPsyFxSendsRef.current.bass;if(send)output.connect(__XenPan.route(ctx,"bass",send))}
  const oscillator=(type,frequency,weight=1)=>{
   const source=own(ctx.createOscillator());sources.push(source);source.type=type;source.frequency.setValueAtTime(frequency,at);
   if(weight===1)source.connect(mix);else {const gain=own(ctx.createGain());gain.gain.value=weight;source.connect(gain);gain.connect(mix)}
   return source;
  };
  const a=oscillator(classic?(grit>.56?'square':'sawtooth'):voice.wave,hz);
  const b=voice.second?oscillator(ghost?'sine':voice.second,hz*(classic&&ghost?1.0015:voice.detune)):null;
  const sub=Me(params.bassSub??1,0,1.5)*voice.sub;
  if(sub>.001)oscillator('sine',hz/2,sub);
  mix.gain.value=((ghost?.46:.7)+grit*.16)*voice.gain;
  filter.type='lowpass';
  const envelope=Me(params.bassEnvelope??1,0,2),low=Me(hz*(.95+tone*1.4)*voice.color,80,2200),high=Me(hz*(1.8+tone*3.8)*(.9+accent*.25)*voice.color,120,4200);
  filter.frequency.setValueAtTime(Me(low+(high-low)*envelope,80,7000),at);filter.frequency.exponentialRampToValueAtTime(low,at+length*.58);
  filter.Q.setValueAtTime((ghost?.35:.55)+grit*1.1+accent*.22+Me(params.bassResonance??0,0,1)*4,at);
  if(options?.glideToNext){const end=Math.min(at+length*.42,at+.08);a.frequency.exponentialRampToValueAtTime(hz*1.122,end);b?.frequency.exponentialRampToValueAtTime(hz*voice.detune*1.118/1.004,end)}
  output.gain.setValueAtTime(Math.max(1e-4,level*(ghost?.42:.72+accent*.5)),at);
  output.gain.setTargetAtTime(1e-4,at+length*.76,(ghost?.016:.024)+(1-tone)*.02);
  let ended=0,released=false;
  const release=()=>{if(released)return;released=true;for(const node of nodes)try{node.disconnect()}catch{}};
  for(const source of sources){source.onended=()=>{if(++ended===sources.length)setTimeout(release,120)};source.start(at);source.stop(at+length)}
  return {startTime:at,cancel(){if(at<ctx.currentTime+.015)return false;output.gain.cancelScheduledValues(ctx.currentTime);output.gain.setValueAtTime(0,ctx.currentTime);for(const source of sources)try{source.stop(ctx.currentTime)}catch{}release();return true},nodeCount:nodes.length};
 },stableRhythmLaneBassNoteActionExtractedFromAppTsx:true,audioBodyNowActionProbeOwned:true,finalMixBusStillAppSupplied:true,enterHoldFxDeviceStillAppSupplied:true,schedulerStillLoopProbeOwned:true,transportStillAppNexusRefOwned:true};
},_Pe=e=>({applyMyzelLayerStep:(n,r)=>{const a=e.nexusRefs.current;if(!e.myzelEnabled||e.myzelTopologyModeRef.current==="installation"){a.myzelMasterGain&&a.myzelMasterGain.gain.setTargetAtTime(1e-4,n,.05);return}const o=e.resolveBaseHz();e.ensureMyzelSynth(e.audioCtx);const i=e.myceliumSnapshotRef.current,s=Me(i.constellationFlux??0,0,1);(r%Math.max(1,e.myzelStep16ths)===0||s>.04)&&(e.myzelLayerModRef.current=ET(i,e.intensityGlobal,o,e.myzelBallMode,e.myzelNodeMode));const c=e.myzelLayerModRef.current,d=PJ(e.myzelPattern,r),p=Me(e.myzelInterpreterMix.weaveBlend,0,1),f=Me(e.myzelInterpreterMix.constellationBlend,0,1),b=e.myceliumSnapshotRef.current,g=Me(((b.constellationFlux??0)*.55+(b.constellationTension??0)*.2)*(.25+f*.95),0,.78),y=Math.max(d,g);e.myzelGateRef.current=y;const x=xpe(e.readActiveDroneOvertoneMix()),A=c.overtoneRatios.map((v,w)=>{const R=x[w]?.ratio,k=R?(.22+y*.34)*p:0;return R?v+(R-v)*k:v}),M=Me(c.lowpassHz*(.94+((x[0]?.amount??0)*.22+c.shimmer*.8)*p+(b.constellationBrightness??.5)*.12*f),220,3400);a.myzelCarrierOsc?.frequency.setTargetAtTime(c.baseHz,n,.08),a.myzelSubOsc?.frequency.setTargetAtTime(c.baseHz/2,n,.08),a.myzelCarrierGain?.gain.setTargetAtTime(c.carrierGain*(.55+y*.45+p*.08),n,.07),a.myzelSubGain?.gain.setTargetAtTime(c.subGain*(.45+y*.55),n,.07),a.myzelBodyGain?.gain.setTargetAtTime(c.bodyGain*(.68+y*.28+p*.12),n,.08),a.myzelLowpass?.frequency.setTargetAtTime(M,n,.12),a.myzelPan?.pan.setTargetAtTime(c.pan,n,.1),a.myzelMasterGain?.gain.setTargetAtTime(Math.max(1e-4,c.masterGain*y*(.94+p*.12+f*.16)),n,.09),a.myzelFormantFilters.forEach((v,w)=>{const R=.94+(x[w]?.amount??0)*.18*p;v.frequency.setTargetAtTime((c.formantCenters[w]??c.formantCenters[0])*R,n,.11),v.Q.setTargetAtTime(c.formantQ,n,.12)}),a.myzelFormantGains.forEach((v,w)=>{const R=.88+(x[w]?.amount??0)*.45*p;v.gain.setTargetAtTime(Math.max(1e-4,(c.formantGains[w]??1e-4)*R),n,.09)}),a.myzelOvertoneOscs.forEach((v,w)=>{v.frequency.setTargetAtTime(c.baseHz*(A[w]??c.overtoneRatios[w]??1.5),n,.1)}),a.myzelOvertoneGains.forEach((v,w)=>{const R=.78+(x[w]?.amount??0)*.65*p+y*.18;v.gain.setTargetAtTime(Math.max(1e-4,(c.overtoneGains[w]??1e-4)*R*(.6+y*.4)),n,.09)})},stableRhythmLaneMyzelLayerStepActionExtractedFromAppTsx:!0,audioBodyNowActionProbeOwned:!0,myzelSynthStillAppSupplied:!0,schedulerStillLoopProbeOwned:!0,transportStillAppNexusRefOwned:!0,hotPathAddsNoPerStepBuilder:!0}),zPe=e=>({cacheRefs:{rhythmForgeDrumPatternRef:e.rhythmForgeDrumPatternRef,rhythmForgeBassPatternRef:e.rhythmForgeBassPatternRef,rhythmForgeDrumBarIndexRef:e.rhythmForgeDrumBarIndexRef,rhythmForgeBassBarIndexRef:e.rhythmForgeBassBarIndexRef,rhythmForgeSeedRef:e.rhythmForgeSeedRef,psyBassPatternRef:e.psyBassPatternRef,psyBassBarIndexRef:e.psyBassBarIndexRef,bassClipPlaybackCacheRef:e.bassClipPlaybackCacheRef,bassClipBarRootRef:e.bassClipBarRootRef},readPorts:{readDrumStyle:e.readDrumStyle,resolveCurrentBassRootHz:e.resolveCurrentBassRootHz,resolveGrooveState:e.resolveGrooveState,readQuantizeBpm:e.readQuantizeBpm,readMetronomeAudioNowSec:e.readMetronomeAudioNowSec,readBassClipById:e.readBassClipById},actionPorts:{scheduleStableRhythmMetronomePulse:e.scheduleStableRhythmMetronomePulse,playBassNote:e.playBassNote,scheduleBassClipStep:e.scheduleBassClipStep,applyMyzelLayerStep:e.applyMyzelLayerStep},boundaryPortsOnly:!0,transportStillAppOwned:!0,schedulerLoopStillAppOwned:!0,stepPlanningStillAppOwned:!0,cacheWritesStillBoundaryOwned:!0,schedulingStillBoundaryOwned:!0,runtimeOwned:!1}),jPe=e=>{const t=OPe({...e.bassNoteAction,stableRhythmLaneBassNoteActionExtractedFromAppTsx:!0,audioBodyNowActionProbeOwned:!0,finalMixBusStillAppSupplied:!0,enterHoldFxDeviceStillAppSupplied:!0}),n=_Pe({...e.myzelLayerStepAction,stableRhythmLaneMyzelLayerStepActionExtractedFromAppTsx:!0,audioBodyNowActionProbeOwned:!0,myzelSynthStillAppSupplied:!0,hotPathAddsNoPerStepBuilder:!0}),r=zPe({...e.boundaryPorts,playBassNote:t.playBassNote,applyMyzelLayerStep:n.applyMyzelLayerStep});return{bassNoteAction:t,myzelLayerStepAction:n,boundaryPorts:r,schedulerLoopArgs:{...e.schedulerLoop,boundaryPorts:r,reactLifecycleStillAppEffectOwned:!0,schedulerLoopExtractedFromAppTsx:!0,timerResponsibilityNowInLoopProbe:!0,nextAbsoluteStepTimeTruthStillAppNexusRef:!0,browserFunctionalSanityRequiredAfterThisCut:!0},effectArgsContractExtractedFromAppTsx:!0,reactLifecycleStillAppEffectOwned:!0,schedulerLoopStillProbeOwned:!0,hotPathAddsNoPerStepBuilder:!0,liveAudioHotPathAddsNoObserver:!0}},GPe=0;function sE(e,t,n){return Number.isFinite(e)?Math.max(t,Math.min(n,e)):t}function HPe(e){return e==="critical"?.94:e==="brake"?.76:e==="watch"?.48:0}function VPe(e={}){const t=sE(Math.max(Number.isFinite(e.processorPressureScore??NaN)?Number(e.processorPressureScore):0,HPe(e.processorPressureState),e.waveStarterHoldActive?.52:0),0,1);return t>=.9||e.processorPressureState==="critical"?{mode:"emergency",pressureScore:t,targetHorizonSec:1.12,minAheadSec:.045,maxStepsPerTick:26,reason:"wave-starter-critical-pressure-protects-beat"}:t>=.7||e.processorPressureState==="brake"?{mode:"protected",pressureScore:t,targetHorizonSec:.96,minAheadSec:.038,maxStepsPerTick:22,reason:"wave-starter-brake-pressure-widens-beat-prefill"}:t>=.42||e.waveStarterHoldActive||e.processorPressureState==="watch"?{mode:"armed",pressureScore:t,targetHorizonSec:.78,minAheadSec:.028,maxStepsPerTick:18,reason:"wave-starter-hold-arms-beat-prefill-before-stall"}:{mode:"normal",pressureScore:t,targetHorizonSec:null,minAheadSec:null,maxStepsPerTick:null,reason:"normal-stable-rhythm-prefill"}}function WPe(e){const t=Math.max(.001,e.stepDurationSec),n=Number.isFinite(e.audioNowSec)?e.audioNowSec:0,r=sE(e.minAheadSec??.02,.008,.06),a=sE(e.targetHorizonSec??Math.max(.32,Math.min(.72,t*6)),.16,1.24),o=Math.max(2,Math.min(28,Math.round(e.maxStepsPerTick??12))),i=Math.max(0,Math.floor(Number.isFinite(e.nextStep)?e.nextStep:0)),s=Math.max(0,Math.ceil((n+r)/t)),l=Math.max(0,s-i),c=l>0;return c&&(fr("stable-rhythm-prefill-resynced",1),fr("stationary-stale-dropped",l)),{audioNowSec:n,stepDurationSec:t,minAheadSec:r,scheduleUntilSec:n+a,maxStepsPerTick:o,nextStep:c?s:i,safeStartStep:s,resynced:c,staleStepsDropped:l}}function qPe(e){const t=sM({audioCtx:e.audioCtx,bpm:e.bpm,quantizeGrid:16,currentAnchorSec:GPe,laneId:Gj.RHYTHM_PATTERN}),n=t.quantizeStepSec,r=Number.isFinite(e.nextStep??NaN)?Number(e.nextStep):Math.ceil(t.audioNowSec/n),a=r,o=VPe(e.beatProtection),i=WPe({nextStep:a,audioNowSec:t.audioNowSec,stepDurationSec:n,minAheadSec:e.minAheadSec??o.minAheadSec??void 0,targetHorizonSec:e.targetHorizonSec??o.targetHorizonSec??Math.max(.36,Math.min(.72,n*6)),maxStepsPerTick:e.maxStepsPerTick??o.maxStepsPerTick??void 0});return o.mode!=="normal"&&(fr("stable-rhythm-beat-protection-armed",1),fr("stable-rhythm-protected-prefill-window",1)),{...i,sharedTime:t,incomingStep:a,beatProtection:o}}function QPe(e){const t=Math.max(.006,Math.min(.05,e.minAheadSec??.015)),n=Math.max(0,Math.floor(e.absoluteStep)),r=Number.isFinite(e.timeSec)?e.timeSec:0,a=Number.isFinite(e.audioNowSec)?e.audioNowSec:r,o=a+t-r;return{absoluteStep:n,step16:(n%16+16)%16,barIndex:Math.floor(n/16),timeSec:r,stepDurationSec:Math.max(.001,e.stepDurationSec),audioNowSec:a,minAheadSec:t,stale:o>0,staleBySec:Math.max(0,o)}}function U9(e,t){if(fr("stable-rhythm-shadow-plan-built",1),e.stale)return fr("stationary-stale-dropped",1),{executed:!1,staleDropped:!0,faults:0};const n=[t.scheduleMetronomePulse,t.scheduleDrumStep,t.scheduleBassStep,t.applyMyzelStep].filter(Boolean);if(n.length===0)return fr("stable-rhythm-shadow-plan-empty",1),{executed:!1,staleDropped:!1,faults:0};let r=0;for(const a of n)try{a(e)}catch{r+=1,fr("stable-rhythm-shadow-plan-fault",1)}return{executed:r<n.length,staleDropped:!1,faults:r}}const UPe=e=>({probeKind:"app-stable-rhythm-lane-scheduler-callsite-source-probe",callsiteOwnerStillApp:!0,schedulerLoopStillInlineInApp:!0,timeoutOwnerStillAppEffect:!0,actionPortClosuresStillInlineInApp:!0,nextAbsoluteStepOwnerStillApp:!0,runtimeOwned:!1,audioOwned:!1,schedulingOwned:!1,...e}),KPe=e=>e,$Pe=e=>e.actionPort,XPe=e=>UPe({effectGate:{audioCtx:e.audioCtx,nexusActive:e.nexusActive,sourceOwnerStillApp:!0},timeWindowArgs:{audioCtx:e.audioCtx,bpm:e.bpm,nextStep:e.nextStep,minAheadSec:.02,beatProtection:e.beatProtection},tickConfig:{timerIntervalMs:25},transportProvenance:{nextAbsoluteStepReadOwnerStillApp:!0,nextAbsoluteStepWriteOwnerStillApp:!0,prefillWindowOwnerStillApp:!0},actionPortProvenance:{actionPortOwnerStillApp:!0,drumSchedulingClosuresStillInlineInApp:!0,bassSchedulingClosuresStillInlineInApp:!0,myzelSchedulingClosureStillInlineInApp:!0,metronomeSchedulingClosureStillInlineInApp:!0}}),YPe=e=>$Pe({actionPort:e}),JPe=e=>({args:{stationaryPlan:e.stationaryPlan,params:e.params,stepDurationSec:e.stepDurationSec,selectedExportedDrumConfig:e.selectedExportedDrumConfig,drumMachine:e.drumMachine,readPorts:e.boundaryPorts.readPorts,actionPorts:e.boundaryPorts.actionPorts,cacheRefs:e.boundaryPorts.cacheRefs,transportStillAppOwned:!0,nextAbsoluteStepStillAppOwned:!0,staleGuardAlreadyPassed:!0,suppressLegacyDrumWhenStableMusicLaneBeatRunning:e.suppressLegacyDrumWhenStableMusicLaneBeatRunning===!0},boundaryArgsOnly:!0,transportStillAppOwned:!0,nextAbsoluteStepStillAppOwned:!0,schedulerLoopStillAppOwned:!0,stepPlanningStillAppOwned:!0,staleGuardAlreadyPassed:!0,cacheWritesStillBoundaryOwned:!0,soundSchedulingStillBoundaryOwned:!0,runtimeOwned:!1});function ZPe(e){const{pattern:t,step:n,time:r,rootHz:a,bassLevel:o,stepMs:i,playBassNote:s}=e;if(t==="offbeat"){n%4===2&&s(r,a,o,i*1.5,.72);return}if(t==="walking"){n%4===0&&s(r,a*[1,1.189,1.333,1.498][n/4%4],o,i*1.8,.68);return}if(t==="stotter"){[0,1,3,4,6,8,9,11,14].includes(n)&&s(r,a*(n%8===0?1:1.5),o,i*.8,.78);return}t==="arpeggio"&&n%2===0&&s(r,a*[1,1.5,2,2.5][n/2%4],o,i*1.5,.64)}const eIe=e=>{const live=e.readBassClipById(e.bassClipId),t=e.currentPlaybackCache.id!==e.bassClipId||e.currentPlaybackCache.clip!==live,n=t?{id:e.bassClipId,clip:live}:e.currentPlaybackCache,r=n.clip,a=r?.generatorMeta.rootBinding??"live-step-root";let o=e.currentBarRoot,i=!1,s=e.rootHz;return r&&a==="free"?s=r.generatorMeta.rootHz??e.rootHz:r&&a==="bar-frozen"&&(i=e.currentBarRoot.clipId!==e.bassClipId||e.currentBarRoot.barIndex!==e.barIndex,o=i?{clipId:e.bassClipId,barIndex:e.barIndex,rootHz:e.rootHz}:e.currentBarRoot,s=o.rootHz),{clip:r,clipRootHz:s,rootBinding:a,nextPlaybackCache:n,nextBarRoot:o,playbackCacheWriteRequired:t,barRootWriteRequired:i,writerStillAppOwned:!0,schedulingStillAppOwned:!0,runtimeOwned:!1}},K9=e=>e.bassActive?e.bassPatternMode==="clip"&&e.bassClipId?{probeKind:"app-stable-rhythm-lane-scheduler-bass-step-branch-classifier-probe",branch:{kind:"clip",bassClipId:e.bassClipId},schedulingStillBoundaryOwned:!0,cacheWritesStillBoundaryOwned:!0,audioOwned:!1,runtimeOwned:!1}:hj(e.bassPattern)?{probeKind:"app-stable-rhythm-lane-scheduler-bass-step-branch-classifier-probe",branch:{kind:"rhythmforge",pattern:e.bassPattern},schedulingStillBoundaryOwned:!0,cacheWritesStillBoundaryOwned:!0,audioOwned:!1,runtimeOwned:!1}:$J(e.bassPattern)?{probeKind:"app-stable-rhythm-lane-scheduler-bass-step-branch-classifier-probe",branch:{kind:"psybass",pattern:e.bassPattern},schedulingStillBoundaryOwned:!0,cacheWritesStillBoundaryOwned:!0,audioOwned:!1,runtimeOwned:!1}:{probeKind:"app-stable-rhythm-lane-scheduler-bass-step-branch-classifier-probe",branch:{kind:"classic",pattern:e.bassPattern},schedulingStillBoundaryOwned:!0,cacheWritesStillBoundaryOwned:!0,audioOwned:!1,runtimeOwned:!1}:{probeKind:"app-stable-rhythm-lane-scheduler-bass-step-branch-classifier-probe",branch:{kind:"inactive"},schedulingStillBoundaryOwned:!0,cacheWritesStillBoundaryOwned:!0,audioOwned:!1,runtimeOwned:!1},tIe=e=>(e.candidate.playbackCacheWriteRequired&&(e.playbackCacheRef.current=e.candidate.nextPlaybackCache),e.candidate.barRootWriteRequired&&(e.barRootRef.current=e.candidate.nextBarRoot),{clip:e.candidate.clip,clipRootHz:e.candidate.clipRootHz,rootBinding:e.candidate.rootBinding,nextPlaybackCache:e.candidate.nextPlaybackCache,nextBarRoot:e.candidate.nextBarRoot,playbackCacheWritePerformed:e.candidate.playbackCacheWriteRequired,barRootWritePerformed:e.candidate.barRootWriteRequired,cacheMutationExplicitlyCommitted:!0,schedulingStillBoundaryOwned:!0,runtimeOwned:!1}),lE=e=>(e.candidate.cacheWriteRequired&&(e.patternRef.current=e.candidate.nextPattern,e.barIndexRef.current=e.candidate.nextBarIndex),{kind:e.kind,pattern:e.candidate.pattern,cacheWritePerformed:e.candidate.cacheWriteRequired,nextBarIndex:e.candidate.nextBarIndex,cacheMutationExplicitlyCommitted:!0,schedulingStillBoundaryOwned:!0,runtimeOwned:!1}),Sk=e=>({probeKind:"app-stable-rhythm-lane-quantized-bass-step-values-probe",values:{absoluteStep:e.absoluteStep,step16:e.step16,timeSec:e.timeSec,bassLevel:e.bassLevel,rootHz:e.rootHz,quantizeBpm:e.readQuantizeBpm()},schedulingStillBoundaryOwned:!0,playBassNoteStillActionPortOwned:!0,runtimeOwned:!1}),nIe=e=>{const t=e.currentBarIndex!==e.barIndex||!e.currentPattern||(e.currentPattern.pitchMode??"classic-semitone")!==(e.pitchMode==="follow-grid"?"follow-grid":"classic-semitone")||(e.currentPattern.tuningId??"12edo")!==(e.tuningId||"12edo"),n=t?OG(BPe({style:e.style,barIndex:e.barIndex,seed:e.seed,rootHz:e.rootHz,swing:e.swing,bassGrit:e.bassGrit,pressure:e.pressure,descriptors:e.descriptors,pitchMode:e.pitchMode,tuningId:e.tuningId})):e.currentPattern;return{pattern:n,nextPattern:n,nextBarIndex:e.barIndex,generated:t,cacheWriteRequired:t,writerStillAppOwned:!0,schedulingStillAppOwned:!0,runtimeOwned:!1}},rIe=e=>{const t=e.seedBase^e.seedSalt,n=e.descriptors.pressure;return{request:{currentPattern:e.currentPattern,currentBarIndex:e.currentBarIndex,barIndex:e.barIndex,style:YJ(e.pattern),seed:t,rootHz:e.rootHz,swing:e.swing,bassGrit:e.bassGrit,pressure:n,descriptors:e.descriptors,pitchMode:e.pitchMode,tuningId:e.tuningId},seed:t,pressure:n,cacheWriteStillBoundaryOwned:!0,schedulingStillBoundaryOwned:!0,runtimeOwned:!1}},$9=e=>{const t=e.currentBarIndex!==e.barIndex||!e.currentPattern,n=t?gT({barIndex:e.barIndex,seed:e.seed,rootHz:e.rootHz,baseSwing:e.baseSwing,descriptors:e.descriptors,flavor:e.flavor}):e.currentPattern;return{kind:e.kind,pattern:n,nextPattern:n,nextBarIndex:e.barIndex,generated:t,cacheWriteRequired:t,writerStillAppOwned:!0,schedulingStillAppOwned:!0,runtimeOwned:!1}},aIe=e=>$9({kind:"bass",...e}),X9=e=>{const t=e.seedBase^e.seedSalt,n=XJ(e.pattern);return{request:{kind:e.kind,currentPattern:e.currentPattern,currentBarIndex:e.currentBarIndex,barIndex:e.barIndex,seed:t,rootHz:e.rootHz,baseSwing:e.baseSwing,descriptors:e.descriptors,flavor:n},seed:t,flavor:n,cacheWriteStillBoundaryOwned:!0,schedulingStillBoundaryOwned:!0,runtimeOwned:!1}},oIe=e=>{const t=e.frame,n=t.params,{step:r,barIndex:a,root:o,grooveDescriptors:i,rhythmForgeBaseSwing:s,drumStyle:l}=t.stepLocals,c=t.bassStepVoiceValues,d=t.cacheRefs,p=K9({bassActive:n.bassActive,bassPatternMode:n.bassPatternMode,bassClipId:n.bassClipId,bassPattern:n.bassPattern}).branch,f=c.bassLevel;switch(p.kind){case"inactive":return;case"clip":{const b=eIe({bassClipId:p.bassClipId,currentPlaybackCache:d.bassClipPlaybackCacheRef.current,currentBarRoot:d.bassClipBarRootRef.current,barIndex:a,rootHz:o,readBassClipById:t.readPorts.readBassClipById}),g=tIe({candidate:b,playbackCacheRef:d.bassClipPlaybackCacheRef,barRootRef:d.bassClipBarRootRef}),{clip:y,clipRootHz:x}=g;if(y){const A=Sk({absoluteStep:t.plan.absoluteStep,step16:r,timeSec:t.plan.timeSec,bassLevel:f,rootHz:x,readQuantizeBpm:t.readPorts.readQuantizeBpm,schedulingStillBoundaryOwned:!0,playBassNoteStillActionPortOwned:!0}).values;t.actionPorts.scheduleBassClipStep({clip:y,step:A.absoluteStep,time:A.timeSec,rootHz:A.rootHz,bassLevel:A.bassLevel,quantizeBpm:A.quantizeBpm,playBassNote:t.actionPorts.playBassNote})}return}case"rhythmforge":{const b=X9({kind:"bass",currentPattern:d.rhythmForgeBassPatternRef.current,currentBarIndex:d.rhythmForgeBassBarIndexRef.current,barIndex:a,seedBase:d.rhythmForgeSeedRef.current,seedSalt:20915,rootHz:o,baseSwing:s,descriptors:i,pattern:p.pattern}),g=aIe(b.request),x=lE({kind:"rhythmforge-bass",candidate:g,patternRef:d.rhythmForgeBassPatternRef,barIndexRef:d.rhythmForgeBassBarIndexRef}).pattern;if(x){const A=Sk({absoluteStep:t.plan.absoluteStep,step16:r,timeSec:t.plan.timeSec,bassLevel:f,rootHz:c.rootHz,readQuantizeBpm:t.readPorts.readQuantizeBpm,schedulingStillBoundaryOwned:!0,playBassNoteStillActionPortOwned:!0}).values;TPe({pattern:x,step:A.step16,time:A.timeSec,bassLevel:A.bassLevel,quantizeBpm:A.quantizeBpm,rootHz:A.rootHz,playBassNote:t.actionPorts.playBassNote})}return}case"psybass":{const b=rIe({currentPattern:d.psyBassPatternRef.current,currentBarIndex:d.psyBassBarIndexRef.current,barIndex:a,pattern:p.pattern,seedBase:d.rhythmForgeSeedRef.current,seedSalt:40241,rootHz:o,swing:l.swing,bassGrit:c.bassGrit,descriptors:i,pitchMode:c.psyBassPitchMode,tuningId:c.gridTuning}),g=nIe(b.request),x=lE({kind:"psybass",candidate:g,patternRef:d.psyBassPatternRef,barIndexRef:d.psyBassBarIndexRef}).pattern;if(x){const A=Sk({absoluteStep:t.plan.absoluteStep,step16:r,timeSec:t.plan.timeSec,bassLevel:f,rootHz:c.rootHz,readQuantizeBpm:t.readPorts.readQuantizeBpm,schedulingStillBoundaryOwned:!0,playBassNoteStillActionPortOwned:!0}).values;DPe({pattern:x,step:A.step16,time:A.timeSec,bassLevel:A.bassLevel,quantizeBpm:A.quantizeBpm,playBassNote:t.actionPorts.playBassNote})}return}case"classic":ZPe({pattern:p.pattern,step:r,time:t.plan.timeSec,rootHz:c.rootHz,bassLevel:f,stepMs:c.stepDurationSec,playBassNote:t.actionPorts.playBassNote});return;default:return p}},Y9=e=>e.drumActive?e.drumConfigMode==="exported"&&e.selectedExportedDrumConfig?{probeKind:"app-stable-rhythm-lane-scheduler-drum-step-branch-classifier-probe",branch:{kind:"exported",entry:e.selectedExportedDrumConfig},schedulingStillBoundaryOwned:!0,cacheWritesStillBoundaryOwned:!0,audioOwned:!1,runtimeOwned:!1}:hj(e.drumPattern)?{probeKind:"app-stable-rhythm-lane-scheduler-drum-step-branch-classifier-probe",branch:{kind:"rhythmforge",pattern:e.drumPattern},schedulingStillBoundaryOwned:!0,cacheWritesStillBoundaryOwned:!0,audioOwned:!1,runtimeOwned:!1}:{probeKind:"app-stable-rhythm-lane-scheduler-drum-step-branch-classifier-probe",branch:{kind:"classic",pattern:e.drumPattern},schedulingStillBoundaryOwned:!0,cacheWritesStillBoundaryOwned:!0,audioOwned:!1,runtimeOwned:!1}:{probeKind:"app-stable-rhythm-lane-scheduler-drum-step-branch-classifier-probe",branch:{kind:"inactive"},schedulingStillBoundaryOwned:!0,cacheWritesStillBoundaryOwned:!0,audioOwned:!1,runtimeOwned:!1},iIe=e=>$9({kind:"drum",...e}),sIe=e=>{const t=e.frame,n=t.params,{step:r,barIndex:a,root:o,grooveDescriptors:i,rhythmForgeBaseSwing:s}=t.stepLocals,l=t.drumStepVoiceValues,c=t.cacheRefs,
 live=__mlSharedDrumMachine.liveEdit,
 d=live?.grid&&n.drumActive?{kind:"live-grid",entry:live.grid}:Y9({drumActive:n.drumActive,drumConfigMode:n.drumConfigMode,selectedExportedDrumConfig:e.selectedExportedDrumConfig,drumPattern:n.drumPattern}).branch;
 switch(d.kind){case"live-grid":FPe({drumMachine:e.drumMachine,entry:d.entry,
   stepIndex:t.plan.absoluteStep,time:t.plan.timeSec,stepDurationSec:l.stepDurationSec,
   drumLevel:l.drumLevel,drumStyle:l.drumStyle,
   runtimeGlobalKit:live.kit||l.drumKit,
   laneKitOverrides:live.laneKitOverrides||l.drumLaneKitOverrides,
   laneSettings:live.laneSettings||{}});return;case"inactive":return;case"exported":FPe({drumMachine:e.drumMachine,entry:d.entry,stepIndex:t.plan.absoluteStep,time:t.plan.timeSec,stepDurationSec:l.stepDurationSec,drumLevel:l.drumLevel,drumStyle:l.drumStyle,runtimeGlobalKit:l.drumKit,laneKitOverrides:l.drumLaneKitOverrides});return;case"rhythmforge":{const p=X9({kind:"drum",currentPattern:c.rhythmForgeDrumPatternRef.current,currentBarIndex:c.rhythmForgeDrumBarIndexRef.current,barIndex:a,seedBase:c.rhythmForgeSeedRef.current,seedSalt:7959,rootHz:o,baseSwing:s,descriptors:i,pattern:d.pattern}),f=iIe(p.request),g=lE({kind:"rhythmforge-drum",candidate:f,patternRef:c.rhythmForgeDrumPatternRef,barIndexRef:c.rhythmForgeDrumBarIndexRef}).pattern;g&&EPe({drumMachine:e.drumMachine,pattern:g,step:r,time:t.plan.timeSec,drumLevel:l.drumLevel,kit:l.drumKit,drumStyle:l.drumStyle,laneKitOverrides:l.drumLaneKitOverrides});return}case"classic":e.drumMachine.schedulePattern(d.pattern,r,t.plan.timeSec,l.drumLevel,l.drumKit,l.drumStyle,l.drumLaneKitOverrides);return;default:return d}},lIe=e=>{e.frame.actionPorts.applyMyzelLayerStep(e.frame.plan.timeSec,e.frame.plan.step16)},cIe=[{domain:"metronome",branchKind:"always",schedulerCall:"schedule-metronome-pulse",cacheContract:"none",branchLocalQuantizeRead:!1,runnerSwitchStillRealExecutor:!0,callPlanStillShadowOnly:!0},{domain:"drum",branchKind:"inactive",schedulerCall:"none",cacheContract:"none",branchLocalQuantizeRead:!1,runnerSwitchStillRealExecutor:!0,callPlanStillShadowOnly:!0},{domain:"drum",branchKind:"exported",schedulerCall:"schedule-exported-drum-config-step",cacheContract:"none",branchLocalQuantizeRead:!1,runnerSwitchStillRealExecutor:!0,callPlanStillShadowOnly:!0},{domain:"drum",branchKind:"rhythmforge",schedulerCall:"schedule-rhythmforge-drum-step-if-pattern-available",cacheContract:"rhythmforge-drum-pattern-cache",branchLocalQuantizeRead:!1,runnerSwitchStillRealExecutor:!0,callPlanStillShadowOnly:!0},{domain:"drum",branchKind:"classic",schedulerCall:"schedule-classic-drum-pattern",cacheContract:"none",branchLocalQuantizeRead:!1,runnerSwitchStillRealExecutor:!0,callPlanStillShadowOnly:!0},{domain:"bass",branchKind:"inactive",schedulerCall:"none",cacheContract:"none",branchLocalQuantizeRead:!1,runnerSwitchStillRealExecutor:!0,callPlanStillShadowOnly:!0},{domain:"bass",branchKind:"clip",schedulerCall:"schedule-bass-clip-step-if-clip-resolved",cacheContract:"bass-clip-root-binding-cache",branchLocalQuantizeRead:!0,runnerSwitchStillRealExecutor:!0,callPlanStillShadowOnly:!0},{domain:"bass",branchKind:"rhythmforge",schedulerCall:"schedule-rhythmforge-bass-step-if-pattern-available",cacheContract:"rhythmforge-bass-pattern-cache",branchLocalQuantizeRead:!0,runnerSwitchStillRealExecutor:!0,callPlanStillShadowOnly:!0},{domain:"bass",branchKind:"psybass",schedulerCall:"schedule-psy-bass-step-if-pattern-available",cacheContract:"psybass-pattern-cache",branchLocalQuantizeRead:!0,runnerSwitchStillRealExecutor:!0,callPlanStillShadowOnly:!0},{domain:"bass",branchKind:"classic",schedulerCall:"schedule-classic-bass-pattern",cacheContract:"none",branchLocalQuantizeRead:!1,runnerSwitchStillRealExecutor:!0,callPlanStillShadowOnly:!0},{domain:"myzel",branchKind:"always",schedulerCall:"apply-myzel-layer-step",cacheContract:"none",branchLocalQuantizeRead:!1,runnerSwitchStillRealExecutor:!0,callPlanStillShadowOnly:!0}],uIe=(e,t)=>cIe.find(n=>n.domain===e&&n.branchKind===t)??null,V1=(e,t)=>{const n=uIe(e,t);if(!n)throw new Error(`Missing stable rhythm lane call-plan contract for ${e}:${t}`);return{domain:n.domain,branchKind:n.branchKind,schedulerCall:n.schedulerCall,cacheContract:n.cacheContract,branchLocalQuantizeRead:n.branchLocalQuantizeRead,scheduleCallStillRunnerOwned:!0}},dIe=e=>{const t=e.frame,n=t.params,r=Y9({drumActive:n.drumActive,drumConfigMode:n.drumConfigMode,selectedExportedDrumConfig:e.selectedExportedDrumConfig,drumPattern:n.drumPattern}).branch,a=K9({bassActive:n.bassActive,bassPatternMode:n.bassPatternMode,bassClipId:n.bassClipId,bassPattern:n.bassPattern}).branch;return{probeKind:"app-stable-rhythm-lane-runner-call-plan-probe",step16:t.stepLocals.step,barIndex:t.stepLocals.barIndex,calls:[V1("metronome","always"),V1("drum",r.kind),V1("bass",a.kind),V1("myzel","always")],planBuiltWithoutScheduling:!0,noCacheMutation:!0,transportStillAppOwned:!0,nextAbsoluteStepStillAppOwned:!0,runtimeOwned:!1,audioOwned:!1}},mIe=e=>{const t=e.frame;e.callPlanObserver&&e.callPlanObserver(dIe({frame:t,selectedExportedDrumConfig:e.selectedExportedDrumConfig}));const n=YPe({scheduleMetronomePulse:r=>{t.actionPorts.scheduleStableRhythmMetronomePulse(r,t.readPorts.readMetronomeAudioNowSec())},scheduleDrumStep:()=>{e.suppressLegacyDrumWhenStableMusicLaneBeatRunning!==!0&&sIe({frame:t,selectedExportedDrumConfig:e.selectedExportedDrumConfig,drumMachine:e.drumMachine})},scheduleBassStep:()=>{oIe({frame:t})},applyMyzelStep:()=>{lIe({frame:t})}});return U9(t.plan,n)},pIe=e=>({probeKind:"app-stable-rhythm-lane-scheduler-prestep-context-arg-builder-probe",context:e.context,schedulerLoopStillInlineInApp:e.schedulerLoopStillInlineInApp,prestepContextCallsiteStillInlineInApp:!0,staleGuardAlreadyPassed:e.staleGuardAlreadyPassed,actionPortClosuresStillInlineInApp:e.actionPortClosuresStillInlineInApp,nextAbsoluteStepOwnerStillApp:!0,runtimeOwned:!1,audioOwned:!1,schedulingOwned:!1,provenance:e.provenance}),hIe=e=>pIe({staleGuardAlreadyPassed:!0,schedulerLoopStillInlineInApp:!0,actionPortClosuresStillInlineInApp:!0,context:e,provenance:{stationaryPlanOwnerStillApp:!0,stepAndBarIndexReadAfterStaleGuard:!0,drumStyleReadPerStep:!0,drumLaneKitOverridesSanitizedPerStep:!0,rootResolvedPerStep:!0,grooveResolvedWithNextNoteTime:!0}}),fIe=e=>{const{step:t,barIndex:n,drumStyle:r,drumLaneKitOverrides:a,root:o,groove:i}=e.context;return{probeKind:"app-stable-rhythm-lane-scheduler-step-locals-builder-probe",locals:{step:t,barIndex:n,drumStyle:r,drumLaneKitOverrides:a,root:o,groove:i,grooveDescriptors:i.descriptors,rhythmForgeBaseSwing:.04+r.swing*.1},preStepContextStillBoundaryOwned:!0,cacheRequestsStillBoundaryOwned:!0,cacheWritesStillBoundaryOwned:!0,schedulingStillBoundaryOwned:!0,runtimeOwned:!1,audioOwned:!1}},gIe=e=>({probeKind:"app-stable-rhythm-lane-scheduler-drum-step-voice-values-builder-probe",values:{drumLevel:e.drumLevel,drumKit:e.drumKit??"dusty_tape",drumStyle:e.drumStyle,drumLaneKitOverrides:e.drumLaneKitOverrides,stepDurationSec:e.stepDurationSec},schedulingStillBoundaryOwned:!0,audioOwned:!1,runtimeOwned:!1}),bIe=e=>({probeKind:"app-stable-rhythm-lane-scheduler-bass-step-voice-values-builder-probe",values:{bassLevel:e.bassLevel,bassGrit:e.bassGrit??.18,rootHz:e.rootHz,stepDurationSec:e.stepDurationSec},schedulingStillBoundaryOwned:!0,audioOwned:!1,runtimeOwned:!1}),yIe=e=>({probeKind:"app-stable-rhythm-lane-step-execution-frame-probe",frame:{plan:e.plan,params:e.params,cacheRefs:e.cacheRefs,readPorts:e.readPorts,actionPorts:e.actionPorts,stepLocals:e.stepLocals,drumStepVoiceValues:e.drumStepVoiceValues,bassStepVoiceValues:e.bassStepVoiceValues,schedulingStillBoundaryOwned:!0,runtimeOwned:!1},transportStillAppOwned:!0,nextAbsoluteStepStillAppOwned:!0,staleGuardAlreadyPassed:!0,schedulingStillBoundaryOwned:!0,runtimeOwned:!1}),SIe=e=>{const t=e.params,n=hIe({step:e.stationaryPlan.step16,barIndex:e.stationaryPlan.barIndex,drumStyle:e.readPorts.readDrumStyle(),drumLaneKitOverrides:bc(t.drumLaneKits),root:e.readPorts.resolveCurrentBassRootHz(),groove:e.readPorts.resolveGrooveState(e.stationaryPlan.timeSec)}),r=fIe(n),{drumStyle:a,drumLaneKitOverrides:o,root:i}=r.locals,s=gIe({drumLevel:t.drumVolume,drumKit:t.drumKit,drumStyle:a,drumLaneKitOverrides:o,stepDurationSec:e.stepDurationSec}).values,l=bIe({bassLevel:t.bassVolume,bassGrit:t.bassGrit,rootHz:i,stepDurationSec:e.stepDurationSec}).values;return{probeKind:"app-stable-rhythm-lane-step-execution-frame-builder-probe",frame:yIe({plan:e.stationaryPlan,params:t,cacheRefs:e.cacheRefs,readPorts:e.readPorts,actionPorts:e.actionPorts,stepLocals:r.locals,drumStepVoiceValues:s,bassStepVoiceValues:l}).frame,transportStillAppOwned:!0,nextAbsoluteStepStillAppOwned:!0,staleGuardAlreadyPassed:!0,schedulingStillBoundaryOwned:!0,runtimeOwned:!1}},vIe=e=>{const t=SIe({stationaryPlan:e.stationaryPlan,params:e.params,stepDurationSec:e.stepDurationSec,cacheRefs:e.cacheRefs,readPorts:e.readPorts,actionPorts:e.actionPorts}).frame;return mIe({frame:t,selectedExportedDrumConfig:e.selectedExportedDrumConfig,drumMachine:e.drumMachine,schedulingStillBoundaryOwned:!0,runtimeOwned:!1,suppressLegacyDrumWhenStableMusicLaneBeatRunning:e.suppressLegacyDrumWhenStableMusicLaneBeatRunning===!0})},AIe=e=>{let t=0,stopped=false;const n=()=>{if(stopped||e.audioCtx.state==='closed')return;const r=e.nexusParamsRef.current;
 const feedback=vxe(),feedbackAge=Date.now()-Date.parse(feedback?.generatedAtIso??'');
 const processor=feedbackAge>=-1000&&feedbackAge<=2000?feedback:null,mainPressure=O0(Gd(750)).pressureBias;
 const hold=e.nexusRefs.__f35640HoldState;
 const pressure={processorPressureScore:Math.max(mainPressure,processor?.processorPressureScore??0),processorPressureState:processor?.processorPressureState,waveStarterHoldActive:!!hold&&C2({state:hold.current})};
 const stepSeconds=60/Math.max(40,r.quantizeBpm)/4;
 const previousSeconds=e.nexusRefs.__f35640RhythmStepSeconds;
 const tempoChanged=previousSeconds!=null&&Math.abs(previousSeconds-stepSeconds)>1e-9;
 e.nexusRefs.__f35640RhythmStepSeconds=stepSeconds;
 const a=XPe({audioCtx:e.audioCtx,nexusActive:!0,bpm:r.quantizeBpm,nextStep:tempoChanged?undefined:e.nexusRefs.current.nextAbsoluteStep,beatProtection:pressure}),o=qPe(a.timeWindowArgs),i=o.stepDurationSec,s=o.audioNowSec;let l=o.nextStep,c=0;for(;l*i<o.scheduleUntilSec&&c<o.maxStepsPerTick;){const d=l*i,p=QPe(KPe({absoluteStep:l,timeSec:d,stepDurationSec:i,audioNowSec:e.audioCtx.currentTime,minAheadSec:o.minAheadSec}));if(p.stale){U9(p,{}),l+=1,c+=1;continue}const f=JPe({stationaryPlan:p,params:r,stepDurationSec:i,selectedExportedDrumConfig:e.selectedExportedDrumConfig,drumMachine:e.drumMachine,boundaryPorts:e.boundaryPorts,suppressLegacyDrumWhenStableMusicLaneBeatRunning:e.readStableMusicLaneBeatWorkletOnly?.()===!0});vIe(f.args),l+=1,c+=1}l*i<o.scheduleUntilSec&&fr("stable-rhythm-prefill-capped",1),e.nexusRefs.current.nextAbsoluteStep=l,t=window.setTimeout(n,a.tickConfig.timerIntervalMs)};return n(),()=>{stopped=true,window.clearTimeout(t),e.clearStableRhythmMetronomeTimeouts()}},xIe=e=>{P.useEffect(()=>{if(!e.audioCtx||!e.nexusActive)return;const t=e.audioCtx,n=e.schedulerLoop.nexusParamsRef,r=e.schedulerLoop.nexusRefs,a=D9(t,e.ensureDrumMixBus(t)),o=jPe({bassNoteAction:{...e.bassNoteAction,audioCtx:t},myzelLayerStepAction:{...e.myzelLayerStepAction,audioCtx:t,resolveBaseHz:()=>e.myzelLayerStepAction.bassRootMode==="fixed"?e.myzelLayerStepAction.bassRootHz:e.myzelLayerStepAction.readInterpreterMyzelBaseHz()},boundaryPorts:{...e.boundaryPorts,readDrumStyle:()=>Q9({drumEdge:n.current.drumEdge,drumSoftness:n.current.drumSoftness,drumAir:n.current.drumAir,drumSnap:n.current.drumSnap,grooveSwing:n.current.grooveSwing}),resolveCurrentBassRootHz:()=>IPe({bassRootMode:n.current.bassRootMode,bassRootHz:n.current.bassRootHz,cursorY:r.current.cursorY,freqFromY:e.freqFromY}),resolveGrooveState:i=>vH(e.myceliumSnapshotRef.current,i),readQuantizeBpm:()=>n.current.quantizeBpm,readMetronomeAudioNowSec:()=>t.currentTime},schedulerLoop:{...e.schedulerLoop,audioCtx:t,drumMachine:a,readStableMusicLaneBeatWorkletOnly:e.readStableMusicLaneBeatWorkletOnly}});const clipPlayer=__f48BassClipPlayer(t,o.bassNoteAction.playBassNote,e.boundaryPorts.readBassClipById,()=>n.current);o.boundaryPorts.actionPorts.scheduleBassClipStep=args=>clipPlayer.schedule(args);const stop=AIe(o.schedulerLoopArgs);return()=>{stop();clipPlayer.dispose()}},[e.audioCtx,e.nexusActive,e.myzelLayerStepAction.myzelEnabled,e.myzelLayerStepAction.myzelPattern,e.myzelLayerStepAction.myzelStep16ths,e.myzelLayerStepAction.myzelBallMode,e.myzelLayerStepAction.myzelNodeMode,e.myzelLayerStepAction.intensityGlobal,e.myzelLayerStepAction.bassRootMode,e.myzelLayerStepAction.bassRootHz,e.myzelLayerStepAction.myzelInterpreterMix.hybridBlend,e.myzelLayerStepAction.myzelInterpreterMix.weaveBlend,e.myzelLayerStepAction.myzelInterpreterMix.constellationBlend,e.myzelLayerStepAction.myzelInterpreterMix.driveAmount,e.myzelLayerStepAction.myzelInterpreterMix.driveResponse,e.schedulerLoop.selectedExportedDrumConfig,e.boundaryPorts.scheduleStableRhythmMetronomePulse,e.schedulerLoop.clearStableRhythmMetronomeTimeouts,e.readStableMusicLaneBeatWorkletOnly])};function MIe(){const e=P.useRef(null),t=P.useRef(null),n=P.useRef(-1),r=P.useRef(-1),a=P.useRef(367127),o=P.useRef(null),i=P.useRef(-1),s=P.useRef({id:"",clip:null}),l=P.useRef({clipId:"",barIndex:-1,rootHz:49});return P.useMemo(()=>({rhythmForgeDrumPatternRef:e,rhythmForgeBassPatternRef:t,rhythmForgeDrumBarIndexRef:n,rhythmForgeBassBarIndexRef:r,rhythmForgeSeedRef:a,psyBassPatternRef:o,psyBassBarIndexRef:i,bassClipPlaybackCacheRef:s,bassClipBarRootRef:l}),[])}const J9=1,wIe=Object.freeze({dusty_tape:Object.freeze({kickPitchStart:128,kickPitchEnd:38,kickDecay:.18,kickDrive:1.7,kickOsc:"sine",kickClickHz:1580,snareToneHz:180,snareNoiseHz:2400,snareOsc:"triangle",hatHz:7600,hatDecay:.075,hatOscA:"square",hatOscB:"triangle",hatMetalMix:1,hatNoiseMix:1,noiseColor:.85,clapBursts:3,clapSpacing:.012,percRatio:1.33,percOsc:"sine",percDecay:.1}),membrane_box:Object.freeze({kickPitchStart:112,kickPitchEnd:30,kickDecay:.22,kickDrive:1.4,kickOsc:"sine",kickClickHz:1440,snareToneHz:208,snareNoiseHz:2100,snareOsc:"sine",hatHz:6900,hatDecay:.09,hatOscA:"square",hatOscB:"triangle",hatMetalMix:.86,hatNoiseMix:1.04,noiseColor:.72,clapBursts:3,clapSpacing:.013,percRatio:1.18,percOsc:"sine",percDecay:.11}),glass_metal:Object.freeze({kickPitchStart:142,kickPitchEnd:48,kickDecay:.14,kickDrive:2.1,kickOsc:"triangle",kickClickHz:1920,snareToneHz:250,snareNoiseHz:3600,snareOsc:"triangle",hatHz:9800,hatDecay:.055,hatOscA:"triangle",hatOscB:"triangle",hatMetalMix:1.18,hatNoiseMix:.86,noiseColor:1,clapBursts:3,clapSpacing:.011,percRatio:1.72,percOsc:"triangle",percDecay:.085}),asphalt_punch:Object.freeze({kickPitchStart:154,kickPitchEnd:41,kickDecay:.16,kickDrive:2.45,kickOsc:"sine",kickClickHz:1980,snareToneHz:196,snareNoiseHz:2820,snareOsc:"triangle",hatHz:8400,hatDecay:.06,hatOscA:"square",hatOscB:"sawtooth",hatMetalMix:1.2,hatNoiseMix:.82,noiseColor:.78,clapBursts:4,clapSpacing:.009,percRatio:1.26,percOsc:"triangle",percDecay:.08}),velvet_breaks:Object.freeze({kickPitchStart:102,kickPitchEnd:28,kickDecay:.24,kickDrive:1.18,kickOsc:"sine",kickClickHz:1260,snareToneHz:164,snareNoiseHz:1820,snareOsc:"sine",hatHz:6e3,hatDecay:.11,hatOscA:"triangle",hatOscB:"sine",hatMetalMix:.52,hatNoiseMix:1.08,noiseColor:.6,clapBursts:3,clapSpacing:.014,percRatio:1.08,percOsc:"sine",percDecay:.14}),neon_arc:Object.freeze({kickPitchStart:136,kickPitchEnd:52,kickDecay:.13,kickDrive:1.95,kickOsc:"triangle",kickClickHz:2380,snareToneHz:282,snareNoiseHz:4220,snareOsc:"square",hatHz:11e3,hatDecay:.05,hatOscA:"sawtooth",hatOscB:"triangle",hatMetalMix:1.42,hatNoiseMix:.74,noiseColor:1.05,clapBursts:5,clapSpacing:.007,percRatio:1.88,percOsc:"triangle",percDecay:.068}),bronze_static:Object.freeze({kickPitchStart:118,kickPitchEnd:34,kickDecay:.21,kickDrive:1.62,kickOsc:"triangle",kickClickHz:1710,snareToneHz:228,snareNoiseHz:3040,snareOsc:"triangle",hatHz:8800,hatDecay:.08,hatOscA:"triangle",hatOscB:"square",hatMetalMix:1.26,hatNoiseMix:.92,noiseColor:.92,clapBursts:4,clapSpacing:.011,percRatio:1.62,percOsc:"triangle",percDecay:.11}),resin_tom:Object.freeze({kickPitchStart:96,kickPitchEnd:26,kickDecay:.26,kickDrive:1.34,kickOsc:"sine",kickClickHz:1180,snareToneHz:146,snareNoiseHz:1620,snareOsc:"sine",hatHz:5200,hatDecay:.12,hatOscA:"square",hatOscB:"triangle",hatMetalMix:.4,hatNoiseMix:1.16,noiseColor:.56,clapBursts:2,clapSpacing:.016,percRatio:.94,percOsc:"sine",percDecay:.16}),paper_spark:Object.freeze({kickPitchStart:126,kickPitchEnd:44,kickDecay:.15,kickDrive:1.52,kickOsc:"triangle",kickClickHz:2120,snareToneHz:214,snareNoiseHz:3380,snareOsc:"square",hatHz:9700,hatDecay:.045,hatOscA:"square",hatOscB:"triangle",hatMetalMix:.98,hatNoiseMix:1.22,noiseColor:1,clapBursts:4,clapSpacing:.008,percRatio:1.44,percOsc:"triangle",percDecay:.072})}),kd=(e,t,n)=>Math.min(n,Math.max(t,e)),In=(e,t,n)=>e+(t-e)*n;function RIe(e){return{edge:kd(e.edge,0,1),softness:kd(e.softness,0,1),air:kd(e.air,0,1),snap:kd(e.snap,0,1),swing:kd(e.swing,0,1),pan:kd(e.pan,-1,1),decayScale:kd(e.decayScale,.25,2),chokeGroup:e.chokeGroup==="hat"?"hat":"none"}}const _f=e=>Number(e.toFixed(12)),CIe=(e,t,n,r)=>JSON.stringify([J9,e,t,_f(n),_f(r.edge),_f(r.softness),_f(r.air),_f(r.snap),_f(r.decayScale)]),vk=(e,t,n)=>({initialGain:1e-4,peakGain:Math.max(2e-4,e),attackSec:Math.max(.0012,t),targetGain:1e-4,targetTimeConstantSec:Math.max(.004,n)}),kIe=(e,t,n,r)=>{const a=e!=="perc",o=r.chokeGroup!=="hat"?"none":e==="hat_open"?"register-open-hat":e==="hat_closed"?"choke-current-open-hat":"none";return{contractVersion:J9,voice:e,kit:t,level:n,style:r,pan:r.pan,bodyChannelLayout:"mono-pre-pan",sourceNoise:a?"machine-shared-noise-table-v1":"none",noiseStartsAtOffsetZero:a,runtimeInteraction:o,runtimeChokeReleaseSec:o==="choke-current-open-hat"?.01:null,pcmBodyKey:CIe(e,t,n,r),pcmBodyFinite:!0,exactPcmCacheRequiresSampleRate:!0,exactPcmCacheRequiresNoiseTableIdentity:a,notes:Object.freeze(["pan is post-body and intentionally excluded from pcmBodyKey","swing is already timing semantics and does not affect DrumMachine.trigger body rendering","hat choke is cross-event runtime state and intentionally excluded from pcmBodyKey","level remains in pcmBodyKey because current nonlinear voices can change timbre with input level"])}};function PIe(e){const t=RIe(e.style),n=kd(e.level,0,1.5);if(n<=1e-4)return null;const r=wIe[e.kit],a=kIe(e.voice,e.kit,n,t);if(e.voice==="kick"){const i=r.kickDrive*In(.78,1.22,t.edge),s=r.kickDecay*t.decayScale*In(1.18,.84,t.snap)*In(1.16,.9,1-t.softness);return{...a,kind:"kick",bodyOsc:{wave:r.kickOsc,frequencyStartHz:r.kickPitchStart,frequencyEndHz:r.kickPitchEnd,gainStart:n,gainEnd:1e-4,decaySec:s,stopSec:s+.02},click:{highpassHz:r.kickClickHz+i*180+t.air*720,gainStart:n*In(.08,.22,t.snap),gainEnd:1e-4,decaySec:In(.024,.012,t.snap),stopSec:.02},driveAmount:i,lowpass:{startHz:r.kickPitchStart*In(5.4,6.8,t.air),endHz:Math.max(140,r.kickPitchEnd*In(6.2,7.6,t.air)),sweepSec:s}}}if(e.voice==="snare"){const i=In(.08,.13,t.softness)*t.decayScale,s=In(.08,.14,t.softness)*t.decayScale,l=In(.21,.12,t.snap)*t.decayScale,c=In(.28,.18,t.snap)*t.decayScale;return{...a,kind:"snare",bodyOsc:{wave:r.snareOsc,frequencyStartHz:r.snareToneHz*In(.92,1.12,t.snap),frequencyEndHz:r.snareToneHz*In(.5,.72,t.softness),frequencyDecaySec:i,gainStart:n*In(.18,.34,t.snap),gainEnd:1e-4,gainDecaySec:s,stopSec:.16},noise:{bandpassHz:r.snareNoiseHz*In(.82,1.18,t.air),bandpassQ:.7+r.noiseColor*.75+t.snap*.3,highpassHz:1100+r.noiseColor*700+t.air*1200,gainStart:n*In(.42,.78,t.edge),gainEnd:1e-4,gainDecaySec:l,stopSec:.2},driveAmount:In(1.05,2.1,(t.edge+t.snap)*.5),outputGain:{start:1,end:1e-4,decaySec:c}}}if(e.voice==="hat_closed"||e.voice==="hat_open"){const i=e.voice==="hat_open",s=r.hatHz*In(.78,1.14,t.air)*(i?.92:.84),l=i?.14:.065;return{...a,kind:"hat",open:i,filters:{highpassHz:s*In(.5,.7,t.air),bandpassHz:s,bandpassQ:In(.55,.95,t.edge)*(i?.9:1),lowpassHz:Math.min(12e3,s*In(.95,1.32,t.air)*(i?1.12:1)),lowpassQ:.25+t.edge*.12},noiseGain:r.hatNoiseMix,metallic:{waveA:r.hatOscA,waveB:r.hatOscB,frequencyAHz:s*.43,frequencyBHz:s*.57,envelope:vk(n*In(.04,.12,t.edge)*r.hatMetalMix,In(.0032,.0012,t.snap),(i?In(.042,.02,t.snap):In(.026,.012,t.snap))*t.decayScale)},driveAmount:In(.72,1.8,t.edge),outputEnvelope:vk(n*(i?.2:.15)*In(.85,1.12,t.air),In(.0034,.0012,1-t.softness),(i?r.hatDecay*In(1.18,.76,t.snap):r.hatDecay*In(.92,.55,t.snap))*t.decayScale),sourceStopSec:l}}if(e.voice==="clap"){const i=Array.from({length:r.clapBursts},(s,l)=>{const c=l*r.clapSpacing;return Object.freeze({offsetSec:c,highpassHz:r.snareNoiseHz*.75+l*120+t.air*300,envelope:vk(n*Math.max(.04,.12-l*.024)*In(.9,1.15,t.snap),In(.0022,.0012,t.snap),In(.034,.018,t.snap)*t.decayScale),sourceStopSec:c+.08})});return{...a,kind:"clap",bursts:i}}const o=In(r.percDecay,r.percDecay*.7,t.snap)*t.decayScale;return{...a,kind:"perc",oscillator:{wave:r.percOsc,frequencyStartHz:280*r.percRatio,frequencyEndHz:180*r.percRatio,sweepSec:o,stopSec:r.percDecay*t.decayScale+.02},bandpass:{frequencyHz:520*r.percRatio*In(.88,1.2,t.air),q:3.8+t.edge*1.4},gain:{start:n*In(.18,.28,t.snap),end:1e-4,decaySec:In(r.percDecay*1.2,r.percDecay*.82,t.snap)*t.decayScale}}}function IIe(e,t=Math.random){const n=Math.max(1,Math.floor(e)),r=new Float32Array(n);for(let a=0;a<n;a+=1){const o=t()*2-1;r[a]=o*(.6+t()*.4)}return r}function Z9(e){switch(e.kind){case"kick":return Math.max(e.bodyOsc.stopSec,e.click.stopSec);case"snare":return Math.max(e.bodyOsc.stopSec,e.noise.stopSec);case"hat":return e.sourceStopSec;case"clap":return e.bursts.reduce((t,n)=>Math.max(t,n.sourceStopSec),0);case"perc":return e.oscillator.stopSec}}const EIe=["kick","snare","hatClosed","hatOpen","clap","perc"],as=(e,t,n)=>Math.min(n,Math.max(t,e)),TL=e=>({edge:as(e?.edge??Kn.edge,0,1),softness:as(e?.softness??Kn.softness,0,1),air:as(e?.air??Kn.air,0,1),snap:as(e?.snap??Kn.snap,0,1),swing:as(e?.swing??Kn.swing,0,1),pan:as(e?.pan??Kn.pan,-1,1),decayScale:as(e?.decayScale??Kn.decayScale,.25,2),chokeGroup:e?.chokeGroup==="hat"?"hat":"none"}),e7=(e,t,n)=>n?.[e]??t,t7=e=>e==="hatClosed"?"hat_closed":e==="hatOpen"?"hat_open":e,FIe=e=>as(e,0,1.5),n7=(e,t)=>{const n=FIe(t.level);n<=1e-4||e.push({...t,eventId:`${t.sourceKind}:${t.sourceStepIndex}:${t.laneId}:${e.length}`,level:n,style:TL(t.style)})},r7=e=>{const t=Math.max(1e-6,e.stepDurationSec),n=Math.max(1,Math.round(e.cycleStepCount));return{contractVersion:1,sourceKind:e.sourceKind,sourceIdentity:e.sourceIdentity,cycleStepCount:n,stepDurationSec:t,cycleDurationSec:n*t,events:[...e.events].sort((r,a)=>r.offsetSec-a.offsetSec||r.sourceStepIndex-a.sourceStepIndex||r.eventId.localeCompare(a.eventId)),semantics:{clockOwnedHere:!1,audioOwnedHere:!1,rendererOwnedHere:!1,eventTimesRelativeToProgramStart:!0,parityTarget:"current-drum-machine-trigger-seam",notes:e.notes}}};function TIe(e){if(eR(e.pattern))throw new Error(`resolveClassicDrumProgram received RhythmForge pattern ${e.pattern}`);const t=[],n=TL(e.drumStyle),r=.004+n.swing*.018;for(let a=0;a<16;a+=1){const o=a*e.stepDurationSec,i=o+r,s=Math.max(0,o-r*.45);PL(e.pattern,a).forEach(c=>{const d=c.timing==="late"?i:c.timing==="early"?s:o;n7(t,{sourceKind:"classic",sourceStepIndex:a,laneId:c.laneId,voice:t7(c.laneId),offsetSec:d,level:e.drumLevel*(c.levelMultiplier??1),kit:e7(c.laneId,e.kit,e.laneKitOverrides),style:n})})}return r7({sourceKind:"classic",sourceIdentity:{kind:"classic",pattern:e.pattern},cycleStepCount:16,stepDurationSec:e.stepDurationSec,events:t,notes:["Classic trigger.intensity remains editor/matrix semantics; current audible schedulePattern gain uses levelMultiplier, not intensity.","Classic early/late swing is preserved as the current fixed-seconds offset derived from DrumStyle.swing."]})}const LIe=e=>{const t=e.laneSettings[e.laneId];return TL({...e.drumStyle,edge:e.laneId==="hatClosed"||e.laneId==="hatOpen"?Math.max(e.drumStyle.edge,.58):e.drumStyle.edge,air:e.laneId==="hatOpen"||e.laneId==="clap"?Math.max(e.drumStyle.air,.54):e.drumStyle.air,snap:e.value>=.95?Math.max(e.drumStyle.snap,.68):e.drumStyle.snap,softness:e.laneId==="kick"?Math.min(e.drumStyle.softness,.42):e.drumStyle.softness,pan:t.pan,decayScale:t.decay,chokeGroup:t.chokeGroup})};function BIe(e){const t=Math.max(1,e.entry.bars||1),n=t*16,r=n*e.stepDurationSec,a=jT({presetSource:e.entry.presetSource,globalKit:e.entry.drumKit,bars:t,segmentsPerBar:e.entry.segmentsPerBar,segmentMarkers:e.entry.segmentMarkers,stepCount:e.entry.stepCount,laneOrder:e.entry.laneOrder?.length?e.entry.laneOrder:EIe,laneSteps:e.entry.laneSteps,laneKitOverrides:e.entry.laneKitOverrides,laneSettings:e.entry.laneSettings??e.laneSettings,stepPrograms:e.entry.stepPrograms}),o=[];return GT(a,i=>{const s=(i.startRatio%1+1)%1,l=e.drumLevel*i.laneSettings.level*(i.value>=.95?1:i.value>=.8?.84:.62),c=t7(i.laneId);(i.layers.length?i.layers:[{id:"primary",active:!0,levelScale:1,decayScale:1,panOffset:0,gradient:0}]).forEach(p=>{if(!p.active)return;const f=LIe({laneId:i.laneId,drumStyle:e.drumStyle,laneSettings:a.laneSettings,value:i.value});n7(o,{sourceKind:"exported",sourceStepIndex:i.stepIndex,laneId:i.laneId,voice:c,offsetSec:s*r,level:l*p.levelScale,kit:e7(i.laneId,e.runtimeGlobalKit,e.laneKitOverrides),style:{...f,pan:as(f.pan+p.panOffset,-1,1),decayScale:f.decayScale*p.decayScale,snap:as(f.snap+p.gradient*.08,0,1),air:as(f.air+Math.max(0,p.gradient)*.06,0,1),edge:as(f.edge+Math.max(0,-p.gradient)*.06,0,1)}})})}),r7({sourceKind:"exported",sourceIdentity:{kind:"exported",entryId:e.entry.id,entryUpdatedAt:e.entry.updatedAt,presetSource:e.entry.presetSource,bars:t,segmentsPerBar:e.entry.segmentsPerBar,sourceStepCount:e.entry.stepCount},cycleStepCount:n,stepDurationSec:e.stepDurationSec,events:o,notes:["Exported program timing preserves segment markers, microOffsetRatio and arbitrary source grid resolution while the current host advances 16 windows per bar.","Parity preserves current audible kit routing: runtimeGlobalKit + runtime lane overrides win; entry.drumKit, event.kit and layer.kit are not silently made audible.","Lane level/decay/pan/choke and layer level/decay/pan/gradient are fully resolved before the renderer seam."]})}function a7(e){const t=PIe({voice:e.voice,level:e.level,kit:e.kit,style:e.style});if(!t)throw new Error(`ResolvedDrumEvent ${e.eventId} unexpectedly resolved to silence`);return t}const LL=1,DIe=.5,NIe=(e,t,n)=>Math.min(n,Math.max(t,e)),Ak=e=>{const t=NIe(e,.5,8),n=1024,r=new Float32Array(n);for(let a=0;a<n;a+=1){const o=a/(n-1)*2-1;r[a]=Math.tanh(o*t)}return r},xk=(e,t,n)=>{e.gain.cancelScheduledValues(t),e.gain.setValueAtTime(n.initialGain,t),e.gain.linearRampToValueAtTime(n.peakGain,t+n.attackSec),e.gain.setTargetAtTime(n.targetGain,t+n.attackSec,n.targetTimeConstantSec)},OIe=(e,t,n,r)=>{if(r)return r(e,t,n);const a=globalThis.OfflineAudioContext;if(typeof a!="function")throw new Error("OfflineAudioContext unavailable: Drum PCM compilation must run in a WebAudio-capable host");return new a(e,t,n)},_Ie=(e,t)=>{const n=e.createBuffer(1,t.length,e.sampleRate),r=new Float32Array(t.length);return r.set(t),n.copyToChannel(r,0,0),n},Gn=(e,t)=>(e.connect(t),t);function zIe(e,t,n,r){const a=()=>{if(!r)throw new Error(`Recipe ${n.pcmBodyKey} requires machine-shared noise data`);const l=e.createBufferSource();return l.buffer=_Ie(e,r),l};if(n.kind==="kick"){const l=e.createOscillator(),c=e.createGain(),d=a(),p=e.createBiquadFilter(),f=e.createGain(),b=e.createGain(),g=e.createWaveShaper(),y=e.createBiquadFilter();l.type=n.bodyOsc.wave,Gn(l,c),Gn(c,b),Gn(d,p),Gn(p,f),Gn(f,b),Gn(b,g),Gn(g,y),Gn(y,t),g.curve=Ak(n.driveAmount),y.type="lowpass",y.frequency.setValueAtTime(n.lowpass.startHz,0),y.frequency.exponentialRampToValueAtTime(n.lowpass.endHz,n.lowpass.sweepSec),l.frequency.setValueAtTime(n.bodyOsc.frequencyStartHz,0),l.frequency.exponentialRampToValueAtTime(n.bodyOsc.frequencyEndHz,n.bodyOsc.decaySec),c.gain.setValueAtTime(n.bodyOsc.gainStart,0),c.gain.exponentialRampToValueAtTime(n.bodyOsc.gainEnd,n.bodyOsc.decaySec),p.type="highpass",p.frequency.setValueAtTime(n.click.highpassHz,0),f.gain.setValueAtTime(n.click.gainStart,0),f.gain.exponentialRampToValueAtTime(n.click.gainEnd,n.click.decaySec),l.start(0),l.stop(n.bodyOsc.stopSec),d.start(0),d.stop(n.click.stopSec);return}if(n.kind==="snare"){const l=e.createOscillator(),c=e.createGain(),d=a(),p=e.createBiquadFilter(),f=e.createBiquadFilter(),b=e.createGain(),g=e.createWaveShaper(),y=e.createGain();l.type=n.bodyOsc.wave,Gn(l,c),Gn(c,g),Gn(d,p),Gn(p,f),Gn(f,b),Gn(b,g),Gn(g,y),Gn(y,t),g.curve=Ak(n.driveAmount),l.frequency.setValueAtTime(n.bodyOsc.frequencyStartHz,0),l.frequency.exponentialRampToValueAtTime(n.bodyOsc.frequencyEndHz,n.bodyOsc.frequencyDecaySec),c.gain.setValueAtTime(n.bodyOsc.gainStart,0),c.gain.exponentialRampToValueAtTime(n.bodyOsc.gainEnd,n.bodyOsc.gainDecaySec),p.type="bandpass",p.frequency.setValueAtTime(n.noise.bandpassHz,0),p.Q.setValueAtTime(n.noise.bandpassQ,0),f.type="highpass",f.frequency.setValueAtTime(n.noise.highpassHz,0),b.gain.setValueAtTime(n.noise.gainStart,0),b.gain.exponentialRampToValueAtTime(n.noise.gainEnd,n.noise.gainDecaySec),y.gain.setValueAtTime(n.outputGain.start,0),y.gain.exponentialRampToValueAtTime(n.outputGain.end,n.outputGain.decaySec),l.start(0),l.stop(n.bodyOsc.stopSec),d.start(0),d.stop(n.noise.stopSec);return}if(n.kind==="hat"){const l=a(),c=e.createBiquadFilter(),d=e.createBiquadFilter(),p=e.createBiquadFilter(),f=e.createOscillator(),b=e.createOscillator(),g=e.createGain(),y=e.createGain(),x=e.createGain(),A=e.createWaveShaper(),M=e.createGain();Gn(l,c),Gn(c,d),Gn(d,p),Gn(p,y),Gn(y,x),f.type=n.metallic.waveA,b.type=n.metallic.waveB,Gn(f,g),Gn(b,g),Gn(g,x),Gn(x,A),Gn(A,M),Gn(M,t),c.type="highpass",c.frequency.setValueAtTime(n.filters.highpassHz,0),d.type="bandpass",d.frequency.setValueAtTime(n.filters.bandpassHz,0),d.Q.setValueAtTime(n.filters.bandpassQ,0),p.type="lowpass",p.frequency.setValueAtTime(n.filters.lowpassHz,0),p.Q.setValueAtTime(n.filters.lowpassQ,0),y.gain.setValueAtTime(n.noiseGain,0),f.frequency.setValueAtTime(n.metallic.frequencyAHz,0),b.frequency.setValueAtTime(n.metallic.frequencyBHz,0),xk(g,0,n.metallic.envelope),A.curve=Ak(n.driveAmount),n.liveOutputEnvelope?M.gain.setValueAtTime(1,0):xk(M,0,n.outputEnvelope),l.start(0),l.stop(n.sourceStopSec),f.start(0),b.start(0),f.stop(n.sourceStopSec),b.stop(n.sourceStopSec);return}if(n.kind==="clap"){for(const l of n.bursts){const c=a(),d=e.createBiquadFilter(),p=e.createGain();Gn(c,d),Gn(d,p),Gn(p,t),d.type="highpass",d.frequency.setValueAtTime(l.highpassHz,l.offsetSec),xk(p,l.offsetSec,l.envelope),c.start(l.offsetSec),c.stop(l.sourceStopSec)}return}const o=e.createOscillator(),i=e.createBiquadFilter(),s=e.createGain();o.type=n.oscillator.wave,Gn(o,i),Gn(i,s),Gn(s,t),i.type="bandpass",i.frequency.setValueAtTime(n.bandpass.frequencyHz,0),i.Q.setValueAtTime(n.bandpass.q,0),o.frequency.setValueAtTime(n.oscillator.frequencyStartHz,0),o.frequency.exponentialRampToValueAtTime(n.oscillator.frequencyEndHz,n.oscillator.sweepSec),s.gain.setValueAtTime(n.gain.start,0),s.gain.exponentialRampToValueAtTime(n.gain.end,n.gain.decaySec),o.start(0),o.stop(n.oscillator.stopSec)}const jIe=e=>{let t=2166136261;const n=new Uint8Array(e.buffer,e.byteOffset,e.byteLength);for(let r=0;r<n.length;r+=1)t^=n[r],t=Math.imul(t,16777619);return(t>>>0).toString(16).padStart(8,"0")};function BL(e){return e?`fnv1a32:${jIe(e)}:${e.length}`:"none"}function DL(e,t,n){const r=e.exactPcmCacheRequiresNoiseTableIdentity?BL(n):"not-required";return`drum-pcm-v${LL}:${t}:${r}:${e.pcmBodyKey}`}function GIe(e,t=DIe){return Z9(e)+Math.max(.1,t)}const HIe=(e,t)=>{let n=0,r=0,a=0;for(let o=0;o<e.length;o+=1){const i=Math.abs(e[o]);i>n&&(n=i),o>=t&&i>a&&(a=i),r+=e[o]*e[o]}return{peak:n,rms:Math.sqrt(r/Math.max(1,e.length)),tailPeak:a}};async function VIe(e,t){const n=Math.max(8e3,Math.round(t.sampleRate)),r=e.exactPcmCacheRequiresNoiseTableIdentity,a=r?t.noiseTable??null:null;if(r&&(!a||a.length<n))throw new Error(`Recipe ${e.pcmBodyKey} requires an explicit shared noise table with at least one second of PCM`);const o=GIe(e,t.tailMarginSec),i=Math.max(1,Math.ceil(o*n)),s=OIe(1,i,n,t.offlineContextFactory);zIe(s,s.destination,e,a);const l=await s.startRendering(),c=new Float32Array(l.getChannelData(0)),d=Math.min(c.length,Math.ceil(Z9(e)*n)),p=HIe(c,d),f=r?BL(a??void 0):"not-required";return Object.freeze({compilerVersion:LL,bodyKey:e.pcmBodyKey,cacheKey:DL(e,n,a??void 0),sampleRate:n,noiseTableIdentity:f,sourceStopFrame:d,frameLength:c.length,renderedDurationSec:c.length/n,samples:c,...p,bodyChannelLayout:"mono-pre-pan",panOwnedHere:!1,chokeOwnedHere:!1,clockOwnedHere:!1,productOwnerChanged:!1})}async function WIe(e,t){const n=new Map;for(const r of e){const a=DL(r,t.sampleRate,t.noiseTable);if(n.has(a))continue;const o=await VIe(r,t);n.set(a,o)}return Object.freeze({compilerVersion:LL,sampleRate:Math.max(8e3,Math.round(t.sampleRate)),noiseTableIdentity:BL(t.noiseTable),bodies:n})}async function qIe(e,t){const n=e.events.map(a7);return WIe(n,t)}const uO=e=>e.samples.length;function QIe(e,t,n){const r=[],a=e.reduce((l,c)=>Math.max(l,uO(t[c.bodyIndex])),0),o=Math.max(1,Math.ceil(a/n));for(const l of e){const c=uO(t[l.bodyIndex]);for(let d=-o;d<=1;d+=1){const p=l.offsetFrame+d*n,f=p+c;r.push({frame:p,delta:1},{frame:f,delta:-1})}}r.sort((l,c)=>l.frame-c.frame||l.delta-c.delta);let i=0,s=0;for(const l of r)i+=l.delta,l.frame>=0&&l.frame<n&&(s=Math.max(s,i));return s}function UIe(e,t,n){const r=Math.max(8e3,Math.round(n.sampleRate));if(t.sampleRate!==r)throw new Error("PCM bank sample rate does not match ProtectedDrumProgram");const a=[...t.bodies.values()],o=new Map(a.map((d,p)=>[d.cacheKey,p])),i=a.map(d=>({cacheKey:d.cacheKey,samples:d.samples,sampleRate:d.sampleRate})),s=Math.max(1,Math.round(e.cycleDurationSec*r)),l=e.events.map(d=>{const p=a7(d),f=DL(p,r,n.noiseTable),b=o.get(f);if(b==null)throw new Error(`Missing compiled PCM body for ${d.eventId}`);const g=Math.round(d.offsetSec*r);if(g<0||g>=s)throw new Error(`Event ${d.eventId} falls outside its cycle after frame quantization`);return Object.freeze({eventId:d.eventId,offsetFrame:g,bodyIndex:b,pan:d.style.pan,interaction:p.runtimeInteraction,openHatEnvelope:p.kind==="hat"&&p.open?p.outputEnvelope:void 0})}),c=QIe(l,i,s);return Object.freeze({contractVersion:1,revision:n.revision,sampleRate:r,cycleFrames:s,events:Object.freeze(l),bodies:Object.freeze(i),requiredVoiceCapacity:c})}const KIe=`/**
 * B-DRUM B3: headless realtime core for an already prepared drum program.
 *
 * This core owns only an engine-frame clock and bounded PCM playback slots.
 * It has no AudioContext, no React/App dependency, no JS timer, no MessagePort,
 * no LiveMaster and no knowledge of WaveStarter/RFL/particles.
 *
 * All expensive work (musical resolution, DrumRenderRecipe resolution and PCM
 * compilation) must happen before a program is admitted here.
 */
const PROTECTED_DRUM_CORE_VERSION = 1;
const DEFAULT_PROTECTED_DRUM_MAX_VOICES = 64;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const TARGET_FLOOR = 0.0001;
const CHOKE_TIME_CONSTANT_SEC = 0.01;
const chokedEnvelopeValue = (startValue, elapsedAfterChokeSec) => TARGET_FLOOR + (startValue - TARGET_FLOOR)
    * Math.exp(-Math.max(0, elapsedAfterChokeSec) / CHOKE_TIME_CONSTANT_SEC);
class ProtectedDrumCore {
    version = PROTECTED_DRUM_CORE_VERSION;
    sampleRate;
    maxVoices;
    engineFrame = 0;
    program = null;
    pendingProgram = null;
    appliedRevision = null;
    highestSeenRevision = -1;
    cycleStartFrame = 0;
    cycleIndex = 0;
    nextEventIndex = 0;
    playing = false;
    startedEventCount = 0;
    droppedEventCount = 0;
    latestOpenHatSlot = -1;
    active = new Uint8Array(DEFAULT_PROTECTED_DRUM_MAX_VOICES);
    activeBody = new Array(DEFAULT_PROTECTED_DRUM_MAX_VOICES).fill(null);
    bodyFrame = new Int32Array(DEFAULT_PROTECTED_DRUM_MAX_VOICES);
    gainL = new Float64Array(DEFAULT_PROTECTED_DRUM_MAX_VOICES);
    gainR = new Float64Array(DEFAULT_PROTECTED_DRUM_MAX_VOICES);
    openHat = new Uint8Array(DEFAULT_PROTECTED_DRUM_MAX_VOICES);
    envelopePeak = new Float64Array(DEFAULT_PROTECTED_DRUM_MAX_VOICES);
    envelopeAttackSec = new Float64Array(DEFAULT_PROTECTED_DRUM_MAX_VOICES);
    envelopeReleaseSec = new Float64Array(DEFAULT_PROTECTED_DRUM_MAX_VOICES);
    chokeBodyFrame = new Int32Array(DEFAULT_PROTECTED_DRUM_MAX_VOICES);
    chokeStartEnvelope = new Float64Array(DEFAULT_PROTECTED_DRUM_MAX_VOICES);
    constructor(options) {
        this.sampleRate = Math.max(8000, Math.round(options.sampleRate));
        this.maxVoices = Math.max(1, Math.min(DEFAULT_PROTECTED_DRUM_MAX_VOICES, Math.round(options.maxVoices ?? DEFAULT_PROTECTED_DRUM_MAX_VOICES)));
        this.chokeBodyFrame.fill(-1);
    }
    get currentFrame() { return this.engineFrame; }
    get currentRevision() { return this.appliedRevision; }
    get currentCycleIndex() { return this.cycleIndex; }
    get isPlaying() { return this.playing; }
    get totalStartedEvents() { return this.startedEventCount; }
    get totalDroppedEvents() { return this.droppedEventCount; }
    /** Starts immediately at the current engine frame. Intended for cold/lab admission. */
    start(program) {
        if (!this.validateProgram(program) || !this.acceptRevision(program.revision))
            return false;
        this.applyProgram(program, this.engineFrame);
        this.playing = true;
        return true;
    }
    /** Queue a newer immutable program; it is atomically adopted at the next cycle boundary. */
    queueReplaceAtBoundary(program) {
        if (!this.validateProgram(program) || !this.acceptRevision(program.revision))
            return false;
        if (this.program && this.program.requiredVoiceCapacity + program.requiredVoiceCapacity > this.maxVoices)
            return false;
        this.pendingProgram = program;
        return true;
    }
    /** Stop future program events. Already sounding finite bodies are allowed to finish naturally. */
    stopProgram() {
        this.playing = false;
        this.pendingProgram = null;
    }
    /** Lab/panic primitive: stop program and retire all active bodies now. */
    panic() {
        this.stopProgram();
        for (let i = 0; i < this.maxVoices; i += 1)
            this.active[i] = 0;
        this.latestOpenHatSlot = -1;
    }
    renderBlock(left, right) {
        if (left.length !== right.length)
            throw new Error('ProtectedDrumCore requires equal stereo block lengths');
        left.fill(0);
        right.fill(0);
        for (let out = 0; out < left.length; out += 1) {
            if (this.playing && this.program) {
                this.advanceCycleBoundaryIfNeeded();
                while (this.program && this.nextEventIndex < this.program.events.length) {
                    const event = this.program.events[this.nextEventIndex];
                    const eventFrame = this.cycleStartFrame + event.offsetFrame;
                    if (eventFrame > this.engineFrame)
                        break;
                    this.nextEventIndex += 1;
                    if (eventFrame < this.engineFrame) {
                        // A program is never caught up historically. This can only occur after an invalid
                        // control/lifecycle transition, so stale events are dropped locally.
                        this.droppedEventCount += 1;
                        continue;
                    }
                    if (this.startEvent(event))
                        this.startedEventCount += 1;
                    else
                        this.droppedEventCount += 1;
                }
            }
            let l = 0;
            let r = 0;
            for (let slot = 0; slot < this.maxVoices; slot += 1) {
                if (!this.active[slot] || !this.program)
                    continue;
                const body = this.activeBody[slot];
                const pos = this.bodyFrame[slot];
                if (!body || pos >= body.samples.length) {
                    this.active[slot] = 0;
                    if (this.latestOpenHatSlot === slot)
                        this.latestOpenHatSlot = -1;
                    continue;
                }
                let sample = body.samples[pos];
                const chokeAt = this.chokeBodyFrame[slot];
                if (chokeAt >= 0 && pos >= chokeAt && this.openHat[slot]) {
                    const ageSec = pos / this.sampleRate;
                    const chokeSec = chokeAt / this.sampleRate;
                    const original = this.openHatOriginalEnvelope(slot, ageSec);
                    const choked = chokedEnvelopeValue(this.chokeStartEnvelope[slot], ageSec - chokeSec);
                    sample *= original > 1e-12 ? choked / original : 0;
                }
                l += sample * this.gainL[slot];
                r += sample * this.gainR[slot];
                this.bodyFrame[slot] = pos + 1;
            }
            left[out] = l;
            right[out] = r;
            this.engineFrame += 1;
        }
    }
    validateProgram(program) {
        if (program.contractVersion !== 1 || program.sampleRate !== this.sampleRate)
            return false;
        if (!Number.isInteger(program.cycleFrames) || program.cycleFrames <= 0)
            return false;
        if (program.requiredVoiceCapacity > this.maxVoices)
            return false;
        let previous = -1;
        for (const event of program.events) {
            if (!Number.isInteger(event.offsetFrame) || event.offsetFrame < 0 || event.offsetFrame >= program.cycleFrames)
                return false;
            if (!Number.isInteger(event.bodyIndex) || event.bodyIndex < 0 || event.bodyIndex >= program.bodies.length)
                return false;
            if (event.offsetFrame < previous)
                return false;
            previous = event.offsetFrame;
        }
        return program.bodies.every((body) => body.sampleRate === this.sampleRate && body.samples instanceof Float32Array);
    }
    acceptRevision(revision) {
        if (!Number.isInteger(revision) || revision <= this.highestSeenRevision)
            return false;
        this.highestSeenRevision = revision;
        return true;
    }
    applyProgram(program, cycleStartFrame) {
        this.program = program;
        this.appliedRevision = program.revision;
        this.cycleStartFrame = cycleStartFrame;
        this.cycleIndex = 0;
        this.nextEventIndex = 0;
    }
    advanceCycleBoundaryIfNeeded() {
        if (!this.program)
            return;
        while (this.engineFrame >= this.cycleStartFrame + this.program.cycleFrames) {
            const boundary = this.cycleStartFrame + this.program.cycleFrames;
            if (this.pendingProgram) {
                const next = this.pendingProgram;
                this.pendingProgram = null;
                this.program = next;
                this.appliedRevision = next.revision;
                this.cycleStartFrame = boundary;
                this.cycleIndex += 1;
                this.nextEventIndex = 0;
                return;
            }
            this.cycleStartFrame = boundary;
            this.cycleIndex += 1;
            this.nextEventIndex = 0;
        }
    }
    startEvent(event) {
        if (!this.program)
            return false;
        if (event.interaction === 'choke-current-open-hat')
            this.chokeLatestOpenHat();
        let slot = -1;
        for (let i = 0; i < this.maxVoices; i += 1) {
            if (!this.active[i]) {
                slot = i;
                break;
            }
        }
        if (slot < 0)
            return false;
        const panX = (clamp(event.pan, -1, 1) + 1) * 0.5;
        const left = Math.cos(panX * Math.PI * 0.5);
        const right = Math.sin(panX * Math.PI * 0.5);
        if (this.latestOpenHatSlot === slot)
            this.latestOpenHatSlot = -1;
        this.active[slot] = 1;
        this.activeBody[slot] = this.program.bodies[event.bodyIndex];
        this.bodyFrame[slot] = 0;
        this.gainL[slot] = left;
        this.gainR[slot] = right;
        this.chokeBodyFrame[slot] = -1;
        this.openHat[slot] = event.interaction === 'register-open-hat' ? 1 : 0;
        if (this.openHat[slot])
            this.latestOpenHatSlot = slot;
        if (event.openHatEnvelope) {
            this.envelopePeak[slot] = event.openHatEnvelope.peakGain;
            this.envelopeAttackSec[slot] = event.openHatEnvelope.attackSec;
            this.envelopeReleaseSec[slot] = event.openHatEnvelope.targetTimeConstantSec;
        }
        else {
            this.envelopePeak[slot] = 0;
            this.envelopeAttackSec[slot] = 0;
            this.envelopeReleaseSec[slot] = 0;
        }
        return true;
    }
    chokeLatestOpenHat() {
        const slot = this.latestOpenHatSlot;
        if (slot < 0 || !this.active[slot] || !this.openHat[slot] || this.chokeBodyFrame[slot] >= 0)
            return;
        const pos = this.bodyFrame[slot];
        this.chokeBodyFrame[slot] = pos;
        this.chokeStartEnvelope[slot] = this.openHatOriginalEnvelope(slot, pos / this.sampleRate);
    }
    openHatOriginalEnvelope(slot, ageSec) {
        const peak = this.envelopePeak[slot];
        const attack = this.envelopeAttackSec[slot];
        if (ageSec <= 0)
            return TARGET_FLOOR;
        if (ageSec < attack) {
            const ratio = ageSec / Math.max(1e-12, attack);
            return TARGET_FLOOR + (peak - TARGET_FLOOR) * ratio;
        }
        return TARGET_FLOOR + (peak - TARGET_FLOOR)
            * Math.exp(-(ageSec - attack) / Math.max(1e-12, this.envelopeReleaseSec[slot]));
    }
}

class XensonarProtectedDrumB5Processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const p = options?.processorOptions ?? {};
    this.core = new ProtectedDrumCore({ sampleRate, maxVoices: p.maxVoices ?? 64 });
    this.program = p.program;
    this.startAtFrame = Math.max(0, Math.round(p.startAtFrame ?? currentFrame));
    this.started = false;
    this.reported = false;
  }
  process(_inputs, outputs) {
    const out = outputs[0];
    if (!out || !out[0]) return true;
    const left = out[0];
    const right = out[1] ?? out[0];
    left.fill(0); right.fill(0);
    if (!this.started) {
      const blockStart = currentFrame;
      const blockEnd = blockStart + left.length;
      if (this.startAtFrame >= blockEnd) return true;
      const offset = Math.max(0, this.startAtFrame - blockStart);
      this.started = this.core.start(this.program);
      if (!this.reported) {
        this.reported = true;
        this.port.postMessage({ kind: this.started ? 'started' : 'start-rejected', startAtFrame: this.startAtFrame, blockStart });
      }
      if (!this.started) return true;
      if (offset > 0) {
        this.core.renderBlock(left.subarray(offset), right.subarray(offset));
        return true;
      }
    }
    this.core.renderBlock(left, right);
    return true;
  }
}
registerProcessor('xensonar-protected-drum-b5', XensonarProtectedDrumB5Processor);`,Mk=new WeakMap,$Ie="xensonar-protected-drum-b5";function XIe(){if(typeof window>"u")return"off";const e=new URL(window.location.href).searchParams.get("bdrumB5")?.toLowerCase();if(e==="direct"||e==="master")return e;const t=window.location.pathname.toLowerCase();return t.includes("b5_direct")?"direct":t.includes("b5_master")?"master":"off"}async function JIe(e){const t=Mk.get(e);if(t)return t;const n=(async()=>{const r=new Blob([KIe],{type:"text/javascript"}),a=URL.createObjectURL(r);try{await e.audioWorklet.addModule(a)}finally{URL.revokeObjectURL(a)}})();Mk.set(e,n);try{await n}catch(r){throw Mk.delete(e),r}}function ZIe(e){if(typeof document>"u"||e==="off")return null;const t="xensonar-bdrum-b5-badge";let n=document.getElementById(t);return n||(n=document.createElement("div"),n.id=t,Object.assign(n.style,{position:"fixed",right:"12px",top:"12px",zIndex:"2147483647",padding:"7px 10px",borderRadius:"7px",font:"600 11px/1.2 monospace",background:"rgba(5,10,18,.88)",color:"#d9f7ff",border:"1px solid rgba(120,220,255,.45)",pointerEvents:"none",letterSpacing:".02em"}),document.body.appendChild(n)),n}function eEe(e){const t=P.useMemo(XIe,[]),n=P.useRef(!1),r=P.useRef(0),[a,o]=P.useState(t==="off"?"off":"waiting-audio"),[i,s]=P.useState(t==="off"?"B5 off":"waiting for audio"),l=e.params;return P.useEffect(()=>{const c=ZIe(t);c&&(c.textContent=`B-DRUM B5-${t==="direct"?"A DIRECT":"B MASTER"} · ${a}`)},[t,a]),P.useEffect(()=>{if(n.current=!1,t==="off"){o("off"),s("B5 off");return}if(!e.audioCtx||!e.nexusActive||!l.drumActive){o("waiting-audio"),s("waiting for active audio + drums");return}if(l.drumConfigMode!=="exported"&&eR(l.drumPattern)){o("unsupported-rhythmforge"),s("B5 diagnostic currently requires classic preset or exported drum config");return}let c=!1,d=null,p=null,f=null,b=null;const g=e.audioCtx,y=++r.current;return(async()=>{o("compiling"),s("compiling exact PCM bodies");const A=yS(l.quantizeBpm,16,1),M=Q9({drumEdge:l.drumEdge,drumSoftness:l.drumSoftness,drumAir:l.drumAir,drumSnap:l.drumSnap,grooveSwing:l.grooveSwing}),v=bc(l.drumLaneKits),w=l.drumConfigMode==="exported"&&e.selectedExportedDrumConfig?BIe({entry:e.selectedExportedDrumConfig,stepDurationSec:A,drumLevel:l.drumVolume,drumStyle:M,runtimeGlobalKit:l.drumKit,laneKitOverrides:v}):TIe({pattern:l.drumPattern,stepDurationSec:A,drumLevel:l.drumVolume,kit:l.drumKit,drumStyle:M,laneKitOverrides:v}),R=IIe(g.sampleRate,ble(11915562)),k=await qIe(w,{sampleRate:g.sampleRate,noiseTable:R});if(c)return;const I=UIe(w,k,{revision:y,sampleRate:g.sampleRate,noiseTable:R});if(await JIe(g),c)return;sh(g,e.liveMasterBusRuntimeRefs);const E=t==="master"?Cj(g,e.liveMasterBusRuntimeRefs):e.liveMasterBusRuntimeRefs.finalOutputTrimRef.current;if(!E)throw new Error("B5 direct output trim unavailable after final mix initialization");const F=I.cycleFrames/g.sampleRate,L=g.currentTime+Math.max(.12,A*2),B=Math.ceil(L/F)*F,O=Math.round(B*g.sampleRate);d=new AudioWorkletNode(g,$Ie,{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{program:I,maxVoices:64,startAtFrame:O}}),p=g.createGain(),p.gain.value=1,f=La(d,p,{label:"bdrum-b5:worklet->diagnostic-gain",subsystem:"diagnostics"}),b=La(p,E,{label:t==="master"?"bdrum-b5:diagnostic-gain->rhythm-master":"bdrum-b5:diagnostic-gain->final-output-trim",subsystem:"diagnostics"}),d.port.onmessage=T=>{c||!T.data||(T.data.kind==="started"?(n.current=!0,o("running"),s(`running at context frame ${T.data.startAtFrame}`)):T.data.kind==="start-rejected"&&(n.current=!1,o("error"),s("worklet rejected prepared program")))},o("armed"),s(`armed for next cycle boundary @ ${B.toFixed(3)}s`)})().catch(A=>{c||(n.current=!1,o("error"),s(A instanceof Error?A.message:String(A)))}),()=>{c=!0,n.current=!1;try{d?.disconnect()}catch{}try{p?.disconnect()}catch{}f?.markReleased("bdrum-b5-cleanup"),b?.markReleased("bdrum-b5-cleanup"),d&&(d.port.onmessage=null)}},[t,e.audioCtx,e.nexusActive,e.selectedExportedDrumConfig,e.liveMasterBusRuntimeRefs,l.drumActive,l.drumConfigMode,l.drumPattern,l.drumKit,l.drumLaneKits,l.drumVolume,l.drumEdge,l.drumSoftness,l.drumAir,l.drumSnap,l.grooveSwing,l.drumDecay,l.quantizeBpm]),{mode:t,status:a,ownsBeatRef:n,message:i}}function tEe(){const[e,t]=P.useState(0),n=P.useRef([]),r=P.useCallback((o,i)=>{if(o.step16%4!==0)return;const s=Math.max(0,(o.timeSec-i)*1e3),l=window.setTimeout(()=>{t(c=>c+1)},s);n.current.push(l)},[]),a=P.useCallback(()=>{n.current.forEach(o=>window.clearTimeout(o)),n.current=[]},[]);return P.useMemo(()=>({metronomePulse:e,metronomeTimeoutsRef:n,scheduleStableRhythmMetronomePulse:r,clearStableRhythmMetronomeTimeouts:a}),[a,e,r])}function nEe(e){const t=H9({refs:e.refs,waveRadius:e.params.waveRadius,waveDecay:e.params.waveDecay,baseWaveMaxRadius:e.baseWaveMaxRadius,clampValue:e.clampValue});e.markWaveLaunch();const n=e.freqFromY(t.cursorY);return(e.resolvePlayAudio?e.resolvePlayAudio({cursorY:t.cursorY,freq:n}):e.playAudio!==!1)&&e.playWaveStartSound(n,!1,{waveLaunchX:t.cursorX}),t}
const rEe=({gameWidth:e,gameHeight:t})=>({cursorX:e/2,cursorY:t/2,wobble:0,wobblePhase:0,osc:null,oscB:null,filter:null,gain:null,gainB:null,lfo:null,lfoGain:null,delayNode:null,delayFeedback:null,droneGroupBus:null,droneRhythmGain:null,droneVolumeBus:null,droneDriveRefs:null,flangerDelay:null,flangerFeedback:null,flangerLfo:null,flangerLfoGain:null,flangerWet:null,myceliumFormantFilter:null,myceliumFormantGain:null,myzelCarrierOsc:null,myzelSubOsc:null,myzelCarrierGain:null,myzelSubGain:null,myzelBodyGain:null,myzelMasterGain:null,myzelPan:null,myzelDriveGain:null,myzelDriveShaper:null,myzelColorPostGain:null,myzelAirSend:null,myzelAirWetGain:null,myzelAirDelay:null,myzelAirFeedback:null,myzelAirHighpass:null,myzelLowpass:null,myzelFormantFilters:[],myzelFormantGains:[],myzelOvertoneOscs:[],myzelOvertoneGains:[],myzelConstellationFilter:null,myzelConstellationOscs:[],myzelConstellationGains:[],room3BodyNoiseSource:null,room3BodyNoiseGain:null,room3BodyPulseOsc:null,room3BodyPulseGain:null,room3BodyExciterGain:null,room3BodyPreDriveGain:null,room3BodyPreDriveShaper:null,room3BodyToneBus:null,room3BodyHighpass:null,room3BodyLowpass:null,room3BodyPostDriveShaper:null,room3BodyMaster:null,room3BodyModeFilters:[],room3BodyModeGains:[],overtoneMaster:null,manualJiMaster:null,manualJiOscs:{},manualJiGains:{},jiOscs:{},jiGains:{},ripples:[],impactRipples:[],agents:[],sectorPulses:[],directedPulses:[],nextAbsoluteStep:null,noiseBuffer:null,_semanticDevice:null,_topologicalResonator:null}),dO=e=>({cursorX:e.current.cursorX,cursorY:e.current.cursorY,wobble:e.current.wobble,wobblePhase:e.current.wobblePhase}),aEe=(e,t)=>(e.current.cursorY=t,t),oEe=e=>{e.current.ripples=[],e.current.sectorPulses=[],e.current.directedPulses=[],e.current.impactRipples=[],e.current.nextAbsoluteStep=null};function iEe({nexusParamsRef:e,updateNParams:t}){return{setDronePreset:i=>{const l=e.current.droneJIOvertonesByPreset[i]??Ud();t({dronePreset:i,droneJIOvertones:{...l},...__xenDronePresetStart(i)})},setDroneOvertone:(i,s)=>{const l=e.current.dronePreset,c=e.current.droneJIOvertonesByPreset,d={...c[l]??Ud(),[i]:s};t({droneJIOvertones:d,droneJIOvertonesByPreset:{...c,[l]:d}})},setWaveOvertone:(i,s)=>{t({waveOvertones:{...e.current.waveOvertones,[i]:s}})},applyWaveOvertonePreset:i=>{const s=mH.find(l=>l.value===i);s&&t({waveOvertonesEnabled:i==="empty"?e.current.waveOvertonesEnabled:!0,waveOvertones:{...s.mix},waveOvertoneGlobalLevel:s.globalLevel})}}}function sEe(e,t){return t.includes(e)?t.filter(n=>n!==e):[...t,e]}function __xenGridOffsetValue(value){return Me(value,-50,50)}
function __xenGridShiftCents(tuning,offsets){const count=Zd(tuning);let total=0;for(let i=0;i<count;i++)total+=offsets?.[i]??0;return count?total/count*10:0}
function __xenShiftGridOffsets(tuning,offsets,targetCents){
 const count=Zd(tuning),values=Array.from({length:count},(_,i)=>__xenGridOffsetValue(offsets?.[i]??0));
 if(!Number.isFinite(targetCents)||!count)return values;
 let low=-Infinity,high=Infinity;for(const value of values){low=Math.max(low,-50-value);high=Math.min(high,50-value)}
 const delta=Me((targetCents-__xenGridShiftCents(tuning,values))/10,low,high);
 return values.map(value=>__xenGridOffsetValue(value+delta));
}
function lEe(e,t,n,r){const a=[...t??Array.from({length:e},()=>0)];return a[n]=__xenGridOffsetValue(r),a}function cEe(e,t,n){n({manualGridMutedSteps:WSe(e,t)})}function uEe(e){const{params:t,step:n,updateNParams:r,commitResonanceCursorY:a,currentCursorY:o}=e,i=CW(t.gridTuning,n),s=t.manualGridMutedSteps??[],l=sEe(i,s);cEe(t.gridTuning,l,r),t.lockCursorToGrid&&a(o,{syncHud:!1})}function dEe(e){const{params:t,step:n,offsetValue:r,updateNParams:a,commitResonanceCursorY:o,currentCursorY:i}=e,s=Zd(t.gridTuning),l=CW(t.gridTuning,n),c=lEe(s,t.manualGridStepOffsets,l,r);a({manualGridStepOffsets:c}),t.lockCursorToGrid&&o(i,{syncHud:!1})}function mEe(e){const{params:t,nextTuning:n,updateNParams:r,keyboardWindowOffsetRef:a,commitResonanceCursorY:o,setKeyboardWindowStamp:i,currentCursorY:s}=e,{newGridStates:l,resolvedGridMode:c,nextMutes:d,nextOffsets:p}=qSe({gridTuning:t.gridTuning,gridMode:t.gridMode,gridBase:t.gridBase,rememberGrid:t.rememberGrid,gridStates:t.gridStates,manualGridMutedSteps:t.manualGridMutedSteps??[],manualGridStepOffsets:t.manualGridStepOffsets??[]},n);r({gridTuning:n,gridMode:c,gridStates:l,manualGridMutedSteps:d,manualGridStepOffsets:p}),a.current=0,t.lockCursorToGrid?o(s,{syncHud:!1,refreshKeyboardWindow:!0}):i(f=>f+1)}function pEe(e){return $Se({gridTuning:e.gridTuning,gridBase:e.gridBase,manualGridMutedSteps:e.manualGridMutedSteps??[],manualGridStepOffsets:e.manualGridStepOffsets??[]})}function hEe({nexusParamsRef:e,nexusRefs:t,updateNParams:n,commitResonanceCursorY:r,keyboardWindowOffsetRef:a,setKeyboardWindowStamp:o}){return{shiftGridOffsets:cents=>{const p=e.current;n({manualGridStepOffsets:__xenShiftGridOffsets(p.gridTuning,p.manualGridStepOffsets,cents)});p.lockCursorToGrid&&r(t.current.cursorY,{syncHud:!1})},toggleManualGridStepMute:d=>{uEe({params:e.current,step:d,updateNParams:n,commitResonanceCursorY:r,currentCursorY:t.current.cursorY})},setManualGridStepOffset:(d,p)=>{dEe({params:e.current,step:d,offsetValue:p,updateNParams:n,commitResonanceCursorY:r,currentCursorY:t.current.cursorY})},changeGridTuning:d=>{mEe({params:e.current,nextTuning:d,updateNParams:n,keyboardWindowOffsetRef:a,commitResonanceCursorY:r,setKeyboardWindowStamp:o,currentCursorY:t.current.cursorY})},getVisibleGridLines:()=>__xenGridMuted(e.current)?__xenEmptyGrid:pEe({gridTuning:e.current.gridTuning,gridBase:e.current.gridBase,manualGridMutedSteps:e.current.manualGridMutedSteps,manualGridStepOffsets:e.current.manualGridStepOffsets})}}function fEe({particleSystem:e,audioCtx:t,audioCtxRef:n,nexusParamsRef:r,nexusRefs:a,updateNParams:o,playNexusAgentTone:i}){const s=lw(e),l=p=>{const f=a.current.agents[p],b=n.current??t;if(!f||!b)return;const g=r.current,y=Qa(a.current.cursorY),x=NT({rootFreq:y,ratio:f.ratio,minHz:80,maxHz:2400});i(x.playbackFreq,g.particleVolume*(g.agentVolumes[p]??1)*.72,g.echoOn&&a.current.delayNode?a.current.delayNode:void 0,void 0,void 0,{x:f.x,y:f.y},"particle",y,{agentIndex:p})};return{activeParticleNodes:s,toggleNexusAgent:(p,f)=>{const b=[...r.current.agentEnabled],g=!!b[p];b[p]=!b[p];const y=a.current.agents[p];y&&(y.lastHit=b[p]?0:Number.POSITIVE_INFINITY,y.lastHitAudioTimeSec=void 0),o({agentEnabled:b}),f?.pingOnEnable&&!g&&b[p]&&l(p)},setNexusAgentVolume:(p,f)=>{const b=[...r.current.agentVolumes];b[p]=f,o({agentVolumes:b})}}}function gEe({nexusParamsRef:e,nexusRefs:t,updateNParams:n,commitResonanceCursorY:r}){const a=l=>{const{nodes:c,nexusPatch:d}=ike(l,e.current.churchMode),p=vr*.5,f=ir*.5;t.current.agents=c.map((g,y)=>({x:p+Math.cos(Math.PI*2*y/c.length)*(120+Math.random()*90),y:f+Math.sin(Math.PI*2*y/c.length)*(120+Math.random()*90),vx:(Math.random()-.5)*50,vy:(Math.random()-.5)*50,ratio:g.ratio,label:g.label,phase:Math.random()*Math.PI*2,lastHit:0,lastHitAudioTimeSec:0,lastHitGain:1,lastHitX:p,lastHitY:f,history:[]}));const b=e.current;n({...d,quantizeOn:b.quantizeOn,quantizeBpm:b.quantizeBpm})};return{setParticleSystem:a,cycleParticleSystem:(l=1)=>{const c=["ji","12edo","bp"],d=e.current.particleSystem,f=(c.indexOf(d)+l+c.length)%c.length;a(c[f])},setChurchMode:l=>{const{nextEnabled:c,nexusPatch:d}=ske(e.current.particleSystem,l);t.current.agents.forEach((p,f)=>{f>=c.length||(p.lastHit=c[f]?0:Number.POSITIVE_INFINITY,p.lastHitAudioTimeSec=void 0)}),n(d)},setGridMode:l=>{const{nexusPatch:c}=lke(e.current.gridTuning,l);n(c),e.current.lockCursorToGrid&&r(t.current.cursorY,{syncHud:!1})}}}const bEe=new WeakMap,yEe=new WeakMap;function o7(e,t){const n=(e.get(t)??0)+1;return e.set(t,n),{generation:n,isCurrent:()=>e.get(t)===n}}async function SEe(e){
  const token=o7(bEe,e.waveSoundRuntimeRef),context=await e.initAudio();
  if(!context||!token.isCurrent())return;
  if(e.selectionId?.startsWith('nodal:')){
    // Preview owns a note, NOT the live lane's instrument selection.
    try{await __XenNodalSurfaces.preview('wave',e.selectionId,{frequency:220,gain:Math.max(e.waveSoundRuntimeRef.current.volume,.22),isCurrent:token.isCurrent},context)}catch(error){console.warn('Nodal wave preview unavailable',error)}
    return;
  }
  const source=$w(e.selectionId);
  if(source.kind==='sample'&&(!await bw(source.sampleId,context)||!token.isCurrent()))return;
  // Wave preview provides a one-shot override. Never temporarily edit live
  // preset, enabled flag, overtone parameters, or ongoing arp queues.
  e.playWaveStartSound(220,false,{waveStarterPresetOverride:e.selectionId,waveStarterPreview:true});
}
async function vEe(e){
  const token=o7(yEe,e.nexusParamsRef),context=await e.initAudio();
  if(!context||!token.isCurrent())return;
  if(e.selectionId?.startsWith('nodal:')){
    try{await __XenNodalSurfaces.preview('particle',e.selectionId,{frequency:330,gain:.16,isCurrent:token.isCurrent},context)}catch(error){console.warn('Nodal particle preview unavailable',error)}
    return;
  }
  const source=BT(e.selectionId);
  if(source.kind==='sample'&&(!await bw(source.sampleId,context)||!token.isCurrent()))return;
  const gain=Math.min(.24,Math.max(.08,Math.max(e.nexusParamsRef.current.particleVolume,.12)));
  e.playNexusAgentTone(330,gain,void 0,void 0,e.selectionId,{x:e.gameWidth*.5,y:e.gameHeight*.45},'preview');
}
function AEe({initAudio:e,waveSoundRuntimeRef:t,nexusParamsRef:n,waveOvertoneArpQueueRef:r,playWaveStartSound:a,playNexusAgentTone:o,gameWidth:i,gameHeight:s}){return{previewWavePresetSelection:async d=>SEe({initAudio:e,waveSoundRuntimeRef:t,nexusParamsRef:n,waveOvertoneArpQueueRef:r,playWaveStartSound:a,selectionId:d}),previewParticlePresetSelectionAction:async d=>vEe({initAudio:e,nexusParamsRef:n,playNexusAgentTone:o,selectionId:d,gameWidth:i,gameHeight:s})}}function xEe({ensureAudioReady:e,residentAddFrequencyHz:t,customResidentSoundPreset:n,customResidentElasticPitch:r,installationFieldConfigRef:a,playNexusAgentTone:o}){return{previewPendingCustomResident:async()=>{if(!await e())return;const l=Tj(n,{elasticPitch:r});o(t*l.collision.freqMul,jP(a.current,.16,l.collision.ampMul),void 0,void 0,l.collision.preset,void 0,"resident")}}}const MEe=[],wk=()=>{const e=Gd(750);return O0(e).pressureBias},wEe=()=>fY(Gd(750));