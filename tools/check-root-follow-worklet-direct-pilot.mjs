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

must('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', "'worklet-direct-pilot'", 'worklet-direct-pilot voice engine mode');
must('src/features/xensonar/performanceCrisis/rootFollowVoiceEngineOptions.ts', 'Worklet Direct-Pilot', 'UI exposes active worklet pilot option via shared options');
must('src/features/xensonar/performanceCrisis/rootFollowVoiceEngineOptions.ts', 'Granular/Material bleiben Legacy', 'UI limits pilot scope to direct/synth via shared options');

must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'root-follow-worklet-direct-pilot-events', 'direct pilot worklet message protocol');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'routeRootFollowWorkletDirectPilotEvents', 'direct pilot route function');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'directPilotScope', 'direct pilot scope marker');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'root-follow-direct-synth-only', 'pilot scope direct/synth only');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'handle.outputGain.gain', 'pilot uses gain gate instead of replacing destination path');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'silentShadowOnly: false', 'active pilot truth status is not silent shadow');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'handledEventIds: new Set<string>()', 'unsupported pilot fails open to legacy schedule');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'new Set(eligible.map((event) => event.id))', 'loaded pilot reports handled event ids');

must('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', "voiceEngineMode === 'worklet-direct-pilot'", 'coordinator gates active pilot by explicit engine mode');
must('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', "event.renderSourceKind === 'synth-live'", 'pilot only handles synth-live events');
must('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', 'finalScheduleEvents = pooledScheduleEvents.filter', 'handled pilot events are removed from legacy schedule');
must('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', 'workletDirectPilotFallbackReason', 'traffic reports fallback reason');
must('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', 'for (const event of finalScheduleEvents)', 'legacy fallback schedule remains active for unhandled events');

must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', "| 'worklet-direct-pilot';", 'voice pool runtime accepts direct pilot mode');
must('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', "| 'worklet-direct-pilot';", 'voice pool audible path accepts direct pilot');
must('src/features/xensonar/rootFollow/rootFollowActiveVoiceRuntime.ts', 'ROOT_FOLLOW_WORKLET_DIRECT_PILOT_PREPARATION', 'active voice runtime carries pilot preparation marker');
must('src/core/audio/audioWorkletVoicePoolBoundary.ts', 'worklet-direct-pilot', 'audio worklet prep stage includes direct pilot');

mustNot('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'sample-block', 'direct pilot bridge must not claim sample-block handling');
mustNot('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'material-import', 'direct pilot bridge must not claim material-import handling');

if (failures.length) {
  console.error('[root-follow-worklet-direct-pilot] FAIL');
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[root-follow-worklet-direct-pilot] OK · Root-Follow has an opt-in active Worklet Direct/Synth pilot with Legacy fallback and no Granular/Material claim.');
