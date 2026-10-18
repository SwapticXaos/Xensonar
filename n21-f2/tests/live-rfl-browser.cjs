'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright'),h=require('./helpers/rfl-resident.cjs');
const s=h.sources(),input={processor:s.processor,preparation:s.preparation,tuning:{base:s.tuning('base'),fragment:s.tuning('fragment')}};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://xensonar.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Live RFL verification</title>'}));
  await page.goto('https://xensonar.test/rfl');
  const result=await page.evaluate(async s=>{
   const rows=[],url=code=>URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
   for(const rate of [44100,48000,96000])for(const mode of ['base','fragment'])for(const crop of [false,true]){
    const sourceRate=48000,n=24000,channels=[new Float32Array(n),new Float32Array(n)];
    for(let c=0;c<2;c++)for(let i=0;i<n;i++)channels[c][i]=crop?(i>=14400?.5:0):.15*Math.sin(2*Math.PI*110*i/sourceRate+c*.8);
    let map,pcm=channels;
    if(mode==='fragment'){
     const workerURL=url(s.preparation),worker=new Worker(workerURL,{type:'module'});URL.revokeObjectURL(workerURL);
     const copies=channels.map(c=>c.slice());
     const prepared=await new Promise((resolve,reject)=>{worker.onerror=e=>reject(Error(e.message));worker.onmessage=e=>e.data.type==='fault'?reject(Error(e.data.reason)):resolve(e.data);worker.postMessage({type:'prepare',channels:copies,sampleRate:sourceRate,sourceId:1,session:1,token:1,asset:'fixture'},copies.map(c=>c.buffer))});worker.terminate();
     map=prepared.map;pcm=prepared.channels;
    }
    const program={mode,transportAnchorSec:0,desiredLoopDurationSec:1,loopStartSec:crop?.05:0,loopEndSec:crop?.3:.5,
     stepSec:.026,windowSec:.076,rawTargetHz:220,entryRootHz:220,sessionAnchorHz:null,smoothedRootHz:null,tuning:s.tuning[mode]};
    const context=new OfflineAudioContext(3,Math.ceil(rate*1.5),rate);
    // Fixture schedules controls at audio-frame boundaries. DSP, maps, message
    // validation, planning and rendering are the actual production worklet.
    const wrapper=`const fixtureRegister=(name,P)=>registerProcessor(name,class extends P{
      constructor(options){super(options);this.fixture=options.processorOptions.fixture;this.controlIndex=0;
       const f=this.fixture;this.port.onmessage({data:{type:'load',channels:f.channels,sampleRate:f.sourceRate,map:f.map,session:1,asset:'fixture',token:1,sourceId:1}});
       this.port.onmessage({data:{type:'arm',program:f.program,sequence:1,firstWindowSec:.02,session:1,asset:'fixture',token:1,sourceId:1}});}
      process(inputs,outputs){const block=Math.floor(currentFrame/128);if(block%37===0){this.controlIndex++;this.port.onmessage({data:{type:'state',sequence:this.controlIndex+1,program:{...this.fixture.program,rawTargetHz:[220,880,110,330][this.controlIndex%4]},session:1,asset:'fixture',token:1,sourceId:1}});}return super.process(inputs,outputs);}
    });`;
    const moduleURL=url(wrapper+s.processor.replace(/\bregisterProcessor\(/g,'fixtureRegister('));await context.audioWorklet.addModule(moduleURL);URL.revokeObjectURL(moduleURL);
    const node=new AudioWorkletNode(context,'xensonar-raw-resident-v1',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{session:1,asset:'fixture',token:1,sourceId:1,fixture:{channels:pcm,sourceRate,map,program}}});
    const messages=[];node.port.onmessage=e=>messages.push(e.data);
    node.connect(context.destination);
    // An independent native primary lane must retain every PCM byte.
    const primary=context.createBuffer(1,Math.ceil(rate*1.5),rate),data=primary.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=.1*Math.sin(2*Math.PI*55*i/rate);
    const source=context.createBufferSource(),merger=context.createChannelMerger(3);source.buffer=primary;source.connect(merger,0,2);merger.connect(context.destination);source.start();
    const rendered=await context.startRendering();let peak=0,maxJump=0,last=0;
    for(let c=0;c<2;c++){last=0;const pcm=rendered.getChannelData(c);for(const x of pcm){if(!Number.isFinite(x))throw Error('nonfinite PCM');peak=Math.max(peak,Math.abs(x));maxJump=Math.max(maxJump,Math.abs(x-last));last=x;}}
    if(crop&&peak!==0)throw Error('excluded transient leaked: '+peak);if(!crop&&peak<.01)throw Error('RFL remained silent');
    const protectedPrimary=rendered.getChannelData(2).every((x,i)=>x===data[i]);if(!protectedPrimary)throw Error('primary lane PCM changed');
    if(messages.some(m=>m.type==='fault'))throw Error('production worklet fault');
    rows.push({rate,mode,crop,peak,maxJump,protectedPrimary,realWorker:mode==='fragment',realAudioWorklet:true});node.disconnect();merger.disconnect();
   }
   return {rows,scope:'Real Chromium AudioWorklet + fragment Web Worker; 12 root-change/crop/rate scenarios with exact protected primary PCM. Offline rendering does not establish target-device deadlines.'};
  },input);
  assert.deepEqual(errors,[]);fs.writeFileSync('results/live-stability/browser.json',JSON.stringify({...result,errors},null,2)+'\n');
  console.log('PASS real browser RFL:',JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
