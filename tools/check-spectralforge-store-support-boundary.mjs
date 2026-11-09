#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const requireFile = (file) => { if (!fs.existsSync(file)) failures.push(`missing ${file}`); };
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing ${needle}`); };
const forbidText = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} still contains ${needle}`); };

const storePath = 'src/features/l3lab/spectralForge/state/store.ts';
const storeTypesPath = 'src/features/l3lab/spectralForge/state/storeTypes.ts';
const toolPath = 'src/features/l3lab/spectralForge/state/storeToolProfiles.ts';
const materialPath = 'src/features/l3lab/spectralForge/state/storeMaterialExport.ts';
const carrierPath = 'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Boundary.ts';
const lifecyclePath = 'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Lifecycle.ts';
const actionsPath = 'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Actions.ts';
const embodimentActionsPath = 'src/features/l3lab/spectralForge/state/storeEmbodimentActions.ts';
const carrierIntegralActionsPath = 'src/features/l3lab/spectralForge/state/storeCarrierIntegralActions.ts';
const projectSnapshotActionsPath = 'src/features/l3lab/spectralForge/state/storeProjectSnapshotActions.ts';
const forge3MainSnapshotActionsPath = 'src/features/l3lab/spectralForge/state/storeForge3MainSnapshotActions.ts';
const spectralOperationsPath = 'src/features/l3lab/spectralForge/state/storeSpectralOperations.ts';
const mainPathActionsPath = 'src/features/l3lab/spectralForge/state/storeForge3MainPathActions.ts';
const materialExportActionsPath = 'src/features/l3lab/spectralForge/state/storeMaterialExportActions.ts';
const stampToolActionsPath = 'src/features/l3lab/spectralForge/state/storeStampToolActions.ts';
const toolSettingsActionsPath = 'src/features/l3lab/spectralForge/state/storeToolSettingsActions.ts';
const sourcePreviewCommitActionsPath = 'src/features/l3lab/spectralForge/state/storeSourcePreviewCommitActions.ts';
const minorActionsPath = 'src/features/l3lab/spectralForge/state/storeForge3MinorActions.ts';
const initialStatePath = 'src/features/l3lab/spectralForge/state/storeInitialState.ts';
const remainingStructureAuditPath = 'reports/SPECTRALFORGE_STORE_REMAINING_STRUCTURE_AUDIT_3.2.91.6.9.148.md';
const importHygieneAuditPath = 'reports/SPECTRALFORGE_STORE_IMPORT_HYGIENE_AUDIT_3.2.91.6.9.148.md';

requireFile(storePath);
requireFile(storeTypesPath);
requireFile(toolPath);
requireFile(materialPath);
requireFile(carrierPath);
requireFile(lifecyclePath);
requireFile(actionsPath);
requireFile(embodimentActionsPath);
requireFile(carrierIntegralActionsPath);
requireFile(projectSnapshotActionsPath);
requireFile(forge3MainSnapshotActionsPath);
requireFile(spectralOperationsPath);
requireFile(mainPathActionsPath);
requireFile(materialExportActionsPath);
requireFile(stampToolActionsPath);
requireFile(toolSettingsActionsPath);
requireFile(initialStatePath);
requireFile(remainingStructureAuditPath);
requireFile(importHygieneAuditPath);

const store = read(storePath);
const storeTypes = read(storeTypesPath);
const tool = read(toolPath);
const material = read(materialPath);
const carrier = read(carrierPath);
const lifecycle = read(lifecyclePath);
const actions = read(actionsPath);
const embodimentActions = read(embodimentActionsPath);
const carrierIntegralActions = read(carrierIntegralActionsPath);
const projectSnapshotActions = read(projectSnapshotActionsPath);
const forge3MainSnapshotActions = read(forge3MainSnapshotActionsPath);
const spectralOperations = read(spectralOperationsPath);
const mainPathActions = read(mainPathActionsPath);
const materialExportActions = read(materialExportActionsPath);
const stampToolActions = read(stampToolActionsPath);
const toolSettingsActions = read(toolSettingsActionsPath);
const sourcePreviewCommitActions = read(sourcePreviewCommitActionsPath);
const minorActions = read(minorActionsPath);
const initialState = read(initialStatePath);
const remainingStructureAudit = read(remainingStructureAuditPath);
const importHygieneAudit = read(importHygieneAuditPath);

