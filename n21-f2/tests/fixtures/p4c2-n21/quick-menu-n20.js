/* P4C2 UI: semantic menu adapters, shared selections and source octave offsets. */
const __XenOctaves=(()=>{
 let state={particle:0,wave:0,keyboard:0};const listeners=new Set();
 try{const saved=JSON.parse(localStorage.getItem('xensonar.source-octaves.v1')||'{}');for(const k of Object.keys(state))if(Number.isInteger(saved[k]))state[k]=Math.max(-3,Math.min(3,saved[k]));}catch{}
 return {snapshot:()=>state,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),factor:lane=>2**(state[lane]??0),set(lane,value){if(!(lane in state))return;state={...state,[lane]:Math.max(-3,Math.min(3,value))};if(typeof __XenNodalSurfaces!=='undefined')__XenNodalSurfaces.refreshPitch?.();try{localStorage.setItem('xensonar.source-octaves.v1',JSON.stringify(state))}catch{}for(const fn of listeners)fn();}};
})();
function __SourceOctave({lane,title}){
 const state=P.useSyncExternalStore(__XenOctaves.subscribe,__XenOctaves.snapshot,__XenOctaves.snapshot),v=state[lane];
 return u.jsxs('span',{className:'xen-source-octave',children:[u.jsx('span',{children:'Oct'}),u.jsx('button',{type:'button',title:title+' eine Oktave tiefer','aria-label':title+' octave down',disabled:v<=-3,onClick:()=>__XenOctaves.set(lane,v-1),children:'−'}),u.jsx('output',{'aria-label':title+' octave',children:v>0?'+'+v:String(v)}),u.jsx('button',{type:'button',title:title+' eine Oktave höher','aria-label':title+' octave up',disabled:v>=3,onClick:()=>__XenOctaves.set(lane,v+1),children:'+'})]});
}
const __XenQuick=(()=>{
 const adapters=new Map(),listeners=new Set(),icons={grid:'🪜',material:'📀',rootFollow:'🎼',drum:'🥁',bass:'🎸'};let active=null,items=[],pulse=0,closeActive=null;
 try{const saved=JSON.parse(localStorage.getItem('xensonar.quick-menu.v1')||'[]');if(Array.isArray(saved))items=saved.filter(e=>e&&icons[e.kind]&&typeof e.id==='string'&&typeof e.name==='string').slice(0,240);}catch{}
 let snapshot={items,active,pulse};const emit=()=>{snapshot={items,active,pulse};for(const fn of listeners)fn()};
 function save(){try{localStorage.setItem('xensonar.quick-menu.v1',JSON.stringify(items))}catch{}emit()}
 return {icons,adapters,snapshot:()=>snapshot,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),register(kind,adapter){adapters.set(kind,adapter);return()=>{if(adapters.get(kind)===adapter)adapters.delete(kind)}},signal(){pulse++;emit()},setActive(value,close){if(value)closeActive=close??closeActive;else closeActive=null;if(active?.kind===value?.kind&&active?.id===value?.id&&active?.name===value?.name)return;active=value;emit()},add(entry){if(!entry||!icons[entry.kind]||typeof entry.id!=='string')return;if(!items.some(e=>e.kind===entry.kind&&e.id===entry.id)){items=[...items,{kind:entry.kind,id:entry.id,name:String(entry.name||entry.id)}];save()}},remove(entry){items=items.filter(e=>e.kind!==entry.kind||e.id!==entry.id);save()},dismiss(){if(!active)return false;closeActive?.();return true},activate(entry){const adapter=adapters.get(entry.kind);if(!adapter)return false;const current=adapter.entries.find(e=>e.id===entry.id);if(!current)return false;adapter.choose(current.id);return true;},cycle(dir){
   if(!active)return false;
   const order=['grid','material','rootFollow','drum','bass'],events={grid:'xensonar:open-grid-tuning-rack',material:'xensonar:open-material-loop-manager',rootFollow:'xensonar:open-root-follow-loop-manager',drum:'xensonar:open-drum-pattern-manager',bass:'xensonar:open-bass-pattern-manager'};
   const next=order[(order.indexOf(active.kind)+dir+order.length)%order.length],close=closeActive;
   close?.();active=null;closeActive=null;emit();
   window.setTimeout(()=>window.dispatchEvent(new CustomEvent(events[next])),0);return true;
  }};
})();
function __useQuickAdapter(kind,entries,selected,choose){
 const ref=P.useRef();ref.current={entries,selected,choose};
 P.useEffect(()=>__XenQuick.register(kind,{get entries(){return ref.current.entries},get selected(){return ref.current.selected},choose:id=>ref.current.choose(id)}),[kind]);
}
function __useQuickActive(kind,id,name,open=true,onClose){
 const close=P.useRef(onClose);close.current=onClose;
 P.useEffect(()=>{if(!open)return;__XenQuick.setActive({kind,id:String(id??''),name:String(name??'')},()=>close.current?.());return()=>{if(__XenQuick.snapshot().active?.kind===kind)__XenQuick.setActive(null)}},[kind,id,name,open]);
 P.useEffect(()=>{if(!open)return;const frame=requestAnimationFrame(()=>{document.querySelector('[data-xen-header-menu="'+kind+'"]')?.focus({preventScroll:true})});return()=>cancelAnimationFrame(frame)},[kind,open]);
}
function __QuickBadge({kind,id}){const s=P.useSyncExternalStore(__XenQuick.subscribe,__XenQuick.snapshot,__XenQuick.snapshot);return s.items.some(e=>e.kind===kind&&e.id===String(id))?u.jsx('span',{className:'xen-quick-badge',title:'Im Schnellmenü hinterlegt',children:__XenQuick.icons[kind]}):null;}
// Bind to the existing library's operations, not a second ordering model.
const __XenQuickDragBindings=new WeakMap();
function __quickProps(kind,id,name,sort){return {draggable:false,ref:node=>{if(node)__XenQuickDragBindings.set(node,sort)},'data-xen-quick-kind':kind,'data-xen-quick-id':String(id),'data-xen-quick-name':String(name),title:String(name)+' · ins Schnellmenü ziehen'};}
/* N13: Material Track and Root Follow Loop share these nine direct slot hotkeys.
   Hotkeys apply to playlist positions, not permanent track IDs. */
