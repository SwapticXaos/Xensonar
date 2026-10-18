'use strict';const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/nodal/04_audio_runtime.js','utf8');
const model={semanticKey:i=>i.name,compile:i=>({key:i.name,cost:1,referenceHz:220,tailSec:0,silent:false})};
const messages=[];
class FakeNode{
 constructor(){this.port={onmessage:null,postMessage:msg=>{messages.push(msg);if(msg.type==='plan')queueMicrotask(()=>this.port.onmessage?.({data:{type:'ready',id:msg.id}}));},close(){}}}
 connect(){}disconnect(){}
}
const factory=new Function('jF','AudioWorkletNode','createNodalSynthesisKernel','__XenNodalModel',source+';return createNodalLiveRuntime')(()=>Promise.resolve(),FakeNode,()=>({}),model);
const ctx={state:'running',currentTime:0,audioWorklet:{},addEventListener(){},removeEventListener(){}};
const instruments=Array.from({length:17},(_,n)=>Object.freeze({name:'T'+n}));
(async()=>{
 const p=await factory({model,kernelFactory:()=>({})}).createPlayer(ctx,{}, {acquire:()=>({release(){}})});
 for(let i=0;i<16;i++){await p.prepare(instruments[i]);assert(p.pin(instruments[i]));}
 assert.equal(p.snapshot().readyPlans,16);
 await assert.rejects(()=>p.prepare(instruments[16]),/plan bank full/);
 assert.equal(messages.filter(x=>x.type==='forget').length,0);
 assert(p.isPrepared(instruments[0]));p.unpin(instruments[0]);await p.prepare(instruments[16]);
 assert.equal(p.isPrepared(instruments[0]),false);assert(p.isPrepared(instruments[1]));
 assert.equal(messages.filter(x=>x.type==='forget').length,1);p.dispose();
 console.log('PASS P1 16 prepared pinned programs cannot be evicted; releasing one permits safe replacement');
})().catch(e=>{console.error(e);process.exitCode=1});
