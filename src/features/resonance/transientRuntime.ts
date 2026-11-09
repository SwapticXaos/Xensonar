import { recordAudioPressureAdaptiveAction } from '../../core/audio/audioPressureMap';
export type TransientSource = "particle" | "wave" | "drum" | "other";

export type TransientRuntimeSnapshot = {
  /** Effective policy occupancy: executing handles + retained post-reject reservations. */
  activeVoices: number;
  /** Admitted handles that still represent execution ownership. */
  executionHandles: number;
  /** Post-admission rejects retaining policy occupancy until callback delivery. */
  policyReservations: number;
  /** Delayed release callbacks currently outstanding. */
  releaseTimers: number;
  hardLimit: number;
  load: number;
  droppedVoices: number;
  reducedEvents: number;
  gatedSends: number;
  bySource: Record<TransientSource, number>;
};

export type TransientEventPlan = {
  source: TransientSource;
  intensity: number;
  requestedVoices: number;
  maxVoices: number;
  sendLimit: number;
  bodyScale: number;
  envelopeScale: number;
  gainScale: number;
  load: number;
  admitted: number;
  reduced: boolean;
};

export type TransientVoiceHandle = {
  id: number;
  source: TransientSource;
  prominence: number;
  plan: TransientEventPlan;
  released: boolean;
};

type PolicyOccupancyState = "execution-owned" | "release-pending" | "rejected-reservation" | "released";

type PolicyOccupancy = {
  source: TransientSource;
  generation: number;
  /** The admission commit remains effective until the callback-delivery release completes. */
  counted: boolean;
  /** Distinguishes execution ownership from policy-only retained occupancy. */
  state: PolicyOccupancyState;
  minOccupiedUntilMs: number;
  releaseTimer: ReturnType<typeof setTimeout> | null;
};

type ManagedTransientVoiceHandle = TransientVoiceHandle & {
  /** One policy-occupancy record exists for every successful admission commit. */
  occupancy: PolicyOccupancy;
  /** True only while this public handle still represents execution ownership. */
  executionCounted: boolean;
  generation: number;
};

export type TransientRuntime = {
  beginEvent: (source: TransientSource, requestedVoices: number, intensity?: number) => TransientEventPlan;
  canAdmitVoice: (source: TransientSource) => boolean;
  admitVoice: (plan: TransientEventPlan, prominence?: number) => TransientVoiceHandle | null;
  releaseVoice: (handle: TransientVoiceHandle | null | undefined) => void;
  /**
   * Transfer a post-admission reject out of execution ownership while preserving
   * the existing callback-delivery-based minimum occupancy semantics.
   */
  retainRejectedAdmission: (handle: TransientVoiceHandle | null | undefined) => void;
  pickTargets: (targets: Array<AudioNode | null | undefined>, handle: TransientVoiceHandle | null | undefined) => AudioNode[];
  getSnapshot: () => TransientRuntimeSnapshot;
  reset: () => void;
};

export type TransientPlaybackLease = {
  gainScale: number;
  envelopeScale: number;
  auxTargets: AudioNode[];
  release: () => void;
};

export function acquireTransientPlaybackLease(
  runtime: Pick<TransientRuntime, "admitVoice" | "pickTargets" | "releaseVoice">,
  plan: TransientEventPlan,
  prominence: number,
  targets: Array<AudioNode | null | undefined> = [],
): TransientPlaybackLease | null {
  const ticket = runtime.admitVoice(plan, prominence);
  if (!ticket) return null;
  try {
    return {
      gainScale: ticket.plan.gainScale,
      envelopeScale: ticket.plan.envelopeScale,
      auxTargets: runtime.pickTargets(targets, ticket),
      release: () => runtime.releaseVoice(ticket),
    };
  } catch (error) {
    runtime.releaseVoice(ticket);
    throw error;
  }
}

