/* Context pan editor uses the existing canonical lane settings, including sample slots. */
const __LanePan=(()=>{
 let closeCurrent=null;
 function current(){const m=__mlSharedDrumMachine,s=m.snapshot,e=m.liveEdit;return {m,s,e,grid:__f52EnsureDrumGrid(e?.grid||__mlGridFromSelection(s)),settings:e?.laneSettings||s?.exported?.laneSettings||s?.laneSettings||{}}}
 function get(lane){const c=current();return __f52SampleLanes.includes(lane)?c.grid.sampleSlots[lane]?.pan||0:c.settings[lane]?.pan||0}
 function set(lane,value){const c=current(),pan=Math.max(-1,Math.min(1,Number(value)||0));
  const settings={...c.settings};if(__f52SampleLanes.includes(lane))c.grid.sampleSlots[lane]={...c.grid.sampleSlots[lane],pan};
  else settings[lane]={level:1,decay:1,chokeGroup:'none',...settings[lane],pan};
  c.m.setLiveEdit({grid:c.grid,kit:c.e?.kit||c.s?.kit||'standard',laneKitOverrides:c.e?.laneKitOverrides||c.s?.exported?.laneKitOverrides||c.s?.laneKitOverrides||{},laneSettings:settings});
 }
 function open(event,lane){
  event.preventDefault();event.stopPropagation();closeCurrent?.();
  if(!Object.hasOwn(__f52DrumLaneNames,lane))return;
  const panel=document.createElement('div'),label=document.createElement('label'),caption=document.createElement('span'),input=document.createElement('input'),reset=document.createElement('button');
  panel.setAttribute('role','dialog');panel.setAttribute('aria-label',__f52DrumLaneNames[lane]+' Pan');panel.dataset.drumLanePan=lane;
  Object.assign(panel.style,{position:'fixed',zIndex:10000,left:Math.max(8,Math.min(window.innerWidth-246,event.clientX))+'px',top:Math.max(8,Math.min(window.innerHeight-116,event.clientY))+'px',width:'238px',padding:'12px',border:'1px solid #527b85',borderRadius:'8px',background:'#0b1720',color:'#d0edf2',boxShadow:'0 8px 30px #000b',font:'12px monospace'});
  input.type='range';input.min=-1;input.max=1;input.step=.01;input.value=get(lane);input.setAttribute('aria-label',__f52DrumLaneNames[lane]+' Pan');input.style.width='100%';
  const update=()=>{const v=Number(input.value);caption.textContent=__f52DrumLaneNames[lane]+' Pan · '+(v===0?'Center':(v<0?'L ':'R ')+Math.round(Math.abs(v)*100)+'%')};
  input.onpointerdown=()=>__mlSharedDrumMachine.beginGesture();input.onpointerup=input.onpointercancel=()=>__mlSharedDrumMachine.endGesture();
  input.oninput=()=>{set(lane,Number(input.value));update()};input.ondblclick=()=>{input.value=0;input.oninput()};
  reset.type='button';reset.textContent='Center';Object.assign(reset.style,{marginTop:'6px',padding:'3px 8px',border:'1px solid #37515d',borderRadius:'4px'});reset.onclick=()=>{input.value=0;input.oninput()};
  label.append(caption,input);panel.append(label,reset);document.body.append(panel);update();
  const outside=e=>{if(!panel.contains(e.target))close()},escape=e=>{if(e.key==='Escape'){e.stopPropagation();close()}};
  const close=()=>{__mlSharedDrumMachine.endGesture();panel.remove();document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',escape,true);window.removeEventListener('resize',close);closeCurrent=null};
  closeCurrent=close;document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',escape,true);window.addEventListener('resize',close);input.focus();
 }
 return {open,get,set};
})();
