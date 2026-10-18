'use strict';
// Offline comparative profile, NOT a browser capacity calibration or deadline guarantee.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const model=fs.readFileSync('src/nodal/01_instrument_model.js','utf8');
function load(path){return vm.runInNewContext(model+'\n'+fs.readFileSync(path,'utf8')+'\n({model:__XenNodalModel,dsp:__XenNodalDSP})',{Math,Float64Array,Float32Array,Uint32Array,Int8Array,Map,Set});}
const apis=[load('tests/fixtures/p3c_d4_baseline/02_synthesis_kernel.js'),load('src/nodal/02_synthesis_kernel.js')];
const rows=[];
for(const sr of [48000,96000])for(const kind of ['tone','impulse','breath']){
 const voices=apis.map(api=>{
 const plan=api.model.compile(api.model.normalize({schema:'xensonar.nodal-instrument',schemaVersion:1,kernelVersion:'coupled-modal-v1',name:'7-node profile',seed:17,referenceHz:220,
 nodes:Array.from({length:7},(_,i)=>({id:'n'+i,role:i===2?'fold':'resonator',x:.2+i*.07,y:.6,ratio:1+i*.15,cents:0,radius:.25,strength:1,excitation:.7})),excitation:{kind,level:.7},coupling:.12,articulation:{durationSec:.5,attackSec:.002,releaseSec:.08}}));
 assert.equal(plan.cost,8);return api.dsp.voice(plan,{held:true,frequency:220},sr);
 });
 const block=new Float32Array(128),times=[[],[]];
 for(let warm=0;warm<300;warm++)for(const v of voices)v.process(block);
 for(let round=0;round<7;round++)for(const index of (round%2?[1,0]:[0,1])){
  const v=voices[index];let total=0,max=0;
  for(let i=0;i<160;i++){if(i%16===0)v.reset({held:true,frequency:220,seed:i+17});const start=performance.now();v.process(block);const dt=performance.now()-start;total+=dt;max=Math.max(max,dt);}
  times[index].push({totalMs:total,maxBlockMs:max});
 }
 const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
 rows.push({sampleRate:sr,excitation:kind,nodes:7,cost:8,framesPerRound:20480,beforeMedianMs:median(times[0].map(t=>t.totalMs)),afterMedianMs:median(times[1].map(t=>t.totalMs)),rounds:times});
}
console.log(JSON.stringify({note:'Offline same-process comparison only; GC/scheduling affect maxima. No admission change inferred.',rows},null,2));
