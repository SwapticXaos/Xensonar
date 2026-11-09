import { snapshotAudioPressureMap, type AudioPressureSnapshot } from '../../../core/audio/audioPressureMap';
import { isRootFollowLegacyReliefGate, type RootFollowLegacyReliefGate } from '../rootFollow/rootFollowLegacyReliefGateContract';
import { detectXensonarBrowserStressProfile, resolveBurstStressScenario, type XensonarBrowserStressProfile, type XensonarBurstStressScenarioId } from '../diagnostics/burstStressScenarioContracts';
export type AudioTrafficSubsystem =
  | 'root-follow'
  | 'material-loop'
  | 'wave-starter'
  | 'wave-overtone-arp'
  | 'quantized-traffic'
  | 'particle'
  | 'resident'
  | 'myzel'
  | 'audio-graph'
  | 'unknown';

export type AudioTrafficEventKind =
  | 'gate-open'
  | 'gate-close'
  | 'scheduler-tick'
  | 'render-window'
  | 'grain-window'
  | 'retune-sample'
  | 'late-slice-resync'
  | 'direct-event-window'
  | 'worklet-shadow-bridge'
  | 'worklet-stable-lane-blend'
  | 'worklet-stable-lane-relieves-legacy-slice'
  | 'worklet-primary-candidate-mutes-legacy-slice'
  | 'worklet-material-engine-demoted'
  | 'connect-check'
  | 'queue-enqueue'
  | 'queue-flush'
  | 'queue-overflow-trim'
  | 'play-admitted'
  | 'play-failed'
  | 'stop-cleanup'
  | 'entry-auto-repair';

export type AudioTrafficEvent = {
  kind: AudioTrafficEventKind;
  subsystem: AudioTrafficSubsystem;
  perfNowMs: number;
  audioNowSec: number | null;
  detail?: Record<string, unknown>;
};

export type RootFollowTrafficState = {
  activeRequested: boolean;
  gateOpen: boolean;
  selectedLoopId: string | null;
  selectedLoopName: string | null;
  sourceKind: string | null;
  renderMode: string | null;
  granulationMode: 'flowing' | 'grainy' | null;
  volume: number;
  currentRootHz: number | null;
  timerActive: boolean;
  gainConnected: boolean;
  activeNodes: number;
  activeSynthVoices: number;
  cacheSize: number;
  token: number;
  lastStage: string | null;
};

export type WaveOvertoneArpTrafficState = {
  enabled: boolean;
  mode: string | null;
  timerActive: boolean;
  queueLength: number;
  maxQueueLength: number;
  enqueuedTotal: number;
  playedTotal: number;
  failedTotal: number;
  trimmedTotal: number;
  lastFlushDue: number;
  lastFlushPlayed: number;
  lastFlushFailed: number;
  lastFlushAtAudioSec: number | null;
  lastEnqueueAtAudioSec: number | null;
  lastStepSec: number | null;
  lastPattern: string | null;
  lastRate: number | null;
  lastSteps: number | null;
  lastStage: string | null;
};

export type AudioTrafficForensicsState = {
  createdAtIso: string;
  recentEvents: AudioTrafficEvent[];
  rootFollow: RootFollowTrafficState;
  waveOvertoneArp: WaveOvertoneArpTrafficState;
};

export type AudioTrafficBurstWindowSummary = {
  windowMs: number;
  maxEvents: number;
  maxRootFollowEvents: number;
  maxParticleEvents: number;
  maxWaveStarterEvents: number;
  maxQuantizedTrafficEvents: number;
};

export type AudioStressComparisonSnapshot = {
  version: 2;
  scenarioTag: 'manual-recorder' | 'stress-harness';
  scenarioId: XensonarBurstStressScenarioId;
  scenarioLabel: string;
  browserProfile: XensonarBrowserStressProfile;
  sampleWindowMs: number;
  dominantSubsystem: AudioTrafficSubsystem | 'none';
  rootFollowVoiceEngineMode: string | null;
  workletPilotHealth: string | null;
  workletStatus: string | null;
  workletBridgeEvents: number;
  primaryCandidateMuteEvents: number;
  stableLaneReliefEvents: number;
  stableLaneBlendEvents: number;
  legacyReliefGate: RootFollowLegacyReliefGate;
  stableLaneProven: boolean;
  stableLaneReliefReady: boolean;
  stableLaneWarmupReason: string | null;
  stableLaneFallbackReason: string | null;
  stableLaneLegacyBlend: number | null;
  stableLaneBlend: number | null;
  directPilotPostedEvents: number;
  granularAcceptedWindows: number;
  bufferCopiedBytes: number;
  bufferAvailable: boolean;
  maxQuantizedTrafficEventsPer16Ms: number;
  maxQuantizedTrafficEventsPer50Ms: number;
  maxQuantizedTrafficEventsPer100Ms: number;
  workletProcessorAlive: boolean;
  workletProcessorErrorCount: number;
  workletProcessQuantumCount: number;
  workletRenderedFrameCount: number;
  workletRenderedSampleCount: number;
  workletActiveRenderQuantumCount: number;
  workletDirectRenderedFrameCount: number;
  workletGranularRenderedFrameCount: number;
  workletStableLaneRenderedFrameCount: number;
  workletStableLaneRenderedFrameDelta: number;
  workletStableLaneActiveRenderQuantumCount: number;
  workletStableLaneFrameAdvanceFresh: boolean;
  workletStableLaneLastFrameAdvanceAgeMs: number | null;
  workletStableLaneHoldQuantumCount: number;
  workletStableLaneCrossfadeFrameCount: number;
  workletStableLaneGainRampFrameCount: number;
  workletStableLanePlanCount: number;
  workletStableLaneRetuneCount: number;
  workletBridgeSessionId: number;
  workletProcessorGeneration: number;
  workletStableLaneBufferAcked: boolean;
  workletStableLaneBufferRejectedReason: string | null;
  workletStableLanePlanAcked: boolean;
  workletStableLanePlanRejectedReason: string | null;
  workletStableLaneBufferAckCount: number;
  workletStableLaneBufferRejectCount: number;
  workletStableLanePlanAckCount: number;
  workletStableLanePlanRejectCount: number;
  workletStableLaneLastAcceptedPlanSequence: number;
  workletStableLanePlanTransportPostedCount: number;
  workletStableLanePlanTransportPendingCount: number;
  workletStableLanePlanTransportDroppedSupersededCount: number;
  workletStableLanePlanTransportForcedPostCount: number;
  workletStableLanePlanTransportAckCount: number;
  workletStableLanePlanTransportPendingSequence: number | null;
  workletStableLanePlanTransportInFlightSequence: number | null;
  workletStableLanePlanTransportDroppedStaleCount: number;
  workletStableLanePlanTransportBackendKind: string | null;
  workletStableLanePlanTransportSabRingbufferReserved: boolean;
  workletStableLanePlanTransportBackendFallbackReason: string | null;
  workletStableLaneSabTransportReadiness: string | null;
  workletStableLaneSabTransportReady: boolean;
  workletStableLaneSabTransportReadinessReason: string | null;
  workletStableLaneSabTransportSharedArrayBufferAvailable: boolean;
  workletStableLaneSabTransportCrossOriginIsolated: boolean;
  workletStableLaneSabTransportSecureContext: boolean;
  workletStableLaneSabTransportSingleFileHtmlLikelyBlocked: boolean;
  workletStableLaneSabTransportRequiredCoop: string | null;
  workletStableLaneSabTransportRequiredCoep: string | null;
  workletStableLaneBufferGeneration: number | null;
  workletDirectPilotAcceptedEventTotal: number;
  workletGranularPilotAcceptedWindowTotal: number;
  workletBufferTransferCopiedByteLengthTotal: number;
  workletThroughputSignal: boolean;
  burstRiskScore: number;
  robustnessScore: number;
  musicalPreservationScore: number;
  restrictionCostScore: number;
  browserOptimizedReadout: 'calm' | 'playable' | 'critical';
  rejectsPerSecondProxy: number;
  smoothingBeforeDropProxy: number;
  maxEventsPer16Ms: number;
  maxEventsPer50Ms: number;
  maxRootFollowEventsPer16Ms: number;
  maxParticleEventsPer16Ms: number;
  maxWaveStarterEventsPer16Ms: number;
  note: string;
};

