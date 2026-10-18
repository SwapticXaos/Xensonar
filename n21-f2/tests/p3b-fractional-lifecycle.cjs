'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
let node,booked=0,released=0;
class Node{
 constructor(){node=this;this.sent=[];this.port={postMessage:m=>{this.sent.push(m);if(m.type==='plan')queueMicrotask(()=>this.port.onmessage({data:{type:'ready',id:m.id}}));},close(){}};}
 connect(){}disconnect(){}
}
const instrument=Object.freeze({referenceHz:220,seed:1,articulation:{durationSec:.1}});
const model={semanticKey:()=> 'A',compile:()=>({key:'A',cost:1,silent:false,articulation:{durationSec:.1}})};
const source=fs.readFileSync('src/nodal/04_audio_runtime.js','utf8');
const create=new Function('jF','AudioWorkletNode','__XenNodalModel','createNodalSynthesisKernel',source+';return createNodalLiveRuntime;')(async()=>{},Node,model,()=>({}));
const surface=fs.readFileSync('src/nodal/12_surface_runtime.js','utf8');
const costFunction=surface.match(/function surfaceCost\([^\n]+/)[0];const costForPlan=new Function(costFunction+';return surfaceCost;')();
(async()=>{
 for(const rate of [88200,48000,44100,96000,176400,192000]){
  const ctx={sampleRate:rate,state:'running',currentTime:1,audioWorklet:{},addEventListener(){},removeEventListener(){}};
  const player=await create({model,kernelFactory:()=>({})}).createPlayer(ctx,{}, {acquire(){booked++;return{release(){released++;}};}},{maxCost:16,maxVoices:32,preserveTails:true,costForPlan});
  await player.prepare(instrument);
  for(let cycle=0;cycle<12;cycle++){
   const voices=Array.from({length:3},()=>player.noteOn(instrument));assert(voices.every(Boolean));
   for(const voice of voices)node.port.onmessage({data:{type:'ended',id:voice.id}});
   assert.equal(player.snapshot().activeVoices,0);
   const next=player.noteOn(instrument);assert(next,'fractional cost rounding must not lock out the next note at '+rate+' Hz');
   node.port.onmessage({data:{type:'ended',id:next.id}});assert.equal(player.snapshot().activeCost,0,'empty player has exactly zero booked DSP cost');
  }
  const capacity=Math.floor(16/costForPlan({cost:1},rate));for(let i=0;i<capacity;i++)assert(player.noteOn(instrument));
  assert.equal(player.noteOn(instrument),null,'unchanged DSP cap still rejects overload at '+rate+' Hz');
  player.dispose();assert.equal(booked,released,'disposal releases every physical ticket exactly once');
 }
 console.log('PASS fractional-cost lifecycle at six sample rates, repeated drain/restart, fixed capacity and balanced disposal');
})().catch(e=>{console.error(e);process.exitCode=1;});
