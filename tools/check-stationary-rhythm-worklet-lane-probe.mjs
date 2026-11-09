import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'src/features/xensonar/audio/stationaryRhythmWorkletLaneContracts.ts',
  'src/features/xensonar/audio/stationaryRhythmWorkletProcessorSource.ts',
  'src/features/xensonar/audio/stationaryRhythmWorkletLaneBridge.ts',
  'src/features/xensonar/audio/stationaryRhythmWorkletProbe.ts',
  'src/features/xensonar/audio/stationaryRhythmPatternSnapshotBridge.ts',
  'src/features/xensonar/audio/StationaryRhythmWorkletProbeOverlay.tsx',
  'src/features/xensonar/audio/useStationaryRhythmWorkletProbeController.ts',
];

const fail = (message) => {
  console.error(`[stationary-rhythm-worklet-lane-probe] FAIL: ${message}`);
  process.exit(1);
};

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);
}

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const processorSource = read('src/features/xensonar/audio/stationaryRhythmWorkletProcessorSource.ts');
const bridgeSource = read('src/features/xensonar/audio/stationaryRhythmWorkletLaneBridge.ts');
const appSource = read('src/App.tsx');
const hookSource = read('src/features/xensonar/audio/useStationaryRhythmWorkletProbeController.ts');
const overlaySource = read('src/features/xensonar/audio/StationaryRhythmWorkletProbeOverlay.tsx');

const processorRequired = [
  'registerProcessor',
  'STATIONARY_RHYTHM_WORKLET_PROCESSOR_NAME',
  'currentFrame',
  'sampleRate',
  'nextStepFrame',
  'outputs[0]',
  'return true',
  'stationary-rhythm-heartbeat',
  'frameContinuityGapCount',
  'missedStepWindowCount',
  'patternHitsByStep',
  'stationary-rhythm-pattern-snapshot',
];
for (const marker of processorRequired) {
  if (!processorSource.includes(marker)) fail(`processor source missing marker: ${marker}`);
}

const forbiddenProcessorMarkers = ['setTimeout(', 'requestAnimationFrame(', 'performance.now(', 'Date.now('];
for (const marker of forbiddenProcessorMarkers) {
  if (processorSource.includes(marker)) fail(`processor hot path contains forbidden clock/timer marker: ${marker}`);
}

for (const marker of [
  'new AudioWorkletNode',
  'numberOfInputs: 0',
  'numberOfOutputs: 1',
  'outputChannelCount: [2]',
  'onprocessorerror',
  'createStationaryRhythmWorkletProcessorBlobUrl',
]) {
  if (!bridgeSource.includes(marker)) fail(`bridge source missing marker: ${marker}`);
}

for (const marker of [
  'StationaryRhythmWorkletProbeOverlay',
  'useStationaryRhythmWorkletProbeController',
  'toggleStationaryRhythmWorkletProbe',
]) {
  if (!appSource.includes(marker)) fail(`App.tsx missing compatibility marker: ${marker}`);
}

for (const marker of [
  'Cold compatibility hook',
  'createInitialStationaryRhythmWorkletSnapshot',
  'const noop = useCallback(() => {}, [])',
]) {
  if (!hookSource.includes(marker)) fail(`controller hook missing archived marker: ${marker}`);
}
for (const marker of [
  'return null',
  'Historical stationary-rhythm audition overlay',
]) {
  if (!overlaySource.includes(marker)) fail(`overlay missing archived marker: ${marker}`);
}
for (const marker of [
  'Beat-Probe starten',
  'Beat-Probe stoppen',
  'summarizeStationaryRhythmProbeStatus',
  'createStationaryRhythmWorkletLaneBridge',
  'resolveStationaryRhythmProbeOptions',
  'publishStationaryRhythmWorkletPressureFromSnapshot',
  'buildStationaryRhythmPatternSnapshot',
]) {
  if (hookSource.includes(marker) || overlaySource.includes(marker)) {
    fail(`archived shell must not import/expose active probe marker: ${marker}`);
  }
}

console.log('[stationary-rhythm-worklet-lane-probe] PASS archived-cold-shell');
