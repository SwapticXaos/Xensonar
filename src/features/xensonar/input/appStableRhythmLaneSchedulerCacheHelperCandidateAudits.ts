type StableRhythmLaneSchedulerCacheHelperCandidateKey =
  | 'rhythm-forge-drum-cache-helper-candidate'
  | 'bass-clip-root-binding-cache-helper-candidate';

type StableRhythmLaneSchedulerCacheHelperCandidateOrder = 1 | 2;

type StableRhythmLaneSchedulerCacheHelperCandidateRefKey =
  | 'rhythmForgeDrumPatternRef.current'
  | 'rhythmForgeDrumBarIndexRef.current'
  | 'bassClipPlaybackCacheRef.current'
  | 'bassClipBarRootRef.current';

type StableRhythmLaneSchedulerCacheHelperCandidateInputKey =
  | 'stationaryPlan.step16'
  | 'stationaryPlan.barIndex'
  | 'plan.absoluteStep'
  | 'plan.timeSec'
  | 'stepMs'
  | 'root'
  | 'drumStyle'
  | 'drumLaneKitOverrides'
  | 'groove.descriptors'
  | 'p.drumActive'
  | 'p.drumConfigMode'
  | 'p.drumPattern'
  | 'p.drumVolume'
  | 'p.drumKit'
  | 'p.bassActive'
  | 'p.bassPatternMode'
  | 'p.bassClipId'
  | 'p.bassVolume'
  | 'nexusParamsRef.current.quantizeBpm'
  | 'rhythmForgeSeedRef.current'
  | 'selectedExportedDrumConfig'
  | 'drumMachine'
  | 'playBassNote';

type StableRhythmLaneSchedulerCacheHelperCandidateProducerKey =
  | 'generateRhythmForgePattern'
  | 'readBassClipById'
  | 'bar-frozen-root-binding-write';

type StableRhythmLaneSchedulerCacheHelperCandidateConsumerKey =
  | 'scheduleRhythmForgeDrumStep'
  | 'scheduleBassClipStep'
  | 'scheduleExportedDrumConfigStep'
  | 'drumMachine.schedulePattern';

type StableRhythmLaneSchedulerCacheHelperCandidateGuardKey =
  | 'stale-step-guard-before-helper'
  | 'non-stale-step-local-bar-index'
  | 'role-specific-seed-xor-kept'
  | 'drum-cache-not-shared-with-bass-cache'
  | 'generated-pattern-and-bar-index-write-remain-adjacent'
  | 'bass-clip-id-change-before-clip-read'
  | 'bar-frozen-root-binding-preserves-clip-id-and-bar-index'
  | 'free-binding-prefers-clip-generator-root-hz'
  | 'live-step-root-binding-keeps-current-root'
  | 'quantize-bpm-read-remains-at-schedule-time'
  | 'no-cache-runtime-ownership-yet'
  | 'no-stable-scheduler-runtime-extract';

type StableRhythmLaneSchedulerCacheHelperCandidateOutcomeKey =
  | 'candidate-audit-only'
  | 'pure-helper-signature-possible-before-writer-extract'
  | 'writer-extract-requires-dedicated-guard'
  | 'app-scheduler-still-owns-cache-writes'
  | 'app-scheduler-still-owns-scheduling-actions';

export type StableRhythmLaneSchedulerCacheHelperCandidateAudit = {
  readonly candidate: StableRhythmLaneSchedulerCacheHelperCandidateKey;
  readonly order: StableRhythmLaneSchedulerCacheHelperCandidateOrder;
  readonly family: 'rhythm-forge-drum-pattern-bar-cache' | 'bass-clip-playback-root-binding-cache';
  readonly helperCandidateName: string;
  readonly candidateScope: string;
  readonly refs: readonly StableRhythmLaneSchedulerCacheHelperCandidateRefKey[];
  readonly inputs: readonly StableRhythmLaneSchedulerCacheHelperCandidateInputKey[];
  readonly producers: readonly StableRhythmLaneSchedulerCacheHelperCandidateProducerKey[];
  readonly consumers: readonly StableRhythmLaneSchedulerCacheHelperCandidateConsumerKey[];
  readonly requiredGuardsBeforeWriterExtract: readonly StableRhythmLaneSchedulerCacheHelperCandidateGuardKey[];
  readonly outcome: readonly StableRhythmLaneSchedulerCacheHelperCandidateOutcomeKey[];
  readonly appSchedulerLoopStillInline: true;
  readonly cacheWritesStillInlineInApp: true;
  readonly actionPortClosuresStillInlineInApp: true;
  readonly safeToExtractWriterNow: false;
  readonly safeToExtractRuntimeNow: false;
};

export type AppStableRhythmLaneSchedulerCacheHelperCandidateAudits = {
  readonly cleanupKind: 'app-stable-rhythm-lane-scheduler-cache-helper-candidate-audits';
  readonly auditOnly: true;
  readonly ordered: true;
  readonly firstCandidate: 'rhythm-forge-drum-cache-helper-candidate';
  readonly secondCandidate: 'bass-clip-root-binding-cache-helper-candidate';
  readonly candidates: readonly StableRhythmLaneSchedulerCacheHelperCandidateAudit[];
  readonly schedulerLoopStillInlineInApp: true;
  readonly cacheWritesStillInlineInApp: true;
  readonly cacheRuntimeIntroduced: false;
  readonly writerExtractIntroduced: false;
  readonly nextSafeMove: 'rhythm-forge-drum-cache-helper-read-generate-return-probe-before-writer-extract';
};

