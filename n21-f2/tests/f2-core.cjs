'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),core=require('../src/forge/fractalia/00_legacy_f2.js')();
const checks=[],timings={};const pass=x=>(checks.push(x),console.log('PASS',x));
const track={gainAt:t=>t>=.1&&t<1.9?.65:0,at:t=>({gain:t>=.1&&t<1.9?.65:0,hz:220*2**(.3*Math.sin(t*3))})};
(async()=>{
 let start=performance.now();const atlas=await core.compile({tracks:[track],durationSec:2});timings.compileMs=performance.now()-start;
 assert.equal(atlas.material.silent,false);assert.equal(atlas.states.length,7);assert.equal(atlas.bytes,258048);pass('A drawing compiles into the bounded native instrument');
 start=performance.now();const out=await core.renderPCM({tracks:[track],durationSec:2,atlas});timings.twoSecondsMonoMs=performance.now()-start;
 assert.equal(out.left.length,96000);assert(out.left.every(Number.isFinite));assert(out.left.some(v=>Math.abs(v)>.001));assert(out.left.every(v=>Math.abs(v)<1));assert(out.left.slice(0,4800).every(v=>v===0));assert(out.left.slice(91200).every(v=>v===0));pass('Carrier duration and pauses survive; output is finite and bounded');
 const recipe=core.settings({...atlas.recipe,name:'Portable contour',material:atlas.material}),payload={schema:'xensonar.fractalia-instrument',version:2,recipe};
 const restored=core.importInstrument(JSON.parse(JSON.stringify(payload)));const a=await core.compile({instrument:recipe}),b=await core.compile({instrument:restored});assert.deepEqual(a.states,b.states);pass('Export/import restores the complete compiled timbre exactly');
 // Transfer means retaining identical material while a different score supplies
 // its own timing and pitch; there is no similarity score or taste threshold.
 const score={gainAt:t=>t>.2&&t<.7?.45:0,at:t=>({gain:t>.2&&t<.7?.45:0,hz:330})};
 const played=await core.renderPCM({tracks:[score],durationSec:1,atlas:b});assert.equal(played.left.length,48000);assert.deepEqual(played.atlas.material,atlas.material);assert(played.left.slice(0,9600).every(v=>v===0));assert(played.left.slice(33600).every(v=>v===0));pass('Same native instrument plays another score without inheriting the template melody');
 const silent=await core.renderPCM({tracks:[],durationSec:.2});assert(silent.left.every(v=>v===0));pass('Blank input remains silent');
 for(const body of ['prism','reed','hollow']){const compiled=await core.compile({tracks:[track],durationSec:2,instrument:{params:{body,depth:4,fold:1.5,brightness:1,motion:1}}});const rendered=await core.renderPCM({tracks:[track],durationSec:.4,atlas:compiled});assert(rendered.left.every(Number.isFinite))}pass('All three body processors render at their parameter extremes');
 let calls=0;await assert.rejects(core.renderPCM({tracks:[track],durationSec:2,atlas,check:()=>{if(++calls===3)throw new DOMException('Cancelled','AbortError')}}),e=>e.name==='AbortError');pass('Render cancellation propagates');
 assert.throws(()=>core.importInstrument({schema:'garbage'}));assert.throws(()=>core.settings({material:{schema:'xensonar.fractalia-material',version:2}}));pass('Malformed instrument imports are rejected');
 const legacy={schema:'xensonar.fractalia-atlas',version:1,recipe:{params:{depth:2,fold:.7,motion:.4}},states:[Array.from({length:8},()=>Array.from({length:1024},(_,i)=>Math.sin(i/1024*Math.PI*2)*.4))]};
 const migrated=core.importInstrument(legacy);assert.equal(migrated.material.legacyWaves.length,1);assert.equal((await core.compile({instrument:migrated})).modes.every(v=>v.gain===0),true);pass('F1 exported atlas files can be loaded as native material');
 const many=Array.from({length:6},(_,i)=>({gainAt:t=>t>.02&&t<7.95?.22:0,at:t=>({gain:t>.02&&t<7.95?.22:0,hz:110*2**(i/6)})}));start=performance.now();await core.renderPCM({tracks:many,durationSec:8,atlas});timings.eightSecondsSixVoicesMs=performance.now()-start;pass('Eight-second polyphonic render completes');
 fs.mkdirSync(path.join(root,'results'),{recursive:true});fs.writeFileSync(path.join(root,'results/f2-core.json'),JSON.stringify({checks,timings,perceptualAcceptance:'User listening judgement; no sound-difference or quality threshold used.'},null,2));console.log(timings);
})().catch(e=>{console.error(e);process.exitCode=1});
