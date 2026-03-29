export type TransientSource = "particle" | "wave" | "drum" | "other";

export type TransientRuntimeSnapshot = {
  activeVoices: number;
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

export type TransientRuntime = {
  beginEvent: (source: TransientSource, requestedVoices: number, intensity?: number) => TransientEventPlan;
  admitVoice: (plan: TransientEventPlan, prominence?: number) => TransientVoiceHandle | null;
  releaseVoice: (handle: TransientVoiceHandle | null | undefined) => void;
  pickTargets: (targets: Array<AudioNode | null | undefined>, handle: TransientVoiceHandle | null | undefined) => AudioNode[];
  getSnapshot: () => TransientRuntimeSnapshot;
  reset: () => void;
};

type RuntimeOptions = {
  softLimit?: number;
  hardLimit?: number;
  perSourceHard?: Partial<Record<TransientSource, number>>;
};

const DEFAULT_BY_SOURCE: Record<TransientSource, number> = {
  particle: 30,
  wave: 24,
  drum: 18,
  other: 16,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const createTransientRuntime = (options: RuntimeOptions = {}): TransientRuntime => {
  const softLimit = options.softLimit ?? 56;
  const hardLimit = options.hardLimit ?? 88;
  const perSourceHard: Record<TransientSource, number> = {
    ...DEFAULT_BY_SOURCE,
    ...(options.perSourceHard ?? {}),
  };

  let nextId = 1;
  let activeVoices = 0;
  let droppedVoices = 0;
  let reducedEvents = 0;
  let gatedSends = 0;
  const bySource: Record<TransientSource, number> = {
    particle: 0,
    wave: 0,
    drum: 0,
    other: 0,
  };

  const getLoad = () => clamp(activeVoices / Math.max(1, hardLimit), 0, 1.5);

  const beginEvent = (source: TransientSource, requestedVoices: number, intensity = 1): TransientEventPlan => {
    const normalizedIntensity = clamp(intensity, 0.2, 2.5);
    const load = getLoad();
    const sourceLoad = bySource[source] / Math.max(1, perSourceHard[source]);
    const globalPressure = activeVoices >= softLimit ? clamp((activeVoices - softLimit) / Math.max(1, hardLimit - softLimit), 0, 1) : 0;
    const pressure = Math.max(load, globalPressure, sourceLoad * 0.92);

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
    if (reduced) reducedEvents += 1;

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

  const admitVoice = (plan: TransientEventPlan, prominence = 1): TransientVoiceHandle | null => {
    if (activeVoices >= hardLimit) {
      droppedVoices += 1;
      return null;
    }
    if (bySource[plan.source] >= perSourceHard[plan.source]) {
      droppedVoices += 1;
      return null;
    }
    if (plan.admitted >= plan.maxVoices) {
      droppedVoices += 1;
      return null;
    }

    const prominenceThreshold = plan.load >= 0.86 ? 0.72 : plan.load >= 0.66 ? 0.38 : 0.12;
    if (prominence < prominenceThreshold && plan.admitted > 0) {
      droppedVoices += 1;
      return null;
    }

    const handle: TransientVoiceHandle = {
      id: nextId += 1,
      source: plan.source,
      prominence,
      plan,
      released: false,
    };
    plan.admitted += 1;
    activeVoices += 1;
    bySource[plan.source] += 1;
    return handle;
  };

  const releaseVoice = (handle: TransientVoiceHandle | null | undefined) => {
    if (!handle || handle.released) return;
    handle.released = true;
    activeVoices = Math.max(0, activeVoices - 1);
    bySource[handle.source] = Math.max(0, bySource[handle.source] - 1);
  };

  const pickTargets = (targets: Array<AudioNode | null | undefined>, handle: TransientVoiceHandle | null | undefined) => {
    const valid = targets.filter(Boolean) as AudioNode[];
    if (!handle) return [];
    if (valid.length === 0) return valid;
    let sendLimit = handle.plan.sendLimit;
    if (handle.prominence < 0.45) sendLimit = Math.min(sendLimit, 1);
    else if (handle.prominence < 0.7) sendLimit = Math.min(sendLimit, 2);
    if (sendLimit < valid.length) gatedSends += Math.max(0, valid.length - sendLimit);
    return valid.slice(0, Math.max(0, sendLimit));
  };

  const getSnapshot = (): TransientRuntimeSnapshot => ({
    activeVoices,
    hardLimit,
    load: getLoad(),
    droppedVoices,
    reducedEvents,
    gatedSends,
    bySource: { ...bySource },
  });

  const reset = () => {
    activeVoices = 0;
    droppedVoices = 0;
    reducedEvents = 0;
    gatedSends = 0;
    bySource.particle = 0;
    bySource.wave = 0;
    bySource.drum = 0;
    bySource.other = 0;
  };

  return { beginEvent, admitVoice, releaseVoice, pickTargets, getSnapshot, reset };
};
