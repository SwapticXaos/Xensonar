/* P6 — Performance-only keyboard root separation; no new AudioNodes/timers/tuning compilers.
   Space holds the last foundation pitch. While held, keyboard still performs its original
   note/glissando/preview path but cannot retune Bass, Drone or RFL. After keyup the
   foundation stays latched until the next intentional pitch gesture, avoiding catchup. */
const __xenKeyboardFoundationDetach=(()=>{
 let state=Object.freeze({held:false,pending:false,rootHz:null,cursorY:null});
 const listeners=new Set(),emit=()=>{for(const cb of listeners)cb()};
 const validHz=v=>Number.isFinite(v)&&v>0?v:null;
 const press=(hz,y)=>{
  if(state.held)return;
  const rootHz=validHz(hz),cursorY=Number.isFinite(y)?y:null;
  state=Object.freeze({held:true,pending:false,rootHz,cursorY});emit();
 };
 const release=()=>{
  if(!state.held)return;
  state=Object.freeze({held:false,pending:false,rootHz:null,cursorY:null});emit();
 };
 const resume=()=>{
  if(!state.pending&&!state.held)return;
  state=Object.freeze({held:false,pending:false,rootHz:null,cursorY:null});emit();
 };
 const freezeActive=()=>state.held||state.pending;
 const rootHz=()=>freezeActive()?state.rootHz:null;
 const cursorY=()=>freezeActive()?state.cursorY:null;
 if(typeof window!=='undefined'){
  window.addEventListener('blur',resume);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resume()});
 }
 return {press,release,resume,freezeActive,rootHz,cursorY,
  isHeld:()=>state.held,hasPendingRelease:()=>state.pending,
  snapshot:()=>state,subscribe:cb=>(listeners.add(cb),()=>listeners.delete(cb))};
})();
function __xenKeyboardFoundationReleaseAfterNextGesture(gesture){
 if(gesture&&__xenKeyboardFoundationDetach.hasPendingRelease())__xenKeyboardFoundationDetach.resume();
}
function __XenKeyboardDetachBadge(){
 const state=P.useSyncExternalStore(__xenKeyboardFoundationDetach.subscribe,
   __xenKeyboardFoundationDetach.snapshot,__xenKeyboardFoundationDetach.snapshot);
 const label=state.held
   ?'Space held · Keyboard melody detached; Bass, Drone and RFL roots stay on their last pitch'
   :'Space (hold) · Decoupling Mode';
 return u.jsx(kb,{kind:'decouple',active:state.held||state.pending,title:label});
}
/* XenSonar P1/P2: sparse, per-grid derived Bass Grid; no new grid library or scheduler. */
/* Conventional JI reference points are orientation labels, not forced quantization. */
function __XenBassGridInterval(cents){
 const names=[[0,'Root'],[111.731,'minor 2nd'],[203.91,'major 2nd'],
  [315.641,'minor 3rd'],[386.314,'major 3rd'],[498.045,'4th'],
  [701.955,'5th'],[813.686,'minor 6th'],[884.359,'major 6th'],
  [996.09,'minor 7th'],[1088.269,'major 7th'],[1200,'Octave']];
 const octave=((cents%1200)+1200)%1200;
 const nearest=names.map(([at,name])=>({name,delta:Math.abs(octave-at)})).sort((a,b)=>a.delta-b.delta)[0];
 if(!nearest||nearest.delta>32)return {label:'',fifth:false};
 return {label:(nearest.delta>2?'~':'')+nearest.name,fifth:nearest.name==='5th'};
}
const __XenBassGrid=(()=>{
 const KEY='xensonar:grid-tuning-library:derived-v1';
 const listeners=new Set();
 let liveOverride=null,liveVisual=null; // Mutable only in memory; no localStorage writes from stage gestures.

 const cleanId=id=>typeof id==='string'&&id.length<160?id:'12edo';
 const num=(x,a,b,d=0)=>Number.isFinite(Number(x))?Math.max(a,Math.min(b,Number(x))):d;
 const normalize=raw=>{
  const v=raw&&typeof raw==='object'?raw:{};
  const mutedDegrees=[...new Set((Array.isArray(v.mutedDegrees)?v.mutedDegrees:[]).filter(Number.isInteger).filter(x=>x>=0&&x<256))].sort((a,b)=>a-b);
  const offsetsCents={};for(const [k,x] of Object.entries(v.offsetsCents&&typeof v.offsetsCents==='object'?v.offsetsCents:{})){
   const n=Number(k);if(!Number.isInteger(n)||n<0||n>=256)continue;
   const cents=num(x,-1200,1200,0);if(Math.abs(cents)>1e-5)offsetsCents[n]=cents;
  }
  const sourceMode=v.sourceMode==='linked'?'linked':'derived';
  const linkedTuningId=typeof v.linkedTuningId==='string'&&v.linkedTuningId.length<160?v.linkedTuningId:'';
  const linkedMutedDegrees=[...new Set((Array.isArray(v.linkedMutedDegrees)?v.linkedMutedDegrees:[]).filter(Number.isInteger).filter(x=>x>=0&&x<256))].sort((a,b)=>a-b);
  // Separately authored session-stage mutes remain visible in grey, unlike manager exclusions.
  const stageMutedDegrees=[...new Set((Array.isArray(v.stageMutedDegrees)?v.stageMutedDegrees:[]).filter(Number.isInteger).filter(x=>x>=0&&x<256))].sort((a,b)=>a-b);
  return {sourceMode,linkedTuningId,linkedMutedDegrees,stageMutedDegrees,droneEnabled:v.droneEnabled===true&&v.enabled!==false,rflEnabled:v.rflEnabled===true&&v.enabled!==false,mutedDegrees,offsetsCents,inheritMainMutes:false};
 };
 let state={version:1,source:'main',grids:{}};
 try{const loaded=JSON.parse(localStorage.getItem(KEY)||'null');if(loaded&&typeof loaded==='object'){
  state.source=['bass','main-grid'].includes(loaded.source)?loaded.source:'main';for(const [id,value] of Object.entries(loaded.grids||{}))if(cleanId(id)===id)state.grids[id]=normalize(value);
 }}catch{}
 let snapshot={...state,serial:0};let table=null,mainTable=null,mainPeriodRatio=2,compiledPeriodRatio=2,visualRows=Object.freeze([]);let lastParams=null,missing=false,compiledKey='',libraryRevision=0,compileCount=0;
 // P7.39.26 — Read-only bass-note visual tap. No React updates, library writes or
 // work on the audio thread; bounded 48-slot ledger of notes already scheduled by Bass.
 const visualNotes=Array.from({length:48},()=>({token:0,hz:0,start:0,end:0}));
 let visualNoteCtx=null,visualNoteIndex=0,visualNoteToken=0;
 const playedVisual={hz:0,strength:0}; // Reuse result: no allocation per draw frame.
 function recordPlayedBass(hz,start,duration,ctx){
  if(effectiveSource()!=='bass'||!(hz>0)||!Number.isFinite(start)||!(duration>0)||!ctx)return 0;
  if(visualNoteCtx!==ctx){visualNoteCtx=ctx;visualNoteIndex=0;for(const row of visualNotes)row.token=0;}
  const row=visualNotes[visualNoteIndex++%visualNotes.length];
  visualNoteToken=(visualNoteToken+1)||1;
  row.token=visualNoteToken;row.hz=hz;row.start=start;row.end=start+duration;
  return row.token;
 }
 function cancelPlayedBass(token){
  if(!token)return;
  for(const row of visualNotes)if(row.token===token){row.token=0;return;}
 }
 function playedBass(){
  if(effectiveSource()!=='bass'||!visualNoteCtx)return null;
  const now=visualNoteCtx.currentTime;let chosen=null;
  for(const row of visualNotes){
   if(row.token&&row.start<=now&&now<row.end+.11&&(!chosen||row.start>chosen.start||(row.start===chosen.start&&row.token>chosen.token)))chosen=row;
  }
  if(!chosen)return null;
  playedVisual.hz=chosen.hz;
  playedVisual.strength=now<chosen.end?1:Math.max(0,1-(now-chosen.end)/.11);
  return playedVisual;
 }
 // Stage-only activity selector: one existing Bass/Drone/RFL grid projection,
 // never an oscillator, quantizer instance, scheduler, React update or storage write.
 const gridActivity={hz:0,strength:1,source:'',periodCents:1200};
 function activeGrid(params,inputs){
  if(!params||!inputs||!table||!visualRows.length)return null;
  const bass=effectiveSource()==='bass'&&params.bassActive!==false&&Number(params.bassVolume??.1)>0;
  const drone=droneUsesGrid(params)&&inputs.droneAudible===true;
  const rfl=rflUsesGrid(params)&&inputs.rflAudible===true&&params.rootFollowLoopActive===true&&!!params.rootFollowLoopId&&Number(params.rootFollowLoopVolume??.5)>0;
  if(!bass&&!drone&&!rfl)return null;
  const base=Number(inputs.foundationHz);
  let hz=Number.NaN,source='',strength=1;
  // P7.39.28: the visible degree means ROOT, not the latest Pattern note.
  // Pattern notes retain their own fretless ratios and must never steal this marker.
  if(bass){hz=resolveBassRoot(params.bassRootMode,params.bassRootHz,base);source='bass';}
  else if(rfl){hz=quantizeRFL(base);source='rfl';}
  else if(drone){hz=quantizeDrone(base);source='drone';}
  if(!(hz>0)||!Number.isFinite(hz))return null;
  const tuning=cleanId(params.gridTuning||'12edo'),cfg=effective(tuning);
  const period=vF(cfg.sourceMode==='linked'?cfg.linkedTuningId:tuning);
  gridActivity.hz=hz;gridActivity.source=source;gridActivity.strength=strength;
  gridActivity.periodCents=Number.isFinite(period)&&period>0?period:1200;
  return gridActivity;
 }
 // One lit marker even when the audio generator sounds several periods lower.
 // Degree match is in cents modulo the ACTUAL tuning period (not assumed 12-EDO).
 // The nearest visible period to Main's pitch is chosen; muted markers never glow.
 // Per-row compatibility depends on the snapped pitch/period, not the moving
 // cursor. Retain one projection per row-array; exact snapshots also detect
 // in-place edits, row replacement/reordering and mute changes.
 const __xenBassVisualProjection=new WeakMap();
 function projectPlayedRow(rows,played,mainHz){
  if(!played||!Array.isArray(rows)&&!rows?.length||!(played.hz>0))return null;
  const period=played.periodCents; if(!(period>0))return null;
  const guide=Number(mainHz)>0?Number(mainHz):played.hz;
  let candidates=rows;
  if(Array.isArray(rows)){
   let cached=__xenBassVisualProjection.get(rows),valid=!!cached&&cached.hz===played.hz&&cached.period===period&&cached.refs.length===rows.length;
   if(valid)for(let i=0;i<rows.length;i++){
    const row=rows[i];if(cached.refs[i]!==row||!Object.is(cached.freq[i],row.freq)||!Object.is(cached.muted[i],row.muted)){valid=false;break}
   }
   if(!valid){
    const refs=[],freq=[],muted=[],matches=[];
    for(const row of rows){
     refs.push(row);freq.push(row.freq);muted.push(row.muted);
     if(row.muted||!(row.freq>0))continue;
     const delta=1200*Math.log2(row.freq/played.hz),periods=Math.round(delta/period);
     if(Math.abs(delta-periods*period)>1.6)continue;
     matches.push(row);
    }
    cached={hz:played.hz,period,refs,freq,muted,matches};__xenBassVisualProjection.set(rows,cached);
   }
   candidates=cached.matches;
  }
  let best=null,bestDistance=Infinity;
  for(const row of candidates){
   // The non-array fallback retains the pre-existing iterable contract.
   if(!Array.isArray(rows)){
    if(row.muted||!(row.freq>0))continue;
    const delta=1200*Math.log2(row.freq/played.hz),periods=Math.round(delta/period);
    if(Math.abs(delta-periods*period)>1.6)continue;
   }
   const distance=Math.abs(Math.log2(row.freq/guide));
   if(distance<bestDistance){bestDistance=distance;best=row;}
  }
  return best;
 }
 function emit(){snapshot={...state,serial:snapshot.serial+1};table=null;for(const listener of listeners)listener()}
 function persist(){compiledKey='';try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}emit();if(lastParams)prepare(lastParams)}
 const read=id=>normalize(state.grids[cleanId(id)]);
 const effective=id=>liveOverride&&liveOverride.tuningId===id?normalize(liveOverride.profile.bassConfig):read(id);
 const visualIdentity=id=>JSON.stringify([id,liveOverride?.tuningId===id?liveOverride.instanceId:null,effective(id).sourceMode,effective(id).linkedTuningId]);
 function visualFor(id){return liveVisual?.identity===visualIdentity(id)?liveVisual:null}
 function withVisual(id){const original=effective(id),visual=visualFor(id);
  if(!visual)return original;
  return {...original,offsetsCents:{...original.offsetsCents,...visual.offsetsCents}};
 }
 function emitVisual(){compiledKey='';emit();if(lastParams)prepare(lastParams)}
 function editVisualDegree(degree,kind,value){
  const id=cleanId(lastParams?.gridTuning||'12edo'),desc=descriptor(id);
  if(!desc.available||!Number.isInteger(degree)||degree<0||degree>=desc.steps.length)return false;
  const identity=visualIdentity(id),current=visualFor(id)||{identity,mutes:[],offsetsCents:{}};
  if(kind==='mute'){
   const set=new Set(current.mutes);set.has(degree)?set.delete(degree):set.add(degree);
   liveVisual={...current,mutes:[...set]};
  }else if(kind==='offset'){
   if(!Number.isFinite(value))return false;
   liveVisual={...current,offsetsCents:{...current.offsetsCents,[degree]:num(value,-1200,1200)}};
  }else return false;
  emitVisual();return true;
 }
 function visualOffset(degree){const id=cleanId(lastParams?.gridTuning||'12edo');return Number(visualFor(id)?.offsetsCents?.[degree]??effective(id).offsetsCents[degree]??0)}
 function hasVisualEdits(){const v=lastParams?visualFor(cleanId(lastParams.gridTuning||'12edo')):null;return !!v&&(v.mutes.length>0||Object.keys(v.offsetsCents).length>0)}
 function sessionConfig(){const id=cleanId(lastParams?.gridTuning||'12edo'),v=visualFor(id),original=withVisual(id),stage=new Set(original.stageMutedDegrees);
  for(const degree of v?.mutes||[])stage.has(degree)?stage.delete(degree):stage.add(degree);
  return {...normalize({...original,stageMutedDegrees:[...stage]}),bassUsesGrid:effectiveSource()==='bass'};
 }
 function clearVisual(){if(liveVisual){liveVisual=null;emitVisual()}}

 const effectiveSource=()=>liveOverride?(liveOverride.profile.bassEnabled&&liveOverride.profile.bassConfig.bassUsesGrid!==false?'bass':'main'):state.source;
 function setLiveOverride(value){liveOverride=value?JSON.parse(JSON.stringify(value)):null;liveVisual=null;compiledKey='';emit();if(lastParams)prepare(lastParams)}
 function clearLiveOverride(){if(liveOverride)setLiveOverride(null);else clearVisual()}
 function set(id,patch){id=cleanId(id);liveVisual=null;const next=normalize({...read(id),...patch});state={...state,grids:{...state.grids,[id]:next}};persist()}
 function setSource(source){if(!['main','main-grid','bass'].includes(source)||state.source===source)return;state={...state,source};persist()}
 // References preserve local degree edits, while the tuning definition stays in the Grid Library.
 function captureTuning(params=lastParams,{includeSharedUsage=false}={}){
  const id=cleanId(params?.gridTuning||'12edo'),cfg=withVisual(id),source=effectiveSource();
  if(source!=='bass')return {version:1,source:source==='main-grid'?'main':'original'};
  const offsets={...cfg.offsetsCents};
  if(cfg.sourceMode!=='linked')for(const [degree,value] of Object.entries(params?.manualGridStepOffsets||[]))
   if(Number(value))offsets[degree]=(Number(offsets[degree])||0)+Number(value)*10;
  const tuningId=cfg.sourceMode==='linked'?cfg.linkedTuningId:id;
  const stage=new Set(cfg.stageMutedDegrees);
  for(const degree of visualFor(id)?.mutes||[])stage.has(degree)?stage.delete(degree):stage.add(degree);
  const local={...cfg,stageMutedDegrees:[...stage]};
  const config=normalize({...local,sourceMode:'linked',linkedTuningId:tuningId,
   linkedMutedDegrees:cfg.sourceMode==='linked'?cfg.linkedMutedDegrees:cfg.mutedDegrees,offsetsCents:offsets});
  if(!includeSharedUsage){delete config.droneEnabled;delete config.rflEnabled;}
  return {version:1,source:'nested',tuningId,config};
 }
 function applyTuning(value,params=lastParams,{restoreSharedUsage=false}={}){
  if(!value||value.version!==1||!['main','nested','original'].includes(value.source))return false;
  if(value.source==='nested'){
   if(typeof value.tuningId!=='string'||!value.tuningId||value.tuningId.length>=160)return false;
   const shared=effective(cleanId(lastParams?.gridTuning||params?.gridTuning||'12edo'));
   setLiveOverride({tuningId:cleanId(params?.gridTuning||'12edo'),instanceId:'bass-reference:'+JSON.stringify(value),
    profile:{bassEnabled:true,bassConfig:{...normalize(value.config),...(!restoreSharedUsage?{droneEnabled:shared.droneEnabled,rflEnabled:shared.rflEnabled}:{}),sourceMode:'linked',linkedTuningId:value.tuningId,bassUsesGrid:true}}});
  }else{clearLiveOverride();setSource(value.source==='main'?'main-grid':'main');}
  return true;
 }
 function syncTuningOwner(params){
  if(!liveOverride||params?.gridTuning===liveOverride.tuningId)return;
  if(liveOverride.instanceId?.startsWith('bass-reference:')){const saved=captureTuning();applyTuning(saved,params);}
  else clearLiveOverride();
 }
 // Offline audition: compile once at click time, with no writes or live-owner changes.
 function resolveTuningRoot(value,mode,fixedHz,foundationHz,params=lastParams){
  if(!value)return resolveBassRoot(mode,fixedHz,foundationHz);
  let hz=Number(mode==='fixed'?fixedHz:foundationHz);
  if(!(hz>0))return NaN;
  if(value.source==='original'){if(mode!=='fixed')for(;hz>80;)hz/=2;return hz;}
  const nested=value.source==='nested',id=nested?value.tuningId:params?.gridTuning||'12edo';
  if(nested&&!findLinkedTuning(id))return NaN;
  const cfg=normalize(value.config),steps=Kp(id),period=num(vF(id),1,10000,1200),frequencies=[];
  const muted=new Set(nested?[...cfg.linkedMutedDegrees,...cfg.stageMutedDegrees]:params?.manualGridMutedSteps||[]);
  for(let degree=0;degree<steps.length;degree++)if(!muted.has(degree)){
   const cents=Number(steps[degree])+(nested?Number(cfg.offsetsCents[degree])||0:(Number(params?.manualGridStepOffsets?.[degree])||0)*10);
   for(let k=-18;k<=16;k++){
    const freq=Number(params?.gridBase||440)*Math.pow(2,(cents+k*period)/1200);if(freq>=15&&freq<=3500)frequencies.push(freq);
   }
  }
  frequencies.sort((a,b)=>a-b);hz=nearest(hz,frequencies);
  if(mode!=='fixed'&&hz>80)hz/=Math.pow(2,Math.ceil(Math.log2(hz/80)/(period/1200))*period/1200);
  return hz;
 }
 function availableTargets(){
  const all=typeof sj==='function'?sj():[];
  const opts=all.filter(v=>v&&typeof v.id==='string').map(v=>({id:v.id,label:String(v.label||v.id)}));
  const rack=typeof xp==='function'?xp():[];
  const active=[...new Set([lastParams?.gridTuning,...rack].filter(Boolean))]
    .filter(id=>opts.some(o=>o.id===id)).map(id=>opts.find(o=>o.id===id));
  return {active,library:opts};
 }
 function findLinkedTuning(id){return availableTargets().library.some(x=>x.id===id)}
 function prepare(params){if(!params)return;lastParams=params;
  const tuning=cleanId(params.gridTuning||'12edo'),config=withVisual(tuning),visual=visualFor(tuning);
  const linked=config.sourceMode==='linked';
  const key=JSON.stringify([tuning,params.gridBase,effectiveSource(),liveOverride?.instanceId,config,visual?.mutes,libraryRevision,
    params.manualGridMutedSteps,params.gridMode,params.manualGridStepOffsets]);
  // The separately compiled Main table must follow Main cents edits, even when
  // the saved Bass profile links to Nested. Nested still uses only its own offsets.
  if(key===compiledKey)return;
  compiledKey=key;missing=false;visualRows=Object.freeze([]);
  const mainSteps=Kp(tuning),mainPeriod=num(vF(tuning),1,10000,1200),main=[];
  mainPeriodRatio=Math.pow(2,mainPeriod/1200);
  const mainMutes=new Set(params.manualGridMutedSteps||[]),mainAnchor=num(params.gridBase,.01,20000,440);
  for(let degree=0;degree<mainSteps.length;degree++){
   if(mainMutes.has(degree))continue;
   const cents=Number(mainSteps[degree])+(Number(params.manualGridStepOffsets?.[degree])||0)*10;
   for(let periodIndex=-18;periodIndex<=16;periodIndex++){
    const hz=mainAnchor*Math.pow(2,(cents+periodIndex*mainPeriod)/1200);if(hz>=15&&hz<=3500)main.push(hz);
   }
  }
  main.sort((a,b)=>a-b);mainTable=Float64Array.from(main);
  // Keep muted/passive markers visible even when all uses-grid switches are off.
  // Audio quantizers remain gated by their existing independent switches.
  const resolved=linked?config.linkedTuningId:tuning;
  // Do not fall back to 12-EDO if a user-linked tuning was deleted/renamed.
  if(linked&&(!resolved||!findLinkedTuning(resolved))){table=null;missing=true;return}
  const steps=Kp(resolved),period=num(vF(resolved),1,10000,1200);
  compiledPeriodRatio=Math.pow(2,period/1200);
  const anchor=num(params.gridBase,.01,20000,440);
  // Derived copies the complete tuning and base cents offsets, never Main's mode/mutes.
  // Local Bass degree mutes and cents offsets are independent and stack over that tuning.
  const exclusions=new Set(linked?config.linkedMutedDegrees:config.mutedDegrees);
  const liveExclusions=new Set(config.stageMutedDegrees);
  for(const degree of visual?.mutes||[])liveExclusions.has(degree)?liveExclusions.delete(degree):liveExclusions.add(degree);
  const offsets=linked?null:params.manualGridStepOffsets||[];
  const all=[],rows=[];
  const bounds=typeof cw==='function'?cw(params.gridBase):{min:15,max:3500};
  for(let degree=0;degree<steps.length;degree++){
   if(exclusions.has(degree))continue;
   const cent=Number(steps[degree])+(linked?0:(Number(offsets[degree])||0)*10)+(Number(config.offsetsCents[degree])||0);
   if(!Number.isFinite(cent))continue;
   for(let periodIndex=-18;periodIndex<=16;periodIndex++){
    const hz=anchor*Math.pow(2,(cent+periodIndex*period)/1200);
    if(hz>=15&&hz<=3500&&!liveExclusions.has(degree))all.push(hz);
    if(hz>=bounds.min&&hz<=bounds.max)rows.push({freq:hz,degree,muted:liveExclusions.has(degree)});
   }
  }
  all.sort((a,b)=>a-b);
  table=Float64Array.from(all);visualRows=Object.freeze(rows);compileCount++;
 }
 // Refresh only on library/rack mutations, never on the live note path.
 function refreshLibrary(){libraryRevision++;compiledKey='';emit();if(lastParams)prepare(lastParams)}
 function status(){return {missing,sourceMode:effective(lastParams?.gridTuning||'12edo').sourceMode}}
 // Called only at the already-owned bass note admission point: O(log n), no node/timer/allocation.
 function nearest(hz,frequencies=table){if(!frequencies||!(hz>0))return hz;
  if(frequencies.length===0)return Number.NaN; // All grid degrees muted: silence Bass, never reopen legacy pitch.
  let lo=0,hi=frequencies.length;while(lo<hi){const mid=(lo+hi)>>>1;if(frequencies[mid]<hz)lo=mid+1;else hi=mid}
  const above=lo<frequencies.length?frequencies[lo]:0,below=lo>0?frequencies[lo-1]:0;
  if(!below)return above||hz;if(!above)return below;
  return Math.abs(Math.log2(above/hz))<Math.abs(Math.log2(hz/below))?above:below;
 }
 function quantize(hz){return effectiveSource()==='bass'?(missing?NaN:nearest(hz)):effectiveSource()==='main-grid'?nearest(hz,mainTable):hz}
 // Root-only transform. The Bass pattern's ratios/individual cent offsets are never quantized.
 // Auto follows the original low-register octave mapping; fixed mode keeps the selected register.
 function resolveBassRoot(mode,fixedHz,foundationHz){
  let hz=mode==='fixed'?Number(fixedHz):Number(foundationHz);
  if(!(hz>0)||!Number.isFinite(hz))return Number.NaN;
  if(mode!=='fixed'){
   if(effectiveSource()==='bass'&&table||effectiveSource()==='main-grid'&&mainTable){
    // First select the CURRENT cursor degree. Only then descend in whole
    // tuning periods: a Bohlen-Pierce tritave is not an octave.
    const periodRatio=effectiveSource()==='main-grid'?mainPeriodRatio:compiledPeriodRatio;
    hz=quantize(hz);
    if(!(hz>0))return Number.NaN;
    if(hz>80){
     const periods=Math.max(0,Math.ceil(Math.log(hz/80)/Math.log(periodRatio)));
     hz/=Math.pow(periodRatio,periods);
     if(hz>80)hz/=periodRatio; // Guard for floating-point boundary.
    }
    return hz;
   }
   for(;hz>80;)hz/=2; // Preserve legacy low-register behavior without Bass Grid.
  }
  return quantize(hz);
 }
 function droneUsesGrid(params){const id=cleanId(params?.gridTuning||lastParams?.gridTuning||'12edo');return !!(liveOverride&&liveOverride.tuningId===id?(liveOverride.profile.bassEnabled&&liveOverride.profile.bassConfig.droneEnabled):state.grids[id]?.droneEnabled)}
 function quantizeDrone(hz){if(!droneUsesGrid(lastParams))return hz;const value=nearest(hz);return Number.isFinite(value)&&value>0?value:hz}
 function rflUsesGrid(params){const id=cleanId(params?.gridTuning||lastParams?.gridTuning||'12edo');return !!(liveOverride&&liveOverride.tuningId===id?(liveOverride.profile.bassEnabled&&liveOverride.profile.bassConfig.rflEnabled):state.grids[id]?.rflEnabled)}
 function quantizeRFL(hz){if(!rflUsesGrid(lastParams))return hz;const v=nearest(hz);return Number.isFinite(v)&&v>0?v:hz}
 function descriptor(id){const cfg=read(id);const linked=cfg.sourceMode==='linked';const resolved=linked?cfg.linkedTuningId:id;
  const available=!linked||findLinkedTuning(resolved);return {cfg,linked,resolved,available,steps:available?Kp(resolved):[]};}
 function effectiveCents(id,idx){const {cfg,linked,steps}=descriptor(id);return Number(steps[idx]||0)+(linked?0:(lastParams?.gridTuning===id?Number(lastParams?.manualGridStepOffsets?.[idx]||0)*10:0)+Number(cfg.offsetsCents[idx]||0))}
 function frequencyForDegree(id,degree){const d=descriptor(id);if(!d.available||degree<0||degree>=d.steps.length)return Number.NaN;
  const active=lastParams?.gridTuning===id?lastParams:null;let anchor=Number(active?.gridBase)||55;
  // One fixed ascending period. Never fold individual degrees into different octaves.
  const ratio=Math.pow(2,Number(vF(d.resolved))/1200);
  if(!Number.isFinite(ratio)||ratio<=1)return Number.NaN;
  for(let k=0;k<64&&anchor>110;k++)anchor/=ratio;
  for(let k=0;k<64&&anchor<27.5&&anchor*ratio<=110;k++)anchor*=ratio;
  const cents=effectiveCents(id,degree);
  return anchor*Math.pow(2,cents/1200);
 }
 let previewCtx=null;function auditionDegree(id,idx){auditionFrequency(frequencyForDegree(id,idx));}
 function auditionFrequency(hz){
  if(!(hz>0))return;
  try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
   if(!previewCtx||previewCtx.state==='closed')previewCtx=new AC();if(previewCtx.state==='suspended')previewCtx.resume().catch(()=>{});
   const ctx=previewCtx,t=ctx.currentTime,body=ctx.createOscillator(),upper=ctx.createOscillator(),filter=ctx.createBiquadFilter(),mix=ctx.createGain();
   body.type='sine';body.frequency.value=hz;upper.type='triangle';upper.frequency.value=hz*1.5;filter.type='lowpass';filter.frequency.value=360;
   body.connect(filter);upper.connect(filter);filter.connect(mix);mix.connect(ctx.destination);
   mix.gain.setValueAtTime(.0001,t);mix.gain.exponentialRampToValueAtTime(.075,t+.014);mix.gain.exponentialRampToValueAtTime(.0001,t+.28);
   body.start(t);upper.start(t);body.stop(t+.30);upper.stop(t+.30);upper.onended=()=>{try{body.disconnect();upper.disconnect();filter.disconnect();mix.disconnect()}catch{}};
  }catch{}
 }
 function inheritedDegreeAllowed(tuning,degree){return true} // Legacy API: Bass selects from all tuning degrees.
 function exportAll(){return Object.fromEntries(Object.entries(state.grids).map(([key,v])=>[key,normalize(v)]))}
 function importExtensions(raw,idRemap={},mode='merge'){
  if(!raw||typeof raw!=='object')return;
  const grids=mode==='replace'?{}:{...state.grids};
  for(const [from,value] of Object.entries(raw)){
   const id=cleanId(idRemap[from]||from);if(cleanId(from)===from&&typeof from==='string'){
    const copy={...value};
    if(copy.sourceMode==='linked'&&copy.linkedTuningId)copy.linkedTuningId=idRemap[copy.linkedTuningId]||copy.linkedTuningId;
    grids[id]=normalize(copy);
   }
  }
  state={...state,grids};persist();
 }
 window.__xenBassGridDebug={compileCount:()=>compileCount,visualRows:()=>visualRows,visualOffset,editVisualDegree,hasVisualEdits,sessionConfig,read,source:()=>state.source,prepared:()=>!!table,status,availableTargets,refreshLibrary,quantize,resolveBassRoot,quantizeDrone,droneUsesGrid,quantizeRFL,rflUsesGrid,effectiveCents,frequencyForDegree,exportAll};
 return {read,set,setSource,captureTuning,applyTuning,syncTuningOwner,resolveTuningRoot,normalize,visualRows:()=>visualRows,recordPlayedBass,cancelPlayedBass,playedBass,activeGrid,projectPlayedRow,visualOffset,editVisualDegree,clearVisual,hasVisualEdits,sessionConfig,auditionFrequency,liveOverride:()=>liveOverride,setLiveOverride,clearLiveOverride,effectiveSource,snapshot:()=>snapshot,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),prepare,refreshLibrary,availableTargets,descriptor,status,quantize,resolveBassRoot,quantizeDrone,droneUsesGrid,quantizeRFL,rflUsesGrid,effectiveCents,revision:()=>snapshot.serial,frequencyForDegree,auditionDegree,inheritedDegreeAllowed,exportAll,importExtensions};
})();
function __XenBassGridRuntime({params,update}){
 const version=P.useSyncExternalStore(__XenBassGrid.subscribe,__XenBassGrid.snapshot,__XenBassGrid.snapshot).serial;
 // Bass source is managed by shared derived-grid state; Bass Editor updates it directly.
 P.useEffect(()=>{__XenBassGrid.syncTuningOwner(params);__XenBassGrid.prepare(params)},[params?.gridTuning,params?.gridBase,params?.manualGridMutedSteps,params?.manualGridStepOffsets,params?.gridMode,version]);
 P.useEffect(()=>{const enable=()=>update({droneCursorFollow:true});window.addEventListener('xensonar:drone-grid-cursor-follow',enable);return()=>window.removeEventListener('xensonar:drone-grid-cursor-follow',enable)},[update]);
 P.useEffect(()=>{const refresh=()=>__XenBassGrid.refreshLibrary();window.addEventListener('xensonar:grid-tuning-library-updated',refresh);window.addEventListener('xensonar:grid-tuning-rack-updated',refresh);return ()=>{window.removeEventListener('xensonar:grid-tuning-library-updated',refresh);window.removeEventListener('xensonar:grid-tuning-rack-updated',refresh)}},[]);
 return null;
}
function __XenBassGridDraftAPI(id,draft,onChange,profile){
 const normalized=()=>({...__XenBassGrid.normalize(draft),bassUsesGrid:draft.bassUsesGrid!==false});
 const linked=()=>normalized().sourceMode==='linked';
 const descriptor=()=>{const cfg=normalized(),isLinked=cfg.sourceMode==='linked',resolved=isLinked?cfg.linkedTuningId:id;
  const available=!isLinked||__XenBassGrid.availableTargets().library.some(x=>x.id===resolved);
  return {cfg,linked:isLinked,resolved,available,steps:available?Kp(resolved):[]};};
 const effectiveCents=(tuning,idx)=>{const d=descriptor();return Number(d.steps[idx]||0)+(d.linked?0:Number(profile?.mainStepOffsets?.[idx]||0)*10+Number(draft.offsetsCents?.[idx]||0));};
 const frequencyForDegree=(tuning,idx)=>{const d=descriptor();if(!d.available)return NaN;return 55*Math.pow(2,effectiveCents(tuning,idx)/1200)};
 return {read:()=>normalized(),set:(tuning,patch)=>onChange({...normalized(),...patch}),setSource:source=>onChange({...normalized(),bassUsesGrid:source==='bass'}),
   descriptor,availableTargets:__XenBassGrid.availableTargets,refreshLibrary:__XenBassGrid.refreshLibrary,
   effectiveCents,inheritedDegreeAllowed:(tuning,idx)=>true,auditionDegree:(tuning,idx)=>{const hz=frequencyForDegree(tuning,idx);if(hz>0)__XenBassGrid.auditionFrequency(hz)},
   source:()=>draft.bassUsesGrid!==false};
}
function __XenBassGridEditor({tuningId,draft=null,onDraftChange=null,profile=null,forceOpen=false}){
 return __xenGetDeferredFn("__XenBassGridEditor").apply(this, arguments);
}
function __XenBassGridSource({params,update,clip=null,onTuningChange=null}){
 P.useSyncExternalStore(__XenBassGrid.subscribe,__XenBassGrid.snapshot,__XenBassGrid.snapshot);
 const source=__XenBassGrid.effectiveSource(),cfg=__XenBassGrid.read(params.gridTuning||'12edo');
 const change=event=>{__XenBassGrid.clearLiveOverride();__XenBassGrid.setSource(event.target.value);
  update({bassPitchGridSource:event.target.value});
  if(clip&&onTuningChange)onTuningChange({...clip,tuning:__XenBassGrid.captureTuning(params)});
 };
 return u.jsxs('label',{className:'block rounded border border-cyan-900/50 bg-cyan-950/10 p-2 text-xs text-cyan-100',children:[u.jsx('span',{className:'mb-1 block font-semibold',children:'Tuning Source'}),u.jsxs('select',{'aria-label':'Bass Tuning Source',value:source,onChange:change,className:'w-full bg-neutral-950 border border-cyan-800 p-1 text-sm',children:[
  source==='main'?u.jsx('option',{value:'main',children:'Original pitch · legacy'}):null,
  u.jsx('option',{value:'main-grid',children:'Main Grid Tuning'}),
  u.jsx('option',{value:'bass',children:'Nested Tuning'})]}),
  u.jsx('small',{className:'mt-1 block text-[10px] text-cyan-100/55',children:source==='main'?'Original root; select a tuning reference to follow its grid.':source==='bass'?(__XenBassGrid.status().missing?'Nested Tuning unavailable · restore its Grid Library entry.':`Root follows Nested Tuning · ${__XenBassGrid.captureTuning(params).tuningId||'unavailable'}. Pattern intervals stay free.`):'Root follows Main Grid. Pattern intervals stay free.'})]});
}


