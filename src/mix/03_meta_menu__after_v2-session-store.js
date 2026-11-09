const __XenMetaSessions=__createXenMetaSessionStore(localStorage,__XenQuick);
/* LD1 seam for owner's native Delete / Remove action. Invoke the guard BEFORE
   the library mutation; do not replace native deletion with a JSON-only prune.
   Future session fields register schema-aware reference codecs here. */
const __XenSessionLibraryDeleteGuard=Object.freeze({
 inspect:entry=>__XenMetaSessions.inspectLibraryReferences(entry),
 remove:(entry,performOwnerDelete,ask)=>__XenMetaSessions.deleteReferencedLibraryEntry(entry,performOwnerDelete,ask),
 registerReferenceCodec:(kind,codec)=>__XenMetaSessions.registerLibraryReferenceCodec(kind,codec)
});

/* LD2: Application-owned, accessible confirmation. The native browser confirm is
 * deliberately never invoked. The legacy string stays available to explicit
 * test/integration callbacks; the visible UI uses the structured impact report. */
let __xenLibraryDeleteDialogOpen=false;
function __xenConfirmLibraryDeletion(_legacyPrompt,entry,impact,options={}){
 if(__xenLibraryDeleteDialogOpen||typeof document==='undefined'||!document.body||typeof HTMLDialogElement==='undefined')return Promise.resolve(false);
 __xenLibraryDeleteDialogOpen=true;
 return new Promise(resolve=>{
  const trigger=document.activeElement;
  const dialog=document.createElement('dialog');dialog.className='xen-library-delete-dialog';
  dialog.setAttribute('aria-labelledby','xen-library-delete-title');
  dialog.setAttribute('aria-describedby','xen-library-delete-details');
  const header=document.createElement('header');header.className='xen-library-delete-heading';
  const eyebrow=document.createElement('span');eyebrow.textContent='LIBRARY · DELETE';
  const title=document.createElement('h2');title.id='xen-library-delete-title';title.textContent=String(entry?.name||entry?.id||'Bibliothekseintrag').slice(0,120);
  header.append(eyebrow,title);
  const body=document.createElement('div');body.className='xen-library-delete-body';body.id='xen-library-delete-details';
  const question=document.createElement('strong');question.textContent='Aus der Bibliothek und allen Sessions löschen?';
  const makeParagraph=(content,className='')=>{const p=document.createElement('p');p.textContent=content;if(className)p.className=className;body.append(p)};
  body.append(question);
  const places=[];
  if(impact?.savedProjectCount)places.push(impact.savedProjectCount+' gespeicherte'+(impact.savedProjectCount===1?'s Session-Projekt':' Session-Projekte'));
  if(impact?.draftReferenceCount||impact?.liveReferenceCount||impact?.workingReferenceCount)places.push('aktuelle Session');
  if(impact?.quickReferenceCount)places.push('Quick Access');
  makeParagraph(places.length?'Verwendet in: '+places.join(' · ')+'.':'Dieser Eintrag wird dauerhaft aus der Bibliothek entfernt.');
  makeParagraph('Zugehörige Session-Variationen werden ebenfalls entfernt. Andere, unabhängige Bibliothekseinträge bleiben erhalten.');
  if(options.trash&&entry.kind==='drum')makeParagraph('Drum-Patterns werden aus der sichtbaren Bibliothek ausgeblendet; Factory-Klangdaten werden nicht physisch gelöscht.');
  if(options.trash&&entry.kind==='rootFollow')makeParagraph('Root Follow wird aus der Bank entfernt; das zugrunde liegende Material bleibt erhalten.');
  makeParagraph('Diese Löschung kann nicht mit Session-Undo rückgängig gemacht werden.','xen-library-delete-warning');
  const remember=options.trash?document.createElement('input'):null;
  if(remember){
   remember.type='checkbox';remember.id='xen-meta-trash-remember';
   const label=document.createElement('label');label.className='xen-library-trash-remember';
   label.append(remember,document.createTextNode(" I know, don't ask me again"));body.append(label);
  }
  const actions=document.createElement('footer');actions.className='xen-library-delete-actions';
  const cancel=document.createElement('button');cancel.type='button';cancel.className='xen-library-delete-cancel';cancel.textContent='Abbrechen';
  const approve=document.createElement('button');approve.type='button';approve.className='xen-library-delete-approve';approve.textContent='Überall löschen';
  actions.append(cancel,approve);dialog.append(header,body,actions);
  let settled=false;
  const finish=answer=>{if(settled)return;settled=true;
   window.removeEventListener('keydown',intercept,true);
   dialog.close();dialog.remove();__xenLibraryDeleteDialogOpen=false;
   if(trigger?.isConnected&&typeof trigger.focus==='function')trigger.focus({preventScroll:true});
   resolve(answer);
  };
  const intercept=event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();finish(false);return;}
   // Keyboard, Drum and other global playing shortcuts must not leak through a modal.
   event.stopImmediatePropagation();};
  cancel.addEventListener('click',()=>finish(false));approve.addEventListener('click',()=>{
   if(remember?.checked)try{localStorage.setItem(__xenMetaTrashKey,'yes')}catch(error){console.warn('[meta trash] acknowledgement preference not saved:',error)}
   finish(true);
  });
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false)});
  try{document.body.append(dialog);dialog.showModal();window.addEventListener('keydown',intercept,true);cancel.focus({preventScroll:true});}
  catch(error){window.removeEventListener('keydown',intercept,true);dialog.remove();__xenLibraryDeleteDialogOpen=false;resolve(false);}
 });
}

// Shared owner boundary: cancelled means no asset, cache, UI or selection changes.
async function __xenDeleteLibraryEntry(entry,commit,ask){
 const result=await __XenSessionLibraryDeleteGuard.remove(entry,commit,ask);
 if(result.status==='deleted')return true;
 if(result.status==='cancelled')return false;
 throw Error(result.error||'Library deletion could not be completed.');
}

window.__XenM13BootStatus=()=>({fastBootEnabled:__XenMetaSessions.fastBootEnabled(),archiveDormant:__XenMetaSessions.isDormant(),loadedCount:__XenMetaSessions.snapshot().saved.length});
let __XenM9Archive=null;
const __xenM9StartArchive=()=>__XenM9Archive??(__XenM9Archive=__xenGetDeferredFn("__xenM9ArchiveFactory")(localStorage,__XenMetaSessions));
window.__XenM9ArchiveStatus=()=>__XenM9Archive?.status()??{active:false,complete:null};
/* M11: compile the draft hydrator only when a session is selected. */
let __XenM11Hydration=null;
const __xenM11StartHydration=()=>__XenM11Hydration??(__XenM11Hydration=__xenGetDeferredFn('__xenM11HydrationFactory')(localStorage,__XenMetaSessions,()=>__XenM9Archive));

/* Cold boot installs lightweight session metadata only. Explicit material/RFL
   demand later prepares three serial durable WAVs shared by both lanes. */
const __XenStarterQuickRepaired=(()=>{
 try{
  const old=__XenQuick.getItems(),reference=[...__xenStarterPresetRecords().primary.items,...__xenStarterPresetRecords().secondary.items];
  const active=__XenMetaSessions.snapshot().activePalette;
  if(active?.id&&!__xenStarterKnownRecord(active))return false;
  let changed=false;
  const next=old.map(item=>{
   const standard=reference.find(x=>x.kind==='grid'&&x.instanceId===item.instanceId&&x.id===item.id);
   if(!__xenStarterLegacyGridProfile(item,standard))return item;
   const p=item.gridProfile;
   changed=true;
   return {...item,gridProfile:{...p,modeId:standard.gridProfile.modeId,
     mainMutedDegrees:[...standard.gridProfile.mainMutedDegrees]}};
  });
  if(changed)__XenQuick.replaceItems(next);
  return changed;
 }catch(error){console.warn('[xensonar][starter-sessions] Quickrack profile upgrade failed:',error);return false}
})();
/* Restore the newer bass defaults without overwriting renamed/reordered user lanes. */
function __xenStarterLegacyBass(items){
 const old=[['preset:forge_fractured','RhythmForge · Fractured · Default'],
  ['preset:psy_classic','PsyBass · Classic Offbeat'],['preset:psy_rolling','PsyBass · Rolling']];
 const bass=Array.isArray(items)?items.filter(e=>e.kind==='bass'):[];
 return bass.length===old.length&&bass.every((e,i)=>e.id===old[i][0]&&e.name===old[i][1]);
}
const __XenStarterBassUpdated=(()=>{
 try{
  const repaired=__XenMetaSessions.isDormant()?false:__XenMetaSessions.repairStarterBass();
  if(__XenMetaSessions.snapshot().error)return false;
  const active=__XenMetaSessions.snapshot().activePalette,quick=__XenQuick.getItems();
  if((!active?.id||active.id===__XenStarterPrimaryId&&__xenStarterKnownRecord(active))&&__xenStarterLegacyBass(quick)){
   const fresh=__xenStarterPresetRecords().primary.items.filter(e=>e.kind==='bass');let index=0;
   __XenQuick.replaceItems(quick.map(e=>e.kind==='bass'?{...fresh[index++]}:e));
  }
  return repaired;
 }catch(error){console.warn('[xensonar][starter-bass] Migration skipped:',error);return false}
})();
const __XenStarterProfilesRepaired=(()=>{
 try{return __XenMetaSessions.isDormant()?false:__XenMetaSessions.repairStarterGridProfiles()}catch(error){
  console.warn('[xensonar][starter-sessions] Existing starter profile upgrade failed:',error);return false
 }
})();
/* TechDebt01: obsolete repairStarterTitle startup call removed; no such store method exists. */
const __XenStarterInstalled=(()=>{
  // Dormant Fast Boot must not parse/write V2 until the user opens the archive.
  if(__XenMetaSessions.isDormant())return false;
  const installed=__XenMetaSessions.ensureStarterCatalog().activated;
  __XenMetaSessions.upgradeStarterFactorySounds();
  return installed;
 })();
 function __xenUpgradeStarterBassGridDefaults(){
  if(__XenMetaSessions.isDormant()||!__XenMetaSessions.ensureHydrated())return false;
  const marker='xensonar.starter-bassgrid-defaults.v1';
  if(localStorage.getItem(marker)==='ready')return false;
  const originals=new Map(__xenStarterPresetRecords().primary.items.filter(e=>e.kind==='grid').map(e=>[e.instanceId,e]));
  const palette=__XenMetaSessions.snapshot().activePalette;
  const before=__XenQuick.getItems();let modified=false;
  try{
   if(!palette?.id||__xenStarterKnownRecord(palette)){
    const updated=before.map(item=>{const target=originals.get(item.instanceId);
     if(!__xenStarterBassGridUpgradeCandidate(item,target))return item;
     modified=true;return {...item,gridProfile:JSON.parse(JSON.stringify(target.gridProfile))};
    });
    if(modified)__XenQuick.replaceItems(updated);
   }
   const upgraded=__XenMetaSessions.upgradeStarterBassGridDefaults();
   if(__XenMetaSessions.snapshot().error)throw Error(__XenMetaSessions.snapshot().error);
   return modified||upgraded;
  }catch(error){
   if(modified)try{__XenQuick.replaceItems(before)}catch{}
   console.warn('[xensonar][starter-bass-grid] Migration skipped:',error);return false;
  }
 }
 const __XenStarterBassGridDefaultsUpgraded=__xenUpgradeStarterBassGridDefaults();


/* Read existing live adapter when registered. Other store readers are fallbacks for
   when a source editor is not mounted. Never instantiate a second material library. */
