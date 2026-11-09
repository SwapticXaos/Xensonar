import fs from 'node:fs';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const guard = fs.readFileSync('src/features/xensonar/audio/waveStarterLaneGuard.ts', 'utf8');
const pressure = fs.readFileSync('src/core/audio/audioPressureMap.ts', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const requiredGuard = [
  'resolveWaveStarterLaneAdmission',
  'commitWaveStarterLaneAdmission',
  'defer-slot',
  'drop-overload',
  'recentStarts120ms',
  'minSpacingMs',
];
const requiredApp = [
  'waveStarterLaneGuardRef',
  'waveStarterDeferredAttacksRef',
  'enqueueWaveStarterDeferredAttack',
  'flushWaveStarterDeferredAttacks',
  'WAVE_STARTER_DEFER_STALE_MS',
  'resolveWaveStarterLaneAdmission({',
  "recordAudioPressureAdaptiveAction('wave-starter-lane-deferred')",
  "recordAudioPressureAdaptiveAction('wave-starter-lane-flushed')",
  "recordAudioPressureAdaptiveAction('wave-starter-lane-stale-dropped')",
  'const waveOutput = getLiveMasterBus(ctx, "space")',
];
const requiredPressure = [
  "'wave-starter-lane-admitted'",
  "'wave-starter-lane-deferred'",
  "'wave-starter-lane-flushed'",
  "'wave-starter-lane-stale-dropped'",
  "'wave-starter-lane-space-routed'",
];

const missingGuard = requiredGuard.filter((needle) => !guard.includes(needle));
const missingApp = requiredApp.filter((needle) => !app.includes(needle));
const missingPressure = requiredPressure.filter((needle) => !pressure.includes(needle));

if (missingGuard.length || missingApp.length || missingPressure.length) {
  console.error('Wave starter lane isolation contract failed.');
  if (missingGuard.length) console.error('Missing guard markers:', missingGuard.join(', '));
  if (missingApp.length) console.error('Missing App markers:', missingApp.join(', '));
  if (missingPressure.length) console.error('Missing pressure markers:', missingPressure.join(', '));
  process.exit(1);
}

const playWaveIndex = app.indexOf('const playWaveStartSound =');
const firstFxIndex = app.indexOf('ensureTransientDriveDevice(ctx);', playWaveIndex);
const admissionIndex = app.indexOf('resolveWaveStarterLaneAdmission({', playWaveIndex);
const deferIndex = app.indexOf('enqueueWaveStarterDeferredAttack(baseFreq, isSector, nowMs', playWaveIndex);
if (playWaveIndex < 0 || admissionIndex < 0 || firstFxIndex < 0 || admissionIndex > firstFxIndex || deferIndex < 0 || deferIndex > firstFxIndex) {
  console.error('Wave starter admission/deferral must happen before transient/FX device allocation.');
  process.exit(1);
}

if (guard.includes('admit-essential') || app.includes("const essentialWaveOnly = waveLaneAdmission.kind === 'admit-essential'")) {
  console.error('Essential wave mode must not start a cut-down attack; overload must defer before audio allocation.');
  process.exit(1);
}

if (!app.includes("queue.length = 0;\n    queue.push(request);")) {
  console.error('Wave deferral queue must be a latest-intent slot, not a backlog.');
  process.exit(1);
}

if (!(pkg.version.startsWith('3.2.91.6.7.') || pkg.version.startsWith('3.2.91.6.8.'))) {
  console.error(`Unexpected package version ${pkg.version}`);
  process.exit(1);
}

console.log('Wave starter lane isolation contract OK.');
