const __XenSongKinds=Object.freeze(['grid','material','rootFollow','drum','bass']);
/* P7.38 — per-session Grid Profiles; tune ID and tile instance ID are separate. */
const __xenGridUid=()=> 'grid-profile-'+(globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2));
const __xenGridKey=e=>e?.kind==='grid'?('grid\0'+(e.instanceId?.startsWith('legacy:')?e.id:(e.instanceId||e.id))):(e.kind+'\0'+e.id);
const __xenGridCompatibleMode=(tuningId,mode)=>typeof Ka==='function'&&!Ka(tuningId).some(m=>m.value===mode)?'chromatic':mode||'chromatic';
const __xenGridModeName=id=>(typeof yF!=='undefined'?yF:[]).find(m=>m.value===id)?.label||String(id||'Chromatic');
function __xenGridProfile(raw){
 const v=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const degrees=a=>[...new Set((Array.isArray(a)?a:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<256))].sort((a,b)=>a-b);
 const offsets=Array.isArray(v.mainStepOffsets)?v.mainStepOffsets.slice(0,256).map(x=>Number.isFinite(Number(x))?Math.max(-120,Math.min(120,Number(x))):0):[];
 const bc=__XenBassGrid.normalize(v.bassConfig);
 return {modeId:typeof v.modeId==='string'&&v.modeId.length<80?v.modeId:'chromatic',mainMutedDegrees:degrees(v.mainMutedDegrees),mainStepOffsets:offsets,
   bassEnabled:v.bassEnabled===true,bassConfig:{...bc,bassUsesGrid:v.bassConfig?.bassUsesGrid!==false}};
}
function __xenValidateQuickItems(value){
 if(!Array.isArray(value))throw Error('Invalid quick-access references.');
 // LR8: session inventory is independent of the pinned-library allowance.
 const takes=value.filter(e=>e?.kind==='material'&&String(e.id).startsWith('loop-rec-')).length;
 if(value.length-takes>240||takes>2000)throw Error('A constellation supports 240 pinned references and 2000 Session Takes.');
 const seen=new Set(),out=[];
 for(const entry of value){
  if(!entry||Object.getPrototypeOf(entry)!==Object.prototype||!['grid','material','rootFollow','drum','bass'].includes(entry.kind)||typeof entry.id!=='string'||!entry.id.trim()||entry.id.length>1024||typeof entry.name!=='string'||entry.name.length>1024)throw Error('Invalid quick-access reference.');
  if(entry.kind==='grid'){
   if(Object.keys(entry).some(k=>!['kind','id','name','instanceId','gridProfile'].includes(k)))throw Error('Invalid grid profile fields.');
   const instanceId=typeof entry.instanceId==='string'&&entry.instanceId.length>0&&entry.instanceId.length<160?entry.instanceId:'legacy:'+entry.id;
   const key='grid\0'+instanceId;if(seen.has(key))continue;seen.add(key);
   out.push({kind:'grid',id:entry.id,name:entry.name,instanceId,gridProfile:entry.gridProfile?__xenGridProfile(entry.gridProfile):null});
  }else{
   if(Object.keys(entry).some(k=>!['kind','id','name'].includes(k)))throw Error('Invalid quick-access reference.');
   const key=entry.kind+'\0'+entry.id;if(seen.has(key))continue;seen.add(key);out.push({kind:entry.kind,id:entry.id,name:entry.name});
  }
 }
 return out;
}

/* P7.39.XX: Quickrack display preference, not a session parameter or a library edit.
   Both the Meta Menu and the live Quickrack use the same tiny external store. */
const __XenQuickDisplay=(()=>{
 const KEY='xensonar.quickrack.display-mode.v1',listeners=new Set();
 let mode='symbol';
 try{if(localStorage.getItem(KEY)==='title')mode='title'}catch{}
 return Object.freeze({
  snapshot:()=>mode,
  subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),
  set(next){if(next!=='symbol'&&next!=='title'||next===mode)return false;
   mode=next;try{localStorage.setItem(KEY,next)}catch{}
   for(const fn of listeners)fn();return true}
 });
})();
/* Preserve the title-as-identity view while using the musical metric for grid tunings.
   Bohlen-Pierce and Just Intonation are named systems; do not reduce BP to 13EDT. */
function __xenQuickShortTitle(entry){
 const item=typeof entry==='string'?{name:entry}:entry||{};
 const name=String(item.name||'').trim();
 if(item.kind==='material'&&item.id?.startsWith('loop-rec-')&&/^Loop \d+$/.test(name))return 'L'+name.slice(5);
 if(item.kind==='grid'){
  const id=String(item.id||'').trim().toLowerCase();
  if(id==='bp'||/^bohlen\b.*pierce\b/i.test(name)||/^BP(?:$|[\s·:—-])/i.test(name))return 'BP';
  if(id==='ji'||/^just\s+intonation\b/i.test(name)||/^JI(?:$|[\s·:—-])/i.test(name))return 'JI';
  // Respect the Grid Workbench classification: customizing steps converts EDO/EDT
  // into CDO/CDT even if the original tuning ID still refers to equal division.
  const metric=name.match(/^(\d{1,3})[\s\u2010-\u2015-]*(edo|edt|cdo|cdt)\b/i)
   ||id.match(/^(\d{1,3})(edo|edt|cdo|cdt)$/i);
  if(metric){
   const family=metric[2].toLowerCase();
   return metric[1]+family;
  }
 }
 return Array.from(name).slice(0,5).join('')||'—';
}
/* N3.3: tuning is the tile identity; mute pattern is secondary information.
   If a saved mask differs from its named pattern, do not mislabel it as that mode. */
const __XenGridPatternAbbrev=Object.freeze({
 chromatic:'CHR',ionian:'ION',dorian:'DOR',ukr_dorian:'UDR',phrygian:'PHR',
 lydian:'LYD',mixolydian:'MIX',aeolian:'AEO',harmonic_minor:'HMI',
 locrian:'LOC',bp_lambda:'BPL',bp_major:'BPD',bp_minor:'BPM'
});
function __xenQuickGridPatternShort(entry){
 if(entry?.kind!=='grid')return '';
 const mode=entry.gridProfile?.modeId||'chromatic';
 if(!Object.hasOwn(__XenGridPatternAbbrev,mode))return 'CUS';
 if(typeof Ka==='function'&&!Ka(entry.id).some(item=>item.value===mode))return 'CUS';
 const assigned=entry.gridProfile?.mainMutedDegrees;
 if(Array.isArray(assigned)&&typeof xF==='function'){
  const expected=xF(mode,entry.id),a=[...new Set(assigned)].sort((x,y)=>x-y);
  if(a.length!==expected.length||a.some((degree,i)=>degree!==expected[i]))return 'CUS';
 }
 return __XenGridPatternAbbrev[mode];
}
/* Emoji text presentation is a preference, not a second icon identity.
   VS15 requests the monochrome/text glyph where the installed font has one. */
const __xenMuteTextIcon=Object.freeze({grid:'🪜\uFE0E',material:'📀\uFE0E',rootFollow:'♬',drum:'🥁\uFE0E',bass:'🎸\uFE0E'});
/* END Quickrack display preference */
function __QuickColumns({columns,render}){
 return u.jsx('div',{className:'xen-quick-grid',children:__XenSongKinds.map(kind=>u.jsx('div',{
  className:'xen-quick-column','data-xen-quick-column':kind,
  children:(columns[kind]||[]).map((entry,index)=>render(entry,index,kind))
 },kind))});
}

/* P4C2 UI: semantic menu adapters, shared selections and source octave offsets. */
const __XenOctaves=(()=>{
 let state={particle:0,wave:0,keyboard:0};const listeners=new Set();
 try{const saved=JSON.parse(localStorage.getItem('xensonar.source-octaves.v1')||'{}');for(const k of Object.keys(state))if(Number.isInteger(saved[k]))state[k]=Math.max(-3,Math.min(3,saved[k]));}catch{}
 return {snapshot:()=>state,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),factor:lane=>2**(state[lane]??0),set(lane,value){if(!(lane in state))return;state={...state,[lane]:Math.max(-3,Math.min(3,value))};if(typeof __XenNodalSurfaces!=='undefined')__XenNodalSurfaces.refreshPitch?.();try{localStorage.setItem('xensonar.source-octaves.v1',JSON.stringify(state))}catch{}for(const fn of listeners)fn();}};
})();
function __SourceOctave({lane,title}){
 const state=P.useSyncExternalStore(__XenOctaves.subscribe,__XenOctaves.snapshot,__XenOctaves.snapshot),v=state[lane];
 return u.jsxs('span',{className:'xen-source-octave',children:[u.jsx('span',{children:'Oct'}),u.jsx('button',{type:'button',title:title+' one octave down','aria-label':title+' octave down',disabled:v<=-3,onClick:()=>__XenOctaves.set(lane,v-1),children:'−'}),u.jsx('output',{'aria-label':title+' octave',children:v>0?'+'+v:String(v)}),u.jsx('button',{type:'button',title:title+' one octave up','aria-label':title+' octave up',disabled:v>=3,onClick:()=>__XenOctaves.set(lane,v+1),children:'+'})]});
}
/* P7.38.21: Material Track layering is a separate live state, NOT a new
   primary selection. Each audio source owns its own timing metadata and node.
   All streams share a bar reference but never share a loop duration/phase. */
const __XenMaterialLayers=(()=>{
 let ids=Object.freeze([]),order=Object.freeze([]),observedPrimary=null,listeners=new Set();
 const emit=()=>{for(const f of listeners)f()};
 const touch=id=>{if(id)order=Object.freeze([...order.filter(x=>x!==id),id])};
 const oldestFirst=(primaryId,primaryMuted=false)=>{
  const audible=[...(primaryId&&!primaryMuted?[primaryId]:[]),...ids.filter(id=>id!==primaryId)];
  const live=new Set(audible);
  return [...audible.filter(id=>!order.includes(id)),...order.filter(id=>live.has(id))];
 };
 return Object.freeze({
  snapshot:()=>ids,
  subscribe:f=>(listeners.add(f),()=>listeners.delete(f)),
  toggle(id,validIds,primaryId){
   if(!validIds.includes(id)||id===primaryId)return false;
   if(ids.includes(id)){
    ids=Object.freeze(ids.filter(x=>x!==id));order=Object.freeze(order.filter(x=>x!==id));
   }else{
    if(ids.length>=2)return false; // Primary + at most two additional audible voices.
    ids=Object.freeze([...ids,id]);touch(id);
   }
   emit();return true;
  },
  restore(values,allowed,primaryId){
   const next=[...new Set(values)].filter(id=>allowed.includes(id)&&id!==primaryId).slice(0,2);
   const changed=next.length!==ids.length||next.some((id,i)=>id!==ids[i]);
   ids=Object.freeze(next);
   const active=new Set([primaryId,...next]);order=Object.freeze(order.filter(id=>active.has(id)));
   if(changed)emit();
  },
  oldestFirst,
  notePrimary(id){if(id&&observedPrimary!==id){observedPrimary=id;touch(id)}},
  restoreOrder(values,primaryId,primaryMuted=false){
   const audible=[...(primaryId&&!primaryMuted?[primaryId]:[]),...ids.filter(id=>id!==primaryId)];
   const saved=Array.isArray(values)?[...new Set(values)].filter(id=>audible.includes(id)):[];
   order=Object.freeze([...audible.filter(id=>!saved.includes(id)),...saved]);
   observedPrimary=primaryId;
  },
  // LR9 and Non-Looper use the SAME canonical audible chronology.
  // Recorder auto-activation and manual Shift-activation must not diverge.
  autoPromote(id,primaryId,primaryMuted,validIds){
   if(!validIds.includes(id))return null;
   return oldestFirst(primaryId,primaryMuted).filter(x=>x!==id&&validIds.includes(x)).slice(-2);
  },
  restoreActivationOrder(values,primaryId,primaryMuted=false){
   this.restoreOrder(values,primaryId,primaryMuted);
  },
  // A fourth Shift-click displaces only the oldest audible voice. It never
  // deletes a sample, a Quick-Rack tile, or a Session-owned WAV.
  rolloverKeep(id,validIds,primaryId,primaryMuted){
   if(!validIds.includes(id)||id===primaryId||ids.includes(id))return null;
   return oldestFirst(primaryId,primaryMuted).filter(x=>x!==id&&validIds.includes(x)).slice(-2);
  },
  touch,
  clear(){ids=Object.freeze([]);order=Object.freeze([]);observedPrimary=null;emit()},
  dropPrimary(id){if(ids.includes(id)){ids=Object.freeze(ids.filter(value=>value!==id));emit()}},
  prune(allowed){const next=ids.filter(id=>allowed.includes(id));
   order=Object.freeze(order.filter(id=>allowed.includes(id)));
   if(next.length!==ids.length){ids=Object.freeze(next);emit()}
  },
  has:id=>ids.includes(id)
 });
})();
function __xenMaterialPolyPlan(records,selectedId,secondaryIds){
 const available=new Map((records||[]).filter(row=>row?.id&&row.blob).map(row=>[row.id,row]));
 const unique=[...new Set(secondaryIds||[])];
 return unique.filter(id=>id!==selectedId&&available.has(id)).map(id=>({id,entry:available.get(id),bars:Math.max(1,Number(available.get(id).bars)||1)}));
}
/* LR7 Material selection contract: a normal click on an INACTIVE tile
   replaces ALL active voices; clicking an already active tile toggles only
   that voice. Shift-click/right-click adds or removes a parallel voice up to
   THREE total. Loop-Rec session takes and library material behave identically. */
function __xenDrumSampleHover(name){
 return [(name||'Select sample')+' · If you need more slots, it’s no crime',
  'to drop percussive samples to a Melodic Loop project, which can',
  'then be used for Material Track or Root Follow Loop.'].join('\n');
}
function __xenQuickMaterialClickIntent({kind,isSecondary,shift,isPrimary}){
 if(kind!=='material')return 'select';
 if(isSecondary)return 'toggle-secondary';
 if(isPrimary)return 'toggle-primary';
 return shift?'toggle-secondary':'select';
}
/* Primary voice gain state is separate from the Material bus mute.
   Muting the primary must NOT mute the parallel, polymetric voices. */
const __XenMaterialPrimarySwitch=(()=>{
 let muted=false, restoredSelection=null, listeners=new Set();
 const emit=()=>{for(const callback of listeners)callback()};
 return Object.freeze({snapshot:()=>muted,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),
  restore(value,selectedId){restoredSelection=selectedId;this.setMuted(value)},
  selectionChanged(id){
   if(restoredSelection===id){restoredSelection=null;return}
   restoredSelection=null;this.reset();
  },
  toggle(){muted=!muted;emit();return muted},
  reset(){if(muted){muted=false;emit()}},
  setMuted(value){const next=!!value;if(muted!==next){muted=next;emit()}}
 });
})();
/* P7.39.25: Per-source live trims, keyed by stable material ID, never by
   quickrack position. The primary voice uses the existing primary gain/pan;
   extras use per-source gain/pan. Song Save captures these owners explicitly. */
/* P7.39.31: time-preserving relative pitch for looped PCM and hybrid RFL bus.
   A native worklet keeps output frame time intact. This is a low-latency dual-head
   granular shifter; processing is bypassed at 0 cents. Do not use playbackRate.
   All implementation/caches are per AudioContext and per lane, not per note. */
