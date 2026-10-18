const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),file=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).entry));
const results=[];let b,p,errors;
const menus={drum:'button[title^="Manage Drum"]',bass:'button[title^="Manage Bass"]',grid:'button[title="Open Grid Workbench"]',material:'button[title^="Manage Material Track"]',rootFollow:'button[title^="Manage Root Follow"]'};
async function open(kind){await p.locator(menus[kind]).click();await p.locator(`[data-xen-header-menu="${kind}"]`).waitFor()}
async function gesture(row,dest,release=true){const r=await row.boundingBox();await p.mouse.move(r.x+r.width*.65,r.y+r.height*.5);await p.mouse.down();await p.mouse.move(dest.x,dest.y,{steps:25});if(release)await p.mouse.up()}
async function dock(part=.65){const r=await p.locator('.xen-quick-dock').boundingBox();return{x:r.x+r.width*part,y:r.y+r.height*.5}}
async function ids(kind){return p.locator(`[data-xen-quick-kind="${kind}"]`).evaluateAll(es=>es.map(e=>e.dataset.xenQuickId))}
async function run(name,fn,size={width:1740,height:950}){
 b=await chromium.launch({headless:true,...(process.env.XEN_CHROMIUM_PATH?{executablePath:process.env.XEN_CHROMIUM_PATH}:{}),args:['--no-sandbox',...(process.env.XEN_SINGLE_PROCESS?['--no-zygote','--single-process']:[])]});
 p=await b.newPage({viewport:size});p.setDefaultTimeout(6000);errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{await p.goto('file://'+file);await p.locator('.xen-quick-dock').waitFor();await fn();assert.deepEqual(errors,[]);console.log('PASS',name);results.push({name,pass:true})}
 catch(e){console.log('FAIL',name,e.message.slice(0,800));results.push({name,pass:false,error:e.message})}
 finally{await b.close()}
}
(async()=>{
 await run('click selection, pulse, hover, cancel, outside, duplicate, recall, remove, persistence',async()=>{
  await open('drum');const row=p.locator('[data-xen-quick-kind="drum"]').nth(1),name=await row.getAttribute('data-xen-quick-name');
  await row.click();assert.equal(await p.locator('input').filter({visible:true}).count()>0,true);
  assert(await p.locator('.xen-quick-signal').count()>0);assert.equal(await p.locator('.xen-quick-signal').first().evaluate(e=>getComputedStyle(e).animationIterationCount),'2');
  let dest=await dock();await p.mouse.move(dest.x,dest.y);assert(await p.locator('.xen-quick-hover-info').isVisible());
  assert.equal(await p.locator('.xen-quick-hover-info').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
  await gesture(row,dest,false);await p.keyboard.press('Escape');await p.mouse.up();
  assert.equal(await p.locator('.xen-quick-tile').count(),0);assert.equal(await p.locator('[data-xen-header-menu="drum"]').count(),1);assert.equal(await p.locator('.xen-quick-pointer-ghost').count(),0);
  const before=await ids('drum');await gesture(row,{x:35,y:45});assert.equal(await p.locator('.xen-quick-tile').count(),0);assert.deepEqual(await ids('drum'),before);
  await gesture(row,dest);await gesture(row,dest);assert.equal(await p.locator('.xen-quick-tile').count(),1);
  await p.keyboard.press('Escape');const tile=p.locator('.xen-quick-tile');await tile.click();
  assert((await p.locator(menus.drum).getAttribute('title')).includes(name));assert.equal(await p.locator('[data-xen-header-menu]').count(),0);
  await p.reload();await tile.waitFor();await tile.click({button:'right'});await p.getByRole('button',{name:'Abbrechen',exact:true}).click();assert.equal(await tile.count(),1);
  await tile.click({button:'right'});await p.getByRole('button',{name:'Entfernen',exact:true}).click();assert.equal(await tile.count(),0);
 });
 await run('internal insert, export after sorting begins, leave and re-enter playlist',async()=>{
  await open('drum');let before=await ids('drum');const rows=p.locator('[data-xen-quick-kind="drum"]'),r=await rows.nth(2).boundingBox();
  await gesture(rows.first(),{x:r.x+r.width*.6,y:r.y+r.height-2});
  await p.waitForFunction(first=>document.querySelector('[data-xen-quick-kind="drum"]')?.dataset.xenQuickId!==first,before[0]);
  let after=await ids('drum');assert.deepEqual(after.slice(0,3),[before[1],before[2],before[0]],'lower edge inserts after');
  const dest=await dock();before=await ids('drum');let a=await rows.first().boundingBox(),c=await rows.nth(1).boundingBox();
  await p.mouse.move(a.x+a.width*.6,a.y+a.height*.5);await p.mouse.down();await p.mouse.move(c.x+c.width*.6,c.y+c.height*.5,{steps:14});
  assert.equal(await p.locator('[data-xen-sort-preview]').count(),0,'pointer drag must not mount a second legacy preview');
  await p.mouse.move(dest.x,dest.y,{steps:16});await p.mouse.up();assert.deepEqual(await ids('drum'),before);assert.equal(await p.locator('.xen-quick-tile').count(),1);
  a=await rows.first().boundingBox();c=await rows.nth(1).boundingBox();await gesture(rows.first(),dest,false);await p.mouse.move(c.x+c.width*.6,c.y+c.height*.5,{steps:14});await p.mouse.up();
  await p.waitForFunction(id=>document.querySelector('[data-xen-quick-kind="drum"]')?.dataset.xenQuickId===id,before[1]);
  assert.equal(await p.locator('.xen-quick-tile').count(),1);
 });
 await run('bass working-copy sorting and export',async()=>{
  await open('bass');await p.getByRole('button',{name:'Save As…',exact:true}).first().click();
  await p.getByLabel('New Bass Pattern Name').fill('N19 second bass');await p.getByRole('button',{name:'Save As…',exact:true}).first().click();
  const rows=p.locator('[data-xen-quick-kind="bass"][data-xen-quick-id^="clip:"]');assert.equal(await rows.count(),2);
  const before=await rows.evaluateAll(es=>es.map(e=>e.dataset.xenQuickId)),r=await rows.nth(1).boundingBox();
  await gesture(rows.first(),{x:r.x+r.width*.65,y:r.y+r.height*.5});
  await p.waitForFunction(id=>document.querySelector('[data-xen-quick-id^="clip:"]')?.dataset.xenQuickId===id,before[1]);
  const after=await rows.evaluateAll(es=>es.map(e=>e.dataset.xenQuickId));assert.deepEqual(after,[before[1],before[0]]);
  await gesture(rows.first(),await dock());assert.deepEqual(await rows.evaluateAll(es=>es.map(e=>e.dataset.xenQuickId)),after);assert.equal(await p.locator('.xen-quick-tile').count(),1);
 });
 await run('grid rack swap, tuning-library to rack, tuning-library to quick access',async()=>{
  await open('grid');const rack=p.locator('[data-xen-sort-zone="grid"] [data-xen-quick-kind="grid"][data-xen-quick-id]:not([data-xen-quick-id=""])');
  let before=await rack.evaluateAll(es=>es.map(e=>e.dataset.xenQuickId));assert(before.length>=2);let r=await rack.nth(1).boundingBox();
  await gesture(rack.first(),{x:r.x+r.width*.5,y:r.y+r.height*.5});
  await p.waitForFunction(id=>document.querySelector('[data-xen-sort-zone="grid"] [data-xen-quick-id]')?.dataset.xenQuickId===id,before[1]);
  before=await rack.evaluateAll(es=>es.map(e=>e.dataset.xenQuickId));
  await rack.last().locator('..').getByRole('button',{name:'−',exact:true}).click();
  before=await rack.evaluateAll(es=>es.map(e=>e.dataset.xenQuickId));
  const lib=p.locator('[data-xen-header-menu="grid"] [data-xen-quick-kind="grid"]').filter({hasNot:p.locator('[data-xen-sort-zone]')});
  const candidates=await p.locator('[data-xen-quick-kind="grid"]').evaluateAll(es=>es.filter(e=>!e.closest('[data-xen-sort-zone]')).map(e=>e.dataset.xenQuickId));
  const id=candidates.find(id=>!before.includes(id));assert(id);const source=p.locator(`[data-xen-quick-kind="grid"][data-xen-quick-id="${id}"]`);await source.scrollIntoViewIfNeeded();
  const empty=p.locator('[data-xen-sort-zone="grid"] [data-xen-quick-id=""]').first();r=await empty.boundingBox();assert(r);
  await gesture(source,{x:r.x+r.width*.5,y:r.y+r.height*.5});assert((await rack.evaluateAll(es=>es.map(e=>e.dataset.xenQuickId))).includes(id));
  const libsource=p.locator(`[data-xen-quick-kind="grid"][data-xen-quick-id="${id}"]`).last();await libsource.scrollIntoViewIfNeeded();await gesture(libsource,await dock());assert.equal(await p.locator('.xen-quick-tile').count(),1);
 });
 for(const width of [1024,1320,1740])await run('header reachability and full-width target at '+width,async()=>{
  for(const kind of ['material','rootFollow','drum','bass']){
   const button=p.locator(menus[kind]);assert(await button.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width*.5,r.y+r.height*.5);return hit&&e.contains(hit)}),kind+' header must be unobscured');
  }
  await open('bass');const row=p.locator('[data-xen-quick-kind="bass"]').first();for(const part of [.05,.5,.95]){await gesture(row,await dock(part));assert.equal(await p.locator('.xen-quick-tile').count(),1)}
 },{width,height:850});
 await run('full illuminated left palette accepts drops above fixed dock',async()=>{
  await open('drum');const rows=p.locator('[data-xen-quick-kind="drum"]');
  for(let i=0;i<3;i++)await gesture(rows.nth(i),await dock());
  const palette=p.locator('.xen-quick-collection');assert(!(await palette.getAttribute('class')).includes('is-migrated'));
  const r=await palette.boundingBox(),d=await p.locator('.xen-quick-dock').boundingBox();assert(r.y<d.y);
  await gesture(rows.nth(3),{x:r.x+r.width*.65,y:r.y+12});assert.equal(await p.locator('.xen-quick-tile').count(),4);
 },{width:1320,height:950});
 await run('long-list auto-scroll followed by export preserves order',async()=>{
  await open('drum');const rows=p.locator('[data-xen-quick-kind="drum"]'),before=await ids('drum');
  const list=p.locator('[data-xen-sort-zone="drum"]'),r=await list.boundingBox();
  assert(await list.evaluate(e=>e.scrollHeight>e.clientHeight));
  await gesture(rows.first(),{x:r.x+r.width*.65,y:r.y+r.height-3},false);
  await p.waitForFunction(()=>document.querySelector('[data-xen-sort-zone="drum"]').scrollTop>65);
  const dest=await dock();await p.mouse.move(dest.x,dest.y,{steps:16});await p.mouse.up();
  assert.deepEqual(await ids('drum'),before);assert.equal(await p.locator('.xen-quick-tile').count(),1);
 },{width:1740,height:620});
 await run('right-hand migration preserves the independent left landing surface',async()=>{
  await open('drum');const rows=p.locator('[data-xen-quick-kind="drum"]');
  for(let i=0;i<7;i++)await gesture(rows.nth(i),await dock());
  assert(await p.locator('.xen-quick-collection.is-migrated').count()===1,'palette must migrate with seven rows');
  const r=await p.locator('.xen-quick-collection').boundingBox();assert(r.x>1000);
  const before=await ids('drum');await gesture(rows.nth(7),await dock(.9));assert.equal(await p.locator('.xen-quick-tile').count(),8);assert.deepEqual(await ids('drum'),before);
 },{width:1740,height:850});
 await run('menu navigation, octave independence, nine slot hints',async()=>{
  await open('rootFollow');for(const [key,kind] of [['ArrowRight','drum'],['ArrowRight','bass'],['ArrowRight','grid'],['ArrowRight','material'],['ArrowLeft','grid'],['ArrowLeft','bass']]){
   await p.keyboard.press(key);await p.locator(`[data-xen-header-menu="${kind}"]`).waitFor();assert.equal(await p.locator('[data-xen-header-menu]').count(),1);
  }
  await p.evaluate(()=>new Promise(requestAnimationFrame));await p.mouse.click(8,8);await p.keyboard.press('Escape');await p.locator('[data-xen-header-menu]').waitFor({state:'detached'});const initial=await p.locator('.xen-source-octave output').allTextContents();assert.equal(initial.length,3);
  await p.getByLabel('Particles octave up',{exact:true}).click();const changed=await p.locator('.xen-source-octave output').allTextContents();assert.deepEqual(changed.slice(1),initial.slice(1));assert.equal(Number(changed[0]),Number(initial[0])+1);
  await open('material');await p.locator('input[type=file][accept="audio/*"]').first().setInputFiles(path.join(root,'tests/fixtures/test-loop.wav'));
  await p.locator('[data-xen-quick-kind="material"]').first().waitFor();assert((await p.locator('[data-xen-quick-kind="material"]').first().innerText()).includes('(A)'));
  const bytes=fs.readFileSync(path.join(root,'tests/fixtures/test-loop.wav'));
  for(let i=1;i<9;i++){
   await p.locator('input[type=file][accept="audio/*"]').first().setInputFiles({name:`N19 slot ${i+1}.wav`,mimeType:'audio/wav',buffer:bytes});
   await p.waitForFunction(n=>document.querySelectorAll('[data-xen-quick-kind="material"]').length===n,i+1);
  }
  const text=await p.locator('[data-xen-quick-kind="material"]').allTextContents();
  for(const [i,key] of ['A','S','D','F','G','H','J','K','L'].entries())assert(text[i].includes('('+key+')'));
 });
 fs.mkdirSync(path.join(root,'results/n19'),{recursive:true});fs.writeFileSync(path.join(root,'results/n19/regressions.json'),JSON.stringify({file,results},null,2));assert(results.every(r=>r.pass),'regression failures');
})().catch(e=>{console.error(e);process.exitCode=1});
