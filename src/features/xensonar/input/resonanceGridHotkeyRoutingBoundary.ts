import {
  getGridModeCycleDirection,
  isGridModeCycleEvent,
  isNextGridTuningKey,
  isPrevGridTuningKey,
} from '../resonanceKeyboard';
import {
  getModesForSystem,
  nextGridTuning,
  type ChurchMode,
  type GridTuning,
} from '../domain/instrumentData';
import type { AppNexusParams } from '../rooms/nexusParamsInitialState';

type ResonanceGridHotkeyEvent = Pick<KeyboardEvent, 'key' | 'code'>;

type ResonanceGridHotkeyParams = Pick<AppNexusParams, 'gridTuning' | 'gridMode'>;

type RunResonanceGridHotkeyRoutingBoundaryArgs = {
  event: ResonanceGridHotkeyEvent;
  params: ResonanceGridHotkeyParams;
  runWithAudio: (command: () => void) => void;
  changeGridTuning: (nextTuning: GridTuning) => void;
  setGridMode: (nextMode: ChurchMode) => void;
  resetKeyboardWindow: () => void;
};

export function runResonanceGridHotkeyRoutingBoundary(
  args: RunResonanceGridHotkeyRoutingBoundaryArgs,
): boolean {
  const { event, params, runWithAudio, changeGridTuning, setGridMode, resetKeyboardWindow } = args;

  if (isPrevGridTuningKey(event.key)) {
    runWithAudio(() => {
      changeGridTuning(nextGridTuning(params.gridTuning, -1));
    });
    return true;
  }

  if (isNextGridTuningKey(event.key)) {
    runWithAudio(() => {
      changeGridTuning(nextGridTuning(params.gridTuning, 1));
    });
    return true;
  }

  if (!isGridModeCycleEvent(event)) return false;

  const gridModes = getModesForSystem(params.gridTuning);
  const currentIndex = gridModes.findIndex((mode) => mode.value === params.gridMode);
  if (currentIndex !== -1) {
    runWithAudio(() => {
      const direction = getGridModeCycleDirection(event);
      const nextIndex = (currentIndex + direction + gridModes.length) % gridModes.length;
      const nextMode = gridModes[nextIndex].value;
      setGridMode(nextMode);
      resetKeyboardWindow();
    });
  }
  return true;
}
