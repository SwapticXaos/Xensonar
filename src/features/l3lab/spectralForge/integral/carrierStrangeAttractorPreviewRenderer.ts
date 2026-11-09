// Xensonar 3.2.91.7.5.99
// Strange Attractor · Schwarmkörper — host preview renderer.
//
// This is the first audible layer for the Carrier plan from 5.98. It renders a
// bounded synthetic preview buffer inside the Spectral Forge/Carrier context.
// It is not a Melodic Loop export, not a Materialschmiede import path, and not
// a game/iframe capture bridge.

import type {
  StrangeAttractorCarrierPlan,
  StrangeAttractoroughnessCurvePoint,
  StrangeAttractorEffectCurvePoint,
  StrangeAttractorFilteroughnessCurvePoint,
  StrangeAttractorHzCurvePoint,
  StrangeAttractorMotionCurvePoint,
  StrangeAttractorSwarmEvent,
  StrangeAttractorSwarmFamily,
} from './carrierStrangeAttractorTypes';

export const CARRIER_STRANGE_ATTRACTOR_PREVIEW_RENDERER_VERSION =
  'carrier-strange-attractor-schwarmkoerper-preview-renderer-3.2.91.7.5.99' as const;

const DEFAULT_SAMPLE_RATE = 44100;
const DEFAULT_MAX_PREVIEW_SEC = 10;
const TWO_PI = Math.PI * 2;
const EPSILON = 1e-9;

export type StrangeAttractorPreviewRenderOptions = {
  readonly sampleRate?: number;
  readonly previewGain?: number;
  readonly maxPreviewSec?: number;
};

export type StrangeAttractorStereoSamples = {
  readonly left: Float32Array;
  readonly right: Float32Array;
  readonly sampleRate: number;
  readonly durationSec: number;
  readonly stats: StrangeAttractorPreviewRenderStats;
};

export type StrangeAttractorPreviewRenderStats = {
  readonly version: typeof CARRIER_STRANGE_ATTRACTOR_PREVIEW_RENDERER_VERSION;
  readonly renderedDurationSec: number;
  readonly sampleRate: number;
  readonly renderedSampleCount: number;
  readonly renderedEventCount: number;
  readonly clippedEventCount: number;
  readonly peakBeforeNormalize: number;
  readonly peakAfterNormalize: number;
  readonly driftEventCount: number;
  readonly orbitEventCount: number;
  readonly sprayEventCount: number;
  readonly clusterEventCount: number;
};

export function renderStrangeAttractorCarrierPlanToAudioBuffer(
  context: BaseAudioContext,
  plan: StrangeAttractorCarrierPlan,
  options: StrangeAttractorPreviewRenderOptions = {},
): AudioBuffer {
  const rendered = renderStrangeAttractorCarrierPlanToStereoSamples(plan, {
    sampleRate: context.sampleRate || options.sampleRate || DEFAULT_SAMPLE_RATE,
    previewGain: options.previewGain,
    maxPreviewSec: options.maxPreviewSec,
  });
  const buffer = context.createBuffer(2, rendered.left.length, rendered.sampleRate);
  buffer.getChannelData(0).set(rendered.left);
  buffer.getChannelData(1).set(rendered.right);
  return buffer;
}


export function createStrangeAttractorPreviewAudioBufferFromStereoSamples(
  rendered: StrangeAttractorStereoSamples,
): AudioBuffer {
  const buffer = new AudioBuffer({
    numberOfChannels: 2,
    length: rendered.left.length,
    sampleRate: rendered.sampleRate,
  });
  buffer.getChannelData(0).set(rendered.left);
  buffer.getChannelData(1).set(rendered.right);
  return buffer;
}

