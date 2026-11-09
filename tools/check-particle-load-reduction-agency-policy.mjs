import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
function must(path, needle, label) {
  const text = read(path);
  if (!text.includes(needle)) failures.push(`${path}: missing ${label}`);
}

must('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', "export type ParticleLoadReductionMode", 'ParticleLoadReductionMode type');
must('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', "'soft-taper'", 'soft taper mode');
must('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', "'adaptive-thin'", 'adaptive thin mode');
must('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', "'emergency-thin'", 'emergency thin mode');
must('src/features/xensonar/performanceCrisis/performanceCrisisRuntimePolicies.ts', 'resolveParticleLoadReduction', 'runtime resolver');
must('src/features/xensonar/performanceCrisis/performanceCrisisRuntimePolicies.ts', 'particleLoadReductionMode?: ParticleLoadReductionSelection', 'runtime override option');
must('src/features/xensonar/performanceCrisis/particleCrisisAgencyPolicy.ts', 'resolveParticleLoadReductionScale', 'load-reduction scale helper');
must('src/features/xensonar/performanceCrisis/particleCrisisAgencyPolicy.ts', "surface: \"audio-intent\" | \"flush-admission\"", 'separate audio/flush surfaces');
must('src/features/xensonar/performanceCrisis/particleCrisisAgencyPolicy.ts', 'raw * raw * (3 - 2 * raw)', 'smoothstep taper instead of abrupt drop');
must('src/features/xensonar/rooms/particleAudioIntentShaper.ts', "resolveParticleLoadReductionScale(params.performancePolicy, localPressure, 'audio-intent')", 'direct-audio intent taper');
must('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts', 'resolveParticleFlushAdmissionContract', 'quantized flush still policy-bound');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'Partikel-Dichte unter Druck', 'UI density control');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'data-particle-load-reduction-agency="optional-total-load-taper"', 'UI agency marker');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'erst verteilen, dann bei wirklichem', 'UI smooth-before-thin explanation');
must('src/App.tsx', 'particleLoadReductionMode', 'App hands through optional density mode');

const lane = read('src/features/xensonar/rooms/resonanceParticleSimulationLane.ts');
if (!lane.includes('ripple.radius += contract.impactRippleRadiusStep * particleMotionScale')) {
  failures.push('Ringwellen/impact ripples must remain outside ambient/load reduction.');
}
if (!lane.includes('recentImpactMotion ? 1 : ambientMotionScale')) {
  failures.push('Impact push preservation must remain in particle motion lane.');
}

if (failures.length) {
  console.error('[particle-load-reduction-agency-policy] FAIL');
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[particle-load-reduction-agency-policy] OK · optional total-load taper is agency-bound, smooth, and preserves ring/impact motion.');
