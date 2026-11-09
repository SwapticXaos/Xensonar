import {
  WAVE_STARTER_WORKLET_SAMPLE_FAILOVER_MAX_VOICES,
  WAVE_STARTER_WORKLET_STEAL_FADE_MAX_TAILS,
  WAVE_STARTER_WORKLET_SYNTH_FAILOVER_MAX_VOICES,
  postWaveStarterWorkletSampleProcessorRuntimeVoice,
  postWaveStarterWorkletSynthProcessorRuntimeVoice,
  type WaveStarterWorkletProcessorRuntimeOwnershipPayload,
  type WaveStarterWorkletPilotSnapshot,
} from './waveStarterWorkletPilotBridge';
import {
  buildWaveStarterSampleFailoverCandidate,
  publishWaveStarterSampleFailoverCandidateBlockedUntilHydrated,
  publishWaveStarterSampleFailoverCandidatePosted,
} from './waveStarterSampleFailoverCandidate';
import { publishWaveStarterSampleFailoverBlockedUntilHydrated } from './waveStarterSampleBufferTokenShadow';
import {
  buildWaveStarterSynthFailoverCandidate,
  publishWaveStarterSampleFailoverBlocked,
  publishWaveStarterSynthFailoverCandidatePosted,
} from './waveStarterSynthFailoverCandidate';
import type { WaveStarterEmitOptions } from './waveStarterLaneRuntimeBridge';
import type {
  WaveStarterSampleVoiceSpec,
  WaveStarterSynthVoiceSpec,
  WaveStarterVoiceSpec,
} from './waveStarterVoiceSpecFailoverContract';
import type { WaveStarterWorkletInstrumentEngineSkeletonSubmission } from './waveStarterWorkletInstrumentEngineSkeleton';
import { publishWaveStarterWorkletProcessorRuntimeOwnershipReport } from './waveStarterWorkletProcessorRuntimeOwnership';

export type WaveStarterWorkletVoicePoolRuntimeDecision =
  | 'not-runtime-submission'
  | 'synth-voice-pool-runtime-posted'
  | 'sample-voice-pool-runtime-posted'
  | 'sample-token-pending-legacy-reference'
  | 'pilot-unready-legacy-reference'
  | 'legacy-reference'
  | 'worklet-only-suppressed-legacy';

export type WaveStarterWorkletVoicePoolRuntimeLane =
  | 'wellenstart'
  | 'klaviatur'
  | 'direct';

export type WaveStarterWorkletVoicePoolRuntimeResult = {
  version: 1;
  reportKind: 'xensonar-wave-starter-worklet-voice-pool-runtime-result';
  generatedAtIso: string;
  decision: WaveStarterWorkletVoicePoolRuntimeDecision;
  handledByWorklet: boolean;
  allowLegacyFallback: boolean;
  voiceSpecId: string | null;
  voiceKind: 'synth' | 'sample' | null;
  lane: WaveStarterWorkletVoicePoolRuntimeLane | null;
  sourceIntent:
    | 'hold-gesture-loop'
    | 'keyboard-glissando'
    | 'direct-wave-starter'
    | null;
  runtimeOwnsQueue: boolean;
  runtimeOwnsVoicePool: boolean;
  runtimeOwnsBoundedQueue: boolean;
  runtimeOwnsStealFadeTail: boolean;
  runtimeOwnsSegmentClock: boolean;
  synthMaxVoices: number;
  sampleMaxVoices: number;
  stealFadeMaxTails: number;
  pilotReady: boolean;
  sampleTokenHydrated: boolean;
  legacyFallbackPreserved: boolean;
  workletOnlyRequested: boolean;
  forceSustainExtend: boolean;
  processorRuntimeOwnership: boolean;
  processorRuntimeMessageType:
    | 'wave-starter-synth-processor-runtime-voice'
    | 'wave-starter-sample-processor-runtime-voice'
    | null;
  processorRuntimeSegmentClockOwned: boolean;
  processorRuntimeExtendPolicy: string | null;
  reason: string;
};

