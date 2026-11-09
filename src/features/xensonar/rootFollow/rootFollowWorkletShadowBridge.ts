import {
  addAudioWorkletBlobModule,
  resolveAudioWorkletBlobSupport,
} from "../audio/audioWorkletBlobModule";
import {
  markAudioTrafficEvent,
  type AudioTrafficForensicsState,
} from "../audioTraffic/audioTrafficForensics";
import type { RootFollowCrisisRenderEnvelope } from "./rootFollowCrisisRenderPolicy";
import type {
  RootFollowVoicePoolShadowEvent,
  RootFollowVoicePoolShadowSummary,
} from "./rootFollowVoicePoolShadowRuntime";
import {
  summarizeRootFollowGranularWorkletRenderPlan,
  type RootFollowGranularWorkletRenderPlan,
} from "./rootFollowGranularWorkletRenderPlan";
import {
  getRootFollowSampleBufferShadowTransferList,
  summarizeRootFollowSampleBufferWorkletShadowTransfer,
  type RootFollowSampleBufferWorkletShadowTransfer,
} from "./rootFollowSampleBufferWorkletShadowTransfer";
import {
  acknowledgeStableLanePlanTransport,
  getStableLanePlanTransportState,
  publishStableLanePlanViaBoundedTransport,
  resolveStableLanePlanTransportBackend,
  withStableLanePlanTransportSnapshot,
  type StableLanePlanTransportState,
} from "./rootFollowStableLanePlanTransport";
import {
  ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_CODE,
  ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_PROCESSOR_NAME as ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_PROCESSOR_NAME_SOURCE,
} from "./rootFollowWorkletShadowProcessorSource";
import {
  createRootFollowWorkletShadowBridgeSnapshot,
  publishRootFollowWorkletShadowSnapshot,
  readRootFollowWorkletShadowSnapshotFromBrowser,
  summarizeRootFollowWorkletPilotHealth,
  summarizeRootFollowWorkletThroughput,
  type RootFollowWorkletShadowBridgeSnapshot,
  type RootFollowWorkletShadowBridgeStatus,
} from "./rootFollowWorkletShadowReport";
import {
  applyRootFollowWorkletShadowProcessorMessage,
} from "./rootFollowWorkletShadowProcessorMessage";
export {
  ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_PROCESSOR_NAME,
  summarizeRootFollowWorkletPilotHealth,
} from "./rootFollowWorkletShadowReport";

export type RootFollowWorkletShadowPlanMessage = {
  type: "root-follow-worklet-shadow-plan";
  audioNowSec: number;
  eventCount: number;
  shadowEvents: readonly {
    id: string;
    voiceKey: string;
    noteStart: number;
    noteEnd: number;
    targetFrequency: number;
    sourceKind: string | null;
    noteClass: string | null;
    presetId: string | null;
  }[];
  voicePool: Pick<
    RootFollowVoicePoolShadowSummary,
    | "mode"
    | "audiblePath"
    | "plannedVoiceCount"
    | "scheduledVoiceCount"
    | "pooledVoiceCount"
    | "existingVoiceCount"
    | "activeVoiceCount"
    | "releasingVoiceCount"
    | "stealableVoiceCount"
    | "staleEventCount"
    | "lateEventCount"
    | "wouldReuseVoiceCount"
    | "wouldCreateVoiceCount"
    | "wouldStealVoiceCount"
    | "maxPoolPressure"
  >;
  crisis: Pick<
    RootFollowCrisisRenderEnvelope,
    | "densityScale"
    | "lateGrainStrategy"
    | "staleWindowMs"
    | "preventCatchUpStorm"
    | "sourcePresetId"
  >;
};

export type RootFollowWorkletDirectPilotEvent = {
  id: string;
  startSec: number;
  endSec: number;
  frequencyHz: number;
  gain: number;
};

export type RootFollowWorkletDirectPilotRouteResult = {
  status: RootFollowWorkletShadowBridgeStatus;
  handledEventIds: Set<string>;
  postedEventCount: number;
  fallbackReason: string | null;
};

const PROCESSOR_NAME = ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_PROCESSOR_NAME_SOURCE;
type RootFollowWorkletShadowBridgeHandle = {
  node: AudioWorkletNode | null;
  outputGain: GainNode | null;
  keepAliveSource: ConstantSourceNode | null;
  keepAliveGain: GainNode | null;
  bridgeSessionId: number;
  processorGeneration: number;
  snapshot: RootFollowWorkletShadowBridgeSnapshot;
};

const bridgePromises = new WeakMap<
  BaseAudioContext,
  Promise<RootFollowWorkletShadowBridgeHandle>
>();
const bridgeHandles = new WeakMap<
  BaseAudioContext,
  RootFollowWorkletShadowBridgeHandle
>();
const postedBufferTransferSignatures = new WeakMap<
  BaseAudioContext,
  Set<string>
>();

let nextRootFollowWorkletBridgeSessionId = 1;

