

/* XMEM-02C.2: persisted, opt-in authority marker plus nonblocking async hydration.
 * This does NOT release legacy localStorage or change the existing 02B IDB schema.
 * A selected IDB authority must NEVER fall back to legacy when unreadable.
 * The marker is a selection, NOT a second copy of the projects or an IDB commit.
 */
(()=>{
 'use strict';
 if(window.__XMEM_MR03_ENABLE_MELODIC__!==true)return;

 const KEY='xensonar-xmem-melodic-authority-test-v1';
 const EXPECTED_DB='xensonar-xmem-melodic-repository-pilot-v1';
 const LEGACY='xensonar-melodic-loop-projects-v1';
 const repo=window.XenSonarXMemMelodicRepositoryPilot;
 let state='inactive',revision=null,projection=null,busy=false,lastError='';
 let persistentSelected=false,bootstrapPromise=null,markerRaw=null,selecting=false;
 const clone=value=>JSON.parse(JSON.stringify(value));
 const fail=msg=>{throw Error('XMEM-02C.2: '+msg)};
 function validateMarker(raw){
  let m;try{m=JSON.parse(raw)}catch{fail('Persistent authority marker is not JSON')}
  if(!m||typeof m!=='object'||Array.isArray(m)||
    Object.keys(m).sort().join(',')!=='db,mode,source,version'||
    m.version!==1||m.mode!=='indexeddb'||m.db!==EXPECTED_DB||m.source!=='xmem02c2-test')
   fail('Unknown or corrupt persistent authority marker');
  return m;
 }
 try{
  markerRaw=localStorage.getItem(KEY);
  if(markerRaw!==null){validateMarker(markerRaw);persistentSelected=true;state='hydrating'}
 }catch(e){state='blocked';lastError=String(e?.message||e)}
 // DIRECT-01: fence ALL legacy reads/writes synchronously from initial module execution.
 // No legacy project may be shown before a verified IndexedDB hydration.
 if(state==='inactive')state='hydrating';
 function markerStable(){
  const current=localStorage.getItem(KEY);
  if(persistentSelected&&current!==markerRaw)fail('Persistent marker changed or removed by another tab');
  if(!persistentSelected&&current!==null)fail('Another tab selected persistent authority; legacy and IDB writers must stop');
 }
 function current(){return state==='active'}
 function legacyAllowed(){
  if(state!=='inactive')return false;
  try{markerStable();return true}catch(e){block(e);return false}
 }
 function status(){return Object.freeze({status:state,revision,count:projection?.length??null,lastError,
  persistentSelected,legacyMayBeStale:persistentSelected,
  note:'TEST ONLY: persisted authority selection. Never delete historical localStorage.'})}
 function snapshot(){if(!current())fail('Verified IDB projection unavailable');return clone(projection)}
 function equal(a,b){return JSON.stringify(a)===JSON.stringify(b)}
 function normalize(projects){
  if(typeof window.__XMEM02CNormalizeProjects!=='function')fail('Native Melodic normalizer unavailable');
  return window.__XMEM02CNormalizeProjects(projects);
 }
 function broadcast(){window.dispatchEvent(new CustomEvent('xensonar:melodic-project-library-changed',
  {detail:{projects:snapshot(),source:'xmem02c',revision}}))}
 function announce(){window.dispatchEvent(new CustomEvent('xensonar:melodic-storage-authority',
  {detail:{status:state,persistentSelected,lastError}}))}
 async function acceptRead(){
  markerStable();
  const data=await repo.read(); // Checks legacy hash, complete record digests, ordering.
  markerStable();
  const normalized=normalize(data.projects);
  if(normalized.length!==data.count||new Set(normalized.map(p=>p.id)).size!==normalized.length)
   fail('Native normalized project count/identities differ from verified IDB');
  projection=clone(normalized);revision=data.revision;state='active';lastError='';
  broadcast();announce();return status();
 }
 function block(e){
  state='blocked';lastError=String(e?.message||e);projection=null;revision=null;
  // Do not leave a stale active IDB projection visible after an async failure.
  try{window.dispatchEvent(new CustomEvent('xensonar:melodic-project-library-changed',
   {detail:{projects:[],source:'xmem-direct-blocked'}}))}catch(_){}
  console.error?.('[XMEM-DIRECT-01][authority-blocked]',lastError);announce();
 }
 async function activate({confirmCutoverTest=false}={}){
  if(confirmCutoverTest!==true)fail('Explicit confirmCutoverTest:true required');
  if(state!=='inactive')fail('Adapter already selected, hydrating or blocked');
  state='hydrating';
  try{return await acceptRead()}catch(e){block(e);throw e}
 }
 // Called from the application module after its canonical normalizer exists.
 // Never awaits on the module boot / Power / UI path; the selector has already
 // synchronously fenced legacy writes before any React effect can run.
 // Developer test: migrate once on first boot; never use legacy for the visible
 // project list, even when IDB is missing or damaged. The legacy bytes remain
 // untouched (except creation of [] on a genuinely empty browser origin).
 function bootstrap(){
  if(bootstrapPromise)return bootstrapPromise;
  if(state==='blocked')return Promise.reject(Error(lastError||'Authority blocked'));
  if(state==='active')return Promise.resolve(status());
  if(state!=='hydrating')return Promise.reject(Error('Unknown authority state'));
  bootstrapPromise=(async()=>{
   markerStable();
   // Already-selected authority: only read IDB, never restage from legacy.
   if(persistentSelected)return acceptRead();
   let raw=localStorage.getItem(LEGACY);
   if(raw===null){
    // The legacy staging format requires an explicit empty array as source.
    localStorage.setItem(LEGACY,'[]');raw='[]';
   }
   let projects;try{projects=JSON.parse(raw)}catch{fail('Legacy Melodic JSON invalid; original data preserved')}
   if(!Array.isArray(projects))fail('Legacy Melodic root is not an array');
   const seen=new Set();
   for(const p of projects){
    if(!p||typeof p.id!=='string'||!p.id.trim()||seen.has(p.id)||
       !p.composer||!Array.isArray(p.composer.tracks))
     fail('Invalid or duplicate Melodic project in original source');
    seen.add(p.id);
   }
   const existing=await repo.status();
   if(existing.status==='NO_PILOT'){
    const stage=window.XenSonarXMemMelodicStage;
    if(!stage)fail('XMEM stage component missing');
    const staged=await stage.verify();
    if(staged.status==='NO_STAGE'||staged.status==='STALE_SHADOW_ONLY')
     await stage.stage({confirmCopy:true});
    else if(staged.status!=='VERIFIED_SHADOW_ONLY'||staged.sourceCurrent!==true)
     fail('Existing staging copy cannot be trusted; original source preserved');
    markerStable();
    await repo.prepare({confirmPilot:true});
   }else if(existing.status!=='PILOT_ONLY_NO_APP_CUTOVER'){
    // A v2 repository without a marker is an ambiguous authority, not a
    // reason to replace or silently adopt someone else's IDB records.
    fail('Existing repository needs explicit recovery: '+String(existing.status));
   }
   markerStable();
   // activate() has its own synchronous fencing. No event loop turn here.
   state='inactive';
   await activate({confirmCutoverTest:true});
   await armPersistent({confirmPersistentTest:true});
   const epoch=window.XenSonarXMemMelodicEpochD1;
   if(epoch&&await epoch.probeVersion()===1){
    await promoteRetainedEpoch({backupRaw:raw,confirmRetainedEpochTest:true});
   }
   return status();
  })().catch(error=>{block(error);throw error});
  return bootstrapPromise;
 }
 async function armPersistent({confirmPersistentTest=false}={}){
  if(confirmPersistentTest!==true)fail('Explicit confirmPersistentTest:true required');
  if(state!=='active'||busy||selecting)fail('Verified, idle cutover required before selecting persistent authority');
  if(persistentSelected)return status();
  if(repo?.dbName!==EXPECTED_DB)fail('Wrong repository database');
  selecting=true;
  try{
   const check=await repo.read();
   if(check.revision!==revision||!equal(normalize(check.projects),projection))
    fail('Unverified or concurrently modified IDB projection');
   if(localStorage.getItem(KEY)!==null)fail('Authority marker already exists or changed in another tab');
   const raw=JSON.stringify({version:1,mode:'indexeddb',db:EXPECTED_DB,source:'xmem02c2-test'});
   // LocalStorage setItem is atomic per key, but cannot be transacted with IDB.
   localStorage.setItem(KEY,raw);
   if(localStorage.getItem(KEY)!==raw){state='blocked';lastError='Marker readback mismatch';fail(lastError)}
   markerRaw=raw;persistentSelected=true;announce();return status();
  }finally{selecting=false}
 }
 async function commit({projects,expectedProjects,description='Melodic project update'}={}){
  if(!current())fail('Authority is not active; no write occurred');
  if(busy||selecting)fail('Concurrent same-tab write or authority selection refused');
  if(!Array.isArray(projects)||!Array.isArray(expectedProjects))fail('Expected/next lists required');
  if(!equal(expectedProjects,projection))fail('Stale editor/React view; refresh before saving');
  const next=normalize(projects);
  if(!equal(next,projects))fail('Unnormalized input; refusing destructive normalization');
  busy=true;
  try{
   markerStable();
   const receipt=await repo.replaceAll({expectedRevision:revision,projects:next,confirmPilotWrite:true});
   const fresh=await repo.read();
   markerStable();
   if(fresh.revision!==receipt.revision||!equal(normalize(fresh.projects),next))
    fail('Independent post-commit verification mismatch');
   revision=fresh.revision;projection=clone(next);lastError='';broadcast();
   return Object.freeze({ok:true,status:'VERIFIED_IDB_COMMIT',revision,count:next.length,description});
  }catch(e){block(e);throw e}finally{busy=false}
 }
 async function refresh(){
  if(state==='inactive')fail('Authority not selected');
  if(busy||selecting||state==='hydrating')fail('Write, authority selection or hydration in progress');
  state='hydrating';
  try{return await acceptRead()}catch(e){block(e);throw e}
 }
 async function promoteRetainedEpoch({backupRaw,confirmRetainedEpochTest=false}={}){
  if(confirmRetainedEpochTest!==true)fail('Explicit retained-epoch test consent is required');
  if(state!=='active'||!persistentSelected||busy||selecting)fail('Verified idle persistent IDB authority required');
  markerStable();
  const epoch=window.XenSonarXMemMelodicEpochD1;
  if(!epoch)fail('Epoch engine unavailable');
  selecting=true;state='hydrating';announce();
  try{
   await epoch.prepare({backupRaw,confirmEpochTest:true});
   markerStable();
   return await acceptRead();
  }catch(error){block(error);throw error}
  finally{selecting=false}
}
function intentBlocked(reason){
 state='blocked';lastError=String(reason);projection=null;revision=null;announce();
}
async function beginReleaseIntent({backupRaw,confirmReleaseIntentTest=false}={}){
 if(confirmReleaseIntentTest!==true)fail('Explicit release-intent test confirmation required');
 if(!persistentSelected||state!=='active'||busy||selecting)fail('Verified idle persistent authority required');
 markerStable();
 const gate=window.XenSonarXMemD1Acceptance;
 if(!gate)fail('02D1A native acceptance evidence is required');
 // The acceptance report is computed against CURRENT canonical product state;
 // a previously saved successful JSON is deliberately not an authorisation.
 const evidence=await gate.report();
 if(evidence.result!=='READBACK_PASS_RESTART_USER_ATTESTED'||evidence.releaseApproved!==false||
    evidence.legacyCleanup!==false||evidence.projectPayloadsIncluded!==false||
    evidence.revision!==revision||!evidence.epochId)
  fail('Current native acceptance evidence is incomplete, stale or inconsistent');
 const epoch=window.XenSonarXMemMelodicEpochD1;
 const stateBefore=await epoch.inspect();
 if(stateBefore.phase!=='retained'||stateBefore.revision!==revision||
    stateBefore.epochId!==evidence.epochId)fail('Epoch changed since acceptance: intent refused');
 markerStable();
 // Keep the active read projection visible for the acceptance engine's independent
 // last-minute validation. 'selecting' fences all canonical commits meanwhile.
 selecting=true;announce();
 try{
  const receipt=await epoch.beginReleaseIntent({backupRaw,expectedRevision:revision,
   expectedEpochId:evidence.epochId,confirmReleaseIntentTest:true});
  markerStable();
  intentBlocked('Release intent persisted. Melodic read/write operations are blocked; original source is intact.');
  return receipt;
 }catch(e){block(e);throw e}finally{selecting=false}
}
async function cancelReleaseIntent({backupRaw,confirmCancelReleaseIntent=false}={}){
 if(confirmCancelReleaseIntent!==true)fail('Explicit recovery confirmation required');
 if(!persistentSelected||busy||selecting||state==='hydrating')fail('Stable persistent authority required for recovery');
 markerStable();
 const epoch=window.XenSonarXMemMelodicEpochD1;
 const status=await epoch.inspect();
 if(status.version!==2||status.phase!=='release-intent')fail('No release intent to cancel');
 // Inspect must not be treated as success: the direct epoch method validates
 // original raw bytes, IDB ledger and the intent in an atomic CAS transaction.
 selecting=true;state='hydrating';announce();
 try{
  const witness=await epoch.verifyIntent();
  await epoch.cancelReleaseIntent({backupRaw,expectedRevision:witness.revision,
   intentId:witness.intentId,confirmCancelReleaseIntent:true});
  markerStable();return await acceptRead();
 }catch(e){block(e);throw e}finally{selecting=false}
}
// Detect an authority selection/revocation performed in another cooperating tab.
 window.addEventListener?.('storage',e=>{
  if(e.key===KEY||e.key===null){try{markerStable()}catch(error){block(error)}}
 });
 // No unverified downgrade: older HTML remains capable of editing legacy,
 // which is detected by the repository's source-hash fence on next read/write.
 Object.defineProperty(window,'XenSonarXMemMelodicCutoverTest',{value:Object.freeze({
  activate,bootstrap,armPersistent,promoteRetainedEpoch,beginReleaseIntent,cancelReleaseIntent,commit,refresh,status,active:current,snapshot,legacyAllowed,
  warning:'TEST ONLY. Persistent IDB authority in an ISOLATED TEST PROFILE. NO LEGACY CLEANUP.'
 }),configurable:false,writable:false});
})();

