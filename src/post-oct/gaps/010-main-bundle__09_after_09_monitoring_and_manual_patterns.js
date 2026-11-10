function k1(e){if(typeof __XenSampleClock04!=="undefined"){
 for(const lane of (e.lane?[e.lane]:['wellenstart','klaviatur']))for(const [code,g] of Object.entries(e.state.gestures[lane]||{})){
  if((!e.keyId||e.keyId===code)&&Number.isFinite(g.startedAtMs))__XenSampleClock04.cancelKey(g.sampleClock04Ctx,lane,code,g.startedAtMs,true);
 }
}if(typeof __XenNodalSurfaces!=="undefined"){
  // The Hold gesture owns its terminal epoch, even when no Nodal voice was admitted.
  for(const lane of (e.lane?[e.lane]:["wellenstart","klaviatur"])){
    const gestures=e.state.gestures[lane],keys=e.keyId?[e.keyId]:Object.keys(gestures);
    for(const key of keys){const epoch=gestures[lT(key)]?.startedAtMs;
      if(Number.isFinite(epoch))__XenNodalSurfaces.endFallbackHoldGesture?.(lane==="klaviatur"?"keyboard":"wave",key,epoch);
    }
  }
if(!e.lane||e.lane==="klaviatur")__XenNodalSurfaces.releaseFallbackHold?.("keyboard",e.keyId||null);if(!e.lane||e.lane==="wellenstart")__XenNodalSurfaces.releaseFallbackHold?.("wave",e.keyId||null);}if(typeof __XenNodalHoldPCM!=="undefined")__XenNodalHoldPCM.release(e.lane==="klaviatur"?"keyboard":"wave",e.keyId||null);const t=e.lane?[e.lane]:["wellenstart","klaviatur"];for(const n of t){if(e.keyId){const a=lT(e.keyId);e.state.gestures[n][a]?.active&&(e.state.releaseCount+=1),delete e.state.gestures[n][a];continue}const r=Object.values(e.state.gestures[n]).filter(a=>a.active).length;e.state.releaseCount+=r,e.state.gestures[n]={}}}function C2(e){return(e.lane?[e.lane]:["wellenstart","klaviatur"]).some(n=>Object.values(e.state.gestures[n]).some(r=>r.active?e.requireSustainExtend?r.sustainExtendActive||r.sustainExtendLatched||r.extendPolicy==="apostrophe-safe-extend":!0:!1))}const eu=e=>Math.max(1,Math.min(256,Math.round(Number.isFinite(e)?e:24)));function Pw(e){return Array.from({length:eu(e)},()=>1)}function Oie(e){return Pw(e).map((t,n)=>n>=1&&n<=4?0:t)}function _ie(e){return Array.from({length:eu(e)},(_,i)=>i===0?1:0)}function zie(e){return Pw(e).map((t,n)=>{const r=n%6;return r===0||r===2||r===3?1:0})}function jie(e){return Pw(e).map((t,n)=>n%2===1?1:0)}/* THUNDER-HPM01: small, non-destructive named-memory controls inside each existing R4 Hold editor. */
function __XenHPM01Controls({lane,slots,referenceBars,muteSteps,pitchCents,slotVolumes,microtiming,tuningOrigin,onLoad}){
 const [rows,setRows]=P.useState([]),[selected,setSelected]=P.useState(''),[name,setName]=P.useState(''),[baseline,setBaseline]=P.useState(null),[busy,setBusy]=P.useState(false),[message,setMessage]=P.useState('');
 const owner=globalThis.__XenHoldPatternMemory;
 const current=()=>({sourceLane:lane,slots,referenceBars,muteSteps:l0(muteSteps,slots),pitchCents:__xenHoldPitchVector(pitchCents,slots),slotVolumes:__xenHoldVolumeVector(slotVolumes,slots),microtiming:__xenHoldMicroVector(microtiming,slots)});
 const currentRow=rows.find(r=>r.id===selected);
 const dirty=baseline?.id===selected&&JSON.stringify({sourceLane:baseline.sourceLane,slots:baseline.slots,referenceBars:baseline.referenceBars,muteSteps:baseline.muteSteps,pitchCents:baseline.pitchCents,slotVolumes:baseline.slotVolumes,microtiming:baseline.microtiming})!==JSON.stringify(current());
 const refresh=async()=>{if(!owner)throw Error('Hold Pattern Memory storage is unavailable');const all=await owner.list();setRows(all.filter(x=>x.sourceLane===lane));return all};
 P.useEffect(()=>{let alive=true;if(!owner){setMessage('Pattern memory unavailable');return}
  owner.list().then(all=>{if(alive)setRows(all.filter(x=>x.sourceLane===lane))}).catch(e=>{if(alive)setMessage('Storage error: '+e.message)});
  return()=>{alive=false};
 },[lane]);
 const perform=async fn=>{if(busy||!owner)return;setBusy(true);setMessage('');try{await fn()}catch(e){setMessage('Not saved: '+(e?.message||e))}finally{setBusy(false)}};
 const snap=()=>({...current(),tuningOrigin});
 const tuningText=x=>x?.tuningId?x.tuningId+' · '+x.modeId+(x.mainStepOffsets?.some(v=>v!==0)?' · fine-tuned':'')+(x.mainMutedDegrees?.length?' · grid mutes saved':''):'No grid metadata';
 const select=id=>{setSelected(id);setBaseline(null);const row=rows.find(r=>r.id===id);setName(row?.name||'');setMessage('')};
 const button=(label,action,disabled=false,title='')=>u.jsx('button',{type:'button',disabled:busy||disabled,title,className:'xen-hpm01-button',onClick:()=>perform(action),children:label},label);
 return u.jsxs('div',{className:'xen-hpm01','data-xen-hpm01':lane,children:[
  u.jsxs('div',{className:'xen-hpm01-head',children:[u.jsx('strong',{children:'Pattern Memory'}),u.jsx('span',{className:'xen-hpm01-hint',children:dirty?'Edited working copy · saved pattern unchanged':baseline?.id===selected?'Saved pattern loaded':'Named patterns · independent of song'})]}),
  u.jsx('div',{className:'xen-hpm01-hint',title:'Tuning origin is descriptive only for individual patterns. A future Hold Pattern Plan will store and restore the full native Grid.',children:'Tuned on: '+tuningText(currentRow?.tuningOrigin||tuningOrigin)}),
  u.jsxs('div',{className:'xen-hpm01-fields',children:[
   u.jsx('select',{'aria-label':lane+' saved Hold Patterns',value:selected,disabled:busy,onFocus:()=>{refresh().catch(e=>setMessage('Storage error: '+e.message))},onChange:e=>select(e.target.value),children:[u.jsx('option',{value:'',children:'Choose saved '+lane+' pattern…'}),...rows.map(r=>u.jsx('option',{value:r.id,children:r.name+' · '+r.slots+' slots'},r.id))]}),
   u.jsx('input',{type:'text',maxLength:80,placeholder:'New pattern name',value:name,'aria-label':lane+' pattern name',onChange:e=>setName(e.target.value),onKeyDown:e=>e.stopPropagation(),onKeyUp:e=>e.stopPropagation()})
  ]}),
  u.jsxs('div',{className:'xen-hpm01-actions',children:[
   button('Save As',async()=>{const row=await owner.saveAs(name,snap());await refresh();setSelected(row.id);setName(row.name);setBaseline(row);setMessage('Saved '+row.name+'.')},!name.trim(),'Save the current Hold Pattern under a new name; never overwrites a previously saved pattern.'),
   button('Load',async()=>{const row=await owner.get(selected);onLoad(row);setBaseline(row);setName(row.name);setMessage('Loaded '+row.name+' into '+lane+' Hold.')},!currentRow,'Replace only this lane’s working Hold Pattern with the saved snapshot.'),
   button('Duplicate',async()=>{const row=await owner.duplicate(selected,currentRow.revision);await refresh();setSelected(row.id);setName(row.name);setBaseline(null);setMessage('Duplicated '+row.name+'. Load to use it.')},!currentRow,'Duplicate the saved pattern; does not change the active working Hold.'),
   button('Rename',async()=>{const row=await owner.rename(selected,name,currentRow.revision);await refresh();setName(row.name);if(baseline?.id===row.id)setBaseline(row);setMessage('Renamed '+row.name+'.')},!currentRow||!name.trim(),'Rename only the saved pattern; the working Hold is not changed.'),
   button('Delete',async()=>{if(!globalThis.confirm('Delete saved Hold Pattern “'+currentRow.name+'”? Your current working Hold stays unchanged.'))return;await owner.remove(selected,currentRow.revision);await refresh();setSelected('');setName('');setBaseline(null);setMessage('Saved pattern deleted; working Hold unchanged.')},!currentRow,'Delete only this named memory entry, not the current Hold or the song.')
  ]}),
  message?u.jsx('div',{className:'xen-hpm01-message',role:'status',children:message}):null
 ]});
}


