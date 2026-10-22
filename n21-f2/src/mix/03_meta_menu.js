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
const __XenMainRoomSessionBridge=(()=>{
 let owner=null;
 const clone=data=>JSON.parse(JSON.stringify(data));
 const safe=value=>{
  if(value==null)return null;
  if(!value||value.version!==1||!value.nParamsUI||typeof value.nParamsUI!=='object'||Array.isArray(value.nParamsUI))throw Error('Invalid Main Room settings snapshot.');
  const encoded=JSON.stringify(value);
  if(encoded.length>512000)throw Error('Main Room settings exceed the 512 KB session limit.');
  return clone(value);
 };
 return {safe,applyGridProfile(entry){if(!owner||typeof owner.updateNParams!=='function'||entry?.kind!=='grid')return false;const p=__xenGridProfile(entry.gridProfile);owner.updateNParams({gridTuning:entry.id,gridMode:__xenGridCompatibleMode(entry.id,p.modeId),manualGridMutedSteps:p.mainMutedDegrees,manualGridStepOffsets:p.mainStepOffsets.length?p.mainStepOffsets:Array.from({length:Kp(entry.id).length},()=>0)});__XenBassGrid.setLiveOverride({instanceId:entry.instanceId||'legacy:'+entry.id,tuningId:entry.id,profile:p});return true;},attach(props){if(!props)return()=>{};owner=props;return()=>{if(owner===props)owner=null}},available:()=>!!owner,
  capture(){if(!owner)throw Error('Main Room controls are not currently available.');
   const p=owner;
   return safe({version:1,nParamsUI:clone(p.nParamsUI??{}),
    wave:{preset:p.waveSoundPreset??null,enabled:!!p.waveSoundEnabled,volume:Number(p.waveSoundVolume??0)},
    pan:typeof __XenPan!=='undefined'?clone(__XenPan.snapshot()):null,
    octaves:typeof __XenOctaves!=='undefined'?clone(__XenOctaves.snapshot()):null,
    bassGridSource:typeof __XenBassGrid!=='undefined'?__XenBassGrid.snapshot().source:null});
  },
  apply(value){const cfg=safe(value);if(!cfg)return true;
   if(!owner||typeof owner.updateNParams!=='function')throw Error('Main Room controls cannot be restored right now.');
   const p=owner;
   // The real Main Room state setter owns grid, drum, drone, RFL and source IDs.
   p.updateNParams(clone(cfg.nParamsUI));
   if(cfg.wave){
    if(cfg.wave.preset&&typeof p.onWaveSoundPresetChange==='function')p.onWaveSoundPresetChange(cfg.wave.preset);
    if(typeof p.setWaveSoundEnabled==='function')p.setWaveSoundEnabled(!!cfg.wave.enabled);
    if(Number.isFinite(cfg.wave.volume)&&typeof p.setWaveSoundVolume==='function')p.setWaveSoundVolume(cfg.wave.volume);
   }
   if(cfg.pan&&typeof __XenPan!=='undefined')for(const [kind,v] of Object.entries(cfg.pan))if(Number.isFinite(v))__XenPan.set(kind,v);
   if(cfg.octaves&&typeof __XenOctaves!=='undefined')for(const lane of ['particle','wave','keyboard'])if(Number.isInteger(cfg.octaves[lane]))__XenOctaves.set(lane,cfg.octaves[lane]);
   if(['main','bass'].includes(cfg.bassGridSource)&&typeof __XenBassGrid!=='undefined')__XenBassGrid.setSource(cfg.bassGridSource);
   return true;
  }
 };
})();
function __createXenMetaSessionStore(storage,quick){
 const KEY='xensonar.meta-sessions.v2',listeners=new Set(),clone=x=>JSON.parse(JSON.stringify(x));
 const uid=()=> 'session-'+(globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2));
 const safeName=name=>{if(typeof name!=='string'||!name.trim()||name.length>100)throw Error('Session name must contain 1–100 characters.');return name.trim()};
 function validate(entry){if(!entry||typeof entry!=='object'||typeof entry.id!=='string'||!entry.id||entry.id.length>100)return null;const items=__xenMetaValidateItems(entry.items);return {id:entry.id,name:safeName(entry.name),items,colors:__xenMetaValidateColors(items,entry.colors),roomSettings:__XenMainRoomSessionBridge.safe(entry.roomSettings),...(entry.legacyOrigin?{legacyOrigin:clone(entry.legacyOrigin)}:{})}}
 let state={version:2,name:'Untitled Session',items:__xenMetaValidateItems(quick.getItems()),colors:{},roomSettings:null,saved:[],loadedId:null,activePalette:null,dirty:true,error:''};
 try{const raw=storage.getItem(KEY)||storage.getItem('xensonar.meta-sessions.v1');if(raw){const found=JSON.parse(raw);if(![1,2].includes(found.version)||!Array.isArray(found.saved)||!Array.isArray(found.items))throw Error('Invalid session library');const items=__xenMetaValidateItems(found.items);state={...state,name:typeof found.name==='string'&&found.name.length<=100?(found.name==='Freie Session'&&!found.loadedId?'Untitled Session':found.name):'Untitled Session',items,colors:__xenMetaValidateColors(items,found.colors),roomSettings:__XenMainRoomSessionBridge.safe(found.roomSettings),saved:found.saved.map(validate),loadedId:found.loadedId??null,activePalette:found.activePalette?{...validate({id:'active',name:'Active',items:found.activePalette.items,colors:found.activePalette.colors}),id:found.activePalette.id??null,name:found.activePalette.name??null}:null,dirty:!!found.dirty};if(state.saved.some(x=>!x)||new Set(state.saved.map(x=>x.id)).size!==state.saved.length)throw Error('Invalid saved sessions');}}catch(error){state={...state,error:'Session data could not be loaded: '+error.message}}
 const undoStack=[],redoStack=[];
 const capture=source=>({name:source.name,items:clone(source.items),colors:clone(source.colors),roomSettings:clone(source.roomSettings),loadedId:source.loadedId,dirty:source.dirty});
 let snapshot={...state,canUndo:false,canRedo:false};
 const emit=()=>{snapshot={...state,canUndo:undoStack.length>0,canRedo:redoStack.length>0};for(const listener of listeners)listener()};
 function update(mutator,opts={}){try{const next=clone(state);mutator(next);next.items=__xenMetaValidateItems(next.items);next.colors=__xenMetaValidateColors(next.items,next.colors);const payload=JSON.stringify({version:2,name:next.name,items:next.items,colors:next.colors,roomSettings:next.roomSettings,saved:next.saved,loadedId:next.loadedId,activePalette:next.activePalette,dirty:next.dirty});if(payload.length>2*1024*1024)throw Error('Session library exceeds the storage limit.');storage.setItem(KEY,payload);
  if(opts.record){const before=capture(state),after=capture(next);if(JSON.stringify(before)!==JSON.stringify(after)){undoStack.push(before);if(undoStack.length>80)undoStack.shift();redoStack.length=0}}
  if(opts.reset){undoStack.length=0;redoStack.length=0}
  state={...next,error:''};emit();return true}catch(error){state={...state,error:'Meta-Menu: '+error.message};emit();return false}}
 const mark=n=>{n.dirty=true};
 function travel(from,to){if(!from.length)return false;const next=from[from.length-1],current=capture(state);
  if(!update(n=>{Object.assign(n,clone(next))}))return false;
  from.pop();to.push(current);emit();return true;
 }
 return {
  captureRoomSettings:()=>{try{const captured=__XenMainRoomSessionBridge.capture();return update(n=>{n.roomSettings=captured;mark(n)},{record:true})}catch(error){state={...state,error:'Main Room settings: '+error.message};emit();return false}},
  clearRoomSettings:()=>update(n=>{n.roomSettings=null;mark(n)},{record:true}),
  liveSessionLabel:()=>state.activePalette?.name||'',
  key:KEY,snapshot:()=>snapshot,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),
  undo:()=>travel(undoStack,redoStack),redo:()=>travel(redoStack,undoStack),
  setName:name=>update(n=>{if(typeof name!=='string'||name.length>100)throw Error('Session title exceeds 100 characters.');n.name=name;mark(n)},{record:true}),
  newSession:()=>update(n=>{n.name='Untitled Session';n.items=[];n.colors={};n.roomSettings=null;n.loadedId=null;n.dirty=true},{reset:true}),
  addItem:(entry,beforeId=null)=>{if(state.items.some(e=>e.kind===entry.kind&&e.id===entry.id))return false;return update(n=>{const index=beforeId===null?-1:n.items.findIndex(e=>e.kind===entry.kind&&(e.instanceId||e.id)===beforeId);n.items.splice(index<0?n.items.length:index,0,entry.kind==='grid'?{...entry,instanceId:__xenGridUid(),gridProfile:__xenGridProfile(entry.gridProfile)}:entry);mark(n)},{record:true})},
  patchGridProfile:(entry,patch)=>update(n=>{const target=n.items.find(e=>__xenGridKey(e)===__xenGridKey(entry));if(!target||target.kind!=='grid')throw Error('Grid profile not found.');target.gridProfile=__xenGridProfile({...target.gridProfile,...patch});mark(n)},{record:true}),
  createTuningVariation:(entry,periodDraft)=>{
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
  cloneGrid:(entry)=>{if(entry.kind!=='grid')return null;const fresh={...JSON.parse(JSON.stringify(entry)),instanceId:__xenGridUid(),gridProfile:__xenGridProfile(entry.gridProfile),name:entry.name+' · Variation'};
   return update(n=>{const index=n.items.findIndex(e=>__xenGridKey(e)===__xenGridKey(entry));if(index<0)throw Error('Original grid missing.');n.items.splice(index+1,0,fresh);
    if(n.colors[__xenMetaColorKey(entry)])n.colors[__xenMetaColorKey(fresh)]=clone(n.colors[__xenMetaColorKey(entry)]);mark(n)},{record:true})?fresh:null;},
  removeItem:entry=>{if(!state.items.some(e=>__xenGridKey(e)===__xenGridKey(entry)))return false;return update(n=>{n.items=n.items.filter(e=>__xenGridKey(e)!==__xenGridKey(entry));delete n.colors[__xenMetaColorKey(entry)];mark(n)},{record:true})},
  moveItem:(entry,beforeId=null)=>{if(!state.items.some(e=>__xenGridKey(e)===__xenGridKey(entry)))return false;return update(n=>{const group=n.items.filter(e=>e.kind===entry.kind),at=group.findIndex(e=>__xenGridKey(e)===__xenGridKey(entry));const [moving]=group.splice(at,1);let insertion=beforeId===null?group.length:group.findIndex(e=>(e.instanceId||e.id)===beforeId);if(insertion<0)insertion=group.length;group.splice(insertion,0,moving);n.items=[...n.items.filter(e=>e.kind!==entry.kind),...group];mark(n)},{record:true})},
  save:name=>update(n=>{n.name=safeName(name??n.name);const id=n.loadedId??uid();const previous=n.saved.find(e=>e.id===id);const row={id,name:n.name,items:clone(n.items),colors:clone(n.colors),roomSettings:clone(n.roomSettings),...(previous?.legacyOrigin?{legacyOrigin:clone(previous.legacyOrigin)}:{})},index=n.saved.findIndex(e=>e.id===id);if(index>=0)n.saved[index]=row;else n.saved.push(row);n.loadedId=id;n.dirty=false}),
  load:id=>update(n=>{const row=n.saved.find(x=>x.id===id);if(!row)throw Error('Unknown session.');n.name=row.name;n.items=clone(row.items);n.colors=clone(row.colors??{});n.roomSettings=clone(row.roomSettings);n.loadedId=row.id;n.dirty=false},{reset:true}),
  /* The quick-dock disk writes the LIVE quick-access palette, not an editor draft.
     Saving never activates music, switches the editor selection or mutates a library. */
  saveFromQuickAsNew:(name,includeMainRoomSettings=false)=>update(n=>{
    const label=safeName(name);
    if(n.saved.some(e=>e.name.toLocaleLowerCase()===label.toLocaleLowerCase()))throw Error('Session name already exists. Choose Update Session or another name.');
    const items=__xenMetaValidateItems(quick.getItems());
    const liveColors=__xenMetaValidateColors(items,n.activePalette?.colors);
    const roomSettings=includeMainRoomSettings===true?__XenMainRoomSessionBridge.capture():null;
    const id=uid();n.saved.push({id,name:label,items:clone(items),colors:clone(liveColors),roomSettings});n.activePalette={id,name:label,items:clone(items),colors:clone(liveColors)};
  }),
  updateSavedFromQuick:(id,name,includeMainRoomSettings=false)=>update(n=>{
    const row=n.saved.find(e=>e.id===id);if(!row)throw Error('Choose an existing session to update.');
    const label=safeName(name??row.name);
    if(n.saved.some(e=>e.id!==id&&e.name.toLocaleLowerCase()===label.toLocaleLowerCase()))throw Error('Another session already has this name.');
    const items=__xenMetaValidateItems(quick.getItems());
    const colors={...__xenMetaValidateColors(items,n.activePalette?.colors),...__xenMetaValidateColors(items,row.colors)};
    // Unchecked means keep any previously saved room settings, not erase them.
    const roomSettings=includeMainRoomSettings===true?__XenMainRoomSessionBridge.capture():row.roomSettings;
    row.name=label;row.items=clone(items);row.colors=clone(colors);row.roomSettings=roomSettings;if(n.activePalette?.id===id)n.activePalette={id,name:label,items:clone(items),colors:clone(colors)};
    // If the editor has this session loaded, its unsaved working draft remains intact.
    if(n.loadedId===id)n.dirty=true;
  }),

  importLegacyPart:record=>update(n=>{
    if(!record?.origin||typeof record.name!=='string')throw Error('Choose a P7.24 song part.');
    const origin=clone(record.origin),key=JSON.stringify(origin);
    if(n.saved.some(row=>JSON.stringify(row.legacyOrigin)===key))throw Error('This saved/draft part was already imported.');
    const items=__xenMetaValidateItems(record.items),id=uid();
    const row={id,name:safeName(record.name.slice(0,100)),items:clone(items),colors:{},roomSettings:null,legacyOrigin:origin};
    n.saved.push(row);n.name=row.name;n.items=clone(items);n.colors={};n.roomSettings=null;n.loadedId=id;n.dirty=false;
  },{reset:true}),

  deleteSaved:id=>update(n=>{n.saved=n.saved.filter(x=>x.id!==id);if(n.loadedId===id){n.loadedId=null;n.dirty=true}}),
  use:()=>{
   let previousQuick=null,previousRoom=null,selection=null,override=null,changedQuick=false,attemptedRoom=false;
   try{
    if(state.roomSettings&&!__XenMainRoomSessionBridge.available())throw Error('Main Room settings are unavailable.');
    previousQuick=quick.getItems();selection=quick.snapshot?.().selectedByKind?.grid;
    if(typeof __XenBassGrid!=='undefined')override=__XenBassGrid.liveOverride?.()??null;
    if(state.roomSettings)previousRoom=__XenMainRoomSessionBridge.capture();
    quick.replaceItems(state.items);changedQuick=true;quick.clearGridSelection?.();
    if(state.roomSettings){attemptedRoom=true;__XenMainRoomSessionBridge.apply(state.roomSettings)}
    const committed=update(n=>{n.activePalette={id:n.loadedId??null,name:n.loadedId?n.name:null,items:clone(n.items),colors:clone(n.colors)}});
    if(!committed)throw Error(state.error||'Session could not be persisted.');
    return true;
   }catch(error){
    const failures=[];
    if(attemptedRoom&&previousRoom)try{__XenMainRoomSessionBridge.apply(previousRoom)}catch(failure){failures.push(failure.message)}
    if(changedQuick)try{quick.replaceItems(previousQuick);quick.restoreGridSelection?.(selection,override)}catch(failure){failures.push(failure.message)}
    state={...state,error:'Could not prepare Quick Access: '+error.message+(failures.length?' · Restore failed: '+failures.join('; '):'')};emit();return false;
   }
  },
  itemColor:e=>state.colors[__xenMetaColorKey(e)]??{},
  liveItemColor:e=>state.activePalette?.items.some(x=>__xenGridKey(x)===__xenGridKey(e))?state.activePalette.colors[__xenMetaColorKey(e)]??{}:{},
  setItemColor:(entry,property,value)=>update(n=>{if(property!=='border'&&property!=='background')throw Error('Unknown color property.');const hex=__xenMetaHex(value);if(!hex)throw Error('Color must be a #RRGGBB value.');if(!n.items.some(e=>__xenGridKey(e)===__xenGridKey(entry)))throw Error('Entry is not in this session.');const key=__xenMetaColorKey(entry);n.colors[key]={...(n.colors[key]??{}),[property]:hex};mark(n)},{record:true}),
  resetItemColor:entry=>update(n=>{delete n.colors[__xenMetaColorKey(entry)];mark(n)},{record:true}),
  /* Open the actual live Quick Access as an editable session draft. A named live
     session may retain its saved identity, but the stored row is untouched until Save.
     Avoid accidentally overwriting an unrelated session selected in the editor. */
  editCurrentLive:()=>update(n=>{
    const items=__xenMetaValidateItems(quick.getItems());
    const active=n.activePalette;
    const source=active?.id?n.saved.find(row=>row.id===active.id):null;
    n.items=items;
    n.colors=__xenMetaValidateColors(items,active?.colors);
    n.loadedId=source?.id??null;
    n.name=source?.name??'Untitled Session';
    n.roomSettings=source?clone(source.roomSettings):null;
    n.dirty=true;
  },{reset:true}),
  fromQuick:()=>update(n=>{n.items=__xenMetaValidateItems(quick.getItems());n.colors=__xenMetaValidateColors(n.items,n.colors);mark(n)},{record:true}),
  diagnostics:()=>state.items.filter(e=>{const a=quick.adapters.get(e.kind);return a&&a.entries&&!a.entries.some(x=>String(x.id)===e.id)}),
  reportError:message=>{state={...state,error:String(message)};emit()}
 };
}
const __XenMetaSessions=__createXenMetaSessionStore(localStorage,__XenQuick);

