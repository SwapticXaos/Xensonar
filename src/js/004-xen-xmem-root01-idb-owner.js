
/* XenSonar XMEM-ROOT-01 · IndexedDB Root Follow owner. TEST BRANCH.
 * One canonical IDB source; legacy localStorage bytes retained but NEVER used as
 * a read/write fallback after boot. Per-entry config records + atomic catalog head.
 * No audio/PCM changes. No automatic deletion of historical data. */
(()=>{
 'use strict';
 const DB='xensonar-xmem-root-follow-bank-v1',KEY='xensonar-root-follow-loop-bank-v1';
 const EMPTY=()=>({schemaVersion:3,memberIds:[],orderedIds:[],aliases:{},entryConfigs:{}});
 const deep=x=>JSON.parse(JSON.stringify(x));
 const asError=e=>e instanceof Error?e:new Error(String(e));
 const fail=s=>{throw Error('XMEM-ROOT-01: '+s)};
 const hex=buf=>Array.from(new Uint8Array(buf),b=>b.toString(16).padStart(2,'0')).join('');
 const sha=async value=>{
  if(!globalThis.crypto?.subtle)fail('WebCrypto SHA-256 not available; no migration');
  return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
 };
 const rq=req=>new Promise((resolve,reject)=>{
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('IDB request failed'));
 });
 function open(){return new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB) return reject(Error('IndexedDB unavailable'));
  const req=indexedDB.open(DB,1);let settled=false;
  req.onupgradeneeded=()=>{
   const db=req.result;
   if(!db.objectStoreNames.contains('head'))db.createObjectStore('head',{keyPath:'key'});
   if(!db.objectStoreNames.contains('configs'))db.createObjectStore('configs',{keyPath:'id'});
  };
  req.onblocked=()=>{if(!settled){settled=true;reject(Error('IndexedDB version change blocked by another tab'))}};
  req.onerror=()=>{if(!settled){settled=true;reject(req.error||Error('IndexedDB open failed'))}};
  req.onsuccess=()=>{if(settled){req.result.close();return}settled=true;const db=req.result;
   db.onversionchange=()=>{db.close();block(Error('IDB database version changed in another tab'))};resolve(db)};
 })}
 async function snapshot(db){
  return new Promise((resolve,reject)=>{
   const t=db.transaction(['head','configs'],'readonly');let h,records;
   t.objectStore('head').get('current').onsuccess=e=>{h=e.target.result};
   t.objectStore('configs').getAll().onsuccess=e=>{records=e.target.result};
   t.oncomplete=()=>resolve({head:h||null,records:records||[]});
   t.onabort=()=>reject(t.error||Error('Read transaction aborted'));
   t.onerror=()=>{};
  })
 }
 function digestShape(head){return JSON.stringify({schema:1,memberIds:head.memberIds,orderedIds:head.orderedIds,
  aliases:head.aliases,hashes:head.hashes})}
 function validateBank(bank){
  if(!bank||bank.schemaVersion!==3||!Array.isArray(bank.memberIds)||!Array.isArray(bank.orderedIds)||
    !bank.aliases||typeof bank.aliases!=='object'||!bank.entryConfigs||typeof bank.entryConfigs!=='object')fail('invalid normalized Root Follow bank');
  if(new Set(bank.memberIds).size!==bank.memberIds.length||bank.memberIds.some(id=>typeof id!=='string'||!id))fail('invalid/duplicate Root Follow member');
  if(bank.orderedIds.some(id=>!bank.memberIds.includes(id))||new Set(bank.orderedIds).size!==bank.orderedIds.length)fail('invalid Root Follow ordering');
  if(bank.memberIds.some(id=>!Object.prototype.hasOwnProperty.call(bank.entryConfigs,id)))fail('missing Root Follow configuration');
 }
 async function hashesFor(bank){
  validateBank(bank);const hashes={};for(const id of bank.memberIds)hashes[id]=await sha(JSON.stringify(bank.entryConfigs[id]));return hashes;
 }
 function headFor(bank,hashes,revision,legacyHash){
  return {key:'current',version:1,revision,legacyHash,memberIds:deep(bank.memberIds),orderedIds:deep(bank.orderedIds),
   aliases:deep(bank.aliases),hashes:deep(hashes)}
 }
 async function seal(head){return {...head,digest:await sha(digestShape(head))}}
 let state='hydrating',reason='',db=null,bank=EMPTY(),head=null,initializing=null,chain=Promise.resolve();
 let onChange=null,changedRecords=0,skippedWrites=0;
 function status(){return Object.freeze({state,revision:head?.revision??null,recordCount:bank.memberIds.length,
  orderedCount:bank.orderedIds.length,reason,dbName:DB,legacyKey:KEY,oldCopyRetained:!globalThis.__XMEMRelease01?.isReleased('root'),
  changedConfigWrites:changedRecords,skippedHydrationWrites:skippedWrites})}
 function readSync(){return state==='active'?deep(bank):EMPTY()}
 function announce(){try{onChange?.(readSync(),status())}catch(e){console.warn('[XMEM-ROOT-01] state listener',e)}}
 function block(error){reason=asError(error).message;state='blocked';bank=EMPTY();head=null;
  console.error('[XMEM-ROOT-01] blocked:',reason);announce();return asError(error)}
 async function legacy(){
  const raw=localStorage.getItem(KEY);const released=globalThis.__XMEMRelease01?.releasedSourceHash('root',KEY,raw);
  return {raw,hash:released||await sha(raw===null?'xmem-root01:ABSENT':raw)};
 }
 async function verify(snap,legacyHash){
  const h=snap.head;
  if(!h||h.version!==1||!Number.isSafeInteger(h.revision)||h.revision<1||h.legacyHash!==legacyHash)fail('unknown head version or old source modified');
  if(!Array.isArray(h.memberIds)||!Array.isArray(h.orderedIds)||!h.hashes||typeof h.hashes!=='object'||!h.aliases)fail('incomplete head');
  if(await sha(digestShape(h))!==h.digest)fail('head digest mismatch');
  const found=new Map();for(const row of snap.records){if(!row||typeof row.id!=='string'||found.has(row.id))fail('duplicate/invalid config record');found.set(row.id,row.value)}
  if(found.size!==h.memberIds.length||Object.keys(h.hashes).length!==h.memberIds.length)fail('unexpected or missing config records');
  const result={schemaVersion:3,memberIds:deep(h.memberIds),orderedIds:deep(h.orderedIds),aliases:deep(h.aliases),entryConfigs:{}};
  for(const id of h.memberIds){if(!found.has(id))fail('missing config '+id);const v=found.get(id);
   if(await sha(JSON.stringify(v))!==h.hashes[id])fail('corrupt config '+id);
   result.entryConfigs[id]=deep(v);
  }
  validateBank(result);return {bank:result,head:h};
 }
 async function commitInitial(db,normalized,sourceHash){
  const hh=await seal(headFor(normalized,await hashesFor(normalized),1,sourceHash));
  return new Promise((resolve,reject)=>{
   const t=db.transaction(['head','configs'],'readwrite');let existed=false;
   const r=t.objectStore('head').get('current');r.onsuccess=()=>{
    if(r.result){existed=true;return}
    for(const id of normalized.memberIds)t.objectStore('configs').put({id,value:deep(normalized.entryConfigs[id])});
    t.objectStore('head').put(hh);
   };
   t.oncomplete=()=>resolve(!existed);
   t.onabort=()=>reject(t.error||Error('initial IDB transaction aborted'));
   t.onerror=()=>{};
  })
 }
 async function start(normalize,notify){
  if(initializing)return initializing;
  if(typeof normalize!=='function')return Promise.reject(block(Error('normalizer missing')));
  onChange=notify;
  initializing=(async()=>{
   const source=await legacy();db=await open();let saved=await snapshot(db);
   if(!saved.head){
    if(globalThis.__XMEMRelease01?.isReleased('root'))fail('Release marker present but canonical IDB bank missing');
    let parsed;if(source.raw===null)parsed=EMPTY();else{try{parsed=JSON.parse(source.raw)}catch{fail('legacy JSON is invalid')}}
    const normalized=normalize(parsed);validateBank(normalized);
    // Before staging, make sure the original copy is still byte-identical.
    if((await legacy()).hash!==source.hash)fail('original bank changed during migration');
    await commitInitial(db,normalized,source.hash);saved=await snapshot(db);
   }
   const current=await verify(saved,source.hash);
   if((await legacy()).hash!==source.hash)fail('original bank changed during IDB verification');
   head=current.head;bank=current.bank;state='active';announce();return status();
  })().catch(e=>{throw block(e)});
  return initializing;
 }
 // Verify the committed head and ONLY touched config rows. Full-ledger verification
 // is reserved for cold hydration and Package Station export witnesses.
 async function verifyCommit(db,expected,changed,removed){
  const read=await new Promise((resolve,reject)=>{
   const t=db.transaction(['head','configs'],'readonly');let headRow;
   const rows=new Map();
   const h=t.objectStore('head').get('current');h.onsuccess=()=>{headRow=h.result};
   for(const id of [...changed,...removed]){
    const r=t.objectStore('configs').get(id);r.onsuccess=()=>rows.set(id,r.result);
   }
   t.oncomplete=()=>resolve({headRow,rows});
   t.onabort=()=>reject(t.error||Error('IDB readback transaction aborted'));
   t.onerror=()=>{};
  });
  const h=read.headRow;
  if(!h||h.version!==1||h.revision!==expected.revision||h.digest!==expected.digest||
     await sha(digestShape(h))!==expected.digest)fail('committed Head readback mismatch');
  for(const id of changed){const record=read.rows.get(id);
   if(!record||record.id!==id||await sha(JSON.stringify(record.value))!==expected.hashes[id])
    fail('changed config readback mismatch '+id);
  }
  for(const id of removed)if(read.rows.get(id)!==undefined)fail('removed config is still present '+id);
  return h;
 }
 async function apply(next){
  if(state!=='active'||!db||!head)fail('IDB bank not active');
  const originalHead=head;const source=await legacy();
  if(source.hash!==originalHead.legacyHash)fail('old bank changed by another browser/version');
  const configHashes=await hashesFor(next);
  const h=await seal(headFor(next,configHashes,originalHead.revision+1,originalHead.legacyHash));
  if(JSON.stringify(next.memberIds)===JSON.stringify(bank.memberIds)&&
     JSON.stringify(next.orderedIds)===JSON.stringify(bank.orderedIds)&&
     JSON.stringify(next.aliases)===JSON.stringify(bank.aliases)&&
     JSON.stringify(configHashes)===JSON.stringify(originalHead.hashes))return status();
  const changes=next.memberIds.filter(id=>configHashes[id]!==originalHead.hashes[id]);
  const removed=originalHead.memberIds.filter(id=>!next.memberIds.includes(id));
  await new Promise((resolve,reject)=>{
   const t=db.transaction(['head','configs'],'readwrite');
   const req=t.objectStore('head').get('current');req.onsuccess=()=>{
    if(req.result?.revision!==originalHead.revision||req.result?.digest!==originalHead.digest){
     t.abort();return;
    }
    for(const id of changes)t.objectStore('configs').put({id,value:deep(next.entryConfigs[id])});
    for(const id of removed)t.objectStore('configs').delete(id);
    t.objectStore('head').put(h);
   };
   t.oncomplete=resolve;t.onabort=()=>reject(Error('CAS conflict or IndexedDB transaction failed'));
   t.onerror=()=>{};
  });
  const verifiedHead=await verifyCommit(db,h,changes,removed);
  if((await legacy()).hash!==source.hash)fail('old bank changed during commit');
  changedRecords+=changes.length;head=verifiedHead;bank=deep(next);announce();return status();
 }
 function commit(input){
  if(state==='hydrating'){skippedWrites++;return Promise.resolve({skipped:'hydration-fence'})}
  if(state!=='active')return Promise.reject(Error('Root Follow IDB blocked: '+reason));
  let next;try{next=deep(input)}catch(e){return Promise.reject(e)}
  const task=chain.then(()=>apply(next)).catch(e=>{throw block(e)});
  chain=task.catch(()=>{});return task;
 }
 function clear(){return commit(EMPTY())}
 async function witness(){
  if(state!=='active')fail('cannot export Root Follow bank before verified hydration');
  await chain;
  const source=await legacy();
  const current=await verify(await snapshot(db),source.hash);
  if(current.head.digest!==head?.digest||current.head.revision!==head?.revision)
   fail('Root Follow bank changed outside this tab; export aborted');
  return Object.freeze({revision:current.head.revision,digest:current.head.digest,
   legacyHash:current.head.legacyHash,recordCount:current.bank.memberIds.length});
 }
 async function measure(){return {...status(),headMetadataApproxUtf16Bytes:head?JSON.stringify(head).length*2:0,
  configurationPayloadApproxUtf16Bytes:state==='active'?JSON.stringify(bank.entryConfigs).length*2:0,
  physicalBytesMeasured:false,legacyApproxUtf16Bytes:(localStorage.getItem(KEY)?.length||0)*2}}
 globalThis.__XenRFLDirect01=Object.freeze({start,readSync,commit,clear,status,measure,witness});
})();

