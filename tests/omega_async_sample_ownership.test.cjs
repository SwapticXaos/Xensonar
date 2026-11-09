'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/audio/entrophon/02_worklet_and_voice_backend.js'),'utf8');
const fn=(start,end)=>{const a=src.indexOf(start),b=src.indexOf(end,a+start.length);assert(a>=0&&b>a,`${start} boundary`);return src.slice(a,b)};
const code=fn('function __xenAsyncSampleOwned(', 'const Iwe=')+fn('async function Gwe(', 'function Hwe(');
let reply=null, acquireCount=0, lateCount=0, resolveSample;
const ctx={state:'running',currentTime:4};
const scope={Number,Math,Array,Map,Set,Float32Array,MS:()=>1000,TF:()=>new Promise(r=>{resolveSample=r}),
  FF:()=>({fresh:true}),ea:()=>lateCount++,Ws:(v,a,b)=>Math.max(a,Math.min(b,v)),
  y9:()=>({anchorHz:220}),vg:()=>({targetDurationSec:.25}),_1:(v,a,b)=>Math.max(a,Math.min(b,v)),window:{clearTimeout(){},setTimeout(){return 1}},
};
vm.createContext(scope);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/audio/lifecycle/00_voice_lease.js'),'utf8'),scope);vm.runInContext(code+'\nthis.sampleFuncs={Pwe,Gwe};',scope);
const pcm={buffer:{duration:.5},baseHz:220,playbackDurationSec:.25};
const instrument={sourceFenceId:'sample:A',getLiveParticlePreset:()=> 'sample:B',getLiveContext:()=>ctx,
  sampleId:'s1',ctx,rootFreq:220,baseFreq:220,targetHz:220,volume:.6,startTime:4,requestedAtMs:1000,
  output:{},auxTargets:[],acquireVoice:()=>{acquireCount++;return null;}};
(async()=>{
  const pending=scope.sampleFuncs.Pwe(instrument);
  resolveSample(pcm);
  assert.equal(await pending,false,'superseded PCM must never start');
  assert.equal(acquireCount,0,'no voice ticket may be acquired for superseded PCM');
  const elastic=scope.sampleFuncs.Gwe({...instrument,elasticPitchStable:true});
  resolveSample(pcm);
  assert.equal(await elastic,false,'superseded elastic PCM must never start');
  assert.equal(acquireCount,0,'no grain job/ticket for superseded PCM');

  // Source-intent guard must be cross-context as well, even if the selection ID
  // remains equal after a context rollover.
  const wrongCtx={...instrument,sourceFenceId:null,getLiveContext:()=>({state:'running'}),getLiveParticlePreset:()=> 'sample:A'};
  const stale=scope.sampleFuncs.Pwe(wrongCtx);resolveSample(pcm);
  assert.equal(await stale,false,'old AudioContext cannot instantiate fresh nodes');
  assert.equal(acquireCount,0,'stale contexts cannot reserve voice capacity');
  assert.equal(lateCount,0,'expected source changes are not reported as late audio underruns');
  const stillCurrent={...instrument,getLiveParticlePreset:()=> 'sample:A'};
  const good=scope.sampleFuncs.Pwe(stillCurrent);resolveSample(pcm);
  assert.equal(await good,false,'rejected ticket still prevents playback');
  assert.equal(acquireCount,1,'still-current source must reach ordinary voice admission');
  const unrelated={...instrument,sourceFenceId:null};
  const independent=scope.sampleFuncs.Pwe(unrelated);resolveSample(pcm);
  assert.equal(await independent,false);
  assert.equal(acquireCount,2,'independent per-agent/resident samples are not blocked by global source selection');

  // Exercise the actual renderer dispatcher: it must transport the current
  // selection identity to the sample owner, never invent a fence for an
  // explicitly independent per-agent sound or a resident hybrid.
  let delivered=null, deliveredPorts=null;
  const ingress={gwe(){},vwe:(_s,t)=>({allowed:true,volume:t.volume}),Rwe(){},Cwe:()=>[],
    xwe:()=>({synthPresetId:'legacy',axes:{},synthTonePlan:{},playbackRoute:{kind:'sample'}}),
    cwe:()=>({dispatchRequest:{sourceKind:'particle',presetRoute:{kind:'sample'}},bodyVoiceBudget:1,transientPlan:{}}),
    bwe(){},wwe:ports=>(deliveredPorts=ports),Wwe:(_ports,request)=>{delivered=request;},
    sk(){},Swe:()=>'',__XenAudioProbe:undefined,Math,Number};
  vm.createContext(ingress);
  vm.runInContext(fn('function qwe(', 'function Qwe(')+'\nthis.dispatch=qwe;',ingress);
  const inState={ctx,particlePreset:'sample:A',guardState:{},fx:{},
    getAuxTargets:()=>({}),getMainOutput:()=>({}),
    getLiveContext:()=>ctx,getLiveParticlePreset:()=> 'sample:A',
    beginTransientEvent(){},transientRuntime:{},recordAudioPressureCount(){},
    playScheduledTone(){},playNoiseAccent(){},triggerBodyExciter(){}};
  const inEvent={sourceKind:'particle',presetOverride:'sample:A',freq:220,volume:.4};
  ingress.dispatch(inState,inEvent);
  assert.equal(delivered.sourceFenceId,'sample:A','current global preset owns async particle sample');
  assert.equal(deliveredPorts.getLiveParticlePreset,inState.getLiveParticlePreset,'dispatcher passes live selection getter');
  assert.equal(deliveredPorts.getLiveContext,inState.getLiveContext,'dispatcher passes live context getter');
  ingress.dispatch(inState,{...inEvent,presetOverride:'sample:per-agent'});
  assert.equal(delivered.sourceFenceId,undefined,'independent per-agent override must not use global selection fence');
  ingress.dispatch(inState,{...inEvent,sourceKind:'resident'});
  assert.equal(delivered.sourceFenceId,undefined,'resident sample has a separate lifecycle');
  let pcmParams=null,elasticParams=null;
  const render={Pwe:p=>(pcmParams=p,Promise.resolve(true)),Gwe:p=>(elasticParams=p,Promise.resolve(false)),Math};
  vm.createContext(render);vm.runInContext(fn('function Wwe(', 'function qwe(')+'\nthis.route=Wwe;',render);
  const renderPorts={ctx,getLiveContext:()=>ctx,getLiveParticlePreset:()=> 'sample:A',getMainOutput:()=>({})};
  const renderReq={sourceKind:'particle',sourceFenceId:'sample:A',presetRoute:{kind:'sample',sampleId:'s1'},
    synthTonePlan:{sitarBias:0,psyBias:0,mainTones:[]},axes:{},transientPlan:{},freq:220,volume:.4};
  render.route(renderPorts,renderReq);
  assert.equal(pcmParams.sourceFenceId,'sample:A','raw PCM receives source fence');
  assert.equal(pcmParams.getLiveContext,renderPorts.getLiveContext,'raw PCM receives context fence');
  render.route(renderPorts,{...renderReq,sourceKind:'resident',sourceFenceId:undefined,presetRoute:{kind:'sample',sampleId:'s1',elasticPitchStable:true}});
  assert.equal(elasticParams.sourceFenceId,undefined,'elastic resident must retain its own source lifecycle');
  assert.equal(elasticParams.getLiveContext,renderPorts.getLiveContext,'elastic sample receives context fence');
  console.log('OMEGA ASYNC SAMPLE OWNERSHIP PASS: PCM + elastic stale source/context dropped before any AudioNodes');
})().catch(e=>{console.error(e);process.exitCode=1});
