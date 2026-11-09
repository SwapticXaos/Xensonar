import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [
  {
    file: 'src/features/xensonar/input/waveStarterHoldSegmentClock.ts',
    must: [
      'WAVE_STARTER_HOLD_SEGMENT_OPTIONS = [16, 24, 27, 32, 64]',
      'DEFAULT_WAVE_STARTER_HOLD_SEGMENTS = 24',
      'DEFAULT_KEYBOARD_HOLD_SEGMENTS = 24',
      'DEFAULT_HOLD_CUSTOM_SEGMENTS = 48',
      'referenceBars: number',
      'createWaveStarterHoldGestureLoopLaneState',
      'resolveWaveStarterHoldGestureLoopFrame',
      'collectDueWaveStarterHoldGestureLoopPulses',
      'WaveStarterHoldExtendPolicy',
      'apostrophe-safe-extend',
      'sustainExtendLatched',
      'hasActiveWaveStarterHoldGestureLoop',
      'reason: "gesture-loop-owned-repeat"',
      'reason: "gesture-pattern-muted-step"',
      'referenceBars: args.referenceBars',
    ],
  },
  {
    file: 'src/features/xensonar/input/useWaveStarterHoldGestureLoopBridge.ts',
    must: [
      'useWaveStarterHoldGestureLoopBridge',
      'shouldEmitWellenstartHoldAudio',
      'shouldEmitKeyboardHoldWavePreview',
      'releaseWaveStarterHoldGestureForKey',
      'resolveKeyboardWaveStarterSoundPreset',
      'resolveWaveStarterGestureLoopWorkletBridgeOptions',
      'publishWaveStarterGestureLoopWorkletBridgeDecision',
      'collectDueWaveStarterHoldGestureLoopPulses',
      'resolveWaveStarterHoldReferenceBars',
      'resolveKeyboardHoldReferenceBars',
      'activeStepsByLane',
      'const bridgeDecision = resolveWaveStarterGestureLoopWorkletBridgeOptions',
      '...bridgeDecision.options',
      'resolveWaveStarterHoldSoundPresetForLane(pulse.lane)',
    ],
  },
  {
    file: 'src/features/xensonar/audio/waveStarterLaneRuntime.ts',
    must: ['forceSustainExtend?: boolean'],
  },
  {
    file: 'src/features/xensonar/input/enterWaveHotkeyGestureBoundary.ts',
    must: [
      'playAudio?: boolean',
      'resolvePlayAudio?: (payload: { cursorY: number; freq: number }) => boolean',
      'runtime.resolvePlayAudio',
    ],
  },
  {
    file: 'src/features/xensonar/input/resonanceKeyboardInputRouter.ts',
    must: [
      'runEnterWaveGesture: (options?: { isRepeat: boolean }) => void',
      'runEnterWaveGesture({ isRepeat: event.repeat })',
      'shouldEmitKeyboardHoldWavePreview',
      'payload: { targetY: number; targetHz: number }',
    ],
  },
  {
    file: 'src/features/xensonar/input/resonanceKeyboardPitchCommandAssemblyBoundary.ts',
    must: [
      'keyboardHoldAllowsWavePreview',
      "recordAdaptiveAction('keyboard-input-hold-repeat-coalesced')",
      'previewWave: allowWavePreview',
      'waveStarterPresetOverride: resolveKeyboardWaveStarterSoundPreset()',
    ],
  },
  {
    file: 'src/App.tsx',
    must: [
      'useWaveStarterHoldGestureLoopBridge({',
      'shouldEmitWellenstartHoldAudio',
      'shouldEmitKeyboardHoldWavePreview',
      'releaseWaveStarterHoldGestureForKey',
      'resolveKeyboardWaveStarterSoundPreset',
      'buildNexusRippleGestureRuntime(true, ({ freq }) =>',
      'shouldEmitWellenstartHoldAudio(!!options?.isRepeat, freq)',
    ],
  },
  {
    file: 'src/features/xensonar/rooms/ResonanceSoundPalettePanel.tsx',
    must: [
      'Drone Sound',
      'Wellenstart Sound',
      'Partikel Sound',
      'Klaviatur Sound',
      'Enter-Hold Muster',
      'Klaviatur-Hold Muster',
      'WaveStarterHoldPatternEditorSlot',
      'Synth Sounds',
      'Samples',
    ],
    mustNot: ['Wellenstart-Sound Preset'],
  },
  {
    file: 'src/features/xensonar/rooms/WaveStarterHoldPatternEditorSlot.tsx',
    must: [
      'Aus',
      'verzögert',
      '<option value="other">other</option>',
      'referenceBars',
      'buildDelayedPattern',
      'buildAllOffPattern',
    ],
  },
  {
    file: 'src/features/xensonar/rooms/nexusParamsInitialState.ts',
    must: [
      'waveStarterHoldSegments: 24',
      'waveStarterHoldCustomSegments: 48',
      'waveStarterHoldReferenceBars: 1',
      'keyboardHoldSegments: 24',
      'keyboardHoldCustomSegments: 48',
      'keyboardHoldReferenceBars: 1',
    ],
  },
  {
    file: 'src/features/soundLibrary/waveStarterSoundMenuModel.ts',
    must: [
      'const builtIns = [...BUILT_IN_WAVE_STARTER_SOUND_MENU_OPTIONS]',
      'const sampleOptions = samples.map(buildWaveStarterSampleMenuOption)',
      'return [...builtIns, ...sampleOptions]',
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
  console.error('[check-wave-starter-hold-segment-clock] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[check-wave-starter-hold-segment-clock] OK: Enter/Wellenstart-Hold and Klaviatur-Hold use extracted gesture-loop lanes with 16/24/27/32/64/custom slots, reference bars, Aus/verzögert pattern presets, and per-lane sound overrides.');
