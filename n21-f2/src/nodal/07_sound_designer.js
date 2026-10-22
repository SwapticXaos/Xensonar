const __NodalDraftKey = 'xensonar.nodal.sounddesigner.v1';
let __NodalPendingDesign = null;
let __NodalSessionDraft = null;
let __NodalPendingEditTarget = null;
let __NodalPendingLibraryEntry = null;
const __NodalOrgans = {sub: {label: 'Sub', color: '#eead79', glyph: '∿'}, resonator: {label: 'Resonator', color: '#78d9d0', glyph: '◎'}, formant: {label: 'Formant', color: '#d8b2e8', glyph: '◖'}, fold: {label: 'Fold', color: '#ff8e83', glyph: '⋀'}, drive: {label: 'Drive', color: '#e4bc6b', glyph: '◈'}, tilt: {label: 'Tilt', color: '#a4c7f0', glyph: '╱'}};
function nodalStarter(kind = 'glass') {
  const roles = kind === 'ember' ? ['sub', 'resonator', 'fold'] : kind === 'breath' ? ['formant', 'resonator', 'tilt'] : ['resonator', 'resonator', 'resonator'];
  return __XenNodalModel.normalize({schema: __XenNodalModel.schema, schemaVersion: 1, kernelVersion: __XenNodalModel.kernelVersion,
    name: kind === 'ember' ? 'Ember Network' : kind === 'breath' ? 'Breath Texture' : 'Glass Cluster', referenceHz: 220, seed: 913,
    excitation: {kind: kind === 'breath' ? 'breath' : 'tone', level: .65}, coupling: .12,
    articulation: {durationSec: 1.8, attackSec: .012, releaseSec: .18},
    nodes: roles.map((role, i) => ({id: 'design-' + i, label: __NodalOrgans[role].label, role,
      x: [.28, .7, .49][i], y: [.33, .4, .73][i], ratio: [1, 1.5, 2][i], cents: 0, radius: .3, strength: 1,
      excitation: [.85, .45, .28][i], pickup: [.9, .65, .4][i], muted: false}))});
}
function nodalRatioText(node) {
  if(node.ratioText){const a=node.ratioText.split('/').map(Number),v=a.length===2?a[0]/a[1]:a[0];if(Math.abs(v-node.ratio)<1e-10)return node.ratioText;}
  for(let d=1;d<=32;d++){const n=Math.round(node.ratio*d);if(Math.abs(n/d-node.ratio)<1e-10)return n+'/'+d;}
  return Number(node.ratio.toPrecision(7)).toString();
}
const __NodalOpenPresets = [
  {id:'prism',name:'Prism',hint:'Struck glass · long, uneven modes',wave:'sine',kind:'impulse',roles:['resonator','resonator','tilt'],ratios:[1,1.003,1.007],body:.96,stretch:.62,balance:.78,damping:.28,natural:.85,follow:1,width:.55},
  {id:'ember',name:'Ember',hint:'Dense grain · warm, folded material',wave:'saw',kind:'tone',roles:['sub','fold','drive'],ratios:[2,1,1.004],body:.3,stretch:-.24,balance:.38,damping:.65,natural:.12,follow:1,width:.3},
  {id:'hollow',name:'Hollow',hint:'Odd partials · steady formant body',wave:'hollow',kind:'tone',roles:['resonator','formant','formant'],ratios:[1,1,1.006],body:.56,stretch:-.12,balance:.72,damping:.4,natural:.28,follow:.25,width:.46},
  {id:'filament',name:'Filament',hint:'Exciter → listeners · a resonant thread',wave:'triangle',kind:'impulse',roles:['resonator','resonator','tilt'],ratios:[1,1.018,1.04],body:1,stretch:.27,balance:.6,damping:.3,natural:.9,follow:1,width:.72},
  {id:'reed',name:'Reed',hint:'Periodic core · breath through the network',wave:'triangle',kind:'tone',roles:['resonator','formant','tilt'],ratios:[1,1.002,1.008],body:.62,stretch:.08,balance:.48,damping:.7,natural:.18,follow:.55,width:.36},
  {id:'obsidian',name:'Obsidian',hint:'Narrow pulse · compressed, dark body',wave:'pulse',kind:'tone',roles:['drive','resonator','fold'],ratios:[1,1.005,1.01],body:.4,stretch:-.68,balance:.84,damping:.23,natural:.35,follow:1,width:.58}
];
function nodalOpenStarter(id='prism') {
  const p=__NodalOpenPresets.find(p=>p.id===id)??__NodalOpenPresets[0],legacy=nodalStarter('glass');
  return __XenNodalModel.normalize({...__XenNodalModel.upgrade(legacy),name:p.name+' Network',excitation:{kind:p.kind,level:.78},coupling:.18,
    material:{...p,richness:.85},articulation:{...legacy.articulation,durationSec:1.6,attackSec:.006,releaseSec:.12},
    nodes:legacy.nodes.map((n,i)=>({...n,role:p.roles[i],label:__NodalOrgans[p.roles[i]].label,ratio:p.ratios[i],radius:.4,
      x:[.25,.68,.51][i],y:p.kind==='impulse'?[.32,.57,.76][i]:[.31,.5,.7][i],excitationSeed:913+i*71,
      excitation:id==='filament'?(i===0?1:0):[.9,.5,.3][i],pickup:id==='filament'?(i===0?0:.9):[.85,.7,.55][i],
      excitationKind:id==='reed'&&i===1?'breath':'inherit'}))});
}
function NodalModalMap({material,onChange,onGestureStart,onGestureEnd}) {
  const h=P.createElement,ref=P.useRef(null),active=P.useRef(false);
  function move(e){if(!active.current)return;const r=ref.current.getBoundingClientRect();onChange({stretch:Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1)),balance:Math.max(0,Math.min(1,1-(e.clientY-r.top)/r.height))});}
  return h('div',{className:'nd-modal-space'},h('div',{className:'nd-section-label'},'MODAL STRUCTURE',h('span',null,'shape the body')),
    h('svg',{ref,viewBox:'0 0 400 140',preserveAspectRatio:'none',role:'group','aria-label':'Modal structure pad',tabIndex:0,
      onPointerDown:e=>{if(e.button!==0)return;onGestureStart?.();active.current=true;e.currentTarget.setPointerCapture(e.pointerId);move(e);},onPointerMove:move,onPointerUp:()=>{active.current=false;onGestureEnd?.();},onPointerCancel:()=>{active.current=false;onGestureEnd?.();},onKeyUp:()=>onGestureEnd?.(),onBlur:()=>onGestureEnd?.(),
      onKeyDown:e=>{if(e.key.startsWith('Arrow')){e.preventDefault();if(!e.repeat)onGestureStart?.();onChange({stretch:Math.max(-1,Math.min(1,material.stretch+(e.key==='ArrowRight'?.04:e.key==='ArrowLeft'?-.04:0))),balance:Math.max(0,Math.min(1,material.balance+(e.key==='ArrowUp'?.02:e.key==='ArrowDown'?-.02:0)))});}}},
      ...[0,1,2,3,4].map(i=>h('path',{key:i,d:'M'+(i*100)+' 0V140 M0 '+(i*35)+'H400',stroke:'#6cb1af',strokeOpacity:.13,fill:'none'})),
      h('line',{x1:(material.stretch+1)*200,x2:(material.stretch+1)*200,y1:0,y2:140,stroke:'#e8bda2',strokeOpacity:.4}),
      h('line',{x1:0,x2:400,y1:(1-material.balance)*140,y2:(1-material.balance)*140,stroke:'#e8bda2',strokeOpacity:.4}),
      h('circle',{cx:(material.stretch+1)*200,cy:(1-material.balance)*140,r:18,fill:'#e9ad8a',fillOpacity:.1,stroke:'#f4c3a6',strokeOpacity:.35}),
      h('circle',{cx:(material.stretch+1)*200,cy:(1-material.balance)*140,r:5,fill:'#f4c3a6'})),
    h('div',{className:'nd-map-labels'},h('span',null,'compressed'),h('span',null,'stretched / inharmonic')),
    h('div',{className:'nd-map-sliders'},
      h('label',null,'Mode spacing',h('input',{type:'range',min:-1,max:1,step:.01,value:material.stretch,'aria-label':'Modal stretch',onPointerDown:onGestureStart,onPointerUp:onGestureEnd,onPointerCancel:onGestureEnd,onKeyDown:e=>{if(!e.repeat)onGestureStart?.();},onKeyUp:onGestureEnd,onBlur:onGestureEnd,onChange:e=>onChange({stretch:+e.target.value})})),
      h('label',null,'Low → upper modes',h('input',{type:'range',min:0,max:1,step:.01,value:material.balance,'aria-label':'Spectral balance',onPointerDown:onGestureStart,onPointerUp:onGestureEnd,onPointerCancel:onGestureEnd,onKeyDown:e=>{if(!e.repeat)onGestureStart?.();},onKeyUp:onGestureEnd,onBlur:onGestureEnd,onChange:e=>onChange({balance:+e.target.value})}))));
}
function NodalAuditionSpectrum({analyser}) {
  const h=P.createElement,canvas=P.useRef(null),last=P.useRef(null),held=P.useRef(null),reference=P.useRef(null);
  P.useEffect(()=>{
    let frame=0;const buffer=analyser?new Float32Array(analyser.frequencyBinCount):null;
    if(analyser){if(held.current)reference.current=held.current.slice();held.current=null;}else if(held.current)last.current=held.current.slice();
    function draw(){cancelAnimationFrame(frame);const c=canvas.current;if(!c)return;const r=c.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);if(r.width<1)return;
      const width=Math.round(r.width*dpr),height=Math.round(r.height*dpr);if(c.width!==width||c.height!==height){c.width=width;c.height=height;}const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,r.width,r.height);
      if(analyser){analyser.getFloatFrequencyData(buffer);last.current=Array.from({length:64},(_,i)=>{const low=40*Math.pow(400,i/64),high=40*Math.pow(400,(i+1)/64),a=Math.max(1,Math.floor(low/analyser.context.sampleRate*analyser.fftSize)),b=Math.min(buffer.length-1,Math.ceil(high/analyser.context.sampleRate*analyser.fftSize));let db=-100;for(let k=a;k<=b;k++)db=Math.max(db,buffer[k]);return Math.max(0,Math.min(1,(db+90)/75));});if(!held.current)held.current=last.current.slice();else last.current.forEach((v,i)=>held.current[i]=Math.max(held.current[i],v));}
      for(const [values,color] of [[reference.current,'#7e6f6780'],[last.current,'#83d9ca']]){if(!values)continue;ctx.fillStyle=color;values.forEach((v,i)=>ctx.fillRect(i*r.width/64,r.height*(1-v),Math.max(1,r.width/64-2),r.height*v));}
      if(analyser)frame=requestAnimationFrame(draw);
    }draw();const ro=new ResizeObserver(draw);ro.observe(canvas.current);return()=>{cancelAnimationFrame(frame);ro.disconnect();};
  },[analyser]);
  return h('div',{className:'nd-spectrum'},h('div',{className:'nd-section-label'},'AUDITION SPECTRUM',h('span',null,analyser?'live output':last.current?'previous audition · peak hold':'preview to measure')),h('canvas',{ref:canvas,'aria-label':'Measured preview spectrum'}),h('div',{className:'nd-map-labels'},h('span',null,'40 Hz'),h('span',null,'16 kHz')));
}

