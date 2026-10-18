'use strict';
// Regression: triple-Nodal surfaces must account ALL live work, including tails.
// Tests production cost policy + actual AudioWorklet control/render logic.
const fs=require('node:fs'),assert=require('node:assert/strict');
const s=fs.readFileSync('src/nodal/12_surface_runtime.js','utf8');
const line=s.match(/function surfaceCost\([^\n]+/);assert(line);
const prices=fs.readFileSync('src/nodal/04_audio_runtime.js','utf8').split('function nodalWorkletProcessorFactory')[0];
const cost=new Function(prices+line[0]+';return surfaceCost;')();
const v2={kernelVersion:'coupled-modal-v2',nodes:[{},{},{}],cost:1,tailSec:1.7};
assert.equal(cost(v2,48000),1.7,'N20 spends 15% of the measured N7 full-voice gain; one cheap unit is still forbidden');
assert(cost(v2,96000)>cost(v2,48000),'Sample rate must remain represented');
assert(s.includes('tailCostScale:.75'),'N5 permits only a measured 25% discount after V2 dry release; attacks retain their full cost');
// Run the actual processor logic with a deliberately inexpensive synthetic voice
// whose dry phase ends before its resonant tail; the CPU work remains live.
const source=fs.readFileSync('src/nodal/04_audio_runtime.js','utf8');
let Proc=null,frame=0;const sent=[];
class Base{constructor(){this.port={postMessage:m=>sent.push(m)}}}
const fakeKernel=()=>({voice(){let dry=false;return {reset(){dry=false},noteOff(){},setFrequency(){},process(){dry=true},get dryEnded(){return dry},get ended(){return false}}},installPrepared(){}});
new Function('createKernel','register','Base','rate','frameNow',source.slice(source.indexOf('function nodalWorkletProcessorFactory('),source.indexOf('function createNodalAdmissionGate('))+';nodalWorkletProcessorFactory(createKernel,register,Base,rate,frameNow);')(fakeKernel,(_,C)=>Proc=C,Base,48000,()=>frame);
assert(Proc);const p=new Proc({processorOptions:{maxCost:16,maxVoices:32,tailCostScale:1,separateLanes:true}});
const plan={...v2,cost:cost(v2,48000)};
p.port.onmessage({data:{type:'plan',id:'program',plan,prepared:{pitches:[]}}});
const poolCount=p.plans.get('program').pool.length;
assert(poolCount<=9,'Do not pre-construct 32 modal states per program; three programs would build 96 states');
for(let i=0;i<poolCount;i++)p.port.onmessage({data:{type:'note',id:'voice-'+i,planId:'program',startSec:0,lane:i%2?'particle':'wave',options:{}}});
assert(Math.abs(p.cost-plan.cost*poolCount)<1e-9);
frame=128;p.process([],[ [new Float32Array(128),new Float32Array(128)],[new Float32Array(128),new Float32Array(128)] ]);
assert(Math.abs(p.cost-plan.cost*poolCount)<1e-9,'Dry-ended tails must keep full cost until DSP actually ends');
assert(!sent.some(x=>x.type==='cost'),'No optimistic cost downgrade while tails are still rendered');
console.log('PASS shared triple Nodal budget, sample rate, bounded per-program pool, real processor full-cost tails');
