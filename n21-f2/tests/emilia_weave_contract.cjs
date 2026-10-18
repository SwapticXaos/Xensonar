'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const {harness,rms,root}=require('./emilia3_harness.cjs'),{api,model,dsp,context}=harness();
const base=api.snapshot(),compile=r=>{context.__input=r;return vm.runInContext('compileEmiliaNetworkColor(__input.model)',context)};
const layout=x=>api.normalized({...base.model,nodes:base.model.nodes.map((n,i)=>({...n,ratio:1,x:x+[-.015,0,.015][i],y:[.25,.48,.72][i]}))});
function partialFingerprint(pcm,sr,hz){
 const start=Math.floor(sr*.55),end=Math.floor(sr*.95),power=[];
 for(let h=1;h<=24;h++){let re=0,im=0;for(let i=start;i<end;i++){const w=.5-.5*Math.cos(2*Math.PI*(i-start)/(end-start-1)),a=2*Math.PI*hz*h*i/sr;re+=pcm[i]*w*Math.cos(a);im+=pcm[i]*w*Math.sin(a);}power.push(re*re+im*im);}
 const total=power.reduce((a,b)=>a+b,0);return power.map(p=>p/Math.max(1e-20,total));
}
(async()=>{
 const report={engine:api.ENGINE,checks:[],characterProbes:[]};const check=s=>{report.checks.push(s);console.log('CHECK',s)};
 const renders=[];
 for(const x of [.055,.20,.40,.60,.80,.945]){
  const recipe=layout(x),sound=await api.renderPCM({instrument:recipe,tracks:[{at:()=>({hz:220,gain:.6})}],durationSec:1,sampleRate:24000});assert(sound.left.every(Number.isFinite));assert(rms(sound.left)>.003);
  const f=partialFingerprint(sound.left,24000,220);assert(f[0]<.65,'Regression: rich source collapsed to a nearly pure fundamental');
  report.characterProbes.push({x,normalizedPartialEnergy:f});renders.push(sound.left);
 }
 check('Actual sustained Carrier output retains material beyond a near-sinusoidal fundamental');
 // Compare amplitude profiles at identical pitch. Global gain and phase alone
 // cannot satisfy this check. It catches the specific old failure, not beauty.
 for(let i=0;i<6;i++)for(let j=i+1;j<6;j++){
  const a=report.characterProbes[i].normalizedPartialEnergy,b=report.characterProbes[j].normalizedPartialEnergy;
  const difference=a.reduce((s,v,k)=>s+Math.abs(v-b[k]),0);assert(difference>.07,`Source families ${i}/${j} lost spectral identity`);
 }
 check('Different field regions alter actual harmonic balance, beyond phase or loudness');
 const p=compile(layout(.4));assert.equal(p.emiliaWeave.sources.length,3);assert.equal(p.emiliaWeave.sources[0].partials.length,32);
 const args={frequency:220,held:true,expression:.6,velocity:.84,gain:.68,offlineDurationSec:2},a=dsp.voice(p,args,24000),b=dsp.voice(p,args,24000),one=new Float32Array(12000),blocks=new Float32Array(12000);a.process(one);
 for(let i=0;i<blocks.length;i+=37)b.process(blocks,null,i,Math.min(37,blocks.length-i));assert.deepEqual(one,blocks);
 const factory=vm.runInContext('createNodalSynthesisKernel',context),standalone=vm.runInNewContext('('+factory.toString()+')()');const v=standalone.voice(p,args,24000),serialized=new Float32Array(one.length);v.process(serialized);assert.deepEqual(one,serialized);check('Own-state voice is deterministic and survives factory serialization');
 // The graph participates in the source itself. Inspect actual source/body
 // routing with the same profile and pickup, only links disabled.
 const connected=compile(layout(.4)),disconnected={...connected,emiliaWeave:{...connected.emiliaWeave,links:[[],[],[]]}};
 const ca=dsp.voice(connected,args,24000),cb=dsp.voice(disconnected,args,24000),aa=new Float32Array(12000),bb=new Float32Array(12000);ca.process(aa);cb.process(bb);
 assert.notDeepEqual(aa,bb);check('Source-to-source spatial connections affect rendered waveforms');
 let seven=base;while(seven.model.nodes.length<7)seven=api.createNode(seven,['drive','fold','sub','formant'][seven.model.nodes.length-3]);
 const dense=api.normalized({...seven.model,nodes:seven.model.nodes.map((n,i)=>({...n,x:(i%3)/2,y:i/6,excitation:1,strength:2}))});
 const densePlan=compile(dense);for(const sr of [8000,24000,48000,96000])for(const hz of [35,220,2800,10000]){
  const vv=dsp.voice(densePlan,{frequency:hz,held:true,expression:1,velocity:1,gain:1},sr),pcm=new Float32Array(Math.floor(sr*.20));vv.process(pcm);assert(pcm.every(Number.isFinite));assert.equal(vv.snapshot().faults,0);assert(pcm.every(x=>Math.abs(x)<1));
 }check('All seven nodes process safely across 16 rate/register conditions');
 a.noteOff();const tail=new Float32Array(16000);a.process(tail);assert(a.ended);assert.equal(rms(tail,12000),0);check('Carrier note-off ends sound without an autonomous source gate');
 const old=vm.createContext({Math,Float32Array,Float64Array,Uint32Array});vm.runInContext(fs.readFileSync(path.join(root,'tests/fixtures/emilia_material_legacy_kernel.js'),'utf8')+';globalThis.original=__XenNodalDSP;',old);
 for(const kind of ['tone','impulse','breath']){const pp=model.compile({...base.model,excitation:{kind,level:.65}}),opt={frequency:196,durationSec:.23,velocity:.7};assert.deepEqual(dsp.render(pp,opt,24000).pcm,old.original.render(pp,opt,24000).pcm);}check('Original Nodal V1 sound remains byte-identical');
 api.set(base);api.loadProject(null);assert.equal(api.semanticKey(api.snapshot()),api.semanticKey(base));check('Blank Carrier entry retains the current constellation');
 const silence=await api.renderPCM({instrument:base,tracks:[{at:()=>({hz:220,gain:0})}],durationSec:.2,sampleRate:24000});assert.equal(rms(silence.left),0);check('Empty Carrier stays exactly silent');
 fs.writeFileSync(path.join(root,'results/weave_contract.json'),JSON.stringify(report,null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1});
