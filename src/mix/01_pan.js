/* One policy for interactive mixer Pan/Volume, independent of note attacks.
 * Hold the instantaneous value, deduplicate targets, then settle over 30 ms.
 * Weak ownership avoids keeping retired AudioParams or contexts alive. */
const __XenMixTargets=new WeakMap();
/* NPARAMS-GATE-01 (hot-path guard for the main room):
 * updateNParams writes the live parameter ref at once on every slider event, so the
 * audio engine hears every value. Only the expensive part, re-rendering the whole
 * app tree plus persistence, is gated to at most one pass per 80 ms (leading edge
 * immediate, trailing edge guaranteed). */
const __xenNParamsGate=new WeakMap();
function __xenNParamsPublish(ref,render,patch){
 let g=__xenNParamsGate.get(ref);if(!g){g={last:-1e9,timer:0,keys:{}};__xenNParamsGate.set(ref,g)}
 Object.assign(g.keys,patch);if(g.timer)return;
 const flush=()=>{g.timer=0;g.last=performance.now();const keys=g.keys;g.keys={};render({...ref.current});
  try{__xenDronePersist.save(ref.current,keys)}catch{}__XenMetaSessions.scheduleWorkingCopy()};
 const wait=80-(performance.now()-g.last);
 if(wait<=0)flush();else g.timer=setTimeout(flush,wait);
}
/* A range input that keeps the thumb where the hand is while the app re-renders at
 * its own pace; afterwards it is controlled by the app value again. Every event is
 * still forwarded unchanged. Uncontrolled inputs pass straight through. */
function __XenRange(props){
 const [local,setLocal]=P.useState(null),timer=P.useRef(0);
 P.useEffect(()=>()=>clearTimeout(timer.current),[]);
 if(props.value===undefined||typeof props.onChange!=='function')return u.jsx('input',props);
 const clearLocal=()=>{clearTimeout(timer.current);timer.current=0;setLocal(null)};
 const onChange=event=>{setLocal(event.target.value);clearTimeout(timer.current);timer.current=setTimeout(()=>setLocal(null),300);props.onChange(event)};
 const onDoubleClick=typeof props.onDoubleClick==='function'?event=>{clearLocal();props.onDoubleClick(event)}:undefined;
 return u.jsx('input',{...props,value:local??props.value,onChange,...(onDoubleClick?{onDoubleClick}:{})});
}
function __xenSmoothMixParam(param,value,ctx){
 if(!param||!Number.isFinite(value)||ctx?.state==='closed')return;
 if(typeof param.__xenApplySmooth==='function')return param.__xenApplySmooth(value,ctx);
 if(__XenMixTargets.get(param)===value)return;
 const at=ctx.currentTime;
 if(ctx?.state&&ctx.state!=='running'){
  __XenMixTargets.delete(param);
  try{param.cancelScheduledValues(at);param.setValueAtTime(value,at);param.value=value}catch{try{param.value=value}catch{}}
  return;
 }
 __XenMixTargets.set(param,value);
 /* MIX-HOLD-01 (reverts LIVE-SLIDER-SOFT): hold on the automation timeline. A value-based hold (param.value) jumps whenever the
    value getter is not current (automation scheduled ahead, offline renders; Firefox has no cancelAndHoldAtTime and keeps this fallback
    as before); measured offline with suspend/resume at 60 events/s and a simulated currentTime lag of 0-20 ms: no step with
    cancelAndHoldAtTime, a 0.037 step per event with the value-based hold when scheduled ahead (tests/mix_audio_browser). */
 if(typeof param.cancelAndHoldAtTime==='function')param.cancelAndHoldAtTime(at);
 else{const held=param.value;param.cancelScheduledValues(at);param.setValueAtTime(held,at)}
 param.setTargetAtTime(value,at,.03);
}
/* Phase-free stereo balance panner (PAN-BAL-01):
 * Keeps L and R strictly separated so stereo sources (RFL, Material, Drums Echo/Hall,
 * Synth/Wave/Multitrack) never suffer StereoPannerNode L+R phase cancellation or +6 dB
 * summing when panned. Mono inputs are explicitly upmixed to 2ch speakers at input,
 * preserving the familiar equal-power L/R ratio (tan((1-|p|)*pi/4)) without boosting > 1. */
