import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [
  {
    file: 'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts',
    must: [
      'wave-starter-synth-processor-runtime-voice',
      'wave-starter-sample-processor-runtime-voice',
      'processorRuntimeOwnershipEnabled: true',
      'processorRuntimeLegacyReferencePreserved: true',
      'processorRuntimeVoicePoolReusesExistingRenderer: true',
      'processorRuntimeSegmentClockPulseAcceptedCount',
      'processorRuntimeApostropheSafeExtendAcceptedCount',
      'processorRuntimeRenderFrameCount',
      'markProcessorRuntimeOwnership',
      'processorRuntimeOwned',
      'postWaveStarterWorkletSynthProcessorRuntimeVoice',
      'postWaveStarterWorkletSampleProcessorRuntimeVoice',
    ],
  },
  {
    file: 'src/features/xensonar/audio/waveStarterWorkletVoicePoolRuntime.ts',
    must: [
      'buildProcessorRuntimeOwnershipPayload',
      'postWaveStarterWorkletSynthProcessorRuntimeVoice',
      'postWaveStarterWorkletSampleProcessorRuntimeVoice',
      'processorRuntimeOwnership',
      'processorRuntimeMessageType',
      'processorRuntimeSegmentClockOwned',
      'publishWaveStarterWorkletProcessorRuntimeOwnershipReport',
    ],
    mustNot: [
      'postWaveStarterWorkletSynthFailoverCandidate(\n      args.ctx,\n      candidate,',
      'postWaveStarterWorkletSampleFailoverCandidate(\n      args.ctx,\n      candidate,',
    ],
  },
  {
    file: 'src/features/xensonar/audio/waveStarterWorkletProcessorRuntimeOwnership.ts',
    must: [
      'xensonar-wave-starter-worklet-processor-runtime-ownership',
      'processorOwnsGestureQueueContract: true',
      'processorOwnsSegmentClockContract: true',
      'processorOwnsVoicePoolRuntime',
      'safeBecauseLegacyFallbackRemains: true',
      'formatWaveStarterWorkletProcessorRuntimeOwnershipUiValue',
    ],
  },
  {
    file: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
    must: [
      'Wellenstarter Prozessor-Laufzeit',
      'formatWaveStarterWorkletProcessorRuntimeOwnershipUiValue',
      'readWaveStarterWorkletProcessorRuntimeOwnershipReportFromBrowser',
    ],
  },
  {
    file: 'package.json',
    must: [
      '3.2.91.7.0.3',
      '3.2.91.7.1',
      'xensonar:check-wave-starter-worklet-processor-runtime-ownership',
    ],
  },
];

const failures = [];
for (const check of checks) {
  const src = read(check.file);
  for (const needle of check.must ?? []) {
    if (!src.includes(needle)) failures.push(`${check.file}: missing ${needle}`);
  }
  for (const needle of check.mustNot ?? []) {
    if (src.includes(needle)) failures.push(`${check.file}: forbidden ${needle}`);
  }
}

if (failures.length) {
  console.error('[check-wave-starter-worklet-processor-runtime-ownership] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[check-wave-starter-worklet-processor-runtime-ownership] OK: Gesture/Keyboard Wellenstarter voices now use explicit processor-runtime voice messages with segment-clock/extend metadata, processor ownership counters, and fail-open Legacy preservation.');
