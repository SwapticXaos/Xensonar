'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),m=require('../source-manifest.json');
const hook='window.__f444={surfaces:__XenNodalSurfaces,library:__XenNodalLibrary,starter:nodalOpenStarter,model:__XenNodalModel};';
const staged=path.join(root,'inspection/f444-browser.html');fs.mkdirSync(path.dirname(staged),{recursive:true});fs.writeFileSync(staged,fs.readFileSync(path.join(root,m.entry),'utf8').replace('</script>',hook+'</script>'));
const report={checks:[],errors:[],limitations:['Headless Chromium on this host, no external speaker or laptop/Opera audio-dropout claim.']};
const pass=s=>{report.checks.push(s);console.log('PASS',s);};
(async()=>{let b;try{
 b=await chromium.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const page=await b.newPage({viewport:{width:1366,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>{
  window.__f444audio={contexts:[],nodes:[],outputs:[]};
  const AC=window.AudioContext;window.AudioContext=class extends AC{constructor(...a){super(...a);__f444audio.contexts.push(this);}};
  const connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(to,...rest){if(to===this.context.destination){const a=this.context.createAnalyser();a.fftSize=2048;connect.call(this,a);__f444audio.outputs.push({analyser:a,peak:0});}return connect.call(this,to,...rest);};
  const W=AudioWorkletNode;window.AudioWorkletNode=class extends W{constructor(...a){super(...a);if(a[1]!=='xensonar-nodal-instrument-v1')return;const record={sent:[],received:[]};__f444audio.nodes.push(record);const post=this.port.postMessage.bind(this.port);this.port.postMessage=(data,...rest)=>{record.sent.push({type:data.type,options:data.options});return post(data,...rest);};this.port.addEventListener('message',e=>record.received.push(e.data));this.port.start();}};
  setInterval(()=>{for(const o of __f444audio.outputs){const a=new Float32Array(o.analyser.fftSize);o.analyser.getFloatTimeDomainData(a);for(const x of a)o.peak=Math.max(o.peak,Math.abs(x));}},20);
 });
 await page.goto(pathToFileURL(staged).href);await page.getByRole('button',{name:'III. NODAL INSTALLATION',exact:true}).click();
 await page.getByLabel('Instrument name',{exact:true}).fill('F444 Live Glass');await page.getByRole('button',{name:'Save Instrument',exact:true}).click();
 await page.getByRole('button',{name:'I. XENSONAR MAIN ROOM',exact:true}).click();
 const id=await page.evaluate(()=>{const e=__f444.library.list().find(e=>e.instrument.name==='F444 Live Glass');return 'nodal:'+e.id+'@'+e.revision;});
 const selects=page.locator('select').filter({has:page.locator('option[value="'+id+'"]')});
 const count=await selects.count();report.selects=count;assert(count>=2,'Both live source selectors must offer the saved instrument');
 for(let k=0;k<2;k++)await selects.nth(k).selectOption(id);
 const power=page.getByRole('button',{name:/^Power/}).first();await power.click();
 await page.waitForFunction(()=>__f444.surfaces.snapshot()?.readyPlans>0,{timeout:10000});
 await page.evaluate(async(id)=>{await __f444.surfaces.select('wave',id);await __f444.surfaces.select('particle',id);},id);
 assert.equal(await page.evaluate(()=>__f444audio.nodes.length),1);pass('visible Save Instrument and both live selectors prepare exactly one real AudioWorklet');
 const attack=await page.evaluate(id=>{
  const ctx=__f444audio.contexts.find(c=>c.state==='running');if(!ctx)throw Error('No running audio context');
  const before=__f444audio.nodes[0].sent.filter(e=>e.type==='note').length;let admitted=0;
  for(let k=0;k<100;k++)if(__f444.surfaces.note(k%2?'particle':'wave',id,{frequency:220+k*.123,gain:.3,durationSec:.08},ctx))admitted++;
  return {admitted,posted:__f444audio.nodes[0].sent.filter(e=>e.type==='note').length-before,snapshot:__f444.surfaces.snapshot()};
 },id);report.attack=attack;assert(attack.admitted>0);assert(attack.admitted<=4);assert.equal(attack.posted,attack.admitted);assert(attack.snapshot.activeCost<=8);pass('100 simultaneous API attacks through UI-selected sources stay bounded before Worklet submission');
 await page.waitForFunction(()=>__f444audio.nodes[0].received.some(m=>m.type==='started'));
 await page.waitForFunction(()=>__f444audio.outputs.some(o=>o.peak>.001));
 report.audio=await page.evaluate(()=>({rate:__f444audio.contexts.find(c=>c.state==='running')?.sampleRate,peaks:__f444audio.outputs.map(o=>o.peak),messages:__f444audio.nodes[0].received}));
 assert(!report.audio.messages.some(m=>m.type==='error'));pass('real Worklet acknowledges starts and reaches nonzero final audio output without processor errors');
 // A physical hotkey must dispatch through the actual main-room wave callback.
 await page.waitForTimeout(1800);await page.locator('body').click({position:{x:10,y:10}});
 const before=await page.evaluate(()=>__f444audio.nodes[0].sent.filter(m=>m.type==='note').length);
 await page.keyboard.press('y');await page.waitForTimeout(200);
 const after=await page.evaluate(()=>__f444audio.nodes[0].sent.filter(m=>m.type==='note').length);report.keyboard={before,after};assert(after>before);pass('Y wave-starter hotkey reaches the selected synthetic instrument through the real application callback');
 assert.deepEqual(report.errors,[]);pass('no uncaught application errors');
 }catch(e){report.failure=e.stack;console.error(e);process.exitCode=1;}finally{await b?.close();fs.writeFileSync(path.join(root,'results/f444-browser.json'),JSON.stringify(report,null,2)+'\n');}})();
