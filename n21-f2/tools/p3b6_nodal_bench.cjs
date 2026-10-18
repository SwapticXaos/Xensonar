'use strict';
// Node-only representative DSP benchmark. Never construed as target hardware deadline.
const fs=require('node:fs'),{performance}=require('node:perf_hooks');
const source=fs.readFileSync('src/nodal/01_instrument_model.js','utf8')+'\n'+fs.readFileSync('src/nodal/07_sound_designer.js','utf8');
function engine(kernel){return new Function(source+'\n'+kernel+'\n;return {model:__XenNodalModel,dsp:__XenNodalDSP,starter:nodalOpenStarter};')();}
const base=engine(fs.readFileSync('tests/fixtures/f444_baseline/02_synthesis_kernel.js','utf8'));
const optimized=engine(fs.readFileSync('src/nodal/02_synthesis_kernel.js','utf8'));
function trial(api,name){
 const instrument=api.starter(name),plan=api.model.compile(instrument);
 const voices=Array.from({length:8},(_,i)=>api.dsp.voice(plan,{frequency:110+i*13.25,held:true,durationSec:15,gain:.1},48000));
 const left=new Float32Array(128),right=new Float32Array(128),ms=[];
 for(let block=0;block<120;block++){
  left.fill(0);right.fill(0);
  if(block%8===0)for(let i=0;i<voices.length;i++)voices[i].setFrequency(110+i*13.25+(block%160)*.17);
  const t=performance.now();for(const v of voices)v.process(left,right,0,128,true);const elapsed=performance.now()-t;
  if(block>=20)ms.push(elapsed);
 }
 ms.sort((a,b)=>a-b);return {medianMs:ms[Math.floor(ms.length*.5)],p95Ms:ms[Math.floor(ms.length*.95)]};
}
const results={method:'Node v22; 8 Nodal v2 voices per 128-frame block; warmup 20, measure 100; not real-time hardware',cases:{}};
for(const name of ['hollow','reed','prism']){
 // Run two rounds to reduce cold-JIT ordering differences.
 const b1=trial(base,name),o1=trial(optimized,name),o2=trial(optimized,name),b2=trial(base,name);
 results.cases[name]={p3b5:{medianMs:(b1.medianMs+b2.medianMs)/2,p95Ms:(b1.p95Ms+b2.p95Ms)/2},p3b6:{medianMs:(o1.medianMs+o2.medianMs)/2,p95Ms:(o1.p95Ms+o2.p95Ms)/2}};
}
fs.writeFileSync('results/P3B6_NODAL_BENCH.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
