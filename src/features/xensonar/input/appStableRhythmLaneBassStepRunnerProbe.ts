import { scheduleBassClipStep } from '../groove/bassPatternEvents';
import { scheduleClassicBassPatternStep } from '../groove/classicBassPatterns';
import { schedulePsyBassStep, scheduleRhythmForgeBassStep } from '../groove/groovePlaybackHelpers';
import { resolveAppBassClipRootBindingHelperProbe } from './appBassClipRootBindingHelperProbe';
import { resolveAppStableRhythmLaneSchedulerBassStepBranchProbe } from './appStableRhythmLaneSchedulerBassStepBranchClassifierProbe';
import { commitAppStableRhythmLaneBassClipRootBindingProbe } from './appStableRhythmLaneBassClipRootBindingCommitProbe';
import { commitAppStableRhythmLanePatternCacheCandidateProbe } from './appStableRhythmLanePatternCacheCommitProbe';
import { buildAppStableRhythmLaneQuantizedBassStepValuesProbe } from './appStableRhythmLaneQuantizedBassStepValuesProbe';
import { resolveAppPsyBassCacheHelperProbe } from './appPsyBassCacheHelperProbe';
import { buildAppPsyBassCacheRequestProbe } from './appPsyBassCacheRequestBuilderProbe';
import { resolveAppRhythmForgeBassCacheHelperProbe } from './appRhythmForgeBassCacheHelperProbe';
import { buildAppRhythmForgePatternCacheRequestProbe } from './appRhythmForgePatternCacheRequestBuilderProbe';
import type { AppStableRhythmLaneStepExecutionFrameProbe } from './appStableRhythmLaneStepExecutionFrameProbe';

export type AppStableRhythmLaneBassStepRunnerProbeArgs = {
  readonly frame: AppStableRhythmLaneStepExecutionFrameProbe;
};


