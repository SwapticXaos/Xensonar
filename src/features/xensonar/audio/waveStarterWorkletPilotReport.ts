import {
  WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN,
  WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN_DB,
  WAVE_STARTER_WORKLET_PARALLEL_PILOT_REQUIRED_COMPLETED_SHAPES,
  WAVE_STARTER_WORKLET_PARALLEL_PILOT_RAMP_ATTACK_FRAMES,
  WAVE_STARTER_WORKLET_PARALLEL_PILOT_RAMP_RELEASE_FRAMES,
  WAVE_STARTER_WORKLET_PILOT_PROCESSOR_NAME,
  WAVE_STARTER_WORKLET_SAMPLE_FAILOVER_MAX_VOICES,
  WAVE_STARTER_WORKLET_STEAL_FADE_MAX_TAILS,
  WAVE_STARTER_WORKLET_SYNTH_FAILOVER_MAX_VOICES,
} from "./waveStarterWorkletPilotProcessorSource";

const PROCESSOR_NAME = WAVE_STARTER_WORKLET_PILOT_PROCESSOR_NAME;
const RENDERED_FRAME_DELTA_FRESH_MS = 450;

function nowMs() {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  )
    return performance.now();
  return Date.now();
}

export type WaveStarterWorkletPilotStatus =
  | "unstarted"
  | "unsupported"
  | "loading"
  | "loaded"
  | "failed";

export type WaveStarterWorkletPilotDecision =
  | "not-requested"
  | "unsupported-fallback"
  | "shadow-pilot-loading"
  | "shadow-pilot-ready"
  | "intent-acked"
  | "frame-advance-observed"
  | "shadow-audio-shape-rendered"
  | "parallel-pilot-mix-rendered"
  | "parallel-pilot-armed"
  | "synth-failover-candidate-posted"
  | "synth-failover-candidate-accepted"
  | "synth-failover-candidate-rendered"
  | "sample-buffer-token-shadow-posted"
  | "sample-buffer-token-shadow-accepted"
  | "sample-buffer-token-shadow-rejected"
  | "sample-failover-candidate-posted"
  | "sample-failover-candidate-accepted"
  | "sample-failover-candidate-rendered"
  | "sample-failover-candidate-rejected"
  | "processor-error-fallback";

