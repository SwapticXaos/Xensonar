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
  const make=audio=>new Function('audio','clipLen','isFrozen',fn+';return mixdownMissing')(audio,c=>c.lenBeats,(project,t)=>!!t?.frozenBy&&project.tracks.some(x=>x.id===t.frozenBy));
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

test('ROOM4-09: effect data is additive, tails are bounded, the reverb impulse is deterministic',()=>{
  const src=cut(mt,'const DB=','/* ---------- persistence');
  const m=new Function(src.replace(/^const DB=[^\n]*\n/,"const KEY='current',FORMAT='xensonar.multitrack',VERSION=2;\n")+';return {sanitize,fxShape,fxOf,sanitizeFx,AUTO,hasAuto}')();
  const raw={format:'xensonar.multitrack',tracks:[{id:'a',clips:[]},{id:'b',fx:{lowCut:120,echoBeats:.75,echoFb:5,reverb:.2},clips:[{id:'c',materialId:'m',startBeat:0,lenBeats:4,reverse:1}]},{id:'c',fx:{echoBeats:0,drive:0},clips:[]}]};
  const out=m.sanitize(raw,100);
  assert.strictEqual('fx' in out.tracks[0],false,'a track without effects stores nothing');
  assert.deepStrictEqual(out.tracks[1].fx,{lowCut:120,highCut:20000,drive:0,echoBeats:.75,echoFb:.92,echoMix:.3,reverb:.2});
  assert.strictEqual('fx' in out.tracks[2],false,'all-default effects are dropped');
  assert.strictEqual(out.tracks[1].clips[0].reverse,true);
  assert.strictEqual(m.fxShape(m.fxOf(out.tracks[1])),'her');assert.strictEqual(m.fxShape(m.fxOf(out.tracks[0])),'');
  assert.strictEqual(out.master.reverbSize,2.2);
  const fxsrc=cut(mt,'function fxEff(','function buildTrackFx(');
  const f=new Function('clamp','num','fxOf','fxShape','AUTO','hasAuto','isFrozen',fxsrc+';return {reverbIR,fxTailSec,driveCurve}')((v,lo,hi)=>Math.max(lo,Math.min(hi,v)),(v,d)=>Number.isFinite(Number(v))?Number(v):d,m.fxOf,m.fxShape,m.AUTO,m.hasAuto,(project,t)=>!!t?.frozenBy&&project.tracks.some(x=>x.id===t.frozenBy));
  const ctx={sampleRate:48000,createBuffer:(c,n)=>{const d=[new Float32Array(n),new Float32Array(n)];return {length:n,getChannelData:i=>d[i]}}};
  const a=f.reverbIR(ctx,1),b=f.reverbIR(ctx,1);
  assert.deepStrictEqual(Array.from(a.getChannelData(0).subarray(600,640)),Array.from(b.getChannelData(0).subarray(600,640)),'same impulse every time');
  assert.notDeepStrictEqual(Array.from(a.getChannelData(0).subarray(600,640)),Array.from(a.getChannelData(1).subarray(600,640)),'left and right differ');
  let e=0;for(const v of a.getChannelData(0))e+=v*v;assert(Math.abs(Math.sqrt(e)-.5)<1e-3,'normalised energy');
  assert.strictEqual(f.fxTailSec({bpm:120,master:{},tracks:[{volume:1,clips:[]}]}),0,'no effects: no extra tail');
  assert(f.fxTailSec({bpm:120,master:{reverbSize:3},tracks:[{volume:1,fx:{reverb:.3}}]})===3);
  assert(f.fxTailSec({bpm:120,master:{},tracks:[{volume:1,fx:{echoBeats:1,echoFb:.92,echoMix:.5}}]})<=12);
  assert.strictEqual(f.fxTailSec({bpm:120,master:{},tracks:[{volume:1,mute:true,fx:{reverb:.3}}]}),0,'muted tracks add no tail');
  const c=f.driveCurve(.5);assert(Math.abs(c[0]+1)<1e-6&&Math.abs(c[1023]-1)<1e-6&&Math.abs(c[511]+c[512])<1e-6);
});

