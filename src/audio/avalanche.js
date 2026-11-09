// One control owner, no rhythm clock. Native renderers retain all note timing.
const __XenAvalanche=(()=>{
 const hostStates=new WeakMap();
 const lanes={klaviatur:{},wellenstart:{}},contexts=new WeakMap(),liveContexts=new Set(),listeners=new Set();
 let gesture=null,config=null,contextSerial=0;
 let hoverFrame=null,hoverConfig=null;
 const hoverLatest=new Map();

 const clamp=x=>Math.max(0,Math.min(1,x));
 const lane=options=>{const key=options?.holdSession?.key;return key?.startsWith('klaviatur:')?'klaviatur':key?.startsWith('wellenstart:')?'wellenstart':null;};
 const active=(e,name)=>Object.values(e?.nexusRefs?.__f35640HoldState?.current?.gestures?.[name]??{}).filter(g=>g.active);
 const ENTRY_GUARD_PX=3;
 const entrySpan=height=>Math.min(64,Math.max(36,height*.10));
 const smoothstep=t=>t*t*(3-2*t);
 function resetEntry(l){l.entryPhase='entry';l.entrySigned=0;l.eqDepth=0;l.morph=null;l.eqTouched=false;}
 // Pure per-lane mapper: once full depth is reached, all return travel belongs
 // to the existing A/B morph, never to a second neutral-entry ramp.
 function mapEntry(l,start,pointerY){
  if(l.entryPhase==='morph'){
   l.eqDepth=1;l.morph=clamp(start.morphAnchor+(start.morphAnchorY-pointerY)/start.height);return;
  }
  const raw=start.pointerY-pointerY;
  const adjusted=Math.sign(raw)*Math.max(0,Math.abs(raw)-ENTRY_GUARD_PX);
  const signed=start.signed+adjusted/start.span;
  if(Math.abs(signed)<1){
   l.entrySigned=signed;l.eqDepth=smoothstep(Math.abs(signed));l.morph=start.entryMorph;return;
  }
  const extra=Math.sign(signed)*(Math.abs(signed)-1)*start.span;
  l.entryPhase='morph';l.entrySigned=Math.sign(signed);l.eqDepth=1;
  l.morph=clamp(start.entryMorph+extra/start.height);
  start.morphAnchorY=pointerY;start.morphAnchor=l.morph;
 }
 const signal=()=>{for(const fn of listeners)fn()};
 function observe(key,gesture,ctx){const name=lane({holdSession:{key}}),l=lanes[name];if(!l)return;
  l.held??=new Map();if(!l.held.size){l.u=null;resetEntry(l);updateDefinition(name);}l.held.set(key,gesture.startedAtMs);
 }
 function release(key){const name=lane({holdSession:{key}}),l=lanes[name];if(!l)return;l.held?.delete(key);if(!l.held?.size){hoverLatest.delete(name);detachLane(name);l.u=null;resetEntry(l);updateDefinition(name);l.marker?.remove();l.marker=null;}}
 function assign(name,key,label){
  if(!lanes[name])return;
  lanes[name].assignment={sourceKey:key,label,definition:__XenEQ.clean(__XenEQ.get(key))};resetEntry(lanes[name]);updateDefinition(name);__XenEQ.bindings?.(capture());signal();
 }
 function remove(name){if(!lanes[name])return;lanes[name].assignment=null;resetEntry(lanes[name]);updateDefinition(name);__XenEQ.bindings?.(capture());signal();}
 function assignment(name){return lanes[name]?.assignment??null;}
 function capture(){const out={};for(const name of Object.keys(lanes))if(lanes[name].assignment)out[name]=JSON.parse(JSON.stringify(lanes[name].assignment));return out;}
 function restore(data,stopResident=true){cancel();if(stopResident&&typeof __XenHoldResident!=='undefined')__XenHoldResident.clear();for(const name of Object.keys(lanes)){const a=data?.[name];lanes[name].assignment=a&&typeof a.sourceKey==='string'?{sourceKey:a.sourceKey,label:String(a.label??'EQ'),definition:__XenEQ.clean(a.definition)}:null;resetEntry(lanes[name]);updateDefinition(name)}signal();}
 function context(ctx){let state=contexts.get(ctx);if(state)return state;
  state={ctx,id:++contextSerial,lanes:{klaviatur:{routes:new Map(),ownedInputs:new WeakSet()},wellenstart:{routes:new Map(),ownedInputs:new WeakSet()}}};contexts.set(ctx,state);liveContexts.add(state);
  const close=()=>{if(ctx.state!=='closed')return;liveContexts.delete(state);disposeHosts(ctx);for(const name of Object.keys(lanes))__XenEQ.dropRuntime(eqKey(state,name));for(const l of Object.values(state.lanes))for(const d of l.routes.values())d.dispose();ctx.removeEventListener?.('statechange',close)};
  ctx.addEventListener?.('statechange',close);return state;
 }
 function eqKey(state,name){return 'avalanche:'+state.id+':'+name;}
 // The editor owns the current visible EQ curves. Keep a captured snapshot only
 // for restored assignments whose original source no longer exists.
 function sourceDefinition(name){const a=lanes[name].assignment;if(!a)return null;
  return __XenEQ.snapshot?.()?.[a.sourceKey]??a.definition;
 }
 function definition(name){const l=lanes[name],cfg=sourceDefinition(name);
  return cfg?{...cfg,morph:l.morph??cfg.morph,holdDepth:l.eqDepth??0}:{...__XenEQ.neutral(),enabled:false,holdDepth:0};
 }
 // Two zero lines must be an exact bypass, at ALL morph positions. Also catch
 // cancellation of opposed curves, not merely separately flat A/B profiles.
 function neutralEQ(cfg){if(!cfg.enabled||(cfg.holdDepth??1)<=0)return true;
  const a=cfg.a,b=cfg.b,m=Math.max(0,Math.min(1,cfg.morph??0));
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;
  for(let i=0;i<a.length;i++)if(Math.abs(a[i]*(1-m)+b[i]*m)>1e-10)return false;
  return true;
 }
 function wantsEQ(name,cfg=definition(name)){return !!lanes[name].assignment&&lanes[name].eqTouched===true&&!neutralEQ(cfg);}
 function setRouteEQ(state,name,path,enabled){
  if(enabled&&!path.eq){ensureEQ(state,name,path,false);return;}
  if(!path.eq)return;
  if(path.eqEnabled===enabled)return;
  path.eqEnabled=enabled;
  const now=state.ctx.currentTime;
  path.dry.gain.setTargetAtTime(enabled?0:1,now,.012);
  path.wet.gain.setTargetAtTime(enabled?1:0,now,.012);
 }
 function updateDefinition(name){const cfg=definition(name),enabled=wantsEQ(name,cfg);
  for(const state of liveContexts){__XenEQ.runtime(eqKey(state,name),cfg);
   for(const path of state.lanes[name].routes.values())setRouteEQ(state,name,path,enabled);
  }
 }
 function updateRouting(name){const enabled=wantsEQ(name);for(const state of liveContexts)
  for(const path of state.lanes[name].routes.values())setRouteEQ(state,name,path,enabled);
 }
 function ensureEQ(state,name,path,initial){
  if(path.eq)return;const ctx=state.ctx;
  path.eq=__XenEQ.create(ctx,eqKey(state,name));path.wet=ctx.createGain();path.wet.gain.value=initial?1:0;path.eqEnabled=true;
  path.input.connect(path.eq.input);path.eq.output.connect(path.wet);path.wet.connect(path.destination);
  if(initial)path.dry.gain.value=0;
  else{path.dry.gain.setTargetAtTime(0,ctx.currentTime,.012);path.wet.gain.setTargetAtTime(1,ctx.currentTime,.012);}
 }
 function route(ctx,name,destination){if(!name||!destination)return destination;const state=context(ctx),l=state.lanes[name];if(!l||l.ownedInputs.has(destination))return destination;
  if(l.routes.has(destination))return l.routes.get(destination).input;
  if(l.routes.size>=16){l.limitReached=true;return destination;}
  const key=eqKey(state,name);__XenEQ.runtime(key,definition(name));
  const input=ctx.createGain(),dry=ctx.createGain();input.connect(dry);dry.connect(destination);
  const path={input,dry,destination,eq:null,wet:null,dispose(){path.eq?.dispose();for(const node of [input,dry,path.wet])try{node?.disconnect()}catch{}}};
  l.routes.set(destination,path);l.ownedInputs.add(input);if(wantsEQ(name))ensureEQ(state,name,path,true);return input;
 }
 async function prepareHosts(ctx,main,init,mainDestination,spaceDestination,isCancelled=()=>false){
  const routes={};hostStates.set(ctx,routes);
  __XenHoldMod.prepare(ctx,init);
  try{for(const name of Object.keys(lanes)){
   if(isCancelled())throw Error('Hold initialization cancelled');
   const host=new r9(ctx,route(ctx,name,mainDestination),1);host.diagnosticOwner='hold-'+name;host.onFault=error=>YI(ctx,main,error,'hold-worklet-fault');
   const state=Object.create(main);state.host=host;state.encoder=new xMe();state.waveEncoder=new __wave39Encoder();
   Object.defineProperty(state,'token',{get:()=>main.token,set:v=>{main.token=v;}});
   routes[name]=state;
   try{if(!await host.createNode(init))throw Error('Hold host not ready');if(isCancelled())throw Error('Hold initialization cancelled');
    host.waveNoiseBuffer=main.host?.waveNoiseBuffer;host.waveMainDestination=route(ctx,name,spaceDestination);
    host.node.connect(host.waveMainDestination,8,0);host.unmute();
   }catch(error){host.destroy();delete routes[name];throw error;}
  }}catch(error){for(const state of Object.values(routes))state.host.destroy();hostStates.delete(ctx);throw error;}
 }
 function hostState(ctx,holdSession){const name=lane({holdSession});return name?hostStates.get(ctx)?.[name]??rg.get(ctx):rg.get(ctx);}
 function admit(host,units,voices){
  if(host.profile!==1)return true;
  const main=rg.get(host.context)?.host;if(!main)return true;
  const hosts=[main,...Object.values(hostStates.get(host.context)??{}).map(s=>s.host)];
  if(hosts.length===1||!hosts.includes(host))return true;
  const quantum=Math.floor(host.currentContextFrame()/128);
  let used=0,count=0,builds=0;for(const h of hosts){used+=h.reservations.usedUnits;count+=h.reservations.usedVoices;if(h.admissionQuantum===quantum)builds+=h.quantumBuilds;}
  return used+units<=main.reservations.unitLimit&&count+voices<=main.reservations.voiceLimit&&builds<EMe;
 }
 function disposeHosts(ctx){const states=hostStates.get(ctx);if(states)for(const s of Object.values(states)){u9(s);s.host.destroy();}hostStates.delete(ctx);__XenHoldMod.dispose(ctx);}
 function targets(ctx,name,values){return name?values.map(d=>route(ctx,name,d)):values;}
 // Stable audio-owner lookup for the control plane. Never infer hold ownership from a cached EQ assignment.
 function held(name){return !!lanes[name]?.held?.size;}
 function isInput(ctx,node){const state=contexts.get(ctx);return !!state&&Object.values(state.lanes).some(l=>l.ownedInputs.has(node));}
 function options(opts,ctx){const name=lane(opts),l=lanes[name];return name&&l?.u!=null?{...opts,holdTimbreX:l.u*l.width}:opts;}
 function timbreX(opts,fallback){const ownerName=lane(opts),fallbackName=opts?.holdTimbreLane;const name=ownerName||(lanes[fallbackName]?.held?.size?fallbackName:null),l=lanes[name];if(l&&l.u==null&&ownerName&&l.held?.has(opts.holdSession.key)){l.width=typeof vr==='number'?vr:config?.gameWidth??1000;l.u=clamp(fallback/l.width);}return l?.u!=null?l.u*l.width:fallback;}
 function marker(name,e){
  const g=gesture;if(!g?.stage?.parentElement||typeof document==='undefined')return;
  const parent=g.stage.parentElement,existing=parent.querySelector?.('[data-avalanche-marker="'+name+'"]');
  const node=existing??document.createElement('div');
  if(!existing){node.dataset.avalancheMarker=name;node.style.cssText='position:absolute;pointer-events:none;width:12px;height:12px;border:2px solid #e4b7ff;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 0 9px #bd72ef;z-index:9';parent.appendChild(node);lanes[name].marker=node;}
  const held=active(e,name),y=held.length&&Number.isFinite(held[0].targetHz)?e.yFromFreq(held[0].targetHz):e.nexusRefs.current.cursorY;
  node.style.left=(lanes[name].u*100)+'%';node.style.top=(y/e.gameHeight*100)+'%';
 }

 // Hold-X HOVER03: X is a continuous coordinate while a Hold is active.
 // No mouse button and NO EQ work, no Root-Follow capture. All PCM/renderer
 // demand still flows through existing latest-only HoldMod, never mouse rate.
 function flushHover(){
  hoverFrame=null;
  const updates=[...hoverLatest];hoverLatest.clear();
  for(const [name,[u,width]] of updates){
   if(hoverConfig&&active(hoverConfig,name).length)
    lanes[name].changed?.(u,width);
  }
 }
 function hoverX(x,e){
  if(gesture||e?.nexusActive===false||e?.audioCtx?.state!=='running'||
     !e?.nexusParamsRef?.current?.waveTimbreGradientEnabled||
     !Number.isFinite(x)||!(e?.gameWidth>0))return false;
  const names=Object.keys(lanes).filter(name=>active(e,name).length);
  if(!names.length)return false;
  hoverConfig=e;
  const u=clamp(x/e.gameWidth);
  for(const name of names){
   const l=lanes[name];
   l.width=e.gameWidth;
   if(l.u!==null&&Number.isFinite(l.u)&&Math.abs(l.u-u)<1e-5)continue;
   l.u=u;
   hoverLatest.set(name,[u,l.width]);
  }
  if(hoverLatest.size&&hoverFrame===null)hoverFrame=requestAnimationFrame(flushHover);
  return false;
 }
 function begin(event,e){
  if(event.button!==0||e.nexusActive===false||!e.audioCtx||e.audioCtx.state!=='running')return false;
  const names=Object.keys(lanes).filter(n=>active(e,n).length);if(!names.length)return false;
  end();config=e;const stage=event.currentTarget,rect=stage.getBoundingClientRect();if(!(rect.width>0&&rect.height>0))return false;
  gesture={names,stage,x:event.clientX,y:event.clientY,width:rect.width,height:rect.height,starts:{},seen:new WeakSet(),pendingTimbres:new Map(),frame:null};
  for(const name of names){const l=lanes[name];l.u??=clamp(e.nexusRefs.current.cursorX/e.gameWidth);l.width=e.gameWidth;l.morph??=definition(name).morph??0;gesture.starts[name]={u:l.u,morph:l.morph,pointerY:event.clientY,height:rect.height,span:entrySpan(rect.height),signed:l.entrySigned??0,entryMorph:l.entryPhase==='entry'?(l.morph??definition(name).morph):null,morphAnchorY:event.clientY,morphAnchor:l.morph};}
  window.addEventListener('mouseup',end);window.addEventListener('pointercancel',abortDrag);window.addEventListener('blur',cancel);window.addEventListener('mousemove',outside);
  return true;
 }
 function outside(event){if(!gesture||event.target===gesture.stage||gesture.stage.contains?.(event.target))return;move(event,config);}
 function move(event,e=config){
  if(!gesture)return false;sync();if(!gesture)return false;
  if(event.buttons!==undefined&&!(event.buttons&1)){end();return true;}
  if(gesture.seen.has(event))return true;gesture.seen.add(event);
  const dx=(event.clientX-gesture.x)/gesture.width;
  for(const name of gesture.names){const l=lanes[name],start=gesture.starts[name],u=clamp(start.u+dx);
   const timbreChanged=l.u!==u,oldMorph=l.morph,oldDepth=l.eqDepth??0;
   if(l.assignment)mapEntry(l,start,event.clientY);
   const eqChanged=!!l.assignment&&(oldMorph!==l.morph||oldDepth!==l.eqDepth);
   // The 3px click guard never activates the EQ. Once touched, pointer
   // direction may return through neutral BEFORE the latch, not after it.
   const engage=!!l.assignment&&!l.eqTouched&&l.eqDepth>0;
   if(!timbreChanged&&!eqChanged&&!engage)continue;l.u=u;
   if(engage){
    l.eqTouched=true;
    const key=eqKey(context(e.audioCtx),name);
    __XenEQ.startGesture(key,'morph');l.eqGesture=key;
    updateDefinition(name);
   }else if(eqChanged&&l.eqTouched){
    const state=context(e.audioCtx),key=eqKey(state,name);
    // A second pointer drag during the SAME held note is still a morph-hot
    // gesture. Preserve the optimizer's latest-only/low-priority discipline.
    if(!l.eqGesture){__XenEQ.startGesture(key,'morph');l.eqGesture=key;}
    __XenEQ.runtimeHoldMorph(key,l.morph,l.eqDepth);updateRouting(name);
   }
   marker(name,e);
   // Pointer rate never drives native-program rebuild rate. Keep one latest X
   // per lane/frame; the existing preparation Worker owns the serial render job.
   if(timbreChanged){gesture.pendingTimbres.set(name,[u,l.width]);if(gesture.frame===null)gesture.frame=requestAnimationFrame(flushTimbre);}
  }
  return true;
 }
 function flushTimbre(){if(!gesture)return;if(gesture.frame!==null)cancelAnimationFrame(gesture.frame);gesture.frame=null;
  const batch=[...gesture.pendingTimbres];gesture.pendingTimbres.clear();for(const [name,[u,width]] of batch)if(active(config,name).length)lanes[name].changed?.(u,width);
 }
 function detachLane(name){
  if(!gesture?.names.includes(name))return;
  if(gesture.names.length===1){end(false);return;}
  const l=lanes[name];
  if(l.eqGesture){__XenEQ.endGesture(l.eqGesture);l.eqGesture=null;}
  gesture.pendingTimbres.delete(name);
  gesture.names=gesture.names.filter(n=>n!==name);
 }
 function end(flush=true){if(!gesture)return;if(flush!==false)flushTimbre();else if(gesture.frame!==null)cancelAnimationFrame(gesture.frame);
  for(const name of gesture.names){const l=lanes[name];if(l.eqGesture){__XenEQ.endGesture(l.eqGesture);l.eqGesture=null;}}
  gesture=null;window.removeEventListener('mouseup',end);window.removeEventListener('pointercancel',abortDrag);window.removeEventListener('blur',cancel);window.removeEventListener('mousemove',outside);
 }
 function abortDrag(){end(false);}
 function sync(){if(!config)return;for(const name of Object.keys(lanes))if(!active(config,name).length){if(gesture?.names.includes(name))detachLane(name);hoverLatest.delete(name);const l=lanes[name],wasEQ=l.eqTouched;l.u=null;resetEntry(l);if(wasEQ)updateDefinition(name);l.marker?.remove();l.marker=null;}}
 function cancel(){end(false);hoverLatest.clear();if(hoverFrame!==null){cancelAnimationFrame(hoverFrame);hoverFrame=null;}for(const [name,l] of Object.entries(lanes)){const wasEQ=l.eqTouched;l.held?.clear();l.u=null;resetEntry(l);if(wasEQ)updateDefinition(name);l.marker?.remove();l.marker=null;}}
 if(__XenEQ.bindings)restore(__XenEQ.bindings(),false);
 // Live editor resets must immediately update an already assigned Hold. Do
 // not turn the captured definition into a stale hidden second EQ preset.
 if(__XenEQ.subscribe)__XenEQ.subscribe(()=>{
  const all=__XenEQ.snapshot?.()??{};
  for(const name of Object.keys(lanes)){
   const l=lanes[name],a=l.assignment;
   if(!a)continue;
   const source=all[a.sourceKey];
   if(source&&l.lastEditorCfg!==source){l.lastEditorCfg=source;updateDefinition(name);}
  }
 });
 return {observe,release,diagnostics:()=>({dragging:!!gesture,contexts:[...liveContexts].map(s=>({id:s.id,routes:Object.fromEntries(Object.entries(s.lanes).map(([name,l])=>[name,{routes:l.routes.size,devices:[...l.routes.values()].filter(p=>p.eq).length,limitReached:!!l.limitReached}]))}))}),admit,prepareHosts,hostState,disposeHosts,lane,assign,remove,assignment,capture,restore,route,targets,held,isInput,options,timbreX,begin,move,hoverX,end,sync,cancel,
  dragging:()=>!!gesture,value:name=>lanes[name]?.u??null,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),
  onTimbre:(name,fn)=>{lanes[name].changed=fn;}};
})();
