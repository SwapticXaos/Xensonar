'use strict';
// Production host, processor, full DSP and microtonal pitches; only WebAudio
// graph/ports are bridged. No browser/device deadline claim.
const fs=require('fs'),assert=require('node:assert/strict'),read=p=>fs.readFileSync(p,'utf8');
let frame=0,api;const nodes=[];
class AudioNode{
 constructor(ctx,name,options){nodes.push(this);let Proc;const host=this;class Base{constructor(){this.port={postMessage:m=>queueMicrotask(()=>host.port.onmessage?.({data:m}))}}}
 api.factory(api.kernel,(_,C)=>Proc=C,Base,ctx.sampleRate,()=>frame);this.processor=new Proc({processorOptions:options.processorOptions});this.messages=[];
 this.port={onmessage:null,postMessage:m=>{this.messages.push(m);queueMicrotask(()=>this.processor.port.onmessage({data:structuredClone(m)}));},close(){this.onmessage=null;}};
 }connect(){}disconnect(){}
}
const source=read('src/instruments/07_pitch_preparation.js')+'\n'+['01_instrument_model','02_synthesis_kernel','07_sound_designer','04_audio_runtime','12_surface_runtime'].map(n=>read('src/nodal/'+n+'.js')).join('\n').replace('const __XenNodalSurfaces=createNodalSurfaceRuntime({library:__XenNodalLibrary,live:__XenNodalLive,model:__XenNodalModel});','');
api=new Function('jF','AudioWorkletNode',source+';return {model:__XenNodalModel,kernel:createNodalSynthesisKernel,live:__XenNodalLive,surface:createNodalSurfaceRuntime,factory:nodalWorkletProcessorFactory,starter:nodalOpenStarter,costs:nodalLivePlanCosts};')(async()=>{},AudioNode);
const flush=()=>new Promise(r=>setImmediate(r)),rows=[];
(async()=>{
 for(const rate of [48000,96000]){
  frame=rate;nodes.length=0;let issued=0,returned=0;
  const instrument=api.model.normalize(api.starter('hollow')),ctx={state:'running',sampleRate:rate,audioWorklet:{},get currentTime(){return frame/rate},addEventListener(){},removeEventListener(){}},out={};
  const acquire=()=>{issued++;let done=false;return {release(){assert(!done,'ticket released twice');done=true;returned++}}};
  const surface=api.surface({library:{list:()=>[{id:'test',revision:1,instrument}]},live:api.live,model:api.model}),id='nodal:test@1';
  surface.configure({getContext:()=>ctx,ensureReady:async()=>ctx,getOutput:()=>out,prepareRoute:()=>({main:out}),acquire});
  for(const lane of ['wave','keyboard','particle'])await surface.select(lane,id);
  const voices=['wave','keyboard','particle','particle'].map((lane,i)=>surface.note(lane,id,{frequency:173.137+i*21,held:i===3,durationSec:1,gain:.17,startSec:ctx.currentTime},ctx));assert(voices.every(Boolean));await flush();
  const host=nodes[0],output=Array.from({length:2},()=>[new Float32Array(128),new Float32Array(128)]);
  for(let b=0;b<8;b++){host.processor.process([],output);frame+=128;}
  assert(output[0][0].some(x=>x!==0));surface.releaseLive();surface.releaseLive();await flush();
  assert.equal(host.messages.filter(m=>m.type==='cut').length,3,'finite wave + keyboard and held particle, each once');
  for(let b=0;b<5;b++){host.processor.process([],output);frame+=128;await flush();}
  assert(output[0].every(c=>c.every(x=>x===0)),'manual lane must stop');assert(output[1][0].some(x=>x!==0),'ordinary particle continues');assert.equal(returned,3);
  // The next note can be cancelled before its first render, with no early fade/attack.
  const future=surface.note('wave',id,{frequency:217.731,durationSec:1,startSec:ctx.currentTime+.04},ctx);assert(future);surface.releaseLive();await flush();
  for(let b=0;b<30;b++){host.processor.process([],output);frame+=128;await flush();assert(output[0].every(c=>c.every(x=>x===0)));}
  assert.equal(returned,4);surface.dispose();await flush();assert.equal(issued,returned);
 }
 console.log('PASS N21 production Nodal DSP/ports: finite Wave/Keyboard + held-particle cuts, ordinary particle protected, no future phantom onset, idempotent tickets at 48/96 kHz');
 // Exercise the real asynchronous sample function and shared live-length fence.
 const control=read('src/runtime/instrument/10_entrophon_and_voice_control.js'),slice=control.slice(control.indexOf('const __XenLiveLengthRevisions'),control.indexOf('function ese('));
 const key=read('src/audio/05_live_voice_runtime.js'),sample=key.slice(key.indexOf('function J2('),key.indexOf('const mAe='));
 let resolveLoad,starts=0,releases=0,stops=0;
 const load=()=>new Promise(r=>resolveLoad=r),param=()=>({value:.1,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelAndHoldAtTime(){}});
 const node=()=>({gain:param(),frequency:param(),Q:param(),pan:param(),playbackRate:param(),connect(){},disconnect(){},start(){starts++},stop(){stops++}});
 const ctx={currentTime:1,createBufferSource:node,createBiquadFilter:node,createStereoPanner:node,createGain:node},tones={current:[]};
 const f=new Function('TF','MS','FF','vg',read('src/audio/05_sample_granular_hold.js')+'\n'+slice+'\n'+sample+';return {play:dAe,cut:__xenCutLiveScheduledTones};')(load,()=>1,()=>({fresh:true}),()=>({targetDurationSec:.5,playbackRate:1,shouldLoop:false}));
 const input={ctx,sampleId:'sample:test',baseFreq:220,volume:.2,output:{},activeScheduledTonesRef:tones,acquireVoice:()=>({release(){releases++}})};
 const pending=f.play(input);f.cut(ctx,tones.current);resolveLoad({buffer:{duration:1}});assert.equal(await pending,false);assert.equal(starts,0);assert.equal(releases,0,'cancel before admission acquires no ticket');
 const next=f.play(input);resolveLoad({buffer:{duration:1}});assert.equal(await next,true);assert.equal(starts,1);assert.equal(tones.current.length,1);f.cut(ctx,tones.current);assert.equal(stops,2,'natural stop plus earlier live cut');tones.current[0].osc.onended();assert.equal(tones.current.length,0);assert.equal(releases,1);
 console.log('PASS N21 sample loading: keyup invalidates pending load, no phantom late start, subsequent notes playable, tracked voice/ticket cleaned once');
})().catch(e=>{console.error(e);process.exitCode=1});