const __XenLoopHotkeys=Object.freeze(['A','S','D','F','G','H','J','K','L']);
function __XenLoopKey(index){return Number.isInteger(index)&&index>=0&&index<__XenLoopHotkeys.length?' ('+__XenLoopHotkeys[index]+')':'';}
/* N19: preserve N14/N17 design; pointer gestures and hover share the visible left landing surface. */
const __XenQuickHelpText='Ziehe den Eintrag ins Schnellmenü für leichteren Zugang.';
function __QuickDock(){
 const s=P.useSyncExternalStore(__XenQuick.subscribe,__XenQuick.snapshot,__XenQuick.snapshot),[remove,setRemove]=P.useState(null),[message,setMessage]=P.useState('');
 // The left target never migrates. The five visible columns may use right-hand space.
 // Measure the REAL Keyboard Pan edge, rather than guessing a viewport percentage.
 const [layout,setLayout]=P.useState({leftHeight:52,migrated:false,rightWidth:210,rightInset:12,rightHeight:120});
 const occupied=Math.max(0,...['grid','material','rootFollow','drum','bass'].map(kind=>s.items.filter(entry=>entry.kind===kind).length));
 const needed=occupied?16+occupied*34+(occupied-1)*5+(remove?70:0)+(message?30:0):52;
 P.useLayoutEffect(()=>{
  let frame=0;
  const measure=()=>{
   const pan=document.querySelector('.xen-performance [aria-label="Keyboard"] .xen-performance-pan');
   const panel=document.querySelector('.xen-performance');
   const bottom=pan?.getBoundingClientRect().bottom??panel?.getBoundingClientRect().bottom??156;
   const leftAvailable=Math.max(0,Math.floor(window.innerHeight-72-Math.max(156,bottom+8)));
   const marker=document.querySelector('[aria-label="Place a marker in the recording"]');
   const side=marker?.getBoundingClientRect();
   // The marker keeps at least the same vertical free space as exists below Keyboard Pan.
   const rightCapacity=Math.max(0,window.innerHeight-24-156-leftAvailable-10);
   const usableRight=!!side&&side.width>=170&&window.innerWidth>=1600;
   const migrated=occupied>0&&needed>leftAvailable&&usableRight&&rightCapacity>=52;
   const next={leftHeight:Math.min(52,leftAvailable),migrated,
    rightWidth:Math.max(0,Math.floor(side?.width??210)),
    rightInset:Math.max(0,Math.ceil(window.innerWidth-(side?.right??window.innerWidth-12))),
    rightHeight:migrated?Math.min(needed,rightCapacity):52};
   document.documentElement.style.setProperty('--xen-quick-marker-top',migrated?(156+next.rightHeight+10)+'px':'156px');
   setLayout(old=>Object.keys(next).every(k=>old[k]===next[k])?old:next);
  };
  const queue=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure)};
  queue();window.addEventListener('resize',queue);
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(queue):null;
  const pan=document.querySelector('.xen-performance [aria-label="Keyboard"] .xen-performance-pan');
  const panel=document.querySelector('.xen-performance');
  if(pan)observer?.observe(pan);
  if(panel)observer?.observe(panel);
  return()=>{cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',queue);document.documentElement.style.removeProperty('--xen-quick-marker-top')};
 },[occupied,needed]);
 const dock=u.jsxs('section',{className:'xen-quick-dock'+(s.active?' is-ready':'')+(layout.migrated?' is-migrated':''),'aria-label':'Schnellmenü','data-xen-quick-hint':__XenQuickHelpText,style:{height:layout.leftHeight,maxHeight:layout.leftHeight},onPointerDown:e=>e.stopPropagation(),onMouseDown:e=>e.stopPropagation(),onClick:e=>e.stopPropagation(),children:[layout.migrated&&s.pulse>0&&u.jsx('span',{key:'drop-'+s.pulse,className:'xen-quick-signal','aria-hidden':true}),u.jsxs('div',{className:'xen-quick-collection'+(layout.migrated?' is-migrated':''),style:layout.migrated?{right:layout.rightInset,width:layout.rightWidth,maxHeight:layout.rightHeight}: {maxHeight:Math.max(0,window.innerHeight-72-(document.querySelector('.xen-performance [aria-label="Keyboard"] .xen-performance-pan')?.getBoundingClientRect().bottom??156)-8)},children:[s.pulse>0&&u.jsx('span',{key:'menu-'+s.pulse,className:'xen-quick-signal','aria-hidden':true}),u.jsx('div',{className:'xen-quick-grid',children:['grid','material','rootFollow','drum','bass'].map(kind=>u.jsx('div',{className:'xen-quick-column','data-xen-quick-column':kind,children:s.items.filter(entry=>entry.kind===kind).map((entry,index)=>u.jsx('button',{type:'button',className:'xen-quick-tile',title:entry.name,'aria-label':entry.name,onClick:()=>{setMessage(__XenQuick.activate(entry)?'':entry.name+' ist nicht mehr verfügbar.')},onContextMenu:e=>{e.preventDefault();setRemove(entry)},children:[u.jsx('span',{className:entry.kind==='rootFollow'?'xen-quick-rfl':'',children:__XenQuick.icons[entry.kind]}),' '+(index+1)]},entry.kind+':'+entry.id))},kind))}),remove&&u.jsxs('div',{className:'xen-quick-confirm',children:[u.jsx('span',{children:'„'+remove.name+'“ entfernen?'}),u.jsx('button',{type:'button',onClick:()=>{__XenQuick.remove(remove);setRemove(null)},children:'Entfernen'}),u.jsx('button',{type:'button',onClick:()=>setRemove(null),children:'Abbrechen'})]}),message&&u.jsx('small',{role:'status',children:message})]})]});
 // A tooltip portal may rise above a modal, but it cannot intercept pointer input.
 return typeof document==='undefined'?dock:u.jsxs(P.Fragment,{children:[dock,
  ao.createPortal(u.jsx('span',{className:'xen-quick-hover-info',role:'tooltip',children:__XenQuickHelpText}),document.body)
 ]});
}
if(typeof document!=='undefined'){
 window.addEventListener('click',e=>{if(e.target?.closest('[data-xen-quick-kind]'))__XenQuick.signal()},true);
 // The fixed target and the visible LEFT palette are one landing surface.
 // A migrated palette on the right stays separate. No dialog/preview geometry.
 const landingRect=()=>{
  const dock=document.querySelector('.xen-quick-dock');if(!dock)return null;
  const r=dock.getBoundingClientRect(),collection=dock.querySelector('.xen-quick-collection:not(.is-migrated)');
  const c=collection?.getBoundingClientRect();
  return c?{left:Math.min(r.left,c.left),right:Math.max(r.right,c.right),
   top:Math.min(r.top,c.top),bottom:Math.max(r.bottom,c.bottom),
   width:Math.max(r.right,c.right)-Math.min(r.left,c.left),
   height:Math.max(r.bottom,c.bottom)-Math.min(r.top,c.top)}:r;
 };
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
    ghost?.remove();ghost=null;
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
   const inside=inDock(e),zone=inside?null:zoneAt(e),sort=hooks();
   placeQuickHelp(e);
   if(zone){
    if(!session.sorting){session.sorting=true;sort.start?.(libraryEvent(e))}
    sort.over?.(libraryEvent(e));
   }else leaveSort();
   document.querySelector('.xen-quick-dock')?.classList.toggle('xen-quick-pointer-over',inside);
   ghost.classList.toggle('is-over',inside);
   ghost.classList.toggle('is-sorting',!!zone);
   const detail=zone?sort.preview?.():'';
   ghost.textContent=(__XenQuick.icons[session.entry.kind]||'')+' '+session.entry.name+
    (detail?' · '+detail:inside?' · +':'');
   ghost.style.left=Math.max(4,Math.min(e.clientX+14,window.innerWidth-ghost.offsetWidth-4))+'px';
   ghost.style.top=Math.max(4,Math.min(e.clientY-18,window.innerHeight-ghost.offsetHeight-4))+'px';
  }
  function tick(){
   if(!session?.dragging)return;
   if(!session.source.isConnected||!session.modal.isConnected){clear();return}
   const zone=zoneAt(session.last);
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
    __XenQuick.signal();frame=requestAnimationFrame(tick);
   }
   e.preventDefault();e.stopImmediatePropagation();update(e);
  },{capture:true,passive:false});
  window.addEventListener('pointerup',e=>{
   if(!session||e.pointerId!==session.pointerId)return;
   if(!session.dragging){session=null;return}
   e.preventDefault();e.stopImmediatePropagation();
   try{
    update(e);
    if(inDock(e))__XenQuick.add(session.entry);
    else if(zoneAt(e)&&session.sorting)hooks()?.drop?.(libraryEvent(e));
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
 const placeQuickHelp=e=>{
  const hint=document.querySelector('.xen-quick-hover-info');if(!hint)return;
  if(e.pointerType==='touch'||!inDock(e)){hint.style.display='none';return}
  hint.style.display='block';
  const w=hint.offsetWidth,h=hint.offsetHeight;
  hint.style.left=Math.max(8,Math.min(e.clientX+14,window.innerWidth-w-8))+'px';
  hint.style.top=Math.max(8,Math.min(e.clientY-h-12,window.innerHeight-h-8))+'px';
 };
 window.addEventListener('pointermove',placeQuickHelp,true);
 window.addEventListener('blur',()=>{const hint=document.querySelector('.xen-quick-hover-info');if(hint)hint.style.display='none'});
 window.addEventListener('keydown',e=>{if(!__XenQuick.snapshot().active)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();__XenQuick.dismiss();return}if(e.code==='CapsLock'||e.code==='ShiftLeft'){e.stopImmediatePropagation();return}if(!['ArrowLeft','ArrowRight'].includes(e.key)||e.altKey||e.ctrlKey||e.metaKey||e.target?.closest('input,select,textarea,[contenteditable="true"],[role="slider"]'))return;e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)__XenQuick.cycle(e.key==='ArrowRight'?1:-1)},true);
}