export type WaveStarterWorkletVoicePoolRuntimeReport = {
  version: 1;
  reportKind: 'xensonar-wave-starter-worklet-voice-pool-runtime';
  generatedAtIso: string;
  lastResult: WaveStarterWorkletVoicePoolRuntimeResult | null;
  lastResultAgeMs: number | null;
  totalRuntimeSubmissionCount: number;
  synthVoicePoolRuntimePostedCount: number;
  sampleVoicePoolRuntimePostedCount: number;
  sampleTokenPendingLegacyReferenceCount: number;
  pilotUnreadyLegacyReferenceCount: number;
  legacyReferenceCount: number;
  workletOnlySuppressedLegacyCount: number;
  apostropheSafeExtendRuntimeCount: number;
  holdGestureRuntimeSubmissionCount: number;
  keyboardGlissandoRuntimeSubmissionCount: number;
  runtimeOwnsBoundedQueue: true;
  runtimeOwnsVoicePoolReuse: true;
  runtimeOwnsPriorityDisplacement: true;
  runtimeOwnsStealFadeTail: true;
  legacyFallbackPreservedUntilRuntimeAudible: true;
  synthAndSampleRuntimeParityTracked: true;
  synthMaxVoices: number;
  sampleMaxVoices: number;
  stealFadeMaxTails: number;
  detail: string;
};

export const WAVE_STARTER_WORKLET_VOICE_POOL_RUNTIME_GLOBAL =
  '__XENSONAR_WAVE_STARTER_WORKLET_VOICE_POOL_RUNTIME__';

let lastResult: WaveStarterWorkletVoicePoolRuntimeResult | null = null;
let lastResultAtMs: number | null = null;
let totalRuntimeSubmissionCount = 0;
let synthVoicePoolRuntimePostedCount = 0;
let sampleVoicePoolRuntimePostedCount = 0;
let sampleTokenPendingLegacyReferenceCount = 0;
let pilotUnreadyLegacyReferenceCount = 0;
let legacyReferenceCount = 0;
let workletOnlySuppressedLegacyCount = 0;
let apostropheSafeExtendRuntimeCount = 0;
let holdGestureRuntimeSubmissionCount = 0;
let keyboardGlissandoRuntimeSubmissionCount = 0;