/* RFL-PITCH-REENTRY-D1: opt-out, bounded correlation only; no PCM capture or new AudioNodes. */
const __XenRFLPitchReentryProbe=(()=>{
 const max=1800,events=[],connections=new Set();let dropped=0,enabled=(()=>{try{return new URLSearchParams(location.search).get('xenProbe')==='1'}catch{return false}})(),seq=0;
 const stamp=(ctx)=>({perfMs:performance.now(),iso:new Date().toISOString(),audioSec:ctx?.currentTime??null});
 function event(type,detail={},ctx=null){
  const row={seq:++seq,type,...stamp(ctx),detail};
  if(events.length===max){events.shift();dropped++}events.push(row);
 }
 function attach(ctx,node){
  if(!node?.port)return()=>{};
  const link={ctx,node};connections.add(link);
  const onMessage=e=>{const data=e?.data;if(data?.type==='xen-rfl-pitch-probe-report')event('rfl-prepost-pcm-metrics',data,ctx)};
  node.port.addEventListener('message',onMessage);node.port.start?.();
  try{node.port.postMessage({type:'xen-rfl-pitch-probe',enabled})}catch{}
  event('rfl-pitch-worklet-connected',{sampleRate:ctx?.sampleRate??null,enabled},ctx);
  return()=>{connections.delete(link);try{node.port.removeEventListener('message',onMessage)}catch{};event('rfl-pitch-worklet-detached',{},ctx)};
 }
 function setEnabled(value){const next=!!value;if(next===enabled)return enabled;enabled=next;
  event('probe-enabled',{enabled});for(const link of connections)try{link.node.port.postMessage({type:'xen-rfl-pitch-probe',enabled})}catch{};return enabled;}
 function read(){return{schema:'xensonar-rfl-pitch-reentry-d1',version:1,enabled,events:[...events],dropped,
  connectedPitchNodes:connections.size,recordingScope:'RFL bus after pan, before EQ; pitch-node input/output only; no PCM',
  limits:'Finite 1800-event ring; 250 ms worklet reports; pre/post step metrics are click candidates not proof of audible artifacts.'};}
 // Distinguish physical canvas boundary crossings from the semantic RFL playfield gate.
 if(typeof document!=='undefined'){
  const boundary=(name,e)=>{if(!enabled)return;const canvas=e.target?.closest?.('[data-xen-play-area]');
   if(!canvas||canvas.contains(e.relatedTarget))return;
   event(name,{pointerType:e.pointerType||null,buttons:e.buttons??null});};
  document.addEventListener('pointerout',e=>boundary('canvas-pointer-exit',e),{capture:true,passive:true});
  document.addEventListener('pointerover',e=>boundary('canvas-pointer-enter',e),{capture:true,passive:true});
 }
 const api=Object.freeze({event,attach,setEnabled,read,isEnabled:()=>enabled});
 if(typeof globalThis!=='undefined')globalThis.__XenRFLPitchReentryProbe=api;
 return api;
})();
const __XenTimeStablePitch=(()=>{
 const code=`// Shared per AudioWorkletGlobalScope, not allocated per voice or render quantum.
// 4096 interpolated Hann intervals preserve the phase and complementary weights.
const XEN_PITCH_HANN=new Float32Array(4097);
for(let j=0;j<=4096;j++)XEN_PITCH_HANN[j]=.5-.5*Math.cos(2*Math.PI*j/4096);
class XenLaneShift extends AudioWorkletProcessor {
  constructor(options={}){super();this.materialWarmup=options.processorOptions?.materialWarmup===true;this.startAtFrame=options.processorOptions?.startAtFrame||0;this.size=32768;this.mask=this.size-1;this.buffers=[new Float32Array(this.size),new Float32Array(this.size)];this.write=0;this.filled=0;this.phase=0;this.cents=0;this.targetRatio=1;this.smoothed=1;this.wet=0;this.span=Math.max(128,Math.min(4096,Math.floor(sampleRate*.055)));this.base=this.span*.62+4;this.warmFrames=Math.ceil(this.base+this.span*.5)+2;this.probeEnabled=false;this.probeHave=[false,false];this.probeLastInput=new Float32Array(2);this.probeLastOutput=new Float32Array(2);
    this.probePeakIn=0;this.probePeakOut=0;this.probeStepIn=0;this.probeStepOut=0;
    this.probeStepInFrame=null;this.probeStepOutFrame=null;this.probeCandidateIn=0;this.probeCandidateOut=0;this.probeClipsIn=0;this.probeClipsOut=0;
    this.probeNextReportFrame=0;this.probeFrames=0;this.probeThreshold=.32;
    this.port.onmessage=e=>{const m=e.data;
      if(m?.type==='xen-rfl-pitch-probe'){
        this.probeEnabled=m.enabled===true;this.probeHave[0]=false;this.probeHave[1]=false;this.probeNextReportFrame=0;
        this.probeReset();return;
      }
      if(m&&Number.isFinite(m.cents)){const next=Math.max(-1200,Math.min(1200,m.cents));if(next!==this.cents){this.cents=next;this.targetRatio=Math.pow(2,next/1200)}}
    };}
  probeReset(){this.probePeakIn=0;this.probePeakOut=0;this.probeStepIn=0;this.probeStepOut=0;
    this.probeStepInFrame=null;this.probeStepOutFrame=null;this.probeCandidateIn=0;this.probeCandidateOut=0;
    this.probeClipsIn=0;this.probeClipsOut=0;this.probeFrames=0;}
  probeSample(channel,input,output,frame){
    const ch=Math.min(1,channel), ai=Math.abs(input),ao=Math.abs(output);
    if(ai>this.probePeakIn)this.probePeakIn=ai;if(ao>this.probePeakOut)this.probePeakOut=ao;
    if(ai>=.995)this.probeClipsIn++;if(ao>=.995)this.probeClipsOut++;
    if(this.probeHave[ch]){
      const di=Math.abs(input-this.probeLastInput[ch]),doo=Math.abs(output-this.probeLastOutput[ch]);
      if(di>this.probeStepIn){this.probeStepIn=di;this.probeStepInFrame=frame;}
      if(doo>this.probeStepOut){this.probeStepOut=doo;this.probeStepOutFrame=frame;}
      if(di>=this.probeThreshold)this.probeCandidateIn++;
      if(doo>=this.probeThreshold)this.probeCandidateOut++;
    }
    this.probeLastInput[ch]=input;this.probeLastOutput[ch]=output;this.probeHave[ch]=true;
  }
  probeFlush(frame,n){
    if(!this.probeEnabled)return;
    this.probeFrames+=n;
    if(frame===null||frame===undefined)return;
    if(!this.probeNextReportFrame)this.probeNextReportFrame=frame+Math.max(128,Math.round(sampleRate*.25));
    if(frame+n<this.probeNextReportFrame)return;
    // No PCM leaves the processor; metrics are a bounded scalar summary.
    this.port.postMessage({type:'xen-rfl-pitch-probe-report',atAudioSec:(frame+n)/sampleRate,
      frameStart:frame,frameEnd:frame+n,framesMeasured:this.probeFrames,cents:this.cents,
      inputPeak:this.probePeakIn,outputPeak:this.probePeakOut,inputMaxStep:this.probeStepIn,outputMaxStep:this.probeStepOut,
      inputMaxStepAudioSec:this.probeStepInFrame===null?null:this.probeStepInFrame/sampleRate,
      outputMaxStepAudioSec:this.probeStepOutFrame===null?null:this.probeStepOutFrame/sampleRate,
      inputJumpCandidates:this.probeCandidateIn,outputJumpCandidates:this.probeCandidateOut,
      inputNearFullScaleSamples:this.probeClipsIn,outputNearFullScaleSamples:this.probeClipsOut,
      threshold:this.probeThreshold,wet:this.wet,ratio:this.smoothed});
    this.probeNextReportFrame=frame+n+Math.max(128,Math.round(sampleRate*.25));this.probeReset();
  }
  process(inputs,outputs){const ins=inputs[0]||[],out=outputs[0]||[];if(!out.length)return true;const n=out[0].length,span=this.span,base=this.base;
   const ratio=this.targetRatio;
   const __xenProbeFrame=typeof currentFrame==='number'?currentFrame:null;
   // Exact native pass-through, no trig or granular CPU while at zero pitch.
   const warming=this.materialWarmup&&this.filled<this.warmFrames;
   if(warming||(Math.abs(this.cents)<.05&&this.wet<.0001&&Math.abs(this.smoothed-1)<.0002)){
    for(let i=0;i<n;i++){for(let ch=0;ch<out.length;ch++){const input=ins[ch]||ins[0],dry=input?input[i]||0:0;out[ch][i]=dry;if(this.probeEnabled)this.probeSample(ch,dry,dry,__xenProbeFrame===null?null:__xenProbeFrame+i);this.buffers[ch===0?0:1][this.write]=dry;}this.write=(this.write+1)&this.mask;}const frame=typeof currentFrame==='number'?currentFrame:0;this.filled=Math.min(this.size,this.filled+Math.max(0,n-Math.max(0,this.startAtFrame-frame)));this.probeFlush(__xenProbeFrame,n);return true;
   }
   const wanted=Math.abs(this.cents)>.05?1:0;
   for(let i=0;i<n;i++){
    this.smoothed+= (ratio-this.smoothed)*.0017;
    const delta=this.smoothed-1;
    // pitch conversion by moving two periodic read-heads in a delay ring;
    // output sample count never changes and each loop retains its bar duration.
    this.phase+=delta/span;if(this.phase<0)this.phase+=1;if(this.phase>=1)this.phase-=1;
    const phase0=this.phase,phase1=(phase0+.5)%1;
    const d0=base-(phase0-.5)*span,d1=base-(phase1-.5)*span;
    // One table interpolation per sample (shared across channels).
    const u=phase0*4096,k=u|0,blend=u-k;
    const w0=XEN_PITCH_HANN[k]+(XEN_PITCH_HANN[k+1]-XEN_PITCH_HANN[k])*blend,w1=1-w0;
    this.wet+= (wanted-this.wet)*.0024;
    // These read locations depend only on the shared ring clock, never channel PCM.
    let i0=0,i1=0,f0=0,f1=0;
    if(this.wet>.0001){const p0=this.write-d0,p1=this.write-d1;i0=Math.floor(p0);f0=p0-i0;i1=Math.floor(p1);f1=p1-i1;}
    for(let ch=0;ch<out.length;ch++){
      const input=ins[ch]||ins[0],dry=input?input[i]||0:0;
      const buf=this.buffers[ch===0?0:1];buf[this.write]=dry;
      let shifted=dry;
      if(this.wet>.0001){const a0=buf[i0&this.mask],a1=buf[i1&this.mask];shifted=(a0+(buf[(i0+1)&this.mask]-a0)*f0)*w0+(a1+(buf[(i1+1)&this.mask]-a1)*f1)*w1;}
      out[ch][i]=dry*(1-this.wet)+shifted*this.wet;if(this.probeEnabled)this.probeSample(ch,dry,out[ch][i],__xenProbeFrame===null?null:__xenProbeFrame+i);
    }
    this.write=(this.write+1)&this.mask;
   }this.filled=Math.min(this.size,this.filled+n);this.probeFlush(__xenProbeFrame,n);return true;
  }
 }
 registerProcessor('xen-lane-time-pitch-v1',XenLaneShift);`;
 const contexts=new WeakMap();
 // Reuse C11's proven scheme order for standalone file:// builds: data: first,
 // blob: fallback. A rejected attempt must never poison this AudioContext forever.
 const diagnostics={version:1,loader:'xen-lane-time-pitch-v1',state:'idle',via:null,attempts:[],material:{}};
 if(typeof globalThis!=='undefined')globalThis.__XEN_LANE_PITCH_DIAGNOSTICS__=diagnostics;
 function ensure(ctx){
  if(!ctx?.audioWorklet||typeof AudioWorkletNode==='undefined'){
   diagnostics.state='unavailable';diagnostics.reason='audioWorklet/AudioWorkletNode missing';
   return Promise.resolve(false);
  }
  let task=contexts.get(ctx);if(task)return task;
  task=(async()=>{
   const isFile=typeof location!=='undefined'&&location.protocol==='file:';
   const schemes=isFile?['data','blob']:['blob','data'];
   diagnostics.state='loading';diagnostics.attempts=[];diagnostics.via=null;
   for(const scheme of schemes){
    let url=null;
    try{
     diagnostics.attempts.push({scheme,result:'started'});
     if(scheme==='data')url='data:application/javascript;charset=utf-8,'+encodeURIComponent(code);
     else url=URL.createObjectURL(new Blob([code],{type:'application/javascript'}));
     await ctx.audioWorklet.addModule(url);
     diagnostics.attempts[diagnostics.attempts.length-1].result='loaded';
     diagnostics.state='ready';diagnostics.via=scheme;delete diagnostics.reason;
     return true;
    }catch(error){
     const reason=error instanceof Error?error.message:String(error);
     diagnostics.attempts[diagnostics.attempts.length-1].result='failed';
     diagnostics.attempts[diagnostics.attempts.length-1].reason=reason;
    }finally{if(scheme==='blob'&&url)try{URL.revokeObjectURL(url)}catch{}}
   }
   diagnostics.state='unavailable';diagnostics.reason=diagnostics.attempts.map(a=>a.scheme+': '+a.reason).join(' | ');
   console.warn('[xensonar][lane-pitch] both Worklet module URL schemes failed:',diagnostics.reason);
   return false;
  })();
  contexts.set(ctx,task);
  task.then(ok=>{if(!ok&&contexts.get(ctx)===task)contexts.delete(ctx)},()=>{if(contexts.get(ctx)===task)contexts.delete(ctx)});
  return task;
 }
 function create(ctx,cents=0,materialWarmup=true,startAtSec=0){try{try{globalThis.__XenRenderMonitor?.mark('pitch-node-create',{material:materialWarmup},ctx)}catch{}const node=new AudioWorkletNode(ctx,'xen-lane-time-pitch-v1',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{materialWarmup,startAtFrame:Math.ceil(Math.max(0,startAtSec)*ctx.sampleRate)}});tune(node,cents);return node}catch(error){console.warn('[xensonar][lane-pitch] cannot create',error);return null}}
 const tune=(node,cents)=>{if(!node||!Number.isFinite(cents))return;const target=Math.max(-1200,Math.min(1200,cents));if(node.__xenPitchCents===target)return;try{node.port.postMessage({cents:target});node.__xenPitchCents=target}catch{}};
 // P9-C3: every pitch lane warms its delay history before the wet crossfade.
 // This includes RFL's shared bus, which can be inserted at nonzero pitch.
 const createMaterial=(ctx,cents=0,startAtSec=0)=>create(ctx,cents,true,startAtSec);
 return Object.freeze({ensure,create,createMaterial,tune});
})();
/* One Root Follow pitch offset for the entire Root Follow output (synthetic
   and PCM parts together), independent of every Material and Bass pitch. */
const __XenRootFollowPitch=(()=>{
 let cents=0,listeners=new Set(),devices=new Set();
 function set(raw){if(!Number.isFinite(raw))return;const next=Math.max(-1200,Math.min(1200,raw));if(next===cents)return;__XenRFLPitchReentryProbe.event('rfl-pitch-set',{previousCents:cents,nextCents:next},devices.values().next().value?.ctx);cents=next;for(const item of devices)__XenTimeStablePitch.tune(item.node,cents);for(const cb of listeners)cb()}
 function register(ctx,node){const device={ctx,node};devices.add(device);const offProbe=__XenRFLPitchReentryProbe.attach(ctx,node);__XenTimeStablePitch.tune(node,cents);return()=>{offProbe();devices.delete(device)}}
 return Object.freeze({snapshot:()=>cents,subscribe:cb=>(listeners.add(cb),()=>listeners.delete(cb)),set,register});
})();

/* P3: Beat-relative Attack for the RFL and Bass timing machines.
   Same live gesture as Material, but neither lane borrows Material's PCM phase. */
const __XenAttackLanes=(()=>{
 let state=Object.freeze({bass:0,rootFollow:0}),listeners=new Set();
 const snapshot=()=>state;
 const subscribe=fn=>(listeners.add(fn),()=>listeners.delete(fn));
 function set(lane,raw){
  if(!Object.hasOwn(state,lane)||!Number.isFinite(raw))return;
  const value=Math.max(-2,Math.min(2,raw));if(value===state[lane])return;
  state=Object.freeze({...state,[lane]:value});for(const cb of listeners)cb();
 }
 function seconds(lane,bpm){return (state[lane]??0)*60/Math.max(40,Number(bpm)||108)}
 function bassHorizon(bpm){
  const step=60/Math.max(40,Number(bpm)||108)/4;
  const standard=Math.max(.36,Math.min(.72,step*6));
  return Math.max(standard,Math.max(0,-seconds('bass',bpm))+.16);
 }
 function phaseRfl(runtime,now,cycleSec,bpm){
  if(!Number.isFinite(runtime.transportAnchor??NaN)){
   runtime.transportAnchor=Math.ceil((now+.02)/cycleSec)*cycleSec;
   runtime.__xenAttackAppliedSec=0;
  }
  const next=seconds('rootFollow',bpm),prior=runtime.__xenAttackAppliedSec??0;
  const delta=next-prior;
  if(Math.abs(delta)>1e-9){
   runtime.transportAnchor+=delta;
   if(Number.isFinite(runtime.nextSliceStart??NaN))runtime.nextSliceStart+=delta;
  }
  runtime.__xenAttackAppliedSec=next;
 }
 return Object.freeze({snapshot,subscribe,set,seconds,bassHorizon,phaseRfl});
})();
/* LIVE-CONTROL14: UI observation and storage run at bounded control rate.
 * Runtime snapshots and AudioParam owners remain synchronous. No note queue. */
function __xenControlNotifier(listeners){
 let timer=null;
 const cancel=()=>{if(timer!==null){clearTimeout(timer);timer=null}};
 const now=()=>{cancel();for(const fn of listeners)fn()};
 const queue=()=>{if(timer===null)timer=setTimeout(now,16)};
 return {now,queue,cancel};
}
function __xenCreateControlPersistence(commit,keys){
 const allowed=new Set(keys);let previous=null,pending=null,timer=null;
 const cancel=()=>{if(timer!==null)clearTimeout(timer);timer=null;pending=null};
 const flush=()=>{const latest=pending;cancel();if(latest)commit(latest)};
 if(typeof window!=='undefined')window.addEventListener?.('pagehide',flush);
 return state=>{
  // Preview state must never become a delayed write after preview ends.
  if(typeof __f351PreviewActive!=='undefined'&&__f351PreviewActive){cancel();previous=state;return}
  let changed=false,controls=previous!==null;
  if(previous)for(const key in state){
   if(!Object.hasOwn(state,key)||Object.is(state[key],previous[key]))continue;
   changed=true;if(!allowed.has(key))controls=false;
  }
  if(controls&&changed)for(const key in previous)if(Object.hasOwn(previous,key)&&!Object.hasOwn(state,key)){controls=false;break}
  controls=controls&&changed;
  previous=state;
  if(controls){pending=state;if(timer===null)timer=setTimeout(flush,80);return}
  // A discrete/session update is a barrier: commit its coherent latest state now.
  cancel();commit(state);
 };
}
/* R2: VoiceMix as a factory. The Live Room keeps its single instance
   (__XenMaterialVoiceMix, keyed by material ID, persisted by Song Save);
   Room IV creates its own instance keyed by clip/track ID. */
