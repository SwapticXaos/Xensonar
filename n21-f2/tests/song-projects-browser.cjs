'use strict';
const fs=require('fs'),assert=require('assert/strict'),{chromium}=require('playwright');
const manifest=require('../source-manifest.json'),files=[...manifest.files];
if(!files.includes('src/mix/03_song_projects.js'))files.splice(files.indexOf('src/mix/03_quick_menu.js')+1,0,'src/mix/03_song_projects.js');
const read=f=>fs.readFileSync(f,'utf8');
const resultDir='results/p7-24-song-projects';fs.mkdirSync(resultDir,{recursive:true});
let html=read('template/head.html')+files.map(read).join('')+'\nglobalThis.__songTest={quick:__XenQuick,songs:__XenSongProjects,exportLocal:Q7,importLocal:XEe,preparePackage:Ute,importPackage:_Q,seed:async()=>{for(let n=1;n<=2;n++){const bytes=new Uint8Array(44+1600),v=new DataView(bytes.buffer);for(const [at,text]of [[0,"RIFF"],[8,"WAVE"],[12,"fmt "],[36,"data"]])for(let i=0;i<text.length;i++)v.setUint8(at+i,text.charCodeAt(i));v.setUint32(4,bytes.length-8,true);v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,16000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);v.setUint32(40,1600,true);const m=$T({stableId:"song-fixture-"+n,name:"Song material "+n,role:"loop",bpm:120,bars:1,durationSec:.1,loopStartSec:0,loopEndSec:.1,rootFollowPreferred:true},new Blob([bytes],{type:"audio/wav"}));await QA(m.id,{name:m.name})}UA({memberIds:["song-fixture-1","song-fixture-2"],orderedIds:["song-fixture-1","song-fixture-2"]})}};\n'+read('template/script-close.html');
for(const s of manifest.styles)html+=s.tag+read(s.file)+'</style>'+s.after;
if(!manifest.styles.some(s=>s.file==='styles/27_song_projects.css'))html+='<style>'+read('styles/27_song_projects.css')+'</style>';
html+=read('template/foot.html');
(async()=>{const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});const errors=[],report={};try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__audioCalls=[];for(const type of ['AudioContext','OfflineAudioContext']){const ctor=window[type];if(!ctor)continue;for(const name of ['resume','suspend','close','startRendering']){const fn=ctor.prototype[name];if(fn)ctor.prototype[name]=function(...args){__audioCalls.push(type+'.'+name);return fn.apply(this,args)}}}for(const type of ['AudioBufferSourceNode','OscillatorNode']){const ctor=window[type];if(ctor){const fn=ctor.prototype.start;ctor.prototype.start=function(...args){__audioCalls.push(type+'.start');return fn.apply(this,args)}}}});
 await page.route('https://xensonar.test/**',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto('https://xensonar.test/song-projects');await page.locator('.xen-performance').waitFor();await page.waitForTimeout(300);
 await page.evaluate(()=>__songTest.seed());await page.waitForFunction(()=>__songTest.quick.adapters.get('material')?.entries.length>=2&&__songTest.quick.adapters.get('rootFollow')?.entries.length>=2);
 const rack=page.getByRole('button',{name:'Song Projects',exact:true});await rack.click();await page.getByRole('dialog',{name:'Song Projects editor'}).waitFor();
 await page.evaluate(()=>{__songTest.songs.createSong('Browser song');window.__chooseCalls=0;for(const adapter of __songTest.quick.adapters.values()){const fn=adapter.choose;adapter.choose=(...args)=>{__chooseCalls++;return fn(...args)}}window.__audioCalls=[];window.__libraryOrder=[...__songTest.quick.adapters].map(([kind,a])=>[kind,a.entries.map(e=>e.id)]);});
 const rows=page.locator('.xen-song-library-row');assert(await rows.count()>1,'Existing grid adapter must supply source rows');
 async function drag(source,target,at='middle'){await target.scrollIntoViewIfNeeded();await source.scrollIntoViewIfNeeded();const from=await source.boundingBox(),to=await target.boundingBox();assert(from&&to);await page.mouse.move(from.x+Math.min(from.width/2,100),from.y+from.height/2);await page.mouse.down();await page.mouse.move(from.x+110,from.y+from.height/2,{steps:5});await page.mouse.move(to.x+to.width/2,at==='top'?to.y+2:at==='bottom'?to.y+to.height-2:to.y+to.height/2,{steps:12});await page.mouse.up();}
 const column=page.locator('[data-xen-song-column="grid"]');const firstId=await rows.nth(0).getAttribute('data-xen-quick-id'),secondId=await rows.nth(1).getAttribute('data-xen-quick-id');
 await drag(rows.nth(0),column);assert.equal(await page.locator('[data-xen-song-item]').count(),1);
 await drag(rows.nth(1),column);assert.equal(await page.locator('[data-xen-song-item]').count(),2);
 await drag(rows.nth(0),column);assert.equal(await page.locator('[data-xen-song-item]').count(),2,'duplicate reference is deduplicated');
 const tiles=page.locator('[data-xen-song-item]');await drag(tiles.nth(1),tiles.nth(0),'top');assert.deepEqual(await page.evaluate(()=>__songTest.songs.part().items.map(e=>e.id)),[secondId,firstId]);
 await tiles.nth(0).click();assert.equal(await page.evaluate(()=>__chooseCalls),0,'editor tiles never activate library material');
 await page.getByRole('button',{name:'Save Song',exact:true}).click();await page.getByRole('button',{name:'Activate Part',exact:true}).click();assert.deepEqual(await page.evaluate(()=>__songTest.quick.getItems().map(e=>e.id)),[secondId,firstId]);
 await page.evaluate(()=>__songTest.quick.add({kind:'material',id:'missing-sample',name:'Missing sample'}));assert.match(await page.locator('[data-xen-song-live-status]').textContent(),/changed/);assert.equal(await page.evaluate(()=>__songTest.songs.dirty()),false);
 await page.getByRole('button',{name:'Use Current Quick Access',exact:true}).click();assert.equal(await page.locator('.is-missing').count(),1);
 await page.getByRole('button',{name:'Duplicate Part',exact:true}).click();await page.locator('[data-xen-song-item]').first().click({button:'right'});assert.equal(await page.locator('[data-xen-song-item]').count(),2);assert.equal(await page.evaluate(()=>__songTest.songs.selected().parts[0].items.length),3);
 // Existing pointer transaction cancels a drag on Escape, including captured clicks.
 const before=await page.evaluate(()=>JSON.stringify(__songTest.songs.part().items));const from=await rows.nth(0).boundingBox();await page.mouse.move(from.x+80,from.y+15);await page.mouse.down();await page.mouse.move(from.x+120,from.y+50,{steps:6});await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await page.evaluate(()=>JSON.stringify(__songTest.songs.part().items)),before);assert.equal(await page.locator('.xen-quick-pointer-ghost').count(),0);
 assert.equal(await rows.nth(0).evaluate(e=>{const event=new DragEvent('dragstart',{bubbles:true,cancelable:true});return e.dispatchEvent(event)}),false,'native browser drag must not take ownership');
 assert.deepEqual(await page.evaluate(()=>[...__songTest.quick.adapters].map(([kind,a])=>[kind,a.entries.map(e=>e.id)])),await page.evaluate(()=>__libraryOrder));
 assert.equal(await page.evaluate(()=>__chooseCalls),0);assert.deepEqual(await page.evaluate(()=>__audioCalls),[]);
 report.pointerKinds=['grid'];
 for(const [kind,label] of [['material','Material Track'],['rootFollow','Root Follow Loop'],['drum','Drums'],['bass','Bass']]){
  await page.getByRole('tab',{name:label,exact:true}).click();assert(await rows.count()>1,label+' adapter provides real entries');
  const target=page.locator('[data-xen-song-column="'+kind+'"]'),id=await rows.first().getAttribute('data-xen-quick-id');
  await drag(rows.first(),target);assert.equal(await target.locator('[data-xen-song-item][data-xen-quick-id="'+id+'"]').count(),1);
  await drag(rows.nth(1),target);
  const second=await rows.nth(1).getAttribute('data-xen-quick-id');
  await drag(target.locator('[data-xen-quick-id="'+second+'"]'),target.locator('[data-xen-quick-id="'+id+'"]'),'top');
  const order=await page.evaluate(kind=>__songTest.songs.part().items.filter(e=>e.kind===kind).map(e=>e.id),kind);assert(order.indexOf(second)<order.indexOf(id),label+' reorder');
  await target.locator('[data-xen-quick-id="'+id+'"]').click({button:'right'});assert.equal(await target.locator('[data-xen-quick-id="'+id+'"]').count(),0);report.pointerKinds.push(kind);
 }
 assert.equal(await page.evaluate(()=>__chooseCalls),0);assert.deepEqual(await page.evaluate(()=>__audioCalls),[]);
 assert.deepEqual(await page.evaluate(()=>[...__songTest.quick.adapters].map(([kind,a])=>[kind,a.entries.map(e=>e.id)])),await page.evaluate(()=>__libraryOrder),'all five source libraries retain their order');
 report.desktop=await page.locator('.xen-song-editor').evaluate(e=>({width:e.clientWidth,height:e.clientHeight}));await page.screenshot({path:resultDir+'/song-projects-desktop.png'});
 await page.getByRole('button',{name:'Save Song',exact:true}).click();
 report.packageRoundtrip=await page.evaluate(()=>{const a=__songTest.exportLocal(),key='xensonar.song-projects.v1',songs=localStorage.getItem(key);if(!a.entries.some(e=>e.key===key))throw Error('Songs absent from full package allowlist');localStorage.removeItem(key);const result=__songTest.importLocal({payload:a,mode:'replace'});if(localStorage.getItem(key)!==songs)throw Error('Package did not restore songs and drafts');__songTest.importLocal({payload:{schemaVersion:1,entries:[]},mode:'replace'});if(localStorage.getItem(key)!==songs)throw Error('Legacy package erased newer songs');return{included:true,restored:true,legacyProtected:true,imported:result.importedCount}});
 const selectedItems=await page.evaluate(()=>__songTest.songs.part().items.length);
 await page.reload();await page.locator('.xen-performance').waitFor();await page.getByRole('button',{name:'Song Projects',exact:true}).click();assert.equal(await page.locator('[data-xen-song-item]').count(),selectedItems,'saved draft selection survives reload');
 await page.setViewportSize({width:700,height:700});report.narrow=await page.locator('.xen-song-scroll').evaluate(e=>({client:e.clientWidth,scroll:e.scrollWidth}));assert(report.narrow.scroll>report.narrow.client,'columns scroll rather than shrink');
 // Transfer an actual full package into a separate browser storage context.
 await page.evaluate(()=>{__songTest.songs.renamePart('Unsaved transfer draft');__songTest.songs.createSong('Other song');__songTest.songs.saveSong();__songTest.songs.loadSong(__songTest.songs.snapshot().drafts[0].id)});
 const transfer=await page.evaluate(async()=>{const prepared=await __songTest.preparePackage({waitForHandlerMs:0});return{raw:await(await fetch(prepared.download.url)).text(),songs:localStorage.getItem(__songTest.songs.key),items:__songTest.songs.part().items,missing:__songTest.songs.diagnostics().map(e=>e.id)}});
 const archive=JSON.parse(transfer.raw);assert(archive.materialLibrary.entries.length>=2);assert(archive.rootFollowBank.memberIds.length>=2);assert(archive.browserLocalStorage.entries.some(e=>e.key==='xensonar.song-projects.v1'));
 const freshContext=await browser.newContext({viewport:{width:1500,height:1000}});const fresh=await freshContext.newPage();fresh.on('pageerror',e=>errors.push(e.message));await fresh.route('https://xensonar.test/**',r=>r.fulfill({contentType:'text/html',body:html}));await fresh.goto('https://xensonar.test/import');await fresh.locator('.xen-performance').waitFor();
 assert.equal(await fresh.evaluate(()=>localStorage.getItem('xensonar.song-projects.v1')),null);
 await fresh.evaluate(raw=>__songTest.importPackage({file:new File([raw],'full-workspace.json',{type:'application/json'}),mode:'replace',savedMelodicProjects:[]}),transfer.raw);
 await fresh.reload();await fresh.locator('.xen-performance').waitFor();await fresh.waitForFunction(()=>__songTest.quick.adapters.get('material')?.entries.length>=2);
 assert.equal(await fresh.evaluate(()=>localStorage.getItem(__songTest.songs.key)),transfer.songs,'full package preserves saved songs and unsaved drafts exactly');
 assert.deepEqual(await fresh.evaluate(()=>__songTest.songs.part().items),transfer.items);assert.deepEqual(await fresh.evaluate(()=>__songTest.songs.diagnostics().map(e=>e.id)),transfer.missing,'restored library references resolve in a fresh browser');
 assert.equal(await fresh.evaluate(()=>__songTest.songs.dirty()),true);assert.equal(await fresh.evaluate(()=>__songTest.songs.part().name),'Unsaved transfer draft');
 report.freshPackage={songs:await fresh.evaluate(()=>__songTest.songs.snapshot().drafts.length),materials:archive.materialLibrary.entries.length,rootFollow:archive.rootFollowBank.memberIds.length,draftPreserved:true,referencesResolve:true};await freshContext.close();
 assert.deepEqual(errors,[]);fs.writeFileSync(resultDir+'/browser-report.json',JSON.stringify({...report,pageErrors:errors},null,2)+'\n');console.log('PASS Song Projects browser: real library adapters, pointer add/reorder/dedupe/cancel, native drag prevention, right-click removal, no choose/audio calls, missing references, live divergence, persistence, five tabs, narrow scrolling.',JSON.stringify(report));
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
