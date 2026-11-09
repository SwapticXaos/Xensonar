import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [
  {
    file: 'src/features/xensonar/audio/waveStarterWorkletInstrumentEngineSkeleton.ts',
    must: [
      'wave-starter-worklet-instrument-engine-skeleton',
      'buildWaveStarterWorkletInstrumentEngineSkeletonSubmission',
      'publishWaveStarterWorkletInstrumentEngineSkeletonSubmission',
      'gestureQueueOwner: "worklet-instrument-engine-skeleton"',
      'articulationOwner: "worklet-instrument-engine-skeleton"',
      'voicePoolOwner',
      'synth-voice-pool-candidate',
      'sample-voice-pool-candidate',
      'sample-token-pending-legacy-reference',
      'legacyFallbackPreservedUntilEngineAudible: true',
      'synthAndSampleParityTracked: true',
      'apostrophe-safe-extend',
    ],
  },
  {
    file: 'src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts',
    must: [
      'buildWaveStarterWorkletInstrumentEngineSkeletonSubmission',
      'publishWaveStarterWorkletInstrumentEngineSkeletonSubmission',
      'const instrumentEngineSubmission =',
      'voiceSpec,',
      'pilotSnapshot,',
    ],
  },
  {
    file: 'src/features/xensonar/input/waveStarterGestureLoopWorkletBridge.ts',
    must: [
      'waveStarterInstrumentEngineSkeleton: true',
      'waveStarterInstrumentEngineSource: "hold-gesture-loop"',
      'waveStarterInstrumentEngineSegmentClock: true',
      'waveStarterGestureLoopWorkletBridge: true',
      'waveStarterSpecialPathDisabled: true',
      'waveStarterGestureLoopWorkletOnly: !isolation.holdGestureLegacyFallback',
    ],
  },
  {
    file: 'src/features/xensonar/audio/waveStarterKeyboardGestureCapacity.ts',
    must: [
      '9061-Direktvertrag',
      'waveStarterOptions: undefined',
    ],
    mustNot: [
      'waveStarterInstrumentEngineSkeleton: args.workletDirect',
      'waveStarterInstrumentEngineSource: args.workletDirect',
      'waveStarterInstrumentEngineSegmentClock: false',
    ],
  },
  {
    file: 'src/features/xensonar/audio/waveStarterLaneRuntime.ts',
    must: [
      'waveStarterInstrumentEngineSkeleton?: boolean',
      'waveStarterInstrumentEngineSource?:',
      'waveStarterInstrumentEngineSegmentClock?: boolean',
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
  console.error('[check-wave-starter-worklet-instrument-engine-skeleton] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[check-wave-starter-worklet-instrument-engine-skeleton] OK: Hold-Gesture path remains the isolated Worklet Instrument Engine skeleton candidate; normal keyboard Wellenstarter events stay on the 9061 direct contract and do not recreate a keyboard-glissando engine path.');
