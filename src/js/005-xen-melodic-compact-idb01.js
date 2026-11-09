
/* ML-IDB01: one compact, live IndexedDB owner for new Melodic saves.
   No legacy-project migration, no XMEM pilot activation, no audio changes. */
(()=>{
'use strict';
const DB='xensonar-melodic-compact-v1';
const SCHEMA=1, PACK=1;
const sourceKinds=['nodalInstruments','entrophonInstruments','customInstruments'];
let dbPromise=null, bootPromise=null, state='hydrating', error='',revision=0,workRevision=0;
let storedProjects=[],projectView=[],working=null,workingRefs=new Set(),saveTimer=null,saveChain=Promise.resolve(),dirtyWorking=null,writeFailed=false;
const clone=x=>JSON.parse(JSON.stringify(x));
const equal=(a,b)=>JSON.stringify(a,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([x],[y])=>x.localeCompare(y))):v)===JSON.stringify(b,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([x],[y])=>x.localeCompare(y))):v);
function fail(message){throw Error('Melodic IDB: '+message)}
function check(v,msg){if(!v)fail(msg)}
async function hash(value){
 check(globalThis.crypto?.subtle,'WebCrypto SHA-256 unavailable; saving refused');
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
}
function open(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(Error('IndexedDB unavailable'));return}
  let request;
  try{request=indexedDB.open(DB,SCHEMA)}catch(e){reject(e);return}
  request.onupgradeneeded=()=>{
   const db=request.result;
   for(const name of ['projects','instruments','working','control'])
    if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:'id'});
  };
  request.onsuccess=()=>{
   const db=request.result;
   db.onversionchange=()=>{db.close();dbPromise=null;state='blocked';error='Database upgraded in another tab'};
   resolve(db);
  };
  request.onerror=()=>{dbPromise=null;reject(request.error||Error('IndexedDB open failed'))};
  request.onblocked=()=>{dbPromise=null;reject(Error('IndexedDB upgrade blocked by another tab'))};
 });
 return dbPromise;
}
function transaction(db,stores,mode,run){
 return new Promise((resolve,reject)=>{
  let tx,result,reason=null,done=false;
  try{
   tx=db.transaction(stores,mode);
   const rejectLater=e=>{reason=e instanceof Error?e:Error(String(e));try{tx.abort()}catch{}};
   result=run(tx,rejectLater);
   tx.oncomplete=()=>{if(!done){done=true;resolve(result?.value)}};
   tx.onabort=()=>{if(!done){done=true;reject(reason||tx.error||Error('IndexedDB transaction aborted'))}};
   tx.onerror=()=>{}; // terminal onabort decides rejection, never before rollback
  }catch(e){
   if(tx){reason=e;try{tx.abort()}catch{if(!done){done=true;reject(e)}}}
   else reject(e);
  }
 });
}
function readRows(db){return transaction(db,['projects','instruments','working','control'],'readonly',(tx,abort)=>{
 const rows={value:null},all={};let pending=4;
 for(const name of ['projects','instruments','working','control']){
  const req=tx.objectStore(name).getAll();
  req.onsuccess=()=>{all[name]=req.result;if(!--pending)rows.value=all};
  req.onerror=()=>abort(req.error||Error('Read '+name+' failed'));
 }
 return rows;
 })}
