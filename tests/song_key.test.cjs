'use strict';
// KEY-01 (no browser): the key of a part or section from the chroma timeline of the song analysis (Krumhansl–Kessler profiles),
// read for any range; key distance (relative = 0, fifth = 1). TAKT-SNAP-01: with snap Bar / Beat the Taktometer counts the
// resized mask (10 bars minus 2 = 8, Beat: 7.5), only snap Off stretches the bar count. Usage: node --test tests/song_key.test.cjs
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const extract=require('./helpers/extract_function.cjs');
const src=p=>fs.readFileSync(path.join(__dirname,'..','src','rooms',p),'utf8');
const M=new Function(extract(src('00_meter_analysis.js'),'__xenMeterAnalysisFactory')+'\nreturn __xenMeterAnalysisFactory();')();
const P=new Function('__xenMeterAnalysisFactory',extract(src('00_song_parts.js'),'__xenSongPartsFactory')+'\nreturn __xenSongPartsFactory(__xenMeterAnalysisFactory());')(()=>M);
const SR=11025,hz=m=>440*2**((m-69)/12);
/* triads with bass, 2 s each: a progression in one key (no drums) */
function progression(chords,sec=2){const x=new Float32Array(Math.round(chords.length*sec*SR));
 chords.forEach((c,i)=>{const o=Math.round(i*sec*SR),n=Math.round(sec*SR);for(const [m,a] of [[c[0]-24,.35],...c.map(v=>[v,.25]),[c[0]+12,.12]])
  {const f=hz(m);for(let j=0;j<n;j++){const e=Math.min(1,j/400,(n-j)/400);x[o+j]+=a*e*(Math.sin(2*Math.PI*f*j/SR)+.3*Math.sin(4*Math.PI*f*j/SR))}}});return x}
// D major: D – G – A – D – Bm – G – A – D (midi 62 = D4)
const Dmaj=[[62,66,69],[67,71,74],[69,73,76],[62,66,69],[71,74,78],[67,71,74],[69,73,76],[62,66,69]];
// A minor (harmonic): Am – Dm – E – Am – F – Dm – E – Am
const Amin=[[69,72,76],[62,65,69],[64,68,71],[69,72,76],[65,69,72],[62,65,69],[64,68,71],[69,72,76]];
test('a progression in D major reads D major, one in A minor reads A minor, clearly',()=>{
 for(const [ch,name] of [[Dmaj,'D major'],[Amin,'A minor']]){const tl=P.keyTimeline(progression(ch.concat(ch)),SR),k=P.keyOfRange(tl,0,32);
  assert.equal(k.name,name,JSON.stringify(k));assert.notEqual(k.clarity,'unclear',JSON.stringify(k))}
});
test('any range of the timeline has its own key: first half D major, second half A minor',()=>{
 const x=progression(Dmaj.concat(Dmaj,Amin,Amin)),tl=P.keyTimeline(x,SR);assert.equal(tl.v.length,12*Math.ceil(x.length/SR));
 assert.equal(P.keyOfRange(tl,0,32).name,'D major');assert.equal(P.keyOfRange(tl,32,64).name,'A minor');
});
test('key distance: relative major / minor 0, a fifth 1, a tritone away 5+',()=>{
 const k=n=>P.keyOfChroma(Array.from({length:12},(_,i)=>[0,2,4,5,7,9,11].includes((i-n+12)%12)?1+(i===n?1:0)+((i-n+12)%12===7?.5:0):0));
 const C=k(0),G=k(7),Fs=k(6);assert.equal(C.name,'C major');assert.equal(G.name,'G major');assert.equal(P.keyDistance(C,G),1);assert.ok(P.keyDistance(C,Fs)>=5);
 assert.equal(P.keyDistance({pc:0,minor:false},{pc:9,minor:true}),0);assert.equal(P.keyOfChroma(new Array(12).fill(0)),null);
});
test('silence or noise-like flat chroma is unclear, not invented',()=>{const k=P.keyOfChroma(Array.from({length:12},(_,i)=>1+(i%2)*.01));assert.equal(k.clarity,'unclear')});
// ---- TAKT-SNAP-01: __xenMaskCount from lab.js ----
const lab=fs.readFileSync(path.join(__dirname,'..','src','rooms','lab.js'),'utf8');
const count=(latest=null)=>new Function('__xenSongPartsLatest','__xenMeterAnalysis',extract(lab,'__xenMaskCount')+'\nreturn __xenMaskCount;')(latest,M);
test('snap Bar: 10 bars at 120 BPM made 2 bars shorter read 8 bars, tempo stays; Beat: 7.5 bars; Off: nothing counted',()=>{
 const f=count(),meta={bars:10,guideSegments:4},drag={mode:'resize-end',originalMask:{startSec:4,durationSec:20}};
 const r=f({startSec:4,durationSec:16.3},drag,meta,'bar',100,null);assert.equal(r.range.durationSec,16);assert.equal(r.patch.bars,8);assert.ok(Math.abs(r.patch.bpm-120)<1e-9);
 const b=f({startSec:4,durationSec:15.1},drag,meta,'beat',100,null);assert.equal(b.range.durationSec,15);assert.equal(b.patch.bars,7.5);assert.ok(Math.abs(b.patch.bpm-120)<1e-9);
 assert.equal(f({startSec:4,durationSec:16.3},drag,meta,'off',100,null),null,'Off: the bar count stretches (no patch)');
 assert.equal(f({startSec:6,durationSec:20},{...drag,mode:'move'},meta,'bar',100,null),null,'moving keeps the count');
 const s=f({startSec:8.2,durationSec:15.8},{...drag,mode:'resize-start'},meta,'bar',100,null);assert.equal(s.range.startSec,8);assert.equal(s.range.durationSec,16,'the end stays where it is');assert.equal(s.patch.bars,8);
});
test('with a song grid the mask is already snapped to it: the count follows the grid length',()=>{
 const source={sourceAsset:{}},f=count({asset:source.sourceAsset,result:{grid:{bars:[0,2,4]}}});
 const r=f({startSec:4,durationSec:12},{mode:'resize-end',originalMask:{startSec:4,durationSec:20}},{bars:10,guideSegments:4},'bar',100,source);
 assert.equal(r.range.durationSec,12);assert.equal(r.patch.bars,6);assert.equal(r.patch.guideSegments,4);
});
