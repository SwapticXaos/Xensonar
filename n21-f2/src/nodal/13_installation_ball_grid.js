/* A control bridge, not a second grid bank. The Main Room owns tuning,
   manual offsets/mutes and presets; Installation reads their canonical lines. */
const __NodalBallGrid=(()=>{
 let binding=null,revision=0,cache=null;const listeners=new Set(),empty=Object.freeze([]);
 const params=()=>binding?.paramsRef.current;
 function lines(){
  const p=params();if(!p||__xenGridMuted(p))return empty;
  const source=pEe(p),range=gj();
  if(cache?.source===source&&cache.min===range.min&&cache.max===range.max)return cache.lines;
  const rows=source.filter(row=>!row.manualMuted&&!row.modeMuted&&Number.isFinite(row.freq)&&row.freq>=range.min&&row.freq<=range.max)
   .map(row=>Object.freeze({id:row.id,freq:row.freq,y:(range.max-row.freq)/(range.max-range.min)})).sort((a,b)=>a.y-b.y);
  cache={source,min:range.min,max:range.max,lines:Object.freeze(rows)};return cache.lines;
 }
 function reset(state,y,time,grid,frequency=0){Object.assign(state,{previousY:y,time,grid,lastHit:-Infinity,lastLine:null,frequency});}
 function control(snapshot,mix,state,time){
  const y=myzelGClamp(snapshot.cursorNormalizedY??.5);
  if(mix.ballToneMode!=='grid'){reset(state,y,time,null);return {hz:0,gate:1};}
  const grid=lines();
  if(state.grid!==grid||!Number.isFinite(state.time)||time-state.time>.25||time<state.time){const hz=state.frequency||0;reset(state,y,time,grid,hz);return {hz,gate:0};}
  const previous=state.previousY;let crossed=null;
  if(y>previous){for(const line of grid)if(line.y>previous&&line.y<=y)crossed=line;}
  else if(y<previous){for(let i=grid.length-1;i>=0;i--)if(grid[i].y<previous&&grid[i].y>=y)crossed=grid[i];}
  // One fresh crossing per control frame; never replay a dense-grid backlog.
  // Reversing/jittering on the same boundary must first leave its small band.
  if(crossed&&((mix.rootLevel??.62)>0)&&((mix.ballToneLevel??1)>0)&&(!state.lastLine||crossed.id!==state.lastLine.id||Math.max(Math.abs(previous-state.lastLine.y),Math.abs(y-state.lastLine.y))>2/tc)){
   state.frequency=crossed.freq;state.lastHit=time;state.lastLine=crossed;
  }
  state.previousY=y;state.time=time;if((mix.rootLevel??.62)<=0||(mix.ballToneLevel??1)<=0){state.lastHit=-Infinity;state.lastLine=null;}
  const age=time-state.lastHit,gate=age>=0&&age<.14?(1-age/.14)**2:0;
  return {hz:state.frequency,gate:(mix.rootLevel??.62)>0&&(mix.ballToneLevel??1)>0?gate:0};
 }
 function draw(ctx,width,height){
  if(binding?.modeRef.current!=='installation'||binding?.mixRef.current?.ballToneMode!=='grid')return;
  const rows=lines();if(!rows.length)return;
  ctx.save();ctx.strokeStyle='rgba(80,215,230,.25)';ctx.fillStyle='rgba(140,235,245,.72)';ctx.lineWidth=.75;ctx.font='10px sans-serif';
  let lastLabel=-Infinity,lastRow=-Infinity;ctx.beginPath();
  for(const row of rows){const y=row.y*height;if(y-lastRow<1)continue;lastRow=y;ctx.moveTo(0,y);ctx.lineTo(width,y);
   if(y-lastLabel>25&&y>10&&y<height-5){ctx.fillText(row.freq.toFixed(1)+' Hz',6,y-3);lastLabel=y;}}
  ctx.stroke();ctx.restore();
 }
 return Object.freeze({bind:value=>{binding=value},params,lines,control,draw,
  subscribe:fn=>(listeners.add(fn),()=>listeners.delete(fn)),snapshot:()=>revision,
  publish(){revision++;for(const fn of listeners)fn()},
  changeTuning:id=>binding?.changeTuning(id),changeMode:id=>binding?.changeMode(id),mix:()=>binding?.mixRef.current,shift:cents=>binding?.shiftGridOffsets(cents),update:patch=>binding?.updateParams(patch)});
})();
function __NodalBallControls({mix,onMix}){
 P.useSyncExternalStore(__NodalBallGrid.subscribe,__NodalBallGrid.snapshot,__NodalBallGrid.snapshot);
 const h=P.createElement,params=__NodalBallGrid.params(),rack=Y6(),[open,setOpen]=P.useState(false);
 const [base,setBase]=P.useState(()=>String(params?.gridBase??440));
 P.useEffect(()=>setBase(String(params?.gridBase??440)),[params?.gridBase]);
 const mode=mix.ballToneMode==='grid'?'grid':'continuous';
 const label=(text,child)=>h('label',{style:{display:'flex',flexDirection:'column',gap:4,minWidth:120}},h('span',null,text),child);
 const commitBase=()=>{const value=Number(base.replace(',','.'));if(Number.isFinite(value)&&value>=400&&value<=1760)__NodalBallGrid.update({gridBase:Math.round(value*10)/10});else setBase(String(params?.gridBase??440));};
 return h('section',{'data-nodal-ball-controls':true,style:{padding:'8px 10px',border:'1px solid #31575c',borderRadius:5,fontSize:12,color:'#bce6e9'}},
  h('div',{style:{display:'flex',flexWrap:'wrap',alignItems:'end',gap:12}},
   label('Ball · Y-Ton '+Math.round((mix.ballToneLevel??1)*100)+' %',h('input',{type:'range',min:0,max:1,step:.01,value:mix.ballToneLevel??1,'aria-label':'Ball Y tone volume',title:'Kontinuierlichen Ball-Eigenton samt Ball-Reaktion ausblenden, ohne Node-Resonanzen oder Root Reference zu verändern.',onChange:event=>onMix('ballToneLevel',Number(event.currentTarget.value))})),
   label('Auslösung',h('select',{'aria-label':'Ball tone trigger mode',value:mode,onChange:event=>onMix('ballToneMode',event.currentTarget.value)},h('option',{value:'continuous'},'Kontinuierlich'),h('option',{value:'grid'},'Rasterlinien überqueren'))),
   mode==='grid'&&params&&label('Hauptraum-Raster',h('select',{'aria-label':'Installation grid tuning',value:params.gridTuning,onChange:event=>__NodalBallGrid.changeTuning(event.currentTarget.value)},...rack.libraryOptions.map(item=>h('option',{key:item.value,value:item.value},item.label)))),
   mode==='grid'&&params&&label('Modus',h('select',{'aria-label':'Installation grid mode',value:params.gridMode,onChange:event=>__NodalBallGrid.changeMode(event.currentTarget.value)},h('option',{value:'chromatic'},'Alle Schritte'),...Ka(params.gridTuning).filter(item=>item.value!=='chromatic').map(item=>h('option',{key:item.value,value:item.value},item.label)))),
   mode==='grid'&&params&&label('Rasterbasis · Hz',h('input',{'aria-label':'Installation grid base Hz',type:'number',min:400,max:1760,step:.1,value:base,onChange:event=>setBase(event.currentTarget.value),onBlur:commitBase,onKeyDown:event=>{if(event.key==='Enter')event.currentTarget.blur()},style:{width:100}})),
   mode==='grid'&&params&&label('Raster verschieben · Cent',h('input',{type:'range',min:-500,max:500,step:1,value:__xenGridShiftCents(params.gridTuning,params.manualGridStepOffsets),'aria-label':'Installation grid shift cents',onChange:event=>__NodalBallGrid.shift(Number(event.currentTarget.value))})),
   mode==='grid'&&h('button',{type:'button',onClick:()=>setOpen(true),style:{border:'1px solid #44747d',padding:'5px 9px',borderRadius:4}},'Raster bearbeiten / Schrittzahl')),
  h('p',{style:{fontSize:10,color:'#819fa4',marginTop:5}},mode==='grid'?__xenGridMuted(params)?'Das gemeinsame Raster ist stumm. Im Hauptraum entmuten, um Linien und Impulse zu hören.':'Gemeinsame Presets, Schrittzahl, Verschiebungen und stumme Stufen aus dem Hauptraum. Änderungen gelten dort ebenfalls.':'Ball-Eigenton samt Ball-Reaktion; 0 lässt die Node-Resonanzen bestehen. Root Reference bleibt separat einstellbar.'),
  h(U6,{open,currentTuning:params?.gridTuning??'12edo',activeRack:rack.activeGridRack,onClose:()=>setOpen(false),onRackChange:rack.setStoredActiveGridRack,onActivateTuning:__NodalBallGrid.changeTuning,onResetRack:rack.resetStoredActiveGridRack}));
}
