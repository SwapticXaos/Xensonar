'use strict';
// Actual embedded C11 renderer + actual resident controller, connected by a
// quantized MessagePort simulation. This is not a DOM/RAF or hardware test.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..');
const baseline=process.argv[2]?path.resolve(process.argv[2]):null;
const rate=48000,quantum=128;
function assets(dir){
 const backend=fs.readFileSync(path.join(dir,'src/audio/entrophon/02_worklet_and_voice_backend.js'),'utf8');
 const asset=fs.readFileSync(path.join(dir,'src/audio/entrophon/01_wasm_asset.js'),'utf8');
 return {code:JSON.parse(backend.match(/T8=("(?:\\.|[^"\\])*")/)[1]),
  wasm:Buffer.from(JSON.parse(asset.match(/jMe=("(?:\\.|[^"\\])*")/)[1]),'base64'),
  controller:fs.readFileSync(path.join(dir,'src/audio/hold_resident.js'),'utf8')};
}
function tone(freq,life,mask){
 const r=new Uint32Array(64),f=new Float32Array(r.buffer);r[0]=0x102;r[5]=6;r[6]=3;
 for(let k=0;k<6;k++)f[8+k]=freq*2**(k/19);
 for(let k=0;k<3;k++){f[14+k]=freq*(k+2);f[17+k]=.1;}
 f[20]=.12;f[21]=.06;r[22]=240;r[23]=1440;r[24]=Math.round((life-.08)*rate);r[25]=2880;r[26]=Math.round(life*rate);
 f[27]=1;f[29]=2000;f[30]=5000;f[31]=1200;r[32]=240;r[33]=2400;f[34]=.7;f[35]=.7;f[36]=.1;f[37]=330;f[38]=3.2;f[39]=.1;f[43]=1/6.3;r[44]=mask;return r;
}
const program=()=>[tone(62.13,1.11,1),tone(217.37,.96,6),tone(391.71,1.04,56)],offsets=[0,240,720];
async function processor(a){
 const box={sampleRate:rate,currentFrame:0,console,Uint32Array,Float32Array,Float64Array,Int16Array,Int32Array,Uint8Array,ArrayBuffer,WebAssembly,
  AudioWorkletProcessor:class{constructor(){this.port={postMessage(){},start(){}}}},registerProcessor(n,C){box.Processor=C}};
 vm.createContext(box);vm.runInContext(a.code,box);const h=new box.Processor({});
 await h.onMessage({type:'INIT',wasmBytes:a.wasm.buffer.slice(a.wasm.byteOffset,a.wasm.byteOffset+a.wasm.byteLength),profile:1,completionBatchVersion:1});
 assert(h.ready);await h.onMessage({type:'SET_MUTED',muted:false});return {box,h};
}
const output=()=>Array.from({length:9},()=>[new Float32Array(quantum),new Float32Array(quantum)]);
function copy(out,pcm,frame){for(let c=0;c<18;c++)pcm[c].set(out[c>>1][c&1],frame);}
async function single(a,frames){
 const {h,box}=await processor(a),out=output(),pcm=Array.from({length:18},()=>new Float32Array(frames));
 for(const [i,r] of program().entries()){r[1]=i+1;r[2]=h.bridge.epoch;r[3]=offsets[i];await h.onMessage({type:'HOT_TONE_PLAN',buffer:r.buffer});}
 for(let f=0;f<frames;f+=quantum){box.currentFrame=f;h.process([],out);copy(out,pcm,f);}
 assert.equal(h.kernelAccepted,3);h.bridge.destroy();return pcm;
}
async function run(a,steps,portQuanta,gallop,reference,releaseAt=null){
 const {h,box}=await processor(a),frames=reference[0].length,out=output(),pcm=Array.from({length:18},()=>new Float32Array(frames));
 const interval=rate*240/(108*steps),pattern=Array.from({length:steps},(_,i)=>gallop?[1,0,1,1,0][i%5]:1);
 let frame=0,serial=100,nextLive=1,fireFrame=null,readyFrame=null,prepFrames=0,maxPrepBlock=0,prepCalls=0,released=false;
 const messages=[],listeners=new Set(),starts=[],times=[];
 h.port.postMessage=m=>{if(m.type==='HOLD_READY')readyFrame=frame;messages.push({at:frame+portQuanta*quantum,dir:'ui',m});};
 const host={profile:1,epoch:h.bridge.epoch,canSubmit:true,node:{port:{
  addEventListener(t,fn){listeners.add(fn)},removeEventListener(t,fn){listeners.delete(fn)},
  postMessage(m){messages.push({at:frame+portQuanta*quantum,dir:'audio',m});if(m.type==='HOLD_FIRE')fireFrame=frame;}
 }}};
 const ui={performance:{now:()=>frame/rate*1000},queueMicrotask,Uint32Array,Map,Set};
 vm.createContext(ui);vm.runInContext(a.controller+'\nglobalThis.H=__XenHoldResident;',ui);
 const s=ui.H.session('test',{intervalMs:interval/rate*1000,startedAtMs:0,pulseCount:1},{state:'running',currentTime:0,sampleRate:rate},pattern,'fixture',62.13);
 const prepare=h.holdPrepareStems.bind(h);let preparing=null;
 h.holdPrepareStems=(...args)=>(preparing=prepare(...args).then(()=>{
  const p=args[0].prep;if(p){const render=p.pb.render.bind(p.pb);p.pb.render=n=>{prepCalls++;prepFrames+=n;maxPrepBlock=Math.max(maxPrepBlock,n);return render(n);};}
 }));
 const start=h.holdStartStems.bind(h);h.holdStartStems=(p,f)=>{starts.push({index:p.index-1,frame:f});return start(p,f);};
 async function live(index,capture){
  const records=program();
  for(const [i,r] of records.entries()){
   r[1]=++serial;r[2]=host.epoch;r[3]=Math.round(index*interval)+offsets[i];
   if(capture)ui.H.capture(s,host,r);
  }
  for(const r of records)await h.onMessage({type:'HOT_TONE_PLAN',buffer:r.buffer});
 }
 await live(0,true);await Promise.resolve();assert(s.sealed);
 for(frame=0;frame<frames;frame+=quantum){
  box.currentFrame=frame;
  if(releaseAt!==null&&!released&&frame>=releaseAt){ui.H.stopKey('test');released=true;}
  // One bounded delivery delay per direction; no zero-latency barrier shortcut.
  const due=messages.filter(x=>x.at<=frame);for(const x of due)messages.splice(messages.indexOf(x),1);
  for(const x of due){if(x.dir==='audio'){await h.onMessage(x.m);if(preparing){await preparing;preparing=null;}}
   else for(const fn of [...listeners])fn({data:x.m});}
  const nextAt=Math.round(nextLive*interval);
  if(!released&&nextAt<frame+quantum){s.mainIndex=nextLive+1;if(!s.armed&&pattern[nextLive%steps])await live(nextLive,false);nextLive++;}
  const begin=performance.now();h.process([],out);times.push(performance.now()-begin);copy(out,pcm,frame);
 }
 let error=0,energy=0;const expected=Array.from({length:18},()=>new Float32Array(frames));
 for(let k=0;Math.round(k*interval)<(releaseAt??frames);k++)if(pattern[k%steps]){
  const shift=Math.round(k*interval);for(let c=0;c<18;c++)for(let i=0;i<frames-shift;i++)expected[c][shift+i]+=reference[c][i];
 }
 for(let c=0;c<18;c++)for(let i=0;i<frames;i++){error=Math.max(error,Math.abs(pcm[c][i]-expected[c][i]));energy+=pcm[c][i]*pcm[c][i];}
 assert(energy>0);assert(fireFrame!==null);assert(maxPrepBlock<=128);assert(!h.holdPrefixUnderruns);assert(!h.holdTapOverflow);
 const indices=starts.map(x=>x.index);assert.equal(new Set(indices).size,indices.length,'no duplicate resident attacks');
 assert(starts.every(x=>x.frame===Math.round(x.index*interval)),'unchanged musical clock');
 times.sort((a,b)=>a-b);
 if(released){assert.equal(h.holdPreps.length,0,'tail producer eventually disposed');assert.equal(h.holdStemReaders.length,0,'no leaked tail readers');assert(starts.every(x=>x.frame<releaseAt),'no onset after key release');}
 const result={steps,portQuanta,gallop,releaseAt,readyMs:readyFrame/rate*1000,fireSentMs:fireFrame/rate*1000,
  firstResidentStep:starts[0]?.index,firstResidentMs:starts[0]?.frame/rate*1000,
  expectedSecondMs:interval/rate*1000,maxPCMError:error,prepCalls,prepFrames,maxPrepBlock,
  acceptedLiveRecords:h.kernelAccepted,missedResidentSteps:h.holdMissedSteps||0,
  startedResidentSteps:h.holdTapStarts||0,fullyRenderedResidentTails:h.holdCompleteSteps||0,
  processP99Ms:times[Math.floor(times.length*.99)],processMaxMs:times.at(-1)};
 ui.H.clear();h.bridge.destroy();return result;
}
(async()=>{
 const candidate=assets(root),frames=Math.ceil(rate*2.5/quantum)*quantum,reference=await single(candidate,frames),results=[];
 for(const [steps,portQuanta,gallop] of [[24,1,false],[27,1,false],[32,1,false],[27,3,true]]){
  const m2=await run(candidate,steps,portQuanta,gallop,reference);
  if(m2.maxPCMError>=2e-6)console.error(m2);
  assert(m2.maxPCMError<2e-6,`first-through-last original PCM parity: ${m2.maxPCMError}`);
  assert.equal(m2.firstResidentStep,gallop?2:1,'resident owns next active slot');
  assert.equal(m2.acceptedLiveRecords,3,'only the original first attack needs native live voices');
  assert.equal(m2.missedResidentSteps,0);results.push({candidate:m2});
  if(baseline){const m1=await run(assets(baseline),steps,portQuanta,gallop,reference);assert(m1.firstResidentStep>m2.firstResidentStep);assert.equal(m1.prepFrames,m2.prepFrames);assert.equal(m1.prepCalls,m2.prepCalls);results.at(-1).baseline=m1;}
 }
 const stopped=await run(candidate,32,1,false,reference,Math.round(rate*.12));
 assert(stopped.maxPCMError<2e-6,'key release retains complete original sounding tails');
 assert.equal(stopped.startedResidentSteps,1);assert.equal(stopped.fullyRenderedResidentTails,1);
 results.push({candidate:stopped,case:'release-during-prefix-production'});
 console.log(JSON.stringify({status:'GREEN',scope:'native C11 controller/worklet seam; complete explicit three-record fixture, no browser/RAF/cold-init deadline claim',results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