function NodalSoundDesigner({onModeChange}) {
  const h = P.createElement, backend = __XenNodalInstallation.current, source = P.useRef(null);
  if (!source.current) {
    try { source.current = backend.capture(); }
    catch { source.current = nodalStarter(); }
  }
  const [initial] = P.useState(() => {
    let restored = null;
    try { const raw = localStorage.getItem(__NodalDraftKey); if (raw && raw.length < 250000) restored = JSON.parse(raw); } catch {}
    let instrument = __NodalPendingDesign;
    __NodalPendingDesign = null;
    restored = __NodalSessionDraft ?? restored;
    if (!instrument && restored?.instrument) try { instrument = __XenNodalModel.normalize(restored.instrument); } catch {}
    instrument = instrument ?? nodalOpenStarter();
    const editTarget = __NodalPendingEditTarget;
    __NodalPendingEditTarget = null;
    const libraryEntry = __NodalPendingLibraryEntry;
    __NodalPendingLibraryEntry = null;
    return {instrument, editTarget, libraryEntry, selectedId: instrument.nodes.some(n => n.id === restored?.selectedId) ? restored.selectedId : instrument.nodes[0].id, tab: restored?.tab === 'pitch' ? 'pitch' : 'volume'};
  });
  const [dragView,setDragView] = P.useState(null);
  const [instrument, setInstrument] = P.useState(initial.instrument), [selectedId, setSelectedId] = P.useState(initial.selectedId ?? initial.instrument.nodes[0].id);
  const [tab, setTab] = P.useState(initial.tab), [phase, setPhase] = P.useState('idle'), [progress, setProgress] = P.useState(0);
  const [autoPreview,setAutoPreview] = P.useState(false); // Per editor opening: opt in explicitly.
  const [message, setMessage] = P.useState('Move nodes, adjust sound settings, or preview.'), [saved, setSaved] = P.useState([]), [ratioDraft, setRatioDraft] = P.useState('1');
  const [soundTab, setSoundTab] = P.useState('material'), [analyser,setAnalyser] = P.useState(null);
  const [withReference, setWithReference] = P.useState(true), [exported, setExported] = P.useState(null);
  const [editTarget, setEditTarget] = P.useState(initial.editTarget ?? null);
  const libraryEdit = initial.libraryEntry && !initial.editTarget;
  const current = P.useRef(instrument), history = P.useRef(null), drag = P.useRef(null), generation = P.useRef(0), timer = P.useRef(null), phaseRef = P.useRef('idle');
  const autoPreviewEnabled=P.useRef(false),autoPreviewTimer=P.useRef(null);
  const svg = P.useRef(null), playStarted = P.useRef(0);
  const fileInput = P.useRef(null), libraryIdentity = P.useRef(initial.libraryEntry ?? null);
  const nodeFunctionMemory=P.useRef(new Map());
  const [,refreshHistory]=P.useState(0);
  if (!history.current) history.current = __XenNodalEditing.createHistory();
  const [contextNode, setContextNode] = P.useState(null), menu = P.useRef(null), stage = P.useRef(null), inspector = P.useRef(null);
  const draft = P.useRef(null);
  if (!draft.current) draft.current = __XenNodalEditing.createDraftStore({setItem:(key,value)=>localStorage.setItem(key,value)}, __NodalDraftKey, error=>setMessage('Could not save work: '+error.message));
  function beginGesture() { history.current.begin(current.current); }
  function endGesture() { const undo=history.current.canUndo,redo=history.current.canRedo;history.current.end(current.current);if(undo!==history.current.canUndo||redo!==history.current.canRedo)refreshHistory(v=>v+1); }
  function persist(next = current.current) {
    const payload = {instrument:next, selectedId:next.nodes.some(n=>n.id===selectedId)?selectedId:next.nodes[0].id, tab};
    __NodalSessionDraft = payload; draft.current.update(payload);
  }
  function applyHistory(direction) {
    setContextNode(null);
    const next = history.current[direction](current.current);
    refreshHistory(v=>v+1);
    if (next) commit(next, false);
  }
  function removeNode(id = selected.id) {
    const before = current.current, index = before.nodes.findIndex(n=>n.id===id);
    const next = __XenNodalEditing.removeNode(before,id);
    if (next === before) return;
    commit(next);
    if (selectedId===id) setSelectedId(next.nodes[Math.min(index,next.nodes.length-1)].id);
    nodeFunctionMemory.current.delete(id); setContextNode(null);
  }
  function duplicateNode(id) {
    const before = current.current, node = before.nodes.find(n=>n.id===id);
    if (!node || before.nodes.length>=7) return;
    const copyId = freshNodeId(), copy = {...node,id:copyId,x:Math.min(.96,node.x+.06),y:Math.min(.96,node.y+.06)};
    commit({...before,nodes:[...before.nodes,copy]}); setSelectedId(copyId); setContextNode(null);
  }
  function freshNodeId() { let id; do { id='organ-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7); } while(current.current.nodes.some(n=>n.id===id)); return id; }
  function openNodeMenu(event,node) {
    event.preventDefault(); event.stopPropagation(); endGesture(); setSelectedId(node.id);
    const r=stage.current.getBoundingClientRect();
    setContextNode({id:node.id,x:event.clientX?event.clientX-r.left:node.x*r.width,y:event.clientY?event.clientY-r.top:node.y*r.height});
  }
  P.useLayoutEffect(()=>{
    if(!contextNode||!menu.current||!stage.current)return;
    const r=stage.current.getBoundingClientRect(),m=menu.current.getBoundingClientRect();
    menu.current.style.left=Math.max(4,Math.min(contextNode.x,r.width-m.width-4))+'px';
    menu.current.style.top=Math.max(4,Math.min(contextNode.y,r.height-m.height-4))+'px';
    menu.current.querySelector('button:not(:disabled)')?.focus();
  },[contextNode]);
  P.useEffect(()=>{
    if(!contextNode)return;
    const close=e=>{if(!menu.current?.contains(e.target))setContextNode(null);};
    const resize=()=>setContextNode(null);
    document.addEventListener('pointerdown',close);window.addEventListener('resize',resize);
    return()=>{document.removeEventListener('pointerdown',close);window.removeEventListener('resize',resize);};
  },[contextNode]);
  function setNodeFunction(kind,id=selectedId){const n=current.current.nodes.find(n=>n.id===id);if(!n)return;if(n.excitation>0&&n.pickup>0)nodeFunctionMemory.current.set(n.id,{excitation:n.excitation,pickup:n.pickup});const original=nodeFunctionMemory.current.get(n.id)??{excitation:.7,pickup:.7};const patch=kind==='Both'?original:kind==='Exciter'?{excitation:original.excitation,pickup:0}:{excitation:0,pickup:original.pickup};commit({...current.current,nodes:current.current.nodes.map(v=>v.id===id?{...v,...patch}:v)});}
  const [libraryChoice, setLibraryChoice] = P.useState(initial.libraryEntry?.id ?? '');
  current.current = instrument; phaseRef.current = phase;
  const selected = instrument.nodes.find(n => n.id === selectedId) ?? instrument.nodes[0];
  const plan = P.useMemo(() => __XenNodalModel.compile(instrument), [instrument]);
  const activeNodes = instrument.nodes.filter(n => !n.muted);
  function stop() { if(autoPreviewTimer.current!==null){clearTimeout(autoPreviewTimer.current);autoPreviewTimer.current=null;} generation.current++; backend.stop(); if (timer.current) clearInterval(timer.current); timer.current = null; setPhase('idle'); setProgress(0); setAnalyser(null); }
  P.useEffect(() => {
    document.body.dataset.nodalSounddesign = 'true';
    try { setSaved(__XenNodalLibrary.list()); } catch (error) { setMessage(error.message); }
    return () => { generation.current++; if(autoPreviewTimer.current!==null)clearTimeout(autoPreviewTimer.current); backend.stop(); if (timer.current) clearInterval(timer.current); delete document.body.dataset.nodalSounddesign; };
  }, []);
  P.useEffect(() => { setRatioDraft(nodalRatioText(selected)); }, [selected.id, selected.ratio]);
  P.useLayoutEffect(() => { persist(instrument); }, [instrument, selectedId, tab]);
  P.useLayoutEffect(() => {
    const flush=()=>draft.current.flush();
    const hidden=()=>{if(document.visibilityState==='hidden')flush();};
    window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',hidden);
    return()=>{flush();window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',hidden);};
  }, []);
  function commit(next, record = true) {
    const normalized = __XenNodalModel.normalize(next);
    if (__XenNodalEditing.same(normalized,current.current)) return;
    if (record) history.current.record(current.current, normalized);
    if (phaseRef.current !== 'idle') stop();
    current.current = normalized; persist(normalized); setInstrument(normalized); setExported(null);
    if (!normalized.nodes.some(n=>n.id===selectedId)) setSelectedId(normalized.nodes[0].id);
    // Changes are already committed/persisted. Avoid redundant costly previews
    // while a slider is being moved; the latest committed snapshot always wins.
    if(autoPreviewTimer.current!==null)clearTimeout(autoPreviewTimer.current);
    if(autoPreviewEnabled.current)autoPreviewTimer.current=setTimeout(()=>{autoPreviewTimer.current=null;if(autoPreviewEnabled.current)audition();},180);
  }
  function editNode(patch, record = true) { commit({...current.current, nodes: current.current.nodes.map(n => n.id === selected.id ? {...n, ...patch} : n)}, record); }
  function editArticulation(patch) { commit({...current.current, articulation: {...current.current.articulation, ...patch}}); }
  async function audition(ratio = 1) {
    stop(); const turn = generation.current, snapshot = current.current; setPhase('preparing'); setMessage('Preparing preview…');
    try {
      // The sound designer uses its own deterministic, ephemeral PCM audition.
      // The saved instrument and Melodic notes remain direct synthetic recipes.
      const handle = await backend.preview(snapshot, {frequency: snapshot.referenceHz * ratio, velocity: .8});
      if (!handle) throw new Error('Could not start Nodal audio preview.');
      await handle.started;
      if (turn !== generation.current) return;
      setPhase('playing'); setAnalyser(handle.analyser ?? null); playStarted.current = performance.now(); setMessage('Preview playing · ' + (snapshot.referenceHz * ratio).toFixed(1) + ' Hz');
      timer.current = setInterval(() => {
        const elapsed = (performance.now() - playStarted.current) / 1000, length = snapshot.articulation.durationSec;
        setProgress(Math.min(1, elapsed / length));
        if (elapsed >= (handle.durationSec ?? (length + snapshot.articulation.releaseSec)) + .08) { stop(); setMessage('Preview finished.'); }
      }, 32);
    } catch (error) { if (turn === generation.current) { stop(); setMessage(error.message); } }
  }
  function position(event) {
    const matrix = svg.current?.getScreenCTM(); if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return {x: Math.max(.04, Math.min(.96, point.x / 1000)), y: Math.max(.04, Math.min(.96, point.y / 1000))};
  }
  function startDrag(event, node) {
    if(event.button!==0)return;
    event.preventDefault(); setContextNode(null); setSelectedId(node.id); const point = position(event); if (!point) return;
    drag.current = {id: node.id, dx: node.x - point.x, dy: node.y - point.y, x:node.x, y:node.y, pending:null}; svg.current.setPointerCapture(event.pointerId);
  }
  function moveDrag(event) {
    const moving = drag.current, point = position(event); if (!moving || !point) return;
    const next={id:moving.id,x:Math.max(.04,Math.min(.96,point.x+moving.dx)),y:Math.max(.04,Math.min(.96,point.y+moving.dy))};
    moving.pending=next;setDragView(next);
  }
  function finishDrag() { const moving=drag.current,view=moving?.pending; if(view&&Math.hypot(view.x-moving.x,view.y-moving.y)>.001){commit({...current.current,nodes:current.current.nodes.map(n=>n.id===view.id?{...n,x:view.x,y:view.y}:n)});} drag.current=null;setDragView(null); }
  function toggleEdge(a, b) {
    if(current.current.schemaVersion===2){const pair=[a,b].sort(),matches=p=>p[0]===pair[0]&&p[1]===pair[1],negative=current.current.edgePolarities.some(matches),blocked=current.current.blockedEdges.some(matches);commit({...current.current,edgePolarities:negative||blocked?current.current.edgePolarities.filter(p=>!matches(p)):[...current.current.edgePolarities,pair],blockedEdges:negative?[...current.current.blockedEdges,pair]:current.current.blockedEdges.filter(p=>!matches(p))});return;}
    const pair = [a, b].sort(), blocked = current.current.blockedEdges;
    const exists = blocked.some(p => p[0] === pair[0] && p[1] === pair[1]);
    commit({...current.current, blockedEdges: exists ? blocked.filter(p => p[0] !== pair[0] || p[1] !== pair[1]) : [...blocked, pair]});
  }
  function addNode(role) {
    if (instrument.nodes.length >= 7) return;
    const id = freshNodeId(), node = {id, label: __NodalOrgans[role].label, role, x: .48, y: .52, ratio: 1, cents: 0, radius: .22, strength: 1, excitation: .5, pickup: .65, muted: false, excitationSeed:913, excitationKind:'inherit', wave:'inherit'};
    commit({...instrument, nodes: [...instrument.nodes, node]}); setSelectedId(id);
  }
  function save(asVariant = false) {
    try {
      const identity = libraryIdentity.current;
      const options = asVariant ? {asVariant: true} : identity ? {id: identity.id, expectedRevision: identity.revision} : {};
      const entry = __XenNodalLibrary.save(instrument, options);
      libraryIdentity.current = entry; setLibraryChoice(entry.id); setSaved(__XenNodalLibrary.list());
      setMessage('Saved · ' + entry.instrument.name + ' · Revision ' + entry.revision);
    }
    catch (error) { setMessage(error.message); }
  }
  function removeSaved() {
    const entry = libraryIdentity.current; if (!entry) return;
    try {
      __XenNodalLibrary.remove(entry.id, entry.revision);
      libraryIdentity.current = null; setLibraryChoice(''); setSaved(__XenNodalLibrary.list());
      setMessage('Removed from library. Draft and Melodic copies remain available.');
    } catch (error) { setMessage(error.message); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([__XenNodalModel.serialize(instrument)], {type: 'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = instrument.name.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, '_') + '.xen-nodal.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('Instrument file exported.');
  }
  async function importFile(event) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try { if (file.size > 250000) throw new Error('Instrument file is too large.'); const next = __XenNodalModel.deserialize(await file.text()); libraryIdentity.current = null; setLibraryChoice(''); commit(next); setSelectedId(next.nodes[0].id); setMessage(next.name + ' imported'); }
    catch (error) { setMessage('Import: ' + error.message); }
  }
  function send() {
    try {
      stop();
      if (editTarget) {
        const result = nodalUpdateMelodicInstrument(current.current, editTarget);
        setSaved(__XenNodalLibrary.list());
        setExported(result);
        setMessage('Instrument updated in existing note block · ' + result.entry.instrument.name);
        // Explicit apply completes the edit and goes back to the original block.
        window.dispatchEvent(new CustomEvent('xensonar:nodal-open-melodic'));
        return;
      }
      const result = nodalSendToMelodic(current.current, withReference);
      setExported(result); setSaved(__XenNodalLibrary.list());
      setMessage('New Melodic track · ' + result.entry.instrument.name + ' · saved to Nodal Library' + (withReference ? ' · with reference note' : ''));
    } catch (error) { setMessage(error.message); }
  }
  function backToMelodic() { stop(); window.dispatchEvent(new CustomEvent('xensonar:nodal-open-melodic')); }
  function range(label, value, min, max, step, callback, display = value.toFixed(2)) {
    return h('label', {className: 'nd-slider'}, h('span', null, label, h('output', null, display)), h('input', {type: 'range', min, max, step, value, onPointerDown:beginGesture,onPointerUp:endGesture,onPointerCancel:endGesture,onKeyDown:e=>{if(!e.repeat&&/^(Arrow|Home|End|Page)/.test(e.key))beginGesture();},onKeyUp:endGesture,onBlur:endGesture, 'aria-label': label, onChange: event => callback(Number(event.target.value))}));
  }
  const modern=instrument.schemaVersion===2,m=instrument.material;
  function editMaterial(patch,record=true){const base=__XenNodalModel.upgrade(current.current);commit({...base,material:{...base.material,...patch}},record);}
  function loadPreset(id){nodeFunctionMemory.current.clear();const next=nodalOpenStarter(id);libraryIdentity.current=null;setLibraryChoice('');commit(next);setSelectedId(next.nodes[0].id);setMessage(next.name+' · ready to shape');}
  const envelopeKey=tab==='volume'?'volumeEnvelope':'pitchEnvelope';
    const controls=h('div',{className:'nd-inspector',ref:inspector},
    h('div',{className:'nd-inspector-heading'},
      h('select',{value:selectedId,'aria-label':'Select node',onChange:e=>setSelectedId(e.target.value)},...instrument.nodes.map((node,i)=>h('option',{key:node.id,value:node.id},(i+1)+' · '+__NodalOrgans[node.role].label))),
      h('select',{value:selected.role,'aria-label':'Node role',onChange:e=>editNode({role:e.target.value,label:__NodalOrgans[e.target.value].label})},...Object.entries(__NodalOrgans).map(([role,o])=>h('option',{key:role,value:role},o.label))),
      h('button',{'aria-pressed':selected.muted,onClick:()=>editNode({muted:!selected.muted})},selected.muted?'Muted':'Active'),
      h('button',{'aria-label':'Remove selected node',className:'nd-remove-node',disabled:instrument.nodes.length===1,onClick:()=>removeNode()},'× Remove node')),
    modern?h('div',{className:'nd-function-row'},h('span',null,'NODE FUNCTION'),...['Exciter','Listener','Both'].map(kind=>h('button',{key:kind,'aria-pressed':kind==='Exciter'?selected.excitation>0&&selected.pickup===0:kind==='Listener'?selected.excitation===0&&selected.pickup>0:selected.excitation>0&&selected.pickup>0,
      onClick:()=>setNodeFunction(kind)},kind)),
      h('details',{className:'nd-node-source'},h('summary',null,'Node source'),
      h('select',{'aria-label':'Node excitation',value:selected.excitationKind,onChange:e=>editNode({excitationKind:e.target.value})},...['inherit','tone','impulse','breath'].map(kind=>h('option',{key:kind,value:kind},kind==='inherit'?'Global source':kind))),
      h('select',{'aria-label':'Node material',value:selected.wave,onChange:e=>editNode({wave:e.target.value})},...['inherit','sine','triangle','saw','hollow','pulse'].map(w=>h('option',{key:w,value:w},w==='inherit'?'Global wave':w))))):null,
    h('div',{className:'nd-parameters'},
      h('label',{className:'nd-ratio'},h('span',null,'Ratio · '+(instrument.referenceHz*selected.ratio*Math.pow(2,selected.cents/1200)).toFixed(2)+' Hz'),h('input',{value:ratioDraft,'aria-label':'Pitch ratio',onChange:e=>setRatioDraft(e.target.value),onKeyDown:e=>{if(e.key==='Enter')e.currentTarget.blur();},onBlur:()=>{const a=ratioDraft.split('/').map(Number),v=a.length===2?a[0]/a[1]:a.length===1?a[0]:NaN;if(Number.isFinite(v)&&v>0&&v<=32)editNode({ratio:v,ratioText:ratioDraft});else setRatioDraft(nodalRatioText(selected));}})),
      range('Aura',selected.radius,.04,.6,.005,radius=>editNode({radius})),
      range('Coupling',instrument.coupling,0,.2,.001,coupling=>commit({...instrument,coupling})),
      range('Excitation level',selected.excitation,0,1,.01,excitation=>editNode({excitation})),
      range('Pickup',selected.pickup,0,1,.01,pickup=>editNode({pickup})),
      range('Strength',selected.strength,0,2,.01,strength=>editNode({strength}))));
  const libraryControls=h('div',{className:'nd-library-row'},h('label',{className:'nd-saved'},h('span',null,'SAVED INSTRUMENTS'),h('select',{'aria-label':'Load instrument',value:libraryChoice,onChange:e=>{const entry=saved.find(v=>v.id===e.target.value);if(entry){libraryIdentity.current=entry;setLibraryChoice(entry.id);commit(entry.instrument);setSelectedId(entry.instrument.nodes[0].id);setMessage(entry.instrument.name+' loaded');}}},h('option',{value:''},saved.length?'Select instrument…':'No saved instruments'),...saved.map(e=>h('option',{key:e.id,value:e.id},nodalLibraryEntryLabel(e,saved))))),
          h('button',{onClick:download,'aria-label':'Export instrument file'},'↓ File'),h('button',{onClick:()=>fileInput.current.click(),'aria-label':'Import instrument file'},'↑'),h('button',{onClick:removeSaved,disabled:!libraryChoice,'aria-label':'Remove saved instrument'},'×'),h('input',{ref:fileInput,type:'file',accept:'.json,.xen-nodal',hidden:true,onChange:importFile}));
  return h('div',{className:'nd-designer-body nd-open-workshop','data-nodal-designer':true,
    onFocusCapture:e=>{if(e.target.matches('input:not([type=checkbox])'))beginGesture();},
    onBlurCapture:e=>{if(e.target.matches('input'))endGesture();},
    onKeyDown:e=>{
      if(!e.defaultPrevented&&(e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='z'&&!e.target.matches('input,textarea,[contenteditable=true]')){e.preventDefault();applyHistory(e.shiftKey?'redo':'undo');}
    }},
    h('div',{className:'nd-toolbar'},
      h('div',{className:'nd-name nd-current-name'},h('span',null,'INSTRUMENT:'),' ',h('strong',null,instrument.name)),
      h('label',null,h('span',null,'EXCITATION'),h('select',{value:instrument.excitation.kind,'aria-label':'Excitation',onChange:e=>commit({...instrument,excitation:{...instrument.excitation,kind:e.target.value}})},...['tone','impulse','breath'].map(k=>h('option',{key:k,value:k},k[0].toUpperCase()+k.slice(1))))),
      h('label',null,h('span',null,'REFERENCE · Hz'),h('input',{type:'number',min:10,max:4000,step:.1,value:instrument.referenceHz,'aria-label':'Reference pitch',onChange:e=>{const v=+e.target.value;if(v>=10&&v<=4000)commit({...instrument,referenceHz:v});}})),
      h('label',null,h('span',null,'DURATION · s'),h('input',{type:'number',min:.1,max:30,step:.1,value:instrument.articulation.durationSec,'aria-label':'Duration',onChange:e=>{const v=+e.target.value;if(v>=.1&&v<=30)editArticulation({durationSec:v});}})),
      h('div',{className:'nd-preview-control'},
        h('button',{className:'nd-play '+(phase!=='idle'?'is-playing':''),'aria-label':phase==='preparing'?'Cancel preparation':phase==='playing'?'Stop preview':'Preview sound',onClick:()=>{if(autoPreviewTimer.current!==null){clearTimeout(autoPreviewTimer.current);autoPreviewTimer.current=null;}phase==='idle'?audition():stop();}},phase==='idle'?'▶ Preview':phase==='preparing'?'■ Cancel':'■ Stop'),
        h('label',{className:'nd-auto-switch'},h('span',null,'Auto:'),h('input',{type:'checkbox','aria-label':'Auto preview',checked:autoPreview,onChange:e=>{const enabled=e.target.checked;autoPreviewEnabled.current=enabled;setAutoPreview(enabled);if(!enabled&&autoPreviewTimer.current!==null){clearTimeout(autoPreviewTimer.current);autoPreviewTimer.current=null;}}})))),
    h('div',{className:'nd-preset-bank'},...__NodalOpenPresets.map(p=>h('button',{key:p.id,onClick:()=>loadPreset(p.id),title:p.hint,'aria-pressed':instrument.name===p.name+' Network'},h('i',{className:'nd-preset-glyph nd-glyph-'+p.id}),h('span',null,p.name),h('small',null,p.hint.split(' · ')[0])))),
    h('div',{className:'nd-layout'},
      h('div',{className:'nd-body-panel'},
        h('div',{className:'nd-stage-heading'},h('span',null,'RESONANCE CONSTELLATION'),h('span',null,instrument.nodes.length+' nodes · '+plan.edges.length+' links')),
        h('div',{ref:stage,className:'nd-stage '+(phase==='playing'?'is-sounding':'')},
          h('div',{className:'nd-axis nd-axis-top'},'short resonance'),h('div',{className:'nd-axis nd-axis-bottom'},'long resonance'),
          h('svg',{ref:svg,viewBox:'0 0 1000 1000',role:'application','aria-label':'Nodal configuration: drag nodes or use arrow keys',tabIndex:0,onPointerMove:moveDrag,onPointerUp:finishDrag,onPointerCancel:()=>{drag.current=null;setDragView(null);},onLostPointerCapture:()=>{drag.current=null;setDragView(null);},onKeyUp:endGesture,onBlur:endGesture,onKeyDown:e=>{if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){openNodeMenu(e,selected);return;}if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeNode();return;}if(e.key.startsWith('Arrow')&&!e.repeat)beginGesture();const d={ArrowLeft:[-.012,0],ArrowRight:[.012,0],ArrowUp:[0,-.012],ArrowDown:[0,.012]}[e.key];if(d){e.preventDefault();editNode({x:Math.max(.04,Math.min(.96,selected.x+d[0])),y:Math.max(.04,Math.min(.96,selected.y+d[1]))});}}},
            h('defs',null,h('radialGradient',{id:'nd-open-field'},h('stop',{offset:'0%',stopColor:'#203e42'}),h('stop',{offset:'100%',stopColor:'#09151e'})),h('pattern',{id:'nd-open-grid',width:100,height:100,patternUnits:'userSpaceOnUse'},h('path',{d:'M100 0H0V100',fill:'none',stroke:'#9cc7be',strokeOpacity:.08,strokeWidth:1}))),
            h('rect',{width:1000,height:1000,rx:26,fill:'url(#nd-open-field)'}),h('rect',{width:1000,height:1000,fill:'url(#nd-open-grid)'}),
            ...instrument.nodes.map(node=>h('circle',{key:'aura-'+node.id,cx:node.x*1000,cy:node.y*1000,r:node.radius*1000,fill:__NodalOrgans[node.role].color,fillOpacity:.018,stroke:__NodalOrgans[node.role].color,strokeOpacity:node.id===selected.id?.22:.08,strokeDasharray:'3 12',pointerEvents:'none'})),
            ...plan.edges.map(edge=>{const a=activeNodes.find(v=>v.id===plan.nodes[edge.a].id),b=activeNodes.find(v=>v.id===plan.nodes[edge.b].id),negative=edge.polarity===-1;return h('g',{key:a.id+b.id,className:'nd-contact','data-edge':a.id+'|'+b.id,onClick:()=>toggleEdge(a.id,b.id),opacity:instrument.coupling>0?1:.15},
              h('line',{x1:a.x*1000,y1:a.y*1000,x2:b.x*1000,y2:b.y*1000,stroke:negative?'#edac8b':'#86dbcc',strokeWidth:2+edge.weight*12,strokeOpacity:.5,strokeDasharray:negative?'14 8':undefined}),
              h('line',{x1:a.x*1000,y1:a.y*1000,x2:b.x*1000,y2:b.y*1000,stroke:'transparent',strokeWidth:35}),
              modern?h('text',{x:(a.x+b.x)*500,y:(a.y+b.y)*500-12,fill:negative?'#edac8b':'#86dbcc',fontSize:24,textAnchor:'middle',pointerEvents:'none'},negative?'−':'+'):null,
              h('title',null,modern?(negative?'Negative coupling · click to disconnect':'Positive coupling · click to invert'):'Disconnect nodes'));}),
            ...instrument.blockedEdges.map(([aid,bid])=>{const a=instrument.nodes.find(n=>n.id===aid),b=instrument.nodes.find(n=>n.id===bid);return h('g',{key:aid+bid,className:'nd-contact',onClick:()=>toggleEdge(aid,bid)},h('line',{x1:a.x*1000,y1:a.y*1000,x2:b.x*1000,y2:b.y*1000,stroke:'#6d7b85',strokeWidth:3,strokeDasharray:'5 16'}),h('line',{x1:a.x*1000,y1:a.y*1000,x2:b.x*1000,y2:b.y*1000,stroke:'transparent',strokeWidth:35}),h('title',null,'Reconnect nodes'));}),
            ...instrument.nodes.map(raw=>{const node=dragView?.id===raw.id?{...raw,...dragView}:raw,o=__NodalOrgans[node.role];return h('g',{key:node.id,'data-node-id':node.id,className:'nd-organ '+(node.id===selected.id?'is-selected ':'')+(node.muted?'is-muted':''),transform:'translate('+node.x*1000+' '+node.y*1000+')',onPointerDown:e=>startDrag(e,node),onContextMenu:e=>openNodeMenu(e,node)},
              h('circle',{r:67,fill:'transparent'}),
              ...[0,1,2].map(b=>h('circle',{key:b,r:43+b*15,fill:'none',stroke:o.color,strokeOpacity:node.muted?.15:.25+(modern?plan.bandWeights[b]:[1,.22,.08][b])*.45,strokeWidth:modern?1+plan.bandWeights[b]*3:2,strokeDasharray:b===1?'4 7':undefined})),
              h('circle',{r:34,fill:'#0a1920',stroke:o.color,strokeWidth:2}),
              h('text',{y:11,textAnchor:'middle',fill:o.color,fontSize:31},o.glyph),
              h('text',{y:node.y>.78?-126:108,textAnchor:'middle',fill:'#e7eee5',fontSize:29},o.label),h('text',{y:node.y>.78?-96:140,textAnchor:'middle',fill:'#a7c2c3',fontSize:26},nodalRatioText(node)),
              modern?h('text',{x:55,y:-50,fill:'#eff2da',fontSize:19},node.excitation===0?'◉':node.pickup===0?'↗':'↗◉'):null,
              h('title',null,o.label+' · '+nodalRatioText(node)+' · '+(instrument.referenceHz*node.ratio).toFixed(2)+' Hz'));})),
          h('div',{className:'nd-material-labels'},h('span',null,'dark / absorptive'),h('span',null,'bright / transmissive')),
          contextNode?h('div',{ref:menu,className:'nd-node-menu',role:'menu','aria-label':'Node actions',style:{left:contextNode.x,top:contextNode.y},onKeyDown:e=>{
            const buttons=[...menu.current.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(document.activeElement);
            if(e.key==='Escape'){e.preventDefault();setContextNode(null);svg.current?.focus();}
            else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}
            else if(e.key==='Tab')setContextNode(null);
          }},
            h('div',{className:'nd-menu-title'},'NODE '+(instrument.nodes.findIndex(n=>n.id===contextNode.id)+1)),
            h('button',{role:'menuitem',onClick:()=>{setContextNode(null);inspector.current.querySelector('select')?.focus();}},'Edit in inspector'),
            h('button',{role:'menuitem',disabled:instrument.nodes.length>=7,onClick:()=>duplicateNode(contextNode.id)},'Duplicate node'),
            h('button',{role:'menuitem',onClick:()=>{const n=current.current.nodes.find(n=>n.id===contextNode.id);commit({...current.current,nodes:current.current.nodes.map(v=>v.id===n.id?{...v,muted:!v.muted}:v)});setContextNode(null);}},instrument.nodes.find(n=>n.id===contextNode.id)?.muted?'Activate node':'Mute node'),
            ...(modern?['Exciter','Listener','Both'].map(kind=>h('button',{key:kind,role:'menuitem',onClick:()=>{setNodeFunction(kind,contextNode.id);setContextNode(null);}},kind)):[]),
            h('button',{role:'menuitem',className:'nd-menu-remove',disabled:instrument.nodes.length===1,onClick:()=>removeNode(contextNode.id)},'Remove node')):null),
        h('div',{className:'nd-node-actions'},h('select',{'aria-label':'Add node',defaultValue:'',disabled:instrument.nodes.length>=7,onChange:e=>{if(e.target.value)addNode(e.target.value);e.target.value='';}},h('option',{value:'',disabled:true},'+ Node'),...Object.entries(__NodalOrgans).map(([r,o])=>h('option',{key:r,value:r},o.label))),
          h('button',{disabled:!history.current.canUndo,onClick:()=>applyHistory('undo')},'↶ Undo'),
          h('button',{disabled:!history.current.canRedo,onClick:()=>applyHistory('redo')},'↷ Redo'),
          ...(modern?instrument.previewRatios:['1/1','5/4','3/2','2/1']).map((text,index)=>h('button',{key:index,'aria-label':'Preview '+text,onClick:()=>{const a=text.split('/').map(Number),v=a.length===2?a[0]/a[1]:a[0];if(Number.isFinite(v)&&v>0)audition(v);}},'♪ '+text))),
        controls,libraryControls),
      h('div',{className:'nd-editor-panel'},
        h('div',{className:'nd-sound-tabs',role:'tablist','aria-label':'Sound design panels'},h('button',{role:'tab','aria-selected':soundTab==='material',onClick:()=>setSoundTab('material')},'Material & Body'),h('button',{role:'tab','aria-selected':soundTab==='envelope',onClick:()=>setSoundTab('envelope')},'Envelopes'),h('span',{className:'nd-engine-tag'},modern?'Open sound space':'Original sound')),
        soundTab==='material'?h('div',{className:'nd-material-panel'},modern?h(P.Fragment,null,
          h('div',{className:'nd-section-label'},'WAVE MATERIAL',h('span',null,'source → body → pickup')),
          h('div',{className:'nd-wave-bank'},...['sine','triangle','saw','hollow','pulse'].map(w=>h('button',{key:w,'aria-pressed':m.wave===w,onClick:()=>editMaterial({wave:w},true),title:w},h('svg',{viewBox:'0 0 50 22','aria-hidden':true},h('path',{d:w==='sine'?'M1 11C9 -3 16 -3 25 11S41 25 49 11':w==='triangle'?'M1 11L13 1 37 21 49 11':w==='saw'?'M1 20L24 2V20L48 2V20':w==='hollow'?'M1 18V4H25V18H49': 'M1 18V4H12V18H49',fill:'none',stroke:'currentColor',strokeWidth:2})),h('span',null,w[0].toUpperCase()+w.slice(1))))),
          h('div',{className:'nd-material-row'},range('Material richness',m.richness,0,1,.01,richness=>editMaterial({richness}),Math.round(m.richness*100)+'%'),range('Body · direct → resonant',m.body,0,1,.01,body=>editMaterial({body}),Math.round(m.body*100)+'%')),
          h(NodalModalMap,{material:m,onChange:editMaterial,onGestureStart:beginGesture,onGestureEnd:endGesture}),
          h('div',{className:'nd-material-row nd-time-controls'},range('Natural resonance',m.natural,0,1,.01,natural=>editMaterial({natural}),m.natural===0?'Gated':(m.natural*1.8).toFixed(2)+' s'),range('Spectral damping',m.damping,0,1,.01,damping=>editMaterial({damping}),m.damping<.5?'shimmering':'absorptive')),
          h('details',{className:'nd-fine-controls'},h('summary',null,'Body tuning · stereo · audition notes'),
            h('div',{className:'nd-material-row'},range('Body pitch follow',m.follow,0,1,.01,follow=>editMaterial({follow}),Math.round(m.follow*100)+'%'),range('Body register',m.register??0,-2,2,.01,register=>editMaterial({register}),((m.register??0)>=0?'+':'')+(m.register??0).toFixed(2)+' oct'),range('Pickup width',m.width,0,1,.01,width=>editMaterial({width}),Math.round(m.width*100)+'%')),
            h('div',{className:'nd-preview-ratios'},...instrument.previewRatios.map((v,index)=>h('label',{key:index},'Note '+(index+1),h('input',{value:v,'aria-label':'Audition ratio '+(index+1),onChange:e=>commit({...instrument,previewRatios:instrument.previewRatios.map((old,i)=>i===index?e.target.value:old)})})))),
            h('p',null,'Links: + → − → disconnected. Upper modes can hold their register; the played root keeps following the note.')))
          :h('div',{className:'nd-legacy-invitation'},h('p',null,'This instrument keeps its original synthesis. Open its material, modal structure and resonant lifetime as a new editable sound.'),h('button',{onClick:()=>{commit(__XenNodalModel.upgrade(instrument));setMessage('Open sound space enabled · Undo restores the original.');}},'Open sound space')),
          h(NodalAuditionSpectrum,{analyser})):
        h('div',{className:'nd-envelope-panel',onPointerDownCapture:e=>{if(e.button===0&&e.target.tagName==='CANVAS')beginGesture();},onPointerUp:endGesture,onPointerCancel:endGesture,onLostPointerCapture:endGesture},
          h('div',{className:'nd-curve-tabs'},h('div',null,h('span',null,'ENVELOPE'),h('small',null,'Carrier-controlled articulation')),h('div',{role:'tablist','aria-label':'Instrument envelope'},...['volume','pitch'].map(id=>h('button',{key:id,role:'tab','aria-selected':tab===id,onClick:()=>setTab(id)},id==='volume'?'Volume':'Pitch')))),
          h(G$,{fieldInput:instrument.articulation[envelopeKey],volumeScale:tab==='volume',historyController:{undo:()=>applyHistory('undo'),canUndo:history.current.canUndo},historyKey:'nodal-'+envelopeKey,fixedTarget:tab==='volume'?'dynamic-fade':'pitch-elastic',title:'',description:'',statusDescription:'',compact:true,onCommit:field=>{editArticulation({[envelopeKey]:field});setMessage(tab==='volume'?'Volume envelope updated':'Pitch envelope updated');}}),
          h('div',{className:'nd-contour-time'},h('span',null,'0 s'),h('div',{className:'nd-progress'},h('i',{style:{width:progress*100+'%'}})),h('span',null,instrument.articulation.durationSec.toFixed(1)+' s')),
          h('div',{className:'nd-articulation'},range('Attack',instrument.articulation.attackSec,.001,.4,.001,attackSec=>editArticulation({attackSec}),Math.round(instrument.articulation.attackSec*1000)+' ms'),range('Release',instrument.articulation.releaseSec,.01,1.5,.01,releaseSec=>editArticulation({releaseSec}),Math.round(instrument.articulation.releaseSec*1000)+' ms'))),
        h('details',{className:'nd-origin-presets'},h('summary',null,'Original presets & installation import'),h('div',{className:'nd-starters'},...['glass','ember','breath'].map(id=>h('button',{key:id,onClick:()=>{const next=nodalStarter(id);libraryIdentity.current=null;setLibraryChoice('');commit(next);setSelectedId(next.nodes[0].id);setMessage('Original '+id+' instrument loaded');}},id[0].toUpperCase()+id.slice(1))),h('button',{onClick:()=>{const next=source.current;libraryIdentity.current=null;setLibraryChoice('');commit(next);setSelectedId(next.nodes[0].id);const d=backend.status().diagnostics;setMessage(d.length?'Installation imported · '+d.map(x=>x.legacyModule+' → '+x.mappedRole).join(', '):'Installation captured as a static instrument');}},'Installation'))),
        )),
    h('footer',{className:'nd-footer'},h('div',{className:'nd-status',role:'status','aria-live':'polite'},h('i',{className:phase==='playing'?'is-playing':''}),h('span',null,message)),
      h('div',{className:'nd-export'},h('label',{className:'nd-name nd-save-name'},h('span',null,'INSTRUMENT NAME'),h('input',{value:instrument.name,'aria-label':'Instrument name',onChange:e=>commit({...instrument,name:e.target.value})})),h('button',{onClick:()=>save(false)},'Save Instrument'),h('button',{onClick:()=>save(true)},'Save as Variant'),editTarget?h('button',{onClick:backToMelodic},'Cancel · Back to Melodic Loop'):libraryEdit?h('button',{onClick:backToMelodic},'Back to Melodic Loop'):h('label',{className:'nd-reference-check'},h('input',{type:'checkbox',checked:withReference,onChange:e=>setWithReference(e.target.checked)}),'Add reference note'),libraryEdit?null:h('button',{className:'nd-send',onClick:send},editTarget?'Apply Changes':'Send to Melodic Loop'),!editTarget&&!libraryEdit?h('button',{disabled:!exported,onClick:backToMelodic},'Open Loop ↗'):null)));
}
// Room III is one workspace with three modes, not a floating Sound Design modal.
function NodalRoomHeader({mode, onModeChange, installationSoundEnabled = true, onToggleInstallationSound}) {
  const h = P.createElement;
  const labels = {
    sounddesign: ['Sound Design', 'Material · Resonance · Constellation'],
    installation: ['Installation', 'Resident nodes · Ball · Sound field']
  };
  const current = labels[mode] || labels.installation;
  return h('header', {className: 'nd-heading nd-shared-heading'},
    h('div', {className: 'nd-heading-copy'},
      h('div', {className: 'nd-eyebrow'}, 'ROOM III / NODAL INSTALLATION'),
      h('h2', null, current[0]), h('p', null, current[1])),
    h('nav', {className: 'nd-modes', 'aria-label': 'Nodal modes'},
      ...[['sounddesign', 'Sound Design'], ['installation', 'Installation']]
        .map(([id, label]) => h('button', {
          key: id, type: 'button', className: mode === id ? 'is-active' : '',
          'aria-pressed': mode === id, onClick: () => { if (mode !== id) onModeChange(id); }
        }, label)),
      mode === 'installation' && h('button', {
        key: 'installation-sound', type: 'button',
        className: 'nd-sound-toggle ' + (installationSoundEnabled ? 'is-sounding' : 'is-muted'),
        'data-installation-sound-toggle': true,
        'aria-label': installationSoundEnabled ? 'Installation · mute sound' : 'Installation · unmute sound',
        'aria-pressed': installationSoundEnabled,
        title: 'Mute only the Installation. The Oscillator Ball, nodes, and Sonar Waves remain visible.',
        onClick: onToggleInstallationSound
      }, installationSoundEnabled ? '◖)) Installation · sound on' : '◖× Installation · sound off')));
}
function koe(props) {
  // A project saved with the historic Enhancer view opens its living installation instead.
  P.useEffect(() => { if (props.mode === 'enhancer') props.onModeChange('installation'); }, [props.mode, props.onModeChange]);
  const activeMode = props.mode === 'enhancer' ? 'installation' : props.mode;
  return P.createElement('section', {className: 'nd-room nd-room-shell', 'data-nodal-mode': activeMode},
    P.createElement(NodalRoomHeader, {mode: activeMode, onModeChange: props.onModeChange,
      installationSoundEnabled: props.installationSoundEnabled, onToggleInstallationSound: props.onToggleInstallationSound}),
    activeMode === 'sounddesign'
      ? P.createElement(NodalSoundDesigner, props)
      : P.createElement('div', {className: 'nd-legacy-body nd-legacy-' + activeMode}, P.createElement(koeLegacy, {...props, mode: activeMode})));
}
