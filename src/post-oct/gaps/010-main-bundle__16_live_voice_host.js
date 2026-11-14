/* VOICE-HOST-01 · resident drum and bass voices (zone HOT).
 *
 * Why: every drum hit and every bass note used to create, connect and later disconnect 3 to 9 Web Audio nodes on the main thread
 * (≈ 35 graph operations per second in the standard session, 60 to 75 under load). Chromium answers graph changes with render quanta
 * whose currentFrame is stale (F, F+128, F+128, F+384); that was the cause of the crackle in the Root-Follow loop and of false gaps in
 * recordings (docs/RFL_WIEDERHOLTE_QUANTEN_2026-11-13.md). Only zero graph changes per event avoid it; AudioParam automation and
 * worklet messages do not trigger it.
 *
 * What: two AudioWorklet processors that live as long as the audio context and play voices from messages:
 *  - 'xen-drum-voices': the prepared drum bodies (already pre-rendered buffers) and the drum sample lanes. Per voice the same chain as
 *    before: buffer source (sub-sample start, Chromium's interpolation) → gain automation → optional low-pass → StereoPanner; one
 *    output per lane, connected once to the lane's EQ bus or the drum bus.
 *  - 'xen-bass-voices': the bass synth. Per note the same chain as before: oscillators with Chromium's band-limited wave tables
 *    (36 ranges per octave thirds, the same interpolation), sub oscillator, mix gain, tanh wave shaper, low-pass biquad with the
 *    filter envelope, output envelope, stop. The Bass Pitch slider drives one 'detune' AudioParam of the node, exactly like it drove
 *    every oscillator's detune before.
 * The arithmetic follows Chromium's implementation (oscillator_handler.cc, periodic_wave_handler.cc, biquad.cc, wave_shaper_handler.cc,
 * stereo_panner.cc, audio_buffer_source_handler.cc, audio_param_handler.cc); results differ only by float rounding
 * (tests/voice_host_pcm.cjs compares old and new graphs sample by sample).
 * Fallback: until the worklet is ready, for OfflineAudioContext renders and for drum sounds that are not prepared yet, the previous
 * native nodes are used unchanged. `?xenVoiceHost=0` forces the previous path (A/B listening).
 * The worklet keeps its own continuous clock (max(currentFrame, previous + 128)) so stale browser clocks never shift a voice. */
