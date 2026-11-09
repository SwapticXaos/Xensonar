/* F3.56.18 -- same canonical sequencer grid, surfaced directly in the main-room drum rack. */
function __mlGridFromSelection(snapshot){
 const selected=snapshot?.exported;
 if(selected)return im({useCustom:true,presetSource:selected.presetSource||snapshot.pattern,
   bars:selected.bars||1,segmentsPerBar:selected.segmentsPerBar||16,
   segmentMarkers:selected.segmentMarkers||_S(16),stepCount:selected.stepCount||16,
   laneOrder:selected.laneOrder||zT,laneSteps:selected.laneSteps||{},stepPrograms:selected.stepPrograms||{},sampleSlots:selected.sampleSlots||{}});
 return WR(snapshot?.pattern||"broken_lilt",2,16,_S(16));
}
/* F3.56.19: identical velocity cycle in the large and compact Drum Machines. */
function __mlNextDrumVelocity(value,button){return button===2?0:A7(value)}
/* A shifted segment boundary is an actual musical timing boundary, not a cosmetic swing slider. */
const __mlDrumLabelWidth=74; // Shared width for grid labels, Shuffle marker strip, and minimum scroll content.
function __mlDrumGridColumns(grid){const bars=Math.max(1,grid.bars||1),seg=Math.max(1,grid.segmentsPerBar||16),cuts=[0,...sl(grid.segmentMarkers,seg),1];return `${__mlDrumLabelWidth}px `+Array.from({length:bars*seg},(_,i)=>(Math.max(.00001,cuts[i%seg+1]-cuts[i%seg])*1000)+"fr").join(" ")}
function __mlPreviewMarkerIndex(ratio,bars,segmentsPerBar,segmentMarkers){
 const count=Math.max(1,Math.round(bars||1)),segments=Math.max(1,Math.round(segmentsPerBar||16));
 if(!Number.isFinite(ratio))return -1;
 const wrapped=ratio<0?(ratio%1+1)%1:ratio%1;
 let position=wrapped*count;
 if(Math.abs(position-Math.round(position))<1e-9)position=Math.round(position)%count;
 const bar=Math.min(count-1,Math.floor(position));
 const local=position-bar,cuts=[0,...sl(segmentMarkers,segments),1];
 for(let step=0;step<segments;step++)if(local<cuts[step+1]-1e-10)return bar*segments+step;
 return bar*segments+segments-1;
}

/* DRUM-SLOTS-06: Six native raw-audio lanes. The sample database owns the original Blob; the beat owns only its reference. */
const __f52SampleLanes=['sample1','sample2','sample3','sample4','sample5','sample6'];
/* The same lane semantics are used by the full canvas and the compact live editor. */
const __f52DrumLaneNames={kick:'Kick',snare:'Snare',hatClosed:'Hi-hat',hatOpen:'Open hat',clap:'Clap',perc:'Percussion',sample1:'Sample A',sample2:'Sample B',sample3:'Sample C',sample4:'Sample D',sample5:'Sample E',sample6:'Sample F'};
const __f52DrumLaneColors={sample1:'#2dd4bf',sample2:'#14b8a6',sample3:'#0d9488',sample4:'#38bdf8',sample5:'#818cf8',sample6:'#a78bfa'};

function __f52NormalizeSampleSlots(input){const source=input&&typeof input==='object'?input:{};return Object.fromEntries(__f52SampleLanes.map((lane)=>{
 const row=source[lane]||{};return [lane,{id:typeof row.id==='string'?row.id.slice(0,160):'',name:typeof row.name==='string'?row.name.slice(0,140):'',volume:Math.max(0,Math.min(2,Number.isFinite(row.volume)?row.volume:1)),pan:Math.max(-1,Math.min(1,Number.isFinite(row.pan)?row.pan:0)),muted:row.muted===true,eq:__f52EQNormalize(row.eq)}];}));}
async function __f52ImportDrumSample(file){
 // Reuse the Melodic Loop Sample Database, but do not estimate pitch on percussion/noise.
 const decoded=await See(file),record={id:Pj(),name:file.name||'Drum sample',baseHz:null,baseHzSource:null,
  durationSec:decoded.duration,createdAt:Date.now(),sizeBytes:file.size,tempoPitchLinked:false,playbackDurationSec:null,
  volumeEnvelope:null,pitchEnvelope:null,origin:'browserLocal',sourcePackageId:null,syncState:'localOnly',contentHash:null,blob:file};
 await EF(record);pw({reason:'save',sampleId:record.id,name:record.name});return fw(record);
}
function __f52EnsureDrumGrid(base){const grid=im(base);grid.sampleSlots=__f52NormalizeSampleSlots(grid.sampleSlots);
 for(const lane of __f52SampleLanes){if(!grid.laneOrder.includes(lane))grid.laneOrder.push(lane);if(!grid.laneSteps[lane])grid.laneSteps[lane]=Array(grid.stepCount).fill(0);}
 return grid;
}

/* One canonical beat, one sample-slot commit path in both rooms. */
function __f52CommitSharedDrumGrid(next,{newPattern=false}={}){
 const machine=__mlSharedDrumMachine,snapshot=machine.snapshot,edit=machine.liveEdit;
 const grid=__f52EnsureDrumGrid(next);
 grid.useCustom=true;grid.presetSource=snapshot?.pattern||grid.presetSource||'broken_lilt';
 machine.setLiveEdit({grid,kit:edit?.kit||snapshot?.kit||'standard',
  laneKitOverrides:edit?.laneKitOverrides||snapshot?.exported?.laneKitOverrides||snapshot?.laneKitOverrides||{},
  laneSettings:edit?.laneSettings||snapshot?.exported?.laneSettings||snapshot?.laneSettings||{},
  __xenNewPatternDraft:newPattern||edit?.__xenNewPatternDraft===true});
}
/* P3 Drum lane micro mixer: the on-grid gesture and inspector edit the SAME audio parameters. */
function __f52MixerRead(lane){
 const m=__mlSharedDrumMachine,s=m.snapshot,e=m.liveEdit;
 if(__f52SampleLanes.includes(lane)){
  const grid=__f52EnsureDrumGrid(e?.grid||__mlGridFromSelection(s));
  const slot=grid.sampleSlots[lane]||{};
  return {volume:slot.volume??1,pan:slot.pan??0,muted:slot.muted===true};
 }
 const settings=e?.laneSettings||s?.exported?.laneSettings||s?.laneSettings||{};
 const row=settings[lane]||{};
 return {volume:row.level??1,pan:row.pan??Z0[lane]?.pan??0,muted:row.muted===true};
}
/* DR-VOL-01: The offline drum stem must not be rendered/restarted for every
 * intermediate lane-volume sample. Coalesce rapid keyboard edits and hold all
 * volume-triggered stem switches until a pointer gesture ends. The drum library
 * remains the only persistent volume owner; this controller is transient. */
const __xenDrumVolumeCommit=(()=>{
 let depth=0,dirty=false,timer=null;
 const clear=()=>{if(timer!==null){clearTimeout(timer);timer=null}};
 const flush=()=>{
  timer=null;if(depth||!dirty)return;
  dirty=false;
  const playing=b9e();
  if(!playing?.stemGains?.has('__drums__')||!playing?.stemBuffers?.has('__drums__'))return;
  const ctx=__mlSharedDrumMachine.previewContext||{};
  const spec=__mlCanonicalDrumSpec(__mlSharedDrumMachine.snapshot,ctx.groove||{},ctx.computer||{});
  void __mlRefreshLiveDrumStem({...playing.drumRenderRequest,...spec})
   .catch(error=>console.error('[xensonar][drum-volume-commit]',error));
 };
 const schedule=(ms)=>{clear();timer=setTimeout(flush,ms)};
 return {
  active:()=>depth>0,
  begin(){depth++;clear()},
  touch(){dirty=true;if(__xenDrumVolumeCommit.active())return;schedule(420)},
  end(){if(depth<=0)return;depth--;if(!depth&&dirty)schedule(120)},
  getDiagnostics:()=>({depth,dirty,timerPending:timer!==null})
 };
})();
function __f52MixerSet(lane,delta){
 if(!Object.hasOwn(__f52DrumLaneNames,lane))return;
 const m=__mlSharedDrumMachine,s=m.snapshot,e=m.liveEdit;
 const bounded={};
 if(Number.isFinite(delta.volume))bounded.volume=Math.max(0,Math.min(2,delta.volume));
 if(Number.isFinite(delta.pan))bounded.pan=Math.max(-1,Math.min(1,delta.pan));
 if(typeof delta.muted==='boolean')bounded.muted=delta.muted;
 const prior=__f52MixerRead(lane);
 const volumeTouched='volume' in bounded&&Math.abs(prior.volume-bounded.volume)>1e-6;
 const muteTouched='muted' in bounded&&bounded.muted!==prior.muted;
 if(Object.keys(bounded).length===1&&'volume' in bounded&&!volumeTouched)return;
 if(Object.keys(bounded).length===1&&'muted' in bounded&&!muteTouched)return;
 if(__f52SampleLanes.includes(lane)){
  const grid=__f52EnsureDrumGrid(e?.grid||__mlGridFromSelection(s));
  const slot={...grid.sampleSlots[lane]};
  if('volume' in bounded)slot.volume=bounded.volume;
  if('pan' in bounded)slot.pan=bounded.pan;
  if('muted' in bounded)slot.muted=bounded.muted;
  grid.sampleSlots[lane]=slot;__f52CommitSharedDrumGrid(grid);
  if(muteTouched)__xenRequestDrumMuteRefresh();
  if(volumeTouched)__xenDrumVolumeCommit.touch();return;
 }
 const settings={...(e?.laneSettings||s?.exported?.laneSettings||s?.laneSettings||{})};
 const row={...Z0[lane],...(settings[lane]||{})};
 if('volume' in bounded)row.level=bounded.volume;
 if('pan' in bounded)row.pan=bounded.pan;
 if('muted' in bounded)row.muted=bounded.muted;
 settings[lane]=row;
 const liveGrid=__f52EnsureDrumGrid(e?.grid||__mlGridFromSelection(s));
 liveGrid.useCustom=true;
 m.setLiveEdit({grid:liveGrid,
  kit:e?.kit||s?.kit||'standard',laneKitOverrides:e?.laneKitOverrides||s?.exported?.laneKitOverrides||s?.laneKitOverrides||{},laneSettings:settings});
 if(volumeTouched)__xenDrumVolumeCommit.touch();
 if(muteTouched)__xenRequestDrumMuteRefresh();
}
/* DR-PREV-MUTE-01: an offline drum preview is a pre-rendered stem. Changing
 * lane mute state must replace its active buffer exactly once, not per frame. */
