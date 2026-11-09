import fs from 'node:fs';
const app = fs.readFileSync('src/App.tsx', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const forbiddenInApp = [
  'createStableStationaryAudioLaneRuntime',
  'buildStationaryLaneRenderPlan',
  'stationary_lane_backlog_circuit_breaker',
  'stationary-pressure-horizon-clamped',
  'stationary-scheduler-stall-reset',
];
const found = forbiddenInApp.filter((needle) => app.includes(needle));
const forbiddenFiles = [
  'src/features/xensonar/audio/stationaryLaneRenderPlan.ts',
];
const existingFiles = forbiddenFiles.filter((file) => fs.existsSync(file));
if (found.length || existingFiles.length) {
  console.error('Stationary lane untouched rebase contract failed.');
  if (found.length) console.error('Forbidden App markers:', found.join(', '));
  if (existingFiles.length) console.error('Forbidden stationary experiment files:', existingFiles.join(', '));
  process.exit(1);
}
if (!(packageJson.version.startsWith('3.2.91.6.7.') || packageJson.version.startsWith('3.2.91.6.8.'))) {
  console.error(`Expected package version in 3.2.91.6.7.x or 3.2.91.6.8.x, got ${packageJson.version}`);
  process.exit(1);
}
console.log('Stationary lane untouched on input rebase contract OK.');
