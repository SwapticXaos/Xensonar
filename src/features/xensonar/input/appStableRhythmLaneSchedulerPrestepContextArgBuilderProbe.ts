import type { DrumStyle } from '../../resonance/drumMachine';
import type { GrooveState } from '../../resonance/rhythmforge/types';
import type { StableRhythmLaneStepPlan } from '../audio/stableRhythmLane';
import type { DrumLaneKitOverrides } from '../groove/drumKitRoutingTypes';

export type AppStableRhythmLaneSchedulerPrestepContextArgs = {
  readonly step: StableRhythmLaneStepPlan['step16'];
  readonly barIndex: StableRhythmLaneStepPlan['barIndex'];
  readonly drumStyle: DrumStyle;
  readonly drumLaneKitOverrides: DrumLaneKitOverrides;
  readonly root: number;
  readonly groove: GrooveState;
};

export type AppStableRhythmLaneSchedulerPrestepContextArgBuilderProbe = {
  readonly probeKind: 'app-stable-rhythm-lane-scheduler-prestep-context-arg-builder-probe';
  readonly context: AppStableRhythmLaneSchedulerPrestepContextArgs;
  readonly schedulerLoopStillInlineInApp: true;
  readonly prestepContextCallsiteStillInlineInApp: true;
  readonly staleGuardAlreadyPassed: true;
  readonly actionPortClosuresStillInlineInApp: true;
  readonly nextAbsoluteStepOwnerStillApp: true;
  readonly runtimeOwned: false;
  readonly audioOwned: false;
  readonly schedulingOwned: false;
  readonly provenance: {
    readonly stationaryPlanOwnerStillApp: true;
    readonly stepAndBarIndexReadAfterStaleGuard: true;
    readonly drumStyleReadPerStep: true;
    readonly drumLaneKitOverridesSanitizedPerStep: true;
    readonly rootResolvedPerStep: true;
    readonly grooveResolvedWithNextNoteTime: true;
  };
};

export const buildAppStableRhythmLaneSchedulerPrestepContextArgs = (input: {
  readonly context: AppStableRhythmLaneSchedulerPrestepContextArgs;
  readonly staleGuardAlreadyPassed: true;
  readonly schedulerLoopStillInlineInApp: true;
  readonly actionPortClosuresStillInlineInApp: true;
  readonly provenance: AppStableRhythmLaneSchedulerPrestepContextArgBuilderProbe['provenance'];
}): AppStableRhythmLaneSchedulerPrestepContextArgBuilderProbe => ({
  probeKind: 'app-stable-rhythm-lane-scheduler-prestep-context-arg-builder-probe',
  context: input.context,
  schedulerLoopStillInlineInApp: input.schedulerLoopStillInlineInApp,
  prestepContextCallsiteStillInlineInApp: true,
  staleGuardAlreadyPassed: input.staleGuardAlreadyPassed,
  actionPortClosuresStillInlineInApp: input.actionPortClosuresStillInlineInApp,
  nextAbsoluteStepOwnerStillApp: true,
  runtimeOwned: false,
  audioOwned: false,
  schedulingOwned: false,
  provenance: input.provenance,
});

export const buildAppStableRhythmLaneSchedulerPrestepContext = (
  context: AppStableRhythmLaneSchedulerPrestepContextArgs,
): AppStableRhythmLaneSchedulerPrestepContextArgBuilderProbe =>
  buildAppStableRhythmLaneSchedulerPrestepContextArgs({
    staleGuardAlreadyPassed: true,
    schedulerLoopStillInlineInApp: true,
    actionPortClosuresStillInlineInApp: true,
    context,
    provenance: {
      stationaryPlanOwnerStillApp: true,
      stepAndBarIndexReadAfterStaleGuard: true,
      drumStyleReadPerStep: true,
      drumLaneKitOverridesSanitizedPerStep: true,
      rootResolvedPerStep: true,
      grooveResolvedWithNextNoteTime: true,
    },
  });