/* THUNDER-HPM02-EDITOR01: a large, optional editing surface backed by the canonical
   R4 patterns. Reference pitches are guides, never an enforced tuning or Grid reset.
   For non-octave custom tunings, show only their real degrees within +/-1200 cents. */
function __xenHoldDetailReferences(mode,origin){
 const out=[],seen=new Set();
 const add=(cents,label,muted=false)=>{
  if(!Number.isFinite(cents)||Math.abs(cents)>1200.00001)return;
  const n=Math.round(cents*1000)/1000;const key=n+'|'+label;
  if(!seen.has(key)){seen.add(key);out.push({cents:n,label,muted:!!muted})}
 };
 if(mode==='ji'){
  for(const v of __xenHoldPitchJITicks)add(v.cents,v.ratio+' · '+v.name);
 }else if(mode==='current'){
  const id=origin?.tuningId;
  if(typeof id==='string'&&id){
   try{
    const desc=__XenBassGrid.descriptor(id);
    if(Array.isArray(desc.steps)&&desc.steps.length){
     const muted=new Set(origin.mainMutedDegrees||[]);
     desc.steps.forEach((_,degree)=>{
      const cents=__XenBassGrid.effectiveCents(id,degree);
      add(cents,'Step '+degree+(muted.has(degree)?' · muted':''),muted.has(degree));
      if(degree>0)add(-cents,'− Step '+degree,muted.has(degree));
     });
    }
   }catch(err){console.warn('[HPM02] Current Grid references unavailable:',err)}
  }
 }else{
  const edo=Number(String(mode).replace('edo',''));
  if(Number.isInteger(edo)&&edo>=2&&edo<=256){
   for(let i=-edo;i<=edo;i++)add(1200*i/edo,(i<0?'−':'+')+Math.abs(i)+' / '+edo+' EDO');
  }
 }
 return out.sort((a,b)=>a.cents-b.cents||a.label.localeCompare(b.label));
}
/* HPM02-TUNINGPREVIEW01: reference preview is explicitly an audition, not a live gesture.
   WebAudio timeline owns pattern timing; all created voices are scoped to this dialog. */
