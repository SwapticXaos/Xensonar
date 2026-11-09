/* Single Forge action presentation owner (R14).
 * Material Intake constructs the actual controls and NAME band once.
 * The no-audio stage receives that tree inert/disabled, never a parallel dummy.
 */
const __ForgeRackCopy=Object.freeze({
 load:{className:'xen-forge-tile-load',label:'Load Selection'},
 repair:{className:'xen-forge-tile-repair',label:'Loop korrigieren'},
 apply:{className:'xen-forge-tile-apply',label:'Apply Raw'},
 extract:{className:'xen-forge-tile-extract',icon:'🧬',first:'Extract Timbre',second:'(Donor Workshop)'},
 play:{className:'xen-forge-tile-play',label:'PLAY'},
 material:{className:'xen-forge-tile-material',icon:'📀',first:'Send raw as a loop to Material Track',second:'(Live Room)'},
 pink:{className:'xen-forge-tile-pink',icon:'🎵',first:'Send as Pink Track',second:'to Melodic Loop'},
 root:{className:'xen-forge-tile-root',icon:'🎼',first:'Use as',second:'Root Follow Loop'},
 sample:{className:'xen-forge-tile-sample',label:'Save as Sample'},
 donor:{className:'xen-forge-tile-donor',label:'Add to Donor Library'},
 carrier:{className:'xen-carrier-transform',icon:'🧪',first:'Transform to',second:'Carrier'},
 titleHeading:'Loop/Sample betiteln',
 titleHelp:'This title is used for Material Track, direct Melodic Loop pink-track import, Root Follow, and saving the purple mask as a sample.'
});
/* RC4: canonical attachment slots. Row/slot order is NOT repeated in lab.js.
 * Only controls' presentation is shared. The active editor owns all callbacks.
 * saveGroup is one wrapper in the active rack, four inert tiles in preview.
 */
const __ForgeRackLayout=Object.freeze({
 primary:Object.freeze(['load','repair','apply','extract','play','material']),
 secondary:Object.freeze(['pink','saveGroup']),
 saveGroup:Object.freeze(['root','sample','donor','carrier'])
});
function __ForgeRackOrder(row,slots){
 const keys=__ForgeRackLayout[row];
 if(!keys)throw Error('Unknown Forge rack row: '+row);
 return keys.flatMap(key=>{
  if(!Object.prototype.hasOwnProperty.call(slots,key))throw Error('Missing Forge rack slot: '+key);
  return Array.isArray(slots[key])?slots[key]:[slots[key]];
 });
}
function __ForgeExportTileLabel(icon,first,second){
 const h=P.createElement;
 return h('span',{className:'xen-forge-export-tile'},
  h('span',{className:'xen-forge-export-icon','aria-hidden':true},icon),
  h('span',{className:'xen-forge-export-words'},h('span',null,first),h('span',null,second)));
}
function __ForgeRackClass(kind,extra=''){
 const spec=__ForgeRackCopy[kind];
 if(!spec?.className)throw Error('Unknown Forge action style '+kind);
 return spec.className+(extra?' '+extra:'');
}
function __ForgeRackCaption(kind,firstOverride){
 const spec=__ForgeRackCopy[kind];
 if(!spec)throw Error('Unknown Forge action '+kind);
 const first=firstOverride===undefined?(spec.first??spec.label):firstOverride;
 return spec.icon?__ForgeExportTileLabel(spec.icon,first,spec.second):first;
}
/* RV-02: one owner for user volume, selected-range effective gain,
 * waveform display, live raw-loop preview and exported PCM.
 * No mutation of the original audio asset or other sound routes. */
/* VG01: TWO independent controls behind ONE triangle. Volume is audition-only;
 * editor Gain is committed into the existing Wave PCM document, never exported twice. */
