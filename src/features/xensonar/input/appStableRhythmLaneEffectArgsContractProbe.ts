import type { AppStableRhythmLaneBassNoteActionProbeArgs, AppStableRhythmLaneBassNoteActionProbeResult } from './appStableRhythmLaneBassNoteActionProbe';
import { buildAppStableRhythmLaneBassNoteActionProbe } from './appStableRhythmLaneBassNoteActionProbe';
import type { AppStableRhythmLaneMyzelLayerStepActionProbeArgs, AppStableRhythmLaneMyzelLayerStepActionProbeResult } from './appStableRhythmLaneMyzelLayerStepActionProbe';
import { buildAppStableRhythmLaneMyzelLayerStepActionProbe } from './appStableRhythmLaneMyzelLayerStepActionProbe';
import type { AppStableRhythmLaneSchedulerBoundaryPorts } from './appStableRhythmLaneSchedulerBoundaryPortsContractProbe';
import type { AppStableRhythmLaneSchedulerBoundaryPortsBuilderProbeArgs } from './appStableRhythmLaneSchedulerBoundaryPortsBuilderProbe';
import { buildAppStableRhythmLaneSchedulerBoundaryPortsProbe } from './appStableRhythmLaneSchedulerBoundaryPortsBuilderProbe';
import type { AppStableRhythmLaneSchedulerLoopProbeArgs } from './appStableRhythmLaneSchedulerLoopProbe';

export type AppStableRhythmLaneEffectBassNoteActionContractProbeArgs = Omit<
  AppStableRhythmLaneBassNoteActionProbeArgs,
  | 'stableRhythmLaneBassNoteActionExtractedFromAppTsx'
  | 'audioBodyNowActionProbeOwned'
  | 'finalMixBusStillAppSupplied'
  | 'enterHoldFxDeviceStillAppSupplied'
>;

export type AppStableRhythmLaneEffectMyzelLayerStepActionContractProbeArgs = Omit<
  AppStableRhythmLaneMyzelLayerStepActionProbeArgs,
  | 'stableRhythmLaneMyzelLayerStepActionExtractedFromAppTsx'
  | 'audioBodyNowActionProbeOwned'
  | 'myzelSynthStillAppSupplied'
  | 'hotPathAddsNoPerStepBuilder'
>;

export type AppStableRhythmLaneEffectBoundaryPortsContractProbeArgs = Omit<
  AppStableRhythmLaneSchedulerBoundaryPortsBuilderProbeArgs,
  | 'playBassNote'
  | 'applyMyzelLayerStep'
  | 'boundaryPortsOnly'
  | 'transportStillAppOwned'
  | 'schedulerLoopStillAppOwned'
  | 'stepPlanningStillAppOwned'
>;

export type AppStableRhythmLaneEffectSchedulerLoopContractProbeArgs = Omit<
  AppStableRhythmLaneSchedulerLoopProbeArgs,
  | 'boundaryPorts'
  | 'reactLifecycleStillAppEffectOwned'
  | 'schedulerLoopExtractedFromAppTsx'
  | 'timerResponsibilityNowInLoopProbe'
  | 'nextAbsoluteStepTimeTruthStillAppNexusRef'
  | 'browserFunctionalSanityRequiredAfterThisCut'
>;

export type AppStableRhythmLaneEffectArgsContractProbeArgs = {
  readonly bassNoteAction: AppStableRhythmLaneEffectBassNoteActionContractProbeArgs;
  readonly myzelLayerStepAction: AppStableRhythmLaneEffectMyzelLayerStepActionContractProbeArgs;
  readonly boundaryPorts: AppStableRhythmLaneEffectBoundaryPortsContractProbeArgs;
  readonly schedulerLoop: AppStableRhythmLaneEffectSchedulerLoopContractProbeArgs;
  readonly effectArgsContractExtractedFromAppTsx: true;
  readonly reactLifecycleStillAppEffectOwned: true;
  readonly schedulerLoopStillProbeOwned: true;
  readonly hotPathAddsNoPerStepBuilder: true;
};

export type AppStableRhythmLaneEffectArgsContractProbeResult = {
  readonly bassNoteAction: AppStableRhythmLaneBassNoteActionProbeResult;
  readonly myzelLayerStepAction: AppStableRhythmLaneMyzelLayerStepActionProbeResult;
  readonly boundaryPorts: AppStableRhythmLaneSchedulerBoundaryPorts;
  readonly schedulerLoopArgs: AppStableRhythmLaneSchedulerLoopProbeArgs;
  readonly effectArgsContractExtractedFromAppTsx: true;
  readonly reactLifecycleStillAppEffectOwned: true;
  readonly schedulerLoopStillProbeOwned: true;
  readonly hotPathAddsNoPerStepBuilder: true;
  readonly liveAudioHotPathAddsNoObserver: true;
};

export const buildAppStableRhythmLaneEffectArgsContractProbe = (
  args: AppStableRhythmLaneEffectArgsContractProbeArgs,
): AppStableRhythmLaneEffectArgsContractProbeResult => {
  const bassNoteAction = buildAppStableRhythmLaneBassNoteActionProbe({
    ...args.bassNoteAction,
    stableRhythmLaneBassNoteActionExtractedFromAppTsx: true,
    audioBodyNowActionProbeOwned: true,
    finalMixBusStillAppSupplied: true,
    enterHoldFxDeviceStillAppSupplied: true,
  });

  const myzelLayerStepAction = buildAppStableRhythmLaneMyzelLayerStepActionProbe({
    ...args.myzelLayerStepAction,
    stableRhythmLaneMyzelLayerStepActionExtractedFromAppTsx: true,
    audioBodyNowActionProbeOwned: true,
    myzelSynthStillAppSupplied: true,
    hotPathAddsNoPerStepBuilder: true,
  });

  const boundaryPorts = buildAppStableRhythmLaneSchedulerBoundaryPortsProbe({
    ...args.boundaryPorts,
    playBassNote: bassNoteAction.playBassNote,
    applyMyzelLayerStep: myzelLayerStepAction.applyMyzelLayerStep,
    boundaryPortsOnly: true,
    transportStillAppOwned: true,
    schedulerLoopStillAppOwned: true,
    stepPlanningStillAppOwned: true,
  });

  return {
    bassNoteAction,
    myzelLayerStepAction,
    boundaryPorts,
    schedulerLoopArgs: {
      ...args.schedulerLoop,
      boundaryPorts,
      reactLifecycleStillAppEffectOwned: true,
      schedulerLoopExtractedFromAppTsx: true,
      timerResponsibilityNowInLoopProbe: true,
      nextAbsoluteStepTimeTruthStillAppNexusRef: true,
      browserFunctionalSanityRequiredAfterThisCut: true,
    },
    effectArgsContractExtractedFromAppTsx: true,
    reactLifecycleStillAppEffectOwned: true,
    schedulerLoopStillProbeOwned: true,
    hotPathAddsNoPerStepBuilder: true,
    liveAudioHotPathAddsNoObserver: true,
  };
};
