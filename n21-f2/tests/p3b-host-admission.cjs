'use strict';
// Real ingress/gates/surface/player/DSP; only WebAudio graph and message ports
// are simulated. No physical audio deadline or device output is asserted.
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8'),probe=new Function(read('src/instruments/00_diagnostics.js')+';return __XenAudioProbe;')();
const state=read('src/runtime/01_instrument_state.js');
const makeGate=new Function('__XenAudioProbe',state.slice(0,state.indexOf('const lY'))+';return sY;')(probe);
const perf=read('src/runtime/instrument/04_performance_and_output_profiles.js');
const policy=new Function('__XenAudioProbe','fr',perf.slice(perf.indexOf('const Ate='),perf.indexOf(',Fte=!1'))+';return {Mte,kte,Ete};')(probe,()=>{});
let frame=48000,node,api;
class AudioNode{
 constructor(ctx,name,options){node=this;this.sent=[];this.throwNotes=false;let Processor;
  const host=this;class Base{constructor(){this.port={postMessage:data=>queueMicrotask(()=>host.port.onmessage?.({data}))};}}
  api.factory(api.kernel,(_,C)=>Processor=C,Base,48000,()=>frame);
  this.processor=new Processor({processorOptions:options.processorOptions});
  this.port={onmessage:null,postMessage:data=>{if(this.throwNotes&&data.type==='note')throw Error('simulated port failure');this.sent.push(data);queueMicrotask(()=>this.processor.port.onmessage({data}));},close(){this.onmessage=null;}};
 }
 connect(){}disconnect(){}
}
const nodal=['01_instrument_model','02_synthesis_kernel','07_sound_designer','04_audio_runtime','12_surface_runtime'].map(n=>read('src/nodal/'+n+'.js')).join('\n').replace('const __XenNodalSurfaces=createNodalSurfaceRuntime({library:__XenNodalLibrary,live:__XenNodalLive,model:__XenNodalModel});','');
api=new Function('__XenAudioProbe','jF','AudioWorkletNode',nodal+';return {model:__XenNodalModel,kernel:createNodalSynthesisKernel,live:__XenNodalLive,surface:createNodalSurfaceRuntime,factory:nodalWorkletProcessorFactory,starter:nodalOpenStarter};')(probe,async()=>{},AudioNode);
const ctx={state:'running',sampleRate:48000,audioWorklet:{},get currentTime(){return frame/48000;},addEventListener(){},removeEventListener(){}};
const runtime=policy.Mte({silentHotPathSources:{wave:true,particle:true}}),instrument=api.starter('hollow'),id='nodal:A@1',output={};
const surface=api.surface({library:{list:()=>[{id:'A',revision:1,instrument}]},live:api.live,model:api.model});
surface.configure({getContext:()=>ctx,ensureReady:async()=>ctx,getOutput:()=>output,prepareRoute:()=>({main:output}),acquire:lane=>{
 if(!runtime.canAdmitVoice(lane))return null;const ticket=runtime.admitVoice(runtime.beginEvent(lane,1,1),1);if(!ticket)return null;
 return{release:()=>runtime.releaseVoice(ticket)};
}});
function func(s,name,next){const a=s.indexOf('function '+name+'('),b=s.indexOf(next,a+10);assert(a>=0&&b>a);return s.slice(a,b);}
const wave=read('src/audio/05_live_voice_runtime.js'),shell=read('src/app/forge/01_room_shell.js');
const direct=new Function('__XenNodalSurfaces','$W','AL','xL',func(wave,'Ixe','function Exe')+';return Ixe;')(surface,()=>false,()=>{},()=>({targets:[],prefixes:[]}));
const dispatchOptions=new Function(func(wave,'Lxe','const Vq')+';return Lxe;')();
const gateBody=shell.slice(shell.indexOf('kc=')+3,shell.indexOf(',zo=',shell.indexOf('kc=')));
const waveBody=shell.slice(shell.indexOf('zo=')+3,shell.indexOf(',_h=',shell.indexOf('zo=')));
let gate=makeGate(),emitted=0;
const recorder=read('src/audio/03_recorder.js');
const DW=new Function('__XenAudioProbe','XA','LW','p1e','r8','h1e',func(recorder,'DW','const f1e=')+';return DW;')(probe,class{observe(){}snapshot(){return{}}},[],()=>({}),20,8);
const directInput=DW({getAudioFrame:()=>frame,emitDirectAttack:(hz,sector,opts)=>{emitted++;direct({runtime:{enabled:true},transientRuntime:runtime,resolvedDirect:{selection:{kind:'nodal',id},emitState:{playbackFreq:hz,volume:.2,waveGradient:{}}},options:dispatchOptions(opts),ctx,cursor:{},primeMyzelFromY(){},getWaveOutput:()=>output,fxTargets:{},fxRoutes:{}});}});
const ingress=new Function('Mh','eo','hl','Lr','i','fa','Fxe','Oh','tAe','Es','__XenAudioProbe','const kc='+gateBody+';const zo='+waveBody+';return {kc,zo};')(
 gate,{current:[]},{current:runtime},{current:ctx},ctx,{current:{enabled:true}},()=>false,
 ()=>directInput,()=>{throw Error('Unexpected alternate entry');},()=>({}),probe);
