
/* XMEM-02B — isolated, opt-in Melodic IDB repository pilot.
 * The existing j7/G7/React/Package Station remain the only live app owners.
 * This is a transactional, revisioned pilot to validate an eventual safe cutover.
 * No startup I/O. No original localStorage writes, deletions or audio changes.
 */
(()=>{
'use strict';
 if(window.__XMEM_MR03_ENABLE_MELODIC__!==true)return;

const LEGACY='xensonar-melodic-loop-projects-v1';
const DB='xensonar-xmem-melodic-repository-pilot-v1';
const RECORDS='records',CONTROL='control',HEAD='head',VERSION=1;
const MAX_COUNT=5000,MAX_CHARS=16*1024*1024;
let localBusy=false;
function fail(message){throw Error('XMEM-02B: '+message)}
function validateProject(project){
 if(!project||typeof project!=='object'||Array.isArray(project)||
  typeof project.id!=='string'||!project.id.trim()||
  !project.composer||!Array.isArray(project.composer.tracks))fail('Invalid Melodic project');
 return project;
}
function validateList(projects){
 if(!Array.isArray(projects)||projects.length>MAX_COUNT)fail('Invalid project list or excessive count');
 const ids=new Set();for(const p of projects){validateProject(p);if(ids.has(p.id))fail('Duplicate project ID');ids.add(p.id)}
 return projects;
}
async function digest(data){
 if(!globalThis.crypto?.subtle)fail('WebCrypto SHA-256 is required');
 const bytes=new TextEncoder().encode(data);
 const sha=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(sha),b=>b.toString(16).padStart(2,'0')).join('');
}
async function snapshotLegacy(){
 let raw;try{raw=localStorage.getItem(LEGACY)}catch(e){fail('Legacy source unreadable: '+e.message)}
 if(raw===null)fail('Legacy library missing; migration cannot start');
 let projects;try{projects=JSON.parse(raw)}catch{fail('Legacy JSON invalid')}
 validateList(projects);
 return {raw,hash:await digest(raw),projects};
}
function open(){return new Promise((resolve,reject)=>{
 if(typeof indexedDB==='undefined'){reject(Error('IndexedDB unavailable'));return}
 let settled=false,req;
 try{req=indexedDB.open(DB,VERSION)}catch(e){reject(e);return}
 req.onupgradeneeded=()=>{
  const db=req.result;
  if(!db.objectStoreNames.contains(RECORDS))db.createObjectStore(RECORDS,{keyPath:'id'});
  if(!db.objectStoreNames.contains(CONTROL))db.createObjectStore(CONTROL,{keyPath:'id'});
 };
 req.onsuccess=()=>{if(!settled){settled=true;resolve(req.result)}};
 req.onerror=()=>{if(!settled){settled=true;reject(req.error||Error('IDB open error'))}};
 req.onblocked=()=>{if(!settled){settled=true;reject(Error('IDB upgrade blocked by other tab'))}};
})}
async function openExisting(){
 if(typeof indexedDB==='undefined'||typeof indexedDB.databases!=='function')
  fail('Cannot safely check database existence without indexedDB.databases()');
 const dbs=await indexedDB.databases();
 if(!dbs.some(item=>item.name===DB))fail('Pilot database missing; run prepare() explicitly');
 return open();
}
function transactionalWrite(db,{expectedHead,changes,nextHead,bootstrap=false}){
 return new Promise((resolve,reject)=>{
  let tx,settled=false;
  const rejectOnce=e=>{if(!settled){settled=true;reject(e)}};
  try{
   tx=db.transaction([RECORDS,CONTROL],'readwrite');
   const headStore=tx.objectStore(CONTROL),rows=tx.objectStore(RECORDS);
   const get=headStore.get(HEAD);
   get.onsuccess=()=>{
    try{
     const live=get.result??null;
     if(bootstrap){if(live!==null)fail('Pilot already initialized; refusing overwrite')}
     else if(!live||live.revision!==expectedHead||live.contentDigest!==nextHead.previousDigest)
      fail('Stale head revision or concurrent writer; commit refused');
     // Queue all writes in this transaction, with no async/await inside the callback.
     for(const row of changes)rows.put(row);
     headStore.put(nextHead);
    }catch(e){rejectOnce(e);try{tx.abort()}catch{}}
   };
   get.onerror=()=>rejectOnce(get.error||Error('Head read failed'));
   tx.oncomplete=()=>{if(!settled){settled=true;resolve()}};
   tx.onabort=()=>rejectOnce(tx.error||Error('IDB transaction aborted'));
   tx.onerror=()=>rejectOnce(tx.error||Error('IDB transaction error'));
  }catch(e){try{tx?.abort()}catch{}rejectOnce(e)}
 })
}
function readRaw(db){return new Promise((resolve,reject)=>{
 let tx,head=null,rows=[],cursorMismatch=false;
 try{
  tx=db.transaction([RECORDS,CONTROL],'readonly');
  const a=tx.objectStore(CONTROL).get(HEAD),c=tx.objectStore(RECORDS).openCursor();
  a.onsuccess=()=>{head=a.result??null};
  c.onsuccess=()=>{const cur=c.result;if(!cur)return;if(cur.primaryKey!==cur.value?.id)cursorMismatch=true;rows.push(cur.value);cur.continue()};
  tx.oncomplete=()=>cursorMismatch?reject(Error('IDB primary key differs from record ID')):resolve({head,rows});
  tx.onerror=()=>reject(tx.error||Error('IDB read error'));
  tx.onabort=()=>reject(tx.error||Error('IDB read abort'));
 }catch(e){reject(e)}
})}
async function ledger(rows){
 const ordered=[...rows].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 if(ordered.length>MAX_COUNT*2)fail('Too many retained records/tombstones; maintenance required');
 const ids=new Set(),ordinals=new Set();const lines=[];let live=0,totalChars=0;
 for(const r of ordered){
  if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id)||
    !Number.isSafeInteger(r.revision)||r.revision<1||!Number.isSafeInteger(r.ordinal)||r.ordinal<0||typeof r.deleted!=='boolean')fail('Corrupted record header');
  ids.add(r.id);
  if(r.deleted){if(r.json!==null||r.sha256!==null)fail('Corrupted tombstone')}
  else{
   if(typeof r.json!=='string'||typeof r.sha256!=='string')fail('Incomplete project payload');
   if(await digest(r.json)!==r.sha256)fail('Project checksum mismatch');
   let parsed;try{parsed=JSON.parse(r.json)}catch{fail('Project JSON corrupt')}
   validateProject(parsed);if(parsed.id!==r.id)fail('Project ID mismatch');
   if(ordinals.has(r.ordinal))fail('Duplicate active project ordinal');
   ordinals.add(r.ordinal);live++;totalChars+=r.json.length;
  }
  lines.push(JSON.stringify([r.id,r.revision,r.ordinal,r.deleted,r.sha256]));
 }
 if(live>MAX_COUNT||totalChars>MAX_CHARS)fail('Repository exceeds pilot limits');
 return {digest:await digest(lines.join('\n')),live,totalChars};
}
async function verified(db){
 const {head,rows}=await readRaw(db);
 if(!head)return {present:false,valid:false};
 if(head.id!==HEAD||head.version!==VERSION||!Number.isSafeInteger(head.revision)||head.revision<1||
  typeof head.legacyHash!=='string'||typeof head.contentDigest!=='string'||
  head.authority!=='pilot-only-not-connected')fail('Pilot head invalid');
 const recordLedger=await ledger(rows);
 if(recordLedger.digest!==head.contentDigest||recordLedger.live!==head.count)
  fail('Repository head/records inconsistent');
 return {present:true,valid:true,head,rows};
}
async function assertLegacyUnchanged(expected){
 const raw=localStorage.getItem(LEGACY);
 const released=globalThis.__XMEMRelease01?.releasedSourceHash('melodic',LEGACY,raw);
 if(released){if(released!==expected)fail('Release witness differs from IDB');return}
 if(raw===null||await digest(raw)!==expected)
  fail('Legacy changed by another build/tab; pilot is unsafe and must not be used');
}
async function getSnapshot(){
 const db=await openExisting();
 try{const state=await verified(db);if(!state.valid)fail('Repository has no verified head');
  await assertLegacyUnchanged(state.head.legacyHash);
  const projects=state.rows.filter(r=>!r.deleted).sort((a,b)=>a.ordinal-b.ordinal).map(r=>JSON.parse(r.json));
  return {status:'PILOT_ONLY_NO_APP_CUTOVER',revision:state.head.revision,
   projects,records:state.rows.map(r=>({id:r.id,revision:r.revision,ordinal:r.ordinal,deleted:r.deleted})),
   count:state.head.count,legacyIntact:true};
 }finally{db.close()}
}
async function runExclusive(operation){
 if(localBusy)fail('Concurrent operation in this tab');localBusy=true;
 try{
  if(navigator.locks?.request)return await navigator.locks.request('xensonar.xmem.melodic.pilot.v1',
   {mode:'exclusive',ifAvailable:true},lock=>{if(!lock)fail('Pilot busy in another cooperating tab');return operation()});
  return await operation();
 }finally{localBusy=false}
}
async function prepare({confirmPilot=false}={}){
 if(confirmPilot!==true)fail('Explicit confirmPilot:true required');
 return runExclusive(async()=>{
  // Never overwrite a pilot, even if the legacy source is now different.
  if(typeof indexedDB==='undefined'||typeof indexedDB.databases!=='function')fail('Safe database enumeration required');
  if((await indexedDB.databases()).some(d=>d.name===DB))fail('Pilot DB already exists; no destructive re-prepare');
  const stage=window.XenSonarXMemMelodicStage;
  if(!stage)fail('XMEM-02A stage owner unavailable');
  const result=await stage.verify();
  if(result.status!=='VERIFIED_SHADOW_ONLY'||result.sourceCurrent!==true)fail('Verified current 02A stage required');
  const before=await snapshotLegacy();
  if(before.hash!==result.sourceSha256)fail('02A stage and legacy differ');
  const rows=[];for(let ordinal=0;ordinal<before.projects.length;ordinal++){const p=before.projects[ordinal],json=JSON.stringify(p);
   rows.push({id:p.id,revision:1,ordinal,deleted:false,json,sha256:await digest(json)})}
  const info=await ledger(rows);
  const head={id:HEAD,version:VERSION,revision:1,count:info.live,
   legacyHash:before.hash,contentDigest:info.digest,previousDigest:null,
   authority:'pilot-only-not-connected'};
  await assertLegacyUnchanged(before.hash);
  const db=await open();
  try{
   await transactionalWrite(db,{expectedHead:null,changes:rows,nextHead:head,bootstrap:true});
   const check=await verified(db);
   if(check.head.contentDigest!==info.digest)fail('Post-commit head mismatch');
   await assertLegacyUnchanged(before.hash);
   return {status:'PILOT_CREATED_NO_APP_CUTOVER',revision:1,count:info.live,
    legacyIntact:true,note:'No localStorage was deleted; j7/G7 still use legacy data.'};
  }finally{db.close()}
 })
}
async function change({expectedRevision,changes,order,confirmPilotWrite=false}={}){
 if(confirmPilotWrite!==true)fail('Explicit confirmPilotWrite:true required');
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)fail('Expected head revision required');
 if(!Array.isArray(changes)||changes.length>MAX_COUNT||(!changes.length&&order===undefined))fail('Changes or an explicit reorder required');
 return runExclusive(async()=>{
  const db=await openExisting();
  try{
   const before=await verified(db);
   if(!before.valid||before.head.revision!==expectedRevision)fail('Stale expected head revision');
   await assertLegacyUnchanged(before.head.legacyHash);
   const map=new Map(before.rows.map(r=>[r.id,r]));
   const originalRows=new Map(map);
   const seen=new Set(),writes=new Map();
   let maxOrdinal=Math.max(-1,...before.rows.map(r=>r.ordinal));
   for(const c of changes){
    if(!c||!['put','delete'].includes(c.op)||typeof c.id!=='string'||!c.id.trim()||seen.has(c.id))fail('Invalid/duplicate change');
    seen.add(c.id);const old=map.get(c.id)??null,oldRev=old?.revision??null;
    if((c.expectedRecordRevision??null)!==oldRev)fail('Stale record revision for '+c.id);
    if(c.op==='delete'&&(!old||old.deleted))fail('Cannot delete missing/deleted record');
    let row;
    if(c.op==='delete')row={id:c.id,revision:oldRev+1,ordinal:old.ordinal,deleted:true,json:null,sha256:null};
    else{
     validateProject(c.project);
     if(c.project.id!==c.id)fail('Put ID differs from project ID');
     const json=JSON.stringify(c.project);
     row={id:c.id,revision:(oldRev??0)+1,ordinal:old?.ordinal??++maxOrdinal,deleted:false,json,sha256:await digest(json)};
    }
    map.set(c.id,row);writes.set(c.id,row);
   }
   if(order!==undefined){
    if(!Array.isArray(order))fail('Reorder must supply an array');
    const liveRows=[...map.values()].filter(r=>!r.deleted);
    const required=new Set(liveRows.map(r=>r.id));
    if(order.length!==required.size||new Set(order).size!==required.size||order.some(id=>!required.has(id)))
     fail('Reorder must name every live project exactly once');
    for(let ordinal=0;ordinal<order.length;ordinal++){
     const id=order[ordinal],row=map.get(id);
     if(row.ordinal!==ordinal){const revised={...row,ordinal,revision:writes.has(id)?row.revision:(originalRows.get(id)?.revision??0)+1};
      map.set(id,revised);writes.set(id,revised)}
    }
   }
   const next=await ledger([...map.values()]);
   const head={id:HEAD,version:VERSION,revision:expectedRevision+1,count:next.live,
    legacyHash:before.head.legacyHash,contentDigest:next.digest,
    previousDigest:before.head.contentDigest,authority:'pilot-only-not-connected'};
   await assertLegacyUnchanged(before.head.legacyHash);
   await transactionalWrite(db,{expectedHead:expectedRevision,changes:[...writes.values()],nextHead:head});
   const result=await verified(db);
   if(result.head.revision!==head.revision||result.head.contentDigest!==head.contentDigest)
    fail('Post-commit verification does not match candidate');
   // If an uncooperative old build wrote during the IDB transaction, clearly fail closed.
   await assertLegacyUnchanged(head.legacyHash);
   return {status:'PILOT_COMMIT_VERIFIED_NO_APP_CUTOVER',revision:head.revision,
    count:head.count,updated:[...writes.values()].map(r=>({id:r.id,revision:r.revision,deleted:r.deleted,ordinal:r.ordinal})),legacyIntact:true};
  }finally{db.close()}
 })
}
async function replaceAll({expectedRevision,projects,confirmPilotWrite=false}={}){
 if(confirmPilotWrite!==true)fail('Explicit confirmPilotWrite:true required');
 validateList(projects);
 const current=await getSnapshot();
 if(current.revision!==expectedRevision)fail('Stale expected head revision');
 const previous=new Map(current.projects.map(p=>[p.id,p]));
 const records=new Map(current.records.map(r=>[r.id,r]));
 const upcoming=new Set(projects.map(p=>p.id));
 const changes=[];
 for(const project of projects){
  const old=previous.get(project.id);
  if(!old||JSON.stringify(old)!==JSON.stringify(project))changes.push({
   op:'put',id:project.id,project,expectedRecordRevision:records.get(project.id)?.revision??null
  });
 }
 for(const old of current.projects)if(!upcoming.has(old.id))changes.push({
  op:'delete',id:old.id,expectedRecordRevision:records.get(old.id).revision
 });
 return change({expectedRevision,changes,order:projects.map(p=>p.id),confirmPilotWrite:true});
}
async function status(){
 if(typeof indexedDB==='undefined'||typeof indexedDB.databases!=='function')
  return {status:'CANNOT_INSPECT_SAFELY'};
 const exists=(await indexedDB.databases()).some(d=>d.name===DB);
 if(!exists)return {status:'NO_PILOT'};
 try{const snap=await getSnapshot();return {status:snap.status,revision:snap.revision,count:snap.count,legacyIntact:true}}
 catch(e){return {status:'PILOT_UNSAFE_OR_CORRUPT',error:String(e.message||e)}}
}
async function xmem02d1Route(){
 const epoch=window.XenSonarXMemMelodicEpochD1;
 if(!epoch)return null;
 const version=await epoch.probeVersion();
 if(version===0||version===1)return null;
 if(version!==2)fail('Unsupported epoch head: all writes blocked');
 return epoch;
}
async function xmem02d1Read(){const epoch=await xmem02d1Route();return epoch?epoch.read():getSnapshot()}
async function xmem02d1ReplaceAll(args){
 const epoch=await xmem02d1Route();
 return epoch?epoch.replaceAll({expectedRevision:args.expectedRevision,projects:args.projects,confirmEpochWrite:args.confirmPilotWrite===true}):replaceAll(args)
}
async function xmem02d1Status(){
 try{const epoch=await xmem02d1Route();
  if(!epoch)return status(); // Retain original v1/missing-pilot semantics.
  const snap=await epoch.read();return {status:snap.status,revision:snap.revision,count:snap.count}
 }catch(e){return {status:'EPOCH_OR_PILOT_UNSAFE',error:String(e.message||e)}}
}
Object.defineProperty(window,'XenSonarXMemMelodicRepositoryPilot',{value:Object.freeze({
 prepare,change,replaceAll:xmem02d1ReplaceAll,read:xmem02d1Read,status:xmem02d1Status,dbName:DB,
 warning:'PILOT ONLY. NOT WIRED TO LIVE MELODIC/IMPORT/QUICK RACK. NEVER DELETE LEGACY.'
}),configurable:false,writable:false});
})();
