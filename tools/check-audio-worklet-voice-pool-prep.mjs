import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
function must(path, needle, label) {
  const text = read(path);
  if (!text.includes(needle)) failures.push(`${path}: missing ${label}`);
}

must('src/core/audio/audioWorkletVoicePoolBoundary.ts', 'AudioWorkletVoicePoolPreparation', 'voice pool preparation type');
must('src/core/audio/audioWorkletVoicePoolBoundary.ts', 'requiresBlobUrlWorkletLoading: true', 'singlefile blob-url worklet contract');
must('src/core/audio/audioWorkletVoicePoolBoundary.ts', 'preservesMainThreadReferencePath', 'legacy reference-path flag');
must('src/core/audio/audioWorkletVoicePoolBoundary.ts', 'contract-only', 'contract-only migration stage');
must('src/core/audio/audioWorkletVoicePoolBoundary.ts', 'shadow-plan', 'shadow-plan migration stage');
must('src/core/audio/audioWorkletVoicePoolBoundary.ts', 'main-thread-pool-active', 'main-thread pool stage before worklet');
must('src/features/xensonar/rootFollow/rootFollowActiveVoiceRuntime.ts', 'ROOT_FOLLOW_DIRECT_VOICE_POOL_PREPARATION', 'root follow direct voice pool preparation export');
must('src/features/xensonar/rootFollow/rootFollowActiveVoiceRuntime.ts', 'backend: "main-thread-pooled"', 'voice pool prep marks optional main-thread pooled backend');
must('src/features/xensonar/rootFollow/rootFollowActiveVoiceRuntime.ts', 'preservesMainThreadReferencePath: true', 'legacy path preserved');
must('src/features/xensonar/rootFollow/rootFollowActiveVoiceRuntime.ts', 'Blob-URL-Worklet-Loading', 'singlefile worklet note');
must('src/features/xensonar/rootFollow/rootFollowActiveVoiceRuntime.ts', 'activeSynthVoices-Map bleibt Referenz', 'current active voice map remains reference');

if (failures.length) {
  console.error('[audio-worklet-voice-pool-prep] FAIL');
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[audio-worklet-voice-pool-prep] OK · AudioWorklet/Voice-Pool stage is prepared as a contract/pre-worklet boundary with legacy reference preserved.');
