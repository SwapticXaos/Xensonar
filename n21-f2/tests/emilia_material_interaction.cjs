'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {harness,rms,distance,root}=require('./emilia3_harness.cjs');
const {context,api,model,dsp}=harness(),base=api.snapshot();
const compile=r=>{context.__recipe=r;return vm.runInContext('compileEmiliaNetworkColor(__recipe.model)',context)};
const metrics={},checks=[];
function pass(name){checks.push(name);console.log('PASS',name)}
function render(plan,expression=.65,sr=24000,seconds=1.2){const v=dsp.voice(plan,{frequency:220,held:true,expression,velocity:.84,gain:.68,offlineDurationSec:seconds+1},sr),pcm=new Float32Array(Math.round(sr*seconds));v.process(pcm);return{pcm,state:v.snapshot()};}
const match=(a,b)=>Float32Array.from(b,x=>x*rms(a)/Math.max(1e-12,rms(b)));
const make=(xy)=>api.normalized({...base.model,nodes:base.model.nodes.map((n,i)=>({...n,x:xy[i][0],y:xy[i][1],ratio:1}))});
const a=compile(make([[.18,.22],[.33,.38],[.40,.16]])),b=compile(make([[.58,.74],[.86,.90],[.72,.58]]));
assert.equal(a.bands.length,6);assert.equal(a.emiliaMaterial.ports.length,6);pass('Six shared modal registers with three distinct spatial input ports');
const normal=render(a),off=render({...a,emiliaMaterial:{...a.emiliaMaterial,feedback:0}});
metrics.feedbackDifference=distance(normal.pcm,match(normal.pcm,off.pcm));
assert(metrics.feedbackDifference>.004,'Feedback must affect the rendered signal beyond gain alone');pass('Measured resonator state changes the source, survives level matching');
function sourceProfile(plan,kind){return {...plan,emiliaMaterial:{...plan.emiliaMaterial,sources:plan.emiliaMaterial.sources.map(p=>({...p,harmonic:kind===0?p.harmonic*.95:p.harmonic*.28,impulse:kind===0?p.impulse*.25:p.impulse,friction:kind===0?p.friction*.15:p.friction*1.5}))}};}
const a0=render(sourceProfile(a,0)).pcm,a1=render(sourceProfile(a,1)).pcm,b0=render(sourceProfile(b,0)).pcm,b1=render(sourceProfile(b,1)).pcm;
const b1m=match(a0,b1),b0m=match(a0,b0),a1m=match(a0,a1);
const interaction=Float32Array.from(a0,(x,i)=>(x-a1m[i])-(b0m[i]-b1m[i]));
metrics.interactionRms=rms(interaction)/rms(a0);metrics.geometryDifference=distance(a0,b0m);
console.log("INTERACTION",metrics);assert(metrics.interactionRms>.12);assert(metrics.geometryDifference>.25);pass('Two source profiles × two geometries produce a non-additive interaction');
const quiet=render(a,.14).pcm,loud=render(a,.9).pcm;
metrics.expressionDifference=distance(quiet,match(quiet,loud));assert(metrics.expressionDifference>.015);pass('Carrier intensity changes material response beyond output volume');
const v=dsp.voice(b,{frequency:220,held:true,expression:.9,releaseSec:.11},16000);
v.process(new Float32Array(16000));assert(v.setExcitation(.1));assert(!v.setExcitation(NaN));assert(v.setFrequency(440));v.process(new Float32Array(4000));
assert(Math.abs(v.snapshot().frequency-440)<.1);assert(v.snapshot().expression<.101);
v.noteOff();const tail=new Float32Array(5000);v.process(tail);assert(v.ended);assert.equal(rms(tail,3000),0);pass('Pitch follows Carrier; controlled excitation and note-off have no autonomous sustain');
// Serialization is the path used by the AudioWorklet factory.
const factory=vm.runInContext('createNodalSynthesisKernel',context),serialized=vm.runInNewContext('('+factory.toString()+')()',{Math,Float32Array,Float64Array,Uint32Array,Array,Number,Error});
const vv=serialized.voice(a,{frequency:220,held:true,expression:.65,velocity:.84,gain:.68,offlineDurationSec:2.2},24000),serializedPCM=new Float32Array(normal.pcm.length);vv.process(serializedPCM);assert.deepEqual(serializedPCM,normal.pcm);pass('Serialized DSP factory reproduces offline PCM exactly');
const block=dsp.voice(a,{frequency:220,held:true,expression:.65,velocity:.84,gain:.68,offlineDurationSec:2.2},24000),blocked=new Float32Array(normal.pcm.length);for(let i=0;i<blocked.length;i+=37)block.process(blocked,null,i,Math.min(37,blocked.length-i));assert.deepEqual(blocked,normal.pcm);pass('DSP has identical output across arbitrary block boundaries');
// Compare the complete unchanged V1 synthesis branch against the actual parent
// file. This is stronger than checking that it still returns non-silent audio.
const oldContext=vm.createContext({Math,Number,Array,Float32Array,Float64Array,Uint32Array,Error});
vm.runInContext(fs.readFileSync(path.join(root,'tests/fixtures/emilia_material_legacy_kernel.js'),'utf8')+';globalThis.dsp=__XenNodalDSP;',oldContext);
for(const kind of ['tone','impulse','breath'])for(const sr of [16000,48000]){
 const p=model.compile({...base.model,excitation:{kind,level:.65}}),opts={frequency:196,durationSec:.23,velocity:.7};
 assert.deepEqual(dsp.render(p,opts,sr).pcm,oldContext.dsp.render(p,opts,sr).pcm);
}pass('Original Nodal V1 PCM is byte-identical for tone, impulse and breath');
let seven=base;while(seven.model.nodes.length<7)seven=api.createNode(seven,['drive','fold','sub','formant'][seven.model.nodes.length-3]);
const dense=api.normalized({...seven.model,nodes:seven.model.nodes.map((n,i)=>({...n,x:(i%3)/2,y:i/6,strength:2,excitation:1}))});
metrics.stability=[];
for(const sr of [8000,24000,48000,96000])for(const hz of [35,220,2800,10000]){
 const p=compile(dense),voice=dsp.voice(p,{frequency:hz,held:true,expression:1,velocity:1,gain:1},sr),data=new Float32Array(Math.round(sr*.28));voice.process(data);
 assert(data.every(Number.isFinite));assert.equal(voice.snapshot().faults,0);const peak=data.reduce((m,x)=>Math.max(m,Math.abs(x)),0);assert(peak<1);
 metrics.stability.push({sr,hz,peak,peakInternal:voice.snapshot().peakInternal});
}pass('Seven-node dense body remains finite and bounded across 16 rate/register combinations');
(async()=>{
 const carrier={at:t=>({hz:220,gain:t<.5?.3:0})};const before=await api.renderPCM({instrument:base,tracks:[carrier],durationSec:.85,sampleRate:16000});
 const after=await api.renderPCM({instrument:api.normalized(JSON.parse(JSON.stringify(base))),tracks:[carrier],durationSec:.85,sampleRate:16000});assert.deepEqual(before.left,after.left);
 const zero=await api.renderPCM({instrument:base,tracks:[{at:()=>({hz:220,gain:0})}],durationSec:.2,sampleRate:16000});assert.equal(rms(zero.left),0);pass('Saved constellation reproduces Carrier rendering; empty Carrier stays silent');
 fs.writeFileSync(path.join(root,'results/emilia_material_interaction.json'),JSON.stringify({engine:api.ENGINE,checks,metrics},null,2));console.log(JSON.stringify({checks:checks.length,metrics},null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1});
