
function __XenLaneControls({params,update,primaryId,extras=[]}={}){
 const [tab,setTab]=P.useState('material');
 const [eqOpen,setEqOpen]=P.useState(null);
 const eqDock=(kind,id,owner,rowId)=>{const key=__XenEQ.keyFor(kind,id);return u.jsx(__XenEQDock,{sourceKey:key,owner,rowId,open:eqOpen===key,onToggle:()=>setEqOpen(eqOpen===key?null:key),onClose:()=>setEqOpen(null)},key)};
 // Live-only window scopes. A vertical control changes range, never audio pitch directly.
 const [windows,setWindows]=P.useState({});
 const [windowCenters,setWindowCenters]=P.useState({});
 const [openWindow,setOpenWindow]=P.useState(null);
 const [windowAnchor,setWindowAnchor]=P.useState(null);
 const [pulse,setPulse]=P.useState(null);
 const pulseClock=P.useRef(0);
 const nudgeGestures=P.useRef(new Map());
 const scopeFor=(key,value)=>{
  const vertical=windows[key]??0;
  const att=key.startsWith('att:');
  const requested=att?Math.max(.03125,Math.min(2,.25*Math.pow(2,3*vertical))):Math.max(3,Math.min(1200,100*Math.pow(2,5*vertical)));
  return Math.round(Math.max(requested,Math.abs(Number(value)||0)) * (att?1000:10)) / (att?1000:10);
 };
 function changeScope(key,next,value,label){
  const isLevel=label==='Volume'||label==='Pan';
  const before=windows[key]??(isLevel?1:0),after=Math.max(-1,Math.min(1,next));
  if(before===after)return;
  setWindows(old=>({...old,[key]:after}));
  if(isLevel)setWindowCenters(old=>({...old,[key]:Number(value)||0}));
  // Emit short-lived light cues only for user operations; never during render.
  const now=performance.now();
  if(now-pulseClock.current>145){pulseClock.current=now;
   setPulse({key,direction:after>before?'expand':'contract',serial:now});
  }
 }

 const voiceState=P.useSyncExternalStore(__XenMaterialVoiceMix.subscribeUi,__XenMaterialVoiceMix.snapshot,__XenMaterialVoiceMix.snapshot);
 const panState=P.useSyncExternalStore(__XenPan.subscribe,__XenPan.snapshot,__XenPan.snapshot);
 const bassPitch=P.useSyncExternalStore(__XenBassPitch.subscribe,__XenBassPitch.snapshot,__XenBassPitch.snapshot);
 const rootPitch=P.useSyncExternalStore(__XenRootFollowPitch.subscribe,__XenRootFollowPitch.snapshot,__XenRootFollowPitch.snapshot);
 const attackState=P.useSyncExternalStore(__XenAttackLanes.subscribe,__XenAttackLanes.snapshot,__XenAttackLanes.snapshot);
 // Visible EQ rows use the canonical audible activation chronology, not
 // the technical Primary/extra playback ownership. Every row keeps its ID.
 const activeIds=[...new Set([primaryId,...extras].filter(Boolean))].slice(0,3);
 const chronology=__XenMaterialLayers.oldestFirst(primaryId);
 const ids=[...chronology.filter(id=>activeIds.includes(id)),
  ...activeIds.filter(id=>!chronology.includes(id))].slice(0,3);
 const controlsRef=P.useRef(null);
 P.useLayoutEffect(()=>{
  const el=controlsRef.current;if(!el)return;let frame=0;
  const measure=()=>{frame=0;const height=Math.max(64,Math.floor(__xenPlayAreaBottom()-el.getBoundingClientRect().top-8));
   el.style.maxHeight=height+'px';
   const count=el.querySelectorAll('.xen-lane-slider').length,step=parseFloat(el.style.getPropertyValue('--xen-lane-step'))||22;
   const content=el.querySelector('.xen-lane-page').getBoundingClientRect().bottom-el.getBoundingClientRect().top+el.scrollTop+4;
   const overhead=content-count*step;
   el.style.setProperty('--xen-lane-step',Math.max(17,Math.min(24,(height-overhead-4)/Math.max(1,count)))+'px');
  };
  const queue=()=>{if(!frame)frame=requestAnimationFrame(measure)};
  queue();window.addEventListener('resize',queue);window.addEventListener('scroll',queue,{passive:true});
  const observer=new ResizeObserver(queue);observer.observe(el);const canvas=document.querySelector('[data-xen-play-area]');if(canvas)observer.observe(canvas);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',queue);window.removeEventListener('scroll',queue)};
 },[ids.length,tab,openWindow]);
 const items=__XenQuick.adapters.get('material')?.entries??[];
 const labelFor=id=>items.find(row=>row.id===id)?.name??__XenQuick.snapshot().items.find(row=>row.kind==='material'&&row.id===id)?.name??id;
 const activeSlots=__XenQuick.snapshot().items.filter(row=>row.kind==='material');
 const currentSlot=id=>{const index=activeSlots.findIndex(row=>row.id===id);return index<0?null:index+1};
 const selectedTitle=(kind)=>{const adapter=__XenQuick.adapters.get(kind),id=adapter?.selected??__XenQuick.snapshot().selectedByKind?.[kind];return adapter?.entries?.find(row=>row.id===id)?.name??__XenQuick.snapshot().items.find(row=>row.kind===kind&&row.id===id)?.name??(kind==='bass'?'Bass': 'Root Follow Loop')};
 function slider(owner,label,value,min,max,step,onChange,disabled=false,scopeKey=null){
  const usingWindow=!disabled&&scopeKey!=null;
  const isLevelWindow=label==='Volume'||label==='Pan';
  const vertical=windows[scopeKey]??(isLevelWindow?1:0);
  const bounds=usingWindow&&isLevelWindow?__XenLevelWindowBounds(min,max,value,vertical,windowCenters[scopeKey]):null;
  const scope=usingWindow&&!isLevelWindow?scopeFor(scopeKey,value):max;
  const inputMin=bounds?bounds.min:(usingWindow?-scope:min);
  const inputMax=bounds?bounds.max:scope;
  const inputStep=isLevelWindow&&vertical<1?'any':step;
  const isOpen=usingWindow&&openWindow===scopeKey;
  const rowPulse=usingWindow&&pulse?.key===scopeKey?pulse:null;
  // The framed label is the only toggle; values remain absent during live play.
  return u.jsxs('div',{className:'xen-lane-slider'+(disabled?' is-dsp-pending':'')+(isOpen?' is-window-open':''),children:[
   usingWindow
    ?u.jsx('button',{type:'button',className:'xen-lane-slider-heading xen-lane-window-toggle','aria-label':owner+' '+label+' range window','aria-expanded':isOpen,onClick:event=>{const rect=event.currentTarget.getBoundingClientRect();
      setWindowAnchor({left:Math.max(4,rect.left-19),top:Math.max(6,Math.min(window.innerHeight-84,rect.top+rect.height/2-39))});
      setOpenWindow(isOpen?null:scopeKey);setPulse(null)},children:label})
    :u.jsx('span',{className:'xen-lane-slider-heading',children:label}),
   u.jsxs('div',{className:'xen-lane-range-wrap',children:[
    u.jsx(__XenRange,{type:'range','aria-label':owner+' '+label,min:inputMin,max:inputMax,step:inputStep,value,disabled,
     onPointerDown:e=>{
      if(label!=='Nudge'||!scopeKey?.startsWith('att:')||disabled)return;
      const rect=e.currentTarget.getBoundingClientRect(),span=Math.max(1,rect.width-10);
      const at=(Math.max(-scope,Math.min(scope,Number(e.currentTarget.value)||0))+scope)/(2*scope);
      const knobX=rect.left+5+at*span;
      const kind=Math.abs(e.clientX-knobX)<=12?'drag':'click';
      nudgeGestures.current.set(scopeKey,{pointerId:e.pointerId,kind});
      if(kind==='drag')__XenMaterialVoiceMix.beginGesture(scopeKey.slice(4),kind);
     },
     onPointerUp:e=>{const g=nudgeGestures.current.get(scopeKey);if(g&&g.pointerId===e.pointerId){nudgeGestures.current.delete(scopeKey);__XenMaterialVoiceMix.endGesture(scopeKey.slice(4),g.kind);}},
     onPointerCancel:e=>{const g=nudgeGestures.current.get(scopeKey);if(g&&g.pointerId===e.pointerId){nudgeGestures.current.delete(scopeKey);__XenMaterialVoiceMix.endGesture(scopeKey.slice(4),g.kind);}},
     onLostPointerCapture:e=>{const g=nudgeGestures.current.get(scopeKey);if(g&&g.pointerId===e.pointerId){nudgeGestures.current.delete(scopeKey);__XenMaterialVoiceMix.endGesture(scopeKey.slice(4),g.kind);}},
     onBlur:()=>{const g=nudgeGestures.current.get(scopeKey);if(g){nudgeGestures.current.delete(scopeKey);__XenMaterialVoiceMix.endGesture(scopeKey.slice(4),g.kind);}},
     onChange:e=>{if(!disabled)onChange(Number(e.target.value),label==='Nudge'?nudgeGestures.current.get(scopeKey)?.kind??'click':undefined)},
     onDoubleClick:()=>{if(!disabled){if(scopeKey==='pitch:rootFollow')__XenRFLPitchReentryProbe.event('rfl-pitch-doubleclick-reset',{priorCents:__XenRootFollowPitch.snapshot()});if(isLevelWindow){setWindows(old=>({...old,[scopeKey]:1}));setWindowCenters(old=>({...old,[scopeKey]:label==='Volume'?1:0}));}onChange(label==='Volume'?1:0,label==='Nudge'?'click':undefined)}}}),
    label==='Nudge'&&scopeKey?.startsWith('att:')?u.jsx(__XenNudgeMotion,{id:scopeKey.slice(4),scope}):null,
    rowPulse?u.jsxs('span',{key:rowPulse.serial,className:'xen-lane-light-signal', 'data-direction':rowPulse.direction,'aria-hidden':true,onAnimationEnd:()=>setPulse(state=>state?.serial===rowPulse.serial?null:state),children:[u.jsx('i',{}),u.jsx('i',{})]}):null
   ]}),
   isOpen?u.jsxs('div',{className:'xen-lane-window-popover',style:{left:windowAnchor?.left??0,top:windowAnchor?.top??0},children:[
    u.jsxs('span',{className:'xen-lane-window-ticks','aria-hidden':true,children:[
     u.jsx('i',{style:{top:(50-3-((windows[scopeKey]??(isLevelWindow?1:0))+1)*19)+'%'}}),
     u.jsx('i',{style:{top:(50+3+((windows[scopeKey]??(isLevelWindow?1:0))+1)*19)+'%'}})
    ]}),
    u.jsx(__XenRange,{type:'range',min:-1,max:1,step:.025,value:vertical,'aria-label':owner+' '+label+' window size',onChange:e=>changeScope(scopeKey,Number(e.target.value),value,label)})
   ]}):null
  ]});
 }
 function materialRow(id,index){
  const data=__XenMaterialVoiceMix.get(id,voiceState),owner=labelFor(id);
  const isPrimary=id===primaryId;
  return u.jsxs('div',{className:'xen-lane-row'+(openWindow==='att:'+id?' has-nudge-options':''), 'data-xen-lane-id':id,children:[
   u.jsxs('div',{className:'xen-lane-name',title:owner,style:{display:'flex',alignItems:'center',height:16},children:[
    u.jsx('span',{style:{overflow:'hidden',textOverflow:'ellipsis',minWidth:0,flex:1},children:'📀 '+(currentSlot(id)??'')+' · '+owner})
   ]}),
   u.jsxs('div',{className:'xen-lane-pair',children:[
    slider(owner,'Volume',isPrimary?Math.max(0,Number(params?.materialLoopVolume)||0):data.volume,0,isPrimary?1:1.5,.01,isPrimary?v=>update({materialLoopVolume:v}):v=>__XenMaterialVoiceMix.set(id,'volume',v),false,'volume:'+id),
    slider(owner,'Pan',isPrimary?panState.material??0:data.pan,-1,1,.01,isPrimary?v=>__XenPan.set('material',v):v=>__XenMaterialVoiceMix.set(id,'pan',v),false,'pan:'+id),
    slider(owner,'Pitch',data.pitch,-1200,1200,.1,v=>__XenMaterialVoiceMix.set(id,'pitch',v),false,'pitch:'+id),
    slider(owner,'Nudge',data.att,-2,2,.001,(v,interaction)=>__XenMaterialVoiceMix.set(id,'att',v,interaction),false,'att:'+id)
   ]}),
   openWindow==='att:'+id?u.jsx(__XenNudgeOptions,{id,owner,mode:data.nudgeMode,feel:data.nudgeFeel}):null,
   eqDock('material',id,owner,id)
  ]},id);
 }
 const labels={material:['📀','Material'],rootFollow:['🎼','Root Follow'],bass:['🎸','Bass'],drum:['🥁','Drums']};
 const rows=tab==='material'?ids.map(materialRow):tab==='drum'?[u.jsxs('div',{className:'xen-lane-row xen-lane-single','data-xen-lane-id':'eq-drum',children:[u.jsx('div',{className:'xen-lane-name',children:__XenQuick.adapters.get('drum')?.entries?.find(e=>e.id===__XenEQ.selected('drum'))?.name||'Drums'}),u.jsxs('div',{className:'xen-lane-pair',children:[slider('Drums','Volume',params?.drumVolume??.5,0,1,.01,v=>update({drumVolume:v}),false,'volume:drum'),slider('Drums','Pan',params?.drumPan??0,-1,1,.01,v=>update({drumPan:v}),false,'pan:drum')]}),eqDock('drum',null,'Drums','eq-drum')]})]:[u.jsxs('div',{className:'xen-lane-row xen-lane-single','data-xen-lane-id':'eq-'+tab,children:[
  u.jsx('div',{className:'xen-lane-name',title:selectedTitle(tab==='bass'?'bass':'rootFollow'),children:selectedTitle(tab==='bass'?'bass':'rootFollow')}),
  u.jsxs('div',{className:'xen-lane-pair',children:[
   slider(tab==='bass'?'Bass':'Root Follow','Volume',Math.max(0,Number(params?.[tab==='bass'?'bassVolume':'rootFollowLoopVolume'])||0),0,1,.01,v=>update({[tab==='bass'?'bassVolume':'rootFollowLoopVolume']:v}),false,tab==='bass'?'volume:bass':'volume:rootFollow'),
   slider(tab==='bass'?'Bass':'Root Follow','Pan',panState[tab==='bass'?'bass':'rootFollow']??0,-1,1,.01,v=>__XenPan.set(tab==='bass'?'bass':'rootFollow',v),false,tab==='bass'?'pan:bass':'pan:rootFollow'),
   tab==='bass'
    ?slider('Bass','Pitch',bassPitch,-1200,1200,.1,v=>__XenBassPitch.set(v),false,'pitch:bass')
    :slider('Root Follow','Pitch',rootPitch,-1200,1200,.1,v=>__XenRootFollowPitch.set(v),false,'pitch:rootFollow'),
   tab==='bass'
    ?slider('Bass','Attack',attackState.bass,-2,2,.001,v=>__XenAttackLanes.set('bass',v),false,'att:bass')
    :slider('Root Follow','Attack',attackState.rootFollow,-2,2,.001,v=>__XenAttackLanes.set('rootFollow',v),false,'att:rootFollow')
  ]}),eqDock(tab,null,selectedTitle(tab),'eq-'+tab)
 ]})];
 return u.jsxs('section',{ref:controlsRef,className:'xen-lane-controls','aria-label':'Lane Alignment',onScroll:()=>setOpenWindow(null),children:[
  u.jsx('div',{className:'xen-lane-tabs',role:'tablist','aria-label':'Lane Alignment tabs',children:Object.entries(labels).map(([key,[icon,label]])=>u.jsxs('button',{type:'button',role:'tab',id:'xen-lane-tab-'+key,'aria-controls':'xen-lane-current-panel','aria-selected':key===tab,'aria-label':icon+' '+label,className:key===tab?'is-active':'',onClick:()=>{setTab(key);setOpenWindow(null);setEqOpen(null)},children:[u.jsx('span',{className:'xen-lane-tab-icon','aria-hidden':true,children:icon}),u.jsx('span',{className:'xen-lane-tab-title',children:label})]},key))}),
  u.jsx('div',{className:'xen-lane-page',role:'tabpanel',id:'xen-lane-current-panel','aria-labelledby':'xen-lane-tab-'+tab,children:(tab==='material'&&!ids.length)?u.jsx('div',{className:'xen-lane-empty',children:'Choose Material Track'}):rows})
 ]});
}
/* XLR-LIVE-BAR-01: session-runtime PCM overrides, separate from durable library and Preview. */
/* XLR-LIVE-BAR-02: private Playground PCM plus compact Session edit specifications. */
const __XenRackLiveBarEdits=(()=>{
 const overrides=new Map(),desired=new Map(),pending=new Map(),versions=new Map(),listeners=new Set(),buffers=new WeakMap();
 let serial=0,epoch=0;
 const notify=(id,audio=true)=>{if(audio)versions.set(id,(versions.get(id)||0)+1);serial++;for(const fn of listeners)fn()};
 const valid=id=>typeof id==='string'&&id.length>0;
 // A bar edit is an immediate Session intent, even if PCM preparation is pending.
 function setIntent(id,front,back,ticket=epoch){
  if(ticket!==epoch||!valid(id)||!Number.isInteger(front)||!Number.isInteger(back))return false;
  if(front===0&&back===0){clear(id);return true}
  const previous=desired.get(id);
  if(previous?.front===front&&previous?.back===back)return true;
  desired.set(id,Object.freeze({id,front,back}));notify(id,false);return true;
 }
 function publish(id,draft,front,back){
  const wanted=desired.get(id);
  if(wanted&&(wanted.front!==front||wanted.back!==back))return false;
  if(!valid(id)||!draft?.pcm?.left?.length||!draft?.pcm?.right?.length||!draft?.plan?.bars)return false;
  const pcm=draft.pcm;
  if(pcm.left.length!==pcm.right.length||!Number.isFinite(pcm.rate)||pcm.rate<=0)return false;
  desired.set(id,Object.freeze({id,front,back}));
  const edit=Object.freeze({id,bars:draft.plan.bars,front,back,
   duration:pcm.left.length/pcm.rate,pcm,stamp:serial+1});
  overrides.set(id,edit);notify(id);return true;
 }
 function clear(id){const a=desired.delete(id),b=overrides.delete(id);if(!a&&!b)return false;notify(id);return true}
 function snapshot(items){
  const ids=new Set((Array.isArray(items)?items:[]).filter(row=>row.kind==='material').map(row=>row.id));
  return [...desired.values()].filter(row=>ids.has(row.id)).map(row=>({id:row.id,front:row.front,back:row.back}));
 }
 async function hydrate(spec,ticket){
  const active=()=>epoch===ticket&&desired.get(spec.id)===spec;
  let ctx=null;
  try{
   await __ensureMaterialLibraryHydrated();if(!active())return;
   const source=bs().entries.find(e=>e.id===spec.id);
   if(!source?.blob?.size||!(Number(source.bars)>0)||!(Number(source.bpm)>0))throw Error('Original loop data missing');
   // Remove only deterministically impossible edits for a known original length.
   // Missing/cold assets remain unresolved; do not silently drop their intent.
   if(Number.isInteger(source.bars)&&(
     Math.max(0,-spec.front)+Math.max(0,-spec.back)>=source.bars||
     source.bars+spec.front+spec.back<1||source.bars+spec.front+spec.back>128)){
    if(active()){desired.delete(spec.id);overrides.delete(spec.id);notify(spec.id)}
    throw Error('Persisted bar edit cannot fit original loop length');
   }
   const AC=window.AudioContext||window.webkitAudioContext;
   if(!AC)throw Error('Audio decoding unavailable');
   ctx=new AC();const data=await source.blob.arrayBuffer();if(!active())return;
   const decoded=await ctx.decodeAudioData(data);if(!active())return;
   const draft=await __xenRackRenderBarEdit(decoded,source,spec.front,spec.back,()=>!active(),null,true);
   if(active())publish(spec.id,draft,spec.front,spec.back);
  }catch(error){if(active()&&error?.name!=='AbortError')console.warn('[xensonar][looprack] Playground edit restore failed:',spec.id,error)}
  finally{if(ctx)try{await ctx.close()}catch{}}
 }
 function restoreSession(rows,items){
  epoch++;
  const ticket=epoch,affected=new Set([...overrides.keys(),...desired.keys()]);
  pending.clear();
  overrides.clear();desired.clear();
  for(const row of __xenLoopBarEditsSafe(rows,items)){
   const spec=Object.freeze({...row});desired.set(row.id,spec);affected.add(row.id);
  }
  for(const id of affected)notify(id);
  // No offline PCM is stored in the Session archive. Decode originals asynchronously,
  // prepare outside the audio hotpath and publish only if this Session is still active.
  for(const spec of desired.values()){
   const promise=hydrate(spec,ticket).finally(()=>{if(pending.get(spec.id)?.ticket===ticket)pending.delete(spec.id)});
   pending.set(spec.id,{ticket,promise});
  }
 }
 function bufferFor(ctx,edit){
  if(!ctx||ctx.state==='closed'||!edit)return null;
  let byId=buffers.get(ctx);if(!byId){byId=new Map();buffers.set(ctx,byId)}
  const found=byId.get(edit.id);if(found?.stamp===edit.stamp)return found.audio;
  const pcm=edit.pcm,audio=ctx.createBuffer(2,pcm.left.length,pcm.rate);
  audio.copyToChannel(pcm.left,0);audio.copyToChannel(pcm.right,1);
  // Cache belongs to the AudioContext and is bounded independently of Session references.
  byId.delete(edit.id);byId.set(edit.id,{stamp:edit.stamp,audio});
  while(byId.size>8)byId.delete(byId.keys().next().value);
  return audio;
 }
 return Object.freeze({publish,setIntent,clear,intentFor:id=>desired.get(id)||null,get:id=>overrides.get(id)||null,snapshot,restoreSession,
  pendingFor:id=>pending.get(id)?.promise??null,scopeVersion:()=>epoch,
  subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),revision:()=>serial,
  version:id=>versions.get(id)||0,bufferFor});
})();

