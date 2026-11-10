(()=>{"use strict";
/* ROOM4-02 · Room IV · Multitrack (deferred chunk, evaluated on first open only).
 * Cold by contract: no timers, listeners or audio nodes while the room is closed.
 * Time is counted in BEATS (free beats per bar, free grid 1/N beat), never 4/4 by default.
 * Tracks reuse the shared Material lane chain (__xenMaterialLaneChain) with their own EQ key and
 * route through a room master gain into the live master input from the shell bridge.
 * Clips reference Material library entries by id (bs()); audio is never copied into the project.
 * Project data owner: IndexedDB "xensonar-multitrack-v1" / store "projects" / key "current". */
const DB='xensonar-multitrack-v1',STORE='projects',KEY='current',FORMAT='xensonar.multitrack',VERSION=2;
const uid=p=>p+'-'+(globalThis.crypto?.randomUUID?.()??(Date.now().toString(36)+Math.random().toString(36).slice(2,8)));
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const num=(v,d)=>Number.isFinite(Number(v))?Number(v):d;
const COLORS=['#f59e0b','#38bdf8','#a78bfa','#34d399','#f472b6','#facc15','#fb7185','#60a5fa'];
function blankTrack(i){return {id:uid('track'),name:'Track '+(i+1),volume:.8,pan:0,mute:false,solo:false,clips:[]}}
function blankProject(liveBpm){return {format:FORMAT,version:VERSION,id:KEY,name:'Untitled Arrangement',bpm:clamp(num(liveBpm,108),20,400),beatsPerBar:4,
 grid:{div:4,snap:true},zoom:28,loop:{on:false,start:0,end:16},master:{volume:.9},tracks:[blankTrack(0)],updatedAt:Date.now()}}
function sanitizeClip(c){const out={id:String(c.id||uid('clip')),materialId:String(c.materialId||''),startBeat:Math.max(0,num(c.startBeat,0)),
 inBeat:Math.max(0,num(c.inBeat,0)),gain:clamp(num(c.gain,1),0,2),fadeIn:clamp(num(c.fadeIn,0),0,256),fadeOut:clamp(num(c.fadeOut,0),0,256),muted:!!c.muted,fit:c.fit==='natural'?'natural':'tempo'};
 if(Number.isFinite(Number(c.lenBeats))&&Number(c.lenBeats)>0)out.lenBeats=clamp(Number(c.lenBeats),1/64,1e5);else out.repeats=clamp(Math.round(num(c.repeats,1)),1,256);
 return out}
function sanitize(raw,liveBpm){
 if(!raw||raw.format!==FORMAT||!Array.isArray(raw.tracks))return blankProject(liveBpm);
 const tracks=raw.tracks.slice(0,64).map((t,i)=>({id:String(t.id||uid('track')),name:String(t.name||('Track '+(i+1))).slice(0,60),volume:clamp(num(t.volume,.8),0,1.5),pan:clamp(num(t.pan,0),-1,1),
  mute:!!t.mute,solo:!!t.solo,clips:(Array.isArray(t.clips)?t.clips:[]).slice(0,1024).map(sanitizeClip).filter(c=>c.materialId)}));
 const loop=raw.loop||{};const ls=Math.max(0,num(loop.start,0)),le=Math.max(ls+1/64,num(loop.end,ls+16));
 return {format:FORMAT,version:VERSION,id:KEY,name:String(raw.name||'Untitled Arrangement').slice(0,100),bpm:clamp(num(raw.bpm,108),20,400),
  beatsPerBar:clamp(num(raw.beatsPerBar,4),.5,64),grid:{div:clamp(Math.round(num(raw.grid?.div,4)),1,64),snap:raw.grid?.snap!==false},
  zoom:clamp(num(raw.zoom,28),4,240),loop:{on:!!loop.on,start:ls,end:le},master:{volume:clamp(num(raw.master?.volume,.9),0,1.5)},
  tracks:tracks.length?tracks:[blankTrack(0)],updatedAt:num(raw.updatedAt,Date.now())};
}
/* ---------- persistence (cold) ---------- */
let dbTask=null;
function db(){if(dbTask)return dbTask;dbTask=new Promise((ok,bad)=>{if(typeof indexedDB==='undefined'){bad(Error('IndexedDB unavailable'));return}
 const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};
 r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();ok(r.result)};r.onerror=()=>bad(r.error||Error('Cannot open multitrack storage'))}).catch(e=>{dbTask=null;throw e});return dbTask}
async function loadProject(){const d=await db();return new Promise((ok,bad)=>{const q=d.transaction(STORE,'readonly').objectStore(STORE).get(KEY);q.onsuccess=()=>ok(q.result??null);q.onerror=()=>bad(q.error)})}
async function saveProject(p){const d=await db();return new Promise((ok,bad)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).put({...p,updatedAt:Date.now()},KEY);tx.oncomplete=()=>ok(true);tx.onerror=()=>bad(tx.error)})}
/* ---------- material library (read-only consumer) ---------- */
function materials(){try{return (bs().entries||[]).filter(e=>e&&e.id)}catch{return []}}
function matBeats(entry){const bars=num(entry?.bars,1),bpb=num(entry?.beatsPerBar,4);return Math.max(1/16,(bars>0?bars:1)*(bpb>0?bpb:4))}
/* Two conversions per clip: 'tempo' = bars x beats of the material (as the Live Room does);
   'natural' = real audio length at the project tempo, original speed (takes, free material). */
function naturalSec(entry){const a=num(entry?.loopStartSec,0),b=num(entry?.loopEndSec,num(entry?.durationSec,0));return Math.max(.01,b-a>0?b-a:num(entry?.durationSec,1))}
function cycleBeats(entry,clip,bpm){return clip?.fit==='natural'?Math.max(1/64,naturalSec(entry)*bpm/60):matBeats(entry)}
function clipLen(c,lib,bpm){return c.lenBeats>0?c.lenBeats:cycleBeats(lib.get(c.materialId),c,bpm)*(c.repeats||1)}
/* ---------- decoded audio: once per material, context-independent ---------- */
const audio=new Map();// materialId -> {status,buffer,peaks,error,size}
const audioListeners=new Set();const audioNotify=()=>{for(const f of audioListeners)f()};
function computePeaks(buffer){const frames=buffer.length,bins=Math.max(64,Math.min(8192,Math.floor(frames/128))),out=new Float32Array(bins);
 for(let ch=0;ch<Math.min(2,buffer.numberOfChannels);ch++){const d=buffer.getChannelData(ch);for(let b=0;b<bins;b++){const a=Math.floor(b*frames/bins),z=Math.floor((b+1)*frames/bins);let m=out[b];for(let i=a;i<z;i+=2){const v=d[i]<0?-d[i]:d[i];if(v>m)m=v}out[b]=m}}return out}
function requestAudio(entry){if(!entry)return null;const size=entry.blob?.size??-1;let r=audio.get(entry.id);if(r&&(r.status!=='error'||r.size===size)&&(r.size===size||size<0))return r;
 r={status:'loading',buffer:null,peaks:null,error:'',size};audio.set(entry.id,r);
 r.promise=(async()=>{try{
   // Starter/demo materials receive their audio only on request (same owner as the Live Room).
   try{await __XenStarterMaterial.ensure({kind:'material',id:entry.id})}catch{}
   const fresh=materials().find(x=>x.id===entry.id)||entry;r.size=fresh.blob?.size??-1;
   const blob=__materialAudioBlob(fresh,'multitrack-decode');const data=await blob.arrayBuffer();
   const Offline=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;const decoder=new Offline(1,1,48000);
   r.buffer=await decoder.decodeAudioData(data.slice(0));r.peaks=computePeaks(r.buffer);r.status='ready';
  }catch(e){r.status='error';r.error=String(e?.message||e).slice(0,160)}finally{audioNotify()}})();return r}
