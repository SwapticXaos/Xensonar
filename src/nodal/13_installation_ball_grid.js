/* A control bridge, not a second grid bank. The Main Room owns tuning,
   manual offsets/mutes and presets; Installation (Room III) and the Psychedelic Lab (Room V) read and edit them here.
   ROOM5-02: rows (all lines incl. muted, for the triangles), toggleMute, setOffset, windowOffset, resetWindow added for Room V. */
/* GRID-VISIBLE-01: drawing the grid lines in Art Installation is optional (default off); the grid itself always sounds. */
let __nodalGridLinesVisible=false;
const __nodalGridVisibleListeners=new Set();
function __XenGridVisibleToggle(){
 const on=P.useSyncExternalStore(f=>(__nodalGridVisibleListeners.add(f),()=>__nodalGridVisibleListeners.delete(f)),()=>__nodalGridLinesVisible,()=>false);
 return P.createElement('label',{style:{display:'inline-flex',alignItems:'center',gap:6,cursor:'pointer'}},
  P.createElement('input',{type:'checkbox','data-grid-visible':true,checked:on,onChange:e=>{__nodalGridLinesVisible=e.currentTarget.checked;__nodalGridVisibleListeners.forEach(f=>f());}}),'Grid Visible');
}

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
  if(!__nodalGridLinesVisible||binding?.modeRef.current!=='installation'||binding?.mixRef.current?.ballToneMode!=='grid')return;
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
  changeTuning:id=>binding?.changeTuning(id),changeMode:id=>binding?.changeMode(id),mix:()=>binding?.mixRef.current,shift:cents=>binding?.shiftGridOffsets(cents),update:patch=>binding?.updateParams(patch),
  rows:()=>binding?binding.rows():empty,toggleMute:step=>binding?.toggleMute(step),setOffset:(step,value)=>binding?.setOffset(step,value),windowOffset:()=>binding?.windowOffsetRef.current??0,resetWindow:()=>binding?.resetWindow(),shiftWindow:direction=>binding?.shiftWindow(direction),bound:()=>binding!==null});
})();

/* BALL-PAINT-01: the ball paints its path. An offscreen layer collects the trail and fades very slowly
   (about a minute per e-fold, then 1 level per step), so a picture builds up while the ball wanders.
   WARM zone: canvas only, no audio, no state, no storage. Lower resolution layer (max 960 px wide). */
const __NodalBallPaint=(()=>{
 let off=null,octx=null,sc=1,w=0,h=0,lx=NaN,ly=NaN,lt=0,fadeAt=0,hue=190;
 const STEP=400;
 function fade(now){
  if(now-fadeAt<STEP)return;fadeAt=now;if(!octx)return;
  const img=octx.getImageData(0,0,off.width,off.height),d=img.data;
  for(let i=3;i<d.length;i+=4){const a=d[i];if(a)d[i]=a-Math.max(1,(a*.006)|0);}
  octx.putImageData(img,0,0);
 }
 function draw(ctx,ball,width,height){
  if(!(width>0&&height>0)||!ball||!Number.isFinite(ball.x)||!Number.isFinite(ball.y))return;
  const now=typeof performance!=='undefined'?performance.now():Date.now();
  if(!off||w!==width||h!==height){
   sc=Math.min(1,960/width);off=document.createElement('canvas');off.width=Math.max(1,Math.ceil(width*sc));off.height=Math.max(1,Math.ceil(height*sc));
   octx=off.getContext('2d',{willReadFrequently:true});w=width;h=height;lx=NaN;fadeAt=now;
  }
  if(now-lt>1500){lx=NaN;fadeAt=now;}
  fade(now);
  if(Number.isFinite(lx)){
   const dx=ball.x-lx,dy=ball.y-ly,dist=Math.hypot(dx,dy);
   if(dist>.5&&dist<Math.max(width,height)*.5){
    hue=(hue+dist*.12)%360;
    octx.save();octx.scale(sc,sc);octx.globalCompositeOperation='lighter';octx.lineCap='round';
    octx.strokeStyle=`hsla(${hue.toFixed(0)},85%,62%,${Math.min(.5,.16+dist*.012).toFixed(3)})`;
    octx.lineWidth=Math.max(1.4,3.4-dist*.05);
    octx.beginPath();octx.moveTo(lx,ly);octx.lineTo(ball.x,ball.y);octx.stroke();octx.restore();
   }
  }
  lx=ball.x;ly=ball.y;lt=now;
  ctx.drawImage(off,0,0,width,height);
 }
 return Object.freeze({draw,reset(){if(octx)octx.clearRect(0,0,off.width,off.height);lx=NaN}});
})();

