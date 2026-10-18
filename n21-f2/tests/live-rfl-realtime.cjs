'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright'),h=require('./helpers/rfl-resident.cjs');
const s=h.sources(),input={processor:s.processor,tuning:s.tuning('base')};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://xensonar.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>RFL live load</title>'}));await page.goto('https://xensonar.test/live');
  const result=await page.evaluate(async s=>{
   const ctx=new AudioContext(),url=code=>URL.createObjectURL(new Blob([code],{type:'text/javascript'}));await ctx.resume();
   const productionURL=url(s.processor);await ctx.audioWorklet.addModule(productionURL);URL.revokeObjectURL(productionURL);
   const monitorURL=url(`class Meter extends AudioWorkletProcessor{
    constructor(){super();this.frames=0;this.primaryDropouts=0;this.nonfinite=0;this.rflPeak=0;this.jump=0;this.last=0;this.rflQuiet=0;
     this.port.onmessage=()=>this.port.postMessage({frames:this.frames,primaryDropouts:this.primaryDropouts,nonfinite:this.nonfinite,rflPeak:this.rflPeak,maxRflJump:this.jump,rflQuietFrames:this.rflQuiet});}
    process(inputs,outputs){const input=inputs[0],out=outputs[0];if(!input||input.length<3)return true;
     for(let c=0;c<out.length;c++)out[c].set(input[c]||input[0]);
     for(let i=0;i<input[0].length;i++){this.frames++;if(currentTime<.5){this.last=input[0][i];continue;}
      const r=input[0][i],p=input[2][i];if(!Number.isFinite(r)||!Number.isFinite(p))this.nonfinite++;
      if(Math.abs(p-.03)>.00001)this.primaryDropouts++;this.rflPeak=Math.max(this.rflPeak,Math.abs(r));this.jump=Math.max(this.jump,Math.abs(r-this.last));this.last=r;if(Math.abs(r)<1e-7)this.rflQuiet++;}
     return true;}}registerProcessor('live-rfl-meter',Meter);`);
   await ctx.audioWorklet.addModule(monitorURL);URL.revokeObjectURL(monitorURL);
   const node=new AudioWorkletNode(ctx,'xensonar-raw-resident-v1',{numberOfInputs:0,outputChannelCount:[2],processorOptions:{session:1,asset:'live',token:1,sourceId:1}});
   const faults=[],waiters=new Map();node.port.onmessage=e=>{const m=e.data;if(m.type==='fault')faults.push(m);waiters.get(m.type)?.(m)};
   const send=m=>node.port.postMessage({...m,session:1,asset:'live',token:1,sourceId:1});
   const ready=new Promise(r=>waiters.set('ready',r));send({type:'load',channels:[new Float32Array(24000).fill(.04)],sampleRate:48000});await ready;
   const program={mode:'base',transportAnchorSec:ctx.currentTime+.1,desiredLoopDurationSec:1,loopStartSec:0,loopEndSec:.5,stepSec:.026,windowSec:.076,rawTargetHz:220,entryRootHz:220,sessionAnchorHz:null,smoothedRootHz:null,tuning:s.tuning};
   const splitter=ctx.createChannelSplitter(2),merger=ctx.createChannelMerger(3),meter=new AudioWorkletNode(ctx,'live-rfl-meter',{outputChannelCount:[3]});
   node.connect(splitter);splitter.connect(merger,0,0);splitter.connect(merger,1,1);
   const primary=ctx.createConstantSource();primary.offset.value=.03;primary.connect(merger,0,2);primary.start();merger.connect(meter);meter.connect(ctx.destination);
   send({type:'arm',program,sequence:1,firstWindowSec:program.transportAnchorSec});
   let sequence=1,updates=0,stalls=0;const start=performance.now();
   for(let i=0;i<80;i++){
    for(let j=0;j<6;j++){send({type:'state',sequence:++sequence,program:{...program,rawTargetHz:[110,220,330,880][(i+j)%4]}});updates++;}
    if(i%20===10){const end=performance.now()+80;while(performance.now()<end){}stalls++;}
    await new Promise(r=>setTimeout(r,12));
   }
   await new Promise(r=>setTimeout(r,200));const metrics=await new Promise(r=>{meter.port.onmessage=e=>r(e.data);meter.port.postMessage('snapshot')});
   send({type:'stop'});primary.stop();await new Promise(r=>setTimeout(r,50));node.disconnect();meter.disconnect();await ctx.close();
   return {...metrics,rate:ctx.sampleRate,updates,mainThreadStalls:stalls,stallMs:80,elapsedMs:performance.now()-start,faults};
  },input);
  assert.deepEqual(errors,[]);assert.deepEqual(result.faults,[]);assert(result.frames>10000);assert.equal(result.primaryDropouts,0);assert.equal(result.nonfinite,0);assert(result.rflPeak>.01);assert(result.maxRflJump<.01,'constant source must remain free of abrupt root-change steps under load');
  fs.writeFileSync('results/live-stability/realtime.json',JSON.stringify({result,errors,scope:'Real Chromium AudioContext/AudioWorklets under 480 root messages and four intentional 80ms main-thread stalls; protects a simultaneous native primary lane. No physical-device xrun guarantee.'},null,2)+'\n');console.log('PASS real-time RFL load',JSON.stringify(result));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