function __xenRequestDrumMuteRefresh(){
 if(typeof b9e!=='function')return;
 const playing=b9e();
 if(!playing?.drumRenderRequest||!playing.stemGains?.has('__drums__')||!playing.stemBuffers?.has('__drums__'))return;
 const context=__mlSharedDrumMachine.previewContext||{};
 const spec=__mlCanonicalDrumSpec(__mlSharedDrumMachine.snapshot,context.groove||{},context.computer||{});
 void __mlRefreshLiveDrumStem({...playing.drumRenderRequest,...spec})
  .catch(error=>console.error('[xensonar][drum-mute-preview]',error));
}

/* DRUM-LANE-EQ-02 — shared three-band adapter for the EXISTING main-room
 * G$ MWCM paint control and __xenEqPaint acoustic response renderer.
 * Only the 3-band projection is drum-specific. Canonical lane EQ remains v1. */
/* DRUM-LANE-EQ-03 · reuse the ORIGINAL right-side EQ's MWCM drawing,
 * response painter and raster-band planner, configured as one STATIC curve.
 * Neither a second graphical editor nor a live per-lane A/B owner exists. */
function __f52EQLegacyCurve(eq){
 const points=[[0,(eq.lowDb<0?eq.lowDb/36:eq.lowDb/12)],[Math.log(160/20)/Math.log(1000),(eq.lowDb<0?eq.lowDb/36:eq.lowDb/12)],
  [Math.log(1000/20)/Math.log(1000),(eq.midDb<0?eq.midDb/36:eq.midDb/12)],
  [Math.log(5000/20)/Math.log(1000),(eq.highDb<0?eq.highDb/36:eq.highDb/12)],[1,(eq.highDb<0?eq.highDb/36:eq.highDb/12)]];
 return Array.from({length:360},(_,i)=>{
  const x=i/359;let n=0;while(n<points.length-2&&x>points[n+1][0])n++;
  const [x0,y0]=points[n],[x1,y1]=points[n+1];
  return Math.max(-1,Math.min(1,y0+(y1-y0)*Math.max(0,Math.min(1,(x-x0)/Math.max(1e-8,x1-x0)))));
 });
}
function __f52EQEditor(rawEq){
 const eq=__f52EQNormalize(rawEq);
 return eq.schema==='drum-lane-eq-v2'?eq:{schema:'drum-lane-eq-v2',enabled:eq.enabled,
  bands:12,curve:__f52EQLegacyCurve(eq)};
}
function __f52EQView(rawEq,rate=48000){
 const eq=__f52EQNormalize(rawEq),sampleRate=Math.max(8000,Math.min(192000,Number(rate)||48000));
 if(eq.schema==='drum-lane-eq-v2'){
  const {cfg,plan}=__f52EQStaticPlan(eq,sampleRate);
  return {cfg,plan,profile:__XenEQ.responseProfile(cfg,sampleRate,180,plan),sampleRate,color:'#63ded9'};
 }
 // A previously saved v1 three-band EQ remains exactly the old acoustic
 // response. Merely opening its editor never changes either its sound or data.
 const editor=__f52EQEditor(eq);
 const coefficients=__f52EQActive(eq)?[['low',160,eq.lowDb],['peak',1000,eq.midDb],['high',5000,eq.highDb]]
  .filter(([, ,db])=>Math.abs(db)>1e-6).map(([type,hz,db])=>__f52EQCoefficients(type,hz,db,sampleRate)):[];
 const response=hz=>{const w=2*Math.PI*hz/sampleRate,c1=Math.cos(w),s1=Math.sin(w),c2=Math.cos(2*w),s2=Math.sin(2*w);
  return coefficients.reduce((db,[b0,b1,b2,a1,a2])=>{
   const nr=b0+b1*c1+b2*c2,ni=-b1*s1-b2*s2,dr=1+a1*c1+a2*c2,di=-a1*s1-a2*s2;
   return db+10*Math.log10(Math.max(1e-12,(nr*nr+ni*ni)/Math.max(1e-12,dr*dr+di*di)));
  },0);};
 const xs=Array.from({length:180},(_,i)=>i/179),top=Math.min(20000,sampleRate*.45);
 const profile={x:xs,db:xs.map(x=>response(Math.min(top,20*Math.pow(1000,x))))};
 const anchors=[160,1000,5000].map((hz,i)=>({x:Math.log(hz/20)/Math.log(1000),
  goal:[eq.lowDb,eq.midDb,eq.highDb][i],actual:response(hz)}));
 return {cfg:{bands:editor.bands,mode:'raster',high:12,low:-36},plan:{anchors},profile,sampleRate,color:'#63ded9'};
}
const __f52EQSharedPaintCSS=`
.xen-drum-shared-paint .nd-shared-field-compact{padding:0!important;border:0!important;background:transparent!important}
.xen-drum-shared-paint .nd-shared-field-compact > div:not(:has(canvas)){display:none!important}
.xen-drum-shared-paint .nd-shared-field-compact > div:has(canvas){padding:2px!important;margin:0!important;border:0!important}
.xen-drum-shared-paint .nd-shared-field-compact canvas{display:block!important;width:100%!important;height:166px!important;touch-action:none;cursor:crosshair;border:1px solid #357880!important}
`;
function __f52LaneEQControls({lane}){
 const [,refresh]=P.useReducer(n=>n+1,0),gesture=P.useRef({painting:false});
 const eq=__f52EQRead(lane),editor=P.useMemo(()=>__f52EQEditor(eq),[eq]);
 const name=__f52DrumLaneNames[lane]||lane;
 const apply=change=>{__f52EQSet(lane,change);refresh()};
 const begin=event=>{if(event.target?.tagName!=='CANVAS'||gesture.current.painting)return;
  gesture.current.painting=true;__mlSharedDrumMachine.beginGesture();__xenDrumVolumeCommit.begin()};
 const end=()=>{if(!gesture.current.painting)return;gesture.current.painting=false;
  __xenDrumVolumeCommit.end();__mlSharedDrumMachine.endGesture()};
 P.useEffect(()=>()=>end(),[lane]);
 const field=P.useMemo(()=>__XenEQ.field(editor.curve),[editor.curve]);
 const rate=__mlSharedDrumMachine.previewContext?.sampleRate||48000;
 const eqView=P.useMemo(()=>__f52EQView(eq,rate),[eq,rate]);
 return u.jsxs('div',{className:'mt-3 space-y-2 rounded border border-cyan-900/70 bg-neutral-950/70 p-2',
  'data-drum-shared-eq':lane,'data-drum-static-eq':lane,children:[
  u.jsx('style',{children:__f52EQSharedPaintCSS}),
  u.jsxs('div',{className:'flex items-center justify-between gap-2',children:[
   u.jsx('strong',{className:'text-cyan-200',children:'Lane EQ · Static Paint'}),
   u.jsxs('label',{className:'flex items-center gap-1 text-[10px]',children:[
    u.jsx('input',{type:'checkbox','aria-label':name+' EQ enabled',checked:eq.enabled,
     onChange:event=>apply({...editor,enabled:event.target.checked})}), 'On']})]}),
  u.jsxs('label',{className:'flex items-center gap-2 text-[10px]',children:[
   u.jsx('span',{className:'shrink-0 text-neutral-300',children:'EQ bands'}),
   u.jsx(__XenRange,{type:'range',min:4,max:24,step:1,value:editor.bands,
    'aria-label':name+' EQ bands',onChange:event=>apply({...editor,bands:+event.target.value})}),
   u.jsx('output',{'data-drum-eq-bands':lane,className:'tabular-nums text-cyan-200',children:editor.bands}),
   u.jsx('span',{className:'text-neutral-500',children:'4–24 · no live morph'})
  ]}),
  u.jsx('div',{className:'xen-drum-shared-paint',onPointerDownCapture:begin,
   onPointerUpCapture:end,onPointerCancelCapture:end,onLostPointerCapture:end,
   children:u.jsx(G$,{
    fieldInput:field,historyKey:'drum-lane-eq-static:'+lane,
    title:name+' · Original EQ Paint',description:'',fixedTarget:'dynamic-fade',compact:true,
    eqView,eqTool:{mode:'draw',size:42,intensity:1,hardness:0,fluidity:0},
    onCommit:nextField=>apply({schema:'drum-lane-eq-v2',enabled:true,bands:editor.bands,
     curve:Array.from(gc(nextField).resolved)})
   })}),
  eq.schema==='drum-lane-eq-v1'&&eq.enabled&&__f52EQActive(eq)
   ?u.jsx('div',{className:'text-[10px] text-amber-200',children:
    'Legacy 3-band EQ is preserved. Painting or changing band count switches this lane to static multi-band EQ.'})
   :null,
  u.jsxs('div',{className:'flex items-center justify-between gap-2 text-[10px]',children:[
   u.jsx('span',{className:'text-neutral-400',children:'Draw across the frequency curve · narrow resonance cuts at 24 bands'}),
   u.jsx('button',{type:'button','aria-label':name+' Reset EQ',
    onClick:()=>apply({schema:'drum-lane-eq-v2',enabled:false,bands:editor.bands,curve:[...__f52EQNeutralCurve]}),
    className:'rounded border border-neutral-600 px-2 py-1 text-neutral-200',children:'Reset EQ'})]})
 ]});
}

