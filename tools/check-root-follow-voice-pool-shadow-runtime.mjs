import fs from 'node:fs';

const failures = [];
const read = (path) => fs.readFileSync(path, 'utf8');
function must(path, needle, label) {
  const text = read(path);
  if (!text.includes(needle)) failures.push(`${path}: missing ${label}`);
}
function mustNot(path, needle, label) {
  const text = read(path);
  if (text.includes(needle)) failures.push(`${path}: forbidden ${label}`);
}

must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'RootFollowVoicePoolShadowSummary', 'shadow summary contract');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', "'shadow-plan'", 'shadow-plan mode');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', "'legacy-main-thread'", 'legacy audible path remains available');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'preservesLegacyPath: true', 'legacy path preservation flag');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'wouldReuseVoiceCount', 'reuse forecast');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'wouldCreateVoiceCount', 'create forecast');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'wouldStealVoiceCount', 'steal forecast');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'staleEventCount', 'stale event forecast');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'lateEventCount', 'late event forecast');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'lifecycleStateByVoiceId', 'voice lifecycle map');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', "'active'", 'active lifecycle state');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', "'releasing'", 'releasing lifecycle state');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', "'stealable'", 'stealable lifecycle state');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', "'retired'", 'retired lifecycle state');

must('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', 'buildRootFollowVoicePoolShadowEvents', 'coordinator builds shadow events');
must('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', 'applyRootFollowMainThreadVoicePoolAdmission', 'coordinator routes through voice pool admission');
must('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', 'voicePoolShadow', 'traffic detail carries shadow summary');
must('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', 'preservesLegacyPath', 'traffic preserves legacy proof');

must('src/features/xensonar/rootFollow/rootFollowActiveVoiceRuntime.ts', 'migrationStage: "main-thread-pool-active"', 'migration stage advanced beyond shadow-plan while keeping shadow mode available');
must('src/features/xensonar/rootFollow/rootFollowActiveVoiceRuntime.ts', 'Bestehende activeSynthVoices-Map bleibt Referenz', 'active voice map remains reference');
must('src/core/audio/audioWorkletVoicePoolBoundary.ts', 'worklet-primary', 'future worklet-primary stage still explicit');
must('src/core/audio/audioWorkletVoicePoolBoundary.ts', 'shadow-plan', 'shadow-plan stage still explicit');

mustNot('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'createOscillator(', 'shadow runtime must not create oscillator nodes');
mustNot('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'createGain(', 'shadow runtime must not create gain nodes');
mustNot('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'AudioWorkletNode', 'shadow runtime must not instantiate worklet nodes');
mustNot('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', 'new AudioWorkletNode', 'coordinator must not switch to active worklet');

if (failures.length) {
  console.error('[root-follow-voice-pool-shadow-runtime] FAIL');
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[root-follow-voice-pool-shadow-runtime] OK · Root-Follow Voice-Pool Shadow observes lifecycle/reuse/steal pressure without replacing the audible legacy path.');
