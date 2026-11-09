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

must(files.bridge, 'parallel-pilot-mix-rendered', 'parallel pilot rendered decision');
must(files.bridge, 'parallel-pilot-armed', 'parallel pilot armed decision');
must(files.bridge, 'WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN = 0.012', 'ultra-low pilot gain');
must(files.bridge, 'WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN_DB = -38.4', 'pilot gain dB label');
must(files.bridge, 'WAVE_STARTER_WORKLET_PARALLEL_PILOT_REQUIRED_COMPLETED_SHAPES = 1', 'completed-shape proof threshold');
must(files.bridge, 'parallelPilotMixEnabled: true', 'snapshot mix enabled field');
must(files.bridge, 'parallelPilotPreservesLegacyReference: true', 'legacy reference preservation field');
must(files.bridge, 'parallelPilotRequiresShapeProof: true', 'shape proof requirement field');
must(files.bridge, 'parallelPilotRenderFrameCount', 'render frame counter');
must(files.bridge, 'parallelPilotRenderFrameDelta', 'render frame delta');
must(files.bridge, 'parallelPilotRenderQuantumCount', 'render quantum counter');
must(files.bridge, 'parallelPilotPeakAbs', 'pilot peak counter');
must(files.bridge, 'parallelPilotAutoMuteReason', 'auto mute reason');
must(files.bridge, 'canRenderParallelPilot', 'processor gate variable');
must(files.bridge, 'channel[i] += pilotSample', 'processor writes bounded pilot sample only after gate');
must(files.bridge, 'this.parallelPilotMutedFrameCount += 1', 'muted-before-proof accounting');
must(files.bridge, 'wave-starter-parallel-pilot-mix-rendered', 'main-thread throughput detail');
must(files.bridge, 'mix ${report.parallelPilotRenderFrameDelta}Δ', 'UI formatter mix delta');
must(files.bridge, 'report.parallelPilotGainDb.toFixed(1)', 'UI formatter gain dB');

must(files.panel, 'Wellenstarter Worklet', 'UI line remains present');
must(files.browserProbe, "valueAfterLabel('Wellenstarter Worklet')", 'browser probe reads worklet UI line');
must(files.browserProbe, '__XENSONAR_WAVE_STARTER_WORKLET_PILOT_REPORT__', 'browser probe reads worklet global');

const pkg = JSON.parse(read(files.pkg) || '{}');
if (!pkg.scripts?.['xensonar:check-wave-starter-worklet-parallel-pilot-mix']) {
  missing.push('package script xensonar:check-wave-starter-worklet-parallel-pilot-mix missing');
}

if (missing.length) {
  console.error('[wave-starter-worklet-parallel-pilot-mix] FAIL');
  for (const failure of missing) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[wave-starter-worklet-parallel-pilot-mix] OK · Wellenstarter worklet has a gated ultra-low parallel pilot mix after shape-proof, with legacy reference preserved and diagnostics exposed.');