test('ROOM4-10: markers are additive data; the metronome plans every beat once, with an accent on the bar line',()=>{
  const src=cut(mt,'const DB=','/* ---------- persistence');
  const m=new Function(src.replace(/^const DB=[^\n]*\n/,"const KEY='current',FORMAT='xensonar.multitrack',VERSION=2;\n")+';return {sanitize}')();
  const out=m.sanitize({format:'xensonar.multitrack',tracks:[{id:'a',clips:[]}],markers:[{id:'x',beat:8,name:'B'},{beat:'4',name:'A'},{beat:'nope'},null,{beat:-3}]},100);
  assert.deepStrictEqual(out.markers.map(k=>[k.name,k.beat]),[['',0],['A',4],['B',8]],'sorted, junk dropped, negatives clamped');
  assert.deepStrictEqual(m.sanitize({format:'xensonar.multitrack',tracks:[{id:'a',clips:[]}]},100).markers,[],'old projects: no markers');

  const Engine=new Function(cut(mt,'class Engine{','const engine=new Engine();')+';return Engine')();
  const e=new Engine(),clicks=[];e.playing=true;e.metro=true;e.ctx={currentTime:0};e.metroGain={};e.click=(t,acc)=>clicks.push([+t.toFixed(3),acc]);
  e.project={bpm:120,beatsPerBar:4,loop:{on:false,start:0,end:4},master:{volume:1},tracks:[]};e.lib=new Map();
  e.segs=[{i:1,a:0,b:Infinity,t:.1}];
  e.schedule();e.schedule();// twice: nothing is planned twice
  assert.deepStrictEqual(clicks.map(c=>c[0]),[.1,.6,1.1],'a click every beat inside the 1.5 s horizon, at 120 BPM');
  assert.deepStrictEqual(clicks.map(c=>c[1]),[true,false,false],'accent on the bar line only');
  e.ctx.currentTime=1.0;e.schedule();assert.deepStrictEqual(clicks.slice(3).map(c=>c[0]),[1.6,2.1],'later beats follow, still no duplicates');
  e.metro=false;e.ctx.currentTime=3;const n=clicks.length;e.schedule();assert.strictEqual(clicks.length,n,'metronome off: no clicks');
});

test('ROOM4-11: track EQ is stored in the project, a flat EQ never is, junk is cleaned',()=>{
  const src=cut(mt,'const DB=','/* ---------- persistence');
  const m=new Function(src.replace(/^const DB=[^\n]*\n/,"const KEY='current',FORMAT='xensonar.multitrack',VERSION=2;\n")+';return {sanitize,eqFlat,eqPick,sanitizeEq,eqKey}')();
  const flat=()=>Array(360).fill(0),cutc=Array(360).fill(0).map((_,i)=>i>200?-.8:0);
  assert.strictEqual(m.eqKey('t1'),'arrangement:t1');
  assert.strictEqual(m.sanitizeEq({a:flat(),b:flat(),morph:0}),undefined,'flat: nothing stored');
  assert.strictEqual(m.sanitizeEq(null),undefined);assert.strictEqual(m.sanitizeEq({a:'x',b:[]}),undefined);assert.strictEqual(m.sanitizeEq({a:Array(5000).fill(1),b:flat()}),undefined,'oversized');
  const e=m.sanitizeEq({a:cutc,b:flat(),morph:2,bands:99,mode:'weird',low:-999,high:99,enabled:false,manualCenters:[100,'x',200]});
  assert.strictEqual(e.morph,1);assert.strictEqual(e.bands,24);assert.strictEqual(e.mode,'adaptive');assert.strictEqual(e.low,-60);assert.strictEqual(e.high,12);assert.strictEqual(e.enabled,false);assert.deepStrictEqual(e.manualCenters,[100,200]);
  assert.strictEqual(m.sanitizeEq({a:flat(),b:flat(),enabled:false})?.enabled,false,'a switched-off flat EQ is still a statement the user made');
  const out=m.sanitize({format:'xensonar.multitrack',tracks:[{id:'a',clips:[]},{id:'b',eq:{a:cutc,b:flat(),morph:.5},clips:[]},{id:'c',eq:{a:flat(),b:flat()},clips:[]}]},100);
  assert.strictEqual('eq' in out.tracks[0],false);assert.strictEqual(out.tracks[1].eq.morph,.5);assert.strictEqual('eq' in out.tracks[2],false);
  const pick=m.eqPick({a:new Float32Array([0,.5]),b:[0],morph:.2,bands:12,mode:'raster',low:-30,high:6,enabled:true,manualCenters:new Float32Array([1])});
  assert.deepStrictEqual(pick.a,[0,.5]);assert(Array.isArray(pick.a)&&Array.isArray(pick.manualCenters),'plain JSON-able arrays');
});