/* XLRBE1: shared, non-destructive Loop Rack bar editor. Never rewrite a source asset. */
/* XLRBE1 PURE START */
function __xenRackBarPlan(meta,front=0,back=0){
 const bars=Number(meta.bars),bpm=Number(meta.bpm),beats=Number(meta.beatsPerBar),rate=Number(meta.rate);
 if(!Number.isInteger(bars)||bars<1||!Number.isFinite(bpm)||bpm<=0||!Number.isFinite(beats)||beats<=0||!Number.isFinite(rate)||rate<=0)throw Error('Invalid loop timing.');
 if(!Number.isInteger(front)||!Number.isInteger(back))throw Error('Edits must use whole bars.');
 const trimFront=Math.max(0,-front),trimBack=Math.max(0,-back);
 if(trimFront+trimBack>=bars)throw Error('At least one original bar must remain.');
 const result=bars+front+back;
 if(result<1||result>128)throw Error('Edited loop must contain 1–128 bars.');
 const framesAt=bar=>Math.round(bar*rate*beats*60/bpm);
 const frames=framesAt(result);
 if(frames*8>80*1024*1024)throw Error('Edited PCM would exceed the 80 MiB safety budget.');
 return Object.freeze({bars:result,frames,readStartFrame:framesAt(trimFront),readEndFrame:framesAt(bars-trimBack),padLeftFrames:framesAt(Math.max(0,front)),padRightFrames:framesAt(Math.max(0,back)),originalBars:bars,bpm,beatsPerBar:beats,rate});
}
/* XLRBE1 PURE END */
async function __xenRackRenderBarEdit(buffer,source,front,back,cancelled=()=>false,onPcmReady=null,pcmOnly=false){
 const rate=buffer.sampleRate,beatsPerBar=Math.max(1,Math.round(Number(source.beatsPerBar)||4));
 const plan=__xenRackBarPlan({bars:Math.max(1,Math.round(Number(source.bars)||1)),bpm:Number(source.bpm),beatsPerBar,rate},front,back);
 const start=Math.max(0,Math.round((Number(source.loopStartSec)||0)*rate));
 const advertisedEnd=Number(source.loopEndSec);
 const bound=Number.isFinite(advertisedEnd)&&advertisedEnd>0?Math.min(buffer.length,Math.round(advertisedEnd*rate)):buffer.length;
 const usable=Math.max(0,Math.min(bound-start,Math.round(Number(source.bars)*beatsPerBar*60/Number(source.bpm)*rate)));
 if(!usable)throw Error('Selected material has no decodable loop audio.');
 const left=new Float32Array(plan.frames),right=new Float32Array(plan.frames);
 const inputL=buffer.getChannelData(0),inputR=buffer.getChannelData(Math.min(1,buffer.numberOfChannels-1));
 const from=Math.min(plan.readStartFrame,usable),to=Math.min(plan.readEndFrame,usable);
 const length=Math.max(0,Math.min(to-from,plan.frames-plan.padLeftFrames));
 for(let i=0;i<length;i+=32768){
  if(cancelled())throw new DOMException('Superseded bar edit.','AbortError');
  const n=Math.min(32768,length-i),src=start+from+i,dst=plan.padLeftFrames+i;
  left.set(inputL.subarray(src,src+n),dst);right.set(inputR.subarray(src,src+n),dst);
  if(i+32768<length)await new Promise(resolve=>setTimeout(resolve,0));
 }
 if(cancelled())throw new DOMException('Superseded bar edit.','AbortError');
 if(onPcmReady)onPcmReady({plan,pcm:{left,right,rate}});
 if(pcmOnly)return {plan,pcm:{left,right,rate}};
 const blob=await __xenRecorderFloatWav(left,right,rate,cancelled);
 return {blob,plan,sourceFrames:usable,copiedFrames:length,pcm:{left,right,rate}};
}
/* XLRBE1 AUDIO PREVIEW START */
/* Independent preview transport: never render the metronome into saved audio. */
function __xenRackPhaseHandoff(old,edit,now){
 const barSec=60*old.beatsPerBar/old.bpm;
 const origin=old.origin;
 const nextBar=Math.max(1,Math.ceil((now-origin+0.004)/barSec));
 const at=origin+nextBar*barSec;
 const oldDuration=old.bars*barSec;
 const elapsed=Math.max(0,at-old.startAt+old.offset);
 const eps=1e-6;
 let position=((elapsed%oldDuration)+oldDuration)%oldDuration;
 const oldBoundary=elapsed>eps&&Math.abs(position)<eps;
 // The old final bar must be followed by the newly inserted final bar,
 // NOT by an accidental restart at bar one.
 if(oldBoundary&&edit.back>old.back&&edit.front===old.front)position=oldDuration;
 let mapped=position+(edit.front-old.front)*barSec;
 const duration=edit.bars*barSec;
 if(oldBoundary&&edit.front<old.front)mapped=0; // removed leading bar has no equivalent at wrap
 mapped=((mapped%duration)+duration)%duration;
 // Removed bars cannot be sounded. At the next boundary we wrap the new cycle.
 return Object.freeze({at,offset:mapped,barSec,nextBar,oldPosition:position,retainsClock:true});
}
function __xenRackClickBar(ctx,bpm,beatsPerBar){
 const rate=ctx.sampleRate,seconds=beatsPerBar*60/bpm,frames=Math.max(64,Math.round(seconds*rate));
 const buffer=ctx.createBuffer(1,frames,rate),out=buffer.getChannelData(0);
 for(let beat=0;beat<beatsPerBar;beat++){
  const first=Math.round(beat*frames/beatsPerBar),length=Math.min(frames-first,Math.round(rate*.018));
  const frequency=beat===0?1450:940,level=beat===0?.35:.22;
  for(let i=0;i<length;i++)out[first+i]+=level*Math.exp(-i/(rate*.005))*Math.sin(2*Math.PI*frequency*i/rate);
 }
 return buffer;
}
function __xenRackCreatePreviewTransport(){
 let ctx=null,output=null,current=null,pending=null,clickSource=null,clickGain=null,metronome=false,closed=false;
 const mkBuffer=draft=>{const raw=draft.pcm;if(!raw||!raw.left||!raw.right)throw Error('PCM preview not prepared.');
  const buffer=ctx.createBuffer(2,raw.left.length,raw.rate);
  buffer.copyToChannel(raw.left,0);buffer.copyToChannel(raw.right,1);return buffer;};
 const makeSource=(draft,at,offset,gainStart=1)=>{
  const node=ctx.createBufferSource(),gain=ctx.createGain();node.buffer=mkBuffer(draft);node.loop=true;
  node.connect(gain);gain.connect(output);gain.gain.setValueAtTime(gainStart,at);
  node.start(at,Math.max(0,Math.min(offset,node.buffer.duration-.000001)));
  node.onended=()=>{try{node.disconnect();gain.disconnect()}catch{}};
  return {node,gain,startAt:at,offset};
 };
 const fadeOut=(part,at)=>{if(!part)return;try{
  const param=part.gain.gain;param.cancelScheduledValues(at);
  param.setValueAtTime(1,at);param.linearRampToValueAtTime(0,at+.012);
  part.node.stop(at+.014);
 }catch{}};
 const deactivate=(part,now)=>{if(!part)return;try{part.node.stop(now);part.node.disconnect();part.gain.disconnect()}catch{}};
 const tickOff=now=>{if(!clickSource)return;const old=clickSource;clickSource=null;
  try{clickGain.gain.cancelScheduledValues(now);clickGain.gain.setTargetAtTime(0,now,.003);old.stop(now+.035);}catch{}
  old.onended=()=>{try{old.disconnect();}catch{}};
 };
 const tickOn=()=>{if(!ctx||!current||clickSource)return;
  clickGain=ctx.createGain();clickGain.gain.value=0;clickGain.connect(output);
  const meterSource=ctx.createBufferSource();meterSource.buffer=__xenRackClickBar(ctx,current.bpm,current.beatsPerBar);meterSource.loop=true;meterSource.connect(clickGain);
  const now=ctx.currentTime+.012,offset=((now-current.origin)%current.barSec+current.barSec)%current.barSec;
  meterSource.start(now,offset);clickGain.gain.setTargetAtTime(1,now,.004);clickSource=meterSource;
 };
 // Pending transitions are scheduled at audio time; React does not become
 // the transport clock. A new edit before the boundary replaces the plan.
 const settlePending=()=>{
  if(pending&&ctx.currentTime>=pending.at+.015){current=pending.next;pending=null;}
 };
 async function start(draft,settings){
  if(closed)return;
  if(ctx)await stop();
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('Web Audio preview unavailable.');
  ctx=new AC();await ctx.resume();output=ctx.createGain();output.gain.value=.66;output.connect(ctx.destination);
  const startAt=ctx.currentTime+.045,barSec=60*settings.beatsPerBar/settings.bpm;
  current={...settings,barSec,origin:startAt,startAt,offset:0,...makeSource(draft,startAt,0)};
  if(metronome)tickOn();
 }
 function replace(draft,settings){
  if(!ctx||!current)return false;
  settlePending();
  const handoff=__xenRackPhaseHandoff(current,settings,ctx.currentTime);
  const at=handoff.at;
  // Cancel an unplayed render if the user moves a regulator again.
  if(pending){deactivate(pending.next,ctx.currentTime);pending=null;}
  const incoming=makeSource(draft,at,handoff.offset,0);
  incoming.gain.gain.linearRampToValueAtTime(1,at+.012);
  const outgoing=current;
  fadeOut(outgoing,at);
  const next={...settings,barSec:handoff.barSec,origin:current.origin,startAt:at,offset:handoff.offset,...incoming};
  pending={at,next};
  // The click continues on the original musical clock, never restarts.
  return handoff;
 }
 function setMetronome(on){metronome=!!on;if(!ctx)return;if(on)tickOn();else tickOff(ctx.currentTime);}
 async function stop(){if(!ctx)return;const c=ctx,now=c.currentTime;tickOff(now);
  if(pending){deactivate(pending.next,now);pending=null;}
  fadeOut(current,now);ctx=null;output=null;current=null;
  await new Promise(resolve=>setTimeout(resolve,25));await c.close().catch(()=>{});
 }
 function dispose(){closed=true;return stop();}
 return {start,replace,setMetronome,stop,dispose,running:()=>!!ctx,clock:()=>{if(!ctx)return null;settlePending();return {...current,currentTime:ctx.currentTime,pendingAt:pending?.at??null}}};
}
/* XLRBE1 AUDIO PREVIEW END */