export type AudioTrafficForensicsSnapshot = {
  rootFollow: RootFollowTrafficState;
  audioPressure: AudioPressureSnapshot;
  waveOvertoneArp: WaveOvertoneArpTrafficState;
  recent: {
    windowMs: number;
    total: number;
    bySubsystem: Partial<Record<AudioTrafficSubsystem, number>>;
    byKind: Partial<Record<AudioTrafficEventKind, number>>;
    rootFollow: {
      schedulerTicks: number;
      renderWindows: number;
      grainWindows: number;
      retuneSamples: number;
      directEventWindows: number;
      gateOpens: number;
      gateCloses: number;
      stopCleanups: number;
    };
    waveOvertoneArp: {
      enqueues: number;
      flushes: number;
      admitted: number;
      failed: number;
      overflowTrims: number;
      stopCleanups: number;
    };
  };
  burstWindows: {
    windows: AudioTrafficBurstWindowSummary[];
    maxEventsPer16Ms: number;
    maxRootFollowEventsPer16Ms: number;
    maxQuantizedTrafficEventsPer16Ms: number;
    maxQuantizedTrafficEventsPer50Ms: number;
    maxEventsPer50Ms: number;
    note: string;
  };
  stressComparison: AudioStressComparisonSnapshot;
  duplicateConnectionSuspected: boolean;
};

const EMPTY_ROOT_FOLLOW_TRAFFIC: RootFollowTrafficState = {
  activeRequested: false,
  gateOpen: false,
  selectedLoopId: null,
  selectedLoopName: null,
  sourceKind: null,
  renderMode: null,
  granulationMode: null,
  volume: 0,
  currentRootHz: null,
  timerActive: false,
  gainConnected: false,
  activeNodes: 0,
  activeSynthVoices: 0,
  cacheSize: 0,
  token: 0,
  lastStage: null,
};

const EMPTY_WAVE_OVERTONE_ARP_TRAFFIC: WaveOvertoneArpTrafficState = {
  enabled: false,
  mode: null,
  timerActive: false,
  queueLength: 0,
  maxQueueLength: 0,
  enqueuedTotal: 0,
  playedTotal: 0,
  failedTotal: 0,
  trimmedTotal: 0,
  lastFlushDue: 0,
  lastFlushPlayed: 0,
  lastFlushFailed: 0,
  lastFlushAtAudioSec: null,
  lastEnqueueAtAudioSec: null,
  lastStepSec: null,
  lastPattern: null,
  lastRate: null,
  lastSteps: null,
  lastStage: null,
};

function nowPerfMs() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function cloneRootFollowTraffic(input: RootFollowTrafficState): RootFollowTrafficState {
  return { ...input };
}

function cloneWaveOvertoneArpTraffic(input: WaveOvertoneArpTrafficState): WaveOvertoneArpTrafficState {
  return { ...input };
}

export function createEmptyAudioTrafficForensicsState(): AudioTrafficForensicsState {
  return {
    createdAtIso: new Date().toISOString(),
    recentEvents: [],
    rootFollow: cloneRootFollowTraffic(EMPTY_ROOT_FOLLOW_TRAFFIC),
    waveOvertoneArp: cloneWaveOvertoneArpTraffic(EMPTY_WAVE_OVERTONE_ARP_TRAFFIC),
  };
}

export function updateRootFollowTrafficState(
  state: AudioTrafficForensicsState,
  patch: Partial<RootFollowTrafficState>,
) {
  state.rootFollow = {
    ...state.rootFollow,
    ...patch,
  };
}

export function updateWaveOvertoneArpTrafficState(
  state: AudioTrafficForensicsState | null | undefined,
  patch: Partial<WaveOvertoneArpTrafficState>,
) {
  if (!state) return;
  const nextQueueLength = patch.queueLength ?? state.waveOvertoneArp.queueLength;
  const nextMaxQueueLength = Math.max(
    state.waveOvertoneArp.maxQueueLength,
    Number.isFinite(nextQueueLength) ? nextQueueLength : 0,
    patch.maxQueueLength ?? 0,
  );
  state.waveOvertoneArp = {
    ...state.waveOvertoneArp,
    ...patch,
    maxQueueLength: nextMaxQueueLength,
  };
}

export function markAudioTrafficEvent(
  state: AudioTrafficForensicsState | null | undefined,
  event: Omit<AudioTrafficEvent, 'perfNowMs'> & { perfNowMs?: number },
  maxEvents = 720,
) {
  if (!state) return;
  const perfNowMs = event.perfNowMs ?? nowPerfMs();
  state.recentEvents.push({
    kind: event.kind,
    subsystem: event.subsystem,
    audioNowSec: event.audioNowSec,
    perfNowMs,
    detail: event.detail,
  });
  // Audio traffic is diagnostic evidence, not the realtime product path. Avoid an
  // O(n) front-splice on every single hot-path event once the buffer is full.
  // A small overflow reserve preserves at least maxEvents newest entries while
  // amortizing compaction over many writes.
  const trimThreshold = maxEvents + Math.min(128, Math.max(32, Math.floor(maxEvents * 0.125)));
  if (state.recentEvents.length > trimThreshold) {
    state.recentEvents.splice(0, state.recentEvents.length - maxEvents);
  }
}

function increment<K extends string>(map: Partial<Record<K, number>>, key: K) {
  map[key] = (map[key] ?? 0) + 1;
}

function summarizeBurstWindow(
  events: readonly AudioTrafficEvent[],
  windowMs: number,
): AudioTrafficBurstWindowSummary {
  if (events.length === 0) {
    return {
      windowMs,
      maxEvents: 0,
      maxRootFollowEvents: 0,
      maxParticleEvents: 0,
      maxWaveStarterEvents: 0,
      maxQuantizedTrafficEvents: 0,
    };
  }
  const sorted = [...events].sort((a, b) => a.perfNowMs - b.perfNowMs);
  let maxEvents = 0;
  let maxRootFollowEvents = 0;
  let maxParticleEvents = 0;
  let maxWaveStarterEvents = 0;
  let maxQuantizedTrafficEvents = 0;
  for (let start = 0; start < sorted.length; start += 1) {
    const startMs = sorted[start].perfNowMs;
    let total = 0;
    let rootFollow = 0;
    let particle = 0;
    let waveStarter = 0;
    let quantizedTraffic = 0;
    for (let index = start; index < sorted.length; index += 1) {
      const entry = sorted[index];
      if (entry.perfNowMs - startMs > windowMs) break;
      total += 1;
      if (entry.subsystem === 'root-follow') rootFollow += 1;
      else if (entry.subsystem === 'particle' || entry.subsystem === 'resident') particle += 1;
      else if (entry.subsystem === 'wave-starter' || entry.subsystem === 'wave-overtone-arp') waveStarter += 1;
      else if (entry.subsystem === 'quantized-traffic') quantizedTraffic += 1;
    }
    maxEvents = Math.max(maxEvents, total);
    maxRootFollowEvents = Math.max(maxRootFollowEvents, rootFollow);
    maxParticleEvents = Math.max(maxParticleEvents, particle);
    maxWaveStarterEvents = Math.max(maxWaveStarterEvents, waveStarter);
    maxQuantizedTrafficEvents = Math.max(maxQuantizedTrafficEvents, quantizedTraffic);
  }
  return {
    windowMs,
    maxEvents,
    maxRootFollowEvents,
    maxParticleEvents,
    maxWaveStarterEvents,
    maxQuantizedTrafficEvents,
  };
}


function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readNestedRecord(value: unknown, key: string): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const next = value[key];
  return isRecord(next) ? next : null;
}

function readNestedNumber(value: unknown, path: readonly string[]): number | null {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return null;
    current = current[key];
  }
  const numberValue = typeof current === 'number' ? current : Number(current);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function readNestedString(value: unknown, path: readonly string[]): string | null {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return null;
    current = current[key];
  }
  return typeof current === 'string' && current.trim() ? current : null;
}

