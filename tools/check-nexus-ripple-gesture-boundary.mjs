#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const app = read('src/App.tsx');
const boundaryPath = 'src/features/xensonar/rooms/nexusRippleGestureBoundary.ts';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const launchActions = read('src/features/xensonar/rooms/resonanceWaveLaunchActions.ts');

const failures = [];
const mustContain = [
  [boundary, 'export interface NexusRippleGestureRuntime', 'gesture runtime contract missing'],
  [boundary, 'export function runNexusRippleGesture', 'ripple gesture export missing'],
  [boundary, 'export function runNexusDirectedPulseGesture', 'directed pulse gesture export missing'],
  [boundary, 'pushResonanceRippleLaunch({', 'ripple gesture must delegate launch-object creation to resonanceWaveLaunchActions'],
  [boundary, 'pushResonanceSectorPulseLaunch({', 'directed pulse gesture must delegate sector-pulse creation to resonanceWaveLaunchActions'],
  [boundary, 'runtime.markWaveLaunch();', 'gesture boundary must preserve wave launch marker side effect'],
  [boundary, 'runtime.playWaveStartSound(runtime.freqFromY(launch.cursorY), launch.isSector)', 'gesture boundary must preserve launch-cursor audio preview routing'],
  [boundary, 'if (!runtime.nexusActive) return null;', 'gesture boundary must preserve inactive-nexus gate'],
  [app, 'runNexusRippleGesture(buildNexusRippleGestureRuntime(), direction);', 'spawnNexusRipple must delegate to gesture boundary'],
  [app, 'runNexusDirectedPulseGesture(buildNexusRippleGestureRuntime(), direction);', 'triggerDirectedPulse must delegate to gesture boundary'],
  [app, 'refs: nexusRefs.current', 'App runtime builder must pass current nexus refs'],
  [app, 'params: nexusParamsRef.current', 'App runtime builder must pass current nexus params'],
  [app, 'baseWaveMaxRadius: BASE_WAVE_MAX_RADIUS', 'App runtime builder must preserve base max radius contract'],
  [app, 'clampValue: clamp', 'App runtime builder must preserve existing clamp helper'],
  [app, 'freqFromY', 'App runtime builder must preserve existing frequency mapping helper'],
  [app, 'markWaveLaunch', 'App runtime builder must pass existing launch marker'],
  [app, 'playWaveStartSound', 'App runtime builder must pass existing Wellenstarter sound entrypoint'],
  [launchActions, 'refs.ripples.push(ripple)', 'wave launch action must still own ripple mutation'],
  [launchActions, 'refs.sectorPulses.push(pulse)', 'wave launch action must still own sector-pulse mutation'],
];
for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const appSlice = app.match(/const buildNexusRippleGestureRuntime = \(\) => \(\{[\s\S]*?\n  useEffect\(\(\) => \{/);
if (!appSlice) {
  failures.push('Could not locate App.tsx nexus ripple gesture slice');
} else {
  const slice = appSlice[0];
  const forbiddenInAppSlice = [
    'pushResonanceRippleLaunch({',
    'pushResonanceSectorPulseLaunch({',
    'const launch = pushResonance',
    'playWaveStartSound(freqFromY(launch.cursorY)',
    'refs.ripples.push',
    'refs.sectorPulses.push',
  ];
  for (const needle of forbiddenInAppSlice) {
    if (slice.includes(needle)) failures.push(`App.tsx still owns nexus ripple gesture detail: ${needle}`);
  }
}

const forbiddenInBoundary = [
  'useState(',
  'useEffect(',
  'useRef(',
  'audioCtx',
  'ensureAudioReady',
  'requestWaveStarterLaneAttack',
  'setNexusActive',
  'nexusParamsRef',
  'nexusRefs',
  'BASE_WAVE_MAX_RADIUS',
];
for (const needle of forbiddenInBoundary) {
  if (boundary.includes(needle)) failures.push(`nexus ripple gesture boundary owns App-specific/runtime detail: ${needle}`);
}

if (app.includes('pushResonanceRippleLaunch') || app.includes('pushResonanceSectorPulseLaunch')) {
  failures.push('App.tsx must not import or call raw resonance wave launch actions after gesture boundary extraction');
}

if (failures.length) {
  console.error('[nexus-ripple-gesture-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[nexus-ripple-gesture-boundary] OK');
