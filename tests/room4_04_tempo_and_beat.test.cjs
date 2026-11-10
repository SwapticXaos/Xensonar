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

test('ROOM4-05: Original-speed clips keep their real length when the tempo changes',()=>{
  const num=(v,d)=>Number.isFinite(Number(v))?Number(v):d;
  const retempo=new Function('return '+cut(mt,'function retempo(','/* ---------- decoded audio').trim().replace(/^function retempo/,'function'))();
  const P={bpm:120,tracks:[{clips:[{id:'n',fit:'natural',lenBeats:8,inBeat:2},{id:'t',fit:'tempo',lenBeats:8,inBeat:2},{id:'b',fit:'bpm',sourceBpm:120,lenBeats:8,inBeat:2},{id:'r',fit:'natural',repeats:2,inBeat:0}]}]};
  const Q=retempo(P,60),c=id=>Q.tracks[0].clips.find(x=>x.id===id);
  assert.strictEqual(Q.bpm,60);
  assert.strictEqual(c('n').lenBeats,4,'4 s of audio = 4 beats at 60 BPM'); assert.strictEqual(c('n').inBeat,1);
  assert.strictEqual(c('t').lenBeats,8); assert.strictEqual(c('b').lenBeats,8,'beat-bound fits are unchanged');
  assert.strictEqual(c('r').lenBeats,undefined,'clips without explicit length stay derived');
  const back=retempo(Q,120);assert.strictEqual(back.tracks[0].clips[0].lenBeats,8);
  assert.strictEqual(retempo(P,120).tracks,P.tracks);
});

test('ROOM4-05: source info line',()=>{
  const fn=cut(mt,'function sourceInfo(','function regionOf(');const sourceInfo=new Function(fn+';return sourceInfo')();
  assert.strictEqual(sourceInfo({numberOfChannels:2,sampleRate:48000,duration:12.84}),'Stereo · 48 kHz · 00:12.8');
  assert.strictEqual(sourceInfo({numberOfChannels:1,sampleRate:44100,duration:3.44}),'Mono · 44,1 kHz · 00:03.4');
  assert.strictEqual(sourceInfo(null),'decoding source …');
});

test('ROOM4-05: looping for hours does not accumulate planned-voice keys; leaving the room frees decoded audio',()=>{
  const Engine=new Function(cut(mt,'class Engine{','const engine=new Engine();')+';return Engine')();
  const e=new Engine();e.playing=true;e.ctx={currentTime:0};
  e.project={bpm:120,loop:{on:true,start:0,end:4},master:{volume:1},tracks:[]};
  e.segs=[{i:1,a:0,b:4,t:0}];
  for(let sec=0;sec<7200;sec+=.2){e.ctx.currentTime=sec;e.extendSegments(sec+1.5);for(const s of e.segs)for(const c of ['c1','c2','c3'])e.keys.add(s.i+'|'+c)}
  assert(e.keys.size<100,'keys '+e.keys.size);
  assert(e.segs.length<8);
  const fn=cut(mt,'function releaseDecoded(','function regionOf(');
  const audio=new Map([['a',{status:'ready'}],['b',{status:'error'}],['c',{status:'loading'}]]);
  const variants=new Map([['v1',{status:'ready'}],['v2',{status:'loading'}]]);
  new Function('audio','variants',fn+';releaseDecoded()')(audio,variants);
  assert.deepStrictEqual([...audio.keys()],['c']);assert.deepStrictEqual([...variants.keys()],['v2']);
});

test('ROOM4-07: warp is additive data (old projects unchanged) and the variant plan matches the mode',()=>{
  const src=cut(mt,'const DB=','/* ---------- persistence');
  const sanitize=new Function(src.replace(/^const DB=[^\n]*\n/,"const KEY='current',FORMAT='xensonar.multitrack',VERSION=2;\n")+';return sanitize')();
  const raw={format:'xensonar.multitrack',tracks:[{id:'t',clips:[{id:'a',materialId:'m',startBeat:0,lenBeats:4},{id:'b',materialId:'m',startBeat:4,lenBeats:6,stretch:1.5,warp:'grain',pitch:-350},{id:'c',materialId:'m',startBeat:9,lenBeats:1,stretch:999,warp:'x',pitch:0.2}]},{id:'u',pitch:700,clips:[]}]};
  const out=sanitize(raw,108),[a,b,c]=out.tracks[0].clips;
  assert.deepStrictEqual([a.stretch,a.warp,a.pitch],[undefined,undefined,undefined],'a clip without warp gains no fields');
  assert.deepStrictEqual([b.stretch,b.warp,b.pitch],[1.5,'grain',-350]);
  assert.deepStrictEqual([c.stretch,c.warp,c.pitch],[20,undefined,undefined],'clamped / dropped');
  assert.strictEqual(out.tracks[0].pitch,0);assert.strictEqual(out.tracks[1].pitch,700);

  const lib=cut(mt,'function matBeats(','function clipLen(');
  const plan=new Function('clamp','num','regionOf',lib+cut(mt,'const variants=new Map()','function requestVariant(')+';return {variantPlan,cycleBeats}')(
    (v,lo,hi)=>Math.max(lo,Math.min(hi,v)),(v,d)=>Number.isFinite(Number(v))?Number(v):d,(e,b)=>({a:0,b:b.duration,len:b.duration}));
  const entry={id:'m',durationSec:4},buffer={duration:4,sampleRate:48000,length:192000,numberOfChannels:2},t={pitch:0};
  const nat=o=>({fit:'natural',...o});
  assert.strictEqual(plan.cycleBeats(entry,nat({stretch:2}),120),16,'4 s at 120 BPM = 8 beats, stretched ×2 = 16');
  assert.strictEqual(plan.variantPlan(nat({}),t,entry,buffer,120),null,'untouched clip: no variant');
  assert.strictEqual(plan.variantPlan(nat({stretch:2}),t,entry,buffer,120),null,'tape stretch: no variant (playback rate only)');
  const g2=plan.variantPlan(nat({stretch:2,warp:'grain'}),t,entry,buffer,120);
  assert(Math.abs(g2.up-2)<1e-9&&Math.abs(g2.shift-2)<1e-9&&g2.out===384000,'stretch x2 granular: lengthen x2, then shift x2');
  const gh=plan.variantPlan(nat({stretch:.5,warp:'grain'}),t,entry,buffer,120);
  assert(Math.abs(gh.up-1)<1e-9&&Math.abs(gh.shift-.5)<1e-9&&gh.out===192000,'compress x0.5 granular: shift x0.5 at equal length, played twice as fast');
  const pt=plan.variantPlan(nat({pitch:1200}),t,entry,buffer,120);assert(Math.abs(pt.shift-2)<1e-9&&pt.up===1,'pitch only');
  const tr=plan.variantPlan(nat({}),{pitch:-1200},entry,buffer,120);assert(Math.abs(tr.shift-.5)<1e-9,'track pitch applies to its clips');
  assert.match(plan.variantPlan(nat({stretch:8,warp:'grain'}),t,entry,buffer,120).error,/granular range/);
  assert.match(plan.variantPlan(nat({stretch:3,warp:'grain'}),t,{id:'m',durationSec:20},{duration:20,sampleRate:48000,length:960000,numberOfChannels:2},120).error,/too long/);
});
