'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const manifest=require('../source-manifest.json'),marker='const kEe=CEe("root");';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1490,height:960}}),errors=[],samples=[];page.on('pageerror',error=>errors.push(error.message));
  const original=fs.readFileSync(manifest.entry,'utf8');assert.equal(original.split(marker).length,2);
  const html=original.replace(marker,'window.__layoutReview={meta:__XenMetaSessions,quick:__XenQuick};'+marker);
  await page.route('https://layout.xensonar.test/**',route=>route.fulfill({contentType:'text/html',body:html}));
  await page.addInitScript(()=>{window.__dockFrames=[];let count=0;const inspect=()=>{const dock=document.querySelector('.xen-quick-dock'),panel=document.querySelector('.xen-performance');if(dock&&getComputedStyle(dock).visibility==='visible'){const d=dock.getBoundingClientRect(),p=panel?.getBoundingClientRect();window.__dockFrames.push({top:d.top,bottom:d.bottom,panelBottom:p?.bottom??null,width:innerWidth,height:innerHeight});}if(++count<300)requestAnimationFrame(inspect)};requestAnimationFrame(inspect)});
  await page.goto('https://layout.xensonar.test/native');await page.waitForFunction(()=>window.__layoutReview&&document.querySelector('.xen-quick-dock')&&getComputedStyle(document.querySelector('.xen-quick-dock')).visibility==='visible');
  const dock=async label=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const geometry=await page.evaluate(()=>{const d=document.querySelector('.xen-quick-dock')?.getBoundingClientRect(),p=document.querySelector('.xen-performance')?.getBoundingClientRect();return{top:d?.top,bottom:d?.bottom,panelBottom:p?.bottom,width:innerWidth,height:innerHeight}});assert(geometry.top>=geometry.panelBottom+7,label+' dock overlaps performance controls');assert(geometry.top<geometry.height,label+' dock begins outside viewport');samples.push({label,...geometry});};
  await dock('initial1490');
  await page.evaluate(()=>{__layoutReview.meta.newSession();__layoutReview.meta.addItem({kind:'grid',id:'19edo',name:'19 EDO layout'});});
  const rect=async locator=>{const b=await locator.boundingBox();assert(b,'visible native control');return b};
  for(const width of [1490,720]){
   await page.setViewportSize({width,height:960});await dock('resize'+width);
   await page.getByRole('button',{name:'Meta-Menu',exact:true}).click();
   const editor=page.getByRole('dialog',{name:'Meta-Menu Session Editor'}),editorRect=await rect(editor);assert(editorRect.x>=-1&&editorRect.x+editorRect.width<=width+1,'Meta editor stays in viewport');
   await page.locator('[data-xen-meta-item]').first().click();
   const controls=page.locator('.xen-grid-profile-controls');await controls.waitFor();
   const group=await page.locator('.xen-grid-bass-actions').evaluate(node=>{const a=node.children[0].getBoundingClientRect(),b=node.children[1].getBoundingClientRect();return{gap:b.left-a.right,sameLine:Math.abs(a.top-b.top)<12}});assert(group.gap>=0&&group.gap<=20&&group.sameLine,'native Add/Edit Bass Grid controls grouped');
   await page.getByRole('button',{name:'Edit Bass Grid for 19 EDO layout',exact:true}).click();
   const bass=page.getByRole('dialog',{name:'Edit Session Bass Grid'}),bassRect=await rect(bass);assert(bassRect.x>=0&&bassRect.x+bassRect.width<=width+1,'Bass dialog viewport');await bass.getByRole('button',{name:'Close Bass Grid editor'}).click();
   await page.getByRole('button',{name:'Edit Tuning · Period Workbench',exact:true}).click();
   const period=page.getByRole('dialog',{name:'Session Period Workbench'}),periodRect=await rect(period);assert(periodRect.x>=0&&periodRect.x+periodRect.width<=width+1,'Period Workbench viewport');
   const markers=period.locator('button[aria-label^="Tune marker "]');assert.equal(await markers.count(),19);
   const markerStyle=await markers.nth(1).locator('[aria-hidden="true"]').evaluate(node=>{const c=getComputedStyle(node);return{left:c.borderLeftWidth,right:c.borderRightWidth}});assert.equal(markerStyle.left,'0px');assert.equal(markerStyle.right,'10px');
   fs.mkdirSync('results/sessions-reviewed/source-review',{recursive:true});await page.screenshot({path:'results/sessions-reviewed/source-review/native-period-'+width+'.png'});
   await period.getByRole('button',{name:'Close tuning editor'}).click();await editor.locator('.xen-meta-titlebar button').click();samples.push({label:'nativeDialogs'+width,editor:editorRect,bass:bassRect,period:periodRect,bassGrouping:group,markerStyle});
  }
  await page.setViewportSize({width:1490,height:960});
  await page.getByRole('button',{name:'II. MATERIAL FORGE',exact:true}).click();await page.getByRole('button',{name:'I. XENSONAR MAIN ROOM',exact:true}).click();await dock('roomRoundTrip');
  await page.getByRole('button',{name:'Fullscreen',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);await dock('fullscreenEnter');await page.getByRole('button',{name:'Exit fullscreen',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);await dock('fullscreenExit');
  const firstFrames=await page.evaluate(()=>window.__dockFrames.slice(0,5));assert(firstFrames.length>0);for(const frame of firstFrames)assert(frame.panelBottom!==null&&frame.top>=frame.panelBottom+7,'first visible dock frames use settled performance geometry');assert.deepEqual(errors,[]);
  fs.writeFileSync('results/sessions-reviewed/source-review/native-layout.json',JSON.stringify({entry:manifest.entry,scope:'Native Chromium 1490/720 dialog geometry, first visible dock samples, resize, room and fullscreen transitions. No user-browser or intermittent fullscreen-crash claim.',samples,firstFrames,errors},null,2)+'\n');
  console.log('PASS native 1490/720 shared Period/Bass dialogs and markers; first visible dock, resize, room and fullscreen transitions');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