function __xenCreateMaterialVoiceMix(){
 const neutral=Object.freeze({volume:1,pan:0,pitch:0,att:0,attApplied:0,nudgeMode:'granular',nudgeFeel:'soft'});
 let state=Object.freeze({}),listeners=new Set(),attTimers=new Map(),transports=new Map(),revisions=new Map(),pending=new Map(),gestures=new Set();
 const invalidate=id=>{revisions.set(id,(revisions.get(id)??0)+1);for(const key of pending.keys())if(key.id===id)pending.delete(key);};
 const isSettling=items=>{const ids=items?new Set(items.filter(item=>item?.kind==='material').map(item=>item.id)):null;return [...gestures].some(id=>(!ids||ids.has(id))&&get(id).nudgeMode==='vinyl'&&get(id).nudgeFeel==='hard')||[...pending.keys()].some(key=>!ids||ids.has(key.id));};
 const uiListeners=new Set(),uiNotify=__xenControlNotifier(uiListeners);
 const snapshot=()=>state,subscribe=fn=>(listeners.add(fn),()=>listeners.delete(fn));
 const subscribeUi=fn=>(uiListeners.add(fn),()=>uiListeners.delete(fn));
 const notify=(continuous=false)=>{for(const fn of listeners)fn();if(continuous)uiNotify.queue();else uiNotify.now()};
 const get=(id,source=state)=>source?.[String(id??'')]??neutral;
 function set(id,field,raw,interaction){
  if(typeof id!=='string'||!id||!['volume','pan','pitch','att'].includes(field)||!Number.isFinite(raw))return;
  const value=field==='volume'?Math.max(0,Math.min(1.5,raw)):field==='pan'?Math.max(-1,Math.min(1,raw)):field==='pitch'?Math.max(-1200,Math.min(1200,raw)):Math.max(-2,Math.min(2,raw));
  const before=get(id);if(before[field]===value)return;
  state=Object.freeze({...state,[id]:Object.freeze({...before,[field]:value})});
  notify(field==='volume'||field==='pan');
  if(field==='att'){
   invalidate(id);
   clearTimeout(attTimers.get(id));
   const owners=transports.get(id);if(owners?.size){attTimers.delete(id);for(const owner of owners)owner.target(value,interaction);if(interaction==='drag'&&get(id).nudgeFeel==='hard'&&get(id).nudgeMode!=='vinyl')__XenNudgeFeedback.preview(id,value);return;}
   // UI tracks fingers immediately, while onset rephase is coalesced to avoid
   // repeated decoder work or audio restarts during a continuous drag.
   attTimers.set(id,setTimeout(()=>{
    attTimers.delete(id);
    const current=get(id);
    if(current.attApplied===current.att)return;
    state=Object.freeze({...state,[id]:Object.freeze({...current,attApplied:current.att})});
    notify();
   },85));
  }
 }
 function setMode(id,mode){if(!id||!['granular','vinyl'].includes(mode))return;const before=get(id);if(before.nudgeMode===mode)return;invalidate(id);__XenNudgeFeedback.endPreview(id,true);state=Object.freeze({...state,[id]:Object.freeze({...before,nudgeMode:mode})});for(const owner of transports.get(id)??[])owner.mode(mode);notify();}
 function registerTransport(id,owner){let owners=transports.get(id);if(!owners){owners=new Set();transports.set(id,owners)}owners.add(owner);clearTimeout(attTimers.get(id));attTimers.delete(id);owner.target(get(id).att,'restore');owner.mode(get(id).nudgeMode);owner.feel?.(get(id).nudgeFeel);return()=>{invalidate(id);gestures.delete(id);owners.delete(owner);owner.releaseMotion?.();if(!owners.size)transports.delete(id)};}
 function beginGesture(id,interaction){
  if(interaction!=='drag')return;gestures.add(id);invalidate(id);for(const owner of transports.get(id)??[])owner.beginGesture?.('drag');
 }
 function endGesture(id,interaction){
  if(interaction!=='drag')return;gestures.delete(id);
  const revision=revisions.get(id)??0,owners=[...(transports.get(id)??[])],canonical=owners[owners.length-1];
  for(const owner of owners){
   const result=owner.endGesture?.('drag');
   if(owner!==canonical||get(id).nudgeMode!=='vinyl'||get(id).nudgeFeel!=='hard'||!result?.then){if(result?.then)Promise.resolve(result).catch(()=>{});continue;}
   const key={id};
   const task=Promise.resolve(result).then(attack=>{
    if(!Number.isFinite(attack)||(revisions.get(id)??0)!==revision||!transports.get(id)?.has(owner))return;
    const current=get(id);
    state=Object.freeze({...state,[id]:Object.freeze({...current,att:attack})});
    notify();
   }).catch(()=>{}).finally(()=>pending.delete(key));
   pending.set(key,task);
  }
  __XenNudgeFeedback.endPreview(id);
 }
 function setFeel(id,feel){if(!id||!['soft','hard'].includes(feel))return;const before=get(id);if(before.nudgeFeel===feel)return;invalidate(id);if(feel!=='hard')__XenNudgeFeedback.endPreview(id,true);state=Object.freeze({...state,[id]:Object.freeze({...before,nudgeFeel:feel})});for(const owner of transports.get(id)??[])owner.feel?.(feel);notify();}
 // P0 SONG PERFORMANCE: commit one coherent mixer snapshot on song activation.
 // The ordinary set()/drag path is deliberately unchanged (no extra storage writes).
 function restoreSession(items,values={}){
  const next={...state};
  for(const item of items||[]){
   if(item?.kind!=='material')continue;
   const id=item.id,raw=values?.[id]??neutral;gestures.delete(id);invalidate(id);
   clearTimeout(attTimers.get(id));attTimers.delete(id);
   __XenNudgeFeedback.endPreview(id,true);
   const bounded=(field,low,high,defaultValue)=>Number.isFinite(raw[field])?Math.min(high,Math.max(low,raw[field])):defaultValue;
   const cfg=Object.freeze({volume:bounded('volume',0,1.5,1),pan:bounded('pan',-1,1,0),
    pitch:bounded('pitch',-1200,1200,0),att:Number.isFinite(raw.att)?raw.att:0,
    attApplied:Number.isFinite(raw.att)?raw.att:0,nudgeMode:raw.nudgeMode==='vinyl'?'vinyl':'granular',nudgeFeel:raw.nudgeFeel==='hard'?'hard':'soft'});
   next[id]=cfg;
   for(const owner of transports.get(id)??[]){owner.mode(cfg.nudgeMode);owner.feel?.(cfg.nudgeFeel);owner.target(cfg.att,'restore');}
  }
  state=Object.freeze(next);notify();
 }
 return Object.freeze({get,snapshot,subscribe,subscribeUi,set,setMode,setFeel,beginGesture,endGesture,registerTransport,restoreSession,isSettling});
}
const __XenMaterialVoiceMix=__xenCreateMaterialVoiceMix();
/* P9-N3: material PCM phase owner. No UI/render timer owns audio motion. */
const __XenMaterialPhase=(()=>{
 const code="/* Material phase transport. Audio-time motion, bounded forward rates, per-lane PCM.\n * User pitch remains downstream. Idle and Vinyl use the direct PCM reader;\n * Granular motion uses two overlapping, phase-aligned Hann readers.\n */\nclass XenHardPhaseMotion {\n constructor(attack=0){this.phase=-attack;this.target=-attack;this.rate=1;this.velocity=0;this.lastGesture=-1;this.lastTime=0;this.active=false;this.dragging=false;this.clicking=false;}\n targetAttack(attack,time,interaction){\n  const target=interaction==='restore'?-attack:-Math.max(-2,Math.min(2,attack));\n  if(interaction==='drag'){\n   // Follow the thumb's absolute position, not a second lagging transport.\n   this.dragging=true;this.clicking=false;this.phase=this.target=target;\n   this.rate=1;this.velocity=0;this.active=true;this.lastGesture=time;return;\n  }\n  if(interaction==='click'){\n   this.dragging=false;this.clicking=true;this.target=target;\n   this.active=Math.abs(this.target-this.phase)>1e-9;this.lastGesture=time;\n   return;\n  }\n  this.dragging=false;this.clicking=false;\n  if(target===this.target)return;\n  const dt=this.lastGesture<0?.08:Math.max(.012,Math.min(.5,time-this.lastGesture));\n  this.velocity=Math.max(-16,Math.min(16,(target-this.target)/dt));\n  this.target=target;this.lastGesture=time;this.active=true;\n }\n step(dt,bpm,time){\n  if(!this.active)return 1;\n  if(this.dragging){this.rate=1;return 1;}\n  const beat=60/Math.max(40,Math.min(240,bpm));\n  if(this.clicking){\n   // One fixed, bounded travel velocity for a rail click, independent of distance.\n   const remain=this.target-this.phase;\n   if(Math.abs(remain)<1e-12){this.phase=this.target;this.active=this.clicking=false;this.rate=1;return 1;}\n   const signedSpeed=remain>0?.5:-.5;\n   const delta=Math.sign(remain)*Math.min(Math.abs(remain),Math.abs(signedSpeed)*dt/beat);\n   this.phase+=delta;this.rate=1+delta*beat/dt;\n   if(Math.abs(this.target-this.phase)<1e-12){this.phase=this.target;this.active=this.clicking=false;}\n   this.lastTime=time;return this.rate;\n  }\n  const error=(this.target-this.phase)*beat;\n  const speed=Math.min(1,Math.abs(this.velocity)/8),accel=8+speed*12;\n  const feed=this.velocity*beat*.22*Math.exp(-Math.max(0,time-this.lastGesture)/.07);\n  const brake=Math.sqrt(Math.max(0,2*accel*Math.abs(error)));\n  let desired=Math.max(-brake,Math.min(brake,error*10+feed));\n  desired=Math.max(-.5,Math.min(1,desired));\n  const delta=Math.max(-accel*dt,Math.min(accel*dt,1+desired-this.rate));this.rate+=delta;\n  const movement=(this.rate-1)*dt/beat;\n  if(Math.sign(movement)===Math.sign(this.target-this.phase)&&Math.abs(movement)>=Math.abs(this.target-this.phase)){\n   this.phase=this.target;this.rate=1;this.active=false;\n  }else{\n   this.phase+=movement;\n   if(Math.abs(this.target-this.phase)<1e-7&&Math.abs(this.rate-1)<1e-4){this.phase=this.target;this.rate=1;this.active=false;}\n  }\n  this.lastTime=time;return this.rate;\n }\n}\n\n/* Hard Vinyl: continuous sample-rate playback follows thumb velocity.\n * The user supplies a live phase-offset target. Every audio sample advances\n * the ONE PCM playhead by the signed rate, including reverse movement.\n * No pointer-message phase teleport and no second competing PCM reader.\n */\nclass XenVinylScratchMotion extends XenHardPhaseMotion {\n beginDrag(time){\n  this.dragging=true;this.clicking=false;this.active=true;\n  this.target=this.phase;this.rate=1;this.velocity=0;this.lastGesture=time;\n }\n targetAttack(attack,time,interaction){\n  if(interaction==='drag'){\n   this.dragging=true;this.clicking=false;this.active=true;\n   this.target=-Math.max(-2,Math.min(2,attack));this.lastGesture=time;\n   return;\n  }\n  super.targetAttack(attack,time,interaction);\n }\n endDrag(){\n  this.dragging=false;this.clicking=false;this.active=false;\n  // Let go of the record: resume base speed at its *reached* PCM position.\n  this.target=this.phase;this.rate=1;this.velocity=0;\n }\n step(dt,bpm,time){\n  if(!this.dragging)return super.step(dt,bpm,time);\n  const beat=60/Math.max(40,Math.min(240,bpm));\n  const error=this.target-this.phase;\n  if(Math.abs(error)<1e-10){this.phase=this.target;this.rate=1;return 1;}\n  // 8 ms hand-following time scale. Pitch deviation includes reverse playback;\n  // the bounded slew avoids instantaneous rate changes within one audio sample.\n  const desired=1+Math.max(-4,Math.min(4,error*beat/.008));\n  const nextRate=this.rate+Math.max(-1500*dt,Math.min(1500*dt,desired-this.rate));\n  let movement=(this.rate+nextRate-2)*.5*dt/beat;\n  const arrived=Math.abs(movement)>=Math.abs(error)&&Math.sign(movement)===Math.sign(error);\n  if(arrived)movement=error;\n  this.phase+=movement;\n  const actualRate=1+movement*beat/dt;\n  this.rate=arrived?1:nextRate;\n  this.lastTime=time;\n  return actualRate;\n }\n}\n\n/* N3: finite C2 strokes. Phase is in beats; velocity is the rate deviation.\n * Replanning keeps phase, velocity and acceleration. Infeasible reversals first\n * use a bounded braking segment, then travel to the latest target from rest.\n */\nclass XenPhaseMotion {\n constructor(attack=0){this.phase=-attack;this.target=-attack;this.rate=1;this.velocity=0;this.acceleration=0;this.active=false;this.dirty=false;this.curve=null;this.beat=60/108;this.lastBpm=NaN;}\n targetAttack(attack,time,interaction){const target=interaction==='restore'?-attack:-Math.max(-2,Math.min(2,attack));if(target===this.target)return;this.target=target;this.active=true;this.dirty=true;}\n within(a,b,c,d,e,depth=0){\n  const lo=Math.min(a,b,c,d,e),hi=Math.max(a,b,c,d,e);\n  if(lo>=-.5-1e-12&&hi<=1+1e-12)return true;\n  if(a<-.5-1e-12||a>1+1e-12||e<-.5-1e-12||e>1+1e-12||depth===5)return false;\n  // Bernstein subdivision bounds the entire rate curve, including between samples.\n  const ab=(a+b)/2,bc=(b+c)/2,cd=(c+d)/2,de=(d+e)/2;\n  const abc=(ab+bc)/2,bcd=(bc+cd)/2,cde=(cd+de)/2;\n  const abcd=(abc+bcd)/2,bcde=(bcd+cde)/2,mid=(abcd+bcde)/2;\n  return this.within(a,ab,abc,abcd,mid,depth+1)&&this.within(mid,bcde,cde,de,e,depth+1);\n }\n install(duration,c1,c2,c3,c4,c5,end,stage){this.curve={duration,elapsed:0,c0:this.phase,c1,c2,c3,c4,c5,beat:this.beat,end,stage};this.dirty=false;}\n plan(){\n  const D=this.target-this.phase,v=this.velocity,a=this.acceleration,beat=this.beat;\n  let T=.18+2.1*Math.abs(D)*beat/(D<0?.46:.92);\n  for(let attempt=0;attempt<10;attempt++,T*=1.18){\n   const b0=v,b1=v+a*T/4,b2=5*D*beat/T-2*v-a*T/4;\n   const a0=a,a1=4*(b2-b1)/T,a2=-4*b2/T;\n   const accelOK=Math.max(Math.abs(a0),Math.abs(a1),Math.abs(a2))<=12;\n   const jerkOK=Math.max(Math.abs(3*(a1-a0)/T),Math.abs(3*(a2-a1)/T),Math.abs(3*a2/T))<=500;\n   if(accelOK&&jerkOK&&this.within(b0,b1,b2,0,0)){\n    const vt=v*T/beat,at=a*T*T/beat;\n    this.install(T,vt,at/2,10*D-6*vt-1.5*at,-15*D+8*vt+1.5*at,6*D-3*vt-.5*at,this.target,'travel');return;\n   }\n  }\n  // A single polynomial cannot satisfy every abrupt reversal within rate limits.\n  // Complete a short continuous brake rather than clipping its speed or position.\n  if(this.curve?.stage==='brake'){this.dirty=false;return;}\n  T=.26;\n  for(let attempt=0;attempt<24;attempt++,T*=.7){\n   const b1=v+a*T/3;\n   if(this.within(v,(v+3*b1)/4,b1/2,0,0))break;\n  }\n  const vt=v*T/beat,at=a*T*T/beat,end=this.phase+vt/2+at/12;\n  this.install(T,vt,at/2,-vt-2*at/3,vt/2+at/4,0,end,'brake');\n }\n step(dt,bpm){\n  if(!this.active)return 1;\n  if(this.lastBpm!==bpm){const beat=60/Math.max(40,Math.min(240,bpm));this.lastBpm=bpm;if(beat!==this.beat){this.beat=beat;this.dirty=true;}}\n  const beat=this.beat;\n  if(this.dirty||!this.curve)this.plan();\n  const k=this.curve,previous=this.phase;k.elapsed=Math.min(k.duration,k.elapsed+dt);\n  const u=k.elapsed/k.duration;\n  this.phase=k.c0+u*(k.c1+u*(k.c2+u*(k.c3+u*(k.c4+u*k.c5))));\n  this.velocity=beat/k.duration*(k.c1+u*(2*k.c2+u*(3*k.c3+u*(4*k.c4+5*u*k.c5))));\n  this.acceleration=beat/(k.duration*k.duration)*(2*k.c2+u*(6*k.c3+u*(12*k.c4+20*u*k.c5)));\n  if(k.elapsed===k.duration){\n   this.phase=k.end;this.velocity=this.acceleration=0;\n   if(k.stage==='brake'){this.curve=null;this.plan();}else{this.active=false;this.curve=null;}\n  }\n  const outputRate=1+(this.phase-previous)*beat/dt;\n  this.rate=this.active?outputRate:1;\n  return outputRate;\n }\n}\n\n/* XPERF-12B: immutable PCM bank residence in this AudioWorkletGlobalScope.\n * No extra clone: these are already transferred player source arrays.  Entries\n * are LRU-bounded; live players retain their source even after cache eviction.\n * The bank contains ONLY source PCM, never per-voice motion or DSP state. */\nconst XEN_PHASE_BANK_LIMIT=16*1024*1024,XEN_PHASE_BANK_MAX=2;\nconst XEN_PHASE_BANKS=new Map();let XEN_PHASE_BANK_BYTES=0;\nfunction xenPhaseBankFind(id,sr,length,nch){\n const row=XEN_PHASE_BANKS.get(id);\n if(!row||row.sampleRate!==sr||row.length!==length||row.nch!==nch)return null;\n XEN_PHASE_BANKS.delete(id);XEN_PHASE_BANKS.set(id,row);return row;\n}\nfunction xenPhaseBankStore(id,sr,channels){\n if(typeof id!=='string'||!channels||!channels.length)return;\n const size=channels.reduce((n,ch)=>n+ch.byteLength,0);\n if(size>XEN_PHASE_BANK_LIMIT)return;\n const old=XEN_PHASE_BANKS.get(id);\n if(old){XEN_PHASE_BANK_BYTES-=old.bytes;XEN_PHASE_BANKS.delete(id);}\n const row={sampleRate:sr,channels,nch:channels.length,length:channels[0].length,bytes:size};\n XEN_PHASE_BANKS.set(id,row);XEN_PHASE_BANK_BYTES+=size;\n while(XEN_PHASE_BANKS.size>XEN_PHASE_BANK_MAX||XEN_PHASE_BANK_BYTES>XEN_PHASE_BANK_LIMIT){\n  const oldest=XEN_PHASE_BANKS.keys().next().value,evicted=XEN_PHASE_BANKS.get(oldest);\n  XEN_PHASE_BANKS.delete(oldest);XEN_PHASE_BANK_BYTES-=evicted.bytes;\n }\n}\nconst XEN_PHASE_HANN=new Float32Array(1025);\nfor(let i=0;i<XEN_PHASE_HANN.length;i++)XEN_PHASE_HANN[i]=.5-.5*Math.cos(2*Math.PI*i/1024);\nclass XenMaterialPhase extends AudioWorkletProcessor {\n constructor(){super();this.channels=null;this.sourceRate=48000;this.started=false;this.ended=false;this.stopFrame=Infinity;this.startFrame=Infinity;this.motion=new XenPhaseMotion();this.mode='granular';this.feel='soft';this.motionAcceleration=0;this.wet=0;this.head0=0;this.head1=0;this.grainPhase=0;this.frameSpan=Math.max(512,Math.min(8192,Math.round(sampleRate*.048)));this.position=0;this.baseRate=1;this.bpm=108;this.cropStart=0;this.cropEnd=0;this.lastActive=false;this.nextReportFrame=0;this.reportedActive=false;this.reportPending=false;this.wetCoefficient=1-Math.exp(-1/(sampleRate*.012));this.dragFadeFrames=Math.max(1,Math.round(sampleRate*.004));this.dragFadeLeft=0;this.dragFadeFrom=0;this.alignReference=new Float64Array(32);this.li=new Int32Array(4);this.lj=new Int32Array(4);this.lf=new Float64Array(4);\n  this.port.onmessage=event=>{const m=event.data;if(!m)return;\n   if(m.type==='bank-probe'&&!this.channels){\n    const row=xenPhaseBankFind(m.bankId,m.sampleRate,m.length,m.nch);\n    if(row){this.channels=row.channels;this.sourceRate=row.sampleRate;this.port.postMessage({type:'ready',cacheHit:true});}\n    else this.port.postMessage({type:'bank-miss'});\n   }\n   else if(m.type==='load'&&!this.channels){this.channels=m.channels;this.sourceRate=m.sampleRate;\n    xenPhaseBankStore(m.bankId,m.sampleRate,m.channels);\n    this.port.postMessage({type:'ready',cacheHit:false});}\n   else if(m.type==='start'&&this.channels){this.cropStart=m.loopStart*this.sourceRate;this.cropEnd=Math.min(this.channels[0].length,m.loopEnd*this.sourceRate);this.position=m.offset*this.sourceRate;this.baseRate=m.baseRate;this.bpm=m.bpm;this.configure(m.mode,m.feel,m.attack);this.startFrame=Math.ceil(m.when*sampleRate);this.head0=this.head1=this.position;this.started=true;this.reportPending=true;}\n   else if(m.type==='gesture-begin'&&m.interaction==='drag'&&this.mode==='vinyl'&&this.feel==='hard'){\n    this.motion.beginDrag(currentFrame/sampleRate);this.reportPending=true;\n   }\n   else if(m.type==='target'&&Number.isFinite(m.attack)){\n    const before=this.motion.phase;\n    this.motion.targetAttack(m.attack,Number.isFinite(m.time)?m.time:currentFrame/sampleRate,m.interaction);\n    if(this.feel==='hard'&&this.mode==='granular'&&m.interaction==='drag'){\n     // The audible PCM pointer must follow the thumb too, not only the display.\n     const delta=this.motion.phase-before;\n     if(delta!==0&&this.channels){\n      const previousPosition=this.position;\n      this.position=this.wrap(this.position+delta*(60/this.bpm)*this.baseRate*this.sourceRate);\n      this.dragFadeFrom=previousPosition;this.dragFadeLeft=this.dragFadeFrames;\n      // Keep granular grains aligned to the newly selected source position.\n      this.head0=this.head1=this.position;this.grainPhase=0;\n     }\n     this.reportPending=true;\n    }\n   }\n   else if(m.type==='gesture-end'&&m.interaction==='drag'&&this.feel==='hard'){\n    if(this.mode==='vinyl')this.motion.endDrag();\n    else{this.motion.dragging=false;this.motion.active=false;this.motion.rate=1;}\n    this.reportPending=true;\n    if(m.token!==undefined)this.port.postMessage({type:'gesture-settled',token:m.token,attack:-this.motion.phase});\n   }\n   else if(m.type==='mode'){this.configure(m.mode,m.feel);this.reportPending=true;}\n   else if(m.type==='stop'){this.stopFrame=Math.ceil(Math.max(0,m.when??currentFrame/sampleRate)*sampleRate);}\n  };\n }\n configure(mode,feel,initialAttack=null){\n  const nextMode=mode==='vinyl'?'vinyl':'granular',nextFeel=feel==='hard'?'hard':'soft';\n  const Motion=nextFeel==='soft'?XenPhaseMotion:nextMode==='vinyl'?XenVinylScratchMotion:XenHardPhaseMotion;\n  if(initialAttack!==null||this.motion.constructor!==Motion){\n   const previous=this.motion;\n   const next=new Motion(initialAttack??0);\n   if(initialAttack===null){\n    next.phase=previous.phase;next.target=previous.target;next.rate=previous.rate;next.active=previous.active||Math.abs(previous.rate-1)>1e-9;\n    if(nextFeel==='soft'){next.velocity=previous.rate-1;next.acceleration=0;next.dirty=next.active;}\n   }\n   this.motion=next;this.dragFadeLeft=0;\n  }\n  this.mode=nextMode;this.feel=nextFeel;\n }\n wrap(position){const span=this.cropEnd-this.cropStart;return this.cropStart+((position-this.cropStart)%span+span)%span;}\n read(channel,position){const p=this.wrap(position),i=Math.floor(p),f=p-i,buffer=this.channels[Math.min(channel,this.channels.length-1)];const j=i+1<this.cropEnd?i+1:Math.floor(this.cropStart);return buffer[i]+(buffer[j]-buffer[i])*f;}\n // GA1: exact float64-equivalent wrap for samples strictly inside the crop.\n // The original wrap uses ((t % span) + span) % span; in 0 <= t < span,\n // the first remainder is t. The second is (t+span)-span except when\n // addition rounds to exactly 2*span, where the remainder is zero.\n // All boundary/outside-crop positions use the original wrap untouched.\n readAlign0(position){\n  const start=this.cropStart,span=this.cropEnd-start,t=position-start;\n  let p;\n  if(t>=0&&t<span){const y=t+span;p=start+(y>=span+span?0:y-span);}\n  else p=this.wrap(position);\n  const i=Math.floor(p),f=p-i,buffer=this.channels[0];\n  const j=i+1<this.cropEnd?i+1:Math.floor(start);\n  return buffer[i]+(buffer[j]-buffer[i])*f;\n }\n loc(position,k){const p=this.wrap(position),i=Math.floor(p);this.li[k]=i;this.lj[k]=i+1<this.cropEnd?i+1:Math.floor(this.cropStart);this.lf[k]=p-i;}\n at(channel,k){const buffer=this.channels[Math.min(channel,this.channels.length-1)],i=this.li[k];return buffer[i]+(buffer[this.lj[k]]-buffer[i])*this.lf[k];}\n align(desired,reference,step){\n  // Bounded waveform match once per half grain, independent of output channels.\n  const stride=Math.max(1,Math.round(this.sourceRate/6000)),radius=this.sourceRate*.008;\n  const ref=reference,center=desired;let best=center,bestScore=-2,energy=0;\n  for(let i=0;i<32;i++){const x=this.readAlign0(ref+i*stride*step);this.alignReference[i]=x;energy+=x*x;}\n  if(energy<1e-9)return center;\n  for(let shift=-radius;shift<=radius;shift+=stride){let dot=0,power=0;for(let i=0;i<32;i++){const x=this.readAlign0(center+shift+i*stride*step),y=this.alignReference[i];dot+=x*y;power+=x*x;}const score=dot/Math.sqrt(Math.max(1e-20,energy*power))-.006*Math.abs(shift)/Math.max(1,radius);if(score>bestScore){bestScore=score;best=center+shift;}}\n  return best;\n }\n process(inputs,outputs){const out=outputs[0]??[];if(!out.length)return !this.ended;\n  // A full running quantum overwrites every output sample. Preserve zero-fill\n  // for pre-start, stopped, missing-source and partial boundary quanta.\n  if(this.ended||!this.started||!this.channels||currentFrame<this.startFrame||currentFrame+out[0].length>this.stopFrame)\n   for(let ch=0;ch<out.length;ch++)out[ch].fill(0);\n  if(this.ended)return false;\n  const frames=out[0].length;if(currentFrame>=this.stopFrame){this.ended=true;this.port.postMessage({type:'ended'});return false;}if(!this.started||!this.channels)return true;\n  const baseStep=this.baseRate*this.sourceRate/sampleRate,dt=1/sampleRate;\n  // A plain loop is the common instrument path. Keep exact source arithmetic,\n  // crop wrapping and frame boundaries, without running dormant motion/grains.\n  // A gesture or residual crossfade takes the original complete path below.\n  if((!this.motion.active||(this.mode==='granular'&&this.feel==='hard'&&this.motion.dragging))&&this.motion.rate===1&&this.wet===0&&this.dragFadeLeft===0){\n   {const nch=out.length,channels=this.channels,left=channels[0],right=channels[Math.min(1,channels.length-1)];\n    const cropEnd=this.cropEnd,cropStartFloor=Math.floor(this.cropStart),stopFrame=this.stopFrame,startFrame=this.startFrame;\n    const hasRenderedFrames=Math.max(currentFrame,startFrame)<Math.min(currentFrame+frames,stopFrame);\n    if(hasRenderedFrames){this.lastActive=this.motion.active;this.motionAcceleration=this.feel==='soft'?this.motion.acceleration:0;}\n    let pos=this.position;\n    // Whole-frame PCM within 32-bit source bounds has exact integer wrap math.\n    // pos is already canonical after the prior advance; retain the original\n    // interpolation expression, including signed-zero/NaN behavior.\n    const wholeFrames=Number.isInteger(cropEnd)&&Number.isInteger(this.cropStart)&&Number.isInteger(pos)&&Number.isInteger(baseStep)&&Math.abs(baseStep)<=4294967296&&this.cropStart>=0&&cropEnd<=4294967296&&pos>=this.cropStart&&pos<cropEnd;\n    for(let i=0;i<frames;i++){\n     const frame=currentFrame+i;if(frame>=stopFrame){if(hasRenderedFrames){this.position=pos;this.head0=this.head1=pos;this.grainPhase=0;}this.ended=true;this.port.postMessage({type:'ended'});return false;}if(frame<startFrame)continue;\n     const position=wholeFrames?pos:this.wrap(pos),index=Math.floor(position),fraction=position-index;\n     const next=index+1<cropEnd?index+1:cropStartFloor;\n     out[0][i]=left[index]+(left[next]-left[index])*fraction;\n     if(nch>1)out[1][i]=right[index]+(right[next]-right[index])*fraction;\n     for(let ch=2;ch<nch;ch++){const buffer=channels[Math.min(ch,channels.length-1)];out[ch][i]=buffer[index]+(buffer[next]-buffer[index])*fraction;}\n     pos=this.wrap(pos+baseStep);\n    }\n    if(hasRenderedFrames){this.position=pos;this.head0=this.head1=pos;this.grainPhase=0;}}\n  }else{\n  for(let i=0;i<frames;i++){\n   const frame=currentFrame+i;if(frame>=this.stopFrame){this.ended=true;this.port.postMessage({type:'ended'});return false;}if(frame<this.startFrame)continue;\n   const previousRate=this.motion.rate,rate=this.motion.step(dt,this.bpm,frame/sampleRate),active=this.motion.active;this.motionAcceleration=this.feel==='soft'?this.motion.acceleration:(rate-previousRate)/dt;\n   if(active&&!this.lastActive&&this.wet<.0001){this.head0=this.head1=this.position;this.grainPhase=0;}\n   this.lastActive=active;\n   const wanted=this.mode==='granular'&&active&&!this.motion.dragging?1:0;this.wet+=(wanted-this.wet)*this.wetCoefficient;if(this.wet<.00001&&wanted===0)this.wet=0;\n   // GA2: no grains are audible in the strictly dry motion path.\n   // Preserve motion, dry interpolation, sample clock and state, but\n   // bypass unused Hann lookup and wet/grain readers.\n   if(this.wet===0&&this.dragFadeLeft===0){\n    this.loc(this.position,0);\n    for(let ch=0;ch<out.length;ch++)out[ch][i]=this.at(ch,0);\n    this.position=this.wrap(this.position+baseStep*rate);\n    this.head0=this.head1=this.position;this.grainPhase=0;\n    continue;\n   }\n   const phase=this.grainPhase/this.frameSpan,wi=phase*1024,index=Math.floor(wi),fraction=wi-index,w0=XEN_PHASE_HANN[index]+(XEN_PHASE_HANN[index+1]-XEN_PHASE_HANN[index])*fraction;\n   for(let ch=0;ch<out.length;ch++){\n    if(ch===0){this.loc(this.position,0);if(this.wet!==0){this.loc(this.head0,1);this.loc(this.head1,2);}if(this.dragFadeLeft>0)this.loc(this.dragFadeFrom,3);}const dry=this.at(ch,0);\n    let output=this.wet===0?dry:dry*(1-this.wet)+(this.at(ch,1)*w0+this.at(ch,2)*(1-w0))*this.wet;\n    // Very short, allocation-free de-click after discrete browser pointer events.\n    if(this.dragFadeLeft>0){const fade=1-this.dragFadeLeft/this.dragFadeFrames;output=this.at(ch,3)*(1-fade)+output*fade;}\n    out[ch][i]=output;\n   }\n   if(this.dragFadeLeft>0){this.dragFadeFrom=this.wrap(this.dragFadeFrom+baseStep);this.dragFadeLeft--;}\n   this.position=this.wrap(this.position+baseStep*rate);\n   if(this.wet>0){this.head0=this.wrap(this.head0+baseStep);this.head1=this.wrap(this.head1+baseStep);this.grainPhase++;\n    if(this.grainPhase===Math.floor(this.frameSpan/2))this.head1=this.align(this.position,this.head0,baseStep);\n    if(this.grainPhase>=this.frameSpan){this.grainPhase=0;this.head0=this.align(this.position,this.head1,baseStep);}\n   }else{this.head0=this.head1=this.position;this.grainPhase=0;}\n  }\n  }\n  const reportFrame=currentFrame+frames;\n  if(reportFrame>this.startFrame&&(((this.reportPending||this.motion.active)&&reportFrame>=this.nextReportFrame)||(!this.motion.active&&this.reportedActive))){\n   this.port.postMessage({type:'motion',phase:this.motion.phase,target:this.motion.target,rate:this.motion.rate,acceleration:this.motionAcceleration,active:this.motion.active,mode:this.mode,feel:this.feel,curve:this.feel==='soft'&&this.motion.curve?{...this.motion.curve}:null,audioTime:reportFrame/sampleRate});\n   this.nextReportFrame=reportFrame+Math.ceil(sampleRate/30);this.reportedActive=this.motion.active;this.reportPending=false;\n  }\n  return true;\n }\n}\nregisterProcessor('xen-material-phase-v1',XenMaterialPhase);\n";
 /* Each identity is a private decoded AudioBuffer in the material cache.
  * Never key by material ID: re-imports/new decoding need a new source bank.
  * Keys are scoped to AudioContext; an obsolete Context never shares PCM. */
 const sourceKeys=new WeakMap();let nextSourceKey=0;
 function bankKey(ctx,buffer){let byCtx=sourceKeys.get(buffer);
  if(!byCtx){byCtx=new WeakMap();sourceKeys.set(buffer,byCtx);}
  let key=byCtx.get(ctx);if(!key){key='bank-'+(++nextSourceKey).toString(36);byCtx.set(ctx,key);}return key;
 }
 const contexts=new WeakMap(),failed=new WeakSet();
 const diagnostics={version:3,state:'idle',materials:{},banks:{hits:0,misses:0,transferredBytes:0}};
 if(typeof globalThis!=='undefined')globalThis.__XEN_MATERIAL_PHASE_DIAGNOSTICS__=diagnostics;
 async function ensure(ctx){
  if(failed.has(ctx)||!ctx?.audioWorklet||typeof AudioWorkletNode!=='function')return false;
  let task=contexts.get(ctx);if(task)return task;
  task=(async()=>{for(const scheme of (typeof location!=='undefined'&&location.protocol==='file:'?['data','blob']:['blob','data'])){
   let url;try{url=scheme==='data'?'data:application/javascript;charset=utf-8,'+encodeURIComponent(code):URL.createObjectURL(new Blob([code],{type:'application/javascript'}));await ctx.audioWorklet.addModule(url);diagnostics.state='ready';return true;}catch(error){diagnostics.reason=String(error?.message??error);}finally{if(scheme==='blob'&&url)URL.revokeObjectURL(url);}
  }diagnostics.state='unavailable';return false;})();contexts.set(ctx,task);if(!await task)contexts.delete(ctx);return task;
 }
 /* XPERF-12A: prioritize real browser task yield over clamped nested timers.
  * Do not use a microtask: it would starve input and transport scheduling.
  * A per-preparation MessageChannel serves unsupported schedulers (Firefox);
  * periodic timer turns remain the task-source fairness fallback. */
 async function __xenMaterialPrepYield(sequence,messageYield){
  /* Every fourth yield uses a timer to avoid starving browser task sources. */
  if(sequence%4!==0&&typeof scheduler!=='undefined'&&typeof scheduler.yield==='function'){
   try{await scheduler.yield();return;}catch{}
  }
  if(sequence%4!==0&&messageYield){
   try{const task=messageYield();if(task){await task;return;}}catch{}
  }
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 /* RT guard: clone large source banks in bounded chunks. A material selection must
  * not monopolize the main thread that schedules the Drum/Bass transport.
  * This is preparation, NEVER a second audio clock; audio output remains worklet-owned.
  * A superseded selection releases its incomplete bank before a new PCM post. */
 async function copyChannelsCooperatively(buffer,stillCurrent){
  const channels=[];let prepYieldSequence=0,channel=null,receive=null;
  const postMessageYield=()=>{
   if(typeof MessageChannel!=='function')return null;
   if(!channel){channel=new MessageChannel();channel.port1.onmessage=()=>{const fn=receive;receive=null;fn?.();};}
   return new Promise(resolve=>{receive=resolve;channel.port2.postMessage(0);});
  };
  try{
  for(let ch=0;ch<buffer.numberOfChannels;ch++){
   if(!stillCurrent())return null;
   const src=buffer.getChannelData(ch),copy=new Float32Array(src.length);
   for(let i=0;i<src.length;i+=32768){
    copy.set(src.subarray(i,Math.min(i+32768,src.length)),i);
    if(!stillCurrent())return null;
    if(i+32768<src.length&&((i>>>15)&1)===1){
     await __xenMaterialPrepYield(++prepYieldSequence,postMessageYield);
     if(!stillCurrent())return null;
    }
   }
   channels.push(copy);
  }
  return channels;
  }finally{if(channel){channel.port1.onmessage=null;channel.port1.close();channel.port2.close();}}
 }
 async function create(ctx,buffer,stillCurrent=()=>true){const __xm0=performance.now();
  if(!stillCurrent()||ctx.state==='closed'||buffer.numberOfChannels>2||buffer.length*buffer.numberOfChannels*4>64*1024*1024||!await ensure(ctx))return null;
  if(!stillCurrent())return null;
  let node,timer,probeTimer,resolveProbe,voiceId=null,selectedMode='granular',granularFeel='soft',gestureToken=0;
  const bankId=bankKey(ctx,buffer);let cacheHit=false;
  const settlements=new Map();const cancelSettlements=()=>{for(const resolve of settlements.values())resolve(null);settlements.clear();};try{
   node=new AudioWorkletNode(ctx,'xen-material-phase-v1',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
   let finish;const ready=new Promise(resolve=>{finish=resolve;timer=setTimeout(()=>resolve(false),10000)});
   const player={node,onFault:null,ended:false,
    start(plan,offset,attack,mode,id,feel='soft'){try{globalThis.__XenRenderMonitor?.mark('material-player-start',{id,mode},ctx)}catch{}voiceId=id;selectedMode=mode;granularFeel=feel==='hard'?'hard':'soft';__XenNudgeFeedback.begin(id,player,attack,ctx,granularFeel);diagnostics.materials[id]={state:'phase-transport',mode,attack};node.port.postMessage({type:'start',when:plan.startAtSec,offset,baseRate:plan.playbackRate,bpm:plan.bpm,loopStart:plan.loopStartSec,loopEnd:plan.loopEndSec,attack,mode,feel:granularFeel});},
    target(attack,interaction){cancelSettlements();node.port.postMessage({type:'target',attack,time:ctx.currentTime,interaction});},
    beginGesture(interaction){cancelSettlements();node.port.postMessage({type:'gesture-begin',interaction,time:ctx.currentTime});},
    endGesture(interaction){if(selectedMode!=='vinyl'||granularFeel!=='hard'){node.port.postMessage({type:'gesture-end',interaction});return;}const token=++gestureToken;return new Promise(resolve=>{settlements.set(token,resolve);node.port.postMessage({type:'gesture-end',interaction,token});});},
    mode(mode){cancelSettlements();selectedMode=mode;node.port.postMessage({type:'mode',mode,feel:granularFeel});},
    feel(feel){cancelSettlements();granularFeel=feel==='hard'?'hard':'soft';node.port.postMessage({type:'mode',mode:selectedMode,feel:granularFeel});},
    releaseMotion(){cancelSettlements();if(voiceId!==null)__XenNudgeFeedback.release(voiceId,player);},
    dispose(){if(player.ended)return;try{globalThis.__XenRenderMonitor?.mark('material-player-dispose',null,ctx)}catch{}player.ended=true;player.releaseMotion();clearTimeout(timer);clearTimeout(probeTimer);resolveProbe?.(false);resolveProbe=null;try{node.port.postMessage({type:'stop',when:ctx.currentTime})}catch{}try{node.disconnect()}catch{}try{node.port.close()}catch{}}
   };
   node.stop=when=>{try{node.port.postMessage({type:'stop',when:when??ctx.currentTime})}catch{}};
   node.port.onmessage=event=>{if(event.data?.type==='ready'){cacheHit=event.data.cacheHit===true;clearTimeout(probeTimer);resolveProbe?.(cacheHit);resolveProbe=null;finish(true);}else if(event.data?.type==='bank-miss'){clearTimeout(probeTimer);resolveProbe?.(false);resolveProbe=null;}else if(event.data?.type==='gesture-settled'){const m=event.data,resolve=settlements.get(m.token);settlements.delete(m.token);resolve?.(m.attack);}else if(event.data?.type==='motion'){if(!player.ended&&voiceId!==null)__XenNudgeFeedback.push(voiceId,player,event.data);}else if(event.data?.type==='ended'){node.__xenMaterialTransportOff?.();node.__xenMaterialTransportOff=null;node.onended?.();player.dispose();}};
   node.onprocessorerror=()=>{failed.add(ctx);diagnostics.state='processor-error';finish(false);resolveProbe?.(false);resolveProbe=null;player.onFault?.();player.dispose();};
   /* Worklet probes the bank before any main-thread PCM copy. A missing or
    * evicted bank runs the exact XPERF-12A cooperative copy-and-transfer path. */
   const probe=new Promise(resolve=>{resolveProbe=resolve;probeTimer=setTimeout(()=>{resolveProbe=null;resolve(false);},40);});
   node.port.postMessage({type:'bank-probe',bankId,sampleRate:buffer.sampleRate,length:buffer.length,nch:buffer.numberOfChannels});
   const found=await probe;
   if(!stillCurrent()||ctx.state==='closed'||player.ended){player.dispose();return null;}
   if(!found){
    const channels=await copyChannelsCooperatively(buffer,stillCurrent);
    if(!channels||!stillCurrent()||ctx.state==='closed'||player.ended){player.dispose();return null;}
    diagnostics.banks.transferredBytes+=channels.reduce((sum,ch)=>sum+ch.byteLength,0);
    node.port.postMessage({type:'load',bankId,sampleRate:buffer.sampleRate,channels},channels.map(ch=>ch.buffer));
   }
   const ok=await ready;clearTimeout(timer);clearTimeout(probeTimer);
   if(ok){if(cacheHit)diagnostics.banks.hits++;else diagnostics.banks.misses++;}try{globalThis.__XenRenderMonitor?.mark('material-player-create',{ms:performance.now()-__xm0,frames:buffer.length,ch:buffer.numberOfChannels,ok,cacheHit},ctx)}catch{}if(!ok||ctx.state==='closed'){player.dispose();return null}return player;
  }catch(error){clearTimeout(timer);clearTimeout(probeTimer);resolveProbe?.(false);try{node?.disconnect()}catch{}try{node?.port.close()}catch{}diagnostics.state='fallback';diagnostics.reason=String(error?.message??error);return null;}
 }
 return Object.freeze({ensure,create});
})();

/* P9-N3: audio-owned, per-material display feedback. No display timer drives DSP. */
const __XenNudgeFeedback=(()=>{
 const idle=Object.freeze({live:false,active:false,phase:0,target:0,rate:1,acceleration:0,feel:'soft',audioTime:0,curve:null});
 const owners=new Map(),contexts=new Map(),states=new Map(),listeners=new Map(),previews=new Map();
 function emit(id){for(const fn of listeners.get(id)??[])fn();}
 function begin(id,owner,attack,ctx,feel='soft'){previews.delete(id);owners.set(id,owner);contexts.set(id,ctx);states.set(id,Object.freeze({...idle,live:true,phase:-attack,target:-attack,feel}));emit(id);}
 function push(id,owner,m){
  if(owners.get(id)!==owner||![m.phase,m.target,m.rate,m.acceleration].every(Number.isFinite))return;
  const k=m.curve,curve=k&&[k.c0,k.c1,k.c2,k.c3,k.c4,k.c5,k.duration,k.elapsed,k.beat,k.end].every(Number.isFinite)&&k.duration>0&&k.elapsed>=0&&k.elapsed<=k.duration&&k.beat>0?Object.freeze({...k}):null;
  states.set(id,Object.freeze({live:true,active:m.active===true,phase:m.phase,target:m.target,rate:m.rate,acceleration:m.acceleration,feel:m.feel==='hard'?'hard':'soft',audioTime:Number.isFinite(m.audioTime)?m.audioTime:0,curve}));emit(id);
 }
 function release(id,owner){if(owners.get(id)!==owner)return;previews.delete(id);owners.delete(id);contexts.delete(id);states.delete(id);emit(id);}
 function preview(id,attack){
  if(!owners.has(id))return;
  previews.set(id,{phase:-attack,released:false});emit(id);
 }
 function endPreview(id,force=false){const p=previews.get(id);if(!p)return;
  if(force)previews.delete(id);else previews.set(id,{...p,released:true});emit(id);
 }
 function get(id){const state=states.get(id)??idle,p=previews.get(id);
  return p===undefined?state:{...state,phase:p.phase,target:p.phase,rate:1,active:!p.released,curve:null,feel:'hard'};
 }
 function subscribe(id,fn){let set=listeners.get(id);if(!set){set=new Set();listeners.set(id,set)}set.add(fn);return()=>{set.delete(fn);if(!set.size)listeners.delete(id)};}
 return Object.freeze({begin,push,release,preview,endPreview,get,subscribe,context:id=>contexts.get(id)});
})();

/* Session-scoped One-Shot assignments. Resource ownership remains with its library.
   The legacy storage key is retained until the canonical Session migration. */
/* P34 META COHESION START */
const __XenOneShotAssignments=(()=>{
 const KEY='xensonar.one-shot-fill-probe.v0',listeners=new Set();
 const VALID=new Set(['material','rootFollow','drum','instrumentSample','instrumentRendered']);
 let state=Object.freeze({}),revision=0;
 try{const raw=JSON.parse(localStorage.getItem(KEY)||'{}');if(raw&&typeof raw==='object'&&!Array.isArray(raw))state=Object.freeze(raw)}catch{}
 // React subscribes to an immutable revision, not to a stale legacy-storage object.
 const snapshot=()=>revision,subscribe=fn=>(listeners.add(fn),()=>listeners.delete(fn));
 const emit=()=>{revision++;for(const fn of listeners)fn()};
 const sessionKey=id=>id?'session:'+String(id):'working';

 const group=kind=>kind==='drum'?'drum':'melodic';
 const read=id=>{
  if(id&&typeof __XenMetaSessions!=='undefined'){
   const row=__XenMetaSessions.snapshot().saved.find(item=>item.id===id);
   if(row&&Object.hasOwn(row,'oneShotFills'))return row.oneShotFills;
  }
  if(!id&&typeof __XenMetaSessions!=='undefined'){
   const canonical=__XenMetaSessions.workingOneShots();
   if(canonical)return canonical;
  }
  const data=state[sessionKey(id)];return data&&typeof data==='object'?data:{melodic:[],drum:[]};
 };
 const mutate=(id,operation)=>{
  const key=sessionKey(id),old=read(id),next={melodic:[...(old.melodic||[])],drum:[...(old.drum||[])]};
  const result=operation(next);
  if(result===false)return false;
  if(id){
   // Commit through the existing canonical V2 Session transaction. No second
   // persistent saved-Session owner, and failures leave the slot unchanged.
   if(!__XenMetaSessions.updateSavedOneShots(id,next))return false;
   emit();return true;
  }
  // Anonymous working copy is owned by the same Session V2 working serializer.
  if(!__XenMetaSessions.updateWorkingOneShots(next))return false;
  emit();return true;
 };
 const assign=(id,entry)=>{
  if(!entry||!VALID.has(entry.kind)||typeof entry.id!=='string'||!entry.id||typeof entry.name!=='string')return false;
  const role=group(entry.kind);
  return mutate(id,draft=>{
   if(draft[role].some(item=>item.kind===entry.kind&&item.id===entry.id))return false;
   if(draft[role].length>=12)return false;
   // The existing Session V2 codec validates and preserves the typed snapshot.
   // Do not claim that a sample asset exists merely because an ID was assigned.
   if(entry.kind==='instrumentSample'||entry.kind==='instrumentRendered'){
    if(role!=='melodic'||!__XenP36InstrumentFillTransfer.valid(entry))return false;
    draft[role].push({...entry});
   }else draft[role].push({kind:entry.kind,id:entry.id,name:entry.name,playbackRole:'one-shot',volume:1,pan:0,...(role==='melodic'?{pitch:0}:{})});
  });
 };
 // P36-5G: pressing the source arrow again creates an independent Fill instance,
 // rather than silently rejecting the source's stable library identifier.
 // Source identity stays in sourceProvenance; instance identity owns edits/history.
 const assignTransfer=(id,source)=>{
  if(!id||!['instrumentSample','instrumentRendered'].includes(source?.kind)||!__XenP36InstrumentFillTransfer.valid(source))
   return {ok:false,reason:'Instrument source or saved Session is invalid.'};
  const slots=read(id).melodic||[];
  if(slots.length>=12)return {ok:false,reason:'Melodic Fills already contains 12 entries. Remove an existing Fill before adding another.'};
  const used=new Set(slots.filter(item=>item?.kind===source.kind).map(item=>item.id));
  let copy=1,uid=source.id;
  while(used.has(uid)&&copy<13){copy++;uid=source.id+'~'+copy;}
  if(used.has(uid))return {ok:false,reason:'No free Melodic Fill instance identifier.'};
  const item=copy===1?{...source}:{...source,id:uid,name:(source.name.slice(0,232)+' · '+copy).slice(0,240)};
  if(!__XenP36InstrumentFillTransfer.valid(item))return {ok:false,reason:'The instrument cannot be represented as an independent Fill.'};
  let changedDuringCommit=false;
  const ok=mutate(id,draft=>{
   if(draft.melodic.length>=12||draft.melodic.some(row=>row.kind===item.kind&&row.id===item.id)){
    changedDuringCommit=true;return false;
   }
   draft.melodic.push(item);
  });
  if(!ok)return {ok:false,reason:changedDuringCommit?'The Fill list changed during transfer; retry.':
   (__XenMetaSessions.snapshot().error||'Session storage rejected the Fill; original Session remains unchanged.')};
  const persisted=(read(id).melodic||[]).find(row=>row.kind===item.kind&&row.id===item.id);
  if(!persisted||!__XenP36InstrumentFillTransfer.valid(persisted))
   return {ok:false,reason:'The saved Fill could not be verified after commit.'};
  return {ok:true,item:persisted,copy};
 };
 const remove=(id,role,index)=>mutate(id,draft=>{
  if(!['melodic','drum'].includes(role)||!Number.isInteger(index)||index<0||index>=draft[role].length)return false;
  draft[role].splice(index,1)
 });
 const setParam=(id,role,index,param,value)=>mutate(id,draft=>{
  if(!['melodic','drum'].includes(role)||!Number.isInteger(index)||index<0||index>=draft[role].length)return false;
  const ranges={volume:[0,2],pan:[-1,1],pitch:[-24,24]};
  if(!Object.hasOwn(ranges,param)||role==='drum'&&param==='pitch')return false;
  const n=Number(value),[min,max]=ranges[param];if(!Number.isFinite(n)||n<min||n>max)return false;
  draft[role][index]={...draft[role][index],[param]:param==='pitch'?Math.round(n):n};
 });
  // P36-4: one atomic, session-owned editor commit. Do not rename the library
  // source: name is strictly a label on this one assigned Fill slot.
  const setSettings=(id,role,index,expectedKind,expectedId,values)=>mutate(id,draft=>{
   if(!['melodic','drum'].includes(role)||!Number.isInteger(index)||index<0||index>=draft[role].length)return false;
   const item=draft[role][index];
   if(!item||item.kind!==expectedKind||item.id!==expectedId)return false;
   if(!values||typeof values.name!=='string')return false;
   const name=values.name.trim();
   if(!name||name.length>100||/[\x00-\x1f\x7f]/.test(name))return false;
   const volume=Number(values.volume),pan=Number(values.pan),pitch=Number(values.pitch);
   if(!Number.isFinite(volume)||volume<0||volume>2||
      !Number.isFinite(pan)||pan< -1||pan>1||
      (role==='melodic'&&(!Number.isInteger(pitch)||pitch< -24||pitch>24)))return false;
   const isNative=item.kind==='instrumentSample'||item.kind==='instrumentRendered';
   const rawLength=values.samplePlaybackLengthSec;
   if(isNative&&rawLength!==null&&(item.kind==='instrumentRendered'||!Number.isFinite(rawLength)||rawLength<.05||rawLength>600))return false;
   draft[role][index]={...item,name,volume,pan,...(role==='melodic'?{pitch}:{}),
    ...(isNative?{samplePlaybackLengthSec:item.kind==='instrumentRendered'?null:rawLength??null}:{})};
  });
  // Session-scoped Fill palette, not a mutation of the original resource library.
  // Reuse Meta's existing Frame / Background semantics with strict CSS hex validation.
  const setColor=(id,role,index,channel,value)=>mutate(id,draft=>{
   if(!['melodic','drum'].includes(role)||!Number.isInteger(index)||index<0||index>=draft[role].length)return false;
   if(!['border','background'].includes(channel)||typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))return false;
   const prop=channel==='border'?'fillFrame':'fillPlate';
   draft[role][index]={...draft[role][index],[prop]:value.toLowerCase()};
  });
  const resetColor=(id,role,index)=>mutate(id,draft=>{
   if(!['melodic','drum'].includes(role)||!Number.isInteger(index)||index<0||index>=draft[role].length)return false;
   const next={...draft[role][index]};delete next.fillFrame;delete next.fillPlate;draft[role][index]=next;
  });
 // This time model intentionally follows the main room BPM, not source BPM.
 // Represents a free-phase one-bar window, without quantization to the global bar line.
 const barSeconds=(bpm,beatsPerBar=4)=>{
  const tempo=Number(bpm),beats=Number(beatsPerBar);
  if(!(tempo>0&&tempo<=1000&&Number.isFinite(beats)&&beats>0&&beats<=32))throw Error('Invalid Live Room musical clock');
  return 60*beats/tempo;
 };
 return Object.freeze({snapshot,subscribe,refresh:emit,sessionKey,group,read,assign,assignTransfer,remove,setParam,setSettings,setColor,resetColor,barSeconds});
})();


/* One-Shot output is a borrowed port of the mounted Live Room audio graph.
   The Live Room owns the context and master bus; this bridge owns neither. */
const __XenOneShotLivePort=(()=>{
 let current=null,powerActive=false;
 return Object.freeze({
  setPower(active){
   powerActive=active===true;
   if(!powerActive&&typeof __XenOneShotAudio!=='undefined')__XenOneShotAudio.stopAll();
  },
  attach(ctx,getBus){
   if(!ctx||typeof getBus!=='function')return()=>{};
   const binding={ctx,getBus};current=binding;
   return()=>{if(current===binding)current=null};
  },
  current(){
   const binding=current;
   if(!powerActive||!binding||binding.ctx.state!=='running')throw Error('Live Room Power must be active before playing a Fill.');
   const destination=binding.getBus(binding.ctx);
   if(!destination||destination.context!==binding.ctx)throw Error('Live Room master audio destination is unavailable.');
   return {ctx:binding.ctx,destination};
  }
 });
})();

/* One-Shot audio renderer: source-format dispatch, free-phase bar timing, bounded voices.
   The original library and live transport owners are never taken over. */
/* PITCH-HQ-01: the One-Shot offline PCM worker queue is shared with the
   Material Track pitch variants (same worker, same budget). Set once below. */
let __xenSharedOfflinePCMWorker=null;
const __XenOneShotAudio=(()=>{
 const prepared=new Map(),voices=new Set(),decodedSources=new Map();let drumOwner=null,previewVoice=null,previewTicket=0;
 // OSQR-PCMR-01: cold decoded source and hot rendered variants have distinct, bounded lifetimes.
 // Rendering is offline and never schedules Grains on the actual Live Room AudioContext.
 let sourceEpoch=0;const sourceGenerations={drum:0,material:0,rootFollow:0,instrumentSample:0,instrumentRendered:0};
 const SOURCE_BUDGET=24*1024*1024,VARIANT_BUDGET=48*1024*1024;
 const pcmBytes=buffer=>buffer?buffer.length*buffer.numberOfChannels*4:0;
 const memoryBound=(map,budget,getSize,maxCount)=>{
   let bytes=0;for(const v of map.values())bytes+=getSize(v);
   for(const [key,row] of map){
     if(bytes<=budget&&map.size<=maxCount)break;
     if(row.status==='preparing')continue;
     bytes-=getSize(row);map.delete(key);
   }
 };
 const touch=(map,key,row)=>{map.delete(key);map.set(key,row)};
 async function decodeSource(key,blob){
   const cached=decodedSources.get(key);
   if(cached){touch(decodedSources,key,cached);return cached.promise;}
   const epoch=sourceEpoch;
   const entry={status:'preparing',value:null,promise:null};
   decodedSources.set(key,entry);
   entry.promise=(async()=>{
     // Decode away from the Live Room AudioContext; no live AudioNode access.
     const Offline=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;
     if(!Offline)throw Error('Independent offline decoder unavailable.');
     const decoder=new Offline(2,128,44100);
     return await decoder.decodeAudioData((await blob.arrayBuffer()).slice(0));
   })().then(buffer=>{
     entry.status='ready';entry.value=buffer;
     if(epoch===sourceEpoch&&decodedSources.get(key)===entry)
       memoryBound(decodedSources,SOURCE_BUDGET,row=>pcmBytes(row.value),8);
     return buffer;
   },err=>{if(decodedSources.get(key)===entry)decodedSources.delete(key);throw err});
   return entry.promise;
 }

// PCMR-03: a non-realtime Worker owns grain arithmetic. No WebAudio nodes,
// Live Room AudioContext, AudioWorklet callbacks, or Session operations in it.
// The worker is deliberately not an AudioWorklet: that would put heavy offline
// calculation back under render-quantum realtime constraints.
const __xenOSQRWorkerCode=String.raw`"use strict";
// PCMR-04: Quality-bounded offline ONE-SHOT renderer. This runs only in a
// dedicated Worker, never in AudioWorklet's time-critical audio quantum.
// Windowed-sinc interpolation is polyphase-tabulated and bandlimited for pitch>1.
// PITCH-HQ-01: time-preserving, seamless LOOP render (Material Track pitch).
// Same kernel and registration principle as the one-shot path below, but the
// source and the output are cyclic: no edge fades, no boundary reflection,
// unity level. The one-shot path is untouched.
function xenRenderLoop(d){
 const {id,rate,pitch,channels}=d;
 if(!Number.isFinite(rate)||rate<8000||!Number.isFinite(pitch)||pitch<.24||pitch>4.01||
    !Array.isArray(channels)||!channels.length||channels.length>2||
    channels.some(c=>!(c instanceof Float32Array)||c.length!==channels[0].length))
  throw Error('Invalid loop render parameters');
 const L=channels[0].length;
 if(L<Math.round(.03*rate)||L>rate*600)throw Error('Loop length outside renderable range');
 for(const ch of channels)for(let i=0;i<L;i++)if(!Number.isFinite(ch[i]))throw Error('Non-finite input PCM cannot be rendered safely');
 const outputs=channels.map(()=>new Float32Array(L)),weights=new Float32Array(L);
 if(Math.abs(pitch-1)<1e-9){
  for(let c=0;c<channels.length;c++)outputs[c].set(channels[c]);
  self.postMessage({id,channels:outputs,grainCount:0,renderer:'pitchhq-loop-direct'},outputs.map(c=>c.buffer));return;
 }
 const nG=Math.max(2,Math.round(L/(.06*rate))),hop=L/nG;
 const taps=80,half=taps/2,phases=1024,cutoff=.47/Math.max(1,pitch);
 const kernels=new Float32Array(taps*(phases+1));
 for(let phase=0;phase<=phases;phase++){
  const fraction=phase/phases,off=phase*taps;let norm=0;
  for(let k=0;k<taps;k++){
   const x=k-(half-1)-fraction,angle=2*Math.PI*cutoff*x;
   const sinc=Math.abs(angle)<1e-9?1:Math.sin(angle)/angle;
   const win=.42-.5*Math.cos(2*Math.PI*k/(taps-1))+.08*Math.cos(4*Math.PI*k/(taps-1));
   const value=2*cutoff*sinc*win;kernels[off+k]=value;norm+=value;
  }
  if(Math.abs(norm)<1e-12)throw Error('Invalid sinc kernel');
  for(let k=0;k<taps;k++)kernels[off+k]/=norm;
 }
 const wrap=i=>{i%=L;return i<0?i+L:i};
 const sample=(channel,pos)=>{
  const base=Math.floor(pos),phase=Math.min(phases,Math.max(0,Math.round((pos-base)*phases)));
  const off=phase*taps,input=channels[channel],s0=base-half+1;let value=0;
  if(s0>=0&&s0+taps<=L)for(let i=0;i<taps;i++)value+=input[s0+i]*kernels[off+i];
  else for(let i=0;i<taps;i++)value+=input[wrap(s0+i)]*kernels[off+i];
  return value;
 };
 const linear=(channel,pos)=>{const i=Math.floor(pos),f=pos-i;return channels[channel][wrap(i)]*(1-f)+channels[channel][wrap(i+1)]*f};
 const transientMaterial=channels.some(input=>{
  const block=Math.max(64,Math.round(.012*rate));
  for(let i=0;i<L;i+=block){
   const end=Math.min(L,i+block);let sum2=0,peak=0,n=0;
   for(let j=i;j<end;j+=2){const v=Math.abs(input[j]);sum2+=v*v;peak=Math.max(peak,v);n++;}
   if(n>=12&&peak>.03&&peak*peak>18*sum2/n)return true;
  }
  return false;
 });
 const maxShift=Math.round(.006*rate),searchStep=Math.max(2,Math.floor(rate/8000)),checkStep=Math.max(2,Math.floor(rate/6000));
 for(let k=0;k<nG;k++){
  const center=k*hop,j0=Math.ceil(center-hop),j1=Math.ceil(center+hop);
  let shift=0;
  if(k>0&&!transientMaterial){
   // One source-time offset for the whole stereo signal, aligned against the
   // output already accumulated (previous grain; for the last grain also grain 0).
   const check=at=>{const scores=[];
    for(let ch=0;ch<outputs.length;ch++){let xy=0,xx=0,yy=0,n=0;
     for(let j=j0;j<j1;j+=checkStep){const dst=wrap(j),w=weights[dst];if(w<.2)continue;
      const x=outputs[ch][dst]/w,y=linear(ch,center+at+(j-center)*pitch);xy+=x*y;xx+=x*x;yy+=y*y;n++;}
     scores.push(n>=16&&xx>1e-7&&yy>1e-7?xy/Math.sqrt(xx*yy):null);}
    return scores;};
   const base=check(0),active=base.map((v,i)=>v!==null?i:-1).filter(i=>i>=0);
   if(active.length){
    const average=scores=>active.reduce((v,i)=>v+scores[i],0)/active.length;
    const baseScore=average(base);let bestScore=-2,bestAt=0;
    for(let at=-maxShift;at<=maxShift;at+=searchStep){const scores=check(at);
     if(active.some(i=>scores[i]===null||scores[i]<base[i]-.025))continue;
     const score=average(scores)-.008*Math.abs(at)/maxShift;if(score>bestScore){bestScore=score;bestAt=at;}}
    if(bestScore>.78&&bestScore>baseScore+.08)shift=bestAt;
   }
  }
  for(let j=j0;j<j1;j++){
   const w=.5-.5*Math.cos(Math.PI*(j-center+hop)/hop);if(w<1e-10)continue;
   const dst=wrap(j);weights[dst]+=w;const pos=center+shift+(j-center)*pitch;
   for(let ch=0;ch<outputs.length;ch++)outputs[ch][dst]+=sample(ch,pos)*w;
  }
 }
 for(let i=0;i<L;i++){const norm=weights[i]>1e-9?1/weights[i]:0;
  for(let ch=0;ch<outputs.length;ch++){const v=outputs[ch][i]*norm;if(!Number.isFinite(v))throw Error('Invalid offline PCM output');outputs[ch][i]=v;}}
 self.postMessage({id,channels:outputs,grainCount:nG,renderer:'pitchhq-loop-sinc80'},outputs.map(c=>c.buffer));
}
self.onmessage=e=>{
 const d=e.data;
 if(!d||d.type!=="render")return;
 if(d.loop===true){try{xenRenderLoop(d)}catch(error){self.postMessage({id:d.id,error:String(error?.message||error)})}return;}
 try{
  const {id,rate,sourceRate,frames,pitch,start,span,regionEnd,channels}=d;
  if(!Number.isFinite(rate)||rate<8000||!Number.isFinite(sourceRate)||sourceRate<8000||
     !Number.isInteger(frames)||frames<1||frames>rate*30||
     !Number.isFinite(pitch)||pitch<.24||pitch>4.01||
     !Number.isFinite(start)||!Number.isFinite(span)||!(span>0)||
     !Number.isFinite(regionEnd)||!(regionEnd>start)||
     !Array.isArray(channels)||!channels.length||channels.length>2||
     channels.some(c=>!(c instanceof Float32Array)||!c.length||c.length>sourceRate*600))
    throw Error('Invalid offline render parameters');
  const first=Math.max(0,Math.ceil(start*sourceRate)),
   last=Math.min(channels[0].length-1,Math.floor(regionEnd*sourceRate)-1);
  if(last<first||channels.some(c=>c.length<=last))throw Error('Empty/mismatched source PCM region');
  for(const ch of channels)for(let i=first;i<=last;i++)
   if(!Number.isFinite(ch[i]))throw Error('Non-finite input PCM cannot be rendered safely');
  const outputs=channels.map(()=>new Float32Array(frames));
  // Same principle as MaterialPhase's native PCM reader: no granular DSP
  // where the source already has precisely the requested pitch and duration.
  // Keep the one-shot's intrinsic edge envelope and the same 0.9 level.
  if(Math.abs(pitch-1)<1e-9&&rate===sourceRate&&last-first+1===frames){
   const tailFrames=Math.min(frames,Math.max(2,Math.round(.010*rate)));
   const attackFrames=Math.min(frames,Math.max(2,Math.round(.001*rate)));
   for(let i=0;i<frames;i++){
    const attack=i<attackFrames?.5-.5*Math.cos(Math.PI*i/(attackFrames-1)):1;
    const tail=i>=frames-tailFrames?.5-.5*Math.cos(Math.PI*(frames-1-i)/(tailFrames-1)):1;
    const f=.9*attack*tail;
    for(let ch=0;ch<outputs.length;ch++)outputs[ch][i]=channels[ch][first+i]*f;
   }
   self.postMessage({id,channels:outputs,grainCount:0,renderer:'osqr-pcmr06-direct-pcm'},outputs.map(c=>c.buffer));return;
  }
  const weights=new Float32Array(frames);
  const seconds=frames/rate,hop=.06,grainSec=.12,count=Math.ceil(seconds/hop);
  if(count>512)throw Error('Offline grain capacity exceeded');
  // A phase table avoids expensive trigonometric work per output sample.
  // 80-tap Blackman-windowed sinc; cutoff is below the source Nyquist
  // required after pitch-up, suppressing foldback aliasing.
  const taps=80,half=taps/2,phases=1024;
  const cutoff=.47/Math.max(1,pitch*sourceRate/rate);
  const kernels=new Float32Array(taps*(phases+1));
  for(let phase=0;phase<=phases;phase++){
   const fraction=phase/phases,off=phase*taps;
   let norm=0;
   for(let k=0;k<taps;k++){
    const x=k-(half-1)-fraction;
    const angle=2*Math.PI*cutoff*x;
    const sinc=Math.abs(angle)<1e-9?1:Math.sin(angle)/angle;
    const win=.42-.5*Math.cos(2*Math.PI*k/(taps-1))+.08*Math.cos(4*Math.PI*k/(taps-1));
    const value=2*cutoff*sinc*win;
    kernels[off+k]=value;norm+=value;
   }
   if(Math.abs(norm)<1e-12)throw Error('Invalid sinc kernel');
   for(let k=0;k<taps;k++)kernels[off+k]/=norm;
  }
  // Reflect indices at the source boundary. That preserves value continuity
  // even for exceptionally short audio clips; never splice to zeros between grains.
  const reflect=index=>{
   const size=last-first+1;if(size===1)return first;
   const period=2*(size-1);let offset=(index-first)%period;
   if(offset<0)offset+=period;
   return first+(offset<size?offset:period-offset);
  };
  const sample=(channel,pos)=>{
   const base=Math.floor(pos),fraction=pos-base;
   const phase=Math.min(phases,Math.max(0,Math.round(fraction*phases)));
   const off=phase*taps;let value=0;
   const input=channels[channel];
   for(let i=0;i<taps;i++)value+=input[reflect(base+i-half+1)]*kernels[off+i];
   return value;
  };
  // Detect sparse attacks at SOURCE scope. Mixed per-grain alignment and
  // per-grain bypass can modulate another stereo channel around a transient.
  // A percussive one-shot keeps the legacy time guide for its whole take;
  // stationary sustained material alone qualifies for correlation alignment.
  const transientMaterial=channels.some(input=>{
   const block=Math.max(64,Math.round(.012*sourceRate));
   for(let i=first;i<=last;i+=block){
    const end=Math.min(last+1,i+block);let sum2=0,peak=0,n=0;
    for(let j=i;j<end;j+=2){const v=Math.abs(input[j]);sum2+=v*v;peak=Math.max(peak,v);n++;}
    if(n>=12&&peak>.03&&peak*peak>18*sum2/n)return true;
   }
   return false;
  });
  let nGrains=0;
  const regionStart=first/sourceRate,regionFinish=(last+1)/sourceRate;
  for(let k=0;k<count;k++){
   const rel=k*hop,begin=Math.round(rel*rate);
   if(begin>=frames)break;
   const grainFrames=Math.min(frames-begin,Math.floor(Math.min(grainSec,seconds-rel)*rate));
   if(grainFrames<2)continue;
   nGrains++;
   const grainSpan=(grainFrames-1)*pitch/sourceRate*(sourceRate/rate);
   // Prefer the intended source time, but slide the *whole* grain backwards
   // near the end rather than truncating a partial grain and renormalizing a
   // discontinuity. Very short regions use reflected boundary extension.
   const desired=start+(rel/seconds)*span;
   const maxStart=Math.max(regionStart,regionFinish-grainSpan-1/sourceRate);
   // Reference-inspired offline grain registration: align a new reader with the
   // output already accumulated in its actual overlap. It is bounded to a
   // local ±6 ms search near the original time-guide position, never a live
   // AudioWorklet operation or a second transport clock.
   const anchored=Math.max(regionStart,Math.min(desired,maxStart));
   let sourceStart=anchored;
   if(k>0&&Math.abs(pitch-1)>1e-6&&
      weights[begin+Math.floor(Math.min(grainFrames-1,rate*.02))]>.05&&!transientMaterial){
    const len=Math.min(grainFrames,Math.floor(hop*rate));
    const from=Math.max(regionStart,anchored-.006),to=Math.min(maxStart,anchored+.006);
    const step=Math.max(2,Math.floor(rate/6000));
    const linear=(channel,pos)=>{const i=Math.floor(pos),f=pos-i;
     return channels[channel][reflect(i)]*(1-f)+channels[channel][reflect(i+1)]*f;};
    // One source-time offset for the whole stereo signal. Never optimize just
    // the left channel and thereby cause phase cancellation on the right.
    const check=where=>{
     const scores=[];
     for(let ch=0;ch<outputs.length;ch++){
      let xy=0,xx=0,yy=0,n=0;
      for(let j=step;j<len-step;j+=step){
       const dst=begin+j,w=weights[dst];if(w<.2)continue;
       const x=outputs[ch][dst]/w;
       const y=linear(ch,(where+j*pitch/rate)*sourceRate);
       xy+=x*y;xx+=x*x;yy+=y*y;n++;
      }
      // An approximately silent channel is not evidence of poor alignment:
      // exclude it rather than creating an impossible dual-channel target.
      scores.push(n>=16&&xx>1e-7&&yy>1e-7?xy/Math.sqrt(xx*yy):null);
     }
     return scores;
    };
    const base=check(anchored),active=base.map((v,i)=>v!==null?i:-1).filter(i=>i>=0);
    if(active.length){
     const average=scores=>active.reduce((v,i)=>v+scores[i],0)/active.length;
     const baseScore=average(base);let bestScore=-2,bestAt=anchored;
     for(let at=from;at<=to+1e-10;at+=Math.max(2,Math.floor(sourceRate/8000))/sourceRate){
      const scores=check(at);
      // A genuine improvement must not sacrifice another audible channel.
      if(active.some(i=>scores[i]===null||scores[i]<base[i]-.025))continue;
      const score=average(scores)-.008*Math.abs(at-anchored)/.006;
      if(score>bestScore){bestScore=score;bestAt=at;}
     }
     if(bestScore>.78&&bestScore>baseScore+.08)sourceStart=bestAt;
    }
   }
   for(let j=0;j<grainFrames;j++){
    const dst=begin+j;
    const win=.5-.5*Math.cos(2*Math.PI*j/(grainFrames-1));
    if(win<1e-10)continue;
    weights[dst]+=win;
    const pos=(sourceStart+j*pitch/rate)*sourceRate;
    for(let ch=0;ch<outputs.length;ch++)outputs[ch][dst]+=sample(ch,pos)*win;
   }
  }
  if(!nGrains)throw Error('No usable source grains');
  // Render a self-contained PCM envelope. Last sample is exactly zero;
  // source boundary handling above ensures no earlier hidden signal/silence cuts.
  const tailFrames=Math.min(frames,Math.max(2,Math.round(.010*rate)));
  const attackFrames=Math.min(frames,Math.max(2,Math.round(.001*rate)));
  for(let frame=0;frame<frames;frame++){
   const norm=weights[frame]>1e-9?.9/weights[frame]:0;
   const tail=frame>=frames-tailFrames?
    .5-.5*Math.cos(Math.PI*(frames-1-frame)/(tailFrames-1)):1;
   const attack=frame<attackFrames?
    .5-.5*Math.cos(Math.PI*frame/(attackFrames-1)):1;
   const factor=norm*tail*attack;
   for(let ch=0;ch<outputs.length;ch++){
    const result=outputs[ch][frame]*factor;
    if(!Number.isFinite(result))throw Error('Invalid offline PCM output');
    outputs[ch][frame]=result;
   }
  }
  self.postMessage({id,channels:outputs,grainCount:nGrains,renderer:'osqr-pcmr06-experimental-global-transient-guard-sinc80'},outputs.map(c=>c.buffer));
 }catch(error){self.postMessage({id:d.id,error:String(error?.message||error)});}
};`;
const __xenOSQRPCMWorker=(()=>{
 let worker=null,serial=0,active=null,bytesReserved=0;
 const queued=[],waiting=new Map();
 // Worker input snapshots + result arrays + AudioBuffer-copy allowance, not
 // merely the ready-variant LRU. At most one job runs, two await admission.
 const MAX_JOBS=8,MAX_RESERVED=96*1024*1024,MAX_PER_JOB=48*1024*1024;
 function release(row){bytesReserved=Math.max(0,bytesReserved-row.bytes)}
 function failAll(error){
  if(active){const job=active;active=null;waiting.delete(job.id);release(job);job.reject(error)}
  while(queued.length){const job=queued.shift();waiting.delete(job.id);release(job);job.reject(error)}
 }
 function ensure(){
  if(worker)return worker;
  if(typeof Worker!=='function'||typeof Blob!=='function'||typeof URL?.createObjectURL!=='function')
   throw Error('Background Worker unavailable; silent PCM preparation disabled.');
  const url=URL.createObjectURL(new Blob([__xenOSQRWorkerCode],{type:'text/javascript'}));
  try{worker=new Worker(url,{name:'xensonar-oneshot-pcm-offline'});}
  finally{URL.revokeObjectURL(url)}
  worker.onmessage=event=>{
   const {id,error,channels,grainCount}=event.data||{},row=waiting.get(id);
   if(!row||row!==active)return;
   waiting.delete(id);active=null;
   if(error){release(row);row.reject(Error(error));}
   else{
    // Keep the allocation reserved until AudioBuffer.copyToChannel completes.
    let released=false;
    row.resolve({channels,grainCount,release(){if(!released){released=true;release(row)}}});
   }
   pump();
  };
  worker.onerror=event=>{
   const error=Error('Offline PCM Worker failed: '+(event?.message||'unknown'));
   failAll(error);worker?.terminate();worker=null;
  };
  return worker;
 }
 function pump(){
  if(active||!queued.length)return;
  let w;try{w=ensure()}catch(error){failAll(error);return}
  active=queued.shift();
  try{w.postMessage({type:'render',id:active.id,...active.args},active.args.channels.map(c=>c.buffer));
    active.args=null; // transferred arrays no longer hold useful data
  }catch(error){
   const row=active;active=null;waiting.delete(row.id);release(row);row.reject(error);pump();
  }
 }
 return Object.freeze({render(args){
  const sourceBytes=args.channels.reduce((n,c)=>n+c.byteLength,0);
  const framesBytes=args.frames*args.channels.length*4;
  // Source snapshot (main + worker) and output (worker + AudioBuffer) are
  // conservatively charged while the job is pending or running.
  const reserve=2*(sourceBytes+framesBytes)+1024*1024;
  if(!Number.isSafeInteger(reserve)||reserve>MAX_PER_JOB||
     waiting.size>=MAX_JOBS||bytesReserved+reserve>MAX_RESERVED)
   return Promise.reject(Error('Offline PCM render capacity busy; retry when preparation completes.'));
  const id=++serial;bytesReserved+=reserve;
  return new Promise((resolve,reject)=>{
   const row={id,args,bytes:reserve,resolve,reject};waiting.set(id,row);queued.push(row);pump();
  });
 },pending:()=>waiting.size,budget:()=>({jobs:waiting.size,bytesReserved,maxJobs:MAX_JOBS,maxBytes:MAX_RESERVED})});
})();
__xenSharedOfflinePCMWorker=__xenOSQRPCMWorker;
async function renderMaterialPCM(item,t,data){
 const source=data.buffer,rate=source?.sampleRate;
 if(!source||!(data.sourceSeconds>.002)||!(t.seconds>.002)||!(rate>=8000))
  throw Error('OneShot PCM source/clock is not renderable.');
 const frames=Math.ceil(t.seconds*rate);
 if(frames>rate*30)throw Error('OneShot bar is too long for bounded PCM.');
 const channelCount=Math.min(2,source.numberOfChannels);
 // Immutable source snapshot: transfer copied channel data, never detach
 // AudioBuffer's original channels or touch the Live Room PCM graph.
 const regionStart=Math.max(0,Math.floor(data.start*rate));
 const regionEnd=Math.min(source.length,Math.ceil(Math.min(source.duration,data.start+data.sourceSeconds)*rate));
 if(regionEnd-regionStart<2)throw Error('Source PCM region is too short');
 const channels=Array.from({length:channelCount},(_,ch)=>source.getChannelData(ch).slice(regionStart,regionEnd));
 const pitch=Math.pow(2,Math.max(-24,Math.min(24,Number(item.pitch??0)))/12);
 const result=await __xenOSQRPCMWorker.render({rate,sourceRate:source.sampleRate,frames,pitch,
  start:0,span:(regionEnd-regionStart)/rate,regionEnd:(regionEnd-regionStart)/rate,channels});
 try{
  const buffer=new AudioBuffer({length:frames,numberOfChannels:channelCount,sampleRate:rate});
  for(let ch=0;ch<channelCount;ch++)buffer.copyToChannel(result.channels[ch],ch);
  return {kind:'materialPCM',storageFormat:data.storageFormat,buffer};
 }finally{result.release()};
}
 // Native library mutations invalidate prepared PCM, but never interrupt a live voice.
 for(const event of ['xensonar:drum-config-updated','xensonar:drum-config-deleted','xensonar:drum-config-registered','xensonar:drum-pattern-playlist-updated','xensonar:material-updated','xensonar:material-deleted','xensonar:material-registered']){
  window.addEventListener(event,()=>{
    const kind=event.includes(':drum-')?'drum':'material';
    sourceGenerations[kind]++;
    if(kind==='material'){sourceGenerations.rootFollow++;sourceEpoch++;decodedSources.clear();}
    for(const key of prepared.keys())if(key.startsWith(kind+'|')||(kind==='material'&&key.startsWith('rootFollow|')))prepared.delete(key);
  });
 }
 // The native Sample Database has its own mutation event and generation owner.
 window.addEventListener('xensonar:melodic-sample-library-updated',e=>{
  // A Sample ID is nested inside a preset; invalidate this small cache namespace.
  sourceEpoch++;sourceGenerations.instrumentSample++;
  for(const key of prepared.keys())if(key.startsWith('instrumentSample|'))prepared.delete(key);
  decodedSources.clear();
 });
 const sourceKey=(item,clock)=>[item.kind,(item.kind==='instrumentRendered'||item.kind==='instrumentSample')?item.sourceProvenance?.presetId:item.id,clock.bpm,clock.beatsPerBar,Number(item.pitch??0),
  ...(item.kind==='instrumentSample'?[item.samplePlaybackLengthSec??'full',item.sourceProvenance?.assetDigest??'missing'] : []),
  ...(item.kind==='instrumentRendered'?[item.sourceProvenance?.rendererId??'missing',item.sourceProvenance?.renderPresetId??'missing']:[]),
  sourceGenerations[item.kind]??0, 'osqr-pcmr06-experimental-global-transient-guard-sinc80-v1'].join('|');
 // Library namespace is a locator, not the Fill's playback role or audio format.
 // The source bank already stores independent sourceKind/renderMode metadata.
 function resolveSource(item){
  if(!item||typeof item.id!=='string'||!item.id)throw Error('Missing Fill resource identity.');
  const metadata={playbackRole:'one-shot',locatorKind:item.kind,id:item.id};
  if(item.kind==='drum')return {...metadata,storageFormat:'drum-events'};
  if(item.kind!=='material'&&item.kind!=='rootFollow')throw Error('Unsupported source-library locator.');
  const bank=typeof Yp==='function'?Yp():null;
  const config=bank?.memberIds?.includes(item.id)?bank.entryConfigs?.[item.id]:null;
  const audio=typeof bs==='function'?bs().entries.find(e=>e.id===item.id):null;
  const hasRawAudio=!!audio?.blob?.size;
  const hasSynth=!!(config?.sourceKind==='synth'&&config?.renderMode==='direct'&&config.synthPattern?.notes?.length);
  // A source can have both a saved PCM snapshot and a synthetic plan.
  // Preserve its chosen stored representation: never activate the Root Follow role.
  const requested=item.storageFormat;
  if(requested==='synthetic'&&!hasSynth)throw Error('Saved synthetic representation is unavailable for this resource.');
  if(requested==='raw-audio'&&!hasRawAudio)throw Error('Saved Raw Audio representation is unavailable for this resource.');
  if(requested==='synthetic'||(!requested&&item.kind==='rootFollow'&&hasSynth)||(!requested&&!hasRawAudio&&hasSynth)){
   const notes=config.synthPattern.notes;
   const usesSamples=notes.some(note=>note.sourceMaterialId||['material-import','sample-block','synth-frozen-sample'].includes(note.renderSourceKind)||
      ['material-base','material-fragment'].includes(note.noteClass)||
      String(note.instrumentPresetOverride??'').startsWith('sample:'))||
      config.synthPattern.tracks.some(track=>String(track.instrumentPreset??'').startsWith('sample:'));
   return {...metadata,storageFormat:usesSamples?'hybrid':'synthetic',playbackBackend:'structured-events',config};
  }
  if(hasRawAudio){
   const hybrid=/hybrid/i.test(String(audio.renderMode??''))||/hybrid/i.test(String(audio.workspaceOrigin??''));
   return {...metadata,storageFormat:hybrid?'hybrid':'raw-audio',playbackBackend:'pcm',audio};
  }
  if(config?.sourceKind==='material'||item.kind==='material')return {...metadata,storageFormat:'raw-audio',playbackBackend:'pcm',audio:null};
  if(config?.sourceKind==='synth')return {...metadata,storageFormat:'synthetic',playbackBackend:'structured-events',config,unsupported:true};
  throw Error('Original audio package has neither a Raw Audio buffer nor a structured synthetic representation.');
 }
 function synthFirstBarComposer(config,clock,pitchSemitones=0){
  const src=config?.synthPattern;
  if(!src?.notes?.length||!Array.isArray(src.tracks)||!src.tracks.length)
   throw Error('Saved Synthetic package has no playable event structure.');
  const originBeats=Number(src.beatsPerBar)||4;
  const beatRatio=clock.beatsPerBar/originBeats;
  const firstBar=src.notes.filter(note=>Number.isFinite(note.startBeat)&&note.startBeat>=0&&note.startBeat<originBeats);
  if(!firstBar.length)throw Error('First source bar has no synthetic events.');
  // Each stored event is given its own pitch-line index. This preserves even
  // freely positioned, overlapping notes whose original channel indices coincide.
  const baseHz=Math.max(20,Number(src.baseHz)||220),transpose=Math.pow(2,pitchSemitones/12);
  const pitchLines=[],pitchSteps=[],notes=[];
  const barEnd=clock.beatsPerBar;
  for(const saved of firstBar){
   const start=saved.startBeat*beatRatio;
   const length=Math.min(barEnd-start,(Number(saved.durationBeats)||.25)*beatRatio);
   if(!(length>0))continue;
   if(notes.length>=512)throw Error('Synthetic Fill exceeds safe event limit (512).');
   const index=pitchLines.length;
   const hz=Math.max(20,Math.min(16000,(Number(saved.lineHz)||baseHz)*transpose));
   pitchLines.push({hz,ratio:hz/(baseHz*transpose),offsetCents:0});
   pitchSteps.push({ratio:hz/(baseHz*transpose),offsetCents:0,muted:false});
   notes.push({...saved,startBeat:start,endBeat:start+length,durationBeats:length,
       channelIndex:index,lineId:null,gridStepOffset:0,octaveOffset:0});
  }
  if(!notes.length)throw Error('First source bar has no synthetic events in range.');
  const originalActive=new Set(src.activeTrackIds?.length?src.activeTrackIds:src.tracks.filter(t=>t.enabled!==false).map(t=>t.id));
  const tracks=src.tracks.map(t=>{
   const patch=config.synthPatch?.trackPatches?.find(row=>row.id===t.id);
   const preset=t.instrumentPreset??patch?.instrumentPreset??null;
   if(!preset&&originalActive.has(t.id)&&notes.some(n=>n.trackId===t.id&&!n.instrumentPresetOverride))
    throw Error('Saved synthetic instrument is missing for track '+t.id+'.');
   return {...t,instrumentPreset:preset,enabled:t.enabled!==false&&originalActive.has(t.id)};
  });
  return {bars:1,beatsPerBar:clock.beatsPerBar,stepsPerBar:Math.max(1,Number(src.stepsPerBar)||16),
    segmentCount:Math.max(1,Number(src.segmentCount)||4),baseHz:baseHz*transpose,
    tuning:src.tuning??'12edo',repetitionModel:src.repetitionModel??'octave',
    pitchLines,pitchSteps,timeGuideMarkers:[],tracks,notes,
    activeTrackIds:tracks.filter(t=>t.enabled!==false).map(t=>t.id)};
 }

 function clock(){
  const raw=__XenMainRoomSessionBridge.liveClock();
  const bpm=Number(raw.bpm),beatsPerBar=Number(raw.beatsPerBar);
  const seconds=__XenOneShotAssignments.barSeconds(bpm,beatsPerBar);
  return {bpm,beatsPerBar,seconds};
 }
 function attachDrumOwner(read){
  drumOwner=read;
  queueMicrotask(()=>{if(drumOwner!==read)return;const snapshot=__XenMetaSessions.snapshot();
   const id=snapshot.activePalette?.id??snapshot.loadedId??null;
   for(const item of __XenOneShotAssignments.read(id).drum||[])void prepare(item).catch(()=>{});
  });
  return()=>{if(drumOwner===read)drumOwner=null};
 };
 async function prepare(item,providedClock){
  if(!item||!['drum','material','rootFollow','instrumentSample','instrumentRendered'].includes(item.kind))throw Error('Unsupported Fill source locator.');
  const t=providedClock||clock(),key=sourceKey(item,t);
  let row=prepared.get(key);if(row){touch(prepared,key,row);return row.promise;}
  if([...prepared.values()].filter(value=>value.status==='preparing').length>=8)
   throw Error('Too many pending OneShot preparations; retry after current render jobs finish.');
  row={status:'preparing',value:null,promise:null};prepared.set(key,row);
  row.promise=(async()=>{
   if(item.kind==='instrumentRendered'){
    if(!__XenP36InstrumentFillTransfer.valid(item))throw Error('Invalid saved native-variant assignment.');
    const preset=item.sourceProvenance.renderPresetId;
    if(__XenP36InstrumentFillTransfer.rendererPresetId(item.sourceProvenance.role,item.sourceProvenance.presetId)!==preset)
     throw Error('Native PCM preset is no longer the saved source identity.');
    // Do not accidentally fall through to $3.subPulse: only the typed native
    // variant adapter or an existing engine-specific source adapter may render.
    const explicit=preset.startsWith('particle:')||preset.startsWith('wave:');
    if(explicit&&!Uye(preset))throw Error('No native Melodic adapter for this preset.');
    if(!explicit&&!['nodal:','entrophon:'].some(prefix=>preset.startsWith(prefix)))
     throw Error('Native PCM renderer is not available for this instrument.');
    const hz=(item.sourceProvenance.role==='particle'?330:220)*Math.pow(2,item.pitch/12);
    const composer={bars:1,beatsPerBar:t.beatsPerBar,stepsPerBar:16,segmentCount:4,
     baseHz:hz,tuning:'12edo',repetitionModel:'octave',
     pitchLines:[{hz,ratio:1,offsetCents:0}],pitchSteps:[{ratio:1,offsetCents:0,muted:false}],
     timeGuideMarkers:[],tracks:[{id:'p36-native',instrumentPreset:preset,
      instrumentRole:item.sourceProvenance.role,volume:.8,pan:0,enabled:true}],
     notes:[{id:'p36-native-note',trackId:'p36-native',channelIndex:0,startBeat:0,
      endBeat:Math.min(t.beatsPerBar,1),durationBeats:Math.min(t.beatsPerBar,1),velocity:1}],
     activeTrackIds:['p36-native']};
    const buffer=await z$({composer,bpm:t.bpm,bars:1,trackIds:['p36-native'],
      customDrumPattern:null,drumLevel:0,drumCycleBars:1},{excludeDrums:true,tailSec:.04});
    if(!buffer?.duration)throw Error('Native Melodic adapter produced no PCM.');
    const data=buffer.getChannelData(0);let power=0;
    for(let i=0;i<data.length;i+=Math.max(1,Math.floor(data.length/512)))power+=data[i]*data[i];
    if(power<1e-12)throw Error('Native Melodic adapter produced silent PCM.');
    return {kind:'synthetic',storageFormat:'engine-pcm',buffer};
   }
   if(item.kind==='instrumentSample'){
    if(!__XenP36InstrumentFillTransfer.valid(item))throw Error('Invalid Session sample assignment.');
    const record=await __xenSampleReadRecord(item.sourceProvenance.sampleId);
    if(!record?.blob?.size)throw Error('The saved native Sample Database asset is missing.');
    const digest=await __XenP36InstrumentFillTransfer.digest(record.blob);
    if(digest!==item.sourceProvenance.assetDigest)throw Error('The Sample Database asset changed after Fill transfer.');
    const buffer=await decodeSource('sample|'+item.sourceProvenance.sampleId+'|'+digest+'|'+sourceEpoch,record.blob);
    const seconds=item.samplePlaybackLengthSec==null?buffer.duration:Math.min(buffer.duration,item.samplePlaybackLengthSec);
    if(!(seconds>.002))throw Error('Saved sample has no usable audio region.');
    return await renderMaterialPCM(item,t,{kind:'material',storageFormat:'raw-audio',buffer,start:0,sourceSeconds:seconds});
   }
   await __XenStarterMaterial.ensure({kind:item.kind,id:item.id});
   const source=resolveSource(item);
   if(source.playbackBackend==='structured-events'){
    if(source.unsupported)throw Error('Saved synthetic audio package is incomplete.');
    const composer=synthFirstBarComposer(source.config,t,Math.max(-24,Math.min(24,Number(item.pitch??0))));
    const request={composer,bpm:t.bpm,bars:1,trackIds:composer.activeTrackIds,
      customDrumPattern:null,drumLevel:0,drumCycleBars:1};
    const buffer=await z$(request,{excludeDrums:true,tailSec:.04});
    if(!buffer||!buffer.duration)throw Error('The native synthetic renderer returned no audio.');
    return {kind:'synthetic',storageFormat:source.storageFormat,buffer};
   }
   if(source.playbackBackend==='pcm'){
    const data=source.audio??bs().entries.find(e=>e.id===item.id);
    if(!data?.blob?.size)throw Error('Original Material audio blob is unavailable.');
    const buffer=await decodeSource('asset|'+item.id+'|'+sourceEpoch,data.blob);
    const start=Math.max(0,Number(data.loopStartSec)||0);
    const end=Math.min(buffer.duration,Number.isFinite(data.loopEndSec)&&data.loopEndSec>start?data.loopEndSec:buffer.duration);
    const bars=Math.max(1,Number(data.bars)||1);
    const span=(end-start)/bars;
    if(!(span>.002))throw Error('Material first bar contains no playable audio.');
    return await renderMaterialPCM(item,t,{kind:'material',storageFormat:source.storageFormat,buffer,start,sourceSeconds:span});
   }
   const input=drumOwner?.();if(!input)throw Error('Native Drum owner is not mounted.');
   const selected=input.drumEntries.find(e=>e.id===item.id);
   if(!selected)throw Error('Original Drum pattern is missing.');
   const params=JSON.parse(JSON.stringify(input.params));
   const saved=selected.kind==='exported'?input.exportedDrums.find(e=>e.id===selected.value):null;
   if(selected.kind==='exported'&&!saved)throw Error('Original saved Drum pattern is missing.');
   const grid=saved?im({...JSON.parse(JSON.stringify(saved)),useCustom:true}):null;
   const original=grid??__mlGridFromSelection({pattern:selected.value});
   const first=wg(original,1,original.segmentsPerBar,original.segmentMarkers);first.useCustom=true;
   const request={composer:{bars:1,beatsPerBar:t.beatsPerBar,stepsPerBar:16,notes:[],tracks:[],activeTrackIds:[]},
     bars:1,bpm:t.bpm,trackIds:[],drumCycleBars:1,customDrumPattern:first,
     drumKit:saved?.drumKit??params.drumKit,drumLevel:1,drumStyle:saved?.drumStyle??Q9(params),
     drumLaneKitOverrides:saved?.laneKitOverrides??saved?.drumLaneKits??params.drumLaneKits??{},
     drumLaneSettings:saved?.laneSettings??params.drumLaneSettings??{}};
   for(const lane of __f52SampleLanes){const id=first.sampleSlots?.[lane]?.id;if(id&&!(await gw(id)))throw Error('Missing drum sample: '+id)}
   const buffer=await z$(request,{drumOnly:true,tailSec:.04});
   if(!buffer||!buffer.duration)throw Error('The native Drum renderer produced no audio.');
   return {kind:'drum',storageFormat:'drum-events',buffer};
  })().then(value=>{
    row.status='ready';row.value=value;
    if(prepared.get(key)===row)memoryBound(prepared,VARIANT_BUDGET,row=>pcmBytes(row.value?.buffer),16);
    return value;
  },error=>{if(prepared.get(key)===row)prepared.delete(key);throw error});
  return row.promise;
 }
 function clearVoice(owner){if(owner.done)return;owner.done=true;voices.delete(owner);if(previewVoice===owner)previewVoice=null;try{owner.nodes.forEach(n=>n.disconnect?.())}catch{}if(owner.eqId&&!owner.preview&&!([...voices].some(v=>!v.done&&v.eqId===owner.eqId&&v.ctx===owner.ctx&&v.destination===owner.destination)))__XenEQ.releaseRoute(owner.ctx,'oneShot',owner.destination,owner.eqId);}
 // Shared audio-parameter smoothing is the same contract as the main-room mixer;
 // a Fill needs its own short-lived nodes, not a second persistent mixer system.
 // P36-5: a native sampled sound must not inherit the Fill's legacy .72 attenuation.
 // This compensates one known level-domain discrepancy, NOT full timbre equivalence.
 const volumeValue=item=>(['instrumentSample','instrumentRendered'].includes(item.kind)?1:.72)*Math.max(0,Math.min(2,Number(item.volume??1)));
 const panValue=item=>Math.max(-1,Math.min(1,Number(item.pan??0)));
 function mix(ctx,destination,at,item,end){
  const gain=ctx.createGain(),pan=ctx.createStereoPanner(),volume=volumeValue(item);
  gain.gain.setValueAtTime(volume,at);
  gain.gain.setValueAtTime(volume,Math.max(at,end-.008));
  gain.gain.linearRampToValueAtTime(0,end);
  pan.pan.setValueAtTime(panValue(item),at);
  gain.connect(pan);pan.connect(destination);
  return {gain,pan};
 }

// PCMR-03: silent settings do not address active voices. The live EQ owner
// retains its expressly live behavior; these three settings do not.
 function firePrepared(item,t,data,sessionId=null,previewPort=null){
  // Live trigger keeps its original guarded port. Only Meta preview supplies the
  // existing independent PCM audition AudioContext and destination.
  // PCMR-05: reject an unprepared voice *before* reserving its EQ route.
  // Every buffer class has its own true audible end. An early-ending drum or
  // synthetic buffer must fade before its BufferSource naturally stops, not
  // at the later nominal Live-Room bar boundary.
  if(!data.buffer||!['drum','synthetic','materialPCM'].includes(data.kind))
   throw Error('OneShot PCM variant is not ready.');
  const audibleSeconds=Math.min(t.seconds,data.buffer.duration);
  if(!Number.isFinite(audibleSeconds)||audibleSeconds<=0)
   throw Error('OneShot PCM has no audible duration.');
  const {ctx,destination}=previewPort??__XenOneShotLivePort.current();
  const at=ctx.currentTime+.004,end=at+t.seconds,audibleEnd=at+audibleSeconds;
  // One shared EQ instance per assigned source and destination, not a DSP clone per triggered voice.
  const fillBus=previewPort?destination:__XenEQ.route(ctx,'oneShot',destination,item.kind+'|'+item.id);
  const output=mix(ctx,fillBus,at,item,audibleEnd),owner={done:false,nodes:[output.gain,output.pan],sources:[],
   sessionId,kind:item.kind,id:item.id,ctx,at,end,audibleEnd,gain:output.gain,pan:output.pan,preview:!!previewPort,destination,eqId:previewPort?null:item.kind+'|'+item.id,
   volume:volumeValue(item),panning:panValue(item)};
  voices.add(owner);
  const audible=[...voices].filter(v=>!v.done&&!v.retiring);
  if(audible.length>8){
    const oldest=audible.find(v=>v!==owner);
    if(oldest){
      oldest.retiring=true;const now=oldest.ctx.currentTime,fadeEnd=now+.008;
      try{
        const endpoint=oldest.audibleEnd??oldest.end;
        const fadeStart=Math.max(oldest.at??now,endpoint-.008);
        const remaining=endpoint<=now?0:now>=fadeStart?
          oldest.volume*(endpoint-now)/Math.max(1e-6,endpoint-fadeStart):oldest.volume;
        oldest.gain.gain.cancelScheduledValues(now);
        oldest.gain.gain.setValueAtTime(Math.max(0,remaining),now);
        oldest.gain.gain.linearRampToValueAtTime(0,fadeEnd);
      }catch{}
      for(const source of oldest.sources)try{source.stop(fadeEnd+.002)}catch{}
      setTimeout(()=>clearVoice(oldest),40);
    }
  }
  const connect=source=>{source.connect(output.gain);owner.sources.push(source);owner.nodes.push(source)};
  // All Fill classes now enter the same ONE ready-PCM playback seam; there
  // are no realtime material grain nodes in the one-shot trigger.
  const source=ctx.createBufferSource();source.buffer=data.buffer;connect(source);
  source.onended=()=>clearVoice(owner);
  source.start(at,0,audibleSeconds);source.stop(audibleEnd);
  setTimeout(()=>clearVoice(owner),Math.ceil(audibleSeconds*1000)+120);
  if(previewPort)previewVoice=owner;
  return {start:at,end,bpm:t.bpm,beats:t.beatsPerBar};
 }
 function stopPreview(){
  ++previewTicket;
  const owner=previewVoice;previewVoice=null;
  if(!owner)return;
  for(const source of owner.sources)try{source.stop()}catch{}
  clearVoice(owner);
 }
 async function preview(item){
  if(previewVoice?.id===item?.id&&previewVoice.kind===item.kind){
   stopPreview();return {ok:true,message:'Fill preview stopped.'};
  }
  stopPreview();
  const ticket=previewTicket;
  // The same independent Context used by Grid & Loops previews. Resume on
  // user activation, before asynchronous preparation can consume the gesture.
  const ctx=__XenSessionPCM.getContext();
  if(ctx.state==='suspended')await ctx.resume();
  if(ctx.state!=='running')throw Error('Meta preview audio context could not start.');
  const t=clock(),data=await prepare(item,t);
  if(ticket!==previewTicket)return {ok:false,message:'Preview cancelled.'};
  // A prepared buffer is not proof of audible output; reject silent PCM before advertising playback.
  if(data.buffer){
   const length=data.buffer.length||0,channels=data.buffer.numberOfChannels||1;
   let energy=0,peak=0,samples=0;
   const step=Math.max(1,Math.floor(length/512));
   for(let channel=0;channel<channels;channel++){
    const pcm=data.buffer.getChannelData(channel);
    for(let k=0;k<pcm.length;k+=step){const v=pcm[k];energy+=v*v;peak=Math.max(peak,Math.abs(v));samples++;}
   }
   if(!samples||peak<1e-6||energy/samples<1e-12)throw Error('Fill preview rendered silent PCM.');
  }
  // Same renderer, first-bar window, PCM/granular reading, gain and pan.
  // Live Room Power and its master bus are deliberately never consulted.
  firePrepared(item,t,data,null,{ctx,destination:ctx.destination});
  return {ok:true,message:'▶ '+item.name+' · independent Fill preview'};
 }
 async function trigger(item,sessionId=null){
  // Trigger is a pure ready-PCM lookup. A cold fill starts background preparation
  // but MUST NOT await a renderer in the time-critical input-handler path.
  const t=clock(),key=sourceKey(item,t),row=prepared.get(key);
  if(row?.status!=='ready'){
   if(!row)void prepare(item,t).catch(error=>console.warn('[xensonar][fill-prepare]',error));
   return {ok:false,message:'Preparing '+item.name+' in background · play when ready.'};
  }
  const data=row.value;
  // Render/read may take time. Do not fire a stale sound into another Session,
  // with an obsolete pitch, changed sample, or a changed musical clock.
  const current=__XenMetaSessions.snapshot();
  const activeId=current.activePalette?.id??current.loadedId??null;
  const latest=__XenOneShotAssignments.read(sessionId)[__XenOneShotAssignments.group(item.kind)]
   ?.find(x=>x.kind===item.kind&&x.id===item.id);
  if(activeId!==sessionId||!latest||sourceKey(latest,clock())!==key)
   return {ok:false,message:'Fill changed while preparing · play the current sound.'};
  // Live Room Power and master bus remain mandatory; never substitute Meta audio.
  const result=firePrepared(latest,t,data,sessionId);
  window.dispatchEvent(new CustomEvent('xensonar:one-shot-fill-started',{detail:{kind:'one-shot-fill',playbackRole:'one-shot',sourceLibraryKind:latest.kind,storageFormat:data.storageFormat,id:latest.id,...result}}));
  return {ok:true,message:'▶ '+latest.name+' · one live-room bar'};
 }
 return Object.freeze({clock,resolveSource,synthFirstBarComposer,attachDrumOwner,prepare,trigger,preview,stopPreview,stopAll(){for(const owner of [...voices]){if(owner.preview)continue;for(const source of owner.sources)try{source.stop()}catch{}clearVoice(owner)}},__testFirePrepared:firePrepared,__testRenderMaterialPCM:renderMaterialPCM,
   prepared:()=>[...prepared].map(([key,value])=>({key,status:value.status,bytes:pcmBytes(value.value?.buffer)})),
   cachedSourceCount:()=>decodedSources.size,activeVoices:()=>voices.size,
   renderBudget:()=>__xenOSQRPCMWorker.budget()});
})();
/* PITCH-HQ-01: a resting Material Track pitch plays a pre-rendered,
   time-preserving loop variant from the shared offline PCM worker (80-tap
   windowed-sinc granular, cyclic). The realtime lane shifter only bridges the
   difference while the hand moves. Variants live with the decoded source buffer
   (WeakMap), at most the active and the newest per source; nothing is persisted.
   Loops whose render would exceed the worker job budget keep the realtime path. */
const __XenMaterialPitchVariants=(()=>{
 const REST_MS=350,JOB_LIMIT=48*1024*1024;
 const bySource=new WeakMap(),sources=new Map(),active=new Map(),versions=new Map(),timers=new Map(),lastPitch=new Map(),listeners=new Set();
 let revision=0;
 const emit=()=>{for(const fn of listeners)fn()};
 const bump=id=>{versions.set(id,(versions.get(id)??0)+1);revision++;emit()};
 const regionOf=(buffer,entry)=>{const sr=buffer.sampleRate,len=buffer.length;
  const a=Math.max(0,Math.min(len-1,Math.round((Number(entry?.loopStartSec)||0)*sr)));
  const end=Number.isFinite(entry?.loopEndSec)?entry.loopEndSec:buffer.duration;
  const b=Math.max(a+1,Math.min(len,Math.round(end*sr)));return {a,b}};
 const keyOf=(cents,r)=>cents+'|'+r.a+'|'+r.b;
 const isActive=row=>{for(const v of active.values())if(v.row===row)return true;return false};
 function rowFor(buffer,key,create){
  let map=bySource.get(buffer);if(!map){if(!create)return null;map=new Map();bySource.set(buffer,map)}
  let row=map.get(key);if(!row&&create){row={status:'idle',buffer:null,map,key};map.set(key,row)}return row||null;
 }
 function schedule(id,ms=REST_MS){clearTimeout(timers.get(id));timers.set(id,setTimeout(()=>{timers.delete(id);void render(id)},ms))}
 async function render(id){
  const src=sources.get(id),buffer=src?.buffer.deref(),ctx=src?.ctx.deref();
  if(!buffer||!ctx||ctx.state==='closed')return;
  const cents=__XenMaterialVoiceMix.get(id).pitch,current=active.get(id)?.cents??0;
  if(Math.abs(cents)<.05){if(Math.abs(current)>=.05)bump(id);return}
  const r=regionOf(buffer,src.entry),len=r.b-r.a,count=Math.min(2,buffer.numberOfChannels);
  if(len<Math.round(.03*buffer.sampleRate)||2*(2*len*count*4)+1048576>JOB_LIMIT)return;
  const row=rowFor(buffer,keyOf(cents,r),true);
  if(row.status==='ready'){if(current!==cents)bump(id);return}
  if(row.status!=='idle')return;
  row.status='pending';
  try{
   const channels=[];for(let c=0;c<count;c++)channels.push(buffer.getChannelData(c).slice(r.a,r.b));
   const result=await __xenSharedOfflinePCMWorker.render({loop:true,rate:buffer.sampleRate,sourceRate:buffer.sampleRate,frames:len,pitch:Math.pow(2,cents/1200),channels});
   try{
    if(ctx.state==='closed'){row.status='idle';return}
    const out=ctx.createBuffer(result.channels.length,len,buffer.sampleRate);
    result.channels.forEach((data,i)=>out.copyToChannel(data,i));
    row.buffer=out;row.status='ready';
   }finally{result.release()}
   for(const [key,other] of row.map)if(other!==row&&other.status==='ready'&&!isActive(other))row.map.delete(key);
   if(sources.get(id)?.buffer.deref()===buffer&&__XenMaterialVoiceMix.get(id).pitch===cents&&(active.get(id)?.cents??0)!==cents)bump(id);
  }catch(error){
   const busy=/capacity busy/i.test(String(error?.message||''));
   row.status=busy?'idle':'failed';
   if(busy)schedule(id,1200);
   else console.warn('[xensonar][material-pitch-hq] realtime pitch stays active',id,String(error?.message||error));
  }
 }
 __XenMaterialVoiceMix.subscribe(()=>{for(const id of sources.keys()){const pitch=__XenMaterialVoiceMix.get(id).pitch;if(lastPitch.get(id)!==pitch){lastPitch.set(id,pitch);schedule(id)}}});
 /* Called once per voice start by $fe. Returns the ready variant or null and
    asks for one when a pitch is set. Never blocks the start. */
 function resolve(ctx,buffer,entry,id,cents){
  if(!id||!buffer||typeof WeakRef!=='function')return null;
  sources.set(id,{ctx:new WeakRef(ctx),buffer:new WeakRef(buffer),entry});lastPitch.set(id,cents);
  if(Math.abs(cents)>=.05){
   const row=rowFor(buffer,keyOf(cents,regionOf(buffer,entry)),false);
   if(row?.status==='ready'&&row.buffer&&row.buffer.sampleRate===ctx.sampleRate){
    active.set(id,{cents,row});
    return {buffer:row.buffer,cents,entry:{...entry,loopStartSec:0,loopEndSec:row.buffer.duration}};
   }
   schedule(id,0);
  }
  active.delete(id);return null;
 }
 if(typeof globalThis!=='undefined')globalThis.__XEN_MATERIAL_PITCH_HQ__={get state(){return {revision,active:Object.fromEntries([...active].map(([id,v])=>[id,v.cents]))}}};
 return Object.freeze({resolve,version:id=>versions.get(id)??0,revision:()=>revision,
  subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),
  diagnostics:()=>({revision,active:Object.fromEntries([...active].map(([id,v])=>[id,v.cents]))})});
})();
globalThis.__XenOneShotDebug=Object.freeze({assignments:__XenOneShotAssignments,audio:__XenOneShotAudio,
 silentEdits:()=>__XenOSQRSilentEdit.pending()});

