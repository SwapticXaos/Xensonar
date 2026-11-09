#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`[stationary-rhythm-pressure-feedback] ${message}`);
  process.exit(1);
};

const pressure = read('src/features/xensonar/audio/stationaryRhythmWorkletPressureFeedback.ts');
const hook = read('src/features/xensonar/audio/useStationaryRhythmWorkletProbeController.ts');
const app = read('src/App.tsx');
const bridge = read('src/features/xensonar/audio/stationaryRhythmWorkletLaneBridge.ts');
const processor = read('src/features/xensonar/audio/stationaryRhythmWorkletProcessorSource.ts');

for (const marker of [
  'publishStationaryRhythmWorkletPressureFromSnapshot',
  'readStationaryRhythmWorkletPressureHint',
  'lateStepDelta',
  'frameContinuityGapDelta',
  'missedStepWindowDelta',
  'pressureHintFeedsGlobalAudioTrafficPolicy: true',
  'allTimeCountersRemainDiagnosticOnly: true',
]) {
  if (!pressure.includes(marker)) fail(`pressure feedback module missing marker ${marker}`);
}

if (!hook.includes('publishStationaryRhythmWorkletPressureFromSnapshot(nextSnapshot)')) {
  fail('probe controller must publish worklet heartbeat deltas into the pressure feedback bridge');
}

if (!app.includes('readStationaryRhythmWorkletPressureHint')) {
  fail('App global audio pressure bias must include stationary rhythm worklet pressure hint');
}

if (!app.includes('readStationaryRhythmWorkletPressureHint(),')) {
  fail('readStationaryRhythmWorkletPressureHint must be part of getAudioEnginePressureBiasForTransientRuntime');
}

for (const marker of [
  'ensureNodePromise',
  'actuallyEnsureNode',
  'getLastControlState',
  'lastStartMessage',
  'lastUpdateMessage',
  'lastPatternSnapshot',
  'module-load-failed',
]) {
  if (!bridge.includes(marker)) fail(`bridge lifecycle hygiene missing marker ${marker}`);
}

for (const marker of [
  'incomingPatternVersion',
  'stale-pattern-version',
  'selectReusableVoice',
  'voicePriority',
]) {
  if (!processor.includes(marker)) fail(`processor stale/voice guard missing marker ${marker}`);
}

if (hook.includes('[sendPatternSnapshot, tempoBpm, snapshot.probeGain]')) {
  fail('tempo effect must not depend on snapshot.probeGain; that reintroduces a fragile feedback trigger');
}

console.log('[stationary-rhythm-pressure-feedback] ok');
