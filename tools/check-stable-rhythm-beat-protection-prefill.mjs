import fs from 'node:fs';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const lane = fs.readFileSync('src/features/xensonar/audio/stableRhythmLane.ts', 'utf8');
const pressure = fs.readFileSync('src/core/audio/audioPressureMap.ts', 'utf8');

const requiredLane = [
  'StableRhythmLaneBeatProtectionMode',
  'resolveStableRhythmLaneBeatProtection',
  'wave-starter-critical-pressure-protects-beat',
  'wave-starter-hold-arms-beat-prefill-before-stall',
  'targetHorizonSec: 1.12',
  'maxStepsPerTick: 26',
  'stable-rhythm-beat-protection-armed',
  'stable-rhythm-protected-prefill-window',
];
const requiredApp = [
  'readWaveStarterProcessorRuntimePressureFeedbackReportFromBrowser',
  'resolveStableRhythmBeatProtectionInput',
  'resolveWaveStarterHoldFallbackMaxPulses',
  'beatProtection: resolveStableRhythmBeatProtectionInput()',
  'stable-rhythm-wellenstarter-pulse-throttled-for-beat',
];
const requiredPressure = [
  "'stable-rhythm-beat-protection-armed'",
  "'stable-rhythm-protected-prefill-window'",
  "'stable-rhythm-wellenstarter-pulse-throttled-for-beat'",
];
const forbiddenApp = [
  'wave-starter-root-follow-is-culprit',
  'workletOnlyDefaultForStableBeat',
];
const missingLane = requiredLane.filter((needle) => !lane.includes(needle));
const missingApp = requiredApp.filter((needle) => !app.includes(needle));
const missingPressure = requiredPressure.filter((needle) => !pressure.includes(needle));
const forbidden = forbiddenApp.filter((needle) => app.includes(needle));
if (missingLane.length || missingApp.length || missingPressure.length || forbidden.length) {
  console.error('Stable rhythm beat protection prefill contract failed.');
  if (missingLane.length) console.error('Missing lane markers:', missingLane.join(', '));
  if (missingApp.length) console.error('Missing App markers:', missingApp.join(', '));
  if (missingPressure.length) console.error('Missing pressure markers:', missingPressure.join(', '));
  if (forbidden.length) console.error('Forbidden markers:', forbidden.join(', '));
  process.exit(1);
}
console.log('Stable rhythm beat protection prefill contract OK.');
