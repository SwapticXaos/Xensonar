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

must('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', "'worklet-shadow'", 'root follow voice engine worklet-shadow mode');
must('src/features/xensonar/performanceCrisis/rootFollowVoiceEngineOptions.ts', 'Worklet Shadow Bridge', 'crisis manager exposes worklet shadow mode');
must('src/features/xensonar/performanceCrisis/rootFollowVoiceEngineOptions.ts', 'stummes Blob-URL-Worklet', 'UI describes muted worklet shadow bridge');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisRootFollowTab.tsx', 'ersetzt keinen hörbaren Pfad', 'UI states worklet shadow is not audible replacement');

must('src/core/audio/audioWorkletVoicePoolBoundary.ts', 'worklet-shadow', 'boundary has worklet-shadow migration stage');
must('src/features/xensonar/rootFollow/rootFollowActiveVoiceRuntime.ts', 'ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_PREPARATION', 'root follow worklet shadow preparation export');
must('src/features/xensonar/rootFollow/rootFollowActiveVoiceRuntime.ts', 'backend: "audio-worklet-candidate"', 'worklet shadow uses candidate backend');
must('src/features/xensonar/rootFollow/rootFollowActiveVoiceRuntime.ts', 'migrationStage: "worklet-shadow"', 'worklet shadow migration stage');
must('src/features/xensonar/rootFollow/rootFollowActiveVoiceRuntime.ts', 'Main-Thread-Referenzpfad hörbar', 'worklet shadow keeps reference path audible');

must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_CODE', 'shadow bridge processor code string');
must('src/features/xensonar/audio/audioWorkletBlobModule.ts', 'URL.createObjectURL(blob)', 'shadow bridge uses shared blob URL loading helper');
must('src/features/xensonar/audio/audioWorkletBlobModule.ts', 'ctx.audioWorklet.addModule(url)', 'shadow bridge loads module through shared audioWorklet.addModule helper');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'new AudioWorkletNode(ctx, PROCESSOR_NAME', 'shadow bridge instantiates muted AudioWorkletNode');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'outputGain.gain.value = 0', 'shadow bridge is muted via output gain');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'silentShadowOnly: true', 'shadow bridge marks silent shadow only');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'preservesMainThreadReferencePath: true', 'shadow bridge preserves main-thread reference path');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'file-origin-blocks-blob-worklet-shadow', 'file-origin fail-open unsupported marker');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'root-follow-worklet-shadow-plan', 'shadow bridge message protocol');
must('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'worklet-shadow-bridge', 'shadow bridge traffic event');

must('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', 'publishRootFollowWorkletShadowPlan', 'coordinator publishes shadow plan');
must('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', "voiceEngineMode === 'worklet-shadow'", 'coordinator gates worklet shadow by mode');
must('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', 'pooledScheduleEvents', 'legacy/main-thread schedule list remains in use');
mustNot('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', 'new AudioWorkletNode', 'coordinator must not instantiate worklet directly');

must('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', "'worklet-shadow-bridge'", 'audio traffic event kind includes worklet shadow bridge');

if (failures.length) {
  console.error('[root-follow-worklet-shadow-bridge] FAIL');
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[root-follow-worklet-shadow-bridge] OK · Root-Follow Worklet Shadow Bridge loads a muted Blob-URL AudioWorklet and keeps the audible path on Legacy/Main-Thread.');
