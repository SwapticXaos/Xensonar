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

must('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', "'worklet-granular-shadow'", 'worklet-granular-shadow engine mode');
must('src/features/xensonar/performanceCrisis/rootFollowVoiceEngineOptions.ts', 'Worklet Granular-Plan Shadow', 'UI exposes granular shadow plan option via shared options');
must('src/features/xensonar/performanceCrisis/rootFollowVoiceEngineOptions.ts', 'hörbarer Materialpfad bleibt Legacy', 'UI states material path remains Legacy via shared options');

must('src/features/xensonar/rootFollow/rootFollowGranularWorkletRenderPlan.ts', 'RootFollowGranularWorkletRenderPlan', 'granular worklet render plan type');
must('src/features/xensonar/rootFollow/rootFollowGranularWorkletRenderPlan.ts', 'hasSampleBufferTransfer: false', 'plan explicitly has no sample buffer transfer');
must('src/features/xensonar/rootFollow/rootFollowGranularWorkletRenderPlan.ts', 'activeAudioPath: false', 'plan explicitly not active audio path');
must('src/features/xensonar/rootFollow/rootFollowGranularWorkletRenderPlan.ts', 'preservesLegacyMaterialPath: true', 'legacy material path is preserved');
must('src/features/xensonar/rootFollow/rootFollowGranularWorkletRenderPlan.ts', 'summarizeRootFollowGranularWorkletRenderPlan', 'plan summary for diagnostics');

must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'root-follow-worklet-granular-shadow-plan', 'worklet granular shadow message protocol');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'publishRootFollowWorkletGranularRenderPlan', 'granular plan publisher');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'root-follow-worklet-granular-shadow-ack', 'granular plan ack');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'hasSampleBufferTransfer: false', 'bridge reports no sample buffer transfer');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'activeAudioPath: false', 'bridge reports no active audio path');

must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'voiceEngineMode === "worklet-granular-shadow"', 'material renderer gates shadow plan by explicit mode');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'appendRootFollowGranularWorkletPlanWindow', 'material renderer appends plan windows');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'publishRootFollowWorkletGranularRenderPlan', 'material renderer publishes plan');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'scheduleMaterialElasticSlice', 'legacy flowing material scheduler remains');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'scheduleElasticPhaseWindow', 'legacy fragment material scheduler remains');

must('src/features/xensonar/rootFollow/rootFollowActiveVoiceRuntime.ts', 'ROOT_FOLLOW_GRANULAR_WORKLET_RENDER_PLAN_PREPARATION', 'granular worklet preparation marker');
must('src/core/audio/audioWorkletVoicePoolBoundary.ts', 'worklet-granular-shadow-plan', 'global worklet preparation stage includes granular shadow plan');

mustNot('src/features/xensonar/rootFollow/rootFollowGranularWorkletRenderPlan.ts', 'AudioBuffer', 'granular plan must not transfer AudioBuffer yet');
mustNot('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'postMessage(buffer', 'bridge must not post raw buffers');

if (failures.length) {
  console.error('[root-follow-granular-worklet-render-plan] FAIL');
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[root-follow-granular-worklet-render-plan] OK · Root-Follow Material/Granular has a stummes Worklet render-plan shadow with Legacy material path preserved.');
