import { ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_PROCESSOR_NAME as ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_PROCESSOR_NAME_SOURCE } from "./rootFollowWorkletShadowProcessorSource";
import {
  detectStableLaneSabTransportReadiness,
  withStableLaneSabTransportReadiness,
  type StableLaneSabTransportReadiness,
  type StableLaneSabTransportReadinessReason,
} from "./rootFollowSharedArrayBufferReadiness";
import type { StableLanePlanTransportBackendKind } from "./rootFollowStableLanePlanTransport";

const PROCESSOR_NAME = ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_PROCESSOR_NAME_SOURCE;

export const ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_PROCESSOR_NAME = PROCESSOR_NAME;
export const ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_GLOBAL =
  "__XENSONAR_ROOT_FOLLOW_WORKLET_SHADOW__";

export type RootFollowWorkletShadowBridgeStatus =
  | "unstarted"
  | "unsupported"
  | "loading"
  | "loaded"
  | "failed";

export type RootFollowWorkletShadowBridgeSnapshot = {
  version: 1;
  status: RootFollowWorkletShadowBridgeStatus;
  processorName: string;
  requestedAtMs: number | null;
  completedAtMs: number | null;
  lastMessageAtMs: number | null;
  readyMessageCount: number;
  bridgeSessionId: number;
  processorGeneration: number;
  workletNodeCreated: boolean;
  workletNodeConnected: boolean;
  processorReady: boolean;
  processLoopActive: boolean;
  stableLaneBufferAcked: boolean;
  stableLaneBufferRejectedReason: string | null;
  stableLanePlanAcked: boolean;
  stableLanePlanRejectedReason: string | null;
  stableLanePlanSentCount: number;
  stableLanePlanTransportBackendKind: StableLanePlanTransportBackendKind;
  stableLanePlanTransportSabRingbufferReserved: boolean;
  stableLanePlanTransportBackendFallbackReason: string | null;
  stableLaneSabTransportReadiness: StableLaneSabTransportReadiness;
  stableLaneSabTransportReady: boolean;
  stableLaneSabTransportReadinessReason: StableLaneSabTransportReadinessReason;
  stableLaneSabTransportSharedArrayBufferAvailable: boolean;
  stableLaneSabTransportCrossOriginIsolated: boolean;
  stableLaneSabTransportSecureContext: boolean;
  stableLaneSabTransportSingleFileHtmlLikelyBlocked: boolean;
  stableLaneSabTransportRequiredCoop: string;
  stableLaneSabTransportRequiredCoep: string;
  stableLanePlanTransportInFlightSequence: number | null;
  stableLanePlanTransportPendingSequence: number | null;
  stableLanePlanTransportPostedCount: number;
  stableLanePlanTransportPendingCount: number;
  stableLanePlanTransportDroppedSupersededCount: number;
  stableLanePlanTransportForcedPostCount: number;
  stableLanePlanTransportAckCount: number;
  stableLanePlanTransportLastPostedAtMs: number | null;
  stableLaneBufferGeneration: number | null;
  messageCount: number;
  directPilotMessageCount: number;
  granularPlanMessageCount: number;
  bufferTransferMessageCount: number;
  granularPilotMessageCount: number;
  stableLaneMessageCount: number;
  detail: string | null;
  errorMessage: string | null;
  preservesMainThreadReferencePath: true;
  silentShadowOnly: boolean;
  directPilotActive: boolean;
  granularShadowActive: boolean;
  bufferShadowActive: boolean;
  granularPilotActive: boolean;
  stableLaneActive: boolean;
  directPilotScope: "root-follow-direct-synth-only";
  pilotHealth:
    | "unknown"
    | "unsupported"
    | "shadow-only"
    | "pilot-ready"
    | "pilot-starved"
    | "failed";
  lastDirectPilotAcceptedEventCount: number;
  lastGranularPilotAcceptedWindowCount: number;
  lastGranularPilotBufferAvailable: boolean;
  lastStableLaneBufferAvailable: boolean;
  lastBufferTransferCopiedByteLength: number;
  lastDirectPilotAckAtMs: number | null;
  lastGranularPilotAckAtMs: number | null;
  lastStableLaneAckAtMs: number | null;
  lastBufferTransferAckAtMs: number | null;
  processorAlive: boolean;
  processorErrorCount: number;
  processQuantumCount: number;
  renderedFrameCount: number;
  renderedSampleCount: number;
  activeRenderQuantumCount: number;
  directRenderedFrameCount: number;
  granularRenderedFrameCount: number;
  stableLaneRenderedFrameCount: number;
  stableLaneRenderedFrameDelta: number;
  stableLaneActiveRenderQuantumCount: number;
  processHotPathCompactionCount: number;
  processHotPathDroppedDirectCount: number;
  processHotPathDroppedGranularCount: number;
  processHotPathRetainedDirectCount: number;
  processHotPathRetainedGranularCount: number;
  lastStableLaneFrameAdvanceAtMs: number | null;
  stableLaneHoldQuantumCount: number;
  stableLaneCrossfadeFrameCount: number;
  stableLaneGainRampFrameCount: number;
  stableLanePlanCount: number;
  stableLaneRetuneCount: number;
  stableLaneBufferAckCount: number;
  stableLaneBufferRejectCount: number;
  stableLanePlanAckCount: number;
  stableLanePlanRejectCount: number;
  stableLaneLastAcceptedPlanSequence: number;
  stableLanePlanTransportAcceptedCount: number;
  stableLanePlanTransportDroppedStaleCount: number;
  directPilotAcceptedEventTotal: number;
  granularPilotAcceptedWindowTotal: number;
  bufferTransferCopiedByteLengthTotal: number;
  lastThroughputReportAtWorkletTimeSec: number | null;
  stableLaneSyntheticSilentProbeAttemptCount: number;
  stableLaneSyntheticSilentProbePostedCount: number;
  stableLaneSyntheticSilentProbeAckCount: number;
  stableLaneSyntheticSilentProbeFrameDelta: number;
  stableLaneSyntheticSilentProbeLastResult: string | null;
  stableLaneSyntheticSilentProbeLastAtMs: number | null;
};

