
/* XenSonar XMEM-02D1 -- PRODUCT RETAINED-EPOCH TEST ADAPTER. NEVER RELEASE LEGACY.
 * This script operates only on the test namespace supplied to create().
 * It never calls localStorage.removeItem, clears user data, or bypasses legacy drift.
 * It requires a verified external backup contract before any future product release.
 */
(()=>{
'use strict';
 if(window.__XMEM_MR03_ENABLE_MELODIC__!==true)return;

const DB='xensonar-xmem-melodic-repository-pilot-v1';
const LEGACY='xensonar-melodic-loop-projects-v1';
const RECORDS='records',CONTROL='control',HEAD='head';
const MAX_COUNT=5000,MAX_CHARS=16*1024*1024;
const fail=s=>{throw Error('XMEM-02D1: '+s)};
const clone=v=>JSON.parse(JSON.stringify(v));
const digest=async text=>{
 if(!globalThis.crypto?.subtle)fail('WebCrypto SHA-256 required');
 const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 return Array.from(new Uint8Array(d),x=>x.toString(16).padStart(2,'0')).join('');
};
const validProject=p=>!!p&&typeof p==='object'&&!Array.isArray(p)&&typeof p.id==='string'&&!!p.id.trim()&&p.composer&&Array.isArray(p.composer.tracks);
function validateProjects(projects){
 if(!Array.isArray(projects)||projects.length>MAX_COUNT)fail('Invalid or oversized projects');
 let names=new Set();for(const p of projects){if(!validProject(p)||names.has(p.id))fail('Invalid/duplicate project identity');names.add(p.id)}
}
async function ledger(rows){
 const ordered=[...rows].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 if(ordered.length>MAX_COUNT*2)fail('Too many retained rows');
 const ids=new Set(),ordinals=new Set(),lines=[];let live=0,chars=0;
 for(const r of ordered){
  if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id)||!Number.isSafeInteger(r.revision)||r.revision<1||!Number.isSafeInteger(r.ordinal)||r.ordinal<0||typeof r.deleted!=='boolean')fail('Damaged record header');
  ids.add(r.id);
  if(r.deleted){if(r.json!==null||r.sha256!==null)fail('Damaged tombstone')}
  else{
   if(typeof r.json!=='string'||typeof r.sha256!=='string'||await digest(r.json)!==r.sha256)fail('Damaged project digest');
   let p;try{p=JSON.parse(r.json)}catch{fail('Damaged project JSON')}
   if(!validProject(p)||p.id!==r.id||ordinals.has(r.ordinal))fail('Damaged project identity/order');
   ordinals.add(r.ordinal);live++;chars+=r.json.length;
  }
  lines.push(JSON.stringify([r.id,r.revision,r.ordinal,r.deleted,r.sha256]));
 }
 if(live>MAX_COUNT||chars>MAX_CHARS)fail('Project repository limit exceeded');
 return {digest:await digest(lines.join('\n')),live,chars};
}
async function openExisting(){
 if(!indexedDB||typeof indexedDB.databases!=='function')fail('Native DB enumeration unavailable');
 if(!(await indexedDB.databases()).some(d=>d.name===DB))fail('Test repository missing');
 return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('Open failed'));req.onblocked=()=>reject(Error('DB blocked by another tab'))});
}
function readRaw(db){return new Promise((resolve,reject)=>{
  let tx,head=null,rows=[],invalid=false;
  try{
   tx=db.transaction([RECORDS,CONTROL],'readonly');
   const r=tx.objectStore(CONTROL).get(HEAD),cursor=tx.objectStore(RECORDS).openCursor();
   r.onsuccess=()=>{head=r.result??null};
   cursor.onsuccess=()=>{const x=cursor.result;if(!x)return;if(x.primaryKey!==x.value?.id)invalid=true;rows.push(x.value);x.continue()};
   tx.oncomplete=()=>invalid?reject(Error('Primary-key/ID mismatch')):resolve({head,rows});
   tx.onabort=()=>reject(tx.error||Error('Read aborted'));
   tx.onerror=()=>reject(tx.error||Error('Read error'));
  }catch(e){reject(e)}
 })}