function regionOf(entry,buffer){const d=buffer.duration,a=clamp(num(entry?.loopStartSec,0),0,Math.max(0,d-.01)),b=clamp(num(entry?.loopEndSec,d),a+.01,d);return {a,b,len:b-a}}
/* One voice: a portion [pa,pb) of a clip, in beats, starting at audio time tA. Shared by live play and mixdown. */
function planVoice(ctx,dest,clip,entry,buffer,pa,pb,tA,tB,spb,isStart,isEnd){
 const mb=cycleBeats(entry,clip,60/spb),r=regionOf(entry,buffer),rate=clamp(r.len/(mb*spb),.0625,16),off=pa-clip.startBeat+clip.inBeat;
 const frac=((off/mb)%1+1)%1,offset=r.a+frac*r.len,dur=Math.max(.004,tB-tA),lvl=clip.muted?0:clip.gain;
 const fi=Math.min(dur*.5,isStart?Math.max(.004,clip.fadeIn*spb):.004),fo=Math.min(dur*.5,isEnd?Math.max(.006,clip.fadeOut*spb):.006);
 const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=buffer;src.loop=true;src.loopStart=r.a;src.loopEnd=r.b;src.playbackRate.value=rate;
 g.gain.setValueAtTime(0,tA);g.gain.linearRampToValueAtTime(lvl,tA+fi);g.gain.setValueAtTime(lvl,tB-fo);g.gain.linearRampToValueAtTime(0,tB);
 src.connect(g);g.connect(dest);src.start(tA,offset);src.stop(tB+.01);return {src,g,rate}}
/* ---------- live engine (hot only while playing) ---------- */
class Engine{
 constructor(){this.ctx=null;this.playing=false;this.voices=new Set();this.chains=new Map();this.timer=null;this.keys=new Set();this.segs=[];this.segSerial=0;this.project=null;this.lib=new Map();this.master=null;this.meter=null;this.sigs=new Map()}
 spb(){return 60/this.project.bpm}
 gainFor(t){const any=this.project.tracks.some(x=>x.solo);return (t.mute||(any&&!t.solo))?0:t.volume}
 sigOf(t,c){return t.id+'|'+c.materialId+'|'+c.startBeat+'|'+c.inBeat+'|'+clipLen(c,this.lib,this.project.bpm)+'|'+c.gain+'|'+c.fadeIn+'|'+c.fadeOut+'|'+c.muted+'|'+c.fit}
 chainFor(t){let ch=this.chains.get(t.id);if(ch)return ch;const ctx=this.ctx,input=ctx.createGain(),gain=ctx.createGain();gain.gain.value=this.gainFor(t);
  const chain=__xenMaterialLaneChain(ctx,{source:input,gain,panValue:t.pan,eqKey:__XenEQ.keyFor('arrangement',t.id),route:out=>out.connect(this.master)});
  ch={input,gain,pan:chain.pan,eq:chain.eq,output:chain.output};this.chains.set(t.id,ch);return ch}
 dropChain(id){const ch=this.chains.get(id);if(!ch)return;this.chains.delete(id);const now=this.ctx.currentTime;ch.gain.gain.setTargetAtTime(0,now,.01);
  setTimeout(()=>{try{ch.input.disconnect();ch.output.disconnect()}catch{}try{ch.eq?.dispose?.()}catch{}},120)}
 async play(project,fromBeat,lib){this.stop();this.project=project;this.lib=lib;const bridge=__xenMultitrackBridge.current;
  if(!bridge)throw Error('Audio bridge is not ready yet; open the Live Room once and come back.');
  const ctx=await bridge.ensureAudioReady();this.ctx=ctx;
  const used=new Set();for(const t of project.tracks)for(const c of t.clips)used.add(c.materialId);
  await Promise.all([...used].map(id=>requestAudio(lib.get(id))?.promise));
  this.master=ctx.createGain();this.master.gain.value=project.master.volume;this.meter=ctx.createAnalyser();this.meter.fftSize=1024;
  this.master.connect(this.meter);this.master.connect(bridge.getMasterInput(ctx));
  for(const t of project.tracks)this.chainFor(t);
  const t0=ctx.currentTime+.08,from=Math.max(0,fromBeat),L=project.loop;
  this.segs=[{i:++this.segSerial,a:from,b:L.on&&from<L.end?L.end:Infinity,t:t0}];this.playing=true;this.keys.clear();this.sigs=new Map();
  for(const t of project.tracks)for(const c of t.clips)this.sigs.set(c.id,this.sigOf(t,c));
  const tick=()=>{if(!this.playing)return;this.schedule();this.timer=setTimeout(tick,200)};tick()}
 extendSegments(horizon){const L=this.project.loop,spb=this.spb();let last=this.segs[this.segs.length-1];
  while(L.on&&last&&Number.isFinite(last.b)&&last.t+(last.b-last.a)*spb<horizon){const next={i:++this.segSerial,a:L.start,b:L.end,t:last.t+(last.b-last.a)*spb};this.segs.push(next);last=next}
  const now=this.ctx.currentTime;this.segs=this.segs.filter(s=>!Number.isFinite(s.b)||s.t+(s.b-s.a)*spb>now-.5)}
 schedule(){const ctx=this.ctx,now=ctx.currentTime,horizon=now+1.5,spb=this.spb();this.extendSegments(horizon);
  for(const s of this.segs){if(s.t>horizon)continue;
   for(const t of this.project.tracks){const ch=this.chainFor(t);
    for(const c of t.clips){const key=s.i+'|'+c.id;if(this.keys.has(key))continue;const entry=this.lib.get(c.materialId),au=entry?audio.get(entry.id):null;
     const cs=c.startBeat,ce=cs+clipLen(c,this.lib,this.project.bpm);let pa=Math.max(cs,s.a);const pb=Math.min(ce,s.b);if(pb<=pa){this.keys.add(key);continue}
     let tA=s.t+(pa-s.a)*spb;const tB=s.t+(pb-s.a)*spb;if(tA>horizon)continue;if(tB<=now+.02){this.keys.add(key);continue}
     if(!au||au.status!=='ready')continue;// picked up on a later tick once decoded
     const start=pa===cs;if(tA<now+.02){pa+=(now+.02-tA)/spb;tA=now+.02}
     this.keys.add(key);const v=planVoice(ctx,ch.input,c,entry,au.buffer,pa,pb,tA,tB,spb,start&&tA===s.t+(cs-s.a)*spb,pb===ce);
     const voice={...v,clipId:c.id,sig:this.sigs.get(c.id)};this.voices.add(voice);v.src.onended=()=>{this.voices.delete(voice);try{v.g.disconnect()}catch{}}}}}}
 /* Edits while playing: mixer as AudioParam moves; changed/removed clips fade out and are re-planned from now. */
 update(project,lib){if(!this.playing){this.project=project;this.lib=lib;return false}const old=this.project;this.project=project;this.lib=lib;const ctx=this.ctx,now=ctx.currentTime;
  if(old.bpm!==project.bpm||old.loop.on!==project.loop.on||old.loop.start!==project.loop.start||old.loop.end!==project.loop.end)return true;// caller restarts at the current beat
  this.master.gain.setTargetAtTime(project.master.volume,now,.02);
  for(const t of project.tracks){const ch=this.chainFor(t);ch.gain.gain.setTargetAtTime(this.gainFor(t),now,.02);ch.pan?.pan.setTargetAtTime(t.pan,now,.02)}
  for(const id of [...this.chains.keys()])if(!project.tracks.some(t=>t.id===id))this.dropChain(id);
  const sigs=new Map();for(const t of project.tracks)for(const c of t.clips){sigs.set(c.id,this.sigOf(t,c));const e=lib.get(c.materialId);if(e)requestAudio(e)}
  const changed=new Set();for(const [id,s] of this.sigs)if(sigs.get(id)!==s)changed.add(id);for(const id of sigs.keys())if(!this.sigs.has(id))changed.add(id);
  this.sigs=sigs;if(!changed.size)return false;
  for(const v of [...this.voices])if(changed.has(v.clipId)){try{v.g.gain.cancelScheduledValues(now);v.g.gain.setTargetAtTime(0,now,.006);v.src.stop(now+.05)}catch{}this.voices.delete(v)}
  for(const k of [...this.keys])if(changed.has(k.slice(k.indexOf('|')+1)))this.keys.delete(k);
  this.schedule();return false}
 position(){if(!this.playing||!this.ctx)return null;const now=this.ctx.currentTime,spb=this.spb();for(const s of this.segs){const end=Number.isFinite(s.b)?s.t+(s.b-s.a)*spb:Infinity;if(now>=s.t&&now<end)return s.a+(now-s.t)/spb}
  const s=this.segs[0];return s?Math.max(s.a,s.a+(now-s.t)/spb):null}
 level(){if(!this.meter)return 0;const b=new Float32Array(this.meter.fftSize);this.meter.getFloatTimeDomainData(b);let m=0;for(const v of b){const a=v<0?-v:v;if(a>m)m=a}return m}
 stop(){this.playing=false;clearTimeout(this.timer);this.timer=null;const ctx=this.ctx;
  if(ctx){const now=ctx.currentTime;for(const v of this.voices){try{v.g.gain.cancelScheduledValues(now);v.g.gain.setTargetAtTime(0,now,.008);v.src.stop(now+.06)}catch{}}}this.voices.clear();
  const chains=[...this.chains.values()],master=this.master,meter=this.meter;this.chains.clear();this.master=null;this.meter=null;
  setTimeout(()=>{for(const c of chains){try{c.input.disconnect();c.output.disconnect()}catch{}try{c.eq?.dispose?.()}catch{}}try{master?.disconnect();meter?.disconnect()}catch{}},120);this.keys.clear();this.segs=[]}
}
const engine=new Engine();
/* ---------- mixdown (cold, offline) ---------- */
async function mixdown(project,lib,fromBeat,toBeat,format){
 const used=new Set();for(const t of project.tracks)for(const c of t.clips)used.add(c.materialId);
 await Promise.all([...used].map(id=>requestAudio(lib.get(id))?.promise));
 const sr=48000,spb=60/project.bpm,dur=(toBeat-fromBeat)*spb,tail=.05,frames=Math.ceil((dur+tail)*sr);
 if(!(frames>0)||frames>sr*60*30)throw Error('Mixdown range must be between 0 and 30 minutes.');
 const Offline=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;const ctx=new Offline(2,frames,sr);
 const master=ctx.createGain();master.gain.value=project.master.volume;master.connect(ctx.destination);const any=project.tracks.some(t=>t.solo);
 for(const t of project.tracks){const g=ctx.createGain(),pan=ctx.createStereoPanner();g.gain.value=(t.mute||(any&&!t.solo))?0:t.volume;pan.pan.value=t.pan;g.connect(pan);pan.connect(master);
  for(const c of t.clips){const e=lib.get(c.materialId),au=e?audio.get(e.id):null;if(!au||au.status!=='ready')continue;const cs=c.startBeat,ce=cs+clipLen(c,lib,project.bpm);
   const pa=Math.max(cs,fromBeat),pb=Math.min(ce,toBeat);if(pb<=pa)continue;planVoice(ctx,g,c,e,au.buffer,pa,pb,(pa-fromBeat)*spb,(pb-fromBeat)*spb,spb,pa===cs,pb===ce)}}
 const out=await ctx.startRendering();const channels=[out.getChannelData(0),out.getChannelData(1)];let peak=0;for(const ch of channels)for(const v of ch){const a=v<0?-v:v;if(a>peak)peak=a}
 const core=globalThis.__XenWaveCoreW01;if(!core?.encodeWav)throw Error('WAV encoder unavailable.');
 const bytes=core.encodeWav({channels,sampleRate:sr,frames:channels[0].length},{format,dither:format==='pcm16'});
 return {blob:new Blob([bytes],{type:'audio/wav'}),peak,seconds:dur}}
