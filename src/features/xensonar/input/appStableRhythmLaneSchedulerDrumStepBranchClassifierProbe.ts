import type { DrumConfigEntry } from '../drumConfigLibraryTypes';
import type { DrumPattern } from '../domain/instrumentData';
import { isRhythmForgePattern } from '../rooms/resonanceRuntimeMath';

export type AppStableRhythmLaneSchedulerDrumStepBranch =
  | { readonly kind: 'inactive' }
  | { readonly kind: 'exported'; readonly entry: DrumConfigEntry }
  | { readonly kind: 'rhythmforge'; readonly pattern: DrumPattern }
  | { readonly kind: 'classic'; readonly pattern: DrumPattern };

export type AppStableRhythmLaneSchedulerDrumStepBranchClassifierProbeArgs = {
  readonly drumActive: boolean;
  readonly drumConfigMode: 'preset' | 'exported';
  readonly selectedExportedDrumConfig: DrumConfigEntry | null;
  readonly drumPattern: DrumPattern;
  readonly schedulingStillBoundaryOwned: true;
};

export type AppStableRhythmLaneSchedulerDrumStepBranchClassifierProbeResult = {
  readonly probeKind: 'app-stable-rhythm-lane-scheduler-drum-step-branch-classifier-probe';
  readonly branch: AppStableRhythmLaneSchedulerDrumStepBranch;
  readonly schedulingStillBoundaryOwned: true;
  readonly cacheWritesStillBoundaryOwned: true;
  readonly audioOwned: false;
  readonly runtimeOwned: false;
};

export const resolveAppStableRhythmLaneSchedulerDrumStepBranchProbe = (
  args: AppStableRhythmLaneSchedulerDrumStepBranchClassifierProbeArgs,
): AppStableRhythmLaneSchedulerDrumStepBranchClassifierProbeResult => {
  if (!args.drumActive) {
    return {
      probeKind: 'app-stable-rhythm-lane-scheduler-drum-step-branch-classifier-probe',
      branch: { kind: 'inactive' },
      schedulingStillBoundaryOwned: true,
      cacheWritesStillBoundaryOwned: true,
      audioOwned: false,
      runtimeOwned: false,
    };
  }

  if (args.drumConfigMode === 'exported' && args.selectedExportedDrumConfig) {
    return {
      probeKind: 'app-stable-rhythm-lane-scheduler-drum-step-branch-classifier-probe',
      branch: { kind: 'exported', entry: args.selectedExportedDrumConfig },
      schedulingStillBoundaryOwned: true,
      cacheWritesStillBoundaryOwned: true,
      audioOwned: false,
      runtimeOwned: false,
    };
  }

  if (isRhythmForgePattern(args.drumPattern)) {
    return {
      probeKind: 'app-stable-rhythm-lane-scheduler-drum-step-branch-classifier-probe',
      branch: { kind: 'rhythmforge', pattern: args.drumPattern },
      schedulingStillBoundaryOwned: true,
      cacheWritesStillBoundaryOwned: true,
      audioOwned: false,
      runtimeOwned: false,
    };
  }

  return {
    probeKind: 'app-stable-rhythm-lane-scheduler-drum-step-branch-classifier-probe',
    branch: { kind: 'classic', pattern: args.drumPattern },
    schedulingStillBoundaryOwned: true,
    cacheWritesStillBoundaryOwned: true,
    audioOwned: false,
    runtimeOwned: false,
  };
};
