#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const fail = (message) => {
  console.error(`[carrier-core-variance-surface] FAIL ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`[carrier-core-variance-surface] PASS ${message}`);
const requireIncludes = (text, needle, context) => {
  if (!text.includes(needle)) fail(`${context} missing ${needle}`);
};
const requireExcludes = (text, needle, context) => {
  if (text.includes(needle)) fail(`${context} still contains archived ${needle}`);
};

// Historical script name retained for sanity-suite compatibility. 7.7.75 keeps
// the core six surface with exactly one visible Antonia mapped to Branch-A.
const activeIds = [
  'raw-darkpsy-oscillator',
  'harmonic-xplore-direct-carrier',
  'spektral-synthese-body',
  'branch-a-line-traffic',
  'branch-b573-synth-window',
  'branch-c-interval-body',
];
const activeLabels = ['Pure Dieter', 'HarmonicXplorE', 'SpektralSynthese', 'Antonia', 'Bert', 'Cecilia'];
const archivedIds = [
  'dieter-window-body',
  'material-render-body',
  'donatello-formant-window-body',
  'strange-attractor-schwarmkoerper',
  'donor-timbre-embodiment',
];
const archivedLabels = ['Antonia Voll', 'Antonia Glatt', 'Dieter Fensterkörper', 'Dieter V2', 'Donatello', 'Donor-Verkörperung'];

const inactiveActiveSurfaceIds = ['legacy-supernote-5.69'];


const registry = read('src/features/l3lab/spectralForge/integral/carrierIntegralRegistry.ts');
const basisModes = read('src/features/l3lab/spectralForge/components/harmonizerPanel/spectralForgeBasisHearingModes.ts');
const rootAudition = read('src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralVerwaltenPanelContracts.ts');
const machineUi = read('src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralMachineUi.ts');
const routes = read('src/features/l3lab/spectralForge/integral/carrierIntegralRuntimeRoutes.ts');
const audition = read('src/features/l3lab/spectralForge/integral/carrierIntegralAudition.ts');
const auditionRoutes = read('src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts');
const policy = read('src/features/l3lab/spectralForge/integral/carrierIntegralTransferPolicyMatrix.ts');

for (const id of activeIds) {
  requireIncludes(registry, id, 'active registry');
  requireIncludes(basisModes, id, 'basis hearing modes');
  requireIncludes(rootAudition, id, 'root audition surface');
  requireIncludes(machineUi, id, 'machine ui surface');
  requireIncludes(routes, id, 'runtime routes');
}
for (const label of activeLabels) requireIncludes(registry + basisModes + machineUi + routes, label, 'active labels');

for (const id of archivedIds) {
  for (const [label, text] of [
    ['registry', registry],
    ['basis hearing modes', basisModes],
    ['root audition surface', rootAudition],
    ['machine ui surface', machineUi],
    ['runtime routes', routes],
    ['audition switch', audition],
    ['audition routes', auditionRoutes],
    ['transfer policy matrix', policy],
  ]) requireExcludes(text, id, label);
}
for (const id of inactiveActiveSurfaceIds) {
  for (const [label, text] of [
    ['basis hearing modes', basisModes],
    ['root audition surface', rootAudition],
  ]) requireExcludes(text, id, label);
}
for (const label of archivedLabels) {
  for (const [name, text] of [
    ['registry', registry],
    ['basis hearing modes', basisModes],
    ['machine ui surface', machineUi],
    ['runtime routes', routes],
  ]) requireExcludes(text, label, name);
}

const htmlPath = path.join(ROOT, 'dist/index.html');
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  for (const label of activeLabels) requireIncludes(html, label, 'built HTML');
  for (const label of archivedLabels) requireExcludes(html, label, 'built HTML');
}

if (!process.exitCode) pass('Core Carrier hearing surface exposes six active modes with exactly one Antonia; Branch-A is Antonia, 5.69 Legacy and Glatt/Voll labels stay out of active entry points.');
