/* The mini editor is G$, the existing MWCM component. Only its presentation,
 * fixed brush radius and frequency-specific canvas painter are specialized. */
// EQ-P5: acoustic geometry, not a fitted/visually smoothed drawing.
// White markers sample exactly the same response array as the white curve.
// The function does not plan, optimize, or allocate new DSP filters.
function __xenEqProfileAt(profile,x){
 const xs=profile.x,dbs=profile.db;
 if(x<=xs[0])return dbs[0];
 const last=xs.length-1;if(x>=xs[last])return dbs[last];
 let lo=0,hi=last;while(hi-lo>1){const m=(lo+hi)>>1;if(xs[m]<=x)lo=m;else hi=m}
 const t=(x-xs[lo])/(xs[hi]-xs[lo]);return dbs[lo]*(1-t)+dbs[hi]*t;
}
function __xenEqBandVisuals(eqView,drawnCurve){
 const {cfg,plan,profile}=eqView;
 if(cfg.mode==='raster')return (plan.anchors||[]).map(band=>({x:band.x,actual:band.actual,goal:band.goal}));
 const top=Math.min(20000,(eqView.sampleRate||48000)*.45),ratio=Math.log(top/20);
 const sample=(data,x)=>{const pos=x*(data.length-1),i=Math.floor(pos),t=pos-i;
  return data[i]*(1-t)+data[Math.min(i+1,data.length-1)]*t;
 };
 return (plan.filters||[]).map((filter,index)=>({filter,index})).filter(({filter})=>filter.type==='peaking'&&Math.abs(filter.gain)>.1).map(({filter,index})=>{
  const x=Math.max(0,Math.min(1,Math.log(filter.frequency/20)/ratio));
  return {x,index,frequency:filter.frequency,q:filter.q,gain:filter.gain,
   actual:__xenEqProfileAt(profile,x),goal:(()=>{const v=sample(drawnCurve,x);return v>=0?v*cfg.high:-v*cfg.low})()};
 });
}
/* One screen-space hit-test for *both* hover and drag. The pointer is
 * measured in CSS pixels, the curve in canvas pixels, so the 11px target
 * stays stable at high-DPI and different panel widths. */
function __xenEqHitMarker(view,curve,canvas,clientX,clientY){
 const rect=canvas.getBoundingClientRect(),pos=PF(canvas),cfg=view.cfg;
 const mx=(clientX-rect.left)*canvas.width/rect.width,my=(clientY-rect.top)*canvas.height/rect.height;
 let picked=null,nearest=11;
 for(const band of __xenEqBandVisuals(view,curve)){
  const goal=band.goal>=0?(cfg.high?band.goal/cfg.high:0):band.goal/-cfg.low;
  const dx=(mx-(pos.padX+band.x*pos.usableW))*rect.width/canvas.width;
  const dy=(my-(pos.midY-goal*pos.ampH))*rect.height/canvas.height;
  const distance=Math.hypot(dx,dy);
  if(distance<=nearest){picked=band;nearest=distance}
 }
 return picked;
}
function __xenEqPaint({canvas,field,brushPreview,eqView}) {
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const {padX,padY,usableW,usableH,midY,ampH}=PF(canvas),cfg=eqView.cfg;
 const x=i=>padX+i*usableW,y=v=>midY-v*ampH;
 const curve=gc(field).resolved,markers=__xenEqBandVisuals(eqView,curve);
 ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#071217';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.save();ctx.beginPath();ctx.rect(padX,padY,usableW,usableH);ctx.clip();
 // Raster: each visible center is a real acoustic anchor. Adaptive: freely placed filters.
 ctx.beginPath();for(let i=0;i<=cfg.bands;i++){ctx.moveTo(x(i/cfg.bands),padY);ctx.lineTo(x(i/cfg.bands),padY+usableH)}ctx.strokeStyle=cfg.mode==='raster'?'#7db6c51c':'#7db6c50e';ctx.stroke();
 ctx.beginPath();for(const band of markers){ctx.moveTo(x(band.x),padY);ctx.lineTo(x(band.x),padY+usableH)}ctx.strokeStyle=cfg.mode==='raster'?'#79dcd982':'#79dcd975';ctx.stroke();
 ctx.strokeStyle='#c6df8066';ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(padX,midY);ctx.lineTo(padX+usableW,midY);ctx.stroke();ctx.setLineDash([]);
 const effective=eqView.profile.db.map(db=>db>=0?(cfg.high>0?db/cfg.high:0):db/-cfg.low);
 ctx.beginPath();ctx.moveTo(x(0),midY);effective.forEach((v,i)=>ctx.lineTo(x(eqView.profile.x[i]),y(v)));ctx.lineTo(x(1),midY);ctx.closePath();ctx.fillStyle='#d9f7e62b';ctx.fill();
 ctx.beginPath();effective.forEach((v,i)=>i?ctx.lineTo(x(eqView.profile.x[i]),y(v)):ctx.moveTo(x(0),y(v)));ctx.lineWidth=1.6;ctx.strokeStyle='#e3ffe9';ctx.stroke();
 // Batch all symbols by stroke style: one canvas fill/stroke per layer,
 // not three canvas submissions per filter and per editor.
 ctx.beginPath();
 for(const band of markers){
  const goal=band.goal>=0?(cfg.high?band.goal/cfg.high:0):band.goal/-cfg.low;
  const px=x(band.x),py=y(goal);
  ctx.moveTo(px+3.2,py);ctx.arc(px,py,3.2,0,Math.PI*2);
 }
 ctx.fillStyle='#113234';ctx.fill();ctx.lineWidth=1.25;ctx.strokeStyle='#67e5df';ctx.stroke();
 ctx.beginPath();
 for(const band of markers){
  const actual=band.actual>=0?(cfg.high?band.actual/cfg.high:0):band.actual/-cfg.low;
  ctx.moveTo(x(band.x)-3,y(actual));ctx.lineTo(x(band.x)+3,y(actual));
 }
 ctx.strokeStyle='#e3ffe9';ctx.lineWidth=1.8;ctx.stroke();
 ctx.beginPath();curve.forEach((v,i)=>i?ctx.lineTo(x(i/(curve.length-1)),y(v)):ctx.moveTo(x(0),y(v)));ctx.lineWidth=2;ctx.strokeStyle=eqView.color;ctx.stroke();
 if(brushPreview){ctx.beginPath();ctx.setLineDash([4,4]);ctx.arc(x(brushPreview.ratio),y(brushPreview.value),brushPreview.radiusPx,0,Math.PI*2);ctx.strokeStyle=eqView.color+'88';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([])}
 ctx.restore();
 for(const [ratio,value,dir] of [[0,field.edgeHandles.left,1],[1,field.edgeHandles.right,-1]]){ctx.beginPath();ctx.moveTo(x(ratio)+dir*7,y(value));ctx.lineTo(x(ratio),y(value)-5);ctx.lineTo(x(ratio),y(value)+5);ctx.closePath();ctx.fillStyle=eqView.color;ctx.fill()}
 ctx.font='9px sans-serif';ctx.fillStyle='#9aafba';ctx.textAlign='left';ctx.fillText('20',padX,canvas.height-3);ctx.textAlign='center';ctx.fillText('630 Hz',x(.5),canvas.height-3);ctx.textAlign='right';ctx.fillText('20k',x(1),canvas.height-3);ctx.fillText('+'+cfg.high+' dB',canvas.width-3,11);ctx.fillText(cfg.low+' dB',canvas.width-3,canvas.height-16);ctx.textAlign='left';ctx.fillText('0',2,midY+3);
}
/* Morph slider ownership: the native thumb is immediate. Merely pressing its
 * thumb MUST NOT invalidate a resolved acoustic fit or enter the live-morph
 * preview path. A gesture is promoted only by a real numeric value change;
 * intermediate values coalesce into one update per animation frame. */
