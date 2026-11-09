import type { AppStableRhythmLaneStepExecutionFrameProbe } from './appStableRhythmLaneStepExecutionFrameProbe';

export type AppStableRhythmLaneMyzelStepRunnerProbeArgs = {
  readonly frame: AppStableRhythmLaneStepExecutionFrameProbe;
};


export const runAppStableRhythmLaneMyzelStepProbe = (
  args: AppStableRhythmLaneMyzelStepRunnerProbeArgs,
): void => {
  args.frame.actionPorts.applyMyzelLayerStep(args.frame.plan.timeSec, args.frame.plan.step16);
};
