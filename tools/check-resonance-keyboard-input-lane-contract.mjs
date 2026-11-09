#!/usr/bin/env node
import fs from 'node:fs';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const lane = fs.readFileSync('src/features/xensonar/input/resonanceKeyboardPitchLane.ts', 'utf8');
const pressure = fs.readFileSync('src/core/audio/audioPressureMap.ts', 'utf8');
const pitchBoundary = fs.readFileSync('src/features/xensonar/input/resonanceKeyboardPitchCommandAssemblyBoundary.ts', 'utf8');
const router = fs.readFileSync('src/features/xensonar/input/resonanceKeyboardInputRouter.ts', 'utf8');
const wsbContract = fs.readFileSync('src/features/xensonar/input/wellenstarterBallPositionContract.ts', 'utf8');

const requiredLane = [
  'ResonanceKeyboardPitchCommand',
  'continuous-gliss-target',
  'direct-pitch-hit',
  'createResonanceKeyboardPitchLaneState',
  'resolveResonanceKeyboardPitchCommand',
  'keyboardWindowFrequency',
  'suppressWavePreview: true',
];
const missingLane = requiredLane.filter((needle) => !lane.includes(needle));

const requiredApp = [
  'resonanceKeyboardPitchLaneRef',
  'recordAdaptiveAction: recordAudioPressureAdaptiveAction',
  'commitCursorY: commitResonanceCursorY',
  'options.syncRootFollowInput !== false',
];
const missingApp = requiredApp.filter((needle) => !app.includes(needle));
const missingRouter = ['runResonanceKeyboardPitchCommandAssemblyBoundary({', 'rootFollowLoopActive,', 'commitCursorY,'].filter((needle) => !router.includes(needle));

const requiredPitchBoundary = [
  'resolveKeyboardWellenstarterBallPosition({',
  'resolveResonanceKeyboardPitchCommand({',
  "command.kind === 'continuous-gliss-target'",
  "recordAdaptiveAction('keyboard-input-gliss-coalesced')",
  'previewWave: false',
  'syncRootFollowInput: rootFollowLoopActive',
  'previewWave: allowWavePreview',
  'waveStarterOptions: resolveKeyboardWaveStarterSoundPreset',
  "recordAdaptiveAction('keyboard-input-hold-repeat-coalesced')",
  "recordAdaptiveAction('keyboard-input-wave-preview-suppressed')",
];
const missingPitchBoundary = requiredPitchBoundary.filter((needle) => !pitchBoundary.includes(needle));
const forbiddenPitchBoundary = [
  'resolveResonanceRootFollowControlDecision({',
  'noteWaveStarterKeyboardEventAdmissionHotPath(',
  'setRootFollowInputTargetHz(',
  'rootFollowControlDecision',
].filter((needle) => pitchBoundary.includes(needle));

const requiredWsbContract = [
  'resolveKeyboardWellenstarterBallPosition',
  'keyboardWindowFrequency(',
  'targetY: yFromFreq(targetHz)',
  "kind: 'keyboard-wsb-position'",
  "kind: 'muted-keyboard-wsb-position'",
];
const missingWsbContract = requiredWsbContract.filter((needle) => !wsbContract.includes(needle));

const requiredPressure = [
  "'keyboard-input-gliss-coalesced'",
  "'keyboard-input-wave-preview-suppressed'",
  "'keyboard-input-audio-ready-latched'",
];
const missingPressure = requiredPressure.filter((needle) => !pressure.includes(needle));

if (missingLane.length || missingApp.length || missingRouter.length || missingPitchBoundary.length || forbiddenPitchBoundary.length || missingWsbContract.length || missingPressure.length) {
  console.error('Keyboard input lane contract failed.');
  if (missingLane.length) console.error('Missing in lane:', missingLane.join(', '));
  if (missingApp.length) console.error('Missing in App:', missingApp.join(', '));
  if (missingRouter.length) console.error('Missing in router:', missingRouter.join(', '));
  if (missingPitchBoundary.length) console.error('Missing in pitch command boundary:', missingPitchBoundary.join(', '));
  if (forbiddenPitchBoundary.length) console.error('Forbidden in pitch command boundary:', forbiddenPitchBoundary.join(', '));
  if (missingWsbContract.length) console.error('Missing in WSB contract:', missingWsbContract.join(', '));
  if (missingPressure.length) console.error('Missing in audio pressure map:', missingPressure.join(', '));
  process.exit(1);
}
console.log('Keyboard input lane contract OK.');
