import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import { autoSnapLoopToBars, detectBPM } from './audioAnalysis';

export type LoopSnapCandidate = {
  bars: number;
  durationSec: number;
  fitScore: number;
};

export type LoopSnapSuggestion = {
  bpm: number;
  confidence: number;
  startSec: number;
  durationSec: number;
  bars: number;
  candidates: LoopSnapCandidate[];
};

type AudioBufferLike = Pick<AudioBuffer, 'sampleRate' | 'length' | 'numberOfChannels' | 'getChannelData'>;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function clampBars(value: number) {
  return Math.max(1, Math.min(8, Math.round(value)));
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

function findNearestOnset(onsets: number[], centerSec: number, radiusSec: number) {
  let best = centerSec;
  let bestDiff = radiusSec;
  for (const onset of onsets) {
    const diff = Math.abs(onset - centerSec);
    if (diff <= bestDiff) {
      bestDiff = diff;
      best = onset;
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

export function estimateLoopSnapSuggestion(source: AudioSourceAsset, startSec: number, durationSec: number): LoopSnapSuggestion {
  const bufferLike = createMonoBufferLike(source);
  const analysis = detectBPM(bufferLike as AudioBuffer, startSec, Math.min(source.originalDuration, startSec + durationSec), 60, 210);
  const bpm = Math.max(60, Math.min(220, Math.round(analysis.bpm)));
  const baseSnap = autoSnapLoopToBars(startSec, startSec + durationSec, bpm, analysis.downbeatOffset, source.originalDuration);
  const beatDuration = 60 / Math.max(1, bpm);

  let snappedStart = findNearestOnset(analysis.onsets, baseSnap.start, beatDuration * 0.45);
  let snappedEnd = snappedStart + Math.max(0.25, baseSnap.end - baseSnap.start);

  const zeroRadius = Math.max(8, Math.floor(source.sampleRate * 0.02));
  snappedStart = nearestZeroCrossing(source.monoSamples, Math.floor(snappedStart * source.sampleRate), zeroRadius) / source.sampleRate;
  snappedEnd = nearestZeroCrossing(source.monoSamples, Math.floor(snappedEnd * source.sampleRate), zeroRadius) / source.sampleRate;

  const clamped = clampSelectionToDuration(source, snappedStart, snappedEnd - snappedStart);
  snappedStart = clamped.startSec;
  snappedEnd = clamped.startSec + clamped.durationSec;

  const barDuration = (60 / bpm) * 4;
  const rawBars = Math.max(1, (snappedEnd - snappedStart) / Math.max(0.001, barDuration));
  const bars = clampBars(Math.round(rawBars));

  const candidates: LoopSnapCandidate[] = Array.from({ length: 8 }, (_, index) => index + 1).map((candidateBars) => {
    const candidateDurationSec = Math.max(0.25, Math.min(source.originalDuration, candidateBars * barDuration));
    const fit = 1 - Math.min(1, Math.abs(candidateDurationSec - durationSec) / Math.max(0.25, durationSec));
    const seam = buildSelectionLoopSeamScore(source, snappedStart, candidateDurationSec);
    const fitScore = clamp01(fit * 0.62 + seam * 0.22 + analysis.confidence * 0.16);
    return {
      bars: candidateBars,
      durationSec: candidateDurationSec,
      fitScore,
    };
  }).sort((a, b) => {
    if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
    return Math.abs(a.durationSec - durationSec) - Math.abs(b.durationSec - durationSec);
  });

  const matched = candidates.find((candidate) => candidate.bars === bars) ?? candidates[0];
  const finalSelection = clampSelectionToDuration(source, snappedStart, matched.durationSec);
  const seam = buildSelectionLoopSeamScore(source, finalSelection.startSec, finalSelection.durationSec);
  const confidence = clamp01(analysis.confidence * 0.72 + seam * 0.18 + analysis.tempoStability * 0.1);

  return {
    bpm,
    confidence,
    startSec: finalSelection.startSec,
    durationSec: finalSelection.durationSec,
    bars: matched.bars,
    candidates: candidates.slice(0, 5),
  };
}
