/* Myzel G2: JI interval and audio organ are independent coordinates.
   Spatial reset permutes the 11 real organ processors across 12 original nodes.
   A twelfth copy is deliberately chosen anew for every constellation.
   The chosen mapping is attached to the nodes and persisted with the constellation;
   no random choices occur on the audio thread or during a ball gesture. */
const MYZEL_JI_EFFECTS = Object.freeze([
  'resonator', 'formant_filter', 'spectral_tilt', 'wavefolder',
  'sub_harmonic', 'shimmer_delay', 'comb_filter', 'grain_blur',
  'drive', 'chorus', 'bitcrusher'
]);
const MYZEL_JI_EFFECT_LABELS = Object.freeze({
  resonator:'Resonator', formant_filter:'Formant', spectral_tilt:'Tilt',
  wavefolder:'Fold', sub_harmonic:'Sub', shimmer_delay:'Shimmer',
  comb_filter:'Comb', grain_blur:'Korn', drive:'Drive',
  chorus:'Chorus', bitcrusher:'Crush'
});
function myzelRandomEffectAssignments(nodes, random = Math.random) {
  const assignable = nodes.filter(node => !node.isCustomResident).length;
  if (!assignable) return nodes.slice();
  // Use one random draw per selection, including the extra organ and each swap.
  const randomIndex = n => {
    const value = random();
    return Math.max(0, Math.min(n - 1, Math.floor((Number.isFinite(value) ? value : 0) * n)));
  };
  // Every 12-node layout contains the complete eleven-colour palette and
  // one independently drawn duplicate. Shuffle before assigning to JI labels.
  const order = MYZEL_JI_EFFECTS.slice();
  while (order.length < assignable)
    order.push(MYZEL_JI_EFFECTS[randomIndex(MYZEL_JI_EFFECTS.length)]);
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomIndex(i+1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  let i = 0;
  return nodes.map(node => node.isCustomResident ? node : {
    ...node, myzelEffectModuleType: order[i++]
  });
}
function myzelAssignEffectToNode(nodes, nodeId, effectType) {
  if (!MYZEL_JI_EFFECTS.includes(effectType)) return false;
  const node = nodes.find(n => String(n.residentId ?? n.id ?? n.label) === String(nodeId));
  if (!node || node.isCustomResident) return false;
  node.myzelEffectModuleType = effectType;
  delete node.myzelEffectPresetId; // An explicit type takes precedence over a preset.
  return true;
}
function L6(e,t){return e.includes(`· ${t}`)?e:`${e} · ${t}`}
/* xen-lazy:nodal */
const Moe=hg.map(e=>({value:e.value,label:L6(e.label,"Residents"),hint:"Built-in Resident Timbre",originLabel:"Residents"})).sort((e,t)=>e.label.localeCompare(t.label));
/* xen-lazy:nodal */

/* xen-lazy:nodal */
const Coe={enhancer:{label:"Enhancer / Mastering Mode",eyebrow:ooe,description:"Mycelium remains a networked effects and coloring tool here. Routing, body, drive and post-FX remain openly visible."},installation:{label:"Art Installation Mode / Resident Constellations",eyebrow:ioe,description:"The root remains as a stable reference. The ball moves above it, while Resident Nodes can be observed and moved as fixed sound bodies and played differently in Classic and Variant modes."}};
/* Advanced JI ↔ organ assignment: optional, outside the fixed-height performance canvas.
   Reads the same resident array consumed by the spatial/audio snapshot. */

/* xen-lazy:nodal */


/* xen-lazy:nodal */
function S2({title:e}){return u.jsx("div",{className:"mx-auto flex h-full max-w-2xl items-center justify-center p-4 text-center text-sm text-neutral-400",children:u.jsxs("div",{className:"rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4",children:[e," is archived in the Core build."]})})}const __XenNodalLazyRoom=P.lazy(()=>Promise.resolve().then(()=>({default:__xenLoadDeferred("nodal").koe})));function Poe({room:e,mainRoomProps:t,topologyPanelProps:n,xenpolarRoomProps:r,irrlichtArenaPanelProps:a}){return u.jsxs(u.Fragment,{children:[e==="MAIN"&&u.jsx(S2,{title:"Xensonar Family"}),e==="NEXUS"&&u.jsx("div",{className:"flex items-center justify-center h-full opacity-50",children:u.jsx("p",{children:"II. The former Nexus has been folded into the Family Room in this UI iteration."})}),e==="TOPOLOGY"&&u.jsx(P.Suspense,{fallback:u.jsx("div",{className:"p-4 text-xs text-neutral-400",children:"Loading Nodal Center …"}),children:u.jsx(__XenNodalLazyRoom,{...n})}),e==="XENPOLAR"&&u.jsx(S2,{title:"Xenpolar"}),e==="GAME"&&u.jsx(S2,{title:"Irrlicht"}),e==="MULTITRACK"&&u.jsx(P.Suspense,{fallback:u.jsx("div",{className:"p-4 text-xs text-neutral-400",children:"Loading Multitrack …"}),children:u.jsx(__XenMultitrackLazyRoom,{})})]})}
/* ROOM4-01: Room IV (Multitrack) is a deferred chunk; nothing of it runs before the room is opened. */
const __XenMultitrackLazyRoom=P.lazy(()=>Promise.resolve().then(()=>({default:__xenLoadDeferred("multitrack").XenMultitrackRoom})));/* GNOME command helper: only prepares terminal text; browser cannot change OS policy. */
const __xenTouchpadTypingCommand=value=>'gsettings set org.gnome.desktop.peripherals.touchpad disable-while-typing '+value;
function __XenTouchpadTypingHelp(){
 const [selected,setSelected]=P.useState('false'),[copied,setCopied]=P.useState(false);
 const lastCopy=P.useRef(0);
 const select=value=>{++lastCopy.current;setSelected(value);setCopied(false)};
 const copy=async()=>{
  const copyId=++lastCopy.current;
  setCopied(false);
  try{
   if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
   await navigator.clipboard.writeText(__xenTouchpadTypingCommand(selected));
   if(copyId===lastCopy.current)setCopied(true);
  }catch{/* Command is always visible for manual selection. */}
 };
 return u.jsxs('div',{className:'xen-touchpad-helper','aria-label':'Linux touchpad while typing terminal commands',children:[
  u.jsxs('div',{className:'xen-touchpad-heading',children:[u.jsx('span',{children:'Touchpad · Disable while typing'}),u.jsx('span',{children:'GNOME'})]}),
  u.jsxs('div',{className:'xen-touchpad-choices',children:[
   u.jsxs('button',{type:'button','aria-label':'false — Play. Recommended for playing XenSonar. Keep the touchpad alive while pressing keys.','aria-pressed':selected==='false',onClick:()=>select('false'),title:'Recommended for playing XenSonar. Keep the touchpad alive while pressing keys.',children:[u.jsx('span',{className:'xen-touchpad-choice-main',children:'false · Play'}),u.jsx('small',{className:'xen-touchpad-choice-sub',children:'Recommended for playing XenSonar'})]}),
   u.jsxs('button',{type:'button','aria-label':'true — Normal. Restore GNOME protection while typing. Disable the touchpad while typing.','aria-pressed':selected==='true',onClick:()=>select('true'),title:'Restore GNOME protection while typing. Disable the touchpad while typing.',children:[u.jsx('span',{className:'xen-touchpad-choice-main',children:'true · Normal'}),u.jsx('small',{className:'xen-touchpad-choice-sub',children:'Restore GNOME protection while typing'})]})
  ]}),
  u.jsxs('div',{className:'xen-touchpad-command-card',role:'status','aria-live':'polite',children:[
   u.jsx('code',{className:'xen-touchpad-code',children:__xenTouchpadTypingCommand(selected)}),
   u.jsx('button',{type:'button',className:'xen-touchpad-copy',onClick:copy,'aria-label':'Copy selected touchpad terminal command',title:copied?'Copied':'Copy command',children:copied?'Copied':'Copy'})
  ]}),
  u.jsx('div',{className:'xen-touchpad-terminal-instruction',style:{fontSize:9,lineHeight:1.2,color:'#b8d6d6'},children:'Copy, paste this into your terminal and press Enter.'})
 ]});
}
/* TP-MOVE-01 · Mount the existing GNOME command copier in unused Time & Echo space.
   At desktop widths the card is absolutely bottom-aligned to the hotkeys row;
   at one-column widths only its compact trigger occupies existing header whitespace.
   Never changes GNOME OS settings, recording state, audio or session data. */
function __XenTouchpadDock(){
 const dockRef=P.useRef(null);
 P.useLayoutEffect(()=>{
  const dock=dockRef.current,host=dock?.closest('.xen-time-echo-with-touchpad');
  const hotkeys=host?.parentElement?.querySelector('.xen-hotkeys-new-panel');
  if(!host||!hotkeys)return;
  const align=()=>{
   const height=hotkeys.getBoundingClientRect().height;
   if(height>0)host.style.setProperty('--xen-touchpad-rack-height',height+'px');
  };
  align();
  const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(align):null;
  ro?.observe(hotkeys);window.addEventListener('resize',align,{passive:true});
  return()=>{ro?.disconnect();window.removeEventListener('resize',align)};
 },[]);
 return u.jsx('section',{ref:dockRef,className:'xen-touchpad-dock','aria-label':'Touchpad disable while typing',children:u.jsx(__XenTouchpadTypingHelp,{})});
}
function __xenPrefixFilterGroups(groups,query){
 const prefix=String(query||'').trim().toLowerCase();
 if(!prefix)return groups;
 return groups.map(group=>{
  const groupMatch=String(group.label||'').toLowerCase().startsWith(prefix);
  return {...group,entries:group.entries.filter(item=>{
   const label=String(item.label||'').toLowerCase();
   const category=label.split(' · ').at(-1);
   return groupMatch||label.startsWith(prefix)||category.startsWith(prefix);
  })};
 }).filter(group=>group.entries.length);
}
/* Single grouped preset selector: one closed row, search only inside the portaled overlay.
   Both Live-Room Instruments and Meta-Menu Session instruments use the same groups,
   prefix predicate, focus and option rendering. Popup never affects rack layout. */
function __XenPresetPopover({id,label,groups,value,onChange,disabled=false,theme='live'}){
 const [open,setOpen]=P.useState(false),[query,setQuery]=P.useState('');
 const anchorRef=P.useRef(null),popoverRef=P.useRef(null),searchRef=P.useRef(null);
 const [pos,setPos]=P.useState({left:8,top:8,width:220,maxHeight:360});
 const rows=__xenPrefixFilterGroups(groups,query);
 const selection=groups.flatMap(g=>g.entries).find(e=>e.value===value);
 const close=()=>{setOpen(false);setQuery('')};
 const locate=()=>{
  const rect=anchorRef.current?.getBoundingClientRect();if(!rect)return;
  const width=Math.min(Math.max(rect.width,theme==='meta'?210:190),window.innerWidth-16);
  const left=Math.max(8,Math.min(window.innerWidth-width-8,rect.right-width));
  const below=window.innerHeight-rect.bottom-8,above=rect.top-8;
  const goUp=below<180&&above>below;
  const maxHeight=Math.max(100,Math.min(420,(goUp?above:below)-5));
  setPos({left,top:goUp?Math.max(8,rect.top-maxHeight-4):rect.bottom+4,width,maxHeight});
 };
 P.useLayoutEffect(()=>{if(!open)return;locate();const t=requestAnimationFrame(()=>searchRef.current?.focus({preventScroll:true}));
  const onOutside=e=>{if(!anchorRef.current?.contains(e.target)&&!popoverRef.current?.contains(e.target))close()};
  const onScroll=e=>{if(!popoverRef.current?.contains(e.target))locate()};
  document.addEventListener('pointerdown',onOutside,true);window.addEventListener('resize',locate);window.addEventListener('scroll',onScroll,true);
  return()=>{cancelAnimationFrame(t);document.removeEventListener('pointerdown',onOutside,true);window.removeEventListener('resize',locate);window.removeEventListener('scroll',onScroll,true)};
 },[open]);
 const pick=item=>{onChange(item.value);close();anchorRef.current?.focus({preventScroll:true})};
 const key=e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();if(query)setQuery('');else{close();anchorRef.current?.focus({preventScroll:true})}}
  else if(e.key==='ArrowDown'){e.preventDefault();popoverRef.current?.querySelector('[role="option"]')?.focus({preventScroll:true})}};
 return u.jsxs(P.Fragment,{children:[
  u.jsx('button',{type:'button',id,ref:anchorRef,className:'xen-preset-pop-trigger'+(theme==='meta'?' is-meta':''),disabled,
   'aria-label':label,'aria-haspopup':'listbox','aria-expanded':open,'data-xen-preset-trigger':theme,
   onClick:()=>{if(!open){locate();setOpen(true)}else close()},children:[u.jsx('span',{children:selection?.label||(value?'Unavailable: '+value:'Select sound…')}),u.jsx('span',{'aria-hidden':true,children:'▾'})]}),
  open&&ao.createPortal(u.jsxs('section',{ref:popoverRef,className:'xen-preset-popover','data-xen-preset-overlay':theme,
   role:'dialog','aria-label':label+' choices',style:{left:pos.left,top:pos.top,width:pos.width,maxHeight:pos.maxHeight},
   onClick:e=>e.stopPropagation(),onPointerDown:e=>e.stopPropagation(),onKeyDown:e=>e.stopPropagation(),children:[
   u.jsx('div',{className:'xen-preset-pop-search-row',children:u.jsx('input',{ref:searchRef,type:'search',value:query,
    placeholder:'Search presets…','aria-label':label+' search',autoComplete:'off',spellCheck:false,
    onChange:e=>setQuery(e.currentTarget.value),onKeyDown:key,onKeyUp:e=>e.stopPropagation()})}),
   u.jsx('div',{className:'xen-preset-pop-list',role:'listbox','aria-label':label+' presets',children:rows.length?
    rows.map(group=>u.jsxs('div',{className:'xen-preset-pop-group',children:[
     u.jsx('div',{className:'xen-preset-pop-group-title',children:group.label}),
     ...group.entries.map(item=>u.jsx('button',{type:'button',role:'option',className:'xen-preset-pop-option',
      'aria-selected':item.value===value,title:item.label,onClick:()=>pick(item),onKeyDown:e=>{e.stopPropagation();if(e.key==='Escape'){close();anchorRef.current?.focus({preventScroll:true})}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const nodes=[...popoverRef.current.querySelectorAll('[role="option"]')];const i=nodes.indexOf(e.currentTarget),n=nodes[i+(e.key==='ArrowDown'?1:-1)];n?.focus({preventScroll:true})}},children:item.label},item.value))
    ]},group.label)):u.jsx('div',{className:'xen-preset-pop-no-match',children:'No matches'})})
  ]}),document.body)
 ]});
}
function __PerformanceSoundLane({lane,title,selection,entries,includeCurrent=false,onSelect,volume,maxVolume=1,onVolume,enabled,onEnabled}){
 const history=P.useSyncExternalStore(__XenPerformanceCatalog.subscribe,__XenPerformanceCatalog.snapshot,__XenPerformanceCatalog.snapshot);
 const id=P.useId(),[eqOpen,setEqOpen]=P.useState(false);
 const choose=value=>{
  if(!value)return;
  onSelect(value);__XenPerformanceCatalog.remember(lane,value);
  if(lane==='keyboard'&&value===__XenNodalFactoryTroodleKey){
   const key=__XenEQ.keyFor('keyboard','instrument');
   const applied=__XenEQ.applyPattern(__XenTroodleFactoryEQId,__XenEQ.keyFor('keyboard','instrument'));
   if(applied?.ok)__XenEQ.set(key,{enabled:true});
  }
 };
 // If Firefox restores the sound choice without its EQ, repair only missing EQ.
 // Existing (possibly edited) session EQ always wins.
 P.useEffect(()=>{
  if(lane!=='keyboard'||selection!==__XenNodalFactoryTroodleKey)return;
  const key=__XenEQ.keyFor('keyboard','instrument');
  if(Object.prototype.hasOwnProperty.call(__XenEQ.snapshot(),key))return;
  const applied=__XenEQ.applyPattern(__XenTroodleFactoryEQId,key);
  if(applied?.ok)__XenEQ.set(key,{enabled:true});
 },[lane,selection]);
 const panReady=__XenPerformanceCatalog.canPan(lane,selection),groups=__XenPerformanceCatalog.groups(entries,includeCurrent,history[lane]);
 return u.jsxs('section',{className:'xen-performance-lane','data-xen-lane-id':'instrument:'+lane,'aria-label':title,children:[
  u.jsxs('div',{className:'xen-source-heading',children:[u.jsx('label',{htmlFor:id,className:'xen-performance-title',children:title}),u.jsx(__XenEQDock,{sourceKey:__XenEQ.keyFor(lane,'instrument'),owner:title,rowId:'instrument:'+lane,open:eqOpen,onToggle:()=>setEqOpen(v=>!v),onClose:()=>setEqOpen(false),placement:'instrument'}),onEnabled&&u.jsx('input',{type:'checkbox',checked:enabled,'aria-label':title+' enabled',onChange:event=>onEnabled(event.currentTarget.checked)}),u.jsx(__SourceOctave,{lane,title})]}),
  u.jsx(__XenPresetPopover,{id,label:title+' sound',groups,value:selection,onChange:choose}),
  u.jsxs('label',{className:'xen-performance-level',children:[u.jsxs('span',{children:['Volume',u.jsx('output',{children:Math.round(volume/maxVolume*100)+'%'})]}),u.jsx(__XenRange,{type:'range',min:0,max:maxVolume,step:.005,value:volume,'aria-label':title+' volume',onChange:e=>onVolume(Number(e.target.value))})]}),
  u.jsx(__PerformancePan,{kind:lane,label:title,disabled:!panReady}),
  !panReady&&u.jsx('small',{className:'xen-performance-pan-note',children:'Pan: Nodal / samples'+(lane==='particle'?' / classic':'')}),
  null]});
}
/* Session instrument selection: the archived Session owns the sound identity.
   Live Room catalogs resolve labels and preview sounds, never substitute live
   selections or defaults for missing saved values. */
