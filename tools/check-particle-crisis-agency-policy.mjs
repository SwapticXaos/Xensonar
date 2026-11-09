import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
function must(path, needle, label) {
  const text = read(path);
  if (!text.includes(needle)) failures.push(`${path}: missing ${label}`);
}

must('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', "export type ParticleCrisisMode", 'ParticleCrisisMode type');
must('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', "'quantization-loosening'", 'quantization loosening mode');
must('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', "'quantization-pyramid'", 'quantization pyramid mode');
must('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', "'quantization-liberation'", 'quantization liberation mode');
must('src/features/xensonar/performanceCrisis/particleCrisisAgencyPolicy.ts', 'resolveParticleFlushAdmissionContract', 'flush admission policy helper');
must('src/features/xensonar/performanceCrisis/particleCrisisAgencyPolicy.ts', 'resolveParticleDeferredDueTime', 'deferred due policy helper');
must('src/features/xensonar/performanceCrisis/particleCrisisAgencyPolicy.ts', 'stepParticleAmbientMotionScale', 'organic motion smoothing helper');
must('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts', 'getParticlePolicy?: () => ParticleAudioIntentRuntimePolicy', 'quantized runtime policy injection');
must('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts', 'resolveParticleFlushAdmissionContract', 'policy-bound flush contract');
must('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts', 'resolveParticleDeferredDueTime({', 'policy-bound deferred scheduling');
must('src/features/xensonar/rooms/resonanceParticleSimulationLane.ts', 'ambientCrisisMotionScale', 'field-state motion follower');
must('src/features/xensonar/rooms/resonanceParticleSimulationLane.ts', 'recentImpactMotion ? 1 : ambientMotionScale', 'impact-preserving motion damping');
must('src/features/xensonar/rooms/resonanceParticleSimulationLane.ts', 'ripple.radius += contract.impactRippleRadiusStep * particleMotionScale', 'impact ripple not ambient-damped');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'data-particle-crisis-agency-controls="liquid-optional"', 'UI agency controls marker');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'Quantisierungs-Lockerung', 'UI loosening option');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'Quantisierungs-Pyramide', 'UI pyramid option');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'Quantisierungs-Befreiung', 'UI liberation option');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'Ringwellen und Stoß/Schub', 'UI preserve-wave/impact note');

const app = read('src/App.tsx');
if (!app.includes('getParticlePolicy: () => performanceCrisisRuntimePolicy.particles')) failures.push('App.tsx must pass active particle policy to quantized collision runtime.');
if (app.includes('dropParticlesFirst')) failures.push('Forbidden fictional/drop-first marker found.');

if (failures.length) {
  console.error('[particle-crisis-agency-policy] FAIL');
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[particle-crisis-agency-policy] OK · Partikel-Krisenmodi are policy-bound, optional, and preserve ring/impact motion.');
