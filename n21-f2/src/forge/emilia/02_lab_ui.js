/* F4.3.12 — ring waves live on an independent HTML compositor overlay, not on React SVG.
   The release wave is emitted AFTER the potentially blocking preview PCM refresh. */
function __emiliaGestureMoved(a,b){return Math.hypot(b.x-a.x,b.y-a.y)>.006;}
/* Only the interaction graph is rebuilt on pointermove; no modal eigensolver/audio computation. */
function __emiliaVisualGraph(model){
 const nodes=model.nodes.filter(n=>!n.muted),degree=Array(nodes.length).fill(0),edges=[];
 const blocked=new Set((model.blockedEdges||[]).map(pair=>pair.slice().sort().join('\0')));
 for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
  const a=nodes[i],b=nodes[j];if(blocked.has([a.id,b.id].sort().join('\0')))continue;
  const span=a.radius+b.radius;
  const overlap=span>0?Math.max(0,Math.min(1,1-Math.hypot(a.x-b.x,a.y-b.y)/span)):0;
  const w=overlap*overlap*(3-2*overlap)*Math.sqrt(a.strength*b.strength);
  if(w>0){edges.push({a:i,b:j,weight:w});degree[i]+=w;degree[j]+=w;}
 }
 for(const edge of edges)edge.weight/=Math.max(1,degree[edge.a],degree[edge.b]);
 return {nodes,edges};
}
function EmiliaForgeLab(){
  const h=P.createElement,[recipe,setRecipe]=P.useState(()=>__Emilia.snapshot());
  const [focus,setFocus]=P.useState(()=>__Emilia.snapshot().model.nodes[0].id);
  const [preview,setPreview]=P.useState('off'),[error,setError]=P.useState(''),[revision,setRevision]=P.useState(0);
  const [dragPose,setDragPose]=P.useState(null);
  const animationFrame=P.useRef(null),rippleOverlay=P.useRef(null),rippleTimers=P.useRef(new Set());
  const rippleFrames=P.useRef(new Set()),pendingRelease=P.useRef([]);
  const area=P.useRef(null),drag=P.useRef(null),history=P.useRef([]),future=P.useRef([]),alive=P.useRef(false);
  P.useEffect(()=>{alive.current=true;const unsub=__Emilia.subscribe(()=>setRecipe(__Emilia.snapshot()));return()=>{
    alive.current=false;unsub();__Emilia.stopPreview();
    if(animationFrame.current!==null)cancelAnimationFrame(animationFrame.current);
    for(const id of rippleFrames.current)cancelAnimationFrame(id);rippleFrames.current.clear();
    for(const timer of rippleTimers.current)clearTimeout(timer);rippleTimers.current.clear();
    pendingRelease.current=[];
    rippleOverlay.current?.replaceChildren();
  }},[]);
  const instrument=recipe.model,selected=instrument.nodes.find(n=>n.id===focus)||instrument.nodes[0];
  const graph=P.useMemo(()=>__XenNodalModel.compile(instrument),[instrument]);
  const dragging=!!dragPose&&__emiliaGestureMoved(dragPose.from,dragPose.to);
  const liveInstrument=P.useMemo(()=>dragging?{...instrument,nodes:instrument.nodes.map(n=>n.id===dragPose.id?{...n,...dragPose.to}:n)}:instrument,[instrument,dragPose,dragging]);
  const liveGraph=P.useMemo(()=>dragging?__emiliaVisualGraph(liveInstrument):graph,[dragging,liveInstrument,graph]);
  const roles=__XenNodalModel.roles,organs=__NodalOrgans;
  function commit(next,record=true){try{
    if(__Emilia.semanticKey(next)===__Emilia.semanticKey(__Emilia.snapshot()))return;
    if(record){history.current=[...history.current.slice(-31),__Emilia.snapshot()];future.current=[];}
    __Emilia.set(next);setRecipe(__Emilia.snapshot());setError('');setRevision(v=>v+1);
  }catch(err){setError(err.message)}}
  const edit=(id,patch)=>commit(__Emilia.editNode(recipe,id,patch));
  // Inert HTML layer: no setState, React reconciliation or SVG radius animation on any wave.
  // Transform/opacity on a normal HTML element can be promoted to a compositor layer.
  function ring(x,y){
    const host=rippleOverlay.current;if(!host||!alive.current)return;
    while(host.childElementCount>=6)host.firstElementChild.remove();
    const wave=document.createElement('span');wave.className='emilia-b-ripple-wave';
    wave.setAttribute('data-emilia-ripple','true');
    wave.style.left=(Math.max(0,Math.min(1,x))*100)+'%';
    wave.style.top=(Math.max(0,Math.min(1,y))*100)+'%';
    host.appendChild(wave);
    const timer=setTimeout(()=>{rippleTimers.current.delete(timer);wave.remove()},1450);
    rippleTimers.current.add(timer);
    wave.addEventListener('animationend',()=>{clearTimeout(timer);rippleTimers.current.delete(timer);wave.remove()},{once:true});
  }
  function afterTwoFrames(fn){
    const one=requestAnimationFrame(()=>{rippleFrames.current.delete(one);
      const two=requestAnimationFrame(()=>{rippleFrames.current.delete(two);if(alive.current)fn()});
      rippleFrames.current.add(two);
    });rippleFrames.current.add(one);
  }
  function completeReleaseWave(task){
    if(!pendingRelease.current.includes(task))return;
    pendingRelease.current=pendingRelease.current.filter(item=>item!==task);
    if(task.timer){clearTimeout(task.timer);rippleTimers.current.delete(task.timer)}
    // Wait for React's commit and the first post-audio paints before creating motion.
    afterTwoFrames(()=>ring(task.x,task.y));
  }
  function afterAudioRelease(x,y){
    // refreshPreview() calls its onState('playing') only once PCM synthesis/copy
    // has completed. Fallback is only for a failed/stalled render.
    const task={x,y,timer:null};pendingRelease.current.push(task);
    const timer=setTimeout(()=>{rippleTimers.current.delete(timer);completeReleaseWave(task)},2800);
    task.timer=timer;rippleTimers.current.add(timer);
  }
  function notifyPreviewSettled(state){
    if(state==='playing'||state==='error'||state==='off'){
      for(const task of [...pendingRelease.current])completeReleaseWave(task);
    }
  }
  function begin(e,node){if(e.button!==0)return;e.preventDefault();
    const r=area.current?.getBoundingClientRect();if(!r?.width)return;
    const el=e.currentTarget;el.setPointerCapture(e.pointerId);
    drag.current={id:node.id,from:recipe,origin:{x:node.x,y:node.y},rect:r,clientX:e.clientX,clientY:e.clientY,element:el,pointer:e.pointerId,next:{x:node.x,y:node.y}};
    setDragPose({id:node.id,from:{x:node.x,y:node.y},to:{x:node.x,y:node.y}});
    setFocus(node.id);ring(node.x,node.y);
  }
  function move(e){const d=drag.current;if(!d||d.pointer!==e.pointerId)return;
    const x=Math.min(.965,Math.max(.035,d.origin.x+(e.clientX-d.clientX)/d.rect.width));
    const y=Math.min(.965,Math.max(.035,d.origin.y+(e.clientY-d.clientY)/d.rect.height));
    d.next={x,y};
    if(animationFrame.current!==null)return;
    animationFrame.current=requestAnimationFrame(()=>{animationFrame.current=null;const active=drag.current;if(active&&active.pointer===e.pointerId)setDragPose({id:active.id,from:active.origin,to:active.next})});
  }
  function finish(e,cancel=false){const d=drag.current;if(!d||d.pointer!==e.pointerId)return;
    drag.current=null;try{d.element.releasePointerCapture(d.pointer)}catch{}
    if(animationFrame.current!==null){cancelAnimationFrame(animationFrame.current);animationFrame.current=null;}
    setDragPose(null);
    if(cancel)return;
    if(__emiliaGestureMoved(d.origin,d.next)){
      // The recipe commit can synchronously invalidate caches and asynchronously
      // launch expensive PCM synthesis. A release ring during that work froze.
      const waitForPreview=preview==='playing'||preview==='loading';
      if(waitForPreview)afterAudioRelease(d.next.x,d.next.y);
      commit(__Emilia.moveNode(d.from,d.id,d.next.x,d.next.y));
      if(!waitForPreview)afterTwoFrames(()=>ring(d.next.x,d.next.y));
    }
  }
  function add(role){if(instrument.nodes.length>=__Emilia.MAX_NODES||!roles.includes(role))return;
    const next=__Emilia.createNode(recipe,role);
    const item=next.model.nodes.find(n=>!instrument.nodes.some(o=>o.id===n.id));
    commit(next);if(item)setFocus(item.id);
  }
  function remove(id){if(instrument.nodes.length<=1)return;
    const next=__Emilia.removeNode(recipe,id);commit(next);
    if(focus===id)setFocus(next.model.nodes[0].id);
  }
  function undo(){const prev=history.current.pop();if(prev){future.current.push(__Emilia.snapshot());commit(prev,false)}}
  function redo(){const next=future.current.pop();if(next){history.current.push(__Emilia.snapshot());commit(next,false)}}
  async function toggle(){if(preview==='playing'||preview==='loading'){__Emilia.stopPreview();setPreview('off');return;}
    setError('');await __Emilia.startPreview((state,cause)=>{if(!alive.current)return;setPreview(state==='error'?'off':state);notifyPreviewSettled(state);if(cause)setError(cause.message)});
  }
  const atMax=instrument.nodes.length>=__Emilia.MAX_NODES;
  return h('section',{className:'emilia-b','data-emilia-synth-lab':'true','data-xensonar-emilia-b':'true', 'aria-label':'Emilia constellation timbre'},
    h('header',{className:'emilia-b-heading'},h('div',null,h('strong',null,'EMILIA · Nodal Timbre'),h('small',null,'HX ↔ Emilia · Carrier plays the figure')),
      h('span',null,instrument.nodes.length,' / ',__Emilia.MAX_NODES,' nodes')),
    h('p',{className:'emilia-b-caption'},'Node positions shape HX harmonics, resonance and feedback. Drag to rearrange; release to hear the new constellation.'),
    h('div',{className:'emilia-b-field-frame'},h('svg',{ref:area,viewBox:'0 0 1000 1000',className:'emilia-b-field','data-emilia-nodal-field':'true',role:'group',
        'aria-label':'Nodal constellation field',onPointerMove:move,onPointerUp:finish,onPointerCancel:e=>finish(e,true)},
      h('defs',null,
        h('radialGradient',{id:'emilia-b-shade'},h('stop',{offset:0,stopColor:'#164753'}),h('stop',{offset:'.72',stopColor:'#101d35'}),h('stop',{offset:1,stopColor:'#070e20'})),
        h('radialGradient',{id:'emilia-b-halo'},h('stop',{offset:0,stopColor:'#52ddcc',stopOpacity:.35}),h('stop',{offset:1,stopColor:'#52ddcc',stopOpacity:0})),
        h('radialGradient',{id:'emilia-b-node-shade'},h('stop',{offset:0,stopColor:'#224d58'}),h('stop',{offset:1,stopColor:'#071b2b'}))),
      h('rect',{width:1000,height:1000,rx:22,fill:'url(#emilia-b-shade)'}),
      ...Array.from({length:9},(_,i)=>h('g',{key:'grid-'+i,stroke:'#8adecf',strokeOpacity:.10},
        h('line',{x1:(i+1)*100,y1:0,x2:(i+1)*100,y2:1000}),h('line',{x1:0,y1:(i+1)*100,x2:1000,y2:(i+1)*1000}))),
      ...graph.edges.map((e,i)=>{const a=instrument.nodes.find(n=>n.id===graph.nodes[e.a].id),b=instrument.nodes.find(n=>n.id===graph.nodes[e.b].id);return h('line',{key:'link'+i,x1:a.x*1000,y1:a.y*1000,x2:b.x*1000,y2:b.y*1000,
        stroke:'#72f7cf',strokeWidth:2+e.weight*9,strokeOpacity:(dragging?.12:.22)+e.weight*(dragging?.18:.65),pointerEvents:'none'});}),
      ...dragging?liveGraph.edges.map((e,i)=>{const a=liveInstrument.nodes.find(n=>n.id===liveGraph.nodes[e.a].id),b=liveInstrument.nodes.find(n=>n.id===liveGraph.nodes[e.b].id);return h('line',{key:'live-link'+i,'data-emilia-live-link':'true',x1:a.x*1000,y1:a.y*1000,x2:b.x*1000,y2:b.y*1000,stroke:'#b1ffef',strokeWidth:2+e.weight*9,strokeOpacity:.32+e.weight*.65,pointerEvents:'none'});}):[],
      ...dragging?[h('g',{key:'origin-'+dragPose.id,className:'emilia-b-ghost',transform:`translate(${dragPose.from.x*1000} ${dragPose.from.y*1000})`,pointerEvents:'none'},h('circle',{r:43,fill:'#163c49',stroke:'#82dace',strokeDasharray:'9 7',strokeWidth:4}),h('circle',{r:9,fill:'#b5fff2'}))]:[],
      ...liveInstrument.nodes.map(node=>h('g',{key:node.id,transform:`translate(${node.x*1000} ${node.y*1000})`,
        className:'emilia-b-node drag-ghost'+(selected.id===node.id?' is-selected':''),tabIndex:0,role:'button',
        'aria-label':'Move '+organs[node.role].label,onPointerDown:e=>begin(e,node),onFocus:()=>setFocus(node.id),onKeyDown:e=>{
          if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const step=e.shiftKey?.04:.01;edit(node.id,{
            x:Math.min(.965,Math.max(.035,node.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0))),
            y:Math.min(.965,Math.max(.035,node.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)))});}}},
        h('circle',{r:74,fill:'url(#emilia-b-halo)',pointerEvents:'none'}),
        h('circle',{r:43,fill:'url(#emilia-b-node-shade)',stroke:organs[node.role].color,strokeWidth:selected.id===node.id?6:3,opacity:node.muted?.4:1}),
        h('text',{textAnchor:'middle',y:11,fill:organs[node.role].color,fontSize:36,pointerEvents:'none'},organs[node.role].glyph),
        h('text',{textAnchor:'middle',y:93,fill:'#d5efea',fontSize:27,pointerEvents:'none'},organs[node.role].label)))),
      h('div',{className:'emilia-b-ripple-overlay','data-emilia-ripple-layer':'true',ref:rippleOverlay,'aria-hidden':'true'})),
    h('div',{className:'emilia-b-actions'},
      h('label',null,'Add node',h('select',{'aria-label':'Add Emilia node',value:'',disabled:atMax,
        onChange:e=>{add(e.target.value);e.target.value='';}},
        h('option',{value:''},atMax?'7 / 7 reached':'+ Node'),...roles.map(role=>h('option',{key:role,value:role},organs[role].label)))),
      h('button',{type:'button',disabled:!history.current.length,onClick:undo},'↶ Undo'),
      h('button',{type:'button',disabled:!future.current.length,onClick:redo},'↷ Redo'),
      h('button',{type:'button',className:preview==='playing'?'is-playing':'','aria-pressed':preview==='playing','data-emilia-held-preview':'true','aria-label':preview==='playing'||preview==='loading'?'Stop preview':'Preview',
        onClick:()=>void toggle()},preview==='playing'?'■ Stop preview':preview==='loading'?'Preparing…':'▶ Preview')),
    h('div',{className:'emilia-b-node-list'},...instrument.nodes.map((node,index)=>h('div',{key:node.id,
      className:'emilia-b-list-entry'+(selected.id===node.id?' selected':'')},
      h('button',{type:'button',className:'emilia-b-pick',onClick:()=>setFocus(node.id)},String(index+1).padStart(2,'0')+' · '+organs[node.role].label),
      h('span',null,Number(node.ratio).toFixed(2)+'×'),
      h('button',{type:'button',title:'Remove node','aria-label':'Remove node '+organs[node.role].label,
        disabled:instrument.nodes.length<=1,onClick:()=>remove(node.id)},'×')))),
    h('div',{className:'emilia-b-inspector'},
      h('span',null,'Selected · '+organs[selected.role].label),
      h('label',null,'Role',h('select',{value:selected.role,'aria-label':'Emilia selected organ',onChange:e=>edit(selected.id,{role:e.target.value})},...roles.map(role=>h('option',{key:role,value:role},organs[role].label)))),
      h('label',null,'Ratio',h('input',{type:'number',min:.125,max:8,step:.05,value:selected.ratio,'aria-label':'Emilia ratio',onChange:e=>{const v=Number(e.target.value);if(v>=.125&&v<=8)edit(selected.id,{ratio:v})}})),
      h('label',null,'Reach',h('input',{type:'range',min:.05,max:.7,step:.01,value:selected.radius,'aria-label':'Emilia coupling reach',onChange:e=>edit(selected.id,{radius:Number(e.target.value)})})),
      h('label',null,'Strength',h('input',{type:'range',min:0,max:2,step:.05,value:selected.strength,'aria-label':'Emilia influence',onChange:e=>edit(selected.id,{strength:Number(e.target.value)})})),
      h('label',null,'Mute',h('input',{type:'checkbox',checked:selected.muted,onChange:e=>edit(selected.id,{muted:e.target.checked})}))),
    h('p',{className:'emilia-b-status',role:'status'},error||(preview==='playing'?'Preview playing · release drag to hear the changed constellation':
      preview==='loading'?'Calculating timbre…':'Ready · Preview auditions the timbre; Carrier Play uses the drawn figure')));
}