/* One stored StepProgram drives both audio onset and the compact hit position.
 * Velocity affects the small filled meter; global shuffle markers retain their
 * independent, pattern-wide segment-marker owner. */
function __f52HitVisualOffset(grid,lane,index){
 const value=grid?.laneSteps?.[lane]?.[index]||0;
 if(value<=0)return 0;
 return Math.max(-.45,Math.min(.45,WH(grid?.stepPrograms?.[lane]?.[index],lane,index,value).microOffsetRatio||0));
}
/* A single per-hit mutation contract for both full-room and compact editors. */
function __f52PatchDrumHit(lane,index,field,value){
 const latest=__f52EnsureDrumGrid(__mlSharedDrumMachine.liveEdit?.grid||__mlGridFromSelection(__mlSharedDrumMachine.snapshot));
 if(index<0||index>=latest.stepCount||!latest.laneOrder.includes(lane))return;
 const next=im(latest),base=next.laneSteps[lane]?.[index]||0;
 const p=WH(next.stepPrograms?.[lane]?.[index],lane,index,base);
 if(field==='velocity'){const v=Math.max(0,Math.min(1.25,value));next.laneSteps[lane][index]=v;p.value=v;}
 else if(field==='offset')p.microOffsetRatio=Math.max(-.45,Math.min(.45,value));
 else if(field==='pan')p.layers=[{...p.layers[0],panOffset:Math.max(-1,Math.min(1,value))},...p.layers.slice(1)];
 else if(field==='probability')p.probability=Math.max(0,Math.min(1,value));
 else if(field==='decay')p.decayLock=Math.max(.2,Math.min(2,value));
 else if(field==='tone')p.toneLock=Math.max(0,Math.min(1,value));
 else return;
 next.stepPrograms[lane]={...(next.stepPrograms[lane]||{}),[index]:p};__f52CommitSharedDrumGrid(next);
}
/* Full-screen details use the same hit programming as the compact rack. */

/* xen-lazy:canonical */

/* Full-room sample inspector: routes through the same live edit and sample database as the compact rack. */

/* xen-lazy:canonical */

/* Independent Drum Pattern creation: never rename a preset or playlist alias.
 * This helper is shared by the compact Save As action and Manager New Entry. */