/* P33 META-LIBRARY TRASH START */
// One existing drag owner, one existing library-delete guard, no independent archive.
const __xenMetaTrashKey='xensonar.meta-library-trash.skip-warning.v1';
async function __xenMetaTrashAsk(prompt,entry,impact){
 try{if(localStorage.getItem(__xenMetaTrashKey)==='yes')return true}catch{}
 return __xenConfirmLibraryDeletion(prompt,entry,impact,{trash:true});
}
__xenMetaTrashAsk.alwaysConfirm=true;
function __xenMetaTrashAt(event,session){
 if(session?.modal?.dataset?.xenHeaderMenu!=='meta'||!session.source?.classList?.contains('xen-meta-library-row'))return null;
 const hit=document.elementFromPoint(event.clientX,event.clientY);
 const bin=hit?.closest('[data-xen-meta-library-trash]');
 if(!bin||!session.modal.contains(bin)||bin.dataset.xenMetaLibraryTrash!==session.entry.kind)return null;
 return bin;
}
async function __xenMetaTrashRemove(entry){
 const kind=String(entry?.kind||''),id=String(entry?.id||'');
 if(!__XenSongKinds.includes(kind)||!id)throw Error('Unknown library source; nothing removed.');
 const row=__xenMetaLibraryEntries(kind).find(x=>x.id===id);
 if(!row)throw Error('Library source changed during drag; nothing removed.');
 const source={kind,id,name:row.name};
 if(kind==='grid'){
  if(!id.startsWith('custom:')||!DJ(id))throw Error('Built-in Grid tunings are protected; only custom tunings can be deleted.');
  const done=await __xenDeleteLibraryEntry(source,()=>{BJ(id);if(DJ(id))return false;window.dispatchEvent(new Event('xensonar:grid-tuning-library-updated'));return true;},__xenMetaTrashAsk);
  if(done)__XenQuick.refreshLibraries();return done;
 }
 if(kind==='material'){
  // Existing IDB owner (LI) already wraps the same guarded deletion; never nest guards.
  const done=await LI(id,__xenMetaTrashAsk);
  if(done)__XenQuick.refreshLibraries();return done;
 }
 if(kind==='rootFollow'){
  const raw=__XMEM_MR03_ROOT_PILOT?JSON.stringify(Yp()):localStorage.getItem('xensonar-root-follow-loop-bank-v1');
  const bank=raw?JSON.parse(raw):null;
  if(!Array.isArray(bank?.memberIds)||!bank.memberIds.includes(id))throw Error('Root Follow bank membership is missing; nothing removed.');
  const done=await __xenDeleteLibraryEntry(source,async()=>{
   await QA(id,{rootFollowPreferred:false}); // Native Material owner: keep underlying audio.
   const now=__XMEM_MR03_ROOT_PILOT?Yp():JSON.parse(localStorage.getItem('xensonar-root-follow-loop-bank-v1')||'null');
   if(!Array.isArray(now?.memberIds)||!now.memberIds.includes(id))throw Error('Root Follow bank changed during deletion.');
   const next={...now,memberIds:now.memberIds.filter(x=>x!==id),orderedIds:(now.orderedIds||[]).filter(x=>x!==id),
    aliases:Object.fromEntries(Object.entries(now.aliases||{}).filter(([key])=>key!==id)),
    entryConfigs:Object.fromEntries(Object.entries(now.entryConfigs||{}).filter(([key])=>key!==id))};
   if(__XMEM_MR03_ROOT_PILOT)await UA(next);else{localStorage.setItem('xensonar-root-follow-loop-bank-v1',JSON.stringify(next));ri('rootFollowBankSync',next)}
   return true;
  },__xenMetaTrashAsk);
  if(done)__XenQuick.refreshLibraries();return done;
 }
 if(kind==='drum'){
  const done=await __xenDeleteLibraryEntry(source,()=>{
   Mce(id);if(!Yl().hiddenIds.includes(id))return false;
   return true; // Library visibility hide, NOT physical removal of factory sample bytes.
  },__xenMetaTrashAsk);
  if(done)__XenQuick.refreshLibraries();return done;
 }
 if(kind==='bass'){
  if(!id.startsWith('clip:')||!ZG().some(x=>x.id===id.slice(5)))throw Error('Built-in Bass presets are protected; only saved Bass clips can be deleted.');
  const done=await Fce(id.slice(5),__xenMetaTrashAsk);
  if(done)__XenQuick.refreshLibraries();return done;
 }
 throw Error('No native delete route for this kind.');
}
/* P33 META-LIBRARY TRASH END */

/* META-ORD-01 Global: no Meta-only shadow order. Every commit goes through
   the actual native library owner (or a shared Grid catalog function). */
const __XenMetaGlobalOrder=(()=>{
 const unique=ids=>[...new Set(ids.filter(x=>typeof x==='string'&&x.length))];
 const same=(a,b)=>a.length===b.length&&a.every((id,i)=>id===b[i]);
 async function commit(kind,visibleIds,draggedId,targetId,operation){
  if(!__XenSongKinds.includes(kind)||!['swap','insert-before','insert-after'].includes(operation))throw Error('Invalid library reorder');
  const current=__xenMetaLibraryEntries(kind),full=unique(current.map(row=>row.id));
  const allowed=new Set(full),visible=unique(visibleIds).filter(id=>allowed.has(id));
  if(visible.length<2||!visible.includes(draggedId)||!visible.includes(targetId))throw Error('Source library changed during drag');
  const sorted=ww({ids:visible,draggedId,targetId,operation});
  if(same(sorted,visible))return false;
  const set=new Set(visible),it=sorted[Symbol.iterator](),next=full.map(id=>set.has(id)?it.next().value:id);
  if(same(next,full))return false;
  if(kind==='grid'){
   const key='xensonar-grid-tuning-order-v1';
   // The native Grid catalog sj() reads the exact same canonical order.
   localStorage.setItem(key,JSON.stringify(next));
   window.dispatchEvent(new Event('xensonar:grid-tuning-library-updated'));
   if(!same(sj().map(row=>row.id).filter(id=>allowed.has(id)),next))throw Error('Grid catalog order not confirmed');
  }else if(kind==='material'){
   // Native durable material writer: it changes the order of existing assets,
   // without modifying IDs, sessions, PCM, or the material itself.
   const before=bs().entries.map(e=>e.id);
   if(!next.every(id=>before.includes(id)))throw Error('Material owner missing source');
   await dV(next);
   const after=bs().entries.filter(e=>allowed.has(e.id)).map(e=>e.id);
   if(!same(after,next))throw Error('Material owner did not confirm new order');
  }else if(kind==='rootFollow'){
   const bank=Yp(),members=new Set(bank.memberIds);
   if(!next.every(id=>members.has(id)))throw Error('Root Follow owner missing bank member');
   const normalized=Gp({...bank,orderedIds:[...next,...bank.orderedIds.filter(id=>!allowed.has(id))]});
   if(__XMEM_MR03_ROOT_PILOT)await UA(normalized);else localStorage.setItem(HS,JSON.stringify(normalized));
   if(!same(Yp().orderedIds.filter(id=>allowed.has(id)),next))throw Error('Root Follow order not persisted');
   ri('rootFollowBankSync',normalized);
  }else if(kind==='drum'){
   const state=Yl();
   $y({...state,orderedIds:[...next,...state.orderedIds.filter(id=>!allowed.has(id))]});
   if(!same(Yl().orderedIds.filter(id=>allowed.has(id)),next))throw Error('Drum owner did not confirm order');
  }else if(kind==='bass'){
   const preset=id=>id.startsWith('preset:');
   if(preset(draggedId)!==preset(targetId))throw Error('Bass presets and saved clips are separate native lists');
   if(preset(draggedId)){
    const ids=next.filter(preset),old=full.filter(preset);
    if(!same(ids,old)){
     localStorage.setItem('xensonar-bass-preset-order-v1',JSON.stringify(ids));
     if(!same(__xenBassPresetCanonicalOrder(ids.map(id=>({value:id.slice(7)}))).map(e=>'preset:'+e.value),ids))throw Error('Bass preset order not persisted');
     window.dispatchEvent(new Event('xensonar:bass-preset-order-changed'));
    }
   }else{
    const ids=next.filter(id=>id.startsWith('clip:')).map(id=>id.slice(5)),state=sc();
    if(!ids.every(id=>state.clips.some(e=>e.id===id)))throw Error('Bass clip no longer exists');
    gg({...state,order:[...ids,...state.order.filter(id=>!ids.includes(id))]});
    if(!same(sc().order.filter(id=>ids.includes(id)),ids))throw Error('Bass clip order not persisted');
   }
  }
  __XenQuick.refreshLibraries();
  window.dispatchEvent(new CustomEvent('xensonar:meta-library-order-changed',{detail:{kind,orderedIds:next,scope:'native'}}));
  return true;
 }
 return Object.freeze({commit});
})();
/* Shared owner for Grid catalog order, read by the native catalog and Meta alike. */
function __xenGridCanonicalOrder(rows){
 try{
  const saved=JSON.parse(localStorage.getItem('xensonar-grid-tuning-order-v1')||'[]');
  if(!Array.isArray(saved))return rows;
  const ranks=new Map(saved.filter(x=>typeof x==='string').map((id,i)=>[id,i]));
  return rows.map((row,i)=>({row,i})).sort((a,b)=>(ranks.get(a.row.id)??Infinity)-(ranks.get(b.row.id)??Infinity)||a.i-b.i).map(x=>x.row);
 }catch{return rows}
}
function __xenBassPresetCanonicalOrder(presets){
 try{
  const saved=JSON.parse(localStorage.getItem('xensonar-bass-preset-order-v1')||'[]');
  if(!Array.isArray(saved))return presets;
  const rank=new Map(saved.filter(x=>typeof x==='string').map((id,i)=>[id,i]));
  return presets.map((row,i)=>({row,i})).sort((a,b)=>(rank.get('preset:'+a.row.value)??Infinity)-(rank.get('preset:'+b.row.value)??Infinity)||a.i-b.i).map(x=>x.row);
 }catch{return presets}
}
function __xenMetaEntryTooltip(entry,originalIndex){
 const slot=originalIndex+1;
 const activeKeys=__XenQuick.snapshot().hotkeys?.[entry.kind];
 const keyIndex=Array.isArray(activeKeys)?activeKeys.indexOf(entry.id):-1;
 const hotkey=keyIndex>=0&&keyIndex<__XenLoopHotkeys.length?__XenLoopHotkeys[keyIndex]:'—';
 const fromAdapter=__XenQuick.adapters.get(entry.kind)?.entries?.find(e=>String(e.id)===entry.id);
 const bars=__xenTimedBarsFromRecord(fromAdapter)??__xenTimedBarsFromRecord(entry);
 const name=String(fromAdapter?.name??entry.name);
 const info=bars===null?'Takte: —':'Takte: '+bars;
 return 'Slot '+slot+' · Hotkey: '+hotkey+' · '+name+' · '+info;
}
/* META-ORD-02: saved Sessions share the identical swap/insert geometry.
   IDs and payloads are owned exclusively by the canonical Session V2 archive. */
function __xenMetaSessionOrderTarget(event,session){
 if(session?.modal?.dataset.xenHeaderMenu!=='meta'||session.entry?.kind!=='session'||!session.source?.matches('.xen-meta-session-row'))return null;
 const list=session.modal.querySelector('.xen-meta-session-list');if(!list)return null;
 const bounds=list.getBoundingClientRect(),x=event.clientX,y=event.clientY;
 if(x<bounds.left||x>=bounds.right||y<bounds.top||y>=bounds.bottom)return null;
 const hit=document.elementFromPoint(x,y);
 if(!hit||!list.contains(hit)||hit.closest('button,input,textarea,select'))return null;
 const rows=[...list.querySelectorAll('.xen-meta-session-row[data-xen-meta-session-id]')];
 if(rows.length<2||!rows.some(row=>row.dataset.xenMetaSessionId===session.entry.id))return null;
 const geom=rows.map(row=>{const r=row.getBoundingClientRect();return {id:row.dataset.xenMetaSessionId,top:r.top,bottom:r.bottom,row}});
 const found=zoe({pointerY:y,rows:geom,insertBandRatio:.20});
 if(!found||found.operation==='swap'&&found.entryId===session.entry.id)return null;
 const index=geom.findIndex(row=>row.id===found.entryId);if(index<0)return null;
 const cut=found.operation==='insert-before'?index:index+1;
 const before=found.operation==='swap'?null:geom[cut-1]??null;
 const after=found.operation==='swap'?null:geom[cut]??null;
 return {draggedId:session.entry.id,targetId:found.entryId,operation:found.operation,
  visibleIds:geom.map(row=>row.id),list,swapRow:found.operation==='swap'?geom[index].row:null,
  neighbors:[before?.row,after?.row].filter(Boolean),before,after,
  yLine:found.operation==='swap'?null:before&&after?(before.bottom+after.top)/2:before?before.bottom+3:after?after.top-3:null};
}
function __xenMetaSessionOrderPaint(target){
 for(const row of document.querySelectorAll('.xen-meta-session-row.is-library-swap-target,.xen-meta-session-row.is-library-insert-neighbor'))row.classList.remove('is-library-swap-target','is-library-insert-neighbor');
 let line=document.querySelector('#xen-meta-session-insertion-line');
 if(!target){line?.remove();return}
 target.swapRow?.classList.add('is-library-swap-target');
 for(const row of target.neighbors)row.classList.add('is-library-insert-neighbor');
 if(target.yLine!==null){
  if(!line){line=document.createElement('div');line.id='xen-meta-session-insertion-line';line.className='xen-meta-library-insertion-line';line.setAttribute('aria-hidden','true');document.body.appendChild(line)}
  const r=target.list.getBoundingClientRect();line.style.left=(r.left+11)+'px';line.style.width=Math.max(0,r.width-22)+'px';line.style.top=target.yLine+'px';
 }else line?.remove();
}
function __xenMetaSessionOrderHud(target){
 if(!target)return '';
 const name=row=>row?.querySelector('.xen-meta-session-details strong')?.textContent||'–';
 if(target.operation==='swap')return ' · TAUSCHEN 🔄 '+name(target.swapRow);
 return ' · REINSCHIEBEN '+name(target.before?.row)+' 🔽 '+name(target.after?.row);
}

