'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const manifest=require('../source-manifest.json');
const html=fs.readFileSync(path.join(root,manifest.entry),'utf8').replace('</script>','window.__emtest={api:__Emilia,store:pe,cache:__f333HearingCache,persistence:__f333Persistence,engine:xt,spectrum:D6e};</script>');
const checks=[],errors=[];const pass=x=>{checks.push(x);console.log('PASS',x)};
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:1512,height:1050},acceptDownloads:true});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});
  async function enter(){await page.getByRole('button',{name:'II. MATERIAL FORGE',exact:true}).click();await page.getByRole('button',{name:'SpectralForge'}).click();await page.locator('select').filter({has:page.locator('option[value=emilia]')}).selectOption('emilia');}
  await enter();let panel=page.locator('[data-emilia-synth-lab]');await panel.waitFor();assert.equal(await panel.locator('.emilia-b-node').count(),3);pass('Actual HTTP-origin B1 editor mounts');
  const selector=panel.getByLabel('Add Emilia node',{exact:true});await selector.selectOption('drive');assert.equal(await panel.locator('.emilia-b-node').count(),4);await panel.getByRole('button',{name:'Remove node Drive',exact:true}).click();assert.equal(await panel.locator('.emilia-b-node').count(),3);pass('One-click Add and inline Remove');
  for(const role of ['drive','fold','sub','formant'])await selector.selectOption(role);assert.equal(await panel.locator('.emilia-b-node').count(),7);assert(await selector.isDisabled());pass('Seven-node limit stops additions');
  await panel.getByRole('button',{name:'Preview',exact:true}).click();await panel.getByRole('button',{name:'Stop preview',exact:true}).waitFor({timeout:90000});pass('Real AudioContext Preview prepares with all seven nodes');
  await panel.getByRole('button',{name:'Stop preview',exact:true}).click();await panel.getByRole('button',{name:'Preview',exact:true}).waitFor();
  for(const role of ['formant','sub','fold','drive'])await panel.getByRole('button',{name:'Remove node '+role[0].toUpperCase()+role.slice(1),exact:true}).last().click();
  let node=panel.locator('.emilia-b-node').first(),before=await node.getAttribute('transform'),edge=await panel.locator('svg line').evaluateAll(lines=>lines.map(l=>[l.getAttribute('x1'),l.getAttribute('y1'),l.getAttribute('x2'),l.getAttribute('y2')]));
  const r=await node.boundingBox(),field=await panel.locator('svg.emilia-b-field').boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(field.x+field.width*.77,field.y+field.height*.69,{steps:10});
  assert.deepEqual(await panel.locator('svg line').evaluateAll(lines=>lines.map(l=>[l.getAttribute('x1'),l.getAttribute('y1'),l.getAttribute('x2'),l.getAttribute('y2')])),edge);await page.mouse.up();assert.notEqual(await node.getAttribute('transform'),before);pass('Old connection structure remains during drag; new timbre commits on release');
  await panel.getByRole('button',{name:'↶ Undo'}).click();assert.equal(await node.getAttribute('transform'),before);pass('Undo restores the constellation');
  const canvas=page.locator('[data-forge-carrier-canvas]');await canvas.scrollIntoViewIfNeeded();const c=await canvas.boundingBox();
  await page.mouse.move(c.x+c.width*.15,c.y+c.height*.55);await page.mouse.down();await page.mouse.move(c.x+c.width*.79,c.y+c.height*.46,{steps:35});await page.mouse.up();
  assert(await page.evaluate(()=>window.__emtest.store.getState().spectralData.data.reduce((a,b)=>a+b,0))>0);
  await page.getByRole('button',{name:'Listening mode is rendered automatically'}).click();await page.waitForFunction(()=>window.__emtest.cache.size>0,{timeout:90000});
  const peak=await page.evaluate(()=>Array.from(window.__emtest.cache.values())[0].getChannelData(0).reduce((m,v)=>Math.max(m,Math.abs(v)),0));assert(peak>.001&&peak<1);pass('Drawn Carrier Play creates non-silent bounded listening buffer');
  // Observe the AudioBufferSourceNode used by the main Play button, not just
  // an offline render or an entry that happened to appear in a cache.
  await page.waitForFunction(()=>window.__emtest.engine.currentSource?.buffer);
  const capturePlayback=()=>page.evaluate(()=>{
   const e=window.__emtest,buffer=e.engine.currentSource.buffer,pcm=buffer.getChannelData(0);
   const fingerprint=samples=>{
    const analysis=e.spectrum(samples,buffer.sampleRate,2048,1024),bands=new Array(40).fill(0);
    for(const frame of analysis.magnitudes)for(let bin=1;bin<frame.length;bin++){
     const hz=bin*buffer.sampleRate/analysis.fftSize;
     const band=Math.min(39,Math.max(0,Math.floor(40*Math.log1p(hz/80)/Math.log1p(buffer.sampleRate/2/80))));
     bands[band]+=frame[bin]*frame[bin];
    }
    const total=bands.reduce((a,b)=>a+b,0);return bands.map(v=>v/Math.max(1e-30,total));
   };
   const negativeControl=Float32Array.from(pcm,v=>v*-.37);
   return {pcm:Array.from(pcm),bands:fingerprint(pcm),control:fingerprint(negativeControl),
    machine:e.store.getState().carrierIntegralSelection.machineId,
    mode:e.engine.__f340PreviewSession.options.lifecycleMode,recipe:e.api.semanticKey(e.api.snapshot())};
  });
  const playedBefore=await capturePlayback();
  const l1=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0);
  assert(l1(playedBefore.bands,playedBefore.control)<1e-6,'Loudness/polarity changes must not count as a new timbre');
  await panel.scrollIntoViewIfNeeded();
  node=panel.locator('.emilia-b-node').first();const nr=await node.boundingBox(),fr=await panel.locator('svg.emilia-b-field').boundingBox();
  await page.mouse.move(nr.x+nr.width/2,nr.y+nr.height*.4);await page.mouse.down();
  await page.mouse.move(fr.x+fr.width*.94,fr.y+fr.height*.18,{steps:12});await page.mouse.up();
  assert.equal(await page.evaluate(()=>window.__emtest.engine.currentSource),null,'Node edit must discard the previous playback source');
  assert.equal(await page.evaluate(()=>window.__emtest.cache.size),0,'Node edit must invalidate hearing cache');
  await page.locator('[data-xensonar-spectralforge-render-fill-button]').click();
  await page.waitForFunction(()=>window.__emtest.engine.currentSource?.buffer,{timeout:90000});
  const playedAfter=await capturePlayback();
  assert.equal(playedAfter.machine,'emilia-nodal-carrier');assert.equal(playedAfter.mode,'forge-f333-hearing');
  assert.notEqual(playedBefore.recipe,playedAfter.recipe);assert.notDeepEqual(playedBefore.pcm,playedAfter.pcm);
  const playbackBandDistance=l1(playedBefore.bands,playedAfter.bands);
  assert(playbackBandDistance>.05,'Main Carrier output retained the old spectral balance after a large single-node move');
  pass('Main Carrier Play replaces actual playback PCM after a single UI node move; gain/polarity controls cannot pass the spectral check');
  await panel.getByRole('button',{name:'↶ Undo'}).click();
  await page.locator('[data-xensonar-spectralforge-render-fill-button]').click();
  await page.waitForFunction(()=>window.__emtest.engine.currentSource?.buffer,{timeout:90000});
  const playedUndo=await capturePlayback();assert.deepEqual(playedUndo.pcm,playedBefore.pcm);
  pass('Undo restores the exact original Carrier playback, rather than reusing the edited sound');
  const downloadPromise=page.waitForEvent('download',{timeout:90000});await page.locator('button').filter({hasText:'⬇ WAV'}).last().click();const download=await downloadPromise;
  fs.mkdirSync(path.join(root,'inspection'),{recursive:true});const wav=path.join(root,'inspection/material_browser_export.wav');await download.saveAs(wav);const bytes=fs.readFileSync(wav);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert(bytes.length>1000);pass('WAV export through real UI succeeds');
  const captureSession=()=>page.evaluate(async()=>{const s=window.__emtest.store.getState(),d=s.spectralData.data;const digest=await crypto.subtle.digest('SHA-256',new Uint8Array(d.buffer,d.byteOffset,d.byteLength));return {carrierHash:Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join(''),width:s.spectralData.width,height:s.spectralData.height,bpm:s.materialExport.bpm,bars:s.materialExport.bars,selection:s.carrierIntegralSelection.machineId};});
  const sessionBefore=await captureSession();
  const stateBefore=await page.evaluate(()=>{const a=window.__emtest.api,model=a.moveNode(a.snapshot(),a.snapshot().model.nodes[0].id,.83,.61);a.set(model);return a.semanticKey(a.snapshot())});
  await page.evaluate(async()=>{await window.__emtest.persistence.saveNow()});await page.reload({waitUntil:'load'});await page.waitForFunction(()=>window.__emtest.persistence.status().restoreComplete);await enter();assert.equal(await page.evaluate(()=>window.__emtest.api.semanticKey(window.__emtest.api.snapshot())),stateBefore);pass('Constellation survives origin-real localStorage and experiment reload');
  const g=await page.evaluate(()=>window.__emtest.store.getState().spectralData.data.reduce((a,b)=>a+b,0));assert(g>0,'Reload must preserve the painted Carrier');assert.deepEqual(await captureSession(),sessionBefore);pass('Exact Carrier bytes, BPM, bars and listening mode survive reload');
  assert.equal(errors.length,0);pass('No uncaught JavaScript errors');
  fs.writeFileSync(path.join(root,'results/material_browser.json'),JSON.stringify({entry:manifest.entry,checks,peak,exportBytes:bytes.length,errors,origin:'local HTTP',carrierDrawingRestored:g>0,playbackBandDistance,perceptualAcceptance:"Not established: this regression detects stale playback and lost spectral contrast; it is not a listening verdict"},null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
