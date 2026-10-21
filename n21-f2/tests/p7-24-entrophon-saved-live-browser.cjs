'use strict';
// Real browser: library/menu identity -> production Wave/Keyboard dispatch ->
// C11 reservation/encoded record -> native WASM worklet PCM. No device claim.
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');
const arg=(key,fallback)=>{const p=process.argv.indexOf(key);return p<0?fallback:process.argv[p+1]};
const htmlFile=arg('--html',require('../source-manifest.json').entry),expectRegression=process.argv.includes('--expect-underestimated');
const expose=`window.__savedEntrophon={lib:__XenEntrophonLibrary,capture:captureEntrophonInstrument,set:dG,current:Ew,resolve:entrophonLiveDefinition,find:entrophonFindInstrument,options:entrophonSoundOptions,
 async render(id,lane='wave',offline=false){
  const requests=Array.isArray(id)?id:[{id,lane}],selections=[];
  const ctx=offline?new OfflineAudioContext(1,48000,24000):new AudioContext({sampleRate:48000}),active={current:[]},results=[],records=[],reservations=[],plans=[];
  const transient={canAdmitVoice:()=>true,releaseVoice(){},admitVoice:()=>({plan:{envelopeScale:1,gainScale:1}}),pickTargets:a=>a};
  let host=null,analyser=null;
  if(!offline){
   await ctx.resume();await s9(ctx);const {bytes}=await l9();analyser=ctx.createAnalyser();analyser.fftSize=2048;analyser.connect(ctx.destination);
   host=new r9(ctx,analyser,1);if(!await host.createNode({wasmBytes:bytes}))throw Error('C11 WASM host unavailable');host.unmute();
   const until=performance.now()+1000;while(!host.canSubmit&&performance.now()<until)await new Promise(r=>setTimeout(r,10));if(!host.canSubmit)throw Error('C11 session unavailable');
   const reserve=host.tryReserveAttack.bind(host);host.tryReserveAttack=(token,frame,units,voices)=>{reservations.push(units);return reserve(token,frame,units,voices)};
   const submit=host.trySubmitRecord.bind(host);host.trySubmitRecord=record=>{records.push({units:LMe(record),base:record[5],color:record[6],delay:record[40]});return submit(record)};
   rg.set(ctx,{host,ready:true,owned:true,token:1,encoder:new xMe,submitted:0,failed:0,legacyFallbacks:0});
  }
  // Schedule this offline CI probe 60 ms ahead: exercise admission/PCM without
  // treating headless main-thread pauses as a realtime deadline benchmark.
  const play=(freq,offset,dur,type,volume,q,cutoff,targetDestinations,options)=>{if(!offline){offset+=.06;options={...options,intendedStartTimeSec:ctx.currentTime+offset}}const result=twe({ctx,activeScheduledTonesRef:active,transientRuntime:transient,getMainOutput:()=>ctx.destination,...(offline?{submitEntrophonC11:(context,plan)=>{const {onEnded,...sound}=plan;plans.push(sound);return {owned:false,submitted:false}},noteEntrophonLegacyFallback(){}}:{}),recordCount(){},recordAdaptiveAction(){}},{freq,offset,dur,type,volume,q,cutoff,targetDestinations,options});results.push(result);return result};
  for(const {id,lane} of requests){
  const options={entrophonWaveActive:id==='entrophon',keyboardGestureSource:lane==='keyboard'?'keyboard-direct':undefined},selection=$w(id),resolved=pL({baseFreq:220,isSector:false,cursorX:0,octaveHeld:false,swell:0,runtimeVolume:.3,options});
  const routes={ensureCollectiveMemoryFx(){},ensurePsychedelicSpiralDevice(){},ensureTransientDriveDevice(){},ensureEnterHoldPsyFxDevice(){},ensureSchwarmdeuterDevice(){},ensureMyzelPostFxRouter(){}};
  const input={ctx,runtime:{enabled:true,preset:id,volume:.3},options,transientRuntime:transient,resolvedDirect:{selection,emitState:resolved},baseFreq:220,cursor:{cursorX:0},swellBlend:0,nexusSound:{},fxTargets:{},fxRoutes:routes,getWaveOutput:()=>ctx.destination,primeMyzelFromY(){},beginTransientEvent:()=>null,activeScheduledTonesRef:active,playScheduledTone:play,triggerBodyExciter(){},enqueueOvertoneArp(){}};
  const start=results.length,recordStart=records.length;
  if(lane==='keyboard')Ixe(input);else Exe(input);
  selections.push({id,lane,definition:selection.entrophonDefinition?.name??null,results:results.slice(start),records:records.slice(recordStart)});
  }
  let peak=0,energy=0,pcm=null;
  if(offline){const buffer=await ctx.startRendering();pcm=Array.from(buffer.getChannelData(0));for(const v of pcm){if(!Number.isFinite(v))throw Error('Nonfinite PCM');peak=Math.max(peak,Math.abs(v));energy+=v*v}}
  else{const samples=new Float32Array(analyser.fftSize),until=performance.now()+240;while(performance.now()<until){await new Promise(r=>setTimeout(r,8));analyser.getFloatTimeDomainData(samples);for(const v of samples){if(!Number.isFinite(v))throw Error('Nonfinite C11 PCM');peak=Math.max(peak,Math.abs(v));energy+=v*v}}}
  const diagnostic=host?.diagnosticSnapshot()??null;
  if(host){host.destroy();rg.delete(ctx);await ctx.close()}
  return {id,lane,definition:selections[0]?.definition,selections,results,records,reservations,plans,peak,energy,diagnostic,...(pcm?{pcm}:{})};
 }};`;