function __xenMetaLibraryOrderTarget(event,session){
 if(session?.modal?.dataset.xenHeaderMenu!=='meta'||!session.source?.matches('.xen-meta-library-row')||!session.entry?.id)return null;
 const list=session.modal.querySelector('#xen-meta-library-list');
 if(!list)return null;
 const rect=list.getBoundingClientRect(),x=event.clientX,y=event.clientY;
 if(x<rect.left||x>=rect.right||y<rect.top||y>=rect.bottom)return null;
 const hit=document.elementFromPoint(x,y);
 if(!hit||!list.contains(hit)||hit.closest('input,button'))return null;
 const rows=[...list.querySelectorAll('.xen-meta-library-row[data-xen-quick-id]')];
 if(rows.length<2||!rows.some(row=>row.dataset.xenQuickId===session.entry.id&&row.dataset.xenQuickKind===session.entry.kind))return null;
 if(rows.some(row=>row.dataset.xenQuickKind!==session.entry.kind))return null;
 const geom=rows.map(row=>{const r=row.getBoundingClientRect();return {id:row.dataset.xenQuickId,top:r.top,bottom:r.bottom,row}});
 const found=zoe({pointerY:y,rows:geom,insertBandRatio:.20});
 if(!found||found.operation==='swap'&&found.entryId===session.entry.id)return null;
 if(session.entry.kind==='bass'&&(session.entry.id.startsWith('preset:')!==found.entryId.startsWith('preset:')))return null;
 const idx=geom.findIndex(row=>row.id===found.entryId);
 if(idx<0)return null;
 const cut=found.operation==='insert-before'?idx:idx+1;
 const before=found.operation==='swap'?null:geom[cut-1]??null;
 const after=found.operation==='swap'?null:geom[cut]??null;
 const yLine=found.operation==='swap'?null:before&&after?(before.bottom+after.top)/2:before?before.bottom+3:after?after.top-3:null;
 return {kind:session.entry.kind,draggedId:session.entry.id,targetId:found.entryId,operation:found.operation,rows,visibleIds:geom.map(row=>row.id),swapRow:found.operation==='swap'?geom[idx].row:null,neighbors:[before?.row,after?.row].filter(Boolean),before,after,yLine,list};
}
function __xenMetaLibraryOrderPaint(target){
 for(const row of document.querySelectorAll('.xen-meta-library-row.is-library-swap-target,.xen-meta-library-row.is-library-insert-neighbor'))row.classList.remove('is-library-swap-target','is-library-insert-neighbor');
 let line=document.querySelector('#xen-meta-library-insertion-line');
 if(!target){line?.remove();return}
 target.swapRow?.classList.add('is-library-swap-target');
 for(const row of target.neighbors)row.classList.add('is-library-insert-neighbor');
 if(target.yLine!==null){
  if(!line){line=document.createElement('div');line.id='xen-meta-library-insertion-line';line.className='xen-meta-library-insertion-line';line.setAttribute('aria-hidden','true');document.body.appendChild(line)}
  const r=target.list.getBoundingClientRect();line.style.left=(r.left+11)+'px';line.style.width=Math.max(0,r.width-22)+'px';line.style.top=target.yLine+'px';
 }else line?.remove();
}
function __xenMetaLibraryOrderHud(target){
 if(!target)return '';
 if(target.operation==='swap')return ' · TAUSCHEN 🔄 '+(target.swapRow?.querySelector('.xen-meta-source-name')?.textContent||target.targetId);
 const name=row=>row?.querySelector('.xen-meta-source-name')?.textContent||'–';
 return ' · REINSCHIEBEN '+name(target.before?.row)+' 🔽 '+name(target.after?.row);
}

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

/* XEN-META-M2-NAME-BEGIN
   Native owner naming only. Session tile name is a reference label, never a second
   material/drum/root/bass identity or permission to rewrite the Session V2 archive.
   A failed native write must leave the previous owner state intact. */
function __xenMetaCanRename(entry){
 return !!entry&&entry.kind==='grid'&&String(entry.id||'').startsWith('custom:')||
   !!entry&&['material','rootFollow','drum'].includes(entry.kind)||
   !!entry&&entry.kind==='bass'&&typeof entry.id==='string'&&entry.id.startsWith('clip:');
}
async function __xenMetaRenameSource(entry,input){
 if(!__xenMetaCanRename(entry))throw Error('This source cannot be renamed here; edit or save a new source in its native workshop.');
 const kind=entry.kind,id=String(entry.id||''),name=String(input??'').trim();
 if(!id||!name||name.length>100)throw Error('Source name must contain 1–100 characters.');
 if(kind==='grid'){
  const existing=typeof DJ==='function'?DJ(id):null;
  if(!existing||!id.startsWith('custom:'))throw Error('Only saved custom grids may be renamed in the native Grid Library.');
  // LJ is the Grid Workbench’s own persisted writer. Preserve ID and all pitch fields.
  if(LJ({...existing,label:name})!==id||DJ(id)?.label!==name)throw Error('Grid owner did not confirm the name.');
  window.dispatchEvent(new Event('xensonar:grid-tuning-library-updated'));
  return {kind,id,name};
 }
 if(kind==='material'){
  const saved=await QA(id,{name});
  if(!saved||saved.id!==id||saved.name!==name)throw Error('Material owner did not confirm the new name.');
  return {kind,id,name:saved.name};
 }
 if(kind==='rootFollow'){
  const raw=__XMEM_MR03_ROOT_PILOT?JSON.stringify(Yp()):window.localStorage.getItem('xensonar-root-follow-loop-bank-v1');
  if(!raw)throw Error('Root Follow bank is unavailable. No name was changed.');
  const bank=JSON.parse(raw);
  if(!bank||!Array.isArray(bank.memberIds)||!bank.memberIds.includes(id))throw Error('Root Follow bank member is missing. No name was changed.');
  const next={...bank,aliases:{...(bank.aliases||{}),[id]:name}};
  if(__XMEM_MR03_ROOT_PILOT)await UA(next);else window.localStorage.setItem('xensonar-root-follow-loop-bank-v1',JSON.stringify(next));
  const verified=__XMEM_MR03_ROOT_PILOT?Yp():JSON.parse(window.localStorage.getItem('xensonar-root-follow-loop-bank-v1')||'null');
  if(verified?.aliases?.[id]!==name)throw Error('Root Follow name could not be verified.');
  // Canonical owner event: manager and Quick Rack refresh from the same bank.
  ri('rootFollowBankSync',verified);
  return {kind,id,name};
 }
 if(kind==='drum'){
  if(!__xenMetaLibraryEntries('drum').some(row=>row.id===id))throw Error('Drum source is no longer available.');
  xce(id,name); // Native playlist alias writer. May throw QuotaExceededError.
  if(Yl().aliases?.[id]!==name)throw Error('Drum name was not persisted.');
  return {kind,id,name};
 }
 if(kind==='bass'){
  if(!id.startsWith('clip:'))throw Error('Factory Bass preset names are immutable.');
  const clipId=id.slice(5);
  if(!clipId||!ZG().some(row=>row.id===clipId))throw Error('Bass clip is no longer available.');
  Ece(id.slice(5),name); // Native bass clip owner; not a session-only alias.
  const saved=ZG().find(row=>row.id===clipId);
  if(!saved||saved.name!==name)throw Error('Bass clip name could not be verified.');
  return {kind,id,name};
 }
 throw Error('Unsupported source type.');
}
/* XEN-META-M2-NAME-END */

/* XEN-M3B0-BEGIN: read-only origin ownership resolver */
/* M3b0: resolve original project identity without mutating material, source, session or bank. */
const __XenOriginInspector=(()=>{
 const kinds=new Set(['material','rootFollow']);
 const editors=new Set(['melodic-loop','spectral-forge']);
 const unavailable=reason=>({status:'unavailable',originKind:null,reason});
 const incompatible=(originKind,reason)=>({status:'incompatible',originKind,reason});
 const noProject=(entry)=>{
  const field=entry.carrierIntegralField;
  const synthetic=field?.schemaVersion==='carrier-integral-field-v1'&&Array.isArray(field.voices)&&field.voices.length>0;
  return {status:synthetic?'synthetic-structure-only':'audio-only',originKind:null,
   reason:synthetic?'A playable synthetic structure exists, but no saved source project is linked.':'No verified source project is linked.'};
 };
 async function inspectWithOwners({targetKind,entryId}={},owners={}){
  if(!kinds.has(targetKind)||typeof entryId!=='string'||!entryId.trim())return unavailable('Unsupported target or empty material ID.');
  let entry;
  try{entry=await owners.readMaterial(entryId);}catch{return unavailable('Material library could not be read.');}
  if(!entry||String(entry.id)!==entryId)return unavailable('Material source is no longer available.');
  const link=entry.originProjectRef;
  if(link==null){
   // Reuse a durable Audio Paint provenance contract already stored by the native
   // Spectral Forge -> material exporter. Never reconstruct provenance from titles.
   // The current material ID MUST match the ID originally recorded in the handoff.
   const raw=entry.audioPaintImportDetailJson;
   if(typeof raw!=='string'||!raw.trim())return noProject(entry);
   let detail;
   try{detail=JSON.parse(raw);}catch{return noProject(entry);}
   if(!detail||typeof detail!=='object'||Array.isArray(detail)||!detail.carrierProjectId)
    return noProject(entry);
   if(typeof detail.entryId!=='string'||detail.entryId!==entryId)
    return incompatible('spectral-forge','Stored Audio Paint provenance belongs to a different material entry.');
   if(typeof detail.carrierProjectId!=='string'||!detail.carrierProjectId.trim()||
      typeof detail.machineId!=='string'||!detail.machineId.trim())
    return incompatible('spectral-forge','Stored Audio Paint provenance has no valid Carrier project/machine identity.');
   const legacyLink={schemaVersion:1,editor:'spectral-forge',projectId:detail.carrierProjectId};
   return verifyLink(legacyLink,owners,true);
  }
  return verifyLink(link,owners,false);
 }
 async function verifyLink(link,owners,fromExistingAudioPaint){
  if(!link||typeof link!=='object'||Array.isArray(link)||link.schemaVersion!==1||
     !editors.has(link.editor)||typeof link.projectId!=='string'||!link.projectId.trim())
   return incompatible(null,'Origin project reference has an unsupported format or version.');
  let project;
  try{project=await owners.readProject(link.editor,link.projectId);}catch{return unavailable('The referenced source project could not be read.');}
  if(!project)return unavailable('The referenced source project no longer exists.');
  if(project.id!==link.projectId)return incompatible(link.editor,'Source project identity does not match the recorded reference.');
  if(link.editor==='melodic-loop'){
   if(!project.composer||!Array.isArray(project.composer.tracks))return incompatible(link.editor,'Melodic project snapshot has an unsupported shape.');
  }else{
   const snapshot=project.snapshot;
   if(!snapshot||typeof snapshot!=='object'||!snapshot.materialExport||typeof snapshot.materialExport!=='object'||
      !(ArrayBuffer.isView(snapshot.spectralSnapshot)||Array.isArray(snapshot.spectralSnapshot))||
      snapshot.spectralSnapshot.length===0)
    return incompatible(link.editor,'Spectral Forge project snapshot is incomplete.');
  }
  if(link.contentHash!==undefined){
   if(typeof link.contentHash!=='string'||!link.contentHash||
      typeof project.contentHash!=='string'||project.contentHash!==link.contentHash)
    return incompatible(link.editor,'Source project content hash differs from the recorded reference.');
  }
  return {status:'verified-project',originKind:link.editor,editor:link.editor,sourceId:link.projectId,
   reason:fromExistingAudioPaint?'Existing Audio Paint Carrier project resolved by exact ID.':'Saved source project resolved by exact ID.'};
 }
 async function inspectSource(query){
  return inspectWithOwners(query,{
   readMaterial:async id=>{
    await __ensureMaterialLibraryHydrated();
    return bs().entries.find(entry=>entry.id===id)??null;
   },
   readProject:async(editor,id)=>editor==='spectral-forge'?Y7(id):j7().find(entry=>entry.id===id)??null
  });
 }
 return Object.freeze({inspectSource,inspectWithOwners});
})();
window.__XenOriginInspector=__XenOriginInspector;
/* XEN-M3B0-END */