export function renderStrangeAttractorCarrierPlanToStereoSamples(
  plan: StrangeAttractorCarrierPlan,
  options: StrangeAttractorPreviewRenderOptions = {},
): StrangeAttractorStereoSamples {
  const sampleRate = clampInteger(options.sampleRate ?? DEFAULT_SAMPLE_RATE, 8000, 96000);
  const maxPreviewSec = clamp(options.maxPreviewSec ?? DEFAULT_MAX_PREVIEW_SEC, 0.5, 30);
  const durationSec = clamp(Math.min(plan.durationSec, maxPreviewSec), 0.25, maxPreviewSec);
  const sampleCount = Math.max(1, Math.round(durationSec * sampleRate));
  const left = new Float32Array(sampleCount);
  const right = new Float32Array(sampleCount);
  const planDuration = Math.max(0.25, plan.durationSec || durationSec);
  const gain = clamp(options.previewGain ?? 0.78, 0.05, 1);

  renderDroneBody(left, right, sampleRate, durationSec, planDuration, plan);
  const eventStats = renderSwarmEvents(left, right, sampleRate, durationSec, plan);
  applyStrangeSpace(left, right, sampleRate, plan, gain);
  const peakBeforeNormalize = measurePeak(left, right);
  const normalizeGain = peakBeforeNormalize > 0.92 ? 0.92 / peakBeforeNormalize : 1;
  let peakAfterNormalize = 0;
  for (let i = 0; i < sampleCount; i += 1) {
    left[i] = softClip(left[i] * normalizeGain);
    right[i] = softClip(right[i] * normalizeGain);
    peakAfterNormalize = Math.max(peakAfterNormalize, Math.abs(left[i]), Math.abs(right[i]));
  }

  return {
    left,
    right,
    sampleRate,
    durationSec,
    stats: {
      version: CARRIER_STRANGE_ATTRACTOR_PREVIEW_RENDERER_VERSION,
      renderedDurationSec: roundStat(durationSec),
      sampleRate,
      renderedSampleCount: sampleCount,
      renderedEventCount: eventStats.renderedEventCount,
      clippedEventCount: eventStats.clippedEventCount,
      peakBeforeNormalize: roundStat(peakBeforeNormalize),
      peakAfterNormalize: roundStat(peakAfterNormalize),
      driftEventCount: eventStats.familyCounts.drift,
      orbitEventCount: eventStats.familyCounts.orbit,
      sprayEventCount: eventStats.familyCounts.spray,
      clusterEventCount: eventStats.familyCounts.cluster,
    },
  };
}

function renderDroneBody(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  durationSec: number,
  planDuration: number,
  plan: StrangeAttractorCarrierPlan,
): void {
  let phaseA = 0;
  let phaseB = Math.PI * 0.21;
  let phaseSub = Math.PI * 0.37;
  let phaseLfo = 0;
  let lowL = 0;
  let lowR = 0;
  const sampleCount = left.length;

  for (let i = 0; i < sampleCount; i += 1) {
    const tSec = i / sampleRate;
    const planT = Math.min(planDuration, (tSec / Math.max(EPSILON, durationSec)) * planDuration);
    const rootHz = curveHzAt(plan.drone.rootHzCurve, planT, plan.rootHz);
    const energy = curveValueAt(plan.drone.energyCurve, planT, plan.summary.energyMean || 0.2);
    const filter = filterAt(plan.drone.filteroughnessCurve, planT);
    const effect = effectAt(plan.drone.effectCurve, planT);
    const motion = motionAt(plan.drone.motionCurve, planT);
    const lfoHz = 0.045 + effect.phaser * 0.42 + effect.flanger * 0.33;
    phaseLfo = wrapPhase(phaseLfo + (TWO_PI * lfoHz) / sampleRate);
    const lfo = Math.sin(phaseLfo);
    const hzA = clampHz(rootHz * (1 + lfo * effect.flanger * 0.008));
    const hzB = clampHz(rootHz * 1.48 * (1 + lfo * effect.phaser * 0.005));
    const hzSub = clampHz(rootHz * 0.5);
    phaseA = wrapPhase(phaseA + (TWO_PI * hzA) / sampleRate);
    phaseB = wrapPhase(phaseB + (TWO_PI * hzB) / sampleRate);
    phaseSub = wrapPhase(phaseSub + (TWO_PI * hzSub) / sampleRate);
    const saturation = 1 + effect.saturation * 3.2;
    const raw = Math.tanh(
      (triangleWave(phaseA) * 0.62 + Math.sin(phaseB) * 0.28 + Math.sin(phaseSub) * 0.34) * saturation,
    );
    const cut = clamp(filter.hz / (filter.hz + sampleRate * 0.36), 0.002, 0.16);
    const qTilt = clamp(0.8 + filter.q * 0.04, 0.72, 1.16);
    const pan = clamp(motion.x * 2 - 1, -1, 1) * 0.34;
    const amp = (0.018 + energy * 0.085) * (0.85 + effect.reverb * 0.22);
    lowL += (raw * amp * panLeftGain(pan) - lowL) * cut * qTilt;
    lowR += (raw * amp * panRightGain(pan) - lowR) * cut * qTilt;
    left[i] += lowL;
    right[i] += lowR;
  }
}

