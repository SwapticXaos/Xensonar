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
for(const rate of [48000,96000])for(const count of [3,7,12]){
 frame=rate;nodes.length=0;let issued=0,returned=0,tickets=0;
 const raw=api.starter('hollow'),instrument=api.model.normalize({...raw,nodes:Array.from({length:count},(_,i)=>({...raw.nodes[i%3],id:'n'+i,ratio:1+i*.137,excitationKind:['tone','impulse','breath'][i%3]}))});
 const ctx={state:'running',sampleRate:rate,audioWorklet:{},get currentTime(){return frame/rate},addEventListener(){},removeEventListener(){}};
 const acquire=()=>{issued++;tickets++;return {release(){returned++;tickets--;}}},plan=api.model.compile(instrument),pricing=api.costs(plan,rate);
 const surface=api.surface({library:{list:()=>[{id:'test',revision:1,instrument}]},live:api.live,model:api.model}),id='nodal:test@1',out={};
 surface.configure({getContext:()=>ctx,ensureReady:async()=>ctx,getOutput:()=>out,prepareRoute:()=>({main:out}),acquire});
 await Promise.all(['wave','keyboard','particle'].map(lane=>surface.select(lane,id)));
 assert.equal(nodes.length,1);const host=nodes[0],voices=[];
 const expected=Math.min(32,Math.floor((16+1e-9)/pricing.attack)),before=Math.floor(16/pricing.baseline);
 for(let i=0;i<expected;i++){const voice=surface.note(['wave','keyboard','particle'][i%3],id,{frequency:173.137+i*13.731,held:true,gain:.17,startSec:ctx.currentTime},ctx);assert(voice);voices.push(voice);}
 assert.equal(surface.note('wave',id,{frequency:330,held:true},ctx),null);await flush();
 assert.equal(tickets,expected);assert(expected>=before,'New capacity must reach actual DSP, not only a larger host counter');
 // New cost and shared tickets must not change one PCM sample of any accepted
 // voice. Mix each real lane in the original slot order.
 const dsp=api.kernel(),refs=voices.map((_,i)=>dsp.voice(plan,{frequency:173.137+i*13.731,held:true,velocity:.8,gain:.17,seed:instrument.seed},rate));
 const output=Array.from({length:2},()=>[new Float32Array(128),new Float32Array(128)]),ref=Array.from({length:2},()=>[new Float32Array(128),new Float32Array(128)]);
 let energy=0,values=0;
 function render(){
  host.processor.process([],output);ref.forEach(l=>l.forEach(ch=>ch.fill(0)));
  refs.forEach((v,i)=>v.process(...ref[i%3===2?1:0],0,128,true));
  for(let lane=0;lane<2;lane++)for(let ch=0;ch<2;ch++){assert.deepEqual(output[lane][ch],ref[lane][ch]);energy+=output[lane][ch].reduce((n,x)=>n+Math.abs(x),0);values+=128;}frame+=128;
 }
 for(let b=0;b<50;b++){if(b===10){voices.forEach((v,i)=>v.setFrequency(217.731+i*11.137));refs.forEach((v,i)=>v.setFrequency(217.731+i*11.137));await flush();}render();}
 // Request is accepted at receipt, but not yet rendered when in the future.
 const diag=await api.live.diagnostics();assert.equal(diag[0].consumer.renderStarted,expected);assert.equal(diag[0].consumer.accepted,expected);assert(energy>0);
 voices.forEach(v=>v.noteOff());refs.forEach(v=>v.noteOff());await flush();
 for(let b=0;b<Math.ceil((instrument.material.natural*1.8+.1)*rate/128);b++){render();await flush();}
 assert.equal(tickets,0);assert.equal(issued,returned);assert.equal(surface.snapshot().activeCost,0);
 const primary=await api.live.createPlayer(ctx,out,{acquire},{maxCost:16,maxVoices:32,sharedCapacity:true,priority:'primary',preserveTails:true,prepareOnControl:true,costForPlan:(p,r)=>api.costs(p,r).attack,tailCostForPlan:(p,r)=>api.costs(p,r).tail});
 await primary.prepare(instrument);await primary.warmFrequencies(instrument,[173.137,217.731]);assert(primary.hasPreparedFrequencies(instrument,[173.137,217.731]));
 const secondaryLimit=Math.floor((16-primary.snapshot().sharedCapacity.primaryReserve+1e-9)/pricing.attack);for(let i=0;i<secondaryLimit;i++)assert(surface.note('wave',id,{frequency:220,held:true},ctx));
 assert.equal(surface.note('wave',id,{frequency:220,held:true},ctx),null);
 const primaryVoice=primary.noteOn(instrument,{frequency:217.731,held:true},ctx.currentTime+.02);assert(primaryVoice,'Reserved room starts a primary note under secondary saturation');await flush();
 const cold=await primary.requestDiagnostics();assert.equal(cold.consumer.accepted,1);assert.equal(cold.consumer.renderStarted,0,'Future acceptance is not a render-start measurement');
 assert(primary.snapshot().sharedCapacity.activeCost<=16+1e-9);assert.equal(primary.snapshot().sharedCapacity.primaryOwners,1);
 // Cancelling a future onset must not synthesize an early retire fade.
 primary.stop();await flush();
 const primaryOut=[[new Float32Array(128),new Float32Array(128)]];
 nodes[1].processor.process([],primaryOut);assert(primaryOut[0].every(ch=>ch.every(x=>x===0)));
 assert.equal(primary.snapshot().activeVoices,0);assert.equal((await primary.requestDiagnostics()).consumer.renderStarted,0);
 const livePrimary=primary.noteOn(instrument,{frequency:217.731,held:true},ctx.currentTime);assert(livePrimary);await flush();
 nodes[1].processor.process([],primaryOut);frame+=128;assert(primaryOut[0][0].some(x=>x!==0));
 assert.equal((await primary.requestDiagnostics()).consumer.renderStarted,1);
 primary.dispose();surface.releaseHeld();await flush();
 for(let b=0;b<Math.ceil(2.1*rate/128);b++){host.processor.process([],output);frame+=128;await flush();}
 assert.equal(tickets,0);const final=surface.snapshot().sharedCapacity;assert.equal(final.activeCost,0);assert.equal(final.activeVoices,0);assert.equal(final.primaryOwners,0);
 surface.dispose();assert.equal((await api.live.diagnostics()).length,0);
 rows.push({rate,nodes:count,n19FullVoices:before,n20FullVoices:expected,comparedChannelValues:values,energy,allPhysicalTicketsReturned:issued===returned});
}
fs.writeFileSync('results/p4c2-n20-shared-runtime.json',JSON.stringify({rows,scope:'Production DSP/ports bridged; exact PCM, real rendered starts and global/shared ticket cleanup; not hardware audio'},null,2)+'\n');
console.log('PASS N20 shared runtime:',JSON.stringify(rows));
})().catch(e=>{console.error(e);process.exitCode=1});
