'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),manifest=require('../source-manifest.json');
const hook='window.__forgeTest={store:pe,engine:xt,native:xt.playBufferInternal,mode:__ForgeListeningMode,play:__f333PlayCurrent,render:__f333RenderCurrent,stop:__f333Stop,fractalia:__Fractalia,emilia:__Emilia,runtime:Vt,prepare:kE,config:__F341Workbench,modes:LGe,forge:__F352Runtime};';
const staged=path.join(root,'inspection/f448-spectrum.html');fs.mkdirSync(path.dirname(staged),{recursive:true});fs.writeFileSync(staged,fs.readFileSync(path.join(root,manifest.entry),'utf8').replace('</script>',hook+'</script>'));
const report={checks:[],errors:[],modes:[],limitations:['Host Chromium; physical laptop startup remains unverified.']},pass=s=>{report.checks.push(s);console.log('PASS',s)};
(async()=>{let browser;try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});const page=await browser.newPage({viewport:{width:1500,height:1000}});page.setDefaultTimeout(60000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>{
  window.__viewWorkers={created:0,active:0};const W=Worker;
  window.Worker=class extends W{constructor(url,options){super(url,options);this.view=options?.name==='forge-pcm-view';if(this.view){__viewWorkers.created++;__viewWorkers.active++}}terminate(){if(this.view){this.view=false;__viewWorkers.active--}return super.terminate()}};
 });
 await page.goto('file://'+staged);assert.equal(await page.locator('[data-forge-pcm-spectrum]').count(),0);
 assert(await page.evaluate(()=>__forgeTest.engine.playBufferInternal===__forgeTest.native));assert.deepEqual(await page.evaluate(()=>__viewWorkers),{created:0,active:0});pass('cold main room has no measurement view, observer or Worker');
 await page.getByRole('button',{name:'II. MATERIAL FORGE',exact:true}).click();await page.getByRole('button',{name:'SpectralForge',exact:false}).click();await page.locator('[data-forge-pcm-spectrum]').waitFor();
 await page.evaluate(()=>{
  const s=__forgeTest.store.getState(),g=s.spectralData;g.clear();g.melodicCarrier=null;
  for(let x=12;x<g.width-12;x++)g.set(x,Math.floor(g.height*.65),.32);
  __forgeTest.store.setState({materialExport:{...s.materialExport,bars:1,beatsPerBar:1,bpm:240}});s.triggerRender();
 });
 const ids=await page.evaluate(()=>__forgeTest.modes.map(m=>m.id));
 for(const id of ids){
  await page.evaluate(id=>__forgeTest.mode.choose(id,{prepare:false}),id);
  const before=await page.evaluate(()=>__viewWorkers.created);await page.waitForTimeout(260);assert.equal(await page.evaluate(()=>__viewWorkers.created),before,'changing modes cannot start a measurement/render');
  if(report.modes.length){
   assert.match(await page.locator('[data-forge-pcm-spectrum]').getAttribute('data-forge-pcm-spectrum'),/Previous spectrum/);
   assert.equal(await page.locator('[data-forge-spectrum-transition]').evaluate(c=>c.getAnimations().length),1,'previous spectrum must pulse on a listening-mode change');
   await page.locator('[data-forge-spectrum-transition]').evaluate(c=>{c.getAnimations()[0].currentTime=1400});
   assert(await page.locator('[data-forge-spectrum-transition]').evaluate(c=>Number(getComputedStyle(c).opacity)>.7),'red phase remains visibly present');
  }else assert.equal(await page.locator('[data-forge-pcm-spectrum]').getAttribute('data-forge-pcm-spectrum'),'Play to measure');
  const result=await page.evaluate(async()=>{
   const s=__forgeTest.store.getState(),rendered=await __forgeTest.render(s,{flacBuffer:true}),pcm=rendered.buffer.getChannelData(0),saved=pcm.slice();
   window.__currentBuffer=rendered.buffer;window.__beforeAudio=saved;
   const renderedAgain=await __forgeTest.render(s,{flacBuffer:true});
   return {same:renderedAgain.buffer===rendered.buffer,frames:pcm.length,audible:pcm.some(x=>Math.abs(x)>.0001)};
  });
  assert(result.same&&result.audible);
  assert.equal(await page.evaluate(()=>__viewWorkers.created),before,'render/export alone must not create a display job');
  await page.evaluate(()=>__forgeTest.play(__forgeTest.store.getState()));
  await page.waitForFunction(()=>document.querySelector('[data-forge-pcm-spectrum]')?.dataset.forgePcmSpectrum==='Cyan · heard spectrum');
  const measured=await page.evaluate(()=>{
   const c=document.querySelector('[data-forge-pcm-spectrum]'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let cyan=0;
   for(let i=0;i<p.length;i+=4)if(p[i+1]>100&&p[i+2]>100&&p[i+3]>20)cyan++;
   const a=__currentBuffer.getChannelData(0);return {cyan,unchanged:a.every((v,i)=>Object.is(v,__beforeAudio[i])),active:__viewWorkers.active};
  });
  assert(measured.cyan>10,`${id} has visible cyan overtones`);assert(measured.unchanged);assert.equal(measured.active,0);
  assert.equal(await page.locator('[data-forge-spectrum-transition]').evaluate(c=>c.getAnimations().length),0,'red animation ends on the new cyan image');
  report.modes.push({id,...result,...measured});await page.evaluate(()=>__forgeTest.stop());
 }
 pass('all eight synthetic listening modes: real preview PCM, visible cyan, preserved red pulse and cyan swap, no audio mutation, no export-triggered analysis');
 await page.getByLabel('Show heard spectrum',{exact:true}).uncheck();
 assert(await page.evaluate(()=>__forgeTest.engine.playBufferInternal===__forgeTest.native));
 await page.getByLabel('Show heard spectrum',{exact:true}).check();
 await page.waitForFunction(()=>document.querySelector('[data-forge-pcm-spectrum]')?.dataset.forgePcmSpectrum==='Play to measure');
 await page.evaluate(()=>{window.__normalWorker=window.Worker;window.Worker=class extends __normalWorker{constructor(url,options){if(options?.name==='forge-pcm-view')throw Error('test blocked analysis Worker');super(url,options)}}});
 assert(await page.evaluate(()=>__forgeTest.play(__forgeTest.store.getState())));
 await page.waitForFunction(()=>document.querySelector('[data-forge-pcm-spectrum]')?.dataset.forgePcmSpectrum==='Spectrum unavailable');
 await page.evaluate(()=>{window.Worker=__normalWorker;__forgeTest.stop()});pass('disabled visualization detaches; unavailable analysis Worker cannot fail audio playback');
 // The ninth listening mode uses a real extracted donor, through the same passive observer.
 await page.evaluate(async()=>{
  const sr=16000,monoSamples=Float32Array.from({length:sr},(_,i)=>.2*Math.sin(2*Math.PI*220*i/sr)+.08*Math.sin(2*Math.PI*660*i/sr));
  const source={fileName:'Spectrum donor.wav',sampleRate:sr,channelCount:1,originalDuration:1,importStartSec:0,importDurationSec:1,monoSamples,leftSamples:monoSamples,rightSamples:monoSamples};
  const token=__forgeTest.runtime.beginExtraction(source),model=await __forgeTest.prepare(source);
  if(!__forgeTest.runtime.commitExtraction(token,source,model))throw Error('Donor extraction rejected');
  __forgeTest.store.getState().setSpectralEmbodimentSourceAsset(source);__forgeTest.mode.choose('donor',{prepare:false});
 });
 await page.evaluate(()=>__forgeTest.play(__forgeTest.store.getState()));await page.waitForFunction(()=>document.querySelector('[data-forge-pcm-spectrum]')?.dataset.forgePcmSpectrum==='Cyan · heard spectrum');pass('real donor uses exactly the same visualization path');
 await page.evaluate(()=>__forgeTest.play(__forgeTest.store.getState()));await page.getByRole('button',{name:'I. XENSONAR MAIN ROOM',exact:true}).click();
 await page.waitForFunction(()=>__forgeTest.engine.playBufferInternal===__forgeTest.native&&__viewWorkers.active===0);
 assert.equal(await page.locator('[data-forge-pcm-spectrum]').count(),0);assert.equal(await page.evaluate(()=>__forgeTest.forge.diagnostics().attached),false);pass('leaving during measurement restores the original player, terminates Worker and discards the display');
 await page.getByRole('button',{name:'II. MATERIAL FORGE',exact:true}).click();await page.getByRole('button',{name:'SpectralForge',exact:false}).click();await page.locator('[data-forge-pcm-spectrum]').waitFor();
 assert.equal(await page.locator('[data-forge-pcm-spectrum]').getAttribute('data-forge-pcm-spectrum'),'Play to measure');await page.evaluate(()=>__forgeTest.play(__forgeTest.store.getState()));await page.waitForFunction(()=>document.querySelector('[data-forge-pcm-spectrum]')?.dataset.forgePcmSpectrum==='Cyan · heard spectrum');pass('re-entry rebuilds only on preview, using retained musical state');
 await page.screenshot({path:path.join(root,'results/f448-spectrum.png'),fullPage:false});
 await page.getByRole('button',{name:'SyntheticForge',exact:false}).click();
 await page.waitForFunction(()=>__forgeTest.engine.playBufferInternal===__forgeTest.native);
 assert.equal(await page.locator('[data-forge-pcm-spectrum]').count(),0);pass('switching to Synthetic Forge also removes the spectrum owner');
 assert.deepEqual(report.errors,[]);pass('no uncaught application/Worker errors');
 }catch(e){report.failure=e.stack;console.error(e);process.exitCode=1}finally{await browser?.close();fs.writeFileSync(path.join(root,'results/f448-spectrum-browser.json'),JSON.stringify(report,null,2))}})();
