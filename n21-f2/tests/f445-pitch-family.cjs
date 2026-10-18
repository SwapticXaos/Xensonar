'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const prefix=read('src/nodal/01_instrument_model.js')+'\n'+read('src/nodal/07_sound_designer.js');
const before=new Function(prefix+'\n'+read('tests/fixtures/f444_baseline/02_synthesis_kernel.js')+';return {dsp:__XenNodalDSP};')();
let trigs=0;const measured=Object.create(Math);for(const n of ['cos','sin','tan'])measured[n]=(...a)=>{trigs++;return Math[n](...a);};
const now=new Function('Math',prefix+'\n'+read('src/nodal/02_synthesis_kernel.js')+';return {dsp:__XenNodalDSP,model:__XenNodalModel,starter:nodalOpenStarter};')(measured);
let cases=0;
for(const engine of [1,2])for(const sr of [44100,48000,96000]){
 const base=now.starter('hollow'),i=now.model.normalize({...base,schemaVersion:engine,kernelVersion:'coupled-modal-v'+engine}),p=now.model.compile(i),hzs=[97.321,220,330.123,11000];
 const reused=now.dsp.voice(p,{},sr);
 const particles=Array.from({length:32},(_,k)=>110+k*7.123);
 for(let k=0;k<80;k++)now.dsp.preparePitches(p,[...particles,1000+k,1500+k,2000+k,2500+k],sr);
 // D5 already moved V1's seed-phase cosine from every sample to reset().
 // This is not pitch-coefficient work; permit that fixed per-node seed cost.
 const seedPhaseTrigs=engine===1?p.nodes.length:0;
 trigs=0;reused.reset({frequency:particles[0]});assert.equal(trigs,seedPhaseTrigs,'changing wave roots must retain current particle pitch coefficients');
 now.dsp.preparePitches(p,hzs,sr);
 for(const hz of hzs)for(const custom of [false,true]){
  const options={frequency:hz,velocity:.72,gain:.4,durationSec:.071,...(custom?{pitchCurve:[.1,-.1,.125],seed:9121}:{})};
  trigs=0;reused.reset(options);if(!custom)assert.equal(trigs,seedPhaseTrigs,'prewarmed Note-On must copy coefficients without pitch trigonometry');
  const a=new Float32Array(24000),b=new Float32Array(24000),l=new Float32Array(24000),r=new Float32Array(24000),reference=before.dsp.voice(p,options,sr);
  reused.process(a,b,0,4000);reference.process(l,r,0,4000);reused.setFrequency(443.123);reference.setFrequency(443.123);
  reused.process(a,b,4000,20000);reference.process(l,r,4000,20000);
  assert.deepEqual(a,l);assert.deepEqual(b,r);cases++;
 }
}
const report={cases,pcm:'bit-identical to F443 including custom-seed/custom-contour bypass and glissandi',warmedOnsetPitchTrigonometry:0,seedPhasePreparation:'V1 permits one seed-phase cosine per node, already present in P4C1/D5'};fs.writeFileSync(path.join(root,'results/f445-pitch-family.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS',report);