function __XenEQMorph({sourceKey,value}){
 const input=P.useRef(null),pending=P.useRef(null),frame=P.useRef(null),gesture=P.useRef(false);
 const flush=()=>{if(frame.current!==null){cancelAnimationFrame(frame.current);frame.current=null}
  if(pending.current!==null){const next=pending.current;pending.current=null;__XenEQ.set(sourceKey,{morph:next})}};
 const begin=()=>{if(!gesture.current){gesture.current=true;__XenEQ.startGesture(sourceKey,'morph')}};
 const finish=()=>{flush();if(gesture.current){gesture.current=false;__XenEQ.endGesture(sourceKey)}};
 P.useLayoutEffect(()=>{if(!gesture.current&&pending.current===null&&input.current)input.current.value=String(value)},[value,sourceKey]);
 P.useEffect(()=>()=>{if(frame.current!==null)cancelAnimationFrame(frame.current);pending.current=null;
  if(gesture.current){gesture.current=false;__XenEQ.endGesture(sourceKey)}},[sourceKey]);
 const update=event=>{
  const next=Number(event.currentTarget.value),last=pending.current===null?__XenEQ.get(sourceKey).morph:pending.current;
  if(!Number.isFinite(next)||next===last)return;
  begin();pending.current=next;
  if(frame.current===null)frame.current=requestAnimationFrame(()=>{frame.current=null;flush()});
 };
 return u.jsx('input',{ref:input,type:'range',min:0,max:1,step:'any',defaultValue:value,'aria-label':'EQ A B Morph',
  // Capturing the pointer is not an audio edit; native input events own values.
  onPointerDown:event=>event.currentTarget.setPointerCapture?.(event.pointerId),
  onPointerUp:finish,onPointerCancel:finish,onLostPointerCapture:finish,onBlur:finish,
  onKeyUp:finish,onChange:update
 });
}
// One browser-wide EQ drawing tool preference; never saved with a project.
const __xenEqToolPreference=(()=>{
 // P9: reset legacy persisted Morph once; thereafter explicit choices persist globally.
 const key='xensonar.ui.eq.tool.v2',listeners=new Set();
 let mode='draw';
 // Import an explicit preference from the independently developed Persistence
 // branch only when this P10 browser has no v2 choice yet. The old key is
 // thereafter read-only; v2 remains the single authoritative owner.
 try{
  const chosen=localStorage.getItem(key);
  if(chosen==='draw'||chosen==='morph')mode=chosen;
  else{
   const old=localStorage.getItem('xensonar.quickrack.eq.tool-preference.v1');
   if(old==='draw'||old==='morph'){
    mode=old;
    try{localStorage.setItem(key,old)}catch{}
   }
  }
 }catch{}
 if(typeof window!=='undefined'&&window.addEventListener)window.addEventListener('storage',event=>{
  if(event.key!==key)return;
  const next=event.newValue==='morph'?'morph':'draw';
  if(next!==mode){mode=next;for(const listener of listeners)listener()}
 });
 return {get:()=>mode,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},set:next=>{
  if(next!=='draw'&&next!=='morph')return;
  if(mode===next)return;
  mode=next;try{localStorage.setItem(key,mode)}catch{}
  for(const listener of listeners)listener();
 }};
})();
// EQ-FLOAT01: Drag window header only; never rerender the EQ/audio plan per pointer move.
// Locations live only for the current browser page, scoped by the EQ's stable source key.
const __xenEQFloatLocations=new Map();
function __xenEQFloatClamp(panel,left,top){
 const rect=panel.getBoundingClientRect();
 const maxLeft=Math.max(8,window.innerWidth-rect.width-8);
 const maxTop=Math.max(8,window.innerHeight-rect.height-8);
 return {left:Math.max(8,Math.min(maxLeft,left)),top:Math.max(8,Math.min(maxTop,top))};
}
function __xenEQFloatApply(panel,position){
 const next=__xenEQFloatClamp(panel,position.left,position.top);
 panel.style.left=next.left+'px';panel.style.top=next.top+'px';
 return next;
}
const __xenWaveOfflineRates=new Map();
// Offline EQ is a transient owner of the *existing* Live-Room model and planner.
// It never becomes an audio device and never persists as an instrument EQ.
globalThis.__XenWaveOfflineEQ=Object.freeze({
 get:key=>__XenEQ.get(key),
 set:(key,patch)=>{if(!key.startsWith('waveOffline:'))throw Error('Offline EQ owner required');return __XenEQ.set(key,patch)},
 plan:(cfg,rate)=>__XenEQ.plan(cfg,rate),
 response:(cfg,rate,count)=>__XenEQ.response(cfg,rate,count),
 subscribe:fn=>__XenEQ.subscribe(fn),
 revision:()=>__XenEQ.revision(),
 registerRate:(key,rate)=>__xenWaveOfflineRates.set(key,rate),
 has:key=>Object.prototype.hasOwnProperty.call(__XenEQ.snapshot(),key),
 drop:key=>{if(!key?.startsWith('waveOffline:'))return;__xenWaveOfflineRates.delete(key);__XenEQ.dropOffline(key);}
});
function __XenEQPanel({sourceKey,owner,onClose,expanded,setExpanded}) {
 const staticMode=/^(particle|wave|keyboard):instrument$/.test(sourceKey)||/^oneShot:/.test(sourceKey)||/^waveOffline:/.test(sourceKey);
 const waveOfflineMode=sourceKey.startsWith('waveOffline:');
 const movingWindow=P.useRef(null),windowRoot=P.useRef(null);
 // Restore after a close/open or parent remeasurement; clamp again after viewport changes.
 P.useLayoutEffect(()=>{
  const panel=windowRoot.current?.closest('.xen-eq-flyout');
  const saved=__xenEQFloatLocations.get(sourceKey);
  if(panel&&saved)__xenEQFloatLocations.set(sourceKey,__xenEQFloatApply(panel,saved));
 });
 P.useEffect(()=>{
  const onResize=()=>{
   const panel=windowRoot.current?.closest('.xen-eq-flyout');
   const saved=__xenEQFloatLocations.get(sourceKey);
   if(panel&&saved)__xenEQFloatLocations.set(sourceKey,__xenEQFloatApply(panel,saved));
  };
  window.addEventListener('resize',onResize);
  return()=>window.removeEventListener('resize',onResize);
 },[sourceKey]);
 const windowDragStart=event=>{
  if(event.button!==0||event.target.closest('button,input,select,textarea,a'))return;
  const panel=event.currentTarget.closest('.xen-eq-flyout');if(!panel)return;
  const rect=panel.getBoundingClientRect();
  movingWindow.current={id:event.pointerId,panel,x:event.clientX-rect.left,y:event.clientY-rect.top};
  event.currentTarget.setPointerCapture?.(event.pointerId);
  event.preventDefault();event.stopPropagation();
 };
 const windowDragMove=event=>{
  const moving=movingWindow.current;if(!moving||moving.id!==event.pointerId)return;
  __xenEQFloatLocations.set(sourceKey,__xenEQFloatApply(moving.panel,{left:event.clientX-moving.x,top:event.clientY-moving.y}));
  event.preventDefault();event.stopPropagation();
 };
 const windowDragEnd=event=>{
  if(!movingWindow.current||movingWindow.current.id!==event.pointerId)return;
  movingWindow.current=null;
  try{if(event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}catch{}
  event.stopPropagation();
 };
 const state=P.useSyncExternalStore(__XenEQ.subscribe,__XenEQ.snapshot,__XenEQ.snapshot),cfg=__XenEQ.get(sourceKey);
 P.useEffect(()=>__XenAvalanche.subscribe(()=>forceHoldUpdate(x=>x+1)),[]);const [holdRevision,forceHoldUpdate]=P.useState(0);
 // A room change or Escape can unmount an editor before pointer-up.
 P.useEffect(()=>()=>__XenEQ.endGesture(sourceKey),[sourceKey]);
 const [rangeOpen,setRangeOpen]=P.useState(false),[advanced,setAdvanced]=P.useState(false);
 const [saveOpen,setSaveOpen]=P.useState(false),[libraryOpen,setLibraryOpen]=P.useState(false);
 const [patternName,setPatternName]=P.useState(''),[saveFrom,setSaveFrom]=P.useState('current');
 const [chosenPattern,setChosenPattern]=P.useState(''),[removeArmed,setRemoveArmed]=P.useState(false),[patternNotice,setPatternNotice]=P.useState('');
 const savedPatterns=__XenEQ.listPatterns(),frozenPattern=__XenEQ.frozen();
 const report=(result,success)=>setPatternNotice(result.ok?success:result.error||'EQ pattern operation failed');
 P.useEffect(()=>{if(!patternNotice)return;const id=setTimeout(()=>setPatternNotice(''),2600);return()=>clearTimeout(id)},[patternNotice]);
 const selectedLibraryPattern=savedPatterns.find(p=>p.id===chosenPattern)||savedPatterns[0]||null;
 const savePattern=()=>{const result=saveFrom==='frozen'?__XenEQ.saveFrozenPattern(patternName):__XenEQ.savePattern(sourceKey,patternName);report(result,'Saved '+patternName.trim());if(result.ok){setSaveOpen(false);setChosenPattern(result.id);setPatternName('')}};

 const [brushTools,setBrushTools]=P.useState({size:42,intensity:.58,hardness:0,fluidity:0});
 const toolMode=P.useSyncExternalStore(__xenEqToolPreference.subscribe,__xenEqToolPreference.get,__xenEqToolPreference.get);
 const tools={...brushTools,mode:toolMode};
 const editTool=(field,value)=>field==='mode'?__xenEqToolPreference.set(value):setBrushTools(previous=>({...previous,[field]:value}));
 const toolSlider=(name,field,min,max,step,format)=>u.jsxs('label',{className:'xen-eq-tool-slider',children:[
  u.jsxs('span',{children:[u.jsx('span',{children:name}),u.jsx('output',{children:format(tools[field])})]}),
  u.jsx(__XenRange,{type:'range',min,max,step,value:tools[field],'aria-label':'EQ brush '+field,onChange:event=>editTool(field,Number(event.target.value))})
 ]});

 const change=patch=>__XenEQ.set(sourceKey,patch);
 P.useSyncExternalStore(__XenEQ.subscribe,__XenEQ.revision,__XenEQ.revision);
 const rate=__XenEQ.rateFor(sourceKey);
 // Keep the cyan/purple drawing immediate, but do not force the expensive
 // white measured-response preview to chase every paint sample. During a brush
 // stroke it holds the last model and catches up after a 140-ms quiet period.
 // Morph previews remain immediate for rhythmic DJ-style gestures.
 const previewRef=P.useRef({key:sourceKey,cfg}),[,previewRefresh]=P.useState(0);
 const paintPreview=['paint','settle'].includes(__XenEQ.audioIntent(sourceKey));
 if(previewRef.current.key!==sourceKey||!paintPreview||previewRef.current.cfg?.manualCenters!==cfg.manualCenters)previewRef.current={key:sourceKey,cfg};
 P.useEffect(()=>{
  if(!paintPreview||previewRef.current.cfg===cfg)return;
  const timer=setTimeout(()=>{previewRef.current={key:sourceKey,cfg};previewRefresh(n=>n+1)},140);
  return()=>clearTimeout(timer);
 },[cfg,sourceKey,paintPreview]);
 const previewCfg=previewRef.current.cfg;
 const eqPlan=__XenEQ.peekPlan(previewCfg,rate,sourceKey);
 const profile=P.useMemo(()=>__XenEQ.responseProfile(previewCfg,rate,240,eqPlan),[previewCfg,rate,eqPlan]);
 const a=P.useMemo(()=>__XenEQ.field(cfg.a),[cfg.a]),b=P.useMemo(()=>__XenEQ.field(cfg.b),[cfg.b]);
 const viewA=P.useMemo(()=>({cfg,profile,plan:eqPlan,sampleRate:rate,color:'#63ded9'}),[cfg,profile,eqPlan,rate]),viewB=P.useMemo(()=>({cfg,profile,plan:eqPlan,sampleRate:rate,color:'#c5a2f2'}),[cfg,profile,eqPlan,rate]);
 // MWCM's native history does not see Raster Paint because capture intercepts it.
 // Supply one shared undo contract for both the intercepted gesture and MWCM
 // Morph/Warp + Reset, while preserving independent A and B undo stacks.
 const undoStacks=P.useRef({a:[],b:[]});
 const historyFor=name=>({
  get canUndo(){return undoStacks.current[name].length>0},
  capture(){const stack=undoStacks.current[name],cfg=__XenEQ.get(sourceKey);stack.push({curve:[...cfg[name]],manualCenters:[...(cfg.manualCenters||[])]});if(stack.length>24)stack.shift()},
  undo(){const previous=undoStacks.current[name].pop();if(previous)__XenEQ.set(sourceKey,{[name]:previous.curve,manualCenters:previous.manualCenters})}
 });
 const manualDrag=P.useRef(null),manualFrame=P.useRef(null),manualNext=P.useRef(null);
 function handleGesture(name,phase,event,view){
  const held=manualDrag.current;
  if(phase==='down'){
   if(cfg.mode!=='adaptive'||event.target?.tagName?.toLowerCase()!=='canvas'||event.button!==0)return false;
   const canvas=event.target;
   const picked=__xenEqHitMarker(view,name==='a'?cfg.a:cfg.b,canvas,event.clientX,event.clientY);
   if(!picked)return false;
   manualDrag.current={name,pointerId:event.pointerId,index:picked.index,canvas};
   historyFor(name).capture();__XenEQ.startGesture(sourceKey,'paint');
   event.currentTarget.setPointerCapture?.(event.pointerId);canvas.style.cursor='grabbing';
  }else if(held&&held.name===name&&held.pointerId===event.pointerId){
   if(phase==='move'||phase==='up'){
    const ratio=Mz(held.canvas,event.clientX,event.clientY,360).ratio;
    const top=Math.min(20000,rate*.45);
    manualNext.current={index:held.index,frequency:20*Math.pow(top/20,Math.max(0,Math.min(1,ratio)))};
    if(phase==='up'){
     if(manualFrame.current!==null){cancelAnimationFrame(manualFrame.current);manualFrame.current=null}
     const next=manualNext.current;manualNext.current=null;if(next)__XenEQ.moveBand(sourceKey,next.index,next.frequency);
    }else if(manualFrame.current===null){manualFrame.current=requestAnimationFrame(()=>{
     manualFrame.current=null;const next=manualNext.current;manualNext.current=null;if(next)__XenEQ.moveBand(sourceKey,next.index,next.frequency);
    })}
   }
   if(phase==='up'||phase==='cancel'||phase==='lost'){
    if(manualFrame.current!==null){cancelAnimationFrame(manualFrame.current);manualFrame.current=null}
    manualNext.current=null;manualDrag.current=null;held.canvas.style.cursor='';
    __XenEQ.endGesture(sourceKey);
    if(phase!=='lost'&&event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
   }
  }else if(held)return false;
  else if(phase==='move'&&cfg.mode==='adaptive'&&event.target?.tagName?.toLowerCase()==='canvas'){
   const canvas=event.target;
   canvas.style.cursor=__xenEqHitMarker(view,name==='a'?cfg.a:cfg.b,canvas,event.clientX,event.clientY)?'grab':'';
   return false;
  }else return false;
  event.preventDefault();event.stopPropagation();return true;
 }
 P.useEffect(()=>()=>{if(manualFrame.current!==null)cancelAnimationFrame(manualFrame.current)},[sourceKey]);
 const rasterDrag=P.useRef(null);
 function rasterGesture(name,phase,event){
  let drag=rasterDrag.current;
  if(phase==='down'){
   if(cfg.mode!=='raster'||tools.mode!=='draw'||event.target?.tagName?.toLowerCase()!=='canvas'||(event.pointerType==='mouse'&&event.button!==0))return;
   const canvas=event.target,pos=Mz(canvas,event.clientX,event.clientY,360);
   const band=Math.min(cfg.bands-1,Math.floor(pos.ratio*cfg.bands));
   // Capture on the EQ wrapper before MWCM sees pointerdown; Morph/Warp retains
   // its original untouched pointer handling. One mouse sweep paints whole bands.
   drag={name,pointerId:event.pointerId,canvas,band,value:pos.value};rasterDrag.current=drag;
   historyFor(name).capture();__XenEQ.startGesture(sourceKey);__XenEQ.rasterStroke(sourceKey,name,band,band,pos.value,pos.value);
   event.currentTarget.setPointerCapture(event.pointerId);
  }else{
   if(!drag||drag.name!==name||drag.pointerId!==event.pointerId)return;
   if(phase==='move'||phase==='up'){
    const pos=Mz(drag.canvas,event.clientX,event.clientY,360);
    const band=Math.min(__XenEQ.get(sourceKey).bands-1,Math.floor(pos.ratio*__XenEQ.get(sourceKey).bands));
    if(band!==drag.band||Math.abs(pos.value-drag.value)>.002){
     __XenEQ.rasterStroke(sourceKey,name,drag.band,band,drag.value,pos.value);
     drag.band=band;drag.value=pos.value;
    }
   }
   if(phase==='up'||phase==='cancel'||phase==='lost'){
    rasterDrag.current=null;__XenEQ.endGesture(sourceKey);
    if(phase!=='lost'&&event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
   }
  }
  event.preventDefault();event.stopPropagation();
 }
 const routePointer=(name,phase,event,view)=>{if(!handleGesture(name,phase,event,view))rasterGesture(name,phase,event)};
 const editor=(name,field,view)=>u.jsx('div',{className:'xen-eq-profile','data-eq-paint':name,onPointerDownCapture:event=>routePointer(name,'down',event,view),onPointerMoveCapture:event=>routePointer(name,'move',event,view),onPointerUpCapture:event=>routePointer(name,'up',event,view),onPointerCancelCapture:event=>routePointer(name,'cancel',event,view),onLostPointerCapture:event=>routePointer(name,'lost',event,view),onPointerDown:()=>__XenEQ.startGesture(sourceKey),onPointerUp:()=>__XenEQ.endGesture(sourceKey),onPointerCancel:()=>__XenEQ.endGesture(sourceKey),onLostPointerCapture:()=>__XenEQ.endGesture(sourceKey),children:u.jsx(G$,{fieldInput:field,historyKey:sourceKey+':'+name,historyController:historyFor(name),title:staticMode?'EQ':name.toUpperCase(),description:'',statusDescription:'',fixedTarget:'dynamic-fade',compact:true,eqView:view,eqTool:tools,onCommit:value=>change({[name]:[...value.deformation.curve]})})},name);
 return u.jsxs('div',{className:'xen-eq-panel'+(expanded?' is-expanded':'')+(staticMode?' is-static':''),'data-eq-source':sourceKey,ref:windowRoot,role:'region','aria-label':owner+' Equalizer',onKeyDown:event=>{event.stopPropagation();if(event.key==='Escape')onClose()},onPointerDown:event=>event.stopPropagation(),children:[
  u.jsxs('header',{className:'xen-eq-window-bar',title:'EQ-Fenster hier ziehen',onPointerDown:windowDragStart,onPointerMove:windowDragMove,onPointerUp:windowDragEnd,onPointerCancel:windowDragEnd,onLostPointerCapture:windowDragEnd,children:[u.jsx('strong',{children:'EQ · '+owner}),u.jsx('button',{'aria-label':'Close Equalizer',onClick:onClose,children:'×'})]}),
  u.jsxs('div',{className:'xen-eq-toolbar',children:[
   u.jsx('button',{'aria-pressed':cfg.enabled,onClick:()=>change({enabled:!cfg.enabled}),children:cfg.enabled?'On':'Bypass'}),
   u.jsxs('div',{className:'xen-eq-mode',role:'group','aria-label':'EQ frequency mapping',children:[
    u.jsx('button',{'aria-label':'Raster EQ fixed frequency bands','aria-pressed':cfg.mode==='raster',title:'Feste Bandmitten. Türkis = gezeichnet, Weiß = tatsächlicher Filterpegel.',onClick:event=>{change({mode:'raster'});if(sourceKey==='keyboard:instrument')event.currentTarget.blur()},children:'Raster'}),
    u.jsx('button',{'aria-label':'Adaptive EQ free filter allocation','aria-pressed':cfg.mode!=='raster',title:'Freie Kurvenanpassung. Filter werden dort gesetzt, wo sie den Kurvenfehler reduzieren.',onClick:event=>{change({mode:'adaptive'});if(sourceKey==='keyboard:instrument')event.currentTarget.blur()},children:'Adaptiv'})
   ]}),
   u.jsxs('label',{children:['Bänder ',u.jsx('input',{type:'number',min:4,max:24,step:1,value:cfg.bands,'aria-label':'EQ bands',onChange:e=>change({bands:Number(e.target.value)})})]}),
   u.jsx('button',{className:'xen-lane-window-toggle','aria-expanded':rangeOpen,'aria-label':'EQ gain window',onClick:()=>setRangeOpen(!rangeOpen),children:'Window'}),
   u.jsx('button',{'aria-label':expanded?'Compact EQ editors':'Expand EQ editors','aria-expanded':expanded,onClick:()=>setExpanded(!expanded),children:expanded?'↕ −':'↕ +'})
  ]}),
  u.jsxs('div',{className:'xen-eq-command-strip',role:'group','aria-label':'EQ patterns and drawing tools',children:[
  u.jsxs('div',{className:'xen-eq-pattern-actions',role:'group','aria-label':'EQ pattern actions',children:[
   (staticMode&&!waveOfflineMode)?u.jsx('button',{type:'button','aria-label':advanced?'Hide advanced EQ actions':'Show advanced EQ actions','aria-expanded':advanced,onClick:()=>setAdvanced(!advanced),children:advanced?'Less':'More'}):null,
   ...((!waveOfflineMode&&(!staticMode||advanced))?['wellenstart','klaviatur']:[]).map(lane=>{const label=lane==='wellenstart'?'Enter Hold':'Keyboard Hold',assigned=__XenAvalanche.assignment(lane)?.sourceKey===sourceKey;return u.jsx('button',{'aria-pressed':assigned,title:'Hold '+(lane==='wellenstart'?'Enter':'a keyboard key')+' and hold the left mouse button on the playfield: left/right plays the active timbre gradient where supported; up/down plays this EQ A/B morph (up = B, down = A). The source track keeps its own EQ settings.',onClick:()=>assigned?__XenAvalanche.remove(lane):__XenAvalanche.assign(lane,sourceKey,owner),children:(assigned?'Remove from ':'Add to ')+label},lane)}),
   (!waveOfflineMode&&(!staticMode||advanced))&&u.jsx('button',{'aria-label':'Freeze current EQ A B pattern',onClick:()=>report(__XenEQ.freeze(sourceKey),'Frozen A/B pattern ready to apply to other sources'),children:staticMode?'❄ Copy EQ':'❄ Freeze'}),
   (!waveOfflineMode&&(!staticMode||advanced))&&u.jsx('button',{'aria-label':'Apply frozen EQ pattern to this source',disabled:!frozenPattern,onClick:()=>report(__XenEQ.applyFrozen(sourceKey),'Frozen pattern applied to '+owner),children:'↳ Apply Freeze'}),
   u.jsx('button',{'aria-label':'Save EQ pattern',onClick:()=>{setSaveOpen(!saveOpen);setLibraryOpen(false);setRemoveArmed(false)},children:'💾 Save'}),
   u.jsx('button',{'aria-label':'Open saved EQ patterns',onClick:()=>{setLibraryOpen(!libraryOpen);setSaveOpen(false);setRemoveArmed(false)},children:'Patterns'+(savedPatterns.length?' · '+savedPatterns.length:'')}),
   (!waveOfflineMode&&(!staticMode||advanced))&&frozenPattern?u.jsx('button',{'aria-label':'Discard session EQ freeze',className:'xen-eq-clear-freeze',onClick:()=>report(__XenEQ.clearFrozen(),'Session freeze cleared'),children:'×'}):null
  ]}),
  u.jsxs('div',{className:'xen-eq-shared-tools',role:'group','aria-label':'EQ drawing tools',children:[
    u.jsx('button',{'aria-label':'Morph Warp EQ curves','aria-pressed':tools.mode==='morph',onClick:()=>editTool('mode','morph'),children:'Morph / Warp'}),
    u.jsxs('button',{'aria-label':'Paint EQ curves','aria-pressed':tools.mode==='draw',onClick:()=>editTool('mode','draw'),children:[
     u.jsx('svg',{viewBox:'0 0 24 24',width:12,height:12,fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true,children:u.jsxs(u.Fragment,{children:[u.jsx('path',{d:'M5 19 4 20l5-1 11-11-4-4L5 19Z'}),u.jsx('path',{d:'m14 6 4 4'})]})}),
     'Paint'
    ]})
  ]})
  ]}),
  saveOpen?u.jsxs('form',{className:'xen-eq-pattern-drawer',onSubmit:e=>{e.preventDefault();savePattern()},children:[
   u.jsx('label',{children:'Pattern name'}),
   u.jsx('input',{type:'text',maxLength:64,required:true,value:patternName,placeholder:staticMode?'Name this EQ shape':'Name this A/B shape','aria-label':'EQ pattern name',onChange:e=>setPatternName(e.target.value)}),
   u.jsx('select',{'aria-label':'Save EQ pattern from',value:saveFrom,onChange:e=>setSaveFrom(e.target.value),children:[u.jsx('option',{value:'current',children:'Current A/B curves'}),frozenPattern?u.jsx('option',{value:'frozen',children:'Frozen A/B snapshot'}):null]}),
   u.jsx('button',{type:'submit',children:'Save to library'}),
   u.jsx('button',{type:'button',onClick:()=>setSaveOpen(false),children:'Cancel'})
  ]}):null,
  libraryOpen?u.jsxs('div',{className:'xen-eq-pattern-drawer',children:[
   u.jsx('select',{'aria-label':'EQ patterns (saved and factory)',value:selectedLibraryPattern?.id||'',onChange:e=>{setChosenPattern(e.target.value);setRemoveArmed(false)},children:savedPatterns.length?savedPatterns.map(p=>u.jsx('option',{value:p.id,children:p.name},p.id)):u.jsx('option',{value:'',children:'No saved EQ patterns'})}),
   u.jsx('button',{'aria-label':'Apply saved EQ pattern to this source',disabled:!selectedLibraryPattern,onClick:()=>selectedLibraryPattern&&report(__XenEQ.applyPattern(selectedLibraryPattern.id,sourceKey),'Applied '+selectedLibraryPattern.name+' to '+owner),children:'Apply'}),
   u.jsx('button',{'aria-label':removeArmed?'Confirm delete EQ pattern':'Delete selected EQ pattern',disabled:!selectedLibraryPattern||selectedLibraryPattern.readOnly===true,onClick:()=>{if(!removeArmed){setRemoveArmed(true);return}report(__XenEQ.removePattern(selectedLibraryPattern.id),'Pattern deleted');setChosenPattern('');setRemoveArmed(false)},children:removeArmed?'Confirm delete':'Delete'}),
   removeArmed?u.jsx('button',{onClick:()=>setRemoveArmed(false),children:'Keep'}):null
  ]}):null,
  patternNotice?u.jsx('div',{className:'xen-eq-pattern-notice',role:'status',children:patternNotice}):null,
  rangeOpen?u.jsxs('div',{className:'xen-eq-window',children:[
   u.jsxs('label',{children:['Cut ',u.jsx('span',{className:'xen-eq-window-clamp',style:{'--eq-span':(4+(-cfg.low-6)/54*23)+'px'},children:u.jsx(__XenRange,{type:'range',min:6,max:60,step:1,value:-cfg.low,'aria-label':'EQ attenuation window',onChange:e=>change({low:-Number(e.target.value)})})}),u.jsx('output',{children:cfg.low+' dB'})]}),
   u.jsxs('label',{children:['Boost ',u.jsx('span',{className:'xen-eq-window-clamp',style:{'--eq-span':(4+cfg.high/12*23)+'px'},children:u.jsx(__XenRange,{type:'range',min:0,max:12,step:.5,value:cfg.high,'aria-label':'EQ amplification window',onChange:e=>change({high:Number(e.target.value)})})}),u.jsx('output',{children:'+'+cfg.high+' dB'})]})
  ]}):null,
  u.jsxs('div',{className:'xen-eq-body',children:[u.jsxs('div',{className:'xen-eq-editors'+(staticMode?' is-static':''),children:[editor('a',a,viewA),!staticMode&&editor('b',b,viewB)]}),!staticMode&&u.jsxs('label',{className:'xen-eq-morph',children:[u.jsx('span',{children:'A'}),u.jsx(__XenEQMorph,{sourceKey,value:cfg.morph}),u.jsx('span',{children:'B'})]})]}),
  u.jsxs('div',{className:'xen-eq-shared-settings',role:'group','aria-label':'Shared EQ brush settings',children:[
   toolSlider('Size','size',24,240,1,value=>Math.round(value)+' px'),
   toolSlider('Intensity','intensity',.05,1,.01,value=>value.toFixed(2)),
   toolSlider('Hardness','hardness',0,1,.01,value=>value.toFixed(2)),
   toolSlider('Wiry · Fluid','fluidity',0,1,.01,value=>(1-value).toFixed(2)+' · '+value.toFixed(2))
  ]}),
  u.jsxs('footer',{children:[u.jsx('span',{children:staticMode?'Static EQ · one curve':'A '+Math.round((1-cfg.morph)*100)+' · B '+Math.round(cfg.morph*100)}),u.jsx('span',{title:'Weiße Linie und weiße Markierungen: berechnete Biquad-Filterantwort des gemeinsamen A/B-Mixes. Türkis und Lila: gezeichnete Ziele. Während einer Geste zunächst vorläufige Audio-Filter.',children:(eqPlan.manual?'✋ Manuell verschobene Filter · ':eqPlan.provisional?'◌ Vorläufige Filterantwort · ':cfg.mode==='raster'?'▦ Berechnete Filterantwort · ':'◇ Berechnete Filterantwort · ')+(eqPlan.fitError==null?(__XenEQ.diagnostics().workerFailed?'Worker nicht verfügbar':'Fit noch nicht abgeschlossen'):eqPlan.fitError.toFixed(1)+(cfg.mode==='raster'?' dB Bandfehler':' dB RMS'))})]})
 ]});
}
// Shared visible lower boundary: never occupy the Drone / Time / Echo row.
function __xenPlayAreaBottom(){return Math.min(window.innerHeight-12,document.querySelector('[data-xen-play-area]')?.getBoundingClientRect().bottom??window.innerHeight-12)}
function __XenEQDock({sourceKey,owner,rowId,open,onToggle,onClose,placement='lane'}) {
 const [anchor,setAnchor]=P.useState(null),[expanded,setExpanded]=P.useState(true);
 P.useLayoutEffect(()=>{
  let frame=0;const row=[...document.querySelectorAll('[data-xen-lane-id]')].find(el=>el.dataset.xenLaneId===rowId);if(!row)return;
  const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const rect=row.getBoundingClientRect(),heading=row.querySelector('.xen-lane-slider-heading'),h=heading?.getBoundingClientRect();const next={left:h?.right??rect.left+40,top:rect.top,right:rect.right,rowLeft:rect.left,rowBottom:rect.bottom,bottom:__xenPlayAreaBottom()};
   if(placement==='instrument'){const title=row.querySelector('.xen-performance-title')?.getBoundingClientRect(),bar=row.querySelector('.xen-source-heading')?.getBoundingClientRect(),toggle=row.querySelector('.xen-source-heading input[type=checkbox]')?.getBoundingClientRect(),octave=row.querySelector('.xen-source-octave')?.getBoundingClientRect();
    if(title&&bar){const buttonWidth=19,gap=3,first=toggle||octave||{left:bar.right};const fits=first.left-title.right>=buttonWidth+gap*2;
     // The narrow stacked layout has insufficient inline space (Wave Starter).
     // Float *over* the heading rather than obscuring the checkbox or moving it.
     next.buttonLeft=title.right-bar.left+gap;next.buttonTop=fits?Math.max(0,(bar.height-16)/2):-12;}}
   setAnchor(old=>old&&Object.keys(next).every(key=>old[key]===next[key])?old:next)})};
  measure();const ro=new ResizeObserver(measure);ro.observe(row);window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);
  return()=>{cancelAnimationFrame(frame);ro.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true)};
 },[rowId,placement]);
 if(!anchor)return null;
 // Left-hand instrument sources open inward (to the RIGHT of their source controls).
 // Other lanes retain their established left-facing placement.
 const desiredWidth=Math.min(expanded?720:380,window.innerWidth-24);
 const freeRight=Math.max(0,window.innerWidth-anchor.right-24);
 const sourceOnLeft=placement==='instrument'&&anchor.rowLeft<window.innerWidth/2;
 const canDockRight=sourceOnLeft&&freeRight>=300;
 const width=canDockRight?Math.min(desiredWidth,freeRight):desiredWidth;
 const canDockBelow=placement==='instrument'&&!canDockRight&&anchor.rowBottom+164<anchor.bottom;
 const left=canDockRight?anchor.right+12:
  expanded?Math.max(12,Math.min(window.innerWidth-width-12,anchor.rowLeft-width-12)):
  Math.max(8,Math.min(window.innerWidth-width-8,anchor.right-width));
 const bottom=Math.max(144,anchor.bottom),top=canDockBelow?Math.max(12,anchor.rowBottom+8):Math.max(12,Math.min(anchor.top,bottom-(expanded?700:520)));
 return u.jsxs(u.Fragment,{children:[u.jsx('button',{type:'button',className:'xen-lane-window-toggle xen-eq-trigger'+(placement==='instrument'?' xen-instrument-eq-trigger':''),style:placement==='instrument'?{left:anchor.buttonLeft??0,top:anchor.buttonTop??0}:undefined,'aria-label':owner+' EQ','aria-expanded':open,onClick:onToggle,children:'EQ'}),open?ao.createPortal(u.jsx('div',{className:'xen-eq-flyout',style:{left,top,width,maxHeight:bottom-top,'--xen-eq-canvas-height':Math.max(65,Math.min(210,(bottom-top-330)/2))+'px'},children:u.jsx(__XenEQPanel,{sourceKey,owner,onClose,expanded,setExpanded},sourceKey)}),document.body):null]});
}
