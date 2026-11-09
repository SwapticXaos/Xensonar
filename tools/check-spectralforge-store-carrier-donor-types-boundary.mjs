#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const requireFile = (file) => { if (!fs.existsSync(file)) failures.push(`missing ${file}`); };
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing ${needle}`); };
const forbidText = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} still contains ${needle}`); };

const storePath = 'src/features/l3lab/spectralForge/state/store.ts';
const typesPath = 'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Types.ts';
const boundaryPath = 'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Boundary.ts';
const lifecyclePath = 'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Lifecycle.ts';
const storeTypesPath = 'src/features/l3lab/spectralForge/state/storeTypes.ts';

for (const file of [storePath, typesPath, boundaryPath, lifecyclePath, storeTypesPath]) requireFile(file);

const store = read(storePath);
const types = read(typesPath);
const boundary = read(boundaryPath);
const lifecycle = read(lifecyclePath);
const storeTypes = read(storeTypesPath);
const pkg = read('package.json');

for (const marker of [
  'export type V2StageStatus',
  'export type V2Fingerprint',
  'export type V2StageMeta',
  'export type CarrierDonorV2FreshnessState',
  'export interface CarrierDonorV2State',
  'transferProfile: TransferProfile;',
  'donorUseMode: CarrierDonorV2DonorUseMode;',
  'freshness: CarrierDonorV2FreshnessState;',
]) requireText('storeCarrierDonorV2Types.ts', types, marker);

for (const marker of [
  'export type {',
  'CarrierDonorV2FreshnessState,',
  'CarrierDonorV2State,',
  'V2Fingerprint,',
  'V2StageMeta,',
  'V2StageStatus,',
  "} from './storeCarrierDonorV2Types';",
  'export const useStore',
]) requireText('store.ts', store, marker);

for (const marker of [
  "import type { CarrierDonorV2State, V2Fingerprint } from './storeCarrierDonorV2Types';",
  'carrierDonorV2: CarrierDonorV2State;',
]) requireText('storeTypes.ts', storeTypes, marker);

for (const forbidden of [
  'export type V2StageStatus =',
  'export type V2Fingerprint =',
  'export type V2StageMeta =',
  'export type CarrierDonorV2FreshnessState =',
  'export interface CarrierDonorV2State {',
]) forbidText('store.ts', store, forbidden);

for (const marker of [
  "import type { CarrierDonorV2FreshnessState, CarrierDonorV2State, V2Fingerprint, V2StageMeta } from './storeCarrierDonorV2Types';",
]) requireText('storeCarrierDonorV2Boundary.ts', boundary, marker);

for (const marker of [
]) requireText('storeCarrierDonorV2Lifecycle.ts', lifecycle, marker);

forbidText('storeCarrierDonorV2Boundary.ts', boundary, "from './store';");
forbidText('storeCarrierDonorV2Lifecycle.ts', lifecycle, "from './store';");
requireText('package.json', pkg, 'xensonar:check-spectralforge-store-carrier-donor-types-boundary');

if (failures.length) {
  console.error('[spectralforge-store-carrier-donor-types-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  typesPath,
  message: 'Carrier/Donor-V2 state types are isolated from the public store orchestrator and re-exported for compatibility.',
}, null, 2));
