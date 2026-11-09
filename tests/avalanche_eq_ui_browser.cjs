'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..')),parent=process.argv[3]&&path.resolve(process.argv[3]);
const out=path.resolve(process.env.XEN_BROWSER_EVIDENCE_DIR||'avalanche-browser-evidence');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const files={after:fs.readFileSync(path.join(root,'dist/XenSonar_Standalone.html'))};if(parent)files.before=fs.readFileSync(path.join(parent,'dist/XenSonar_Standalone.html'));
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(files[q.url.slice(1)]||files.after)});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader']});
  for(const version of Object.keys(files))for(const width of [1360,700]){
   const p=await browser.newPage({viewport:{width,height:900}}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
   await p.goto('http://127.0.0.1:'+server.address().port+'/'+version,{waitUntil:'load'});await p.getByRole('button',{name:'Power',exact:true}).click();await p.getByText('[ OFFLINE - ENABLE FOR AUDIO & DRIFT ]',{exact:true}).waitFor({state:'hidden'});
   await p.locator('#xen-lane-tab-bass').click();await p.getByRole('button',{name:'RhythmForge · Fractured EQ',exact:true}).click();
   const panel=p.locator('.xen-eq-panel');await panel.waitFor({state:'visible'});const key=await panel.getAttribute('data-eq-source');
   const source=()=>p.evaluate(k=>JSON.stringify(JSON.parse(localStorage.getItem('xensonar.quickrack.eq.v1')||'{}')[k]),key);const original=await source();
   const keyboard=p.getByRole('button',{name:'Add to Keyboard Hold',exact:true});const title=await keyboard.getAttribute('title');
   if(version==='after'){assert(title.includes('left/right'));assert(title.includes('up/down'));}
   await p.locator('canvas[data-xen-play-area]').evaluate((el,top)=>window.scrollTo(0,window.scrollY+el.getBoundingClientRect().top-top),width===700?300:160);await p.waitForTimeout(400);await keyboard.hover();await p.waitForTimeout(200);await p.screenshot({path:path.join(out,`${version}-${width}-eq-panel.png`)});
   await keyboard.click();const removeKeyboard=p.getByRole('button',{name:'Remove from Keyboard Hold',exact:true});await removeKeyboard.waitFor();assert.equal(await removeKeyboard.getAttribute('aria-pressed'),'true');
   await p.getByRole('button',{name:'Add to Enter Hold',exact:true}).click();await p.waitForTimeout(400);
   assert.equal(await source(),original,'assigning Hold EQ does not write the source EQ');
   const bindings=await p.evaluate(()=>JSON.parse(localStorage.getItem('xensonar.quickrack.eq.v1')).__avalancheBindings);assert.equal(bindings.klaviatur.sourceKey,key);assert.equal(bindings.wellenstart.sourceKey,key);
   await removeKeyboard.click();await p.getByRole('button',{name:'Remove from Enter Hold',exact:true}).click();
   await p.getByRole('button',{name:'Add to Keyboard Hold',exact:true}).focus();await p.keyboard.press('Escape');await panel.waitFor({state:'hidden'});assert.deepEqual(errors,[]);
   console.log(JSON.stringify({version,width,title,sourceUnchanged:true,assignmentToggles:true,keyboardClose:true,pageErrors:0}));await p.close();
  }
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
