'use strict';
// Test the actual hearing renderer against a deterministic fake audio renderer.
// The fake returns a distinct buffer on each call; repeated configurations MUST
// hit the cache, but changed synthesis parameters MUST schedule a fresh render.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/forge_and_melodic/10_audition_and_persistence.js'),'utf8');
const start=source.indexOf('async function __f333RenderHearing(request) {');
const end=source.indexOf('// F3.56.5: one carrier pitch offset',start);
assert(start>=0&&end>start);
const calls=[];
const context={
  Ti: v=>JSON.stringify(v), ER:()=> 'same-drawing',
  IB:()=>({durationSec:1,previewPitchRatio:1,auditionSelection:{machineId:'raw-darkpsy-oscillator'}}),
  TR:()=>({width:8,height:8}),
  __Fractalia:{semanticKey:()=>'',snapshot:()=>null},
  __Emilia:{semanticKey:()=>'',snapshot:()=>null},
  __f333HearingCache:new Map(), xt:{getContext:()=>({sampleRate:48000})},
  xK:()=>null,
  __f3565PitchGrid:grid=>grid, __f333Epoch:0,
  __PureDieter:{render:async settings=>{calls.push({mode:settings.mode,mix:{...settings.mix}});return {renderSerial:calls.length}}}
};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('const __f433HearingBudgetBytes'),source.indexOf('function __f333Stop'))+source.slice(start,end),context);
const mixA={sine:1,sawtooth:0,square:0,triangle:0};
const mixB={sine:0,sawtooth:1,square:0,triangle:0};
const request=(mode,mix)=>({machineId:'raw-darkpsy-oscillator',snapshot:{synthMode:mode,waveformMix:mix}});
(async()=>{
 const first=await context.__f333RenderHearing(request('additive',mixA));
 const repeat=await context.__f333RenderHearing(request('additive',mixA));
 assert.equal(first.cacheHit,false);assert.equal(repeat.cacheHit,true);
 assert.equal(calls.length,1,'unchanged settings should reuse cached audio');
 const modeChange=await context.__f333RenderHearing(request('ifft',mixA));
 assert.equal(modeChange.cacheHit,false,'changing synth mode must not reuse previous audio');
 assert.equal(calls.length,2,'second mode must render again');
 const mixChange=await context.__f333RenderHearing(request('additive',mixB));
 assert.equal(mixChange.cacheHit,false,'changing waveform mix must not reuse previous audio');
 assert.equal(calls.length,3,'new additive mix must render again');
 await context.__f333RenderHearing(request('granular',mixB));
 await context.__f333RenderHearing(request('glyph',mixB));
 assert.deepEqual(calls.map(c=>c.mode),['additive','ifft','additive','granular','glyph']);
 console.log('PASS Pure Dieter: cache identity, synth mode, four renderer dispatches, waveform mix');
})().catch(e=>{console.error(e);process.exitCode=1});