export function createRootFollowWorkletShadowBridgeSnapshot(
  patch?: Partial<RootFollowWorkletShadowBridgeSnapshot>,
): RootFollowWorkletShadowBridgeSnapshot {
  const sabReadiness = detectStableLaneSabTransportReadiness();
  return {
    version: 1,
    status: "unstarted",
    processorName: PROCESSOR_NAME,
    requestedAtMs: null,
    completedAtMs: null,
    lastMessageAtMs: null,
    readyMessageCount: 0,
    bridgeSessionId: 0,
    processorGeneration: 0,
    workletNodeCreated: false,
    workletNodeConnected: false,
    processorReady: false,
    processLoopActive: false,
    stableLaneBufferAcked: false,
    stableLaneBufferRejectedReason: null,
    stableLanePlanAcked: false,
    stableLanePlanRejectedReason: null,
    stableLanePlanSentCount: 0,
    stableLanePlanTransportBackendKind: "message-port",
    stableLanePlanTransportSabRingbufferReserved: true,
    stableLanePlanTransportBackendFallbackReason: null,
    stableLaneSabTransportReadiness:
      sabReadiness.stableLaneSabTransportReadiness,
    stableLaneSabTransportReady: sabReadiness.stableLaneSabTransportReady,
    stableLaneSabTransportReadinessReason:
      sabReadiness.stableLaneSabTransportReadinessReason,
    stableLaneSabTransportSharedArrayBufferAvailable:
      sabReadiness.stableLaneSabTransportSharedArrayBufferAvailable,
    stableLaneSabTransportCrossOriginIsolated:
      sabReadiness.stableLaneSabTransportCrossOriginIsolated,
    stableLaneSabTransportSecureContext:
      sabReadiness.stableLaneSabTransportSecureContext,
    stableLaneSabTransportSingleFileHtmlLikelyBlocked:
      sabReadiness.stableLaneSabTransportSingleFileHtmlLikelyBlocked,
    stableLaneSabTransportRequiredCoop:
      sabReadiness.stableLaneSabTransportRequiredCoop,
    stableLaneSabTransportRequiredCoep:
      sabReadiness.stableLaneSabTransportRequiredCoep,
    stableLanePlanTransportInFlightSequence: null,
    stableLanePlanTransportPendingSequence: null,
    stableLanePlanTransportPostedCount: 0,
    stableLanePlanTransportPendingCount: 0,
    stableLanePlanTransportDroppedSupersededCount: 0,
    stableLanePlanTransportForcedPostCount: 0,
    stableLanePlanTransportAckCount: 0,
    stableLanePlanTransportLastPostedAtMs: null,
    stableLaneBufferGeneration: null,
    messageCount: 0,
    directPilotMessageCount: 0,
    granularPlanMessageCount: 0,
    bufferTransferMessageCount: 0,
    granularPilotMessageCount: 0,
    stableLaneMessageCount: 0,
    detail: null,
    errorMessage: null,
    preservesMainThreadReferencePath: true,
    silentShadowOnly: true,
    directPilotActive: false,
    granularShadowActive: false,
    bufferShadowActive: false,
    granularPilotActive: false,
    stableLaneActive: false,
    directPilotScope: "root-follow-direct-synth-only",
    pilotHealth: "unknown",
    lastDirectPilotAcceptedEventCount: 0,
    lastGranularPilotAcceptedWindowCount: 0,
    lastGranularPilotBufferAvailable: false,
    lastStableLaneBufferAvailable: false,
    lastBufferTransferCopiedByteLength: 0,
    lastDirectPilotAckAtMs: null,
    lastGranularPilotAckAtMs: null,
    lastStableLaneAckAtMs: null,
    lastBufferTransferAckAtMs: null,
    processorAlive: false,
    processorErrorCount: 0,
    processQuantumCount: 0,
    renderedFrameCount: 0,
    renderedSampleCount: 0,
    activeRenderQuantumCount: 0,
    directRenderedFrameCount: 0,
    granularRenderedFrameCount: 0,
    stableLaneRenderedFrameCount: 0,
    stableLaneRenderedFrameDelta: 0,
    stableLaneActiveRenderQuantumCount: 0,
    processHotPathCompactionCount: 0,
    processHotPathDroppedDirectCount: 0,
    processHotPathDroppedGranularCount: 0,
    processHotPathRetainedDirectCount: 0,
    processHotPathRetainedGranularCount: 0,
    lastStableLaneFrameAdvanceAtMs: null,
    stableLaneHoldQuantumCount: 0,
    stableLaneCrossfadeFrameCount: 0,
    stableLaneGainRampFrameCount: 0,
    stableLanePlanCount: 0,
    stableLaneRetuneCount: 0,
    stableLaneBufferAckCount: 0,
    stableLaneBufferRejectCount: 0,
    stableLanePlanAckCount: 0,
    stableLanePlanRejectCount: 0,
    stableLaneLastAcceptedPlanSequence: 0,
    stableLanePlanTransportAcceptedCount: 0,
    stableLanePlanTransportDroppedStaleCount: 0,
    directPilotAcceptedEventTotal: 0,
    granularPilotAcceptedWindowTotal: 0,
    bufferTransferCopiedByteLengthTotal: 0,
    lastThroughputReportAtWorkletTimeSec: null,
    stableLaneSyntheticSilentProbeAttemptCount: 0,
    stableLaneSyntheticSilentProbePostedCount: 0,
    stableLaneSyntheticSilentProbeAckCount: 0,
    stableLaneSyntheticSilentProbeFrameDelta: 0,
    stableLaneSyntheticSilentProbeLastResult: null,
    stableLaneSyntheticSilentProbeLastAtMs: null,
    ...patch,
  };
}