/* P36-4 sample-length ownership: immutable session settings, never sample metadata.
   Active caps are installed ONLY when a performance is actually Engaged. They
   are ignored when a different sample is played or when no cap was configured. */
/* SAMPLE-LIVE-02: independent role-scoped playback policy, no global sample asset writes. */
const __XenLiveSampleProfiles=(()=>{
 const roles=['particle','waveStarter','keyboard'];
 const clean=value=>{
  const o=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  return {pitchMode:o.pitchMode==='granular'?'granular':o.pitchMode==='vb-tape'?'vb-tape':'legacy',
   speedPitchAnchor:__xenNormalizeSpeedPitchAnchor(o.speedPitchAnchor),
   maxAudibleSec:o.maxAudibleSec===null||o.maxAudibleSec===undefined?null:typeof o.maxAudibleSec==='number'&&Number.isFinite(o.maxAudibleSec)&&o.maxAudibleSec>=.05&&o.maxAudibleSec<=5?o.maxAudibleSec:5,
   tailEdgeHardness:Number.isFinite(o.tailEdgeHardness)?Math.round(Math.max(0,Math.min(100,o.tailEdgeHardness))):50};
 };
 const fresh=()=>Object.fromEntries(roles.map(role=>[role,clean(null)]));
 let state=fresh();const subscribers=new Set;
 const notify=()=>{for(const cb of subscribers)try{cb()}catch{}};
 const capture=()=>Object.fromEntries(roles.map(role=>[role,{...state[role]}]));
 return Object.freeze({
  get:role=>({...state[roles.includes(role)?role:'waveStarter']}),
  active:role=>{const v=state[roles.includes(role)?role:'waveStarter'];return v.pitchMode==='legacy'?null:{...v};},
  set:(role,delta)=>{if(!roles.includes(role))throw Error('Unknown sample playback role');
   const requested={...state[role],...delta};
   // A user edit to a legacy session must not be a silent, inaudible no-op.
   // Preserve legacy playback until the user changes an actual sound control.
   if(state[role].pitchMode==='legacy'&&!Object.prototype.hasOwnProperty.call(delta,'pitchMode'))requested.pitchMode='granular';
   state={...state,[role]:clean(requested)};notify();return {...state[role]};},
  restore:value=>{state=Object.fromEntries(roles.map(role=>[role,clean(value===undefined?{pitchMode:'legacy'}:value?.[role])]));notify();return capture();},
  capture,subscribe:cb=>{subscribers.add(cb);return()=>subscribers.delete(cb)}
 });
})();
function __xenLiveSampleDuration({bufferDuration,playbackRate,profile}){
 const rate=Number(playbackRate),raw=Number(bufferDuration);
 if(!(rate>0&&Number.isFinite(rate)&&raw>.001&&Number.isFinite(raw)))throw Error('Invalid live sample timing');
 const sliceEndSec=Math.min(raw,profile.maxAudibleSec??raw);
 const anchorRate=__xenNormalizeSpeedPitchAnchor(profile.speedPitchAnchor);
 const renderPlaybackRate=rate*anchorRate;
 // Source slice is bounded in original file seconds; the anchor chooses the new
 // reference duration. Granular live pitch changes RATE only, not this duration.
 const natural=profile.pitchMode==='granular'?sliceEndSec/anchorRate:sliceEndSec/renderPlaybackRate;
 const duration=Math.max(.001,natural);
 return {duration,rate,natural,sliceEndSec,anchorRate,playbackRate:renderPlaybackRate,tailFade:__xenSampleTailFadeSec(duration,profile.tailEdgeHardness)};
}

const __XenP36SessionSampleLength=(()=>{
 let live=new Map();
 const sampleId=(role,preset)=>{
  if(typeof preset!=='string'||!preset)return null;
  const native=role==='particle'?BT(preset):$w(preset);
  return native?.kind==='sample'&&typeof native.sampleId==='string'&&native.sampleId?native.sampleId:null;
 };
 const activate=sources=>{
  const next=new Map();
  for(const [role,key,identity] of [['particle','particle','particlePreset'],['wave','waveStarter','preset'],['keyboard','keyboard','keyboardHoldSoundPreset']]){
   const lane=sources?.[key]??{},id=sampleId(role,lane[identity]);
   const length=lane.samplePlaybackLengthSec;
   if(id&&Number.isFinite(length)&&length>=.05&&length<=600)next.set(role,{id,length});
  }
  live=next;
 };
 const cap=(role,id)=>{const record=live.get(role);return record&&record.id===id?record.length:null;};
 return Object.freeze({sampleId,activate,cap});
})();
/* P36-5B: native sample PCM transfer is one tested adapter, not the definition
   of a playable One-Shot Fill. A synthetic/Nodal source is a valid source, but
   must NOT be committed until its native renderer has produced verified PCM.
   The sample-backed adapter below is deliberately fail-closed for other engines. */
const __XenP36InstrumentFillTransfer=(()=>{
 const roles=new Set(['particle','wave','keyboard']);
 const rendererPresetId=(role,preset)=>{
  if(!roles.has(role)||typeof preset!=='string')return null;
  const parsed=role==='particle'?BT(preset):$w(preset);
  if(parsed?.kind==='nodal')return preset;
  if(parsed?.entrophonPreset)return parsed.entrophonPreset;
  if(parsed?.kind==='preset'){
   const id=(role==='particle'?'particle:':'wave:')+parsed.presetId;
   if(Uye(id))return id;
  }
  return null;
 };
 const hex=/^[0-9a-f]{64}$/;
 const valid=item=>item?.kind==='instrumentRendered'?__xenP36InstrumentRenderedValid(item):sampleValid(item);
 const sampleValid=item=>{
  const p=item?.sourceProvenance;
  return item?.kind==='instrumentSample'&&typeof item.id==='string'&&item.id.length>0&&item.id.length<=240&&
   typeof item.name==='string'&&item.name.trim().length>0&&item.name.length<=240&&
   p&&roles.has(p.role)&&typeof p.presetId==='string'&&p.presetId.length>0&&p.presetId.length<=240&&
   typeof p.sampleId==='string'&&p.sampleId.length>0&&p.sampleId.length<=240&&hex.test(p.assetDigest||'')&&
   __xenP36FillInstanceIdValid(item.id,p.role+':'+p.presetId)&&__XenP36SessionSampleLength.sampleId(p.role,p.presetId)===p.sampleId&&
   Number.isFinite(item.volume)&&item.volume>=0&&item.volume<=2&&
   Number.isFinite(item.pan)&&Math.abs(item.pan)<=1&&Number.isInteger(item.pitch)&&Math.abs(item.pitch)<=24&&
   (item.samplePlaybackLengthSec==null||(Number.isFinite(item.samplePlaybackLengthSec)&&item.samplePlaybackLengthSec>=.05&&item.samplePlaybackLengthSec<=600));
 };
 async function digest(blob){
  if(!blob?.size||!globalThis.crypto?.subtle)throw Error('SHA-256 for native sample verification requires a secure browser context.');
  const bytes=await blob.arrayBuffer();
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
 }
 async function build(snapshot,role,selectedPresetId=null){
  if(!roles.has(role))throw Error('Unsupported instrument role.');
  const sid=snapshot?.loadedId,row=snapshot?.saved?.find(x=>x.id===sid);
  if(!sid||!row)throw Error('Select a saved Session before transferring its instrument.');
  const saved=__XenSessionInstrumentView.project(snapshot)?.[role];
  const selectedId=selectedPresetId===null?saved?.id:selectedPresetId;
  if(typeof selectedId!=='string'||!selectedId)throw Error('No instrument chosen in the current selector.');
  const option=__XenSessionInstrumentView.options(role).find(o=>o.id===selectedId);
  if(selectedPresetId!==null&&!option)throw Error('The chosen instrument is no longer in the native sound catalog.');
  const selected={id:selectedId,name:option?.name??(saved?.id===selectedId?saved.name:selectedId)};
  const sampleId=__XenP36SessionSampleLength.sampleId(role,selected.id);
  if(!sampleId){
   const renderPresetId=rendererPresetId(role,selected.id);
   if(!renderPresetId)throw Error('No native Melodic PCM renderer supports this saved sound yet. No Fill was assigned.');
   const settings=__XenSessionInstrumentView.settings(snapshot,role);
   const pitch=(settings?.octave??0)*12;
   if(!Number.isInteger(pitch)||Math.abs(pitch)>24)
    throw Error('Session octave is outside the Melodic Fill +/-24 semitone range.');
   const item={kind:'instrumentRendered',id:role+':'+selected.id,name:selected.name,
    playbackRole:'one-shot',volume:settings?.hasVolume?settings.volume:1,pan:settings?.pan??0,pitch,
    samplePlaybackLengthSec:null,sourceProvenance:{role,presetId:selected.id,renderPresetId,
      rendererId:'xensonar-melodic-native-adapter-v1'}};
   if(!valid(item))throw Error('Invalid instrument adapter identity or settings.');
   return {sessionId:sid,presetId:selected.id,item,settingsFingerprint:JSON.stringify(settings)};
  }
  const settings=__XenSessionInstrumentView.settings(snapshot,role);
  const pitch=(settings?.octave??0)*12;
  if(!Number.isInteger(pitch)||Math.abs(pitch)>24)
   throw Error('Session octave is outside the Melodic Fill +/-24 semitone range.');
  const record=await __xenSampleReadRecord(sampleId);
  if(!record?.blob?.size)throw Error('Saved instrument sample not found in the native Sample Database.');
  const assetDigest=await digest(record.blob);
  const item={kind:'instrumentSample',id:role+':'+selected.id,name:selected.name,
   playbackRole:'one-shot',volume:settings?.hasVolume?settings.volume:1,pan:settings?.pan??0,pitch,
   // A duration cap from a *different saved preset* must never be inherited.
   samplePlaybackLengthSec:saved?.id===selected.id?(settings?.lengthSec??null):null,
   sourceProvenance:{role,presetId:selected.id,sampleId,assetDigest}};
  if(!valid(item))throw Error('Invalid source settings or sample identity.');
  return {sessionId:sid,presetId:selected.id,item};
 }
 return Object.freeze({valid,digest,build,rendererPresetId});
})();
const __XenSessionInstrumentView=(()=>{
 const roles=['particle','wave','keyboard'],listeners=new Set();
 let catalogs={particle:[],wave:[]},previewers={particle:null,wave:null,keyboard:null},revision=0;
 function publish(props){
  if(!props)return false;
  const p=Array.isArray(props.particlePresets)?props.particlePresets:[],
   w=Array.isArray(props.waveSoundPresets)?props.waveSoundPresets:[];
  const next={particle:props.previewParticleSound??null,wave:props.previewWaveSound??null,keyboard:props.previewWaveSound??null};
   if(catalogs.particle===p&&catalogs.wave===w&&roles.every(role=>previewers[role]===next[role]))return false;
   catalogs={particle:p,wave:w};previewers=next;revision++;for(const fn of listeners)fn();return true;
 }
 const empty=(reason='Not saved in this Session')=>Object.freeze({id:null,name:'—',reason});
 function nameFrom(id,entries,includeCurrent=false){
  if(!id)return '—';
  const rows=__XenPerformanceCatalog.groups(entries,includeCurrent,[]);
  const match=rows.flatMap(row=>row.entries).find(row=>row.value===id);
  return match?String(match.label):String(id); // unresolved user-owned sound: never invent one
 }
 function project(snapshot){
  const id=snapshot?.loadedId??null;
  const row=id?snapshot?.saved?.find(x=>x?.id===id):null;
  const result={sessionId:id,sessionName:row?.name??null};
  if(!row){for(const role of roles)result[role]=empty('No saved Session selected');return Object.freeze(result)}
  const sources=row.songPerformance?.sources??null,room=row.roomSettings??null;
  const params=room?.nParamsUI??{};
  // A legacy room snapshot is valid only when the Session has no song-source
  // envelope at all. No fallback to the currently loaded Main Room settings.
  const ids=sources?{
   particle:sources.particle?.particlePreset,
   wave:sources.waveStarter?.preset??sources.waveStarter?.waveSoundPreset,
   keyboard:sources.keyboard?.keyboardHoldSoundPreset
  }:room?{
   particle:params.particlePreset,
   wave:room.wave?.preset??params.waveSoundPreset,
   keyboard:params.keyboardHoldSoundPreset
  }:{};
  for(const role of roles){
   const value=typeof ids[role]==='string'&&ids[role]?ids[role]:null;
   result[role]=value?Object.freeze({id:value,name:nameFrom(value,role==='particle'?catalogs.particle:catalogs.wave,role!=='particle'),reason:null}):empty();
  }
  return Object.freeze(result);
 }
 // P36-3: Show only native instrument parameters. Octave is the actual
 // pitch owner; the engine does not expose independent semitone controls for
 // these roles. Keyboard has no separate per-instrument Volume owner.
 function settings(snapshot,role){
  if(!roles.includes(role))return null;
  const sid=snapshot?.loadedId??null;
  const row=sid?snapshot?.saved?.find(x=>x?.id===sid):null;
  if(!row)return null;
  const hasSong=!!row.songPerformance?.sources;
  const sources=hasSong?row.songPerformance.sources:null,room=row.roomSettings??null;
  const laneKey=role==='wave'?'waveStarter':role;
  const lane=hasSong?sources?.[laneKey]??{}:
   (role==='wave'?{...room?.nParamsUI,...room?.wave}:{...room?.nParamsUI});
  const savedPreset=project(snapshot)?.[role]?.id??null;
  const lengthSupported=!!__XenP36SessionSampleLength.sampleId(role,savedPreset);
  const rawLength=lane?.samplePlaybackLengthSec;
  const lengthSec=lengthSupported&&Number.isFinite(rawLength)&&rawLength>=.05&&rawLength<=600?rawLength:null;
  const volume=role==='particle'?(Number.isFinite(lane?.particleVolume)?lane.particleVolume:.165):
   role==='wave'?(Number.isFinite(lane?.volume)?lane.volume:.22):null;
  const pan=hasSong?sources?.pan?.[role]:room?.pan?.[role];
  const octave=hasSong?sources?.octaves?.[role]:room?.octaves?.[role];
  return Object.freeze({volume,pan:Number.isFinite(pan)?pan:0,
   octave:Number.isInteger(octave)?octave:0,
   hasVolume:role!=='keyboard',
   lengthSupported,lengthSec});
 }
 function draftPresetId(snapshot,role){
  if(!roles.includes(role))return null;
  const sid=snapshot?.loadedId;
  const perf=sid&&snapshot?.songPerformance;
  const src=perf?.sources;
  const chosen=role==='particle'?src?.particle?.particlePreset:
   role==='wave'?src?.waveStarter?.preset:src?.keyboard?.keyboardHoldSoundPreset;
  return typeof chosen==='string'&&chosen?chosen:(project(snapshot)?.[role]?.id??null);
 }
 function groups(role){
  const pool=role==='particle'?catalogs.particle:catalogs.wave;
  return __XenPerformanceCatalog.groups(pool,role!=='particle',__XenPerformanceCatalog.snapshot()[role]||[]);
 }
 function options(role){return groups(role).flatMap(g=>g.entries.map(row=>({id:String(row.value),name:String(row.label),group:g.label}))).filter(item=>item.id);}

 async function preview(role,id){if(!roles.includes(role)||!options(role).some(item=>item.id===id))throw Error('Sound not found in current catalog.');
  const fn=previewers[role];if(typeof fn!=='function')throw Error('Native sound preview unavailable in this room.');
  // Draft selection remains Full sample. Only the SAVED identity owns a cap.
  const state=__XenMetaSessions.snapshot(),saved=project(state)?.[role];
  const setting=saved?.id===id?settings(state,role):null;
  const played=await fn(id,{lengthSec:setting?.lengthSupported?setting.lengthSec:null});
  if(played===false)throw Error('Native instrument preview did not start.');
  return true;
 }
 return Object.freeze({publish,project,draftPresetId,settings,groups,options,preview,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),snapshot:()=>revision});
})();
// The Fill settings menu opens a shared EQ panel; only anchoring is Fill-specific.
function __XenFillStaticEQFlyout({sourceKey,owner,top,left,onClose}){
 const [expanded,setExpanded]=P.useState(false);
 const width=Math.max(280,Math.min(expanded?720:480,window.innerWidth-24));
 const x=Math.max(12,Math.min(window.innerWidth-width-12,left-width-12));
 const bottom=Math.max(180,__xenPlayAreaBottom());
 const desired=expanded?700:520;
 const y=Math.max(12,Math.min(top,bottom-desired));
 return u.jsx('div',{className:'xen-eq-flyout xen-fill-eq-flyout',style:{left:x,top:y,width,maxHeight:bottom-y,'--xen-eq-canvas-height':Math.max(80,Math.min(210,(bottom-y-275)))+'px'},children:u.jsx(__XenEQPanel,{sourceKey,owner,onClose,expanded,setExpanded},sourceKey)});
}
/* OSQR-PCMR-02: uncontrolled slider motion avoids MetaSession V2 transactions,
   React tree rerenders, and cold offline PCM preparation per pointer frame.
   The slider is still keyboard accessible, and one edit is one Session Undo. */

