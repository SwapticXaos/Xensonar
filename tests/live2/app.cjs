'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright-core');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exe=process.env.XEN_CHROMIUM||'/workspace/scratch/49e69153c1ba/browser-runtime/chromium';
(async()=>{
 const b=await chromium.launch({executablePath:exe,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 const file=path.join(__dirname,'_instrument_probe.html');
 try{
 let html=read('dist/XenSonar_Standalone.html').replace('iY.createRoot(kEe).render','(window.__uvoRoot=iY.createRoot(kEe)).render');
 const probe=read('UVO1_TESTS/browser_probe.js')+'\nwindow.__Live2Test={start:fve,stop:hve,file:wve,pcm:__XenPcmCaptureStatus};';
 html=html.replace(/(<script type="module" crossorigin>)([\s\S]*?)(<\/script>)/,(m,a,s,c)=>a+s+'\n'+probe+'\n'+c);fs.writeFileSync(file,html);
 const p=await b.newPage({viewport:{width:1400,height:920}}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('file://'+file,{timeout:85000});await p.waitForFunction('window.__UVOTest&&window.__XenBoot?.state().ready',{timeout:65000});
 const report={boot:await p.evaluate('window.__XenBoot.state()')};
 console.log('PASS instrument file:// boot');
 for(const name of ['signal','wave','lifecycle']){
  report[name]=await p.evaluate('('+read('UVO1_TESTS/'+name+'_cases.js')+')("after")');console.log('Completed UVO '+name);
 }
 try{report.worklets=await p.evaluate('('+read('UVO1_TESTS/worklet_cases.js')+')("after")');console.log('Completed UVO worklet lanes')}catch(error){report.worklets={status:'FAILED-existing-immediate-trigger-probe',error:String(error)};console.log('UVO immediate-trigger probe failed; preserving detail in report')}
 report.bridge=await p.evaluate(async()=>{
  const T=__UVOTest,A=__Live2Test,live=await T.setupLive(),eq=XenSonarEQ,wait=ms=>new Promise(r=>setTimeout(r,ms));
  const key='material:uvo-combined';eq.set(key,{mode:'adaptive',bands:12,a:Array.from({length:360},(_,i)=>Math.sin(i/63)*.35)});
  const d=eq.create(live.ctx,key);live.out.disconnect(live.analyser);live.out.connect(d.input);d.output.connect(live.analyser);
  const state={current:null},chunks={current:[]},buffer={current:null},markers={current:[]},start={current:null},timer={current:null};
  let ui={},preview=null;
  const update=f=>{ui=typeof f==='function'?f(ui):f};
  const refs={ensureAudioReady:async()=>live.ctx,recordingSourceMode:'with_drums',lastRecordingSourceModeRef:{current:'with_drums'},
   ensureRecordingDestination:()=>({__xenPcmTap:d.output}),recordedBufferRef:buffer,recordingChunksRef:chunks,recordingStartAtRef:start,recordingMarkersRef:markers,
   setRecordingMarkers(){},setRecordingWaveform(){},setRecordingCrop(){},setRecordingCropDraft(){},setRecordingPlayheadMs(){},updateRecordingPreviewUrl:x=>preview=x,
   getSupportedRecordingMimeType:()=>'',mediaRecorderRef:state,setRecordingState:update,recordingStopTimerRef:timer,maxRecordingMs:30000,stopRecording:()=>{},discardedRecordersRef:{current:new WeakSet()}};
  try{
   await wait(400);await A.start(refs);
   if(!state.current?.__xenPcmCapture)throw Error('Product fve did not select Float32 PCM');
   for(let i=0;i<65;i++){
    if(i%5===0)live.particle(i%10===0?live.nodalId:'sample:uvo-live');
    if(i%7===0)live.wave('entrophon:factory:reiner-sinus@1','keyboard');
    if(i%11===0)live.wave(live.nodalId);
    eq.startGesture(key);eq.set(key,{morph:i%20/20,a:Array.from({length:360},(_,j)=>Math.sin(j/(40+i%17)+i*.06)*.4)});eq.refresh();await wait(16);
   }
   eq.endGesture(key);await wait(350);
   A.stop({recordingStopTimerRef:timer,mediaRecorderRef:state,setRecordingState:update});
   for(let i=0;i<200&&!buffer.current;i++)await wait(10);
   if(!buffer.current)throw Error('Recorder product onstop did not resolve: '+JSON.stringify(ui));
   const take=buffer.current,range={startMs:73,endMs:450};
   const {file}=await A.file({buffer:take,range,filenameBase:'live2-test',sourceMode:'with_drums'});
   const decoded=await live.ctx.decodeAudioData(await file.arrayBuffer());
   const previewBuffer=await live.ctx.decodeAudioData(await preview.arrayBuffer());
   const cropStart=Math.max(0,Math.floor(range.startMs*take.sampleRate/1000));let cropError=0,previewError=0;
   for(let ch=0;ch<2;ch++){
    for(let i=0;i<decoded.length;i++)cropError=Math.max(cropError,Math.abs(decoded.getChannelData(ch)[i]-take.getChannelData(ch)[cropStart+i]));
    for(let i=0;i<take.length;i++)previewError=Math.max(previewError,Math.abs(previewBuffer.getChannelData(ch)[i]-take.getChannelData(ch)[i]));
   }
   return {ui,frames:take.length,cropFrames:decoded.length,cropError,previewError,eq:eq.diagnostics(),pcm:{...A.pcm},voices:live.snapshot()};
  }finally{d.dispose();await live.close()}
 });
 assert.equal(errors.length,0,errors.join('\n'));
 for(const r of report.signal){assert.equal(r.activeAfter,0);assert.equal(r.created,r.disconnected)}
 assert.equal(report.signal[0].rms,0);assert.equal(report.signal[0].oscillators,0);
 for(const r of report.wave){assert.equal(r.activeAfter,0);assert.equal(r.created,r.disconnected)}
 for(const r of report.lifecycle)assert(r.pass!==false,JSON.stringify(r));
 for(const r of report.worklets.rows||[])assert.equal(r.activeAfter,0,JSON.stringify(r));
 assert.equal(report.bridge.cropError,0);assert.equal(report.bridge.previewError,0);
 assert(report.bridge.ui.exportMessage.includes('PCM Float32'));assert(report.bridge.frames>48000);
 assert(report.bridge.eq.live.some(d=>d.state==='worklet'));
 fs.writeFileSync(path.join(__dirname,'app-results.json'),JSON.stringify(report,null,2)+'\n');assert(!report.worklets.error,report.worklets.error);console.log('PASS complete instrument boot, UVO source/lifecycle offline tests, actual recorder start/stop, exact preview and Float32 Forge crop. UVO immediate-trigger probe status: '+(report.worklets.status||'PASS'));
 console.log(JSON.stringify({frames:report.bridge.frames,cropFrames:report.bridge.cropFrames,cropError:report.bridge.cropError,previewError:report.bridge.previewError,ui:report.bridge.ui,pcm:report.bridge.pcm},null,2));
 }finally{await b.close();fs.rmSync(file,{force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
