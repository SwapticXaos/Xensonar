import type { CarrierLoopBodyCurveSet } from './carrierLoopBodyCurveTypes';
import { centsToHz, clamp01, clampRange } from './carrierLoopBodyCurveMath';

export const CARRIER_LOOP_BODY_PREVIEW_CANDIDATE_VERSION =
  'clb-preview-7.7.20';

export type CarrierLoopBodyPreviewReferenceKind =
  | 'body-sonar-reference'
  | 'single-oscillator-contour'
  | 'two-harmonic-contour'
  | 'cecilia-spectral-weave'
  | 'bert-window-prism-candidate';

export type CarrierLoopBodyPreviewBufferOptions = {
  sampleRate?: number;
  gain?: number;
  harmonicGain?: number;
  roughnessGain?: number;
  loopEdgeFadeMs?: number;
  referenceKind?: CarrierLoopBodyPreviewReferenceKind;
  renderDurationSec?: number;
};

export type CarrierLoopBodyPreviewBufferStats = {
  sampleCount: number;
  durationSec: number;
  sampleRate: number;
  peak: number;
  rms: number;
  containsNonFinite: boolean;
};

export type CarrierLoopBodyPreviewSampleBuffer = {
  version: typeof CARRIER_LOOP_BODY_PREVIEW_CANDIDATE_VERSION;
  sourceIdentity: string;
  sourceKind: CarrierLoopBodyCurveSet['sourceKind'];
  referenceKind: CarrierLoopBodyPreviewReferenceKind;
  sampleRate: number;
  durationSec: number;
  channelData: Float32Array;
  stats: CarrierLoopBodyPreviewBufferStats;
};

const DEFAULT_PREVIEW_SAMPLE_RATE = 48000;
const DEFAULT_PREVIEW_GAIN = 0.42;
const DEFAULT_HARMONIC_GAIN = 0.18;
const DEFAULT_ROUGHNESS_GAIN = 0.035;
const DEFAULT_LOOP_EDGE_FADE_MS = 8;

function expectedPreviewSampleCount(durationSec: number, sampleRate: number): number {
  if (!Number.isFinite(durationSec) || !Number.isFinite(sampleRate)) return 0;
  if (durationSec <= 0 || sampleRate <= 0) return 0;
  return Math.max(1, Math.ceil(durationSec * sampleRate));
}

function sampleCurveLinear(curve: Float32Array, ratio: number, fallback = 0): number {
  if (!curve.length) return fallback;
  const safeRatio = clamp01(ratio);
  const position = safeRatio * Math.max(0, curve.length - 1);
  const left = Math.floor(position);
  const right = Math.min(curve.length - 1, left + 1);
  const mix = position - left;
  const leftValue = Number.isFinite(curve[left]) ? curve[left] : fallback;
  const rightValue = Number.isFinite(curve[right]) ? curve[right] : leftValue;
  return leftValue + (rightValue - leftValue) * mix;
}

function edgeFadeGain(index: number, sampleCount: number, fadeSamples: number): number {
  if (fadeSamples <= 0 || sampleCount <= 1) return 1;
  const fadeIn = clamp01(index / fadeSamples);
  const fadeOut = clamp01((sampleCount - 1 - index) / fadeSamples);
  return Math.min(1, fadeIn, fadeOut);
}



function previewStats(channelData: Float32Array, sampleRate: number, durationSec: number): CarrierLoopBodyPreviewBufferStats {
  let peak = 0;
  let sumSquares = 0;
  let containsNonFinite = false;

  for (const sample of channelData) {
    if (!Number.isFinite(sample)) {
      containsNonFinite = true;
      continue;
    }
    peak = Math.max(peak, Math.abs(sample));
    sumSquares += sample * sample;
  }

  return {
    sampleCount: channelData.length,
    durationSec,
    sampleRate,
    peak,
    rms: channelData.length ? Math.sqrt(sumSquares / channelData.length) : 0,
    containsNonFinite,
  };
}

function softLimit(sample: number): number {
  if (!Number.isFinite(sample)) return 0;
  return Math.tanh(sample);
}