export const APP_STABLE_RHYTHM_LANE_SCHEDULER_CACHE_HELPER_CANDIDATE_AUDITS_IN_ORDER = [
  {
    candidate: 'rhythm-forge-drum-cache-helper-candidate',
    order: 1,
    family: 'rhythm-forge-drum-pattern-bar-cache',
    helperCandidateName: 'resolveRhythmForgeDrumCacheCandidate',
    candidateScope:
      'candidate pure helper can later receive current drum cache values plus bar/root/drumStyle/groove/seed/flavor and return the pattern plus next cache values; App scheduler still writes refs',
    refs: ['rhythmForgeDrumPatternRef.current', 'rhythmForgeDrumBarIndexRef.current'],
    inputs: [
      'stationaryPlan.step16',
      'stationaryPlan.barIndex',
      'plan.timeSec',
      'root',
      'drumStyle',
      'drumLaneKitOverrides',
      'groove.descriptors',
      'p.drumActive',
      'p.drumConfigMode',
      'p.drumPattern',
      'p.drumVolume',
      'p.drumKit',
      'rhythmForgeSeedRef.current',
      'selectedExportedDrumConfig',
      'drumMachine',
    ],
    producers: ['generateRhythmForgePattern'],
    consumers: ['scheduleRhythmForgeDrumStep', 'scheduleExportedDrumConfigStep', 'drumMachine.schedulePattern'],
    requiredGuardsBeforeWriterExtract: [
      'stale-step-guard-before-helper',
      'non-stale-step-local-bar-index',
      'role-specific-seed-xor-kept',
      'drum-cache-not-shared-with-bass-cache',
      'generated-pattern-and-bar-index-write-remain-adjacent',
      'no-cache-runtime-ownership-yet',
      'no-stable-scheduler-runtime-extract',
    ],
    outcome: [
      'candidate-audit-only',
      'pure-helper-signature-possible-before-writer-extract',
      'writer-extract-requires-dedicated-guard',
      'app-scheduler-still-owns-cache-writes',
      'app-scheduler-still-owns-scheduling-actions',
    ],
    appSchedulerLoopStillInline: true,
    cacheWritesStillInlineInApp: true,
    actionPortClosuresStillInlineInApp: true,
    safeToExtractWriterNow: false,
    safeToExtractRuntimeNow: false,
  },
  {
    candidate: 'bass-clip-root-binding-cache-helper-candidate',
    order: 2,
    family: 'bass-clip-playback-root-binding-cache',
    helperCandidateName: 'resolveBassClipPlaybackRootBindingCandidate',
    candidateScope:
      'candidate helper can later separate clip-id playback cache lookup from bar-frozen root binding resolution; App scheduler still writes playback/root-binding refs',
    refs: ['bassClipPlaybackCacheRef.current', 'bassClipBarRootRef.current'],
    inputs: [
      'stationaryPlan.barIndex',
      'plan.absoluteStep',
      'plan.timeSec',
      'root',
      'p.bassActive',
      'p.bassPatternMode',
      'p.bassClipId',
      'p.bassVolume',
      'nexusParamsRef.current.quantizeBpm',
      'playBassNote',
    ],
    producers: ['readBassClipById', 'bar-frozen-root-binding-write'],
    consumers: ['scheduleBassClipStep'],
    requiredGuardsBeforeWriterExtract: [
      'stale-step-guard-before-helper',
      'non-stale-step-local-bar-index',
      'bass-clip-id-change-before-clip-read',
      'bar-frozen-root-binding-preserves-clip-id-and-bar-index',
      'free-binding-prefers-clip-generator-root-hz',
      'live-step-root-binding-keeps-current-root',
      'quantize-bpm-read-remains-at-schedule-time',
      'no-cache-runtime-ownership-yet',
      'no-stable-scheduler-runtime-extract',
    ],
    outcome: [
      'candidate-audit-only',
      'pure-helper-signature-possible-before-writer-extract',
      'writer-extract-requires-dedicated-guard',
      'app-scheduler-still-owns-cache-writes',
      'app-scheduler-still-owns-scheduling-actions',
    ],
    appSchedulerLoopStillInline: true,
    cacheWritesStillInlineInApp: true,
    actionPortClosuresStillInlineInApp: true,
    safeToExtractWriterNow: false,
    safeToExtractRuntimeNow: false,
  },
] as const satisfies readonly StableRhythmLaneSchedulerCacheHelperCandidateAudit[];

export const APP_STABLE_RHYTHM_LANE_SCHEDULER_CACHE_HELPER_CANDIDATE_AUDITS = {
  cleanupKind: 'app-stable-rhythm-lane-scheduler-cache-helper-candidate-audits',
  auditOnly: true,
  ordered: true,
  firstCandidate: 'rhythm-forge-drum-cache-helper-candidate',
  secondCandidate: 'bass-clip-root-binding-cache-helper-candidate',
  candidates: APP_STABLE_RHYTHM_LANE_SCHEDULER_CACHE_HELPER_CANDIDATE_AUDITS_IN_ORDER,
  schedulerLoopStillInlineInApp: true,
  cacheWritesStillInlineInApp: true,
  cacheRuntimeIntroduced: false,
  writerExtractIntroduced: false,
  nextSafeMove: 'rhythm-forge-drum-cache-helper-read-generate-return-probe-before-writer-extract',
} as const satisfies AppStableRhythmLaneSchedulerCacheHelperCandidateAudits;
