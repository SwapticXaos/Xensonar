/* RFL-GUARD: repeat guard for the Root-Follow path (Zone: HOT).
   Chromium sometimes delivers a node's previous 128-frame render quantum a second time when the main thread changes the
   audio graph (nodes created/connected/disconnected, e.g. per drum hit or bass note). On the sustained Root-Follow loop
   this is heard as crackle: two hard steps 2.9 ms apart (measurement: docs/RFL_WIEDERHOLTE_QUANTEN_2026-11-13.md).
   The guard sits at the end of the Root-Follow route (after pan and pitch, before the EQ / Rhythm bus). A repeated block is
   bit-identical to the previous input block, which real (non-constant) audio never is. The guard then does not pass the copy
   on: it continues what it last played with the best-matching period of the last 512 frames (value and slope continuous at
   the seam, with a 64-frame correction of the remaining mismatch), holds that for up to 4 blocks, fades it out over 4 more if the source stays frozen, and blends back into the live
   signal over 64 frames. A quantum without input is bridged the same way; only about 1 s without input ends the processor.
   No extra latency, no allocation per block, no messages unless asked for a report. */
const __xenRflRepeatGuardCode=String.raw`
const XEN_RFL_GUARD_BLEND=64,XEN_RFL_GUARD_HIST=512,XEN_RFL_GUARD_MATCH=32,XEN_RFL_GUARD_MINLAG=16,XEN_RFL_GUARD_HOLD=4,XEN_RFL_GUARD_FADE=4;
// room behind the frozen history for the generated continuation (hold + fade + resume blend, rounded up)
const XEN_RFL_GUARD_GEN=(XEN_RFL_GUARD_HOLD+XEN_RFL_GUARD_FADE+2)*128;
// quanta without any input before the guard ends itself (~1 s at 44.1/48 kHz)
const XEN_RFL_GUARD_END=375;
const XEN_RFL_GUARD_W=new Float32Array(XEN_RFL_GUARD_BLEND),XEN_RFL_GUARD_D=new Float32Array(XEN_RFL_GUARD_BLEND);
for(let k=0;k<XEN_RFL_GUARD_BLEND;k++){XEN_RFL_GUARD_W[k]=.5-.5*Math.cos(Math.PI*(k+.5)/XEN_RFL_GUARD_BLEND);XEN_RFL_GUARD_D[k]=1-XEN_RFL_GUARD_W[k]}
class XenRflRepeatGuard extends AudioWorkletProcessor{
  constructor(){
    super();
    const H=XEN_RFL_GUARD_HIST;
    this.prev=[new Float32Array(128),new Float32Array(128)];
    this.hist=[new Float32Array(H),new Float32Array(H)];   // what this node played, newest sample at H-1
    this.snap=[new Float32Array(H+XEN_RFL_GUARD_GEN),new Float32Array(H+XEN_RFL_GUARD_GEN)];   // frozen history while concealing, followed by the generated continuation
    this.e0=new Float32Array(2);this.e1=new Float32Array(2);
    this.have=false;this.seen=false;this.absent=0;this.gaps=0;this.conceal=0;this.lag=128;this.t=0;this.repeats=0;this.longest=0;
    this.port.onmessage=e=>{if(e.data&&e.data.type==='report')this.port.postMessage({type:'rfl-guard-report',repeats:this.repeats,gaps:this.gaps,longest:this.longest})};
  }
  // period with the best match at the end of the history: continuing it keeps value and slope continuous at the seam
  findLag(chs){
    const H=XEN_RFL_GUARD_HIST,M=XEN_RFL_GUARD_MATCH;let best=128,bestE=Infinity;
    for(let L=XEN_RFL_GUARD_MINLAG;L<=H-M-2;L++){
      let e=0;
      for(let c=0;c<chs;c++){const h=this.snap[c];for(let j=1;j<=M;j++){const d=h[H-j]-h[H-j-L];e+=d*d}if(e>=bestE)break}
      if(e<bestE){bestE=e;best=L}
    }
    return best;
  }
  // periodic continuation plus a seam correction: value and slope match the last played samples, the correction decays over 64 frames.
  // Later periods repeat the already generated (corrected) signal, so every period boundary is as continuous as the first seam.
  gen(c){const H=XEN_RFL_GUARD_HIST,t=this.t,h=this.snap[c];if(t>=XEN_RFL_GUARD_GEN)return 0;
    let v=h[H-this.lag+t];if(t<XEN_RFL_GUARD_BLEND)v+=(this.e0[c]+this.e1[c]*(t+1))*XEN_RFL_GUARD_D[t];h[H+t]=v;return v}
  seam(chs){const H=XEN_RFL_GUARD_HIST,L=this.lag;for(let c=0;c<chs;c++){const h=this.snap[c],g1=h[H-L-1],g2=h[H-L-2];this.e0[c]=h[H-1]-g1;this.e1[c]=(h[H-1]-h[H-2])-(g1-g2)}}
  // level of the invented audio: hold for XEN_RFL_GUARD_HOLD blocks, then fade out over XEN_RFL_GUARD_FADE blocks
  level(block,k){const x=block+k/128-XEN_RFL_GUARD_HOLD;return x<=0?1:Math.max(0,1-x/XEN_RFL_GUARD_FADE)}
  process(inputs,outputs){
    const out=outputs[0],inp=inputs[0];
    if(!out||!out.length)return true;
    const n=out[0].length,chs=out.length>2?2:out.length,H=XEN_RFL_GUARD_HIST;
    // No input this quantum. Mid-play this is the same browser hiccup as a repeat (the source was not rendered): bridge it.
    // Only a sustained absence (the owner disconnected the source, or it ended) ends this processor, so no node stays behind.
    if(!inp||!inp.length){
      if(!this.seen){for(let c=0;c<out.length;c++)out[c].fill(0);return true}
      this.absent++;
      if(this.absent>XEN_RFL_GUARD_END){for(let c=0;c<out.length;c++)out[c].fill(0);return false}
      this.gaps++;this.bridge(out,out.length>2?2:out.length);return true;
    }
    this.seen=true;this.absent=0;
    if(n!==128){for(let c=0;c<out.length;c++)out[c].set(inp[c<inp.length?c:0]);this.have=false;this.conceal=0;return true}
    // detection: bit-identical to the previous input block in every channel, and not a constant block (silence / DC)
    let repeat=this.have,varying=false;
    for(let c=0;c<chs;c++){
      const a=inp[c<inp.length?c:0],p=this.prev[c],a0=a[0];
      for(let k=0;k<128;k++){const v=a[k];if(repeat&&v!==p[k])repeat=false;if(v!==a0)varying=true;p[k]=v}
    }
    this.have=true;
    if(repeat&&varying){
      this.repeats++;this.bridge(out,chs);
    }else if(this.conceal>0){
      const block=this.conceal;
      for(let k=0;k<128;k++){
        if(k<XEN_RFL_GUARD_BLEND){const w=XEN_RFL_GUARD_W[k],g=this.level(block,k);for(let c=0;c<chs;c++){const a=inp[c<inp.length?c:0];out[c][k]=this.gen(c)*g*(1-w)+a[k]*w}this.t++}
        else for(let c=0;c<chs;c++)out[c][k]=inp[c<inp.length?c:0][k];
      }
      this.conceal=0;
    }else{
      for(let c=0;c<chs;c++)out[c].set(inp[c<inp.length?c:0]);
    }
    for(let c=chs;c<out.length;c++)out[c].set(out[0]);
    for(let c=0;c<chs;c++){const h=this.hist[c];h.copyWithin(0,128);h.set(out[c],H-128)}
    return true;
  }
  // one block of invented continuation in place of a missing / repeated block
  bridge(out,chs){
    if(this.conceal===0){for(let c=0;c<chs;c++)this.snap[c].set(this.hist[c],0);this.lag=this.findLag(chs);this.seam(chs);this.t=0}
    const block=this.conceal;this.conceal++;if(this.conceal>this.longest)this.longest=this.conceal;
    for(let k=0;k<128;k++){const g=this.level(block,k);for(let c=0;c<chs;c++)out[c][k]=this.gen(c)*g;this.t++}
    for(let c=chs;c<out.length;c++)out[c].set(out[0]);
    for(let c=0;c<chs;c++){const h=this.hist[c];h.copyWithin(0,128);h.set(out[c],XEN_RFL_GUARD_HIST-128)}
  }
}
registerProcessor('xensonar-rfl-repeat-guard-v1',XenRflRepeatGuard);
`;
const __XenRflRepeatGuard=(()=>{
 const contexts=new WeakMap();
 // Same loader policy as the RFL pitch worklet: data: first for file://, blob: otherwise; a failed load is retried on the next call.
 function ensure(ctx){
  if(!ctx?.audioWorklet||typeof AudioWorkletNode==='undefined')return Promise.resolve(false);
  let task=contexts.get(ctx);if(task)return task;
  task=(async()=>{
   const isFile=typeof location!=='undefined'&&location.protocol==='file:';
   for(const scheme of isFile?['data','blob']:['blob','data']){
    let url=null;
    try{url=scheme==='data'?'data:application/javascript;charset=utf-8,'+encodeURIComponent(__xenRflRepeatGuardCode):URL.createObjectURL(new Blob([__xenRflRepeatGuardCode],{type:'application/javascript'}));
     await ctx.audioWorklet.addModule(url);return true}
    catch{}finally{if(scheme==='blob'&&url)try{URL.revokeObjectURL(url)}catch{}}
   }
   return false;
  })();
  contexts.set(ctx,task);
  task.then(ok=>{if(!ok&&contexts.get(ctx)===task)contexts.delete(ctx)},()=>{if(contexts.get(ctx)===task)contexts.delete(ctx)});
  return task;
 }
 function create(ctx){try{return new AudioWorkletNode(ctx,'xensonar-rfl-repeat-guard-v1',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit',channelInterpretation:'speakers'})}catch{return null}}
 return Object.freeze({ensure,create});
})();
