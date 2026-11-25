'use strict';
// SNAP-ALL-01 / GRAB-EDGE-01 / COUNT-STEADY-01 / BEAT-01 (no browser): the ONE gesture code of the purple loop mask, loaded from the
// production sources – hit test (hA), range ($_), snap (__xenSnapMaskGesture) and the Taktometer count (__xenMaskCount).
// The import view and the open Wave Editor both run exactly these functions (tests/e2e/same_mask_views.cjs proves the wiring).
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const extract=require('./helpers/extract_function.cjs');
const read=f=>fs.readFileSync(path.join(__dirname,'..','src','rooms',f),'utf8');
const lab=read('lab.js'),edit=read('00_song_parts_edit.js'),meter=read('00_meter_analysis.js');
const names=['pc','Ty','hA','$_','__xenSnapMaskDrag','__xenBeatsPerBar','__xenMaskCount','__xenSnapMaskMove','__xenSnapMaskGesture','__xenSnapMaskCancel','__xenMaskSegSec'];
const mem=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};
/* one isolated copy per test, with its own snap-mode store */
const build=mode=>{const store=mem();const src=
 extract(edit,'__xenSongPartsEditFactory')+'\n'+extract(meter,'__xenMeterAnalysisFactory')+'\n'+
 'const __xenSongPartsEdit=__xenSongPartsEditFactory(STORE);const __xenMeterAnalysis=__xenMeterAnalysisFactory();let __xenSongPartsLatest=null;\n'+
 names.map(n=>extract(lab,n)).join('\n')+
 '\nreturn {'+names.map(n=>JSON.stringify(n)+':'+n).join(',')+',setLatest:v=>{__xenSongPartsLatest=v}};';
 const o=new Function('STORE',src)(store);o.setMode=m=>store.setItem('xensonar.songParts.snap.v1',m);o.setMode(mode);return o};
const near=(a,b,eps=1e-6)=>Math.abs(a-b)<=eps;
// Taktometer: 4 bars over 8 s (2 s per bar, 120 BPM in quarters), 16 segments per bar; the apply writes beatsPerBar = guideSegments
const META={bars:4,guideSegments:16,beatsPerBar:16,bpm:60*64/8};
const resizeEnd=(o,to,meta=META,total=30)=>{const drag={mode:'resize-end',anchorTime:10,startSec:2,durationSec:8,originalMask:{startSec:2,durationSec:8},state:{}};const patches=[];
 const r=o.__xenSnapMaskGesture(o.$_(to,drag,total,.05),drag,{source:null,total,exportMeta:meta,onMetaPatch:p=>patches.push(p)});return {r,patches,drag}};

