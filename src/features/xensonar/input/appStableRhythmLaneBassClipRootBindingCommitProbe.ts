import type {
  AppBassClipBarRootBinding,
  AppBassClipPlaybackCache,
  AppBassClipRootBindingHelperProbeResult,
} from './appBassClipRootBindingHelperProbe';

export type AppStableRhythmLaneBassClipRootBindingCommitPlaybackCacheRef = {
  current: AppBassClipPlaybackCache;
};

export type AppStableRhythmLaneBassClipRootBindingCommitBarRootRef = {
  current: AppBassClipBarRootBinding;
};

export type AppStableRhythmLaneBassClipRootBindingCommitProbeArgs = {
  readonly candidate: AppBassClipRootBindingHelperProbeResult;
  readonly playbackCacheRef: AppStableRhythmLaneBassClipRootBindingCommitPlaybackCacheRef;
  readonly barRootRef: AppStableRhythmLaneBassClipRootBindingCommitBarRootRef;
  readonly cacheMutationExplicitlyCommitted: true;
  readonly schedulingStillBoundaryOwned: true;
  readonly runtimeOwned: false;
};

export type AppStableRhythmLaneBassClipRootBindingCommitProbeResult = Pick<
  AppBassClipRootBindingHelperProbeResult,
  'clip' | 'clipRootHz' | 'rootBinding' | 'nextPlaybackCache' | 'nextBarRoot'
> & {
  readonly playbackCacheWritePerformed: boolean;
  readonly barRootWritePerformed: boolean;
  readonly cacheMutationExplicitlyCommitted: true;
  readonly schedulingStillBoundaryOwned: true;
  readonly runtimeOwned: false;
};

export const commitAppStableRhythmLaneBassClipRootBindingProbe = (
  args: AppStableRhythmLaneBassClipRootBindingCommitProbeArgs,
): AppStableRhythmLaneBassClipRootBindingCommitProbeResult => {
  if (args.candidate.playbackCacheWriteRequired) {
    args.playbackCacheRef.current = args.candidate.nextPlaybackCache;
  }
  if (args.candidate.barRootWriteRequired) {
    args.barRootRef.current = args.candidate.nextBarRoot;
  }

  return {
    clip: args.candidate.clip,
    clipRootHz: args.candidate.clipRootHz,
    rootBinding: args.candidate.rootBinding,
    nextPlaybackCache: args.candidate.nextPlaybackCache,
    nextBarRoot: args.candidate.nextBarRoot,
    playbackCacheWritePerformed: args.candidate.playbackCacheWriteRequired,
    barRootWritePerformed: args.candidate.barRootWriteRequired,
    cacheMutationExplicitlyCommitted: true,
    schedulingStillBoundaryOwned: true,
    runtimeOwned: false,
  };
};
