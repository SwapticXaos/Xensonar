'use strict';
const fs=require('fs'),assert=require('assert/strict'),{chromium}=require('playwright'),{entry}=require('../source-manifest.json');
const html=fs.readFileSync(entry,'utf8').replace('const kEe=CEe("root");','window.__micState=()=>pe.getState();window.__micIntake=()=>E6e("spectral-forge3");const kEe=CEe("root");');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const report={errors:[],checks:[]};
 try{
  const context=await browser.newContext({permissions:['microphone'],viewport:{width:1490,height:1000}}),page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);window.__micStreams=[];navigator.mediaDevices.getUserMedia=async constraints=>{const stream=await original(constraints);__micStreams.push(stream);return stream;};window.__micRequest=navigator.mediaDevices.getUserMedia;});
  await page.route('https://xensonar.test/**',route=>route.fulfill({contentType:'text/html',body:html}));await page.goto('https://xensonar.test/microphone');
  await page.getByRole('button',{name:'II. MATERIAL FORGE',exact:true}).click();await page.getByRole('button',{name:/SpectralForge/}).click();
  const microphone=page.getByRole('button',{name:'Mikrofon aufnehmen',exact:true});await microphone.waitFor();
  await page.evaluate(()=>{const s=__micState(),g=s.spectralData;g.set(Math.floor(g.width*.4),Math.floor(g.height*.4),.7);s.triggerRender();});
  const before=await page.evaluate(()=>JSON.stringify(__micState().spectralData));
  await microphone.click();await page.getByRole('button',{name:'Mikrofonaufnahme stoppen und importieren',exact:true}).waitFor();assert(await page.getByRole('button',{name:'Import Audio',exact:true}).isDisabled());
  await page.waitForTimeout(1300);await page.getByRole('button',{name:'Mikrofonaufnahme stoppen und importieren',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-forge-microphone]')?.dataset.forgeMicrophone==='idle');
  assert.match(await page.locator('[data-forge-microphone]').innerText(),/Donor-Quelle geladen/);
  assert.equal(await page.evaluate(()=>JSON.stringify(__micState().spectralData)),before,'microphone source must not replace the authored composition');
  const source=await page.evaluate(()=>{const gateway=__micIntake();return gateway?.source?{name:gateway.source.label,duration:gateway.source.durationSec,samples:gateway.source.sourceAsset.monoSamples.length,peak:gateway.source.sourceAsset.monoSamples.reduce((peak,value)=>Math.max(peak,Math.abs(value)),0)}:null;});
  assert(source&&source.duration>.5&&source.samples>1000&&Number.isFinite(source.peak)&&source.peak>0,'native MediaRecorder capture must decode through the real file adapter');report.source=source;
  assert(await page.evaluate(()=>__micStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));report.checks.push('real Chromium microphone -> native MediaRecorder -> existing File decoder -> donor source; authored canvas preserved; tracks ended');
  await microphone.click();await page.getByRole('button',{name:'Mikrofonaufnahme stoppen und importieren',exact:true}).waitFor();await page.getByRole('button',{name:'Verwerfen',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-forge-microphone]').dataset.forgeMicrophone==='idle');
  assert.equal((await page.evaluate(()=>__micIntake().source.label)),source.name);assert(await page.evaluate(()=>__micStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));report.checks.push('discard retains prior donor and releases capture');
  await microphone.click();await page.getByRole('button',{name:'Mikrofonaufnahme stoppen und importieren',exact:true}).waitFor();await page.getByRole('button',{name:'I. XENSONAR MAIN ROOM',exact:true}).click();
  await page.waitForFunction(()=>__micStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));report.checks.push('room change releases active microphone');
  await page.getByRole('button',{name:'II. MATERIAL FORGE',exact:true}).click();await page.getByRole('button',{name:/SpectralForge/}).click();await microphone.waitFor();
  await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Permission denied','NotAllowedError');};});await microphone.click();await page.waitForFunction(()=>document.querySelector('[data-forge-microphone]').dataset.forgeMicrophone==='failed');assert.match(await page.locator('[data-forge-microphone]').innerText(),/berechtigung/);assert(await microphone.isEnabled());report.checks.push('permission rejection gives actionable error and allows retry');
  await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=__micRequest;});await microphone.click();await page.getByRole('button',{name:'Mikrofonaufnahme stoppen und importieren',exact:true}).waitFor();await page.getByRole('button',{name:'Verwerfen',exact:true}).click();await page.waitForFunction(()=>__micStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));report.checks.push('native capture can restart after permission error');
  for(const width of [1490,720]){await page.setViewportSize({width,height:1000});await microphone.scrollIntoViewIfNeeded();const box=await microphone.boundingBox();assert(box&&box.width>=80&&box.height>=25&&box.x>=0&&box.x+box.width<=width);}
  await page.screenshot({path:'results/microphone/intake.png'});assert.deepEqual(report.errors,[]);fs.writeFileSync('results/microphone/browser.json',JSON.stringify(report,null,2)+'\n');console.log('PASS native microphone import, discard, room cleanup, denied permission and responsive controls');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