/* ---------- view ---------- */
const CSS=`.xmt{color:#e7e5e4;font:13px/1.35 system-ui,sans-serif;max-width:1500px;margin:0 auto;outline:none}
.xmt h2{font-size:20px;letter-spacing:.12em;margin:0;color:#fde68a}.xmt .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.xmt .bar{background:#0b0b0d;border:1px solid #2b2b31;border-radius:10px;padding:8px 12px;margin:8px 0}
.xmt button{background:#18181b;color:#e7e5e4;border:1px solid #3f3f46;border-radius:6px;padding:4px 10px;cursor:pointer;font:inherit}
.xmt button:hover{background:#27272a}.xmt button[aria-pressed=true]{background:#fde68a;color:#111;border-color:#fde68a}.xmt button:disabled{opacity:.45;cursor:default}
.xmt button:focus-visible,.xmt input:focus-visible,.xmt select:focus-visible,.xmt-menu button:focus-visible{outline:2px solid #fbbf24;outline-offset:1px}
.xmt input,.xmt select{background:#111113;color:#e7e5e4;border:1px solid #3f3f46;border-radius:6px;padding:3px 6px;font:inherit}
.xmt input[type=number]{width:66px}.xmt label{display:inline-flex;gap:6px;align-items:center;color:#a8a29e}
.xmt .tracks{position:relative;overflow-x:auto;border:1px solid #2b2b31;border-radius:10px;background:#09090b}
.xmt .trk{display:grid;grid-template-columns:240px 1fr;border-bottom:1px solid #1f1f23;min-height:64px}.xmt .trk.rr{min-height:28px}
.xmt .hdr{padding:6px 8px;background:#0f0f12;border-right:1px solid #26262b;display:flex;flex-direction:column;gap:4px;position:sticky;left:0;z-index:4}
.xmt .hdr .row{flex-wrap:nowrap;gap:4px}.xmt .hdr input[type=text]{width:104px}.xmt .hdr input[type=range]{width:78px}.xmt .hdr button{padding:2px 7px}
.xmt .lane{position:relative;min-height:64px}.xmt .lane.drop{background:#1c1917}.xmt .ruler{position:relative;height:28px;cursor:pointer;border-bottom:1px solid #2b2b31}
.xmt .tick{position:absolute;top:0;bottom:0;border-left:1px solid #2a2a30}.xmt .tick.barl{border-left:1px solid #57534e}.xmt .tick span{position:absolute;top:4px;left:3px;font-size:10px;color:#a8a29e}
.xmt .loopr{position:absolute;top:0;height:6px;background:rgba(56,189,248,.25);border:1px solid #38bdf8;border-top:0}.xmt .loopr.off{background:rgba(120,113,108,.15);border-color:#57534e}
.xmt .clip{position:absolute;top:5px;bottom:5px;border-radius:6px;border:1px solid var(--c);background:color-mix(in srgb,var(--c) 28%,#0c0a09);
 color:#fafaf9;padding:0;overflow:hidden;text-align:left;font-size:12px;cursor:grab;touch-action:none}
.xmt .clip canvas{position:absolute;left:0;top:14px;width:100%;height:calc(100% - 14px);pointer-events:none;opacity:.85}
.xmt .clip .nm{position:absolute;left:5px;top:1px;right:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;text-shadow:0 1px 2px #000}
.xmt .clip .eg{position:absolute;top:0;bottom:0;width:7px;cursor:ew-resize}.xmt .clip .eg.l{left:0}.xmt .clip .eg.r{right:0}
.xmt .clip[aria-selected=true]{outline:2px solid #fde68a;z-index:2}.xmt .clip.muted{opacity:.45}.xmt .clip.bad{--c:#ef4444!important}
.xmt .clip .rep{position:absolute;top:0;bottom:0;border-left:1px dashed rgba(253,230,138,.5);pointer-events:none}
.xmt .ph{position:absolute;top:0;bottom:0;width:2px;background:#fbbf24;pointer-events:none;z-index:5;display:none}
.xmt .cur{position:absolute;top:0;bottom:0;width:1px;background:#38bdf8;pointer-events:none;z-index:1}
.xmt .meter{width:120px;height:8px;background:#1c1917;border-radius:4px;overflow:hidden}.xmt .meter i{display:block;height:100%;width:0;background:linear-gradient(90deg,#22c55e,#facc15 70%,#ef4444)}
.xmt table{border-collapse:collapse;width:100%}.xmt td,.xmt th{border-bottom:1px solid #26262b;padding:3px 6px;text-align:left}
.xmt .muted{color:#78716c}.xmt .warn{color:#fbbf24}.xmt .err{color:#f87171}.xmt .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.xmt-menu{position:fixed;z-index:1000;min-width:210px;background:#111113;border:1px solid #3f3f46;border-radius:8px;padding:4px;box-shadow:0 10px 30px #000a;font:13px system-ui,sans-serif}
.xmt-menu button{display:flex;justify-content:space-between;gap:16px;width:100%;background:none;border:0;color:#e7e5e4;padding:5px 10px;border-radius:5px;text-align:left;cursor:pointer;font:inherit}
.xmt-menu button:hover,.xmt-menu button:focus{background:#27272a}.xmt-menu button:disabled{opacity:.4}.xmt-menu small{color:#78716c}.xmt-menu hr{border:0;border-top:1px solid #2b2b31;margin:4px 2px}`;
function useStyle(){P.useEffect(()=>{if(document.getElementById('xen-multitrack-style'))return;const s=document.createElement('style');s.id='xen-multitrack-style';s.textContent=CSS;document.head.appendChild(s)},[])}
const fmtPos=(beat,bpb)=>{const bar=Math.floor(beat/bpb+1e-9)+1,b=beat-(bar-1)*bpb;return bar+'.'+(Math.round(b*100)/100+1)};
let clipboard=null;
function ClipWave({peaks,inBeat,len,mb,ppb,color}){const ref=P.useRef(null);
 P.useEffect(()=>{const cv=ref.current;if(!cv||!peaks)return;const w=Math.max(1,Math.min(4096,Math.round(len*ppb))),h=48;cv.width=w;cv.height=h;const g=cv.getContext('2d');g.clearRect(0,0,w,h);g.fillStyle=color;
  const n=peaks.length;for(let x=0;x<w;x++){const beat=inBeat+(x/w)*len,f=((beat/mb)%1+1)%1,v=peaks[Math.min(n-1,Math.floor(f*n))]||0,y=Math.max(1,v*h*.95);g.fillRect(x,(h-y)/2,1,y)}},[peaks,inBeat,len,mb,ppb,color]);
 return peaks?u.jsx('canvas',{ref,'aria-hidden':'true'}):null}
