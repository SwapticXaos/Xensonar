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
function __mlNextDrumVelocity(value,button){return button===2?(value>0?0:1):A7(value)}
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

/* F3.56.52: Three optional raw-audio lanes. The sample database owns the original Blob; the beat owns only its reference. */
const __f52SampleLanes=['sample1','sample2','sample3'];
/* The same lane semantics are used by the full canvas and the compact live editor. */
const __f52DrumLaneNames={kick:'Kick',snare:'Snare',hatClosed:'Hi-hat',hatOpen:'Open hat',clap:'Clap',perc:'Percussion',sample1:'Sample A',sample2:'Sample B',sample3:'Sample C'};
const __f52DrumLaneColors={sample1:'#2dd4bf',sample2:'#14b8a6',sample3:'#0d9488'};

function __f52NormalizeSampleSlots(input){const source=input&&typeof input==='object'?input:{};return Object.fromEntries(__f52SampleLanes.map((lane)=>{
 const row=source[lane]||{};return [lane,{id:typeof row.id==='string'?row.id.slice(0,160):'',name:typeof row.name==='string'?row.name.slice(0,140):'',volume:Math.max(0,Math.min(2,Number.isFinite(row.volume)?row.volume:1)),pan:Math.max(-1,Math.min(1,Number.isFinite(row.pan)?row.pan:0))}];}));}
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
function __f52CommitSharedDrumGrid(next){
 const machine=__mlSharedDrumMachine,snapshot=machine.snapshot,edit=machine.liveEdit;
 const grid=__f52EnsureDrumGrid(next);
 grid.useCustom=true;grid.presetSource=snapshot?.pattern||grid.presetSource||'broken_lilt';
 machine.setLiveEdit({grid,kit:edit?.kit||snapshot?.kit||'standard',
  laneKitOverrides:edit?.laneKitOverrides||snapshot?.exported?.laneKitOverrides||snapshot?.laneKitOverrides||{},
  laneSettings:edit?.laneSettings||snapshot?.exported?.laneSettings||snapshot?.laneSettings||{}});
}
/* A single per-hit mutation contract for both full-room and compact editors. */
function __f52PatchDrumHit(lane,index,field,value){
 const latest=__f52EnsureDrumGrid(__mlSharedDrumMachine.liveEdit?.grid||__mlGridFromSelection(__mlSharedDrumMachine.snapshot));
 if(index<0||index>=latest.stepCount||!latest.laneOrder.includes(lane))return;
 const next=im(latest),base=next.laneSteps[lane]?.[index]||0;
 const p=WH(next.stepPrograms?.[lane]?.[index],lane,index,base);
 if(field==='velocity'){const v=Math.max(0,Math.min(1.25,value));next.laneSteps[lane][index]=v;p.value=v;}
 else if(field==='offset')p.microOffsetRatio=Math.max(-.24,Math.min(.24,value));
 else if(field==='pan')p.layers=[{...p.layers[0],panOffset:Math.max(-1,Math.min(1,value))},...p.layers.slice(1)];
 else if(field==='probability')p.probability=Math.max(0,Math.min(1,value));
 else if(field==='decay')p.decayLock=Math.max(.2,Math.min(2,value));
 else if(field==='tone')p.toneLock=Math.max(0,Math.min(1,value));
 else return;
 next.stepPrograms[lane]={...(next.stepPrograms[lane]||{}),[index]:p};__f52CommitSharedDrumGrid(next);
}
/* Full-screen details use the same hit programming as the compact rack. */
function __f52FullDrumHitInspector({selectedHit}){
 const [expanded,setExpanded]=P.useState(false);
 const latest=__f52EnsureDrumGrid(__mlSharedDrumMachine.liveEdit?.grid||__mlGridFromSelection(__mlSharedDrumMachine.snapshot));
 const selected=selectedHit&&latest.laneOrder.includes(selectedHit.lane)&&selectedHit.index<latest.stepCount?selectedHit:null;
 const velocity=selected?latest.laneSteps[selected.lane]?.[selected.index]||0:0;
 const program=selected?WH(latest.stepPrograms?.[selected.lane]?.[selected.index],selected.lane,selected.index,velocity):null;
 const params=[['Velocity','velocity',0,1.25,velocity],['Microtiming','offset',-.24,.24,program?.microOffsetRatio||0],
  ['Pan','pan',-1,1,program?.layers?.[0]?.panOffset||0],['Chance','probability',0,1,program?.probability??1],
  ['Decay','decay',.2,2,program?.decayLock??1],['Tone','tone',0,1,program?.toneLock??1]];
 return u.jsxs('div',{className:'rounded border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-xs',children:[
  u.jsx('button',{type:'button',onClick:()=>setExpanded(v=>!v),'aria-label':'Toggle full drum hit details',className:'text-amber-200',children:(expanded?'▾ ':'▸ ')+'Last Drum Hit'+(selected?' · '+(__f52DrumLaneNames[selected.lane]||selected.lane)+' · Step '+(selected.index+1):' · select a step')}),
  expanded&&(selected?u.jsx('div',{className:'mt-2 grid grid-cols-2 gap-3 md:grid-cols-3',children:params.map(([label,field,min,max,value])=>u.jsxs('label',{className:'flex flex-col gap-1 text-neutral-300',children:[label+' · '+Number(value).toFixed(2),u.jsx('input',{type:'range','aria-label':'Full Drum Hit '+label,min,max,step:.01,value,onChange:e=>__f52PatchDrumHit(selected.lane,selected.index,field,Number(e.target.value)),className:'w-full'})]},field))}):u.jsx('div',{className:'pt-2 text-neutral-500',children:'Click a drum grid step to edit its individual timing, velocity and tone.'}))
 ]});
}
/* Full-room sample inspector: routes through the same live edit and sample database as the compact rack. */
function __f52FullDrumSampleInspector({lane}){
 const [rows,setRows]=P.useState([]),[status,setStatus]=P.useState('');
 P.useEffect(()=>{let active=true;const refresh=()=>gs().then(items=>{if(active)setRows(items)}).catch(()=>{if(active)setStatus('Sample database unavailable.')});
  refresh();window.addEventListener('xensonar:melodic-sample-library-updated',refresh);
  return()=>{active=false;window.removeEventListener('xensonar:melodic-sample-library-updated',refresh)};
 },[]);
 const grid=__f52EnsureDrumGrid(__mlSharedDrumMachine.liveEdit?.grid||__mlGridFromSelection(__mlSharedDrumMachine.snapshot));
 const slot=grid.sampleSlots[lane]||{id:'',name:'',volume:1,pan:0};
 const name=__f52DrumLaneNames[lane]||lane;
 const patch=(delta)=>{const latest=__f52EnsureDrumGrid(__mlSharedDrumMachine.liveEdit?.grid||grid);
  latest.sampleSlots[lane]={...latest.sampleSlots[lane],...delta};__f52CommitSharedDrumGrid(latest)};
 const choose=id=>{const row=rows.find(v=>v.id===id);patch({id,name:row?.name||''});setStatus(row?'Linked '+row.name+'.':'Sample unlinked.')};
 const upload=async file=>{if(!file)return;const source=__f351DrumSource(__mlSharedDrumMachine.snapshot);setStatus('Importing '+file.name+'…');
  try{const result=await __f52ImportDrumSample(file);setRows(await gs());
   if(source!==__f351DrumSource(__mlSharedDrumMachine.snapshot)){setStatus('Saved to database. Pattern changed — choose sample manually.');return;}
   patch({id:result.id,name:result.name});setStatus('Linked '+result.name+'.');
  }catch(error){setStatus('Import failed: '+(error?.message||String(error)))}}
 return u.jsxs('div',{className:'space-y-3 rounded border border-teal-800 bg-neutral-950/70 p-3 text-xs',children:[
  u.jsxs('div',{className:'flex items-center gap-2 font-medium text-teal-100',children:[u.jsx('span',{className:'h-2.5 w-2.5 rounded-full',style:{backgroundColor:__f52DrumLaneColors[lane]}}),name+' · Raw Audio']}),
  u.jsxs('label',{className:'block space-y-1 text-neutral-300',children:['Sample Database',u.jsxs('select',{'aria-label':name+' sample',value:slot.id||'',onChange:e=>choose(e.target.value),className:'w-full rounded border border-teal-800 bg-neutral-900 px-2 py-2 text-teal-50',children:[
   u.jsx('option',{value:'',children:'— No sample —'}),
   ...(slot.id&&!rows.some(row=>row.id===slot.id)?[u.jsx('option',{value:slot.id,children:'Missing: '+(slot.name||slot.id)})]:[]),
   ...rows.map(row=>u.jsx('option',{value:row.id,children:row.name+' · '+Number(row.durationSec||0).toFixed(1)+'s'},row.id))]})]}),
  u.jsx('label',{className:'block cursor-pointer rounded border border-teal-700 px-3 py-2 text-center text-teal-100',children:['Upload Raw Audio…',u.jsx('input',{type:'file',accept:'audio/*,.wav,.aiff,.aif,.flac,.mp3,.ogg,.m4a',className:'sr-only','aria-label':name+' upload',onChange:e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value='';}})]}),
  ...[['Volume','volume',0,2,.01],['Pan','pan',-1,1,.01]].map(([caption,field,min,max,step])=>u.jsxs('label',{className:'flex items-center gap-2 text-neutral-300',children:[u.jsx('span',{className:'w-12',children:caption}),u.jsx('input',{type:'range','aria-label':name+' '+field,min,max,step,value:slot[field]??(field==='volume'?1:0),onChange:e=>patch({[field]:Number(e.target.value)}),className:'flex-1'}),u.jsx('span',{className:'w-11 text-right',children:(slot[field]??(field==='volume'?1:0)).toFixed(2)})]},field)),
  u.jsx('p',{className:'text-[11px] text-neutral-500',children:'Sample references, timing markers and hit velocities belong to the same beat in both Drum Machine views.'}),
  status&&u.jsx('div',{role:'status',className:'text-teal-200',children:status})]});
}
function __mlCompactDrumGrid(){
 const [,rerender]=P.useReducer(x=>x+1,0),painting=P.useRef(null),draggingMarker=P.useRef(null),timingStrip=P.useRef(null),stepScroll=P.useRef(null);
 const [saving,setSaving]=P.useState(false),[saveStatus,setSaveStatus]=P.useState("");
 const [previewStatus,setPreviewStatus]=P.useState("");
 const [selectedHit,setSelectedHit]=P.useState(null);
 const [detailOpen,setDetailOpen]=P.useState(false);
 const [sampleRows,setSampleRows]=P.useState([]),[sampleNotice,setSampleNotice]=P.useState('');
 const [samplePicker,setSamplePicker]=P.useState(null);const samplePickerRef=P.useRef(null);
 const toggleSamplePicker=(lane,event)=>{
  if(samplePicker?.lane===lane){setSamplePicker(null);return;}
  const box=event.currentTarget.getBoundingClientRect();
  const width=Math.min(340,window.innerWidth-16),height=Math.min(300,window.innerHeight-16);
  setSamplePicker({lane,left:Math.max(8,Math.min(window.innerWidth-width-8,box.right+6)),top:Math.max(8,Math.min(window.innerHeight-height-8,box.top))});
 };
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
 P.useEffect(()=>__mlSharedDrumMachine.subscribePreview((phase,step)=>{
   setPreviewPhase(phase);setPreviewStep(step);
 }),[]);
 const previewRequest=P.useRef(0);
 P.useEffect(()=>__mlSharedDrumMachine.subscribe(()=>rerender()),[]);
 P.useEffect(()=>{
   if(previewPhase!=="playing"||previewStep<0)return;
   const scroll=stepScroll.current,marker=scroll?.querySelector('.xen-drum-marker-playing');
   if(!marker)return;
   const viewport=scroll.getBoundingClientRect(),head=marker.getBoundingClientRect();
   if(head.right>viewport.right-18||head.left<viewport.left+90&&previewStep>0){
     const target=head.left-viewport.left-Math.max(95,viewport.width*.28);
     scroll.scrollLeft=Math.max(0,scroll.scrollLeft+target);
   }
 },[previewPhase,previewStep]);
 // Closing the rack must not leave an invisible audition looping.
 P.useEffect(()=>()=>{if(__mlSharedDrumMachine.previewOwned)__mlSharedDrumMachine.stop?.()},[]);
 P.useEffect(()=>{
  const finish=()=>{painting.current=null;draggingMarker.current=null;__mlSharedDrumMachine.endGesture()};
  window.addEventListener("pointerup",finish);window.addEventListener("pointercancel",finish);
  return()=>{window.removeEventListener("pointerup",finish);window.removeEventListener("pointercancel",finish)};
 },[]);
 const snapshot=__mlSharedDrumMachine.snapshot,current=__mlSharedDrumMachine.liveEdit;
 const grid=__f52EnsureDrumGrid(current?.grid||__mlGridFromSelection(snapshot));
 const rows=grid.laneOrder||zT,bars=Math.max(1,grid.bars||1),seg=Math.max(1,grid.segmentsPerBar||16);
 const steps=Math.max(1,grid.stepCount||bars*seg),segments=sl(grid.segmentMarkers,seg);
 const columns=__mlDrumGridColumns(grid),minWidth=Math.max(500,steps*27+__mlDrumLabelWidth);
 const commit=(next)=>{setSaveStatus("");__f52CommitSharedDrumGrid(next)};
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
  setSelectedHit({lane,index});__mlSharedDrumMachine.beginGesture();painting.current={lane,value,button:event.button};update(lane,index,value);
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
   const name=window.prompt("Save Drum Pattern As",(snapshot?.label||"Live Beat")+" · Edit");
   if(!name?.trim())return;
   setSaving(true);
   try{const edit=__mlSharedDrumMachine.liveEdit;const src=edit?.grid||grid;
     const row=await dfe({name:name.trim(),drumKit:edit?.kit||snapshot?.kit,
       matrix:IQe(src,snapshot?.pattern),sourceWorkspace:"xensonar-main-room-live",
       laneKitOverrides:edit?.laneKitOverrides||snapshot?.exported?.laneKitOverrides||snapshot?.laneKitOverrides||{},
       laneSettings:edit?.laneSettings||snapshot?.exported?.laneSettings||snapshot?.laneSettings||{},
       stepPrograms:src.stepPrograms||{},sampleSlots:src.sampleSlots||{}});
     ri("drumConfigSendRequest",{id:row.id});setSaveStatus("Saved: "+row.name);
   }catch(error){setSaveStatus("Save failed: "+(error?.message||String(error)))}
   finally{setSaving(false)}
 };
 const label=__f52DrumLaneNames;
 return u.jsxs("section",{className:"xen-main-drum-editor min-w-0 rounded border border-cyan-800/70 bg-cyan-950/10 p-3",children:[
  u.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-2",children:[
   u.jsxs("div",{children:[u.jsx("div",{className:"text-[10px] uppercase tracking-[.22em] text-cyan-200",children:"Live Drum Machine"}),
    u.jsx("div",{className:"text-[10px] text-neutral-400",children:"Same shuffle timing markers as the full Drum Machine. Edit live without stopping the Material Track."})]}),
   u.jsx("span",{className:"text-[10px] text-amber-200",children:"◀ Click: soft → medium → loud → off · Right-click: erase / strong"})]}),
  u.jsxs("div",{className:"mt-2 flex flex-wrap gap-2 text-[10px]",children:[
   u.jsx("button",{type:"button",onClick:()=>{const next=im(grid);next.laneOrder.forEach(l=>next.laneSteps[l]=next.laneSteps[l].map(()=>0));commit(next)},className:"rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-800",children:"Clear"}),
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
  samplePicker&&ao.createPortal(u.jsxs("div",{ref:samplePickerRef,role:"dialog","aria-label":(label[samplePicker.lane]||'Sample')+" selection",
   className:"xen-drum-sample-dialog fixed max-h-[min(300px,65vh)] w-[min(340px,calc(100vw-16px))] overflow-y-auto rounded-lg border-2 border-teal-400 p-3 text-[11px] text-neutral-100",
   style:{left:samplePicker.left,top:samplePicker.top,backgroundColor:"#0b111b",opacity:1,isolation:"isolate",zIndex:2147483000,boxShadow:"0 15px 45px rgba(0,0,0,.95),0 0 0 1px rgba(94,234,212,.45)"},children:[
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
    u.jsx("label",{className:"mt-3 flex items-center gap-2 text-neutral-400",children:["Spurpegel",u.jsx("input",{type:"range","aria-label":label[samplePicker.lane]+" volume",min:0,max:2,step:.01,value:grid.sampleSlots?.[samplePicker.lane]?.volume??1,onChange:e=>{const next=__f52EnsureDrumGrid(__mlSharedDrumMachine.liveEdit?.grid||grid);next.sampleSlots[samplePicker.lane].volume=+e.target.value;commit(next)},className:"flex-1"}),Math.round((grid.sampleSlots?.[samplePicker.lane]?.volume??1)*100)+"%"]}),
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
        "aria-label":`Bar start marker ${bar+1}`,"data-playing":previewPhase==="playing"&&previewStep===bar*seg?"true":"false",
        className:`xen-main-drum-marker xen-drum-start-marker ${previewPhase==="playing"&&previewStep===bar*seg?"xen-drum-marker-playing":""}`,
        style:{left:`${bar/bars*100}%`},title:`Start of bar ${bar+1} · fixed boundary`,children:"▼"},"start-marker-"+bar)),
       ...Array.from({length:bars},(_,bar)=>segments.map((pos,index)=>u.jsx("button",{
        type:"button","aria-label":`Timing marker ${index+1}, bar ${bar+1}`,
        "data-playing":previewPhase==="playing"&&previewStep===bar*seg+index+1?"true":"false",
        className:`xen-main-drum-marker ${previewPhase==="playing"&&previewStep===bar*seg+index+1?"xen-drum-marker-playing":""}`,style:{left:`${(bar+pos)/bars*100}%`},
        title:`Move triangle to shift segment boundary ${index+1} in all bars`,
        onPointerDown:event=>beginMarker(event,index,bar),onPointerMove:onMarkerMove,onPointerUp:endMarker,
        onPointerCancel:endMarker,onContextMenu:e=>e.preventDefault(),children:"▼"},"marker-"+bar+"-"+index))).flat()]})]}),
    ...rows.map(lane=>u.jsxs("div",{className:"xen-main-drum-grid-row",style:{gridTemplateColumns:columns},children:[
      __f52SampleLanes.includes(lane)?u.jsx("button",{type:"button","data-drum-sample-picker-toggle":lane,
        onContextMenu:event=>__LanePan.open(event,lane),"aria-expanded":samplePicker?.lane===lane,"aria-label":"Choose "+label[lane]+" audio sample",onClick:event=>toggleSamplePicker(lane,event),
        className:`h-6 min-w-0 truncate rounded border px-1.5 text-left text-[10px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-200 ${samplePicker?.lane===lane?"border-teal-300 bg-teal-950 text-teal-100":"border-teal-700 bg-neutral-900 text-teal-200 hover:border-teal-400 hover:bg-teal-950"}`,title:grid.sampleSlots?.[lane]?.name||"Select sample",children:label[lane]}):
      u.jsx("button",{type:"button",onContextMenu:event=>__LanePan.open(event,lane),className:"truncate pr-2 text-left text-[10px] text-neutral-300",title:"Right-click: "+(label[lane]||lane)+" Pan",children:label[lane]||lane}),
      ...Array.from({length:steps},(_,i)=>{
       const amount=grid.laneSteps[lane]?.[i]||0;
       return u.jsx("button",{type:"button","aria-label":`${label[lane]||lane}, step ${i+1}`,
        "aria-pressed":amount>0,"data-selected-step":selected?.lane===lane&&selected?.index===i?"true":"false",onPointerDown:event=>begin(event,lane,i),onPointerEnter:event=>stepOver(event,lane,i),
        onContextMenu:e=>e.preventDefault(),onDragStart:e=>e.preventDefault(),
        title:`${label[lane]||lane} · bar ${Math.floor(i/seg)+1}, segment ${i%seg+1} · ${amount?Math.round(amount*100)+"%":"off"}`,
        style:{opacity:amount>0?(amount<.7?.58:amount<.95?.78:1):1},
        className:`h-6 min-w-0 rounded-sm border ${selected?.lane===lane&&selected?.index===i?"ring-1 ring-amber-200 ":""}${amount>0?"border-cyan-300 bg-cyan-500/80 hover:bg-cyan-400":"border-neutral-700 hover:bg-cyan-900/40"} ${amount<=0&&(i%seg===0)?"bg-neutral-800":""} ${amount<=0&&(i%seg!==0)?"bg-neutral-900":""}`},lane+"-"+i)})]},"drum-row-"+lane))]})}),
  u.jsxs("div",{className:"mt-2 rounded border border-amber-900/60 bg-neutral-950/50 p-2 text-[10px]",children:[
   u.jsx("button",{type:"button",onClick:()=>setDetailOpen(v=>!v),"aria-label":"Toggle last drum hit details","aria-expanded":detailOpen,className:"text-amber-200",children:(detailOpen?"▾ ":"▸ ")+"Last Drum Hit"+(selected?" · "+label[selected.lane]+" · Step "+(selected.index+1):" · select a step")}),
   detailOpen&&selected&&u.jsxs("div",{className:"mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3",children:[
     ...[["Velocity",'velocity',0,1.25,.01,stepValue,Math.round(stepValue*100)+"%"],["Microtiming",'offset',-.24,.24,.01,stepProgram?.microOffsetRatio||0,Math.round((stepProgram?.microOffsetRatio||0)*100)+"% step"],["Pan",'pan',-1,1,.01,stepProgram?.layers?.[0]?.panOffset||0,Math.round((stepProgram?.layers?.[0]?.panOffset||0)*100)+"%"],
      ["Chance",'probability',0,1,.01,stepProgram?.probability??1,Math.round((stepProgram?.probability??1)*100)+"%"],
      ["Decay",'decay',.2,2,.01,stepProgram?.decayLock??1,Math.round((stepProgram?.decayLock??1)*100)+"%"],
      ["Tone",'tone',0,1,.01,stepProgram?.toneLock??1,Math.round((stepProgram?.toneLock??1)*100)+"%"]].map(([name,field,min,max,step,value,caption])=>
      u.jsxs("label",{className:"flex flex-col gap-1 text-neutral-300",children:[name+" · "+caption,u.jsx("input",{type:"range","aria-label":"Last Drum Hit "+name,min,max,step,value,onChange:e=>setStepDetail(field,+e.target.value),className:"w-full"})]},field))
   ]}),
   detailOpen&&!selected&&u.jsx("span",{className:"block pt-1 text-neutral-500",children:"Click a step first. These parameters belong only to that hit and are saved with the beat."})
  ]}),
  u.jsx("div",{className:"mt-1 text-[10px] text-neutral-500",children:"Drag ▼ markers to shift segment timing in all bars. The saved pattern retains those exact boundaries and every hit velocity."}),
  saveStatus?u.jsx("div",{role:"status",className:"mt-1 text-xs text-cyan-200",children:saveStatus}):null,
  previewStatus?u.jsx("div",{role:"status",className:"mt-1 text-xs text-emerald-200",children:previewStatus}):null
 ]});
}
function pce({entries:e,activeEntry:t,dragId:n,dropId:r,onClose:a,onSelectEntry:o,onRenameEntry:i,onDeleteEntry:s,onDragStart:l,onDragOver:c,onDrop:d,onDragEnd:p,onOpenDrumMachine:f,headerControl:b,detailControls:g,rackControls:rc}){
 __useQuickActive('drum',t?.id,t?.name,true,a);const [leftCollapsed,setLeftCollapsed]=P.useState(false),[rightCollapsed,setRightCollapsed]=P.useState(false);
 const[y,x]=P.useState(t?.name??"");P.useEffect(()=>{x(t?.name??"")},[t?.id,t?.name]);const[A,M]=P.useState(null),v=n?e.find(T=>T.id===n):null,w=v?e.findIndex(T=>T.id===v.id):-1,R=Mw(r,e.map(T=>({id:T.id,title:T.name})),n),k=R?.label??"",I=R?.targetLine??"",E=v?`Slot ${w>=0?w+1:"—"}${v.bars?` · ${v.bars} bars`:""}${v.drumKit?` · ${v.drumKit}`:""}`:"",F=new Set(R&&R.operation!=="swap"?R.highlightedEntryIds:[]),L=Cw(),B=(T,showHud=true)=>{const _=L.updatePreviewFromDragEvent(T);_&&(showHud&&M({x:T.clientX,y:T.clientY}),c(T,_.entryId,_.operation))},O=T=>{const _=L.getSession();if(!_)return;const G=L.getDropTarget();if(M(null),!G){T.preventDefault();return}d(T,G.entryId,G.operation,_.originVisibleIds,_.draggedId)};return u.jsxs("div",{"data-xen-header-menu":"drum",tabIndex:-1,"data-hotkey-scope":"drum-pattern-manager",className:"fixed inset-0 z-[145] flex items-center justify-center bg-black/65 p-4",onKeyDownCapture:T=>{T.stopPropagation(),T.key==="Escape"&&(T.preventDefault(),a())},children:[u.jsx(Rw,{state:A,label:k,title:I,sourceTitle:v?.name,sourceSubtitle:E,tone:"fuchsia"}),u.jsxs("div",{className:"xen-main-drum-modal flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-fuchsia-800/70 bg-neutral-950 p-4 text-[11px] shadow-2xl shadow-black/60",onClick:T=>T.stopPropagation(),children:[u.jsxs("div",{className:"flex items-start justify-between gap-3",children:[u.jsxs("div",{children:[u.jsx("div",{className:"text-[10px] uppercase tracking-[0.3em] text-fuchsia-300/80",children:"🥁 Manage Drum Pattern"}),u.jsx("div",{className:"mt-1 text-base font-semibold text-fuchsia-50",children:t?.name??"No Drum Pattern selected"}),u.jsxs("div",{className:"text-fuchsia-100/70",children:[e.length," Entries · ← / → Menü wechseln"]})]}),b?u.jsx("div",{className:"ml-auto min-w-[12rem] max-w-xs flex-1",children:b}):u.jsx("span",{className:"ml-auto"}),u.jsx("button",{type:"button",onClick:f,className:"shrink-0 rounded border border-cyan-600/80 px-3 py-2 text-cyan-100 hover:bg-cyan-950/40",children:"Go to Drum Machine"}),u.jsx("button",{type:"button",onClick:a,"aria-label":"Close Window",className:"rounded-full border border-fuchsia-800/70 px-3 py-1 text-base font-bold leading-none text-fuchsia-100 hover:bg-fuchsia-950/40",children:"×"})]}),u.jsxs("div",{className:"xen-main-drum-columns mt-4 grid min-h-0 flex-1 gap-4 overflow-hidden",
 "data-left-collapsed":leftCollapsed?"true":"false","data-right-collapsed":rightCollapsed?"true":"false",
 style:{gridTemplateColumns:`${leftCollapsed?"":"minmax(170px,1fr) "}minmax(0,2.65fr)${rightCollapsed?"":" minmax(230px,1fr)"}`},
 children:[leftCollapsed?null:u.jsx("div",{className:"flex min-h-0 flex-col",children:u.jsxs("div",{className:"flex min-h-0 flex-1 flex-col rounded border border-fuchsia-900/50 bg-fuchsia-950/20 p-3",children:[u.jsx("div",{className:"mb-2 text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/70",children:"Playlist ordnen"}),u.jsx("div",{className:"mb-2 text-[10px] leading-relaxed text-fuchsia-100/75",children:"Drag an entry: the action appears on the dragged block. Dropping on entries swaps them; dropping at boundaries inserts them."}),u.jsx("div",{className:"min-h-0 flex-1 space-y-2 overflow-y-auto pr-1","data-xen-sort-zone":"drum",onDragOver:B,onDrop:O,children:e.map((T,_)=>{const G=t?.id===T.id,j=PS(r),N=j?.entryId===T.id&&j.operation==="swap"&&n&&n!==T.id,W=F.has(T.id)&&n&&n!==T.id;return u.jsx("div",{ref:V=>{L.registerRow(T.id,V)},className:"relative",children:u.jsxs("button",{type:"button",draggable:!0,onDragStart:V=>{L.beginDrag({draggedId:T.id,originVisibleIds:e.map(U=>U.id),payload:void 0}),l(V,T.id)},onDragEnd:()=>{L.clearDrag(),M(null),p()},...__quickProps('drum',T.id,T.name,{zone:'drum',start:V=>{L.beginDrag({draggedId:T.id,originVisibleIds:e.map(U=>U.id),payload:void 0});l(V,T.id)},over:V=>B(V,false),drop:O,end:()=>{L.clearDrag();M(null);p()},preview:()=>R?R.label+' · '+R.targetLine:''}),onClick:()=>o(T),className:`flex w-full items-center justify-between gap-3 rounded border px-3 py-2 text-left ${G?"border-fuchsia-400 bg-fuchsia-950/40 text-fuchsia-50":"border-fuchsia-900/40 bg-black/30 text-fuchsia-100/80 hover:bg-fuchsia-950/20"} ${N?"ring-1 ring-amber-300":W?"ring-1 ring-cyan-300":""}`,children:[u.jsxs("div",{className:"min-w-0",children:[u.jsx("div",{className:"truncate font-semibold",children:[T.name,u.jsx(__QuickBadge,{kind:'drum',id:T.id})]}),u.jsxs("div",{className:"text-[10px] text-fuchsia-100/55",children:["Slot ",_+1,T.bars?` · ${T.bars} bars`:"",T.drumKit?` · ${T.drumKit}`:""]})]}),u.jsx("div",{className:"flex shrink-0 items-center gap-2",children:u.jsx("span",{className:"rounded border border-fuchsia-900/50 px-2 py-1 text-[10px] uppercase tracking-widest text-fuchsia-100/70",children:T.kind==="exported"?"Export":"Preset"})})]})},T.id)})})]})}),u.jsxs("div",{className:"min-w-0 min-h-0 flex flex-col overflow-y-auto",children:[
 u.jsxs("div",{className:"mb-2 flex flex-wrap items-center justify-between gap-2",children:[
 u.jsx("button",{type:"button","aria-label":"Toggle pattern list","aria-expanded":!leftCollapsed,onClick:()=>setLeftCollapsed(v=>!v),className:"rounded border border-fuchsia-800/70 px-3 py-1 text-xs text-fuchsia-100 hover:bg-fuchsia-950/40",children:leftCollapsed?"▶ Show playlist":"◀ Hide playlist"}),
 u.jsx("button",{type:"button","aria-label":"Toggle sound controls","aria-expanded":!rightCollapsed,onClick:()=>setRightCollapsed(v=>!v),className:"rounded border border-fuchsia-800/70 px-3 py-1 text-xs text-fuchsia-100 hover:bg-fuchsia-950/40",children:rightCollapsed?"◀ Show sounds":"Hide sounds ▶"})]}),
 u.jsx(__mlCompactDrumGrid,{}),rc]}),rightCollapsed?null:u.jsx("div",{className:"min-h-0 overflow-y-auto pr-1",children:u.jsxs("div",{className:"space-y-3",children:[u.jsxs("div",{className:"rounded border border-fuchsia-900/50 bg-fuchsia-950/20 p-3",children:[u.jsx("div",{className:"mb-2 text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/70",children:"Edit Entry"}),u.jsx("label",{className:"block text-[10px] uppercase tracking-[0.2em] text-fuchsia-100/70",children:"Name"}),u.jsx("input",{value:y,onChange:T=>x(T.target.value),className:"mt-1 w-full rounded border border-fuchsia-900/50 bg-neutral-950 px-3 py-2 text-sm text-fuchsia-50"}),u.jsxs("div",{className:"mt-3 grid gap-2",children:[u.jsx("button",{type:"button",disabled:!t,onClick:()=>t&&i(t.id,y),className:"rounded border border-fuchsia-700/80 px-3 py-2 text-fuchsia-100 hover:bg-fuchsia-950/35 disabled:opacity-40",children:"Save"}),u.jsx("button",{type:"button",disabled:!t,onClick:()=>t&&s(t.id),className:"rounded border border-red-900/70 px-3 py-2 text-red-200 hover:bg-red-950/40 disabled:opacity-40",children:"Remove from This Playlist"})]})]}),g,u.jsxs("div",{className:"rounded border border-cyan-800/60 bg-cyan-950/15 p-3",children:[u.jsx("div",{className:"mb-2 text-[10px] uppercase tracking-[0.25em] text-cyan-200/75",children:"Design Custom Drum Pattern"}),u.jsx("button",{type:"button",onClick:f,className:"w-full rounded border border-cyan-700/80 px-3 py-2 text-cyan-100 hover:bg-cyan-950/35",children:"Go to Drum Machine"})]}),u.jsx("div",{className:"rounded border border-neutral-800 bg-neutral-950/60 p-3 text-[11px] leading-relaxed text-neutral-400",children:"Preset patterns and Forge exports share one play list here. Internal provenance is preserved but does not block the live flow."})]})})]})]})]})}const hce="xensonar-level3lab-mode",fce="xensonar-level3lab-mode-session",gce="xensonar-level3lab-canonical-view",bce="xensonar-level3lab-canonical-view-session";
