'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..')),name=process.argv[3]||'after',width=+(process.argv[4]||1360);
const evidence=path.resolve(process.env.XEN_BROWSER_EVIDENCE_DIR||'avalanche-browser-evidence');fs.mkdirSync(evidence,{recursive:true});
const html=fs.readFileSync(path.join(root,'dist/XenSonar_Standalone.html'));
(async()=>{const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader']});
 const p=await browser.newPage({viewport:{width,height:900}}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.addInitScript(()=>{
  const definition={a:Array.from({length:360},(_,i)=>.13*Math.sin(i/40)),b:Array.from({length:360},(_,i)=>-.17*Math.sin(i/25)),morph:.5,bands:12,mode:'raster',low:-36,high:12,enabled:true};
  localStorage.setItem('xensonar.quickrack.eq.v1',JSON.stringify({'bass:default':definition,__avalancheBindings:Object.fromEntries(['klaviatur','wellenstart'].map(n=>[n,{sourceKey:'bass:default',label:'Browser test EQ',definition}]))}));
  window.testTrace={eq:[],program:[],timbre:[],types:{},stats:[]};
  const ids=new WeakMap();let next=0;const original=MessagePort.prototype.postMessage;
  MessagePort.prototype.postMessage=function(m,...args){if(!ids.has(this)){ids.set(this,++next);this.addEventListener('message',e=>{if(e.data?.kind==='stats')window.testTrace.stats.push({port:ids.get(this),...e.data})});}
   if(m?.kind==='plan')window.testTrace.eq.push({port:ids.get(this),revision:m.revision,coefficients:Array.from(m.coefficients),gain:m.gain});
   if(m?.type){window.testTrace.types[m.type]=(window.testTrace.types[m.type]||0)+1;if(m.type==='HOLD_TIMBRE')window.testTrace.timbre.push({id:m.id,revision:m.revision});}
   return original.call(this,m,...args);
  };
  const workerPost=Worker.prototype.postMessage;Worker.prototype.postMessage=function(m,...args){if(m?.type==='hold-program')window.testTrace.program.push({at:performance.now()});return workerPost.call(this,m,...args)};
 });
 await p.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});
 await p.getByRole('button',{name:'Power',exact:true}).click();await p.getByText('[ OFFLINE - ENABLE FOR AUDIO & DRIFT ]',{exact:true}).waitFor({state:'hidden'});
 await p.locator('select').nth(1).selectOption({label:'Clean Pluck · Room I · Wave Starter'});await p.locator('select').nth(2).selectOption({label:'Clean Pluck · Room I · Wave Starter'});
 await p.locator('button').filter({hasText:/^Keyboard-Hold Pattern/}).click();await p.getByRole('button',{name:'All',exact:true}).click();
 const stage=p.locator('canvas[data-xen-play-area]');await stage.scrollIntoViewIfNeeded();const r=await stage.boundingBox();assert(r.width>200&&r.height>100);
 const x=r.x+r.width*.5,y=r.y+r.height*.5;await p.mouse.click(x,y);await p.waitForTimeout(500);await p.keyboard.down('1');await p.waitForTimeout(1300);await p.mouse.move(x,y);await p.mouse.down();await p.waitForTimeout(500);
 const trace=()=>p.evaluate(()=>({eq:testTrace.eq.length,program:testTrace.program.length,timbre:testTrace.timbre.length,types:testTrace.types}));
 const start=await trace();await p.mouse.move(x,y-r.height*.15,{steps:12});await p.waitForTimeout(800);const vertical=await trace();
 await p.screenshot({path:path.join(evidence,`${name}-${width}-vertical.png`)});
 const mark=p.locator('[data-avalanche-marker="klaviatur"]');if(name==='after')await mark.waitFor({state:'visible'});
 const markerY=await mark.count()?await mark.getAttribute('style'):null;
 await p.mouse.move(x+r.width*.15,y-r.height*.15,{steps:12});await p.waitForTimeout(1300);const horizontal=await trace();
 await p.screenshot({path:path.join(evidence,`${name}-${width}-horizontal.png`)});
 if(name==='after'){
  assert.equal(vertical.program,start.program,'Y-only must not render native timbre');assert(vertical.eq>start.eq,'Y must deliver actual EQ coefficients');
  assert(horizontal.program>vertical.program,'X must render original native timbre');assert(horizontal.timbre>vertical.timbre,'X must deliver prepared native variant');assert.equal(horizontal.eq,vertical.eq,'X-only must not send EQ plans');
  assert.equal(await mark.count(),1);assert.notEqual(await mark.getAttribute('style'),markerY,'marker moves along horizontal gradient');
 }
 await p.mouse.move(x+r.width*.05,y-r.height*.05,{steps:8});await p.mouse.up();await p.keyboard.up('1');await p.waitForTimeout(250);if(name==='after')assert.equal(await mark.count(),0,'key-up removes held marker');
 // Same gesture on the independently assigned Enter lane.
 await p.keyboard.down('Enter');await p.waitForTimeout(800);await p.mouse.move(x,y);await p.mouse.down();const enterStart=await trace();await p.mouse.move(x,y-r.height*.1,{steps:8});await p.waitForTimeout(500);const enterY=await trace();if(name==='after'){assert(enterY.eq>enterStart.eq);assert.equal(enterY.program,enterStart.program);}
 await p.mouse.up();await p.keyboard.up('Enter');assert.deepEqual(errors,[]);assert((await p.locator('body').innerText()).length>1000);
 const report={name,width,stage:r,start,vertical,horizontal,enterStart,enterY,errors,stats:await p.evaluate(()=>testTrace.stats.slice(-12))};fs.writeFileSync(path.join(evidence,`${name}-${width}-browser.json`),JSON.stringify(report,null,2));console.log(JSON.stringify({name,width,start,vertical,horizontal,enterStart,enterY,errors}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
