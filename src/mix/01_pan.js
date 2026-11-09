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
 const onChange=event=>{setLocal(event.target.value);clearTimeout(timer.current);timer.current=setTimeout(()=>setLocal(null),300);props.onChange(event)};
 return u.jsx('input',{...props,value:local??props.value,onChange});
}
function __xenSmoothMixParam(param,value,ctx){
 if(!param||!Number.isFinite(value)||ctx?.state==='closed'||__XenMixTargets.get(param)===value)return;
 __XenMixTargets.set(param,value);const at=ctx.currentTime;
 if(typeof param.cancelAndHoldAtTime==='function')param.cancelAndHoldAtTime(at);
 else{const held=param.value;param.cancelScheduledValues(at);param.setValueAtTime(held,at)}
 param.setTargetAtTime(value,at,.03);
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
  for(const d of devices)if(d.kind===kind&&d.ctx.state!=='closed')__xenSmoothMixParam(d.node.pan,value,d.ctx)
  for(const fn of liveListeners)fn();notify.queue();
 }
 function route(ctx,kind,destination){
  if(!ctx||!destination||typeof ctx.createStereoPanner!=='function')return destination;
  let targets=contexts.get(ctx);if(!targets){targets=new WeakMap();contexts.set(ctx,targets)}
  let channels=targets.get(destination);if(!channels){channels=new Map();targets.set(destination,channels)}
  if(channels.has(kind))return channels.get(kind).node;
  if(kind==='bass'||kind==='rootFollow')destination=__XenEQ.route(ctx,kind,destination);
  const loopRecInput=kind==='particle'||(['wave','keyboard'].includes(kind)&&__XenLoopRec.isDestination(destination));if(loopRecInput)destination=__XenLoopRec.route(ctx,kind,destination);
  const node=ctx.createStereoPanner();node.pan.value=state[kind]||0;node.connect(destination);if(loopRecInput)__XenLoopRec.capturedInput(node);
  const d={ctx,kind,node,destination,pitchNode:null,pitchOff:null};channels.set(kind,d);devices.add(d);
  // One shared RFL pitch processor after all RFL synthesis and PCM components.
  // Switch to the worklet only after it has been prepared; never retime RFL notes.
  if(kind==='rootFollow')__XenTimeStablePitch.ensure(ctx).then(ready=>{
   if(!ready||ctx.state==='closed'||channels.get(kind)!==d)return;
   const processor=__XenTimeStablePitch.create(ctx,__XenRootFollowPitch.snapshot());if(!processor)return;
   node.disconnect(destination);node.connect(processor);processor.connect(destination);
   d.pitchNode=processor;d.pitchOff=__XenRootFollowPitch.register(ctx,processor);
  });
  const dispose=()=>{if(ctx.state!=='closed')return;try{node.disconnect()}catch{}try{d.pitchNode?.disconnect()}catch{}d.pitchOff?.();devices.delete(d);channels.delete(kind);ctx.removeEventListener?.('statechange',dispose)};
  ctx.addEventListener?.('statechange',dispose);return node;
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
