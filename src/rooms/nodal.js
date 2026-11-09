(()=>{"use strict";
function nodalUpdateMelodicInstrument(instrument, target) {
  if (!target || !target.noteId || !target.trackId || !target.sourcePreset) throw new Error('No Melodic note block selected for updating.');
  const state = EQ();
  if (!state?.loopComposer) throw new Error('Melodic session is unavailable.');
  const composer = $n(state.loopComposer);
  const track = composer.tracks.find(t => t.id === target.trackId);
  const note = composer.notes.find(n => n.id === target.noteId && n.trackId === target.trackId);
  if (!track || !note || yW(track, note) !== target.sourcePreset) throw new Error('The original note block has changed. Reopen it from Melodic Loop.');
  const prior = nodalFindInstrument(target.sourcePreset, composer);
  if (!prior) throw new Error('The original Nodal instrument is no longer available.');
  // Persist the edited recipe as an immutable source revision, never as PCM.
  const normalized = __XenNodalModel.normalize(instrument);
  const entry = __XenNodalLibrary.save(normalized);
  const preset = 'nodal:' + entry.id + '@' + entry.revision;
  composer.nodalInstruments = {...composer.nodalInstruments, [preset]: entry.instrument};
  for (const lane of composer.tracks) {
    if (lane.instrumentPreset === target.sourcePreset) {
      lane.instrumentPreset = preset;
      if (lane.label === prior.name) lane.label = entry.instrument.name;
    }
  }
  for (const block of composer.notes) if (block.instrumentPresetOverride === target.sourcePreset) block.instrumentPresetOverride = preset;
  // Keep only snapshots still referenced by any track or note. Otherwise repeated
  // revisions of the same sound would eventually exhaust the embedded source cap.
  const usedPresets = new Set(composer.tracks.map(lane => lane.instrumentPreset));
  for (const block of composer.notes) if (block.instrumentPresetOverride) usedPresets.add(block.instrumentPresetOverride);
  for (const key of Object.keys(composer.nodalInstruments)) if (!usedPresets.has(key)) delete composer.nodalInstruments[key];
  // Keep the original note focused. Never add a reference note or another lane.
  composer.selectedTrackId = target.trackId; composer.selectedNoteId = target.noteId;
  OLe({...state, loopComposer: composer, activeWorkspace: 'microtonal-logic', logicView: 'melodic', status: 'Instrument updated: ' + entry.instrument.name});
  window.dispatchEvent(new CustomEvent('xensonar:nodal-melodic-changed', {detail: composer}));
  return {updated: true, entry, preset, trackId: target.trackId, noteId: target.noteId};
}
function nodalSendToMelodic(instrument, withReference = true) {
  const entry = __XenNodalLibrary.save(instrument), preset = 'nodal:' + entry.id + '@' + entry.revision;
  const state = EQ() ?? Oqe({initialSession: null, externalLogicView: 'melodic'}), composer = $n(state.loopComposer), trackId = 'nodal-track-' + Date.now().toString(36) + '-' + (++__NodalTransferSequence).toString(36);
  composer.nodalInstruments = {...composer.nodalInstruments, [preset]: entry.instrument};
  const track = uR({id: trackId, label: entry.instrument.name, color: '#72ddd0', volume: .85, instrumentRole: 'texture', instrumentPreset: preset, patternPresetId: null, pan: 0, enabled: true}, composer.tracks.length);
  composer.tracks.push(track); composer.selectedTrackId = trackId; composer.activeTrackIds = Array.from(new Set([...composer.activeTrackIds, trackId]));
  if (withReference) {
    const index = composer.pitchSteps.findIndex(step => Math.abs((step.ratio ?? 0) - 1) < 1e-8), channelIndex = Math.max(0, index);
    const stepSec = lD({composer, bpm: state.materialExport.bpm}) / iD(composer);
    const note = pr(composer, {id: trackId + '-note', trackId, channelIndex, lineId: composer.pitchLines[channelIndex]?.id,
      startUnit: 0, durationUnits: Math.max(1, Math.min(iD(composer), entry.instrument.articulation.durationSec / stepSec)), velocity: .8, fadeInUnits: 0, fadeOutUnits: 0});
    composer.notes.push(note); composer.selectedNoteId = note.id;
  }
  OLe({...state, loopComposer: composer, activeWorkspace: 'microtonal-logic', logicView: 'melodic', status: entry.instrument.name + ' · Nodal instrument in Melodic Loop'});
  window.dispatchEvent(new CustomEvent('xensonar:nodal-melodic-changed', {detail: composer}));
  return {entry, preset, trackId};
}
function nodalRatioText(node) {
  if(node.ratioText){const a=node.ratioText.split('/').map(Number),v=a.length===2?a[0]/a[1]:a[0];if(Math.abs(v-node.ratio)<1e-10)return node.ratioText;}
  for(let d=1;d<=32;d++){const n=Math.round(node.ratio*d);if(Math.abs(n/d-node.ratio)<1e-10)return n+'/'+d;}
  return Number(node.ratio.toPrecision(7)).toString();
}
function nodalOpenStarter(id='prism') {
  if(id==='troodle') return __XenNodalModel.normalize(window.__XenNodalBuiltinTroodle);
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
  function save() {
    try {
      const identity = libraryIdentity.current;
      // A changed name creates an independent saved instrument. Only explicit
      // edits under the same name update the existing revision.
      const sameName = identity && String(identity.instrument.name).trim() === String(instrument.name).trim();
      const options = sameName ? {id: identity.id, expectedRevision: identity.revision} : {};
      const entry = __XenNodalLibrary.save(instrument, options);
      libraryIdentity.current = entry; setLibraryChoice(entry.id); setSaved(__XenNodalLibrary.list());
      setMessage((identity && !sameName ? 'Saved as new instrument · ' : 'Saved · ') + entry.instrument.name + ' · Revision ' + entry.revision);
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
    h('div',{className:'nd-preset-bank'},...__NodalOpenPresets.map(p=>h('button',{key:p.id,onClick:()=>loadPreset(p.id),title:p.hint,'aria-pressed':instrument.name===(p.id==='troodle'?'troodle':p.name+' Network')},h('i',{className:'nd-preset-glyph nd-glyph-'+p.id}),h('span',null,p.name),h('small',null,p.hint.split(' · ')[0])))),
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
      h('div',{className:'nd-export'},h('label',{className:'nd-name nd-save-name'},h('span',null,'INSTRUMENT NAME'),h('input',{value:instrument.name,'aria-label':'Instrument name',onChange:e=>commit({...instrument,name:e.target.value})})),h('button',{onClick:()=>save()},'Save Instrument'),editTarget?h('button',{onClick:backToMelodic},'Cancel · Back to Melodic Loop'):libraryEdit?h('button',{onClick:backToMelodic},'Back to Melodic Loop'):h('label',{className:'nd-reference-check'},h('input',{type:'checkbox',checked:withReference,onChange:e=>setWithReference(e.target.checked)}),'Add reference note'),libraryEdit?null:h('button',{className:'nd-send',onClick:send},editTarget?'Apply Changes':'Send to Melodic Loop'),!editTarget&&!libraryEdit?h('button',{disabled:!exported,onClick:backToMelodic},'Open Loop ↗'):null)));
}
function NodalRoomHeader({mode, onModeChange, installationSoundEnabled = false, onToggleInstallationSound}) {
  const h = P.createElement;
  const labels = {
    sounddesign: ['Sound Design', 'Material · Resonance · Constellation'],
    installation: ['Art Installation', 'Resident nodes · Ball · Sound field']
  };
  const current = labels[mode] || labels.installation;
  return h('header', {className: 'nd-heading nd-shared-heading'},
    h('div', {className: 'nd-heading-copy'},
      h('div', {className: 'nd-eyebrow'}, 'ROOM III / NODAL CENTER'),
      h('h2', null, current[0]), h('p', null, current[1])),
    h('nav', {className: 'nd-modes', 'aria-label': 'Nodal modes'},
      ...[['sounddesign', 'Sound Design'], ['installation', 'Art Installation']]
        .map(([id, label]) => h('button', {
          key: id, type: 'button', className: mode === id ? 'is-active' : '',
          'aria-pressed': mode === id, onClick: () => { if (mode !== id) onModeChange(id); }
        }, label)),
      ...(mode === 'installation' ? [h('button', {
        key: 'installation-sound', type: 'button',
        className: 'nd-sound-toggle ' + (installationSoundEnabled ? 'is-sounding' : 'is-muted'),
        'data-installation-sound-toggle': true,
        'aria-label': installationSoundEnabled ? 'Mycelium · switch off and release audio' : 'Mycelium · switch on and build audio',
        'aria-pressed': installationSoundEnabled,
        title: 'Mycelium power is OFF by default. ON adds Residents to the Main Room; OFF releases its private audio graph.',
        onClick: onToggleInstallationSound
      }, installationSoundEnabled ? '◖)) Mycelium · ON' : '◖× Mycelium · OFF')] : [])));
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
   label('Ball · Y pitch '+Math.round((mix.ballToneLevel??1)*100)+' %',h('input',{type:'range',min:0,max:1,step:.01,value:mix.ballToneLevel??1,'aria-label':'Ball Y tone volume',title:'Mute the ball’s continuous self-tone and reaction without changing node resonances or the Root Reference.',onChange:event=>onMix('ballToneLevel',Number(event.currentTarget.value))})),
   label('Trigger',h('select',{'aria-label':'Ball tone trigger mode',value:mode,onChange:event=>onMix('ballToneMode',event.currentTarget.value)},h('option',{value:'continuous'},'Kontinuierlich'),h('option',{value:'grid'},'Cross grid lines'))),
   mode==='grid'&&params&&label('Main Room grid',h('select',{'aria-label':'Installation grid tuning',value:params.gridTuning,onChange:event=>__NodalBallGrid.changeTuning(event.currentTarget.value)},...rack.libraryOptions.map(item=>h('option',{key:item.value,value:item.value},item.label)))),
   mode==='grid'&&params&&label('Modus',h('select',{'aria-label':'Installation grid mode',value:params.gridMode,onChange:event=>__NodalBallGrid.changeMode(event.currentTarget.value)},h('option',{value:'chromatic'},'All steps'),...Ka(params.gridTuning).filter(item=>item.value!=='chromatic').map(item=>h('option',{key:item.value,value:item.value},item.label)))),
   mode==='grid'&&params&&label('Rasterbasis · Hz',h('input',{'aria-label':'Installation grid base Hz',type:'number',min:400,max:1760,step:.1,value:base,onChange:event=>setBase(event.currentTarget.value),onBlur:commitBase,onKeyDown:event=>{if(event.key==='Enter')event.currentTarget.blur()},style:{width:100}})),
   mode==='grid'&&params&&label('Shift grid · cents',h('input',{type:'range',min:-500,max:500,step:1,value:__xenGridShiftCents(params.gridTuning,params.manualGridStepOffsets),'aria-label':'Installation grid shift cents',onChange:event=>__NodalBallGrid.shift(Number(event.currentTarget.value))})),
   mode==='grid'&&h('button',{type:'button',onClick:()=>setOpen(true),style:{border:'1px solid #44747d',padding:'5px 9px',borderRadius:4}},'Edit grid / step count')),
  h('p',{style:{fontSize:10,color:'#819fa4',marginTop:5}},mode==='grid'?__xenGridMuted(params)?'The shared grid is muted. Unmute it in the Main Room to hear lines and impulses.':'Shared presets, step count, offsets, and muted steps from the Main Room. Changes apply there as well.':'Ball self-tone and reaction; at 0, node resonances remain. Root Reference can be adjusted separately.'),
  h(U6,{open,currentTuning:params?.gridTuning??'12edo',activeRack:rack.activeGridRack,onClose:()=>setOpen(false),onRackChange:rack.setStoredActiveGridRack,onActivateTuning:__NodalBallGrid.changeTuning,onResetRack:rack.resetStoredActiveGridRack}));
}
function I6({myzelCentralColorMixer:e,onMyzelCentralColorMixerChange:t,nodalDeviceMatrix:n,onNodalDeviceEnabledChange:r,onNodalDeviceAmountChange:a,onNodalDeviceTargetChange:o,compact:i=!1}){const[s,l]=P.useState(toe),c=b2.find(f=>f.value===s)??b2[0],d=ZP.filter(f=>f.active),p=ZP.filter(f=>!f.active);return u.jsxs("div",{className:"mt-4 space-y-4","data-xensonar-room3-synth-controls":"modular",children:[u.jsxs("div",{className:"rounded border border-neutral-800 bg-neutral-950/40 p-2",children:[u.jsxs("div",{className:"mb-2 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] text-neutral-500",children:[u.jsx("span",{children:"Room III Focus"}),u.jsx("span",{className:"text-neutral-600",children:c.hint})]}),u.jsx("div",{className:"grid gap-2 sm:grid-cols-4",children:b2.map(f=>u.jsx("button",{type:"button",onClick:()=>l(f.value),className:`rounded border px-3 py-2 text-xs font-semibold tracking-[0.08em] transition-colors ${s===f.value?"border-cyan-400/70 bg-cyan-950/30 text-cyan-100":"border-neutral-700 text-neutral-300 hover:bg-neutral-900"}`,children:f.label},f.value))})]}),u.jsxs("div",{className:"rounded border border-violet-900/60 bg-violet-950/10 p-3","data-xensonar-room3-synth-section":"central-color-voice",children:[u.jsxs("div",{className:"mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-violet-900/40 pb-2",children:[u.jsxs("div",{children:[u.jsx("div",{className:"text-[10px] uppercase tracking-[0.24em] text-violet-300/80",children:"Mycelium Color Voice"}),u.jsx("div",{className:"mt-1 text-[11px] leading-relaxed text-neutral-500",children:"modular Room III synth mixer, not the App.tsx AudioGraph"})]}),u.jsx("button",{type:"button",onClick:()=>t("enabled",!e.enabled),className:`px-2.5 py-1 text-[10px] uppercase tracking-widest border transition-colors ${e.enabled?"border-violet-400/70 text-violet-100 bg-violet-950/30 hover:bg-violet-900/40":"border-neutral-700 text-neutral-300 hover:bg-neutral-900"}`,children:e.enabled?"An":"Aus"})]}),u.jsx("div",{className:"grid gap-4 md:grid-cols-4 xl:grid-cols-7",children:noe.map(f=>{const b=Number(e[f.field]??0);return u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:[f.label," ",(b*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:String(f.max??1),step:"0.01",value:b,onChange:g=>t(f.field,parseFloat(g.target.value)),className:"w-full cursor-pointer",disabled:!e.enabled&&f.field!=="volume"})]},f.field)})})]}),u.jsxs("div",{className:"rounded border border-cyan-900/55 bg-cyan-950/10 p-3","data-xensonar-room3-synth-section":"nodal-device-matrix",children:[u.jsx("div",{className:"mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-900/40 pb-2",children:u.jsxs("div",{children:[u.jsx("div",{className:"text-[10px] uppercase tracking-[0.24em] text-cyan-300/80",children:"Room III Field Devices"}),u.jsx("div",{className:"mt-1 text-[11px] text-neutral-500",children:"Targets instead of a mastering boundary"})]})}),u.jsx("div",{className:"grid gap-3 xl:grid-cols-2",children:Wx.map(f=>{const b=n[f.id];return u.jsxs("div",{className:"rounded border border-neutral-800 bg-neutral-950/45 p-3",children:[u.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-2",children:[u.jsxs("div",{children:[u.jsx("div",{className:"text-xs font-semibold text-cyan-100",children:f.label}),u.jsx("div",{className:"mt-1 text-[11px] leading-relaxed text-neutral-500",children:f.role})]}),u.jsx("button",{type:"button",onClick:()=>r(f.id,!b.enabled),className:`rounded border px-2 py-1 text-[10px] uppercase tracking-widest transition-colors ${b.enabled?"border-cyan-400/60 bg-cyan-950/30 text-cyan-100":"border-neutral-700 text-neutral-400 hover:bg-neutral-900"}`,children:b.enabled?"An":"Aus"})]}),u.jsxs("label",{className:"mt-3 block text-[11px] text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Strength ",(b.amount*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:b.amount,onChange:g=>a(f.id,parseFloat(g.target.value)),className:"w-full cursor-pointer",disabled:!b.enabled})]}),u.jsx("div",{className:"mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3",children:d.map(g=>u.jsxs("label",{className:"block text-[10px] text-neutral-400",children:[u.jsxs("span",{className:"mb-1 flex items-center justify-between gap-2 text-neutral-500",children:[u.jsx("span",{children:g.shortLabel}),u.jsxs("span",{children:[((b.targets[g.id]??0)*100).toFixed(0),"%"]})]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:b.targets[g.id]??0,onChange:y=>o(f.id,g.id,parseFloat(y.target.value)),className:"w-full cursor-pointer",disabled:!b.enabled})]},g.id))}),u.jsx("div",{className:"mt-3 flex flex-wrap gap-2 text-[10px] text-neutral-500",children:p.map(g=>u.jsxs("span",{className:"rounded border border-neutral-800 px-2 py-1",children:[g.shortLabel," prepared ",Math.round((b.targets[g.id]??0)*100),"%"]},g.id))})]},f.id)})})]}),u.jsxs("div",{className:"rounded border border-fuchsia-900/55 bg-fuchsia-950/10 p-3","data-xensonar-room3-synth-section":"nodal-modulation-matrix",children:[u.jsxs("div",{className:"mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-fuchsia-900/40 pb-2",children:[u.jsx("div",{className:"text-[10px] uppercase tracking-[0.24em] text-fuchsia-300/80",children:"Nodal Modulation Matrix"}),u.jsx("div",{className:"text-[11px] text-neutral-500",children:"safe default routes"})]}),u.jsx("div",{className:"grid gap-2 md:grid-cols-2",children:R0.map(f=>u.jsxs("div",{className:"rounded border border-neutral-800 bg-neutral-950/45 px-3 py-2",children:[u.jsxs("div",{className:"flex items-center justify-between gap-2",children:[u.jsx("div",{className:"text-[11px] font-semibold text-fuchsia-100",children:f.label}),u.jsxs("div",{className:"text-[10px] text-neutral-500",children:[Math.round(f.amount*100),"%"]})]}),u.jsxs("div",{className:"mt-1 text-[10px] leading-relaxed text-neutral-500",children:[Kae[f.source]," → ",$ae[f.target]," · ",f.curve," · ",f.smoothingMs,"ms"]})]},f.id))})]})]})}
function roe(e){const{postFxGroup:t,onPostFxGroupChange:n,postFxEnabled:r,onTogglePostFxEnabled:a,followForgeHandoff:o,onFollowForgeHandoffChange:i,postFxDepth:s,onPostFxDepthChange:l,postFxParallel:c,onPostFxParallelChange:d,activeGroupSummary:p,activeGroupReceivesFrom:f,activeGroupKeepsStableBy:b,handoffSummary:g,handoffBalanceCarrier:y,myzelPattern:x,onMyzelPatternChange:A,myzelBallMode:M,onMyzelBallModeChange:v,myzelNodeMode:w,onMyzelNodeModeChange:R,myzelStep16ths:k,onMyzelStep16thsChange:I,myzelDriveEnabled:E,onToggleMyzelDriveEnabled:F,room3BodyEnabled:L,onToggleRoom3BodyEnabled:B,onResetEnhancerMix:O,myzelInterpreterMix:T,onMyzelInterpreterMixChange:_,room3BodyControls:G,onRoom3BodyControlsChange:j,room3MaterialLabel:N,myzelCentralColorMixer:W,onMyzelCentralColorMixerChange:V,nodalDeviceMatrix:U,onNodalDeviceEnabledChange:H,onNodalDeviceAmountChange:q,onNodalDeviceTargetChange:K}=e;return u.jsxs("div",{className:"mt-6 space-y-5",children:[u.jsx("div",{className:"grid gap-3 md:grid-cols-5",children:H0.map(Y=>u.jsxs("button",{type:"button",onClick:()=>n(Y.id),className:`rounded border px-3 py-2 text-left text-xs transition-colors ${t===Y.id?"border-fuchsia-500 bg-fuchsia-950/30 text-fuchsia-100":"border-neutral-800 bg-neutral-950/40 text-neutral-300 hover:bg-neutral-900"}`,children:[u.jsx("div",{className:"uppercase tracking-[0.2em] text-[10px] text-fuchsia-300/80",children:Y.label}),u.jsx("div",{className:"mt-1 leading-relaxed text-neutral-400",children:Y.summary})]},Y.id))}),u.jsxs("div",{className:"grid gap-4 md:grid-cols-2 xl:grid-cols-5",children:[u.jsxs("div",{className:"rounded border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-[11px] text-neutral-400",children:[u.jsx("div",{className:"uppercase tracking-[0.2em] text-neutral-500",children:"Scoped Post-FX"}),u.jsx("button",{type:"button",onClick:a,className:`mt-2 w-full rounded border px-3 py-2 text-left text-xs transition-colors ${r?"border-fuchsia-500 bg-fuchsia-950/30 text-fuchsia-100":"border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:bg-neutral-900"}`,children:r?"Post-FX active":"Post-FX bypass"}),u.jsx("div",{className:"mt-2 leading-relaxed",children:p})]}),u.jsxs("div",{className:"rounded border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-[11px] text-neutral-400",children:[u.jsx("div",{className:"uppercase tracking-[0.2em] text-neutral-500",children:"Forge-Handoff"}),u.jsxs("label",{className:"mt-2 flex items-center gap-2 text-xs text-neutral-300",children:[u.jsx("input",{type:"checkbox",checked:o,onChange:Y=>i(Y.target.checked)}),"Mycelium follows the preferred Forge group"]}),u.jsx("div",{className:"mt-2 leading-relaxed",children:g}),y?u.jsxs("div",{className:"mt-2 text-neutral-500",children:["Balance Carrier:",y]}):null]}),u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Focus Depth",(s*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:s,onChange:Y=>l(parseFloat(Y.target.value)),className:"w-full cursor-pointer"})]}),u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Parallel ",(c*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:c,onChange:Y=>d(parseFloat(Y.target.value)),className:"w-full cursor-pointer"})]}),u.jsxs("div",{className:"rounded border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-[11px] text-neutral-400",children:[u.jsx("div",{className:"uppercase tracking-[0.2em] text-neutral-500",children:"Active Route"}),u.jsxs("div",{className:"mt-2 leading-relaxed",children:["receives:",f]}),u.jsxs("div",{className:"mt-2 leading-relaxed text-neutral-500",children:["stabilized by:",b]})]})]}),u.jsxs("div",{className:"grid gap-4 md:grid-cols-4",children:[u.jsxs("div",{children:[u.jsx("label",{className:"mb-1 block text-xs text-neutral-500",children:"Mycelium Rhythm"}),u.jsx("select",{value:x,onChange:Y=>A(Y.target.value),className:"w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300",children:aj.map(Y=>u.jsx("option",{value:Y.value,children:Y.label},Y.value))})]}),u.jsxs("div",{children:[u.jsx("label",{className:"mb-1 block text-xs text-neutral-500",children:"Ball Interpretation"}),u.jsx("select",{value:M,onChange:Y=>v(Y.target.value),className:"w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300",children:oj.map(Y=>u.jsx("option",{value:Y.value,children:Y.label},Y.value))})]}),u.jsxs("div",{children:[u.jsx("label",{className:"mb-1 block text-xs text-neutral-500",children:"Node Interpretation"}),u.jsx("select",{value:w,onChange:Y=>R(Y.target.value),className:"w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300",children:ij.map(Y=>u.jsx("option",{value:Y.value,children:Y.label},Y.value))})]}),u.jsxs("div",{children:[u.jsx("label",{className:"mb-1 block text-xs text-neutral-500",children:"Mycelium Beat (16th)"}),u.jsx("select",{value:String(k),onChange:Y=>I(parseInt(Y.target.value,10)),className:"w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300",children:Array.from({length:9},(Y,J)=>J+1).map(Y=>u.jsx("option",{value:Y,children:Y},Y))})]})]}),u.jsxs("div",{className:"rounded border border-neutral-800 bg-neutral-950/70 p-4",children:[u.jsxs("div",{className:"mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-2",children:[u.jsx("div",{className:"text-[10px] uppercase tracking-[0.24em] text-neutral-500",children:"Enhancer Parameters"}),u.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[u.jsxs("button",{type:"button",onClick:F,className:`px-2.5 py-1 text-[10px] uppercase tracking-widest border transition-colors ${E?"border-rose-400/70 text-rose-100 bg-rose-950/30 hover:bg-rose-900/40":"border-neutral-700 text-neutral-300 hover:bg-neutral-900"}`,children:["Mycelium Drive ",E?"An":"Aus"]}),u.jsxs("button",{type:"button",onClick:B,className:`px-2.5 py-1 text-[10px] uppercase tracking-widest border transition-colors ${L?"border-cyan-400/70 text-cyan-100 bg-cyan-950/30 hover:bg-cyan-900/40":"border-neutral-700 text-neutral-300 hover:bg-neutral-900"}`,children:["Body ",L?"An":"Aus"]}),u.jsx("button",{type:"button",onClick:O,className:"px-2.5 py-1 text-[10px] uppercase tracking-widest border border-neutral-700 text-neutral-300 hover:bg-neutral-900",children:"Reset Mix"})]})]}),u.jsxs("div",{className:"grid gap-4 md:grid-cols-5",children:[u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Hybrid ↔ Woven ",(T.hybridBlend*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:T.hybridBlend,onChange:Y=>_("hybridBlend",parseFloat(Y.target.value)),className:"w-full cursor-pointer"})]}),u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Woven Pull ",(T.weaveBlend*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:T.weaveBlend,onChange:Y=>_("weaveBlend",parseFloat(Y.target.value)),className:"w-full cursor-pointer"})]}),u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Constellation Directness",(T.constellationBlend*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:T.constellationBlend,onChange:Y=>_("constellationBlend",parseFloat(Y.target.value)),className:"w-full cursor-pointer"})]}),u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Mycelium Drive ",(T.driveAmount*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:T.driveAmount,onChange:Y=>_("driveAmount",parseFloat(Y.target.value)),className:"w-full cursor-pointer",disabled:!E})]}),u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Drive Response",(T.driveResponse*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:T.driveResponse,onChange:Y=>_("driveResponse",parseFloat(Y.target.value)),className:"w-full cursor-pointer"})]})]}),u.jsxs("div",{className:"mt-4 grid gap-4 md:grid-cols-5",children:[u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Body Coupling",(G.coupling*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:G.coupling,onChange:Y=>j("coupling",parseFloat(Y.target.value)),className:"w-full cursor-pointer"})]}),u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Material Axis ",(G.material*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:G.material,onChange:Y=>j("material",parseFloat(Y.target.value)),className:"w-full cursor-pointer"})]}),u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Air / Noise",(G.air*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:G.air,onChange:Y=>j("air",parseFloat(Y.target.value)),className:"w-full cursor-pointer"})]}),u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Roughness ",(G.roughness*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:G.roughness,onChange:Y=>j("roughness",parseFloat(Y.target.value)),className:"w-full cursor-pointer"})]}),u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Resonance Focus ",(G.resonance*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:G.resonance,onChange:Y=>j("resonance",parseFloat(Y.target.value)),className:"w-full cursor-pointer"})]})]}),u.jsxs("div",{className:"mt-3 text-[11px] leading-relaxed text-neutral-500",children:["Current Material Family:",u.jsx("span",{className:"text-cyan-200",children:N})]})]}),u.jsx(I6,{myzelCentralColorMixer:W,onMyzelCentralColorMixerChange:V,nodalDeviceMatrix:U,onNodalDeviceEnabledChange:H,onNodalDeviceAmountChange:q,onNodalDeviceTargetChange:K})]})}
function uoe(e){return e?"all_off":"normal"}
function Aoe(e){const{installationFieldConfig:t,particleSoundsMuted:n,onToggleInstallNomadAttractor:r,onToggleInstallResidents:a,onSetInstallResidentVolume:o,onSetInstallResidentSystem:i,onSetInstallResidentMode:s,onToggleInstallResidentWaveExcitation:l,onToggleInstallResidentBallCoupling:c,onSetParticleSoundMode:d,onSetInstallationResidentSound:p,onSetInstallationResidentElasticPitch:f,customResidentSoundPreset:b,customResidentElasticPitch:g,onSetCustomResidentSound:y,onSetCustomResidentElasticPitch:x,onPreviewPendingCustomResident:A,selectedResidentLabel:M,selectedResidentFrequencyHz:v,residentRootHz:w,residentAddFrequencyHz:R,onResidentAddFrequencySliderChange:k,onAddResident:I,residentConstellationName:E,onResidentConstellationNameChange:F,savedResidentConstellations:L,onSaveResidentConstellation:B,onLoadResidentConstellation:O,onDeleteResidentConstellation:T,onOpenClassicField:_,onOpenRefactorField:G,installationMix:j,onInstallationMixChange:N,tParams:W,onTParamChange:V,myzelCentralColorMixer:U,onMyzelCentralColorMixerChange:H,nodalDeviceMatrix:q,onNodalDeviceEnabledChange:K,onNodalDeviceAmountChange:Y,onNodalDeviceTargetChange:J,residentSoundMenuGroups:Z,residentWorkbenchSendConfirmed:te,onMarkResidentWorkbenchSent:X}=e,Q=uoe(n),ne=rI(R);return u.jsxs(u.Fragment,{children:[u.jsxs("div",{className:"mt-4 rounded border border-amber-900/40 bg-amber-950/10 p-4 text-sm text-neutral-300",children:[u.jsx("div",{className:"text-[10px] uppercase tracking-[0.24em] text-amber-300",children:"Art Installation · Field Access"}),u.jsx("div",{className:"mt-2 text-neutral-400",children:loe}),u.jsxs("div",{className:"mt-4 grid gap-3 md:grid-cols-2",children:[u.jsx("button",{type:"button",onClick:_,className:"rounded border border-violet-700/60 bg-violet-950/20 px-4 py-3 text-sm font-semibold text-violet-100 hover:bg-violet-900/40",children:"Xensonar Classic"}),u.jsx("button",{type:"button",onClick:G,className:"rounded border border-cyan-700/60 bg-cyan-950/20 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-900/40",children:aoe})]}),u.jsxs("div",{className:"mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3",children:[u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Resident Volume",(t.residentVolume*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:t.residentVolume,onChange:ee=>o(parseFloat(ee.target.value)),className:"w-full cursor-pointer"})]}),u.jsxs("div",{children:[u.jsx("label",{className:"mb-1 block text-xs text-neutral-500",children:"Resident System"}),u.jsx("select",{value:t.residentSystem,onChange:ee=>i(ee.target.value),className:"w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-200",children:j0.map(ee=>u.jsx("option",{value:ee.value,children:ee.label},ee.value))})]}),u.jsxs("div",{children:[u.jsx("label",{className:"mb-1 block text-xs text-neutral-500",children:"Resident Mode"}),u.jsx("select",{value:t.residentMode,onChange:ee=>s(ee.target.value),className:"w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-200",children:Ka(t.residentSystem).map(ee=>u.jsx("option",{value:ee.value,children:ee.label},ee.value))})]})]}),u.jsx("div",{className:"mt-4 flex flex-wrap gap-3",children:u.jsxs("label",{className:"flex items-center gap-2 rounded border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300",children:[u.jsx("input",{type:"checkbox",checked:t.residentsEnabled,onChange:a}),"Residents on / off"]})}),u.jsx("div",{className:"mt-4 text-[10px] uppercase tracking-[0.22em] text-neutral-500",children:"Nomad Attractors"}),u.jsxs("div",{className:"mt-2 flex flex-wrap gap-3",children:[u.jsxs("label",{className:"flex items-center gap-2 rounded border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300",children:[u.jsx("input",{type:"checkbox",checked:t.nomadAttractors.cursor,onChange:()=>r("cursor")}),"Cursor"]}),u.jsxs("label",{className:"flex items-center gap-2 rounded border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300",children:[u.jsx("input",{type:"checkbox",checked:t.nomadAttractors.oscillatorBall,onChange:()=>r("oscillatorBall")}),"Oscillator Ball"]})]}),u.jsx("div",{className:"mt-4 text-[10px] uppercase tracking-[0.22em] text-neutral-500",children:"Resident Reactions"}),u.jsx("div",{className:"mt-2 flex flex-wrap gap-3",children:u.jsxs("label",{className:"flex items-center gap-2 rounded border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300",children:[u.jsx("input",{type:"checkbox",checked:t.residentWaveExcitation.sonarWaves,onChange:()=>l("sonarWaves")}),"Sonar Waves"]})}),u.jsx("div",{className:"mt-4 text-[10px] uppercase tracking-[0.22em] text-neutral-500",children:"Resident Coupling"}),u.jsx("div",{className:"mt-2 flex flex-wrap gap-3",children:u.jsxs("label",{className:"flex items-center gap-2 rounded border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300",children:[u.jsx("input",{type:"checkbox",checked:t.residentBallCoupling.oscillatorBall,onChange:()=>c("oscillatorBall")}),"Oscillator Ball"]})}),u.jsx("div",{className:"mt-4 text-[10px] uppercase tracking-[0.22em] text-neutral-500",children:"Particle Mode"}),u.jsx("div",{className:"mt-2 flex flex-wrap gap-3",children:u.jsxs("label",{className:"flex items-center gap-2 rounded border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300",children:[u.jsx("span",{className:"text-neutral-400",children:"Particles"}),u.jsxs("select",{value:Q,onChange:ee=>d(ee.target.value),className:"rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-200",children:[u.jsx("option",{value:"normal",children:"Normal"}),u.jsx("option",{value:"all_off",children:"All Off"})]})]})}),u.jsx("div",{className:"mt-4 text-[10px] uppercase tracking-[0.22em] text-neutral-500",children:"Resident System Sound"}),u.jsxs("div",{className:"mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end",children:[u.jsxs("label",{className:"flex items-center gap-2 rounded border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300",children:[u.jsx("span",{className:"text-neutral-400",children:"System-Residents"}),u.jsx("select",{value:t.residentSound,onChange:ee=>p(ee.target.value),className:"rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-200",children:Z.map(ee=>u.jsx("optgroup",{label:ee.label,children:ee.options.map(ie=>u.jsx("option",{value:ie.value,children:ie.label},ie.value))},ee.id))})]}),u.jsxs("label",{className:"flex items-center gap-2 rounded border border-cyan-900/35 bg-cyan-950/10 px-3 py-2 text-xs text-cyan-100",children:[u.jsx("input",{type:"checkbox",checked:!!t.residentElasticPitch,onChange:ee=>f(ee.target.checked),disabled:!String(t.residentSound).startsWith("sample:")}),"Pitch Stable / Tempo Free"]})]}),u.jsx("div",{className:"mt-2 text-[11px] text-neutral-500",children:"The Resident System Sound immediately affects all systemic Residents in the current constellation. The Pitch Stable / Tempo Free option applies only to samples and uses elastic Resident playback there. Custom Residents can retain their own sound when created."}),u.jsxs("div",{className:"mt-5 rounded border border-neutral-800 bg-black/25 p-3",children:[u.jsx("div",{className:"mb-3 text-[11px] text-neutral-500",children:"Right-click a Resident on the canvas to delete it. In the main room, right-click continues to toggle Echo on/off."}),u.jsxs("div",{className:"grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end",children:[u.jsxs("div",{children:[u.jsx("div",{className:"text-[10px] uppercase tracking-[0.22em] text-neutral-500",children:"Custom Residents"}),u.jsx("div",{className:"mt-1 text-xs leading-relaxed text-neutral-400",children:"Use the Hz spectrum as the workbench basis: set frequency directly and send it with the button as a new resident sound body to the workbench row at the upper right."})]}),u.jsxs("button",{type:"button",onClick:()=>{I(),X()},className:"rounded border border-emerald-700/60 bg-emerald-950/25 px-4 py-3 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/40",children:["Send to Workbench",te?" ⤴️✅":""]})]}),u.jsxs("div",{className:"mt-3 rounded border border-fuchsia-900/35 bg-fuchsia-950/10 p-4",children:[u.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-3",children:[u.jsxs("div",{children:[u.jsx("div",{className:"text-[10px] uppercase tracking-[0.22em] text-fuchsia-300",children:"Hz Workbench"}),u.jsxs("div",{className:"mt-1 text-sm text-neutral-200",children:["New Custom Resident:",R.toFixed(1)," Hz"]})]}),u.jsxs("label",{className:"flex items-center gap-2 text-xs text-neutral-400",children:[u.jsx("span",{className:"text-neutral-500",children:"Hz"}),u.jsx("input",{type:"number",min:$d,max:Gy,step:"0.1",value:R.toFixed(1),onChange:ee=>{const ie=parseFloat(ee.target.value);Number.isFinite(ie)&&k(rI(ie))},className:"w-28 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"})]})]}),u.jsxs("label",{className:"mt-4 block text-xs text-neutral-300",children:[u.jsx("span",{className:"mb-2 block text-neutral-500",children:"Direct Hz spectrum for new resident sound bodies"}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.001",value:ne,onChange:ee=>k(parseFloat(ee.target.value)),className:"block w-full cursor-pointer accent-fuchsia-400",style:{height:"2.5rem"}}),u.jsxs("span",{className:"mt-1 flex items-center justify-between text-[11px] text-neutral-500",children:[u.jsxs("span",{children:[$d.toFixed(0)," Hz"]}),u.jsx("span",{children:"logarithmic resolution"}),u.jsxs("span",{children:[Gy.toFixed(0)," Hz"]})]})]}),u.jsx("div",{className:"mt-4 text-[10px] uppercase tracking-[0.22em] text-neutral-500",children:"Custom Resident Sound"}),u.jsxs("div",{className:"mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end",children:[u.jsxs("div",{className:"grid gap-3",children:[u.jsxs("label",{className:"flex items-center gap-2 rounded border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300",children:[u.jsx("span",{className:"text-neutral-400",children:"New Custom Resident"}),u.jsx("select",{value:b,onChange:ee=>y(ee.target.value),className:"rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-200",children:Z.map(ee=>u.jsx("optgroup",{label:ee.label,children:ee.options.map(ie=>u.jsx("option",{value:ie.value,children:ie.label},ie.value))},ee.id))})]}),u.jsxs("label",{className:"flex items-center gap-2 rounded border border-cyan-900/35 bg-cyan-950/10 px-3 py-2 text-xs text-cyan-100",children:[u.jsx("input",{type:"checkbox",checked:!!g,onChange:ee=>x(ee.target.checked),disabled:!String(b).startsWith("sample:")}),"Pitch Stable / Tempo Free"]})]}),u.jsx("button",{type:"button",onClick:A,className:"rounded border border-fuchsia-700/60 bg-fuchsia-950/25 px-4 py-3 text-xs font-semibold text-fuchsia-100 hover:bg-fuchsia-900/40",children:"Preview Resident"})]}),u.jsx("div",{className:"mt-2 text-[11px] text-neutral-500",children:"This menu applies only to the Custom Resident you are currently preparing in the Hz workbench. When added, it keeps this sound in the current session and in saved constellations. The pitch-stable option applies only to samples."}),u.jsxs("div",{className:"mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start",children:[u.jsx("div",{className:"text-xs leading-relaxed text-neutral-400",children:"Custom Residents refer directly to Hz. Root, System, and Mode interpret the systemic Residents above that layer. Preview here always targets the new Resident currently being prepared."}),u.jsx("div",{className:"rounded border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-xs text-neutral-400",children:"New Custom Residents appear as a row at the upper right and can be dragged freely into the field or saved in constellations."})]})]}),u.jsxs("div",{className:"mt-4 grid gap-4 md:grid-cols-3",children:[u.jsxs("div",{className:"rounded border border-neutral-800 bg-neutral-950/40 p-3 text-xs text-neutral-300",children:[u.jsx("div",{className:"text-neutral-500",children:"Workbench Status"}),u.jsx("div",{className:"mt-1 text-sm text-neutral-100",children:M??"Nothing selected yet"}),u.jsxs("div",{className:"mt-1 text-[11px] text-neutral-500",children:["Active Root: ",w.toFixed(1)," Hz"]}),u.jsx("div",{className:"mt-1 text-[11px] text-neutral-500",children:v?`Selected Resident ${v.toFixed(1)} Hz`:"Click or drag a Resident on the canvas, or right-click to delete it."})]}),u.jsxs("div",{className:"rounded border border-neutral-800 bg-neutral-950/40 p-3 text-xs text-neutral-400",children:[u.jsx("div",{className:"text-neutral-500",children:"Systemische Residents"}),u.jsx("div",{className:"mt-1 leading-relaxed",children:"Resident System distributes the root plus pitch steps across the existing node system. Resident Mode adds only a mute pattern and slightly darkens muted nodes."})]}),u.jsxs("div",{className:"rounded border border-neutral-800 bg-neutral-950/40 p-3 text-xs text-neutral-400",children:[u.jsx("div",{className:"text-neutral-500",children:"Custom Residents"}),u.jsx("div",{className:"mt-1 leading-relaxed",children:"The canvas may then simply show Custom or the Hz value instead of Root, a number, or a ratio. Frequency remains the underlying ground truth."})]})]}),u.jsxs("div",{className:"mt-4 grid gap-3 md:grid-cols-[1.2fr_auto]",children:[u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsx("span",{className:"mb-1 block text-neutral-500",children:"Resident Constellation"}),u.jsx("input",{value:E,onChange:ee=>F(ee.target.value),className:"w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-200"})]}),u.jsx("button",{type:"button",onClick:B,className:"self-end rounded border border-amber-700/60 bg-amber-950/25 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-900/40",children:"Save Constellation"})]}),u.jsx("div",{className:"mt-4 grid gap-2",children:L.length===0?u.jsx("div",{className:"text-xs text-neutral-500",children:"No saved Resident constellations yet."}):L.map(ee=>u.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-2 rounded border border-neutral-800 bg-neutral-950/35 px-3 py-2 text-xs",children:[u.jsxs("div",{children:[u.jsx("div",{className:"text-neutral-100",children:ee.name}),u.jsx("div",{className:"text-neutral-500",children:new Date(ee.createdAt).toLocaleString("de-DE")})]}),u.jsxs("div",{className:"flex gap-2",children:[u.jsx("button",{type:"button",onClick:()=>O(ee.id),className:"rounded border border-cyan-700/60 bg-cyan-950/20 px-2 py-1 text-cyan-100 hover:bg-cyan-900/35",children:"Load"}),u.jsx("button",{type:"button",onClick:()=>T(ee.id),className:"rounded border border-neutral-700 px-2 py-1 text-neutral-300 hover:bg-neutral-900",children:"Remove"})]})]},ee.id))})]})]}),u.jsxs("div",{className:"mt-6 grid gap-4 md:grid-cols-4",children:[u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Ball-Lautheit ",(j.ballLevel*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:j.ballLevel,onChange:ee=>N("ballLevel",parseFloat(ee.target.value)),className:"w-full cursor-pointer"})]}),u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Node-Nachklang ",(j.decay*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:j.decay,onChange:ee=>N("decay",parseFloat(ee.target.value)),className:"w-full cursor-pointer"})]}),u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Layer-Slimness ",(W.slimLayers*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:W.slimLayers,onChange:ee=>V("slimLayers",parseFloat(ee.target.value)),className:"w-full cursor-pointer"})]}),u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Drift / Roughness ",(W.rawReality*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:W.rawReality,onChange:ee=>V("rawReality",parseFloat(ee.target.value)),className:"w-full cursor-pointer"})]})]}),u.jsx(I6,{myzelCentralColorMixer:U,onMyzelCentralColorMixerChange:H,nodalDeviceMatrix:q,onNodalDeviceEnabledChange:K,onNodalDeviceAmountChange:Y,onNodalDeviceTargetChange:J,compact:!0})]})}
function xoe(e){return{value:`sample:${e.id}`,label:L6(e.name,"Samples"),hint:`Samplespeicher · ${Xp(e)}`,originLabel:"Samples"}}
function woe(e=[]){const t=[{id:"resident_builtins",label:"Resident Timbres",options:Moe}];return e.length>0&&t.push({id:"samples",label:"Samplespeicher",options:e.map(xoe).sort((n,r)=>n.label.localeCompare(r.label))}),t}
function Roe(){const[e,t]=P.useState([]),[n,r]=P.useState(null);return P.useEffect(()=>{let o=!1;const i=()=>{gs().then(s=>{o||t(s)}).catch(s=>{hr("samples","myzel-sample-list-refresh",s),o||t([])})};return i(),window.addEventListener(Kd,i),()=>{o=!0,window.removeEventListener(Kd,i)}},[]),P.useEffect(()=>{if(n===null)return;const o=window.setTimeout(()=>r(null),1800);return()=>window.clearTimeout(o)},[n]),{residentSoundMenuGroups:P.useMemo(()=>woe(e),[e]),residentWorkbenchSendConfirmed:n!==null,markResidentWorkbenchSent:()=>r(Date.now())}}
function MyzelG2EffectEditor({getNodes,onChangeEffect,revision}) {
  const [open,setOpen]=P.useState(false);
  const [localRevision,refresh]=P.useState(0);
  if (typeof getNodes!=="function" || typeof onChangeEffect!=="function") return null;
  const originals=getNodes().filter(node=>!node.isCustomResident);
  return u.jsxs("section",{className:"rounded border border-neutral-800 bg-neutral-950/60 px-3 py-2",children:[
    u.jsx("button",{type:"button",onClick:()=>setOpen(value=>!value),"aria-expanded":open,
      className:"w-full text-left text-xs font-semibold tracking-wide text-neutral-300 hover:text-cyan-200",
      children:open?"▾ Advanced · JI / Organ Assignment":"▸ Advanced · JI / Organ Assignment"}),
    open&&u.jsxs("div",{className:"mt-3 space-y-3",children:[
      u.jsx("p",{className:"text-xs text-neutral-500",children:"Each Rebuild Layout shuffles the organ mapping as well as node positions. Intervals and tuning stay unchanged. Manual changes affect the live installation and can be saved with the constellation."}),
      originals.length===0?u.jsx("p",{className:"text-xs text-neutral-500",children:"Build a layout to assign its organ roles."}):
      u.jsx("div",{className:"grid gap-2 sm:grid-cols-2 lg:grid-cols-3",children:originals.map((node,index)=>{
        const legacy=MYZEL_JI_EFFECTS[Math.abs(Math.round(node.residentStepIndex??index))%MYZEL_JI_EFFECTS.length];
        const value=MYZEL_JI_EFFECTS.includes(node.myzelEffectModuleType)?node.myzelEffectModuleType:legacy;
        return u.jsxs("label",{className:"flex items-center gap-2 rounded border border-neutral-800 bg-black/30 px-2 py-2 text-xs",children:[
          u.jsx("span",{className:"min-w-[3rem] font-mono text-amber-200",children:node.label}),
          u.jsx("select",{value,onChange:event=>{onChangeEffect(node.residentId??node.label,event.target.value);refresh(v=>v+1)},
            "aria-label":`${node.label} organ`,className:"min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100",
            children:MYZEL_JI_EFFECTS.map(type=>u.jsx("option",{value:type,children:MYZEL_JI_EFFECT_LABELS[type]},type))})
        ]},node.residentId??index);
      })})
    ]})
  ]});
}
function koeLegacy({mode:e,onModeChange:t,myzelEnabled:n,onToggleMyzel:r,onResetLayout:a,getMyzelEffectNodes:__myzelGetNodes,onSetMyzelEffect:__myzelChangeEffect,systemState:o,rootHz:i,statusLine:s,canvasRef:l,onCanvasMouseDown:c,onCanvasMouseMove:d,onCanvasMouseUp:p,onCanvasMouseLeave:f,onCanvasContextMenu:b,tParams:g,onTParamChange:y,postFxGroup:x,onPostFxGroupChange:A,postFxEnabled:M,onTogglePostFxEnabled:v,followForgeHandoff:w,onFollowForgeHandoffChange:R,postFxDepth:k,onPostFxDepthChange:I,postFxParallel:E,onPostFxParallelChange:F,activeGroupSummary:L,activeGroupReceivesFrom:B,activeGroupKeepsStableBy:O,handoffSummary:T,handoffBalanceCarrier:_,myzelPattern:G,onMyzelPatternChange:j,myzelBallMode:N,onMyzelBallModeChange:W,myzelNodeMode:V,onMyzelNodeModeChange:U,myzelStep16ths:H,onMyzelStep16thsChange:q,myzelDriveEnabled:K,onToggleMyzelDriveEnabled:Y,room3BodyEnabled:J,onToggleRoom3BodyEnabled:Z,onResetEnhancerMix:te,myzelInterpreterMix:X,onMyzelInterpreterMixChange:Q,myzelCentralColorMixer:ne,onMyzelCentralColorMixerChange:ee,nodalDeviceMatrix:ie,onNodalDeviceEnabledChange:de,onNodalDeviceAmountChange:oe,onNodalDeviceTargetChange:ue,room3BodyControls:fe,onRoom3BodyControlsChange:he,installationMix:re,onInstallationMixChange:le,room3MaterialLabel:Ae,installationFieldConfig:ce,particleSoundsMuted:ge,onToggleInstallNomadAttractor:Ce,onToggleInstallResidents:Re,onSetInstallResidentVolume:se,onSetInstallResidentSystem:xe,onSetInstallResidentMode:Be,onToggleInstallResidentWaveExcitation:Ie,onToggleInstallResidentBallCoupling:Qe,onSetParticleSoundMode:Ne,onSetInstallationResidentSound:Ue,onSetInstallationResidentElasticPitch:Ye,customResidentSoundPreset:Ve,customResidentElasticPitch:tt,onSetCustomResidentSound:dt,onSetCustomResidentElasticPitch:gt,onPreviewPendingCustomResident:Ge,selectedResidentLabel:Te,selectedResidentFrequencyHz:rt,residentRootHz:lt,residentAddFrequencyHz:ut,onResidentAddFrequencySliderChange:at,onAddResident:qe,residentConstellationName:mt,onResidentConstellationNameChange:It,savedResidentConstellations:Ct,onSaveResidentConstellation:St,onLoadResidentConstellation:At,onDeleteResidentConstellation:Et,onOpenClassicField:Se,onOpenRefactorField:be}){const [__myzelLayoutRevision,__setMyzelLayoutRevision]=P.useState(0);const ve=Coe[e]??Coe.installation,{residentSoundMenuGroups:Je,residentWorkbenchSendConfirmed:Oe,markResidentWorkbenchSent:Xe}=Roe();return u.jsx("div",{className:"nd-legacy-root max-w-6xl mx-auto space-y-6",children:u.jsxs("div",{className:"nd-legacy-card border border-neutral-800 bg-black p-6",children:[u.jsxs("div",{className:"nd-legacy-meta flex flex-col gap-4 border-b border-neutral-800 pb-4",children:[u.jsxs("div",{className:"nd-legacy-old-title space-y-2",children:[u.jsx("div",{className:"text-[10px] uppercase tracking-[0.28em] text-fuchsia-300",children:ve.eyebrow}),u.jsx("h2",{className:"text-2xl text-white",children:"III. Nodal Center"}),u.jsx("p",{className:"max-w-4xl text-sm leading-relaxed text-neutral-400",children:ve.description})]}),u.jsxs("div",{className:"nd-legacy-info rounded border border-cyan-900/40 bg-cyan-950/10 px-3 py-3 text-xs text-cyan-100",children:[u.jsx("div",{className:"uppercase tracking-[0.2em] text-cyan-300",children:soe}),u.jsxs("div",{className:"mt-1 text-lg text-white",children:[i.toFixed(1)," Hz"]}),u.jsx("div",{className:"mt-1 leading-relaxed text-cyan-100/70",children:"No Room I automation, no beat coupling — only the calm reference root as support."})]}),u.jsxs("div",{className:"nd-legacy-tools flex flex-wrap items-center justify-end gap-2",children:[u.jsx("button",{type:"button",onClick:r,className:`rounded border px-4 py-3 text-sm font-semibold tracking-[0.08em] transition-colors ${n?"border-amber-500 bg-amber-950/30 text-amber-100":"border-neutral-700 text-neutral-300 hover:bg-neutral-900"}`,children:n?"Mycelium active":"Mycelium offline"}),u.jsx("button",{type:"button",onClick:()=>{a();__setMyzelLayoutRevision(v=>v+1)},className:"rounded border border-neutral-700 px-4 py-3 text-sm font-semibold tracking-[0.08em] text-neutral-300 hover:bg-neutral-900",children:"Rebuild Layout"})]}),u.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400",children:[u.jsx("div",{className:"text-sm tracking-wide text-amber-300",children:o}),u.jsx("div",{className:"max-w-4xl text-right leading-relaxed text-neutral-500",children:s})]})]}),u.jsxs("div",{className:"mt-5 space-y-4",children:[e==="installation"&&u.jsx(__NodalBallControls,{mix:re,onMix:le}),u.jsx("div",{className:"nd-legacy-stage relative border border-neutral-800 bg-neutral-950 overflow-hidden",style:{height:tc},children:n?u.jsx("canvas",{ref:l,width:mu,height:tc,className:"w-full h-full cursor-grab active:cursor-grabbing",onMouseDown:c,onMouseMove:d,onMouseUp:p,onMouseLeave:f,onContextMenu:b}):u.jsx("div",{className:"absolute inset-0 flex items-center justify-center text-neutral-700",children:"[ OFFLINE ]"})}),e==="installation"&&u.jsx(MyzelG2EffectEditor,{getNodes:__myzelGetNodes,onChangeEffect:__myzelChangeEffect,revision:__myzelLayoutRevision}),u.jsxs("div",{className:"grid gap-4 md:grid-cols-3",children:[u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Klangspannung ",(g.tension*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:g.tension,onChange:it=>y("tension",parseFloat(it.target.value)),className:"w-full cursor-pointer"})]}),e==="enhancer"?u.jsxs(u.Fragment,{children:[u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Layer-Slimness ",(g.slimLayers*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:g.slimLayers,onChange:it=>y("slimLayers",parseFloat(it.target.value)),className:"w-full cursor-pointer"})]}),u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Raw Reality ",(g.rawReality*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:g.rawReality,onChange:it=>y("rawReality",parseFloat(it.target.value)),className:"w-full cursor-pointer"})]})]}):u.jsxs(u.Fragment,{children:[u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Root Reference",(re.rootLevel*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:re.rootLevel,onChange:it=>le("rootLevel",parseFloat(it.target.value)),className:"w-full cursor-pointer"})]}),u.jsxs("label",{className:"block text-xs text-neutral-400",children:[u.jsxs("span",{className:"mb-1 block text-neutral-500",children:["Node Presence",(re.nodeLevel*100).toFixed(0),"%"]}),u.jsx("input",{type:"range",min:"0",max:"1",step:"0.01",value:re.nodeLevel,onChange:it=>le("nodeLevel",parseFloat(it.target.value)),className:"w-full cursor-pointer"})]})]})]})]}),e==="installation"?u.jsx(Aoe,{installationFieldConfig:ce,particleSoundsMuted:ge,onToggleInstallNomadAttractor:Ce,onToggleInstallResidents:Re,onSetInstallResidentVolume:se,onSetInstallResidentSystem:xe,onSetInstallResidentMode:Be,onToggleInstallResidentWaveExcitation:Ie,onToggleInstallResidentBallCoupling:Qe,onSetParticleSoundMode:Ne,onSetInstallationResidentSound:Ue,onSetInstallationResidentElasticPitch:Ye,customResidentSoundPreset:Ve,customResidentElasticPitch:tt,onSetCustomResidentSound:dt,onSetCustomResidentElasticPitch:gt,onPreviewPendingCustomResident:Ge,selectedResidentLabel:Te,selectedResidentFrequencyHz:rt,residentRootHz:lt,residentAddFrequencyHz:ut,onResidentAddFrequencySliderChange:at,onAddResident:qe,residentConstellationName:mt,onResidentConstellationNameChange:It,savedResidentConstellations:Ct,onSaveResidentConstellation:St,onLoadResidentConstellation:At,onDeleteResidentConstellation:Et,onOpenClassicField:Se,onOpenRefactorField:be,installationMix:re,onInstallationMixChange:le,tParams:g,onTParamChange:y,myzelCentralColorMixer:ne,onMyzelCentralColorMixerChange:ee,nodalDeviceMatrix:ie,onNodalDeviceEnabledChange:de,onNodalDeviceAmountChange:oe,onNodalDeviceTargetChange:ue,residentSoundMenuGroups:Je,residentWorkbenchSendConfirmed:Oe,onMarkResidentWorkbenchSent:Xe}):u.jsx(roe,{postFxGroup:x,onPostFxGroupChange:A,postFxEnabled:M,onTogglePostFxEnabled:v,followForgeHandoff:w,onFollowForgeHandoffChange:R,postFxDepth:k,onPostFxDepthChange:I,postFxParallel:E,onPostFxParallelChange:F,activeGroupSummary:L,activeGroupReceivesFrom:B,activeGroupKeepsStableBy:O,handoffSummary:T,handoffBalanceCarrier:_,myzelPattern:G,onMyzelPatternChange:j,myzelBallMode:N,onMyzelBallModeChange:W,myzelNodeMode:V,onMyzelNodeModeChange:U,myzelStep16ths:H,onMyzelStep16thsChange:q,myzelDriveEnabled:K,onToggleMyzelDriveEnabled:Y,room3BodyEnabled:J,onToggleRoom3BodyEnabled:Z,onResetEnhancerMix:te,myzelInterpreterMix:X,onMyzelInterpreterMixChange:Q,room3BodyControls:fe,onRoom3BodyControlsChange:he,room3MaterialLabel:Ae,myzelCentralColorMixer:ne,onMyzelCentralColorMixerChange:ee,nodalDeviceMatrix:ie,onNodalDeviceEnabledChange:de,onNodalDeviceAmountChange:oe,onNodalDeviceTargetChange:ue}),u.jsx("div",{className:"mt-6 rounded border border-neutral-800 bg-neutral-950/50 px-4 py-3 text-sm leading-relaxed text-neutral-400",children:e==="enhancer"?"Set up effect routing, processing, and the output mix.":"Place resident nodes and configure ball interactions. Use Sound Design to create instruments."})]})})}
return Object.freeze({"koe":koe});
})()