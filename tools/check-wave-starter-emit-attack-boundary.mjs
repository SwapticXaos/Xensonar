#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('src/App.tsx');
const boundaryPath = 'src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts';
const boundary = fs.existsSync(path.join(root, boundaryPath)) ? read(boundaryPath) : '';

const failures = [];
const mustContain = [
  [boundary, 'export function emitWaveStarterAttack', 'emit-attack boundary export missing'],
  [boundary, 'resolveWaveStarterPlaybackSelection(runtime.preset)', 'boundary must own wave-starter preset/sample resolution'],
  [boundary, 'resolveWaveStarterEmitState({', 'boundary must own emit-state resolution call'],
  [boundary, 'ensureWaveStarterFxRoutes({', 'boundary must own FX route ensure call'],
  [boundary, 'buildWaveStarterAuxTargets({', 'boundary must own FX aux-target construction'],
  [boundary, 'playWaveStarterSampleSelection({', 'boundary must own sample dispatch'],
  [boundary, 'getWaveTransientDemand(resolvedWavePreset)', 'boundary must own transient demand calculation'],
  [boundary, 'playWaveStarterGradientTone({', 'boundary must own gradient playback dispatch'],
  [boundary, 'playWaveStarterHarmonicPlaybackPlans({', 'boundary must own harmonic playback orchestration dispatch'],
  [boundary, 'callbacks: {', 'boundary must pass harmonic runtime callbacks explicitly'],
  [app, 'emitWaveStarterAttack({', 'App.tsx must delegate wave-starter emission into the boundary'],
  [app, 'getWaveOutput: (audioContext) => getLiveMasterBus(audioContext, "space")', 'App.tsx must provide only the space-bus adapter'],
  [app, 'primeMyzelFromY,', 'App.tsx must pass Myzel priming as an explicit callback'],
];
for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const forbiddenInApp = [
  'resolveWaveStarterPlaybackSelection(runtime.preset)',
  'resolveWaveStarterEmitState({',
  'isWaveStarterSampleSelection(resolvedWaveSelection)',
  'playWaveStarterSampleSelection({',
  'ensureWaveStarterFxRoutes({',
  'buildWaveStarterAuxTargets({',
  'getWaveTransientDemand(resolvedWavePreset)',
  'playWaveStarterGradientTone({',
  'playWaveStarterHarmonicPlaybackPlans({',
  'recordAudioPressureAdaptiveAction(\'wave-starter-lane-space-routed\')',
];
for (const needle of forbiddenInApp) {
  if (app.includes(needle)) failures.push(`App.tsx still owns wave-starter emit detail: ${needle}`);
}

const forbiddenInBoundary = [
  'useRef(',
  'useState(',
  'useEffect(',
  'audioCtxRef',
  'nexusParamsRef',
  'waveSoundRuntimeRef',
  'longToneHoldRef',
  'enterHoldRef',
  'transientDriveSendsRef',
  'collectiveFxRef',
  'getLiveMasterBus(',
];
for (const needle of forbiddenInBoundary) {
  if (boundary.includes(needle)) failures.push(`emit boundary depends on App-local runtime detail: ${needle}`);
}

if (failures.length) {
  console.error('[wave-starter-emit-attack-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[wave-starter-emit-attack-boundary] OK');
