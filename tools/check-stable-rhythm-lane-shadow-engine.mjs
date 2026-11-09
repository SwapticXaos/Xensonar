import fs from 'node:fs';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const lanePath = 'src/features/xensonar/audio/stableRhythmLane.ts';
const lane = fs.readFileSync(lanePath, 'utf8');
const pressure = fs.readFileSync('src/core/audio/audioPressureMap.ts', 'utf8');

const requiredLane = [
  'export type StableRhythmLaneStepPlan',
  'export type StableRhythmLaneActionPort',
  'buildStableRhythmLaneStepPlan',
  'executeStableRhythmLaneStepPlan',
  'stationary-stale-dropped',
  'stable-rhythm-shadow-plan-built',
  'stable-rhythm-shadow-plan-fault',
];
const requiredApp = [
  'buildStableRhythmLaneStepPlan',
  'executeStableRhythmLaneStepPlan',
  'const stationaryPlan = buildStableRhythmLaneStepPlan',
  'if (stationaryPlan.stale)',
  'scheduleDrumStep: (plan)',
  'scheduleBassStep: (plan)',
  'applyMyzelStep: (plan)',
];
const requiredPressure = [
  "'stable-rhythm-shadow-plan-built'",
  "'stable-rhythm-shadow-plan-empty'",
  "'stable-rhythm-shadow-plan-fault'",
  "'stationary-stale-dropped'",
];
const missingLane = requiredLane.filter((needle) => !lane.includes(needle));
const missingApp = requiredApp.filter((needle) => !app.includes(needle));
const missingPressure = requiredPressure.filter((needle) => !pressure.includes(needle));
if (missingLane.length || missingApp.length || missingPressure.length) {
  console.error('Stable rhythm lane shadow engine contract failed.');
  if (missingLane.length) console.error('Missing lane markers:', missingLane.join(', '));
  if (missingApp.length) console.error('Missing App markers:', missingApp.join(', '));
  if (missingPressure.length) console.error('Missing pressure markers:', missingPressure.join(', '));
  process.exit(1);
}
console.log('Stable rhythm lane shadow engine contract OK.');