for (const marker of [
  "from './storeToolProfiles'",
  "from './storeMaterialExport'",
  "from './storeCarrierDonorV2Boundary'",
  "from './storeTypes'",
  'ToolType,',
  'ToolSettings,',
  'ToolProfiles,',
  'MaterialExportConfig,',
  'CarrierDonorV2State,',
  'export const useStore',
  "from './storeInitialState'",
  'createInitialSpectralForgeStoreState',
  '...createInitialSpectralForgeStoreState()',
  "from './storeCarrierDonorV2Actions'",
  "from './storeEmbodimentActions'",
  "from './storeCarrierIntegralActions'",
  "from './storeProjectSnapshotActions'",
  "from './storeForge3MainSnapshotActions'",
  "from './storeSpectralOperations'",
  "from './storeForge3MainPathActions'",
  "from './storeMaterialExportActions'",
  "from './storeStampToolActions'",
  "from './storeToolSettingsActions'",
  '...createSpectralForgeProjectSnapshotStoreActions(set, get)',
  '...createForge3MainSnapshotStoreActions(set, get)',
  '...createSpectralOperationStoreActions(set, get)',
  '...createForge3MainPathStoreActions(set, get)',
  '...createMaterialExportStoreActions(set)',
  '...createStampToolStoreActions(set)',
  '...createToolSettingsStoreActions(set)',
  "from './storeSourcePreviewCommitActions'",
  '...createSourcePreviewCommitStoreActions(set)',
  "from './storeForge3MinorActions'",
  '...createForge3MinorStoreActions(set)',
]) requireText('store.ts', store, marker);


for (const marker of [
  'export function createInitialSpectralForgeStoreState',
  'export type SpectralForgeStoreInitialState',
  'new SpectralData(SPECTRAL_WIDTH, SPECTRAL_HEIGHT)',
  'createInitialCarrierDonorV2State()',
  'createInitialCarrierIntegralSelectionState()',
  'createInitialCarrierIntegralSynthLabState()',
  'createInitialEmbodimentLayerVisibility()',
  'createInitialEmbodimentPipelineState()',
  'createDefaultToolProfiles()',
  "createDefaultToolSettings('brush')",
  '...createInitialForge3MinorState()',
  'buildDefaultGuideMarkers(4)',
  '...createInitialSourcePreviewCommitState()',
  "stampPhase: 'idle'",
]) requireText('storeInitialState.ts', initialState, marker);

for (const marker of [
  'new SpectralData(SPECTRAL_WIDTH, SPECTRAL_HEIGHT)',
  'createInitialCarrierDonorV2State()',
  'createInitialCarrierIntegralSelectionState()',
  'createInitialCarrierIntegralSynthLabState()',
  'createInitialEmbodimentLayerVisibility()',
  'createInitialEmbodimentPipelineState()',
  'createDefaultToolProfiles()',
  "createDefaultToolSettings('brush')",
  'buildDefaultGuideMarkers(4)',
  "stampPhase: 'idle'",
]) forbidText('store.ts', store, marker);

for (const marker of [
  'createDefaultToolSettings',
  'createDefaultToolProfiles',
  'mergeToolSettings',
  'hydrateToolProfiles',
  'cloneToolProfiles',
  "import type { ToolProfiles, ToolSettings, ToolType } from './storeTypes'",
]) requireText('storeToolProfiles.ts', tool, marker);

for (const marker of [
  'clampBars',
  'clampGuideSegments',
  'buildDefaultGuideMarkers',
  'sanitizeGuideMarkers',
  'computeLoopDurationSec',
]) requireText('storeMaterialExport.ts', material, marker);