export const runAppStableRhythmLaneBassStepProbe = (
  args: AppStableRhythmLaneBassStepRunnerProbeArgs,
): void => {
  const frame = args.frame;
  const p = frame.params;
  const { step, barIndex, root, grooveDescriptors, rhythmForgeBaseSwing, drumStyle } = frame.stepLocals;
  const bassValues = frame.bassStepVoiceValues;
  const cacheRefs = frame.cacheRefs;
  const bassStepBranch = resolveAppStableRhythmLaneSchedulerBassStepBranchProbe({
    bassActive: p.bassActive,
    bassPatternMode: p.bassPatternMode,
    bassClipId: p.bassClipId,
    bassPattern: p.bassPattern,
    schedulingStillBoundaryOwned: true,
  }).branch;
  const v = bassValues.bassLevel;

  switch (bassStepBranch.kind) {
    case 'inactive':
      return;
    case 'clip': {
      const bassClipRootBindingCandidate = resolveAppBassClipRootBindingHelperProbe({
        bassClipId: bassStepBranch.bassClipId,
        currentPlaybackCache: cacheRefs.bassClipPlaybackCacheRef.current,
        currentBarRoot: cacheRefs.bassClipBarRootRef.current,
        barIndex,
        rootHz: root,
        readBassClipById: frame.readPorts.readBassClipById,
      });
      const bassClipRootBindingCommit = commitAppStableRhythmLaneBassClipRootBindingProbe({
        candidate: bassClipRootBindingCandidate,
        playbackCacheRef: cacheRefs.bassClipPlaybackCacheRef,
        barRootRef: cacheRefs.bassClipBarRootRef,
        cacheMutationExplicitlyCommitted: true,
        schedulingStillBoundaryOwned: true,
        runtimeOwned: false,
      });
      const { clip, clipRootHz } = bassClipRootBindingCommit;
      if (clip) {
        const quantizedBassStepValues = buildAppStableRhythmLaneQuantizedBassStepValuesProbe({
          absoluteStep: frame.plan.absoluteStep,
          step16: step,
          timeSec: frame.plan.timeSec,
          bassLevel: v,
          rootHz: clipRootHz,
          readQuantizeBpm: frame.readPorts.readQuantizeBpm,
          schedulingStillBoundaryOwned: true,
          playBassNoteStillActionPortOwned: true,
        }).values;
        scheduleBassClipStep({
          clip,
          step: quantizedBassStepValues.absoluteStep,
          time: quantizedBassStepValues.timeSec,
          rootHz: quantizedBassStepValues.rootHz,
          bassLevel: quantizedBassStepValues.bassLevel,
          quantizeBpm: quantizedBassStepValues.quantizeBpm,
          playBassNote: frame.actionPorts.playBassNote,
        });
      }
      return;
    }
    case 'rhythmforge': {
      const rhythmForgeBassCacheRequest = buildAppRhythmForgePatternCacheRequestProbe({
        kind: 'bass',
        currentPattern: cacheRefs.rhythmForgeBassPatternRef.current,
        currentBarIndex: cacheRefs.rhythmForgeBassBarIndexRef.current,
        barIndex,
        seedBase: cacheRefs.rhythmForgeSeedRef.current,
        seedSalt: 0x51b3,
        rootHz: root,
        baseSwing: rhythmForgeBaseSwing,
        descriptors: grooveDescriptors,
        pattern: bassStepBranch.pattern,
        writerStillBoundaryOwned: true,
        schedulingStillBoundaryOwned: true,
      });
      const rhythmForgeBassCacheCandidate = resolveAppRhythmForgeBassCacheHelperProbe(rhythmForgeBassCacheRequest.request);
      const rhythmForgeBassCacheCommit = commitAppStableRhythmLanePatternCacheCandidateProbe({
        kind: 'rhythmforge-bass',
        candidate: rhythmForgeBassCacheCandidate,
        patternRef: cacheRefs.rhythmForgeBassPatternRef,
        barIndexRef: cacheRefs.rhythmForgeBassBarIndexRef,
        cacheMutationExplicitlyCommitted: true,
        schedulingStillBoundaryOwned: true,
        runtimeOwned: false,
      });
      const rhythmForgeBassPattern = rhythmForgeBassCacheCommit.pattern;
      if (rhythmForgeBassPattern) {
        const quantizedBassStepValues = buildAppStableRhythmLaneQuantizedBassStepValuesProbe({
          absoluteStep: frame.plan.absoluteStep,
          step16: step,
          timeSec: frame.plan.timeSec,
          bassLevel: v,
          rootHz: bassValues.rootHz,
          readQuantizeBpm: frame.readPorts.readQuantizeBpm,
          schedulingStillBoundaryOwned: true,
          playBassNoteStillActionPortOwned: true,
        }).values;
        scheduleRhythmForgeBassStep({
          pattern: rhythmForgeBassPattern,
          step: quantizedBassStepValues.step16,
          time: quantizedBassStepValues.timeSec,
          bassLevel: quantizedBassStepValues.bassLevel,
          quantizeBpm: quantizedBassStepValues.quantizeBpm,
          rootHz: quantizedBassStepValues.rootHz,
          playBassNote: frame.actionPorts.playBassNote,
        });
      }
      return;
    }
    case 'psybass': {
      const psyBassCacheRequest = buildAppPsyBassCacheRequestProbe({
        currentPattern: cacheRefs.psyBassPatternRef.current,
        currentBarIndex: cacheRefs.psyBassBarIndexRef.current,
        barIndex,
        pattern: bassStepBranch.pattern,
        seedBase: cacheRefs.rhythmForgeSeedRef.current,
        seedSalt: 0x9d31,
        rootHz: root,
        swing: drumStyle.swing,
        bassGrit: bassValues.bassGrit,
        descriptors: grooveDescriptors,
        writerStillBoundaryOwned: true,
        schedulingStillBoundaryOwned: true,
      });
      const psyBassCacheCandidate = resolveAppPsyBassCacheHelperProbe(psyBassCacheRequest.request);
      const psyBassCacheCommit = commitAppStableRhythmLanePatternCacheCandidateProbe({
        kind: 'psybass',
        candidate: psyBassCacheCandidate,
        patternRef: cacheRefs.psyBassPatternRef,
        barIndexRef: cacheRefs.psyBassBarIndexRef,
        cacheMutationExplicitlyCommitted: true,
        schedulingStillBoundaryOwned: true,
        runtimeOwned: false,
      });
      const psyBassPattern = psyBassCacheCommit.pattern;
      if (psyBassPattern) {
        const quantizedBassStepValues = buildAppStableRhythmLaneQuantizedBassStepValuesProbe({
          absoluteStep: frame.plan.absoluteStep,
          step16: step,
          timeSec: frame.plan.timeSec,
          bassLevel: v,
          rootHz: bassValues.rootHz,
          readQuantizeBpm: frame.readPorts.readQuantizeBpm,
          schedulingStillBoundaryOwned: true,
          playBassNoteStillActionPortOwned: true,
        }).values;
        schedulePsyBassStep({
          pattern: psyBassPattern,
          step: quantizedBassStepValues.step16,
          time: quantizedBassStepValues.timeSec,
          bassLevel: quantizedBassStepValues.bassLevel,
          quantizeBpm: quantizedBassStepValues.quantizeBpm,
          playBassNote: frame.actionPorts.playBassNote,
        });
      }
      return;
    }
    case 'classic':
      scheduleClassicBassPatternStep({
        pattern: bassStepBranch.pattern,
        step,
        time: frame.plan.timeSec,
        rootHz: bassValues.rootHz,
        bassLevel: v,
        stepMs: bassValues.stepDurationSec,
        playBassNote: frame.actionPorts.playBassNote,
      });
      return;
    default: {
      const exhaustive: never = bassStepBranch;
      return exhaustive;
    }
  }
};
