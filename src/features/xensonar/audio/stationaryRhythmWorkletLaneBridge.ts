import {
  createInitialStationaryRhythmWorkletSnapshot,
  STATIONARY_RHYTHM_WORKLET_PROCESSOR_NAME,
  STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION,
  type StationaryRhythmControlMessage,
  type StationaryRhythmPatternSnapshot,
  type StationaryRhythmStartMessage,
  type StationaryRhythmUpdateMessage,
  type StationaryRhythmProcessorMessage,
  type StationaryRhythmWorkletProbeOptions,
  type StationaryRhythmWorkletSnapshot,
} from "./stationaryRhythmWorkletLaneContracts";
import { createStationaryRhythmWorkletProcessorBlobUrl } from "./stationaryRhythmWorkletProcessorSource";

export type StationaryRhythmWorkletSnapshotListener = (
  snapshot: StationaryRhythmWorkletSnapshot,
) => void;

export type StationaryRhythmWorkletLastControlState = {
  start: StationaryRhythmStartMessage | null;
  update: StationaryRhythmUpdateMessage | null;
  patternSnapshot: StationaryRhythmPatternSnapshot | null;
};

export type StationaryRhythmWorkletLaneBridge = {
  getSnapshot: () => StationaryRhythmWorkletSnapshot;
  getLastControlState: () => StationaryRhythmWorkletLastControlState;
  subscribe: (listener: StationaryRhythmWorkletSnapshotListener) => () => void;
  startProbe: (
    options: StationaryRhythmWorkletProbeOptions,
  ) => Promise<StationaryRhythmWorkletSnapshot>;
  updateProbe: (options: Partial<StationaryRhythmWorkletProbeOptions>) => void;
  stopProbe: () => void;
  sendPatternSnapshot: (snapshot: StationaryRhythmPatternSnapshot) => void;
  requestSnapshot: () => void;
  dispose: () => void;
};

let bridgeSessionCounter = 0;

const nowMs = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const isLikelyFileOrigin = () =>
  typeof window !== "undefined" && window.location?.protocol === "file:";

const isSecureRuntimeContext = () =>
  typeof window === "undefined" ||
  window.isSecureContext === true ||
  window.location?.hostname === "localhost";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const normalizeProbeOptions = (
  options: StationaryRhythmWorkletProbeOptions,
): Required<StationaryRhythmWorkletProbeOptions> => ({
  bpm: clamp(Number.isFinite(options.bpm) ? options.bpm : 108, 12, 360),
  beatsPerBar: Math.round(clamp(options.beatsPerBar ?? 4, 1, 16)),
  stepsPerBar: Math.round(clamp(options.stepsPerBar ?? 16, 1, 128)),
  probeGain: clamp(options.probeGain ?? 0.035, 0, 0.16),
  audibleProbe: options.audibleProbe !== false,
});

