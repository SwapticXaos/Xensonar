"module-source/src/features/l3lab/spectralForge/materialIntakePersistence.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveMaterialIntakeSelection = resolveMaterialIntakeSelection;
exports.saveMaterialIntakeState = saveMaterialIntakeState;
exports.flushMaterialIntakePersistence = flushMaterialIntakePersistence;
exports.preloadAllMaterialIntakeStates = preloadAllMaterialIntakeStates;
exports.getPreloadedMaterialIntakeState = getPreloadedMaterialIntakeState;
exports.materialIntakePersistenceStatus = materialIntakePersistenceStatus;
exports.serializeMaterialIntakeStateForTest = serializeMaterialIntakeStateForTest;
exports.hydrateMaterialIntakeStateForTest = hydrateMaterialIntakeStateForTest;
const DB_NAME = 'xensonar-spectral-forge-material-intake-v1';
const WORKSPACE_PREFIX = 'workspace:';
const ASSET_PREFIX = 'asset:';
const LIGHT_PREFIX = 'xensonar:spectral-forge:material-intake:v1:';
const preloadCache = new Map();
const pending = new Map();
let browserHooksAttached = false;
let lastError = null;
let lastSavedAt = 0;
let lastLoadedAt = 0;
const finite = __f35612Finite;
const assetFingerprint = __f35612MaterialFingerprint;
function cloneValue(value, seen = new WeakMap()) {
if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
return value;
if (typeof value === 'function' || typeof value === 'symbol')
return undefined;
if (value instanceof Float32Array)
return value.slice();
if (value instanceof Float64Array)
return value.slice();
if (value instanceof Uint8Array)
return value.slice();
if (value instanceof ArrayBuffer)
return value.slice(0);
if (typeof Blob !== 'undefined' && value instanceof Blob)
return value;
if (Array.isArray(value))
return value.map(v => cloneValue(v, seen));
if (typeof value === 'object') {
if (seen.has(value))
return seen.get(value);
const out = {};
seen.set(value, out);
for (const [k, v] of Object.entries(value)) {
if (k === 'analysisCache')
continue;
const c = cloneValue(v, seen);
if (c !== undefined)
out[k] = c;
}
return out;
}
return undefined;
}
const recordStore = __f35612RecordStore(DB_NAME, {
  unavailable: 'IndexedDB unavailable', open: 'Material Intake DB open failed',
  get: 'Material Intake read failed', put: 'Material Intake write failed',
  putAbort: 'Material Intake write aborted', list: 'Material Intake workspace preload failed',
  has: 'Material Intake asset lookup failed',
});
const getRecord = recordStore.get, putRecord = recordStore.put, recordExists = recordStore.has;
const getWorkspaceRecords = () => recordStore.listPrefix(WORKSPACE_PREFIX);
function snapshotState(state) {
return {
source: state.source ? { ...state.source } : null,
selection: cloneValue(state.selection),
sourceAdapterId: state.sourceAdapterId,
readMode: state.readMode,
repairResult: cloneValue(state.repairResult),
status: state.status,
};
}
function serializeState(state) {
const clean = snapshotState(state);
const sourceAsset = clean.source?.sourceAsset;
if (!sourceAsset)
return { workspace: clean, asset: null, assetId: null };
const assetId = ASSET_PREFIX + assetFingerprint(sourceAsset);
const { analysisCache: _derived, ...asset } = sourceAsset;
clean.source = { ...clean.source, sourceAsset: { __materialIntakeAssetRef: assetId } };
return { workspace: clean, asset, assetId };
}
async function hydrateWorkspace(workspace) {
const ref = workspace?.source?.sourceAsset?.__materialIntakeAssetRef;
if (!ref)
return workspace;
const assetRecord = await getRecord(ref);
if (!assetRecord?.value)
return workspace;
return {
...workspace,
source: { ...workspace.source, sourceAsset: assetRecord.value },
};
}
function lightweightRecord(key, state) {
const asset = state.source?.sourceAsset;
return {
version: 'material-intake-light-v1',
key,
assetFingerprint: asset ? assetFingerprint(asset) : null,
sourceLabel: state.source?.label ?? asset?.fileName ?? null,
sourceDurationSec: finite(state.source?.durationSec ?? asset?.originalDuration),
selection: cloneValue(state.selection),
sourceAdapterId: state.sourceAdapterId,
readMode: state.readMode,
repairResult: cloneValue(state.repairResult),
status: state.status,
};
}
function saveLightweight(key, state) {
if (typeof localStorage === 'undefined')
return;
try {
localStorage.setItem(LIGHT_PREFIX + key, JSON.stringify(lightweightRecord(key, state)));
}
catch (error) {
console.warn('[xensonar][material-intake][mask-fallback-save]', error);
}
}
function loadLightweight(key) {
if (typeof localStorage === 'undefined')
return null;
try {
const raw = localStorage.getItem(LIGHT_PREFIX + key);
if (!raw)
return null;
const parsed = JSON.parse(raw);
return parsed?.version === 'material-intake-light-v1' ? parsed : null;
}
catch {
return null;
}
}
function resolveMaterialIntakeSelection(key, source) {
if (!key || !source?.sourceAsset)
return null;
const saved = loadLightweight(key);
if (!saved?.selection || saved.assetFingerprint !== assetFingerprint(source.sourceAsset))
return null;
return cloneValue(saved.selection);
}
async function writeNow(key, state) {
try {
const { workspace, asset, assetId } = serializeState(state);
const now = Date.now();
if (assetId && asset) {
const exists = await recordExists(assetId);
if (!exists)
await putRecord({ id: assetId, value: asset, updatedAt: now });
}
await putRecord({ id: WORKSPACE_PREFIX + key, value: workspace, updatedAt: now });
preloadCache.set(key, state);
lastSavedAt = now;
lastError = null;
}
catch (error) {
lastError = error instanceof Error ? error.message : String(error);
console.warn('[xensonar][material-intake][persistent-save]', error);
}
}
function saveMaterialIntakeState(key, state) {
if (!key)
return;
preloadCache.set(key, snapshotState(state));
saveLightweight(key, state);
const prior = pending.get(key);
if (prior?.timer)
clearTimeout(prior.timer);
const entry = { state: snapshotState(state), timer: null };
entry.timer = setTimeout(() => {
pending.delete(key);
void writeNow(key, entry.state);
}, 550);
pending.set(key, entry);
attachBrowserFlushHooks();
}
async function flushMaterialIntakePersistence() {
const entries = [...pending.entries()];
pending.clear();
for (const [key, entry] of entries) {
if (entry.timer)
clearTimeout(entry.timer);
await writeNow(key, entry.state);
}
}
function attachBrowserFlushHooks() {
if (browserHooksAttached || typeof window === 'undefined' || typeof document === 'undefined')
return;
browserHooksAttached = true;
const flush = () => { void flushMaterialIntakePersistence(); };
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden')
flush(); });
}
async function preloadAllMaterialIntakeStates() {
try {
const records = await getWorkspaceRecords();
for (const record of records) {
if (!record.id.startsWith(WORKSPACE_PREFIX) || !record.value)
continue;
const key = record.id.slice(WORKSPACE_PREFIX.length);
preloadCache.set(key, await hydrateWorkspace(record.value));
}
lastLoadedAt = Date.now();
lastError = null;
}
catch (error) {
lastError = error instanceof Error ? error.message : String(error);
console.warn('[xensonar][material-intake][persistent-preload]', error);
}
}
function getPreloadedMaterialIntakeState(key) {
if (!key)
return null;
return preloadCache.get(key) ?? null;
}
function materialIntakePersistenceStatus() {
return {
version: 'material-intake-persistent-v1',
cachedKeys: [...preloadCache.keys()],
pendingKeys: [...pending.keys()],
lastSavedAt,
lastLoadedAt,
lastError,
};
}
function serializeMaterialIntakeStateForTest(state) {
const { workspace, asset, assetId } = serializeState(state);
return { workspace, asset, assetId };
}
function hydrateMaterialIntakeStateForTest(workspace, asset) {
const ref = workspace?.source?.sourceAsset?.__materialIntakeAssetRef;
return {
...cloneValue(workspace),
source: workspace?.source ? { ...cloneValue(workspace.source), sourceAsset: ref ? cloneValue(asset) : cloneValue(workspace.source.sourceAsset) } : null,
};
}
}