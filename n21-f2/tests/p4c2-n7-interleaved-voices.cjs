'use strict';
// Independent N6 reference, alternated voices and irregular caller blocks.
// This catches contamination through the new renderer-wide scratch as well
// as the shared first-band/dry noise-stream ordering.
const fs=require('node:fs'),assert=require('node:assert/strict'),read=f=>fs.readFileSync(f,'utf8');
const common=read('src/nodal/01_instrument_model.js')+'\n'+read('src/nodal/07_sound_designer.js');
const engines=['tests/fixtures/p4c2_n6_baseline/02_synthesis_kernel.js','src/nodal/02_synthesis_kernel.js'].map(f=>new Function(common+'\n'+read(f)+';return {model:__XenNodalModel,dsp:__XenNodalDSP,starter:nodalOpenStarter};')());
let samples=0,states=0;
for(const rate of [8000,44100,48000,96000,192000]){
 const raw=engines[0].starter('reed');
 const instruments=Array.from({length:6},(_,i)=>({...raw,seed:913+i,material:{...raw.material,natural:(i%3)/2,body:i%2?.37:1,follow:i%2?.37:1,width:i%2?1:0},nodes:Array.from({length:[1,3,7,12,3,7][i]},(_,j)=>({...raw.nodes[j%3],id:'voice'+i+'node'+j,excitationKind:['breath','impulse','tone'][(i+j)%3],ratio:1+j*.137}))}));
 const plans=engines.map(e=>instruments.map(x=>e.model.compile(e.model.normalize(x))));
 for(let e=0;e<2;e++)for(let i=0;i<6;i++)engines[e].dsp.installPrepared(plans[e][i],structuredClone(engines[e].dsp.preparePacket(plans[e][i],[173.137],rate,true)),rate);
 const voices=engines.map((e,index)=>plans[index].map((p,i)=>e.dsp.voice(p,{frequency:173.137,held:i%2===0,durationSec:.021,seed:i===2?17731:instruments[i].seed,...(i===4?{pitchCurve:[.1,-.2,.3],volumeCurve:[.1,1,.2]}:{})},rate)));
 const buffers=Array.from({length:4},()=>new Float32Array(300)),sizes=[1,15,16,17,31,127,128,129,257];
 for(let step=0;step<180;step++)for(let v=0;v<6;v++){
  if(step===21||step===57)voices.forEach(x=>x[v].setFrequency(137.913+(v+step)*7.137));
  if(step===23)voices.forEach(x=>x[v].noteOff());
  if(step===91)voices.forEach(x=>x[v].reset({frequency:233.137+v*3.719,held:true,seed:57313+v}));
  const count=sizes[(step+v)%sizes.length],stereo=step%3,add=step%2===0;
  for(let b=0;b<4;b++)buffers[b].fill(.001*(b%2?-1:1));
  for(let e=0;e<2;e++)voices[e][v].process(buffers[e*2],stereo===0?null:stereo===1?buffers[e*2]:buffers[e*2+1],3,count,add);
  assert.deepEqual(buffers[2],buffers[0],rate+'/'+v+'/'+step+'/L');assert.deepEqual(buffers[3],buffers[1],rate+'/'+v+'/'+step+'/R');
  assert.deepEqual(voices[1][v].snapshot(),voices[0][v].snapshot());samples+=count*(stereo===2?2:1);states++;
 }
}
fs.writeFileSync('results/p4c2-n7-interleaved-voices.json',JSON.stringify({sampleRates:5,simultaneousTimbres:6,channelSampleValues:samples,stateComparisons:states,result:'bit-identical to N6 under interleaved mode-major rendering, shared RNG streams and arbitrary blocks'},null,2)+'\n');
console.log('PASS N7 interleaved voices: '+samples+' exact sample values, '+states+' exact states');