export type WaveStarterWorkletPilotSnapshot = {
  version: 1;
  reportKind: "xensonar-wave-starter-worklet-pilot-report";
  generatedAtIso: string;
  status: WaveStarterWorkletPilotStatus;
  decision: WaveStarterWorkletPilotDecision;
  processorName: string;
  requestedAtMs: number | null;
  completedAtMs: number | null;
  lastMessageAtMs: number | null;
  lastIntentPostedAtMs: number | null;
  lastIntentAckAtMs: number | null;
  lastFrameAdvanceAtMs: number | null;
  readyMessageCount: number;
  postedIntentCount: number;
  ackedIntentCount: number;
  rejectedIntentCount: number;
  processorErrorCount: number;
  processQuantumCount: number;
  renderedFrameCount: number;
  renderedFrameDelta: number;
  activeRenderQuantumCount: number;
  audioShapeProbeEnabled: true;
  audioShapeProbeSilenceOnly: true;
  audioShapeProbeFrameCount: number;
  audioShapeProbeFrameDelta: number;
  audioShapeProbeQuantumCount: number;
  audioShapeProbePeakAbs: number;
  audioShapeProbeCompletedCount: number;
  audioShapeProbeLastRenderAtMs: number | null;
  audioShapeProbeLastFrequencyHz: number | null;
  audioShapeProbeLastWorkletFrame: number | null;
  parallelPilotMixEnabled: true;
  parallelPilotPreservesLegacyReference: true;
  parallelPilotRequiresShapeProof: true;
  parallelPilotGain: number;
  parallelPilotGainDb: number;
  parallelPilotRequiredCompletedShapes: number;
  parallelPilotMutedFrameCount: number;
  parallelPilotRenderFrameCount: number;
  parallelPilotRenderFrameDelta: number;
  parallelPilotRenderQuantumCount: number;
  parallelPilotPeakAbs: number;
  parallelPilotLastRenderAtMs: number | null;
  parallelPilotLastWorkletFrame: number | null;
  parallelPilotAutoMuteReason: string | null;
  parallelPilotRampGuardEnabled: true;
  parallelPilotRampGuardAttackFrames: number;
  parallelPilotRampGuardReleaseFrames: number;
  parallelPilotRampGuardFrameCount: number;
  parallelPilotRampGuardQuantumCount: number;
  parallelPilotRampGuardPeakGain: number;
  parallelPilotRampGuardLastRenderAtMs: number | null;
  parallelPilotRampGuardLastWorkletFrame: number | null;
  voiceSpecMirrorAcceptedCount: number;
  voiceSpecMirrorRejectedCount: number;
  lastVoiceSpecKind: "synth" | "sample" | null;
  lastVoiceSpecId: string | null;
  lastVoiceSpecExactnessLevel: string | null;
  lastVoiceSpecMirrorAtMs: number | null;
  synthFailoverCandidatePostedCount: number;
  synthFailoverCandidateAcceptedCount: number;
  synthFailoverCandidateRejectedCount: number;
  synthFailoverRenderFrameCount: number;
  synthFailoverRenderFrameDelta: number;
  synthFailoverRenderQuantumCount: number;
  synthFailoverPeakAbs: number;
  synthFailoverLastRenderAtMs: number | null;
  synthFailoverLastWorkletFrame: number | null;
  synthFailoverLastSpecId: string | null;
  synthFailoverLastRejectReason: string | null;
  synthFailoverCandidateGainScale: number;
  synthFailoverLastQueuedVoiceCount: number;
  synthFailoverVoicePoolMaxVoices: number;
  synthFailoverVoicePoolAllocatedCount: number;
  synthFailoverVoicePoolReusedCount: number;
  synthFailoverVoicePoolRecycledCount: number;
  synthFailoverVoicePoolDisplacedCount: number;
  synthFailoverVoicePoolPriorityDisplacedCount: number;
  synthFailoverVoicePoolLastDisplacedScore: number | null;
  synthFailoverStealFadeTailQueuedCount: number;
  synthFailoverStealFadeTailDroppedCount: number;
  synthFailoverStealFadeTailRenderFrameCount: number;
  synthFailoverStealFadeTailMaxTails: number;
  synthFailoverVoicePoolFreeCount: number;
  synthFailoverVoicePoolCompactionEnabled: true;
  synthFailoverVoicePoolPriorityDisplacementEnabled: true;
  synthFailoverLegacyDropOnly: true;
  sampleFailoverBlockedUntilBufferToken: true;
  sampleFailoverBlockedUntilHydratedToken: true;
  sampleRenderingDisabledUntilPilot: boolean;
  sampleFailoverPilotRendererEnabled: true;
  sampleFailoverPilotOneShotOnly: true;
  sampleFailoverPilotLoopDisabled: true;
  sampleFailoverCandidatePostedCount: number;
  sampleFailoverCandidateAcceptedCount: number;
  sampleFailoverCandidateRejectedCount: number;
  sampleFailoverLastSpecId: string | null;
  sampleFailoverLastToken: string | null;
  sampleFailoverLastRejectReason: string | null;
  sampleFailoverRenderingDisabledUntilPilot: boolean;
  sampleFailoverHydratedTokenRequired: true;
  sampleFailoverRenderFrameCount: number;
  sampleFailoverRenderFrameDelta: number;
  sampleFailoverRenderQuantumCount: number;
  sampleFailoverPeakAbs: number;
  sampleFailoverLastRenderAtMs: number | null;
  sampleFailoverLastWorkletFrame: number | null;
  sampleFailoverLastQueuedVoiceCount: number;
  sampleFailoverVoicePoolMaxVoices: number;
  sampleFailoverVoicePoolAllocatedCount: number;
  sampleFailoverVoicePoolReusedCount: number;
  sampleFailoverVoicePoolRecycledCount: number;
  sampleFailoverVoicePoolDisplacedCount: number;
  sampleFailoverVoicePoolPriorityDisplacedCount: number;
  sampleFailoverVoicePoolLastDisplacedScore: number | null;
  sampleFailoverStealFadeTailQueuedCount: number;
  sampleFailoverStealFadeTailDroppedCount: number;
  sampleFailoverStealFadeTailRenderFrameCount: number;
  sampleFailoverStealFadeTailMaxTails: number;
  sampleFailoverVoicePoolFreeCount: number;
  sampleFailoverVoicePoolCompactionEnabled: true;
  sampleFailoverVoicePoolPriorityDisplacementEnabled: true;
  processorRuntimeOwnershipEnabled: true;
  processorRuntimeLegacyReferencePreserved: true;
  processorRuntimeVoicePoolReusesExistingRenderer: true;
  processorRuntimeSynthVoicePostedCount: number;
  processorRuntimeSampleVoicePostedCount: number;
  processorRuntimeSynthVoiceAcceptedCount: number;
  processorRuntimeSampleVoiceAcceptedCount: number;
  processorRuntimeSynthVoiceRejectedCount: number;
  processorRuntimeSampleVoiceRejectedCount: number;
  processorRuntimeSegmentClockPulseAcceptedCount: number;
  processorRuntimeApostropheSafeExtendAcceptedCount: number;
  processorRuntimeRenderFrameCount: number;
  processorRuntimeRenderFrameDelta: number;
  processorRuntimeLastSourceIntent: string | null;
  processorRuntimeLastLane: string | null;
  processorRuntimeLastExtendPolicy: string | null;
  processorRuntimeLastVoiceSpecId: string | null;
  processorRuntimeLastRejectReason: string | null;
  processorRuntimeActiveSynthVoices: number;
  processorRuntimeActiveSampleVoices: number;
  processorRuntimeQueuePressureApprox: number;
  processorRuntimePressureState: "clear" | "watch" | "brake" | "critical";
  processorRuntimeStolenVoiceCount: number;
  processorRuntimeStealFadeTailPressure: number;
  processorOwnedHoldSchedulerEnabled: true;
  processorOwnedHoldGestureStartPostedCount: number;
  processorOwnedHoldGestureUpdatePostedCount: number;
  processorOwnedHoldGestureReleasePostedCount: number;
  processorOwnedHoldGestureStartAcceptedCount: number;
  processorOwnedHoldGestureUpdateAcceptedCount: number;
  processorOwnedHoldGestureReleaseAcceptedCount: number;
  processorOwnedHoldGestureRejectedCount: number;
  processorOwnedHoldGestureActiveCount: number;
  processorOwnedHoldSegmentPulseCount: number;
  processorOwnedHoldSynthVoiceCreatedCount: number;
  processorOwnedHoldSchedulerActive: boolean;
  processorOwnedHoldLastGestureId: string | null;
  processorOwnedHoldLastLane: string | null;
  processorOwnedHoldLastSegmentsPerBar: number | null;
  processorOwnedHoldLastPitchHz: number | null;
  processorOwnedHoldLastRejectReason: string | null;
  sampleBufferTokenShadowPostedCount: number;
  sampleBufferTokenShadowAcceptedCount: number;
  sampleBufferTokenShadowRejectedCount: number;
  sampleBufferTokenHydratedCount: number;
  sampleBufferLastToken: string | null;
  sampleBufferLastRejectReason: string | null;
  sampleBufferLastFrameCount: number;
  sampleBufferLastChannelCount: number;
  lastAcceptedSequence: number;
  lastPostedSequence: number;
  lastRejectedReason: string | null;
  pendingIntentCount: number;
  latestIntentReplacedCount: number;
  keepAliveConnected: boolean;
  outputConnected: boolean;
  silentShadowOnly: false;
  preservesMainThreadReferencePath: true;
  fileOriginLikelyBlocked: boolean;
  detail: string | null;
  errorMessage: string | null;
};