/* Read existing live adapter when registered. Other store readers are fallbacks for
   when a source editor is not mounted. Never instantiate a second material library. */
function __xenMetaLibraryEntries(kind){
 const registered=__XenQuick.adapters.get(kind);
 if(registered?.entries?.length)return registered.entries.map(e=>({kind,id:String(e.id),name:String(e.name??e.label??e.id),bars:__xenTimedBarsFromRecord(e)}));
 let items=[];
 try{
  if(kind==='grid'&&typeof sj==='function')items=sj().map(e=>({id:e.value??e.id,name:e.label??e.name??e.id}));
  if(kind==='bass'&&typeof ZG==='function')items=ZG().map(e=>({id:'clip:'+e.id,name:e.name??e.id}));
  if(kind==='drum'&&typeof nM==='function'&&typeof Yl==='function')items=nM({drumPatterns:[],exportedDrumConfigs:[],state:Yl()}).map(e=>({id:e.id,name:e.name}));
 }catch(error){console.warn('[meta-menu] library fallback unavailable:',kind,error)}
 return items.filter(e=>e?.id!=null).map(e=>({kind,id:String(e.id),name:String(e.name??e.id),bars:__xenTimedBarsFromRecord(e)}));
}

function __xenMetaDropTarget(event,session){
 const element=document.elementFromPoint(event.clientX,event.clientY),board=element?.closest('.xen-meta-board');
 const panel=board?.closest('[data-xen-header-menu="meta"]');if(!board||!panel)return null;
 const kind=session.entry.kind,lane=board.querySelector('[data-xen-meta-column="'+kind+'"]');if(!lane)return null;
 const rows=[...lane.querySelectorAll('[data-xen-meta-item]')].filter(row=>!(session.source===row));
 // Preserve vertical intent even when the pointer crosses a different category column.
 // Reordering uses beforeId AFTER removing the dragged original.
 const next=rows.find(row=>event.clientY<row.getBoundingClientRect().top+row.getBoundingClientRect().height/2);
 return{column:lane,beforeId:next?.dataset.xenQuickId??null,kind};
}
function __xenMetaRenderDropMarker(target){
 let marker=document.querySelector('.xen-meta-insertion-line');
 if(!target){marker?.remove();return}
 const list=target.column.querySelector('.xen-meta-lane-items');if(!list){marker?.remove();return}
 if(!marker){marker=document.createElement('span');marker.className='xen-meta-insertion-line';marker.setAttribute('aria-hidden','true')}
 if(marker.parentElement!==list)list.append(marker);
 const listRect=list.getBoundingClientRect();
 const rows=[...list.querySelectorAll('[data-xen-meta-item]')];
 const following=rows.find(row=>row.dataset.xenQuickId===target.beforeId);
 const last=rows.at(-1);
 const y=following?following.getBoundingClientRect().top-listRect.top:
   last?last.getBoundingClientRect().bottom-listRect.top+2:12;
 marker.style.top=Math.max(1,Math.min(list.clientHeight-2,y))+'px';
}
function __xenMetaCommitDrop(session){
 if(session.source.hasAttribute('data-xen-meta-item')){const entry=__XenMetaSessions.snapshot().items.find(e=>e.kind===session.entry.kind&&(e.instanceId||e.id)===session.source.dataset.xenQuickId);return entry?__XenMetaSessions.moveItem(entry,session.metaTarget.beforeId):false;}
 return __XenMetaSessions.addItem(session.entry,session.metaTarget.beforeId);
}
/* P7.32: reuse the five native managers, never clone their libraries.
   Clicking the already-mounted performance-strip triggers their real owner callbacks. */