function __XenLoopRackBarEditor({entry,onClose,onRemove,onDelete,onSaved,onRenamed}){
 const [source,setSource]=P.useState(null),[front,setFront]=P.useState(0),[back,setBack]=P.useState(0);
 const [draft,setDraft]=P.useState(null),[busy,setBusy]=P.useState(true),[saving,setSaving]=P.useState(false),[error,setError]=P.useState('');
 const [playing,setPlaying]=P.useState(false),[metronome,setMetronome]=P.useState(false),[name,setName]=P.useState('');
 const engine=P.useRef(null),decoded=P.useRef(null),job=P.useRef(0),closed=P.useRef(false),scopeAtOpen=P.useRef(__XenRackLiveBarEdits.scopeVersion());
 function stopPreview(){if(engine.current){const old=engine.current;engine.current=null;void old.dispose();}setPlaying(false)}
 P.useEffect(()=>{closed.current=false;scopeAtOpen.current=__XenRackLiveBarEdits.scopeVersion();let dead=false;
  setBusy(true);setError('');const prior=__XenRackLiveBarEdits.intentFor(entry.id)??__XenRackLiveBarEdits.get(entry.id);setFront(prior?.front??0);setBack(prior?.back??0);setDraft(null);setName(__xenMaterialDisplayName(entry));
  __ensureMaterialLibraryHydrated().then(()=>{
   if(dead)return;
   const found=bs().entries.find(row=>row.id===entry.id);
   if(!found?.blob?.size)throw Error('Saved PCM source is unavailable.');
   if(!Number.isFinite(found.bpm)||found.bpm<=0||!Number.isFinite(found.bars)||found.bars<=0)throw Error('Material needs valid BPM and bar metadata.');
   setSource(found);
  }).catch(e=>{if(!dead)setError(e.message)}).finally(()=>{if(!dead)setBusy(false)});
  return()=>{dead=true;closed.current=true;job.current++;stopPreview();decoded.current=null;};
 },[entry.id]);
 P.useEffect(()=>{if(!source)return;let abandoned=false;const version=++job.current,scopeVersion=__XenRackLiveBarEdits.scopeVersion();
  setDraft(null);setBusy(true);setError('');
  const timer=setTimeout(async()=>{
   try{
    if(!decoded.current){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('Audio decoding is unavailable.');
     const ctx=new AC();try{const data=await source.blob.arrayBuffer();const decodedBuffer=await ctx.decodeAudioData(data);if(abandoned||version!==job.current)return;decoded.current=decodedBuffer;}finally{await ctx.close().catch(()=>{});} }
    const result=await __xenRackRenderBarEdit(decoded.current,source,front,back,
     ()=>abandoned||version!==job.current||closed.current||scopeVersion!==__XenRackLiveBarEdits.scopeVersion(),
     prepared=>{
      if(abandoned||version!==job.current||closed.current||scopeVersion!==__XenRackLiveBarEdits.scopeVersion())return;
      if(front===0&&back===0)__XenRackLiveBarEdits.clear(source.id);
      else __XenRackLiveBarEdits.publish(source.id,prepared,front,back);
     });
    if(abandoned||version!==job.current)return;
    setDraft(result);
   }catch(e){if(!abandoned&&e.name!=='AbortError')setError(e.message||String(e));}
   finally{if(!abandoned&&version===job.current)setBusy(false)}
  },120);
  return()=>{abandoned=true;clearTimeout(timer);};
 },[source,front,back]);
 const adjust=(edge,amount)=>{
  if(!source||busy||saving)return;
  const f=front+(edge==='front'?amount:0),b=back+(edge==='back'?amount:0);
  try{__xenRackBarPlan({bars:source.bars,bpm:source.bpm,beatsPerBar:source.beatsPerBar||4,rate:decoded.current?.sampleRate||48000},f,b);if(!__XenRackLiveBarEdits.setIntent(source.id,f,b,scopeAtOpen.current))throw Error('Session changed; reopen the Loop Editor.');if(edge==='front')setFront(f);else setBack(b);}catch(e){setError(e.message)}
 };
 const preview=async()=>{
  if(engine.current){stopPreview();return;}
  if(!draft||!source)return;
  const transport=__xenRackCreatePreviewTransport();engine.current=transport;
  try{transport.setMetronome(metronome);await transport.start(draft,{bars:draft.plan.bars,front,back,bpm:source.bpm,beatsPerBar:source.beatsPerBar||4});
   if(engine.current===transport)setPlaying(true);
  }catch(e){if(engine.current===transport){engine.current=null;setPlaying(false);setError('Preview: '+e.message);}void transport.dispose();}
 };
 const toggleMetro=()=>{const next=!metronome;setMetronome(next);engine.current?.setMetronome(next);};
 P.useEffect(()=>{if(!draft||!engine.current||!playing||!source)return;
  try{engine.current.replace(draft,{bars:draft.plan.bars,front,back,bpm:source.bpm,beatsPerBar:source.beatsPerBar||4});}
  catch(e){setError('Live preview: '+e.message)}
 },[draft]);
 const save=async()=>{
  if(!draft||busy||saving||!source)return;
  setSaving(true);stopPreview();setError('');
  try{
   const n=String(name||'').trim().slice(0,100);if(!n)throw Error('Please enter a name.');
   const duration=draft.plan.frames/draft.plan.rate;
   const meta={name:n,role:'loop',bars:draft.plan.bars,bpm:source.bpm,beatsPerBar:source.beatsPerBar||4,
    durationSec:duration,loopStartSec:0,loopEndSec:duration,intendedLoopDurationSec:duration,
    renderMode:'live-pcm',sourceVersion:'looprack-bar-editor-v1',rootHz:source.rootHz??null};
   const saved=await __registerDurableMaterial(Yd(meta,draft.blob),{selectOnRegister:false});
   __XenQuick.add({kind:'material',id:saved.id,name:saved.name});
   onSaved(saved);onClose();
  }catch(e){setError(e.message||String(e));}finally{setSaving(false)}
 };
 const renameOriginal=async()=>{
  if(!source||saving)return;
  const desired=String(name||'').trim();
  if(!desired){setError('Enter a name to rename the original.');return;}
  setSaving(true);setError('');
  try{
   const saved=await QA(entry.id,{name:desired});
   if(!saved||saved.id!==entry.id)throw Error('Original rename was not confirmed.');
   setSource(saved);setName(saved.name);onRenamed?.(saved);
  }catch(error){setError('Rename Original failed: '+(error?.message||String(error)));}
  finally{setSaving(false)}
 };
 let plan=null;try{if(source)plan=__xenRackBarPlan({bars:source.bars,bpm:source.bpm,beatsPerBar:source.beatsPerBar||4,rate:decoded.current?.sampleRate||48000},front,back);}catch{}
 const control=(edge,label,delta)=>u.jsx('button',{type:'button',disabled:busy||saving||!source,'aria-label':label,onClick:()=>adjust(edge,delta),children:delta<0?'−':'+',title:label});
 return ao.createPortal(u.jsx('div',{className:'xen-rack-bar-scrim',onPointerDown:e=>e.stopPropagation(),onClick:e=>{e.stopPropagation();if(e.currentTarget===e.target)onClose()},onKeyDown:e=>{e.stopPropagation();if(e.key==='Escape')onClose()},children:u.jsxs('section',{className:'xen-rack-bar-dialog',role:'dialog','aria-modal':true,'aria-label':'Material Loop Editor',children:[
  u.jsxs('header',{children:[u.jsxs('div',{children:[u.jsx('small',{children:'LOOP RACK · MATERIAL'}),u.jsx('h2',{children:__xenMaterialDisplayName(entry)})]}),u.jsx('button',{type:'button',className:'xen-rack-bar-close',onClick:onClose,'aria-label':'Close editor',children:'×'})]}),
  u.jsxs('div',{className:'xen-rack-bar-total',children:[u.jsx('span',{children:'LOOP LENGTH'}),u.jsxs('strong',{children:[plan?.bars??'—',u.jsx('small',{children:' BARS'})]})]}),
  u.jsxs('div',{className:'xen-rack-bar-edges',children:[u.jsxs('div',{children:[u.jsx('b',{children:'BEGINNING'}),u.jsxs('div',{className:'xen-rack-bar-ctrl',children:[control('front','Remove one bar at beginning',-1),u.jsx('span',{children:front===0?'0':(front>0?'+':'')+front}),control('front',front<0?'Restore one trimmed original bar at beginning':'Add one silent bar at beginning',1)]})]}),u.jsxs('div',{children:[u.jsx('b',{children:'END'}),u.jsxs('div',{className:'xen-rack-bar-ctrl',children:[control('back','Remove one bar at end',-1),u.jsx('span',{children:back===0?'0':(back>0?'+':'')+back}),control('back',back<0?'Restore one trimmed original bar at end':'Add one silent bar at end',1)]})]})]}),
  u.jsx('p',{className:'xen-rack-bar-note',children:'− removes a bar · + restores a trimmed bar or adds silence · Live / preview changes at the next bar without restarting the beat clock. Original audio stays intact.'}),
  u.jsxs('div',{className:'xen-rack-bar-preview',children:[u.jsx('button',{type:'button',onClick:preview,disabled:(!playing&&(busy||!draft))||saving,children:playing?'■ Stop loop':'▶ Preview in loop'}),u.jsx('button',{type:'button','aria-pressed':metronome,onClick:toggleMetro,children:metronome?'♩ Metronome ON':'♩ Metronome OFF'}),u.jsx('span',{children:busy?'Preparing next loop…':draft?draft.plan.bars+' bars · '+(draft.plan.frames/draft.plan.rate).toFixed(2)+' s':'No preview'})]}),
  u.jsx('input',{type:'text','aria-label':'Material name for Rename Original or Save as New Material',maxLength:100,value:name,onChange:e=>setName(e.target.value)}),
  error&&u.jsx('p',{className:'xen-rack-bar-error',role:'alert',children:error}),
  u.jsxs('footer',{children:[u.jsx('button',{type:'button',onClick:onClose,children:'Done'}),u.jsx('button',{type:'button',disabled:!source||saving,onClick:renameOriginal,children:'Rename Original'}),u.jsx('button',{type:'button',className:'xen-rack-bar-save',disabled:!draft||busy||saving,onClick:save,children:saving?'Saving…':'Save as New Material'}),u.jsx('button',{type:'button',onClick:onRemove,children:'Remove from this Session'}),__XenMetaSessions.activeSessionTakeIds().includes(entry.id)&&u.jsx('button',{type:'button',className:'xen-rack-bar-delete',onClick:onDelete,children:'Delete original take'})]})
 ]})}),document.body);
}

