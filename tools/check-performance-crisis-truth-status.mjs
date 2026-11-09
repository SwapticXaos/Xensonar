import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const panel = read('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx');
const registry = read('src/features/xensonar/performanceCrisis/performanceCrisisPresetRegistry.ts');
const rootPlayback = read('src/features/xensonar/material/useRootFollowLoopPlayback.ts');
const particlePolicy = read('src/features/xensonar/performanceCrisis/particleCrisisAgencyPolicy.ts');
const quantizedRuntime = read('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts');
const particleLane = read('src/features/xensonar/rooms/resonanceParticleSimulationLane.ts');
const waveGuard = read('src/features/xensonar/audio/waveStarterLaneGuard.ts');
const waveRuntime = read('src/features/xensonar/audio/waveStarterLaneRuntime.ts');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(panel.includes('data-crisis-truth-audit="root-follow"'), 'Root-Follow truth audit block missing.');
assert(panel.includes('data-crisis-truth-audit="particles"'), 'Particle truth audit block missing.');
assert(panel.includes('data-crisis-truth-audit="wave-starter"'), 'Wave-starter truth audit block missing.');
assert(panel.includes('Wirksam: Druckreduktion'), 'Root-Follow pressure reduction must now be labelled as wirksam.');
assert(panel.includes('Wirksam: Late-Grain'), 'Root-Follow late-grain strategy must now be labelled as wirksam.');
assert(panel.includes('Renderer-Druckpfad'), 'Root-Follow renderer pressure path truth line missing.');
assert(panel.includes('Root-Follow-Renderern gelesen'), 'Root-Follow renderer policy binding must be explained explicitly.');
assert(panel.includes('formatWaveStarterPresetOptionLabel'), 'Wave-starter selector must not show generic preset labels without effective admission context.');
assert(panel.includes('Offen heißt jetzt offen'), 'Wave-starter open correction note missing.');
assert(panel.includes('Noch kein eigener Regler'), 'Wave-starter lack of dedicated agency control must be stated.');
assert(registry.includes('id: "open-687"'), 'Open preset missing.');
assert(/id:\s*"open-687"[\s\S]*?waveStarter:\s*{[\s\S]*?admissionMode:\s*"open"/.test(registry), 'Open preset must be actually open for wave-starter admission.');
assert(waveGuard.includes('openGate') && waveGuard.includes('policy?.admissionMode === \'open\''), 'Wave-starter open admission is not wired into lane guard.');
assert(waveRuntime.includes('getPolicy: () => WaveStarterRuntimePolicy') || waveRuntime.includes('getPolicy: () => WaveStarterRuntimePolicy | undefined'), 'Wave-starter runtime must read runtime policy.');
assert(rootPlayback.includes('resolveCrisisQuantizedValue') && rootPlayback.includes('scheduler-tick-quantized-fallback'), 'Root-Follow quantized fallback must be runtime-wired.');
const rootMaterialRenderer = read('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts');
const rootSynthCoordinator = read('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts');
assert(rootMaterialRenderer.includes('applyRootFollowCrisisDensityToGranularSettings'), 'Root-Follow material renderer must apply density reduction.');
assert(rootMaterialRenderer.includes('resolveRootFollowLateWindowStart'), 'Root-Follow material renderer must apply Late-Grain/Stale policy.');
assert(rootSynthCoordinator.includes('limitRootFollowDirectEventsUnderCrisis'), 'Root-Follow synth renderer must apply density/stale event admission.');
assert(particlePolicy.includes('resolveParticleFlushAdmissionContract') && particlePolicy.includes('resolveParticleLoadReductionScale'), 'Particle policy admission/load reduction must be runtime policy code.');
assert(quantizedRuntime.includes('resolveCrisisQuantizedEventTime') && quantizedRuntime.includes('resolveParticleDeferredDueTime'), 'Particle quantization fallback must be queue-wired.');
assert(particleLane.includes('resolveParticleAmbientMotionTarget') && particleLane.includes('recentImpactMotion ? 1 : ambientMotionScale'), 'Particle ambient damping must preserve fresh impact motion.');

console.log(JSON.stringify({
  ok: true,
  guard: 'performance-crisis-truth-status',
  truthAudit: {
    rootFollow: 'quantization wired; density/late/stale/catch-up now renderer-wired; grain projection remains manual for base settings',
    particles: 'crisis mode, quantization, density and ambient motion are wired',
    waveStarter: 'open preset now admission=open; no dedicated off/fallback/strict control yet',
  },
}, null, 2));