const __mlOpenDrumMachineEvent="xensonar:open-synthetic-forge-drum-machine";
function yce(){if(typeof window==="undefined")return;
 window.localStorage.setItem(hce,"canonical");window.sessionStorage.setItem(fce,"canonical");
 window.localStorage.setItem(gce,"drums");window.sessionStorage.setItem(bce,"drums");
 window.dispatchEvent(new CustomEvent(__mlOpenDrumMachineEvent,{detail:{view:"drums"}}));
}const vI="xensonar:drum-pattern-playlist-updated";function Sce(){return typeof window>"u"||typeof window.dispatchEvent!="function"?!1:(window.dispatchEvent(new CustomEvent(vI)),!0)}function QG(e){return typeof window>"u"?()=>{}:(window.addEventListener(vI,e),()=>window.removeEventListener(vI,e))}const UG="xensonar-drum-pattern-playlist-v1",P2={orderedIds:[],hiddenIds:[],aliases:{}};function KG(e){return`preset:${e}`}function $G(e){return`exported:${e}`}function Yl(){if(typeof window>"u")return P2;try{const e=JSON.parse(window.localStorage.getItem(UG)||"null");return!e||typeof e!="object"?P2:{orderedIds:Array.isArray(e.orderedIds)?e.orderedIds.filter(t=>typeof t=="string"):[],hiddenIds:Array.isArray(e.hiddenIds)?e.hiddenIds.filter(t=>typeof t=="string"):[],aliases:e.aliases&&typeof e.aliases=="object"?Object.fromEntries(Object.entries(e.aliases).filter(t=>typeof t[0]=="string"&&typeof t[1]=="string")):{}}}catch{return P2}}function $y(e){typeof window>"u"||(window.localStorage.setItem(UG,JSON.stringify(e)),Sce())}function vce(e){return[...e.drumPatterns.map(t=>({id:KG(t.value),kind:"preset",value:t.value,name:t.label})),...e.exportedDrumConfigs.map(t=>{const n=xT({drumKit:t.drumKit,laneKitOverrides:t.laneKitOverrides});return{id:$G(t.id),kind:"exported",value:t.id,name:t.name,bars:t.bars,drumKit:n.drumKit,laneKitOverrides:n.drumLaneKits}})]}function nM(e){const t=e.state??Yl(),n=vce(e),r=new Map(n.map(i=>[i.id,i])),a=[...t.orderedIds.filter(i=>r.has(i)),...n.map(i=>i.id).filter(i=>!t.orderedIds.includes(i))],o=new Set(t.hiddenIds);return a.map(i=>r.get(i)).filter(i=>i!==void 0&&!o.has(i.id)).map(i=>{const s=t.aliases[i.id]?.trim();return s?{...i,name:s}:i})}function XG(e){return e.drumConfigMode==="exported"&&e.drumConfigId?$G(e.drumConfigId):KG(e.drumPattern)}function YG(e){return e.kind==="exported"?{drumConfigMode:"exported",drumConfigId:e.value,drumActive:!0,...xT({drumKit:e.drumKit,laneKitOverrides:e.laneKitOverrides})}:{drumConfigMode:"preset",drumPattern:e.value,drumConfigId:"",drumActive:!0}}function JG(e){const t=XG(e);return e.entries.find(n=>n.id===t)??e.entries[0]??null}function Ace(e){const t=nM(e);if(!t.length)return null;const n=XG(e),a=(Math.max(0,t.findIndex(o=>o.id===n))+e.direction+t.length)%t.length;return YG(t[a])}function xce(e,t){const n=Yl(),r={...n.aliases},a=t.trim();a?r[e]=a:delete r[e],$y({...n,aliases:r})}function Mce(e){const t=Yl();if(t.hiddenIds.includes(e))return t;const n={...t,hiddenIds:[...t.hiddenIds,e]};return $y(n),n}function wce(e){return e.filter((t,n,r)=>t&&r.indexOf(t)===n)}function Rce(e){const t=Yl(),n=wce(e.currentIds);if(!n.length||!n.includes(e.draggedId)||!n.includes(e.targetId))return t;const r=ww({ids:n,draggedId:e.draggedId,targetId:e.targetId,operation:e.operation}),a=new Set(n),o=t.orderedIds.filter(s=>!a.has(s)),i={...t,orderedIds:[...r,...o]};return $y(i),i}const MT="xensonar-bass-clip-library-v1",Cce="xensonar:bass-clip-library-updated",I2=()=>({clips:[],order:[]});function kce(){typeof window>"u"||window.dispatchEvent(new CustomEvent(Cce))}function AI(e){const t=e&&typeof e=="object"?e:{},r=(Array.isArray(t.clips)?t.clips:[]).filter(s=>!!s&&typeof s=="object"&&typeof s.id=="string").map(s=>__f48BassLibrary.byId.get(s.id)===s?s:Pr(s)),a=new Set(r.map(s=>s.id)),o=Array.isArray(t.order)?t.order:[],i=[...o.filter(s=>typeof s=="string"&&a.has(s)),...r.map(s=>s.id).filter(s=>!o.includes(s))];return{clips:r,order:i}}