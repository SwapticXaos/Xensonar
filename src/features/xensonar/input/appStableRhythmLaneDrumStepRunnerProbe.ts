import type { DrumMachine } from '../../resonance/drumMachine';
import type { DrumConfigEntry } from '../drumConfigLibraryTypes';
import { scheduleExportedDrumConfigStep, scheduleRhythmForgeDrumStep } from '../groove/groovePlaybackHelpers';
import { resolveAppStableRhythmLaneSchedulerDrumStepBranchProbe } from './appStableRhythmLaneSchedulerDrumStepBranchClassifierProbe';
import { commitAppStableRhythmLanePatternCacheCandidateProbe } from './appStableRhythmLanePatternCacheCommitProbe';
import { resolveAppRhythmForgeDrumCacheHelperProbe } from './appRhythmForgeDrumCacheHelperProbe';
import { buildAppRhythmForgePatternCacheRequestProbe } from './appRhythmForgePatternCacheRequestBuilderProbe';
import type { AppStableRhythmLaneStepExecutionFrameProbe } from './appStableRhythmLaneStepExecutionFrameProbe';

export type AppStableRhythmLaneDrumStepRunnerProbeArgs = {
  readonly frame: AppStableRhythmLaneStepExecutionFrameProbe;
  readonly selectedExportedDrumConfig: DrumConfigEntry | null;
  readonly drumMachine: DrumMachine;
};


export const runAppStableRhythmLaneDrumStepProbe = (
  args: AppStableRhythmLaneDrumStepRunnerProbeArgs,
): void => {
  const frame = args.frame;
  const p = frame.params;
  const { step, barIndex, root, grooveDescriptors, rhythmForgeBaseSwing } = frame.stepLocals;
  const drumValues = frame.drumStepVoiceValues;
  const cacheRefs = frame.cacheRefs;
  const drumStepBranch = resolveAppStableRhythmLaneSchedulerDrumStepBranchProbe({
    drumActive: p.drumActive,
    drumConfigMode: p.drumConfigMode,
    selectedExportedDrumConfig: args.selectedExportedDrumConfig,
    drumPattern: p.drumPattern,
    schedulingStillBoundaryOwned: true,
  }).branch;

  switch (drumStepBranch.kind) {
    case 'inactive':
      return;
    case 'exported':
      scheduleExportedDrumConfigStep({
        drumMachine: args.drumMachine,
        entry: drumStepBranch.entry,
        stepIndex: frame.plan.absoluteStep,
        time: frame.plan.timeSec,
        stepDurationSec: drumValues.stepDurationSec,
        drumLevel: drumValues.drumLevel,
        drumStyle: drumValues.drumStyle,
        runtimeGlobalKit: drumValues.drumKit,
        laneKitOverrides: drumValues.drumLaneKitOverrides,
      });
      return;
    case 'rhythmforge': {
      const rhythmForgeDrumCacheRequest = buildAppRhythmForgePatternCacheRequestProbe({
        kind: 'drum',
        currentPattern: cacheRefs.rhythmForgeDrumPatternRef.current,
        currentBarIndex: cacheRefs.rhythmForgeDrumBarIndexRef.current,
        barIndex,
        seedBase: cacheRefs.rhythmForgeSeedRef.current,
        seedSalt: 0x1f17,
        rootHz: root,
        baseSwing: rhythmForgeBaseSwing,
        descriptors: grooveDescriptors,
        pattern: drumStepBranch.pattern,
        writerStillBoundaryOwned: true,
        schedulingStillBoundaryOwned: true,
      });
      const rhythmForgeDrumCacheCandidate = resolveAppRhythmForgeDrumCacheHelperProbe(rhythmForgeDrumCacheRequest.request);
      const rhythmForgeDrumCacheCommit = commitAppStableRhythmLanePatternCacheCandidateProbe({
        kind: 'rhythmforge-drum',
        candidate: rhythmForgeDrumCacheCandidate,
        patternRef: cacheRefs.rhythmForgeDrumPatternRef,
        barIndexRef: cacheRefs.rhythmForgeDrumBarIndexRef,
        cacheMutationExplicitlyCommitted: true,
        schedulingStillBoundaryOwned: true,
        runtimeOwned: false,
      });
      const rhythmForgeDrumPattern = rhythmForgeDrumCacheCommit.pattern;
      if (rhythmForgeDrumPattern) {
        scheduleRhythmForgeDrumStep({
          drumMachine: args.drumMachine,
          pattern: rhythmForgeDrumPattern,
          step,
          time: frame.plan.timeSec,
          drumLevel: drumValues.drumLevel,
          kit: drumValues.drumKit,
          drumStyle: drumValues.drumStyle,
          laneKitOverrides: drumValues.drumLaneKitOverrides,
        });
      }
      return;
    }
    case 'classic':
      args.drumMachine.schedulePattern(
        drumStepBranch.pattern,
        step,
        frame.plan.timeSec,
        drumValues.drumLevel,
        drumValues.drumKit,
        drumValues.drumStyle,
        drumValues.drumLaneKitOverrides,
      );
      return;
    default: {
      const exhaustive: never = drumStepBranch;
      return exhaustive;
    }
  }
};