export const createStationaryRhythmWorkletLaneBridge = (
  ctx: AudioContext,
  destination: AudioNode,
): StationaryRhythmWorkletLaneBridge => {
  const bridgeSessionId = ++bridgeSessionCounter;
  let snapshot = {
    ...createInitialStationaryRhythmWorkletSnapshot(bridgeSessionId),
    contextState: ctx.state,
    audioWorkletSupported: !!ctx.audioWorklet,
    secureContext: isSecureRuntimeContext(),
    fileOriginLikelyBlocked: isLikelyFileOrigin(),
  };
  let processorUrl: string | null = null;
  let node: AudioWorkletNode | null = null;
  let outputGain: GainNode | null = null;
  let ensureNodePromise: Promise<AudioWorkletNode> | null = null;
  let lastStartMessage: StationaryRhythmStartMessage | null = null;
  let lastUpdateMessage: StationaryRhythmUpdateMessage | null = null;
  let lastPatternSnapshot: StationaryRhythmPatternSnapshot | null = null;
  let generation = 0;
  let disposed = false;
  const listeners = new Set<StationaryRhythmWorkletSnapshotListener>();

  const publish = (patch: Partial<StationaryRhythmWorkletSnapshot>) => {
    snapshot = {
      ...snapshot,
      ...patch,
      contextState: ctx.state,
    };
    listeners.forEach((listener) => listener(snapshot));
  };

  const post = (message: StationaryRhythmControlMessage) => {
    if (!node) return;
    node.port.postMessage(message);
  };

  const handleProcessorMessage = (
    event: MessageEvent<StationaryRhythmProcessorMessage>,
  ) => {
    const data = event.data;
    const lastMessageAtMs = nowMs();
    if (data.type === "stationary-rhythm-ready") {
      publish({
        status: snapshot.probeRunning ? "running" : "loaded",
        completedAtMs: lastMessageAtMs,
        lastMessageAtMs,
        processorGeneration: data.processorGeneration,
        readyMessageCount: snapshot.readyMessageCount + 1,
        workletCurrentFrame: data.workletFrame,
        detail: "processor-ready",
        errorMessage: null,
      });
      return;
    }
    if (data.type === "stationary-rhythm-ack") {
      publish({
        status: data.running ? "running" : "stopped",
        lastMessageAtMs,
        generation: data.generation,
        ackCount: snapshot.ackCount + 1,
        lastAcceptedType: data.acceptedType,
        patternVersion: data.patternVersion ?? snapshot.patternVersion,
        pendingPatternVersion:
          data.pendingPatternVersion ?? snapshot.pendingPatternVersion,
        workletCurrentFrame: data.workletFrame,
        probeRunning: data.running,
        detail: `accepted:${data.acceptedType}`,
        errorMessage: null,
      });
      return;
    }
    if (data.type === "stationary-rhythm-reject") {
      publish({
        lastMessageAtMs,
        rejectCount: snapshot.rejectCount + 1,
        lastRejectedType: data.rejectedType,
        lastRejectReason: data.reason,
        workletCurrentFrame: data.workletFrame,
        detail: `rejected:${data.reason}`,
      });
      return;
    }
    if (data.type === "stationary-rhythm-heartbeat") {
      publish({
        status: data.running ? "running" : snapshot.status,
        lastMessageAtMs,
        heartbeatCount: snapshot.heartbeatCount + 1,
        generation: data.generation,
        processorGeneration: data.processorGeneration,
        probeRunning: data.running,
        audibleProbe: data.audibleProbe,
        audibleMinimalVoices: data.audibleMinimalVoices,
        bpm: data.bpm,
        beatsPerBar: data.beatsPerBar,
        stepsPerBar: data.stepsPerBar,
        currentBar: data.currentBar,
        stepIndex: data.stepIndex,
        nextStepFrame: data.nextStepFrame,
        workletCurrentFrame: data.currentFrame,
        renderQuantumSize: data.renderQuantumSize,
        processQuantumCount: data.processQuantumCount,
        renderedFrameCount: data.renderedFrameCount,
        frameContinuityGapCount: data.frameContinuityGapCount,
        lateStepCount: data.lateStepCount,
        missedStepWindowCount: data.missedStepWindowCount,
        maxStepLatenessFrames: data.maxStepLatenessFrames,
        heartbeatJitterFrames: data.heartbeatJitterFrames,
        activeProbeVoiceCount: data.activeProbeVoiceCount,
        activePatternVoiceCount: data.activePatternVoiceCount,
        patternVersion: data.patternVersion,
        pendingPatternVersion: data.pendingPatternVersion,
        patternHitCount: data.patternHitCount,
        patternAppliedCount: data.patternAppliedCount,
        patternDeferredCount: data.patternDeferredCount,
        duplicateStepGuardCount: data.duplicateStepGuardCount,
        processorState: data.processorState,
        peakAbs: data.peakAbs,
        detail: data.running ? "heartbeat" : "heartbeat-idle",
      });
    }
  };

  const actuallyEnsureNode = async () => {
    if (node) return node;
    if (disposed) throw new Error("stationary-rhythm-bridge-disposed");
    if (!ctx.audioWorklet) {
      publish({
        status: "unsupported",
        audioWorkletSupported: false,
        errorMessage: "AudioWorklet unavailable in this context",
        detail: "unsupported",
      });
      throw new Error("AudioWorklet unavailable");
    }
    if (!isSecureRuntimeContext()) {
      publish({
        status: "unsupported",
        secureContext: false,
        fileOriginLikelyBlocked: isLikelyFileOrigin(),
        errorMessage:
          "AudioWorklet requires a secure context; use localhost or HTTPS",
        detail: "secure-context-required",
      });
      throw new Error("AudioWorklet requires a secure context");
    }
    publish({
      status: "loading",
      requestedAtMs: nowMs(),
      detail: "loading-module",
    });
    const nextProcessorUrl = createStationaryRhythmWorkletProcessorBlobUrl();
    try {
      await ctx.audioWorklet.addModule(nextProcessorUrl);
    } catch (error) {
      URL.revokeObjectURL(nextProcessorUrl);
      publish({
        status: "failed",
        lastErrorAtMs: nowMs(),
        errorMessage: error instanceof Error ? error.message : String(error),
        detail: "module-load-failed",
      });
      throw error;
    }
    processorUrl = nextProcessorUrl;
    outputGain = ctx.createGain();
    outputGain.gain.value = 1;
    node = new AudioWorkletNode(ctx, STATIONARY_RHYTHM_WORKLET_PROCESSOR_NAME, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
    node.port.onmessage = handleProcessorMessage;
    node.onprocessorerror = () => {
      publish({
        status: "failed",
        lastErrorAtMs: nowMs(),
        processorErrorCount: snapshot.processorErrorCount + 1,
        processorState: "processor-error",
        errorMessage:
          "Stationary Rhythm Worklet processorerror; 9.191 must recreate this node for primary mode.",
        detail: "processor-error-fallback-required",
      });
    };
    node.connect(outputGain);
    outputGain.connect(destination);
    publish({
      status: "loaded",
      audioWorkletSupported: true,
      secureContext: isSecureRuntimeContext(),
      nodeCreated: true,
      nodeConnected: true,
      detail: "node-connected",
    });
    return node;
  };

  const ensureNode = async () => {
    if (node) return node;
    if (ensureNodePromise) return ensureNodePromise;
    ensureNodePromise = actuallyEnsureNode().finally(() => {
      ensureNodePromise = null;
    });
    return ensureNodePromise;
  };

  const bridge: StationaryRhythmWorkletLaneBridge = {
    getSnapshot: () => snapshot,
    getLastControlState: () => ({
      start: lastStartMessage ? { ...lastStartMessage } : null,
      update: lastUpdateMessage ? { ...lastUpdateMessage } : null,
      patternSnapshot: lastPatternSnapshot
        ? { ...lastPatternSnapshot, hits: [...lastPatternSnapshot.hits] }
        : null,
    }),
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => {
        listeners.delete(listener);
      };
    },
    startProbe: async (options) => {
      const normalized = normalizeProbeOptions(options);
      await ensureNode();
      if (ctx.state !== "running") await ctx.resume();
      generation += 1;
      const message: StationaryRhythmControlMessage = {
        type: "stationary-rhythm-start",
        schemaVersion: STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION,
        generation,
        bpm: normalized.bpm,
        beatsPerBar: normalized.beatsPerBar,
        stepsPerBar: normalized.stepsPerBar,
        audibleProbe: normalized.audibleProbe,
        probeGain: normalized.probeGain,
        requestedAtMs: nowMs(),
      };
      node?.parameters
        .get("probeGain")
        ?.setValueAtTime(normalized.probeGain, ctx.currentTime);
      publish({
        status: "running",
        generation,
        probeRunning: true,
        audibleProbe: normalized.audibleProbe,
        probeGain: normalized.probeGain,
        bpm: normalized.bpm,
        beatsPerBar: normalized.beatsPerBar,
        stepsPerBar: normalized.stepsPerBar,
        detail: "start-probe-posted",
        errorMessage: null,
      });
      lastStartMessage = { ...message };
      post(message);
      return snapshot;
    },
    sendPatternSnapshot: (patternSnapshot) => {
      publish({
        pendingPatternVersion: patternSnapshot.patternVersion,
        patternHitCount: patternSnapshot.hits.length,
        audibleMinimalVoices: patternSnapshot.audibleMinimalVoices !== false,
        bpm: patternSnapshot.bpm,
        beatsPerBar: patternSnapshot.beatsPerBar,
        stepsPerBar: patternSnapshot.stepsPerBar,
        detail: `pattern-snapshot-posted:v${patternSnapshot.patternVersion}`,
      });
      lastPatternSnapshot = {
        ...patternSnapshot,
        hits: [...patternSnapshot.hits],
      };
      post(patternSnapshot);
    },
    updateProbe: (options) => {
      const normalized = normalizeProbeOptions({
        bpm: options.bpm ?? snapshot.bpm,
        beatsPerBar: options.beatsPerBar ?? snapshot.beatsPerBar,
        stepsPerBar: options.stepsPerBar ?? snapshot.stepsPerBar,
        probeGain: options.probeGain ?? snapshot.probeGain,
        audibleProbe: options.audibleProbe ?? snapshot.audibleProbe,
      });
      if (node?.parameters.get("probeGain")) {
        node.parameters
          .get("probeGain")
          ?.setTargetAtTime(normalized.probeGain, ctx.currentTime, 0.01);
      }
      const message: StationaryRhythmControlMessage = {
        type: "stationary-rhythm-update",
        schemaVersion: STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION,
        generation,
        bpm: normalized.bpm,
        beatsPerBar: normalized.beatsPerBar,
        stepsPerBar: normalized.stepsPerBar,
        audibleProbe: normalized.audibleProbe,
        probeGain: normalized.probeGain,
        requestedAtMs: nowMs(),
      };
      publish({
        bpm: normalized.bpm,
        beatsPerBar: normalized.beatsPerBar,
        stepsPerBar: normalized.stepsPerBar,
        probeGain: normalized.probeGain,
        audibleProbe: normalized.audibleProbe,
      });
      lastUpdateMessage = { ...message };
      post(message);
    },
    stopProbe: () => {
      generation += 1;
      const message: StationaryRhythmControlMessage = {
        type: "stationary-rhythm-stop",
        schemaVersion: STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION,
        generation,
        requestedAtMs: nowMs(),
        stopMode: "immediate",
      };
      publish({
        status: "stopped",
        generation,
        probeRunning: false,
        audibleProbe: false,
        detail: "stop-probe-posted",
      });
      post(message);
    },
    requestSnapshot: () => {
      const message: StationaryRhythmControlMessage = {
        type: "stationary-rhythm-request-snapshot",
        schemaVersion: STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION,
        generation,
        requestedAtMs: nowMs(),
      };
      post(message);
    },
    dispose: () => {
      disposed = true;
      if (node) {
        try {
          bridge.stopProbe();
        } catch {
          // best-effort disposal only
        }
        node.port.onmessage = null;
        node.disconnect();
      }
      if (outputGain) outputGain.disconnect();
      if (processorUrl) URL.revokeObjectURL(processorUrl);
      ensureNodePromise = null;
      node = null;
      outputGain = null;
      processorUrl = null;
      publish({
        status: "stopped",
        nodeConnected: false,
        nodeCreated: false,
        probeRunning: false,
        audibleProbe: false,
        detail: "disposed",
      });
      listeners.clear();
    },
  };

  return bridge;
};
