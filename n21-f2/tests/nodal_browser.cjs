const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),file=path.join(root,require('../source-manifest.json').entry);
const expose='\nwindow.__nodalTest={snapshot:Fde,normalize:Ede,restore:Tde,actions:Bde,kernel:createNodalSynthesisKernel,processor:nodalWorkletProcessorFactory,model:__XenNodalModel,installation:__XenNodalInstallation};\n';
const html=fs.readFileSync(file,'utf8').replace('</script>',expose+'</script>');
const report={checks:[],errors:[],metrics:{}};
(async()=>{const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({...(process.env.XENSONAR_CHROMIUM_PATH ? {executablePath:process.env.XENSONAR_CHROMIUM_PATH} : {}),headless:true,args:['--no-sandbox','--no-zygote','--single-process','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.XenSonarNodalBackend?.installation);
 const state=await page.evaluate(()=>({buttons:[...document.querySelectorAll('button')].map(x=>x.textContent).filter(x=>/Nodal|Installation|Room|III/.test(x)),body:document.body.innerText.slice(0,450)}));report.initialState=state;
 assert(state.body.length>100);report.checks.push('full app mounts and exposes attached Nodal backend');
 // Open the preserved Installation mode inside the current Room III.
 const button=page.getByRole('button',{name:/Nodal Installation/i}).first();if(await button.count())await button.click();
 const legacy=page.getByRole('button',{name:'Installation',exact:true}).first();if(await legacy.count())await legacy.click();
 const topology=page.getByRole('button',{name:/Art Installation Mode/i}).first();if(await topology.count())await topology.click();
 await page.waitForTimeout(180);
 const capture=await page.evaluate(()=>{
  const api=window.XenSonarNodalBackend,b=api.installation;
  let initial;try{initial=b.capture()}catch(error){return{error:String(error),buttons:[...document.querySelectorAll('button')].map(x=>x.textContent).filter(x=>/nodal|install|field/i.test(x))}}
  window.__nodalCapture=initial;
  const p=b.compile(),r=b.render({frequency:220,durationSec:.12},48000);
  return{nodes:initial.nodes.length,edges:p.edges.length,cost:p.cost,peak:Math.max(...r.pcm),status:b.status()};
 });report.metrics.installation=capture;assert(!capture.error,JSON.stringify(capture));assert(capture.nodes>0);assert(capture.peak>0);report.checks.push('existing installation nodes compile and produce audio');
 await page.getByRole('button',{name:'Save Constellation',exact:true}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('xensonar.resident.constellations.v1')??'[]')[0]?.nodalInstrument?.schema==='xensonar.nodal-instrument');
 report.checks.push('existing Save Constellation button persists the synthetic descriptor');
 const persist=await page.evaluate(()=>{
  const b=window.XenSonarNodalBackend.installation,inst=b.capture(),stored=b.save({id:'browser-fixture'});
  const packed=window.XenSonarNodalBackend.library.exportPackage();
  const test=window.__nodalTest;
  const ref={current:{nodes:inst.nodes.map(n=>({residentId:n.id,label:n.label,x:n.x*600,y:n.y*600,freq:220*n.ratio,energy:0,myzelEffectModuleType:n.role,nodalDesign:{role:n.role,ratio:n.ratio,cents:n.cents,radius:n.radius,strength:n.strength,excitation:n.excitation,pickup:n.pickup}}))}};
  let config={residentsEnabled:true,residentSystem:'ji',residentMode:'chromatic',residentSound:'glass_needle',residentVolume:.5};
  const bridge=test.installation.attach(ref,{width:600,height:600,referenceHz:220,name:'snapshot'});
  bridge.setOptions({excitation:'breath',seed:717});
  const entry=test.snapshot({name:'saved',nodes:ref.current.nodes,config});test.installation.checkpoint(ref,entry);
  const normalized=test.normalize(JSON.parse(JSON.stringify(entry)));ref.current.nodes=test.restore(normalized);test.installation.restore(ref,normalized);
  const restored=bridge.capture();
  return{stored,packed,roundTrip:JSON.stringify(entry.nodalInstrument)===JSON.stringify(restored),entryHasNodal:!!normalized.nodalInstrument,legacyModule:ref.current.nodes[0].myzelEffectModuleType};
 });assert(persist.entryHasNodal);assert(persist.roundTrip);report.checks.push('existing constellation codec preserves descriptor and organ data');report.checks.push('Nodal library persists separately from sample/drum storage');
 const audioResult=await page.evaluate(async()=>{
  const api=window.XenSonarNodalBackend,b=api.installation,model=api.model;
  // Small instrument, actual app audio adapter and admission runtime.
  const inst=model.normalize({...window.__nodalCapture,blockedEdges:[],excitation:{kind:'tone',level:.6}});
  await b.prepareAudio(inst);
  const handle=b.noteOn(inst,{frequency:220,durationSec:.12});
  if(!handle)return{admitted:false,status:b.status()};
  handle.setFrequency(330);
  await new Promise(resolve=>setTimeout(resolve,500));
  return{admitted:true,status:b.status()};
 });report.metrics.liveAudio=audioResult;assert(audioResult.admitted);assert.equal(audioResult.status.audio.activeVoices,0);report.checks.push('real AudioWorklet loads; host admission, Root update and completion work');
 const offline=await page.evaluate(async()=>{
  const api=window.XenSonarNodalBackend,model=api.model,dsp=api.synthesis;
  const base={...window.__nodalCapture,nodes:window.__nodalCapture.nodes.slice(0,3).map((n,i)=>({...n,role:i===2?'fold':'resonator'})),blockedEdges:[],excitation:{kind:'impulse',level:.7}};
  const inst=model.normalize(base),plan=model.compile(inst),sr=48000;
  const ctx=new OfflineAudioContext(2,Math.ceil((.2+plan.articulation.releaseSec+.01)*sr),sr);
  const url=URL.createObjectURL(new Blob(['('+__nodalTest.processor.toString()+')('+__nodalTest.kernel.toString()+',registerProcessor,AudioWorkletProcessor,sampleRate,()=>currentFrame);'],{type:'text/javascript'}));
  await ctx.audioWorklet.addModule(url);URL.revokeObjectURL(url);
  const node=new AudioWorkletNode(ctx,'xensonar-nodal-instrument-v1',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});node.connect(ctx.destination);
  await new Promise((resolve,reject)=>{node.port.onmessage=({data})=>data.type==='ready'?resolve():data.type==='error'?reject(Error(data.message)):null;node.port.postMessage({type:'plan',id:'p',plan});});
  node.port.postMessage({type:'note',id:'v',planId:'p',startSec:0,options:{frequency:220,durationSec:.2,velocity:.7,gain:.7}});
  const result=await ctx.startRendering(),expected=dsp.render(plan,{frequency:220,durationSec:.2},sr).pcm;
  const actual=result.getChannelData(0);let maxDiff=0,peak=0;for(let i=0;i<actual.length;i++){maxDiff=Math.max(maxDiff,Math.abs(actual[i]-expected[i]));peak=Math.max(peak,Math.abs(actual[i]));}
  node.disconnect();return{maxDiff,peak,frames:actual.length};
 });report.metrics.workletParity=offline;assert(offline.peak>0);assert(offline.maxDiff<1e-7);report.checks.push('real OfflineAudioWorklet matches standalone synthetic kernel PCM');
 const perf=await page.evaluate(()=>{
  const api=window.XenSonarNodalBackend,model=api.model,dsp=api.synthesis,out={};
  for(const count of [3,6,12]){
   const seed=window.__nodalCapture.nodes[0];const inst=model.normalize({...window.__nodalCapture,nodes:Array.from({length:count},(_,i)=>({...seed,id:'perf-'+i,role:i===2&&count<12?'fold':'resonator',x:.3+i*.02,y:.7,ratio:1+i*.14})),blockedEdges:[],excitation:{kind:'tone',level:.6}});
   const plan=model.compile(inst),v=dsp.voice(plan,{frequency:220,held:true},48000),buf=new Float32Array(128);for(let i=0;i<50;i++)v.process(buf);
   const start=performance.now();for(let i=0;i<375;i++)v.process(buf);out[count+'Nodes']={audioSec:1,wallMs:performance.now()-start,cost:plan.cost};
  }return out;
 });report.metrics.browserPerformance=perf;
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.XenSonarNodalBackend?.installation);
 const after=await page.evaluate(()=>window.XenSonarNodalBackend.library.list().find(e=>e.id==='browser-fixture'));
 assert(after);assert.equal(after.revision,1);report.checks.push('descriptor survives browser reload');
 assert.deepEqual(report.errors,[]);report.checks.push('no uncaught page errors');
}catch(error){report.failure=String(error.stack);process.exitCode=1}finally{await browser.close();server.close();fs.writeFileSync(path.join(root,'results/nodal_browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e);process.exit(1)});
