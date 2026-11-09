import type { AudioSourceAsset } from '../audio/AudioImporter';
import {
  VIRTUAL_BODY_ACTUALIZATION_SCHEMA_VERSION,
  type ActualizationMediumKind,
  type ActualizationMediumPlan,
} from './virtualBodyActualizationTypes';

const TWO_PI = Math.PI * 2;

export type HydratedActualizationMedium = ActualizationMediumPlan & {
  sourceAsset: AudioSourceAsset;
  usedFailOpen: boolean;
};

export type HydrateVirtualBodyMediumRequest = {
  requestedSourceAsset?: AudioSourceAsset | null;
  requestedKind?: ActualizationMediumKind | null;
  durationSec: number;
  sampleRate?: number;
  idPrefix?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function deterministicNeutralPigmentNoise(index: number) {
  let x = (index + 1) * 1664525 + 1013904223;
  x = ((x >>> 13) ^ x) >>> 0;
  return ((x % 20001) / 10000) - 1;
}

export function analyzeAudioSourceAsset(asset: AudioSourceAsset): { peak: number; rms: number; length: number; durationSec: number; sampleRate: number } {
  const samples = asset.monoSamples ?? asset.leftSamples ?? asset.rightSamples ?? new Float32Array(0);
  let peak = 0;
  let sumSquares = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Number(samples[index] ?? 0);
    if (!Number.isFinite(sample)) continue;
    const abs = Math.abs(sample);
    peak = Math.max(peak, abs);
    sumSquares += sample * sample;
  }
  const sampleRate = Math.max(1, asset.sampleRate || 44100);
  return {
    peak,
    rms: samples.length ? Math.sqrt(sumSquares / samples.length) : 0,
    length: samples.length,
    durationSec: samples.length / sampleRate,
    sampleRate,
  };
}

export function makeNeutralPigmentAudioSourceAsset(durationSec: number, sampleRate = 44100): AudioSourceAsset {
  const safeDurationSec = clamp(durationSec || 1, 0.35, 8);
  const length = Math.max(1, Math.round(safeDurationSec * sampleRate));
  const monoSamples = new Float32Array(length);
  const leftSamples = new Float32Array(length);
  const rightSamples = new Float32Array(length);
  const midSamples = new Float32Array(length);
  const sideSamples = new Float32Array(length);
  const waveformPreview = new Float32Array(256);
  const stereoWidthPreview = new Float32Array(256);
  let lowPassNoise = 0;
  let peak = 0;
  for (let index = 0; index < length; index += 1) {
    const t = index / sampleRate;
    const env = Math.max(0, Math.min(1, t / 0.025, (safeDurationSec - t) / 0.045));
    const tonalBody = Math.sin(TWO_PI * 110 * t) * 0.18
      + Math.sin(TWO_PI * 220 * t + 0.37) * 0.13
      + Math.sin(TWO_PI * 440 * t + Math.sin(t * 1.7) * 0.4) * 0.08
      + Math.sin(TWO_PI * 880 * t + 0.91) * 0.045;
    const rawNoise = deterministicNeutralPigmentNoise(index) * 0.18;
    lowPassNoise += (rawNoise - lowPassNoise) * 0.035;
    const transientTick = (index % Math.max(1, Math.round(sampleRate * 0.117))) < Math.round(sampleRate * 0.006)
      ? deterministicNeutralPigmentNoise(index * 13 + 17) * 0.12
      : 0;
    const sample = (tonalBody + lowPassNoise * 0.38 + transientTick) * env;
    monoSamples[index] = sample;
    leftSamples[index] = sample;
    rightSamples[index] = sample;
    midSamples[index] = sample;
    sideSamples[index] = 0;
    peak = Math.max(peak, Math.abs(sample));
  }
  if (peak > 0.0001) {
    const scale = 0.78 / peak;
    for (let index = 0; index < length; index += 1) {
      monoSamples[index] *= scale;
      leftSamples[index] *= scale;
      rightSamples[index] *= scale;
      midSamples[index] *= scale;
    }
  }
  const stride = Math.max(1, Math.floor(length / waveformPreview.length));
  for (let index = 0; index < waveformPreview.length; index += 1) {
    waveformPreview[index] = monoSamples[Math.min(length - 1, index * stride)] ?? 0;
    stereoWidthPreview[index] = 0;
  }
  return {
    kind: 'audio',
    fileName: 'neutral-pigment-v2-donor.wav',
    projectionReadMode: 'hybrid',
    monoSamples,
    leftSamples,
    rightSamples,
    midSamples,
    sideSamples,
    sampleRate,
    originalDuration: safeDurationSec,
    channelCount: 1,
    importStartSec: 0,
    importDurationSec: safeDurationSec,
    waveformPreview,
    stereoWidthPreview,
  };
}

export function hydrateVirtualBodyMedium(request: HydrateVirtualBodyMediumRequest): HydratedActualizationMedium {
  const requested = request.requestedSourceAsset ?? null;
  const requestedStats = requested ? analyzeAudioSourceAsset(requested) : null;
  const requestedUsable = Boolean(
    requested
    && requestedStats
    && requestedStats.length > 0
    && requestedStats.peak > 0.0005
    && requestedStats.rms > 0.00005,
  );

  if (requested && requestedStats && requestedUsable) {
    return {
      schemaVersion: VIRTUAL_BODY_ACTUALIZATION_SCHEMA_VERSION,
      id: `${request.idPrefix ?? 'medium'}-audio-donor-ready`,
      kind: request.requestedKind === 'neutral-pigment' ? 'neutral-pigment' : 'audio-donor',
      readiness: 'ready',
      audioBufferRef: requested.fileName,
      sampleRate: requestedStats.sampleRate,
      durationSec: requestedStats.durationSec,
      peak: requestedStats.peak,
      rms: requestedStats.rms,
      warnings: [],
      sourceAsset: requested,
      usedFailOpen: false,
    };
  }

  const sourceAsset = makeNeutralPigmentAudioSourceAsset(request.durationSec, request.sampleRate ?? 44100);
  const stats = analyzeAudioSourceAsset(sourceAsset);
  const warnings = requested
    ? ['Requested medium was missing, silent, or not ready; hydrated Neutral-Pigment fail-open medium.']
    : ['No donor medium supplied; hydrated Neutral-Pigment fail-open medium.'];
  return {
    schemaVersion: VIRTUAL_BODY_ACTUALIZATION_SCHEMA_VERSION,
    id: `${request.idPrefix ?? 'medium'}-neutral-pigment-hydrated`,
    kind: 'neutral-pigment',
    readiness: 'hydrated-fallback',
    audioBufferRef: sourceAsset.fileName,
    sampleRate: stats.sampleRate,
    durationSec: stats.durationSec,
    peak: stats.peak,
    rms: stats.rms,
    warnings,
    sourceAsset,
    usedFailOpen: true,
  };
}
