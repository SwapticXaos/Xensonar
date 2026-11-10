'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const pw=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const {go,executable}=require('./test_package_station_browser_p4.cjs');
const out=path.join(__dirname,'../test-results-p41');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await pw.chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const a=await go(browser),page=a.page;const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
 await page.getByRole('button',{name:'Open Package Station',exact:true}).click();const panel=page.getByRole('complementary',{name:'Paketinhalt'});await panel.waitFor();
 assert.equal(await panel.locator('[data-xen-package-category] input:checked').count(),27);const keyboardBox=panel.getByRole('checkbox',{name:'Samples & Uploads',exact:true});await keyboardBox.focus();await keyboardBox.press('Space');assert(!(await keyboardBox.isChecked()));await keyboardBox.press('Space');assert(await keyboardBox.isChecked());
 for(const group of ['Projekte & Arbeitsstände','Audio & Material','Instrumente & Vorlagen','Einstellungen & Sammlungen','Interne Sicherungen & Altbestände'])assert(await panel.getByRole('checkbox',{name:group+' auswählen',exact:true}).isChecked());
 const positions=[];
 for(const width of [1440,720,390]){
  await page.setViewportSize({width,height:920});await page.waitForTimeout(150);const r=await panel.boundingBox();assert(r.x>=0&&r.x+r.width<=width+1,'panel stays within viewport at '+width);assert(r.y>=0&&r.y+r.height<=920);const button=await page.getByRole('button',{name:'Prepare Workspace Package',exact:true}).boundingBox();assert(r.x>=button.x+button.width||r.y>=button.y+button.height,'selection must not cover download at '+width);positions.push({viewportWidth:width,...r});await page.screenshot({path:path.join(out,'selection-'+width+'.png')});
 }
 await page.setViewportSize({width:1440,height:1000});
 await panel.getByRole('button',{name:'Alle Rubriken abwählen',exact:true}).click();assert.equal(await panel.locator('[data-xen-package-category] input:checked').count(),0);assert(await page.getByRole('button',{name:'Prepare Workspace Package',exact:true}).isDisabled());
 await panel.getByRole('button',{name:'Nur Audio & Material',exact:true}).click();assert.equal(await panel.locator('[data-xen-package-category] input:checked').count(),3);
 await panel.getByRole('button',{name:'Alles außer Samples & Uploads',exact:true}).click();assert.equal(await panel.locator('[data-xen-package-category] input:checked').count(),26);assert(!(await panel.getByRole('checkbox',{name:'Samples & Uploads',exact:true}).isChecked()));assert(await panel.getByRole('checkbox',{name:'Audio & Material auswählen',exact:true}).evaluate(el=>el.indeterminate));
 await panel.getByRole('button',{name:'Gesamte Auswahl invertieren',exact:true}).click();assert.equal(await panel.locator('[data-xen-package-category] input:checked').count(),1);assert(await panel.getByRole('checkbox',{name:'Samples & Uploads',exact:true}).isChecked());
 await page.getByRole('button',{name:'Open Package Station',exact:true}).click();assert.equal(await panel.count(),0);await page.getByRole('button',{name:'Open Package Station',exact:true}).click();assert.equal(await panel.locator('[data-xen-package-category] input:checked').count(),1);
 // Populate actual namespaces; an orphan and an unrelated sample must not be read.
 await page.evaluate(async()=>{
  const open=(name,version,create)=>new Promise((resolve,reject)=>{const q=indexedDB.open(name,version);q.onupgradeneeded=()=>create(q.result);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
  const put=(db,store,rows)=>new Promise((resolve,reject)=>{const t=db.transaction(store,'readwrite');for(const row of rows)t.objectStore(store).put(row);t.oncomplete=resolve;t.onabort=()=>reject(t.error)});
  const donor=await open('xensonar-spectral-forge-material-intake-v1',1,d=>d.createObjectStore('records',{keyPath:'id'}));
  await put(donor,'records',[
   {id:'donor-library:preset:portable-one',value:{id:'portable-one',name:'Selected donor',assetId:'asset:used',instrumentPreset:'nodal:node-a@1'}},
   {id:'donor-library:preset:portable-two',value:{id:'portable-two',name:'Linked donor',assetId:'melodic-sample:sample-used'}},
   {id:'asset:used',value:{monoSamples:new Float32Array([.1,.2,.3]),sampleRate:48000}},
   {id:'asset:orphan',value:{monoSamples:new Float32Array(1024*1024)}},
   {id:'workspace:old',value:{source:{sourceAsset:{__materialIntakeAssetRef:'asset:orphan'}}}}
  ]);donor.close();const other=await open('xensonar-spectral-forge-experiment-state',1,d=>d.createObjectStore('records',{keyPath:'id'}));await put(other,'records',[{id:'asset:used',value:{monoSamples:new Float32Array(1024*1024)}}]);other.close();
  const samples=await open('xensonar-melodic-samples',3,d=>d.createObjectStore('samples',{keyPath:'id'}));await put(samples,'samples',[{id:'sample-used',name:'Used',blob:new Blob([new Uint8Array([11,22,33])])},{id:'sample-unused',name:'Unused',blob:new Blob([new Uint8Array(1024*1024)])}]);samples.close();
  localStorage.setItem('xensonar.nodal.instruments.v1',JSON.stringify({schema:'xensonar.nodal-library',schemaVersion:1,entries:[{id:'node-a',revision:1,instrument:{id:'node-a'}}]}));
  localStorage.setItem('xensonar.p41.unselected-setting','source-setting');
  const original=IDBObjectStore.prototype.get;IDBObjectStore.prototype.get=function(key){if(key==='asset:orphan'||key==='sample-unused'||(key==='asset:used'&&this.transaction.db.name==='xensonar-spectral-forge-experiment-state'))throw Error('Unselected audio was read');return original.call(this,key)};
 });
 await panel.getByRole('button',{name:'Nur Donor-Bibliothek',exact:true}).click();
 await page.getByRole('button',{name:'Prepare Workspace Package',exact:true}).click();const save=page.getByRole('link',{name:'Save Now',exact:true});await save.waitFor({timeout:90000});const [dl]=await Promise.all([page.waitForEvent('download'),save.click()]);const file=path.join(out,'donors-only.xenpack');await dl.saveAs(file);assert(fs.statSync(file).size<100000,'unselected large audio is excluded');
 // Native selected-category restore: preserve unrelated target rows and settings.
 const b=await go(browser);await b.page.evaluate(async()=>{
  localStorage.setItem('xensonar.p41.unselected-setting','target-setting');
  localStorage.setItem('xensonar.nodal.instruments.v1',JSON.stringify({schema:'xensonar.nodal-library',schemaVersion:1,entries:[{id:'node-b',revision:1,instrument:{id:'node-b'}}]}));
  await new Promise((resolve,reject)=>{const q=indexedDB.open('xensonar-melodic-samples',3);q.onupgradeneeded=()=>q.result.createObjectStore('samples',{keyPath:'id'});q.onsuccess=()=>{const d=q.result,t=d.transaction('samples','readwrite');t.objectStore('samples').put({id:'target-sample',name:'Target',blob:new Blob(['keep'])});t.oncomplete=()=>{d.close();resolve()};t.onabort=()=>reject(t.error)}});
 });
 await b.page.getByRole('button',{name:'Open Package Station',exact:true}).click();await b.page.locator('input[type=file][multiple]').setInputFiles(file);await b.page.waitForFunction(()=>window.__XenBoot?.state().ready&&JSON.parse(localStorage.getItem('xensonar.nodal.instruments.v1')||'{}').entries?.some(x=>x.id==='node-a'),{},{timeout:90000});
 const actual=await b.page.evaluate(async()=>{
  const rows=(name,store)=>new Promise((resolve,reject)=>{const q=indexedDB.open(name);q.onsuccess=()=>{const d=q.result,t=d.transaction(store),r=t.objectStore(store).getAll();r.onsuccess=()=>resolve(r.result);t.oncomplete=()=>d.close();r.onerror=()=>reject(r.error)}});
  const donors=await rows('xensonar-spectral-forge-material-intake-v1','records'),samples=await rows('xensonar-melodic-samples','samples');
  return {donors:donors.map(r=>r.id).sort(),samples:samples.map(r=>r.id).sort(),usedBytes:Array.from(new Uint8Array(await samples.find(r=>r.id==='sample-used').blob.arrayBuffer())),setting:localStorage.getItem('xensonar.p41.unselected-setting'),instruments:JSON.parse(localStorage.getItem('xensonar.nodal.instruments.v1')).entries.map(x=>x.id).sort()};
 });
 assert.deepEqual(actual.donors,['asset:used','donor-library:preset:portable-one','donor-library:preset:portable-two']);assert.deepEqual(actual.samples,['sample-used','target-sample']);assert.deepEqual(actual.usedBytes,[11,22,33]);assert.equal(actual.setting,'target-setting');assert.deepEqual(actual.instruments,['node-a','node-b']);assert.deepEqual(pageErrors,[]);
 const report={defaults:'27 of 27 checked',groups:5,shortcuts:'all, none, invert, only and except for groups and items passed',openClose:'synchronized',positions,selectedArchiveBytes:fs.statSync(file).size,dependencyClosure:'sample and donor audio included; orphan and unrelated audio not read',partialRestore:actual,errors:pageErrors};fs.writeFileSync(path.join(out,'selection-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 await a.context.close();await b.context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