test('BEAT-01: Beat is a real beat (4 per bar at 16 segments), not a segment',()=>{
 const o=build('beat');let {r}=resizeEnd(o,8.3);assert.ok(near(r.durationSec,6.5),'beat = 0.5 s: '+r.durationSec);
 o.setMode('segment');({r}=resizeEnd(o,8.3));assert.ok(near(r.durationSec,6.25),'segment = 0.125 s: '+r.durationSec);
 o.setMode('bar');({r}=resizeEnd(o,8.3));assert.ok(near(r.durationSec,6),'bar = 2 s: '+r.durationSec);
 o.setMode('off');({r}=resizeEnd(o,8.3));assert.ok(near(r.durationSec,6.3),'off = free: '+r.durationSec);
 assert.equal(o.__xenBeatsPerBar({guideSegments:12,beatsPerBar:12}),4);assert.equal(o.__xenBeatsPerBar({guideSegments:6,beatsPerBar:6}),3);
 assert.equal(o.__xenBeatsPerBar({guideSegments:7,beatsPerBar:7}),7);assert.equal(o.__xenBeatsPerBar({guideSegments:16,beatsPerBar:3}),4,'3 does not divide 16: derived');
 assert.equal(o.__xenBeatsPerBar({guideSegments:12,beatsPerBar:3}),3);
});
test('COUNT-STEADY-01: while the edge is dragged, length and count always belong together (tempo and bar length stay)',()=>{
 for(const mode of ['segment','beat','bar']){const o=build(mode);
  for(let to=11.9;to>4.4;to-=.037){const {r,patches}=resizeEnd(o,to);const p=patches[patches.length-1];if(!p)continue;
   assert.ok(near(r.durationSec/p.bars,2,1e-9),mode+' bar length '+(r.durationSec/p.bars));assert.ok(near(p.bpm,META.bpm,1e-6),mode+' tempo '+p.bpm)}}
});
test('move without analysis: whole steps from the start position, length kept, inside the file',()=>{
 const o=build('bar');const drag={mode:'move',anchorTime:6,startSec:2,durationSec:8,originalMask:{startSec:2,durationSec:8},state:{}};
 const go=t=>o.__xenSnapMaskGesture(o.$_(t,drag,30,.05),drag,{source:null,total:30,exportMeta:META});
 let r=go(9.1);/* +3.1 s = 1.55 bars → 2 bars */assert.ok(near(r.startSec,6)&&near(r.durationSec,8),JSON.stringify(r));
 r=go(60);assert.ok(near(r.startSec,22)&&near(r.durationSec,8),'end of file: '+JSON.stringify(r));
 o.setMode('segment');r=go(6.3);assert.ok(near(r.startSec,2.25)&&near(r.durationSec,8),JSON.stringify(r));
});
test('analysis grid: a move to the file end keeps the length; an edge pulled over the other keeps one step',()=>{
 const o=build('bar'),asset={},source={sourceAsset:asset,durationSec:30};
 o.setLatest({asset,result:{grid:{bars:Array.from({length:16},(_,i)=>i*2),segments:Array.from({length:61},(_,i)=>i*.5),barSec:2,segmentsPerBar:4}}});
 const drag={mode:'move',anchorTime:24,startSec:20,durationSec:8,originalMask:{startSec:20,durationSec:8},state:{}};
 let r=o.__xenSnapMaskGesture(o.$_(27.4,drag,30,.05),drag,{source,total:30,exportMeta:META});assert.ok(near(r.durationSec,8)&&r.startSec+r.durationSec<=30+1e-9,JSON.stringify(r));
 const d2={mode:'resize-end',anchorTime:8,startSec:4,durationSec:4,originalMask:{startSec:4,durationSec:4},state:{}};
 r=o.__xenSnapMaskGesture(o.$_(1,d2,30,.05),d2,{source,total:30,exportMeta:{bars:2,guideSegments:4,beatsPerBar:4,bpm:120}});assert.ok(near(r.startSec,4)&&near(r.durationSec,2),'one bar stays: '+JSON.stringify(r));
});
test('cancel gives the Taktometer its count back',()=>{
 const o=build('segment');const {patches,drag}=resizeEnd(o,7.1);assert.ok(patches.length>0);
 const back=[];o.__xenSnapMaskCancel(drag,{onMetaPatch:p=>back.push(p)});assert.deepEqual(back,[{bars:4,guideSegments:16,beatsPerBar:16,bpm:META.bpm}]);
});
test('GRAB-EDGE-01: the nearest edge wins; a mask larger than the view has its edges at the view border',()=>{
 const o=build('bar'),view={startSec:0,durationSec:12},spp=12/1200;
 const hit=(t,mask)=>o.hA(t,o.Ty(mask,view)??mask,spp);
 assert.equal(hit(11.97,{startSec:0,durationSec:30}),'resize-end','right view border of a whole-file mask');
 assert.equal(hit(6,{startSec:0,durationSec:30}),'move');
 assert.equal(hit(1.11,{startSec:1,durationSec:.12}),'resize-end','narrow mask: nearest edge');
 assert.equal(hit(1.01,{startSec:1,durationSec:.12}),'resize-start');
});
test('FILE-EDGE-01: the start and the end of the audio are always reachable with Bar / Beat / Segment; the tempo stays',()=>{
 const total=30.7;
 for(const mode of ['bar','beat','segment']){const o=build(mode);
  const drag=()=>({mode:'resize-end',anchorTime:10,startSec:2,durationSec:8,originalMask:{startSec:2,durationSec:8},state:{}});
  let d=drag(),patches=[],r=o.__xenSnapMaskGesture(o.$_(40,d,total,.05),d,{source:null,total,exportMeta:META,onMetaPatch:p=>patches.push(p)});
  assert.ok(near(r.startSec+r.durationSec,total),mode+': pulled past the end = file end '+JSON.stringify(r));
  const p=patches[patches.length-1];assert.ok(p&&near(p.bpm,META.bpm,1e-6)&&near(r.durationSec/p.bars,2,1e-9),mode+': tempo and bar length stay '+JSON.stringify(p));
 }
 const o=build('bar');let d={mode:'resize-end',anchorTime:10,startSec:2,durationSec:8,originalMask:{startSec:2,durationSec:8},state:{}};
 let r=o.__xenSnapMaskGesture(o.$_(29.9,d,total,.05),d,{source:null,total,exportMeta:META});assert.ok(near(r.startSec+r.durationSec,30),'closer to the bar line than to the end: bar line '+JSON.stringify(r));
 const asset={},source={sourceAsset:asset,durationSec:total};o.setLatest({asset,result:{grid:{bars:Array.from({length:15},(_,i)=>.3+i*2),segments:Array.from({length:60},(_,i)=>.3+i*.5),barSec:2,segmentsPerBar:4}}});
 d={mode:'resize-start',anchorTime:4.3,startSec:4.3,durationSec:8,originalMask:{startSec:4.3,durationSec:8},state:{}};
 r=o.__xenSnapMaskGesture(o.$_(.05,d,total,.05),d,{source,total,exportMeta:META});assert.ok(near(r.startSec,0),'first downbeat at 0.3 s: the left edge still reaches 0 '+JSON.stringify(r));
 o.setMode('off');d={mode:'resize-end',anchorTime:10,startSec:2,durationSec:8,originalMask:{startSec:2,durationSec:8},state:{}};
 r=o.__xenSnapMaskGesture(o.$_(40,d,total,.05),d,{source:null,total,exportMeta:META});assert.ok(near(r.startSec+r.durationSec,total),'off: free to the end');
});
