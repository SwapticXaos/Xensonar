
/* F3.56.8 — Paketstation: portable Donor Library + Material Intake workspaces.
 * PCM is losslessly encoded as binary base64, rather than JSON-number arrays
 * (or the package serializer's deliberately truncated typed-array previews).
 * The record store is shared with the existing Material Intake persistence.
 */
function __createF3568DonorPackageBridge(storage) {
  const PRESET = 'donor-library:preset:';
  const WORKSPACE = 'workspace:';
  const ASSET = 'asset:';
  const SAMPLE = __F35614AudioRef.samplePrefix;
  const linked = id => goodId(id, SAMPLE);
  const TYPE = {
    Float32Array, Float64Array, Uint8Array, Uint16Array, Int8Array, Int16Array,
    Int32Array, Uint32Array, Uint8ClampedArray
  };
  const fail = message => { throw new Error('Tüftelpaket / Donor-Bibliothek: ' + message); };
  const goodId = (id, prefix) => typeof id === 'string' && id.startsWith(prefix) && id.length > prefix.length && id.length <= 512;
  function base64Encode(bytes) {
    const blocks = [];
    // A multiple of three is essential to avoid padding between chunks.
    const blockSize = 24576;
    for (let at = 0; at < bytes.length; at += blockSize) {
      const chunk = bytes.subarray(at, Math.min(bytes.length, at + blockSize));
      let binary = '';
      for (let i = 0; i < chunk.length; i += 8192)
        binary += String.fromCharCode(...chunk.subarray(i, i + 8192));
      blocks.push(btoa(binary));
    }
    return blocks.join('');
  }
  function base64Decode(text, expectedSize) {
    if (typeof text !== 'string' || !Number.isSafeInteger(expectedSize) || expectedSize < 0 ||
        text.length !== 4 * Math.ceil(expectedSize / 3)) fail('Audioformat oder Datenlänge ungültig.');
    const bytes = new Uint8Array(expectedSize);
    const step = 32768;
    let offset = 0;
    for (let at = 0; at < text.length; at += step) {
      let binary;
      try { binary = atob(text.slice(at, at + step)); }
      catch { fail('Beschädigte Audiodaten im Paket.'); }
      for (let i = 0; i < binary.length; i++) {
        if (offset >= expectedSize) fail('Audio-Bytezahl stimmt nicht.');
        bytes[offset++] = binary.charCodeAt(i);
      }
    }
    if (offset !== expectedSize) fail('Audiodaten sind unvollständig.');
    return bytes.buffer;
  }
  function pack(value, seen = new WeakSet()) {
    if (value == null || typeof value === 'string' || typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isFinite(value))) return value;
    if (typeof value === 'number') fail('Ungültiger numerischer Wert im Material.');
    if (typeof value !== 'object') fail('Nicht serialisierbarer Materialwert.');
    if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
      if (!TYPE[value.constructor?.name]) fail('Unbekanntes Audio-Arrayformat.');
      return { __xensonarPortableBytes: 1, type: value.constructor.name,
        byteLength: value.byteLength, base64: base64Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)) };
    }
    if (value instanceof ArrayBuffer)
      return { __xensonarPortableBytes: 1, type: 'ArrayBuffer', byteLength: value.byteLength,
        base64: base64Encode(new Uint8Array(value)) };
    if (typeof Blob !== 'undefined' && value instanceof Blob)
      fail('Ein Audio-Asset enthält einen Blob; Export ohne Datenverlust nicht möglich.');
    if (seen.has(value)) fail('Zyklische Referenz in Materialdaten.');
    seen.add(value);
    const answer = Array.isArray(value) ? value.map(v => pack(v, seen)) : {};
    if (!Array.isArray(value)) for (const [key, part] of Object.entries(value)) {
      if (key === 'analysisCache' || key === '__proto__' || key === 'constructor') continue;
      if (part === undefined) continue;
      answer[key] = pack(part, seen);
    }
    seen.delete(value);
    return answer;
  }
  function unpack(value) {
    if (value == null || typeof value !== 'object') return value;
    if (value.__xensonarPortableBytes === 1) {
      const raw = base64Decode(value.base64, value.byteLength);
      if (value.type === 'ArrayBuffer') return raw;
      const ctor = TYPE[value.type];
      if (!ctor || raw.byteLength % ctor.BYTES_PER_ELEMENT) fail('Unbekannter PCM-Datentyp.');
      return new ctor(raw);
    }
    if (Array.isArray(value)) return value.map(unpack);
    const result = {};
    for (const [key, part] of Object.entries(value)) {
      if (key === '__proto__' || key === 'constructor' || key === 'analysisCache') continue;
      result[key] = unpack(part);
    }
    return result;
  }
  function refFromWorkspace(row) {
    return __F35614AudioRef.fromSource(row?.value?.source);
  }
  function assertAsset(value, id) {
    if (!value || (!value.monoSamples?.length && !value.leftSamples?.length))
      fail('Roh-Audio fehlt für ' + id + '.');
  }
  async function exportLibrary(validSamples = new Set()) {
    // Debounced Material Intake saves must be flushed before this call by the caller.
    const [presetRows, workspaceRows] = await Promise.all([
      storage.listPrefix(PRESET), storage.listPrefix(WORKSPACE)
    ]);
    const assetIds = new Set();
    for (const row of presetRows) {
      if (!goodId(row.id, PRESET) || row.value?.version !== 'donor-library-v1' ||
          !(goodId(row.value.assetId, ASSET) || linked(row.value.assetId))) fail('Ungültiger Donor-Eintrag: ' + row.id);
      if (linked(row.value.assetId)) { if (!validSamples.has(row.value.assetId.slice(SAMPLE.length))) fail('Sample fehlt im Tüftel-Paket: ' + row.value.assetId); }
      else assetIds.add(row.value.assetId);
    }
    for (const row of workspaceRows) {
      if (!goodId(row.id, WORKSPACE)) fail('Ungültige Materialaufnahme: ' + row.id);
      const id = refFromWorkspace(row);
      if (id) { if (!goodId(id, ASSET)) fail('Ungültiger Materialaufnahme-Audioverweis.'); assetIds.add(id); }
    }
    const assets = await __F35613Archive.exportAssets(storage, assetIds, pack, assertAsset,
      id => fail('Audio-Asset fehlt: ' + id));
    return {
      schemaVersion: 1,
      presets: __F35613Archive.packRows(presetRows, pack),
      workspaces: __F35613Archive.packRows(workspaceRows, pack),
      assets
    };
  }
  async function importLibrary(payload, mode, sampleIdMap = new Map()) {
    // Older Tüftelpakete have no donor section: they must NEVER erase local donors.
    if (payload == null) return null;
    if (payload.schemaVersion !== 1 || !Array.isArray(payload.presets) ||
        !Array.isArray(payload.workspaces) || !Array.isArray(payload.assets))
      fail('Unbekannte oder unvollständige Donor-Paketversion.');
    __F35613Archive.assertMode(mode, () => fail('Unbekannter Importmodus.'));
    const unique = __F35613Archive.validateRows(
      [[payload.presets, PRESET], [payload.workspaces, WORKSPACE], [payload.assets, ASSET]],
      goodId, row => fail('Doppelter oder ungültiger Eintrag: ' + (row?.id ?? '?')));
    const assetsById = new Map(payload.assets.map(row => [row.id, row]));
    const planned = [];
    for (const record of payload.presets) {
      const value = unpack(record.value);
      if (value.version !== 'donor-library-v1' || record.id !== PRESET + value.id ||
          !(goodId(value.assetId, ASSET) || linked(value.assetId)) ||
          (goodId(value.assetId, ASSET) && !assetsById.has(value.assetId)) ||
          (linked(value.assetId) && !sampleIdMap.has(value.assetId.slice(SAMPLE.length))))
        fail('Donor-Metadaten oder Audioverweis fehlen.');
      if (linked(value.assetId)) { const mapped = __F35614AudioRef.sampleId(sampleIdMap.get(value.assetId.slice(SAMPLE.length)));
        value.assetId = mapped;
        value.source = {...(value.source ?? {}), sourceAsset:__F35614AudioRef.marker(mapped)};
      }
      planned.push({ id: record.id, value, updatedAt: Date.now() });
    }
    for (const record of payload.workspaces) {
      const value = unpack(record.value), id = value?.source?.sourceAsset?.__materialIntakeAssetRef;
      if (id && !assetsById.has(id)) fail('Materialaufnahme-Audiodatei fehlt.');
      planned.push({ id: record.id, value, updatedAt: Date.now() });
    }
    // Write audio first. On storage/quota failure no preset is left pointing at missing PCM.
    const { imported: audioImported, reused: audioReused } =
      await __F35613Archive.restoreAssets(storage, payload.assets, unpack, assertAsset);
    const [localPresets, localWorkspaces] = await Promise.all([
      storage.listPrefix(PRESET), storage.listPrefix(WORKSPACE)
    ]);
    const { toPut } = await __F35613Archive.commitMetadata(
      storage, planned, [...localPresets, ...localWorkspaces], unique, mode);
    const count = toPut.filter(row => row.id.startsWith(PRESET)).length;
    const restoredWorkspaces = toPut.filter(row => row.id.startsWith(WORKSPACE)).length;
    return { donorCount: count, workspaceCount: restoredWorkspaces,
      donorTotal: payload.presets.length, workspaceTotal: payload.workspaces.length,
      audioImported, audioReused, skipped: planned.length - toPut.length };
  }
  return Object.freeze({ exportLibrary, importLibrary, pack, unpack, getRecord: storage.get.bind(storage), putRecords: storage.putMany.bind(storage) });
}
const __PaketDonorF3568 = __createF3568DonorPackageBridge(__f35612RecordStore(
  'xensonar-spectral-forge-material-intake-v1', {
    open: 'Materialaufnahme-IndexedDB nicht erreichbar.',
    putAbort: 'Materialaufnahme-Transaktion abgebrochen.',
    put: 'Materialaufnahme-Transaktion fehlgeschlagen.',
  }
));