function readNestedBoolean(value: unknown, path: readonly string[]): boolean | null {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return null;
    current = current[key];
  }
  return typeof current === 'boolean' ? current : null;
}

function readRootFollowWorkletDebugSnapshot(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  const debugWindow = window as typeof window & {
    __XENSONAR_ROOT_FOLLOW_WORKLET_SHADOW__?: Record<string, unknown>;
  };
  return isRecord(debugWindow.__XENSONAR_ROOT_FOLLOW_WORKLET_SHADOW__)
    ? debugWindow.__XENSONAR_ROOT_FOLLOW_WORKLET_SHADOW__
    : null;
}

function maxOptionalNumber(...values: (number | null | undefined)[]): number {
  return values.reduce<number>((max, value) => Math.max(max, Number.isFinite(value ?? NaN) ? Number(value) : 0), 0);
}

function inferDominantSubsystem(bySubsystem: Partial<Record<AudioTrafficSubsystem, number>>): AudioTrafficSubsystem | 'none' {
  let dominant: AudioTrafficSubsystem | 'none' = 'none';
  let dominantCount = 0;
  for (const [subsystem, count] of Object.entries(bySubsystem) as [AudioTrafficSubsystem, number | undefined][]) {
    const safeCount = count ?? 0;
    if (safeCount > dominantCount) {
      dominant = subsystem;
      dominantCount = safeCount;
    }
  }
  return dominant;
}

