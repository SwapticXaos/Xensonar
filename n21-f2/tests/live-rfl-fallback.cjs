'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),h=require('./helpers/rfl-resident.cjs'),s=h.sources();
const rows=[];
for(const mode of ['flowing','fragment'])for(const hz of [110,220,880]){
 const row=s.run(`(()=>{
  const buffer=new AudioBuffer({numberOfChannels:1,length:24000,sampleRate:48000});
  let grains=0,outside=0,tooShort=0;
  for(const start of [.1,.4,.8,.94]){
   const plan=R3({buffer,currentTimeSec:0,mode:'${mode}',windowStartSec:start,windowDurationSec:.076,
    desiredLoopDurationSec:1,transportAnchorSec:0,loopStartSec:.05,loopEndSec:.3,
    rawTargetHz:${hz},previousSmoothedRootHz:null,entryRootHz:220,sessionAnchorHz:null,stepSec:.026,
    tuning:vG(Fw({qualityMode:'${mode==='flowing'?'base':'fragment'}',windowMs:76,stepMs:26},'${mode==='flowing'?'flowing':'grainy'}'))});
   for(const slice of plan.slices)for(const grain of slice.elastic.grains){
    grains++;
    if(grain.srcStart<.05-1e-10||grain.srcStart+grain.bufferDurationArg>.3+1e-10||grain.srcStart+grain.actualGrainOut*slice.elastic.safeRate>.3+1e-10)outside++;
    if(grain.actualGrainOut<.003)tooShort++;
   }
  }
  return {grains,outside,tooShort};
 })()`);
 rows.push({mode,hz,...row});console.log(JSON.stringify(rows.at(-1)));
 assert(row.grains>0);assert.equal(row.outside,0,'native fallback must obey the same crop boundary as the resident');assert.equal(row.tooShort,0);
}
fs.writeFileSync('results/live-stability/fallback.json',JSON.stringify({rows},null,2)+'\n');
console.log('PASS RFL native fallback crop and fade durations at changing roots');
