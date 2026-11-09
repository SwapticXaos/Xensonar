export type AppStableRhythmLanePatternCacheCommitKind = 'rhythmforge-drum' | 'rhythmforge-bass' | 'psybass';

export type AppStableRhythmLanePatternCacheCommitPatternRef<TPattern> = {
  current: TPattern | null;
};

export type AppStableRhythmLanePatternCacheCommitBarIndexRef = {
  current: number;
};

export type AppStableRhythmLanePatternCacheCommitCandidate<TPattern> = {
  readonly pattern: TPattern | null;
  readonly nextPattern: TPattern | null;
  readonly nextBarIndex: number;
  readonly cacheWriteRequired: boolean;
};

export type AppStableRhythmLanePatternCacheCommitProbeArgs<TPattern, Kind extends AppStableRhythmLanePatternCacheCommitKind = AppStableRhythmLanePatternCacheCommitKind> = {
  readonly kind: Kind;
  readonly candidate: AppStableRhythmLanePatternCacheCommitCandidate<TPattern>;
  readonly patternRef: AppStableRhythmLanePatternCacheCommitPatternRef<TPattern>;
  readonly barIndexRef: AppStableRhythmLanePatternCacheCommitBarIndexRef;
  readonly cacheMutationExplicitlyCommitted: true;
  readonly schedulingStillBoundaryOwned: true;
  readonly runtimeOwned: false;
};

export type AppStableRhythmLanePatternCacheCommitProbeResult<TPattern, Kind extends AppStableRhythmLanePatternCacheCommitKind = AppStableRhythmLanePatternCacheCommitKind> = {
  readonly kind: Kind;
  readonly pattern: TPattern | null;
  readonly cacheWritePerformed: boolean;
  readonly nextBarIndex: number;
  readonly cacheMutationExplicitlyCommitted: true;
  readonly schedulingStillBoundaryOwned: true;
  readonly runtimeOwned: false;
};

export const commitAppStableRhythmLanePatternCacheCandidateProbe = <TPattern, Kind extends AppStableRhythmLanePatternCacheCommitKind>(
  args: AppStableRhythmLanePatternCacheCommitProbeArgs<TPattern, Kind>,
): AppStableRhythmLanePatternCacheCommitProbeResult<TPattern, Kind> => {
  if (args.candidate.cacheWriteRequired) {
    args.patternRef.current = args.candidate.nextPattern;
    args.barIndexRef.current = args.candidate.nextBarIndex;
  }

  return {
    kind: args.kind,
    pattern: args.candidate.pattern,
    cacheWritePerformed: args.candidate.cacheWriteRequired,
    nextBarIndex: args.candidate.nextBarIndex,
    cacheMutationExplicitlyCommitted: true,
    schedulingStillBoundaryOwned: true,
    runtimeOwned: false,
  };
};