const __XenMetaOriginalTitles=Object.freeze({
 grid:'Click: Open Grid Workbench', material:'Click: open Material Track manager',
 rootFollow:'Click: open Root Follow Loop manager',
 drum:'Click: open Drum Pattern manager', bass:'Click: open Bass Pattern manager'
});
function __xenOpenOriginalLibrary(kind){
 const prefix=__XenMetaOriginalTitles[kind];if(!prefix)return false;
 const button=[...document.querySelectorAll('[data-xensonar-performance-strip] button[title]')]
   .find(item=>item.title.startsWith(prefix));
 if(!button)return false;
 button.click();return true;
}
function __XenMetaRack(){
 const s=P.useSyncExternalStore(__XenMetaSessions.subscribe,__XenMetaSessions.snapshot,__XenMetaSessions.snapshot),[open,setOpen]=P.useState(false);
 P.useEffect(()=>{const openMeta=()=>setOpen(true);window.addEventListener('xensonar:open-meta-menu',openMeta);return()=>window.removeEventListener('xensonar:open-meta-menu',openMeta)},[]);
 return u.jsxs(P.Fragment,{children:[u.jsx('button',{type:'button',className:'xen-meta-rack',title:'Meta-Menu · Session collections','aria-label':'Meta-Menu','aria-expanded':open,onClick:()=>setOpen(x=>!x),children:'🎧 Meta-Menu ▾'}),u.jsx(__XenLegacySongImport,{}),open&&ao.createPortal(u.jsx(__XenMetaEditor,{onClose:()=>setOpen(false)}),document.body)]});
}
/* Reuse the existing Material PCM owner and the real Grid keyboard callback.
   Other original-library players can attach without a replacement synthesizer. */
/* Audition each saved tuning step in order, from the current keyboard root
   to one complete period (octave, tritave or other configured period).
   Fx(base, ...) is NOT a scale generator: it clamps the keyboard's three-
   octave playing region BELOW base. Sampling it above base collapses the
   preview to root + period. Kp is the existing saved-tuning step owner. */