function __xenVoiceHostModule(){
 'use strict';
 const SR=sampleRate,F=Math.fround;
 /* Chromium's TimeToSampleFrame(kRoundUp): times are first rounded to 1/1024 frame */
 const frameUp=t=>Math.ceil(Math.round(t*SR*1024)/1024);
 /* ---- AudioParam timeline subset: setValueAtTime, linearRampToValueAtTime, exponentialRampToValueAtTime, setTargetAtTime,
         cancelScheduledValues. Values are produced frame by frame in increasing time, like Chromium's audio_param_handler. ---- */
 class Timeline{
  constructor(def,events){this.def=def;this.ev=events||[];this.p=-1;this.last=def;this.seg=-2;this.mul=1;this.acc=0;this.c=0}
  add(e){e.f=Math.ceil(e.t*SR);let i=this.ev.length;while(i>0&&this.ev[i-1].t>e.t)i--;this.ev.splice(i,0,e)}
  cancel(t){const ev=this.ev;let i=ev.length;while(i>0&&ev[i-1].t>=t)i--;if(i<ev.length){ev.length=i;if(this.p>=i)this.p=i-1;this.seg=-2}}
  /* value for frame f (time f/SR); f must not decrease between calls */
  at(f,quantumStart){
   const ev=this.ev,t=f/SR;
   while(this.p+1<ev.length&&ev[this.p+1].f<=f){this.p++} // an event takes effect at frame ceil(time*SR) (audio_param_handler.cc)
   const p=this.p,pe=p>=0?ev[p]:null,nx=ev[p+1];
   let v;
   if(nx&&(nx.k===1||nx.k===2)){                         // ramp towards nx
    const T0=pe?pe.t:0,V0=pe?(pe.k===3?this.last:pe.v):this.def,T1=nx.t,V1=nx.v;
    if(nx.k===1){const k=T1-T0<=1.1754943508222875e-38?0:F(1/(T1-T0));v=F(V0+F((t-T0)*k)*F(V1-V0))}
    else if(V0*V1<=0||T0>=T1)v=V0;
    else{
     if(this.seg!==p+1||quantumStart){this.seg=p+1;this.mul=Math.pow(V1/V0,1/((T1-T0)*SR));this.acc=V0*Math.pow(V1/V0,(t-T0)/(T1-T0))}
     v=F(this.acc);this.acc*=this.mul;
    }
   }else if(pe&&pe.k===3){                                 // setTarget
    if(t>pe.t+10*pe.tau)v=pe.v;
    else if(this.seg!==p){this.seg=p;this.c=F(1-Math.exp(-1/(SR*pe.tau)));v=F(pe.v+(this.last-pe.v)*Math.exp(-(t-pe.t)/pe.tau))}
    else v=F(this.last+(pe.v-this.last)*this.c);
   }else v=pe?pe.v:this.def;
   this.last=v;return v;
  }
 }
 const timeline=(def,list)=>new Timeline(def,(list||[]).map(e=>({k:e[0],t:e[1],f:Math.ceil(e[1]*SR),v:F(e[2]),tau:e[3]||0})));
 /* continuous render clock: a stale currentFrame never moves voices backwards */
 class Clocked extends AudioWorkletProcessor{
  constructor(){super();this.clock=-1;this.dead=false}
  frame(n){const f=this.clock<0?currentFrame:Math.max(currentFrame,this.clock+this.clockLen);this.clock=f;this.clockLen=n;return f}
 }
 /* ---------------- drums: buffer voices ---------------- */
 class DrumVoices extends Clocked{
  constructor(options){
   super();this.outputsN=options.numberOfOutputs;this.buffers=new Map();this.voices=[];this.openHat=null;
   this.port.onmessage=e=>{const m=e.data;if(!m)return;
    if(m.t==='hit')this.hit(m);
    else if(m.t==='buf')this.buffers.set(m.id,m.ch);
    else if(m.t==='drop')this.buffers.delete(m.id);
    else if(m.t==='choke')this.choke(m.at);
    else if(m.t==='sync')this.port.postMessage({t:'sync',id:m.id});
    else if(m.t==='dispose'){this.dead=true;this.voices.length=0;this.buffers.clear()}
   };
  }
  hit(m){
   const ch=this.buffers.get(m.b);if(!ch||m.o>=this.outputsN)return;
   const exact=m.s*SR;let start=frameUp(m.s),read0=Math.max(0,start-exact);
   if(this.clock>=0&&start<this.clock+this.clockLen){start=this.clock+this.clockLen;read0=0}
   const v={ch,o:m.o,start,read0,stop:m.e>0?frameUp(m.e):Infinity,gain:m.g?timeline(1,m.g):null,pan:Math.max(-1,Math.min(1,m.p||0)),
    lp:null,done:false,tail:0,quiet:0};
   const pr=(v.pan*.5+.5)*Math.PI/2,pr2=(v.pan<=0?v.pan+1:v.pan)*Math.PI/2;
   v.gl=Math.cos(ch.length>1?pr2:pr);v.gr=Math.sin(ch.length>1?pr2:pr);
   if(m.f>0)v.lp=lowpassFixed(m.f,1);
   if(m.ck)this.choke(m.s);
   if(m.oh)this.openHat=v;
   if(this.voices.length>=512)this.voices.shift(); // pending voices cost nothing until they start; the cap only guards runaway input
   this.voices.push(v);
  }
  choke(at){const v=this.openHat;if(!v||v.done||!v.gain)return;v.gain.cancel(at);v.gain.add({k:3,t:at,v:F(1e-4),tau:.01})}
  process(inputs,outputs){
   if(this.dead)return false;
   const n=outputs[0]?outputs[0][0].length:128,f0=this.frame(n);
   const vs=this.voices;if(!vs.length)return true;
   for(let i=0;i<vs.length;i++){
    const v=vs[i],out=outputs[v.o];if(!out||v.start>=f0+n)continue;
    const L=out[0],R=out[1]||out[0],c0=v.ch[0],c1=v.ch.length>1?v.ch[1]:null,len=c0.length,max=len-1;
    let k=Math.max(0,v.start-f0);
    for(;k<n;k++){
     const f=f0+k;
     if(v.tail>0){ // the low-pass rings out after the source has ended, as the native filter does
      const a=v.lp.step(0),b=c1?v.lp.step2(0):a;
      if(c1){if(v.pan<=0){L[k]+=F(a+b*v.gl);R[k]+=F(b*v.gr)}else{L[k]+=F(a*v.gl);R[k]+=F(b+a*v.gr)}}else{L[k]+=F(a*v.gl);R[k]+=F(a*v.gr)}
      const mag=Math.abs(a)+Math.abs(b);if(mag<1e-6)v.quiet++;else v.quiet=0;
      if(--v.tail===0||v.quiet>256){v.done=true;break}
      continue;
     }
     const idx=v.read0+(f-v.start);
     /* after a stereo source ends Chromium's chain turns mono at the next quantum and the filter restarts from zero, so a stereo
        tail stops at that boundary; a mono tail rings on */
     if(f>=v.stop||idx>=len){if(v.lp&&!v.tail&&(!c1||k<n)){v.tail=c1?n-k:Math.ceil(.5*SR);v.quiet=0;k--;continue}v.done=true;break}
     const r=Math.floor(idx),fr=idx-r;let r2=r+1;if(r2>=len)r2=r;
     let a,b=0;
     if(fr===0){a=c0[r];if(c1)b=c1[r]}
     else if(r===r2&&r>=1){a=F(c0[r]+(c0[r]-c0[r-1])*fr);if(c1)b=F(c1[r]+(c1[r]-c1[r-1])*fr)}
     else{a=F((1-fr)*c0[r]+fr*c0[Math.min(r2,max)]);if(c1)b=F((1-fr)*c1[r]+fr*c1[Math.min(r2,max)])}
     if(v.gain){const g=v.gain.at(f,k===0);a=F(a*g);if(c1)b=F(b*g)}
     if(v.lp){a=v.lp.step(a);if(c1)b=v.lp.step2(b)}
     if(c1){
      if(v.pan<=0){L[k]+=F(a+b*v.gl);R[k]+=F(b*v.gr)}else{L[k]+=F(a*v.gl);R[k]+=F(b+a*v.gr)}
     }else{L[k]+=F(a*v.gl);R[k]+=F(a*v.gr)}
    }
    if(v.done&&this.openHat===v)this.openHat=null;
   }
   let w=0;for(let i=0;i<vs.length;i++)if(!vs[i].done)vs[w++]=vs[i];vs.length=w;
   return true;
  }
 }
 /* biquad low-pass, Chromium's coefficients (biquad.cc SetLowpassParams), two channel states */
 function lpCoef(o,cutoffHz,q){
  let cutoff=Math.max(0,Math.min(1,cutoffHz/(SR*.5)));
  if(cutoff===1){o.b0=1;o.b1=0;o.b2=0;o.a1=0;o.a2=0;return}
  if(!(cutoff>0)){o.b0=0;o.b1=0;o.b2=0;o.a1=0;o.a2=0;return}
  const res=Math.pow(10,q/20),th=Math.PI*cutoff,alpha=Math.sin(th)/(2*res),cw=Math.cos(th),beta=(1-cw)/2,ia=1/(1+alpha);
  o.b0=beta*ia;o.b1=2*beta*ia;o.b2=beta*ia;o.a1=-2*cw*ia;o.a2=(1-alpha)*ia;
 }
 function lowpassFixed(hz,q){
  const o={b0:0,b1:0,b2:0,a1:0,a2:0,x1:0,x2:0,y1:0,y2:0,u1:0,u2:0,z1:0,z2:0};lpCoef(o,F(hz),F(q));
  o.step=x=>{const y=F(o.b0*x+o.b1*o.x1+o.b2*o.x2-o.a1*o.y1-o.a2*o.y2);o.x2=o.x1;o.x1=x;o.y2=o.y1;o.y1=y;return y};
  o.step2=x=>{const y=F(o.b0*x+o.b1*o.u1+o.b2*o.u2-o.a1*o.z1-o.a2*o.z2);o.u2=o.u1;o.u1=x;o.z2=o.z1;o.z1=y;return y};
  return o;
 }
 /* ---------------- bass: oscillator voices ---------------- */
 const curves=new Map();
 function curveFor(grit){let c=curves.get(grit);if(c)return c;c=new Float32Array(1024);const r=.65+grit*2.6;
  for(let a=0;a<1024;a+=1){const o=a/1023*2-1;c[a]=Math.tanh(o*r)}if(curves.size>64)curves.delete(curves.keys().next().value);curves.set(grit,c);return c}
 class BassVoices extends Clocked{
  static get parameterDescriptors(){return [{name:'detune',defaultValue:0,minValue:-4800,maxValue:4800,automationRate:'a-rate'}]}
  constructor(){
   super();this.tables=null;this.voices=[];this.inc=new Float64Array(128);
   this.port.onmessage=e=>{const m=e.data;if(!m)return;
    if(m.t==='tables')this.tables=m.tables;
    else if(m.t==='note')this.note(m);
    else if(m.t==='sync')this.port.postMessage({t:'sync',id:m.id});
    else if(m.t==='cancel'){for(const v of this.voices)if(v.id===m.id)v.cancelAt=Math.ceil(m.at*SR)}
    else if(m.t==='dispose'){this.dead=true;this.voices.length=0}
   };
  }
  note(m){
   if(!this.tables)return;
   /* oscillator start like Chromium: first frame = TimeToSampleFrame(at, round up); if the exact time lies a hair after that frame
      (start_frame_offset > 0 in oscillator_handler.cc) the first sample is written one frame later */
   const stop=frameUp(m.stop);let start=frameUp(m.at);if(m.at*SR-start>0)start+=1;
   if(this.clock>=0&&start<this.clock+this.clockLen)start=this.clock+this.clockLen;
   const v={id:m.id,start,stop,end:stop+Math.ceil(.15*SR),send:!!m.send,fixed:Number.isFinite(m.detuneFixed)?m.detuneFixed:null,cancelAt:Infinity,
    osc:m.osc.map(o=>({tab:this.tables[o.type],w:o.w,freq:timeline(440,o.freq),vri:0,y:0,hz:NaN,incr:0,hi:null,lo:null,tf:0})),detune:NaN,scale:1,
    mix:m.mix,curve:m.grit===null?null:curveFor(m.grit),freq:timeline(350,m.filterFreq),q:timeline(1,m.filterQ),gain:timeline(1,m.gain),
    bq:{b0:0,b1:0,b2:0,a1:0,a2:0,x1:0,x2:0,y1:0,y2:0},lastHz:NaN,lastQ:NaN};
   if(this.voices.length>=512)this.voices.shift();
   this.voices.push(v);
  }
  process(inputs,outputs,parameters){
   if(this.dead)return false;
   const out0=outputs[0][0],out1=outputs[1]?outputs[1][0]:null,n=out0.length,f0=this.frame(n),vs=this.voices;
   if(!vs.length||!this.tables)return true;
   const det=parameters.detune;
   for(let i=0;i<vs.length;i++){
    const v=vs[i];if(v.start>=f0+n)continue;
    /* Chromium quirk kept for an identical sound: in the quantum where an oscillator starts, its phase increments are read from the
       start of the quantum (oscillator_handler.cc passes phase_increments from index 0 while writing from the start offset), so the
       first frames still use the frequency from before the note (the 440 Hz default). */
    const q0=v.start>f0?v.start-f0:0;
    for(let k=q0;k<n;k++){
     const f=f0+k;if(f>=v.end||f>=v.cancelAt){v.done=true;break}
     let x=0;
     if(f<v.stop){
      const kk=k-q0,d=v.fixed!==null?v.fixed:(det.length>1?det[kk]:det[0]);if(d!==v.detune){v.detune=d;v.scale=Math.pow(2,F(d/1200))}const scale=v.scale;
      for(let j=0;j<v.osc.length;j++){const o=v.osc[j];const hz=o.freq.at(f-q0,k===q0);o.y=oscSample(o,F(F(hz)*F(scale)))}
      for(let j=0;j<v.osc.length;j++){const o=v.osc[j];x=F(x+(o.w===1?o.y:F(o.y*o.w)))}
     }
     let s=F(x*v.mix);
     if(v.curve){const c=v.curve,vi=Math.max(0,Math.min(1023,F(F(s+1)*511.5)));const i1=Math.min(1023,vi|0),i2=Math.min(1023,i1+1);s=F(c[i1]+F(F(vi-i1)*F(c[i2]-c[i1])))}
     const hz=v.freq.at(f,k===0),q=v.q.at(f,k===0),b=v.bq;
     if(hz!==v.lastHz||q!==v.lastQ){lpCoef(b,hz,q);v.lastHz=hz;v.lastQ=q}
     const y=F(b.b0*s+b.b1*b.x1+b.b2*b.x2-b.a1*b.y1-b.a2*b.y2);b.x2=b.x1;b.x1=s;b.y2=b.y1;b.y1=y;
     const g=v.gain.at(f,k===0),o=F(y*g);
     out0[k]+=o;if(v.send&&out1)out1[k]+=o;
    }
   }
   let w=0;for(let i=0;i<vs.length;i++)if(!vs[i].done)vs[w++]=vs[i];vs.length=w;
   return true;
  }
 }
 /* Chromium oscillator: wave table pair chosen per sample from the frequency, linear interpolation inside each table and between
    the two tables (oscillator_handler.cc, periodic_wave_handler.cc). Phase starts at 0 on the first frame. */
 function oscSample(o,hz){
  const tab=o.tab,size=tab.size,mask=size-1;
  if(hz!==o.hz){ // table pair and increment only change with the frequency (log2 per sample would dominate the cost)
   const nyq=SR/2,fq=Math.max(-nyq,Math.min(nyq,hz));o.hz=hz;o.incr=F(fq*tab.rateScale);
   const ratio=fq!==0?Math.abs(fq)/tab.lowest:.5,cents=F(Math.log2(F(ratio))*1200);
   const pr=Math.max(0,Math.min(tab.ranges-1,F(1+F(cents/400)))),i1=pr|0;o.hi=tab.t[i1];o.lo=tab.t[i1<tab.ranges-1?i1+1:i1];o.tf=F(pr-i1);
  }
  const incr=o.incr,tf=o.tf,hi=o.hi,lo=o.lo,r0=Math.floor(o.vri),fr=F(o.vri)-r0,a=r0&mask,b=(r0+1)&mask;
  const sh=F(hi[a]+F(fr*F(hi[b]-hi[a]))),sl=F(lo[a]+F(fr*F(lo[b]-lo[a]))),y=F(sh+tf*F(sl-sh));
  let vri=o.vri+incr;vri-=Math.floor(vri/size)*size;o.vri=vri;
  return y;
 }
 registerProcessor('xen-drum-voices',DrumVoices);
 registerProcessor('xen-bass-voices',BassVoices);
}

