import type { GridTuning } from '../domain/instrumentData';
import {
  createResonanceRootFollowControlState,
  type ResonanceRootFollowControlState,
} from './resonanceKeyboardRootFollowControlPolicy';
import { clamp, keyboardWindowFrequency, yFromFreq } from '../rooms/resonanceRuntimeMath';

export type ResonanceKeyboardPitchLaneState = {
  lastAtMs: number;
  burstCount: number;
  glissActiveUntilMs: number;
  lastPitchIdx: number | null;
  directPreviewCooldownUntilMs: number;
  chordClusterStartedAtMs: number;
  chordClusterCount: number;
  glissRunDirection: -1 | 0 | 1;
  glissRunLength: number;
  rootFollowControl: ResonanceRootFollowControlState;
};

export type ResonanceKeyboardPitchLaneParams = {
  gridBase: number;
  gridTuning: GridTuning;
  manualGridMutedSteps?: number[];
  manualGridStepOffsets?: number[];
};

export type ResonanceKeyboardPitchCommand =
  | {
      kind: 'direct-pitch-hit';
      pitchIdx: number;
      targetHz: number;
      targetY: number;
      allowWavePreview: boolean;
      reason: 'single-hit' | 'settled-hit' | 'chord-cluster';
    }
  | {
      kind: 'continuous-gliss-target';
      pitchIdx: number;
      targetHz: number;
      targetY: number;
      suppressWavePreview: true;
      reason: 'dense-keyboard-gliss' | 'repeat-gliss-window';
    }
  | {
      kind: 'muted-pitch';
      pitchIdx: number;
      reason: 'muted-grid-step';
    };

export type ResolveResonanceKeyboardPitchCommandArgs = {
  state: ResonanceKeyboardPitchLaneState;
  params: ResonanceKeyboardPitchLaneParams;
  pitchIdx: number;
  keyboardWindowOffset: number;
  nowMs: number;
  isRepeat?: boolean;
};

export function createResonanceKeyboardPitchLaneState(): ResonanceKeyboardPitchLaneState {
  return {
    lastAtMs: -Infinity,
    burstCount: 0,
    glissActiveUntilMs: -Infinity,
    lastPitchIdx: null,
    directPreviewCooldownUntilMs: -Infinity,
    chordClusterStartedAtMs: -Infinity,
    chordClusterCount: 0,
    glissRunDirection: 0,
    glissRunLength: 0,
    rootFollowControl: createResonanceRootFollowControlState(),
  };
}

export function resolveResonanceKeyboardPitchCommand({
  state,
  params,
  pitchIdx,
  keyboardWindowOffset,
  nowMs,
  isRepeat = false,
}: ResolveResonanceKeyboardPitchCommandArgs): ResonanceKeyboardPitchCommand {
  const freq = keyboardWindowFrequency(
    params.gridBase,
    params.gridTuning,
    keyboardWindowOffset,
    pitchIdx,
    params.manualGridMutedSteps,
    params.manualGridStepOffsets,
  );

  if (freq === null || !Number.isFinite(freq)) {
    state.lastPitchIdx = pitchIdx;
    state.lastAtMs = nowMs;
    return { kind: 'muted-pitch', pitchIdx, reason: 'muted-grid-step' };
  }

  const deltaMs = nowMs - state.lastAtMs;
  const pitchDelta = state.lastPitchIdx === null ? 0 : pitchIdx - state.lastPitchIdx;
  const pitchDirection: -1 | 0 | 1 = pitchDelta > 0 ? 1 : pitchDelta < 0 ? -1 : 0;
  const sameOrAdjacentPitch = state.lastPitchIdx === null ? false : Math.abs(pitchDelta) <= 2;
  const denseInterval = deltaMs >= 0 && deltaMs <= 72;
  const veryDenseInterval = deltaMs >= 0 && deltaMs <= 42;
  const chordClusterWindow = deltaMs >= 0 && deltaMs <= 58;

  if (denseInterval) {
    state.burstCount = Math.min(16, state.burstCount + 1);
  } else {
    state.burstCount = 0;
  }

  if (chordClusterWindow) {
    if (!Number.isFinite(state.chordClusterStartedAtMs) || nowMs - state.chordClusterStartedAtMs > 72) {
      state.chordClusterStartedAtMs = state.lastAtMs;
      state.chordClusterCount = 1;
    }
    state.chordClusterCount = Math.min(8, state.chordClusterCount + 1);
  } else {
    state.chordClusterStartedAtMs = nowMs;
    state.chordClusterCount = 1;
  }

  if (veryDenseInterval && sameOrAdjacentPitch && pitchDirection !== 0) {
    if (state.glissRunDirection === pitchDirection) {
      state.glissRunLength = Math.min(16, state.glissRunLength + 1);
    } else {
      state.glissRunDirection = pitchDirection;
      state.glissRunLength = 1;
    }
  } else if (!veryDenseInterval) {
    state.glissRunDirection = 0;
    state.glissRunLength = 0;
  }

  const smallChordCluster = chordClusterWindow && state.chordClusterCount <= 3;
  const monotoneStepRun = state.glissRunLength >= 3;
  const sustainedBurst = state.burstCount >= 4;

  const glissDetected =
    isRepeat ||
    nowMs <= state.glissActiveUntilMs ||
    monotoneStepRun ||
    sustainedBurst ||
    (veryDenseInterval && sameOrAdjacentPitch && !smallChordCluster && state.burstCount >= 2);

  if (glissDetected) {
    state.glissActiveUntilMs = nowMs + 96;
  }

  state.lastPitchIdx = pitchIdx;
  state.lastAtMs = nowMs;

  const targetHz = clamp(freq, 27.5, 3520);
  const targetY = yFromFreq(targetHz);

  if (glissDetected) {
    return {
      kind: 'continuous-gliss-target',
      pitchIdx,
      targetHz,
      targetY,
      suppressWavePreview: true,
      reason: isRepeat || nowMs <= state.glissActiveUntilMs ? 'repeat-gliss-window' : 'dense-keyboard-gliss',
    };
  }

  const chordPreviewAllowance = smallChordCluster && state.chordClusterCount <= 3;
  const allowWavePreview = chordPreviewAllowance || nowMs >= state.directPreviewCooldownUntilMs;
  state.directPreviewCooldownUntilMs = nowMs + (chordPreviewAllowance ? 6 : 22);

  return {
    kind: 'direct-pitch-hit',
    pitchIdx,
    targetHz,
    targetY,
    allowWavePreview,
    reason: chordPreviewAllowance ? 'chord-cluster' : denseInterval ? 'settled-hit' : 'single-hit',
  };
}
