import type { AppNexusParams } from '../rooms/nexusParamsInitialState';
import type { StableRhythmLaneStepPlan } from '../audio/stableRhythmLane';
import type {
  AppStableRhythmLaneSchedulerActionPorts,
  AppStableRhythmLaneSchedulerCacheRefs,
  AppStableRhythmLaneSchedulerReadPorts,
} from './appStableRhythmLaneSchedulerBoundaryPortsContractProbe';
import type { AppStableRhythmLaneSchedulerStepLocals } from './appStableRhythmLaneSchedulerStepLocalsBuilderProbe';
import type {
  AppStableRhythmLaneSchedulerBassStepVoiceValues,
  AppStableRhythmLaneSchedulerDrumStepVoiceValues,
} from './appStableRhythmLaneSchedulerStepVoiceValuesBuilderProbe';

export type AppStableRhythmLaneStepExecutionFrameProbe = {
  readonly plan: StableRhythmLaneStepPlan;
  readonly params: AppNexusParams;
  readonly cacheRefs: AppStableRhythmLaneSchedulerCacheRefs;
  readonly readPorts: AppStableRhythmLaneSchedulerReadPorts;
  readonly actionPorts: AppStableRhythmLaneSchedulerActionPorts;
  readonly stepLocals: AppStableRhythmLaneSchedulerStepLocals;
  readonly drumStepVoiceValues: AppStableRhythmLaneSchedulerDrumStepVoiceValues;
  readonly bassStepVoiceValues: AppStableRhythmLaneSchedulerBassStepVoiceValues;
  readonly schedulingStillBoundaryOwned: true;
  readonly runtimeOwned: false;
};

export type AppStableRhythmLaneStepExecutionFrameProbeArgs = AppStableRhythmLaneStepExecutionFrameProbe;

export type AppStableRhythmLaneStepExecutionFrameProbeResult = {
  readonly probeKind: 'app-stable-rhythm-lane-step-execution-frame-probe';
  readonly frame: AppStableRhythmLaneStepExecutionFrameProbe;
  readonly transportStillAppOwned: true;
  readonly nextAbsoluteStepStillAppOwned: true;
  readonly staleGuardAlreadyPassed: true;
  readonly schedulingStillBoundaryOwned: true;
  readonly runtimeOwned: false;
};

export const buildAppStableRhythmLaneStepExecutionFrameProbe = (
  args: AppStableRhythmLaneStepExecutionFrameProbeArgs,
): AppStableRhythmLaneStepExecutionFrameProbeResult => ({
  probeKind: 'app-stable-rhythm-lane-step-execution-frame-probe',
  frame: {
    plan: args.plan,
    params: args.params,
    cacheRefs: args.cacheRefs,
    readPorts: args.readPorts,
    actionPorts: args.actionPorts,
    stepLocals: args.stepLocals,
    drumStepVoiceValues: args.drumStepVoiceValues,
    bassStepVoiceValues: args.bassStepVoiceValues,
    schedulingStillBoundaryOwned: true,
    runtimeOwned: false,
  },
  transportStillAppOwned: true,
  nextAbsoluteStepStillAppOwned: true,
  staleGuardAlreadyPassed: true,
  schedulingStillBoundaryOwned: true,
  runtimeOwned: false,
});
