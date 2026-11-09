import {
  KAMMERTON_KEY_CODE_MAP,
  KAMMERTON_KEY_MAP,
  KAMMERTON_KEYS,
} from '../domain/instrumentData';
import {
  getKeyboardPitchIndexFromEvent,
  getMirroredKeyboardPitchIndex,
} from '../resonanceKeyboard';
import {
  resolveResonanceKeyboardPitchCommand,
  type ResonanceKeyboardPitchLaneParams,
  type ResonanceKeyboardPitchLaneState,
} from './resonanceKeyboardPitchLane';
import type { WaveStarterEmitOptions } from '../audio/waveStarterLaneRuntimeBridge';
import { resolveKeyboardWellenstarterBallPosition } from './wellenstarterBallPositionContract';

type ResonanceKeyboardPitchCommandEvent = Pick<KeyboardEvent, 'key' | 'code' | 'repeat' | 'timeStamp'>;

type RunResonanceKeyboardPitchCommandAssemblyBoundaryArgs = {
  event: ResonanceKeyboardPitchCommandEvent;
  keyboardMirrorActive: boolean;
  keyboardWindowOffset: number;
  params: ResonanceKeyboardPitchLaneParams;
  pitchLaneState: ResonanceKeyboardPitchLaneState;
  nowMs: number;
  rootFollowLoopActive: boolean;
  preventDefault: () => void;
  ensureKeyboardPitchAudioReadyOnce: () => boolean;
  recordAdaptiveAction: (action: 'keyboard-input-gliss-coalesced' | 'keyboard-input-wave-preview-suppressed' | 'keyboard-input-gliss-soft-attack' | 'keyboard-input-gliss-body-preserved' | 'keyboard-input-global-lane-protected' | 'keyboard-input-hold-repeat-coalesced' | 'root-follow-input-rate-limited' | 'root-follow-input-freeze-last-valid') => void;
  commitCursorY: (targetY: number, options: { previewWave: boolean; syncHud: true; syncRootFollowInput?: boolean; waveStarterOptions?: WaveStarterEmitOptions }) => void;
  shouldEmitKeyboardHoldWavePreview?: (event: ResonanceKeyboardPitchCommandEvent, payload: { targetY: number; targetHz: number }) => boolean;
  resolveKeyboardWaveStarterSoundPreset?: () => string | undefined;
};

export function runResonanceKeyboardPitchCommandAssemblyBoundary(
  args: RunResonanceKeyboardPitchCommandAssemblyBoundaryArgs,
): boolean {
  const {
    event,
    keyboardMirrorActive,
    keyboardWindowOffset,
    params,
    pitchLaneState,
    nowMs,
    rootFollowLoopActive,
    preventDefault,
    ensureKeyboardPitchAudioReadyOnce,
    recordAdaptiveAction,
    commitCursorY,
    shouldEmitKeyboardHoldWavePreview,
    resolveKeyboardWaveStarterSoundPreset,
  } = args;

  const pitchIdx = getKeyboardPitchIndexFromEvent(event, KAMMERTON_KEY_MAP, KAMMERTON_KEY_CODE_MAP);
  if (pitchIdx < 0) return false;

  preventDefault();
  const mappedPitchIdx = keyboardMirrorActive
    ? getMirroredKeyboardPitchIndex(pitchIdx, KAMMERTON_KEYS.length)
    : pitchIdx;
  const wsbTarget = resolveKeyboardWellenstarterBallPosition({
    params,
    pitchIdx: mappedPitchIdx,
    keyboardWindowOffset,
  });
  if (wsbTarget.kind === 'muted-keyboard-wsb-position') {
    return true;
  }

  const command = resolveResonanceKeyboardPitchCommand({
    state: pitchLaneState,
    params,
    pitchIdx: mappedPitchIdx,
    keyboardWindowOffset,
    nowMs,
    isRepeat: event.repeat,
  });
  if (command.kind === 'muted-pitch') {
    return true;
  }

  if (command.kind === 'continuous-gliss-target') {
    // Preserve the 6.8.7 musical behaviour for dense runs: the continuous cursor
    // follows the hand, but a gliss does not explode into a new multi-node voice
    // graph for every key event. Immediate articulation is restored for real
    // direct hits/chords below; overload protection stays local and now-or-never.
    recordAdaptiveAction('keyboard-input-gliss-coalesced');
    recordAdaptiveAction('keyboard-input-wave-preview-suppressed');
    commitCursorY(command.targetY, {
      previewWave: false,
      syncHud: true,
      syncRootFollowInput: rootFollowLoopActive,
    });
    return true;
  }

  const audioReadyForPreview = ensureKeyboardPitchAudioReadyOnce();
  const keyboardHoldAllowsWavePreview = shouldEmitKeyboardHoldWavePreview?.(event, {
    targetY: command.targetY,
    targetHz: command.targetHz,
  }) ?? true;
  if (!keyboardHoldAllowsWavePreview) {
    recordAdaptiveAction('keyboard-input-hold-repeat-coalesced');
  }

  const allowWavePreview = audioReadyForPreview && keyboardHoldAllowsWavePreview && command.allowWavePreview;
  if (!allowWavePreview) {
    recordAdaptiveAction('keyboard-input-wave-preview-suppressed');
  }

  commitCursorY(command.targetY, {
    previewWave: allowWavePreview,
    syncHud: true,
    syncRootFollowInput: rootFollowLoopActive,
    waveStarterOptions: {
      requestedAtMs: event.timeStamp,
      keyboardGestureSource: 'keyboard-direct',
      ...(resolveKeyboardWaveStarterSoundPreset
        ? { waveStarterPresetOverride: resolveKeyboardWaveStarterSoundPreset() }
        : {}),
    },
  });
  return true;
}