function __xenMetaGridPreviewPitches(base,gridId,profile=null){
 if(!Number.isFinite(base)||base<=0||typeof Kp!=='function'||typeof AF!=='function')return [];
 const period=AF(gridId);
 if(!Number.isFinite(period)||period<=1)return [];
 const cents=Kp(gridId);
 if(!Array.isArray(cents)||!cents.length)return [];
 const periodCents=1200*Math.log2(period);
 const mask=profile?Au(__xenGridCompatibleMode(gridId,profile.modeId),gridId):null;const muted=new Set(profile?.mainMutedDegrees||[]);
 const steps=cents.filter((c,i)=>Number.isFinite(c)&&c>=0&&c<periodCents-1e-5&&(!mask||mask[i]!==false)&&!muted.has(i))
   .sort((a,b)=>a-b);
 const pitches=[];
 for(const cents of steps){
  const hz=base*Math.pow(2,cents/1200);
  if(!pitches.length||hz>pitches[pitches.length-1]*(1+1e-7))pitches.push(hz);
 }
 if(pitches.length)pitches.push(base*period);
 return pitches;
}
const __XenMetaAudition=(()=>{
 const providers=new Map(),listeners=new Set();
 let external=null,generation=0,status=Object.freeze({phase:'idle',key:null,error:null});
 const materialOwner=()=>typeof __XenMaterialStandalonePreview!=='undefined'?__XenMaterialStandalonePreview:null;
 const emit=()=>{for(const listener of listeners)listener()};
 const key=e=>__xenGridKey(e);
 const phase=(value,selected=null,error=null)=>{status=Object.freeze({phase:value,key:selected,error});emit()};
 function stopExternal(){generation++;const former=external;external=null;if(former){former.controller.abort();try{former.stop?.()}catch(error){console.warn('[xensonar][meta-audition][stop]',error)}}phase('idle');}
 function stop(){stopExternal();materialOwner()?.stop();}
 function snapshot(){const id=materialOwner()?.activeId();return external?.key??(id!==null&&id!==undefined?'material\0'+id:null)}
 async function toggle(e){
  const selected=key(e);
  if(snapshot()===selected){stop();return 'stopped'}
  stop();
  if(e.kind==='material')return materialOwner()?.toggleById(e.id)??'unavailable';
  const owner=providers.get(e.kind);
  if(!owner||owner.available?.(e)===false){phase('failed',selected,'Library source is unavailable.');return 'unavailable'}
  const ticket=++generation,controller=new AbortController(),session={key:selected,controller,stop:null};
  external=session;phase('preparing',selected);
  const current=()=>external===session&&ticket===generation&&!controller.signal.aborted;
  const finished=()=>{if(!current())return;external=null;try{session.stop?.()}finally{phase('idle')}};
  const playing=()=>{if(current())phase('playing',selected)};
  const failed=error=>{if(!current())return;external=null;controller.abort();try{session.stop?.()}finally{phase('failed',selected,error?.message||String(error))}};
  try{
   const handle=owner.start(e,finished,{signal:controller.signal,isCurrent:current,playing,failed});
   const stopCallback=await handle;
   if(!current()){if(typeof stopCallback==='function')stopCallback();return 'stopped'}
   if(typeof stopCallback!=='function')throw Error('Library source could not be prepared.');
   session.stop=stopCallback;
   // Older Grid providers own asynchronous preparation internally.
   if(!owner.managesPhase)playing();
   return status.phase;
  }catch(error){
   if(!current())return 'stopped';
   external=null;controller.abort();try{session.stop?.()}finally{phase('failed',selected,error?.message||String(error))}
   throw error;
  }
 }
 return Object.freeze({
  snapshot,status:()=>status,subscribe:fn=>{listeners.add(fn);const off=materialOwner()?.subscribe(emit);return()=>{listeners.delete(fn);off?.()}},
  available:e=>e?.kind==='material'?!!materialOwner()?.canPreview(e.id):!!providers.get(e?.kind)&&(providers.get(e.kind).available?.(e)!==false),
  toggle,stop,stopExternal,register:(kind,provider)=>{providers.set(kind,provider);emit();return()=>{if(providers.get(kind)!==provider)return;if(external?.key.startsWith(kind+'\0'))stopExternal();providers.delete(kind);emit()}}
 });
})();
function __XenSessionBassDialog({entry,onClose,onConfirm}){
 const [draft,setDraft]=P.useState(()=>JSON.parse(JSON.stringify(entry.gridProfile?.bassConfig||__XenBassGrid.normalize(null))));
 const first=P.useRef(null);
 P.useEffect(()=>{first.current?.focus({preventScroll:true})},[]);
 return ao.createPortal(u.jsx('div',{className:'xen-grid-bass-modal',onPointerDown:e=>e.stopPropagation(),onMouseDown:e=>e.stopPropagation(),onClick:e=>{e.stopPropagation();if(e.target===e.currentTarget)onClose()},onKeyDown:e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();onClose()}},children:u.jsxs('section',{className:'xen-grid-bass-dialog',role:'dialog','aria-modal':true,'aria-label':'Edit Session Bass Grid',children:[
  u.jsxs('header',{children:[u.jsx('strong',{children:'Bass Grid · '+entry.name}),u.jsx('button',{type:'button',onClick:onClose,'aria-label':'Close Bass Grid editor',children:'×'})]}),
  u.jsx(__XenBassGridEditor,{tuningId:entry.id,draft,onDraftChange:setDraft,profile:entry.gridProfile,forceOpen:true}),
  u.jsxs('footer',{children:[u.jsx('button',{type:'button',onClick:onClose,children:'Cancel'}),u.jsx('button',{type:'button',ref:first,onClick:()=>onConfirm(draft),children:'Confirm'})]})
 ]})},),document.body);
}
/* Native Period Workbench visual semantics shared by Grid Workbench and Session Clone.
   Single source of truth: full horizontal line --> right-side left-facing triangle --> cents label.
   The triangle indicates a draggable pitch marker, never a playback command. */
