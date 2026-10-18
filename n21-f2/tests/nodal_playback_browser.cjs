// Regression for the user's two actual actions. No playback function is called
// by the harness; instrumentation only observes contexts, messages and output.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{chromium,firefox}=require('playwright');
const root=path.resolve(__dirname,'..'),manifest=require('../source-manifest.json'),target=path.resolve(process.argv[2]||path.join(root,manifest.entry));
const expose=`window.__playbackRead={phase:()=>__mlPhase,session:()=>EQ(),transport:()=>iv,rect:()=>{const c=EQ().loopComposer,n=c.notes.find(n=>n.id===c.selectedNoteId),canvas=document.querySelector('[data-xensonar-melodic-loop-workspace-canvas]'),g=mD(canvas,c),r=og(c,n,g.lineLayout,{gutterW:g.gutterW,cellW:g.cellW,scrollStart:g.scrollStart,visibleSteps:g.visibleSteps}),b=canvas.getBoundingClientRect();return{x:b.x+(r.x+Math.min(r.w*.5,24))*b.width/canvas.width,y:b.y+(r.y+r.noteH*.5)*b.height/canvas.height}}};`;
const html=fs.readFileSync(target,'utf8').replace('</script>',expose+'</script>');
const staged=path.join(root,'inspection/playback-regression.html');fs.mkdirSync(path.dirname(staged),{recursive:true});fs.writeFileSync(staged,html);
const report={target:path.basename(target),checks:[],metrics:[],errors:[]};
const pass=name=>{report.checks.push(name);console.log('PASS',name)};
async function observe(page){await page.addInitScript(()=>{
 window.__signal={contexts:[],outputs:[],nodal:[]};const C=AudioContext;window.AudioContext=class extends C{constructor(...a){super(...a);__signal.contexts.push(this)}};
 const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(to,...a){if(to===this.context.destination&&this.context instanceof AudioContext){const analyser=this.context.createAnalyser();analyser.fftSize=2048;connect.call(this,analyser);__signal.outputs.push({analyser,peak:0})}return connect.call(this,to,...a)};
 const addModule=AudioWorklet.prototype.addModule;AudioWorklet.prototype.addModule=async function(url,...args){if(window.__rejectNodal){const source=await (await fetch(url)).text();if(source.includes('xensonar-nodal-instrument-v1'))throw new DOMException('Regression: Nodal module unavailable','AbortError')}return addModule.call(this,url,...args)};
 const W=AudioWorkletNode;window.AudioWorkletNode=class extends W{constructor(...a){super(...a);if(a[1]!=='xensonar-nodal-instrument-v1')return;const r={sent:[],received:[]};__signal.nodal.push(r);const send=this.port.postMessage.bind(this.port);this.port.postMessage=(m,...rest)=>{r.sent.push(m);return send(m,...rest)};this.port.addEventListener('message',e=>r.received.push(e.data));this.port.start()}};
 setInterval(()=>{for(const o of __signal.outputs){const data=new Float32Array(o.analyser.fftSize);o.analyser.getFloatTimeDomainData(data);for(const x of data)o.peak=Math.max(o.peak,Math.abs(x))}},20);
});}
async function read(page){return page.evaluate(()=>({phase:__playbackRead.phase(),states:__signal.contexts.map(c=>c.state),peaks:__signal.outputs.map(o=>o.peak),nodal:__signal.nodal.map(w=>({notes:w.sent.filter(m=>m.type==='note').length,started:w.received.filter(m=>m.type==='started').length,rejected:w.received.filter(m=>['rejected','error'].includes(m.type))})),transport:!!__playbackRead.transport()}));}
async function reset(page){await page.evaluate(()=>__signal.outputs.forEach(o=>o.peak=0));}
(async()=>{const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const engine=process.env.XENSONAR_BROWSER==='firefox'?firefox:chromium;
 const launch=()=>engine.launch({headless:true,...(engine===chromium?{args:['--no-sandbox','--single-process','--no-zygote']}:{})});
 let browser=null;
 try{for(const protocol of ['file','http'])for(const action of ['note','loop']){
 if(action==='failure'&&protocol!=='file')continue;
 if(process.env.XENSONAR_CASE && process.env.XENSONAR_CASE!==protocol+'-'+action)continue;
 browser=await launch();
 const context=await browser.newContext({viewport:{width:1490,height:1000}}),page=await context.newPage();let pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));await observe(page);
 try{await page.goto(protocol==='file'?pathToFileURL(staged).href:'http://127.0.0.1:'+server.address().port);await page.getByRole('button',{name:'III. NODAL INSTALLATION',exact:true}).click();await page.getByRole('button',{name:'Glass',exact:true}).click();await page.getByRole('button',{name:'Send to Melodic Loop',exact:true}).click();await page.getByRole('button',{name:'Open Loop ↗',exact:true}).click();
 // Solo the newly imported Nodal track, so a legacy stem cannot mask silence.
 const card=page.getByRole('button',{name:/Glass Cluster.*SELECTED/}).locator('..');await card.getByRole('button',{name:'Only You',exact:true}).click();
 if(action==='failure'){
 await page.evaluate(()=>window.__rejectNodal=true);
 await page.getByRole('button',{name:'Aktive Instrumente als Loop abspielen',exact:true}).click();
 await page.getByRole('button',{name:'Aktive Instrumente als Loop abspielen',exact:true}).waitFor();
 assert(!(await read(page)).transport);pass('file rejected module: button returns to Play');
 await page.evaluate(()=>window.__rejectNodal=false);
 }
 if(action!=='note')await page.getByRole('button',{name:'Aktive Instrumente als Loop abspielen',exact:true}).click();else{await page.locator('[data-xensonar-melodic-loop-workspace-canvas]').scrollIntoViewIfNeeded();await page.waitForTimeout(100);const p=await page.evaluate(()=>__playbackRead.rect());await page.mouse.click(p.x,p.y)}
 await page.waitForTimeout(1400);const result=await read(page);report.metrics.push({protocol,action,...result});
 if(action==='note')assert(result.nodal.some(w=>w.notes>0&&w.started>0),protocol+' '+action+': real click must reach and start Nodal DSP');else assert(await page.evaluate(()=>!__playbackRead.transport().nodalTransport&&__playbackRead.transport().stemBuffers.size>0),'complete composition uses all synchronized stems');
 assert(result.nodal.every(w=>!w.rejected.length));assert(result.peaks[0]>.005,protocol+' '+action+': final master output must contain the solo Nodal signal');
 assert.deepEqual(pageErrors,[]);pass(protocol+' cold '+action+': actual UI click, solo Nodal, final output nonzero');
 if(action==='loop'){
 await page.getByRole('button',{name:'Loop stoppen',exact:true}).click();await page.waitForTimeout(600);await reset(page);await page.waitForTimeout(300);const stopped=await read(page);assert(!stopped.transport);assert(stopped.peaks[0]<.0001);pass(protocol+' stop: transport gone and final output quiet');
 // The same saved session must work after a real page reload, without preview warmup.
 await page.reload();await page.getByRole('button',{name:'II. MATERIAL FORGE',exact:true}).click();
 const melodic=page.getByRole('button',{name:'Melodic Loop',exact:true});if(await melodic.isVisible())await melodic.click();else{await page.getByRole('button',{name:/SyntheticForgeDrum Machine/}).click();await melodic.click()}
 await page.getByRole('button',{name:'Aktive Instrumente als Loop abspielen',exact:true}).click();await page.waitForTimeout(1400);const restored=await read(page);assert(restored.transport);assert(restored.peaks[0]>.005);pass(protocol+' persisted session: visible Play after reload is audible');
 }
 }finally{report.errors.push(...pageErrors);await context.close();await browser.close();browser=null}
 }
 }catch(e){report.failure=e.stack;process.exitCode=1;console.error(e.message)}finally{await browser?.close();server.close();const out=path.join(root,'results/'+(process.env.XENSONAR_REPORT||('nodal_playback_browser_'+(process.env.XENSONAR_BROWSER||'chromium')+'.json')));fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2))}
})().catch(e=>{console.error(e.message);process.exitCode=1});