function renderSwarmEvents(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  durationSec: number,
  plan: StrangeAttractorCarrierPlan,
): {
  readonly renderedEventCount: number;
  readonly clippedEventCount: number;
  readonly familyCounts: Record<StrangeAttractorSwarmFamily, number>;
} {
  const sampleCount = left.length;
  const familyCounts: Record<StrangeAttractorSwarmFamily, number> = {
    drift: 0,
    orbit: 0,
    spray: 0,
    cluster: 0,
  };
  let renderedEventCount = 0;
  let clippedEventCount = 0;

  for (const event of plan.swarmEvents) {
    if (event.startSec >= durationSec) {
      clippedEventCount += 1;
      continue;
    }
    const start = Math.max(0, Math.floor(event.startSec * sampleRate));
    const end = Math.min(sampleCount, Math.ceil((event.startSec + event.durationSec) * sampleRate));
    if (end <= start + 4) {
      clippedEventCount += 1;
      continue;
    }
    familyCounts[event.family] += 1;
    renderedEventCount += 1;
    renderSwarmEvent(left, right, sampleRate, start, end, event);
  }

  return { renderedEventCount, clippedEventCount, familyCounts };
}

function renderSwarmEvent(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  start: number,
  end: number,
  event: StrangeAttractorSwarmEvent,
): void {
  const sampleLength = Math.max(1, end - start);
  const hz = clampHz(event.hz);
  const bendRatio = Math.pow(2, (event.modulation.pitchBendCents ?? 0) / 1200);
  const filterBias = clamp01(event.modulation.filterBias);
  const chaos = clamp01(event.modulation.chaos);
  const pan = clamp(event.pan, -1, 1);
  const gainL = panLeftGain(pan);
  const gainR = panRightGain(pan);
  const baseAmp = clamp(event.amp, 0, 0.5) * resolveFamilyGain(event.family) * (0.82 + filterBias * 0.35);
  let phase = (event.x * 0.47 + event.y * 0.31) * TWO_PI;
  let phaseB = phase + Math.PI * 0.37;
  let modPhase = phase + Math.PI * 0.71;
  let localLow = 0;
  let previous = 0;

  for (let i = 0; i < sampleLength; i += 1) {
    const ratio = i / Math.max(1, sampleLength - 1);
    const env = envelopeAt(ratio, event.family);
    const sweep = 1 + (ratio - 0.5) * 0.018 * (event.family === 'spray' || event.family === 'cluster' ? chaos + 0.5 : 0.35);
    const eventHz = clampHz(hz * (1 + (bendRatio - 1) * ratio) * sweep);
    phase = wrapPhase(phase + (TWO_PI * eventHz) / sampleRate);
    phaseB = wrapPhase(phaseB + (TWO_PI * eventHz * (event.family === 'orbit' ? 1.502 : 1.01 + filterBias * 0.035)) / sampleRate);
    modPhase = wrapPhase(modPhase + (TWO_PI * eventHz * (2.1 + chaos * 3.2)) / sampleRate);
    const raw = resolveFamilyWave(event.family, phase, phaseB, modPhase, chaos);
    const cut = resolveFamilyLowpass(event.family, filterBias, sampleRate);
    localLow += (raw - localLow) * cut;
    const high = localLow - previous;
    previous = localLow;
    const signal = resolveFamilyOutput(event.family, localLow, high) * env * baseAmp;
    const index = start + i;
    left[index] += signal * gainL;
    right[index] += signal * gainR;
  }
}

