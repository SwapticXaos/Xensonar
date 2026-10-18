

/* F3.56.8 — second browser database: Spectral Forge F3 experimental autosave.
 * Carrier snapshot, source assets, donor selection, recipes, hybrid settings.
 */
function __createF3568ForgePackageBridge(storage, codec) {
  const fail = message => { throw new Error('Tüftelpaket / Forge-Arbeitsstand: ' + message); };
  const valid = (id, prefix) => typeof id === 'string' && id.startsWith(prefix) && id.length > prefix.length && id.length < 512;
  const refs = value => [value?.mainSource?.assetId, value?.donorSource?.assetId].filter(Boolean);
  function assertAsset(value, id) {
    if (!value || (!value.monoSamples?.length && !value.leftSamples?.length))
      fail('Fehlendes Roh-Audio zu ' + id);
  }
  async function exportState() {
    const workspaces = (await storage.listPrefix('workspace:')).filter(row => valid(row.id,'workspace:'));
    const ids = new Set();
    for (const row of workspaces) {
      for (const id of refs(row.value)) {
        if (!valid(id,'asset:')) fail('Ungültige Quell-Audio-Referenz.');
        ids.add(id);
      }
    }
    const assets = await __F35613Archive.exportAssets(storage, ids, codec.pack, assertAsset,
      id => fail('Audio fehlt: ' + id));
    return {schemaVersion:1,
      workspaces:__F35613Archive.packRows(workspaces, codec.pack),assets};
  }
  async function importState(payload,mode) {
    if (payload == null) return null;
    if (payload.schemaVersion !== 1 || !Array.isArray(payload.workspaces) || !Array.isArray(payload.assets))
      fail('Ungültiges Arbeitsstand-Format.');
    __F35613Archive.assertMode(mode, () => fail('Ungültiger Importmodus.'));
    const ids = __F35613Archive.validateRows(
      [[payload.assets, 'asset:'], [payload.workspaces, 'workspace:']],
      valid, () => fail('Doppelter oder ungültiger Eintrag.'));
    const assetIds = new Set(payload.assets.map(row => row.id));
    const workspaces=payload.workspaces.map(row=>{
      const value=codec.unpack(row.value);
      for(const ref of refs(value))if(!assetIds.has(ref))fail('Roh-Audio-Referenz fehlt: '+ref);
      return {id:row.id,value,updatedAt:Date.now()};
    });
    const { imported: audioImported } = await __F35613Archive.restoreAssets(
      storage, payload.assets, codec.unpack, assertAsset);
    const existing=await storage.listPrefix('workspace:');
    const { toPut } = await __F35613Archive.commitMetadata(
      storage, workspaces, existing, ids, mode);
    return {workspaceTotal:payload.workspaces.length,workspaceCount:toPut.length,audioImported,
      activeWorkspaceImported:toPut.some(row=>row.id==='workspace:autosave-v1')};
  }
  return Object.freeze({exportState,importState});
}
const __PaketForgeF3568 = __createF3568ForgePackageBridge(__f35612RecordStore(
  'xensonar-spectral-forge-experiment-state', {
    open: 'Forge-Speicher nicht lesbar.', putAbort: 'Forge-Speicherung abgebrochen.',
    put: 'Forge-Speicherung fehlgeschlagen.',
  }
), __PaketDonorF3568);