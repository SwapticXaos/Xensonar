#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const requireFile = (file) => { if (!fs.existsSync(file)) failures.push(`missing ${file}`); };
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing ${needle}`); };
const forbidText = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} still contains ${needle}`); };
const count = (content, needle) => content.split(needle).length - 1;

const storePath = 'src/features/l3lab/spectralForge/state/store.ts';
const actionsPath = 'src/features/l3lab/spectralForge/state/storeEmbodimentActions.ts';
const initialStatePath = 'src/features/l3lab/spectralForge/state/storeInitialState.ts';

for (const file of [storePath, actionsPath, initialStatePath]) requireFile(file);

const store = read(storePath);
const actions = read(actionsPath);
const initialState = read(initialStatePath);
const pkg = read('package.json');

for (const marker of [
  "import { createSpectralForgeEmbodimentStoreActions } from './storeEmbodimentActions';",
  '...createSpectralForgeEmbodimentStoreActions(set)',
  '...createCarrierDonorV2StoreActions(set)',
]) requireText('store.ts', store, marker);


for (const marker of [
  'embodimentField: null,',
  "embodimentStatus: 'missing'",
  'embodimentLayersVisibility: createInitialEmbodimentLayerVisibility()',
  'embodimentPipelineState: createInitialEmbodimentPipelineState()',
]) requireText('storeInitialState.ts', initialState, marker);

for (const marker of [
  'export function createInitialEmbodimentLayerVisibility',
  'export function createInitialEmbodimentPipelineState',
  'export function createSpectralForgeEmbodimentStoreActions',
  'export type SpectralForgeEmbodimentStoreActions',
  'setActiveMediatedBody:',
  'setSpectralEmbodimentSourceAsset:',
  'setEmbodimentField:',
  'setEmbodimentStatus:',
  'setEmbodimentLayersVisibility:',
  'setEmbodimentPipelineState:',
  'clearEmbodimentField:',
  'resetEmbodimentPipeline:',
  'DEFAULT_EMBODIMENT_LAYER_VISIBILITY',
  "import type { AppState } from './storeTypes';",
]) requireText('storeEmbodimentActions.ts', actions, marker);

for (const marker of [
  'function createInitialEmbodimentLayerVisibility',
  'function createInitialEmbodimentPipelineState',
  'setEmbodimentField: (field, status =',
  'setEmbodimentStatus: (status, message) =>',
  'setEmbodimentLayersVisibility: (patch) =>',
  'setEmbodimentPipelineState: (patch) =>',
  'clearEmbodimentField: () =>\n    set',
  'resetEmbodimentPipeline: () =>\n    set',
  "DEFAULT_EMBODIMENT_LAYER_VISIBILITY",
]) forbidText('store.ts', store, marker);

for (const marker of [
  'AudioEngine',
  'Worklet',
  'rootFollowWorklet',
  'stableLane',
]) forbidText('storeEmbodimentActions.ts', actions, marker);

if (count(store, 'embodimentPipelineState:') > 2) {
  failures.push(`store.ts should not inline embodiment pipeline action mutations; found ${count(store, 'embodimentPipelineState:')} embodimentPipelineState: occurrences`);
}
requireText('package.json', pkg, 'xensonar:check-spectralforge-store-embodiment-actions-boundary');

if (failures.length) {
  console.error('[spectralforge-store-embodiment-actions-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  storePath,
  actionsPath,
  message: 'SpectralForge embodiment store action wrappers are grouped outside store.ts without touching audio or UI paths.',
}, null, 2));
