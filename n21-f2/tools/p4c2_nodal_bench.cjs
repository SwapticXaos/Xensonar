'use strict';
const fs=require('node:fs'),{performance}=require('node:perf_hooks');
const read=p=>fs.readFileSync(p,'utf8'),shared=read('src/nodal/01_instrument_model.js')+'\n'+read('src/nodal/07_sound_designer.js');
const load=file=>new Function(shared+'\n'+read(file)+';return {model:__XenNodalModel,dsp:__XenNodalDSP,starter:nodalOpenStarter};')();
const engines=[load('tests/fixtures/p4c1_nodal_baseline/02_synthesis_kernel.js'),load('src/nodal/02_synthesis_kernel.js')];
const median=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)],rows=[];
for(const preset of ['hollow','reed','prism','filament7'])for(const phase of ['attacks','held','tail','gliss']){
 const variants=engines.map(api=>{
  let instrument=api.starter(preset==='filament7'?'hollow':preset);
  if(preset==='filament7')instrument=api.model.normalize({...instrument,nodes:Array.from({length:7},(_,i)=>({...instrument.nodes[i%3],id:'node'+i,ratio:1+i*.071}))});
  const plan=api.model.compile(instrument),cost=Math.max(plan.cost,Math.ceil(plan.nodes.length/2)),count=Math.min(8,Math.floor(16/cost));
  const frequencies=Array.from({length:16},(_,i)=>110*Math.pow(2,i/12));api.dsp.preparePitches(plan,frequencies,48000);
  return {voices:Array.from({length:count},(_,i)=>api.dsp.voice(plan,{frequency:frequencies[i],gain:.1,held:true},48000)),count,frequencies};
 });
 const left=new Float32Array(128),right=new Float32Array(128),times=[[],[]],p95s=[[],[]];
 function trial(v){
  const {voices,frequencies}=v;voices.forEach((voice,i)=>voice.reset({frequency:frequencies[i],gain:.1,held:true}));
  for(let block=0;block<50;block++)for(const voice of voices)voice.process(left,right);
  if(phase==='tail')voices.forEach(voice=>voice.noteOff());
  const blocks=[];let elapsed=0;
  for(let block=0;block<100;block++){
   left.fill(0);right.fill(0);const at=performance.now();
   if(phase==='attacks'&&block%4===0)voices.forEach((voice,i)=>voice.reset({frequency:frequencies[(i+block)%16],gain:.1,held:true}));
   if(phase==='gliss'&&block%4===0)voices.forEach((voice,i)=>voice.setFrequency(110+i*13.25+block*.17));
   for(const voice of voices)voice.process(left,right,0,128,true);
   const ms=performance.now()-at;blocks.push(ms);elapsed+=ms;
  }
  blocks.sort((a,b)=>a-b);return {elapsed,p95:blocks[95]};
 }
 // Alternate order; the first pair is JIT warmup and not reported.
 for(let round=0;round<6;round++)for(const index of round%2?[1,0]:[0,1]){
  const result=trial(variants[index]);if(round){times[index].push(result.elapsed);p95s[index].push(result.p95);}
 }
 const before=median(times[0]),after=median(times[1]);
 rows.push({preset,phase,voices:variants[0].count,framesPerRun:12800,beforeMs:before,afterMs:after,changePercent:100*(after/before-1),beforeP95BlockMs:median(p95s[0]),afterP95BlockMs:median(p95s[1]),runs:{before:times[0],after:times[1]}});
}
const report={scope:'Node '+process.version+' on this host; alternating same-process comparison at 48kHz, bounded actual surface cost. Excludes browser scheduling, UI, global mix and hardware. No capacity or burst-free guarantee.',rows};
fs.writeFileSync('results/p4c2-nodal-bench.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
