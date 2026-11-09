import type { AppResonanceScreenStageSourceArgs } from './appResonanceScreenPanelRuntimeArgsTypes';

export type AppResonanceScreenStageActivitySourceArgs = Pick<
  AppResonanceScreenStageSourceArgs,
  'nexusActive' | 'resonanceInputIndicator' | 'setNexusActive'
>;

export type AppResonanceScreenStageCanvasSourceArgs = Pick<
  AppResonanceScreenStageSourceArgs,
  'nexusCanvasRef' | 'gameWidth' | 'gameHeight' | 'spawnNexusRipple'
>;

export type AppResonanceScreenStageAudioReadinessSourceArgs = Pick<
  AppResonanceScreenStageSourceArgs,
  'ensureAudioReady' | 'prewarmAudioRuntime' | 'resetResonanceTransientState' | 'audioCtx'
>;

export type AppResonanceScreenStageGridCursorSourceArgs = Pick<
  AppResonanceScreenStageSourceArgs,
  | 'updateNParams'
  | 'nexusParamsRef'
  | 'updateFocusCursor'
  | 'activeGridDragStepRef'
  | 'activeGridDragStartYRef'
  | 'activeGridDragBaseOffsetRef'
  | 'activeGridDragMovedRef'
  | 'getVisibleGridLines'
  | 'yFromFreq'
  | 'setManualGridStepOffset'
  | 'commitResonanceCursorY'
  | 'toggleManualGridStepMute'
>;

export type AppResonanceScreenStageInstallationGateSourceArgs = Pick<
  AppResonanceScreenStageSourceArgs,
  | 'installationSharedFieldActive'
  | 'installationSharedFieldController'
  | 'nexusRefs'
  | 'setPlayfieldCursorInside'
>;

export type BuildAppResonanceScreenStageSourceInput = {
  readonly activity: AppResonanceScreenStageActivitySourceArgs;
  readonly canvas: AppResonanceScreenStageCanvasSourceArgs;
  readonly audioReadiness: AppResonanceScreenStageAudioReadinessSourceArgs;
  readonly gridCursor: AppResonanceScreenStageGridCursorSourceArgs;
  readonly installationGate: AppResonanceScreenStageInstallationGateSourceArgs;
};
