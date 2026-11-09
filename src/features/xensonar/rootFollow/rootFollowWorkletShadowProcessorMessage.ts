import {
  resolveRootFollowWorkletPilotHealth,
  type RootFollowWorkletShadowBridgeSnapshot,
  type RootFollowWorkletShadowBridgeStatus,
} from "./rootFollowWorkletShadowReport";

export type RootFollowWorkletShadowProcessorMessageResult = {
  snapshot: RootFollowWorkletShadowBridgeSnapshot;
  stableLaneAckPlanSequence: number | null;
};

export function applyRootFollowWorkletShadowProcessorMessage(args: {
  snapshot: RootFollowWorkletShadowBridgeSnapshot;
  data: any;
  bridgeSessionId: number;
  processorGeneration: number;
  nowMs: () => number;
}): RootFollowWorkletShadowProcessorMessageResult {
  const data = args.data || {};
  const snapshot = args.snapshot;
  const directAck = data.type === "root-follow-worklet-direct-pilot-ack";
  const granularAck =
    data.type === "root-follow-worklet-granular-shadow-ack";
  const bufferAck =
    data.type === "root-follow-worklet-buffer-shadow-ack" ||
    data.type === "root-follow-worklet-stable-lane-buffer-ack";
  const stableLaneBufferAck =
    data.type === "root-follow-worklet-stable-lane-buffer-ack";
  const granularPilotAck =
    data.type === "root-follow-worklet-granular-pilot-ack";
  const stableLaneAck = data.type === "root-follow-worklet-stable-lane-ack";
  const readyMessage = data.type === "root-follow-worklet-shadow-ready";
  const pongMessage = data.type === "root-follow-worklet-pong";
  const throughputMeter =
    data.type === "root-follow-worklet-throughput-meter";
  const directAccepted = directAck
    ? Math.max(0, Number(data.acceptedEventCount) || 0)
    : snapshot.lastDirectPilotAcceptedEventCount;
  const granularAccepted = granularPilotAck
    ? Math.max(0, Number(data.acceptedWindowCount) || 0)
    : snapshot.lastGranularPilotAcceptedWindowCount;
  const granularBufferAvailable = granularPilotAck
    ? data.bufferAvailable === true
    : snapshot.lastGranularPilotBufferAvailable;
  const stableLaneBufferAvailable = stableLaneAck
    ? data.bufferAvailable === true
    : stableLaneBufferAck
      ? data.ok === true
      : snapshot.lastStableLaneBufferAvailable;
  const copiedByteLength = bufferAck
    ? Math.max(0, Number(data.copiedByteLength) || 0)
    : snapshot.lastBufferTransferCopiedByteLength;
  const throughputLike = throughputMeter || pongMessage;
  const nextProcessQuantumCount = throughputLike
    ? Math.max(
        snapshot.processQuantumCount,
        Number(data.processQuantumCount) || 0,
      )
    : snapshot.processQuantumCount;
  const nextRenderedFrameCount = throughputLike
    ? Math.max(
        snapshot.renderedFrameCount,
        Number(data.renderedFrameCount) || 0,
      )
    : snapshot.renderedFrameCount;
  const nextRenderedSampleCount = throughputMeter
    ? Math.max(
        snapshot.renderedSampleCount,
        Number(data.renderedSampleCount) || 0,
      )
    : snapshot.renderedSampleCount;
  const nextActiveRenderQuantumCount = throughputMeter
    ? Math.max(
        snapshot.activeRenderQuantumCount,
        Number(data.activeRenderQuantumCount) || 0,
      )
    : snapshot.activeRenderQuantumCount;
  const nextDirectRenderedFrameCount = throughputMeter
    ? Math.max(
        snapshot.directRenderedFrameCount,
        Number(data.directRenderedFrameCount) || 0,
      )
    : snapshot.directRenderedFrameCount;
  const nextGranularRenderedFrameCount = throughputMeter
    ? Math.max(
        snapshot.granularRenderedFrameCount,
        Number(data.granularRenderedFrameCount) || 0,
      )
    : snapshot.granularRenderedFrameCount;
  const nextStableLaneRenderedFrameCount = throughputMeter
    ? Math.max(
        snapshot.stableLaneRenderedFrameCount,
        Number(data.stableLaneRenderedFrameCount) || 0,
      )
    : snapshot.stableLaneRenderedFrameCount;
  const stableLaneRenderedFrameDelta = throughputMeter
    ? Math.max(
        0,
        nextStableLaneRenderedFrameCount -
          snapshot.stableLaneRenderedFrameCount,
      )
    : 0;
  const nextStableLaneFrameAdvanceAtMs =
    stableLaneRenderedFrameDelta > 0
      ? args.nowMs()
      : snapshot.lastStableLaneFrameAdvanceAtMs;
  const nextStableLaneActiveRenderQuantumCount = throughputMeter
    ? Math.max(
        snapshot.stableLaneActiveRenderQuantumCount,
        Number(data.stableLaneActiveRenderQuantumCount) || 0,
      )
    : snapshot.stableLaneActiveRenderQuantumCount;
  const nextProcessHotPathCompactionCount = throughputMeter
    ? Math.max(
        snapshot.processHotPathCompactionCount,
        Number(data.processHotPathCompactionCount) || 0,
      )
    : snapshot.processHotPathCompactionCount;
  const nextProcessHotPathDroppedDirectCount = throughputMeter
    ? Math.max(
        snapshot.processHotPathDroppedDirectCount,
        Number(data.processHotPathDroppedDirectCount) || 0,
      )
    : snapshot.processHotPathDroppedDirectCount;
  const nextProcessHotPathDroppedGranularCount = throughputMeter
    ? Math.max(
        snapshot.processHotPathDroppedGranularCount,
        Number(data.processHotPathDroppedGranularCount) || 0,
      )
    : snapshot.processHotPathDroppedGranularCount;
  const nextProcessHotPathRetainedDirectCount = throughputMeter
    ? Math.max(0, Number(data.processHotPathRetainedDirectCount) || 0)
    : snapshot.processHotPathRetainedDirectCount;
  const nextProcessHotPathRetainedGranularCount = throughputMeter
    ? Math.max(0, Number(data.processHotPathRetainedGranularCount) || 0)
    : snapshot.processHotPathRetainedGranularCount;
  const nextStableLaneHoldQuantumCount = throughputMeter
    ? Math.max(
        snapshot.stableLaneHoldQuantumCount,
        Number(data.stableLaneHoldQuantumCount) || 0,
      )
    : snapshot.stableLaneHoldQuantumCount;
  const nextStableLaneCrossfadeFrameCount = throughputMeter
    ? Math.max(
        snapshot.stableLaneCrossfadeFrameCount,
        Number(data.stableLaneCrossfadeFrameCount) || 0,
      )
    : snapshot.stableLaneCrossfadeFrameCount;
  const nextStableLaneGainRampFrameCount = throughputMeter
    ? Math.max(
        snapshot.stableLaneGainRampFrameCount,
        Number(data.stableLaneGainRampFrameCount) || 0,
      )
    : snapshot.stableLaneGainRampFrameCount;
  const nextStableLanePlanCount = throughputMeter
    ? Math.max(
        snapshot.stableLanePlanCount,
        Number(data.stableLanePlanCount) || 0,
      )
    : snapshot.stableLanePlanCount;
  const nextStableLaneRetuneCount = throughputMeter
    ? Math.max(
        snapshot.stableLaneRetuneCount,
        Number(data.stableLaneRetuneCount) || 0,
      )
    : snapshot.stableLaneRetuneCount;
  const nextStableLaneLastAcceptedPlanSequence =
    stableLaneAck || throughputMeter
      ? Math.max(
          snapshot.stableLaneLastAcceptedPlanSequence,
          Number(data.stableLaneLastAcceptedPlanSequence) || 0,
        )
      : snapshot.stableLaneLastAcceptedPlanSequence;
  const nextStableLanePlanTransportAcceptedCount =
    stableLaneAck || throughputMeter
      ? Math.max(
          snapshot.stableLanePlanTransportAcceptedCount,
          Number(data.stableLanePlanTransportAcceptedCount) || 0,
        )
      : snapshot.stableLanePlanTransportAcceptedCount;
  const nextStableLanePlanTransportDroppedStaleCount =
    stableLaneAck || throughputMeter
      ? Math.max(
          snapshot.stableLanePlanTransportDroppedStaleCount,
          Number(data.stableLanePlanTransportDroppedStaleCount) || 0,
        )
      : snapshot.stableLanePlanTransportDroppedStaleCount;
  const nextThroughputReportAt = throughputMeter
    ? Number(data.workletTimeSec) || null
    : snapshot.lastThroughputReportAtWorkletTimeSec;
  const nextSyntheticSilentProbeAttemptCount = throughputMeter
    ? Math.max(
        snapshot.stableLaneSyntheticSilentProbeAttemptCount,
        Number(data.stableLaneSyntheticSilentProbeAttemptCount) || 0,
      )
    : snapshot.stableLaneSyntheticSilentProbeAttemptCount;
  const nextSyntheticSilentProbeAckCount = throughputMeter
    ? Math.max(
        snapshot.stableLaneSyntheticSilentProbeAckCount,
        Number(data.stableLaneSyntheticSilentProbeAckCount) || 0,
      )
    : snapshot.stableLaneSyntheticSilentProbeAckCount +
      (stableLaneAck &&
      data.probeKind === "stable-lane-synthetic-silent-plan" &&
      data.ok === true
        ? 1
        : 0);
  const nextSyntheticSilentProbeLastResult =
    stableLaneAck && data.probeKind === "stable-lane-synthetic-silent-plan"
      ? data.ok === true
        ? "ack-ok"
        : typeof data.rejectedReason === "string"
          ? data.rejectedReason
          : "ack-rejected"
      : throughputMeter &&
          typeof data.stableLaneSyntheticSilentProbeLastResult === "string"
        ? data.stableLaneSyntheticSilentProbeLastResult
        : snapshot.stableLaneSyntheticSilentProbeLastResult;
  const nextSyntheticSilentProbeLastAtMs =
    stableLaneAck && data.probeKind === "stable-lane-synthetic-silent-plan"
      ? args.nowMs()
      : snapshot.stableLaneSyntheticSilentProbeLastAtMs;
  const nextDirectPilotActive =
    snapshot.directPilotActive || directAck;
  const nextGranularPilotActive =
    snapshot.granularPilotActive || granularPilotAck;
  const stableLaneBufferAckOk = stableLaneBufferAck && data.ok === true;
  const stableLanePlanAckOk =
    stableLaneAck &&
    data.ok === true &&
    data.active === true &&
    data.bufferAvailable === true;
  const stableLaneThroughputActive =
    throughputMeter && data.stableLaneActive === true;
  const stableLaneThroughputInactive =
    throughputMeter && data.stableLaneActive === false;
  const nextStableLaneBufferAcked = stableLaneBufferAck
    ? stableLaneBufferAckOk
    : snapshot.stableLaneBufferAcked;
  const nextStableLaneBufferRejectedReason =
    stableLaneBufferAck && !stableLaneBufferAckOk
      ? typeof data.rejectedReason === "string"
        ? data.rejectedReason
        : "buffer-rejected"
      : stableLaneBufferAckOk
        ? null
        : snapshot.stableLaneBufferRejectedReason;
  const nextStableLaneAcked = stableLaneAck
    ? stableLanePlanAckOk
    : stableLaneThroughputInactive
      ? false
      : snapshot.stableLanePlanAcked;
  const nextStableLaneRejectedReason =
    stableLaneAck && !stableLanePlanAckOk
      ? typeof data.rejectedReason === "string"
        ? data.rejectedReason
        : data.bufferAvailable === true
          ? "inactive-plan"
          : "missing-buffer"
      : stableLanePlanAckOk
        ? null
        : snapshot.stableLanePlanRejectedReason;
  const nextStableLaneActive = stableLaneAck
    ? stableLanePlanAckOk
    : throughputMeter
      ? stableLaneThroughputActive && nextStableLaneAcked
      : snapshot.stableLaneActive && nextStableLaneAcked;
  const nextStatus: RootFollowWorkletShadowBridgeStatus = "loaded";
  const nextSnapshot: RootFollowWorkletShadowBridgeSnapshot = {
    ...snapshot,
    status: nextStatus,
    lastMessageAtMs: args.nowMs(),
    readyMessageCount:
      snapshot.readyMessageCount + (readyMessage ? 1 : 0),
    bridgeSessionId: args.bridgeSessionId,
    processorGeneration: args.processorGeneration,
    workletNodeCreated: true,
    workletNodeConnected: true,
    processorReady:
      snapshot.processorReady ||
      readyMessage ||
      throughputMeter ||
      pongMessage ||
      data.processorReady === true,
    processLoopActive: nextProcessQuantumCount > 0,
    stableLaneBufferAcked: nextStableLaneBufferAcked,
    stableLaneBufferRejectedReason: nextStableLaneBufferRejectedReason,
    stableLanePlanAcked: nextStableLaneAcked,
    stableLanePlanRejectedReason: nextStableLaneRejectedReason,
    stableLaneBufferGeneration:
      stableLaneBufferAck || stableLaneAck
        ? Math.max(1, Number(data.bufferGeneration) || 1)
        : snapshot.stableLaneBufferGeneration,
    messageCount:
      snapshot.messageCount +
      (directAck ||
      granularAck ||
      bufferAck ||
      granularPilotAck ||
      stableLaneAck ||
      stableLaneBufferAck ||
      throughputMeter ||
      readyMessage ||
      pongMessage
        ? 0
        : 1),
    directPilotMessageCount:
      snapshot.directPilotMessageCount + (directAck ? 1 : 0),
    granularPlanMessageCount:
      snapshot.granularPlanMessageCount + (granularAck ? 1 : 0),
    bufferTransferMessageCount:
      snapshot.bufferTransferMessageCount + (bufferAck ? 1 : 0),
    granularPilotMessageCount:
      snapshot.granularPilotMessageCount +
      (granularPilotAck ? 1 : 0),
    stableLaneMessageCount:
      snapshot.stableLaneMessageCount + (stableLaneAck ? 1 : 0),
    granularShadowActive:
      snapshot.granularShadowActive || granularAck,
    bufferShadowActive: snapshot.bufferShadowActive || bufferAck,
    granularPilotActive: nextGranularPilotActive,
    stableLaneActive: nextStableLaneActive,
    directPilotActive: nextDirectPilotActive,
    lastDirectPilotAcceptedEventCount: directAccepted,
    lastGranularPilotAcceptedWindowCount: granularAccepted,
    lastGranularPilotBufferAvailable: granularBufferAvailable,
    lastStableLaneBufferAvailable: stableLaneBufferAvailable,
    lastBufferTransferCopiedByteLength: copiedByteLength,
    processorAlive:
      snapshot.processorAlive ||
      throughputMeter ||
      nextProcessQuantumCount > 0,
    processQuantumCount: nextProcessQuantumCount,
    renderedFrameCount: nextRenderedFrameCount,
    renderedSampleCount: nextRenderedSampleCount,
    activeRenderQuantumCount: nextActiveRenderQuantumCount,
    directRenderedFrameCount: nextDirectRenderedFrameCount,
    granularRenderedFrameCount: nextGranularRenderedFrameCount,
    stableLaneRenderedFrameCount: nextStableLaneRenderedFrameCount,
    stableLaneRenderedFrameDelta,
    stableLaneActiveRenderQuantumCount:
      nextStableLaneActiveRenderQuantumCount,
    processHotPathCompactionCount: nextProcessHotPathCompactionCount,
    processHotPathDroppedDirectCount: nextProcessHotPathDroppedDirectCount,
    processHotPathDroppedGranularCount:
      nextProcessHotPathDroppedGranularCount,
    processHotPathRetainedDirectCount:
      nextProcessHotPathRetainedDirectCount,
    processHotPathRetainedGranularCount:
      nextProcessHotPathRetainedGranularCount,
    lastStableLaneFrameAdvanceAtMs: nextStableLaneFrameAdvanceAtMs,
    stableLaneHoldQuantumCount: nextStableLaneHoldQuantumCount,
    stableLaneCrossfadeFrameCount: nextStableLaneCrossfadeFrameCount,
    stableLaneGainRampFrameCount: nextStableLaneGainRampFrameCount,
    stableLanePlanCount: nextStableLanePlanCount,
    stableLaneRetuneCount: nextStableLaneRetuneCount,
    stableLaneLastAcceptedPlanSequence:
      nextStableLaneLastAcceptedPlanSequence,
    stableLanePlanTransportAcceptedCount:
      nextStableLanePlanTransportAcceptedCount,
    stableLanePlanTransportDroppedStaleCount:
      nextStableLanePlanTransportDroppedStaleCount,
    stableLaneBufferAckCount: throughputMeter
      ? Math.max(
          snapshot.stableLaneBufferAckCount,
          Number(data.stableLaneBufferAckCount) || 0,
        )
      : snapshot.stableLaneBufferAckCount +
        (stableLaneBufferAck && data.ok === true ? 1 : 0),
    stableLaneBufferRejectCount: throughputMeter
      ? Math.max(
          snapshot.stableLaneBufferRejectCount,
          Number(data.stableLaneBufferRejectCount) || 0,
        )
      : snapshot.stableLaneBufferRejectCount +
        (stableLaneBufferAck && data.ok !== true ? 1 : 0),
    stableLanePlanAckCount: throughputMeter
      ? Math.max(
          snapshot.stableLanePlanAckCount,
          Number(data.stableLanePlanAckCount) || 0,
        )
      : snapshot.stableLanePlanAckCount +
        (stableLaneAck &&
        (data.ok === true ||
          (data.active === true && data.bufferAvailable === true))
          ? 1
          : 0),
    stableLanePlanRejectCount: throughputMeter
      ? Math.max(
          snapshot.stableLanePlanRejectCount,
          Number(data.stableLanePlanRejectCount) || 0,
        )
      : snapshot.stableLanePlanRejectCount +
        (stableLaneAck &&
        !(
          data.ok === true ||
          (data.active === true && data.bufferAvailable === true)
        )
          ? 1
          : 0),
    directPilotAcceptedEventTotal:
      snapshot.directPilotAcceptedEventTotal +
      (directAck ? directAccepted : 0),
    granularPilotAcceptedWindowTotal:
      snapshot.granularPilotAcceptedWindowTotal +
      (granularPilotAck ? granularAccepted : 0),
    bufferTransferCopiedByteLengthTotal:
      snapshot.bufferTransferCopiedByteLengthTotal +
      (bufferAck ? copiedByteLength : 0),
    lastThroughputReportAtWorkletTimeSec: nextThroughputReportAt,
    stableLaneSyntheticSilentProbeAttemptCount:
      nextSyntheticSilentProbeAttemptCount,
    stableLaneSyntheticSilentProbeAckCount:
      nextSyntheticSilentProbeAckCount,
    stableLaneSyntheticSilentProbeLastResult:
      nextSyntheticSilentProbeLastResult,
    stableLaneSyntheticSilentProbeLastAtMs:
      nextSyntheticSilentProbeLastAtMs,
    lastDirectPilotAckAtMs: directAck
      ? args.nowMs()
      : snapshot.lastDirectPilotAckAtMs,
    lastGranularPilotAckAtMs: granularPilotAck
      ? args.nowMs()
      : snapshot.lastGranularPilotAckAtMs,
    lastStableLaneAckAtMs: stableLaneAck
      ? args.nowMs()
      : snapshot.lastStableLaneAckAtMs,
    lastBufferTransferAckAtMs: bufferAck
      ? args.nowMs()
      : snapshot.lastBufferTransferAckAtMs,
    pilotHealth: resolveRootFollowWorkletPilotHealth({
      status: nextStatus,
      directPilotActive: nextDirectPilotActive,
      granularPilotActive: nextGranularPilotActive,
      stableLaneActive: nextStableLaneActive,
      lastDirectPilotAcceptedEventCount: directAccepted,
      lastGranularPilotAcceptedWindowCount: granularAccepted,
      lastGranularPilotBufferAvailable: granularBufferAvailable,
      lastStableLaneBufferAvailable: stableLaneBufferAvailable,
    }),
    detail: readyMessage
      ? "root-follow-worklet-processor-ready"
      : pongMessage
        ? "root-follow-worklet-pong"
        : throughputMeter
          ? "root-follow-worklet-throughput-meter"
          : directAck
            ? "root-follow-worklet-direct-pilot-acknowledged-events"
            : granularAck
              ? "root-follow-worklet-granular-shadow-acknowledged-plan"
              : bufferAck
                ? "root-follow-worklet-buffer-shadow-acknowledged-transfer"
                : granularPilotAck
                  ? "root-follow-worklet-granular-pilot-acknowledged-plan"
                  : stableLaneAck
                    ? "root-follow-worklet-stable-lane-acknowledged-plan"
                    : "root-follow-worklet-shadow-acknowledged-plan",
  };
  return {
    snapshot: nextSnapshot,
    stableLaneAckPlanSequence: stableLaneAck
      ? Math.max(0, Number(data.planSequence) || 0)
      : null,
  };
}
