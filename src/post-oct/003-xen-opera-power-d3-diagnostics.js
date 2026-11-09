
/* XenSonar D3 Power-Trace: OFF by default, explicitly controlled in Runtime gear.
   D3 only enters the existing Runtime ZIP when enabled. No independent overlay.
   No D3 listeners/timers or event storage survive setEnabled(false). */
(function(){
'use strict';
let enabled=false, start=0, sequence=0, attempt=0, epoch=0;
let ids=new WeakMap();
const events=[], waiting=new Map(), contexts=[], hooks=[], timers=[];
const parent={origin:'XenSonar Opera Power D3',version:'D3'};
function activation(){try{return{active:!!navigator.userActivation?.isActive,everActive:!!navigator.userActivation?.hasBeenActive}}catch{return{active:null,everActive:null}}}
function listen(owner,type,handler,opts){owner.addEventListener(type,handler,opts);hooks.push([owner,type,handler,opts]);}
function describe(ctx){
  if(!enabled||!ctx)return null;
  let id=ids.get(ctx);
  if(!id){id=contexts.length+1;ids.set(ctx,id);contexts.push(ctx);
    const handler=()=>log('AudioContext statechange',{context:ctx});
    listen(ctx,'statechange',handler);
  }
  return{id,state:ctx.state,sampleRate:ctx.sampleRate,baseLatency:ctx.baseLatency,outputLatency:ctx.outputLatency};
}
function log(event,detail){
  if(!enabled)return;
  try{events.push({ms:Math.round(performance.now()-start),event,detail:detail?.context?{...detail,context:describe(detail.context)}:detail??null});
    if(events.length>650)events.shift();}catch{}
}
function track(stage,promise,ctx){
  if(!enabled)return Promise.resolve(promise);
  const capturedEpoch=epoch,id=++sequence,atMs=Math.round(performance.now()-start);
  waiting.set(id,{id,stage,atMs,context:ctx});
  log(stage+' BEGIN',{id,context:ctx,activation:activation()});
  return Promise.resolve(promise).then(value=>{
    if(enabled&&capturedEpoch===epoch){waiting.delete(id);log(stage+' DONE',{id,context:ctx});}
    return value;
  },err=>{
    if(enabled&&capturedEpoch===epoch){waiting.delete(id);log(stage+' REJECTED',{id,message:String(err),context:ctx});}
    throw err;
  });
}
function isPowerButton(el){if(!el)return false;if(el.hasAttribute('data-xen-power-button'))return true;const label=(el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||'').trim();const visible=(el.textContent||'').trim();return /^(?:Power|⏻|Have you tried turning it off and on again\?)$/i.test(label)||/^(?:Power|⏻|Have you tried turning it off and on again\?)$/i.test(visible);}
function dom(){const root=document.getElementById('root');const power=Array.from(document.querySelectorAll('.xen-h1-tonal-stage button')).find(isPowerButton);return{powerPresent:!!power,powerDisabled:power?.disabled??null,powerActive:!!power&&(power.getAttribute('aria-pressed')==='true'||power.className.includes('border-violet-400')),rootChildren:root?.children.length??null};}
function snapshot(){
  if(!enabled)return{version:'XenSonar Opera Power D3',enabled:false,events:[],contexts:[],waiting:[]};
  return{version:'XenSonar Opera Power D3',enabled:true,parent,browser:navigator.userAgent,environment:{protocol:location.protocol,secureContext:typeof isSecureContext==='boolean'?isSecureContext:null,crossOriginIsolated:typeof crossOriginIsolated==='boolean'?crossOriginIsolated:null,visibility:document.visibilityState,hasFocus:document.hasFocus()},attempt,activation:activation(),dom:dom(),contexts:contexts.map(describe),waiting:Array.from(waiting.values()).map(x=>({...x,context:describe(x.context)})),events:events.slice()};
}
function powerTarget(ev){const el=ev.target instanceof Element&&ev.target.closest('button');return el?.closest('.xen-h1-tonal-stage')&&isPowerButton(el)?el:null;}
function installHooks(){
  for(const type of ['pointerdown','pointerup'])listen(document,type,ev=>{if(powerTarget(ev))log('DOM '+type,{trusted:ev.isTrusted,pointerType:ev.pointerType,button:ev.button,activation:activation()});},true);
  listen(document,'click',ev=>{if(!powerTarget(ev))return;attempt++;log('Power click captured',{trusted:ev.isTrusted,activation:activation()});const capturedEpoch=epoch;const timer=setTimeout(()=>{if(enabled&&epoch===capturedEpoch)log('Power DOM state',{...dom()})},80);timers.push(timer);},true);
  listen(window,'error',e=>log('window error',{message:e.message,filename:e.filename,lineno:e.lineno}));
  listen(window,'unhandledrejection',e=>log('unhandled rejection',{reason:String(e.reason)}));
  listen(document,'visibilitychange',()=>log('visibility '+document.visibilityState));
  for(const delay of [5000,15000]){const capturedEpoch=epoch;const timer=setTimeout(()=>{if(enabled&&epoch===capturedEpoch&&waiting.size)log(delay/1000+'s boundary snapshot',{waiting:[...waiting.values()].map(v=>v.stage),contexts:contexts.map(describe)});},delay);timers.push(timer);}
}
function setEnabled(next){
  next=!!next;
  if(next===enabled)return enabled;
  epoch++;
  if(!next){
    enabled=false;
    for(const [owner,type,handler,opts] of hooks.splice(0))owner.removeEventListener(type,handler,opts);
    for(const timer of timers.splice(0))clearTimeout(timer);
    events.length=0;waiting.clear();contexts.length=0;ids=new WeakMap();sequence=0;attempt=0;
    return false;
  }
  start=performance.now();enabled=true;
  installHooks();log('D3 trace enabled');
  return true;
}
function download(){if(!enabled)return false;const blob=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='XenSonar_Opera_Power_D3_Result.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;}
window.__XenOperaPowerD3={version:'D3',enabled:()=>enabled,setEnabled,log,track,register:(ctx,label)=>{if(!enabled)return null;const info=describe(ctx);log(label||'context registered',{context:ctx});return info;},snapshot,download};
})();
