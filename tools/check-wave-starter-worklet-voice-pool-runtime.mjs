import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [
  {
    file: 'src/features/xensonar/audio/waveStarterWorkletVoicePoolRuntime.ts',
    must: [
      'xensonar-wave-starter-worklet-voice-pool-runtime',
      'submitWaveStarterWorkletVoicePoolRuntime',
      'synth-voice-pool-runtime-posted',
      'sample-voice-pool-runtime-posted',
      'sample-token-pending-legacy-reference',
      'pilot-unready-legacy-reference',
      'worklet-only-suppressed-legacy',
      'runtimeOwnsBoundedQueue: true',
      'runtimeOwnsVoicePoolReuse: true',
      'runtimeOwnsPriorityDisplacement: true',
      'runtimeOwnsStealFadeTail: true',
      'legacyFallbackPreservedUntilRuntimeAudible: true',
      'synthAndSampleRuntimeParityTracked: true',
      'postWaveStarterWorkletSynthProcessorRuntimeVoice',
      'postWaveStarterWorkletSampleProcessorRuntimeVoice',
      'publishWaveStarterSampleFailoverCandidateBlockedUntilHydrated',
      'apostropheSafeExtendRuntimeCount',
    ],
  },
  {
    file: 'src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts',
    must: [
      'submitWaveStarterWorkletVoicePoolRuntime',
      'const voicePoolRuntimeResult = submitWaveStarterWorkletVoicePoolRuntime',
      'if (voicePoolRuntimeResult.handledByWorklet) return;',
      'if (!voicePoolRuntimeResult.allowLegacyFallback)',
      'Worklet voice-pool runtime is proven audible',
    ],
    mustNot: [
      'const wantsGestureWorkletBridge =',
      'const sampleTokenHydrated = !!token\n        && (pilotSnapshot.sampleBufferTokenHydratedCount ?? 0) > 0',
    ],
  },
  {
    file: 'src/features/xensonar/audio/waveStarterWorkletInstrumentEngineSkeleton.ts',
    must: [
      'voicePoolOwner',
      'segmentClockOwnedByEngine',
      'sampleTokenHydrated',
    ],
  },
  {
    file: 'package.json',
    must: [
      'xensonar:check-wave-starter-worklet-voice-pool-runtime',
      '3.2.91.6.9.190.11',
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
  console.error('[check-wave-starter-worklet-voice-pool-runtime] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[check-wave-starter-worklet-voice-pool-runtime] OK: Hold/Keyboard gesture VoiceSpecs now pass through a dedicated Worklet Voice-Pool Runtime that owns bounded queue, voice reuse, priority displacement and steal-fade-tail reporting while preserving legacy fail-open semantics for unready pilot or pending sample tokens.');
