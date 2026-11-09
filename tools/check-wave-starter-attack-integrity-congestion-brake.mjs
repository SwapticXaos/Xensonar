import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const congestion = read('src/features/xensonar/audio/waveStarterAttackIntegrityCongestionBrake.ts');
const capacity = read('src/features/xensonar/audio/waveStarterKeyboardGestureCapacity.ts');
const emit = read('src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts');
const runtime = read('src/features/xensonar/audio/waveStarterLaneRuntime.ts');
const panel = read('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx');

const required = [
  [congestion, "type WaveStarterCongestionState = 'clear' | 'watch' | 'brake' | 'critical'", 'congestion state union missing'],
  [congestion, 'resolveWaveStarterAttackSofteningForEmit', 'emit softening integrity resolver missing'],
  [congestion, 'attackSofteningBlockedOutsideCongestion', 'outside-congestion softening block counter missing'],
  [congestion, 'congestionBrakeEntered', 'congestion brake enter counter missing'],
  [congestion, 'congestionBrakeReleased', 'congestion brake release counter missing'],
  [capacity, 'gliss-watch-worklet-prep', 'watch route for full-attack worklet prep missing'],
  [capacity, "reason: 'glissando-watch-worklet-prep-full-attack'", 'watch state does not preserve full attack'],
  [capacity, "reason: 'glissando-soft-attack-temporary-congestion-brake'", 'soft attack route is not explicitly temporary congestion brake'],
  [capacity, 'microAttackSoftening: 1,', 'capacity lacks explicit full attack value'],
  [capacity, 'congestionBrakeState: args.congestionState', 'wave options do not carry congestion state'],
  [capacity, 'attackIntegrityPreserved: true', 'wave options do not mark attack integrity'],
  [emit, 'resolveWaveStarterAttackSofteningForEmit', 'emit boundary does not gate softening by congestion state'],
  [runtime, 'congestionBrakeState?: "clear" | "watch" | "brake" | "critical"', 'runtime options lack congestion brake state'],
  [panel, 'Wellenstarter Stau-Bremse', 'compact crisis management line missing'],
];

for (const [haystack, token, message] of required) {
  if (!haystack.includes(token)) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
}

if (/glissando-open-capacity'[\s\S]{0,500}microAttackSoftening:\s*(?!1[,\n])/.test(capacity)) {
  console.error('[FAIL] glissando-open-capacity appears to soften attack outside congestion');
  process.exit(1);
}

console.log('[OK] wave starter attack integrity congestion brake contract holds');
