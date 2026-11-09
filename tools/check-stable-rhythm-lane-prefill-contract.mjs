import fs from 'node:fs';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const lane = fs.readFileSync('src/features/xensonar/audio/stableRhythmLane.ts', 'utf8');
const pressure = fs.readFileSync('src/core/audio/audioPressureMap.ts', 'utf8');

const laneRequired = [
  'export type StableRhythmLanePrefillWindow',
  'resolveStableRhythmLanePrefillWindow',
  'safeStartStep',
  'stable-rhythm-prefill-resynced',
  'stationary-stale-dropped',
  'scheduleUntilSec',
  'maxStepsPerTick',
];
const appRequired = [
  'resolveStableRhythmLaneTimeWindow',
  'const prefillWindow = resolveStableRhythmLaneTimeWindow',
  'prefillWindow.scheduleUntilSec',
  'plannedStableStepsThisTick < prefillWindow.maxStepsPerTick',
  'stable-rhythm-prefill-capped',
];
const pressureRequired = [
  "'stable-rhythm-prefill-resynced'",
  "'stable-rhythm-prefill-capped'",
];
const forbiddenApp = [
  'while (nextStep * stepMs < now + 0.1)',
  'createStableStationaryAudioLaneRuntime',
  'createStableStationaryClock',
  'new Worker(',
];
const missingLane = laneRequired.filter((needle) => !lane.includes(needle));
const missingApp = appRequired.filter((needle) => !app.includes(needle));
const missingPressure = pressureRequired.filter((needle) => !pressure.includes(needle));
const forbidden = forbiddenApp.filter((needle) => app.includes(needle));
if (missingLane.length || missingApp.length || missingPressure.length || forbidden.length) {
  console.error('Stable rhythm lane prefill contract failed.');
  if (missingLane.length) console.error('Missing lane markers:', missingLane.join(', '));
  if (missingApp.length) console.error('Missing App markers:', missingApp.join(', '));
  if (missingPressure.length) console.error('Missing pressure markers:', missingPressure.join(', '));
  if (forbidden.length) console.error('Forbidden App markers:', forbidden.join(', '));
  process.exit(1);
}
console.log('Stable rhythm lane prefill contract OK.');
