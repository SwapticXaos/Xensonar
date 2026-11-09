
/* M9 verified, non-authoritative archive sidecar. The V2 localStorage document
 * remains the only canonical session source for cross-version compatibility.
 * Nothing opens IndexedDB until the Sessions tab is requested. Two alternating
 * generations protect the last complete mirror from interrupted writes.
 */
function __xenM9ArchiveFactory(storage,metaStore,{idleDelay=950,batchSize=20,batchGap=35}={}){
 const DB='xensonar-meta-archive-m9',SOURCE='xensonar.meta-sessions.v2';
 const instance='m9-'+(globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2));
 let dbPromise=null,active=false,revision=0,timer=0,job=null,lastError='',lastComplete=null,foreignChange=false;
 const slots={A:['recordsA','catalogA'],B:['recordsB','catalogB']};
 const signature=raw=>{ // Fast corruption/staleness detector; never confers canonical authority.
  if(typeof raw!=='string')return null;
  let a=2166136261,b=0x9e3779b9;
  for(let i=0;i<raw.length;i++){
   const c=raw.charCodeAt(i);
   a=Math.imul(a^c,16777619)>>>0;
   b=Math.imul(b^(c+(i&255)),2246822519)>>>0;
  }
  return raw.length+':'+a.toString(16)+':'+b.toString(16);
 };
 const canonicalSignature=()=>signature(storage.getItem(SOURCE));
 function open(){
  if(dbPromise)return dbPromise;
  if(!globalThis.indexedDB)return Promise.reject(new Error('IndexedDB not available'));
  dbPromise=new Promise((resolve,reject)=>{
   const req=indexedDB.open(DB,1);
   req.onupgradeneeded=()=>{
    const db=req.result;
    for(const n of ['control','recordsA','recordsB','catalogA','catalogB'])
     if(!db.objectStoreNames.contains(n))db.createObjectStore(n,{keyPath:n==='control'?'key':'id'});
   };
   req.onerror=()=>reject(req.error??new Error('Archive sidecar unavailable'));
   req.onblocked=()=>reject(new Error('Archive sidecar blocked'));
   req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();dbPromise=null};resolve(db)};
  }).catch(e=>{dbPromise=null;throw e});
  return dbPromise;
 }
 function tx(db,names,mode,work){return new Promise((resolve,reject)=>{
  let done=false,transaction,result;
  try{transaction=db.transaction(names,mode);
   const fail=e=>{if(!done){done=true;reject(e)}};
   transaction.oncomplete=()=>{if(!done){done=true;resolve(result)}};
   transaction.onerror=()=>fail(transaction.error??new Error('Archive transaction failed'));
   transaction.onabort=()=>fail(transaction.error??new Error('Archive transaction aborted'));
   work(transaction,value=>{result=value});
  }catch(e){if(transaction)try{transaction.abort()}catch{};if(!done){done=true;reject(e)}}
 })}
 const read=(db,key)=>tx(db,['control'],'readonly',(t,result)=>{
  const r=t.objectStore('control').get(key);r.onsuccess=()=>result(r.result??null);
 });
 const pause=()=>new Promise(resolve=>setTimeout(resolve,batchGap));
 const viable=(stamp)=>active&&revision===stamp&&!(typeof document!=='undefined'&&document.hidden);
 async function reserve(db,source,count){
  let claim=null;
  await tx(db,['control'],'readwrite',(t,result)=>{
   const store=t.objectStore('control'),req=store.get('lease');
   req.onsuccess=()=>{
    const found=req.result;
    if(found&&found.until>Date.now()&&found.owner!==instance){result(false);return}
    store.put({key:'lease',owner:instance,until:Date.now()+300000});
    result(true);
   };
  }).then(v=>claim=v);
  return claim;
 }
 async function release(db){try{await tx(db,['control'],'readwrite',t=>{
  const store=t.objectStore('control'),r=store.get('lease');r.onsuccess=()=>{if(r.result?.owner===instance)store.delete('lease')};
 })}catch{}}
 async function build(stamp){
  let db,owns=false;
  try{
   if(!viable(stamp)||foreignChange)return null;
   const raw=storage.getItem(SOURCE),source=signature(raw);
   if(!source)return null; // Nothing to index; never guess a legacy V1 archive.
   const saved=metaStore.snapshot().saved;
   if(!Array.isArray(saved))return null;
   db=await open();if(!viable(stamp))return null;
   const previous=await read(db,'current');
   // D1: an unexpectedly empty archive must NEVER evict a completed non-empty
   // IndexedDB generation. Users can still explicitly archive/backup an empty
   // project, but automatic sidecar mirroring is suspended at this boundary.
   if(saved.length===0&&previous?.state==='complete'&&previous.count>0){
    lastError='Empty canonical Saved Sessions list; preserved last non-empty M9 mirror.';
    lastComplete=previous;return previous;
   }
   if(previous?.state==='complete'&&previous.source===source&&previous.count===saved.length){lastComplete=previous;return previous}
   if(!(await reserve(db,source,saved.length)))return null;
   owns=true;
   if(!viable(stamp))return null;
   const slot=previous?.slot==='A'?'B':'A';
   const [records,catalog]=slots[slot];
   await tx(db,['control',records,catalog],'readwrite',(t,result)=>{
    const lock=t.objectStore('control').get('lease');
    lock.onsuccess=()=>{
     if(lock.result?.owner!==instance){t.abort();return}
     t.objectStore(records).clear();t.objectStore(catalog).clear();
     t.objectStore('control').put({key:'building',state:'building',slot,source,count:saved.length,started:Date.now()});
    };
   });
   for(let i=0;i<saved.length;i+=batchSize){
    if(!viable(stamp))return null;
    await tx(db,['control',records,catalog],'readwrite',t=>{
     const l=t.objectStore('control').get('lease');
     l.onsuccess=()=>{
      if(l.result?.owner!==instance){t.abort();return}
      const r=t.objectStore(records),c=t.objectStore(catalog);
      for(const row of saved.slice(i,i+batchSize)){
       r.put(row);
       c.put({id:row.id,name:row.name,refs:Array.isArray(row.items)?row.items.map(x=>x?.name||''):[],hasRoomSettings:!!row.roomSettings});
      }
      t.objectStore('control').put({key:'lease',owner:instance,until:Date.now()+300000});
     };
    });
    if(i+batchSize<saved.length)await pause();
   }
   if(!viable(stamp)||foreignChange||canonicalSignature()!==source)return null;
   const counted=await tx(db,[records,catalog],'readonly',(t,result)=>{
    let a=-1,b=-1;
    const check=()=>{if(a>=0&&b>=0)result([a,b])};
    const r=t.objectStore(records).count(),c=t.objectStore(catalog).count();
    r.onsuccess=()=>{a=r.result;check()};c.onsuccess=()=>{b=c.result;check()};
   });
   if(counted[0]!==saved.length||counted[1]!==saved.length)throw new Error('Archive sidecar count verification failed');
   // Commit pointer is the only publication step; the old complete generation
   // remains readable until this transaction commits.
   if(!viable(stamp)||foreignChange||canonicalSignature()!==source)return null;
   const marker={key:'current',state:'complete',source,count:saved.length,slot,schema:1,committed:Date.now()};
   await tx(db,['control'],'readwrite',t=>{
    const lock=t.objectStore('control').get('lease');lock.onsuccess=()=>{
     if(lock.result?.owner!==instance){t.abort();return}
     t.objectStore('control').put(marker);
     t.objectStore('control').delete('building');
    };
   });
   lastComplete=marker;return marker;
  }catch(e){lastError=String(e?.message||e);return null}
  finally{if(owns&&db)await release(db)}
 }
 function schedule(){
  if(!active||timer||job)return;
  timer=setTimeout(()=>{timer=0;if(!active)return;
   const stamp=revision;
   job=build(stamp).finally(()=>{job=null;if(active&&stamp!==revision)schedule()});
  },idleDelay);
 }
 function enter(){active=true;schedule()}
 function leave(){active=false;revision++;clearTimeout(timer);timer=0}
 // Existing synchronous V2 is the authority. Invalidation only stops sidecar
 // publication; it must NEVER prevent the original storage write.
 const unsubscribe=metaStore.subscribe(()=>{
  revision++;
  if(active){clearTimeout(timer);timer=0;if(!job)schedule()}
 });
 if(typeof addEventListener==='function')addEventListener('storage',e=>{
  if(e.key===SOURCE){revision++;foreignChange=true;lastComplete=null;clearTimeout(timer);timer=0}
 });
 async function get(id){
  const fallback=()=>metaStore.snapshot().saved.find(row=>row.id===id)??null;
  if(typeof id!=='string')return null;
  try{
   const db=await open(),marker=await read(db,'current');
   if(foreignChange||marker?.state!=='complete'||marker.source!==canonicalSignature())return fallback();
   const row=await tx(db,[slots[marker.slot][0]],'readonly',(t,result)=>{
    const r=t.objectStore(slots[marker.slot][0]).get(id);r.onsuccess=()=>result(r.result??null);
   });
   // This is only an optional read-through: absent or malformed records always
   // fall back to the canonical source, never disappear from the session list.
   return row?.id===id?row:fallback();
  }catch{return fallback()}
 }
 async function catalog(){
  try{
   const db=await open(),marker=await read(db,'current');
   if(foreignChange||marker?.state!=='complete'||marker.source!==canonicalSignature())return null;
   return await tx(db,[slots[marker.slot][1]],'readonly',(t,result)=>{
    const r=t.objectStore(slots[marker.slot][1]).getAll();r.onsuccess=()=>result(r.result??[]);
   });
  }catch{return null}
 }
 return {enter,leave,get,catalog,status:()=>({active,revision,building:!!job,queued:!!timer,complete:lastComplete?.count??null,error:lastError}),signature};
}
