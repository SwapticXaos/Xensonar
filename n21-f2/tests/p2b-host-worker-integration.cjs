'use strict';const fs=require('node:fs'),assert=require('node:assert/strict');
const s=fs.readFileSync('src/nodal/04_audio_runtime.js','utf8');
let hostCompiles=0,hostPrepares=0,workerCalls=0,workerDisposals=0,acknowledged=0,workerFail=false,deferring=false,pendingResolver;
let liveNode;
class FakeAudioWorkletNode{
 constructor(){liveNode=this;this.port={onmessage:null,postMessage:packet=>{
  if(packet.type==='plan')queueMicrotask(()=>{acknowledged++;this.port.onmessage?.({data:{type:'ready',id:packet.id}});});
 },close(){}};}
 connect(){}disconnect(){}
}
const model={semanticKey:instrument=>instrument.key,compile(){hostCompiles++;throw Error('Main thread cannot compile in P2B worker path');}};
function kernelFactory(){return {preparePacket(){hostPrepares++;throw Error('Main thread must not build prepared pitch packet');}};}
class FakeWorker{}
function createCoordinator(){return {prepare(instrument,rate){workerCalls++;if(workerFail)return Promise.reject(Error('test background failed'));if(deferring)return new Promise(resolve=>{pendingResolver=()=>resolve({plan:{key:instrument.key,cost:1,kernelVersion:'coupled-modal-v2',referenceHz:220,silent:false,tailSec:0,articulation:{durationSec:1}},prepared:{pitches:[],template:{}}});});return Promise.resolve({plan:{key:instrument.key,cost:1,kernelVersion:'coupled-modal-v2',referenceHz:220,silent:false,tailSec:0,articulation:{durationSec:1}},prepared:{pitches:[],template:{}}});},dispose(){workerDisposals++;}};}
const api=new Function('jF','AudioWorkletNode','Worker','createNodalPreparationCoordinator','createNodalInstrumentModel','resolveNodalArticulationFields','createNodalSynthesisKernel','__XenNodalModel',s+';return createNodalLiveRuntime')(
 ()=>Promise.resolve(),FakeAudioWorkletNode,FakeWorker,createCoordinator,()=>model,()=>({volumeCurve:null,pitchCurve:null}),kernelFactory,model);
const context={audioWorklet:{},state:'running',sampleRate:48000,currentTime:0,addEventListener(){},removeEventListener(){}};
const inst=key=>Object.freeze({key,referenceHz:220,articulation:{durationSec:1}});
(async()=>{
 const player=await api({model,kernelFactory}).createPlayer(context,{}, {acquire:()=>({release(){}})}, {prepareOnControl:true,maxCost:16,maxVoices:32});
 const A=inst('A'),B=inst('B');await Promise.all([player.prepare(A),player.prepare(A)]);
 assert(player.isPrepared(A));assert.equal(workerCalls,1,'deduplicate same request while background compile runs');
 assert.equal(hostCompiles,0);assert.equal(hostPrepares,0);assert.equal(acknowledged,1);
 workerFail=true;await assert.rejects(()=>player.prepare(B),/background failed/);assert.equal(player.snapshot().readyPlans,1);assert(player.isPrepared(A),'existing instrument still ready');
 workerFail=false;deferring=true;const C=inst('C'),inflight=player.prepare(C);await new Promise(resolve=>setImmediate(resolve));
 player.dispose();pendingResolver();await assert.rejects(inflight,/disposed/);
 assert.equal(workerDisposals,1);assert.equal(player.snapshot().readyPlans,1);assert.equal(hostCompiles,0);
 console.log('PASS P2B live player uses worker, dedups, preserves old program, drops late results and disposes');
})().catch(e=>{console.error(e);process.exitCode=1});
