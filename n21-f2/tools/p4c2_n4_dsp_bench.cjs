'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks'),read=p=>fs.readFileSync(p,'utf8');
const common=read('src/nodal/01_instrument_model.js')+'\n'+read('src/nodal/07_sound_designer.js');
const load=file=>new Function(common+'\n'+read(file)+';return {model:__XenNodalModel,dsp:__XenNodalDSP,starter:nodalOpenStarter};')();
const baselineArg=process.argv.find(a=>a.startsWith('--baseline='));
const candidateArg=process.argv.find(a=>a.startsWith('--candidate=')),outputArg=process.argv.find(a=>a.startsWith('--output='));
const engines=[load(baselineArg?baselineArg.slice(11):'tests/fixtures/p4c2_n3_baseline/02_synthesis_kernel.js'),load(candidateArg?candidateArg.slice(12):'src/nodal/02_synthesis_kernel.js')],quick=process.argv.includes('--quick');
const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)],rows=[];
for(const name of quick?['hollow','mixed7']:['hollow','reed','prism','mixed7','mixed12'])for(const phase of ['attacks','held','lateTail','gliss']){
 const variants=engines.map(api=>{
  let instrument=api.starter(name.startsWith('mixed')?'hollow':name);
  if(name.startsWith('mixed'))instrument=api.model.normalize({...instrument,nodes:Array.from({length:Number(name.slice(5))},(_,i)=>({...instrument.nodes[i%3],id:'n'+i,ratio:1+i*.071,excitationKind:['tone','impulse','breath'][i%3]}))});
  const plan=api.model.compile(instrument),cost=Math.max(plan.cost,Math.ceil(plan.nodes.length/2)),count=Math.min(8,Math.floor(16/cost));
  const pitches=Array.from({length:16},(_,i)=>110.137*Math.pow(2,i/17));api.dsp.preparePitches(plan,pitches,48000);
  const lateStart=Math.round(Math.max(plan.articulation.releaseSec+.015,plan.tailSec*.25)*48000),blocks=phase==='lateTail'?Math.min(100,Math.floor((Math.round(plan.tailSec*48000)-lateStart-256)/128)):100;assert(blocks>=16,'benchmark must contain actual sounding tails');
  return{plan,count,pitches,lateStart,blocks,voices:Array.from({length:count},(_,i)=>api.dsp.voice(plan,{frequency:pitches[i],gain:.15,held:true},48000))};
 });
 const left=new Float32Array(128),right=new Float32Array(128),times=[[],[]],p95=[[],[]];
 function trial(v){
  const {voices,pitches,blocks}=v;voices.forEach((voice,i)=>voice.reset({frequency:pitches[i],gain:.15,held:true}));
  for(let i=0;i<32;i++)for(const voice of voices)voice.process(left,right);
  if(phase==='lateTail'){voices.forEach(voice=>voice.noteOff());for(let i=0;i<v.lateStart;i+=128)for(const voice of voices)voice.process(left,right,0,Math.min(128,v.lateStart-i));}
  const blocksMs=[];let elapsed=0;
  for(let block=0;block<blocks;block++){
   left.fill(0);right.fill(0);const at=performance.now();
   if(phase==='attacks'&&block%4===0)voices.forEach((voice,i)=>voice.reset({frequency:pitches[(i+block)%16],gain:.15,held:true}));
   if(phase==='gliss'&&block%4===0)voices.forEach((voice,i)=>voice.setFrequency(110.137+i*13.719+block*.131));
   for(const voice of voices)voice.process(left,right,0,128,true);
   const ms=performance.now()-at;elapsed+=ms;blocksMs.push(ms);
  }
  if(phase==='lateTail')assert(voices.every(voice=>!voice.ended),'idle or truncated tails must not masquerade as faster DSP');
  blocksMs.sort((a,b)=>a-b);return{elapsed,p95:blocksMs[Math.floor(blocksMs.length*.95)]};
 }
 for(let round=0;round<9;round++)for(const index of round%2?[1,0]:[0,1]){const r=trial(variants[index]);if(round>=2){times[index].push(r.elapsed);p95[index].push(r.p95);}}
 const a=median(times[0]),b=median(times[1]);rows.push({name,phase,voices:variants[0].count,nodes:variants[0].plan.nodes.length,framesPerRound:variants[0].blocks*128,beforeMs:a,afterMs:b,changePercent:100*(b/a-1),beforeP95BlockMs:median(p95[0]),afterP95BlockMs:median(p95[1]),runs:times});
 console.log(name,phase,a.toFixed(2),b.toFixed(2),(100*(b/a-1)).toFixed(1)+'%');
}
const report={scope:'Node '+process.version+'; actual Nodal V2 process with existing surface budget at 48 kHz. Alternating order, two warmups, seven measured rounds. Tail timing contains sounding, untruncated natural tails. Excludes browser deadlines, UI, other lanes and device. No polyphony/burst-free claim.',rows};fs.writeFileSync(outputArg?outputArg.slice(9):'results/p4c2-n4-dsp-bench.json',JSON.stringify(report,null,2)+'\n');