async function __f52SaveNewDrumConfig(name){
 const title=String(name||'').trim();if(!title)throw Error('A name is required for a new Drum Pattern.');
 const snapshot=__mlSharedDrumMachine.snapshot,edit=__mlSharedDrumMachine.liveEdit;
 const src=edit?.grid||__f52EnsureDrumGrid(__mlGridFromSelection(snapshot));
 const row=await dfe({name:title,drumKit:edit?.kit||snapshot?.kit,
  matrix:IQe(src,snapshot?.pattern),sourceWorkspace:'xensonar-main-room-live',drumStyle:__xenBeatDrumStyleSafe(snapshot?.drumStyle),
  laneKitOverrides:edit?.laneKitOverrides||snapshot?.exported?.laneKitOverrides||snapshot?.laneKitOverrides||{},
  laneSettings:edit?.laneSettings||snapshot?.exported?.laneSettings||snapshot?.laneSettings||{},
  stepPrograms:src.stepPrograms||{},sampleSlots:src.sampleSlots||{}});
 ri('drumConfigSendRequest',{id:row.id});return row;
}
function __mlCompactDrumGrid(){
 const [,rerender]=P.useReducer(x=>x+1,0),painting=P.useRef(null),draggingMarker=P.useRef(null),timingStrip=P.useRef(null),stepScroll=P.useRef(null);
 const [saving,setSaving]=P.useState(false),[saveStatus,setSaveStatus]=P.useState("");
 const [previewStatus,setPreviewStatus]=P.useState(""); const [drumStatusHost,setDrumStatusHost]=P.useState(null); P.useEffect(()=>{setDrumStatusHost(document.querySelector("[data-xen-drum-status-slot]"))},[]);
 const [selectedHit,setSelectedHit]=P.useState(null);
 const microDrag=P.useRef(null);
 const [detailOpen,setDetailOpen]=P.useState(false);
 const [sampleRows,setSampleRows]=P.useState([]),[sampleNotice,setSampleNotice]=P.useState('');
 const [samplePicker,setSamplePicker]=P.useState(null);const samplePickerRef=P.useRef(null);
 const [laneMixer,setLaneMixer]=P.useState(null),laneMixerRef=P.useRef(null),laneDrag=P.useRef(null);
 const toggleSamplePicker=(lane,event)=>{
  if(samplePicker?.lane===lane){setSamplePicker(null);return;}
  const box=event.currentTarget.getBoundingClientRect();
  const width=Math.min(340,window.innerWidth-16),height=Math.min(470,window.innerHeight-16);
  setSamplePicker({lane,left:Math.max(8,Math.min(window.innerWidth-width-8,box.right+6)),top:Math.max(8,Math.min(window.innerHeight-height-8,box.top))});
 };
 const openDrumLaneEditor=(lane,event)=>{
  if(laneDrag.current?.suppressClick){event.preventDefault();laneDrag.current=null;return;}
  laneDrag.current=null;
  if(__f52SampleLanes.includes(lane)){setLaneMixer(null);toggleSamplePicker(lane,event);return;}
  setSamplePicker(null);
  const rect=event.currentTarget.getBoundingClientRect(),width=Math.min(280,window.innerWidth-16),height=Math.min(360,window.innerHeight-16);
  setLaneMixer(old=>old?.lane===lane?null:{lane,left:Math.max(8,Math.min(window.innerWidth-width-8,rect.right+6)),top:Math.max(8,Math.min(window.innerHeight-height-8,rect.top))});
 };
 const beginLaneDrag=(event,lane)=>{
  if(event.button!==0)return;
  const rect=event.currentTarget.getBoundingClientRect();
  laneDrag.current={lane,pointerId:event.pointerId,startX:event.clientX,rect,dragged:false};
  event.currentTarget.setPointerCapture?.(event.pointerId);
 };
 const moveLaneDrag=(event,lane)=>{
  const gesture=laneDrag.current;
  if(!gesture||gesture.lane!==lane||gesture.pointerId!==event.pointerId)return;
  if(!gesture.dragged){if(Math.abs(event.clientX-gesture.startX)<4)return;gesture.dragged=true;__xenDrumVolumeCommit.begin();__mlSharedDrumMachine.beginGesture();}
  event.preventDefault();
  const volume=Math.max(0,Math.min(1,(event.clientX-gesture.rect.left)/Math.max(1,gesture.rect.width)));
  if(Math.abs(__f52MixerRead(lane).volume-volume)>.008)__f52MixerSet(lane,{volume});
 };
 const endLaneDrag=(event,lane)=>{
  const gesture=laneDrag.current;
  if(!gesture||gesture.lane!==lane||gesture.pointerId!==event.pointerId)return;
  if(gesture.dragged){__xenDrumVolumeCommit.end();__mlSharedDrumMachine.endGesture();}
  laneDrag.current=gesture.dragged?{suppressClick:true}:null;
  if(event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
 };
 const cancelLaneDrag=event=>{
  if(laneDrag.current?.dragged){__xenDrumVolumeCommit.end();__mlSharedDrumMachine.endGesture();}laneDrag.current=null;
 };
 P.useEffect(()=>{if(!laneMixer)return;const close=e=>{
  if(e.key==='Escape')setLaneMixer(null);
  else if(e.type==='pointerdown'&&!laneMixerRef.current?.contains(e.target)&&!e.target.closest?.('[data-drum-lane-open]'))setLaneMixer(null);
 };window.addEventListener('pointerdown',close);window.addEventListener('keydown',close);
 return()=>{window.removeEventListener('pointerdown',close);window.removeEventListener('keydown',close)};
 },[laneMixer]);
 P.useEffect(()=>{if(!samplePicker)return;const close=e=>{
  if(e.key==='Escape')setSamplePicker(null);
  else if(e.type==='pointerdown'&&!samplePickerRef.current?.contains(e.target)&&!e.target.closest?.('[data-drum-sample-picker-toggle]'))setSamplePicker(null);
 };
 window.addEventListener('pointerdown',close);window.addEventListener('keydown',close);
 return()=>{window.removeEventListener('pointerdown',close);window.removeEventListener('keydown',close)};
 },[samplePicker]);
 P.useEffect(()=>{let live=true;const refresh=()=>gs().then(rows=>{if(live)setSampleRows(rows)}).catch(()=>{if(live)setSampleNotice('Sample database unavailable.')});
  refresh();window.addEventListener('xensonar:melodic-sample-library-updated',refresh);
  return()=>{live=false;window.removeEventListener('xensonar:melodic-sample-library-updated',refresh)};
 },[]);
 const [previewPhase,setPreviewPhase]=P.useState(__mlSharedDrumMachine.previewPhase);
 const [previewStep,setPreviewStep]=P.useState(__mlSharedDrumMachine.previewStep);
 // Visual-only live-room cursor. Poll the audio clock; never mutate the drum scheduler.
 const [mainDrumStep,setMainDrumStep]=P.useState(-1);
 P.useEffect(()=>{let raf=0,last=-2,alive=true;
   const tick=()=>{if(!alive)return;
     const next=__mlSharedDrumMachine.previewOwned?-1:__mlSharedDrumMachine.readMainTick();
     if(next!==last){last=next;setMainDrumStep(next)}
     raf=requestAnimationFrame(tick);
   };
   raf=requestAnimationFrame(tick);
   return()=>{alive=false;cancelAnimationFrame(raf)};
 },[]);
 P.useEffect(()=>__mlSharedDrumMachine.subscribePreview((phase,step)=>{
   setPreviewPhase(phase);setPreviewStep(step);
 }),[]);
 const previewRequest=P.useRef(0);
 P.useEffect(()=>__mlSharedDrumMachine.subscribe(()=>rerender()),[]);
 // The preview playhead is a marker, not a scroll owner. Scrolling is manual. 
 // Closing the rack must not leave an invisible audition looping.
 P.useEffect(()=>()=>{if(__mlSharedDrumMachine.previewOwned)__mlSharedDrumMachine.stop?.()},[]);
 P.useEffect(()=>{
  const finish=()=>{painting.current=null;draggingMarker.current=null;microDrag.current=null;__mlSharedDrumMachine.endGesture()};
  window.addEventListener("pointerup",finish);window.addEventListener("pointercancel",finish);
  return()=>{window.removeEventListener("pointerup",finish);window.removeEventListener("pointercancel",finish)};
 },[]);
 const snapshot=__mlSharedDrumMachine.snapshot,current=__mlSharedDrumMachine.liveEdit;
 const grid=__f52EnsureDrumGrid(current?.grid||__mlGridFromSelection(snapshot));
 const rows=grid.laneOrder||zT,bars=Math.max(1,grid.bars||1),seg=Math.max(1,grid.segmentsPerBar||16);
 const steps=Math.max(1,grid.stepCount||bars*seg),segments=sl(grid.segmentMarkers,seg);
 const markerStep=previewPhase==="playing"?previewStep:mainDrumStep;
 const markerPlaying=previewPhase==="playing"||(previewPhase==="idle"&&mainDrumStep>=0);
 const boundedMarkerStep=markerPlaying&&Number.isFinite(markerStep)?((markerStep%steps)+steps)%steps:-1;
 const columns=__mlDrumGridColumns(grid),minWidth=Math.max(500,steps*27+__mlDrumLabelWidth);
 const commit=(next,options)=>{setSaveStatus("");__f52CommitSharedDrumGrid(next,options)};
 const update=(lane,index,value)=>{
  const latest=__mlSharedDrumMachine.liveEdit?.grid||grid;
  if(!latest.laneSteps[lane]||index<0||index>=latest.stepCount)return;
  if(Math.abs((latest.laneSteps[lane][index]||0)-value)<1e-5)return;
  const next=im(latest);next.laneSteps[lane][index]=value;if(next.stepPrograms?.[lane]?.[index])next.stepPrograms[lane][index].value=value;commit(next);
 };
 const begin=(event,lane,index)=>{
  if(event.button!==0&&event.button!==2)return;event.preventDefault();
  const old=(__mlSharedDrumMachine.liveEdit?.grid||grid).laneSteps[lane]?.[index]||0;
  const value=__mlNextDrumVelocity(old,event.button);
  setSelectedHit(value>0?{lane,index}:null);__mlSharedDrumMachine.beginGesture();painting.current={lane,value,button:event.button};update(lane,index,value);
 };
 const stepOver=(event,lane,index)=>{
  const p=painting.current;
  if(p&&event.buttons&(p.button===2?2:1)&&p.lane===lane)update(lane,index,p.value);
 };
 const onMarkerMove=(event)=>{
  const marker=draggingMarker.current,strip=timingStrip.current;
  if(!marker||!strip)return;
  const rect=strip.getBoundingClientRect();if(rect.width<=0)return;
  // All bars use a single canonical normalized segment boundary array.
  const ratio=(event.clientX-rect.left)/rect.width*bars-marker.bar;
  const latest=__mlSharedDrumMachine.liveEdit?.grid||grid;
  const next=MQe(latest,latest,snapshot?.pattern||latest.presetSource||"broken_lilt",marker.index,ratio);
  if(Math.abs(next.segmentMarkers[marker.index]-latest.segmentMarkers[marker.index])>1e-7)commit(next);
 };
 const setStepDetail=(field,value)=>{if(selectedHit)__f52PatchDrumHit(selectedHit.lane,selectedHit.index,field,value)};
 // Dragging the leading edge edits one hit, not the global segment boundaries.
 const beginMicro=(event,lane,index)=>{
  if(event.button!==0)return;
  event.preventDefault();event.stopPropagation();
  const latest=__mlSharedDrumMachine.liveEdit?.grid||grid;
  const velocity=latest.laneSteps[lane]?.[index]||0;
  if(velocity<=0)return;
  const offset=__f52HitVisualOffset(latest,lane,index);
  microDrag.current={lane,index,pointerId:event.pointerId,startX:event.clientX,startRatio:offset,
   width:Math.max(1,event.currentTarget.parentElement.getBoundingClientRect().width)};
  setSelectedHit({lane,index});
  __mlSharedDrumMachine.beginGesture();event.currentTarget.setPointerCapture?.(event.pointerId);
 };
 const moveMicro=event=>{
  const drag=microDrag.current;
  if(!drag||drag.pointerId!==event.pointerId)return;
  event.preventDefault();event.stopPropagation();
  const next=Math.max(-.45,Math.min(.45,Math.round((drag.startRatio+(event.clientX-drag.startX)/drag.width)*100)/100));
  const latest=__mlSharedDrumMachine.liveEdit?.grid||grid;
  if(Math.abs(next-__f52HitVisualOffset(latest,drag.lane,drag.index))>=.005)
   __f52PatchDrumHit(drag.lane,drag.index,'offset',next);
 };
 const endMicro=event=>{
  if(!microDrag.current||microDrag.current.pointerId!==event.pointerId)return;
  event.preventDefault();event.stopPropagation();microDrag.current=null;
  if(event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  __mlSharedDrumMachine.endGesture();
 };
 const chooseSample=(lane,id)=>{const next=__f52EnsureDrumGrid(__mlSharedDrumMachine.liveEdit?.grid||grid),row=sampleRows.find(item=>item.id===id);
  next.sampleSlots[lane]={...next.sampleSlots[lane],id,name:row?.name||''};commit(next);
  setSampleNotice(row?'Linked '+row.name+' to '+lane+'.':lane+' cleared.');
 };
 const uploadSample=async(lane,file)=>{
  if(!file)return;const source=__f351DrumSource(__mlSharedDrumMachine.snapshot);setSampleNotice('Adding '+file.name+' to sample database…');
  try{const saved=await __f52ImportDrumSample(file);
   setSampleRows(await gs());
   if(__f351DrumSource(__mlSharedDrumMachine.snapshot)!==source){setSampleNotice('Sample saved; beat changed before assignment. Select it from the list.');return;}
   const next=__f52EnsureDrumGrid(__mlSharedDrumMachine.liveEdit?.grid||grid);
   next.sampleSlots[lane]={...next.sampleSlots[lane],id:saved.id,name:saved.name};commit(next);
   setSampleNotice(saved.name+' saved and linked to '+lane+'.');
  }catch(error){setSampleNotice('Import failed: '+(error?.message||String(error)))}
 };
 const selected=selectedHit&&rows.includes(selectedHit.lane)&&selectedHit.index<steps?selectedHit:null;
 const stepValue=selected?grid.laneSteps[selected.lane]?.[selected.index]||0:0;
 const stepProgram=selected?WH(grid.stepPrograms?.[selected.lane]?.[selected.index],selected.lane,selected.index,stepValue):null;
 const beginMarker=(event,index,bar)=>{
  if(event.button!==0)return;event.preventDefault();event.stopPropagation();
  __mlSharedDrumMachine.beginGesture();draggingMarker.current={index,bar};event.currentTarget.setPointerCapture?.(event.pointerId);
 };
 const endMarker=(event)=>{draggingMarker.current=null;__mlSharedDrumMachine.endGesture();event.currentTarget.releasePointerCapture?.(event.pointerId)};
 const save=async()=>{
   if(saving)return;
   const name=window.prompt("Save Drum Pattern As",current?.__xenNewPatternDraft?"":(snapshot?.label||"Live Beat")+" · Edit");
   if(!name?.trim())return;
   setSaving(true);
   try{const row=await __f52SaveNewDrumConfig(name);setSaveStatus("Saved: "+row.name);
   }catch(error){setSaveStatus("Save failed: "+(error?.message||String(error)))}
   finally{setSaving(false)}
 };
 const label=__f52DrumLaneNames;
 return u.jsxs("section",{className:"xen-main-drum-editor min-w-0 rounded border border-cyan-800/70 bg-cyan-950/10 p-3",children:[
  u.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-2",children:[
   u.jsxs("div",{children:[u.jsx("div",{className:"text-[10px] uppercase tracking-[.22em] text-cyan-200",children:"Live Drum Machine"}),
    u.jsx("div",{className:"text-[10px] text-neutral-400",children:"Same shuffle timing markers as the full Drum Machine. Edit live without stopping the Material Track."})]}),
   u.jsx("span",{className:"text-[10px] text-amber-200",children:"◀ Click: soft → medium → loud → off · Right-click: erase"})]}),
  u.jsxs("div",{className:"mt-2 flex flex-wrap gap-2 text-[10px]",children:[
   u.jsx("button",{type:"button",onClick:()=>{const next=im(grid);next.laneOrder.forEach(l=>next.laneSteps[l]=next.laneSteps[l].map(()=>0));next.stepPrograms={};commit(next,{newPattern:true})},className:"rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-800",children:"Clear"}),
   u.jsx("button",{type:"button",onClick:()=>{const next=im(grid);next.laneOrder.forEach(l=>next.laneSteps[l]=next.laneSteps[l].map((v,i)=>Math.random()<(.18+(i%4===0?.16:0))?(Math.random()<.3?.62:1):0));commit(next)},className:"rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-800",children:"Variation"}),
   u.jsx("button",{type:"button",disabled:!__mlSharedDrumMachine.canUndo(),onClick:()=>__mlSharedDrumMachine.undo(),"aria-label":"Undo Drum Edit",className:"rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-800 disabled:opacity-40",children:"↶ Undo"}),
   u.jsx("button",{type:"button",disabled:!__mlSharedDrumMachine.canRedo(),onClick:()=>__mlSharedDrumMachine.redo(),"aria-label":"Redo Drum Edit",className:"rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-800 disabled:opacity-40",children:"↷ Redo"}),
   u.jsx("button",{type:"button",onClick:()=>__mlSharedDrumMachine.setLiveEdit(null),className:"rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-800",children:"Reset to selected pattern"}),
   u.jsx("button",{type:"button",disabled:saving,onClick:save,className:"rounded border border-cyan-700 px-2 py-1 text-cyan-100 hover:bg-cyan-900/40",children:saving?"Saving…":"Save As…"}),
   u.jsx("button",{type:"button","aria-label":"Preview Drums",onClick:()=>{
     if(typeof __mlSharedDrumMachine.preview!=="function"){setPreviewStatus("Drum preview unavailable: open Synthetic Forge once.");return;}
     const request=++previewRequest.current;
     setPreviewStatus("Starting drum preview…");
     void Promise.resolve().then(()=>__mlSharedDrumMachine.preview()).then(started=>{
       if(request===previewRequest.current)setPreviewStatus(started?"Drum-only preview running.":"Preview was not started. Check audio output.");
     }).catch(error=>{
       if(request===previewRequest.current)setPreviewStatus("Preview failed: "+(error?.message||String(error)));
     });
   },className:"rounded border border-emerald-700 px-2 py-1 text-emerald-100 hover:bg-emerald-950/40",children:"▶ Preview"}),
   u.jsx("button",{type:"button","aria-label":"Stop Preview",onClick:()=>{
     ++previewRequest.current;
     const stopped=typeof __mlSharedDrumMachine.stop==="function"&&__mlSharedDrumMachine.stop();
     setPreviewStatus(stopped?"Preview stopped.":"No drum preview started here.");
   },className:"rounded border border-rose-800 px-2 py-1 text-rose-100 hover:bg-rose-950/40",children:"■ Stop"}),
   u.jsx("label",{className:"inline-flex items-center gap-1 text-neutral-400",children:["Bars",u.jsx("select",{value:bars,onChange:e=>commit(wg(grid,Number(e.target.value),seg,grid.segmentMarkers)),"aria-label":"Pattern bars",className:"rounded border border-neutral-700 bg-neutral-950 px-1 py-1 text-neutral-200",children:Array.from({length:16},(_,n)=>u.jsx("option",{value:n+1,children:String(n+1)},n+1))})]}),
   u.jsx("label",{className:"inline-flex items-center gap-1 text-neutral-400",children:["Segments / bar",u.jsx("select",{value:seg,onChange:e=>commit(RQe(grid,grid,snapshot?.pattern||grid.presetSource||"broken_lilt",bars,Number(e.target.value))),"aria-label":"Segments / bar",className:"rounded border border-neutral-700 bg-neutral-950 px-1 py-1 text-neutral-200",children:Array.from({length:32},(_,n)=>u.jsx("option",{value:n+1,children:String(n+1)},n+1))})]}),
   u.jsx("span",{className:"ml-auto text-cyan-200/70",children:`${bars} bar${bars===1?"":"s"} × ${seg} segments · ${steps} steps`})]}),
  laneMixer&&ao.createPortal(u.jsxs("div",{ref:laneMixerRef,role:"dialog","aria-label":label[laneMixer.lane]+" lane mixer",
   className:"xen-drum-lane-pop fixed max-h-[calc(100vh-16px)] overflow-y-auto rounded-lg border border-teal-500/70 p-3 text-[11px] text-neutral-100",
   style:{left:Math.max(8,Math.min(laneMixer.left,window.innerWidth-Math.min(384,window.innerWidth-16)-8)),top:Math.max(8,Math.min(laneMixer.top,window.innerHeight-510)),width:Math.min(384,window.innerWidth-16),maxHeight:Math.max(160,window.innerHeight-Math.max(8,Math.min(laneMixer.top,window.innerHeight-510))-8),zIndex:2147483000,backgroundColor:"#0b111b",boxShadow:"0 14px 45px #000d"},children:[
    u.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[u.jsx("strong",{className:"text-teal-200",children:label[laneMixer.lane]+" · Mixer"}),u.jsx("button",{type:"button",onClick:()=>setLaneMixer(null),"aria-label":"Close lane mixer",children:"✕"})]}),
    u.jsx("label",{className:"mb-3 flex items-center gap-2",children:["Volume",u.jsx(__XenRange,{type:"range","aria-label":label[laneMixer.lane]+" volume",min:0,max:2,step:.01,value:__f52MixerRead(laneMixer.lane).volume,onPointerDown:()=>{__mlSharedDrumMachine.beginGesture();__xenDrumVolumeCommit.begin()},onPointerUp:()=>{__xenDrumVolumeCommit.end();__mlSharedDrumMachine.endGesture()},onPointerCancel:()=>{__xenDrumVolumeCommit.end();__mlSharedDrumMachine.endGesture()},onBlur:()=>{__xenDrumVolumeCommit.end();__mlSharedDrumMachine.endGesture()},onChange:e=>__f52MixerSet(laneMixer.lane,{volume:+e.target.value}),className:"min-w-0 flex-1"}),Math.round(__f52MixerRead(laneMixer.lane).volume*100)+"%"]}),
    u.jsx("label",{className:"flex items-center gap-2",children:["Pan",u.jsx(__XenRange,{type:"range","aria-label":label[laneMixer.lane]+" Pan",min:-1,max:1,step:.01,value:__f52MixerRead(laneMixer.lane).pan,onChange:e=>__f52MixerSet(laneMixer.lane,{pan:+e.target.value}),className:"min-w-0 flex-1"}),Math.round(__f52MixerRead(laneMixer.lane).pan*100)+"%"]}),
    u.jsx(__f52LaneEQControls,{lane:laneMixer.lane})
   ]}),document.body),
  samplePicker&&ao.createPortal(u.jsxs("div",{ref:samplePickerRef,role:"dialog","aria-label":(label[samplePicker.lane]||'Sample')+" selection",
   className:"xen-drum-sample-dialog fixed max-h-[min(470px,calc(100vh-16px))] w-[min(340px,calc(100vw-16px))] overflow-y-auto rounded-lg border-2 border-teal-400 p-3 text-[11px] text-neutral-100",
   style:{left:Math.max(8,Math.min(samplePicker.left,window.innerWidth-Math.min(374,window.innerWidth-16)-8)),top:Math.max(8,Math.min(samplePicker.top,window.innerHeight-552)),width:Math.min(374,window.innerWidth-16),maxHeight:Math.max(180,window.innerHeight-Math.max(8,Math.min(samplePicker.top,window.innerHeight-552))-8),overflowY:"auto",backgroundColor:"#0b111b",opacity:1,isolation:"isolate",zIndex:2147483000,boxShadow:"0 15px 45px rgba(0,0,0,.95),0 0 0 1px rgba(94,234,212,.45)"},children:[
    u.jsxs("div",{className:"mb-3 flex items-center justify-between gap-2",children:[
      u.jsx("strong",{className:"text-teal-200",children:label[samplePicker.lane]+" · Raw Audio"}),
      u.jsx("button",{type:"button","aria-label":"Close sample selection",onClick:()=>setSamplePicker(null),className:"rounded border border-neutral-600 px-2 py-1",children:"✕"})]}),
    u.jsx("label",{className:"block pb-2 text-neutral-400",children:["Sample-Datenbank",
      u.jsxs("select",{"aria-label":label[samplePicker.lane]+" sample",value:grid.sampleSlots?.[samplePicker.lane]?.id||"",onChange:e=>chooseSample(samplePicker.lane,e.target.value),className:"mt-1 w-full rounded border border-teal-800 bg-neutral-900 px-2 py-2 text-teal-50",children:[
       u.jsx("option",{value:"",children:"— No sample —"}),
       ...(grid.sampleSlots?.[samplePicker.lane]?.id&&!sampleRows.some(row=>row.id===grid.sampleSlots[samplePicker.lane].id)?[u.jsx("option",{value:grid.sampleSlots[samplePicker.lane].id,children:"Missing: "+(grid.sampleSlots[samplePicker.lane].name||grid.sampleSlots[samplePicker.lane].id)})]:[]),
       ...sampleRows.map(row=>u.jsx("option",{value:row.id,children:row.name+" · "+Number(row.durationSec||0).toFixed(1)+"s"},row.id))
      ]})]}),
    u.jsx("label",{className:"block cursor-pointer rounded border border-teal-700 px-3 py-2 text-center text-teal-100",children:["Upload Raw Audio…",u.jsx("input",{type:"file",accept:"audio/*,.wav,.aiff,.aif,.flac,.mp3,.ogg,.m4a",className:"sr-only","aria-label":label[samplePicker.lane]+" upload",onChange:e=>{const file=e.target.files?.[0];if(file)void uploadSample(samplePicker.lane,file);e.target.value='';}})]}),
    u.jsx("label",{className:"mt-3 flex items-center gap-2 text-neutral-400",children:["Spurpegel",u.jsx(__XenRange,{type:"range","aria-label":label[samplePicker.lane]+" volume",min:0,max:2,step:.01,value:grid.sampleSlots?.[samplePicker.lane]?.volume??1,onPointerDown:()=>{__mlSharedDrumMachine.beginGesture();__xenDrumVolumeCommit.begin()},onPointerUp:()=>{__xenDrumVolumeCommit.end();__mlSharedDrumMachine.endGesture()},onPointerCancel:()=>{__xenDrumVolumeCommit.end();__mlSharedDrumMachine.endGesture()},onBlur:()=>{__xenDrumVolumeCommit.end();__mlSharedDrumMachine.endGesture()},onChange:e=>__f52MixerSet(samplePicker.lane,{volume:+e.target.value}),className:"flex-1"}),Math.round((grid.sampleSlots?.[samplePicker.lane]?.volume??1)*100)+"%"]}),
    u.jsx("label",{className:"mt-2 flex items-center gap-2 text-neutral-400",children:["Pan",u.jsx(__XenRange,{type:"range","aria-label":label[samplePicker.lane]+" Pan",min:-1,max:1,step:.01,value:__f52MixerRead(samplePicker.lane).pan,onChange:e=>__f52MixerSet(samplePicker.lane,{pan:+e.target.value}),className:"flex-1"}),Math.round(__f52MixerRead(samplePicker.lane).pan*100)+"%"]}),
    u.jsx(__f52LaneEQControls,{lane:samplePicker.lane}),
    sampleNotice&&u.jsx("div",{role:"status",className:"mt-2 text-teal-200",children:sampleNotice})
   ]}),document.body),
  u.jsx("div",{ref:stepScroll,className:"xen-main-drum-step-scroll mt-3 overflow-x-auto overflow-y-hidden pb-2",children:
   u.jsxs("div",{style:{minWidth:minWidth+"px"},children:[
    u.jsxs("div",{className:"xen-main-drum-grid-row",style:{gridTemplateColumns:columns},children:[
      u.jsx("span",{className:"text-[10px] text-neutral-400",children:"Bar / Step"}),
      ...Array.from({length:steps},(_,i)=>u.jsx("span",{className:`text-center text-[9px] ${i%seg===0?"text-amber-300":"text-neutral-500"}`,title:`Bar ${Math.floor(i/seg)+1}, segment ${i%seg+1}`,children:(i%seg)+1},"step-label-"+i))]}),
    u.jsxs("div",{className:"xen-main-drum-grid-timing",style:{"--xen-drum-label-width":`${__mlDrumLabelWidth}px`},children:[
      u.jsx("span",{className:"text-[9px] text-neutral-400",children:"Shuffle"}),
      u.jsx("div",{ref:timingStrip,className:"xen-main-drum-marker-track",children:[
       ...Array.from({length:bars},(_,bar)=>u.jsx("span",{className:"xen-main-drum-bar-label",style:{left:`${bar/bars*100}%`},children:`▏${bar+1}`},"bar-"+bar)),
       ...Array.from({length:bars},(_,bar)=>u.jsx("span",{
        "aria-label":`Bar start marker ${bar+1}`,"data-playing":boundedMarkerStep===bar*seg?"true":"false",
        className:`xen-main-drum-marker xen-drum-start-marker ${boundedMarkerStep===bar*seg?"xen-drum-marker-playing":""}`,
        style:{left:`${bar/bars*100}%`},title:`Start of bar ${bar+1} · fixed boundary`,children:"▼"},"start-marker-"+bar)),
       ...Array.from({length:bars},(_,bar)=>segments.map((pos,index)=>u.jsx("button",{
        type:"button","aria-label":`Timing marker ${index+1}, bar ${bar+1}`,
        "data-playing":boundedMarkerStep===bar*seg+index+1?"true":"false",
        className:`xen-main-drum-marker ${boundedMarkerStep===bar*seg+index+1?"xen-drum-marker-playing":""}`,style:{left:`${(bar+pos)/bars*100}%`},
        title:`Move triangle to shift segment boundary ${index+1} in all bars`,
        onPointerDown:event=>beginMarker(event,index,bar),onPointerMove:onMarkerMove,onPointerUp:endMarker,
        onPointerCancel:endMarker,onContextMenu:e=>e.preventDefault(),children:"▼"},"marker-"+bar+"-"+index))).flat()]})]}),
    ...rows.map(lane=>u.jsxs("div",{className:"xen-main-drum-grid-row",style:{gridTemplateColumns:columns},children:[
      u.jsxs("div",{className:"xen-drum-lane-head",children:[
       u.jsxs("button",{type:"button","data-drum-lane-open":lane,
        onContextMenu:event=>{event.preventDefault();openDrumLaneEditor(lane,event)},"aria-label":label[lane]+" mixer",onClick:event=>openDrumLaneEditor(lane,event),
        onPointerDown:event=>beginLaneDrag(event,lane),onPointerMove:event=>moveLaneDrag(event,lane),onPointerUp:event=>endLaneDrag(event,lane),onPointerCancel:cancelLaneDrag,
        className:`xen-drum-lane-name ${__f52SampleLanes.includes(lane)?"xen-drum-lane-sample":""}`,
        title:__f52SampleLanes.includes(lane)?__xenDrumSampleHover(grid.sampleSlots?.[lane]?.name)+" · Click / right-click: Sample, Mixer & EQ · Drag: volume":"Click / right-click: Mixer & EQ · Drag: volume",
        children:[u.jsx("span",{className:"xen-drum-lane-caption",children:label[lane]}),
         u.jsx("span",{className:`xen-drum-lane-fill ${laneDrag.current?.lane===lane&&laneDrag.current?.dragged?"is-dragging":""}`,
          style:{width:`${Math.min(100,__f52MixerRead(lane).volume*100)}%`,backgroundColor:`color-mix(in srgb, #49e3aa ${Math.round(Math.min(1,__f52MixerRead(lane).volume)*100)}%, #a46aff)`}})
        ]}),
       u.jsx("button",{type:"button",className:"xen-drum-mini-mute","aria-label":(__f52MixerRead(lane).muted?"Unmute ":"Mute ")+label[lane],"aria-pressed":__f52MixerRead(lane).muted,
        title:(__f52MixerRead(lane).muted?"Unmute ":"Mute ")+label[lane],onPointerDown:event=>event.stopPropagation(),onClick:event=>{event.stopPropagation();__f52MixerSet(lane,{muted:!__f52MixerRead(lane).muted})},
        children:u.jsx("span",{className:"xen-drum-mini-led","data-muted":__f52MixerRead(lane).muted?"true":"false"})})
      ]}),
      ...Array.from({length:steps},(_,i)=>{
       const amount=grid.laneSteps[lane]?.[i]||0;
       const hitOffset=__f52HitVisualOffset(grid,lane,i);
       return u.jsx("button",{type:"button","aria-label":`${label[lane]||lane}, step ${i+1}`,
        "aria-pressed":amount>0,"data-selected-step":amount>0&&selected?.lane===lane&&selected?.index===i?"true":"false",
        "data-drum-hit":`${lane}:${i}`,"data-hit-offset":hitOffset.toFixed(2),
        onPointerDown:event=>begin(event,lane,i),onPointerEnter:event=>stepOver(event,lane,i),
        onContextMenu:e=>e.preventDefault(),onDragStart:e=>e.preventDefault(),
        title:`${label[lane]||lane} · bar ${Math.floor(i/seg)+1}, segment ${i%seg+1} · ${amount?Math.round(amount*100)+"% velocity":"off"} · ${hitOffset>=0?"+":""}${Math.round(hitOffset*100)}% step microtiming`,
        style:{opacity:amount>0?(amount<.7?.70:amount<.95?.85:1):1,position:'relative',
         transform:amount>0?`translateX(${(hitOffset*100).toFixed(1)}%)`:undefined,
         zIndex:amount>0&&Math.abs(hitOffset)>.005?2:undefined},
        className:`xen-drum-micro-cell h-6 min-w-0 rounded-sm border ${amount>0&&selected?.lane===lane&&selected?.index===i?"ring-1 ring-amber-200 ":""}${amount>0?"border-cyan-300 bg-cyan-500/80 hover:bg-cyan-400":"border-neutral-700 hover:bg-cyan-900/40"} ${amount<=0&&(i%seg===0)?"bg-neutral-800":""} ${amount<=0&&(i%seg!==0)?"bg-neutral-900":""}`,
        children:amount>0?u.jsxs(u.Fragment,{children:[
         u.jsx('span',{className:'xen-drum-hit-velocity',style:{width:`${Math.max(2,Math.min(100,amount/1.25*100)).toFixed(1)}%`}}),
         u.jsx('span',{'data-drum-micro-handle':`${lane}:${i}`,className:'xen-drum-hit-micro-grip',
          title:'Drag left edge: microtiming of this hit only',
          onPointerDown:event=>beginMicro(event,lane,i),onPointerMove:moveMicro,onPointerUp:endMicro,onPointerCancel:endMicro,
          onClick:event=>event.stopPropagation()})
        ]}):null},lane+"-"+i)})]},"drum-row-"+lane))]})}),
  u.jsxs("div",{className:"mt-2 rounded border border-amber-900/60 bg-neutral-950/50 p-2 text-[10px]",children:[
   u.jsx("button",{type:"button",onClick:()=>setDetailOpen(v=>!v),"aria-label":"Toggle last drum hit details","aria-expanded":detailOpen,className:"text-amber-200",children:(detailOpen?"▾ ":"▸ ")+"Last Drum Hit"+(selected?" · "+label[selected.lane]+" · Step "+(selected.index+1):" · select a step")}),
   detailOpen&&selected&&u.jsxs("div",{className:"mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3",children:[
     ...[["Velocity",'velocity',0,1.25,.01,stepValue,Math.round(stepValue*100)+"%"],["Microtiming",'offset',-.45,.45,.01,stepProgram?.microOffsetRatio||0,Math.round((stepProgram?.microOffsetRatio||0)*100)+"% step"],["Pan",'pan',-1,1,.01,stepProgram?.layers?.[0]?.panOffset||0,Math.round((stepProgram?.layers?.[0]?.panOffset||0)*100)+"%"],
      ["Chance",'probability',0,1,.01,stepProgram?.probability??1,Math.round((stepProgram?.probability??1)*100)+"%"],
      ["Decay",'decay',.2,2,.01,stepProgram?.decayLock??1,Math.round((stepProgram?.decayLock??1)*100)+"%"],
      ["Tone",'tone',0,1,.01,stepProgram?.toneLock??1,Math.round((stepProgram?.toneLock??1)*100)+"%"]].map(([name,field,min,max,step,value,caption])=>
      u.jsxs("label",{className:"flex flex-col gap-1 text-neutral-300",children:[name+" · "+caption,u.jsx(__XenRange,{type:"range","aria-label":"Last Drum Hit "+name,min,max,step,value,onChange:e=>setStepDetail(field,+e.target.value),className:"w-full"})]},field))
   ]}),
   detailOpen&&!selected&&u.jsx("span",{className:"block pt-1 text-neutral-500",children:"Click a step first. These parameters belong only to that hit and are saved with the beat."})
  ]}),
  u.jsx("div",{className:"mt-1 truncate whitespace-nowrap text-[10px] text-neutral-500",title:"Blue ▼ = global shuffle. Pink hit edge = individual microtiming ±45% step. Last Drum Hit = velocity, microtiming, pan. Rose ▼ = preview playhead.",children:"Blue ▼ global · Pink hit edge individual timing · Last Drum Hit: velocity / microtiming · Rose ▼ preview"}),
  drumStatusHost&&(previewStatus||saveStatus)?ao.createPortal(u.jsx("span",{role:"status","aria-live":"polite",className:"block w-full truncate text-center text-xs",style:{color:previewStatus?"#9eeacb":"#9bd9fa"},title:previewStatus||saveStatus,children:previewStatus||saveStatus}),drumStatusHost):null
 ]});
}
function pce({entries:e,activeEntry:t,dragId:n,dropId:r,onClose:a,onSelectEntry:o,onRenameEntry:i,onDeleteEntry:s,onDragStart:l,onDragOver:c,onDrop:d,onDragEnd:p,onOpenDrumMachine:f,headerControl:b,detailControls:g,rackControls:rc,focusFromMeta=false}){
 const [newDraft,setNewDraft]=P.useState(()=>__mlSharedDrumMachine.liveEdit?.__xenNewPatternDraft===true);
 P.useEffect(()=>__mlSharedDrumMachine.subscribe(()=>setNewDraft(__mlSharedDrumMachine.liveEdit?.__xenNewPatternDraft===true)),[]);
 __useQuickActive('drum',newDraft?null:t?.id,newDraft?'New Drum Pattern':t?.name,true,a);
 const [leftCollapsed,setLeftCollapsed]=P.useState(!!focusFromMeta),[rightCollapsed,setRightCollapsed]=P.useState(!!focusFromMeta);
 const[y,x]=P.useState(newDraft?'':t?.name??"");P.useEffect(()=>{x(newDraft?'':t?.name??"")},[t?.id,t?.name,newDraft]);
 const [creating,setCreating]=P.useState(false),[createError,setCreateError]=P.useState('');
 const saveEntry=async()=>{
  if(!newDraft){if(t)i(t.id,y);return;}
  if(creating||!y.trim())return;
  setCreating(true);setCreateError('');
  try{await __f52SaveNewDrumConfig(y)}catch(error){setCreateError('Creation failed: '+(error?.message||String(error)))}
  finally{setCreating(false)}
 };const[A,M]=P.useState(null),v=n?e.find(T=>T.id===n):null,w=v?e.findIndex(T=>T.id===v.id):-1,R=Mw(r,e.map(T=>({id:T.id,title:T.name})),n),k=R?.label??"",I=R?.targetLine??"",E=v?`Slot ${w>=0?w+1:"—"}${v.bars?` · ${v.bars} bars`:""}${v.drumKit?` · ${v.drumKit}`:""}`:"",F=new Set(R&&R.operation!=="swap"?R.highlightedEntryIds:[]),L=Cw(),B=(T,showHud=true)=>{const _=L.updatePreviewFromDragEvent(T);_&&(showHud&&M({x:T.clientX,y:T.clientY}),c(T,_.entryId,_.operation))},O=T=>{const _=L.getSession();if(!_)return;const G=L.getDropTarget();if(M(null),!G){T.preventDefault();return}d(T,G.entryId,G.operation,_.originVisibleIds,_.draggedId)};return u.jsxs("div",{"data-xen-header-menu":"drum",tabIndex:-1,"data-hotkey-scope":"drum-pattern-manager",className:"fixed inset-0 z-[145] flex items-center justify-center bg-black/65 p-4",onKeyDownCapture:T=>{T.stopPropagation(),T.key==="Escape"&&(T.preventDefault(),a())},children:[u.jsx(Rw,{state:A,label:k,title:I,sourceTitle:v?.name,sourceSubtitle:E,tone:"fuchsia"}),u.jsxs("div",{className:"xen-main-drum-modal flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-fuchsia-800/70 bg-neutral-950 p-4 text-[11px] shadow-2xl shadow-black/60",onClick:T=>T.stopPropagation(),children:[u.jsxs("div",{className:"flex items-start justify-between gap-3",children:[u.jsxs("div",{children:[u.jsx("div",{className:"text-[10px] uppercase tracking-[0.3em] text-fuchsia-300/80",children:"🥁 Manage Drum Pattern"}),u.jsx("div",{className:"mt-1 text-base font-semibold text-fuchsia-50",children:newDraft?"New Drum Pattern":t?.name??"No Drum Pattern selected"}),u.jsxs("div",{className:"text-fuchsia-100/70",children:[e.length," Entries · ← / → switch menu"]})]}),b?u.jsx("div",{className:"ml-auto min-w-[12rem] max-w-xs flex-1",children:b}):u.jsx("span",{className:"ml-auto"}),u.jsx("button",{type:"button",onClick:f,className:"shrink-0 rounded border border-cyan-600/80 px-3 py-2 text-cyan-100 hover:bg-cyan-950/40",children:"Go to Drum Machine"}),u.jsx("button",{type:"button",onClick:a,"aria-label":"Close Window",className:"rounded-full border border-fuchsia-800/70 px-3 py-1 text-base font-bold leading-none text-fuchsia-100 hover:bg-fuchsia-950/40",children:"×"})]}),u.jsxs("div",{className:"xen-main-drum-columns mt-4 grid min-h-0 flex-1 gap-4 overflow-hidden",
 "data-left-collapsed":leftCollapsed?"true":"false","data-right-collapsed":rightCollapsed?"true":"false",
 style:{gridTemplateColumns:`${leftCollapsed?"":"minmax(205px,220px) "}minmax(0,1fr)${rightCollapsed?"":" minmax(235px,255px)"}`},
 children:[leftCollapsed?null:u.jsx("div",{className:"flex min-h-0 flex-col",children:u.jsxs("div",{className:"flex min-h-0 flex-1 flex-col rounded border border-fuchsia-900/50 bg-fuchsia-950/20 p-3",children:[u.jsx("div",{className:"mb-2 text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/70",children:"Drum Lib"}),u.jsx("div",{className:"min-h-0 flex-1 space-y-2 overflow-y-auto pr-1","data-xen-sort-zone":"drum",onDragOver:B,onDrop:O,children:e.map((T,_)=>{const G=!newDraft&&t?.id===T.id,j=PS(r),N=j?.entryId===T.id&&j.operation==="swap"&&n&&n!==T.id,W=F.has(T.id)&&n&&n!==T.id;return u.jsx("div",{ref:V=>{L.registerRow(T.id,V)},className:"relative",children:u.jsxs("button",{type:"button",draggable:!0,onDragStart:V=>{L.beginDrag({draggedId:T.id,originVisibleIds:e.map(U=>U.id),payload:void 0}),l(V,T.id)},onDragEnd:()=>{L.clearDrag(),M(null),p()},...__quickProps('drum',T.id,T.name,{zone:'drum',start:V=>{L.beginDrag({draggedId:T.id,originVisibleIds:e.map(U=>U.id),payload:void 0});l(V,T.id)},over:V=>B(V,false),drop:O,end:()=>{L.clearDrag();M(null);p()},preview:()=>R?R.label+' · '+R.targetLine:''}),onClick:()=>o(T),className:`flex w-full items-center justify-between gap-3 rounded border px-3 py-2 text-left ${G?"border-fuchsia-400 bg-fuchsia-950/40 text-fuchsia-50":"border-fuchsia-900/40 bg-black/30 text-fuchsia-100/80 hover:bg-fuchsia-950/20"} ${N?"ring-1 ring-amber-300":W?"ring-1 ring-cyan-300":""}`,children:u.jsxs("div",{className:"min-w-0",children:[u.jsx("div",{className:"truncate font-semibold",children:[T.name,u.jsx(__QuickBadge,{kind:'drum',id:T.id})]}),u.jsxs("div",{className:"text-[10px] text-fuchsia-100/55",children:["Slot ",_+1,T.bars?` · ${T.bars} bars`:"",T.drumKit?` · ${T.drumKit}`:""]})]})})},T.id)})})]})}),u.jsxs("div",{className:"min-w-0 min-h-0 flex flex-col overflow-y-auto",children:[
 u.jsxs("div",{className:"mb-2 flex flex-nowrap items-center justify-between gap-2",children:[
 u.jsx("button",{type:"button","aria-label":"Toggle pattern list","aria-expanded":!leftCollapsed,onClick:()=>setLeftCollapsed(v=>!v),className:"rounded border border-fuchsia-800/70 px-3 py-1 text-xs text-fuchsia-100 hover:bg-fuchsia-950/40",children:leftCollapsed?"▶ Show Drum Lib":"◀ Hide Drum Lib"}),  u.jsx("div",{"data-xen-drum-status-slot":true,style:{flex:"1 1 120px",minWidth:0,maxWidth:"100%",overflow:"hidden",alignSelf:"center"}}),  u.jsx("button",{type:"button","aria-label":"Toggle sound controls","aria-expanded":!rightCollapsed,onClick:()=>setRightCollapsed(v=>!v),className:"rounded border border-fuchsia-800/70 px-3 py-1 text-xs text-fuchsia-100 hover:bg-fuchsia-950/40",children:rightCollapsed?"◀ Show sounds":"Hide sounds ▶"})]}),
 u.jsx(__mlCompactDrumGrid,{}),rc]}),rightCollapsed?null:u.jsx("div",{className:"min-h-0 overflow-y-auto pr-1",children:u.jsxs("div",{className:"space-y-3",children:[u.jsxs("div",{className:"rounded border border-fuchsia-900/50 bg-fuchsia-950/20 p-3",children:[u.jsx("div",{className:"mb-2 text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/70",children:newDraft?"New Entry · Unsaved":"Edit Entry"}),u.jsx("label",{className:"block text-[10px] uppercase tracking-[0.2em] text-fuchsia-100/70",children:"Name"}),u.jsx("input",{value:y,onChange:T=>x(T.target.value),placeholder:newDraft?"Name your new Drum Pattern":"",className:"mt-1 w-full rounded border border-fuchsia-900/50 bg-neutral-950 px-3 py-2 text-sm text-fuchsia-50"}),u.jsxs("div",{className:"mt-3 grid gap-2",children:[u.jsx("button",{type:"button",disabled:newDraft?(!y.trim()||creating):!t,onClick:saveEntry,className:"rounded border border-fuchsia-700/80 px-3 py-2 text-fuchsia-100 hover:bg-fuchsia-950/35 disabled:opacity-40",children:newDraft?(creating?"Creating…":"Create New Pattern"):"Save"}),u.jsx("button",{type:"button",disabled:newDraft||!t,onClick:()=>!newDraft&&t&&s(t.id),className:"rounded border border-red-900/70 px-3 py-2 text-red-200 hover:bg-red-950/40 disabled:opacity-40",children:"Remove from This Playlist"})]}),createError?u.jsx("p",{role:"alert",className:"mt-2 text-red-300",children:createError}):null]}),g,u.jsxs("div",{className:"rounded border border-cyan-800/60 bg-cyan-950/15 p-3",children:[u.jsx("div",{className:"mb-2 text-[10px] uppercase tracking-[0.25em] text-cyan-200/75",children:"Design Custom Drum Pattern"}),u.jsx("button",{type:"button",onClick:f,className:"w-full rounded border border-cyan-700/80 px-3 py-2 text-cyan-100 hover:bg-cyan-950/35",children:"Go to Drum Machine"})]}),null]})})]})]})]})}const hce="xensonar-level3lab-mode",fce="xensonar-level3lab-mode-session",gce="xensonar-level3lab-canonical-view",bce="xensonar-level3lab-canonical-view-session";
