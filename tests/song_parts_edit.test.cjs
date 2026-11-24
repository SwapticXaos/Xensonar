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
