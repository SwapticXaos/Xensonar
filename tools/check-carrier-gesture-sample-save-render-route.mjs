#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const failures = [];
const files = {
  panel: 'src/features/l3lab/spectralForge/components/CarrierIntegralVerwaltenPanel.tsx',
  probe: 'src/features/l3lab/spectralForge/integral/carrierGestureSampleSaveProbe.ts',
  message: 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralGestureSampleExport.ts',
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
function req(label, text, marker) {
  if (!text.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
}
function absent(label, text, marker) {
  if (text.includes(marker)) failures.push(`${label} must not contain marker: ${marker}`);
}
const panel = read(files.panel);
const probe = read(files.probe);
const message = read(files.message);
const index = read(files.index);
const pkg = JSON.parse(read(files.pkg) || '{}');
for (const marker of [
  'renderGestureSelectionAsCurrentHearing',
  'resolveGestureSampleRenderMachine',
  'renderMachineId === "strange-attractor-schwarmkoerper"',
  'buildStrangeAttractorCarrierPlanFromSpectralData',
  'renderStrangeAttractorCarrierPlanToStereoSamples',
  'createStrangeAttractorPreviewAudioBufferFromStereoSamples',
  'recordCarrierGestureSampleSaveProbe',
  'listSavedMelodicSamples',
  'const dbVerified = entries.some((entry) => entry.id === saved.id)',
  'Spectral Forge Rohbuffer',
]) req(files.panel, panel, marker);
for (const marker of [
  'xensonar-carrier-gesture-sample-save-probe',
  '__xensonarReadCarrierGestureSampleSaveProbe',
  'renderMachineId: CarrierIntegralMachineId | \'spectral-raw-fallback\'',
  "renderPath: 'strange-attractor-schwarmkoerper' | 'spectral-raw-fallback'",
  'dbVerified: boolean',
]) req(files.probe, probe, marker);
for (const marker of [
  'renderMachineLabel',
  'DB bestätigt',
]) req(files.message, message, marker);
req(files.index, index, "export * from './carrierGestureSampleSaveProbe';");
absent(files.panel, panel, 'sampleName: "Strange Attractor');
if (pkg.scripts?.['xensonar:check-carrier-gesture-sample-save-render-route'] !== 'node tools/check-carrier-gesture-sample-save-render-route.mjs') {
  failures.push('package script missing: xensonar:check-carrier-gesture-sample-save-render-route');
}
if (failures.length) {
  console.error('[carrier-gesture-sample-save-render-route] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[xensonar] Carrier gesture sample save render route: grün');
console.log('  Auswahl-als-Sample nutzt für Strange Attractor den Schwarmkörper-Renderer statt den Pure-Dieter/Rohbuffer-Fallback.');