export function renderCarrierLoopBodyPreviewSamples(
  body: CarrierLoopBodyCurveSet,
  options: CarrierLoopBodyPreviewBufferOptions = {},
): CarrierLoopBodyPreviewSampleBuffer {
  const sampleRate = Math.max(1000, Math.floor(options.sampleRate ?? DEFAULT_PREVIEW_SAMPLE_RATE));
  const renderDurationSec = Math.max(0.001, Math.min(body.durationSec, options.renderDurationSec ?? body.durationSec));
  const sampleCount = expectedPreviewSampleCount(renderDurationSec, sampleRate);
  const channelData = new Float32Array(sampleCount);
  const gain = clampRange(options.gain ?? DEFAULT_PREVIEW_GAIN, 0, 1);
  const harmonicGain = clampRange(options.harmonicGain ?? DEFAULT_HARMONIC_GAIN, 0, 1);
  const roughnessGain = clampRange(options.roughnessGain ?? DEFAULT_ROUGHNESS_GAIN, 0, 0.25);
  const fadeSamples = Math.ceil(Math.max(0, options.loopEdgeFadeMs ?? DEFAULT_LOOP_EDGE_FADE_MS) * sampleRate / 1000);
  const referenceKind = options.referenceKind ?? 'body-sonar-reference';


  let phase = 0;
  let harmonicPhase = 0;
  let roughnessPhase = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const sampleTimeSec = index / sampleRate;
    const ratio = body.durationSec <= 0 ? 0 : clamp01(sampleTimeSec / body.durationSec);
    const pitchCents = sampleCurveLinear(body.pitchDetuneCents, ratio, 0);
    const carrierHz = clampRange(centsToHz(pitchCents, body.baseHz), 12, sampleRate * 0.42);
    const gainCurve = clamp01(sampleCurveLinear(body.gainCurve, ratio, 0));
    const density = clamp01(sampleCurveLinear(body.densityCurve, ratio, 0));
    const roughness = clamp01(sampleCurveLinear(body.roughnessCurve, ratio, 0));
    const presence = clamp01(sampleCurveLinear(body.presenceCurve, ratio, 0));

    phase += (Math.PI * 2 * carrierHz) / sampleRate;
    harmonicPhase += (Math.PI * 2 * carrierHz * 2) / sampleRate;
    roughnessPhase += (Math.PI * 2 * carrierHz * (3.01 + roughness * 1.7)) / sampleRate;

    // Keep phase bounded without changing continuity.
    if (phase > Math.PI * 2) phase -= Math.PI * 2 * Math.floor(phase / (Math.PI * 2));
    if (harmonicPhase > Math.PI * 2) harmonicPhase -= Math.PI * 2 * Math.floor(harmonicPhase / (Math.PI * 2));
    if (roughnessPhase > Math.PI * 2) roughnessPhase -= Math.PI * 2 * Math.floor(roughnessPhase / (Math.PI * 2));

    const bodyTone = Math.sin(phase);
    const harmonicTone = Math.sin(harmonicPhase) * harmonicGain * (0.2 + density * 0.8);
    const roughnessTone = Math.sin(roughnessPhase) * roughnessGain * roughness;
    const amp = gain * gainCurve * (0.32 + presence * 0.68) * edgeFadeGain(index, sampleCount, fadeSamples);
    channelData[index] = softLimit((bodyTone + harmonicTone + roughnessTone) * amp);
  }

  return {
    version: CARRIER_LOOP_BODY_PREVIEW_CANDIDATE_VERSION,
    sourceIdentity: body.sourceIdentity,
    sourceKind: body.sourceKind,
    referenceKind,
    sampleRate,
    durationSec: renderDurationSec,
    channelData,
    stats: previewStats(channelData, sampleRate, renderDurationSec),
  };
}

export function createCarrierLoopBodyPreviewAudioBuffer(
  audioContext: BaseAudioContext,
  body: CarrierLoopBodyCurveSet,
  options: CarrierLoopBodyPreviewBufferOptions = {},
): AudioBuffer {
  const rendered = renderCarrierLoopBodyPreviewSamples(body, {
    ...options,
    sampleRate: options.sampleRate ?? audioContext.sampleRate,
  });
  const buffer = audioContext.createBuffer(1, rendered.channelData.length, rendered.sampleRate);
  buffer.getChannelData(0).set(rendered.channelData);
  return buffer;
}


export function createCarrierLoopBodyPreviewAudioBufferFromSamples(
  rendered: CarrierLoopBodyPreviewSampleBuffer,
): AudioBuffer {
  const buffer = new AudioBuffer({
    numberOfChannels: 1,
    length: rendered.channelData.length,
    sampleRate: rendered.sampleRate,
  });
  buffer.getChannelData(0).set(rendered.channelData as unknown as ArrayLike<number>);
  return buffer;
}
