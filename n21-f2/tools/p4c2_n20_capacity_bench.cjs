'use strict';
const fs=require('fs'),{performance}=require('node:perf_hooks'),assert=require('node:assert/strict'),read=p=>fs.readFileSync(p,'utf8');
const common=read('src/nodal/01_instrument_model.js')+'\n'+read('src/nodal/07_sound_designer.js');
const baseline=new Function(common+'\n'+read('tests/fixtures/p4c2_n6_baseline/02_synthesis_kernel.js')+';return createNodalSynthesisKernel;')();
const current=new Function(common+'\n'+read('src/nodal/02_synthesis_kernel.js')+'\n'+read('src/nodal/04_audio_runtime.js').split('function nodalWorkletProcessorFactory')[0]+';return {model:__XenNodalModel,starter:nodalOpenStarter,kernel:createNodalSynthesisKernel,costs:nodalLivePlanCosts};')();
const median=xs=>xs.slice().sort((a,b)=>a-b)[Math.floor(xs.length/2)],rows=[];
for(const rate of [48000,96000])for(const n of [3,7,12])for(const phase of ['held','gliss','tail']){
 const raw=current.starter('hollow'),instrument=current.model.normalize({...raw,nodes:Array.from({length:n},(_,i)=>({...raw.nodes[i%3],id:'n'+i,ratio:1+i*.071,excitationKind:['tone','impulse','breath'][i%3]}))}),plan=current.model.compile(instrument),cost=current.costs(plan,rate);
 const oldCount=Math.min(32,Math.floor(16/(phase==='tail'?cost.baseline*.75:cost.baseline))),newCount=Math.min(32,Math.floor((16+1e-9)/(phase==='tail'?cost.tail:cost.attack)));
 const variants=[{make:baseline,count:oldCount},{make:current.kernel,count:oldCount},{make:current.kernel,count:newCount}].map(v=>{
  const dsp=v.make(),pitches=Array.from({length:v.count},(_,i)=>173.137+i*13.731);dsp.preparePitches(plan,pitches,rate);
  return {...v,voices:pitches.map(frequency=>dsp.voice(plan,{frequency,gain:.15,held:true},rate)),pitches};
 });
 const l=new Float32Array(128),r=new Float32Array(128),runs=[[],[],[]],p95=[[],[],[]];
 function trial(v){
  v.voices.forEach((voice,i)=>voice.reset({frequency:v.pitches[i],gain:.15,held:true}));
  for(let b=0;b<10;b++)for(const voice of v.voices)voice.process(l,r);
  if(phase==='tail'){v.voices.forEach(voice=>voice.noteOff());for(let b=0;b<Math.ceil((plan.articulation.releaseSec+.01)*rate/128);b++)for(const voice of v.voices)voice.process(l,r);}
  let total=0;const times=[];
  for(let b=0;b<48;b++){
   l.fill(0);r.fill(0);const at=performance.now();
   if(phase==='gliss'&&b%4===0)v.voices.forEach((voice,i)=>voice.setFrequency(211.731+i*13.137+b*.137));
   for(const voice of v.voices)voice.process(l,r,0,128,true);
   const elapsed=performance.now()-at;total+=elapsed;times.push(elapsed);
  }
  assert(v.voices.every(voice=>!voice.ended),'Only sounding full voices/tails count');
  return {total,p95:times.sort((a,b)=>a-b)[Math.floor(times.length*.95)]};
 }
 for(let round=0;round<9;round++)for(const i of round%2?[2,1,0]:[0,1,2]){const x=trial(variants[i]);if(round>=4){runs[i].push(x.total);p95[i].push(x.p95);}}
 rows.push({rate,nodes:n,phase,n19Voices:oldCount,n20Voices:newCount,n6Ms:median(runs[0]),n19Ms:median(runs[1]),n20Ms:median(runs[2]),n20P95BlockMs:median(p95[2]),quantumMs:128/rate*1000,
  n20VsN6Ratio:median(runs[2])/median(runs[0]),fullCost:cost.attack,tailCost:cost.tail});
}
const report={scope:'Host Node '+process.version+'; full unchanged DSP. Five measured rounds after four warmups, alternating order. N6 historical protected load, N19 optimized DSP at old admission, N20 same DSP at recalibrated admission. One kernel benchmark excludes C11/RFL/drums/FX/UI and does not establish hardware deadlines.',rows};
fs.writeFileSync('results/p4c2-n20-capacity-bench.json',JSON.stringify(report,null,2)+'\n');
for(const rate of [48000,96000])for(const phase of ['held','gliss','tail']){const subset=rows.filter(x=>x.rate===rate&&x.phase===phase);console.log(rate,phase,'N20/N6 median',median(subset.map(x=>x.n20VsN6Ratio)).toFixed(3),'worst',Math.max(...subset.map(x=>x.n20VsN6Ratio)).toFixed(3),'max p95/quantum',Math.max(...subset.map(x=>x.n20P95BlockMs/x.quantumMs)).toFixed(3));}