function nowMs() {
  return typeof performance !== 'undefined' &&
    typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function isPilotReady(pilotSnapshot: WaveStarterWorkletPilotSnapshot | null) {
  return !!(
    pilotSnapshot &&
    pilotSnapshot.keepAliveConnected &&
    pilotSnapshot.outputConnected &&
    !pilotSnapshot.errorMessage
  );
}

function isWorkletOnlyRequested(options?: WaveStarterEmitOptions) {
  return !!(
    options?.keyboardGlissandoWorkletOnly ||
    options?.waveStarterGestureLoopWorkletOnly
  );
}

function isRuntimeSubmission(
  submission: WaveStarterWorkletInstrumentEngineSkeletonSubmission | null,
) {
  return !!(
    submission &&
    (submission.sourceIntent === 'hold-gesture-loop' ||
      submission.sourceIntent === 'keyboard-glissando')
  );
}

function sampleTokenHydrated(args: {
  submission: WaveStarterWorkletInstrumentEngineSkeletonSubmission | null;
  pilotSnapshot: WaveStarterWorkletPilotSnapshot | null;
  voiceSpec: WaveStarterVoiceSpec;
}) {
  if (args.voiceSpec.kind !== 'sample') return false;
  if (args.submission?.sampleTokenHydrated === true) return true;
  const token = args.voiceSpec.bufferToken || null;
  const pilot = args.pilotSnapshot;
  return !!(
    token &&
    pilot &&
    (pilot.sampleBufferTokenHydratedCount ?? 0) > 0 &&
    (!pilot.sampleBufferLastToken ||
      pilot.sampleBufferLastToken === token ||
      (pilot.sampleBufferTokenHydratedCount ?? 0) > 1)
  );
}

function makeResult(args: {
  decision: WaveStarterWorkletVoicePoolRuntimeDecision;
  handledByWorklet: boolean;
  allowLegacyFallback: boolean;
  voiceSpec?: WaveStarterVoiceSpec | null;
  submission?: WaveStarterWorkletInstrumentEngineSkeletonSubmission | null;
  pilotReady?: boolean;
  sampleTokenHydrated?: boolean;
  workletOnlyRequested?: boolean;
  reason: string;
}): WaveStarterWorkletVoicePoolRuntimeResult {
  const submission = args.submission ?? null;
  return {
    version: 1,
    reportKind: 'xensonar-wave-starter-worklet-voice-pool-runtime-result',
    generatedAtIso: new Date().toISOString(),
    decision: args.decision,
    handledByWorklet: args.handledByWorklet,
    allowLegacyFallback: args.allowLegacyFallback,
    voiceSpecId: args.voiceSpec?.voiceId ?? null,
    voiceKind: args.voiceSpec?.kind ?? null,
    lane: submission?.lane ?? null,
    sourceIntent: submission?.sourceIntent ?? null,
    runtimeOwnsQueue: isRuntimeSubmission(submission),
    runtimeOwnsVoicePool: args.handledByWorklet,
    runtimeOwnsBoundedQueue: isRuntimeSubmission(submission),
    runtimeOwnsStealFadeTail: args.handledByWorklet,
    runtimeOwnsSegmentClock: submission?.segmentClockOwnedByEngine === true,
    synthMaxVoices: WAVE_STARTER_WORKLET_SYNTH_FAILOVER_MAX_VOICES,
    sampleMaxVoices: WAVE_STARTER_WORKLET_SAMPLE_FAILOVER_MAX_VOICES,
    stealFadeMaxTails: WAVE_STARTER_WORKLET_STEAL_FADE_MAX_TAILS,
    pilotReady: args.pilotReady === true,
    sampleTokenHydrated: args.sampleTokenHydrated === true,
    legacyFallbackPreserved: args.allowLegacyFallback,
    workletOnlyRequested: args.workletOnlyRequested === true,
    forceSustainExtend: submission?.forceSustainExtend === true,
    processorRuntimeOwnership: args.handledByWorklet && isRuntimeSubmission(submission),
    processorRuntimeMessageType:
      args.handledByWorklet && args.voiceSpec?.kind === 'sample'
        ? 'wave-starter-sample-processor-runtime-voice'
        : args.handledByWorklet && args.voiceSpec?.kind === 'synth'
          ? 'wave-starter-synth-processor-runtime-voice'
          : null,
    processorRuntimeSegmentClockOwned:
      submission?.segmentClockOwnedByEngine === true && args.handledByWorklet,
    processorRuntimeExtendPolicy: submission?.extendPolicy ?? null,
    reason: args.reason,
  };
}

function publishResult(
  result: WaveStarterWorkletVoicePoolRuntimeResult,
): WaveStarterWorkletVoicePoolRuntimeReport {
  if (result.decision !== 'not-runtime-submission') {
    totalRuntimeSubmissionCount += 1;
    if (result.sourceIntent === 'hold-gesture-loop')
      holdGestureRuntimeSubmissionCount += 1;
    if (result.sourceIntent === 'keyboard-glissando')
      keyboardGlissandoRuntimeSubmissionCount += 1;
  }
  if (result.decision === 'synth-voice-pool-runtime-posted')
    synthVoicePoolRuntimePostedCount += 1;
  if (result.decision === 'sample-voice-pool-runtime-posted')
    sampleVoicePoolRuntimePostedCount += 1;
  if (result.decision === 'sample-token-pending-legacy-reference')
    sampleTokenPendingLegacyReferenceCount += 1;
  if (result.decision === 'pilot-unready-legacy-reference')
    pilotUnreadyLegacyReferenceCount += 1;
  if (result.decision === 'legacy-reference') legacyReferenceCount += 1;
  if (result.decision === 'worklet-only-suppressed-legacy')
    workletOnlySuppressedLegacyCount += 1;
  if (result.forceSustainExtend) apostropheSafeExtendRuntimeCount += 1;
  lastResult = result;
  lastResultAtMs = nowMs();
  return buildWaveStarterWorkletVoicePoolRuntimeReport();
}

export function buildWaveStarterWorkletVoicePoolRuntimeReport(): WaveStarterWorkletVoicePoolRuntimeReport {
  const ageMs =
    lastResultAtMs === null ? null : Math.max(0, nowMs() - lastResultAtMs);
  const report: WaveStarterWorkletVoicePoolRuntimeReport = {
    version: 1,
    reportKind: 'xensonar-wave-starter-worklet-voice-pool-runtime',
    generatedAtIso: new Date().toISOString(),
    lastResult,
    lastResultAgeMs: ageMs,
    totalRuntimeSubmissionCount,
    synthVoicePoolRuntimePostedCount,
    sampleVoicePoolRuntimePostedCount,
    sampleTokenPendingLegacyReferenceCount,
    pilotUnreadyLegacyReferenceCount,
    legacyReferenceCount,
    workletOnlySuppressedLegacyCount,
    apostropheSafeExtendRuntimeCount,
    holdGestureRuntimeSubmissionCount,
    keyboardGlissandoRuntimeSubmissionCount,
    runtimeOwnsBoundedQueue: true,
    runtimeOwnsVoicePoolReuse: true,
    runtimeOwnsPriorityDisplacement: true,
    runtimeOwnsStealFadeTail: true,
    legacyFallbackPreservedUntilRuntimeAudible: true,
    synthAndSampleRuntimeParityTracked: true,
    synthMaxVoices: WAVE_STARTER_WORKLET_SYNTH_FAILOVER_MAX_VOICES,
    sampleMaxVoices: WAVE_STARTER_WORKLET_SAMPLE_FAILOVER_MAX_VOICES,
    stealFadeMaxTails: WAVE_STARTER_WORKLET_STEAL_FADE_MAX_TAILS,
    detail:
      'Wellenstarter Hold-/Keyboard-Gesten enter the Worklet Voice-Pool Runtime before legacy fallback. The runtime owns bounded queue, voice reuse, priority displacement and steal-fade-tail decisions for posted synth/sample candidates; legacy remains the fail-open reference for unready pilot or missing sample tokens.',
  };
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>)[
      WAVE_STARTER_WORKLET_VOICE_POOL_RUNTIME_GLOBAL
    ] = report;
  }
  return report;
}


