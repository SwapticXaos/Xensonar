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

must('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', "'worklet-buffer-shadow'", 'worklet-buffer-shadow engine mode');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'Worklet Buffer-Transfer Shadow', 'UI exposes buffer-transfer shadow option');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'Original-Buffer und hörbarer Materialpfad bleiben Legacy', 'UI states original buffer/material path remain Legacy');

must('src/features/xensonar/rootFollow/rootFollowSampleBufferWorkletShadowTransfer.ts', 'RootFollowSampleBufferWorkletShadowTransfer', 'bounded sample buffer shadow transfer type');
must('src/features/xensonar/rootFollow/rootFollowSampleBufferWorkletShadowTransfer.ts', 'bounded-shadow-window', 'bounded transfer kind');
must('src/features/xensonar/rootFollow/rootFollowSampleBufferWorkletShadowTransfer.ts', 'maxTransferFrames', 'transfer frame cap');
must('src/features/xensonar/rootFollow/rootFollowSampleBufferWorkletShadowTransfer.ts', 'transfersFullSourceBuffer: false', 'contract forbids full source buffer transfer');
must('src/features/xensonar/rootFollow/rootFollowSampleBufferWorkletShadowTransfer.ts', 'preservesLegacyMaterialPath: true', 'legacy material path preserved');
must('src/features/xensonar/rootFollow/rootFollowSampleBufferWorkletShadowTransfer.ts', 'activeAudioPath: false', 'transfer is not active audio path');
must('src/features/xensonar/rootFollow/rootFollowSampleBufferWorkletShadowTransfer.ts', 'getRootFollowSampleBufferShadowTransferList', 'transfer list helper');

must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'root-follow-worklet-buffer-shadow-transfer', 'buffer shadow message protocol');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'root-follow-worklet-buffer-shadow-ack', 'buffer shadow ack protocol');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'publishRootFollowWorkletBufferShadowTransfer', 'buffer transfer publisher');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'postedBufferTransferSignatures', 'dedupe repeated buffer shadow transfers');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'postMessage(', 'worklet bridge posts transfer message');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'getRootFollowSampleBufferShadowTransferList(args.transfer)', 'typed array transfer list used');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'transfersFullSourceBuffer: false', 'bridge reports bounded partial transfer');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'activeAudioPath: false', 'bridge reports transfer as non-active audio path');

must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'voiceEngineMode === "worklet-buffer-shadow"', 'material renderer gates buffer shadow by explicit mode');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'publishRootFollowWorkletBufferShadowTransfer', 'material renderer publishes buffer shadow transfer');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'createRootFollowSampleBufferWorkletShadowTransfer', 'material renderer creates buffer shadow contract');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'scheduleMaterialElasticSlice', 'legacy material slice scheduler remains');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'scheduleElasticPhaseWindow', 'legacy fragment scheduler remains');

must('src/features/xensonar/rootFollow/rootFollowActiveVoiceRuntime.ts', 'ROOT_FOLLOW_WORKLET_BUFFER_SHADOW_TRANSFER_PREPARATION', 'active voice runtime carries buffer shadow prep marker');
must('src/core/audio/audioWorkletVoicePoolBoundary.ts', 'worklet-buffer-shadow-transfer', 'global worklet prep stage includes buffer shadow transfer');

mustNot('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'activeAudioPath: true', 'buffer shadow must not claim active audio path');
mustNot('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'voiceEngineMode === "worklet-buffer-shadow" && scheduleElasticPhaseWindow({', 'buffer shadow must not replace legacy scheduler');

if (failures.length) {
  console.error('[root-follow-worklet-buffer-shadow-transfer] FAIL');
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[root-follow-worklet-buffer-shadow-transfer] OK · Root-Follow Material has a bounded sample/buffer transfer shadow with Legacy material path preserved.');
