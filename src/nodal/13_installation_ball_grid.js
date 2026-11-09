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

/* xen-lazy:nodal */

