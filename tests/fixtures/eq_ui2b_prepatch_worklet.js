/* EQ Live 2: P1.5 plans, normalized RBJ coefficients prepared on control thread.
 * Two resident banks, at most one latest pending snapshot. No fit, trig,
 * AudioParam automation, node allocation or sample-array allocation in process.
 * IIR coefficients are never interpolated: warm the next stable bank, then
 * linearly crossfade complete outputs. No note/transport scheduling here. */
function __xenEqLiveModule(){
 class XenEqLiveProcessor extends AudioWorkletProcessor {
  constructor(options){
   super();
   const bank=()=>({c:new Float64Array(120),z:new Float64Array(96),count:0,gain:1});
   this.banks=[bank(),bank()];this.active=0;this.next=null;this.pending=null;
   this.warmFrames=Math.round(sampleRate*.025);this.fadeFrames=Math.round(sampleRate*.025);
   this.transitionWarm=this.warmFrames;this.transitionFade=this.fadeFrames;
   this.phase=0;this.elapsed=0;this.revision=-1;this.expected=-1;this.dead=false;this.quietFrames=0;this.sleeping=false;
   this.stats={kind:'stats',applied:0,coalesced:0,frameGaps:0,nonfinite:0,peak:0,filters:0,dualFrames:0,frames:0,unchanged:0};
   this.reportAt=sampleRate;
   this.port.onmessage=e=>{
    const m=e.data;
    if(m?.kind==='dispose'){this.dead=true;this.pending=null;return}
    if(m?.kind!=='plan'||!Number.isSafeInteger(m.revision)||m.revision<=this.revision)return;
    if(!(m.coefficients instanceof Float64Array)||m.coefficients.length!==120||
       !Number.isInteger(m.count)||m.count<0||m.count>24||!Number.isFinite(m.gain)||m.gain<0)return;
    for(let i=0;i<m.count*5;i++)if(!Number.isFinite(m.coefficients[i]))return;
    // Jury stability test for each normalized denominator z² + a1*z + a2.
    for(let i=0;i<m.count;i++){const a1=m.coefficients[i*5+3],a2=m.coefficients[i*5+4];
     if(Math.abs(a2)>=1||1+a1+a2<=0||1-a1+a2<=0)return;
    }
    this.revision=m.revision;
    // A slider revision is not necessarily a different acoustic filter state.
    // Compare the *effective normalized coefficients* against the active bank,
    // not the original drawing or morphology metadata. Zero allocations and
    // no coefficient interpolation on the render path.
    if(!this.phase&&this.samePlan(this.banks[this.active],m)){
     if(this.pending)this.stats.coalesced++;
     this.pending=null;this.stats.unchanged++;return;
    }
    if(this.pending)this.stats.coalesced++;
    this.pending=m;
   };
   const initial=options?.processorOptions?.initial;
   if(initial){this.load(this.banks[0],initial);this.revision=initial.revision;this.stats.applied++}
  }
  samePlan(bank,m){
   if(bank.count!==m.count||bank.gain!==m.gain)return false;
   for(let i=0;i<m.count*5;i++)if(bank.c[i]!==m.coefficients[i])return false;
   return true;
  }
  load(bank,m){bank.c.set(m.coefficients);bank.z.fill(0);bank.count=m.count;bank.gain=m.gain;}
  run(bank,value,channel){
   let v=value*bank.gain;const c=bank.c,z=bank.z;let s=channel*48;
   for(let j=0;j<bank.count;j++,s+=2){const k=j*5,y=c[k]*v+z[s];
    z[s]=c[k+1]*v-c[k+3]*y+z[s+1];z[s+1]=c[k+2]*v-c[k+4]*y;v=y;
   }
   if(!Number.isFinite(v)){bank.z.fill(0);this.stats.nonfinite++;return 0}
   return v;
  }
  process(inputs,outputs){
   if(this.dead)return false;
   const output=outputs[0];if(!output?.length)return true;
   const n=output[0].length,input=inputs[0];
   if(this.expected>=0&&currentFrame!==this.expected)this.stats.frameGaps++;
   this.expected=currentFrame+n;
   let inputActive=false;
   for(let ch=0;ch<(input?.length||0)&&!inputActive;ch++)for(let i=0;i<n;i++)if(input[ch][i]!==0){inputActive=true;break}
   // Keep processing real IIR tails; once silent, stop all filter arithmetic.
   // Return true so the resident node can wake at the next attack, without setup.
   if(this.sleeping&&!inputActive){
    if(this.pending){this.load(this.banks[this.active],this.pending);this.pending=null;this.stats.applied++}
    for(let ch=0;ch<output.length;ch++)output[ch].fill(0);
    this.stats.frames+=n;this.stats.filters=0;this.stats.sleeping=true;
    if(this.stats.frames>=this.reportAt){this.reportAt=this.stats.frames+sampleRate;this.port.postMessage(this.stats)}
    return true;
   }
   this.sleeping=false;this.stats.sleeping=false;let blockPeak=0;
   if(!this.phase&&this.pending){
    const m=this.pending;this.pending=null;
    // Re-check AFTER an in-flight transition finishes. A duplicate received
    // during a fade could not be compared to its eventual active bank yet.
    if(this.samePlan(this.banks[this.active],m))this.stats.unchanged++;
    else{
     this.next=1-this.active;
     this.load(this.banks[this.next],m);this.phase=1;this.elapsed=0;this.stats.applied++;
     // A rhythmically played morph can crossfade faster. Paint retains the
     // conservative IIR-state warming window; no coefficients are interpolated.
     this.transitionWarm=m.intent==='morph'?Math.round(sampleRate*.012):['paint','settle'].includes(m.intent)?Math.round(sampleRate*.040):this.warmFrames;
     this.transitionFade=m.intent==='morph'?Math.round(sampleRate*.020):['paint','settle'].includes(m.intent)?Math.round(sampleRate*.060):this.fadeFrames;
    }
   }
   const a=this.banks[this.active],b=this.phase?this.banks[this.next]:null;
   for(let i=0;i<n;i++){
    let mix=0;
    if(this.phase===2)mix=Math.min(1,this.elapsed/this.transitionFade);
    for(let ch=0;ch<output.length;ch++){
     const source=input?.[ch]||input?.[0],raw=source?source[i]:0;
     const x=Number.isFinite(raw)?raw:0;
     const old=this.run(a,x,ch),fresh=b?this.run(b,x,ch):old;
     const value=old+(fresh-old)*mix;output[ch][i]=value;
     if(Math.abs(value)>this.stats.peak)this.stats.peak=Math.abs(value);
     if(Math.abs(value)>blockPeak)blockPeak=Math.abs(value);
    }
    if(this.phase){this.stats.dualFrames++;this.elapsed++;
     if(this.phase===1&&this.elapsed>=this.transitionWarm){this.phase=2;this.elapsed=0}
    }
   }
   // Finish only at a quantum boundary; the next pending bank starts next call.
   if(this.phase===2&&this.elapsed>=this.transitionFade){this.active=this.next;this.next=null;this.phase=0;this.elapsed=0}
   this.quietFrames=!inputActive&&blockPeak<1e-12&&!this.phase?this.quietFrames+n:0;
   if(this.quietFrames>=sampleRate){this.banks[0].z.fill(0);this.banks[1].z.fill(0);this.sleeping=true}
   this.stats.filters=a.count+(b?b.count:0);this.stats.frames+=n;
   if(this.stats.frames>=this.reportAt){this.reportAt=this.stats.frames+sampleRate;this.port.postMessage(this.stats)}
   return true;
  }
 }
 registerProcessor('xensonar-eq-live-v2',XenEqLiveProcessor);
}
const __XenEqLive=(()=>{
 const contexts=new WeakMap();
 function coefficients(plan,count,rate){
  const values=new Float64Array(120);let used=0;
  for(const f of plan.filters.slice(0,count)){
   if(Math.abs(f.gain)<1e-8)continue;
   const A=Math.pow(10,f.gain/40),w=2*Math.PI*Math.max(0,Math.min(rate*.499999,f.frequency))/rate;
   const cos=Math.cos(w),alpha=Math.sin(w)/(2*f.q),a0=1+alpha/A,k=used++*5;
   values[k]=(1+alpha*A)/a0;values[k+1]=-2*cos/a0;values[k+2]=(1-alpha*A)/a0;
   values[k+3]=-2*cos/a0;values[k+4]=(1-alpha/A)/a0;
  }
  return {kind:'plan',count:used,gain:Math.pow(10,plan.base/20),coefficients:values};
 }
 function prepare(ctx){
  if(!ctx.audioWorklet?.addModule||typeof AudioWorkletNode!=='function')return Promise.reject(Error('EQ worklet unavailable'));
  if(contexts.has(ctx))return contexts.get(ctx);
  const job=(async()=>{
   const code='('+__xenEqLiveModule.toString()+')();';let error;
   for(const mode of ['blob','data']){let url;
    try{url=mode==='blob'?URL.createObjectURL(new Blob([code],{type:'application/javascript'})):'data:application/javascript;charset=utf-8,'+encodeURIComponent(code);await ctx.audioWorklet.addModule(url);return}
    catch(e){error=e}finally{if(mode==='blob'&&url)URL.revokeObjectURL(url)}
   }throw error;
  })();
  contexts.set(ctx,job);
  // A rejected registration is not a permanent browser capability verdict.
  // Allow another device on the same still-live context to try again later.
  job.catch(()=>{if(contexts.get(ctx)===job)contexts.delete(ctx)});
  return job;
 }
 function create(ctx,plan,count){
  let revision=0,last=plan,lastCount=count,disposed=false,queued=null,timer=null,dueAt=0,lastSent=0;
  const initial={...coefficients(plan,count,ctx.sampleRate),revision};
  const node=new AudioWorkletNode(ctx,'xensonar-eq-live-v2',{numberOfInputs:1,numberOfOutputs:1,
   outputChannelCount:[2],channelCount:2,channelCountMode:'explicit',processorOptions:{initial}});
  const status={backend:'worklet-coefficients',sent:0,coalesced:0,processor:null,error:null};
  node.port.onmessage=e=>{if(e.data?.kind==='stats')status.processor=e.data};
  function send(){timer=null;dueAt=0;if(disposed||!queued)return;const pending=queued;queued=null;
   // Coalesce gesture plans *before* RBJ trigonometry and Float64Array creation.
   // Only the latest plan at the actual message boundary needs coefficients.
   const m={...coefficients(pending.plan,pending.count,ctx.sampleRate),revision:pending.revision,intent:pending.intent};
   lastSent=Date.now();node.port.postMessage(m,[m.coefficients.buffer]);status.sent++;
  }
  return {node,status,apply(p,n,intent='standard'){if(disposed||(p===last&&n===lastCount))return;
   last=p;lastCount=n;if(queued)status.coalesced++;
   queued={plan:p,count:n,revision:++revision,intent};
   // Main thread control traffic <= 30 Hz; process retains one newest snapshot.
   // Morph gets a 20-ms control cadence; paint is already throttled before
   // planning in eq-core. Never replay superseded drawings or slider positions.
   const interval=intent==='morph'?20:34;
   const now=Date.now(),delay=Math.max(0,interval-(now-lastSent)),target=now+delay;
   // An upcoming send is never postponed by subsequent slider events.
   // Upgrade a scheduled paint send only when morph can send *earlier*.
   if(timer&&intent==='morph'&&target<dueAt){clearTimeout(timer);timer=null}
   if(!timer){dueAt=target;timer=setTimeout(send,delay)}
  },dispose(){if(disposed)return;disposed=true;if(timer)clearTimeout(timer);queued=null;
   try{node.port.postMessage({kind:'dispose'});node.disconnect();node.port.close()}catch{}
  }};
 }
 return {prepare,create,coefficients};
})();
