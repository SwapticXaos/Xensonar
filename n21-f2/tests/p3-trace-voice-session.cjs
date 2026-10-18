'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),read=p=>fs.readFileSync(p,'utf8');
const probe=new Function(read('src/instruments/00_diagnostics.js')+';return __XenAudioProbe;')();
let node,released=0;
class Node{
 constructor(){node=this;this.notes=[];this.port={postMessage:m=>{if(m.type==='plan')queueMicrotask(()=>this.port.onmessage?.({data:{type:'ready',id:m.id}}));if(m.type==='note')this.notes.push(m);},close(){}};}
 connect(){}disconnect(){}
}
const instrument=Object.freeze({referenceHz:220,seed:1,articulation:{durationSec:.1}});
const model={semanticKey:()=> 'A',compile:()=>({key:'A',cost:1,silent:false,kernelVersion:'coupled-modal-v2',tailSec:0,articulation:{durationSec:.1}})};
const create=new Function('__XenAudioProbe','jF','AudioWorkletNode','__XenNodalModel','createNodalSynthesisKernel',read('src/nodal/04_audio_runtime.js')+';return createNodalLiveRuntime;')(probe,async()=>{},Node,model,()=>({}));
const ctx={state:'running',currentTime:1,sampleRate:48000,audioWorklet:{},addEventListener(){},removeEventListener(){}};
(async()=>{
 const player=await create({model,kernelFactory:()=>({})}).createPlayer(ctx,{}, {acquire:()=>({release(){released++;}})},{maxCost:16,maxVoices:32});
 await player.prepare(instrument);const old=player.noteOn(instrument,{admissionLane:'particle'});
 probe.start();node.port.onmessage({data:{type:'started',id:old.id}});node.port.onmessage({data:{type:'ended',id:old.id}});
 assert.equal(probe.read().records.length,0,'untraced old voices must not add lifecycle counters to a fresh capture');
 probe.stop();const afterAck=player.noteOn(instrument,{admissionLane:'particle'});node.port.onmessage({data:{type:'started',id:afterAck.id}});
 probe.start();node.port.onmessage({data:{type:'ended',id:afterAck.id}});
 assert.equal(probe.read().records.length,0,'starting after acknowledgement also excludes the old tail');
 const direct=player.noteOn(instrument,{admissionLane:'particle'});
 node.port.onmessage({data:{type:'started',id:direct.id}});node.port.onmessage({data:{type:'ended',id:direct.id}});
 const records=probe.read().records;assert.equal(records.length,4,'a direct renderer caller gets an explicit capture ID');
 assert(records.every(r=>r.eventId&&r.eventId===records[0].eventId));
 assert.equal(records[0].details.origin,'renderer-direct','a renderer-local request is distinguishable from the real host ingress');
 const inflight=player.noteOn(instrument,{admissionLane:'particle'});probe.start();node.port.onmessage({data:{type:'started',id:inflight.id}});node.port.onmessage({data:{type:'ended',id:inflight.id}});
 assert.equal(probe.read().records.length,0);assert.equal(released,4);player.dispose();
 console.log('PASS pre-capture voices stay out of new sessions; direct renderer events correlate; old-session completion still releases tickets');
})().catch(error=>{console.error(error);process.exitCode=1;});
