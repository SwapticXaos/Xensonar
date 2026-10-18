'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const runtime=fs.readFileSync('src/nodal/04_audio_runtime.js','utf8');
let Processor,frame=0,constructors=0,maxPerMessage=0,constructedInMessage=0,rendered=0,failAt=Infinity;
class Base{constructor(){this.port={postMessage:msg=>queueMicrotask(()=>node.port.onmessage?.({data:msg}))};}}
const kernel=()=>({installPrepared(){},preparePitches(){},preparePacket(plan){if(plan.key==='bad-packet')throw new Error('control preparation failed');return {template:{},pitches:[]}},voice(){constructors++;constructedInMessage++;if(constructors===failAt)throw new Error('synthetic voice initialization failure');return {reset(){},process(){},noteOff(){},setFrequency(){},get ended(){return false}};}});
let node;
class FakeNode {
 constructor(ctx,name,opts){node=this;const factory=new Function('createNodalSynthesisKernel','__XenNodalModel',runtime+';return nodalWorkletProcessorFactory;')(kernel,model);factory(kernel,(_,p)=>Processor=p,Base,ctx.sampleRate,()=>frame);this.processor=new Processor({processorOptions:opts.processorOptions});this.history=[];this.port={onmessage:null,postMessage:data=>{this.history.push(data);constructedInMessage=0;this.processor.port.onmessage({data});maxPerMessage=Math.max(maxPerMessage,constructedInMessage);},close(){}};}
 connect(){}disconnect(){}
}
const model={semanticKey:i=>i.key,compile:i=>({key:i.key,cost:1,referenceHz:220,tailSec:0,kernelVersion:'coupled-modal-v2',silent:false,articulation:{durationSec:1}})};
const create=new Function('jF','AudioWorkletNode','createNodalSynthesisKernel','__XenNodalModel',runtime+';return createNodalLiveRuntime')(()=>Promise.resolve(),FakeNode,kernel,model);
const context={audioWorklet:{},state:'running',currentTime:0,sampleRate:48000,addEventListener(){},removeEventListener(){}};
const instrument=key=>Object.freeze({key,referenceHz:220,articulation:{durationSec:1}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const player=await create({model,kernelFactory:kernel}).createPlayer(context,{}, {acquire:()=>({release(){}})},{maxCost:8,maxVoices:8,prepareOnControl:true});
 const old=instrument('old'),fresh=instrument('new');
 const oldReady=player.prepare(old);await sleep(2);
 assert.equal(constructors,0,'cold plan must NOT construct its entire voice pool upon initial plan post');
 assert.equal(player.isPrepared(old),false,'not ready before the bounded pool was fully installed');
 await oldReady;assert.equal(constructors,8);assert.equal(maxPerMessage,1,'at most one voice allocated per control message');
 assert(player.pin(old));
 const note=player.noteOn(old,{frequency:220,durationSec:1},context.currentTime+.02);assert(note,'old instrument can play while another is being prepared');
 const next=player.prepare(fresh);await sleep(2);
 assert.equal(player.isPrepared(fresh),false);
 assert.equal(player.isPrepared(old),true);
 assert.equal(player.noteOn(fresh,{frequency:220},.03),null,'never start an incomplete new plan');
 const output=new Float32Array(128);
 node.processor.process([],[[output,new Float32Array(128)]]);rendered++;
 await next;
 assert.equal(rendered,1);assert.equal(maxPerMessage,1,'no single control message bulk-allocates voices');
 assert.equal([...node.processor.plans.values()].at(-1).pool.length,8);
 assert(player.isPrepared(old)&&player.isPrepared(fresh));
 assert(node.history.some(x=>x.type==='stage'),'controlled paced preparation protocol exercised');
 const broken=instrument('broken');failAt=constructors+2;
 await assert.rejects(()=>player.prepare(broken),/synthetic voice initialization failure/);
 assert(player.isPrepared(old),'failed cold pool cannot evict previously playable old sound');
 assert.equal([...node.processor.plans.values()].some(x=>x.plan.key==='broken'),false,'failed partial pool has been removed from processor bank');
 failAt=Infinity;
 const beforePacketFailure=player.snapshot().readyPlans;
 await assert.rejects(()=>player.prepare(instrument('bad-packet')),/control preparation failed/);
 assert.equal(player.snapshot().readyPlans,beforePacketFailure,'synchronous control-packet failure must not leave a pending/evictable phantom bank');
 const cancelled=instrument('cancelled'),inFlight=player.prepare(cancelled);
 await sleep(2);player.dispose();
 await assert.rejects(inFlight,/unavailable/);
 const afterDispose=constructors;await sleep(50);
 assert.equal(constructors,afterDispose,'disposed player cannot continue installing stale pool work');
 console.log('PASS P2 paced preparation, old pin, no premature ready, bounded allocation, real process between stages');
})().catch(e=>{console.error(e);process.exitCode=1});
