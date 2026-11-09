
/* GA2-P3 selective port: read-only, opt-in performance witness.
   OFF by default. Render-capacity/playout APIs may be absent; absence is not zero load.
   The optional oversampling cap affects only subsequently initialized realtime shapers.
   No DSP / WebAudio graph modifications. */
(function(){
 'use strict';
 if(globalThis.__XenRenderMonitor)return;
 let q=null;try{q=new URLSearchParams(location.search)}catch{}
 const requested=q?.get('xenOversample');
 if(['4x','2x','none'].includes(requested))globalThis.__XEN_OVERSAMPLE_CAP=requested;
 globalThis.__xenOS=function(node,requestedOversampling){
  try{
   const cap=globalThis.__XEN_OVERSAMPLE_CAP;
   if(!cap||cap==='4x')return requestedOversampling;
   const ctx=node?.context;
   if(typeof OfflineAudioContext!=='undefined'&&ctx instanceof OfflineAudioContext)return requestedOversampling;
   const order={none:0,'2x':1,'4x':2};
   if(!Object.hasOwn(order,cap)||!Object.hasOwn(order,requestedOversampling))return requestedOversampling;
   return order[requestedOversampling]>order[cap]?cap:requestedOversampling;
  }catch{return requestedOversampling}
 };
 const INTERVAL=.5,CAP_RING=480,MARK_RING=600,OUT_RING=200;
 const trace=q?.get('xenMonitor');
 const LOG=trace==='log';
 let enabled=false,lastCtx=null,attached=new WeakSet(),records=[];
 let cap=[],marks=[],outs=[],counts=Object.create(null);
 let totals={updates:0,maxPeak:null,maxUnder:null,underUpdates:0};
 let support={renderCapacity:false,playoutStats:false};
 const limit=(array,item,max)=>{array.push(item);if(array.length>max)array.shift()};
 const numeric=n=>typeof n==='number'&&Number.isFinite(n)?n:null;
 const median=values=>{if(!values.length)return null;const a=values.slice().sort((x,y)=>x-y);const m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2};
 function readPS(p){
  return {events:numeric(p.fallbackFramesEvents??p.underrunEvents),
   ms:numeric(p.fallbackFramesDuration??p.underrunDuration),
   total:numeric(p.totalFramesDuration??p.totalDuration),
   avgLatency:numeric(p.averageLatency),maxLatency:numeric(p.maximumLatency)};
 }
 function attachContext(ctx){
  if(!enabled||!ctx||attached.has(ctx))return false;
  attached.add(ctx);
  const record={ctx,dispose:[],disposed:false};records.push(record);
  const disposeRecord=()=>{if(record.disposed)return;record.disposed=true;
   for(const cleanup of record.dispose)cleanup();record.dispose.length=0;
   const i=records.indexOf(record);if(i>=0)records.splice(i,1);attached.delete(ctx)};
  if(typeof ctx.addEventListener==='function'){
   const stateChange=()=>{if(ctx.state==='closed')disposeRecord()};
   ctx.addEventListener('statechange',stateChange);
   record.dispose.push(()=>ctx.removeEventListener?.('statechange',stateChange));
  }
  try{
   const rc=ctx.renderCapacity;
   if(rc&&typeof rc.start==='function'&&typeof rc.addEventListener==='function'){
    const onUpdate=e=>{
     if(!enabled)return;
     const peak=numeric(e?.peakLoad),avg=numeric(e?.averageLoad),under=numeric(e?.underrunRatio);
     limit(cap,{t:performance.now(),avg,peak,under},CAP_RING);totals.updates++;
     if(peak!==null)totals.maxPeak=Math.max(totals.maxPeak??peak,peak);
     if(under!==null){totals.maxUnder=Math.max(totals.maxUnder??under,under);if(under>0)totals.underUpdates++}
     if(LOG&&under>0)console.warn('[xen][render] underrun ratio',under);
    };
    rc.addEventListener('update',onUpdate);
    record.dispose.push(()=>{try{rc.removeEventListener('update',onUpdate)}catch{}try{rc.stop?.()}catch{}});
    try{const started=rc.start({updateInterval:INTERVAL});
     if(started&&typeof started.catch==='function')started.catch(e=>{support.renderCapacity='error: '+String(e?.message??e)})}
    catch(e){support.renderCapacity='error: '+String(e?.message??e);throw e}
    support.renderCapacity=true;
   }
  }catch(e){if(support.renderCapacity===false)support.renderCapacity='error: '+String(e?.message??e)}
  try{
   const ps=ctx.playoutStats;
   if(ps){
    let last=readPS(ps);
    // Presence of an object is not evidence that the browser exposes any usable counters.
    if(last.events!==null&&last.ms!==null){
     support.playoutStats=true;
     const timer=setInterval(()=>{
      if(!enabled||ctx.state==='closed'){disposeRecord();return}
      try{const cur=readPS(ps);if(cur.events!==null&&cur.ms!==null){
       if(cur.events>=last.events&&cur.ms>=last.ms){
        const de=cur.events-last.events,dm=cur.ms-last.ms;
        if(de>0||dm>0)limit(outs,{t:performance.now(),a:numeric(ctx.currentTime),events:de,ms:dm},OUT_RING);
       }else limit(outs,{t:performance.now(),a:numeric(ctx.currentTime),reset:true},OUT_RING);
       last=cur;
      }}catch{}},1000);
     record.dispose.push(()=>clearInterval(timer));
    }
   }
  }catch(e){support.playoutStats='error: '+String(e?.message??e)}
  return true;
 }
 function attach(ctx){if(!ctx)return false;lastCtx=ctx;return attachContext(ctx)}
 function setEnabled(value){
  value=!!value;if(value===enabled)return enabled;
  if(!value){enabled=false;
   for(const r of records.splice(0)){r.disposed=true;for(const cleanup of r.dispose)cleanup();r.dispose.length=0}
   attached=new WeakSet();return false;
  }
  enabled=true;attachContext(lastCtx);return true;
 }
 function mark(type,detail,ctx){
  if(!enabled)return;
  limit(marks,{t:performance.now(),a:numeric(ctx?.currentTime),type,detail:detail??null},MARK_RING);
  counts[type]=(counts[type]||0)+1;
 }
 function report(){
  const output=Object.create(null);
  for(const m of marks){
   const s=output[m.type]||(output[m.type]={n:0,peaks:[],underUpdatesAfter:0,msSum:0,msWorst:0,msN:0});s.n++;
   let peak=null;
   for(const c of cap)if(c.t>=m.t&&c.t<=m.t+1250){
    if(c.peak!==null)peak=peak===null?c.peak:Math.max(peak,c.peak);
    if(c.under!==null&&c.under>0)s.underUpdatesAfter++;
   }
   if(peak!==null)s.peaks.push(peak);
   if(numeric(m.detail?.ms)!==null){s.msN++;s.msSum+=m.detail.ms;s.msWorst=Math.max(s.msWorst,m.detail.ms)}
  }
  const perMarkType={};for(const [k,s] of Object.entries(output))perMarkType[k]={n:s.n,medianPeakAfter:median(s.peaks),
   maxPeakAfter:s.peaks.length?Math.max(...s.peaks):null,underrunUpdatesAfter:s.underUpdatesAfter,
   meanMs:s.msN?s.msSum/s.msN:null,worstMs:s.msN?s.msWorst:null};
  return {enabled,support:{...support},totals:{...totals},baselineMedianPeak:median(cap.map(x=>x.peak).filter(x=>x!==null)),
   lastUpdate:cap.at(-1)??null,playoutUnderruns:outs.slice(),markCounts:{...counts},perMarkType};
 }
 function pressure(){
  const since=performance.now()-4000;let peak=null,under=null;
  for(const c of cap)if(c.t>=since){if(c.peak!==null)peak=Math.max(peak??c.peak,c.peak);if(c.under!==null)under=Math.max(under??c.under,c.under)}
  if(peak===null&&under===null)return null;
  return Math.max(0,Math.min(1,Math.max(peak===null?0:(peak-.55)/.45,under===null?0:under*8)));
 }
 function reset(){cap=[];marks=[];outs=[];counts=Object.create(null);totals={updates:0,maxPeak:null,maxUnder:null,underUpdates:0}}
 const api=Object.freeze({attach,enable:()=>setEnabled(true),disable:()=>setEnabled(false),setEnabled,
  status:()=>({enabled,attachedContexts:records.length,lastContextState:lastCtx?.state??null,support:{...support},samples:cap.length,marks:marks.length}),
  mark,report,pressure,reset,read:()=>({cap:cap.slice(),marks:marks.slice(),playout:outs.slice(),support:{...support}}),context:()=>lastCtx});
 globalThis.__XenRenderMonitor=api;
 if(trace==='1'||trace==='log')setEnabled(true);
})();
