
/* M10 compatibility gate: read-only, independently verifiable export.
 * No automatic authority change or mutations of canonical V2 data.
 */
function __xenM10BackupFactory(storage,metaStore){
 const KEY='xensonar.meta-sessions.v2',FORMAT='xensonar-session-archive-backup',MAX=12*1024*1024;
 const hash=async value=>{
  if(!globalThis.crypto?.subtle)throw Error('Secure SHA-256 is unavailable in this browser context.');
  const bytes=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
 };
 const check=raw=>{
  if(typeof raw!=='string'||!raw.length||raw.length>MAX)throw Error('Session archive missing or unexpectedly large.');
  let source;
  try{source=JSON.parse(raw)}catch{throw Error('Invalid V2 JSON; no backup was created.');}
  if(!source||source.version!==2||!Array.isArray(source.saved)||!Array.isArray(source.items))throw Error('Unsupported session archive version.');
  const ids=new Set();
  for(const row of source.saved){
   if(!row||typeof row.id!=='string'||!row.id||ids.has(row.id)||typeof row.name!=='string'||!Array.isArray(row.items))
    throw Error('Invalid or duplicate session record; no backup was created.');
   ids.add(row.id);
  }
  return {count:source.saved.length,liveName:String(source.name??''),bytes:new TextEncoder().encode(raw).length};
 };
 async function prepare(){
  const raw=storage.getItem(KEY);
  if(raw===null)throw Error('No V2 session archive exists; nothing to export.');
  const info=check(raw),sha256=await hash(raw);
  // A concurrent legacy writer may have changed the source during hashing.
  if(storage.getItem(KEY)!==raw)throw Error('Session archive changed while preparing the backup. Retry without switching tabs.');
  const pack={format:FORMAT,schema:1,createdAt:new Date().toISOString(),sourceKey:KEY,sourceVersion:2,count:info.count,bytes:info.bytes,sha256,raw};
  return {data:JSON.stringify(pack),info:{...info,sha256,createdAt:pack.createdAt}};
 }
 async function verify(data){
  if(typeof data!=='string'||data.length>MAX*2)throw Error('Invalid backup size.');
  let pack;
  try{pack=JSON.parse(data)}catch{throw Error('Backup is not valid JSON.');}
  if(pack?.format!==FORMAT||pack.schema!==1||pack.sourceKey!==KEY||pack.sourceVersion!==2||typeof pack.raw!=='string')
   throw Error('Unrecognized XenSonar session backup.');
  const info=check(pack.raw),sha256=await hash(pack.raw);
  if(pack.sha256!==sha256||pack.bytes!==info.bytes||pack.count!==info.count)throw Error('Backup integrity verification failed.');
  return {...info,sha256,createdAt:pack.createdAt};
 }
 /* Read-only readiness audit for the M9 mirror. Validates every indexed
    session record against the current in-memory V2 canonical view. */
 async function audit(archive){
  if(!archive||typeof archive.catalog!=='function'||!globalThis.indexedDB)
   return {ready:false,reason:'Sidecar unavailable'};
  const raw=storage.getItem(KEY);
  if(raw===null)return {ready:false,reason:'V2 archive missing'};
  const info=check(raw),rows=metaStore.snapshot().saved;
  if(!Array.isArray(rows)||rows.length!==info.count)return {ready:false,reason:'V2 snapshot not synchronized'};
  const catalog=await archive.catalog();
  if(!Array.isArray(catalog)||catalog.length!==rows.length)return {ready:false,reason:'M9 mirror not yet current'};
  const index=new Map(catalog.map(row=>[row.id,row]));
  if(index.size!==rows.length||rows.some(row=>index.get(row.id)?.name!==row.name))
   return {ready:false,reason:'Metadata mismatch'};
  const db=await new Promise((resolve,reject)=>{
   const request=indexedDB.open('xensonar-meta-archive-m9',1);
   request.onerror=()=>reject(request.error??new Error('Archive unavailable'));
   request.onblocked=()=>reject(new Error('Archive blocked'));
   request.onsuccess=()=>resolve(request.result);
  });
  try{
   const marker=await new Promise((resolve,reject)=>{
    const t=db.transaction(['control'],'readonly'),r=t.objectStore('control').get('current');
    t.onerror=()=>reject(t.error??new Error('Archive read failed'));
    r.onsuccess=()=>resolve(r.result);
   });
   if(marker?.state!=='complete'||marker.count!==rows.length||marker.source!==archive.signature(raw)||!['A','B'].includes(marker.slot))
    return {ready:false,reason:'Archive generation is stale'};
   const store='records'+marker.slot;
   for(let i=0;i<rows.length;i+=32){
    const batch=rows.slice(i,i+32);
    const equal=await new Promise((resolve,reject)=>{
     const t=db.transaction([store],'readonly'),os=t.objectStore(store);
     let ok=true;
     t.onerror=()=>reject(t.error??new Error('Archive read failed'));
     t.onabort=()=>reject(t.error??new Error('Archive read aborted'));
     for(const row of batch){const r=os.get(row.id);
      r.onsuccess=()=>{if(JSON.stringify(r.result)!==JSON.stringify(row))ok=false};
      r.onerror=()=>{ok=false};
     }
     t.oncomplete=()=>resolve(ok);
    });
    if(!equal)return {ready:false,reason:'Session record mismatch near '+i};
   }
   if(storage.getItem(KEY)!==raw)return {ready:false,reason:'V2 changed during audit'};
   return {ready:true,count:rows.length,source:marker.source};
  }finally{db.close()}
 }
 async function download(){
  const result=await prepare();
  const blob=new Blob([result.data],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  try{
   a.href=url;a.download='XenSonar_Session_Archive_'+new Date().toISOString().slice(0,10)+'_M10_Backup.json';
   a.style.display='none';document.body.appendChild(a);a.click();
  }finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
  return result.info;
 }
 return {prepare,verify,download,audit};
}

