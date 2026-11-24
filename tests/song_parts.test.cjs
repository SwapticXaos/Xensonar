'use strict';
// SONG-PARTS-01 (Wave Editor part strip, no browser): the whole upload is split into parts named A, B, C … in order of appearance;
// returning material gets its letter again; every part carries whole bars, segments per bar, segments and BPM.
// No meter (drone, one hit, very short) = one part, 1 bar, 1 segment. Usage: node --test tests/song_parts.test.cjs
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const extract=require('./helpers/extract_function.cjs'),{meterMusic,song,SR}=require('./helpers/meter_synth.cjs'),{rng}=require('./helpers/analysis_synth.cjs');
const src=p=>fs.readFileSync(path.join(__dirname,'..','src','rooms',p),'utf8');
const P=new Function(extract(src('00_meter_analysis.js'),'__xenMeterAnalysisFactory')+'\n'+extract(src('00_song_parts.js'),'__xenSongPartsFactory')+
 '\nreturn __xenSongPartsFactory(__xenMeterAnalysisFactory());')();
const run=x=>{const asset={monoSamples:x,sampleRate:SR,originalDuration:x.length/SR};return P.snap(P.analyze(P.decimate(x,SR)),asset)};
const sections={
 A:{root:55,chord:[1,1.25,1.5],chordHz:220,hats:true,lead:440},
 B:{root:73.4,chord:[1,1.2,1.5,1.8],chordHz:293.7,hats:false,lead:660},
 C:{root:41.2,chord:[1,1.335],chordHz:164.8,hats:true,lead:0}};
test('A B A C B at 120 BPM in 4/4: letters, colours, boundaries on the bar lines, 8 bars of 4 each',()=>{
 const order='ABACB',s=song({bpm:120,S:4,sections:[...order].map(k=>({bars:8,...sections[k]}))}),r=run(s.samples);
 assert.ok(r.ok&&r.rhythmic,r.reason);assert.equal(r.segmentsPerBar,4);assert.ok(Math.abs(r.bpm-120)<1,'bpm '+r.bpm);
 assert.equal(r.parts.map(p=>p.label).join(''),order,JSON.stringify(r.parts.map(p=>[p.label,+p.loopStartSec.toFixed(2),p.bars])));
 r.parts.forEach((p,i)=>{if(i)assert.ok(Math.abs(p.loopStartSec-s.starts[i])<.03,'part '+i+' starts at '+p.loopStartSec+' not '+s.starts[i]);
  assert.equal(p.bars,8);assert.equal(p.segments,32);assert.equal(p.segmentsPerBar,4);assert.ok(Math.abs(p.bpm-120)<.6,'bpm '+p.bpm);
  assert.ok(Math.abs((p.loopEndSec-p.loopStartSec)-16)<.03,'loop length '+(p.loopEndSec-p.loopStartSec))});
 assert.equal(r.parts[0].color,r.parts[2].color,'a returning part keeps its colour');assert.notEqual(r.parts[0].color,r.parts[1].color);
 assert.equal(r.parts[0].startSec,0);assert.ok(Math.abs(r.parts.at(-1).endSec-s.durationSec)<1e-9,'the strip covers the whole file');
});
test('5/4 at 132 BPM with a pickup: A B A, bars of 5, the pickup belongs to the first part',()=>{
 const s=song({bpm:132,S:5,pickup:.9,sections:[{bars:6,...sections.A},{bars:6,...sections.B},{bars:6,...sections.A}]}),r=run(s.samples);
 assert.ok(r.rhythmic,r.reason);assert.equal(r.segmentsPerBar,5);assert.equal(r.parts.map(p=>p.label).join(''),'ABA',JSON.stringify(r.parts.map(p=>[p.label,p.loopStartSec,p.bars])));
 assert.equal(r.parts[0].startSec,0);assert.ok(Math.abs(r.parts[0].loopStartSec-.9)<.03,'first loop starts on the first downbeat: '+r.parts[0].loopStartSec);
 assert.equal(r.parts[1].segments,30);
});
test('one texture throughout is one part A',()=>{
 const r=run(meterMusic({bpm:110,S:4,dur:40}));assert.ok(r.rhythmic);assert.equal(r.parts.length,1);assert.equal(r.parts[0].label,'A');assert.ok(r.parts[0].bars>=17,'bars '+r.parts[0].bars);
});
test('a drone (no meter) is one part, 1 bar, 1 segment',()=>{
 const n=SR*60,x=new Float32Array(n);for(let i=0;i<n;i++){const t=i/SR;x[i]=.3*Math.sin(2*Math.PI*65.4*t)*(1+.2*Math.sin(2*Math.PI*.07*t))+.15*Math.sin(2*Math.PI*98.1*t+Math.sin(2*Math.PI*.13*t))}
 const r=run(x);assert.equal(r.rhythmic,false,r.reason);assert.equal(r.parts.length,1);assert.deepEqual([r.parts[0].bars,r.parts[0].segments],[1,1]);assert.equal(r.parts[0].endSec,60);
});
test('a one-shot sound and noise are one part',()=>{
 const R=rng(4),hit=new Float32Array(SR*1.2);for(let i=0;i<hit.length;i++)hit[i]=(R()*2-1)*Math.exp(-i/SR*6);
 assert.equal(run(hit).parts.length,1);
 const noise=new Float32Array(SR*20);for(let i=0;i<noise.length;i++)noise[i]=(R()*2-1)*.3;const r=run(noise);assert.equal(r.parts.length,1);assert.equal(r.rhythmic,false);
});
test('parts that differ only in harmony get their own letters; repeats in a row stay one part (3/4, 96 BPM, 2:15)',()=>{
 const H={root:55,chord:[1,1.2,1.5],chordHz:261.6},K={root:82.4,chord:[1,1.25,1.5],chordHz:329.6};
 let r=run(song({bpm:118,S:4,sections:[{bars:8},{bars:8,...H},{bars:8},{bars:8,...K}]}).samples);
 assert.equal(r.parts.map(p=>p.label).join(''),'ABAC');assert.equal(r.parts[0].loopStartSec,0);
 const secs=[...'AABABCCAB'].map(k=>({bars:8,...({A:{},B:{root:73.4,hats:false,lead:660,chord:[1,1.2,1.5]},C:{root:41.2,lead:0,chord:[1,1.335],chordHz:164.8}})[k]}));
 const s=song({bpm:96,S:3,sections:secs});r=run(s.samples);
 assert.equal(r.segmentsPerBar,3);assert.equal(r.parts.map(p=>p.label).join(''),'ABABCAB');assert.deepEqual(r.parts.map(p=>p.bars),[16,8,8,8,16,8,8]);
 assert.ok(r.parts.every(p=>Math.abs(p.bpm-96)<.3),'bpm '+r.parts.map(p=>p.bpm.toFixed(2)));
});