function summarizeAudioStressComparison(args: {
  recentEvents: readonly AudioTrafficEvent[];
  bySubsystem: Partial<Record<AudioTrafficSubsystem, number>>;
  windows: readonly AudioTrafficBurstWindowSummary[];
  windowMs: number;
  scenarioId?: XensonarBurstStressScenarioId | string | null;
}): AudioStressComparisonSnapshot {
  const window16 = args.windows.find((entry) => entry.windowMs === 16);
  const window50 = args.windows.find((entry) => entry.windowMs === 50);
  const scenario = resolveBurstStressScenario(args.scenarioId);
  const browserProfile = detectXensonarBrowserStressProfile();
  let rootFollowVoiceEngineMode: string | null = null;
  let workletPilotHealth: string | null = null;
  let workletStatus: string | null = null;
  let workletBridgeEvents = 0;
  let primaryCandidateMuteEvents = 0;
  let stableLaneReliefEvents = 0;
  let stableLaneBlendEvents = 0;
  let legacyReliefGate: RootFollowLegacyReliefGate = 'no-relief';
  let stableLaneProven = false;
  let stableLaneReliefReady = false;
  let stableLaneWarmupReason: string | null = null;
  let stableLaneFallbackReason: string | null = null;
  let stableLaneLegacyBlend: number | null = null;
  let stableLaneBlend: number | null = null;
  let directPilotPostedEvents = 0;
  let granularAcceptedWindows = 0;
  let bufferCopiedBytes = 0;
  let bufferAvailable = false;
  let workletProcessorAlive = false;
  let workletProcessorErrorCount = 0;
  let workletProcessQuantumCount = 0;
  let workletRenderedFrameCount = 0;
  let workletRenderedSampleCount = 0;
  let workletActiveRenderQuantumCount = 0;
  let workletDirectRenderedFrameCount = 0;
  let workletGranularRenderedFrameCount = 0;
  let workletStableLaneRenderedFrameCount = 0;
  let workletStableLaneRenderedFrameDelta = 0;
  let workletStableLaneActiveRenderQuantumCount = 0;
  let workletStableLaneLastFrameAdvanceAtMs: number | null = null;
  let workletStableLaneHoldQuantumCount = 0;
  let workletStableLaneCrossfadeFrameCount = 0;
  let workletStableLaneGainRampFrameCount = 0;
  let workletStableLanePlanCount = 0;
  let workletStableLaneRetuneCount = 0;
  let workletBridgeSessionId = 0;
  let workletProcessorGeneration = 0;
  let workletStableLaneBufferAcked = false;
  let workletStableLaneBufferRejectedReason: string | null = null;
  let workletStableLanePlanAcked = false;
  let workletStableLanePlanRejectedReason: string | null = null;
  let workletStableLaneBufferAckCount = 0;
  let workletStableLaneBufferRejectCount = 0;
  let workletStableLanePlanAckCount = 0;
  let workletStableLanePlanRejectCount = 0;
  let workletStableLaneLastAcceptedPlanSequence = 0;
  let workletStableLanePlanTransportPostedCount = 0;
  let workletStableLanePlanTransportPendingCount = 0;
  let workletStableLanePlanTransportDroppedSupersededCount = 0;
  let workletStableLanePlanTransportForcedPostCount = 0;
  let workletStableLanePlanTransportAckCount = 0;
  let workletStableLanePlanTransportPendingSequence: number | null = null;
  let workletStableLanePlanTransportInFlightSequence: number | null = null;
  let workletStableLanePlanTransportDroppedStaleCount = 0;
  let workletStableLanePlanTransportBackendKind: string | null = null;
  let workletStableLanePlanTransportSabRingbufferReserved = false;
  let workletStableLanePlanTransportBackendFallbackReason: string | null = null;
  let workletStableLaneSabTransportReadiness: string | null = null;
  let workletStableLaneSabTransportReady = false;
  let workletStableLaneSabTransportReadinessReason: string | null = null;
  let workletStableLaneSabTransportSharedArrayBufferAvailable = false;
  let workletStableLaneSabTransportCrossOriginIsolated = false;
  let workletStableLaneSabTransportSecureContext = false;
  let workletStableLaneSabTransportSingleFileHtmlLikelyBlocked = false;
  let workletStableLaneSabTransportRequiredCoop: string | null = null;
  let workletStableLaneSabTransportRequiredCoep: string | null = null;
  let workletStableLaneBufferGeneration: number | null = null;
  let workletDirectPilotAcceptedEventTotal = 0;
  let workletGranularPilotAcceptedWindowTotal = 0;
  let workletBufferTransferCopiedByteLengthTotal = 0;
  let rejectProxyCount = 0;
  let smoothingProxyCount = 0;
  let dropProxyCount = 0;

  for (const entry of args.recentEvents) {
    const detail = entry.detail;
    if (entry.kind === 'play-failed' || entry.kind === 'queue-overflow-trim') rejectProxyCount += 1;
    if (entry.kind === 'queue-flush' || entry.kind === 'late-slice-resync') smoothingProxyCount += 1;
    if (entry.kind === 'queue-overflow-trim' || entry.kind === 'play-failed') dropProxyCount += 1;
    if (entry.kind === 'worklet-shadow-bridge') {
      workletBridgeEvents += 1;
      workletStatus = readNestedString(detail, ['status']) ?? workletStatus;
      const directEventCount = readNestedNumber(detail, ['eventCount']);
      if (readNestedBoolean(detail, ['directPilotActive']) === true && directEventCount !== null) {
        directPilotPostedEvents += directEventCount;
      }
      const copiedBytes = readNestedNumber(detail, ['transferSummary', 'copiedByteLength'])
        ?? readNestedNumber(detail, ['pilotHealth', 'copiedByteLength'])
        ?? readNestedNumber(detail, ['copiedByteLength']);
      if (copiedBytes !== null) bufferCopiedBytes = Math.max(bufferCopiedBytes, copiedBytes);
      if (readNestedBoolean(detail, ['hasSampleBufferTransfer']) === true) bufferAvailable = true;
    }
    if (entry.kind === 'worklet-stable-lane-blend') {
      stableLaneBlendEvents += 1;
      rootFollowVoiceEngineMode = readNestedString(detail, ['rootFollowVoiceEngineMode']) ?? rootFollowVoiceEngineMode;
      stableLaneProven = readNestedBoolean(detail, ['stableLaneProven']) ?? stableLaneProven;
      stableLaneReliefReady = readNestedBoolean(detail, ['stableLaneReliefReady']) ?? stableLaneReliefReady;
      stableLaneWarmupReason = readNestedString(detail, ['stableLaneWarmupReason']) ?? stableLaneWarmupReason;
      stableLaneFallbackReason = readNestedString(detail, ['stableLaneFallbackReason']) ?? stableLaneFallbackReason;
      stableLaneLegacyBlend = readNestedNumber(detail, ['legacyBlend']) ?? stableLaneLegacyBlend;
      stableLaneBlend = readNestedNumber(detail, ['stableLaneBlend']) ?? stableLaneBlend;
      workletStableLaneRenderedFrameDelta = Math.max(workletStableLaneRenderedFrameDelta, readNestedNumber(detail, ['stableLaneRenderedFrameDelta']) ?? 0);
      workletStableLaneActiveRenderQuantumCount = Math.max(workletStableLaneActiveRenderQuantumCount, readNestedNumber(detail, ['stableLaneActiveRenderQuantumCount']) ?? 0);
      workletStableLaneLastFrameAdvanceAtMs = readNestedNumber(detail, ['lastStableLaneFrameAdvanceAtMs']) ?? workletStableLaneLastFrameAdvanceAtMs;
      const gate = readNestedString(detail, ['legacyReliefGate']);
      if (isRootFollowLegacyReliefGate(gate)) legacyReliefGate = gate;
    }
    if (entry.kind === 'worklet-stable-lane-relieves-legacy-slice') {
      stableLaneReliefEvents += 1;
      stableLaneReliefReady = readNestedBoolean(detail, ['stableLaneReliefReady']) ?? true;
      stableLaneProven = true;
      stableLaneLegacyBlend = readNestedNumber(detail, ['legacyBlend']) ?? stableLaneLegacyBlend;
      stableLaneBlend = readNestedNumber(detail, ['stableLaneBlend']) ?? stableLaneBlend;
      workletStableLaneRenderedFrameDelta = Math.max(workletStableLaneRenderedFrameDelta, readNestedNumber(detail, ['stableLaneRenderedFrameDelta']) ?? 0);
      workletStableLaneActiveRenderQuantumCount = Math.max(workletStableLaneActiveRenderQuantumCount, readNestedNumber(detail, ['stableLaneActiveRenderQuantumCount']) ?? 0);
      workletStableLaneLastFrameAdvanceAtMs = readNestedNumber(detail, ['lastStableLaneFrameAdvanceAtMs']) ?? workletStableLaneLastFrameAdvanceAtMs;
      legacyReliefGate = 'stable-lane-sustained-relief';
    }
    if (entry.kind === 'worklet-primary-candidate-mutes-legacy-slice') {
      primaryCandidateMuteEvents += 1;
      legacyReliefGate = 'granular-primary-health';
      stableLaneReliefReady = readNestedBoolean(detail, ['stableLaneReliefReady']) ?? stableLaneReliefReady;
      stableLaneWarmupReason = readNestedString(detail, ['stableLaneWarmupReason']) ?? stableLaneWarmupReason;
      stableLaneFallbackReason = readNestedString(detail, ['stableLaneFallbackReason']) ?? stableLaneFallbackReason;
      const pilotRecord = readNestedRecord(detail, 'pilotHealth');
      workletPilotHealth = readNestedString(pilotRecord, ['pilotHealth']) ?? workletPilotHealth;
      granularAcceptedWindows = Math.max(
        granularAcceptedWindows,
        readNestedNumber(pilotRecord, ['granularAccepted'])
          ?? readNestedNumber(pilotRecord, ['lastGranularPilotAcceptedWindowCount'])
          ?? 0,
      );
      bufferCopiedBytes = Math.max(
        bufferCopiedBytes,
        readNestedNumber(pilotRecord, ['copiedByteLength'])
          ?? readNestedNumber(pilotRecord, ['lastBufferTransferCopiedByteLength'])
          ?? 0,
      );
      if (readNestedBoolean(pilotRecord, ['granularBufferAvailable']) === true) bufferAvailable = true;
    }
    if (entry.kind === 'direct-event-window') {
      const voicePool = readNestedRecord(detail, 'voicePoolShadow');
      rootFollowVoiceEngineMode = readNestedString(voicePool, ['mode']) ?? rootFollowVoiceEngineMode;
      directPilotPostedEvents += readNestedNumber(voicePool, ['workletDirectPilotPostedCount']) ?? 0;
    }
    const pilotRecord = readNestedRecord(detail, 'pilotHealth');
    workletPilotHealth = readNestedString(pilotRecord, ['pilotHealth']) ?? workletPilotHealth;
    granularAcceptedWindows = Math.max(
      granularAcceptedWindows,
      readNestedNumber(pilotRecord, ['granularAccepted'])
        ?? readNestedNumber(pilotRecord, ['lastGranularPilotAcceptedWindowCount'])
        ?? 0,
    );
    if (readNestedBoolean(pilotRecord, ['granularBufferAvailable']) === true) bufferAvailable = true;

    const throughputRecord = readNestedRecord(detail, 'throughput') ?? pilotRecord;
    workletProcessorAlive = workletProcessorAlive || readNestedBoolean(throughputRecord, ['processorAlive']) === true;
    workletProcessorErrorCount = Math.max(workletProcessorErrorCount, readNestedNumber(throughputRecord, ['processorErrorCount']) ?? 0);
    workletProcessQuantumCount = Math.max(workletProcessQuantumCount, readNestedNumber(throughputRecord, ['processQuantumCount']) ?? 0);
    workletRenderedFrameCount = Math.max(workletRenderedFrameCount, readNestedNumber(throughputRecord, ['renderedFrameCount']) ?? 0);
    workletRenderedSampleCount = Math.max(workletRenderedSampleCount, readNestedNumber(throughputRecord, ['renderedSampleCount']) ?? 0);
    workletActiveRenderQuantumCount = Math.max(workletActiveRenderQuantumCount, readNestedNumber(throughputRecord, ['activeRenderQuantumCount']) ?? 0);
    workletDirectRenderedFrameCount = Math.max(workletDirectRenderedFrameCount, readNestedNumber(throughputRecord, ['directRenderedFrameCount']) ?? 0);
    workletGranularRenderedFrameCount = Math.max(workletGranularRenderedFrameCount, readNestedNumber(throughputRecord, ['granularRenderedFrameCount']) ?? 0);
    workletStableLaneRenderedFrameCount = Math.max(workletStableLaneRenderedFrameCount, readNestedNumber(throughputRecord, ['stableLaneRenderedFrameCount']) ?? 0);
    workletStableLaneRenderedFrameDelta = Math.max(workletStableLaneRenderedFrameDelta, readNestedNumber(throughputRecord, ['stableLaneRenderedFrameDelta']) ?? 0);
    workletStableLaneActiveRenderQuantumCount = Math.max(workletStableLaneActiveRenderQuantumCount, readNestedNumber(throughputRecord, ['stableLaneActiveRenderQuantumCount']) ?? 0);
    workletStableLaneLastFrameAdvanceAtMs = readNestedNumber(throughputRecord, ['lastStableLaneFrameAdvanceAtMs']) ?? workletStableLaneLastFrameAdvanceAtMs;
    workletStableLaneHoldQuantumCount = Math.max(workletStableLaneHoldQuantumCount, readNestedNumber(throughputRecord, ['stableLaneHoldQuantumCount']) ?? 0);
    workletStableLaneCrossfadeFrameCount = Math.max(workletStableLaneCrossfadeFrameCount, readNestedNumber(throughputRecord, ['stableLaneCrossfadeFrameCount']) ?? 0);
    workletStableLaneGainRampFrameCount = Math.max(workletStableLaneGainRampFrameCount, readNestedNumber(throughputRecord, ['stableLaneGainRampFrameCount']) ?? 0);
    workletStableLanePlanCount = Math.max(workletStableLanePlanCount, readNestedNumber(throughputRecord, ['stableLanePlanCount']) ?? 0);
    workletStableLaneRetuneCount = Math.max(workletStableLaneRetuneCount, readNestedNumber(throughputRecord, ['stableLaneRetuneCount']) ?? 0);
    workletBridgeSessionId = Math.max(workletBridgeSessionId, readNestedNumber(throughputRecord, ['bridgeSessionId']) ?? 0);
    workletProcessorGeneration = Math.max(workletProcessorGeneration, readNestedNumber(throughputRecord, ['processorGeneration']) ?? 0);
    workletStableLaneBufferAcked = workletStableLaneBufferAcked || readNestedBoolean(throughputRecord, ['stableLaneBufferAcked']) === true;
    workletStableLaneBufferRejectedReason = readNestedString(throughputRecord, ['stableLaneBufferRejectedReason']) ?? workletStableLaneBufferRejectedReason;
    workletStableLanePlanAcked = workletStableLanePlanAcked || readNestedBoolean(throughputRecord, ['stableLanePlanAcked']) === true;
    workletStableLanePlanRejectedReason = readNestedString(throughputRecord, ['stableLanePlanRejectedReason']) ?? workletStableLanePlanRejectedReason;
    workletStableLaneBufferAckCount = Math.max(workletStableLaneBufferAckCount, readNestedNumber(throughputRecord, ['stableLaneBufferAckCount']) ?? 0);
    workletStableLaneBufferRejectCount = Math.max(workletStableLaneBufferRejectCount, readNestedNumber(throughputRecord, ['stableLaneBufferRejectCount']) ?? 0);
    workletStableLanePlanAckCount = Math.max(workletStableLanePlanAckCount, readNestedNumber(throughputRecord, ['stableLanePlanAckCount']) ?? 0);
    workletStableLanePlanRejectCount = Math.max(workletStableLanePlanRejectCount, readNestedNumber(throughputRecord, ['stableLanePlanRejectCount']) ?? 0);
    workletStableLaneLastAcceptedPlanSequence = Math.max(workletStableLaneLastAcceptedPlanSequence, readNestedNumber(throughputRecord, ['stableLaneLastAcceptedPlanSequence']) ?? 0);
    workletStableLanePlanTransportPostedCount = Math.max(workletStableLanePlanTransportPostedCount, readNestedNumber(throughputRecord, ['stableLanePlanTransportPostedCount']) ?? 0);
    workletStableLanePlanTransportPendingCount = Math.max(workletStableLanePlanTransportPendingCount, readNestedNumber(throughputRecord, ['stableLanePlanTransportPendingCount']) ?? 0);
    workletStableLanePlanTransportDroppedSupersededCount = Math.max(workletStableLanePlanTransportDroppedSupersededCount, readNestedNumber(throughputRecord, ['stableLanePlanTransportDroppedSupersededCount']) ?? 0);
    workletStableLanePlanTransportForcedPostCount = Math.max(workletStableLanePlanTransportForcedPostCount, readNestedNumber(throughputRecord, ['stableLanePlanTransportForcedPostCount']) ?? 0);
    workletStableLanePlanTransportAckCount = Math.max(workletStableLanePlanTransportAckCount, readNestedNumber(throughputRecord, ['stableLanePlanTransportAckCount']) ?? 0);
    workletStableLanePlanTransportDroppedStaleCount = Math.max(workletStableLanePlanTransportDroppedStaleCount, readNestedNumber(throughputRecord, ['stableLanePlanTransportDroppedStaleCount']) ?? 0);
    workletStableLanePlanTransportPendingSequence = readNestedNumber(throughputRecord, ['stableLanePlanTransportPendingSequence']) ?? workletStableLanePlanTransportPendingSequence;
    workletStableLanePlanTransportInFlightSequence = readNestedNumber(throughputRecord, ['stableLanePlanTransportInFlightSequence']) ?? workletStableLanePlanTransportInFlightSequence;
    workletStableLanePlanTransportBackendKind = readNestedString(throughputRecord, ['stableLanePlanTransportBackendKind']) ?? workletStableLanePlanTransportBackendKind;
    workletStableLanePlanTransportSabRingbufferReserved = workletStableLanePlanTransportSabRingbufferReserved || readNestedBoolean(throughputRecord, ['stableLanePlanTransportSabRingbufferReserved']) === true;
    workletStableLanePlanTransportBackendFallbackReason = readNestedString(throughputRecord, ['stableLanePlanTransportBackendFallbackReason']) ?? workletStableLanePlanTransportBackendFallbackReason;
    workletStableLaneSabTransportReadiness = readNestedString(throughputRecord, ['stableLaneSabTransportReadiness']) ?? workletStableLaneSabTransportReadiness;
    workletStableLaneSabTransportReady = workletStableLaneSabTransportReady || readNestedBoolean(throughputRecord, ['stableLaneSabTransportReady']) === true;
    workletStableLaneSabTransportReadinessReason = readNestedString(throughputRecord, ['stableLaneSabTransportReadinessReason']) ?? workletStableLaneSabTransportReadinessReason;
    workletStableLaneSabTransportSharedArrayBufferAvailable = workletStableLaneSabTransportSharedArrayBufferAvailable || readNestedBoolean(throughputRecord, ['stableLaneSabTransportSharedArrayBufferAvailable']) === true;
    workletStableLaneSabTransportCrossOriginIsolated = workletStableLaneSabTransportCrossOriginIsolated || readNestedBoolean(throughputRecord, ['stableLaneSabTransportCrossOriginIsolated']) === true;
    workletStableLaneSabTransportSecureContext = workletStableLaneSabTransportSecureContext || readNestedBoolean(throughputRecord, ['stableLaneSabTransportSecureContext']) === true;
    workletStableLaneSabTransportSingleFileHtmlLikelyBlocked = workletStableLaneSabTransportSingleFileHtmlLikelyBlocked || readNestedBoolean(throughputRecord, ['stableLaneSabTransportSingleFileHtmlLikelyBlocked']) === true;
    workletStableLaneSabTransportRequiredCoop = readNestedString(throughputRecord, ['stableLaneSabTransportRequiredCoop']) ?? workletStableLaneSabTransportRequiredCoop;
    workletStableLaneSabTransportRequiredCoep = readNestedString(throughputRecord, ['stableLaneSabTransportRequiredCoep']) ?? workletStableLaneSabTransportRequiredCoep;
    const stableLanePlanTransportRecord = readNestedRecord(detail, 'stableLanePlanTransport');
    workletStableLanePlanTransportBackendKind = readNestedString(stableLanePlanTransportRecord, ['backendKind']) ?? workletStableLanePlanTransportBackendKind;
    workletStableLanePlanTransportSabRingbufferReserved = workletStableLanePlanTransportSabRingbufferReserved || readNestedBoolean(stableLanePlanTransportRecord, ['sabRingbufferReserved']) === true;
    workletStableLanePlanTransportBackendFallbackReason = readNestedString(stableLanePlanTransportRecord, ['backendFallbackReason']) ?? workletStableLanePlanTransportBackendFallbackReason;
    workletStableLanePlanTransportPostedCount = Math.max(workletStableLanePlanTransportPostedCount, readNestedNumber(stableLanePlanTransportRecord, ['postedCount']) ?? 0);
    workletStableLanePlanTransportPendingCount = Math.max(workletStableLanePlanTransportPendingCount, readNestedNumber(stableLanePlanTransportRecord, ['pendingCount']) ?? 0);
    workletStableLanePlanTransportDroppedSupersededCount = Math.max(workletStableLanePlanTransportDroppedSupersededCount, readNestedNumber(stableLanePlanTransportRecord, ['droppedSupersededCount']) ?? 0);
    workletStableLanePlanTransportForcedPostCount = Math.max(workletStableLanePlanTransportForcedPostCount, readNestedNumber(stableLanePlanTransportRecord, ['forcedPostCount']) ?? 0);
    workletStableLanePlanTransportAckCount = Math.max(workletStableLanePlanTransportAckCount, readNestedNumber(stableLanePlanTransportRecord, ['ackCount']) ?? 0);
    workletStableLanePlanTransportPendingSequence = readNestedNumber(stableLanePlanTransportRecord, ['pendingSequence']) ?? workletStableLanePlanTransportPendingSequence;
    workletStableLanePlanTransportInFlightSequence = readNestedNumber(stableLanePlanTransportRecord, ['inFlightSequence']) ?? workletStableLanePlanTransportInFlightSequence;
    workletStableLaneBufferGeneration = readNestedNumber(throughputRecord, ['stableLaneBufferGeneration']) ?? workletStableLaneBufferGeneration;
    workletDirectPilotAcceptedEventTotal = Math.max(workletDirectPilotAcceptedEventTotal, readNestedNumber(throughputRecord, ['directPilotAcceptedEventTotal']) ?? 0);
    workletGranularPilotAcceptedWindowTotal = Math.max(workletGranularPilotAcceptedWindowTotal, readNestedNumber(throughputRecord, ['granularPilotAcceptedWindowTotal']) ?? 0);
    workletBufferTransferCopiedByteLengthTotal = Math.max(workletBufferTransferCopiedByteLengthTotal, readNestedNumber(throughputRecord, ['bufferTransferCopiedByteLengthTotal']) ?? 0);
  }

  const debugWorklet = readRootFollowWorkletDebugSnapshot();
  if (debugWorklet) {
    workletStatus = readNestedString(debugWorklet, ['status']) ?? workletStatus;
    workletPilotHealth = readNestedString(debugWorklet, ['pilotHealth']) ?? workletPilotHealth;
    workletProcessorAlive = workletProcessorAlive || readNestedBoolean(debugWorklet, ['processorAlive']) === true;
    workletProcessorErrorCount = maxOptionalNumber(workletProcessorErrorCount, readNestedNumber(debugWorklet, ['processorErrorCount']));
    workletProcessQuantumCount = maxOptionalNumber(workletProcessQuantumCount, readNestedNumber(debugWorklet, ['processQuantumCount']));
    workletRenderedFrameCount = maxOptionalNumber(workletRenderedFrameCount, readNestedNumber(debugWorklet, ['renderedFrameCount']));
    workletRenderedSampleCount = maxOptionalNumber(workletRenderedSampleCount, readNestedNumber(debugWorklet, ['renderedSampleCount']));
    workletActiveRenderQuantumCount = maxOptionalNumber(workletActiveRenderQuantumCount, readNestedNumber(debugWorklet, ['activeRenderQuantumCount']));
    workletDirectRenderedFrameCount = maxOptionalNumber(workletDirectRenderedFrameCount, readNestedNumber(debugWorklet, ['directRenderedFrameCount']));
    workletGranularRenderedFrameCount = maxOptionalNumber(workletGranularRenderedFrameCount, readNestedNumber(debugWorklet, ['granularRenderedFrameCount']));
    workletStableLaneRenderedFrameCount = maxOptionalNumber(workletStableLaneRenderedFrameCount, readNestedNumber(debugWorklet, ['stableLaneRenderedFrameCount']));
    workletStableLaneRenderedFrameDelta = maxOptionalNumber(workletStableLaneRenderedFrameDelta, readNestedNumber(debugWorklet, ['stableLaneRenderedFrameDelta']));
    workletStableLaneActiveRenderQuantumCount = maxOptionalNumber(workletStableLaneActiveRenderQuantumCount, readNestedNumber(debugWorklet, ['stableLaneActiveRenderQuantumCount']));
    workletStableLaneLastFrameAdvanceAtMs = readNestedNumber(debugWorklet, ['lastStableLaneFrameAdvanceAtMs']) ?? workletStableLaneLastFrameAdvanceAtMs;
    workletStableLaneHoldQuantumCount = maxOptionalNumber(workletStableLaneHoldQuantumCount, readNestedNumber(debugWorklet, ['stableLaneHoldQuantumCount']));
    workletStableLaneCrossfadeFrameCount = maxOptionalNumber(workletStableLaneCrossfadeFrameCount, readNestedNumber(debugWorklet, ['stableLaneCrossfadeFrameCount']));
    workletStableLaneGainRampFrameCount = maxOptionalNumber(workletStableLaneGainRampFrameCount, readNestedNumber(debugWorklet, ['stableLaneGainRampFrameCount']));
    workletStableLanePlanCount = maxOptionalNumber(workletStableLanePlanCount, readNestedNumber(debugWorklet, ['stableLanePlanCount']));
    workletStableLaneRetuneCount = maxOptionalNumber(workletStableLaneRetuneCount, readNestedNumber(debugWorklet, ['stableLaneRetuneCount']));
    workletBridgeSessionId = maxOptionalNumber(workletBridgeSessionId, readNestedNumber(debugWorklet, ['bridgeSessionId']));
    workletProcessorGeneration = maxOptionalNumber(workletProcessorGeneration, readNestedNumber(debugWorklet, ['processorGeneration']));
    workletStableLaneBufferAcked = workletStableLaneBufferAcked || readNestedBoolean(debugWorklet, ['stableLaneBufferAcked']) === true;
    workletStableLaneBufferRejectedReason = readNestedString(debugWorklet, ['stableLaneBufferRejectedReason']) ?? workletStableLaneBufferRejectedReason;
    workletStableLanePlanAcked = workletStableLanePlanAcked || readNestedBoolean(debugWorklet, ['stableLanePlanAcked']) === true;
    workletStableLanePlanRejectedReason = readNestedString(debugWorklet, ['stableLanePlanRejectedReason']) ?? workletStableLanePlanRejectedReason;
    workletStableLaneBufferAckCount = maxOptionalNumber(workletStableLaneBufferAckCount, readNestedNumber(debugWorklet, ['stableLaneBufferAckCount']));
    workletStableLaneBufferRejectCount = maxOptionalNumber(workletStableLaneBufferRejectCount, readNestedNumber(debugWorklet, ['stableLaneBufferRejectCount']));
    workletStableLanePlanAckCount = maxOptionalNumber(workletStableLanePlanAckCount, readNestedNumber(debugWorklet, ['stableLanePlanAckCount']));
    workletStableLanePlanRejectCount = maxOptionalNumber(workletStableLanePlanRejectCount, readNestedNumber(debugWorklet, ['stableLanePlanRejectCount']));
    workletStableLaneLastAcceptedPlanSequence = maxOptionalNumber(workletStableLaneLastAcceptedPlanSequence, readNestedNumber(debugWorklet, ['stableLaneLastAcceptedPlanSequence']));
    workletStableLanePlanTransportPostedCount = maxOptionalNumber(workletStableLanePlanTransportPostedCount, readNestedNumber(debugWorklet, ['stableLanePlanTransportPostedCount']));
    workletStableLanePlanTransportPendingCount = maxOptionalNumber(workletStableLanePlanTransportPendingCount, readNestedNumber(debugWorklet, ['stableLanePlanTransportPendingCount']));
    workletStableLanePlanTransportDroppedSupersededCount = maxOptionalNumber(workletStableLanePlanTransportDroppedSupersededCount, readNestedNumber(debugWorklet, ['stableLanePlanTransportDroppedSupersededCount']));
    workletStableLanePlanTransportForcedPostCount = maxOptionalNumber(workletStableLanePlanTransportForcedPostCount, readNestedNumber(debugWorklet, ['stableLanePlanTransportForcedPostCount']));
    workletStableLanePlanTransportAckCount = maxOptionalNumber(workletStableLanePlanTransportAckCount, readNestedNumber(debugWorklet, ['stableLanePlanTransportAckCount']));
    workletStableLanePlanTransportDroppedStaleCount = maxOptionalNumber(workletStableLanePlanTransportDroppedStaleCount, readNestedNumber(debugWorklet, ['stableLanePlanTransportDroppedStaleCount']));
    workletStableLanePlanTransportPendingSequence = readNestedNumber(debugWorklet, ['stableLanePlanTransportPendingSequence']) ?? workletStableLanePlanTransportPendingSequence;
    workletStableLanePlanTransportInFlightSequence = readNestedNumber(debugWorklet, ['stableLanePlanTransportInFlightSequence']) ?? workletStableLanePlanTransportInFlightSequence;
    workletStableLanePlanTransportBackendKind = readNestedString(debugWorklet, ['stableLanePlanTransportBackendKind']) ?? workletStableLanePlanTransportBackendKind;
    workletStableLanePlanTransportSabRingbufferReserved = workletStableLanePlanTransportSabRingbufferReserved || readNestedBoolean(debugWorklet, ['stableLanePlanTransportSabRingbufferReserved']) === true;
    workletStableLanePlanTransportBackendFallbackReason = readNestedString(debugWorklet, ['stableLanePlanTransportBackendFallbackReason']) ?? workletStableLanePlanTransportBackendFallbackReason;
    workletStableLaneSabTransportReadiness = readNestedString(debugWorklet, ['stableLaneSabTransportReadiness']) ?? workletStableLaneSabTransportReadiness;
    workletStableLaneSabTransportReady = workletStableLaneSabTransportReady || readNestedBoolean(debugWorklet, ['stableLaneSabTransportReady']) === true;
    workletStableLaneSabTransportReadinessReason = readNestedString(debugWorklet, ['stableLaneSabTransportReadinessReason']) ?? workletStableLaneSabTransportReadinessReason;
    workletStableLaneSabTransportSharedArrayBufferAvailable = workletStableLaneSabTransportSharedArrayBufferAvailable || readNestedBoolean(debugWorklet, ['stableLaneSabTransportSharedArrayBufferAvailable']) === true;
    workletStableLaneSabTransportCrossOriginIsolated = workletStableLaneSabTransportCrossOriginIsolated || readNestedBoolean(debugWorklet, ['stableLaneSabTransportCrossOriginIsolated']) === true;
    workletStableLaneSabTransportSecureContext = workletStableLaneSabTransportSecureContext || readNestedBoolean(debugWorklet, ['stableLaneSabTransportSecureContext']) === true;
    workletStableLaneSabTransportSingleFileHtmlLikelyBlocked = workletStableLaneSabTransportSingleFileHtmlLikelyBlocked || readNestedBoolean(debugWorklet, ['stableLaneSabTransportSingleFileHtmlLikelyBlocked']) === true;
    workletStableLaneSabTransportRequiredCoop = readNestedString(debugWorklet, ['stableLaneSabTransportRequiredCoop']) ?? workletStableLaneSabTransportRequiredCoop;
    workletStableLaneSabTransportRequiredCoep = readNestedString(debugWorklet, ['stableLaneSabTransportRequiredCoep']) ?? workletStableLaneSabTransportRequiredCoep;
    workletStableLaneBufferGeneration = readNestedNumber(debugWorklet, ['stableLaneBufferGeneration']) ?? workletStableLaneBufferGeneration;
    workletDirectPilotAcceptedEventTotal = maxOptionalNumber(workletDirectPilotAcceptedEventTotal, readNestedNumber(debugWorklet, ['directPilotAcceptedEventTotal']));
    workletGranularPilotAcceptedWindowTotal = maxOptionalNumber(workletGranularPilotAcceptedWindowTotal, readNestedNumber(debugWorklet, ['granularPilotAcceptedWindowTotal']));
    workletBufferTransferCopiedByteLengthTotal = maxOptionalNumber(workletBufferTransferCopiedByteLengthTotal, readNestedNumber(debugWorklet, ['bufferTransferCopiedByteLengthTotal']));
    granularAcceptedWindows = maxOptionalNumber(granularAcceptedWindows, readNestedNumber(debugWorklet, ['lastGranularPilotAcceptedWindowCount']));
    bufferCopiedBytes = maxOptionalNumber(bufferCopiedBytes, readNestedNumber(debugWorklet, ['lastBufferTransferCopiedByteLength']));
    if (readNestedBoolean(debugWorklet, ['lastGranularPilotBufferAvailable']) === true) bufferAvailable = true;
  }

  const window100 = args.windows.find((entry) => entry.windowMs === 100);
  const maxEventsPer16Ms = window16?.maxEvents ?? 0;
  const maxEventsPer50Ms = window50?.maxEvents ?? 0;
  const maxRootFollowEventsPer16Ms = window16?.maxRootFollowEvents ?? 0;
  const maxParticleEventsPer16Ms = window16?.maxParticleEvents ?? 0;
  const maxWaveStarterEventsPer16Ms = window16?.maxWaveStarterEvents ?? 0;
  const maxQuantizedTrafficEventsPer16Ms = window16?.maxQuantizedTrafficEvents ?? 0;
  const maxQuantizedTrafficEventsPer50Ms = window50?.maxQuantizedTrafficEvents ?? 0;
  const maxQuantizedTrafficEventsPer100Ms = window100?.maxQuantizedTrafficEvents ?? 0;
  const workletThroughputSignal = Boolean(
    workletProcessorAlive
    || workletProcessQuantumCount > 0
    || workletRenderedFrameCount > 0
    || workletActiveRenderQuantumCount > 0
    || workletDirectRenderedFrameCount > 0
    || workletGranularRenderedFrameCount > 0
    || workletStableLaneRenderedFrameCount > 0
    || workletStableLaneActiveRenderQuantumCount > 0
  );
  if (legacyReliefGate === 'no-relief' && stableLaneBlendEvents > 0) {
    if (stableLaneReliefReady) legacyReliefGate = 'stable-lane-sustained-relief';
    else if (stableLaneProven || stableLaneWarmupReason) legacyReliefGate = 'stable-lane-warmup';
    else if (stableLaneFallbackReason) legacyReliefGate = 'stable-lane-fallback';
  }

  const weights = browserProfile.weights;
  const rawRisk = Math.round(
    maxEventsPer16Ms * weights.events16
    + maxEventsPer50Ms * weights.events50
    + maxRootFollowEventsPer16Ms * weights.rootFollow16
    + maxParticleEventsPer16Ms * weights.particle16
    + maxWaveStarterEventsPer16Ms * weights.waveStarter16
    + primaryCandidateMuteEvents * weights.primaryMute
    + rejectProxyCount * 8,
  );
  const workletReadyBonus = (workletPilotHealth === 'pilot-ready' || workletStatus === 'ready') ? Math.abs(weights.workletReadyBonus) : 0;
  const restrictionCostScore = Math.max(0, primaryCandidateMuteEvents * 6 + dropProxyCount * 5 - smoothingProxyCount * 2);
  const musicalPreservationScore = Math.max(0, Math.round(
    100
    + Math.min(24, maxRootFollowEventsPer16Ms * 2)
    + Math.min(18, maxParticleEventsPer16Ms)
    + Math.min(14, maxWaveStarterEventsPer16Ms)
    + smoothingProxyCount * 2
    - restrictionCostScore * browserProfile.weights.preservationPenalty / 7,
  ));
  const robustnessScore = Math.max(0, Math.round(100 - rawRisk / 4 + workletReadyBonus - rejectProxyCount * 3));
  const burstRiskScore = Math.max(0, rawRisk - workletReadyBonus + restrictionCostScore);
  const browserOptimizedReadout = burstRiskScore >= browserProfile.targetRiskBand.criticalMin
    ? 'critical'
    : burstRiskScore > browserProfile.targetRiskBand.playableMax
      ? 'playable'
      : 'calm';
  const rejectsPerSecondProxy = args.windowMs > 0 ? Number((rejectProxyCount / (args.windowMs / 1000)).toFixed(3)) : 0;
  const smoothingBeforeDropProxy = dropProxyCount > 0 ? Number((smoothingProxyCount / dropProxyCount).toFixed(2)) : smoothingProxyCount;
  const workletStableLaneLastFrameAdvanceAgeMs = typeof workletStableLaneLastFrameAdvanceAtMs === 'number'
    ? Math.max(0, Math.round(nowPerfMs() - workletStableLaneLastFrameAdvanceAtMs))
    : null;
  const workletStableLaneFrameAdvanceFresh = typeof workletStableLaneLastFrameAdvanceAgeMs === 'number'
    && workletStableLaneLastFrameAdvanceAgeMs <= 450
    && workletStableLaneRenderedFrameDelta > 0;

  return {
    version: 2,
    scenarioTag: scenario.id === 'manual-unlabeled' ? 'manual-recorder' : 'stress-harness',
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    browserProfile,
    sampleWindowMs: args.windowMs,
    dominantSubsystem: inferDominantSubsystem(args.bySubsystem),
    rootFollowVoiceEngineMode,
    workletPilotHealth,
    workletStatus,
    workletBridgeEvents,
    primaryCandidateMuteEvents,
    stableLaneReliefEvents,
    stableLaneBlendEvents,
    legacyReliefGate,
    stableLaneProven,
    stableLaneReliefReady,
    stableLaneWarmupReason,
    stableLaneFallbackReason,
    stableLaneLegacyBlend,
    stableLaneBlend,
    directPilotPostedEvents,
    granularAcceptedWindows,
    bufferCopiedBytes,
    bufferAvailable,
    maxQuantizedTrafficEventsPer16Ms,
    maxQuantizedTrafficEventsPer50Ms,
    maxQuantizedTrafficEventsPer100Ms,
    workletProcessorAlive,
    workletProcessorErrorCount,
    workletProcessQuantumCount,
    workletRenderedFrameCount,
    workletRenderedSampleCount,
    workletActiveRenderQuantumCount,
    workletDirectRenderedFrameCount,
    workletGranularRenderedFrameCount,
    workletStableLaneRenderedFrameCount,
    workletStableLaneRenderedFrameDelta,
    workletStableLaneActiveRenderQuantumCount,
    workletStableLaneFrameAdvanceFresh,
    workletStableLaneLastFrameAdvanceAgeMs,
    workletStableLaneHoldQuantumCount,
    workletStableLaneCrossfadeFrameCount,
    workletStableLaneGainRampFrameCount,
    workletStableLanePlanCount,
    workletStableLaneRetuneCount,
    workletBridgeSessionId,
    workletProcessorGeneration,
    workletStableLaneBufferAcked,
    workletStableLaneBufferRejectedReason,
    workletStableLanePlanAcked,
    workletStableLanePlanRejectedReason,
    workletStableLaneBufferAckCount,
    workletStableLaneBufferRejectCount,
    workletStableLanePlanAckCount,
    workletStableLanePlanRejectCount,
    workletStableLaneLastAcceptedPlanSequence,
    workletStableLanePlanTransportPostedCount,
    workletStableLanePlanTransportPendingCount,
    workletStableLanePlanTransportDroppedSupersededCount,
    workletStableLanePlanTransportForcedPostCount,
    workletStableLanePlanTransportAckCount,
    workletStableLanePlanTransportPendingSequence,
    workletStableLanePlanTransportInFlightSequence,
    workletStableLanePlanTransportDroppedStaleCount,
    workletStableLanePlanTransportBackendKind,
    workletStableLanePlanTransportSabRingbufferReserved,
    workletStableLanePlanTransportBackendFallbackReason,
    workletStableLaneSabTransportReadiness,
    workletStableLaneSabTransportReady,
    workletStableLaneSabTransportReadinessReason,
    workletStableLaneSabTransportSharedArrayBufferAvailable,
    workletStableLaneSabTransportCrossOriginIsolated,
    workletStableLaneSabTransportSecureContext,
    workletStableLaneSabTransportSingleFileHtmlLikelyBlocked,
    workletStableLaneSabTransportRequiredCoop,
    workletStableLaneSabTransportRequiredCoep,
    workletStableLaneBufferGeneration,
    workletDirectPilotAcceptedEventTotal,
    workletGranularPilotAcceptedWindowTotal,
    workletBufferTransferCopiedByteLengthTotal,
    workletThroughputSignal,
    burstRiskScore,
    robustnessScore,
    musicalPreservationScore,
    restrictionCostScore,
    browserOptimizedReadout,
    rejectsPerSecondProxy,
    smoothingBeforeDropProxy,
    maxEventsPer16Ms,
    maxEventsPer50Ms,
    maxRootFollowEventsPer16Ms,
    maxParticleEventsPer16Ms,
    maxWaveStarterEventsPer16Ms,
    note: 'Stress-Vergleichszeile für Legacy/Pilot/Primary-Candidate-Läufe; bewertet Robustheit und musikalischen Erhalt getrennt. Niedrige Bursts sind nur dann gut, wenn sie nicht durch grobe Restriktion erkauft werden.',
  };
}

