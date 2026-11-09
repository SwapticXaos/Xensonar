#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const notes = [];
function fail(message) { failures.push(message); }
function read(path) { return existsSync(path) ? readFileSync(path, 'utf8') : ''; }
function requireMissing(path) { if (existsSync(path)) fail(`${path} should not remain in the compiled live src tree`); }
function requireContains(path, text, needle) { if (!text.includes(needle)) fail(`${path} does not contain ${needle}`); }
function requireNotContains(path, text, needle) { if (text.includes(needle)) fail(`${path} must not contain ${needle}`); }

const roomPath = 'src/features/l3lab/spectralForge/SpectralForgeRoom.tsx';
const storePath = 'src/features/l3lab/spectralForge/state/store.ts';
const oldLabPath = 'docs/legacy/spectralForge/CarrierDonorLab.legacy.tsx';
const artifactBuilderPath = 'src/features/l3lab/spectralForge/embodiment/buildSpectralEmbodimentArtifacts.ts';
const legacyCarrierDonorDir = 'src/features/l3lab/spectralForge/carrierDonor';

const room = read(roomPath);
const store = read(storePath);
const oldLab = read(oldLabPath);
const artifactBuilder = read(artifactBuilderPath);

if (!room) fail(`missing ${roomPath}`);
if (!store) fail(`missing ${storePath}`);
if (!oldLab) fail(`missing ${oldLabPath}`);
if (!artifactBuilder) fail(`missing ${artifactBuilderPath}`);

for (const token of [
  'import CarrierDonorLab',
  '<CarrierDonorLab',
  'legacyAnalysisMounted',
  "workspaceMode === 'analysis'",
  'requestCarrierSync',
  'subscribeCarrierSync',
  'setCarrierDonorLabPatch',
  'resetCarrierDonorLabState',
  'carrierDonorLab',
]) requireNotContains(roomPath, room, token);

for (const token of [
  'CarrierDonorLabState',
  'carrierDonorLab',
  'setCarrierDonorLabPatch',
  'resetCarrierDonorLabState',
  '../carrierDonor/',
]) requireNotContains(storePath, store, token);

for (const token of [
  'CarrierDonorLab',
  'carrierDonorLab',
  'donorSourceAsset',
  'requestCarrierSync',
  'subscribeCarrierSync',
  'window.dispatchEvent',
  'registerMaterialExport',
  'audioEngine.',
  'playCarrierDonorV2Preview',
  'setCarrierDonorLabPatch',
]) requireNotContains(artifactBuilderPath, artifactBuilder, token);

requireMissing(legacyCarrierDonorDir);
requireContains(oldLabPath, oldLab, 'CarrierDonorLab');
notes.push('CarrierDonorLab remains as docs/legacy reference only; no compiled src carrierDonor runtime remains.');

if (failures.length) {
  console.error('[carrier-donor-lab-quarantine] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[carrier-donor-lab-quarantine] OK');
for (const note of notes) console.log(`- ${note}`);
