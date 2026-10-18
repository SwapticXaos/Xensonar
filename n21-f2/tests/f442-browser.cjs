'use strict';
// Requires Playwright + a locally installed Chromium. Run: npm run test:f442:browser.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),manifest=require('../source-manifest.json');
const html=fs.readFileSync(path.join(root,manifest.entry),'utf8'),report={checks:[],geometry:[],errors:[]};
const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(html)});
const pass=s=>{report.checks.push(s);console.log('PASS',s)};
(async()=>{let browser;await new Promise(r=>server.listen(0,'127.0.0.1',r));try{
 browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>report.errors.push(String(e)));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.getByRole('button',{name:'III. NODAL INSTALLATION',exact:true}).click();
 const draft=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('xensonar.nodal.sounddesigner.v1')));
 // Consecutive native clicks in one task avoid hiding the original 180-ms race.
 await page.evaluate(()=>{const buttons=[...document.querySelectorAll('button')];buttons.find(b=>b.textContent==='Saw').click();document.querySelector('.nd-modes button:nth-child(2)').click();});
 await page.getByRole('button',{name:'Sound Design',exact:true}).click();assert.equal((await draft()).instrument.material.wave,'saw');pass('immediate mode switch preserves wave material');
 await page.reload();await page.getByRole('button',{name:'III. NODAL INSTALLATION',exact:true}).click();assert.equal((await draft()).instrument.material.wave,'saw');
 const undo=page.getByRole('button',{name:'↶ Undo',exact:true});assert(await undo.isDisabled());
 const node=page.locator('[data-node-id]').nth(1);await node.click();assert(await undo.isDisabled());
 await node.click({button:'right'});const menu=page.getByRole('menu',{name:'Node actions',exact:true});assert(await menu.isVisible());assert(await undo.isDisabled());
 await page.keyboard.press('Escape');assert(await menu.count()===0);
 await node.click({button:'right'});await page.getByRole('menuitem',{name:'Remove node',exact:true}).click();assert.equal(await page.locator('[data-node-id]').count(),2);
 await undo.click();assert.equal(await page.locator('[data-node-id]').count(),3);await page.getByRole('button',{name:'↷ Redo',exact:true}).click();assert.equal(await page.locator('[data-node-id]').count(),2);pass('real context menu/remove/undo/redo and inert selection');
 await undo.click();await page.locator('.nd-stage svg[role=application]').focus();await page.keyboard.press('Shift+F10');assert(await menu.isVisible());await page.keyboard.press('Escape');
 for(const [width,height]of [[1366,768],[1490,1000],[1024,768],[760,900],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(100);
  const geometry=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};return{width:innerWidth,height:innerHeight,stage:rect('.nd-stage'),preview:rect('.nd-play'),send:rect('.nd-send'),overflow:document.documentElement.scrollWidth>innerWidth+2,nested:[...document.querySelectorAll('[data-nodal-designer] *')].filter(e=>['scroll','auto'].includes(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight+2).length}});
  report.geometry.push(geometry);assert(!geometry.overflow);assert.equal(geometry.nested,0);assert(Math.abs(geometry.stage.width-geometry.stage.height)<2);
  if(width>=1180){assert(geometry.stage.width>=340);assert(geometry.preview.bottom<=height);assert(geometry.send.bottom<=height);}
 }
 pass('responsive geometry and action reachability');assert.deepEqual(report.errors,[]);
 }catch(error){report.failure=String(error.stack);report.status=/Executable doesn't exist/.test(report.failure)?'blocked-no-chromium':'failed';console.error(error);process.exitCode=1}finally{await browser?.close();server.close();fs.writeFileSync(path.join(root,'results/f442-browser.json'),JSON.stringify(report,null,2)+'\n')}})();
