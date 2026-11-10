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

test('ROOM4-05: mixdown refuses to silently omit audible clips without usable audio',()=>{
  const fn=cut(mt,'function mixdownMissing(','async function mixdown(');
  const make=audio=>new Function('audio','clipLen',fn+';return mixdownMissing')(audio,c=>c.lenBeats);
  const ready={status:'ready'},audio=new Map([['a',ready],['b',{status:'error',error:'decode failed'}],['c',{status:'loading'}]]);
  const lib=new Map([['a',{id:'a',name:'Good'}],['b',{id:'b',name:'Broken'}],['c',{id:'c',name:'Slow'}]]);
  const clip=(m,o={})=>({materialId:m,startBeat:0,lenBeats:4,gain:1,...o});
  const P=tracks=>({bpm:100,tracks});const T=(clips,o={})=>({name:'T',volume:.8,mute:false,solo:false,clips,...o});
  const missing=make(audio);
  assert.deepStrictEqual(missing(P([T([clip('a')])]),lib,0,8),[]);
  assert.strictEqual(missing(P([T([clip('a'),clip('b'),clip('c'),clip('gone')])]),lib,0,8).length,3);
  assert.strictEqual(missing(P([T([clip('b',{startBeat:20})])]),lib,0,8).length,0,'outside the range');
  assert.strictEqual(missing(P([T([clip('b',{muted:true})]),T([clip('b')],{mute:true})]),lib,0,8).length,0,'silent clips/tracks never sound');
  assert.match(missing(P([T([clip('b')])]),lib,0,8)[0].reason,/decode failed/);
});

test('ROOM4-05: deleting a Material used by Multitrack clips forces the visible confirmation with the clip count',async()=>{
  const mix=fs.readFileSync(path.join(root,'src/mix/03_meta_menu__after_v2-session-store.js'),'utf8');
  const body=cut(mix,'async function __xenDeleteLibraryEntry(','\nwindow.__XenM13BootStatus');
  const run=async(usage,ask)=>{
    const calls=[];const dialogs=[];
    const g={__XenMultitrackInbox:{usage}};
    const f=new Function('globalThis','__XenSessionLibraryDeleteGuard','__xenConfirmLibraryDeletion',body+';return __xenDeleteLibraryEntry');
    const del=f(g,{remove:async(entry,commit,a)=>{calls.push(a);if(a)await a('p',entry,{savedProjectCount:0});return {status:'deleted'}}},async(p,e,i)=>{dialogs.push(i);return true});
    const ok=await del({kind:'material',id:'m1'},()=>true,ask);return {ok,calls,dialogs};
  };
  let r=await run(async()=>({clips:3,inbox:1}));
  assert.strictEqual(r.ok,true);assert.strictEqual(r.calls[0].alwaysConfirm,true);assert.strictEqual(r.dialogs[0].multitrackClipCount,4);
  const marker=async()=>true;
  r=await run(async()=>({clips:0,inbox:0}),marker);assert.strictEqual(r.calls[0],marker,'unused material: caller ask untouched');assert.strictEqual(r.dialogs.length,0);
  r=await run(async()=>{throw Error('idb down')});assert.strictEqual(r.ok,true,'inspection failure never blocks deletion');
});
