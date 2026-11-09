#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const requireFile = (file) => { if (!fs.existsSync(file)) failures.push(`missing ${file}`); };
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing ${needle}`); };
const forbidText = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} still contains ${needle}`); };
const count = (content, needle) => content.split(needle).length - 1;

const storePath = 'src/features/l3lab/spectralForge/state/store.ts';
const lifecyclePath = 'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Lifecycle.ts';
const boundaryPath = 'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Boundary.ts';
const actionsPath = 'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Actions.ts';
const initialStatePath = 'src/features/l3lab/spectralForge/state/storeInitialState.ts';

requireFile(storePath);
requireFile(lifecyclePath);
requireFile(boundaryPath);
requireFile(actionsPath);
requireFile(initialStatePath);

const store = read(storePath);
const lifecycle = read(lifecyclePath);
const boundary = read(boundaryPath);
const actions = read(actionsPath);
const initialState = read(initialStatePath);

for (const marker of [
  "from './storeCarrierDonorV2Actions'",
  '...createCarrierDonorV2StoreActions(set)',
  'export const useStore',
]) requireText('store.ts', store, marker);

for (const marker of [
  "from './storeCarrierDonorV2Lifecycle'",
  'export function createCarrierDonorV2StoreActions',
  'updateCarrierDonorV2',
  'markCarrierV2DirtyState(current, fingerprint, reason)',
  'finishCarrierSkeletonBuildState(',
  'finishDonorAnalysisBuildState(',
  'finishDonorAtlasBuildState(',
  'finishMaterialAllocationBuildState(',
  'finishBindingBuildState(',
  'recomputeCarrierDonorV2EligibilityState(current)',
  'setCarrierDonorTransferPresetState(current, presetId)',
  'setCarrierDonorTransferMacroAxesState(current, patch)',
  'setCarrierDonorV2DonorUseModeState(current, mode)',
]) requireText('storeCarrierDonorV2Actions.ts', actions, marker);

for (const marker of [
  'export function markCarrierV2DirtyState',
  'export function markDonorV2DirtyState',
  'export function beginCarrierSkeletonBuildState',
  'export function finishCarrierSkeletonBuildState',
  'export function failCarrierSkeletonBuildState',
  'export function beginDonorAnalysisBuildState',
  'export function finishDonorAnalysisBuildState',
  'export function failDonorAnalysisBuildState',
  'export function beginDonorAtlasBuildState',
  'export function finishDonorAtlasBuildState',
  'export function failDonorAtlasBuildState',
  'export function beginGestaltFieldBuildState',
  'export function finishGestaltFieldBuildState',
  'export function failGestaltFieldBuildState',
  'export function beginMaterialFieldBuildState',
  'export function finishMaterialFieldBuildState',
  'export function failMaterialFieldBuildState',
  'export function beginMaterialAllocationBuildState',
  'export function finishMaterialAllocationBuildState',
  'export function failMaterialAllocationBuildState',
  'export function beginBindingBuildState',
  'export function finishBindingBuildState',
  'export function failBindingBuildState',
  'export function recomputeCarrierDonorV2EligibilityState',
  'export function setCarrierDonorTransferPresetState',
  'export function setCarrierDonorTransferMacroAxesState',
  'export function setCarrierDonorV2DonorUseModeState',
  "import type { CarrierDonorV2State, V2Fingerprint } from './storeCarrierDonorV2Types'",
  "import { deriveCarrierDonorV2Eligibility } from './storeCarrierDonorV2Boundary'",
  'function withDerivedRenderEligibility',
]) requireText('storeCarrierDonorV2Lifecycle.ts', lifecycle, marker);

for (const marker of [
  'Carrier-Skelett wird berechnet …',
  'Kontinuitätsgraph wird berechnet …',
  'Donor-Analyse wird berechnet …',
  'Donor-Atlas wird gebildet …',
  'Gestaltfeld wird aufgebaut …',
  'Materialfeld wird aufgebaut …',
  'Materialallokation wird berechnet …',
  'Binding-Vorschau wird berechnet …',
  'Materialallokation wird mit neuem Transferprofil automatisch neu aufgebaut.',
  'Materialallokation wird mit neuen Transferwerten automatisch neu aufgebaut.',
]) forbidText('store.ts', store, marker);

for (const marker of [
  'export function createInitialCarrierDonorV2State',
  'export function deriveCarrierDonorV2Eligibility',
]) requireText('storeCarrierDonorV2Boundary.ts', boundary, marker);

if (count(store, 'createInitialCarrierDonorV2State') !== 0) {
  failures.push('store.ts should not own Carrier/Donor initial-state composition after storeInitialState boundary');
}
if (!initialState.includes('createInitialCarrierDonorV2State()')) {
  failures.push('storeInitialState.ts should own Carrier/Donor initial-state composition');
}
if (count(actions, 'createInitialCarrierDonorV2State') < 2) {
  failures.push('storeCarrierDonorV2Actions.ts should own the Carrier/Donor reset wrapper');
}
forbidText('storeCarrierDonorV2Lifecycle.ts', lifecycle, 'createInitialCarrierDonorV2State');
forbidText('storeCarrierDonorV2Lifecycle.ts', lifecycle, 'function deriveCarrierDonorV2Eligibility');
forbidText('storeCarrierDonorV2Lifecycle.ts', lifecycle, 'AudioEngine');
forbidText('storeCarrierDonorV2Lifecycle.ts', lifecycle, 'Worklet');
forbidText('storeCarrierDonorV2Lifecycle.ts', lifecycle, 'rootFollowWorklet');
forbidText('storeCarrierDonorV2Lifecycle.ts', lifecycle, 'stableLane');
forbidText('storeCarrierDonorV2Lifecycle.ts', lifecycle, 'src/App.tsx');
forbidText('store.ts', store, 'markCarrierV2DirtyState');
forbidText('store.ts', store, 'finishBindingBuildState');

if (failures.length) {
  console.error('[spectralforge-store-carrier-donor-lifecycle-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  storePath,
  lifecyclePath,
  boundaryPath,
  actionsPath,
  message: 'Carrier/Donor-V2 lifecycle transitions are isolated from the public store orchestrator.',
}, null, 2));
