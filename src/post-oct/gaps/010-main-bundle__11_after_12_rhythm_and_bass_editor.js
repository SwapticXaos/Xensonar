/* Context pan editor uses the existing canonical lane settings, including sample slots. */
/* DRUM-LANE-EQ-01: legacy secondary right-click entry routes to the same
 * canonical lane owners and exposes the same volume/pan/EQ, never a Pan-only popup. */
/* DRUM-LANE-EQ-02: legacy context route mounts the same React lane-EQ
 * component as the full and compact Drum Machine. No second EQ control state. */
const __LanePan=(()=>{
 let closeCurrent=null;
 function open(event,lane){
  event.preventDefault();event.stopPropagation();closeCurrent?.();
  if(!Object.hasOwn(__f52DrumLaneNames,lane))return;
  const panel=document.createElement('div');panel.setAttribute('role','dialog');
  panel.setAttribute('aria-label',__f52DrumLaneNames[lane]+' lane mixer');panel.dataset.drumLaneMixer=lane;
  Object.assign(panel.style,{position:'fixed',zIndex:2147483000,
   left:Math.max(8,Math.min(window.innerWidth-392,event.clientX))+'px',
   top:Math.max(8,Math.min(window.innerHeight-420,event.clientY))+'px',
   width:'384px',maxWidth:'calc(100vw - 16px)',maxHeight:'calc(100vh - 16px)',
   overflowY:'auto',padding:'12px',border:'1px solid #527b85',borderRadius:'8px',
   background:'#0b1720',color:'#d0edf2',boxShadow:'0 8px 30px #000b',font:'12px monospace'});
  const header=document.createElement('div');header.style.display='flex';header.style.justifyContent='space-between';
  const title=document.createElement('strong');title.textContent=__f52DrumLaneNames[lane]+' · Mixer & EQ';
  const closeButton=document.createElement('button');closeButton.type='button';closeButton.textContent='×';
  closeButton.setAttribute('aria-label','Close lane mixer');header.append(title,closeButton);panel.append(header);
  function slider(label,min,max,step,value,onValue){
   const row=document.createElement('label');Object.assign(row.style,{display:'grid',gridTemplateColumns:'56px 1fr 55px',alignItems:'center',gap:'8px',marginTop:'9px'});
   const name=document.createElement('span');name.textContent=label;
   const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=value;
   input.setAttribute('aria-label',__f52DrumLaneNames[lane]+' '+label);
   const output=document.createElement('span');output.textContent=Number(value).toFixed(1);
   input.oninput=()=>{onValue(+input.value);output.textContent=Number(input.value).toFixed(1)};
   if(label!=='Pan'){
    input.onpointerdown=()=>{__mlSharedDrumMachine.beginGesture();__xenDrumVolumeCommit.begin()};
    input.onpointerup=input.onpointercancel=()=>{__xenDrumVolumeCommit.end();__mlSharedDrumMachine.endGesture()};
   }
   row.append(name,input,output);panel.append(row);
  }
  const mixer=__f52MixerRead(lane);
  slider('Volume',0,2,.01,mixer.volume,value=>__f52MixerSet(lane,{volume:value}));
  slider('Pan',-1,1,.01,mixer.pan,value=>__f52MixerSet(lane,{pan:value}));
  const host=document.createElement('div');host.dataset.drumEqReactHost=lane;panel.append(host);
  document.body.append(panel);
  const root=iY.createRoot(host);root.render(u.jsx(__f52LaneEQControls,{lane}));
  const outside=e=>{if(!panel.contains(e.target))close()},escape=e=>{if(e.key==='Escape'){e.stopPropagation();close()}};
  const close=()=>{root.unmount();panel.remove();document.removeEventListener('pointerdown',outside,true);
   document.removeEventListener('keydown',escape,true);window.removeEventListener('resize',close);closeCurrent=null};
  closeButton.onclick=close;closeCurrent=close;
  document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',escape,true);window.addEventListener('resize',close);
 }
 return {open,get:lane=>__f52MixerRead(lane).pan,set:(lane,value)=>__f52MixerSet(lane,{pan:value})};
})();
