#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const app = read('src/App.tsx');
const router = read('src/features/xensonar/input/resonanceKeyboardInputRouter.ts');
const effect = read('src/features/xensonar/input/useAppResonanceKeyboardInputEffectBoundary.ts');
const pitch = read('src/features/xensonar/input/resonanceKeyboardPitchCommandAssemblyBoundary.ts');
const direct = read('src/features/xensonar/audio/waveStarter9061DirectContract.ts');

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

assert(app.includes('waveStarterOptions?: WaveStarterEmitOptions'), 'commitResonanceCursorY must accept waveStarterOptions for keyboard/live direct bridge.');
assert(app.includes('syncRootFollowInput?: boolean'), 'commitResonanceCursorY must accept syncRootFollowInput from keyboard root-follow policy.');
assert(app.includes('options.syncRootFollowInput !== false'), 'commitResonanceCursorY must honor syncRootFollowInput=false instead of always stamping Root Follow target.');
assert(app.includes('playWaveStartSound(freqFromY(nextY), false, options.waveStarterOptions)'), 'commitResonanceCursorY must pass keyboard waveStarterOptions to playWaveStartSound.');
assert(app.includes('shouldEmitKeyboardHoldWavePreview,'), 'App must pass shouldEmitKeyboardHoldWavePreview into the keyboard boundary.');
assert(app.includes('shouldEmitWellenstartHoldAudio(!!options?.isRepeat, freq)'), 'Enter hold must use Live-branch repeat-aware hold decision, not the raw event object.');
assert(app.includes('getAudioPressureBias: getAudioEnginePressureBiasForTransientRuntime'), 'Keyboard boundary must receive cold pressure bias reader for Live-branch semantics.');
assert(app.includes('getActiveScheduledToneCount: () => activeScheduledTonesRef.current.length'), 'Keyboard boundary must receive active scheduled tone count as a ref snapshot, not React state.');

assert(router.includes("import type { WaveStarterEmitOptions } from '../audio/waveStarterLaneRuntimeBridge'"), 'Keyboard router must type waveStarterOptions explicitly.');
assert(router.includes('runEnterWaveGesture: (options?: { isRepeat: boolean }) => void'), 'Keyboard router must call Enter gesture by repeat-aware options.');
assert(!router.includes('runEnterWaveGesture: (event: KeyboardEvent) => void'), 'Keyboard router must not use the stale event-object Enter gesture contract.');
assert(router.includes('shouldEmitKeyboardHoldWavePreview?:'), 'Keyboard router must expose shouldEmitKeyboardHoldWavePreview, not the stale resolveKeyboardWavePreview alias.');
assert(!router.includes('resolveKeyboardWavePreview'), 'Keyboard router must not retain stale resolveKeyboardWavePreview wiring.');
assert(router.includes('runEnterWaveGesture({ isRepeat: event.repeat })'), 'Keyboard router must forward event.repeat into Enter hold gesture.');
assert(router.includes('shouldEmitKeyboardHoldWavePreview: actions.shouldEmitKeyboardHoldWavePreview'), 'Keyboard router must pass hold preview policy into pitch command boundary.');
assert(router.includes('waveStarterOptions?: WaveStarterEmitOptions'), 'Keyboard router commitCursorY action must accept waveStarterOptions.');
assert(router.includes('getAudioPressureBias?: () => number'), 'Keyboard router must preserve cold pressure reader hook.');
assert(router.includes('getActiveScheduledToneCount?: () => number'), 'Keyboard router must preserve scheduled-tone count reader hook.');

assert(effect.includes('shouldEmitKeyboardHoldWavePreview?:'), 'useAppResonanceKeyboardInputEffectBoundary must expose shouldEmitKeyboardHoldWavePreview.');
assert(!effect.includes('resolveKeyboardWavePreview'), 'useAppResonanceKeyboardInputEffectBoundary must not forward stale resolveKeyboardWavePreview alias.');
assert(effect.includes('shouldEmitKeyboardHoldWavePreview: args.actions.shouldEmitKeyboardHoldWavePreview'), 'useApp boundary must forward shouldEmitKeyboardHoldWavePreview to router.');
assert(effect.includes('getAudioPressureBias: args.actions.getAudioPressureBias'), 'useApp boundary must forward pressure reader to router.');
assert(effect.includes('getActiveScheduledToneCount: args.actions.getActiveScheduledToneCount'), 'useApp boundary must forward scheduled tone count reader to router.');
assert(effect.includes('waveStarterOptions?: unknown'), 'useApp boundary commitCursorY type must preserve waveStarterOptions through boundary.');

assert(pitch.includes('shouldEmitKeyboardHoldWavePreview'), 'Pitch command assembly must still call keyboard hold preview policy.');
assert(pitch.includes('waveStarterOptions: undefined'), 'Normal keyboard pitch preview must keep waveStarterOptions undefined to trigger 9061 direct gate.');
assert(pitch.includes('noteWaveStarterKeyboardEventAdmissionHotPath(keyboardWavePreview)'), 'Keyboard hot path must remain lightweight admission counting, not full report generation.');

assert(direct.includes('legacy9061DirectGate: true'), 'Direct contract must still set legacy9061DirectGate for normal Wellenstarter.');
assert(direct.includes('requiresModernWaveStarterLane'), 'Direct contract must still isolate modern lane options.');

if (failures.length) {
  console.error('keyboard live direct wiring check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('keyboard live direct wiring check passed');
