import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => {
  console.error(`[worklet-branch-live-contract-7103] FAIL: ${message}`);
  process.exit(1);
};
const requireText = (file, marker) => {
  const source = read(file);
  if (!source.includes(marker)) fail(`${file} missing marker: ${marker}`);
};

const pkg = JSON.parse(read('package.json'));
if (!['3.2.91.7.0.3', '3.2.91.7.1', '3.2.91.7.2'].includes(pkg.version)) fail(`package version must be 3.2.91.7.0.3, 3.2.91.7.1 or 3.2.91.7.2, got ${pkg.version}`);

requireText('src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.ts', 'XENSONAR_AUDIO_WORKLET_BRANCH_TEST_ROOT_FOLLOW_VOICE_ENGINE_MODE');
requireText('src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.ts', 'useState<RootFollowVoiceEngineMode>(\n      XENSONAR_AUDIO_WORKLET_BRANCH_TEST_ROOT_FOLLOW_VOICE_ENGINE_MODE');
requireText('src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts', 'worklet-stable-lane-pilot');
requireText('src/features/xensonar/performanceCrisis/rootFollowVoiceEngineOptions.ts', 'Worklet Stable-Lane Pilot');
requireText('src/features/xensonar/performanceCrisis/rootFollowVoiceEngineOptions.ts', 'Worklet Granular-Pilot');
requireText('src/features/xensonar/performanceCrisis/rootFollowVoiceEngineOptions.ts', 'Worklet Granular-Primary Kandidat');
requireText('src/features/xensonar/performanceCrisis/rootFollowVoiceEngineOptions.ts', 'Worklet Direct-Pilot');

requireText('src/App.tsx', 'primeRootFollowWorkletLiveness');
requireText('src/App.tsx', 'root-follow-worklet-liveness-prime');
requireText('src/App.tsx', 'rootFollowVoiceEngineMode === "worklet-stable-lane-pilot"');
requireText('src/App.tsx', 'getDefaultRootFollowAnchorHz: () => Math.max(1, nexusParamsRef.current.gridBase / 2)');
requireText('src/App.tsx', 'StationaryRhythmWorkletProbeOverlay');
requireText('src/App.tsx', 'useStationaryRhythmWorkletProbeController');

requireText('src/features/xensonar/material/useRootFollowLoopBankController.ts', 'setRootFollowLoopAnchor');
requireText('src/features/xensonar/material/useRootFollowLoopBankController.ts', 'stampCurrentRootFollowLoopAnchor');
requireText('src/features/xensonar/material/useRootFollowLoopBankController.ts', 'updateMaterialEntry(entryId, { rootHz: normalizedRootHz })');
requireText('src/features/xensonar/material/useRootFollowLoopBankController.ts', 'getDefaultRootFollowAnchorHz');
requireText('src/features/xensonar/rootFollow/rootFollowAnchorMode.ts', 'fixed');
requireText('src/features/xensonar/rootFollow/rootFollowAnchorMode.ts', 'flexible');

requireText('src/features/xensonar/audio/stableRhythmLane.ts', 'resolveStableRhythmLaneBeatProtection');
requireText('src/core/audio/audioPressureMap.ts', 'stable-rhythm-beat-protection-armed');
requireText('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'AudioStressComparisonSnapshot');

requireText('src/features/soundLibrary/audioBurstRecorder.ts', 'createAudioBurstRecorderLogPayload');
requireText('src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts', '__xensonarBurstStressHarness');
requireText('src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts', 'detectXensonarBrowserStressProfile');
requireText('src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts', 'buildBurstStressExportSlug');
requireText('src/features/xensonar/audio/waveStarterKeyboardGestureCapacity.ts', 'keyboard-wave-event-9061-direct-contract');
requireText('src/features/xensonar/audio/waveStarterKeyboardGestureCapacity.ts', 'waveStarterOptions: undefined');

console.log('[worklet-branch-live-contract-7103] PASS full-live-contract-ported');