export const WAVE_STARTER_WORKLET_PILOT_GLOBAL =
  "__XENSONAR_WAVE_STARTER_WORKLET_PILOT_REPORT__";

function isLocalFileOriginContext() {
  return typeof window !== "undefined" && window.location?.protocol === "file:";
}

export function createWaveStarterWorkletPilotSnapshot(
  partial: Partial<WaveStarterWorkletPilotSnapshot> = {},
): WaveStarterWorkletPilotSnapshot {
  const status = partial.status ?? "unstarted";
  const processorErrorCount = partial.processorErrorCount ?? 0;
  const renderedFrameCount = partial.renderedFrameCount ?? 0;
  const lastFrameAdvanceAtMs = partial.lastFrameAdvanceAtMs ?? null;
  const frameFresh =
    lastFrameAdvanceAtMs !== null &&
    nowMs() - lastFrameAdvanceAtMs <= RENDERED_FRAME_DELTA_FRESH_MS;
  let decision: WaveStarterWorkletPilotDecision =
    partial.decision ?? "not-requested";
  if (status === "unsupported") decision = "unsupported-fallback";
  else if (status === "loading") decision = "shadow-pilot-loading";
  else if (status === "failed" || processorErrorCount > 0)
    decision = "processor-error-fallback";
  else if ((partial.sampleFailoverCandidateRejectedCount ?? 0) > 0)
    decision = "sample-failover-candidate-rejected";
  else if (
    (partial.sampleFailoverRenderFrameCount ?? 0) > 0 &&
    (partial.sampleFailoverLastRenderAtMs ?? null) !== null &&
    nowMs() - (partial.sampleFailoverLastRenderAtMs ?? 0) <=
      RENDERED_FRAME_DELTA_FRESH_MS
  )
    decision = "sample-failover-candidate-rendered";
  else if ((partial.sampleFailoverCandidateAcceptedCount ?? 0) > 0)
    decision = "sample-failover-candidate-accepted";
  else if ((partial.sampleFailoverCandidatePostedCount ?? 0) > 0)
    decision = "sample-failover-candidate-posted";
  else if ((partial.sampleBufferTokenShadowRejectedCount ?? 0) > 0)
    decision = "sample-buffer-token-shadow-rejected";
  else if ((partial.sampleBufferTokenShadowAcceptedCount ?? 0) > 0)
    decision = "sample-buffer-token-shadow-accepted";
  else if ((partial.sampleBufferTokenShadowPostedCount ?? 0) > 0)
    decision = "sample-buffer-token-shadow-posted";
  else if (
    (partial.synthFailoverRenderFrameCount ?? 0) > 0 &&
    (partial.synthFailoverLastRenderAtMs ?? null) !== null &&
    nowMs() - (partial.synthFailoverLastRenderAtMs ?? 0) <=
      RENDERED_FRAME_DELTA_FRESH_MS
  )
    decision = "synth-failover-candidate-rendered";
  else if ((partial.synthFailoverCandidateAcceptedCount ?? 0) > 0)
    decision = "synth-failover-candidate-accepted";
  else if ((partial.synthFailoverCandidatePostedCount ?? 0) > 0)
    decision = "synth-failover-candidate-posted";
  else if (
    (partial.parallelPilotRenderFrameCount ?? 0) > 0 &&
    (partial.parallelPilotLastRenderAtMs ?? null) !== null &&
    nowMs() - (partial.parallelPilotLastRenderAtMs ?? 0) <=
      RENDERED_FRAME_DELTA_FRESH_MS
  )
    decision = "parallel-pilot-mix-rendered";
  else if (
    (partial.audioShapeProbeCompletedCount ?? 0) >=
      WAVE_STARTER_WORKLET_PARALLEL_PILOT_REQUIRED_COMPLETED_SHAPES &&
    status === "loaded"
  )
    decision = "parallel-pilot-armed";
  else if (
    (partial.audioShapeProbeFrameCount ?? 0) > 0 &&
    (partial.audioShapeProbeLastRenderAtMs ?? null) !== null &&
    nowMs() - (partial.audioShapeProbeLastRenderAtMs ?? 0) <=
      RENDERED_FRAME_DELTA_FRESH_MS
  )
    decision = "shadow-audio-shape-rendered";
  else if (renderedFrameCount > 0 && frameFresh)
    decision = "frame-advance-observed";
  else if ((partial.ackedIntentCount ?? 0) > 0) decision = "intent-acked";
  else if (status === "loaded") decision = "shadow-pilot-ready";

  return {
    version: 1,
    reportKind: "xensonar-wave-starter-worklet-pilot-report",
    generatedAtIso: new Date().toISOString(),
    status,
    decision,
    processorName: PROCESSOR_NAME,
    requestedAtMs: partial.requestedAtMs ?? null,
    completedAtMs: partial.completedAtMs ?? null,
    lastMessageAtMs: partial.lastMessageAtMs ?? null,
    lastIntentPostedAtMs: partial.lastIntentPostedAtMs ?? null,
    lastIntentAckAtMs: partial.lastIntentAckAtMs ?? null,
    lastFrameAdvanceAtMs,
    readyMessageCount: partial.readyMessageCount ?? 0,
    postedIntentCount: partial.postedIntentCount ?? 0,
    ackedIntentCount: partial.ackedIntentCount ?? 0,
    rejectedIntentCount: partial.rejectedIntentCount ?? 0,
    processorErrorCount,
    processQuantumCount: partial.processQuantumCount ?? 0,
    renderedFrameCount,
    renderedFrameDelta: partial.renderedFrameDelta ?? 0,
    activeRenderQuantumCount: partial.activeRenderQuantumCount ?? 0,
    audioShapeProbeEnabled: true,
    audioShapeProbeSilenceOnly: true,
    audioShapeProbeFrameCount: partial.audioShapeProbeFrameCount ?? 0,
    audioShapeProbeFrameDelta: partial.audioShapeProbeFrameDelta ?? 0,
    audioShapeProbeQuantumCount: partial.audioShapeProbeQuantumCount ?? 0,
    audioShapeProbePeakAbs: partial.audioShapeProbePeakAbs ?? 0,
    audioShapeProbeCompletedCount: partial.audioShapeProbeCompletedCount ?? 0,
    audioShapeProbeLastRenderAtMs:
      partial.audioShapeProbeLastRenderAtMs ?? null,
    audioShapeProbeLastFrequencyHz:
      partial.audioShapeProbeLastFrequencyHz ?? null,
    audioShapeProbeLastWorkletFrame:
      partial.audioShapeProbeLastWorkletFrame ?? null,
    parallelPilotMixEnabled: true,
    parallelPilotPreservesLegacyReference: true,
    parallelPilotRequiresShapeProof: true,
    parallelPilotGain:
      partial.parallelPilotGain ?? WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN,
    parallelPilotGainDb:
      partial.parallelPilotGainDb ??
      WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN_DB,
    parallelPilotRequiredCompletedShapes:
      partial.parallelPilotRequiredCompletedShapes ??
      WAVE_STARTER_WORKLET_PARALLEL_PILOT_REQUIRED_COMPLETED_SHAPES,
    parallelPilotMutedFrameCount: partial.parallelPilotMutedFrameCount ?? 0,
    parallelPilotRenderFrameCount: partial.parallelPilotRenderFrameCount ?? 0,
    parallelPilotRenderFrameDelta: partial.parallelPilotRenderFrameDelta ?? 0,
    parallelPilotRenderQuantumCount:
      partial.parallelPilotRenderQuantumCount ?? 0,
    parallelPilotPeakAbs: partial.parallelPilotPeakAbs ?? 0,
    parallelPilotLastRenderAtMs: partial.parallelPilotLastRenderAtMs ?? null,
    parallelPilotLastWorkletFrame:
      partial.parallelPilotLastWorkletFrame ?? null,
    parallelPilotAutoMuteReason: partial.parallelPilotAutoMuteReason ?? null,
    parallelPilotRampGuardEnabled: true,
    parallelPilotRampGuardAttackFrames:
      partial.parallelPilotRampGuardAttackFrames ??
      WAVE_STARTER_WORKLET_PARALLEL_PILOT_RAMP_ATTACK_FRAMES,
    parallelPilotRampGuardReleaseFrames:
      partial.parallelPilotRampGuardReleaseFrames ??
      WAVE_STARTER_WORKLET_PARALLEL_PILOT_RAMP_RELEASE_FRAMES,
    parallelPilotRampGuardFrameCount:
      partial.parallelPilotRampGuardFrameCount ?? 0,
    parallelPilotRampGuardQuantumCount:
      partial.parallelPilotRampGuardQuantumCount ?? 0,
    parallelPilotRampGuardPeakGain: partial.parallelPilotRampGuardPeakGain ?? 0,
    parallelPilotRampGuardLastRenderAtMs:
      partial.parallelPilotRampGuardLastRenderAtMs ?? null,
    parallelPilotRampGuardLastWorkletFrame:
      partial.parallelPilotRampGuardLastWorkletFrame ?? null,
    voiceSpecMirrorAcceptedCount: partial.voiceSpecMirrorAcceptedCount ?? 0,
    voiceSpecMirrorRejectedCount: partial.voiceSpecMirrorRejectedCount ?? 0,
    lastVoiceSpecKind: partial.lastVoiceSpecKind ?? null,
    lastVoiceSpecId: partial.lastVoiceSpecId ?? null,
    lastVoiceSpecExactnessLevel: partial.lastVoiceSpecExactnessLevel ?? null,
    lastVoiceSpecMirrorAtMs: partial.lastVoiceSpecMirrorAtMs ?? null,
    synthFailoverCandidatePostedCount:
      partial.synthFailoverCandidatePostedCount ?? 0,
    synthFailoverCandidateAcceptedCount:
      partial.synthFailoverCandidateAcceptedCount ?? 0,
    synthFailoverCandidateRejectedCount:
      partial.synthFailoverCandidateRejectedCount ?? 0,
    synthFailoverRenderFrameCount: partial.synthFailoverRenderFrameCount ?? 0,
    synthFailoverRenderFrameDelta: partial.synthFailoverRenderFrameDelta ?? 0,
    synthFailoverRenderQuantumCount:
      partial.synthFailoverRenderQuantumCount ?? 0,
    synthFailoverPeakAbs: partial.synthFailoverPeakAbs ?? 0,
    synthFailoverLastRenderAtMs: partial.synthFailoverLastRenderAtMs ?? null,
    synthFailoverLastWorkletFrame:
      partial.synthFailoverLastWorkletFrame ?? null,
    synthFailoverLastSpecId: partial.synthFailoverLastSpecId ?? null,
    synthFailoverLastRejectReason:
      partial.synthFailoverLastRejectReason ?? null,
    synthFailoverCandidateGainScale:
      partial.synthFailoverCandidateGainScale ?? 0,
    synthFailoverLastQueuedVoiceCount:
      partial.synthFailoverLastQueuedVoiceCount ?? 0,
    synthFailoverVoicePoolMaxVoices:
      partial.synthFailoverVoicePoolMaxVoices ??
      WAVE_STARTER_WORKLET_SYNTH_FAILOVER_MAX_VOICES,
    synthFailoverVoicePoolAllocatedCount:
      partial.synthFailoverVoicePoolAllocatedCount ?? 0,
    synthFailoverVoicePoolReusedCount:
      partial.synthFailoverVoicePoolReusedCount ?? 0,
    synthFailoverVoicePoolRecycledCount:
      partial.synthFailoverVoicePoolRecycledCount ?? 0,
    synthFailoverVoicePoolDisplacedCount:
      partial.synthFailoverVoicePoolDisplacedCount ?? 0,
    synthFailoverVoicePoolPriorityDisplacedCount:
      partial.synthFailoverVoicePoolPriorityDisplacedCount ?? 0,
    synthFailoverVoicePoolLastDisplacedScore:
      partial.synthFailoverVoicePoolLastDisplacedScore ?? null,
    synthFailoverStealFadeTailQueuedCount:
      partial.synthFailoverStealFadeTailQueuedCount ?? 0,
    synthFailoverStealFadeTailDroppedCount:
      partial.synthFailoverStealFadeTailDroppedCount ?? 0,
    synthFailoverStealFadeTailRenderFrameCount:
      partial.synthFailoverStealFadeTailRenderFrameCount ?? 0,
    synthFailoverStealFadeTailMaxTails:
      partial.synthFailoverStealFadeTailMaxTails ?? WAVE_STARTER_WORKLET_STEAL_FADE_MAX_TAILS,
    synthFailoverVoicePoolFreeCount:
      partial.synthFailoverVoicePoolFreeCount ?? 0,
    synthFailoverVoicePoolCompactionEnabled: true,
    synthFailoverVoicePoolPriorityDisplacementEnabled: true,
    synthFailoverLegacyDropOnly: true,
    sampleFailoverBlockedUntilBufferToken: true,
    sampleFailoverBlockedUntilHydratedToken: true,
    sampleRenderingDisabledUntilPilot: false,
    sampleFailoverPilotRendererEnabled: true,
    sampleFailoverPilotOneShotOnly: true,
    sampleFailoverPilotLoopDisabled: true,
    sampleFailoverCandidatePostedCount:
      partial.sampleFailoverCandidatePostedCount ?? 0,
    sampleFailoverCandidateAcceptedCount:
      partial.sampleFailoverCandidateAcceptedCount ?? 0,
    sampleFailoverCandidateRejectedCount:
      partial.sampleFailoverCandidateRejectedCount ?? 0,
    sampleFailoverLastSpecId: partial.sampleFailoverLastSpecId ?? null,
    sampleFailoverLastToken: partial.sampleFailoverLastToken ?? null,
    sampleFailoverLastRejectReason:
      partial.sampleFailoverLastRejectReason ?? null,
    sampleFailoverRenderingDisabledUntilPilot: false,
    sampleFailoverHydratedTokenRequired: true,
    sampleFailoverRenderFrameCount: partial.sampleFailoverRenderFrameCount ?? 0,
    sampleFailoverRenderFrameDelta: partial.sampleFailoverRenderFrameDelta ?? 0,
    sampleFailoverRenderQuantumCount:
      partial.sampleFailoverRenderQuantumCount ?? 0,
    sampleFailoverPeakAbs: partial.sampleFailoverPeakAbs ?? 0,
    sampleFailoverLastRenderAtMs:
      partial.sampleFailoverLastRenderAtMs ?? null,
    sampleFailoverLastWorkletFrame:
      partial.sampleFailoverLastWorkletFrame ?? null,
    sampleFailoverLastQueuedVoiceCount:
      partial.sampleFailoverLastQueuedVoiceCount ?? 0,
    sampleFailoverVoicePoolMaxVoices:
      partial.sampleFailoverVoicePoolMaxVoices ??
      WAVE_STARTER_WORKLET_SAMPLE_FAILOVER_MAX_VOICES,
    sampleFailoverVoicePoolAllocatedCount:
      partial.sampleFailoverVoicePoolAllocatedCount ?? 0,
    sampleFailoverVoicePoolReusedCount:
      partial.sampleFailoverVoicePoolReusedCount ?? 0,
    sampleFailoverVoicePoolRecycledCount:
      partial.sampleFailoverVoicePoolRecycledCount ?? 0,
    sampleFailoverVoicePoolDisplacedCount:
      partial.sampleFailoverVoicePoolDisplacedCount ?? 0,
    sampleFailoverVoicePoolPriorityDisplacedCount:
      partial.sampleFailoverVoicePoolPriorityDisplacedCount ?? 0,
    sampleFailoverVoicePoolLastDisplacedScore:
      partial.sampleFailoverVoicePoolLastDisplacedScore ?? null,
    sampleFailoverStealFadeTailQueuedCount:
      partial.sampleFailoverStealFadeTailQueuedCount ?? 0,
    sampleFailoverStealFadeTailDroppedCount:
      partial.sampleFailoverStealFadeTailDroppedCount ?? 0,
    sampleFailoverStealFadeTailRenderFrameCount:
      partial.sampleFailoverStealFadeTailRenderFrameCount ?? 0,
    sampleFailoverStealFadeTailMaxTails:
      partial.sampleFailoverStealFadeTailMaxTails ?? WAVE_STARTER_WORKLET_STEAL_FADE_MAX_TAILS,
    sampleFailoverVoicePoolFreeCount:
      partial.sampleFailoverVoicePoolFreeCount ?? 0,
    sampleFailoverVoicePoolCompactionEnabled: true,
    sampleFailoverVoicePoolPriorityDisplacementEnabled: true,
    processorRuntimeOwnershipEnabled: true,
    processorRuntimeLegacyReferencePreserved: true,
    processorRuntimeVoicePoolReusesExistingRenderer: true,
    processorRuntimeSynthVoicePostedCount:
      partial.processorRuntimeSynthVoicePostedCount ?? 0,
    processorRuntimeSampleVoicePostedCount:
      partial.processorRuntimeSampleVoicePostedCount ?? 0,
    processorRuntimeSynthVoiceAcceptedCount:
      partial.processorRuntimeSynthVoiceAcceptedCount ?? 0,
    processorRuntimeSampleVoiceAcceptedCount:
      partial.processorRuntimeSampleVoiceAcceptedCount ?? 0,
    processorRuntimeSynthVoiceRejectedCount:
      partial.processorRuntimeSynthVoiceRejectedCount ?? 0,
    processorRuntimeSampleVoiceRejectedCount:
      partial.processorRuntimeSampleVoiceRejectedCount ?? 0,
    processorRuntimeSegmentClockPulseAcceptedCount:
      partial.processorRuntimeSegmentClockPulseAcceptedCount ?? 0,
    processorRuntimeApostropheSafeExtendAcceptedCount:
      partial.processorRuntimeApostropheSafeExtendAcceptedCount ?? 0,
    processorRuntimeRenderFrameCount:
      partial.processorRuntimeRenderFrameCount ?? 0,
    processorRuntimeRenderFrameDelta:
      partial.processorRuntimeRenderFrameDelta ?? 0,
    processorRuntimeLastSourceIntent:
      partial.processorRuntimeLastSourceIntent ?? null,
    processorRuntimeLastLane: partial.processorRuntimeLastLane ?? null,
    processorRuntimeLastExtendPolicy:
      partial.processorRuntimeLastExtendPolicy ?? null,
    processorRuntimeLastVoiceSpecId:
      partial.processorRuntimeLastVoiceSpecId ?? null,
    processorRuntimeLastRejectReason:
      partial.processorRuntimeLastRejectReason ?? null,
    processorRuntimeActiveSynthVoices:
      partial.processorRuntimeActiveSynthVoices ?? 0,
    processorRuntimeActiveSampleVoices:
      partial.processorRuntimeActiveSampleVoices ?? 0,
    processorRuntimeQueuePressureApprox:
      partial.processorRuntimeQueuePressureApprox ?? 0,
    processorRuntimePressureState:
      partial.processorRuntimePressureState ?? "clear",
    processorRuntimeStolenVoiceCount:
      partial.processorRuntimeStolenVoiceCount ?? 0,
    processorRuntimeStealFadeTailPressure:
      partial.processorRuntimeStealFadeTailPressure ?? 0,
    processorOwnedHoldSchedulerEnabled: true,
    processorOwnedHoldGestureStartPostedCount:
      partial.processorOwnedHoldGestureStartPostedCount ?? 0,
    processorOwnedHoldGestureUpdatePostedCount:
      partial.processorOwnedHoldGestureUpdatePostedCount ?? 0,
    processorOwnedHoldGestureReleasePostedCount:
      partial.processorOwnedHoldGestureReleasePostedCount ?? 0,
    processorOwnedHoldGestureStartAcceptedCount:
      partial.processorOwnedHoldGestureStartAcceptedCount ?? 0,
    processorOwnedHoldGestureUpdateAcceptedCount:
      partial.processorOwnedHoldGestureUpdateAcceptedCount ?? 0,
    processorOwnedHoldGestureReleaseAcceptedCount:
      partial.processorOwnedHoldGestureReleaseAcceptedCount ?? 0,
    processorOwnedHoldGestureRejectedCount:
      partial.processorOwnedHoldGestureRejectedCount ?? 0,
    processorOwnedHoldGestureActiveCount:
      partial.processorOwnedHoldGestureActiveCount ?? 0,
    processorOwnedHoldSegmentPulseCount:
      partial.processorOwnedHoldSegmentPulseCount ?? 0,
    processorOwnedHoldSynthVoiceCreatedCount:
      partial.processorOwnedHoldSynthVoiceCreatedCount ?? 0,
    processorOwnedHoldSchedulerActive:
      partial.processorOwnedHoldSchedulerActive ?? false,
    processorOwnedHoldLastGestureId:
      partial.processorOwnedHoldLastGestureId ?? null,
    processorOwnedHoldLastLane:
      partial.processorOwnedHoldLastLane ?? null,
    processorOwnedHoldLastSegmentsPerBar:
      partial.processorOwnedHoldLastSegmentsPerBar ?? null,
    processorOwnedHoldLastPitchHz:
      partial.processorOwnedHoldLastPitchHz ?? null,
    processorOwnedHoldLastRejectReason:
      partial.processorOwnedHoldLastRejectReason ?? null,
    sampleBufferTokenShadowPostedCount:
      partial.sampleBufferTokenShadowPostedCount ?? 0,
    sampleBufferTokenShadowAcceptedCount:
      partial.sampleBufferTokenShadowAcceptedCount ?? 0,
    sampleBufferTokenShadowRejectedCount:
      partial.sampleBufferTokenShadowRejectedCount ?? 0,
    sampleBufferTokenHydratedCount:
      partial.sampleBufferTokenHydratedCount ?? 0,
    sampleBufferLastToken: partial.sampleBufferLastToken ?? null,
    sampleBufferLastRejectReason: partial.sampleBufferLastRejectReason ?? null,
    sampleBufferLastFrameCount: partial.sampleBufferLastFrameCount ?? 0,
    sampleBufferLastChannelCount: partial.sampleBufferLastChannelCount ?? 0,
    lastAcceptedSequence: partial.lastAcceptedSequence ?? 0,
    lastPostedSequence: partial.lastPostedSequence ?? 0,
    lastRejectedReason: partial.lastRejectedReason ?? null,
    pendingIntentCount: partial.pendingIntentCount ?? 0,
    latestIntentReplacedCount: partial.latestIntentReplacedCount ?? 0,
    keepAliveConnected: partial.keepAliveConnected ?? false,
    outputConnected: partial.outputConnected ?? false,
    silentShadowOnly: false,
    preservesMainThreadReferencePath: true,
    fileOriginLikelyBlocked:
      partial.fileOriginLikelyBlocked ?? isLocalFileOriginContext(),
    detail: partial.detail ?? null,
    errorMessage: partial.errorMessage ?? null,
  };
}

