'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('src/nodal/04_audio_runtime.js','utf8');
let hostPrepare=0,hostCompile=0,requests=[],resolveCurrent,workletNode,stagedReady=0,workletPackages=[];
class Worklet {
 constructor(){workletNode=this;this.port={onmessage:null,postMessage:msg=>{
  if(msg.type==='plan')queueMicrotask(()=>{stagedReady++;this.port.onmessage({data:{type:'ready',id:msg.id}});});
  if(msg.type==='pitches')workletPackages.push(msg);
 },close(){}};}
 connect(){}disconnect(){}
}
function workerCoordinator(){return {
 prepare:async (i)=>({plan:{key:i.key,cost:1,kernelVersion:'coupled-modal-v2',referenceHz:220,silent:false,tailSec:0,articulation:{durationSec:1}},prepared:{},workerPlanId:333}),
 prepareFrequencies:(id,hz,rate)=>{assert.equal(id,333);assert.equal(rate,48000);requests.push([...hz]);return new Promise(resolve=>{resolveCurrent=resolve;});},
 forget(){},dispose(){}
};}
const model={semanticKey:i=>i.key,compile:()=>{hostCompile++;throw Error('Main-thread compile forbidden');}};
const control=()=>({preparePacket:()=>{hostPrepare++;throw Error('Main-thread pitch packet forbidden');}});
const create=new Function('jF','AudioWorkletNode','Worker','createNodalPreparationCoordinator','createNodalInstrumentModel','resolveNodalArticulationFields','createNodalSynthesisKernel','__XenNodalModel',src+';return createNodalLiveRuntime;')(
 ()=>Promise.resolve(),Worklet,class Worker{},workerCoordinator,()=>model,()=>({volumeCurve:null,pitchCurve:null}),control,model);
const ctx={state:'running',sampleRate:48000,currentTime:0,audioWorklet:{},addEventListener(){},removeEventListener(){}};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const player=await create({model,kernelFactory:control}).createPlayer(ctx,{}, {acquire:()=>({release(){}})}, {prepareOnControl:true,maxCost:16,maxVoices:32});
 const instrument=Object.freeze({key:'nodal',referenceHz:220,articulation:{durationSec:1}});
 await player.prepare(instrument);assert.equal(stagedReady,1);
 assert(player.prepareFrequencies(instrument,[220,330],'wave'));
 assert(player.prepareFrequencies(instrument,[440,660],'wave'));
 assert(player.prepareFrequencies(instrument,[110,165],'particle'));
 assert.equal(requests.length,1,'No unbounded queue: only one worker job in flight');
 assert.deepEqual(requests[0],[220,330]);
 const finishOld=resolveCurrent;finishOld({old:true});await tick();
 assert.equal(workletPackages.length,0,'Stale worker results must not enter Worklet');
 assert.equal(requests.length,2,'One latest combined request should replace all intermediate states');
 assert.deepEqual(requests[1],[440,660,110,165]);
 const finishNew=resolveCurrent;finishNew({valid:true});await tick();
 assert.equal(workletPackages.length,1);assert.deepEqual(workletPackages[0].prepared,{valid:true});
 assert(player.prepareFrequencies(instrument,[440,660],'wave'));
 await tick();assert.equal(requests.length,2,'Identical root family must not trigger redundant worker work');
 assert.equal(hostPrepare,0);assert.equal(hostCompile,0);
 player.dispose();console.log('PASS P3B6 worker coalescing, stale drop, two independent pitch families, no Main DSP');
})().catch(e=>{console.error(e);process.exitCode=1;});