function nowMs() {
  return typeof performance !== "undefined" &&
    typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function publishStableLanePlanTransportState(
  handle: RootFollowWorkletShadowBridgeHandle,
  state: StableLanePlanTransportState,
) {
  handle.snapshot = publishRootFollowWorkletShadowSnapshot(
    withStableLanePlanTransportSnapshot(handle.snapshot, state),
  );
}

function isLocalFileOriginContext() {
  if (typeof window === "undefined") return false;
  try {
    return window.location?.protocol === "file:";
  } catch {
    return false;
  }
}

function makeUnsupported(
  detail: string,
  requestedAtMs: number,
): RootFollowWorkletShadowBridgeHandle {
  return {
    node: null,
    outputGain: null,
    keepAliveSource: null,
    keepAliveGain: null,
    bridgeSessionId: 0,
    processorGeneration: 0,
    snapshot: publishRootFollowWorkletShadowSnapshot(
      createRootFollowWorkletShadowBridgeSnapshot({
        status: "unsupported",
        requestedAtMs,
        completedAtMs: nowMs(),
        detail,
        pilotHealth: "unsupported",
      }),
    ),
  };
}

async function createRootFollowWorkletShadowBridge(
  ctx: BaseAudioContext,
): Promise<RootFollowWorkletShadowBridgeHandle> {
  const requestedAtMs = nowMs();
  publishRootFollowWorkletShadowSnapshot(
    createRootFollowWorkletShadowBridgeSnapshot({
      status: "loading",
      requestedAtMs,
      detail: "root-follow-worklet-shadow-bridge-requested",
    }),
  );

  if (isLocalFileOriginContext())
    return makeUnsupported(
      "file-origin-blocks-blob-worklet-shadow",
      requestedAtMs,
    );
  const supportStatus = resolveAudioWorkletBlobSupport(ctx);
  if (supportStatus !== "supported")
    return makeUnsupported(supportStatus, requestedAtMs);

  const bridgeSessionId = nextRootFollowWorkletBridgeSessionId++;
  const processorGeneration = bridgeSessionId;
  try {
    await addAudioWorkletBlobModule(
      ctx,
      ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_CODE,
    );
    // A recreated Worklet processor does not know about earlier transferred buffers.
    // Reset the per-context transfer signature cache here so the next pilot plan
    // cannot falsely assume its source buffer is already hydrated in the processor.
    postedBufferTransferSignatures.set(ctx, new Set<string>());
    const node = new AudioWorkletNode(ctx, PROCESSOR_NAME, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
    const outputGain = ctx.createGain();
    outputGain.gain.value = 1;
    const keepAliveSource = ctx.createConstantSource();
    const keepAliveGain = ctx.createGain();
    keepAliveSource.offset.value = 1;
    keepAliveGain.gain.value = 1;
    keepAliveSource.connect(keepAliveGain);
    keepAliveGain.connect(node);
    node.connect(outputGain);
    outputGain.connect(ctx.destination);
    try {
      keepAliveSource.start();
    } catch {}

    const handle: RootFollowWorkletShadowBridgeHandle = {
      node,
      outputGain,
      keepAliveSource,
      keepAliveGain,
      bridgeSessionId,
      processorGeneration,
      snapshot: publishRootFollowWorkletShadowSnapshot(
        createRootFollowWorkletShadowBridgeSnapshot({
          status: "loaded",
          requestedAtMs,
          completedAtMs: nowMs(),
          detail:
            "blob-url-worklet-shadow-loaded-active-keepalive-node-instantiated",
          bridgeSessionId,
          processorGeneration,
          workletNodeCreated: true,
          workletNodeConnected: true,
        }),
      ),
    };

    node.onprocessorerror = () => {
      handle.snapshot = publishRootFollowWorkletShadowSnapshot({
        ...handle.snapshot,
        status: "failed",
        processorAlive: false,
        processorErrorCount: handle.snapshot.processorErrorCount + 1,
        pilotHealth: "failed",
        detail: "root-follow-worklet-processor-error-silenced-node",
        errorMessage:
          "AudioWorklet processorerror fired; processor output is treated as silent.",
      });
    };

    node.port.onmessage = (event) => {
      const result = applyRootFollowWorkletShadowProcessorMessage({
        snapshot: handle.snapshot,
        data: event.data || {},
        bridgeSessionId: handle.bridgeSessionId,
        processorGeneration: handle.processorGeneration,
        nowMs,
      });
      handle.snapshot = publishRootFollowWorkletShadowSnapshot(result.snapshot);
      if (result.stableLaneAckPlanSequence !== null) {
        const stableLanePlanTransportBackend =
          resolveStableLanePlanTransportBackend({
            postMessage: (message) => handle.node?.port.postMessage(message),
          });
        acknowledgeStableLanePlanTransport({
          ctx,
          planSequence: result.stableLaneAckPlanSequence,
          canPostPending:
            handle.node !== null && handle.snapshot.status === "loaded",
          backend: stableLanePlanTransportBackend,
          publishState: (state) =>
            publishStableLanePlanTransportState(handle, state),
        });
      }
    };
    bridgeHandles.set(ctx, handle);
    return handle;
  } catch (error) {
    const handle: RootFollowWorkletShadowBridgeHandle = {
      node: null,
      outputGain: null,
      keepAliveSource: null,
      keepAliveGain: null,
      bridgeSessionId,
      processorGeneration,
      snapshot: publishRootFollowWorkletShadowSnapshot(
        createRootFollowWorkletShadowBridgeSnapshot({
          status: "failed",
          requestedAtMs,
          completedAtMs: nowMs(),
          detail: "root-follow-worklet-shadow-bridge-failed",
          pilotHealth: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
        }),
      ),
    };
    bridgeHandles.set(ctx, handle);
    return handle;
  }
}

export function ensureRootFollowWorkletShadowBridge(
  ctx: BaseAudioContext,
): Promise<RootFollowWorkletShadowBridgeHandle> {
  const existing = bridgePromises.get(ctx);
  if (existing) return existing;
  const promise = createRootFollowWorkletShadowBridge(ctx);
  bridgePromises.set(ctx, promise);
  return promise;
}

export async function primeRootFollowWorkletLiveness(args: {
  ctx: BaseAudioContext;
  audioNowSec?: number;
  trafficRef?: { current?: AudioTrafficForensicsState | null } | null;
  reason?: string;
}) {
  const handle = await ensureRootFollowWorkletShadowBridge(args.ctx);
  if (handle.node && handle.snapshot.status === "loaded") {
    try {
      handle.node.port.postMessage({
        type: "root-follow-worklet-ping",
        audioNowSec:
          args.audioNowSec ??
          ("currentTime" in args.ctx ? Number(args.ctx.currentTime) : 0),
      });
    } catch (error) {
      handle.snapshot = publishRootFollowWorkletShadowSnapshot({
        ...handle.snapshot,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        detail: "root-follow-worklet-ping-post-message-failed",
      });
    }
  }
  markAudioTrafficEvent(args.trafficRef?.current ?? null, {
    subsystem: "root-follow",
    kind: "worklet-shadow-bridge",
    audioNowSec:
      args.audioNowSec ??
      ("currentTime" in args.ctx ? Number(args.ctx.currentTime) : 0),
    detail: {
      status: handle.snapshot.status,
      processorName: PROCESSOR_NAME,
      livenessOnly: true,
      reason: args.reason ?? null,
      throughput: summarizeRootFollowWorkletThroughput(handle.snapshot),
    },
  });
  return handle.snapshot;
}

function mapShadowEventForMessage(event: RootFollowVoicePoolShadowEvent) {
  return {
    id: event.id,
    voiceKey: event.voiceKey,
    noteStart: event.noteStart,
    noteEnd: event.noteEnd,
    targetFrequency: event.targetFrequency,
    sourceKind: event.sourceKind,
    noteClass: event.noteClass,
    presetId: event.presetId,
  };
}

function buildShadowMessage(args: {
  audioNowSec: number;
  shadowEvents: readonly RootFollowVoicePoolShadowEvent[];
  voicePool: RootFollowVoicePoolShadowSummary;
  crisisEnvelope: RootFollowCrisisRenderEnvelope;
}): RootFollowWorkletShadowPlanMessage {
  return {
    type: "root-follow-worklet-shadow-plan",
    audioNowSec: args.audioNowSec,
    eventCount: args.shadowEvents.length,
    shadowEvents: args.shadowEvents.slice(0, 64).map(mapShadowEventForMessage),
    voicePool: {
      mode: args.voicePool.mode,
      audiblePath: args.voicePool.audiblePath,
      plannedVoiceCount: args.voicePool.plannedVoiceCount,
      scheduledVoiceCount: args.voicePool.scheduledVoiceCount,
      pooledVoiceCount: args.voicePool.pooledVoiceCount,
      existingVoiceCount: args.voicePool.existingVoiceCount,
      activeVoiceCount: args.voicePool.activeVoiceCount,
      releasingVoiceCount: args.voicePool.releasingVoiceCount,
      stealableVoiceCount: args.voicePool.stealableVoiceCount,
      staleEventCount: args.voicePool.staleEventCount,
      lateEventCount: args.voicePool.lateEventCount,
      wouldReuseVoiceCount: args.voicePool.wouldReuseVoiceCount,
      wouldCreateVoiceCount: args.voicePool.wouldCreateVoiceCount,
      wouldStealVoiceCount: args.voicePool.wouldStealVoiceCount,
      maxPoolPressure: args.voicePool.maxPoolPressure,
    },
    crisis: {
      densityScale: args.crisisEnvelope.densityScale,
      lateGrainStrategy: args.crisisEnvelope.lateGrainStrategy,
      staleWindowMs: args.crisisEnvelope.staleWindowMs,
      preventCatchUpStorm: args.crisisEnvelope.preventCatchUpStorm,
      sourcePresetId: args.crisisEnvelope.sourcePresetId,
    },
  };
}

export function publishRootFollowWorkletShadowPlan(args: {
  ctx: BaseAudioContext;
  audioNowSec: number;
  shadowEvents: readonly RootFollowVoicePoolShadowEvent[];
  voicePool: RootFollowVoicePoolShadowSummary;
  crisisEnvelope: RootFollowCrisisRenderEnvelope;
  trafficRef?: { current?: AudioTrafficForensicsState | null } | null;
  reason?: string;
}) {
  void ensureRootFollowWorkletShadowBridge(args.ctx).then((handle) => {
    const message = buildShadowMessage(args);
    if (handle.node) {
      try {
        handle.node.port.postMessage(message);
      } catch (error) {
        handle.snapshot = publishRootFollowWorkletShadowSnapshot({
          ...handle.snapshot,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
          detail: "root-follow-worklet-shadow-post-message-failed",
        });
      }
    }
    markAudioTrafficEvent(args.trafficRef?.current ?? null, {
      subsystem: "root-follow",
      kind: "worklet-shadow-bridge",
      audioNowSec: args.audioNowSec,
      detail: {
        status: handle.snapshot.status,
        processorName: PROCESSOR_NAME,
        silentShadowOnly: true,
        preservesMainThreadReferencePath: true,
        eventCount: message.eventCount,
        scheduledVoiceCount: message.voicePool.scheduledVoiceCount,
        maxPoolPressure: message.voicePool.maxPoolPressure,
        detail: handle.snapshot.detail,
        throughput: summarizeRootFollowWorkletThroughput(handle.snapshot),
      },
    });
  });
}

export async function routeRootFollowWorkletDirectPilotEvents(args: {
  ctx: BaseAudioContext;
  audioNowSec: number;
  pilotEvents: readonly RootFollowWorkletDirectPilotEvent[];
  shadowEvents: readonly RootFollowVoicePoolShadowEvent[];
  voicePool: RootFollowVoicePoolShadowSummary;
  crisisEnvelope: RootFollowCrisisRenderEnvelope;
  trafficRef?: { current?: AudioTrafficForensicsState | null } | null;
  reason?: string;
}): Promise<RootFollowWorkletDirectPilotRouteResult> {
  const handle = await ensureRootFollowWorkletShadowBridge(args.ctx);
  const eligible = args.pilotEvents
    .filter((event) => event.endSec > args.audioNowSec + 0.004)
    .slice(0, 64);
  if (
    !handle.node ||
    !handle.outputGain ||
    handle.snapshot.status !== "loaded"
  ) {
    markAudioTrafficEvent(args.trafficRef?.current ?? null, {
      subsystem: "root-follow",
      kind: "worklet-shadow-bridge",
      audioNowSec: args.audioNowSec,
      detail: {
        status: handle.snapshot.status,
        directPilotActive: false,
        fallbackReason:
          handle.snapshot.detail ?? "worklet-direct-pilot-unavailable",
        eventCount: eligible.length,
      },
    });
    return {
      status: handle.snapshot.status,
      handledEventIds: new Set<string>(),
      postedEventCount: 0,
      fallbackReason:
        handle.snapshot.detail ?? "worklet-direct-pilot-unavailable",
    };
  }

  const gainParam = handle.outputGain.gain;
  try {
    if (typeof gainParam.setTargetAtTime === "function") {
      gainParam.setTargetAtTime(0.82, args.audioNowSec, 0.012);
    } else gainParam.value = 0.82;
  } catch {
    gainParam.value = 0.82;
  }

  const message = {
    type: "root-follow-worklet-direct-pilot-events",
    active: true,
    audioNowSec: args.audioNowSec,
    events: eligible,
    shadow: buildShadowMessage(args),
  };

  try {
    handle.node.port.postMessage(message);
    handle.snapshot = publishRootFollowWorkletShadowSnapshot({
      ...handle.snapshot,
      silentShadowOnly: false,
      directPilotActive: true,
      detail: "root-follow-worklet-direct-pilot-posted-events",
    });
  } catch (error) {
    handle.snapshot = publishRootFollowWorkletShadowSnapshot({
      ...handle.snapshot,
      status: "failed",
      directPilotActive: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      detail: "root-follow-worklet-direct-pilot-post-message-failed",
    });
    return {
      status: "failed",
      handledEventIds: new Set<string>(),
      postedEventCount: 0,
      fallbackReason: handle.snapshot.detail,
    };
  }

  markAudioTrafficEvent(args.trafficRef?.current ?? null, {
    subsystem: "root-follow",
    kind: "worklet-shadow-bridge",
    audioNowSec: args.audioNowSec,
    detail: {
      status: handle.snapshot.status,
      processorName: PROCESSOR_NAME,
      silentShadowOnly: false,
      directPilotActive: true,
      scope: "root-follow-direct-synth-only",
      eventCount: eligible.length,
      scheduledVoiceCount: args.voicePool.scheduledVoiceCount,
      maxPoolPressure: args.voicePool.maxPoolPressure,
      fallbackReason: null,
    },
  });

  return {
    status: handle.snapshot.status,
    handledEventIds: new Set(eligible.map((event) => event.id)),
    postedEventCount: eligible.length,
    fallbackReason: null,
  };
}

export function publishRootFollowWorkletGranularRenderPlan(args: {
  ctx: BaseAudioContext;
  audioNowSec: number;
  plan: RootFollowGranularWorkletRenderPlan;
  trafficRef?: { current?: AudioTrafficForensicsState | null } | null;
  reason?: string;
}) {
  void ensureRootFollowWorkletShadowBridge(args.ctx).then((handle) => {
    if (handle.outputGain) handle.outputGain.gain.value = 0;
    const summary = summarizeRootFollowGranularWorkletRenderPlan(args.plan);
    if (handle.node && handle.snapshot.status === "loaded") {
      try {
        handle.node.port.postMessage({
          type: "root-follow-worklet-granular-shadow-plan",
          audioNowSec: args.audioNowSec,
          plan: args.plan,
        });
        handle.snapshot = publishRootFollowWorkletShadowSnapshot({
          ...handle.snapshot,
          silentShadowOnly: true,
          granularShadowActive: true,
          detail: "root-follow-worklet-granular-shadow-posted-plan",
        });
      } catch (error) {
        handle.snapshot = publishRootFollowWorkletShadowSnapshot({
          ...handle.snapshot,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
          detail: "root-follow-worklet-granular-shadow-post-message-failed",
        });
      }
    }
    markAudioTrafficEvent(args.trafficRef?.current ?? null, {
      subsystem: "root-follow",
      kind: "worklet-shadow-bridge",
      audioNowSec: args.audioNowSec,
      detail: {
        status: handle.snapshot.status,
        processorName: PROCESSOR_NAME,
        granularShadowActive: true,
        silentShadowOnly: true,
        preservesLegacyMaterialPath: true,
        hasSampleBufferTransfer: false,
        activeAudioPath: false,
        planSummary: summary,
        detail: handle.snapshot.detail,
        throughput: summarizeRootFollowWorkletThroughput(handle.snapshot),
      },
    });
  });
}

export function publishRootFollowWorkletBufferShadowTransfer(args: {
  ctx: BaseAudioContext;
  audioNowSec: number;
  transfer: RootFollowSampleBufferWorkletShadowTransfer;
  trafficRef?: { current?: AudioTrafficForensicsState | null } | null;
  reason?: string;
}) {
  void ensureRootFollowWorkletShadowBridge(args.ctx).then((handle) => {
    if (handle.outputGain) handle.outputGain.gain.value = 0;
    const summary = summarizeRootFollowSampleBufferWorkletShadowTransfer(
      args.transfer,
    );
    const signatureSet =
      postedBufferTransferSignatures.get(args.ctx) ?? new Set<string>();
    if (!postedBufferTransferSignatures.has(args.ctx))
      postedBufferTransferSignatures.set(args.ctx, signatureSet);
    const alreadyPosted = signatureSet.has(args.transfer.transferSignature);
    let posted = false;
    if (handle.node && handle.snapshot.status === "loaded" && !alreadyPosted) {
      try {
        handle.node.port.postMessage(
          {
            type: "root-follow-worklet-buffer-shadow-transfer",
            audioNowSec: args.audioNowSec,
            transfer: args.transfer,
          },
          getRootFollowSampleBufferShadowTransferList(args.transfer),
        );
        signatureSet.add(args.transfer.transferSignature);
        posted = true;
        handle.snapshot = publishRootFollowWorkletShadowSnapshot({
          ...handle.snapshot,
          silentShadowOnly: true,
          bufferShadowActive: true,
          detail: "root-follow-worklet-buffer-shadow-posted-transfer",
        });
      } catch (error) {
        handle.snapshot = publishRootFollowWorkletShadowSnapshot({
          ...handle.snapshot,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
          detail: "root-follow-worklet-buffer-shadow-post-message-failed",
        });
      }
    }
    markAudioTrafficEvent(args.trafficRef?.current ?? null, {
      subsystem: "root-follow",
      kind: "worklet-shadow-bridge",
      audioNowSec: args.audioNowSec,
      detail: {
        status: handle.snapshot.status,
        processorName: PROCESSOR_NAME,
        bufferShadowActive: true,
        silentShadowOnly: true,
        preservesLegacyMaterialPath: true,
        activeAudioPath: false,
        hasSampleBufferTransfer: true,
        transfersFullSourceBuffer: false,
        posted,
        alreadyPosted,
        transferSummary: summary,
        detail: handle.snapshot.detail,
        throughput: summarizeRootFollowWorkletThroughput(handle.snapshot),
      },
    });
  });
}

export function publishRootFollowWorkletGranularPilotBufferAndPlan(args: {
  ctx: BaseAudioContext;
  audioNowSec: number;
  transfer: RootFollowSampleBufferWorkletShadowTransfer;
  plan: RootFollowGranularWorkletRenderPlan;
  trafficRef?: { current?: AudioTrafficForensicsState | null } | null;
  reason?: string;
}) {
  void ensureRootFollowWorkletShadowBridge(args.ctx).then((handle) => {
    const transferSummary =
      summarizeRootFollowSampleBufferWorkletShadowTransfer(args.transfer);
    const planSummary = summarizeRootFollowGranularWorkletRenderPlan(args.plan);
    const signatureSet =
      postedBufferTransferSignatures.get(args.ctx) ?? new Set<string>();
    if (!postedBufferTransferSignatures.has(args.ctx))
      postedBufferTransferSignatures.set(args.ctx, signatureSet);
    const alreadyPosted = signatureSet.has(args.transfer.transferSignature);
    let bufferPosted = false;
    let pilotPosted = false;
    if (handle.node && handle.snapshot.status === "loaded") {
      try {
        if (!alreadyPosted) {
          handle.node.port.postMessage(
            {
              type: "root-follow-worklet-buffer-shadow-transfer",
              audioNowSec: args.audioNowSec,
              transfer: args.transfer,
            },
            getRootFollowSampleBufferShadowTransferList(args.transfer),
          );
          signatureSet.add(args.transfer.transferSignature);
          bufferPosted = true;
        }
        const gainParam = handle.outputGain?.gain;
        if (gainParam) {
          if (typeof gainParam.setTargetAtTime === "function")
            gainParam.setTargetAtTime(0.42, args.audioNowSec, 0.018);
          else gainParam.value = 0.42;
        }
        handle.node.port.postMessage({
          type: "root-follow-worklet-granular-pilot-plan",
          active: true,
          audioNowSec: args.audioNowSec,
          plan: {
            ...args.plan,
            activeAudioPath: Boolean(args.plan.activeAudioPath),
            hasSampleBufferTransfer: true,
          },
        });
        pilotPosted = true;
        handle.snapshot = publishRootFollowWorkletShadowSnapshot({
          ...handle.snapshot,
          silentShadowOnly: false,
          granularShadowActive: true,
          bufferShadowActive: true,
          granularPilotActive: true,
          detail: "root-follow-worklet-granular-pilot-posted-buffer-and-plan",
        });
      } catch (error) {
        handle.snapshot = publishRootFollowWorkletShadowSnapshot({
          ...handle.snapshot,
          status: "failed",
          granularPilotActive: false,
          errorMessage: error instanceof Error ? error.message : String(error),
          detail: "root-follow-worklet-granular-pilot-post-message-failed",
        });
      }
    }
    markAudioTrafficEvent(args.trafficRef?.current ?? null, {
      subsystem: "root-follow",
      kind: "worklet-shadow-bridge",
      audioNowSec: args.audioNowSec,
      detail: {
        status: handle.snapshot.status,
        processorName: PROCESSOR_NAME,
        granularPilotActive: pilotPosted,
        silentShadowOnly: false,
        preservesLegacyMaterialPath: true,
        activeAudioPath: pilotPosted,
        hasSampleBufferTransfer: true,
        transfersFullSourceBuffer: false,
        bufferPosted,
        alreadyPosted,
        additivePilotOverLegacy: true,
        transferSummary,
        planSummary,
        detail: handle.snapshot.detail,
        throughput: summarizeRootFollowWorkletThroughput(handle.snapshot),
      },
    });
  });
}

function stableLaneBufferGenerationForTransfer(
  transfer: RootFollowSampleBufferWorkletShadowTransfer,
) {
  const signature = String(
    transfer.transferSignature || transfer.entryId || "stable-lane-buffer",
  );
  let hash = 2166136261;
  for (let index = 0; index < signature.length; index += 1) {
    hash ^= signature.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

function clampStableLanePilotBlend(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(0.72, numeric));
}

function stableLaneBufferSessionSignature(args: {
  bridgeSessionId: number;
  processorGeneration: number;
  transferSignature: string;
  bufferGeneration: number;
}) {
  return [
    args.bridgeSessionId,
    args.processorGeneration,
    args.bufferGeneration,
    args.transferSignature,
  ].join(":");
}

export function publishRootFollowWorkletStableLaneBufferAndPlan(args: {
  ctx: BaseAudioContext;
  audioNowSec: number;
  transfer: RootFollowSampleBufferWorkletShadowTransfer;
  lanePlan: {
    entryId: string;
    planSequence: number;
    loopStartSec: number;
    loopEndSec: number;
    sourceOffsetSec: number;
    playbackRate: number;
    targetHz: number;
    anchorHz: number;
    gain: number;
    densityScale: number;
    stableLaneBlend?: number;
    legacyBlend?: number;
  };
  trafficRef?: { current?: AudioTrafficForensicsState | null } | null;
  reason?: string;
}) {
  void ensureRootFollowWorkletShadowBridge(args.ctx).then((handle) => {
    const transferSummary =
      summarizeRootFollowSampleBufferWorkletShadowTransfer(args.transfer);
    const signatureSet =
      postedBufferTransferSignatures.get(args.ctx) ?? new Set<string>();
    if (!postedBufferTransferSignatures.has(args.ctx))
      postedBufferTransferSignatures.set(args.ctx, signatureSet);
    const bufferGeneration = stableLaneBufferGenerationForTransfer(
      args.transfer,
    );
    const sessionSignature = stableLaneBufferSessionSignature({
      bridgeSessionId: handle.bridgeSessionId,
      processorGeneration: handle.processorGeneration,
      transferSignature: args.transfer.transferSignature,
      bufferGeneration,
    });
    const alreadyPosted = signatureSet.has(sessionSignature);
    let bufferPosted = false;
    let lanePosted = false;
    let lanePending = false;
    let laneTransportForced = false;
    if (handle.node && handle.snapshot.status === "loaded") {
      try {
        if (!alreadyPosted) {
          handle.node.port.postMessage(
            {
              type: "root-follow-worklet-stable-lane-buffer-transfer",
              audioNowSec: args.audioNowSec,
              bridgeSessionId: handle.bridgeSessionId,
              processorGeneration: handle.processorGeneration,
              bufferGeneration,
              transfer: {
                ...args.transfer,
                bufferGeneration,
              },
            },
            getRootFollowSampleBufferShadowTransferList(args.transfer),
          );
          signatureSet.add(sessionSignature);
          bufferPosted = true;
        }
        const stableLaneBlendTarget = clampStableLanePilotBlend(
          args.lanePlan.stableLaneBlend,
          0.42,
        );
        const gainParam = handle.outputGain?.gain;
        if (gainParam) {
          if (typeof gainParam.cancelScheduledValues === "function")
            gainParam.cancelScheduledValues(args.audioNowSec);
          if (typeof gainParam.setTargetAtTime === "function")
            gainParam.setTargetAtTime(
              stableLaneBlendTarget,
              args.audioNowSec,
              0.055,
            );
          else gainParam.value = stableLaneBlendTarget;
        }
        const stableLanePlanTransportBackend =
          resolveStableLanePlanTransportBackend({
            postMessage: (message) => handle.node?.port.postMessage(message),
          });
        const laneTransport = publishStableLanePlanViaBoundedTransport({
          ctx: args.ctx,
          backend: stableLanePlanTransportBackend,
          publishState: (state) =>
            publishStableLanePlanTransportState(handle, state),
          message: {
            type: "root-follow-worklet-stable-lane-plan",
            active: true,
            audioNowSec: args.audioNowSec,
            bridgeSessionId: handle.bridgeSessionId,
            processorGeneration: handle.processorGeneration,
            bufferGeneration,
            plan: {
              ...args.lanePlan,
              bufferGeneration,
            },
          },
        });
        lanePosted = laneTransport.posted;
        lanePending = laneTransport.pending;
        laneTransportForced = laneTransport.forced;
        handle.snapshot = publishRootFollowWorkletShadowSnapshot({
          ...handle.snapshot,
          silentShadowOnly: false,
          bufferShadowActive: true,
          stableLaneActive:
            handle.snapshot.stableLaneActive &&
            handle.snapshot.lastStableLaneBufferAvailable,
          stableLanePlanSentCount:
            handle.snapshot.stableLanePlanSentCount + (lanePosted ? 1 : 0),
          stableLaneBufferGeneration: bufferGeneration,
          stableLanePlanAcked: lanePosted
            ? false
            : handle.snapshot.stableLanePlanAcked,
          stableLanePlanRejectedReason: null,
          detail: lanePending
            ? "root-follow-worklet-stable-lane-plan-pending-bounded-transport"
            : bufferPosted
              ? "root-follow-worklet-stable-lane-posted-buffer-and-plan-awaiting-ack"
              : "root-follow-worklet-stable-lane-posted-plan-awaiting-ack-buffer-already-hydrated",
        });
        handle.snapshot = publishRootFollowWorkletShadowSnapshot(
          withStableLanePlanTransportSnapshot(
            handle.snapshot,
            getStableLanePlanTransportState(args.ctx),
          ),
        );
      } catch (error) {
        handle.snapshot = publishRootFollowWorkletShadowSnapshot({
          ...handle.snapshot,
          status: "failed",
          stableLaneActive: false,
          errorMessage: error instanceof Error ? error.message : String(error),
          detail: "root-follow-worklet-stable-lane-post-message-failed",
        });
      }
    }
    markAudioTrafficEvent(args.trafficRef?.current ?? null, {
      subsystem: "root-follow",
      kind: "worklet-shadow-bridge",
      audioNowSec: args.audioNowSec,
      detail: {
        status: handle.snapshot.status,
        processorName: PROCESSOR_NAME,
        bridgeSessionId: handle.bridgeSessionId,
        processorGeneration: handle.processorGeneration,
        stableLaneActive: handle.snapshot.stableLaneActive,
        silentShadowOnly: false,
        preservesLegacyMaterialPath: true,
        activeAudioPath: handle.snapshot.stableLaneActive,
        hasSampleBufferTransfer: true,
        transfersFullSourceBuffer: false,
        bufferPosted,
        alreadyPosted,
        bufferGeneration,
        sessionSignature,
        planPosted: lanePosted,
        planPending: lanePending,
        planTransportForcedPost: laneTransportForced,
        stableLanePlanTransport: {
          backendKind: handle.snapshot.stableLanePlanTransportBackendKind,
          sabRingbufferReserved:
            handle.snapshot.stableLanePlanTransportSabRingbufferReserved,
          backendFallbackReason:
            handle.snapshot.stableLanePlanTransportBackendFallbackReason,
          inFlightSequence:
            handle.snapshot.stableLanePlanTransportInFlightSequence,
          pendingSequence:
            handle.snapshot.stableLanePlanTransportPendingSequence,
          postedCount: handle.snapshot.stableLanePlanTransportPostedCount,
          pendingCount: handle.snapshot.stableLanePlanTransportPendingCount,
          droppedSupersededCount:
            handle.snapshot.stableLanePlanTransportDroppedSupersededCount,
          forcedPostCount:
            handle.snapshot.stableLanePlanTransportForcedPostCount,
          ackCount: handle.snapshot.stableLanePlanTransportAckCount,
        },
        stableLaneBlendTarget: clampStableLanePilotBlend(
          args.lanePlan.stableLaneBlend,
          0.42,
        ),
        legacyBlendTarget: Math.max(
          0,
          Math.min(1, Number(args.lanePlan.legacyBlend) || 1),
        ),
        additivePilotOverLegacy: true,
        stableLanePlan: {
          ...args.lanePlan,
          bufferGeneration,
        },
        transferSummary,
        detail: handle.snapshot.detail,
        throughput: summarizeRootFollowWorkletThroughput(handle.snapshot),
      },
    });
  });
}

export type RootFollowStableLaneSyntheticSilentProbeResult = {
  version: 1;
  probeKind: "stable-lane-synthetic-silent-plan";
  status: "posted" | "blocked" | "failed";
  blockerReason: string | null;
  startedAtMs: number;
  completedAtMs: number;
  elapsedMs: number;
  audioContextState: string;
  posted: boolean;
  acked: boolean;
  renderedFrameDelta: number;
  laneQuantaDelta: number;
  planSequence: number;
  entryId: string;
  transferFrameCount: number;
  snapshot: ReturnType<typeof summarizeRootFollowWorkletPilotHealth>;
};

function makeSyntheticSilentStableLaneTransfer(args: {
  ctx: BaseAudioContext;
  audioNowSec: number;
  entryId: string;
  frameCount: number;
}): RootFollowSampleBufferWorkletShadowTransfer {
  const sampleRate = Math.max(
    1,
    Math.round(Number((args.ctx as any).sampleRate) || 44100),
  );
  const frameCount = Math.max(
    512,
    Math.min(4096, Math.round(args.frameCount || 2048)),
  );
  const data = new Float32Array(frameCount);
  return {
    version: 1,
    lane: "root-follow-material-buffer-shadow",
    entryId: args.entryId,
    audioNowSec: args.audioNowSec,
    sampleRate,
    numberOfChannels: 1,
    sourceFrameCount: frameCount,
    durationSec: frameCount / sampleRate,
    loopStartSec: 0,
    loopEndSec: frameCount / sampleRate,
    transferStartFrame: 0,
    transferFrameCount: frameCount,
    transferDurationSec: frameCount / sampleRate,
    transferByteLength: data.byteLength,
    transferSignature: `${args.entryId}:${sampleRate}:${frameCount}:synthetic-silent-probe`,
    transferKind: "bounded-shadow-window",
    channels: [
      {
        channelIndex: 0,
        frameCount,
        peak: 0,
        rms: 0,
        checksum: 0,
        data,
      },
    ],
    preservesLegacyMaterialPath: true,
    activeAudioPath: false,
    hasSampleBufferTransfer: true,
    transfersFullSourceBuffer: false,
  };
}

function publishStableLaneSyntheticSilentProbeGlobal(
  result: RootFollowStableLaneSyntheticSilentProbeResult,
) {
  if (typeof window === "undefined") return;
  (
    window as typeof window & {
      __XENSONAR_STABLE_LANE_SYNTHETIC_SILENT_PLAN_PROBE__?: RootFollowStableLaneSyntheticSilentProbeResult;
    }
  ).__XENSONAR_STABLE_LANE_SYNTHETIC_SILENT_PLAN_PROBE__ = result;
}

function waitMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runRootFollowStableLaneSyntheticSilentPlanProbe(args: {
  ctx?: BaseAudioContext | null;
  audioNowSec?: number;
  probeWindowMs?: number;
}): Promise<RootFollowStableLaneSyntheticSilentProbeResult> {
  const startedAtMs = nowMs();
  const ctx = args.ctx ?? null;
  const audioContextState =
    ctx && "state" in ctx
      ? String((ctx as any).state || "unknown")
      : "missing-audio-context";
  const finish = (
    patch: Partial<RootFollowStableLaneSyntheticSilentProbeResult>,
  ): RootFollowStableLaneSyntheticSilentProbeResult => {
    const completedAtMs = nowMs();
    const snapshot = summarizeRootFollowWorkletPilotHealth(
      ctx ? getRootFollowWorkletShadowBridgeSnapshot(ctx) : null,
    );
    const result: RootFollowStableLaneSyntheticSilentProbeResult = {
      version: 1,
      probeKind: "stable-lane-synthetic-silent-plan",
      status: patch.status ?? "blocked",
      blockerReason: patch.blockerReason ?? null,
      startedAtMs,
      completedAtMs,
      elapsedMs: Math.max(0, completedAtMs - startedAtMs),
      audioContextState,
      posted: patch.posted === true,
      acked: patch.acked === true,
      renderedFrameDelta: Math.max(0, Number(patch.renderedFrameDelta) || 0),
      laneQuantaDelta: Math.max(0, Number(patch.laneQuantaDelta) || 0),
      planSequence: Math.max(0, Number(patch.planSequence) || 0),
      entryId: String(patch.entryId || ""),
      transferFrameCount: Math.max(0, Number(patch.transferFrameCount) || 0),
      snapshot,
    };
    publishStableLaneSyntheticSilentProbeGlobal(result);
    return result;
  };

  if (typeof window === "undefined")
    return finish({
      status: "blocked",
      blockerReason: "not-in-browser-runtime",
    });
  if (!ctx)
    return finish({
      status: "blocked",
      blockerReason: "missing-audio-context",
    });
  if (audioContextState === "closed")
    return finish({ status: "blocked", blockerReason: "audio-context-closed" });
  if (audioContextState === "suspended")
    return finish({
      status: "blocked",
      blockerReason: "audio-context-suspended",
    });

  try {
    const handle = await ensureRootFollowWorkletShadowBridge(ctx);
    if (!handle.node || handle.snapshot.status !== "loaded") {
      return finish({
        status: "blocked",
        blockerReason: handle.snapshot.detail ?? "worklet-bridge-not-loaded",
      });
    }
    const before = handle.snapshot;
    const beforeFrames = before.stableLaneRenderedFrameCount;
    const beforeQuanta = before.stableLaneActiveRenderQuantumCount;
    const probeId = Math.max(1, Math.floor(startedAtMs));
    const entryId = `stable-lane-synthetic-silent-probe-${probeId}`;
    const audioNowSec =
      args.audioNowSec ??
      ("currentTime" in ctx ? Number((ctx as any).currentTime) : 0);
    const transfer = makeSyntheticSilentStableLaneTransfer({
      ctx,
      audioNowSec,
      entryId,
      frameCount: 2048,
    });
    const bufferGeneration = stableLaneBufferGenerationForTransfer(transfer);
    const sessionSignature = stableLaneBufferSessionSignature({
      bridgeSessionId: handle.bridgeSessionId,
      processorGeneration: handle.processorGeneration,
      transferSignature: transfer.transferSignature,
      bufferGeneration,
    });
    const signatureSet =
      postedBufferTransferSignatures.get(ctx) ?? new Set<string>();
    if (!postedBufferTransferSignatures.has(ctx))
      postedBufferTransferSignatures.set(ctx, signatureSet);
    if (!signatureSet.has(sessionSignature)) {
      handle.node.port.postMessage(
        {
          type: "root-follow-worklet-stable-lane-buffer-transfer",
          audioNowSec,
          bridgeSessionId: handle.bridgeSessionId,
          processorGeneration: handle.processorGeneration,
          bufferGeneration,
          transfer: { ...transfer, bufferGeneration },
        },
        getRootFollowSampleBufferShadowTransferList(transfer),
      );
      signatureSet.add(sessionSignature);
    }
    const planSequence = Math.max(1, Math.floor(startedAtMs));
    const backend = resolveStableLanePlanTransportBackend({
      postMessage: (message) => handle.node?.port.postMessage(message),
    });
    const transport = publishStableLanePlanViaBoundedTransport({
      ctx,
      backend,
      publishState: (state) =>
        publishStableLanePlanTransportState(handle, state),
      message: {
        type: "root-follow-worklet-stable-lane-plan",
        active: true,
        audioNowSec,
        bridgeSessionId: handle.bridgeSessionId,
        processorGeneration: handle.processorGeneration,
        bufferGeneration,
        probeKind: "stable-lane-synthetic-silent-plan",
        plan: {
          entryId,
          planSequence,
          loopStartSec: 0,
          loopEndSec: transfer.durationSec,
          sourceOffsetSec: 0,
          playbackRate: 1,
          targetHz: 220,
          anchorHz: 220,
          gain: 0,
          densityScale: 0,
          stableLaneBlend: 0,
          legacyBlend: 1,
          bufferGeneration,
          probeKind: "stable-lane-synthetic-silent-plan",
        } as any,
      } as any,
    });
    handle.snapshot = publishRootFollowWorkletShadowSnapshot({
      ...handle.snapshot,
      stableLaneSyntheticSilentProbeAttemptCount:
        handle.snapshot.stableLaneSyntheticSilentProbeAttemptCount + 1,
      stableLaneSyntheticSilentProbePostedCount:
        handle.snapshot.stableLaneSyntheticSilentProbePostedCount +
        (transport.posted ? 1 : 0),
      stableLaneSyntheticSilentProbeLastResult: transport.pending
        ? "pending"
        : "posted",
      stableLaneSyntheticSilentProbeLastAtMs: nowMs(),
      detail: transport.pending
        ? "stable-lane-synthetic-silent-probe-pending"
        : "stable-lane-synthetic-silent-probe-posted",
    });
    const probeWindowMs = Math.max(
      180,
      Math.min(900, Math.round(args.probeWindowMs ?? 520)),
    );
    const deadline = nowMs() + probeWindowMs;
    let lastSnapshot = handle.snapshot;
    while (nowMs() < deadline) {
      await waitMs(70);
      lastSnapshot =
        getRootFollowWorkletShadowBridgeSnapshot(ctx) ?? lastSnapshot;
      const frameDelta = Math.max(
        0,
        lastSnapshot.stableLaneRenderedFrameCount - beforeFrames,
      );
      const laneQuantaDelta = Math.max(
        0,
        lastSnapshot.stableLaneActiveRenderQuantumCount - beforeQuanta,
      );
      if (frameDelta > 0 || laneQuantaDelta > 0) break;
    }
    const after = getRootFollowWorkletShadowBridgeSnapshot(ctx) ?? lastSnapshot;
    const renderedFrameDelta = Math.max(
      0,
      after.stableLaneRenderedFrameCount - beforeFrames,
    );
    const laneQuantaDelta = Math.max(
      0,
      after.stableLaneActiveRenderQuantumCount - beforeQuanta,
    );
    const acked =
      after.stableLaneSyntheticSilentProbeAckCount >
        before.stableLaneSyntheticSilentProbeAckCount ||
      after.stableLaneLastAcceptedPlanSequence >= planSequence;
    const status: RootFollowStableLaneSyntheticSilentProbeResult["status"] =
      renderedFrameDelta > 0 || laneQuantaDelta > 0
        ? "posted"
        : transport.posted || transport.pending
          ? "posted"
          : "blocked";
    const blockerReason =
      renderedFrameDelta > 0 || laneQuantaDelta > 0
        ? null
        : acked
          ? "acked-without-frame-advance"
          : transport.pending
            ? "plan-pending-bounded-transport"
            : "no-frame-advance-in-probe-window";
    handle.snapshot = publishRootFollowWorkletShadowSnapshot({
      ...after,
      stableLaneSyntheticSilentProbeFrameDelta: renderedFrameDelta,
      stableLaneSyntheticSilentProbeLastResult:
        blockerReason ?? "frame-advance",
      stableLaneSyntheticSilentProbeLastAtMs: nowMs(),
    });
    return finish({
      status,
      blockerReason,
      posted: transport.posted || transport.pending,
      acked,
      renderedFrameDelta,
      laneQuantaDelta,
      planSequence,
      entryId,
      transferFrameCount: transfer.transferFrameCount,
    });
  } catch (error) {
    return finish({
      status: "failed",
      blockerReason: error instanceof Error ? error.message : String(error),
    });
  }
}

export function getRootFollowWorkletShadowBridgeSnapshot(
  ctx?: BaseAudioContext | null,
): RootFollowWorkletShadowBridgeSnapshot | null {
  if (ctx) return bridgeHandles.get(ctx)?.snapshot ?? null;
  return readRootFollowWorkletShadowSnapshotFromBrowser();
}
