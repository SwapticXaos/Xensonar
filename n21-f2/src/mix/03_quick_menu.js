const __XenSongKinds=Object.freeze(['grid','material','rootFollow','drum','bass']);
/* P7.38 — per-session Grid Profiles; tune ID and tile instance ID are separate. */
const __xenGridUid=()=> 'grid-profile-'+(globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2));
const __xenGridKey=e=>e?.kind==='grid'?('grid\0'+(e.instanceId?.startsWith('legacy:')?e.id:(e.instanceId||e.id))):(e.kind+'\0'+e.id);
const __xenGridCompatibleMode=(tuningId,mode)=>typeof Ka==='function'&&!Ka(tuningId).some(m=>m.value===mode)?'chromatic':mode||'chromatic';
const __xenGridModeName=id=>(typeof yF!=='undefined'?yF:[]).find(m=>m.value===id)?.label||String(id||'Chromatic');
function __xenGridProfile(raw){
 const v=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const degrees=a=>[...new Set((Array.isArray(a)?a:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<256))].sort((a,b)=>a-b);
 const offsets=Array.isArray(v.mainStepOffsets)?v.mainStepOffsets.slice(0,256).map(x=>Number.isFinite(Number(x))?Math.max(-120,Math.min(120,Number(x))):0):[];
 const bc=__XenBassGrid.normalize(v.bassConfig);
 return {modeId:typeof v.modeId==='string'&&v.modeId.length<80?v.modeId:'chromatic',mainMutedDegrees:degrees(v.mainMutedDegrees),mainStepOffsets:offsets,
   bassEnabled:v.bassEnabled===true,bassConfig:{...bc,bassUsesGrid:v.bassConfig?.bassUsesGrid!==false}};
}
function __xenValidateQuickItems(value){
 if(!Array.isArray(value)||value.length>240)throw Error('A constellation must contain at most 240 references.');
 const seen=new Set(),out=[];
 for(const entry of value){
  if(!entry||Object.getPrototypeOf(entry)!==Object.prototype||!['grid','material','rootFollow','drum','bass'].includes(entry.kind)||typeof entry.id!=='string'||!entry.id.trim()||entry.id.length>1024||typeof entry.name!=='string'||entry.name.length>1024)throw Error('Invalid quick-access reference.');
  if(entry.kind==='grid'){
   if(Object.keys(entry).some(k=>!['kind','id','name','instanceId','gridProfile'].includes(k)))throw Error('Invalid grid profile fields.');
   const instanceId=typeof entry.instanceId==='string'&&entry.instanceId.length>0&&entry.instanceId.length<160?entry.instanceId:'legacy:'+entry.id;
   const key='grid\0'+instanceId;if(seen.has(key))continue;seen.add(key);
   out.push({kind:'grid',id:entry.id,name:entry.name,instanceId,gridProfile:entry.gridProfile?__xenGridProfile(entry.gridProfile):null});
  }else{
   if(Object.keys(entry).some(k=>!['kind','id','name'].includes(k)))throw Error('Invalid quick-access reference.');
   const key=entry.kind+'\0'+entry.id;if(seen.has(key))continue;seen.add(key);out.push({kind:entry.kind,id:entry.id,name:entry.name});
  }
 }
 return out;
}

function __QuickColumns({items,variant='',render}){
 return u.jsx('div',{className:'xen-quick-grid '+variant,children:__XenSongKinds.map(kind=>u.jsx('div',{className:'xen-quick-column','data-xen-quick-column':kind,...(variant?{'data-xen-song-column':kind,'data-xen-song-label':{grid:'Threadboard',material:'Material',rootFollow:'Root Follow',drum:'Drums',bass:'Bass'}[kind]}:{}),children:items.filter(e=>e.kind===kind).map((e,i)=>render(e,i,kind))},kind))});
}