function comparePCM(a,b,label){assert.deepEqual(a.plans,b.plans,label+' production voice plans changed');assert.equal(a.pcm.length,b.pcm.length);let max=0,error=0;for(let i=0;i<a.pcm.length;i++){const delta=a.pcm[i]-b.pcm[i];max=Math.max(max,Math.abs(delta));error+=delta*delta}const relativeRMS=Math.sqrt(error/Math.max(a.energy,1e-12));assert(max<Math.max(a.peak,b.peak)*1e-3&&relativeRMS<1e-3,label+' native WebAudio PCM changed '+JSON.stringify({max,relativeRMS}));return {max,relativeRMS}}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage(),errors=[],rows=[],comparisons=[],controls=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Page error:',e.message)});
  const original=fs.readFileSync(htmlFile,'utf8'),marker='const kEe=CEe("root");';assert.equal(original.split(marker).length,2);
  const html=original.replace(marker,expose+marker);await page.route('https://xensonar.test/**',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto('https://xensonar.test/saved-entrophon');await page.waitForFunction(()=>!!window.__savedEntrophon);
  const ids=await page.evaluate(()=>{const a=__savedEntrophon;a.set('wave',{enabled:true,engineAmount:1,volume:.8,unison:6,colorAmount:1,delayAmount:.4});const A=a.lib.save(a.capture('Saved A'));a.set('wave',{unison:1,colorAmount:0,delayAmount:0,waveform:'sine',volume:.6});const C=a.lib.save(a.capture('Saved C'));return {a:'entrophon:'+A.id+'@'+A.revision,c:'entrophon:'+C.id+'@'+C.revision,libraryId:A.id}});
  // Select both actual menus; subsequent renders consume their exact selected IDs.
  const wave=page.getByRole('combobox',{name:'Wave Starter sound',exact:true}),keyboard=page.getByRole('combobox',{name:'Keyboard sound',exact:true});
  await wave.selectOption(ids.a);await keyboard.selectOption(ids.c);
  assert.equal(await wave.inputValue(),ids.a);assert.equal(await keyboard.inputValue(),ids.c);
  const nativeA=await page.evaluate(id=>__savedEntrophon.render(id,'wave',true),ids.a);
  const nativeKeyboardA=await page.evaluate(id=>__savedEntrophon.render(id,'keyboard',true),ids.a);
  const nativeC=await page.evaluate(id=>__savedEntrophon.render(id,'keyboard',true),ids.c);
  controls.push({label:'Same-state Wave A repeat',difference:comparePCM(nativeA,await page.evaluate(id=>__savedEntrophon.render(id,'wave',true),ids.a),'Same-state Wave A')});
  controls.push({label:'Same-state Keyboard A repeat',difference:comparePCM(nativeKeyboardA,await page.evaluate(id=>__savedEntrophon.render(id,'keyboard',true),ids.a),'Same-state Keyboard A')});
  assert(nativeA.peak>.01&&nativeC.peak>.01);assert(Math.abs(nativeA.energy-nativeC.energy)>1,'distinct saved sounds have distinct PCM');
  await page.evaluate(()=>__savedEntrophon.set('wave',{enabled:false,engineAmount:0,volume:0,unison:1,colorAmount:0,delayAmount:0,waveform:'square'}));
  const cheapCurrent=await page.evaluate(id=>__savedEntrophon.render(id,'wave'),await wave.inputValue());rows.push(cheapCurrent);
  if(expectRegression){assert.equal(cheapCurrent.peak,0);assert(cheapCurrent.results.every(r=>r.admitted===false));assert(cheapCurrent.records.some((r,i)=>r.units>cheapCurrent.reservations[i]));assert(cheapCurrent.diagnostic.submitRejectReasons.underestimated>0);fs.mkdirSync('results/p7-24-integration',{recursive:true});fs.writeFileSync('results/p7-24-integration/entrophon-before.json',JSON.stringify(cheapCurrent,null,2)+'\n');console.log('PASS reproduced saved A silent: Current-derived reservation below encoded saved C11 demand');return}
  for(const lane of ['wave','keyboard']){
   const row=lane==='wave'?cheapCurrent:await page.evaluate(id=>__savedEntrophon.render(id,'keyboard'),ids.a);rows.push(...(lane==='wave'?[]:[row]));
   if(!row.results.some(r=>r.admitted))console.error(JSON.stringify(row,null,2));assert(row.results.some(r=>r.admitted),'saved A admitted after Current becomes cheap/disabled');assert(row.peak>.01,'real saved C11 WASM output has measurable nonzero PCM');assert(row.records.length>0);for(let i=0;i<row.records.length;i++)assert.equal(row.reservations[i],row.records[i].units,'selected definition reserves exact encoded demand');
   const stable=await page.evaluate(({id,lane})=>__savedEntrophon.render(id,lane,true),{id:ids.a,lane});comparisons.push({label:'Saved A after Current B / '+lane,difference:comparePCM(lane==='wave'?nativeA:nativeKeyboardA,stable,'Saved A after Current B / '+lane)});
  }
  const together=await page.evaluate(({a,c})=>__savedEntrophon.render([{id:a,lane:'wave'},{id:c,lane:'keyboard'}]),ids);rows.push(together);assert.deepEqual(together.selections.map(s=>s.definition),['Saved A','Saved C']);for(const [index,units] of [28,8].entries()){const selection=together.selections[index];assert(selection.results.length>0&&selection.results.every(r=>r.admitted),'independent '+selection.lane+' source admitted on shared C11 host');assert(selection.records.length>0&&selection.records.every(r=>r.units===units),'each source encodes its own saved cost')}assert.deepEqual(together.reservations,together.records.map(r=>r.units));assert(together.peak>.01&&together.diagnostic.kernelAccepted===together.records.length,JSON.stringify(together));
  // Reverse relative cost: Current is rich; cheap saved C remains its own sound.
  await page.evaluate(()=>__savedEntrophon.set('wave',{enabled:true,engineAmount:1,volume:1,unison:6,colorAmount:1,delayAmount:1,waveform:'sawtooth'}));
  const cheapSaved=await page.evaluate(id=>__savedEntrophon.render(id,'keyboard'),ids.c);rows.push(cheapSaved);assert(cheapSaved.peak>.01);for(let i=0;i<cheapSaved.records.length;i++)assert.equal(cheapSaved.reservations[i],cheapSaved.records[i].units,'cheap saved C must not overreserve Current demand');
  const stableC=await page.evaluate(id=>__savedEntrophon.render(id,'keyboard',true),ids.c);comparisons.push({label:'Saved C after rich Current',difference:comparePCM(nativeC,stableC,'Saved C after rich Current')});
  const currentConfig=await page.evaluate(()=>({...__savedEntrophon.current('wave')})),currentPCM=await page.evaluate(()=>__savedEntrophon.render('entrophon','wave',true));
  const current=await page.evaluate(()=>__savedEntrophon.render('entrophon','wave'));rows.push(current);assert(current.results.some(r=>r.admitted)&&current.peak>.01,'Current remains a working explicit choice');
  // The established live stale-reference contract follows the same library ID;
  // project-pinned exact revision resolution remains separate and immutable.
  const revised=await page.evaluate(ids=>{const a=__savedEntrophon,old=a.find(ids.a),project={entrophonInstruments:{[ids.a]:old}};a.set('wave',{unison:2,colorAmount:.2,delayAmount:0,waveform:'triangle'});const e=a.lib.save(a.capture('Saved A revision 2'),{id:ids.libraryId,expectedRevision:1});return {id:'entrophon:'+e.id+'@'+e.revision,live:a.resolve(ids.a).name,exact:a.find(ids.a),pinned:a.find(ids.a,project).name}},ids);
  assert.equal(revised.live,'Saved A revision 2');assert.equal(revised.exact,null);assert.equal(revised.pinned,'Saved A');
  const revisedRow=await page.evaluate(id=>__savedEntrophon.render(id,'wave'),ids.a);rows.push(revisedRow);assert(revisedRow.peak>.01);assert.equal(revisedRow.definition,'Saved A revision 2');
  await page.evaluate(config=>__savedEntrophon.set('wave',config),currentConfig);comparisons.push({label:'Current unchanged by saved-library edit',difference:comparePCM(currentPCM,await page.evaluate(()=>__savedEntrophon.render('entrophon','wave',true)),'Current after library edit')});
  await page.reload();await page.waitForFunction(()=>!!window.__savedEntrophon);await wave.selectOption(revised.id);await keyboard.selectOption(ids.c);const reloadA=await page.evaluate(id=>__savedEntrophon.render(id,'wave'),await wave.inputValue()),reloadC=await page.evaluate(id=>__savedEntrophon.render(id,'keyboard'),await keyboard.inputValue());rows.push(reloadA,reloadC);assert.equal(reloadA.definition,'Saved A revision 2');assert.equal(reloadC.definition,'Saved C');assert(reloadA.peak>.01&&reloadC.peak>.01);
  const missing=await page.evaluate(async()=>{const a=__savedEntrophon,id='entrophon:removed@1';return{definition:a.resolve(id),row:await a.render(id,'keyboard')}});assert.equal(missing.definition,null);assert.equal(missing.row.results.length,0);assert.equal(missing.row.peak,0,'missing saved sound must never become Current');
  assert.deepEqual(errors,[]);for(const row of rows)delete row.pcm;
  const output=arg('--results','results/p7-24-integration');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'entrophon-saved-live.json'),JSON.stringify({htmlFile,ids,revised,rows,comparisons,controls,errors,scope:'Native Chromium production Ixe/Exe/VW/twe -> real C11 host and WASM AudioWorklet PCM. Offline native WebAudio PCM and exact production voice plans compare same-lane saved sound identity; CI scheduled probe uses 60 ms future attacks to isolate admission from headless main-thread stalls; no audio-device or deadline claim.'},null,2)+'\n');
  console.log('PASS saved Entrophon Wave/Keyboard: selected definition admission and native C11 PCM independent of cheaper/dearer Current; exact costs, revision/project/reload and missing-source contracts');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
