// Latest-value preparation uses the existing original-kernel Worker factory.
// No clock or note-on admission lives here. Existing taps own audio until swap.
const __XenHoldMod=(()=>{
 const workers=new WeakMap(),pending=new Map(),initialQueue=new Map();let serial=0;
 const initialQueueLimit=16,initialWaitMs=6000;
 const now=()=>performance.now();
 async function prepare(ctx,init){
  if(typeof Worker==='undefined')return;
  let state;
  try{
   const abort=new AbortController();state={worker:null,busy:false,ready:false,abort,timer:null,nextAt:0};workers.set(ctx,state);
   state.worker=__entrophonCreateRenderWorker(abort.signal);
   const close=()=>{if(ctx.state==='closed'){dispose(ctx);ctx.removeEventListener?.('statechange',close)}};ctx.addEventListener?.('statechange',close);
   await state.worker.send({type:'init',wasm:GMe(),holdInit:init});
   if(abort.signal.aborted||ctx.state==='closed')return;state.ready=true;drain(ctx,state);
  }catch(error){if(state){state.error=String(error);state.abort.abort();for(const [key,p] of [...initialQueue])if(p.s.ctx===ctx){initialQueue.delete(key);clearTimeout(p.timer);if(__XenHoldResident.isCurrent(p.s))__XenHoldResident.reject(p.s);}}}
 }
 // A busy/starting PCM worker is queued, never replaced by native DSP rerenders.
 // Main remains the audible owner until ALL Worklet PCM installs have ACKed.
 function queueable(ctx){const st=workers.get(ctx);return !!(st?.worker&&!st.abort.signal.aborted&&ctx.state!=='closed');}
 function ready(ctx){const st=workers.get(ctx);return queueable(ctx)&&st.ready&&!st.busy;}
 function cancel(s){const p=initialQueue.get(s.id);if(p?.s===s){initialQueue.delete(s.id);clearTimeout(p.timer);}}
 function initial(s){
  const st=workers.get(s.ctx);
  if(!s.initialWorker||!queueable(s.ctx)||initialQueue.size>=initialQueueLimit){__XenHoldResident.reject(s);return;}
  cancel(s);
  const timer=setTimeout(()=>{
   const p=initialQueue.get(s.id);if(p?.s!==s)return;
   initialQueue.delete(s.id);
   if(__XenHoldResident.isCurrent(s))__XenHoldResident.reject(s);
  },initialWaitMs);
  initialQueue.set(s.id,{s,timer});
  if(st.ready)drain(s.ctx,st);
 }
 async function renderInitial(s,state){
  const grouped=new Map();
  for(const p of s.program){const arr=grouped.get(p.host)||[];arr.push(p);grouped.set(p.host,arr);}
  try{
   // Grouped programmes share one session clock, with an individual PCM bank per host.
   // The worker is serial: no second send while a render or timbre render is running.
   for(const [host,plans] of grouped){
    if(!__XenHoldResident.isCurrent(s)||s.ctx.state!=='running'||host.epoch!==s.epochs.get(host)||!host.canSubmit)return;
    const records=plans.map(p=>Uint32Array.from(p.copy));
    const offsets=plans.map(p=>p.frame-s.captureFrame);
    const {tap}=await state.worker.send({type:'hold-program',sampleRate:s.ctx.sampleRate,records,offsets});
    if(!__XenHoldResident.isCurrent(s)||s.ctx.state!=='running'||host.epoch!==s.epochs.get(host)||!host.canSubmit)return;
    if(!tap?.complete||!Array.isArray(tap.ch))throw Error('initial-pcm-incomplete');
    tap.id=s.id;tap.epoch=host.epoch;
    host.node.port.postMessage({type:'HOLD_TAP_INITIAL',id:s.id,epoch:host.epoch,count:s.hostCounts.get(host),tap},tap.ch.map(c=>c.buf.buffer));
   }
  }catch(error){
   state.error=String(error);
   if(__XenHoldResident.isCurrent(s))__XenHoldResident.reject(s);
  }finally{state.busy=false;drain(s.ctx,state);}
 }
 function request(session,records,offsets,xNorm){
  if(!__XenHoldResident.isCurrent(session)||records.length>8||!records.length)return;
  if(records.some((r,i)=>offsets[i]+r[26]>session.ctx.sampleRate*12))return;
  const state=workers.get(session.ctx);if(!state||state.abort.signal.aborted)return;for(const [key,p] of pending)if(!__XenHoldResident.isCurrent(p.session))pending.delete(key);
  const hosts=[...session.hosts];if(hosts.length!==1)return;
  pending.set(session.key,{session,records,offsets,revision:++serial,host:hosts[0],xNorm});
  session.desiredModRevision=serial;if(state?.ready)drain(session.ctx,state);
 }
 async function drain(ctx,state){
  if(state.busy||!state.ready||state.abort.signal.aborted)return;
  // Initial note banks have precedence over background timbre requests.
  for(const [id,p] of initialQueue){
   if(p.s.ctx!==ctx)continue;
   initialQueue.delete(id);clearTimeout(p.timer);
   if(!__XenHoldResident.isCurrent(p.s))continue;
   state.busy=true;void renderInitial(p.s,state);return;
  }
  const entry=[...pending.entries()].find(([,v])=>v.session.ctx===ctx);if(!entry)return;
  // Gradient preparation yields to playback. One newest target per session,
  // one timer per context, no render-completion catch-up chain.
  const delay=state.nextAt-now();if(delay>0){if(state.timer===null)state.timer=setTimeout(()=>{state.timer=null;drain(ctx,state)},delay);return;}
  pending.delete(entry[0]);const p=entry[1],s=p.session;state.busy=true;const started=now();
  try{
   if(!__XenHoldResident.isCurrent(s))return;
   const result=await state.worker.send({type:'hold-program',sampleRate:ctx.sampleRate,records:p.records,offsets:p.offsets});
   if(state.abort.signal.aborted||ctx.state==='closed'||!__XenHoldResident.isCurrent(s)||s.epochs.get(p.host)!==p.host.epoch)return;
   // Keep prepared PCM audible during sustained hover. Strict latest-only
   // discarded every completed result while X kept moving; that starved the
   // initial live pair. At most one stale-but-forward tap per 96 ms is allowed.
   // Newer or already-committed revisions remain fenced by session epoch.
   const stale=s.desiredModRevision>p.revision;
   if(stale&&!__XenAvalanche.dragging()&&s.lastAcceptedModAt!==undefined&&now()-s.lastAcceptedModAt<96)return;
   s.lastAcceptedModAt=now();
   const tap=result.tap;tap.id=s.id;tap.epoch=p.host.epoch;
   s.pendingTimbre={host:p.host,revision:p.revision,tap,xNorm:p.xNorm};activate(s);
  }catch(error){state.error=String(error);}finally{
   state.busy=false;
   // HOLDX-RESPONSE04: Only inexpensive single-host jobs get a shorter floor.
   // Keeping the 2x render-time cooldown retains the same <=1/3 Worker duty
   // bound; slow/complex jobs preserve the original protection unchanged.
   const renderMs=now()-started;
   const light=initialQueue.size===0&&s.program?.length<=4&&renderMs<=32;
   state.nextAt=now()+Math.max(light?32:64,Math.min(1000,renderMs*2));
   drain(ctx,state);
  }
 }
 for(const name of ['klaviatur','wellenstart'])__XenAvalanche.onTimbre(name,(u,width)=>{
  __XenHoldResident.modulate(name,u*width,u);
  __XenNodalSurfaces.setHoldX?.(name,u);
 });
 function activate(s){const p=s.pendingTimbre;if(!p||!s.armed||!__XenHoldResident.isCurrent(s)||p.tap.epoch!==p.host.epoch)return;delete s.pendingTimbre;p.host.node.port.postMessage({type:'HOLD_TIMBRE',id:s.id,epoch:p.host.epoch,revision:p.revision,tap:p.tap,xNorm:p.xNorm},p.tap.ch.map(c=>c.buf.buffer));}
 function dispose(ctx){const s=workers.get(ctx);if(s?.timer!==null)clearTimeout(s?.timer);s?.abort.abort();workers.delete(ctx);for(const [key,p] of pending)if(p.session.ctx===ctx)pending.delete(key);for(const [key,p] of [...initialQueue])if(p.s.ctx===ctx){initialQueue.delete(key);clearTimeout(p.timer);}}
 return {prepare,ready,queueable,initial,cancel,request,activate,dispose};
})();
