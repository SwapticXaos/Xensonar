'use strict';
// Real Nodal model, shared audio worklet processor, three differently selected sources.
const fs=require('node:fs'),assert=require('node:assert/strict');
const src=['01_instrument_model','02_synthesis_kernel','07_sound_designer','04_audio_runtime','12_surface_runtime'].map(n=>fs.readFileSync('src/nodal/'+n+'.js','utf8')).join('\n').replace('const __XenNodalSurfaces=createNodalSurfaceRuntime({library:__XenNodalLibrary,live:__XenNodalLive,model:__XenNodalModel});','');
let frame=48000,processor,node;
class AudioNode{
 constructor(ctx,name,opts){node=this;let Class;const host=this;class Base{constructor(){this.port={postMessage:m=>queueMicrotask(()=>host.port.onmessage?.({data:m}))}}}
  api.factory(api.kernel,(_,C)=>Class=C,Base,48000,()=>frame);processor=new Class({processorOptions:opts.processorOptions});this.sent=[];
  this.port={onmessage:null,postMessage:m=>{this.sent.push(m);queueMicrotask(()=>processor.port.onmessage({data:m}));},close(){}};
 }connect(){}disconnect(){}
}
const api=new Function('jF','AudioWorkletNode',src+';return {model:__XenNodalModel,live:__XenNodalLive,surface:createNodalSurfaceRuntime,factory:nodalWorkletProcessorFactory,kernel:createNodalSynthesisKernel,starter:nodalOpenStarter};')(async()=>{},AudioNode);
const instruments=['prism','hollow','reed'].map(api.starter), ids=['wave','keyboard','particle'].map((x,i)=>'nodal:'+x+'@1');
const items=ids.map((id,i)=>({id:id.slice(6).split('@')[0],revision:1,instrument:instruments[i]}));
const ctx={state:'running',sampleRate:48000,audioWorklet:{},get currentTime(){return frame/48000;},addEventListener(){},removeEventListener(){}};
let tickets=0,issued=0,released=0;const out={};const surface=api.surface({library:{list:()=>items},live:api.live,model:api.model});
surface.configure({getContext:()=>ctx,ensureReady:async()=>ctx,getOutput:()=>out,prepareRoute:()=>({main:out}),acquire(){tickets++;issued++;return{release(){tickets--;released++;}};}});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 await Promise.all(ids.map((id,i)=>surface.select(['wave','keyboard','particle'][i],id)));
 assert.equal(node.sent.filter(x=>x.type==='plan').length,3);
 assert.equal(processor.plans.size,3);
 for(const bank of processor.plans.values())assert(bank.pool.length<=Math.min(32,Math.floor(16/bank.plan.tailCost)),'Prepared states remain bounded by the verified tail-phase budget');
 const plays=[];for(let j=0;j<4;j++)for(let i=0;i<3;i++)plays.push(surface.note(['wave','keyboard','particle'][i],ids[i],{frequency:220+(j*22),held:true,gain:.2},ctx));
 const accepted=plays.filter(Boolean);assert.equal(accepted.length,9,'N20 three-source full-voice ceiling reflects the measured N7 price');
 assert.equal(tickets,9);assert(Math.abs(surface.snapshot().activeCost-15.3)<1e-9);
 await flush();const output=Array.from({length:2},()=>[new Float32Array(128),new Float32Array(128)]);
 let nonzero=false;for(let k=0;k<20;k++){processor.process([],output);frame+=128;nonzero||=output.some(l=>l.some(ch=>ch.some(v=>Math.abs(v)>1e-7)));}
 assert(nonzero,'Actual synthesis emits audible samples');
 assert(Math.abs(processor.cost-surface.snapshot().activeCost)<1e-9,'Processor budget equals main-side account while three sounds play');
 surface.releaseHeld();await flush();for(let k=0;k<1500;k++){processor.process([],output);frame+=128;await flush();}
 assert.equal(tickets,0);assert.equal(issued,released);assert.equal(surface.snapshot().activeVoices,0);surface.dispose();
 console.log('PASS three Nodal programs selected, shared bounded DSP+physical tickets, nonzero PCM, full end-of-tail release');
})().catch(e=>{surface.dispose();console.error(e);process.exitCode=1;});