const __XenQuick=(()=>{
 const adapters=new Map(),listeners=new Set(),icons={grid:'🪜',material:'📀',rootFollow:'🎼',drum:'🥁',bass:'🎸'};let active=null,items=[],pulse=0,closeActive=null,storageError='';
 try{const saved=JSON.parse((localStorage.getItem('xensonar.quick-menu.v2')||localStorage.getItem('xensonar.quick-menu.v1')||'[]'));items=__xenValidateQuickItems(saved);}catch(error){storageError='Quick Access: '+error.message}
 let activationSerial=0;
 let selectedByKind={},hotkeys={material:[],rootFollow:[]},tilePulse=null,tileTimer=null,tileSerial=0;
 let snapshot={items,active,pulse,hotkeys,tilePulse,storageError,selectedByKind};const emit=()=>{snapshot={items,active,pulse,hotkeys,tilePulse,storageError,selectedByKind};for(const fn of listeners)fn()};
 function setSelected(kind,id){
  if(!icons[kind]||id===undefined||id===null)return;
  let key=String(id);
  if(kind==='grid'){
   // A tuning ID and a saved Grid tile instance ID are NOT interchangeable.
   // Preserve the activated tile across the asynchronous workbench callback.
   if(__XenBassGrid.liveOverride()?.tuningId===key)return;
   const tileKey=item=>item.instanceId||'legacy:'+item.id;
   const exact=items.find(item=>item.kind==='grid'&&tileKey(item)===key);
   if(exact)key=tileKey(exact);
   else{
    const current=items.find(item=>item.kind==='grid'&&tileKey(item)===selectedByKind.grid);
    if(current?.id===key)return;
    const match=items.find(item=>item.kind==='grid'&&item.id===key);
    key=match?tileKey(match):'legacy:'+key;
   }
  }
  if(selectedByKind[kind]===key)return;
  selectedByKind={...selectedByKind,[kind]:key};emit();
 }
 function syncHotkeys(kind,entries){if(!Object.hasOwn(hotkeys,kind))return;const ids=entries.slice(0,__XenLoopHotkeys.length).map(entry=>entry.id);if(ids.join('\0')===hotkeys[kind].join('\0'))return;hotkeys={...hotkeys,[kind]:ids};emit()}
 function pulseEntry(kind,id){if(tileTimer)clearTimeout(tileTimer);const serial=++tileSerial;tilePulse={kind,id,serial};emit();tileTimer=setTimeout(()=>{tileTimer=null;if(tilePulse?.serial===serial){tilePulse=null;emit()}},220)}
 function save(){try{localStorage.setItem('xensonar.quick-menu.v2',JSON.stringify(items));storageError=''}catch(error){storageError='Quick Access: '+error.message}emit()}
 return {setSelected,restoreSelection(value,override){selectedByKind={...value};__XenBassGrid.setLiveOverride(override);emit()},restoreGridSelection(value,override){selectedByKind={...selectedByKind,grid:value??null};__XenBassGrid.setLiveOverride(override);emit()},clearGridSelection(){selectedByKind={...selectedByKind,grid:null};__XenBassGrid.clearLiveOverride();emit()},refreshLibraries:emit,getItems:()=>items.map(e=>JSON.parse(JSON.stringify(e))),replaceItemsTransient(value){activationSerial++;items=__xenValidateQuickItems(value);emit();return items.map(e=>JSON.parse(JSON.stringify(e)))},replaceItems(value){activationSerial++;const next=__xenValidateQuickItems(value);try{localStorage.setItem('xensonar.quick-menu.v2',JSON.stringify(next))}catch(error){storageError='Quick Access: '+error.message;emit();throw error}items=next;storageError='';emit();return next.map(e=>JSON.parse(JSON.stringify(e)))},icons,adapters,syncHotkeys,pulseEntry,snapshot:()=>snapshot,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),register(kind,adapter){adapters.set(kind,adapter);setSelected(kind,adapter.selected);syncHotkeys(kind,adapter.entries);if(kind==='grid'&&typeof __XenMainRoomSessionBridge!=='undefined')__XenMainRoomSessionBridge.initializeStarter();return()=>{if(adapters.get(kind)===adapter){adapters.delete(kind);syncHotkeys(kind,[])}}},signal(){pulse++;emit()},setActive(value,close){if(value)closeActive=close??closeActive;else closeActive=null;if(active?.kind===value?.kind&&active?.id===value?.id&&active?.name===value?.name)return;active=value;emit()},add(entry){if(!entry||!icons[entry.kind]||typeof entry.id!=='string')return;if(!items.some(e=>__xenGridKey(e)===__xenGridKey(entry))){items=__xenValidateQuickItems([...items,entry.kind==='grid'?{kind:'grid',id:entry.id,name:String(entry.name||entry.id),instanceId:entry.instanceId||__xenGridUid(),gridProfile:entry.gridProfile}: {kind:entry.kind,id:entry.id,name:String(entry.name||entry.id)}]);save()}},remove(entry){
   const next=items.filter(e=>__xenGridKey(e)!==__xenGridKey(entry));
   if(next.length===items.length)return false;
   // M4: A failed localStorage write MUST NOT remove the in-memory tile.
   this.replaceItems(next);
   __XenMaterialLayers.prune(next.filter(e=>e.kind==='material').map(e=>e.id));
   return true;
  },dismiss(){if(!active)return false;closeActive?.();return true},performPrepared:async function(entry,action){const ticket=++activationSerial;try{if(entry.kind==='material'&&String(entry.id).startsWith('loop-rec-'))await __ensureMaterialLibraryHydrated();await __XenStarterMaterial.ensure(entry)}catch(error){if(ticket!==activationSerial)return null;throw error}if(ticket!==activationSerial)return null;return action()},activatePrepared(entry){return this.performPrepared(entry,()=>this.activate(entry))},cancelActivation(){activationSerial++},activate(entry){activationSerial++;const adapter=adapters.get(entry.kind);if(!adapter)return false;const current=adapter.entries.find(e=>e.id===entry.id);if(!current)return false;if(entry.kind==='grid'&&entry.gridProfile){if(!__XenMainRoomSessionBridge.applyGridProfile(entry))return false;}else adapter.choose(current.id);if(entry.kind==='grid'){if(!entry.gridProfile)__XenBassGrid.clearLiveOverride();selectedByKind={...selectedByKind,grid:entry.instanceId||'legacy:'+entry.id};emit()}else setSelected(entry.kind,current.id);pulseEntry(entry.kind,entry.kind==='grid'?(entry.instanceId||'legacy:'+entry.id):current.id);return true;},cycle(dir){
   if(!active)return false;
   const order=['grid','material','rootFollow','drum','bass','meta'],events={grid:'xensonar:open-grid-tuning-rack',material:'xensonar:open-material-loop-manager',rootFollow:'xensonar:open-root-follow-loop-manager',drum:'xensonar:open-drum-pattern-manager',bass:'xensonar:open-bass-pattern-manager',meta:'xensonar:open-meta-menu'};
   const at=order.indexOf(active.kind);if(at<0)return false;
   const next=order[(at+dir+order.length)%order.length],close=closeActive;
   close?.();active=null;closeActive=null;emit();
   window.setTimeout(()=>{
    if(next==='meta'){window.dispatchEvent(new CustomEvent(events[next]));return}
    // Native buttons own the real modal-open state; the legacy event remains a fallback.
    if(typeof __xenOpenOriginalLibrary!=='function'||!__xenOpenOriginalLibrary(next))window.dispatchEvent(new CustomEvent(events[next]));
   },0);return true;
  }};
})();
/* Merge review R1: UI layering and P7.39 demand share one cancellation owner.
   Re-read the adapter after preparation; a later click/session/stop wins. */
