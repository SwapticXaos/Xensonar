/* EQ-ShapeFit · canonical MWCM curves, frequency-adaptive peaking filter bank.
 * Drawn curve is authoritative; fit approximates its actual response on control thread.
 * P1.5 planning retained; Live 2 uses resident coefficient banks where supported.
 */
/* KH03_FACTORY_TROODLE_EQ: exact exported troodle.eq-pattern.json; read-only, no browser seeding. */
const __XenTroodleFactoryEQId='eq:factory:troodle@1';
const __XenTroodleFactoryEQ={"a":[0.3487974016853933,0.3487974016853933,0.3487974016853933,0.3487974016853933,0.3487974016853933,0.3487974016853933,0.3293100421348315,0.3487974016853933,0.3487974016853933,0.3487974016853933,0.3487974016853933,0.3487974016853933,0.3487974016853933,0.3487974016853933,0.3487974016853933,0.8596822331460674,0.8596822331460674,0.8596822331460674,0.8596822331460674,0.8596822331460674,0.8596822331460674,0.8596822331460674,0.8596822331460674,0.8596822331460674,0.8596822331460674,0.8596822331460674,0.8596822331460674,0.8596822331460674,0.8596822331460674,0.8596822331460674,0.6455846207865168,0.6455846207865168,0.6455846207865168,0.6455846207865168,0.6455846207865168,0.6455846207865168,0.6455846207865168,0.6455846207865168,0.6455846207865168,0.6455846207865168,0.6455846207865168,0.6455846207865168,0.6455846207865168,0.6455846207865168,0.6455846207865168,0.6293012640449438,0.6293012640449438,0.6293012640449438,0.6293012640449438,0.6293012640449438,0.6293012640449438,0.6293012640449438,0.6293012640449438,0.6293012640449438,0.6293012640449438,0.6293012640449438,0.6293012640449438,0.6293012640449438,0.6293012640449438,0.6293012640449438,0.6130179073033708,0.6130179073033708,0.6130179073033708,0.6130179073033708,0.6130179073033708,0.6130179073033708,0.6130179073033708,0.6130179073033708,0.6130179073033708,0.6130179073033708,0.6130179073033708,0.6130179073033708,0.6130179073033708,0.6130179073033708,0.6130179073033708,0.5641458918539326,0.5641458918539326,0.5641458918539326,0.5641458918539326,0.5641458918539326,0.5641458918539326,0.5641458918539326,0.5641458918539326,0.5641458918539326,0.5641458918539326,0.5641458918539326,0.5641458918539326,0.5641458918539326,0.5641458918539326,0.5641458918539326,0.5152738764044943,0.5152738764044943,0.5152738764044943,0.5152738764044943,0.5152738764044943,0.5152738764044943,0.5152738764044943,0.5152738764044943,0.5152738764044943,0.5152738764044943,0.5152738764044943,0.5152738764044943,0.5152738764044943,0.5152738764044943,0.5152738764044943,0.48268521769662914,0.48268521769662914,0.48268521769662914,0.48268521769662914,0.48268521769662914,0.48268521769662914,0.48268521769662914,0.48268521769662914,0.48268521769662914,0.48268521769662914,0.48268521769662914,0.48268521769662914,0.48268521769662914,0.48268521769662914,0.48268521769662914,0.450096558988764,0.450096558988764,0.450096558988764,0.450096558988764,0.450096558988764,0.450096558988764,0.450096558988764,0.450096558988764,0.450096558988764,0.450096558988764,0.450096558988764,0.450096558988764,0.450096558988764,0.450096558988764,0.450096558988764,0.36863588483146065,0.36863588483146065,0.36863588483146065,0.36863588483146065,0.36863588483146065,0.36863588483146065,0.36863588483146065,0.36863588483146065,0.36863588483146065,0.36863588483146065,0.36863588483146065,0.36863588483146065,0.36863588483146065,0.36863588483146065,0.36863588483146065,0.2871752106741573,0.2871752106741573,0.2871752106741573,0.2871752106741573,0.2871752106741573,0.2871752106741573,0.2871752106741573,0.2871752106741573,0.2871752106741573,0.2871752106741573,0.2871752106741573,0.2871752106741573,0.2871752106741573,0.2871752106741573,0.2871752106741573,0.22201983848314605,0.22201983848314605,0.22201983848314605,0.22201983848314605,0.22201983848314605,0.22201983848314605,0.22201983848314605,0.22201983848314605,0.22201983848314605,0.22201983848314605,0.22201983848314605,0.22201983848314605,0.22201983848314605,0.22201983848314605,0.22201983848314605,0.1568644662921348,0.1568644662921348,0.1568644662921348,0.1568644662921348,0.1568644662921348,0.1568644662921348,0.1568644662921348,0.1568644662921348,0.1568644662921348,0.1568644662921348,0.1568644662921348,0.1568644662921348,0.1568644662921348,0.1568644662921348,0.1568644662921348,0.0754037921348315,0.0754037921348315,0.0754037921348315,0.0754037921348315,0.0754037921348315,0.0754037921348315,0.0754037921348315,0.0754037921348315,0.0754037921348315,0.0754037921348315,0.0754037921348315,0.0754037921348315,0.0754037921348315,0.0754037921348315,0.0754037921348315,-0.10380091292134841,-0.10380091292134841,-0.10380091292134841,-0.10380091292134841,-0.10380091292134841,-0.10380091292134841,-0.10380091292134841,-0.10380091292134841,-0.10380091292134841,-0.10380091292134841,-0.10380091292134841,-0.10380091292134841,-0.10380091292134841,-0.10380091292134841,-0.008821980337078594,-0.008821980337078594,-0.008821980337078594,-0.008821980337078594,-0.008821980337078594,-0.008821980337078594,-0.008821980337078594,-0.008821980337078594,-0.010633680555555506,-0.012445380774032417,-0.01425708099250933,-0.01606878121098624,-0.017880481429463156,-0.019692181647940066,-0.021503881866416975,-0.02331558208489389,-0.0251272823033708,-0.026938982521847715,-0.028750682740324628,-0.030562382958801537,-0.032374083177278454,-0.034185783395755356,-0.03599748361423227,-0.03780918383270918,-0.03962088405118609,-0.04143258426966301,-0.0432418461298378,-0.045051107990012586,-0.04686036985018738,-0.04866963171036217,-0.05047889357053696,-0.05228815543071175,-0.05409741729088654,-0.055906679151061324,-0.057715941011236116,-0.05952520287141091,-0.0613344647315857,-0.06314372659176049,-0.06495298845193527,-0.06676225031211007,-0.06857151217228485,-0.07038077403245964,-0.07219003589263442,-0.07399929775280922,-0.07399929775280922,-0.07399929775280922,-0.07399929775280922,-0.07399929775280922,-0.07399929775280922,-0.07399929775280922,-0.07399929775280922,-0.07399929775280922,-0.07399929775280922,-0.07399929775280922,-0.07399929775280922,-0.07399929775280922,-0.07865168539325862,-0.08330407303370801,-0.08795646067415741,-0.0926088483146068,-0.0972612359550562,-0.1019136235955056,-0.106566011235955,-0.106566011235955,-0.106566011235955,-0.106566011235955,-0.106566011235955,-0.106566011235955,-0.106566011235955,-0.106566011235955,-0.106566011235955,-0.106566011235955,-0.106566011235955,-0.106566011235955,-0.106566011235955,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.002282303370786609,-0.006940961075441493,-0.011599618780096377,-0.016258276484751262,-0.020916934189406145,-0.025575591894061032,-0.030234249598715915,-0.0348929073033708,-0.04574847846441946,-0.056604049625468125,-0.0674596207865168,-0.0674596207865168,-0.0674596207865168,-0.0674596207865168,-0.0674596207865168,-0.0674596207865168,-0.083764922752809,-0.10007022471910121,-0.1163535814606742,-0.1326369382022472,-0.1483277738764045,-0.1640186095505618,-0.192942415730337,-0.192942415730337,-0.192942415730337,-0.1649841994382022,-0.1649841994382022,-0.2301176264044944],"b":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"morph":0,"bands":24,"mode":"adaptive","low":-36,"high":12,"manualCenters":[22.343982164101824,null,null,null,19622.715586162798,null,null,null,10041.147434355846,10686.80970105415,2875.5104130618524,6403.700092186018,17218.642339988248,16568.29289847884,null,19912.08467229383,null,665.7505969762866,20000,null,null,null,null,19054.782993284578]}; /* EQ_FACTORY_TROODLE */
const __XenEQ = (() => {
 const KEY='xensonar.quickrack.eq.v1', MAX=24, listeners=new Set(), devices=new Set(), routes=new WeakMap(), deviceKeys=new WeakMap();
 const clamp=(v,lo,hi,f=0)=>Math.max(lo,Math.min(hi,Number.isFinite(+v)?+v:f));
 const neutral=()=>({a:Array(360).fill(0),b:Array(360).fill(0),morph:0,bands:12,mode:'adaptive',low:-36,high:12,enabled:true,manualCenters:[]});
 const cleanCurve=c=>Array.from({length:360},(_,i)=>clamp(Array.isArray(c)?c[Math.round(i*(c.length-1)/359)]:0,-1,1));
 function cleanCenters(value){return Array.isArray(value)?value.slice(0,MAX).map(v=>typeof v==='number'&&Number.isFinite(v)?clamp(v,20,20000):null):[]}
 function clean(v={}){return {a:cleanCurve(v.a),b:cleanCurve(v.b),morph:clamp(v.morph,0,1),bands:Math.round(clamp(v.bands,4,MAX,12)),mode:v.mode==='raster'?'raster':'adaptive',low:clamp(v.low,-60,-6,-36),high:clamp(v.high,0,12,12),enabled:v.enabled!==false,manualCenters:cleanCenters(v.manualCenters)};}
 let state=Object.freeze({}),timer=null,pending=null,version=0;
 // Audio-control priorities are independent of immediate canonical UI state.
 // Painting is a low-priority 240 ms latest-only stream; morph gestures get the next
 // animation frame. Only one bounded timer per source, never a catch-up queue.
 const audioHolds=new Map(),audioKinds=new WeakMap();
 // Pointer and keyboard lifecycles explicitly own the cheap morph path.
 // Programmatic scalar changes retain the existing debounce/cache semantics.
 const morphGestures=new Set();
 function finishMorphHot(key){releaseLiveKey(key);requestAudioFrame()}

 const audioCounters={paintEdits:0,paintFlushes:0,morphEdits:0,morphAudioFrames:0};
 function requestAudioFrame(){if(pending===null)pending=requestAnimationFrame(refresh)}
 function audioIntent(key){return audioKinds.get(get(key))||'standard'}
 function stageAudio(key,kind){
  const previous=audioHolds.get(key);
  if(kind==='paint')audioCounters.paintEdits++;
  if(kind==='morph')audioCounters.morphEdits++
  if(kind==='paint'&&previous?.kind==='paint')return;
  if(previous){clearTimeout(previous.timer);audioHolds.delete(key)}
  const ms=kind==='paint'?240:kind==='settle'?160:0;
  if(ms){
   const hold={kind,timer:null};
   hold.timer=setTimeout(()=>{if(audioHolds.get(key)!==hold)return;audioHolds.delete(key);if(kind==='paint')audioCounters.paintFlushes++;requestAudioFrame()},ms);
   audioHolds.set(key,hold);
  }
 }
 const activeGestures=new Set(),fastCurves=new WeakSet();
 function cleanBindings(value){const out={};for(const name of ['klaviatur','wellenstart']){const a=value?.[name];if(a&&typeof a.sourceKey==='string'&&a.definition&&Array.isArray(a.definition.a)&&Array.isArray(a.definition.b))out[name]={sourceKey:a.sourceKey.slice(0,200),label:String(a.label??'EQ').slice(0,120),definition:clean(a.definition)};}return out;}
 function bindings(value){if(arguments.length===0)return cleanBindings(state.__avalancheBindings);const next=cleanBindings(value);if(JSON.stringify(next)===JSON.stringify(state.__avalancheBindings??{}))return;state=Object.freeze({...state,__avalancheBindings:next});notify();}
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');state=Object.freeze(Object.fromEntries(Object.entries(saved).filter(([k])=>/^(material|bass|rootFollow|drum):/.test(k)||/^(particle|wave|keyboard):instrument$/.test(k)||k==='__avalancheBindings').map(([k,v])=>[k,k==='__avalancheBindings'?cleanBindings(v):asPresentation(k,v)])))}catch{}
 /* EQ patterns: session-only clipboard (Freeze) + explicitly persisted named templates (Save).
  * A template is a copy, never a reference to a source's mutable curves.
  * The audio device and per-source EQ state remain separate from this catalog. */
 const PATTERN_KEY='xensonar.quickrack.eq.patterns.v1',PATTERN_MAX=80;
 const template=v=>{const c=clean(v);return {a:[...c.a],b:[...c.b],morph:c.morph,bands:c.bands,mode:c.mode,low:c.low,high:c.high,manualCenters:[...c.manualCenters]}};
 const safeTemplate=v=>v&&Array.isArray(v.a)&&Array.isArray(v.b)&&v.a.length>1&&v.b.length>1?template(v):null;
 let frozenPattern=null,savedPatterns=[];
 try{const parsed=JSON.parse(localStorage.getItem(PATTERN_KEY)||'{}');const items=Array.isArray(parsed.patterns)?parsed.patterns:[];
  savedPatterns=items.slice(0,PATTERN_MAX).filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&safeTemplate(x)).map(x=>({id:x.id,name:x.name.slice(0,64),createdAt:typeof x.createdAt==='number'?x.createdAt:0,...template(x)}))}catch{}
 const empty=Object.freeze(neutral());
 const runtimeState=new Map();
 const get=key=>runtimeState.get(key)||state[key]||empty;
 function runtime(key,value){
  if(!/^avalanche:/.test(key))throw Error('Invalid runtime EQ owner');
  const cfg=clean(value);cfg.holdDepth=clamp(value?.holdDepth,0,1,1);if(morphGestures.has(key))audioKinds.set(cfg,'morph');runtimeState.set(key,cfg);if(pending===null)pending=requestAnimationFrame(refresh);
 }
 function runtimeMorph(key,value){
  const prev=runtimeState.get(key);if(!prev)return;
  const morph=clamp(value,0,1);if(prev.morph===morph)return;
  runtimeState.set(key,{...prev,morph});if(pending===null)pending=requestAnimationFrame(refresh);
 }
 // HOLD-EQ-01: atomic, transient EQ depth + A/B morph; one RAF, no persisted curves.
 function runtimeHoldMorph(key,morph,depth){
  if(!/^avalanche:/.test(key))throw Error('Invalid hold EQ runtime owner');
  const prev=runtimeState.get(key);if(!prev)return;
  const nextMorph=clamp(morph,0,1),nextDepth=clamp(depth,0,1,1);
  if(prev.morph===nextMorph&&prev.holdDepth===nextDepth)return;
  const next={...prev,morph:nextMorph,holdDepth:nextDepth};audioKinds.set(next,'morph');runtimeState.set(key,next);requestAudioFrame();
 }
 function selected(kind){return __XenQuick.adapters.get(kind)?.selected??__XenQuick.snapshot().selectedByKind?.[kind]??'default';}
 const keyFor=(kind,id)=>kind+':'+(id||selected(kind));
 function staticPresentation(key){return /^(particle|wave|keyboard):instrument$/.test(key)||/^oneShot:/.test(key)||/^waveOffline:/.test(key)}
 function asPresentation(key,value){const cfg=clean(value);return staticPresentation(key)?{...cfg,morph:0}:cfg}
 const snapshot=()=>state;
 function flush(){clearTimeout(timer);timer=null;try{localStorage.setItem(KEY,JSON.stringify(Object.fromEntries(Object.entries(state).filter(([key])=>!key.startsWith('oneShot:')&&!key.startsWith('waveOffline:')))))}catch(error){console.warn('[xensonar][eq] Could not persist EQ',error)}}
 function refresh(){pending=null;for(const d of devices){
  if(d.ctx.state==='closed'){d.dispose();continue}
  const key=typeof d.key==='function'?d.key():d.key;
  ownDeviceKey(d,key);
  if(audioHolds.has(key))continue; // No fit, no coefficient conversion, no automation during a drawing hold.
  const cfg=get(key),p=livePlan(cfg,d.ctx.sampleRate,key);
  if(d.last!==cfg||d.appliedPlan!==p){const intent=audioIntent(key);if(intent==='morph')audioCounters.morphAudioFrames++;d.apply(cfg,false,p,intent);d.last=cfg}
 }}
 function notify(){version++;if(pending===null)pending=requestAnimationFrame(refresh);clearTimeout(timer);timer=setTimeout(flush,300);for(const fn of listeners)fn();}
 function dropOffline(key){
  if(typeof key!=='string'||!key.startsWith('waveOffline:'))return;
  if(!Object.prototype.hasOwnProperty.call(state,key))return;
  const next={...state};delete next[key];state=Object.freeze(next);
  manualBaseCfg.delete(key);activeGestures.delete(key);
  notify();
 }
 function set(key,patch){
  const prev=get(key),has=(field)=>Object.prototype.hasOwnProperty.call(patch,field);
  // Scalar-only gestures must never recopy 720 canonical curve samples.
  // Canvas edits own the supplied array; untouched lanes retain their exact identity.
  const cfg={
   a:has('a')?cleanCurve(patch.a):prev.a,b:has('b')?cleanCurve(patch.b):prev.b,
   morph:staticPresentation(key)?0:has('morph')?clamp(patch.morph,0,1):prev.morph,
   bands:has('bands')?Math.round(clamp(patch.bands,4,MAX,12)):prev.bands,
   mode:has('mode')?(patch.mode==='raster'?'raster':'adaptive'):prev.mode,
   low:has('low')?clamp(patch.low,-60,-6,-36):prev.low,
   high:has('high')?clamp(patch.high,0,12,12):prev.high,
   enabled:has('enabled')?patch.enabled!==false:prev.enabled,
   manualCenters:has('manualCenters')?cleanCenters(patch.manualCenters):has('bands')&&Math.round(clamp(patch.bands,4,MAX,12))!==prev.bands?[]:has('mode')&&patch.mode==='raster'?[]:prev.manualCenters
  };
  if(!fastCurves.has(prev)&&Object.keys(cfg).every(field=>cfg[field]===prev[field]))return;
  if(activeGestures.has(key)&&!morphGestures.has(key))fastCurves.add(cfg);
  const intent=has('a')||has('b')||has('manualCenters')?'paint':has('morph')?'morph':
   !Object.keys(patch).length&&audioIntent(key)==='paint'?'settle':'standard';
  stageAudio(key,intent);audioKinds.set(cfg,intent);
  // Seed manual editing with the previously resolved automatic bank. Avoid
  // invalidating an in-flight or cached fit on the first handle movement.
  if(has('manualCenters')&&prev.mode==='adaptive'&&!prev.manualCenters?.some(Number.isFinite))
   manualBaseCfg.set(String(key),{cfg,base:prev});
  state=Object.freeze({...state,[key]:cfg});notify();
 }
 // Band Paint writes the *canonical* 360-sample curve as steps. No lowpass,
 // spline, gesture averaging or hidden smoothing. Adaptive mode can later read it.
 function rasterStroke(key,lane,fromBand,toBand,fromValue,toValue){
  if(lane!=='a'&&lane!=='b')return false;
  const cfg=get(key);if(cfg.mode!=='raster')return false;
  const n=cfg.bands,from=Math.round(clamp(fromBand,0,n-1)),to=Math.round(clamp(toBand,0,n-1));
  const a=clamp(fromValue,-1,1),b=clamp(toValue,-1,1),next=[...cfg[lane]];
  for(let index=0;index<360;index++){
   const band=Math.min(n-1,Math.floor(index/359*n));
   if(band<Math.min(from,to)||band>Math.max(from,to))continue;
   const t=to===from?1:(band-from)/(to-from);
   next[index]=a+(b-a)*t;
  }
  set(key,{[lane]:next});return true;
 }
 function startGesture(key,kind='paint'){
  activeGestures.add(key);
  if(kind==='morph'){morphGestures.add(key);releaseLiveKey(key);requestAudioFrame()}
 }
 function endGesture(key){
  if(!activeGestures.delete(key))return;
  if(morphGestures.delete(key)){finishMorphHot(key);return}
  set(key,{});
 }

 function restore(data){if(!data||typeof data!=='object')return;const next={...state};for(const key of Object.keys(next))if(key.startsWith('oneShot:'))delete next[key];for(const [key,v] of Object.entries(data))if(/^(material|bass|rootFollow|drum|oneShot):/.test(key))next[key]=asPresentation(key,v);for(const key of ['particle:instrument','wave:instrument','keyboard:instrument'])next[key]=Object.hasOwn(data,key)?asPresentation(key,data[key]):neutral();const hasBindings=Object.hasOwn(data,'__avalancheBindings');if(hasBindings)next.__avalancheBindings=cleanBindings(data.__avalancheBindings);state=Object.freeze(next);if(hasBindings&&typeof __XenAvalanche!=='undefined')__XenAvalanche.restore(next.__avalancheBindings);notify();}
 function capture(items){const entries=items||__XenQuick.getItems(),out=Object.fromEntries(entries.filter(e=>['material','bass','rootFollow','drum'].includes(e.kind)).map(e=>{const key=keyFor(e.kind,e.id);return[key,clean(get(key))]}));for(const key of ['particle:instrument','wave:instrument','keyboard:instrument'])out[key]=asPresentation(key,get(key));const active=typeof __XenMetaSessions!=='undefined'?__XenMetaSessions.snapshot():null;const fillId=active?.activePalette?.id??active?.loadedId??null;const fillSlots=typeof __XenOneShotAssignments!=='undefined'?__XenOneShotAssignments.read(fillId):null;for(const item of [...(fillSlots?.melodic||[]),...(fillSlots?.drum||[])]){const fillKey=keyFor('oneShot',item.kind+'|'+item.id);out[fillKey]=asPresentation(fillKey,get(fillKey))}const b=bindings();if(Object.keys(b).length)out.__avalancheBindings=b;return out;}
 function signalLibrary(){version++;for(const fn of listeners)fn()}
 // Freeze ends when this loaded app session closes, not when a source changes.
 function freeze(key){frozenPattern=template(get(key));signalLibrary();return {ok:true}}
 const frozen=()=>frozenPattern?template(frozenPattern):null;
 function clearFrozen(){frozenPattern=null;signalLibrary();return {ok:true}}
 function applyFrozen(key){if(!frozenPattern)return {ok:false,error:'Nothing frozen'};set(key,template(frozenPattern));return {ok:true}}
 const listPatterns=()=>[...savedPatterns.map(x=>({...x,...template(x)})),{id:__XenTroodleFactoryEQId,name:'troodle (Preset) · EQ',createdAt:0,readOnly:true,...template(__XenTroodleFactoryEQ)}];
 function persistPattern(name,value){
  const label=typeof name==='string'?name.trim().slice(0,64):'';
  if(!label)return {ok:false,error:'Enter a pattern name'};
  if(savedPatterns.length>=PATTERN_MAX)return {ok:false,error:'EQ library is full ('+PATTERN_MAX+' patterns)'};
  const id='eq-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
  const next=[...savedPatterns,{id,name:label,createdAt:Date.now(),...template(value)}];
  try{localStorage.setItem(PATTERN_KEY,JSON.stringify({version:1,patterns:next}))}
  catch{return {ok:false,error:'Could not save EQ pattern to browser storage'}}
  savedPatterns=next;signalLibrary();return {ok:true,id};
 }
 function savePattern(key,name){return persistPattern(name,get(key))}
 function saveFrozenPattern(name){return frozenPattern?persistPattern(name,frozenPattern):{ok:false,error:'Nothing frozen'}}
 function applyPattern(id,key){const item=id===__XenTroodleFactoryEQId?__XenTroodleFactoryEQ:savedPatterns.find(x=>x.id===id);if(!item)return {ok:false,error:'EQ pattern not found'};set(key,template(item));return {ok:true}}
 function removePattern(id){if(id===__XenTroodleFactoryEQId)return {ok:false,error:'Factory EQ is read-only'};const next=savedPatterns.filter(x=>x.id!==id);
  if(next.length===savedPatterns.length)return {ok:false,error:'EQ pattern not found'};
  try{localStorage.setItem(PATTERN_KEY,JSON.stringify({version:1,patterns:next}))}
  catch{return {ok:false,error:'Could not update EQ library'}}
  savedPatterns=next;signalLibrary();return {ok:true};
 }
 function sample(curve,x){const p=clamp(x,0,1)*359,i=Math.floor(p),f=p-i;return curve[i]*(1-f)+curve[Math.min(359,i+1)]*f;}
 const db=(value,cfg)=>value>=0?value*cfg.high:-value*cfg.low;
 function target(cfg,x){return cfg.enabled?(cfg.holdDepth??1)*(db(sample(cfg.a,x),cfg)*(1-cfg.morph)+db(sample(cfg.b,x),cfg)*cfg.morph):0;}
 // Sparse log-frequency dictionary: more filter resolution where the curve needs it.
 // P6: retain exactly six candidates per frequency while placing more
 // resolution in the moderate-Q region. The filter response is NOT redrawn;
 // these are the DSP filter options that the audio engine really uses.
 // Every dictionary entry is a real BiquadFilter 'peaking' response, not a Gaussian
 // approximation or a point sample of a shelf. Bank is generated once per sample rate.
 const FIT_POINTS=360,FIT_POSITIONS=39,FIT_Q=[.9,2,3.5,5,9,18],fitBanks=new Map(),planCache=new WeakMap();
 function peakCoefficients(frequency,gain,q,sampleRate){
  const A=Math.pow(10,gain/40),w=2*Math.PI*frequency/sampleRate,c=Math.cos(w),alpha=Math.sin(w)/(2*q);
  return [1+alpha*A,-2*c,1-alpha*A,1+alpha/A,-2*c,1-alpha/A];
 }
 function magnitudeDb(co,pt){const [b0,b1,b2,a0,a1,a2]=co;
  const nr=b0+b1*pt.c1+b2*pt.c2,ni=-b1*pt.s1-b2*pt.s2;
  const dr=a0+a1*pt.c1+a2*pt.c2,di=-a1*pt.s1-a2*pt.s2;
  return 10*Math.log10(Math.max(1e-30,(nr*nr+ni*ni)/(dr*dr+di*di)));
 }
 function* fitBankSteps(sampleRate){
  if(fitBanks.has(sampleRate))return fitBanks.get(sampleRate);
  const top=Math.min(20000,sampleRate*.45),ratio=top/20;
  const points=Array.from({length:FIT_POINTS},(_,i)=>{const f=20*Math.pow(ratio,i/(FIT_POINTS-1)),w=2*Math.PI*f/sampleRate;
   return {c1:Math.cos(w),s1:Math.sin(w),c2:Math.cos(2*w),s2:Math.sin(2*w)};
  });
  const candidates=[];
  for(let i=0;i<FIT_POSITIONS;i++){
   const x=i/(FIT_POSITIONS-1),frequency=20*Math.pow(ratio,x);
   for(const q of FIT_Q){const co=peakCoefficients(frequency,1,q,sampleRate);
    const basis=Float32Array.from(points,pt=>magnitudeDb(co,pt));
    let norm=0;for(let j=0;j<FIT_POINTS;j++)norm+=basis[j]*basis[j];
    candidates.push({x,frequency,q,basis,norm:norm+.04});
   }
   yield; // Initial dictionary construction must not monopolize the CPU either.
  }
  const bank={top,ratio,points,candidates};fitBanks.set(sampleRate,bank);return bank;
 }
 function fitBank(sampleRate){
  const steps=fitBankSteps(sampleRate);let next=steps.next();
  while(!next.done)next=steps.next();return next.value;
 }
 function bandResponse(frequency,q,gain,bank){
  const co=peakCoefficients(frequency,gain,q,bank.sampleRate);
  return Float64Array.from(bank.points,pt=>magnitudeDb(co,pt));
 }
 // Raster explicitly binds each visible log-frequency band to its painted value.
 // Narrow peaking bells are independently tunable; center accuracy is reported
 // separately from the full-curve error. Only one fixed native filter per band.
 // Raster geometry is invariant for each (sample rate, band count) pair.
 // Reuse frequency/Q/center trig; only gains vary during brush and morph.
 const rasterGeometries=new Map();
 function rasterGeometry(sampleRate,n){
  const key=sampleRate+':'+n;
  if(rasterGeometries.has(key))return rasterGeometries.get(key);
  const top=Math.min(20000,sampleRate*.45),ratio=top/20;
  const anchors=Array.from({length:n},(_,i)=>(i+.5)/n);
  const freq=anchors.map(x=>20*Math.pow(ratio,x));
  const centers=freq.map(f=>{const w=2*Math.PI*f/sampleRate;return{c1:Math.cos(w),s1:Math.sin(w),c2:Math.cos(2*w),s2:Math.sin(2*w)}});
  const coParams=freq.map(f=>{const w=2*Math.PI*f/sampleRate;return {cos:Math.cos(w),sinHalf:Math.sin(w)/2}});
  const result={anchors,freq,centers,coParams};
  rasterGeometries.set(key,result);return result;
 }
 function rasterPlan(cfg,sampleRate,provisional){
  const n=cfg.bands,{anchors,freq,centers,coParams}=rasterGeometry(sampleRate,n);
  const goals=anchors.map(x=>target(cfg,x));
  // Neighbour-aware bandwidth: equal painted bands must connect instead of
  // each turning into a separate narrow peak. Strong adjacent contrasts keep
  // narrow filters so a deliberate +/- zigzag remains independently playable.
  // Q changes do not require new audio nodes or new trig geometry.
  const smoothQ=Math.max(.3,n/12),edgeQ=Math.max(3.5,n*.55);
  const qs=goals.map((goal,i)=>{
   const delta=Math.max(i?Math.abs(goal-goals[i-1]):0,i+1<n?Math.abs(goal-goals[i+1]):0);
   const edge=Math.min(1,delta/48);
   return smoothQ+(edgeQ-smoothQ)*edge*edge;
  });
  const gains=goals.slice();
  const coefficients=(j)=>{
   const {cos,sinHalf}=coParams[j],alpha=sinHalf/qs[j],A=Math.pow(10,gains[j]/40);
   return [1+alpha*A,-2*cos,1-alpha*A,1+alpha/A,-2*cos,1-alpha/A];
  };
  const coeff=Array.from({length:n},(_,j)=>coefficients(j));
  function at(i){let value=0;for(let j=0;j<n;j++)if(Math.abs(gains[j])>1e-8)value+=magnitudeDb(coeff[j],centers[i]);return value}
  if(!provisional){
   for(let pass=0;pass<12;pass++){
    let max=0;
    for(let i=0;i<n;i++){
     const error=goals[i]-at(i);max=Math.max(max,Math.abs(error));
     gains[i]=clamp(gains[i]+error,-72,24,goals[i]);coeff[i]=coefficients(i);
    }
    if(max<.025)break;
   }
  }
  const achieved=anchors.map((_,i)=>at(i));
  const bandError=Math.sqrt(goals.reduce((sum,v,i)=>sum+(v-achieved[i])**2,0)/n);
  const filters=Array.from({length:MAX},(_,i)=>i<n?{type:'peaking',frequency:freq[i],q:qs[i],gain:gains[i]}:{type:'peaking',frequency:1000,q:1,gain:0});
  return{mode:'raster',base:0,filters,knots:anchors,anchors:anchors.map((x,i)=>({x,goal:goals[i],actual:achieved[i]})),bandError,fitError:provisional?null:bandError,provisional:!!provisional};
 }
 // Incremental sparse optimization. Main-thread callers still get the exact same
 // synchronous algorithm through plan(); the Worker advances these checkpoints
 // under a short cooperative CPU slice and can cancel obsolete jobs.
 function* planSteps(cfg,sampleRate=48000){
  const cached=planCache.get(cfg);if(cached?.rate===sampleRate)return cached.plan;
  const top=Math.min(20000,sampleRate*.45),ratio=top/20;
  const zero=()=>({type:'peaking',frequency:1000,q:1,gain:0});
  const zeros=()=>Array.from({length:MAX},zero);
  if(!cfg.enabled){const result={mode:cfg.mode,base:0,filters:zeros(),knots:[],fitError:0};planCache.set(cfg,{rate:sampleRate,plan:result});return result}
  const goals=Float64Array.from({length:FIT_POINTS},(_,i)=>target(cfg,i/(FIT_POINTS-1)));
  let low=Infinity,high=-Infinity,sum=0;
  for(const v of goals){low=Math.min(low,v);high=Math.max(high,v);sum+=v}
  if(cfg.mode==='raster'){const result=rasterPlan(cfg,sampleRate,false);planCache.set(cfg,{rate:sampleRate,plan:result});return result}
  if(high-low<1e-6){const result={mode:cfg.mode,base:sum/FIT_POINTS,filters:zeros(),knots:[],fitError:0};planCache.set(cfg,{rate:sampleRate,plan:result});return result}
  // Pointer movement never runs the expensive adaptive fit on the UI thread.
  // A bounded, frequency-correct provisional graph plays during a gesture;
  // one accurate sparse fit replaces it when the pointer is released.
  if(fastCurves.has(cfg)){
   const bands=cfg.bands,values=Array.from({length:bands},(_,i)=>target(cfg,(i+.5)/bands));
   const avg=values.reduce((a,b)=>a+b,0)/bands;
   const filters=values.map((v,i)=>({type:'peaking',frequency:20*Math.pow(ratio,(i+.5)/bands),q:Math.max(1.2,bands/5),gain:clamp(v-avg,-48,20)}));
   while(filters.length<MAX)filters.push(zero());
   const result={mode:'adaptive',base:avg,filters,knots:filters.slice(0,bands).map(x=>Math.log(x.frequency/20)/Math.log(ratio)),fitError:null,provisional:true};
   planCache.set(cfg,{rate:sampleRate,plan:result});return result;
  }
  // Robust baseline keeps a small number of narrow spikes from moving the entire EQ.
  const sorted=Array.from(goals).sort((a,b)=>a-b);
  let base=(sorted[Math.floor((FIT_POINTS-1)/2)]+sorted[Math.ceil((FIT_POINTS-1)/2)])/2;
  const bank=yield* fitBankSteps(sampleRate);bank.sampleRate=sampleRate;
  const residual=Float64Array.from(goals,v=>v-base),chosen=[];
  const maxGain=20,minGain=-48;
  for(let band=0;band<cfg.bands;band++){
   // Correlation search chooses steep edges, narrow spikes and broad plateaus on
   // their actual acoustic error; no regular-grid sampling or compulsory smoothing.
   const leaders=[];let scanned=0;
   for(const candidate of bank.candidates){
    let dot=0;const b=candidate.basis;
    for(let j=0;j<FIT_POINTS;j++)dot+=residual[j]*b[j];
    const gain=clamp(dot/candidate.norm,minGain,maxGain);
    const gainScore=2*gain*dot-gain*gain*candidate.norm;
    if(gainScore>0){
     if(leaders.length<12){leaders.push({candidate,gain,score:gainScore});leaders.sort((a,b)=>b.score-a.score)}
     else if(gainScore>leaders[11].score){leaders[11]={candidate,gain,score:gainScore};leaders.sort((a,b)=>b.score-a.score)}
    }
    if(++scanned%12===0)yield; // Let newly drawn curves preempt the dictionary search.
   }
   if(!leaders.length)break;
   let best=null;
   for(const {candidate,gain} of leaders){
    const gainResponse=bandResponse(candidate.frequency,candidate.q,gain,bank);
    let improvement=0;
    for(let j=0;j<FIT_POINTS;j++)improvement+=gainResponse[j]*(2*residual[j]-gainResponse[j]);
    if(!best||improvement>best.improvement)best={candidate,gain,gainResponse,improvement};
   }
   if(best.improvement<.12)break;
   chosen.push({frequency:best.candidate.frequency,x:best.candidate.x,q:best.candidate.q,gain:best.gain,curve:best.gainResponse});
   let correction=0;
   for(let j=0;j<FIT_POINTS;j++){residual[j]-=best.gainResponse[j];correction+=residual[j]}
   // Constant gain does not need a filter; fit it exactly in an ordinary GainNode.
   correction=clamp(base+correction/FIT_POINTS,cfg.low,cfg.high)-base;
   base+=correction;for(let j=0;j<FIT_POINTS;j++)residual[j]-=correction;
   yield; // Safe checkpoint after a complete sparse-filter selection.
  }
  // One bounded coordinate pass: correct overlapping bells using their real RBJ
  // responses rather than trusting small-signal dictionary approximations.
  for(let pass=0;pass<2;pass++){
   for(const filter of chosen){
    const test=bandResponse(filter.frequency,filter.q,filter.gain+1,bank);
    let dot=0,norm=.06;
    for(let j=0;j<FIT_POINTS;j++){const slope=test[j]-filter.curve[j];dot+=residual[j]*slope;norm+=slope*slope}
    const next=clamp(filter.gain+dot/norm,minGain,maxGain);
    if(Math.abs(next-filter.gain)<.01)continue;
    const curve=bandResponse(filter.frequency,filter.q,next,bank);
    for(let j=0;j<FIT_POINTS;j++)residual[j]+=filter.curve[j]-curve[j];
    filter.gain=next;filter.curve=curve;
   }
   let correction=0;for(const v of residual)correction+=v;
   correction=clamp(base+correction/FIT_POINTS,cfg.low,cfg.high)-base;
   base+=correction;for(let j=0;j<FIT_POINTS;j++)residual[j]-=correction;
   yield; // Joint refinement is lower priority than transport/audio continuity.
  }
  // The target is authoritative at *every* frequency, not only at a filter's
  // anchor. A gentle local envelope detects invented resonances inside a flat
  // or monotonically drawn region. It NEVER changes or smooths either curve.
  // 3 samples (~0.8% of the log-frequency axis) permit the unavoidable
  // transitional shoulder at steep, intentional edges.
  const guardLow=new Float64Array(FIT_POINTS),guardHigh=new Float64Array(FIT_POINTS);
  for(let j=0;j<FIT_POINTS;j++){
   let lo=Infinity,hi=-Infinity;
   for(let k=Math.max(0,j-3);k<=Math.min(FIT_POINTS-1,j+3);k++){
    if(goals[k]<lo)lo=goals[k];if(goals[k]>hi)hi=goals[k];
   }
   guardLow[j]=Math.max(cfg.low,lo-1.25);
   guardHigh[j]=Math.min(cfg.high,hi+1.25);
  }
  const RIPPLE_WEIGHT=14;
  // Jointly correct the nonlinear interaction of all selected filters.
  // Penalize actual ripple outside the drawn local envelope, while preserving
  // every original point and limiting native DSP to the same filter budget.
  const solve=(matrix,vector)=>{
   const n=vector.length,rows=matrix.map((row,i)=>[...row,vector[i]]);
   for(let col=0;col<n;col++){
    let pivot=col;for(let i=col+1;i<n;i++)if(Math.abs(rows[i][col])>Math.abs(rows[pivot][col]))pivot=i;
    if(Math.abs(rows[pivot][col])<1e-10)return null;
    [rows[col],rows[pivot]]=[rows[pivot],rows[col]];
    for(let i=col+1;i<n;i++){const k=rows[i][col]/rows[col][col];for(let j=col;j<=n;j++)rows[i][j]-=rows[col][j]*k}
   }
   const result=Array(n).fill(0);
   for(let i=n-1;i>=0;i--){let v=rows[i][n];for(let j=i+1;j<n;j++)v-=rows[i][j]*result[j];result[i]=v/rows[i][i]}
   return result;
  };
  function objective(r){let loss=0;for(let j=0;j<FIT_POINTS;j++){
   const actual=goals[j]-r[j],spill=Math.max(0,actual-guardHigh[j],guardLow[j]-actual);
   loss+=r[j]*r[j]+RIPPLE_WEIGHT*spill*spill;
  }return loss}
  // P6: retain one guarded joint-correction pass. Extra passes can chase
  // individually good anchors into neighboring ripples; reserve the CPU for
  // drawing/audio instead of repeatedly revisiting the same selected bells.
  for(let pass=0;pass<1 && chosen.length;pass++){
   const n=chosen.length,jac=chosen.map(filter=>{
    const plus=bandResponse(filter.frequency,filter.q,filter.gain+.5,bank);
    const minus=bandResponse(filter.frequency,filter.q,filter.gain-.5,bank);
    return Float64Array.from(plus,(v,j)=>v-minus[j]);
   });
   const matrix=Array.from({length:n},()=>Array(n).fill(0)),rhs=Array(n).fill(0);
   for(let j=0;j<FIT_POINTS;j++){
    const actual=goals[j]-residual[j],over=actual>guardHigh[j],under=actual<guardLow[j];
    const w=over||under?1+RIPPLE_WEIGHT:1;
    const error=residual[j]+(over?RIPPLE_WEIGHT*(guardHigh[j]-actual):under?RIPPLE_WEIGHT*(guardLow[j]-actual):0);
    for(let a=0;a<n;a++){
     const da=jac[a][j];rhs[a]+=da*error;
     for(let b=0;b<=a;b++)matrix[a][b]+=w*da*jac[b][j];
    }
    if((j+1)%24===0)yield; // Matrix accumulation is CPU-heavy at 24 filters.
   }
   for(let a=0;a<n;a++){
    for(let b=a+1;b<n;b++)matrix[a][b]=matrix[b][a];
    matrix[a][a]+=.3;
   }
   const direction=solve(matrix,rhs);if(!direction)break;
   const before=objective(residual);let update=null;
   for(const fraction of [1,.5,.25]){
    const trial=chosen.map((filter,i)=>{
     const gain=clamp(filter.gain+clamp(direction[i],-6,6)*fraction,minGain,maxGain);
     return {gain,curve:bandResponse(filter.frequency,filter.q,gain,bank)};
    });
    const trialResidual=Float64Array.from(goals,v=>v-base);
    for(const f of trial){for(let j=0;j<FIT_POINTS;j++)trialResidual[j]-=f.curve[j];yield}
    const loss=objective(trialResidual);
    if(loss<before-1e-4){update={trial,trialResidual};break}
   }
   if(!update)break;
   for(let i=0;i<n;i++){chosen[i].gain=update.trial[i].gain;chosen[i].curve=update.trial[i].curve}
   residual.set(update.trialResidual);
   yield; // Worker may observe cancellation between Gauss-Newton steps.
  }
  const filters=chosen.map(({frequency,q,gain})=>({type:'peaking',frequency,q,gain}));
  const knots=chosen.filter(x=>Math.abs(x.gain)>.1).map(x=>x.x).sort((a,b)=>a-b);
  while(filters.length<MAX)filters.push(zero());
  const rmse=Math.sqrt(residual.reduce((a,v)=>a+v*v,0)/FIT_POINTS);
  const result={mode:'adaptive',base,filters,knots,fitError:rmse};
  planCache.set(cfg,{rate:sampleRate,plan:result});return result;
 }
 function plan(cfg,sampleRate=48000){
  const steps=planSteps(cfg,sampleRate);
  let next=steps.next();while(!next.done)next=steps.next();
  return next.value;
 }
 // Async EQ planning does not run the expensive sparse optimizer on the audio
 // control thread. The canonical 360-point curves are never altered. A single
 // Worker serializes full fits; each source/rate retains only its latest request.
 // With Worker unavailable, keep the inexpensive provisional response instead
 // of introducing a >100 ms blocking fallback while other tracks are playing.
 const liveEntries=new Map(),livePending=new Map(),fitResultCache=new Map();
 // Cache the proof that a curve's effective A/B mix is constant; this is exact
 // against the canonical 360 control samples, not a subjective smoothing rule.
 // Flat profiles, including neutral/default material tracks, need no Worker.
 const flatTargets=new WeakMap();
 function isFlatTarget(cfg){
  if(flatTargets.has(cfg))return flatTargets.get(cfg);
  const first=target(cfg,0);let flat=true;
  for(let i=1;i<360;i++)if(Math.abs(target(cfg,i/359)-first)>1e-9){flat=false;break}
  flatTargets.set(cfg,flat);return flat;
 }
 let fitWorker=null,fitWorkerFailed=false,fitRunning=null,fitSequence=0;
 const FIT_CACHE_MAX=12;
 function fitFingerprint(cfg,rate){
  // Exact numeric fingerprint: never deduplicate nearby but different drawings.
  // JSON serialization occurs only on settle, never on the pointer hotpath.
  return JSON.stringify([rate,cfg.enabled,cfg.bands,cfg.mode,cfg.low,cfg.high,cfg.morph,cfg.holdDepth??1,cfg.a,cfg.b]);
 }
 function workerSource(){return [
  'const MAX=24,FIT_POINTS=360,FIT_POSITIONS=39,FIT_Q=[.9,2,3.5,5,9,18];',
  'const fitBanks=new Map(),planCache=new WeakMap(),fastCurves=new WeakSet(),rasterGeometries=new Map();',
  'const clamp='+clamp.toString()+';',sample.toString(),'const db='+db.toString()+';',target.toString(),
  peakCoefficients.toString(),magnitudeDb.toString(),fitBankSteps.toString(),fitBank.toString(),
  bandResponse.toString(),rasterGeometry.toString(),rasterPlan.toString(),planSteps.toString(),plan.toString(),
  // A Worker cannot interrupt a synchronous native Biquad calculation, but
  // can yield between small, bounded filter-optimizer stages. The delay is
  // intentional: give audio/transport scheduling a chance to win CPU time.
  `let work=null;
   const SLICE_MS=2,REST_MS=12;
   function step(){
    if(!work)return;
    const current=work;
    if(current.cancelled){work=null;self.postMessage({id:current.id,cancelled:true});return}
    const now=()=>typeof performance!=='undefined'?performance.now():Date.now();
    const started=now();let next;
    try{
     do{
      next=current.steps.next();
      if(current.cancelled)break;
     }while(!next.done&&now()-started<SLICE_MS);
    }catch(error){work=null;self.postMessage({id:current.id,error:String(error)});return}
    if(current.cancelled){work=null;self.postMessage({id:current.id,cancelled:true});return}
    if(next.done){work=null;self.postMessage({id:current.id,result:next.value});return}
    setTimeout(step,REST_MS);
   }
   self.onmessage=e=>{
    const data=e.data||{};
    if(data.cancel!==undefined){if(work&&work.id===data.cancel)work.cancelled=true;return}
    if(work){self.postMessage({id:data.id,error:'Worker single-flight invariant violation'});return}
    work={id:data.id,steps:planSteps(data.cfg,data.rate),cancelled:false};
    setTimeout(step,0);
   };`
 ].join('\n')}
 function signalPlans(){
  if(pending===null)pending=requestAnimationFrame(refresh);
  version++;for(const fn of listeners)fn();
 }
 function startFitWorker(){
  if(fitWorker||fitWorkerFailed)return fitWorker;
  if(typeof Worker!=='function'||typeof Blob!=='function'||typeof URL==='undefined'||!URL.createObjectURL){fitWorkerFailed=true;return null}
  let url;
  try{
   url=URL.createObjectURL(new Blob([workerSource()],{type:'text/javascript'}));
   fitWorker=new Worker(url);
   fitWorker.onmessage=event=>{
    const data=event.data||{},active=fitRunning;
    if(!active||data.id!==active.id)return;
    fitRunning=null;
    const {entry,epoch,fingerprint}=active;
    if(data.cancelled){dispatchFit();return}
    if(data.error){fitWorkerFailed=true;try{fitWorker?.terminate()}catch{}fitWorker=null;livePending.clear();signalPlans();return}
    const result=data.result;
    if(result&&Array.isArray(result.filters)&&result.filters.length===MAX){
     // The initiating source may have moved on while a second material track
     // still needs exactly this result. Keep it only if a live consumer exists.
     let interested=false;
     for(const other of liveEntries.values()){
      if(other.fingerprint!==fingerprint||!other.cfg||other.cfg.mode!=='adaptive'||
         !other.cfg.enabled||fastCurves.has(other.cfg))continue;
      other.ready=result;interested=true;
     }
     if(interested){
      fitResultCache.delete(fingerprint);fitResultCache.set(fingerprint,result);
      if(fitResultCache.size>FIT_CACHE_MAX)fitResultCache.delete(fitResultCache.keys().next().value);
      signalPlans();
     }
    }
    dispatchFit();
   };
   fitWorker.onerror=()=>{fitWorkerFailed=true;try{fitWorker.terminate()}catch{}fitWorker=null;fitRunning=null;livePending.clear();signalPlans()};
  }catch(error){fitWorkerFailed=true;fitWorker=null}
  finally{if(url)URL.revokeObjectURL(url)}
  return fitWorker;
 }
 function cancelUnusedFit(){
  if(!fitRunning||fitRunning.cancelRequested||!fitWorker)return;
  const fingerprint=fitRunning.fingerprint;
  // Never cancel a shared fit while even one independent track needs it.
  for(const other of liveEntries.values()){
   if(other.fingerprint===fingerprint&&other.cfg&&other.cfg.enabled&&
      other.cfg.mode==='adaptive'&&!fastCurves.has(other.cfg))return;
  }
  fitRunning.cancelRequested=true;
  try{fitWorker.postMessage({cancel:fitRunning.id})}catch{}
 }
 function dispatchFit(){
  if(fitRunning||!livePending.size)return;
  // A completed result may be shared across many separate source entries.
  // Queued duplicates need no additional full fit even if they arrived while
  // the original Worker task was already in progress.
  let reused=false,job=null;
  for(const [key,item] of livePending){
   livePending.delete(key);
   if(item.entry.epoch!==item.epoch||item.entry.fingerprint!==item.fingerprint)continue;
   const cached=fitResultCache.get(item.fingerprint);
   if(cached){item.entry.ready=cached;reused=true;continue}
   job=item;break;
  }
  if(reused)signalPlans();
  if(!job)return;
  const worker=startFitWorker();if(!worker){livePending.clear();return}
  fitRunning={...job,id:++fitSequence};
  try{worker.postMessage({id:fitRunning.id,cfg:job.cfg,rate:job.rate})}
  catch(error){fitRunning=null;fitWorkerFailed=true;try{worker.terminate()}catch{}fitWorker=null;livePending.clear();signalPlans()}
 }
 function autoLivePlan(cfg,rate=48000,sourceKey='preview'){
  const key=String(sourceKey)+'@'+rate;
  // During an A/B gesture: no full-fit fingerprint, no Worker job, no stale
  // exact-fit adoption. Raster remains calibrated and unchanged.
  if(cfg.mode==='adaptive'&&cfg.enabled&&morphGestures.has(String(sourceKey))&&!isFlatTarget(cfg)){
   let entry=liveEntries.get(key);
   if(entry?.cfg===cfg)return entry.preview;
   if(!entry){entry={epoch:0};liveEntries.set(key,entry)}
   if(entry.delay){clearTimeout(entry.delay);entry.delay=null}
   entry.epoch++;entry.cfg=cfg;entry.ready=null;entry.fingerprint=null;
   livePending.delete(key);cancelUnusedFit();
   const draft={...cfg};fastCurves.add(draft);
   entry.preview=plan(draft,rate);
   return entry.preview;
  }
  if(cfg.mode!=='adaptive'||!cfg.enabled||fastCurves.has(cfg)||isFlatTarget(cfg)){
   // Changing mode, bypassing, or beginning another gesture invalidates a
   // pending expensive fit immediately; never spend CPU on superseded work.
   const previous=liveEntries.get(key);
   if(previous&&previous.cfg!==cfg){
    previous.epoch++;previous.cfg=cfg;previous.ready=null;previous.fingerprint=null;
    if(previous.delay){clearTimeout(previous.delay);previous.delay=null}
    livePending.delete(key);cancelUnusedFit();
   }
   return plan(cfg,rate);
  }
  let entry=liveEntries.get(key);
  if(entry&&entry.cfg===cfg)return entry.ready||entry.preview;
  if(!entry){entry={epoch:0};liveEntries.set(key,entry)}
  entry.epoch++;entry.cfg=cfg;entry.ready=null;entry.fingerprint=null;
  cancelUnusedFit();
  // Immediately provide a cheap, frequency-correct response while a new fit
  // is pending. Avoid mutating the cfg used by the editor/history.
  const draft={...cfg};fastCurves.add(draft);
  entry.preview=plan(draft,rate);
  if(entry.delay)clearTimeout(entry.delay);
  const epoch=entry.epoch;
  entry.fingerprint=fitFingerprint(cfg,rate);
  const cached=fitResultCache.get(entry.fingerprint);
  if(cached){
   entry.ready=cached;
   // An audio owner may adopt a previously finished fit from the LRU without
   // any Worker completion event. Tell an open EQ panel to replace its interim
   // white preview too; otherwise it can remain visually stale indefinitely.
   queueMicrotask(signalPlans);
   return cached;
  }
  if(!fitWorkerFailed){
   // Paint/settle yield longer to live audio; direct morph and ordinary imports
   // retain their established 125-ms fit latency after finalization.
   const fitDebounce=['paint','settle'].includes(audioIntent(sourceKey))?275:125;
   // Debounce across gestures and source changes; stale worker results never
   // reach live nodes. The worker is single-flight to limit CPU competition.
   entry.delay=setTimeout(()=>{
    entry.delay=null;
    if(entry.epoch!==epoch||fastCurves.has(entry.cfg))return;
    livePending.set(key,{entry,epoch,fingerprint:entry.fingerprint,cfg:entry.cfg,rate});
    dispatchFit();
   },fitDebounce);
  }
  return entry.preview;
 }
 // Manual anchors never enter the Worker. Preserve the exact original fit for
 // unchanged target arrays while a handle moves, and apply only a frequency
 // substitution to the already chosen native Biquad slots. No re-fitting,
 // additional filters, or allocations on the AudioWorklet hotpath.
 const manualBaseCfg=new Map(),manualPlans=new WeakMap();
 function autoCfg(cfg,sourceKey){
  if(!cfg.manualCenters?.some(Number.isFinite))return cfg;
  const key=String(sourceKey),old=manualBaseCfg.get(key);
  const same=old&&['a','b','morph','bands','mode','low','high','enabled','holdDepth'].every(k=>old.cfg[k]===cfg[k]);
  if(same){old.cfg=cfg;return old.base}
  const base={...cfg,manualCenters:[]};manualBaseCfg.set(key,{cfg,base});return base;
 }
 function shiftedPlan(planValue,cfg,rate){
  if(!cfg.manualCenters?.some(Number.isFinite)||planValue.mode!=='adaptive')return planValue;
  const old=manualPlans.get(cfg);if(old?.base===planValue&&old.rate===rate)return old.plan;
  const top=Math.min(20000,rate*.45),ratio=Math.log(top/20);
  const filters=planValue.filters.map((f,i)=>{const moved=cfg.manualCenters[i];
   return f.type==='peaking'&&Math.abs(f.gain)>.1&&Number.isFinite(moved)?{...f,frequency:clamp(moved,20,top)}:f;
  });
  const knots=filters.filter(f=>f.type==='peaking'&&Math.abs(f.gain)>.1).map(f=>Math.log(f.frequency/20)/ratio).sort((a,b)=>a-b);
  const result={...planValue,filters,knots,manual:true,fitError:null};
  manualPlans.set(cfg,{base:planValue,rate,plan:result});return result;
 }
 function livePlan(cfg,rate=48000,sourceKey='preview'){
  return shiftedPlan(autoLivePlan(autoCfg(cfg,sourceKey),rate,sourceKey),cfg,rate);
 }
 function moveBand(key,index,frequency){
  const cfg=get(key);if(cfg.mode!=='adaptive'||!Number.isInteger(index)||index<0||index>=cfg.bands)return false;
  const next=[...(cfg.manualCenters||[])];next[index]=clamp(frequency,20,20000);
  if(next[index]===cfg.manualCenters[index])return true;
  set(key,{manualCenters:next});return true;
 }
 // UI previews are observers, not fit owners. A stale paint snapshot must
 // never invalidate an audio owner's epoch or replace its Worker request.
 // Reuse the current audio owner's resolved plan when identity matches;
 // otherwise compute only the bounded fast response without a Worker job.
 // A WeakMap keeps transient editor snapshots collectible.
 const displayPlans=new WeakMap();
 function peekPlan(cfg,rate=48000,sourceKey='preview'){
  const base=autoCfg(cfg,sourceKey);
  return shiftedPlan(peekAutoPlan(base,rate,sourceKey),cfg,rate);
 }
 function peekAutoPlan(cfg,rate=48000,sourceKey='preview'){
  // Raster calibration is bounded and cached; observers use the same bank as audio.
  if(cfg.mode==='raster')return plan(cfg,rate);
  const owned=liveEntries.get(String(sourceKey)+'@'+rate);
  if(owned?.cfg===cfg)return owned.ready||owned.preview;
  const cached=displayPlans.get(cfg);
  if(cached?.rate===rate)return cached.plan;
  const draft={...cfg};fastCurves.add(draft);
  const response=plan(draft,rate);
  displayPlans.set(cfg,{rate,plan:response});
  return response;
 }
 function releaseLiveKey(key){
  for(const [name,entry] of liveEntries){if(name.startsWith(String(key)+'@')){
   if(entry.delay)clearTimeout(entry.delay);entry.epoch++;liveEntries.delete(name);livePending.delete(name);
  }}
  cancelUnusedFit();manualBaseCfg.delete(String(key));
 }
 // Audio devices own the last key they actually resolved. A selection callback
 // may change before refresh/dispose, so it cannot describe former fit owners.
 function releaseUnownedKey(key){
  for(const d of devices)if(deviceKeys.get(d)===key)return;
  releaseLiveKey(key);
  const hold=audioHolds.get(key);if(hold){clearTimeout(hold.timer);audioHolds.delete(key)}
 }
 function ownDeviceKey(d,key){
  const previous=deviceKeys.get(d);if(previous===key)return;
  deviceKeys.set(d,key);
  if(previous!==undefined)releaseUnownedKey(previous);
 }
 function smooth(param,value,ctx,initial){if(initial){param.value=value;return}const now=ctx.currentTime;
  if(typeof param.cancelAndHoldAtTime==='function')param.cancelAndHoldAtTime(now);else{param.cancelScheduledValues(now);param.setValueAtTime(param.value,now)}
  param.setTargetAtTime(value,now,.012);
 }
 function create(ctx,key){
  const input=ctx.createGain(),output=ctx.createGain(),dry=ctx.createGain();
  dry.gain.value=1;input.connect(dry);dry.connect(output);
  let current=null,disposed=false,lastTargets=null,liveBackend=null,liveGate=null,upgradeTimer=null;
  let backendState='native',backendError=null;
  const retiring=new Set();
  function disconnectPath(path){
   if(path.timer){clearTimeout(path.timer);path.timer=null}
   if(path.connected){try{input.disconnect(path.gate)}catch{}path.connected=false}
   for(const n of [path.gate,path.base,...path.filters])try{n.disconnect()}catch{}
   retiring.delete(path);
  }
  function retire(path){
   if(!path||path.timer)return;
   path.timer=setTimeout(()=>{path.timer=null;if(disposed||current!==path||path.quiet){if(current===path)current=null;disconnectPath(path)}},150);
   retiring.add(path);
  }
  function createPath(count){
   const gate=ctx.createGain(),base=ctx.createGain();gate.gain.value=0;base.gain.value=1;
   gate.connect(base);let tail=base;
   const filters=Array.from({length:count},()=>{
    const node=ctx.createBiquadFilter();node.type='peaking';node.frequency.value=1000;node.Q.value=1;node.gain.value=0;
    tail.connect(node);tail=node;return node;
   });tail.connect(output);input.connect(gate);
   return {gate,base,filters,count,connected:true,timer:null};
  }
  const d={ctx,key,input,output,last:null,appliedPlan:null,apply(cfg,initial=false,resolvedPlan=null,intent='standard'){
   if(disposed)return;
   const sourceKey=typeof key==='function'?key():key;
   ownDeviceKey(d,sourceKey);
   const p=resolvedPlan||livePlan(cfg,ctx.sampleRate,sourceKey),nonzero=Math.abs(p.base)>1e-8||p.filters.some(x=>Math.abs(x.gain)>1e-8);
   const count=cfg.bands;
   if(liveBackend){liveBackend.apply(p,count,intent);d.appliedPlan=p;return}
   if(!nonzero||(!p.provisional&&p.filters.every(x=>Math.abs(x.gain)<1e-8))){
    // A constant dB curve needs only the existing dry GainNode, not 4–24
    // always-on zero-gain Biquads. Preserve the requested overall gain.
    if(current&&!current.quiet){current.quiet=true;current.active=false;smooth(current.gate.gain,0,ctx,initial);retire(current)}
    smooth(dry.gain,nonzero?Math.pow(10,p.base/20):1,ctx,initial);
    d.appliedPlan=p;return;
   }
   if(!current||current.count!==count){
    const previous=current;
    current=createPath(count);lastTargets=null;
    if(previous){previous.quiet=true;previous.active=false;smooth(previous.gate.gain,0,ctx,initial);retire(previous)}
   }else if(!current.connected){
    if(current.timer){clearTimeout(current.timer);current.timer=null;retiring.delete(current)}
    input.connect(current.gate);current.connected=true;
   }else if(current.timer){clearTimeout(current.timer);current.timer=null;retiring.delete(current)}
   const shouldFade=!current.active;current.quiet=false;current.active=true;
   const nextBase=Math.pow(10,p.base/20);
   if(initial||!lastTargets||Math.abs(nextBase-lastTargets.base)>1e-10)smooth(current.base.gain,nextBase,ctx,initial);
   for(let i=0;i<current.count;i++){
    const desired=p.filters[i],node=current.filters[i],previous=lastTargets?.filters[i];
    if(initial||!previous||Math.abs(desired.frequency-previous.frequency)>1e-8)smooth(node.frequency,desired.frequency,ctx,initial);
    if(initial||!previous||Math.abs(desired.q-previous.q)>1e-8)smooth(node.Q,desired.q,ctx,initial);
    if(initial||!previous||Math.abs(desired.gain-previous.gain)>1e-8)smooth(node.gain,desired.gain,ctx,initial);
   }
   lastTargets={base:nextBase,filters:p.filters.slice(0,count).map(f=>({frequency:f.frequency,q:f.q,gain:f.gain}))};
   if(shouldFade){smooth(current.gate.gain,1,ctx,initial);smooth(dry.gain,0,ctx,initial)}
   d.appliedPlan=p;
  },dispose(){
   if(disposed)return;disposed=true;devices.delete(d);ctx.removeEventListener?.('statechange',closed);
   if(upgradeTimer)clearTimeout(upgradeTimer);liveBackend?.dispose();liveBackend=null;
   try{liveGate?.disconnect()}catch{}liveGate=null;
   if(current)disconnectPath(current);for(const old of [...retiring])disconnectPath(old);
   const sourceKey=deviceKeys.get(d);deviceKeys.delete(d);
   if(sourceKey!==undefined)releaseUnownedKey(sourceKey);
   for(const node of [input,dry,output])try{node.disconnect()}catch{}
  },response(){return{base:current?.base||null,filters:current?.filters||[]}},
  get backend(){return backendState},get liveStatus(){return liveBackend?.status||{backend:backendState,error:backendError}},
  get filterCount(){return liveBackend?(d.appliedPlan?.filters.slice(0,get(typeof key==='function'?key():key).bands).filter(f=>Math.abs(f.gain)>1e-8).length||0):current?.count||0}};
  const closed=()=>{if(ctx.state==='closed')d.dispose()};ctx.addEventListener?.('statechange',closed);devices.add(d);
  const cfg=get(typeof key==='function'?key():key);d.apply(cfg,true);d.last=cfg;version++;for(const fn of listeners)fn();
  // Keep native compatibility for OfflineAudioContext and unsupported browsers.
  // Warm in parallel before one bridge; no asynchronous rewrite of source/voice owners.
  if(typeof __XenEqLive!=='undefined'&&ctx.audioWorklet&&typeof ctx.startRendering!=='function'){
   backendState='preparing';
   __XenEqLive.prepare(ctx).then(()=>{
    if(disposed||ctx.state==='closed')return;
    const sourceKey=typeof key==='function'?key():key;ownDeviceKey(d,sourceKey);
    const latest=get(sourceKey),p=livePlan(latest,ctx.sampleRate,sourceKey);
    const candidate=__XenEqLive.create(ctx,p,latest.bands,{deferTransitions:/^avalanche:/.test(typeof key==='function'?key():key)}),gate=ctx.createGain();gate.gain.value=0;
    input.connect(candidate.node);candidate.node.connect(gate);gate.connect(output);
    liveBackend=candidate;liveGate=gate;backendState='warming';
    candidate.node.onprocessorerror=()=>{
     if(disposed)return;backendError='EQ processor error; native fallback';backendState='native-fallback';
     if(upgradeTimer)clearTimeout(upgradeTimer);upgradeTimer=null;
     try{input.disconnect(candidate.node)}catch{}candidate.dispose();try{gate.disconnect()}catch{}
     liveBackend=null;liveGate=null;lastTargets=null;
     if(current)current.active=false;
     const now=get(typeof key==='function'?key():key);d.apply(now,true);d.last=now;
    };
    upgradeTimer=setTimeout(()=>{
     upgradeTimer=null;if(disposed||liveBackend!==candidate)return;
     backendState='worklet';smooth(gate.gain,1,ctx,false);smooth(dry.gain,0,ctx,false);
     if(current)smooth(current.gate.gain,0,ctx,false);
     upgradeTimer=setTimeout(()=>{
      upgradeTimer=null;if(disposed||liveBackend!==candidate)return;
      if(current){disconnectPath(current);current=null}for(const old of [...retiring])disconnectPath(old);lastTargets=null;
     },150);
    },60);
   }).catch(error=>{if(!disposed){backendState='native-fallback';backendError=String(error)}});
  }
  return d;
 }
 function route(ctx,kind,destination,id=null){let targets=routes.get(ctx);if(!targets){targets=new WeakMap();routes.set(ctx,targets)}let channels=targets.get(destination);if(!channels){channels=new Map();targets.set(destination,channels)}
  const routeKey=kind+':'+(id||'selected'),previous=channels.get(routeKey);
  if(previous){
   if(kind==='oneShot'&&previous.osqrTailTimer){
    // A new hit before the tail fade starts reuses the same EQ owner.
    // After fade begins it gets a new owner; the old one drains separately.
    if(ctx.currentTime<previous.osqrFadeAt){
     clearTimeout(previous.osqrTailTimer);previous.osqrTailTimer=null;
     previous.output.gain.cancelScheduledValues(ctx.currentTime);
     previous.output.gain.setValueAtTime(1,ctx.currentTime);
     return previous.input;
    }
    channels.delete(routeKey);
   }else return previous.input;
  }
  const d=create(ctx,()=>keyFor(kind,id));d.output.connect(__XenLoopRec.rootDestination(ctx,kind,destination));channels.set(routeKey,d);return d.input;
 }
 function releaseRoute(ctx,kind,destination,id=null){
  const channels=routes.get(ctx)?.get(destination),routeKey=kind+':'+(id||'selected'),d=channels?.get(routeKey);
  if(!d)return false;
  if(kind==='oneShot'){
   if(d.osqrTailTimer)return true;
   const now=ctx.currentTime;
   d.osqrFadeAt=now+.120;
   // Retain EQ's real native/worklet tail before fading its *output* gently.
   d.output.gain.cancelScheduledValues(now);
   d.output.gain.setValueAtTime(1,now);
   d.output.gain.setValueAtTime(1,d.osqrFadeAt);
   d.output.gain.linearRampToValueAtTime(0,d.osqrFadeAt+.035);
   d.osqrTailTimer=setTimeout(()=>{
    d.osqrTailTimer=null;
    if(channels.get(routeKey)===d)channels.delete(routeKey);
    d.dispose();
   },220);
   return true;
  }
  channels.delete(routeKey);d.dispose();return true;
 }
 // The white preview is computed from the real RBJ filters. Geometry is
 // invariant across gestures; cache its log-frequency points and trigonometry.
 // Keep a bounded cache rather than growing one entry per arbitrary canvas size.
 const responseGeometries=new Map(),RESPONSE_GEOMETRY_MAX=8;
 function responseGeometry(sampleRate,count){
  const key=sampleRate+':'+count,cached=responseGeometries.get(key);
  if(cached){responseGeometries.delete(key);responseGeometries.set(key,cached);return cached}
  const top=Math.min(20000,sampleRate*.45),ratio=top/20;
  const geometry=Array.from({length:count},(_,i)=>{
   const f=20*Math.pow(ratio,count>1?i/(count-1):0),w=2*Math.PI*f/sampleRate;
   return{c1:Math.cos(w),s1:Math.sin(w),c2:Math.cos(2*w),s2:Math.sin(2*w)};
  });
  responseGeometries.set(key,geometry);
  if(responseGeometries.size>RESPONSE_GEOMETRY_MAX)responseGeometries.delete(responseGeometries.keys().next().value);
  return geometry;
 }
 function response(cfg,sampleRate=48000,count=240,providedPlan=null){
  const p=providedPlan||plan(cfg,sampleRate),points=responseGeometry(sampleRate,count);
  const co=p.filters.filter(f=>Math.abs(f.gain)>1e-9).map(f=>peakCoefficients(f.frequency,f.gain,f.q,sampleRate));
  return points.map(pt=>{let value=p.base;for(const params of co)value+=magnitudeDb(params,pt);return value});
 }
 // Same number of exact RBJ evaluations as the former uniform 240-point
 // graph, but some points are placed at actual filter centers. This prevents
 // narrow resonances from falling between plotted samples (without DSP/fit work).
 const profileGeometries=new WeakMap();
 function responseProfile(cfg,sampleRate=48000,count=240,providedPlan=null){
  const p=providedPlan||plan(cfg,sampleRate),top=Math.min(20000,sampleRate*.45),ratio=top/20;
  let entry=profileGeometries.get(p);
  if(!entry||entry.rate!==sampleRate||entry.count!==count){
   // In raster mode zero-gain bands have centers too, so preserve all
   // visible band positions even when their current filters are neutral.
   const anchorXs=p.mode==='raster'&&p.anchors?p.anchors.map(b=>b.x):
    p.filters.filter(f=>f.type==='peaking'&&Math.abs(f.gain)>.1)
     .map(f=>Math.log(f.frequency/20)/Math.log(ratio));
   const keep=anchorXs.filter(x=>Number.isFinite(x)&&x>=0&&x<=1).slice(0,Math.max(0,count-2));
   const regularCount=Math.max(2,count-keep.length),regular=responseGeometry(sampleRate,regularCount);
   const points=regular.map((pt,i)=>({x:i/(regularCount-1),pt}));
   for(const x of keep){const hz=20*Math.pow(ratio,x),w=2*Math.PI*hz/sampleRate;
    points.push({x,pt:{c1:Math.cos(w),s1:Math.sin(w),c2:Math.cos(2*w),s2:Math.sin(2*w)}});
   }
   points.sort((a,b)=>a.x-b.x);
   // Exact duplicate frequencies need only one acoustic evaluation.
   entry={rate:sampleRate,count,points:points.filter((p,i)=>!i||p.x-points[i-1].x>1e-12)};
   profileGeometries.set(p,entry);
  }
  const co=p.filters.filter(f=>Math.abs(f.gain)>1e-9).map(f=>peakCoefficients(f.frequency,f.gain,f.q,sampleRate));
  return {x:entry.points.map(e=>e.x),db:entry.points.map(({pt})=>{
   let value=p.base;for(const params of co)value+=magnitudeDb(params,pt);return value;
  })};
 }
 const field=curve=>{const value=Zr(null);value.deformation.curve=[...curve];value.deformation.interior=[...curve];value.edgeHandles={left:curve[0],right:curve[359]};return Zr(value)};
 function bind(){__XenQuick.subscribe(()=>{if(pending===null)pending=requestAnimationFrame(refresh)})}
 window.addEventListener('pagehide',flush);window.addEventListener('blur',flush);
 return {bindings,dropRuntime:key=>{runtimeState.delete(key);releaseLiveKey(key)},dropOffline,runtime,runtimeMorph,runtimeHoldMorph,audioIntent,livePlan,peekPlan,releaseLiveKey,revision:()=>version,rateFor:key=>__xenWaveOfflineRates.get(key)??[...devices].find(d=>(typeof d.key==='function'?d.key():d.key)===key)?.ctx.sampleRate??48000,get,set,restore,capture,snapshot,freeze,frozen,clearFrozen,applyFrozen,savePattern,saveFrozenPattern,listPatterns,applyPattern,removePattern,subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),keyFor,selected,plan,target,response,responseProfile,field,create,route,releaseRoute,bind,flush,refresh,clean,neutral,startGesture,endGesture,rasterStroke,moveBand,
  diagnostics:()=>({version,audioPriority:{...audioCounters,heldKeys:audioHolds.size,morphHotKeys:morphGestures.size},morphHotKeys:morphGestures.size,workerActive:!!fitWorker,workerFailed:fitWorkerFailed,fitRunning:!!fitRunning,fitQueued:livePending.size,fitCache:fitResultCache.size,devices:devices.size,filters:[...devices].reduce((n,d)=>n+d.filterCount,0),sources:[...devices].map(d=>typeof d.key==='function'?d.key():d.key),live:[...devices].map(d=>({source:typeof d.key==='function'?d.key():d.key,...d.liveStatus,state:d.backend}))})};
})();
