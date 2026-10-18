const __NodalDraftKey = 'xensonar.nodal.sounddesigner.v1';
let __NodalPendingDesign = null;
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
    if (!instrument && restored?.instrument) try { instrument = __XenNodalModel.normalize(restored.instrument); } catch {}
    instrument = instrument ?? source.current;
    const editTarget = __NodalPendingEditTarget;
    __NodalPendingEditTarget = null;
    const libraryEntry = __NodalPendingLibraryEntry;
    __NodalPendingLibraryEntry = null;
    return {instrument, editTarget, libraryEntry, selectedId: instrument.nodes.some(n => n.id === restored?.selectedId) ? restored.selectedId : instrument.nodes[0].id, tab: restored?.tab === 'pitch' ? 'pitch' : 'volume'};
  });
  const [instrument, setInstrument] = P.useState(initial.instrument), [selectedId, setSelectedId] = P.useState(initial.selectedId ?? initial.instrument.nodes[0].id);
  const [tab, setTab] = P.useState(initial.tab), [phase, setPhase] = P.useState('idle'), [progress, setProgress] = P.useState(0);
  const [message, setMessage] = P.useState('Move nodes, adjust sound settings, or preview.'), [saved, setSaved] = P.useState([]), [ratioDraft, setRatioDraft] = P.useState('1');
  const [withReference, setWithReference] = P.useState(true), [exported, setExported] = P.useState(null);
  const [editTarget, setEditTarget] = P.useState(initial.editTarget ?? null);
  const libraryEdit = initial.libraryEntry && !initial.editTarget;
  const current = P.useRef(instrument), history = P.useRef([]), drag = P.useRef(null), generation = P.useRef(0), timer = P.useRef(null), phaseRef = P.useRef('idle');
  const svg = P.useRef(null), playStarted = P.useRef(0);
  const fileInput = P.useRef(null), libraryIdentity = P.useRef(initial.libraryEntry ?? null);
  const [libraryChoice, setLibraryChoice] = P.useState(initial.libraryEntry?.id ?? '');
  current.current = instrument; phaseRef.current = phase;
  const selected = instrument.nodes.find(n => n.id === selectedId) ?? instrument.nodes[0];
  const plan = P.useMemo(() => __XenNodalModel.compile(instrument), [instrument]);
  const activeNodes = instrument.nodes.filter(n => !n.muted);
  function stop() { generation.current++; backend.stop(); if (timer.current) clearInterval(timer.current); timer.current = null; setPhase('idle'); setProgress(0); }
  P.useEffect(() => {
    document.body.dataset.nodalSounddesign = 'true';
    try { setSaved(__XenNodalLibrary.list()); } catch (error) { setMessage(error.message); }
    return () => { generation.current++; backend.stop(); if (timer.current) clearInterval(timer.current); delete document.body.dataset.nodalSounddesign; };
  }, []);
  P.useEffect(() => { setRatioDraft(String(selected.ratio)); }, [selected.id, selected.ratio]);
  P.useEffect(() => {
    const id = setTimeout(() => { try { localStorage.setItem(__NodalDraftKey, JSON.stringify({instrument, selectedId, tab})); } catch (error) { setMessage('Could not save work: ' + error.message); } }, 180);
    return () => clearTimeout(id);
  }, [instrument, selectedId, tab]);
  function commit(next, record = true) {
    const normalized = __XenNodalModel.normalize(next);
    if (record) history.current = [...history.current.slice(-23), current.current];
    if (phaseRef.current !== 'idle') stop();
    current.current = normalized; setInstrument(normalized); setExported(null);
  }
  function editNode(patch, record = true) { commit({...current.current, nodes: current.current.nodes.map(n => n.id === selected.id ? {...n, ...patch} : n)}, record); }
  function editArticulation(patch) { commit({...current.current, articulation: {...current.current.articulation, ...patch}}, false); }
  async function audition(ratio = 1) {
    stop(); const turn = generation.current, snapshot = current.current; setPhase('preparing'); setMessage('Preparing preview…');
    try {
      // The sound designer uses its own deterministic, ephemeral PCM audition.
      // The saved instrument and Melodic notes remain direct synthetic recipes.
      const handle = await backend.preview(snapshot, {frequency: snapshot.referenceHz * ratio, velocity: .8});
      if (!handle) throw new Error('Could not start Nodal audio preview.');
      await handle.started;
      if (turn !== generation.current) return;
      setPhase('playing'); playStarted.current = performance.now(); setMessage('Preview playing · ' + (snapshot.referenceHz * ratio).toFixed(1) + ' Hz');
      timer.current = setInterval(() => {
        const elapsed = (performance.now() - playStarted.current) / 1000, length = snapshot.articulation.durationSec;
        setProgress(Math.min(1, elapsed / length));
        if (elapsed >= length + snapshot.articulation.releaseSec + .08) { stop(); setMessage('Preview finished.'); }
      }, 32);
    } catch (error) { if (turn === generation.current) { stop(); setMessage(error.message); } }
  }
  function position(event) {
    const matrix = svg.current?.getScreenCTM(); if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return {x: Math.max(.04, Math.min(.96, point.x / 1000)), y: Math.max(.04, Math.min(.96, point.y / 1000))};
  }
  function startDrag(event, node) {
    event.preventDefault(); setSelectedId(node.id); const point = position(event); if (!point) return;
    history.current = [...history.current.slice(-23), current.current];
    drag.current = {id: node.id, dx: node.x - point.x, dy: node.y - point.y}; svg.current.setPointerCapture(event.pointerId);
  }
  function moveDrag(event) {
    const moving = drag.current, point = position(event); if (!moving || !point) return;
    commit({...current.current, nodes: current.current.nodes.map(n => n.id === moving.id ? {...n, x: Math.max(.04, Math.min(.96, point.x + moving.dx)), y: Math.max(.04, Math.min(.96, point.y + moving.dy))} : n)}, false);
  }
  function toggleEdge(a, b) {
    const pair = [a, b].sort(), blocked = current.current.blockedEdges;
    const exists = blocked.some(p => p[0] === pair[0] && p[1] === pair[1]);
    commit({...current.current, blockedEdges: exists ? blocked.filter(p => p[0] !== pair[0] || p[1] !== pair[1]) : [...blocked, pair]});
  }
  function addNode(role) {
    if (instrument.nodes.length >= 12) return;
    const id = 'organ-' + Date.now().toString(36), node = {id, label: __NodalOrgans[role].label, role, x: .48, y: .52, ratio: 1, cents: 0, radius: .22, strength: 1, excitation: .5, pickup: .65, muted: false};
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
    return h('label', {className: 'nd-slider'}, h('span', null, label, h('output', null, display)), h('input', {type: 'range', min, max, step, value, 'aria-label': label, onChange: event => callback(Number(event.target.value))}));
  }
  const envelopeKey = tab === 'volume' ? 'volumeEnvelope' : 'pitchEnvelope';
  return h('div', {className: 'nd-designer-body', 'data-nodal-designer': true},
    h('div', {className: 'nd-toolbar'},
      h('label', {className: 'nd-name'}, h('span', null, 'Instrument'), h('input', {value: instrument.name, 'aria-label': 'Instrument name', onChange: event => commit({...instrument, name: event.target.value}, false)})),
      h('label', null, h('span', null, 'Excitation'), h('select', {value: instrument.excitation.kind, 'aria-label': 'Excitation', onChange: event => commit({...instrument, excitation: {...instrument.excitation, kind: event.target.value}})}, h('option', {value: 'tone'}, 'Tone'), h('option', {value: 'impulse'}, 'Impulse'), h('option', {value: 'breath'}, 'Breath'))),
      h('label', null, h('span', null, 'Reference pitch · Hz'), h('input', {type: 'number', min: 30, max: 1200, step: .1, value: instrument.referenceHz, 'aria-label': 'Reference pitch', onChange: event => { const value = Number(event.target.value); if (value >= 30 && value <= 1200) commit({...instrument, referenceHz: value}, false); }})),
      h('label', null, h('span', null, 'Duration · s'), h('input', {type: 'number', min: .1, max: 30, step: .1, value: instrument.articulation.durationSec, 'aria-label': 'Duration', onChange: event => { const value = Number(event.target.value); if (value >= .1 && value <= 30) editArticulation({durationSec: value}); }})),
      h('button', {className: 'nd-play ' + (phase !== 'idle' ? 'is-playing' : ''), onClick: () => phase === 'idle' ? audition() : stop(), 'aria-label': phase === 'preparing' ? 'Cancel preparation' : phase === 'playing' ? 'Stop preview' : 'Preview sound'}, phase === 'idle' ? '▶ Preview' : phase === 'preparing' ? '■ Cancel' : '■ Stop')),
    h('div', {className: 'nd-layout'},
      h('div', {className: 'nd-body-panel'},
        h('div', {className: 'nd-stage-heading'}, h('span', null, 'NODE CONFIGURATION'), h('span', null, instrument.nodes.length + ' nodes / ' + (instrument.coupling > 0 ? plan.edges.length + ' connections' : 'Coupling off'))),
        h('div', {className: 'nd-stage ' + (phase === 'playing' ? 'is-sounding' : '')},
          h('div', {className: 'nd-axis nd-axis-top'}, 'short decay'), h('div', {className: 'nd-axis nd-axis-bottom'}, 'long decay'),
          h('svg', {ref: svg, viewBox: '0 0 1000 1000', role: 'application', 'aria-label': 'Nodal configuration: drag nodes or use arrow keys', tabIndex: 0,
            onPointerMove: moveDrag, onPointerUp: () => { drag.current = null; }, onPointerCancel: () => { drag.current = null; }, onKeyDown: event => {
              const delta = {ArrowLeft: [-.012, 0], ArrowRight: [.012, 0], ArrowUp: [0, -.012], ArrowDown: [0, .012]}[event.key];
              if (delta) { event.preventDefault(); editNode({x: Math.max(.04, Math.min(.96, selected.x + delta[0])), y: Math.max(.04, Math.min(.96, selected.y + delta[1]))}); }
            }},
            h('defs', null, h('linearGradient', {id: 'nd-material', x1: '0%', y1: '0%', x2: '100%', y2: '70%'}, h('stop', {offset: '0%', stopColor: '#131e2d'}), h('stop', {offset: '65%', stopColor: '#183236'}), h('stop', {offset: '100%', stopColor: '#24433d'})), h('pattern', {id: 'nd-grid', width: 50, height: 50, patternUnits: 'userSpaceOnUse'}, h('path', {d: 'M50 0H0V50', fill: 'none', stroke: '#84beb9', strokeOpacity: .1, strokeWidth: 1})), h('radialGradient', {id: 'nd-aura'}, h('stop', {offset: '0%', stopColor: '#6edacc', stopOpacity: .13}), h('stop', {offset: '100%', stopColor: '#6edacc', stopOpacity: 0}))),
            h('rect', {x: 0, y: 0, width: 1000, height: 1000, rx: 28, fill: 'url(#nd-material)'}), h('rect', {width: 1000, height: 1000, fill: 'url(#nd-grid)'}),
            ...instrument.nodes.map(node => h('circle', {key: 'aura-' + node.id, cx: node.x * 1000, cy: node.y * 1000, r: node.radius * 1000, fill: 'url(#nd-aura)', stroke: __NodalOrgans[node.role].color, strokeOpacity: node.id === selected.id ? .22 : .065, strokeDasharray: node.muted ? '7 14' : undefined, pointerEvents: 'none'})),
            ...plan.edges.map(edge => { const a = activeNodes.find(n => n.id === plan.nodes[edge.a].id), b = activeNodes.find(n => n.id === plan.nodes[edge.b].id); return h('g', {key: a.id + b.id, className: 'nd-contact', opacity: instrument.coupling > 0 ? 1 : .18, onClick: () => toggleEdge(a.id, b.id)},
              h('line', {x1: a.x * 1000, y1: a.y * 1000, x2: b.x * 1000, y2: b.y * 1000, stroke: '#78d9d0', strokeOpacity: .25 + edge.weight * .6, strokeWidth: 2 + edge.weight * 10}),
              h('line', {x1: a.x * 1000, y1: a.y * 1000, x2: b.x * 1000, y2: b.y * 1000, stroke: 'transparent', strokeWidth: 28}), h('title', null, 'Disconnect nodes')); }),
            ...instrument.blockedEdges.map(([aId, bId]) => { const a = instrument.nodes.find(n => n.id === aId), b = instrument.nodes.find(n => n.id === bId); return h('line', {key: aId + bId, x1: a.x * 1000, y1: a.y * 1000, x2: b.x * 1000, y2: b.y * 1000, stroke: '#8d939b', strokeWidth: 5, strokeDasharray: '10 15', className: 'nd-contact', opacity: instrument.coupling > 0 ? 1 : .18, onClick: () => toggleEdge(aId, bId)}); }),
            ...instrument.nodes.map(node => h('g', {key: node.id, 'data-node-id': node.id, className: 'nd-organ ' + (node.id === selected.id ? 'is-selected ' : '') + (node.muted ? 'is-muted' : ''),
              transform: 'translate(' + node.x * 1000 + ' ' + node.y * 1000 + ')', onPointerDown: event => startDrag(event, node)},
              h('circle', {r: 55, fill: 'transparent'}), h('circle', {r: 39, fill: '#0c1920', stroke: __NodalOrgans[node.role].color, strokeWidth: 3}),
              h('circle', {r: 48, fill: 'none', stroke: __NodalOrgans[node.role].color, strokeOpacity: .4, strokeWidth: 1}),
              h('text', {y: 12, textAnchor: 'middle', fill: __NodalOrgans[node.role].color, fontSize: 34}, __NodalOrgans[node.role].glyph),
              h('text', {y: 78, textAnchor: 'middle', fill: '#e5f2f0', fontSize: 32}, __NodalOrgans[node.role].label), h('text', {y: 109, textAnchor: 'middle', fill: '#97b3b5', fontSize: 28}, node.ratio.toFixed(2) + ' ×'), h('title', null, __NodalOrgans[node.role].label + ' · ' + node.ratio)) ) ),
          h('div', {className: 'nd-material-labels'}, h('span', null, 'absorptive'), h('span', null, 'transmissive'))),
        h('div', {className: 'nd-node-actions'}, h('select', {'aria-label': 'Add node', defaultValue: '', disabled: instrument.nodes.length >= 12, onChange: event => { addNode(event.target.value); event.target.value = ''; }}, h('option', {value: '', disabled: true}, '+ Node'), ...Object.entries(__NodalOrgans).map(([role, organ]) => h('option', {key: role, value: role}, organ.label))),
          h('button', {onClick: () => { const previous = history.current.pop(); if (previous) commit(previous, false); }, disabled: !history.current.length}, '↶ Undo layout'),
          ...[[1, '1/1'], [1.25, '5/4'], [1.5, '3/2'], [2, '2/1']].map(([ratio, label]) => h('button', {key: label, onClick: () => audition(ratio), 'aria-label': 'Preview ' + label}, '♪ ' + label))),
        h('div', {className: 'nd-inspector'},
          h('div', {className: 'nd-inspector-heading'}, h('select', {value: selectedId, 'aria-label': 'Select node', onChange: event => setSelectedId(event.target.value)}, ...instrument.nodes.map((node, i) => h('option', {key: node.id, value: node.id}, (i + 1) + ' · ' + __NodalOrgans[node.role].label))),
            h('select', {value: selected.role, 'aria-label': 'Node role', onChange: event => editNode({role: event.target.value, label: __NodalOrgans[event.target.value].label})}, ...Object.entries(__NodalOrgans).map(([role, organ]) => h('option', {key: role, value: role}, organ.label))),
            h('button', {onClick: () => editNode({muted: !selected.muted}), 'aria-pressed': selected.muted}, selected.muted ? 'Muted' : 'Active'),
            h('button', {disabled: instrument.nodes.length === 1, 'aria-label': 'Remove selected node', onClick: () => { const nodes = instrument.nodes.filter(n => n.id !== selected.id); commit({...instrument, nodes, blockedEdges: instrument.blockedEdges.filter(p => !p.includes(selected.id))}); setSelectedId(nodes[0].id); }}, '×')),
          h('div', {className: 'nd-parameters'},
            h('label', {className: 'nd-ratio'}, h('span', null, 'Ratio'), h('input', {value: ratioDraft, 'aria-label': 'Pitch ratio', onChange: e => setRatioDraft(e.target.value), onBlur: () => { const parts = ratioDraft.split('/').map(Number), value = parts.length === 2 ? parts[0] / parts[1] : parts[0]; if (Number.isFinite(value) && value > 0 && value <= 32) editNode({ratio: value}); else setRatioDraft(String(selected.ratio)); }})),
            range('Aura', selected.radius, .04, .45, .005, radius => editNode({radius}, false)),
            range('Excitation level', selected.excitation, 0, 1, .01, excitation => editNode({excitation}, false)),
            range('Pickup', selected.pickup, 0, 1, .01, pickup => editNode({pickup}, false)),
            range('Strength', selected.strength, 0, 2, .01, strength => editNode({strength}, false)),
            range('Coupling', instrument.coupling, 0, .2, .001, coupling => commit({...instrument, coupling}, false))))),
      h('div', {className: 'nd-editor-panel'},
        h('div', {className: 'nd-curve-tabs'}, h('div', null, h('span', null, 'ENVELOPE'), h('small', null, 'Volume and pitch over time')), h('div', {role: 'tablist', 'aria-label': 'Instrument envelope'}, ...[['volume', 'Volume'], ['pitch', 'Pitch']].map(([id, label]) => h('button', {key: id, role: 'tab', 'aria-selected': tab === id, onClick: () => setTab(id)}, label)))),
        h(G$, {fieldInput: instrument.articulation[envelopeKey], historyKey: 'nodal-' + envelopeKey, fixedTarget: tab === 'volume' ? 'dynamic-fade' : 'pitch-elastic', title: '', description: '', statusDescription: '', compact: true,
          onCommit: field => { editArticulation({[envelopeKey]: field}); setMessage(tab === 'volume' ? 'Volume envelope updated' : 'Pitch envelope updated'); }}),
        h('div', {className: 'nd-contour-time'}, h('span', null, '0 s'), h('div', {className: 'nd-progress'}, h('i', {style: {width: (progress * 100) + '%'}})), h('span', null, instrument.articulation.durationSec.toFixed(1) + ' s')),
        h('div', {className: 'nd-articulation'}, range('Attack', instrument.articulation.attackSec, .001, .4, .001, attackSec => editArticulation({attackSec}), Math.round(instrument.articulation.attackSec * 1000) + ' ms'), range('Release', instrument.articulation.releaseSec, .01, 1.5, .01, releaseSec => editArticulation({releaseSec}), Math.round(instrument.articulation.releaseSec * 1000) + ' ms')),
        h('div', {className: 'nd-starters'}, h('span', null, 'Start preset'), ...[['glass', 'Glass'], ['ember', 'Ember'], ['breath', 'Breath']].map(([id, label]) => h('button', {key: id, onClick: () => { const next = nodalStarter(id); libraryIdentity.current = null; setLibraryChoice(''); commit(next); setSelectedId(next.nodes[0].id); setMessage(label + ' preset loaded'); }}, label)), h('button', {onClick: () => { libraryIdentity.current = null; setLibraryChoice(''); commit(source.current); setSelectedId(source.current.nodes[0].id); }}, 'Installation')),
        h('div', {className: 'nd-library-row'}, h('label', {className: 'nd-saved'}, h('span', null, 'Saved Instruments'), h('select', {'aria-label': 'Load instrument', value: libraryChoice, onChange: event => { const entry = saved.find(e => e.id === event.target.value); if (entry) { libraryIdentity.current = entry; setLibraryChoice(entry.id); commit(entry.instrument); setSelectedId(entry.instrument.nodes[0].id); setMessage(entry.instrument.name + ' loaded'); } }}, h('option', {value: ''}, saved.length ? 'Select instrument…' : 'No saved instruments'), ...saved.map(entry => h('option', {key: entry.id, value: entry.id}, nodalLibraryEntryLabel(entry, saved))))), h('button', {onClick: removeSaved, disabled: !libraryChoice, 'aria-label': 'Remove saved instrument'}, 'Remove'), h('button', {onClick: download, 'aria-label': 'Export instrument file'}, '↓ File'), h('button', {onClick: () => fileInput.current.click(), 'aria-label': 'Import instrument file'}, '↑'), h('input', {ref: fileInput, type: 'file', accept: '.json,.xen-nodal', hidden: true, onChange: importFile})) ) ),
    h('footer', {className: 'nd-footer'}, h('div', {className: 'nd-status', role: 'status', 'aria-live': 'polite'}, h('i', {className: phase === 'playing' ? 'is-playing' : ''}), h('span', null, message)),
      h('div', {className: 'nd-export'}, h('button', {onClick: () => save(false)}, 'Save Instrument'), h('button', {onClick: () => save(true)}, 'Save as Variant'),
        editTarget ? h('button', {onClick: backToMelodic}, 'Cancel · Back to Melodic Loop') :
          libraryEdit ? h('button', {onClick: backToMelodic}, 'Back to Melodic Loop') :
          h('label', {className: 'nd-reference-check'}, h('input', {type: 'checkbox', checked: withReference, onChange: event => setWithReference(event.target.checked)}), 'Add reference note'),
        libraryEdit ? null : h('button', {className: 'nd-send', onClick: send}, editTarget ? 'Apply Changes' : 'Send to Melodic Loop'),
        !editTarget && !libraryEdit ? h('button', {disabled: !exported, onClick: backToMelodic}, 'Open Loop ↗') : null)));
}
// Room III is one workspace with three modes, not a floating Sound Design modal.
function NodalRoomHeader({mode, onModeChange}) {
  const h = P.createElement;
  const labels = {
    sounddesign: ['Sound Design', 'Nodes · Envelopes · Instruments'],
    installation: ['Installation', 'Resident nodes · Ball · Sound field'],
    enhancer: ['Enhancer', 'Processing · Routing · Mix']
  };
  const current = labels[mode] || labels.installation;
  return h('header', {className: 'nd-heading nd-shared-heading'},
    h('div', {className: 'nd-heading-copy'},
      h('div', {className: 'nd-eyebrow'}, 'ROOM III / NODAL INSTALLATION'),
      h('h2', null, current[0]), h('p', null, current[1])),
    h('nav', {className: 'nd-modes', 'aria-label': 'Nodal modes'},
      ...[['sounddesign', 'Sound Design'], ['installation', 'Installation'], ['enhancer', 'Enhancer']]
        .map(([id, label]) => h('button', {
          key: id, type: 'button', className: mode === id ? 'is-active' : '',
          'aria-pressed': mode === id, onClick: () => { if (mode !== id) onModeChange(id); }
        }, label))));
}
function koe(props) {
  return P.createElement('section', {className: 'nd-room nd-room-shell', 'data-nodal-mode': props.mode},
    P.createElement(NodalRoomHeader, {mode: props.mode, onModeChange: props.onModeChange}),
    props.mode === 'sounddesign'
      ? P.createElement(NodalSoundDesigner, props)
      : P.createElement('div', {className: 'nd-legacy-body nd-legacy-' + props.mode}, P.createElement(koeLegacy, props)));
}
