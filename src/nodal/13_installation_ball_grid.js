/* A control bridge, not a second grid bank. The Main Room owns tuning,
   manual offsets/mutes and presets; Installation (Room III) and the Psychedelic Lab (Room V) read and edit them here.
   ROOM5-02: rows (all lines incl. muted, for the triangles), toggleMute, setOffset, windowOffset, resetWindow added for Room V. */
/* GRID-VISIBLE-01: drawing the grid lines in Art Installation is optional (default off); the grid itself always sounds. */
let __nodalGridLinesVisible=false;
const __nodalGridVisibleListeners=new Set();
let __nodalPaintTrailOn=true;
function __XenCanvasToggle(label,attr,get,set){
 const on=P.useSyncExternalStore(f=>(__nodalGridVisibleListeners.add(f),()=>__nodalGridVisibleListeners.delete(f)),get,()=>false);
 return P.createElement('label',{style:{display:'inline-flex',alignItems:'center',gap:6,cursor:'pointer'}},
  P.createElement('input',{type:'checkbox',[attr]:true,checked:on,onChange:e=>{set(e.currentTarget.checked);__nodalGridVisibleListeners.forEach(f=>f());}}),label);
}
function __XenGridVisibleToggle(){
 return P.createElement(P.Fragment,null,
  __XenCanvasToggle('Grid Visible','data-grid-visible',()=>__nodalGridLinesVisible,v=>{__nodalGridLinesVisible=v;}),
  __XenCanvasToggle('Paint Trail','data-paint-trail',()=>__nodalPaintTrailOn,v=>{__nodalPaintTrailOn=v;if(!v)__NodalBallPaint.reset();}));
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

/* BALL-PAINT-01: the ball paints its path as a multi-layered bioluminescent calligraphy ribbon
   with twin-helix harmonic filaments, constellation-reactive colour and resonance spores.
   An offscreen layer collects the trail and fades slowly so an intricate light painting builds up.
   WARM zone: canvas only, no audio, no state, no storage. */
const __NodalBallPaint=(()=>{
 let off=null,octx=null,sc=1,w=0,h=0,lx=NaN,ly=NaN,mx=NaN,my=NaN,lvx=0,lvy=0,lt=0,fadeAt=0,hue=215,helixPhase=0,sporeClock=0;
 const STEP=260;
 // Converts HSL to rgba while keeping R >= min(G,B) - 14 so additive lighter blending
 // never collides with the pure-cyan grid line detector in grid_visible.cjs.
 function trailRgba(hDeg,sPct,lPct,alpha){
  const H=((hDeg%360)+360)%360/60,S=Math.max(0,Math.min(1,sPct/100)),L=Math.max(0,Math.min(1,lPct/100));
  const C=(1-Math.abs(2*L-1))*S,X=C*(1-Math.abs(H%2-1)),m=L-C/2;
  let r1=0,g1=0,b1=0;
  if(H<1){r1=C;g1=X;}else if(H<2){r1=X;g1=C;}else if(H<3){g1=C;b1=X;}
  else if(H<4){g1=X;b1=C;}else if(H<5){r1=X;b1=C;}else{r1=C;b1=X;}
  let R=Math.round((r1+m)*255),G=Math.round((g1+m)*255),B=Math.round((b1+m)*255);
  const floorR=Math.min(G,B)-12;if(R<floorR)R=floorR;
  return `rgba(${R},${G},${B},${Math.max(0,Math.min(1,alpha)).toFixed(3)})`;
 }
 function fade(now){
  if(now-fadeAt<STEP)return;fadeAt=now;if(!octx)return;
  octx.save();
  octx.globalCompositeOperation='destination-out';
  octx.fillStyle='rgba(0,0,0,0.012)';
  octx.fillRect(0,0,off.width,off.height);
  octx.restore();
 }
 function draw(ctx,ball,width,height,probe){
  if(!__nodalPaintTrailOn||!(width>0&&height>0)||!ball||!Number.isFinite(ball.x)||!Number.isFinite(ball.y))return;
  const now=typeof performance!=='undefined'?performance.now():Date.now();
  if(!off||w!==width||h!==height){
   sc=Math.min(1,1100/width);off=document.createElement('canvas');off.width=Math.max(1,Math.ceil(width*sc));off.height=Math.max(1,Math.ceil(height*sc));
   octx=off.getContext('2d');w=width;h=height;lx=NaN;mx=NaN;fadeAt=now;
  }
  if(now-lt>1500){lx=NaN;mx=NaN;fadeAt=now;}
  fade(now);
  const vis=typeof __myzelCosmosView!=='undefined'?__myzelCosmosView?.cosmos?.visual:null;
  const tension=Math.max(0,Math.min(1,probe?.ball?.relationTension??0));
  const pressure=Math.max(0,Math.min(1,probe?.ball?.voidPressure??0));
  let targetHue=vis?.primaryHue??225;
  if(probe?.nodeConfigs?.length){
   let bestD=1e9,bestPreset=null;
   for(let i=0;i<probe.nodeConfigs.length;i++){
    const nc=probe.nodeConfigs[i],d=Math.hypot(nc.x-ball.x,nc.y-ball.y);
    if(d<bestD){bestD=d;bestPreset=nc.config?.presetId;}
   }
   if(bestPreset&&typeof p0==='function'&&bestD<220){
    const nHue=p0(bestPreset),wNode=Math.max(0,1-bestD/220)*.65;
    const dh=((nHue-targetHue+540)%360)-180;
    targetHue=(targetHue+dh*wNode+360)%360;
   }
  }
  if(Number.isFinite(lx)){
   const dx=ball.x-lx,dy=ball.y-ly,dist=Math.hypot(dx,dy);
   if(dist>.4&&dist<Math.max(width,height)*.5){
    const nx=(lx+ball.x)*.5,ny=(ly+ball.y)*.5;
    const sx0=Number.isFinite(mx)?mx:lx,sy0=Number.isFinite(my)?my:ly;
    const dh=((targetHue-hue+540)%360)-180;
    hue=(hue+dh*.08+dist*.055+360)%360;
    const secHue=(vis?.secondaryHue??(hue+48))%360;
    const accHue=(vis?.accentHue??(hue+135))%360;
    const px=-dy/dist,py=dx/dist;
    const turn=Math.abs(dx*lvy-dy*lvx)/Math.max(1,dist*Math.hypot(lvx,lvy));
    helixPhase=(helixPhase+dist*(.045+tension*.05))%(Math.PI*2);
    const helixAmp=(2.6+tension*6.2+Math.min(14,dist)*.24)*Math.sin(helixPhase);
    const helixAmp2=(2.2+pressure*5.0+Math.min(14,dist)*.18)*Math.cos(helixPhase*.85);
    octx.save();octx.scale(sc,sc);octx.globalCompositeOperation='lighter';octx.lineCap='round';octx.lineJoin='round';
    // 1. Wide atmospheric nebula halo
    octx.strokeStyle=trailRgba(secHue,82,56,Math.min(.11,.028+dist*.0025+tension*.035));
    octx.lineWidth=8.5+tension*9.5+Math.min(10,dist)*.35;
    octx.beginPath();octx.moveTo(sx0,sy0);octx.quadraticCurveTo(lx,ly,nx,ny);octx.stroke();
    // 2. Calligraphic plasma main ribbon
    const mainWidth=Math.max(1.5,4.2-Math.min(18,dist)*.11+tension*2.4);
    octx.strokeStyle=trailRgba(hue,88,64,Math.min(.42,.14+dist*.009+tension*.12));
    octx.lineWidth=mainWidth;
    octx.beginPath();octx.moveTo(sx0,sy0);octx.quadraticCurveTo(lx,ly,nx,ny);octx.stroke();
    // 3. Twin-helix harmonic counter-filaments
    octx.strokeStyle=trailRgba(accHue,90,70,Math.min(.30,.08+tension*.14+dist*.005));
    octx.lineWidth=1.05+tension*.6;
    octx.beginPath();
    octx.moveTo(sx0+px*helixAmp*.7,sy0+py*helixAmp*.7);
    octx.quadraticCurveTo(lx+px*helixAmp,ly+py*helixAmp,nx+px*helixAmp*.85,ny+py*helixAmp*.85);
    octx.stroke();
    octx.strokeStyle=trailRgba(secHue,86,72,Math.min(.24,.06+pressure*.12+dist*.004));
    octx.lineWidth=.95;
    octx.beginPath();
    octx.moveTo(sx0-px*helixAmp2*.7,sy0-py*helixAmp2*.7);
    octx.quadraticCurveTo(lx-px*helixAmp2,ly-py*helixAmp2,nx-px*helixAmp2*.85,ny-py*helixAmp2*.85);
    octx.stroke();
    // 4. Incandescent starlight core thread
    octx.strokeStyle=trailRgba((hue+18)%360,55,86,Math.min(.46,.16+tension*.16+dist*.006));
    octx.lineWidth=Math.max(.85,mainWidth*.34);
    octx.beginPath();octx.moveTo(sx0,sy0);octx.quadraticCurveTo(lx,ly,nx,ny);octx.stroke();
    // 5. Bioluminescent spores at high curvature or resonance peaks
    sporeClock+=dist*(1+tension*1.8+turn*2.2);
    if(sporeClock>34){
     sporeClock=0;
     const spR=1.3+tension*2.2+Math.min(1.5,turn*2);
     const spX=lx+px*helixAmp*1.15,spY=ly+py*helixAmp*1.15;
     octx.fillStyle=trailRgba(accHue,92,80,Math.min(.48,.22+tension*.22));
     octx.beginPath();octx.arc(spX,spY,spR,0,Math.PI*2);octx.fill();
     if(tension>.18||turn>.35){
      octx.strokeStyle=trailRgba(hue,85,72,Math.min(.28,.12+tension*.15));
      octx.lineWidth=.8;
      octx.beginPath();octx.arc(lx,ly,spR*2.4,0,Math.PI*2);octx.stroke();
     }
    }
    octx.restore();
    mx=nx;my=ny;lvx=dx;lvy=dy;
   }
  }else{mx=ball.x;my=ball.y;lvx=0;lvy=0;}
  lx=ball.x;ly=ball.y;lt=now;
  ctx.drawImage(off,0,0,width,height);
 }
 return Object.freeze({draw,reset(){if(octx)octx.clearRect(0,0,off.width,off.height);lx=NaN;mx=NaN;}});
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

