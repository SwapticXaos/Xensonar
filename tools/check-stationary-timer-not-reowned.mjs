import fs from 'node:fs';
const app = fs.readFileSync('src/App.tsx', 'utf8');
const forbidden = [
  'createStableStationaryAudioLaneRuntime',
  'new Worker(',
  'timerWorkerBlob',
  'stableStationaryLaneRuntime',
  'StableStationaryAudioLaneRuntime',
  'createStableStationaryClock',
];
const found = forbidden.filter((needle) => app.includes(needle));
const forbiddenFiles = [
  'src/features/xensonar/audio/stationaryLaneRenderPlan.ts',
  'src/features/xensonar/audio/stableStationaryLaneScheduler.ts',
];
const existing = forbiddenFiles.filter((file) => fs.existsSync(file));
if (found.length || existing.length) {
  console.error('Stationary timer not reowned contract failed.');
  if (found.length) console.error('Forbidden App/runtime markers:', found.join(', '));
  if (existing.length) console.error('Forbidden failed-experiment files:', existing.join(', '));
  process.exit(1);
}
console.log('Stationary timer not reowned contract OK.');
