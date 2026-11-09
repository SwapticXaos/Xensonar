

/* F3.56.8 — second browser database: Spectral Forge F3 experimental autosave.
 * Carrier snapshot, source assets, donor selection, recipes, hybrid settings.
 */
function __createF3568ForgePackageBridge(storage, codec) {
  const fail = message => { throw new Error('Experiment package / Forge workspace: ' + message); };
  const valid = (id, prefix) => typeof id === 'string' && id.startsWith(prefix) && id.length > prefix.length && id.length < 512;
  const refs = value => [value?.mainSource?.assetId, value?.donorSource?.assetId].filter(Boolean);
  function assertAsset(value, id) {
    if (!value || (!value.monoSamples?.length && !value.leftSamples?.length))
      fail('Missing raw audio for ' + id);
  }
  async function exportState() {
    const workspaces = (await storage.listPrefix('workspace:')).filter(row => valid(row.id,'workspace:'));
    const ids = new Set();
    for (const row of workspaces) {
      for (const id of refs(row.value)) {
        if (!valid(id,'asset:')) fail('Invalid source audio reference.');
        ids.add(id);
      }
    }
    const pack=codec.packAsync || codec.pack;
    const assets = await __F35613Archive.exportAssets(storage, ids, pack, assertAsset,
      id => fail('Audio is missing: ' + id));
    return {schemaVersion:1,
      workspaces:await __F35613Archive.packRowsAsync(workspaces, pack),assets};
  }
  function prepareState(payload,mode) {
    if (payload == null) return null;
    if (payload.schemaVersion !== 1 || !Array.isArray(payload.workspaces) || !Array.isArray(payload.assets))
      fail('Invalid workspace format.');
    __F35613Archive.assertMode(mode, () => fail('Invalid import mode.'));
    const ids = __F35613Archive.validateRows(
      [[payload.assets, 'asset:'], [payload.workspaces, 'workspace:']],
      valid, () => fail('Duplicate or invalid entry.'));
    const assetIds = new Set(payload.assets.map(row => row.id));
    const workspaces=payload.workspaces.map(row=>{
      const value=codec.unpack(row.value);
      for(const ref of refs(value))if(!assetIds.has(ref))fail('Raw audio reference is missing: '+ref);
      return {id:row.id,value,updatedAt:Date.now()};
    });
    // Single repository: decoding is complete before the native readwrite begins.
    const preparedAssets=__XenPackageTransactionsV1.prepareAssets(payload.assets,codec.unpack,assertAsset);
    return {preparedAssets,workspaces,mode,ids,payload};
  }
  async function commitPrepared(prepared) {
    if (prepared==null) return null;
    const {preparedAssets,workspaces,mode,ids,payload}=prepared;
    const transaction=await storage.importPackage({
      assets:preparedAssets,metadata:workspaces,mode,
      metadataPrefixes:['workspace:'],archiveIds:ids
    });
    return {workspaceTotal:payload.workspaces.length,workspaceCount:transaction.metadataCount,
      audioImported:transaction.audioImported,
      activeWorkspaceImported:transaction.metadataWrittenIds.includes('workspace:autosave-v1')};
  }
  async function importState(payload,mode) {return commitPrepared(prepareState(payload,mode));}
  return Object.freeze({exportState,importState,prepareState,commitPrepared});
}
const __PaketForgeF3568 = __createF3568ForgePackageBridge(__f35612RecordStore(
  'xensonar-spectral-forge-experiment-state', {
    open: 'Forge storage cannot be read.', putAbort: 'Forge-Speicherung abgebrochen.',
    put: 'Forge-Speicherung fehlgeschlagen.',
  }
), __PaketDonorF3568);