function __xenHPM03PreviewPatternEvents({slots,referenceBars,bpm,beatsPerBar,muteSteps,pitches,volumes,microtiming}){
 const n=Math.max(1,Math.min(256,Math.round(Number(slots)||1)));
 const total=Math.max(.125,Number(referenceBars)||1)*Math.max(.5,Number(beatsPerBar)||4)*60/Math.max(20,Number(bpm)||120);
 const step=total/n,out=[];
 for(let i=0;i<n;i++){
  if(muteSteps?.[i]===0)continue;
  const gain=__xenHoldSlotGain(volumes,i);
  if(gain<=0)continue;
  const delta=__xenHoldMicroRatio(microtiming,i)*step;
  out.push({index:i,atSec:Math.max(0,i*step+delta),durationSec:Math.max(.035,Math.min(.45,step*.68)),
   pitchCents:__xenHoldPitchValue(pitches,i),gain});
 }
 return out;
}
/* THUNDER-HPP01-PREP01: gentle reference waveform. The timbre changes, not tuning, note frequency,
   routing, or the existing instrument-specific audition paths. One PeriodicWave per AudioContext. */
const __xenHPM04WaveCache=new WeakMap();
function __xenHPM04WarmVoice(ctx,hz,at,duration,gain,destination,{continuous=false}={}){
 const osc=ctx.createOscillator(),lowpass=ctx.createBiquadFilter(),amp=ctx.createGain();
 if(typeof ctx.createPeriodicWave==='function'&&typeof osc.setPeriodicWave==='function'){
  let wave=__xenHPM04WaveCache.get(ctx);
  if(!wave){wave=ctx.createPeriodicWave(new Float32Array(6),new Float32Array([0,1,.20,.075,.025,.009]));__xenHPM04WaveCache.set(ctx,wave)}
  osc.setPeriodicWave(wave);
 }else osc.type='triangle';// WebAudio compatibility fallback, still a gently filtered reference.
 const begin=Math.max(ctx.currentTime+.001,at),seconds=Math.max(.06,Number(duration)||.6);
 osc.frequency.setValueAtTime(hz,begin);
 lowpass.type='lowpass';lowpass.Q.value=.4;
 const cutoff=f=>Math.min((ctx.sampleRate||48000)*.44,Math.max(850,f*3.8));
 lowpass.frequency.setValueAtTime(cutoff(hz),begin);
 const level=Math.max(.00001,Math.min(.125,(Number(gain)||0)*.102));
 amp.gain.setValueAtTime(.00001,begin);
 amp.gain.linearRampToValueAtTime(level,begin+.026);
 if(!continuous){
  const release=Math.max(begin+.03,begin+seconds-Math.min(.15,seconds*.3));
  amp.gain.setValueAtTime(level,release);
  amp.gain.linearRampToValueAtTime(.00001,begin+seconds);
 }
 osc.connect(lowpass);lowpass.connect(amp);amp.connect(destination);
 let stopped=false;
 osc.onended=()=>{try{osc.disconnect();lowpass.disconnect();amp.disconnect()}catch{}};
 osc.start(begin);
 if(!continuous){osc.stop(begin+seconds+.02)}
 else osc.stop(begin+180);// Failsafe for unbounded drag if pointer teardown is lost.
 return {osc,ctx,updateHz(f){if(Number.isFinite(f)&&f>0){const now=Math.max(ctx.currentTime,begin);osc.frequency.setTargetAtTime(f,now,.012);lowpass.frequency.setTargetAtTime(cutoff(f),now,.025)}},
  stop(){if(stopped)return;stopped=true;const now=ctx.currentTime;try{amp.gain.cancelScheduledValues(now);amp.gain.setTargetAtTime(.00001,now,.035);osc.stop(now+.16)}catch{}}};
}
const __XenHPM03LivePreviewBridge={current:null};
function __XenHoldDetailEditor({lane,slots,referenceBars,muteSteps,pitches,volumes,microtiming,tuningOrigin,previewRuntime,onMute,onPitch,onVolume,onMicrotiming,onSlots,onBars,onClose}){
 const [selected,setSelected]=P.useState(0),[refMode,setRefMode]=P.useState('ji');
 const [rootHz,setRootHz]=P.useState(()=>Math.max(5,Number(tuningOrigin?.gridBaseHz)||220));
 const [hzDraft,setHzDraft]=P.useState(''),[previewMessage,setPreviewMessage]=P.useState(''),[previewPlaying,setPreviewPlaying]=P.useState(false);
 const drag=P.useRef(null),panel=P.useRef(null),returnFocus=P.useRef(null),hzInput=P.useRef(null);
 const preview=P.useRef({token:0,nodes:[],timer:null,dragTone:null}),rootRef=P.useRef(rootHz);rootRef.current=rootHz;
 const n=Math.max(1,Math.min(256,Math.round(Number(slots)||1))),idx=Math.min(selected,n-1);
 const current=__xenHoldPitchValue(pitches,idx),slotGain=__xenHoldSlotGain(volumes,idx),slotMicro=__xenHoldMicroRatio(microtiming,idx);
 const refs=P.useMemo(()=>__xenHoldDetailReferences(refMode,tuningOrigin),[refMode,tuningOrigin]);
 const options=[['ji','JI ratios'],['current','Current Grid'],...([12,17,19,22,24,31,53].map(edo=>[edo+'edo',edo+' EDO']))];
 const noteHz=rootHz*Math.pow(2,current/1200),formatC=v=>(v>0?'+':'')+Number(v.toFixed(3))+' ¢';
 const formattedHz=v=>v>=1000?v.toFixed(3):v.toFixed(4);
 P.useEffect(()=>{if(document.activeElement!==hzInput.current)setHzDraft(formattedHz(noteHz))},[noteHz]);
 const gridDegrees=P.useMemo(()=>{
  const base=Number(tuningOrigin?.gridBaseHz)||220,id=tuningOrigin?.tuningId;
  const choices=[{id:'root',label:'Root · 0 ¢',hz:base}];
  try{const d=id&&__XenBassGrid.descriptor(id);if(d?.steps?.length)for(let degree=1;degree<Math.min(d.steps.length,64);degree++){
   const cents=__XenBassGrid.effectiveCents(id,degree);
   if(!Number.isFinite(cents))continue;
   const mute=(tuningOrigin.mainMutedDegrees||[]).includes(degree);
   choices.push({id:'degree-'+degree,label:'Degree '+degree+(mute?' · muted':''),hz:base*Math.pow(2,cents/1200)});
  }}catch{}
  return choices;
 },[tuningOrigin]);
 const putPitch=cents=>{if(!Number.isFinite(cents))return;
  const next=__xenHoldPitchVector(pitches,n);next[idx]=Math.max(-1200,Math.min(1200,Math.round(cents*1000)/1000));onPitch(next)};
 const setVolume=value=>{const next=__xenHoldVolumeVector(volumes,n);next[idx]=Math.max(0,Math.min(1.5,Math.round(Number(value)*100)/100));onVolume(next)};
 const setMicro=value=>{const next=__xenHoldMicroVector(microtiming,n);next[idx]=Math.max(-.45,Math.min(.45,Math.round(Number(value)*100)/100));onMicrotiming(next)};
 const commitHz=()=>{const hz=Number(hzDraft);if(Number.isFinite(hz)&&hz>=5&&hz<=12000&&rootHz>0){putPitch(1200*Math.log2(hz/rootHz));setPreviewMessage('Frequency set relative to preview root.')}else setPreviewMessage('Enter 5–12000 Hz.');};
 const outLane=lane==='Keyboard'?'keyboard':'wave';
 const stopPreview=(display=true)=>{const state=preview.current;state.token++;
  if(state.timer!==null)clearTimeout(state.timer);state.timer=null;
  for(const node of state.nodes.splice(0))try{node.stop?.()}catch{}
  const t=state.dragTone;state.dragTone=null;if(t)try{t.stop?.()}catch{}
  if(display){setPreviewPlaying(false);setPreviewMessage('Preview stopped.')}};
 P.useEffect(()=>{
  returnFocus.current=document.activeElement;
  const key=ev=>{
   if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();onClose()}
   if(ev.key==='Tab'){
    const focusables=[...(panel.current?.querySelectorAll('button:not([disabled]),select,input,[tabindex="0"]')||[])];
    if(!focusables.length)return;const first=focusables[0],last=focusables[focusables.length-1];
    if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus()}
    else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus()}
   }
  };
  window.addEventListener('keydown',key,true);panel.current?.querySelector('button')?.focus({preventScroll:true});
  return()=>{window.removeEventListener('keydown',key,true);stopPreview(false);returnFocus.current?.focus?.({preventScroll:true})};
 },[]);
 const requireContext=async()=>{
  let ctx=previewRuntime?.getContext?.();
  if(!ctx||ctx.state!=='running'){await previewRuntime?.ensureReady?.();ctx=previewRuntime?.getContext?.()}
  if(!ctx||ctx.state!=='running')throw Error('Enable Live Room audio (Power) to hear the preview.');
  return ctx;
 };
 const outputFor=ctx=>{const out=previewRuntime?.getDestination?.(ctx,outLane);if(!out)throw Error('Live Room preview output is unavailable.');return out};
 const scheduleOsc=(ctx,hz,at,duration,gain)=>
  __xenHPM04WarmVoice(ctx,hz,at,duration,gain,outputFor(ctx));
 const scheduleSample=(ctx,loaded,hz,at,duration,gain)=>{
  const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=loaded.buffer;
  const base=Number(loaded.baseHz)||hz;src.playbackRate.value=Math.max(.04,Math.min(16,hz/base));
  const a=Math.max(.00001,Math.min(.28,gain*.18));g.gain.setValueAtTime(.00001,at);
  g.gain.linearRampToValueAtTime(a,at+.008);g.gain.setValueAtTime(a,at+Math.max(.015,duration-.045));
  g.gain.linearRampToValueAtTime(.00001,at+duration);src.connect(g);g.connect(outputFor(ctx));
  src.start(at);src.stop(at+duration+.01);src.onended=()=>{try{src.disconnect();g.disconnect()}catch{}};
  return {stop:()=>{try{src.stop(ctx.currentTime+.02)}catch{}}};
 };
 const source=()=>String(previewRuntime?.sourceForLane?.(lane)||'');
 const playSingle=async (hz=noteHz,label='Tuned note')=>{
  stopPreview(false);const token=preview.current.token;setPreviewPlaying(true);setPreviewMessage('Preparing '+label+'…');
  try{const ctx=await requireContext();if(token!==preview.current.token)return;
   const preset=source(),dur=.62,now=ctx.currentTime+.02;
   if(preset.startsWith('nodal:')&&typeof __XenNodalSurfaces!=='undefined'){
    const voice=await __XenNodalSurfaces.preview(outLane,preset,{frequency:hz,gain:.24,durationSec:dur,isCurrent:()=>token===preview.current.token},ctx);
    if(token!==preview.current.token){voice?.noteOff?.();return}
    if(voice){preview.current.nodes.push({stop:()=>voice.noteOff?.()});setPreviewMessage(label+' · selected Nodal sound');}
    else{preview.current.nodes.push(scheduleOsc(ctx,hz,now,dur,1));setPreviewMessage(label+' · warm reference (Nodal unavailable)')}
   }else if(preset.startsWith('sample:')){
    const loaded=await bw(preset.slice(7),ctx);if(token!==preview.current.token)return;
    if(loaded?.buffer){preview.current.nodes.push(scheduleSample(ctx,loaded,hz,now,dur,1));setPreviewMessage(label+' · selected sample');}
    else{preview.current.nodes.push(scheduleOsc(ctx,hz,now,dur,1));setPreviewMessage(label+' · warm reference (sample unavailable)')}
   }else{preview.current.nodes.push(scheduleOsc(ctx,hz,now,dur,1));setPreviewMessage(label+' · warm reference (not factory synth timbre)')}
   preview.current.timer=setTimeout(()=>{if(token===preview.current.token)setPreviewPlaying(false)},900);
  }catch(e){if(token===preview.current.token){setPreviewPlaying(false);setPreviewMessage('Preview unavailable: '+(e?.message||e))}}
 };
 const playPattern=async()=>{
  stopPreview(false);const token=preview.current.token;setPreviewPlaying(true);setPreviewMessage('Preparing Pattern preview…');
  try{const ctx=await requireContext();if(token!==preview.current.token)return;
   const clock=__XenMainRoomSessionBridge.liveClock(),events=__xenHPM03PreviewPatternEvents({slots:n,referenceBars,
    bpm:clock.bpm,beatsPerBar:clock.beatsPerBar,muteSteps,pitches,volumes,microtiming});
   const preset=source();let loaded=null;
   if(preset.startsWith('sample:'))loaded=await bw(preset.slice(7),ctx);
   if(token!==preview.current.token)return;
   const start=ctx.currentTime+.06,cycle=referenceBars*clock.beatsPerBar*60/clock.bpm;
   for(const step of events){const hz=rootHz*Math.pow(2,step.pitchCents/1200),when=start+step.atSec;
    preview.current.nodes.push(loaded?.buffer?scheduleSample(ctx,loaded,hz,when,step.durationSec,step.gain):scheduleOsc(ctx,hz,when,step.durationSec,step.gain));}
   setPreviewMessage(events.length+' active attacks · '+(loaded?.buffer?'selected sample':'warm reference')+' · '+clock.bpm+' BPM');
   preview.current.timer=setTimeout(()=>{if(token===preview.current.token){setPreviewPlaying(false);setPreviewMessage('Pattern preview finished.')}},Math.min(60000,(cycle+.2)*1000));
  }catch(e){if(token===preview.current.token){setPreviewPlaying(false);setPreviewMessage('Pattern preview unavailable: '+(e?.message||e))}}
 };
 const updateDrag=(ev)=>{const r=ev.currentTarget.getBoundingClientRect(),c=1200*(r.top+r.height/2-ev.clientY)/(r.height/2),v=Math.max(-1200,Math.min(1200,Math.round(c*1000)/1000));
  putPitch(v);const d=preview.current.dragTone;if(d?.ctx?.state==='running')d.updateHz(rootRef.current*Math.pow(2,v/1200));return v};
 const startDrag=async()=>{stopPreview(false);const token=preview.current.token;
  try{const ctx=await requireContext();if(token!==preview.current.token||drag.current===null)return;
   const warm=__xenHPM04WarmVoice(ctx,rootRef.current*Math.pow(2,current/1200),ctx.currentTime+.008,180,1,outputFor(ctx),{continuous:true});
   preview.current.dragTone=warm;setPreviewPlaying(true);setPreviewMessage('Tuning · warm reference tone');
  }catch(e){setPreviewMessage('Tuning preview unavailable: '+(e?.message||e))}
 };
 const finishDrag=(ev,canceled=false)=>{if(drag.current!==ev.pointerId)return;
  const value=canceled?current:updateDrag(ev);drag.current=null;
  try{ev.currentTarget.releasePointerCapture?.(ev.pointerId)}catch{}
  const d=preview.current.dragTone;preview.current.dragTone=null;d?.stop();setPreviewPlaying(false);
  if(!canceled)void playSingle(rootRef.current*Math.pow(2,value/1200));
 };
 const closeOnBackdrop=ev=>{if(ev.target===ev.currentTarget)onClose()};
 return ao.createPortal(u.jsx('div',{'data-xen-hold-detail-dialog':'true',className:'xen-hpm02-backdrop',onPointerDown:closeOnBackdrop,
  children:u.jsxs('section',{ref:panel,className:'xen-hpm02-dialog',role:'dialog','aria-modal':'true','aria-label':lane+' detailed Hold Pattern editor',onKeyDown:ev=>ev.stopPropagation(),onKeyUp:ev=>ev.stopPropagation(),children:[
   u.jsxs('header',{className:'xen-hpm02-header',children:[u.jsxs('div',{children:[u.jsx('strong',{children:lane+' · Hold Pattern'}),u.jsx('p',{children:'Tune by ear: drag the full-height pitch axis, use ±1 cent or type an exact frequency. Preview never changes held Live Room gestures.'})]}),u.jsx('button',{type:'button',onClick:onClose,'aria-label':'Close detailed Hold Pattern editor',children:'✕ Close'})]}),
   u.jsxs('div',{className:'xen-hpm02-settings',children:[
    u.jsxs('label',{children:['Slots ',u.jsx('input',{type:'number',min:1,max:256,step:1,value:n,onChange:e=>onSlots(Math.max(1,Math.min(256,Math.round(Number(e.target.value)||1))))})]}),
    u.jsxs('label',{children:['Bars ',u.jsx('input',{type:'number',min:.125,max:16,step:.125,value:referenceBars,onChange:e=>onBars(Math.max(.125,Math.min(16,Number(e.target.value)||1)))})]}),
    u.jsxs('label',{children:['Pitch reference ',u.jsx('select',{'aria-label':'Pitch reference grid',value:refMode,onChange:e=>setRefMode(e.target.value),children:options.map(([id,label])=>u.jsx('option',{value:id,children:label},id))})]}),
    u.jsx('span',{className:'xen-hpm02-summary',children:n+' slots · '+referenceBars+' bars · '+(tuningOrigin?.tuningId||'no native Grid metadata')})]}),
   u.jsxs('div',{className:'xen-hpm02-layout',children:[
    u.jsxs('div',{className:'xen-hpm02-slots',children:[u.jsx('strong',{children:'Select slot'}),
     u.jsx('div',{className:'xen-hpm02-slot-grid',children:Array.from({length:n},(_,i)=>u.jsx('button',{type:'button',
      'aria-label':'Select slot '+(i+1),'aria-pressed':idx===i,className:(idx===i?' selected':'')+((muteSteps?.[i]===0)?' muted':''),onClick:()=>setSelected(i),
      title:'Slot '+(i+1)+(muteSteps?.[i]===0?' · muted':'')+' · '+__xenHoldPitchValue(pitches,i)+' cents · '+Math.round(__xenHoldSlotGain(volumes,i)*100)+'% volume · '+Math.round(__xenHoldMicroRatio(microtiming,i)*100)+'% microtiming',children:i+1},i))}),
     u.jsx('button',{type:'button',onClick:()=>{const next=Array.from({length:n},(_,i)=>muteSteps?.[i]===0?0:1);next[idx]=next[idx]===0?1:0;onMute(next)},'aria-pressed':muteSteps?.[idx]!==0,children:'Slot '+(idx+1)+': '+(muteSteps?.[idx]===0?'Muted · unmute':'Active · mute')}),
     u.jsxs('div',{className:'xen-hpm03-preview',children:[
      u.jsx('strong',{children:'Audition · '+lane}),
      u.jsxs('label',{children:['Preview note from current Grid',u.jsxs('select',{'aria-label':'Preview root degree',defaultValue:'root',onChange:ev=>{const r=gridDegrees.find(x=>x.id===ev.target.value);if(r){setRootHz(r.hz);stopPreview(false)}},children:gridDegrees.map(g=>u.jsx('option',{value:g.id,children:g.label},g.id))})]}),
      u.jsxs('label',{children:['Reference root (Hz)',u.jsx('input',{type:'number',min:5,max:12000,step:.001,value:Number(rootHz.toFixed(4)),'aria-label':'Preview root frequency in hertz',onChange:ev=>{const x=Number(ev.target.value);if(x>=5&&x<=12000)setRootHz(x)}})]}),
      u.jsxs('div',{className:'xen-hpm03-play-row',children:[
       u.jsx('button',{type:'button',onClick:()=>void playSingle(rootHz,'Root reference'),children:'▶ Root'}),
       u.jsx('button',{type:'button',onClick:()=>void playSingle(noteHz),children:'▶ Tuned note'}),
       u.jsx('button',{type:'button',onClick:()=>void playPattern(),children:'▶ Pattern'}),
       u.jsx('button',{type:'button',onClick:()=>stopPreview(),disabled:!previewPlaying,children:'■ Stop preview'})]}),
      u.jsx('p',{className:'xen-hpm03-preview-state',role:'status',children:previewMessage||'Click/drag pitch to hear a warm reference tone. Play tuned note for selected Nodal/sample sound when available.'})
     ]})]}),
    u.jsxs('div',{className:'xen-hpm02-pitch',children:[u.jsx('strong',{children:'Pitch · slot '+(idx+1)}),u.jsx('p',{className:'xen-hpm02-value',children:formatC(current)}),
      u.jsx('div',{className:'xen-hpm02-rail',role:'slider',tabIndex:0,'aria-label':'Free pitch in cents','aria-valuemin':-1200,'aria-valuemax':1200,'aria-valuenow':current,
       onPointerDown:ev=>{if(ev.button!==0)return;drag.current=ev.pointerId;ev.currentTarget.setPointerCapture(ev.pointerId);updateDrag(ev);void startDrag()},
       onPointerMove:ev=>{if(drag.current===ev.pointerId)updateDrag(ev)},onPointerUp:ev=>finishDrag(ev),onPointerCancel:ev=>finishDrag(ev,true),
       onKeyDown:ev=>{const k=ev.key,delta=({ArrowUp:ev.shiftKey?1:5,ArrowRight:ev.shiftKey?1:5,ArrowDown:ev.shiftKey?-1:-5,ArrowLeft:ev.shiftKey?-1:-5,PageUp:100,PageDown:-100})[k];
        if(delta!==undefined){ev.preventDefault();putPitch(current+delta)}else if(k==='Home'||k==='End'){ev.preventDefault();putPitch(k==='Home'?-1200:1200)}},
       children:[u.jsx('div',{className:'xen-hpm02-zero',style:{top:'50%'}}),...refs.map((reference,i)=>u.jsx('div',{className:'xen-hpm02-tick'+(reference.muted?' muted':''),style:{top:__xenHoldPitchVisualPct(reference.cents)+'%'},title:reference.label},i)),u.jsx('div',{className:'xen-hpm02-current',style:{top:__xenHoldPitchVisualPct(current)+'%'}})]})]}),
    u.jsxs('div',{className:'xen-hpm03-side',children:[
     u.jsxs('div',{className:'xen-hpm03-finetune',children:[u.jsx('strong',{children:'Precise tuning · slot '+(idx+1)}),
       u.jsxs('label',{children:['Pitch (cents)',u.jsx('input',{type:'number',min:-1200,max:1200,step:.001,'aria-label':'Precise pitch in cents',value:current,onChange:ev=>putPitch(Number(ev.target.value))})]}),
       u.jsxs('div',{className:'xen-hpm03-cent-row',children:[u.jsx('button',{type:'button',onClick:()=>putPitch(current-1),children:'−1 ¢'}),u.jsx('button',{type:'button',onClick:()=>putPitch(current+1),children:'+1 ¢'}),u.jsx('button',{type:'button',onClick:()=>putPitch(0),children:'Root · 0 ¢'})]}),
       u.jsxs('label',{children:['Tuned frequency (Hz)',u.jsx('input',{ref:hzInput,type:'number',min:5,max:12000,step:.0001,value:hzDraft,'aria-label':'Tuned frequency in hertz',onChange:ev=>setHzDraft(ev.target.value),onBlur:commitHz,onKeyDown:ev=>{if(ev.key==='Enter'){ev.preventDefault();commitHz();ev.currentTarget.blur()}}})]}),
       u.jsx('p',{className:'xen-hpm02-info',children:'The Hertz value changes this slot relative to the preview root. Values are stored to 0.001 cent; 1-cent buttons remain available.'}),
       u.jsx('strong',{children:'Slot dynamics'}),
       u.jsxs('label',{children:['Volume · '+Math.round(slotGain*100)+'%',u.jsx('input',{type:'range',min:0,max:150,step:1,value:Math.round(slotGain*100),'aria-label':'Slot '+(idx+1)+' volume percent',onChange:ev=>setVolume(Number(ev.target.value)/100)})]}),
       u.jsx('button',{type:'button',onClick:()=>setVolume(1),children:'Reset volume · 100%'}),
       u.jsxs('label',{children:['Microtiming · '+Math.round(slotMicro*100)+'% of slot',u.jsx('input',{type:'range',min:-45,max:45,step:1,value:Math.round(slotMicro*100),'aria-label':'Slot '+(idx+1)+' microtiming percent',onChange:ev=>setMicro(Number(ev.target.value)/100)})]}),
       u.jsx('button',{type:'button',onClick:()=>setMicro(0),children:'Reset timing · 0%'}),
       u.jsx('p',{className:'xen-hpm02-info',children:'Negative = earlier, positive = later. First attack never moves before the gesture starts. Muting preserves these values.'})]}),
     u.jsxs('div',{className:'xen-hpm02-refs',children:[u.jsx('strong',{children:'Exact reference steps'}),
       refs.length?u.jsx('div',{className:'xen-hpm02-ref-list',children:refs.map((reference,i)=>u.jsx('button',{type:'button',
        'aria-label':'Set pitch to '+reference.label+' '+reference.cents+' cents',onClick:()=>{putPitch(reference.cents);void playSingle(rootHz*Math.pow(2,reference.cents/1200),'Reference step')},
        className:(reference.muted?' muted':'')+(Math.abs(current-reference.cents)<.0005?' selected':''),
        children:[reference.label,' · ',formatC(reference.cents)]},i))}):u.jsx('p',{children:'No reference steps. Free tuning is available.'}),
       u.jsx('p',{className:'xen-hpm02-info',children:'References guide pitch only; they never switch the Live Room Grid or change its mutes.'})]})]})]})]})
 }),document.body);
}

