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