export function snapshotAudioTrafficForensics(
  state: AudioTrafficForensicsState | null | undefined,
  windowMs = 1000,
  options: { scenarioId?: XensonarBurstStressScenarioId | string | null } = {},
): AudioTrafficForensicsSnapshot {
  const safeState = state ?? createEmptyAudioTrafficForensicsState();
  const perfNowMs = nowPerfMs();
  const recentEvents = safeState.recentEvents.filter((entry) => perfNowMs - entry.perfNowMs <= windowMs);
  const bySubsystem: Partial<Record<AudioTrafficSubsystem, number>> = {};
  const byKind: Partial<Record<AudioTrafficEventKind, number>> = {};
  for (const entry of recentEvents) {
    increment(bySubsystem, entry.subsystem);
    increment(byKind, entry.kind);
  }
  const rootFollowEvents = recentEvents.filter((entry) => entry.subsystem === 'root-follow');
  const countRootKind = (kind: AudioTrafficEventKind) => rootFollowEvents.filter((entry) => entry.kind === kind).length;
  const waveOvertoneArpEvents = recentEvents.filter((entry) => entry.subsystem === 'wave-overtone-arp');
  const countWaveOvertoneArpKind = (kind: AudioTrafficEventKind) => waveOvertoneArpEvents.filter((entry) => entry.kind === kind).length;
  const activeNodesHigh = safeState.rootFollow.activeNodes > 128;
  const cleanupCount = countRootKind('stop-cleanup');
  const renderActivity = countRootKind('render-window') + countRootKind('grain-window') + countRootKind('direct-event-window');
  const duplicateConnectionSuspected = Boolean(
    safeState.rootFollow.gainConnected
    && activeNodesHigh
    && cleanupCount === 0
    && renderActivity <= 1
  );
  const audioPressure = snapshotAudioPressureMap(windowMs);
  const burstWindowSummaries = [16, 50, 100].map((burstWindowMs) => summarizeBurstWindow(recentEvents, burstWindowMs));
  const stressComparison = summarizeAudioStressComparison({
    recentEvents,
    bySubsystem,
    windows: burstWindowSummaries,
    windowMs,
    scenarioId: options.scenarioId,
  });
  return {
    rootFollow: cloneRootFollowTraffic(safeState.rootFollow),
    audioPressure,
    waveOvertoneArp: cloneWaveOvertoneArpTraffic(safeState.waveOvertoneArp ?? EMPTY_WAVE_OVERTONE_ARP_TRAFFIC),
    recent: {
      windowMs,
      total: recentEvents.length,
      bySubsystem,
      byKind,
      rootFollow: {
        schedulerTicks: countRootKind('scheduler-tick'),
        renderWindows: countRootKind('render-window'),
        grainWindows: countRootKind('grain-window'),
        retuneSamples: countRootKind('retune-sample'),
        directEventWindows: countRootKind('direct-event-window'),
        gateOpens: countRootKind('gate-open'),
        gateCloses: countRootKind('gate-close'),
        stopCleanups: countRootKind('stop-cleanup'),
      },
      waveOvertoneArp: {
        enqueues: countWaveOvertoneArpKind('queue-enqueue'),
        flushes: countWaveOvertoneArpKind('queue-flush'),
        admitted: countWaveOvertoneArpKind('play-admitted'),
        failed: countWaveOvertoneArpKind('play-failed'),
        overflowTrims: countWaveOvertoneArpKind('queue-overflow-trim'),
        stopCleanups: countWaveOvertoneArpKind('stop-cleanup'),
      },
    },
    burstWindows: {
      windows: burstWindowSummaries,
      maxEventsPer16Ms: burstWindowSummaries.find((entry) => entry.windowMs === 16)?.maxEvents ?? 0,
      maxRootFollowEventsPer16Ms: burstWindowSummaries.find((entry) => entry.windowMs === 16)?.maxRootFollowEvents ?? 0,
      maxQuantizedTrafficEventsPer16Ms: burstWindowSummaries.find((entry) => entry.windowMs === 16)?.maxQuantizedTrafficEvents ?? 0,
      maxQuantizedTrafficEventsPer50Ms: burstWindowSummaries.find((entry) => entry.windowMs === 50)?.maxQuantizedTrafficEvents ?? 0,
      maxEventsPer50Ms: burstWindowSummaries.find((entry) => entry.windowMs === 50)?.maxEvents ?? 0,
      note: 'Objektive Burst-Fensterzählung für spätere Versionvergleiche; zählt Ereignis-Häufung, nicht automatisch hörbares Knacken.',
    },
    stressComparison,
    duplicateConnectionSuspected,
  };
}
