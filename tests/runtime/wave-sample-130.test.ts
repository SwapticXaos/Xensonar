import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playWaveStarterSample } from '../../src/features/soundLibrary/waveStarterSamplePlayback';
import { createTransientRuntime } from '../../src/features/resonance/transientRuntime';
import { previewWaveStarterPresetSelection } from '../../src/features/soundLibrary/presetPreviewActions';
import { createWaveStarterLaneRuntime } from '../../src/features/xensonar/audio/waveStarterLaneRuntime';
import { invalidateLiveMelodicSampleCache, loadLiveMelodicSampleBuffer } from '../../src/features/soundLibrary/liveMelodicSampleLoad';
const library = require('../../src/features/l3lab/canonicalForge/melodicSampleLibrary');
const loaded = {buffer:{duration:1},baseHz:220,tempoPitchLinked:true};
class Param { setValueAtTime(){} linearRampToValueAtTime(){} exponentialRampToValueAtTime(){} }
class Node {
 gain=new Param(); frequency=new Param(); Q=new Param(); pan=new Param(); playbackRate=new Param();
 onended?:()=>void; disconnected=false; connect(){} disconnect(){this.disconnected=true;} start(){} stop(){}
}
function context(fail=false) {
 const nodes:Node[]=[];
 const make=()=>{const n=new Node();nodes.push(n);return n;};
 const ctx={state:'running',currentTime:0,createBufferSource:make,createGain:make,createBiquadFilter:()=>{if(fail)throw Error('construction failure');return make();},createStereoPanner:make};
 return {ctx:ctx as any,nodes};
}
function args(ctx:any, acquireVoice?:any) {return {ctx,sampleId:'a',baseFreq:220,volume:.2,output:new Node() as any,acquireVoice};}
test('cold simultaneous hits share preparation but never replay; ready hits obey admission',async()=>{
 invalidateLiveMelodicSampleCache('a');
 let resolve:any,loads=0; const previous=library.loadMelodicSampleBuffer;
 library.loadMelodicSampleBuffer=()=>{loads++;return new Promise(r=>resolve=r);};
 const {ctx,nodes}=context(); let active=0,released=0;
 const acquire=()=>{if(active===2)return null;active++;return {gainScale:1,auxTargets:[],release:()=>{active--;released++;}};};
 try{
 const tasks=Array.from({length:12},()=>playWaveStarterSample(args(ctx,acquire)));
 const coldResults=await Promise.all(tasks);assert.equal(coldResults.filter(Boolean).length,0);assert.equal(loads,1);assert.equal(nodes.length,0);assert.equal(active,0);
 const preparation=loadLiveMelodicSampleBuffer('a',ctx);resolve(loaded);await preparation;
 const results=await Promise.all(Array.from({length:12},()=>playWaveStarterSample(args(ctx,acquire))));assert.equal(results.filter(Boolean).length,2);assert.equal(nodes.length,10);
 nodes[0].onended!();nodes[0].onended!();nodes[5].onended!();assert.equal(active,0);assert.equal(released,2);
 }finally{library.loadMelodicSampleBuffer=previous;}
});
test('audio-clock-stale ready attacks never catch up and never acquire a voice',async()=>{
 invalidateLiveMelodicSampleCache('a');
 const previous=library.loadMelodicSampleBuffer;
 library.loadMelodicSampleBuffer=async()=>loaded;const {ctx,nodes}=context();let acquired=0;
 try{await loadLiveMelodicSampleBuffer('a',ctx);const p=playWaveStarterSample(args(ctx,()=>{acquired++;return null;}));ctx.currentTime=.2;assert.equal(await p,false);assert.equal(acquired,0);assert.equal(nodes.length,0);}finally{library.loadMelodicSampleBuffer=previous;}
});
test('partial graph failure releases reservation and disconnects constructed nodes',async()=>{
 invalidateLiveMelodicSampleCache('a');
 const previous=library.loadMelodicSampleBuffer;library.loadMelodicSampleBuffer=async()=>loaded;
 const {ctx,nodes}=context(true);let released=0;
 try{await loadLiveMelodicSampleBuffer('a',ctx);assert.equal(await playWaveStarterSample(args(ctx,()=>({gainScale:1,auxTargets:[],release:()=>released++}))),false);assert.equal(released,1);assert.ok(nodes.every(n=>n.disconnected));}finally{library.loadMelodicSampleBuffer=previous;}
});
test('real transient runtime accounts sample lifetime and recovers capacity',async()=>{
 invalidateLiveMelodicSampleCache('a');
 const previous=library.loadMelodicSampleBuffer;library.loadMelodicSampleBuffer=async()=>loaded;
 const runtime=createTransientRuntime({silentHotPathSources:{wave:true}});const {ctx,nodes}=context();
 try{await loadLiveMelodicSampleBuffer('a',ctx);assert.equal(await playWaveStarterSample(args(ctx,()=>{const ticket=runtime.admitVoice(runtime.beginEvent('wave',1,.2),1)!;return {gainScale:ticket.plan.gainScale,auxTargets:[],release:()=>runtime.releaseVoice(ticket)};})),true);assert.equal(runtime.getSnapshot().bySource.wave,1);nodes[0].onended!();assert.equal(runtime.getSnapshot().bySource.wave,0);}finally{library.loadMelodicSampleBuffer=previous;}
});
test('request timestamp includes synchronous routing work before sample loading',async()=>{
 invalidateLiveMelodicSampleCache('a');
 const previous=library.loadMelodicSampleBuffer;library.loadMelodicSampleBuffer=async()=>loaded;const {ctx,nodes}=context();
 try{await loadLiveMelodicSampleBuffer('a',ctx);assert.equal(await playWaveStarterSample({...args(ctx),requestedAtMs:performance.now()-60}),false);assert.equal(nodes.length,0);}finally{library.loadMelodicSampleBuffer=previous;}
});
test('suspended audio never plays a deferred gesture',async()=>{
 invalidateLiveMelodicSampleCache('a');
 const previous=library.loadMelodicSampleBuffer;library.loadMelodicSampleBuffer=async()=>loaded;const {ctx,nodes}=context();
 try{await loadLiveMelodicSampleBuffer('a',ctx);ctx.state='suspended';assert.equal(await playWaveStarterSample(args(ctx)),false);assert.equal(nodes.length,0);}finally{library.loadMelodicSampleBuffer=previous;}
});
test('modern lane preserves the original request clock on immediate emission',()=>{
 const emitted:any[]=[];
 const runtime=createWaveStarterLaneRuntime({getPressureBias:()=>0,getActiveScheduledToneCount:()=>0,getPolicy:()=>undefined,emitAttack:(_freq,_sector,options)=>emitted.push(options),recordAdaptiveAction:()=>{},nowMs:()=>999});
 runtime.request(220,false,{requestedAtMs:123});
 assert.equal(emitted.length,1);assert.equal(emitted[0].requestedAtMs,123);
 runtime.dispose();
});
test('sample preview waits for decoded material and a newer selection cancels its late preview',async()=>{
 invalidateLiveMelodicSampleCache('preview-a');
 const previous=library.loadMelodicSampleBuffer;let resolve:any;let loads=0;
 library.loadMelodicSampleBuffer=()=>{loads++;return new Promise(r=>resolve=r);};
 const {ctx}=context();const waveSoundRuntimeRef={current:{enabled:true,volume:.2,preset:'sample:preview-a'}};const nexusParamsRef={current:{waveOvertonesEnabled:true}};const queueRef={current:[] as any[]};const played:string[]=[];
 const common={initAudio:async()=>ctx as any,waveSoundRuntimeRef,nexusParamsRef,waveOvertoneArpQueueRef:queueRef,playWaveStartSound:()=>played.push(waveSoundRuntimeRef.current.preset)};
 try{
  const oldPreview=previewWaveStarterPresetSelection({...common,selectionId:'sample:preview-a'});
  await Promise.resolve();assert.equal(loads,1);
  const currentPreview=previewWaveStarterPresetSelection({...common,selectionId:'glass_ping'});
  await currentPreview;assert.deepEqual(played,['glass_ping']);
  resolve(loaded);await oldPreview;assert.deepEqual(played,['glass_ping']);
 }finally{library.loadMelodicSampleBuffer=previous;}
});
test('ready live profile bypasses later canonical metadata latency until invalidated',async()=>{
 const previous=library.loadMelodicSampleBuffer;const {ctx}=context();let calls=0;invalidateLiveMelodicSampleCache('ready');
 library.loadMelodicSampleBuffer=async()=>{calls++;return loaded;};
 try{assert.ok(await loadLiveMelodicSampleBuffer('ready',ctx));library.loadMelodicSampleBuffer=()=>new Promise(()=>{});assert.ok(await loadLiveMelodicSampleBuffer('ready',ctx));assert.equal(calls,1);invalidateLiveMelodicSampleCache('ready');}finally{library.loadMelodicSampleBuffer=previous;}
});
test('whole-library invalidation cannot resurrect a stale in-flight decode',async()=>{
 const previous=library.loadMelodicSampleBuffer;const {ctx}=context();let resolveOld:any;let calls=0;
 const oldLoaded={...loaded,baseHz:110};const currentLoaded={...loaded,baseHz:330};
 invalidateLiveMelodicSampleCache('global-pending');
 library.loadMelodicSampleBuffer=()=>{calls++;return calls===1?new Promise(resolve=>{resolveOld=resolve;}):Promise.resolve(currentLoaded);};
 try{
  const oldPreparation=loadLiveMelodicSampleBuffer('global-pending',ctx);await Promise.resolve();assert.equal(calls,1);
  invalidateLiveMelodicSampleCache();
  const currentPreparation=loadLiveMelodicSampleBuffer('global-pending',ctx);assert.equal(calls,2);
  resolveOld(oldLoaded);assert.equal((await oldPreparation)?.baseHz,110);assert.equal((await currentPreparation)?.baseHz,330);
  assert.equal((await loadLiveMelodicSampleBuffer('global-pending',ctx))?.baseHz,330);assert.equal(calls,2);
 }finally{library.loadMelodicSampleBuffer=previous;invalidateLiveMelodicSampleCache('global-pending');}
});
