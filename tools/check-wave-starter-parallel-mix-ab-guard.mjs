#!/usr/bin/env node
import fs from 'node:fs';

const files = {
  guard: 'src/features/xensonar/audio/waveStarterParallelMixAbGuard.ts',
  bridge: 'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts',
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

must(files.guard, 'xensonar-wave-starter-parallel-mix-ab-guard', 'report kind');
must(files.guard, '__XENSONAR_WAVE_STARTER_PARALLEL_MIX_AB_GUARD__', 'browser global');
must(files.guard, 'legacyReferenceDominant: true', 'legacy dominance invariant');
must(files.guard, 'legacy-only-processor-error', 'processor error fallback decision');
must(files.guard, 'legacy-only-shape-proof-missing', 'shape proof fallback decision');
must(files.guard, 'legacy-dominant-pilot-mix-observed', 'fresh pilot mix decision');
must(files.guard, 'legacy-dominant-pilot-stale', 'stale pilot mix decision');
must(files.guard, 'parallelPilotAutoMuteReason', 'auto mute reason consumed');
must(files.guard, 'pilotGainDb', 'pilot gain surfaced');
must(files.guard, 'formatWaveStarterParallelMixAbGuardUiValue', 'UI formatter');

must(files.bridge, 'WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN = 0.012', 'bounded pilot gain still guarded');
must(files.bridge, 'processor-error-fallback', 'bridge processor error fallback remains');
must(files.bridge, 'parallelPilotPreservesLegacyReference: true', 'bridge preserves legacy reference');

must(files.panel, 'buildWaveStarterParallelMixAbGuardReport', 'panel builds A/B guard');
must(files.panel, 'formatWaveStarterParallelMixAbGuardUiValue', 'panel formats A/B guard');
must(files.panel, 'Wellenstarter A/B', 'UI line for A/B guard');
must(files.panel, 'data-wave-starter-parallel-mix-ab-guard', 'DOM marker for A/B guard');
must(files.panel, '__XENSONAR_WAVE_STARTER_PARALLEL_MIX_AB_GUARD__', 'panel publishes A/B guard global');

must(files.browserProbe, "valueAfterLabel('Wellenstarter A/B')", 'browser probe reads A/B guard UI line');
must(files.browserProbe, '__XENSONAR_WAVE_STARTER_PARALLEL_MIX_AB_GUARD__', 'browser probe reads A/B guard global');

const pkg = JSON.parse(read(files.pkg) || '{}');
if (!pkg.scripts?.['xensonar:check-wave-starter-parallel-mix-ab-guard']) {
  missing.push('package script xensonar:check-wave-starter-parallel-mix-ab-guard missing');
}

if (missing.length) {
  console.error('[wave-starter-parallel-mix-ab-guard] FAIL');
  for (const failure of missing) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[wave-starter-parallel-mix-ab-guard] OK · Wellenstarter parallel Worklet pilot is guarded by an A/B fallback report: legacy remains dominant, processor errors/shape-proof gaps fall back to legacy-only, and fresh pilot contribution is explicitly observable.');
