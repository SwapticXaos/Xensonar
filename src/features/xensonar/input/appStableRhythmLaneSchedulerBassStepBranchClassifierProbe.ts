import type { BassPattern } from '../domain/instrumentData';
import { isPsyBassPattern, isRhythmForgePattern } from '../rooms/resonanceRuntimeMath';

export type AppStableRhythmLaneSchedulerBassStepBranch =
  | { readonly kind: 'inactive' }
  | { readonly kind: 'clip'; readonly bassClipId: string }
  | { readonly kind: 'rhythmforge'; readonly pattern: BassPattern }
  | { readonly kind: 'psybass'; readonly pattern: BassPattern }
  | { readonly kind: 'classic'; readonly pattern: BassPattern };

export type AppStableRhythmLaneSchedulerBassStepBranchClassifierProbeArgs = {
  readonly bassActive: boolean;
  readonly bassPatternMode: 'preset' | 'clip';
  readonly bassClipId: string;
  readonly bassPattern: BassPattern;
  readonly schedulingStillBoundaryOwned: true;
};

export type AppStableRhythmLaneSchedulerBassStepBranchClassifierProbeResult = {
  readonly probeKind: 'app-stable-rhythm-lane-scheduler-bass-step-branch-classifier-probe';
  readonly branch: AppStableRhythmLaneSchedulerBassStepBranch;
  readonly schedulingStillBoundaryOwned: true;
  readonly cacheWritesStillBoundaryOwned: true;
  readonly audioOwned: false;
  readonly runtimeOwned: false;
};

export const resolveAppStableRhythmLaneSchedulerBassStepBranchProbe = (
  args: AppStableRhythmLaneSchedulerBassStepBranchClassifierProbeArgs,
): AppStableRhythmLaneSchedulerBassStepBranchClassifierProbeResult => {
  if (!args.bassActive) {
    return {
      probeKind: 'app-stable-rhythm-lane-scheduler-bass-step-branch-classifier-probe',
      branch: { kind: 'inactive' },
      schedulingStillBoundaryOwned: true,
      cacheWritesStillBoundaryOwned: true,
      audioOwned: false,
      runtimeOwned: false,
    };
  }

  if (args.bassPatternMode === 'clip' && args.bassClipId) {
    return {
      probeKind: 'app-stable-rhythm-lane-scheduler-bass-step-branch-classifier-probe',
      branch: { kind: 'clip', bassClipId: args.bassClipId },
      schedulingStillBoundaryOwned: true,
      cacheWritesStillBoundaryOwned: true,
      audioOwned: false,
      runtimeOwned: false,
    };
  }

  if (isRhythmForgePattern(args.bassPattern)) {
    return {
      probeKind: 'app-stable-rhythm-lane-scheduler-bass-step-branch-classifier-probe',
      branch: { kind: 'rhythmforge', pattern: args.bassPattern },
      schedulingStillBoundaryOwned: true,
      cacheWritesStillBoundaryOwned: true,
      audioOwned: false,
      runtimeOwned: false,
    };
  }

  if (isPsyBassPattern(args.bassPattern)) {
    return {
      probeKind: 'app-stable-rhythm-lane-scheduler-bass-step-branch-classifier-probe',
      branch: { kind: 'psybass', pattern: args.bassPattern },
      schedulingStillBoundaryOwned: true,
      cacheWritesStillBoundaryOwned: true,
      audioOwned: false,
      runtimeOwned: false,
    };
  }

  return {
    probeKind: 'app-stable-rhythm-lane-scheduler-bass-step-branch-classifier-probe',
    branch: { kind: 'classic', pattern: args.bassPattern },
    schedulingStillBoundaryOwned: true,
    cacheWritesStillBoundaryOwned: true,
    audioOwned: false,
    runtimeOwned: false,
  };
};
