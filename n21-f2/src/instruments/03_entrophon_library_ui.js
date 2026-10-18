/* Inline authoring stays on each existing sound surface; no separate preset page. */
function EntrophonSaveSoundControls({surface}) {
  const h = P.createElement;
  const [name, setName] = P.useState(() => __XenEntrophonEditState.surface === surface ? __XenEntrophonEditState.name : '');
  const [message, setMessage] = P.useState('');
  const [failed, setFailed] = P.useState(false);
  P.useEffect(() => {
    const changed = () => { setName(__XenEntrophonEditState.surface === surface ? __XenEntrophonEditState.name : ''); setMessage(''); setFailed(false); };
    changed();
    window.addEventListener('xensonar:entrophon-editor-changed', changed);
    return () => window.removeEventListener('xensonar:entrophon-editor-changed', changed);
  }, [surface]);
  function save() {
    try {
      const identity = __XenEntrophonEditState.surface === surface ? __XenEntrophonEditState : null;
      const entry = __XenEntrophonLibrary.save(captureEntrophonInstrument(name, surface), identity?.editing && identity.id ? {id: identity.id, expectedRevision: identity.revision} : {});
      entrophonSetLibraryEditEntry(entry, !!identity?.editing);
      setFailed(false); setMessage('Saved “' + entry.instrument.name + '” · revision ' + entry.revision + '. Available in Melodic and live instrument menus.');
    } catch (error) { setFailed(true); setMessage('Save Sound: ' + error.message); }
  }
  return h('div', {className: 'entrophon-save-sound', style: {display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '0', flex: '1 1 260px'}},
    h('input', {type: 'text', 'aria-label': 'Entrophon sound name', placeholder: 'Sound name', value: name, maxLength: 100,
      style: {minWidth: '120px', flex: '1 1 140px', background: '#21152f', color: '#ede9fe', border: '1px solid #8b6bae', borderRadius: '4px', padding: '6px 8px'}, onChange: event => setName(event.target.value)}),
    h('button', {type: 'button', onClick: save, style: {background: '#4c316c', color: '#ede9fe', border: '1px solid #a78bfa', borderRadius: '4px', padding: '6px 10px'}}, 'Save Sound'),
    message ? h('span', {role: failed ? 'alert' : 'status', style: {flexBasis: '100%', fontSize: '11px', color: failed ? '#fda4af' : '#c4b5fd'}}, message) : null);
}
function EntrophonLibraryManager({composer, onMutateLoopComposer, compact = false}) {
  const h = P.createElement;
  const [open, setOpen] = P.useState(false);
  const [entries, setEntries] = P.useState(() => { try { return __XenEntrophonLibrary.list(); } catch { return []; } });
  const [drafts, setDrafts] = P.useState({}), [message, setMessage] = P.useState('');
  const [previewId, setPreviewId] = P.useState(null);
  const sequence = P.useRef(0), active = P.useRef(null), timer = P.useRef(null), preparation = P.useRef(null);
  P.useEffect(() => {
    const onOtherOpen = event => {
      if (event.detail?.manager !== 'entrophon') {
        stopPreview();
        setOpen(false);
      }
    };
    window.addEventListener('xensonar:import-manager-open', onOtherOpen);
    return () => window.removeEventListener('xensonar:import-manager-open', onOtherOpen);
  }, []);
  function stopPreview(update = true) {
    sequence.current++;
    preparation.current?.abort(); preparation.current = null;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    active.current?.noteOff?.(); active.current = null;
    if (update) setPreviewId(null);
  }
  P.useEffect(() => () => stopPreview(false), []);
  function refresh() {
    const items = __XenEntrophonLibrary.list(); setEntries(items);
    setDrafts(Object.fromEntries(items.map(entry => [entry.id, entry.instrument.name])));
  }
  P.useEffect(() => {
    const changed = () => { try { refresh(); } catch (error) { setMessage(error.message); } };
    window.addEventListener('xensonar:entrophon-library-changed', changed);
    return () => window.removeEventListener('xensonar:entrophon-library-changed', changed);
  }, []);
  async function preview(entry) {
    const stopping = previewId === entry.id;
    stopPreview(); if (stopping) { setMessage('Preview stopped.'); return; }
    const token = sequence.current;
    preparation.current = new AbortController();
    const signal = preparation.current.signal;
    setPreviewId(entry.id); setMessage('Preparing preview: ' + entry.instrument.name);
    try {
      const handle = await previewEntrophonSavedSound(entry, {signal});
      if (token !== sequence.current) { handle.noteOff?.(); return; }
      active.current = handle;
      await handle.started;
      if (token !== sequence.current) { handle.noteOff?.(); return; }
      setMessage('Previewing: ' + entry.instrument.name);
      timer.current = setTimeout(() => { if (token === sequence.current) stopPreview(); }, 2500);
    } catch (error) { if (token === sequence.current) { stopPreview(); setMessage('Preview: ' + error.message); } }
  }
  function rename(entry) {
    try {
      const next = __XenEntrophonLibrary.rename(entry.id, entry.revision, drafts[entry.id] ?? entry.instrument.name);
      if (__XenEntrophonEditState.id === next.id) entrophonSetLibraryEditEntry(next, __XenEntrophonEditState.editing);
      setMessage('Renamed: ' + next.instrument.name + '. Existing project sounds and notes are unchanged.');
    } catch (error) { setMessage('Rename: ' + error.message); }
  }
  function remove(entry) {
    if (!window.confirm('Remove “' + entry.instrument.name + '” from Entrophon Library? Notes and instrument copies in existing projects will remain available.')) return;
    try {
      __XenEntrophonLibrary.remove(entry.id, entry.revision);
      if (__XenEntrophonEditState.id === entry.id) entrophonSetLibraryEditEntry(null);
      setMessage('Removed from library. Existing compositions remain available.');
    } catch (error) { setMessage('Remove: ' + error.message); }
  }
  return h('section', {className: 'nd-library-manager entrophon-library-manager', 'aria-label': 'Entrophon instrument library'},
    h(EntrophonSoundEditor, null),
    compact ? null : h('span', {className: 'nd-library-manager-label'}, 'Entrophon Sounds'),
    h('button', {type: 'button', style: {background: '#4c316c', borderColor: '#a78bfa', color: '#ede9fe'}, 'aria-expanded': open, onClick: () => {
      if (!open) {
        try { refresh(); } catch (error) { setMessage(error.message); }
        window.dispatchEvent(new CustomEvent('xensonar:import-manager-open', {detail: {manager: 'entrophon'}}));
      } else stopPreview();
      setOpen(!open);
    }}, (compact ? 'Entrophon · Manage (' : 'Manage (') + entries.length + ')' + (open ? ' ▴' : ' ▾')),
    open ? h('div', {className: 'nd-library-manager-content', style: {borderColor: '#a78bfa'}},
      h('div', {className: 'nd-library-manager-help'}, 'Preview, edit, rename or remove saved Entrophon sounds. Editing opens the original sound surface.'),
      entries.length ? entries.map(entry => h('div', {key: entry.id, className: 'nd-library-manager-row'},
        h('label', {className: 'nd-library-manager-name'}, h('span', null, entrophonLibraryEntryLabel(entry, entries)),
          h('input', {'aria-label': 'Name for ' + entrophonLibraryEntryLabel(entry, entries), value: drafts[entry.id] ?? entry.instrument.name, maxLength: 100,
            onChange: event => setDrafts(value => ({...value, [entry.id]: event.target.value}))})),
        h('button', {type: 'button', 'aria-label': (previewId === entry.id ? 'Stop preview for ' : 'Preview ') + entrophonLibraryEntryLabel(entry, entries), onClick: () => preview(entry)}, previewId === entry.id ? 'Stop' : 'Preview'),
        h('button', {type: 'button', 'aria-label': 'Edit ' + entrophonLibraryEntryLabel(entry, entries), onClick: () => {
          stopPreview(); try { entrophonEditSavedSound(entry); } catch (error) { setMessage('Edit: ' + error.message); }
        }}, 'Edit'),
        h('button', {type: 'button', disabled: (drafts[entry.id] ?? entry.instrument.name).trim() === entry.instrument.name, onClick: () => rename(entry)}, 'Rename'),
        h('button', {type: 'button', 'aria-label': entrophonLibraryEntryLabel(entry, entries) + ' remove', onClick: () => { stopPreview(); remove(entry); }}, 'Remove')
      )) : h('div', {className: 'nd-library-manager-help'}, 'No saved Entrophon sounds. Use Save Sound on a sound surface.'),
      h('div', {className: 'nd-library-manager-help'}, 'Removing a library sound preserves its immutable copies in existing Melodic projects.'),
      message ? h('div', {className: 'nd-library-manager-message', role: 'status'}, message) : null
    ) : null);
}