// Immutable source definitions live once in the IDB instrument bank. The track's
// instrumentPreset (e.g. nodal:<id>@<revision>) remains the musical reference.
async function packDocument(data){
 check(data&&typeof data==='object','Invalid document');
 const body=clone(data),composer=body.composer||body.loopComposer;
 check(composer&&Array.isArray(composer.tracks)&&Array.isArray(composer.notes),'Missing Melodic composer');
 const instruments=[];
 const refMap={};
 for(const kind of sourceKinds){
  if(composer[kind]===undefined)continue;
  check(composer[kind]&&typeof composer[kind]==='object'&&!Array.isArray(composer[kind]),'Invalid '+kind);
  const refs={};
  for(const [key,value] of Object.entries(composer[kind])){
   const json=JSON.stringify(value);
   check(typeof json==='string','Invalid instrument definition');
   const id='source:'+await hash(kind+'\n'+key+'\n'+json);
   refs[key]=id;
   instruments.push({id,kind,key,json});
  }
  refMap[kind]=refs;
  delete composer[kind];
 }
 const noteSets=[],index=new Map();
 function noteRef(notes){
  check(Array.isArray(notes),'Invalid note set');
  const json=JSON.stringify(notes);
  let slot=index.get(json);
  if(slot===undefined){slot=noteSets.length;noteSets.push(notes);index.set(json,slot)}
  return slot;
 }
 const mainNotes=noteRef(composer.notes);delete composer.notes;
 const variantKey=Object.hasOwn(body,'patternVariants')?'patternVariants':Object.hasOwn(body,'loopPatternVariants')?'loopPatternVariants':null;
 const variants=variantKey?body[variantKey]:null,variantRefs={};
 if(variants){
  check(typeof variants==='object'&&!Array.isArray(variants),'Invalid pattern variants');
  for(const [trackId,patterns]of Object.entries(variants)){
   check(patterns&&typeof patterns==='object'&&!Array.isArray(patterns),'Invalid track patterns');
   variantRefs[trackId]={};
   for(const [patternId,notes]of Object.entries(patterns))variantRefs[trackId][patternId]=noteRef(notes);
  }
  delete body[variantKey];
 }
 return {row:{format:PACK,body,noteSets,mainNotes,variantKey,variantRefs,refMap},instruments};
}
function unpackDocument(packed,bank){
 check(packed&&packed.format===PACK&&packed.body&&Array.isArray(packed.noteSets),'Unsupported compact record');
 const copy=clone(packed.body),composer=copy.composer||copy.loopComposer;
 check(composer&&Array.isArray(composer.tracks)&&composer.notes===undefined,'Corrupt composer data');
 const set=n=>{check(Number.isSafeInteger(n)&&n>=0&&n<packed.noteSets.length,'Broken note reference');return clone(packed.noteSets[n])};
 composer.notes=set(packed.mainNotes);
 for(const [kind,refs]of Object.entries(packed.refMap||{})){
  check(sourceKinds.includes(kind),'Unknown instrument bank');
  composer[kind]={};
  for(const [key,id]of Object.entries(refs)){
   const row=bank.get(id);
   check(row&&row.kind===kind&&row.key===key,'Missing instrument dependency: '+key);
   try{composer[kind][key]=JSON.parse(row.json)}catch{fail('Corrupt instrument definition: '+key)}
  }
 }
 if(packed.variantKey){
  check(['patternVariants','loopPatternVariants'].includes(packed.variantKey),'Invalid variant owner');
  const variants={};
  for(const [trackId,patterns]of Object.entries(packed.variantRefs||{})){
   variants[trackId]={};for(const [patternId,ref]of Object.entries(patterns))variants[trackId][patternId]=set(ref);
  }
  copy[packed.variantKey]=variants;
 }
 return copy;
}
async function verifyInstrumentBank(rows){
 for(const row of rows.instruments){
  check(typeof row.id==='string'&&typeof row.kind==='string'&&typeof row.key==='string'&&
   typeof row.json==='string','Invalid instrument bank row');
  const digest=await hash(row.kind+'\n'+row.key+'\n'+row.json);
  check(row.id==='source:'+digest,'Instrument source digest mismatch: '+row.key);
 }
}
function sourceIds(packed){
 const ids=new Set();
 for(const refs of Object.values(packed?.refMap||{}))for(const id of Object.values(refs))ids.add(id);
 return ids;
}
function equalSet(a,b){return a.size===b.size&&[...a].every(key=>b.has(key))}
async function pruneUnusedBank(){
 const db=await open();
 return transaction(db,['projects','working','instruments'],'readwrite',(tx,abort)=>{
  let projectRows,workRow,ready=0;
  const schedule=()=>{
   if(++ready!==2)return;
   try{
    const used=new Set();
    for(const record of projectRows)for(const id of sourceIds(record.packed))used.add(id);
    if(workRow)for(const id of sourceIds(workRow.packed))used.add(id);
    const bank=tx.objectStore('instruments'),keys=bank.getAllKeys();
    keys.onsuccess=()=>{try{for(const id of keys.result)if(!used.has(id))bank.delete(id)}catch(e){abort(e)}};
    keys.onerror=()=>abort(keys.error||Error('Instrument inventory failed'));
   }catch(e){abort(e)}
  };
  const projects=tx.objectStore('projects').getAll();
  projects.onsuccess=()=>{projectRows=projects.result;schedule()};
  projects.onerror=()=>abort(projects.error||Error('Project inventory failed'));
  const working=tx.objectStore('working').get('current');
  working.onsuccess=()=>{workRow=working.result??null;schedule()};
  working.onerror=()=>abort(working.error||Error('Working inventory failed'));
 });
}
function dataFromRows(rows){
 const bank=new Map(rows.instruments.map(row=>[row.id,row]));
 const projects=[...rows.projects].sort((a,b)=>a.ordinal-b.ordinal).map(row=>{
  check(typeof row.id==='string'&&Number.isSafeInteger(row.ordinal)&&row.ordinal>=0&&row.packed,'Corrupt project row');
  const doc=unpackDocument(row.packed,bank);check(doc.id===row.id,'Project ID mismatch');return doc;
 });
 const ids=new Set(projects.map(p=>p.id));check(ids.size===projects.length,'Duplicate project identities');
 const wc=rows.working.find(row=>row.id==='current')||null;
 const current=wc?unpackDocument(wc.packed,bank):null;
 const head=rows.control.find(row=>row.id==='projects')||{revision:0};
 const wHead=rows.control.find(row=>row.id==='working')||{revision:0};
 check(Number.isSafeInteger(head.revision)&&head.revision>=0,'Bad project generation');
 check(Number.isSafeInteger(wHead.revision)&&wHead.revision>=0,'Bad working generation');
 return {projects,working:current,workingRefs:wc?sourceIds(wc.packed):new Set(),revision:head.revision,workRevision:wHead.revision};
}
async function preload(){
 if(bootPromise)return bootPromise;
 bootPromise=(async()=>{
  try{
   const db=await open(),rows=await readRows(db);
   await verifyInstrumentBank(rows);const loaded=dataFromRows(rows);
   storedProjects=loaded.projects;revision=loaded.revision;workRevision=loaded.workRevision;working=loaded.working;workingRefs=loaded.workingRefs;
   state='active';error='';return status();
  }catch(e){state='blocked';error=String(e?.message||e);console.error('[melodic][compact-idb-preload]',e);throw e}
 })();
 return bootPromise;
}
function status(){return Object.freeze({status:state,revision,count:storedProjects.length,lastError:error,storage:'indexeddb',format:'compact-v1'})}
function active(){return state==='active'}
function snapshot(){check(active(),'Project library not ready');return clone(projectView.length||!storedProjects.length?projectView:storedProjects)}
function event(){window.dispatchEvent(new CustomEvent('xensonar:melodic-project-library-changed',
 {detail:{projects:snapshot(),source:'melodic-idb01',revision}}))}
