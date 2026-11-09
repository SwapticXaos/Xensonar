#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const requireFile = (file) => { if (!fs.existsSync(file)) failures.push(`missing ${file}`); };
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing ${needle}`); };
const forbidText = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} still contains ${needle}`); };

const storePath = 'src/features/l3lab/spectralForge/state/store.ts';
const actionsPath = 'src/features/l3lab/spectralForge/state/storeProjectSnapshotActions.ts';
const storeTypesPath = 'src/features/l3lab/spectralForge/state/storeTypes.ts';
const appPath = 'src/App.tsx';
const audioEnginePath = 'src/features/l3lab/spectralForge/audio/AudioEngine.ts';

for (const file of [storePath, actionsPath, storeTypesPath, appPath, audioEnginePath]) requireFile(file);

const store = read(storePath);
const actions = read(actionsPath);
const storeTypes = read(storeTypesPath);
const pkg = read('package.json');

for (const marker of [
  "from './storeProjectSnapshotActions'",
  '...createSpectralForgeProjectSnapshotStoreActions(set, get)',
]) requireText('store.ts', store, marker);

for (const marker of [
  'createProjectSnapshot: () => ForgeProjectSnapshot;',
  'loadProjectSnapshot: (snapshot: ForgeProjectSnapshot) => void;',
]) requireText('storeTypes.ts', storeTypes, marker);

for (const marker of [
  'export function createSpectralForgeProjectSnapshotStoreActions',
  'export type SpectralForgeProjectSnapshotStoreActions',
  'function createSpectralForgeProjectSnapshot',
  'function hydrateSpectralForgeProjectSnapshot',
  'version: \'spectral-forge-project-v1\'',
  'cloneToolProfiles(state.toolProfiles)',
  'state.spectralData.cloneData()',
  'state.spectralData.restoreData(snapshot.spectralSnapshot)',
  'hydrateToolProfiles(snapshot.toolProfiles',
  'const activeTool = snapshot.activeTool in toolProfiles ? snapshot.activeTool : \'brush\';',
  'sanitizeGuideMarkers(snapshot.materialExport.guideMarkers ?? buildDefaultGuideMarkers(snapshot.materialExport.guideSegments), snapshot.materialExport.guideSegments)',
  'beatGuideVolume: Math.max(0, Math.min(1, snapshot.materialExport.beatGuideVolume ?? 0.35))',
  "sourceAsset: null",
  "sourceAssetContext: 'none'",
  "sourcePreviewMode: 'forge'",
  "lastCommitDomain: 'none'",
  'activeMediatedBody: null',
  "forge3EditTarget: 'linked_body'",
  'renderVersion: s.renderVersion + 1',
  'audioBufferDirty: true',
  'normalizeCarrierIntegralSelection(snapshot.carrierIntegralSelection ?? null, s.carrierIntegralSelection)',
  'normalizeCarrierIntegralSynthLabSelection(snapshot.carrierIntegralSynthLab ?? null, s.carrierIntegralSynthLab)',
  "import type { AppState, ForgeProjectSnapshot, ToolSettings, ToolType } from './storeTypes';",
]) requireText('storeProjectSnapshotActions.ts', actions, marker);

for (const marker of [
  'cloneToolProfiles(state.toolProfiles)',
  'hydrateToolProfiles(snapshot.toolProfiles',
  'state.spectralData.restoreData(snapshot.spectralSnapshot)',
  'sourceMeta: state.sourceAsset ? {',
  'normalizeCarrierIntegralSelection(snapshot.carrierIntegralSelection ?? null',
  'normalizeCarrierIntegralSynthLabSelection(snapshot.carrierIntegralSynthLab ?? null',
]) forbidText('store.ts', store, marker);

for (const marker of [
  'AudioEngine',
  'Worklet',
  'rootFollowWorklet',
  'stableLane',
  'create(',
]) forbidText('storeProjectSnapshotActions.ts', actions, marker);

requireText('package.json', pkg, 'xensonar:check-spectralforge-store-project-snapshot-actions-boundary');

if (failures.length) {
  console.error('[spectralforge-store-project-snapshot-actions-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  storePath,
  actionsPath,
  message: 'SpectralForge project snapshot export and hydration actions are grouped outside store.ts without touching audio, UI, or Worklet paths.',
}, null, 2));