const __XenForgeRawGain=(()=>{
 let sourceKey=null,asset=null,volume=1,gain=1,committed=1,mode='volume',editor=null,busy=false;
 const listeners=new Set();
 const keyOf=source=>source?.id!=null?String(source.id):null;
 const bound=value=>Number.isFinite(value)?Math.max(0,Math.min(4,value)):1;
 const same=source=>sourceKey!==null&&keyOf(source)===sourceKey&&source?.sourceAsset===asset;
 const emit=()=>{for(const fn of listeners){try{fn()}catch(error){console.warn('[Forge Vol/Gain] subscriber removed',error);listeners.delete(fn)}}};
 function bind(source){
  const key=keyOf(source),nextAsset=source?.sourceAsset??null;
  if(key!==sourceKey||asset!==nextAsset){sourceKey=key;asset=nextAsset;volume=1;gain=1;committed=1;emit()}
  return get(source);
 }
 function rebindCommitted(source){
  // Wave materialize creates a NEW wrapper id for EVERY PCM revision.
  // This is the same editor document, never a new imported source.
  sourceKey=keyOf(source);asset=source?.sourceAsset??null;emit();return get(source);
 }
 function setMode(next,owner=null){
  if(next!=='volume'&&next!=='gain')return false;
  if(next==='gain'&&!owner)return false;
  mode=next;editor=next==='gain'?owner:null;gain=1;committed=1;busy=false;emit();return true;
 }
 function setRange(source,range){return same(source)&&!!range&&Number.isFinite(range.startSec)&&Number.isFinite(range.durationSec)};
 function get(source){return same(source)?(mode==='gain'?gain:volume):1}
 function effective(source){
  // Waveform displays PCM, not outside audition Volume. In editor show only the
  // uncommitted preview ratio; committed PCM already contains applied Gain.
  return same(source)&&mode==='gain'&&committed>0?gain/committed:1;
 }
 function set(source,value){
  if(!same(source)||busy)return false;
  const next=bound(value),old=mode==='gain'?gain:volume;
  if(next!==old){if(mode==='gain')gain=next;else volume=next;emit()}
  return true;
 }
 async function commitGain(){
  if(mode!=='gain'||!editor||busy)return false;
  if(gain===committed)return true;
  busy=true;
  const currentEditor=editor,requested=gain,prior=committed;
  let result=false;
  try{result=await currentEditor.applyTriangleGain(requested,prior)===true}
  catch(error){currentEditor.setStatus?.(error?.message||String(error));result=false}
  if(editor===currentEditor&&mode==='gain'){
   if(result)committed=requested;else gain=committed;
  }
  busy=false;emit();return result;
 }
 function cancelDraft(){if(mode!=='gain'||busy)return false;gain=committed;emit();return true}
 function resetEditorGain(){if(mode!=='gain')return;gain=1;committed=1;emit()}
 return Object.freeze({
  bind,rebindCommitted,setRange,set,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},
  setMode,getMode:()=>mode,get,committedGain:()=>committed,resetEditorGain,
  commitGain,cancelDraft,effective,
  // Outside VOL only reaches audition GainNode, NEVER export PCM.
  forAsset(candidate){return asset&&candidate===asset&&sourceKey!==null
    ?mode==='volume'?volume:effective({id:sourceKey,sourceAsset:asset}):1},
  // Editor Gain has already been baked by publish(); do not apply it twice.
  apply(samples){return samples}
 });
})();
globalThis.__XenForgeRawGain=__XenForgeRawGain;
__XenForgeRawGain.subscribe(()=>Id.setRawGainLive());
function __XenForgeRawVolumeReach(gain,maxReach){
 const rest=Math.min(80,Math.max(24,maxReach*.64));
 if(gain<=1)return 8+(rest-8)*Math.pow(Math.max(0,gain),.58);
 return rest+(maxReach-rest)*Math.log(Math.min(4,gain))/Math.log(4);
}
function __XenForgeRawVolumeGain(reach,maxReach){
 const rest=Math.min(80,Math.max(24,maxReach*.64));
 if(reach<=rest)return Math.pow(Math.max(0,(reach-8)/(rest-8)),1/.58);
 if(maxReach<=rest)return 1;
 return Math.pow(4,Math.min(1,(reach-rest)/(maxReach-rest)));
}
function __XenForgeRawVolumeTriangle({source,disabled=false}){
 const ref=P.useRef(null),dragOffset=P.useRef(0),[maxReach,setMaxReach]=P.useState(148),[gain,setGain]=P.useState(1),[dragging,setDragging]=P.useState(false);
 const sourceRef=P.useRef(source);
 P.useLayoutEffect(()=>{
  sourceRef.current=source;
  setGain(__XenForgeRawGain.bind(source));
 },[source?.id,source?.sourceAsset]);
 P.useEffect(()=>__XenForgeRawGain.subscribe(()=>setGain(__XenForgeRawGain.get(sourceRef.current))),[]);
 P.useLayoutEffect(()=>{
  const element=ref.current,dock=element?.parentElement,rack=element?.closest('.xen-forge-action-rack');
  if(!element||!dock||!rack)return;
  const upper=rack.querySelector('.xen-forge-upper-triangle');
  const measure=()=>{
   const tile=dock.querySelector('button.xen-forge-tile-material');if(!tile)return;
   const rect=tile.getBoundingClientRect();
   const upperVisible=upper&&getComputedStyle(upper).display!=='none';
   const until=upperVisible?upper.getBoundingClientRect().right-rect.right:148;
   const next=Math.max(40,Math.round(until));
   dock.style.setProperty('--xen-raw-volume-space',next+'px');
   setMaxReach(old=>old===next?old:next);
  };
  measure();
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;
  observer?.observe(rack);observer?.observe(dock);
  const row=rack.querySelector('.xen-forge-action-row-primary');
  row?.addEventListener('scroll',measure,{passive:true});
  addEventListener('resize',measure);
  return()=>{observer?.disconnect();row?.removeEventListener('scroll',measure);removeEventListener('resize',measure)};
 },[]);
 const width=__XenForgeRawVolumeReach(gain,maxReach);
 const update=value=>{
  const next=Math.max(0,Math.min(4,value));
  if(__XenForgeRawGain.set(sourceRef.current,next))setGain(next);
 };
 const track=event=>{
  const box=ref.current?.getBoundingClientRect();if(!box)return;
  const target=Math.max(8,Math.min(maxReach,event.clientX-box.left-dragOffset.current));
  update(__XenForgeRawVolumeGain(target,maxReach));
 };
 const key=event=>{
  if(disabled||!source)return;
  let next=gain;
  switch(event.key){
   case 'ArrowRight':case 'ArrowUp':next=gain===0?.05:gain*Math.pow(10,1/20);break;
   case 'ArrowLeft':case 'ArrowDown':next=gain<=.05?0:gain/Math.pow(10,1/20);break;
   case 'PageUp':next=gain+.5;break;
   case 'PageDown':next=gain-.5;break;
   case 'Home':next=0;break;
   case 'End':next=4;break;
   default:return;
  }
  event.preventDefault();event.stopPropagation();update(next);
  if(__XenForgeRawGain.getMode()==='gain')void __XenForgeRawGain.commitGain();
 };
 const tip=Math.max(8,Math.min(maxReach,width));
 const db=gain===0?'Muted':(20*Math.log10(gain)).toFixed(1)+' dB';
 const effective=__XenForgeRawGain.effective(source),editMode=__XenForgeRawGain.getMode()==='gain';
 return u.jsxs('svg',{ref,className:'xen-forge-raw-volume-triangle',viewBox:`0 0 ${maxReach} 80`,width:maxReach,height:80,
  'data-raw-export-gain':'1.0000','data-raw-effective-gain':effective.toFixed(4),'data-raw-gain-mode':editMode?'gain':'volume','data-source-ready':!!source,'aria-label':editMode?'Wave Editor audio gain':'Raw Audio playback volume',
  children:[
   u.jsx('polygon',{className:'xen-raw-volume-shape',points:`0,1 0,78 ${tip},1`}),
   tip>38&&u.jsx('text',{className:'xen-raw-volume-label',x:5,y:24,children:editMode?'Gain':'Vol'}),
   u.jsx('g',{className:'xen-raw-volume-handle',role:'slider',tabIndex:disabled||!source?-1:0,
    'aria-label':editMode?'Wave Editor Gain (edit audio)':'Raw Audio Volume (playback only)','aria-orientation':'horizontal',
    'aria-valuemin':0,'aria-valuemax':400,'aria-valuenow':Math.round(gain*100),
    'aria-valuetext':db+(effective<gain-.01?` (peak-safe: ${(20*Math.log10(Math.max(.0001,effective))).toFixed(1)} dB)`:'') ,
    'aria-disabled':!!disabled||!source,
    title:editMode?'Gain: modifies Wave Editor PCM on release; Copy and Mix Paste keep their original amplitudes.':'Volume: changes only audition playback level; no PCM, waveform or export changes.',
    transform:`translate(${tip-6} 1)`,onKeyDown:key,
    onPointerDown:event=>{if(disabled||!source)return;event.preventDefault();event.stopPropagation();dragOffset.current=event.clientX-(ref.current?.getBoundingClientRect().left||0)-tip;event.currentTarget.setPointerCapture(event.pointerId);setDragging(true);track(event)},
    onPointerMove:event=>{if(dragging)track(event)},
    onPointerUp:event=>{if(!dragging)return;track(event);setDragging(false);if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);if(__XenForgeRawGain.getMode()==='gain')void __XenForgeRawGain.commitGain()},
    onPointerCancel:()=>{setDragging(false);__XenForgeRawGain.cancelDraft()},
    children:[u.jsx('path',{className:'xen-raw-volume-grip-hit',d:'M -14 -9 L 20 -9 L 20 25 L -14 25 Z'})]
   })
  ]});
}

function __ForgeRackRows({primary,secondary,extras=[]}){
 const h=P.createElement;
 return h('div',{className:'xen-forge-action-rack'},
  h('div',{className:'xen-forge-action-row xen-forge-action-row-primary'},primary),
  h('div',{className:'xen-forge-action-row xen-forge-action-row-secondary'},secondary),
  ...extras);
}