async function withDb(fn){const db=await openExisting();try{return await fn(db)}finally{db.close()}}
async function inspectHead(db){
 const {head,rows}=await readRaw(db);
 if(!head||head.id!==HEAD||![1,2].includes(head.version)||!Number.isSafeInteger(head.revision)||head.revision<1||typeof head.contentDigest!=='string'||typeof head.legacyHash!=='string')fail('Invalid repository head');
 const checked=await ledger(rows);
 if(checked.digest!==head.contentDigest||checked.live!==head.count)fail('Head/records integrity mismatch');
 if(head.version===1&&head.authority!=='pilot-only-not-connected')fail('Unknown legacy head authority');
 if(head.version===2){
  if(head.epoch?.phase==='release-intent'){
   const i=head.epoch.intent;
   if(!i||i.schema!==1||typeof i.id!=='string'||!i.id||
      !Number.isSafeInteger(i.baseRevision)||i.baseRevision<1||
      typeof i.baseDigest!=='string'||i.baseDigest!==head.contentDigest||
      i.baseCount!==head.count||i.sourceHash!==head.legacyHash||
      head.revision!==i.baseRevision+1||typeof i.startedAt!=='string'||!i.startedAt)
    fail('Invalid/falsified release intent witness');
  }
  if(head.epoch?.phase==='retained'&&head.epoch.intent!==undefined)
   fail('Retained phase carries an unresolved release intent');
  if(head.authority!=='xmem-epoch-retained-test-v2'||!head.epoch||head.epoch.version!==1||!['retained','release-intent'].includes(head.epoch.phase)||
    typeof head.epoch.id!=='string'||!head.epoch.id||head.epoch.sourceHash!==head.legacyHash||head.epoch.backupHash!==head.legacyHash||
    !Number.isSafeInteger(head.epoch.backupLength)||head.epoch.backupLength<0||!Number.isSafeInteger(head.epoch.sourceRevision)||
    typeof head.epoch.sourceDigest!=='string')fail('Invalid epoch witness/authority');
 }
 return {head,rows};
}
async function checkLegacy(head){
 if(head.version!==2)fail('Unknown epoch version');
 if(head.epoch.phase==='release-intent')fail('Release intent active: Melodic reads and writes blocked');
 if(head.epoch.phase!=='retained')fail('Unsupported epoch phase');
 const raw=localStorage.getItem(LEGACY);
 const released=globalThis.__XMEMRelease01?.releasedSourceHash('melodic',LEGACY,raw);
 if(released){if(released!==head.legacyHash)fail('Released source witness differs from epoch');return null}
 if(raw===null||await digest(raw)!==head.legacyHash)fail('Legacy source mismatch/drift; old HTML may have changed source');
 return raw;
}
async function verifyReadable(db){
 const state=await inspectHead(db);if(state.head.version!==2)fail('Epoch is not prepared');
 await checkLegacy(state.head);
 const projects=state.rows.filter(r=>!r.deleted).sort((a,b)=>a.ordinal-b.ordinal).map(r=>JSON.parse(r.json));
 return {...state,projects};
}
function transaction(db,expected,head,changes=[]){return new Promise((resolve,reject)=>{
  let tx,settled=false;const error=e=>{if(!settled){settled=true;reject(e)}};
  try{
   tx=db.transaction([CONTROL,RECORDS],'readwrite');
   const get=tx.objectStore(CONTROL).get(HEAD);
   get.onsuccess=()=>{try{
     const old=get.result;
     if(!old||old.revision!==expected.revision||old.contentDigest!==expected.contentDigest||old.version!==expected.version||
       JSON.stringify(old.epoch??null)!==JSON.stringify(expected.epoch??null))fail('Stale repository head or epoch');
     const rows=tx.objectStore(RECORDS);
     for(const r of changes)rows.put(r);
     tx.objectStore(CONTROL).put(head);
    }catch(e){error(e);try{tx.abort()}catch{}}};
   get.onerror=()=>error(get.error||Error('Head get failed'));
   tx.oncomplete=()=>{if(!settled){settled=true;resolve()}};
   tx.onabort=()=>error(tx.error||Error('Write transaction aborted'));
   tx.onerror=()=>error(tx.error||Error('Write transaction error'));
  }catch(e){error(e);try{tx?.abort()}catch{}}
 })}
