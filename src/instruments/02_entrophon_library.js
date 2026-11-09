/* Saved Entrophon sounds share the Nodal library's atomic storage and revision
   contract. Project-owned definitions remain independent of library metadata. */
const __XenEntrophonLibrary = createNodalInstrumentLibrary({
  normalize: normalizeEntrophonInstrument,
  serialize: serializeEntrophonInstrument
}, () => typeof localStorage === 'undefined' ? null : localStorage, {
  key: 'xensonar.entrophon.instruments.v1', schema: 'xensonar.entrophon-library',
  event: 'xensonar:entrophon-library-changed', idPrefix: 'entrophon-', label: 'Entrophon'
});
function __xenEntrophonFactoryDefinition(preset){
  const match=typeof preset==='string'&&/^entrophon:factory:([a-z0-9-]+)@1$/.exec(preset);
  if(!match)return null;
  const profile=Yx.find(entry=>entry.id===match[1]);
  if(!profile)return null;
  return normalizeEntrophonInstrument({schema:'xensonar.entrophon-instrument',schemaVersion:1,
    engineVersion:'c11-v1',name:profile.label,surface:'wave',config:{...profile.patch,enabled:true}});
}
function entrophonFindInstrument(preset, composer) {
  if (typeof preset !== 'string' || !preset.startsWith('entrophon:')) return null;
  const match = /^entrophon:(.+)@([1-9][0-9]*)$/.exec(preset);
  if (!match) return null;
  try {
    const saved = composer?.entrophonInstruments?.[preset];
    if (saved) return normalizeEntrophonInstrument(saved);
    const session=typeof __XenSongInstrumentDefinitions!=='undefined'?__XenSongInstrumentDefinitions.find(preset):null;
    if(session)return session;
    const factory=__xenEntrophonFactoryDefinition(preset);
    if(factory)return factory;
    const entry = __XenEntrophonLibrary.list().find(item => item.id === match[1] && item.revision === Number(match[2]));
    return entry?.instrument ?? null;
  } catch { return null; }
}

/* xen-lazy:canonical */

const __XenEntrophonEditState = {surface: null, id: null, revision: null, name: '', editing: false};
function entrophonSetLibraryEditEntry(entry, editing = true) {
  Object.assign(__XenEntrophonEditState, entry ? {
    surface: entry.instrument.surface, id: entry.id, revision: entry.revision, name: entry.instrument.name, editing: !!editing
  } : {surface: null, id: null, revision: null, name: '', editing: false});
  if (typeof window !== 'undefined' && typeof Event === 'function') window.dispatchEvent(new Event('xensonar:entrophon-editor-changed'));
}