function __xenBalanceGains(pan){
 const p=Number.isFinite(pan)?Math.max(-1,Math.min(1,pan)):0;
 if(p===0)return [1,1];
 if(p>0)return [Math.tan((1-p)*Math.PI/4),1];
 return [1,Math.tan((1+p)*Math.PI/4)];
}
function __xenCreateBalancePanner(ctx,initialPan=0){
 const clampPan=v=>Number.isFinite(v)?Math.max(-1,Math.min(1,v)):0;
 const p0=clampPan(initialPan);
 if(!ctx||typeof ctx.createChannelSplitter!=='function'||typeof ctx.createChannelMerger!=='function'){
  if(typeof ctx?.createStereoPanner!=='function')return null;
  const fallback=ctx.createStereoPanner();
  fallback.pan.value=p0;
  try{fallback.pan.setValueAtTime(p0,ctx.currentTime)}catch{}
  __XenMixTargets.set(fallback.pan,p0);
  return fallback;
 }
 const input=ctx.createGain(),splitter=ctx.createChannelSplitter(2),gainL=ctx.createGain(),gainR=ctx.createGain(),merger=ctx.createChannelMerger(2);
 try{input.channelCount=2;input.channelCountMode='explicit';input.channelInterpretation='speakers'}catch{}
 try{gainL.channelCount=1;gainL.channelCountMode='explicit';gainR.channelCount=1;gainR.channelCountMode='explicit'}catch{}
 const [gL0,gR0]=__xenBalanceGains(p0);
 gainL.gain.value=gL0;gainR.gain.value=gR0;
 try{const t0=ctx.currentTime;gainL.gain.setValueAtTime(gL0,t0);gainR.gain.setValueAtTime(gR0,t0)}catch{}
 __XenMixTargets.set(gainL.gain,gL0);__XenMixTargets.set(gainR.gain,gR0);
 input.connect(splitter);
 splitter.connect(gainL,0);splitter.connect(gainR,1);
 gainL.connect(merger,0,0);gainR.connect(merger,0,1);
 let cur=p0,lastVal=p0,lastTime=ctx.currentTime;
 const panParam={
  get value(){return cur},
  set value(v){
   const p=clampPan(v),[gL,gR]=__xenBalanceGains(p);
   cur=p;lastVal=p;lastTime=ctx.currentTime;
   gainL.gain.value=gL;gainR.gain.value=gR;
   __XenMixTargets.set(gainL.gain,gL);__XenMixTargets.set(gainR.gain,gR);
  },
  setValueAtTime(v,t){
   const p=clampPan(v),[gL,gR]=__xenBalanceGains(p);
   cur=p;lastVal=p;lastTime=t;
   gainL.gain.setValueAtTime(gL,t);gainR.gain.setValueAtTime(gR,t);
   __XenMixTargets.delete(gainL.gain);__XenMixTargets.delete(gainR.gain);
   return panParam;
  },
  linearRampToValueAtTime(v,t){
   const p=clampPan(v),[gL,gR]=__xenBalanceGains(p);
   if(((lastVal<0&&p>0)||(lastVal>0&&p<0))&&Number.isFinite(lastTime)&&t>lastTime){
    const tZero=lastTime+(t-lastTime)*(Math.abs(lastVal)/Math.abs(p-lastVal));
    gainL.gain.linearRampToValueAtTime(1,tZero);gainR.gain.linearRampToValueAtTime(1,tZero);
   }
   cur=p;lastVal=p;lastTime=t;
   gainL.gain.linearRampToValueAtTime(gL,t);gainR.gain.linearRampToValueAtTime(gR,t);
   __XenMixTargets.delete(gainL.gain);__XenMixTargets.delete(gainR.gain);
   return panParam;
  },
  setTargetAtTime(v,t,tau){
   const p=clampPan(v),[gL,gR]=__xenBalanceGains(p);
   cur=p;lastVal=p;lastTime=t;
   gainL.gain.setTargetAtTime(gL,t,tau);gainR.gain.setTargetAtTime(gR,t,tau);
   __XenMixTargets.delete(gainL.gain);__XenMixTargets.delete(gainR.gain);
   return panParam;
  },
  cancelScheduledValues(t){
   lastTime=t;
   gainL.gain.cancelScheduledValues(t);gainR.gain.cancelScheduledValues(t);
   __XenMixTargets.delete(gainL.gain);__XenMixTargets.delete(gainR.gain);
   return panParam;
  },
  cancelAndHoldAtTime(t){
   lastTime=t;
   if(typeof gainL.gain.cancelAndHoldAtTime==='function')gainL.gain.cancelAndHoldAtTime(t);
   else gainL.gain.cancelScheduledValues(t);
   if(typeof gainR.gain.cancelAndHoldAtTime==='function')gainR.gain.cancelAndHoldAtTime(t);
   else gainR.gain.cancelScheduledValues(t);
   __XenMixTargets.delete(gainL.gain);__XenMixTargets.delete(gainR.gain);
   return panParam;
  },
  __xenApplySmooth(v,c){
   const p=clampPan(v),[gL,gR]=__xenBalanceGains(p),targetCtx=c||ctx;
   cur=p;lastVal=p;lastTime=targetCtx.currentTime;
   __xenSmoothMixParam(gainL.gain,gL,targetCtx);
   __xenSmoothMixParam(gainR.gain,gR,targetCtx);
  },
  __xenNeedsResync(v){
   const [gL,gR]=__xenBalanceGains(clampPan(v));
   return Math.abs(gainL.gain.value-gL)>1e-3||Math.abs(gainR.gain.value-gR)>1e-3;
  },
  __xenClearSmoothTarget(){
   __XenMixTargets.delete(gainL.gain);__XenMixTargets.delete(gainR.gain);
  }
 };
 input.__xenPanOutput=merger;input.__xenBalancePan=panParam;
 return {
  context:ctx,input,output:merger,pan:panParam,gainL,gainR,
  connect(...args){return merger.connect(...args)},
  disconnect(...args){
   if(args.length)return merger.disconnect(...args);
   for(const n of [input,splitter,gainL,gainR,merger])try{n.disconnect()}catch{}
  }
 };
}
/* Mixer controls own only placement. Moving pan never restarts a source or clock. */
const __XenPan=(()=>{
 const key='xensonar.mix-pan.v1',listeners=new Set(),liveListeners=new Set(),notify=__xenControlNotifier(listeners),contexts=new WeakMap(),devices=new Set();
 const clean=v=>Number.isFinite(v)?Math.max(-1,Math.min(1,v)):0;
 let state=Object.freeze({material:0,rootFollow:0,bass:0,particle:0,wave:0,keyboard:0,...Object.fromEntries(Array.from({length:32},(_,i)=>["particle:"+i,0]))});
 try{const saved=JSON.parse(localStorage.getItem(key)||'{}');state=Object.freeze(Object.fromEntries(Object.keys(state).map(k=>[k,clean(saved[k])])))}catch{}
 let persistTimer=null;const persist=()=>{persistTimer=null;try{localStorage.setItem(key,JSON.stringify(state))}catch{}};
 if(typeof window!=='undefined')window.addEventListener?.('pagehide',()=>{if(persistTimer!==null){clearTimeout(persistTimer);persist()}});
 const snapshot=()=>state,subscribe=fn=>(listeners.add(fn),()=>listeners.delete(fn));
 function set(kind,value){if(!Object.hasOwn(state,kind))return;value=clean(value);if(state[kind]===value)return;
  state=Object.freeze({...state,[kind]:value});clearTimeout(persistTimer);persistTimer=setTimeout(persist,220);
  for(const d of devices)if(d.kind===kind&&d.ctx.state!=='closed')__xenSmoothMixParam(d.pan,value,d.ctx)
  for(const fn of liveListeners)fn();notify.queue();
 }
 function route(ctx,kind,destination){
  if(!ctx||!destination||(typeof ctx.createChannelSplitter!=='function'&&typeof ctx.createStereoPanner!=='function'))return destination;
  let targets=contexts.get(ctx);if(!targets){targets=new WeakMap();contexts.set(ctx,targets)}
  let channels=targets.get(destination);if(!channels){channels=new Map();targets.set(destination,channels)}
  if(channels.has(kind))return channels.get(kind).node;
  if(kind==='bass'||kind==='rootFollow')destination=__XenEQ.route(ctx,kind,destination);
  if(kind==='bass'&&typeof __XenBassDuck!=='undefined')destination=__XenBassDuck.route(ctx,destination);
  const loopRecInput=kind==='particle'||(['wave','keyboard'].includes(kind)&&__XenLoopRec.isDestination(destination));if(loopRecInput)destination=__XenLoopRec.route(ctx,kind,destination);
  const initialPan=state[kind]||0;
  const stage=__xenCreateBalancePanner(ctx,initialPan);if(!stage)return destination;
  const node=stage.input??stage,out=stage.output??stage;
  out.connect(destination);if(loopRecInput)__XenLoopRec.capturedInput(node);
  const d={ctx,kind,node,out,stage,pan:stage.pan,destination,pitchNode:null,pitchOff:null};channels.set(kind,d);devices.add(d);
  // One shared RFL pitch processor after all RFL synthesis and PCM components.
  // Switch to the worklet only after it has been prepared; never retime RFL notes.
  if(kind==='rootFollow')__XenTimeStablePitch.ensure(ctx).then(ready=>{
   if(!ready||ctx.state==='closed'||channels.get(kind)!==d)return;
   const processor=__XenTimeStablePitch.create(ctx,__XenRootFollowPitch.snapshot());if(!processor)return;
   try{out.connect(processor);processor.connect(destination);out.disconnect(destination)}catch{try{processor.disconnect()}catch{}try{out.connect(destination)}catch{}return}
   d.pitchNode=processor;d.pitchOff=__XenRootFollowPitch.register(ctx,processor);
  });
  const onStateChange=()=>{
   if(ctx.state==='closed'){try{stage.disconnect()}catch{}try{d.pitchNode?.disconnect()}catch{}d.pitchOff?.();devices.delete(d);channels.delete(kind);ctx.removeEventListener?.('statechange',onStateChange);return}
   if(ctx.state==='running'){const target=state[kind]||0;const needs=typeof d.pan.__xenNeedsResync==='function'?d.pan.__xenNeedsResync(target):Math.abs(d.pan.value-target)>1e-3;if(needs){d.pan.__xenClearSmoothTarget?.();__XenMixTargets.delete(d.pan);__xenSmoothMixParam(d.pan,target,ctx)}}
  };
  ctx.addEventListener?.('statechange',onStateChange);return node;
 }
 return {snapshot,subscribe,subscribeLive:fn=>(liveListeners.add(fn),()=>liveListeners.delete(fn)),set,route};
})();
/* P7.39.26: synthetic Bass relative cent offset. The native OscillatorNode
   detune parameter adds to existing frequency automation and glide without
   changing the bass clock, note durations or microtonal quantization. */
