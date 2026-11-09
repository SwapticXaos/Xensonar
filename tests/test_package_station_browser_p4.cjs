'use strict';
// Native browser acceptance: actual header command -> download -> empty profile ->
// load/reload before initializers -> reexport, corruption and crash rollback.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const pw=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),url='file://'+path.join(root,'dist/XenSonar_Standalone.html');
const output=path.join(root,'test-results-p4');fs.mkdirSync(output,{recursive:true});
const executable=process.env.P4_CHROMIUM||pw.chromium.executablePath();
const errors=[];
async function go(browser){const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});await context.addInitScript(()=>{window.showSaveFilePicker=undefined;window.__XEN_PACKAGE_STATION_TEST__=true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if((/^(DIGEST|P4 )/).test(e.text()))console.log(e.text())});page.on('dialog',d=>d.accept());await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__XenBoot?.state().ready);await page.evaluate(()=>{window.showSaveFilePicker=undefined;window.__XEN_PACKAGE_STATION_TEST__=true});return {context,page}}
async function seed(page,mb=8){return page.evaluate(async mb=>{
 const open=(n,v,f)=>new Promise((res,rej)=>{const r=indexedDB.open(n,v);r.onupgradeneeded=()=>f(r.result);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
 const put=(db,s,v,k)=>new Promise((res,rej)=>{const t=db.transaction(s,'readwrite');k===undefined?t.objectStore(s).put(v):t.objectStore(s).put(v,k);t.oncomplete=res;t.onabort=()=>rej(t.error)});
 const db=await open('xensonar-p4-portability-fixture',2,d=>{const s=d.createObjectStore('records',{keyPath:'id'});s.createIndex('byName','name',{unique:true});d.createObjectStore('outOfLine')});
 const count=mb/4;
 for(let i=0;i<count;i++){const bytes=new Uint8Array(4*1024*1024);for(let j=0;j<bytes.length;j++)bytes[j]=(j*17+i*23)%251;await put(db,'records',{id:'asset:'+i,name:'asset-'+i,pcm:new Float32Array(bytes.buffer),reference:'melodic-sample:sample-fixed',date:new Date(1700000000000+i),nested:{blob:new Blob([bytes.subarray(0,65537)],{type:'audio/wav'})}})}
 await put(db,'outOfLine',{projectId:'project-fixed',sample:'sample-fixed',mask:new Uint8Array([4,8,16]),eq:[0,.25,-.8]},['compound',new Date(1234)]);db.close();
 const samples=await open('xensonar-melodic-samples',3,d=>d.createObjectStore('samples',{keyPath:'id'}));
 const wav=new Uint8Array(100);new DataView(wav.buffer).setUint32(0,0x52494646); // Bytes are archival fixture; no playback assumed.
 await put(samples,'samples',{id:'sample-fixed',name:'Original sample',createdAt:123,durationSec:.001,sizeBytes:100,baseHz:293.333,baseHzSource:'manual',tempoPitchLinked:true,blob:new Blob([wav],{type:'audio/wav'}),origin:'browserLocal',syncState:'localOnly'});samples.close();
 localStorage.setItem('xensonar.p4.fixture',JSON.stringify({version:1,ids:['sample-fixed','asset:0'],eq:Array.from({length:360},(_,i)=>Math.sin(i)*.8),tuning:19,bars:7}));
 sessionStorage.setItem('xensonar.p4.session','independent-session');localStorage.setItem('other-application-key','must-stay-local');return {mb,records:count+2};
 },mb)}
async function digest(page){return page.evaluate(async()=>{
 const read=(name,store,key)=>new Promise((res,rej)=>{const q=indexedDB.open(name);q.onsuccess=()=>{const db=q.result,t=db.transaction(store),r=key===undefined?t.objectStore(store).getAll():t.objectStore(store).get(key);r.onsuccess=()=>res(r.result);t.oncomplete=()=>db.close();r.onerror=()=>rej(r.error)}});
 console.log('DIGEST records');const rows=await read('xensonar-p4-portability-fixture','records'),out=[];console.log('DIGEST records-read '+rows.length);
 for(const r of rows){const sum=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(x=>x.toString(16).padStart(2,'0')).join('');out.push({id:r.id,name:r.name,reference:r.reference,date:r.date.toISOString(),pcm:await sum(r.pcm.buffer),blob:await sum(await r.nested.blob.arrayBuffer()),mime:r.nested.blob.type})}
 console.log('DIGEST samples');const samples=await read('xensonar-melodic-samples','samples'),sample=samples.find(x=>x.id==='sample-fixed');
 console.log('DIGEST complete');return {rows:out,fixture:localStorage.getItem('xensonar.p4.fixture'),session:sessionStorage.getItem('xensonar.p4.session'),sample:{id:sample.id,name:sample.name,baseHz:sample.baseHz,bytes:await sample.blob.arrayBuffer().then(b=>Array.from(new Uint8Array(b)))}};
 })}
async function download(page,file){
 await page.getByRole('button',{name:'Open Package Station',exact:true}).click();
 await page.getByRole('button',{name:'Prepare Workspace Package',exact:true}).click();
 const save=page.getByRole('link',{name:'Save Now',exact:true});const debug=setTimeout(()=>page.evaluate(()=>document.body.innerText.slice(0,6000)).then(x=>console.log('WAITING-DOM',x)).catch(()=>{}),15000);try{await save.waitFor({timeout:180000})}finally{clearTimeout(debug)};
 const [dl]=await Promise.all([page.waitForEvent('download'),save.click()]);await dl.saveAs(file);
 return page.evaluate(()=>({stats:window.__XenPackageStation4.stats(),diag:window.__XenPackageStation4.diagnostics(),rooms:window.__XenRoomChunks.status()}));
}
module.exports={go,seed,digest,download,url,executable};
if(require.main===module)(async()=>{
 const browser=await pw.chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const targetBrowser=process.env.P4_TARGET_FIREFOX?await pw.firefox.launch({headless:true,firefoxUserPrefs:{'security.sandbox.content.level':0},env:{...process.env,MOZ_DISABLE_CONTENT_SANDBOX:'1'}}):browser;
 const report={targetEngine:process.env.P4_TARGET_FIREFOX?'firefox':'chromium'};try{
 console.log('source boot');const a=await go(browser);console.log('source ready');await seed(a.page,8);console.log('seeded');const expected=await digest(a.page),first=path.join(output,'full.xenpack');console.log('source export');report.source=await download(a.page,first);console.log('source exported');await a.page.getByRole('button',{name:'Open runtime diagnostics',exact:true}).click();const [diagnostic]=await Promise.all([a.page.waitForEvent('download'),a.page.getByRole('button',{name:'Download runtime diagnostics ZIP',exact:true}).click()]);await diagnostic.saveAs(path.join(output,'runtime-diagnostics.zip'));await a.page.getByRole('button',{name:'einklappen ◂',exact:true}).click();assert.equal(report.source.rooms.canonical,false,'backup must not mount Melodic');assert(report.source.stats.maxChunk<=1048576);
 console.log('target boot');const b=await go(targetBrowser);console.log('target ready');await b.page.evaluate(()=>localStorage.setItem('other-application-key','target-only'));
 await b.page.getByRole('button',{name:'Open Package Station',exact:true}).click();const input=b.page.locator('input[type=file][multiple]');console.log('target import');await input.setInputFiles(first);console.log('file selected');
 await b.page.waitForFunction(()=>localStorage.getItem('xensonar.p4.fixture')!==null,{},{timeout:180000});await b.page.waitForFunction(()=>window.__XenBoot?.state().ready);
 console.log('target digest');assert.deepEqual(await digest(b.page),expected);assert.equal(await b.page.evaluate(()=>localStorage.getItem('other-application-key')),'target-only');
 const second=path.join(output,'reexport.xenpack');report.target=await download(b.page,second);
 // Verify corrupt files do not change a single live fixture before restore.
 const corrupted=fs.readFileSync(first);corrupted[Math.floor(corrupted.length*.65)]^=0x40;const bad=path.join(output,'corrupt.xenpack');fs.writeFileSync(bad,corrupted);
 const before=await digest(b.page);await b.page.locator('input[type=file][multiple]').setInputFiles(bad);await b.page.getByText(/Prüfsumme stimmt nicht/).waitFor();assert.deepEqual(await digest(b.page),before);
 // Native crash journal recovery, before any app initializer; rollback from disk.
 await b.page.evaluate(async()=>{const p=window.__XenPackageStation4,t=p._test;await t.exportSpool('rollback',{main:null,melodic:null});localStorage.setItem(t.JOURNAL,JSON.stringify({version:4,phase:'applying'}));localStorage.setItem('xensonar.p4.fixture','HALF-IMPORTED');const q=indexedDB.open('xensonar-p4-portability-fixture');await new Promise((res,rej)=>{q.onsuccess=()=>{const db=q.result,x=db.transaction('records','readwrite');x.objectStore('records').clear();x.oncomplete=()=>{db.close();res()};x.onabort=()=>rej(x.error)}})});
 await b.page.reload({waitUntil:'domcontentloaded'});await b.page.waitForFunction(()=>window.__XenBoot?.state().ready,{},{timeout:180000});console.log('target digest');assert.deepEqual(await digest(b.page),expected);assert.equal(await b.page.evaluate(()=>localStorage.getItem('xensonar:package-station:v4:recovery')),null);
 report.rollback='passed';report.corruption='passed';report.roundtrip='passed';report.errors=errors;assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 await a.context.close();await b.context.close();
 }finally{if(targetBrowser!==browser)await targetBrowser.close();await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
