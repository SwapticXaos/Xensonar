'use strict';
// Mechanistic CPU-work regression and acoustic identity, NOT a burst detector.
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
function engine(file){
 const count={exp:0,sqrt:0},math=Object.create(Math);
 for(const key of Object.keys(count))math[key]=(...args)=>{count[key]++;return Math[key](...args);};
 const api=new Function('Math',read('src/nodal/01_instrument_model.js')+'\n'+read(file)+'\n'+read('src/nodal/07_sound_designer.js')+';return {model:__XenNodalModel,dsp:__XenNodalDSP,starter:nodalOpenStarter};')(math);
 return {api,count};
}
const base=engine('tests/fixtures/p4c1_nodal_baseline/02_synthesis_kernel.js'),now=engine('src/nodal/02_synthesis_kernel.js');
let compared=0;
for(const preset of ['hollow','reed','prism','ember'])for(const rate of [44100,48000,96000])for(const mode of ['plain','gliss','contour']){
 const raw=now.api.starter(preset),plans=[base,now].map(e=>e.api.model.compile(e.api.model.normalize(raw)));
 const options={frequency:197.371,velocity:.73,gain:.27,held:true,durationSec:.19,...(mode==='contour'?{pitchCurve:[0,.15,-.12],volumeCurve:[.3,1,.1],seed:9283}:{})};
 const voices=[base,now].map((e,i)=>e.api.dsp.voice(plans[i],options,rate));
 const left=[new Float32Array(128*40),new Float32Array(128*40)],right=left.map(a=>new Float32Array(a.length));
 for(let block=0;block<40;block++){
  if(mode==='gliss'&&block%3===0)voices.forEach(v=>v.setFrequency(197.371*Math.pow(2,(block%13)/17)));
  if(block===15)voices.forEach(v=>v.noteOff());
  for(let i=0;i<2;i++)voices[i].process(left[i],right[i],block*128,128,true);
 }
 assert.deepEqual(left[1],left[0],`${preset}/${rate}/${mode}/left`);assert.deepEqual(right[1],right[0],`${preset}/${rate}/${mode}/right`);
 assert.deepEqual(voices[1].snapshot(),voices[0].snapshot());compared+=left[0].length*2;
}
const voices=[base,now].map(e=>e.api.dsp.voice(e.api.model.compile(e.api.starter('hollow')),{held:true},48000));
// Exercise configurable register/follow/body and mixed excitation independently
// of the default presets, including larger plans and exact silent output.
for(const nodes of [1,7,12])for(const follow of [0,.35,1])for(const body of [0,1]){
 const starter=now.api.starter('hollow'),raw={...starter,material:{...starter.material,follow,body,width:body?0:1},nodes:Array.from({length:nodes},(_,i)=>({...starter.nodes[i%3],id:'n'+i,ratio:1+i*.073,excitationKind:['tone','impulse','breath'][i%3]}))};
 const plans=[base,now].map(e=>e.api.model.compile(e.api.model.normalize(raw)));
 const pair=[base,now].map((e,i)=>e.api.dsp.voice(plans[i],{},48000));
 for(const velocity of [0,.43]){
  pair.forEach(v=>v.reset({frequency:123.417,held:true,gain:.51,velocity,seed:91437,volumeCurve:[1,.4,.9]}));
  const pcm=pair.map(v=>{const left=new Float32Array(1024),right=new Float32Array(1024);v.process(left,right,0,384);v.setFrequency(211.713);v.noteOff();v.process(left,right,384,640);return {left,right};});
  assert.deepEqual(pcm[1],pcm[0]);compared+=2048;
 }
}
for(const e of [base,now])for(const key of Object.keys(e.count))e.count[key]=0;
for(const v of voices)v.process(new Float32Array(256),new Float32Array(256));
assert(now.count.exp<base.count.exp/3,`Repeated attack exponentials remain: ${base.count.exp} -> ${now.count.exp}`);
assert.equal(now.count.sqrt,0,'Node normalization must not be recalculated in the sample loop');
console.log('PASS P4C2 Nodal V2: '+compared+' stereo PCM samples bit-identical including gliss/contours/tails; exp '+base.count.exp+' -> '+now.count.exp+', sqrt '+base.count.sqrt+' -> '+now.count.sqrt);