const __XenLiveVoiceHost=(()=>{
 const OUTPUTS=16;
 const contexts=new WeakMap();
 let disabled=false;try{disabled=new URLSearchParams(location.search).get('xenVoiceHost')==='0'}catch{}
 const isOffline=ctx=>typeof OfflineAudioContext==='function'&&ctx instanceof OfflineAudioContext;
 function state(ctx){
  if(disabled||!ctx||!ctx.audioWorklet||ctx.state==='closed')return null;
  if(isOffline(ctx)&&!api.allowOffline)return null;
  let s=contexts.get(ctx);if(s)return s;
  s={ok:false,failed:false,drums:new WeakMap(),bass:new WeakMap(),tables:null};contexts.set(ctx,s);
  s.ready=(async()=>{
   const code='('+__xenVoiceHostModule.toString()+')();';let error=null;
   for(const mode of ['blob','data']){let url=null;
    try{url=mode==='blob'?URL.createObjectURL(new Blob([code],{type:'application/javascript'})):'data:application/javascript;charset=utf-8,'+encodeURIComponent(code);
     await ctx.audioWorklet.addModule(url);s.ok=ctx.state!=='closed';return s.ok}
    catch(cause){error=cause}finally{if(mode==='blob'&&url)URL.revokeObjectURL(url)}}
   s.failed=true;console.warn('[xensonar][voice-host] worklet unavailable, native voices stay in use',error);return false;
  })();
  return s;
 }
 /* ---- Chromium's band-limited wave tables, built once per sample rate on the main thread (idle time), then sent to the worklet ---- */
 const tableCache=new Map();
 function buildTables(sampleRate){
  let t=tableCache.get(sampleRate);if(t)return t;
  const size=sampleRate<=24000?2048:sampleRate<=88200?4096:16384,half=size/2,ranges=Math.round(3*Math.log2(size));
  const sin=new Float64Array(size);for(let k=0;k<size;k++)sin[k]=Math.sin(2*Math.PI*k/size);
  const coef=(shape,n)=>{const pf=Math.fround(2/(n*Math.fround(Math.PI)));
   return shape==='sine'?(n===1?1:0):shape==='square'?((n&1)?Math.fround(2*pf):0):shape==='sawtooth'?Math.fround(pf*((n&1)?1:-1)):
    ((n&1)?Math.fround(2*Math.fround(pf*pf)*((((n-1)>>1)&1)?-1:1)):0)};
  const partials=r=>Math.floor(Math.pow(2,-(r*Math.fround(1200/3))/1200)*half); // kept partials 1..min(half-1, P)
  t={};
  for(const shape of ['sine','square','sawtooth','triangle']){
   const acc=new Float64Array(size),tables=new Array(ranges);let have=0;
   for(let r=ranges-1;r>=0;r--){
    const P=Math.min(half-1,partials(r));
    for(let nn=have+1;nn<=P;nn++){const b=coef(shape,nn);if(!b)continue;for(let k=0,idx=0;k<size;k++,idx=(idx+nn)&(size-1))acc[k]+=b*sin[idx]}
    have=Math.max(have,P);tables[r]=Float32Array.from(acc);
   }
   let max=0;for(const x of tables[0])max=Math.max(max,Math.abs(x));const scale=max?Math.fround(1/max):.5;
   for(const tb of tables)for(let k=0;k<size;k++)tb[k]=Math.fround(tb[k]*scale);
   t[shape]={size,ranges,lowest:Math.fround(sampleRate/size),rateScale:Math.fround(size/sampleRate),t:tables};
  }
  tableCache.set(sampleRate,t);return t;
 }
 /* round trip through a worklet port: every message posted before has been handled (tests render offline with this) */
 let syncIds=1;
 function syncPort(port){return new Promise(resolve=>{const id=syncIds++,prev=port.onmessage;
  port.onmessage=e=>{if(e.data?.t==='sync'&&e.data.id===id){port.onmessage=prev;resolve(true)}else prev?.(e)};port.postMessage({t:'sync',id})})}
 /* ---- drums ---- */
 const bufferIds=new WeakMap();let nextBufferId=1;
 function drumHost(ctx,bus){
  const s=state(ctx);if(!s||!s.ok)return null;
  let h=s.drums.get(bus);if(h)return h;
  const node=new AudioWorkletNode(ctx,'xen-drum-voices',{numberOfInputs:0,numberOfOutputs:OUTPUTS,outputChannelCount:Array(OUTPUTS).fill(2)});
  const routes=new Map(),uploaded=new Set();
  h={node,
   output(key,dest){let r=routes.get(key);
    if(!r){if(routes.size>=OUTPUTS)return -1;r={index:routes.size,dest:null};routes.set(key,r)}
    if(r.dest!==dest){if(r.dest)try{node.disconnect(r.index)}catch{}node.connect(dest,r.index);r.dest=dest}
    return r.index},
   id(buffer){let id=bufferIds.get(buffer);if(!id){id=nextBufferId++;bufferIds.set(buffer,id)}
    if(!uploaded.has(id)){const ch=[];for(let c=0;c<Math.min(2,buffer.numberOfChannels);c++)ch.push(buffer.getChannelData(c).slice());
     node.port.postMessage({t:'buf',id,ch},ch.map(x=>x.buffer));uploaded.add(id)}
    return id},
   drop(buffer){const id=bufferIds.get(buffer);if(id&&uploaded.delete(id))node.port.postMessage({t:'drop',id})},
   play(message){node.port.postMessage({t:'hit',...message})},
   sync:()=>syncPort(node.port),
   choke(at){node.port.postMessage({t:'choke',at})}};
  s.drums.set(bus,h);return h;
 }
 /* ---- bass ---- */
 let noteIds=1;
 function bassHost(ctx,dest){
  const s=state(ctx);if(!s||!s.ok)return null;
  if(!s.tables){
   if(!s.tableJob){s.tableJob=true;const run=()=>{if(ctx.state==='closed')return;s.tables=buildTables(ctx.sampleRate)};
    if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:1500});else setTimeout(run,0)}
   return null;
  }
  let h=s.bass.get(dest);if(h)return h;
  const node=new AudioWorkletNode(ctx,'xen-bass-voices',{numberOfInputs:0,numberOfOutputs:2,outputChannelCount:[1,1]});
  node.port.postMessage({t:'tables',tables:s.tables});
  node.connect(dest,0);
  const detune=node.parameters.get('detune');__XenBassPitch.register(ctx,detune);
  let sendDest=null;
  h={node,
   send(target){if(target===sendDest)return;if(sendDest)try{node.disconnect(1)}catch{}if(target)node.connect(target,1);sendDest=target},
   note(message){const id=noteIds++;node.port.postMessage({t:'note',id,...message});return id},
   cancel(id,at){node.port.postMessage({t:'cancel',id,at})},
   sync:()=>syncPort(node.port)};
  s.bass.set(dest,h);return h;
 }
 const api={allowOffline:false,
  prepare(ctx){const s=state(ctx);return s?s.ready:Promise.resolve(false)},
  drums:drumHost,bass:bassHost,buildTables,
  status(ctx){const s=ctx&&contexts.get(ctx);return {disabled,ok:!!s?.ok,failed:!!s?.failed,tables:!!s?.tables}}};
 return api;
})();
