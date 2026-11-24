'use strict';
// METER-ANALYSIS-01 (Taktometer, no browser): counts the segments of a loop mask from the music around it, proposes bar readings
// (12 segments in 5/4 = 2 × 5 + 2 = 12/5 bars), measures the mask's deviation from the beat grid and cuts it (micro / to a target).
// Synthetic, seeded music with a known meter. Usage: node --test tests/meter_analysis.test.cjs
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const extract=require('./helpers/extract_function.cjs'),{render,rng}=require('./helpers/analysis_synth.cjs');
const file=fs.readFileSync(path.join(__dirname,'..','src','rooms','00_meter_analysis.js'),'utf8');
const M=new Function(extract(file,'__xenMeterAnalysisFactory')+'\nreturn __xenMeterAnalysisFactory();')();
const SR=44100;
const {meterMusic}=require('./helpers/meter_synth.cjs');
const asset=x=>({monoSamples:x,sampleRate:SR,originalDuration:x.length/SR});
test('4/4 at 120 BPM: a 2-bar mask is 8 segments, read as 2 × 4',()=>{
 const a=M.analyze(asset(meterMusic({bpm:120,S:4})),8,4);
 assert.ok(a.ok,a.reason);assert.equal(a.segments,8);assert.ok(Math.abs(a.segmentBpm-120)<.5,'bpm '+a.segmentBpm);
 assert.equal(a.best.segmentsPerBar,4,JSON.stringify(a.readings.slice(0,4).map(r=>[r.segmentsPerBar,r.score.toFixed(3)])));assert.equal(a.best.barsText,'2');
});
test('5/4 at 132 BPM: 2 bars + 2 counts = 12 segments, read as 2 × 5 + 2 = 12/5 bars',()=>{
 const beat=60/132,a=M.analyze(asset(meterMusic({bpm:132,S:5,dur:36})),beat*20,beat*12);
 assert.ok(a.ok,a.reason);assert.equal(a.segments,12);
 assert.equal(a.best.segmentsPerBar,5,JSON.stringify(a.readings.slice(0,5).map(r=>[r.segmentsPerBar,r.score.toFixed(3)])));
 assert.equal(a.best.barsText,'12/5');assert.equal(a.best.mixed,'2 2/5');assert.equal(a.best.wholeBars,2);assert.equal(a.best.extraSegments,2);assert.equal(a.best.label,'2 × 5 + 2');
 assert.ok(a.readings.some(r=>r.segmentsPerBar===4&&r.barsText==='3')&&a.readings.some(r=>r.segmentsPerBar===3&&r.barsText==='4'),'the other readings stay on offer');
});
test('7/8 grouped 2+2+3 at 180: a 2-bar mask is 14 segments in bars of 7',()=>{
 const beat=60/180,a=M.analyze(asset(meterMusic({bpm:180,S:7,dur:30,groups:[0,2,4]})),beat*28,beat*14);
 assert.ok(a.ok,a.reason);assert.equal(a.segments,14);assert.equal(a.best.segmentsPerBar,7,JSON.stringify(a.readings.slice(0,4).map(r=>[r.segmentsPerBar,r.score.toFixed(3)])));
});
test('an imprecise mask (17 ms early, 31 ms too long) is measured and micro-corrected to the exact grid',()=>{
 const bpm=117,beat=60/bpm,off=.0123,x=meterMusic({bpm,S:4,dur:32,offset:off}),t0=off+beat*16;
 const r=M.microCorrect(asset(x),t0-.017,beat*8+.017+.031);
 assert.ok(r.ok,r.reason);assert.equal(r.segments,8);assert.ok(Math.abs(r.deviationSec-.048)<.006,'deviation '+r.deviationSec);
 assert.ok(Math.abs(r.segmentPeriodSec-beat)<.0006,'period '+r.segmentPeriodSec+' vs '+beat);
 assert.ok(Math.abs(r.corrected.startSec-t0)<.004,'start '+r.corrected.startSec+' vs '+t0);
 assert.ok(Math.abs(r.corrected.durationSec-beat*8)<.004,'length '+r.corrected.durationSec+' vs '+beat*8);
 assert.ok(Math.abs(r.corrected.bpm-bpm)<.5,'bpm '+r.corrected.bpm);
 const rep=M.asRepairResult(r,4);assert.equal(rep.primary.bars,2);assert.equal(rep.primary.segments,8);assert.ok(rep.candidates.length>=1);
});
test('Fit to target: 2 bars of 5 on 4/4 music cuts 10 segments from where the mask starts',()=>{
 const bpm=124,beat=60/bpm,x=meterMusic({bpm,S:4,dur:30}),t0=beat*12;
 const r=M.fitTarget(asset(x),t0+.01,beat*7.6,{bars:2,segmentsPerBar:5});
 assert.ok(r.ok,r.reason);assert.equal(r.target.segments,10);assert.ok(Math.abs(r.corrected.startSec-t0)<.005,'start '+r.corrected.startSec);
 assert.ok(Math.abs(r.corrected.durationSec-beat*10)<.005,'length '+r.corrected.durationSec);
 const p=M.metaPatch(10,5,r.corrected.durationSec);assert.equal(p.bars,2);assert.equal(p.guideSegments,5);assert.equal(p.beatsPerBar,5);
 assert.ok(Math.abs(p.bars*p.beatsPerBar*60/p.bpm-r.corrected.durationSec)<1e-9,'time truth: bars × segments × 60 / bpm = length');
 const q=M.fitTarget(asset(x),t0,beat*4,{bars:12/5,segmentsPerBar:5});assert.equal(q.target.segments,12);assert.ok(Math.abs(q.corrected.durationSec-beat*12)<.005);
});
test('a fractional target (1/3 bar of 4) keeps time truth without snapping to an attack',()=>{
 const bpm=120,beat=.5,x=meterMusic({bpm,S:4,dur:20}),r=M.fitTarget(asset(x),4,2,{bars:1/3,segmentsPerBar:4});
 assert.ok(r.ok);assert.ok(Math.abs(r.corrected.durationSec-beat*4/3)<.002,'length '+r.corrected.durationSec);
});
test('the general analysis synth (120 BPM) counts 8 segments in a 4 s mask',()=>{
 const a=M.analyze(asset(render({dur:24,bpm:120})),6,4);assert.ok(a.ok,a.reason);assert.equal(a.segments,8);assert.ok(Math.abs(a.segmentBpm-120)<.6,'bpm '+a.segmentBpm);
});
test('readings and fractions',()=>{
 const r=M.readings(12,{});assert.ok(r.find(x=>x.segmentsPerBar===5).barsText==='12/5');assert.equal(M.reading(12,5).label,'2 × 5 + 2');assert.equal(M.reading(3,4).label,'3 of 4');assert.equal(M.reading(3,4).barsText,'3/4');
 assert.equal(M.reading(8,4).label,'2 × 4');assert.equal(M.fraction(12,5).mixed,'2 2/5');
});
test('negative: silence and noise give no invented meter',()=>{
 assert.equal(M.analyze(asset(new Float32Array(SR*10)),2,3).ok,false);
 const R=rng(9),n=new Float32Array(SR*12);for(let i=0;i<n.length;i++)n[i]=(R()*2-1)*.3;const a=M.analyze(asset(n),3,4);
 assert.ok(!a.ok||a.confidence<.35,'noise confidence '+a.confidence);
 assert.equal(M.analyze(asset(meterMusic({})),2,.1).ok,false,'too short');
});
test('progressive masks: 9/8 (2+2+2+3) and 11/8 (3+3+3+2) are counted in eighths, read as 2 × 9 and 2 × 11',()=>{
 for(const [S,groups,bpm] of [[9,[0,2,4,6],330],[11,[0,3,6,9],290],[13,[0,3,6,9,11],310]]){
  const beat=60/bpm,a=M.analyze(asset(meterMusic({bpm,S,groups,dur:40})),beat*S*4,beat*S*2);
  assert.ok(a.ok,a.reason);assert.equal(a.segments,2*S,S+': '+a.segments+' segments at '+a.segmentBpm);assert.equal(a.best.segmentsPerBar,S,S+': best '+a.best.label);
 }
});
