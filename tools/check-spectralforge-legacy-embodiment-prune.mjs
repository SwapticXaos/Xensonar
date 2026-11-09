#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
function fail(message) { failures.push(message); }
function read(path) { return existsSync(path) ? readFileSync(path, 'utf8') : ''; }
function requireMissing(path) { if (existsSync(path)) fail(`${path} should be pruned`); }
function requireNotContains(path, text, needle) { if (text.includes(needle)) fail(`${path} still contains legacy token: ${needle}`); }
function requireContains(path, text, needle) { if (!text.includes(needle)) fail(`${path} misses required token: ${needle}`); }

const pkg = JSON.parse(read('package.json'));
const expectedVersion = String(pkg.version ?? '').trim();
if (!expectedVersion) fail('package version is empty');

const legacyFiles = [
  'src/features/l3lab/spectralForge/carrierDonor',
  'src/features/l3lab/spectralForge/audio/buildContinuousDonorVoicePlan.ts',
  'src/features/l3lab/spectralForge/audio/buildEmbodimentVoicePlan.ts',
  'src/features/l3lab/spectralForge/audio/buildNeutralAuditionNotes.ts',
  'src/features/l3lab/spectralForge/audio/buildOrderedPrimaryVoicePlan.ts',
  'src/features/l3lab/spectralForge/audio/renderDonorModelAuditionToBuffer.ts',
  'src/features/l3lab/spectralForge/audio/renderEmbodimentPreviewToBuffer.ts',
  'src/features/l3lab/spectralForge/body/buildBodyFromEmbodimentPreview.ts',
  'src/features/l3lab/spectralForge/embodiment/allocateBodyLayer.ts',
  'src/features/l3lab/spectralForge/embodiment/allocateDonorOntoScaffold.ts',
  'src/features/l3lab/spectralForge/embodiment/allocateOrderedLayer.ts',
  'src/features/l3lab/spectralForge/embodiment/allocateResidualLayer.ts',
  'src/features/l3lab/spectralForge/embodiment/allocateTransientLayer.ts',
  'src/features/l3lab/spectralForge/embodiment/buildCarrierScaffold.ts',
  'src/features/l3lab/spectralForge/embodiment/buildCarrierVoices.ts',
  'src/features/l3lab/spectralForge/embodiment/buildDonorInstrumentModel.ts',
  'src/features/l3lab/spectralForge/embodiment/buildEmbodimentField.ts',
  'src/features/l3lab/spectralForge/embodiment/buildEmbodimentPreviewModel.ts',
  'src/features/l3lab/spectralForge/embodiment/buildTimelessTimbreReservoir.ts',
  'src/features/l3lab/spectralForge/embodiment/commitEmbodimentToBody.ts',
  'src/features/l3lab/spectralForge/embodiment/deterministicVoiceIdentity.ts',
  'src/features/l3lab/spectralForge/embodiment/evaluateEmbodimentValidation.ts',
  'src/features/l3lab/spectralForge/embodiment/extractDonorMaterialModel.ts',
  'src/features/l3lab/spectralForge/embodiment/instantiateDonorAcrossCarrierVoices.ts',
  'src/features/l3lab/spectralForge/embodiment/helpers',
  'src/features/l3lab/spectralForge/types/embodimentAllocationTypes.ts',
  'src/features/l3lab/spectralForge/types/embodimentCommitTypes.ts',
  'src/features/l3lab/spectralForge/types/embodimentDonorTypes.ts',
  'src/features/l3lab/spectralForge/types/embodimentPreviewTypes.ts',
  'src/features/l3lab/spectralForge/types/embodimentScaffoldTypes.ts',
  'src/features/l3lab/spectralForge/types/embodimentValidationTypes.ts',
  'src/features/l3lab/spectralForge/types/embodimentVoiceTypes.ts',
];
for (const file of legacyFiles) requireMissing(file);

const store = read('src/features/l3lab/spectralForge/state/store.ts');
const room = read('src/features/l3lab/spectralForge/SpectralForgeRoom.tsx');
const panel = read('src/features/l3lab/spectralForge/components/EmbodimentFieldPanel.tsx');
const audioEngine = read('src/features/l3lab/spectralForge/audio/AudioEngine.ts');
const fieldTypes = read('src/features/l3lab/spectralForge/types/embodimentFieldTypes.ts');

for (const [path, text] of [
  ['src/features/l3lab/spectralForge/state/store.ts', store],
  ['src/features/l3lab/spectralForge/SpectralForgeRoom.tsx', room],
  ['src/features/l3lab/spectralForge/components/EmbodimentFieldPanel.tsx', panel],
  ['src/features/l3lab/spectralForge/audio/AudioEngine.ts', audioEngine],
  ['src/features/l3lab/spectralForge/types/embodimentFieldTypes.ts', fieldTypes],
]) {
  for (const token of [
    'extractedTimbreModel',
    'donorMaterialModel',
    'donorInstrumentModel',
    'carrierScaffold',
    'embodimentAllocation',
    'embodimentPreview',
    'commitTarget',
    'embodimentAuditionMode',
    'EmbodimentPreviewModel',
    'DonorMaterialModel',
    'CarrierScaffold',
    'EmbodimentValidationReport',
    'ExtractedTimbreModel',
  ]) requireNotContains(path, text, token);
}

requireContains('src/features/l3lab/spectralForge/embodiment/buildV2EmbodimentField.ts', read('src/features/l3lab/spectralForge/embodiment/buildV2EmbodimentField.ts'), 'export function buildV2EmbodimentField');
requireContains('src/features/l3lab/spectralForge/embodiment/buildSpectralEmbodimentArtifacts.ts', read('src/features/l3lab/spectralForge/embodiment/buildSpectralEmbodimentArtifacts.ts'), 'export function buildSpectralEmbodimentArtifacts');
requireContains('src/features/l3lab/spectralForge/audio/AudioEngine.ts', audioEngine, 'playCarrierDonorV2Preview');
requireNotContains('src/features/l3lab/spectralForge/audio/AudioEngine.ts', audioEngine, 'playEmbodimentPreview');
requireNotContains('src/features/l3lab/spectralForge/audio/AudioEngine.ts', audioEngine, 'playDonorModelAuditionPreview');

if (failures.length) {
  console.error('[spectralforge-legacy-embodiment-prune] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[spectralforge-legacy-embodiment-prune] OK');
console.log(JSON.stringify({ version: expectedVersion, legacyFilesPruned: legacyFiles.length }, null, 2));
