
function __XenBassGridEditor({tuningId,draft=null,onDraftChange=null,profile=null,forceOpen=false}){
 const globalSnap=P.useSyncExternalStore(__XenBassGrid.subscribe,__XenBassGrid.snapshot,__XenBassGrid.snapshot);
 const api=draft?__XenBassGridDraftAPI(tuningId||'12edo',draft,onDraftChange,profile):__XenBassGrid;
 const snap=draft?{source:draft.bassUsesGrid!==false?'bass':'main'}:globalSnap;
 const id=tuningId||'12edo',cfg=api.read(id),d=api.descriptor(id);
 const steps=d.steps,[selected,setSelected]=P.useState(0),[libraryRevision,refreshLibraryOptions]=P.useState(0);
 P.useEffect(()=>{setSelected(0)},[id,d.resolved]);
 const picked=Math.min(selected,Math.max(0,steps.length-1)),muteField=d.linked?'linkedMutedDegrees':'mutedDegrees',muted=new Set(cfg[muteField]);
 const offset=Number(cfg.offsetsCents[picked]||0);
 const targets=api.availableTargets();const selectable=targets.library.filter(item=>item.id!==id);
 const toggle=idx=>{api.set(id,{[muteField]:muted.has(idx)?cfg[muteField].filter(n=>n!==idx):[...cfg[muteField],idx]});api.auditionDegree(id,idx)};
 const label=idx=>__XenBassGridInterval(api.effectiveCents(id,idx));
 const uses=snap.source==='bass'||cfg.droneEnabled||cfg.rflEnabled;
 return u.jsxs(forceOpen?'section':'details',{'data-xen-bass-grid-editor':id,onToggle:e=>{if(e.currentTarget.open){api.refreshLibrary();refreshLibraryOptions(n=>n+1)}},className:'relative w-48 rounded-md border border-cyan-900/70 bg-neutral-950 text-xs text-cyan-100',children:[
  !forceOpen&&u.jsx('summary',{className:'cursor-pointer px-2 py-1.5 font-semibold text-cyan-200 whitespace-nowrap',children:`Bass Grid · ${d.linked?'Linked': 'Derived'}${uses?' ◉':''} ▾`}),
  u.jsxs('div',{'data-xen-bass-grid-flyout':true,style:{position:forceOpen?'relative':'absolute',top:forceOpen?'auto':'calc(100% + 5px)',right:0,width:forceOpen?'100%':'min(550px, calc(100vw - 46px))',maxHeight:forceOpen?'none':'min(440px, calc(100vh - 130px))',overflowY:'auto',zIndex:200,boxShadow:'0 15px 45px rgba(0,0,0,.9)'},className:'space-y-2 rounded-xl border border-cyan-700/75 bg-neutral-950 p-3 text-xs text-cyan-100',onClick:e=>e.stopPropagation(),children:[
   u.jsxs('div',{className:'flex flex-wrap items-center gap-3',children:[
    u.jsxs('label',{className:'flex items-center gap-1.5',children:[u.jsx('input',{type:'checkbox','aria-label':'Bass uses Grid',checked:snap.source==='bass',onChange:e=>api.setSource(e.target.checked?'bass':'main')}),'Bass uses Grid']}),
    u.jsxs('label',{className:'flex items-center gap-1.5',children:[u.jsx('input',{type:'checkbox','aria-label':'Drone uses Grid',checked:cfg.droneEnabled,onChange:e=>{api.set(id,{droneEnabled:e.target.checked});if(e.target.checked)window.dispatchEvent(new Event('xensonar:drone-grid-cursor-follow'))}}),'Drone uses Grid']}),
    u.jsxs('label',{className:'flex items-center gap-1.5',children:[u.jsx('input',{type:'checkbox','aria-label':'RFL uses Grid',checked:cfg.rflEnabled,onChange:e=>api.set(id,{rflEnabled:e.target.checked})}),'RFL uses Grid']})
   ]}),
   u.jsxs('div',{className:'flex gap-2 items-center',children:[u.jsx('span',{className:'text-cyan-200/80',children:'Grid source'}),
    u.jsx('select',{'aria-label':'Bass Grid mode',value:cfg.sourceMode,onChange:e=>api.set(id,{sourceMode:e.target.value}),className:'min-w-0 flex-1 rounded border border-cyan-900 bg-neutral-900 p-1',children:[u.jsx('option',{value:'derived',children:'Derived from Main'}),u.jsx('option',{value:'linked',children:'Link to Other Grid'})]})]}),
    !d.linked&&u.jsx('p',{className:'text-[10px] text-cyan-200/75',children:'Derived from Main tuning · all tuning degrees available · independent Bass mutes and cents offsets'}),
   d.linked&&u.jsxs('div',{className:'flex flex-wrap gap-2 items-center',children:[
    u.jsx('label',{className:'text-[11px]',children:'Other Grid'}),
    u.jsx('select',{'aria-label':'Other Grid source',value:cfg.linkedTuningId&&selectable.some(v=>v.id===cfg.linkedTuningId)?cfg.linkedTuningId:'',onChange:e=>api.set(id,{linkedTuningId:e.target.value,linkedMutedDegrees:[]}),className:'min-w-0 flex-1 rounded border border-cyan-900 bg-neutral-900 p-1',children:[
      u.jsx('option',{value:'',children:cfg.linkedTuningId&&!d.available?'⚠ Missing grid: '+cfg.linkedTuningId:'Choose a tuning…'}),
      u.jsx('optgroup',{label:'Active Selection',children:targets.active.filter(x=>x.id!==id).map(x=>u.jsx('option',{value:x.id,children:x.label},'active-'+x.id))}),
      u.jsx('optgroup',{label:'Tuning Library',children:selectable.filter(x=>!targets.active.some(a=>a.id===x.id)).map(x=>u.jsx('option',{value:x.id,children:x.label},'library-'+x.id))})
     ]}),
     u.jsx('span',{className:'text-[10px] text-cyan-100/65',children:'Stored tuning is reused. Only degree mutes are local.'})
    ]}),
   d.linked&&!d.available&&u.jsx('p',{role:'alert',className:'text-amber-300',children:cfg.linkedTuningId?'Linked grid is missing. Bass Grid quantization is bypassed; choose an existing tuning.':'Choose a tuning from Active Selection or Tuning Library.'}),
   u.jsx('p',{className:'text-[10px] text-cyan-100/65',children:'Click: mute/unmute and audition · Right-click: select a degree · ~5th is highlighted. RFL quantizes root/transposition only, not notes inside recorded chords.'}),
   u.jsx('div',{style:{display:'grid',gridTemplateColumns:`repeat(${Math.min(12,Math.max(1,steps.length))},minmax(0,1fr))`,gap:3},children:steps.map((cent,idx)=>{
    const name=label(idx),effective=api.effectiveCents(id,idx),mutedNow=muted.has(idx),offsetVal=d.linked?0:Number(cfg.offsetsCents[idx]||0);
    const hover=`Degree ${idx+1} · ${name.label?name.label+' · ':''}${effective.toFixed(1)} cents${d.linked?'':` (${offsetVal>=0?'+':''}${offsetVal}¢ offset)`} · ${mutedNow?'muted':'active'}`;
    return u.jsx('button',{type:'button','aria-label':`Bass Grid degree ${idx+1}`,onClick:()=>{setSelected(idx);toggle(idx)},onContextMenu:e=>{e.preventDefault();setSelected(idx)},title:hover,'aria-pressed':!mutedNow,
      className:`min-h-8 rounded border px-0.5 py-1 text-[10px] ${mutedNow?'border-neutral-700 text-neutral-500 bg-neutral-950':'border-cyan-700 text-cyan-100 bg-cyan-950/35'} ${name.fifth?'ring-1 ring-amber-500/85 text-amber-200 font-bold':''} ${idx===picked?'outline outline-1 outline-fuchsia-300':''}`,
      children:u.jsxs('span',{className:'flex flex-col items-center leading-tight',children:[u.jsx('span',{children:String(idx+1)}),name.fifth&&u.jsx('span',{className:'text-[9px]',children:'~5th'}),!d.linked&&cfg.offsetsCents[idx]&&u.jsx('span',{className:'text-[9px]',children:`${cfg.offsetsCents[idx]>0?'+':''}${cfg.offsetsCents[idx]}¢`})]})},idx)
   })}),
   !d.linked&&u.jsxs('div',{className:'flex flex-wrap items-center gap-2',children:[u.jsx('span',{children:`Degree ${picked+1}: ${offset>0?'+':''}${offset}¢`}),u.jsx('input',{type:'range',min:-200,max:200,step:1,value:offset,'aria-label':'Bass Grid cents offset',onChange:e=>api.set(id,{offsetsCents:{...cfg.offsetsCents,[picked]:Number(e.target.value)}}),className:'min-w-32 flex-1 accent-cyan-400'}),u.jsx('button',{type:'button',className:'rounded border border-neutral-700 px-2 py-1',onClick:()=>{const next={...cfg.offsetsCents};delete next[picked];api.set(id,{offsetsCents:next})},children:'0¢'})]}),
   u.jsxs('div',{className:'flex items-center gap-2',children:[u.jsx('button',{type:'button',className:'rounded border border-cyan-800 px-2 py-1',onClick:()=>{const targets=[0,700,1000],allowed=steps.map((_,i)=>i),selected=new Set;for(const cents of targets){const index=allowed.filter(i=>!selected.has(i)).sort((a,b)=>Math.abs(steps[a]-cents)-Math.abs(steps[b]-cents))[0];if(index!==undefined)selected.add(index)}api.set(id,{[muteField]:steps.map((_,i)=>i).filter(i=>!selected.has(i))})},disabled:!steps.length,children:'3-Degree Foundation'}),u.jsx('button',{type:'button',className:'rounded border border-neutral-700 px-2 py-1',onClick:()=>api.set(id,d.linked?{linkedMutedDegrees:[]}:{mutedDegrees:[],offsetsCents:{}}),children:'Use All Degrees'})]})
  ]})
 ]});
}
