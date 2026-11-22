/* TS-MOD-04: Logarithmic pitch blend, transient voice admission controller, and 160-ms rate gate,
   brought back from src/runtime/instrument/04_performance_and_output_profiles.js into strict TypeScript.
   Built by tools/ts_module.cjs into __XenTs_voiceAdmission.
   Zone: WARM (performance-room admission & control-rate gating). No audio-thread DSP work. */

export type VoiceAdmissionSource = 'particle' | 'wave' | 'drum' | 'other';
export type VoiceAdmissionMetricKey =
  | 'transient-reduced-event'
  | 'transient-dropped-voice'
  | 'transient-send-gated';

export interface PitchBlendWeights {
  readonly hybridBlend: number;
  readonly weaveBlend: number;
  readonly constellationBlend: number;
  readonly driveAmount: number;
  readonly driveResponse: number;
}

export interface HybridFieldTelemetry {
  readonly dominantFreq: number;
  readonly maxEnergy: number;
  readonly coherence?: number;
  readonly myceliumBallSpeed: number;
}

export interface VoiceAdmissionConfig {
  readonly softLimit?: number;
  readonly hardLimit?: number;
  readonly perSourceHard?: Partial<Record<VoiceAdmissionSource, number>>;
  readonly sourceMinOccupancyMs?: Partial<Record<VoiceAdmissionSource, number>>;
  readonly silentHotPathSources?: Partial<Record<VoiceAdmissionSource, boolean>>;
  readonly getExternalPressureBias?: () => number;
  readonly nowMs?: () => number;
}

export interface VoiceEventPlan {
  readonly source: VoiceAdmissionSource;
  readonly intensity: number;
  readonly requestedVoices: number;
  readonly maxVoices: number;
  readonly sendLimit: number;
  readonly bodyScale: number;
  readonly envelopeScale: number;
  readonly gainScale: number;
  readonly load: number;
  admitted: number;
  readonly reduced: boolean;
}

export interface VoiceOccupancyRecord {
  readonly source: VoiceAdmissionSource;
  readonly generation: number;
  counted: boolean;
  state: 'execution-owned' | 'release-pending' | 'rejected-reservation' | 'released';
  readonly minOccupiedUntilMs: number;
  releaseTimer: ReturnType<typeof setTimeout> | null;
}

export interface VoiceAdmissionHandle {
  readonly id: number;
  readonly source: VoiceAdmissionSource;
  readonly prominence: number;
  readonly plan: VoiceEventPlan;
  released: boolean;
  readonly occupancy: VoiceOccupancyRecord;
  executionCounted: boolean;
  readonly generation: number;
}

export interface VoiceAdmissionSnapshot {
  readonly activeVoices: number;
  readonly executionHandles: number;
  readonly policyReservations: number;
  readonly releaseTimers: number;
  readonly hardLimit: number;
  readonly load: number;
  readonly droppedVoices: number;
  readonly reducedEvents: number;
  readonly gatedSends: number;
  readonly bySource: Record<VoiceAdmissionSource, number>;
}

export interface VoiceAdmissionController {
  beginEvent: (source: VoiceAdmissionSource, requestedVoices: number, intensity?: number) => VoiceEventPlan;
  canAdmitVoice: (source: VoiceAdmissionSource) => boolean;
  admitVoice: (plan: VoiceEventPlan, prominence?: number) => VoiceAdmissionHandle | null;
  releaseVoice: (handle: VoiceAdmissionHandle | null | undefined) => void;
  retainRejectedAdmission: (handle: VoiceAdmissionHandle | null | undefined) => void;
  pickTargets: <T>(targets: readonly T[], handle: VoiceAdmissionHandle | null | undefined) => T[];
  pickPreparedTargets: <T>(
    preparedBuckets: readonly (readonly T[])[],
    handle: VoiceAdmissionHandle | null | undefined,
  ) => readonly T[];
  getSnapshot: () => VoiceAdmissionSnapshot;
  reset: () => void;
}

export interface VoiceLease<T> {
  readonly gainScale: number;
  readonly envelopeScale: number;
  readonly auxTargets: T[];
  readonly release: () => void;
}

export interface Rate160State {
  windowStartSec: number;
  totalCount: number;
  particleCount: number;
  residentCount: number;
}

