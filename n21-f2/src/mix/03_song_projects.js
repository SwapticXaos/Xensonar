/* Song Projects: reference-only organization. No adapters.choose or audio calls. */
function __xenValidateSong(value){
 const text=(v,label)=>{if(typeof v!=='string'||!v.trim()||v.length>1024)throw Error('Invalid '+label);return v};
 if(!value||value.version!==1||Object.keys(value).some(k=>!['version','id','name','activePartId','parts'].includes(k))||!Array.isArray(value.parts)||!value.parts.length)throw Error('Invalid song manifest.');
 const ids=new Set();const parts=value.parts.map(p=>{if(!p||Object.keys(p).some(k=>!['id','name','items'].includes(k)))throw Error('Invalid part.');const id=text(p.id,'part ID');if(ids.has(id))throw Error('Duplicate part ID.');ids.add(id);return{id,name:text(p.name,'part name'),items:__xenValidateQuickItems(p.items)}});
 if(!ids.has(value.activePartId))throw Error('The selected part is missing.');
 return{version:1,id:text(value.id,'song ID'),name:text(value.name,'song name'),activePartId:value.activePartId,parts};
}
function __createXenSongStore(storage,quick){
 const key='xensonar.song-projects.v1',listeners=new Set(),clone=v=>JSON.parse(JSON.stringify(v));
 let state={version:1,saved:[],drafts:[],selectedId:null,error:''},activated=null;
 const uid=prefix=>prefix+'-'+(globalThis.crypto?.randomUUID?.()??Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
 const selected=()=>state.drafts.find(s=>s.id===state.selectedId)??null;
 const part=()=>{const s=selected();return s?.parts.find(p=>p.id===s.activePartId)??null};
 const emit=()=>{for(const fn of listeners)fn()};
 function persist(next){const payload={version:1,saved:next.saved,drafts:next.drafts,selectedId:next.selectedId};const json=JSON.stringify(payload);if(json.length*2>4*1024*1024)throw Error('Song library exceeds the 4 MiB UTF-16 storage budget. Export songs before adding more.');storage.setItem(key,json)}
 function change(fn){try{const next=clone(state);fn(next);persist(next);state={...next,error:''};emit();return true}catch(error){state={...state,error:'Song Projects: '+error.message};emit();return false}}
 function edit(fn){return change(next=>{const song=next.drafts.find(s=>s.id===next.selectedId);if(!song)throw Error('Create or load a song first.');fn(song)})}
 function newSong(name='New Song',source){return change(next=>{const song=source?clone(source):{version:1,id:uid('song'),name,activePartId:'',parts:[{id:uid('part'),name:'Intro',items:[]}]};song.id=uid('song');if(source){song.parts=song.parts.map(p=>{const id=uid('part');if(p.id===source.activePartId)song.activePartId=id;return{...p,id}});song.name=name}else song.activePartId=song.parts[0].id;const valid=__xenValidateSong(song);next.drafts.push(valid);next.selectedId=valid.id})}
 function load(){try{const raw=storage.getItem(key);if(!raw)return;const v=JSON.parse(raw);if(v.version!==1||!Array.isArray(v.saved)||!Array.isArray(v.drafts))throw Error('Invalid stored library.');const saved=v.saved.map(__xenValidateSong),drafts=v.drafts.map(__xenValidateSong);for(const list of [saved,drafts])if(new Set(list.map(s=>s.id)).size!==list.length)throw Error('Duplicate song ID.');if(v.selectedId!==null&&!drafts.some(s=>s.id===v.selectedId))throw Error('Invalid selected song.');state={version:1,saved,drafts,selectedId:v.selectedId,error:''}}catch(error){state={...state,error:'Song Projects could not load: '+error.message}}}
 load();
 return{liveStatus:()=>activated?{...activated,differs:JSON.stringify(quick.getItems())!==JSON.stringify(activated.items)}:null,key,snapshot:()=>state,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),selected,part,
  dirty:()=>{const song=selected();return !!song&&JSON.stringify(song)!==JSON.stringify(state.saved.find(s=>s.id===song.id))},
  createSong:newSong,loadSong:id=>change(n=>{if(!n.drafts.some(s=>s.id===id))throw Error('Unknown song.');n.selectedId=id}),
  saveSong:()=>change(n=>{const song=__xenValidateSong(n.drafts.find(s=>s.id===n.selectedId));const i=n.saved.findIndex(s=>s.id===song.id);if(i<0)n.saved.push(song);else n.saved[i]=song}),
  renameSong:name=>edit(s=>{s.name=__xenValidateSong({...s,name}).name}),
  duplicateSong:()=>{const s=selected();return s?newSong(s.name+' copy',s):false},
  deleteSong:()=>change(n=>{n.saved=n.saved.filter(s=>s.id!==n.selectedId);n.drafts=n.drafts.filter(s=>s.id!==n.selectedId);n.selectedId=n.drafts[0]?.id??null}),
  restoreSaved:()=>change(n=>{const s=n.saved.find(s=>s.id===n.selectedId);if(!s)throw Error('This song has no saved version.');n.drafts[n.drafts.findIndex(s=>s.id===n.selectedId)]=clone(s)}),
  selectPart:id=>edit(s=>{if(!s.parts.some(p=>p.id===id))throw Error('Unknown part.');s.activePartId=id}),
  createPart:(name='New Part')=>edit(s=>{const p={id:uid('part'),name,items:[]};s.parts.push(p);s.activePartId=p.id;__xenValidateSong(s)}),
  renamePart:name=>edit(s=>{s.parts.find(p=>p.id===s.activePartId).name=name;__xenValidateSong(s)}),
  duplicatePart:()=>edit(s=>{const p=clone(s.parts.find(p=>p.id===s.activePartId));p.id=uid('part');p.name+=' copy';s.parts.push(p);s.activePartId=p.id}),
  deletePart:()=>edit(s=>{if(s.parts.length===1)throw Error('Keep at least one part.');s.parts=s.parts.filter(p=>p.id!==s.activePartId);s.activePartId=s.parts[0].id}),
  replaceItems:items=>edit(s=>{s.parts.find(p=>p.id===s.activePartId).items=__xenValidateQuickItems(items)}),
  addItem:entry=>edit(s=>{const p=s.parts.find(p=>p.id===s.activePartId);p.items=__xenValidateQuickItems([...p.items,entry])}),
  removeItem:entry=>edit(s=>{const p=s.parts.find(p=>p.id===s.activePartId);p.items=p.items.filter(e=>e.kind!==entry.kind||e.id!==entry.id)}),
  moveItem:(entry,beforeId=null)=>edit(s=>{const p=s.parts.find(p=>p.id===s.activePartId);const i=p.items.findIndex(e=>e.kind===entry.kind&&e.id===entry.id);if(i<0)return;const [item]=p.items.splice(i,1);const target=p.items.findIndex(e=>e.kind===item.kind&&e.id===beforeId);let at=target;if(at<0){at=p.items.findLastIndex(e=>e.kind===item.kind)+1;if(!at)at=p.items.length}p.items.splice(at,0,item)}),
  useCurrentQuickAccess:()=>{try{return edit(s=>{s.parts.find(p=>p.id===s.activePartId).items=__xenValidateQuickItems(quick.getItems())})}catch{return false}},
  activatePart:()=>{try{if(!part())throw Error('Select a part first.');if(quick.replaceItems(part().items)===false)throw Error('Quick Access could not activate this part.');activated={songId:selected().id,partId:part().id,songName:selected().name,partName:part().name,items:clone(part().items)};state={...state,error:''};emit();return true}catch(error){state={...state,error:error.message};emit();return false}},
  diagnostics:(song=selected())=>song? song.parts.flatMap(p=>p.items.filter(e=>!quick.adapters.get(e.kind)?.entries.some(a=>String(a.id)===e.id)).map(e=>({partId:p.id,...e,message:'Missing library reference'}))):[],
  exportManifest:()=>{if(!selected())throw Error('Select a song first.');return JSON.stringify({format:'xensonar.song-manifest',version:1,referenceOnly:true,song:__xenValidateSong(selected())},null,2)},
  importManifest:raw=>{try{if(typeof raw!=='string'||raw.length>4*1024*1024)throw Error('Manifest exceeds 4 MiB.');const v=JSON.parse(raw);if(!v||v.format!=='xensonar.song-manifest'||v.version!==1||v.referenceOnly!==true||Object.keys(v).some(k=>!['format','version','referenceOnly','song'].includes(k)))throw Error('Invalid reference-only song manifest.');const s=__xenValidateSong(v.song);return newSong(s.name,s)}catch(error){state={...state,error:'Import failed: '+error.message};emit();return false}},
  reportError:error=>{state={...state,error:String(error)};emit()},reload:()=>{load();emit()}
 };
}
const __XenSongProjects=__createXenSongStore(localStorage,__XenQuick);
function __xenSongDropTarget(event,session){
 const hit=document.elementFromPoint(event.clientX,event.clientY),column=hit?.closest('[data-xen-song-column]');
 if(!column||column.dataset.xenSongColumn!==session.entry.kind||!__XenSongProjects.part())return null;
 const row=hit.closest('[data-xen-song-item]'),box=row?.getBoundingClientRect();
 const after=box&&event.clientY>=box.top+box.height/2;
 let beforeId=row?.dataset.xenQuickId??null;
 if(after){const rows=[...column.querySelectorAll('[data-xen-song-item]')];beforeId=rows[rows.indexOf(row)+1]?.dataset.xenQuickId??null}
 return{column,beforeId};
}
function __xenSongCommitDrop(session){
 if(session.source.hasAttribute('data-xen-song-item')){
  if(session.songTarget.beforeId!==session.entry.id)__XenSongProjects.moveItem(session.entry,session.songTarget.beforeId);
 }else __XenSongProjects.addItem(session.entry);
}
function __SongProjectsRack(){
 const state=P.useSyncExternalStore(__XenSongProjects.subscribe,__XenSongProjects.snapshot,__XenSongProjects.snapshot),[open,setOpen]=P.useState(false);
 P.useSyncExternalStore(__XenQuick.subscribe,__XenQuick.snapshot,__XenQuick.snapshot);
 const song=__XenSongProjects.selected(),dirty=__XenSongProjects.dirty(),live=__XenSongProjects.liveStatus();
 return u.jsxs(P.Fragment,{children:[u.jsx('button',{type:'button',className:'xen-song-rack','aria-label':'Song Projects','aria-expanded':open,onClick:()=>setOpen(!open),title:song? song.name+(dirty?' · unsaved changes':''):'Song Projects',children:'🎼 Song Projects'+(dirty?' *':'')+(live?.differs?' Δ':'')+' ▾'}),open&&ao.createPortal(u.jsx(__SongProjectsEditor,{onClose:()=>setOpen(false)}),document.body)]});
}
function __SongProjectsEditor({onClose}){
 const state=P.useSyncExternalStore(__XenSongProjects.subscribe,__XenSongProjects.snapshot,__XenSongProjects.snapshot);
 P.useSyncExternalStore(__XenQuick.subscribe,__XenQuick.snapshot,__XenQuick.snapshot);
 const [kind,setKind]=P.useState('grid'),[search,setSearch]=P.useState(''),[message,setMessage]=P.useState('');
 const input=P.useRef(null),panel=P.useRef(null),song=__XenSongProjects.selected(),part=__XenSongProjects.part();
 const labels={grid:'Threadboard',material:'Material Track',rootFollow:'Root Follow Loop',drum:'Drums',bass:'Bass'};
 const entries=(__XenQuick.adapters.get(kind)?.entries??[]).filter(e=>String(e.name??e.label??e.id).toLowerCase().includes(search.toLowerCase()));
 const live=__XenSongProjects.liveStatus();
 const missing=__XenSongProjects.diagnostics(),isMissing=e=>missing.some(m=>m.partId===part?.id&&m.kind===e.kind&&m.id===e.id);
 P.useEffect(()=>{panel.current?.focus();return()=>document.querySelector('[aria-label="Song Projects"]')?.focus()},[]);
 const ask=(label,current,fn)=>{const name=window.prompt(label,current);if(name?.trim())fn(name.trim())};
 const button=(name,fn,disabled=false)=>u.jsx('button',{type:'button',disabled,onClick:fn,children:name},name);
 const exportSong=()=>{try{const blob=new Blob([__XenSongProjects.exportManifest()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(song.name.replace(/[^a-z0-9_-]/gi,'_')||'song')+'.song.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),0);setMessage('Reference-only manifest exported. Materials remain in their libraries.')}catch(error){__XenSongProjects.reportError(error.message)}};
 return u.jsx('div',{className:'xen-song-overlay','data-xen-header-menu':'song',onPointerDown:e=>e.stopPropagation(),onClick:onClose,onKeyDown:e=>{e.stopPropagation();if(e.key==='Escape')onClose()},children:u.jsxs('section',{className:'xen-song-editor',role:'dialog','aria-modal':true,'aria-label':'Song Projects editor',tabIndex:-1,ref:panel,onClick:e=>e.stopPropagation(),children:[
  u.jsxs('header',{children:[u.jsx('strong',{children:'🎼 Song Projects'}),u.jsx('select',{'aria-label':'Song',value:state.selectedId??'',onChange:e=>__XenSongProjects.loadSong(e.target.value),children:[!song&&u.jsx('option',{value:'',children:'Select a song'}),...state.drafts.map(s=>u.jsx('option',{value:s.id,children:s.name+(JSON.stringify(s)!==JSON.stringify(state.saved.find(a=>a.id===s.id))?' *':'')},s.id))]}),u.jsx('span',{'aria-label':'Song save status',children:song?(__XenSongProjects.dirty()?'Unsaved changes *':'Saved'):''}),button('Close',onClose)]}),
  u.jsxs('div',{className:'xen-song-toolbar',children:[button('New Song',()=>ask('Song name','New Song',n=>__XenSongProjects.createSong(n))),button('Save Song',()=>__XenSongProjects.saveSong(),!song),button('Rename Song',()=>ask('Song name',song.name,n=>__XenSongProjects.renameSong(n)),!song),button('Duplicate Song',()=>__XenSongProjects.duplicateSong(),!song),button('Delete Song',()=>{if(window.confirm('Delete this song and its draft?'))__XenSongProjects.deleteSong()},!song),button('Reload Saved',()=>__XenSongProjects.restoreSaved(),!song||!state.saved.some(s=>s.id===song.id)),button('Export Manifest',exportSong,!song),button('Import Manifest',()=>input.current?.click()),u.jsx('input',{type:'file',accept:'.json,application/json',hidden:true,ref:input,onChange:async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>4*1024*1024){__XenSongProjects.reportError('Manifest exceeds 4 MiB.');return}try{if(__XenSongProjects.importManifest(await file.text()))setMessage('Imported reference-only manifest; '+__XenSongProjects.diagnostics().length+' missing references.')}catch(error){__XenSongProjects.reportError(error.message)}}})]}),
  u.jsxs('div',{className:'xen-song-workspace',children:[u.jsxs('div',{className:'xen-song-library',children:[u.jsx('div',{role:'tablist','aria-label':'Material libraries',children:__XenSongKinds.map(k=>u.jsx('button',{type:'button',role:'tab','aria-selected':k===kind,'aria-controls':'xen-song-library-list',onClick:()=>{setKind(k);setSearch('')},children:labels[k]},k))}),u.jsx('input',{'aria-label':'Search library',placeholder:'Search library',value:search,onChange:e=>setSearch(e.target.value)}),u.jsxs('div',{id:'xen-song-library-list',role:'tabpanel','aria-label':labels[kind]+' library',className:'xen-song-library-list',children:[...entries.map(e=>{const entry={kind,id:String(e.id),name:String(e.name??e.label??e.id)};return u.jsxs('div',{...__quickProps(kind,entry.id,entry.name),className:'xen-song-library-row',children:[u.jsx('span',{children:__XenQuick.icons[kind]+' '+entry.name}),u.jsx('button',{type:'button','aria-label':'Add '+entry.name,disabled:!part,onClick:()=>__XenSongProjects.addItem(entry),children:'+'})]},entry.id)}),!entries.length&&u.jsx('p',{children:'No matching library entries.'})]})]}),u.jsxs('div',{className:'xen-song-constellation',children:[u.jsx('strong',{children:'Song Quick Access'}),u.jsx('p',{className:'xen-song-help',children:'Drag library entries into their column. Drag tiles to reorder; right-click to remove.'}),u.jsx('div',{className:'xen-song-scroll',children:u.jsx(__QuickColumns,{items:part?.items??[],variant:'xen-song-columns',render:(e,i)=>u.jsxs('button',{...__quickProps(e.kind,e.id,e.name),type:'button',className:'xen-quick-tile xen-song-tile'+(isMissing(e)?' is-missing':''),'data-xen-song-item':true,title:e.name+(isMissing(e)?' · Missing library reference':''),'aria-label':e.name+(isMissing(e)?' (missing)':''),onContextMenu:event=>{event.preventDefault();__XenSongProjects.removeItem(e)},onKeyDown:event=>{if(event.key==='Delete'){event.preventDefault();__XenSongProjects.removeItem(e)}if(event.altKey&&['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const list=part.items.filter(a=>a.kind===e.kind);__XenSongProjects.moveItem(e,event.key==='ArrowUp'?list[Math.max(0,i-1)]?.id:list[i+2]?.id)}},children:[u.jsx('span',{children:__XenQuick.icons[e.kind]+' '+(i+1)}),u.jsx('span',{className:'xen-song-name',children:e.name}),isMissing(e)&&u.jsx('span',{'aria-label':'Missing reference',children:'⚠'})]},e.kind+':'+e.id)})})]})]}),
  u.jsxs('footer',{children:[u.jsx('label',{children:'Part:'}),u.jsx('select',{'aria-label':'Part',value:part?.id??'',disabled:!song,onChange:e=>__XenSongProjects.selectPart(e.target.value),children:song?.parts.map(p=>u.jsx('option',{value:p.id,children:p.name},p.id))}),button('New Part',()=>ask('Part name','New Part',n=>__XenSongProjects.createPart(n)),!song),button('Rename Part',()=>ask('Part name',part.name,n=>__XenSongProjects.renamePart(n)),!part),button('Duplicate Part',()=>__XenSongProjects.duplicatePart(),!part),button('Delete Part',()=>__XenSongProjects.deletePart(),!song||song.parts.length<=1),button('Use Current Quick Access',()=>__XenSongProjects.useCurrentQuickAccess(),!part),button('Activate Part',()=>{if(__XenSongProjects.activatePart())setMessage('Part prepared in Quick Access.')},!part)]}),
  live&&u.jsx('small',{'data-xen-song-live-status':true,children:'Live Quick Access: '+live.songName+' · '+live.partName+(live.differs?' · changed Δ — Use Current Quick Access to capture into the selected part.':' · activated constellation')}),
  u.jsx('div',{role:'status',className:'xen-song-status',children:state.error||message||(missing.length?missing.length+' missing library references. References are retained.':'')}),u.jsx('small',{children:'Manifest = references only. Use the existing full Tüftel package to transfer libraries and resources.'})
 ]})});
}
