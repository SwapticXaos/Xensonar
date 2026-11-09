import { clamp } from './resonanceRuntimeMath';
import type { GridTuning } from '../domain/instrumentData';

export type ResonanceCursorGridParams = {
  lockCursorToGrid: boolean;
  gridBase: number;
  gridTuning: GridTuning;
  manualGridMutedSteps: number[];
  manualGridStepOffsets: number[];
};

export function clampFocusCursor(rawX: number, rawY: number, width: number, height: number) {
  return {
    x: clamp(rawX, 0, width),
    y: clamp(rawY, 0, height),
  };
}

export function resolveCursorHudUpdate(
  rawY: number,
  height: number,
  prevHz: number,
  prevUpdateAt: number,
  now: number,
  freqFromY: (y: number) => number,
) {
  const clampedY = clamp(rawY, 0, height);
  const nextHz = freqFromY(clampedY);
  const shouldUpdate = now - prevUpdateAt > 48 || Math.abs(nextHz - prevHz) > 0.6;
  return { clampedY, nextHz, shouldUpdate };
}

export function resolveResonanceCursorYValue(
  rawY: number,
  height: number,
  params: ResonanceCursorGridParams,
  snapYToGrid: (
    y: number,
    gridBase: number,
    gridTuning: GridTuning,
    manualGridMutedSteps: number[],
    manualGridStepOffsets: number[],
  ) => number,
) {
  const clampedY = clamp(rawY, 0, height);
  return params.lockCursorToGrid
    ? snapYToGrid(
        clampedY,
        params.gridBase,
        params.gridTuning,
        params.manualGridMutedSteps,
        params.manualGridStepOffsets,
      )
    : clampedY;
}
