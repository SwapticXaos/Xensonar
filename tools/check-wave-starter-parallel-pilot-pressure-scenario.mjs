#!/usr/bin/env node
import fs from 'node:fs';

const files = {
  scenario: 'src/features/xensonar/audio/waveStarterParallelPilotPressureScenario.ts',
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

must(files.scenario, 'xensonar-wave-starter-parallel-pilot-pressure-scenario', 'report kind');
must(files.scenario, '__XENSONAR_WAVE_STARTER_PARALLEL_PILOT_PRESSURE_SCENARIO__', 'browser global');
must(files.scenario, 'legacyReferenceDominant: true', 'legacy dominance invariant');
must(files.scenario, 'primaryReplacementForbidden: true', 'primary replacement forbidden invariant');
must(files.scenario, 'reportOnly: true', 'report-only invariant');
must(files.scenario, 'pressure-pilot-fresh-legacy-dominant', 'fresh pressure decision');
must(files.scenario, 'pressure-pilot-stale-legacy-only', 'stale pressure fallback decision');
must(files.scenario, 'pressure-shape-proof-missing', 'shape proof fallback decision');
must(files.scenario, 'pressure-processor-error-fallback', 'processor error fallback decision');
must(files.scenario, 'buildWaveStarterParallelPilotPressureScenarioReport', 'report builder');
must(files.scenario, 'formatWaveStarterParallelPilotPressureScenarioUiValue', 'UI formatter');

must(files.panel, 'buildWaveStarterParallelPilotPressureScenarioReport', 'panel builds pressure scenario');
must(files.panel, 'formatWaveStarterParallelPilotPressureScenarioUiValue', 'panel formats pressure scenario');
must(files.panel, 'Wellenstarter Druck', 'UI line for pressure scenario');
must(files.panel, '__XENSONAR_WAVE_STARTER_PARALLEL_PILOT_PRESSURE_SCENARIO__', 'panel publishes pressure scenario global');

must(files.browserProbe, "valueAfterLabel('Wellenstarter Druck')", 'browser probe reads pressure scenario UI line');
must(files.browserProbe, '__XENSONAR_WAVE_STARTER_PARALLEL_PILOT_PRESSURE_SCENARIO__', 'browser probe reads pressure scenario global');

const pkg = JSON.parse(read(files.pkg) || '{}');
if (!pkg.scripts?.['xensonar:check-wave-starter-parallel-pilot-pressure-scenario']) {
  missing.push('package script xensonar:check-wave-starter-parallel-pilot-pressure-scenario missing');
}
if (missing.length) {
  console.error('[wave-starter-parallel-pilot-pressure-scenario] FAIL');
  for (const failure of missing) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[wave-starter-parallel-pilot-pressure-scenario] OK · Wellenstarter pressure scenario report guards the parallel Worklet pilot under pressure: report-only, legacy-dominant, primary replacement forbidden, stale/shape/processor fallbacks explicit.');
