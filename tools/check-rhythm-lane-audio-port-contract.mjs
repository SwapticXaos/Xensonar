import fs from 'node:fs';
const lane = fs.readFileSync('src/features/xensonar/audio/stableRhythmLane.ts', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const required = [
  'StableRhythmLaneActionPort',
  'scheduleMetronomePulse?',
  'scheduleDrumStep?',
  'scheduleBassStep?',
  'applyMyzelStep?',
];
const appRequired = [
  'scheduleMetronomePulse: (plan)',
  'scheduleDrumStep: (plan)',
  'scheduleBassStep: (plan)',
  'applyMyzelStep: (plan)',
  'executeStableRhythmLaneStepPlan(stationaryPlan, {',
];
const missing = required.filter((needle) => !lane.includes(needle));
const appMissing = appRequired.filter((needle) => !app.includes(needle));
if (missing.length || appMissing.length) {
  console.error('Rhythm lane audio port contract failed.');
  if (missing.length) console.error('Missing lane markers:', missing.join(', '));
  if (appMissing.length) console.error('Missing App port markers:', appMissing.join(', '));
  process.exit(1);
}
console.log('Rhythm lane audio port contract OK.');
