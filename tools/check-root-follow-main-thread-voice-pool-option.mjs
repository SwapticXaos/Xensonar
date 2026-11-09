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

must('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', "RootFollowVoiceEngineMode = 'legacy' | 'shadow-plan' | 'main-thread-pool' | 'worklet-shadow' | 'worklet-direct-pilot'", 'root follow voice engine mode union');
must('src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.ts', 'rootFollowVoiceEngineMode', 'UI state carries voice engine mode');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'Root-Follow Voice Engine', 'crisis manager exposes root-follow voice engine control');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'Main-Thread Voice-Pool', 'main-thread pool option is visible');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'Material-/Granular-/Samplepfade bleiben Legacy', 'UI limits scope to direct/synth');

must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'RootFollowVoicePoolRuntimeMode', 'voice pool runtime mode contract');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'applyRootFollowMainThreadVoicePoolAdmission', 'main-thread pool admission function');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', "mode: 'main-thread-pool'", 'summary can report main-thread-pool mode');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', "? 'main-thread-pooled-direct'", 'pooled direct audible path');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'isMainThreadPoolCandidate', 'pool candidate guard');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', "event.sourceKind ?? 'synth-live'", 'pool is restricted to synth-live fallback');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'rootFollowVoiceFamilyId', 'voice family identity helper');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', "split('@')", 'voice family strips occurrence suffix');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'eventsToSchedule', 'pool returns filtered schedule list');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'pooledVoiceCount', 'pooled event counter');
must('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', 'applyRootFollowMainThreadVoicePoolAdmission', 'coordinator uses pool admission');
must('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', 'pooledScheduleEvents', 'coordinator schedules pooled event list');
must('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', 'voiceEngineMode', 'coordinator reads runtime voice engine mode');
must('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', 'pooledVoiceCount', 'traffic carries pooled voice count');

must('src/features/xensonar/rootFollow/rootFollowActiveVoiceRuntime.ts', 'migrationStage: "main-thread-pool-active"', 'migration stage marks optional main-thread pool');
must('src/core/audio/audioWorkletVoicePoolBoundary.ts', 'main-thread-pool-active', 'boundary includes main-thread pool stage before worklet');
must('src/core/audio/audioWorkletVoicePoolBoundary.ts', 'main-thread-pooled', 'boundary includes main-thread pooled backend');

mustNot('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'createOscillator(', 'voice pool boundary must not create oscillators');
mustNot('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'new AudioWorkletNode', 'main-thread pool step must not instantiate worklet nodes');
mustNot('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', 'new AudioWorkletNode', 'coordinator must not switch to worklet');

if (failures.length) {
  console.error('[root-follow-main-thread-voice-pool-option] FAIL');
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[root-follow-main-thread-voice-pool-option] OK · Root-Follow Direct/Synth has an optional main-thread pool admission path with legacy/worklet scope boundaries preserved.');