/* XEN-META-EDIT-E1-BEGIN */
/* M1 descendant: read-only, owner-based route discovery. No navigation, edits, or persistence. */
const __XenMetaEditResolver=(()=>{
 const error=(status,diagnosticsCode,reason)=>({status,sourceKind:'unknown',sourceOwner:null,sourceId:null,canNavigate:false,requiresLoadPreflight:true,
   editor:null,roundtrip:'none',capability:{editDiscreteNotes:false,editContinuousField:false,editRawAudio:false,preserveSourceSemantics:false},
   diagnosticsCode,reason});
 const route=({entryId,sourceOwner,sourceId=entryId,sourceKind,editor,roundtrip,reason,diagnosticsCode='XEN_EDIT_READY',continuous=false})=>({
   status:'ready',sourceKind,sourceOwner,sourceId,editor,roundtrip,reason,diagnosticsCode,
   canNavigate:false,requiresLoadPreflight:true,
   capability:{editDiscreteNotes:editor==='melodic-loop',editContinuousField:continuous,
    editRawAudio:editor==='audio-import',preserveSourceSemantics:roundtrip==='verified-native'||roundtrip==='audio-only'}
 });
 const canReadBlob=e=>!!e?.blob&&typeof e.blob.size==='number'&&Number.isFinite(e.blob.size)&&e.blob.size>0;
 const isPattern=p=>p&&typeof p==='object'&&Array.isArray(p.tracks)&&p.tracks.length>0&&
   Array.isArray(p.notes)&&p.notes.length>0&&p.tracks.every(t=>t&&typeof t.id==='string'&&t.id.length>0)&&
   p.notes.every(n=>n&&typeof n.trackId==='string'&&p.tracks.some(t=>t.id===n.trackId));
 const isHybridComposer=c=>Array.isArray(c?.notes)&&c.notes.some(n=>
   n&&typeof n.sourceMaterialId==='string'&&n.sourceMaterialId.length>0&&
   (n.renderSourceKind==='sample'||n.renderSourceKind==='raw-audio'||n.renderSourceKind==='material'||n.renderSourceKind==='sample-asset'));
 async function inspectWithOwners({sessionKind,entryId}={},owners={}){
  if(sessionKind!=='material'&&sessionKind!=='rootFollow')return error('unsupported','XEN_EDIT_UNSUPPORTED_KIND','Only Material Track and Root Follow Loop expose this edit route.');
  if(typeof entryId!=='string'||!entryId.trim())return error('unavailable','XEN_EDIT_EMPTY_ID','No saved source ID was supplied.');
  let entry;
  try{entry=await owners.readMaterial(entryId)}catch{return error('unavailable','XEN_EDIT_MATERIAL_READ_FAILED','The Material library could not be read. Nothing changed.');}
  if(!entry||entry.id!==entryId)return error('unavailable','XEN_EDIT_SOURCE_MISSING','This exact saved material is unavailable. Nothing changed.');
  const hasAudio=canReadBlob(entry);
  // The Root Follow bank owns the synthetic *usage recipe*, not the material archive.
  let bank=null;
  if(sessionKind==='rootFollow'){
   try{bank=await owners.readRootBank()}catch{return error('unavailable','XEN_EDIT_RFL_BANK_UNAVAILABLE','Root Follow configuration could not be checked. Nothing changed.');}
  }
  const config=sessionKind==='rootFollow'&&bank?.memberIds?.includes(entryId)?bank?.entryConfigs?.[entryId]:null;
  const storedSynth=config?.sourceKind==='synth'&&config?.renderMode==='direct'&&isPattern(config.synthPattern);
  // Edit Current: classify this specific saved RFL playback structure BEFORE historic provenance.
  // A compiled carrier's notes[] and grid offsets are transport data, not a discretization contract.
  if(storedSynth){
   const continuous=config.pitchIdentity?.pitchConstraint==='continuous'||config.synthPattern.notes.some(n=>
    n&&((Array.isArray(n.compiledPitchSemitones)&&n.compiledPitchSemitones.length>0)||
     (Array.isArray(n.compiledGainCurve)&&n.compiledGainCurve.length>0)||n.localField||n.carrierIntegralField));
   return route({entryId,sourceOwner:'root-follow-bank',sourceKind:'synthetic-pattern',
    editor:continuous?'spectral-forge':'melodic-loop',continuous,
    roundtrip:'derived-projection',diagnosticsCode:continuous?'XEN_EDIT_DERIVED_FIELD':'XEN_EDIT_SYNTH_PATTERN',
    reason:continuous?'Stored continuous Root Follow curves open as a derived Spectral Forge drawing.':
     'Stored discrete Root Follow notes open as a derived Melodic editing copy.'});
  }
  // Only field-only Material entries are unambiguous on legacy records. An entry with
  // competing PCM and field data requires explicit current-representation ownership.
  const field=entry.carrierIntegralField;
  if(field?.schemaVersion==='carrier-integral-field-v1'&&Array.isArray(field.voices)&&field.voices.length){
   if(hasAudio)return error('unsupported','XEN_EDIT_AMBIGUOUS_FIELD_AUDIO',
     'This archived material contains both audio and a field without a verified active representation. Nothing changed.');
   return route({entryId,sourceOwner:'material-library',sourceKind:'carrier-integral-field',
    editor:'spectral-forge',continuous:true,roundtrip:'derived-projection',
    diagnosticsCode:'XEN_EDIT_MATERIAL_FIELD',reason:'Stored continuous field opens as a derived Spectral Forge drawing.'});
  }
  // Historic project provenance is only a fallback when no current structured use was found.
  // Project verification happens through the existing origin inspector, not a title guess.
  let origin=null;
  try{if(typeof owners.inspectOrigin==='function')origin=await owners.inspectOrigin({targetKind:sessionKind,entryId})}
  catch{origin={status:'unavailable',reason:'The recorded origin project cannot be inspected.'}}
  const originWarning=origin?.status==='unavailable'||origin?.status==='incompatible'?String(origin.reason||'The original project is unavailable.') : null;
  if(origin?.status==='verified-project'&&typeof origin.sourceId==='string'&&origin.sourceId.trim()){
   if(origin.editor==='melodic-loop'){
    let project;
    try{project=await owners.readProject('melodic-loop',origin.sourceId)}catch{}
    if(project?.id===origin.sourceId&&project.composer&&Array.isArray(project.composer.tracks)){
     return route({entryId,sourceId:origin.sourceId,sourceOwner:'melodic-project-library',
      sourceKind:isHybridComposer(project.composer)?'hybrid-project':'melodic-project',editor:'melodic-loop',roundtrip:'verified-native',
      reason:'Verified original Melodic Loop project. Source remains unchanged until explicit save.'});
    }
   }else if(origin.editor==='spectral-forge'&&!hasAudio&&!storedSynth){
    return route({entryId,sourceId:origin.sourceId,sourceOwner:'spectral-forge-project-library',
     sourceKind:'spectral-forge-project',editor:'spectral-forge',roundtrip:'verified-native',
     reason:'Verified original Spectral Forge project.'});
   }
  }
  if(hasAudio)return route({entryId,sourceOwner:'material-library',sourceKind:'raw-audio',editor:'audio-import',
   roundtrip:'audio-only',reason:(originWarning?originWarning+' ':'')+'An audio body is stored. Decoding and the Audio Import handoff still require preflight.'});
  if(field?.schemaVersion==='carrier-integral-field-v1')
   return error('unsupported','XEN_EDIT_FIELD_MALFORMED','This archived field has no usable continuous voices. Nothing changed.');
  return error('unavailable','XEN_EDIT_NO_EDITABLE_SOURCE',(originWarning?originWarning+' ':'')+'No playable audio, editable pattern, or verified native project is available.');
 }
 async function inspectSource(query){return inspectWithOwners(query,{
  readMaterial:async id=>{await __ensureMaterialLibraryHydrated();return bs().entries.find(e=>e.id===id)??null},
  readRootBank:async()=>Yp(),
  inspectOrigin:q=>__XenOriginInspector.inspectSource(q),
  readProject:async(editor,id)=>editor==='melodic-loop'?j7().find(e=>e.id===id)??null:null
 });}
 return Object.freeze({inspectWithOwners,inspectSource});
})();
window.__XenMetaEditResolver=__XenMetaEditResolver;
/* XEN-META-EDIT-E1-END */

/* XEN-META-EDIT-E2-BEGIN */
/* Native Raw Audio Edit handoff. Read-only until the user explicitly exports from Material Intake. */
const __XenMetaEditE2=(()=>{
 let generation=0;
 const fail=(status,code,reason)=>({status,code,reason,canNavigate:false});
 const mediaType=(blob,name)=>{
  const mime=String(blob.type||'').toLowerCase();
  if(mime.startsWith('audio/'))return mime;
  return /\.wav$/i.test(name)?'audio/wav':/\.flac$/i.test(name)?'audio/flac':/\.mp3$/i.test(name)?'audio/mpeg':
    /\.ogg$/i.test(name)?'audio/ogg':/\.m4a$/i.test(name)?'audio/mp4':'application/octet-stream';
 };
 const safeName=(entry,type)=>{
  const clean=String(entry.fileName||entry.name||'Material').replace(/[\\/\u0000-\u001f]/g,'_').trim().slice(0,110)||'Material';
  if(/\.(wav|flac|mp3|ogg|m4a|aac)$/i.test(clean))return clean;
  return clean+({'audio/mpeg':'.mp3','audio/ogg':'.ogg','audio/mp4':'.m4a','audio/flac':'.flac'}[type]||'.wav');
 };
 async function openWithOwners({sessionKind,entryId}={},owners={}){
  const ticket=++generation;
  if(!['material','rootFollow'].includes(sessionKind)||typeof entryId!=='string'||!entryId.trim())
   return fail('unsupported','XEN_EDIT_INVALID_TARGET','No editable Material / Root Follow source was selected.');
  let route;
  try{route=await owners.inspectSource({sessionKind,entryId})}catch{return fail('unavailable','XEN_EDIT_INSPECT_FAILED','Source could not be inspected. Nothing changed.');}
  if(ticket!==generation)return fail('superseded','XEN_EDIT_SUPERSEDED','A newer Edit selection is active.');
  if(route?.status!=='ready')return fail(route?.status==='unsupported'?'unsupported':'unavailable',route?.diagnosticsCode||'XEN_EDIT_NOT_READY',route?.reason||'The source is unavailable. Nothing changed.');
  if(route.editor!=='audio-import'||route.sourceKind!=='raw-audio')
   return fail('unsupported','XEN_EDIT_DIFFERENT_EDITOR',route.editor==='melodic-loop'?'This synthetic figure needs the Melodic Loop Edit adapter.':'The original source requires its native project editor.');
  let entry;
  try{entry=await owners.readMaterial(entryId)}catch{return fail('unavailable','XEN_EDIT_ARCHIVE_READ_FAILED','Audio archive could not be read. Nothing changed.');}
  if(ticket!==generation)return fail('superseded','XEN_EDIT_SUPERSEDED','A newer Edit selection is active.');
  if(!entry||entry.id!==entryId||!(entry.blob instanceof Blob)||entry.blob.size<=0)
   return fail('unavailable','XEN_EDIT_AUDIO_MISSING','The selected material has no readable audio body. Nothing changed.');
  const type=mediaType(entry.blob,entry.fileName||entry.name||'');
  // Reject a falsely labeled WAV before changing rooms; other codecs remain verified by the native decoder.
  if(type==='audio/wav'){
   try{const head=new Uint8Array(await entry.blob.slice(0,12).arrayBuffer());
    const chunk=String.fromCharCode(...head.slice(0,4));
    if(head.length<12||!['RIFF','RF64'].includes(chunk)||String.fromCharCode(...head.slice(8,12))!=='WAVE')
     return fail('incompatible','XEN_EDIT_WAV_HEADER_INVALID','The selected audio is not a valid WAV header. Nothing changed.');
   }catch{return fail('incompatible','XEN_EDIT_WAV_HEADER_UNREADABLE','The audio header could not be read. Nothing changed.');}
  }
  if(ticket!==generation)return fail('superseded','XEN_EDIT_SUPERSEDED','A newer Edit selection is active.');
  const filename=safeName(entry,type);
  const file=new File([entry.blob],filename,{type,lastModified:Date.now()});
  // Existing app owner performs room navigation, native decoding, mask setup and scroll.
  // No new importer, audio engine, material write or silent source replacement.
  let sent=false;
  try{sent=owners.dispatch('xensonar:spectral-forge-audio-cut-upload',{file,source:'meta-edit-audio',sourceMaterialId:entryId,sessionKind})===true}
  catch{return fail('unavailable','XEN_EDIT_HANDOFF_FAILED','Audio Import could not be opened. Nothing was saved.');}
  if(!sent)return fail('unavailable','XEN_EDIT_HANDOFF_UNAVAILABLE','Audio Import handoff is unavailable. Nothing was saved.');
  return {status:'dispatched',code:'XEN_EDIT_AUDIO_SENT',sourceId:entryId,editor:'audio-import',canNavigate:true,
   reason:'The selected audio was sent to the native Audio Import decoder; no source material was overwritten.'};
 }
 async function openAudio(query){return openWithOwners(query,{
  inspectSource:q=>__XenMetaEditResolver.inspectSource(q),
  readMaterial:async id=>{await __ensureMaterialLibraryHydrated();return bs().entries.find(x=>x.id===id)??await Uhe(QT,id,'Failed to read selected archived material')},
  dispatch:(event,detail)=>{window.dispatchEvent(new CustomEvent(event,{detail}));return true}
 });}
 return Object.freeze({openWithOwners,openAudio});
})();
window.__XenMetaEditE2=__XenMetaEditE2;
/* XEN-META-EDIT-E2-END */
/* XEN-META-EDIT-E3A-BEGIN */
/* Verified native Melodic project edit, by exact project ID. No inferred inverse of RFL compiled patterns. */
const __XenMetaEditE3=(()=>{
 let nonce=0,pending=null;
 const fail=(status,code,reason)=>({status,code,reason});
 async function openWithOwners({sessionKind,entryId}={},owners={}){
  const token=++nonce;pending=null;
  let route;
  try{route=await owners.inspectSource({sessionKind,entryId})}catch{return fail('unavailable','XEN_EDIT_PROJECT_INSPECTION_FAILED','The original Melodic project could not be inspected.');}
  if(token!==nonce)return fail('superseded','XEN_EDIT_SUPERSEDED','A newer Edit selection is active.');
  if(route?.status!=='ready'||route.editor!=='melodic-loop')return fail('unsupported','XEN_EDIT_NOT_MELODIC','This material does not have a verified Melodic project.');
  if(route.roundtrip!=='verified-native'||route.sourceOwner!=='melodic-project-library'||route.sourceKind!=='melodic-project')
   return fail('unsupported','XEN_EDIT_DERIVED_OR_HYBRID','This figure needs its own synthetic/field/hybrid adapter. Original project reconstruction is not assumed.');
  const projectId=route.sourceId;
  if(typeof projectId!=='string'||!projectId)return fail('unavailable','XEN_EDIT_PROJECT_ID_MISSING','The verified project has no identifier.');
  let project;
  try{project=await owners.readProject(projectId)}catch{return fail('unavailable','XEN_EDIT_PROJECT_READ_FAILED','Melodic project storage could not be read.');}
  if(token!==nonce)return fail('superseded','XEN_EDIT_SUPERSEDED','A newer Edit selection is active.');
  if(!project||project.id!==projectId||!Array.isArray(project.composer?.tracks)||!Array.isArray(project.composer?.notes))
   return fail('unavailable','XEN_EDIT_PROJECT_GONE','The exact Melodic project is missing or incomplete.');
  pending={token,projectId,sourceMaterialId:entryId,expiresAt:Date.now()+30000};
  try{if(owners.dispatch('xensonar:open-canonical-melodic-loop',{source:'meta-melodic-project',requestToken:token})!==true)throw Error('navigation not available');
      owners.dispatch('xensonar:meta-edit-melodic-ready',{token,projectId});}
  catch{pending=null;return fail('unavailable','XEN_EDIT_PROJECT_NAV_FAILED','The Melodic editor could not be opened. Nothing changed.');}
  return {status:'dispatched',code:'XEN_EDIT_MELODIC_SENT',projectId};
 }
 function consume(){const request=pending;pending=null;return request&&request.expiresAt>=Date.now()?request:null;}
 function cancel(){nonce++;pending=null;}
 async function openSource(query){return openWithOwners(query,{
  inspectSource:q=>__XenMetaEditResolver.inspectSource(q),
  readProject:async id=>j7().find(e=>e.id===id)??null,
  dispatch:(event,detail)=>{window.dispatchEvent(new CustomEvent(event,{detail}));return true}
 });}
 return Object.freeze({openWithOwners,openSource,consume,cancel});
})();
window.__XenMetaEditE3=__XenMetaEditE3;
/* XEN-META-EDIT-E3A-END */
/* XEN-META-EDIT-E3B-BEGIN */
/* Compiled, DISCRETE Root Follow -> native Melodic editable WORKING COPY.
   Do not reverse-engineer field curves; do not mutate bank/source or fabricate a native project ID. */
