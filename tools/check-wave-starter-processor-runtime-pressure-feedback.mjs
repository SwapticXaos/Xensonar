#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const checks = [
  ['src/features/xensonar/audio/waveStarterProcessorRuntimePressureFeedback.ts', 'processorRuntimePressureState'],
  ['src/features/xensonar/audio/waveStarterProcessorRuntimePressureFeedback.ts', 'safeForCongestionBarometer'],
  ['src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts', 'processorRuntimeQueuePressureApprox'],
  ['src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts', 'processorRuntimeActiveSynthVoices'],
  ['src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts', 'processorRuntimeStealFadeTailPressure'],
  ['src/features/xensonar/audio/waveStarterWorkletProcessorRuntimeOwnership.ts', 'publishWaveStarterProcessorRuntimePressureFeedbackReport'],
  ['src/features/xensonar/input/waveStarterGestureLoopWorkletBridge.ts', 'resolveWaveStarterProcessorPressureBias'],
];
const missing = checks.filter(([path, needle]) => !read(path).includes(needle));
if (missing.length) {
  console.error('[check-wave-starter-processor-runtime-pressure-feedback] missing contracts:');
  for (const [path, needle] of missing) console.error(`- ${path}: ${needle}`);
  process.exit(1);
}
console.log('[check-wave-starter-processor-runtime-pressure-feedback] OK');
