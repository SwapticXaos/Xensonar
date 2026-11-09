import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { clamp } from './resonanceRuntimeMath';
import { clampFocusCursor, resolveCursorHudUpdate, resolveResonanceCursorYValue, type ResonanceCursorGridParams } from './resonanceCursorState';

type PrimeSource = 'resonance' | 'topology' | 'wave' | 'toggle' | 'auto';

export function primeMyzelFromYAction(
  y: number,
  myzelPrimedYRef: MutableRefObject<number | null>,
  myzelPrimedSourceRef: MutableRefObject<PrimeSource>,
  gameHeight: number,
  source: PrimeSource = 'auto',
) {
  if (!Number.isFinite(y)) return;
  myzelPrimedYRef.current = clamp(y, 0, gameHeight);
  myzelPrimedSourceRef.current = source;
}

export function syncCursorHudFromYAction(args: {
  y: number;
  gameHeight: number;
  cursorHudHzRef: MutableRefObject<number>;
  cursorHudLastUpdateRef: MutableRefObject<number>;
  setCursorHudHz: Dispatch<SetStateAction<number>>;
  freqFromY: (y: number) => number;
  nowMs: number;
}) {
  const { y, gameHeight, cursorHudHzRef, cursorHudLastUpdateRef, setCursorHudHz, freqFromY, nowMs } = args;
  const { nextHz, shouldUpdate } = resolveCursorHudUpdate(
    y,
    gameHeight,
    cursorHudHzRef.current,
    cursorHudLastUpdateRef.current,
    nowMs,
    freqFromY,
  );
  cursorHudHzRef.current = nextHz;
  if (shouldUpdate) {
    cursorHudLastUpdateRef.current = nowMs;
    setCursorHudHz(nextHz);
  }
}

export function updateFocusCursorAction(
  rawX: number,
  rawY: number,
  focusCursorRef: MutableRefObject<{ x: number; y: number }>,
  focusCursorLastInputRef: MutableRefObject<PrimeSource | 'mouse' | 'keyboard' | 'arrow' | 'grid'>,
  gameWidth: number,
  gameHeight: number,
  source: 'mouse' | 'keyboard' | 'arrow' | 'grid' | 'auto' = 'mouse',
) {
  focusCursorRef.current = clampFocusCursor(rawX, rawY, gameWidth, gameHeight);
  focusCursorLastInputRef.current = source;
  return focusCursorRef.current;
}

export function resolveResonanceCursorYAction(
  rawY: number,
  params: Record<string, unknown>,
  gameHeight: number,
  snapYToGrid: (
    y: number,
    gridBase: ResonanceCursorGridParams['gridBase'],
    gridTuning: ResonanceCursorGridParams['gridTuning'],
    manualGridMutedSteps: ResonanceCursorGridParams['manualGridMutedSteps'],
    manualGridStepOffsets: ResonanceCursorGridParams['manualGridStepOffsets'],
  ) => number,
) {
  return resolveResonanceCursorYValue(rawY, gameHeight, params as any, snapYToGrid);
}
