import type { AppAuxPanelBoundaryInputContractMap } from './appAuxPanelBoundaryBaseTypes';
import type { useResonanceFxUiState } from '../rooms/useResonanceFxUiState';

type AppParallelEffectsAuxPanelProps = AppAuxPanelBoundaryInputContractMap['parallelEffects'];
type AppParallelEffectsResonanceFxUiState = ReturnType<typeof useResonanceFxUiState>;

export type AppParallelEffectsCollectiveMemoryBoundary = Pick<
  AppParallelEffectsAuxPanelProps,
  | 'collectiveMemoryEnabled'
  | 'setCollectiveMemoryEnabled'
  | 'collectiveMemoryWindow'
  | 'setCollectiveMemoryWindow'
  | 'collectiveMemoryUi'
  | 'updateCollectiveMemoryUi'
  | 'collectiveMemoryMonitor'
>;

export type AppParallelEffectsSharedFormatterBoundary = Pick<
  AppParallelEffectsAuxPanelProps,
  'formatHzCompact'
>;

export type AppParallelEffectsPsychedelicSpiralBoundary = Pick<
  AppParallelEffectsAuxPanelProps,
  | 'psychedelicSpiralEnabled'
  | 'setPsychedelicSpiralEnabled'
  | 'psychedelicSpiralUi'
  | 'setPsychedelicSpiralUi'
  | 'psychedelicSpiralFollow'
  | 'setPsychedelicSpiralFollow'
  | 'updatePsychedelicSpiralSource'
  | 'psychedelicSpiralMonitor'
>;

export type AppParallelEffectsEnterHoldPsyFxBoundary = Pick<
  AppParallelEffectsAuxPanelProps,
  | 'enterHoldPsyFxEnabled'
  | 'setEnterHoldPsyFxEnabled'
  | 'enterHoldPsyFxUi'
  | 'setEnterHoldPsyFxUi'
>;

export type AppParallelEffectsSchwarmBoundary = Pick<
  AppParallelEffectsAuxPanelProps,
  | 'schwarmEnabled'
  | 'setSchwarmEnabled'
  | 'schwarmUi'
  | 'setSchwarmUi'
  | 'schwarmMaterialOptions'
  | 'updateSchwarmSource'
  | 'schwarmMonitor'
>;

export type AppParallelEffectsRuntimeMonitorBoundary = Pick<
  AppParallelEffectsAuxPanelProps,
  'controlPerfMonitor' | 'transientRuntimeMonitor'
>;

export type AppParallelEffectsLiveMasteringBoundary = Pick<
  AppParallelEffectsAuxPanelProps,
  | 'liveMasteringEnabled'
  | 'setLiveMasteringEnabled'
  | 'liveMasteringStrength'
  | 'setLiveMasteringStrength'
  | 'liveMasteringGlue'
  | 'setLiveMasteringGlue'
  | 'liveMasteringAir'
  | 'setLiveMasteringAir'
  | 'liveMasterMonitor'
>;

export type AppParallelEffectsAuxPanelGroupedBoundaryInput = {
  collectiveMemory: AppParallelEffectsCollectiveMemoryBoundary;
  sharedFormatters: AppParallelEffectsSharedFormatterBoundary;
  psychedelicSpiral: AppParallelEffectsPsychedelicSpiralBoundary;
  enterHoldPsyFx: AppParallelEffectsEnterHoldPsyFxBoundary;
  schwarm: AppParallelEffectsSchwarmBoundary;
  runtimeMonitors: AppParallelEffectsRuntimeMonitorBoundary;
  liveMastering: AppParallelEffectsLiveMasteringBoundary;
};

export type AppParallelEffectsAuxPanelCompactBoundaryInput = {
  resonanceFxUiState: AppParallelEffectsResonanceFxUiState;
  sharedFormatters: AppParallelEffectsSharedFormatterBoundary;
  schwarmMaterialOptions: AppParallelEffectsSchwarmBoundary['schwarmMaterialOptions'];
  liveMastering: AppParallelEffectsLiveMasteringBoundary;
};

export type AppParallelEffectsAuxPanelBoundaryInput =
  | AppParallelEffectsAuxPanelGroupedBoundaryInput
  | AppParallelEffectsAuxPanelCompactBoundaryInput;

export type AppParallelEffectsAuxPanelBoundary = AppParallelEffectsAuxPanelProps;
