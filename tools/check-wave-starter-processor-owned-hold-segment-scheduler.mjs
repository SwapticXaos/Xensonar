#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const checks = [
  ['src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts', 'wave-starter-processor-hold-gesture-start'],
  ['src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts', 'pumpProcessorOwnedHoldGestures'],
  ['src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts', 'processorOwnedHoldSegmentPulseCount'],
  ['src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts', 'postWaveStarterWorkletProcessorOwnedHoldGestureStart'],
  ['src/App.tsx', 'syncWaveStarterProcessorOwnedHoldGesture'],
  ['src/App.tsx', 'isWaveStarterProcessorOwnedHoldSchedulerActive'],
  ['src/App.tsx', 'postWaveStarterWorkletProcessorOwnedHoldGestureRelease'],
  ['src/App.tsx', 'keyboard-input-hold-repeat-coalesced'],
];
const missing = checks.filter(([path, needle]) => !read(path).includes(needle));
if (missing.length) {
  console.error('[check-wave-starter-processor-owned-hold-segment-scheduler] missing contracts:');
  for (const [path, needle] of missing) console.error(`- ${path}: ${needle}`);
  process.exit(1);
}
console.log('[check-wave-starter-processor-owned-hold-segment-scheduler] OK');
