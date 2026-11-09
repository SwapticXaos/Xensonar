#!/usr/bin/env node
import fs from 'node:fs';

const files = {
  harness: 'src/features/xensonar/diagnostics/stableLaneStressHarness.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  browserProbe: 'tools/check-stable-lane-browser-responsibility-readout.mjs',
  pkg: 'package.json',
};
const missing = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) missing.push(`missing ${label}: ${file}`);
}
const harness = read(files.harness);
const panel = read(files.panel);
const browserProbe = read(files.browserProbe);
const pkg = read(files.pkg);

for (const marker of [
  'StableLaneExpressivePressureAddOnReport',
  'StableLaneExpressivePressureAddOnSnapshot',
  'keyboard-glissando-root-follow-pressure',
  'wave-starter-microburst-root-follow-pressure',
  'buildStableLaneExpressivePressureAddOnReport',
  'formatStableLaneExpressivePressureAddOnUiValue',
  'StableLaneSabReadinessDifferentialReport',
  'StableLaneSabDifferentialDecision',
  'buildStableLaneSabReadinessDifferentialReport',
  'formatStableLaneSabReadinessDifferentialUiValue',
  'cross-origin-isolation-missing',
  'shared-array-buffer-constructor-missing',
  'singlefile-path-blocked',
  'requiredHeaders',
  'probableNextAction',
]) {
  if (!harness.includes(marker)) missing.push(`harness missing ${marker}`);
}

for (const marker of [
  '__XENSONAR_STABLE_LANE_EXPRESSIVE_PRESSURE_ADDON_REPORT__',
  '__XENSONAR_STABLE_LANE_SAB_DIFFERENTIAL_REPORT__',
  'Expressive Pressure',
  'SAB-Differenz',
  'formatStableLaneExpressivePressureAddOnUiValue',
  'formatStableLaneSabReadinessDifferentialUiValue',
]) {
  if (!panel.includes(marker)) missing.push(`panel missing ${marker}`);
}

for (const marker of [
  'liveExpressivePressureAddOnReport',
  'liveSabDifferentialReport',
  'Expressive Pressure',
  'SAB-Differenz',
  '__XENSONAR_STABLE_LANE_EXPRESSIVE_PRESSURE_ADDON_REPORT__',
  '__XENSONAR_STABLE_LANE_SAB_DIFFERENTIAL_REPORT__',
]) {
  if (!browserProbe.includes(marker)) missing.push(`browser probe missing ${marker}`);
}

if (!pkg.includes('xensonar:check-stable-lane-expressive-pressure-sab-differential')) {
  missing.push('package script missing xensonar:check-stable-lane-expressive-pressure-sab-differential');
}
if (harness.includes('new AudioContext(') || harness.includes('setInterval(')) {
  missing.push('expressive pressure/SAB differential domain must remain pure/report-only, not schedule audio directly');
}
if (harness.includes("STABLE_LANE_PLAN_TRANSPORT_ACTIVE_BACKEND_KIND: StableLanePlanTransportBackendKind = 'sab-ringbuffer'")) {
  missing.push('forbidden sab-ringbuffer activation detected');
}

if (missing.length) {
  console.error('[stable-lane-expressive-pressure-sab-differential] FAIL');
  for (const item of missing) console.error(' - ' + item);
  process.exit(1);
}
console.log('[stable-lane-expressive-pressure-sab-differential] OK · expressive pressure add-on and SAB differential report are browser-readable and report-only.');
