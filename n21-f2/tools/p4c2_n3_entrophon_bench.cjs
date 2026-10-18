'use strict';
const fs=require('node:fs'),{performance}=require('node:perf_hooks'),{createEngine}=require('../tests/helpers/p4c2-n3-entrophon.cjs');
const engines=[createEngine(true,false),createEngine(false,false)],median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)],rows=[];
for(const surface of ['wave','particle','spectral'])for(const unison of [1,6]){
 for(const e of engines)e.api.set(surface,{...e.api.defaults[surface],enabled:true,unison,detune:23.7,unisonSpread:.61,filterKeytrack:.37,colorSet:'default'});
 const events=Array.from({length:128},(_,i)=>({surface,freq:110.137+i*2.719,rootFreq:220,tuningStrength:0,forceEnabled:true})),times=[[],[]];
 function trial(index){const at=performance.now(),api=engines[index].api;let sum=0;for(let i=0;i<16000;i++)sum+=api.body(events[i%128]).filterFreq;return {ms:performance.now()-at,sum};}
 for(let round=0;round<9;round++)for(const index of round%2?[1,0]:[0,1]){const t=trial(index);if(round>=2)times[index].push(t.ms);}
 const a=median(times[0]),b=median(times[1]);rows.push({surface,unison,bodyCalls:16000,beforeMs:a,afterMs:b,changePercent:100*(b/a-1),runs:times});
}
const report={scope:'Node '+process.version+'; production Entrophon dT body construction only. Uninstrumented Math, alternating order, two warmups, seven measured rounds. Same configs/inputs. Does not measure C11 synthesis, browser scheduling, full audio frames or hardware bursts.',rows};fs.writeFileSync('results/p4c2-n3-entrophon-bench.json',JSON.stringify(report,null,2)+'\n');for(const r of rows)console.log(r.surface,r.unison,r.beforeMs.toFixed(2),r.afterMs.toFixed(2),r.changePercent.toFixed(1)+'%');