/* LR7: material voices use a single, explicit selection policy for
   global library tracks and Session-owned Loop-Rec takes. This function
   never infers an additive action merely because other voices are active. */
/* LRF1: canonical Material click semantics restored from LR8/L9.
   Audio assets and Session takes share this selector; the newer rolling
   algorithm is preserved. Prepare before touching the live arrangement. */
async function __xenQuickTileAction(entry,{shift=false,params={},update=()=>{}}={}){
 __XenQuick.cancelActivation();
 const material=entry.kind==='material';
 const adapter=material?__XenQuick.adapters.get('material'):null;
 const isPrimary=material&&adapter?.selected===entry.id;
 const intent=__xenQuickMaterialClickIntent({kind:entry.kind,shift,
  isSecondary:material&&__XenMaterialLayers.has(entry.id),isPrimary});
 const unavailable=()=>entry.name+' is no longer available.';
 const selectOnly=()=>__XenQuick.performPrepared(entry,()=>{
  if(!__XenQuick.activate(entry))return unavailable();
  __XenMaterialLayers.clear();
  __XenMaterialLayers.touch(entry.id);
  __XenMaterialPrimarySwitch.reset();
  if(!params.materialLoopActive)update({materialLoopActive:true});
  return '';
 });
 // A disabled bus has ZERO audible voices even if old layer IDs persist.
 // Any tile press must establish one explicit source, not mutate stale extras.
 if(material&&!params.materialLoopActive)return selectOnly();
 const layer=()=>{
  const current=__XenQuick.adapters.get('material');
  const valid=current?.entries?.map(row=>row.id)??[];
  const removing=__XenMaterialLayers.has(entry.id);
  if(!__XenMaterialLayers.toggle(entry.id,valid,current?.selected)){
   // Roll only on an explicit additive activation. Never delete the displaced asset.
   if(!shift)return 'Unable to layer this material.';
   const keep=__XenMaterialLayers.rolloverKeep(entry.id,valid,current?.selected,
    __XenMaterialPrimarySwitch.snapshot()||!params.materialLoopActive);
   if(!keep||!__XenQuick.activate(entry))
    return 'Unable to activate this material. Your previous voices are unchanged.';
   __XenMaterialLayers.restore(keep,valid,entry.id);
   __XenMaterialLayers.touch(entry.id);
   __XenMaterialPrimarySwitch.setMuted(false);
  }
  if(!removing)__XenMainRoomSessionBridge.enableMaterialTrack();
  return '';
 };
 if(material&&intent==='toggle-secondary'){
  if(__XenMaterialLayers.has(entry.id))return layer();
  // No phantom hidden primary when the entire Material bus was disabled.
  if(!params.materialLoopActive||!adapter?.selected)return selectOnly();
  // The primary's mute frees one of the three voices; promote the requested
  // material to primary while preserving up to two audible secondary voices.
  if(__XenMaterialPrimarySwitch.snapshot())return __XenQuick.performPrepared(entry,()=>{
   const extras=__XenMaterialLayers.snapshot();
   if(!__XenQuick.activate(entry))return unavailable();
   const valid=__XenQuick.adapters.get('material')?.entries?.map(row=>row.id)??[];
   __XenMaterialLayers.restore(extras,valid,entry.id);
   __XenMaterialLayers.touch(entry.id);
   __XenMaterialPrimarySwitch.setMuted(false);
   __XenMainRoomSessionBridge.enableMaterialTrack();
   return '';
  });
  return __XenQuick.performPrepared(entry,layer);
 }
 if(material&&intent==='toggle-primary'){
  if(!params.materialLoopActive){__XenMaterialPrimarySwitch.setMuted(false);update({materialLoopActive:true})}
  else if(!__XenMaterialPrimarySwitch.toggle())__XenMaterialLayers.touch(entry.id);
  return '';
 }
 if(material)return selectOnly();
 if(__XenQuickSelectableLanes[entry.kind]){
  const view=__xenQuickSelectionView(params,entry.kind);
  const activeId=__XenQuick.adapters.get(entry.kind)?.selected;
  if(view.busOn&&!view.empty&&activeId===entry.id){
   update(__xenQuickSelectionPatch(params,entry.kind,{empty:true,busOn:true}));
   return '';
  }
  if(view.empty&&view.busOn&&activeId===entry.id){
   update(__xenQuickSelectionPatch(params,entry.kind,{empty:false,busOn:true}));
   __XenQuick.pulseEntry(entry.kind,entry.id);
   return '';
  }
  const result=await __XenQuick.activatePrepared(entry);
  if(result===true)update(__xenQuickSelectionPatch(params,entry.kind,{empty:false,busOn:true}));
  return result===null?null:result?'':unavailable();
 }
 const result=await __XenQuick.activatePrepared(entry);
 return result===null?null:result?'':unavailable();
}
const __XenQuickSelectableLanes=Object.freeze({rootFollow:'rootFollowLoopActive',drum:'drumActive',bass:'bassActive'});
function __xenQuickSelectionView(params,kind){
 const field=__XenQuickSelectableLanes[kind];if(!field)return {empty:false,busOn:false};
 const saved=params?.xenQuickTileStateV1?.[kind];
 // A native player that has independently re-enabled the lane takes precedence.
 const empty=saved?.empty===true&&params[field]!==true;
 return {empty,busOn:empty?saved.busOn===true:params[field]===true};
}
function __xenQuickSelectionPatch(params,kind,{empty,busOn}){
 const field=__XenQuickSelectableLanes[kind];
 return {[field]:!!busOn&&!empty,xenQuickTileStateV1:{...(params.xenQuickTileStateV1??{}),[kind]:{empty:!!empty,busOn:!!busOn}}};
}
/* LR3: the material adapter is a live view, not a React render-time cache.
   Loop-Rec publishes durable audio and commits its Session Working Copy outside
   the material-library React render cycle; stale adapter entries prevent the
   second and subsequent takes from becoming playable. No global catalog write. */
