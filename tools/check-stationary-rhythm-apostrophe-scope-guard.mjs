import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const stationaryFiles = [
  'src/features/xensonar/audio/stationaryRhythmWorkletLaneContracts.ts',
  'src/features/xensonar/audio/stationaryRhythmWorkletProcessorSource.ts',
  'src/features/xensonar/audio/stationaryRhythmWorkletLaneBridge.ts',
  'src/features/xensonar/audio/stationaryRhythmWorkletProbe.ts',
];
const fail = (message) => {
  console.error(`[stationary-rhythm-apostrophe-scope-guard] FAIL: ${message}`);
  process.exit(1);
};

const combined = stationaryFiles
  .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
  .join('\n');

const forbiddenImports = [
  'waveStarterWorkletPilotBridge',
  'waveStarterHold',
  'Apostrophe',
  'apostropheSafeExtendAcceptedCount',
  'postWaveStarterWorkletProcessorOwnedHoldGesture',
];
for (const marker of forbiddenImports) {
  if (combined.includes(marker)) fail(`stationary rhythm files consume wave-starter/apostrophe marker: ${marker}`);
}

const processor = fs.readFileSync(
  path.join(root, 'src/features/xensonar/audio/stationaryRhythmWorkletProcessorSource.ts'),
  'utf8',
);
for (const marker of ["scope === 'wave-starter'", 'extendPolicy', 'apostropheSafeExtend', 'wave-starter-extend-scope-ignored']) {
  if (!processor.includes(marker)) fail(`processor missing explicit extend-scope rejection marker: ${marker}`);
}

console.log('[stationary-rhythm-apostrophe-scope-guard] PASS');