export type Rate160Kind = 'preview' | 'particle' | 'resident' | string;

export interface Rate160Result {
  readonly allowed: boolean;
  readonly volumeScale: number;
}

interface AudioProbeHook {
  enabled?: boolean;
  record: (gate: string, kind: string, outcome: string, nowSec: number, traceId?: unknown) => void;
}

export const DEFAULT_PITCH_BLEND_WEIGHTS: PitchBlendWeights = {
  hybridBlend: 0.64,
  weaveBlend: 0.58,
  constellationBlend: 0.74,
  driveAmount: 0.22,
  driveResponse: 0.68,
};

export function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function blendFreqLog(
  fromHz: number,
  toHz: number,
  blend: number,
  minHz: number,
  maxHz: number,
): number {
  const lo = clampValue(fromHz, minHz, maxHz);
  const hi = clampValue(toHz, minHz, maxHz);
  if (lo <= 0 || !Number.isFinite(lo)) return hi;
  if (hi <= 0 || !Number.isFinite(hi)) return lo;
  return clampValue(lo * Math.pow(hi / lo, clampValue(blend, 0, 1)), minHz, maxHz);
}

export function quantizeClampedFreq(
  freq: number | null | undefined,
  fallback: number,
  quantize: (hz: number) => number,
  minHz: number,
  maxHz: number,
): number {
  return clampValue(quantize(freq ?? fallback), minHz, maxHz);
}

export function deriveFieldTargetFreq(
  baseHz: number,
  field: HybridFieldTelemetry,
  minHz: number,
  maxHz: number,
): number {
  const dominant = field.dominantFreq > 0 ? clampValue(field.dominantFreq, minHz, maxHz) : baseHz;
  const energy = clampValue(field.maxEnergy, 0, 1);
  const coherence = clampValue(field.coherence ?? 0, 0, 1);
  const speed = clampValue(field.myceliumBallSpeed / 12, 0, 1);
  const weight = clampValue(0.16 + energy * 0.26 + coherence * 0.18 + speed * 0.12, 0.14, 0.68);
  return blendFreqLog(baseHz, dominant, weight, minHz, maxHz);
}

export function resolveHybridFieldFreq(
  freq: number | null | undefined,
  fallback: number,
  field: HybridFieldTelemetry,
  quantize: (hz: number) => number,
  minHz: number,
  maxHz: number,
  blend: number,
): number {
  const quantized = quantizeClampedFreq(freq, fallback, quantize, minHz, maxHz);
  const target = deriveFieldTargetFreq(quantized, field, minHz, maxHz);
  return blendFreqLog(quantized, target, blend, minHz, maxHz);
}

export function acquireVoiceLease<T>(
  controller: Pick<VoiceAdmissionController, 'admitVoice' | 'pickTargets' | 'releaseVoice'>,
  plan: VoiceEventPlan,
  prominence: number | undefined,
  candidates: readonly T[] = [],
): VoiceLease<T> | null {
  const handle = controller.admitVoice(plan, prominence);
  if (!handle) return null;
  try {
    return {
      gainScale: handle.plan.gainScale,
      envelopeScale: handle.plan.envelopeScale,
      auxTargets: controller.pickTargets(candidates, handle),
      release: () => controller.releaseVoice(handle),
    };
  } catch (err) {
    controller.releaseVoice(handle);
    throw err;
  }
}

export const DEFAULT_VOICE_SOURCE_HARD_LIMITS: Record<VoiceAdmissionSource, number> = {
  particle: 30,
  wave: 22,
  drum: 18,
  other: 14,
};

export const DEFAULT_VOICE_MIN_OCCUPANCY_MS: Record<VoiceAdmissionSource, number> = {
  particle: 0,
  wave: 0,
  drum: 0,
  other: 0,
};

export const PERFORMANCE_TRACK_KINDS = {
  MATERIAL_TRACK: 'material-track',
  RHYTHM_PATTERN: 'rhythm-pattern',
} as const;

export const DEFAULT_VOICE_ADMISSION_CONFIG = {
  softLimit: 52,
  hardLimit: 84,
  perSourceHard: { particle: 30, wave: 22, drum: 18, other: 14 },
};

export const DEFAULT_VOICE_MIN_OCCUPANCY_OVERRIDE = { wave: 24 };

const defaultNowMs = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

