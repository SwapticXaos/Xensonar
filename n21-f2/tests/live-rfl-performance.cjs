'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),h=require('./helpers/rfl-resident.cjs');
const s=h.sources(),rows=[];
for(const mode of ['base','fragment'])for(const channels of [1,2]){
 const rate=48000,pcm=Array.from({length:channels},(_,c)=>Float32Array.from({length:24000},(_,i)=>.18*Math.sin(i*.043+(c?1.2:0))+.04*Math.cos(i*.071)));
 const program=h.program(mode,s.tuning(mode)),map=mode==='fragment'?h.prepare(s.preparation,pcm,rate):null;
 const make=source=>h.create(source,{sampleRate:rate,channels:pcm,program,map});
 const pair=[h.baseline(),s.processor].map(make);let maxError=0,peak=0;
 for(let b=0;b<1500;b++){
  for(const p of pair){if(b%71===0)p.send({type:'state',sequence:b+2,program:{...program,rawTargetHz:[220,880,110,330,217.731][Math.floor(b/71)%5]}});p.tick();}
  for(let c=0;c<2;c++)for(let i=0;i<128;i++){maxError=Math.max(maxError,Math.abs(pair[0].output[c][i]-pair[1].output[c][i]));peak=Math.max(peak,Math.abs(pair[1].output[c][i]));}
 }
 assert(maxError<2e-6,'render arithmetic must preserve full-range PCM within 2e-6: '+maxError);
 const measure=source=>{
  const p=make(source);for(let i=0;i<500;i++)p.tick();
  const start=performance.now();for(let i=0;i<3000;i++){
   if(i%71===0)p.send({type:'state',sequence:i+2,program:{...program,rawTargetHz:[220,880,110,330,217.731][Math.floor(i/71)%5]}});
   p.tick();
  }
  return performance.now()-start;
 };
 const old=[],current=[];
 for(let i=0;i<7;i++)if(i%2){current.push(measure(s.processor));old.push(measure(h.baseline()))}else{old.push(measure(h.baseline()));current.push(measure(s.processor))}
 const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
 const baselineMs=median(old),currentMs=median(current);
 assert(baselineMs/currentMs>1.5,'warmed render speedup must exceed the 1.5x regression budget');
 rows.push({mode,channels,rate,renderedSeconds:3000*128/rate,baselineMs,currentMs,speedup:baselineMs/currentMs,maxError,peak,baselineRuns:old,currentRuns:current});
 console.log(JSON.stringify(rows.at(-1)));
}
fs.mkdirSync('results/live-stability',{recursive:true});fs.writeFileSync('results/live-stability/performance.json',JSON.stringify({rows,scope:'Native V8 production processor; alternating warmed runs, identical root event schedule; browser/hardware deadlines tested separately'},null,2)+'\n');
