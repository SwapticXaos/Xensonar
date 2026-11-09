import type { GridTuning } from '../domain/instrumentData';
import { keyboardWindowFrequency, yFromFreq } from '../rooms/resonanceRuntimeMath';

export type WellenstarterBallKeyboardPositionParams = {
  gridBase: number;
  gridTuning: GridTuning;
  manualGridMutedSteps?: number[];
  manualGridStepOffsets?: number[];
};

export type WellenstarterBallKeyboardPositionTarget =
  | {
      kind: 'keyboard-wsb-position';
      pitchIdx: number;
      targetHz: number;
      targetY: number;
    }
  | {
      kind: 'muted-keyboard-wsb-position';
      pitchIdx: number;
    };

export function resolveKeyboardWellenstarterBallPosition({
  params,
  pitchIdx,
  keyboardWindowOffset,
}: {
  params: WellenstarterBallKeyboardPositionParams;
  pitchIdx: number;
  keyboardWindowOffset: number;
}): WellenstarterBallKeyboardPositionTarget {
  const targetHz = keyboardWindowFrequency(
    params.gridBase,
    params.gridTuning,
    keyboardWindowOffset,
    pitchIdx,
    params.manualGridMutedSteps,
    params.manualGridStepOffsets,
  );

  if (targetHz === null || !Number.isFinite(targetHz) || targetHz < 55) {
    return { kind: 'muted-keyboard-wsb-position', pitchIdx };
  }

  return {
    kind: 'keyboard-wsb-position',
    pitchIdx,
    targetHz,
    targetY: yFromFreq(targetHz),
  };
}