function buildProcessorRuntimeOwnershipPayload(
  submission: WaveStarterWorkletInstrumentEngineSkeletonSubmission,
): WaveStarterWorkletProcessorRuntimeOwnershipPayload {
  return {
    sourceIntent: submission.sourceIntent,
    lane: submission.lane,
    extendPolicy: submission.extendPolicy,
    segmentClockOwnedByProcessor: submission.segmentClockOwnedByEngine === true,
    forceSustainExtend: submission.forceSustainExtend === true,
  };
}

export function submitWaveStarterWorkletVoicePoolRuntime(args: {
  ctx: AudioContext;
  voiceSpec: WaveStarterVoiceSpec;
  options?: WaveStarterEmitOptions;
  pilotSnapshot: WaveStarterWorkletPilotSnapshot | null;
  submission: WaveStarterWorkletInstrumentEngineSkeletonSubmission | null;
}): WaveStarterWorkletVoicePoolRuntimeResult {
  const submission = args.submission;
  if (!isRuntimeSubmission(submission)) {
    const result = makeResult({
      decision: 'not-runtime-submission',
      handledByWorklet: false,
      allowLegacyFallback: true,
      voiceSpec: args.voiceSpec,
      submission,
      pilotReady: isPilotReady(args.pilotSnapshot),
      sampleTokenHydrated: sampleTokenHydrated({
        submission,
        pilotSnapshot: args.pilotSnapshot,
        voiceSpec: args.voiceSpec,
      }),
      workletOnlyRequested: isWorkletOnlyRequested(args.options),
      reason: 'voice-spec-did-not-enter-worklet-instrument-runtime',
    });
    publishResult(result);
    return result;
  }

  const runtimeSubmission = submission as WaveStarterWorkletInstrumentEngineSkeletonSubmission;
  const workletOnlyRequested = isWorkletOnlyRequested(args.options);
  const pilotReady = isPilotReady(args.pilotSnapshot);
  const hydrated = sampleTokenHydrated({
    submission,
    pilotSnapshot: args.pilotSnapshot,
    voiceSpec: args.voiceSpec,
  });

  if (!pilotReady) {
    const result = makeResult({
      decision: workletOnlyRequested
        ? 'worklet-only-suppressed-legacy'
        : 'pilot-unready-legacy-reference',
      handledByWorklet: false,
      allowLegacyFallback: !workletOnlyRequested,
      voiceSpec: args.voiceSpec,
      submission,
      pilotReady,
      sampleTokenHydrated: hydrated,
      workletOnlyRequested,
      reason: workletOnlyRequested
        ? 'pilot-unready-worklet-only-suppresses-legacy-node-burst'
        : 'pilot-unready-legacy-reference-preserved',
    });
    publishResult(result);
    return result;
  }

  if (args.voiceSpec.kind === 'synth') {
    const candidate = buildWaveStarterSynthFailoverCandidate(
      args.voiceSpec as WaveStarterSynthVoiceSpec,
    );
    const postedSnapshot = postWaveStarterWorkletSynthProcessorRuntimeVoice(
      args.ctx,
      candidate,
      buildProcessorRuntimeOwnershipPayload(runtimeSubmission),
    );
    publishWaveStarterSynthFailoverCandidatePosted(candidate, postedSnapshot);
    const result = makeResult({
      decision: 'synth-voice-pool-runtime-posted',
      handledByWorklet: true,
      allowLegacyFallback: false,
      voiceSpec: args.voiceSpec,
      submission,
      pilotReady,
      sampleTokenHydrated: false,
      workletOnlyRequested,
      reason:
        'synth-voice-spec-posted-to-worklet-voice-pool-runtime-with-legacy-reference-not-repeated',
    });
    publishResult(result);
    publishWaveStarterWorkletProcessorRuntimeOwnershipReport({
      pilotSnapshot: postedSnapshot,
      lastResult: result,
    });
    return result;
  }

  if (args.voiceSpec.kind === 'sample' && hydrated) {
    const candidate = buildWaveStarterSampleFailoverCandidate(
      args.voiceSpec as WaveStarterSampleVoiceSpec,
    );
    const postedSnapshot = postWaveStarterWorkletSampleProcessorRuntimeVoice(
      args.ctx,
      candidate,
      buildProcessorRuntimeOwnershipPayload(runtimeSubmission),
    );
    publishWaveStarterSampleFailoverCandidatePosted(candidate, postedSnapshot);
    const result = makeResult({
      decision: 'sample-voice-pool-runtime-posted',
      handledByWorklet: true,
      allowLegacyFallback: false,
      voiceSpec: args.voiceSpec,
      submission,
      pilotReady,
      sampleTokenHydrated: true,
      workletOnlyRequested,
      reason:
        'hydrated-sample-voice-spec-posted-to-worklet-voice-pool-runtime-with-synth-substitution-forbidden',
    });
    publishResult(result);
    publishWaveStarterWorkletProcessorRuntimeOwnershipReport({
      pilotSnapshot: postedSnapshot,
      lastResult: result,
    });
    return result;
  }

  if (args.voiceSpec.kind === 'sample') {
    publishWaveStarterSampleFailoverBlocked(
      args.voiceSpec as WaveStarterSampleVoiceSpec,
      args.pilotSnapshot,
    );
    publishWaveStarterSampleFailoverBlockedUntilHydrated(
      args.voiceSpec as WaveStarterSampleVoiceSpec,
      args.pilotSnapshot,
    );
    publishWaveStarterSampleFailoverCandidateBlockedUntilHydrated(
      args.voiceSpec as WaveStarterSampleVoiceSpec,
      args.pilotSnapshot,
    );
  }

  const result = makeResult({
    decision: workletOnlyRequested
      ? 'worklet-only-suppressed-legacy'
      : 'sample-token-pending-legacy-reference',
    handledByWorklet: false,
    allowLegacyFallback: !workletOnlyRequested,
    voiceSpec: args.voiceSpec,
    submission,
    pilotReady,
    sampleTokenHydrated: false,
    workletOnlyRequested,
    reason: workletOnlyRequested
      ? 'sample-token-pending-worklet-only-suppresses-legacy-node-burst'
      : 'sample-token-pending-legacy-reference-preserved',
  });
  publishResult(result);
  return result;
}
