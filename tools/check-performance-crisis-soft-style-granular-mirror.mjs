#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const app = read('src/App.tsx');
const panel = read('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx');
const props = read('src/features/xensonar/performanceCrisis/performanceCrisisPanelProps.ts');
const runtime = read('src/features/xensonar/performanceCrisis/performanceCrisisRuntimePolicies.ts');

const failures = [];
const must = [
  [panel, 'data-performance-crisis-management="soft-style-template"', 'Performance & Krisenmanagement must mark style presets as soft templates.'],
  [panel, 'Stilvorlage ist kein harter Gesamtschalter', 'UI must explain that global styles are not hard overall switches.'],
  [panel, 'data-granular-root-follow-single-source="root-follow-granular-manager"', 'Granular/Root-Follow must be marked as a single-source mirror.'],
  [panel, 'Grainwerte einmalig übernehmen', 'Granular projection must be explicit and one-shot, not automatic duplicate state.'],
  [panel, 'Partikel-Stilquelle', 'Partikel must be independently source-selectable.'],
  [panel, 'Wellenstarter-Stilquelle', 'Wellenstarter must be independently source-selectable.'],
  [props, 'onParticlePresetChange', 'Panel props must expose a Partikel style source setter.'],
  [props, 'onWaveStarterPresetChange', 'Panel props must expose a Wellenstarter style source setter.'],
  [runtime, 'particlePresetId: PerformanceCrisisPresetId', 'Runtime policy must remember the Partikel source preset.'],
  [runtime, 'waveStarterPresetId: PerformanceCrisisPresetId', 'Runtime policy must remember the Wellenstarter source preset.'],
  [app, 'particleCrisisPresetId, setParticleCrisisPresetId', 'App must own a separate Partikel style source.'],
  [app, 'waveStarterCrisisPresetId, setWaveStarterCrisisPresetId', 'App must own a separate Wellenstarter style source.'],
];
for (const [haystack, needle, message] of must) {
  if (!haystack.includes(needle)) failures.push(`${message} Missing: ${needle}`);
}

const forbiddenPanel = [
  'Preset-Fenster',
  'Preset-Schritt',
  'Preset max Grains',
];
for (const needle of forbiddenPanel) {
  if (panel.includes(needle)) failures.push(`Granular mirror must not duplicate preset grain parameter rows: ${needle}`);
}

const forbiddenApp = [
  'rootFollowCrisisState',
  'rootFollowOverloadState',
  'granularPressureState',
];
for (const needle of forbiddenApp) {
  if (app.includes(needle)) failures.push(`Forbidden duplicate crisis state in App.tsx: ${needle}`);
}

if (failures.length) {
  console.error('[performance-crisis-soft-style-granular-mirror] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[performance-crisis-soft-style-granular-mirror] ok');
