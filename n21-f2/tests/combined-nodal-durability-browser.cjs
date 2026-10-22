'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),ts=require('typescript'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'results/combined-startup/nodal');
const ownership=fs.readFileSync(path.join(root,'src/audio/01_voice_and_rfl_ownership.js'),'utf8'),melodic=fs.readFileSync(path.join(root,'src/forge_and_melodic/04_render_cache_and_stems.js'),'utf8');
function decl(source,name){const ast=ts.createSourceFile('source.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);const node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert(node,name);return node.getText(ast)}
(async()=>{const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
const page=await browser.newPage();await page.route('http://nodal-durability.test/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Nodal native durability</title>'}));await page.goto('http://nodal-durability.test/');
const names=['qhe','DS','Qhe','NS','__xenIDBTransaction','em','Uhe','bg','OS','Khe','__materialNextWrite','__materialQueueWrite','__materialPersistenceError','__materialAudioBlob','u0e','KT','d0e','bu','__registerDurableMaterial','LI'];
await page.addScriptTag({content:'const __materialWriteQueues=new Map(),__materialWriteVersions=new Map();\n'+names.map(n=>decl(ownership,n)).join('\n')+'\n'+decl(melodic,'B9e')+'\nwindow.api={bg,em,Uhe,NS,bu,B9e,register:__registerDurableMaterial,LI,hydrate:u0e,blob:__materialAudioBlob};'});
const report=await page.evaluate(async()=>{
 const rows=[],trace=[],delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 window.QT={dbName:'nodal-durability-'+Date.now(),storeName:'materials'};window.Ei={entries:[]};window.Ww=new Set();window.uh=()=>{};window.n0e=()=>[];
 const revoked=[];window.a0e=e=>({...e,blobUrl:URL.createObjectURL(e.blob)});window.UT=e=>e;
 window.GS=entries=>{Ei={entries};trace.push({stage:'publish',ids:entries.map(e=>e.id)})};window.Vw=(kind,item)=>trace.push({stage:'event',kind,id:item.id});
 const originalRevoke=URL.revokeObjectURL;URL.revokeObjectURL=function(url){revoked.push(url);return originalRevoke.call(this,url)};
 const originalPut=IDBObjectStore.prototype.put;let abortNext=false,quotaNext=false,pauseResolve=null,requestSucceeded=null;
 IDBObjectStore.prototype.put=function(...args){if(quotaNext){quotaNext=false;throw new DOMException('Injected quota exceeded','QuotaExceededError')}const request=originalPut.apply(this,args);if(abortNext){abortNext=false;request.addEventListener('success',()=>{trace.push({stage:'request-success-abort'});request.transaction.abort()})}if(requestSucceeded){const callback=requestSucceeded;requestSucceeded=null;request.addEventListener('success',callback)}return request};
 const entry=id=>({id,blob:new Blob([new Uint8Array(128)]),role:'loop',name:'Nodal'});
 abortNext=true;let result;try{await api.bg(QT,entry('native-abort'),'write failed');result='resolved'}catch(e){result=e.name}
 rows.push({case:'native success then transaction.abort',result,stored:await api.Uhe(QT,'native-abort','read')});
 window.ULe=()=>{};window.VR=async()=>({blob:entry('render').blob});window.I9e=()=>({});window.Ly=(_,blob)=>({...entry(window.exportId),blob});window.$M=(_,e)=>e;
 window.ri=(type,payload)=>trace.push({stage:'membership',type,payload});window.__mlNodalRflConfig=()=>({sourceKind:'material',renderMode:'flowing'});window.__mlContainsNodalTracks=()=>true;
 const send=async(id,kind)=>{trace.length=0;window.exportId=id;abortNext=kind==='abort';quotaNext=kind==='quota';const statuses=[];let result;try{await api.B9e({loopComposer:{},materialExport:{adapterId:'test',rootFollowPreferred:true},setStatus:s=>statuses.push(s)});result='resolved'}catch(e){result=e.name;return {case:kind,result,statuses,stage:e.stage,materialGhost:Ei.entries.some(e=>e.id===id),membership:trace.some(e=>e.stage==='membership'),stored:await api.Uhe(QT,id,'read'),trace:[...trace]}}return {case:kind,result,statuses,materialPublished:Ei.entries.some(e=>e.id===id),membership:trace.some(e=>e.stage==='membership'),storedBlobBytes:(await api.Uhe(QT,id,'read'))?.blob.size,trace:[...trace]}};
 rows.push(await send('export-abort','abort'));rows.push(await send('export-quota','quota'));rows.push(await send('export-success','success'));
 trace.length=0;const pending=api.register(entry('delete-race'));const deleted=api.LI('delete-race');let deleteResult;try{await pending;deleteResult='resolved'}catch(e){deleteResult=e.name}await deleted;rows.push({case:'delete before export commit',result:deleteResult,ghost:Ei.entries.some(e=>e.id==='delete-race'),stored:await api.Uhe(QT,'delete-race','read')});
 // The put succeeds before the delete is enqueued. The queued delete must win.
 let onSuccess;const successSignal=new Promise(resolve=>{onSuccess=resolve});requestSucceeded=onSuccess;
 const lateExport=api.register(entry('delete-after-request'));await successSignal;const lateDelete=api.LI('delete-after-request');let lateResult;try{await lateExport;lateResult='resolved'}catch(e){lateResult=e.name}await lateDelete;rows.push({case:'delete after native request success',result:lateResult,ghost:Ei.entries.some(e=>e.id==='delete-after-request'),stored:await api.Uhe(QT,'delete-after-request','read')});
 // Every completed operation closed its DB connection: version upgrade is unblocked.
 const upgrade=await Promise.race([new Promise((resolve,reject)=>{const request=indexedDB.open(QT.dbName,2);request.onsuccess=()=>{request.result.close();resolve('complete')};request.onerror=()=>reject(request.error);request.onblocked=()=>resolve('blocked')}),delay(1500).then(()=>'timeout')]);rows.push({case:'version upgrade after DB operations',result:upgrade});QT.version=2;
 // Snapshot export must report unavailable storage, never advertise it.
 const nativeDB=window.indexedDB;Object.defineProperty(window,'indexedDB',{value:undefined,configurable:true});let unavailable;try{await api.register(entry('no-idb'));unavailable='resolved'}catch(e){unavailable=e.name+': '+e.message}Object.defineProperty(window,'indexedDB',{value:nativeDB,configurable:true});rows.push({case:'durable export without IndexedDB',result:unavailable,ghost:Ei.entries.some(e=>e.id==='no-idb')});
 const structured=[];window.addEventListener('xensonar:material-persistence-error',event=>structured.push(event.detail));let missing;try{api.blob({id:'lost-blob',name:'Lost Nodal',blob:null},'root-follow-decode')}catch(error){missing={name:error.name,code:error.code,stage:error.stage,message:error.message}}rows.push({case:'lost saved blob',...missing,visibleEvent:structured.at(-1)});
 window.uV=entry=>entry;await api.bg(QT,{...entry('hydrate-race'),name:'persisted old'},'write');Ei={entries:[{...entry('hydrate-race'),name:'live edit'}]};await api.hydrate();const hydrated=Ei.entries.find(row=>row.id==='hydrate-race');await api.LI('hydrate-race');rows.push({case:'hydrate preserves current edit',name:hydrated.name});
 return {rows,dbName:QT.dbName,revokedUnpublishedURLs:revoked.length};
});
assert.equal(report.rows[0].result,'AbortError');assert.equal(report.rows[0].stored,null);
for(const row of report.rows.slice(1,3)){assert(!row.materialGhost);assert(!row.membership);assert.equal(row.stored,null);assert.equal(row.stage,'commit');assert(row.statuses.some(s=>s.includes('NOT saved [commit/')))}
assert(report.rows[3].materialPublished);assert(report.rows[3].membership);assert.equal(report.rows[3].storedBlobBytes,128);
for(const row of report.rows.slice(4,6)){assert.equal(row.result,'AbortError');assert(!row.ghost);assert.equal(row.stored,null)}
assert.equal(report.rows[6].result,'complete');assert(!report.rows[7].ghost);assert(report.rows[7].result.includes('IndexedDB not available'));assert(report.revokedUnpublishedURLs>=4);assert.equal(report.rows[8].name,'MissingMaterialAudioError');assert.equal(report.rows[8].code,'MATERIAL_AUDIO_MISSING');assert.equal(report.rows[8].visibleEvent.stage,'root-follow-decode');assert.equal(report.rows[9].name,'live edit');
await page.reload();
report.freshDocument=await page.evaluate(async dbName=>{
 const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(dbName);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
 try{const rows=await new Promise((resolve,reject)=>{const transaction=db.transaction('materials','readonly'),request=transaction.objectStore('materials').getAll();let value;request.onsuccess=()=>value=request.result;transaction.oncomplete=()=>resolve(value);transaction.onabort=()=>reject(transaction.error)});return {ids:rows.map(row=>row.id),bytes:rows.find(row=>row.id==='export-success')?.blob.size};}finally{db.close()}
},report.dbName);
assert.deepEqual(report.freshDocument.ids,['export-success']);assert.equal(report.freshDocument.bytes,128);
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'durability-browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