/* ROOM5-02: the Main Room grid controls (system, mode, base Hz, shift, workbench) as ONE component for Room III and Room V.
   They edit the Main Room's own grid through __NodalBallGrid; nothing is stored here. */
function __XenGridControls({extra}){
 P.useSyncExternalStore(__NodalBallGrid.subscribe,__NodalBallGrid.snapshot,__NodalBallGrid.snapshot);
 const h=P.createElement,params=__NodalBallGrid.params(),rack=Y6(),[open,setOpen]=P.useState(false);
 const [base,setBase]=P.useState(()=>String(params?.gridBase??440));
 P.useEffect(()=>setBase(String(params?.gridBase??440)),[params?.gridBase]);
 if(!params)return h('div',{className:'xen-gridctl-note'},'The Main Room grid is not ready yet: open the Live Room once.');
 const label=(text,child)=>h('label',{className:'xen-gridctl-field',style:{display:'flex',flexDirection:'column',gap:4,minWidth:120}},h('span',null,text),child);
 const commitBase=()=>{const value=Number(base.replace(',','.'));if(Number.isFinite(value)&&value>=400&&value<=1760)__NodalBallGrid.update({gridBase:Math.round(value*10)/10});else setBase(String(params?.gridBase??440));};
 return h('div',{className:'xen-gridctl','data-xen-grid-controls':true,style:{display:'flex',flexWrap:'wrap',alignItems:'end',gap:12}},
  label('Main Room grid',h('select',{'aria-label':'Grid tuning',value:params.gridTuning,onChange:event=>__NodalBallGrid.changeTuning(event.currentTarget.value)},...rack.libraryOptions.map(item=>h('option',{key:item.value,value:item.value},item.label)))),
  label('Modus',h('select',{'aria-label':'Grid mode',value:params.gridMode,onChange:event=>__NodalBallGrid.changeMode(event.currentTarget.value)},h('option',{value:'chromatic'},'All steps'),...Ka(params.gridTuning).filter(item=>item.value!=='chromatic').map(item=>h('option',{key:item.value,value:item.value},item.label)))),
  label('Rasterbasis · Hz',h('input',{'aria-label':'Grid base Hz',type:'number',min:400,max:1760,step:.1,value:base,onChange:event=>setBase(event.currentTarget.value),onBlur:commitBase,onKeyDown:event=>{if(event.key==='Enter')event.currentTarget.blur()},style:{width:100}})),
  label('Shift grid · cents',h('input',{type:'range',min:-500,max:500,step:1,value:__xenGridShiftCents(params.gridTuning,params.manualGridStepOffsets),'aria-label':'Grid shift cents',onChange:event=>__NodalBallGrid.shift(Number(event.currentTarget.value))})),
  h('button',{type:'button',onClick:()=>setOpen(true),style:{border:'1px solid #44747d',padding:'5px 9px',borderRadius:4}},'Edit grid / step count'),
  extra||null,
  h(U6,{open,currentTuning:params.gridTuning??'12edo',activeRack:rack.activeGridRack,onClose:()=>setOpen(false),onRackChange:rack.setStoredActiveGridRack,onActivateTuning:__NodalBallGrid.changeTuning,onResetRack:rack.resetStoredActiveGridRack}));
}

/* xen-lazy:nodal */

