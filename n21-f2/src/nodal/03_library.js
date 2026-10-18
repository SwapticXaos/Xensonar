function createNodalInstrumentLibrary(model, getStorage = () => typeof localStorage === 'undefined' ? null : localStorage, options = {}) {
  const KEY = options.key ?? 'xensonar.nodal.instruments.v1', MAX_ENTRIES = 48;
  const schema = options.schema ?? 'xensonar.nodal-library', eventName = options.event ?? 'xensonar:nodal-library-changed';
  const idPrefix = options.idPrefix ?? 'nodal-', label = options.label ?? 'Nodal';
  let cachedText = null, cachedEntries = [];
  function validate(payload) {
    if (!payload || payload.schema !== schema || payload.schemaVersion !== 1 || !Array.isArray(payload.entries) || payload.entries.length > MAX_ENTRIES) throw new Error('Invalid ' + label + ' library');
    const ids = new Set();
    return payload.entries.map(entry => {
      if (!entry || typeof entry.id !== 'string' || !entry.id || entry.id.length > 180 || ids.has(entry.id) || !Number.isInteger(entry.revision) || entry.revision < 1) throw new Error('Invalid ' + label + ' library entry');
      ids.add(entry.id);
      return {id: entry.id, revision: entry.revision, instrument: model.normalize(entry.instrument)};
    });
  }
  function list() {
    const storage = getStorage(); if (!storage) return [];
    const text = storage.getItem(KEY);
    if (!text) { cachedText = null; cachedEntries = []; return []; }
    if (text.length > 5000000) throw new Error(label + ' library exceeds size limit');
    if (text !== cachedText) {
      const entries = validate(JSON.parse(text));
      cachedText = text; cachedEntries = entries;
    }
    // The immutable instruments may be shared; entry wrappers remain caller-owned.
    return cachedEntries.map(entry => ({...entry}));
  }
  function write(entries) {
    const payload = {schema, schemaVersion: 1, entries};
    const validated = validate(payload), text = JSON.stringify(payload);
    if (text.length > 5000000) throw new Error(label + ' library exceeds size limit');
    const storage = getStorage(); if (!storage) throw new Error('Persistent storage unavailable');
    // A failing quota write leaves the previous committed library intact.
    storage.setItem(KEY, text);
    cachedText = text; cachedEntries = validated;
    if (typeof window !== 'undefined' && typeof Event === 'function') window.dispatchEvent(new Event(eventName));
  }
  function save(instrument, options = {}) {
    const normalized = model.normalize(instrument), entries = list();
    if (!options.id && !options.asVariant) {
      const serialized = model.serialize(normalized);
      const existing = entries.find(entry => model.serialize(entry.instrument) === serialized);
      if (existing) return existing;
    }
    const id = options.id ?? (idPrefix + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9));
    const index = entries.findIndex(e => e.id === id), old = entries[index];
    if (old && options.expectedRevision !== old.revision) throw new Error(label + ' revision conflict');
    if (!old && options.expectedRevision != null) throw new Error(label + ' revision missing');
    if (!old && entries.length >= MAX_ENTRIES) throw new Error(label + ' library full');
    if (old && model.serialize(old.instrument) === model.serialize(normalized)) return old;
    const entry = {id, revision: old ? old.revision + 1 : 1, instrument: normalized};
    if (old) entries[index] = entry; else entries.push(entry);
    write(entries); return entry;
  }
  // Renaming is a metadata change: preserve the sound identity/revision and any existing musical references.
  function rename(id, expectedRevision, nextLabel) {
    const name = typeof nextLabel === 'string' ? nextLabel.trim() : '';
    if (!name || name.length > 100) throw new Error('Instrument name must contain 1–100 characters.');
    const entries = list(), index = entries.findIndex(e => e.id === id);
    if (index < 0) throw new Error('Instrument was not found.');
    if (entries[index].revision !== expectedRevision) throw new Error(label + ' revision conflict');
    const old = entries[index];
    if (old.instrument.name === name) return old;
    const updated = {id: old.id, revision: old.revision, instrument: model.normalize({...old.instrument, name})};
    entries[index] = updated;
    write(entries);
    return updated;
  }
  function remove(id, expectedRevision) {
    const entries = list(), entry = entries.find(e => e.id === id);
    if (!entry) return false;
    if (entry.revision !== expectedRevision) throw new Error(label + ' revision conflict');
    write(entries.filter(e => e.id !== id)); return true;
  }
  function exportPackage() { return JSON.stringify({schema, schemaVersion: 1, entries: list()}); }
  function importPackage(text) {
    if (typeof text !== 'string' || text.length > 5000000) throw new Error('Invalid ' + label + ' library payload');
    const imported = validate(JSON.parse(text)), entries = list(); let added = 0, skipped = 0;
    for (const entry of imported) {
      const old = entries.find(e => e.id === entry.id);
      if (old) { if (old.revision !== entry.revision || model.serialize(old.instrument) !== model.serialize(entry.instrument)) throw new Error('Conflicting ' + label + ' import ID'); skipped++; }
      else { if (entries.length >= MAX_ENTRIES) throw new Error(label + ' library full'); entries.push(entry); added++; }
    }
    write(entries); return {added, skipped};
  }
  return Object.freeze({key: KEY, list, save, rename, remove, exportPackage, importPackage});
}
const __XenNodalLibrary = createNodalInstrumentLibrary(__XenNodalModel);
