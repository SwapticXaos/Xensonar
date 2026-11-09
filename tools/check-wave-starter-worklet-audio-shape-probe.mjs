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

must(files.bridge, 'shadow-audio-shape-rendered', 'shape-rendered decision');
must(files.bridge, 'audioShapeProbeEnabled: true', 'shape probe enabled invariant');
must(files.bridge, 'audioShapeProbeFrameCount', 'shape frame counter');
must(files.bridge, 'audioShapeProbeFrameDelta', 'shape frame delta');
must(files.bridge, 'audioShapeProbeQuantumCount', 'shape quantum counter');
must(files.bridge, 'audioShapeProbePeakAbs', 'shape peak diagnostic');
must(files.bridge, 'audioShapeProbeCompletedCount', 'shape completion counter');
must(files.bridge, 'audioShapeProbeLastWorkletFrame', 'worklet frame diagnostic');
must(files.bridge, 'this.shapeFramesRemaining', 'worklet shape render window');
must(files.bridge, 'this.shapePhaseStep', 'frequency-derived phase step');
must(files.bridge, 'Math.sin(this.shapePhase) * envelope', 'internal shape calculation');
must(files.bridge, 'parallelPilotRequiresShapeProof: true', 'parallel pilot does not open before shape proof');
must(files.bridge, 'this.shapeCompletedCount >= this.parallelPilotRequiredCompletedShapes', 'shape-proof gate in processor');
must(files.bridge, 'parallelPilotMutedFrameCount', 'muted-before-proof counter');
must(files.bridge, 'preservesMainThreadReferencePath: true', 'legacy reference invariant remains');
must(files.bridge, 'shape ${report.audioShapeProbeFrameDelta}Δ', 'UI formatter includes shape delta');
must(files.panel, 'Wellenstarter Worklet', 'UI line remains present');
must(files.browserProbe, "valueAfterLabel('Wellenstarter Worklet')", 'browser probe still reads worklet UI line');
must(files.browserProbe, '__XENSONAR_WAVE_STARTER_WORKLET_PILOT_REPORT__', 'browser probe still reads worklet global');

const pkg = JSON.parse(read(files.pkg) || '{}');
if (!pkg.scripts?.['xensonar:check-wave-starter-worklet-audio-shape-probe']) {
  missing.push('package script xensonar:check-wave-starter-worklet-audio-shape-probe missing');
}

if (missing.length) {
  console.error('[wave-starter-worklet-audio-shape-probe] FAIL');
  for (const failure of missing) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[wave-starter-worklet-audio-shape-probe] OK · Wellenstarter worklet computes an internal impulse/envelope shape, reports shape frames/quanta/peak, and only opens parallel pilot mix after proof.');