for (const marker of [
  'createMaterialExportStoreActions',
  'updateMaterialExportConfig',
  'setMaterialExportGuideMarker',
  "import type { AppState, MaterialExportConfig } from './storeTypes'",
]) requireText('storeMaterialExportActions.ts', materialExportActions, marker);

for (const marker of [
  'export function clampStampScale',
  'export function wrapStampRotation',
  'export function createStampDataState',
  'export function setStampScaleState',
  'export function adjustStampScaleState',
  'export function rotateStampState',
  'export function setStampRotationState',
  'export function resetStampTransformState',
  'export function createStampToolStoreActions',
]) requireText('storeStampToolActions.ts', stampToolActions, marker);

for (const marker of [
  'export type ToolSettingsHostState',
  'export type ToolSettingsStoreActions',
  'export function setActiveToolState',
  'export function updateActiveToolSettingsState',
  'export function toggleEraseModeState',
  'export function createToolSettingsStoreActions',
]) requireText('storeToolSettingsActions.ts', toolSettingsActions, marker);

for (const marker of [
  'createInitialCarrierDonorV2Freshness',
  'buildCarrierInputFingerprint',
  'buildDonorInputFingerprint',
  'deriveCarrierDonorV2Eligibility',
  'createInitialCarrierDonorV2State',
  "import type { CarrierDonorV2FreshnessState, CarrierDonorV2State, V2Fingerprint, V2StageMeta } from './storeCarrierDonorV2Types'",
  'DEFAULT_CARRIER_DONOR_V2_DONOR_USE_MODE',
  'deriveTransferProfile',
]) requireText('storeCarrierDonorV2Boundary.ts', carrier, marker);

for (const marker of [
  'markCarrierV2DirtyState',
  'finishBindingBuildState',
  'setCarrierDonorTransferPresetState',
  'deriveCarrierDonorV2Eligibility(next)',
  'withDerivedRenderEligibility',
]) requireText('storeCarrierDonorV2Lifecycle.ts', lifecycle, marker);

for (const marker of [
  'export function createCarrierDonorV2StoreActions',
  'updateCarrierDonorV2',
  'markCarrierV2DirtyState(current, fingerprint, reason)',
  'finishCarrierSkeletonBuildState(',
  'finishMaterialAllocationBuildState(',
  'setCarrierDonorTransferPresetState(current, presetId)',
]) requireText('storeCarrierDonorV2Actions.ts', actions, marker);

for (const marker of [
  'export function createSpectralForgeEmbodimentStoreActions',
  'export function createInitialEmbodimentLayerVisibility',
  'export function createInitialEmbodimentPipelineState',
  'setEmbodimentField:',
  'setEmbodimentPipelineState:',
  'resetEmbodimentPipeline:',
]) requireText('storeEmbodimentActions.ts', embodimentActions, marker);

for (const marker of [
  'export function createCarrierIntegralStoreActions',
  'export function createInitialCarrierIntegralSelectionState',
  'export function createInitialCarrierIntegralSynthLabState',
  'setCarrierIntegralSelection:',
  'setCarrierIntegralSynthLab:',
  'resetCarrierIntegralSynthLab:',
]) requireText('storeCarrierIntegralActions.ts', carrierIntegralActions, marker);

for (const marker of [
  'Forge3-Main-Snapshot Boundary erledigt',
  'Harmonizer / Spectral Operation Boundary erledigt',
  'Clear / Reset Forge Main Path Boundary erledigt',
  'Stamp Tool Actions Boundary erledigt',
  'Material Export Actions Boundary erledigt',
  'Source-aware Preview / Commit Context Boundary erledigt',
  'Line Tool / Render Minor Actions Boundary erledigt',
  'Initial State Composer / Store Assembly Boundary erledigt',
  'Boundary Import Hygiene / External Import Audit erledigt',
]) requireText('remaining structure audit', remainingStructureAudit, marker);

