'use strict';const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/runtime/instrument/03_selection_and_recording_tools.js','utf8');
const start=source.indexOf('function Fee(e){'),end=source.indexOf('function Tee(e){',start);
assert(start>=0&&end>start);
const create=new Function('aee','tee','Eee','hr','P','fr',source.slice(start,end)+';return Fee')(
 ()=>{},async()=>{},async()=>{},()=>{}, {useRef:()=>({}),useEffect:()=>{}},()=>{});
const ctx={state:'running'};let optionalStarted=false;
const deferred=new Promise(()=>{});
const deps={audioCtxRef:{current:ctx},audioCtx:ctx,setAudioCtx:()=>{},ensureFinalMixBus:()=>({}),getLiveMasterBus:()=>({}),
  audioWarmupPromiseRef:{current:null},audioWarmupDoneRef:{current:false},liveDeviceWarmups:[],applyRealtimeDroneOvertones:()=>{},
  isMyzelRequired:()=>false,getLiveSampleSelections:()=>[],prepareLiveSources:()=>{optionalStarted=true;return deferred;},waitForAudioCommit:async()=>{}};
(async()=>{
 const service=create(deps);
 const outcome=await Promise.race([service.prewarmAudioRuntime(ctx).then(()=>true),new Promise(r=>setTimeout(()=>r(false),50))]);
 assert.equal(outcome,true,'POWER must not await never-settling optional source');
 await new Promise(r=>setImmediate(r));assert.equal(optionalStarted,true);
 assert.equal(deps.audioWarmupDoneRef.current,true);
 console.log('PASS P1 POWER becomes ready despite never-resolving optional Nodal preparation');
})().catch(e=>{console.error(e);process.exitCode=1});