type RuntimeOptions = {
  softLimit?: number;
  hardLimit?: number;
  perSourceHard?: Partial<Record<TransientSource, number>>;
  getExternalPressureBias?: () => number;
  /**
   * Sources marked here keep the transient counters/limits, but do not write
   * pressure/adaptive telemetry from the audio hot path. Wellenstarter uses
   * this for the 90.61 direct-hit contract: door-keeper first, no reports.
   */
  silentHotPathSources?: Partial<Record<TransientSource, boolean>>;
  /**
   * Keeps admitted voices counted for at least this many milliseconds per source.
   * This turns effective policy occupancy into a small quasi-simultaneity window:
   * admitted Wellenstarter attacks occupy a slot briefly even if their node
   * lifecycle ends early. Work rejected after admission can remain policy-counted
   * until the same delayed release callback that the legacy path used.
   */
  sourceMinOccupancyMs?: Partial<Record<TransientSource, number>>;
};

const DEFAULT_BY_SOURCE: Record<TransientSource, number> = {
  particle: 30,
  wave: 22,
  drum: 18,
  other: 14,
};

const DEFAULT_SOURCE_MIN_OCCUPANCY_MS: Record<TransientSource, number> = {
  particle: 0,
  wave: 0,
  drum: 0,
  other: 0,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const readRuntimeNowMs = () => (
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
);

export const createTransientRuntime = (options: RuntimeOptions = {}): TransientRuntime => {
  const softLimit = options.softLimit ?? 52;
  const hardLimit = options.hardLimit ?? 84;
  const perSourceHard: Record<TransientSource, number> = {
    ...DEFAULT_BY_SOURCE,
    ...(options.perSourceHard ?? {}),
  };
  const sourceMinOccupancyMs: Record<TransientSource, number> = {
    ...DEFAULT_SOURCE_MIN_OCCUPANCY_MS,
    ...(options.sourceMinOccupancyMs ?? {}),
  };

  let nextId = 1;
  let generation = 1;
  const pendingReleaseTimers = new Set<ReturnType<typeof setTimeout>>();
  const rejectedPolicyReservations = new Set<PolicyOccupancy>();
  let effectivePolicyOccupancy = 0;
  let executionHandles = 0;
  let droppedVoices = 0;
  let reducedEvents = 0;
  let gatedSends = 0;
  const bySource: Record<TransientSource, number> = {
    particle: 0,
    wave: 0,
    drum: 0,
    other: 0,
  };

  const getLoad = () => clamp(effectivePolicyOccupancy / Math.max(1, hardLimit), 0, 1.5);
  const isSilentHotPathSource = (source: TransientSource): boolean => options.silentHotPathSources?.[source] === true;
  const recordAdaptiveForSource = (source: TransientSource, action: Parameters<typeof recordAudioPressureAdaptiveAction>[0], count = 1) => {
    if (isSilentHotPathSource(source)) return;
    recordAudioPressureAdaptiveAction(action, count);
  };

  const beginEvent = (source: TransientSource, requestedVoices: number, intensity = 1): TransientEventPlan => {
    const normalizedIntensity = clamp(intensity, 0.2, 2.5);
    const load = getLoad();
    const sourceLoad = bySource[source] / Math.max(1, perSourceHard[source]);
    const globalPressure = effectivePolicyOccupancy >= softLimit
      ? clamp((effectivePolicyOccupancy - softLimit) / Math.max(1, hardLimit - softLimit), 0, 1)
      : 0;
    const externalPressureBias = isSilentHotPathSource(source)
      ? 0
      : clamp(options.getExternalPressureBias?.() ?? 0, 0, 1);
    const pressure = Math.max(load, globalPressure, sourceLoad * 0.92, externalPressureBias * 0.9);

    let maxVoices = Math.max(1, Math.round(requestedVoices));
    if (pressure >= 0.92) maxVoices = 1;
    else if (pressure >= 0.78) maxVoices = Math.min(maxVoices, 2);
    else if (pressure >= 0.62) maxVoices = Math.min(maxVoices, 3);

    if (normalizedIntensity < 0.42) {
      maxVoices = Math.min(maxVoices, Math.max(1, Math.round(maxVoices * 0.8)));
    }

    let sendLimit = 4;
    if (pressure >= 0.88) sendLimit = 0;
    else if (pressure >= 0.72) sendLimit = 1;
    else if (pressure >= 0.54) sendLimit = 2;
    else if (pressure >= 0.36) sendLimit = 3;

    const bodyScale = pressure >= 0.9 ? 0.18 : pressure >= 0.74 ? 0.46 : pressure >= 0.56 ? 0.72 : 1;
    const envelopeScale = 1 + pressure * 0.9;
    const gainScale = pressure >= 0.8 ? 0.88 : pressure >= 0.62 ? 0.94 : 1;
    const reduced = maxVoices < requestedVoices || sendLimit < 4 || bodyScale < 0.999;
    if (reduced) {
      reducedEvents += 1;
      recordAdaptiveForSource(source, 'transient-reduced-event', 1);
    }

    return {
      source,
      intensity: normalizedIntensity,
      requestedVoices,
      maxVoices,
      sendLimit,
      bodyScale,
      envelopeScale,
      gainScale,
      load: pressure,
      admitted: 0,
      reduced,
    };
  };

  const canAdmitVoice = (source: TransientSource): boolean => (
    effectivePolicyOccupancy < hardLimit && bySource[source] < perSourceHard[source]
  );

  const admitVoice = (plan: TransientEventPlan, prominence = 1): TransientVoiceHandle | null => {
    if (effectivePolicyOccupancy >= hardLimit) {
      droppedVoices += 1;
      recordAdaptiveForSource(plan.source, 'transient-dropped-voice', 1);
      return null;
    }
    if (bySource[plan.source] >= perSourceHard[plan.source]) {
      droppedVoices += 1;
      recordAdaptiveForSource(plan.source, 'transient-dropped-voice', 1);
      return null;
    }
    if (plan.admitted >= plan.maxVoices) {
      droppedVoices += 1;
      recordAdaptiveForSource(plan.source, 'transient-dropped-voice', 1);
      return null;
    }

    const prominenceThreshold = plan.load >= 0.86 ? 0.72 : plan.load >= 0.66 ? 0.38 : 0.12;
    if (prominence < prominenceThreshold && plan.admitted > 0) {
      droppedVoices += 1;
      recordAdaptiveForSource(plan.source, 'transient-dropped-voice', 1);
      return null;
    }

    const occupancy: PolicyOccupancy = {
      source: plan.source,
      generation,
      counted: true,
      state: "execution-owned",
      minOccupiedUntilMs: readRuntimeNowMs() + Math.max(0, sourceMinOccupancyMs[plan.source]),
      releaseTimer: null,
    };
    const handle: ManagedTransientVoiceHandle = {
      id: nextId += 1,
      source: plan.source,
      prominence,
      plan,
      released: false,
      occupancy,
      executionCounted: true,
      generation,
    };
    plan.admitted += 1;
    effectivePolicyOccupancy += 1;
    executionHandles += 1;
    bySource[plan.source] += 1;
    return handle;
  };

  const relinquishExecutionHandle = (handle: ManagedTransientVoiceHandle) => {
    if (!handle.executionCounted || handle.generation !== generation) return;
    handle.executionCounted = false;
    executionHandles = Math.max(0, executionHandles - 1);
  };

  const detachReleaseTimer = (occupancy: PolicyOccupancy) => {
    if (!occupancy.releaseTimer) return;
    pendingReleaseTimers.delete(occupancy.releaseTimer);
    occupancy.releaseTimer = null;
  };

  const finishPolicyOccupancy = (occupancy: PolicyOccupancy) => {
    if (!occupancy.counted || occupancy.generation !== generation) return;
    occupancy.counted = false;
    detachReleaseTimer(occupancy);
    if (occupancy.state === "rejected-reservation") {
      rejectedPolicyReservations.delete(occupancy);
    }
    occupancy.state = "released";
    effectivePolicyOccupancy = Math.max(0, effectivePolicyOccupancy - 1);
    bySource[occupancy.source] = Math.max(0, bySource[occupancy.source] - 1);
  };

  const schedulePolicyOccupancyRelease = (occupancy: PolicyOccupancy) => {
    if (!occupancy.counted || occupancy.generation !== generation || occupancy.releaseTimer) return;
    const remainingOccupancyMs = occupancy.minOccupiedUntilMs - readRuntimeNowMs();
    if (remainingOccupancyMs <= 0) {
      finishPolicyOccupancy(occupancy);
      return;
    }
    const timer = setTimeout(() => finishPolicyOccupancy(occupancy), Math.ceil(remainingOccupancyMs));
    occupancy.releaseTimer = timer;
    pendingReleaseTimers.add(timer);
  };

  const releaseVoice = (handle: TransientVoiceHandle | null | undefined) => {
    if (!handle || handle.released) return;
    const managed = handle as ManagedTransientVoiceHandle;
    handle.released = true;
    if (managed.generation !== generation) return;
    relinquishExecutionHandle(managed);
    if (managed.occupancy.counted) managed.occupancy.state = "release-pending";
    schedulePolicyOccupancyRelease(managed.occupancy);
  };

  const retainRejectedAdmission = (handle: TransientVoiceHandle | null | undefined) => {
    if (!handle || handle.released) return;
    const managed = handle as ManagedTransientVoiceHandle;
    handle.released = true;
    if (managed.generation !== generation) return;
    relinquishExecutionHandle(managed);

    const occupancy = managed.occupancy;
    if (!occupancy.counted) return;
    // The admission commit remains policy-visible, but no execution handle owns it.
    // Keep legacy callback-delivery release semantics exactly: a stalled callback
    // intentionally keeps this reservation effective beyond its nominal 24 ms floor.
    occupancy.state = "rejected-reservation";
    rejectedPolicyReservations.add(occupancy);
    schedulePolicyOccupancyRelease(occupancy);
  };

  const pickTargets = (targets: Array<AudioNode | null | undefined>, handle: TransientVoiceHandle | null | undefined) => {
    const valid = targets.filter(Boolean) as AudioNode[];
    if (!handle) return [];
    if (valid.length === 0) return valid;
    let sendLimit = handle.plan.sendLimit;
    if (handle.prominence < 0.45) sendLimit = Math.min(sendLimit, 1);
    else if (handle.prominence < 0.7) sendLimit = Math.min(sendLimit, 2);
    if (sendLimit < valid.length) {
      const gated = Math.max(0, valid.length - sendLimit);
      gatedSends += gated;
      recordAdaptiveForSource(handle.source, 'transient-send-gated', gated);
    }
    return valid.slice(0, Math.max(0, sendLimit));
  };

  const getSnapshot = (): TransientRuntimeSnapshot => ({
    activeVoices: effectivePolicyOccupancy,
    executionHandles,
    policyReservations: rejectedPolicyReservations.size,
    releaseTimers: pendingReleaseTimers.size,
    hardLimit,
    load: getLoad(),
    droppedVoices,
    reducedEvents,
    gatedSends,
    bySource: { ...bySource },
  });

  const reset = () => {
    generation += 1;
    pendingReleaseTimers.forEach((timer) => clearTimeout(timer));
    pendingReleaseTimers.clear();
    rejectedPolicyReservations.clear();
    effectivePolicyOccupancy = 0;
    executionHandles = 0;
    droppedVoices = 0;
    reducedEvents = 0;
    gatedSends = 0;
    bySource.particle = 0;
    bySource.wave = 0;
    bySource.drum = 0;
    bySource.other = 0;
  };

  return { beginEvent, canAdmitVoice, admitVoice, releaseVoice, retainRejectedAdmission, pickTargets, getSnapshot, reset };
};