for (const marker of [
  'Boundary Import Hygiene / External Import Audit',
  'Keine externen Direktexporte aus `storeTypes.ts`',
  '30 öffentliche Store-Barrel-Importstellen',
  '0 externe direkte `storeTypes.ts`-Importe',
  '0 interne Rückimporte aus `./store`',
]) requireText('import hygiene audit', importHygieneAudit, marker);


for (const marker of [
  'export function clearForge3MainCanvas',
  'export function resetForge3MainPathState',
  'export function createForge3MainPathStoreActions',
  'getForge3BodyField().clear()',
  'state.spectralData.clear()',
  "sourceAssetContext: 'none'",
  "sourcePreviewMode: 'forge'",
  "lastCommitDomain: 'none'",
]) requireText('storeForge3MainPathActions.ts', mainPathActions, marker);

for (const marker of [
  'export type HarmonizerType',
  'export function applySpectralHarmonizerToData',
  'export function createSpectralOperationStoreActions',
  'applySpectralHarmonizerToData(spectralData, type, params)',
]) requireText('storeSpectralOperations.ts', spectralOperations, marker);


for (const marker of [
  'export type Forge3MinorState',
  'export type Forge3MinorStoreActions',
  'export function createInitialForge3MinorState',
  'export function setViewPortState',
  'export function setWaveformMixState',
  'export function setRenderColorMapState',
  'export function setShowGrainLayerState',
  'export function setLogScaleState',
  'export function triggerRenderState',
  'export function createForge3MinorStoreActions',
]) requireText('storeForge3MinorActions.ts', minorActions, marker);

for (const marker of [
  'export function createSpectralForgeProjectSnapshotStoreActions',
  'function createSpectralForgeProjectSnapshot',
  'function hydrateSpectralForgeProjectSnapshot',
  'cloneToolProfiles(state.toolProfiles)',
  'hydrateToolProfiles(snapshot.toolProfiles',
  'sanitizeGuideMarkers(snapshot.materialExport.guideMarkers',
  'normalizeCarrierIntegralSelection(snapshot.carrierIntegralSelection ?? null',
  'normalizeCarrierIntegralSynthLabSelection(snapshot.carrierIntegralSynthLab ?? null',
]) requireText('storeProjectSnapshotActions.ts', projectSnapshotActions, marker);


for (const marker of [
  'export function createForge3MainSnapshotStoreActions',
  'function captureForge3MainSnapshot(state: AppState): Forge3MainSnapshot',
  'function restoreForge3MainSnapshot(snapshot: Forge3MainSnapshot, state: AppState): Partial<AppState>',
  'getForge3BodyField().captureSnapshot()',
  'getForge3BodyField().restoreSnapshot(snapshot.bodySnapshot)',
  'state.spectralData.restoreData(snapshot.spectralSnapshot)',
  'renderVersion: state.renderVersion + 1',
  'audioBufferDirty: true',
]) requireText('storeForge3MainSnapshotActions.ts', forge3MainSnapshotActions, marker);