let busy=false;
async function exclusive(action){
 if(busy)fail('This tab has an in-flight epoch transaction');busy=true;
 try{
  if(navigator.locks?.request)return await navigator.locks.request('xensonar.xmem.melodic.pilot.v1',{mode:'exclusive',ifAvailable:true},lock=>{if(!lock)fail('Another cooperating tab owns the epoch');return action()});
  return await action();
 }finally{busy=false}
}
async function prepare({backupRaw,confirmEpochTest=false}={}){
 if(confirmEpochTest!==true)fail('Explicit retained-epoch confirmation required');
 if(typeof backupRaw!=='string')fail('Backup raw bytes required');
 return exclusive(()=>withDb(async db=>{
  const {head}=await inspectHead(db);
  if(head.version!==1)fail('Epoch already initialized; never overwrite');
  const original=localStorage.getItem(LEGACY);
  if(original===null||original!==backupRaw||await digest(original)!==head.legacyHash)fail('Backup witness differs from legacy source');
  // The old 02B reader must be valid before transition.
  const pilot=window.XenSonarXMemMelodicRepositoryPilot;
  const pilotData=await pilot.read();
  if(pilotData.revision!==head.revision||pilotData.count!==head.count)fail('Pre-migration 02B reader inconsistent');
  const witness={version:1,id:'retained-'+(crypto.randomUUID?.()||Date.now().toString(36)),phase:'retained',
   sourceHash:head.legacyHash,sourceRevision:head.revision,sourceDigest:head.contentDigest,
   backupHash:await digest(backupRaw),backupLength:backupRaw.length};
  const updated={...head,version:2,authority:'xmem-epoch-retained-test-v2',revision:head.revision+1,
   previousDigest:head.contentDigest,epoch:witness};
  await transaction(db,head,updated);
  const next=await verifyReadable(db);
  if(next.head.revision!==updated.revision||next.head.contentDigest!==head.contentDigest)fail('Epoch prepare commit verification failed');
  return {status:'EPOCH_RETAINED_VERIFIED',revision:updated.revision,epochId:witness.id,phase:witness.phase,count:head.count};
 }))
}
async function read(){return withDb(async db=>{
 const state=await verifyReadable(db);
 return {status:'EPOCH_VERIFIED',revision:state.head.revision,epochId:state.head.epoch.id,
  phase:state.head.epoch.phase,count:state.head.count,projects:clone(state.projects),
  records:state.rows.map(r=>({id:r.id,deleted:r.deleted,ordinal:r.ordinal,revision:r.revision}))};
})}
async function inspect(){return withDb(async db=>{
 const state=await inspectHead(db),phase=state.head.version===1?'legacy-bound':state.head.epoch.phase;
 return {revision:state.head.revision,version:state.head.version,phase,epochId:state.head.epoch?.id??null,
   count:state.head.count,legacyHash:state.head.legacyHash,contentDigest:state.head.contentDigest,legacyPresent:localStorage.getItem(LEGACY)!==null};
})}
async function inspectIntent(){return withDb(db=>verifyIntent(db))}
async function verifyIntent(db){
 const {head}=await inspectHead(db);
 if(head.version!==2||head.epoch.phase!=='release-intent')fail('No recoverable release intent');
 const raw=localStorage.getItem(LEGACY);
 if(raw===null||await digest(raw)!==head.legacyHash)fail('Release intent source absent or drifted; no recovery');
 return {revision:head.revision,epochId:head.epoch.id,intentId:head.epoch.intent.id,
  phase:'release-intent',count:head.count,legacyPresent:true,legacyCleanup:false};
}
async function beginReleaseIntent({backupRaw,expectedRevision,expectedEpochId,confirmReleaseIntentTest=false}={}){
 if(confirmReleaseIntentTest!==true)fail('Explicit release-intent test confirmation required');
 if(typeof backupRaw!=='string')fail('External verified Melodic backup raw bytes are required');
 return exclusive(()=>withDb(async db=>{
  const state=await verifyReadable(db),h=state.head;
  if(h.revision!==expectedRevision||h.epoch.id!==expectedEpochId)fail('Stale revision or epoch ID: release intent refused');
  const gate=window.XenSonarXMemD1Acceptance;
  if(!gate)fail('Current product acceptance evidence required');
  const proof=await gate.report();
  if(proof.result!=='READBACK_PASS_RESTART_USER_ATTESTED'||proof.revision!==h.revision||
     proof.epochId!==h.epoch.id||proof.releaseApproved!==false||proof.legacyCleanup!==false)
   fail('Current product acceptance evidence is incomplete or stale');
  const original=await checkLegacy(h);
  if(original!==backupRaw||backupRaw.length!==h.epoch.backupLength||await digest(backupRaw)!==h.epoch.backupHash)
   fail('External backup does not match the original legacy source');
  if(typeof crypto.randomUUID!=='function')fail('Cryptographic intent identifier unavailable');
  const intent={schema:1,id:crypto.randomUUID(),baseRevision:h.revision,baseDigest:h.contentDigest,
   baseCount:h.count,sourceHash:h.legacyHash,startedAt:new Date().toISOString()};
  const next={...h,revision:h.revision+1,previousDigest:h.contentDigest,
   epoch:{...h.epoch,phase:'release-intent',intent}};
  await transaction(db,h,next);
  // Do not equate a successful transaction callback with independently verified data.
  const checked=await verifyIntent(db);
  if(checked.revision!==next.revision||checked.intentId!==intent.id)fail('Release intent commit/readback disagreement');
  return checked;
 }))
}
async function cancelReleaseIntent({backupRaw,expectedRevision,intentId,confirmCancelReleaseIntent=false}={}){
 if(confirmCancelReleaseIntent!==true)fail('Explicit release-intent cancellation required');
 if(typeof backupRaw!=='string')fail('External verified Melodic backup raw bytes required for recovery');
 return exclusive(()=>withDb(async db=>{
  const verified=await verifyIntent(db),state=await inspectHead(db),h=state.head;
  if(h.revision!==expectedRevision||h.epoch.intent.id!==intentId||verified.revision!==expectedRevision)
   fail('Stale or replaced release intent; no recovery');
  const old=localStorage.getItem(LEGACY);
  if(old===null||old!==backupRaw||backupRaw.length!==h.epoch.backupLength||await digest(backupRaw)!==h.epoch.backupHash)
   fail('Recovery requires exact unchanged external backup and source');
  if(h.contentDigest!==h.epoch.intent.baseDigest||h.count!==h.epoch.intent.baseCount)
   fail('Repository changed during release intent; recovery refused');
  const {intent,...retained}=h.epoch;
  const next={...h,revision:h.revision+1,previousDigest:h.contentDigest,
   epoch:{...retained,phase:'retained',lastCanceledIntentId:intent.id}};
  await transaction(db,h,next);
  const restored=await verifyReadable(db);
  if(restored.head.revision!==next.revision||restored.head.contentDigest!==h.contentDigest||
     restored.head.count!==h.count||restored.head.epoch.lastCanceledIntentId!==intent.id)
   fail('Independent recovery readback failed');
  return {status:'RETAINED_RECOVERED',phase:'retained',revision:next.revision,
   epochId:h.epoch.id,canceledIntentId:intent.id,count:h.count,legacyCleanup:false};
 }))
}
async function replaceAll({expectedRevision,projects,confirmEpochWrite=false}={}){
 if(confirmEpochWrite!==true)fail('Explicit epoch write confirmation required');
 validateProjects(projects);
 return exclusive(()=>withDb(async db=>{
  const old=await verifyReadable(db),h=old.head;
  if(h.revision!==expectedRevision)fail('Stale epoch head');
  if(h.epoch.phase==='release-intent')fail('No write during release intent');
  const previous=new Map(old.rows.map(r=>[r.id,r]));
  const order=new Map(projects.map((p,i)=>[p.id,i]));
  const next=new Map(previous),changed=[];
  for(const p of projects){
   const former=previous.get(p.id),json=JSON.stringify(p),ordinal=order.get(p.id);
   if(former&&!former.deleted&&former.json===json&&former.ordinal===ordinal)continue;
   next.set(p.id,{id:p.id,revision:(former?.revision??0)+1,ordinal,deleted:false,json,sha256:await digest(json)});
  }
  for(const r of previous.values())if(!r.deleted&&!order.has(r.id))next.set(r.id,{id:r.id,revision:r.revision+1,ordinal:r.ordinal,deleted:true,json:null,sha256:null});
  // Reuse a tombstone ID only by explicitly supplied project; revision is monotonic.
  const after=await ledger([...next.values()]);
  for(const [id,row]of next)if(JSON.stringify(row)!==JSON.stringify(previous.get(id)))changed.push(row);
  const newHead={...h,revision:h.revision+1,count:after.live,contentDigest:after.digest,previousDigest:h.contentDigest};
  await checkLegacy(h);
  await transaction(db,h,newHead,changed);
  const verified=await verifyReadable(db);
  if(verified.head.revision!==newHead.revision||JSON.stringify(verified.projects)!==JSON.stringify(projects))fail('Epoch write post-commit mismatch');
  return {status:'EPOCH_WRITE_VERIFIED',revision:newHead.revision,count:after.live,phase:h.epoch.phase};
 }))
}
async function probeVersion(){
 if(typeof indexedDB?.databases!=='function')fail('Safe DB enumeration required');
 if(!(await indexedDB.databases()).some(d=>d.name===DB))return 0;
 return withDb(async db=>{const {head}=await inspectHead(db);return head.version});
}
Object.defineProperty(window,'XenSonarXMemMelodicEpochD1',{value:Object.freeze({
 prepare,read,inspect,probeVersion,replaceAll,beginReleaseIntent,cancelReleaseIntent,verifyIntent:inspectIntent,
 warning:'TEST ONLY. Retained / blocking release-intent; NEVER delete the original Melodic localStorage key.'
}),writable:false,configurable:false});
})();

