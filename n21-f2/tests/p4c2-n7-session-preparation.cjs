'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(f,'utf8'),kernel=read('src/nodal/02_synthesis_kernel.js');
const api=new Function(read('src/nodal/01_instrument_model.js')+'\n'+read('src/nodal/07_sound_designer.js')+';return {model:__XenNodalModel,starter:nodalOpenStarter};')();
function engine(){
 const counts={exp:0,typedArrays:0},math=Object.create(Math);
 math.exp=x=>{counts.exp++;return Math.exp(x)};
 const types=['Float64Array','Float32Array','Uint32Array','Int8Array'].map(name=>new Proxy(globalThis[name],{construct(T,args){counts.typedArrays++;return Reflect.construct(T,args,T)}}));
 return {dsp:new Function('Math','Float64Array','Float32Array','Uint32Array','Int8Array',kernel+';return createNodalSynthesisKernel();')(math,...types),counts,clear(){counts.exp=counts.typedArrays=0}};
}
const rows=[];let compared=0;
for(const rate of [8000,44100,48000,96000,192000]){
 const worker=engine(),renderer=engine();
 const plans=['hollow','prism','reed'].map(name=>api.model.compile(api.starter(name)));
 const packets=plans.map(plan=>worker.dsp.preparePacket(plan,[173.137,317.731],rate,true));
 const shared=packets[0].template.rateLaws;
 assert(packets.every(p=>p.template.rateLaws===shared),'one rate law per preparer session, across timbres');
 assert.equal(shared.impulse.length,Math.ceil(rate*.004));assert.equal(shared.dry.length,Math.ceil(rate*.020));
 for(let i=0;i<shared.impulse.length;i++)assert(Object.is(shared.impulse[i],Math.exp(-i/(rate*.0008))));
 for(let i=0;i<shared.dry.length;i++)assert(Object.is(shared.dry[i],Math.exp(-i/(rate*.002))));
 const voices=[];
 for(let i=0;i<plans.length;i++){
  renderer.dsp.installPrepared(plans[i],structuredClone(packets[i]),rate);renderer.clear();
  for(let j=0;j<4;j++)voices.push(renderer.dsp.voice(plans[i],{frequency:j%2?173.137:317.731,held:true},rate));
  assert.equal(renderer.counts.exp,0,'prepared pool construction cannot recalculate transient laws or damping');
 }
 assert(voices.every(v=>v.getTemplate().rateLaws===voices[0].getTemplate().rateLaws),'one installed rate law across all plans/pool states');
 const left=new Float32Array(128),right=new Float32Array(128);
 renderer.clear();
 const frames=Math.floor(rate*.020);
 for(let at=0;at<frames;at+=128)for(const v of voices)v.process(left,right,0,Math.min(128,frames-at));
 assert.equal(renderer.counts.exp,0,'prepared first 20 ms of all onsets require no exponential evaluations');
 assert.equal(renderer.counts.typedArrays,0,'block DSP never allocates typed arrays');
 // Changing coefficients, natural release and pooled resets retain the same
 // preallocated workspace, including CV-segment boundaries.
 for(let i=0;i<voices.length;i++){voices[i].setFrequency(211.137+i*1.371);if(i%2)voices[i].noteOff();}
 renderer.clear();for(let i=0;i<20;i++)for(const v of voices)v.process(left,right);
 assert.equal(renderer.counts.typedArrays,0,'gliding/releasing blocks never allocate typed arrays');
 rows.push({rate,voices:voices.length,sharedLawBytes:shared.impulse.byteLength+shared.dry.byteLength,onsetFramesWithoutExp:frames,renderTypedArrayAllocations:renderer.counts.typedArrays});compared+=frames*voices.length*2;
 // Reject a packet accidentally prepared for another audio context/rate.
 const bad=structuredClone(packets[0]);bad.template.rateLaws.rate=rate+1;
 assert.throws(()=>renderer.dsp.installPrepared(plans[0],bad,rate),/excitation preparation/);
}
fs.writeFileSync('results/p4c2-n7-session-preparation.json',JSON.stringify({rows,channelValues:compared,result:'shared exact-rate laws, no constructor exp after Worker install, no render typed-array allocation'},null,2)+'\n');
console.log('PASS N7 session preparation: 5 rates, 3 timbres, 12 pooled voices; shared exact laws and allocation-free block scratch');
