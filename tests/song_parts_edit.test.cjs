'use strict';
// SONG-PARTS-EDIT-01 (no browser): snapping to the bar / beat grid, editing the parts as a working copy (move a boundary,
// split, merge, letter), derived bars / segments / BPM stay time-true, and the working copy persists per song.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const extract=require('./helpers/extract_function.cjs');
const factory=new Function(extract(fs.readFileSync(path.join(__dirname,'..','src','rooms','00_song_parts_edit.js'),'utf8'),'__xenSongPartsEditFactory')+'\nreturn __xenSongPartsEditFactory;')();
const memStore=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};
// 120 BPM, 4/4: beat 0.5 s, bar 2 s, 40 s
const grid={segments:Array.from({length:81},(_,i)=>i*.5),bars:Array.from({length:21},(_,i)=>i*2),barSec:2,segmentsPerBar:4},total=40;
const base=()=>{const E=factory(memStore());return {E,parts:E.normalize([{startSec:0,endSec:16,label:'A',segmentsPerBar:4},{startSec:16,endSec:32,label:'B',segmentsPerBar:4},{startSec:32,endSec:40,label:'A',segmentsPerBar:4}],grid,total)}};
test('snapping: bar, beat, off; only the dragged edge of the mask snaps, a moved mask keeps its length',()=>{
 const {E}=base();assert.equal(E.snapTime(5.1,grid,'bar'),6);assert.equal(E.snapTime(5.1,grid,'beat'),5);assert.equal(E.snapTime(5.1,grid,'off'),5.1);
 const near=(r,s,d)=>assert.ok(Math.abs(r.startSec-s)<1e-9&&Math.abs(r.durationSec-d)<1e-9,JSON.stringify(r));
 near(E.snapRange({startSec:3.9,durationSec:4.3},grid,'bar','end',total),3.9,4.1);
 near(E.snapRange({startSec:3.9,durationSec:4.3},grid,'bar','start',total),4,4.2);
 const m=E.snapRange({startSec:3.7,durationSec:4},grid,'beat','move',total);assert.ok(Math.abs(m.startSec-3.5)<1e-9&&Math.abs(m.durationSec-4)<1e-9);
});
test('derived fields: whole bars, segments and BPM follow the grid (time truth)',()=>{
 const {parts}=base();assert.deepEqual(parts.map(p=>[p.label,p.bars,p.segments]),[['A',8,32],['B',8,32],['A',4,16]]);
 assert.ok(parts.every(p=>Math.abs(p.bpm-120)<1e-6));assert.equal(parts[0].color,parts[2].color);
});
test('move a boundary (snapped to the bar), split, merge, change a letter',()=>{
 const {E,parts}=base();
 let p=E.moveBoundary(parts,1,19.3,grid,'bar',total);assert.deepEqual(p.map(x=>[x.startSec,x.endSec,x.bars]),[[0,20,10],[20,32,6],[32,40,4]]);assert.ok(p[0].edited&&p[1].edited);
 p=E.moveBoundary(p,1,-5,grid,'bar',total);assert.equal(p[1].startSec,2,'never past the neighbour: one bar stays');
 p=E.split(base().parts,1,23.4,grid,'bar',total);assert.deepEqual(p.map(x=>x.label).join(''),'ABCA');assert.equal(p[1].endSec,24);assert.equal(p[2].bars,4);
 p=E.merge(p,1,grid,total);assert.deepEqual(p.map(x=>[x.label,x.startSec,x.endSec]),[['A',0,16],['B',16,32],['A',32,40]]);
 p=E.setLabel(p,1,'A',grid,total);assert.equal(p[1].color,p[0].color);
});
test('the working copy persists per song and is re-derived on the grid; reset returns to the analysis',()=>{
 const store=memStore(),E=factory(store),asset={fileName:'song.wav',originalDuration:40,sampleRate:44100};
 const analysis={ok:true,durationSec:total,grid,parts:base().parts};
 assert.equal(E.current(asset,analysis).edited,false);
 E.save(asset,E.moveBoundary(analysis.parts,1,20,grid,'bar',total));
 const again=factory(store).current(asset,analysis);assert.equal(again.edited,true);assert.equal(again.parts[1].startSec,20);assert.equal(again.parts[0].bars,10);
 E.clear(asset);assert.equal(factory(store).current(asset,analysis).edited,false);
 assert.equal(E.snapMode(),'bar');E.setSnapMode('beat');assert.equal(factory(store).snapMode(),'beat');
});
test('subdivide a part into sections (C1, C2 …): here (snapped), evenly in whole bars, remove one, remove all; merge keeps the old boundary as a section',()=>{
 const {E,parts}=base();
 let p=E.addCut(parts,1,23.4,grid,'bar',total);assert.deepEqual(p[1].cuts,[24]);assert.equal(p[1].subParts.length,2);
 assert.deepEqual(p[1].subParts.map(q=>[q.startSec,q.endSec,q.bars,q.segments]),[[16,24,4,16],[24,32,4,16]]);
 assert.ok(p[1].subParts.every(q=>/^#[0-9a-f]{6}$/.test(q.shade))&&p[1].subParts[0].shade!==p[1].subParts[1].shade,'own shade per section');
 assert.equal(p[1].color,parts[1].color,'the part keeps its colour');
 p=E.subdivideEven(parts,0,4,grid,total);assert.deepEqual(p[0].cuts,[4,8,12]);assert.ok(p[0].subParts.every(q=>q.bars===2));
 p=E.removeCut(p,0,8.3,total,grid);assert.deepEqual(p[0].cuts,[4,12]);p=E.clearCuts(p,0,grid,total);assert.equal(p[0].subParts,null);
 p=E.merge(parts,0,grid,total);assert.deepEqual(p[0].cuts,[16],'merged part remembers the old boundary as section');assert.equal(p[0].subParts.length,2);
 // sections survive a save / reload of the working copy
 const store=memStore(),E2=factory(store),asset={fileName:'s.wav',originalDuration:40,sampleRate:44100};E2.save(asset,E2.subdivideEven(parts,1,2,grid,total));
 assert.deepEqual(factory(store).current(asset,{ok:true,durationSec:total,grid,parts}).parts[1].cuts,[24]);
});
test('sections by mouse: move a section boundary (snapped, between its neighbours), a section every n bars',()=>{
 const {E,parts}=base();let p=E.subdivideEven(parts,0,2,grid,total);assert.deepEqual(p[0].cuts,[8]);
 p=E.moveCut(p,0,0,11.2,grid,'bar',total);assert.deepEqual(p[0].cuts,[12]);p=E.moveCut(p,0,0,40,grid,'bar',total);assert.deepEqual(p[0].cuts,[14],'one bar stays before the part end');
 p=E.subdivideEvery(parts,1,1,grid,total);assert.deepEqual(p[1].cuts,[18,20,22,24,26,28,30]);assert.ok(p[1].subParts.every(q=>q.bars===1));
 p=E.subdivideEvery(parts,1,4,grid,total);assert.deepEqual(p[1].cuts,[24]);
});
test('SONG-PARTS-MANUAL-01: the finished analysis is stored per song (without the novelty curve), survives a new store, at most 24 songs',()=>{
 const st=memStore(),E=factory(st),asset={fileName:'a.wav',originalDuration:40,sampleRate:44100};
 assert.equal(E.loadResult(asset),null,'nothing stored: the strip waits for a click');
 const {parts}=base();E.saveResult(asset,{ok:true,rhythmic:true,durationSec:40,grid,parts,bpm:120,segmentsPerBar:4,novelty:new Array(500).fill(.5),debug:{x:1}});
 const r=factory(st).loadResult(asset);assert.ok(r?.ok);assert.equal(r.parts.length,3);assert.equal(r.bpm,120);assert.equal(r.novelty,undefined);assert.equal(r.debug,undefined);assert.deepEqual(r.grid.bars,grid.bars);
 E.saveResult(asset,{ok:false,reason:'x'});assert.ok(factory(st).loadResult(asset)?.ok,'a failed run does not overwrite');
 for(let i=0;i<30;i++)E.saveResult({fileName:'s'+i+'.wav',originalDuration:40,sampleRate:44100},{ok:true,durationSec:40,parts});
 const F=factory(st);assert.equal(F.loadResult(asset),null,'the oldest song left the store');assert.ok(F.loadResult({fileName:'s29.wav',originalDuration:40,sampleRate:44100}));
 assert.equal(JSON.parse(st.getItem('xensonar.songParts.analysis.index.v1')).length,24);
 E.clearResult({fileName:'s29.wav',originalDuration:40,sampleRate:44100});assert.equal(factory(st).loadResult({fileName:'s29.wav',originalDuration:40,sampleRate:44100}),null);
});
test('free numbers: every 7 bars, every 1.5 bars (in segments), every 0.5 bar, evenly into 5 / into more sections than bars',()=>{
 const {E}=base(),one=E.normalize([{startSec:0,endSec:40,label:'A',segmentsPerBar:4}],grid,total);
 let p=E.subdivideEvery(one,0,7,grid,total);assert.deepEqual(p[0].cuts,[14,28]);
 p=E.subdivideEvery(one,0,1.5,grid,total);assert.deepEqual(p[0].cuts.slice(0,3),[3,6,9],'1.5 bars of 2 s = every 6 segments');
 p=E.subdivideEvery(one,0,.5,grid,total);assert.equal(p[0].cuts[0],1);assert.equal(p[0].cuts.length,39);
 p=E.subdivideEven(one,0,5,grid,total);assert.deepEqual(p[0].cuts,[8,16,24,32]);
 const short=E.normalize([{startSec:0,endSec:4,label:'A',segmentsPerBar:4},{startSec:4,endSec:40,label:'B',segmentsPerBar:4}],grid,total);
 p=E.subdivideEven(short,0,4,grid,total);assert.deepEqual(p[0].cuts,[1,2,3],'2 bars into 4: on segments');
 assert.equal(E.subdivideEvery(one,0,0,grid,total),one);assert.equal(E.subdivideEvery(one,0,NaN,grid,total),one);
});
test('PART-NAMES-01: a name and a colour per kind (letter) – every part of it and its sections follow; reset returns to the letter',()=>{
 const st=memStore(),E=factory(st),asset={fileName:'n.wav',originalDuration:40,sampleRate:44100},{parts}=base();
 const result={ok:true,durationSec:40,grid,parts:E.subdivideEven(parts,0,2,grid,total)};
 E.setKind(asset,'A',{name:'Verse',color:'#123456'});
 const v=factory(st).current(asset,result).parts;assert.deepEqual(v.map(p=>E.displayName(p)),['Verse 1','B','Verse 2'],'SONG-PART-TAGS-01: repeated kinds are numbered');assert.ok(v.filter(p=>p.label==='A').every(p=>p.color==='#123456'));
 assert.equal(v[1].color,E.colorOf('B'),'other kinds keep their colour');assert.equal(v[0].subParts.length,2);assert.notEqual(v[0].subParts[0].shade,v[0].subParts[1].shade);
 E.setKind(asset,'A',{name:'',color:null});assert.deepEqual(factory(st).kinds(asset),{});assert.equal(factory(st).current(asset,result).parts[0].name,undefined);
 E.setKind(asset,'A',{name:'A'});assert.deepEqual(E.kinds(asset),{},'the letter itself is no name');E.setKind(asset,'B',{color:'red'});assert.deepEqual(E.kinds(asset),{},'only #rrggbb');
});
test('SONG-PART-TAGS-01: repetition number only for repeated letters (A1, A2), sections in small letters (A1a, A1b), repetition colour',()=>{
 const {E,parts}=base();const p=E.subdivideEven(parts,0,2,grid,total);
 assert.deepEqual(p.map(x=>x.tag),['A1','B','A2']);assert.deepEqual(p.map(x=>E.displayName(x)),['A1','B','A2']);
 assert.deepEqual(p[0].subParts.map(q=>q.tag),['A1a','A1b']);assert.equal(E.sectionName(p[0],p[0].subParts[1]),'A1b');
 assert.ok(p[0].occColor&&p[2].occColor&&p[0].occColor!==p[2].occColor,'A1 and A2 have different edge colours');assert.equal(p[1].occColor,null,'B occurs once: no number, no edge colour');
 const q=E.subdivideEven(p,1,3,grid,total);assert.deepEqual(q[1].subParts.map(x=>x.tag),['Ba','Bb','Bc']);
 const named=E.decorate(q,{A:{name:'Verse'}});assert.equal(E.sectionName(named[0],named[0].subParts[0]),'Verse 1a');
 const nb=E.decorate(q,{B:{name:'Bridge'}});assert.equal(E.sectionName(nb[1],nb[1].subParts[2]),'Bridge c');
});
test('SONG-PART-TAGS-02: a mask belongs to the unit that CONTAINS it: section, else part (across its sections), else none',()=>{
 const {E,parts}=base();const p=E.subdivideEven(parts,0,2,grid,total);// A1 0–16 (A1a 0–8, A1b 8–16), B 16–32, A2 32–40
 const tag=(a,b)=>{const h=E.unitForRange(p,a,b);return h?(h.sub?h.sub.tag:h.part.tag):null};
 assert.equal(tag(8,16),'A1b','a whole section');assert.equal(tag(10,14),'A1b','4 bars out of the section: still A1b');
 assert.equal(tag(6,12),'A1','across A1a | A1b: only the part');assert.equal(tag(0,16),'A1','the whole part');
 assert.equal(tag(20,28),'B','a part of B');assert.equal(tag(34,38),'A2');
 assert.equal(tag(12,20),null,'across A1 | B: no designation');assert.equal(tag(8.04,15.98),'A1b','grid edges are tolerated');
});
