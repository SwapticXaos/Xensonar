'use strict';
// Real browser Worker and AudioWorklet, actual production V2/processor code.
// The fixture wrapper supplies deterministic control events, never DSP math.
const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const read=f=>fs.readFileSync(f,'utf8');
const sources={model:read('src/nodal/01_instrument_model.js'),kernel:read('src/nodal/02_synthesis_kernel.js'),old:read('tests/fixtures/p4c2_n6_baseline/02_synthesis_kernel.js'),starter:read('src/nodal/07_sound_designer.js'),preparation:read('src/nodal/03_preparation_worker.js'),runtime:read('src/nodal/04_audio_runtime.js')};
(async()=>{
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end('<!doctype html><title>N7 audio verification</title>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({...(process.env.XEN_CHROMIUM_PATH?{executablePath:process.env.XEN_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
  const report=await page.evaluate(async s=>{
   const api=new Function(s.model+'\n'+s.starter+'\n'+s.kernel+'\n'+s.preparation+';return {model:createNodalInstrumentModel,starter:nodalOpenStarter,kernel:createNodalSynthesisKernel,worker:nodalPrepareWorkerEntry};')();
   const processor=new Function(s.runtime.replace('const __XenNodalLive = createNodalLiveRuntime({model: __XenNodalModel, kernelFactory: createNodalSynthesisKernel});','')+';return nodalWorkletProcessorFactory;')();
   const baseline=new Function(s.old+';return createNodalSynthesisKernel;')(),rows=[];
   for(const rate of [48000,96000]){
    const raw=api.starter('reed'),instrument={...raw,nodes:Array.from({length:7},(_,i)=>({...raw.nodes[i%3],id:'node'+i,ratio:1+i*.137,excitationKind:['breath','impulse','tone'][i%3]}))};
    const workerURL=URL.createObjectURL(new Blob(['('+api.worker.toString()+')('+api.model.toString()+','+api.kernel.toString()+');'],{type:'text/javascript'}));
    const worker=new Worker(workerURL);URL.revokeObjectURL(workerURL);
    const result=await new Promise((resolve,reject)=>{worker.onmessage=e=>e.data.error?reject(Error(e.data.error)):resolve(e.data);worker.onerror=e=>reject(Error(e.message));worker.postMessage({type:'prepare',id:1,instrument,sampleRate:rate,contours:{volumeCurve:null,pitchCurve:null}})});worker.terminate();
    if(!result.prepared.template.rateLaws)throw Error('Worker must prepare session excitation laws');
    const options=[{frequency:173.137,gain:.25,velocity:.8,held:true,seed:instrument.seed},{frequency:237.137,gain:.19,velocity:.8,held:true,seed:instrument.seed},{frequency:317.731,gain:.17,velocity:.8,held:true,seed:71371}];
    const ctx=new OfflineAudioContext(4,16384,rate);
    const wrap=`const fixtureRegister=(name,P)=>{class Fixture extends P{constructor(options){super(options);const f=options.processorOptions.fixture;this.port.onmessage({data:{type:'plan',id:'p',plan:f.plan,prepared:f.prepared}});this.port.onmessage({data:{type:'placement',state:{'particle:0':-1,'particle:1':1}}});for(let i=0;i<f.options.length;i++)this.port.onmessage({data:{type:'note',id:'v'+i,planId:'p',startSec:0,lane:i?'particle':'wave',mixLane:i?'particle':'wave',agentIndex:i?i-1:null,options:f.options[i]}})}process(inputs,outputs){if(currentFrame===1536)for(let i=0;i<3;i++)this.port.onmessage({data:{type:'frequency',id:'v'+i,frequency:350.731+i*71.137}});if(currentFrame===4096)for(let i=0;i<3;i++)this.port.onmessage({data:{type:'release',id:'v'+i}});return super.process(inputs,outputs)}}registerProcessor(name,Fixture)};`;
    const source=wrap+'('+processor.toString()+')('+api.kernel.toString()+',fixtureRegister,AudioWorkletProcessor,sampleRate,()=>currentFrame);';
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));await ctx.audioWorklet.addModule(url);URL.revokeObjectURL(url);
    const node=new AudioWorkletNode(ctx,'xensonar-nodal-instrument-v1',{numberOfInputs:0,numberOfOutputs:2,outputChannelCount:[2,2],processorOptions:{maxCost:16,maxVoices:8,tailCostScale:.75,separateLanes:true,fixture:{plan:result.plan,prepared:result.prepared,options}}});
    const merger=ctx.createChannelMerger(4),splitters=[ctx.createChannelSplitter(2),ctx.createChannelSplitter(2)];
    for(let lane=0;lane<2;lane++){node.connect(splitters[lane],lane);for(let ch=0;ch<2;ch++)splitters[lane].connect(merger,ch,lane*2+ch)}merger.connect(ctx.destination);
    const rendered=await ctx.startRendering(),expected=Array.from({length:4},()=>new Float32Array(16384)),reference=baseline();reference.installPrepared(result.plan,result.prepared,rate);
    const voices=options.map(o=>reference.voice(result.plan,o,rate)),buffers=Array.from({length:6},()=>new Float32Array(128));
    for(let frame=0;frame<16384;frame+=128){
     if(frame===1536)voices.forEach((v,i)=>v.setFrequency(350.731+i*71.137));if(frame===4096)voices.forEach(v=>v.noteOff());
     for(let i=0;i<3;i++)voices[i].process(buffers[i*2],buffers[i*2+1]);
     for(let j=0;j<128;j++){expected[0][frame+j]=buffers[0][j];expected[1][frame+j]=buffers[1][j];expected[2][frame+j]=buffers[2][j]+buffers[3][j];expected[3][frame+j]=buffers[4][j]+buffers[5][j];}
    }
    let peak=0,error=0,energy=0;for(let ch=0;ch<4;ch++){const actual=rendered.getChannelData(ch);for(let i=0;i<actual.length;i++){error=Math.max(error,Math.abs(actual[i]-expected[ch][i]));peak=Math.max(peak,Math.abs(actual[i]));energy+=Math.abs(actual[i]);}}
    if(error>1e-6||energy===0)throw Error('Real worklet PCM mismatch '+rate+': '+error+' / '+energy);
    rows.push({rate,frames:16384,channels:4,peak,maxError:error,workerPrepared:true,simultaneousVoices:3,glissFrame:1536,releaseFrame:4096});
    node.disconnect();merger.disconnect();
   }
   return {rows,scope:'Real Chromium Web Worker preparation and OfflineAudioContext AudioWorklet; four isolated output channels against unchanged N6 DSP; no device deadline/burst-free claim'};
  },sources);
  assert.deepEqual(errors,[]);fs.writeFileSync('results/p4c2-n7-worklet-browser.json',JSON.stringify({...report,errors},null,2)+'\n');console.log('PASS N7 real browser Worker + AudioWorklet: 48/96 kHz, 3 voices, gliss, release, separate lanes and particle placement match N6; max errors '+report.rows.map(x=>x.maxError).join(', '));
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
