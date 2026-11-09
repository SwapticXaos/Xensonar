import fs from 'node:fs';

const lane = fs.readFileSync('src/features/xensonar/input/resonanceKeyboardPitchLane.ts', 'utf8');
const guard = fs.readFileSync('src/features/xensonar/audio/waveStarterLaneGuard.ts', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const requiredLane = [
  'chordClusterCount',
  'chordClusterStartedAtMs',
  'glissRunDirection',
  'glissRunLength',
  "reason: 'single-hit' | 'settled-hit' | 'chord-cluster'",
  'const smallChordCluster = chordClusterWindow && state.chordClusterCount <= 3',
  'const monotoneStepRun = state.glissRunLength >= 3',
  'const sustainedBurst = state.burstCount >= 4',
  "reason: chordPreviewAllowance ? 'chord-cluster'",
  'state.directPreviewCooldownUntilMs = nowMs + (chordPreviewAllowance ? 6 : 22)',
];
const missingLane = requiredLane.filter((needle) => !lane.includes(needle));

const forbiddenLane = [
  'state.burstCount >= 2 ||',
];
const presentForbidden = forbiddenLane.filter((needle) => lane.includes(needle));

const requiredGuard = [
  '? 24',
  '? 14',
  ': 4;',
  'recentStarts60ms >= 4',
  'recentStarts120ms >= 5',
  'recentStarts420ms >= 12',
  'recentDefers120ms >= 8 && recentStarts120ms >= 3',
];
const missingGuard = requiredGuard.filter((needle) => !guard.includes(needle));

if (missingLane.length || missingGuard.length || presentForbidden.length) {
  console.error('Keyboard chord allowance contract failed.');
  if (missingLane.length) console.error('Missing lane markers:', missingLane.join(', '));
  if (missingGuard.length) console.error('Missing wave guard markers:', missingGuard.join(', '));
  if (presentForbidden.length) console.error('Forbidden old gliss markers still present:', presentForbidden.join(', '));
  process.exit(1);
}

if (!(pkg.version.startsWith('3.2.91.6.7.') || pkg.version.startsWith('3.2.91.6.8.'))) {
  console.error(`Unexpected package version ${pkg.version}`);
  process.exit(1);
}

console.log('Keyboard chord allowance contract OK.');