/* PCMR-03 silent OneShot editor. Only final parameter snapshots reach the
   canonical MetaSession store, after any required PCM has finished rendering.
   No action within this gate writes AudioParams or accesses running voices. */
const __XenOSQRSilentEdit=(()=>{
 const pending=new Map();let ticket=0;
 const token=(id,role,kind,sourceId)=>JSON.stringify([id,role,kind,sourceId]);
 const idle=fn=>{
  if(typeof requestIdleCallback==='function')requestIdleCallback(fn);
  else setTimeout(fn,240);
 };
 const activeId=()=>{const s=__XenMetaSessions.snapshot();return s.activePalette?.id??s.loadedId??null};
 const matches=(request)=>{
  if(activeId()!==request.sessionId)return null;
  const row=__XenOneShotAssignments.read(request.sessionId)[request.role]?.[request.index];
  return row?.kind===request.kind&&row.id===request.sourceId?row:null;
 };
 const notify=(request,status)=>{
  for(const field of Object.keys(request.patch))try{request.callbacks.get(field)?.(status)}catch{}
 };
 const submit=({sessionId,role,index,item,field,value,onStatus})=>{
  if(!['volume','pan','pitch'].includes(field)||!Number.isFinite(value))return false;
  if(role==='drum'&&field==='pitch')return false;
  const saved=__XenOneShotAssignments.read(sessionId)[role]?.[index];
  if(!saved||saved.kind!==item.kind||saved.id!==item.id)return false;
  const key=token(sessionId,role,item.kind,item.id);
  let request=pending.get(key);
  if(!request){request={sessionId,role,index,kind:item.kind,sourceId:item.id,patch:{},callbacks:new Map(),timer:null,revision:0};pending.set(key,request)}
  request.index=index;request.patch[field]=field==='pitch'?Math.round(value):value;
  if(onStatus)request.callbacks.set(field,onStatus);
  const revision=++ticket;request.revision=revision;
  if(request.timer!==null)clearTimeout(request.timer);
  notify(request,'pending');
  request.timer=setTimeout(()=>{request.timer=null;idle(()=>void process(key,revision))},180);
  return true;
 };
 async function process(key,revision){
  const request=pending.get(key);
  if(!request||request.revision!==revision)return;
  const current=matches(request);
  if(!current){pending.delete(key);notify(request,'invalid');return}
  const candidate={...current,...request.patch};
  try{
   if(candidate.pitch!==current.pitch&&request.role==='melodic'){
    // Prepare the candidate *before* making it visible to a future strike.
    // Raw audio arithmetic is worker-owned, not in an AudioWorklet quantum.
    await __XenOneShotAudio.prepare(candidate);
   }
   if(pending.get(key)!==request||request.revision!==revision)return;
   idle(()=>{
    if(pending.get(key)!==request||request.revision!==revision)return;
    const latest=matches(request);
    if(!latest){pending.delete(key);notify(request,'invalid');return}
    // Merge all settings into one validated, canonical Session transaction.
    // Preserve any concurrent rename and source asset identity.
    const values={...latest,...request.patch};
    const ok=__XenOneShotAssignments.setSettings(request.sessionId,request.role,request.index,
     request.kind,request.sourceId,{
      name:latest.name,volume:values.volume??1,pan:values.pan??0,pitch:values.pitch??0,
      samplePlaybackLengthSec:latest.samplePlaybackLengthSec??null
     });
    pending.delete(key);notify(request,ok?'ready':'failed');
   });
  }catch(error){
   if(pending.get(key)!==request||request.revision!==revision)return;
   console.warn('[xensonar][silent-fill-prepare]',String(error?.message||error));
   pending.delete(key);notify(request,'failed');
  }
 }
 return Object.freeze({submit,pending:()=>[...pending.values()].map(r=>({sourceId:r.sourceId,patch:{...r.patch}}))});
})();