function __XenNativePeriodMarkerRack({editor,markers,selectedIndex,onSelect,onDrag,containerRef,classification}){
 /* Keep every marker/line visible; when pitch degrees crowd each other, show only
    non-overlapping labels (selected marker wins). Each marker keeps its full tooltip. */
 const labelledIndexes=new Set(),labelPositions=[];
 const selected=markers.find(marker=>marker.index===selectedIndex);
 const priority=selected?[selected,...markers.filter(marker=>marker.index!==selectedIndex)]:markers;
 for(const marker of priority){if(labelPositions.every(y=>Math.abs(y-marker.y)>=15)){labelledIndexes.add(marker.index);labelPositions.push(marker.y)}}
 return u.jsxs('div',{className:'mt-3 flex gap-4 xen-native-period-rack',children:[
  u.jsxs('div',{className:'w-16 shrink-0 text-[10px] text-fuchsia-100/60',children:[
   u.jsx('div',{className:'mb-2 uppercase tracking-[0.25em]',children:'Y'}),
   u.jsx('div',{children:editor.periodFamily==='tritave'?'Tritave':'Octave'}),
   u.jsxs('div',{children:[editor.steps,' Schritte']}),
   u.jsx('div',{children:classification?.label||''})
  ]}),
  u.jsxs('div',{className:'flex-1 min-w-0',children:[
   u.jsxs('div',{ref:containerRef,className:'relative overflow-hidden rounded-xl border border-fuchsia-900/50 bg-[#090611] xen-native-period-plane',style:{height:N6},children:[
    u.jsx('div',{className:'absolute inset-x-8 top-[16px] border-t border-fuchsia-400/40'}),
    u.jsx('div',{className:'absolute inset-x-8 bottom-[16px] border-t border-fuchsia-400/40'}),
    u.jsx('div',{className:'absolute left-8 top-[16px] bottom-[16px] w-px bg-fuchsia-800/50'}),
    u.jsxs('div',{className:'absolute right-3 top-1 text-[10px] text-fuchsia-300/80',children:[editor.periodCents.toFixed(1),'c']}),
    u.jsx('div',{className:'absolute right-3 bottom-1 text-[10px] text-fuchsia-300/80 xen-period-zero-label',children:'0.0c'}),
    markers.map(marker=>{
     const active=marker.index===selectedIndex,movable=marker.index>0;
     return u.jsx('div',{className:'absolute inset-x-0',style:{top:marker.y-8},children:
      u.jsxs('div',{className:'relative flex items-center gap-2 px-3',children:[
       u.jsx('div',{className:`h-px flex-1 ${active?'bg-fuchsia-300/70':'bg-fuchsia-700/35'}`}),
       u.jsxs('button',{type:'button',disabled:!movable,
        'aria-label':'Tune marker '+marker.index+' · '+Hoe(marker.cents),
        title:movable?'Drag to tune marker '+marker.index:'Marker 0 remains the anchor',
        onPointerDown:event=>{if(movable){event.preventDefault();onSelect(marker.index);onDrag(marker.index)}},
        onClick:()=>onSelect(marker.index),
        className:`flex h-4 min-w-0 items-center gap-2 ${movable?'cursor-ns-resize':'cursor-default'}`,
        children:[
         u.jsx('div',{'aria-hidden':'true',className:`h-0 w-0 border-y-[6px] border-y-transparent border-l-0 border-r-[10px] ${active?'border-r-fuchsia-200':'border-r-sky-300/90'}`}),
         labelledIndexes.has(marker.index)&&u.jsxs('div',{className:'whitespace-nowrap text-[10px] text-fuchsia-100/85',children:[marker.index,' (',Hoe(marker.cents),')']})
        ]})
      ]})},marker.id)
    })
   ]}),
   u.jsx('div',{className:'mt-2 text-[10px] leading-relaxed text-fuchsia-100/75',children:'Marker 0 remains the anchor.'})
  ]})
 ]});
}
/* Reuses Woe from the native Grid Workbench: same editable period, markers, JI and validation. */
function __XenSessionPeriodDialog({entry,onClose,onConfirm}){
 const [message,setMessage]=P.useState('');
 const wb=Woe({open:true,currentTuning:entry.id,onMessage:setMessage});
 const {editor,setEditor,selectedMarkerIndex,setSelectedMarkerIndex,centInput,setCentInput,workbenchRef,workbenchMarkers,rebuildEqualDraft,updateSelectedMarker,toggleJiInterval,beginMarkerDrag}=wb;
 const [name,setName]=P.useState(()=>entry.name);
 const [jiOpen,setJiOpen]=P.useState(false);
 const [error,setError]=P.useState('');
 const dismiss=()=>{setError('');onClose()};
 const apply=()=>{const draft={...editor,name};const original=x2(entry.id);
  const changed=editor.periodFamily!==original.periodFamily||Math.abs(editor.periodCents-original.periodCents)>.05||editor.stepCents.length!==original.stepCents.length||editor.stepCents.some((c,i)=>Math.abs(c-original.stepCents[i])>.05);
  if(!changed){dismiss();return;}
  if(onConfirm(draft)){dismiss()}else setError('Tuning deviation could not be saved. Check the period and step order.');
 };
 return ao.createPortal(u.jsx('div',{className:'xen-grid-bass-modal',onPointerDown:e=>e.stopPropagation(),onClick:e=>{e.stopPropagation();if(e.target===e.currentTarget)dismiss()},onKeyDown:e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();dismiss()}},children:u.jsxs('section',{className:'xen-grid-bass-dialog xen-grid-period-dialog',role:'dialog','aria-modal':true,'aria-label':'Session Period Workbench',children:[
  u.jsxs('header',{children:[u.jsxs('div',{children:[u.jsx('strong',{children:'Period Workbench · '+entry.name}),u.jsx('small',{className:'xen-grid-period-caption',children:'Save a separate Custom Tuning for this Session tile; the original tuning stays unchanged.'})]}),u.jsx('button',{type:'button','aria-label':'Close tuning editor',onClick:dismiss,children:'×'})]}),
  u.jsxs('div',{className:'xen-grid-period-fields',children:[
   u.jsxs('label',{children:[u.jsx('span',{children:'Period'}),u.jsx('select',{value:editor.periodFamily,'aria-label':'Period family',onChange:e=>rebuildEqualDraft(e.target.value,editor.steps,e.target.value==='tritave'?dI.tritave:dI.octave),children:[u.jsx('option',{value:'octave',children:'Octave'}),u.jsx('option',{value:'tritave',children:'Tritave'})]})]}),
   u.jsxs('label',{children:[u.jsx('span',{children:'Total cents'}),u.jsx('input',{type:'number',min:400,max:4000,step:.1,value:editor.periodCents,onChange:e=>setEditor(v=>({...v,periodCents:Math.max(400,Math.min(4000,Number(e.target.value)||v.periodCents))}))})]}),
   u.jsxs('label',{children:[u.jsx('span',{children:'Pitch steps'}),u.jsx('input',{type:'number',min:2,max:__xenGridStepLimit,step:1,value:editor.steps,onChange:e=>rebuildEqualDraft(editor.periodFamily,Number(e.target.value)||12,editor.periodCents)})]}),
   u.jsx('button',{type:'button',onClick:()=>rebuildEqualDraft(editor.periodFamily,editor.steps,editor.periodCents),children:'Reset as Equal Tuning'}),
  ]}),
  u.jsx(__XenNativePeriodMarkerRack,{editor,markers:workbenchMarkers,selectedIndex:selectedMarkerIndex,onSelect:setSelectedMarkerIndex,onDrag:beginMarkerDrag,containerRef:workbenchRef,classification:wb.draftClassification}),
  u.jsxs('div',{className:'xen-grid-period-fields',children:[
   u.jsxs('label',{children:[u.jsx('span',{children:'Selected degree '+(selectedMarkerIndex+1)+' · cents'}),u.jsx('input',{type:'number',step:.1,disabled:selectedMarkerIndex===0,value:centInput,onChange:e=>setCentInput(e.target.value),onBlur:()=>updateSelectedMarker(Number(String(centInput).replace(',','.'))||0),onKeyDown:e=>{if(e.key==='Enter')updateSelectedMarker(Number(String(centInput).replace(',','.'))||0)}})]}),
   u.jsx('button',{type:'button',onClick:()=>updateSelectedMarker((editor.stepCents[selectedMarkerIndex]||0)-1),disabled:selectedMarkerIndex===0,children:'−1¢'}),
   u.jsx('button',{type:'button',onClick:()=>updateSelectedMarker((editor.stepCents[selectedMarkerIndex]||0)+1),disabled:selectedMarkerIndex===0,children:'+1¢'}),
   u.jsx('button',{type:'button',onClick:()=>setJiOpen(!jiOpen),children:'JI ▾'}),
  ]}),
  jiOpen&&u.jsx('div',{className:'xen-grid-period-ji',role:'group','aria-label':'Just Intonation interval choices',children:aT.map(x=>u.jsx('button',{type:'button',onClick:()=>toggleJiInterval(x.label,x.cents),children:x.label+' · '+x.cents.toFixed(1)+'¢'},x.label))}),
  u.jsxs('label',{className:'xen-grid-period-name',children:[u.jsx('span',{children:'Variation name'}),u.jsx('input',{type:'text',maxLength:100,value:name,onChange:e=>setName(e.target.value)})]}),
  (error||message)&&u.jsx('small',{role:error?'alert':'status',children:error||message}),
  u.jsxs('footer',{children:[u.jsx('button',{type:'button',onClick:dismiss,children:'Cancel'}),u.jsx('button',{type:'button',onClick:apply,children:'Use Tuning Variation'})]})
 ]})},),document.body);
}
function __XenMetaEditor({onClose}){
 const state=P.useSyncExternalStore(__XenMetaSessions.subscribe,__XenMetaSessions.snapshot,__XenMetaSessions.snapshot);
 const quickState=P.useSyncExternalStore(__XenQuick.subscribe,__XenQuick.snapshot,__XenQuick.snapshot);
 /* Meta is a sixth navigation destination. A native dialog temporarily owns
    keyboard navigation while Meta remains mounted beneath it. */
 P.useEffect(()=>{if(!quickState.active||quickState.active.kind==='meta')__XenQuick.setActive({kind:'meta',id:'sessions',name:'Meta-Menu'},onClose)},[quickState.active?.kind]);
 P.useEffect(()=>()=>{if(__XenQuick.snapshot().active?.kind==='meta')__XenQuick.setActive(null)},[]);
 const nativeOpen=['grid','material','rootFollow','drum','bass'].includes(quickState.active?.kind);
 const [kind,setKind]=P.useState('grid'),[search,setSearch]=P.useState(''),[notice,setNotice]=P.useState(''),[colorEdit,setColorEdit]=P.useState(null),[bassEdit,setBassEdit]=P.useState(null),[periodEdit,setPeriodEdit]=P.useState(null);
 const selectedTile=state.items.find(e=>colorEdit&&__xenGridKey(e)===__xenGridKey(colorEdit));
 const audition=typeof __XenMetaAudition!=='undefined'?__XenMetaAudition:{subscribe:()=>()=>{},snapshot:()=>null,status:()=>null,available:()=>false,toggle:()=>Promise.resolve('unavailable')};
 const previewState=P.useSyncExternalStore(audition.subscribe,audition.snapshot,audition.snapshot);
 const previewStatus=P.useSyncExternalStore(audition.subscribe,audition.status,audition.status);
 P.useEffect(()=>{const report=event=>setNotice(event.detail?.message||'Not dropped · move the item onto the Session collection.');window.addEventListener('xensonar:meta-drag-note',report);return()=>window.removeEventListener('xensonar:meta-drag-note',report)},[]);
 const ref=P.useRef(null);P.useEffect(()=>{ref.current?.focus({preventScroll:true});return()=>document.querySelector('[aria-label="Meta-Menu"]')?.focus({preventScroll:true})},[]);
 const entries=kind==='sessions'?[]:__xenMetaLibraryEntries(kind).filter(e=>e.name.toLowerCase().includes(search.toLowerCase()));
 const missing=__XenMetaSessions.diagnostics();const warn=e=>missing.some(m=>m.kind===e.kind&&m.id===e.id);
 const row=e=>u.jsxs('div',{...__quickProps(e.kind,e.id,e.name),role:'button',tabIndex:0,className:'xen-meta-library-row',title:__xenQuickEntryTitle(e)+' · ins Schnellmenü ziehen',onClick:evt=>{if(evt.target.closest('button'))return;__XenMetaSessions.addItem(e)},onKeyDown:evt=>{if(evt.target!==evt.currentTarget)return;if(evt.key==='Enter'||evt.key===' '){evt.preventDefault();__XenMetaSessions.addItem(e)}},children:[u.jsx('span',{className:'xen-meta-source-icon',children:__XenQuick.icons[e.kind]}),u.jsx('span',{className:'xen-meta-source-name',title:e.name,children:e.name}),audition.available(e)&&u.jsx('button',{type:'button',className:'xen-meta-row-preview','data-preview-phase':previewStatus.key===__xenGridKey(e)?previewStatus.phase:'idle','aria-busy':previewStatus.key===__xenGridKey(e)&&previewStatus.phase==='preparing',onPointerDown:evt=>evt.stopPropagation(),onMouseDown:evt=>evt.stopPropagation(),onKeyDown:evt=>evt.stopPropagation(),'aria-pressed':(previewState===__xenGridKey(e)),'aria-label':((previewState===__xenGridKey(e))?'Stop preview ':'Preview ')+e.name,title:(previewState===__xenGridKey(e))?(previewStatus.phase==='preparing'?'Cancel preparation':'Stop preview'):(e.kind==='rootFollow'?'Preview in Root Follow (same as the original manager)':'Preview '+__XenMetaLabels[e.kind]),disabled:!audition.available(e),onClick:evt=>{evt.stopPropagation();void audition.toggle(e).catch(error=>setNotice('Preview: '+error.message))},children:(previewState===__xenGridKey(e))?(previewStatus.phase==='preparing'?'…':'■'):'▶'}),u.jsx('button',{type:'button','aria-label':'Add to session: '+e.name,title:'Add to session',onClick:()=>__XenMetaSessions.addItem(e),children:'+'})]},e.kind+':'+e.id);
 const tile=(e,i)=>{const tint=__XenMetaSessions.itemColor(e);return u.jsxs('div',{...__quickProps(e.kind,e.id,e.name),role:'button',tabIndex:0,'data-xen-meta-item':'true','data-xen-quick-id':e.instanceId||e.id,className:'xen-meta-tile'+(warn(e)?' is-missing':'')+(colorEdit&&__xenGridKey(colorEdit)===__xenGridKey(e)?' is-color-selected':''),'aria-label':e.name+' · Click to edit colors · Right-click to remove',title:__xenQuickEntryTitle(e)+(warn(e)?' · Missing library entry':''),'data-xen-meta-index':i,style:{...(tint.border?{borderColor:tint.border}:{}),...(tint.background?{backgroundColor:tint.background}:{})},onClick:()=>setColorEdit(e),onContextMenu:event=>{event.preventDefault();__XenMetaSessions.removeItem(e);if(colorEdit&&__xenGridKey(colorEdit)===__xenGridKey(e))setColorEdit(null)},onKeyDown:event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setColorEdit(e)}if(event.key==='Delete'){event.preventDefault();__XenMetaSessions.removeItem(e)}if(['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const arr=state.items.filter(x=>x.kind===e.kind);const at=arr.findIndex(x=>__xenGridKey(x)===__xenGridKey(e));__XenMetaSessions.moveItem(e,event.key==='ArrowUp'?(arr[Math.max(at-1,0)]?.instanceId||arr[Math.max(at-1,0)]?.id||null):(arr[at+2]?.instanceId||arr[at+2]?.id||null))}},children:[u.jsx('span',{className:'xen-meta-tile-index',children:i+1}),u.jsx('span',{className:'xen-meta-tile-name',children:e.name+(e.kind==='grid'?' · '+__xenGridModeName(e.gridProfile?.modeId)+(e.gridProfile?.bassEnabled?' ◇':''):'')}),warn(e)&&u.jsx('span',{children:'⚠'}),['grid','material'].includes(e.kind)&&audition.available(e)&&u.jsx('button',{type:'button',className:'xen-meta-tile-preview','aria-label':((previewState===__xenGridKey(e))?'Stop preview ':'Preview ')+e.name,'aria-pressed':(previewState===__xenGridKey(e)),title:(previewState===__xenGridKey(e))?'Stop preview':'Preview rendered material',disabled:!audition.available(e),onPointerDown:ev=>ev.stopPropagation(),onClick:ev=>{ev.stopPropagation();void audition.toggle(e).catch(error=>setNotice('Preview: '+error.message))},children:(previewState===__xenGridKey(e))?'■':'▶'})]},__xenGridKey(e))};
 const actions=(name,fn,disabled=false)=>u.jsx('button',{type:'button',disabled,onClick:fn,children:name});
 return u.jsx('div',{className:'xen-meta-overlay'+(nativeOpen?' is-native-behind':''),'data-xen-header-menu':'meta',onClick:onClose,onKeyDown:e=>{e.stopPropagation();if(e.key==='Escape')onClose();else if(['ArrowLeft','ArrowRight'].includes(e.key)&&!e.repeat&&!e.target.closest('input,select,textarea,[contenteditable="true"],[role="tablist"]')){e.preventDefault();__XenQuick.cycle(e.key==='ArrowRight'?1:-1)}},children:u.jsxs('section',{className:'xen-meta-editor',role:'dialog','aria-modal':true,'aria-label':'Meta-Menu Session Editor',tabIndex:-1,ref,onClick:e=>e.stopPropagation(),children:[
  u.jsxs('header',{className:'xen-meta-titlebar',children:[u.jsx('strong',{children:'🎧 Meta-Menu'}),u.jsx('span',{className:'xen-meta-caption',children:'Sessions organize existing musical materials'}),actions('×',onClose)]}),
  u.jsxs('div',{className:'xen-meta-toolbar',children:[u.jsx('span',{className:'xen-meta-small-label',children:'SESSION'}),u.jsx('input',{type:'text',value:state.name,maxLength:100,'aria-label':'Session name',onChange:e=>__XenMetaSessions.setName(e.target.value)}),u.jsx('select',{'aria-label':'Saved sessions',value:state.loadedId??'',onChange:e=>{if(e.target.value)__XenMetaSessions.load(e.target.value)},children:[u.jsx('option',{value:'',children:'— Saved sessions —'}),...state.saved.map(s=>u.jsx('option',{value:s.id,children:s.name},s.id))]}),u.jsx('span',{className:'xen-meta-dirty',children:state.dirty?'● Draft':'● Saved'}),actions('New',()=>__XenMetaSessions.newSession()),actions('Save',()=>__XenMetaSessions.save()),u.jsx('button',{type:'button',className:'xen-meta-add-settings',title:'Add current main room settings to active session before saving','aria-label':'Add current main room settings to active session before saving',onClick:()=>__XenMetaSessions.captureRoomSettings(),children:'Add settings to session'}),actions(u.jsxs(P.Fragment,{children:['Engage! ',u.jsx('span',{className:'xen-meta-action-arrow','aria-hidden':'true',children:'➜'})]}),()=>{if(__XenMetaSessions.use())setNotice('Session engaged in Live Quick Access.')}),u.jsx('span',{className:'xen-meta-live',children:'Live remains unchanged until Engage! · Playback is not started.'})]}),
  u.jsxs('div',{className:'xen-meta-workspace',children:[
   u.jsxs('section',{className:'xen-meta-library',children:[u.jsxs('div',{className:'xen-meta-head',children:[u.jsx('strong',{children:'Libraries'}),u.jsx('small',{children:'SOURCE / 01–05'})]}),u.jsxs('div',{className:'xen-meta-tab-assembly','data-xen-meta-tab-mode':kind==='sessions'?'sessions':'libraries',children:[u.jsxs('button',{type:'button',className:'xen-meta-session-backtab','aria-controls':'xen-meta-sessions-panel','aria-pressed':kind==='sessions','aria-label':'🎧 Sessions manager',onClick:()=>{setKind('sessions');setSearch('');setColorEdit(null)},children:u.jsx('span',{className:'xen-meta-session-backtab-label',children:'🎧 Sessions'})}),u.jsx('div',{role:'tablist','aria-label':'Materialbibliotheken',className:'xen-meta-tabs',children:__XenSongKinds.map(k=>u.jsxs('button',{type:'button',role:'tab','aria-selected':kind===k,'aria-controls':'xen-meta-library-list',onClick:()=>{setKind(k);setSearch('')},onKeyDown:event=>{const idx=__XenSongKinds.indexOf(k);let next=null;if(event.key==='ArrowRight'||event.key==='ArrowDown')next=__XenSongKinds[(idx+1)%5];else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=__XenSongKinds[(idx+4)%5];else if(event.key==='Home')next=__XenSongKinds[0];else if(event.key==='End')next=__XenSongKinds[4];if(!next)return;event.preventDefault();event.stopPropagation();setKind(next);setSearch('');requestAnimationFrame(()=>document.querySelector('.xen-meta-tabs [role="tab"][aria-selected="true"]')?.focus({preventScroll:true}))},children:[u.jsx('span',{children:__XenQuick.icons[k]}),u.jsx('span',{children:{grid:'Thread',material:'Material',rootFollow:'RFL',drum:'Drums',bass:'Bass'}[k]})]},k))})]}),(kind==='sessions'?u.jsxs('div',{id:'xen-meta-sessions-panel','data-xen-meta-session-manager':true,className:'xen-meta-browser xen-meta-session-manager',children:[
   u.jsxs('div',{className:'xen-meta-browser-heading',children:[u.jsx('strong',{children:'🎧 Saved Sessions'}),u.jsx('span',{children:state.saved.length+' Sessions'})]}),
   u.jsx('div',{className:'xen-meta-session-list',children:state.saved.length?state.saved.map(saved=>u.jsxs('div',{className:'xen-meta-session-row'+(saved.id===state.loadedId?' is-active':''),children:[
     u.jsxs('div',{className:'xen-meta-session-details',children:[u.jsx('strong',{title:saved.name,children:saved.name}),u.jsx('small',{children:saved.items.length+' materials'+(saved.roomSettings?' · Main Room Settings':'')})]}),
     u.jsx('button',{type:'button','aria-label':'Load session: '+saved.name,onClick:()=>{if(state.dirty&&!window.confirm('Discard unsaved changes and load '+saved.name+'?'))return;__XenMetaSessions.load(saved.id)},children:'Load'}),
     u.jsx('button',{type:'button','aria-label':'Delete session: '+saved.name,title:'Delete saved session',onClick:()=>{if(window.confirm('Delete session “'+saved.name+'”?'))__XenMetaSessions.deleteSaved(saved.id)},children:'×'})
   ]},saved.id)):u.jsx('p',{className:'xen-meta-empty-library',children:'No saved sessions yet. Choose materials from the library tabs, arrange them on the right, then Save.'})})
  ]}):u.jsxs('div',{className:'xen-meta-browser',children:[u.jsxs('div',{className:'xen-meta-browser-heading',children:[u.jsx('button',{type:'button',className:'xen-meta-library-open-manager','aria-label':'Open original '+__XenMetaLabels[kind]+' manager','aria-haspopup':'dialog',title:'Open original '+__XenMetaLabels[kind]+' manager',onClick:()=>{if(!__xenOpenOriginalLibrary(kind))setNotice('Original '+__XenMetaLabels[kind]+' manager is unavailable in this room.')},children:__XenQuick.icons[kind]+' '+__XenMetaLabels[kind]}),u.jsx('input',{type:'search','aria-label':'Search library',placeholder:'Filter…',value:search,onChange:e=>setSearch(e.target.value)}),u.jsx('span',{children:entries.length+' entries'})]}),u.jsx('div',{id:'xen-meta-library-list',role:'tabpanel',className:'xen-meta-library-list',children:entries.length?entries.map(row):u.jsx('p',{className:'xen-meta-empty-library',children:'No entries. New musical materials are created in their original library.'})})]}))]}),
   u.jsxs('section',{className:'xen-meta-constellation',children:[u.jsxs('div',{className:'xen-meta-head',children:[u.jsx('strong',{children:'Session collection'}),u.jsx('small',{children:state.items.length+' entries'})]}),u.jsx('div',{className:'xen-meta-helper',children:'Drag from the library · reorder within a column · right-click to remove'}),u.jsx('div',{className:'xen-meta-board',role:'group','aria-label':'Session collection · Drop items here',children:__XenSongKinds.map(k=>u.jsxs('div',{className:'xen-meta-lane','data-xen-meta-column':k,children:[u.jsxs('header',{children:[u.jsx('strong',{children:__XenQuick.icons[k]+' '+{grid:'GRID',material:'MAT',rootFollow:'RFL',drum:'DRM',bass:'BASS'}[k]}),u.jsx('small',{children:state.items.filter(e=>e.kind===k).length+' entries'}),u.jsx('button',{type:'button',className:'xen-meta-source-menu','aria-label':'Open original '+__XenMetaLabels[k]+' manager',title:'Open original '+__XenMetaLabels[k]+' manager','aria-haspopup':'dialog',onClick:e=>{e.stopPropagation();if(!__xenOpenOriginalLibrary(k))setNotice('Original '+__XenMetaLabels[k]+' manager is unavailable in this room.')},children:u.jsx('svg',{viewBox:'0 0 32 32',width:32,height:32,'aria-hidden':'true',focusable:'false',children:u.jsx('path',{d:'M2 2 H30 V30 Z'})})})]}),u.jsx('div',{className:'xen-meta-lane-items',children:state.items.filter(e=>e.kind===k).map((e,i)=>tile(e,i))})]},k))}),u.jsx('div',{className:'xen-meta-board-foot',children:'Click a tile to edit its colors · right-click to remove · drop anywhere on the board'}),
    colorEdit&&state.items.some(e=>__xenGridKey(e)===__xenGridKey(colorEdit))&&u.jsxs('section',{className:'xen-meta-color-editor',role:'group','aria-label':'Colors for '+colorEdit.name,children:[
      u.jsxs('header',{children:[u.jsx('strong',{title:colorEdit.name,children:colorEdit.name}),u.jsx('button',{type:'button',onClick:()=>setColorEdit(null),'aria-label':'Close color editor',children:'×'})]}),
      selectedTile?.kind==='grid'&&u.jsxs('div',{className:'xen-grid-profile-controls',children:[
       u.jsxs('label',{children:[u.jsx('span',{children:'Add Mode (Mute Pattern)'}),u.jsx('select',{'aria-label':'Grid Profile mode',value:__xenGridCompatibleMode(selectedTile.id,selectedTile.gridProfile?.modeId),onChange:ev=>__XenMetaSessions.patchGridProfile(selectedTile,{modeId:ev.target.value}),children:(typeof Ka==='function'?Ka(selectedTile.id):[]).map(m=>u.jsx('option',{value:m.value,children:m.label},m.value))})]}),
       u.jsx('div',{className:'xen-grid-mode-mutes',role:'group','aria-label':'Custom muted Grid degrees',children:(typeof Kp==='function'?Kp(selectedTile.id):[]).map((c,i)=>{const muted=selectedTile.gridProfile?.mainMutedDegrees||[];return u.jsx('button',{type:'button','aria-label':'Grid degree '+(i+1),'aria-pressed':!muted.includes(i),title:'Degree '+(i+1)+' · '+Number(c).toFixed(1)+'¢',className:muted.includes(i)?'is-muted':'',onClick:()=>__XenMetaSessions.patchGridProfile(selectedTile,{mainMutedDegrees:muted.includes(i)?muted.filter(n=>n!==i):[...muted,i]}),children:i+1},i)})}),
       u.jsxs('div',{className:'xen-grid-bass-actions',children:[u.jsxs('label',{children:[u.jsx('span',{children:'Add Bass Grid'}),u.jsx('input',{type:'checkbox','aria-label':'Add Bass Grid',checked:!!selectedTile.gridProfile?.bassEnabled,onChange:ev=>__XenMetaSessions.patchGridProfile(selectedTile,{bassEnabled:ev.target.checked})})]}),u.jsx('button',{type:'button','aria-label':'Edit Bass Grid for '+selectedTile.name,title:'Edit this Session tile’s Bass Grid',onClick:()=>setBassEdit(selectedTile.instanceId),children:'Edit Bass Grid'})]}),
       u.jsx('button',{type:'button',className:'xen-grid-clone',onClick:()=>{const next=__XenMetaSessions.cloneGrid(selectedTile);if(next)setColorEdit(next)},children:'Clone and deviate'}),
       u.jsx('button',{type:'button',className:'xen-grid-period-open',onClick:()=>setPeriodEdit(selectedTile.instanceId),title:'Optionally tune this variation using the original Period Workbench engine',children:'Edit Tuning · Period Workbench'}),
       u.jsx('hr',{}),u.jsx('strong',{children:'COLORS'})
      ]}),
      u.jsxs('div',{className:'xen-meta-color-controls',children:[
        u.jsxs('label',{children:[u.jsx('span',{children:'Border'}),u.jsx('input',{type:'color','aria-label':'Border color',value:__XenMetaSessions.itemColor(colorEdit).border??'#42617c',onChange:ev=>__XenMetaSessions.setItemColor(colorEdit,'border',ev.target.value)})]}),
        u.jsxs('label',{children:[u.jsx('span',{children:'Background'}),u.jsx('input',{type:'color','aria-label':'Background color',value:__XenMetaSessions.itemColor(colorEdit).background??'#1b3042',onChange:ev=>__XenMetaSessions.setItemColor(colorEdit,'background',ev.target.value)})]})
      ]}),
      u.jsx('button',{type:'button',className:'xen-meta-color-reset',onClick:()=>__XenMetaSessions.resetItemColor(colorEdit),children:'Reset colors'}),
      u.jsx('small',{children:'Colors belong to this session only; library entries are unchanged.'})
    ]})]})]}),
  periodEdit&&selectedTile?.kind==='grid'&&selectedTile.instanceId===periodEdit&&u.jsx(__XenSessionPeriodDialog,{entry:selectedTile,onClose:()=>setPeriodEdit(null),onConfirm:draft=>__XenMetaSessions.createTuningVariation(selectedTile,draft)}),
  bassEdit&&selectedTile?.kind==='grid'&&selectedTile.instanceId===bassEdit&&u.jsx(__XenSessionBassDialog,{entry:selectedTile,onClose:()=>setBassEdit(null),onConfirm:draft=>{__XenMetaSessions.patchGridProfile(selectedTile,{bassConfig:draft});setBassEdit(null)}}),
  u.jsxs('footer',{className:'xen-meta-footer',children:[actions(u.jsxs(P.Fragment,{children:[u.jsx('span',{className:'xen-meta-action-arrow','aria-hidden':'true',children:'➜'}),' Edit Current Live Session']}),()=>{const s=__XenMetaSessions.snapshot();const fresh=s.loadedId===null&&s.name==='Untitled Session'&&!Object.keys(s.colors).length&&!s.roomSettings&&JSON.stringify(s.items)===JSON.stringify(__XenQuick.getItems());if(s.dirty&&!fresh&&!window.confirm('Discard unsaved session edits and open the current Live Quick Access for editing?'))return;if(__XenMetaSessions.editCurrentLive()){setColorEdit(null);setNotice('Current Live Quick Access opened as an editable session draft.')}}),state.roomSettings&&actions('× Remove settings',()=>__XenMetaSessions.clearRoomSettings()),u.jsx('span',{role:'status',className:'xen-meta-footer-status',children:state.error||notice||(missing.length?missing.length+' missing library references are retained.':'Editing does not affect live audio.')}),state.loadedId&&actions('Delete session',()=>{if(window.confirm('Delete saved session?'))__XenMetaSessions.deleteSaved(state.loadedId)}),u.jsxs('div',{className:'xen-meta-history-controls',children:[actions('↶ Undo',()=>{__XenMetaSessions.undo();setColorEdit(null)},!state.canUndo),actions('Redo ↷',()=>{__XenMetaSessions.redo();setColorEdit(null)},!state.canRedo)]})]})
 ]})});
}

/* Contextual Save in Sessions dialog, launched by the disk beside the live mute row. */
function __XenQuickSaveDialog({onClose}){
 const state=P.useSyncExternalStore(__XenMetaSessions.subscribe,__XenMetaSessions.snapshot,__XenMetaSessions.snapshot);
 const [selected,setSelected]=P.useState(state.loadedId&&state.saved.some(e=>e.id===state.loadedId)?state.loadedId:'');
 const [name,setName]=P.useState(state.name&&state.name!=='Untitled Session'&&state.name!=='Freie Session'?state.name:'New Session');
 const [message,setMessage]=P.useState('');
 const [includeMainRoomSettings,setIncludeMainRoomSettings]=P.useState(false);
 const nameRef=P.useRef(null);
 P.useEffect(()=>{nameRef.current?.focus({preventScroll:true})},[]);
 const selectedRow=state.saved.find(e=>e.id===selected);
 const submit=action=>{
   const success=action==='new'?__XenMetaSessions.saveFromQuickAsNew(name,includeMainRoomSettings):__XenMetaSessions.updateSavedFromQuick(selected,name,includeMainRoomSettings);
   if(success)onClose();else setMessage(__XenMetaSessions.snapshot().error||'Unable to save session.');
 };
 return ao.createPortal(u.jsx('div',{className:'xen-quick-save-overlay',onPointerDown:e=>e.stopPropagation(),onMouseDown:e=>e.stopPropagation(),onClick:e=>{e.stopPropagation();if(e.target===e.currentTarget)onClose()},onKeyDown:e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();onClose()}},children:u.jsxs('section',{className:'xen-quick-save-dialog',role:'dialog','aria-modal':true,'aria-label':'Save in Sessions (Meta-Menu)',children:[
   u.jsxs('header',{children:[u.jsx('strong',{children:'💾 Save in Sessions (Meta-Menu)'}),u.jsx('button',{type:'button','aria-label':'Close',onClick:onClose,children:'×'})]}),
   u.jsx('p',{children:'Save the current Live Quick Access collection.'}),
   u.jsxs('label',{children:[u.jsx('span',{children:'Name'}),u.jsx('input',{ref:nameRef,type:'text',maxLength:100,'aria-label':'Session name',value:name,onChange:e=>{setName(e.target.value);setMessage('')}})]}),
   u.jsxs('label',{children:[u.jsx('span',{children:'Existing session'}),u.jsx('select',{'aria-label':'Session to update',value:selected,onChange:e=>{const id=e.target.value;setSelected(id);const row=state.saved.find(e=>e.id===id);if(row)setName(row.name);setMessage('')},children:[u.jsx('option',{value:'',children:'— Choose session —'}),...state.saved.map(s=>u.jsx('option',{value:s.id,children:s.name},s.id))]})]}),
   u.jsxs('label',{className:'xen-quick-save-include-settings',children:[u.jsx('input',{type:'checkbox',checked:includeMainRoomSettings,'aria-label':'Include Main Room Settings',onChange:e=>{setIncludeMainRoomSettings(e.target.checked);setMessage('')}}),u.jsx('span',{children:'Include Main Room Settings'})]}),
   u.jsxs('div',{className:'xen-quick-save-actions',children:[
     u.jsx('button',{type:'button',className:'is-new',disabled:!name.trim(),onClick:()=>submit('new'),children:'Save as New Session'}),
     u.jsx('button',{type:'button',className:'is-update',disabled:!selectedRow||!name.trim(),onClick:()=>submit('update'),children:'Update Session'})
   ]}),
   (message||state.error)&&u.jsx('p',{className:'xen-quick-save-error',role:'alert',children:message||state.error})
 ]})}),document.body);
}