export function createVoiceAdmissionController(
  config: VoiceAdmissionConfig = {},
  onMetric?: (metric: VoiceAdmissionMetricKey, count: number) => void,
): VoiceAdmissionController {
  const softLimit = config.softLimit ?? 52;
  const hardLimit = config.hardLimit ?? 84;
  const perSourceHard: Record<VoiceAdmissionSource, number> = {
    ...DEFAULT_VOICE_SOURCE_HARD_LIMITS,
    ...(config.perSourceHard ?? {}),
  };
  const minOccupancyMs: Record<VoiceAdmissionSource, number> = {
    ...DEFAULT_VOICE_MIN_OCCUPANCY_MS,
    ...(config.sourceMinOccupancyMs ?? {}),
  };
  const nowMs = config.nowMs ?? defaultNowMs;

  let nextId = 1;
  let generation = 1;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const rejectedReservations = new Set<VoiceOccupancyRecord>();
  let activeVoices = 0;
  let executionHandles = 0;
  let droppedVoices = 0;
  let reducedEvents = 0;
  let gatedSends = 0;
  const bySource: Record<VoiceAdmissionSource, number> = {
    particle: 0,
    wave: 0,
    drum: 0,
    other: 0,
  };

  const currentLoad = (): number => clampValue(activeVoices / Math.max(1, hardLimit), 0, 1.5);
  const isSilentSource = (source: VoiceAdmissionSource): boolean =>
    config.silentHotPathSources?.[source] === true;
  const emitMetric = (source: VoiceAdmissionSource, key: VoiceAdmissionMetricKey, count = 1): void => {
    if (!isSilentSource(source) && onMetric) onMetric(key, count);
  };

  const beginEvent = (
    source: VoiceAdmissionSource,
    requestedVoices: number,
    intensity = 1,
  ): VoiceEventPlan => {
    const clampedIntensity = clampValue(intensity, 0.2, 2.5);
    const totalRatio = currentLoad();
    const sourceRatio = bySource[source] / Math.max(1, perSourceHard[source]);
    const softPressure =
      activeVoices >= softLimit
        ? clampValue((activeVoices - softLimit) / Math.max(1, hardLimit - softLimit), 0, 1)
        : 0;
    const externalPressure = isSilentSource(source)
      ? 0
      : clampValue(config.getExternalPressureBias?.() ?? 0, 0, 1);
    const load = Math.max(totalRatio, softPressure, sourceRatio * 0.92, externalPressure * 0.9);

    let maxVoices = Math.max(1, Math.round(requestedVoices));
    if (load >= 0.92) maxVoices = 1;
    else if (load >= 0.78) maxVoices = Math.min(maxVoices, 2);
    else if (load >= 0.62) maxVoices = Math.min(maxVoices, 3);
    if (clampedIntensity < 0.42) {
      maxVoices = Math.min(maxVoices, Math.max(1, Math.round(maxVoices * 0.8)));
    }

    let sendLimit = 4;
    if (load >= 0.88) sendLimit = 0;
    else if (load >= 0.72) sendLimit = 1;
    else if (load >= 0.54) sendLimit = 2;
    else if (load >= 0.36) sendLimit = 3;

    const bodyScale = load >= 0.9 ? 0.18 : load >= 0.74 ? 0.46 : load >= 0.56 ? 0.72 : 1;
    const envelopeScale = 1 + load * 0.9;
    const gainScale = load >= 0.8 ? 0.88 : load >= 0.62 ? 0.94 : 1;
    const reduced = maxVoices < requestedVoices || sendLimit < 4 || bodyScale < 0.999;

    if (reduced) {
      reducedEvents += 1;
      emitMetric(source, 'transient-reduced-event', 1);
    }

    return {
      source,
      intensity: clampedIntensity,
      requestedVoices,
      maxVoices,
      sendLimit,
      bodyScale,
      envelopeScale,
      gainScale,
      load,
      admitted: 0,
      reduced,
    };
  };

  const canAdmitVoice = (source: VoiceAdmissionSource): boolean =>
    activeVoices < hardLimit && bySource[source] < perSourceHard[source];

  const admitVoice = (plan: VoiceEventPlan, prominence = 1): VoiceAdmissionHandle | null => {
    if (
      activeVoices >= hardLimit ||
      bySource[plan.source] >= perSourceHard[plan.source] ||
      plan.admitted >= plan.maxVoices
    ) {
      droppedVoices += 1;
      emitMetric(plan.source, 'transient-dropped-voice', 1);
      return null;
    }
    const minProminence = plan.load >= 0.86 ? 0.72 : plan.load >= 0.66 ? 0.38 : 0.12;
    if (prominence < minProminence && plan.admitted > 0) {
      droppedVoices += 1;
      emitMetric(plan.source, 'transient-dropped-voice', 1);
      return null;
    }
    const occupancy: VoiceOccupancyRecord = {
      source: plan.source,
      generation,
      counted: true,
      state: 'execution-owned',
      minOccupiedUntilMs: nowMs() + Math.max(0, minOccupancyMs[plan.source]),
      releaseTimer: null,
    };
    const handle: VoiceAdmissionHandle = {
      id: (nextId += 1),
      source: plan.source,
      prominence,
      plan,
      released: false,
      occupancy,
      executionCounted: true,
      generation,
    };
    plan.admitted += 1;
    activeVoices += 1;
    executionHandles += 1;
    bySource[plan.source] += 1;
    return handle;
  };

  const decrementExecution = (handle: VoiceAdmissionHandle): void => {
    if (!handle.executionCounted || handle.generation !== generation) return;
    handle.executionCounted = false;
    executionHandles = Math.max(0, executionHandles - 1);
  };

  const clearOccupancyTimer = (occ: VoiceOccupancyRecord): void => {
    if (occ.releaseTimer) {
      timers.delete(occ.releaseTimer);
      occ.releaseTimer = null;
    }
  };

  const finalizeOccupancy = (occ: VoiceOccupancyRecord): void => {
    if (!occ.counted || occ.generation !== generation) return;
    occ.counted = false;
    clearOccupancyTimer(occ);
    if (occ.state === 'rejected-reservation') rejectedReservations.delete(occ);
    occ.state = 'released';
    activeVoices = Math.max(0, activeVoices - 1);
    bySource[occ.source] = Math.max(0, bySource[occ.source] - 1);
  };

  const scheduleOccupancyRelease = (occ: VoiceOccupancyRecord): void => {
    if (!occ.counted || occ.generation !== generation || occ.releaseTimer) return;
    const remainingMs = occ.minOccupiedUntilMs - nowMs();
    if (remainingMs <= 0) {
      finalizeOccupancy(occ);
      return;
    }
    const timer = setTimeout(() => finalizeOccupancy(occ), Math.ceil(remainingMs));
    occ.releaseTimer = timer;
    timers.add(timer);
  };

  const releaseVoice = (handle: VoiceAdmissionHandle | null | undefined): void => {
    if (!handle || handle.released) return;
    handle.released = true;
    if (handle.generation === generation) {
      decrementExecution(handle);
      if (handle.occupancy.counted) handle.occupancy.state = 'release-pending';
      scheduleOccupancyRelease(handle.occupancy);
    }
  };

  const retainRejectedAdmission = (handle: VoiceAdmissionHandle | null | undefined): void => {
    if (!handle || handle.released) return;
    handle.released = true;
    if (handle.generation !== generation) return;
    decrementExecution(handle);
    const occ = handle.occupancy;
    if (occ.counted) {
      occ.state = 'rejected-reservation';
      rejectedReservations.add(occ);
      scheduleOccupancyRelease(occ);
    }
  };

  const allowedSendCount = (handle: VoiceAdmissionHandle): number => {
    let limit = handle.plan.sendLimit;
    if (handle.prominence < 0.45) limit = Math.min(limit, 1);
    else if (handle.prominence < 0.7) limit = Math.min(limit, 2);
    return Math.max(0, limit);
  };

  const recordGatedSends = (handle: VoiceAdmissionHandle, available: number, allowed: number): void => {
    if (allowed >= available) return;
    const dropped = Math.max(0, available - allowed);
    gatedSends += dropped;
    emitMetric(handle.source, 'transient-send-gated', dropped);
  };

  return {
    beginEvent,
    canAdmitVoice,
    admitVoice,
    releaseVoice,
    retainRejectedAdmission,
    pickTargets: <T>(targets: readonly T[], handle: VoiceAdmissionHandle | null | undefined): T[] => {
      const truthy = targets.filter(Boolean);
      if (!handle) return [];
      if (truthy.length === 0) return truthy;
      const limit = allowedSendCount(handle);
      recordGatedSends(handle, truthy.length, limit);
      return truthy.slice(0, limit);
    },
    pickPreparedTargets: <T>(
      preparedBuckets: readonly (readonly T[])[],
      handle: VoiceAdmissionHandle | null | undefined,
    ): readonly T[] => {
      if (!handle) return [];
      const maxIndex = Math.max(0, preparedBuckets.length - 1);
      if (maxIndex === 0) return preparedBuckets[0] ?? [];
      const limit = allowedSendCount(handle);
      recordGatedSends(handle, maxIndex, limit);
      return preparedBuckets[Math.min(maxIndex, limit)] ?? preparedBuckets[0] ?? [];
    },
    getSnapshot: (): VoiceAdmissionSnapshot => ({
      activeVoices,
      executionHandles,
      policyReservations: rejectedReservations.size,
      releaseTimers: timers.size,
      hardLimit,
      load: currentLoad(),
      droppedVoices,
      reducedEvents,
      gatedSends,
      bySource: { ...bySource },
    }),
    reset: (): void => {
      generation += 1;
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      rejectedReservations.clear();
      activeVoices = 0;
      executionHandles = 0;
      droppedVoices = 0;
      reducedEvents = 0;
      gatedSends = 0;
      bySource.particle = 0;
      bySource.wave = 0;
      bySource.drum = 0;
      bySource.other = 0;
    },
  };
}