function __XenFillSafeSlider({sessionId,role,index,item,field,label,min,max,step}){
 const initial=Number(item[field]??(field==='volume'?1:0));
 const range=P.useRef(null),display=P.useRef(null),draft=P.useRef(initial);
 const committed=P.useRef(initial),dragging=P.useRef(false),pending=P.useRef(false),lastSubmitted=P.useRef(null);
 const show=(value,suffix='')=>{
  if(range.current)range.current.value=String(value);
  if(display.current)display.current.textContent=(field==='pitch'?value+' st':value.toFixed(2))+suffix;
 };
 // While dragging: pure DOM data, no Session transaction, Worklet message,
 // PCM renderer, AudioNode or active voice modification.
 const change=event=>{
  const value=Number(event.currentTarget.value);
  if(!Number.isFinite(value))return;
  draft.current=value;show(value);
 };
 const commit=()=>{
  const value=draft.current;
  if(value===committed.current&&!pending.current)return;
  if(pending.current&&lastSubmitted.current===value)return;
  pending.current=true;lastSubmitted.current=value;
  const ok=__XenOSQRSilentEdit.submit({sessionId,role,index,item,field,value,onStatus:status=>{
   if(status==='pending'){show(draft.current,' · preparing');return}
   pending.current=false;lastSubmitted.current=null;
   if(status==='ready'){committed.current=value;show(value);return}
   const current=__XenOneShotAssignments.read(sessionId)[role]?.[index];
   const restored=Number(current?.kind===item.kind&&current.id===item.id?
    (current[field]??(field==='volume'?1:0)):committed.current);
   committed.current=restored;draft.current=restored;show(restored,' · not applied');
  }});
  if(!ok){pending.current=false;lastSubmitted.current=null;draft.current=committed.current;show(committed.current,' · not applied')}
 };
 P.useEffect(()=>{
  if(dragging.current||pending.current)return;
  committed.current=initial;draft.current=initial;show(initial);
 },[initial]);
 P.useEffect(()=>()=>{
  // Closing a menu preserves a finished edit in the independent queue.
  if(!pending.current&&draft.current!==committed.current)commit();
 },[]);
 return u.jsxs('label',{children:[
  u.jsxs('span',{children:[label,' ',u.jsx('output',{ref:display,children:field==='pitch'?initial+' st':initial.toFixed(2)})]}),
  u.jsx('input',{ref:range,type:'range',min,max,step,defaultValue:initial,
   'aria-label':'Fill settings '+item.name+' '+label,
   onInput:change,onChange:change,
   onPointerDown:()=>{dragging.current=true},
   onPointerUp:()=>{dragging.current=false;commit()},
   onPointerCancel:()=>{dragging.current=false;draft.current=committed.current;show(committed.current)},
   onKeyUp:commit,onBlur:commit})
 ]});
}
function __XenFillDock(){
 const session=P.useSyncExternalStore(__XenMetaSessions.subscribe,__XenMetaSessions.snapshot,__XenMetaSessions.snapshot);
 P.useSyncExternalStore(__XenOneShotAssignments.subscribe,__XenOneShotAssignments.snapshot,__XenOneShotAssignments.snapshot);
 const id=session.activePalette?.id??session.loadedId??null,slots=__XenOneShotAssignments.read(id);
 const [menu,setMenu]=P.useState(null),[eqEditor,setEqEditor]=P.useState(null),[message,setMessage]=P.useState('');
 const [fillCollapsed,setFillCollapsed]=P.useState(()=>{try{return localStorage.getItem('xensonar.one-shot-fills.collapsed.v1')==='1'}catch{return false}});
 const fillPanelId=P.useId();
 // OSQR-RESIZE-01: purely visual, instance-local dock geometry. No Session, audio,
 // pattern, trigger, or Quick Rack ownership changes. Resize is imperative so
 // pointermove never competes with the real-time One-Shot trigger via React renders.
 const fillDockRef=P.useRef(null),resizeHandleRef=P.useRef(null),resizeGesture=P.useRef(null);
 const resizeBounds=()=>{
  const dock=fillDockRef.current;
  const lanes=dock?.querySelectorAll('.xen-fill-live-lane')||[];
  let largest=0;
  for(const lane of lanes)largest=Math.max(largest,lane.querySelectorAll('.xen-fill-onebar-source').length);
  const minimum=Math.max(124,Math.ceil(123+largest*34));
  return {min:minimum,max:Math.max(minimum,Math.min(780,Math.round(window.innerHeight*.82)))};
 };
 const setResizeHeight=raw=>{
  const dock=fillDockRef.current,knob=resizeHandleRef.current;
  if(!dock||!knob)return null;
  const {min,max}=resizeBounds(),height=Math.min(max,Math.max(min,Math.round(raw)));
  dock.style.height=height+'px';dock.setAttribute('data-xen-osqr-resized','true');
  knob.setAttribute('aria-valuemin',String(min));knob.setAttribute('aria-valuemax',String(max));
  knob.setAttribute('aria-valuenow',String(height));
  return height;
 };
 const resizeDown=event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  event.preventDefault();event.stopPropagation();
  if(resizeGesture.current)return;
  const current=fillDockRef.current?.getBoundingClientRect().height;
  if(!Number.isFinite(current))return;
  resizeGesture.current={id:event.pointerId,y:event.clientY,height:current};
  event.currentTarget.setAttribute('data-osqr-dragging','true');
  try{event.currentTarget.setPointerCapture(event.pointerId)}catch{}
 };
 const resizeMove=event=>{
  const drag=resizeGesture.current;
  if(!drag||event.pointerId!==drag.id)return;
  event.preventDefault();event.stopPropagation();
  setResizeHeight(drag.height+event.clientY-drag.y);
 };
 const resizeStop=event=>{
  const drag=resizeGesture.current;
  if(!drag||drag.id!==event.pointerId)return;
  event.stopPropagation();resizeGesture.current=null;
  const knob=resizeHandleRef.current;
  knob?.removeAttribute('data-osqr-dragging');
  if(knob?.hasPointerCapture(event.pointerId))knob.releasePointerCapture(event.pointerId);
 };
 const resizeKeys=event=>{
  const step=({'ArrowUp':-20,'ArrowDown':20,'PageUp':-80,'PageDown':80})[event.key];
  if(step===undefined&&event.key!=='Home'&&event.key!=='End')return;
  event.preventDefault();event.stopPropagation();
  const current=fillDockRef.current?.getBoundingClientRect().height||124;
  const bounds=resizeBounds();
  setResizeHeight(event.key==='Home'?bounds.min:event.key==='End'?bounds.max:current+step);
 };
 P.useEffect(()=>{
  if(fillCollapsed)return;
  const sync=()=>{
   const dock=fillDockRef.current,knob=resizeHandleRef.current;
   if(!dock||!knob)return;
   const bounds=resizeBounds();
   if(dock.hasAttribute('data-xen-osqr-resized'))setResizeHeight(dock.getBoundingClientRect().height);
   else {
    knob.setAttribute('aria-valuemin',String(bounds.min));knob.setAttribute('aria-valuemax',String(bounds.max));
    knob.setAttribute('aria-valuenow',String(Math.round(dock.getBoundingClientRect().height)));
   }
  };
  sync();window.addEventListener('resize',sync);
  return()=>window.removeEventListener('resize',sync);
 },[fillCollapsed,slots.melodic?.length,slots.drum?.length]);
 const toggleFill=()=>{
  const next=!fillCollapsed;
  if(next)setEqEditor(null);
  if(next){setMenu(null);resizeGesture.current=null;
   const dock=fillDockRef.current;
   if(dock){dock.style.removeProperty('height');dock.removeAttribute('data-xen-osqr-resized');}
  }
  setFillCollapsed(next);
  try{localStorage.setItem('xensonar.one-shot-fills.collapsed.v1',next?'1':'0')}catch{}
 };
 const menuRef=P.useRef(null);
 const key=id===null?'working':String(id);
 P.useEffect(()=>{setMenu(null);setEqEditor(null)},[key]);
 // OSQR-PCMR-02: A complete slider gesture commits once, *not* on input.
 // Prewarm only genuinely changed variant keys, never all assigned Fills, and
 // never perform OfflineAudioContext setup inside a pointer event.
 const pcmFingerprint=JSON.stringify([key,...['melodic','drum'].flatMap(role=>(slots[role]||[]).map(item=>
  [role,item.kind,item.id,item.pitch??0,item.samplePlaybackLengthSec??null,
   item.sourceProvenance?.assetDigest??null,item.sourceProvenance?.renderPresetId??null]))]);
 const prewarmFingerprints=P.useRef(new Map());
 P.useEffect(()=>{
  const next=new Map();
  for(const row of [...(slots.drum||[]),...(slots.melodic||[])]){
   const token=[row.kind,row.id].join('|');
   const fingerprint=JSON.stringify([key,row.kind,row.id,row.pitch??0,
    row.samplePlaybackLengthSec??null,row.sourceProvenance?.assetDigest??null,
    row.sourceProvenance?.renderPresetId??null]);
   next.set(token,fingerprint);
  }
  const old=prewarmFingerprints.current;
  const changed=[...next].filter(([token,fp])=>old.get(token)!==fp).map(([token])=>token);
  prewarmFingerprints.current=next;
  if(!changed.length)return;
  let cancelled=false,idle=null,timer=null,tries=0;
  const ready=()=>{
   if(cancelled)return;
   const current=__XenMetaSessions.snapshot();
   if((current.activePalette?.id??current.loadedId??null)!==id)return;
   if(__XenOneShotAudio.activeVoices()>0){
    // Live sources always win over speculative rendering. Trigger() can still
    // await a cold variant if the user plays before the idle preparation.
    if(++tries<18)timer=setTimeout(schedule,180);
    return;
   }
   for(const token of changed){
    const latest=[...(__XenOneShotAssignments.read(id).drum||[]),
     ...(__XenOneShotAssignments.read(id).melodic||[])].find(row=>row.kind+'|'+row.id===token);
    if(latest)void __XenOneShotAudio.prepare(latest).catch(error=>console.warn('[xensonar][fill-prewarm]',error));
   }
  };
  const schedule=()=>{if(cancelled)return;
   if(typeof requestIdleCallback==='function')idle=requestIdleCallback(ready);
   else timer=setTimeout(ready,240);
  };
  timer=setTimeout(schedule,220);
  return()=>{cancelled=true;if(timer!==null)clearTimeout(timer);
   if(idle!==null&&typeof cancelIdleCallback==='function')cancelIdleCallback(idle)};
 },[pcmFingerprint]);
 P.useEffect(()=>{
  if(!menu)return;
  const close=event=>{if(!menuRef.current?.contains(event.target))setMenu(null)};
  const esc=event=>{if(event.key==='Escape')setMenu(null)};
  document.addEventListener('pointerdown',close,true);document.addEventListener('keydown',esc,true);
  return()=>{document.removeEventListener('pointerdown',close,true);document.removeEventListener('keydown',esc,true)};
 },[menu]);
 const trigger=async item=>{
  try{
   setMessage('Preparing / playing '+item.name+'…');
   const outcome=await __XenOneShotAudio.trigger(item,id);
   setMessage(outcome.message);
  }catch(error){setMessage('Fill unavailable: '+String(error?.message||error))}
 };
 const lane=(role,title)=>u.jsxs('div',{className:'xen-fill-live-lane',children:[
  u.jsx('strong',{children:title}),
  ...(slots[role]||[]).map((item,i)=>u.jsx('button',{type:'button',className:'xen-fill-onebar-source',
     style:{'--xen-fill-accent':item.fillFrame||'#31637a','--xen-fill-plate':item.fillPlate||'#123044'},
     title:item.name+' · left-click trigger · right-click settings',
    'aria-label':'Trigger '+item.name+' one-shot fill',
    onClick:()=>trigger(item),
    onContextMenu:event=>{event.preventDefault();event.stopPropagation();
     const bound=event.currentTarget.getBoundingClientRect();
     setMenu({role,index:i,sourceId:item.id,top:Math.min(window.innerHeight-172,Math.max(8,bound.top)),left:Math.min(window.innerWidth-238,bound.right+6)});
    },children:u.jsxs(P.Fragment,{children:[
     u.jsx('span',{className:'xen-fill-onebar-label',children:item.name}),
     u.jsx('span',{'aria-hidden':true,className:'xen-fill-onebar-arcade',children:
      u.jsxs('span',{className:'xen-fill-onebar-action',children:[u.jsx(r4,{side:'left'}),u.jsx('span',{className:'xen-fill-onebar-dot'}),u.jsx(r4,{side:'right'})]})})
    ]})},item.kind+'|'+item.id)),
  !slots[role]?.length&&u.jsx('small',{children:'—'})
 ]});
 const item=menu&&(slots[menu.role]||[])[menu.index];
 const valid=item&&item.id===menu.sourceId;
 const sliders=valid?[['volume','Volume',0,2,.01],['pan','Pan',-1,1,.01],...(menu.role==='melodic'?[['pitch','Pitch',-24,24,1]]:[])]:[];
 return u.jsxs(P.Fragment,{children:[
  u.jsxs('aside',{ref:fillDockRef,className:'xen-fill-live',role:'group','aria-label':'One-Shot Fills','data-xen-live-fill-dock':true,'data-xen-fill-collapsed':fillCollapsed?'true':'false',children:[
   u.jsxs('header',{className:'xen-fill-live-header',children:[
    !fillCollapsed&&u.jsx('span',{children:'ONE-SHOT FILLS'}),
    u.jsx('button',{type:'button',onClick:toggleFill,'aria-label':fillCollapsed?'Expand One-Shot Fills':'Collapse One-Shot Fills','aria-expanded':!fillCollapsed,'aria-controls':fillPanelId,title:fillCollapsed?'Expand One-Shot Fills':'Collapse One-Shot Fills',children:fillCollapsed?'▶':'◀'})
   ]}),
   u.jsxs('div',{id:fillPanelId,className:'xen-fill-live-content',hidden:fillCollapsed,children:[
    u.jsxs('div',{className:'xen-fill-live-grid',children:[lane('melodic','🎵 Melodic Fills'),lane('drum','🥁 Drum Fills')]}),
    u.jsx('small',{role:'status',children:message||'Left-click: trigger fill · right-click: settings'})
   ]}),
   !fillCollapsed&&u.jsx('button',{ref:resizeHandleRef,type:'button',className:'xen-osqr-resize-handle',
    'data-xen-osqr-resize-handle':true,role:'slider','aria-label':'One-Shot Fills height',
    'aria-orientation':'vertical','aria-valuemin':124,'aria-valuemax':780,'aria-valuenow':124,
    title:'Drag vertically to resize One-Shot Fills · Arrow keys adjust height',
    onPointerDown:resizeDown,onPointerMove:resizeMove,onPointerUp:resizeStop,
    onPointerCancel:resizeStop,onLostPointerCapture:resizeStop,onKeyDown:resizeKeys,
    onClick:event=>{event.preventDefault();event.stopPropagation()},
    children:u.jsx('span',{className:'xen-osqr-resize-knob','aria-hidden':true})})
  ]}),
  valid&&ao.createPortal(u.jsxs('section',{ref:menuRef,className:'xen-fill-mini-menu',role:'dialog','aria-label':'Fill settings '+item.name,
    style:{top:menu.top,left:menu.left},onContextMenu:e=>e.preventDefault(),children:[
    u.jsxs('header',{children:[u.jsx('strong',{children:item.name}),u.jsxs('span',{className:'xen-fill-mini-actions',children:[u.jsx('button',{type:'button',className:'xen-fill-mini-eq','aria-label':'Open '+item.name+' EQ',title:'Static EQ for this One-Shot',onClick:()=>{setEqEditor({kind:item.kind,id:item.id,owner:item.name,top:menu.top,left:menu.left});setMenu(null)},children:'EQ'}),u.jsx('button',{type:'button','aria-label':'Close Fill settings',onClick:()=>setMenu(null),children:'×'})]})]}),
    ...sliders.map(([field,label,min,max,step])=>u.jsx(__XenFillSafeSlider,{
     sessionId:id,role:menu.role,index:menu.index,item,field,label,min,max,step
    },field))
   ]}),document.body),
  eqEditor&&ao.createPortal(u.jsx(__XenFillStaticEQFlyout,{sourceKey:__XenEQ.keyFor('oneShot',eqEditor.kind+'|'+eqEditor.id),owner:eqEditor.owner,top:eqEditor.top,left:eqEditor.left,onClose:()=>setEqEditor(null)}),document.body)
 ]});
}
function Ioe({isRecording:e,recordingActive:o,sideMarkerPulses:t,scrollbarInsetPx:n,onAddRightMarker:a,soundPaletteProps:p}){
 const [collapsed,setCollapsed]=P.useState(()=>{try{return localStorage.getItem('xensonar.performance.collapsed.v1')==='1'}catch{return false}});
 const handle=P.useRef(null),panelId=P.useId();
 const toggle=()=>{const next=!collapsed;setCollapsed(next);try{localStorage.setItem('xensonar.performance.collapsed.v1',next?'1':'0')}catch{}};
 const params=p?.nParamsUI??{},waveId=__xenWaveStarterMenuValue(p?.waveSoundPreset??__XenFactoryStartSounds.waveStarter);
 P.useEffect(()=>__XenMainRoomSessionBridge.attach(p),[p]);
 P.useEffect(()=>{__XenSessionInstrumentView.publish(p)},[p?.particlePresets,p?.waveSoundPresets,p?.previewParticleSound,p?.previewWaveSound]);
 return u.jsxs(u.Fragment,{children:[p&&u.jsx(__QuickDock,{params:p.nParamsUI,update:p.updateNParams}),p&&u.jsx(__XenBassGridRuntime,{params:p.nParamsUI,update:p.updateNParams}),p&&u.jsxs('aside',{className:'xen-performance','aria-label':'Instrument sound, mix and one-shot fills',children:[
 u.jsxs('section',{'data-xen-side-performance':collapsed?'collapsed':'expanded',className:'xen-performance-instruments','aria-label':'Instrument sound and mix',onKeyDown:event=>{if(event.key==='Escape'&&!collapsed){event.stopPropagation();toggle();handle.current?.focus()}},children:[
 u.jsxs('header',{children:[!collapsed&&u.jsx('span',{children:'Instruments'}),u.jsx('button',{ref:handle,type:'button',onClick:toggle,'aria-label':collapsed?'Expand Instruments':'Collapse Instruments','aria-expanded':!collapsed,'aria-controls':panelId,title:collapsed?'Expand Instruments':'Collapse Instruments',children:collapsed?'▶':'◀'})]}),
 !collapsed&&u.jsxs('div',{id:panelId,className:'xen-performance-lanes',children:[
 u.jsx(__PerformanceSoundLane,{lane:'particle',title:'Particles',enabled:!params.particleMute,onEnabled:enabled=>p.updateNParams({particleMute:!enabled,agentEnabled:(p.activeParticleNodes??params.agentEnabled??[]).map(()=>enabled)}),selection:params.particlePreset??'dust_chime',entries:p.particlePresets,onSelect:p.onParticlePresetChange,volume:params.particleVolume??0,maxVolume:p.particleVolumeMax??.3,onVolume:value=>p.updateNParams({particleVolume:value})}),
 u.jsx(__PerformanceSoundLane,{lane:'wave',title:'Wave Starter',enabled:p.waveSoundEnabled,onEnabled:p.setWaveSoundEnabled,selection:waveId,entries:p.waveSoundPresets,includeCurrent:true,onSelect:value=>__xenChooseWaveStarterSource(value,{selectPreset:p.onWaveSoundPresetChange,setNParams:p.updateNParams,setWaveEnabled:p.setWaveSoundEnabled}),volume:p.waveSoundVolume??0,onVolume:p.setWaveSoundVolume}),
 u.jsx(__PerformanceSoundLane,{lane:'keyboard',title:'Keyboard',selection:params.keyboardHoldSoundPreset??__XenFactoryStartSounds.keyboard,entries:p.waveSoundPresets,includeCurrent:true,onSelect:value=>__xenChooseKeyboardSource(value,{setNParams:p.updateNParams}),volume:params.keyboardMixVolume??.3,onVolume:value=>p.updateNParams({keyboardMixVolume:value})})]})]}),u.jsx(__XenFillDock,{})]}),u.jsxs("button",{type:"button",onClick:a,disabled:!o,className:`hidden xl:flex fixed items-start justify-end px-3 py-3 text-right transition-colors overflow-hidden ${o?"cursor-pointer hover:bg-neutral-950/25":"cursor-default opacity-40 pointer-events-none"}`,style:{top:"var(--xen-quick-marker-top, 156px)",bottom:24,right:`${n}px`,width:`max(0px, calc((100vw - 72rem) / 2 - ${n+16}px))`},"aria-label":"Place a marker in the recording",title:"Mark a moment in the recording",children:[u.jsx("span",{className:"relative z-10 text-[10px] leading-tight text-neutral-500",children:"Click the area to place a marker in the recording."})]})]})
}
/* P7.38.7: one factual description shared by both performance-strip hovers and the bottom User Guide.
   The held value is root pitch, not the playback clock; a grid step is involved only when snapped. */
