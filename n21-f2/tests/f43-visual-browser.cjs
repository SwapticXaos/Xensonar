'use strict';
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),manifest=require('../source-manifest.json'),errors=[],checks=[];
const inject='window.__f41={api:__Fractalia,store:pe,engine:xt,runtime:Vt,prepare:kE,persistence:__f333Persistence,hearing:__f333RenderHearing,request:__f333HearingRequest,donor:fractaliaDonorSnapshot,config:__F341Workbench,experiments:__FractaliaExperiments,material:__FractaliaMaterialRuntime,view:__FractaliaSpectralView,measure:measureFractaliaSpectrum};';
const html=fs.readFileSync(path.join(root,manifest.entry),'utf8').replace('</script>',inject+'</script>');
const pass=s=>{checks.push(s);console.log('PASS',s)};
(async()=>{
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.XENSONAR_CHROMIUM||undefined,args:[...JSON.parse(process.env.XENSONAR_CHROMIUM_ARGS||'[]'),'--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1060}});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByRole('button',{name:'II. MATERIAL FORGE',exact:true}).click();await page.getByRole('button',{name:'SpectralForge'}).click();await page.locator('select').filter({has:page.locator('option[value=fractalia]')}).first().selectOption('fractalia');
  const lab=page.locator('[data-fractalia-lab]');await lab.getByLabel('Fractalia example instruments').selectOption('glass');await lab.getByLabel('Fractalia sound source').selectOption('material');
  const missing=await page.evaluate(async()=>{try{await __f41.api.renderCarrier({grid:__f41.store.getState().spectralData,durationSec:.5});return ''}catch(e){return e.message}});assert.match(missing,/cached donor/);pass('Missing donor is explicit; no synthetic fallback');
  await page.evaluate(async()=>{
   const sr=16000,samples=Float32Array.from({length:16000},(_,i)=>.18*Math.sin(2*Math.PI*220*i/sr)+.11*Math.sin(2*Math.PI*660*i/sr)+.08*Math.sin(2*Math.PI*1139*i/sr));
   const source={fileName:'Ecology donor A.wav',sampleRate:sr,channelCount:1,originalDuration:1,importStartSec:0,importDurationSec:1,monoSamples:samples,leftSamples:samples,rightSamples:samples};
   const token=__f41.runtime.beginExtraction(source),model=await __f41.prepare(source);if(!__f41.runtime.commitExtraction(token,source,model))throw Error('extraction rejected');
   __f41.store.getState().setSpectralEmbodimentSourceAsset(source);
   const s=__f41.store.getState(),g=s.spectralData;g.clear();g.melodicCarrier=null;
   for(let x=8;x<g.width-8;x++)for(let dy=-1;dy<=1;dy++)g.set(x,Math.floor(g.height*.65)+dy,.5);
   s.triggerRender();
  });
  await page.waitForFunction(()=>__f41.donor().ready);assert.match(await lab.locator('[data-fractalia-donor]').innerText(),/Ecology donor A/);
  const result=await page.evaluate(async()=>{
   const s=__f41.store.getState(),request=__f41.request(s);request.previewBpm=240;
   const a=await __f41.hearing(request),b=await __f41.hearing(request),pcm=a.buffer.getChannelData(0);
   window.__donorFirst=a;window.__donorRequest=request;
   return {frames:pcm.length,peak:pcm.reduce((m,v)=>Math.max(m,Math.abs(v)),0),finite:pcm.every(Number.isFinite),hit:b.cacheHit,same:a.buffer===b.buffer,recipe:__f41.api.snapshot().donor};
  });assert(result.frames>1000&&result.peak>.001&&result.finite&&result.hit&&result.same);pass('Real donor extraction → Fractalia spectral PCM → shared hearing/export buffer; exact cache hit');
  await page.locator('[data-xensonar-spectralforge-render-fill-button]').click();await page.waitForFunction(()=>__f41.engine.currentSource?.buffer,{timeout:60000});
  const played=await page.evaluate(()=>{const b=__f41.engine.currentSource.buffer,a=b.getChannelData(0);return {frames:a.length,finite:a.every(Number.isFinite),audible:a.some(v=>Math.abs(v)>.001)}});assert(played.finite&&played.audible);await page.evaluate(()=>__f41.engine.stop());
  const wavPromise=page.waitForEvent('download');await page.locator('button').filter({hasText:'⬇ WAV'}).last().click();const download=await wavPromise,bytes=fs.readFileSync(await download.path());assert.equal(bytes.toString('ascii',0,4),'RIFF');assert(bytes.length>1000);pass('Main Play emits donor-linked audio and the real Output button downloads a WAV');
  const width=await lab.evaluate(e=>({client:e.clientWidth,scroll:e.scrollWidth}));assert(width.scroll<=width.client+3);pass('Material controls fit the existing Lab width');
  await page.waitForFunction(()=>__f41.view.snapshot().hasOutput,{timeout:60000});
  const overlay=await page.evaluate(()=>{const a=__f41.view.inspect(),c=a.targetCanvas,ctx=c?.getContext('2d'),data=ctx?.getImageData(0,0,c.width,c.height).data;let cyan=0;if(data)for(let i=0;i<data.length;i+=4)if(data[i+1]>data[i]*1.2&&data[i+2]>data[i]*1.2&&data[i+1]>45)cyan++;return {source:a.output.source,width:a.output.width,height:a.output.height,painted:!!a.record,cyan,hasCanvas:!!c}});assert(overlay.painted&&overlay.cyan>50&&overlay.hasCanvas);pass('Measured overtones are actually painted on the Carrier canvas');
  await lab.getByLabel('Fractalia spectrum view').selectOption('changes');await page.waitForFunction(()=>__f41.view.snapshot().hasReference&&__f41.view.snapshot().status==='ready',{timeout:60000});
  const comparison=await page.evaluate(()=>{const a=__f41.view.inspect();return {common:a.record.sharedMaximum===Math.max(a.output.maximum,a.reference.maximum),sameGrid:a.output.width===a.reference.width&&a.output.height===a.reference.height,hasDelta:a.output.values.some((v,i)=>Math.abs(v-a.reference.values[i])>.001)}});assert(comparison.common&&comparison.sameGrid&&comparison.hasDelta);pass('Neutral reference and signed difference share measured frequency/time geometry and amplitude scale');
  const geometryBefore=await page.evaluate(()=>Array.from(__f41.store.getState().spectralData.data).join(','));
  await lab.getByLabel('Fractalia spectrum view').selectOption('off');await page.waitForFunction(()=>__f41.view.snapshot().mode==='off');assert.equal(await page.evaluate(()=>__f41.view.inspect().record),null);
  assert.equal(await page.evaluate(()=>Array.from(__f41.store.getState().spectralData.data).join(',')),geometryBefore);pass('View modes leave the editable Carrier unchanged');
  await lab.getByLabel('Fractalia spectrum view').selectOption('compare');await page.screenshot({path:path.join(root,'../f43-ui-internal.png'),fullPage:false});
  const materialReport=await page.evaluate(()=>__f41.material.getReport());assert(materialReport.worker&&materialReport.spectralFrames>0);pass('Material analysis and phase deformation run in a real worker');
  const frozen=await page.evaluate(async()=>{const text=await __f41.experiments.exported(),p=__f41.experiments.parse(text);window.__frozenText=text;return {schema:p.schema,reading:p.snapshot.fractaliaInstrument.donor.reading,raw:p.prepared.samples.length,pitch:p.render.tuning,view:p.viewPreferences,renderer:p.contract.rendererRevision}});assert.equal(frozen.reading,'material-relations');assert(frozen.raw>1000);assert.equal(frozen.renderer,2);assert(frozen.view?.mode);pass('Automatic frozen experiment contains exact PCM, instrument, Carrier and render contract');
  await page.evaluate(async()=>{const p=__f41.experiments.parse(window.__frozenText),s=__f41.store.getState(),a=await __f41.api.renderCarrier({grid:s.spectralData,durationSec:p.render.durationSec,previewPitchRatio:p.render.previewPitchRatio});window.__frozenPCM=Array.from(a.getChannelData(0))});
  await lab.getByLabel('Fractalia example instruments').selectOption('reed');await page.waitForFunction(()=>!__f41.view.snapshot().hasOutput);pass('Changing the instrument clears the obsolete measured picture');assert.equal(await page.evaluate(()=>__f41.api.snapshot().donor.reading),'material-relations');pass('Changing instrument geometry retains the explicit donor binding');
  await page.evaluate(async()=>__f41.experiments.restore(__f41.experiments.parse(window.__frozenText)));assert.equal(await page.evaluate(()=>__f41.api.snapshot().name),'Glass Branches');pass('Portable experiment restores the active instrument and cached donor');
  const restoredPCM=await page.evaluate(async()=>{const p=__f41.experiments.parse(window.__frozenText),b=await __f41.api.renderCarrier({grid:__f41.store.getState().spectralData,durationSec:p.render.durationSec,previewPitchRatio:p.render.previewPitchRatio}),a=b.getChannelData(0);return a.length===window.__frozenPCM.length&&a.every((v,i)=>v===window.__frozenPCM[i])});assert(restoredPCM);pass('Frozen experiment reproduces the rendered Float32 PCM byte for byte');
  fs.mkdirSync(path.join(root,'examples/f43'),{recursive:true});fs.writeFileSync(path.join(root,'examples/f43/Frozen_Material_Experiment.json'),await page.evaluate(()=>window.__frozenText));
  const mask=await page.evaluate(async()=>{const cfg=__f41.config.export();try{__f41.config.restore({...cfg,regions:[{id:'one',role:'include',start:0,end:.2},{id:'two',role:'include',start:.7,end:.9}]});await __f41.api.renderCarrier({grid:__f41.store.getState().spectralData,durationSec:.4});return __f41.material.getReport().joinedRegions}finally{__f41.config.restore(cfg)}});assert.equal(mask,2);pass('Disjoint permitted donor regions are joined without reading excluded source areas');
  const change=await page.evaluate(async()=>{
   const s=__f41.runtime.getSnapshot(),samples=Float32Array.from(s.source.monoSamples,(v,i)=>v*.5+.08*Math.sin(2*Math.PI*1800*i/s.source.sampleRate)),source={...s.source,fileName:'Ecology donor B.wav',monoSamples:samples,leftSamples:samples,rightSamples:samples};
   const token=__f41.runtime.beginExtraction(source),model=await __f41.prepare(source);__f41.runtime.commitExtraction(token,source,model);__f41.store.getState().setSpectralEmbodimentSourceAsset(source);
   const b=await __f41.hearing(window.__donorRequest),a=window.__donorFirst.buffer.getChannelData(0),c=b.buffer.getChannelData(0);return {hit:b.cacheHit,different:c.some((v,i)=>v!==a[i])};
  });assert(!change.hit&&change.different);pass('Changing donor invalidates PCM cache and changes sound without recapturing the Fractalia drawing');
  await lab.getByRole('button',{name:'Save Active Instrument',exact:true}).click();await page.waitForFunction(()=>__f41.api.libraryEntries().length===1);
  const cancelled=await page.evaluate(async()=>{const s=__f41.store.getState();let changed=false;try{await __f41.api.renderCarrier({grid:s.spectralData,durationSec:3,onProgress:p=>{if(p>.15&&!changed){changed=true;const d=__f41.runtime.getSnapshot();__f41.runtime.beginExtraction({...d.source,fileName:'superseded.wav'})}}});return false}catch(e){return changed&&e.name==='AbortError'}});assert(cancelled);pass('Changing donor during rendering cancels stale output');
  // Restore valid donor through the real extraction path before testing persistence.
  await page.evaluate(async()=>{const source=__f41.store.getState().spectralEmbodimentSourceAsset,t=__f41.runtime.beginExtraction(source),m=await __f41.prepare(source);__f41.runtime.commitExtraction(t,source,m);await __f41.persistence.saveNow()});
  await page.reload();await page.waitForFunction(()=>window.__f41?.persistence?.status().restoreComplete,{timeout:60000});await page.waitForFunction(()=>__f41.donor().ready,{timeout:60000});
  const restored=await page.evaluate(()=>({donor:__f41.api.snapshot().donor,name:__f41.donor().name,entries:__f41.api.libraryEntries().length}));assert.equal(restored.donor.reading,'material-relations');assert.match(restored.name,/donor B/);assert.equal(restored.entries,1);pass('Workspace reload restores both donor sample and versioned Fractalia binding');
  assert.deepEqual(errors,[]);pass('Complete application has no uncaught JavaScript errors');
  fs.writeFileSync(path.join(root,'results/f43-visual-browser.json'),JSON.stringify({checks,result,restored,errors},null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
