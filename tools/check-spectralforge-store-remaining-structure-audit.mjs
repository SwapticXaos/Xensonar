#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const requireFile = (file) => { if (!fs.existsSync(file)) failures.push(`missing ${file}`); };
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing ${needle}`); };
const forbidText = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} still contains ${needle}`); };

const storePath = 'src/features/l3lab/spectralForge/state/store.ts';
const initialStatePath = 'src/features/l3lab/spectralForge/state/storeInitialState.ts';
const reportPath = 'reports/SPECTRALFORGE_STORE_REMAINING_STRUCTURE_AUDIT_3.2.91.6.9.148.md';
const patchNotesPath = 'docs/PATCH_NOTES_3.2.91.6.9.148_spectralforge_store_import_hygiene_boundary.md';

for (const file of [storePath, initialStatePath, 'src/features/l3lab/spectralForge/state/storeTypes.ts', reportPath, patchNotesPath, 'package.json']) requireFile(file);

const store = read(storePath);
const storeTypes = read('src/features/l3lab/spectralForge/state/storeTypes.ts');
const initialState = read(initialStatePath);
const report = read(reportPath);
const pkg = read('package.json');

const storeLines = store.split(/\r?\n/).length;
if (storeLines > 110) failures.push(`store.ts grew beyond post-initial-state-boundary audit threshold: ${storeLines} lines (>110)`);
if (storeLines < 60) failures.push(`store.ts unexpectedly shrank below post-initial-state assembly-shell range: ${storeLines} lines (<60)`);

for (const marker of [
  "import type { AppState } from './storeTypes'",
  'export const useStore = create<AppState>',
  '...createCarrierDonorV2StoreActions(set)',
  '...createSpectralForgeEmbodimentStoreActions(set)',
  '...createCarrierIntegralStoreActions(set)',
  '...createSpectralForgeProjectSnapshotStoreActions(set, get)',
  '...createForge3MainSnapshotStoreActions(set, get)',
  '...createSpectralOperationStoreActions(set, get)',
  '...createForge3MainPathStoreActions(set, get)',
  '...createMaterialExportStoreActions(set)',
  '...createStampToolStoreActions(set)',
  '...createToolSettingsStoreActions(set)',
  '...createInitialSpectralForgeStoreState()',
  '...createSourcePreviewCommitStoreActions(set)',
  "from './storeForge3MinorActions'",
  '...createForge3MinorStoreActions(set)',
  "} from './storeTypes';",
]) requireText('store.ts', store, marker);

for (const marker of [
  'export interface AppState',
  'applyHarmonizer: (type: HarmonizerType, params?: Record<string, number>) => void',
  'export interface ForgeProjectSnapshot',
  'export interface MaterialExportConfig',
  'export interface Forge3MainSnapshot',
  'export type ToolType =',
]) requireText('storeTypes.ts', storeTypes, marker);


for (const marker of [
  'export function createInitialSpectralForgeStoreState',
  'export type SpectralForgeStoreInitialState',
  'new SpectralData(SPECTRAL_WIDTH, SPECTRAL_HEIGHT)',
  'createInitialCarrierDonorV2State()',
  'createDefaultToolProfiles()',
  "createDefaultToolSettings('brush')",
  'buildDefaultGuideMarkers(4)',
  '...createInitialSourcePreviewCommitState()',
  '...createInitialForge3MinorState()',
]) requireText('storeInitialState.ts', initialState, marker);

for (const marker of [
  'storeTypes.ts',
  'storeInitialState.ts',
  'storeCarrierDonorV2Lifecycle.ts',
  'storeCarrierDonorV2Actions.ts',
  'storeEmbodimentActions.ts',
  'storeCarrierIntegralActions.ts',
  'storeProjectSnapshotActions.ts',
  'storeForge3MainSnapshotActions.ts',
  'storeSpectralOperations.ts',
  'storeForge3MainPathActions.ts',
  'storeMaterialExportActions.ts',
  'storeStampToolActions.ts',
  'storeToolSettingsActions.ts',
  'storeSourcePreviewCommitActions.ts',
  'storeForge3MinorActions.ts',
  'Forge3-Main-Snapshot Boundary erledigt',
  'Harmonizer / Spectral Operation Boundary erledigt',
  'Clear / Reset Forge Main Path Boundary erledigt',
  'Material Export Actions Boundary erledigt',
  'Stamp Tool Actions Boundary erledigt',
  'Tool Settings Actions Boundary erledigt',
  'Source-aware Preview / Commit Context Boundary erledigt',
  'Line Tool / Render Minor Actions Boundary erledigt',
  'Verbleibende Verantwortungen',
  'Aktualisierte Schnittreihenfolge',
  'Type Boundary / Store Public Types Split erledigt',
  'Initial State Composer / Store Assembly Boundary erledigt',
  'Boundary Import Hygiene / External Import Audit erledigt',
  'SPECTRALFORGE_STORE_IMPORT_HYGIENE_AUDIT_3.2.91.6.9.148.md',
  '30 öffentliche Store-Barrel-Importstellen',
  '0 externe direkte `storeTypes.ts`-Importe',
  '0 interne Rückimporte aus `./store`',
  'Nicht als nächster Schritt',
]) requireText(reportPath, report, marker);

for (const marker of [
  'pushUndo: () => {',
  'undo: () => {',
  'redo: () => {',
  'const MAX_UNDO = 30;',
  'getForge3BodyField().restoreSnapshot(snapshot.bodySnapshot)',
  'const freq = 20 * Math.pow(1000, normalized)',
  "case 'overtones':",
  "case 'spectralBlur':",
  'getForge3BodyField().clear()',
  'resetForgeMainPath: () => {',
  'clearCanvas: () => {',
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

for (const marker of [
  '3.2.91.6.9.148_spectralforge_store_import_hygiene_boundary',
  'Keine AudioWorklet-/Stable-Lane-Änderung',
  'Import-Hygiene-Audit',
]) requireText(patchNotesPath, read(patchNotesPath), marker);

for (const marker of [
  'xensonar:check-spectralforge-store-remaining-structure-audit',
  'xensonar:check-spectralforge-store-forge3-main-snapshot-actions-boundary',
  'xensonar:check-spectralforge-store-harmonizer-operation-boundary',
  'xensonar:check-spectralforge-store-main-path-actions-boundary',
  'xensonar:check-spectralforge-store-material-export-actions-boundary',
  'xensonar:check-spectralforge-store-stamp-tool-actions-boundary',
  'xensonar:check-spectralforge-store-tool-settings-actions-boundary',
  'xensonar:check-spectralforge-store-source-preview-commit-actions-boundary',
  'xensonar:check-spectralforge-store-minor-actions-boundary',
  'xensonar:check-spectralforge-store-types-boundary',
  'xensonar:check-spectralforge-store-initial-state-boundary',
  'xensonar:check-spectralforge-store-import-hygiene-boundary',
]) requireText('package.json', pkg, marker);

if (failures.length) {
  console.error('[spectralforge-store-remaining-structure-audit] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  storePath,
  storeLines,
  reportPath,
  nextRecommendedCuts: [
    'Initial State Composer / Store Assembly Boundary erledigt',
    'Boundary Import Hygiene / External Import Audit erledigt',
  ],
}, null, 2));
