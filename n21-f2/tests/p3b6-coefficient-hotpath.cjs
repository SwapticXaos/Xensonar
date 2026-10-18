'use strict';
// Side-by-side P3B5 acoustic reference: glissandi, static tones and multiple V2 follow policies.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=fs.readFileSync('src/nodal/01_instrument_model.js','utf8');
const starter=fs.readFileSync('src/nodal/07_sound_designer.js','utf8');
const reference=fs.readFileSync('tests/fixtures/f444_baseline/02_synthesis_kernel.js','utf8');
const current=fs.readFileSync('src/nodal/02_synthesis_kernel.js','utf8');
function load(kernel){
 const calls={log:0,pow:0,cos:0,sin:0};
 const math=new Proxy(Math,{get(obj,key){const v=obj[key];if(key in calls)return (...args)=>{calls[key]++;return v(...args);};return v;}});
 const code=model+'\n'+kernel+'\n'+starter+'\n({model:__XenNodalModel,dsp:__XenNodalDSP,starter:nodalOpenStarter})';
 return {api:vm.runInNewContext(code,{Math:math,Float32Array,Float64Array,Int8Array,Uint32Array,Map,Set,Array,Number,Object,JSON,Error}),calls};
}
const old=load(reference),now=load(current);let samples=0;
for(const name of ['prism','hollow','reed','ember'])for(const sr of [44100,48000,96000]){
 const raw=now.api.starter(name);const plan=now.api.model.compile(now.api.model.normalize(raw));
 const oldPlan=old.api.model.compile(old.api.model.normalize(raw));
 for(const mode of ['still','gliss']){
  const opts={frequency:101.321,velocity:.55,gain:.32,held:true,durationSec:.2};
  const x=old.api.dsp.voice(oldPlan,opts,sr),y=now.api.dsp.voice(plan,opts,sr);
  const a=new Float32Array(2048),b=new Float32Array(2048),c=new Float32Array(2048),d=new Float32Array(2048);
  for(let pos=0;pos<2048;pos+=64){
   if(mode==='gliss'){const freq=101.321*Math.pow(2,((pos/64)%19)/13);x.setFrequency(freq);y.setFrequency(freq);}
   x.process(a,b,pos,64,true);y.process(c,d,pos,64,true);
  }
  assert.deepEqual(c,a,`Left PCM changed ${name} ${sr} ${mode}`);
  assert.deepEqual(d,b,`Right PCM changed ${name} ${sr} ${mode}`);
  samples+=4096;
 }
}
assert(now.calls.log<old.calls.log*.8,`Expected at least 20% fewer log() calls, actual ${old.calls.log} -> ${now.calls.log}`);
assert(now.calls.pow<old.calls.pow*.8,`Expected at least 20% fewer pow() calls, actual ${old.calls.pow} -> ${now.calls.pow}`);
console.log('PASS P3B6 V2 PCM bit-identical, samples='+samples+', log '+old.calls.log+' -> '+now.calls.log+', pow '+old.calls.pow+' -> '+now.calls.pow);