function Menu({menu,close}){const ref=P.useRef(null);
 P.useEffect(()=>{if(!menu)return;const el=ref.current;el?.querySelector('button:not([disabled])')?.focus();
  const away=e=>{if(!el?.contains(e.target))close()};const key=e=>{if(e.key==='Escape'){e.preventDefault();close()}
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const bs=[...el.querySelectorAll('button:not([disabled])')];const i=bs.indexOf(document.activeElement);bs[(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length]?.focus()}};
  setTimeout(()=>document.addEventListener('pointerdown',away,true),0);el?.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',away,true);el?.removeEventListener('keydown',key)}},[menu]);
 if(!menu)return null;const x=Math.min(menu.x,innerWidth-240),y=Math.min(menu.y,innerHeight-28*menu.items.length-16);
 return u.jsx('div',{className:'xmt-menu',role:'menu','aria-label':menu.label,ref,style:{left:Math.max(4,x),top:Math.max(4,y)},children:menu.items.map((it,i)=>it==='-'?u.jsx('hr',{},'s'+i):
  u.jsxs('button',{type:'button',role:'menuitem',disabled:!!it.disabled,onClick:()=>{close();it.run()},children:[u.jsx('span',{children:it.label}),it.key?u.jsx('small',{children:it.key}):null]},'m'+i))})}
/* ---------- room component ---------- */
function XenMultitrackRoom(){
 useStyle();
 const bridge=__xenMultitrackBridge.current;
 const [project,setProject]=P.useState(null),[sel,setSel]=P.useState(null),[trackSel,setTrackSel]=P.useState(null);
 const [libRev,setLibRev]=P.useState(0),[audioRev,setAudioRev]=P.useState(0),[pick,setPick]=P.useState(''),[cursor,setCursor]=P.useState(0),[playing,setPlaying]=P.useState(false);
 const [status,setStatus]=P.useState(''),[say,setSay]=P.useState(''),[listView,setListView]=P.useState(false),[menu,setMenu]=P.useState(null),[dropTrack,setDropTrack]=P.useState(null);
 const [exportFormat,setExportFormat]=P.useState('pcm16'),[busy,setBusy]=P.useState(false);
 const rootRef=P.useRef(null),keyRef=P.useRef(null),hist=P.useRef({past:[],future:[]}),saveTimer=P.useRef(null),phRef=P.useRef(null),meterRef=P.useRef(null),rafRef=P.useRef(0),drag=P.useRef(null),projectRef=P.useRef(null),libRef=P.useRef(new Map());
 projectRef.current=project;
 const announce=t=>{setSay('');setTimeout(()=>setSay(t),20)};
 P.useEffect(()=>{let live=true;loadProject().then(raw=>{if(live)setProject(sanitize(raw,bridge?.getLiveBpm?.()))}).catch(()=>{if(live){setProject(blankProject(bridge?.getLiveBpm?.()));setStatus('Browser storage unavailable: this arrangement will not be kept after reload.')}});
  const off=typeof mV==='function'?mV(()=>setLibRev(v=>v+1)):null;const onAudio=()=>setAudioRev(v=>v+1);audioListeners.add(onAudio);
  const keys=e=>{const t=e.target;if(t!==document.body&&!rootRef.current?.contains(t))return;keyRef.current?.(e)};document.addEventListener('keydown',keys);
  return()=>{live=false;off?.();audioListeners.delete(onAudio);document.removeEventListener('keydown',keys);engine.stop();cancelAnimationFrame(rafRef.current);clearTimeout(saveTimer.current);const p=projectRef.current;if(p)saveProject(p).catch(()=>{})}},[]);
 const lib=P.useMemo(()=>materials(),[libRev]);const libMap=P.useMemo(()=>new Map(lib.map(e=>[e.id,e])),[lib]);libRef.current=libMap;
 P.useEffect(()=>{if(!pick&&lib[0])setPick(lib[0].id)},[lib,pick]);
 // Cold preparation: decode what the arrangement uses (once per material) for waveforms and instant play.
 P.useEffect(()=>{if(!project)return;for(const t of project.tracks)for(const c of t.clips){const e=libMap.get(c.materialId);if(e)requestAudio(e)}},[project,libMap]);
 const persist=next=>{clearTimeout(saveTimer.current);saveTimer.current=setTimeout(()=>saveProject(next).catch(()=>setStatus('Saving failed; keep this tab open and export a mixdown.')),600)};
 const apply=(next,label)=>{setProject(next);projectRef.current=next;if(engine.update(next,libRef.current)){const b=engine.position()??cursor;void play(b,next)}persist(next);if(label)announce(label)};
 const commit=(next,label)=>{const prev=projectRef.current;if(prev){hist.current.past.push(prev);if(hist.current.past.length>100)hist.current.past.shift();hist.current.future=[]}apply(next,label)};
 const undo=()=>{const h=hist.current;if(!h.past.length)return;h.future.push(projectRef.current);apply(h.past.pop(),'Undo')};
 const redo=()=>{const h=hist.current;if(!h.future.length)return;h.past.push(projectRef.current);apply(h.future.pop(),'Redo')};
 if(!project)return u.jsx('div',{className:'xmt',children:'Loading arrangement …'});
 const bpb=project.beatsPerBar,ppb=project.zoom,step=1/project.grid.div;
 const snap=b=>project.grid.snap?Math.round(b/step)*step:Math.round(b*1000)/1000;
 const len=c=>clipLen(c,libMap,project.bpm);const cyc=c=>cycleBeats(libMap.get(c.materialId),c,project.bpm);
 const mapClips=(p,fn)=>({...p,tracks:p.tracks.map(t=>({...t,clips:t.clips.map(c=>fn(c,t))}))});
 const updTrack=(id,patch,label)=>commit({...project,tracks:project.tracks.map(t=>t.id===id?{...t,...patch}:t)},label);
 const updClip=(cid,patch,label)=>commit(mapClips(project,c=>c.id===cid?{...c,...patch}:c),label);
 const findClip=(cid,p=project)=>{for(const t of p.tracks)for(const c of t.clips)if(c.id===cid)return {t,c};return null};
 const removeClip=cid=>{commit({...project,tracks:project.tracks.map(t=>({...t,clips:t.clips.filter(c=>c.id!==cid)}))},'Clip removed');setSel(null);rootRef.current?.focus({preventScroll:true})};
 const insertClip=(tid,c,label)=>{commit({...project,tracks:project.tracks.map(t=>t.id===tid?{...t,clips:[...t.clips,c]}:t)},label);setSel(c.id);setTrackSel(tid)};
 const fixedLen=c=>({...c,lenBeats:len(c),repeats:undefined});
 const duplicateClip=cid=>{const f=findClip(cid);if(!f)return;const n={...fixedLen(f.c),id:uid('clip'),startBeat:f.c.startBeat+len(f.c)};insertClip(f.t.id,n,'Clip duplicated to '+fmtPos(n.startBeat,bpb))};
 const splitClip=cid=>{const f=findClip(cid);if(!f)return;const c=fixedLen(f.c),at=cursor;if(!(at>c.startBeat+1e-9&&at<c.startBeat+c.lenBeats-1e-9)){announce('Place the cursor inside the clip to split');return}
  const a={...c,lenBeats:at-c.startBeat,fadeOut:0},b={...c,id:uid('clip'),startBeat:at,inBeat:c.inBeat+(at-c.startBeat),lenBeats:c.startBeat+c.lenBeats-at,fadeIn:0};
  commit({...project,tracks:project.tracks.map(t=>t.id===f.t.id?{...t,clips:t.clips.flatMap(x=>x.id===cid?[a,b]:[x])}:t)},'Clip split at '+fmtPos(at,bpb));setSel(b.id)};
 const copyClip=cid=>{const f=findClip(cid);if(f){clipboard=fixedLen(f.c);announce('Clip copied')}};
 const pasteAt=(tid,beat)=>{if(!clipboard){announce('Clipboard is empty');return}insertClip(tid,{...clipboard,id:uid('clip'),startBeat:snap(beat)},'Clip pasted at '+fmtPos(snap(beat),bpb))};
 const moveClipToTrack=(cid,tid)=>{const f=findClip(cid);if(!f||f.t.id===tid)return;commit({...project,tracks:project.tracks.map(t=>t.id===f.t.id?{...t,clips:t.clips.filter(c=>c.id!==cid)}:t.id===tid?{...t,clips:[...t.clips,f.c]}:t)},'Clip moved to '+project.tracks.find(t=>t.id===tid)?.name);setTrackSel(tid)};
 const ends=project.tracks.flatMap(t=>t.clips.map(c=>c.startBeat+len(c)));const songEnd=ends.length?Math.max(...ends):0;
 const totalBeats=Math.max(bpb*16,songEnd+bpb*4,project.loop.end+bpb);
 const addTrack=(after)=>{const t=blankTrack(project.tracks.length);const i=after?project.tracks.findIndex(x=>x.id===after)+1:project.tracks.length;const tracks=[...project.tracks];tracks.splice(i,0,t);commit({...project,tracks},'Track added');setTrackSel(t.id);return t.id};
 const removeTrack=id=>{const t=project.tracks.find(x=>x.id===id);if(t?.clips.length&&!window.confirm('Remove "'+t.name+'" with '+t.clips.length+' clip(s)? Material in the library is not touched.'))return;
  commit({...project,tracks:project.tracks.filter(x=>x.id!==id)},'Track removed')};
 const duplicateTrack=id=>{const i=project.tracks.findIndex(t=>t.id===id);if(i<0)return;const s=project.tracks[i],t={...s,id:uid('track'),name:(s.name+' copy').slice(0,60),solo:false,clips:s.clips.map(c=>({...c,id:uid('clip')}))};
  const tracks=[...project.tracks];tracks.splice(i+1,0,t);commit({...project,tracks},'Track duplicated')};
 const moveTrack=(id,d)=>{const i=project.tracks.findIndex(t=>t.id===id),j=i+d;if(i<0||j<0||j>=project.tracks.length)return;const tracks=[...project.tracks];[tracks[i],tracks[j]]=[tracks[j],tracks[i]];commit({...project,tracks},'Track moved')};
 const addClipAt=(tid,beat,mid=pick)=>{const e=libMap.get(mid);if(!e){announce('Choose a material first');return}const target=tid&&project.tracks.some(t=>t.id===tid)?tid:project.tracks[0]?.id;if(!target)return;
  requestAudio(e);const fit=e.sessionTake?'natural':'tempo';insertClip(target,{id:uid('clip'),materialId:e.id,startBeat:snap(beat),inBeat:0,lenBeats:cycleBeats(e,{fit},project.bpm),gain:1,fadeIn:0,fadeOut:0,muted:false,fit},'Clip "'+(e.name||'material')+'" added at '+fmtPos(snap(beat),bpb))};
 const setLoop=patch=>commit({...project,loop:{...project.loop,...patch}},patch.on===undefined?'Loop '+fmtPos(patch.start??project.loop.start,bpb)+' – '+fmtPos(patch.end??project.loop.end,bpb):(patch.on?'Loop on':'Loop off'));
 const startMeters=()=>{const loop=()=>{const b=engine.position();if(b===null){if(phRef.current)phRef.current.style.display='none';if(meterRef.current)meterRef.current.style.width='0';return}
  if(phRef.current){phRef.current.style.display='block';phRef.current.style.left=(240+b*projectRef.current.zoom)+'px'}if(meterRef.current)meterRef.current.style.width=Math.min(100,engine.level()*100).toFixed(1)+'%';rafRef.current=requestAnimationFrame(loop)};
  cancelAnimationFrame(rafRef.current);rafRef.current=requestAnimationFrame(loop)};
 async function play(from=cursor,p=projectRef.current){try{setStatus('Preparing audio …');await engine.play(p,from,libRef.current);setPlaying(true);startMeters();
   const bad=[];for(const t of p.tracks)for(const c of t.clips){const e=libRef.current.get(c.materialId),a=e?audio.get(e.id):null;if(!e||a?.status==='error')bad.push(c)}
   setStatus(bad.length?bad.length+' clip(s) cannot sound (missing or undecodable material; see the red clips).':'');announce('Playing from '+fmtPos(from,bpb))}
  catch(e){setStatus('Playback failed: '+(e?.message||e));setPlaying(false)}}
 const stop=()=>{const b=engine.position();engine.stop();setPlaying(false);cancelAnimationFrame(rafRef.current);if(phRef.current)phRef.current.style.display='none';if(meterRef.current)meterRef.current.style.width='0';announce('Stopped'+(b!==null?' at '+fmtPos(b,bpb):''))};
 const exportMix=async(range)=>{setBusy(true);setStatus('Rendering mixdown …');try{const [a,b]=range==='loop'?[project.loop.start,project.loop.end]:[0,songEnd];if(!(b>a))throw Error('Nothing to render.');
   const r=await mixdown(project,libMap,a,b,exportFormat);const url=URL.createObjectURL(r.blob),link=document.createElement('a');link.href=url;link.download=(project.name||'arrangement').replace(/[^\w\- .]+/g,'_')+(range==='loop'?'-loop':'')+'.wav';
   document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
   setStatus('Mixdown ready: '+r.seconds.toFixed(1)+' s, peak '+(r.peak>0?(20*Math.log10(r.peak)).toFixed(1)+' dBFS':'silent')+(r.peak>1?' (clipped: lower Master or 32-bit float)':''));announce('Mixdown exported')}
  catch(e){setStatus('Mixdown failed: '+(e?.message||e))}finally{setBusy(false)}};
 /* ---- context menus ---- */
 const openMenu=(e,label,items)=>{e.preventDefault();e.stopPropagation();const r=e.currentTarget?.getBoundingClientRect?.();setMenu({x:e.clientX||r?.left||40,y:e.clientY||r?.bottom||40,label,items})};
 const beatFromEvent=(e,el)=>{const r=el.getBoundingClientRect();return Math.max(0,(e.clientX-r.left)/ppb)};
 const clipMenu=(e,t,c)=>{setSel(c.id);setTrackSel(t.id);const others=project.tracks.filter(x=>x.id!==t.id);openMenu(e,'Clip',[
  {label:'Duplicate',key:'Ctrl+D',run:()=>duplicateClip(c.id)},{label:'Split at cursor',key:'S',run:()=>splitClip(c.id),disabled:!(cursor>c.startBeat&&cursor<c.startBeat+len(c))},
  {label:'Copy',key:'Ctrl+C',run:()=>copyClip(c.id)},{label:c.muted?'Unmute clip':'Mute clip',key:'M',run:()=>updClip(c.id,{muted:!c.muted},c.muted?'Clip unmuted':'Clip muted')},'-',
  {label:'Loop material ×2',run:()=>updClip(c.id,{lenBeats:len(c)*2,repeats:undefined},'Length '+len(c)*2+' beats')},{label:'Length = one material cycle',run:()=>updClip(c.id,{lenBeats:cyc(c),repeats:undefined},'Length reset')},
  {label:c.fit==='natural'?'Fit to project tempo (bars × beats)':'Original speed (real audio length)',run:()=>{const fit=c.fit==='natural'?'tempo':'natural';updClip(c.id,{fit,lenBeats:cycleBeats(libMap.get(c.materialId),{fit},project.bpm),repeats:undefined},fit==='natural'?'Original speed':'Fitted to tempo')}},
  {label:'Fade in/out: 1 beat',run:()=>updClip(c.id,{fadeIn:1,fadeOut:1},'Fades 1 beat')},{label:'Fades off',run:()=>updClip(c.id,{fadeIn:0,fadeOut:0},'Fades off')},
  {label:'Set loop to this clip',run:()=>setLoop({start:c.startBeat,end:c.startBeat+len(c),on:true})},'-',
  ...others.slice(0,8).map(o=>({label:'Move to '+o.name,run:()=>moveClipToTrack(c.id,o.id)})),others.length?'-':null,
  {label:'Delete clip',key:'Del',run:()=>removeClip(c.id)}].filter(Boolean))};
 const laneMenu=(e,t)=>{const beat=snap(beatFromEvent(e,e.currentTarget));setTrackSel(t.id);openMenu(e,'Track lane',[
  {label:'Add "'+(libMap.get(pick)?.name||'material')+'" here',run:()=>addClipAt(t.id,beat),disabled:!libMap.get(pick)},{label:'Paste here',key:'Ctrl+V',run:()=>pasteAt(t.id,beat),disabled:!clipboard},
  {label:'Set cursor here',run:()=>{setCursor(beat);announce('Cursor '+fmtPos(beat,bpb))}},{label:'Play from here',run:()=>{setCursor(beat);void play(beat)}},'-',
  {label:'Loop start here',run:()=>setLoop({start:beat,end:Math.max(beat+step,project.loop.end)})},{label:'Loop end here',run:()=>setLoop({end:Math.max(project.loop.start+step,beat)})},'-',
  {label:'Add track below',run:()=>addTrack(t.id)}])};
 const trackMenu=(e,t)=>{setTrackSel(t.id);openMenu(e,'Track',[
  {label:t.mute?'Unmute':'Mute',run:()=>updTrack(t.id,{mute:!t.mute},(t.mute?'Unmuted ':'Muted ')+t.name)},{label:t.solo?'Solo off':'Solo',run:()=>updTrack(t.id,{solo:!t.solo},(t.solo?'Solo off ':'Solo ')+t.name)},
  {label:'Reset volume and pan',run:()=>updTrack(t.id,{volume:.8,pan:0},'Mixer reset')},'-',
  {label:'Duplicate track',run:()=>duplicateTrack(t.id)},{label:'Move up',run:()=>moveTrack(t.id,-1)},{label:'Move down',run:()=>moveTrack(t.id,1)},{label:'Add track below',run:()=>addTrack(t.id)},'-',
  {label:'Delete track',run:()=>removeTrack(t.id)}])};
 const rulerMenu=e=>{const beat=snap(beatFromEvent(e,e.currentTarget));openMenu(e,'Timeline',[
  {label:'Set cursor here',run:()=>setCursor(beat)},{label:'Play from here',run:()=>{setCursor(beat);void play(beat)}},'-',
  {label:'Loop start here',run:()=>setLoop({start:beat,end:Math.max(beat+step,project.loop.end)})},{label:'Loop end here',run:()=>setLoop({end:Math.max(project.loop.start+step,beat)})},
  {label:project.loop.on?'Loop off':'Loop on',key:'L',run:()=>setLoop({on:!project.loop.on})},'-',
  {label:'Export mixdown (song)',run:()=>exportMix('song'),disabled:busy||!songEnd},{label:'Export mixdown (loop)',run:()=>exportMix('loop'),disabled:busy}])};
 /* ---- keyboard ---- */
 const onKey=e=>{if(e.target.closest?.('input,select,textarea,.xmt-menu'))return;const mod=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
  if(mod&&k==='z'){e.preventDefault();e.shiftKey?redo():undo();return}
  if(e.key===' '){e.preventDefault();playing?stop():void play();return}
  if(k==='l'&&!mod){setLoop({on:!project.loop.on});return}
  if(e.key==='Home'){setCursor(0);announce('Cursor to start');return}
  if(mod&&k==='v'){e.preventDefault();pasteAt(trackSel||project.tracks[0]?.id,cursor);return}
  if(!sel)return;const f=findClip(sel);if(!f)return;
  if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){const el=rootRef.current?.querySelector('[data-clip="'+sel+'"]');const r=el?.getBoundingClientRect();clipMenu({preventDefault(){},stopPropagation(){},clientX:r?.left??60,clientY:r?.bottom??60,currentTarget:el},f.t,f.c);return}
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const d=(e.shiftKey?bpb:step)*(e.key==='ArrowLeft'?-1:1);const nb=Math.max(0,snap(f.c.startBeat+d));updClip(sel,{startBeat:nb},'Clip at '+fmtPos(nb,bpb))}
  else if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();const i=project.tracks.findIndex(t=>t.id===f.t.id)+(e.key==='ArrowUp'?-1:1);if(project.tracks[i])moveClipToTrack(sel,project.tracks[i].id)}
  else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeClip(sel)}
  else if(mod&&k==='d'){e.preventDefault();duplicateClip(sel)}
  else if(mod&&k==='c'){e.preventDefault();copyClip(sel)}
  else if(k==='s'&&!mod){splitClip(sel)}
  else if(k==='m'&&!mod){updClip(sel,{muted:!f.c.muted},f.c.muted?'Clip unmuted':'Clip muted')}
  else if(e.key==='+'||e.key==='='){const m=cyc(f.c);updClip(sel,{lenBeats:len(f.c)+m,repeats:undefined},'Length '+(len(f.c)+m)+' beats')}
  else if(e.key==='-'){const m=cyc(f.c);updClip(sel,{lenBeats:Math.max(step,len(f.c)-m),repeats:undefined},'Length '+Math.max(step,len(f.c)-m)+' beats')}};
 keyRef.current=onKey;
 /* ---- pointer: move (also across tracks), Alt = copy, edges = trim ---- */
 const trackAt=(x,y)=>{for(const el of document.elementsFromPoint(x,y)){const id=el.dataset?.lane;if(id)return id}return null};
 const pointerDown=(e,t,c)=>{if(e.button!==0)return;e.stopPropagation();setSel(c.id);setTrackSel(t.id);const edge=e.target.dataset?.edge||'move';
  e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:c.id,from:t.id,mode:edge,x:e.clientX,start:c.startBeat,len:len(c),inBeat:c.inBeat,copy:e.altKey&&edge==='move',moved:false,base:projectRef.current,target:t.id}};
 const pointerMove=e=>{const d=drag.current;if(!d)return;if(!d.moved&&Math.abs(e.clientX-d.x)<3&&d.mode!=='move')return;const db=(e.clientX-d.x)/ppb;const base=d.base;
  const f=findClip(d.id,base);if(!f)return;let c={...fixedLen(f.c)};const mb=cyc(c);
  if(d.mode==='move'){const tgt=trackAt(e.clientX,e.clientY)||d.target;if(Math.abs(e.clientX-d.x)<3&&tgt===d.from&&!d.moved)return;d.moved=true;d.target=tgt;setDropTrack(tgt!==d.from?tgt:null);
   c.startBeat=Math.max(0,snap(d.start+db));if(d.copy)c={...c,id:d.cid||(d.cid=uid('clip'))};
   const tracks=base.tracks.map(t=>{let clips=t.clips;if(!d.copy&&t.id===d.from)clips=clips.filter(x=>x.id!==d.id);if(t.id===tgt)clips=[...clips.filter(x=>x.id!==c.id),c];return {...t,clips}});
   const next={...base,tracks};setProject(next);projectRef.current=next;return}
  d.moved=true;
  if(d.mode==='r')c.lenBeats=Math.max(step,snap(d.start+d.len+db)-d.start);
  else{const end=d.start+d.len,ns=clamp(snap(d.start+db),0,end-step);c.startBeat=ns;c.lenBeats=end-ns;c.inBeat=((d.inBeat+(ns-d.start))%mb+mb)%mb}
  const next=mapClips(base,x=>x.id===d.id?c:x);setProject(next);projectRef.current=next};
 const pointerUp=()=>{const d=drag.current;drag.current=null;setDropTrack(null);if(!d||!d.moved)return;const p=projectRef.current;projectRef.current=d.base;
  const f=findClip(d.copy?d.cid:d.id,p);commit(p,d.mode!=='move'?'Clip length '+(f?len(f.c):0)+' beats':(d.copy?'Clip copied to ':'Clip moved to ')+fmtPos(f?.c.startBeat??0,bpb)+(f&&f.t.id!==d.from?' on '+f.t.name:''));if(d.copy&&f)setSel(f.c.id)};
 /* ---- render ---- */
 const ticks=[];for(let b=0;b<=totalBeats;b+=1){const isBar=Math.abs(b/bpb-Math.round(b/bpb))<1e-9;if(!isBar&&ppb<10)continue;
  ticks.push(u.jsx('div',{className:'tick'+(isBar?' barl':''),style:{left:b*ppb},children:isBar?u.jsx('span',{children:Math.round(b/bpb)+1}):null},'t'+b))}
 const laneWidth=totalBeats*ppb,selF=sel?findClip(sel):null;
 const clipView=(t,ti,c)=>{const e=libMap.get(c.materialId),a=e?audio.get(e.id):null,L=len(c),mb=cyc(c),w=Math.max(10,L*ppb);
  const bad=!e||a?.status==='error',state=!e?'source missing in library':a?.status==='error'?'cannot decode: '+a.error:a?.status==='ready'?'':'loading audio';
  const reps=[];for(let k=Math.ceil((c.inBeat+1e-9)/mb);(k*mb-c.inBeat)<L-1e-9&&reps.length<64;k++){const x=(k*mb-c.inBeat)*ppb;if(x>0)reps.push(u.jsx('span',{className:'rep',style:{left:x}},'r'+k))}
  const name=e?(e.name||'material'):'missing material',color=COLORS[ti%COLORS.length];
  return u.jsxs('button',{type:'button','data-clip':c.id,className:'clip'+(bad?' bad':'')+(c.muted?' muted':''),role:'option','aria-selected':sel===c.id,style:{left:c.startBeat*ppb,width:w,'--c':color},
   title:name+(state?' — '+state:''),'aria-label':name+', '+t.name+', starts at '+fmtPos(c.startBeat,bpb)+', '+L+' beats'+(c.muted?', muted':'')+(state?', '+state:''),
   onPointerDown:ev=>pointerDown(ev,t,c),onPointerMove:pointerMove,onPointerUp:pointerUp,onPointerCancel:pointerUp,onContextMenu:ev=>clipMenu(ev,t,c),onFocus:()=>{setSel(c.id);setTrackSel(t.id)},
   children:[u.jsx(ClipWave,{peaks:a?.peaks??null,inBeat:c.inBeat,len:L,mb,ppb,color}),u.jsx('span',{className:'nm',children:name+(state?' · '+state:'')}),reps,
    u.jsx('span',{className:'eg l','data-edge':'l','aria-hidden':'true'}),u.jsx('span',{className:'eg r','data-edge':'r','aria-hidden':'true'})]},c.id)};
 const tapeInfo=c=>{const e=libMap.get(c.materialId),a=e?audio.get(e.id):null;if(!a?.buffer)return a?.status==='error'?'Cannot decode: '+a.error:'';if(c.fit==='natural')return 'Original speed · real length '+naturalSec(e).toFixed(2)+' s';const r=regionOf(e,a.buffer),rate=r.len/(matBeats(e)*60/project.bpm);
  return Math.abs(rate-1)>.01?'Tape ×'+rate.toFixed(3)+' (material '+(Number(e.bpm)||'?')+' BPM fitted to '+project.bpm+' BPM; pitch follows)':'Original speed'};
 const numIn=(label,value,min,max,stepv,onv,w)=>u.jsxs('label',{children:[label,u.jsx('input',{type:'number',min,max,step:stepv,value:Math.round(value*1000)/1000,style:w?{width:w}:null,onChange:e=>onv(num(e.target.value,value))})]});
 return u.jsxs('div',{className:'xmt',ref:rootRef,tabIndex:-1,children:[
  u.jsx('div',{className:'sr','aria-live':'polite',role:'status',children:say}),
  u.jsx(Menu,{menu,close:()=>{setMenu(null);rootRef.current?.querySelector('[data-clip="'+sel+'"]')?.focus({preventScroll:true})}}),
  u.jsxs('div',{className:'row',style:{justifyContent:'space-between'},children:[
   u.jsxs('div',{children:[u.jsx('h2',{children:'IV · MULTITRACK'}),u.jsx('div',{className:'muted',children:'Arrange harvested material on tracks. Live Room and Mycelium sleep while you are here. Right-click anything for options.'})]}),
   u.jsx('input',{type:'text','aria-label':'Arrangement name',value:project.name,onChange:e=>commit({...project,name:e.target.value.slice(0,100)})})]}),
  u.jsxs('div',{className:'bar row',children:[
   u.jsx('button',{type:'button',onClick:playing?stop:()=>void play(),'aria-label':playing?'Stop (Space)':'Play from cursor (Space)',children:playing?'■ Stop':'▶ Play'}),
   u.jsx('button',{type:'button',onClick:()=>{setCursor(0);announce('Cursor to start')},'aria-label':'Cursor to start (Home)',children:'⏮'}),
   u.jsx('button',{type:'button','aria-pressed':project.loop.on,onClick:()=>setLoop({on:!project.loop.on}),title:'Loop '+fmtPos(project.loop.start,bpb)+' – '+fmtPos(project.loop.end,bpb)+' (right-click the ruler to set it)',children:'⟳ Loop'}),
   u.jsx('span',{className:'muted',children:'Cursor '+fmtPos(cursor,bpb)}),
   numIn('Tempo',project.bpm,20,400,.1,v=>commit({...project,bpm:clamp(v,20,400)})),
   u.jsxs('label',{title:'Free: 3, 5, 7, 3.5 … beats per bar',children:['Beats/bar',u.jsx('input',{type:'number',min:.5,max:64,step:.5,value:bpb,onChange:e=>commit({...project,beatsPerBar:clamp(num(e.target.value,bpb),.5,64)})})]}),
   u.jsxs('label',{title:'Grid = 1/N beat, N free (2, 3, 5, 7 …)',children:['Grid 1/',u.jsx('input',{type:'number',min:1,max:64,step:1,value:project.grid.div,onChange:e=>commit({...project,grid:{...project.grid,div:clamp(Math.round(num(e.target.value,4)),1,64)}})}),'beat']}),
   u.jsx('button',{type:'button','aria-pressed':project.grid.snap,onClick:()=>commit({...project,grid:{...project.grid,snap:!project.grid.snap}},project.grid.snap?'Snap off':'Snap on'),children:'Snap'}),
   u.jsxs('label',{children:['Zoom',u.jsx('input',{type:'range',min:4,max:240,value:ppb,onChange:e=>apply({...project,zoom:num(e.target.value,ppb)})})]}),
   u.jsx('button',{type:'button',onClick:undo,'aria-label':'Undo (Ctrl+Z)',children:'↶'}),u.jsx('button',{type:'button',onClick:redo,'aria-label':'Redo (Ctrl+Shift+Z)',children:'↷'}),
   u.jsx('button',{type:'button','aria-pressed':listView,onClick:()=>setListView(v=>!v),children:'List view'})]}),
  u.jsxs('div',{className:'bar row',children:[
   u.jsxs('label',{children:['Material',u.jsxs('select',{value:pick,onChange:e=>setPick(e.target.value),'aria-label':'Material from the library',children:[
    lib.length?null:u.jsx('option',{value:'',children:'Library empty: send material from the Forge or Loop-Rec first'}),
    ...lib.map(e=>u.jsx('option',{value:e.id,children:(e.name||e.id)+' · '+matBeats(e)+' beats'+(e.bpm?' · '+e.bpm+' BPM':'')+(e.sessionTake?' · take':'')},e.id))]})]}),
   u.jsx('button',{type:'button',onClick:()=>addClipAt(trackSel,cursor),disabled:!lib.length,children:'+ Clip at cursor'}),u.jsx('button',{type:'button',onClick:()=>addTrack(trackSel),children:'+ Track'}),
   u.jsx('span',{style:{flex:1}}),
   u.jsxs('label',{children:['Master',u.jsx('input',{type:'range',min:0,max:1.5,step:.01,value:project.master.volume,'aria-label':'Master volume',onChange:e=>commit({...project,master:{volume:num(e.target.value,.9)}})})]}),
   u.jsx('div',{className:'meter','aria-hidden':'true',children:u.jsx('i',{ref:meterRef})}),
   u.jsxs('select',{value:exportFormat,onChange:e=>setExportFormat(e.target.value),'aria-label':'Mixdown format',children:[u.jsx('option',{value:'pcm16',children:'WAV 16-bit (dither)'}),u.jsx('option',{value:'float32',children:'WAV 32-bit float'})]}),
   u.jsx('button',{type:'button',disabled:busy||!songEnd,onClick:()=>exportMix(project.loop.on?'loop':'song'),children:busy?'Rendering …':'⤓ Mixdown'+(project.loop.on?' (loop)':'')})]}),
  status?u.jsx('div',{className:'warn',role:'alert',style:{margin:'4px 2px'},children:status}):null,
  listView?u.jsx('div',{className:'bar',children:u.jsx('table',{children:u.jsxs('tbody',{children:[
   u.jsxs('tr',{children:['Track','Material','Start (beat)','Position','Length','In','Gain','Fade in','Fade out','',''].map((h,i)=>u.jsx('th',{children:h},i))}),
   ...project.tracks.flatMap(t=>t.clips.map(c=>u.jsxs('tr',{children:[u.jsx('td',{children:t.name}),u.jsx('td',{children:libMap.get(c.materialId)?.name||u.jsx('span',{className:'err',children:'missing'})}),
    u.jsx('td',{children:u.jsx('input',{type:'number',min:0,step,'aria-label':'Start beat',value:c.startBeat,onChange:e=>updClip(c.id,{startBeat:Math.max(0,num(e.target.value,c.startBeat))})})}),
    u.jsx('td',{children:fmtPos(c.startBeat,bpb)}),
    u.jsx('td',{children:u.jsx('input',{type:'number',min:step,step,'aria-label':'Length in beats',value:len(c),onChange:e=>updClip(c.id,{lenBeats:Math.max(step,num(e.target.value,len(c))),repeats:undefined})})}),
    u.jsx('td',{children:u.jsx('input',{type:'number',min:0,step,'aria-label':'Offset into material (beats)',value:c.inBeat,onChange:e=>updClip(c.id,{inBeat:Math.max(0,num(e.target.value,c.inBeat))})})}),
    u.jsx('td',{children:u.jsx('input',{type:'number',min:0,max:2,step:.05,'aria-label':'Clip gain',value:c.gain,onChange:e=>updClip(c.id,{gain:clamp(num(e.target.value,1),0,2)})})}),
    u.jsx('td',{children:u.jsx('input',{type:'number',min:0,step,'aria-label':'Fade in (beats)',value:c.fadeIn,onChange:e=>updClip(c.id,{fadeIn:Math.max(0,num(e.target.value,0))})})}),
    u.jsx('td',{children:u.jsx('input',{type:'number',min:0,step,'aria-label':'Fade out (beats)',value:c.fadeOut,onChange:e=>updClip(c.id,{fadeOut:Math.max(0,num(e.target.value,0))})})}),
    u.jsx('td',{children:u.jsx('button',{type:'button','aria-pressed':c.muted,onClick:()=>updClip(c.id,{muted:!c.muted}),children:'Mute'})}),
    u.jsx('td',{children:u.jsx('button',{type:'button',onClick:()=>removeClip(c.id),'aria-label':'Remove clip',children:'Remove'})})]},c.id)))]})})}):null,
  u.jsxs('div',{className:'tracks',role:'listbox','aria-label':'Arrangement timeline. Arrows move the selected clip (Shift: a bar, Up/Down: other track); S split; Ctrl+D duplicate; Ctrl+C/V copy and paste; M mute; Delete removes; +/- loop length; L loop; Space plays; context menu key opens options.',children:[
   u.jsxs('div',{className:'trk rr',children:[u.jsx('div',{className:'hdr',children:u.jsx('span',{className:'muted',children:'Bars · click = cursor · right-click = loop & export'})}),
    u.jsxs('div',{className:'ruler',style:{width:laneWidth},onClick:e=>{const b=snap(beatFromEvent(e,e.currentTarget));setCursor(b);announce('Cursor '+fmtPos(b,bpb))},onContextMenu:rulerMenu,children:[...ticks,
     u.jsx('div',{className:'loopr'+(project.loop.on?'':' off'),style:{left:project.loop.start*ppb,width:Math.max(2,(project.loop.end-project.loop.start)*ppb)},title:'Loop region'}),u.jsx('div',{className:'cur',style:{left:cursor*ppb}})]})]}),
   ...project.tracks.map((t,ti)=>u.jsxs('div',{className:'trk',onClick:()=>setTrackSel(t.id),children:[
    u.jsxs('div',{className:'hdr',onContextMenu:e=>trackMenu(e,t),style:{boxShadow:'inset 3px 0 0 '+(trackSel===t.id?'#fde68a':COLORS[ti%COLORS.length]+'55')},children:[
     u.jsxs('div',{className:'row',children:[u.jsx('input',{type:'text','aria-label':'Track name',value:t.name,onChange:e=>updTrack(t.id,{name:e.target.value.slice(0,60)})}),
      u.jsx('button',{type:'button','aria-pressed':t.mute,'aria-label':'Mute '+t.name,onClick:()=>updTrack(t.id,{mute:!t.mute},(t.mute?'Unmuted ':'Muted ')+t.name),children:'M'}),
      u.jsx('button',{type:'button','aria-pressed':t.solo,'aria-label':'Solo '+t.name,onClick:()=>updTrack(t.id,{solo:!t.solo},(t.solo?'Solo off ':'Solo ')+t.name),children:'S'}),
      u.jsx('button',{type:'button','aria-label':'Track options for '+t.name,onClick:e=>trackMenu(e,t),children:'⋯'})]}),
     u.jsxs('div',{className:'row',children:[u.jsxs('label',{children:['Vol',u.jsx('input',{type:'range',min:0,max:1.5,step:.01,value:t.volume,'aria-label':'Volume '+t.name,onChange:e=>updTrack(t.id,{volume:num(e.target.value,t.volume)})})]}),
      u.jsxs('label',{children:['Pan',u.jsx('input',{type:'range',min:-1,max:1,step:.01,value:t.pan,'aria-label':'Pan '+t.name,onChange:e=>updTrack(t.id,{pan:num(e.target.value,t.pan)})})]})]})]}),
    u.jsx('div',{className:'lane'+(dropTrack===t.id?' drop':''),'data-lane':t.id,style:{width:laneWidth},onContextMenu:e=>laneMenu(e,t),
     onDoubleClick:e=>{if(e.target===e.currentTarget)addClipAt(t.id,beatFromEvent(e,e.currentTarget))},children:t.clips.map(c=>clipView(t,ti,c))})]},t.id)),
   u.jsx('div',{className:'ph',ref:phRef})]}),
  selF?u.jsxs('div',{className:'bar row',children:[u.jsx('strong',{children:libMap.get(selF.c.materialId)?.name||'missing material'}),
   u.jsx('span',{className:'muted',children:'on '+selF.t.name+' · starts '+fmtPos(selF.c.startBeat,bpb)}),
   numIn('Length',len(selF.c),step,1e5,step,v=>updClip(selF.c.id,{lenBeats:Math.max(step,v),repeats:undefined}),70),
   numIn('In',selF.c.inBeat,0,1e5,step,v=>updClip(selF.c.id,{inBeat:Math.max(0,v)})),
   numIn('Gain',selF.c.gain,0,2,.05,v=>updClip(selF.c.id,{gain:clamp(v,0,2)})),
   numIn('Fade in',selF.c.fadeIn,0,256,step,v=>updClip(selF.c.id,{fadeIn:Math.max(0,v)})),
   numIn('Fade out',selF.c.fadeOut,0,256,step,v=>updClip(selF.c.id,{fadeOut:Math.max(0,v)})),
   u.jsx('button',{type:'button','aria-pressed':selF.c.muted,onClick:()=>updClip(selF.c.id,{muted:!selF.c.muted}),children:'Mute'}),
   u.jsx('button',{type:'button','aria-pressed':selF.c.fit==='natural',title:'Original speed uses the real audio length; off = fit bars × beats to the project tempo (pitch follows).',onClick:()=>{const fit=selF.c.fit==='natural'?'tempo':'natural';updClip(selF.c.id,{fit,lenBeats:cycleBeats(libMap.get(selF.c.materialId),{fit},project.bpm),repeats:undefined},fit==='natural'?'Original speed':'Fitted to tempo')},children:'Original speed'}),
   u.jsx('span',{className:'muted',children:tapeInfo(selF.c)}),
   u.jsx('button',{type:'button',onClick:()=>removeClip(selF.c.id),children:'Remove clip'})]}):null,
  u.jsx('div',{className:'muted',style:{marginTop:6},children:'Drag clips anywhere (also onto another track; Alt = copy), drag clip edges to trim, double-click a lane to add the chosen material. Keys: Space play/stop · L loop · S split · Ctrl+D duplicate · Ctrl+C/V · M mute · ↑/↓ other track · Delete · Ctrl+Z undo.'})]});
}
return Object.freeze({XenMultitrackRoom});
})()
