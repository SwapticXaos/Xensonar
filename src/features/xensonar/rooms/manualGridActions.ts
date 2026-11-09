import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { getTuningSteps, type ChurchMode, type GridTuning } from '../domain/instrumentData';
import { buildGridTuningTransition, buildVisibleGridLines, normalizeGridMutedSteps, normalizeGridStepIndex, type ResonanceGridStateSnapshot } from './resonanceGridMath';
import { buildManualGridStepOffsets, toggleManualGridStep } from './manualGridState';

type UpdateNParams = (patch: Record<string, unknown>) => void;

type ResonanceParams = Pick<ResonanceGridStateSnapshot, 'gridTuning' | 'gridMode' | 'gridBase' | 'rememberGrid' | 'gridStates' | 'manualGridMutedSteps' | 'manualGridStepOffsets'> & {
  lockCursorToGrid: boolean;
};

type CommitCursorY = (rawY: number, options?: { syncHud?: boolean; refreshKeyboardWindow?: boolean }) => number;

export function updateManualGridMutedStepsAction(
  gridTuning: GridTuning,
  steps: number[],
  updateNParams: UpdateNParams,
) {
  updateNParams({ manualGridMutedSteps: normalizeGridMutedSteps(gridTuning, steps) });
}

export function toggleManualGridStepMuteAction(args: {
  params: ResonanceParams;
  step: number;
  updateNParams: UpdateNParams;
  commitResonanceCursorY: CommitCursorY;
  currentCursorY: number;
}) {
  const { params, step, updateNParams, commitResonanceCursorY, currentCursorY } = args;
  const normalized = normalizeGridStepIndex(params.gridTuning, step);
  const current = params.manualGridMutedSteps ?? [];
  const next = toggleManualGridStep(normalized, current);
  updateManualGridMutedStepsAction(params.gridTuning, next, updateNParams);
  if (params.lockCursorToGrid) {
    commitResonanceCursorY(currentCursorY, { syncHud: false });
  }
}

export function setManualGridStepOffsetAction(args: {
  params: ResonanceParams;
  step: number;
  offsetValue: number;
  updateNParams: UpdateNParams;
  commitResonanceCursorY: CommitCursorY;
  currentCursorY: number;
}) {
  const { params, step, offsetValue, updateNParams, commitResonanceCursorY, currentCursorY } = args;
  const len = getTuningSteps(params.gridTuning);
  const normalized = normalizeGridStepIndex(params.gridTuning, step);
  const nextOffsets = buildManualGridStepOffsets(len, params.manualGridStepOffsets, normalized, offsetValue);
  updateNParams({ manualGridStepOffsets: nextOffsets });
  if (params.lockCursorToGrid) {
    commitResonanceCursorY(currentCursorY, { syncHud: false });
  }
}

export function changeGridTuningAction(args: {
  params: ResonanceParams;
  nextTuning: GridTuning;
  updateNParams: UpdateNParams;
  keyboardWindowOffsetRef: MutableRefObject<number>;
  commitResonanceCursorY: CommitCursorY;
  setKeyboardWindowStamp: Dispatch<SetStateAction<number>>;
  currentCursorY: number;
}) {
  const { params, nextTuning, updateNParams, keyboardWindowOffsetRef, commitResonanceCursorY, setKeyboardWindowStamp, currentCursorY } = args;
  const { newGridStates, resolvedGridMode, nextMutes, nextOffsets } = buildGridTuningTransition({
    gridTuning: params.gridTuning,
    gridMode: params.gridMode as ChurchMode,
    gridBase: params.gridBase,
    rememberGrid: params.rememberGrid,
    gridStates: params.gridStates,
    manualGridMutedSteps: params.manualGridMutedSteps ?? [],
    manualGridStepOffsets: params.manualGridStepOffsets ?? [],
  }, nextTuning);

  updateNParams({
    gridTuning: nextTuning,
    gridMode: resolvedGridMode,
    gridStates: newGridStates,
    manualGridMutedSteps: nextMutes,
    manualGridStepOffsets: nextOffsets,
  });

  keyboardWindowOffsetRef.current = 0;
  if (params.lockCursorToGrid) {
    commitResonanceCursorY(currentCursorY, { syncHud: false, refreshKeyboardWindow: true });
  } else {
    setKeyboardWindowStamp((prev) => prev + 1);
  }
}

export function getVisibleGridLinesAction(args: {
  gridTuning: GridTuning;
  gridBase: number;
  manualGridMutedSteps?: number[];
  manualGridStepOffsets?: number[];
}) {
  return buildVisibleGridLines({
    gridTuning: args.gridTuning,
    gridBase: args.gridBase,
    manualGridMutedSteps: args.manualGridMutedSteps ?? [],
    manualGridStepOffsets: args.manualGridStepOffsets ?? [],
  });
}
