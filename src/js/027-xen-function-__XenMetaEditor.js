
function __XenMetaEditor({onClose}){
/* M7: pure, bounded catalog projection; canonical session payloads remain untouched.
   Search includes referenced material names without opening their audio stores. */
function __xenM7CatalogPage(saved,search,limit){
 const rows=Array.isArray(saved)?saved:[];
 const maximum=Math.max(0,Math.floor(Number(limit)||0));
 const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
 const needle=fold(search).trim();
 if(!needle)return {entries:rows.slice(0,maximum),total:rows.length};
 const entries=[];let total=0;
 for(const row of rows){
  if(!row)continue;
  const subject=[row.name,row.id,...(Array.isArray(row.items)?row.items.map(item=>item?.name):[])].join(' ');
  if(!fold(subject).includes(needle))continue;
  total++;
  if(entries.length<maximum)entries.push(row);
 }
 return {entries,total};
}

 const quickDisplayMode=P.useSyncExternalStore(__XenQuickDisplay.subscribe,__XenQuickDisplay.snapshot,__XenQuickDisplay.snapshot);
 const state=P.useSyncExternalStore(__XenMetaSessions.subscribe,__XenMetaSessions.snapshot,__XenMetaSessions.snapshot);
 const quickState=P.useSyncExternalStore(__XenQuick.subscribe,__XenQuick.snapshot,__XenQuick.snapshot);
 const starterPreload=P.useSyncExternalStore(__XenStarterMaterial.subscribe,__XenStarterMaterial.snapshot,__XenStarterMaterial.snapshot);
 /* Meta is a sixth navigation destination. A native dialog temporarily owns
    keyboard navigation while Meta remains mounted beneath it. */
 P.useEffect(()=>{if(!quickState.active||quickState.active.kind==='meta')__XenQuick.setActive({kind:'meta',id:'sessions',name:'Meta-Menu'},onClose)},[quickState.active?.kind]);
 P.useEffect(()=>()=>{if(__XenQuick.snapshot().active?.kind==='meta')__XenQuick.setActive(null)},[]);
 const nativeOpen=['grid','material','rootFollow','drum','bass'].includes(quickState.active?.kind);
 /* P36-5 UX-01: the Session manager is the discoverable first Meta destination.
    Libraries remain explicit, reachable sub-tabs; no persisted selection is reset. */
 const [kind,setKind]=P.useState('sessions'),[search,setSearch]=P.useState(''),[notice,setNotice]=P.useState(''),[colorEdit,setColorEdit]=P.useState(null),[bassEdit,setBassEdit]=P.useState(null),[periodEdit,setPeriodEdit]=P.useState(null),[renameDraft,setRenameDraft]=P.useState(null),[renameBusy,setRenameBusy]=P.useState(false);
 const [libraryRename,setLibraryRename]=P.useState(null),[libraryAnchor,setLibraryAnchor]=P.useState(null),[libraryRevision,setLibraryRevision]=P.useState(0);
 const metaTrashBusy=P.useRef(false);
 P.useEffect(()=>{
  const onOrder=async e=>{
   if(e.detail?.kind!==kind)return;
   try{
    const changed=await __XenMetaGlobalOrder.commit(kind,e.detail.visibleIds,e.detail.draggedId,e.detail.targetId,e.detail.operation);
    if(changed){setLibraryRevision(n=>n+1);setNotice('Native library order saved · '+__XenMetaLabels[kind]+' · Session unchanged.');}
   }catch(error){setNotice('Library order NOT saved: '+error.message)}
  };
  const onChanged=e=>{if(e.detail?.kind===kind)setLibraryRevision(n=>n+1)};
  window.addEventListener('xensonar:meta-library-order-drop',onOrder);
  window.addEventListener('xensonar:meta-library-order-changed',onChanged);
  return()=>{window.removeEventListener('xensonar:meta-library-order-drop',onOrder);window.removeEventListener('xensonar:meta-library-order-changed',onChanged)};
 },[kind]);
 P.useEffect(()=>{
  const receive=event=>{
   const source=event.detail?.source;
   if(metaTrashBusy.current)return;
   if(!source||source.kind!==kind||!__xenMetaLibraryEntries(kind).some(row=>row.id===source.id)){
    setNotice('Trash: library selection changed; no entry removed.');return;
   }
   metaTrashBusy.current=true;
   void __xenMetaTrashRemove(source).then(ok=>{
    if(ok){setLibraryRevision(n=>n+1);__XenQuick.refreshLibraries();setColorEdit(null);
     setNotice(source.name+' removed using the native '+__XenMetaLabels[source.kind]+' owner.');}
    else setNotice('Deletion cancelled; library and Sessions unchanged.');
   }).catch(error=>setNotice('Trash blocked: '+(error?.message||String(error))))
   .finally(()=>{metaTrashBusy.current=false});
  };
  window.addEventListener('xensonar:meta-trash-drop',receive);
  return()=>window.removeEventListener('xensonar:meta-trash-drop',receive);
 },[kind]);
 const __xenMetaRenameLock=P.useRef(false);
 const [performanceTab,setPerformanceTab]=P.useState('loops');
  const [fillEdit,setFillEdit]=P.useState(null);
 const [fillDraft,setFillDraft]=P.useState(null);
 const [materialNudgeDraft,setMaterialNudgeDraft]=P.useState(null);
 const fillRevision=P.useSyncExternalStore(__XenOneShotAssignments.subscribe,__XenOneShotAssignments.snapshot,__XenOneShotAssignments.snapshot);
 P.useSyncExternalStore(__XenSessionInstrumentView.subscribe,__XenSessionInstrumentView.snapshot,__XenSessionInstrumentView.snapshot);
 const instrumentView=__XenSessionInstrumentView.project(state);
 const sessionFillItems=__XenOneShotAssignments.read(state.loadedId);
  // Protect against an item removed/reordered while its context menu is open.
  const fillCandidate=fillEdit&&(sessionFillItems[fillEdit.role]||[])[fillEdit.index];
  const fillSelected=fillCandidate&&fillCandidate.id===fillEdit.id&&fillCandidate.kind===fillEdit.kind?fillCandidate:null;
  const [instrumentDraft,setInstrumentDraft]=P.useState({});
 const instrumentSelectionRef=P.useRef({});
 const [instrumentPreview,setInstrumentPreview]=P.useState('');
 const [instrumentSettings,setInstrumentSettings]=P.useState(null);
 const settingsRef=P.useRef(null);
 P.useEffect(()=>{instrumentSelectionRef.current={};setInstrumentDraft({});setInstrumentPreview('');setFillEdit(null);setFillDraft(null);setInstrumentSettings(null)},[state.loadedId]);
 P.useEffect(()=>{
  if(!instrumentSettings)return;
  const outside=e=>{if(!settingsRef.current?.contains(e.target))setInstrumentSettings(null)};
  const escape=e=>{if(e.key==='Escape')setInstrumentSettings(null)};
  document.addEventListener('pointerdown',outside,true);
  document.addEventListener('keydown',escape,true);
  return()=>{document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',escape,true)};
 },[instrumentSettings?.role]);
 const openInstrumentSettings=(e,role)=>{
  e.preventDefault();e.stopPropagation();
  if(!instrumentView.sessionId){setNotice('Select a saved Session before editing instrument settings.');return}
  if(!instrumentView[role]?.id){setNotice('Save a sound into this Session before editing its instrument settings.');return}
  const saved=__XenSessionInstrumentView.settings(state,role);
  if(!saved){setNotice('Saved instrument settings unavailable.');return}
  const rect=e.currentTarget.getBoundingClientRect();
  setInstrumentSettings({role,sessionId:instrumentView.sessionId,
   top:Math.min(window.innerHeight-340,Math.max(8,rect.top)),
   left:Math.min(window.innerWidth-290,Math.max(8,rect.right+8)),
   saved,draft:{volume:saved.volume,pan:saved.pan,octave:saved.octave,lengthSec:saved.lengthSec}});
 };
 const commitInstrumentSettings=()=>{
  const edit=instrumentSettings;
  if(!edit||edit.sessionId!==instrumentView.sessionId){setInstrumentSettings(null);setNotice('Session switched: uncommitted edits discarded.');return}
  const current=__XenSessionInstrumentView.settings(state,edit.role);
  if(!current){setInstrumentSettings(null);return}
  const changed={};
  for(const key of (current.hasVolume?['volume','pan','octave',...(current.lengthSupported?['samplePlaybackLengthSec']:[])]:['pan','octave',...(current.lengthSupported?['samplePlaybackLengthSec']:[])]))
   if((key==='samplePlaybackLengthSec'?edit.draft.lengthSec:edit.draft[key])!==(key==='samplePlaybackLengthSec'?current.lengthSec:current[key]))
    changed[key]=key==='samplePlaybackLengthSec'?edit.draft.lengthSec:edit.draft[key];
  if(!Object.keys(changed).length){setInstrumentSettings(null);return}
  const success=__XenMetaSessions.updateSavedInstrumentSettings(edit.sessionId,edit.role,changed);
  setNotice(success?'Instrument settings saved in selected Session · Live Room unchanged.':
    (__XenMetaSessions.snapshot().error||'Instrument settings save failed.'));
  if(success)setInstrumentSettings(null);
 };
 const applyInstrument=(role,value)=>{
  if(!instrumentView.sessionId){setNotice('Select a saved Session first.');return}
  if(!__XenSessionInstrumentView.options(role).some(option=>option.id===value)){setNotice('Cannot Apply: sound not found in the native catalog.');return}
  if(!__XenMetaSessions.applyDraftInstrument(instrumentView.sessionId,role,value)){
   setNotice(__XenMetaSessions.snapshot().error||'Instrument Apply failed.');return}
  setInstrumentDraft(old=>{const next={...old};delete next[role];return next});
  delete instrumentSelectionRef.current[role];
  setNotice('Applied '+role+' as pitch-variable instrument to the Session draft · use Save above to persist or Engage to play.');
 };
 const [instrumentTransferBusy,setInstrumentTransferBusy]=P.useState(null);
 const transferBusyRef=P.useRef(false);
 const transferInstrument=async (role,presetId)=>{
  if(transferBusyRef.current){setNotice('A Fill transfer is already being prepared.');return;}
  transferBusyRef.current=true;setInstrumentTransferBusy(role);
  try{
   const source=await __XenP36InstrumentFillTransfer.build(__XenMetaSessions.snapshot(),role,presetId);
   // Audio preparation is required BEFORE committing any Session mutation.
   await __XenOneShotAudio.prepare(source.item);
   const latest=__XenMetaSessions.snapshot();
   const liveSelection=instrumentSelectionRef.current[role]??__XenSessionInstrumentView.draftPresetId(latest,role);
   if(latest.loadedId!==source.sessionId)
    throw Error('The selected Session changed during transfer; nothing was assigned.');
   if(liveSelection!==source.presetId)
    throw Error('The selected instrument changed during transfer; nothing was assigned.');
   const assigned=__XenOneShotAssignments.assignTransfer(source.sessionId,source.item);
   if(!assigned.ok)throw Error(assigned.reason);
   const saved=__XenOneShotAssignments.read(source.sessionId).melodic.find(e=>e.kind===assigned.item.kind&&e.id===assigned.item.id);
   if(!saved||!__XenP36InstrumentFillTransfer.valid(saved))
    throw Error('The Fill assignment cannot be verified in the Session.');
   setPerformanceTab('oneshots');
   setNotice('↳ Melodic Fills: '+saved.name+' taken from the visible instrument selection'+(assigned.copy>1?' (copy '+assigned.copy+')':'')+' · no Apply or instrument Save required.');
  }catch(error){setNotice('Melodic Fill transfer unavailable: '+String(error?.message||error));}
  finally{transferBusyRef.current=false;setInstrumentTransferBusy(null);}
 };
 const previewInstrument=async(role,value)=>{
  setInstrumentPreview(role);
  try{await __XenSessionInstrumentView.preview(role,value);setNotice('Preview: '+role+' · '+value+' (saved Session unchanged).')}
  catch(error){setNotice('Preview unavailable: '+String(error?.message||error))}
  finally{setInstrumentPreview('')}
 };
 P.useEffect(()=>{
  const open=()=>setPerformanceTab('oneshots');
  window.addEventListener('xensonar:fill-pointer-open-tab',open);
  return()=>window.removeEventListener('xensonar:fill-pointer-open-tab',open);
 },[]);
 // META-PLUS-01: identical eligibility and native owner for drag-to-Fill and shortcut +.
 const __xenMetaFillShortcutRole=entry=>entry&&['drum','material','rootFollow'].includes(entry.kind)
  ?__XenOneShotAssignments.group(entry.kind):null;
 const sourceToFill=e=>{
  if(!__xenMetaFillShortcutRole(e)){setNotice('No One-Shot Fill destination for this source · Session unchanged.');return false;}
  if(!__XenOneShotAssignments.assign(state.loadedId,e)){setNotice('Fill not assigned: existing, invalid, full, or local storage unavailable.');return false;}
  setColorEdit(null);setGlobalColorsOpen(false);setPerformanceTab('oneshots');
  setNotice('One-Shot Fill assigned · click its Live Room plate to trigger the first bar.');
  return true;
 };
 P.useEffect(()=>{
  const drop=event=>{
   const {source,role}=event.detail||{};
   if(!source||!['drum','melodic'].includes(role))return;
   if(__xenMetaFillShortcutRole(source)!==role){setNotice('Wrong Fill column · source unchanged.');return;}
   sourceToFill(source);
  };
  window.addEventListener('xensonar:meta-fill-drop',drop);
  return()=>window.removeEventListener('xensonar:meta-fill-drop',drop);
 },[state.loadedId]);
 const __xenMetaQuickAdd=entry=>{
  if(performanceTab==='oneshots'){
   if(!__xenMetaFillShortcutRole(entry)){setNotice('No One-Shot Fill destination for '+entry.name+' · choose GRID & LOOPS.');return false;}
   return sourceToFill(entry);
  }
  const ok=__XenMetaSessions.addItem(entry);
  setNotice(ok?'→ GRID & LOOPS: '+entry.name+' appended to its Session lane.':
   (__XenMetaSessions.snapshot().error||'GRID & LOOPS: source already assigned or Session unavailable.'));
  return ok;
 };
 const [sessionSearch,setSessionSearch]=P.useState(''),[sessionVisible,setSessionVisible]=P.useState(64);
 /* M11: last-intent-wins, with cancellation on editor unmount. */
 const [sessionLoading,setSessionLoading]=P.useState(null),hydrationUiTicket=P.useRef(0);
 P.useEffect(()=>()=>{hydrationUiTicket.current++;__XenM11Hydration?.cancel()},[]);
 const loadArchivedDraft=id=>{
  const mine=++hydrationUiTicket.current;
  setSessionLoading(id);
  void __xenM11StartHydration().loadDraft(id).then(result=>{
   if(mine!==hydrationUiTicket.current)return;
   if(result.ok)setNotice('Session loaded.');
   else if(result.reason==='stale')setNotice('Session changed while loading · select again.');
   else setNotice('Session load: '+result.reason);
  }).catch(error=>{if(mine===hydrationUiTicket.current)setNotice('Session load: '+String(error?.message||error))})
   .finally(()=>{if(mine===hydrationUiTicket.current)setSessionLoading(null)});
 };

 /* M9: only entering the archive starts sidecar preparation. No main-boot I/O. */
 P.useEffect(()=>{if(kind!=='sessions')return;const archive=__xenM9StartArchive();archive.enter();return()=>archive.leave()},[kind]);
 const sessionListRef=P.useRef(null),sessionMoreRef=P.useRef(null);
 P.useEffect(()=>{
  const onDrop=event=>{
   const d=event.detail||{};
   const ok=__XenMetaSessions.reorderSaved(d.visibleIds,d.draggedId,d.targetId,d.operation);
   setNotice(ok?'Session order saved globally.':(__XenMetaSessions.snapshot().error||'Session order unchanged.'));
  };
  window.addEventListener('xensonar:meta-session-order-drop',onDrop);
  return()=>window.removeEventListener('xensonar:meta-session-order-drop',onDrop);
 },[]);

 const sessionCatalog=P.useMemo(()=>kind==='sessions'
  ?__xenM7CatalogPage(state.saved,sessionSearch,sessionVisible)
  :{entries:[],total:state.saved.length},[kind,state.saved,sessionSearch,sessionVisible]);
 /* Grow only as the reader scrolls; a real button remains as accessibility/
    IntersectionObserver fallback. This never touches persisted session data. */
 P.useEffect(()=>{
  if(kind!=='sessions'||sessionCatalog.entries.length>=sessionCatalog.total||!sessionMoreRef.current||typeof IntersectionObserver==='undefined')return;
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting))setSessionVisible(value=>Math.min(sessionCatalog.total,value+64));
  },{root:sessionListRef.current,rootMargin:'0px 0px 160px 0px',threshold:0});
  observer.observe(sessionMoreRef.current);
  return()=>observer.disconnect();
 },[kind,sessionSearch,sessionVisible,sessionCatalog.total]);
 P.useEffect(()=>{if(['material','rootFollow'].includes(kind))__XenStarterMaterial.request(kind)},[kind]);
 const [globalColorsOpen,setGlobalColorsOpen]=P.useState(false),[globalMode,setGlobalMode]=P.useState('border'),[globalBorder,setGlobalBorder]=P.useState('#42617c'),[globalBackground,setGlobalBackground]=P.useState('#1b3042');
 const [__xenMetaRenamedNames,__xenMetaRememberName]=P.useState({});
 function __xenMetaNameFor(entry){
  if(!entry)return '';
  // Material owner name takes precedence over temporary editor-label cache.
  if(entry.kind==='material')return __xenMaterialDisplayName(entry);
  const key=entry.kind+'\0'+entry.id;
  if(Object.hasOwn(__xenMetaRenamedNames,key))return __xenMetaRenamedNames[key];
  // Grid custom names are owned by the original Grid Workbench, not Meta aliases.
  if(entry.kind==='grid')return String((typeof DJ==='function'?DJ(entry.id)?.label:null)||entry.name||'');
  if(entry.kind==='bass'&&!entry.id.startsWith('clip:'))return String(entry.name??'');
  if(entry.kind==='drum'){const alias=typeof Yl==='function'?Yl().aliases?.[entry.id]:null;return alias||String(entry.name??'');}
  // The registered native library is authoritative. Session records may retain
  // historical display labels and must not be overwritten just to rename a source.
  const native=__XenQuick.adapters.get(entry.kind)?.entries;
  const current=Array.isArray(native)?native.find(row=>String(row.id)===String(entry.id)):null;
  return String(current?.name??entry.name??'');
 }
 const __xenMetaLibrarySource=!!colorEdit?.__xenLibrarySource;
 const selectedTile=__xenMetaLibrarySource
  ?(__xenMetaLibraryEntries(colorEdit.kind).find(e=>e.id===colorEdit.id)||colorEdit)
  :state.items.find(e=>colorEdit&&__xenGridKey(e)===__xenGridKey(colorEdit));
 const __xenMetaSelectedName=__xenMetaNameFor(selectedTile);
 const __xenMetaNameValue=renameDraft===null?__xenMetaSelectedName:renameDraft;
 const __xenMetaNameDirty=!!selectedTile&&__xenMetaNameValue!==__xenMetaSelectedName;

 /* Loop Integrity: a changed NAME is a 10-second uncommitted draft only.
    One id, one persistent name: no auto-save, aliases, or cross-session writes. */
 const XEN_META_NAME_IDLE_MS=10000;
 const __xenMetaNameIdle=P.useRef(null),__xenMetaNameEpoch=P.useRef(0);
 const __xenMetaNameCancel=()=>{
  __xenMetaNameEpoch.current++;
  if(__xenMetaNameIdle.current!==null){clearTimeout(__xenMetaNameIdle.current);__xenMetaNameIdle.current=null;}
 };
 const __xenMetaNameExpire=()=>{__xenMetaNameIdle.current=null;setRenameDraft(null)};
 const __xenMetaNameEdit=value=>{
  __xenMetaNameCancel();
  setRenameDraft(value===__xenMetaSelectedName?null:value);
  if(value===__xenMetaSelectedName)return;
  const epoch=__xenMetaNameEpoch.current;
  __xenMetaNameIdle.current=setTimeout(()=>{
   if(epoch!==__xenMetaNameEpoch.current)return;
   __xenMetaNameExpire();
  },XEN_META_NAME_IDLE_MS);
 };
 P.useEffect(()=>()=>__xenMetaNameCancel(),[selectedTile?.id,selectedTile?.instanceId,selectedTile?.name]);
 // Both the original NAME/SAVE editor and the inline ✓ delegate to one native writer.
 const __xenMetaSaveName=async(source,requested)=>{
  if(__xenMetaRenameLock.current)return false;
  __xenMetaRenameLock.current=true;setRenameBusy(true);
  try{
   const result=await __xenMetaRenameSource({kind:source.kind,id:source.id},requested);
   __xenMetaRememberName(prev=>({...prev,[result.kind+'\0'+result.id]:result.name}));
   setLibraryRevision(v=>v+1);
   __XenQuick.refreshLibraries();
   setNotice('Original '+__XenMetaLabels[result.kind]+' name saved: '+result.name);
   setColorEdit(prev=>prev?.__xenLibrarySource&&prev.kind===result.kind&&prev.id===result.id?{...prev,name:result.name}:prev);
   return true;
  }catch(error){setNotice('Rename failed (original unchanged): '+error.message);return false}
  finally{__xenMetaRenameLock.current=false;setRenameBusy(false)}
 };
 const __xenMetaBeginInlineRename=e=>{
  __xenMetaNameCancel();setRenameDraft(null);setColorEdit(null);setLibraryAnchor(null);
  setLibraryRename({kind:e.kind,id:e.id,value:__xenMetaNameFor(e)});
 };
 const __xenMetaOpenLibrary=(entry,event)=>{
  __xenMetaNameCancel();setRenameDraft(null);setLibraryRename(null);setFillEdit(null);setGlobalColorsOpen(false);
  const row=event.currentTarget;
  const plus=row?.querySelector('[data-xen-library-plus]');
  if(plus){const box=plus.getBoundingClientRect();
   setLibraryAnchor({left:Math.max(8,Math.min(Math.round(box.right+9),window.innerWidth-296)),top:Math.max(8,Math.min(Math.round(box.top-10),window.innerHeight-310))});
  }else setLibraryAnchor(null);
  setColorEdit({...entry,__xenLibrarySource:true});
 };


 const audition=typeof __XenMetaAudition!=='undefined'?__XenMetaAudition:{subscribe:()=>()=>{},snapshot:()=>null,status:()=>null,available:()=>false,toggle:()=>Promise.resolve('unavailable')};
 const previewState=P.useSyncExternalStore(audition.subscribe,audition.snapshot,audition.snapshot);
 const previewStatus=P.useSyncExternalStore(audition.subscribe,audition.status,audition.status);
 P.useEffect(()=>{const report=event=>setNotice(event.detail?.message||'Not dropped · move the item onto the Session board.');window.addEventListener('xensonar:meta-drag-note',report);return()=>window.removeEventListener('xensonar:meta-drag-note',report)},[]);
 const ref=P.useRef(null);P.useEffect(()=>{ref.current?.focus({preventScroll:true});return()=>document.querySelector('[aria-label="Meta-Menu"]')?.focus({preventScroll:true})},[]);
 const allSourceEntries=kind==='sessions'?[]:__xenMetaLibraryEntries(kind);
 const entries=allSourceEntries.filter(e=>e.name.toLowerCase().includes(search.toLowerCase()));
 const missing=__XenMetaSessions.diagnostics();const warn=e=>missing.some(m=>m.kind===e.kind&&m.id===e.id);
 const sessionHeading=state.loadedId||String(state.name||'').trim()!=='Untitled Session'&&String(state.name||'').trim()?String(state.name).trim():'Not saved yet';
 const row=e=>{
  const editing=libraryRename?.kind===e.kind&&libraryRename?.id===e.id;
  const index=allSourceEntries.findIndex(row=>row.id===e.id),tooltip=__xenMetaEntryTooltip(e,index);
  return u.jsxs('div',{...__quickProps(e.kind,e.id,e.name),role:'button',tabIndex:0,
   className:'xen-meta-library-row'+(editing?' is-renaming':''),'data-xen-meta-library-source':true,
   title:editing?'Edit name · Enter/✓ saves · Escape cancels':tooltip+' · Click: edit · Right-click: rename · Drag: swap/insert or send to Session',
   onClick:evt=>{if(editing||evt.target.closest('button,input'))return;__xenMetaOpenLibrary(e,evt)},
   onContextMenu:evt=>{if(evt.target.closest('input'))return;evt.preventDefault();__xenMetaBeginInlineRename(e)},
   onKeyDown:evt=>{if(evt.target!==evt.currentTarget)return;
    if(evt.key==='Enter'||evt.key===' '){evt.preventDefault();__xenMetaOpenLibrary(e,evt)}
    else if(evt.key==='F2'){evt.preventDefault();__xenMetaBeginInlineRename(e)}},
   children:[
    u.jsx('span',{className:'xen-meta-source-icon',children:__XenQuick.icons[e.kind]}),
    editing?u.jsx('input',{type:'text',className:'xen-meta-source-rename-input','aria-label':'Rename '+__XenMetaLabels[e.kind]+' '+e.name,
     autoFocus:true,maxLength:100,spellCheck:false,disabled:renameBusy,value:libraryRename.value,
     onFocus:ev=>ev.currentTarget.select(),onContextMenu:ev=>ev.stopPropagation(),onPointerDown:ev=>ev.stopPropagation(),onClick:ev=>ev.stopPropagation(),
     onChange:ev=>setLibraryRename(prev=>prev?{...prev,value:ev.target.value}:prev),
     onKeyDown:ev=>{ev.stopPropagation();if(ev.key==='Escape'){ev.preventDefault();setLibraryRename(null)}else if(ev.key==='Enter'){
      ev.preventDefault();if(!libraryRename.value.trim())return;
      void __xenMetaSaveName(e,libraryRename.value).then(ok=>{if(ok)setLibraryRename(prev=>prev?.kind===e.kind&&prev?.id===e.id?null:prev)});
     }}}):u.jsx('span',{className:'xen-meta-source-name',title:tooltip,children:e.name}),
    editing&&u.jsx('button',{type:'button',className:'xen-meta-source-rename-confirm',title:'Save original library name',
     'aria-label':'Confirm new name for '+e.name,disabled:renameBusy||!libraryRename.value.trim(),
     onPointerDown:ev=>ev.stopPropagation(),onMouseDown:ev=>ev.stopPropagation(),onKeyDown:ev=>ev.stopPropagation(),
     onClick:evt=>{evt.stopPropagation();void __xenMetaSaveName(e,libraryRename.value).then(ok=>{if(ok)setLibraryRename(prev=>prev?.kind===e.kind&&prev?.id===e.id?null:prev)})},children:'✓'}),
    audition.available(e)&&u.jsx('button',{type:'button',className:'xen-meta-row-preview',
     'data-preview-phase':previewStatus.key===__xenGridKey(e)?previewStatus.phase:'idle',
     'aria-busy':previewStatus.key===__xenGridKey(e)&&previewStatus.phase==='preparing',
     onPointerDown:evt=>evt.stopPropagation(),onMouseDown:evt=>evt.stopPropagation(),onKeyDown:evt=>evt.stopPropagation(),
     'aria-pressed':(previewState===__xenGridKey(e)),
     'aria-label':((previewState===__xenGridKey(e))?'Stop preview ':'Preview ')+e.name,
     title:tooltip+' · '+((previewState===__xenGridKey(e))?(previewStatus.phase==='preparing'?'Cancel preparation':'Stop preview'):(e.kind==='rootFollow'?'Preview in Root Follow':'Preview '+__XenMetaLabels[e.kind])),
     disabled:!audition.available(e),onClick:evt=>{evt.stopPropagation();void audition.toggle(e).catch(error=>setNotice('Preview: '+error.message))},
     children:(previewState===__xenGridKey(e))?(previewStatus.phase==='preparing'?'…':'■'):'▶'}),
     u.jsx('button',{type:'button','data-xen-library-plus':true,
      disabled:performanceTab==='oneshots'&&!__xenMetaFillShortcutRole(e),
      'aria-label':performanceTab==='oneshots'
       ?(__xenMetaFillShortcutRole(e)?'Add to '+(__xenMetaFillShortcutRole(e)==='drum'?'Drum Fills: ':'Melodic Fills: ')+e.name:'No One-Shot Fill destination: '+e.name)
       :'Add to Grid & Loops: '+e.name,
      title:tooltip+(performanceTab==='oneshots'
       ?(__xenMetaFillShortcutRole(e)?' · Add to '+(__xenMetaFillShortcutRole(e)==='drum'?'Drum Fills':'Melodic Fills')+' (same as drag)':' · No Fill destination · switch to GRID & LOOPS')
       :' · Append to GRID & LOOPS (same as drag)'),
      onClick:evt=>{evt.stopPropagation();__xenMetaQuickAdd(e)},children:'+'})
   ]},e.kind+':'+e.id);
 };
 const tile=(e,i)=>{const tint=__XenMetaSessions.itemColor(e);return u.jsxs('div',{...__quickProps(e.kind,e.id,e.name),role:'button',tabIndex:0,'data-xen-meta-item':'true','data-xen-quick-id':e.instanceId||e.id,className:'xen-meta-tile'+(warn(e)?' is-missing':'')+(colorEdit&&__xenGridKey(colorEdit)===__xenGridKey(e)?' is-color-selected':''),'aria-label':e.name+' · Click to edit colors · Right-click to remove',title:__xenMetaEntryTooltip(e,i)+(warn(e)?' · Missing library entry':''),'data-xen-meta-index':i,style:{...(tint.border?{borderColor:tint.border}:{}),...(tint.background?{backgroundColor:tint.background}:{})},onClick:()=>{__xenMetaNameCancel();setGlobalColorsOpen(false);setRenameDraft(null);setFillEdit(null);setMaterialNudgeDraft(null);setColorEdit(e)},onContextMenu:event=>{event.preventDefault();__XenMetaSessions.removeItem(e);if(colorEdit&&__xenGridKey(colorEdit)===__xenGridKey(e))setColorEdit(null)},onKeyDown:event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();__xenMetaNameCancel();setRenameDraft(null);setMaterialNudgeDraft(null);setColorEdit(e)}if(event.key==='Delete'){event.preventDefault();__XenMetaSessions.removeItem(e)}if(['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const arr=state.items.filter(x=>x.kind===e.kind);const at=arr.findIndex(x=>__xenGridKey(x)===__xenGridKey(e));__XenMetaSessions.moveItem(e,event.key==='ArrowUp'?(arr[Math.max(at-1,0)]?.instanceId||arr[Math.max(at-1,0)]?.id||null):(arr[at+2]?.instanceId||arr[at+2]?.id||null))}},children:[u.jsx('span',{className:'xen-meta-tile-index',children:i+1}),u.jsx('span',{className:'xen-meta-tile-name',children:__xenMetaNameFor(e)+(e.kind==='grid'?' · '+__xenGridModeName(e.gridProfile?.modeId):'')}),__xenQuickBassGridFlag(e),warn(e)&&u.jsx('span',{children:'⚠'}),audition.available(e)&&u.jsx('button',{type:'button',className:'xen-meta-tile-preview','aria-label':((previewState===__xenGridKey(e))?'Stop preview ':'Preview ')+e.name,'aria-pressed':(previewState===__xenGridKey(e)),title:__xenMetaEntryTooltip(e,i)+' · '+((previewState===__xenGridKey(e))?(previewStatus.phase==='preparing'?'Cancel preparation':'Stop preview'):(e.kind==='rootFollow'?'Preview in Root Follow (native manager)':'Preview '+__XenMetaLabels[e.kind])),disabled:!audition.available(e),onPointerDown:ev=>ev.stopPropagation(),onClick:ev=>{ev.stopPropagation();void audition.toggle(e).catch(error=>setNotice('Preview: '+error.message))},children:(previewState===__xenGridKey(e))?'■':'▶'})]},__xenGridKey(e))};
  // ONE native Edit route for both GRID & LOOPS and ONE SHOTS.
  // Source.kind is a library locator. A Fill always remains a one-shot playback role.
  const editSource=async source=>{
   if(!source)return;
   if(source.kind==='drum'||source.kind==='bass'){
    const current=__xenMetaLibraryEntries(source.kind).find(row=>row.id===source.id);
    if(!current){setNotice('Edit: original source no longer exists. Nothing changed.');return;}
    window.dispatchEvent(new CustomEvent(source.kind==='drum'?'xensonar:meta-drum-edit-focus':'xensonar:meta-bass-edit-focus',{detail:{entryId:current.id}}));
    setColorEdit(null);setFillEdit(null);return;
   }
   if(source.kind!=='material'&&source.kind!=='rootFollow'){
    setNotice('Edit: no existing native editor for this source. Nothing changed.');return;
   }
   const target={sessionKind:source.kind,entryId:source.id};
   setNotice('Checking saved source for editing …');
   __XenMetaEditE3.cancel();__XenMetaEditE3b.cancel();__XenMetaForgeIntake.cancel();
   let route;try{route=await __XenMetaEditResolver.inspectSource(target)}catch{route=null;}
   let result;
   if(!route||route.status!=='ready')result={status:route?.status||'unavailable',reason:route?.reason||'Source could not be inspected. Nothing changed.'};
   else if(route.editor==='spectral-forge'||route.editor==='audio-import')result=await __XenMetaForgeIntake.openSource(target);
   else if(route.sourceKind==='melodic-project')result=await __XenMetaEditE3.openSource(target);
   else if(route.sourceKind==='synthetic-pattern'&&route.editor==='melodic-loop')result=await __XenMetaEditE3b.openSource(target);
   else result={status:'unsupported',reason:'This representation needs its native edit adapter. Nothing changed.'};
   if(result.status==='superseded')return;
   if(result.status==='dispatched'){setColorEdit(null);setFillEdit(null);return;}
   setNotice(result.reason||'This source cannot be opened for editing. Nothing changed.');
  };
  // The exact same Meta color-picker controls serve both resource roles.
  const metaColorControls=(colors,write,reset,disabled=false)=>u.jsxs(P.Fragment,{children:[
   u.jsxs('div',{className:'xen-meta-color-controls',children:[
    u.jsxs('label',{children:[u.jsx('span',{children:'Frame'}),u.jsx('input',{type:'color','aria-label':'Frame color',disabled:disabled,value:colors.border??'#42617c',onChange:e=>write('border',e.target.value)})]}),
    u.jsxs('label',{children:[u.jsx('span',{children:'Background'}),u.jsx('input',{type:'color','aria-label':'Background color',disabled:disabled,value:colors.background??'#1b3042',onChange:e=>write('background',e.target.value)})]})
   ]}),
   u.jsx('div',{className:'xen-meta-identity-actions',style:{display:'flex',flexWrap:'wrap',gap:8},children:u.jsx('button',{type:'button',className:'xen-meta-color-reset',disabled:disabled,onClick:reset,children:'Reset colors'})})
  ]});
 const removeFill=(role,index)=>{
  if(__XenOneShotAssignments.remove(state.loadedId,role,index)){
   setFillEdit(null);setNotice('Fill reference removed from Session · Undo available.');
  }else setNotice('Fill reference could not be removed; Session unchanged.');
 };
 P.useEffect(()=>()=>__XenOneShotAudio.stopPreview(),[]);
 const previewFill=async entry=>{
  try{
   const result=await __XenOneShotAudio.preview(entry);
   setNotice(result?.message||'One-Shot Fill preview triggered.');
  }catch(error){setNotice('Fill preview unavailable: '+String(error?.message||error))}
 };
 const fillLane=(role,title,icon)=>u.jsxs('div',{
  className:'xen-fill-lane','data-xen-fill-column':role,
  children:[u.jsxs('header',{children:[u.jsx('strong',{children:icon+' '+title}),u.jsx('small',{children:sessionFillItems[role]?.length||0+' fills'})]}),
   u.jsx('div',{className:'xen-fill-lane-items',children:(sessionFillItems[role]||[]).map((entry,index)=>u.jsxs('div',{
    className:'xen-meta-tile xen-fill-slot'+(fillEdit?.role===role&&fillEdit?.id===entry.id?' is-color-selected':''),
    role:'button',tabIndex:0,'data-xen-meta-fill-slot':role,
    'aria-label':'Fill '+entry.name+' · Click to edit settings and colors · Right-click to remove · Undo available',
    title:entry.name+' · Click to edit settings and colors · Right-click to remove (Undo available)',
    style:{...(entry.fillFrame?{borderColor:entry.fillFrame}:{}),...(entry.fillPlate?{backgroundColor:entry.fillPlate}:{})},
    onClick:event=>{if(event.target.closest('button'))return;setFillEdit({role,index,id:entry.id,kind:entry.kind});setFillDraft({name:entry.name,volume:entry.volume??1,pan:entry.pan??0,pitch:entry.pitch??0,samplePlaybackLengthSec:entry.samplePlaybackLengthSec??null});setColorEdit(null);setGlobalColorsOpen(false)},
    onContextMenu:event=>{event.preventDefault();event.stopPropagation();removeFill(role,index)},
    onKeyDown:event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setFillEdit({role,index,id:entry.id,kind:entry.kind});setFillDraft({name:entry.name,volume:entry.volume??1,pan:entry.pan??0,pitch:entry.pitch??0,samplePlaybackLengthSec:entry.samplePlaybackLengthSec??null});setColorEdit(null);setGlobalColorsOpen(false)}else if(event.key==='Delete'){event.preventDefault();removeFill(role,index)}},
    children:[
     u.jsx('span',{className:'xen-meta-tile-index',children:index+1}),
     u.jsx('span',{className:'xen-meta-tile-name',title:entry.name,children:entry.name}),
     u.jsx('button',{type:'button',className:'xen-meta-tile-preview','aria-label':'Preview Fill '+entry.name,
      title:'Preview one-shot Fill',onPointerDown:event=>event.stopPropagation(),
      onClick:event=>{event.stopPropagation();void previewFill(entry)},children:'▶'})
    ]},entry.kind+'|'+entry.id))}),
   u.jsx('small',{className:'xen-fill-lane-hint',children:'Drag an existing library row here.'})
  ]});
 const oneShotsPanel=u.jsxs('div',{className:'xen-meta-one-shot-board',role:'group','aria-label':'One Shots · Instruments and Fills','data-xen-meta-one-shots':true,children:[
  u.jsxs('div',{className:'xen-fill-lane','data-xen-fill-column':'instruments','data-xen-instrument-session-id':instrumentView.sessionId||'',children:[
   u.jsxs('header',{children:[u.jsx('strong',{children:'🎹 INSTRUMENTS'}),u.jsx('small',{children:instrumentView.sessionName?'Session: '+instrumentView.sessionName:'Select a saved Session'})]}),
   u.jsx('div',{className:'xen-fill-lane-items',children:[['Particles','particle'],['Wave Starter','wave'],['Keyboard','keyboard']].map(([name,id])=>{
     const stored=instrumentView[id]?.id||'',applied=__XenSessionInstrumentView.draftPresetId(state,id)||stored,
      draft=instrumentDraft[id]??applied;
    return u.jsxs('div',{className:'xen-fill-instrument xen-fill-instrument-editor','data-xen-instrument-role':id,
     onContextMenu:event=>openInstrumentSettings(event,id),
     title:'Right-click to edit saved Session instrument settings',children:[
     u.jsxs('div',{className:'xen-p36-instrument-head',children:[
      u.jsx('span',{className:'xen-fill-instrument-role',children:name}),
      u.jsx('button',{type:'button',className:'xen-p36-transfer-arrow','aria-label':'Apply current '+name+' selection to Melodic Fills',title:'Transfer the currently selected sound to Fills · no Apply or Save required',
       disabled:!draft||!instrumentView.sessionId||instrumentTransferBusy!==null,
       onClick:()=>void transferInstrument(id,draft),children:instrumentTransferBusy===id?'…':u.jsx('svg',{'aria-hidden':true,viewBox:'0 0 24 24',width:19,height:19,fill:'none',stroke:'currentColor',strokeWidth:2.7,strokeLinecap:'round',strokeLinejoin:'round',children:u.jsx('path',{d:'M5 20 V13 Q5 9 10 9 H20 M15 4 L20 9 L15 14'})})})]}),
     u.jsx('strong',{className:'xen-fill-instrument-current',title:instrumentView[id]?.name||'—',children:instrumentView[id]?.name||'—'}),
     u.jsx(__XenPresetPopover,{label:name+' Session sound',groups:__XenSessionInstrumentView.groups(id),value:draft,disabled:!instrumentView.sessionId,theme:'meta',onChange:value=>{instrumentSelectionRef.current[id]=value;setInstrumentDraft(old=>({...old,[id]:value}))}}),
     u.jsxs('div',{className:'xen-fill-instrument-actions',children:[
       u.jsx('button',{type:'button','aria-label':'Preview '+name+' sound',disabled:!draft||!instrumentView.sessionId||instrumentPreview===id,onClick:()=>void previewInstrument(id,draft),children:instrumentPreview===id?'…':'▶ Preview'}),
       u.jsx('button',{type:'button','aria-label':'Apply '+name+' to Session draft',title:'Apply as pitch-variable instrument here · permanent Save is above beside Engage',disabled:!instrumentView.sessionId||!draft||draft===applied,onClick:()=>applyInstrument(id,draft),children:'Apply'})
     ]})
    ]},id)
   })}),
   u.jsx('small',{className:'xen-fill-lane-hint',children:'Apply here · ↳ Fills · Save ↑' })
  ]}),
  instrumentSettings&&ao.createPortal(u.jsxs('section',{ref:settingsRef,
   className:'xen-session-instrument-settings',role:'dialog','aria-label':'Saved instrument settings '+instrumentSettings.role,
   'data-xen-session-instrument-popup':instrumentSettings.role,
   style:{top:Math.max(8,instrumentSettings.top),left:Math.max(8,instrumentSettings.left)},
   onContextMenu:e=>e.preventDefault(),children:[
    u.jsxs('header',{children:[u.jsx('strong',{children:'Session · '+instrumentSettings.role}),
      u.jsx('button',{type:'button','aria-label':'Cancel instrument settings',onClick:()=>setInstrumentSettings(null),children:'×'})]}),
    instrumentSettings.saved.hasVolume&&u.jsxs('label',{children:[
      u.jsx('span',{children:'Volume · '+Number(instrumentSettings.draft.volume).toFixed(2)}),
      u.jsx('input',{type:'range',min:0,max:1,step:.005,value:instrumentSettings.draft.volume,
       'aria-label':'Instrument Volume',onChange:e=>setInstrumentSettings(old=>({...old,draft:{...old.draft,volume:Number(e.target.value)}}))})]}),
    u.jsxs('label',{children:[u.jsx('span',{children:'Pan · '+Number(instrumentSettings.draft.pan).toFixed(2)}),
     u.jsx('input',{type:'range',min:-1,max:1,step:.01,value:instrumentSettings.draft.pan,
      'aria-label':'Instrument Pan',onChange:e=>setInstrumentSettings(old=>({...old,draft:{...old.draft,pan:Number(e.target.value)}}))})]}),
    u.jsxs('label',{children:[u.jsx('span',{children:'Pitch · '+instrumentSettings.draft.octave+' octaves'}),
     u.jsx('input',{type:'range',min:-3,max:3,step:1,value:instrumentSettings.draft.octave,
      'aria-label':'Instrument Octave Pitch',onChange:e=>setInstrumentSettings(old=>({...old,draft:{...old.draft,octave:Number(e.target.value)}}))})]}),
    instrumentSettings.saved.lengthSupported&&u.jsxs('div',{className:'xen-p36-length-setting',children:[
     u.jsxs('label',{children:[u.jsx('input',{type:'checkbox','aria-label':'Full sample',checked:instrumentSettings.draft.lengthSec===null,onChange:e=>setInstrumentSettings(old=>({...old,draft:{...old.draft,lengthSec:e.target.checked?null:Math.min(5,old.saved.lengthSec??5)}}))}),u.jsx('span',{children:'Full sample'})]}),
     u.jsxs('label',{children:[u.jsx('span',{children:'Playback Length (seconds)'}),u.jsx('input',{type:'number',min:.05,max:600,step:.05,'aria-label':'Instrument Playback Length',disabled:instrumentSettings.draft.lengthSec===null,value:instrumentSettings.draft.lengthSec??5,onChange:e=>setInstrumentSettings(old=>({...old,draft:{...old.draft,lengthSec:Number(e.target.value)}}))})]}),
     u.jsx('small',{children:'A shorter playback cap; source audio is unchanged. Native player clamps to the actual file end.'})]}),
    !instrumentSettings.saved.hasVolume&&u.jsx('small',{children:'Keyboard has no independent native Volume owner.'}),
    u.jsx('small',{children:'Settings take effect on Session Engage. Preview is the native sound preview and does not demonstrate this offline mix.'}),
    u.jsxs('footer',{children:[
     u.jsx('button',{type:'button',onClick:()=>setInstrumentSettings(null),children:'Cancel'}),
     u.jsx('button',{type:'button','aria-label':'Save instrument settings',onClick:commitInstrumentSettings,children:'Save settings'})]})
   ]}),document.body),
  fillLane('melodic','MELODIC FILLS','🎵'),fillLane('drum','DRUM FILLS','🥁')
 ]});
 const engageTicket=P.useRef(0),engageCurrent=P.useRef(null);
 const engageIdentity=(value,before)=>JSON.stringify([value.loadedId,value.name,value.dirty,value.items.filter(e=>!__XenStarterMaterial.requested(e)||before.items.some(old=>__xenGridKey(old)===__xenGridKey(e))),Object.entries(value.colors).filter(([key])=>Object.hasOwn(before.colors,key)||!__XenStarterDemoIds.some(id=>key==='material\0'+id||key==='rootFollow\0'+id)),value.roomSettings]);
 engageCurrent.current=state;
 P.useEffect(()=>()=>{engageTicket.current++},[]);
 const engage=async()=>{const ticket=++engageTicket.current,identity=engageIdentity(state,state);
  try{if(state.loadedId===__XenStarterPrimaryId||state.items.some(__XenStarterMaterial.requested))await __XenStarterMaterial.ensure(state.items.find(__XenStarterMaterial.requested)??'material');
   if(ticket!==engageTicket.current||engageIdentity(engageCurrent.current,state)!==identity)return;
   if(__XenMetaSessions.use()){setNotice('Session engaged in Live Quick Access.');onClose({engaged:true})}
  }catch(error){if(ticket===engageTicket.current)setNotice('Session preparation: '+error.message)}
 };
 const actions=(name,fn,disabled=false)=>u.jsx('button',{type:'button',disabled,onClick:fn,children:name});
 const kindColorButtons=(channel,hex)=>u.jsx('div',{className:'xen-meta-kind-buttons',role:'group','aria-label':'Apply '+(channel==='border'?'frame':'background')+' color by session column',children:__XenSongKinds.map(k=>{
  const label={grid:'Grids',material:'Material Tracks',rootFollow:'Root Follow Loops',drum:'Drums',bass:'Basslines'}[k],count=state.items.filter(e=>e.kind===k).length;
  const action='Apply '+(channel==='border'?'frame':'background')+' color to all '+label+' entries in this session';
  return u.jsx('button',{type:'button',className:'xen-meta-kind-apply',
   'data-xen-meta-color-kind':k,'data-xen-meta-color-channel':channel,
   'aria-label':action,title:action,disabled:count===0,
   onClick:()=>{if(__XenMetaSessions.setGlobalColor(channel,hex,k))setNotice((channel==='border'?'Frame':'Background')+' color applied to '+count+' '+label+' entries in this session · Undo is available.')},
   children:__XenQuick.icons[k]},k)
 })});

 return u.jsx('div',{className:'xen-meta-overlay'+(nativeOpen?' is-native-behind':''),'data-xen-header-menu':'meta',onClick:onClose,onKeyDown:e=>{e.stopPropagation();if(e.target.closest?.('[data-xen-preset-overlay]'))return;if(e.key==='Escape')onClose();else if(['ArrowLeft','ArrowRight'].includes(e.key)&&!e.repeat&&!e.target.closest('input,select,textarea,[contenteditable="true"],[role="tablist"]')){e.preventDefault();__XenQuick.cycle(e.key==='ArrowRight'?1:-1)}},children:u.jsxs('section',{className:'xen-meta-editor',role:'dialog','aria-modal':true,'aria-label':'Meta-Menu Session Editor',tabIndex:-1,ref,onClick:e=>e.stopPropagation(),children:[
  u.jsxs('header',{className:'xen-meta-titlebar',children:[u.jsx('strong',{children:'🎧 Meta-Menu'}),u.jsx('span',{className:'xen-meta-caption',children:'Sessions organize existing musical materials'}),starterPreload.phase==='preparing'&&u.jsx('small',{role:'status',children:'Preparing demo materials…'}),starterPreload.phase==='failed'&&u.jsx('button',{type:'button',title:starterPreload.error,onClick:()=>{void __xenMetaPrimeStarterMaterials().catch(error=>console.warn('[meta-menu][starter-preload]',error))},children:'Retry demo preparation'}),actions('×',onClose)]}),
  u.jsxs('div',{className:'xen-meta-toolbar',children:[u.jsx('span',{className:'xen-meta-small-label',children:'SESSION'}),u.jsx('input',{type:'text',value:state.name,maxLength:100,'aria-label':'Session name',onChange:e=>__XenMetaSessions.setName(e.target.value)}),u.jsx(__XenSessionPicker,{saved:state.saved,value:state.loadedId??'',label:'Saved sessions',onSelect:id=>{if(state.dirty&&!window.confirm('Discard unsaved changes and load the selected session?'))return;loadArchivedDraft(id)}}),u.jsx('span',{className:'xen-meta-dirty',children:state.dirty?'● Draft':'● Saved'}),actions('Save as New',()=>__XenMetaSessions.saveAsNew()),actions('Save',()=>__XenMetaSessions.save()),actions(u.jsxs(P.Fragment,{children:['Engage! ',u.jsx('span',{className:'xen-meta-action-arrow','aria-hidden':'true',children:'➜'})]}),()=>{void engage()}),u.jsx('span',{className:'xen-meta-live',children:'Save stores the draft · Engage applies it to Live and closes · × closes (draft kept).'})]}),
  u.jsxs('div',{className:'xen-meta-workspace',children:[
   u.jsxs('section',{className:'xen-meta-library',children:[u.jsxs('div',{className:'xen-meta-head',children:[u.jsx('strong',{children:'Libraries'}),u.jsx('small',{children:'SOURCE / 01–05'})]}),u.jsxs('div',{className:'xen-meta-tab-assembly','data-xen-meta-tab-mode':kind==='sessions'?'sessions':'libraries',children:[u.jsxs('button',{type:'button',className:'xen-meta-session-backtab','aria-controls':'xen-meta-sessions-panel','aria-pressed':kind==='sessions','aria-label':'🎧 Sessions manager',onClick:()=>{setKind('sessions');setSearch('');setColorEdit(null);setLibraryRename(null);setLibraryAnchor(null)},children:u.jsx('span',{className:'xen-meta-session-backtab-label',children:'🎧 Sessions'})}),u.jsx('div',{role:'tablist','aria-label':'Materialbibliotheken',className:'xen-meta-tabs',children:__XenSongKinds.map(k=>u.jsxs('button',{type:'button',role:'tab','aria-selected':kind===k,'aria-controls':'xen-meta-library-list',onClick:()=>{setKind(k);setSearch('');setLibraryRename(null);setLibraryAnchor(null);setColorEdit(prev=>prev?.__xenLibrarySource?null:prev)},onKeyDown:event=>{const idx=__XenSongKinds.indexOf(k);let next=null;if(event.key==='ArrowRight'||event.key==='ArrowDown')next=__XenSongKinds[(idx+1)%5];else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=__XenSongKinds[(idx+4)%5];else if(event.key==='Home')next=__XenSongKinds[0];else if(event.key==='End')next=__XenSongKinds[4];if(!next)return;event.preventDefault();event.stopPropagation();setKind(next);setSearch('');setLibraryRename(null);setLibraryAnchor(null);setColorEdit(prev=>prev?.__xenLibrarySource?null:prev);requestAnimationFrame(()=>document.querySelector('.xen-meta-tabs [role="tab"][aria-selected="true"]')?.focus({preventScroll:true}))},children:[u.jsx('span',{children:__XenQuick.icons[k]}),u.jsx('span',{children:{grid:'Thread',material:'Material',rootFollow:'RFL',drum:'Drums',bass:'Bass'}[k]})]},k))})]}),(kind==='sessions'?u.jsxs('div',{id:'xen-meta-sessions-panel','data-xen-meta-session-manager':true,className:'xen-meta-browser xen-meta-session-manager',children:[
   u.jsxs('div',{className:'xen-meta-browser-heading',children:[u.jsx('strong',{children:'🎧 Saved Sessions'}),
    __XenMetaSessions.safetyReport().recoverableCount>0&&u.jsx('button',{type:'button',title:'Restore saved session rows from the last deletion checkpoint; never replaces current saved sessions',style:{marginLeft:'auto',border:'1px solid #876eae',background:'#241a37',color:'#ede2ff',borderRadius:5,padding:'5px 9px',fontSize:11},onClick:()=>{if(!window.confirm('Restore missing saved sessions from the last deletion checkpoint? Current sessions and editor work will be kept.'))return;const ok=__XenMetaSessions.restoreLastDeleted();setNotice(ok?'Missing saved sessions restored.':__XenMetaSessions.snapshot().error)},children:'↶ Restore deleted'}),
    u.jsx('button',{type:'button',title:'Download a SHA-256 verified copy of the original V2 session archive; does not change stored sessions',style:{marginLeft:'auto',border:'1px solid #477d85',background:'#102e39',color:'#bcebf1',borderRadius:5,padding:'5px 9px',fontSize:11},onClick:async()=>{try{const info=await __xenGetDeferredFn('__xenM10BackupFactory')(localStorage,__XenMetaSessions).download();setNotice('Archive backup saved: '+info.count+' sessions · SHA-256 verified.')}catch(error){setNotice('Archive backup: '+String(error?.message||error))}} ,children:'⇩ Archive backup'}),
    u.jsx('button',{type:'button',title:'Read-only comparison: original V2 sessions and every M9 archive record',style:{border:'1px solid #477d85',background:'#102e39',color:'#bcebf1',borderRadius:5,padding:'5px 9px',fontSize:11},onClick:async()=>{try{const result=await __xenGetDeferredFn('__xenM10BackupFactory')(localStorage,__XenMetaSessions).audit(__xenM9StartArchive());setNotice(result.ready?'Archive mirror verified · '+result.count+' sessions':'Archive not ready · '+result.reason)}catch(error){setNotice('Archive audit: '+String(error?.message||error))}},children:'✓ Check mirror'}),
    u.jsx('button',{type:'button',title:'M13: On a future launch, read a small live snapshot instead of parsing the V2 session archive. The original archive stays authoritative and will be read on first session operation.',style:{border:'1px solid #477d85',background:'#102e39',color:'#bcebf1',borderRadius:5,padding:'5px 9px',fontSize:11},onClick:()=>{const enabled=__XenMetaSessions.fastBootEnabled();if(!enabled&&!window.confirm('Enable Fast Boot for the next launch?\n\nThe full V2 session archive remains untouched. Historical sessions will be loaded on first access. Older XenSonar versions can still modify V2; M13 will read their latest changes on the first session operation.\n\nFor recovery, keep an Archive backup.'))return;const ok=enabled?__XenMetaSessions.disableFastBoot():__XenMetaSessions.enableFastBoot();setNotice(ok?(enabled?'Fast Boot disabled for next launch.':'Fast Boot enabled for next launch · use Archive backup for recovery.'):(__XenMetaSessions.snapshot().error||'Fast Boot setting failed.'))},children:__XenMetaSessions.fastBootEnabled()?'✓ Fast Boot':'○ Fast Boot'}),
    u.jsx('button',{type:'button',title:'Download a read-only inventory of direct session references. This is NOT an audio backup.',style:{border:'1px solid #477d85',background:'#102e39',color:'#bcebf1',borderRadius:5,padding:'5px 9px',fontSize:11},onClick:async()=>{try{const result=await __xenGetDeferredFn('__xenM12InventoryFactory')(localStorage).download();setNotice('Resource map saved · '+result.sessions+' sessions · '+result.refs+' unique references · '+result.opaque+' opaque dependency groups. This is NOT an audio backup.')}catch(error){setNotice('Resource inventory: '+String(error?.message||error))}},children:'⇩ Resource map'}),
    u.jsx('input',{type:'search','aria-label':'Search saved sessions',placeholder:'Search…',value:sessionSearch,onChange:e=>{setSessionSearch(e.target.value);setSessionVisible(64);if(sessionListRef.current)sessionListRef.current.scrollTop=0}}),u.jsx('span',{children:sessionCatalog.total===state.saved.length?state.saved.length+' Sessions':sessionCatalog.total+' / '+state.saved.length})]}),
   u.jsxs('div',{className:'xen-meta-session-list',ref:sessionListRef,children:[sessionCatalog.total?sessionCatalog.entries.map(saved=>u.jsxs('div',{className:'xen-meta-session-row'+(saved.id===state.loadedId?' is-active':''),'data-xen-quick-kind':'session','data-xen-quick-id':saved.id,'data-xen-quick-name':saved.name,'data-xen-meta-session-id':saved.id,children:[
     u.jsxs('div',{className:'xen-meta-session-details',children:[u.jsx('strong',{title:saved.name,children:saved.name}),u.jsx('small',{children:saved.items.length+' materials'+(saved.roomSettings?' · Live Room Settings':'')})]}),
     u.jsx('button',{type:'button','aria-label':'Load session: '+saved.name,onClick:()=>{if(state.dirty&&!window.confirm('Discard unsaved changes and load '+saved.name+'?'))return;loadArchivedDraft(saved.id)},children:sessionLoading===saved.id?'Loading…':'Load'}),
     u.jsx('button',{type:'button','aria-label':'Delete session: '+saved.name,title:'Delete saved session',onClick:()=>{if(window.confirm('Delete session “'+saved.name+'”?'))__XenMetaSessions.deleteSaved(saved.id)},children:'×'})
   ]},saved.id)):u.jsx('p',{className:'xen-meta-empty-library',children:state.saved.length?'No matching sessions.':'No saved sessions yet. Choose materials from the library tabs, arrange them on the right, then Save.'}),
    sessionCatalog.entries.length<sessionCatalog.total&&u.jsx('button',{ref:sessionMoreRef,type:'button','aria-label':'Show more sessions',className:'xen-meta-session-more',style:{alignSelf:'stretch',padding:'9px',background:'#17344a',border:'1px solid #48708a',color:'#c8ebfa',cursor:'pointer'},onClick:()=>setSessionVisible(value=>Math.min(sessionCatalog.total,value+64)),children:'Show more · '+sessionCatalog.entries.length+' / '+sessionCatalog.total})]})
  ]}):u.jsxs('div',{className:'xen-meta-browser',children:[u.jsxs('div',{className:'xen-meta-browser-heading',children:[u.jsx('button',{type:'button',className:'xen-meta-library-open-manager','aria-label':'Open original '+__XenMetaLabels[kind]+' manager','aria-haspopup':'dialog',title:'Open original '+__XenMetaLabels[kind]+' manager',onClick:()=>{if(!__xenOpenOriginalLibrary(kind))setNotice('Original '+__XenMetaLabels[kind]+' manager is unavailable in this room.')},children:__XenQuick.icons[kind]+' '+__XenMetaLabels[kind]}),u.jsx('input',{type:'search','aria-label':'Search library',placeholder:'Filter…',value:search,onChange:e=>setSearch(e.target.value)}),u.jsx('span',{children:entries.length+' entries'}),
    u.jsx('button',{type:'button','data-xen-meta-library-trash':kind,
     'aria-label':'Library trash · drag an entry here','title':'Drag a library entry here to remove it from the library and its Sessions',
     onClick:()=>setNotice('Drag a library item onto the trash to review its removal.'),
     children:u.jsx('svg',{viewBox:'0 0 24 24','aria-hidden':'true',focusable:'false',children:[
      u.jsx('path',{d:'M4 7h16M9 7V4h6v3M6.5 7l.8 13h9.4l.8-13'}),
      u.jsx('path',{d:'M10 10v7M14 10v7'})]})})]}),u.jsx('div',{id:'xen-meta-library-list',role:'tabpanel',className:'xen-meta-library-list',onScroll:()=>{if(colorEdit?.__xenLibrarySource)setColorEdit(null)},children:entries.length?entries.map(row):u.jsx('p',{className:'xen-meta-empty-library',children:'No entries. New musical materials are created in their original library.'})})]}))]}),
   u.jsxs('section',{className:'xen-meta-constellation',children:[u.jsxs('div',{className:'xen-meta-head',children:[u.jsx('strong',{children:'Session: '+sessionHeading}),u.jsxs('div',{className:'xen-meta-heading-tools',children:[
      u.jsxs('div',{className:'xen-meta-view-stack',children:[
        u.jsx('button',{type:'button',className:'xen-meta-global-trigger','aria-label':'Session colors','aria-expanded':globalColorsOpen,'aria-controls':'xen-meta-global-color-editor',title:'Set frame or background color for all entries in this session',disabled:!state.items.length,onClick:()=>{setColorEdit(null);setGlobalColorsOpen(open=>!open)},children:'🎨 Session Colors'}),
        u.jsxs('div',{className:'xen-meta-display-controls',role:'group','aria-label':'Quick Rack appearance',children:[
          u.jsx('span',{className:'xen-meta-display-caption',children:'View:'}),
          ...['symbol','title'].map(mode=>u.jsx('button',{type:'button',className:quickDisplayMode===mode?'is-active':'','aria-pressed':quickDisplayMode===mode,onClick:()=>__XenQuickDisplay.set(mode),children:mode==='symbol'?'Symbols':'Titles'},mode))
        ]})
      ]}),
      u.jsx('small',{children:state.items.length+' entries'})
    ]})]}),
    globalColorsOpen&&u.jsxs('section',{id:'xen-meta-global-color-editor',className:'xen-meta-color-editor xen-meta-global-color-editor',role:'group','aria-label':'Session colors',children:[
      u.jsxs('header',{children:[u.jsx('strong',{children:'Session Colors'}),u.jsx('button',{type:'button','aria-label':'Close session colors',onClick:()=>setGlobalColorsOpen(false),children:'×'})]}),
      u.jsxs('div',{className:'xen-meta-global-columns',children:[
        u.jsxs('div',{className:'xen-meta-global-channel',children:[
          u.jsxs('label',{children:[u.jsx('span',{children:'Frame'}),u.jsx('input',{type:'color','aria-label':'Frame color',value:globalBorder,onChange:ev=>setGlobalBorder(ev.target.value)})]}),
          u.jsx('button',{type:'button',className:'xen-meta-color-reset xen-meta-global-apply','aria-label':'Apply frame color to all session entries',disabled:!state.items.length,onClick:()=>{if(__XenMetaSessions.setGlobalColor('border',globalBorder))setNotice('Frame color applied to '+state.items.length+' entries in this session · Undo is available.')},children:'Apply to All'}),
          kindColorButtons('border',globalBorder)
        ]}),
        u.jsxs('div',{className:'xen-meta-global-channel',children:[
          u.jsxs('label',{children:[u.jsx('span',{children:'Background'}),u.jsx('input',{type:'color','aria-label':'Background color',value:globalBackground,onChange:ev=>setGlobalBackground(ev.target.value)})]}),
          u.jsx('button',{type:'button',className:'xen-meta-color-reset xen-meta-global-apply','aria-label':'Apply background color to all session entries',disabled:!state.items.length,onClick:()=>{if(__XenMetaSessions.setGlobalColor('background',globalBackground))setNotice('Background color applied to '+state.items.length+' entries in this session · Undo is available.')},children:'Apply to All'}),
          kindColorButtons('background',globalBackground)
        ]})
      ]}),
      u.jsx('small',{children:'Changes only this Session draft · original libraries and Live stay unchanged until Save / Engage.'})
    ]}),
    u.jsxs('div',{className:'xen-fill-tabbar',role:'tablist','aria-label':'Session performance mode',children:[
      u.jsx('button',{type:'button',role:'tab','aria-selected':performanceTab==='oneshots','aria-controls':'xen-fill-tab-panel',className:performanceTab==='oneshots'?'is-active':'',onDragOver:evt=>{if(evt.dataTransfer.types.includes('application/xensonar-fill-ref')){evt.preventDefault();setPerformanceTab('oneshots')}},onClick:()=>{setPerformanceTab('oneshots');setColorEdit(null);setGlobalColorsOpen(false)},children:'ONE SHOTS & FILLS'}),
      u.jsx('button',{type:'button',role:'tab','aria-selected':performanceTab==='loops','aria-controls':'xen-loop-tab-panel',className:performanceTab==='loops'?'is-active':'',onClick:()=>{setPerformanceTab('loops');setFillEdit(null)},children:'GRID & LOOPS'})
    ]}),
     performanceTab==='oneshots'&&fillSelected&&u.jsxs('section',{className:'xen-meta-color-editor xen-fill-color-editor',role:'group',
      'aria-label':'Colors for One-Shot Fill '+fillSelected.name,children:[
       u.jsxs('header',{children:[u.jsx('strong',{title:fillSelected.name,children:fillSelected.name}),
        u.jsx('button',{type:'button','aria-label':'Close color editor',onClick:()=>setFillEdit(null),children:'×'})]}),
       fillSelected.kind!=='instrumentSample'&&u.jsx('button',{type:'button',className:'xen-grid-period-open',
        'aria-label':'Edit Fill source '+fillSelected.name,
        title:'Open the original resource in its existing native editor; the One-Shot assignment remains unchanged.',
        onClick:()=>void editSource(fillSelected),children:'Edit'}),
       // P36-06A: Fill audio parameters remain in the native Live editor, not duplicated in Meta.
       metaColorControls({border:fillSelected.fillFrame,background:fillSelected.fillPlate},
        (channel,value)=>__XenOneShotAssignments.setColor(state.loadedId,fillEdit.role,fillEdit.index,channel,value),
        ()=>__XenOneShotAssignments.resetColor(state.loadedId,fillEdit.role,fillEdit.index)),
       u.jsx('small',{children:'Colors and original-source editing are available here. Adjust the audio mix while listening in the Live Room; use the main Session Save for the Session.'})
      ]}),
    performanceTab==='oneshots'&&u.jsx('div',{id:'xen-fill-tab-panel',className:'xen-fill-tab-panel',role:'tabpanel',children:oneShotsPanel}),
    performanceTab==='loops'&&u.jsx(P.Fragment,{children:[
    u.jsx('div',{className:'xen-meta-helper',children:'Library → Session · MAT ↔ RFL (compatible only) · Shift = swap · Session → Live Rack'}),u.jsx('div',{className:'xen-meta-board',role:'group','aria-label':'Session · Drop items here',children:__XenSongKinds.map(k=>u.jsxs('div',{className:'xen-meta-lane','data-xen-meta-column':k,children:[u.jsxs('header',{children:[u.jsx('strong',{children:__XenQuick.icons[k]+' '+{grid:'GRID',material:'MAT',rootFollow:'RFL',drum:'DRM',bass:'BASS'}[k]}),u.jsx('small',{children:state.items.filter(e=>e.kind===k).length+' entries'}),u.jsx('button',{type:'button',className:'xen-meta-source-menu','aria-label':'Open original '+__XenMetaLabels[k]+' manager',title:'Open original '+__XenMetaLabels[k]+' manager','aria-haspopup':'dialog',onClick:e=>{e.stopPropagation();if(!__xenOpenOriginalLibrary(k))setNotice('Original '+__XenMetaLabels[k]+' manager is unavailable in this room.')},children:u.jsx('svg',{viewBox:'0 0 32 32',width:32,height:32,'aria-hidden':'true',focusable:'false',children:u.jsx('path',{d:'M2 2 H30 V30 Z'})})})]}),u.jsx('div',{className:'xen-meta-lane-items',children:state.items.filter(e=>e.kind===k).map((e,i)=>tile(e,i))})]},k))}),u.jsx('div',{className:'xen-meta-board-foot',children:'Click a tile to edit its colors · right-click to remove · drop anywhere on the board'}),
    ]}),
    colorEdit&&(__xenMetaLibrarySource||state.items.some(e=>__xenGridKey(e)===__xenGridKey(colorEdit)))&&u.jsxs('section',{className:'xen-meta-color-editor',role:'group',style:__xenMetaLibrarySource?{position:'fixed',left:libraryAnchor?.left??12,top:libraryAnchor?.top??12,right:'auto',zIndex:35}:undefined,'data-xen-meta-source-editor':__xenMetaLibrarySource?'library':'session','aria-label':'Colors for '+__xenMetaNameFor(selectedTile||colorEdit),children:[
      u.jsxs('header',{children:[u.jsx('strong',{title:__xenMetaNameFor(selectedTile||colorEdit),children:__xenMetaNameFor(selectedTile||colorEdit)}),u.jsx('button',{type:'button',onClick:()=>{__xenMetaNameCancel();setRenameDraft(null);setColorEdit(null)},'aria-label':'Close color editor',children:'×'})]}),
      !__xenMetaLibrarySource&&selectedTile?.kind==='grid'&&u.jsxs('div',{className:'xen-grid-profile-controls',children:[
       u.jsxs('label',{children:[u.jsx('span',{children:'Add Mode (Mute Pattern)'}),u.jsx('select',{'aria-label':'Grid Profile mode',value:__xenGridCompatibleMode(selectedTile.id,selectedTile.gridProfile?.modeId),onChange:ev=>__XenMetaSessions.patchGridProfile(selectedTile,{modeId:ev.target.value}),children:(typeof Ka==='function'?Ka(selectedTile.id):[]).map(m=>u.jsx('option',{value:m.value,children:m.label},m.value))})]}),
       u.jsx('div',{className:'xen-grid-mode-mutes',role:'group','aria-label':'Custom muted Grid degrees',children:(typeof Kp==='function'?Kp(selectedTile.id):[]).map((c,i)=>{const muted=selectedTile.gridProfile?.mainMutedDegrees||[];return u.jsx('button',{type:'button','aria-label':'Grid degree '+(i+1),'aria-pressed':!muted.includes(i),title:'Degree '+(i+1)+' · '+Number(c).toFixed(1)+'¢',className:muted.includes(i)?'is-muted':'',onClick:()=>__XenMetaSessions.patchGridProfile(selectedTile,{mainMutedDegrees:muted.includes(i)?muted.filter(n=>n!==i):[...muted,i]}),children:i+1},i)})}),
       u.jsxs('div',{className:'xen-grid-bass-actions',children:[u.jsxs('label',{children:[u.jsx('span',{children:'Add Bass Grid'}),u.jsx('input',{type:'checkbox','aria-label':'Add Bass Grid',checked:!!selectedTile.gridProfile?.bassEnabled,onChange:ev=>__XenMetaSessions.patchGridProfile(selectedTile,{bassEnabled:ev.target.checked})})]}),u.jsx('button',{type:'button','aria-label':'Edit Bass Grid for '+selectedTile.name,title:'Edit this Session tile’s Bass Grid',onClick:()=>setBassEdit(selectedTile.instanceId),children:'Edit Bass Grid'})]}),
       u.jsx('button',{type:'button',className:'xen-grid-clone',onClick:()=>{const next=__XenMetaSessions.cloneGrid(selectedTile);if(next)setColorEdit(next)},children:'Clone and deviate'}),
       u.jsx('button',{type:'button',className:'xen-grid-period-open',onClick:()=>setPeriodEdit(selectedTile.instanceId),title:'Optionally tune this variation using the original Period Workbench engine',children:'Edit Tuning · Period Workbench'}),
       u.jsx('hr',{}),u.jsx('strong',{children:'COLORS'})
      ]}),
      // P36-06A: no duplicate Mix/Nudge controls in the Meta tile editor.
       (__xenMetaLibrarySource||['drum','bass','material','rootFollow'].includes(selectedTile?.kind))&&u.jsx('button',{type:'button',className:'xen-grid-period-open',
        'aria-label':'Edit '+__XenMetaLabels[selectedTile.kind],
        title:'Open the saved source in its existing native editor.',
        onClick:()=>{if(__xenMetaLibrarySource&&selectedTile.kind==='grid'){if(!__xenOpenOriginalLibrary('grid'))setNotice('Original Grid manager is unavailable.')}else void editSource(selectedTile)},children:'Edit'}),
       metaColorControls(__xenMetaLibrarySource?{}:__XenMetaSessions.itemColor(colorEdit),
        (channel,value)=>{if(!__xenMetaLibrarySource)__XenMetaSessions.setItemColor(colorEdit,channel,value)},
        ()=>{if(!__xenMetaLibrarySource)__XenMetaSessions.resetItemColor(colorEdit)},__xenMetaLibrarySource),
      __xenMetaCanRename(selectedTile)&&u.jsxs('form',{className:'xen-meta-identity-rename',onSubmit:async ev=>{ev.preventDefault();if(renameBusy||!__xenMetaNameDirty||!__xenMetaNameValue.trim())return;
       const ok=await __xenMetaSaveName(selectedTile,__xenMetaNameValue);
       if(ok){__xenMetaNameCancel();setRenameDraft(null);
        if(!__xenMetaLibrarySource)setColorEdit({...selectedTile,name:__xenMetaNameValue});}},children:[
       __xenMetaNameDirty?u.jsx('button',{type:'submit',className:'xen-meta-name-status is-dirty',disabled:renameBusy||!__xenMetaNameValue.trim(),'aria-label':'Save '+__XenMetaLabels[selectedTile.kind]+' name',children:u.jsx('span',{className:'xen-meta-name-glyph',children:'SAVE'})}):u.jsx('span',{className:'xen-meta-name-status','aria-hidden':'true',children:u.jsxs('span',{className:'xen-meta-name-glyph',children:['NAME',u.jsx('span',{className:'xen-meta-name-colon',children:':'})]})}),
       u.jsx('input',{type:'text',maxLength:100,value:__xenMetaNameValue,'aria-label':'Original '+__XenMetaLabels[selectedTile.kind]+' name',disabled:renameBusy,onChange:ev=>__xenMetaNameEdit(ev.target.value),spellCheck:false})
      ]}),
      selectedTile?.kind==='grid'&&__xenMetaLibrarySource&&!__xenMetaCanRename(selectedTile)&&u.jsx('small',{children:'Built-in Grid: original identity is protected. Save a custom Grid in the native Grid Workbench to give it a new name.'}),
      selectedTile?.kind==='bass'&&!__xenMetaCanRename(selectedTile)&&u.jsx('small',{children:'Factory Bass preset: original name is fixed. Use Edit to create or save a named Bass clip.'}),
      !__xenMetaLibrarySource&&selectedTile?.kind==='material'&&u.jsxs('div',{className:'xen-meta-identity-actions',style:{display:'flex',flexWrap:'wrap',gap:8,marginTop:8},children:[
       u.jsx('button',{type:'button',disabled:false,title:__XenMetaSessions.activeSessionTakeIds().includes(selectedTile.id)?'Release this Session Take to the ordinary Material library without duplicating or deleting its audio.':'Remove only this session draft reference; keep the material in the library',onClick:()=>{if(__XenMetaSessions.activeSessionTakeIds().includes(selectedTile.id)){void __xenReleaseSessionTakeToLibrary(selectedTile).then(ok=>{if(ok){setColorEdit(null);setNotice('Take removed from this Session; original audio remains in Material library.')}else setNotice(__XenMetaSessions.snapshot().error||'Could not remove Take.');}).catch(error=>setNotice('Remove failed: '+error.message));return;}if(__XenMetaSessions.removeItem(selectedTile)){setColorEdit(null);setNotice('Removed from this Session draft; original audio preserved.')}else setNotice(__XenMetaSessions.snapshot().error||'Could not remove reference.')},children:'Remove from this Session'}),
       u.jsx('button',{type:'button',disabled:renameBusy,onClick:async()=>{try{const ok=await LI(selectedTile.id);if(ok){setColorEdit(null);setNotice('Original material deleted and references removed.')}else setNotice('Deletion cancelled.')}catch(error){setNotice('Delete: '+error.message)}},children:'Delete'})
      ]}),
      !__xenMetaLibrarySource&&selectedTile?.kind==='material'&&u.jsx('small',{children:__XenMetaSessions.activeSessionTakeIds().includes(selectedTile.id)?'SOURCE · Session Take · Delete permanently removes the original recording.':'SOURCE · Material Library · Name belongs to original source.'}),
      ['rootFollow','drum','bass','grid'].includes(selectedTile?.kind)&&u.jsx('small',{children:'SOURCE · Native '+__XenMetaLabels[selectedTile.kind]+' library · NAME changes the source identity, not the current Session draft.'}),
      u.jsx('small',{children:__xenMetaLibrarySource?'Library source · Session-only colors are unavailable.':'Colors belong to this session only; library entries are unchanged.'})
    ]})]})]}),
  periodEdit&&selectedTile?.kind==='grid'&&selectedTile.instanceId===periodEdit&&u.jsx(__XenSessionPeriodDialog,{entry:selectedTile,onClose:()=>setPeriodEdit(null),onConfirm:draft=>__XenMetaSessions.createTuningVariation(selectedTile,draft)}),
  bassEdit&&selectedTile?.kind==='grid'&&selectedTile.instanceId===bassEdit&&u.jsx(__XenSessionBassDialog,{entry:selectedTile,onClose:()=>setBassEdit(null),onConfirm:draft=>{__XenMetaSessions.patchGridProfile(selectedTile,{bassConfig:draft});setBassEdit(null)}}),
  u.jsxs('footer',{className:'xen-meta-footer',children:[actions(u.jsxs(P.Fragment,{children:[u.jsx('span',{className:'xen-meta-action-arrow','aria-hidden':'true',children:'➜'}),' Edit Current Live Session']}),()=>{const s=__XenMetaSessions.snapshot();const fresh=s.loadedId===null&&s.name==='Untitled Session'&&!Object.keys(s.colors).length&&!s.roomSettings&&JSON.stringify(s.items)===JSON.stringify(__XenQuick.getItems());if(s.dirty&&!fresh&&!window.confirm('Discard unsaved session edits and open the current Live Quick Access for editing?'))return;if(__XenMetaSessions.editCurrentLive()){setColorEdit(null);setNotice('Current Live Quick Access opened as an editable session draft.')}}),state.roomSettings&&actions('× Remove settings',()=>__XenMetaSessions.clearRoomSettings()),u.jsx('span',{role:'status',className:'xen-meta-footer-status',children:state.error||notice||(missing.length?missing.length+' missing library references are retained.':'Editing does not affect live audio.')}),state.loadedId&&actions('Delete session',()=>{if(window.confirm('Delete saved session?'))__XenMetaSessions.deleteSaved(state.loadedId)}),u.jsxs('div',{className:'xen-meta-history-controls',children:[actions('↶ Undo',()=>{__XenMetaSessions.undo();setColorEdit(null)},!state.canUndo),actions('Redo ↷',()=>{__XenMetaSessions.redo();setColorEdit(null)},!state.canRedo)]})]})
 ]})});
}
