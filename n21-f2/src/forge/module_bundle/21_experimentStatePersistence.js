"module-source/src/features/l3lab/spectralForge/experimentStatePersistence.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.audioAssetFingerprint = audioAssetFingerprint;
exports.stripDerivedAudioAsset = stripDerivedAudioAsset;
exports.hydrateAudioAsset = hydrateAudioAsset;
exports.createExperimentStatePersistenceController = createExperimentStatePersistenceController;
exports.attachExperimentStatePersistence = attachExperimentStatePersistence;
exports.experimentStatePersistenceStatus = experimentStatePersistenceStatus;
const DB_NAME = 'xensonar-spectral-forge-experiment-state';
const WORKSPACE_ID = 'workspace:autosave-v1';
const BACKUP_ID = 'workspace:last-good-v1';
const ASSET_PREFIX = 'asset:';
const finite = __f35612Finite;
const sparsePcmHash = __f35612SparsePcmHash;
function audioAssetFingerprint(asset) {
const probe = asset.monoSamples?.length ? asset.monoSamples : asset.leftSamples;
return [
asset.fileName,
asset.sampleRate,
asset.channelCount,
asset.originalDuration.toFixed(6),
asset.leftSamples?.length ?? 0,
asset.rightSamples?.length ?? 0,
asset.monoSamples?.length ?? 0,
sparsePcmHash(probe),
].join('|');
}
function stripDerivedAudioAsset(asset) {
return {
kind: 'audio',
fileName: asset.fileName,
projectionReadMode: asset.projectionReadMode,
monoSamples: asset.monoSamples,
leftSamples: asset.leftSamples,
rightSamples: asset.rightSamples,
midSamples: asset.midSamples,
sideSamples: asset.sideSamples,
sampleRate: asset.sampleRate,
originalDuration: asset.originalDuration,
channelCount: asset.channelCount,
waveformPreview: asset.waveformPreview,
stereoWidthPreview: asset.stereoWidthPreview,
};
}
function sourceRef(asset) {
const assetId = ASSET_PREFIX + audioAssetFingerprint(asset);
return {
ref: {
assetId,
importStartSec: finite(asset.importStartSec),
importDurationSec: Math.max(0, finite(asset.importDurationSec)),
},
base: stripDerivedAudioAsset(asset),
};
}
function hydrateAudioAsset(base, ref) {
return {
...base,
kind: 'audio',
importStartSec: finite(ref.importStartSec),
importDurationSec: Math.max(0, finite(ref.importDurationSec)),
};
}
function browserStorage() {
  const store = __f35612RecordStore(DB_NAME, {
    open: 'Failed to open Spectral Forge experiment DB',
    has: 'Failed to check Spectral Forge asset key',
    get: 'Failed to read Spectral Forge experiment state',
    put: 'Failed to save Spectral Forge experiment state',
    putAbort: 'Spectral Forge experiment save aborted',
    delete: 'Failed to delete Spectral Forge experiment state',
    deleteAbort: 'Spectral Forge experiment delete aborted',
  });
  // Autosave historically skips persistence when IndexedDB is unavailable.
  return {
    async has(id) { return typeof indexedDB === 'undefined' ? false : store.has(id); },
    async get(id) { return typeof indexedDB === 'undefined' ? null : store.get(id); },
    async put(row) { if (typeof indexedDB !== 'undefined') await store.put(row); },
    async delete(id) { if (typeof indexedDB !== 'undefined') await store.delete(id); },
  };
}
function createExperimentStatePersistenceController(args) {
const debounceMs = Math.max(100, args.debounceMs ?? 900);
const maxLatencyMs = Math.max(debounceMs, args.maxLatencyMs ?? 4000);
let idleTimer = null;
let hardTimer = null;
let writeChain = Promise.resolve();
// A controller owns one subscription lifetime and at most one restore operation.
let startPromise = null;
let restorePromise = null;
let restoring = false;
let restoreComplete = false;
let protectingSavedState = false;
let lastError = null;
let lastSavedAt = 0;
let lastRestoredAt = 0;
let restoreSkippedForInteraction = false;
let disposed = false;
let unsubStore = null;
let unsubRuntime = null;
const cleanupDom = [];
const status = () => ({
version: 'spectral-forge-experiment-v1', restoring, restoreComplete, protectingSavedState, lastError,
lastSavedAt, lastRestoredAt, restoreSkippedForInteraction,
});
const persistAsset = async (asset) => {
if (!asset)
return null;
const { ref, base } = sourceRef(asset);
const exists = args.storage.has ? await args.storage.has(ref.assetId) : !!(await args.storage.get(ref.assetId));
if (!exists)
await args.storage.put({ id: ref.assetId, value: base, updatedAt: Date.now() });
return ref;
};
const saveNow = () => {
clearTimers();
if (disposed || restorePromise || restoring || !restoreComplete || protectingSavedState)
return false;
try {
const state = args.store.getState();
const donor = args.runtime.getSnapshot();
if(donor.source&&!donor.model){if(donor.phase!=='analyzing')lastError="New donor analysis is incomplete; the previously saved state will not be overwritten.";return false;}
if(donor.source&&donor.selected&&!donor.model?.hybrid){lastError="The new donor cannot be used; the previously saved state will not be overwritten.";return false;}
const mainSource = state.sourceAsset;
const donorSource = donor.model?donor.source:(state.spectralEmbodimentSourceAsset ?? donor.source);
const projectSnapshot = state.createProjectSnapshot();
if(projectSnapshot.donorWorkbench)projectSnapshot.donorWorkbench={...projectSnapshot.donorWorkbench,source:null};
const v2 = state.carrierDonorV2;
const workspace = {
version: 'spectral-forge-experiment-v1',
savedAt: Date.now(),
routingContractVersion: 1,
projectSnapshot,
mainSource: null,
mainSourceContext: state.sourceAssetContext ?? null,
sourcePreviewMode: state.sourcePreviewMode ?? null,
forge3EditTarget: state.forge3EditTarget ?? null,
donorSource: null,
donorSelected: !!donor.selected,
listeningMode: typeof __ForgeListeningMode==='undefined'?null:__ForgeListeningMode.value(),
transport: typeof __F3564Master==='undefined'?null:{tuning:__F3564Master.getSnapshot().tuning,volume:__F3564Master.getSnapshot().volume},
donorRenderMethod: donor.model?.renderMethod ?? null,
donorRegisterPolicy: donor.model?.bodyV3?.registerPolicy ?? null,
donorWorkbench: __F341Workbench.export(),
donorWorkbenchSession: __F341Workbench.exportSession(),
donorPresets: __F341Workbench.exportPresets(),
donorCombinationDraft: __F351Combination.export(),
carrierDonorV2Prefs: v2 ? {
transferPresetId: v2.transferPresetId,
transferMacroAxes: v2.transferMacroAxes ? { ...v2.transferMacroAxes } : undefined,
donorUseMode: v2.donorUseMode,
overlayVisible: !!v2.overlayVisible,
continuityOverlayVisible: !!v2.continuityOverlayVisible,
bindingOverlayVisible: !!v2.bindingOverlayVisible,
} : null,
};
const write=async()=>{if(disposed||restoring||protectingSavedState)return false;const [mainRef,donorRef]=await Promise.all([persistAsset(mainSource),persistAsset(donorSource)]);workspace.mainSource=mainRef;workspace.donorSource=donorRef;const previous=await args.storage.get(WORKSPACE_ID);if(previous?.value?.version==='spectral-forge-experiment-v1')await args.storage.put({id:BACKUP_ID,value:previous.value,updatedAt:previous.updatedAt});if(disposed||restoring||protectingSavedState)return false;await args.storage.put({id:WORKSPACE_ID,value:workspace,updatedAt:workspace.savedAt});lastSavedAt=workspace.savedAt;lastError=null;return true;};
writeChain=writeChain.catch(()=>{}).then(write);
return writeChain.catch(error=>{lastError=error instanceof Error?error.message:String(error);return false;});
}
catch (error) {
lastError = error instanceof Error ? error.message : String(error);
return false;
}
};
const clearTimers = () => {
if (idleTimer)
clearTimeout(idleTimer);
if (hardTimer)
clearTimeout(hardTimer);
idleTimer = hardTimer = null;
};
const scheduleSave = () => {
if (restorePromise || restoring || disposed || !restoreComplete || protectingSavedState)
return;
if (idleTimer)
clearTimeout(idleTimer);
idleTimer = setTimeout(() => { idleTimer = null; if (hardTimer) {
clearTimeout(hardTimer);
hardTimer = null;
} void saveNow(); }, debounceMs);
if (!hardTimer)
hardTimer = setTimeout(() => { hardTimer = null; if (idleTimer) {
clearTimeout(idleTimer);
idleTimer = null;
} void saveNow(); }, maxLatencyMs);
};
const loadAsset = async (ref) => {
if (!ref)
return null;
const record = await args.storage.get(ref.assetId);
if (!record?.value)
throw new Error('Audio data is missing from the saved workspace.');
return hydrateAudioAsset(record.value, ref);
};
const restore = () => {
if (disposed) return Promise.resolve(false);
if (restorePromise) return restorePromise;
clearTimers();
// Capture interaction ownership before waiting: edits during an outstanding save
// must supersede this restore too. Already queued writes are allowed to finish.
const restoreEpoch = __f333RestoreBarrier;
restorePromise = (async () => {
await writeChain.catch(()=>{});
if (disposed) return false;
restoring = true;
protectingSavedState = true;
try {
const record = await args.storage.get(WORKSPACE_ID);
if (disposed) return false;
if (!record) {
restoreComplete = true;
protectingSavedState = false;
lastError = null;
return false;
}
if(record.value?.version!=='spectral-forge-experiment-v1')throw new Error('The saved workspace has an unrecognized format.');
const workspace = record.value;
if(!workspace.projectSnapshot)throw new Error("Saved carrier workspace state is incomplete.");
const [mainSource, donorSource] = await Promise.all([
loadAsset(workspace.mainSource), loadAsset(workspace.donorSource),
]);
if (disposed) return false;
if(restoreEpoch!==__f333RestoreBarrier){restoreComplete=true;restoreSkippedForInteraction=true;lastError="Loading interrupted by a newer edit.";return false;}
const state = args.store.getState();
__F341Workbench.withSnapshotRestore(()=>state.loadProjectSnapshot(workspace.projectSnapshot));
const afterSnapshot = args.store.getState();
if (mainSource && typeof afterSnapshot.setSourceAsset === 'function') {
afterSnapshot.setSourceAsset(mainSource,workspace.routingContractVersion===1?(workspace.mainSourceContext??"forge3_reference"):"forge3_reference");
}
if (workspace.sourcePreviewMode && typeof args.store.getState().setSourcePreviewMode === 'function') {
args.store.getState().setSourcePreviewMode(workspace.routingContractVersion===1?workspace.sourcePreviewMode:"forge");
}
if (workspace.forge3EditTarget && typeof args.store.getState().setForge3EditTarget === 'function') {
args.store.getState().setForge3EditTarget(workspace.forge3EditTarget);
}
if(workspace.donorWorkbench)__F341Workbench.restore(workspace.donorWorkbench);
if(workspace.donorWorkbenchSession)__F341Workbench.restoreSession(workspace.donorWorkbenchSession);
if(workspace.donorPresets)__F341Workbench.restorePresets(workspace.donorPresets);
__F351Combination.restore(workspace.donorCombinationDraft??__F351Combination.defaults);
const prefs = workspace.carrierDonorV2Prefs;
if (prefs) {
const current = args.store.getState();
if (prefs.transferPresetId && typeof current.setCarrierDonorTransferPreset === 'function')
current.setCarrierDonorTransferPreset(prefs.transferPresetId);
if (prefs.transferMacroAxes && typeof args.store.getState().setCarrierDonorTransferMacroAxes === 'function')
args.store.getState().setCarrierDonorTransferMacroAxes(prefs.transferMacroAxes);
if (prefs.donorUseMode && typeof args.store.getState().setCarrierDonorV2DonorUseMode === 'function')
args.store.getState().setCarrierDonorV2DonorUseMode(prefs.donorUseMode);
if (typeof args.store.getState().setCarrierDonorV2Patch === 'function')
args.store.getState().setCarrierDonorV2Patch({
overlayVisible: !!prefs.overlayVisible,
continuityOverlayVisible: !!prefs.continuityOverlayVisible,
bindingOverlayVisible: !!prefs.bindingOverlayVisible,
});
}
if (donorSource) {
if (typeof args.store.getState().setSpectralEmbodimentSourceAsset === 'function')
args.store.getState().setSpectralEmbodimentSourceAsset(donorSource);
const donorRestoreEpoch=__f333Epoch;
const token = args.runtime.beginExtraction(donorSource);
try {
const model = await args.prepareDonor(donorSource);
if (disposed) return false;
if(donorRestoreEpoch!==__f333Epoch){args.runtime.stop();restoreComplete=true;restoreSkippedForInteraction=true;lastError="Donor loading interrupted by a newer edit.";return false;}
if (args.runtime.commitExtraction(token, donorSource, model)) {
if (workspace.donorRegisterPolicy)
args.runtime.setRegisterPolicy(workspace.donorRegisterPolicy);
if (workspace.donorRenderMethod)
args.runtime.setRenderMethod(workspace.donorRenderMethod);
if (workspace.donorSelected && !args.runtime.selectDonor())
throw new Error("Saved donor contains no usable granular material.");
}
else throw new Error("Could not restore saved donor.");
}
catch (error) {
if (disposed) return false;
args.runtime.failExtraction(token, error);
throw error;
}
}
if(workspace.transport&&typeof __F3564Master!=='undefined'){
if(Number.isFinite(workspace.transport.tuning))__F3564Master.set('tuning',workspace.transport.tuning);
if(Number.isFinite(workspace.transport.volume))__F3564Master.set('volume',workspace.transport.volume);
}
if(typeof workspace.listeningMode==='string'&&typeof __ForgeListeningMode!=='undefined')__ForgeListeningMode.choose(workspace.listeningMode,{prepare:false});
lastRestoredAt = Date.now();
lastError = null;
restoreComplete = true;
protectingSavedState = false;
restoreSkippedForInteraction = false;
return true;
}
catch (error) {
if (disposed) return false;
lastError = error instanceof Error ? error.message : String(error);
restoreComplete = true;
return false;
}
finally {
restoring = false;
}
})().finally(() => { restorePromise = null; });
return restorePromise;
};
const attachInteractionGuards = () => {
if (typeof document === 'undefined')
return;
const flush = () => { if (restoreComplete && !restoring)
void saveNow(); };
document.addEventListener('visibilitychange', flush);
if (typeof window !== 'undefined')
window.addEventListener('pagehide', flush);
cleanupDom.push(() => document.removeEventListener('visibilitychange', flush));
if (typeof window !== 'undefined')
cleanupDom.push(() => window.removeEventListener('pagehide', flush));
};
const start = () => {
if (disposed) return Promise.resolve();
if (startPromise) return startPromise;
startPromise = (async () => {
attachInteractionGuards();
await restore();
if (disposed)
return;
// Transport animation and preparation progress are not part of the saved workspace.
// Observe every other field conservatively, including future store additions.
const subscribeChanges = (source, read, ignoredKeys) => {
const ignored = new Set(ignoredKeys);
let previous = read();
return source.subscribe(() => {
const current = read(), keys = Object.keys(current);
const changed = keys.length !== Object.keys(previous).length || keys.some(key => !ignored.has(key) && !Object.is(current[key], previous[key]));
previous = current;
if (changed) scheduleSave();
});
};
unsubStore = subscribeChanges(args.store, () => args.store.getState(), ['isPlaying','playheadPosition','showPlayheadMarker','basisHearingTransportBridge','audioBufferDirty']);
unsubRuntime = subscribeChanges(args.runtime, () => args.runtime.getSnapshot(), ['renderProgress','preparedFigureKey','preparedFigureRenderVersion','preparedFigureCacheHit']);const unsubWorkbench=__F341Workbench.subscribe(scheduleSave);cleanupDom.push(unsubWorkbench);
const unsubCombination=__F351Combination.subscribe(scheduleSave);cleanupDom.push(unsubCombination);
if(typeof __F3564Master!=='undefined')cleanupDom.push(__F3564Master.subscribe(scheduleSave));
})();
return startPromise;
};
const dispose = () => {
disposed = true;
clearTimers();
unsubStore?.();
unsubRuntime?.();
for (const fn of cleanupDom.splice(0))
fn();
};
return { start, restore, saveNow, scheduleSave, status, dispose };
}
let activeController = null;
function attachExperimentStatePersistence(args) {
activeController?.dispose();
activeController = createExperimentStatePersistenceController({ ...args, storage: args.storage ?? browserStorage() });
void activeController.start();
return activeController;
}
function experimentStatePersistenceStatus() {
return activeController?.status() ?? { version: 'spectral-forge-experiment-v1', restoring: false, restoreComplete: false, lastError: null, lastSavedAt: 0, lastRestoredAt: 0, restoreSkippedForInteraction: false };
}
},
