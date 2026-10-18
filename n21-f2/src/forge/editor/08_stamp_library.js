/* Presets and database stamps are accessible from the same visible library. */
function JHe(props){
 const [open,setOpen]=P.useState(false),[tab,setTab]=P.useState('all'),[query,setQuery]=P.useState(''),[active,setActive]=P.useState(null);
 const entries=dB(s=>s.entries),h=P.createElement;
 const choose=preset=>{const state=pe.getState();state.setActiveTool('stamp');state.updateToolSettings({brushSize:preset.defaultSize,intensity:preset.defaultIntensity});
  state.setStampData({width:preset.stamp.width,height:preset.stamp.height,data:preset.stamp.data.slice(),grainData:preset.stamp.grainData.slice()});state.resetStampTransform();state.setStampPhase('stamping');setActive(preset.id)};
 const presets=Wb.filter(p=>(p.name+' '+p.description+' '+p.tags.join(' ')).toLowerCase().includes(query.toLowerCase()));
 return h('section',{'data-stamp-library':true,className:'space-y-2 rounded border border-neutral-800 bg-black/20 p-2'},
  h('button',{type:'button','aria-expanded':open,onClick:()=>setOpen(!open),className:'flex w-full items-center justify-between gap-2 text-left'},
   h('span',{className:'text-[11px] uppercase tracking-[0.2em] text-neutral-400'},'Stamp Library'),h('span',{className:'text-[10px] text-cyan-300'},Wb.length+' Presets · '+entries.length+' Custom '+(open?'▴':'▾'))),
  open&&h('div',null,
   h('div',{style:{display:'flex',gap:5,marginBottom:8}},...['all','presets','custom'].map(t=>h('button',{key:t,type:'button','aria-pressed':tab===t,onClick:()=>setTab(t),className:'rounded border px-2 py-1 text-xs '+(tab===t?'border-cyan-500 text-cyan-100':'border-neutral-700 text-neutral-400')},t==='all'?'All':t==='presets'?'Presets':'Custom'))),
   tab!=='custom'&&h('div',null,h('input',{type:'search','aria-label':'Search stamp presets',placeholder:'Search presets…',value:query,onChange:e=>setQuery(e.target.value),className:'mb-2 w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs'}),
    h('div',{'data-stamp-presets':true,style:{maxHeight:300,overflowY:'auto',display:'grid',gap:5}},...presets.map(p=>h('button',{key:p.id,type:'button','data-stamp-preset':p.id,'aria-pressed':active===p.id,onClick:()=>choose(p),title:p.description,className:'rounded border p-2 text-left '+(active===p.id?'border-cyan-400 bg-cyan-950/50':'border-neutral-700 bg-neutral-950/40')},
     h('div',{className:'text-xs text-neutral-100'},p.name),h('div',{style:{fontSize:10,color:p.previewColor}},(p.bank||p.category||'Preset')+' · '+p.spectralRole),h('div',{className:'text-[10px] text-neutral-500'},p.description))))),
   tab!=='presets'&&h(__CustomStampLibrary,props)));
}
