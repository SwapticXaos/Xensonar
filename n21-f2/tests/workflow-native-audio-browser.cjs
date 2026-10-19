'use strict';
const fs=require('fs'),assert=require('assert/strict'),{chromium}=require('playwright'),{entry}=require('../source-manifest.json');
const option=(name,fallback)=>{const at=process.argv.indexOf(name);if(at<0)return fallback;if(!process.argv[at+1])throw Error('Missing '+name);return process.argv[at+1];};
const baselineHTML=option('--baseline-html','Xensonar_N21_F2_UI_Refinement_Test.html'),resultsDir=option('--results-dir','results/workflow-integrity');
const expose=`window.__workflowAudio={get api(){return{render:z$,normalise:$n,defaults:Vp,makeNote:pr,nodal:nodalOpenStarter,nodalV1:nodalStarter,entrophon:captureEntrophonInstrument,importSample:xee,wav:lg,field:()=>H5(H5(Yf(Dx(),'dynamic-fade'),'left',0),'right',-.6),customSave:typeof __mlSaveCustomInstrument==='function'?__mlSaveCustomInstrument:null,customStorage:typeof __mlCustomStorageKey==='string'?__mlCustomStorageKey:null}}};`;
async function run(page,html,custom){
  await page.route('https://xensonar.test/**',route=>route.fulfill({contentType:'text/html',body:html.replace('const kEe=CEe("root");',expose+'const kEe=CEe("root");')}));
  await page.goto('https://xensonar.test/native-workflow');await page.waitForFunction(()=>!!window.__workflowAudio?.api?.defaults);
  return page.evaluate(async custom=>{
    const api=__workflowAudio.api,rows=[];
    async function digest(buffer,keepPCM=false){const hashes=[];let peak=0,energy=0;for(let ch=0;ch<buffer.numberOfChannels;ch++){const pcm=buffer.getChannelData(ch);for(const v of pcm){if(!Number.isFinite(v))throw Error('Nonfinite PCM');peak=Math.max(peak,Math.abs(v));energy+=v*v;}hashes.push(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pcm.buffer.slice(pcm.byteOffset,pcm.byteOffset+pcm.byteLength)))).map(b=>b.toString(16).padStart(2,'0')).join(''));}return {channels:buffer.numberOfChannels,frames:buffer.length,hashes,peak,energy,...(keepPCM?{pcm:Array.from(buffer.getChannelData(0))}:{})};}
    const sampleBuffer=new AudioBuffer({numberOfChannels:1,length:24000,sampleRate:24000});sampleBuffer.getChannelData(0).set(Float32Array.from({length:24000},(_,i)=>.2*Math.sin(i*2*Math.PI*220/24000)));
    await api.importSample(api.wav(sampleBuffer),{replaceSampleId:'workflow-sine',name:'Workflow sine',baseHz:220,baseHzSource:'manual',durationSec:1});
    for(const kind of ['legacy','nodal-v1','nodal-v2','entrophon','sample']){
      const track={...api.defaults[0],enabled:true,volume:.4,pan:0,instrumentPreset:'subPulse'},raw={tracks:[track],notes:[],pitchSteps:[{id:'step-0',ratio:1,muted:false}],pitchLines:[{id:'line-0',hz:220}],baseHz:220,tuning:'ji',stepsPerBar:4,beatsPerBar:4,bars:1,zoom:1,scrollX:0,activeTrackIds:[track.id],selectedTrackId:track.id};
      if(kind.startsWith('nodal')){track.instrumentPreset='nodal:workflow@1';raw.nodalInstruments={[track.instrumentPreset]:kind==='nodal-v1'?api.nodalV1('glass'):{...api.nodal('hollow'),material:{...api.nodal('hollow').material,width:0}}};}
      if(kind==='entrophon'){track.instrumentPreset='entrophon:workflow@1';raw.entrophonInstruments={[track.instrumentPreset]:api.entrophon('Workflow captured wave')};}
      if(kind==='sample')track.instrumentPreset='sample:workflow-sine';
      raw.notes=[api.makeNote(raw,{id:'one',trackId:track.id,startUnit:0,durationUnits:1,channelIndex:0,velocity:.7,localField:api.field()})];
      const composer=api.normalise(raw),request={composer,trackIds:[track.id],bpm:240,bars:1},options={sampleRate:24000,tailSec:.02,excludeDrums:true};
      const ordinary=await digest(await api.render(request,options),kind==='sample');
      const row={kind,ordinary,repeat:await digest(await api.render(request,options),kind==='sample')};
      if(custom){
        const saved=api.customSave(composer,composer.notes[0],'Native '+kind,fn=>fn(composer));
        composer.tracks[0].instrumentPreset=saved.id;composer.notes[0].localField=null;
        const restored=api.normalise(JSON.parse(JSON.stringify(composer)));
        // Prove the project owns the recipe and captured body, not the library.
        localStorage.removeItem(api.customStorage);
        row.custom=await digest(await api.render({...request,composer:restored},options),kind==='sample');
      }
      rows.push(row);
    }
    return rows;
  },custom);
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});const errors=[];
 try{
  const beforePage=await browser.newPage();beforePage.on('pageerror',error=>errors.push(error.message));
  const before=await run(beforePage,fs.readFileSync(baselineHTML,'utf8'),false);await beforePage.close();
  const page=await browser.newPage();page.on('pageerror',error=>errors.push(error.message));
  const after=await run(page,fs.readFileSync(entry,'utf8'),true);
  const sampleComparisons=[];
  function sampleCompare(a,b,label){
   assert.equal(a.frames,b.frames);assert.equal(a.channels,b.channels);
   let max=0,squared=0;for(let i=0;i<a.pcm.length;i++){const d=Math.abs(a.pcm[i]-b.pcm[i]);max=Math.max(max,d);squared+=d*d;}
   // The prior build already varies between identical native sample renders.
   // Retain a strict absolute PCM ceiling (-140 dBFS) and record repeat controls.
   assert(max<=1e-7,label+' native sample deviation '+max);
   assert(Math.abs(a.energy-b.energy)<=Math.max(a.energy,b.energy)*1e-6,label+' sample energy');
   sampleComparisons.push({label,maxAbsPCM:max,rmsDifference:Math.sqrt(squared/a.frames)});
  }
  for(let i=0;i<before.length;i++){
   if(before[i].kind==='sample'){
    sampleCompare(before[i].repeat,before[i].ordinary,'previous build repeat control');
    sampleCompare(after[i].repeat,after[i].ordinary,'current build repeat control');
    sampleCompare(after[i].ordinary,before[i].ordinary,'previous/current');
    sampleCompare(after[i].custom,after[i].ordinary,'saved/reloaded custom');
    for(const row of [before[i],after[i]])for(const value of [row.ordinary,row.repeat,row.custom])if(value)delete value.pcm;
   }else{
    assert.deepEqual(after[i].ordinary,before[i].ordinary,'ordinary '+before[i].kind+' must retain exact native PCM');
    assert.deepEqual(after[i].custom,after[i].ordinary,'saved/reloaded '+after[i].kind+' must retain its source engine and exact PCM');
    assert.deepEqual(before[i].repeat,before[i].ordinary,'previous repeat '+before[i].kind);
   }
   assert(after[i].ordinary.peak>1e-4);
  }
  assert.deepEqual(errors,[]);fs.mkdirSync(resultsDir,{recursive:true});fs.writeFileSync(require('path').join(resultsDir,'native-audio.json'),JSON.stringify({before,after,sampleComparisons,errors},null,2)+'\n');
  console.log('PASS native PCM: previous/new ordinary outputs and saved/reloaded recipes exact for Legacy, Nodal V1/V2 and real Entrophon WASM; native sample differences below 1e-7 with prior/current repeat controls');
 }catch(error){console.error('Browser errors:',errors);throw error}finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
