/* Mixer controls own only placement. Moving pan never restarts a source or clock. */
const __XenPan=(()=>{
 const key='xensonar.mix-pan.v1',listeners=new Set(),contexts=new WeakMap(),devices=new Set();
 // Expression is a transient keyboard-only VCA. It is not a persisted mixer volume.
 const keyboardExpressionDevices=new Set();let keyboardExpression=1;
 const clean=v=>Number.isFinite(v)?Math.max(-1,Math.min(1,v)):0;
 let state=Object.freeze({material:0,rootFollow:0,bass:0,particle:0,wave:0,keyboard:0,...Object.fromEntries(Array.from({length:32},(_,i)=>["particle:"+i,0]))});
 try{const saved=JSON.parse(localStorage.getItem(key)||'{}');state=Object.freeze(Object.fromEntries(Object.keys(state).map(k=>[k,clean(saved[k])])))}catch{}
 const snapshot=()=>state,subscribe=fn=>(listeners.add(fn),()=>listeners.delete(fn));
 function set(kind,value){if(!Object.hasOwn(state,kind))return;value=clean(value);if(state[kind]===value)return;
  state=Object.freeze({...state,[kind]:value});try{localStorage.setItem(key,JSON.stringify(state))}catch{}
  for(const d of devices)if(d.kind===kind&&d.ctx.state!=='closed'){const at=d.ctx.currentTime;d.node.pan.cancelScheduledValues(at);d.node.pan.setTargetAtTime(value,at,.018)}
  for(const fn of listeners)fn();
 }
 function route(ctx,kind,destination){
  if(!ctx||!destination||typeof ctx.createStereoPanner!=='function')return destination;
  let targets=contexts.get(ctx);if(!targets){targets=new WeakMap();contexts.set(ctx,targets)}
  let channels=targets.get(destination);if(!channels){channels=new Map();targets.set(destination,channels)}
  if(channels.has(kind))return channels.get(kind).node;
  const node=ctx.createStereoPanner();node.pan.value=state[kind]||0;
  let expressionNode=null;
  if(kind==='keyboard'){expressionNode=ctx.createGain();expressionNode.gain.value=keyboardExpression;node.connect(expressionNode);expressionNode.connect(destination);keyboardExpressionDevices.add({ctx,node:expressionNode});}
  else node.connect(destination);
  const d={ctx,kind,node};channels.set(kind,d);devices.add(d);
  const dispose=()=>{if(ctx.state!=='closed')return;try{node.disconnect()}catch{}if(expressionNode){try{expressionNode.disconnect()}catch{}for(const item of keyboardExpressionDevices)if(item.node===expressionNode)keyboardExpressionDevices.delete(item)}devices.delete(d);channels.delete(kind);ctx.removeEventListener?.('statechange',dispose)};
  ctx.addEventListener?.('statechange',dispose);return node;
 }
 function setKeyboardExpression(value){
  const next=Number.isFinite(value)?Math.max(.5,Math.min(2,value)):1;
  if(next===keyboardExpression)return;keyboardExpression=next;
  for(const item of keyboardExpressionDevices){if(item.ctx.state==='closed')continue;
   const at=item.ctx.currentTime;item.node.gain.setTargetAtTime(next,at,.025);
  }
 }
 return {snapshot,subscribe,set,route,setKeyboardExpression};
})();
function __PanVolume({kind,label,volume,pan,onPan}){
 const saved=P.useSyncExternalStore(__XenPan.subscribe,__XenPan.snapshot,__XenPan.snapshot);
 const value=Number.isFinite(pan)?pan:saved[kind]||0;
 const change=onPan||((v)=>__XenPan.set(kind,v));
 return u.jsxs('div',{'data-mixer-header':kind,style:{display:'grid',gridTemplateColumns:'minmax(90px,1fr) minmax(90px,1fr)',gap:8,width:'100%'},children:[
  u.jsxs('label',{className:'block rounded border border-neutral-800 bg-black/25 px-2 py-1 text-[10px] leading-tight text-neutral-300',children:[
   u.jsxs('div',{className:'mb-1 flex items-center justify-between gap-2',children:[label+' Pan',u.jsx('span',{className:'text-neutral-500',children:value===0?'C':(value<0?'L ':'R ')+Math.round(Math.abs(value)*100)+'%'})]}),
   u.jsx('input',{type:'range','aria-label':label+' Pan',min:-1,max:1,step:.01,value,onChange:e=>change(Number(e.target.value)),onDoubleClick:()=>change(0),className:'w-full cursor-pointer accent-fuchsia-500'})]}),volume]});
}
