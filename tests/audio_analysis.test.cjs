'use strict';
// AUDIO-ANALYSE-01 (Wave Editor analysis core, no browser): tempo, root in Hz, tuning system and scale of an audio region, and where they change.
// Synthetic, seeded music with known answers; negative cases must say "not determined" instead of inventing a key.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const extract=require('./helpers/extract_function.cjs'),{render,rng}=require('./helpers/analysis_synth.cjs');
const src=p=>fs.readFileSync(path.join(__dirname,'..','src',p),'utf8');
const file=src('post-oct/015b-xen-wave-analysis.js'),code=['__xenAnalysisToolsFactory','__audioCarrierAnalysisFactory','__audioAnalysisFactory'].map(n=>extract(file,n)).join('\n')+
 '\nconst tools=__xenAnalysisToolsFactory();return __audioAnalysisFactory(tools,__audioCarrierAnalysisFactory(tools));';
const A=new Function(code)(),run=x=>A.analyze({samples:x,sampleRate:44100});
const ji=[0,203.91,386.31,498.04,701.96,884.36,1088.27],edo=(n,steps)=>steps.map(k=>k*1200/n),BP=1901.955;
test('12-EDO A harmonic minor at 120 BPM: tempo, root Hz, tuning, scale',()=>{
 const r=run(render({dur:20,bpm:120,rootHz:110,scale:[0,200,300,500,700,800,1100]}));
 assert.ok(Math.abs(r.bpm.bpm-120)<1,'bpm '+r.bpm.bpm);assert.ok(r.bpm.confidence>.8);
 assert.ok(Math.abs(r.tonal.root.hz-55)<.6,'root '+r.tonal.root.hz);assert.equal(r.tonal.root.name,'A1');assert.equal(r.tonal.root.approx,false);
 assert.equal(r.tonal.tuning[0].id,'12-EDO');assert.equal(r.tonal.scale.name,'Harmonic minor');assert.ok(r.tonal.scale.confidence>.6);assert.ok(Math.abs(r.tonal.concertA-440)<1);
});
test('a detuned recording is reported as "≈ note + cents" with its own concert pitch',()=>{
 const r=run(render({dur:20,bpm:140,rootHz:130.81*Math.pow(2,-30/1200),scale:[0,200,400,500,700,900,1100]}));
 assert.ok(Math.abs(r.bpm.bpm-140)<1.5,'bpm '+r.bpm.bpm);assert.equal(r.tonal.root.approx,true);assert.ok(Math.abs(r.tonal.root.cents+30)<4,'cents '+r.tonal.root.cents);
 assert.ok(Math.abs(r.tonal.concertA-432.5)<1.5,'A4 '+r.tonal.concertA);assert.equal(r.tonal.scale.name,'Major (Ionian)');
});
test('19-EDO and Bohlen–Pierce are recognised as such, not forced into 12-EDO',()=>{
 let r=run(render({dur:20,bpm:100,rootHz:110,scale:edo(19,[0,3,6,8,11,14,17])}));assert.equal(r.tonal.tuning[0].id,'19-EDO');assert.equal(r.tonal.scale.name,'Major (Ionian)');
 r=run(render({dur:20,bpm:90,rootHz:330,scale:[0,2,3,4,6,7,9,10,12].map(k=>k*BP/13),period:BP}));
 assert.equal(r.tonal.tuning[0].id,'13ED3');assert.ok(Math.abs(r.tonal.root.hz-110)<1.5,'root '+r.tonal.root.hz);assert.equal(r.tonal.scale.name,'Bohlen–Pierce Lambda');
});
test('5-limit just intonation is told apart from 12-EDO',()=>{
 const r=run(render({dur:20,bpm:100,rootHz:110,scale:[0,203.91,386.31,498.04,701.96,884.36,1088.27]}));
 assert.ok(['JI5','JI7'].includes(r.tonal.tuning[0].id),r.tonal.tuning[0].id);assert.ok(Math.abs(r.tonal.root.hz-55)<.6);
});
test('a key and tuning change inside the audio becomes separate sections',()=>{
 const a=render({dur:40,bpm:120,rootHz:110,scale:[0,200,300,500,700,800,1000],seed:2}),b=render({dur:40,bpm:120,rootHz:98,scale:edo(19,[0,3,6,8,11,14,17]),seed:4}),x=new Float32Array(a.length+b.length);x.set(a);x.set(b,a.length);
 const r=run(x);assert.equal(r.sections.length,2);assert.ok(Math.abs(r.sections[0].endSec-40)<=6,'border '+r.sections[0].endSec);
 assert.equal(r.sections[0].tuning.id,'12-EDO');assert.equal(r.sections[1].tuning.id,'19-EDO');assert.ok(Math.abs(r.sections[1].root.hz-49)<1.5,'root '+r.sections[1].root.hz);
 assert.equal(run(render({dur:40,bpm:120,rootHz:110,scale:[0,200,300,500,700,800,1000],seed:2})).sections.length,0,'one key: no sections');
});
test('negative: noise, drums only, silence and a too short region never invent a key',()=>{
 const R=rng(5),noise=new Float32Array(44100*15);for(let i=0;i<noise.length;i++)noise[i]=(R()*2-1)*.3;
 let r=run(noise);assert.ok(!r.tonal||r.tonal.none,'noise has no tuning');assert.ok(r.bpm===null||r.bpm.confidence<.3,'noise tempo is not trusted: '+(r.bpm&&r.bpm.confidence));
 r=run(render({dur:15,bpm:128,tonal:false}));assert.ok(Math.abs(r.bpm.bpm-128)<1.5);assert.ok(!r.tonal||r.tonal.none,'kicks and hats are no key');
 r=run(new Float32Array(44100*10));assert.equal(r.bpm,null);assert.equal(r.tonal,null);
 assert.throws(()=>run(new Float32Array(44100*3)),/at least 4 seconds/);
 assert.throws(()=>A.analyze({samples:new Float32Array(10),sampleRate:44100}),/at least 4 seconds/);assert.throws(()=>A.analyze({samples:[1,2],sampleRate:44100}),/Invalid audio/);
});
test('level does not matter (a −54 dB recording reads like a loud one); invalid samples are refused, the input is never changed',()=>{
 const loud=render({dur:15,bpm:100,rootHz:110,scale:[0,200,300,500,700,800,1100]}),quiet=loud.map(v=>v*.002),copy=quiet.slice();
 const r=run(quiet);assert.ok(Math.abs(r.bpm.bpm-100)<1);assert.ok(Math.abs(r.tonal.root.hz-55)<.6,'quiet root '+r.tonal.root.hz);assert.deepEqual(quiet,copy,'input untouched');
 const bad=loud.slice();bad[1234]=NaN;assert.throws(()=>run(bad),/invalid audio data/);
});
test('the pitch-line extractor moved here still serves the Forge: lab.js calls it by name with the Forge tools and it finds 220 Hz',()=>{
 const lab=src('rooms/lab.js');assert.ok(!/function __audioCarrierAnalysisFactory\(/.test(lab),'lab.js no longer owns it');assert.ok(lab.includes('__audioCarrierAnalysisFactory(tools)'),'lab.js still calls it');
 const f=new Function(extract(src('forge/dsp/02_gestalt_tools.js'),'__forgeGestaltToolsFactory')+'\n'+extract(file,'__audioCarrierAnalysisFactory')+'\nreturn __audioCarrierAnalysisFactory(__forgeGestaltToolsFactory(Math.PI*2,{resamplingPhases:64},(v,a,b)=>Math.max(a,Math.min(b,v))));')();
 const x=new Float32Array(44100*2);for(let i=0;i<x.length;i++)x[i]=.5*Math.sin(2*Math.PI*220*i/44100)+.2*Math.sin(2*Math.PI*440*i/44100);
 const r=f.analyze({samples:x,sampleRate:44100});assert.equal(r.notes.length,1);assert.ok(Math.abs(r.notes[0].pitchHz[10]-220)<1,'pitch '+r.notes[0].pitchHz[10]);
});