const __XenMetaEditE3b=(()=>{
 let generation=0,pending=null;
 const fail=(status,code,reason)=>({status,code,reason});
 const finite=(n)=>typeof n==='number'&&Number.isFinite(n);
 const supportedTracks=new Set(['bass','companion','aux','texture','instrument5','instrument6','instrument7','instrument8']);
 function convertPattern(config){
  if(!config||config.sourceKind!=='synth'||config.renderMode!=='direct'||!config.synthPattern)
   return fail('unsupported','XEN_EDIT_SYNTH_NOT_DIRECT','This material is not a direct synthetic Root Follow pattern.');
  const p=config.synthPattern;
  if(config.pitchIdentity?.pitchConstraint==='continuous'||!Array.isArray(p.notes)||!Array.isArray(p.tracks)||!p.notes.length||!p.tracks.length)
   return fail('unsupported','XEN_EDIT_SYNTH_NOT_DISCRETE','This source needs a continuous-field adapter or has no editable note pattern.');
  if(!Number.isInteger(p.bars)||p.bars<1||p.bars>16||!Number.isInteger(p.stepsPerBar)||p.stepsPerBar<1||p.stepsPerBar>128||
     !Number.isInteger(p.beatsPerBar)||p.beatsPerBar<1||p.beatsPerBar>16||!finite(p.baseHz)||p.baseHz<=0||p.notes.length>1024)
   return fail('unsupported','XEN_EDIT_SYNTH_GEOMETRY','The stored bars, beat grid or note capacity cannot be represented safely by Melodic Loop.');
  const trackIds=new Set();
  for(const track of p.tracks){
   if(!track||!supportedTracks.has(track.id)||trackIds.has(track.id))
    return fail('unsupported','XEN_EDIT_SYNTH_TRACK','A source track is not a valid native Melodic Loop track.');
   trackIds.add(track.id);
  }
  const scale=p.stepsPerBar/p.beatsPerBar,byChannel=new Map(),seenNotes=new Set(),notes=[];
  const totalBeats=p.bars*p.beatsPerBar;
  for(const n of p.notes){
   if(!n||typeof n.id!=='string'||!n.id||seenNotes.has(n.id)||!trackIds.has(n.trackId)||
      !finite(n.startBeat)||n.startBeat<0||!finite(n.durationBeats)||n.durationBeats<=0||n.startBeat+n.durationBeats>totalBeats+1e-7||
      !Number.isInteger(n.channelIndex)||n.channelIndex<0||n.channelIndex>127||
      !finite(n.lineHz)||n.lineHz<=0||n.lineHz>40000)
    return fail('unsupported','XEN_EDIT_SYNTH_NOTE','One or more notes cannot be mapped to a precise Melodic pitch/time position.');
   // No invisible conversion of audio, curves, glide geometry, gate, panning or octave shifts.
   if((Array.isArray(n.compiledPitchSemitones)&&n.compiledPitchSemitones.length)||
      (Array.isArray(n.compiledGainCurve)&&n.compiledGainCurve.length)||n.localField||n.carrierIntegralField||
      n.sourceMaterialId||n.noteClass&&n.noteClass!=='standard'||
      n.renderSourceKind&&n.renderSourceKind!=='synth-live'||
      n.gate!=null&&Math.abs(n.gate-1)>1e-8||n.panOverride!=null||
      n.octaveOffset!=null&&n.octaveOffset!==0)
    return fail('unsupported','XEN_EDIT_SYNTH_COMPLEX','Continuous curves, hybrid audio or specialized voice attributes require the dedicated Field/Hybrid editor. No conversion was performed.');
   const previous=byChannel.get(n.channelIndex);
   if(previous!=null&&Math.abs(Math.log2(previous/n.lineHz))>1e-8)
    return fail('unsupported','XEN_EDIT_SYNTH_PITCH_COLLISION','Multiple frequencies occupy the same source pitch line. A precise inverse cannot be guaranteed.');
   byChannel.set(n.channelIndex,n.lineHz);seenNotes.add(n.id);
   // Preserve fields that are natively supported; the current input is never modified.
   notes.push({...n,channelIndex:n.channelIndex,lineId:`line-${n.channelIndex}`,stepId:`step-${n.channelIndex}`,
    startUnit:n.startBeat*scale,durationUnits:n.durationBeats*scale,
    fadeInUnits:finite(n.fadeInBeats)?n.fadeInBeats*scale:0,
    fadeOutUnits:finite(n.fadeOutBeats)?n.fadeOutBeats*scale:0,
    startBeat:n.startBeat,endBeat:n.startBeat+n.durationBeats,renderSourceKind:'synth-live'});
  }
  const patches=new Map((config.synthPatch?.trackPatches||[]).filter(x=>x&&trackIds.has(x.id)).map(x=>[x.id,x]));
  const tracks=p.tracks.map(t=>({...t,...patches.get(t.id)}));
  const draft={bars:p.bars,beatsPerBar:p.beatsPerBar,stepsPerBar:p.stepsPerBar,segmentCount:p.segmentCount||1,
   baseHz:p.baseHz,tuning:p.tuning||'12edo',repetitionModel:p.repetitionModel||'octave',
   compositionPresetId:config.synthPatch?.compositionPresetId||'jazz',
   tracks,activeTrackIds:(p.activeTrackIds||[]).filter(x=>trackIds.has(x)),notes,
   selectedTrackId:tracks[0].id,selectedNoteId:notes[0].id,
   pitchLines:Array.from(byChannel.entries()).map(([index,hz])=>({index,hz})),
   origin:'derived-root-follow-pattern',sourceAnchorGridStep:config.anchorGridStep??null};
  return {status:'ready',code:'XEN_EDIT_SYNTH_DRAFT_READY',draft};
 }
 async function openWithOwners({sessionKind,entryId}={},owners={}){
  const token=++generation;pending=null;
  if(sessionKind!=='rootFollow'||typeof entryId!=='string'||!entryId.trim())
   return fail('unsupported','XEN_EDIT_SYNTH_KIND','This synthetic pattern is available only from a Root Follow source.');
  let route;
  try{route=await owners.inspectSource({sessionKind,entryId})}
  catch{return fail('unavailable','XEN_EDIT_SYNTH_INSPECT_FAILED','The synthetic source could not be inspected. Nothing changed.');}
  if(token!==generation)return fail('superseded','XEN_EDIT_SUPERSEDED','A newer Edit selection is active.');
  if(route?.status!=='ready'||route.sourceKind!=='synthetic-pattern'||route.sourceOwner!=='root-follow-bank')
   return fail('unsupported','XEN_EDIT_SYNTH_WRONG_SOURCE','The selected entry is not a stored Root Follow synthetic pattern.');
  let bank;
  try{bank=await owners.readBank()}catch{return fail('unavailable','XEN_EDIT_SYNTH_BANK_FAILED','Root Follow Bank could not be read. Nothing changed.');}
  if(token!==generation)return fail('superseded','XEN_EDIT_SUPERSEDED','A newer Edit selection is active.');
  if(!bank?.memberIds?.includes(entryId)||!bank.entryConfigs?.[entryId])
   return fail('unavailable','XEN_EDIT_SYNTH_MISSING','The selected Root Follow entry is no longer in its bank. Nothing changed.');
  const built=convertPattern(bank.entryConfigs[entryId]);
  if(built.status!=='ready')return built;
  pending={token,entryId,sessionKind,draft:built.draft,expiresAt:Date.now()+30000};
  try{
   if(owners.dispatch('xensonar:open-canonical-melodic-loop',{source:'meta-melodic-derived',requestToken:token})!==true)
    throw Error('No native editor navigation');
   owners.dispatch('xensonar:meta-edit-synthetic-ready',{token,entryId});
  }catch{pending=null;return fail('unavailable','XEN_EDIT_SYNTH_NAV_FAILED','The Melodic editor could not be reached. Nothing changed.');}
  return {status:'dispatched',code:'XEN_EDIT_SYNTH_SENT',entryId};
 }
 function consume(){const request=pending;pending=null;return request&&request.expiresAt>=Date.now()?request:null;}
 function cancel(){generation++;pending=null;}
 function openSource(query){return openWithOwners(query,{
  inspectSource:q=>__XenMetaEditResolver.inspectSource(q),readBank:async()=>Yp(),
  dispatch:(event,detail)=>{window.dispatchEvent(new CustomEvent(event,{detail}));return true}
 });}
 return Object.freeze({convertPattern,openWithOwners,openSource,consume,cancel});
})();
window.__XenMetaEditE3b=__XenMetaEditE3b;
/* XEN-META-EDIT-E3B-END *//* XEN-META-EDIT-E4-BEGIN */
/* RFL compiled continuous curves -> native Spectral Forge painted, derived working figure. */
const __XenMetaEditE4=(()=>{
 let generation=0,pending=null;
 const fail=(status,code,reason)=>({status,code,reason}),finite=x=>typeof x==='number'&&Number.isFinite(x);
 const sample=(v,u,def)=>{if(!v?.length)return def;const a=u*(v.length-1),i=Math.floor(a),j=Math.min(v.length-1,i+1);return v[i]+(v[j]-v[i])*(a-i)};
 function convertPattern(config,{name='Derived Fretless Field'}={}){
  if(config?.sourceKind!=='synth'||config.renderMode!=='direct'||!config.synthPattern)return fail('unsupported','XEN_EDIT_FIELD_NOT_DIRECT','Not a direct Root Follow synth field.');
  const p=config.synthPattern,total=p.bars*p.beatsPerBar;
  if(!Number.isInteger(p.bars)||p.bars<1||p.bars>16||!Number.isInteger(p.beatsPerBar)||p.beatsPerBar<1||p.beatsPerBar>16||!finite(p.baseHz)||p.baseHz<=0||!Array.isArray(p.tracks)||!p.tracks.length||!Array.isArray(p.notes)||!p.notes.length||p.notes.length>1024)
   return fail('unsupported','XEN_EDIT_FIELD_INVALID','Invalid Root Follow field score.');
  const curveNotes=p.notes.filter(n=>n?.compiledPitchSemitones?.length>1||n?.compiledGainCurve?.length>1||n?.localField);
  if(!curveNotes.length)return fail('not-applicable','XEN_EDIT_FIELD_NOT_APPLICABLE','Discrete figure; use Melodic Loop.');
  if(curveNotes.length!==p.notes.length)return fail('unsupported','XEN_EDIT_FIELD_MIXED_SCORE',
   'Continuous carrier voices and ordinary note tracks coexist. A targeted component editor is required; no voices or timbres were dropped.');
  const tracks=new Map(),seen=new Set(),notes=[];
  for(const t of p.tracks){if(typeof t?.id!=='string'||!t.id||tracks.has(t.id))return fail('unsupported','XEN_EDIT_FIELD_TRACK','Invalid/duplicate track ID.');tracks.set(t.id,t)}
  for(const n of p.notes){
   if(typeof n?.id!=='string'||!n.id||seen.has(n.id)||!tracks.has(n.trackId)||!finite(n.startBeat)||n.startBeat<0||!finite(n.durationBeats)||n.durationBeats<=0||n.startBeat+n.durationBeats>total+1e-6||!finite(n.lineHz)||n.lineHz<20||n.lineHz>20000||!finite(n.velocity)||n.velocity<0||n.velocity>1)
    return fail('unsupported','XEN_EDIT_FIELD_VOICE','Invalid frequency, timing, identity or velocity in stored field.');
   if(n.renderSourceKind!=='synth-live'||(n.noteClass&&!['standard','carrier-field','carrier-fragment'].includes(n.noteClass))||n.sampleOffsetSec!=null||n.samplePlaybackDurationSec!=null||n.carrierIntegralField||n.octaveOffset!=null&&n.octaveOffset!==0||n.gate!=null&&(!finite(n.gate)||n.gate<0||n.gate>1.5))
    return fail('unsupported','XEN_EDIT_FIELD_MIXED','Sample/hybrid or uncompiled voice needs its own adapter.');
   const pitch=n.compiledPitchSemitones??[],gain=n.compiledGainCurve??[];
   if(!Array.isArray(pitch)||!Array.isArray(gain)||pitch.length>512||gain.length>512||pitch.some(v=>!finite(v)||Math.abs(v)>48)||gain.some(v=>!finite(v)||v<0||v>4))return fail('unsupported','XEN_EDIT_FIELD_CURVES','Invalid stored pitch/gain samples.');
   const t=tracks.get(n.trackId),volume=finite(t.volume)?t.volume:.8;
   if(volume<0||volume>2)return fail('unsupported','XEN_EDIT_FIELD_VOLUME','Unsupported track volume.');
   // Evaluate the SAME native LocalField interpreter used by the synthesizer.
   // This is derived geometry, never a claim of recovering the original brush pixels.
   if(n.localField&&typeof w1!=='function')return fail('unsupported','XEN_EDIT_LOCAL_FIELD_EVALUATOR','Native LocalField interpreter is unavailable.');
   let localPitch=null,localGain=null;
   try{if(n.localField){localPitch=w1(n.localField,'pitch-elastic');localGain=w1(n.localField,'dynamic-fade');}}
   catch{return fail('unsupported','XEN_EDIT_LOCAL_FIELD_INVALID','LocalField cannot be interpreted by the native renderer.');}
   const count=Math.max(2,pitch.length,gain.length,n.localField?96:2),pitchHz=[],gainCurve=[];
   for(let i=0;i<count;i++){const u=i/(count-1);
    const pitchMod=localPitch?12*localPitch(u):sample(pitch,u,0);
    const gainMod=localGain?1+.95*localGain(u):sample(gain,u,1);
    if(!finite(pitchMod)||!finite(gainMod)||gainMod<0)return fail('unsupported','XEN_EDIT_LOCAL_FIELD_INVALID','LocalField modulation contains invalid values.');
    const hz=n.lineHz*Math.pow(2,pitchMod/12);
    if(!finite(hz)||hz<20||hz>20000)return fail('unsupported','XEN_EDIT_FIELD_HZ','Field leaves the Forge frequency range (20–20000 Hz).');
    const energy=n.velocity*volume*gainMod;
    if(energy>1+1e-8)return fail('unsupported','XEN_EDIT_FIELD_GAIN_RANGE','Field energy exceeds the Forge drawing range; no amplitude was clipped.');
    pitchHz.push(hz);gainCurve.push(energy);}
   const fadeIn=n.fadeInBeats??0,fadeOut=n.fadeOutBeats??0;
   if(!finite(fadeIn)||!finite(fadeOut)||fadeIn<0||fadeOut<0||fadeIn>n.durationBeats||fadeOut>n.durationBeats)return fail('unsupported','XEN_EDIT_FIELD_FADE','Unsupported field fade.');
   notes.push({id:n.id,voiceId:n.carrierTransfer?.sourceVoiceId||n.id,trackId:n.trackId,startBeat:n.startBeat,durationBeats:n.durationBeats,pitchHz,gainCurve,fadeInBeats:fadeIn,fadeOutBeats:fadeOut,
    derivedSource:{lineHz:n.lineHz,velocity:n.velocity,trackVolume:volume,pitchSemitones:[...pitch],gainFactors:[...gain],pan:n.panOverride??null,carrierTransfer:n.carrierTransfer?structuredClone(n.carrierTransfer):null,carrierIntegralTimbre:n.carrierIntegralTimbre??null,spectralWindowMeta:n.spectralWindowMeta??null,
     localField:n.localField?structuredClone(n.localField):null,originalGate:n.gate??1}});
   seen.add(n.id);
  }
  return {status:'ready',code:'XEN_EDIT_FIELD_READY',transfer:{name:String(name).slice(0,100),bars:p.bars,beatsPerBar:p.beatsPerBar,bpm:120,guideSegments:4,guideMarkers:[.25,.5,.75],
   carrier:{version:'melodic-carrier-v1',durationBeats:total,tracks:p.tracks.map(t=>({id:t.id,label:t.label??t.id,enabled:t.enabled!==false})),notes,origin:'derived-root-follow-field'}}};
 }
 function convertIntegralField(field,{name='Derived Carrier Field'}={}){
  const bad=(code,reason)=>fail('unsupported',code,reason);
  if(field?.schemaVersion!=='carrier-integral-field-v1'||!Array.isArray(field.voices)||
     !field.voices.length||field.voices.length>1024)return bad('XEN_EDIT_INTEGRAL_SCHEMA','Invalid stored field voices.');
  const total=field.totalBeats,base=field.sourceBaseHz;
  if(!finite(total)||total<=0||total>256||!finite(base)||base<=0)return bad('XEN_EDIT_INTEGRAL_TIMING','Invalid original field duration or frequency reference.');
  const bars=field.sourceBars,beats=field.sourceBeatsPerBar;
  if(!Number.isInteger(bars)||bars<1||bars>16||!Number.isInteger(beats)||beats<1||beats>16||Math.abs(bars*beats-total)>1e-5)
   return bad('XEN_EDIT_INTEGRAL_BARS','Unsupported field bar or beat alignment.');
  const ids=new Set(),trackIds=new Set(),notes=[];
  for(const v of field.voices){
   if(typeof v?.id!=='string'||!v.id||ids.has(v.id)||typeof v.trackId!=='string'||!v.trackId||
      !finite(v.startRatio)||v.startRatio<0||v.startRatio>=1||!finite(v.durationRatio)||v.durationRatio<=0||
      v.startRatio+v.durationRatio>1+1e-6||!finite(v.relativeSemitones)||Math.abs(v.relativeSemitones)>144||
      !finite(v.velocity)||v.velocity<0||v.velocity>1||!finite(v.trackVolume)||v.trackVolume<0||v.trackVolume>1.5)
    return bad('XEN_EDIT_INTEGRAL_VOICE','Stored field contains an invalid voice, position or envelope.');
   if(v.localField||v.sourceMaterialId||v.sampleOffsetSec!=null)
    return bad('XEN_EDIT_INTEGRAL_LOCAL_FIELD','A local modulation or sample requires a separate lossless geometry adapter.');
   if(v.velocity*v.trackVolume>1+1e-8)return bad('XEN_EDIT_INTEGRAL_GAIN_RANGE','Field energy exceeds the Forge drawing range.');
   const hz=base*Math.pow(2,v.relativeSemitones/12);
   if(hz<20||hz>20000)return bad('XEN_EDIT_INTEGRAL_HZ','Field voice leaves the Forge frequency range.');
   ids.add(v.id);trackIds.add(v.trackId);
   notes.push({id:v.id,voiceId:v.voiceId??v.id,trackId:v.trackId,
    startBeat:v.startRatio*total,durationBeats:v.durationRatio*total,
    pitchHz:[hz,hz],gainCurve:[v.velocity*v.trackVolume,v.velocity*v.trackVolume],fadeInBeats:0,fadeOutBeats:0,
    derivedSource:{relativeSemitones:v.relativeSemitones,sourceLineHz:v.sourceLineHz??null,
     pan:v.pan??null,instrumentPresetOverride:v.instrumentPresetOverride??null,
     spectralWindowMeta:v.spectralWindowMeta??null,geometryVersion:v.geometryVersion??null}});
  }
  return {status:'ready',code:'XEN_EDIT_FIELD_READY',transfer:{name:String(name).slice(0,100),bars,beatsPerBar:beats,bpm:120,guideSegments:4,guideMarkers:[.25,.5,.75],
   carrier:{version:'melodic-carrier-v1',durationBeats:total,tracks:[...trackIds].map(id=>({id,label:id,enabled:true})),notes,
    origin:'derived-material-field'}}};
 }
 async function openWithOwners({sessionKind,entryId}={},owners={}){
  const token=++generation;pending=null;
  if(!['rootFollow','material'].includes(sessionKind)||typeof entryId!=='string'||!entryId.trim())
   return fail('not-applicable','XEN_EDIT_FIELD_NOT_APPLICABLE','Not an editable field entry.');
  let route;try{route=await owners.inspectSource({sessionKind,entryId})}catch{return fail('unavailable','XEN_EDIT_FIELD_INSPECT','Field cannot be inspected.');}
  if(token!==generation)return fail('superseded','XEN_EDIT_SUPERSEDED','A newer Edit operation is active.');
  if(route?.status!=='ready'||route.editor!=='spectral-forge'||!route.capability?.editContinuousField)
   return fail('not-applicable','XEN_EDIT_FIELD_NOT_APPLICABLE','Not a compatible continuous field.');
  let payload=null,built=null,owner=null;
  if(sessionKind==='rootFollow'&&route.sourceOwner==='root-follow-bank'&&route.diagnosticsCode==='XEN_EDIT_DERIVED_FIELD'){
   let bank;try{bank=await owners.readBank()}catch{return fail('unavailable','XEN_EDIT_FIELD_BANK','Bank unavailable.');}
   if(token!==generation)return fail('superseded','XEN_EDIT_SUPERSEDED','A newer Edit operation is active.');
   payload=bank?.memberIds?.includes(entryId)?bank.entryConfigs?.[entryId]:null;
   if(!payload)return fail('unavailable','XEN_EDIT_FIELD_MISSING','Selected field no longer exists.');
   let originalName=bank?.aliases?.[entryId];
   if(!originalName&&typeof owners.readMaterial==='function'){try{const material=await owners.readMaterial(entryId);if(material?.id===entryId)originalName=material.name;}catch{}}
   built=convertPattern(payload,{name:originalName||'Derived Carrier Field'});owner='root-follow-bank';
  }else if(sessionKind==='material'&&route.sourceOwner==='material-library'&&route.diagnosticsCode==='XEN_EDIT_MATERIAL_FIELD'){
   let entry;try{entry=await owners.readMaterial(entryId)}catch{return fail('unavailable','XEN_EDIT_FIELD_MATERIAL','Material field could not be read.');}
   if(token!==generation)return fail('superseded','XEN_EDIT_SUPERSEDED','A newer Edit operation is active.');
   if(!entry||entry.id!==entryId||entry.blob?.size>0)return fail('unavailable','XEN_EDIT_FIELD_MISSING','Material field changed or is ambiguous.');
   payload=entry.carrierIntegralField;
   built=convertIntegralField(payload,{name:entry.name||'Derived Carrier Field'});owner='material-library';
  }else return fail('not-applicable','XEN_EDIT_FIELD_NOT_APPLICABLE','This field type requires another native adapter.');
  if(built.status!=='ready')return built;
  pending={entryId,sessionKind,owner,token,expiresAt:Date.now()+30000,fingerprint:JSON.stringify(payload),transfer:built.transfer};
  try{if(owners.dispatch('xensonar:open-carrier-integral-editor',{source:'meta-edit-field',entryId,token})!==true)throw Error('Navigation failed');
   owners.dispatch('xensonar:meta-edit-forge-field-open',{entryId,token});
   owners.dispatch('xensonar:meta-edit-forge-field-ready',{entryId,token});}
  catch{pending=null;return fail('unavailable','XEN_EDIT_FIELD_NAV','Could not open Spectral Forge. Nothing saved.');}
  return {status:'dispatched',code:'XEN_EDIT_FIELD_SENT',editor:'spectral-forge',entryId};
 }
 async function consumeValidated(owners={}){
  const current=pending;if(!current)return null;pending=null;
  if(current.expiresAt<Date.now())return {status:'stale',reason:'Edit request expired.'};
  let payload=null;
  try{
   if(current.owner==='root-follow-bank'){
    const bank=await owners.readBank();payload=bank?.memberIds?.includes(current.entryId)?bank.entryConfigs?.[current.entryId]:null;
   }else if(current.owner==='material-library'){
    const entry=await owners.readMaterial(current.entryId);
    payload=entry?.id===current.entryId&&!entry.blob?.size?entry.carrierIntegralField:null;
   }
  }catch{return {status:'stale',reason:'Stored field could not be revalidated.'};}
  if(current.token!==generation||JSON.stringify(payload)!==current.fingerprint)
   return {status:'stale',reason:'Selected field changed during navigation.'};
  return {status:'ready',transfer:current.transfer,entryId:current.entryId};
 }
 function consumeAgainstBank(bank){const current=pending;if(!current)return null;pending=null;
  if(current.owner!=='root-follow-bank'||current.token!==generation||current.expiresAt<Date.now()||
   !bank?.memberIds?.includes(current.entryId)||JSON.stringify(bank.entryConfigs?.[current.entryId])!==current.fingerprint)
   return {status:'stale',reason:'Selected field changed during navigation.'};
  return {status:'ready',transfer:current.transfer,entryId:current.entryId};}
 function cancel(){generation++;pending=null;}
 function openSource(query){return openWithOwners(query,{inspectSource:q=>__XenMetaEditResolver.inspectSource(q),
  readBank:async()=>Yp(),readMaterial:async id=>{await __ensureMaterialLibraryHydrated();return bs().entries.find(x=>x.id===id)??await Uhe(QT,id,'Failed to read field source')},
  dispatch:(event,detail)=>{window.dispatchEvent(new CustomEvent(event,{detail}));return true}});}
 return Object.freeze({convertPattern,convertIntegralField,openWithOwners,openSource,consumeValidated,consumeAgainstBank,cancel});
})();
window.__XenMetaEditE4=__XenMetaEditE4;
/* XEN-META-EDIT-E4-END */
/* XEN-META-EDIT-E4-NATIVE-PROJECT-BEGIN */
/* Native Spectral Forge project re-entry; existing project storage and editor remain owners. */
const __XenMetaEditE4Project=(()=>{
 let generation=0,pending=null;
 const fail=(status,code,reason)=>({status,code,reason});
 const compatible=route=>route?.status==='ready'&&route.editor==='spectral-forge'&&
   route.sourceKind==='spectral-forge-project'&&route.sourceOwner==='spectral-forge-project-library'&&
   route.roundtrip==='verified-native'&&typeof route.sourceId==='string'&&!!route.sourceId;
 const valid=record=>record&&typeof record.id==='string'&&record.snapshot&&typeof record.snapshot==='object'&&
   (record.snapshot.version==null||record.snapshot.version==='spectral-forge-project-v1')&&
   record.snapshot.materialExport&&typeof record.snapshot.materialExport==='object'&&
   record.snapshot.spectralSnapshot&&record.snapshot.spectralSnapshot.length>0;
 const same=(before,after)=>after?.id===before.id&&after.updatedAt===before.updatedAt&&
   (before.contentHash==null||after.contentHash===before.contentHash);
 async function openWithOwners(query={},owners={}){
  const token=++generation;pending=null;
  let route;try{route=await owners.inspectSource(query)}catch{return fail('unavailable','XEN_EDIT_FORGE_PROJECT_INSPECT','Could not inspect saved project.');}
  if(token!==generation)return fail('superseded','XEN_EDIT_SUPERSEDED','A newer Edit selection superseded this one.');
  if(!compatible(route))return fail('not-applicable','XEN_EDIT_FORGE_PROJECT_NOT_APPLICABLE','Not a verified native Spectral Forge source.');
  let record;try{record=await owners.readProject(route.sourceId)}catch{return fail('unavailable','XEN_EDIT_FORGE_PROJECT_READ','Source project could not be read. Nothing changed.');}
  if(token!==generation)return fail('superseded','XEN_EDIT_SUPERSEDED','A newer Edit selection superseded this one.');
  if(record?.id!==route.sourceId)return fail('unavailable','XEN_EDIT_FORGE_PROJECT_MISSING','Exact saved Figure Project is unavailable.');
  if(!valid(record))return fail('unsupported','XEN_EDIT_FORGE_PROJECT_INVALID','Saved Figure Project is not a compatible snapshot.');
  pending={query:{sessionKind:query.sessionKind,entryId:query.entryId},token,projectId:route.sourceId,
   revision:{id:record.id,updatedAt:record.updatedAt,contentHash:record.contentHash},expiresAt:Date.now()+30000};
  try{
   if(owners.dispatch('xensonar:open-carrier-integral-editor',{source:'meta-edit-native-project',entryId:query.entryId,token})!==true)throw Error('Navigation rejected');
   owners.dispatch('xensonar:meta-edit-forge-field-open',{entryId:query.entryId,token});
   owners.dispatch('xensonar:meta-edit-forge-field-ready',{entryId:query.entryId,token});
  }catch{pending=null;return fail('unavailable','XEN_EDIT_FORGE_PROJECT_NAV','Spectral Forge navigation failed. Nothing saved.');}
  return {status:'dispatched',code:'XEN_EDIT_FORGE_PROJECT_SENT',editor:'spectral-forge',entryId:query.entryId};
 }
 async function consumeValidated(owners={}){
  const current=pending;if(!current)return null;pending=null;
  if(current.token!==generation||current.expiresAt<Date.now())return {status:'stale',reason:'Project Edit request expired or was superseded.'};
  let route,record;
  try{
   route=await owners.inspectSource(current.query);
   if(current.token!==generation||!compatible(route)||route.sourceId!==current.projectId)return {status:'stale',reason:'Source representation or project binding changed.'};
   record=await owners.readProject(current.projectId);
  }catch{return {status:'stale',reason:'Stored Figure Project could not be revalidated.'};}
  if(current.token!==generation||!valid(record)||!same(current.revision,record))
   return {status:'stale',reason:'Stored Figure Project changed during navigation.'};
  return {status:'ready',projectId:current.projectId,snapshot:structuredClone(record.snapshot)};
 }
 function cancel(){generation++;pending=null;}
 function openSource(query){return openWithOwners(query,{inspectSource:q=>__XenMetaEditResolver.inspectSource(q),
  readProject:id=>Y7(id),dispatch:(event,detail)=>{window.dispatchEvent(new CustomEvent(event,{detail}));return true}});}
 return Object.freeze({openWithOwners,openSource,consumeValidated,cancel});
})();
window.__XenMetaEditE4Project=__XenMetaEditE4Project;
/* XEN-META-EDIT-E4-NATIVE-PROJECT-END */

