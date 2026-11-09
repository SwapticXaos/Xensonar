import type { AppNexusParams } from '../rooms/nexusParamsInitialState';
import { stepYToGrid } from '../rooms/resonanceRuntimeMath';
import {
  handleResonanceHoldKeyUp,
  handleResonanceMomentaryHoldKeyDown,
  isResonanceSustainExtendKey,
  setResonanceArrowKeyState,
  shouldIgnoreResonanceKeyboardTarget,
  type ResonanceArrowState,
  type ResonanceHoldKeyActions,
} from './resonanceKeyboardCommandActions';

type ResonanceArrowKeyDownEvent = Pick<KeyboardEvent, 'key' | 'repeat'>;

type ResonanceArrowGridParams = Pick<
  AppNexusParams,
  'lockCursorToGrid' | 'gridBase' | 'gridTuning' | 'manualGridMutedSteps' | 'manualGridStepOffsets'
>;

type RunResonanceArrowKeyDownBoundaryArgs = {
  event: ResonanceArrowKeyDownEvent;
  params: ResonanceArrowGridParams;
  arrowState: ResonanceArrowState;
  cursorY: number;
  preventDefault: () => void;
  commitCursorY: (nextY: number) => void;
};

export function runResonanceArrowKeyDownBoundary({
  event,
  params,
  arrowState,
  cursorY,
  preventDefault,
  commitCursorY,
}: RunResonanceArrowKeyDownBoundaryArgs): boolean {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    setResonanceArrowKeyState(arrowState, event.key, true);
    preventDefault();
    return true;
  }

  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
    return false;
  }

  preventDefault();
  if (params.lockCursorToGrid) {
    if (event.repeat) return true;
    const direction = event.key === 'ArrowUp' ? 1 : -1;
    const nextY = stepYToGrid(
      cursorY,
      direction,
      params.gridBase,
      params.gridTuning,
      params.manualGridMutedSteps,
      params.manualGridStepOffsets,
    );
    if (nextY !== cursorY) {
      commitCursorY(nextY);
    }
    return true;
  }

  setResonanceArrowKeyState(arrowState, event.key, true);
  return true;
}

export function runResonanceMomentaryHoldKeyDownBoundary(
  event: KeyboardEvent,
  holdActions: Pick<ResonanceHoldKeyActions, 'setSustainHoldActive' | 'setSwellHoldActive' | 'setOctaveHoldActive'>,
  recordAdaptiveAction?: (action: 'keyboard-input-hold-repeat-coalesced') => void,
): boolean {
  if (isResonanceSustainExtendKey(event) && event.repeat) {
    event.preventDefault();
    recordAdaptiveAction?.('keyboard-input-hold-repeat-coalesced');
    return true;
  }
  return handleResonanceMomentaryHoldKeyDown(event, holdActions);
}

type RunResonanceKeyUpHoldBoundaryArgs = {
  event: KeyboardEvent;
  arrowState: ResonanceArrowState;
  holdActions: ResonanceHoldKeyActions;
};

export function runResonanceKeyUpHoldBoundary({
  event,
  arrowState,
  holdActions,
}: RunResonanceKeyUpHoldBoundaryArgs): boolean {
  if (shouldIgnoreResonanceKeyboardTarget(event)) return false;
  setResonanceArrowKeyState(arrowState, event.key, false);
  handleResonanceHoldKeyUp(event, holdActions);
  return true;
}
