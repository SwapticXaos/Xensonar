'use strict';
// Existing Wave-C11 host must continue to distinguish cheap plain oscillators
// from more expensive gradient DSP. Cost is a reservation, never a queue.
const assert=require('node:assert/strict'),fs=require('node:fs');
const app=fs.readFileSync('src/01_app_runtime.js','utf8');
const live=fs.readFileSync('src/audio/05_live_voice_runtime.js','utf8');
function extract(src,name,end){const a=src.indexOf('function '+name+'('),b=src.indexOf(end,a+10);assert(a>=0&&b>a);return src.slice(a,b)}
const cost=[];
const env={__wave39Owned:()=>true,Jp:(ctx,start,slack)=>ctx.currentTime<=start+slack,__wave39Reserve:(ctx,start,units)=>{cost.push({start,units});return null},K3:.005,Me:(x,min,max)=>Math.min(max,Math.max(min,x))};
const f=new Function(...Object.keys(env),extract(live,'HW','function lAe')+extract(app,'__wave39PlayTone','function __wave39Scheduled')+';return {HW,__wave39PlayTone}')(...Object.values(env));
const ctx={currentTime:1,sampleRate:48000};
const g={amount:0,durationMul:1,coreVolumeMul:1,coreResonanceAdd:0,coreCutoffMul:1,coreCutoffAdd:0};
const spec={waveform:'triangle',ctx};
function fire(amount,intended=1-.005){cost.length=0;const shape=f.HW({duration:.2,gain:.3,resonance:1,cutoffHz:1600,waveGradient:{...g,amount}});f.__wave39PlayTone(spec,shape,intended);return cost[0]??null}
assert.equal(fire(0).units,4,'unmodulated legacy oscillator has cheap 4-unit reservation');
assert.equal(fire(.018).units,4,'threshold retains inexpensive oscillator');
assert.equal(fire(.019).units,24,'actual gradient requires larger 24-unit reservation');
assert.equal(fire(1).units,24);
assert.equal(fire(0,.979),null,'stale cheap attacks drop');
assert.equal(fire(1,.979),null,'stale heavy attacks drop');
console.log('PASS P3B4 existing shared Wave host: simple 4 units / gradient 24 units; bounded deadlines still apply');