function R4({title:e,laneLabel:t,segments:n,customSegments:r,referenceBars:a,patternSteps:o,pitchCents:Q,slotVolumes:V,microtiming:Y,onPitchChange:W,onVolumeChange:WV,onMicrotimingChange:WY,onMemoryLoad:H,tuningOrigin:T,previewRuntime:__holdPreviewRuntime,open:i,onToggle:s,onSegmentsChange:l,onCustomSegmentsChange:c,onReferenceBarsChange:d,onPatternChange:p}){const[f,b]=P.useState(eu(n)),[g,y]=P.useState(eu(r)),[x,A]=P.useState(()=>Math.max(.125,Math.min(16,Number.isFinite(a)?a:1))),[M,v]=P.useState(()=>l0(o,eu(n)));const [detailOpen,setDetailOpen]=P.useState(false);P.useEffect(()=>{if(!i)setDetailOpen(false)},[i]);const qRef=P.useRef(Q);qRef.current=Q;const qChange=B=>{qRef.current=B;W?.(B)};
 const vRef=P.useRef(V);vRef.current=V;const vChange=B=>{vRef.current=B;WV?.(B)};
 const mRef=P.useRef(Y);mRef.current=Y;const mChange=B=>{mRef.current=B;WY?.(B)};P.useEffect(()=>{const B=eu(n);b(B),v(l0(o,B))},[n,o]),P.useEffect(()=>{y(eu(r))},[r]),P.useEffect(()=>{A(Math.max(.125,Math.min(16,Number.isFinite(a)?a:1)))},[a]);const w=P.useMemo(()=>M.reduce((B,O)=>B+(O===0?0:1),0),[M]),k=eG(f)?String(f):"other",I=B=>{const O=l0(B,f);v(O),p(O)},E=B=>{const O=eu(B);b(O);const T=l0(M,O);v(T),l(O),p(T),W&&qChange(__xenHoldPitchVector(qRef.current,O)),WV&&vChange(__xenHoldVolumeVector(vRef.current,O)),WY&&mChange(__xenHoldMicroVector(mRef.current,O))},F=B=>{const O=eu(B);y(O),c(O),E(O)},L=B=>{const O=Math.max(.125,Math.min(16,Number.isFinite(B)?B:1));A(O),d(O)},loadMemory=B=>{b(B.slots);v(B.muteSteps.slice());A(B.referenceBars);qRef.current=B.pitchCents.slice();vRef.current=__xenHoldVolumeVector(B.slotVolumes,B.slots);mRef.current=__xenHoldMicroVector(B.microtiming,B.slots);if(!eG(B.slots))y(B.slots);H?.(B)};return u.jsx("div",{className:"xen-hold-pattern-panel",children:u.jsx(X6,{title:e,open:i,onToggle:s,tabMode:true,children:u.jsxs("div",{className:"xen-hold-pattern flex flex-col gap-2",children:[u.jsx(__XenHPM01Controls,{lane:t==="Keyboard"?"keyboard":"enter",slots:f,referenceBars:x,muteSteps:M,pitchCents:qRef.current,slotVolumes:vRef.current,microtiming:mRef.current,tuningOrigin:T,onLoad:loadMemory}),u.jsx("button",{type:"button",title:"Open detailed Hold Pattern editor",onClick:()=>setDetailOpen(true),className:"xen-hpm02-open",children:"↗ Detailed Editor · reference grids"}),detailOpen?u.jsx(__XenHoldDetailEditor,{lane:t,slots:f,referenceBars:x,muteSteps:M,pitches:Q,volumes:V,microtiming:Y,tuningOrigin:T,previewRuntime:__holdPreviewRuntime,onMute:I,onPitch:qChange,onVolume:vChange,onMicrotiming:mChange,onSlots:E,onBars:L,onClose:()=>setDetailOpen(false)}):null,u.jsxs("div",{className:"grid grid-cols-2 gap-2 sm:grid-cols-5",children:[u.jsx("button",{type:"button",onClick:()=>I(Pw(f)),className:"rounded border border-emerald-700 bg-emerald-950/30 px-2 py-2 text-xs text-emerald-100 hover:bg-emerald-900/40",children:"All"}),u.jsx("button",{type:"button",onClick:()=>I(_ie(f)),className:"rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-xs text-neutral-300 hover:bg-neutral-900",children:"Only 1"}),u.jsx("button",{type:"button",onClick:()=>I(Oie(f)),className:"rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-xs text-neutral-300 hover:bg-neutral-900",children:"delayed"}),u.jsx("button",{type:"button",onClick:()=>I(zie(f)),className:"rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-xs text-neutral-300 hover:bg-neutral-900",children:"Gallopp"}),u.jsx("button",{type:"button",onClick:()=>I(jie(f)),className:"rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-xs text-neutral-300 hover:bg-neutral-900",children:"Nachschlag"})]}),u.jsxs("div",{className:"grid grid-cols-3 gap-2",children:[u.jsxs("div",{children:[u.jsx("label",{className:"mb-1 block text-[10px] uppercase tracking-widest text-neutral-500",children:"Slots"}),u.jsxs("select",{value:k,onChange:B=>{if(B.target.value==="other"){E(g||48);return}E(parseInt(B.target.value,10))},className:"w-full border border-neutral-700 bg-neutral-950 p-1 text-xs text-neutral-300",children:[Z6.map(B=>u.jsx("option",{value:B,children:B},`${t}-${B}`)),u.jsx("option",{value:"other",children:"other"})]})]}),u.jsxs("div",{children:[u.jsx("label",{className:"mb-1 block text-[10px] uppercase tracking-widest text-neutral-500",children:"Other"}),u.jsx("input",{type:"number",min:1,max:256,step:1,value:g,onChange:B=>F(parseInt(B.target.value||"1",10)),className:"w-full border border-neutral-700 bg-neutral-950 p-1 text-xs text-neutral-300"})]}),u.jsxs("div",{children:[u.jsx("label",{className:"mb-1 block text-[10px] uppercase tracking-widest text-neutral-500",children:"Bars"}),u.jsx("input",{type:"number",min:.125,max:16,step:.125,value:x,onChange:B=>L(parseFloat(B.target.value||"1")),className:"w-full border border-neutral-700 bg-neutral-950 p-1 text-xs text-neutral-300",title:"Reference Duration in Bars"})]})]}),u.jsxs("div",{className:"flex items-center justify-between text-[11px] text-neutral-400",children:[u.jsx("span",{children:t}),u.jsxs("span",{children:[w,"/",M.length," active ·",x," T."]})]}),u.jsx(iT,{label:t,steps:M,tone:"neutral",onChange:B=>I(B),pitches:Q,onPitchChange:qChange})]})})})}