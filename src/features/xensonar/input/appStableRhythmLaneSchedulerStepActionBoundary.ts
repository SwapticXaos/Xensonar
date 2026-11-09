import type { DrumMachine } from '../../resonance/drumMachine';
import type { AppNexusParams } from '../rooms/nexusParamsInitialState';
import type { StableRhythmLaneExecutionResult, StableRhythmLaneStepPlan } from '../audio/stableRhythmLane';
import type { DrumConfigEntry } from '../drumConfigLibraryTypes';
import type {
  AppStableRhythmLaneSchedulerActionPorts,
  AppStableRhythmLaneSchedulerCacheRefs,
  AppStableRhythmLaneSchedulerReadPorts,
} from './appStableRhythmLaneSchedulerBoundaryPortsContractProbe';
import { executeAppStableRhythmLaneStepExecutionFrameProbe } from './appStableRhythmLaneStepExecutionRunnerProbe';
import { buildAppStableRhythmLaneStepExecutionFrameFromBoundaryProbe } from './appStableRhythmLaneStepExecutionFrameBuilderProbe';

export type AppStableRhythmLaneSchedulerStepActionBoundaryArgs = {
  readonly stationaryPlan: StableRhythmLaneStepPlan;
  readonly params: AppNexusParams;
  readonly stepDurationSec: number;
  readonly selectedExportedDrumConfig: DrumConfigEntry | null;
  readonly drumMachine: DrumMachine;
  readonly readPorts: AppStableRhythmLaneSchedulerReadPorts;
  readonly actionPorts: AppStableRhythmLaneSchedulerActionPorts;
  readonly cacheRefs: AppStableRhythmLaneSchedulerCacheRefs;
  readonly transportStillAppOwned: true;
  readonly nextAbsoluteStepStillAppOwned: true;
  readonly staleGuardAlreadyPassed: true;
  readonly suppressLegacyDrumWhenStableMusicLaneBeatRunning?: boolean;
};

export const executeAppStableRhythmLaneSchedulerStepActionBoundary = (
  args: AppStableRhythmLaneSchedulerStepActionBoundaryArgs,
): StableRhythmLaneExecutionResult => {
  const stableRhythmLaneStepExecutionFrame = buildAppStableRhythmLaneStepExecutionFrameFromBoundaryProbe({
    stationaryPlan: args.stationaryPlan,
    params: args.params,
    stepDurationSec: args.stepDurationSec,
    cacheRefs: args.cacheRefs,
    readPorts: args.readPorts,
    actionPorts: args.actionPorts,
    transportStillAppOwned: true,
    nextAbsoluteStepStillAppOwned: true,
    staleGuardAlreadyPassed: true,
    schedulingStillBoundaryOwned: true,
    runtimeOwned: false,
  }).frame;

  return executeAppStableRhythmLaneStepExecutionFrameProbe({
    frame: stableRhythmLaneStepExecutionFrame,
    selectedExportedDrumConfig: args.selectedExportedDrumConfig,
    drumMachine: args.drumMachine,
    schedulingStillBoundaryOwned: true,
    runtimeOwned: false,
    suppressLegacyDrumWhenStableMusicLaneBeatRunning: args.suppressLegacyDrumWhenStableMusicLaneBeatRunning === true,
  });
};
