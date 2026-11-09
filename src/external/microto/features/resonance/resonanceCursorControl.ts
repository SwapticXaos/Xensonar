import { clamp, type GridTuning } from "../../shared/tuning/grid";
import type { NexusRuntimeRefs } from "./resonanceRefs";

type PointerGridArgs = {
  lockCursorToGrid: boolean;
  gridBase: number;
  gridTuning: GridTuning;
  gameWidth: number;
  gameHeight: number;
  snapYToGrid: (y: number, base: number, tuning: GridTuning) => number;
};

type GridStepArgs = Pick<
  PointerGridArgs,
  "lockCursorToGrid" | "gridBase" | "gridTuning" | "gameHeight" | "snapYToGrid"
> & {
  stepYToGrid: (currentY: number, direction: 1 | -1, base: number, tuning: GridTuning) => number;
};

type PitchArgs = {
  lockCursorToGrid: boolean;
  gameHeight: number;
};

type CursorControlState = Pick<
  NexusRuntimeRefs,
  "cursorX" | "cursorY" | "pointerCursorX" | "pointerCursorY" | "keyboardCursorYOverride"
>;

function resolvePointerCursorY(
  pointerY: number,
  { lockCursorToGrid, gridBase, gridTuning, gameHeight, snapYToGrid }: Omit<PointerGridArgs, "gameWidth">,
) {
  const clampedY = clamp(pointerY, 0, gameHeight);
  return lockCursorToGrid ? snapYToGrid(clampedY, gridBase, gridTuning) : clampedY;
}

export function syncPointerDrivenCursor(
  state: CursorControlState,
  pointerX: number,
  pointerY: number,
  args: PointerGridArgs,
) {
  const nextX = clamp(pointerX, 0, args.gameWidth);
  const nextPointerY = clamp(pointerY, 0, args.gameHeight);
  state.pointerCursorX = nextX;
  state.pointerCursorY = nextPointerY;
  state.keyboardCursorYOverride = null;
  state.cursorX = nextX;
  state.cursorY = resolvePointerCursorY(nextPointerY, args);
  return { x: state.cursorX, y: state.cursorY };
}

export function stepKeyboardGridCursor(
  state: CursorControlState,
  direction: 1 | -1,
  args: GridStepArgs,
) {
  const anchorY =
    state.keyboardCursorYOverride ?? resolvePointerCursorY(state.pointerCursorY, args);
  const nextY = clamp(
    args.stepYToGrid(anchorY, direction, args.gridBase, args.gridTuning),
    0,
    args.gameHeight,
  );
  state.keyboardCursorYOverride = nextY;
  state.cursorY = nextY;
  return nextY;
}

export function setKeyboardCursorPitch(
  state: CursorControlState,
  nextY: number,
  { lockCursorToGrid, gameHeight }: PitchArgs,
) {
  const clampedY = clamp(nextY, 0, gameHeight);
  state.keyboardCursorYOverride = lockCursorToGrid ? clampedY : null;
  state.cursorY = clampedY;
  return clampedY;
}

export function resolveResonanceCursorFrame(
  state: CursorControlState,
  args: PointerGridArgs,
) {
  state.cursorX = clamp(state.cursorX, 0, args.gameWidth);
  if (!args.lockCursorToGrid) {
    state.keyboardCursorYOverride = null;
    state.cursorY = clamp(state.cursorY, 0, args.gameHeight);
    return { x: state.cursorX, y: state.cursorY };
  }
  state.cursorY =
    state.keyboardCursorYOverride ?? resolvePointerCursorY(state.pointerCursorY, args);
  return { x: state.cursorX, y: state.cursorY };
}
