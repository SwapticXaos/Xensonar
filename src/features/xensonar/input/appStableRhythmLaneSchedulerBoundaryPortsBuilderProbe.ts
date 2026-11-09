import type {
  AppStableRhythmLaneSchedulerActionPorts,
  AppStableRhythmLaneSchedulerCacheRefs,
  AppStableRhythmLaneSchedulerReadPorts,
} from './appStableRhythmLaneSchedulerBoundaryPortsContractProbe';

export type AppStableRhythmLaneSchedulerBoundaryPortsBuilderProbeArgs =
  AppStableRhythmLaneSchedulerCacheRefs &
  AppStableRhythmLaneSchedulerReadPorts &
  AppStableRhythmLaneSchedulerActionPorts & {
    readonly boundaryPortsOnly: true;
    readonly transportStillAppOwned: true;
    readonly schedulerLoopStillAppOwned: true;
    readonly stepPlanningStillAppOwned: true;
  };

export type AppStableRhythmLaneSchedulerBoundaryPortsBuilderProbeResult = {
  readonly cacheRefs: AppStableRhythmLaneSchedulerCacheRefs;
  readonly readPorts: AppStableRhythmLaneSchedulerReadPorts;
  readonly actionPorts: AppStableRhythmLaneSchedulerActionPorts;
  readonly boundaryPortsOnly: true;
  readonly transportStillAppOwned: true;
  readonly schedulerLoopStillAppOwned: true;
  readonly stepPlanningStillAppOwned: true;
  readonly cacheWritesStillBoundaryOwned: true;
  readonly schedulingStillBoundaryOwned: true;
  readonly runtimeOwned: false;
};

export const buildAppStableRhythmLaneSchedulerBoundaryPortsProbe = (
  args: AppStableRhythmLaneSchedulerBoundaryPortsBuilderProbeArgs,
): AppStableRhythmLaneSchedulerBoundaryPortsBuilderProbeResult => ({
  cacheRefs: {
    rhythmForgeDrumPatternRef: args.rhythmForgeDrumPatternRef,
    rhythmForgeBassPatternRef: args.rhythmForgeBassPatternRef,
    rhythmForgeDrumBarIndexRef: args.rhythmForgeDrumBarIndexRef,
    rhythmForgeBassBarIndexRef: args.rhythmForgeBassBarIndexRef,
    rhythmForgeSeedRef: args.rhythmForgeSeedRef,
    psyBassPatternRef: args.psyBassPatternRef,
    psyBassBarIndexRef: args.psyBassBarIndexRef,
    bassClipPlaybackCacheRef: args.bassClipPlaybackCacheRef,
    bassClipBarRootRef: args.bassClipBarRootRef,
  },
  readPorts: {
    readDrumStyle: args.readDrumStyle,
    resolveCurrentBassRootHz: args.resolveCurrentBassRootHz,
    resolveGrooveState: args.resolveGrooveState,
    readQuantizeBpm: args.readQuantizeBpm,
    readMetronomeAudioNowSec: args.readMetronomeAudioNowSec,
    readBassClipById: args.readBassClipById,
  },
  actionPorts: {
    scheduleStableRhythmMetronomePulse: args.scheduleStableRhythmMetronomePulse,
    playBassNote: args.playBassNote,
    applyMyzelLayerStep: args.applyMyzelLayerStep,
  },
  boundaryPortsOnly: true,
  transportStillAppOwned: true,
  schedulerLoopStillAppOwned: true,
  stepPlanningStillAppOwned: true,
  cacheWritesStillBoundaryOwned: true,
  schedulingStillBoundaryOwned: true,
  runtimeOwned: false,
});
