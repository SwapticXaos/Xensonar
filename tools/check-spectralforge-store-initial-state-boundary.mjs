#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const requireFile = (file) => { if (!fs.existsSync(file)) failures.push(`missing ${file}`); };
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing ${needle}`); };
const forbidText = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} still contains ${needle}`); };

const storePath = 'src/features/l3lab/spectralForge/state/store.ts';
const initialPath = 'src/features/l3lab/spectralForge/state/storeInitialState.ts';
const typesPath = 'src/features/l3lab/spectralForge/state/storeTypes.ts';
const pkgPath = 'package.json';

for (const file of [storePath, initialPath, typesPath, pkgPath]) requireFile(file);

const store = read(storePath);
const initial = read(initialPath);
const types = read(typesPath);
const pkg = read(pkgPath);

for (const marker of [
  "import { createInitialSpectralForgeStoreState } from './storeInitialState';",
  'export {',
  'DURATION,',
  'SAMPLE_RATE,',
  'SPECTRAL_HEIGHT,',
  'SPECTRAL_WIDTH,',
  'createInitialSpectralForgeStoreState,',
  "} from './storeInitialState';",
  'export const useStore = create<AppState>',
  '...createInitialSpectralForgeStoreState()',
  '...createCarrierIntegralStoreActions(set)',
  '...createSpectralForgeEmbodimentStoreActions(set)',
  '...createCarrierDonorV2StoreActions(set)',
  '...createForge3MainSnapshotStoreActions(set, get)',
  '...createToolSettingsStoreActions(set)',
  '...createSpectralForgeProjectSnapshotStoreActions(set, get)',
  '...createForge3MinorStoreActions(set)',
  '...createMaterialExportStoreActions(set)',
  '...createSourcePreviewCommitStoreActions(set)',
  '...createForge3MainPathStoreActions(set, get)',
  '...createStampToolStoreActions(set)',
  '...createSpectralOperationStoreActions(set, get)',
]) requireText('store.ts', store, marker);

for (const marker of [
  'export const SPECTRAL_WIDTH = 2048;',
  'export const SPECTRAL_HEIGHT = 512;',
  'export const SAMPLE_RATE = 44100;',
  'export const DURATION = 10;',
  'type NonFunctionStoreKey =',
  'export type SpectralForgeStoreInitialState = Pick<AppState, NonFunctionStoreKey>;',
  'export function createInitialSpectralForgeStoreState(): SpectralForgeStoreInitialState',
  'spectralData: new SpectralData(SPECTRAL_WIDTH, SPECTRAL_HEIGHT)',
  'carrierDonorV2: createInitialCarrierDonorV2State()',
  'carrierIntegralSelection: createInitialCarrierIntegralSelectionState()',
  'carrierIntegralSynthLab: createInitialCarrierIntegralSynthLabState()',
  'embodimentLayersVisibility: createInitialEmbodimentLayerVisibility()',
  'embodimentPipelineState: createInitialEmbodimentPipelineState()',
  'undoStack: []',
  'redoStack: []',
  "activeTool: 'brush'",
  'toolProfiles: createDefaultToolProfiles()',
  "toolSettings: createDefaultToolSettings('brush')",
  '...createInitialForge3MinorState()',
  'guideMarkers: buildDefaultGuideMarkers(4)',
  '...createInitialSourcePreviewCommitState()',
  'stampData: null',
  'stampScaleX: 1',
  "stampPhase: 'idle'",
]) requireText('storeInitialState.ts', initial, marker);

for (const marker of [
  'new SpectralData(SPECTRAL_WIDTH, SPECTRAL_HEIGHT)',
  'carrierDonorV2: createInitialCarrierDonorV2State()',
  'carrierIntegralSelection: createInitialCarrierIntegralSelectionState()',
  'carrierIntegralSynthLab: createInitialCarrierIntegralSynthLabState()',
  'embodimentLayersVisibility: createInitialEmbodimentLayerVisibility()',
  'embodimentPipelineState: createInitialEmbodimentPipelineState()',
  'undoStack: []',
  'redoStack: []',
  'toolProfiles: createDefaultToolProfiles()',
  "toolSettings: createDefaultToolSettings('brush')",
  'guideMarkers: buildDefaultGuideMarkers(4)',
  "stampPhase: 'idle'",
]) forbidText('store.ts', store, marker);

for (const marker of [
  'export interface AppState',
  'spectralData: SpectralData;',
  'materialExport: MaterialExportConfig;',
  'stampPhase: StampPhase;',
]) requireText('storeTypes.ts', types, marker);

const storeLines = store.split(/\r?\n/).length;
const initialLines = initial.split(/\r?\n/).length;
if (storeLines > 110) failures.push(`store.ts still above assembly-shell threshold: ${storeLines} lines (>110)`);
if (storeLines < 60) failures.push(`store.ts unexpectedly small: ${storeLines} lines (<60)`);
if (initialLines < 70) failures.push(`storeInitialState.ts unexpectedly small: ${initialLines} lines (<70)`);
if (initialLines > 130) failures.push(`storeInitialState.ts unexpectedly large: ${initialLines} lines (>130)`);

requireText('package.json', pkg, 'xensonar:check-spectralforge-store-initial-state-boundary');

if (failures.length) {
  console.error('[spectralforge-store-initial-state-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  storePath,
  initialPath,
  storeLines,
  initialLines,
  preservedPublicImportPath: '../state/store',
}, null, 2));