/* LR9: one deletion handoff for both globally reusable and session-only material.
   Playback capacity must never silence the surviving parallel material voices. */
function __xenQuickAfterMaterialRemoved(entry,params,update){
 const valid=__XenQuick.getItems().filter(x=>x.kind==='material').map(x=>x.id);
 __XenMaterialLayers.prune(valid);
 if(params.materialLoopId!==entry.id&&__XenQuick.adapters.get('material')?.selected!==entry.id)return;
 const remaining=__XenMaterialLayers.snapshot();
 if(remaining.length){
  const next=remaining[0];
  __XenMaterialLayers.restore(remaining.filter(id=>id!==next),valid,next);
  __XenMaterialPrimarySwitch.setMuted(false);
  update({materialLoopId:next,materialLoopActive:true});
 }else update({materialLoopActive:false});
}
function __xenQuickSessionAdapterEntries(kind,baseEntries){
 if(kind!=='material')return baseEntries;
 const ids=new Set(__XenMetaSessions.activeSessionTakeIds());
 const base=baseEntries.filter(e=>!e.sessionTake||ids.has(e.id));
 const seen=new Set(base.map(e=>e.id));
 return [...base,...bs().entries.filter(e=>e.sessionTake&&ids.has(e.id)&&!seen.has(e.id))];
}
function __xenQuickEntrySame(a,b){if(a===b)return true;if(!a||!b)return false;const ka=Object.keys(a);if(ka.length!==Object.keys(b).length)return false;for(const k of ka)if(a[k]!==b[k])return false;return true}
function __useQuickAdapter(kind,entries,selected,choose){
 const ref=P.useRef();ref.current={entries,selected,choose};
 P.useEffect(()=>__XenQuick.register(kind,{get entries(){return __xenQuickSessionAdapterEntries(kind,ref.current.entries)},get selected(){return ref.current.selected},choose:id=>ref.current.choose(id)}),[kind]);
 const announced=P.useRef(null);
 /* LIVEPATH-01: entries is a new array on every render, so this effect ran on every
  * main-room render (several per beat) and each run emitted to all Quick listeners,
  * including the session working-copy autosave. Re-announce only when the resolved
  * list really changed: same kind, same length, and every entry equal field by field
  * (adapters rebuild small {id,name,bars,...} objects on each render). */
 P.useLayoutEffect(()=>{const current=__xenQuickSessionAdapterEntries(kind,ref.current.entries);
  const prev=announced.current;if(prev&&prev.kind===kind&&prev.list.length===current.length&&prev.list.every((e,i)=>__xenQuickEntrySame(e,current[i])))return;
  announced.current={kind,list:current};__XenQuick.syncHotkeys(kind,current);if(kind==='material')__XenMaterialLayers.prune(current.map(e=>e.id));__XenQuick.refreshLibraries()},[kind,entries]);
 P.useLayoutEffect(()=>{if(kind==='material'){__XenMaterialPrimarySwitch.selectionChanged(selected);__XenMaterialLayers.dropPrimary(selected);__XenMaterialLayers.notePrimary(selected)}__XenQuick.setSelected(kind,selected)},[kind,selected]);
}
function __useQuickActive(kind,id,name,open=true,onClose){
 const close=P.useRef(onClose);close.current=onClose;
 P.useEffect(()=>{if(!open)return;if(['material','rootFollow'].includes(kind))__XenStarterMaterial.request(kind);__XenQuick.setActive({kind,id:String(id??''),name:String(name??'')},()=>close.current?.());return()=>{if(__XenQuick.snapshot().active?.kind===kind)__XenQuick.setActive(null)}},[kind,id,name,open]);
 P.useEffect(()=>{if(!open)return;const frame=requestAnimationFrame(()=>{document.querySelector('[data-xen-header-menu="'+kind+'"]')?.focus({preventScroll:true})});return()=>cancelAnimationFrame(frame)},[kind,open]);
}
function __QuickBadge({kind,id}){const s=P.useSyncExternalStore(__XenQuick.subscribe,__XenQuick.snapshot,__XenQuick.snapshot);return s.items.some(e=>e.kind===kind&&e.id===String(id))?u.jsx('span',{className:'xen-quick-badge',title:'Added to Quick Access',children:__XenQuick.icons[kind]}):null;}
// Bind to the existing library's operations, not a second ordering model.
const __XenQuickDragBindings=new WeakMap();
function __quickProps(kind,id,name,sort){return {draggable:false,ref:node=>{if(node)__XenQuickDragBindings.set(node,sort)},'data-xen-quick-kind':kind,'data-xen-quick-id':String(id),'data-xen-quick-name':String(name),title:String(name)+' · drag to Quick Access'};}
/* N13: Material Track and Root Follow Loop share these nine direct slot hotkeys.
   Hotkeys apply to playlist positions, not permanent track IDs. */
