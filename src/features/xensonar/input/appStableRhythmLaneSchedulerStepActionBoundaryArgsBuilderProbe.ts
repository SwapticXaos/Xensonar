import type { DrumMachine } from '../../resonance/drumMachine';
import type { StableRhythmLaneStepPlan } from '../audio/stableRhythmLane';
import type { DrumConfigEntry } from '../drumConfigLibraryTypes';
import type { AppNexusParams } from '../rooms/nexusParamsInitialState';
import type { AppStableRhythmLaneSchedulerBoundaryPorts } from './appStableRhythmLaneSchedulerBoundaryPortsContractProbe';
import type { AppStableRhythmLaneSchedulerStepActionBoundaryArgs } from './appStableRhythmLaneSchedulerStepActionBoundary';

export type AppStableRhythmLaneSchedulerStepActionBoundaryArgsBuilderProbeArgs = {
  readonly stationaryPlan: StableRhythmLaneStepPlan;
  readonly params: AppNexusParams;
  readonly stepDurationSec: number;
  readonly selectedExportedDrumConfig: DrumConfigEntry | null;
  readonly drumMachine: DrumMachine;
  readonly boundaryPorts: AppStableRhythmLaneSchedulerBoundaryPorts;
  readonly transportStillAppOwned: true;
  readonly nextAbsoluteStepStillAppOwned: true;
  readonly staleGuardAlreadyPassed: true;
  readonly schedulerLoopStillAppOwned: true;
  readonly stepPlanningStillAppOwned: true;
  readonly suppressLegacyDrumWhenStableMusicLaneBeatRunning?: boolean;
};

export type AppStableRhythmLaneSchedulerStepActionBoundaryArgsBuilderProbeResult = {
  readonly args: AppStableRhythmLaneSchedulerStepActionBoundaryArgs;
  readonly boundaryArgsOnly: true;
  readonly transportStillAppOwned: true;
  readonly nextAbsoluteStepStillAppOwned: true;
  readonly schedulerLoopStillAppOwned: true;
  readonly stepPlanningStillAppOwned: true;
  readonly staleGuardAlreadyPassed: true;
  readonly cacheWritesStillBoundaryOwned: true;
  readonly soundSchedulingStillBoundaryOwned: true;
  readonly runtimeOwned: false;
};

export const buildAppStableRhythmLaneSchedulerStepActionBoundaryArgsProbe = (
  args: AppStableRhythmLaneSchedulerStepActionBoundaryArgsBuilderProbeArgs,
): AppStableRhythmLaneSchedulerStepActionBoundaryArgsBuilderProbeResult => ({
  args: {
    stationaryPlan: args.stationaryPlan,
    params: args.params,
    stepDurationSec: args.stepDurationSec,
    selectedExportedDrumConfig: args.selectedExportedDrumConfig,
    drumMachine: args.drumMachine,
    readPorts: args.boundaryPorts.readPorts,
    actionPorts: args.boundaryPorts.actionPorts,
    cacheRefs: args.boundaryPorts.cacheRefs,
    transportStillAppOwned: true,
    nextAbsoluteStepStillAppOwned: true,
    staleGuardAlreadyPassed: true,
    suppressLegacyDrumWhenStableMusicLaneBeatRunning: args.suppressLegacyDrumWhenStableMusicLaneBeatRunning === true,
  },
  boundaryArgsOnly: true,
  transportStillAppOwned: true,
  nextAbsoluteStepStillAppOwned: true,
  schedulerLoopStillAppOwned: true,
  stepPlanningStillAppOwned: true,
  staleGuardAlreadyPassed: true,
  cacheWritesStillBoundaryOwned: true,
  soundSchedulingStillBoundaryOwned: true,
  runtimeOwned: false,
});