/* XEN-META-EDIT-E4-UNIFIED-INGRESS-BEGIN */
const __XenMetaForgeIntake=(()=>{
 let serial=0;
 const fail=(status,code,reason)=>({status,code,reason});
 async function openWithOwners(query,owners){
  const token=++serial;
  let route;try{route=await owners.inspectSource(query)}catch{return fail('unavailable','XEN_EDIT_FORGE_INSPECT','Cannot inspect selected source. Nothing changed.');}
  if(token!==serial)return fail('superseded','XEN_EDIT_SUPERSEDED','A newer Edit request is active.');
  if(route?.status!=='ready')return fail(route?.status||'unavailable',route?.diagnosticsCode||'XEN_EDIT_FORGE_NOT_READY',route?.reason||'No editable source.');
  if(route.editor==='audio-import'&&route.sourceKind==='raw-audio')return owners.openAudio(query);
  if(route.editor==='spectral-forge'&&route.capability?.editContinuousField)return owners.openField(query);
   if(route.editor==='spectral-forge'&&route.sourceKind==='spectral-forge-project'&&route.roundtrip==='verified-native')
    return typeof owners.openProject==='function'?owners.openProject(query):fail('unsupported','XEN_EDIT_FORGE_NATIVE_ADAPTER_MISSING','Native Figure Project loader is unavailable.');
  return fail('unsupported','XEN_EDIT_FORGE_INCOMPATIBLE',
   route.sourceKind==='spectral-forge-project'?'A verified Figure Project needs native snapshot loading; no replacement geometry was generated.':
   'This material has no compatible Spectral Forge geometry or raw audio editor.');
 }
 function cancel(){serial++;__XenMetaEditE4.cancel();__XenMetaEditE4Project.cancel();}
 function openSource(query){return openWithOwners(query,{
  inspectSource:q=>__XenMetaEditResolver.inspectSource(q),
  openAudio:q=>__XenMetaEditE2.openAudio(q),openField:q=>__XenMetaEditE4.openSource(q),
   openProject:q=>__XenMetaEditE4Project.openSource(q)
 });}
 return Object.freeze({openWithOwners,openSource,cancel});
})();
window.__XenMetaForgeIntake=__XenMetaForgeIntake;
/* XEN-META-EDIT-E4-UNIFIED-INGRESS-END */








