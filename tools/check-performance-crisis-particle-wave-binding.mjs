import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const app = read('src/App.tsx');
const appPerformanceBoundary = read('src/features/xensonar/performanceCrisis/buildAppPerformanceCrisisPanelBoundary.ts');
const policyHook = read('src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.ts');
const shaper = read('src/features/xensonar/rooms/particleAudioIntentShaper.ts');
const runtimePolicy = read('src/features/xensonar/performanceCrisis/performanceCrisisRuntimePolicies.ts');
const quantized = read('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts');
const registry = read('src/features/xensonar/performanceCrisis/performanceCrisisPresetRegistry.ts');
const waveGuard = read('src/features/xensonar/audio/waveStarterLaneGuard.ts');
const waveRuntime = read('src/features/xensonar/audio/waveStarterLaneRuntime.ts');
const panel = read('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx');
const particleWaveTabs = read('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisParticleWaveTabs.tsx');

const particleLane = read('src/features/xensonar/rooms/resonanceParticleSimulationLane.ts');
const particleFrameBoundary = read('src/features/xensonar/rooms/appParticleSimulationFrameBoundary.ts');

const required = [
  [app, 'usePerformanceCrisisUiPolicyState({', 'App must consume the Performance & Krisenmanagement policy hook.'],
  [policyHook, 'resolvePerformanceCrisisRuntimePolicy({', 'Policy hook must derive runtime policy from Performance & Krisenmanagement style sources.'],
  [appPerformanceBoundary, 'particlePresetId: uiPolicyState.particleCrisisPresetId', 'Performance crisis App boundary must allow Partikel to use a separate style source.'],
  [appPerformanceBoundary, 'waveStarterPresetId: uiPolicyState.waveStarterCrisisPresetId', 'Performance crisis App boundary must allow Wellenstarter to use a separate style source.'],
  [app, 'performancePolicy: performanceCrisisRuntimePolicy.particles', 'Particle simulation lane must receive the active Performance policy.'],
  [app, 'getPolicy: () => performanceCrisisRuntimePolicy.waveStarter', 'Wellenstarter runtime must receive the active Performance policy from App.'],
  [waveRuntime, 'const policy = deps.getPolicy()', 'Wellenstarter runtime must pass the active Performance policy to the guard.'],
  [app, 'runAppParticleSimulationFrameBoundary', 'App must route particle simulation/rendering through the extracted frame boundary.'],
  [particleFrameBoundary, 'advanceResonanceParticleSimulationLane', 'Particle frame boundary must route simulation through the extracted lane.'],
  [particleFrameBoundary, 'renderResonanceParticleSimulationLane', 'Particle frame boundary must route rendering through the extracted lane.'],
  [particleLane, 'const audioIntentCandidates: ParticleAudioIntentCandidate[] = []', 'Particle lane must collect candidates before audio admission.'],
  [particleLane, 'selectParticleAudioIntentCandidates', 'Particle lane must select particle audio intents via shaper.'],
  [particleLane, 'commitParticleAudioIntent', 'Particle lane must commit selected particle audio intents.'],
  [shaper, 'performancePolicy?: ParticleAudioIntentRuntimePolicy', 'Particle shaper params must expose policy.'],
  [shaper, 'denseFrameMaxIntents', 'Particle shaper must keep a policy budget.'],
  [runtimePolicy, 'resolvePerformanceCrisisRuntimePolicy', 'Runtime policy resolver missing.'],
  [registry, 'pressure-safe-6879', '6.8.79-like preset must stay registered.'],
  [quantized, 'agent.lastAudioIntentHit ?? agent.lastHit', 'Quantized runtime must prefer lastAudioIntent over visual lastHit.'],
  [quantized, 'lastAudioIntentAudioTimeSec', 'Quantized runtime must preserve audio-intent event time.'],
  [waveGuard, 'policy?: WaveStarterRuntimePolicy', 'WaveStarter guard must accept policy.'],
  [waveGuard, 'policy?.admissionMode', 'WaveStarter guard must use policy admission mode.'],
  [particleWaveTabs, 'Aktiv gebunden', 'UI must no longer describe Partikel/Wellenstarter as a future binding step.'],
  [particleWaveTabs, 'Partikel-Stilquelle', 'UI must expose the Partikel style source.'],
  [particleWaveTabs, 'Wellenstarter-Stilquelle', 'UI must expose the Wellenstarter style source.'],
];

const missing = required.filter(([haystack, needle]) => !haystack.includes(needle));
if (missing.length) {
  console.error('[performance-crisis-particle-wave-binding] missing contracts:');
  for (const [, needle, message] of missing) console.error(`- ${needle}: ${message}`);
  process.exit(1);
}

const forbidden = [
  'Nächster Bindungsschritt: `lastHit` bleibt visuell/physikalisch',
  'const agentVolume = p.particleVolume * (p.agentVolumes[aIdx] ?? 1) * Math.pow(waveGain, 2.2);\n            const impactPitch = resolveParticleImpactPitch({\n              rootFreq: targetFreq,',
];
const violations = forbidden.filter((needle) => app.includes(needle) || panel.includes(needle) || particleWaveTabs.includes(needle));
if (violations.length) {
  console.error('[performance-crisis-particle-wave-binding] stale/direct binding still present:');
  for (const needle of violations) console.error(`- ${needle}`);
  process.exit(1);
}

console.log('[performance-crisis-particle-wave-binding] ok');