/* M5: A Loop-Rec Session Take is an owned audio asset, not a disposable Session tile.
   Removing its Session reference releases the SAME native audio ID to the Material
   library. Never require Save as New Material or Delete Original Take. */
async function __xenReleaseSessionTakeToLibrary(entry){
 if(!entry||entry.kind!=='material'||typeof entry.id!=='string')throw Error('Invalid Material reference.');
 if(!entry.id.startsWith('loop-rec-'))return __XenMetaSessions.detachLiveMaterial(entry);
 if(!__XenMetaSessions.activeSessionTakeIds().includes(entry.id))return __XenMetaSessions.detachLiveMaterial(entry);
 if(!__XenQuick.getItems().some(row=>row.kind==='material'&&row.id===entry.id))throw Error('Take is not in the active Quick Rack.');
 if(__xenMaterialImportBusy)throw Error('Material import is in progress.');
 await __ensureMaterialLibraryHydrated();
 const original=bs().entries.find(row=>row.id===entry.id)??await Uhe(QT,entry.id,'Could not find original Session Take');
 if(!original||original.id!==entry.id||!original.blob?.size)throw Error('Original Take audio is unavailable; no reference removed.');
 // Another saved Session may still reference a Take already released to the global library.
 // Its own Session inventory can be detached without promoting the same asset twice.
 if(!original.sessionTake)return __XenMetaSessions.detachLiveMaterial(entry);
 const promoted={...original,sessionTake:false,loopRecIntent:undefined};
 let ownerChanged=false;
 try{
  __materialNextWrite(entry.id);Ww.delete(entry.id);
  await KT(promoted);ownerChanged=true;
  const readBack=await Uhe(QT,entry.id,'Cannot verify released Take');
  if(!readBack||readBack.sessionTake||readBack.id!==original.id||!readBack.blob?.size)throw Error('Released Take failed IDB read-back.');
  if(!__XenMetaSessions.detachLiveMaterial(entry))throw Error(__XenMetaSessions.snapshot().error||'Could not remove Session Take reference.');
  // Durable Session and native owner are already committed. A view refresh
  // failure must NOT revert only the native owner and split this transaction.
  try{
   GS([...bs().entries.filter(row=>row.id!==entry.id),UT(promoted)]);
   Vw('updated',{id:entry.id,name:promoted.name,role:promoted.role});
  }catch(publicationError){console.warn('[xensonar][take-release][view-refresh]',publicationError);}
  return true;
 }catch(error){
  if(ownerChanged){
   try{await KT(original);}catch(rollback){throw Error('Remove failed and original Take ownership could not be restored: '+error.message+' · '+rollback.message+' · BACK UP BEFORE RETRYING');}
  }
  throw error;
 }
}
function __QuickDock({params={},update=()=>{}}={}){
 const displayMode=P.useSyncExternalStore(__XenQuickDisplay.subscribe,__XenQuickDisplay.snapshot,__XenQuickDisplay.snapshot);
 const recStatus=P.useSyncExternalStore(__XenLoopRec.subscribe,__XenLoopRec.snapshot,__XenLoopRec.snapshot);
 const layerIds=P.useSyncExternalStore(__XenMaterialLayers.subscribe,__XenMaterialLayers.snapshot,__XenMaterialLayers.snapshot);
 const primaryOff=P.useSyncExternalStore(__XenMaterialPrimarySwitch.subscribe,__XenMaterialPrimarySwitch.snapshot,__XenMaterialPrimarySwitch.snapshot);
 const s=P.useSyncExternalStore(__XenQuick.subscribe,__XenQuick.snapshot,__XenQuick.snapshot),[remove,setRemove]=P.useState(null),[editor,setEditor]=P.useState(null),[message,setMessage]=P.useState(''),[saveOpen,setSaveOpen]=P.useState(false);
 const metaState=P.useSyncExternalStore(__XenMetaSessions.subscribe,__XenMetaSessions.snapshot,__XenMetaSessions.snapshot);
 const [collapsed,setCollapsed]=P.useState(()=>{try{return localStorage.getItem('xensonar.quickrack.collapsed.v1')==='1'}catch{return false}});
 const toggleCollapsed=()=>{const value=!collapsed;
  try{localStorage.setItem('xensonar.quickrack.collapsed.v1',value?'1':'0')}catch{}
  if(value){setSaveOpen(false);setRemove(null);setMessage('')}
  setCollapsed(value);
 };
 const navigateSaved=direction=>{
  if(!__XenMetaSessions.ensureHydrated()){setMessage(__XenMetaSessions.snapshot().error);return}
  const current=__XenMetaSessions.snapshot(),target=__xenMetaNeighbor(current,direction);
  if(!target)return;
  const live=__XenQuick.getItems(),active=current.activePalette?.items;
  if((!active?live.length>0:JSON.stringify(live)!==JSON.stringify(active))&&
    !window.confirm('Discard unsaved Quickrack changes and switch to '+target.name+'?'))return;
  __XenMetaAudition.stop(); // A session selector must never turn a preview into an accidental note.
  if(!__XenMetaSessions.activateSaved(target.id))setMessage(__XenMetaSessions.snapshot().error||'Could not switch session.');
  else{setMessage('');setRemove(null)}
 };
 const columns=P.useMemo(()=>{const next={grid:[],material:[],rootFollow:[],drum:[],bass:[]};for(const entry of s.items)next[entry.kind]?.push(entry);return next;},[s.items]);
 // A pulse is an event observed by THIS mounted room, never restored state.
 const observedPulse=P.useRef(s.pulse),[flash,setFlash]=P.useState(0);
 P.useEffect(()=>{
  if(observedPulse.current===s.pulse)return;
  observedPulse.current=s.pulse;setFlash(s.pulse);
  const timer=setTimeout(()=>setFlash(0),2300);return()=>clearTimeout(timer);
 },[s.pulse]);
 /* Do not display the provisional left dock before its first geometry measurement. */
 const [layout,setLayout]=P.useState(()=>({leftTop:156,leftHeight:52,ready:false}));
 const universalRows=Math.max(__xenQuickGlobalRows(metaState?.saved,s.items),metaState?.archiveRows??5);
 const universalGridPx=__xenQuickRowsPx(universalRows);
 const sessionLabel=__XenMetaSessions.liveSessionLabel();
 const needed=collapsed?26:38+universalGridPx+(remove?70:0)+(message?30:0)+(sessionLabel?20:0);
 P.useLayoutEffect(()=>{
  let frame=0,settledFrames=0,lastBootGeometry='',layoutIsReady=false;
  const measure=()=>{
   frame=0;
   const pan=document.querySelector('.xen-performance [aria-label="Keyboard"] .xen-performance-pan');
   const panel=document.querySelector('.xen-performance');
   const bottom=Math.max(pan?.getBoundingClientRect().bottom??148,panel?.getBoundingClientRect().bottom??148);
   const leftTop=Math.max(156,bottom+8),leftAvailable=Math.max(0,Math.floor(window.innerHeight-72-leftTop));
   // One canonical fixed-right Quick Rack. The CSS rail variable owns width;
   // this observer only tracks the left landing zone and recorder marker.
   const next={leftTop,leftHeight:leftAvailable,ready:true};
   // Keep the dock hidden until two consecutive frame measurements agree.
   // Otherwise the first visible frame can briefly expose provisional geometry.
   const signature=[leftTop,leftAvailable,needed,collapsed].join('|');
   if(!layoutIsReady){
    settledFrames=signature===lastBootGeometry?settledFrames+1:1;
    lastBootGeometry=signature;
    if(settledFrames<2){queue();return}
    layoutIsReady=true;
   }
   // The recorder marker begins AFTER the rendered rack. Reading its actual
   // bottom avoids crushing the marker when a longer saved session increases
   // the shared grid height; collapsing frees the recorder area again.
   const visibleCollection=collapsed?null:document.querySelector('.xen-quick-collection.is-right-docked');
   const markerTop=collapsed?156:Math.ceil(Math.max(156,visibleCollection?.getBoundingClientRect().bottom??156+needed)+10);
   document.documentElement.style.setProperty('--xen-quick-marker-top',markerTop+'px');
   setLayout(old=>Object.keys(next).every(k=>old[k]===next[k])?old:next);
  };
  const queue=()=>{if(!frame)frame=requestAnimationFrame(measure)};
  queue();window.addEventListener('resize',queue);window.addEventListener('scroll',queue,{passive:true});
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(queue):null;
  const pan=document.querySelector('.xen-performance [aria-label="Keyboard"] .xen-performance-pan'),panel=document.querySelector('.xen-performance');
  if(pan)observer?.observe(pan);if(panel)observer?.observe(panel);
  const quickCollection=document.querySelector('.xen-quick-collection.is-right-docked');
  if(quickCollection)observer?.observe(quickCollection);
  return()=>{cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',queue);window.removeEventListener('scroll',queue);document.documentElement.style.removeProperty('--xen-quick-marker-top')};
 },[universalRows,needed,collapsed]);
 const allColumnsFilled=Object.values(columns).every(entries=>entries.length>0);
 const collection=u.jsxs('div',{className:'xen-quick-collection is-right-docked'+(collapsed?' is-collapsed':''),
  style:{right:'var(--xen-side-rail-inset)',width:'var(--xen-side-rail-width)','--xen-quick-rows-height':universalGridPx+'px'},
  children:[u.jsxs('div',{className:'xen-quick-mutes-save',children:[u.jsx(__QuickMuteRow,{params,update,showIcons:displayMode==='title'||!allColumnsFilled,titleMode:displayMode==='title'}),u.jsx('button',{type:'button',className:'xen-quick-save-trigger','aria-label':'Save Quickrack Session in Meta Menu','aria-haspopup':'dialog',onClick:()=>{if(__XenMetaSessions.ensureHydrated())setSaveOpen(true);else setMessage(__XenMetaSessions.snapshot().error)},children:'💾'}),u.jsx('button',{type:'button',className:'xen-quick-collapse-trigger','aria-label':collapsed?'Expand Quickrack':'Collapse Quickrack','aria-expanded':!collapsed,onClick:toggleCollapsed,children:__xenQuickCollapseArrow(collapsed)})]}),u.jsx(__QuickColumns,{columns,render:(entry,index,kind)=>u.jsxs('button',{type:'button',className:'xen-quick-tile'+(displayMode==='title'?' is-title-mode':'')+(entry.kind==='material'&&params.materialLoopActive&&layerIds.includes(entry.id)?' is-parallel-material':'')+((entry.kind!=='material'||params.materialLoopActive&&!primaryOff)&&!(__XenQuickSelectableLanes[kind]&&__xenQuickSelectionView(params,kind).empty)&&s.selectedByKind?.[kind]===(kind==='grid'?(entry.instanceId||'legacy:'+entry.id):entry.id)?' is-selected-live':'')+(s.tilePulse?.kind===kind&&s.tilePulse?.id===(kind==='grid'?(entry.instanceId||'legacy:'+entry.id):entry.id)?' is-key-pulse':'')+(typeof __XenMetaSessions!=='undefined'&&Object.keys(__XenMetaSessions.liveItemColor(entry)).length?' is-session-tinted':''),style:(()=>{const tint=typeof __XenMetaSessions!=='undefined'?__XenMetaSessions.liveItemColor(entry):{};return {'--xen-session-border':tint.border??'#285765','--xen-session-bg':tint.background??'#0a2530'}})(),'data-xen-shortcut-kind':kind,'data-xen-shortcut-id':entry.instanceId||entry.id,'aria-pressed':entry.kind==='material'?!!params.materialLoopActive&&(layerIds.includes(entry.id)||s.selectedByKind?.material===entry.id&&!primaryOff):__XenQuickSelectableLanes[kind]?!__xenQuickSelectionView(params,kind).empty&&s.selectedByKind?.[kind]===entry.id:undefined,title:__xenQuickEntryTitle(entry)+(entry.kind==='material'?(__XenMetaSessions.activeSessionTakeIds().includes(entry.id)?' · Click: toggle/exclusive · Shift-click: layer · Right-click: delete Session audio (confirmation).':' · Click: toggle/exclusive · Shift-click: layer · Right-click: remove from Session.'):'' ),'aria-label':__xenMaterialDisplayName(entry),onClick:event=>{  if(event.shiftKey)event.preventDefault();
  if(entry.kind==='material'&&__XenMetaSessions.activeSessionTakeIds().includes(entry.id))__XenLoopRec.observe('quick-tile-click',{id:entry.id,shift:!!event.shiftKey,active:!!params.materialLoopActive,selected:__XenQuick.adapters.get('material')?.selected??null,layerIds:__XenMaterialLayers.snapshot()});
  void __xenQuickTileAction(entry,{shift:!!event.shiftKey,params,update})
   .then(message=>{if(entry.kind==='material'&&__XenMetaSessions.activeSessionTakeIds().includes(entry.id))__XenLoopRec.observe('quick-tile-result',{id:entry.id,message:message??null,adapterSelected:__XenQuick.adapters.get('material')?.selected??null,selectedByKind:__XenQuick.snapshot().selectedByKind?.material??null,layerIds:__XenMaterialLayers.snapshot()});if(message!==null)setMessage(message)})
   .catch(error=>{if(entry.kind==='material'&&__XenMetaSessions.activeSessionTakeIds().includes(entry.id))__XenLoopRec.observe('quick-tile-failed',{id:entry.id,error:String(error?.message||error)});setMessage('Preparation: '+error.message)});
 },onContextMenu:e=>{
  e.preventDefault();
  if(entry.kind==='material'){setEditor(entry);return;}
  // Shift-click is the additive action; right-click means remove.
  setRemove(entry);
 },children:[...(displayMode==='title'?[u.jsx('span',{className:'xen-quick-title-index','aria-hidden':true,children:index+1}),u.jsx('span',{className:'xen-quick-short-title','aria-hidden':true,style:entry.kind==='material'&&entry.id.startsWith('loop-rec-')&&/^Loop \d{4,}$/.test(entry.name.trim())?{fontSize:9}:undefined,children:__xenQuickShortTitle({...entry,name:__xenMaterialDisplayName(entry)})}),entry.kind==='grid'?u.jsx('span',{className:'xen-quick-grid-pattern','aria-hidden':true,children:__xenQuickGridPatternShort(entry)}):u.jsx(__QuickHotkey,{kind,id:entry.id,params,hotkeys:s.hotkeys,display:'title'})]:[u.jsx('span',{className:'xen-quick-symbol'+(entry.kind==='rootFollow'?' xen-quick-rfl':''),children:__XenQuick.icons[entry.kind]}),u.jsx('span',{className:'xen-quick-index',children:index+1}),u.jsx(__QuickHotkey,{kind,id:entry.id,params,hotkeys:s.hotkeys})]),__xenQuickBassGridFlag(entry)]},__xenGridKey(entry))}),
   sessionLabel&&u.jsxs('div',{className:'xen-quick-session-controls',children:[u.jsxs('div',{className:'xen-quick-session-stepper',children:[u.jsx('button',{type:'button',className:'xen-quick-session-nav','aria-label':'Previous session',title:'Previous session',disabled:Math.max(metaState?.saved?.length??0,metaState?.archiveCount??0)<2,onClick:()=>navigateSaved(-1),children:'‹'}),u.jsx('button',{type:'button',className:'xen-quick-session-nav','aria-label':'Next session',title:'Next session',disabled:Math.max(metaState?.saved?.length??0,metaState?.archiveCount??0)<2,onClick:()=>navigateSaved(1),children:'›'})]}),u.jsx('span',{className:'xen-quick-session-caption',title:'Active saved session',children:'Session: '+sessionLabel})]}),
   editor&&u.jsx(__XenLoopRackBarEditor,{entry:editor,onClose:()=>setEditor(null),onSaved:saved=>{setMessage(saved.name+' added as a new material. Original preserved.');},onRemove:()=>{void __xenReleaseSessionTakeToLibrary(editor).then(ok=>{if(ok){__xenQuickAfterMaterialRemoved(editor,params,update);setMessage(__xenMaterialDisplayName(editor)+' removed from this Session; original retained.');setEditor(null)}else setMessage(__XenMetaSessions.snapshot().error||'Could not remove this material reference.');}).catch(error=>setMessage('Remove failed: '+error.message))},onRenamed:saved=>{setEditor(prev=>prev?.id===saved.id?{...prev,name:saved.name}:prev);setMessage('Original renamed: '+saved.name+' · Session reference still uses the same ID.');},onDelete:()=>{if(!__XenMetaSessions.activeSessionTakeIds().includes(editor.id)){setMessage('Loop belongs to another Session; deletion cancelled.');return;}void LI(editor.id).then(deleted=>{if(!deleted)return;__xenQuickAfterMaterialRemoved(editor,params,update);setMessage(editor.name+' permanently deleted from Session.');setEditor(null)}).catch(error=>setMessage('Loop deletion failed: '+error.message));}}),
   remove&&u.jsxs('div',{className:'xen-quick-confirm',children:[u.jsx('span',{children:'„'+remove.name+'“?'}),u.jsx('button',{type:'button',onClick:async()=>{let ok=false;
    try{ok=remove.kind==='material'?await __xenReleaseSessionTakeToLibrary(remove):__XenQuick.remove(remove)}
    catch(error){setMessage('Quick Rack remove failed: '+error.message);setRemove(null);return}
    if(ok){if(remove.kind==='material')__xenQuickAfterMaterialRemoved(remove,params,update);setMessage(remove.name+' removed from this Session.')}
    else setMessage(remove.kind==='material'?(__XenMetaSessions.snapshot().error||'Material reference was not removed.'):'Quick Rack reference was not found; nothing was removed.');
    setRemove(null)},children:'Remove'}),u.jsx('button',{type:'button',onClick:()=>setRemove(null),children:'Cancel'})]}),u.jsx(__XenStarterMaterialStatus,{}),(message||s.storageError)&&u.jsx('small',{role:'status',children:message||s.storageError}),
   (recStatus.phase!=='idle'||recStatus.message)&&u.jsx('small',{className:'xen-loop-rec-dock-status',role:recStatus.phase==='failed'?'alert':'status','aria-live':recStatus.phase==='failed'?'assertive':'polite',children:recStatus.message||({arming:'Preparing capture…',armed:'Armed · start on next bar',recording:'Recording · click Enough to stop',finishing:'Closing the selected bars…',saving:'Saving audio and Session…'}[recStatus.phase]||'')}),u.jsx(__XenLaneControls,{params,update,primaryId:__XenQuick.adapters.get('material')?.selected,extras:layerIds})]});
 const collapsedTab=u.jsx('button',{type:'button',className:'xen-quick-collapse-trigger xen-quick-collapse-tab','aria-label':'Expand Quickrack','aria-expanded':false,onClick:toggleCollapsed,children:__xenQuickCollapseArrow(true)});
 P.useEffect(()=>()=>__XenQuick.cancelActivation(),[]);
 const dock=u.jsxs('section',{className:'xen-quick-dock'+' is-right-docked'+(collapsed?' is-collapsed':''),'aria-label':'Quick Access','data-xen-quick-hint':__XenQuickHelpText,
  style:{top:156,height:collapsed?26:'auto',width:collapsed?26:undefined,left:'auto',right:'var(--xen-side-rail-inset)',maxHeight:'none',visibility:layout.ready?'visible':'hidden',pointerEvents:layout.ready?'auto':'none'},onPointerDown:e=>e.stopPropagation(),onPointerUp:e=>e.stopPropagation(),onMouseDown:e=>e.stopPropagation(),onMouseUp:e=>e.stopPropagation(),onClick:e=>e.stopPropagation(),
  children:collapsed?[collapsedTab]:[collection]});
 // Restore the original LEFT Quick Access landing/cue after permanently docking the full rack RIGHT.
 // Its two flashes are the existing xenQuickPulse animation, not a new animation or drag engine.
 const leftLanding=!collapsed&&layout.ready?u.jsx('div',{className:'xen-quick-left-landing'+(flash>0?' is-ready':''),
  'data-xen-quick-landing':'left','aria-hidden':true,style:{top:layout.leftTop,height:layout.leftHeight},
  children:flash>0&&u.jsx('span',{key:'drop-'+flash,className:'xen-quick-signal','aria-hidden':true})}):null;
 return typeof document==='undefined'?dock:u.jsxs(P.Fragment,{children:[dock,leftLanding,
  ao.createPortal(u.jsx('span',{className:'xen-quick-hover-info',role:'tooltip',children:__XenQuickHelpText}),document.body),saveOpen&&u.jsx(__XenQuickSaveDialog,{onClose:()=>setSaveOpen(false)})]});
}
if(typeof document!=='undefined'){
 // The original LEFT drop/flash area remains active after the content rack migrates RIGHT.
 // Both rects feed the SAME existing pointer transaction and __XenQuick.add.
 const landingRects=()=>['.xen-quick-collection.is-right-docked','.xen-quick-dock','.xen-quick-left-landing'].map(sel=>document.querySelector(sel)?.getBoundingClientRect()).filter(Boolean);
 const inDock=e=>{const special=document.querySelector('.xen-meta-live-drop-target');if(special){const r=special.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom)return true;}if(document.querySelector('.xen-quick-dock')?.classList.contains('is-collapsed'))return false;
  return landingRects().some(r=>r.width>0&&r.height>0&&e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom)};
 /* N19: one pointer transaction for sorting AND quick access. Destination,
    not initial direction, chooses the action. Browser-native dragging never
    takes ownership of these rows; callbacks reuse each library's own session. */
 const __XenQuickPointerDrag=(()=>{
  let session=null,ghost=null,suppressClick=false,frame=0;
  const hooks=()=>session&&(__XenQuickDragBindings.get(session.source)||session.sort);
  function transfer(){
   const data=new Map();
   return {effectAllowed:'move',dropEffect:'move',setData:(k,v)=>data.set(k,String(v)),
    getData:k=>data.get(k)||'',clearData:k=>k?data.delete(k):data.clear(),
    get types(){return [...data.keys()]},setDragImage(){}};
  }
  const libraryEvent=e=>({clientX:e.clientX,clientY:e.clientY,dataTransfer:session.transfer,
   target:document.elementFromPoint(e.clientX,e.clientY),currentTarget:session.source,
   preventDefault(){},stopPropagation(){}});
  function leaveSort(){
   if(!session?.sorting)return;
   session.sorting=false;hooks()?.end?.();
  }
  function clear(){
   if(!session)return;
   const old=session;
   try{leaveSort()}finally{
    session=null;cancelAnimationFrame(frame);frame=0;
    ghost?.remove();ghost=null;for(const lane of document.querySelectorAll('[data-xen-fill-column]'))lane.classList.remove('is-fill-drop','is-fill-invalid');document.querySelector('.xen-meta-live-drop-target')?.remove();document.querySelector('.xen-meta-board')?.classList.remove('is-drop-hover');for(const bin of document.querySelectorAll('[data-xen-meta-library-trash]'))bin.classList.remove('is-trash-hover');for(const lane of document.querySelectorAll('.xen-meta-lane'))lane.classList.remove('is-drop-lane');for(const lane of document.querySelectorAll('.xen-meta-lane'))lane.classList.remove('is-drop-invalid');for(const tile of document.querySelectorAll('.xen-meta-tile.is-swap-target'))tile.classList.remove('is-swap-target');if(typeof __xenMetaRenderDropMarker==='function')__xenMetaRenderDropMarker(null);__xenMetaLibraryOrderPaint(null);__xenMetaSessionOrderPaint(null);
    document.documentElement.classList.remove('xen-quick-pointer-dragging');
    for(const target of document.querySelectorAll('.xen-quick-dock,.xen-quick-collection.is-right-docked,.xen-quick-left-landing'))target.classList.remove('xen-quick-pointer-over');
    if(old.dragging)suppressClick=true;
    try{document.documentElement.releasePointerCapture(old.pointerId)}catch{}
   }
  }
  function zoneAt(e){
   const sort=hooks();if(!sort?.zone||!session.modal.isConnected)return null;
   const zone=session.modal.querySelector('[data-xen-sort-zone="'+sort.zone+'"]');
   if(!zone)return null;
   const r=zone.getBoundingClientRect();
   if(sort.zone==='drum'&&session.modal.dataset.xenHeaderMenu==='drum'){
    // The ENTIRE left Drum Lib column (not just its inner scrolling viewport)
    // owns sorting. External transfers start only when the pointer exits it.
    const panel=zone.parentElement?.parentElement;
    const area=panel?.getBoundingClientRect();
    return area&&e.clientX>=area.left&&e.clientX<area.right&&e.clientY>=area.top&&e.clientY<area.bottom?zone:null;
   }
   // Other native libraries retain their own existing hit-test rules.
   const hit=document.elementFromPoint(e.clientX,e.clientY);
   return e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom&&
    hit&&zone.contains(hit)?zone:null;
  }
  function fillAt(e){
   if(session?.modal?.dataset.xenHeaderMenu!=='meta'||session.source.hasAttribute('data-xen-meta-item'))return null;
   const hit=document.elementFromPoint(e.clientX,e.clientY);
   const tab=hit?.closest('.xen-fill-tabbar [role="tab"]');
   if(tab?.textContent?.includes('ONE SHOTS')&&!session.fillTabOpened){
    session.fillTabOpened=true;
    window.dispatchEvent(new Event('xensonar:fill-pointer-open-tab'));
   }
   const lane=hit?.closest('[data-xen-fill-column]');
   const role=lane?.getAttribute('data-xen-fill-column');
   if(role!=='drum'&&role!=='melodic')return null;
   const expected=session.entry.kind==='drum'?'drum':'melodic';
   const allowed=['drum','material','rootFollow'].includes(session.entry.kind);
   return{role,valid:allowed&&role===expected,element:lane};
  }
  function update(e){
   if(!session?.dragging)return;
   session.last={clientX:e.clientX,clientY:e.clientY};
   const fill=fillAt(e);session.fillTarget=fill;
   const trash=__xenMetaTrashAt(e,session);session.trashTarget=trash;
   const libraryTarget=!trash&&!fill?__xenMetaLibraryOrderTarget(e,session):null;session.libraryTarget=libraryTarget;__xenMetaLibraryOrderPaint(libraryTarget);
   const sessionTarget=!trash&&!fill?__xenMetaSessionOrderTarget(e,session):null;session.sessionTarget=sessionTarget;__xenMetaSessionOrderPaint(sessionTarget);
   const meta=session.entry.kind!=='session'&&!trash&&!fill&&!libraryTarget&&typeof __xenMetaDropTarget==='function'?__xenMetaDropTarget(e,session):null;session.metaTarget=meta;
   for(const lane of document.querySelectorAll('[data-xen-fill-column]')){
    lane.classList.toggle('is-fill-drop',!!fill&&fill.element===lane&&fill.valid);
    lane.classList.toggle('is-fill-invalid',!!fill&&fill.element===lane&&!fill.valid);
   }
   const board=document.querySelector('.xen-meta-board');board?.classList.toggle('is-drop-hover',!!meta);
   if(typeof __xenMetaRenderDropMarker==='function')__xenMetaRenderDropMarker(meta);
   for(const lane of document.querySelectorAll('.xen-meta-lane'))lane.classList.toggle('is-drop-lane',!!meta&&!meta.swapWith&&lane===meta.column);
    for(const lane of document.querySelectorAll('.xen-meta-lane'))lane.classList.toggle('is-drop-invalid',!!meta?.invalidReason&&lane===meta.column);
    for(const tile of document.querySelectorAll('.xen-meta-tile.is-swap-target'))tile.classList.remove('is-swap-target');
    if(meta?.swapWith){const other=[...document.querySelectorAll('.xen-meta-tile')].find(tile=>tile.dataset.xenQuickKind===meta.swapWith.kind&&tile.dataset.xenQuickId===meta.swapWith.id);other?.classList.add('is-swap-target');}
   for(const bin of document.querySelectorAll('[data-xen-meta-library-trash]'))bin.classList.toggle('is-trash-hover',bin===trash);
   const nativeZone=zoneAt(e);
   const inside=session.entry.kind!=='session'&&!nativeZone&&!sessionTarget&&!trash&&!meta&&!fill&&!libraryTarget&&inDock(e);
   const zone=inside||meta||fill||trash||libraryTarget||sessionTarget?null:nativeZone,sort=hooks();
   session.overDock=inside;placeQuickHelp(e,inside&&session.modal.dataset.xenHeaderMenu!=='meta');
   if(zone){
    if(!session.sorting){session.sorting=true;sort.start?.(libraryEvent(e))}
    sort.over?.(libraryEvent(e));
   }else leaveSort();
   for(const target of document.querySelectorAll('.xen-quick-dock,.xen-quick-collection.is-right-docked,.xen-quick-left-landing')){const r=target.getBoundingClientRect();target.classList.toggle('xen-quick-pointer-over',inside&&r.width>0&&r.height>0&&e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom);}
   ghost.classList.toggle('is-over',inside||!!meta||!!fill||!!trash);
   ghost.classList.toggle('is-sorting',!!zone);ghost.classList.toggle('is-library-sorting',!!libraryTarget||!!sessionTarget);
   const detail=zone?sort.preview?.():'';
   ghost.textContent=(session.entry.kind==='session'?'🎧':__XenQuick.icons[session.entry.kind]||'')+' '+session.entry.name+
    (sessionTarget?__xenMetaSessionOrderHud(sessionTarget):libraryTarget?__xenMetaLibraryOrderHud(libraryTarget):trash?' · RELEASE → LIBRARY TRASH':fill?' · '+(fill.valid?'RELEASE → '+fill.role.toUpperCase()+' FILL':'WRONG FILL COLUMN'):meta?' · LOSLASSEN → SESSION':inside?' · RELEASE → LIVE QUICK RACK':session.entry.kind==='session'?' · SORT SESSIONS':session.modal.dataset.xenHeaderMenu==='meta'?' · DRAG TO QUICK RACK':detail?' · '+detail:'');
   ghost.style.left=Math.max(4,Math.min(e.clientX+14,window.innerWidth-ghost.offsetWidth-4))+'px';
   ghost.style.top=Math.max(4,Math.min(e.clientY-18,window.innerHeight-ghost.offsetHeight-4))+'px';
  }
  function tick(){
   if(!session?.dragging)return;
   if(!session.source.isConnected||!session.modal.isConnected){clear();return}
   const savedList=session.entry.kind==='session'?session.modal.querySelector('.xen-meta-session-list'):null;
   const savedArea=savedList?.getBoundingClientRect();
   const savedInside=savedArea&&session.last.clientX>=savedArea.left&&session.last.clientX<savedArea.right&&session.last.clientY>=savedArea.top&&session.last.clientY<savedArea.bottom;
   const zone=savedInside?savedList:session.metaTarget?.column??(session.overDock?null:zoneAt(session.last));
   if(zone&&zone.scrollHeight>zone.clientHeight){
    const r=zone.getBoundingClientRect(),y=session.last.clientY;
    const step=y<r.top+28?-Math.min(12,(r.top+28-y)*.45):
     y>r.bottom-28?Math.min(12,(y-r.bottom+28)*.45):0;
    if(step){const before=zone.scrollTop;zone.scrollTop+=step;if(zone.scrollTop!==before)update(session.last)}
   }
   frame=requestAnimationFrame(tick);
  }
  window.addEventListener('pointerdown',e=>{
   if(e.button!==0||e.isPrimary===false)return;
   suppressClick=false;clear();suppressClick=false;
   const target=e.target instanceof Element?e.target:null;
   const row=target?.closest('[data-xen-quick-kind][data-xen-quick-id]');
   const modal=row?.closest('[data-xen-header-menu]');
   if(!row||!modal||!row.dataset.xenQuickId||target.closest('input,textarea,select,[contenteditable="true"]')||row.matches('.xen-meta-library-row,.xen-meta-session-row')&&target.closest('button'))return;
   session={source:row,modal,sort:__XenQuickDragBindings.get(row),pointerId:e.pointerId,
    entry:{kind:row.dataset.xenQuickKind,id:row.dataset.xenQuickId,name:row.dataset.xenQuickName||row.dataset.xenQuickId},
    x:e.clientX,y:e.clientY,last:{clientX:e.clientX,clientY:e.clientY},dragging:false,sorting:false,transfer:transfer()};
   // No capture and no cancellation until movement: simple clicks keep selection.
  },true);
  // Prevent the browser's competing drag/text-selection default at its source.
  // Click still reaches the row. Nothing outside a semantic playlist row changes.
  window.addEventListener('mousedown',e=>{
   if(session&&session.source.contains(e.target)&&e.button===0)e.preventDefault();
  },true);
  window.addEventListener('dragstart',e=>{
   if(e.target instanceof Element&&e.target.closest('[data-xen-quick-kind]')){
    e.preventDefault();e.stopImmediatePropagation();
   }
  },true);
  window.addEventListener('pointermove',e=>{
   if(!session||e.pointerId!==session.pointerId)return;
   if(!(e.buttons&1)){clear();return}
   if(!session.dragging){
    if(Math.hypot(e.clientX-session.x,e.clientY-session.y)<5)return;
    session.dragging=true;suppressClick=true;
    if(session.modal.dataset.xenHeaderMenu==='meta'){
     const liveTarget=document.createElement('div');liveTarget.className='xen-meta-live-drop-target';
     liveTarget.setAttribute('aria-hidden','true');liveTarget.textContent='↓ RELEASE HERE · LIVE QUICK RACK';
     Object.assign(liveTarget.style,{position:'fixed',right:'50px',bottom:'38px',width:'260px',minHeight:'48px',
      display:'flex',alignItems:'center',justifyContent:'center',padding:'8px 12px',borderRadius:'8px',
      zIndex:'250',color:'#d8ffff',fontSize:'12px',fontWeight:'700',letterSpacing:'.05em',
      border:'2px solid #4ed1d5',background:'#0c2638',boxShadow:'0 8px 24px #000b',pointerEvents:'auto'});
     document.body.appendChild(liveTarget);
    }
    ghost=document.createElement('div');ghost.className='xen-quick-pointer-ghost';
    ghost.setAttribute('aria-hidden','true');document.body.appendChild(ghost);
    document.documentElement.classList.add('xen-quick-pointer-dragging');
    try{document.documentElement.setPointerCapture(session.pointerId)}catch{}
    frame=requestAnimationFrame(tick);
   }
   e.preventDefault();e.stopImmediatePropagation();update(e);
  },{capture:true,passive:false});
  window.addEventListener('pointerup',e=>{
   if(!session||e.pointerId!==session.pointerId)return;
   if(!session.dragging){session=null;return}
   e.preventDefault();e.stopImmediatePropagation();
   try{
    update(e);
    if(session.sessionTarget){
     window.dispatchEvent(new CustomEvent('xensonar:meta-session-order-drop',{detail:{visibleIds:session.sessionTarget.visibleIds,draggedId:session.sessionTarget.draggedId,targetId:session.sessionTarget.targetId,operation:session.sessionTarget.operation}}));
    }
    else if(session.libraryTarget){
     window.dispatchEvent(new CustomEvent('xensonar:meta-library-order-drop',{detail:{kind:session.libraryTarget.kind,visibleIds:session.libraryTarget.visibleIds,draggedId:session.libraryTarget.draggedId,targetId:session.libraryTarget.targetId,operation:session.libraryTarget.operation}}));
    }
    else if(session.trashTarget){
     window.dispatchEvent(new CustomEvent('xensonar:meta-trash-drop',{detail:{source:{...session.entry}}}));
    }
    else if(session.fillTarget){
     if(session.fillTarget.valid)window.dispatchEvent(new CustomEvent('xensonar:meta-fill-drop',{detail:{source:{...session.entry},role:session.fillTarget.role}}));
     else window.dispatchEvent(new CustomEvent('xensonar:meta-drag-note',{detail:{message:'Wrong Fill column · source unchanged.'}}));
    }
    else if(session.metaTarget)__xenMetaCommitDrop(session);
    else if(session.entry.kind!=='session'&&inDock(e)){if(session.modal.dataset.xenHeaderMenu==='meta')__xenMetaQuickRackCommit(session);else __XenQuick.add(session.entry);}
    else if(zoneAt(e)&&session.sorting)hooks()?.drop?.(libraryEvent(e));
    else if(session.modal.dataset.xenHeaderMenu==='meta')window.dispatchEvent(new CustomEvent('xensonar:meta-drag-note',{detail:{message:session.entry.kind==='session'?'Session order unchanged · drop inside Saved Sessions.':'Not placed · source unchanged. Drag onto the Live Quick Rack on the right, or the Session board.'}}));
   }finally{clear()}
  },true);
  // Captured drags may dispatch click at HTML or the common modal ancestor.
  // Consume that one click regardless of target; next real press resets it.
  window.addEventListener('click',e=>{
   if(!suppressClick)return;
   suppressClick=false;e.preventDefault();e.stopImmediatePropagation();
  },true);
  window.addEventListener('pointercancel',e=>{if(e.pointerId===session?.pointerId)clear()},true);
  window.addEventListener('lostpointercapture',e=>{if(e.pointerId===session?.pointerId&&session.dragging)clear()},true);
  window.addEventListener('blur',clear);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear()});
  window.addEventListener('keydown',e=>{
   if(e.key==='Escape'&&session?.dragging){e.preventDefault();e.stopImmediatePropagation();clear()}
   else if(session&&['ArrowLeft','ArrowRight'].includes(e.key))clear();
  },true);
  return Object.freeze({clear});
 })();
 // The pointer transaction consumes drag-generated clicks before this listener.
 window.addEventListener('click',e=>{
  const row=e.target?.closest?.('[data-xen-quick-kind][data-xen-quick-id]');
  if(!e.defaultPrevented&&row?.closest('[data-xen-header-menu]')&&!row.closest('[data-xen-header-menu="meta"]'))__XenQuick.signal();
 },true);
 const placeQuickHelp=(e,inside=inDock(e))=>{
  const hint=document.querySelector('.xen-quick-hover-info');if(!hint)return;
  if(e.pointerType==='touch'||!__XenQuick.snapshot().active||!inside){hint.style.display='none';return}
  hint.style.display='block';
  const w=hint.offsetWidth,h=hint.offsetHeight;
  hint.style.left=Math.max(8,Math.min(e.clientX+14,window.innerWidth-w-8))+'px';
  hint.style.top=Math.max(8,Math.min(e.clientY-h-12,window.innerHeight-h-8))+'px';
 };
 window.addEventListener('pointermove',e=>placeQuickHelp(e),true);
 window.addEventListener('blur',()=>{const hint=document.querySelector('.xen-quick-hover-info');if(hint)hint.style.display='none'});
 window.addEventListener('keydown',e=>{if(e.target?.closest?.('.xen-quick-save-dialog,[data-xen-header-menu="meta"],[data-xen-preset-overlay]'))return;if(!__XenQuick.snapshot().active)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();__XenQuick.dismiss();return}if(!['ArrowLeft','ArrowRight'].includes(e.key)||e.altKey||e.ctrlKey||e.metaKey||e.target?.closest('input,select,textarea,[contenteditable="true"],[role="slider"],.xen-quick-session-nav'))return;e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)__XenQuick.cycle(e.key==='ArrowRight'?1:-1)},true);
}