/* P4C2 UI: semantic menu adapters, shared selections and source octave offsets. */
const __XenOctaves=(()=>{
 let state={particle:0,wave:0,keyboard:0};const listeners=new Set();
 try{const saved=JSON.parse(localStorage.getItem('xensonar.source-octaves.v1')||'{}');for(const k of Object.keys(state))if(Number.isInteger(saved[k]))state[k]=Math.max(-3,Math.min(3,saved[k]));}catch{}
 return {snapshot:()=>state,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),factor:lane=>2**(state[lane]??0),set(lane,value){if(!(lane in state))return;state={...state,[lane]:Math.max(-3,Math.min(3,value))};if(typeof __XenNodalSurfaces!=='undefined')__XenNodalSurfaces.refreshPitch?.();try{localStorage.setItem('xensonar.source-octaves.v1',JSON.stringify(state))}catch{}for(const fn of listeners)fn();}};
})();
function __SourceOctave({lane,title}){
 const state=P.useSyncExternalStore(__XenOctaves.subscribe,__XenOctaves.snapshot,__XenOctaves.snapshot),v=state[lane];
 return u.jsxs('span',{className:'xen-source-octave',children:[u.jsx('span',{children:'Oct'}),u.jsx('button',{type:'button',title:title+' one octave down','aria-label':title+' octave down',disabled:v<=-3,onClick:()=>__XenOctaves.set(lane,v-1),children:'−'}),u.jsx('output',{'aria-label':title+' octave',children:v>0?'+'+v:String(v)}),u.jsx('button',{type:'button',title:title+' one octave up','aria-label':title+' octave up',disabled:v>=3,onClick:()=>__XenOctaves.set(lane,v+1),children:'+'})]});
}
const __XenQuick=(()=>{
 const adapters=new Map(),listeners=new Set(),icons={grid:'🪜',material:'📀',rootFollow:'🎼',drum:'🥁',bass:'🎸'};let active=null,items=[],pulse=0,closeActive=null,storageError='';
 try{const saved=JSON.parse((localStorage.getItem('xensonar.quick-menu.v2')||localStorage.getItem('xensonar.quick-menu.v1')||'[]'));items=__xenValidateQuickItems(saved);}catch(error){storageError='Quick Access: '+error.message}
 let activationSerial=0;
 let selectedByKind={},hotkeys={material:[],rootFollow:[]},tilePulse=null,tileTimer=null,tileSerial=0;
 let snapshot={items,active,pulse,hotkeys,tilePulse,storageError,selectedByKind};const emit=()=>{snapshot={items,active,pulse,hotkeys,tilePulse,storageError,selectedByKind};for(const fn of listeners)fn()};
 function setSelected(kind,id){if(!icons[kind]||id===undefined||id===null)return;const key=String(id);if(kind==='grid'&&__XenBassGrid.liveOverride()?.tuningId===key)return;if(selectedByKind[kind]===key)return;selectedByKind={...selectedByKind,[kind]:key};emit()}
 function syncHotkeys(kind,entries){if(!Object.hasOwn(hotkeys,kind))return;const ids=entries.slice(0,__XenLoopHotkeys.length).map(entry=>entry.id);if(ids.join('\0')===hotkeys[kind].join('\0'))return;hotkeys={...hotkeys,[kind]:ids};emit()}
 function pulseEntry(kind,id){if(tileTimer)clearTimeout(tileTimer);const serial=++tileSerial;tilePulse={kind,id,serial};emit();tileTimer=setTimeout(()=>{tileTimer=null;if(tilePulse?.serial===serial){tilePulse=null;emit()}},220)}
 function save(){try{localStorage.setItem('xensonar.quick-menu.v2',JSON.stringify(items));storageError=''}catch(error){storageError='Quick Access: '+error.message}emit()}
 return {setSelected,restoreGridSelection(value,override){selectedByKind={...selectedByKind,grid:value??null};__XenBassGrid.setLiveOverride(override);emit()},clearGridSelection(){selectedByKind={...selectedByKind,grid:null};__XenBassGrid.clearLiveOverride();emit()},refreshLibraries:emit,getItems:()=>items.map(e=>JSON.parse(JSON.stringify(e))),replaceItems(value){const next=__xenValidateQuickItems(value);try{localStorage.setItem('xensonar.quick-menu.v2',JSON.stringify(next))}catch(error){storageError='Quick Access: '+error.message;emit();throw error}items=next;storageError='';emit();return next.map(e=>JSON.parse(JSON.stringify(e)))},icons,adapters,syncHotkeys,pulseEntry,snapshot:()=>snapshot,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),register(kind,adapter){adapters.set(kind,adapter);setSelected(kind,adapter.selected);syncHotkeys(kind,adapter.entries);if(kind==='grid'&&typeof __XenMainRoomSessionBridge!=='undefined')__XenMainRoomSessionBridge.initializeStarter();return()=>{if(adapters.get(kind)===adapter){adapters.delete(kind);syncHotkeys(kind,[])}}},signal(){pulse++;emit()},setActive(value,close){if(value)closeActive=close??closeActive;else closeActive=null;if(active?.kind===value?.kind&&active?.id===value?.id&&active?.name===value?.name)return;active=value;emit()},add(entry){if(!entry||!icons[entry.kind]||typeof entry.id!=='string')return;if(!items.some(e=>__xenGridKey(e)===__xenGridKey(entry))){items=__xenValidateQuickItems([...items,entry.kind==='grid'?{kind:'grid',id:entry.id,name:String(entry.name||entry.id),instanceId:entry.instanceId||__xenGridUid(),gridProfile:entry.gridProfile}: {kind:entry.kind,id:entry.id,name:String(entry.name||entry.id)}]);save()}},remove(entry){items=items.filter(e=>__xenGridKey(e)!==__xenGridKey(entry));save()},dismiss(){if(!active)return false;closeActive?.();return true},activatePrepared:async function(entry){const ticket=++activationSerial;await __XenStarterMaterial.ensure(entry);if(ticket!==activationSerial)return null;return this.activate(entry)},cancelActivation(){activationSerial++},activate(entry){activationSerial++;const adapter=adapters.get(entry.kind);if(!adapter)return false;const current=adapter.entries.find(e=>e.id===entry.id);if(!current)return false;if(entry.kind==='grid'&&entry.gridProfile){if(!__XenMainRoomSessionBridge.applyGridProfile(entry))return false;}else adapter.choose(current.id);if(entry.kind==='grid'){if(!entry.gridProfile)__XenBassGrid.clearLiveOverride();selectedByKind={...selectedByKind,grid:entry.instanceId||'legacy:'+entry.id};emit()}else setSelected(entry.kind,current.id);pulseEntry(entry.kind,entry.kind==='grid'?(entry.instanceId||'legacy:'+entry.id):current.id);return true;},cycle(dir){
   if(!active)return false;
   const order=['grid','material','rootFollow','drum','bass','meta'],events={grid:'xensonar:open-grid-tuning-rack',material:'xensonar:open-material-loop-manager',rootFollow:'xensonar:open-root-follow-loop-manager',drum:'xensonar:open-drum-pattern-manager',bass:'xensonar:open-bass-pattern-manager',meta:'xensonar:open-meta-menu'};
   const at=order.indexOf(active.kind);if(at<0)return false;
   const next=order[(at+dir+order.length)%order.length],close=closeActive;
   close?.();active=null;closeActive=null;emit();
   window.setTimeout(()=>{
    if(next==='meta'){window.dispatchEvent(new CustomEvent(events[next]));return}
    // Native buttons own the real modal-open state; the legacy event remains a fallback.
    if(typeof __xenOpenOriginalLibrary!=='function'||!__xenOpenOriginalLibrary(next))window.dispatchEvent(new CustomEvent(events[next]));
   },0);return true;
  }};
})();
function __useQuickAdapter(kind,entries,selected,choose){
 const ref=P.useRef();ref.current={entries,selected,choose};
 P.useEffect(()=>__XenQuick.register(kind,{get entries(){return ref.current.entries},get selected(){return ref.current.selected},choose:id=>ref.current.choose(id)}),[kind]);
 P.useLayoutEffect(()=>{__XenQuick.syncHotkeys(kind,entries);__XenQuick.refreshLibraries()},[kind,entries]);
 P.useLayoutEffect(()=>{__XenQuick.setSelected(kind,selected)},[kind,selected]);
}
function __useQuickActive(kind,id,name,open=true,onClose){
 const close=P.useRef(onClose);close.current=onClose;
 P.useEffect(()=>{if(!open)return;if(['material','rootFollow'].includes(kind))__XenStarterMaterial.request(kind);__XenQuick.setActive({kind,id:String(id??''),name:String(name??'')},()=>close.current?.());return()=>{if(__XenQuick.snapshot().active?.kind===kind)__XenQuick.setActive(null)}},[kind,id,name,open]);
 P.useEffect(()=>{if(!open)return;const frame=requestAnimationFrame(()=>{document.querySelector('[data-xen-header-menu="'+kind+'"]')?.focus({preventScroll:true})});return()=>cancelAnimationFrame(frame)},[kind,open]);
}
function __QuickBadge({kind,id}){const s=P.useSyncExternalStore(__XenQuick.subscribe,__XenQuick.snapshot,__XenQuick.snapshot);return s.items.some(e=>e.kind===kind&&e.id===String(id))?u.jsx('span',{className:'xen-quick-badge',title:'Added to Quick Access',children:__XenQuick.icons[kind]}):null;}
// Bind to the existing library's operations, not a second ordering model.
const __XenQuickDragBindings=new WeakMap();
function __quickProps(kind,id,name,sort){return {draggable:false,ref:node=>{if(node)__XenQuickDragBindings.set(node,sort)},'data-xen-quick-kind':kind,'data-xen-quick-id':String(id),'data-xen-quick-name':String(name),title:String(name)+' · drag to Quick Access'};}
/* N13: Material Track and Root Follow Loop share these nine direct slot hotkeys.
   Hotkeys apply to playlist positions, not permanent track IDs. */
