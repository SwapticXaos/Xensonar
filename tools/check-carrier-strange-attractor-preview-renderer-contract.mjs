#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const rel = {
  renderer: 'src/features/l3lab/spectralForge/integral/carrierStrangeAttractorPreviewRenderer.ts',
  previewProbe: 'src/features/l3lab/spectralForge/integral/carrierStrangeAttractorPreviewProbe.ts',
  index: 'src/features/l3lab/spectralForge/integral/index.ts',
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
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}
function requireIncludes(label, text, marker) {
  if (!text.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
}
function requireAbsentRegex(label, text, pattern) {
  if (pattern.test(text)) failures.push(`${label} must not match ${pattern}`);
}

const renderer = read(rel.renderer);
const rendererCode = stripComments(renderer);
const previewProbe = read(rel.previewProbe);
const previewProbeCode = stripComments(previewProbe);
const index = read(rel.index);
const pkg = JSON.parse(read(rel.pkg) || '{}');

for (const marker of [
  'CARRIER_STRANGE_ATTRACTOR_PREVIEW_RENDERER_VERSION',
  'renderStrangeAttractorCarrierPlanToStereoSamples',
  'renderStrangeAttractorCarrierPlanToAudioBuffer',
  'createStrangeAttractorPreviewAudioBufferFromStereoSamples',
  'renderDroneBody',
  'renderSwarmEvents',
  'resolveFamilyWave',
  "case 'drift'",
  "case 'orbit'",
  "case 'spray'",
  "case 'cluster'",
  'StrangeAttractorPreviewRenderStats',
]) requireIncludes(rel.renderer, renderer, marker);

for (const marker of [
  'CARRIER_STRANGE_ATTRACTOR_PREVIEW_PROBE_VERSION',
  '__xensonarReadCarrierStrangeAttractorPreviewProbe',
  '__xensonarPreviewCarrierStrangeAttractorFixture',
  'recordCarrierStrangeAttractorPreviewProbe',
  'preview-only',
  'host-audio-buffer-render',
  'no-materialschmiede-import',
  'no-synthetic-forge-or-melodic-loop-export',
  'no-iframe-capture-bridge',
]) requireIncludes(rel.previewProbe, previewProbe, marker);

for (const marker of [
  "export * from './carrierStrangeAttractorPreviewRenderer';",
  "export * from './carrierStrangeAttractorPreviewProbe';",
]) requireIncludes(rel.index, index, marker);

for (const forbidden of [
  /openCanonicalMelodicLoop/,
  /spectralForgeAudioCutUpload/,
  /postMessage\s*\(/,
  /iframe/i,
  /MaterialschmiedeImport/,
]) requireAbsentRegex(rel.renderer, rendererCode, forbidden);

for (const forbidden of [
  /openCanonicalMelodicLoop/,
  /spectralForgeAudioCutUpload/,
  /postMessage\s*\(/,
  /MaterialschmiedeImport/,
]) requireAbsentRegex(rel.previewProbe, previewProbeCode, forbidden);

if (pkg.scripts?.['xensonar:check-carrier-strange-attractor-preview-renderer-contract'] !== 'node tools/check-carrier-strange-attractor-preview-renderer-contract.mjs') {
  failures.push('package script missing: xensonar:check-carrier-strange-attractor-preview-renderer-contract');
}

if (failures.length) {
  console.error('[carrier-strange-attractor-preview-renderer-contract] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('[xensonar] Carrier Strange Attractor preview renderer contract: grün');
console.log('  Plan -> host-audible Stereo-Preview vorhanden, keine Export-/iframe-Route.');