// One canonical switch per column; Raster bypasses the RFL impulse timing.
const __QuickMuteLanes=Object.freeze({grid:['rootFollowImpulsRasterMuted','Raster',true],material:['materialLoopActive','Material Track'],rootFollow:['rootFollowLoopActive','Root Follow Loop'],drum:['drumActive','Drums'],bass:['bassActive','Bass']});
function __QuickMuteRow({params,update,showIcons=false,titleMode=false}){
 return u.jsx('div',{className:'xen-quick-mutes','aria-label':'Quick track mute',children:Object.entries(__QuickMuteLanes).map(([kind,[field,label,inverted]])=>{
  const tileLane=!!__XenQuickSelectableLanes[kind],tileView=tileLane?__xenQuickSelectionView(params,kind):null;
  const muted=tileLane?!tileView.busOn:(inverted ? !!params[field] : !params[field]);
  return u.jsx('button',{type:'button','data-quick-mute':kind,'aria-label':label+' mute','aria-pressed':muted,title:kind==='grid' ? (muted?'Enable grid':'Bypass grid · play RFL continuously') : (muted?'Unmute ':'Mute ')+label,className:muted?'is-muted':'',onClick:()=>{__XenQuick.cancelActivation();if(tileLane)update(__xenQuickSelectionPatch(params,kind,{empty:tileView.empty,busOn:!tileView.busOn}));else update({[field]:inverted ? !muted : muted})},'aria-description':kind==='grid'?'Bypasses the RFL impulse grid; saved pattern and timbre are preserved.':undefined,children:showIcons?u.jsx('span',{className:'xen-quick-mute-icon'+(titleMode?' is-monochrome':''),'aria-hidden':true,children:titleMode?__xenMuteTextIcon[kind]:__XenQuick.icons[kind]}):null},kind);
 })});
}

function __QuickHotkey({kind,id,params,hotkeys,display='symbol'}) {
 const index=hotkeys[kind]?.indexOf(id)??-1,key=__XenLoopHotkeys[index];
 if(!key)return null;
 const mode=params.resonanceHotkeyMode??'keyboard-extension',active=kind==='rootFollow'?mode==='root-follow':mode==='material';
 return u.jsx('span',{className:(display==='title'?'xen-quick-title-hotkey':'xen-quick-hotkey')+(active?' is-active':''),'aria-label':'Hotkey '+key+(active?' active':' switch mode to use'),children:key});
}
