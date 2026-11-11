(()=>{"use strict";
/* ROOM4-03 · Room IV · Multitrack (deferred chunk, evaluated on first open only).
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
/* ROOM4-04: these are corruption guards only, far above any real arrangement. The old limits (64 tracks / 1024 clips) silently cut a bigger saved arrangement on the next load and then saved the cut version. */
const MAX_TRACKS=512,MAX_CLIPS=20000;
const COLORS=['#f59e0b','#38bdf8','#a78bfa','#34d399','#f472b6','#facc15','#fb7185','#60a5fa'];
function blankTrack(i){return {id:uid('track'),name:'Track '+(i+1),volume:.8,pan:0,mute:false,solo:false,pitch:0,clips:[]}}
function blankProject(liveBpm){return {format:FORMAT,version:VERSION,id:KEY,name:'Untitled Arrangement',bpm:clamp(num(liveBpm,108),20,400),beatsPerBar:4,
 grid:{div:4,snap:true},zoom:28,trackHeight:64,loop:{on:false,start:0,end:16},master:{volume:.9},tracks:[blankTrack(0)],updatedAt:Date.now()}}
/* ROOM4-11 track EQ: the XenSonar EQ (A/B curves, morph, adaptive bands) is edited with the shared EQ panel under the key 'arrangement:<trackId>'.
   The PROJECT is the owner of the saved curve (track.eq), the shared EQ state is only the live copy: it is filled from the project and written back into it.
   Keeping it in the project makes it survive reload, Package Station export/import and a new browser profile. A flat EQ is never stored. */
const eqKey=id=>'arrangement:'+id;
const eqFlat=c=>!c||(c.enabled!==false&&!(c.a||[]).some(v=>v)&&!(c.b||[]).some(v=>v));
function sanitizeEq(e){if(!e||typeof e!=='object'||!Array.isArray(e.a)||!Array.isArray(e.b)||e.a.length>400||e.b.length>400)return undefined;
 const arr=a=>a.map(v=>Number.isFinite(Number(v))?clamp(Number(v),-1,1):0);const o={a:arr(e.a),b:arr(e.b),morph:clamp(num(e.morph,0),0,1),bands:Math.round(clamp(num(e.bands,12),4,24)),mode:e.mode==='raster'?'raster':'adaptive',low:clamp(num(e.low,-36),-60,-6),high:clamp(num(e.high,12),0,12),enabled:e.enabled!==false,manualCenters:(Array.isArray(e.manualCenters)?e.manualCenters:[]).slice(0,24).map(Number).filter(Number.isFinite)};
 return eqFlat(o)?undefined:o}
const eqPick=c=>({a:Array.from(c.a),b:Array.from(c.b),morph:c.morph,bands:c.bands,mode:c.mode,low:c.low,high:c.high,enabled:c.enabled!==false,manualCenters:Array.from(c.manualCenters||[])});
/* ROOM4-12 freeze: a frozen track is replaced by its bounce track (track.frozenBy = id of that track) and stays untouched but silent and free of DSP; unfreezing removes the bounce and wakes it up again. */
const isFrozen=(project,t)=>!!t?.frozenBy&&project.tracks.some(x=>x.id===t.frozenBy);
/* ROOM4-09 track effect data (the audio builder is further down) */
const FX0=Object.freeze({lowCut:0,highCut:20000,drive:0,echoBeats:0,echoFb:.35,echoMix:.3,reverb:0});
const fxOf=t=>({...FX0,...(t?.fx||{})});
const fxShape=f=>(f.lowCut>0?'h':'')+(f.highCut<20000?'l':'')+(f.drive>0?'d':'')+(f.echoBeats>0&&f.echoMix>0?'e':'')+(f.reverb>0?'r':'');
function sanitizeFx(f){if(!f||typeof f!=='object')return undefined;const o={lowCut:clamp(num(f.lowCut,0),0,8000),highCut:clamp(num(f.highCut,20000),200,20000),drive:clamp(num(f.drive,0),0,1),
 echoBeats:clamp(num(f.echoBeats,0),0,16),echoFb:clamp(num(f.echoFb,.35),0,.92),echoMix:clamp(num(f.echoMix,.3),0,1),reverb:clamp(num(f.reverb,0),0,1)};return fxShape(o)?o:undefined}
/* ROOM4-13 automation: piecewise-linear curves over beats, per track and parameter. Volume is a MULTIPLIER on the track fader (1 = fader unchanged), the others
   take over their knob while a curve exists. Log parameters (filter frequencies) are interpolated geometrically. Points are plain {b,v}; no curve = no extra node. */
const AUTO=Object.freeze({volume:{label:'Volume ×',min:0,max:2,def:1},pan:{label:'Pan',min:-1,max:1,def:0},reverb:{label:'Reverb send',min:0,max:1,def:0},echoMix:{label:'Echo mix',min:0,max:1,def:.3},
 lowCut:{label:'Low cut Hz',min:20,max:8000,def:20,log:true},highCut:{label:'High cut Hz',min:200,max:20000,def:20000,log:true}});
function sanitizeAuto(a){if(!a||typeof a!=='object')return undefined;const out={};
 for(const name of Object.keys(AUTO)){const sp=AUTO[name],src=Array.isArray(a[name])?a[name]:null;if(!src)continue;
  const m=new Map();for(const q of src.slice(0,512)){if(!q||!Number.isFinite(Number(q.b))||!Number.isFinite(Number(q.v)))continue;m.set(Math.round(Math.max(0,Number(q.b))*1000)/1000,clamp(Number(q.v),sp.min,sp.max))}
  const pts=[...m].sort((x,y)=>x[0]-y[0]).map(([b,v])=>({b,v}));if(pts.length)out[name]=pts}
 return Object.keys(out).length?out:undefined}
function autoValue(pts,sp,b){if(!pts.length)return sp.def;if(b<=pts[0].b)return pts[0].v;const n=pts.length;if(b>=pts[n-1].b)return pts[n-1].v;
 let i=1;while(i<n&&pts[i].b<b)i++;const a=pts[i-1],c=pts[i],f=(b-a.b)/Math.max(1e-9,c.b-a.b);return sp.log?a.v*Math.pow(c.v/a.v,f):a.v+(c.v-a.v)*f}
/* ramp targets after `from` up to and including `to` (log parameters are cut into short geometric steps) */
function autoEvents(pts,sp,from,to){const marks=[from,...pts.map(q=>q.b).filter(x=>x>from+1e-9&&x<to-1e-9),to],out=[];
 for(let i=1;i<marks.length;i++){const x=marks[i-1],y=marks[i];if(!(y>x+1e-9))continue;const n=sp.log?clamp(Math.ceil((y-x)*4),1,32):1;for(let k=1;k<=n;k++){const bb=x+(y-x)*k/n;out.push({b:bb,v:autoValue(pts,sp,bb)})}}return out}
const hasAuto=(t,name)=>!!t?.auto?.[name]?.length;
function sanitizeClip(c){const out={id:String(c.id||uid('clip')),materialId:String(c.materialId||''),startBeat:Math.max(0,num(c.startBeat,0)),
 inBeat:Math.max(0,num(c.inBeat,0)),gain:clamp(num(c.gain,1),0,2),fadeIn:clamp(num(c.fadeIn,0),0,256),fadeOut:clamp(num(c.fadeOut,0),0,256),muted:!!c.muted,fit:['natural','bpm'].includes(c.fit)?c.fit:'tempo'};if(num(c.sourceBpm,0)>0)out.sourceBpm=clamp(Number(c.sourceBpm),10,999);if(out.fit==='bpm'&&!out.sourceBpm)out.fit='natural';
 /* ROOM4-07: non-destructive warp. stretch multiplies the material cycle, warp 'grain' keeps the pitch, pitch is a granular offset in cents. Absent = original. */
 if(num(c.stretch,1)>0&&Math.abs(num(c.stretch,1)-1)>1e-9)out.stretch=clamp(Number(c.stretch),.05,20);if(c.warp==='grain')out.warp='grain';if(c.reverse)out.reverse=true;if(Math.abs(num(c.pitch,0))>=.5)out.pitch=clamp(Number(c.pitch),-2400,2400);
 if(Number.isFinite(Number(c.lenBeats))&&Number(c.lenBeats)>0)out.lenBeats=clamp(Number(c.lenBeats),1/64,1e5);else out.repeats=clamp(Math.round(num(c.repeats,1)),1,256);
 return out}
function sanitize(raw,liveBpm){
 if(!raw||raw.format!==FORMAT||!Array.isArray(raw.tracks))return blankProject(liveBpm);
 const tracks=raw.tracks.slice(0,MAX_TRACKS).map((t,i)=>({id:String(t.id||uid('track')),name:String(t.name||('Track '+(i+1))).slice(0,60),volume:clamp(num(t.volume,.8),0,1.5),pan:clamp(num(t.pan,0),-1,1),
  mute:!!t.mute,solo:!!t.solo,pitch:clamp(num(t.pitch,0),-2400,2400),...(t.frozenBy?{frozenBy:String(t.frozenBy)}:{}),...(t.bounceOf?{bounceOf:String(t.bounceOf)}:{}),...(sanitizeFx(t.fx)?{fx:sanitizeFx(t.fx)}:{}),...(sanitizeEq(t.eq)?{eq:sanitizeEq(t.eq)}:{}),...(sanitizeAuto(t.auto)?{auto:sanitizeAuto(t.auto)}:{}),clips:(Array.isArray(t.clips)?t.clips:[]).slice(0,MAX_CLIPS).map(sanitizeClip).filter(c=>c.materialId)}));
 for(const t of tracks){if(t.frozenBy&&!tracks.some(x=>x.id===t.frozenBy&&x.id!==t.id))delete t.frozenBy}/* a freeze whose bounce track is gone is no freeze */
 const loop=raw.loop||{};const ls=Math.max(0,num(loop.start,0)),le=Math.max(ls+1/64,num(loop.end,ls+16));
 return {format:FORMAT,version:VERSION,id:KEY,name:String(raw.name||'Untitled Arrangement').slice(0,100),bpm:clamp(num(raw.bpm,108),20,400),
  beatsPerBar:clamp(num(raw.beatsPerBar,4),.5,64),grid:{div:clamp(Math.round(num(raw.grid?.div,4)),1,64),snap:raw.grid?.snap!==false},
  zoom:clamp(num(raw.zoom,28),.05,4000),trackHeight:clamp(num(raw.trackHeight,64),3,4000),loop:{on:!!loop.on,start:ls,end:le},master:{volume:clamp(num(raw.master?.volume,.9),0,1.5),reverbSize:clamp(num(raw.master?.reverbSize,2.2),.2,8)},
  markers:(Array.isArray(raw.markers)?raw.markers:[]).slice(0,256).filter(m=>m&&Number.isFinite(Number(m.beat))).map(m=>({id:String(m.id||uid('mk')),beat:Math.max(0,Number(m.beat)),name:String(m.name||'').slice(0,40)})).sort((a,b)=>a.beat-b.beat),
  tracks:tracks.length?tracks:[blankTrack(0)],updatedAt:num(raw.updatedAt,Date.now())};
}
/* ---------- persistence (cold) ---------- */
const db=()=>__XenMultitrackInbox.db();// one database owner, shared with the Send-to-Multitrack inbox
async function loadProject(){const d=await db();return new Promise((ok,bad)=>{const q=d.transaction(STORE,'readonly').objectStore(STORE).get(KEY);q.onsuccess=()=>ok(q.result??null);q.onerror=()=>bad(q.error)})}
async function saveProject(p){const d=await db();return new Promise((ok,bad)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).put({...p,updatedAt:Date.now()},KEY);tx.oncomplete=()=>ok(true);tx.onerror=()=>bad(tx.error)})}
/* ---------- material library (read-only consumer) ---------- */
function materials(){try{return (bs().entries||[]).filter(e=>e&&e.id)}catch{return []}}
function matBeats(entry){const bars=num(entry?.bars,1),bpb=num(entry?.beatsPerBar,4);return Math.max(1/16,(bars>0?bars:1)*(bpb>0?bpb:4))}
/* Two conversions per clip: 'tempo' = bars x beats of the material (as the Live Room does);
   'natural' = real audio length at the project tempo, original speed (takes, free material). */
function naturalSec(entry){const a=num(entry?.loopStartSec,0),b=num(entry?.loopEndSec,num(entry?.durationSec,0));return Math.max(.01,b-a>0?b-a:num(entry?.durationSec,1))}
function baseCycleBeats(entry,clip,bpm){if(clip?.fit==='natural')return Math.max(1/64,naturalSec(entry)*bpm/60);if(clip?.fit==='bpm'&&clip.sourceBpm>0)return Math.max(1/64,naturalSec(entry)*clip.sourceBpm/60);return matBeats(entry)}
function cycleBeats(entry,clip,bpm){return Math.max(1/64,baseCycleBeats(entry,clip,bpm)*(clip?.stretch>0?clip.stretch:1))}
function clipLen(c,lib,bpm){return c.lenBeats>0?c.lenBeats:cycleBeats(lib.get(c.materialId),c,bpm)*(c.repeats||1)}
/* ROOM4-05: 'Original speed' clips keep their REAL length and in-point when the project tempo changes. Their stored length/in-point are in
   beats at the old tempo; without this a 4 s clip of 8 beats at 120 BPM became 8 s (looped twice) at 60 BPM. Other fits are beat-bound by design. */
function retempo(project,bpm){const f=project.bpm/bpm;if(!(f>0)||f===1)return {...project,bpm};const r=v=>Math.round(v*1e9)/1e9;
 return {...project,bpm,tracks:project.tracks.map(t=>t.clips.some(c=>c.fit==='natural')?{...t,clips:t.clips.map(c=>c.fit!=='natural'?c:{...c,...(c.lenBeats>0?{lenBeats:Math.max(1/64,r(c.lenBeats/f))}:{}),inBeat:r(c.inBeat/f)})}:t)}}
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
/* ROOM4-05: one quiet line of facts about the clip's source audio, e.g. "Stereo · 48 kHz · 00:12.8". */
function sourceInfo(b){if(!b)return 'decoding source …';const s=b.duration,m=Math.floor(s/60),r=(s-m*60).toFixed(1).padStart(4,'0'),ch=b.numberOfChannels;
 const hz=b.sampleRate/1000;return (ch===1?'Mono':ch===2?'Stereo':ch+' channels')+' · '+(Number.isInteger(hz)?hz:hz.toFixed(1).replace('.',','))+' kHz · '+String(m).padStart(2,'0')+':'+r}
/* ROOM4-05: decoded PCM is only needed while Room IV is open (cold-room contract); finished buffers are dropped on leaving, in-flight decodes are left alone. */
function releaseDecoded(){for(const [id,r] of [...audio])if(r.status!=='loading')audio.delete(id);for(const [k,v] of [...variants])if(v.status!=='loading')variants.delete(k)}
function regionOf(entry,buffer){const d=buffer.duration,a=clamp(num(entry?.loopStartSec,0),0,Math.max(0,d-.01)),b=clamp(num(entry?.loopEndSec,d),a+.01,d);return {a,b,len:b-a}}
/* One voice: a portion [pa,pb) of a clip, in beats, starting at audio time tA. Shared by live play and mixdown. */
/* ---------- ROOM4-07 · warp: stretch / compress, granular (pitch-keeping) fit and granular pitch ----------
   Nothing is stored: a variant is PCM derived from the untouched source and kept in RAM only (cold, rendered in the
   shared offline PCM worker that PITCH-HQ-01 uses). The clip only carries stretch / warp / pitch, so the original is
   always one reset away. Until a variant is ready (or if it cannot be rendered) the clip plays tape-style.
   R = source seconds per output second. Tape: playbackRate R, pitch follows. Granular: the pitch stays (times the
   offset). R>1 (compress): shift the source by pitch/R at equal length, play at R. R<1 (stretch): first lengthen the
   source by 1/R (plain resampling, pitch drops by R), then shift by pitch/R, play at rate 1 (full bandwidth). */
const variants=new Map();// key -> {status,buffer,error,promise,last}
const variantListeners=new Set();
const pitchCentsOf=(c,t)=>num(c?.pitch,0)+num(t?.pitch,0);
function variantPlan(c,t,entry,buffer,bpm){
 const cents=pitchCentsOf(c,t),grain=c.warp==='grain',rev=!!c.reverse;if(!grain&&Math.abs(cents)<.5&&!rev)return null;if(!entry||!buffer)return null;
 const r=regionOf(entry,buffer),spb=60/bpm,R=clamp(r.len/(cycleBeats(entry,c,bpm)*spb),.0625,16),p=Math.pow(2,cents/1200);
 const shift=grain?p/R:p,up=grain&&R<1?1/R:1;if(Math.abs(shift-1)<1e-4&&Math.abs(up-1)<1e-4&&!rev)return null;
 if(shift<.25||shift>4)return {error:'outside the granular range (¼× to 4×): playing tape-style'};
 const sr=buffer.sampleRate,a=Math.max(0,Math.round(r.a*sr)),b=Math.min(buffer.length,Math.max(a+1,Math.round(r.b*sr))),L=b-a,out=Math.round(L*up),ch=Math.min(2,buffer.numberOfChannels);
 if(L<Math.round(.03*sr)&&(Math.abs(shift-1)>=1e-4||Math.abs(up-1)>=1e-4))return {error:'too short for granular rendering: playing tape-style'};
 if(2*(2*out*ch*4)+1048576>48*1024*1024)return {error:'too long for granular rendering (about '+Math.floor(23.5e6/(ch*4*2)/sr)+' s after stretching): playing tape-style'};
 return {key:entry.id+'|'+a+'|'+b+'|'+shift.toFixed(5)+'|'+up.toFixed(5)+(rev?'|rev':''),a,b,L,out,ch,sr,shift,up,rev};
}
function requestVariant(plan,buffer){
 if(!plan||plan.error)return null;let row=variants.get(plan.key);if(row&&row.status!=='error'){row.last=Date.now();return row}
 row={status:'loading',buffer:null,error:'',last:Date.now()};variants.set(plan.key,row);
 row.promise=(async()=>{try{
   let channels=[];for(let i=0;i<plan.ch;i++){const d=buffer.getChannelData(i).slice(plan.a,plan.b);if(plan.rev)d.reverse();channels.push(d)}
   if(plan.up>1+1e-6){// lengthen by plain resampling (cyclic, so the loop seam stays continuous)
    const Offline=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext,octx=new Offline(plan.ch,plan.out,plan.sr),region=octx.createBuffer(plan.ch,plan.L,plan.sr);
    channels.forEach((d,i)=>region.copyToChannel(d,i));const src=octx.createBufferSource();src.buffer=region;src.loop=true;src.playbackRate.value=1/plan.up;src.connect(octx.destination);src.start(0);
    const rendered=await octx.startRendering();channels=[];for(let i=0;i<plan.ch;i++)channels.push(rendered.getChannelData(i).slice(0,plan.out));
   }
   let data=channels,release=null;
   if(Math.abs(plan.shift-1)>=1e-4){
    for(let attempt=0;;attempt++){
     try{const result=await __xenSharedOfflinePCMWorker.render({loop:true,rate:plan.sr,sourceRate:plan.sr,frames:plan.out,pitch:plan.shift,channels:channels.map(c=>c.slice())});data=result.channels;release=result.release;break}
     catch(e){if(attempt<6&&/capacity busy/i.test(String(e?.message||e))){await new Promise(ok=>setTimeout(ok,700));continue}throw e}
    }
   }
   try{const out=new AudioBuffer({numberOfChannels:plan.ch,length:plan.out,sampleRate:plan.sr});data.forEach((d,i)=>out.copyToChannel(d,i));row.buffer=out;row.status='ready'}finally{release?.()}
   // keep RAM bounded: drop the least recently used finished variants
   if(variants.size>24){const old=[...variants].filter(([,v])=>v.status!=='loading'&&v!==row).sort((x,y)=>x[1].last-y[1].last);for(const [k] of old.slice(0,variants.size-24))variants.delete(k)}
  }catch(e){row.status='error';row.error=String(e?.message||e).slice(0,160)}finally{audioNotify();for(const f of variantListeners)f()}})();
 return row}
