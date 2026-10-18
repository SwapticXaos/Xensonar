'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const h=require('./helpers/rfl-resident.cjs'),s=h.sources(),rows=[];
// A deliberately silent crop followed by an excluded loud hit. Any output is
// unintended material from outside the user's loop, rather than a tone/pitch metric.
for(const mode of ['base','fragment'])for(const rate of [44100,48000,96000]){
 const n=Math.round(rate*.5),end=Math.round(rate*.3)/rate;
 const pcm=[Float32Array.from({length:n},(_,i)=>i>=Math.round(end*rate)?.5:0)];
 const tuning=s.tuning(mode),program=h.program(mode,tuning,{loopStartSec:.05,loopEndSec:end});
 const map=mode==='fragment'?h.prepare(s.preparation,pcm,rate):null;
 const pair=[h.baseline(),s.processor].map(source=>h.create(source,{sampleRate:rate,channels:pcm,program,map}));
 const metrics=pair.map(p=>{
  let peak=0,jump=0,last=0,outside=0;
  for(let b=0;b<Math.ceil(rate*1.2/128);b++){
   if(b%61===0)p.send({type:'state',sequence:b+2,program:{...program,rawTargetHz:[220,880,110,330][Math.floor(b/61)%4]}});
   p.tick();const pool=p.processor.core.pool;
   for(let i=0;i<pool.count;i++)if(pool.source[i]+pool.sourceDuration[i]>end+1e-10)outside++;
   for(const v of p.output[0]){assert(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));jump=Math.max(jump,Math.abs(v-last));last=v;}
  }
  assert(!p.messages.some(m=>m.type==='fault'));return {peak,jump,outside};
 });
 assert(metrics[0].peak>.1,'frozen baseline must reproduce excluded transient');
 rows.push({mode,rate,baseline:metrics[0],current:metrics[1]});
 console.log(JSON.stringify(rows.at(-1)));
 assert.equal(metrics[1].outside,0,'grains must stay inside the selected loop');
 assert.equal(metrics[1].peak,0,'silent selected loop must not play the excluded hit after a root change');
}
fs.mkdirSync('results/live-stability',{recursive:true});fs.writeFileSync('results/live-stability/boundaries.json',JSON.stringify({rows},null,2)+'\n');
console.log('PASS live RFL crop boundaries: both render modes, root changes, 44.1/48/96kHz; excluded transients remain silent');
