// MTW-02: clip fades of Room IV. Shapes (linear / equal power / S), the position-accurate level of a voice that is only a part of a clip,
// and the promise that clips without fades and whole clips with linear fades are scheduled exactly as before.
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const mt=fs.readFileSync(path.join(__dirname,'..','src/post-oct/032-xen-room-multitrack.js'),'utf8');
function cut(src,start,end){const a=src.indexOf(start),b=src.indexOf(end,a);assert(a>=0&&b>a,'marker '+start);return src.slice(a,b)}
const pre="const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));const num=(v,d)=>Number.isFinite(Number(v))?Number(v):d;const uid=p=>p+'-x';";
const api=new Function(pre+cut(mt,'const FADE=Object.freeze','function sanitize(raw,liveBpm)')+';return {FADE,fadeGeo,fadeLevel,clipEnvelope,sanitizeClip}')();
const rec=()=>{const ev=[];return {ev,setValueAtTime(v,t){ev.push(['set',v,t])},linearRampToValueAtTime(v,t){ev.push(['ramp',v,t])}}};
const valueAt=(ev,t)=>{let prev=ev[0];for(const e of ev){if(e[2]>=t){if(e[0]==='set'||e===prev)return e[2]===t?e[1]:prev[1];const f=(t-prev[2])/(e[2]-prev[2]);return prev[1]+(e[1]-prev[1])*f}prev=e}return prev[1]};
const sane=ev=>{assert.strictEqual(ev[0][0],'set');assert.strictEqual(ev[0][1],0);for(let i=1;i<ev.length;i++){assert(ev[i][2]>ev[i-1][2],'times rise strictly: '+JSON.stringify(ev.slice(i-1,i+1)));assert.strictEqual(ev[i][0],'ramp','only linear ramps after the start');assert(Number.isFinite(ev[i][1])&&ev[i][1]>=0)}assert.strictEqual(ev[ev.length-1][1],0,'ends at zero')};
const near=(a,b,tol,msg)=>assert(Math.abs(a-b)<=tol,msg+': '+a+' vs '+b);

test('shapes: linear 0.5, equal power 0.707 and S-curve 0.5 at the middle; S is soft at the start',()=>{
  const L=8,lin=api.fadeGeo({fadeIn:2,fadeOut:2},L),eq=api.fadeGeo({fadeIn:2,fadeOut:2,fadeInShape:'eq',fadeOutShape:'eq'},L),s=api.fadeGeo({fadeIn:2,fadeInShape:'s'},L);
  near(api.fadeLevel(lin,L,1),.5,1e-12,'linear');near(api.fadeLevel(eq,L,1),Math.SQRT1_2,1e-12,'equal power in');near(api.fadeLevel(eq,L,7),Math.SQRT1_2,1e-12,'equal power out');
  near(api.fadeLevel(s,L,1),.5,1e-12,'S middle');near(api.fadeLevel(s,L,.5),.1464,1e-3,'S quarter');assert.strictEqual(api.fadeLevel(eq,L,4),1);assert.strictEqual(api.fadeLevel(eq,L,0),0);near(api.fadeLevel(eq,L,8),0,1e-12,'end');
  // equal power: in² + out² = 1 across a crossfade
  for(const u of [.1,.37,.5,.8]){const a=api.FADE.eq(u),b=api.FADE.eq(1-u);near(a*a+b*b,1,1e-12,'power')}
});

test('a fade is at most half the clip',()=>{const g=api.fadeGeo({fadeIn:10,fadeOut:10},4);assert.strictEqual(g.FI,2);assert.strictEqual(g.FO,2)});

test('whole clip with equal-power fades: sane ramps, the right level in the fade, flat between',()=>{
  const p=rec(),spb=.5,L=8,tA=10,tB=tA+L*spb;api.clipEnvelope(p,{fadeIn:2,fadeOut:2,fadeInShape:'eq',fadeOutShape:'eq'},.8,tA,tB,spb,0,L,L);sane(p.ev);
  near(valueAt(p.ev,tA+.5),.8*Math.SQRT1_2,.004,'middle of the fade-in');near(valueAt(p.ev,tA+2),.8,1e-9,'flat');near(valueAt(p.ev,tB-.5),.8*Math.SQRT1_2,.004,'middle of the fade-out');
  near(p.ev[p.ev.length-1][2],tB,1e-9,'ends at the clip end');assert(p.ev.length>=24&&p.ev.length<=30,'12 short ramps per shaped fade: '+p.ev.length);
});

test('a voice that starts inside a fade plays the fade from there (play from the cursor, loop pass, export range)',()=>{
  const p=rec(),spb=.5,L=8,tA=3;api.clipEnvelope(p,{fadeIn:4,fadeOut:0},1,tA,tA+(L-1)*spb,spb,1,L,L);sane(p.ev);
  near(p.ev[1][2],tA+.004,1e-12,'4 ms guard');near(p.ev[1][1],(1+.004/spb)/4,1e-9,'level of that place, not full level');
  near(valueAt(p.ev,tA+1),.75,1e-9,'beat 3 of a 4-beat linear fade');near(valueAt(p.ev,tA+1.5),1,1e-9,'fade done');
  // a voice that ends inside the fade-out
  const q=rec();api.clipEnvelope(q,{fadeIn:0,fadeOut:4,fadeOutShape:'eq'},1,0,3,spb,0,6,L);sane(q.ev);near(valueAt(q.ev,2.5),Math.sin((L-5)/4*Math.PI/2),.004,'inside the fade-out');near(q.ev[q.ev.length-1][2],3,1e-12,'guard to zero at the voice end');
});