const __XenLoopHotkeys=Object.freeze(['A','S','D','F','G','H','J','K','L']);
function __XenLoopKey(index){return Number.isInteger(index)&&index>=0&&index<__XenLoopHotkeys.length?' ('+__XenLoopHotkeys[index]+')':'';}
/* N19: preserve N14/N17 design; pointer gestures and hover share the visible left landing surface. */
const __XenQuickHelpText='Drag an item to Quick Access for faster access.';
/* P7.37 H1: the four timed Quick Access kinds show their real library bar count.
   Reuse the owning adapter's metadata; do not store stale timing in session tiles.
   A missing count remains unknown rather than being guessed from the tuning or BPM. */
function __xenTimedBarsFromRecord(record){
 if(!record||typeof record!=='object')return null;
 const values=[record.bars,record.barCount,record.loopBars,record.durationBars,
  record.loopComposer?.bars,record.composer?.bars,record.pattern?.bars,
  record.material?.bars,record.config?.bars];
 for(const raw of values){const n=Number(raw);if(raw!==undefined&&raw!==null&&raw!==''&&Number.isInteger(n)&&n>=1&&n<=1024)return n}
 return null;
}
function __xenQuickEntryTitle(entry){
 if(entry.kind==='grid')return entry.name+' · '+__xenGridModeName(entry.gridProfile?.modeId)+(entry.gridProfile?.bassEnabled?' · Bass Grid':'');
 const timed=['material','rootFollow','drum','bass'].includes(entry.kind);
 if(!timed)return entry.name;
 const adapter=__XenQuick.adapters.get(entry.kind);
 const current=adapter?.entries?.find(x=>String(x.id)===String(entry.id));
 const bars=__xenTimedBarsFromRecord(current)??__xenTimedBarsFromRecord(entry);
 return entry.name+(bars===null?'':' · '+bars+' '+(bars===1?'bar':'bars'));
}
function __QuickDock({params={},update=()=>{}}={}){
 const s=P.useSyncExternalStore(__XenQuick.subscribe,__XenQuick.snapshot,__XenQuick.snapshot),[remove,setRemove]=P.useState(null),[message,setMessage]=P.useState(''),[saveOpen,setSaveOpen]=P.useState(false);
 P.useSyncExternalStore(typeof __XenMetaSessions!=='undefined'?__XenMetaSessions.subscribe:()=>()=>{},typeof __XenMetaSessions!=='undefined'?__XenMetaSessions.snapshot:()=>null,typeof __XenMetaSessions!=='undefined'?__XenMetaSessions.snapshot:()=>null);
 const columns=P.useMemo(()=>{const next={grid:[],material:[],rootFollow:[],drum:[],bass:[]};for(const entry of s.items)next[entry.kind]?.push(entry);return next;},[s.items]);
 // A pulse is an event observed by THIS mounted room, never restored state.
 const observedPulse=P.useRef(s.pulse),[flash,setFlash]=P.useState(0);
 P.useEffect(()=>{
  if(observedPulse.current===s.pulse)return;
  observedPulse.current=s.pulse;setFlash(s.pulse);
  const timer=setTimeout(()=>setFlash(0),2300);return()=>clearTimeout(timer);
 },[s.pulse]);
 /* Do not display the provisional left dock before its first geometry measurement. */
 const [layout,setLayout]=P.useState({leftTop:156,leftHeight:52,migrated:false,rightWidth:210,rightHeight:120,documentList:false,ready:false});
 const occupied=Math.max(0,...Object.values(columns).map(entries=>entries.length));
 const sessionLabel=typeof __XenMetaSessions!=='undefined'?__XenMetaSessions.liveSessionLabel():'';
 const needed=(occupied?38+occupied*34+(occupied-1)*5+(remove?70:0)+(message?30:0):38)+(sessionLabel?18:0);
 P.useLayoutEffect(()=>{
  let frame=0,settledFrames=0,lastBootGeometry='',layoutIsReady=false;
  const measure=()=>{
   frame=0;
   const pan=document.querySelector('.xen-performance [aria-label="Keyboard"] .xen-performance-pan');
   const panel=document.querySelector('.xen-performance');
   const bottom=Math.max(pan?.getBoundingClientRect().bottom??148,panel?.getBoundingClientRect().bottom??148);
   const leftTop=Math.max(156,bottom+8),leftAvailable=Math.max(0,Math.floor(window.innerHeight-72-leftTop));
   const marker=document.querySelector('[aria-label="Place a marker in the recording"]'),side=marker?.getBoundingClientRect();
   const railWidth=document.querySelector('.xen-quick-dock')?.getBoundingClientRect().width??210;
   const usableRight=!!side&&side.width>=Math.min(170,railWidth)&&window.innerWidth>=1600;
   const migrated=occupied>0&&needed>leftAvailable&&usableRight;
   // Reserve a usable recording hit area below the palette. Long lists
   // use the existing document flow before the fixed target can reach zero.
   const documentList=migrated&&needed>window.innerHeight-310;
   const next={leftTop,leftHeight:leftAvailable,migrated,
    rightWidth:railWidth,
    rightHeight:needed,documentList,ready:true};
   // Keep the dock hidden until two consecutive frame measurements agree.
   // Otherwise the first visible frame can briefly expose provisional geometry.
   const signature=[leftTop,leftAvailable,migrated,railWidth,needed,documentList].join('|');
   if(!layoutIsReady){
    settledFrames=signature===lastBootGeometry?settledFrames+1:1;
    lastBootGeometry=signature;
    if(settledFrames<2){queue();return}
    layoutIsReady=true;
   }
   document.documentElement.style.setProperty('--xen-quick-marker-top',migrated?(156+needed+10)+'px':'156px');
   document.documentElement.toggleAttribute('data-xen-quick-page-list',documentList);
   setLayout(old=>Object.keys(next).every(k=>old[k]===next[k])?old:next);
  };
  const queue=()=>{if(!frame)frame=requestAnimationFrame(measure)};
  queue();window.addEventListener('resize',queue);window.addEventListener('scroll',queue,{passive:true});
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(queue):null;
  const pan=document.querySelector('.xen-performance [aria-label="Keyboard"] .xen-performance-pan'),panel=document.querySelector('.xen-performance');
  if(pan)observer?.observe(pan);if(panel)observer?.observe(panel);
  return()=>{cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',queue);window.removeEventListener('scroll',queue);document.documentElement.style.removeProperty('--xen-quick-marker-top');document.documentElement.removeAttribute('data-xen-quick-page-list')};
 },[occupied,needed]);
 const allColumnsFilled=Object.values(columns).every(entries=>entries.length>0);
 const collection=u.jsxs('div',{className:'xen-quick-collection'+(layout.migrated?' is-migrated':'')+(layout.documentList?' is-document':''),
  style:layout.migrated?{right:'var(--xen-side-rail-inset)',width:layout.rightWidth}:undefined,
  children:[u.jsxs('div',{className:'xen-quick-mutes-save',children:[u.jsx(__QuickMuteRow,{params,update,showIcons:!allColumnsFilled}),u.jsx('button',{type:'button',className:'xen-quick-save-trigger','aria-label':'Save Quickrack Session in Meta Menu',title:'Save Quickrack Session in Meta Menu','aria-haspopup':'dialog',onClick:()=>setSaveOpen(true),children:'💾'})]}),u.jsx(__QuickColumns,{items:s.items,render:(entry,index,kind)=>u.jsxs('button',{type:'button',className:'xen-quick-tile'+(s.selectedByKind?.[kind]===(kind==='grid'?(entry.instanceId||'legacy:'+entry.id):entry.id)?' is-selected-live':'')+(s.tilePulse?.kind===kind&&s.tilePulse?.id===(kind==='grid'?(entry.instanceId||'legacy:'+entry.id):entry.id)?' is-key-pulse':'')+(typeof __XenMetaSessions!=='undefined'&&Object.keys(__XenMetaSessions.liveItemColor(entry)).length?' is-session-tinted':''),style:(()=>{const tint=typeof __XenMetaSessions!=='undefined'?__XenMetaSessions.liveItemColor(entry):{};return {'--xen-session-border':tint.border??'#294632','--xen-session-bg':tint.background??'#0c2414'}})(),'data-xen-shortcut-kind':kind,'data-xen-shortcut-id':entry.instanceId||entry.id,title:__xenQuickEntryTitle(entry),'aria-label':entry.name,onClick:()=>{void __XenQuick.activatePrepared(entry).then(result=>{if(result!==null)setMessage(result?'':entry.name+' is no longer available.')}).catch(error=>setMessage('Preparation: '+error.message))},onContextMenu:e=>{e.preventDefault();setRemove(entry)},children:[u.jsx('span',{className:'xen-quick-symbol'+(entry.kind==='rootFollow'?' xen-quick-rfl':''),children:__XenQuick.icons[entry.kind]}),entry.kind==='grid'&&u.jsx('span',{className:'xen-grid-profile-badge',children:__xenGridModeName(entry.gridProfile?.modeId).slice(0,3)+(entry.gridProfile?.bassEnabled?' ◇':'')}),u.jsx('span',{className:'xen-quick-index',children:index+1}),u.jsx(__QuickHotkey,{kind,id:entry.id,params,hotkeys:s.hotkeys})]},__xenGridKey(entry))}),
   sessionLabel&&u.jsx('div',{className:'xen-quick-session-caption',title:'Active saved session',children:'Session: '+sessionLabel}),
   remove&&u.jsxs('div',{className:'xen-quick-confirm',children:[u.jsx('span',{children:'„'+remove.name+'“?'}),u.jsx('button',{type:'button',onClick:()=>{__XenQuick.remove(remove);setRemove(null)},children:'Remove'}),u.jsx('button',{type:'button',onClick:()=>setRemove(null),children:'Cancel'})]}),u.jsx(__XenStarterMaterialStatus,{}),(message||s.storageError)&&u.jsx('small',{role:'status',children:message||s.storageError})]});
 P.useEffect(()=>()=>__XenQuick.cancelActivation(),[]);
 const dock=u.jsxs('section',{className:'xen-quick-dock'+(flash?' is-ready':'')+(layout.migrated?' is-migrated':''),'aria-label':'Quick Access','data-xen-quick-hint':__XenQuickHelpText,
  style:{top:layout.leftTop,height:layout.leftHeight,maxHeight:'none',visibility:layout.ready?'visible':'hidden',pointerEvents:layout.ready?'auto':'none'},onPointerDown:e=>e.stopPropagation(),onMouseDown:e=>e.stopPropagation(),onClick:e=>e.stopPropagation(),
  children:[flash>0&&u.jsx('span',{key:'drop-'+flash,className:'xen-quick-signal','aria-hidden':true}),!layout.documentList&&collection]});
 return typeof document==='undefined'?dock:u.jsxs(P.Fragment,{children:[dock,layout.ready&&layout.documentList&&ao.createPortal(collection,document.body),
  ao.createPortal(u.jsx('span',{className:'xen-quick-hover-info',role:'tooltip',children:__XenQuickHelpText}),document.body),saveOpen&&u.jsx(__XenQuickSaveDialog,{onClose:()=>setSaveOpen(false)})]});
}
if(typeof document!=='undefined'){
 // The fixed target and the visible LEFT palette are one landing surface.
 // A migrated palette on the right stays separate. No dialog/preview geometry.
 const landingRect=()=>document.querySelector('.xen-quick-dock')?.getBoundingClientRect()??null;
 const inDock=e=>{const r=landingRect();return !!r&&r.width>0&&r.height>0&&
  e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom};
 /* N19: one pointer transaction for sorting AND quick access. Destination,
    not initial direction, chooses the action. Browser-native dragging never
    takes ownership of these rows; callbacks reuse each library's own session. */
 const __XenQuickPointerDrag=(()=>{
  let session=null,ghost=null,suppressClick=false,frame=0;
  const hooks=()=>session&&(__XenQuickDragBindings.get(session.source)||session.sort);
  function transfer(){
   const data=new Map();
   return {effectAllowed:'move',dropEffect:'move',setData:(k,v)=>data.set(k,String(v)),
    getData:k=>data.get(k)||'',clearData:k=>k?data.delete(k):data.clear(),
    get types(){return [...data.keys()]},setDragImage(){}};
  }
  const libraryEvent=e=>({clientX:e.clientX,clientY:e.clientY,dataTransfer:session.transfer,
   target:document.elementFromPoint(e.clientX,e.clientY),currentTarget:session.source,
   preventDefault(){},stopPropagation(){}});
  function leaveSort(){
   if(!session?.sorting)return;
   session.sorting=false;hooks()?.end?.();
  }
  function clear(){
   if(!session)return;
   const old=session;
   try{leaveSort()}finally{
    session=null;cancelAnimationFrame(frame);frame=0;
    ghost?.remove();ghost=null;document.querySelector('.xen-meta-board')?.classList.remove('is-drop-hover');for(const lane of document.querySelectorAll('.xen-meta-lane'))lane.classList.remove('is-drop-lane');if(typeof __xenMetaRenderDropMarker==='function')__xenMetaRenderDropMarker(null);
    document.documentElement.classList.remove('xen-quick-pointer-dragging');
    document.querySelector('.xen-quick-dock')?.classList.remove('xen-quick-pointer-over');
    if(old.dragging)suppressClick=true;
    try{document.documentElement.releasePointerCapture(old.pointerId)}catch{}
   }
  }
  function zoneAt(e){
   const sort=hooks();if(!sort?.zone||!session.modal.isConnected)return null;
   const zone=session.modal.querySelector('[data-xen-sort-zone="'+sort.zone+'"]');
   if(!zone)return null;
   const r=zone.getBoundingClientRect();
   // Viewport hit testing also excludes clipped/offscreen rows and other controls.
   const hit=document.elementFromPoint(e.clientX,e.clientY);
   return e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom&&
    hit&&zone.contains(hit)?zone:null;
  }
  function update(e){
   if(!session?.dragging)return;
   session.last={clientX:e.clientX,clientY:e.clientY};
   const meta=typeof __xenMetaDropTarget==='function'?__xenMetaDropTarget(e,session):null;session.metaTarget=meta;
   const board=document.querySelector('.xen-meta-board');board?.classList.toggle('is-drop-hover',!!meta);
   if(typeof __xenMetaRenderDropMarker==='function')__xenMetaRenderDropMarker(meta);
   for(const lane of document.querySelectorAll('.xen-meta-lane'))lane.classList.toggle('is-drop-lane',!!meta&&lane===meta.column);
   const inside=!meta&&session.modal.dataset.xenHeaderMenu!=='meta'&&inDock(e),zone=inside||meta?null:zoneAt(e),sort=hooks();
   session.overDock=inside;placeQuickHelp(e,inside);
   if(zone){
    if(!session.sorting){session.sorting=true;sort.start?.(libraryEvent(e))}
    sort.over?.(libraryEvent(e));
   }else leaveSort();
   document.querySelector('.xen-quick-dock')?.classList.toggle('xen-quick-pointer-over',inside);
   ghost.classList.toggle('is-over',inside||!!meta);
   ghost.classList.toggle('is-sorting',!!zone);
   const detail=zone?sort.preview?.():'';
   ghost.textContent=(__XenQuick.icons[session.entry.kind]||'')+' '+session.entry.name+
    (meta?' · LOSLASSEN → SESSION':session.modal.dataset.xenHeaderMenu==='meta'?' · DRAG TO CONSTELLATION':detail?' · '+detail:inside?' · +':'');
   ghost.style.left=Math.max(4,Math.min(e.clientX+14,window.innerWidth-ghost.offsetWidth-4))+'px';
   ghost.style.top=Math.max(4,Math.min(e.clientY-18,window.innerHeight-ghost.offsetHeight-4))+'px';
  }
  function tick(){
   if(!session?.dragging)return;
   if(!session.source.isConnected||!session.modal.isConnected){clear();return}
   const zone=session.metaTarget?.column??(session.overDock?null:zoneAt(session.last));
   if(zone&&zone.scrollHeight>zone.clientHeight){
    const r=zone.getBoundingClientRect(),y=session.last.clientY;
    const step=y<r.top+28?-Math.min(12,(r.top+28-y)*.45):
     y>r.bottom-28?Math.min(12,(y-r.bottom+28)*.45):0;
    if(step){const before=zone.scrollTop;zone.scrollTop+=step;if(zone.scrollTop!==before)update(session.last)}
   }
   frame=requestAnimationFrame(tick);
  }
  window.addEventListener('pointerdown',e=>{
   if(e.button!==0||e.isPrimary===false)return;
   suppressClick=false;clear();suppressClick=false;
   const target=e.target instanceof Element?e.target:null;
   const row=target?.closest('[data-xen-quick-kind][data-xen-quick-id]');
   const modal=row?.closest('[data-xen-header-menu]');
   if(!row||!modal||!row.dataset.xenQuickId||target.closest('input,textarea,select,[contenteditable="true"]'))return;
   session={source:row,modal,sort:__XenQuickDragBindings.get(row),pointerId:e.pointerId,
    entry:{kind:row.dataset.xenQuickKind,id:row.dataset.xenQuickId,name:row.dataset.xenQuickName||row.dataset.xenQuickId},
    x:e.clientX,y:e.clientY,last:{clientX:e.clientX,clientY:e.clientY},dragging:false,sorting:false,transfer:transfer()};
   // No capture and no cancellation until movement: simple clicks keep selection.
  },true);
  // Prevent the browser's competing drag/text-selection default at its source.
  // Click still reaches the row. Nothing outside a semantic playlist row changes.
  window.addEventListener('mousedown',e=>{
   if(session&&session.source.contains(e.target)&&e.button===0)e.preventDefault();
  },true);
  window.addEventListener('dragstart',e=>{
   if(e.target instanceof Element&&e.target.closest('[data-xen-quick-kind]')){
    e.preventDefault();e.stopImmediatePropagation();
   }
  },true);
  window.addEventListener('pointermove',e=>{
   if(!session||e.pointerId!==session.pointerId)return;
   if(!(e.buttons&1)){clear();return}
   if(!session.dragging){
    if(Math.hypot(e.clientX-session.x,e.clientY-session.y)<5)return;
    session.dragging=true;suppressClick=true;
    ghost=document.createElement('div');ghost.className='xen-quick-pointer-ghost';
    ghost.setAttribute('aria-hidden','true');document.body.appendChild(ghost);
    document.documentElement.classList.add('xen-quick-pointer-dragging');
    try{document.documentElement.setPointerCapture(session.pointerId)}catch{}
    frame=requestAnimationFrame(tick);
   }
   e.preventDefault();e.stopImmediatePropagation();update(e);
  },{capture:true,passive:false});
  window.addEventListener('pointerup',e=>{
   if(!session||e.pointerId!==session.pointerId)return;
   if(!session.dragging){session=null;return}
   e.preventDefault();e.stopImmediatePropagation();
   try{
    update(e);
    if(session.metaTarget)__xenMetaCommitDrop(session);
    else if(session.modal.dataset.xenHeaderMenu!=='meta'&&inDock(e))__XenQuick.add(session.entry);
    else if(zoneAt(e)&&session.sorting)hooks()?.drop?.(libraryEvent(e));
    else if(session.modal.dataset.xenHeaderMenu==='meta')window.dispatchEvent(new CustomEvent('xensonar:meta-drag-note',{detail:{message:'Not placed · source unchanged. Drag it onto the constellation on the right.'}}));
   }finally{clear()}
  },true);
  // Captured drags may dispatch click at HTML or the common modal ancestor.
  // Consume that one click regardless of target; next real press resets it.
  window.addEventListener('click',e=>{
   if(!suppressClick)return;
   suppressClick=false;e.preventDefault();e.stopImmediatePropagation();
  },true);
  window.addEventListener('pointercancel',e=>{if(e.pointerId===session?.pointerId)clear()},true);
  window.addEventListener('lostpointercapture',e=>{if(e.pointerId===session?.pointerId&&session.dragging)clear()},true);
  window.addEventListener('blur',clear);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear()});
  window.addEventListener('keydown',e=>{
   if(e.key==='Escape'&&session?.dragging){e.preventDefault();e.stopImmediatePropagation();clear()}
   else if(session&&['ArrowLeft','ArrowRight'].includes(e.key))clear();
  },true);
  return Object.freeze({clear});
 })();
 // The pointer transaction consumes drag-generated clicks before this listener.
 window.addEventListener('click',e=>{
  const row=e.target?.closest?.('[data-xen-quick-kind][data-xen-quick-id]');
  if(!e.defaultPrevented&&row?.closest('[data-xen-header-menu]')&&!row.closest('[data-xen-header-menu="meta"]'))__XenQuick.signal();
 },true);
 const placeQuickHelp=(e,inside=inDock(e))=>{
  const hint=document.querySelector('.xen-quick-hover-info');if(!hint)return;
  if(e.pointerType==='touch'||!__XenQuick.snapshot().active||!inside){hint.style.display='none';return}
  hint.style.display='block';
  const w=hint.offsetWidth,h=hint.offsetHeight;
  hint.style.left=Math.max(8,Math.min(e.clientX+14,window.innerWidth-w-8))+'px';
  hint.style.top=Math.max(8,Math.min(e.clientY-h-12,window.innerHeight-h-8))+'px';
 };
 window.addEventListener('pointermove',e=>placeQuickHelp(e),true);
 window.addEventListener('blur',()=>{const hint=document.querySelector('.xen-quick-hover-info');if(hint)hint.style.display='none'});
 window.addEventListener('keydown',e=>{if(e.target?.closest?.('.xen-quick-save-dialog,[data-xen-header-menu="meta"]'))return;if(!__XenQuick.snapshot().active)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();__XenQuick.dismiss();return}if(e.code==='CapsLock'||e.code==='ShiftLeft'){e.stopImmediatePropagation();return}if(!['ArrowLeft','ArrowRight'].includes(e.key)||e.altKey||e.ctrlKey||e.metaKey||e.target?.closest('input,select,textarea,[contenteditable="true"],[role="slider"]'))return;e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)__XenQuick.cycle(e.key==='ArrowRight'?1:-1)},true);
}


