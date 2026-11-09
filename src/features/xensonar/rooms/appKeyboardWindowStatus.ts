import type { GridTuning } from '../domain/instrumentData';
import { buildKeyboardGridFrequencies } from './resonanceRuntimeMath';
import { readKeyboardWindowEdgeFrequencies, resolveKeyboardWindowBounds } from './keyboardWindowState';

type BuildKeyboardWindowStatusArgs = {
  gridBase: number;
  gridTuning: GridTuning;
  manualGridMutedSteps: number[];
  manualGridStepOffsets?: number[];
  keyboardWindowOffset: number;
  windowSize: number;
};

export function buildKeyboardWindowStatus(args: BuildKeyboardWindowStatusArgs) {
  const keyboardGridDesc = buildKeyboardGridFrequencies(
    args.gridBase,
    args.gridTuning,
    args.manualGridMutedSteps,
    args.manualGridStepOffsets,
  );
  const { start, end } = resolveKeyboardWindowBounds(
    args.keyboardWindowOffset,
    keyboardGridDesc.length,
    args.windowSize,
  );
  const { firstHz, lastHz } = readKeyboardWindowEdgeFrequencies(keyboardGridDesc, start, end);

  return {
    keyboardGridDesc,
    keyboardWindowStart: start,
    keyboardWindowEnd: end,
    keyboardWindowFirstHz: firstHz,
    keyboardWindowLastHz: lastHz,
  };
}