const __XenBassPitch=(()=>{
 let cents=0,devices=new Set(),listeners=new Set();
 const snapshot=()=>cents,subscribe=fn=>(listeners.add(fn),()=>listeners.delete(fn));
 function set(raw){if(!Number.isFinite(raw))return;const value=Math.max(-1200,Math.min(1200,raw));if(value===cents)return;
  cents=value;
  for(const dev of devices){if(dev.ctx.state==='closed'){devices.delete(dev);continue}
   const now=dev.ctx.currentTime;
   dev.param.cancelScheduledValues(now);dev.param.setTargetAtTime(cents,now,.018);
  }
  for(const fn of listeners)fn();
 }
 function register(ctx,param){
  if(!param)return()=>{};
  const dev={ctx,param};devices.add(dev);
  param.setValueAtTime(cents,ctx.currentTime);
  return()=>{devices.delete(dev)};
 }
 return Object.freeze({snapshot,subscribe,set,register});
})();
/* BASS-DAW-01: zero-graph-change kick-sidechain ducking on the live Bass bus.
   Uses one resident GainNode per live AudioContext (skipped on OfflineAudioContext so offline renders remain untouched). */
const __XenBassDuck=(()=>{
 const KEY='xensonar.bass-duck.v1',listeners=new Set(),nodesByCtx=new WeakMap(),activeNodes=new Set();
 const isOffline=ctx=>typeof OfflineAudioContext==='function'&&ctx instanceof OfflineAudioContext;
 const clamp=(v,lo,hi)=>Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):lo;
 let state=Object.freeze({depth:0,release:.14});
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&typeof saved==='object')state=Object.freeze({depth:clamp(saved.depth,0,.95),release:clamp(saved.release,.03,.45)})}catch{}
 let persistTimer=null,lastHitAt=0,lastHitFloor=1;
 const persist=()=>{persistTimer=null;try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}};
 if(typeof window!=='undefined')window.addEventListener?.('pagehide',()=>{if(persistTimer!==null){clearTimeout(persistTimer);persist()}});
 const emit=()=>{for(const fn of listeners)try{fn()}catch{}};
 function set(patch){
  const next=Object.freeze({depth:patch&&'depth'in patch?clamp(patch.depth,0,.95):state.depth,release:patch&&'release'in patch?clamp(patch.release,.03,.45):state.release});
  if(next.depth===state.depth&&next.release===state.release)return;
  state=next;clearTimeout(persistTimer);persistTimer=setTimeout(persist,220);
  if(state.depth<=1e-4)for(const entry of activeNodes){if(entry.ctx.state==='closed'){activeNodes.delete(entry);continue}try{const now=entry.ctx.currentTime;entry.gain.gain.cancelScheduledValues(now);entry.gain.gain.setTargetAtTime(1,now,.015)}catch{}}
  emit();
 }
 function route(ctx,destination){
  if(!ctx||!destination||isOffline(ctx)||typeof ctx.createGain!=='function')return destination;
  let map=nodesByCtx.get(ctx);if(!map){map=new WeakMap();nodesByCtx.set(ctx,map)}
  const existing=map.get(destination);if(existing)return existing.gain;
  const gain=ctx.createGain();gain.gain.value=1;gain.connect(destination);
  const entry={ctx,gain,destination};map.set(destination,entry);activeNodes.add(entry);
  const dispose=()=>{if(ctx.state!=='closed')return;try{gain.disconnect()}catch{};activeNodes.delete(entry);ctx.removeEventListener?.('statechange',dispose)};
  ctx.addEventListener?.('statechange',dispose);
  return gain;
 }
 function trigger(ctx,time,level=1){
  if(state.depth<=1e-4||!ctx||isOffline(ctx)||ctx.state==='closed')return;
  const map=nodesByCtx.get(ctx);if(!map)return;
  const at=Math.max(ctx.currentTime,Number.isFinite(time)?time:ctx.currentTime);
  const effDepth=Math.min(.95,state.depth*Math.max(.35,Math.min(1.15,Number.isFinite(level)?level:1)));
  const floor=Math.max(.04,1-effDepth),tau=Math.max(.012,state.release/3);
  lastHitAt=performance.now();lastHitFloor=floor;
  for(const entry of activeNodes){
   if(entry.ctx!==ctx)continue;
   try{
    const g=entry.gain.gain;
    g.cancelScheduledValues(at);
    g.setValueAtTime(Math.max(.04,Math.min(1,g.value)),at);
    g.linearRampToValueAtTime(floor,at+.004);
    g.setTargetAtTime(1,at+.016,tau);
   }catch{}
  }
 }
 function reduction(){
  if(state.depth<=1e-4||!lastHitAt)return 0;
  const dt=(performance.now()-lastHitAt)/1000;
  if(dt<0||dt>state.release*3.5)return 0;
  const gain=1-(1-lastHitFloor)*Math.exp(-dt/Math.max(.015,state.release/2.6));
  return Math.max(0,Math.min(1,1-gain));
 }
 const api=Object.freeze({snapshot:()=>state,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),set,route,trigger,reduction});
 globalThis.__XenBassDuck=api;
 return api;
})();
__XenEQ.bind();globalThis.XenSonarEQ=__XenEQ;
function __PanVolume({kind,label,volume,pan,onPan}){
 const saved=P.useSyncExternalStore(__XenPan.subscribe,__XenPan.snapshot,__XenPan.snapshot);
 const value=Number.isFinite(pan)?pan:saved[kind]||0;
 const change=onPan||((v)=>__XenPan.set(kind,v));
 return u.jsxs('div',{'data-mixer-header':kind,style:{display:'grid',gridTemplateColumns:'minmax(90px,1fr) minmax(90px,1fr)',gap:8,width:'100%'},children:[
  u.jsxs('label',{className:'block rounded border border-neutral-800 bg-black/25 px-2 py-1 text-[10px] leading-tight text-neutral-300',children:[
   u.jsxs('div',{className:'mb-1 flex items-center justify-between gap-2',children:[label+' Pan',u.jsx('span',{className:'text-neutral-500',children:value===0?'C':(value<0?'L ':'R ')+Math.round(Math.abs(value)*100)+'%'})]}),
   u.jsx(__XenRange,{type:'range','aria-label':label+' Pan',min:-1,max:1,step:.01,value,onChange:e=>change(Number(e.target.value)),onDoubleClick:()=>change(0),className:'w-full cursor-pointer accent-fuchsia-500'})]}),volume]});
}
