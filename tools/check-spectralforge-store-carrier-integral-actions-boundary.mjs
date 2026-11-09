#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const requireFile = (file) => { if (!fs.existsSync(file)) failures.push(`missing ${file}`); };
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing ${needle}`); };
const forbidText = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} still contains ${needle}`); };
const count = (content, needle) => content.split(needle).length - 1;

const storePath = 'src/features/l3lab/spectralForge/state/store.ts';
const actionsPath = 'src/features/l3lab/spectralForge/state/storeCarrierIntegralActions.ts';
const initialStatePath = 'src/features/l3lab/spectralForge/state/storeInitialState.ts';

for (const file of [storePath, actionsPath, initialStatePath]) requireFile(file);

const store = read(storePath);
const actions = read(actionsPath);
const initialState = read(initialStatePath);
const pkg = read('package.json');

for (const marker of [
  "from './storeCarrierIntegralActions'",
  '...createCarrierIntegralStoreActions(set)',
]) requireText('store.ts', store, marker);


for (const marker of [
  'carrierIntegralSelection: createInitialCarrierIntegralSelectionState()',
  'carrierIntegralSynthLab: createInitialCarrierIntegralSynthLabState()',
]) requireText('storeInitialState.ts', initialState, marker);

for (const marker of [
  'export function createInitialCarrierIntegralSelectionState',
  'export function createInitialCarrierIntegralSynthLabState',
  'export function createCarrierIntegralStoreActions',
  'export type CarrierIntegralStoreActions',
  'setCarrierIntegralSelection:',
  'resetCarrierIntegralSelection:',
  'setCarrierIntegralSynthLab:',
  'resetCarrierIntegralSynthLab:',
  'applyCarrierIntegralSelectionPatch',
  'normalizeCarrierIntegralSynthLabSelection',
  "import type { AppState } from './storeTypes';",
]) requireText('storeCarrierIntegralActions.ts', actions, marker);

for (const marker of [
  'setCarrierIntegralSelection: (patch) =>\n    set',
  'resetCarrierIntegralSelection: () =>\n    set',
  'setCarrierIntegralSynthLab: (patch) =>\n    set',
  'resetCarrierIntegralSynthLab: () =>\n    set',
  'applyCarrierIntegralSelectionPatch(state.carrierIntegralSelection',
  'normalizeCarrierIntegralSynthLabSelection({\n        ...state.carrierIntegralSynthLab',
]) forbidText('store.ts', store, marker);

for (const marker of [
  'AudioEngine',
  'Worklet',
  'rootFollowWorklet',
  'stableLane',
]) forbidText('storeCarrierIntegralActions.ts', actions, marker);

if (count(store, 'carrierIntegralSelection:') > 4) {
  failures.push(`store.ts has too many carrierIntegralSelection mutations for an actions boundary; found ${count(store, 'carrierIntegralSelection:')}`);
}
if (count(store, 'carrierIntegralSynthLab:') > 4) {
  failures.push(`store.ts has too many carrierIntegralSynthLab mutations for an actions boundary; found ${count(store, 'carrierIntegralSynthLab:')}`);
}
requireText('package.json', pkg, 'xensonar:check-spectralforge-store-carrier-integral-actions-boundary');

if (failures.length) {
  console.error('[spectralforge-store-carrier-integral-actions-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  storePath,
  actionsPath,
  message: 'SpectralForge Carrier-Integral and SynthLab store action wrappers are grouped outside store.ts without touching audio or UI paths.',
}, null, 2));