export const RATE160_WINDOW_SEC = 0.16;
export const RATE160_MAX_TOTAL = 8;
export const RATE160_MAX_PARTICLE = 5;
export const RATE160_MAX_RESIDENT = 3;

export function createRate160State(): Rate160State {
  return { windowStartSec: -1, totalCount: 0, particleCount: 0, residentCount: 0 };
}

export function resetRate160State(state: Rate160State): void {
  state.windowStartSec = -1;
  state.totalCount = 0;
  state.particleCount = 0;
  state.residentCount = 0;
}

export function advanceRate160Window(state: Rate160State, nowSec: number): void {
  if (state.windowStartSec < 0 || nowSec - state.windowStartSec >= RATE160_WINDOW_SEC) {
    state.windowStartSec = nowSec;
    state.totalCount = 0;
    state.particleCount = 0;
    state.residentCount = 0;
  }
}

export function evaluateRate160Gate(
  state: Rate160State,
  nowSec: number,
  kind: Rate160Kind,
  pressure: number,
  traceId?: unknown,
): Rate160Result {
  if (kind === 'preview') return { allowed: true, volumeScale: 1 };
  advanceRate160Window(state, nowSec);
  const nextTotal = state.totalCount + 1;
  const nextParticle = state.particleCount + (kind === 'particle' ? 1 : 0);
  const nextResident = state.residentCount + (kind === 'resident' ? 1 : 0);
  const why =
    nextTotal > RATE160_MAX_TOTAL
      ? 'total-rate160'
      : kind === 'particle' && nextParticle > RATE160_MAX_PARTICLE
        ? 'particle-rate160'
        : kind === 'resident' && nextResident > RATE160_MAX_RESIDENT
          ? 'resident-rate160'
          : null;

  const probe = (globalThis as { __XenAudioProbe?: AudioProbeHook }).__XenAudioProbe;
  if (probe && probe.enabled) {
    probe.record('gate160', kind, why ?? 'admitted', nowSec, traceId);
  }
  if (why) return { allowed: false, volumeScale: 0 };

  state.totalCount = nextTotal;
  state.particleCount = nextParticle;
  state.residentCount = nextResident;

  const occupancy = Math.max(
    state.totalCount / RATE160_MAX_TOTAL,
    kind === 'particle'
      ? state.particleCount / RATE160_MAX_PARTICLE
      : state.residentCount / RATE160_MAX_RESIDENT,
  );
  const rateScale = clampValue(1 - Math.max(0, occupancy - 0.45) * 0.8, 0.42, 1);
  const pressureScale = clampValue(1 - Math.max(0, pressure - 0.22) * 0.7, 0.6, 1);
  return { allowed: true, volumeScale: rateScale * pressureScale };
}
