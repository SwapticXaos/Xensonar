import { addAudioWorkletBlobModule, resolveAudioWorkletBlobSupport } from "./audioWorkletBlobModule";
import { attachWaveStarterWorkletPilotMessageReducer } from "./waveStarterWorkletPilotMessageReducer";
import type { WaveStarterSampleFailoverCandidate } from "./waveStarterSampleFailoverCandidate";
import type { WaveStarterSynthFailoverCandidate } from "./waveStarterSynthFailoverCandidate";
import type { WaveStarterSampleBufferTokenShadowPayload } from "./waveStarterSampleBufferTokenShadow";
import type { WaveStarterVoiceSpec } from "./waveStarterVoiceSpecFailoverContract";
import {
  recordWaveStarterFailoverCandidatePostedLedgerEntry,
} from "./waveStarterFailoverEventLedger";
import {
  WAVE_STARTER_WORKLET_PILOT_CODE,
  WAVE_STARTER_WORKLET_PILOT_PROCESSOR_NAME,
} from "./waveStarterWorkletPilotProcessorSource";
export {
  WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN,
  WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN_DB,
  WAVE_STARTER_WORKLET_PARALLEL_PILOT_REQUIRED_COMPLETED_SHAPES,
  WAVE_STARTER_WORKLET_PARALLEL_PILOT_RAMP_ATTACK_FRAMES,
  WAVE_STARTER_WORKLET_PARALLEL_PILOT_RAMP_RELEASE_FRAMES,
  WAVE_STARTER_WORKLET_SAMPLE_FAILOVER_MAX_VOICES,
  WAVE_STARTER_WORKLET_STEAL_FADE_MAX_TAILS,
  WAVE_STARTER_WORKLET_SYNTH_FAILOVER_MAX_VOICES,
} from "./waveStarterWorkletPilotProcessorSource";

import {
  createWaveStarterWorkletPilotSnapshot as baseSnapshot,
  publishWaveStarterWorkletPilotSnapshot as publishSnapshot,
  readWaveStarterWorkletPilotReportFromBrowser,
} from "./waveStarterWorkletPilotReport";
import type { WaveStarterWorkletPilotSnapshot } from "./waveStarterWorkletPilotReport";
export {
  WAVE_STARTER_WORKLET_PILOT_GLOBAL,
  formatWaveStarterWorkletPilotUiValue,
  readWaveStarterWorkletPilotReportFromBrowser,
} from "./waveStarterWorkletPilotReport";
export type {
  WaveStarterWorkletPilotDecision,
  WaveStarterWorkletPilotSnapshot,
  WaveStarterWorkletPilotStatus,
} from "./waveStarterWorkletPilotReport";

const PROCESSOR_NAME = WAVE_STARTER_WORKLET_PILOT_PROCESSOR_NAME;
export type WaveStarterWorkletPilotIntent = {
  baseFreq: number;
  isSector: boolean;
  requestedAtMs: number;
  pressureBias: number;
  activeScheduledToneCount: number;
  admissionKind: string | null;
  admissionReason: string | null;
  source: "request" | "deferred-flush";
};

type WaveStarterWorkletPilotHandle = {
  ctx: BaseAudioContext;
  node: AudioWorkletNode | null;
  outputGain: GainNode | null;
  keepAliveSource: ConstantSourceNode | null;
  keepAliveGain: GainNode | null;
  snapshot: WaveStarterWorkletPilotSnapshot;
};

let handlePromise: Promise<WaveStarterWorkletPilotHandle> | null = null;
let handle: WaveStarterWorkletPilotHandle | null = null;
let nextSequence = 0;

function nowMs() {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  )
    return performance.now();
  return Date.now();
}

function makeUnsupported(
  detail: string,
  requestedAtMs: number,
): WaveStarterWorkletPilotHandle {
  const snapshot = publishSnapshot(
    baseSnapshot({
      status: "unsupported",
      requestedAtMs,
      completedAtMs: nowMs(),
      detail,
      fileOriginLikelyBlocked: detail.includes("file-origin"),
    }),
  );
  return {
    ctx: null as unknown as BaseAudioContext,
    node: null,
    outputGain: null,
    keepAliveSource: null,
    keepAliveGain: null,
    snapshot,
  };
}