/* What a voice really plays: the ready variant (whole buffer = one material cycle) or the source region (tape). */
function voiceSource(c,t,entry,buffer,bpm){const plan=variantPlan(c,t,entry,buffer,bpm);
 if(!plan)return {buffer,region:regionOf(entry,buffer),state:'',key:''};
 if(plan.error)return {buffer,region:regionOf(entry,buffer),state:plan.error,key:'!'};
 const row=variants.get(plan.key);if(row?.status==='ready'){row.last=Date.now();return {buffer:row.buffer,region:{a:0,b:row.buffer.duration,len:row.buffer.duration},state:'granular',key:plan.key}}
 return {buffer,region:regionOf(entry,buffer),state:row?.status==='error'?'render failed ('+row.error+'): playing the plain source':'rendering …',key:plan.key+'?'+(row?.status||'none')}}
function prepareVariants(project,lib,wait){const jobs=[];for(const t of project.tracks){if(isFrozen(project,t))continue;for(const c of t.clips){const e=lib.get(c.materialId),au=e?audio.get(e.id):null;if(!au||au.status!=='ready')continue;const row=requestVariant(variantPlan(c,t,e,au.buffer,project.bpm),au.buffer);if(row?.promise&&row.status==='loading')jobs.push(row.promise)}}return wait?Promise.all(jobs):null}
function planVoice(ctx,dest,clip,entry,sourceBuffer,pa,pb,tA,tB,spb,isStart,isEnd,track){
 const vs=voiceSource(clip,track,entry,sourceBuffer,60/spb),buffer=vs.buffer;
 const mb=cycleBeats(entry,clip,60/spb),r=vs.region,rate=clamp(r.len/(mb*spb),.0625,16),off=pa-clip.startBeat+clip.inBeat;
 const frac=((off/mb)%1+1)%1,offset=r.a+frac*r.len,dur=Math.max(.004,tB-tA),lvl=clip.muted?0:clip.gain;
 const fi=Math.min(dur*.5,isStart?Math.max(.004,clip.fadeIn*spb):.004),fo=Math.min(dur*.5,isEnd?Math.max(.006,clip.fadeOut*spb):.006);
 const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=buffer;src.loop=true;src.loopStart=r.a;src.loopEnd=r.b;src.playbackRate.value=rate;
 g.gain.setValueAtTime(0,tA);g.gain.linearRampToValueAtTime(lvl,tA+fi);g.gain.setValueAtTime(lvl,tB-fo);g.gain.linearRampToValueAtTime(0,tB);
 src.connect(g);g.connect(dest);src.start(tA,offset);src.stop(tB+.01);return {src,g,rate}}
/* ---------- ROOM4-09 · track effects: one builder for live play and for the mixdown (native nodes only) ----------
   Chain after the track EQ: low cut -> high cut -> drive -> master, plus a tempo-synced echo and a send into one shared
   reverb. A track without effects gets NO extra node (the signal path, and so the exported PCM, is exactly as before). */
/* effective effect settings: a parameter with a curve forces its stage to exist (its knob value is only the starting point) */
function fxEff(t){const f=fxOf(t),a=t?.auto;if(a){if(a.lowCut&&f.lowCut<=0)f.lowCut=AUTO.lowCut.min;if(a.highCut&&f.highCut>=20000)f.highCut=19999;if(a.reverb&&f.reverb<=0)f.reverb=.0001;if(a.echoMix&&f.echoBeats>0&&f.echoMix<=0)f.echoMix=.0001}return f}
const chainSig=t=>fxShape(fxEff(t))+(hasAuto(t,'volume')?'v':'');
function driveCurve(a){const n=1024,c=new Float32Array(n),k=1+a*8,norm=Math.tanh(k);for(let i=0;i<n;i++)c[i]=Math.tanh(k*(i/(n-1)*2-1))/norm;return c}
const driveMakeup=a=>1/Math.pow(1+a*8,.7);
/* Deterministic stereo impulse response (seeded noise, exponential decay, darker towards the end): the same tail live and in every export. */
function reverbIR(ctx,size){const sr=ctx.sampleRate,n=Math.max(64,Math.round(clamp(size,.2,8)*sr)),buf=ctx.createBuffer(2,n,sr);
 for(let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);let seed=(0x9e3779b9^(ch*0x85ebca6b)^n)>>>0,lp=0,energy=0;const pre=Math.round(.012*sr);
  for(let i=pre;i<n;i++){seed=(seed+0x6d2b79f5)>>>0;let x=Math.imul(seed^(seed>>>15),1|seed);x=(x+Math.imul(x^(x>>>7),61|x))^x;const w=(((x^(x>>>14))>>>0)/4294967296)*2-1;
   const u=(i-pre)/(n-pre),k=.25+.7*u;lp+=(w-lp)*(1-k);const v=lp*Math.pow(1-u,2)*Math.exp(-3.2*u);d[i]=v;energy+=v*v}
  const g=energy>0?.5/Math.sqrt(energy):0;for(let i=pre;i<n;i++)d[i]*=g}
 return buf}
const echoTime=(f,spb)=>clamp(f.echoBeats*spb,.005,4);
function fxTailSec(project){let tail=0;const any=project.tracks.some(t=>t.solo),spb=60/project.bpm;
 for(const t of project.tracks){if(t.mute||(any&&!t.solo)||!(t.volume>0)||isFrozen(project,t))continue;const f=fxEff(t),sh=fxShape(f);
  if(sh.includes('e')){const fb=clamp(f.echoFb,0,.92);tail=Math.max(tail,echoTime(f,spb)*(fb>0?Math.min(40,Math.ceil(Math.log(.001)/Math.log(fb))):1))}
  if(sh.includes('r'))tail=Math.max(tail,clamp(num(project.master.reverbSize,2.2),.2,8))}
 return Math.min(12,tail)}
function buildTrackFx(ctx,f,spb,out,master,getReverb){
 const shape=fxShape(f),nodes=[];let tail=out,hp=null,lp=null,ws=null,post=null,dl=null,fb=null,wet=null,send=null;const add=n=>{tail.connect(n);nodes.push(n);tail=n;return n};
 if(shape.includes('h')){hp=add(ctx.createBiquadFilter());hp.type='highpass';hp.Q.value=.707;hp.frequency.value=f.lowCut}
 if(shape.includes('l')){lp=add(ctx.createBiquadFilter());lp.type='lowpass';lp.Q.value=.707;lp.frequency.value=f.highCut}
 if(shape.includes('d')){ws=add(ctx.createWaveShaper());ws.curve=driveCurve(f.drive);ws.oversample='2x';post=add(ctx.createGain());post.gain.value=driveMakeup(f.drive)}
 tail.connect(master);
 if(shape.includes('e')){dl=ctx.createDelay(4);dl.delayTime.value=echoTime(f,spb);fb=ctx.createGain();fb.gain.value=clamp(f.echoFb,0,.92);wet=ctx.createGain();wet.gain.value=f.echoMix;
  const tone=ctx.createBiquadFilter();tone.type='lowpass';tone.frequency.value=4800;const body=ctx.createBiquadFilter();body.type='highpass';body.frequency.value=140;
  tail.connect(dl);dl.connect(tone);tone.connect(body);body.connect(fb);fb.connect(dl);body.connect(wet);wet.connect(master);nodes.push(dl,fb,wet,tone,body)}
 if(shape.includes('r')){send=ctx.createGain();send.gain.value=f.reverb;tail.connect(send);send.connect(getReverb());nodes.push(send)}
 let drive=f.drive;
 return {shape,
  params:{hp:hp?.frequency||null,lp:lp?.frequency||null,send:send?.gain||null,wet:wet?.gain||null},
  set(g,spb2,now,skip){skip=skip||{};// smoothed moves while playing (same shape only; a new shape rebuilds the chain). A parameter with a curve is never touched here.
   if(!skip.lowCut)hp?.frequency.setTargetAtTime(g.lowCut,now,.02);if(!skip.highCut)lp?.frequency.setTargetAtTime(g.highCut,now,.02);
   if(ws&&g.drive!==drive){drive=g.drive;ws.curve=driveCurve(drive);post.gain.setTargetAtTime(driveMakeup(drive),now,.02)}
   if(dl){dl.delayTime.setTargetAtTime(echoTime(g,spb2),now,.05);fb.gain.setTargetAtTime(clamp(g.echoFb,0,.92),now,.02);if(!skip.echoMix)wet.gain.setTargetAtTime(g.echoMix,now,.02)}
   if(!skip.reverb)send?.gain.setTargetAtTime(g.reverb,now,.02)},
  dispose(){try{tail.disconnect()}catch{}for(const n of nodes){try{n.disconnect()}catch{}}}}}
/* ---------- ROOM4-14 · recording from an audio input (microphone / line in) straight onto a track ----------
   Cold: nothing exists until the user presses Rec. Capture is lossless 32-bit float PCM taken in an AudioWorklet on the SAME AudioContext as the playback,
   so the recording is placed by the shared sample clock (not by wall-clock guessing). Everything already on the tracks plays while recording (overdub);
   the input itself is not monitored (no feedback). Round-trip latency is compensated by the user's value. */
const MT_CAPTURE_WORKLET=`class C extends AudioWorkletProcessor{constructor(){super();this.b=[[],[]];this.n=0;this.s=-1;this.run=true;
 this.port.onmessage=e=>{if(e.data==='stop'){this.flush();this.run=false;this.port.postMessage({kind:'done'})}}}
 flush(){if(!this.n)return;const a=new Float32Array(this.n),b=new Float32Array(this.n);let o=0;for(let i=0;i<this.b[0].length;i++){a.set(this.b[0][i],o);b.set(this.b[1][i],o);o+=this.b[0][i].length}this.port.postMessage({kind:'chunk',frame:this.s,l:a,r:b},[a.buffer,b.buffer]);this.b=[[],[]];this.n=0;this.s=-1}
 process(inputs){if(!this.run)return false;const i=inputs[0];if(this.s<0)this.s=currentFrame;const l=i&&i[0]?i[0]:new Float32Array(128),r=i&&i[1]?i[1]:l;this.b[0].push(new Float32Array(l));this.b[1].push(new Float32Array(r));this.n+=l.length;if(this.n>=4096)this.flush();return true}}
registerProcessor('xen-mt-capture',C);`;
const capReg=new WeakSet();
const recorder={
 async start(deviceId){const bridge=__xenMultitrackBridge.current;if(!bridge)throw Error('The audio bridge is not ready: open the Live Room once.');
  if(!navigator.mediaDevices?.getUserMedia)throw Error('This page cannot use an audio input (it needs HTTPS or localhost and a browser with microphone access).');
  const ctx=await bridge.ensureAudioReady();
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:2,...(deviceId?{deviceId:{exact:deviceId}}:{})}});
  try{const src=ctx.createMediaStreamSource(stream),sink=ctx.createGain();sink.gain.value=0;sink.connect(ctx.destination);const chunks=[];let node,done=null;const h={ctx,stream,src,sink,chunks,mode:'worklet',doneP:null};
   try{if(!ctx.audioWorklet)throw 0;if(!capReg.has(ctx)){/* a blob: URL is refused when the page is opened from a file (null origin); a data: URL works there */
    try{const url=URL.createObjectURL(new Blob([MT_CAPTURE_WORKLET],{type:'text/javascript'}));try{await ctx.audioWorklet.addModule(url)}finally{URL.revokeObjectURL(url)}}
    catch{await ctx.audioWorklet.addModule('data:text/javascript;base64,'+btoa(MT_CAPTURE_WORKLET))}capReg.add(ctx)}
    node=new AudioWorkletNode(ctx,'xen-mt-capture',{numberOfInputs:1,numberOfOutputs:1,channelCount:2,channelCountMode:'explicit',outputChannelCount:[2]});
    h.doneP=new Promise(ok=>{done=ok});node.port.onmessage=ev=>{if(ev.data.kind==='chunk')chunks.push(ev.data);else if(ev.data.kind==='done')done()}}
   catch{h.mode='script';node=ctx.createScriptProcessor(4096,2,2);h.doneP=Promise.resolve();node.onaudioprocess=ev=>{const l=ev.inputBuffer.getChannelData(0),r=ev.inputBuffer.numberOfChannels>1?ev.inputBuffer.getChannelData(1):l;chunks.push({frame:Math.round(ev.playbackTime*ctx.sampleRate)-l.length+Math.round((ctx.baseLatency||0)*ctx.sampleRate),l:new Float32Array(l),r:new Float32Array(r)})}}
   src.connect(node);node.connect(sink);h.node=node;return h}
  catch(e){stream.getTracks().forEach(t=>t.stop());throw e}},
 async finish(h){try{if(h.mode==='worklet'){h.node.port.postMessage('stop');await Promise.race([h.doneP,new Promise(ok=>setTimeout(ok,700))])}}catch{}
  try{h.stream.getTracks().forEach(t=>t.stop())}catch{}for(const n of [h.src,h.node,h.sink]){try{n.disconnect()}catch{}}
  const cs=h.chunks.slice().sort((a,b)=>a.frame-b.frame);if(!cs.length)return {channels:[new Float32Array(0),new Float32Array(0)],first:0,sampleRate:h.ctx.sampleRate};
  const first=cs[0].frame,last=cs[cs.length-1],total=last.frame+last.l.length-first,L=new Float32Array(total),R=new Float32Array(total);
  for(const c of cs){const o=c.frame-first;if(o<0||o+c.l.length>total)continue;L.set(c.l,o);R.set(c.r,o)}
  return {channels:[L,R],first,sampleRate:h.ctx.sampleRate}}};
/* the part of a capture that belongs to the timeline: it starts at the sample frame where playback started, shifted by the round-trip latency */
function recSlice(cap,t0,latencyMs){const sr=cap.sampleRate,start=Math.round(t0*sr)+Math.round(Math.max(0,latencyMs||0)/1000*sr)-cap.first,n=cap.channels[0].length;
 return cap.channels.map(c=>{if(start>=0)return c.slice(start);const o=new Float32Array(Math.max(0,n-start));o.set(c,-start);return o})}
/* ---------- live engine (hot only while playing) ---------- */
class Engine{
 constructor(){this.ctx=null;this.playing=false;this.voices=new Set();this.chains=new Map();this.timer=null;this.keys=new Set();this.segs=[];this.segSerial=0;this.project=null;this.lib=new Map();this.master=null;this.meter=null;this.sigs=new Map()}
 spb(){return 60/this.project.bpm}
 gainFor(t){const any=this.project.tracks.some(x=>x.solo);return (t.mute||(any&&!t.solo))?0:t.volume}
 sigOf(t,c){return t.id+'|'+c.materialId+'|'+c.startBeat+'|'+c.inBeat+'|'+clipLen(c,this.lib,this.project.bpm)+'|'+c.gain+'|'+c.fadeIn+'|'+c.fadeOut+'|'+c.muted+'|'+c.fit+'|'+(c.sourceBpm||0)+'|'+(c.stretch||1)+'|'+(c.warp||'')+'|'+pitchCentsOf(c,t)+'|'+this.vkey(t,c)+'|'+fxShape(fxOf(t))+(isFrozen(this.project,t)?'|z':'')}
 vkey(t,c){const e=this.lib.get(c.materialId),au=e?audio.get(e.id):null;return au?.status==='ready'?voiceSource(c,t,e,au.buffer,this.project.bpm).key:''}
 chainFor(t){let ch=this.chains.get(t.id);if(ch)return ch;const ctx=this.ctx,input=ctx.createGain(),gain=ctx.createGain();gain.gain.value=this.gainFor(t);
  let src=input,ag=null;if(hasAuto(t,'volume')){ag=ctx.createGain();ag.gain.value=1;input.connect(ag);src=ag}
  let fx=null;const chain=__xenMaterialLaneChain(ctx,{source:src,gain,panValue:t.pan,eqKey:__XenEQ.keyFor('arrangement',t.id),route:out=>{fx=buildTrackFx(ctx,fxEff(t),this.spb(),out,this.master,()=>this.reverbIn())}});
  ch={input,ag,gain,pan:chain.pan,eq:chain.eq,output:chain.output,fx,sig:chainSig(t),asig:JSON.stringify(t.auto||null)};this.chains.set(t.id,ch);return ch}
 autoParam(ch,name){return name==='volume'?ch.ag?.gain:name==='pan'?ch.pan?.pan:name==='reverb'?ch.fx?.params.send:name==='echoMix'?ch.fx?.params.wet:name==='lowCut'?ch.fx?.params.hp:name==='highCut'?ch.fx?.params.lp:null}
 /* automation: exact linear ramps per scheduling window (no setTargetAtTime on automated parameters: they never mix, which Firefox does not like) */
 scheduleAuto(s,now,horizon,spb){const tOf=b=>s.t+(b-s.a)*spb,cur=Math.max(s.a,s.a+(now-s.t)/spb),end=Math.min(s.b,s.a+(horizon-s.t)/spb);
  for(const t of this.project.tracks){const au=t.auto;if(!au||isFrozen(this.project,t))continue;const ch=this.chains.get(t.id);if(!ch)continue;
   for(const name of Object.keys(au)){const pts=au[name],sp=AUTO[name],prm=sp&&this.autoParam(ch,name);if(!prm||!pts.length)continue;const key='a|'+t.id+'|'+name,rec=this.autoPos.get(key),first=!rec||rec.seg!==s.i,from=first?cur:rec.beat;
    if(!(end>from+1e-6))continue;if(first){prm.cancelScheduledValues(Math.max(now,tOf(from)));prm.setValueAtTime(autoValue(pts,sp,from),Math.max(now,tOf(from)))}
    for(const e of autoEvents(pts,sp,from,end))prm.linearRampToValueAtTime(e.v,tOf(e.b));this.autoPos.set(key,{seg:s.i,beat:end})}}}

