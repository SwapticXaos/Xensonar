'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright-core');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exe=process.env.XEN_CHROMIUM||'/workspace/scratch/49e69153c1ba/browser-runtime/chromium';
(async()=>{
 const browser=await chromium.launch({executablePath:exe,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('file://'+path.join(__dirname,'host.html'));
 await page.addScriptTag({content:read('src/quickrack/equalizer/eq-worklet.js')+'\n'+read('src/quickrack/equalizer/eq-core.js')+'\n'+read('src/audio/03_pcm_master_recorder.js')+'\nwindow.api={eq:__XenEQ,live:__XenEqLive,pcm:__xenCreateMasterPCMRecorder,wav:__xenRecorderFloatWav};'});
 const result=await page.evaluate(async()=>{
  const {eq,live,pcm,wav}=api,wait=ms=>new Promise(r=>setTimeout(r,ms)),out={};
  const rng=()=>{let x=7;return()=>{x=(Math.imul(x,1664525)+1013904223)|0;return (x>>>0)/4294967296-.5}};
  out.static=[];
  for(const rate of [44100,48000,96000])for(const bands of [4,12,24]){
   const n=16384,key='material:static-'+rate+'-'+bands;
   eq.set(key,{mode:'raster',bands,a:Array.from({length:360},(_,i)=>Math.sin(i/49)*.6)});
   const cfg=eq.get(key),plan=eq.livePlan(cfg,rate,key),signal=Float32Array.from({length:n},rng()).map(x=>x*.03);
   async function render(worklet){
    const ctx=new OfflineAudioContext(2,n,rate),buffer=ctx.createBuffer(2,n,rate);
    buffer.copyToChannel(signal,0);buffer.copyToChannel(Float32Array.from(signal,x=>-x*.73),1);
    const source=ctx.createBufferSource();source.buffer=buffer;let d;
    if(worklet){await live.prepare(ctx);d=live.create(ctx,plan,bands);source.connect(d.node);d.node.connect(ctx.destination)}
    else{d=eq.create(ctx,key);source.connect(d.input);d.output.connect(ctx.destination)}
    source.start();const b=await ctx.startRendering();d.dispose();return b;
   }
   const a=await render(false),b=await render(true);let max=0,error=0,power=0;
   for(let ch=0;ch<2;ch++)for(let i=0;i<n;i++){const x=a.getChannelData(ch)[i],y=b.getChannelData(ch)[i];max=Math.max(max,Math.abs(x-y));error+=(x-y)**2;power+=x*x;if(!Number.isFinite(y))throw Error('nonfinite static output')}
   out.static.push({rate,bands,maxError:max,relativeRms:Math.sqrt(error/power)});
  }
  // Real AudioContext: all sources coexist and draw while Float32 capture runs.
  const ctx=new AudioContext({sampleRate:48000,latencyHint:'interactive'});await ctx.resume();
  const keys=['material:stress','bass:stress','rootFollow:stress'],devices=[],osc=[];
  let nativeCreated=0,automations=0;
  const originalCreate=ctx.createBiquadFilter.bind(ctx);ctx.createBiquadFilter=()=>{nativeCreated++;const n=originalCreate();for(const p of [n.frequency,n.Q,n.gain]){const set=p.setTargetAtTime.bind(p);p.setTargetAtTime=(...a)=>{automations++;return set(...a)}}return n};
  const mix=ctx.createGain();mix.gain.value=.12;mix.connect(ctx.destination);
  for(let j=0;j<3;j++){
   eq.set(keys[j],{mode:'raster',bands:24,a:Array.from({length:360},(_,i)=>Math.sin(i/31+j)*.5)});
   const d=eq.create(ctx,keys[j]);d.output.connect(mix);devices.push(d);
   const o=ctx.createOscillator(),g=ctx.createGain();o.type=j===1?'sawtooth':'sine';o.frequency.value=[220,73,660][j];g.gain.value=.05;o.connect(g);g.connect(d.input);o.start();osc.push(o);
  }
  await wait(400);const before=eq.diagnostics(),createdBefore=nativeCreated,rampsBefore=automations;
  const rec=await pcm(ctx,null,mix);rec.start();
  const times=[];
  for(let frame=0;frame<150;frame++){
   const t=performance.now();
   for(let j=0;j<3;j++){
    eq.startGesture(keys[j]);eq.set(keys[j],{a:Array.from({length:360},(_,i)=>Math.sin(i/(20+frame%43)+frame*.08+j)*.5)});
   }
   eq.refresh();times.push(performance.now()-t);await wait(16);
  }
  keys.forEach(k=>eq.endGesture(k));await wait(250);
  const stopped=new Promise((resolve,reject)=>{rec.onstop=resolve;rec.onerror=e=>reject(e.error)});rec.stop();await stopped;
  const captured=await rec.toAudioBuffer(ctx),preview=rec.toWavBlob();const decoded=await ctx.decodeAudioData(await preview.arrayBuffer());
  let wavError=0,finite=true;
  for(let ch=0;ch<2;ch++)for(let i=0;i<captured.length;i++){const x=captured.getChannelData(ch)[i];finite=finite&&Number.isFinite(x);wavError=Math.max(wavError,Math.abs(x-decoded.getChannelData(ch)[i]))}
  out.live={before,after:eq.diagnostics(),nativeCreatedDuringGesture:nativeCreated-createdBefore,nativeRampsDuringGesture:automations-rampsBefore,controlMaxMs:Math.max(...times),captureFrames:captured.length,captureFinite:finite,wavError};
  rec.release();osc.forEach(o=>o.stop());devices.forEach(d=>d.dispose());await ctx.close();
  out.disposed=eq.diagnostics();
  // Exact Float32 transfer, including > full scale; no PCM16 clipping/quantization.
  const left=Float32Array.from({length:33011},(_,i)=>i%3===0?1.25:Math.sin(i*.173)*.9234567),right=Float32Array.from(left,(x,i)=>i%7===0?-1.5:-x*.37);
  const file=await wav(left,right,44100),bytes=await file.arrayBuffer(),v=new DataView(bytes);let exact=true;
  for(let i=0;i<left.length;i++)if(v.getFloat32(44+i*8,true)!==left[i]||v.getFloat32(48+i*8,true)!==right[i])exact=false;
  out.floatExport={exact,format:v.getUint16(20,true),bits:v.getUint16(34,true),size:bytes.byteLength};
  // Verify browser decode/play support of IEEE float WAV used for preview/import.
  const decodeCtx=new AudioContext({sampleRate:44100}),b=await decodeCtx.decodeAudioData(bytes.slice(0));
  out.floatExport.decodeExact=left.every((x,i)=>x===b.getChannelData(0)[i])&&right.every((x,i)=>x===b.getChannelData(1)[i]);await decodeCtx.close();
  const audio=new Audio(URL.createObjectURL(file));out.floatExport.canPlay=await new Promise((r,j)=>{audio.onloadedmetadata=()=>r(true);audio.onerror=()=>j(Error('Float WAV preview unsupported'));audio.load()});URL.revokeObjectURL(audio.src);
  return out;
 });
 assert.equal(errors.length,0,errors.join('\n'));
 for(const r of result.static){assert(r.maxError<.00002,JSON.stringify(r));assert(r.relativeRms<.001,JSON.stringify(r))}
 assert(result.live.before.live.every(d=>d.state==='worklet'),JSON.stringify(result.live.before));
 assert(result.live.after.live.every(d=>d.state==='worklet'&&d.processor?.nonfinite===0),JSON.stringify(result.live.after));
 assert.equal(result.live.nativeCreatedDuringGesture,0);assert.equal(result.live.nativeRampsDuringGesture,0);
 assert(result.live.captureFrames>48000);assert(result.live.captureFinite);assert.equal(result.live.wavError,0);
 assert.equal(result.disposed.devices,0);assert.equal(result.disposed.filters,0);
 assert(result.floatExport.exact&&result.floatExport.decodeExact&&result.floatExport.canPlay);assert.equal(result.floatExport.format,3);assert.equal(result.floatExport.bits,32);
 fs.writeFileSync(path.join(root,'tests/live2/browser-results.json'),JSON.stringify(result,null,2)+'\n');
 console.log('PASS real Chromium native/worklet stereo equivalence at 3 sample rates × 3 band counts; live 3-track redraw + Float32 capture; exact WAV/decode/preview; disposal.');
 console.log(JSON.stringify({staticWorst:Math.max(...result.static.map(x=>x.maxError)),live:result.live,floatExport:result.floatExport},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