function __xenMetaDropTarget(event,session){
 const element=document.elementFromPoint(event.clientX,event.clientY),board=element?.closest('.xen-meta-board');
 const panel=board?.closest('[data-xen-header-menu="meta"]');if(!board||!panel)return null;
 const hoveredLane=element?.closest('[data-xen-meta-column]');
 const sourceKind=session.entry.kind,sourceInSession=session.source.hasAttribute('data-xen-meta-item');
 const desired=hoveredLane?.dataset.xenMetaColumn||sourceKind;
 const cross=desired!==sourceKind;
 // Library rows retain their canonical kind; drag across lanes only for a
 // concrete Session tile with a durable compatible target owner.
 const targetKind=cross&&sourceInSession?desired:sourceKind;
 const lane=board.querySelector('[data-xen-meta-column="'+targetKind+'"]');if(!lane)return null;
 const check=cross?(sourceInSession?__xenMetaLaneCompatibility(session.entry,targetKind):
  {ok:false,reason:'Add a library source to its own lane before moving it.'}):{ok:true};
 const hoveredTile=element?.closest('[data-xen-meta-item]');
 let swapWith=null,swapReason=null;
 if(cross&&sourceInSession&&event.shiftKey&&hoveredTile){
  const other=__XenMetaSessions.snapshot().items.find(row=>row.kind===targetKind&&(row.instanceId||row.id)===hoveredTile.dataset.xenQuickId);
  if(other){
   swapWith={kind:other.kind,id:other.id};
   const otherCheck=__xenMetaLaneCompatibility(other,sourceKind);
   if(!otherCheck.ok)swapReason=otherCheck.reason;
  }
 }
 const rows=[...lane.querySelectorAll('[data-xen-meta-item]')].filter(row=>!(session.source===row));
 const next=rows.find(row=>event.clientY<row.getBoundingClientRect().top+row.getBoundingClientRect().height/2);
 return{column:lane,beforeId:next?.dataset.xenQuickId??null,kind:targetKind,
  invalidReason:!check.ok?check.reason:swapReason,blockedCrossLane:cross&&!sourceInSession,swapWith};
}
function __xenMetaRenderDropMarker(target){
 let marker=document.querySelector('.xen-meta-insertion-line');
 if(!target||target.swapWith){marker?.remove();return}
 const list=target.column.querySelector('.xen-meta-lane-items');if(!list){marker?.remove();return}
 if(!marker){marker=document.createElement('span');marker.className='xen-meta-insertion-line';marker.setAttribute('aria-hidden','true')}
 if(marker.parentElement!==list)list.append(marker);
 const listRect=list.getBoundingClientRect();
 const rows=[...list.querySelectorAll('[data-xen-meta-item]')];
 const following=rows.find(row=>row.dataset.xenQuickId===target.beforeId);
 const last=rows.at(-1);
 const y=following?following.getBoundingClientRect().top-listRect.top:
   last?last.getBoundingClientRect().bottom-listRect.top+2:12;
 marker.style.background=target.invalidReason?'#e47379':'#74f2fb';
 marker.style.top=Math.max(1,Math.min(list.clientHeight-2,y))+'px';
}
function __xenMetaCommitDrop(session){
 const target=session.metaTarget;
 const notify=message=>window.dispatchEvent(new CustomEvent('xensonar:meta-drag-note',{detail:{message}}));
 if(target?.invalidReason){notify('Cross-lane move blocked: '+target.invalidReason+' · Session unchanged.');return false;}
 if(session.source.hasAttribute('data-xen-meta-item')){
  const entry=__XenMetaSessions.snapshot().items.find(e=>e.kind===session.entry.kind&&(e.instanceId||e.id)===session.source.dataset.xenQuickId);
  if(!entry){notify('Session entry changed during drag. No move was made.');return false;}
  if(target.swapWith){
   const other=__XenMetaSessions.snapshot().items.find(e=>e.kind===target.swapWith.kind&&e.id===target.swapWith.id);
   if(!other){notify('Cross-lane swap blocked: Destination changed.');return false;}
   const ok=__XenMetaSessions.exchangeLanes(entry,other);
   notify(ok?'Swapped '+entry.name+' and '+other.name+' between Material / Root Follow in this Session draft · native sources untouched.':
     __XenMetaSessions.snapshot().error||'Cross-lane swap blocked: incompatible sources.');
   return ok;
  }
  if(target.kind!==entry.kind){
   const ok=__XenMetaSessions.reassignLane(entry,session.metaTarget.kind,session.metaTarget.beforeId);
   notify(ok?'Moved '+entry.name+' to '+(target.kind==='rootFollow'?'Root Follow Loop':'Material Track')+' in Session draft · native source unchanged.':
    __XenMetaSessions.snapshot().error||'Cross-lane move blocked: target is incompatible.');
   return ok;
  }
  return __XenMetaSessions.moveItem(entry,target.beforeId);
 }
 return __XenMetaSessions.addItem(session.entry,target.beforeId);
}
/* META-M1: Meta session-board drag -> LIVE Quick Rack only; no Session draft writes.
   Capture only the native quick-palette fields, not whole session / material payloads. */