test('ROOM4-12: freeze data is additive; a freeze without its bounce track is no freeze; frozen tracks do not sound or export',()=>{
  const src=cut(mt,'const DB=','/* ---------- persistence');
  const m=new Function(src.replace(/^const DB=[^\n]*\n/,"const KEY='current',FORMAT='xensonar.multitrack',VERSION=2;\n")+';return {sanitize,isFrozen}')();
  const ok=m.sanitize({format:'xensonar.multitrack',tracks:[{id:'a',frozenBy:'b',clips:[]},{id:'b',bounceOf:'a',clips:[]}]},100);
  assert.strictEqual(ok.tracks[0].frozenBy,'b');assert.strictEqual(ok.tracks[1].bounceOf,'a');assert(m.isFrozen(ok,ok.tracks[0]));assert(!m.isFrozen(ok,ok.tracks[1]));
  const orphan=m.sanitize({format:'xensonar.multitrack',tracks:[{id:'a',frozenBy:'gone',clips:[]},{id:'s',frozenBy:'s',clips:[]}]},100);
  assert.strictEqual('frozenBy' in orphan.tracks[0],false,'bounce track gone -> awake again');assert.strictEqual('frozenBy' in orphan.tracks[1],false,'a track cannot freeze itself');
  assert.strictEqual('frozenBy' in m.sanitize({format:'xensonar.multitrack',tracks:[{id:'a',clips:[]}]},100).tracks[0],false,'old projects unchanged');
  const lib=cut(mt,'function matBeats(','function clipLen(');
  const mm=new Function('audio','clipLen','isFrozen',cut(mt,'function mixdownMissing(','async function mixdown(')+';return mixdownMissing')(new Map([['x',{status:'error',error:'e'}]]),c=>c.lenBeats,m.isFrozen);
  const tr=(id,o)=>({id,name:id,volume:1,mute:false,solo:false,clips:[{materialId:'x',startBeat:0,lenBeats:4,gain:1}],...o});
  const frozen={bpm:100,tracks:[tr('a',{frozenBy:'b'}),tr('b',{clips:[]})]};
  assert.strictEqual(mm(frozen,new Map([['x',{id:'x',name:'x'}]]),0,8).length,0,'a frozen track is not checked, it does not sound');
  const awake={bpm:100,tracks:[tr('a',{}),tr('b',{clips:[]})]};
  assert.strictEqual(mm(awake,new Map([['x',{id:'x',name:'x'}]]),0,8).length,1);
});

