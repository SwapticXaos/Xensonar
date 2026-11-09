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

/* xen-lazy:canonical */