async function createWaveStarterWorkletPilot(
  ctx: BaseAudioContext,
): Promise<WaveStarterWorkletPilotHandle> {
  const requestedAtMs = nowMs();
  publishSnapshot(
    baseSnapshot({
      status: "loading",
      requestedAtMs,
      detail: "wave-starter-shadow-pilot-requested",
    }),
  );

  // Do not pre-block local single-file HTML. Some browsers can load Blob-backed
  // AudioWorklet modules from file://; if the browser rejects it, the catch block
  // records the real failure reason. Pre-blocking here made the Worklet path
  // completely inert in local HTML tests.
  const supportStatus = resolveAudioWorkletBlobSupport(ctx);
  if (supportStatus !== "supported") return makeUnsupported(supportStatus, requestedAtMs);

  try {
    await addAudioWorkletBlobModule(ctx, WAVE_STARTER_WORKLET_PILOT_CODE);
    const node = new AudioWorkletNode(ctx, PROCESSOR_NAME, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
    const outputGain = ctx.createGain();
    // The processor itself emits only an ultra-low pilot sample after shape-proof.
    // The gain node stays unity so diagnostics can prove the processor path without
    // hiding output behind another silent node; Legacy remains the audible reference.
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

    const nextHandle: WaveStarterWorkletPilotHandle = {
      ctx,
      node,
      outputGain,
      keepAliveSource,
      keepAliveGain,
      snapshot: publishSnapshot(
        baseSnapshot({
          status: "loaded",
          requestedAtMs,
          completedAtMs: nowMs(),
          keepAliveConnected: true,
          outputConnected: true,
          detail:
            "wave-starter-shadow-pilot-loaded-parallel-mix-gated-after-shape-proof",
        }),
      ),
    };

    attachWaveStarterWorkletPilotMessageReducer(node, nextHandle);

    node.onprocessorerror = () => {
      nextHandle.snapshot = publishSnapshot(
        baseSnapshot({
          ...nextHandle.snapshot,
          status: "failed",
          processorErrorCount: nextHandle.snapshot.processorErrorCount + 1,
          detail: "wave-starter-worklet-processor-error-silent-fallback",
          errorMessage:
            "AudioWorklet processorerror fired; Wellenstarter remains on the legacy/main-thread audible path.",
        }),
      );
    };

    node.port.postMessage({ type: "wave-starter-shadow-ping" });
    return nextHandle;
  } catch (error) {
    return {
      ctx,
      node: null,
      outputGain: null,
      keepAliveSource: null,
      keepAliveGain: null,
      snapshot: publishSnapshot(
        baseSnapshot({
          status: "failed",
          requestedAtMs,
          completedAtMs: nowMs(),
          detail: "wave-starter-shadow-pilot-load-failed",
          errorMessage: error instanceof Error ? error.message : String(error),
        }),
      ),
    };
  }
}

export function getWaveStarterWorkletPilotSnapshot(): WaveStarterWorkletPilotSnapshot {
  if (handle) return publishSnapshot(baseSnapshot(handle.snapshot));
  return (
    readWaveStarterWorkletPilotReportFromBrowser() ??
    publishSnapshot(baseSnapshot())
  );
}

export async function primeWaveStarterWorkletPilot(
  ctx: BaseAudioContext | null | undefined,
): Promise<WaveStarterWorkletPilotSnapshot> {
  if (!ctx)
    return publishSnapshot(
      baseSnapshot({ status: "unsupported", detail: "missing-audio-context" }),
    );
  if (handle?.ctx === ctx)
    return publishSnapshot(baseSnapshot(handle.snapshot));
  if (!handlePromise) {
    handlePromise = createWaveStarterWorkletPilot(ctx).then((created) => {
      handle = created;
      return created;
    });
  }
  const created = await handlePromise;
  return publishSnapshot(baseSnapshot(created.snapshot));
}

export function postWaveStarterWorkletVoiceSpecShadow(
  ctx: BaseAudioContext | null | undefined,
  spec: WaveStarterVoiceSpec,
): WaveStarterWorkletPilotSnapshot {
  if (!ctx)
    return publishSnapshot(
      baseSnapshot({ status: "unsupported", detail: "missing-audio-context" }),
    );
  void primeWaveStarterWorkletPilot(ctx).then((snapshot) => {
    if (!handle?.node || snapshot.status !== "loaded") return;
    const sequence = (nextSequence += 1);
    handle.snapshot = publishSnapshot(
      baseSnapshot({
        ...handle.snapshot,
        lastPostedSequence: sequence,
        detail: "wave-starter-voice-spec-shadow-posted",
      }),
    );
    handle.node.port.postMessage({
      type: "wave-starter-voice-spec-shadow",
      sequence,
      voiceSpecId: spec.voiceId,
      voiceSpecKind: spec.kind,
      exactnessLevel: spec.exactnessLevel,
      sourceIntent: spec.sourceIntent,
      gain: spec.gain,
      playbackFreqHz: spec.playbackFreqHz,
    });
  });
  return getWaveStarterWorkletPilotSnapshot();
}


export function postWaveStarterWorkletSampleBufferTokenShadow(
  ctx: BaseAudioContext | null | undefined,
  payload: WaveStarterSampleBufferTokenShadowPayload,
): WaveStarterWorkletPilotSnapshot {
  if (!ctx)
    return publishSnapshot(
      baseSnapshot({ status: "unsupported", detail: "missing-audio-context" }),
    );
  void primeWaveStarterWorkletPilot(ctx).then((snapshot) => {
    if (!handle?.node || snapshot.status !== "loaded") return;
    const sequence = (nextSequence += 1);
    handle.snapshot = publishSnapshot(
      baseSnapshot({
        ...handle.snapshot,
        sampleBufferTokenShadowPostedCount:
          handle.snapshot.sampleBufferTokenShadowPostedCount + 1,
        sampleBufferLastToken: payload.descriptor.bufferToken,
        sampleBufferLastFrameCount: payload.descriptor.copiedFrameCount,
        sampleBufferLastChannelCount: payload.descriptor.copiedChannelCount,
        lastPostedSequence: sequence,
        detail: "wave-starter-sample-buffer-token-shadow-posted",
      }),
    );
    handle.node.port.postMessage(
      {
        type: "wave-starter-sample-buffer-token-shadow",
        sequence,
        descriptor: payload.descriptor,
        channelData: payload.channelData,
      },
      payload.transfer,
    );
  });
  return getWaveStarterWorkletPilotSnapshot();
}

export function postWaveStarterWorkletSampleFailoverCandidate(
  ctx: BaseAudioContext | null | undefined,
  candidate: WaveStarterSampleFailoverCandidate,
): WaveStarterWorkletPilotSnapshot {
  if (!ctx)
    return publishSnapshot(
      baseSnapshot({ status: "unsupported", detail: "missing-audio-context" }),
    );
  void primeWaveStarterWorkletPilot(ctx).then((snapshot) => {
    if (!handle?.node || snapshot.status !== "loaded") return;
    const sequence = (nextSequence += 1);
    recordWaveStarterFailoverCandidatePostedLedgerEntry({
      failoverKind: "sample",
      sequence,
      voiceSpecId: candidate.voiceSpecId,
      bufferToken: candidate.bufferToken,
    });
    handle.snapshot = publishSnapshot(
      baseSnapshot({
        ...handle.snapshot,
        sampleFailoverCandidatePostedCount:
          handle.snapshot.sampleFailoverCandidatePostedCount + 1,
        lastPostedSequence: sequence,
        sampleFailoverLastSpecId: candidate.voiceSpecId,
        sampleFailoverLastToken: candidate.bufferToken,
        detail: "wave-starter-sample-failover-candidate-posted",
      }),
    );
    handle.node.port.postMessage({
      type: "wave-starter-sample-failover-candidate",
      sequence,
      candidate,
    });
  });
  return getWaveStarterWorkletPilotSnapshot();
}

export function postWaveStarterWorkletSynthFailoverCandidate(
  ctx: BaseAudioContext | null | undefined,
  candidate: WaveStarterSynthFailoverCandidate,
): WaveStarterWorkletPilotSnapshot {
  if (!ctx)
    return publishSnapshot(
      baseSnapshot({ status: "unsupported", detail: "missing-audio-context" }),
    );
  void primeWaveStarterWorkletPilot(ctx).then((snapshot) => {
    if (!handle?.node || snapshot.status !== "loaded") return;
    const sequence = (nextSequence += 1);
    recordWaveStarterFailoverCandidatePostedLedgerEntry({
      failoverKind: "synth",
      sequence,
      voiceSpecId: candidate.voiceSpecId,
    });
    handle.snapshot = publishSnapshot(
      baseSnapshot({
        ...handle.snapshot,
        synthFailoverCandidatePostedCount:
          handle.snapshot.synthFailoverCandidatePostedCount + 1,
        lastPostedSequence: sequence,
        synthFailoverLastSpecId: candidate.voiceSpecId,
        synthFailoverCandidateGainScale: candidate.candidateGainScale,
        detail: "wave-starter-synth-failover-candidate-posted",
      }),
    );
    handle.node.port.postMessage({
      type: "wave-starter-synth-failover-candidate",
      sequence,
      candidate,
    });
  });
  return getWaveStarterWorkletPilotSnapshot();
}


export type WaveStarterWorkletProcessorRuntimeOwnershipPayload = {
  sourceIntent: "hold-gesture-loop" | "keyboard-glissando" | "direct-wave-starter" | null;
  lane: "wellenstart" | "klaviatur" | "direct" | null;
  extendPolicy: string | null;
  segmentClockOwnedByProcessor: boolean;
  forceSustainExtend: boolean;
  activeSteps?: number[];
  presetId?: string;
};

function postWaveStarterWorkletProcessorRuntimeVoice(args: {
  ctx: BaseAudioContext | null | undefined;
  messageType:
    | "wave-starter-synth-processor-runtime-voice"
    | "wave-starter-sample-processor-runtime-voice";
  candidate: WaveStarterSynthFailoverCandidate | WaveStarterSampleFailoverCandidate;
  ownership: WaveStarterWorkletProcessorRuntimeOwnershipPayload;
}): WaveStarterWorkletPilotSnapshot {
  if (!args.ctx)
    return publishSnapshot(
      baseSnapshot({ status: "unsupported", detail: "missing-audio-context" }),
    );
  void primeWaveStarterWorkletPilot(args.ctx).then((snapshot) => {
    if (!handle?.node || snapshot.status !== "loaded") return;
    const sequence = (nextSequence += 1);
    const isSample = args.messageType === "wave-starter-sample-processor-runtime-voice";
    if (isSample) {
      recordWaveStarterFailoverCandidatePostedLedgerEntry({
        failoverKind: "sample",
        sequence,
        voiceSpecId: args.candidate.voiceSpecId,
        bufferToken: "bufferToken" in args.candidate ? args.candidate.bufferToken : null,
      });
    } else {
      recordWaveStarterFailoverCandidatePostedLedgerEntry({
        failoverKind: "synth",
        sequence,
        voiceSpecId: args.candidate.voiceSpecId,
      });
    }
    handle.snapshot = publishSnapshot(
      baseSnapshot({
        ...handle.snapshot,
        processorRuntimeSynthVoicePostedCount:
          handle.snapshot.processorRuntimeSynthVoicePostedCount + (isSample ? 0 : 1),
        processorRuntimeSampleVoicePostedCount:
          handle.snapshot.processorRuntimeSampleVoicePostedCount + (isSample ? 1 : 0),
        lastPostedSequence: sequence,
        processorRuntimeLastSourceIntent: args.ownership.sourceIntent,
        processorRuntimeLastLane: args.ownership.lane,
        processorRuntimeLastExtendPolicy: args.ownership.extendPolicy,
        processorRuntimeLastVoiceSpecId: args.candidate.voiceSpecId,
        sampleFailoverLastToken:
          isSample && "bufferToken" in args.candidate
            ? args.candidate.bufferToken
            : handle.snapshot.sampleFailoverLastToken,
        synthFailoverLastSpecId: isSample
          ? handle.snapshot.synthFailoverLastSpecId
          : args.candidate.voiceSpecId,
        sampleFailoverLastSpecId: isSample
          ? args.candidate.voiceSpecId
          : handle.snapshot.sampleFailoverLastSpecId,
        detail: isSample
          ? "wave-starter-processor-runtime-sample-voice-posted"
          : "wave-starter-processor-runtime-synth-voice-posted",
      }),
    );
    handle.node.port.postMessage({
      type: args.messageType,
      sequence,
      candidate: args.candidate,
      runtimeOwnership: args.ownership,
    });
  });
  return getWaveStarterWorkletPilotSnapshot();
}

export function postWaveStarterWorkletSynthProcessorRuntimeVoice(
  ctx: BaseAudioContext | null | undefined,
  candidate: WaveStarterSynthFailoverCandidate,
  ownership: WaveStarterWorkletProcessorRuntimeOwnershipPayload,
): WaveStarterWorkletPilotSnapshot {
  return postWaveStarterWorkletProcessorRuntimeVoice({
    ctx,
    messageType: "wave-starter-synth-processor-runtime-voice",
    candidate,
    ownership,
  });
}

export function postWaveStarterWorkletSampleProcessorRuntimeVoice(
  ctx: BaseAudioContext | null | undefined,
  candidate: WaveStarterSampleFailoverCandidate,
  ownership: WaveStarterWorkletProcessorRuntimeOwnershipPayload,
): WaveStarterWorkletPilotSnapshot {
  return postWaveStarterWorkletProcessorRuntimeVoice({
    ctx,
    messageType: "wave-starter-sample-processor-runtime-voice",
    candidate,
    ownership,
  });
}

export type WaveStarterProcessorOwnedHoldGesturePayload = {
  gestureId: string;
  lane: "wellenstart" | "klaviatur";
  sourceIntent: "enter-hold" | "keyboard-hold";
  segmentsPerBar: number;
  intervalMs: number;
  pitchHz: number;
  gain: number;
  extendPolicy: string | null;
  forceSustainExtend: boolean;
  activeSteps?: number[];
  presetId?: string;
};

function postWaveStarterWorkletProcessorOwnedHoldGesture(args: {
  ctx: BaseAudioContext | null | undefined;
  messageType:
    | "wave-starter-processor-hold-gesture-start"
    | "wave-starter-processor-hold-gesture-update"
    | "wave-starter-processor-hold-gesture-release";
  gesture: WaveStarterProcessorOwnedHoldGesturePayload;
}): WaveStarterWorkletPilotSnapshot {
  if (!args.ctx)
    return publishSnapshot(
      baseSnapshot({ status: "unsupported", detail: "missing-audio-context" }),
    );
  void primeWaveStarterWorkletPilot(args.ctx).then((snapshot) => {
    if (!handle?.node || snapshot.status !== "loaded") return;
    const sequence = (nextSequence += 1);
    const isStart = args.messageType === "wave-starter-processor-hold-gesture-start";
    const isUpdate = args.messageType === "wave-starter-processor-hold-gesture-update";
    const isRelease = args.messageType === "wave-starter-processor-hold-gesture-release";
    handle.snapshot = publishSnapshot(
      baseSnapshot({
        ...handle.snapshot,
        lastPostedSequence: sequence,
        processorOwnedHoldGestureStartPostedCount:
          handle.snapshot.processorOwnedHoldGestureStartPostedCount + (isStart ? 1 : 0),
        processorOwnedHoldGestureUpdatePostedCount:
          handle.snapshot.processorOwnedHoldGestureUpdatePostedCount + (isUpdate ? 1 : 0),
        processorOwnedHoldGestureReleasePostedCount:
          handle.snapshot.processorOwnedHoldGestureReleasePostedCount + (isRelease ? 1 : 0),
        processorOwnedHoldLastGestureId: args.gesture.gestureId,
        processorOwnedHoldLastLane: args.gesture.lane,
        processorOwnedHoldLastSegmentsPerBar: args.gesture.segmentsPerBar,
        processorOwnedHoldLastPitchHz: args.gesture.pitchHz,
        detail: isRelease
          ? "wave-starter-processor-owned-hold-gesture-release-posted"
          : isUpdate
            ? "wave-starter-processor-owned-hold-gesture-update-posted"
            : "wave-starter-processor-owned-hold-gesture-start-posted",
      }),
    );
    handle.node.port.postMessage({
      type: args.messageType,
      sequence,
      gesture: args.gesture,
    });
  });
  return getWaveStarterWorkletPilotSnapshot();
}

export function postWaveStarterWorkletProcessorOwnedHoldGestureStart(
  ctx: BaseAudioContext | null | undefined,
  gesture: WaveStarterProcessorOwnedHoldGesturePayload,
): WaveStarterWorkletPilotSnapshot {
  return postWaveStarterWorkletProcessorOwnedHoldGesture({
    ctx,
    messageType: "wave-starter-processor-hold-gesture-start",
    gesture,
  });
}

export function postWaveStarterWorkletProcessorOwnedHoldGestureUpdate(
  ctx: BaseAudioContext | null | undefined,
  gesture: WaveStarterProcessorOwnedHoldGesturePayload,
): WaveStarterWorkletPilotSnapshot {
  return postWaveStarterWorkletProcessorOwnedHoldGesture({
    ctx,
    messageType: "wave-starter-processor-hold-gesture-update",
    gesture,
  });
}

export function postWaveStarterWorkletProcessorOwnedHoldGestureRelease(
  ctx: BaseAudioContext | null | undefined,
  gesture: WaveStarterProcessorOwnedHoldGesturePayload,
): WaveStarterWorkletPilotSnapshot {
  return postWaveStarterWorkletProcessorOwnedHoldGesture({
    ctx,
    messageType: "wave-starter-processor-hold-gesture-release",
    gesture,
  });
}

export function postWaveStarterWorkletShadowIntent(
  ctx: BaseAudioContext | null | undefined,
  intent: WaveStarterWorkletPilotIntent,
): WaveStarterWorkletPilotSnapshot {
  if (!ctx)
    return publishSnapshot(
      baseSnapshot({ status: "unsupported", detail: "missing-audio-context" }),
    );
  void primeWaveStarterWorkletPilot(ctx).then((snapshot) => {
    if (!handle?.node || snapshot.status !== "loaded") return;
    const sequence = (nextSequence += 1);
    const postedAtMs = nowMs();
    handle.snapshot = publishSnapshot(
      baseSnapshot({
        ...handle.snapshot,
        lastIntentPostedAtMs: postedAtMs,
        postedIntentCount: handle.snapshot.postedIntentCount + 1,
        pendingIntentCount: 1,
        lastPostedSequence: sequence,
        detail: "wave-starter-shadow-intent-posted",
      }),
    );
    handle.node.port.postMessage({
      type: "wave-starter-shadow-intent",
      sequence,
      frequencyHz: intent.baseFreq,
      isSector: intent.isSector,
      requestedAtMs: intent.requestedAtMs,
      pressureBias: intent.pressureBias,
      activeScheduledToneCount: intent.activeScheduledToneCount,
      admissionKind: intent.admissionKind,
      admissionReason: intent.admissionReason,
      source: intent.source,
    });
  });
  return getWaveStarterWorkletPilotSnapshot();
}

