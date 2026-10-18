/* Library previews use the already-owned Nodal audio adapter; they never select a
   Melodic track, write a source snapshot or launch a second AudioContext. */
async function nodalPreviewLibraryEntry(entry) {
  const backend = __XenNodalInstallation.current;
  if (!backend?.preview) throw new Error('Nodal audio owner is unavailable.');
  const instrument = __XenNodalModel.normalize(entry.instrument);
  const handle = await backend.preview(instrument, {
    frequency: instrument.referenceHz, velocity: .8,
    durationSec: Math.min(2, instrument.articulation.durationSec)
  });
  await handle.started;
  return handle;
}
function nodalEditLibraryEntry(entry, eventTarget = window) {
  // The library identity belongs to the editor; it is NOT a selected-note edit.
  const detail = {instrument: __XenNodalModel.normalize(entry.instrument),
    libraryEntry: {id: entry.id, revision: entry.revision}};
  eventTarget.dispatchEvent(new CustomEvent('xensonar:nodal-open-designer', {detail}));
  return detail;
}
/* Compact library management is available where the musician actually chooses instruments.
   Edits change only library metadata, never note geometry, PCM or synthesizer revision. */
function NodalLibraryManager({composer, onMutateLoopComposer, compact = false}) {
  const h = P.createElement;
  const [open, setOpen] = P.useState(false);
  const [entries, setEntries] = P.useState(() => { try { return __XenNodalLibrary.list(); } catch { return []; } });
  const [drafts, setDrafts] = P.useState({});
  const [message, setMessage] = P.useState('');
  const [previewId, setPreviewId] = P.useState(null);
  const previewSeq = P.useRef(0), activePreview = P.useRef(null), previewTimer = P.useRef(null);
  // Both Import Sounds managers form a single exclusive disclosure group.
  P.useEffect(() => {
    const onOtherOpen = event => {
      if (event.detail?.manager !== 'nodal') {
        stopLibraryPreview();
        setOpen(false);
      }
    };
    window.addEventListener('xensonar:import-manager-open', onOtherOpen);
    return () => window.removeEventListener('xensonar:import-manager-open', onOtherOpen);
  }, []);
  function stopLibraryPreview() {
    previewSeq.current++;
    if (previewTimer.current !== null) clearTimeout(previewTimer.current);
    previewTimer.current = null;
    if (activePreview.current) __XenNodalInstallation.current?.stopPreview?.();
    activePreview.current = null;
    setPreviewId(null);
  }
  P.useEffect(() => () => {
    previewSeq.current++;
    if (previewTimer.current !== null) clearTimeout(previewTimer.current);
    if (activePreview.current) __XenNodalInstallation.current?.stopPreview?.();
  }, []);
  async function previewEntry(entry) {
    if (activePreview.current === entry.id) { stopLibraryPreview(); setMessage('Preview stopped.'); return; }
    stopLibraryPreview();
    const seq = previewSeq.current;
    activePreview.current = entry.id;
    setPreviewId(entry.id);
    setMessage('Preparing preview: ' + entry.instrument.name);
    try {
      const handle = await nodalPreviewLibraryEntry(entry);
      if (seq !== previewSeq.current) { handle.noteOff?.(); return; }
      setMessage('Previewing: ' + entry.instrument.name);
      const lengthMs = (Math.min(2, entry.instrument.articulation.durationSec) + entry.instrument.articulation.releaseSec + .2) * 1000;
      previewTimer.current = setTimeout(() => {
        if (seq !== previewSeq.current) return;
        activePreview.current = null; setPreviewId(null); previewTimer.current = null;
      }, lengthMs);
    } catch (error) {
      if (seq === previewSeq.current) { activePreview.current = null; setPreviewId(null); setMessage('Preview: ' + error.message); }
    }
  }
  function editEntry(entry) {
    stopLibraryPreview();
    nodalEditLibraryEntry(entry);
  }
  function refresh() {
    const items = __XenNodalLibrary.list();
    setEntries(items);
    setDrafts(Object.fromEntries(items.map(e => [e.id, e.instrument.name])));
  }
  P.useEffect(() => {
    const changed = () => { try { refresh(); } catch (error) { setMessage(error.message); } };
    window.addEventListener('xensonar:nodal-library-changed', changed);
    return () => window.removeEventListener('xensonar:nodal-library-changed', changed);
  }, []);
  function renameEntry(entry) {
    try {
      const oldName = entry.instrument.name;
      const next = __XenNodalLibrary.rename(entry.id, entry.revision, drafts[entry.id]);
      const preset = 'nodal:' + entry.id + '@' + entry.revision;
      if (composer?.nodalInstruments?.[preset] && oldName !== next.instrument.name) {
        onMutateLoopComposer(c => {
          if (c.nodalInstruments?.[preset]) c.nodalInstruments[preset] = {...c.nodalInstruments[preset], name: next.instrument.name};
          for (const track of c.tracks) if (track.instrumentPreset === preset && track.label === oldName) track.label = next.instrument.name;
        });
      }
      setMessage('Renamed: ' + next.instrument.name + ' · sound and notes unchanged.');
    } catch (error) { setMessage('Rename: ' + error.message); }
  }
  function removeEntry(entry) {
    if (!window.confirm('Remove “' + entry.instrument.name + '” from Nodal Library? Notes and instrument copies in existing projects will remain available.')) return;
    try {
      __XenNodalLibrary.remove(entry.id, entry.revision);
      setMessage('Removed from library. Existing compositions remain available.');
    } catch (error) { setMessage('Remove: ' + error.message); }
  }
  return h('section', {className: 'nd-library-manager', 'aria-label': 'Nodal instrument library'},
    compact ? null : h('span', {className: 'nd-library-manager-label'}, 'Import Sounds'),
    h('button', {type: 'button', 'aria-expanded': open, onClick: () => {
      if (!open) {
        try { refresh(); } catch (error) { setMessage(error.message); }
        window.dispatchEvent(new CustomEvent('xensonar:import-manager-open', {detail: {manager: 'nodal'}}));
      } else stopLibraryPreview();
      setOpen(!open);
    }}, (compact ? 'Nodal · Manage (' : 'Manage (') + entries.length + ')' + (open ? ' ▴' : ' ▾')),
    open ? h('div', {className: 'nd-library-manager-content'},
      h('div', {className: 'nd-library-manager-help'}, 'Preview, edit, rename or remove saved instruments. Editing opens the selected instrument in Sound Design.'),
      entries.length ? entries.map(entry => h('div', {key: entry.id, className: 'nd-library-manager-row'},
        h('label', {className: 'nd-library-manager-name'},
          h('span', null, nodalLibraryEntryLabel(entry, entries)),
          h('input', {'aria-label': 'Name for ' + nodalLibraryEntryLabel(entry, entries), value: drafts[entry.id] ?? entry.instrument.name, maxLength: 100,
            onChange: e => setDrafts(v => ({...v, [entry.id]: e.target.value}))})),
        h('button', {type: 'button', onClick: () => previewEntry(entry),
          'aria-label': (previewId === entry.id ? 'Stop preview for ' : 'Preview ') + nodalLibraryEntryLabel(entry, entries)},
          previewId === entry.id ? 'Stop' : 'Preview'),
        h('button', {type: 'button', onClick: () => editEntry(entry),
          'aria-label': 'Edit ' + nodalLibraryEntryLabel(entry, entries)}, 'Edit'),
        h('button', {type: 'button', disabled: (drafts[entry.id] ?? entry.instrument.name).trim() === entry.instrument.name,
          onClick: () => renameEntry(entry)}, 'Rename'),
        h('button', {type: 'button', onClick: () => {stopLibraryPreview();removeEntry(entry);}, 'aria-label': nodalLibraryEntryLabel(entry, entries) + ' remove'}, 'Remove')
      )) : h('div', {className: 'nd-library-manager-help'}, 'No saved Nodal instruments.'),
      h('div', {className: 'nd-library-manager-help'}, 'Instruments removed from the library remain playable in existing Melodic projects and are labeled “in project”.'),
      message ? h('div', {className: 'nd-library-manager-message', role: 'status'}, message) : null
    ) : null);
}