const __XenLoopHotkeys=Object.freeze(['A','S','D','F','G','H','J','K','L']);
function __XenLoopKey(index){return Number.isInteger(index)&&index>=0&&index<__XenLoopHotkeys.length?' ('+__XenLoopHotkeys[index]+')':'';}
/* N19: preserve N14/N17 design; pointer gestures and hover share the visible left landing surface. */
const __XenQuickHelpText='Drag an item to Quick Access for faster access.';
/* P7.37 H1: the four timed Quick Access kinds show their real library bar count.
   Reuse the owning adapter's metadata; do not store stale timing in session tiles.
   A missing count remains unknown rather than being guessed from the tuning or BPM. */
function __xenTimedBarsFromRecord(record){
 if(!record||typeof record!=='object')return null;
 const values=[record.bars,record.barCount,record.loopBars,record.durationBars,
  record.loopComposer?.bars,record.composer?.bars,record.pattern?.bars,
  record.material?.bars,record.config?.bars];
 for(const raw of values){const n=Number(raw);if(raw!==undefined&&raw!==null&&raw!==''&&Number.isInteger(n)&&n>=1&&n<=1024)return n}
 return null;
}
function __xenQuickHasBassGrid(entry){return entry?.kind==='grid'&&entry.gridProfile?.bassEnabled===true&&entry.gridProfile?.bassConfig?.bassUsesGrid!==false;}
function __xenQuickBassGridFlag(entry){return __xenQuickHasBassGrid(entry)?u.jsx('span',{className:'xen-bass-grid-flag','aria-hidden':true}):null;}
function __xenMaterialDisplayName(entry){
 if(entry?.kind!=='material'||typeof entry.id!=='string')return String(entry?.name??'');
 try{return String(bs().entries.find(row=>row.id===entry.id)?.name??entry.name??'');}
 catch{return String(entry.name??'');}
}
function __xenQuickEntryTitle(entry){
 if(entry.kind==='grid')return entry.name+' · '+(__xenQuickGridPatternShort(entry)==='CUS'?'Custom Mute Pattern (base: '+__xenGridModeName(entry.gridProfile?.modeId)+')':__xenGridModeName(entry.gridProfile?.modeId))+(entry.gridProfile?.bassEnabled?' · Bass Grid':'');
 const timed=['material','rootFollow','drum','bass'].includes(entry.kind);
 if(!timed)return entry.name;
 const adapter=__XenQuick.adapters.get(entry.kind);
 const current=adapter?.entries?.find(x=>String(x.id)===String(entry.id));
 const bars=__xenTimedBarsFromRecord(current)??__xenTimedBarsFromRecord(entry);
 return __xenMaterialDisplayName(entry)+(bars===null?'':' · '+bars+' '+(bars===1?'bar':'bars'));
}
/* Saved Meta Sessions have a stable stored order. Navigation wraps but never
   activates an empty/nonexistent slot, and does not edit a draft by itself. */
