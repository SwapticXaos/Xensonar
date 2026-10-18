'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,'src/nodal',n+'.js'),'utf8');
const source=['01_instrument_model','02_synthesis_kernel','04_audio_runtime','07_sound_designer','12_surface_runtime'].map(read).join('\n').replace('const __XenNodalSurfaces=createNodalSurfaceRuntime({library:__XenNodalLibrary,live:__XenNodalLive,model:__XenNodalModel});','');
const report={checks:[]};const pass=s=>{report.checks.push(s);console.log('PASS',s)};
let constructors=0,typedArrays=0,frame=0,tickets=0,maxTickets=0,nodes=[],externalAllowed=true;
const countType=T=>new Proxy(T,{construct(target,args){typedArrays++;return Reflect.construct(target,args);}});
let api;
class Node {
 constructor(ctx){
  nodes.push(this);let Processor;const self=this;
  const Base=class {constructor(){this.port={postMessage:data=>queueMicrotask(()=>self.port.onmessage?.({data}))};}};
  this.port={onmessage:null,postMessage:data=>this.processor.port.onmessage({data}),close(){this.onmessage=null;}};
  api.processor(()=>{const kernel=api.kernel();return {...kernel,voice(...args){constructors++;return kernel.voice(...args);}}},(_,C)=>Processor=C,Base,ctx.sampleRate,()=>frame);
  this.processor=new Processor();this.disposed=false;
 }
 connect(){}disconnect(){this.disposed=true;}
}
api=new Function('jF','AudioWorkletNode','Float64Array','Float32Array','Uint32Array','Int8Array',source+';return {model:__XenNodalModel,kernel:createNodalSynthesisKernel,live:__XenNodalLive,processor:nodalWorkletProcessorFactory,starter:nodalOpenStarter,surface:createNodalSurfaceRuntime};')(()=>Promise.resolve(),Node,...[Float64Array,Float32Array,Uint32Array,Int8Array].map(countType));
const context={state:'running',sampleRate:48000,get currentTime(){return frame/48000;},audioWorklet:{},addEventListener(){},removeEventListener(){}};
const instrument=api.starter('hollow'),id='nodal:glass@1';let entries=[{id:'glass',revision:1,instrument}];
const library={list:()=>entries};
const bridge=api.surface({library,live:api.live,model:api.model});
const acquire=(lane,cost)=>{
 if(!externalAllowed)return null;
 assert(['wave','particle'].includes(lane));tickets+=cost;maxTickets=Math.max(maxTickets,tickets);let owned=true;
 return {release(){if(owned){tickets-=cost;owned=false;}}};
};
const configure=ctx=>bridge.configure({getContext:()=>ctx,ensureReady:async()=>ctx,getOutput:()=>({}),acquire});
const flush=()=>new Promise(resolve=>queueMicrotask(resolve));
async function pump(count){const l=new Float32Array(128),r=new Float32Array(128);for(let b=0;b<count;b++){nodes.filter(n=>!n.disposed).forEach(n=>n.processor.process([],[[l,r]]));for(const v of l)assert(Number.isFinite(v));frame+=128;await flush();}return {l,r};}
(async()=>{
 configure(context);
 assert.equal(bridge.note('wave',id,{frequency:220},context),null);
 await Promise.all([bridge.select('wave',id),bridge.select('particle',id)]);
 assert.equal(nodes.length,1);assert.equal(bridge.snapshot().readyPlans,1);assert.equal(constructors,4);pass('concurrent wave/particle selection shares one processor and one four-voice DSP pool');
 const preparedConstructors=constructors,preparedArrays=typedArrays;
 for(let k=0;k<3;k++)assert(bridge.note('particle',id,{frequency:220+k*13,durationSec:.04},context));
 assert.equal(bridge.note('particle',id,{frequency:440,durationSec:.04},context),null,'particle leaves headroom');
 assert(bridge.note('wave',id,{frequency:330,durationSec:.04},context));
 assert.equal(bridge.note('wave',id,{frequency:440},context),null,'combined budget exhausted');
 assert.equal(constructors,preparedConstructors);assert.equal(typedArrays,preparedArrays);assert.equal(tickets,8);pass('note-on constructs zero DSP voices and zero typed arrays; particles leave a wave slot; combined cost is eight');
 await pump(55); // > gate+release, < full natural tail
 const occupied=bridge.snapshot().activeVoices;
 assert(occupied>0);assert.equal(bridge.note('wave',id,{frequency:220},context),null);assert.equal(bridge.snapshot().activeVoices,occupied);pass('pressure drops new events without retiring or shortening existing natural tails');
 await pump(900);assert.equal(tickets,0);assert.equal(bridge.snapshot().activeVoices,0);
 for(let k=0;k<32;k++){
  const c=constructors,t=typedArrays;
  assert(bridge.note(k%2?'wave':'particle',id,{frequency:80+k*31.123,durationSec:.02},context));
  assert.equal(constructors,c);assert.equal(typedArrays,t);
  await pump(770);
 }
 assert.equal(tickets,0);pass('32 completed stereo voices reuse deterministic state with no note allocations or ticket leak');
 externalAllowed=false;assert.equal(bridge.note('wave',id,{frequency:220},context),null);assert.equal(tickets,0);externalAllowed=true;
 const p=nodes[0].processor;let messages=[];const original=p.port.postMessage;p.port.postMessage=data=>{messages.push(data);original(data);};
 p.port.onmessage({data:{type:'note',id:'stale',planId:[...p.plans.keys()][0],startSec:0,options:{frequency:220}}});assert(messages.some(m=>m.type==='rejected'&&m.reason==='late'));pass('external admission and stale-worklet gates drop events without catch-up');
 entries=[];assert.equal(await bridge.select('wave',id),null);assert.equal(bridge.note('wave',id,{frequency:220},context),null);
 entries=[{id:'glass',revision:1,instrument}];await bridge.select('wave',id);
 const newContext={...context,sampleRate:96000,currentTime:frame/48000};configure(newContext);await Promise.all([bridge.select('particle',id),bridge.select('wave',id)]);
 assert.equal(nodes.length,2);assert(nodes[0].disposed);assert.equal(nodes[1].processor.plans.values().next().value.pool.length,2,'96 kHz scales the pool budget before playing');assert(bridge.note('wave',id,{frequency:220},newContext));await flush();
 bridge.dispose();assert.equal(tickets,0);assert(nodes[1].disposed);pass('library invalidation, context migration and disposal have no stale owner or leaked tickets');
 // Race: dispose while the real node is being created. It must be reclaimed,
 // even if a subsequent configure starts a new lifetime before its promise resolves.
 let resume;const delayed={async createPlayer(...args){await new Promise(r=>resume=r);return api.live.createPlayer(...args);}};
 const race=api.surface({library,live:delayed,model:api.model});race.configure({getContext:()=>context,ensureReady:async()=>context,getOutput:()=>({}),acquire});
 const pending=race.select('wave',id);await flush();race.dispose();resume();await pending;assert(nodes.at(-1).disposed);pass('dispose during asynchronous processor creation reclaims the late node');
 report.maxTickets=maxTickets;report.typedArraysDuringNoteOn=0;report.dspConstructorsDuringNoteOn=0;
 fs.writeFileSync(path.join(root,'results/f444-surface-realtime.json'),JSON.stringify(report,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1});
