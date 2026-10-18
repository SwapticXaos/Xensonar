// F448: same real PCM handoff checks; obsolete visualization hook removed.
'use strict';
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const rootPath=path.resolve(__dirname,'..'),manifest=require('../source-manifest.json'),errors=[],checks=[];
const inject='window.__f41={api:__Fractalia,store:pe,engine:xt,runtime:Vt,prepare:kE,persistence:__f333Persistence,hearing:__f333RenderHearing,request:__f333HearingRequest,donor:fractaliaDonorSnapshot,config:__F341Workbench,experiments:__FractaliaExperiments,material:__FractaliaMaterialRuntime,getDispatch:()=>ri,setDispatch:fn=>{ri=fn},transfer:Wje,plan:aze,prepareTransfer:Lje,transferSettings:Pze,encode:lg,measure:measureFractaliaSpectrum};';
const html=fs.readFileSync(path.join(rootPath,manifest.entry),'utf8').replace('</script>',inject+'</script>');
const pass=s=>{checks.push(s);console.log('PASS',s)};
(async()=>{
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.XENSONAR_CHROMIUM||undefined,args:[...JSON.parse(process.env.XENSONAR_CHROMIUM_ARGS||'[]'),'--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1060}});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByRole('button',{name:'II. MATERIAL FORGE',exact:true}).click();await page.getByRole('button',{name:'SpectralForge'}).click();await page.locator('select').filter({has:page.locator('option[value=fractalia]')}).first().selectOption('fractalia');
  const lab=page.locator('[data-fractalia-lab]');await lab.getByLabel('Fractalia example instruments').selectOption('glass');await lab.getByLabel('Fractalia sound source').selectOption('material');
  const missing=await page.evaluate(async()=>{try{await __f41.api.renderCarrier({grid:__f41.store.getState().spectralData,durationSec:.5});return ''}catch(e){return e.message}});assert.match(missing,/cached donor|select a donor mask/);pass('Missing donor is explicit; no synthetic fallback');
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
  const handoffs=await page.evaluate(async()=>{
   const state=__f41.store.getState(),snapshot=state.createProjectSnapshot();snapshot.materialExport={...snapshot.materialExport,bars:1,beatsPerBar:3,bpm:240};
   const results=[],events=[],syntheticRoutes=[];
   const synthetic=['branch-a-line-traffic','branch-b573-synth-window','branch-c-interval-body'];
   for(const machineId of synthetic){const plan=__f41.plan({machineId,targetId:'root-follow-export'});if(plan.rootFollowMembershipConfig!=='artifact-config'||plan.contract.signalKind!=='synthetic-carrier-body')throw Error('Synthetic Root Follow route changed: '+machineId);syntheticRoutes.push({machineId,membership:plan.rootFollowMembershipConfig,signalKind:plan.contract.signalKind,elasticity:plan.contract.defaultElasticity})}
const listener=e=>events.push(e.detail);
   // Capture only the material membership request; no external services are used.
   const original=__f41.getDispatch();__f41.setDispatch((name,detail)=>{events.push({name,detail})});
   const originalFallback=__f41.engine.renderToBuffer;__f41.engine.renderToBuffer=()=>{throw Error('Generic synthesis must not run for Fractalia transfer')};
   try{
    for(const targetId of ['root-follow-export','melodic-pink-export','materialspur-export']){
     const request={entry:{id:'live-test-project',name:'Fractalia live body'},snapshot,machineId:'fractalia-self-carrier',targetId,targetLabel:targetId,valueSource:'stored',storedSynthLab:snapshot.carrierIntegralSynthLab,currentSynthLab:snapshot.carrierIntegralSynthLab,currentHarmonicXplore:snapshot.carrierIntegralHarmonicXplore,previewBpm:240,previewVolume:1,previewPitchSemitones:0};
     const settings=__f41.transferSettings(request),context=__f41.prepareTransfer(request,settings);
     if(context.artifact.config!==null)throw Error('Synthetic artifact plan leaked');
     const heard=await __f41.hearing(__f41.request({...state,materialExport:snapshot.materialExport,createProjectSnapshot:()=>snapshot}));
     const sent=await __f41.transfer(request),blob=sent.materialEntry.blob,bytes=new Uint8Array(await blob.arrayBuffer());
     const pcm=heard.buffer.getChannelData(0),reference=heard.buffer.context;const encoded=new DataView(bytes.buffer),channels=encoded.getUint16(22,true),frames=encoded.getUint32(40,true)/(channels*2);
     let identical=frames===pcm.length;for(let i=0;identical&&i<frames;i++){const v=Math.max(-1,Math.min(1,Math.fround(pcm[i]*settings.previewGain))),expected=(v<0?v*32768:v*32767)|0;if(encoded.getInt16(44+i*channels*2,true)!==expected)identical=false}
     results.push({targetId,source:sent.renderedAudio.audioIdentitySource,signalKind:sent.transferPlan.contract.signalKind,kind:sent.transferPlan.melodicHandoffKind,config:sent.rootFollowConfig,blobSize:blob.size,frames,expectedFrames:pcm.length,identical,duration:sent.renderedAudio.durationSec,beatsPerBar:sent.materialEntry.timing?.beatsPerBar??sent.materialEntry.beatsPerBar,structured:!!sent.materialEntry.audioPaintImportDetailJson,plan:sent.transferPlan.rootFollowMembershipConfig});
    }
    return {results,events,syntheticRoutes};
   }finally{__f41.setDispatch(original);__f41.engine.renderToBuffer=originalFallback}
  });
  assert.equal(handoffs.results.length,3);for(const x of handoffs.results){assert.equal(x.source,'fractalia-workshop-pcm');assert.equal(x.signalKind,'raw-audio-body');assert.equal(x.config,null);assert(x.identical);assert.equal(x.duration,.75);assert(!x.structured);assert.equal(x.beatsPerBar,3);}
  const root=handoffs.events.find(e=>e.name==='rootFollowBankMembership');assert(root&&root.detail.config.sourceKind==='material'&&!root.detail.config.synthPattern);
  assert(handoffs.events.some(e=>e.name==='carrierIntegralRawMaterialMelodicExport'));assert(!handoffs.events.some(e=>e.name==='carrierIntegralMelodicPinkExport'));
  pass('All Fractalia library destinations receive the heard PCM as WAV, retain 3/4 timing and carry no generic synth plan');
  assert.deepEqual(errors,[]);pass('No uncaught browser errors');
  fs.writeFileSync(path.join(rootPath,'results/f448-live-transfer-browser.json'),JSON.stringify({checks,handoffs,errors},null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