const backend=read('src/audio/entrophon/02_worklet_and_voice_backend.js');
const allowText=shell.match(/allowSecondaryStart:([\s\S]*?),getAudioCtx:/)?.[1];assert(allowText,'production particle ingress callback');
const allow=new Function('kc','return '+allowText)(ingress.kc);
const createParticle=new Function('P','__XenAudioProbe','__XenNodalSurfaces','MS','Ete','gwe','sk','ea','fr','Rwe','Cwe',
 'const ywe=5e-4;const Swe=()=>"particle-synth-tone";'+func(backend,'vwe','function zt')+func(backend,'qwe','function Qwe')+func(backend,'Qwe','const jb=')+';return Qwe;')(
 {useEffect(){},useMemo:fn=>fn()},probe,surface,()=>performance.now(),policy.Ete,()=>{},()=>{},()=>{},()=>{},()=>{},()=>[]);
const particle=createParticle({audioCtx:null,getAudioCtx:()=>ctx,allowSecondaryStart:allow,refucktorAudioGuardRef:{current:policy.kte()},particleRuntime:{getParticlePreset:()=>id,getParticleGradientX:()=>0,getParticleGradientY:()=>0,getParticleSampleProfileMode:()=>null},particleFx:{},particleAuxTargets:{getTransientDriveParticles(){},getPsychedelicSpiralParticles(){},getCollectiveMemoryParticles(){},getSchwarmdeuterParticles(){},getMyzelPostFxParticles(){}},ensureFinalMixBus:()=>output,transientRuntimeRef:{current:runtime}});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function pump(n){let nonzero=false;for(let b=0;b<n;b++){const out=Array.from({length:2},()=>[new Float32Array(128),new Float32Array(128)]);node.processor.process([],out);nonzero||=out.some(x=>x.some(ch=>ch.some(v=>Math.abs(v)>1e-7)));frame+=128;await flush();}return nonzero;}
const playParticle=()=>particle.playNexusAgentTone(220,.2);
(async()=>{
 await Promise.all([surface.select('wave',id),surface.select('particle',id)]);
 probe.start();for(let i=0;i<12;i++)playParticle();for(let i=0;i<10;i++)ingress.zo(330,false);
 await flush();assert(await pump(900),'real DSP emitted nonzero samples');
 let report=probe.stop(),requests=report.records.filter(r=>r.stage==='ingress');
 assert.equal(requests.length,22,'trace starts before the real gate32, not at the renderer');
 assert.equal(emitted,8);assert.equal(report.records.filter(r=>r.stage==='direct-input'&&r.reason==='admitted').length,8);
 assert.equal(report.records.filter(r=>r.stage==='gate32'&&r.reason!=='admitted').length,12);
 const accepted=report.records.filter(r=>r.stage==='worklet'&&r.reason==='accepted');assert.equal(accepted.length,9);
 for(const r of requests){const stages=report.records.filter(x=>x.eventId===r.eventId);assert(stages.some(x=>x.stage==='gate32'));if(stages.some(x=>x.reason==='accepted')){assert(stages.some(x=>x.reason==='submitted'));assert(stages.some(x=>x.reason==='ended'));}}
 assert.equal(runtime.getSnapshot().activeVoices,0);assert.equal(surface.snapshot().activeVoices,0);
 fs.writeFileSync('results/p3b-correlated-host-trace.json',JSON.stringify({scope:'Real production entry/gates/renderer with simulated ports; no physical audio',...report},null,2)+'\n');
 probe.start();for(let j=0;j<3;j++){if(j)await pump(15);playParticle();playParticle();await flush();}await flush();
 report=probe.read();assert.equal(report.records.filter(r=>r.stage==='worklet'&&r.reason==='accepted').length,6,'six rate32-admitted Nodal notes must reach the worklet while DSP headroom remains');assert.equal(report.records.filter(r=>r.stage==='gate160').length,0,'bounded Nodal ingress must not also spend Legacy rate160 credits');
 fs.writeFileSync('results/p3b-timely-density-trace.json',JSON.stringify({scope:'Six actual Qwe requests over 80ms with real gates/player/DSP and simulated ports; receipt is not physical output',...report},null,2)+'\n');
 assert(report.records.filter(r=>r.stage==='gate160').every(r=>r.eventId));await pump(900);
 // Saturate the actual player: existing held notes keep release/gliss ownership.
 const held=Array.from({length:9},()=>surface.note('particle',id,{frequency:220,gain:.2,held:true},ctx));assert(held.every(Boolean));await flush();
 const noteCount=node.sent.filter(m=>m.type==='note').length;
 assert.equal(surface.note('particle',id,{frequency:330,gain:.2},ctx),null,'a full host drops a new note immediately');
 assert.equal(node.sent.filter(m=>m.type==='note').length,noteCount);assert(!node.sent.some(m=>m.type==='retire'),'live surfaces preserve all tails');
 assert.equal(held[0].setFrequency(225),true,'gliss remains available at full budget');held[0].noteOff();await flush();await pump(900);
 assert.equal(surface.snapshot().activeVoices,8);assert.equal(node.sent.filter(m=>m.type==='note').length,noteCount,'freeing capacity never replays a dropped onset');
 surface.releaseHeld();await flush();await pump(900);assert.equal(runtime.getSnapshot().activeVoices,0);assert.equal(surface.snapshot().activeVoices,0);
 probe.start();node.processor.cost=16;playParticle();await flush();report=probe.read();node.processor.cost=0;
 assert(report.records.some(r=>r.reason==='rejected:voice capacity'&&r.eventId));assert.equal(runtime.getSnapshot().activeVoices,0,'worklet rejection releases exactly one ticket');
 frame+=1920;probe.start();node.throwNotes=true;assert.throws(playParticle,/simulated port failure/);node.throwNotes=false;report=probe.stop();
 assert.equal(report.records.filter(r=>r.reason==='submitted').length,0,'failed postMessage is not a submission');
 assert(report.records.some(r=>r.reason==='submit-error'&&r.eventId));assert.equal(runtime.getSnapshot().activeVoices,0);
 surface.dispose();console.log('PASS P3B actual host: six timely Nodal notes reach unchanged Worklet budget; early burst limit, late-stage rejection and ticket cleanup remain intact');
})().catch(error=>{surface.dispose();console.error(error);process.exitCode=1;});