export function publishWaveStarterWorkletPilotSnapshot(
  snapshot: WaveStarterWorkletPilotSnapshot,
): WaveStarterWorkletPilotSnapshot {
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[
      WAVE_STARTER_WORKLET_PILOT_GLOBAL
    ] = snapshot;
  }
  return snapshot;
}

export function readWaveStarterWorkletPilotReportFromBrowser(): WaveStarterWorkletPilotSnapshot | null {
  if (typeof window === "undefined") return null;
  const value = (window as unknown as Record<string, unknown>)[
    WAVE_STARTER_WORKLET_PILOT_GLOBAL
  ];
  return value && typeof value === "object"
    ? (value as WaveStarterWorkletPilotSnapshot)
    : null;
}

export function formatWaveStarterWorkletPilotUiValue(
  report: WaveStarterWorkletPilotSnapshot | null,
): string {
  if (!report) return "not-requested · shadow-pilot noch nicht beobachtet";
  const frame = `${report.renderedFrameDelta}Δ/${report.activeRenderQuantumCount}Q`;
  const shape = `shape ${report.audioShapeProbeFrameDelta}Δ/${report.audioShapeProbeQuantumCount}Q · peak ${report.audioShapeProbePeakAbs.toFixed(3)}`;
  const ramp = `ramp ${report.parallelPilotRampGuardFrameCount}f/${report.parallelPilotRampGuardQuantumCount}Q · ${report.parallelPilotRampGuardAttackFrames}/${report.parallelPilotRampGuardReleaseFrames}f`;
  const pilot = `mix ${report.parallelPilotRenderFrameDelta}Δ/${report.parallelPilotRenderQuantumCount}Q · ${report.parallelPilotGainDb.toFixed(1)}dB · peak ${report.parallelPilotPeakAbs.toFixed(4)} · ${ramp}${report.parallelPilotAutoMuteReason ? ` · muted ${report.parallelPilotAutoMuteReason}` : ""}`;
  const intent = `I ${report.postedIntentCount} · A ${report.ackedIntentCount}`;
  const spec = `spec ${report.lastVoiceSpecKind ?? "none"} · mirror ${report.voiceSpecMirrorAcceptedCount}`;
  const synthFailover = `failover ${report.synthFailoverRenderFrameDelta}Δ/${report.synthFailoverRenderQuantumCount}Q · W ${report.synthFailoverCandidateAcceptedCount}/${report.synthFailoverCandidateRejectedCount} · peak ${report.synthFailoverPeakAbs.toFixed(4)}`;
  const sampleShadow = `sample-token ${report.sampleBufferTokenShadowAcceptedCount}/${report.sampleBufferTokenShadowRejectedCount} · hydrated ${report.sampleBufferTokenHydratedCount} · frames ${report.sampleBufferLastFrameCount}`;
  const pool = `pool Sy ${report.synthFailoverLastQueuedVoiceCount}/${report.synthFailoverVoicePoolMaxVoices} R${report.synthFailoverVoicePoolReusedCount}/${report.synthFailoverVoicePoolRecycledCount} D${report.synthFailoverVoicePoolDisplacedCount}/P${report.synthFailoverVoicePoolPriorityDisplacedCount} · Sa ${report.sampleFailoverLastQueuedVoiceCount}/${report.sampleFailoverVoicePoolMaxVoices} R${report.sampleFailoverVoicePoolReusedCount}/${report.sampleFailoverVoicePoolRecycledCount} D${report.sampleFailoverVoicePoolDisplacedCount}/P${report.sampleFailoverVoicePoolPriorityDisplacedCount}`;
  const fallback =
    report.status === "unsupported" || report.status === "failed"
      ? ` · fallback ${report.detail ?? report.errorMessage ?? "legacy-reference"}`
      : "";
  return `${report.decision} · ${report.status} · ${intent} · ${spec} · ${frame} · ${shape} · ${pilot} · ${synthFailover} · ${sampleShadow} · ${pool}${fallback}`;
}