export function resolveRootFollowWorkletPilotHealth(args: {
  status: RootFollowWorkletShadowBridgeStatus;
  directPilotActive: boolean;
  granularPilotActive: boolean;
  lastDirectPilotAcceptedEventCount: number;
  lastGranularPilotAcceptedWindowCount: number;
  lastGranularPilotBufferAvailable: boolean;
  stableLaneActive?: boolean;
  lastStableLaneBufferAvailable?: boolean;
}): RootFollowWorkletShadowBridgeSnapshot["pilotHealth"] {
  if (args.status === "failed") return "failed";
  if (
    args.status === "unsupported" ||
    args.status === "unstarted" ||
    args.status === "loading"
  )
    return "unsupported";
  if (args.stableLaneActive) {
    if (args.lastStableLaneBufferAvailable) return "pilot-ready";
    return "pilot-starved";
  }
  if (!args.directPilotActive && !args.granularPilotActive)
    return "shadow-only";
  if (args.granularPilotActive) {
    if (
      args.lastGranularPilotBufferAvailable &&
      args.lastGranularPilotAcceptedWindowCount > 0
    )
      return "pilot-ready";
    return "pilot-starved";
  }
  if (args.directPilotActive && args.lastDirectPilotAcceptedEventCount > 0)
    return "pilot-ready";
  return "pilot-starved";
}

