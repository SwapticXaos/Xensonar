import { useEffect } from 'react';

import { buildAppResonanceArrowMotionRafCompactCallsiteSource } from './appResonanceArrowMotionRafCallsiteSourceProbe';
import type {
  AppArrowMotionCursorParams,
  AppArrowMotionCursorRuntime,
  AppArrowMotionRafRef,
  AppResonanceArrowMotionRafCallsiteSource,
  AppArrowMotionCommitCursorY,
} from './appResonanceArrowMotionRafCallsiteSourceProbe';
import type { ResonanceArrowState } from './resonanceKeyboardCommandActions';

export type UseAppResonanceArrowMotionRafArgs<
  TCursorRuntime extends AppArrowMotionCursorRuntime,
  TFocusInput extends string,
> = {
  readonly resonanceInputActive: boolean;
  readonly myzelEnabled: boolean;
  readonly bassRootMode: string;
  readonly nexusParamsRef: AppArrowMotionRafRef<AppArrowMotionCursorParams>;
  readonly nexusArrowRef: AppArrowMotionRafRef<ResonanceArrowState>;
  readonly nexusRefs: AppArrowMotionRafRef<TCursorRuntime>;
  readonly focusCursorLastInputRef: AppArrowMotionRafRef<TFocusInput>;
  readonly gameWidth: number;
  readonly clampValue: (value: number, min: number, max: number) => number;
  readonly commitCursorY: AppArrowMotionCommitCursorY;
};

export const runAppResonanceArrowMotionRafFrame = <
  TCursorRuntime extends AppArrowMotionCursorRuntime,
  TFocusInput extends string,
>(
  arrowMotionRafSource: AppResonanceArrowMotionRafCallsiteSource<TCursorRuntime, TFocusInput>,
): void => {
  const { nexusParamsRef, nexusArrowRef, nexusRefs, focusCursorLastInputRef } = arrowMotionRafSource.runtimeRefs;
  const speed = nexusParamsRef.current.cursorSpeed;
  let cursorXChanged = false;
  let cursorYChanged = false;

  if (nexusArrowRef.current.left) {
    nexusRefs.current.cursorX -= speed;
    cursorXChanged = true;
  }
  if (nexusArrowRef.current.right) {
    nexusRefs.current.cursorX += speed;
    cursorXChanged = true;
  }
  if (!nexusParamsRef.current.lockCursorToGrid) {
    if (nexusArrowRef.current.up) {
      nexusRefs.current.cursorY -= speed;
      cursorYChanged = true;
    }
    if (nexusArrowRef.current.down) {
      nexusRefs.current.cursorY += speed;
      cursorYChanged = true;
    }
  }

  if (cursorXChanged) {
    nexusRefs.current.cursorX = arrowMotionRafSource.actions.clampValue(
      nexusRefs.current.cursorX,
      0,
      arrowMotionRafSource.frameBounds.gameWidth,
    );
  }
  if (cursorXChanged || cursorYChanged) {
    focusCursorLastInputRef.current = arrowMotionRafSource.provenance.arrowInputSource;
  }
  if (cursorYChanged) {
    arrowMotionRafSource.actions.commitCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: 'resonance' });
  }
};

export const useAppResonanceArrowMotionRaf = <
  TCursorRuntime extends AppArrowMotionCursorRuntime,
  TFocusInput extends string,
>(
  args: UseAppResonanceArrowMotionRafArgs<TCursorRuntime, TFocusInput>,
): void => {
  useEffect(() => {
    const arrowMotionRafSource = buildAppResonanceArrowMotionRafCompactCallsiteSource(args);
    if (!arrowMotionRafSource.effectGate.resonanceInputActive) return;

    let raf = 0;
    const tick = () => {
      runAppResonanceArrowMotionRafFrame(arrowMotionRafSource);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [args.resonanceInputActive, args.myzelEnabled, args.bassRootMode]);
};
