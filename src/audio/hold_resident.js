// Control plane only. Each held gesture owns a bounded reusable C11 plan group.
// THUNDER-ONE: Nodal's mechanism for the C11 synths (Entrophon, classic sounds). The first note of a held key is played as
// always; its records go to the C11 worklet together with the gesture's hold clock (the same description Nodal gets) and the
// worklet owns every following step from then on. No READY/GO/FIRE round trips, no main-thread prefix.
const __XenHoldXLivePairExperiment=(()=>{try{return new URLSearchParams(location.search).get('xenHoldXPair')!=='0'}catch{return true}})();
// The slot volume the voice starter really applied to the note a hold session captures (some paths drop it on the way);
// the clock then scales every step relative to that note, so a slot volume is applied exactly once.
function __xenHoldCaptureGain(o){const g=__xenHoldSlotGain([o?.holdSlotGain],0),s=o?.holdSession;if(s&&!s.sealed&&!s.count)s.capturedGain=g;return g}
const __XenHoldResident=(()=>{
 let serial=0;const sessions=new Map(),failed=new Map(),totals={sessionsCreated:0,captures:0,rejections:0,stops:0,active:0,prefixUnderruns:0};
 function disposeListeners(s){
  if(!s?.listeners)return;
  for(const [host,listener] of s.listeners)try{host.node?.port?.removeEventListener?.('message',listener)}catch{}
  s.listeners.clear();
 }
 function stop(s){
  if(!s)return;
  totals.stops++;
  disposeListeners(s);
  for(const host of s.hosts)try{host.node?.port?.postMessage({type:'HOLD_STOP',id:s.id})}catch{}
  if(sessions.get(s.key)===s)sessions.delete(s.key);
  s.armed=false;
 }
 function reject(s){if(!s)return;totals.rejections++;
  // Prevent failed resident takeovers from retrying every 60 Hz RAF frame.
  // This throttles only preparations; the original Main hold loop still plays.
  if(failed.size>=32&&!failed.has(s.key))failed.delete(failed.keys().next().value);
  failed.set(s.key,{signature:s.signature,gestureStartAtMs:s.gestureStartAtMs,ctx:s.ctx,until:performance.now()+400});
  stop(s);s.unsupported=true;}
 function clear(){__XenNodalSurfaces.stopHoldClocks?.();failed.clear();for(const s of [...sessions.values()])stop(s)}
 function session(key,gesture,ctx,pattern,preset,hz,pitchState,gradientState,slotVolumes,slotMicrotiming){
  const vols=__xenHoldVolumeVector(slotVolumes,pattern.length),micros=__xenHoldMicroVector(slotMicrotiming,pattern.length);
  __XenNodalSurfaces.syncHoldClock?.(key.startsWith('klaviatur:')?'keyboard':'wave',gesture,pattern,preset,ctx,hz,pitchState,vols,micros);
  // Slot volumes and microtiming are part of the clock (as in Nodal); only Nodal's own dynamics need no C11 plan.
  if(gesture.hpm02NativeNodalDynamics){stop(sessions.get(key));return null;}
  if(gesture.intervalMs<4||!ctx||ctx.state!=='running'||gesture.sustainExtendActive||gesture.sustainExtendLatched){stop(sessions.get(key));return null}
  if(typeof __XenAvalanche!=='undefined')__XenAvalanche.observe(key,gesture,ctx);
  // A prepared bank belongs to the enable/mode settings that encoded it.
  // Reuse the established replacement/STOP barrier when those settings change;
  // the existing main owner preserves the gesture phase until the new bank is ready.
  const signature=[gesture.intervalMs,pattern.join(''),preset,hz,pitchState?.signature??'',gradientState?.waveTimbreGradientEnabled,gradientState?.waveTimbreGradientX,vols.join(','),micros.join(',')].join('|');
  const block=failed.get(key);
  if(block){
   if(block.signature===signature&&block.gestureStartAtMs===gesture.startedAtMs&&block.ctx===ctx&&performance.now()<block.until)return null;
   failed.delete(key);
  }
  let s=sessions.get(key);
  if(s&&(s.signature!==signature||s.gestureStartAtMs!==gesture.startedAtMs||s.ctx!==ctx)){stop(s);s=null}
  if(!s){
   if(sessions.size>=16)return null;
   s={key,hz,id:++serial,signature,gestureStartAtMs:gesture.startedAtMs,hosts:new Set(),epochs:new Map(),listeners:new Map(),hostCounts:new Map(),armed:false,count:0,
    startFrame:Math.round((ctx.currentTime-(performance.now()-gesture.startedAtMs)/1000)*ctx.sampleRate),
    intervalMs:gesture.intervalMs,pattern,vols,micros,pitchState,index:gesture.pulseCount,ctx};
   sessions.set(key,s);totals.sessionsCreated++;
  }
  if(s.armed&&[...s.hosts].some(h=>!h.canSubmit||s.epochs.get(h)!==h.epoch)){stop(s);return null}
  // LIVE-TEMPO-01: a glide that starts (or lands) while the key is held: the running hold plans get the new map, no restart
  if(s.sealed&&s.clock){const w=__XenLiveTempo.clockWarp(ctx.sampleRate);if((w?.v??0)!==(s.clock.warp?.v??0)){s.clock={...s.clock,warp:w};for(const h of s.hosts){try{h.node?.port?.postMessage({type:'HOLD_WARP',id:s.id,warp:w})}catch{}}}}
  return s;
 }
 function handleReply(s,host,msg){
  if(sessions.get(s.key)!==s||s.unsupported||!s.sealed||!msg||msg.id!==s.id||msg.epoch!==s.epochs.get(host))return;
  // A refused plan or a PCM producer that fell behind: the main loop plays this key again from its next pulse.
  if(msg.type==='HOLD_REJECT'||msg.type==='HOLD_PREFIX_UNDERRUN'){if(msg.type==='HOLD_PREFIX_UNDERRUN')totals.prefixUnderruns++;reject(s);return}
  if(msg.type==='HOLD_ACTIVE'){totals.active++;if(typeof __XenHoldMod!=='undefined')__XenHoldMod.activate(s);}
 }
 function capture(s,host,record,rebuild){
  if(!s||sessions.get(s.key)!==s||s.unsupported||s.sealed||host.profile!==1||!host.node||!host.canSubmit)return;
  if(s.count>=24){reject(s);return;}/* ARP-HOLD-01: up to 24 records per gesture (tones + body + up to 16 overtone-arpeggio steps) */
  const port=host.node.port;
  if(typeof port.addEventListener!=='function'){reject(s);return;}
  if(!s.listeners.has(host)){
   const listener=event=>handleReply(s,host,event.data);
   port.addEventListener('message',listener);
   s.listeners.set(host,listener);
  }
  const frame=record[3]+record[4]*4294967296;
  const copy=new Uint32Array(record);copy[7]&=~65536;copy[0]&=65535;
  s.hosts.add(host);s.epochs.set(host,host.epoch);
  totals.captures++;
  const slot=s.count++;
  // From the next step on the worklet clock owns this key (the main loop stops at handoffIndex at once).
  if(slot===0){s.index=Math.max(s.index,s.mainIndex??s.index);s.handoffIndex=s.index;s.armed=true;}
  s.hostCounts.set(host,(s.hostCounts.get(host)||0)+1);
  (s.pending??=[]).push({host,epoch:host.epoch,frame,slot,copy,rebuild});
  if(slot===0)queueMicrotask(()=>{
   if(sessions.get(s.key)!==s||s.unsupported)return;
   // Zeitnull = frueheste Komponente der gesamten Geste (nicht der zuerst erfasste Record).
   let t0=Infinity;for(const c of s.pending)if(c.frame<t0)t0=c.frame;
   s.captureFrame=t0;
   const initial=__XenHoldXLivePairExperiment?__XenAvalanche.value(s.key.split(':')[0]):null;
   s.initialX=Number.isFinite(initial)&&initial>=0&&initial<=1?initial:null;
   // The clock of the gesture, exactly as Nodal gets it. Pitch steps and slot volumes are relative to the note that was captured.
   const ps=s.pitchState,ref=ps?ps.ratios[(s.index-1)%ps.ratios.length]||1:1,vol=s.capturedGain>0?s.capturedGain:1;
   s.clock={warp:__XenLiveTempo.clockWarp(s.ctx.sampleRate),startSec:s.startFrame/s.ctx.sampleRate+.008,intervalMs:s.intervalMs,pattern:s.pattern,slotVolumes:s.vols.map(v=>v/vol),slotMicrotiming:s.micros,...(ps?{pitchRatios:ps.ratios.map(r=>r/ref)}:{})};
   try{for(const c of s.pending)c.host.node.port.postMessage({type:'HOLD_PLAN',id:s.id,epoch:c.epoch,clock:s.clock,index:s.index,offset:c.frame-t0,slot:c.slot,record:c.copy,xInitial:s.initialX});
    s.program=s.pending;s.pending=null;s.sealed=true;
    for(const h of s.hosts)h.node.port.postMessage({type:'HOLD_COMMIT',id:s.id,epoch:h.epoch,count:s.hostCounts.get(h),mode:'tap'});}
   catch{reject(s)}
  });
 }
 function modulate(name,x,xNormalized){
  for(const s of sessions.values())if(s.key.startsWith(name+':')&&s.sealed&&s.gradientEnabled&&s.program?.some(p=>p.rebuild)){
   // Lightweight audio-rate target transport. No new preparation or slot clock.
   if(__XenHoldXLivePairExperiment&&Number.isFinite(xNormalized))for(const host of s.hosts)if(s.epochs.get(host)===host.epoch&&host.node?.port)
    host.node.port.postMessage({type:'HOLD_X_POSITION',id:s.id,epoch:host.epoch,position:Math.max(0,Math.min(1,xNormalized)),livePair:true});
   const records=s.program.map(p=>{if(p.rebuild)return p.rebuild(x);const rec=new Uint32Array(p.copy);if((rec[0]&255)===3&&rec[5]===2){const f=new Float32Array(rec.buffer),old=s.initialGradientAmount>.1?.9:1,next=oZ(x,s.gradientEnabled,s.gradientMode).amount>.1?.9:1;f[12]*=next/old;}return rec;});
   __XenHoldMod.request(s,records,s.program.map(p=>p.frame-s.captureFrame),__XenHoldXLivePairExperiment?xNormalized:null);
  }
 }
 return{modulate,isCurrent:s=>sessions.get(s.key)===s,session,capture,reject,peek:key=>sessions.get(key)||null,stopKey:key=>{failed.delete(key);stop(sessions.get(key))},clear,
  diagnostics:()=>({sessions:sessions.size,armed:[...sessions.values()].filter(s=>s.armed).length,pending:[...sessions.values()].filter(s=>s.sealed&&!s.armed).length,totals:{...totals}})};
})();
