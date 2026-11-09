import {
  recordWaveStarterFailoverCandidateAckLedgerEntry,
  recordWaveStarterFailoverCandidateRejectLedgerEntry,
} from "./waveStarterFailoverEventLedger";
import {
  createWaveStarterWorkletPilotSnapshot as baseSnapshot,
  publishWaveStarterWorkletPilotSnapshot as publishSnapshot,
} from "./waveStarterWorkletPilotReport";
import type { WaveStarterWorkletPilotSnapshot } from "./waveStarterWorkletPilotReport";

type WaveStarterWorkletPilotMessageHandle = {
  snapshot: WaveStarterWorkletPilotSnapshot;
};

let lastRenderedFrameCount = 0;
let lastRenderedFrameDelta = 0;
let lastAudioShapeProbeFrameCount = 0;
let lastAudioShapeProbeFrameDelta = 0;
let lastParallelPilotRenderFrameCount = 0;
let lastParallelPilotRenderFrameDelta = 0;
let lastParallelPilotRampGuardFrameCount = 0;
let lastSynthFailoverRenderFrameCount = 0;
let lastSynthFailoverRenderFrameDelta = 0;
let lastSampleFailoverRenderFrameCount = 0;
let lastSampleFailoverRenderFrameDelta = 0;
let lastProcessorRuntimeRenderFrameCount = 0;
let lastProcessorRuntimeRenderFrameDelta = 0;

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export function attachWaveStarterWorkletPilotMessageReducer(
  node: AudioWorkletNode,
  nextHandle: WaveStarterWorkletPilotMessageHandle,
): void {
    node.port.onmessage = (event: MessageEvent) => {
      const message = (event.data || {}) as Record<string, unknown>;
      const receivedAtMs = nowMs();
      if (message.type === "wave-starter-shadow-ready") {
        nextHandle.snapshot = publishSnapshot(
          baseSnapshot({
            ...nextHandle.snapshot,
            status: "loaded",
            lastMessageAtMs: receivedAtMs,
            readyMessageCount:
              Number(message.readyMessageCount) ||
              nextHandle.snapshot.readyMessageCount + 1,
            detail: "wave-starter-shadow-pilot-ready",
          }),
        );
        return;
      }
      if (message.type === "wave-starter-shadow-intent-ack") {
        nextHandle.snapshot = publishSnapshot(
          baseSnapshot({
            ...nextHandle.snapshot,
            lastMessageAtMs: receivedAtMs,
            lastIntentAckAtMs: receivedAtMs,
            ackedIntentCount:
              Number(message.acceptedIntentCount) ||
              nextHandle.snapshot.ackedIntentCount + 1,
            latestIntentReplacedCount:
              Number(message.latestIntentReplacedCount) ||
              nextHandle.snapshot.latestIntentReplacedCount,
            lastAcceptedSequence:
              Number(message.sequence) ||
              nextHandle.snapshot.lastAcceptedSequence,
            detail: "wave-starter-shadow-intent-acked",
          }),
        );
        return;
      }
      if (message.type === "wave-starter-shadow-intent-rejected") {
        nextHandle.snapshot = publishSnapshot(
          baseSnapshot({
            ...nextHandle.snapshot,
            lastMessageAtMs: receivedAtMs,
            rejectedIntentCount:
              Number(message.rejectedIntentCount) ||
              nextHandle.snapshot.rejectedIntentCount + 1,
            lastRejectedReason:
              typeof message.reason === "string"
                ? message.reason
                : "unknown-rejection",
            detail: "wave-starter-shadow-intent-rejected",
          }),
        );
        return;
      }
      if (message.type === "wave-starter-voice-spec-shadow-ack") {
        nextHandle.snapshot = publishSnapshot(
          baseSnapshot({
            ...nextHandle.snapshot,
            lastMessageAtMs: receivedAtMs,
            voiceSpecMirrorAcceptedCount:
              Number(message.voiceSpecMirrorAcceptedCount) ||
              nextHandle.snapshot.voiceSpecMirrorAcceptedCount + 1,
            lastVoiceSpecKind:
              message.lastVoiceSpecKind === "sample"
                ? "sample"
                : message.lastVoiceSpecKind === "synth"
                  ? "synth"
                  : nextHandle.snapshot.lastVoiceSpecKind,
            lastVoiceSpecId:
              typeof message.lastVoiceSpecId === "string"
                ? message.lastVoiceSpecId
                : nextHandle.snapshot.lastVoiceSpecId,
            lastVoiceSpecExactnessLevel:
              typeof message.lastVoiceSpecExactnessLevel === "string"
                ? message.lastVoiceSpecExactnessLevel
                : nextHandle.snapshot.lastVoiceSpecExactnessLevel,
            lastVoiceSpecMirrorAtMs: receivedAtMs,
            detail: "wave-starter-voice-spec-shadow-acked",
          }),
        );
        return;
      }
      if (message.type === "wave-starter-voice-spec-shadow-rejected") {
        nextHandle.snapshot = publishSnapshot(
          baseSnapshot({
            ...nextHandle.snapshot,
            lastMessageAtMs: receivedAtMs,
            voiceSpecMirrorRejectedCount:
              Number(message.voiceSpecMirrorRejectedCount) ||
              nextHandle.snapshot.voiceSpecMirrorRejectedCount + 1,
            lastRejectedReason:
              typeof message.reason === "string"
                ? message.reason
                : "voice-spec-shadow-rejected",
            detail: "wave-starter-voice-spec-shadow-rejected",
          }),
        );
        return;
      }
      if (message.type === "wave-starter-sample-buffer-token-shadow-ack") {
        nextHandle.snapshot = publishSnapshot(
          baseSnapshot({
            ...nextHandle.snapshot,
            lastMessageAtMs: receivedAtMs,
            sampleBufferTokenShadowAcceptedCount:
              Number(message.sampleBufferTokenShadowAcceptedCount) ||
              nextHandle.snapshot.sampleBufferTokenShadowAcceptedCount + 1,
            sampleBufferTokenHydratedCount:
              Number(message.sampleBufferTokenHydratedCount) ||
              nextHandle.snapshot.sampleBufferTokenHydratedCount + 1,
            sampleBufferLastToken:
              typeof message.sampleBufferLastToken === "string"
                ? message.sampleBufferLastToken
                : nextHandle.snapshot.sampleBufferLastToken,
            sampleBufferLastFrameCount:
              Number(message.sampleBufferLastFrameCount) ||
              nextHandle.snapshot.sampleBufferLastFrameCount,
            sampleBufferLastChannelCount:
              Number(message.sampleBufferLastChannelCount) ||
              nextHandle.snapshot.sampleBufferLastChannelCount,
            sampleBufferLastRejectReason: null,
            detail: "wave-starter-sample-buffer-token-shadow-acked",
          }),
        );
        return;
      }
      if (message.type === "wave-starter-sample-buffer-token-shadow-rejected") {
        nextHandle.snapshot = publishSnapshot(
          baseSnapshot({
            ...nextHandle.snapshot,
            lastMessageAtMs: receivedAtMs,
            sampleBufferTokenShadowRejectedCount:
              Number(message.sampleBufferTokenShadowRejectedCount) ||
              nextHandle.snapshot.sampleBufferTokenShadowRejectedCount + 1,
            sampleBufferLastToken:
              typeof message.sampleBufferLastToken === "string"
                ? message.sampleBufferLastToken
                : nextHandle.snapshot.sampleBufferLastToken,
            sampleBufferLastRejectReason:
              typeof message.reason === "string"
                ? message.reason
                : "sample-buffer-token-shadow-rejected",
            detail: "wave-starter-sample-buffer-token-shadow-rejected",
          }),
        );
        return;
      }
      if (message.type === "wave-starter-sample-failover-candidate-ack") {
        recordWaveStarterFailoverCandidateAckLedgerEntry({
          failoverKind: "sample",
          sequence: Number(message.sequence) || null,
          voiceSpecId: typeof message.sampleFailoverLastSpecId === "string" ? message.sampleFailoverLastSpecId : nextHandle.snapshot.sampleFailoverLastSpecId,
          bufferToken: typeof message.sampleFailoverLastToken === "string" ? message.sampleFailoverLastToken : nextHandle.snapshot.sampleFailoverLastToken,
          workletTimeSec: Number(message.workletTimeSec) || null,
        });
        nextHandle.snapshot = publishSnapshot(
          baseSnapshot({
            ...nextHandle.snapshot,
            lastMessageAtMs: receivedAtMs,
            sampleFailoverCandidateAcceptedCount:
              Number(message.sampleFailoverCandidateAcceptedCount) ||
              nextHandle.snapshot.sampleFailoverCandidateAcceptedCount + 1,
            sampleFailoverLastSpecId:
              typeof message.sampleFailoverLastSpecId === "string"
                ? message.sampleFailoverLastSpecId
                : nextHandle.snapshot.sampleFailoverLastSpecId,
            sampleFailoverLastToken:
              typeof message.sampleFailoverLastToken === "string"
                ? message.sampleFailoverLastToken
                : nextHandle.snapshot.sampleFailoverLastToken,
            sampleFailoverLastRejectReason: null,
            sampleBufferTokenHydratedCount:
              Number(message.sampleBufferTokenHydratedCount) ||
              nextHandle.snapshot.sampleBufferTokenHydratedCount,
            sampleBufferLastFrameCount:
              Number(message.sampleBufferLastFrameCount) ||
              nextHandle.snapshot.sampleBufferLastFrameCount,
            sampleBufferLastChannelCount:
              Number(message.sampleBufferLastChannelCount) ||
              nextHandle.snapshot.sampleBufferLastChannelCount,
            sampleFailoverLastQueuedVoiceCount:
              Number(message.sampleFailoverLastQueuedVoiceCount) ||
              nextHandle.snapshot.sampleFailoverLastQueuedVoiceCount,
            processorRuntimeSampleVoiceAcceptedCount:
              Number(message.processorRuntimeSampleVoiceAcceptedCount) ||
              nextHandle.snapshot.processorRuntimeSampleVoiceAcceptedCount,
            processorRuntimeSegmentClockPulseAcceptedCount:
              Number(message.processorRuntimeSegmentClockPulseAcceptedCount) ||
              nextHandle.snapshot.processorRuntimeSegmentClockPulseAcceptedCount,
            processorRuntimeApostropheSafeExtendAcceptedCount:
              Number(message.processorRuntimeApostropheSafeExtendAcceptedCount) ||
              nextHandle.snapshot.processorRuntimeApostropheSafeExtendAcceptedCount,
            processorRuntimeLastSourceIntent:
              typeof message.processorRuntimeLastSourceIntent === "string"
                ? message.processorRuntimeLastSourceIntent
                : nextHandle.snapshot.processorRuntimeLastSourceIntent,
            processorRuntimeLastLane:
              typeof message.processorRuntimeLastLane === "string"
                ? message.processorRuntimeLastLane
                : nextHandle.snapshot.processorRuntimeLastLane,
            processorRuntimeLastExtendPolicy:
              typeof message.processorRuntimeLastExtendPolicy === "string"
                ? message.processorRuntimeLastExtendPolicy
                : nextHandle.snapshot.processorRuntimeLastExtendPolicy,
            detail:
              "wave-starter-processor-runtime-sample-voice-acked-renderer-queued",
          }),
        );
        return;
      }
      if (message.type === "wave-starter-sample-failover-candidate-rejected") {
        recordWaveStarterFailoverCandidateRejectLedgerEntry({
          failoverKind: "sample",
          sequence: Number(message.sequence) || null,
          voiceSpecId: typeof message.sampleFailoverLastSpecId === "string" ? message.sampleFailoverLastSpecId : nextHandle.snapshot.sampleFailoverLastSpecId,
          bufferToken: typeof message.sampleFailoverLastToken === "string" ? message.sampleFailoverLastToken : nextHandle.snapshot.sampleFailoverLastToken,
          reason: typeof message.reason === "string" ? message.reason : "sample-failover-candidate-rejected",
          workletTimeSec: Number(message.workletTimeSec) || null,
        });
        nextHandle.snapshot = publishSnapshot(
          baseSnapshot({
            ...nextHandle.snapshot,
            lastMessageAtMs: receivedAtMs,
            sampleFailoverCandidateRejectedCount:
              Number(message.sampleFailoverCandidateRejectedCount) ||
              nextHandle.snapshot.sampleFailoverCandidateRejectedCount + 1,
            sampleFailoverLastSpecId:
              typeof message.sampleFailoverLastSpecId === "string"
                ? message.sampleFailoverLastSpecId
                : nextHandle.snapshot.sampleFailoverLastSpecId,
            sampleFailoverLastToken:
              typeof message.sampleFailoverLastToken === "string"
                ? message.sampleFailoverLastToken
                : nextHandle.snapshot.sampleFailoverLastToken,
            sampleFailoverLastRejectReason:
              typeof message.reason === "string"
                ? message.reason
                : "sample-failover-candidate-rejected",
            detail: "wave-starter-sample-failover-candidate-rejected",
          }),
        );
        return;
      }
      if (message.type === "wave-starter-synth-failover-candidate-ack") {
        recordWaveStarterFailoverCandidateAckLedgerEntry({
          failoverKind: "synth",
          sequence: Number(message.sequence) || null,
          voiceSpecId: typeof message.synthFailoverLastSpecId === "string" ? message.synthFailoverLastSpecId : nextHandle.snapshot.synthFailoverLastSpecId,
          workletTimeSec: Number(message.workletTimeSec) || null,
        });
        nextHandle.snapshot = publishSnapshot(
          baseSnapshot({
            ...nextHandle.snapshot,
            lastMessageAtMs: receivedAtMs,
            synthFailoverCandidateAcceptedCount:
              Number(message.synthFailoverCandidateAcceptedCount) ||
              nextHandle.snapshot.synthFailoverCandidateAcceptedCount + 1,
            synthFailoverLastSpecId:
              typeof message.synthFailoverLastSpecId === "string"
                ? message.synthFailoverLastSpecId
                : nextHandle.snapshot.synthFailoverLastSpecId,
            synthFailoverCandidateGainScale:
              Number(message.synthFailoverCandidateGainScale) ||
              nextHandle.snapshot.synthFailoverCandidateGainScale ||
              1,
            synthFailoverLastQueuedVoiceCount:
              Number(message.synthFailoverLastQueuedVoiceCount) ||
              nextHandle.snapshot.synthFailoverLastQueuedVoiceCount,
            synthFailoverVoicePoolDisplacedCount:
              Number(message.synthFailoverVoicePoolDisplacedCount) ||
              nextHandle.snapshot.synthFailoverVoicePoolDisplacedCount,
            processorRuntimeSynthVoiceAcceptedCount:
              Number(message.processorRuntimeSynthVoiceAcceptedCount) ||
              nextHandle.snapshot.processorRuntimeSynthVoiceAcceptedCount,
            processorRuntimeSegmentClockPulseAcceptedCount:
              Number(message.processorRuntimeSegmentClockPulseAcceptedCount) ||
              nextHandle.snapshot.processorRuntimeSegmentClockPulseAcceptedCount,
            processorRuntimeApostropheSafeExtendAcceptedCount:
              Number(message.processorRuntimeApostropheSafeExtendAcceptedCount) ||
              nextHandle.snapshot.processorRuntimeApostropheSafeExtendAcceptedCount,
            processorRuntimeLastSourceIntent:
              typeof message.processorRuntimeLastSourceIntent === "string"
                ? message.processorRuntimeLastSourceIntent
                : nextHandle.snapshot.processorRuntimeLastSourceIntent,
            processorRuntimeLastLane:
              typeof message.processorRuntimeLastLane === "string"
                ? message.processorRuntimeLastLane
                : nextHandle.snapshot.processorRuntimeLastLane,
            processorRuntimeLastExtendPolicy:
              typeof message.processorRuntimeLastExtendPolicy === "string"
                ? message.processorRuntimeLastExtendPolicy
                : nextHandle.snapshot.processorRuntimeLastExtendPolicy,
            detail: "wave-starter-processor-runtime-synth-voice-acked",
          }),
        );
        return;
      }
      if (message.type === "wave-starter-synth-failover-candidate-rejected") {
        recordWaveStarterFailoverCandidateRejectLedgerEntry({
          failoverKind: "synth",
          sequence: Number(message.sequence) || null,
          voiceSpecId: typeof message.synthFailoverLastSpecId === "string" ? message.synthFailoverLastSpecId : nextHandle.snapshot.synthFailoverLastSpecId,
          reason: typeof message.reason === "string" ? message.reason : "synth-failover-candidate-rejected",
          workletTimeSec: Number(message.workletTimeSec) || null,
        });
        nextHandle.snapshot = publishSnapshot(
          baseSnapshot({
            ...nextHandle.snapshot,
            lastMessageAtMs: receivedAtMs,
            synthFailoverCandidateRejectedCount:
              Number(message.synthFailoverCandidateRejectedCount) ||
              nextHandle.snapshot.synthFailoverCandidateRejectedCount + 1,
            synthFailoverLastRejectReason:
              typeof message.reason === "string"
                ? message.reason
                : "synth-failover-candidate-rejected",
            detail: "wave-starter-synth-failover-candidate-rejected",
          }),
        );
        return;
      }
      if (
        message.type === "wave-starter-processor-hold-gesture-start-ack" ||
        message.type === "wave-starter-processor-hold-gesture-update-ack" ||
        message.type === "wave-starter-processor-hold-gesture-release-ack" ||
        message.type === "wave-starter-processor-hold-gesture-rejected"
      ) {
        const rejected = message.type === "wave-starter-processor-hold-gesture-rejected";
        nextHandle.snapshot = publishSnapshot(
          baseSnapshot({
            ...nextHandle.snapshot,
            lastMessageAtMs: receivedAtMs,
            processorOwnedHoldGestureStartAcceptedCount:
              Number(message.processorOwnedHoldGestureStartAcceptedCount) ||
              nextHandle.snapshot.processorOwnedHoldGestureStartAcceptedCount,
            processorOwnedHoldGestureUpdateAcceptedCount:
              Number(message.processorOwnedHoldGestureUpdateAcceptedCount) ||
              nextHandle.snapshot.processorOwnedHoldGestureUpdateAcceptedCount,
            processorOwnedHoldGestureReleaseAcceptedCount:
              Number(message.processorOwnedHoldGestureReleaseAcceptedCount) ||
              nextHandle.snapshot.processorOwnedHoldGestureReleaseAcceptedCount,
            processorOwnedHoldGestureRejectedCount:
              Number(message.processorOwnedHoldGestureRejectedCount) ||
              nextHandle.snapshot.processorOwnedHoldGestureRejectedCount,
            processorOwnedHoldGestureActiveCount:
              Number(message.processorOwnedHoldGestureActiveCount) || 0,
            processorOwnedHoldSchedulerActive:
              (Number(message.processorOwnedHoldGestureActiveCount) || 0) > 0,
            processorOwnedHoldLastGestureId:
              typeof message.processorOwnedHoldLastGestureId === "string"
                ? message.processorOwnedHoldLastGestureId
                : nextHandle.snapshot.processorOwnedHoldLastGestureId,
            processorOwnedHoldLastLane:
              typeof message.processorOwnedHoldLastLane === "string"
                ? message.processorOwnedHoldLastLane
                : nextHandle.snapshot.processorOwnedHoldLastLane,
            processorOwnedHoldLastSegmentsPerBar:
              typeof message.processorOwnedHoldLastSegmentsPerBar === "number"
                ? message.processorOwnedHoldLastSegmentsPerBar
                : nextHandle.snapshot.processorOwnedHoldLastSegmentsPerBar,
            processorOwnedHoldLastPitchHz:
              typeof message.processorOwnedHoldLastPitchHz === "number"
                ? message.processorOwnedHoldLastPitchHz
                : nextHandle.snapshot.processorOwnedHoldLastPitchHz,
            processorOwnedHoldLastRejectReason:
              rejected && typeof message.reason === "string"
                ? message.reason
                : nextHandle.snapshot.processorOwnedHoldLastRejectReason,
            detail: rejected
              ? "wave-starter-processor-owned-hold-gesture-rejected"
              : "wave-starter-processor-owned-hold-gesture-ack",
          }),
        );
        return;
      }
      if (message.type === "wave-starter-shadow-throughput") {
        const renderedFrameCount = Number(message.renderedFrameCount) || 0;
        const renderedFrameDelta = Math.max(
          0,
          renderedFrameCount - lastRenderedFrameCount,
        );
        if (renderedFrameDelta > 0) {
          lastRenderedFrameDelta = renderedFrameDelta;
          lastRenderedFrameCount = renderedFrameCount;
        }
        const audioShapeProbeFrameCount =
          Number(message.audioShapeProbeFrameCount) || 0;
        const audioShapeProbeFrameDelta = Math.max(
          0,
          audioShapeProbeFrameCount - lastAudioShapeProbeFrameCount,
        );
        if (audioShapeProbeFrameDelta > 0) {
          lastAudioShapeProbeFrameDelta = audioShapeProbeFrameDelta;
          lastAudioShapeProbeFrameCount = audioShapeProbeFrameCount;
        }
        const parallelPilotRenderFrameCount =
          Number(message.parallelPilotRenderFrameCount) || 0;
        const parallelPilotRenderFrameDelta = Math.max(
          0,
          parallelPilotRenderFrameCount - lastParallelPilotRenderFrameCount,
        );
        if (parallelPilotRenderFrameDelta > 0) {
          lastParallelPilotRenderFrameDelta = parallelPilotRenderFrameDelta;
          lastParallelPilotRenderFrameCount = parallelPilotRenderFrameCount;
        }
        const parallelPilotRampGuardFrameCount =
          Number(message.parallelPilotRampGuardFrameCount) || 0;
        const parallelPilotRampGuardFrameDelta = Math.max(
          0,
          parallelPilotRampGuardFrameCount -
            lastParallelPilotRampGuardFrameCount,
        );
        if (parallelPilotRampGuardFrameDelta > 0) {
          lastParallelPilotRampGuardFrameCount =
            parallelPilotRampGuardFrameCount;
        }
        const synthFailoverRenderFrameCount =
          Number(message.synthFailoverRenderFrameCount) || 0;
        const synthFailoverRenderFrameDelta = Math.max(
          0,
          synthFailoverRenderFrameCount - lastSynthFailoverRenderFrameCount,
        );
        if (synthFailoverRenderFrameDelta > 0) {
          lastSynthFailoverRenderFrameDelta = synthFailoverRenderFrameDelta;
          lastSynthFailoverRenderFrameCount = synthFailoverRenderFrameCount;
        }
        const sampleFailoverRenderFrameCount =
          Number(message.sampleFailoverRenderFrameCount) || 0;
        const sampleFailoverRenderFrameDelta = Math.max(
          0,
          sampleFailoverRenderFrameCount - lastSampleFailoverRenderFrameCount,
        );
        if (sampleFailoverRenderFrameDelta > 0) {
          lastSampleFailoverRenderFrameDelta = sampleFailoverRenderFrameDelta;
          lastSampleFailoverRenderFrameCount = sampleFailoverRenderFrameCount;
        }
        const processorRuntimeRenderFrameCount =
          Number(message.processorRuntimeRenderFrameCount) || 0;
        const processorRuntimeRenderFrameDelta = Math.max(
          0,
          processorRuntimeRenderFrameCount - lastProcessorRuntimeRenderFrameCount,
        );
        if (processorRuntimeRenderFrameDelta > 0) {
          lastProcessorRuntimeRenderFrameDelta = processorRuntimeRenderFrameDelta;
          lastProcessorRuntimeRenderFrameCount = processorRuntimeRenderFrameCount;
        }
        nextHandle.snapshot = publishSnapshot(
          baseSnapshot({
            ...nextHandle.snapshot,
            lastMessageAtMs: receivedAtMs,
            processQuantumCount:
              Number(message.processQuantumCount) ||
              nextHandle.snapshot.processQuantumCount,
            renderedFrameCount,
            renderedFrameDelta: lastRenderedFrameDelta,
            activeRenderQuantumCount:
              Number(message.activeRenderQuantumCount) ||
              nextHandle.snapshot.activeRenderQuantumCount,
            audioShapeProbeFrameCount,
            audioShapeProbeFrameDelta: lastAudioShapeProbeFrameDelta,
            audioShapeProbeQuantumCount:
              Number(message.audioShapeProbeQuantumCount) ||
              nextHandle.snapshot.audioShapeProbeQuantumCount,
            audioShapeProbePeakAbs:
              Number(message.audioShapeProbePeakAbs) ||
              nextHandle.snapshot.audioShapeProbePeakAbs,
            audioShapeProbeCompletedCount:
              Number(message.audioShapeProbeCompletedCount) ||
              nextHandle.snapshot.audioShapeProbeCompletedCount,
            audioShapeProbeLastFrequencyHz:
              Number(message.audioShapeProbeLastFrequencyHz) ||
              nextHandle.snapshot.audioShapeProbeLastFrequencyHz,
            audioShapeProbeLastWorkletFrame:
              Number(message.audioShapeProbeLastWorkletFrame) ||
              nextHandle.snapshot.audioShapeProbeLastWorkletFrame,
            audioShapeProbeLastRenderAtMs:
              audioShapeProbeFrameDelta > 0
                ? receivedAtMs
                : nextHandle.snapshot.audioShapeProbeLastRenderAtMs,
            parallelPilotMutedFrameCount:
              Number(message.parallelPilotMutedFrameCount) ||
              nextHandle.snapshot.parallelPilotMutedFrameCount,
            parallelPilotRenderFrameCount,
            parallelPilotRenderFrameDelta: lastParallelPilotRenderFrameDelta,
            parallelPilotRenderQuantumCount:
              Number(message.parallelPilotRenderQuantumCount) ||
              nextHandle.snapshot.parallelPilotRenderQuantumCount,
            parallelPilotPeakAbs:
              Number(message.parallelPilotPeakAbs) ||
              nextHandle.snapshot.parallelPilotPeakAbs,
            parallelPilotLastRenderAtMs:
              parallelPilotRenderFrameDelta > 0
                ? receivedAtMs
                : nextHandle.snapshot.parallelPilotLastRenderAtMs,
            parallelPilotLastWorkletFrame:
              Number(message.parallelPilotLastWorkletFrame) ||
              nextHandle.snapshot.parallelPilotLastWorkletFrame,
            parallelPilotAutoMuteReason:
              typeof message.parallelPilotAutoMuteReason === "string"
                ? message.parallelPilotAutoMuteReason
                : null,
            parallelPilotRampGuardAttackFrames:
              Number(message.parallelPilotRampGuardAttackFrames) ||
              nextHandle.snapshot.parallelPilotRampGuardAttackFrames,
            parallelPilotRampGuardReleaseFrames:
              Number(message.parallelPilotRampGuardReleaseFrames) ||
              nextHandle.snapshot.parallelPilotRampGuardReleaseFrames,
            parallelPilotRampGuardFrameCount,
            parallelPilotRampGuardQuantumCount:
              Number(message.parallelPilotRampGuardQuantumCount) ||
              nextHandle.snapshot.parallelPilotRampGuardQuantumCount,
            parallelPilotRampGuardPeakGain:
              Number(message.parallelPilotRampGuardPeakGain) ||
              nextHandle.snapshot.parallelPilotRampGuardPeakGain,
            parallelPilotRampGuardLastRenderAtMs:
              parallelPilotRampGuardFrameDelta > 0
                ? receivedAtMs
                : nextHandle.snapshot.parallelPilotRampGuardLastRenderAtMs,
            parallelPilotRampGuardLastWorkletFrame:
              Number(message.parallelPilotRampGuardLastWorkletFrame) ||
              nextHandle.snapshot.parallelPilotRampGuardLastWorkletFrame,
            pendingIntentCount: Number(message.pendingIntentCount) || 0,
            lastAcceptedSequence:
              Number(message.lastAcceptedSequence) ||
              nextHandle.snapshot.lastAcceptedSequence,
            latestIntentReplacedCount:
              Number(message.latestIntentReplacedCount) ||
              nextHandle.snapshot.latestIntentReplacedCount,
            voiceSpecMirrorAcceptedCount:
              Number(message.voiceSpecMirrorAcceptedCount) ||
              nextHandle.snapshot.voiceSpecMirrorAcceptedCount,
            voiceSpecMirrorRejectedCount:
              Number(message.voiceSpecMirrorRejectedCount) ||
              nextHandle.snapshot.voiceSpecMirrorRejectedCount,
            lastVoiceSpecKind:
              message.lastVoiceSpecKind === "sample"
                ? "sample"
                : message.lastVoiceSpecKind === "synth"
                  ? "synth"
                  : nextHandle.snapshot.lastVoiceSpecKind,
            lastVoiceSpecId:
              typeof message.lastVoiceSpecId === "string"
                ? message.lastVoiceSpecId
                : nextHandle.snapshot.lastVoiceSpecId,
            lastVoiceSpecExactnessLevel:
              typeof message.lastVoiceSpecExactnessLevel === "string"
                ? message.lastVoiceSpecExactnessLevel
                : nextHandle.snapshot.lastVoiceSpecExactnessLevel,
            synthFailoverCandidateAcceptedCount:
              Number(message.synthFailoverCandidateAcceptedCount) ||
              nextHandle.snapshot.synthFailoverCandidateAcceptedCount,
            synthFailoverCandidateRejectedCount:
              Number(message.synthFailoverCandidateRejectedCount) ||
              nextHandle.snapshot.synthFailoverCandidateRejectedCount,
            synthFailoverRenderFrameCount,
            synthFailoverRenderFrameDelta: lastSynthFailoverRenderFrameDelta,
            synthFailoverRenderQuantumCount:
              Number(message.synthFailoverRenderQuantumCount) ||
              nextHandle.snapshot.synthFailoverRenderQuantumCount,
            synthFailoverPeakAbs:
              Number(message.synthFailoverPeakAbs) ||
              nextHandle.snapshot.synthFailoverPeakAbs,
            synthFailoverLastRenderAtMs:
              synthFailoverRenderFrameDelta > 0
                ? receivedAtMs
                : nextHandle.snapshot.synthFailoverLastRenderAtMs,
            synthFailoverLastWorkletFrame:
              Number(message.synthFailoverLastWorkletFrame) ||
              nextHandle.snapshot.synthFailoverLastWorkletFrame,
            synthFailoverLastSpecId:
              typeof message.synthFailoverLastSpecId === "string"
                ? message.synthFailoverLastSpecId
                : nextHandle.snapshot.synthFailoverLastSpecId,
            synthFailoverLastRejectReason:
              typeof message.synthFailoverLastRejectReason === "string"
                ? message.synthFailoverLastRejectReason
                : nextHandle.snapshot.synthFailoverLastRejectReason,
            synthFailoverCandidateGainScale:
              Number(message.synthFailoverCandidateGainScale) ||
              nextHandle.snapshot.synthFailoverCandidateGainScale,
            synthFailoverLastQueuedVoiceCount:
              Number(message.synthFailoverLastQueuedVoiceCount) ||
              nextHandle.snapshot.synthFailoverLastQueuedVoiceCount,
            synthFailoverVoicePoolMaxVoices:
              Number(message.synthFailoverVoicePoolMaxVoices) ||
              nextHandle.snapshot.synthFailoverVoicePoolMaxVoices,
            synthFailoverVoicePoolAllocatedCount:
              Number(message.synthFailoverVoicePoolAllocatedCount) ||
              nextHandle.snapshot.synthFailoverVoicePoolAllocatedCount,
            synthFailoverVoicePoolReusedCount:
              Number(message.synthFailoverVoicePoolReusedCount) ||
              nextHandle.snapshot.synthFailoverVoicePoolReusedCount,
            synthFailoverVoicePoolRecycledCount:
              Number(message.synthFailoverVoicePoolRecycledCount) ||
              nextHandle.snapshot.synthFailoverVoicePoolRecycledCount,
            synthFailoverVoicePoolDisplacedCount:
              Number(message.synthFailoverVoicePoolDisplacedCount) ||
              nextHandle.snapshot.synthFailoverVoicePoolDisplacedCount,
            synthFailoverVoicePoolPriorityDisplacedCount:
              Number(message.synthFailoverVoicePoolPriorityDisplacedCount) ||
              nextHandle.snapshot.synthFailoverVoicePoolPriorityDisplacedCount,
            synthFailoverVoicePoolLastDisplacedScore:
              typeof message.synthFailoverVoicePoolLastDisplacedScore === "number"
                ? message.synthFailoverVoicePoolLastDisplacedScore
                : nextHandle.snapshot.synthFailoverVoicePoolLastDisplacedScore,
            synthFailoverVoicePoolFreeCount:
              Number(message.synthFailoverVoicePoolFreeCount) ||
              nextHandle.snapshot.synthFailoverVoicePoolFreeCount,
            sampleBufferTokenShadowAcceptedCount:
              Number(message.sampleBufferTokenShadowAcceptedCount) ||
              nextHandle.snapshot.sampleBufferTokenShadowAcceptedCount,
            sampleBufferTokenShadowRejectedCount:
              Number(message.sampleBufferTokenShadowRejectedCount) ||
              nextHandle.snapshot.sampleBufferTokenShadowRejectedCount,
            sampleBufferTokenHydratedCount:
              Number(message.sampleBufferTokenHydratedCount) ||
              nextHandle.snapshot.sampleBufferTokenHydratedCount,
            sampleBufferLastToken:
              typeof message.sampleBufferLastToken === "string"
                ? message.sampleBufferLastToken
                : nextHandle.snapshot.sampleBufferLastToken,
            sampleBufferLastRejectReason:
              typeof message.sampleBufferLastRejectReason === "string"
                ? message.sampleBufferLastRejectReason
                : nextHandle.snapshot.sampleBufferLastRejectReason,
            sampleBufferLastFrameCount:
              Number(message.sampleBufferLastFrameCount) ||
              nextHandle.snapshot.sampleBufferLastFrameCount,
            sampleBufferLastChannelCount:
              Number(message.sampleBufferLastChannelCount) ||
              nextHandle.snapshot.sampleBufferLastChannelCount,
            sampleFailoverCandidateAcceptedCount:
              Number(message.sampleFailoverCandidateAcceptedCount) ||
              nextHandle.snapshot.sampleFailoverCandidateAcceptedCount,
            sampleFailoverCandidateRejectedCount:
              Number(message.sampleFailoverCandidateRejectedCount) ||
              nextHandle.snapshot.sampleFailoverCandidateRejectedCount,
            sampleFailoverLastSpecId:
              typeof message.sampleFailoverLastSpecId === "string"
                ? message.sampleFailoverLastSpecId
                : nextHandle.snapshot.sampleFailoverLastSpecId,
            sampleFailoverLastToken:
              typeof message.sampleFailoverLastToken === "string"
                ? message.sampleFailoverLastToken
                : nextHandle.snapshot.sampleFailoverLastToken,
            sampleFailoverLastRejectReason:
              typeof message.sampleFailoverLastRejectReason === "string"
                ? message.sampleFailoverLastRejectReason
                : nextHandle.snapshot.sampleFailoverLastRejectReason,
            sampleFailoverRenderFrameCount,
            sampleFailoverRenderFrameDelta: lastSampleFailoverRenderFrameDelta,
            sampleFailoverRenderQuantumCount:
              Number(message.sampleFailoverRenderQuantumCount) ||
              nextHandle.snapshot.sampleFailoverRenderQuantumCount,
            sampleFailoverPeakAbs:
              Number(message.sampleFailoverPeakAbs) ||
              nextHandle.snapshot.sampleFailoverPeakAbs,
            sampleFailoverLastRenderAtMs:
              sampleFailoverRenderFrameDelta > 0
                ? receivedAtMs
                : nextHandle.snapshot.sampleFailoverLastRenderAtMs,
            sampleFailoverLastWorkletFrame:
              Number(message.sampleFailoverLastWorkletFrame) ||
              nextHandle.snapshot.sampleFailoverLastWorkletFrame,
            sampleFailoverLastQueuedVoiceCount:
              Number(message.sampleFailoverLastQueuedVoiceCount) ||
              nextHandle.snapshot.sampleFailoverLastQueuedVoiceCount,
            sampleFailoverVoicePoolMaxVoices:
              Number(message.sampleFailoverVoicePoolMaxVoices) ||
              nextHandle.snapshot.sampleFailoverVoicePoolMaxVoices,
            sampleFailoverVoicePoolAllocatedCount:
              Number(message.sampleFailoverVoicePoolAllocatedCount) ||
              nextHandle.snapshot.sampleFailoverVoicePoolAllocatedCount,
            sampleFailoverVoicePoolReusedCount:
              Number(message.sampleFailoverVoicePoolReusedCount) ||
              nextHandle.snapshot.sampleFailoverVoicePoolReusedCount,
            sampleFailoverVoicePoolRecycledCount:
              Number(message.sampleFailoverVoicePoolRecycledCount) ||
              nextHandle.snapshot.sampleFailoverVoicePoolRecycledCount,
            sampleFailoverVoicePoolDisplacedCount:
              Number(message.sampleFailoverVoicePoolDisplacedCount) ||
              nextHandle.snapshot.sampleFailoverVoicePoolDisplacedCount,
            sampleFailoverVoicePoolPriorityDisplacedCount:
              Number(message.sampleFailoverVoicePoolPriorityDisplacedCount) ||
              nextHandle.snapshot.sampleFailoverVoicePoolPriorityDisplacedCount,
            sampleFailoverVoicePoolLastDisplacedScore:
              typeof message.sampleFailoverVoicePoolLastDisplacedScore === "number"
                ? message.sampleFailoverVoicePoolLastDisplacedScore
                : nextHandle.snapshot.sampleFailoverVoicePoolLastDisplacedScore,
            sampleFailoverVoicePoolFreeCount:
              Number(message.sampleFailoverVoicePoolFreeCount) ||
              nextHandle.snapshot.sampleFailoverVoicePoolFreeCount,
            processorRuntimeSynthVoicePostedCount:
              Number(message.processorRuntimeSynthVoicePostedCount) ||
              nextHandle.snapshot.processorRuntimeSynthVoicePostedCount,
            processorRuntimeSampleVoicePostedCount:
              Number(message.processorRuntimeSampleVoicePostedCount) ||
              nextHandle.snapshot.processorRuntimeSampleVoicePostedCount,
            processorRuntimeSynthVoiceAcceptedCount:
              Number(message.processorRuntimeSynthVoiceAcceptedCount) ||
              nextHandle.snapshot.processorRuntimeSynthVoiceAcceptedCount,
            processorRuntimeSampleVoiceAcceptedCount:
              Number(message.processorRuntimeSampleVoiceAcceptedCount) ||
              nextHandle.snapshot.processorRuntimeSampleVoiceAcceptedCount,
            processorRuntimeSynthVoiceRejectedCount:
              Number(message.processorRuntimeSynthVoiceRejectedCount) ||
              nextHandle.snapshot.processorRuntimeSynthVoiceRejectedCount,
            processorRuntimeSampleVoiceRejectedCount:
              Number(message.processorRuntimeSampleVoiceRejectedCount) ||
              nextHandle.snapshot.processorRuntimeSampleVoiceRejectedCount,
            processorRuntimeSegmentClockPulseAcceptedCount:
              Number(message.processorRuntimeSegmentClockPulseAcceptedCount) ||
              nextHandle.snapshot.processorRuntimeSegmentClockPulseAcceptedCount,
            processorRuntimeApostropheSafeExtendAcceptedCount:
              Number(message.processorRuntimeApostropheSafeExtendAcceptedCount) ||
              nextHandle.snapshot.processorRuntimeApostropheSafeExtendAcceptedCount,
            processorRuntimeRenderFrameCount,
            processorRuntimeRenderFrameDelta: lastProcessorRuntimeRenderFrameDelta,
            processorRuntimeLastSourceIntent:
              typeof message.processorRuntimeLastSourceIntent === "string"
                ? message.processorRuntimeLastSourceIntent
                : nextHandle.snapshot.processorRuntimeLastSourceIntent,
            processorRuntimeLastLane:
              typeof message.processorRuntimeLastLane === "string"
                ? message.processorRuntimeLastLane
                : nextHandle.snapshot.processorRuntimeLastLane,
            processorRuntimeLastExtendPolicy:
              typeof message.processorRuntimeLastExtendPolicy === "string"
                ? message.processorRuntimeLastExtendPolicy
                : nextHandle.snapshot.processorRuntimeLastExtendPolicy,
            processorRuntimeLastVoiceSpecId:
              typeof message.processorRuntimeLastVoiceSpecId === "string"
                ? message.processorRuntimeLastVoiceSpecId
                : nextHandle.snapshot.processorRuntimeLastVoiceSpecId,
            processorRuntimeLastRejectReason:
              typeof message.processorRuntimeLastRejectReason === "string"
                ? message.processorRuntimeLastRejectReason
                : nextHandle.snapshot.processorRuntimeLastRejectReason,
            processorRuntimeActiveSynthVoices:
              Number(message.processorRuntimeActiveSynthVoices) || 0,
            processorRuntimeActiveSampleVoices:
              Number(message.processorRuntimeActiveSampleVoices) || 0,
            processorRuntimeQueuePressureApprox:
              typeof message.processorRuntimeQueuePressureApprox === "number"
                ? message.processorRuntimeQueuePressureApprox
                : nextHandle.snapshot.processorRuntimeQueuePressureApprox,
            processorRuntimePressureState:
              typeof message.processorRuntimePressureState === "string"
                ? message.processorRuntimePressureState as WaveStarterWorkletPilotSnapshot["processorRuntimePressureState"]
                : nextHandle.snapshot.processorRuntimePressureState,
            processorRuntimeStolenVoiceCount:
              Number(message.processorRuntimeStolenVoiceCount) ||
              nextHandle.snapshot.processorRuntimeStolenVoiceCount,
            processorRuntimeStealFadeTailPressure:
              typeof message.processorRuntimeStealFadeTailPressure === "number"
                ? message.processorRuntimeStealFadeTailPressure
                : nextHandle.snapshot.processorRuntimeStealFadeTailPressure,
            processorOwnedHoldGestureStartPostedCount:
              Number(message.processorOwnedHoldGestureStartPostedCount) ||
              nextHandle.snapshot.processorOwnedHoldGestureStartPostedCount,
            processorOwnedHoldGestureUpdatePostedCount:
              Number(message.processorOwnedHoldGestureUpdatePostedCount) ||
              nextHandle.snapshot.processorOwnedHoldGestureUpdatePostedCount,
            processorOwnedHoldGestureReleasePostedCount:
              Number(message.processorOwnedHoldGestureReleasePostedCount) ||
              nextHandle.snapshot.processorOwnedHoldGestureReleasePostedCount,
            processorOwnedHoldGestureStartAcceptedCount:
              Number(message.processorOwnedHoldGestureStartAcceptedCount) ||
              nextHandle.snapshot.processorOwnedHoldGestureStartAcceptedCount,
            processorOwnedHoldGestureUpdateAcceptedCount:
              Number(message.processorOwnedHoldGestureUpdateAcceptedCount) ||
              nextHandle.snapshot.processorOwnedHoldGestureUpdateAcceptedCount,
            processorOwnedHoldGestureReleaseAcceptedCount:
              Number(message.processorOwnedHoldGestureReleaseAcceptedCount) ||
              nextHandle.snapshot.processorOwnedHoldGestureReleaseAcceptedCount,
            processorOwnedHoldGestureRejectedCount:
              Number(message.processorOwnedHoldGestureRejectedCount) ||
              nextHandle.snapshot.processorOwnedHoldGestureRejectedCount,
            processorOwnedHoldGestureActiveCount:
              Number(message.processorOwnedHoldGestureActiveCount) || 0,
            processorOwnedHoldSegmentPulseCount:
              Number(message.processorOwnedHoldSegmentPulseCount) ||
              nextHandle.snapshot.processorOwnedHoldSegmentPulseCount,
            processorOwnedHoldSynthVoiceCreatedCount:
              Number(message.processorOwnedHoldSynthVoiceCreatedCount) ||
              nextHandle.snapshot.processorOwnedHoldSynthVoiceCreatedCount,
            processorOwnedHoldSchedulerActive:
              (Number(message.processorOwnedHoldGestureActiveCount) || 0) > 0,
            processorOwnedHoldLastGestureId:
              typeof message.processorOwnedHoldLastGestureId === "string"
                ? message.processorOwnedHoldLastGestureId
                : nextHandle.snapshot.processorOwnedHoldLastGestureId,
            processorOwnedHoldLastLane:
              typeof message.processorOwnedHoldLastLane === "string"
                ? message.processorOwnedHoldLastLane
                : nextHandle.snapshot.processorOwnedHoldLastLane,
            processorOwnedHoldLastSegmentsPerBar:
              typeof message.processorOwnedHoldLastSegmentsPerBar === "number"
                ? message.processorOwnedHoldLastSegmentsPerBar
                : nextHandle.snapshot.processorOwnedHoldLastSegmentsPerBar,
            processorOwnedHoldLastPitchHz:
              typeof message.processorOwnedHoldLastPitchHz === "number"
                ? message.processorOwnedHoldLastPitchHz
                : nextHandle.snapshot.processorOwnedHoldLastPitchHz,
            processorOwnedHoldLastRejectReason:
              typeof message.processorOwnedHoldLastRejectReason === "string"
                ? message.processorOwnedHoldLastRejectReason
                : nextHandle.snapshot.processorOwnedHoldLastRejectReason,
            lastFrameAdvanceAtMs:
              renderedFrameDelta > 0
                ? receivedAtMs
                : nextHandle.snapshot.lastFrameAdvanceAtMs,
            detail:
              sampleFailoverRenderFrameDelta > 0
                ? "wave-starter-sample-failover-candidate-rendered"
                : synthFailoverRenderFrameDelta > 0
                  ? "wave-starter-synth-failover-candidate-rendered"
                  : parallelPilotRenderFrameDelta > 0
                  ? "wave-starter-parallel-pilot-mix-rendered"
                  : audioShapeProbeFrameDelta > 0
                    ? "wave-starter-shadow-audio-shape-rendered"
                    : "wave-starter-shadow-throughput",
          }),
        );
      }
    };
}
