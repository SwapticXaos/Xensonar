import type { AudioTimeContext } from "../../../core/time/unifiedTime";
import type { StableRhythmLaneActionPort } from "../audio/stableRhythmLane";

export type AppStableRhythmLaneSchedulerTimeWindowArgs = {
  readonly audioCtx: AudioTimeContext;
  readonly bpm: number;
  readonly nextStep?: number | null;
  readonly minAheadSec?: number;
  readonly targetHorizonSec?: number;
  readonly maxStepsPerTick?: number;
};

export type AppStableRhythmLaneSchedulerStepPlanArgs = {
  readonly absoluteStep: number;
  readonly timeSec: number;
  readonly stepDurationSec: number;
  readonly audioNowSec: number;
  readonly minAheadSec?: number;
};

export type AppStableRhythmLaneSchedulerCallsiteSource = {
  readonly probeKind: "app-stable-rhythm-lane-scheduler-callsite-source-probe";
  readonly callsiteOwnerStillApp: true;
  readonly schedulerLoopStillInlineInApp: true;
  readonly timeoutOwnerStillAppEffect: true;
  readonly actionPortClosuresStillInlineInApp: true;
  readonly nextAbsoluteStepOwnerStillApp: true;
  readonly runtimeOwned: false;
  readonly audioOwned: false;
  readonly schedulingOwned: false;
  readonly effectGate: {
    readonly audioCtx: AudioTimeContext;
    readonly nexusActive: boolean;
    readonly sourceOwnerStillApp: true;
  };
  readonly timeWindowArgs: AppStableRhythmLaneSchedulerTimeWindowArgs;
  readonly tickConfig: {
    readonly timerIntervalMs: 25;
  };
  readonly transportProvenance: {
    readonly nextAbsoluteStepReadOwnerStillApp: true;
    readonly nextAbsoluteStepWriteOwnerStillApp: true;
    readonly prefillWindowOwnerStillApp: true;
  };
  readonly actionPortProvenance: {
    readonly actionPortOwnerStillApp: true;
    readonly drumSchedulingClosuresStillInlineInApp: true;
    readonly bassSchedulingClosuresStillInlineInApp: true;
    readonly myzelSchedulingClosureStillInlineInApp: true;
    readonly metronomeSchedulingClosureStillInlineInApp: true;
  };
};

export const buildAppStableRhythmLaneSchedulerCallsiteSource = (
  source: Omit<
    AppStableRhythmLaneSchedulerCallsiteSource,
    | "probeKind"
    | "callsiteOwnerStillApp"
    | "schedulerLoopStillInlineInApp"
    | "timeoutOwnerStillAppEffect"
    | "actionPortClosuresStillInlineInApp"
    | "nextAbsoluteStepOwnerStillApp"
    | "runtimeOwned"
    | "audioOwned"
    | "schedulingOwned"
  >,
): AppStableRhythmLaneSchedulerCallsiteSource => ({
  probeKind: "app-stable-rhythm-lane-scheduler-callsite-source-probe",
  callsiteOwnerStillApp: true,
  schedulerLoopStillInlineInApp: true,
  timeoutOwnerStillAppEffect: true,
  actionPortClosuresStillInlineInApp: true,
  nextAbsoluteStepOwnerStillApp: true,
  runtimeOwned: false,
  audioOwned: false,
  schedulingOwned: false,
  ...source,
});

export const buildAppStableRhythmLaneSchedulerStepPlanArgs = (
  args: AppStableRhythmLaneSchedulerStepPlanArgs,
): AppStableRhythmLaneSchedulerStepPlanArgs => args;

export const buildAppStableRhythmLaneSchedulerActionPort = (input: {
  readonly actionPort: StableRhythmLaneActionPort;
  readonly actionPortOwnerStillApp: true;
  readonly schedulerLoopStillInlineInApp: true;
}): StableRhythmLaneActionPort => input.actionPort;

export const buildAppStableRhythmLaneSchedulerCompactCallsiteSource = (input: {
  readonly audioCtx: AudioTimeContext;
  readonly nexusActive: boolean;
  readonly bpm: number;
  readonly nextStep?: number | null;
}): AppStableRhythmLaneSchedulerCallsiteSource =>
  buildAppStableRhythmLaneSchedulerCallsiteSource({
    effectGate: {
      audioCtx: input.audioCtx,
      nexusActive: input.nexusActive,
      sourceOwnerStillApp: true,
    },
    timeWindowArgs: {
      audioCtx: input.audioCtx,
      bpm: input.bpm,
      nextStep: input.nextStep,
      minAheadSec: 0.02,
      maxStepsPerTick: 12,
    },
    tickConfig: {
      timerIntervalMs: 25,
    },
    transportProvenance: {
      nextAbsoluteStepReadOwnerStillApp: true,
      nextAbsoluteStepWriteOwnerStillApp: true,
      prefillWindowOwnerStillApp: true,
    },
    actionPortProvenance: {
      actionPortOwnerStillApp: true,
      drumSchedulingClosuresStillInlineInApp: true,
      bassSchedulingClosuresStillInlineInApp: true,
      myzelSchedulingClosureStillInlineInApp: true,
      metronomeSchedulingClosureStillInlineInApp: true,
    },
  });

export const buildAppStableRhythmLaneSchedulerInlineActionPort = (
  actionPort: StableRhythmLaneActionPort,
): StableRhythmLaneActionPort =>
  buildAppStableRhythmLaneSchedulerActionPort({
    actionPortOwnerStillApp: true,
    schedulerLoopStillInlineInApp: true,
    actionPort,
  });

