'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),m=require('../source-manifest.json');
const hook='window.__f446={surfaces:__XenNodalSurfaces,library:__XenNodalLibrary,starter:nodalOpenStarter,model:__XenNodalModel,forge:__F352Runtime};';
const staged=path.join(root,'inspection/f446-browser.html');fs.mkdirSync(path.dirname(staged),{recursive:true});fs.writeFileSync(staged,fs.readFileSync(path.join(root,m.entry),'utf8').replace('const Qg=Qwe(','window.__f446fieldRefs={state:xn,params:Tt};const Qg=Qwe(').replace('function note(lane,id,options={},context){','function note(lane,id,options={},context){(window.__f446field??=[]).push({lane,frequency:options.frequency,time:context?.currentTime,hasOutput:!!options.output,auxCount:options.auxTargets?.length??0});').replace('</script>',hook+'</script>'));
const report={checks:[],errors:[],limitations:['Headless Chromium on this host, no external speaker or laptop/Opera audio-dropout claim.']};
const pass=s=>{report.checks.push(s);console.log('PASS',s);};
(async()=>{let b;try{
 b=await chromium.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const page=await b.newPage({viewport:{width:1366,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>{
  window.__f446audio={contexts:[],nodes:[],outputs:[]};
  const AC=window.AudioContext;window.AudioContext=class extends AC{constructor(...a){super(...a);__f446audio.contexts.push(this);}};
  const connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(to,...rest){if(to===this.context.destination){const a=this.context.createAnalyser();a.fftSize=2048;connect.call(this,a);__f446audio.outputs.push({analyser:a,peak:0});}return connect.call(this,to,...rest);};
  const W=AudioWorkletNode;window.AudioWorkletNode=class extends W{constructor(...a){super(...a);if(a[1]!=='xensonar-nodal-instrument-v1')return;const record={sent:[],received:[]};__f446audio.nodes.push(record);const post=this.port.postMessage.bind(this.port);this.port.postMessage=(data,...rest)=>{record.sent.push({type:data.type,options:data.options,frequencies:data.frequencies??data.prepared?.pitches.map(p=>p.hz)});return post(data,...rest);};this.port.addEventListener('message',e=>record.received.push(e.data));this.port.start();}};
  setInterval(()=>{for(const o of __f446audio.outputs){const a=new Float32Array(o.analyser.fftSize);o.analyser.getFloatTimeDomainData(a);for(const x of a)o.peak=Math.max(o.peak,Math.abs(x));}},20);
 });
 await page.goto(pathToFileURL(staged).href);await page.getByRole('button',{name:'III. NODAL INSTALLATION',exact:true}).click();
 await page.getByLabel('Instrument name',{exact:true}).fill('F446 Live Glass');await page.getByRole('button',{name:'Save Instrument',exact:true}).click();
 await page.getByRole('button',{name:'I. XENSONAR MAIN ROOM',exact:true}).click();
 const id=await page.evaluate(()=>{const e=__f446.library.list().find(e=>e.instrument.name==='F446 Live Glass');return 'nodal:'+e.id+'@'+e.revision;});
 const selects=page.locator('select').filter({has:page.locator('option[value="'+id+'"]')});
 const count=await selects.count();report.selects=count;assert(count>=2,'Both live source selectors must offer the saved instrument');
 for(let k=0;k<2;k++)await selects.nth(k).selectOption(id);
 const power=page.getByRole('button',{name:/^Power/}).first();await power.click();
 await page.waitForFunction(()=>__f446.surfaces.snapshot()?.readyPlans>0,{timeout:10000});
 await page.evaluate(async(id)=>{await __f446.surfaces.select('wave',id);await __f446.surfaces.select('particle',id);},id);
 const policy=await page.evaluate(()=>__f446.surfaces.snapshot());assert(policy.controlPrepared&&policy.separateLanes);report.rendererPolicy=policy;
 assert.equal(await page.evaluate(()=>__f446audio.nodes.length),1);pass('visible Save Instrument and both live selectors prepare exactly one real AudioWorklet');
 const attack=await page.evaluate(id=>{
  const ctx=__f446audio.contexts.find(c=>c.state==='running');if(!ctx)throw Error('No running audio context');
  const before=__f446audio.nodes[0].sent.filter(e=>e.type==='note').length;let admitted=0;
  for(let k=0;k<100;k++)if(__f446.surfaces.note(k%2?'particle':'wave',id,{frequency:220+k*.123,gain:.3,durationSec:.08},ctx))admitted++;
  return {admitted,posted:__f446audio.nodes[0].sent.filter(e=>e.type==='note').length-before,snapshot:__f446.surfaces.snapshot()};
 },id);report.attack=attack;assert(attack.admitted>4,'Production admission must restore more than four voices');assert(attack.admitted<=16);assert.equal(attack.posted,attack.admitted);assert(attack.snapshot.activeCost<=16);pass('100 simultaneous API attacks through UI-selected sources stay bounded before Worklet submission');
 await page.waitForFunction(()=>__f446audio.nodes[0].received.some(m=>m.type==='started'));
 await page.waitForFunction(()=>__f446audio.outputs.some(o=>o.peak>.001));
 report.audio=await page.evaluate(()=>({rate:__f446audio.contexts.find(c=>c.state==='running')?.sampleRate,peaks:__f446audio.outputs.map(o=>o.peak),messages:__f446audio.nodes[0].received}));
 assert(!report.audio.messages.some(m=>m.type==='error'));pass('real Worklet acknowledges starts and reaches nonzero final audio output without processor errors');
 // A physical hotkey must dispatch through the actual main-room wave callback.
 await page.waitForTimeout(1800);await page.locator('body').click({position:{x:10,y:10}});
 report.fieldFixture=await page.evaluate(()=>{
  const {state,params}=window.__f446fieldRefs,n=state.current,p=params.current;
  p.quantizeOn=false;p.particleMute=false;
  const directions=[[1,0],[0,1],[-1,0],[0,-1]];
  n.agents.slice(0,4).forEach((agent,k)=>{agent.x=n.cursorX+directions[k][0]*40;agent.y=n.cursorY+directions[k][1]*40;agent.vx=agent.vy=0;agent.lastHit=-10000;p.agentEnabled[k]=true;});
  return {agents:Math.min(4,n.agents.length),distance:40,quantized:false};
 });
 report.wavePreparedBeforeLaunch=await page.evaluate(()=>{
  const ctx=__f446audio.contexts.find(c=>c.state==='running');__f446.surfaces.warmWaveField(ctx);
  return __f446audio.nodes[0].sent.filter(m=>m.type==='pitches').flatMap(m=>m.frequencies);
 });
 const fieldBefore=await page.evaluate(()=>window.__f446field?.length??0);
 const before=await page.evaluate(()=>__f446audio.nodes[0].sent.filter(m=>m.type==='note').length);
 await page.keyboard.press('y');await page.waitForTimeout(200);
 const after=await page.evaluate(()=>__f446audio.nodes[0].sent.filter(m=>m.type==='note').length);report.keyboard={before,after};assert(after>before);pass('Y wave-starter hotkey reaches the selected synthetic instrument through the real application callback');
 await page.waitForTimeout(3200);
 report.realField=await page.evaluate(before=>({events:(window.__f446field??[]).slice(before),notes:__f446audio.nodes[0].sent.filter(m=>m.type==='note').map(m=>m.options.frequency),families:__f446audio.nodes[0].sent.filter(m=>m.type==='pitches').map(m=>m.frequencies)}),fieldBefore);
 assert(report.realField.events.some(e=>e.lane==='particle'),'Physical wave must reach an actual particle callback');
 assert(report.realField.events.some(e=>e.lane==='particle'&&report.realField.families.some(h=>h.includes(e.frequency))&&report.realField.notes.includes(e.frequency)),'A prepared pitch must reach the real particle audio route');
 const wave=report.realField.events.find(e=>e.lane==='wave');assert(report.realField.events.every(e=>e.hasOutput),'Every actual Nodal event supplies its existing lane output');assert(wave&&report.wavePreparedBeforeLaunch.includes(wave.frequency),'The physical wave launch pitch must be prepared before keypress');
 pass('wave launch pitch is prepared before keypress; physical impacts reach particles and the Worklet with a prepared exact pitch');
 const hints=await page.evaluate(()=>__f446audio.nodes[0].sent.filter(m=>m.type==='pitches').length);report.pitchHints=hints;assert(hints>0);pass('flying waves prepare the actual root-derived particle pitch family before impacts');
 const lifecycle=await page.evaluate(()=>{const before=__f446.forge.diagnostics();__f446.forge.attach();return {before,after:__f446.forge.diagnostics()};});assert(lifecycle.after.attached);assert.equal(lifecycle.before.listeners,lifecycle.after.listeners);report.forgeLifecycle=lifecycle;pass('the real Forge bootstrap attaches once; repeated attach retains one owner');
 assert.deepEqual(report.errors,[]);pass('no uncaught application errors');
 }catch(e){report.failure=e.stack;console.error(e);process.exitCode=1;}finally{await b?.close();fs.writeFileSync(path.join(root,'results/f446-browser.json'),JSON.stringify(report,null,2)+'\n');}})();
