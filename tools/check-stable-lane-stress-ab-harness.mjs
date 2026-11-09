#!/usr/bin/env node
import fs from 'node:fs';

const files = {
  harness: 'src/features/xensonar/diagnostics/stableLaneStressHarness.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  browserProbe: 'tools/check-stable-lane-browser-responsibility-readout.mjs',
  pkg: 'package.json',
};
const missing = [];
for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) missing.push(`missing ${label}: ${file}`);
}
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const harness = read(files.harness);
const panel = read(files.panel);
const browserProbe = read(files.browserProbe);
const pkg = read(files.pkg);

for (const marker of [
  'StableLaneStressScenarioHarnessReport',
  'StableLaneABReport',
  'buildStableLaneStressScenarioHarnessReport',
  'root-material-controlled-lane-pressure',
  'legacy-shadow-baseline',
  'worklet-stable-lane-pilot',
  'candidate-observed',
  'needs-legacy-ab-run',
  'needs-worklet-frame-proof',
  'needs-relief-events',
  'stable-lane-plan-transport-not-posted',
  'formatStableLaneStressHarnessUiValue',
  'formatStableLaneABReportUiValue',
]) {
  if (!harness.includes(marker)) missing.push(`harness missing ${marker}`);
}

for (const marker of [
  '__XENSONAR_STABLE_LANE_STRESS_SCENARIO_HARNESS__',
  '__XENSONAR_STABLE_LANE_AB_REPORT__',
  'data-root-follow-stable-lane-stress-harness',
  'data-root-follow-stable-lane-ab-report',
  'Stress-Harness',
  'A/B-Report',
  'buildStableLaneStressScenarioHarnessReport',
]) {
  if (!panel.includes(marker)) missing.push(`panel missing ${marker}`);
}

for (const marker of [
  'liveStressScenarioHarness',
  'liveStableLaneABReport',
  'Stress-Harness',
  'A/B-Report',
  '__XENSONAR_STABLE_LANE_STRESS_SCENARIO_HARNESS__',
  '__XENSONAR_STABLE_LANE_AB_REPORT__',
]) {
  if (!browserProbe.includes(marker)) missing.push(`browser probe missing ${marker}`);
}

if (!pkg.includes('xensonar:check-stable-lane-stress-ab-harness')) missing.push('package script missing xensonar:check-stable-lane-stress-ab-harness');
if (harness.includes('setTimeout') || harness.includes('AudioContext(')) missing.push('stress harness domain must remain pure/report-only, not schedule audio directly');

if (missing.length) {
  console.error('[stable-lane-stress-ab-harness] FAIL');
  for (const item of missing) console.error(' - ' + item);
  process.exit(1);
}
console.log('[stable-lane-stress-ab-harness] OK · controlled Stable-Lane stress harness and Legacy-vs-Worklet A/B report are browser-readable and report-only.');