 reverbIn(){if(this.rev)return this.rev.input;const ctx=this.ctx,input=ctx.createGain(),conv=ctx.createConvolver();conv.buffer=reverbIR(ctx,num(this.project.master.reverbSize,2.2));input.connect(conv);conv.connect(this.master);this.rev={input,conv,size:num(this.project.master.reverbSize,2.2)};return input}
 dropChain(id){const ch=this.chains.get(id);if(!ch)return;this.chains.delete(id);const now=this.ctx.currentTime;ch.gain.gain.setTargetAtTime(0,now,.01);
  setTimeout(()=>{try{ch.input.disconnect();ch.output.disconnect()}catch{}try{ch.fx?.dispose()}catch{}try{ch.eq?.dispose?.()}catch{}},120)}
 async play(project,fromBeat,lib){this.stop();this.project=project;this.lib=lib;const bridge=__xenMultitrackBridge.current;
  if(!bridge)throw Error('Audio bridge is not ready yet; open the Live Room once and come back.');
  const ctx=await bridge.ensureAudioReady();this.ctx=ctx;
  const used=new Set();for(const t of project.tracks)for(const c of t.clips)used.add(c.materialId);
  await Promise.all([...used].map(id=>requestAudio(lib.get(id))?.promise));await prepareVariants(project,lib,true);
  this.master=ctx.createGain();this.master.gain.value=project.master.volume;this.meter=ctx.createAnalyser();this.meter.fftSize=1024;
  this.master.connect(this.meter);this.master.connect(bridge.getMasterInput(ctx));
  /* ROOM4-10: the metronome has its own gain straight into the live master input: it is not on the arrangement master and never in the export */
  this.metroGain=ctx.createGain();this.metroGain.gain.value=.5;this.metroGain.connect(bridge.getMasterInput(ctx));
  for(const t of project.tracks)this.chainFor(t);
  const pre=this.metro&&this.countIn?project.beatsPerBar*60/project.bpm:0,t0=ctx.currentTime+.08+pre,from=Math.max(0,fromBeat),L=project.loop;
  if(pre>0){const spb0=60/project.bpm;for(let k=0;k<Math.round(project.beatsPerBar);k++)this.click(t0-pre+k*spb0,k===0)}
  this.autoPos=new Map();this.segs=[{i:++this.segSerial,a:from,b:L.on&&from<L.end?L.end:Infinity,t:t0}];this.playing=true;this.keys.clear();this.sigs=new Map();
  for(const t of project.tracks)for(const c of t.clips)this.sigs.set(c.id,this.sigOf(t,c));
  const tick=()=>{if(!this.playing)return;this.schedule();this.timer=setTimeout(tick,200)};tick()}
 click(t,accent){const ctx=this.ctx;if(!ctx||!this.metroGain||t<ctx.currentTime-.02)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=accent?1600:1000;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(accent?.9:.6,t+.002);g.gain.exponentialRampToValueAtTime(.0008,t+.045);o.connect(g);g.connect(this.metroGain);o.start(t);o.stop(t+.06);o.onended=()=>{try{g.disconnect()}catch{}}}
 extendSegments(horizon){const L=this.project.loop,spb=this.spb();let last=this.segs[this.segs.length-1];
  while(L.on&&last&&Number.isFinite(last.b)&&last.t+(last.b-last.a)*spb<horizon){const next={i:++this.segSerial,a:L.start,b:L.end,t:last.t+(last.b-last.a)*spb};this.segs.push(next);last=next}
  const now=this.ctx.currentTime;this.segs=this.segs.filter(s=>!Number.isFinite(s.b)||s.t+(s.b-s.a)*spb>now-.5);
  /* ROOM4-05: the planned-voice keys of loop passes that are gone must not accumulate for hours of looping */
  if(this.keys.size>64){const live=new Set(this.segs.map(s=>String(s.i)));for(const k of this.keys)if(!live.has(k.slice(0,k.indexOf('|'))))this.keys.delete(k)}}
 schedule(){const ctx=this.ctx,now=ctx.currentTime,horizon=now+1.5,spb=this.spb();this.extendSegments(horizon);
  for(const s of this.segs){if(s.t>horizon)continue;
   for(const t of this.project.tracks){if(isFrozen(this.project,t))continue;const ch=this.chainFor(t);
    for(const c of t.clips){const key=s.i+'|'+c.id;if(this.keys.has(key))continue;const entry=this.lib.get(c.materialId),au=entry?audio.get(entry.id):null;
     const cs=c.startBeat,ce=cs+clipLen(c,this.lib,this.project.bpm);let pa=Math.max(cs,s.a);const pb=Math.min(ce,s.b);if(pb<=pa){this.keys.add(key);continue}
     let tA=s.t+(pa-s.a)*spb;const tB=s.t+(pb-s.a)*spb;if(tA>horizon)continue;if(tB<=now+.02){this.keys.add(key);continue}
     if(!au||au.status!=='ready')continue;// picked up on a later tick once decoded
     const start=pa===cs;if(tA<now+.02){pa+=(now+.02-tA)/spb;tA=now+.02}
     this.keys.add(key);const v=planVoice(ctx,ch.input,c,entry,au.buffer,pa,pb,tA,tB,spb,start&&tA===s.t+(cs-s.a)*spb,pb===ce,t);
     const voice={...v,clipId:c.id,sig:this.sigs.get(c.id)};this.voices.add(voice);v.src.onended=()=>{this.voices.delete(voice);try{v.g.disconnect()}catch{}}}}
   this.scheduleAuto(s,now,horizon,spb);
   if(this.metro&&this.metroGain){const bpbN=this.project.beatsPerBar;for(let k=Math.ceil(s.a-1e-9);;k++){const tk=s.t+(k-s.a)*spb;if(k>=s.b-1e-9||tk>horizon)break;const key=s.i+'|m'+k;if(this.keys.has(key))continue;this.keys.add(key);if(tk>=now-.01)this.click(tk,Math.abs(k/bpbN-Math.round(k/bpbN))<1e-9)}}}}
 /* Edits while playing: mixer as AudioParam moves; changed/removed clips fade out and are re-planned from now. */
 update(project,lib){if(!this.playing){this.project=project;this.lib=lib;return false}const old=this.project,posBefore=this.position();/* ROOM4-04: read the beat position with the OLD tempo before swapping the project */this.project=project;this.lib=lib;const ctx=this.ctx,now=ctx.currentTime;
  if(old.bpm!==project.bpm||old.loop.on!==project.loop.on||old.loop.start!==project.loop.start||old.loop.end!==project.loop.end){this.restartBeat=posBefore;return true}// caller restarts at the current beat
  this.master.gain.setTargetAtTime(project.master.volume,now,.02);
  if(this.rev&&this.rev.size!==num(project.master.reverbSize,2.2)){this.rev.size=num(project.master.reverbSize,2.2);this.rev.conv.buffer=reverbIR(ctx,this.rev.size)}
  for(const t of project.tracks){const f=fxEff(t);let ch=this.chains.get(t.id);if(ch&&ch.sig!==chainSig(t)){this.dropChain(t.id);ch=null}// another set of effects or a new volume curve: rebuild this track (its clips re-plan through their signature)
   ch=ch||this.chainFor(t);const skip={};for(const k of Object.keys(t.auto||{}))skip[k]=true;
   const asig=JSON.stringify(t.auto||null);if(ch.asig!==asig){const old=ch.asig&&ch.asig!=='null'?Object.keys(JSON.parse(ch.asig)):[];ch.asig=asig;
    for(const name of new Set([...old,...Object.keys(t.auto||{})])){const prm=this.autoParam(ch,name);if(prm){prm.cancelScheduledValues(now);if(!skip[name])prm.setValueAtTime(name==='volume'?1:name==='pan'?t.pan:name==='reverb'?f.reverb:name==='echoMix'?f.echoMix:name==='lowCut'?f.lowCut:f.highCut,now)}}
    for(const k of [...this.autoPos.keys()])if(k.startsWith('a|'+t.id+'|'))this.autoPos.delete(k)}
   ch.gain.gain.setTargetAtTime(this.gainFor(t),now,.02);if(!skip.pan)ch.pan?.pan.setTargetAtTime(t.pan,now,.02);ch.fx?.set(f,this.spb(),now,skip)}
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
  const chains=[...this.chains.values()],master=this.master,meter=this.meter,rev=this.rev,mg=this.metroGain;this.metroGain=null;this.chains.clear();this.master=null;this.meter=null;this.rev=null;
  setTimeout(()=>{for(const c of chains){try{c.input.disconnect();c.output.disconnect()}catch{}try{c.fx?.dispose()}catch{}try{c.eq?.dispose?.()}catch{}}try{mg?.disconnect()}catch{}try{rev?.input.disconnect();rev?.conv.disconnect()}catch{}try{master?.disconnect();meter?.disconnect()}catch{}},120);this.keys.clear();this.segs=[]}
}
const engine=new Engine();
/* ---------- mixdown (cold, offline) ---------- */
/* ROOM4-05: every audible clip inside the range must have decoded audio; otherwise the export would silently omit it. */
function mixdownMissing(project,lib,fromBeat,toBeat){
 const out=[],any=project.tracks.some(t=>t.solo);
 for(const t of project.tracks){if(t.mute||(any&&!t.solo)||!(t.volume>0)||isFrozen(project,t))continue;
  for(const c of t.clips){if(c.muted||!(c.gain>0))continue;const e=lib.get(c.materialId),cs=c.startBeat,ce=cs+clipLen(c,lib,project.bpm);if(Math.min(ce,toBeat)<=Math.max(cs,fromBeat))continue;
   const au=e?audio.get(e.id):null;if(!e||!au||au.status!=='ready')out.push({name:String(e?.name||c.materialId).slice(0,40),track:t.name,reason:e?(au?.error||au?.status||''):'material not found in the library'})}}
 return out}
