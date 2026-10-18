/* Saved Entrophon sounds share the Nodal library's atomic storage and revision
   contract. Project-owned definitions remain independent of library metadata. */
const __XenEntrophonLibrary = createNodalInstrumentLibrary({
  normalize: normalizeEntrophonInstrument,
  serialize: serializeEntrophonInstrument
}, () => typeof localStorage === 'undefined' ? null : localStorage, {
  key: 'xensonar.entrophon.instruments.v1', schema: 'xensonar.entrophon-library',
  event: 'xensonar:entrophon-library-changed', idPrefix: 'entrophon-', label: 'Entrophon'
});
function entrophonFindInstrument(preset, composer) {
  if (typeof preset !== 'string' || !preset.startsWith('entrophon:')) return null;
  const match = /^entrophon:(.+)@([1-9][0-9]*)$/.exec(preset);
  if (!match) return null;
  try {
    const saved = composer?.entrophonInstruments?.[preset];
    if (saved) return normalizeEntrophonInstrument(saved);
    const entry = __XenEntrophonLibrary.list().find(item => item.id === match[1] && item.revision === Number(match[2]));
    return entry?.instrument ?? null;
  } catch { return null; }
}
function entrophonLibraryEntryLabel(entry, entries = []) {
  const name = entry.instrument.name;
  if (entries.filter(item => item.instrument.name === name).length < 2) return name;
  return name + ' · ' + entry.instrument.surface + ' · ' + (entries.filter(item => item.instrument.name === name).findIndex(item => item.id === entry.id) + 1);
}
const __XenEntrophonEditState = {surface: null, id: null, revision: null, name: '', editing: false};
function entrophonSetLibraryEditEntry(entry, editing = true) {
  Object.assign(__XenEntrophonEditState, entry ? {
    surface: entry.instrument.surface, id: entry.id, revision: entry.revision, name: entry.instrument.name, editing: !!editing
  } : {surface: null, id: null, revision: null, name: '', editing: false});
  if (typeof window !== 'undefined' && typeof Event === 'function') window.dispatchEvent(new Event('xensonar:entrophon-editor-changed'));
}