/* P7.38.17: Session controls have a universal five-tile minimum baseline.
   The longest single column in ANY saved session controls the common grid
   height, regardless of which session is open. Current unsaved quick tiles
   may extend the height temporarily without mutating any stored session. */
function __xenQuickGlobalRows(savedSessions,liveItems){
 let maximum=5;
 const inspect=items=>{
  if(!Array.isArray(items))return;
  const counts={grid:0,material:0,rootFollow:0,drum:0,bass:0};
  for(const item of items)if(item&&Object.prototype.hasOwnProperty.call(counts,item.kind))counts[item.kind]++;
  for(const n of Object.values(counts))maximum=Math.max(maximum,n);
 };
 for(const session of Array.isArray(savedSessions)?savedSessions:[])inspect(session?.items);
 inspect(liveItems);
 return maximum;
}
/* Existing CSS: 34px tile minimum-height, 5px vertical inter-tile gap. */
function __xenQuickRowsPx(rows){return 34*Math.max(5,rows)+5*(Math.max(5,rows)-1)}
function __xenMetaNeighbor(meta,step){const rows=meta?.saved??[];if(rows.length<2)return null;const index=rows.findIndex(row=>row.id===meta?.activePalette?.id);return rows[index<0?(step<0?rows.length-1:0):(index+(step<0?-1:1)+rows.length)%rows.length]}
/* P7.38.15: Quickrack permanently right-docked; expanded points outward, collapsed inward. */
function __xenQuickCollapseArrow(collapsed){return collapsed?'<':'>'}
/* P7.39.27: Compact, vertical lane alignment rows.
   Each Material entry is an independent channel. The existing canonical
   volume/pan owners remain in use. Until true time-preserving pitch DSP
   is connected, PCM and hybrid Root Follow Pitch are explicitly disabled.
   Never implement them by modifying AudioBufferSourceNode.playbackRate. */
// Sample the audio-owned polynomial at the AudioContext clock, including while dragging.
function __xenNudgeSample(m,audioNow){
 const k=m.curve;if(!m.active||m.feel==='hard'||!k)return m;
 const elapsed=Math.max(0,Math.min(k.duration,k.elapsed+Math.max(0,audioNow-m.audioTime))),u=elapsed/k.duration;
 const phase=elapsed===k.duration?k.end:k.c0+u*(k.c1+u*(k.c2+u*(k.c3+u*(k.c4+u*k.c5))));
 const rate=elapsed===k.duration?1:1+k.beat/k.duration*(k.c1+u*(2*k.c2+u*(3*k.c3+u*(4*k.c4+5*u*k.c5))));
 return{...m,phase,rate};
}
function __xenNudgeGeometry(m,scope){
 const span=Math.max(.001,Number(scope)||.25),x=attack=>Math.max(0,Math.min(100,50+50*attack/span));
 const applied=x(-m.phase),target=x(-m.target),delta=m.rate-1;
 const intensity=Math.max(0,Math.min(1,Math.abs(delta)/(delta<0?.5:1)));
 const bend=intensity*intensity*intensity*(10+intensity*(-15+6*intensity));
 const lift=m.feel==='hard'?0:4.5*bend*(delta<0?1:-1),y=8.5+lift,distance=target-applied;
 return{applied,target,intensity,top:5+lift,path:'M '+applied+' '+y+' C '+(applied+distance/3)+' '+y+' '+(applied+distance*2/3)+' '+(8.5+lift/2)+' '+target+' 8.5'};
}
function __XenNudgeMotion({id,scope}){
 const root=P.useRef(null);
 P.useEffect(()=>{
  let raf=0,clock=null,closed=false;
  function draw(){
   raf=0;if(closed||!root.current)return;
   const m=__XenNudgeFeedback.get(id),nextClock=__XenNudgeFeedback.context(id);
   if(clock!==nextClock){clock?.removeEventListener?.('statechange',kick);clock=nextClock;clock?.addEventListener?.('statechange',kick);}
   const view=__xenNudgeSample(m,clock?.currentTime??m.audioTime),g=__xenNudgeGeometry(view,scope),visible=m.live&&m.active;
   root.current.dataset.motion=visible?(view.rate<1?'brake':'push'):'rest';root.current.dataset.feel=m.feel;
   const dot=root.current.querySelector('i'),svg=root.current.querySelector('svg'),path=root.current.querySelector('path');
   dot.style.left=g.applied+'%';dot.style.top=g.top+'px';dot.style.opacity=visible?'1':'0';
   svg.style.opacity=visible&&m.feel!=='hard'?String(.15+.8*g.intensity):'0';path.setAttribute('d',g.path);
   if(visible&&clock?.state==='running')raf=requestAnimationFrame(draw);
  }
  function kick(){if(!closed&&!raf)draw();}
  const off=__XenNudgeFeedback.subscribe(id,kick);kick();
  return()=>{closed=true;off();if(raf)cancelAnimationFrame(raf);clock?.removeEventListener?.('statechange',kick);};
 },[id,scope]);
 return u.jsxs('span',{ref:root,className:'xen-nudge-motion','aria-hidden':true,'data-motion':'rest','data-feel':'soft',children:[
  u.jsx('svg',{className:'xen-nudge-arc',viewBox:'0 0 100 17',preserveAspectRatio:'none',style:{opacity:0},children:u.jsx('path',{d:'M 50 8.5 L 50 8.5'})}),
  u.jsx('i',{className:'xen-nudge-applied',style:{left:'50%',top:5,opacity:0}})
 ]});
}

/* N3.3: a fifth, visually projecting tile row is NOT a fifth layout row.
   Portal keeps controls visible outside the scrolling register, without margin hacks. */
function __XenNudgeOptions({id,owner,mode,feel}){
 const [anchor,setAnchor]=P.useState(null);
 P.useLayoutEffect(()=>{
  const row=[...document.querySelectorAll('.xen-lane-row[data-xen-lane-id]')].find(node=>node.dataset.xenLaneId===id);
  if(!row)return;
  let raf=0;
  const measure=()=>{
   cancelAnimationFrame(raf);
   raf=requestAnimationFrame(()=>{
    const rect=row.getBoundingClientRect();
    setAnchor(old=>old&&Math.abs(old.left-(rect.right-3))<.15&&Math.abs(old.top-(rect.bottom-3))<.15?old:{left:rect.right-3,top:rect.bottom-3});
   });
  };
  measure();
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(measure):null;
  observer?.observe(row);
  window.addEventListener('resize',measure);
  window.addEventListener('scroll',measure,true);
  return()=>{cancelAnimationFrame(raf);observer?.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true)};
 },[id]);
 if(!anchor||typeof document==='undefined')return null;
 return ao.createPortal(u.jsxs('div',{className:'xen-lane-nudge-options',style:{left:anchor.left,top:anchor.top},'aria-label':owner+' Nudge motion settings',children:[
  u.jsx('button',{type:'button',className:'xen-lane-window-toggle xen-lane-nudge-mode', 'aria-label':owner+' Nudge mode',onClick:()=>__XenMaterialVoiceMix.setMode(id,mode==='vinyl'?'granular':'vinyl'),children:mode==='vinyl'?'Vinyl':'Granular'}),
  u.jsx('button',{type:'button',className:'xen-lane-window-toggle xen-lane-nudge-feel','aria-label':owner+' Nudge feel','aria-pressed':feel==='soft',onClick:()=>__XenMaterialVoiceMix.setFeel(id,feel==='hard'?'soft':'hard'),children:feel==='hard'?'Hard':'Soft'})
 ]}),document.body);
}
/* Four parameter windows share one renderer. Volume/Pan zoom around a stable
   selected value; Pitch/Nudge preserve their existing symmetric pitch/beat range. */
function __XenLevelWindowBounds(min,max,value,vertical,center){
 const lo=Number(min),hi=Number(max),full=Math.max(0,hi-lo);
 const t=Math.max(-1,Math.min(1,Number(vertical)||0));
 const span=full*Math.pow(2,-3.5*(1-t));
 const anchor=Number.isFinite(center)?center:(Number(value)||0);
 const left=Math.max(lo,Math.min(hi-span,anchor-span/2));
 return {min:left,max:left+span};
}