async function mixdown(project0,lib,fromBeat,toBeat,format,opts={}){
 /* ROOM4-12: opts.only = render just that track, unity = at neutral volume/pan/master (what a bounce stores: the new track brings its own volume and pan), raw = PCM instead of a WAV file */
 const project=opts.only?{...project0,tracks:project0.tracks.filter(t=>t.id===opts.only)}:project0;
 const used=new Set();for(const t of project.tracks)for(const c of t.clips)used.add(c.materialId);
 await Promise.all([...used].map(id=>requestAudio(lib.get(id))?.promise));
 await prepareVariants(project,lib,true);// ROOM4-07: export the same granular variants the arrangement plays
 const missing=opts.unity?mixdownMissing({...project,tracks:project.tracks.map(t=>({...t,mute:false,solo:false,volume:1}))},lib,fromBeat,toBeat):mixdownMissing(project,lib,fromBeat,toBeat);
 if(missing.length)throw Error('Export stopped, nothing was written: '+missing.length+' clip'+(missing.length>1?'s have':' has')+' no usable audio ('+missing.slice(0,3).map(m=>m.name+' on '+m.track+(m.reason?': '+m.reason:'')).join('; ')+(missing.length>3?'; …':'')+'). Re-import the material or delete those clips.');
 const sr=48000,spb=60/project.bpm,dur=(toBeat-fromBeat)*spb,tail=.05+fxTailSec(opts.unity?{...project,tracks:project.tracks.map(t=>({...t,mute:false,solo:false,volume:1}))}:project),frames=Math.ceil((dur+tail)*sr);
 if(!(frames>0)||frames>sr*60*30)throw Error('Mixdown range must be between 0 and 30 minutes.');
 const Offline=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;const ctx=new Offline(2,frames,sr);
 const master=ctx.createGain();master.gain.value=opts.unity?1:project.master.volume;master.connect(ctx.destination);const any=!opts.unity&&project.tracks.some(t=>t.solo);
 /* ROOM4-05: same lane chain as live play (gain -> pan -> track EQ), so the export matches what is heard. */
 const lanes=[];let revIn=null;const getReverb=()=>{if(revIn)return revIn;revIn=ctx.createGain();const conv=ctx.createConvolver();conv.buffer=reverbIR(ctx,num(project.master.reverbSize,2.2));revIn.connect(conv);conv.connect(master);return revIn};
 for(const t of project.tracks){if(isFrozen(project,t))continue;const g=ctx.createGain(),input=ctx.createGain();g.gain.value=opts.unity?1:(t.mute||(any&&!t.solo))?0:t.volume;
  let src=input,ag=null;if(hasAuto(t,'volume')){ag=ctx.createGain();ag.gain.value=1;input.connect(ag);src=ag}
  let fxo=null;const lane=__xenMaterialLaneChain(ctx,{source:src,gain:g,panValue:opts.unity?0:t.pan,eqKey:__XenEQ.keyFor('arrangement',t.id),route:out=>{fxo=buildTrackFx(ctx,fxEff(t),spb,out,master,getReverb)}});lanes.push(lane);
  for(const name of Object.keys(t.auto||{})){const pts=t.auto[name],sp=AUTO[name],prm=name==='volume'?ag?.gain:name==='pan'?lane.pan?.pan:name==='reverb'?fxo?.params.send:name==='echoMix'?fxo?.params.wet:name==='lowCut'?fxo?.params.hp:fxo?.params.lp;if(!prm||!pts.length||!sp)continue;
   prm.setValueAtTime(autoValue(pts,sp,fromBeat),0);for(const e of autoEvents(pts,sp,fromBeat,toBeat))prm.linearRampToValueAtTime(e.v,(e.b-fromBeat)*spb)}
  for(const c of t.clips){const e=lib.get(c.materialId),au=e?audio.get(e.id):null;if(!au||au.status!=='ready')continue;const cs=c.startBeat,ce=cs+clipLen(c,lib,project.bpm);
   const pa=Math.max(cs,fromBeat),pb=Math.min(ce,toBeat);if(pb<=pa)continue;planVoice(ctx,input,c,e,au.buffer,pa,pb,(pa-fromBeat)*spb,(pb-fromBeat)*spb,spb,pa===cs,pb===ce,t)}}
 let out;try{out=await ctx.startRendering()}finally{for(const l of lanes){try{l.eq?.dispose?.()}catch{}}}
 const channels=[out.getChannelData(0),out.getChannelData(1)];let peak=0;for(const ch of channels)for(const v of ch){const a=v<0?-v:v;if(a>peak)peak=a}
 if(opts.raw)return {channels:channels.map(c=>c.slice()),sampleRate:sr,peak,seconds:dur+tail};
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
.xmt .twrap{display:grid;grid-template-columns:minmax(0,1fr) 20px;grid-template-rows:auto 24px;gap:6px}
.xmt .tracks{position:relative;grid-column:1;grid-row:1;min-width:0;overflow:auto;height:max(240px,calc(100vh - 360px));border:1px solid #2b2b31;border-radius:10px;background:#09090b;scrollbar-width:none}
.xmt .tracks::-webkit-scrollbar{display:none}
.xmt .trk.rr{position:sticky;top:0;z-index:6;background:#09090b;height:29px}
.xmt .rail{position:relative;border:1px solid #2b2b31;border-radius:8px;background:#0b0b0d;cursor:pointer;touch-action:none;overflow:hidden;box-sizing:border-box}
.xmt .rail.v{grid-column:2;grid-row:1;margin:30px 0 1px}.xmt .rail.h{grid-column:1;grid-row:2;margin-left:241px}
.xmt .rail i{position:absolute;border-radius:2px;opacity:.28;pointer-events:none}.xmt .rail.v i{left:4px;right:4px}.xmt .rail.v i.full{opacity:.85}.xmt .rail.h i{opacity:.8}
.xmt .rail.h s{position:absolute;top:0;bottom:0;width:1px;background:#3f3f46;pointer-events:none}.xmt .rail.h em{position:absolute;top:0;bottom:0;background:rgba(56,189,248,.14);pointer-events:none}
.xmt .thumb{position:absolute;border:1px solid #fde68a;background:rgba(253,230,138,.14);border-radius:6px;cursor:grab;box-sizing:border-box}
.xmt .rail.v .thumb{left:0;right:0;min-height:14px}.xmt .rail.h .thumb{top:0;bottom:0;min-width:14px}
.xmt .thumb b{position:absolute;background:rgba(253,230,138,.35)}.xmt .thumb b.t,.xmt .thumb b.e{left:0;right:0;height:6px;cursor:ns-resize}.xmt .thumb b.t{top:0}.xmt .thumb b.e{bottom:0}
.xmt .thumb b.l,.xmt .thumb b.r{top:0;bottom:0;width:6px;cursor:ew-resize}.xmt .thumb b.l{left:0}.xmt .thumb b.r{right:0}
.xmt .trk{display:grid;grid-template-columns:240px max-content;width:max-content;min-width:100%;border-bottom:1px solid #1f1f23;box-sizing:border-box;overflow:clip}
.xmt .hdr .tn{display:none}.xmt .trk.mini .hdr{padding:0 8px;justify-content:center;gap:0}.xmt .trk.mini .hdr .row{display:none}
.xmt .trk.mini .hdr .tn{display:block;font-size:10px;line-height:1.1;color:#d6d3d1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.xmt .trk.mini .clip{top:1px;bottom:1px;border-radius:3px}.xmt .trk.mini .clip .nm{display:none}.xmt .trk.mini .clip canvas{top:0;height:100%}
.xmt .hdr{padding:6px 8px;background:#0f0f12;border-right:1px solid #26262b;display:flex;flex-direction:column;gap:4px;position:sticky;left:0;z-index:4}
.xmt .hdr .row{flex-wrap:nowrap;gap:4px}.xmt .hdr input[type=text]{width:104px}.xmt .hdr input[type=range]{width:78px}.xmt .hdr button{padding:2px 7px}.xmt .trk.compact .hdr{padding:3px 8px;justify-content:center}.xmt .trk.compact .hdr .row+.row{display:none}
.xmt .lane{position:relative}.xmt .lane.drop{background:#1c1917}.xmt .ruler{position:relative;height:28px;cursor:pointer;border-bottom:1px solid #2b2b31}
.xmt .tick{position:absolute;top:0;bottom:0;border-left:1px solid #2a2a30}.xmt .tick.barl{border-left:1px solid #57534e}.xmt .tick span{position:absolute;top:4px;left:3px;font-size:10px;color:#a8a29e}
.xmt .loopr{position:absolute;top:0;height:6px;background:rgba(56,189,248,.25);border:1px solid #38bdf8;border-top:0}.xmt .loopr.off{background:rgba(120,113,108,.15);border-color:#57534e}
.xmt .clip{position:absolute;top:5px;bottom:5px;border-radius:6px;border:1px solid var(--c);background:color-mix(in srgb,var(--c) 28%,#0c0a09);
 color:#fafaf9;padding:0;overflow:hidden;text-align:left;font-size:12px;cursor:grab;touch-action:none}
.xmt .clip canvas{position:absolute;left:0;top:14px;width:100%;height:calc(100% - 14px);pointer-events:none;opacity:.85}
.xmt .clip .nm{position:absolute;left:5px;top:1px;right:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;text-shadow:0 1px 2px #000}
.xmt .clip .eg{position:absolute;top:0;bottom:50%;width:7px;cursor:ew-resize}.xmt .clip .eg.l{left:0}.xmt .clip .eg.r{right:0}
.xmt .clip .eg.s{top:50%;bottom:0;width:9px;cursor:col-resize}.xmt .clip .eg.s::after{content:'';position:absolute;bottom:1px;width:0;height:0;border:4px solid transparent;border-bottom-color:#fde68a;opacity:.55}
.xmt .clip .eg.s.l::after{left:0;border-left-color:#fde68a}.xmt .clip .eg.s.r::after{right:0;border-right-color:#fde68a}.xmt .clip:hover .eg.s::after,.xmt .clip[aria-selected=true] .eg.s::after{opacity:1}
.xmt .clip[aria-selected=true]{outline:2px solid #fde68a;z-index:2}.xmt .clip.muted{opacity:.45}.xmt .clip.bad{--c:#ef4444!important}
.xmt .clip .rep{position:absolute;top:0;bottom:0;border-left:1px dashed rgba(253,230,138,.5);pointer-events:none}
.xmt .ph{position:absolute;top:0;bottom:0;width:2px;background:#fbbf24;pointer-events:none;z-index:5;display:none}
.xmt .mk{position:absolute;top:0;height:28px;width:0;padding:0;border:0;border-left:2px solid #f472b6;background:transparent;cursor:pointer;z-index:2;color:#f9a8d4;font-size:10px;text-align:left}.xmt .mk span{position:absolute;bottom:0;left:2px;white-space:nowrap;background:rgba(17,17,19,.8);padding:0 3px;border-radius:0 3px 3px 0;max-width:110px;overflow:hidden;text-overflow:ellipsis}.xmt .mk::before{content:'';position:absolute;top:0;left:0;border:5px solid transparent;border-top-color:#f472b6;border-left-color:#f472b6}
.xmt .trk.frozen .lane{opacity:.42;filter:saturate(.3)}.xmt .trk.frozen .clip{pointer-events:none}
.xmt .band{position:fixed;border:1px solid #fde68a;background:rgba(253,230,138,.12);pointer-events:none;z-index:50}
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
function ClipWave({peaks,inBeat,len,mb,ppb,color,rev}){const ref=P.useRef(null);
 P.useEffect(()=>{const cv=ref.current;if(!cv||!peaks)return;const w=Math.max(1,Math.min(4096,Math.round(len*ppb))),h=48;cv.width=w;cv.height=h;const g=cv.getContext('2d');g.clearRect(0,0,w,h);g.fillStyle=color;
  const n=peaks.length;for(let x=0;x<w;x++){const beat=inBeat+(x/w)*len,f0=((beat/mb)%1+1)%1,f=rev?1-f0:f0,v=peaks[Math.max(0,Math.min(n-1,Math.floor(f*n)))]||0,y=Math.max(1,v*h*.95);g.fillRect(x,(h-y)/2,1,y)}},[peaks,inBeat,len,mb,ppb,color,rev]);
 return peaks?u.jsx('canvas',{ref,'aria-hidden':'true'}):null}
function Menu({menu,close}){const ref=P.useRef(null);
 P.useEffect(()=>{if(!menu)return;const el=ref.current;el?.querySelector('button:not([disabled])')?.focus();
  const away=e=>{if(!el?.contains(e.target))close()};const key=e=>{if(e.key==='Escape'){e.preventDefault();close()}
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const bs=[...el.querySelectorAll('button:not([disabled])')];const i=bs.indexOf(document.activeElement);bs[(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length]?.focus()}};
  setTimeout(()=>document.addEventListener('pointerdown',away,true),0);el?.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',away,true);el?.removeEventListener('keydown',key)}},[menu]);
 if(!menu)return null;const x=Math.min(menu.x,innerWidth-240),y=Math.min(menu.y,innerHeight-28*menu.items.length-16);
 return u.jsx('div',{className:'xmt-menu',role:'menu','aria-label':menu.label,ref,style:{left:Math.max(4,x),top:Math.max(4,y)},children:menu.items.map((it,i)=>it==='-'?u.jsx('hr',{},'s'+i):
  u.jsxs('button',{type:'button',role:'menuitem',disabled:!!it.disabled,onClick:()=>{close();it.run()},children:[u.jsx('span',{className:it.icon==='wave-editor'?'xmt-open-wave':undefined,children:it.label}),it.key?u.jsx('small',{children:it.key}):null]},'m'+i))})}
/* ---------- room component ---------- */
function XenMultitrackRoom(){
 useStyle();
 const bridge=__xenMultitrackBridge.current;
 const [project,setProject]=P.useState(null),[sel,setSel]=P.useState(null),[trackSel,setTrackSel]=P.useState(null);
 const [libRev,setLibRev]=P.useState(0),[audioRev,setAudioRev]=P.useState(0),[pick,setPick]=P.useState(''),[cursor,setCursor]=P.useState(0),[playing,setPlaying]=P.useState(false);
 const [status,setStatus]=P.useState(''),[say,setSay]=P.useState(''),[listView,setListView]=P.useState(false),[menu,setMenu]=P.useState(null),[dropTrack,setDropTrack]=P.useState(null);
 /* ROOM4-10: multi-selection (group = every selected clip id, empty = single selection by `sel`), metronome (UI preference only), rubber band */
 const [group,setGroup]=P.useState([]),[band,setBand]=P.useState(null),[eqOpen,setEqOpen]=P.useState(null),[eqWide,setEqWide]=P.useState(true),[autoLane,setAutoLane]=P.useState(null);
 const autoDrag=P.useRef(null);
 /* ROOM4-14 recording state (hooks live up here, before the early return that waits for the project) */
 const [recording,setRecording]=P.useState(false),[inputs,setInputs]=P.useState([]);
 const [recDevice,setRecDevice]=P.useState(()=>{try{return localStorage.getItem('xensonar.mt.recdev')||''}catch{return ''}}),[recLat,setRecLat]=P.useState(()=>{try{const v=localStorage.getItem('xensonar.mt.reclat');return v==null?null:Number(v)}catch{return null}});
 const recRef=P.useRef(null),recFinishRef=P.useRef(null);
 const [metro,setMetro]=P.useState(()=>{try{return localStorage.getItem('xensonar.mt.metro')==='1'}catch{return false}}),[countIn,setCountIn]=P.useState(()=>{try{return localStorage.getItem('xensonar.mt.countin')==='1'}catch{return false}});
 engine.metro=metro;engine.countIn=countIn;
 const toggleMetro=()=>{const v=!metro;setMetro(v);try{localStorage.setItem('xensonar.mt.metro',v?'1':'0')}catch{}announce(v?'Metronome on':'Metronome off')};
 const toggleCountIn=()=>{const v=!countIn;setCountIn(v);try{localStorage.setItem('xensonar.mt.countin',v?'1':'0')}catch{}announce(v?'Count-in on':'Count-in off')};
 const inGroup=id=>group.length>1&&group.includes(id);const selIds=()=>group.length>1?group.filter(id=>findClip(id)):(sel?[sel]:[]);
 const [exportFormat,setExportFormat]=P.useState('pcm16'),[busy,setBusy]=P.useState(false);
 const rootRef=P.useRef(null),keyRef=P.useRef(null),hist=P.useRef({past:[],future:[]}),saveTimer=P.useRef(null),phRef=P.useRef(null),meterRef=P.useRef(null),rafRef=P.useRef(0),drag=P.useRef(null),projectRef=P.useRef(null),libRef=P.useRef(new Map());
 projectRef.current=project;
 const scrollRef=P.useRef(null),railRef=P.useRef(null),thumbRef=P.useRef(null),hrailRef=P.useRef(null),hthumbRef=P.useRef(null),rulerRef=P.useRef(null),totalRef=P.useRef(64),railDrag=P.useRef(null),pendingScroll=P.useRef(null),consumeRef=P.useRef(null),importRef=P.useRef(null),inboxWaiting=P.useRef(false);
 /* One overview bar per axis (Melodic Loop model, shared __xenViewportRail math): the bar IS the scrollbar
    and the zoom. Native scrollbars are hidden; wheel and trackpad scrolling still work and move the bars. */
 const viewGeo=()=>{const el=scrollRef.current,rr=rulerRef.current?.offsetHeight??29;return {el,uh:Math.max(20,(el?.clientHeight??300)-rr),uw:Math.max(40,(el?.clientWidth??800)-240)}};
 const vView=()=>{const p=projectRef.current,{el,uh}=viewGeo(),n=Math.max(1,p.tracks.length),h=p.trackHeight,vis=Math.min(n,uh/h);return {start:Math.min(Math.max(0,n-vis),(el?.scrollTop??0)/h),visible:vis,total:n,minVisible:Math.min(1,n)}};
 const hView=()=>{const p=projectRef.current,{el,uw}=viewGeo(),T=Math.max(1,totalRef.current),vis=Math.min(T,uw/p.zoom);return {start:Math.min(Math.max(0,T-vis),(el?.scrollLeft??0)/p.zoom),visible:vis,total:T,minVisible:Math.min(1,T)}};
 const setThumb=(th,v,x)=>{if(!th)return;const a=v.start/v.total*100,b=Math.min(100-a,v.visible/v.total*100);if(x){th.style.left=a+'%';th.style.width=b+'%'}else{th.style.top=a+'%';th.style.height=b+'%'}};
 const updateRail=()=>{if(!projectRef.current)return;setThumb(thumbRef.current,vView(),false);setThumb(hthumbRef.current,hView(),true)};
 P.useLayoutEffect(()=>{const el=scrollRef.current,ps=pendingScroll.current;if(el&&ps){if(ps.top!=null)el.scrollTop=ps.top;if(ps.left!=null)el.scrollLeft=ps.left;pendingScroll.current=null}updateRail()});
 P.useEffect(()=>{if(project)consumeRef.current?.()},[!!project]);
 const announce=t=>{setSay('');setTimeout(()=>setSay(t),20)};
 P.useEffect(()=>{let live=true;loadProject().then(raw=>{if(!live)return;
  const result=sanitize(raw,bridge?.getLiveBpm?.()),returned=__XenMultitrackRoundTrip.takeReceipt();
  pushEq(result);setProject(result);if(returned){const source=result.tracks.find(t=>t.id===returned.trackId)?.clips.find(c=>c.id===returned.clipId);
   if(source?.materialId===returned.newMaterialId){hist.current.past.push(returned.before);hist.current.future=[];setSel(returned.clipId);setTrackSel(returned.trackId);setCursor(returned.startBeat);setStatus('Returned from WAV Editor · originating clip updated · Undo available.');}}
  else{const error=__XenMultitrackRoundTrip.takeError();if(error)setStatus(error)}
 }).catch(()=>{if(live){setProject(blankProject(bridge?.getLiveBpm?.()));setStatus('Browser storage unavailable: this arrangement will not be kept after reload.')}});
  const off=typeof mV==='function'?mV(()=>{setLibRev(v=>v+1);if(inboxWaiting.current){inboxWaiting.current=false;consumeRef.current?.()}}):null;const onAudio=()=>setAudioRev(v=>v+1);audioListeners.add(onAudio);
  const keys=e=>{const t=e.target;if(t!==document.body&&!rootRef.current?.contains(t))return;keyRef.current?.(e)};document.addEventListener('keydown',keys);
  const inbox=()=>consumeRef.current?.();window.addEventListener('xensonar:multitrack-inbox',inbox);const resize=()=>updateRail();window.addEventListener('resize',resize);
  return()=>{live=false;off?.();audioListeners.delete(onAudio);releaseDecoded();document.removeEventListener('keydown',keys);window.removeEventListener('xensonar:multitrack-inbox',inbox);window.removeEventListener('resize',resize);engine.stop();recFinishRef.current?.(true);/* a running recording is kept: it arrives on a new track the next time the room opens */cancelAnimationFrame(rafRef.current);clearTimeout(saveTimer.current);const p=projectRef.current;if(p)saveProject(p).catch(()=>{})}},[]);
 const lib=P.useMemo(()=>materials(),[libRev]);const libMap=P.useMemo(()=>new Map(lib.map(e=>[e.id,e])),[lib]);libRef.current=libMap;
 P.useEffect(()=>{if(!pick&&lib[0])setPick(lib[0].id)},[lib,pick]);
 // Cold preparation: decode what the arrangement uses (once per material) for waveforms and instant play.
 P.useEffect(()=>{if(!project)return;for(const t of project.tracks)for(const c of t.clips){const e=libMap.get(c.materialId);if(e)requestAudio(e)}},[project,libMap]);
 /* ROOM4-07: granular variants are rendered once the hand rests (not on every drag step); a finished variant re-plans its playing voices. */
 P.useEffect(()=>{if(!project)return;const id=setTimeout(()=>prepareVariants(projectRef.current||project,libRef.current,false),320);return()=>clearTimeout(id)},[project,libMap,audioRev]);
 P.useEffect(()=>{const f=()=>{if(engine.playing&&engine.project)engine.update(engine.project,engine.lib)};variantListeners.add(f);return()=>variantListeners.delete(f)},[]);
 const persist=next=>{clearTimeout(saveTimer.current);saveTimer.current=setTimeout(()=>saveProject(next).catch(()=>setStatus('Saving failed; keep this tab open and export a mixdown.')),600)};
 /* ROOM4-11: project <-> shared EQ state. pushEq: project -> live EQ (identity compare, so an unchanged curve costs nothing). The subscription below writes edits back (debounced). */
 const eqSeen=P.useRef(new Map());
 const eqFlatCurve=()=>({a:Array(360).fill(0),b:Array(360).fill(0),morph:0,enabled:true,manualCenters:[]});
 const pushEq=p=>{const seen=eqSeen.current;for(const t of p.tracks){const key=eqKey(t.id);if(t.eq){if(seen.get(key+'p')!==t.eq){__XenEQ.set(key,t.eq);seen.set(key+'p',t.eq);seen.set(key,__XenEQ.get(key))}}else if(seen.get(key+'p')){__XenEQ.set(key,eqFlatCurve());seen.delete(key+'p');seen.set(key,__XenEQ.get(key))}}};
 const keepEq=(target,cur)=>({...target,tracks:target.tracks.map(t=>{const c=cur.tracks.find(x=>x.id===t.id);if(!c)return t;const n={...t};if(c.eq)n.eq=c.eq;else delete n.eq;return n})});// EQ edits are not history steps: undoing something else must not roll them back
 const apply=(next,label)=>{pushEq(next);setProject(next);projectRef.current=next;if(engine.update(next,libRef.current)){const b=engine.restartBeat??engine.position()??cursor;engine.restartBeat=null;void play(b,next)}persist(next);if(label)announce(label)};
 const commit=(next,label)=>{const prev=projectRef.current;if(prev){hist.current.past.push(prev);if(hist.current.past.length>100)hist.current.past.shift();hist.current.future=[]}apply(next,label)};
 const undo=()=>{const h=hist.current;if(!h.past.length)return;h.future.push(projectRef.current);apply(keepEq(h.past.pop(),projectRef.current),'Undo')};
 const redo=()=>{const h=hist.current;if(!h.future.length)return;h.past.push(projectRef.current);apply(keepEq(h.future.pop(),projectRef.current),'Redo')};
 P.useEffect(()=>{let timer=null;const sync=()=>{timer=null;const p=projectRef.current;if(!p)return;let changed=false;const seen=eqSeen.current;
  const tracks=p.tracks.map(t=>{const key=eqKey(t.id),cfg=__XenEQ.get(key);if(cfg===seen.get(key))return t;seen.set(key,cfg);const e=eqFlat(cfg)?undefined:eqPick(cfg);if(!e&&!t.eq)return t;changed=true;seen.set(key+'p',e);const nt={...t};if(e)nt.eq=e;else delete nt.eq;return nt});
  if(changed){const next={...p,tracks};setProject(next);projectRef.current=next;persist(next)}};
  const off=__XenEQ.subscribe(()=>{clearTimeout(timer);timer=setTimeout(sync,250)});return()=>{off();clearTimeout(timer)}},[]);
 /* Inbox: every Send to Multitrack lands on a new track below the existing ones (an empty last track is reused). */
 consumeRef.current=async()=>{let items;try{items=await __XenMultitrackInbox.take()}catch{return}if(!items?.length)return;
  let p=projectRef.current;if(!p){for(const it of items)__XenMultitrackInbox.add(it,{quiet:true}).catch(()=>{});return}
  const lib=new Map(materials().map(e=>[e.id,e])),names=[],later=[];
  for(const it of items){const e=lib.get(it.materialId);if(!e){if((it.tries||0)<40)later.push({...it,tries:(it.tries||0)+1});continue}requestAudio(e);
   const last=p.tracks[p.tracks.length-1],reuse=!!last&&!last.clips.length;
   const fit=it.fit==='tempo'?'tempo':it.sourceBpm>0?'bpm':'natural',base={fit,sourceBpm:fit==='bpm'?it.sourceBpm:undefined},cycle=cycleBeats(e,base,p.bpm);
   const inBeat=fit==='bpm'?Math.max(0,num(it.offsetSec,0)*it.sourceBpm/60):0;
   const clip={id:uid('clip'),materialId:e.id,startBeat:Math.max(0,num(it.startBeat,0)),inBeat,lenBeats:Math.max(1/16,cycle-inBeat),gain:1,fadeIn:0,fadeOut:0,muted:false,...base};
   const label=String(it.name||e.name||'Audio').slice(0,60),t={...(reuse?last:blankTrack(p.tracks.length)),name:label,clips:[clip]};
   p={...p,tracks:reuse?p.tracks.map(x=>x.id===last.id?t:x):[...p.tracks,t]};
   names.push(label+(it.sourceBpm>0?' · '+it.sourceBpm+' BPM'+(it.tempoSource==='detected'?' (detected, beat-aligned)':''):' · original speed'))}
  /* Material not in the library yet: put it back quietly; the next library change retries (no event loop). */
  inboxWaiting.current=later.length>0;for(const it of later)await __XenMultitrackInbox.add(it,{quiet:true}).catch(()=>{});
  if(names.length){commit(p,names.length+' new track(s) arrived');setStatus('Arrived on new tracks: '+names.join(' | '))}};
 const importFiles=async files=>{const list=[...(files||[])].filter(f=>f&&f.size);if(!list.length)return;setBusy(true);
  try{for(let i=0;i<list.length;i++){setStatus('Importing '+(i+1)+'/'+list.length+': '+list[i].name+' (tempo detection) …');await __XenMultitrackInbox.sendBlob({blob:list[i],name:list[i].name,origin:'multitrack-import'})}}
  catch(e){setStatus('Import failed: '+(e?.message||e))}finally{setBusy(false)}};
 /* View changes (track height, zoom) are not edits: no undo entry, no audio re-sync, saved at rest. */
 const applyView=(next,label)=>{setProject(next);projectRef.current=next;persist(next);if(label)announce(label)};
 const applyAxis=(axis,v)=>{const p=projectRef.current,{el,uh,uw}=viewGeo();if(!el||!p)return;
  if(axis==='x'){const T=Math.max(1,totalRef.current),vis=clamp(v.visible,Math.min(1,T),T),z=uw/vis,left=v.start*z;
   if(Math.abs(z-p.zoom)>1e-6*z){pendingScroll.current={left};applyView({...p,zoom:z})}else{el.scrollLeft=left;updateRail()}return}
  const n=Math.max(1,p.tracks.length),vis=clamp(v.visible,Math.min(1,n),n),h=uh/vis,top=v.start*h;
  if(Math.abs(h-p.trackHeight)>1e-6*h){pendingScroll.current={top};applyView({...p,trackHeight:h})}else{el.scrollTop=top;updateRail()}};
 const railDown=(e,axis,mode)=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();const r=(axis==='x'?hrailRef:railRef).current,rect=r.getBoundingClientRect(),c=axis==='x'?e.clientX:e.clientY;let view=axis==='x'?hView():vView();
  if(mode==='jump'){const j=__xenViewportRail.jump(rect,c,view,axis);applyAxis(axis,j);view={...view,start:j.start};mode='move'}
  railDrag.current={axis,st:__xenViewportRail.begin(rect,mode,c,view,axis)};r.setPointerCapture?.(e.pointerId)};
 const railMove=e=>{const d=railDrag.current;if(d)applyAxis(d.axis,__xenViewportRail.move(d.st,d.axis==='x'?e.clientX:e.clientY))};
 const railUp=()=>{railDrag.current=null};
 const railFit=axis=>{const v=axis==='x'?hView():vView();applyAxis(axis,{start:0,visible:v.total});announce(axis==='x'?'Whole arrangement in view':'All tracks in view')};
 /* Keyboard for the bars (they replace the zoom slider): arrows scroll, Shift+arrows or +/- zoom, Home/End, Enter = show all. */
 const railKey=(e,axis)=>{const v=axis==='x'?hView():vView(),unit=axis==='x'?projectRef.current.beatsPerBar:1,k=e.key,back=axis==='x'?'ArrowLeft':'ArrowUp',fwd=axis==='x'?'ArrowRight':'ArrowDown';let nv=null;
  if((k===back||k===fwd)&&!e.shiftKey)nv={start:clamp(v.start+(k===fwd?unit:-unit),0,Math.max(0,v.total-v.visible)),visible:v.visible};
  else if(k==='+'||k==='='||(e.shiftKey&&k===back)){const vis=Math.max(v.minVisible,v.visible/1.25);nv={start:v.start+(v.visible-vis)/2,visible:vis}}
  else if(k==='-'||k==='_'||(e.shiftKey&&k===fwd)){const vis=Math.min(v.total,v.visible*1.25);nv={start:clamp(v.start-(vis-v.visible)/2,0,Math.max(0,v.total-vis)),visible:vis}}
  else if(k==='Home')nv={start:0,visible:v.visible};else if(k==='End')nv={start:Math.max(0,v.total-v.visible),visible:v.visible};else if(k==='Enter'){e.preventDefault();e.stopPropagation();railFit(axis);return}
  if(!nv)return;e.preventDefault();e.stopPropagation();applyAxis(axis,nv)};
 /* Ctrl/Cmd + wheel over the timeline zooms horizontally around the pointer (non-passive listener, room open only). */
 P.useEffect(()=>{const el=scrollRef.current;if(!el)return;const wheel=e=>{if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();const v=hView(),{uw}=viewGeo(),r=el.getBoundingClientRect(),f=clamp((e.clientX-r.left-240)/uw,0,1),at=v.start+f*v.visible,vis=clamp(v.visible*Math.exp(e.deltaY*.0015),v.minVisible,v.total);
  applyAxis('x',{start:clamp(at-f*vis,0,Math.max(0,v.total-vis)),visible:vis})};el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel)},[!!project]);
 if(!project)return u.jsx('div',{className:'xmt',children:'Loading arrangement …'});
 const bpb=project.beatsPerBar,ppb=project.zoom,step=1/project.grid.div;
 const snap=b=>project.grid.snap?Math.round(b/step)*step:Math.round(b*1000)/1000;
 const len=c=>clipLen(c,libMap,project.bpm);const cyc=c=>cycleBeats(libMap.get(c.materialId),c,project.bpm);
 const mapClips=(p,fn)=>({...p,tracks:p.tracks.map(t=>({...t,clips:t.clips.map(c=>fn(c,t))}))});
 const updTrack=(id,patch,label)=>commit({...project,tracks:project.tracks.map(t=>t.id===id?{...t,...patch}:t)},label);
 const updClip=(cid,patch,label)=>commit(mapClips(project,c=>c.id===cid?{...c,...patch}:c),label);
 const findClip=(cid,p=project)=>{for(const t of p.tracks)for(const c of t.clips)if(c.id===cid)return {t,c};return null};
 const removeClip=cid=>{commit({...project,tracks:project.tracks.map(t=>({...t,clips:t.clips.filter(c=>c.id!==cid)}))},'Clip removed');setSel(null);rootRef.current?.focus({preventScroll:true})};
 /* ROOM4-10 markers: named flags on the ruler (beats, so they follow nothing but the grid), part of the project and of undo */
 const markers=project.markers||[];
 const setMarkers=(list,label)=>commit({...project,markers:[...list].sort((a,b)=>a.beat-b.beat)},label);
 const addMarker=beat=>{const b=Math.max(0,Math.round(beat*1000)/1000);if(markers.some(m=>Math.abs(m.beat-b)<1e-6)){announce('There is already a marker here');return}if(markers.length>=256){announce('Marker limit reached');return}setMarkers([...markers,{id:uid('mk'),beat:b,name:'Marker '+(markers.length+1)}],'Marker added at '+fmtPos(b,bpb))};
 const renameMarker=m=>{const n=window.prompt('Marker name',m.name||'');if(n==null)return;setMarkers(markers.map(x=>x.id===m.id?{...x,name:String(n).slice(0,40)}:x),'Marker renamed')};
 const markerMenu=(e,m)=>{const i=markers.findIndex(x=>x.id===m.id),next=markers[i+1];openMenu(e,m.name||'Marker',[{label:'Cursor here',run:()=>setCursor(m.beat)},{label:'Play from here',run:()=>{setCursor(m.beat);void play(m.beat)}},{label:'Loop to the next marker',run:()=>setLoop({start:m.beat,end:next.beat,on:true}),disabled:!next},{label:'Loop from the previous marker',run:()=>setLoop({start:markers[i-1].beat,end:m.beat,on:true}),disabled:i<1},'-',{label:'Rename …',run:()=>renameMarker(m)},{label:'Move to the cursor',run:()=>setMarkers(markers.map(x=>x.id===m.id?{...x,beat:Math.max(0,cursor)}:x),'Marker moved')},{label:'Delete marker',run:()=>setMarkers(markers.filter(x=>x.id!==m.id),'Marker deleted')}])};
/* ROOM4-13 automation lanes: click an empty place to add a point, drag to move it, double-click or right-click a point to delete it */
 const setAutoPts=(p,tid,name,pts)=>({...p,tracks:p.tracks.map(t=>{if(t.id!==tid)return t;const n={...t},a={...(t.auto||{})};if(pts&&pts.length)a[name]=pts;else delete a[name];const clean=sanitizeAuto(a);if(clean)n.auto=clean;else delete n.auto;return n})});
 const autoGeo=(name,w,h)=>{const sp=AUTO[name],lo=sp.log?Math.log(sp.min):sp.min,hi=sp.log?Math.log(sp.max):sp.max,pad=9;
  return {yOf:v=>pad+(1-((sp.log?Math.log(clamp(v,sp.min,sp.max)):clamp(v,sp.min,sp.max))-lo)/(hi-lo))*(h-2*pad),vOf:y=>{const f=clamp(1-(y-pad)/(h-2*pad),0,1),x=lo+f*(hi-lo);return clamp(sp.log?Math.exp(x):x,sp.min,sp.max)}}};
 const autoPointerDown=(e,t,name)=>{if(e.button!==0)return;e.preventDefault();const svg=e.currentTarget,r=svg.getBoundingClientRect(),g=autoGeo(name,r.width,r.height),pts=[...(t.auto?.[name]||[])];
  let idx=e.target.dataset?.i!==undefined?Number(e.target.dataset.i):-1;
  if(idx<0){const b=Math.max(0,snap((e.clientX-r.left)/ppb)),v=g.vOf(e.clientY-r.top);if(pts.some(q=>Math.abs(q.b-b)<1e-6)){idx=pts.findIndex(q=>Math.abs(q.b-b)<1e-6)}else{pts.push({b,v});pts.sort((x,y)=>x.b-y.b);idx=pts.findIndex(q=>q.b===b);const next=setAutoPts(projectRef.current,t.id,name,pts);setProject(next);projectRef.current=next}}
  svg.setPointerCapture(e.pointerId);autoDrag.current={tid:t.id,name,idx,rect:r,base:projectRef.current,start:{x:e.clientX,y:e.clientY},moved:idx>=0&&e.target.dataset?.i===undefined,g}};
 const autoPointerMove=e=>{const d=autoDrag.current;if(!d)return;if(!d.moved&&Math.hypot(e.clientX-d.start.x,e.clientY-d.start.y)<3)return;d.moved=true;
  const base=projectRef.current,tr=base.tracks.find(x=>x.id===d.tid),pts=[...(tr?.auto?.[d.name]||[])];if(!pts[d.idx])return;
  const lo=pts[d.idx-1]?pts[d.idx-1].b+.001:0,hi=pts[d.idx+1]?pts[d.idx+1].b-.001:Infinity,b=clamp(snap((e.clientX-d.rect.left)/ppb),lo,hi);
  pts[d.idx]={b,v:d.g.vOf(e.clientY-d.rect.top)};const next=setAutoPts(base,d.tid,d.name,pts);setProject(next);projectRef.current=next};
 const autoPointerUp=()=>{const d=autoDrag.current;autoDrag.current=null;if(!d)return;const p=projectRef.current;if(p===d.base&&!d.moved)return;projectRef.current=d.base;commit(p,AUTO[d.name].label+' curve edited')};
 /* the pointer is captured by the lane while dragging, so double-click / right-click reach the lane, not the dot: find the nearest dot by distance */
 const autoNearest=(ev,t,name)=>{const r=ev.currentTarget.getBoundingClientRect(),g=autoGeo(name,r.width,r.height),x=ev.clientX-r.left,y=ev.clientY-r.top;let best=-1,bd=12;(t.auto?.[name]||[]).forEach((q,i)=>{const d=Math.hypot(q.b*ppb-x,g.yOf(q.v)-y);if(d<bd){bd=d;best=i}});return best};
 const autoDelete=(t,name,i)=>{const pts=[...(t.auto?.[name]||[])];pts.splice(i,1);commit(setAutoPts(project,t.id,name,pts),pts.length?'Point deleted':AUTO[name].label+' curve removed')};
 const removeClips=ids=>{const set=new Set(ids);commit({...project,tracks:project.tracks.map(t=>({...t,clips:t.clips.filter(c=>!set.has(c.id))}))},ids.length+' clips removed');setSel(null);setGroup([]);rootRef.current?.focus({preventScroll:true})};
 const patchClips=(ids,fn,label)=>{const set=new Set(ids);commit(mapClips(project,c=>set.has(c.id)?{...c,...fn(c)}:c),label)};
 const groupBounds=ids=>{let a=Infinity,b=0;for(const id of ids){const f=findClip(id);if(!f)continue;a=Math.min(a,f.c.startBeat);b=Math.max(b,f.c.startBeat+len(f.c))}return {a:a===Infinity?0:a,b}};
 const duplicateClips=ids=>{const {a,b}=groupBounds(ids),shift=b-a,made=[];const tracks=project.tracks.map(t=>{const add=t.clips.filter(c=>ids.includes(c.id)).map(c=>{const n={...fixedLen(c),id:uid('clip'),startBeat:c.startBeat+shift};made.push(n.id);return n});return add.length?{...t,clips:[...t.clips,...add]}:t});commit({...project,tracks},ids.length+' clips duplicated to '+fmtPos(a+shift,bpb));setGroup(made);setSel(made[0]||null)};
 const copyClips=ids=>{const {a}=groupBounds(ids),items=[];for(const t of project.tracks)for(const c of t.clips)if(ids.includes(c.id))items.push({tid:t.id,clip:{...fixedLen(c)},rel:c.startBeat-a});clipboard={group:items};announce(items.length+' clips copied')};
 const insertClip=(tid,c,label)=>{commit({...project,tracks:project.tracks.map(t=>t.id===tid?{...t,clips:[...t.clips,c]}:t)},label);setSel(c.id);setTrackSel(tid)};
 const fixedLen=c=>({...c,lenBeats:len(c),repeats:undefined});
 /* ROOM4-08: rhythm section as a source. The pattern is rendered once by its authentic owner (same path as the library
    audition), cut to its exact loop length and kept as a normal Material (lossless float WAV) with a known tempo. */
 const rhythm=(()=>{try{const l=__XenRhythmSources.current?.list?.();return l?{ready:true,drums:l.drums||[],bass:l.bass||[]}:{ready:false,drums:[],bass:[]}}catch{return {ready:false,drums:[],bass:[]}}})();
 const addRhythm=async(kind,id)=>{if(busy)return;const owner=__XenRhythmSources.current;if(!owner){setStatus('The rhythm section is not available yet: open the Live Room once.');return}
  setBusy(true);setStatus('Rendering '+(kind==='drum'?'drum pattern':'bass pattern')+' …');
  try{const r=await (kind==='drum'?owner.renderDrum(id):owner.renderBass(id)),sr=r.buffer.sampleRate,loopSec=r.bars*r.beatsPerBar*60/r.bpm;
   const n=Math.max(1,Math.min(r.buffer.length,Math.round(loopSec*sr))),fade=Math.min(n,Math.round(.003*sr));
   const channels=[0,1].map(i=>{const d=r.buffer.getChannelData(Math.min(i,r.buffer.numberOfChannels-1)).slice(0,n);for(let k=0;k<fade;k++)d[n-1-k]*=k/fade;return d});
   let peak=0;for(const d of channels)for(let k=0;k<n;k+=4){const a=d[k]<0?-d[k]:d[k];if(a>peak)peak=a}if(!(peak>1e-5))throw Error('the pattern rendered silent');
   await __XenMultitrackInbox.send({channels,sampleRate:sr,name:(kind==='drum'?'Drums · ':'Bass · ')+r.name,origin:kind==='drum'?'drum-pattern':'bass-pattern',bpm:r.bpm,bars:r.bars*r.beatsPerBar/4,startBeat:snap(cursor)});
   announce((kind==='drum'?'Drum pattern ':'Bass pattern ')+r.name+' added')}
  catch(e){setStatus('Could not add the '+(kind==='drum'?'drum':'bass')+' pattern: '+String(e?.message||e))}finally{setBusy(false)}};
 /* ROOM4-07 warp edits: one factor scales cycle, length and in-point together, so the clip keeps its content. */
 const warpPatch=(c,stretch)=>{const cur=c.stretch>0?c.stretch:1,next=clamp(stretch,.05,20),f=next/cur;return {stretch:Math.abs(next-1)<1e-9?undefined:next,lenBeats:Math.max(1/64,len(c)*f),inBeat:c.inBeat*f,repeats:undefined}};
 const setStretch=(c,stretch,label)=>updClip(c.id,warpPatch(c,stretch),label||('Stretch ×'+(Math.round(clamp(stretch,.05,20)*1000)/1000)));
 const resetWarp=c=>updClip(c.id,{...warpPatch(c,1),warp:undefined,pitch:undefined,reverse:undefined},'Original speed, pitch and direction restored');
 const startBand=e=>{if(e.button!==0||e.target!==e.currentTarget)return;const x0=e.clientX,y0=e.clientY,additive=e.shiftKey||e.ctrlKey||e.metaKey,base=additive?(group.length>1?group:(sel?[sel]:[])):[];let moved=false,r=null;
  const rect=ev=>({l:Math.min(x0,ev.clientX),t:Math.min(y0,ev.clientY),r:Math.max(x0,ev.clientX),b:Math.max(y0,ev.clientY)});
  const move=ev=>{if(!moved&&Math.hypot(ev.clientX-x0,ev.clientY-y0)<4)return;moved=true;r=rect(ev);setBand(r)};
  const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);setBand(null);
   if(!moved){if(!additive){setGroup([]);setSel(null)}return}
   const hit=[...(rootRef.current?.querySelectorAll('[data-clip]')||[])].filter(el=>{const q=el.getBoundingClientRect();return q.right>r.l&&q.left<r.r&&q.bottom>r.t&&q.top<r.b}).map(el=>el.dataset.clip),ids=[...new Set([...base,...hit])];
   setGroup(ids.length>1?ids:[]);setSel(ids[0]||null);announce(ids.length+(ids.length===1?' clip':' clips')+' selected')};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up)};
 const magnet=b=>{const s=snap(b),bar=Math.round(b/bpb)*bpb;return Math.abs(bar-b)*ppb<=8?Math.max(0,bar):s};
 const warpInfo=(c,t)=>{const e=libMap.get(c.materialId),a=e?audio.get(e.id):null;if(!a?.buffer)return '';const st=c.stretch>0?c.stretch:1,ct=pitchCentsOf(c,t),vs=voiceSource(c,t,e,a.buffer,project.bpm);
  const parts=[];if(Math.abs(st-1)>1e-9)parts.push((st>1?'stretched':'compressed')+' ×'+(Math.round(st*1000)/1000));if(c.reverse)parts.push('reversed');if(c.warp==='grain')parts.push('pitch kept');if(Math.abs(ct)>=.5)parts.push((ct>0?'+':'')+Math.round(ct)+' ct');if(vs.state&&vs.state!=='granular')parts.push(vs.state);else if(vs.state==='granular')parts.push('granular ready');return parts.join(' · ')};
 const duplicateClip=cid=>{const f=findClip(cid);if(!f)return;const n={...fixedLen(f.c),id:uid('clip'),startBeat:f.c.startBeat+len(f.c)};insertClip(f.t.id,n,'Clip duplicated to '+fmtPos(n.startBeat,bpb))};
 const splitClip=cid=>{const f=findClip(cid);if(!f)return;const c=fixedLen(f.c),at=cursor;if(!(at>c.startBeat+1e-9&&at<c.startBeat+c.lenBeats-1e-9)){announce('Place the cursor inside the clip to split');return}
  const a={...c,lenBeats:at-c.startBeat,fadeOut:0},b={...c,id:uid('clip'),startBeat:at,inBeat:c.inBeat+(at-c.startBeat),lenBeats:c.startBeat+c.lenBeats-at,fadeIn:0};
  commit({...project,tracks:project.tracks.map(t=>t.id===f.t.id?{...t,clips:t.clips.flatMap(x=>x.id===cid?[a,b]:[x])}:t)},'Clip split at '+fmtPos(at,bpb));setSel(b.id)};
 const copyClip=cid=>{const f=findClip(cid);if(f){clipboard=fixedLen(f.c);announce('Clip copied')}};
 const pasteAt=(tid,beat)=>{if(!clipboard){announce('Clipboard is empty');return}
  if(clipboard.group){const at=snap(beat),made=[];const tracks=project.tracks.map(t=>{const add=clipboard.group.filter(x=>x.tid===t.id||(!project.tracks.some(y=>y.id===x.tid)&&t.id===(tid||project.tracks[0]?.id))).map(x=>{const n={...x.clip,id:uid('clip'),startBeat:Math.max(0,at+x.rel)};made.push(n.id);return n});return add.length?{...t,clips:[...t.clips,...add]}:t});commit({...project,tracks},made.length+' clips pasted at '+fmtPos(at,bpb));setGroup(made);setSel(made[0]||null);return}insertClip(tid,{...clipboard,id:uid('clip'),startBeat:snap(beat)},'Clip pasted at '+fmtPos(snap(beat),bpb))};
 const moveClipToTrack=(cid,tid)=>{const f=findClip(cid);if(!f||f.t.id===tid)return;commit({...project,tracks:project.tracks.map(t=>t.id===f.t.id?{...t,clips:t.clips.filter(c=>c.id!==cid)}:t.id===tid?{...t,clips:[...t.clips,f.c]}:t)},'Clip moved to '+project.tracks.find(t=>t.id===tid)?.name);setTrackSel(tid)};
 const ends=project.tracks.flatMap(t=>t.clips.map(c=>c.startBeat+len(c)));const songEnd=ends.length?Math.max(...ends):0;
 const totalBeats=Math.max(bpb*16,songEnd+bpb*4,project.loop.end+bpb);
 const addTrack=(after)=>{const t=blankTrack(project.tracks.length);const i=after?project.tracks.findIndex(x=>x.id===after)+1:project.tracks.length;const tracks=[...project.tracks];tracks.splice(i,0,t);commit({...project,tracks},'Track added');setTrackSel(t.id);return t.id};
 /* ROOM4-12 bounce / freeze: the track (clips with warp, pitch, EQ and effects) is rendered once at neutral volume and pan; the new track brings its own volume and pan.
    Bounce keeps the original active. Freeze also puts it to sleep (no voices, no DSP) until Unfreeze removes the bounce and wakes it. Nothing is overwritten. */
 const bounceTrack=async(tid,freeze)=>{if(busy)return;const t=project.tracks.find(x=>x.id===tid);if(!t)return;if(isFrozen(project,t)){setStatus('This track is already frozen.');return}
  const live=t.clips.filter(c=>!c.muted&&c.gain>0);if(!live.length){setStatus('Nothing to bounce: the track has no audible clips.');return}
  const from=Math.min(...live.map(c=>c.startBeat)),to=Math.max(...live.map(c=>c.startBeat+len(c)));if(!(to>from)){setStatus('Nothing to bounce.');return}
  if(playing)stop();setBusy(true);setStatus((freeze?'Freezing ':'Bouncing ')+t.name+' …');
  try{const base=projectRef.current,r=await mixdown(base,libMap,from,to,'float32',{only:tid,unity:true,raw:true});if(!(r.peak>1e-5))throw Error('the track renders silent');
   const cur=projectRef.current;if(!cur.tracks.some(x=>x.id===tid))throw Error('the track was removed meanwhile');
   const done=await __XenMultitrackInbox.send({channels:r.channels,sampleRate:r.sampleRate,name:t.name+(freeze?' · frozen':' · bounce'),origin:'multitrack-bounce',bpm:cur.bpm,enqueue:false});
   requestAudio(done.entry);const beats=r.channels[0].length/r.sampleRate*cur.bpm/60,nid=uid('track');
   const clip={id:uid('clip'),materialId:done.entry.id,startBeat:from,inBeat:0,lenBeats:Math.max(1/16,beats),gain:1,fadeIn:0,fadeOut:0,muted:false,fit:'bpm',sourceBpm:cur.bpm};
   const nt={id:nid,name:t.name+(freeze?' ❄':' · bounce'),volume:t.volume,pan:t.pan,mute:freeze?t.mute:false,solo:freeze?t.solo:false,pitch:0,bounceOf:t.id,clips:[clip]};
   const tracks=[];for(const x of cur.tracks){tracks.push(x.id===tid&&freeze?{...x,frozenBy:nid,solo:false}:x);if(x.id===tid)tracks.push(nt)}
   commit({...cur,tracks},(freeze?'Track frozen: ':'Track bounced: ')+t.name+' · '+(Math.round(beats*100)/100)+' beats');setTrackSel(nid);setSel(clip.id);setGroup([])}
  catch(e){setStatus((freeze?'Freeze':'Bounce')+' failed, nothing was changed: '+String(e?.message||e))}finally{setBusy(false)}};
 const unfreezeTrack=tid=>{const orig=project.tracks.find(x=>x.id===tid&&isFrozen(project,x))||project.tracks.find(x=>isFrozen(project,x)&&x.frozenBy===tid);if(!orig)return;const bn=project.tracks.find(x=>x.id===orig.frozenBy);
  if(bn&&!window.confirm('Remove the frozen audio track "'+bn.name+'" and wake up "'+orig.name+'"? Its volume and pan stay.'))return;
  commit({...project,tracks:project.tracks.filter(x=>x.id!==bn?.id).map(x=>{if(x.id!==orig.id)return x;const n={...x,volume:bn?bn.volume:x.volume,pan:bn?bn.pan:x.pan,mute:bn?bn.mute:x.mute,solo:bn?bn.solo:x.solo};delete n.frozenBy;return n})},'Track unfrozen: '+orig.name);setTrackSel(orig.id)};
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
 const stopPlayback=()=>{const b=engine.position();engine.stop();setPlaying(false);cancelAnimationFrame(rafRef.current);if(phRef.current)phRef.current.style.display='none';if(meterRef.current)meterRef.current.style.width='0';announce('Stopped'+(b!==null?' at '+fmtPos(b,bpb):''))};

 /* ROOM4-14 recording */
 const defaultLatency=()=>{const c=__xenMultitrackBridge.current&&engine.ctx;return c?Math.round(((c.baseLatency||0)+(c.outputLatency||0))*1000):0};
 const latencyMs=recLat==null?defaultLatency():recLat;
 const startRec=async()=>{if(busy||recRef.current)return;if(playing)stopPlayback();setStatus('Opening the audio input …');let h=null;
  try{h=await recorder.start(recDevice);recRef.current={h,startBeat:cursor,t0:null};await play(cursor);const t0=engine.segs[0]?.t;if(!(t0>0))throw Error('playback did not start');recRef.current.t0=t0;setRecording(true);setStatus('');announce('Recording from '+fmtPos(cursor,bpb));
   navigator.mediaDevices.enumerateDevices().then(l=>setInputs(l.filter(d=>d.kind==='audioinput'))).catch(()=>{})}
  catch(e){const r=recRef.current;recRef.current=null;if(h)await recorder.finish(h).catch(()=>{});engine.stop();setPlaying(false);setRecording(false);setStatus('Recording could not start: '+String(e?.name==='NotAllowedError'?'microphone access was refused':(e?.message||e)))}};
 const finishRec=async(viaInbox)=>{const r=recRef.current;if(!r)return;recRef.current=null;const pj=projectRef.current;
  try{if(!viaInbox){stopPlayback();setRecording(false)}else engine.stop();
   const cap=await recorder.finish(r.h),ch=recSlice(cap,r.t0||0,latencyMs),secs=ch[0].length/cap.sampleRate;
   if(secs<.05){if(!viaInbox)setStatus('Nothing was recorded.');return}
   let peak=0;for(const d of ch)for(let i=0;i<d.length;i+=8){const a=d[i]<0?-d[i]:d[i];if(a>peak)peak=a}
   const name='Recording '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
   if(viaInbox){await __XenMultitrackInbox.send({channels:ch,sampleRate:cap.sampleRate,name,origin:'multitrack-recording',bpm:pj?.bpm,startBeat:r.startBeat});return}
   const done=await __XenMultitrackInbox.send({channels:ch,sampleRate:cap.sampleRate,name,origin:'multitrack-recording',bpm:pj.bpm,enqueue:false});requestAudio(done.entry);
   const cur=projectRef.current,beats=secs*cur.bpm/60,clip={id:uid('clip'),materialId:done.entry.id,startBeat:r.startBeat,inBeat:0,lenBeats:Math.max(1/16,beats),gain:1,fadeIn:0,fadeOut:0,muted:false,fit:'bpm',sourceBpm:cur.bpm};
   const nt={...blankTrack(cur.tracks.length),name:'Rec '+(cur.tracks.filter(t=>/^Rec \d+/.test(t.name)).length+1),clips:[clip]};
   const at=cur.tracks.findIndex(t=>t.id===trackSel),tracks=[...cur.tracks];tracks.splice(at>=0?at+1:tracks.length,0,nt);
   commit({...cur,tracks},'Recorded '+secs.toFixed(1)+' s on '+nt.name+(peak<1e-4?' (the input was silent)':peak>=.999?' (the input clipped)':''));setTrackSel(nt.id);setSel(clip.id);setGroup([]);setStatus(peak<1e-4?'The input was silent: check the input device and its level.':'')}
  catch(e){if(!viaInbox)setStatus('Saving the recording failed: '+String(e?.message||e))}};
 recFinishRef.current=finishRec;
 const stop=()=>{if(recRef.current){void finishRec(false);return}stopPlayback()};

 const exportMix=async(range)=>{setBusy(true);setStatus('Rendering mixdown …');try{const [a,b]=range==='loop'?[project.loop.start,project.loop.end]:[0,songEnd];if(!(b>a))throw Error('Nothing to render.');
   const r=await mixdown(project,libMap,a,b,exportFormat);const url=URL.createObjectURL(r.blob),link=document.createElement('a');link.href=url;link.download=(project.name||'arrangement').replace(/[^\w\- .]+/g,'_')+(range==='loop'?'-loop':'')+'.wav';
   document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
   setStatus('Mixdown ready: '+r.seconds.toFixed(1)+' s, peak '+(r.peak>0?(20*Math.log10(r.peak)).toFixed(1)+' dBFS':'silent')+(r.peak>1?' (clipped: lower Master or 32-bit float)':''));announce('Mixdown exported')}
  catch(e){setStatus('Mixdown failed: '+(e?.message||e))}finally{setBusy(false)}};
  /* EDIT-RETURN-01: immutable clip render for the existing Wave Editor. Preserve
     arrangement placement, edit only the chosen clip, never mutate shared source. */
  const openClipInWave=async (track,clip)=>{
   if(busy){setStatus('Finish the current import or export before opening the Wave Editor.');return}
   if(__XenMultitrackRoundTrip.status().active){setStatus('A clip is still open in the Wave Editor ('+(__XenMultitrackRoundTrip.status().label||'Multitrack clip')+'). Return to the Forge and Apply & Return, or close the Wave Editor, first.');return}
   setBusy(true);
   try{
    const projectNow=projectRef.current,liveTrack=projectNow.tracks.find(t=>t.id===track.id);
    const liveClip=liveTrack?.clips.find(c=>c.id===clip.id);
    if(!liveClip)throw Error('Selected clip is no longer available.');
    const entry=libRef.current.get(liveClip.materialId);
    if(!entry)throw Error('Selected clip has no source material.');
    const decoder=requestAudio(entry);await decoder?.promise;
    if(decoder?.status!=='ready'||!decoder.buffer)throw Error('Source audio could not be decoded.');
    const duration=clipLen(liveClip,libRef.current,projectNow.bpm)*60/projectNow.bpm;
    if(!Number.isFinite(duration)||duration<.004||duration>300)throw Error('Clip edit needs between 4 ms and 5 minutes of audio.');
    const sr=48000,frames=Math.ceil(duration*sr),count=Math.max(1,Math.min(2,decoder.buffer.numberOfChannels));
    const Offline=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;
    const ctx=new Offline(count,frames,sr),clean={...liveClip,gain:1,fadeIn:0,fadeOut:0,muted:false};
    {const row=requestVariant(variantPlan(clean,null,entry,decoder.buffer,projectNow.bpm),decoder.buffer);if(row?.promise)await row.promise}
    planVoice(ctx,ctx.destination,clean,entry,decoder.buffer,liveClip.startBeat,liveClip.startBeat+clipLen(liveClip,libRef.current,projectNow.bpm),0,duration,60/projectNow.bpm,true,true);
    const rendered=await ctx.startRendering();
    const channels=Array.from({length:count},(_,i)=>rendered.getChannelData(i));
    const encoder=globalThis.__XenWaveCoreW01;if(!encoder?.encodeWav)throw Error('Wave Editor WAV encoder unavailable.');
    const bytes=encoder.encodeWav({channels,sampleRate:sr,frames:rendered.length},{format:'float32'});
    const name=String(entry.name||'Multitrack clip');
    const file=new File([bytes],name.replace(/[\\/:*?"<>|]/g,'_')+' · Multitrack edit.wav',{type:'audio/wav'});
    clearTimeout(saveTimer.current);await saveProject(projectNow);
    engine.stop();setPlaying(false);
    await __XenMultitrackRoundTrip.open(file,{clipId:liveClip.id,trackId:liveTrack.id,materialId:liveClip.materialId,identity:__XenMultitrackRoundTrip.clipIdentity(liveClip),startBeat:liveClip.startBeat,bpm:projectNow.bpm,name,label:'\u2702 Multitrack Clip \u00b7 Track '+(projectNow.tracks.indexOf(liveTrack)+1)+' \u00b7 Bar '+(Math.floor(liveClip.startBeat/Math.max(.5,projectNow.beatsPerBar||4))+1)});
   }catch(error){setStatus('Wave Editor handoff failed: '+String(error?.message||error));}
   finally{setBusy(false)}
  };
 /* ---- context menus ---- */
 const openMenu=(e,label,items)=>{e.preventDefault();e.stopPropagation();const r=e.currentTarget?.getBoundingClientRect?.();setMenu({x:e.clientX||r?.left||40,y:e.clientY||r?.bottom||40,label,items})};
 const beatFromEvent=(e,el)=>{const r=el.getBoundingClientRect();return Math.max(0,(e.clientX-r.left)/ppb)};
 const setFit=(c,fit,sourceBpm=c.sourceBpm,label)=>{const nc={...c,fit,sourceBpm};updClip(c.id,{fit,sourceBpm,lenBeats:cycleBeats(libMap.get(c.materialId),nc,project.bpm),repeats:undefined},label)};
 const fitItems=c=>[
  {label:'Original speed (real audio length)'+(c.fit==='natural'?' ✓':''),run:()=>setFit(c,'natural',c.sourceBpm,'Original speed')},
  {label:'Fit bars × beats to tempo'+(c.fit==='tempo'?' ✓':''),run:()=>setFit(c,'tempo',c.sourceBpm,'Fitted to tempo')},
  c.sourceBpm?{label:'Fit source tempo '+c.sourceBpm+' BPM'+(c.fit==='bpm'?' ✓':''),run:()=>setFit(c,'bpm',c.sourceBpm,'Source tempo '+c.sourceBpm)}:null,
  c.sourceBpm?{label:'Source tempo ×2 (octave)',run:()=>setFit(c,'bpm',Math.round(c.sourceBpm*200)/100,'Source tempo '+Math.round(c.sourceBpm*200)/100)}:null,
  c.sourceBpm?{label:'Source tempo ÷2 (octave)',run:()=>setFit(c,'bpm',Math.round(c.sourceBpm*50)/100,'Source tempo '+Math.round(c.sourceBpm*50)/100)}:null,
  {label:'Set source tempo …',run:()=>{const v=Number(window.prompt('Source tempo of this audio (BPM):',String(c.sourceBpm||project.bpm)));if(v>10&&v<999)setFit(c,'bpm',v,'Source tempo '+v)}}].filter(Boolean);
 const clipMenu=(e,t,c)=>{if(inGroup(c.id)){const ids=selIds();openMenu(e,ids.length+' clips',[{label:'Duplicate '+ids.length+' clips',key:'Ctrl+D',run:()=>duplicateClips(ids)},{label:'Copy '+ids.length+' clips',key:'Ctrl+C',run:()=>copyClips(ids)},{label:'Mute / unmute all',key:'M',run:()=>{const all=ids.every(id=>findClip(id)?.c.muted);patchClips(ids,()=>({muted:!all}),all?'Clips unmuted':'Clips muted')}},
   {label:'Stretch all ×2',run:()=>patchClips(ids,c=>warpPatch(c,(c.stretch||1)*2),'Stretched ×2')},{label:'Compress all ×½',run:()=>patchClips(ids,c=>warpPatch(c,(c.stretch||1)/2),'Compressed ×½')},{label:'Reset warp on all',run:()=>patchClips(ids,c=>({...warpPatch(c,1),warp:undefined,pitch:undefined,reverse:undefined}),'Warp reset')},'-',
   {label:'Set loop to the selection',run:()=>{const {a,b}=groupBounds(ids);setLoop({start:a,end:b,on:true})}},{label:'Select none',run:()=>setGroup([])},'-',{label:'Delete '+ids.length+' clips',key:'Del',run:()=>removeClips(ids)}]);return}
  setSel(c.id);setTrackSel(t.id);const others=project.tracks.filter(x=>x.id!==t.id);openMenu(e,'Clip',[
  {label:'Duplicate',key:'Ctrl+D',run:()=>duplicateClip(c.id)},{label:'Split at cursor',key:'S',run:()=>splitClip(c.id),disabled:!(cursor>c.startBeat&&cursor<c.startBeat+len(c))},
   {label:'Copy',key:'Ctrl+C',run:()=>copyClip(c.id)},
   {label:'Move to now (cursor)',run:()=>updClip(c.id,{startBeat:Math.max(0,snap(cursor))},'Clip moved to '+fmtPos(Math.max(0,snap(cursor)),bpb))},
   {label:'Open in WAV Editor…',icon:'wave-editor',run:()=>void openClipInWave(t,c),disabled:busy},
   {label:c.muted?'Unmute clip':'Mute clip',key:'M',run:()=>updClip(c.id,{muted:!c.muted},c.muted?'Clip unmuted':'Clip muted')},'-',
  {label:'Loop material ×2',run:()=>updClip(c.id,{lenBeats:len(c)*2,repeats:undefined},'Length '+len(c)*2+' beats')},{label:'Length = one material cycle',run:()=>updClip(c.id,{lenBeats:cyc(c),repeats:undefined},'Length reset')},
  ...fitItems(c),'-',
  {label:'Stretch ×2 (twice as long)',run:()=>setStretch(c,(c.stretch||1)*2)},{label:'Compress ×½ (half as long)',run:()=>setStretch(c,(c.stretch||1)/2)},
  {label:'Stretch to whole bars',run:()=>{const L=len(c),bars=Math.max(1,Math.round(L/bpb));setStretch(c,(c.stretch||1)*bars*bpb/L,'Stretched to '+bars+' bar'+(bars>1?'s':''))},disabled:Math.abs(len(c)/bpb-Math.round(len(c)/bpb))<1e-6},
  {label:c.warp==='grain'?'Warp: tape (pitch follows speed)':'Warp: granular (keep the pitch)',run:()=>updClip(c.id,{warp:c.warp==='grain'?undefined:'grain'},c.warp==='grain'?'Tape warp':'Granular warp: pitch kept')},
  {label:c.reverse?'Play forwards again':'Reverse (play backwards)',run:()=>updClip(c.id,{reverse:c.reverse?undefined:true},c.reverse?'Clip plays forwards':'Clip reversed')},
  {label:'Normalize gain (peak to −1 dB)',run:()=>{const pk=audio.get(c.materialId)?.peaks;let m=0;if(pk)for(const v of pk)if(v>m)m=v;if(!(m>0)){setStatus('Nothing to normalize yet (audio still loading or silent).');return}const g=clamp(.891/m,0,2);updClip(c.id,{gain:g},'Clip gain '+g.toFixed(2)+(g>=2?' (limit reached)':''))}},
  {label:'Reset stretch, pitch and direction (original)',run:()=>resetWarp(c),disabled:!(c.stretch||c.warp||c.pitch||c.reverse)},'-',
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
  isFrozen(project,t)||project.tracks.some(x=>isFrozen(project,x)&&x.frozenBy===t.id)?{label:'Unfreeze track (restore the original)',run:()=>unfreezeTrack(t.id)}:{label:'Freeze track (render it, put it to sleep)',run:()=>void bounceTrack(t.id,true),disabled:busy||!t.clips.length},
  {label:'Bounce to a new track (keep the original)',run:()=>void bounceTrack(t.id,false),disabled:busy||!t.clips.length||isFrozen(project,t)},'-',
  {label:'Duplicate track',run:()=>duplicateTrack(t.id)},{label:'Move up',run:()=>moveTrack(t.id,-1)},{label:'Move down',run:()=>moveTrack(t.id,1)},{label:'Add track below',run:()=>addTrack(t.id)},'-',
  {label:'Delete track',run:()=>removeTrack(t.id)}])};
 const rulerMenu=e=>{const beat=snap(beatFromEvent(e,e.currentTarget));openMenu(e,'Timeline',[
  {label:'Set cursor here',run:()=>setCursor(beat)},{label:'Play from here',run:()=>{setCursor(beat);void play(beat)}},{label:'Add marker here',key:'B',run:()=>addMarker(beat)},'-',
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
  if(mod&&k==='a'){e.preventDefault();const all=project.tracks.flatMap(t=>t.clips.map(c=>c.id));setGroup(all);setSel(all[0]||null);announce(all.length+' clips selected');return}
  if(k==='b'&&!mod){addMarker(cursor);return}
  if((e.key==='['||e.key===']')){const ms=project.markers||[];const to=e.key===']'?ms.find(m=>m.beat>cursor+1e-6):[...ms].reverse().find(m=>m.beat<cursor-1e-6);if(to){setCursor(to.beat);announce('Marker '+(to.name||fmtPos(to.beat,bpb)))}return}
  if(e.key==='Escape'&&group.length){setGroup([]);return}
  if(group.length>1){const ids=selIds();
   if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeClips(ids)}
   else if(mod&&k==='d'){e.preventDefault();duplicateClips(ids)}
   else if(mod&&k==='c'){e.preventDefault();copyClips(ids)}
   else if(k==='m'&&!mod){const all=ids.every(id=>findClip(id)?.c.muted);patchClips(ids,()=>({muted:!all}),all?'Clips unmuted':'Clips muted')}
   else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const d=(e.shiftKey?bpb:step)*(e.key==='ArrowLeft'?-1:1),{a}=groupBounds(ids),dd=Math.max(-a,d);patchClips(ids,c=>({startBeat:Math.max(0,c.startBeat+dd)}),ids.length+' clips moved '+(dd>=0?'+':'')+dd+' beats')}
   return}
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
 const pointerDown=(e,t,c)=>{if(e.button!==0)return;e.stopPropagation();setTrackSel(t.id);const edge=e.target.dataset?.edge||'move';
  if(e.shiftKey||e.ctrlKey||e.metaKey){/* toggle in the multi-selection */const cur=group.length>1?group:(sel?[sel]:[]),has=cur.includes(c.id),next=has?cur.filter(x=>x!==c.id):[...cur,c.id];setGroup(next);setSel(next.includes(c.id)?c.id:(next[0]||null));announce(next.length+' clips selected');return}
  if(!inGroup(c.id)){setGroup([]);setSel(c.id)}else setSel(c.id);
  e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:c.id,from:t.id,mode:edge,x:e.clientX,start:c.startBeat,len:len(c),inBeat:c.inBeat,copy:e.altKey&&edge==='move',moved:false,base:projectRef.current,target:t.id,gids:inGroup(c.id)&&edge==='move'?selIds():null}};
 const pointerMove=e=>{const d=drag.current;if(!d)return;if(!d.moved&&Math.abs(e.clientX-d.x)<3&&d.mode!=='move')return;const db=(e.clientX-d.x)/ppb;const base=d.base;
  const f=findClip(d.id,base);if(!f)return;let c={...fixedLen(f.c)};const mb=cyc(c);
  if(d.gids){/* group move: every selected clip shifts by the same snapped amount on its own track; Alt copies the whole group */
   if(Math.abs(e.clientX-d.x)<3&&!d.moved)return;d.moved=true;const ids=d.gids,minStart=Math.min(...ids.map(id=>findClip(id,base)?.c.startBeat??Infinity)),dd=Math.max(-minStart,snap(d.start+db)-d.start);
   if(d.copy&&!d.cmap){d.cmap={};for(const id of ids)d.cmap[id]=uid('clip')}
   const tracks=base.tracks.map(t=>{const mine=t.clips.filter(x=>ids.includes(x.id));if(!mine.length)return t;
    const moved=mine.map(x=>({...fixedLen(x),startBeat:Math.max(0,x.startBeat+dd),id:d.copy?d.cmap[x.id]:x.id}));
    return {...t,clips:d.copy?[...t.clips,...moved]:t.clips.map(x=>ids.includes(x.id)?moved.find(m=>m.id===x.id):x)}});
   const next={...base,tracks};setProject(next);projectRef.current=next;d.dd=dd;return}
  if(d.mode==='move'){const tgt=trackAt(e.clientX,e.clientY)||d.target;if(Math.abs(e.clientX-d.x)<3&&tgt===d.from&&!d.moved)return;d.moved=true;d.target=tgt;setDropTrack(tgt!==d.from?tgt:null);
   c.startBeat=Math.max(0,snap(d.start+db));if(d.copy)c={...c,id:d.cid||(d.cid=uid('clip'))};
   const tracks=base.tracks.map(t=>{let clips=t.clips;if(!d.copy&&t.id===d.from)clips=clips.filter(x=>x.id!==d.id);if(t.id===tgt)clips=[...clips.filter(x=>x.id!==c.id),c];return {...t,clips}});
   const next={...base,tracks};setProject(next);projectRef.current=next;return}
  d.moved=true;
  if(d.mode==='sr'||d.mode==='sl'){// ROOM4-07: lower half of an edge stretches / compresses (snaps to the grid, bar lines attract)
   const s0=f.c.stretch>0?f.c.stretch:1,end=d.start+d.len;let L=d.mode==='sr'?magnet(end+db)-d.start:end-clamp(magnet(d.start+db),0,end-step);
   L=Math.max(step,L);const st=clamp(s0*L/d.len,.05,20),fk=st/s0;L=d.len*fk;c.lenBeats=L;c.inBeat=d.inBeat*fk;c.stretch=Math.abs(st-1)<1e-9?undefined:st;if(d.mode==='sl')c.startBeat=Math.max(0,end-L);
   const next=mapClips(base,x=>x.id===d.id?c:x);setProject(next);projectRef.current=next;return}
  if(d.mode==='r')c.lenBeats=Math.max(step,snap(d.start+d.len+db)-d.start);
  else{const end=d.start+d.len,ns=clamp(snap(d.start+db),0,end-step);c.startBeat=ns;c.lenBeats=end-ns;c.inBeat=((d.inBeat+(ns-d.start))%mb+mb)%mb}
  const next=mapClips(base,x=>x.id===d.id?c:x);setProject(next);projectRef.current=next};
 const pointerUp=()=>{const d=drag.current;drag.current=null;setDropTrack(null);if(!d||!d.moved)return;const p=projectRef.current;projectRef.current=d.base;
  if(d.gids){commit(p,d.gids.length+' clips '+(d.copy?'copied ':'moved ')+((d.dd||0)>=0?'+':'')+(Math.round((d.dd||0)*1000)/1000)+' beats');if(d.copy&&d.cmap){const nid=d.gids.map(i=>d.cmap[i]);setGroup(nid);setSel(nid[0])}return}
  const f=findClip(d.copy?d.cid:d.id,p);commit(p,(d.mode==='sr'||d.mode==='sl')?'Clip '+((f?.c.stretch||1)>=(findClip(d.id,d.base)?.c.stretch||1)?'stretched':'compressed')+' to '+(f?Math.round(len(f.c)*1000)/1000:0)+' beats (×'+(Math.round((f?.c.stretch||1)*1000)/1000)+(f?.c.warp==='grain'?', pitch kept':', tape')+')':d.mode!=='move'?'Clip length '+(f?len(f.c):0)+' beats':(d.copy?'Clip copied to ':'Clip moved to ')+fmtPos(f?.c.startBeat??0,bpb)+(f&&f.t.id!==d.from?' on '+f.t.name:''));if(d.copy&&f)setSel(f.c.id)};
 /* ---- render ---- */
 totalRef.current=totalBeats;
 /* Ruler: beats when there is room, otherwise every k-th bar (labels never collide when zoomed far out). */
 const barEvery=Math.max(1,Math.ceil(26/Math.max(1e-6,bpb*ppb))),barStarts=[];for(let k=0;k*bpb<=totalBeats+1e-9;k++)barStarts.push(k*bpb);
 const ticks=[];for(let b=0;b<=totalBeats;b+=1){const isBar=Math.abs(b/bpb-Math.round(b/bpb))<1e-9;if(!isBar&&ppb<10)continue;if(isBar&&Math.round(b/bpb)%barEvery)continue;
  ticks.push(u.jsx('div',{className:'tick'+(isBar?' barl':''),style:{left:b*ppb},children:isBar?u.jsx('span',{children:Math.round(b/bpb)+1}):null},'t'+b))}
 if(!Number.isInteger(bpb))for(const b of barStarts){if(Math.abs(b-Math.round(b))<1e-9)continue;const k=Math.round(b/bpb);if(k%barEvery)continue;ticks.push(u.jsx('div',{className:'tick barl',style:{left:b*ppb},children:u.jsx('span',{children:k+1})},'tb'+k))}
 const th=project.trackHeight,tier=th>=58?'':th>=34?' compact':' mini',nT=project.tracks.length;
 const laneWidth=totalBeats*ppb,selF=sel?findClip(sel):null,selT=project.tracks.find(t=>t.id===trackSel)||null;
 const clipView=(t,ti,c)=>{const e=libMap.get(c.materialId),a=e?audio.get(e.id):null,L=len(c),mb=cyc(c),w=Math.max(10,L*ppb);
  const bad=!e||a?.status==='error',state=!e?'source missing in library':a?.status==='error'?'cannot decode: '+a.error:a?.status==='ready'?'':'loading audio';
  const reps=[];for(let k=Math.ceil((c.inBeat+1e-9)/mb);(k*mb-c.inBeat)<L-1e-9&&reps.length<64;k++){const x=(k*mb-c.inBeat)*ppb;if(x>0)reps.push(u.jsx('span',{className:'rep',style:{left:x}},'r'+k))}
  const name=e?(e.name||'material'):'missing material',color=COLORS[ti%COLORS.length],wi=warpInfo(c,t),st=c.stretch>0?c.stretch:1,tag=(Math.abs(st-1)>1e-9?' ⇔×'+(Math.round(st*100)/100):'')+(c.warp==='grain'?' ≈':'')+(Math.abs(pitchCentsOf(c,t))>=.5?' ♪':'')+(c.reverse?' ◀':'');
  return u.jsxs('button',{type:'button','data-clip':c.id,className:'clip'+(bad?' bad':'')+(c.muted?' muted':''),role:'option','aria-selected':group.length>1?group.includes(c.id):sel===c.id,style:{left:c.startBeat*ppb,width:w,'--c':color},
   title:name+(state?' — '+state:'')+(wi?'\n'+wi:'')+'\nDrag: move (also to another track) · Alt+drag: copy · upper half of an edge: trim / loop · lower half of an edge: stretch / compress · right-click: options','aria-label':name+', '+t.name+', starts at '+fmtPos(c.startBeat,bpb)+', '+L+' beats'+(c.muted?', muted':'')+(state?', '+state:''),
   onPointerDown:ev=>pointerDown(ev,t,c),onPointerMove:pointerMove,onPointerUp:pointerUp,onPointerCancel:pointerUp,onContextMenu:ev=>clipMenu(ev,t,c),onFocus:()=>{setSel(c.id);setTrackSel(t.id)},
   children:[u.jsx(ClipWave,{peaks:a?.peaks??null,inBeat:c.inBeat,len:L,mb,ppb,color,rev:!!c.reverse}),u.jsx('span',{className:'nm',children:name+tag+(state?' · '+state:'')}),reps,
    u.jsx('span',{className:'eg l','data-edge':'l','aria-hidden':'true'}),u.jsx('span',{className:'eg r','data-edge':'r','aria-hidden':'true'}),
    u.jsx('span',{className:'eg s l','data-edge':'sl','aria-hidden':'true'}),u.jsx('span',{className:'eg s r','data-edge':'sr','aria-hidden':'true'})]},c.id)};
 const tapeInfo=c=>{const e=libMap.get(c.materialId),a=e?audio.get(e.id):null;if(!a?.buffer)return a?.status==='error'?'Cannot decode: '+a.error:'';
  const r=regionOf(e,a.buffer),R=r.len/(cyc(c)*60/project.bpm),x='×'+R.toFixed(3),how=c.warp==='grain'?(Math.abs(R-1)>.001?'speed '+x+', pitch kept (granular)':'original speed'):(Math.abs(R-1)>.01?'tape '+x+' (pitch follows)':'original speed');
  if(c.fit==='natural')return 'Real length '+naturalSec(e).toFixed(2)+' s · '+how;if(c.fit==='bpm')return 'Tempo '+c.sourceBpm+' → '+project.bpm+' BPM · '+how+' · stored audio unchanged';
  return 'Material '+(Number(e.bpm)||'?')+' BPM fitted to '+project.bpm+' BPM · '+how};
 const numIn=(label,value,min,max,stepv,onv,w)=>u.jsxs('label',{title:TIP[label],children:[label,u.jsx('input',{type:'number',min,max,step:stepv,value:Math.round(value*1000)/1000,style:w?{width:w}:null,onChange:e=>onv(num(e.target.value,value))})]});
 const TIP={Tempo:'Project tempo in BPM (20–400). Clips in tempo-fit or source-tempo mode follow it by playback rate only.',
  Length:'Clip length in beats. Longer than the material: the material loops.',In:'Offset into the material in beats (where the clip starts reading).',
  Gain:'Clip gain (0–2, 1 = unchanged).',Stretch:'Stretch (>1) or compress (<1) this clip. 1 = original. Same as dragging the lower half of a clip edge. Nothing is rewritten: reset brings the original back.',
  'Pitch ct':'Granular pitch offset of this clip in cents (100 = one 12-EDO semitone, any value in between is fine). Independent of the speed.','Track pitch ct':'Granular pitch offset for every clip on this track, in cents.','Echo beats':'Echo time in beats (0 = off). Any value works: 0.5 = eighth, 0.75 = dotted eighth, 0.333 = triplet. It follows the project tempo.','Room s':'Length of the shared reverb room in seconds (one room for all tracks).','Fade in':'Fade-in length in beats.','Fade out':'Fade-out length in beats.'};
 return u.jsxs('div',{className:'xmt',ref:rootRef,tabIndex:-1,children:[
  u.jsx('div',{className:'sr','aria-live':'polite',role:'status',children:say}),
  band?u.jsx('div',{className:'band',style:{left:band.l,top:band.t,width:band.r-band.l,height:band.b-band.t}}):null,
  u.jsx(Menu,{menu,close:()=>{setMenu(null);rootRef.current?.querySelector('[data-clip="'+sel+'"]')?.focus({preventScroll:true})}}),
  u.jsxs('div',{className:'row',style:{justifyContent:'space-between'},children:[
   u.jsxs('div',{children:[u.jsx('h2',{children:'IV · MULTITRACK'}),u.jsx('div',{className:'muted',children:'Arrange harvested material on tracks. Live Room and Mycelium sleep while you are here. Right-click anything for options.'})]}),
   u.jsx('input',{type:'text','aria-label':'Arrangement name',title:'Name of this arrangement (used for the mixdown file name)',value:project.name,onChange:e=>commit({...project,name:e.target.value.slice(0,100)})})]}),
  u.jsxs('div',{className:'bar row',children:[
   u.jsx('button',{type:'button',onClick:playing?stop:()=>void play(),title:'Play from the cursor / stop · Space','aria-label':playing?'Stop (Space)':'Play from cursor (Space)',children:playing?'■ Stop':'▶ Play'}),
   u.jsx('button',{type:'button',onClick:()=>{setCursor(0);announce('Cursor to start')},title:'Cursor to the start · Home','aria-label':'Cursor to start (Home)',children:'⏮'}),
   u.jsx('button',{type:'button','aria-pressed':metro,onClick:toggleMetro,title:'Metronome: a click on every beat, a higher one on the bar line. It is only for you: never in the mixdown.','data-xmt-metro':'true',children:'♩ Click'}),
   u.jsx('button',{type:'button','aria-pressed':countIn,disabled:!metro,onClick:toggleCountIn,title:'Count-in: one bar of clicks before playback starts (needs the metronome)','data-xmt-countin':'true',children:'1-bar count-in'}),
   u.jsx('button',{type:'button',onClick:()=>addMarker(cursor),title:'Add a marker at the cursor · B','data-xmt-addmarker':'true',children:'⚑ Marker'}),
   u.jsx('button',{type:'button','aria-pressed':project.loop.on,onClick:()=>setLoop({on:!project.loop.on}),title:'Loop '+fmtPos(project.loop.start,bpb)+' – '+fmtPos(project.loop.end,bpb)+' (right-click the ruler to set it)',children:'⟳ Loop'}),
   u.jsx('button',{type:'button','aria-pressed':recording,onClick:recording?stop:()=>void startRec(),title:recording?'Stop recording and put it on a new track':'Record from an audio input (microphone or line in) from the cursor while the arrangement plays. Use headphones: the input is not monitored. The recording is kept as lossless float audio.','data-xmt-rec':'true',style:recording?{background:'#dc2626',borderColor:'#dc2626',color:'#fff'}:null,disabled:!recording&&busy,children:recording?'■ Stop rec':'● Rec'}),
   u.jsxs('select',{value:recDevice,disabled:recording,'aria-label':'Recording input',title:'Audio input for recording (names appear after the first permission)','data-xmt-rec-input':'true',onChange:e=>{setRecDevice(e.target.value);try{localStorage.setItem('xensonar.mt.recdev',e.target.value)}catch{}},children:[u.jsx('option',{value:'',children:'Default input'}),...inputs.filter(d=>d.deviceId&&d.deviceId!=='default').map(d=>u.jsx('option',{value:d.deviceId,children:d.label||'Input '+d.deviceId.slice(0,6)},d.deviceId))]}),
   u.jsxs('label',{title:'Round-trip latency in milliseconds (output + input). The recording is moved earlier by this amount so that it lines up with what you heard. Start with the preset and nudge it by ear.',children:['Latency ms',u.jsx('input',{type:'number',min:0,max:500,step:1,value:latencyMs,'data-xmt-rec-latency':'true',onChange:e=>{const v=clamp(num(e.target.value,0),0,500);setRecLat(v);try{localStorage.setItem('xensonar.mt.reclat',String(v))}catch{}}})]}),
   u.jsx('span',{className:'muted',children:'Cursor '+fmtPos(cursor,bpb)}),
   numIn('Tempo',project.bpm,20,400,.1,v=>commit(retempo(project,clamp(v,20,400)))),
   u.jsxs('label',{title:'Free: 3, 5, 7, 3.5 … beats per bar',children:['Beats/bar',u.jsx('input',{type:'number',min:.5,max:64,step:.5,value:bpb,onChange:e=>commit({...project,beatsPerBar:clamp(num(e.target.value,bpb),.5,64)})})]}),
   u.jsxs('label',{title:'Grid = 1/N beat, N free (2, 3, 5, 7 …)',children:['Grid 1/',u.jsx('input',{type:'number',min:1,max:64,step:1,value:project.grid.div,onChange:e=>commit({...project,grid:{...project.grid,div:clamp(Math.round(num(e.target.value,4)),1,64)}})}),'beat']}),
   u.jsx('button',{type:'button','aria-pressed':project.grid.snap,title:'Snap clips, cursor and edges to the grid',onClick:()=>commit({...project,grid:{...project.grid,snap:!project.grid.snap}},project.grid.snap?'Snap off':'Snap on'),children:'Snap'}),
      u.jsx('button',{type:'button',onClick:undo,title:'Undo · Ctrl+Z','aria-label':'Undo (Ctrl+Z)',children:'↶'}),u.jsx('button',{type:'button',onClick:redo,title:'Redo · Ctrl+Shift+Z','aria-label':'Redo (Ctrl+Shift+Z)',children:'↷'}),
   u.jsx('button',{type:'button','aria-pressed':listView,title:'Show all clips as an editable table (keyboard and screen reader friendly)',onClick:()=>setListView(v=>!v),children:'List view'})]}),
  u.jsxs('div',{className:'bar row',children:[
   u.jsxs('label',{children:['Material',u.jsxs('select',{value:pick,onChange:e=>setPick(e.target.value),title:'Material from the library to place · double-click a track to insert it there','aria-label':'Material from the library',children:[
    lib.length?null:u.jsx('option',{value:'',children:'Library empty: send material from the Forge or Loop-Rec first'}),
    ...lib.map(e=>u.jsx('option',{value:e.id,children:(e.name||e.id)+' · '+matBeats(e)+' beats'+(e.bpm?' · '+e.bpm+' BPM':'')+(e.sessionTake?' · take':'')},e.id))]})]}),
   u.jsx('button',{type:'button',onClick:()=>addClipAt(trackSel,cursor),title:'Place the chosen material on the selected track at the cursor',disabled:!lib.length,children:'+ Clip at cursor'}),u.jsx('button',{type:'button',onClick:()=>addTrack(trackSel),title:'Add an empty track below the selected one',children:'+ Track'}),
   /* ROOM4-08: drum and bass patterns as direct sources (rendered by their own owners, no recording step) */
   u.jsxs('select',{value:'',disabled:busy||!rhythm.drums.length,'aria-label':'Add a drum pattern as a new track','data-xmt-add-drums':'true',title:rhythm.ready?'Render a drum pattern from the Live Room library and lay it on a new track at the cursor. It follows the project tempo; the pattern itself is not changed.':'Open the Live Room once so the drum library is available.',onChange:e=>{const id=e.target.value;if(id)void addRhythm('drum',id)},children:[u.jsx('option',{value:'',children:'+ Drums …'}),...rhythm.drums.map(d=>u.jsx('option',{value:d.id,children:d.name},d.id))]}),
   u.jsxs('select',{value:'',disabled:busy||!rhythm.bass.length,'aria-label':'Add a bass pattern as a new track','data-xmt-add-bass':'true',title:rhythm.ready?'Render a bass pattern or saved bass clip with the current bass sound and lay it on a new track at the cursor.':'Open the Live Room once so the bass library is available.',onChange:e=>{const id=e.target.value;if(id)void addRhythm('bass',id)},children:[u.jsx('option',{value:'',children:'+ Bass …'}),...rhythm.bass.map(d=>u.jsx('option',{value:d.id,children:d.name},d.id))]}),

   u.jsx('button',{type:'button',disabled:busy,onClick:()=>importRef.current?.click(),title:'Import audio files: each becomes a new track; tempo is detected and the clip is beat-aligned and fitted to the session tempo by playback rate (the file itself is kept unchanged).',children:'⤒ Import audio'}),
   u.jsx('input',{type:'file',ref:importRef,accept:'audio/*,.wav,.mp3,.ogg,.flac,.m4a,.aac',multiple:true,style:{display:'none'},onChange:e=>{const f=e.target.files;void importFiles(f);e.target.value=''}}),
   u.jsx('span',{style:{flex:1}}),
   u.jsxs('label',{children:['Master',u.jsx('input',{type:'range',min:0,max:1.5,step:.01,value:project.master.volume,title:'Master volume of the arrangement','aria-label':'Master volume',onChange:e=>commit({...project,master:{volume:num(e.target.value,.9)}})})]}),
   u.jsx('div',{className:'meter','aria-hidden':'true',children:u.jsx('i',{ref:meterRef})}),
   u.jsxs('select',{value:exportFormat,title:'Mixdown format: 16-bit with TPDF dither, or 32-bit float (lossless headroom)',onChange:e=>setExportFormat(e.target.value),'aria-label':'Mixdown format',children:[u.jsx('option',{value:'pcm16',children:'WAV 16-bit (dither)'}),u.jsx('option',{value:'float32',children:'WAV 32-bit float'})]}),
   u.jsx('button',{type:'button',disabled:busy||!songEnd,title:'Render the song (or the loop range when Loop is on) offline to a 48 kHz WAV file',onClick:()=>exportMix(project.loop.on?'loop':'song'),children:busy?'Rendering …':'⤓ Mixdown'+(project.loop.on?' (loop)':'')})]}),
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
    u.jsx('td',{children:u.jsx('button',{type:'button','aria-pressed':c.muted,onClick:()=>updClip(c.id,{muted:!c.muted}),title:'Mute this clip · M',children:'Mute'})}),
    u.jsx('td',{children:u.jsx('button',{type:'button',onClick:()=>removeClip(c.id),title:'Remove this clip (the material stays in the library) · Delete','aria-label':'Remove clip',children:'Remove'})})]},c.id)))]})})}):null,
  u.jsxs('div',{className:'twrap',children:[u.jsxs('div',{className:'tracks',id:'xmt-tracks',ref:scrollRef,onScroll:updateRail,role:'listbox','aria-label':'Arrangement timeline. Arrows move the selected clip (Shift: a bar, Up/Down: other track); S split; Ctrl+D duplicate; Ctrl+C/V copy and paste; M mute; Delete removes; +/- loop length; L loop; Space plays; context menu key opens options.',children:[
   u.jsxs('div',{className:'trk rr',ref:rulerRef,children:[u.jsx('div',{className:'hdr',title:'Bars · click the ruler to set the cursor · right-click it for loop and export',children:u.jsx('span',{className:'muted',children:'Bars · right-click: loop, export'})}),
    u.jsxs('div',{className:'ruler',title:'Click: set the cursor · right-click: play from here, loop start/end, mixdown',style:{width:laneWidth},onClick:e=>{const b=snap(beatFromEvent(e,e.currentTarget));setCursor(b);announce('Cursor '+fmtPos(b,bpb))},onContextMenu:rulerMenu,children:[...ticks,...markers.map(m=>u.jsx('button',{type:'button',className:'mk',style:{left:m.beat*ppb},title:(m.name||'Marker')+' · '+fmtPos(m.beat,bpb)+'\nClick: cursor here · double-click: rename · right-click: options · keys [ and ] jump, B adds',onClick:ev=>{ev.stopPropagation();setCursor(m.beat);announce('Marker '+(m.name||fmtPos(m.beat,bpb)))},onDoubleClick:ev=>{ev.stopPropagation();renameMarker(m)},onContextMenu:ev=>{ev.stopPropagation();markerMenu(ev,m)},children:u.jsx('span',{children:m.name||''})},m.id)),
     u.jsx('div',{className:'loopr'+(project.loop.on?'':' off'),style:{left:project.loop.start*ppb,width:Math.max(2,(project.loop.end-project.loop.start)*ppb)},title:'Loop region'}),u.jsx('div',{className:'cur',style:{left:cursor*ppb}})]})]}),
   ...project.tracks.flatMap((t,ti)=>[u.jsxs('div',{className:'trk'+tier+(isFrozen(project,t)?' frozen':''),style:{height:th},onClick:()=>setTrackSel(t.id),children:[
    u.jsxs('div',{className:'hdr',onContextMenu:e=>trackMenu(e,t),style:{boxShadow:'inset 3px 0 0 '+(trackSel===t.id?'#fde68a':COLORS[ti%COLORS.length]+'55')},children:[u.jsx('span',{className:'tn',children:t.name+(t.eq?' · EQ':'')+(isFrozen(project,t)?' · ❄ frozen':'')}),
     u.jsxs('div',{className:'row',children:[u.jsx('input',{type:'text','aria-label':'Track name',title:'Track name',value:t.name,onChange:e=>updTrack(t.id,{name:e.target.value.slice(0,60)})}),
      u.jsx('button',{type:'button','aria-pressed':t.mute,title:'Mute track','aria-label':'Mute '+t.name,onClick:()=>updTrack(t.id,{mute:!t.mute},(t.mute?'Unmuted ':'Muted ')+t.name),children:'M'}),
      u.jsx('button',{type:'button','aria-pressed':t.solo,title:'Solo track','aria-label':'Solo '+t.name,onClick:()=>updTrack(t.id,{solo:!t.solo},(t.solo?'Solo off ':'Solo ')+t.name),children:'S'}),
      u.jsx('button',{type:'button','aria-label':'Track options for '+t.name,title:'Track options (also: right-click the track header)',onClick:e=>trackMenu(e,t),children:'⋯'})]}),
     u.jsxs('div',{className:'row',children:[u.jsxs('label',{children:['Vol',u.jsx('input',{type:'range',min:0,max:1.5,step:.01,value:t.volume,title:'Track volume','aria-label':'Volume '+t.name,onChange:e=>updTrack(t.id,{volume:num(e.target.value,t.volume)})})]}),
      u.jsxs('label',{children:['Pan',u.jsx('input',{type:'range',min:-1,max:1,step:.01,value:t.pan,title:'Track pan, left to right (Reset mixer: right-click the header)','aria-label':'Pan '+t.name,onChange:e=>updTrack(t.id,{pan:num(e.target.value,t.pan)})})]}),
      u.jsxs('label',{title:TIP['Track pitch ct'],children:['Pitch',u.jsx('input',{type:'number',min:-2400,max:2400,step:1,value:Math.round(num(t.pitch,0)),style:{width:54},'aria-label':'Pitch of '+t.name+' in cents',onChange:e=>updTrack(t.id,{pitch:clamp(num(e.target.value,0),-2400,2400)})})]})]})]}),
    u.jsx('div',{className:'lane'+(dropTrack===t.id?' drop':''),'data-lane':t.id,style:{width:laneWidth},onContextMenu:e=>laneMenu(e,t),onPointerDown:startBand,
     onDoubleClick:e=>{if(e.target===e.currentTarget)addClipAt(t.id,beatFromEvent(e,e.currentTarget))},children:t.clips.map(c=>clipView(t,ti,c))})]},t.id),
    autoLane&&autoLane.tid===t.id?(()=>{const name=autoLane.name,sp=AUTO[name],pts=t.auto?.[name]||[],H=96,g=autoGeo(name,laneWidth,H),W=Math.max(1,laneWidth);
     const line=pts.length?[`0,${g.yOf(pts[0].v)}`,...pts.map(q=>`${q.b*ppb},${g.yOf(q.v)}`),`${W},${g.yOf(pts[pts.length-1].v)}`].join(' '):'';
     const readout=v=>sp.log?Math.round(v)+' Hz':(Math.round(v*100)/100)+(name==='volume'?' ×':'');
     return u.jsxs('div',{className:'trk auto',style:{height:H},'data-xmt-auto-row':t.id+'|'+name,children:[
      u.jsxs('div',{className:'hdr',children:[u.jsx('span',{className:'tn',children:t.name+' · '+sp.label}),u.jsxs('div',{className:'row',children:[u.jsx('span',{className:'muted',children:'at cursor '+readout(autoValue(pts,sp,cursor))}),
       u.jsx('button',{type:'button',disabled:!pts.length,onClick:()=>commit(setAutoPts(project,t.id,name,[]),sp.label+' curve removed'),title:'Remove this curve; the knob is in charge again',children:'Clear'}),u.jsx('button',{type:'button',onClick:()=>setAutoLane(null),title:'Hide the lane (the curve stays)',children:'Hide'})]})]}),
      u.jsxs('svg',{className:'autol','data-xmt-auto-svg':'true',width:W,height:H,style:{width:laneWidth,height:H,display:'block',touchAction:'none',cursor:'crosshair'},onPointerDown:ev=>autoPointerDown(ev,t,name),onPointerMove:autoPointerMove,onPointerUp:autoPointerUp,onPointerCancel:autoPointerUp,onDoubleClick:ev=>{const i=autoNearest(ev,t,name);if(i>=0){ev.stopPropagation();autoDelete(t,name,i)}},onContextMenu:ev=>{ev.preventDefault();const i=autoNearest(ev,t,name);if(i>=0)autoDelete(t,name,i)},children:[
       u.jsx('line',{x1:0,x2:W,y1:g.yOf(sp.def),y2:g.yOf(sp.def),stroke:'#57534e','stroke-dasharray':'4 4'}),pts.length?u.jsx('polyline',{points:line,fill:'none',stroke:'#38bdf8','stroke-width':2}):u.jsx('text',{x:10,y:H/2,fill:'#78716c','font-size':12,children:'Click here to add the first point · drag to move · double-click a point to delete'}),
       ...pts.map((q,i)=>u.jsx('circle',{cx:q.b*ppb,cy:g.yOf(q.v),r:5,fill:'#fde68a',stroke:'#0c0a09','data-i':i,style:{cursor:'grab'},children:u.jsx('title',{children:'beat '+(Math.round(q.b*100)/100)+' · '+readout(q.v)})},i))]})]},t.id+'|auto')})():null]).filter(Boolean),
   u.jsx('div',{className:'ph',ref:phRef})]}),
   u.jsxs('div',{className:'rail v',ref:railRef,role:'scrollbar',tabIndex:0,'aria-orientation':'vertical','aria-controls':'xmt-tracks','aria-valuemin':0,'aria-valuemax':nT,'aria-valuenow':Math.round((scrollRef.current?.scrollTop??0)/th),
    'aria-label':'Track overview: drag the window to scroll, drag its top or bottom edge to change how many tracks are in view, click to jump, double-click shows all tracks. Keys: arrows scroll, Shift+arrows or plus/minus zoom, Enter shows all.',
    title:'Tracks · drag = scroll · drag top/bottom edge = how many tracks are in view (all … one) · click = jump · double-click = all tracks',onPointerDown:e=>railDown(e,'y','jump'),onPointerMove:railMove,onPointerUp:railUp,onPointerCancel:railUp,onDoubleClick:()=>railFit('y'),onKeyDown:e=>railKey(e,'y'),children:[
    ...project.tracks.map((t,i,a)=>u.jsx('i',{className:t.clips.length?'full':'',style:{top:(i/a.length*100)+'%',height:'calc('+(100/a.length)+'% - '+(a.length>40?0:2)+'px)',background:COLORS[i%COLORS.length]}},t.id)),
    u.jsxs('div',{className:'thumb',ref:thumbRef,onPointerDown:e=>railDown(e,'y','move'),children:[u.jsx('b',{className:'t',onPointerDown:e=>railDown(e,'y','resize-start')}),u.jsx('b',{className:'e',onPointerDown:e=>railDown(e,'y','resize-end')})]})]}),
   u.jsxs('div',{className:'rail h',ref:hrailRef,role:'scrollbar',tabIndex:0,'aria-orientation':'horizontal','aria-controls':'xmt-tracks','aria-valuemin':0,'aria-valuemax':Math.round(totalBeats),'aria-valuenow':Math.round((scrollRef.current?.scrollLeft??0)/ppb),
    'aria-label':'Timeline overview: drag the window to scroll, drag its left or right edge to zoom, click to jump, double-click shows the whole arrangement. Keys: arrows scroll by a bar, Shift+arrows or plus/minus zoom, Enter shows all.',
    title:'Timeline · drag = scroll · drag left/right edge = zoom · click = jump · double-click = whole arrangement · Ctrl+wheel over the tracks = zoom',onPointerDown:e=>railDown(e,'x','jump'),onPointerMove:railMove,onPointerUp:railUp,onPointerCancel:railUp,onDoubleClick:()=>railFit('x'),onKeyDown:e=>railKey(e,'x'),children:[
    ...barStarts.filter((b,k)=>k%Math.max(1,Math.ceil(barStarts.length/64))===0).map(b=>u.jsx('s',{style:{left:(b/totalBeats*100)+'%'}},'b'+b)),
    project.loop.on?u.jsx('em',{style:{left:(project.loop.start/totalBeats*100)+'%',width:((project.loop.end-project.loop.start)/totalBeats*100)+'%'}}):null,
    ...project.tracks.flatMap((t,ti)=>t.clips.slice(0,64).map(c=>u.jsx('i',{style:{left:(c.startBeat/totalBeats*100)+'%',width:'max(2px,'+(len(c)/totalBeats*100)+'%)',top:'calc(3px + '+(ti/nT)+' * (100% - 6px))',height:'max(2px,calc((100% - 6px) / '+nT+' - 1px))',background:COLORS[ti%COLORS.length]}},c.id))),
    u.jsxs('div',{className:'thumb',ref:hthumbRef,onPointerDown:e=>railDown(e,'x','move'),children:[u.jsx('b',{className:'l',onPointerDown:e=>railDown(e,'x','resize-start')}),u.jsx('b',{className:'r',onPointerDown:e=>railDown(e,'x','resize-end')})]})]})]}),
  group.length>1?u.jsxs('div',{className:'bar row','data-xmt-group':String(group.length),children:[u.jsx('strong',{children:group.length+' clips selected'}),u.jsx('span',{className:'muted',children:'drag one to move all · Del removes · Ctrl+D duplicates · Ctrl+C copies · Esc clears'}),
   u.jsx('button',{type:'button',onClick:()=>{const ids=selIds(),all=ids.every(id=>findClip(id)?.c.muted);patchClips(ids,()=>({muted:!all}),all?'Clips unmuted':'Clips muted')},title:'Mute / unmute all selected · M',children:'Mute'}),
   u.jsx('button',{type:'button',onClick:()=>duplicateClips(selIds()),title:'Duplicate the whole selection after itself · Ctrl+D',children:'Duplicate'}),
   u.jsx('button',{type:'button',onClick:()=>copyClips(selIds()),title:'Copy · Ctrl+C, paste at the cursor with Ctrl+V',children:'Copy'}),
   u.jsx('button',{type:'button',onClick:()=>{const {a,b}=groupBounds(selIds());setLoop({start:a,end:b,on:true})},title:'Loop exactly the selected region',children:'Loop it'}),
   u.jsx('button',{type:'button',onClick:()=>removeClips(selIds()),title:'Remove all selected clips (the material stays in the library) · Delete',children:'Remove'}),
   u.jsx('button',{type:'button',onClick:()=>setGroup([]),children:'Select none'})]}):
  selF?u.jsxs('div',{className:'bar row',children:[u.jsx('strong',{children:libMap.get(selF.c.materialId)?.name||'missing material'}),
   u.jsx('span',{className:'muted',children:'on '+selF.t.name+' · starts '+fmtPos(selF.c.startBeat,bpb)}),
   u.jsx('span',{className:'muted','data-clip-source-info':'true',title:'Source audio of this clip (channels, sample rate, length). Bit depth is not shown: the decoded audio is internal floating point.',children:sourceInfo(audio.get(selF.c.materialId)?.buffer)}),
   numIn('Length',len(selF.c),step,1e5,step,v=>updClip(selF.c.id,{lenBeats:Math.max(step,v),repeats:undefined}),70),
   numIn('In',selF.c.inBeat,0,1e5,step,v=>updClip(selF.c.id,{inBeat:Math.max(0,v)})),
   numIn('Gain',selF.c.gain,0,2,.05,v=>updClip(selF.c.id,{gain:clamp(v,0,2)})),
   numIn('Fade in',selF.c.fadeIn,0,256,step,v=>updClip(selF.c.id,{fadeIn:Math.max(0,v)})),
   numIn('Fade out',selF.c.fadeOut,0,256,step,v=>updClip(selF.c.id,{fadeOut:Math.max(0,v)})),
   u.jsx('button',{type:'button','aria-pressed':selF.c.muted,title:'Mute this clip · M',onClick:()=>updClip(selF.c.id,{muted:!selF.c.muted}),children:'Mute'}),
   u.jsxs('label',{title:'How the clip is brought to the project tempo. All modes only change the playback rate (tape); the stored audio stays untouched, so the way back is lossless.',children:['Fit',u.jsxs('select',{value:selF.c.fit,onChange:e=>setFit(selF.c,e.target.value,selF.c.sourceBpm,'Fit changed'),children:[
    u.jsx('option',{value:'natural',children:'Original speed'}),u.jsx('option',{value:'tempo',children:'Bars × beats'}),selF.c.sourceBpm?u.jsx('option',{value:'bpm',children:'Source tempo '+selF.c.sourceBpm+' BPM'}):null]})]}),
   numIn('Stretch',selF.c.stretch>0?selF.c.stretch:1,.05,20,.01,v=>{if(v>0)setStretch(selF.c,v)},64),
   u.jsxs('label',{title:'Tape: speed and pitch move together (like a tape machine). Granular: the pitch stays where it is while the clip is stretched, compressed or fitted to the tempo; rendered in the background, the stored audio is never changed.',children:['Warp',u.jsxs('select',{value:selF.c.warp==='grain'?'grain':'tape','aria-label':'Warp mode',onChange:e=>updClip(selF.c.id,{warp:e.target.value==='grain'?'grain':undefined},e.target.value==='grain'?'Granular warp: pitch kept':'Tape warp'),children:[u.jsx('option',{value:'tape',children:'Tape'}),u.jsx('option',{value:'grain',children:'Granular (keep pitch)'})]})]}),
   numIn('Pitch ct',num(selF.c.pitch,0),-2400,2400,1,v=>updClip(selF.c.id,{pitch:Math.abs(v)<.5?undefined:clamp(v,-2400,2400)}),64),
   u.jsx('button',{type:'button',disabled:!(selF.c.stretch||selF.c.warp||selF.c.pitch||selF.c.reverse),onClick:()=>resetWarp(selF.c),title:'Back to the original: stretch 1, tape, pitch 0, forwards. The source audio was never changed.',children:'Reset warp'}),
   u.jsx('span',{className:'muted','data-clip-warp-info':'true',children:[tapeInfo(selF.c),warpInfo(selF.c,selF.t)].filter(Boolean).join(' — ')}),
   u.jsx('button',{type:'button',onClick:()=>removeClip(selF.c.id),title:'Remove this clip (the material stays in the library) · Delete',children:'Remove clip'})]}):null,
  /* ROOM4-09: effects of the selected track */
  selT?(()=>{const f=fxOf(selT),sh=fxShape(f),set=patch=>updTrack(selT.id,{fx:sanitizeFx({...f,...patch})});
   const sl=(label,title,value,min,max,stepv,on,show)=>u.jsxs('label',{title,children:[label,u.jsx('input',{type:'range',min,max,step:stepv,value,'aria-label':label+' of '+selT.name,style:{width:86},onChange:e=>on(num(e.target.value,value))}),u.jsx('span',{className:'muted',style:{minWidth:46},children:show})]});
   const lcV=f.lowCut>0?Math.log(f.lowCut/20)/Math.log(100):0,hcV=Math.log(f.highCut/200)/Math.log(100);
   return u.jsxs('div',{className:'bar row','data-xmt-fx':selT.id,children:[u.jsx('strong',{title:'Effects of the selected track, after its volume, pan and EQ. Playback and mixdown use the same chain.',children:'FX · '+selT.name}),
    sl('Low cut','Removes everything below this frequency (off at the left end).',lcV,0,1,.005,v=>set({lowCut:v<=.004?0:Math.round(20*Math.pow(100,v))}),f.lowCut>0?f.lowCut+' Hz':'off'),
    sl('High cut','Removes everything above this frequency (off at the right end).',hcV,0,1,.005,v=>set({highCut:v>=.996?20000:Math.round(200*Math.pow(100,v))}),f.highCut<20000?(f.highCut>=1000?(f.highCut/1000).toFixed(1)+' kHz':f.highCut+' Hz'):'off'),
    sl('Drive','Soft saturation. More drive is denser and a little louder.',f.drive,0,1,.01,v=>set({drive:v}),f.drive>0?Math.round(f.drive*100)+'%':'off'),
    numIn('Echo beats',f.echoBeats,0,16,.125,v=>set({echoBeats:Math.max(0,v)}),60),
    sl('Feedback','How long the echo repeats.',f.echoFb,0,.92,.01,v=>set({echoFb:v}),Math.round(f.echoFb*100)+'%'),
    sl('Echo mix','Level of the echo.',f.echoMix,0,1,.01,v=>set({echoMix:v}),Math.round(f.echoMix*100)+'%'),
    sl('Reverb','Send into the shared room.',f.reverb,0,1,.01,v=>set({reverb:v}),f.reverb>0?Math.round(f.reverb*100)+'%':'off'),
    numIn('Room s',num(project.master.reverbSize,2.2),.2,8,.1,v=>commit({...project,master:{...project.master,reverbSize:clamp(v,.2,8)}}),56),
    u.jsx('button',{type:'button',disabled:!sh,onClick:()=>updTrack(selT.id,{fx:undefined},'Effects off on '+selT.name),title:'Remove all effects from this track',children:'FX off'}),
    u.jsxs('label',{title:'Draw a curve over time for one parameter of this track. Volume is a multiplier on the fader; the other parameters take over their knob while a curve exists. Click the lane to add points.',children:['Automate',u.jsxs('select',{'data-xmt-auto-select':'true','aria-label':'Automation parameter of '+selT.name,value:autoLane&&autoLane.tid===selT.id?autoLane.name:'',onChange:e=>setAutoLane(e.target.value?{tid:selT.id,name:e.target.value}:null),children:[u.jsx('option',{value:'',children:'—'}),...Object.keys(AUTO).map(k=>u.jsx('option',{value:k,children:AUTO[k].label+(hasAuto(selT,k)?' ●':'')},k))]})]}),
    u.jsx('button',{type:'button','data-xmt-eq':selT.id,'aria-pressed':eqOpen===selT.id,onClick:()=>setEqOpen(eqOpen===selT.id?null:selT.id),title:'Open the XenSonar EQ for this track: draw two curves (A/B), morph between them, adaptive or raster bands. It is saved in the arrangement.',children:'EQ'+(selT.eq?' ●':'')})]})})():null,
  eqOpen&&project.tracks.some(t=>t.id===eqOpen)?ao.createPortal(u.jsx('div',{className:'xen-eq-flyout','data-xmt-eq-panel':eqOpen,style:{left:Math.max(12,window.innerWidth-(eqWide?732:392)),top:90,width:Math.min(eqWide?720:380,window.innerWidth-24),maxHeight:window.innerHeight-110,'--xen-eq-canvas-height':'150px'},children:u.jsx(__XenEQPanel,{sourceKey:eqKey(eqOpen),owner:project.tracks.find(t=>t.id===eqOpen)?.name||'Track',onClose:()=>setEqOpen(null),expanded:eqWide,setExpanded:setEqWide},eqKey(eqOpen))}),document.body):null,
  u.jsx('div',{className:'muted',style:{marginTop:6},children:'Drag clips anywhere (also onto another track; Alt = copy), drag clip edges to trim, double-click a lane to add the chosen material. Keys: Space play/stop · L loop · S split · Ctrl+D duplicate · Ctrl+C/V · M mute · ↑/↓ other track · Delete · Ctrl+Z undo.'})]});
}
return Object.freeze({XenMultitrackRoom});
})()
