
/* XMEM-02A: Opt-in, atomic, verified copy of legacy Melodic JSON to IndexedDB.
   This STAGES data only. It does NOT change j7/G7/P3.7 reader/writer authority,
   does NOT delete the legacy key, and makes NO startup/AudioWorklet calls. */
(()=>{
 'use strict';
 if(window.__XMEM_MR03_ENABLE_MELODIC__!==true)return;

 const KEY='xensonar-melodic-loop-projects-v1',DB='xensonar-xmem-melodic-stage-v1';
 const CONTENT='projects',CONTROL='control',ID='current';
 let busy=false;
 const fail=m=>{throw Error('XMEM-02A: '+m)};
 async function digest(text){
  if(!crypto?.subtle)fail('SHA-256 unavailable; no staging permitted');
  const sha=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return Array.from(new Uint8Array(sha),b=>b.toString(16).padStart(2,'0')).join('');
 }
 function readSource(){
  let raw;try{raw=localStorage.getItem(KEY)}catch(e){fail('Legacy Melodic storage unreadable: '+e.message)}
  if(raw===null)fail('No existing legacy Melodic library; stage refuses to invent an empty source');
  let list;try{list=JSON.parse(raw)}catch{fail('Legacy Melodic JSON malformed')}
  if(!Array.isArray(list))fail('Legacy Melodic root must be an array');
  const seen=new Set();for(const p of list){
   if(!p||typeof p!=='object'||typeof p.id!=='string'||!p.id.trim()||seen.has(p.id)||
    !p.composer||!Array.isArray(p.composer.tracks))fail('Legacy project record/ID invalid or duplicated');
   seen.add(p.id);
  }
  return {raw,list};
 }
 async function open(){
  if(typeof indexedDB==='undefined')fail('IndexedDB not available');
  return await new Promise((resolve,reject)=>{
   let request;try{request=indexedDB.open(DB,1)}catch(e){reject(e);return}
   request.onupgradeneeded=()=>{
    const db=request.result;
    if(!db.objectStoreNames.contains(CONTENT))db.createObjectStore(CONTENT,{keyPath:'ordinal'});
    if(!db.objectStoreNames.contains(CONTROL))db.createObjectStore(CONTROL,{keyPath:'id'});
   };
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error??Error('IndexedDB open failed'));
   request.onblocked=()=>reject(Error('IndexedDB upgrade blocked by another tab'));
  });
 }
 function txCommit(db,records,manifest){
  return new Promise((resolve,reject)=>{
   let tx;try{tx=db.transaction([CONTENT,CONTROL],'readwrite');
    const table=tx.objectStore(CONTENT);table.clear();
    for(const row of records)table.put(row);
    tx.objectStore(CONTROL).put(manifest);
   }catch(e){try{tx?.abort()}catch{}reject(e);return}
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(tx.error??Error('Stage transaction failed'));
   tx.onabort=()=>reject(tx.error??Error('Stage transaction aborted'));
  });
 }
 async function readVerified(db, {details=false}={}){
  return await new Promise((resolve,reject)=>{
   const tx=db.transaction([CONTENT,CONTROL],'readonly');
   const manifestReq=tx.objectStore(CONTROL).get(ID);
   const cursorReq=tx.objectStore(CONTENT).openCursor();
   let manifest=null,error=null,count=0,rows=[],bytes=0,lastOrdinal=-1;
   manifestReq.onsuccess=()=>{manifest=manifestReq.result??null};
   cursorReq.onsuccess=()=>{
    const cursor=cursorReq.result;if(!cursor)return;
    const row=cursor.value;
    if(!row||!Number.isInteger(row.ordinal)||row.ordinal!==lastOrdinal+1||
       typeof row.id!=='string'||typeof row.json!=='string'||typeof row.sha256!=='string')
      {error='Invalid or unordered stage record';return}
    lastOrdinal=row.ordinal;count++;bytes+=row.json.length;rows.push(row);
    cursor.continue();
   };
   tx.oncomplete=async()=>{
    if(error)return reject(Error(error));
    if(!manifest)return resolve({present:false,valid:false});
    try{
     const partHashes=[],values=[];
     for(const row of rows){
       const recordHash=await digest(row.json);
       if(recordHash!==row.sha256)return reject(Error('Staged project SHA-256 mismatch'));
       let decoded;try{decoded=JSON.parse(row.json)}catch{return reject(Error('Staged project JSON corrupt'))}
       if(decoded?.id!==row.id||!Array.isArray(decoded.composer?.tracks))
         return reject(Error('Staged project identity/content mismatch'));
       values.push(decoded);partHashes.push(row.id+'\n'+recordHash);
     }
     const digestHash=await digest(partHashes.join('\n'));
     const canonicalHash=await digest(JSON.stringify(values));
     const valid=manifest.version===1&&manifest.id===ID&&
       manifest.recordCount===count&&manifest.recordsDigest===digestHash&&
       manifest.canonicalSha256===canonicalHash&&manifest.jsonCharacters===bytes;
     resolve({present:true,valid,recordCount:count,characters:bytes,
      sourceSha256:manifest.sourceSha256,
      ...(details?{recordsDigest:manifest.recordsDigest,createdAt:manifest.createdAt}:{}),
      error:valid?null:'Manifest mismatch; stage unsafe'});
    }catch(e){reject(e)}
   };
   tx.onerror=()=>reject(tx.error??Error('Stage read failed'));
   tx.onabort=()=>reject(tx.error??Error('Stage read aborted'));
  });
 }
 async function verify(){
  // Pure verification must not accidentally create a database on first open.
  if(typeof indexedDB==='undefined'||typeof indexedDB.databases!=='function')
   return {present:null,valid:false,status:'UNVERIFIABLE_NO_SAFE_DATABASE_ENUMERATION',
    note:'Browser has no safe database-listing API; use stage() explicitly in a test profile.'};
  let existing;try{existing=await indexedDB.databases()}catch(e){
   return {present:null,valid:false,status:'UNVERIFIABLE_DATABASE_ENUMERATION_ERROR',error:e.message};
  }
  if(!existing.some(x=>x?.name===DB))return {present:false,valid:false,status:'NO_STAGE'};
  const db=await open();try{
   const state=await readVerified(db,{details:true});
   if(!state.present)return state;
   const {raw}=readSource(),now=await digest(raw);
   return {...state,sourceCurrent:state.sourceSha256===now,
    status:state.valid?(state.sourceSha256===now?'VERIFIED_SHADOW_ONLY':'STALE_SHADOW_ONLY'):'INVALID_SHADOW_ONLY',
    legacyPreserved:true,authoritative:'localStorage'};
  }finally{db.close()}
 }
 async function stage({confirmCopy=false}={}){
  if(confirmCopy!==true)fail('Explicit stage({confirmCopy:true}) required; this writes a second IDB copy');
  if(busy)fail('Stage already active in this tab');
  busy=true;
  const operation=async()=>{
   const {raw,list}=readSource();
   const sourceSha256=await digest(raw);
   // One immutable JS representation per record. No audio blobs are read/copied.
   const records=[];let total=0;
   for(let ordinal=0;ordinal<list.length;ordinal++){
    const project=list[ordinal],json=JSON.stringify(project);
    total+=json.length;
    records.push({ordinal,id:project.id,json,sha256:await digest(json)});
   }
   const recordsDigest=await digest(records.map(x=>x.id+'\n'+x.sha256).join('\n'));
   const canonicalSha256=await digest(JSON.stringify(list));
   if(localStorage.getItem(KEY)!==raw)fail('Legacy source changed during preflight; stage not written');
   const manifest={id:ID,version:1,sourceKey:KEY,sourceSha256,
     recordCount:records.length,jsonCharacters:total,recordsDigest,canonicalSha256,
     createdAt:new Date().toISOString(),authority:'legacy-localStorage-only'};
   const db=await open();try{
    // Atomic within this single IndexedDB database (not a cross-store authority switch).
    await txCommit(db,records,manifest);
    const evidence=await readVerified(db);
    if(!evidence.valid||evidence.sourceSha256!==sourceSha256)
      fail('IDB write completed, but independent readback validation failed');
    if(localStorage.getItem(KEY)!==raw)fail('Legacy source changed concurrently; stage is now stale and MUST NOT be activated');
    return {status:'VERIFIED_SHADOW_ONLY',recordCount:records.length,
     sourceSha256,legacyPreserved:true,authoritative:'localStorage',
     note:'No localStorage space was freed. Stage is not a new runtime reader or writer.'};
   }finally{db.close()}
  };
  try{
   if(navigator.locks?.request)
    return await navigator.locks.request('xensonar.xmem.melodic-stage.v1',
      {mode:'exclusive',ifAvailable:true},lock=>{
       if(!lock)fail('Another tab is staging Melodic projects');return operation();
      });
   return await operation();
  }finally{busy=false}
 }
 Object.defineProperty(window,'XenSonarXMemMelodicStage',{value:Object.freeze({
  stage,verify,dbName:DB,
  notice:'STAGING ONLY: DO NOT DELETE LEGACY DATA. NO QUOTA RELIEF UNTIL LATER READER/WRITER MIGRATION.'
 }),configurable:false,writable:false});
})();
