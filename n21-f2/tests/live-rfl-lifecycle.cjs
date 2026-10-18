'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),h=require('./helpers/rfl-resident.cjs'),s=h.sources(),rows=[];
for(const rate of [44100,48000,96000])for(const mode of ['base','fragment']){
 const sourceRate=48000,pcm=[Float32Array.from({length:24000},(_,i)=>.15*Math.sin(i*.023))];
 const map=mode==='fragment'?h.prepare(s.preparation,pcm,sourceRate):null;
 const program=h.program(mode,s.tuning(mode));
 const p=h.create(s.processor,{sampleRate:rate,sourceRate,channels:pcm,program,map});
 let sequence=1,peak=0,maxWindows=0;
 for(let b=0;b<400;b++){
  // Faster than the material-window cadence; the processor consumes the latest
  // valid target, never queues fifty new windows for fifty root messages.
  if(b%13===0){for(let i=0;i<50;i++)p.send({type:'state',sequence:++sequence,program:{...program,rawTargetHz:110+(i%11)*57.137}});}
  if(b===100){const last=p.processor.sequence;p.send({type:'state',sequence:last-1,program:{...program,rawTargetHz:3520}});assert.equal(p.processor.sequence,last);}
  if(b===130){const last=p.processor.sequence;p.send({type:'state',sequence:last+1,program:{...program,rawTargetHz:NaN}});assert.equal(p.processor.sequence,last);}
  if(b===180)p.clock.frame+=Math.round(rate*3); // suspend/resume or a clock gap
  if(b===220){p.output=[new Float32Array(256),new Float32Array(256)];}
  const before=p.processor.core.windows;p.tick();maxWindows=Math.max(maxWindows,p.processor.core.windows-before);
  assert(p.processor.core.pool.count<=1024);
  for(const ch of p.output)for(const v of ch){assert(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));}
 }
 assert(peak>.01);assert(maxWindows<=8,'catch-up work per quantum must remain bounded');assert(p.processor.core.skippedWindows>0);
 p.send({type:'drain'});let ticks=0;
 while(p.processor.core.pool.count&&ticks++<500)p.tick();
 assert.equal(p.processor.core.pool.count,0);assert(p.messages.some(m=>m.type==='tail-ended'));
 assert(!p.messages.some(m=>m.type==='fault'));
 rows.push({rate,mode,rootMessages:Math.ceil(400/13)*50,maxWindows,skippedWindows:p.processor.core.skippedWindows,peak,tailReleased:true});
 console.log(JSON.stringify(rows.at(-1)));
}
fs.writeFileSync('results/live-stability/lifecycle.json',JSON.stringify({rows},null,2)+'\n');
console.log('PASS RFL lifecycle: rapid/stale/invalid root updates, sample-rate mismatch, clock gaps, 128/256-frame quanta and complete tail release');
