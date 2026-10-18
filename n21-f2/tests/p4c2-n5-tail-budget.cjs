'use strict';
// Real surface + host accounting + processor + unchanged V2 DSP. Only ports and
// WebAudio graph objects are bridged; actual browser deadlines are not claimed.
const fs=require('node:fs'),assert=require('node:assert/strict'),read=p=>fs.readFileSync(p,'utf8');
const sources=['01_instrument_model','02_synthesis_kernel','07_sound_designer','04_audio_runtime','12_surface_runtime'].map(n=>read('src/nodal/'+n+'.js')).join('\n').replace('const __XenNodalSurfaces=createNodalSurfaceRuntime({library:__XenNodalLibrary,live:__XenNodalLive,model:__XenNodalModel});','');
let frame=0,api,node;
class AudioNode{
 constructor(ctx,name,opts){node=this;let Processor;const host=this;class Base{constructor(){this.port={postMessage:data=>queueMicrotask(()=>host.port.onmessage?.({data}))}}}
 api.factory(api.kernel,(_,C)=>Processor=C,Base,ctx.sampleRate,()=>frame);this.processor=new Processor({processorOptions:opts.processorOptions});this.messages=[];
 this.port={onmessage:null,postMessage:data=>{this.messages.push(data);queueMicrotask(()=>this.processor.port.onmessage({data}))},close(){}};
 }connect(){}disconnect(){}
}
api=new Function('jF','AudioWorkletNode',sources+';return {model:__XenNodalModel,live:__XenNodalLive,surface:createNodalSurfaceRuntime,factory:nodalWorkletProcessorFactory,kernel:createNodalSynthesisKernel,starter:nodalOpenStarter};')(async()=>{},AudioNode);
const flush=()=>new Promise(r=>setImmediate(r));
(async()=>{
 for(const rate of [48000,96000]){
 frame=rate;let live=0,issued=0,returned=0;
 const instrument=api.starter('prism'),id='nodal:P@1',ctx={state:'running',sampleRate:rate,audioWorklet:{},get currentTime(){return frame/rate},addEventListener(){},removeEventListener(){}},out={};
 const surface=api.surface({library:{list:()=>[{id:'P',revision:1,instrument}]},live:api.live,model:api.model});
 surface.configure({getContext:()=>ctx,ensureReady:async()=>ctx,getOutput:()=>out,prepareRoute:()=>({main:out}),acquire(){live++;issued++;return{release(){live--;returned++}}}});
 try{
 await surface.select('wave',id);
 assert.equal(node.processor.tailScale,.75,'Only the validated, dry-ended natural tail gets a 25% cost discount');
 const fullCost=2*Math.max(1,rate/48000),initial=Math.floor(16/fullCost),voices=[];
 for(let i=0;i<initial;i++)voices.push(surface.note('wave',id,{frequency:220+i*17.137,held:true,gain:.2,startSec:ctx.currentTime},ctx));
 assert(voices.every(Boolean));assert.equal(surface.note('wave',id,{frequency:330,held:true,startSec:ctx.currentTime},ctx),null,'Held attack ceiling remains unchanged');await flush();
 const pcm=Array.from({length:2},()=>[new Float32Array(128),new Float32Array(128)]),reference=api.kernel(),plan=api.model.compile(instrument),refs=Array.from({length:initial},(_,i)=>reference.voice(plan,{frequency:220+i*17.137,velocity:.8,gain:.2,held:true,seed:instrument.seed},rate)),l=new Float32Array(128),r=new Float32Array(128);
 function render(){node.processor.process([],pcm);l.fill(0);r.fill(0);for(const v of refs)v.process(l,r,0,128,true);assert.deepEqual(pcm[0][0],l,'Tail accounting cannot change/steal PCM');assert.deepEqual(pcm[0][1],r);frame+=128;}
 for(let i=0;i<20;i++)render();voices.forEach(v=>v.noteOff());refs.forEach(v=>v.noteOff());await flush();
 const before=Math.floor(instrument.articulation.releaseSec*rate/128)-1;for(let i=0;i<before;i++)render();await flush();assert.equal(surface.snapshot().activeCost,16,'No discount while dry release remains active');
 for(let i=0;i<4;i++)render();await flush();assert.equal(surface.snapshot().activeCost,12);assert.equal(node.processor.cost,12);assert.equal(live,initial,'Tail reduction retains global physical voice tickets');
 const extra=Math.floor(4/fullCost);for(let i=0;i<extra;i++){const frequency=440+i*17.137;const v=surface.note('wave',id,{frequency,held:true,gain:.2,startSec:ctx.currentTime},ctx);assert(v,'Freed DSP budget must correspond to a real additional pool state');voices.push(v);refs.push(reference.voice(plan,{frequency,velocity:.8,gain:.2,held:true,seed:instrument.seed},rate));}
 await flush();assert.equal(node.processor.slots.filter(Boolean).length,initial+extra);assert.equal(surface.snapshot().activeCost,16);assert.equal(surface.note('wave',id,{frequency:550,held:true,startSec:ctx.currentTime},ctx),null,'The shared ceiling still rejects excess work');render();
 // Gliss remains possible after discounted release; it never resets a tail.
 voices[0].setFrequency(773.137);refs[0].setFrequency(773.137);await flush();for(let i=0;i<12;i++)render();
 voices.forEach(v=>v.noteOff());refs.forEach(v=>v.noteOff());await flush();for(let i=0;i<Math.ceil(2*rate/128);i++){render();await flush();}
 assert.equal(live,0);assert.equal(issued,returned);assert.equal(surface.snapshot().activeCost,0);assert.equal(node.processor.slots.filter(Boolean).length,0);
 console.log('PASS N5',rate,'Hz held',initial,'→ released tails plus new attacks',initial+extra,'; exact PCM, host/processor price, actual pool and all tickets reconciled');
 }finally{surface.dispose()}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
