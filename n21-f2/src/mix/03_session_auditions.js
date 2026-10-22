/* Sessions library audition adapters. RFL calls its native manager Preview
 * and temporarily owns that existing engine. Drums/Bass use their authentic
 * render owners and send finished PCM to a separate, disposable preview bus. */
const __XenSessionPCM=(()=>{
 let context=null;
 const check=task=>{if(!task.isCurrent())throw new DOMException('Preview cancelled','AbortError')};
 function getContext(){
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)throw Error('AudioContext unavailable.');
  if(!context||context.state==='closed')context=new AC();
  return context;
 }
 async function play(buffer,finished,task,options={}){
  check(task);const ctx=getContext();
  if(ctx.state==='suspended')await ctx.resume();check(task);
  const source=ctx.createBufferSource(),gain=ctx.createGain();
  let rack=null,released=false;
  const stop=()=>{if(released)return;released=true;source.onended=null;try{source.stop()}catch{}try{source.disconnect()}catch{}try{gain.disconnect()}catch{}rack?.dispose();task.signal.removeEventListener('abort',stop)};
  try{
   source.buffer=buffer;gain.gain.value=.72;
   source.connect(gain);
   if(options.drumRack){rack=__f48GetDrumRack(ctx,ctx.destination);rack.update(options.drumRack);gain.connect(rack.input)}else gain.connect(ctx.destination);
   source.onended=()=>{stop();finished()};task.signal.addEventListener('abort',stop,{once:true});
   check(task);
   const offset=Math.max(0,options.offset||0),duration=options.duration??(buffer.duration-offset);
   if(!(duration>0))throw Error('The source loop is empty.');
   source.start(ctx.currentTime,offset,duration);task.playing();return stop;
  }catch(error){stop();throw error}
 }
 return Object.freeze({getContext,check,play});
})();
/* Thin adapter around the native manager's exact Preview callback/engine. */
function __useSessionRFLAudition(value){
 const current=P.useRef(value);current.current=value;
 P.useEffect(()=>__XenMetaAudition.register('rootFollow',{
  managesPhase:true,
  available:entry=>current.current.entries.some(source=>source.id===entry.id),
  start(entry,finished,task){
   const owner={},native=current.current;
   let disposed=false,settled=false,resolve,reject,phaseTimer=null,context=null,prepareTimeout=null;
   const prepared=new Promise((yes,no)=>{resolve=yes;reject=no});
   const clear=()=>{clearTimeout(phaseTimer);phaseTimer=null;clearTimeout(prepareTimeout);prepareTimeout=null;__XenRFLPreviewEvents.delete(observe);task.signal.removeEventListener('abort',stop)};
   const stop=()=>{if(disposed)return;disposed=true;clear();native.stop(owner);if(!settled){settled=true;resolve(()=>{})}};
   const observe=event=>{
    if(disposed||event.loopId!==entry.id)return;
    if(event.stage==='first-render-window'){
     const launch=event.detail?.renderWindowStartSec??event.audioNowSec;
     const ready=()=>{if(disposed||!task.isCurrent())return;if(context?.state==='closed'){fail(Error('Root Follow audio context closed.'));return}if(context?.state==='suspended'||(Number.isFinite(context?.currentTime)&&context.currentTime<launch)){phaseTimer=setTimeout(ready,35);return}clearTimeout(prepareTimeout);prepareTimeout=null;task.playing()};
     phaseTimer=setTimeout(ready,Math.max(0,(launch-event.audioNowSec)*1000));
     if(!settled){settled=true;resolve(stop)}
    }else if(event.stage==='scheduler-error'){
     fail(Error(event.detail?.message||'Root Follow preview failed.'));
    }
   };
   const fail=error=>{if(disposed)return;disposed=true;clear();native.stop(owner);if(!settled){settled=true;reject(error)}else task.failed(error)};
   prepareTimeout=setTimeout(()=>fail(Error('Root Follow preview did not become ready.')),20000);
   __XenRFLPreviewEvents.add(observe);task.signal.addEventListener('abort',stop,{once:true});
   Promise.resolve(native.toggle(entry.id,{owner,signal:task.signal,onReady:value=>{context=value},onStop:()=>{if(disposed)return;disposed=true;clear();if(!settled){settled=true;resolve(()=>{})}finished()}})).then(started=>{
    if(!started&&!disposed){clear();disposed=true;if(!settled){settled=true;reject(Error('Root Follow preview could not start.'))}}
   }).catch(error=>{clear();disposed=true;if(!settled){settled=true;reject(error)}});
   return prepared;
  }
 }),[]);
}
function __useSessionRhythmAuditions(value){
 const current=P.useRef(value);current.current=value;
 P.useEffect(()=>{
  const drum={managesPhase:true,
   available:entry=>current.current.drumEntries.some(source=>source.id===entry.id),
   async start(entry,finished,task){
    const input=current.current,params=JSON.parse(JSON.stringify(input.params));
    const selected=input.drumEntries.find(source=>source.id===entry.id);
    if(!selected)throw Error('Drum pattern is missing.');
    const saved=selected.kind==='exported'?input.exportedDrums.find(source=>source.id===selected.value):null;
    if(selected.kind==='exported'&&!saved)throw Error('Saved drum pattern is missing.');
    const grid=saved?im({...JSON.parse(JSON.stringify(saved)),useCustom:true}):null;
    // Presets use precisely their library owner's two-bar marked grid.
    const bars=grid?.bars??__mlGridFromSelection({pattern:selected.value}).bars;
    const bpm=Number(saved?.bpm??params.quantizeBpm);
    if(!(bpm>0))throw Error('Drum tempo is unavailable.');
    const request={composer:{bars,beatsPerBar:4,stepsPerBar:16,notes:[],tracks:[],activeTrackIds:[]},
     bars,bpm,trackIds:[],drumCycleBars:bars,customDrumPattern:grid,
     drumPattern:grid?undefined:selected.value,drumKit:saved?.drumKit??params.drumKit,
     drumLevel:params.drumVolume??.9,drumStyle:Q9(params),
     drumLaneKitOverrides:saved?.laneKitOverrides??saved?.drumLaneKits??params.drumLaneKits??{},
     drumLaneSettings:saved?.laneSettings??params.drumLaneSettings??{},signal:task.signal};
    // Missing raw references fail visibly; the ordinary export renderer can
    // otherwise silently omit them, which would misrepresent a library record.
    for(const lane of __f52SampleLanes){const id=grid?.sampleSlots?.[lane]?.id;if(id&&!(await gw(id)))throw Error('Missing drum sample: '+id);__XenSessionPCM.check(task)}
    const buffer=await z$(request,{drumOnly:true,tailSec:.18});__XenSessionPCM.check(task);
    return __XenSessionPCM.play(buffer,finished,task,{drumRack:__f48CleanRack(params)});
   }};
  const bass={managesPhase:true,
   available:entry=>entry.id.startsWith('clip:')?!!eH(entry.id.slice(5)):entry.id.startsWith('preset:')&&current.current.bassPatterns.some(source=>source.value===entry.id.slice(7)),
   async start(entry,finished,task){
    const input=current.current,params=JSON.parse(JSON.stringify(input.params));
    let clip;
    if(entry.id.startsWith('clip:')){const source=eH(entry.id.slice(5));if(!source)throw Error('Bass clip is missing.');clip=Pr(JSON.parse(JSON.stringify(source)))}
    else {const pattern=entry.id.slice(7);if(!input.bassPatterns.some(source=>source.value===pattern))throw Error('Bass preset is missing.');clip=Gle({pattern,rootHz:params.bassRootHz,swing:params.grooveSwing,bassGrit:params.bassGrit,seed:input.bassContext?.seed,barIndex:input.bassContext?.barIndex,descriptors:input.bassContext?.descriptors,pitchMode:params.psyBassPitchMode,tuningId:params.gridTuning})}
    const bpm=Number(clip.generatorMeta?.bpm??params.quantizeBpm);
    if(!(bpm>0))throw Error('Bass tempo is unavailable.');
    const stepSec=60/Math.max(40,bpm)/4,steps=clip.bars*16,notes=[];
    const root=clip.generatorMeta?.rootBinding==='free'?(clip.generatorMeta.rootHz??params.bassRootHz):params.bassRootHz;
    // Resolve every grid pitch at click time, before any asynchronous operation.
    // No subsequent live tuning change can alter this immutable audition plan.
    for(let step=0;step<steps;step++)lce({clip,normalized:true,step,time:step*stepSec,rootHz:root,bassLevel:params.bassVolume??.8,quantizeBpm:bpm,
     playBassNote:(time,hz,level,duration,accent,options)=>{const pitch=__XenBassGrid.quantize(hz);if(pitch>0)notes.push({time,hz:pitch,level,duration,accent,options})}});
    const duration=Math.max(steps*stepSec,...notes.map(note=>note.time+Math.min(8,note.duration*(params.bassDecay??1))))+.12;
    const rate=44100,offline=new OfflineAudioContext(2,Math.ceil(duration*rate),rate),pan=offline.createStereoPanner();
    pan.pan.value=__XenPan.snapshot().bass||0;pan.connect(offline.destination);
    const owner=OPe({audioCtx:offline,nexusParamsRef:{current:params},bassDestination:pan,quantizeBassHz:hz=>hz});
    for(const note of notes)owner.playBassNote(note.time,note.hz,note.level,note.duration,note.accent,note.options);
    const buffer=await offline.startRendering();__XenSessionPCM.check(task);
    return __XenSessionPCM.play(buffer,finished,task);
   }};
  const offDrum=__XenMetaAudition.register('drum',drum),offBass=__XenMetaAudition.register('bass',bass);
  return()=>{offDrum();offBass()};
 },[]);
}