test('a voice far from any fade: guard in, flat, guard out',()=>{
  const p=rec();api.clipEnvelope(p,{fadeIn:1,fadeOut:1,fadeInShape:'s'},.5,0,1,.5,3,5,8);sane(p.ev);assert.deepStrictEqual(p.ev.map(e=>e[1]),[0,.5,.5,0]);near(p.ev[1][2],.004,1e-12,'in');near(p.ev[2][2],1-.006,1e-12,'out');
});

test('very short voices do not produce overlapping or backward events',()=>{
  for(const dur of [.004,.006,.011,.02]){const p=rec();api.clipEnvelope(p,{fadeIn:.5,fadeOut:.5,fadeInShape:'eq',fadeOutShape:'s'},1,1,1+dur,.5,0,dur/.5,dur/.5);sane(p.ev)}
});

test('data: shapes are kept, anything else is dropped; old clips are unchanged',()=>{
  const c=api.sanitizeClip({id:'a',materialId:'m',fadeIn:1,fadeOut:2,fadeInShape:'eq',fadeOutShape:'s',lenBeats:4});assert.strictEqual(c.fadeInShape,'eq');assert.strictEqual(c.fadeOutShape,'s');
  const d=api.sanitizeClip({id:'a',materialId:'m',fadeInShape:'constructor',fadeOutShape:'lin',lenBeats:4});assert(!('fadeInShape' in d)&&!('fadeOutShape' in d));
  const old=api.sanitizeClip({id:'a',materialId:'m',fadeIn:1,lenBeats:4});assert(!('fadeInShape' in old));
});

test('scheduling as before: no fades, or a whole clip with linear fades, is exactly set / ramp / set / ramp',()=>{
  const body=cut(mt,'function planVoice(','/* ---------- ROOM4-09');
  const planVoice=new Function('voiceSource','cycleBeats','clamp','clipEnvelope',body+';return planVoice')(()=>({buffer:{},region:{a:0,b:2,len:2}}),()=>4,(v,a,b)=>Math.max(a,Math.min(b,v)),(...a)=>{calls.push(a)});
  let calls=[];const mk=()=>{const g=rec();return {g,ctx:{createBufferSource:()=>({playbackRate:{},connect(){},start(){},stop(){}}),createGain:()=>({gain:g,connect(){}})}}};
  const body0=body;
  let m=mk();planVoice(m.ctx,{},{startBeat:0,inBeat:0,gain:1,fadeIn:0,fadeOut:0,lenBeats:4},{},{},0,4,1,3,.5,true,true,null);
  assert.deepStrictEqual(m.g.ev,[['set',0,1],['ramp',1,1.004],['set',1,3-.006],['ramp',0,3]]);assert.strictEqual(calls.length,0);
  m=mk();planVoice(m.ctx,{},{startBeat:0,inBeat:0,gain:1,fadeIn:1,fadeOut:1,lenBeats:4},{},{},0,4,1,3,.5,true,true,null);
  assert.deepStrictEqual(m.g.ev,[['set',0,1],['ramp',1,1.5],['set',1,2.5],['ramp',0,3]]);assert.strictEqual(calls.length,0);
  // a part of a faded clip, or a shape, goes to the position-accurate envelope
  m=mk();planVoice(m.ctx,{},{startBeat:0,inBeat:0,gain:1,fadeIn:1,fadeOut:1,lenBeats:4},{},{},.5,4,1,2.75,.5,false,true,null);assert.strictEqual(calls.length,1);assert.strictEqual(m.g.ev.length,0);
  assert.deepStrictEqual(calls[0].slice(2),[1,1,2.75,.5,.5,4,4]);
  m=mk();planVoice(m.ctx,{},{startBeat:0,inBeat:0,gain:1,fadeIn:1,fadeOut:0,fadeInShape:'eq',lenBeats:4},{},{},0,4,1,3,.5,true,true,null);assert.strictEqual(calls.length,2);
});

test('sample grid: a clip at its original speed starts on a sample (no interpolation for the whole clip); tape-speed clips are left alone',()=>{
  const body=cut(mt,'function planVoice(','/* ---------- ROOM4-09');
  const make=(len,bufRate)=>new Function('voiceSource','cycleBeats','clamp','clipEnvelope',body+';return planVoice')(()=>({buffer:{sampleRate:bufRate},region:{a:0,b:len,len}}),()=>4,(v,a,b)=>Math.max(a,Math.min(b,v)),()=>{});
  const run=(pv,tA)=>{const src={playbackRate:{value:0},connect(){},start(t,o){src.at=t;src.off=o},stop(){}};pv({sampleRate:48000,createBufferSource:()=>src,createGain:()=>({gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){}})},{},{startBeat:0,inBeat:0,gain:1,fadeIn:0,fadeOut:0,lenBeats:4},{},{},0,4,tA,tA+2,.5,true,true,null);return src};
  const tA=2.888888888888889;/* 5.2 beats at 108 BPM: frame 138666.67 */
  let s=run(make(2,48000),tA);assert.strictEqual(s.playbackRate.value,1);assert(Math.abs(s.at*48000-Math.round(s.at*48000))<1e-6,'start is on the sample grid: '+s.at*48000);assert(Math.abs(s.at-tA)<=.5/48000+1e-12,'moved by at most half a sample');
  s=run(make(3,48000),tA);assert.strictEqual(s.at,tA,'tape speed (rate 1.5): unchanged');assert.strictEqual(s.playbackRate.value,1.5);
  s=run(make(2,44100),tA);assert.strictEqual(s.at,tA,'a buffer at another sample rate is resampled anyway: unchanged');
});