const __mlOpenDrumMachineEvent="xensonar:open-synthetic-forge-drum-machine";
function yce(){if(typeof window==="undefined")return;
 window.localStorage.setItem(hce,"canonical");window.sessionStorage.setItem(fce,"canonical");
 window.localStorage.setItem(gce,"drums");window.sessionStorage.setItem(bce,"drums");
 window.dispatchEvent(new CustomEvent(__mlOpenDrumMachineEvent,{detail:{view:"drums"}}));
}const vI="xensonar:drum-pattern-playlist-updated";function Sce(){return typeof window>"u"||typeof window.dispatchEvent!="function"?!1:(window.dispatchEvent(new CustomEvent(vI)),!0)}function QG(e){return typeof window>"u"?()=>{}:(window.addEventListener(vI,e),()=>window.removeEventListener(vI,e))}const UG="xensonar-drum-pattern-playlist-v1",P2={orderedIds:[],hiddenIds:[],aliases:{}};function KG(e){return`preset:${e}`}function $G(e){return`exported:${e}`}function Yl(){if(typeof window>"u")return P2;try{const e=JSON.parse(window.localStorage.getItem(UG)||"null");return!e||typeof e!="object"?P2:{orderedIds:Array.isArray(e.orderedIds)?e.orderedIds.filter(t=>typeof t=="string"):[],hiddenIds:Array.isArray(e.hiddenIds)?e.hiddenIds.filter(t=>typeof t=="string"):[],aliases:e.aliases&&typeof e.aliases=="object"?Object.fromEntries(Object.entries(e.aliases).filter(t=>typeof t[0]=="string"&&typeof t[1]=="string")):{}}}catch{return P2}}function $y(e){typeof window>"u"||(window.localStorage.setItem(UG,JSON.stringify(e)),Sce())}function vce(e){return[...e.drumPatterns.map(t=>({id:KG(t.value),kind:"preset",value:t.value,name:t.label,bars:__xenTimedBarsFromRecord(t)})),...e.exportedDrumConfigs.map(t=>{const n=xT({drumKit:t.drumKit,laneKitOverrides:t.laneKitOverrides});return{id:$G(t.id),kind:"exported",value:t.id,name:t.name,bars:t.bars,drumKit:n.drumKit,laneKitOverrides:n.drumLaneKits}})]}function nM(e){const t=e.state??Yl(),n=vce(e),r=new Map(n.map(i=>[i.id,i])),a=[...t.orderedIds.filter(i=>r.has(i)),...n.map(i=>i.id).filter(i=>!t.orderedIds.includes(i))],o=new Set(t.hiddenIds);return a.map(i=>r.get(i)).filter(i=>i!==void 0&&!o.has(i.id)).map(i=>{const s=t.aliases[i.id]?.trim();return s?{...i,name:s}:i})}function XG(e){return e.drumConfigMode==="exported"&&e.drumConfigId?$G(e.drumConfigId):KG(e.drumPattern)}function YG(e){return e.kind==="exported"?{drumConfigMode:"exported",drumConfigId:e.value,drumActive:!0,...xT({drumKit:e.drumKit,laneKitOverrides:e.laneKitOverrides})}:{drumConfigMode:"preset",drumPattern:e.value,drumConfigId:"",drumActive:!0}}function JG(e){const t=XG(e);return e.entries.find(n=>n.id===t)??e.entries[0]??null}function Ace(e){const t=nM(e);if(!t.length)return null;const n=XG(e),a=(Math.max(0,t.findIndex(o=>o.id===n))+e.direction+t.length)%t.length;return YG(t[a])}function xce(e,t){const n=Yl(),r={...n.aliases},a=t.trim();a?r[e]=a:delete r[e],$y({...n,aliases:r})}function Mce(e){const t=Yl();if(t.hiddenIds.includes(e))return t;const n={...t,hiddenIds:[...t.hiddenIds,e]};return $y(n),n}function wce(e){return e.filter((t,n,r)=>t&&r.indexOf(t)===n)}function Rce(e){const t=Yl(),n=wce(e.currentIds);if(!n.length||!n.includes(e.draggedId)||!n.includes(e.targetId))return t;const r=ww({ids:n,draggedId:e.draggedId,targetId:e.targetId,operation:e.operation}),a=new Set(n),o=t.orderedIds.filter(s=>!a.has(s)),i={...t,orderedIds:[...r,...o]};return $y(i),i}const MT="xensonar-bass-clip-library-v1",Cce="xensonar:bass-clip-library-updated",I2=()=>({clips:[],order:[]});function kce(){typeof window>"u"||window.dispatchEvent(new CustomEvent(Cce))}function AI(e){const t=e&&typeof e=="object"?e:{},r=(Array.isArray(t.clips)?t.clips:[]).filter(s=>!!s&&typeof s=="object"&&typeof s.id=="string").map(s=>__f48BassLibrary.byId.get(s.id)===s?s:Pr(s)),a=new Set(r.map(s=>s.id)),o=Array.isArray(t.order)?t.order:[],i=[...o.filter(s=>typeof s=="string"&&a.has(s)),...r.map(s=>s.id).filter(s=>!o.includes(s))];return{clips:r,order:i}}