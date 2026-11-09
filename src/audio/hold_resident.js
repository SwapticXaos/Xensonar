// Control plane only. Each held gesture owns a bounded reusable C11 plan group.
const __XenHoldXLivePairExperiment=(()=>{try{return new URLSearchParams(location.search).get('xenHoldXPair')!=='0'}catch{return true}})();
const __XenHoldResident=(()=>{
 let serial=0;const sessions=new Map(),failed=new Map(),totals={sessionsCreated:0,captures:0,rejections:0,stops:0,ready:0,goReady:0,fires:0,active:0,prefixUnderruns:0};
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
  if(typeof __XenHoldMod!=='undefined')__XenHoldMod.cancel(s);
  s.armed=false;
 }
 function reject(s){if(!s)return;totals.rejections++;
  // Prevent failed resident takeovers from retrying every 60 Hz RAF frame.
  // This throttles only preparations; the original Main hold loop still plays.
  if(failed.size>=32&&!failed.has(s.key))failed.delete(failed.keys().next().value);
  failed.set(s.key,{signature:s.signature,gestureStartAtMs:s.gestureStartAtMs,ctx:s.ctx,until:performance.now()+400});
  stop(s);s.unsupported=true;}
 function clear(){__XenNodalSurfaces.stopHoldClocks?.();failed.clear();for(const s of [...sessions.values()])stop(s)}
 function session(key,gesture,ctx,pattern,preset,hz,pitchState,gradientState){
  __XenNodalSurfaces.syncHoldClock?.(key.startsWith('klaviatur:')?'keyboard':'wave',gesture,pattern,preset,ctx,hz,pitchState);
  if(gesture.intervalMs<4||!ctx||ctx.state!=='running'||gesture.sustainExtendActive||gesture.sustainExtendLatched){stop(sessions.get(key));return null}
  if(typeof __XenAvalanche!=='undefined')__XenAvalanche.observe(key,gesture,ctx);
  // A prepared bank belongs to the enable/mode settings that encoded it.
  // Reuse the established replacement/STOP barrier when those settings change;
  // the existing main owner preserves the gesture phase until the new bank is ready.
  const signature=[gesture.intervalMs,pattern.join(''),preset,hz,pitchState?.signature??'',gradientState?.waveTimbreGradientEnabled,gradientState?.waveTimbreGradientX].join('|');
  const block=failed.get(key);
  if(block){
   if(block.signature===signature&&block.gestureStartAtMs===gesture.startedAtMs&&block.ctx===ctx&&performance.now()<block.until)return null;
   failed.delete(key);
  }
  let s=sessions.get(key);
  if(s&&(s.signature!==signature||s.gestureStartAtMs!==gesture.startedAtMs||s.ctx!==ctx)){stop(s);s=null}
  if(!s){
   if(sessions.size>=16)return null;
   s={key,hz,id:++serial,signature,gestureStartAtMs:gesture.startedAtMs,hosts:new Set(),epochs:new Map(),listeners:new Map(),hostCounts:new Map(),readyHosts:new Set(),armed:false,count:0,
    startFrame:Math.round((ctx.currentTime-(performance.now()-gesture.startedAtMs)/1000)*ctx.sampleRate),
    interval:gesture.intervalMs*ctx.sampleRate/1000,pattern,pitchRatios:pitchState?.captureRatios??null,index:gesture.pulseCount,ctx};
   sessions.set(key,s);totals.sessionsCreated++;
  }
  if(s.armed&&[...s.hosts].some(h=>!h.canSubmit||s.epochs.get(h)!==h.epoch)){stop(s);return null}
  return s;
 }
 function handleReply(s,host,msg){
  if(sessions.get(s.key)!==s||s.unsupported||!s.sealed||!msg||msg.id!==s.id||msg.epoch!==s.epochs.get(host))return;
  if(msg.type==='HOLD_REJECT'){reject(s);return}
  // Never leave main-thread playback disabled after a failed prefix producer.
  // STOP fences this program; the existing gesture loop owns future due steps.
  if(msg.type==='HOLD_PREFIX_UNDERRUN'){totals.prefixUnderruns++;reject(s);return}
  if(msg.type==='HOLD_ACTIVE'){totals.active++;return}
  if(msg.type==='HOLD_GO_READY'){
   if(!s.readyHosts.has(host)||s.armed)return;
   totals.goReady++;
   s.goHosts??=new Set();s.goHosts.add(host);
   if(s.goHosts.size!==s.hosts.size)return;
   if([...s.hosts].some(h=>!h.canSubmit||s.epochs.get(h)!==h.epoch)){reject(s);return}
   // A READY reply is not delivery of FIRE. Keep the main owner for every
   // step before one shared future boundary, so port transit cannot erase the
   // next due pulse. The boundary stays on this gesture's original audio phase.
   const handoffFrame=Math.ceil(s.ctx.currentTime*s.ctx.sampleRate)+Math.ceil(s.ctx.sampleRate*.020)+128;
   const handoffIndex=Math.max(s.index,s.mainIndex??s.index,Math.ceil((handoffFrame-s.startFrame)/s.interval));
   s.handoffIndex=handoffIndex;
   try{for(const h of s.hosts)h.node.port.postMessage({type:'HOLD_FIRE',id:s.id,epoch:h.epoch,index:handoffIndex});s.armed=true;totals.fires++;if(typeof __XenHoldMod!=='undefined')__XenHoldMod.activate(s);}
   catch{reject(s)}
   return;
  }
  if(msg.type!=='HOLD_READY'||s.readyHosts.has(host))return;
  totals.ready++;
  if(!host.canSubmit||msg.count!==s.hostCounts.get(host)){reject(s);return}
  s.readyHosts.add(host);
  if(s.readyHosts.size!==s.hosts.size)return;
  // The worklet has validated ALL templates on ALL affected hosts, but is not yet audible.
  // Transfer ownership before sending GO; GO itself is ordered after READY on each MessagePort.
  // Start beyond the last main-thread pulse already accounted for (no duplicate onset).
  if([...s.hosts].some(h=>!h.canSubmit||s.epochs.get(h)!==h.epoch)){reject(s);return}
  const nextIndex=Math.max(s.index,Number.isFinite(s.mainIndex)?s.mainIndex:s.index);
  try{
   for(const h of s.hosts)h.node.port.postMessage({type:'HOLD_GO',id:s.id,epoch:h.epoch,index:nextIndex});
   // All prepared worklets must also acknowledge the GO barrier before FIRE.
   // Until then the main-thread fallback remains owner.
  }catch{reject(s)}
 }
 function capture(s,host,record,rebuild){
  if(!s||sessions.get(s.key)!==s||s.unsupported||s.sealed||host.profile!==1||!host.node||!host.canSubmit)return;
  if(s.count>=8){reject(s);return;}
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
  s.hostCounts.set(host,(s.hostCounts.get(host)||0)+1);
  (s.pending??=[]).push({host,epoch:host.epoch,frame,slot,copy,rebuild});
  if(slot===0)queueMicrotask(()=>{
   if(sessions.get(s.key)!==s||s.unsupported)return;
   // Zeitnull = frueheste Komponente der gesamten Geste (nicht der zuerst erfasste Record).
   let t0=Infinity;for(const c of s.pending)if(c.frame<t0)t0=c.frame;
   s.captureFrame=t0;
   const initial=__XenHoldXLivePairExperiment?__XenAvalanche.value(s.key.split(':')[0]):null;
   s.initialX=Number.isFinite(initial)&&initial>=0&&initial<=1?initial:null;
   try{for(const c of s.pending){const plan={type:'HOLD_PLAN',id:s.id,epoch:c.epoch,start:s.startFrame,
    interval:s.interval,pattern:s.pattern,index:s.index,offset:c.frame-t0,slot:c.slot,record:c.copy,xInitial:s.initialX};
    if(s.pitchRatios)plan.pitchRatios=s.pitchRatios;
    c.host.node.port.postMessage(plan);}}
   catch{reject(s);return}
   s.program=s.pending;s.pending=null;
   s.sealed=true;
   s.initialWorker=__XenHoldMod.queueable(s.ctx);
   for(const h of s.hosts){
    try{h.node.port.postMessage({type:'HOLD_COMMIT',id:s.id,epoch:h.epoch,count:s.hostCounts.get(h),mode:s.initialWorker?'tap-worker':'tap'})}
    catch{reject(s);return}
   }
   // The PCM is rendered ONCE in the existing off-thread worker, never at every hold step.
   // Until the complete PCM installation has been acknowledged, Main retains gesture ownership.
   if(s.initialWorker)__XenHoldMod.initial(s);
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