export function summarizeRootFollowWorkletThroughput(
  snapshot: RootFollowWorkletShadowBridgeSnapshot,
) {
  return {
    workletNodeCreated: snapshot.workletNodeCreated,
    workletNodeConnected: snapshot.workletNodeConnected,
    processorReady: snapshot.processorReady,
    processorAlive: snapshot.processorAlive,
    processLoopActive: snapshot.processLoopActive,
    bridgeSessionId: snapshot.bridgeSessionId,
    processorGeneration: snapshot.processorGeneration,
    processorErrorCount: snapshot.processorErrorCount,
    processQuantumCount: snapshot.processQuantumCount,
    renderedFrameCount: snapshot.renderedFrameCount,
    renderedSampleCount: snapshot.renderedSampleCount,
    activeRenderQuantumCount: snapshot.activeRenderQuantumCount,
    directRenderedFrameCount: snapshot.directRenderedFrameCount,
    granularRenderedFrameCount: snapshot.granularRenderedFrameCount,
    stableLaneRenderedFrameCount: snapshot.stableLaneRenderedFrameCount,
    stableLaneHoldQuantumCount: snapshot.stableLaneHoldQuantumCount,
    stableLaneCrossfadeFrameCount: snapshot.stableLaneCrossfadeFrameCount,
    stableLaneGainRampFrameCount: snapshot.stableLaneGainRampFrameCount,
    stableLanePlanCount: snapshot.stableLanePlanCount,
    stableLaneRetuneCount: snapshot.stableLaneRetuneCount,
    stableLaneLastAcceptedPlanSequence:
      snapshot.stableLaneLastAcceptedPlanSequence,
    stableLanePlanTransportAcceptedCount:
      snapshot.stableLanePlanTransportAcceptedCount,
    stableLanePlanTransportDroppedStaleCount:
      snapshot.stableLanePlanTransportDroppedStaleCount,
    stableLanePlanTransportInFlightSequence:
      snapshot.stableLanePlanTransportInFlightSequence,
    stableLanePlanTransportPendingSequence:
      snapshot.stableLanePlanTransportPendingSequence,
    stableLanePlanTransportPostedCount:
      snapshot.stableLanePlanTransportPostedCount,
    stableLanePlanTransportPendingCount:
      snapshot.stableLanePlanTransportPendingCount,
    stableLanePlanTransportDroppedSupersededCount:
      snapshot.stableLanePlanTransportDroppedSupersededCount,
    stableLanePlanTransportForcedPostCount:
      snapshot.stableLanePlanTransportForcedPostCount,
    stableLanePlanTransportAckCount: snapshot.stableLanePlanTransportAckCount,
    stableLanePlanTransportLastPostedAtMs:
      snapshot.stableLanePlanTransportLastPostedAtMs,
    stableLanePlanTransportBackendKind:
      snapshot.stableLanePlanTransportBackendKind,
    stableLanePlanTransportSabRingbufferReserved:
      snapshot.stableLanePlanTransportSabRingbufferReserved,
    stableLanePlanTransportBackendFallbackReason:
      snapshot.stableLanePlanTransportBackendFallbackReason,
    stableLaneSabTransportReadiness: snapshot.stableLaneSabTransportReadiness,
    stableLaneSabTransportReady: snapshot.stableLaneSabTransportReady,
    stableLaneSabTransportReadinessReason:
      snapshot.stableLaneSabTransportReadinessReason,
    stableLaneSabTransportSharedArrayBufferAvailable:
      snapshot.stableLaneSabTransportSharedArrayBufferAvailable,
    stableLaneSabTransportCrossOriginIsolated:
      snapshot.stableLaneSabTransportCrossOriginIsolated,
    stableLaneSabTransportSecureContext:
      snapshot.stableLaneSabTransportSecureContext,
    stableLaneSabTransportSingleFileHtmlLikelyBlocked:
      snapshot.stableLaneSabTransportSingleFileHtmlLikelyBlocked,
    stableLaneSabTransportRequiredCoop:
      snapshot.stableLaneSabTransportRequiredCoop,
    stableLaneSabTransportRequiredCoep:
      snapshot.stableLaneSabTransportRequiredCoep,
    stableLaneBufferAcked: snapshot.stableLaneBufferAcked,
    stableLaneBufferRejectedReason: snapshot.stableLaneBufferRejectedReason,
    stableLanePlanAcked: snapshot.stableLanePlanAcked,
    stableLanePlanRejectedReason: snapshot.stableLanePlanRejectedReason,
    directPilotAcceptedEventTotal: snapshot.directPilotAcceptedEventTotal,
    granularPilotAcceptedWindowTotal: snapshot.granularPilotAcceptedWindowTotal,
    bufferTransferCopiedByteLengthTotal:
      snapshot.bufferTransferCopiedByteLengthTotal,
    lastThroughputReportAtWorkletTimeSec:
      snapshot.lastThroughputReportAtWorkletTimeSec,
    stableLaneSyntheticSilentProbeAttemptCount:
      snapshot.stableLaneSyntheticSilentProbeAttemptCount,
    stableLaneSyntheticSilentProbePostedCount:
      snapshot.stableLaneSyntheticSilentProbePostedCount,
    stableLaneSyntheticSilentProbeAckCount:
      snapshot.stableLaneSyntheticSilentProbeAckCount,
    stableLaneSyntheticSilentProbeFrameDelta:
      snapshot.stableLaneSyntheticSilentProbeFrameDelta,
    stableLaneSyntheticSilentProbeLastResult:
      snapshot.stableLaneSyntheticSilentProbeLastResult,
    stableLaneSyntheticSilentProbeLastAtMs:
      snapshot.stableLaneSyntheticSilentProbeLastAtMs,
  };
}

