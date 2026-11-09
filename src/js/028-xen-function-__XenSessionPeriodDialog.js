
function __XenSessionPeriodDialog({entry,onClose,onConfirm}){
 const [message,setMessage]=P.useState('');
 const wb=Woe({open:true,currentTuning:entry.id,onMessage:setMessage});
 const {editor,setEditor,selectedMarkerIndex,setSelectedMarkerIndex,centInput,setCentInput,workbenchRef,workbenchMarkers,rebuildEqualDraft,updateSelectedMarker,toggleJiInterval,beginMarkerDrag}=wb;
 const [name,setName]=P.useState(()=>entry.name);
 const [jiOpen,setJiOpen]=P.useState(false);
 const [error,setError]=P.useState('');
 const dismiss=()=>{setError('');onClose()};
 const apply=()=>{const draft={...editor,name};const original=x2(entry.id);
  const changed=editor.periodFamily!==original.periodFamily||Math.abs(editor.periodCents-original.periodCents)>.05||editor.stepCents.length!==original.stepCents.length||editor.stepCents.some((c,i)=>Math.abs(c-original.stepCents[i])>.05);
  if(!changed){dismiss();return;}
  if(onConfirm(draft)){dismiss()}else setError('Tuning deviation could not be saved. Check the period and step order.');
 };
 return ao.createPortal(u.jsx('div',{className:'xen-grid-bass-modal',onPointerDown:e=>e.stopPropagation(),onClick:e=>{e.stopPropagation();if(e.target===e.currentTarget)dismiss()},onKeyDown:e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();dismiss()}},children:u.jsxs('section',{className:'xen-grid-bass-dialog xen-grid-period-dialog',role:'dialog','aria-modal':true,'aria-label':'Session Period Workbench',children:[
  u.jsxs('header',{children:[u.jsxs('div',{children:[u.jsx('strong',{children:'Period Workbench · '+entry.name}),u.jsx('small',{className:'xen-grid-period-caption',children:'Save a separate Custom Tuning for this Session tile; the original tuning stays unchanged.'})]}),u.jsx('button',{type:'button','aria-label':'Close tuning editor',onClick:dismiss,children:'×'})]}),
  u.jsxs('div',{className:'xen-grid-period-fields',children:[
   u.jsxs('label',{children:[u.jsx('span',{children:'Period'}),u.jsx('select',{value:editor.periodFamily,'aria-label':'Period family',onChange:e=>rebuildEqualDraft(e.target.value,editor.steps,e.target.value==='tritave'?dI.tritave:dI.octave),children:[u.jsx('option',{value:'octave',children:'Octave'}),u.jsx('option',{value:'tritave',children:'Tritave'})]})]}),
   u.jsxs('label',{children:[u.jsx('span',{children:'Total cents'}),u.jsx('input',{type:'number',min:400,max:4000,step:.1,value:editor.periodCents,onChange:e=>setEditor(v=>({...v,periodCents:Math.max(400,Math.min(4000,Number(e.target.value)||v.periodCents))}))})]}),
   u.jsxs('label',{children:[u.jsx('span',{children:'Pitch steps'}),u.jsx('input',{type:'number',min:2,max:__xenGridStepLimit,step:1,value:editor.steps,onChange:e=>rebuildEqualDraft(editor.periodFamily,Number(e.target.value)||12,editor.periodCents)})]}),
   u.jsx('button',{type:'button',onClick:()=>rebuildEqualDraft(editor.periodFamily,editor.steps,editor.periodCents),children:'Reset as Equal Tuning'}),
  ]}),
  u.jsx(__XenNativePeriodMarkerRack,{editor,markers:workbenchMarkers,selectedIndex:selectedMarkerIndex,onSelect:setSelectedMarkerIndex,onDrag:beginMarkerDrag,containerRef:workbenchRef,classification:wb.draftClassification}),
  u.jsxs('div',{className:'xen-grid-period-fields',children:[
   u.jsxs('label',{children:[u.jsx('span',{children:'Selected degree '+(selectedMarkerIndex+1)+' · cents'}),u.jsx('input',{type:'number',step:.1,disabled:selectedMarkerIndex===0,value:centInput,onChange:e=>setCentInput(e.target.value),onBlur:()=>updateSelectedMarker(Number(String(centInput).replace(',','.'))||0),onKeyDown:e=>{if(e.key==='Enter')updateSelectedMarker(Number(String(centInput).replace(',','.'))||0)}})]}),
   u.jsx('button',{type:'button',onClick:()=>updateSelectedMarker((editor.stepCents[selectedMarkerIndex]||0)-1),disabled:selectedMarkerIndex===0,children:'−1¢'}),
   u.jsx('button',{type:'button',onClick:()=>updateSelectedMarker((editor.stepCents[selectedMarkerIndex]||0)+1),disabled:selectedMarkerIndex===0,children:'+1¢'}),
   u.jsx('button',{type:'button',onClick:()=>setJiOpen(!jiOpen),children:'JI ▾'}),
  ]}),
  jiOpen&&u.jsx('div',{className:'xen-grid-period-ji',role:'group','aria-label':'Just Intonation interval choices',children:aT.map(x=>u.jsx('button',{type:'button',onClick:()=>toggleJiInterval(x.label,x.cents),children:x.label+' · '+x.cents.toFixed(1)+'¢'},x.label))}),
  u.jsxs('label',{className:'xen-grid-period-name',children:[u.jsx('span',{children:'Variation name'}),u.jsx('input',{type:'text',maxLength:100,value:name,onChange:e=>setName(e.target.value)})]}),
  (error||message)&&u.jsx('small',{role:error?'alert':'status',children:error||message}),
  u.jsxs('footer',{children:[u.jsx('button',{type:'button',onClick:dismiss,children:'Cancel'}),u.jsx('button',{type:'button',onClick:apply,children:'Use Tuning Variation'})]})
 ]})},),document.body);
}
