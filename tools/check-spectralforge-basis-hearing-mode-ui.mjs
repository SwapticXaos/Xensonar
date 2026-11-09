#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const panelPath = path.join(root, 'src/features/l3lab/spectralForge/components/HarmonizerPanel.tsx');
const directRendererPanelPath = path.join(root, 'src/features/l3lab/spectralForge/components/harmonizerPanel/DirectRendererReferencePanel.tsx');
const directRendererModelPath = path.join(root, 'src/features/l3lab/spectralForge/components/harmonizerPanel/directRendererReferenceModel.ts');
const transportPath = path.join(root, 'src/features/l3lab/spectralForge/components/TransportBar.tsx');
const roomPath = path.join(root, 'src/features/l3lab/spectralForge/SpectralForgeRoom.tsx');
const previewPath = path.join(root, 'src/features/l3lab/spectralForge/components/transportBar/spectralForgeBasisHearingPreview.ts');
const manifestPath = path.join(root, 'src/features/l3lab/spectralForge/components/harmonizerPanel/spectralForgeBasisHearingModes.ts');
const panel = fs.readFileSync(panelPath, 'utf8');
const directRendererPanel = fs.readFileSync(directRendererPanelPath, 'utf8');
const directRendererModel = fs.readFileSync(directRendererModelPath, 'utf8');
const transport = fs.readFileSync(transportPath, 'utf8');
const room = fs.readFileSync(roomPath, 'utf8');
const preview = fs.readFileSync(previewPath, 'utf8');
const manifest = fs.readFileSync(manifestPath, 'utf8');

const requiredPanelNeedles = [
  'data-spectral-forge-basis-hearing-modes="carrier-integral"',
  'SPECTRAL_FORGE_BASIS_HEARING_OPTIONS.map',
  'selectAndPreviewHearingOption(option)',
  '<DirectRendererReferencePanel',
  '◇ Hörweise / Play-Lesung',
  'data-spectral-forge-basis-hearing-click-previews="true"',
];

const requiredMachineIds = [
  'raw-darkpsy-oscillator',
  'harmonic-xplore-direct-carrier',
  'legacy-supernote-5.69',
  'branch-a-line-traffic',
  'branch-b573-synth-window',
  'branch-c-interval-body',
  'material-render-body',
  'dieter-window-body',
  'donatello-formant-window-body',
  'strange-attractor-schwarmkoerper',
  'donor-timbre-embodiment',
];

const requiredOptionIds = [
  'harmonic-xplore',
];

const forbiddenDuplicateOptionIds = [
  'harmonic-xplore-resonator',
  'harmonic-xplore-scatter',
  'harmonic-xplore-metallic',
];

const failures = [];
for (const needle of requiredPanelNeedles) {
  if (!panel.includes(needle)) failures.push(`HarmonizerPanel missing ${needle}`);
}
for (const needle of [
  'data-spectral-forge-legacy-renderer-surface="true"',
  'data-spectral-forge-direct-renderer-reference-surface="true"',
  'Direkt-Renderer (Referenz)',
]) {
  if (!directRendererPanel.includes(needle)) failures.push(`DirectRendererReferencePanel missing ${needle}`);
}
for (const needle of [
  'DIRECT_RENDERER_REFERENCE_MODES',
  'Direkt-Renderer als schnelle Referenzspur',
  "{ id: 'additive', label: 'Additiv', desc: 'Sinus direkt' }",
  "{ id: 'granular', label: 'Granular', desc: 'Körnung direkt' }",
]) {
  if (!directRendererModel.includes(needle)) failures.push(`Direct Renderer model missing ${needle}`);
}
if (panel.includes('legacySynthModes')) failures.push('HarmonizerPanel still owns Direct Renderer mode data instead of delegating it.');
for (const machineId of requiredMachineIds) {
  if (!manifest.includes(`'${machineId}'`)) failures.push(`hearing mode manifest missing ${machineId}`);
}
for (const optionId of requiredOptionIds) {
  if (!manifest.includes(`id: '${optionId}'`)) failures.push(`hearing option manifest missing ${optionId}`);
}
for (const optionId of forbiddenDuplicateOptionIds) {
  if (manifest.includes(`id: '${optionId}'`)) failures.push(`hearing option manifest still duplicates HarmonicXplorE rack profile ${optionId}`);
}
if (manifest.includes("harmonicXploreProfileId: 'harmonic-xplore-prime-spine'")) {
  failures.push('right-list HarmonicXplorE still forces a profile instead of respecting the rack-selected profile');
}
for (const forbidden of [
  'Bildgetreu / konturfolgend',
  'Verfremdet / klangkörperlich',
  'bildnah',
  'verfremdet',
  'SPECTRAL_FORGE_BASIS_HEARING_MODE_GROUPS',
]) {
  if (manifest.includes(forbidden) || panel.includes(forbidden)) {
    failures.push(`basis hearing UI still contains speculative grouping ${forbidden}`);
  }
}
if (!manifest.includes('SPECTRAL_FORGE_BASIS_HEARING_MACHINE_IDS')) {
  failures.push('hearing mode manifest no longer exposes the flat machine list');
}
if (!manifest.includes('SPECTRAL_FORGE_BASIS_HEARING_OPTIONS')) {
  failures.push('hearing mode manifest does not expose flat option aliases');
}
for (const needle of [
  'playSpectralForgeBasisHearingPreview',
  'auditionForgeProjectCarrierIntegral',
  'renderCarrierIntegralStandalonePreviewRoute',
]) {
  if (!preview.includes(needle) && !transport.includes(needle) && !room.includes(needle)) {
    failures.push(`basis hearing preview path missing ${needle}`);
  }
}
if (!transport.includes('carrierIntegralSelection.source !== "default"')) {
  failures.push('TransportBar still does not route selected basis hearing mode into Play');
}
if (!room.includes("carrierIntegralSelection.source !== 'default'")) {
  failures.push('keyboard Space hotkey still does not route selected basis hearing mode into Play');
}
if (panel.includes('⚙️ Render-Modus') || directRendererPanel.includes('⚙️ Render-Modus')) {
  failures.push('old Render-Modus label still presented as primary basis control');
}
if (panel.includes('const synthModes:') || directRendererModel.includes('const synthModes:')) {
  failures.push('old synthModes name still frames legacy renderers as primary synth modes');
}

if (failures.length > 0) {
  console.error('[spectralforge-basis-hearing-mode-ui] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[spectralforge-basis-hearing-mode-ui] PASS');
console.log('- Carrier-Hörweisen are visible as one flat SpectralForge basis sidebar list.');
console.log('- Clicking a hearing option selects its machine and starts its preview route; HarmonicXplorE profile choice stays in the rack.');
console.log('- Additiv/IFFT/Granular/Glyph are kept as a Direct Renderer reference surface, separate from the hearing/play-reading list.');
console.log('- All carrier integral machine ids are represented by the basis hearing-mode manifest.');
