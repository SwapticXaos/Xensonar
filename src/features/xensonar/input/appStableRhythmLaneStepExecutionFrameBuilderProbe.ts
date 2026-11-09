import type { AppNexusParams } from '../rooms/nexusParamsInitialState';
import type { StableRhythmLaneStepPlan } from '../audio/stableRhythmLane';
import { sanitizeDrumLaneKitOverrides } from '../groove/drumKitRouting';
import type {
  AppStableRhythmLaneSchedulerActionPorts,
  AppStableRhythmLaneSchedulerCacheRefs,
  AppStableRhythmLaneSchedulerReadPorts,
} from './appStableRhythmLaneSchedulerBoundaryPortsContractProbe';
import { buildAppStableRhythmLaneSchedulerPrestepContext } from './appStableRhythmLaneSchedulerPrestepContextArgBuilderProbe';
import { buildAppStableRhythmLaneSchedulerStepLocalsProbe } from './appStableRhythmLaneSchedulerStepLocalsBuilderProbe';
import {
  buildAppStableRhythmLaneSchedulerBassStepVoiceValuesProbe,
  buildAppStableRhythmLaneSchedulerDrumStepVoiceValuesProbe,
} from './appStableRhythmLaneSchedulerStepVoiceValuesBuilderProbe';
import {
  buildAppStableRhythmLaneStepExecutionFrameProbe,
  type AppStableRhythmLaneStepExecutionFrameProbe,
} from './appStableRhythmLaneStepExecutionFrameProbe';

export type AppStableRhythmLaneStepExecutionFrameBuilderProbeArgs = {
  readonly stationaryPlan: StableRhythmLaneStepPlan;
  readonly params: AppNexusParams;
  readonly stepDurationSec: number;
  readonly cacheRefs: AppStableRhythmLaneSchedulerCacheRefs;
  readonly readPorts: AppStableRhythmLaneSchedulerReadPorts;
  readonly actionPorts: AppStableRhythmLaneSchedulerActionPorts;
  readonly transportStillAppOwned: true;
  readonly nextAbsoluteStepStillAppOwned: true;
  readonly staleGuardAlreadyPassed: true;
  readonly schedulingStillBoundaryOwned: true;
  readonly runtimeOwned: false;
};

export type AppStableRhythmLaneStepExecutionFrameBuilderProbeResult = {
  readonly probeKind: 'app-stable-rhythm-lane-step-execution-frame-builder-probe';
  readonly frame: AppStableRhythmLaneStepExecutionFrameProbe;
  readonly transportStillAppOwned: true;
  readonly nextAbsoluteStepStillAppOwned: true;
  readonly staleGuardAlreadyPassed: true;
  readonly schedulingStillBoundaryOwned: true;
  readonly runtimeOwned: false;
};

export const buildAppStableRhythmLaneStepExecutionFrameFromBoundaryProbe = (
  args: AppStableRhythmLaneStepExecutionFrameBuilderProbeArgs,
): AppStableRhythmLaneStepExecutionFrameBuilderProbeResult => {
  const p = args.params;
  const stableRhythmLaneSchedulerPrestepContext = buildAppStableRhythmLaneSchedulerPrestepContext({
    step: args.stationaryPlan.step16,
    barIndex: args.stationaryPlan.barIndex,
    drumStyle: args.readPorts.readDrumStyle(),
    drumLaneKitOverrides: sanitizeDrumLaneKitOverrides(p.drumLaneKits),
    root: args.readPorts.resolveCurrentBassRootHz(),
    groove: args.readPorts.resolveGrooveState(args.stationaryPlan.timeSec),
  });
  const stableRhythmLaneSchedulerStepLocals = buildAppStableRhythmLaneSchedulerStepLocalsProbe(stableRhythmLaneSchedulerPrestepContext);
  const { drumStyle, drumLaneKitOverrides, root } = stableRhythmLaneSchedulerStepLocals.locals;
  const stableRhythmLaneSchedulerDrumStepVoiceValues = buildAppStableRhythmLaneSchedulerDrumStepVoiceValuesProbe({
    drumLevel: p.drumVolume,
    drumKit: p.drumKit,
    drumStyle,
    drumLaneKitOverrides,
    stepDurationSec: args.stepDurationSec,
    schedulingStillBoundaryOwned: true,
  }).values;
  const stableRhythmLaneSchedulerBassStepVoiceValues = buildAppStableRhythmLaneSchedulerBassStepVoiceValuesProbe({
    bassLevel: p.bassVolume,
    bassGrit: p.bassGrit,
    rootHz: root,
    stepDurationSec: args.stepDurationSec,
    schedulingStillBoundaryOwned: true,
  }).values;

  return {
    probeKind: 'app-stable-rhythm-lane-step-execution-frame-builder-probe',
    frame: buildAppStableRhythmLaneStepExecutionFrameProbe({
      plan: args.stationaryPlan,
      params: p,
      cacheRefs: args.cacheRefs,
      readPorts: args.readPorts,
      actionPorts: args.actionPorts,
      stepLocals: stableRhythmLaneSchedulerStepLocals.locals,
      drumStepVoiceValues: stableRhythmLaneSchedulerDrumStepVoiceValues,
      bassStepVoiceValues: stableRhythmLaneSchedulerBassStepVoiceValues,
      schedulingStillBoundaryOwned: true,
      runtimeOwned: false,
    }).frame,
    transportStillAppOwned: true,
    nextAbsoluteStepStillAppOwned: true,
    staleGuardAlreadyPassed: true,
    schedulingStillBoundaryOwned: true,
    runtimeOwned: false,
  };
};