export function publishRootFollowWorkletShadowSnapshot(
  snapshot: RootFollowWorkletShadowBridgeSnapshot,
) {
  const nextSnapshot = withStableLaneSabTransportReadiness(snapshot);
  if (typeof window !== "undefined") {
    const debugWindow = window as typeof window & {
      [ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_GLOBAL]?: RootFollowWorkletShadowBridgeSnapshot;
    };
    debugWindow.__XENSONAR_ROOT_FOLLOW_WORKLET_SHADOW__ = { ...nextSnapshot };
  }
  return nextSnapshot;
}

export function readRootFollowWorkletShadowSnapshotFromBrowser(): RootFollowWorkletShadowBridgeSnapshot | null {
  if (typeof window === "undefined") return null;
  const debugWindow = window as typeof window & {
    [ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_GLOBAL]?: RootFollowWorkletShadowBridgeSnapshot;
  };
  return debugWindow[ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_GLOBAL] ?? null;
}

export function summarizeRootFollowWorkletPilotHealth(
  snapshot: RootFollowWorkletShadowBridgeSnapshot | null,
) {
  return {
    status: snapshot?.status ?? "unstarted",
    pilotHealth: snapshot?.pilotHealth ?? "unknown",
    directAccepted: snapshot?.lastDirectPilotAcceptedEventCount ?? 0,
    granularAccepted: snapshot?.lastGranularPilotAcceptedWindowCount ?? 0,
    granularBufferAvailable:
      snapshot?.lastGranularPilotBufferAvailable === true,
    copiedByteLength: snapshot?.lastBufferTransferCopiedByteLength ?? 0,
    workletNodeCreated: snapshot?.workletNodeCreated === true,
    workletNodeConnected: snapshot?.workletNodeConnected === true,
    processorReady: snapshot?.processorReady === true,
    processorAlive: snapshot?.processorAlive === true,
    processLoopActive: snapshot?.processLoopActive === true,
    bridgeSessionId: snapshot?.bridgeSessionId ?? 0,
    processorGeneration: snapshot?.processorGeneration ?? 0,
    stableLaneBufferAcked: snapshot?.stableLaneBufferAcked === true,
    stableLaneBufferRejectedReason:
      snapshot?.stableLaneBufferRejectedReason ?? null,
    stableLanePlanAcked: snapshot?.stableLanePlanAcked === true,
    stableLanePlanRejectedReason:
      snapshot?.stableLanePlanRejectedReason ?? null,
    processorErrorCount: snapshot?.processorErrorCount ?? 0,
    processQuantumCount: snapshot?.processQuantumCount ?? 0,
    activeRenderQuantumCount: snapshot?.activeRenderQuantumCount ?? 0,
    renderedFrameCount: snapshot?.renderedFrameCount ?? 0,
    directRenderedFrameCount: snapshot?.directRenderedFrameCount ?? 0,
    granularRenderedFrameCount: snapshot?.granularRenderedFrameCount ?? 0,
    stableLaneRenderedFrameCount: snapshot?.stableLaneRenderedFrameCount ?? 0,
    stableLaneRenderedFrameDelta: snapshot?.stableLaneRenderedFrameDelta ?? 0,
    stableLaneActiveRenderQuantumCount:
      snapshot?.stableLaneActiveRenderQuantumCount ?? 0,
    processHotPathCompactionCount: snapshot?.processHotPathCompactionCount ?? 0,
    processHotPathDroppedDirectCount:
      snapshot?.processHotPathDroppedDirectCount ?? 0,
    processHotPathDroppedGranularCount:
      snapshot?.processHotPathDroppedGranularCount ?? 0,
    processHotPathRetainedDirectCount:
      snapshot?.processHotPathRetainedDirectCount ?? 0,
    processHotPathRetainedGranularCount:
      snapshot?.processHotPathRetainedGranularCount ?? 0,
    lastStableLaneFrameAdvanceAtMs:
      snapshot?.lastStableLaneFrameAdvanceAtMs ?? null,
    stableLaneHoldQuantumCount: snapshot?.stableLaneHoldQuantumCount ?? 0,
    stableLaneCrossfadeFrameCount: snapshot?.stableLaneCrossfadeFrameCount ?? 0,
    stableLaneGainRampFrameCount: snapshot?.stableLaneGainRampFrameCount ?? 0,
    stableLanePlanCount: snapshot?.stableLanePlanCount ?? 0,
    stableLaneRetuneCount: snapshot?.stableLaneRetuneCount ?? 0,
    stableLaneBufferAckCount: snapshot?.stableLaneBufferAckCount ?? 0,
    stableLaneBufferRejectCount: snapshot?.stableLaneBufferRejectCount ?? 0,
    stableLanePlanAckCount: snapshot?.stableLanePlanAckCount ?? 0,
    stableLanePlanRejectCount: snapshot?.stableLanePlanRejectCount ?? 0,
    stableLaneLastAcceptedPlanSequence:
      snapshot?.stableLaneLastAcceptedPlanSequence ?? 0,
    stableLanePlanTransportAcceptedCount:
      snapshot?.stableLanePlanTransportAcceptedCount ?? 0,
    stableLanePlanTransportDroppedStaleCount:
      snapshot?.stableLanePlanTransportDroppedStaleCount ?? 0,
    stableLanePlanTransportInFlightSequence:
      snapshot?.stableLanePlanTransportInFlightSequence ?? null,
    stableLanePlanTransportPendingSequence:
      snapshot?.stableLanePlanTransportPendingSequence ?? null,
    stableLanePlanTransportPostedCount:
      snapshot?.stableLanePlanTransportPostedCount ?? 0,
    stableLanePlanTransportPendingCount:
      snapshot?.stableLanePlanTransportPendingCount ?? 0,
    stableLanePlanTransportDroppedSupersededCount:
      snapshot?.stableLanePlanTransportDroppedSupersededCount ?? 0,
    stableLanePlanTransportForcedPostCount:
      snapshot?.stableLanePlanTransportForcedPostCount ?? 0,
    stableLanePlanTransportAckCount:
      snapshot?.stableLanePlanTransportAckCount ?? 0,
    stableLanePlanTransportLastPostedAtMs:
      snapshot?.stableLanePlanTransportLastPostedAtMs ?? null,
    stableLanePlanTransportBackendKind:
      snapshot?.stableLanePlanTransportBackendKind ?? "message-port",
    stableLanePlanTransportSabRingbufferReserved:
      snapshot?.stableLanePlanTransportSabRingbufferReserved === true,
    stableLanePlanTransportBackendFallbackReason:
      snapshot?.stableLanePlanTransportBackendFallbackReason ?? null,
    stableLaneSabTransportReadiness:
      snapshot?.stableLaneSabTransportReadiness ?? "unknown",
    stableLaneSabTransportReady: snapshot?.stableLaneSabTransportReady === true,
    stableLaneSabTransportReadinessReason:
      snapshot?.stableLaneSabTransportReadinessReason ??
      "not-in-browser-runtime",
    stableLaneSabTransportSharedArrayBufferAvailable:
      snapshot?.stableLaneSabTransportSharedArrayBufferAvailable === true,
    stableLaneSabTransportCrossOriginIsolated:
      snapshot?.stableLaneSabTransportCrossOriginIsolated === true,
    stableLaneSabTransportSecureContext:
      snapshot?.stableLaneSabTransportSecureContext === true,
    stableLaneSabTransportSingleFileHtmlLikelyBlocked:
      snapshot?.stableLaneSabTransportSingleFileHtmlLikelyBlocked === true,
    stableLaneSabTransportRequiredCoop:
      snapshot?.stableLaneSabTransportRequiredCoop ??
      "Cross-Origin-Opener-Policy: same-origin",
    stableLaneSabTransportRequiredCoep:
      snapshot?.stableLaneSabTransportRequiredCoep ??
      "Cross-Origin-Embedder-Policy: require-corp",
    stableLaneBufferGeneration: snapshot?.stableLaneBufferGeneration ?? null,
    lastMessageAtMs: snapshot?.lastMessageAtMs ?? null,
    lastStableLaneAckAtMs: snapshot?.lastStableLaneAckAtMs ?? null,
    stableLaneSyntheticSilentProbeAttemptCount:
      snapshot?.stableLaneSyntheticSilentProbeAttemptCount ?? 0,
    stableLaneSyntheticSilentProbePostedCount:
      snapshot?.stableLaneSyntheticSilentProbePostedCount ?? 0,
    stableLaneSyntheticSilentProbeAckCount:
      snapshot?.stableLaneSyntheticSilentProbeAckCount ?? 0,
    stableLaneSyntheticSilentProbeFrameDelta:
      snapshot?.stableLaneSyntheticSilentProbeFrameDelta ?? 0,
    stableLaneSyntheticSilentProbeLastResult:
      snapshot?.stableLaneSyntheticSilentProbeLastResult ?? null,
    stableLaneSyntheticSilentProbeLastAtMs:
      snapshot?.stableLaneSyntheticSilentProbeLastAtMs ?? null,
    directPilotAcceptedEventTotal: snapshot?.directPilotAcceptedEventTotal ?? 0,
    granularPilotAcceptedWindowTotal:
      snapshot?.granularPilotAcceptedWindowTotal ?? 0,
    bufferTransferCopiedByteLengthTotal:
      snapshot?.bufferTransferCopiedByteLengthTotal ?? 0,
    preservesMainThreadReferencePath:
      snapshot?.preservesMainThreadReferencePath === true,
  };
}
