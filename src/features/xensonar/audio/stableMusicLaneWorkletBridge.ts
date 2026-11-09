import {
  STABLE_MUSIC_LANE_SCHEMA_VERSION,
  STABLE_MUSIC_LANE_WORKLET_PROCESSOR_NAME,
  createInitialStableMusicLaneRuntimeSnapshot,
  type StableMusicLaneControlMessage,
  type StableMusicLaneProcessorMessage,
  type StableMusicLaneRuntimeSnapshot,
  type StableMusicLaneSnapshot,
} from './stableMusicLaneContracts';
import { createStableMusicLaneWorkletProcessorBlobUrl } from './stableMusicLaneWorkletProcessorSource';

export type StableMusicLaneRuntimeListener = (snapshot: StableMusicLaneRuntimeSnapshot) => void;

export type StableMusicLaneWorkletBridge = {
  getSnapshot: () => StableMusicLaneRuntimeSnapshot;
  subscribe: (listener: StableMusicLaneRuntimeListener) => () => void;
  start: () => Promise<StableMusicLaneRuntimeSnapshot>;
  stop: () => void;
  sendSnapshot: (snapshot: StableMusicLaneSnapshot) => void;
  requestHeartbeat: () => void;
  dispose: () => void;
};

let stableMusicLaneSessionCounter = 0;

const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const isSecureRuntimeContext = () =>
  typeof window === 'undefined' ||
  window.isSecureContext === true ||
  window.location?.hostname === 'localhost' ||
  window.location?.hostname === '127.0.0.1' ||
  window.location?.protocol === 'file:';

