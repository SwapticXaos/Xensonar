import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import { detectBPM } from '../canonicalForge/audioAnalysis';
import type { LoopRepairResult, MaterialIntakeMeterConfig, TimeRange } from './types';

type AudioBufferLike = Pick<AudioBuffer, 'sampleRate' | 'length' | 'numberOfChannels' | 'getChannelData'>;

interface RepairLoopOptions {
  detailViewport?: TimeRange | null;
  meter?: MaterialIntakeMeterConfig;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function clampBars(value: number) {
  return Math.max(1, Math.min(8, Math.round(value)));
}

function hasFinitePositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function clampBpm(value: number) {
  return Math.max(50, Math.min(220, value));
}

function createMonoBufferLike(source: AudioSourceAsset): AudioBufferLike {
  return {
    sampleRate: source.sampleRate,
    length: source.monoSamples.length,
    numberOfChannels: 1,
    getChannelData: (_channel: number) => source.monoSamples,
  } as AudioBufferLike;
}

function nearestZeroCrossing(samples: Float32Array, index: number, radius: number) {
  const start = Math.max(1, index - radius);
  const end = Math.min(samples.length - 2, index + radius);
  let best = Math.max(1, Math.min(samples.length - 2, index));
  let bestScore = Number.POSITIVE_INFINITY;
  for (let i = start; i <= end; i += 1) {
    const a = samples[i - 1] ?? 0;
    const b = samples[i] ?? 0;
    const crosses = (a <= 0 && b >= 0) || (a >= 0 && b <= 0);
    if (!crosses) continue;
    const score = Math.abs(i - index) + (Math.abs(a) + Math.abs(b)) * 180;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

function buildSelectionLoopSeamScore(source: AudioSourceAsset, startSec: number, durationSec: number) {
  const startSample = Math.max(0, Math.floor(startSec * source.sampleRate));
  const sampleCount = Math.max(1, Math.floor(durationSec * source.sampleRate));
  const endSample = Math.min(source.monoSamples.length, startSample + sampleCount);
  const actualCount = Math.max(1, endSample - startSample);
  const edgeSamples = Math.max(32, Math.min(Math.floor(source.sampleRate * 0.03), Math.max(32, Math.floor(actualCount * 0.12))));
  let diffSum = 0;
  let energySum = 0;
  let count = 0;
  for (let i = 0; i < edgeSamples && startSample + i < endSample && endSample - edgeSamples + i >= startSample; i += 1) {
    const a = source.monoSamples[startSample + i] ?? 0;
    const b = source.monoSamples[endSample - edgeSamples + i] ?? 0;
    const diff = a - b;
    diffSum += diff * diff;
    energySum += (a * a + b * b) * 0.5;
    count += 1;
  }
  if (count === 0) return 0;
  const rmsDiff = Math.sqrt(diffSum / count);
  const rmsEnergy = Math.sqrt(Math.max(1e-8, energySum / count));
  return clamp01(1 - rmsDiff / Math.max(0.02, rmsEnergy * 1.15));
}

function clampSelectionToDuration(source: AudioSourceAsset, startSec: number, durationSec: number) {
  const boundedDuration = Math.max(0.08, Math.min(durationSec, source.originalDuration));
  const boundedStart = Math.max(0, Math.min(source.originalDuration - boundedDuration, startSec));
  return { startSec: boundedStart, durationSec: boundedDuration };
}

function sampleEnergyAround(samples: Float32Array, centerIndex: number, radius: number) {
  const start = Math.max(0, centerIndex - radius);
  const end = Math.min(samples.length, centerIndex + radius);
  if (end <= start) return 0;
  let energy = 0;
  for (let i = start; i < end; i += 1) {
    const s = samples[i] ?? 0;
    energy += s * s;
  }
  return Math.sqrt(energy / Math.max(1, end - start));
}

function boundarySoftnessScore(source: AudioSourceAsset, endSec: number) {
  const centerIndex = Math.max(1, Math.min(source.monoSamples.length - 2, Math.floor(endSec * source.sampleRate)));
  const radius = Math.max(16, Math.floor(source.sampleRate * 0.008));
  const amplitude = Math.abs(source.monoSamples[centerIndex] ?? 0);
  const leftEnergy = sampleEnergyAround(source.monoSamples, centerIndex - radius, radius);
  const rightEnergy = sampleEnergyAround(source.monoSamples, centerIndex + radius, radius);
  const energyBalance = 1 - Math.min(1, Math.abs(leftEnergy - rightEnergy) / Math.max(0.005, Math.max(leftEnergy, rightEnergy)));
  return clamp01((1 - Math.min(1, amplitude / 0.45)) * 0.6 + energyBalance * 0.4);
}

function detectContextTempo(
  source: AudioSourceAsset,
  startSec: number,
  durationSec: number,
  detailViewport?: TimeRange | null,
) {
  const bufferLike = createMonoBufferLike(source);
  const viewportStart = detailViewport?.startSec ?? startSec;
  const viewportEnd = detailViewport ? detailViewport.startSec + detailViewport.durationSec : startSec + durationSec;
  const paddedStart = Math.max(0, Math.min(startSec, viewportStart) - Math.max(0.2, durationSec * 0.35));
  const paddedEnd = Math.min(
    source.originalDuration,
    Math.max(startSec + durationSec, viewportEnd) + Math.max(0.2, durationSec * 0.35),
  );
  const safeEnd = Math.max(paddedStart + 0.5, paddedEnd);
  const analysis = detectBPM(
    bufferLike as AudioBuffer,
    paddedStart,
    safeEnd,
    60,
    210,
  );
  return analysis;
}

function buildBarsCandidates(preferredBars: number) {
  const ordered = [preferredBars];
  if (preferredBars > 1) ordered.push(preferredBars - 1);
  if (preferredBars < 8) ordered.push(preferredBars + 1);
  if (preferredBars % 2 === 0 && preferredBars / 2 >= 1) ordered.push(preferredBars / 2);
  if (preferredBars * 2 <= 8) ordered.push(preferredBars * 2);
  return Array.from(new Set(ordered.map(clampBars)));
}

function refineEndAroundPredicted(
  source: AudioSourceAsset,
  startSec: number,
  userDurationSec: number,
  predictedDurationSec: number,
  beatDurationSec: number,
) {
  const expected = clampSelectionToDuration(source, startSec, predictedDurationSec);
  const predictedEndSec = expected.startSec + expected.durationSec;
  const userEndSec = startSec + userDurationSec;
  const searchRadiusSec = Math.max(
    0.035,
    Math.min(0.22, beatDurationSec * 0.22),
    Math.min(0.25, Math.abs(predictedDurationSec - userDurationSec) + beatDurationSec * 0.12),
  );
  const steps = 32;
  const zeroRadius = Math.max(8, Math.floor(source.sampleRate * 0.015));
  let best = expected;
  let bestScore = -Infinity;

  for (let step = -steps; step <= steps; step += 1) {
    const probeEndSec = Math.max(
      expected.startSec + 0.08,
      Math.min(source.originalDuration, predictedEndSec + (step / steps) * searchRadiusSec),
    );
    const zeroSample = nearestZeroCrossing(source.monoSamples, Math.floor(probeEndSec * source.sampleRate), zeroRadius);
    const candidateDurationSec = Math.max(0.08, zeroSample / source.sampleRate - expected.startSec);
    const candidate = clampSelectionToDuration(source, expected.startSec, candidateDurationSec);
    const candidateEndSec = candidate.startSec + candidate.durationSec;
    const seam = buildSelectionLoopSeamScore(source, candidate.startSec, candidate.durationSec);
    const softness = boundarySoftnessScore(source, candidateEndSec);
    const predictedCloseness = 1 - Math.min(1, Math.abs(candidate.durationSec - predictedDurationSec) / Math.max(0.08, beatDurationSec * 0.55));
    const userCloseness = 1 - Math.min(1, Math.abs(candidateEndSec - userEndSec) / Math.max(0.08, beatDurationSec * 0.75));
    const centerBias = 1 - Math.abs(step) / (steps + 1);
    const score = predictedCloseness * 0.42 + userCloseness * 0.31 + softness * 0.11 + seam * 0.1 + centerBias * 0.06;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return {
    candidate: best,
    seam: buildSelectionLoopSeamScore(source, best.startSec, best.durationSec),
    softness: boundarySoftnessScore(source, best.startSec + best.durationSec),
    fitScore: Math.max(0, bestScore),
  };
}

export function repairLoopSelection(
  source: AudioSourceAsset,
  startSec: number,
  durationSec: number,
  options: RepairLoopOptions = {},
): LoopRepairResult {
  const analysis = detectContextTempo(source, startSec, durationSec, options.detailViewport);
  const measuredBpm = clampBpm(Math.round(analysis.bpm));
  const meter = options.meter;
  const meterBars = hasFinitePositiveNumber(meter?.bars) ? clampBars(meter.bars) : null;
  const estimatedBars = Math.max(1, Math.round((durationSec / Math.max(0.001, (60 / measuredBpm) * 4))));
  const preferredBars = meterBars ?? clampBars(estimatedBars);
  const meterBpm = hasFinitePositiveNumber(meter?.bpm) ? clampBpm(Math.round(meter.bpm)) : null;
  const impliedBpm = clampBpm((preferredBars * 240) / Math.max(0.25, durationSec));
  const bpm = meterBpm ?? clampBpm(
    analysis.confidence >= 0.45
      ? measuredBpm * 0.7 + impliedBpm * 0.3
      : impliedBpm * 0.72 + measuredBpm * 0.28,
  );
  const beatDurationSec = 60 / Math.max(1, bpm);

  const barsCandidates = meterBars ? [preferredBars] : buildBarsCandidates(preferredBars);

  const candidates = barsCandidates
    .map((bars) => {
      const predictedDurationSec = Math.max(0.25, Math.min(source.originalDuration, bars * beatDurationSec * 4));
      const refined = refineEndAroundPredicted(source, startSec, durationSec, predictedDurationSec, beatDurationSec);
      const predictedFit = 1 - Math.min(1, Math.abs(refined.candidate.durationSec - predictedDurationSec) / Math.max(0.08, beatDurationSec * 0.55));
      const userFit = 1 - Math.min(1, Math.abs(refined.candidate.durationSec - durationSec) / Math.max(0.12, durationSec * 0.28));
      const fitScore = clamp01(refined.fitScore * 0.46 + predictedFit * 0.24 + userFit * 0.24 + analysis.confidence * 0.06);
      return {
        bars,
        bpm: Math.round(bpm),
        startSec,
        durationSec: refined.candidate.durationSec,
        confidence: clamp01(analysis.confidence * 0.34 + refined.seam * 0.12 + refined.softness * 0.14 + predictedFit * 0.22 + userFit * 0.18),
        fitScore,
      };
    })
    .sort((a, b) => {
      if (a.bars === preferredBars && b.bars !== preferredBars) return -1;
      if (b.bars === preferredBars && a.bars !== preferredBars) return 1;
      if ((b.fitScore ?? 0) !== (a.fitScore ?? 0)) return (b.fitScore ?? 0) - (a.fitScore ?? 0);
      return Math.abs(a.durationSec - durationSec) - Math.abs(b.durationSec - durationSec);
    });

  const primary = candidates.find((candidate) => candidate.bars === preferredBars) ?? candidates[0];

  return {
    primary,
    candidates: candidates.slice(0, 4),
  };
}
