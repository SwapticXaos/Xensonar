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
  state=Object.freeze({...state,held:false,pending:true});emit();
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
   :state.pending
   ?'Space released · Foundation holds until the next Keyboard or cursor pitch gesture'
   :'Space (hold) · Keyboard melody independent of Bass, Drone and RFL roots';
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
 let liveOverride=null;
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
  return {sourceMode,linkedTuningId,linkedMutedDegrees,droneEnabled:v.droneEnabled===true&&v.enabled!==false,rflEnabled:v.rflEnabled===true&&v.enabled!==false,mutedDegrees,offsetsCents};
 };
 let state={version:1,source:'main',grids:{}};
 try{const loaded=JSON.parse(localStorage.getItem(KEY)||'null');if(loaded&&typeof loaded==='object'){
  state.source=loaded.source==='bass'?'bass':'main';for(const [id,value] of Object.entries(loaded.grids||{}))if(cleanId(id)===id)state.grids[id]=normalize(value);
 }}catch{}
 let snapshot={...state,serial:0};let table=null;let lastParams=null,missing=false,compiledKey='',libraryRevision=0,compileCount=0;
 function emit(){snapshot={...state,serial:snapshot.serial+1};table=null;for(const listener of listeners)listener()}
 function persist(){compiledKey='';try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}emit();if(lastParams)prepare(lastParams)}
 const read=id=>normalize(state.grids[cleanId(id)]);
 const effective=id=>liveOverride&&liveOverride.tuningId===id?normalize(liveOverride.profile.bassConfig):read(id);
 const effectiveSource=()=>liveOverride?(liveOverride.profile.bassEnabled&&liveOverride.profile.bassConfig.bassUsesGrid!==false?'bass':'main'):state.source;
 function setLiveOverride(value){liveOverride=value?JSON.parse(JSON.stringify(value)):null;compiledKey='';emit();if(lastParams)prepare(lastParams)}
 function clearLiveOverride(){if(liveOverride)setLiveOverride(null)}
 function set(id,patch){id=cleanId(id);const next=normalize({...read(id),...patch});state={...state,grids:{...state.grids,[id]:next}};persist()}
 function setSource(source){if(source!=='main'&&source!=='bass'||state.source===source)return;state={...state,source};persist()}
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
  const tuning=cleanId(params.gridTuning||'12edo'),config=effective(tuning);
  const linked=config.sourceMode==='linked';
  const key=JSON.stringify([tuning,params.gridBase,effectiveSource(),liveOverride?.instanceId,config,libraryRevision,
    ...(linked?[]:[params.gridMode,params.manualGridMutedSteps,params.manualGridStepOffsets])]);
  // An independent linked tuning does not recompile when Main's mode/mutes/cents change.
  if(key===compiledKey)return;
  compiledKey=key;missing=false;
  if(effectiveSource()!=='bass'&&!(liveOverride&&!liveOverride.profile.bassEnabled)&&!config.droneEnabled&&!config.rflEnabled){table=null;return}
  const resolved=linked?config.linkedTuningId:tuning;
  // Do not fall back to 12-EDO if a user-linked tuning was deleted/renamed.
  if(linked&&(!resolved||!findLinkedTuning(resolved))){table=null;missing=true;return}
  const steps=Kp(resolved),period=num(vF(resolved),1,10000,1200);
  const anchor=num(params.gridBase,.01,20000,440);
  const modeMask=linked?null:Au(params.gridMode||'chromatic',tuning);
  const inheritedMuted=linked?null:new Set(Array.isArray(params.manualGridMutedSteps)?params.manualGridMutedSteps:[]);
  const exclusions=new Set(linked?config.linkedMutedDegrees:config.mutedDegrees);
  const offsets=linked?null:params.manualGridStepOffsets||[];
  const all=[];
  for(let degree=0;degree<steps.length;degree++){
   if((!linked&&(modeMask[degree]===false||inheritedMuted.has(degree)))||exclusions.has(degree))continue;
   const cent=Number(steps[degree])+(linked?0:(Number(offsets[degree])||0)*10+(Number(config.offsetsCents[degree])||0));
   if(!Number.isFinite(cent))continue;
   for(let periodIndex=-18;periodIndex<=16;periodIndex++){
    const hz=anchor*Math.pow(2,(cent+periodIndex*period)/1200);
    if(hz>=15&&hz<=3500)all.push(hz);
   }
  }
  all.sort((a,b)=>a-b);
  table=Float64Array.from(all);compileCount++;
 }
 // Refresh only on library/rack mutations, never on the live note path.
 function refreshLibrary(){libraryRevision++;compiledKey='';emit();if(lastParams)prepare(lastParams)}
 function status(){return {missing,sourceMode:effective(lastParams?.gridTuning||'12edo').sourceMode}}
 // Called only at the already-owned bass note admission point: O(log n), no node/timer/allocation.
 function nearest(hz){const frequencies=table;if(!frequencies||!(hz>0))return hz;
  if(frequencies.length===0)return Number.NaN; // All grid degrees muted: silence Bass, never reopen legacy pitch.
  let lo=0,hi=frequencies.length;while(lo<hi){const mid=(lo+hi)>>>1;if(frequencies[mid]<hz)lo=mid+1;else hi=mid}
  const above=lo<frequencies.length?frequencies[lo]:0,below=lo>0?frequencies[lo-1]:0;
  if(!below)return above||hz;if(!above)return below;
  return Math.abs(Math.log2(above/hz))<Math.abs(Math.log2(hz/below))?above:below;
 }
 function quantize(hz){return effectiveSource()==='bass'?nearest(hz):hz}
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
 function inheritedDegreeAllowed(tuning,degree){if(!lastParams||lastParams.gridTuning!==tuning)return true;return Au(lastParams.gridMode||'chromatic',tuning)[degree]!==false&&!new Set(Array.isArray(lastParams.manualGridMutedSteps)?lastParams.manualGridMutedSteps:[]).has(degree)}
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
 window.__xenBassGridDebug={compileCount:()=>compileCount,read,source:()=>state.source,prepared:()=>!!table,status,availableTargets,refreshLibrary,quantize,quantizeDrone,droneUsesGrid,quantizeRFL,rflUsesGrid,effectiveCents,frequencyForDegree,exportAll};
 return {read,set,setSource,normalize,auditionFrequency,liveOverride:()=>liveOverride,setLiveOverride,clearLiveOverride,effectiveSource,snapshot:()=>snapshot,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),prepare,refreshLibrary,availableTargets,descriptor,status,quantize,quantizeDrone,droneUsesGrid,quantizeRFL,rflUsesGrid,effectiveCents,revision:()=>snapshot.serial,frequencyForDegree,auditionDegree,inheritedDegreeAllowed,exportAll,importExtensions};
})();
function __XenBassGridRuntime({params,update}){
 const version=P.useSyncExternalStore(__XenBassGrid.subscribe,__XenBassGrid.snapshot,__XenBassGrid.snapshot).serial;
 // Bass source is managed by shared derived-grid state; Bass Editor updates it directly.
 P.useEffect(()=>{if(__XenBassGrid.liveOverride()&&params?.gridTuning!==__XenBassGrid.liveOverride().tuningId)__XenBassGrid.clearLiveOverride();__XenBassGrid.prepare(params)},[params?.gridTuning,params?.gridBase,params?.manualGridMutedSteps,params?.manualGridStepOffsets,params?.gridMode,version]);
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
   effectiveCents,inheritedDegreeAllowed:(tuning,idx)=>!profile||Au(__xenGridCompatibleMode(tuning,profile.modeId),tuning)[idx]!==false&&!new Set(profile.mainMutedDegrees||[]).has(idx),auditionDegree:(tuning,idx)=>{const hz=frequencyForDegree(tuning,idx);if(hz>0)__XenBassGrid.auditionFrequency(hz)},
   source:()=>draft.bassUsesGrid!==false};
}
function __XenBassGridEditor({tuningId,draft=null,onDraftChange=null,profile=null,forceOpen=false}){
 const globalSnap=P.useSyncExternalStore(__XenBassGrid.subscribe,__XenBassGrid.snapshot,__XenBassGrid.snapshot);
 const api=draft?__XenBassGridDraftAPI(tuningId||'12edo',draft,onDraftChange,profile):__XenBassGrid;
 const snap=draft?{source:draft.bassUsesGrid!==false?'bass':'main'}:globalSnap;
 const id=tuningId||'12edo',cfg=api.read(id),d=api.descriptor(id);
 const steps=d.steps,[selected,setSelected]=P.useState(0),[libraryRevision,refreshLibraryOptions]=P.useState(0);
 P.useEffect(()=>{setSelected(0)},[id,d.resolved]);
 const picked=Math.min(selected,Math.max(0,steps.length-1)),muteField=d.linked?'linkedMutedDegrees':'mutedDegrees',muted=new Set(cfg[muteField]);
 const offset=Number(cfg.offsetsCents[picked]||0);
 const targets=api.availableTargets();const selectable=targets.library.filter(item=>item.id!==id);
 const toggle=idx=>{api.set(id,{[muteField]:muted.has(idx)?cfg[muteField].filter(n=>n!==idx):[...cfg[muteField],idx]});api.auditionDegree(id,idx)};
 const label=idx=>__XenBassGridInterval(api.effectiveCents(id,idx));
 const uses=snap.source==='bass'||cfg.droneEnabled||cfg.rflEnabled;
 return u.jsxs(forceOpen?'section':'details',{'data-xen-bass-grid-editor':id,onToggle:e=>{if(e.currentTarget.open){api.refreshLibrary();refreshLibraryOptions(n=>n+1)}},className:'relative w-48 rounded-md border border-cyan-900/70 bg-neutral-950 text-xs text-cyan-100',children:[
  !forceOpen&&u.jsx('summary',{className:'cursor-pointer px-2 py-1.5 font-semibold text-cyan-200 whitespace-nowrap',children:`Bass Grid · ${d.linked?'Linked': 'Derived'}${uses?' ◉':''} ▾`}),
  u.jsxs('div',{'data-xen-bass-grid-flyout':true,style:{position:forceOpen?'relative':'absolute',top:forceOpen?'auto':'calc(100% + 5px)',right:0,width:forceOpen?'100%':'min(550px, calc(100vw - 46px))',maxHeight:forceOpen?'none':'min(440px, calc(100vh - 130px))',overflowY:'auto',zIndex:200,boxShadow:'0 15px 45px rgba(0,0,0,.9)'},className:'space-y-2 rounded-xl border border-cyan-700/75 bg-neutral-950 p-3 text-xs text-cyan-100',onClick:e=>e.stopPropagation(),children:[
   u.jsxs('div',{className:'flex flex-wrap items-center gap-3',children:[
    u.jsxs('label',{className:'flex items-center gap-1.5',children:[u.jsx('input',{type:'checkbox','aria-label':'Bass uses Grid',checked:snap.source==='bass',onChange:e=>api.setSource(e.target.checked?'bass':'main')}),'Bass uses Grid']}),
    u.jsxs('label',{className:'flex items-center gap-1.5',children:[u.jsx('input',{type:'checkbox','aria-label':'Drone uses Grid',checked:cfg.droneEnabled,onChange:e=>{api.set(id,{droneEnabled:e.target.checked});if(e.target.checked)window.dispatchEvent(new Event('xensonar:drone-grid-cursor-follow'))}}),'Drone uses Grid']}),
    u.jsxs('label',{className:'flex items-center gap-1.5',children:[u.jsx('input',{type:'checkbox','aria-label':'RFL uses Grid',checked:cfg.rflEnabled,onChange:e=>api.set(id,{rflEnabled:e.target.checked})}),'RFL uses Grid']})
   ]}),
   u.jsxs('div',{className:'flex gap-2 items-center',children:[u.jsx('span',{className:'text-cyan-200/80',children:'Grid source'}),
    u.jsx('select',{'aria-label':'Bass Grid mode',value:cfg.sourceMode,onChange:e=>api.set(id,{sourceMode:e.target.value}),className:'min-w-0 flex-1 rounded border border-cyan-900 bg-neutral-900 p-1',children:[u.jsx('option',{value:'derived',children:'Derived from Main'}),u.jsx('option',{value:'linked',children:'Link to Other Grid'})]})]}),
   d.linked&&u.jsxs('div',{className:'flex flex-wrap gap-2 items-center',children:[
    u.jsx('label',{className:'text-[11px]',children:'Other Grid'}),
    u.jsx('select',{'aria-label':'Other Grid source',value:cfg.linkedTuningId&&selectable.some(v=>v.id===cfg.linkedTuningId)?cfg.linkedTuningId:'',onChange:e=>api.set(id,{linkedTuningId:e.target.value,linkedMutedDegrees:[]}),className:'min-w-0 flex-1 rounded border border-cyan-900 bg-neutral-900 p-1',children:[
      u.jsx('option',{value:'',children:cfg.linkedTuningId&&!d.available?'⚠ Missing grid: '+cfg.linkedTuningId:'Choose a tuning…'}),
      u.jsx('optgroup',{label:'Active Selection',children:targets.active.filter(x=>x.id!==id).map(x=>u.jsx('option',{value:x.id,children:x.label},'active-'+x.id))}),
      u.jsx('optgroup',{label:'Tuning Library',children:selectable.filter(x=>!targets.active.some(a=>a.id===x.id)).map(x=>u.jsx('option',{value:x.id,children:x.label},'library-'+x.id))})
     ]}),
     u.jsx('span',{className:'text-[10px] text-cyan-100/65',children:'Stored tuning is reused. Only degree mutes are local.'})
    ]}),
   d.linked&&!d.available&&u.jsx('p',{role:'alert',className:'text-amber-300',children:cfg.linkedTuningId?'Linked grid is missing. Bass Grid quantization is bypassed; choose an existing tuning.':'Choose a tuning from Active Selection or Tuning Library.'}),
   u.jsx('p',{className:'text-[10px] text-cyan-100/65',children:'Click: mute/unmute and audition · Right-click: select a degree · ~5th is highlighted. RFL quantizes root/transposition only, not notes inside recorded chords.'}),
   u.jsx('div',{style:{display:'grid',gridTemplateColumns:`repeat(${Math.min(12,Math.max(1,steps.length))},minmax(0,1fr))`,gap:3},children:steps.map((cent,idx)=>{
    const name=label(idx),effective=api.effectiveCents(id,idx),mutedNow=muted.has(idx),offsetVal=d.linked?0:Number(cfg.offsetsCents[idx]||0);
    const hover=`Degree ${idx+1} · ${name.label?name.label+' · ':''}${effective.toFixed(1)} cents${d.linked?'':` (${offsetVal>=0?'+':''}${offsetVal}¢ offset)`} · ${mutedNow?'muted':'active'}`;
    return u.jsx('button',{type:'button','aria-label':`Bass Grid degree ${idx+1}`,onClick:()=>{setSelected(idx);toggle(idx)},onContextMenu:e=>{e.preventDefault();setSelected(idx)},title:hover,'aria-pressed':!mutedNow,
      className:`min-h-8 rounded border px-0.5 py-1 text-[10px] ${mutedNow?'border-neutral-700 text-neutral-500 bg-neutral-950':'border-cyan-700 text-cyan-100 bg-cyan-950/35'} ${name.fifth?'ring-1 ring-amber-500/85 text-amber-200 font-bold':''} ${idx===picked?'outline outline-1 outline-fuchsia-300':''}`,
      children:u.jsxs('span',{className:'flex flex-col items-center leading-tight',children:[u.jsx('span',{children:String(idx+1)}),name.fifth&&u.jsx('span',{className:'text-[9px]',children:'~5th'}),!d.linked&&cfg.offsetsCents[idx]&&u.jsx('span',{className:'text-[9px]',children:`${cfg.offsetsCents[idx]>0?'+':''}${cfg.offsetsCents[idx]}¢`})]})},idx)
   })}),
   !d.linked&&u.jsxs('div',{className:'flex flex-wrap items-center gap-2',children:[u.jsx('span',{children:`Degree ${picked+1}: ${offset>0?'+':''}${offset}¢`}),u.jsx('input',{type:'range',min:-200,max:200,step:1,value:offset,'aria-label':'Bass Grid cents offset',onChange:e=>api.set(id,{offsetsCents:{...cfg.offsetsCents,[picked]:Number(e.target.value)}}),className:'min-w-32 flex-1 accent-cyan-400'}),u.jsx('button',{type:'button',className:'rounded border border-neutral-700 px-2 py-1',onClick:()=>{const next={...cfg.offsetsCents};delete next[picked];api.set(id,{offsetsCents:next})},children:'0¢'})]}),
   u.jsxs('div',{className:'flex items-center gap-2',children:[u.jsx('button',{type:'button',className:'rounded border border-cyan-800 px-2 py-1',onClick:()=>{const targets=[0,700,1000],allowed=steps.map((_,i)=>i).filter(i=>d.linked||api.inheritedDegreeAllowed(id,i)),selected=new Set;for(const cents of targets){const index=allowed.filter(i=>!selected.has(i)).sort((a,b)=>Math.abs(steps[a]-cents)-Math.abs(steps[b]-cents))[0];if(index!==undefined)selected.add(index)}api.set(id,{[muteField]:steps.map((_,i)=>i).filter(i=>!selected.has(i))})},disabled:!steps.length,children:'3-Degree Foundation'}),u.jsx('button',{type:'button',className:'rounded border border-neutral-700 px-2 py-1',onClick:()=>api.set(id,d.linked?{linkedMutedDegrees:[]}:{mutedDegrees:[],offsetsCents:{}}),children:'Use All Degrees'})]})
  ]})
 ]});
}
function __XenBassGridSource({params,update}){
 const snapshot=P.useSyncExternalStore(__XenBassGrid.subscribe,__XenBassGrid.snapshot,__XenBassGrid.snapshot);
 const cfg=__XenBassGrid.read(params.gridTuning||'12edo');
 return u.jsxs('label',{className:'block rounded border border-cyan-900/50 bg-cyan-950/10 p-2 text-xs text-cyan-100',children:[u.jsx('span',{className:'mb-1 block font-semibold',children:'Bass Pitch Grid'}),u.jsxs('select',{'aria-label':'Bass Pitch Grid',value:snapshot.source,onChange:e=>{__XenBassGrid.setSource(e.target.value);update({bassPitchGridSource:e.target.value})},className:'w-full bg-neutral-950 border border-cyan-800 p-1 text-sm',children:[u.jsx('option',{value:'main',children:'Main / original bass pitch'}),u.jsx('option',{value:'bass',children:`Bass Grid · ${cfg.sourceMode==='linked'?cfg.linkedTuningId||'select tuning':params.gridTuning||'12edo'}`})]}),u.jsx('small',{className:'mt-1 block text-[10px] text-cyan-100/55',children:snapshot.source==='bass'?'Bass notes use the precomputed Bass Grid pitch table.':'Main: original bass pitches remain unchanged.'})]});
}