test('ROOM4-13: automation data, curve values, ramps and the live scheduler',()=>{
  const src=cut(mt,'const DB=','/* ---------- persistence');
  const m=new Function(src.replace(/^const DB=[^\n]*\n/,"const KEY='current',FORMAT='xensonar.multitrack',VERSION=2;\n")+';return {sanitize,sanitizeAuto,autoValue,autoEvents,AUTO,hasAuto}')();
  assert.strictEqual(m.sanitizeAuto(null),undefined);assert.strictEqual(m.sanitizeAuto({volume:[],pan:'x',nope:[{b:1,v:1}]}),undefined,'empty / unknown dropped');
  const a=m.sanitizeAuto({volume:[{b:8,v:5},{b:2,v:.5},{b:2,v:.7},{b:'x',v:1},null,{b:-3,v:1}],lowCut:[{b:0,v:1},{b:4,v:99999}]});
  assert.deepStrictEqual(a.volume,[{b:0,v:1},{b:2,v:.7},{b:8,v:2}],'sorted, same beat keeps the last, negatives to 0, values clamped');
  assert.deepStrictEqual(a.lowCut.map(p=>p.v),[20,8000]);
  assert.strictEqual('auto' in m.sanitize({format:'xensonar.multitrack',tracks:[{id:'t',clips:[]}]},100).tracks[0],false,'old projects: no automation');
  const keep=m.sanitize({format:'xensonar.multitrack',tracks:[{id:'t',auto:{pan:[{b:0,v:-1},{b:4,v:1}]},clips:[]}]},100).tracks[0];assert.strictEqual(keep.auto.pan.length,2);assert(m.hasAuto(keep,'pan')&&!m.hasAuto(keep,'volume'));
  const sp=m.AUTO.pan,pts=[{b:0,v:-1},{b:4,v:1}];
  assert.strictEqual(m.autoValue(pts,sp,-5),-1);assert.strictEqual(m.autoValue(pts,sp,2),0);assert.strictEqual(m.autoValue(pts,sp,9),1);assert.strictEqual(m.autoValue([],sp,3),0,'no curve = the knob default');
  const lg=m.AUTO.lowCut,lp=[{b:0,v:100},{b:4,v:400}];assert(Math.abs(m.autoValue(lp,lg,2)-200)<1e-6,'log parameters interpolate geometrically (halfway between 100 and 400 is 200)');
  const ev=m.autoEvents([{b:0,v:0},{b:2,v:1},{b:6,v:0}],m.AUTO.reverb,1,5);assert.deepStrictEqual(ev.map(e=>[e.b,+e.v.toFixed(3)]),[[2,1],[5,.25]],'linear: one target per breakpoint plus the end');
  const evl=m.autoEvents(lp,lg,0,4);assert(evl.length>=8&&Math.abs(evl[evl.length-1].v-400)<1e-6&&evl.every((e,i,l)=>i===0||e.b>l[i-1].b),'log: short geometric steps, ascending, ending exactly on the target');

  const Engine=new Function('AUTO','autoValue','autoEvents','isFrozen',cut(mt,'class Engine{','const engine=new Engine();')+';return Engine')(m.AUTO,m.autoValue,m.autoEvents,()=>false);
  const calls=[],prm={cancelScheduledValues:t=>calls.push(['cancel',+t.toFixed(3)]),setValueAtTime:(v,t)=>calls.push(['set',+v.toFixed(3),+t.toFixed(3)]),linearRampToValueAtTime:(v,t)=>calls.push(['ramp',+v.toFixed(3),+t.toFixed(3)])};
  const e=new Engine();e.autoPos=new Map();e.project={bpm:120,beatsPerBar:4,tracks:[{id:'t',auto:{pan:[{b:0,v:-1},{b:8,v:1}]}}]};e.chains=new Map([['t',{pan:{pan:prm}}]]);
  const seg={i:1,a:0,b:Infinity,t:1};e.scheduleAuto(seg,1,2.5,.5);// 120 BPM: a beat is .5 s; window beats 0..3
  assert.deepStrictEqual(calls,[['cancel',1],['set',-1,1],['ramp',-.25,2.5]].slice(0,2).concat([['ramp',-.25,2.5]]).filter((c,i)=>i<3),'first window: start value, then a ramp to the window end');
  const n=calls.length;e.scheduleAuto(seg,1.2,3.5,.5);// next window continues from beat 3 to 5: only a ramp, no restart
  assert.deepStrictEqual(calls.slice(n),[['ramp',.25,3.5]],'continuing window: a single linear ramp, no cancel, no set');
  const m2=calls.length;e.scheduleAuto(seg,1.2,3.5,.5);assert.strictEqual(calls.length,m2,'nothing is scheduled twice');
  e.scheduleAuto({i:2,a:0,b:Infinity,t:5},5,6,.5);assert.deepStrictEqual(calls.slice(m2).slice(0,2),[['cancel',5],['set',-1,5]],'a new loop pass starts again from the curve value');
});

test('ROOM4-14: a capture is cut to the timeline by sample frame and shifted by the latency',()=>{
  const recSlice=new Function(cut(mt,'function recSlice(','/* ---------- live engine')+';return recSlice')();
  const ramp=n=>Float32Array.from({length:n},(_,i)=>i);
  const cap={sampleRate:1000,first:5000,channels:[ramp(4000),ramp(4000)]};// capture frames 5000..8999
  let out=recSlice(cap,5.5,0);// playback started at 5.5 s = frame 5500: 500 frames after the first captured frame
  assert.strictEqual(out[0].length,3500);assert.strictEqual(out[0][0],500);assert.strictEqual(out[1][0],500);
  out=recSlice(cap,5.5,100);assert.strictEqual(out[0][0],600,'100 ms latency (100 frames at 1 kHz): the recording starts 100 frames later in the capture');assert.strictEqual(out[0].length,3400);
  out=recSlice(cap,4.8,0);assert.strictEqual(out[0].length,4200,'capture started after playback: the gap is filled with silence');assert.strictEqual(out[0][199],0);assert.strictEqual(out[0][200],0);assert.strictEqual(out[0][201],1);
  assert.strictEqual(recSlice(cap,5,-50)[0][0],0,'negative latency is ignored');
});
