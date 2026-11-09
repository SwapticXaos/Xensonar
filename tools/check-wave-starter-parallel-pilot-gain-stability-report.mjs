#!/usr/bin/env node
import fs from 'node:fs';

const files = {
  report: 'src/features/xensonar/audio/waveStarterParallelPilotGainStabilityReport.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  browserProbe: 'tools/check-stable-lane-browser-responsibility-readout.mjs',
  pkg: 'package.json',
};
const missing = [];
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function must(file, needle, label) {
  const text = read(file);
  if (!text.includes(needle)) missing.push(`${file}: missing ${label}`);
}
for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) missing.push(`missing ${label} file ${file}`);
}

must(files.report, 'xensonar-wave-starter-parallel-pilot-gain-stability-report', 'report kind');
must(files.report, 'WAVE_STARTER_PARALLEL_PILOT_GAIN_STABILITY_GLOBAL', 'global name');
must(files.report, '__XENSONAR_WAVE_STARTER_PARALLEL_PILOT_GAIN_STABILITY_REPORT__', 'browser global string');
must(files.report, 'WAVE_STARTER_PARALLEL_PILOT_MAX_ALLOWED_PEAK_ABS = 0.018', 'conservative peak threshold');
must(files.report, 'pilot-stable-legacy-dominant', 'stable decision');
must(files.report, 'pilot-peak-too-high-fallback', 'peak fallback decision');
must(files.report, 'pilot-ramp-not-observed-fallback', 'ramp fallback decision');
must(files.report, 'processor-error-legacy-only', 'processor error decision');
must(files.report, 'primaryReplacementForbidden: true', 'primary replacement forbidden invariant');
must(files.report, 'gainIncreaseForbidden: true', 'gain increase forbidden invariant');
must(files.report, 'legacyReferenceDominant: true', 'legacy dominant invariant');
must(files.report, 'pilotGainWithinExpectedRange', 'pilot gain threshold');
must(files.report, 'pilotPeakWithinExpectedRange', 'pilot peak threshold');
must(files.report, 'rampGuardFresh', 'ramp freshness guard');
must(files.report, 'formatWaveStarterParallelPilotGainStabilityUiValue', 'UI formatter');

must(files.panel, 'buildWaveStarterParallelPilotGainStabilityReport', 'panel builds gain stability report');
must(files.panel, 'formatWaveStarterParallelPilotGainStabilityUiValue', 'panel formats gain stability report');
must(files.panel, 'WaveStarterParallelPilotGainStabilityReport', 'panel report type');
must(files.panel, '__XENSONAR_WAVE_STARTER_PARALLEL_PILOT_GAIN_STABILITY_REPORT__', 'panel publishes report global');
must(files.panel, 'Wellenstarter Pilot-Stabilität', 'UI line');

must(files.browserProbe, "valueAfterLabel('Wellenstarter Pilot-Stabilität')", 'browser probe reads stability UI line');
must(files.browserProbe, '__XENSONAR_WAVE_STARTER_PARALLEL_PILOT_GAIN_STABILITY_REPORT__', 'browser probe reads stability global');
must(files.browserProbe, 'primaryReplacementForbidden === true', 'browser probe asserts primary replacement forbidden');
must(files.browserProbe, 'gainIncreaseForbidden === true', 'browser probe asserts gain increase forbidden');

const pkg = JSON.parse(read(files.pkg) || '{}');
if (!pkg.scripts?.['xensonar:check-wave-starter-parallel-pilot-gain-stability-report']) {
  missing.push('package script xensonar:check-wave-starter-parallel-pilot-gain-stability-report missing');
}

if (missing.length) {
  console.error('[wave-starter-parallel-pilot-gain-stability-report] FAIL');
  for (const failure of missing) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[wave-starter-parallel-pilot-gain-stability-report] OK · Wellenstarter parallel pilot now has stability report before any gain increase or primary involvement.');
