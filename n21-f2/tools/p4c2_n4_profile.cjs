'use strict';
const fs=require('node:fs'),read=p=>fs.readFileSync(p,'utf8');
const current=process.argv.includes('--current');
const source=['src/nodal/01_instrument_model.js','src/nodal/07_sound_designer.js',current?'src/nodal/02_synthesis_kernel.js':'tests/fixtures/p4c2_n3_baseline/02_synthesis_kernel.js'].map(read).join('\n');
const api=new Function(source+';return {model:__XenNodalModel,dsp:__XenNodalDSP,starter:nodalOpenStarter};')();
let checksum=0;
for(const phase of ['held','lateTail','attacks']){
 const instrument=api.starter('hollow'),plan=api.model.compile(instrument),frequencies=[173.137,231.731,319.291,417.131];api.dsp.preparePitches(plan,frequencies,48000);
 const voices=Array.from({length:8},(_,i)=>api.dsp.voice(plan,{frequency:frequencies[i%4],held:true,gain:.15},48000)),left=new Float32Array(128),right=new Float32Array(128);
 for(let round=0;round<8;round++){
  voices.forEach((v,i)=>v.reset({frequency:frequencies[i%4],held:true,gain:.15}));
  for(let i=0;i<40;i++)for(const v of voices)v.process(left,right);
  if(phase==='lateTail'){voices.forEach(v=>v.noteOff());for(let i=0;i<90;i++)for(const v of voices)v.process(left,right);}
  for(let block=0;block<160;block++){
   if(phase==='attacks'&&block%4===0)voices.forEach((v,i)=>v.reset({frequency:frequencies[(i+block)%4],held:true,gain:.15}));
   for(const v of voices)v.process(left,right,0,128,true);checksum+=left[block%128];
  }
 }
}
console.log(JSON.stringify({version:current?'P4C2-N4':'P4C2-N3',phases:['held','lateTail','attacks'],voices:8,sampleRate:48000,checksum}));
