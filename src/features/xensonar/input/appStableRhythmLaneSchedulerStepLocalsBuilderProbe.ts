import type { DrumStyle } from '../../resonance/drumMachine';
import type { GrooveDescriptorVector, GrooveState } from '../../resonance/rhythmforge/types';
import type { StableRhythmLaneStepPlan } from '../audio/stableRhythmLane';
import type { DrumLaneKitOverrides } from '../groove/drumKitRoutingTypes';
import type { AppStableRhythmLaneSchedulerPrestepContextArgBuilderProbe } from './appStableRhythmLaneSchedulerPrestepContextArgBuilderProbe';

export type AppStableRhythmLaneSchedulerStepLocals = {
  readonly step: StableRhythmLaneStepPlan['step16'];
  readonly barIndex: StableRhythmLaneStepPlan['barIndex'];
  readonly drumStyle: DrumStyle;
  readonly drumLaneKitOverrides: DrumLaneKitOverrides;
  readonly root: number;
  readonly groove: GrooveState;
  readonly grooveDescriptors: GrooveDescriptorVector;
  readonly rhythmForgeBaseSwing: number;
};

export type AppStableRhythmLaneSchedulerStepLocalsBuilderProbeResult = {
  readonly probeKind: 'app-stable-rhythm-lane-scheduler-step-locals-builder-probe';
  readonly locals: AppStableRhythmLaneSchedulerStepLocals;
  readonly preStepContextStillBoundaryOwned: true;
  readonly cacheRequestsStillBoundaryOwned: true;
  readonly cacheWritesStillBoundaryOwned: true;
  readonly schedulingStillBoundaryOwned: true;
  readonly runtimeOwned: false;
  readonly audioOwned: false;
};

export const buildAppStableRhythmLaneSchedulerStepLocalsProbe = (
  prestepContext: AppStableRhythmLaneSchedulerPrestepContextArgBuilderProbe,
): AppStableRhythmLaneSchedulerStepLocalsBuilderProbeResult => {
  const { step, barIndex, drumStyle, drumLaneKitOverrides, root, groove } = prestepContext.context;
  return {
    probeKind: 'app-stable-rhythm-lane-scheduler-step-locals-builder-probe',
    locals: {
      step,
      barIndex,
      drumStyle,
      drumLaneKitOverrides,
      root,
      groove,
      grooveDescriptors: groove.descriptors,
      rhythmForgeBaseSwing: 0.04 + drumStyle.swing * 0.1,
    },
    preStepContextStillBoundaryOwned: true,
    cacheRequestsStillBoundaryOwned: true,
    cacheWritesStillBoundaryOwned: true,
    schedulingStillBoundaryOwned: true,
    runtimeOwned: false,
    audioOwned: false,
  };
};
