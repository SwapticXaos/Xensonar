import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const runtime = read('src/features/xensonar/audio/waveStarterLaneRuntime.ts');
const capacity = read('src/features/xensonar/audio/waveStarterKeyboardGestureCapacity.ts');
const emit = read('src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts');
const voicePoolRuntime = read('src/features/xensonar/audio/waveStarterWorkletVoicePoolRuntime.ts');
const worklet = read('src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts');

const required = [
  [runtime, 'keyboardGlissandoWorkletDirect', 'runtime option type missing'],
  [runtime, 'lastAdmissionKind = "keyboard-worklet-direct"', 'runtime bypass does not mark keyboard-worklet-direct'],
  [runtime, 'will not fall back to legacy bursts', 'runtime lacks legacy burst comment/contract'],
  [capacity, 'workletDirect: true', 'capacity does not request direct worklet glissando'],
  [capacity, 'workletOnly: true', 'capacity does not request worklet-only glissando'],
  [emit, 'submitWaveStarterWorkletVoicePoolRuntime', 'emit boundary lacks keyboard worklet voice-pool runtime branch'],
  [voicePoolRuntime, 'postWaveStarterWorkletSynthProcessorRuntimeVoice', 'voice-pool runtime does not post synth candidate'],
  [voicePoolRuntime, 'postWaveStarterWorkletSampleProcessorRuntimeVoice', 'voice-pool runtime does not post sample candidate'],
  [voicePoolRuntime, 'keyboardGlissandoWorkletOnly', 'voice-pool runtime lacks worklet-only guard'],
  [worklet, 'Do not pre-block local single-file HTML', 'worklet bridge still lacks local-file attempt contract'],
];

let failed = false;
for (const [haystack, needle, message] of required) {
  if (!haystack.includes(needle)) {
    console.error(`[FAIL] ${message}`);
    failed = true;
  }
}

if (/file-origin-blocks-wave-starter-blob-worklet/.test(worklet)) {
  console.error('[FAIL] wave starter worklet bridge still hard-blocks file-origin before attempting Blob AudioWorklet');
  failed = true;
}

if (failed) process.exit(1);
console.log('[OK] keyboard glissando has a direct Worklet voice-pool runtime lane and no local-file pre-block');
