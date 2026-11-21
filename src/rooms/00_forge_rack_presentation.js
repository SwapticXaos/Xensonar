/* Single Forge action presentation owner (R14).
 * Material Intake constructs the actual controls and NAME band once.
 * The no-audio stage receives that tree inert/disabled, never a parallel dummy.
 */
/* SYMBOL-01: the Spectral Forge symbol (the carrier line in red/orange/yellow with its overtones in teal above it), one drawing for every place that shows it
   (Distribution key of the Melodic Loop, Figure Projects, the floppy label of Save). `print` = the darker colours for the white floppy label. */
globalThis.__xenSymForgeLines=function(overtones,print){
 const h=P.createElement,L='M2 17.5C7 17.5 9 12.5 14 11.5S23 12.5 30 8',
  over=print?[[-4.5,3.2,.7],[-8.5,2.6,.5]]:[[-4.5,3.4,.55],[-8.5,2.6,.38],[-11.5,1.9,.26]],
  main=print?[['#e11d48',3.1],['#fb923c',1.9],['#facc15',.9]]:[['#f54c52',3],['#fb923c',1.9],['#fde047',.9]];
 return h(P.Fragment,null,
  h('g',{stroke:print?'#14b8a6':'#2dd4bf'},...over.slice(0,overtones).map(([dy,w,o],i)=>h('path',{key:i,d:L,transform:'translate(0 '+dy+')',strokeWidth:w,opacity:o}))),
  ...main.map(([c,w],i)=>h('path',{key:'m'+i,d:L,stroke:c,strokeWidth:w})));
};
/* SYMBOL-01: shared symbol (global, other modules call globalThis.__xenSymMelodic). Melodic Loop = the stepped note blocks (as on its tile), used wherever something leads to the Melodic Loop. */
globalThis.__xenSymMelodic=function(size,key){
 const h=P.createElement,id='xsm-'+(key||'a'),r=(x,y,w)=>h('rect',{key:x+'_'+y,x,y,width:w,height:4.4,rx:1.6,fill:'url(#'+id+')'});
 return h('svg',{viewBox:'0 0 28 28',width:size,height:size,focusable:'false','aria-hidden':'true',style:{display:'block',flex:'0 0 auto'}},
  h('defs',null,h('linearGradient',{id,x1:0,y1:0,x2:0,y2:1},h('stop',{offset:0,stopColor:'#e9d5ff'}),h('stop',{offset:1,stopColor:'#7e22ce'}))),
  r(2,17,8),r(9,11,9),r(17,5,9),h('rect',{x:5,y:23,width:12,height:3,rx:1.3,fill:'#c4b5fd',fillOpacity:.6}));
};
/* SYMBOL-01: the Multitrack symbol (six coloured clips with the playhead, as on the Melodic Loop's Send to Multitrack key). */
globalThis.__xenSymMultitrack=function(w,hgt){
 const h=P.createElement,c=[[1,2,11,'#22d3ee'],[15,2,9,'#a78bfa'],[4,9,9,'#fbbf24'],[16,9,12,'#34d399'],[1,16,13,'#f472b6'],[17,16,8,'#38bdf8']];
 return h('svg',{width:w,height:hgt,viewBox:'0 0 30 22','aria-hidden':'true',style:{display:'inline-block',flex:'0 0 auto'}},
  ...c.map((r,i)=>h('rect',{key:i,x:r[0],y:r[1],width:r[2],height:4,rx:1.5,fill:r[3]})),h('rect',{x:13.6,y:0,width:1.6,height:22,rx:.8,fill:'#fff',opacity:.9}));
};
const __ForgeRackCopy=Object.freeze({
 load:{className:'xen-forge-tile-load',label:'Load Selection'},
 repair:{className:'xen-forge-tile-repair',label:'Loop korrigieren'},
 apply:{className:'xen-forge-tile-apply',label:'Apply Raw'},
 extract:{className:'xen-forge-tile-extract',icon:'🧬',first:'Extract Timbre',second:'(Donor Workshop)'},
 play:{className:'xen-forge-tile-play',label:'PLAY'},
 material:{className:'xen-forge-tile-material',icon:'📀',first:'Send raw as a loop to Material Track',second:'(Live Room)'},
 pink:{className:'xen-forge-tile-pink',icon:globalThis.__xenSymMelodic(32,'tile'),first:'Send as Pink Track',second:'to Melodic Loop'},
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

/* TILES-ART-01: artwork of the two entry tiles of the Material Forge (Spectral Forge / Melodic Loop). One melodic contour, two ways to write it:
   painted as a flowing, fretless line (Spectral Forge) and stepped into note blocks on pitch lines (Melodic Loop): yin and yang of melody writing.
   Static SVG strings (no data, no scripts), shown aria-hidden behind the tile text. */
const __xenTileArtForge='<svg viewBox="0 0 360 150" preserveAspectRatio="xMaxYMid slice" focusable="false" aria-hidden="true">'+
 '<defs><linearGradient id="xta-f1" x1="0" x2="1"><stop offset="0" stop-color="#22d3ee" stop-opacity=".15"/><stop offset=".35" stop-color="#67e8f9"/><stop offset=".7" stop-color="#e0fbff"/><stop offset="1" stop-color="#a5f3fc" stop-opacity=".5"/></linearGradient>'+
 '<linearGradient id="xta-f2" x1="0" x2="1"><stop offset="0" stop-color="#2dd4bf" stop-opacity=".1"/><stop offset=".5" stop-color="#5eead4"/><stop offset="1" stop-color="#99f6e4" stop-opacity=".4"/></linearGradient>'+
 '<linearGradient id="xta-f3" x1="0" x2="1"><stop offset="0" stop-color="#e879f9" stop-opacity=".1"/><stop offset=".55" stop-color="#f0abfc"/><stop offset="1" stop-color="#fbcfe8" stop-opacity=".4"/></linearGradient>'+
 '<radialGradient id="xta-fg" cx=".7" cy=".5" r=".75"><stop offset="0" stop-color="#0e7490" stop-opacity=".55"/><stop offset=".6" stop-color="#083344" stop-opacity=".25"/><stop offset="1" stop-color="#020617" stop-opacity="0"/></radialGradient>'+
 '<linearGradient id="xta-ff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#67e8f9"/><stop offset=".5" stop-color="#0e7490"/><stop offset="1" stop-color="#0c2f5c"/></linearGradient>'+
 '<filter id="xta-fb" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="3.2"/></filter></defs>'+
 '<rect width="360" height="150" fill="url(#xta-fg)"/><rect width="360" height="150" fill="url(#xta-ff)" opacity=".85"/>'+
 /* log-spaced frequency lines and faint spectrogram haze */
 '<g stroke="#67e8f9" stroke-opacity=".09" stroke-width=".7"><path d="M0 18H360M0 40H360M0 66H360M0 98H360M0 138H360"/></g>'+
 '<g fill="#67e8f9" fill-opacity=".05"><ellipse cx="250" cy="52" rx="90" ry="9"/><ellipse cx="230" cy="86" rx="110" ry="7"/><ellipse cx="280" cy="112" rx="70" ry="6"/></g>'+
 /* second and third voice: thinner strokes, other phase (polyphony, fretless) */
 '<path d="M30 124C74 124 88 84 132 82S182 116 230 104S290 62 332 70" fill="none" stroke="url(#xta-f3)" stroke-width="3.2" stroke-linecap="round" filter="url(#xta-fb)" opacity=".8"/>'+
 '<path d="M30 124C74 124 88 84 132 82S182 116 230 104S290 62 332 70" fill="none" stroke="url(#xta-f3)" stroke-width="2" stroke-linecap="round"/>'+
 '<path d="M44 40C80 40 100 22 140 30S196 60 238 52S300 96 340 88" fill="none" stroke="url(#xta-f2)" stroke-width="2.4" stroke-linecap="round" filter="url(#xta-fb)" opacity=".8"/>'+
 '<path d="M44 40C80 40 100 22 140 30S196 60 238 52S300 96 340 88" fill="none" stroke="url(#xta-f2)" stroke-width="1.6" stroke-linecap="round"/>'+
 /* the main voice: the shared contour, glowing, with a vibrato wiggle at the end (expressive) */
 '<path class="xta-main" d="M14 112C50 112 62 58 104 58S150 96 196 84S250 28 290 34C304 36 308 44 318 40S330 30 340 36" fill="none" stroke="url(#xta-f1)" stroke-width="9" stroke-linecap="round" filter="url(#xta-fb)" opacity=".75"/>'+
 '<path d="M14 112C50 112 62 58 104 58S150 96 196 84S250 28 290 34C304 36 308 44 318 40S330 30 340 36" fill="none" stroke="url(#xta-f1)" stroke-width="4.2" stroke-linecap="round"/>'+
 '<path d="M14 112C50 112 62 58 104 58S150 96 196 84S250 28 290 34C304 36 308 44 318 40S330 30 340 36" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.1" stroke-linecap="round"/>'+
 /* brush dabs where the stroke started */
 '<g fill="#a5f3fc"><circle cx="14" cy="112" r="3.4" fill-opacity=".9"/><circle cx="26" cy="114" r="1.6" fill-opacity=".6"/><circle cx="8" cy="106" r="1.3" fill-opacity=".5"/></g>'+
 /* playhead */
 '<g class="xta-head"><rect x="249" y="6" width="1.4" height="138" fill="#e0fbff" fill-opacity=".85"/><rect x="246" y="6" width="7.4" height="138" fill="#67e8f9" fill-opacity=".14"/></g>'+
 '</svg>';
const __xenTileArtMelodic='<svg viewBox="0 0 360 150" preserveAspectRatio="xMaxYMid slice" focusable="false" aria-hidden="true">'+
 '<defs>'+
 [['b','#7dd3fc','#0369a1'],['p','#d8b4fe','#6b21a8'],['o','#fcd34d','#b45309'],['g','#6ee7b7','#047857']].map(c=>'<linearGradient id="xta-m'+c[0]+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+c[1]+'"/><stop offset="1" stop-color="'+c[2]+'"/></linearGradient>').join('')+
 '<linearGradient id="xta-mbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6ee7b7"/><stop offset="1" stop-color="#047857"/></linearGradient>'+
 '<radialGradient id="xta-mglow" cx=".7" cy=".5" r=".75"><stop offset="0" stop-color="#6d28d9" stop-opacity=".5"/><stop offset=".6" stop-color="#2e1065" stop-opacity=".25"/><stop offset="1" stop-color="#020617" stop-opacity="0"/></radialGradient></defs>'+
 '<rect width="360" height="150" fill="url(#xta-mglow)"/><rect width="360" height="150" fill="url(#xta-mbg)" opacity=".9"/>'+
 /* pitch lines (horizontal) and bar lines (vertical) */
 '<g stroke="#c4b5fd" stroke-opacity=".12" stroke-width=".7"><path d="M0 14H360M0 26H360M0 38H360M0 50H360M0 62H360M0 74H360M0 86H360M0 98H360M0 110H360M0 122H360M0 134H360"/></g>'+
 '<g stroke="#c4b5fd" stroke-opacity=".2" stroke-width=".9"><path d="M90 6V144M180 6V144M270 6V144"/></g>'+
 /* the same contour, stepped into blocks (one block = one pitch line, one length) */
 (()=>{
  const B=[ /* [x,y,width,gradient] main voice: follows the contour of the Spectral Forge stroke */
   [14,110,34,'b'],[54,98,18,'b'],[76,62,30,'b'],[110,56,34,'b'],[150,86,26,'b'],[180,86,24,'b'],[208,74,22,'b'],[234,38,26,'b'],[264,32,40,'b'],[308,38,16,'b'],[328,32,22,'b'],
   /* second voice */
   [30,122,24,'p'],[60,122,20,'p'],[92,86,36,'p'],[134,80,22,'p'],[162,110,28,'p'],[196,104,34,'p'],[238,98,18,'p'],[262,62,26,'p'],[296,66,22,'p'],[324,70,24,'p'],
   /* third voice */
   [44,38,26,'g'],[78,38,16,'g'],[100,26,34,'g'],[142,26,20,'g'],[170,50,36,'g'],[214,50,20,'g'],[242,50,26,'g'],[274,86,30,'g'],[308,90,36,'g'],
   /* short accents */
   [58,134,10,'o'],[118,134,10,'o'],[154,122,10,'o'],[226,122,12,'o'],[286,122,10,'o'],[338,110,12,'o'],[190,14,10,'o'],[250,14,12,'o']];
  return B.map(b=>'<g><rect x="'+b[0]+'" y="'+(b[1]-4.5)+'" width="'+b[2]+'" height="9" rx="2.6" fill="url(#xta-m'+b[3]+')"/><rect x="'+(b[0]+1.5)+'" y="'+(b[1]-3.7)+'" width="'+Math.max(2,b[2]-3)+'" height="2.2" rx="1.1" fill="#fff" fill-opacity=".38"/></g>').join('');
 })()+
 '<g class="xta-head"><rect x="249" y="6" width="1.4" height="138" fill="#f3e8ff" fill-opacity=".85"/><rect x="246" y="6" width="7.4" height="138" fill="#c4b5fd" fill-opacity=".14"/></g>'+
 '</svg>';
