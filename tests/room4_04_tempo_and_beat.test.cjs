// ROOM4-04: (1) tempo change while playing keeps the beat position, (2) a beat at frame 0 is detected.
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const mt=fs.readFileSync(path.join(root,'src/post-oct/032-xen-room-multitrack.js'),'utf8');
const sh=fs.readFileSync(path.join(root,'src/post-oct/033-xen-multitrack-shared.js'),'utf8');
function cut(src,start,end){const a=src.indexOf(start),b=src.indexOf(end,a);assert(a>=0&&b>a,'marker '+start);return src.slice(a,b)}

test('tempo change while playing: restart beat is read with the OLD tempo',()=>{
  const Engine=new Function(cut(mt,'class Engine{','const engine=new Engine();')+';return Engine')();
  const e=new Engine();
  const P=bpm=>({bpm,loop:{on:false,start:0,end:0},master:{volume:1},tracks:[]});
  e.playing=true;e.project=P(120);e.lib=new Map();e.ctx={currentTime:10};
  e.segs=[{i:1,a:0,b:Infinity,t:2}]; // started at ctx time 2 from beat 0 -> at 10 s and 120 bpm we are at beat 16
  assert.strictEqual(e.position(),16);
  const restart=e.update(P(60),new Map());
  assert.strictEqual(restart,true);
  assert.strictEqual(e.restartBeat,16,'position must be 16 beats (old tempo), not 8 (new tempo applied to old timeline)');
});

test('beat detection counts a beat that sits at frame 0',()=>{
  const body=cut(sh,' function detectTempo(',' async function decode(');
  const detectTempo=new Function(body+';return detectTempo')();
  const rate=44100,bpm=120,spb=60/bpm,len=rate*3,x=new Float32Array(len);
  for(let b=0;b*spb<2.8;b++){const s=Math.round(b*spb*rate);for(let i=0;i<2000&&s+i<len;i++)x[s+i]+=(b%4==0?1:.5)*Math.exp(-i/300)*Math.sin(i*.3)}
  const r=detectTempo(x,rate);
  assert(r.bpm===null||Math.abs(r.bpm-120)<3||Math.abs(r.bpm-60)<2||Math.abs(r.bpm-240)<5,"bpm "+r.bpm);
  assert(r.offsetSec<0.03,'first beat is at 0 s, offset was '+r.offsetSec);
});

test('loading an arrangement with >64 tracks / >1024 clips does not silently cut it',()=>{
  const src=cut(mt,'const DB=','/* ---------- persistence');
  const sanitize=new Function(src.replace(/^const DB=[^\n]*\n/,"const KEY='current',FORMAT='xensonar.multitrack',VERSION=2;\n")+';return sanitize')();
  const clip=i=>({id:'c'+i,materialId:'m1',startBeat:i,lenBeats:1});
  const raw={format:'xensonar.multitrack',tracks:Array.from({length:100},(_,i)=>({id:'t'+i,clips:i===0?Array.from({length:3000},(_,k)=>clip(k)):[clip(0)]}))};
  const out=sanitize(raw,108);
  assert.strictEqual(out.tracks.length,100);
  assert.strictEqual(out.tracks[0].clips.length,3000);
});
