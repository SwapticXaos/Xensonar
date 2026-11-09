
/* L9-DIAG1 (diagnostic build only): bounded, passive source and playback witness.
 * Observers are side-chains through ZERO-GAIN sinks. They do not replace any
 * instrument connection, modify PCM, or participate in the recorder clock.
 * Analyser polling is an estimate: a silent window DOES NOT prove no audio
 * occurred between polls. Diagnose with the corresponding raw WAV as well.
 */
const __XenLoopRecWitness=(()=>{
 const kinds=['keyboard','wave','particle','rootFollow'];
 const completed=[],playback=[],active=new Map();
 let enabled=(()=>{try{return new URLSearchParams(globalThis.location?.search||'').get('xenDiag')==='1'||globalThis.localStorage?.getItem('xensonar.looprec.diag')==='1'}catch{return false}})(),lastTakeId=null,serial=0;
 const bounded=(arr,item,max)=>{arr.push(item);if(arr.length>max)arr.shift()};
 const clean=v=>Number.isFinite(v)?Math.round(v*1e6)/1e6:null;
 const clock=()=>Date.now();
 function tap(ctx,node){
  if(!ctx?.createAnalyser||!ctx?.createGain||!ctx?.destination)return null;
  const input=ctx.createGain(),analyser=ctx.createAnalyser(),silent=ctx.createGain();
  analyser.fftSize=2048;analyser.smoothingTimeConstant=0;silent.gain.value=0;
  input.connect(analyser);analyser.connect(silent);silent.connect(ctx.destination);
  const buf=new Float32Array(analyser.fftSize);
  let attached=false;
  try{if(node){node.connect(input);attached=true}}catch{}
  return {input,analyser,silent,buf,attached,close(){try{if(node&&attached)node.disconnect(input)}catch{};for(const x of [input,analyser,silent])try{x.disconnect()}catch{}}};
 }
 function measure(meter,stat){
  try{meter.analyser.getFloatTimeDomainData(meter.buf);let peak=0,sum=0;
   for(let i=0;i<meter.buf.length;i++){const x=meter.buf[i];const a=Math.abs(x);if(a>peak)peak=a;sum+=x*x}
   const rms=Math.sqrt(sum/meter.buf.length);
   stat.windows++;stat.peak=Math.max(stat.peak,peak);stat.rmsMax=Math.max(stat.rmsMax,rms);stat.rmsSqSum+=rms*rms;
   if(peak>0.0001&&rms>0.00001)stat.activeWindows++;
  }catch(error){stat.meterErrors++;stat.lastError=String(error?.message??error)}
 }
 function stat(){return{connections:0,windows:0,activeWindows:0,peak:0,rmsMax:0,rmsSqSum:0,meterErrors:0}}
 function pack(a){return{connections:a.connections,windows:a.windows,activeWindows:a.activeWindows,peak:clean(a.peak),rmsMax:clean(a.rmsMax),rmsMean:clean(a.windows?Math.sqrt(a.rmsSqSum/a.windows):0),meterErrors:a.meterErrors,
  // An inactive sampled window never proves absence of all transient audio.
  observedSignal:a.activeWindows>0?true:(a.windows>0?false:null)}}
 function start(ctx,meta){
  const id=meta.traceId||'capture-witness-'+(++serial);
  if(!enabled)return{setBoundary(){},attach(){},detach(){},stop(){return{traceId:id,enabled:false,reason:'disabled'}}};
  const taps=new Map(),stats=new Map(),attached=new Map();
  try{for(const kind of kinds){const m=tap(ctx,null);if(m)taps.set(kind,m);stats.set(kind,stat())}}
  catch(error){for(const m of taps.values())m.close();return{setBoundary(){},attach(){},detach(){},stop(){return{traceId:id,enabled:false,reason:String(error)}}}}
  const result={traceId:id,enabled:true,available:taps.size===kinds.length,createdAt:clock(),startFrame:meta.startFrame,recordingStartSec:meta.startSec,sampleRate:ctx.sampleRate,bpm:meta.bpm,sourceLevels:{},meterKind:'parallel-zero-gain-analyser',sampleIntervalMs:75};
  let ended=false;
  const timer=setInterval(()=>{
   if(ctx.state==='closed'||ctx.currentTime<result.recordingStartSec)return;
   for(const [kind,m] of taps)measure(m,stats.get(kind));
  },75);
  const witness={
   setBoundary(startSec,startFrame){result.recordingStartSec=startSec;result.startFrame=startFrame},
   attach(kind,node){if(ended||!taps.has(kind)||!node||attached.has(node))return;
    try{node.connect(taps.get(kind).input);attached.set(node,kind);stats.get(kind).connections++}catch(error){stats.get(kind).meterErrors++;stats.get(kind).lastError=String(error)}
   },
   detach(kind,node){const k=attached.get(node);if(k===undefined)return;attached.delete(node);try{node.disconnect(taps.get(k).input)}catch{}},
   stop(phase='finished'){
    if(ended)return result;ended=true;clearInterval(timer);
    for(const [node,kind] of attached){try{node.disconnect(taps.get(kind).input)}catch{}}
    attached.clear();for(const m of taps.values())m.close();
    result.endedAt=clock();result.phase=phase;
    result.sourceLevels=Object.fromEntries(kinds.map(k=>[k,pack(stats.get(k))]));
    // No inference of the actual contribution to the summed PCM from peak alone.
    bounded(completed,result,12);active.delete(id);return result;
   }
  };
  active.set(id,witness);return witness;
 }
 function recordPlayback(info){
  if(!enabled||!info?.id)return()=>{};
  const {ctx,source,id}=info;
  const r={entryId:id,at:clock(),audioNowSec:clean(ctx?.currentTime),sampleRate:ctx?.sampleRate??null,
   recordedBpm:info.recordedBpm??null,playBpm:info.bpm,materialTimeMode:info.materialTimeMode,
   playbackRate:clean(info.playbackRate),startAtSec:clean(info.startAtSec),
   offsetSec:clean(info.offsetSec),attackPhaseSec:clean(info.attackPhaseSec),
   phaseEngine:info.phaseEngine,pitchCents:info.pitchCents,att:info.att,nudgeMode:info.nudgeMode,
   busTap:'material-EQ-output, parallel zero-gain meter',windows:0,activeWindows:0,peak:0,rmsMax:0};
  bounded(playback,r,12);
  let meter;try{meter=tap(ctx,source)}catch(error){r.meterStatus='failed';r.meterError=String(error?.message??error);return()=>{}}
  if(!meter){r.meterStatus='unavailable';return()=>{}};
  const a=stat();let timer=null,closed=false;
  function stop(){if(closed)return;closed=true;clearInterval(timer);r.endedAt=clock();Object.assign(r,pack(a));meter.close()}
  const started=clock();timer=setInterval(()=>{
   if(ctx.state==='closed'||clock()-started>18000){stop();return}
   if(ctx.currentTime<info.startAtSec)return;
   measure(meter,a);if(ctx.currentTime>=info.startAtSec+4)stop();
  },75);
  return stop;
 }
 function setTakeId(traceId,id){if(!id)return;lastTakeId=id;
  for(const r of completed)if(r.traceId===traceId)r.takeId=id;
 }
 function snapshot(){return{schema:'xensonar-looprec-diag1-v1',enabled,lastTakeId,
   recentCaptures:completed.map(r=>structuredCloneSafe(r)),recentPlayback:playback.map(r=>structuredCloneSafe(r)),activeCaptureCount:active.size,
   limitations:['Source RMS/peak are sampled side-chain observations, not a full PCM stem or guaranteed exhaustive evidence.','Material-output side-chain peak does not establish pitch fidelity; compare the raw WAV and audible output.']}}
 function structuredCloneSafe(v){return JSON.parse(JSON.stringify(v))}
 function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000)}
 function report(){const id=lastTakeId;let rec=null;
  try{rec=__XenLoopRec.diagnostics()}catch{}
  return{...snapshot(),loopRec:rec,voice:id&&typeof __XenMaterialVoiceMix!=='undefined'?__XenMaterialVoiceMix.get(id):null,
   materialPitch:id?globalThis.__XEN_LANE_PITCH_DIAGNOSTICS__?.material?.[id]??null:null,
   materialPhase:id?globalThis.__XEN_MATERIAL_PHASE_DIAGNOSTICS__?.materials?.[id]??null:null,
   exportedAt:new Date().toISOString()};
 }
 function saveReport(){download(new Blob([JSON.stringify(report(),null,2)],{type:'application/json'}),'XenSonar_L9_DIAG1_'+(lastTakeId||'no-take')+'.json');return report()}
 async function exportLastWav(){
  if(!lastTakeId)throw Error('No DIAG1 take ID yet. Record a Loop before exporting.');
  const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('xensonar-material-library');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  let row;try{row=await new Promise((resolve,reject)=>{const tx=db.transaction('materials','readonly'),req=tx.objectStore('materials').get(lastTakeId);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}finally{db.close()}
  if(!row?.sessionTake||!(row.blob instanceof Blob)||row.blob.size<=44)throw Error('Durable raw WAV for '+lastTakeId+' not available in this origin; no fabricated export.');
  download(row.blob,(row.name||lastTakeId).replace(/[^\w.-]+/g,'_')+'_RAW.wav');return{id:row.id,bytes:row.blob.size};
 }
 async function exportBundle(){const data=saveReport();const wav=await exportLastWav();return{report:data.schema,wav}}
 return Object.freeze({start,recordPlayback,setTakeId,snapshot,report,saveReport,exportLastWav,exportBundle,
  enable(value){enabled=!!value;return enabled}});
})();
if(typeof window!=='undefined')window.__XenLoopRecForensics=Object.freeze({
 snapshot:()=>__XenLoopRecWitness.report(),saveReport:()=>__XenLoopRecWitness.saveReport(),
 exportLastWav:()=>__XenLoopRecWitness.exportLastWav(),exportBundle:()=>__XenLoopRecWitness.exportBundle(),
 enable:v=>__XenLoopRecWitness.enable(v)
});

