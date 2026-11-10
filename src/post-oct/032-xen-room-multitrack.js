(()=>{"use strict";
/* ROOM4-01 · Room IV · Multitrack (deferred chunk, evaluated on first open only).
 * Cold by contract: no timers, listeners or audio nodes while the room is closed.
 * Time is counted in BEATS (free beats per bar, free grid 1/N beat), never 4/4 by default.
 * Tracks reuse the shared Material lane chain (__xenMaterialLaneChain) with their own EQ key
 * and route into the live master input supplied by the shell bridge (__xenMultitrackBridge).
 * Clips reference Material Track library entries by id (bs()); audio is never copied.
 * Project data owner: IndexedDB "xensonar-multitrack-v1" / store "projects" / key "current". */
const DB='xensonar-multitrack-v1',STORE='projects',KEY='current',FORMAT='xensonar.multitrack',VERSION=1;
const uid=p=>p+'-'+(globalThis.crypto?.randomUUID?.()??(Date.now().toString(36)+Math.random().toString(36).slice(2,8)));
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const num=(v,d)=>Number.isFinite(Number(v))?Number(v):d;
function blankProject(liveBpm){return {format:FORMAT,version:VERSION,id:KEY,name:'Untitled Arrangement',bpm:clamp(num(liveBpm,108),20,400),beatsPerBar:4,
 grid:{div:4,snap:true},zoom:28,tracks:[{id:uid('track'),name:'Track 1',volume:.8,pan:0,mute:false,solo:false,clips:[]}],updatedAt:Date.now()}}
function sanitize(raw,liveBpm){
 if(!raw||raw.format!==FORMAT||!Array.isArray(raw.tracks))return blankProject(liveBpm);
 const tracks=raw.tracks.slice(0,64).map((t,i)=>({id:String(t.id||uid('track')),name:String(t.name||('Track '+(i+1))).slice(0,60),volume:clamp(num(t.volume,.8),0,1.5),pan:clamp(num(t.pan,0),-1,1),
  mute:!!t.mute,solo:!!t.solo,clips:(Array.isArray(t.clips)?t.clips:[]).slice(0,512).map(c=>({id:String(c.id||uid('clip')),materialId:String(c.materialId||''),
  startBeat:Math.max(0,num(c.startBeat,0)),repeats:clamp(Math.round(num(c.repeats,1)),1,256),gain:clamp(num(c.gain,1),0,2)})).filter(c=>c.materialId)}));
 return {format:FORMAT,version:VERSION,id:KEY,name:String(raw.name||'Untitled Arrangement').slice(0,100),bpm:clamp(num(raw.bpm,108),20,400),
  beatsPerBar:clamp(num(raw.beatsPerBar,4),.5,64),grid:{div:clamp(Math.round(num(raw.grid?.div,4)),1,64),snap:raw.grid?.snap!==false},
  zoom:clamp(num(raw.zoom,28),4,240),tracks:tracks.length?tracks:blankProject(liveBpm).tracks,updatedAt:num(raw.updatedAt,Date.now())};
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
function materialBeats(entry){const bars=num(entry?.bars,1),bpb=num(entry?.beatsPerBar,4);return Math.max(.25,(bars>0?bars:1)*(bpb>0?bpb:4))}
/* ---------- audio engine (hot only while playing) ---------- */
const decoded=new Map();// `${ctxKey}|${materialId}` -> Promise<AudioBuffer>
const ctxKeys=new WeakMap();let ctxSerial=0;
function decodeFor(ctx,entry){let k=ctxKeys.get(ctx);if(!k){k='c'+(++ctxSerial);ctxKeys.set(ctx,k)}const key=k+'|'+entry.id;
 if(!decoded.has(key))decoded.set(key,(async()=>{const blob=__materialAudioBlob(entry,'multitrack-decode');const data=await blob.arrayBuffer();return ctx.decodeAudioData(data.slice(0))})().catch(e=>{decoded.delete(key);throw e}));
 return decoded.get(key)}
function regionOf(entry,buffer){const d=buffer.duration,a=clamp(num(entry.loopStartSec,0),0,Math.max(0,d-.01)),b=clamp(num(entry.loopEndSec,d),a+.01,d);return {a,b,len:b-a}}
class Engine{
 constructor(){this.ctx=null;this.playing=false;this.voices=new Set();this.chains=new Map();this.timer=null;this.scheduled=new Set();this.t0=0;this.fromBeat=0;this.project=null;this.buffers=new Map()}
 spb(){return 60/this.project.bpm}
 beatAt(time){return this.fromBeat+(time-this.t0)/this.spb()}
 async prepare(project){const bridge=__xenMultitrackBridge.current;if(!bridge)throw Error('Audio bridge is not ready yet; open the Live Room once and come back.');
  const ctx=await bridge.ensureAudioReady();this.ctx=ctx;const lib=new Map(materials().map(e=>[e.id,e]));const missing=[];
  const ids=new Set();for(const t of project.tracks)for(const c of t.clips)ids.add(c.materialId);
  await Promise.all([...ids].map(async id=>{const e=lib.get(id);if(!e){missing.push(id);return}try{this.buffers.set(id,{entry:e,buffer:await decodeFor(ctx,e)})}catch{missing.push(id)}}));
  return {ctx,missing}}
 trackGainValue(project,t){const anySolo=project.tracks.some(x=>x.solo);return (t.mute||(anySolo&&!t.solo))?0:t.volume}
 buildChains(project){const ctx=this.ctx,bridge=__xenMultitrackBridge.current,master=bridge.getMasterInput(ctx);
  for(const t of project.tracks){const input=ctx.createGain(),gain=ctx.createGain();gain.gain.value=this.trackGainValue(project,t);
   const chain=__xenMaterialLaneChain(ctx,{source:input,gain,panValue:t.pan,eqKey:__XenEQ.keyFor('arrangement',t.id),route:out=>out.connect(master)});
   this.chains.set(t.id,{input,gain,pan:chain.pan,eq:chain.eq,output:chain.output})}}
 /* Live mixer moves: AudioParam only, smoothed (no rebuild, no React). */
 mix(project){if(!this.ctx||!this.playing)return;const now=this.ctx.currentTime;this.project=project;
  for(const t of project.tracks){const ch=this.chains.get(t.id);if(!ch)continue;ch.gain.gain.setTargetAtTime(this.trackGainValue(project,t),now,.02);ch.pan?.pan.setTargetAtTime(t.pan,now,.02)}}
 async play(project,fromBeat,onState){this.stop();this.project=project;const {ctx,missing}=await this.prepare(project);
  this.buildChains(project);this.fromBeat=Math.max(0,fromBeat);this.t0=ctx.currentTime+.12;this.playing=true;this.scheduled.clear();
  const tick=()=>{if(!this.playing)return;this.schedule(ctx.currentTime+2);this.timer=setTimeout(tick,250)};tick();onState?.({missing});return {missing}}
 schedule(horizon){const p=this.project,spb=this.spb(),ctx=this.ctx;
  for(const t of p.tracks){const ch=this.chains.get(t.id);if(!ch)continue;
   for(const c of t.clips){if(this.scheduled.has(c.id))continue;const m=this.buffers.get(c.materialId);if(!m)continue;
    const lenBeats=materialBeats(m.entry),endBeat=c.startBeat+lenBeats*c.repeats;if(endBeat<=this.fromBeat){this.scheduled.add(c.id);continue}
    const startTime=this.t0+(c.startBeat-this.fromBeat)*spb;if(startTime>horizon)continue;
    this.scheduled.add(c.id);this.voice(ch,m,c,lenBeats,spb,startTime,this.t0+(endBeat-this.fromBeat)*spb)}}}
 voice(ch,m,c,lenBeats,spb,startTime,endTime){const ctx=this.ctx,r=regionOf(m.entry,m.buffer),clipSec=lenBeats*spb,rate=clamp(r.len/clipSec,.125,8);
  const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=m.buffer;src.loop=true;src.loopStart=r.a;src.loopEnd=r.b;src.playbackRate.value=rate;
  const now=ctx.currentTime,when=Math.max(now+.01,startTime),intoSec=Math.max(0,when-startTime),offset=r.a+((intoSec*rate)%r.len);
  g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(c.gain,when+.005);g.gain.setValueAtTime(c.gain,Math.max(when+.006,endTime-.008));g.gain.linearRampToValueAtTime(0,endTime);
  src.connect(g);g.connect(ch.input);src.start(when,offset);src.stop(endTime+.01);
  const v={src,g};this.voices.add(v);src.onended=()=>{this.voices.delete(v);try{g.disconnect()}catch{}}}
 stop(){this.playing=false;clearTimeout(this.timer);this.timer=null;const ctx=this.ctx;
  if(ctx){const now=ctx.currentTime;for(const v of this.voices){try{v.g.gain.cancelScheduledValues(now);v.g.gain.setTargetAtTime(0,now,.008);v.src.stop(now+.06)}catch{}}}
  const chains=[...this.chains.values()];this.chains.clear();setTimeout(()=>{for(const c of chains){try{c.input.disconnect();c.output.disconnect()}catch{}try{c.eq?.dispose?.()}catch{}}},120);this.scheduled.clear()}
 position(){return this.playing&&this.ctx?Math.max(this.fromBeat,this.beatAt(this.ctx.currentTime)):null}
}
const engine=new Engine();
/* ---------- view helpers ---------- */
const CSS=`.xmt{color:#e7e5e4;font:13px/1.35 system-ui,sans-serif;max-width:1400px;margin:0 auto}
.xmt h2{font-size:20px;letter-spacing:.12em;margin:0;color:#fde68a}.xmt .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.xmt .bar{background:#0b0b0d;border:1px solid #2b2b31;border-radius:10px;padding:10px 12px;margin:10px 0}
.xmt button{background:#18181b;color:#e7e5e4;border:1px solid #3f3f46;border-radius:6px;padding:4px 10px;cursor:pointer;font:inherit}
.xmt button:hover{background:#27272a}.xmt button[aria-pressed=true]{background:#fde68a;color:#111;border-color:#fde68a}
.xmt button:focus-visible,.xmt input:focus-visible,.xmt select:focus-visible{outline:2px solid #fbbf24;outline-offset:1px}
.xmt input,.xmt select{background:#111113;color:#e7e5e4;border:1px solid #3f3f46;border-radius:6px;padding:3px 6px;font:inherit}
.xmt input[type=number]{width:64px}.xmt label{display:inline-flex;gap:6px;align-items:center;color:#a8a29e}
.xmt .tracks{position:relative;overflow-x:auto;border:1px solid #2b2b31;border-radius:10px;background:#09090b}
.xmt .trk{display:grid;grid-template-columns:230px 1fr;border-bottom:1px solid #1f1f23;min-height:58px}
.xmt .hdr{padding:6px 8px;background:#0f0f12;border-right:1px solid #26262b;display:flex;flex-direction:column;gap:4px;position:sticky;left:0;z-index:2}
.xmt .hdr input[type=text]{width:100px}.xmt .hdr input[type=range]{width:78px}.xmt .hdr .row{flex-wrap:nowrap;gap:4px}.xmt .hdr button{padding:2px 7px}.xmt .trk.rr{min-height:26px}
.xmt .lane{position:relative;min-height:58px}.xmt .ruler{position:relative;height:26px;cursor:pointer;border-bottom:1px solid #2b2b31}
.xmt .tick{position:absolute;top:0;bottom:0;border-left:1px solid #2a2a30}.xmt .tick.barl{border-left:1px solid #57534e}
.xmt .tick span{position:absolute;top:4px;left:3px;font-size:10px;color:#a8a29e}
.xmt .clip{position:absolute;top:6px;bottom:6px;border-radius:6px;background:linear-gradient(180deg,#78350f,#451a03);border:1px solid #f59e0b;
 color:#fef3c7;padding:2px 6px;overflow:hidden;text-align:left;font-size:12px;cursor:grab;touch-action:none;white-space:nowrap}
.xmt .clip[aria-selected=true]{outline:2px solid #fde68a}.xmt .clip.missing{background:#3f1d1d;border-color:#ef4444;color:#fecaca}
.xmt .clip .rep{position:absolute;top:0;bottom:0;border-left:1px dashed rgba(253,230,138,.45)}
.xmt .ph{position:absolute;top:0;bottom:0;width:2px;background:#fbbf24;pointer-events:none;z-index:3;display:none}
.xmt .cur{position:absolute;top:0;bottom:0;width:1px;background:#38bdf8;pointer-events:none;z-index:1}
.xmt table{border-collapse:collapse;width:100%}.xmt td,.xmt th{border-bottom:1px solid #26262b;padding:4px 6px;text-align:left}
.xmt .muted{color:#78716c}.xmt .warn{color:#fbbf24}.xmt .err{color:#f87171}.xmt .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}`;
function useStyle(){P.useEffect(()=>{if(document.getElementById('xen-multitrack-style'))return;const s=document.createElement('style');s.id='xen-multitrack-style';s.textContent=CSS;document.head.appendChild(s)},[])}
const fmtPos=(beat,bpb)=>{const bar=Math.floor(beat/bpb)+1,b=beat-(bar-1)*bpb;return bar+'.'+(Math.round(b*100)/100+1)};
/* ---------- room component ---------- */
function XenMultitrackRoom(){
 useStyle();
 const bridge=__xenMultitrackBridge.current;
 const [project,setProject]=P.useState(null),[sel,setSel]=P.useState(null),[trackSel,setTrackSel]=P.useState(null);
 const [libRev,setLibRev]=P.useState(0),[pick,setPick]=P.useState(''),[cursor,setCursor]=P.useState(0),[playing,setPlaying]=P.useState(false);
 const [status,setStatus]=P.useState(''),[say,setSay]=P.useState(''),[listView,setListView]=P.useState(false);
 const rootRef=P.useRef(null),keyRef=P.useRef(null),hist=P.useRef({past:[],future:[]}),saveTimer=P.useRef(null),phRef=P.useRef(null),rafRef=P.useRef(0),drag=P.useRef(null),projectRef=P.useRef(null);
 projectRef.current=project;
 const announce=t=>{setSay('');setTimeout(()=>setSay(t),20)};
 P.useEffect(()=>{let live=true;loadProject().then(raw=>{if(live)setProject(sanitize(raw,bridge?.getLiveBpm?.()))}).catch(()=>{if(live){setProject(blankProject(bridge?.getLiveBpm?.()));setStatus('Browser storage unavailable: this arrangement will not be kept after reload.')}});
  const off=typeof mV==='function'?mV(()=>setLibRev(v=>v+1)):null;
  // Keys reach the room while it is open, also when focus fell back to <body> (e.g. after a delete).
  const keys=e=>{const t=e.target;if(t!==document.body&&!rootRef.current?.contains(t))return;keyRef.current?.(e)};document.addEventListener('keydown',keys);
  return()=>{live=false;off?.();document.removeEventListener('keydown',keys);engine.stop();cancelAnimationFrame(rafRef.current);clearTimeout(saveTimer.current);const p=projectRef.current;if(p)saveProject(p).catch(()=>{})}},[]);
 const lib=P.useMemo(()=>materials(),[libRev]);const libMap=P.useMemo(()=>new Map(lib.map(e=>[e.id,e])),[lib]);
 P.useEffect(()=>{if(!pick&&lib[0])setPick(lib[0].id)},[lib,pick]);
 const persist=next=>{clearTimeout(saveTimer.current);saveTimer.current=setTimeout(()=>saveProject(next).catch(()=>setStatus('Saving failed; keep this tab open and export later.')),600)};
 const commit=(next,label)=>{const prev=projectRef.current;if(prev){hist.current.past.push(prev);if(hist.current.past.length>80)hist.current.past.shift();hist.current.future=[]}
  setProject(next);projectRef.current=next;engine.mix(next);persist(next);if(label)announce(label)};
 const undo=()=>{const h=hist.current;if(!h.past.length)return;h.future.push(projectRef.current);const p=h.past.pop();setProject(p);projectRef.current=p;engine.mix(p);persist(p);announce('Undo')};
 const redo=()=>{const h=hist.current;if(!h.future.length)return;h.past.push(projectRef.current);const p=h.future.pop();setProject(p);projectRef.current=p;engine.mix(p);persist(p);announce('Redo')};
 if(!project)return u.jsx('div',{className:'xmt',children:'Loading arrangement …'});
 const bpb=project.beatsPerBar,ppb=project.zoom,step=1/project.grid.div;
 const snap=b=>project.grid.snap?Math.round(b/step)*step:Math.round(b*1000)/1000;
 const updTrack=(id,patch,label)=>commit({...project,tracks:project.tracks.map(t=>t.id===id?{...t,...patch}:t)},label);
 const updClip=(cid,patch,label)=>commit({...project,tracks:project.tracks.map(t=>({...t,clips:t.clips.map(c=>c.id===cid?{...c,...patch}:c)}))},label);
 const removeClip=cid=>{commit({...project,tracks:project.tracks.map(t=>({...t,clips:t.clips.filter(c=>c.id!==cid)}))},'Clip removed');setSel(null);rootRef.current?.focus({preventScroll:true})};
 const findClip=cid=>{for(const t of project.tracks)for(const c of t.clips)if(c.id===cid)return {t,c};return null};
 const totalBeats=Math.max(bpb*16,...project.tracks.flatMap(t=>t.clips.map(c=>c.startBeat+materialBeats(libMap.get(c.materialId))*c.repeats+bpb*4)));
 const addTrack=()=>{const t={id:uid('track'),name:'Track '+(project.tracks.length+1),volume:.8,pan:0,mute:false,solo:false,clips:[]};commit({...project,tracks:[...project.tracks,t]},'Track added');setTrackSel(t.id)};
 const removeTrack=id=>{const t=project.tracks.find(x=>x.id===id);if(t?.clips.length&&!window.confirm('Remove "'+t.name+'" with '+t.clips.length+' clip(s)? Material in the library is not touched.'))return;
  commit({...project,tracks:project.tracks.filter(x=>x.id!==id)},'Track removed')};
 const addClip=()=>{const e=libMap.get(pick);if(!e){announce('No material selected');return}const tid=trackSel&&project.tracks.some(t=>t.id===trackSel)?trackSel:project.tracks[0]?.id;if(!tid)return;
  const c={id:uid('clip'),materialId:e.id,startBeat:snap(cursor),repeats:1,gain:1};updTrack(tid,{clips:[...project.tracks.find(t=>t.id===tid).clips,c]},'Clip "'+(e.name||'material')+'" added at '+fmtPos(c.startBeat,bpb));setSel(c.id)};
 const startPlayhead=()=>{const loop=()=>{const b=engine.position();if(b===null){if(phRef.current)phRef.current.style.display='none';return}
  if(phRef.current){phRef.current.style.display='block';phRef.current.style.left=(230+b*ppb)+'px'}rafRef.current=requestAnimationFrame(loop)};cancelAnimationFrame(rafRef.current);rafRef.current=requestAnimationFrame(loop)};
 const play=async()=>{try{setStatus('Preparing audio …');const r=await engine.play(project,cursor);setPlaying(true);startPlayhead();
   setStatus(r.missing.length?r.missing.length+' clip source(s) missing in the Material library; those clips stay silent.':'');announce('Playing from '+fmtPos(cursor,bpb))}
  catch(e){setStatus('Playback failed: '+(e?.message||e));setPlaying(false)}};
 const stop=()=>{const b=engine.position();engine.stop();setPlaying(false);cancelAnimationFrame(rafRef.current);if(phRef.current)phRef.current.style.display='none';announce('Stopped'+(b!==null?' at '+fmtPos(b,bpb):''))};
 const onKey=e=>{if(e.target.closest?.('input,select,textarea'))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return}
  if(e.key===' '){e.preventDefault();playing?stop():play();return}
  if(!sel)return;const f=findClip(sel);if(!f)return;
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const d=(e.shiftKey?bpb:step)*(e.key==='ArrowLeft'?-1:1);const nb=Math.max(0,snap(f.c.startBeat+d));updClip(sel,{startBeat:nb},'Clip at '+fmtPos(nb,bpb))}
  else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeClip(sel)}
  else if(e.key==='+'||e.key==='='){updClip(sel,{repeats:Math.min(256,f.c.repeats+1)},'Repeats '+(f.c.repeats+1))}
  else if(e.key==='-'){updClip(sel,{repeats:Math.max(1,f.c.repeats-1)},'Repeats '+Math.max(1,f.c.repeats-1))}};
 const pointerDown=(e,c)=>{if(e.button!==0)return;setSel(c.id);e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:c.id,x:e.clientX,start:c.startBeat,moved:false,base:projectRef.current}};
 const pointerMove=e=>{const d=drag.current;if(!d)return;const db=(e.clientX-d.x)/ppb;if(Math.abs(e.clientX-d.x)>2)d.moved=true;if(!d.moved)return;
  const nb=Math.max(0,snap(d.start+db));const p=projectRef.current;const next={...p,tracks:p.tracks.map(t=>({...t,clips:t.clips.map(c=>c.id===d.id?{...c,startBeat:nb}:c)}))};setProject(next);projectRef.current=next};
 const pointerUp=()=>{const d=drag.current;drag.current=null;if(!d||!d.moved)return;const p=projectRef.current;projectRef.current=d.base;commit(p,'Clip moved to '+fmtPos(findClipIn(p,d.id)?.startBeat??0,bpb))};
 const findClipIn=(p,cid)=>{for(const t of p.tracks)for(const c of t.clips)if(c.id===cid)return c;return null};
 const ticks=[];for(let b=0;b<=totalBeats;b+=1){const isBar=Math.abs(b/bpb-Math.round(b/bpb))<1e-9;if(!isBar&&ppb<10)continue;
  ticks.push(u.jsx('div',{className:'tick'+(isBar?' barl':''),style:{left:b*ppb},children:isBar?u.jsx('span',{children:Math.round(b/bpb)+1}):null},'t'+b))}
 const laneWidth=totalBeats*ppb;const selF=sel?findClip(sel):null;
 const clipView=(t,c)=>{const e=libMap.get(c.materialId),len=materialBeats(e),w=Math.max(8,len*c.repeats*ppb);
  const reps=[];for(let k=1;k<c.repeats;k++)reps.push(u.jsx('span',{className:'rep',style:{left:k*len*ppb}},'r'+k));
  const name=e?(e.name||'material'):'missing material';
  return u.jsxs('button',{type:'button',className:'clip'+(e?'':' missing'),role:'option','aria-selected':sel===c.id,style:{left:c.startBeat*ppb,width:w},
   'aria-label':name+', '+t.name+', starts at bar '+fmtPos(c.startBeat,bpb)+', '+len+' beats × '+c.repeats+(e?'':', source missing'),
   onPointerDown:ev=>pointerDown(ev,c),onPointerMove:pointerMove,onPointerUp:pointerUp,onPointerCancel:pointerUp,onFocus:()=>{setSel(c.id);setTrackSel(t.id)},
   children:[name+(c.repeats>1?' ×'+c.repeats:''),reps]},c.id)};
 const tapeInfo=(e)=>{if(!e)return null;const b=engine.buffers.get(e.id);if(!b)return null;const r=regionOf(e,b.buffer),rate=r.len/(materialBeats(e)*60/project.bpm);
  return Math.abs(rate-1)>.01?'Tape ×'+rate.toFixed(3)+' (material tempo differs from project tempo; pitch follows)':'Original speed'};
 keyRef.current=onKey;
 return u.jsxs('div',{className:'xmt',ref:rootRef,tabIndex:-1,children:[
  u.jsx('div',{className:'sr','aria-live':'polite',role:'status',children:say}),
  u.jsxs('div',{className:'row',style:{justifyContent:'space-between'},children:[
   u.jsxs('div',{children:[u.jsx('h2',{children:'IV · MULTITRACK'}),u.jsx('div',{className:'muted',children:'Arrange harvested material on tracks. Live Room and Mycelium sleep while you are here.'})]}),
   u.jsx('input',{type:'text','aria-label':'Arrangement name',value:project.name,onChange:e=>commit({...project,name:e.target.value.slice(0,100)})})]}),
  u.jsxs('div',{className:'bar row',children:[
   u.jsx('button',{type:'button',onClick:playing?stop:play,'aria-label':playing?'Stop (Space)':'Play from cursor (Space)',children:playing?'■ Stop':'▶ Play'}),
   u.jsx('button',{type:'button',onClick:()=>{setCursor(0);announce('Cursor to start')},'aria-label':'Cursor to start',children:'⏮'}),
   u.jsx('span',{className:'muted','aria-label':'Cursor position',children:'Cursor '+fmtPos(cursor,bpb)}),
   u.jsxs('label',{children:['Tempo',u.jsx('input',{type:'number',min:20,max:400,step:.1,value:project.bpm,onChange:e=>commit({...project,bpm:clamp(num(e.target.value,project.bpm),20,400)})}),'BPM']}),
   u.jsxs('label',{title:'Free: 3, 5, 7, 3.5 … beats per bar',children:['Beats/bar',u.jsx('input',{type:'number',min:.5,max:64,step:.5,value:bpb,onChange:e=>commit({...project,beatsPerBar:clamp(num(e.target.value,bpb),.5,64)})})]}),
   u.jsxs('label',{title:'Grid = 1/N beat, N free (2, 3, 5, 7 …)',children:['Grid 1/',u.jsx('input',{type:'number',min:1,max:64,step:1,value:project.grid.div,onChange:e=>commit({...project,grid:{...project.grid,div:clamp(Math.round(num(e.target.value,4)),1,64)}})}),'beat']}),
   u.jsx('button',{type:'button','aria-pressed':project.grid.snap,onClick:()=>commit({...project,grid:{...project.grid,snap:!project.grid.snap}},project.grid.snap?'Snap off':'Snap on'),children:'Snap'}),
   u.jsxs('label',{children:['Zoom',u.jsx('input',{type:'range',min:4,max:240,value:ppb,onChange:e=>commit({...project,zoom:num(e.target.value,ppb)})})]}),
   u.jsx('button',{type:'button',onClick:undo,'aria-label':'Undo (Ctrl+Z)',children:'↶'}),u.jsx('button',{type:'button',onClick:redo,'aria-label':'Redo (Ctrl+Shift+Z)',children:'↷'}),
   u.jsx('button',{type:'button','aria-pressed':listView,onClick:()=>setListView(v=>!v),children:'List view'})]}),
  u.jsxs('div',{className:'bar row',children:[
   u.jsxs('label',{children:['Material',u.jsxs('select',{value:pick,onChange:e=>setPick(e.target.value),'aria-label':'Material from the library',children:[
    lib.length?null:u.jsx('option',{value:'',children:'Library empty: send material from the Forge first'}),...lib.map(e=>u.jsx('option',{value:e.id,children:(e.name||e.id)+' · '+materialBeats(e)+' beats'},e.id))]})]}),
   u.jsx('button',{type:'button',onClick:addClip,disabled:!lib.length,children:'+ Clip at cursor'}),u.jsx('button',{type:'button',onClick:addTrack,children:'+ Track'}),
   status?u.jsx('span',{className:'warn',role:'alert',children:status}):null]}),
  listView?u.jsxs('div',{className:'bar',children:[u.jsx('table',{children:u.jsxs('tbody',{children:[
   u.jsxs('tr',{children:[u.jsx('th',{children:'Track'}),u.jsx('th',{children:'Material'}),u.jsx('th',{children:'Start (beat)'}),u.jsx('th',{children:'Position'}),u.jsx('th',{children:'Repeats'}),u.jsx('th',{children:'Gain'}),u.jsx('th',{children:''})]}),
   ...project.tracks.flatMap(t=>t.clips.map(c=>u.jsxs('tr',{children:[u.jsx('td',{children:t.name}),u.jsx('td',{children:libMap.get(c.materialId)?.name||u.jsx('span',{className:'err',children:'missing'})}),
    u.jsx('td',{children:u.jsx('input',{type:'number',min:0,step:step,'aria-label':'Start beat',value:c.startBeat,onChange:e=>updClip(c.id,{startBeat:Math.max(0,num(e.target.value,c.startBeat))})})}),
    u.jsx('td',{children:fmtPos(c.startBeat,bpb)}),
    u.jsx('td',{children:u.jsx('input',{type:'number',min:1,max:256,'aria-label':'Repeats',value:c.repeats,onChange:e=>updClip(c.id,{repeats:clamp(Math.round(num(e.target.value,1)),1,256)})})}),
    u.jsx('td',{children:u.jsx('input',{type:'number',min:0,max:2,step:.05,'aria-label':'Clip gain',value:c.gain,onChange:e=>updClip(c.id,{gain:clamp(num(e.target.value,1),0,2)})})}),
    u.jsx('td',{children:u.jsx('button',{type:'button',onClick:()=>removeClip(c.id),'aria-label':'Remove clip',children:'Remove'})})]},c.id)))]})})]}):null,
  u.jsxs('div',{className:'tracks',role:'listbox','aria-label':'Arrangement timeline. Arrow keys move the selected clip by the grid, Shift by a bar; Delete removes; + and - change repeats; Space plays.',children:[
   u.jsxs('div',{className:'trk rr',children:[u.jsx('div',{className:'hdr',children:u.jsx('span',{className:'muted',children:'Bars · click ruler = cursor'})}),
    u.jsxs('div',{className:'ruler',style:{width:laneWidth},onClick:e=>{const r=e.currentTarget.getBoundingClientRect();const b=Math.max(0,snap((e.clientX-r.left)/ppb));setCursor(b);announce('Cursor '+fmtPos(b,bpb))},children:[...ticks,u.jsx('div',{className:'cur',style:{left:cursor*ppb}})]})]}),
   ...project.tracks.map(t=>u.jsxs('div',{className:'trk',onClick:()=>setTrackSel(t.id),children:[
    u.jsxs('div',{className:'hdr',style:trackSel===t.id?{boxShadow:'inset 3px 0 0 #fbbf24'}:null,children:[
     u.jsxs('div',{className:'row',children:[u.jsx('input',{type:'text','aria-label':'Track name',value:t.name,onChange:e=>updTrack(t.id,{name:e.target.value.slice(0,60)})}),
      u.jsx('button',{type:'button','aria-pressed':t.mute,'aria-label':'Mute '+t.name,onClick:()=>updTrack(t.id,{mute:!t.mute},(t.mute?'Unmuted ':'Muted ')+t.name),children:'M'}),
      u.jsx('button',{type:'button','aria-pressed':t.solo,'aria-label':'Solo '+t.name,onClick:()=>updTrack(t.id,{solo:!t.solo},(t.solo?'Solo off ':'Solo ')+t.name),children:'S'}),
      u.jsx('button',{type:'button','aria-label':'Remove track '+t.name,onClick:()=>removeTrack(t.id),children:'×'})]}),
     u.jsxs('div',{className:'row',children:[u.jsxs('label',{children:['Vol',u.jsx('input',{type:'range',min:0,max:1.5,step:.01,value:t.volume,'aria-label':'Volume '+t.name,onChange:e=>updTrack(t.id,{volume:num(e.target.value,t.volume)})})]}),
      u.jsxs('label',{children:['Pan',u.jsx('input',{type:'range',min:-1,max:1,step:.01,value:t.pan,'aria-label':'Pan '+t.name,onChange:e=>updTrack(t.id,{pan:num(e.target.value,t.pan)})})]})]})]}),
    u.jsx('div',{className:'lane',style:{width:laneWidth},children:t.clips.map(c=>clipView(t,c))})]},t.id)),
   u.jsx('div',{className:'ph',ref:phRef})]}),
  selF?u.jsxs('div',{className:'bar row',children:[u.jsx('strong',{children:libMap.get(selF.c.materialId)?.name||'missing material'}),
   u.jsx('span',{className:'muted',children:'starts '+fmtPos(selF.c.startBeat,bpb)+' · '+materialBeats(libMap.get(selF.c.materialId))+' beats × '+selF.c.repeats}),
   u.jsx('span',{className:'muted',children:tapeInfo(libMap.get(selF.c.materialId))||''}),
   u.jsxs('label',{children:['Repeats',u.jsx('input',{type:'number',min:1,max:256,value:selF.c.repeats,onChange:e=>updClip(selF.c.id,{repeats:clamp(Math.round(num(e.target.value,1)),1,256)})})]}),
   u.jsxs('label',{children:['Gain',u.jsx('input',{type:'number',min:0,max:2,step:.05,value:selF.c.gain,onChange:e=>updClip(selF.c.id,{gain:clamp(num(e.target.value,1),0,2)})})]}),
   u.jsx('button',{type:'button',onClick:()=>removeClip(selF.c.id),children:'Remove clip'})]}):null,
  u.jsx('div',{className:'muted',style:{marginTop:8},children:'Keys: Space play/stop · ←/→ move clip by grid (Shift: one bar) · Delete remove · +/− repeats · Ctrl+Z undo. Mixer moves while playing are applied directly to audio.'})]});
}
return Object.freeze({XenMultitrackRoom});
})()