/* P7.39.25 · Bass Grid stage marker gestures. The existing audio quantizer remains the sole pitch owner.
   Do not store gestures in the Grid Library or drive additional sound/preview tasks. */
const __XenBassGridPointer=(()=>{
 let active=null;
 const finish=()=>{if(!active)return false;const p=active;active=null;if(!p.moved)__XenBassGrid.editVisualDegree(p.degree,'mute');return true};
 const cancel=()=>{active=null};
 return Object.freeze({
  begin(x,y,width,fromFreq){
   if(x<width-30||!__XenBassGrid.visualRows().length)return false;
   let best=null,distance=12;
   for(const row of __XenBassGrid.visualRows()){
    const dy=Math.abs(fromFreq(row.freq)-y);
    if(dy<distance){best=row;distance=dy}
   }
   if(!best)return false;
   active={degree:best.degree,startY:y,base:__XenBassGrid.visualOffset(best.degree),moved:false};
   if(typeof window!=='undefined')window.addEventListener('mouseup',()=>{if(active)finish()},{once:true});
   return true;
  },
  move(y){if(!active)return false;const delta=y-active.startY;
   if(Math.abs(delta)>=3){active.moved=true;__XenBassGrid.editVisualDegree(active.degree,'offset',active.base-delta*.4)}
   return true;
  },
  finish,cancel,isActive:()=>!!active
 });
})();