/* Loop-Rec LR1: separate take owner; no Master Recording state or second synth. */
const __XenLoopRec=(()=>{
 const destinations=new WeakSet(),routes=new WeakMap(),captured=new WeakSet(),nodes=new Map(),origins=new Map(),listeners=new Set();
 let owner=null,take=null,last=null,captureReport=null,rootRouteAttempts=0,rootRouteAccepted=0,rootWanted=false,state=Object.freeze({phase:'idle',message:''});
 const history=[],pending=new Map();let sequence=0,recoveryBusy=false;
 const note=(event,details={})=>{history.push({seq:++sequence,at:Date.now(),event,...details});if(history.length>96)history.shift()};
 const publish=(phase,message='')=>{state=Object.freeze({phase,message});note('phase',{phase,message});for(const fn of listeners)fn()};
 function eligible(kind){return ['wave','keyboard','particle','rootFollow'].includes(kind)}
 function mark(node){if(node)destinations.add(node);return node}
 function route(ctx,kind,destination){
  // ROUTE-STABILITY03: Avalanche inputs already feed an owned LoopRec/instrument EQ chain.
  // Re-routing them here would build a second EQ/recorder tap and oscillate audio graph targets.
  if(!eligible(kind)||!destination||captured.has(destination)||
     (typeof __XenAvalanche!=='undefined'&&__XenAvalanche.isInput?.(ctx,destination)))return destination;
  let map=routes.get(destination);if(!map){map=new Map();routes.set(destination,map)}
  if(map.has(kind))return map.get(kind);
  const node=ctx.createGain();node.gain.value=1;node.connect(destination);captured.add(node);
  // Instrument EQ precedes the existing Loop-Rec tap: live output and captured PCM
  // share one filtered lane. No new synthesis, pan, or recorder owner.
  const instrument=['particle','wave','keyboard'].includes(kind);
  const input=instrument?__XenEQ.route(ctx,kind,node,'instrument'):node;
  map.set(kind,input);captured.add(input);
  const record={ctx,node,kind};nodes.set(node,record);
  const closed=()=>{if(ctx.state!=='closed')return;nodes.delete(node);map.delete(kind);ctx.removeEventListener?.('statechange',closed)};
  ctx.addEventListener?.('statechange',closed);
  if(take?.ctx===ctx&&take.bus&&(kind!=='rootFollow'||take.owner.params().rootFollowLoopActive))connectCapture(take,node);
  return input;
 }
 function rootDestination(ctx,kind,destination){if(kind!=='rootFollow')return destination;rootRouteAttempts++;if(destinations.has(destination)){rootRouteAccepted++;return route(ctx,kind,destination)}return destination}
 function boundary(now,anchor,bar,window){const n=Math.round((now-anchor)/bar),near=anchor+n*bar;return Math.abs(now-near)<=window?near:anchor+Math.ceil((now-anchor)/bar)*bar}
 function connectCapture(t,node){if(!t?.bus||t.wired?.has(node))return;node.connect(t.bus);t.wired.add(node);
  const kind=nodes.get(node)?.kind;if(kind)t.witness?.attach(kind,node);
 }
 function disconnectCapture(t,node){if(!t?.bus||!t.wired?.has(node))return;
  const kind=nodes.get(node)?.kind;if(kind)t.witness?.detach(kind,node);
  try{node.disconnect(t.bus)}catch{}t.wired.delete(node);
 }
 function disconnect(t){for(const node of t.wired??[])disconnectCapture(t,node);try{t.bus?.disconnect()}catch{}t.ctx.removeEventListener?.('statechange',t.onstate);clearTimeout(t.limitTimer);clearTimeout(t.startTimer);if(t.witness)t.witnessResult=t.witness.stop('disconnected')}
 function fail(error){if(last?.blob&&!last.committed)pending.set(last.id,last);note('failed',{reason:String(error?.message||error),takeId:take?.id??last?.id??null});const t=take;if(t){t.rec?.abort();if(t.ctx)disconnect(t);take=null}publish('failed',String(error?.message||error));}
 async function start(){
  if(take||!owner){note('start-rejected',{reason:take?'active-take':'owner-unavailable'});return;}
  const t={owner,epoch:__XenMetaSessions.loopRecEpoch?.(),session:__XenMetaSessions.snapshot().activePalette?.id??null,wired:new Set(),traceId:'diag1-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)};take=t;last=null;captureReport=null;publish('arming');
  try{
   Object.assign(t,__XenMetaSessions.prepareLoopRec?.()??{});
   t.ownerKey=t.ownerKey??t.session;
   const ctx=await t.owner.ready();if(take!==t)return;t.ctx=ctx;
   if(ctx.state!=='running')throw Error('Audio is not running.');
   const bpm=Number(t.owner.params().quantizeBpm)||108;t.bpm=bpm;t.bar=240/bpm;
   t.anchor=Number.isFinite(t.owner.anchor())?t.owner.anchor():0;
   t.bus=ctx.createGain();t.bus.gain.value=1;
   t.rec=await __xenCreateMasterPCMRecorder(ctx,null,t.bus,{});
   if(take!==t){t.rec.abort();disconnect(t);return}
   t.witness=__XenLoopRecWitness.start(ctx,{traceId:t.traceId,startSec:Infinity,startFrame:null,bpm:t.bpm});t.start= t.anchor+Math.ceil((ctx.currentTime+.025-t.anchor)/t.bar)*t.bar;
   t.startFrame=Math.round(t.start*ctx.sampleRate);t.witness.setBoundary(t.start,t.startFrame);
   note('armed-boundary',{bpm:t.bpm,barSec:t.bar,anchor:t.anchor,start:t.start,startFrame:t.startFrame,audioNow:ctx.currentTime,session:t.session,epoch:t.epoch});
   t.rec.onstop=()=>{void finish(t).catch(error=>{last=t;fail(error)})};
   t.rec.onerror=e=>fail(e.error??Error('Capture failed.'));
   for(const {node,ctx:c,kind}of nodes.values())if(c===ctx&&(kind!=='rootFollow'||t.owner.params().rootFollowLoopActive))connectCapture(t,node);
   t.rec.start({startFrame:t.startFrame});
   t.onstate=()=>{if(ctx.state!=='running'&&take===t)fail(Error('Audio stopped; take was not committed.'))};ctx.addEventListener?.('statechange',t.onstate);
   // A bounded take, explicit error rather than unbounded memory growth.
   t.limitTimer=setTimeout(()=>{if(take===t)stop()},Math.min(600000,256*1024*1024/(ctx.sampleRate*8)*1000));
   publish('armed');t.startTimer=setTimeout(()=>{if(take===t&&state.phase==='armed')publish('recording')},Math.max(0,(t.start-ctx.currentTime)*1000));
  }catch(error){if(take===t)fail(error)}
 }
 function stop(){
  const t=take;if(!t||!t.rec||state.phase!=='recording'){note('stop-rejected',{phase:state.phase,hasTake:!!t,hasRecorder:!!t?.rec});return;}
  const now=t.ctx.currentTime,window=Math.min(60/t.bpm/4,.150);
  t.end=Math.max(t.start+t.bar,boundary(now,t.anchor,t.bar,window));t.endFrame=Math.round(t.end*t.ctx.sampleRate);
  t.bars=Math.round((t.end-t.start)/t.bar);publish('finishing','Enough · closing '+t.bars+' bar'+(t.bars===1?'':'s')+'…');note('quantized-stop',{clickedAudioSec:now,anchor:t.anchor,startSec:t.start,endSec:t.end,startFrame:t.startFrame,endFrame:t.endFrame,bpm:t.bpm,barSec:t.bar,toleranceSec:window,bars:t.bars,rounding:Math.abs(now-(t.anchor+Math.round((now-t.anchor)/t.bar)*t.bar))<=window?'within-tolerance':'next-boundary'});
  // Worklet owns the future cut; past cuts are cropped by absolute frame index.
  t.rec.stopAtFrame(t.endFrame);
 }
 async function finish(t){
  disconnect(t);if(take!==t)return;
  const rate=t.ctx.sampleRate,first=t.rec.firstFrame;
  if(!Number.isFinite(first))throw Error('Capture has no audio frame origin.');
  const from=t.startFrame-first,count=t.endFrame-t.startFrame;
  note('pcm-coverage-check',{firstFrame:first,recordedFrames:t.rec.frames,startFrame:t.startFrame,endFrame:t.endFrame,expectedFrames:count,fromFrame:from,frameGaps:t.rec.frameGaps,firstGapFrame:t.rec.firstGapFrame,gaps:t.rec.gaps});
  // The old from/count check was only valid for a perfectly contiguous stream.
  // Instead project original received PCM by actual audio-frame positions.
  // Capture anomalies are recorded, not treated as an aesthetic veto.
  const projected=await t.rec.toTimelinePCM(t.startFrame,t.endFrame);
  const {left,right}=projected;
  const integrity=projected.report;
  captureReport={phase:'pcm-ready',frames:t.rec.frames,croppedFrames:count,bars:t.bars,
    frameGaps:t.rec.frameGaps,integrity,sampledPeak:0,rootRouteAttempts,rootRouteAccepted,
    rootConnected:[...nodes.values()].filter(n=>n.kind==='rootFollow'&&n.ctx===t.ctx).length,rootWanted};
  captureReport.sourceWitness=t.witnessResult??{traceId:t.traceId,available:false};
  for(let k=0;k<left.length;k+=64){const a=Math.abs(left[k]),b=Math.abs(right[k]);
    if(a>captureReport.sampledPeak)captureReport.sampledPeak=a;
    if(b>captureReport.sampledPeak)captureReport.sampledPeak=b}
  if(integrity.frameGaps||integrity.reconstructedFrames||integrity.timelineOverflow){
    // Keep byte-identical captured sample order in a second WAV only when
    // anomalies occur. The playback WAV may contain explicitly marked gaps.
    // If raw-order was used, the playback WAV itself is the original PCM.
    // Avoid duplicating an identical multi-megabyte blob in IndexedDB.
    if(!integrity.rawOrderUsed)t.rawCaptureBlob=t.rec.toWavBlob();
    note('pcm-timeline-reconstructed',{...integrity});
  }
  t.captureIntegrity=integrity;
  t.blob=await __xenRecorderFloatWav(left,right,rate);t.duration=count/rate;
  t.rec.release();
  t.id='loop-rec-'+(globalThis.crypto?.randomUUID?.()??Date.now().toString(36));__XenLoopRecWitness.setTakeId(t.traceId,t.id);const activeIds=new Set(__XenMetaSessions.activeSessionTakeIds());
  const previousNames=[...bs().entries.filter(e=>activeIds.has(e.id)||e.sessionTake&&e.loopRecIntent?.ownerKey===t.ownerKey),...[...pending.values()].filter(p=>(p.ownerKey??p.session)===t.ownerKey)];
  t.name='Loop '+(1+Math.max(0,...previousNames.map(e=>Number(e.name?.match(/^Loop (\d+)$/)?.[1])).filter(Number.isFinite)));
  last=t;await commit(t);
 }
 async function commit(t){
  publish('saving');
  const pkg={schemaVersion:qT,id:t.id,name:t.name,role:'loop',audio:{kind:'audio',mimeType:'audio/wav',blob:t.blob,durationSec:t.duration,channels:2,sampleRate:t.ctx.sampleRate},timing:{bpm:t.bpm,bars:t.bars,beatsPerBar:4,loopStartSec:0,loopEndSec:t.duration,intendedLoopDurationSec:t.duration},renderInfo:{sourceVersion:'Loop-Rec LR8',renderMode:'live-pcm',workspaceOrigin:'external'},provenance:{createdAt:new Date().toISOString()}};
  const entry=t.entry??await __registerDurableMaterial(pkg,{sessionTake:true,loopRecIntent:{version:1,state:'pending',sessionId:t.session,ownerKey:t.ownerKey??t.session,captureIntegrity:t.captureIntegrity??null,rawCaptureBlob:t.rawCaptureBlob??null}});t.entry=entry;note('asset-durable',{id:entry.id});if(captureReport)captureReport.assetWritten=true;
  if(take===t)take=null;
  if((__XenMetaSessions.snapshot().activePalette?.id??null)!==t.session||__XenMetaSessions.loopRecEpoch?.()!==t.epoch){pending.set(t.id,t);last=null;publish('idle','Audio retained. Return to its Session and right-click Loop-Rec to recover.');return}
  const ref={kind:'material',id:entry.id,name:entry.name};
  origins.set(entry.id,{ctx:t.ctx,origin:t.start});
  if(!t.committed&&!__XenMetaSessions.appendLoopRec(entry,t.session,t.epoch))throw Error('Take saved; Working Session could not be committed.');
  t.committed=true;pending.delete(t.id);await markLinked(entry);note('working-committed',{id:entry.id,session:t.session});if(captureReport)captureReport.sessionCommitted=true;
  // Wait for the real material adapter's React publication, never fabricate one.
  for(let i=0;i<30&&!__XenQuick.adapters.get('material')?.entries.some(x=>x.id===entry.id);i++)await new Promise(r=>setTimeout(r,10));
  const adapter=__XenQuick.adapters.get('material');if(!adapter?.entries.some(x=>x.id===entry.id)){note('activation-deferred',{id:entry.id,reason:'material-adapter-unavailable'});publish('idle','Take saved in Session; Material Track not yet ready.');last=null;return}
  if((__XenMetaSessions.snapshot().activePalette?.id??null)!==t.session||__XenMetaSessions.loopRecEpoch?.()!==t.epoch){
   note('activation-deferred',{id:entry.id,reason:'session-changed'});last=null;publish('idle','Take saved; Session changed before activation.');return;
  }
  const p=t.owner.params(),primary=adapter.selected;
  const valid=adapter.entries.map(row=>row.id);
  const previous=p.materialLoopActive?__XenMaterialLayers.oldestFirst(primary,
    __XenMaterialPrimarySwitch.snapshot()):[];
  const keep=p.materialLoopActive?__XenMaterialLayers.autoPromote(entry.id,primary,
    __XenMaterialPrimarySwitch.snapshot(),valid):valid.includes(entry.id)?[]:null;
  if(!keep){note('activation-deferred',{id:entry.id,reason:'missing-adapter-entry'});publish('idle','Saved '+entry.name+'; selection not ready.');last=null;return}
  // The new recording is the primary voice, the two newest prior voices are
  // secondary voices. An evicted voice is MUTED, never deleted from Session/IDB.
  __XenMaterialLayers.restore(keep,valid,entry.id);
  __XenMaterialLayers.touch(entry.id);
  __XenMaterialPrimarySwitch.setMuted(false);
  __XenMaterialVoiceMix.set(entry.id,'volume',1);
  // A newly captured live PCM take must first be heard at its recorded
  // speed. Existing Half/Double material mode would otherwise transpose the
  // keyboard melody by an octave during automatic activation.
  // Later explicit user changes to the material time mode remain available.
  t.owner.patch({materialLoopId:entry.id,materialLoopActive:true,
    materialLoopVolume:1,materialLoopTimeMode:'normal',materialLoopSyncToBeat:true});
  __XenMetaSessions.scheduleWorkingCopy?.();
  note('activation-requested',{id:entry.id,previous,retained:keep,
    evicted:previous.filter(id=>!keep.includes(id))});
  publish('idle',entry.name+' saved · playing ('+(keep.length+1)+'/3 voices).');last=null;
 }
 async function markLinked(entry){
  if(!entry.loopRecIntent)return;
  const next={...entry,loopRecIntent:{...entry.loopRecIntent,state:'linked'}};
  try{await KT(next);entry.loopRecIntent=next.loopRecIntent}catch(error){note('recovery-marker-pending',{id:entry.id,reason:String(error)})}
 }
 async function retryPending(){
  if(take||recoveryBusy||!['idle','failed'].includes(state.phase))return false;
  recoveryBusy=true;publish('saving');let count=0;
  try{
   await __ensureMaterialLibraryHydrated();
   const identity=__XenMetaSessions.prepareLoopRec();
   const eligible=intent=>intent?.ownerKey===identity.ownerKey;
   const rows=new Map(bs().entries.filter(e=>e.sessionTake&&e.loopRecIntent?.state==='pending'&&eligible(e.loopRecIntent)).map(e=>[e.id,{entry:e}]));
   for(const [id,t]of pending)if((t.ownerKey??t.session)===identity.ownerKey)rows.set(id,t);
   for(const [id,t]of rows){
    // Recheck after each await: navigation may have changed the live owner.
    if(__XenMetaSessions.loopRecOwnerKey()!==identity.ownerKey||__XenMetaSessions.loopRecEpoch()!==identity.epoch)throw Error('Session changed during recovery.');
    let entry=t.entry;
    if(!entry){
     const pkg={schemaVersion:qT,id:t.id,name:t.name,role:'loop',audio:{kind:'audio',mimeType:'audio/wav',blob:t.blob,durationSec:t.duration,channels:2,sampleRate:t.ctx.sampleRate},timing:{bpm:t.bpm,bars:t.bars,beatsPerBar:4,loopStartSec:0,loopEndSec:t.duration,intendedLoopDurationSec:t.duration},renderInfo:{sourceVersion:'Loop-Rec LR8',renderMode:'live-pcm',workspaceOrigin:'external'},provenance:{createdAt:new Date().toISOString()}};
     entry=await __registerDurableMaterial(pkg,{sessionTake:true,loopRecIntent:{version:1,state:'pending',sessionId:identity.session,ownerKey:identity.ownerKey,captureIntegrity:t.captureIntegrity??null,rawCaptureBlob:t.rawCaptureBlob??null}});t.entry=entry;
    }
    if(!__XenMetaSessions.appendLoopRec(entry,identity.session,identity.epoch))throw Error(__XenMetaSessions.snapshot().error||'Session could not be recovered.');
    await markLinked(entry);t.committed=true;pending.delete(id);count++;
   }
   publish('idle',count?'Recovered '+count+' Session Take(s).':'No pending takes for this Session.');return true;
  }catch(error){publish('failed','Recovery: '+error.message);return false}
  finally{recoveryBusy=false;}
 }
 async function toggle(){if(state.phase==='armed'){
  // AudioContext time, not the best-effort main-thread UI timer, owns the
  // quantized recording boundary. A delayed timer must never discard an
  // already-running take when Enough! is pressed after its start frame.
  if(take?.ctx&&Number.isFinite(take.start)&&take.ctx.currentTime>=take.start){
   note('armed-ui-late',{start:take.start,audioNow:take.ctx.currentTime});
   publish('recording');stop();
  }else fail(Error('Loop-Rec cancelled before start.'));
  return;
 }if(state.phase==='recording')stop();else if(state.phase==='idle'||state.phase==='failed'){await start()}}
 // Mic-Enough semantics: discard is a distinct, non-committing lifecycle exit.
 // In particular, never invoke the quantized stop/finalize path.
 function discard(){
  const t=take;
  if(!t||!['arming','armed','recording'].includes(state.phase))return false;
  const was=state.phase;
  // Invalidate the owner before aborting; stale worklet messages and awaited
  // ready/create continuations must not complete a discarded take.
  take=null;last=null;captureReport=null;
  if(t.rec){t.rec.onstop=null;t.rec.onerror=null;try{t.rec.abort()}catch(error){note('discard-abort-warning',{reason:String(error)})}}
  if(t.ctx)try{disconnect(t)}catch(error){note('discard-disconnect-warning',{reason:String(error)})}
  note('take-discarded',{phase:was,traceId:t.traceId});
  publish('idle','Loop-Rec recording discarded.');
  return true;
 }
 return {observe:(event,details={})=>note(event,details),diagnostics:()=>({state,witness:__XenLoopRecWitness.snapshot(),pending:[...new Set([...pending.keys(),...bs().entries.filter(e=>e.sessionTake&&e.loopRecIntent?.state==='pending').map(e=>e.id)])],history:history.slice(),captureReport,rootRouteAttempts,rootRouteAccepted,rootWanted,liveRoutes:Object.fromEntries(['wave','keyboard','particle','rootFollow'].map(kind=>[kind,[...nodes.values()].filter(n=>n.kind===kind).length])),take:take?{start:take.start,end:take.end,frames:take.rec?.frames??0,session:take.session,assetWritten:!!take.entry,sessionCommitted:!!take.committed}:null}),rootActive(active){rootWanted=!!active;if(!take?.bus)return;for(const {node,kind,ctx}of nodes.values())if(kind==='rootFollow'&&ctx===take.ctx){try{active?connectCapture(take,node):disconnectCapture(take,node)}catch{}}},route,mark,isDestination:node=>destinations.has(node),rootDestination,boundary,capturedInput:node=>captured.add(node),origin:(id,ctx)=>origins.get(id)?.ctx===ctx?origins.get(id).origin:null,snapshot:()=>state,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),bind(value){owner=value;return()=>{if(owner===value)owner=null}},toggle,retryPending,stop,cancel:discard};
})();
if(typeof window!=='undefined')Object.defineProperty(window,'__XenLoopRecDiagnostics',{configurable:true,get:()=>__XenLoopRec.diagnostics()});
function __XenLoopRecButton(){
 const s=P.useSyncExternalStore(__XenLoopRec.subscribe,__XenLoopRec.snapshot,__XenLoopRec.snapshot),active=s.phase==='recording',busy=['arming','finishing','saving'].includes(s.phase);
 const hidden=P.useSyncExternalStore(__XenLoopRecVisibility.subscribe,__XenLoopRecVisibility.snapshot,__XenLoopRecVisibility.snapshot);
 const discardable=['arming','armed','recording'].includes(s.phase);
 P.useLayoutEffect(()=>{
  const dock=document.querySelector('.xen-power-loop-dock');
  if(dock)dock.dataset.xenLoopRecHidden=String(hidden);
  window.dispatchEvent(new Event('xen-loop-rec-layout'));
 },[hidden]);
 const trigger=e=>{
  if(e.shiftKey&&s.phase==='idle'){void __XenLoopRec.retryPending();return;}
  void __XenLoopRec.toggle();
 };
 return u.jsxs(P.Fragment,{children:[
  hidden?u.jsx('button',{type:'button','data-xen-loop-rec-restore':true,className:'xen-loop-rec-restore',
    onClick:()=>__XenLoopRecVisibility.show(),title:'Show Loop-Rec controls','aria-label':'Show Loop-Rec controls',children:'REC ▸'},'xen-rec-restore'):
  u.jsx('button',{type:'button','data-xen-loop-rec':true,className:'xen-loop-rec',
    'data-xen-enough-active':active?'true':'false',disabled:busy,
    onClick:trigger,onContextMenu:e=>{e.preventDefault();__XenLoopRecVisibility.hide()},
    title:(s.message?s.message+' · ':'')+'Record Keyboard, Wave Starter, Particles and active Root Follow Loop. Right-click: hide Loop-Rec shape; Shift-click while idle: recover pending Session Takes.',
    'aria-label':active?'Enough! Finish Loop-Rec':s.phase==='failed'?'Rec failed · retry':'Loop-Rec','aria-busy':busy,
    children:active?u.jsx('span',{className:'xen-enough-legend',children:'Enough!'}):
      s.phase==='arming'?'Preparing…':s.phase==='armed'?'Armed · next bar':
      busy?s.phase==='finishing'?'Closing…':'Saving…':
      s.phase==='failed'?'Rec failed · retry':'Loop-Rec'},'xen-rec-main'),
  discardable&&u.jsx('button',{type:'button','data-xen-loop-rec-discard':true,className:'xen-loop-rec-discard',
    'aria-label':'Discard Loop-Rec take',title:'Discard this recording without saving',onPointerDown:e=>e.stopPropagation(),
    onClick:e=>{e.stopPropagation();__XenLoopRec.cancel()},children:'×'})
 ]});
}