// One canonical switch per column; Raster bypasses the RFL impulse timing.
const __QuickMuteLanes=Object.freeze({grid:['rootFollowImpulsRasterMuted','Raster',true],material:['materialLoopActive','Material Track'],rootFollow:['rootFollowLoopActive','Root Follow Loop'],drum:['drumActive','Drums'],bass:['bassActive','Bass']});
function __QuickMuteRow({params,update,showIcons=false}){
 return u.jsx('div',{className:'xen-quick-mutes','aria-label':'Quick track mute',children:Object.entries(__QuickMuteLanes).map(([kind,[field,label,inverted]])=>{
  const muted=inverted ? !!params[field] : !params[field];
  return u.jsx('button',{type:'button','data-quick-mute':kind,'aria-label':label+' mute','aria-pressed':muted,title:kind==='grid' ? (muted?'Enable grid':'Bypass grid · play RFL continuously') : (muted?'Unmute ':'Mute ')+label,className:muted?'is-muted':'',onClick:()=>update({[field]:inverted ? !muted : muted}),'aria-description':kind==='grid'?'Bypasses the RFL impulse grid; saved pattern and timbre are preserved.':undefined,children:showIcons?u.jsx('span',{className:'xen-quick-mute-icon','aria-hidden':true,children:__XenQuick.icons[kind]}):null},kind);
 })});
}

function __QuickHotkey({kind,id,params,hotkeys}) {
 const index=hotkeys[kind]?.indexOf(id)??-1,key=__XenLoopHotkeys[index];
 if(!key)return null;
 const mode=params.resonanceHotkeyMode??'material',active=kind==='rootFollow'?mode==='root-follow':mode==='material';
 return u.jsx('span',{className:'xen-quick-hotkey'+(active?' is-active':''),'aria-label':'Hotkey '+key+(active?' active':' switch mode to use'),children:key});
}