const __XenSpaceDecouplingHelp='Hold Space: Decoupling Mode — freeze RFL, Bass and Drone Loop on a grid step while Keyboard, Wave Starter and Particles stay flexible.';
const B6="Numpad × forward · Numpad ÷ backward";function Eoe(e){return e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey?null:e.code==="NumpadMultiply"?1:e.code==="NumpadDivide"?-1:null}function Foe(){return u.jsxs("div",{className:"mt-4 bg-black p-4 border border-neutral-800 text-neutral-400 text-sm",children:[u.jsx("h3",{className:"text-xs text-pink-400 uppercase tracking-widest mb-2 font-bold border-b border-neutral-800 pb-1",children:"User Guide & Controls"}),u.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4",children:[u.jsxs("div",{children:[u.jsx("h4",{className:"text-neutral-300 font-semibold mb-1",children:"Performance & Waves"}),u.jsxs("ul",{className:"space-y-1",children:[u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"Mouse"})," or ",u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"Touch"}),": move focus vector (pitch / spectrum)"]}),u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"Arrow keys"}),": move cursor (snaps exactly when \"Snap Cursor to Grid\" is enabled)"]}),u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"Left click"})," or ",u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"Enter"}),": fire a resonance ripple (ring wave); when the Enter-Hold device is enabled, holding Enter additionally colors the Wave Starter"]}),u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"Right-click"}),": toggle echo only (no ring wave)"]}),u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"Y"})," ",u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"X"})," ",u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"C"})," ",u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"V"}),": fire directed sector waves (Left, Right, Up, Down)"]}),u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"Space"}),": ",__XenSpaceDecouplingHelp]}),u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"B"})," (hold): raise keyboard expression; Pedal = returns on release, Knob = holds level"]}),u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"Left Alt"})," (hold, not AltGr): lower keyboard expression in the chosen mode"]}),u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"B + Left Alt"})," (press together): toggle Pedal / Knob mode; both keys must be released before another toggle"]}),u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"Backspace"})," (hold): Wave Starter sound plus keyboard and arrow-key sound (same sound without a wave) are played one octave higher"]})]})]}),u.jsxs("div",{children:[u.jsx("h4",{className:"text-neutral-300 font-semibold mb-1",children:"Harmonic Controls"}),u.jsxs("ul",{className:"space-y-1",children:[u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"1 - 0"})," and ",u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"Q - P"}),": play the OR keyboard on the current grid"]}),u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"?/ß"})," and ",u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"Ü"})," (German keyboard): shift the keyboard window;",u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"Ü"})," is behind",u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"P"})]}),u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"^/°"}),": switch hotkeys between Material Track and Root Follow Loop; the former keyboard mirroring has been removed from this key"]}),u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"M / N"}),", ",u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:", / ."})," and",u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"AltGr / Ctrl"}),": cycle Particle Mode / Grid System / Grid Mode"]}),u.jsx("li",{children:"The reference pitch acts as the root anchor: Grid System and Grid Mode interpret their steps relative to this Hz reference."}),u.jsx("li",{children:"Custom grid tuning: click the small triangle on the left of a line to mute/unmute it, or drag up/down for a manual step offset (fine tuning per step)"}),u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"Tab"}),": cycle particle time bodies (16/24/27/32/64 slots);",u.jsx("span",{className:"text-neutral-300",children:"other"})," and set the reference bars in the quantization menu."]}),u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"-_"}),": cycle Particle System"]}),u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"´ / `"}),": hold notes; releasing damps them quickly"]}),u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"A - #"}),": hotkey modes. In Particle Mode, A - # toggle particle sounds on and off; enabling one makes that particle sound."]}),u.jsxs("li",{children:["In the loop modes",u.jsx("span",{className:"text-pink-300",children:"📀 Material Track"})," and ",u.jsx("span",{className:"text-cyan-200",children:"🎼 Root Follow Loop"}),": ",u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"A - L"})," jump between the top nine playlist entries; their order can be organized in the corresponding header menu under 📀 and 🎼."]}),u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"Ö"})," / ",u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"Ä"}),": cycle through older entries.",u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"#"}),": toggle loop on/off or kill/restart."]}),u.jsx("li",{children:"You can upload Material Track and Root Follow Loop material pre-cut with bar information, or craft/compose it in the Material Forge."}),u.jsxs("li",{children:[u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"Numpad ×"})," / ",u.jsx("kbd",{className:"bg-neutral-800 px-1 py-0.5 rounded text-xs text-white",children:"Numpad ÷"}),": Drum Pattern up/down (",B6,") — under 🥁 in the header you can set the order of your favorite beats and jump directly to the Drum Machine in the Material Forge, where there is more to explore."]}),u.jsx("li",{children:"The bass menu 🎸 currently has no hotkey assignment, but you can already save your own bass patterns there."})]})]})]})]})}const oI="xensonar:resonance-cursor-hud-hz";function Toe(e){typeof window>"u"||!Number.isFinite(e)||window.dispatchEvent(new CustomEvent(oI,{detail:{hz:e}}))}function D6({variant:e="status"}){const t=e==="window"?"relative inline-flex h-4 w-4 shrink-0 items-center justify-center text-[13px] leading-none text-neutral-950":"xen-header-unicode-icon relative inline-flex shrink-0 items-center justify-center text-neutral-950";return u.jsxs("span",{className:t,"data-xensonar-root-follow-icon-bg":"white-circle-behind-icon","data-xensonar-root-follow-icon-slot":e,"aria-hidden":"true",children:[u.jsx("span",{className:e==="window"?"absolute h-3.5 w-3.5 rounded-full bg-white shadow-sm shadow-black/40":"absolute h-[17px] w-[17px] rounded-full bg-white shadow-sm shadow-black/40"}),u.jsx("span",{className:"relative z-10",children:"🎼"})]})}const iI="xensonar:open-material-loop-manager",sI="xensonar:open-root-follow-loop-manager",lI="xensonar:open-drum-pattern-manager",cI="xensonar:open-bass-pattern-manager",uI="xensonar:open-grid-tuning-rack",kb=({kind:e,active:t,title:n})=>{const r={octave:"text-sky-100 border-sky-400/70 bg-sky-950/35",sustain:"text-amber-100 border-amber-400/70 bg-amber-950/35",swell:"text-fuchsia-100 border-fuchsia-400/70 bg-fuchsia-950/35",damp:"text-sky-100 border-sky-400/70 bg-sky-950/35",decouple:"text-fuchsia-100 border-fuchsia-400/70 bg-fuchsia-950/35",echo:"text-emerald-100 border-emerald-400/70 bg-emerald-950/35",drive:"text-rose-100 border-rose-400/70 bg-rose-950/35"},a=(()=>{switch(e){case"octave":return u.jsxs("svg",{viewBox:"0 0 24 24",className:"h-[1.35rem] w-[1.35rem]",fill:"none",stroke:"currentColor",strokeWidth:"1.9",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[u.jsx("path",{d:"M12 19V5"}),u.jsx("path",{d:"M8.2 8.8 12 5l3.8 3.8"}),u.jsx("path",{d:"M6.5 19h11"}),u.jsx("path",{d:"M8.8 14.8h6.4"})]});case"sustain":return u.jsxs("svg",{viewBox:"0 0 24 24",className:"h-[1.35rem] w-[1.35rem]",fill:"none",stroke:"currentColor",strokeWidth:"1.9",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[u.jsx("path",{d:"M4.5 12h15"}),u.jsx("path",{d:"M7 8.5v7"}),u.jsx("path",{d:"M17 8.5v7"}),u.jsx("path",{d:"M10 9.3h4"}),u.jsx("path",{d:"M10 14.7h4"})]});case"swell":case"damp":case"decouple":return u.jsxs("svg",{viewBox:"0 0 24 24",className:"h-[1.35rem] w-[1.35rem]",fill:"none",stroke:"currentColor",strokeWidth:"1.9",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[u.jsx("circle",{cx:"12",cy:"12",r:"2.5",fill:"currentColor",stroke:"none"}),u.jsx("circle",{cx:"12",cy:"12",r:"6"}),u.jsx("path",{d:"M12 3.2v2.4"}),u.jsx("path",{d:"M12 18.4v2.4"}),u.jsx("path",{d:"M3.2 12h2.4"}),u.jsx("path",{d:"M18.4 12h2.4"})]});case"echo":return u.jsxs("svg",{viewBox:"0 0 24 24",className:"h-[1.35rem] w-[1.35rem]",fill:"none",stroke:"currentColor",strokeWidth:"1.9",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[u.jsx("path",{d:"M5.7 14.6c1.2-2.3 3-3.5 5.3-3.5s4 1.1 5.2 3.5"}),u.jsx("path",{d:"M8.8 18c1-.9 2.1-1.3 3.2-1.3 1.1 0 2.2.4 3.2 1.3"}),u.jsx("path",{d:"M4.1 10.4c1.7-3.2 4.2-4.9 6.9-4.9 3 0 5.6 1.8 7.4 5.4"})]});case"drive":return u.jsxs("svg",{viewBox:"0 0 24 24",className:"h-[1.35rem] w-[1.35rem]",fill:"none",stroke:"currentColor",strokeWidth:"1.9",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[u.jsx("path",{d:"M3.8 13.9c2.2 0 2.6-5.4 5.2-5.4s1.9 7.4 4.5 7.4 2.3-7.4 4.7-7.4 2.4 3.3 3.2 3.3"}),u.jsx("path",{d:"M4.5 6.6h15"}),u.jsx("path",{d:"M4.5 17.4h15"})]})}})();return u.jsx("div",{className:`group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border transition-all ${t?`${r[e]} shadow-[0_0_14px_rgba(255,255,255,0.08)] opacity-100`:"border-neutral-800 bg-neutral-950/60 text-neutral-600 opacity-60"}`,title:n,"aria-label":n,children:u.jsxs(u.Fragment,{children:[a,u.jsx("span",{role:"tooltip",className:"pointer-events-none absolute bottom-full right-0 z-[600] mb-2 hidden w-max max-w-[260px] rounded border border-neutral-600 bg-neutral-950 px-2 py-1 text-left text-[11px] leading-snug text-neutral-100 shadow-xl group-hover:block group-focus-within:block",children:n})]})})},Loe=58,v2=7;function Boe(e,t){const n=e.trim();if(n.length<=t)return n;if(t<=1)return"…";if(t<=4)return`${n.slice(0,Math.max(1,t-1))}…`;const r=Math.max(2,Math.ceil((t-1)*.62)),a=Math.max(1,t-1-r);return`${n.slice(0,r)}…${n.slice(n.length-a)}`}function Doe(e){const t=[{key:"material",label:e.material},{key:"rootFollow",label:e.rootFollow},{key:"drum",label:e.drum},{key:"bass",label:e.bass}],n=t.map(r=>Math.max(0,r.label.trim().length));for(;n.reduce((r,a)=>r+a,0)>Loe;){let r=-1,a=-1/0;for(let o=0;o<n.length;o+=1){const i=n[o]??0;i>v2&&i>a&&(a=i,r=o)}if(r<0)break;n[r]=Math.max(v2,(n[r]??v2)-1)}return t.reduce((r,a,o)=>(r[a.key]=Boe(a.label,n[o]??a.label.length),r),{})}function Pb(e){window.setTimeout(()=>{window.dispatchEvent(new CustomEvent(e))},0)}function Noe({particleSystemLabel:e,particleDisplayModeLabel:t,cursorHudHzLabel:n,gridTuningLabel:r,gridModeLabel:a,gridBaseHzLabel:o,hotkeyModeLabel:i,materialLoopNameLabel:s,rootFollowLoopNameLabel:l,drumPatternNameLabel:c,bassPatternNameLabel:d,onOpenMaterialLoopManager:p,onOpenRootFollowLoopManager:f,onOpenDrumPatternManager:b,onOpenBassPatternManager:g,onOpenGridTuningRack:y,materialLoopActive:x,rootFollowLoopActive:A,materialLoopHotkeysActive:M,rootFollowLoopHotkeysActive:v,octaveActive:w,sustainActive:R,swellActive:k,dampActive:__dampActive,expressionMode:__expressionMode,echoActive:I,driveActive:E}){const[F,L]=P.useState(n);P.useEffect(()=>{const N=W=>{const V=W.detail?.hz;Number.isFinite(V)&&L(wP(V))};return window.addEventListener(oI,N),()=>window.removeEventListener(oI,N)},[]);const B=()=>{p?.(),Pb(iI)},O=()=>{f?.(),Pb(sI)},T=()=>{b?.(),Pb(lI)},_=()=>{g?.(),Pb(cI)},G=()=>{y?.(),Pb(uI)},j=Doe({material:s,rootFollow:l,drum:c,bass:d});return u.jsx("div",{"data-xensonar-performance-strip":true,className:"mb-2 border border-neutral-800 bg-neutral-950/70 px-3 py-1.5 text-[10px]",children:u.jsxs("div",{"data-xen-status-row":true,className:"flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap leading-none",children:[u.jsxs("div",{"data-xen-status-particles":true,className:"shrink-0 text-neutral-300",title:`Particle system: ${e} · ${t}\nSystem: - previous, Shift+- next\nParticle modes: M previous, N next\nMute Pattern: open the particle rhythm controls`,children:[u.jsx("span",{className:"mr-2 uppercase tracking-widest text-[10px] text-neutral-500",children:"Particles"}),u.jsx("span",{className:"text-amber-200",children:e}),u.jsx("span",{className:"text-neutral-500",children:" · "}),u.jsx("span",{className:"text-neutral-200",children:t}),u.jsx("span",{className:"text-neutral-500",children:" · "}),u.jsx("span",{className:"text-cyan-200",children:F})]}),u.jsx("span",{className:"h-4 w-px shrink-0 bg-neutral-800","aria-hidden":"true"}),u.jsxs("button",{"data-xen-status-fretboard":true,type:"button",onClick:G,className:"shrink-0 rounded-sm border border-transparent px-1 py-0.5 text-neutral-300 transition hover:border-violet-900/60 hover:bg-violet-950/20",title:`Click: Open Grid Workbench\nTuning: , / ; previous · . / : next\nMode: Right Ctrl previous · AltGr next\nCurrent: ${r} · ${a} · Root ${o}`,children:[u.jsx("span",{className:"xen-header-unicode-icon mr-1 text-neutral-300","aria-hidden":"true",children:"🪜"}),u.jsx("span",{className:"mr-2 uppercase tracking-widest text-[10px] text-neutral-500",children:"Fretboard"}),u.jsx("span",{className:"text-violet-200",children:r}),u.jsx("span",{className:"text-neutral-500",children:" · "}),u.jsx("span",{className:"text-neutral-200",children:a}),u.jsx("span",{className:"text-neutral-500",children:" · "}),u.jsxs("span",{className:"text-cyan-200",children:["Root ",o]})]}),u.jsx("span",{className:"h-4 w-px shrink-0 bg-neutral-800","aria-hidden":"true"}),u.jsxs("div",{"data-xen-status-menus":true,className:"xen-h1-menu-strip min-w-0 shrink text-neutral-300",title:`Hotkey mode: ${i} · Backquote toggles Material / Root-Follow\nA–L: select quick slot · #: toggle selected loop`,children:[u.jsxs("button",{type:"button",onClick:B,className:`inline-flex h-6 max-w-[8.4rem] min-w-0 items-center gap-1 overflow-hidden rounded-sm border px-1.5 py-0.5 align-middle transition hover:bg-cyan-950/25 ${x?"bg-emerald-950/35 text-emerald-100":"bg-neutral-950/50 text-neutral-400"} ${M?"border-amber-400/90 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]":"border-neutral-800"}`,title:`Click: open Material Track manager · ${s}${M?" · quick-slot hotkeys active":""}${x?" · playing":""}\nBackquote: toggle Material / RFL hotkey target\nA–L: direct quick slots · #: toggle selected loop`,children:[u.jsx("span",{className:"xen-header-unicode-icon shrink-0 text-neutral-300","aria-hidden":"true",children:"📀"}),u.jsx("span",{className:"truncate",children:j.material})]}),u.jsx("span",{className:"mx-1 text-neutral-700",children:"/"}),u.jsxs("button",{type:"button",onClick:O,className:`inline-flex h-6 max-w-[8.4rem] min-w-0 items-center gap-1 overflow-hidden rounded-sm border px-1.5 py-0.5 align-middle transition hover:bg-violet-950/25 ${A?"bg-emerald-950/35 text-emerald-100":"bg-neutral-950/50 text-neutral-400"} ${v?"border-amber-400/90 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]":"border-neutral-800"}`,title:`Click: open Root Follow Loop manager · ${l}${v?" · quick-slot hotkeys active":""}${A?" · playing":""}\nBackquote: toggle Material / RFL hotkey target\nA–L: direct quick slots · #: toggle selected loop\n${__XenSpaceDecouplingHelp}`,children:[u.jsx(D6,{variant:"status"}),u.jsx("span",{className:"truncate",children:j.rootFollow})]}),u.jsx("span",{className:"mx-1 text-neutral-700",children:"/"}),u.jsxs("button",{type:"button",onClick:T,className:"inline-flex h-6 max-w-[8.4rem] min-w-0 items-center gap-1 overflow-hidden rounded-sm border border-neutral-800 bg-neutral-950/50 px-1.5 py-0.5 align-middle text-neutral-300 transition hover:bg-fuchsia-950/25",title:`Click: open Drum Pattern manager · ${c}\nCaps Lock: next pattern · Left Shift: previous`,children:[u.jsx("span",{className:"xen-header-unicode-icon shrink-0 text-neutral-300","aria-hidden":"true",children:"🥁"}),u.jsx("span",{className:"truncate",children:j.drum})]}),u.jsx("span",{className:"mx-1 text-neutral-700",children:"/"}),u.jsxs("button",{type:"button",onClick:_,className:"inline-flex h-6 max-w-[8.4rem] min-w-0 items-center gap-1 overflow-hidden rounded-sm border border-neutral-800 bg-neutral-950/50 px-1.5 py-0.5 align-middle text-neutral-300 transition hover:bg-fuchsia-950/25",title:`Click: open Bass Pattern manager · ${d}\nPitch Grid: Main / Bass Grid in Bass Pattern editor\n${__XenSpaceDecouplingHelp}`,children:[u.jsx("span",{className:"xen-header-unicode-icon shrink-0 text-neutral-300","aria-hidden":"true",children:"🎸"}),u.jsx("span",{className:"truncate",children:j.bass})]}),u.jsx(__XenMetaRack,{})]}),u.jsx("span",{className:"ml-auto"}),u.jsxs("div",{"data-xen-status-controls":true,className:"flex items-center gap-2 pl-1",children:[u.jsx(kb,{kind:"octave",active:w,title:"Octave · transpose live performance by one octave"}),u.jsx(kb,{kind:"sustain",active:R,title:"Sustain · hold or extend currently played live notes"}),u.jsx(__XenKeyboardDetachBadge,{}),u.jsx("span",{className:"rounded border border-neutral-700 px-1 text-[10px] text-neutral-400",title:"B + Left Alt: toggle expression mode (Pedal / Knob)",children:__expressionMode==='knob'?"KNOB":"PEDAL"}),u.jsx(kb,{kind:"swell",active:k,title:`Keyboard B · raise expression while held; ${__expressionMode==='knob'?'release to keep level':'release to return to normal'}. B + Left Alt toggles Pedal / Knob.`}),u.jsx(kb,{kind:"damp",active:__dampActive,title:`Keyboard Left Alt · lower expression while held (not AltGr); ${__expressionMode==='knob'?'release to keep level':'release to return to normal'}. B + Left Alt toggles Pedal / Knob.`}),u.jsx(kb,{kind:"echo",active:I,title:"Echo · right-click playfield to toggle delayed repeats; Power Off also clears feedback"}),u.jsx(kb,{kind:"drive",active:E,title:"Mycelium Drive · additional nonlinear saturation on the Mycelium sound path; not a master effects switch"})]})]})})}const Ooe=.32;let Ib=null;function Hy(e,t){return`${e}:${t}`}function PS(e){const t=e.indexOf(":");if(t<=0)return null;const n=e.slice(0,t),r=e.slice(t+1);return(n==="swap"||n==="insert-before"||n==="insert-after")&&r?{operation:n,entryId:r}:null}function _oe(e,t){return e&&t?`${e.title} 🔽 ${t.title}`:t?`🔽 ${t.title}`:e?`${e.title} 🔽`:"🔽"}function Mw(e,t,n){const r=PS(e);if(!r)return null;if(r.operation==="swap"){if(n&&r.entryId===n)return null;const c=t.find(d=>d.id===r.entryId);return c?{operation:"swap",label:"TAUSCHEN",targetLine:`🔄 ${c.title}`,highlightedEntryIds:[c.id]}:null}const a=n?t.filter(c=>c.id!==n):[...t],o=a.findIndex(c=>c.id===r.entryId);if(o<0)return null;const i=r.operation==="insert-before"?a[o-1]??null:a[o]??null,s=r.operation==="insert-before"?a[o]??null:a[o+1]??null,l=[i?.id,s?.id].filter(c=>!!c);return{operation:r.operation,label:"REINSCHIEBEN",targetLine:_oe(i,s),highlightedEntryIds:l}}function zoe(e){const t=[...e.rows].filter(l=>l.id&&Number.isFinite(l.top)&&Number.isFinite(l.bottom)&&l.bottom>l.top).sort((l,c)=>l.top-c.top);if(!t.length)return null;const n=t[0],r=t[t.length-1];if(e.pointerY<n.top)return{operation:"insert-before",entryId:n.id};if(e.pointerY>r.bottom)return{operation:"insert-after",entryId:r.id};const a=t.find(l=>e.pointerY>=l.top&&e.pointerY<=l.bottom)??t.reduce((l,c)=>{const d=(l.top+l.bottom)/2,p=(c.top+c.bottom)/2;return Math.abs(p-e.pointerY)<Math.abs(d-e.pointerY)?c:l},t[0]),o=Math.max(1,a.bottom-a.top),i=(e.pointerY-a.top)/o,s=Math.max(.2,Math.min(.45,e.insertBandRatio??Ooe));return i<=s?{operation:"insert-before",entryId:a.id}:i>=1-s?{operation:"insert-after",entryId:a.id}:{operation:"swap",entryId:a.id}}function ww(e){const t=e.ids.filter((l,c,d)=>l&&d.indexOf(l)===c),n=t.indexOf(e.draggedId),r=t.indexOf(e.targetId);if(n<0||r<0||e.draggedId===e.targetId)return t;if(e.operation==="swap"){const l=[...t];return l[n]=e.targetId,l[r]=e.draggedId,l}const a=t.filter(l=>l!==e.draggedId),o=a.indexOf(e.targetId);if(o<0)return t;const i=e.operation==="insert-before"?o:o+1,s=[...a];return s.splice(Math.max(0,Math.min(s.length,i)),0,e.draggedId),s}function nT(e,t){return e.length===t.length&&e.every((n,r)=>n===t[r])}function Q0(e){!e||typeof document>"u"||(Ib||(Ib=document.createElement("canvas"),Ib.width=1,Ib.height=1),e.setDragImage(Ib,0,0))}function Rw({state:e,label:t,title:n,sourceTitle:r,sourceSubtitle:a,tone:o="fuchsia"}){if(!e||!t||!r)return null;const i=o==="cyan"?"border-cyan-500/80 bg-cyan-950/95 text-cyan-50":o==="violet"?"border-violet-500/80 bg-violet-950/95 text-violet-50":"border-fuchsia-500/80 bg-fuchsia-950/95 text-fuchsia-50",s=o==="cyan"?"border-cyan-400/70 bg-cyan-900/50 text-cyan-50":o==="violet"?"border-violet-400/70 bg-violet-900/50 text-violet-50":"border-fuchsia-400/70 bg-fuchsia-900/50 text-fuchsia-50",l=typeof window>"u"?e.x:Math.min(Math.max(12,e.x+14),Math.max(12,window.innerWidth-590)),c=typeof window>"u"?e.y:Math.min(Math.max(38,e.y),Math.max(38,window.innerHeight-38));return u.jsx("div",{"data-xen-sort-preview":true,className:`pointer-events-none fixed z-[240] min-w-[22rem] max-w-[36rem] rounded-xl border px-3 py-2 text-[11px] shadow-2xl shadow-black/70 ${i}`,style:{left:l,top:c,transform:"translateY(-50%)"},children:u.jsxs("div",{className:"flex items-center justify-between gap-3",children:[u.jsxs("div",{className:"min-w-0 flex-1",children:[u.jsx("div",{className:"truncate font-semibold",children:r}),a?u.jsx("div",{className:"mt-0.5 truncate text-[10px] opacity-60",children:a}):null]}),u.jsxs("div",{className:`shrink-0 rounded-lg border px-3 py-1.5 text-right ${s}`,children:[u.jsx("div",{className:"text-[9px] uppercase tracking-[0.24em] opacity-75",children:t}),n?u.jsx("div",{className:"mt-1 max-w-[17rem] truncate font-semibold",children:n}):null]})]})})}const N6=420,Eb=16,A2=16,dI={octave:1200,tritave:1200*Math.log2(3)};function Vl(e,t,n){return Math.min(n,Math.max(t,e))}function Pi(e){return Math.round(e*10)/10}const __xenGridStepLimit=256;function rT(e,t){return Array.from({length:Math.max(1,e)},(n,r)=>Pi(r/Math.max(1,e)*t))}const aT=fc.filter(e=>e.label!=="Root"),_A=.15,O6=.25;function joe(e){const t={};for(const n of aT){const r=e.find(a=>Math.abs(a-n.cents)<=_A);typeof r=="number"&&(t[n.label]=Pi(r))}return t}function _6(e){return Object.keys(e).length}function Goe(e,t,n,r){const a=z6(e,t,n).label,o=_6(r);return o>0&&(a.includes("CDO")||a.includes("CDT"))?`${a} +${o}`:a}function y4(e,t,n){const r=e[n];if(n<=0||typeof r!="number")return null;for(const[a,o]of Object.entries(t))if(Math.abs(o-r)<=O6)return a;return null}function oT(e){return e.startsWith("custom:")}function z6(e,t,n){const r=dI[e],a=rT(n.length,t),o=n.length===a.length&&n.every((s,l)=>Math.abs(s-a[l])<=.1),i=Math.abs(t-r)<=.1;return o&&i?{family:e==="tritave"?"edt":"edo",divisionKind:"equal",label:`${n.length} ${e==="tritave"?"EDT":"EDO"}`}:{family:e==="tritave"?"cdt":"cdo",divisionKind:"custom",label:`${n.length} ${e==="tritave"?"CDT":"CDO"}`}}function qx(e,t,n,r={}){return Goe(e,t,n,r)}function x2(e){const t=hc(e),n=t?.periodFamily==="tritave"?"tritave":"octave",r=Math.max(1,t?.steps??Kp(e).length??12),a=Pi(vF(e)),o=Kp(e).slice(0,r),i=o.length>0?o.map(Pi):rT(r,a),s=joe(i);return{periodFamily:n,steps:r,periodCents:a,stepCents:i,name:t?.label??qx(n,a,i,s),nameTouched:!1,editingCustomId:oT(e)?e:null,jiTrackedCents:s}}function Hoe(e){return`${Pi(e).toFixed(1)}c`}function Voe(){return`custom:${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}function Woe(e){const{open:t,currentTuning:n,onMessage:r}=e,[a,o]=P.useState(()=>x2(n)),[i,s]=P.useState(1),[l,c]=P.useState(null),[d,p]=P.useState(""),[f,b]=P.useState(!1),g=P.useRef(null);P.useEffect(()=>{if(!t)return;const I=x2(n),E=Math.min(1,Math.max(1,I.stepCents.length-1));o(I),s(E),p(I.stepCents[E]?.toFixed(1)??"0.0"),b(!1)},[t,n]),P.useEffect(()=>{a.nameTouched||o(I=>({...I,name:qx(I.periodFamily,I.periodCents,I.stepCents,I.jiTrackedCents)}))},[a.periodFamily,a.periodCents,a.stepCents,a.jiTrackedCents,a.nameTouched]),P.useEffect(()=>{s(I=>Vl(I,1,Math.max(1,a.stepCents.length-1)))},[a.stepCents.length]),P.useEffect(()=>{const I=a.stepCents[i]??a.stepCents[1]??0;p(Pi(I).toFixed(1))},[i,a.stepCents]),P.useEffect(()=>{if(l===null)return;const I=F=>{const L=g.current;if(!L)return;const B=L.getBoundingClientRect(),O=Math.max(1,B.height-Eb-A2),_=1-(Vl(F.clientY-B.top,Eb,B.height-A2)-Eb)/O,G=Pi(_*a.periodCents);o(j=>{const N=[...j.stepCents],W=l<=0?0:N[l-1]+1,V=l>=N.length-1?j.periodCents-1:N[l+1]-1,U=Pi(Vl(G,W,V)),H=y4(j.stepCents,j.jiTrackedCents,l);return N[l]=U,{...j,stepCents:N,jiTrackedCents:H?{...j.jiTrackedCents,[H]:U}:j.jiTrackedCents}}),s(l)},E=()=>c(null);return window.addEventListener("pointermove",I),window.addEventListener("pointerup",E),()=>{window.removeEventListener("pointermove",I),window.removeEventListener("pointerup",E)}},[l,a.periodCents]);const y=P.useMemo(()=>z6(a.periodFamily,a.periodCents,a.stepCents),[a.periodFamily,a.periodCents,a.stepCents]),x=P.useMemo(()=>{const I=N6-Eb-A2;return a.stepCents.map((E,F)=>{const L=Eb+(1-E/Math.max(1,a.periodCents))*I;return{id:`draft-${F}`,index:F,y:L,cents:E}})},[a.periodCents,a.stepCents]),A=P.useMemo(()=>Object.fromEntries(aT.map(I=>{const E=a.jiTrackedCents[I.label],F=typeof E!="number"?"idle":Math.abs(E-I.cents)<=_A?"exact":"shifted";return[I.label,F]})),[a.jiTrackedCents]),M=(I,E,F,L=!1)=>{const B=Vl(Math.round(E),2,__xenGridStepLimit),O=Pi(Vl(F,400,4e3)),T=rT(B,O);o(_=>({periodFamily:I,steps:B,periodCents:O,stepCents:T,name:L&&_.nameTouched?_.name:qx(I,O,T),nameTouched:L?_.nameTouched:!1,editingCustomId:L?_.editingCustomId:null,jiTrackedCents:{}})),s(Math.min(1,B-1))},v=I=>{i<=0||o(E=>{const F=[...E.stepCents],L=i<=0?0:F[i-1]+1,B=i>=F.length-1?E.periodCents-1:F[i+1]-1,O=Pi(Vl(I,L,B)),T=y4(E.stepCents,E.jiTrackedCents,i);return F[i]=O,{...E,stepCents:F,jiTrackedCents:T?{...E.jiTrackedCents,[T]:O}:E.jiTrackedCents}})},w=(I,E)=>{o(F=>{const L=F.jiTrackedCents[I],B={...F.jiTrackedCents};if(typeof L=="number"){const j=F.stepCents.findIndex((N,W)=>W>0&&Math.abs(N-L)<=O6);if(j>0){const N=F.stepCents.filter((V,U)=>U!==j);delete B[I];const W=Vl(i>j?i-1:i,1,Math.max(1,N.length-1));return s(W),r(`${I} removed from the current grid.`),{...F,steps:N.length,stepCents:N,jiTrackedCents:B}}}const O=Pi(Vl(E,1,F.periodCents-1)),T=F.stepCents.findIndex((j,N)=>N>0&&Math.abs(j-O)<=_A);if(T>0)return B[I]=F.stepCents[T]??O,s(T),r(`${I} is already present in the current grid.`),{...F,jiTrackedCents:B};const _=[...F.stepCents,O].sort((j,N)=>j-N),G=_.findIndex(j=>Math.abs(j-O)<=_A);return B[I]=O,s(Math.max(1,G)),r(`${I} added to the current grid.`),{...F,steps:_.length,stepCents:_,jiTrackedCents:B}})},R=(I,E)=>{o(F=>({...F,editingCustomId:I,name:E,nameTouched:!0}))},k=I=>{const E=x2(I);o(E),s(1),b(!1)};return{editor:a,setEditor:o,selectedMarkerIndex:i,setSelectedMarkerIndex:s,centInput:d,setCentInput:p,jiMenuOpen:f,setJiMenuOpen:b,workbenchRef:g,draftClassification:y,workbenchMarkers:x,jiMenuStates:A,trackedJiCount:_6(a.jiTrackedCents),rebuildEqualDraft:M,updateSelectedMarker:v,toggleJiInterval:w,beginMarkerDrag:c,markSaved:R,loadTuning:k}}function j6(e){return{...e,stepCents:[...e.stepCents].sort((t,n)=>t-n),contentHash:e.contentHash??Qx(e)}}function Qx(e){return al(JSON.stringify({label:e.label,family:e.family,periodFamily:e.periodFamily,divisionKind:e.divisionKind,steps:e.steps,defaultModePolicy:e.defaultModePolicy,hotkeyCycleEligible:e.hotkeyCycleEligible,description:e.description,periodCents:e.periodCents,stepCents:[...e.stepCents].sort((t,n)=>t-n)}))}function G6(){return wS("grid")}function H6(e){return{selectedTuning:e.selectedTuning??null,activeRack:oh(e.activeRack),customTunings:e.customTunings.map(t=>j6({archivedId:t.id,label:t.label,family:t.family,periodFamily:t.periodFamily,divisionKind:t.divisionKind,steps:t.steps,defaultModePolicy:t.defaultModePolicy,hotkeyCycleEligible:t.hotkeyCycleEligible!==!1,description:t.description,periodCents:t.periodCents,stepCents:t.stepCents,updatedAt:t.updatedAt,contentHash:Qx(t)})),bassGridExtensions:__XenBassGrid.exportAll()}}function V6(e){if(!vt(e))return null;const t=typeof e.selectedTuning=="string"?e.selectedTuning:null,n=Array.isArray(e.activeRack)?oh(e.activeRack):[];return{selectedTuning:t,activeRack:n,customTunings:(Array.isArray(e.customTunings)?e.customTunings:[]).filter(vt).map(r=>j6({archivedId:String(r.archivedId??r.id??""),label:typeof r.label=="string"?r.label:"Imported Grid",family:["edo","edt","cdo","cdt","ji"].includes(String(r.family))?r.family:"edo",periodFamily:r.periodFamily==="tritave"?"tritave":"octave",divisionKind:r.divisionKind==="custom"?"custom":r.divisionKind==="ratio"?"ratio":"equal",steps:Math.max(1,Number(r.steps)||1),defaultModePolicy:r.defaultModePolicy==="bp_native"?"bp_native":"church_projection",hotkeyCycleEligible:r.hotkeyCycleEligible!==!1,description:typeof r.description=="string"?r.description:"Imported grid.",periodCents:Number(r.periodCents)||1200,stepCents:Array.isArray(r.stepCents)?r.stepCents.map(Number).filter(a=>Number.isFinite(a)):[0],updatedAt:Number(r.updatedAt)||Date.now(),contentHash:typeof r.contentHash=="string"?r.contentHash:null})).filter(r=>r.archivedId.startsWith("custom:")),bassGridExtensions:e.bassGridExtensions??null}}function qoe(e){return{format:"xensonar-grid-library",version:1,packageId:e.packageId??G6(),exportedAt:Date.now(),label:e.label,...H6(e),warnings:e.warnings??[]}}function Qoe(e){return Dte(e)}function Uoe(e){const t=JSON.parse(e),n=Wj({parsed:t,expectedFormat:"xensonar-grid-library",expectedVersion:1,fallbackLabel:"Xensonar Grid Library",fallbackPackageId:G6()}),r=V6(t);if(!r)throw new Error("Grid library is missing from the package.");return{...n,...r}}function Koe(e,t){zte(e,t,{prefix:"xensonar-grid"})}function IS(){return{activeRack:xp(),customTunings:FJ()}}function S4(e){const t=TJ(e.customTunings),n=oh(e.activeRack);return lj(n),{persistedCustomTunings:t,nextRack:n}}function W6(e,t,n={}){const r=n.fallbackLabel??"Imported item",a=n.importTag??"Import",o=e.trim()||r;if(!t.has(o))return t.add(o),o;let i=2;for(;t.has(`${o} (${a} ${i})`);)i+=1;const s=`${o} (${a} ${i})`;return t.add(s),s}function $oe(e,t){const n=new Map;for(const r of e){const a=t(r);a&&n.set(a,r)}return n}function q6(e){const{preferredId:t,usedIds:n,createId:r,isAcceptedId:a}=e;if((a?a(t):!0)&&!n.has(t))return n.add(t),t;const i=r();return n.add(i),i}function Xoe(){return`custom:${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}function Yoe(e,t,n){return{id:t,label:n,family:e.family,periodFamily:e.periodFamily,divisionKind:e.divisionKind==="ratio"?"custom":e.divisionKind,steps:e.steps,defaultModePolicy:e.defaultModePolicy,hotkeyCycleEligible:e.hotkeyCycleEligible!==!1,description:e.description,periodCents:e.periodCents,stepCents:[...e.stepCents].sort((r,a)=>r-a),builtIn:!1,updatedAt:e.updatedAt||Date.now()}}function v4(e,t){return e?t.get(e)??e:null}async function Joe(e){const t=IS(),n=e.activeRack??t.activeRack,r=qoe({label:e.label?.trim()||"Grid Library",selectedTuning:e.currentTuning,activeRack:n,customTunings:t.customTunings,warnings:[]});return Koe(Qoe(r),r.label),{archive:r,statusMessage:`Grid Package loaded: ${r.customTunings.length} custom grids · ${r.activeRack.length} rack slots.`}}function Q6(e){const t=IS(),r=[...e.mode==="replace"?[]:t.customTunings],a=new Set(r.map(p=>p.id)),o=new Set(r.map(p=>p.label)),i=$oe(r,p=>Qx({label:p.label,family:p.family,periodFamily:p.periodFamily,divisionKind:p.divisionKind,steps:p.steps,defaultModePolicy:p.defaultModePolicy,hotkeyCycleEligible:p.hotkeyCycleEligible!==!1,description:p.description,periodCents:p.periodCents,stepCents:p.stepCents})),s=new Map;let l=0,c=null;for(const p of e.payload.customTunings){const f=p.contentHash??Qx(p),b=i.get(f);if(b){s.set(p.archivedId,b.id);continue}const g=q6({preferredId:p.archivedId,usedIds:a,createId:Xoe,isAcceptedId:A=>A.startsWith("custom:")}),y=W6(p.label,o,{fallbackLabel:"Imported Grid"}),x=Yoe(p,g,y);r.push(x),i.set(f,x),s.set(p.archivedId,g),l+=1,c||(c=g)}if(e.mode==="replace"){const p=oh(e.payload.activeRack.map(g=>v4(g,s)).filter(g=>!!g)),f=S4({activeRack:p,customTunings:r}),b=v4(e.payload.selectedTuning,s)??p[0]??e.fallbackCurrentTuning;return{mode:"replace",importedCount:l,persistedCustomTunings:f.persistedCustomTunings,nextRack:f.nextRack,nextSelectedTuning:b,idRemap:Object.fromEntries(s),statusMessage:`Grid Memory loaded as a working copy: ${e.payload.customTunings.length} custom grids · ${p.length} rack slots.`}}const d=S4({activeRack:t.activeRack,customTunings:r});return{mode:e.mode==="differential"?"differential":"merge",importedCount:l,persistedCustomTunings:d.persistedCustomTunings,nextSelectedTuning:c,idRemap:Object.fromEntries(s),statusMessage:e.mode==="differential"?`Grid Memory combined differentially: ${l} custom grids imported.`:`Grid Memory extended: ${l} custom grids imported.`}}async function Zoe(e){const t=Uoe(await e.file.text()),n=Q6({payload:{selectedTuning:t.selectedTuning,activeRack:t.activeRack,customTunings:t.customTunings},mode:e.mode,fallbackCurrentTuning:e.fallbackCurrentTuning});__XenBassGrid.importExtensions(t.bassGridExtensions,n.idRemap,e.mode);return{archive:t,...n}}function Cw(e={}){const t=P.useRef(new Map),n=P.useRef(null),r=P.useCallback((p,f)=>{f?t.current.set(p,f):t.current.delete(p)},[]),a=P.useCallback(p=>{n.current={draggedId:p.draggedId,originVisibleIds:p.originVisibleIds.filter((f,b,g)=>f&&g.indexOf(f)===b),previewTarget:null,payload:p.payload}},[]),o=P.useCallback(()=>{n.current=null},[]),i=P.useCallback(()=>n.current,[]),s=P.useCallback(p=>{const f=n.current;return!p||!f||!f.originVisibleIds.includes(p.entryId)||(e.isSelfSwapTarget?e.isSelfSwapTarget(p,f):p.operation==="swap"&&p.entryId===f.draggedId)?null:p},[e]),l=P.useCallback(p=>{const g=(n.current?.originVisibleIds??Array.from(t.current.keys())).map(y=>{const x=t.current.get(y);if(!x)return null;const A=x.getBoundingClientRect();return{id:y,top:A.top,bottom:A.bottom}}).filter(y=>!!y);return s(zoe({pointerY:p.clientY,rows:g}))},[s]),c=P.useCallback(p=>{const f=n.current;if(!f)return null;const b=l(p);return b&&(f.previewTarget=b),b},[l]),d=P.useCallback(()=>{const p=n.current;return s(p?.previewTarget??null)},[s]);return{beginDrag:a,clearDrag:o,getDropTarget:d,getSession:i,registerRow:r,updatePreviewFromDragEvent:c}}function eie(e){const{open:t,currentTuning:n,activeRack:r,editor:a,draftClassification:o,onRackChange:i,onActivateTuning:s,onMessage:l,loadTuning:c,markSaved:d}=e,[p,f]=P.useState(n),[b,g]=P.useState(null),[y,x]=P.useState(""),[A,M]=P.useState(null),[v,w]=P.useState(0),R=P.useRef(null),k=P.useRef(null),I=P.useRef("merge"),E=Cw();P.useEffect(()=>{t&&(f(n),g(null),x(""))},[t,n]);P.useEffect(()=>{const onNativeOrder=()=>w(v=>v+1);window.addEventListener("xensonar:grid-tuning-library-updated",onNativeOrder);return()=>window.removeEventListener("xensonar:grid-tuning-library-updated",onNativeOrder)},[]);const F=P.useMemo(()=>cj(),[v]);P.useEffect(()=>{t&&R.current?.scrollIntoView({block:"nearest"})},[t,p,v]);const L=P.useMemo(()=>Array.from({length:wA},(Q,ne)=>r[ne]??null),[r]),B=Mw(y,L.map((Q,ne)=>({id:String(ne),title:Q?ti(F,Q):`Slot ${ne+1} empty`})),b?.source==="rack"?String(b.fromIndex):void 0),O=new Set(B&&B.operation!=="swap"?B.highlightedEntryIds:[]),T=Q=>{i(Q.filter(ne=>!!ne))},_=(Q,ne,ee=b)=>{if(!ee)return;const ie=[...L],de=ie.findIndex(oe=>oe===ee.tuning);if(ee.source==="rack"){const oe=ie[ee.fromIndex]??null;if(!oe)return;if(ne==="swap"){const ue=ie[Q]??null;ie[ee.fromIndex]=ue,ie[Q]=oe}else{ie.splice(ee.fromIndex,1);const ue=ne==="insert-before"?Q:Q+1,fe=ue>ee.fromIndex?Math.max(0,ue-1):ue;ie.splice(Math.max(0,Math.min(ie.length,fe)),0,oe)}T(ie),l(`Active rack reordered: ${ti(F,oe)}.`);return}if(de>=0){l(`${ti(F,ee.tuning)} is already in the active rack.`);return}if(ne==="insert-before"||ne==="insert-after"){const oe=ne==="insert-before"?Q:Q+1;ie.splice(Math.max(0,Math.min(ie.length,oe)),0,ee.tuning),ie.splice(wA)}else ie[Q]=ee.tuning;T(ie),l(`${ti(F,ee.tuning)} loaded into slot ${Q+1} geladen.`)},G=(Q,showHud=true)=>{const ne=E.updatePreviewFromDragEvent(Q);ne&&(Q.preventDefault(),showHud&&M({x:Q.clientX,y:Q.clientY}),x(Hy(ne.operation,ne.entryId)))},j=Q=>{const ne=E.getSession();if(!ne)return;const ee=E.getDropTarget();Q.preventDefault(),ee&&_(Number(ee.entryId),ee.operation,ne.payload),E.clearDrag(),g(null),x(""),M(null)},N=()=>{E.clearDrag(),g(null),x(""),M(null)},W=(Q,ne,ee)=>{Q0(Q.dataTransfer);const ie={source:"rack",tuning:ne,fromIndex:ee};E.beginDrag({draggedId:String(ee),originVisibleIds:L.map((de,oe)=>String(oe)),payload:ie}),g(ie)},V=(Q,ne)=>{Q0(Q.dataTransfer);const ee={source:"library",tuning:ne};E.beginDrag({draggedId:`library:${ne}`,originVisibleIds:L.map((ie,de)=>String(de)),payload:ee}),g(ee)},U=Q=>{const ne=L[Q];if(!ne)return;const ee=[...L];ee.splice(Q,1),ee.push(null),T(ee),l(`${ti(F,ne)} removed from the active rack. It remains available in the library.`)},H=(Q,ne)=>{const ee=Q+ne;if(ee<0||ee>=wA)return;const ie=[...L],de=ie[Q];ie[Q]=ie[ee]??null,ie[ee]=de??null,T(ie)},q=Q=>{f(Q),c(Q),s(Q)},K=Q=>{f(Q),c(Q)},Y=()=>{const Q=a.editingCustomId??Voe(),ne=a.name.trim()||qx(a.periodFamily,a.periodCents,a.stepCents,a.jiTrackedCents),ee=LJ({id:Q,label:ne,family:o.family,periodFamily:a.periodFamily,divisionKind:o.divisionKind,steps:a.stepCents.length,defaultModePolicy:"church_projection",hotkeyCycleEligible:!0,description:`${o.label} · ${a.periodFamily==="tritave"?"Tritave":"Octave"} · ${a.periodCents.toFixed(1)}c`,periodCents:a.periodCents,stepCents:a.stepCents,updatedAt:Date.now()});if(!ee){l("Grid could not be saved.");return}w(ie=>ie+1),f(ee),d(ee,ne),l(`${ne} saved. The grid is now in the library and is added to the active rack only via drag and drop.`)},J=async Q=>{if(!oT(Q))return;try{if(!await __xenDeleteLibraryEntry({kind:'grid',id:Q,name:ti(F,Q)},()=>BJ(Q)))return;}catch(error){l(error.message);return}const ne=L.map(de=>de===Q?null:de),ee=ne.find(de=>!!de)??"12edo";r.includes(Q)&&T(ne),w(de=>de+1);const ie=n===Q?ee:r[0]??n;f(ie),c(ie),n===Q&&s(ie),l("Custom grid deleted from the library.")},Z=Q=>{I.current=Q,k.current?.click()},te=async Q=>{const ne=Q.target.files?.[0];if(Q.target.value="",!!ne)try{const ee=await Zoe({file:ne,mode:I.current,fallbackCurrentTuning:n});w(ie=>ie+1),ee.mode==="replace"?(i(ee.nextRack),f(ee.nextSelectedTuning),c(ee.nextSelectedTuning),s(ee.nextSelectedTuning)):ee.nextSelectedTuning&&(f(ee.nextSelectedTuning),c(ee.nextSelectedTuning)),l(ee.statusMessage)}catch(ee){console.error("[xensonar][grid-library][import]",ee),l(ee instanceof Error?`Grid package could not be loaded: ${ee.message}`:"Grid package could not be loaded.")}},X=async()=>{const{statusMessage:Q}=await Joe({currentTuning:p,activeRack:r,label:"Grid Library"});l(Q)};return{selectedTuning:p,setSelectedTuning:f,dragPayload:b,rackDropTarget:y,dragHud:A,libraryOptions:F,activeRackSlots:L,selectedLibraryEntryRef:R,gridLibraryImportInputRef:k,rackDropPreview:B,rackInsertNeighborIds:O,registerRackRow:E.registerRow,handleRackDragOver:G,handleRackDrop:j,beginRackDrag:W,beginLibraryDrag:V,endDrag:N,handleRemoveFromRack:U,handleMoveRackEntry:H,selectRackTuning:q,selectLibraryTuning:K,handleSaveDraft:Y,handleDeleteCustom:J,requestGridLibraryImport:Z,handleGridLibraryImportInput:te,handleExportGridLibraryArchive:X}}function U6({open:e,currentTuning:t,activeRack:n,onClose:r,onRackChange:a,onActivateTuning:o,onResetRack:i,onUseInMelodicLoop:s}){const[l,c]=P.useState(""),d=Woe({open:e,currentTuning:t,onMessage:c}),{editor:p,setEditor:f,selectedMarkerIndex:b,setSelectedMarkerIndex:g,centInput:y,setCentInput:x,jiMenuOpen:A,setJiMenuOpen:M,workbenchRef:v,draftClassification:w,workbenchMarkers:R,jiMenuStates:k,trackedJiCount:I,rebuildEqualDraft:E,updateSelectedMarker:F,toggleJiInterval:L,beginMarkerDrag:B,markSaved:O,loadTuning:T}=d;P.useEffect(()=>{e&&c("")},[e,t]),P.useEffect(()=>{if(!e)return;const se=document.body.style.overflow,xe=Be=>{Be.key!=="Escape"&&["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","PageUp","PageDown","Home","End"," "].includes(Be.key)&&Be.preventDefault()};return document.body.style.overflow="hidden",window.addEventListener("keydown",xe,!0),()=>{document.body.style.overflow=se,window.removeEventListener("keydown",xe,!0)}},[e]);const _=eie({open:e,currentTuning:t,activeRack:n,editor:p,draftClassification:w,onRackChange:a,onActivateTuning:o,onMessage:c,loadTuning:T,markSaved:O}),{selectedTuning:G,setSelectedTuning:j,dragPayload:N,rackDropTarget:W,dragHud:V,libraryOptions:U,activeRackSlots:H,selectedLibraryEntryRef:q,gridLibraryImportInputRef:K,rackDropPreview:Y,rackInsertNeighborIds:J,registerRackRow:Z,handleRackDragOver:te,handleRackDrop:X,beginRackDrag:Q,beginLibraryDrag:ne,endDrag:ee,handleRemoveFromRack:ie,handleMoveRackEntry:de,selectRackTuning:oe,selectLibraryTuning:ue,handleSaveDraft:fe,handleDeleteCustom:he,requestGridLibraryImport:re,handleGridLibraryImportInput:le,handleExportGridLibraryArchive:Ae}=_;__useQuickActive('grid',t,ti(U,t),e,r);if(!e)return null;const ce=Y?.label??"",ge=Y?.targetLine??"",Ce=N?ti(U,N.tuning):"",Re=N?.source==="rack"?`Slot ${N.fromIndex+1}`:N?"from Library":"";return u.jsxs("div",{"data-xen-header-menu":"grid",tabIndex:-1,className:"fixed inset-0 z-[160] flex items-start justify-center overflow-hidden bg-black/70 px-4 pb-4 pt-4 sm:pt-6",onClick:r,onKeyDownCapture:se=>{if(se.stopPropagation(),se.key==="Escape"){se.preventDefault(),r();return}["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","PageUp","PageDown","Home","End"," "].includes(se.key)&&se.preventDefault()},children:[u.jsx(Rw,{state:V,label:ce,title:ge,sourceTitle:Ce,sourceSubtitle:Re,tone:"fuchsia"}),u.jsxs("div",{className:"flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-fuchsia-800/70 bg-neutral-950 p-4 text-[11px] shadow-2xl shadow-black/60",onClick:se=>se.stopPropagation(),children:[u.jsxs("div",{className:"flex items-start justify-between gap-3",children:[u.jsxs("div",{children:[u.jsx("div",{className:"text-[10px] uppercase tracking-[0.3em] text-fuchsia-300/80",children:"🪜 Grid Workbench"}),u.jsx("div",{className:"mt-1 text-base font-semibold text-fuchsia-50",children:"Active Cycling Rack, Tuning Library, and Period Workbench"}),u.jsx("div",{className:"mt-1 text-fuchsia-100/75",children:"Compact management window. The library scrolls internally; rack and workbench remain fixed in the window."})]}),u.jsxs('div',{className:'relative flex flex-col items-end gap-1 flex-shrink-0',children:[u.jsx("button",{type:"button",onClick:r,className:"rounded-full border border-fuchsia-800/70 px-3 py-1 text-base font-bold leading-none text-fuchsia-100 hover:bg-fuchsia-950/40",children:"×"}),u.jsx(__XenBassGridEditor,{tuningId:G})]})]}),u.jsx("input",{ref:K,type:"file",accept:"application/json,.json",className:"hidden",onChange:se=>{le(se)}}),u.jsxs("div",{className:"mt-4 grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(17rem,0.9fr)_minmax(18rem,1fr)_minmax(23rem,1.05fr)]",children:[u.jsx("div",{className:"space-y-3 min-h-0",children:u.jsxs("div",{className:"rounded border border-fuchsia-900/50 bg-fuchsia-950/20 p-3",children:[u.jsxs("div",{className:"mb-2 flex items-center justify-between gap-2",children:[u.jsxs("div",{children:[u.jsx("div",{className:"text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/70",children:"Active Selection"}),u.jsx("div",{className:"text-[10px] leading-relaxed text-fuchsia-100/75",children:"Up to 11 slots. Nine are filled by default. Only this list is cycled."})]}),u.jsxs("div",{className:"flex items-center gap-2",children:[s?u.jsx("button",{type:"button",onClick:()=>{s(G),c(`${ti(U,G)} is now used in Melodic Loop.`)},className:"rounded border border-violet-700/70 bg-violet-950/25 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-violet-100 hover:bg-violet-900/30",children:"Use in Melodic Loop"}):null,u.jsx("button",{type:"button",onClick:i,className:"rounded border border-fuchsia-800/70 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-fuchsia-100 hover:bg-fuchsia-950/40",children:"Defaults"})]})]}),u.jsx("div",{className:"grid grid-cols-1 gap-2","data-xen-sort-zone":"grid",onDragOver:te,onDrop:X,children:H.map((se,xe)=>{const Be=se===t,Ie=se===G,Qe=PS(W),Ne=Qe?.operation==="swap"&&Qe.entryId===String(xe)&&N!==null,Ue=J.has(String(xe))&&N!==null;return u.jsx("div",{ref:Ye=>{Z(String(xe),Ye)},className:"relative",children:u.jsx("div",{className:`rounded-xl border px-3 py-2 ${se?"bg-black/25":"bg-black/10"} ${Ne?"border-amber-400/80":Ue?"border-cyan-400/80":N?"border-fuchsia-700/70":"border-neutral-800"}`,children:u.jsxs("div",{className:"flex items-start justify-between gap-3",children:[u.jsxs("button",{type:"button",...__quickProps('grid',se??'',ti(U,se??''),{zone:'grid',start:Ye=>{if(se)Q(Ye,se,xe)},over:Ye=>te(Ye,false),drop:X,end:ee,preview:()=>Y?Y.label+' · '+Y.targetLine:''}),onClick:()=>{se&&oe(se)},draggable:!!se,onDragStart:Ye=>{se&&Q(Ye,se,xe)},onDragEnd:ee,className:`min-w-0 flex-1 rounded-lg px-2 py-1 text-left ${se?Ie?"bg-fuchsia-950/40 text-fuchsia-50":"text-neutral-200 hover:bg-neutral-900/80":"text-neutral-600"}`,children:[u.jsxs("div",{className:"text-[10px] uppercase tracking-[0.2em] text-neutral-500",children:["Slot ",xe+1]}),u.jsx("div",{className:`truncate font-semibold ${Be?"text-cyan-200":""}`,children:se?ti(U,se):"empty"})]}),se?u.jsxs("div",{className:"flex shrink-0 items-center gap-1",children:[u.jsx("button",{type:"button",onClick:()=>de(xe,-1),className:"rounded border border-fuchsia-900/70 px-2 py-1 text-[10px] text-fuchsia-100 hover:bg-fuchsia-950/40",children:"↑"}),u.jsx("button",{type:"button",onClick:()=>de(xe,1),className:"rounded border border-fuchsia-900/70 px-2 py-1 text-[10px] text-fuchsia-100 hover:bg-fuchsia-950/40",children:"↓"}),u.jsx("button",{type:"button",onClick:()=>ie(xe),className:"rounded border border-fuchsia-900/70 px-2 py-1 text-[10px] text-fuchsia-100 hover:bg-fuchsia-950/40",children:"−"})]}):u.jsx("div",{className:"shrink-0 rounded border border-dashed border-fuchsia-900/40 px-2 py-1 text-[10px] text-fuchsia-100/55",children:"Drop"})]})})},`slot-${xe}`)})})]})}),u.jsx("div",{className:"flex min-h-0 flex-col",children:u.jsxs("div",{className:"flex min-h-0 flex-1 flex-col rounded border border-fuchsia-900/50 bg-fuchsia-950/20 p-3",children:[u.jsxs("div",{className:"mb-2 flex flex-wrap items-start justify-between gap-2",children:[u.jsxs("div",{children:[u.jsx("div",{className:"text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/70",children:"Tuning Library"}),u.jsx("div",{className:"text-[10px] leading-relaxed text-fuchsia-100/75",children:"Custom grids are preserved here. Drag and drop them from here into the active rack."})]}),u.jsx(Vj,{compact:!0,exportLabel:"Export Library Package",replaceLabel:"Load Working Copy",onExport:()=>{Ae()},onImport:re})]}),u.jsx("div",{className:"min-h-0 flex-1 space-y-2 overflow-y-auto pr-1",onWheelCapture:se=>se.stopPropagation(),children:U.map(se=>{const xe=hc(se.value),Be=G===se.value,Ie=oT(se.value);return u.jsx("div",{ref:Be?q:null,draggable:!0,onDragStart:Qe=>{ne(Qe,se.value)},onDragEnd:ee,className:`rounded-xl border px-3 py-2 ${Be?"border-fuchsia-500 bg-fuchsia-950/40 text-fuchsia-50":"border-neutral-800 bg-black/20 text-neutral-200 hover:bg-neutral-900/80"}`,children:u.jsxs("div",{className:"flex items-start justify-between gap-3",children:[u.jsxs("button",{type:"button",draggable:true,...__quickProps('grid',se.value,se.label,{zone:'grid',start:Qe=>ne(Qe,se.value),over:Ye=>te(Ye,false),drop:X,end:ee,preview:()=>Y?Y.label+' · '+Y.targetLine:''}),onClick:()=>{ue(se.value)},className:"min-w-0 flex-1 text-left",children:[u.jsx("div",{className:"truncate font-semibold",children:[se.label,u.jsx(__QuickBadge,{kind:'grid',id:se.value})]}),u.jsx("div",{className:"text-[10px] text-neutral-500",children:xe?`${xe.family.toUpperCase()} · ${xe.periodFamily==="tritave"?"Tritave":"Octave"} · ${xe.steps} Schritte`:"Raster"})]}),u.jsx("div",{className:"flex shrink-0 items-center gap-1",children:Ie?u.jsx("button",{type:"button",onClick:()=>he(se.value),className:"rounded border border-rose-900/70 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-rose-100 hover:bg-rose-950/40",children:"delete"}):null})]})},se.value)})})]})}),u.jsxs("div",{className:"space-y-3 min-h-0",children:[u.jsxs("div",{className:"rounded border border-fuchsia-900/50 bg-fuchsia-950/20 p-3",children:[u.jsxs("div",{className:"flex items-start justify-between gap-3",children:[u.jsxs("div",{children:[u.jsx("div",{className:"text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/70",children:"Period Workbench"}),u.jsx("div",{className:"mt-1 text-[10px] leading-relaxed text-fuchsia-100/75",children:"Edit a period, drag markers, fine-tune in cents, then save it to the library."})]}),u.jsx("button",{type:"button",onClick:()=>{T("12edo"),j("12edo")},className:"rounded border border-fuchsia-800/70 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-fuchsia-100 hover:bg-fuchsia-950/40",children:"Neu"})]}),u.jsxs("div",{className:"mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",children:[u.jsx("div",{className:"space-y-3",children:u.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[u.jsxs("label",{className:"space-y-1 text-[10px] text-fuchsia-100/80",children:[u.jsx("span",{className:"uppercase tracking-[0.18em] text-fuchsia-200/70",children:"Period"}),u.jsx("button",{type:"button",onClick:()=>E("octave",p.steps,dI.octave),className:`w-full rounded border px-3 py-2 ${p.periodFamily==="octave"?"border-fuchsia-500 bg-fuchsia-950/40 text-fuchsia-50":"border-fuchsia-900/50 text-fuchsia-100 hover:bg-fuchsia-950/30"}`,children:"Octave"})]}),u.jsxs("label",{className:"space-y-1 text-[10px] text-fuchsia-100/80",children:[u.jsx("span",{className:"uppercase tracking-[0.18em] text-fuchsia-200/70",children:" "}),u.jsx("button",{type:"button",onClick:()=>E("tritave",p.steps,dI.tritave),className:`w-full rounded border px-3 py-2 ${p.periodFamily==="tritave"?"border-fuchsia-500 bg-fuchsia-950/40 text-fuchsia-50":"border-fuchsia-900/50 text-fuchsia-100 hover:bg-fuchsia-950/30"}`,children:"Tritave"})]}),u.jsxs("label",{className:"space-y-1 text-[10px] text-fuchsia-100/80",children:[u.jsx("span",{className:"uppercase tracking-[0.18em] text-fuchsia-200/70",children:"Total Cents"}),u.jsx("input",{type:"number",min:400,max:4e3,step:.1,value:p.periodCents,onChange:se=>f(xe=>({...xe,periodCents:Pi(Vl(Number(se.target.value)||xe.periodCents,400,4e3))})),onBlur:()=>f(se=>({...se,periodCents:Pi(Vl(se.periodCents,400,4e3))})),className:"w-full rounded border border-fuchsia-900/50 bg-black/25 px-3 py-1.5 text-sm text-fuchsia-50"})]}),u.jsxs("div",{className:"relative space-y-1 text-[10px] text-fuchsia-100/80",children:[u.jsx("span",{className:"uppercase tracking-[0.18em] text-fuchsia-200/70",children:" "}),u.jsx("button",{type:"button",onClick:()=>M(se=>!se),className:`w-full rounded border px-3 py-1.5 ${A||I>0?"border-emerald-500/60 bg-fuchsia-950/40 text-fuchsia-50":"border-fuchsia-900/50 text-fuchsia-100 hover:bg-fuchsia-950/30"}`,children:"JI"}),A?u.jsx("div",{className:"absolute left-0 top-full z-10 mt-1 w-[9.5rem] rounded border border-fuchsia-800/70 bg-[#12061f] p-2 shadow-xl shadow-black/50",children:u.jsx("div",{className:"max-h-52 space-y-1 overflow-y-auto pr-1",children:aT.map(se=>{const xe=k[se.label]??"idle";return u.jsxs("button",{type:"button",onClick:()=>L(se.label,se.cents),className:`block w-full rounded border px-2 py-1 text-left text-[10px] hover:bg-fuchsia-950/30 ${xe==="exact"?"border-emerald-500/50 text-emerald-300":xe==="shifted"?"border-amber-500/50 text-amber-300":"border-fuchsia-900/50 text-fuchsia-100"}`,children:[u.jsx("div",{className:"font-medium",children:[se.label,u.jsx(__QuickBadge,{kind:'grid',id:se.value})]}),u.jsxs("div",{className:"text-[9px] opacity-75",children:[se.cents.toFixed(1),"c"]})]},se.label)})})}):null]})]})}),u.jsxs("div",{className:"space-y-3",children:[u.jsxs("label",{className:"space-y-1 text-[10px] text-fuchsia-100/80",children:[u.jsx("span",{className:"uppercase tracking-[0.18em] text-fuchsia-200/70",children:"Pitch Steps"}),u.jsx("input",{type:"number",min:2,max:__xenGridStepLimit,step:1,value:p.steps,onChange:se=>E(p.periodFamily,Number(se.target.value)||12,p.periodCents),className:"w-full rounded border border-fuchsia-900/50 bg-black/25 px-3 py-2 text-sm text-fuchsia-50"})]}),u.jsxs("div",{className:"space-y-1 text-[10px] text-fuchsia-100/80",children:[u.jsx("span",{className:"uppercase tracking-[0.18em] text-fuchsia-200/70",children:"Basis"}),u.jsx("button",{type:"button",onClick:()=>E(p.periodFamily,p.steps,p.periodCents,!0),className:"w-full rounded border border-fuchsia-700/70 px-3 py-2 text-sm font-semibold text-fuchsia-50 hover:bg-fuchsia-950/40",children:"Reset as Equal Tuning"})]})]})]}),u.jsx(__XenNativePeriodMarkerRack,{editor:p,markers:R,selectedIndex:b,onSelect:g,onDrag:B,containerRef:v,classification:w}),u.jsxs("div",{className:"mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]",children:[u.jsxs("label",{className:"space-y-1 text-[10px] text-fuchsia-100/80",children:[u.jsxs("span",{className:"uppercase tracking-[0.18em] text-fuchsia-200/70",children:["Set Cents for Marker ",b]}),u.jsx("input",{type:"number",step:.1,value:y,onChange:se=>x(se.target.value),onBlur:()=>F(Number(y.replace(",","."))||0),className:"w-full rounded border border-fuchsia-900/50 bg-black/25 px-3 py-2 text-sm text-fuchsia-50"})]}),u.jsx("button",{type:"button",onClick:()=>F((p.stepCents[b]??0)-1),className:"self-end rounded border border-fuchsia-700/70 px-3 py-2 text-sm font-semibold text-fuchsia-50 hover:bg-fuchsia-950/40",children:"− 1c"}),u.jsx("button",{type:"button",onClick:()=>F((p.stepCents[b]??0)+1),className:"self-end rounded border border-fuchsia-700/70 px-3 py-2 text-sm font-semibold text-fuchsia-50 hover:bg-fuchsia-950/40",children:"+ 1c"})]}),u.jsxs("div",{className:"mt-3 grid gap-3 md:grid-cols-[1fr_auto]",children:[u.jsxs("label",{className:"space-y-1 text-[10px] text-fuchsia-100/80",children:[u.jsx("span",{className:"uppercase tracking-[0.18em] text-fuchsia-200/70",children:"Speichertitel"}),u.jsx("input",{type:"text",value:p.name,onChange:se=>f(xe=>({...xe,name:se.target.value,nameTouched:!0})),className:"w-full rounded border border-fuchsia-900/50 bg-black/25 px-3 py-2 text-sm text-fuchsia-50"})]}),u.jsx("button",{type:"button",onClick:fe,className:"self-end rounded border border-fuchsia-500 bg-fuchsia-950/35 px-4 py-2 text-sm font-semibold text-fuchsia-50 hover:bg-fuchsia-900/40",children:"Save"})]}),u.jsx("div",{className:"mt-2 rounded border border-fuchsia-900/40 bg-black/20 px-3 py-2 text-[10px] leading-relaxed text-fuchsia-100/75",children:p.editingCustomId?"You are editing a saved custom grid. Saving updates only the library entry.":"New grids start here from an EDO/EDT base and become available as library entries only after saving."})]}),u.jsx("div",{className:"min-h-[2.75rem]",children:l?u.jsx("div",{className:"rounded border border-fuchsia-900/40 bg-black/20 px-3 py-2 text-[10px] text-fuchsia-100/80",children:l}):null})]})]})]})]})}