function __xenMetaQuickRackPayload(session){
 const raw=session?.entry;if(!raw||!__XenQuick.icons[raw.kind]||typeof raw.id!=='string')return null;
 let owned=null;
 if(session.source?.hasAttribute?.('data-xen-meta-item')){
  const id=session.source.dataset.xenQuickId;
  owned=__XenMetaSessions.snapshot().items.find(item=>item.kind===raw.kind&&(item.instanceId||item.id)===id);
  if(!owned)return null; // Never downgrade an unknown session tile to a guessed library ref.
 }
 const source=owned||raw;
 return {kind:source.kind,id:source.id,name:String(source.name||source.id),
  ...(source.kind==='grid'&&source.instanceId?{instanceId:source.instanceId}:{}),
  ...(source.kind==='grid'&&source.gridProfile?{gridProfile:JSON.parse(JSON.stringify(source.gridProfile))}:{})};
}
function __xenMetaQuickRackCommit(session){
 const notice=message=>window.dispatchEvent(new CustomEvent('xensonar:meta-drag-note',{detail:{message}}));
 const payload=__xenMetaQuickRackPayload(session);
 if(!payload){notice('Quick Rack: original session item unavailable; nothing changed.');return false;}
 try{
  const current=__XenQuick.getItems();
  if(current.some(item=>__xenGridKey(item)===__xenGridKey(payload))){
   notice('Already in Live Quick Rack: '+payload.name);return true;
  }
  // Unlike add(), replaceItems writes FIRST. On quota failure the live Quick Rack stays intact.
  __XenQuick.replaceItems([...current,payload]);
  notice('Added to Live Quick Rack: '+payload.name+' · Session draft unchanged.');
  return true;
 }catch(error){notice('Quick Rack not saved: '+(error?.message||String(error))+' · Nothing changed.');return false;}
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
if(typeof window!=='undefined'&&typeof window.addEventListener==='function'){
 for(const [kind,event] of [['material','xensonar:open-material-loop-manager'],['rootFollow','xensonar:open-root-follow-loop-manager']])window.addEventListener(event,()=>__XenStarterMaterial.request(kind));
}
/* M8.1 · Entering Meta-Menu prepares *referenced*, missing starter assets
   without gating the dialog or starting audio. Do not run at page boot.
   Native click/hotkey preparation remains a fallback for direct performance. */
async function __xenMetaPrimeStarterMaterials(){
 const snap=__XenMetaSessions.snapshot(),referenced=new Set();
 const inspect=items=>{for(const entry of Array.isArray(items)?items:[])
  if(__XenStarterMaterial.requested(entry))referenced.add(entry.id)};
 inspect(snap.items);
 inspect(snap.activePalette?.items);
 for(const saved of Array.isArray(snap.saved)?snap.saved:[])inspect(saved.items);
 if(!referenced.size&&!__XenStarterMaterial.pending())return 'not-needed';
 // Material library hydrates only after the Meta-Menu is explicitly opened.
 await __ensureMaterialLibraryHydrated();
 const missing=[...referenced].find(id=>{
  const entry=bs().entries.find(item=>item.id===id);
  return !entry?.blob||entry.blob.size<=44||!__xenStarterIsDirectSynth(id);
 });
 const request=missing?{kind:'material',id:missing}:
   (__XenStarterMaterial.pending()?'material':null);
 if(!request)return 'already-ready';
 await __XenStarterMaterial.ensure(request);
 return 'prepared';
}
function __XenMetaRack(){
 const s=P.useSyncExternalStore(__XenMetaSessions.subscribe,__XenMetaSessions.snapshot,__XenMetaSessions.snapshot),[open,setOpen]=P.useState(false),[rescueOpen,setRescueOpen]=P.useState(false);
 const prepareOpen=()=>{if(!__XenMetaSessions.ensureHydrated()){setRescueOpen(true);return false}void __xenMetaPrimeStarterMaterials().catch(error=>console.warn('[meta-menu][starter-preload]',error));return true};
 P.useEffect(()=>{const openMeta=()=>{if(!__XenMetaSessions.ensureHydrated()){setRescueOpen(true);return}void __xenMetaPrimeStarterMaterials().catch(error=>console.warn('[meta-menu][starter-preload]',error));setOpen(true)};window.addEventListener('xensonar:open-meta-menu',openMeta);return()=>window.removeEventListener('xensonar:open-meta-menu',openMeta)},[]);
 return u.jsxs(P.Fragment,{children:[u.jsxs('button',{type:'button',className:'xen-meta-rack',title:'Meta-Menu · Sessions','aria-label':'Meta-Menu','aria-expanded':open||rescueOpen,onClick:()=>{if(!open&&!prepareOpen())return;setOpen(x=>!x)},children:[u.jsx('span',{className:'xen-header-unicode-icon','aria-hidden':'true',children:'🎧'}),u.jsx('span',{children:'Meta-Menu ▾'})]}),open&&ao.createPortal(u.jsx(__XenMetaEditor,{onClose:()=>setOpen(false)}),document.body),rescueOpen&&u.jsx(__XenM5ArchiveRescuePanel,{onClose:()=>setRescueOpen(false)})]});
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
  const ticket=++generation,controller=new AbortController(),session={key:selected,controller,stop:null};
  external=session;phase('preparing',selected);
  const current=()=>external===session&&ticket===generation&&!controller.signal.aborted;
  const finished=()=>{if(!current())return;external=null;try{session.stop?.()}finally{phase('idle')}};
  const playing=()=>{if(current())phase('playing',selected)};
  const failed=error=>{if(!current())return;external=null;controller.abort();try{session.stop?.()}finally{phase('failed',selected,error?.message||String(error))}};
  try{
   await __XenStarterMaterial.ensure(e);if(!current())return 'stopped';
   const owner=providers.get(e.kind);
   if(!owner||owner.available?.(e)===false){external=null;phase('failed',selected,'Library source is unavailable.');return 'unavailable'}
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
  available:e=>e?.kind==='material'?!!materialOwner()?.canPreview(e.id):!!providers.get(e?.kind)&&(__XenStarterMaterial.requested(e)||providers.get(e.kind).available?.(e)!==false),
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
 return __xenGetDeferredFn("__XenSessionPeriodDialog").apply(this, arguments);
}
function __XenMetaEditor({onClose}){
 return __xenGetDeferredFn("__XenMetaEditor").apply(this, arguments);
}

/* M8 — bounded discovery of archive sessions. No persistence reads/writes,
   no material payload copies and no unbounded option trees. */
function __xenM8SessionResults(saved,query,limit=48){
 const rows=Array.isArray(saved)?saved:[];
 const maximum=Math.max(0,Math.min(48,Math.floor(Number(limit)||0)));
 const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
 const needle=fold(query).trim();
 if(!needle)return {entries:rows.slice(0,maximum),more:rows.length>maximum};
 const entries=[];
 for(const row of rows){
  if(!row||(!fold(row.name).includes(needle)&&!fold(row.id).includes(needle)))continue;
  if(entries.length>=maximum)return {entries,more:true};
  entries.push(row);
 }
 return {entries,more:false};
}

/* Searchable popup: the trigger remains compact within the existing toolbar.
   Keyboard: Enter/Space opens, ArrowUp/Down moves, Enter chooses, Escape closes.
   The original session ID is always the selection key (not a duplicate name). */
function __XenSessionPicker({saved,value='',onSelect,label='Saved sessions',placeholder='— Saved sessions —'}){
 const [open,setOpen]=P.useState(false),[query,setQuery]=P.useState(''),[active,setActive]=P.useState(0);
 const rootRef=P.useRef(null),buttonRef=P.useRef(null),inputRef=P.useRef(null);
 const id=P.useId();
 const listId='xen-sessions-list-'+id;
 const results=P.useMemo(()=>open?__xenM8SessionResults(saved,query,48):{entries:[],more:false},[saved,open,query]);
 const current=saved.find(row=>row.id===value);
 const close=(focus=false)=>{setOpen(false);setQuery('');setActive(0);if(focus)requestAnimationFrame(()=>buttonRef.current?.focus({preventScroll:true}))};
 const show=()=>{setQuery('');setActive(0);setOpen(true)};
 const choose=row=>{onSelect(row.id);close(true)};
 P.useEffect(()=>{
  if(!open)return;
  inputRef.current?.focus({preventScroll:true});
  const outside=e=>{if(rootRef.current&&!rootRef.current.contains(e.target))close()};
  document.addEventListener('pointerdown',outside,true);
  return()=>document.removeEventListener('pointerdown',outside,true);
 },[open]);
 /* Keep the highlighted option visible during arrow-key navigation, while
    keyboard focus remains in the filter input. */
 P.useEffect(()=>{if(open)rootRef.current?.querySelectorAll('.xen-session-picker-option')[active]?.scrollIntoView?.({block:'nearest'})},[open,active,query]);
 const keyDown=e=>{
  if(e.key==='Escape'){if(open){e.preventDefault();e.stopPropagation();close(true)}return}
  if(!open){if(['ArrowDown','ArrowUp','Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();show()}return}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   e.preventDefault();e.stopPropagation();setActive(index=>Math.max(0,Math.min(results.entries.length-1,index+(e.key==='ArrowDown'?1:-1))));return;
  }
  if(e.key==='Home'||e.key==='End'){e.preventDefault();e.stopPropagation();setActive(e.key==='Home'?0:Math.max(0,results.entries.length-1));return}
  if(e.key==='Enter'){
   e.preventDefault();e.stopPropagation();const row=results.entries[active];if(row)choose(row);return;
  }
  if(e.key==='Tab')close();
 };
 return u.jsxs('div',{className:'xen-session-picker',ref:rootRef,onKeyDown:keyDown,children:[
  u.jsx('button',{ref:buttonRef,type:'button',role:'combobox','aria-label':label,'aria-expanded':open,'aria-controls':open?listId:undefined,'aria-haspopup':'listbox',className:'xen-session-picker-trigger',title:current?.name||placeholder,onClick:()=>open?close():show(),children:[u.jsx('span',{className:'xen-session-picker-current',children:current?.name||placeholder}),u.jsx('span',{'aria-hidden':true,children:'▾'})]}),
  open&&u.jsxs('div',{className:'xen-session-picker-panel',children:[
    u.jsx('input',{ref:inputRef,type:'search','aria-label':'Find session by name or ID',placeholder:'Find session by name or ID…',value:query,'aria-controls':listId,'aria-activedescendant':results.entries[active]?'xen-session-result-'+id+'-'+active:undefined,onChange:e=>{setQuery(e.target.value);setActive(0)}}),
    u.jsx('div',{className:'xen-session-picker-hint',children:results.more?'First 48 matches · refine search':results.entries.length+' matching sessions'}),
    u.jsx('div',{id:listId,role:'listbox','aria-label':label+' results',className:'xen-session-picker-results',children:results.entries.length?results.entries.map((row,index)=>u.jsxs('button',{type:'button',role:'option',id:'xen-session-result-'+id+'-'+index,'aria-selected':index===active,tabIndex:-1,className:'xen-session-picker-option'+(index===active?' is-highlighted':''),title:row.name+' · '+row.id,onMouseEnter:()=>setActive(index),onClick:()=>choose(row),children:[u.jsx('span',{children:row.name}),u.jsx('small',{children:row.id})]},row.id)):u.jsx('div',{className:'xen-session-picker-empty',children:'No sessions match'})})
  ]})
 ]});
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
   u.jsxs('label',{children:[u.jsx('span',{children:'Existing session'}),u.jsx(__XenSessionPicker,{saved:state.saved,value:selected,label:'Session to update',placeholder:'— Choose session —',onSelect:id=>{setSelected(id);const row=state.saved.find(e=>e.id===id);if(row)setName(row.name);setMessage('')}})]}),
   u.jsxs('label',{className:'xen-quick-save-include-settings',children:[u.jsx('input',{type:'checkbox',checked:includeMainRoomSettings,'aria-label':'Include Live Room Settings',onChange:e=>{setIncludeMainRoomSettings(e.target.checked);setMessage('')}}),u.jsx('span',{children:'Include Live Room Settings'})]}),
   u.jsxs('div',{className:'xen-quick-save-actions',children:[
     u.jsx('button',{type:'button',className:'is-new',disabled:!name.trim(),onClick:()=>submit('new'),children:'Save as New Session'}),
     u.jsx('button',{type:'button',className:'is-update',disabled:!selectedRow||!name.trim(),onClick:()=>submit('update'),children:'Update Session'})
   ]}),
   (message||state.error)&&u.jsx('p',{className:'xen-quick-save-error',role:'alert',children:message||state.error})
 ]})}),document.body);
}
