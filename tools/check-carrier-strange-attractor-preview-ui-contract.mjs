#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const rel = {
  panel: 'src/features/l3lab/spectralForge/components/CarrierIntegralVerwaltenPanel.tsx',
  previewRoutes: 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralPreviewExportRoutes.ts',
  rawHandoff: 'src/features/l3lab/spectralForge/integral/carrierIntegralRawMelodicMaterialHandoff.ts',
  ui: 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralMachineUi.ts',
  registry: 'src/features/l3lab/spectralForge/integral/carrierIntegralRegistry.ts',
  contracts: 'src/features/l3lab/spectralForge/integral/carrierIntegralContracts.ts',
  renderer: 'src/features/l3lab/spectralForge/integral/carrierStrangeAttractorPreviewRenderer.ts',
  probe: 'src/features/l3lab/spectralForge/integral/carrierStrangeAttractorPreviewProbe.ts',
  pkg: 'package.json',
};
function read(file) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) {
    failures.push(`${file} missing`);
    return '';
  }
  return fs.readFileSync(abs, 'utf8');
}
function requireIncludes(label, text, marker) {
  if (!text.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
}
function requireAbsent(label, text, marker) {
  if (text.includes(marker)) failures.push(`${label} must not contain marker: ${marker}`);
}

const panel = read(rel.panel);
const previewRoutes = read(rel.previewRoutes);
const rawHandoff = read(rel.rawHandoff);
const ui = read(rel.ui);
const registry = read(rel.registry);
const contracts = read(rel.contracts);
const renderer = read(rel.renderer);
const probe = read(rel.probe);
const pkg = JSON.parse(read(rel.pkg) || '{}');

for (const marker of [
  '"strange-attractor-schwarmkoerper"',
  'previewThroughMachine(selectedProject, machineId)',
  'previewStrangeAttractorSchwarmProbe',
  'audioEngine.playRenderedAudioBufferPreview',
]) requireIncludes(rel.panel, panel, marker);

for (const marker of [
  "machineId === 'strange-attractor-schwarmkoerper'",
  'buildStrangeAttractorCarrierPlanFromSpectralData',
  'renderStrangeAttractorCarrierPlanToStereoSamples',
  'createStrangeAttractorPreviewAudioBufferFromStereoSamples',
  'recordCarrierStrangeAttractorPreviewProbe',
]) requireIncludes(rel.previewRoutes, previewRoutes, marker);

for (const marker of [
  "'strange-attractor-schwarmkoerper'",
  "'attractor-swarm-machine'",
  "'attractor_schwarm'",
  "'attractor-schwarm-body'",
]) requireIncludes(rel.contracts, contracts, marker);

for (const marker of [
  "id: 'strange-attractor-schwarmkoerper'",
  "family: 'attractor-swarm-machine'",
  "bodySourceModes: ['attractor_schwarm']",
]) requireIncludes(rel.registry, registry, marker);

for (const marker of [
  '"strange-attractor-schwarmkoerper"',
  'Attraktor-Schwarm',
  'Strange Attractor',
]) requireIncludes(rel.ui, ui, marker);

for (const forbidden of [
  'data-xensonar-carrier-strange-attractor-preview-surface="true"',
  'data-xensonar-carrier-strange-attractor-preview-button="true"',
  'spectralForgeAudioCutUpload',
  'rootTransposeSemitones',
  'differentiationStrength',
]) requireAbsent(rel.panel, panel, forbidden);

requireIncludes(rel.renderer, renderer, 'renderStrangeAttractorCarrierPlanToStereoSamples');
requireIncludes(rel.registry, registry, "'melodic-pink-export': true");
requireIncludes(rel.rawHandoff, rawHandoff, '"strange-attractor-schwarmkoerper"');
requireAbsent(rel.renderer, renderer, 'bodyRatio');
requireIncludes(rel.probe, probe, 'carrier-menu-machine-registered');

if (pkg.scripts?.['xensonar:check-carrier-strange-attractor-preview-ui-contract'] !== 'node tools/check-carrier-strange-attractor-preview-ui-contract.mjs') {
  failures.push('package script missing: xensonar:check-carrier-strange-attractor-preview-ui-contract');
}

if (failures.length) {
  console.error('[carrier-strange-attractor-preview-ui-contract] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('[xensonar] Carrier Strange Attractor preview UI contract: grün');
console.log('  Schwarmkörper ist normaler Carrier-Vorhörbutton; Melodic Raw-Audio-Handoff nutzt denselben hörbaren Schwarmkörper.');
