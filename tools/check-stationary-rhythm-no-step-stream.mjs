import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [
  'src/features/xensonar/audio/stationaryRhythmWorkletLaneContracts.ts',
  'src/features/xensonar/audio/stationaryRhythmWorkletProcessorSource.ts',
  'src/features/xensonar/audio/stationaryRhythmWorkletLaneBridge.ts',
  'src/features/xensonar/audio/stationaryRhythmWorkletProbe.ts',
  'src/features/xensonar/audio/stationaryRhythmPatternSnapshotBridge.ts',
];
const fail = (message) => {
  console.error(`[stationary-rhythm-no-step-stream] FAIL: ${message}`);
  process.exit(1);
};
const combined = files.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
const forbidden = [
  'stationary-rhythm-step',
  'stationary-rhythm-drum-step',
  'stationary-rhythm-bass-step',
  'perStepMessage',
  'stepMessage',
];
for (const marker of forbidden) {
  if (combined.includes(marker)) fail(`found step-stream marker: ${marker}`);
}
for (const required of ['stationary-rhythm-start', 'stationary-rhythm-update', 'stationary-rhythm-stop', 'stationary-rhythm-pattern-snapshot']) {
  if (!combined.includes(required)) fail(`missing snapshot/control marker: ${required}`);
}
console.log('[stationary-rhythm-no-step-stream] PASS');