export function createStableMusicLaneWorkletBridge(
  ctx: AudioContext,
  _destination: AudioNode,
): StableMusicLaneWorkletBridge {
  const bridgeSessionId = ++stableMusicLaneSessionCounter;
  let runtimeSnapshot: StableMusicLaneRuntimeSnapshot = {
    ...createInitialStableMusicLaneRuntimeSnapshot(bridgeSessionId),
    audioWorkletSupported: !!ctx.audioWorklet,
    contextState: ctx.state,
  };
  let processorUrl: string | null = null;
  let node: AudioWorkletNode | null = null;
  let outputGain: GainNode | null = null;
  let speakerProofDirectGain: GainNode | null = null;
  let graphProbeAnalyser: AnalyserNode | null = null;
  let graphProbeTimer: number | null = null;
  let graphProbeBuffer: Float32Array<ArrayBuffer> | null = null;
  let graphProbeStartedAtMs: number | null = null;
  let ensureNodePromise: Promise<AudioWorkletNode> | null = null;
  let generation = 0;
  let latestMode: StableMusicLaneSnapshot['mode'] = 'speaker-probe';
  let disposed = false;
  const listeners = new Set<StableMusicLaneRuntimeListener>();

  const publish = (patch: Partial<StableMusicLaneRuntimeSnapshot>) => {
    runtimeSnapshot = {
      ...runtimeSnapshot,
      ...patch,
      contextState: ctx.state,
    };
    listeners.forEach((listener) => listener(runtimeSnapshot));
  };

  const post = (message: StableMusicLaneControlMessage) => {
    node?.port.postMessage(message);
  };

  const handleProcessorMessage = (event: MessageEvent<StableMusicLaneProcessorMessage>) => {
    const data = event.data;
    const lastMessageAtMs = nowMs();
    if (data.type === 'stable-music-lane-ready') {
      publish({
        status: 'loaded',
        readyCount: runtimeSnapshot.readyCount + 1,
        lastMessageAtMs,
        detail: data.processorName,
        errorMessage: null,
      });
      return;
    }
    if (data.type === 'stable-music-lane-ack') {
      publish({
        status: data.running ? 'running' : 'stopped',
        generation: data.generation,
        ackCount: runtimeSnapshot.ackCount + 1,
        lastAcceptedType: data.acceptedType,
        lastMessageAtMs,
        laneCount: data.laneCount,
        rootFollowAnchorHz: data.rootFollowAnchorHz,
        rootFollowTargetHz: data.rootFollowTargetHz,
        beatAudioRunning: data.beatAudioRunning,
        beatTriggerCount: data.beatTriggerCount,
        activeBeatVoiceCount: data.activeBeatVoiceCount,
        speakerProofPulseCount: data.speakerProofPulseCount,
        speakerProofPeakAbs: data.speakerProofPeakAbs,
        peakAbs: data.peakAbs,
        detail: `accepted:${data.acceptedType}`,
        errorMessage: null,
      });
      return;
    }
    if (data.type === 'stable-music-lane-reject') {
      publish({
        rejectCount: runtimeSnapshot.rejectCount + 1,
        lastRejectReason: data.reason,
        lastMessageAtMs,
        detail: `rejected:${data.reason}`,
      });
      return;
    }
    if (data.type === 'stable-music-lane-heartbeat') {
      publish({
        status: data.running ? 'running' : runtimeSnapshot.status,
        generation: data.generation,
        heartbeatCount: data.heartbeatCount,
        lastMessageAtMs,
        lastSnapshotGeneration: data.lastSnapshotGeneration,
        laneCount: data.laneCount,
        rootFollowAnchorHz: data.rootFollowAnchorHz,
        rootFollowTargetHz: data.rootFollowTargetHz,
        beatAudioRunning: data.beatAudioRunning,
        beatTriggerCount: data.beatTriggerCount,
        activeBeatVoiceCount: data.activeBeatVoiceCount,
        speakerProofPulseCount: data.speakerProofPulseCount,
        speakerProofPeakAbs: data.speakerProofPeakAbs,
        peakAbs: data.peakAbs,
        detail: 'heartbeat',
      });
    }
  };

  const stopGraphProbeMeasurement = () => {
    if (graphProbeTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(graphProbeTimer);
    }
    graphProbeTimer = null;
    graphProbeStartedAtMs = null;
  };

  const measureGraphProbe = () => {
    if (!graphProbeAnalyser) return;
    if (!graphProbeBuffer || graphProbeBuffer.length !== graphProbeAnalyser.fftSize) {
      graphProbeBuffer = new Float32Array(graphProbeAnalyser.fftSize);
    }
    graphProbeAnalyser.getFloatTimeDomainData(graphProbeBuffer);
    let sumSquares = 0;
    let peakAbs = 0;
    for (let i = 0; i < graphProbeBuffer.length; i += 1) {
      const centered = graphProbeBuffer[i];
      sumSquares += centered * centered;
      const abs = Math.abs(centered);
      if (abs > peakAbs) peakAbs = abs;
    }
    const rms = Math.sqrt(sumSquares / Math.max(1, graphProbeBuffer.length));
    const measuredAtMs = nowMs();
    const startedAtMs = graphProbeStartedAtMs ?? measuredAtMs;
    graphProbeStartedAtMs = startedAtMs;
    const elapsedMs = measuredAtMs - startedAtMs;
    const previousSampleCount = runtimeSnapshot.graphProbeSampleCount ?? 0;
    const passed = rms >= 0.025 || peakAbs >= 0.08;
    const timedOut = elapsedMs > 1800 && previousSampleCount >= 6;
    publish({
      graphProbeStatus: passed ? 'passed' : timedOut ? 'failed' : 'measuring',
      graphProbeRms: rms,
      graphProbePeakAbs: peakAbs,
      graphProbeSampleCount: previousSampleCount + 1,
      graphProbeStartedAtMs: startedAtMs,
      graphProbeLastMeasuredAtMs: measuredAtMs,
      graphProbeReason: passed
        ? 'audio-worklet-output-detected-after-proof-gain'
        : timedOut
          ? 'no-nonzero-worklet-output-detected-after-proof-gain'
          : 'measuring-audio-worklet-output-after-proof-gain',
    });
    if (passed) stopGraphProbeMeasurement();
  };

  const startGraphProbeMeasurement = () => {
    if (!graphProbeAnalyser) return;
    stopGraphProbeMeasurement();
    graphProbeStartedAtMs = nowMs();
    publish({
      graphProbeStatus: 'measuring',
      graphProbeRms: 0,
      graphProbePeakAbs: 0,
      graphProbeSampleCount: 0,
      graphProbeStartedAtMs: graphProbeStartedAtMs,
      graphProbeLastMeasuredAtMs: null,
      graphProbeReason: 'measuring-audio-worklet-output-after-proof-gain',
    });
    measureGraphProbe();
    if (typeof window !== 'undefined') {
      graphProbeTimer = window.setInterval(measureGraphProbe, 140);
    }
  };

  const ensureNode = async () => {
    if (node) return node;
    if (disposed) throw new Error('stable-music-lane-bridge-disposed');
    if (!ctx.audioWorklet) {
      publish({
        status: 'unsupported',
        audioWorkletSupported: false,
        errorMessage: 'AudioWorklet unavailable in this context',
        detail: 'unsupported',
      });
      throw new Error('AudioWorklet unavailable');
    }
    if (!isSecureRuntimeContext()) {
      publish({
        status: 'unsupported',
        errorMessage: 'AudioWorklet requires localhost, HTTPS or a secure app context',
        detail: 'secure-context-required',
      });
      throw new Error('AudioWorklet requires a secure context');
    }
    publish({ status: 'loading', detail: 'loading-module', errorMessage: null });
    const nextProcessorUrl = createStableMusicLaneWorkletProcessorBlobUrl();
    try {
      await ctx.audioWorklet.addModule(nextProcessorUrl);
      processorUrl = nextProcessorUrl;
      const createdNode = new AudioWorkletNode(ctx, STABLE_MUSIC_LANE_WORKLET_PROCESSOR_NAME, {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      });
      const proofDirectGain = ctx.createGain();
      proofDirectGain.gain.value = 0.55;
      const proofAnalyser = ctx.createAnalyser();
      proofAnalyser.fftSize = 2048;
      proofAnalyser.smoothingTimeConstant = 0;
      createdNode.port.onmessage = handleProcessorMessage;
      // 7.2.5 is an automated direct speaker-probe branch: no rhythm bus, no hidden legacy mix.
      // A valid branch must produce measurable non-zero Worklet output after this gain, before ctx.destination.
      createdNode.connect(proofDirectGain);
      // 7.2.6 direct speaker proof: analyser is a tap, not the audible route.
      // The audible route is WorkletNode -> Gain -> ctx.destination.
      proofDirectGain.connect(ctx.destination);
      proofDirectGain.connect(proofAnalyser);
      node = createdNode;
      outputGain = proofDirectGain;
      speakerProofDirectGain = proofDirectGain;
      graphProbeAnalyser = proofAnalyser;
      publish({ status: 'loaded', detail: 'node-created', errorMessage: null });
      return createdNode;
    } catch (error) {
      URL.revokeObjectURL(nextProcessorUrl);
      publish({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        detail: 'load-failed',
      });
      throw error;
    }
  };

  const start = async () => {
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch {}
    }
    if (!ensureNodePromise) ensureNodePromise = ensureNode();
    await ensureNodePromise;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch {}
    }
    generation += 1;
    post({
      type: 'stable-music-lane-start',
      schemaVersion: STABLE_MUSIC_LANE_SCHEMA_VERSION,
      generation,
      mode: latestMode,
    });
    if (latestMode === 'speaker-probe') startGraphProbeMeasurement();
    return runtimeSnapshot;
  };

  const stop = () => {
    generation += 1;
    stopGraphProbeMeasurement();
    publish({
      graphProbeStatus: 'idle',
      graphProbeReason: 'speaker-probe-stopped',
    });
    post({ type: 'stable-music-lane-stop', schemaVersion: STABLE_MUSIC_LANE_SCHEMA_VERSION, generation });
  };

  const sendSnapshot = (snapshot: StableMusicLaneSnapshot) => {
    latestMode = snapshot.mode;
    post({ type: 'stable-music-lane-snapshot', schemaVersion: STABLE_MUSIC_LANE_SCHEMA_VERSION, snapshot });
    if (snapshot.mode === 'speaker-probe' && node && runtimeSnapshot.status === 'running') startGraphProbeMeasurement();
  };

  const requestHeartbeat = () => {
    generation += 1;
    post({ type: 'stable-music-lane-request-heartbeat', schemaVersion: STABLE_MUSIC_LANE_SCHEMA_VERSION, generation });
  };

  const dispose = () => {
    disposed = true;
    stopGraphProbeMeasurement();
    try { node?.disconnect(); } catch {}
    try { outputGain?.disconnect(); } catch {}
    try { speakerProofDirectGain?.disconnect(); } catch {}
    try { graphProbeAnalyser?.disconnect(); } catch {}
    try { node?.port.close(); } catch {}
    if (processorUrl) {
      try { URL.revokeObjectURL(processorUrl); } catch {}
    }
    node = null;
    outputGain = null;
    speakerProofDirectGain = null;
    graphProbeAnalyser = null;
    graphProbeBuffer = null;
    processorUrl = null;
    ensureNodePromise = null;
    publish({ status: 'stopped', detail: 'disposed' });
  };

  return {
    getSnapshot: () => runtimeSnapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      listener(runtimeSnapshot);
      return () => listeners.delete(listener);
    },
    start,
    stop,
    sendSnapshot,
    requestHeartbeat,
    dispose,
  };
}
