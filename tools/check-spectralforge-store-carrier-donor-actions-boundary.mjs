#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const requireFile = (file) => { if (!fs.existsSync(file)) failures.push(`missing ${file}`); };
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing ${needle}`); };
const forbidText = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} still contains ${needle}`); };
const count = (content, needle) => content.split(needle).length - 1;

const storePath = 'src/features/l3lab/spectralForge/state/store.ts';
const actionsPath = 'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Actions.ts';
const lifecyclePath = 'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Lifecycle.ts';
const typesPath = 'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Types.ts';

for (const file of [storePath, actionsPath, lifecyclePath, typesPath]) requireFile(file);

const store = read(storePath);
const actions = read(actionsPath);
const lifecycle = read(lifecyclePath);
const pkg = read('package.json');

for (const marker of [
  "import { createCarrierDonorV2StoreActions } from './storeCarrierDonorV2Actions';",
  '...createCarrierDonorV2StoreActions(set)',
  "import type { AppState } from './storeTypes'",
  'export const useStore',
]) requireText('store.ts', store, marker);

for (const marker of [
  'export function createCarrierDonorV2StoreActions',
  'export type CarrierDonorV2StoreActions',
  "import type { AppState } from './storeTypes';",
  "import type { CarrierDonorV2State } from './storeCarrierDonorV2Types';",
  "from './storeCarrierDonorV2Lifecycle'",
  'const updateCarrierDonorV2',
  'setCarrierDonorV2Patch:',
  'resetCarrierDonorV2State:',
  'beginCarrierSkeletonBuild:',
  'finishCarrierSkeletonBuild:',
  'beginMaterialAllocationBuild:',
  'finishMaterialAllocationBuild:',
  'recomputeCarrierDonorV2Eligibility:',
  'setCarrierDonorTransferPreset:',
  'setCarrierDonorTransferMacroAxes:',
  'setCarrierDonorV2DonorUseMode:',
]) requireText('storeCarrierDonorV2Actions.ts', actions, marker);

for (const marker of [
  'export function beginCarrierSkeletonBuildState',
  'export function finishMaterialAllocationBuildState',
  'export function setCarrierDonorTransferPresetState',
]) requireText('storeCarrierDonorV2Lifecycle.ts', lifecycle, marker);

forbidText('store.ts', store, "from './storeCarrierDonorV2Lifecycle'");
forbidText('store.ts', store, 'markCarrierV2DirtyState');
forbidText('store.ts', store, 'finishCarrierSkeletonBuildState');
forbidText('store.ts', store, 'finishMaterialAllocationBuildState');
forbidText('store.ts', store, 'setCarrierDonorTransferPresetState');
forbidText('storeCarrierDonorV2Actions.ts', actions, 'AudioEngine');
forbidText('storeCarrierDonorV2Actions.ts', actions, 'Worklet');
forbidText('storeCarrierDonorV2Actions.ts', actions, 'rootFollowWorklet');
forbidText('storeCarrierDonorV2Actions.ts', actions, 'stableLane');

if (count(store, 'carrierDonorV2:') > 2) {
  failures.push(`store.ts should not inline Carrier/Donor-V2 action wrapper mutations; found ${count(store, 'carrierDonorV2:')} carrierDonorV2: occurrences`);
}
if (count(actions, 'carrierDonorV2:') < 2) {
  failures.push('storeCarrierDonorV2Actions.ts should own Carrier/Donor-V2 store mutations');
}
requireText('package.json', pkg, 'xensonar:check-spectralforge-store-carrier-donor-actions-boundary');

if (failures.length) {
  console.error('[spectralforge-store-carrier-donor-actions-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  storePath,
  actionsPath,
  lifecyclePath,
  message: 'Carrier/Donor-V2 store action wrappers are grouped outside store.ts while lifecycle transitions remain pure.',
}, null, 2));