function applyStrangeSpace(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  plan: StrangeAttractorCarrierPlan,
  gain: number,
): void {
  const delayA = clampInteger(sampleRate * 0.071, 1, sampleRate);
  const delayB = clampInteger(sampleRate * 0.137, 1, sampleRate);
  const feedbackA = new Float32Array(delayA);
  const feedbackB = new Float32Array(delayB);
  const reverbBias = clamp01(plan.summary.orbitBias * 0.5 + plan.summary.driftBias * 0.25 + plan.summary.energyMean * 0.25);
  const wetA = 0.08 + reverbBias * 0.12;
  const wetB = 0.05 + reverbBias * 0.1;
  for (let i = 0; i < left.length; i += 1) {
    const aIndex = i % delayA;
    const bIndex = i % delayB;
    const delayedA = feedbackA[aIndex];
    const delayedB = feedbackB[bIndex];
    const l = left[i];
    const r = right[i];
    feedbackA[aIndex] = (l * 0.48 + r * 0.18 + delayedB * 0.18) * 0.52;
    feedbackB[bIndex] = (r * 0.46 + l * 0.17 + delayedA * 0.2) * 0.48;
    left[i] = (l + delayedA * wetA + delayedB * wetB * 0.55) * gain;
    right[i] = (r + delayedB * wetA + delayedA * wetB * 0.55) * gain;
  }
}

function resolveFamilyWave(
  family: StrangeAttractorSwarmFamily,
  phase: number,
  phaseB: number,
  modPhase: number,
  chaos: number,
): number {
  switch (family) {
    case 'drift':
      return triangleWave(phase) * 0.72 + Math.sin(phaseB) * 0.18;
    case 'orbit':
      return Math.sin(phase) * 0.66 + triangleWave(phaseB) * 0.28;
    case 'spray': {
      const modIndex = 0.45 + chaos * 1.6;
      return Math.sin(phase + Math.sin(modPhase) * modIndex) * 0.78;
    }
    case 'cluster':
    default:
      return squareWave(phase) * 0.42 + Math.sin(phaseB) * 0.34 + Math.sin(phase * 2.01) * 0.1;
  }
}

function resolveFamilyOutput(family: StrangeAttractorSwarmFamily, low: number, high: number): number {
  if (family === 'cluster') return low * 0.58 + high * 1.2;
  if (family === 'spray') return low * 0.72 + high * 0.45;
  return low;
}

function resolveFamilyGain(family: StrangeAttractorSwarmFamily): number {
  if (family === 'drift') return 0.62;
  if (family === 'orbit') return 0.72;
  if (family === 'spray') return 0.48;
  return 0.58;
}

function resolveFamilyLowpass(family: StrangeAttractorSwarmFamily, filterBias: number, sampleRate: number): number {
  const cutoff =
    family === 'drift'
      ? 700 + filterBias * 1100
      : family === 'orbit'
        ? 1200 + filterBias * 1700
        : family === 'spray'
          ? 1800 + filterBias * 3600
          : 950 + filterBias * 3200;
  return clamp(cutoff / (cutoff + sampleRate * 0.32), 0.006, 0.34);
}

function envelopeAt(ratio: number, family: StrangeAttractorSwarmFamily): number {
  const attack = family === 'spray' ? 0.035 : family === 'cluster' ? 0.055 : 0.12;
  const releaseStart = family === 'drift' || family === 'orbit' ? 0.68 : 0.42;
  const attackEnv = ratio < attack ? ratio / Math.max(EPSILON, attack) : 1;
  const releaseEnv = ratio > releaseStart ? 1 - (ratio - releaseStart) / Math.max(EPSILON, 1 - releaseStart) : 1;
  const base = clamp01(Math.min(attackEnv, releaseEnv));
  if (family === 'cluster') return Math.pow(base, 0.62) * (0.8 + 0.2 * Math.sin(ratio * Math.PI * 7));
  if (family === 'spray') return Math.pow(base, 0.72);
  return smoothstep(base);
}

