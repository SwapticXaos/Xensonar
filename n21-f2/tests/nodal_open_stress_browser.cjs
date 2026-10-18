'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),manifest=require('../source-manifest.json'),report={checks:[],errors:[],metrics:{}};
(async()=>{let browser;try{
 browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),args:['--no-sandbox','--single-process','--no-zygote','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1490,height:1000}});page.on('pageerror',e=>report.errors.push(String(e)));
 await page.addInitScript(()=>{window.__stressMessages=[];const W=AudioWorkletNode;window.AudioWorkletNode=class extends W{constructor(...args){super(...args);if(args[1]!=='xensonar-nodal-instrument-v1')return;this.port.addEventListener('message',e=>__stressMessages.push(e.data));this.port.start();}};});
 await page.goto(pathToFileURL(path.join(root,manifest.entry)).href);await page.getByRole('button',{name:'III. NODAL INSTALLATION',exact:true}).click();await page.getByRole('button',{name:'Preview sound',exact:true}).click();await page.getByRole('button',{name:'Stop preview',exact:true}).waitFor();await page.getByRole('button',{name:'Stop preview',exact:true}).click();
 const result=await page.evaluate(async()=>{
  const {model,installation:bridge}=XenSonarNodalBackend,i=model.normalize(JSON.parse(localStorage.getItem('xensonar.nodal.sounddesigner.v1')).instrument),ctx=await bridge.ensureAudio();await bridge.prepareAudio(i);
  const analyser=ctx.createAnalyser();analyser.fftSize=2048;bridge.getOutput(ctx).connect(analyser);const wait=ms=>new Promise(r=>setTimeout(r,ms));let requested=0,admitted=0,outputPeak=0,invalidPreserved=false;
  const sample=()=>{const a=new Float32Array(2048);analyser.getFloatTimeDomainData(a);for(const v of a)outputPeak=Math.max(outputPeak,Math.abs(v));};
  for(let chord=0;chord<6;chord++){
    for(let j=0;j<8;j++){requested++;const h=bridge.noteOn(i,{frequency:220*Math.pow(1.013,j),durationSec:.03,velocity:.5},ctx.currentTime+.02);if(h)admitted++;}
    await wait(70);sample();await wait(50);
  }
  const errors=__stressMessages.filter(m=>m.type==='error'||m.type==='rejected');bridge.stop();await wait(120);const afterStop=bridge.status().audio;sample();
  const hold=bridge.noteOn(i,{frequency:220,held:true,velocity:.6},ctx.currentTime+.02);await wait(60);for(const f of [225.1,240.5,270.125,310.3,380.2,432.123]){hold.setFrequency(f);await wait(12);sample();}hold.noteOff();await wait(50);bridge.stop();await wait(100);
  const tail=new Float32Array(2048);analyser.getFloatTimeDomainData(tail);const finalPeak=tail.reduce((p,v)=>Math.max(p,Math.abs(v)),0);analyser.disconnect();
  return {requested,admitted,started:__stressMessages.filter(m=>m.type==='started').length,errors,outputPeak,afterStop,final:bridge.status().audio,finalPeak};
 });
 report.metrics=result;assert.equal(result.admitted,result.requested);assert.equal(result.requested,48);assert(result.outputPeak>.005);assert.deepEqual(result.errors,[]);assert.equal(result.afterStop.activeVoices,0);assert.equal(result.final.activeVoices,0);assert.equal(result.final.activeCost,0);assert(result.finalPeak<.0001);assert.deepEqual(report.errors,[]);
 report.checks.push('48 real Worklet notes in six full-capacity chords; spent tails retire without rejected fresh attacks','held microtonal glissando reaches real Worklet','Stop returns all shared tickets and final bus is quiet','no page or processor errors');console.log('PASS real Worklet retrigger stress and clean stop');
 }catch(e){report.failure=e.stack;console.error(e);process.exitCode=1;}finally{await browser?.close();fs.writeFileSync(path.join(root,'results/nodal_open_stress_browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}})();
