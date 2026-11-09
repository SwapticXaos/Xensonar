#!/usr/bin/env node
import fs from 'node:fs';

const files = {
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

must(files.bridge, 'WAVE_STARTER_WORKLET_PARALLEL_PILOT_RAMP_ATTACK_FRAMES = 96', 'attack ramp threshold');
must(files.bridge, 'WAVE_STARTER_WORKLET_PARALLEL_PILOT_RAMP_RELEASE_FRAMES = 128', 'release ramp threshold');
must(files.bridge, 'parallelPilotRampGuardEnabled: true', 'snapshot ramp guard enabled field');
must(files.bridge, 'parallelPilotRampGuardAttackFrames', 'snapshot attack frames field');
must(files.bridge, 'parallelPilotRampGuardReleaseFrames', 'snapshot release frames field');
must(files.bridge, 'parallelPilotRampGuardFrameCount', 'ramp guard frame counter');
must(files.bridge, 'parallelPilotRampGuardQuantumCount', 'ramp guard quantum counter');
must(files.bridge, 'parallelPilotRampGuardPeakGain', 'ramp guard peak gain');
must(files.bridge, 'parallelPilotRampGuardLastRenderAtMs', 'ramp guard last render time');
must(files.bridge, 'attackRamp', 'processor attack ramp');
must(files.bridge, 'releaseRamp', 'processor release ramp');
must(files.bridge, 'rampGuardGain', 'processor ramp gain multiplier');
must(files.bridge, 'sample * this.parallelPilotGain * rampGuardGain', 'pilot sample multiplied by ramp guard');
must(files.bridge, 'this.parallelPilotRampFrameCount += 1', 'processor ramp frame accounting');
must(files.bridge, 'this.parallelPilotRampQuantumCount += 1', 'processor ramp quantum accounting');
must(files.bridge, 'ramp ${report.parallelPilotRampGuardFrameCount}f', 'UI formatter exposes ramp frames');
must(files.bridge, 'report.parallelPilotRampGuardAttackFrames', 'UI formatter exposes attack frames');
must(files.bridge, 'report.parallelPilotRampGuardReleaseFrames', 'UI formatter exposes release frames');

must(files.panel, 'Wellenstarter Worklet', 'UI line remains present');
must(files.browserProbe, "valueAfterLabel('Wellenstarter Worklet')", 'browser probe reads worklet UI line');
must(files.browserProbe, '__XENSONAR_WAVE_STARTER_WORKLET_PILOT_REPORT__', 'browser probe reads worklet global');

const pkg = JSON.parse(read(files.pkg) || '{}');
if (!pkg.scripts?.['xensonar:check-wave-starter-parallel-pilot-gain-ramp-guard']) {
  missing.push('package script xensonar:check-wave-starter-parallel-pilot-gain-ramp-guard missing');
}

if (missing.length) {
  console.error('[wave-starter-parallel-pilot-gain-ramp-guard] FAIL');
  for (const failure of missing) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[wave-starter-parallel-pilot-gain-ramp-guard] OK · Wellenstarter worklet parallel pilot now has attack/release ramp guard diagnostics before any stronger audible involvement.');
