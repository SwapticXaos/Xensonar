import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [
  {
    file: 'src/features/xensonar/input/waveStarterGestureLoopWorkletBridge.ts',
    must: [
      'resolveWaveStarterGestureLoopWorkletBridgeOptions',
      'publishWaveStarterGestureLoopWorkletBridgeDecision',
      'readWaveStarterSpecialPathIsolationFromBrowser',
      'waveStarterGestureLoopWorkletBridge: true',
      'waveStarterGestureLoopWorkletOnly: !isolation.holdGestureLegacyFallback',
      'waveStarterSpecialPathDisabled: true',
      'hold-gesture-loop-worklet-bridge',
      'legacyFallbackPreserved: isolation.holdGestureLegacyFallback',
      'specialPathAllowed: false',
      'workletFirst: true',
      'apostrophe-safe-extend',
    ],
  },
  {
    file: 'src/features/xensonar/audio/waveStarterLaneRuntime.ts',
    must: [
      'waveStarterGestureLoopWorkletBridge?: boolean',
      'waveStarterGestureLoopWorkletOnly?: boolean',
      'waveStarterSpecialPathDisabled?: boolean',
      'waveStarterGestureLoopLane?: "wellenstart" | "klaviatur"',
      'options?.waveStarterGestureLoopWorkletBridge',
      '!policy.holdGestureLoopWorkletBridge',
      '!policy.holdGestureLegacyFallback',
    ],
  },
  {
    file: 'src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts',
    must: [
      'submitWaveStarterWorkletVoicePoolRuntime',
      'voicePoolRuntimeResult.handledByWorklet',
      'voicePoolRuntimeResult.allowLegacyFallback',
      'Gesture-loop pulses keep legacy fallback',
    ],
  },
  {
    file: 'src/features/xensonar/input/useWaveStarterHoldGestureLoopBridge.ts',
    must: [
      'resolveWaveStarterGestureLoopWorkletBridgeOptions',
      'publishWaveStarterGestureLoopWorkletBridgeDecision',
      'const bridgeDecision = resolveWaveStarterGestureLoopWorkletBridgeOptions',
      '...bridgeDecision.options',
      'waveStarterPresetOverride: resolveWaveStarterHoldSoundPresetForLane(pulse.lane)',
      'collectDueWaveStarterHoldGestureLoopPulses',
    ],
    mustNot: [
      'microReason: pulse.sustainExtendActive\n              ? "hold-gesture-loop:apostrophe-safe-extend"',
    ],
  },
  {
    file: 'src/App.tsx',
    must: [
      'useWaveStarterHoldGestureLoopBridge({',
      'shouldEmitWellenstartHoldAudio',
      'shouldEmitKeyboardHoldWavePreview',
      'releaseWaveStarterHoldGestureForKey',
    ],
  },
  {
    file: 'src/features/xensonar/input/waveStarterHoldSegmentClock.ts',
    must: [
      'collectDueWaveStarterHoldGestureLoopPulses',
      'reason: "gesture-loop-segment-pulse"',
      'extendPolicy: gesture.extendPolicy',
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
  console.error('[check-wave-starter-gesture-loop-worklet-bridge] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[check-wave-starter-gesture-loop-worklet-bridge] OK: Hold-Gesture pulses have an extracted, isolated worklet bridge contract; disabled paths fail closed and enabled paths preserve or suppress legacy fallback according to crisis-manager options.');
