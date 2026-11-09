import type { ResonanceArrowState } from './resonanceKeyboardCommandActions';

export type AppArrowMotionRafRef<T> = {
  current: T;
};

export type AppArrowMotionCursorParams = {
  readonly cursorSpeed: number;
  readonly lockCursorToGrid: boolean;
};

export type AppArrowMotionCursorRuntime = {
  cursorX: number;
  cursorY: number;
};

export type AppArrowMotionCommitCursorY = (
  targetY: number,
  options: { readonly syncHud: true; readonly primeSource: 'resonance' },
) => void;

export type AppResonanceArrowMotionRafCallsiteSource<
  TCursorRuntime extends AppArrowMotionCursorRuntime,
  TFocusInput extends string,
> = {
  readonly probeKind: 'app-resonance-arrow-motion-raf-callsite-source-probe';
  readonly callsiteOwnerStillApp: true;
  readonly rafLoopStillInlineInApp: true;
  readonly requestAnimationFrameOwnerStillApp: true;
  readonly cancelAnimationFrameOwnerStillApp: true;
  readonly cursorCommitOwnerStillApp: true;
  readonly runtimeOwned: false;
  readonly audioOwned: false;
  readonly schedulingOwned: false;
  readonly effectGate: {
    readonly resonanceInputActive: boolean;
    readonly sourceOwnerStillApp: true;
  };
  readonly closureDependencies: {
    readonly resonanceInputActive: boolean;
    readonly myzelEnabled: boolean;
    readonly bassRootMode: string;
  };
  readonly runtimeRefs: {
    readonly nexusParamsRef: AppArrowMotionRafRef<AppArrowMotionCursorParams>;
    readonly nexusArrowRef: AppArrowMotionRafRef<ResonanceArrowState>;
    readonly nexusRefs: AppArrowMotionRafRef<TCursorRuntime>;
    readonly focusCursorLastInputRef: AppArrowMotionRafRef<TFocusInput>;
  };
  readonly frameBounds: {
    readonly gameWidth: number;
  };
  readonly provenance: {
    readonly arrowInputSource: TFocusInput;
  };
  readonly actions: {
    readonly clampValue: (value: number, min: number, max: number) => number;
    readonly commitCursorY: AppArrowMotionCommitCursorY;
  };
};

export const buildAppResonanceArrowMotionRafCallsiteSource = <
  TCursorRuntime extends AppArrowMotionCursorRuntime,
  TFocusInput extends string,
>(
  source: Omit<
    AppResonanceArrowMotionRafCallsiteSource<TCursorRuntime, TFocusInput>,
    | 'probeKind'
    | 'callsiteOwnerStillApp'
    | 'rafLoopStillInlineInApp'
    | 'requestAnimationFrameOwnerStillApp'
    | 'cancelAnimationFrameOwnerStillApp'
    | 'cursorCommitOwnerStillApp'
    | 'runtimeOwned'
    | 'audioOwned'
    | 'schedulingOwned'
  >,
): AppResonanceArrowMotionRafCallsiteSource<TCursorRuntime, TFocusInput> => ({
  probeKind: 'app-resonance-arrow-motion-raf-callsite-source-probe',
  callsiteOwnerStillApp: true,
  rafLoopStillInlineInApp: true,
  requestAnimationFrameOwnerStillApp: true,
  cancelAnimationFrameOwnerStillApp: true,
  cursorCommitOwnerStillApp: true,
  runtimeOwned: false,
  audioOwned: false,
  schedulingOwned: false,
  ...source,
});

export type BuildAppResonanceArrowMotionRafCompactCallsiteSourceInput<
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

export const buildAppResonanceArrowMotionRafCompactCallsiteSource = <
  TCursorRuntime extends AppArrowMotionCursorRuntime,
  TFocusInput extends string,
>(
  input: BuildAppResonanceArrowMotionRafCompactCallsiteSourceInput<TCursorRuntime, TFocusInput>,
): AppResonanceArrowMotionRafCallsiteSource<TCursorRuntime, TFocusInput> =>
  buildAppResonanceArrowMotionRafCallsiteSource({
    effectGate: {
      resonanceInputActive: input.resonanceInputActive,
      sourceOwnerStillApp: true,
    },
    closureDependencies: {
      resonanceInputActive: input.resonanceInputActive,
      myzelEnabled: input.myzelEnabled,
      bassRootMode: input.bassRootMode,
    },
    runtimeRefs: {
      nexusParamsRef: input.nexusParamsRef,
      nexusArrowRef: input.nexusArrowRef,
      nexusRefs: input.nexusRefs,
      focusCursorLastInputRef: input.focusCursorLastInputRef,
    },
    frameBounds: {
      gameWidth: input.gameWidth,
    },
    provenance: {
      arrowInputSource: 'arrow' as TFocusInput,
    },
    actions: {
      clampValue: input.clampValue,
      commitCursorY: input.commitCursorY,
    },
  });