function curveValueAt(points: readonly StrangeAttractoroughnessCurvePoint[], t: number, fallback: number): number {
  if (points.length === 0) return fallback;
  if (t <= points[0].t) return points[0].value;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    if (t <= next.t) {
      const ratio = clamp01((t - prev.t) / Math.max(EPSILON, next.t - prev.t));
      return lerp(prev.value, next.value, smoothstep(ratio));
    }
  }
  return points[points.length - 1].value;
}

function curveHzAt(points: readonly StrangeAttractorHzCurvePoint[], t: number, fallback: number): number {
  if (points.length === 0) return fallback;
  if (t <= points[0].t) return points[0].hz;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    if (t <= next.t) {
      const ratio = clamp01((t - prev.t) / Math.max(EPSILON, next.t - prev.t));
      return prev.hz * Math.pow(next.hz / Math.max(EPSILON, prev.hz), smoothstep(ratio));
    }
  }
  return points[points.length - 1].hz;
}

function filterAt(points: readonly StrangeAttractorFilteroughnessCurvePoint[], t: number): StrangeAttractorFilteroughnessCurvePoint {
  if (points.length === 0) return { t, hz: 900, q: 0.8 };
  if (t <= points[0].t) return points[0];
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    if (t <= next.t) {
      const ratio = smoothstep(clamp01((t - prev.t) / Math.max(EPSILON, next.t - prev.t)));
      return { t, hz: lerp(prev.hz, next.hz, ratio), q: lerp(prev.q, next.q, ratio) };
    }
  }
  return points[points.length - 1];
}

function motionAt(points: readonly StrangeAttractorMotionCurvePoint[], t: number): StrangeAttractorMotionCurvePoint {
  if (points.length === 0) return { t, x: 0.5, y: 0.5 };
  if (t <= points[0].t) return points[0];
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    if (t <= next.t) {
      const ratio = smoothstep(clamp01((t - prev.t) / Math.max(EPSILON, next.t - prev.t)));
      return { t, x: lerp(prev.x, next.x, ratio), y: lerp(prev.y, next.y, ratio) };
    }
  }
  return points[points.length - 1];
}

function effectAt(points: readonly StrangeAttractorEffectCurvePoint[], t: number): StrangeAttractorEffectCurvePoint {
  if (points.length === 0) return { t, phaser: 0.2, flanger: 0.08, saturation: 0.2, reverb: 0.24 };
  if (t <= points[0].t) return points[0];
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    if (t <= next.t) {
      const ratio = smoothstep(clamp01((t - prev.t) / Math.max(EPSILON, next.t - prev.t)));
      return {
        t,
        phaser: lerp(prev.phaser, next.phaser, ratio),
        flanger: lerp(prev.flanger, next.flanger, ratio),
        saturation: lerp(prev.saturation, next.saturation, ratio),
        reverb: lerp(prev.reverb, next.reverb, ratio),
      };
    }
  }
  return points[points.length - 1];
}

function triangleWave(phase: number): number {
  return (2 / Math.PI) * Math.asin(Math.sin(phase));
}

function squareWave(phase: number): number {
  return Math.sin(phase) >= 0 ? 1 : -1;
}

function panLeftGain(pan: number): number {
  return Math.cos((clamp(pan, -1, 1) + 1) * Math.PI * 0.25);
}

function panRightGain(pan: number): number {
  return Math.sin((clamp(pan, -1, 1) + 1) * Math.PI * 0.25);
}

function softClip(value: number): number {
  return Math.tanh(value * 1.08);
}

function measurePeak(left: Float32Array, right: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < left.length; i += 1) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  return peak;
}

function smoothstep(value: number): number {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

function wrapPhase(value: number): number {
  if (value >= TWO_PI) return value % TWO_PI;
  if (value < 0) return ((value % TWO_PI) + TWO_PI) % TWO_PI;
  return value;
}

function clampHz(value: number): number {
  return clamp(value, 18, 16000);
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value <= min) return min;
  if (value >= max) return max;
  return value;
}

function lerp(a: number, b: number, ratio: number): number {
  return a + (b - a) * ratio;
}

function roundStat(value: number): number {
  return Math.round(value * 10000) / 10000;
}