function normalize(){
 const fn=window.__XMEM02CNormalizeProjects;
 check(typeof fn==='function','Melodic normalizer unavailable');
 projectView=fn(storedProjects);event();return status();
}
async function bootstrap(){await preload();return normalize()}
async function commit({projects,expectedProjects}={}){
 check(active()&&typeof window.__XMEM02CNormalizeProjects==='function','IDB project library not ready');
 check(Array.isArray(projects)&&Array.isArray(expectedProjects),'Missing project revision contract');
 check(equal(expectedProjects,snapshot()),'Stale project selection; reload required');
 const normalized=window.__XMEM02CNormalizeProjects(projects),packed=[];
 const oldById=new Map(storedProjects.map((item,ordinal)=>[item.id,{item,ordinal}]));
 const seen=new Set();for(const [ordinal,doc] of normalized.entries()){
  check(!seen.has(doc.id),'Duplicate project ID');seen.add(doc.id);
  const previous=oldById.get(doc.id);
  if(previous&&previous.ordinal===ordinal&&equal(previous.item,doc))continue;
  const pack=await packDocument(doc);
  packed.push({id:doc.id,ordinal,packed:pack.row,instruments:pack.instruments});
 }
 const deletions=storedProjects.filter(row=>!seen.has(row.id)).map(row=>row.id);
 if(!packed.length&&!deletions.length)return status();
 const targetRevision=revision;
 const db=await open();
 await transaction(db,['projects','instruments','control'],'readwrite',(tx,abort)=>{
  const control=tx.objectStore('control'),table=tx.objectStore('projects'),bank=tx.objectStore('instruments');
  const request=control.get('projects');
  request.onsuccess=()=>{
   try{
    if((request.result?.revision??0)!==targetRevision)fail('Another tab changed the project library');
    for(const id of deletions)table.delete(id);
    for(const record of packed){table.put({id:record.id,ordinal:record.ordinal,packed:record.packed});
     for(const item of record.instruments)bank.put(item)}
    control.put({id:'projects',revision:targetRevision+1});
   }catch(e){abort(e)}
  };
  request.onerror=()=>abort(request.error||Error('Project revision read failed'));
 });
 // Confirm physical readback and reconstructed project identities before UI success.
 const verifiedRows=await readRows(db);await verifyInstrumentBank(verifiedRows);
 const verified=dataFromRows(verifiedRows);
 check(verified.revision===targetRevision+1&&equal(verified.projects,normalized),
  'Project readback differs; IDB state requires recovery');
 storedProjects=verified.projects;revision=verified.revision;
 try{await pruneUnusedBank()}catch(e){console.warn('[melodic][instrument-orphan-prune-deferred]',e)}
 normalize();return status();
}
function workingSnapshot(){
 check(active(),'Working copy not ready');return dirtyWorking?clone(dirtyWorking):working?clone(working):null;
}
async function persistWorking(payload){
 check(active()&&!writeFailed,'Melodic working copy save protected');
 const packed=await packDocument(payload),target=workRevision,db=await open();
 const changedBank=!equalSet(sourceIds(packed.row),workingRefs);
 await transaction(db,['working','instruments','control'],'readwrite',(tx,abort)=>{
  const control=tx.objectStore('control'),get=control.get('working');
  get.onsuccess=()=>{
   try{
    if((get.result?.revision??0)!==target)fail('Working copy changed in another tab');
    const bank=tx.objectStore('instruments');for(const item of packed.instruments)bank.put(item);
    tx.objectStore('working').put({id:'current',packed:packed.row});
    control.put({id:'working',revision:target+1});
   }catch(e){abort(e)}
  };
  get.onerror=()=>abort(get.error||Error('Working revision read failed'));
 });
 const confirmed=await transaction(db,['working','control'],'readonly',(tx,abort)=>{
  const out={value:null},read={};let count=2;
  for(const [store,key] of [['working','current'],['control','working']]){
   const req=tx.objectStore(store).get(key);
   req.onsuccess=()=>{read[store]=req.result;if(!--count)out.value=read};
   req.onerror=()=>abort(req.error||Error('Working readback failed'));
  }
  return out;
 });
 check(confirmed.control?.revision===target+1&&equal(confirmed.working?.packed,packed.row),
  'Working copy readback differs; last committed revision protected');
 working=clone(payload);workRevision=target+1;workingRefs=sourceIds(packed.row);
 if(changedBank)try{await pruneUnusedBank()}catch(e){console.warn('[melodic][instrument-orphan-prune-deferred]',e)}
 // Only remove a truly empty old key: this release does not migrate or delete legacy projects.
 try{if(localStorage.getItem('xensonar.nodal.melodic-session.v1')==='')localStorage.removeItem('xensonar.nodal.melodic-session.v1')}catch{}
}
function enqueueSave(payload){
 if(!active()||writeFailed)return false;
 dirtyWorking=clone(payload);
 if(saveTimer!==null)clearTimeout(saveTimer);
 saveTimer=setTimeout(()=>{saveTimer=null;void flush().catch(e=>console.error('[melodic][compact-idb-save]',e))},160);
 return true;
}
function flush(){
 if(saveTimer!==null){clearTimeout(saveTimer);saveTimer=null}
 if(!dirtyWorking)return saveChain;
 const payload=dirtyWorking;dirtyWorking=null;
 saveChain=saveChain.then(()=>persistWorking(payload)).catch(e=>{
  writeFailed=true;error=String(e?.message||e);
  console.error('[melodic][compact-idb-protected]',e);throw e;
 });
 return saveChain;
}
function assertOrphan(row){
 check(active()&&!writeFailed,'Melodic IDB unavailable; deletion forbidden');
 const ids=[row?.itemId,row?.materialId].filter(id=>typeof id==='string'&&id);
 const all=new Set(ids.flatMap(id=>[id,'sample:'+id,'melodic-sample:'+id,'asset:'+id]));
 if(['nodal','entrophon'].includes(row?.owner)&&Number.isSafeInteger(row?.revision))
  for(const id of ids)all.add(row.owner+':'+id+'@'+row.revision);
 const visits=[...projectView.filter(item=>!(row?.owner==='melodicProject'&&item.id===row.itemId)),working,dirtyWorking];
 for(const root of visits){if(!root)continue;const stack=[root],seen=new WeakSet();let steps=0;
  while(stack.length){const value=stack.pop();
   if(typeof value==='string'){if(all.has(value))fail('Still referenced in Melodic session. Delete its session in Meta first.');continue}
   if(!value||typeof value!=='object'||seen.has(value))continue;seen.add(value);
   if(++steps>250000)fail('Too many Melodic references; deletion forbidden');
   if(Array.isArray(value))for(const item of value)stack.push(item);
   else for(const [key,item]of Object.entries(value))stack.push(key,item);
  }
 }
 return true;
}
window.__XenMelodicCompact=Object.freeze({
 DB,preload,bootstrap,loadedWorking:workingSnapshot,enqueueSave,flush,status,assertOrphan,
 packDocument,unpackDocument // pure-format regression probe, not a mutable app owner
});
// Reuse already integrated async project-save/react-event call sites. Do not enable
// the old XMEM pilot: it intentionally disables normal package backup/restore.
window.XenSonarXMemMelodicCutoverTest=Object.freeze({
 status,active,snapshot,bootstrap,commit,legacyAllowed:()=>false
});
})();