for (const marker of [
  'function createBaseToolSettings',
  'export function createDefaultToolSettings',
  'export function hydrateToolProfiles',
  'function cloneToolProfiles',
  'export function clampBars',
  'export function computeLoopDurationSec',
  'function createInitialV2StageMeta',
  'function createInitialEmbodimentLayerVisibility',
  'function createInitialEmbodimentPipelineState',
  'function createInitialCarrierIntegralSelectionState',
  'function createInitialCarrierIntegralSynthLabState',
  'export function buildCarrierInputFingerprint',
  'function deriveCarrierDonorV2Eligibility',
  'function createInitialCarrierDonorV2State',
  'function createSpectralForgeProjectSnapshot',
  'function hydrateSpectralForgeProjectSnapshot',
  'function captureForge3MainSnapshot',
  'function restoreForge3MainSnapshot',
  'const MAX_UNDO = 30;',
  'const freq = 20 * Math.pow(1000, normalized)',
  "case 'overtones':",
  "case 'spectralBlur':",
  'getForge3BodyField().clear()',
  'resetForgeMainPath: () => {',
  'clearCanvas: () => {',
  'cloneToolProfiles(state.toolProfiles)',
  'hydrateToolProfiles(snapshot.toolProfiles',
  'normalizeCarrierIntegralSelection(snapshot.carrierIntegralSelection ?? null',
  'normalizeCarrierIntegralSynthLabSelection(snapshot.carrierIntegralSynthLab ?? null',
  'const nextBars = patch.bars !== undefined',
  'const nextSegments = patch.guideSegments !== undefined',
  'const shouldResetMarkers = patch.guideSegments !== undefined',
  'const nextBeatGuideVolume = patch.beatGuideVolume !== undefined',
  'const nextMarkers = state.materialExport.guideMarkers.slice()',
  'Math.max(0.1, Math.min(8, scaleX))',
  'Math.max(0.1, Math.min(8, state.stampScaleX + dx))',
  'const twoPi = Math.PI * 2',
  'toggleStampFlipX: () => set((state) => ({ stampFlipX: !state.stampFlipX }))',
  'toggleStampFlipY: () => set((state) => ({ stampFlipY: !state.stampFlipY }))',
  'setActiveTool: (tool) => set((state) => ({',
  'toolSettings: mergeToolSettings(tool, state.toolProfiles[tool])',
  'const nextToolSettings = mergeToolSettings(state.activeTool, { ...state.toolSettings, ...settings })',
  'eraseMode: !state.toolSettings.eraseMode',
  'setSourceAsset: (asset, context) => set({',
  "sourcePreviewMode: asset ? get().sourcePreviewMode : 'forge'",
  'setSourcePreviewMode: (mode) => set({ sourcePreviewMode: mode })',
  'setLastCommitDomain: (domain) => set({ lastCommitDomain: domain })',
  'setForge3EditTarget: (target) => set({ forge3EditTarget: target })',
  'setViewPort: (vp) =>',
  'setIsPlaying: (playing) => set({ isPlaying: playing })',
  'setPlayheadPosition: (pos) => set({ playheadPosition: pos })',
  'setShowPlayheadMarker: (show) => set({ showPlayheadMarker: show })',
  'setSynthMode: (mode) => set({ synthMode: mode })',
  'setWaveformMix: (mix) =>',
  'setColorMapName: (name) => set({ colorMapName: name, renderVersion: get().renderVersion + 1 })',
  'setShowGrainLayer: (show) => set({ showGrainLayer: show, renderVersion: get().renderVersion + 1 })',
  'setLogScale: (log) => set({ logScale: log, renderVersion: get().renderVersion + 1 })',
  'triggerRender: () => set((s) => ({ renderVersion: s.renderVersion + 1 }))',
  'setLineStart: (pos) => set({ lineStart: pos })',
  'setAudioBufferDirty: (dirty) => set({ audioBufferDirty: dirty })',
]) forbidText('store.ts', store, marker);

if (/src\/App\.tsx/.test(read('reports/xensonar-parallel-refactor-sanity.md'))) {
  // Deliberately no failure: reports may mention App boundary. Kept as a non-operative reminder.
}

if (failures.length) {
  console.error('[spectralforge-store-support-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  storePath,
  boundaries: [toolPath, toolSettingsActionsPath, sourcePreviewCommitActionsPath, minorActionsPath, materialPath, materialExportActionsPath, stampToolActionsPath, carrierPath, lifecyclePath, actionsPath, embodimentActionsPath, carrierIntegralActionsPath, projectSnapshotActionsPath, forge3MainSnapshotActionsPath, spectralOperationsPath, mainPathActionsPath],
  audit: remainingStructureAuditPath,
  importHygieneAudit: importHygieneAuditPath,
}, null, 2));
