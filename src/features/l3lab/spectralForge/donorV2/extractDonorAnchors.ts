import type { AudioSourceAsset } from '../audio/AudioImporter';
import { carrierBinToHz } from '../carrierV2/carrierCoordinateSystem';
import type { CarrierAnchorRegime, DonorAnchor, DonorAnchorPhase, DonorRegisterLabel } from '../types/carrierDonorV2Types';

export type ExtractDonorAnchorsOptions = {
  maxAnchorsPerFrame?: number;
  minPeakAmplitude?: number;
  verticalSmoothingRadius?: number;
  minPeakDistanceBins?: number;
};

const DEFAULT_OPTIONS: Required<ExtractDonorAnchorsOptions> = {
  maxAnchorsPerFrame: 5,
  minPeakAmplitude: 0.09,
  verticalSmoothingRadius: 2,
  minPeakDistanceBins: 5,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getAnalysisCacheOrThrow(source: AudioSourceAsset) {
  if (!source.analysisCache) {
    throw new Error('Donor analysis requires analysisCache');
  }
  return source.analysisCache;
}

function getColumn(data: Float32Array, width: number, height: number, x: number): Float32Array {
  const out = new Float32Array(height);
  for (let y = 0; y < height; y += 1) out[y] = data[y * width + x] ?? 0;
  return out;
}

function smoothColumn(column: Float32Array, radius: number): Float32Array {
  if (radius <= 0) return column.slice();
  const out = new Float32Array(column.length);
  for (let y = 0; y < column.length; y += 1) {
    let weighted = 0;
    let weightSum = 0;
    for (let dy = -radius; dy <= radius; dy += 1) {
      const yy = y + dy;
      if (yy < 0 || yy >= column.length) continue;
      const weight = radius + 1 - Math.abs(dy);
      weighted += column[yy] * weight;
      weightSum += weight;
    }
    out[y] = weightSum > 0 ? weighted / weightSum : column[y];
  }
  return out;
}

function estimateBandwidthBins(column: Float32Array, centerBin: number, peakValue: number): number {
  const threshold = Math.max(peakValue * 0.42, 0.025);
  let left = centerBin;
  while (left > 0 && column[left - 1] >= threshold) left -= 1;
  let right = centerBin;
  while (right < column.length - 1 && column[right + 1] >= threshold) right += 1;
  return Math.max(1, right - left + 1);
}

function pickPeaks(column: Float32Array, options: Required<ExtractDonorAnchorsOptions>): number[] {
  const candidates: { y: number; value: number }[] = [];
  for (let y = 1; y < column.length - 1; y += 1) {
    const value = column[y] ?? 0;
    if (value < options.minPeakAmplitude) continue;
    if (value < (column[y - 1] ?? 0) || value < (column[y + 1] ?? 0)) continue;
    candidates.push({ y, value });
  }
  candidates.sort((a, b) => b.value - a.value);
  const picked: number[] = [];
  for (const candidate of candidates) {
    if (picked.some((existing) => Math.abs(existing - candidate.y) < options.minPeakDistanceBins)) continue;
    picked.push(candidate.y);
    if (picked.length >= options.maxAnchorsPerFrame) break;
  }
  picked.sort((a, b) => a - b);
  return picked;
}

function computeLocalContrast(column: Float32Array, centerBin: number, peakValue: number): number {
  let context = 0;
  let count = 0;
  for (let dy = -4; dy <= 4; dy += 1) {
    if (dy === 0) continue;
    const yy = centerBin + dy;
    if (yy < 0 || yy >= column.length) continue;
    context += column[yy] ?? 0;
    count += 1;
  }
  const meanContext = count > 0 ? context / count : 0;
  return Math.max(0, peakValue - meanContext);
}

function classifyRegime(peakValue: number, ridgeness: number, bandwidthBins: number, transientStrength: number): CarrierAnchorRegime {
  if (transientStrength > 0.2 && peakValue > 0.12) return 'transient';
  if (bandwidthBins >= 12 || (bandwidthBins >= 7 && peakValue > 0.16)) return 'cluster';
  if (ridgeness < 0.03 || peakValue < 0.11) return 'noise';
  return 'tonal';
}

function classifyPhase(transientEnvelope: Float32Array, frameIndex: number): DonorAnchorPhase {
  const current = transientEnvelope[frameIndex] ?? 0;
  const prev = frameIndex > 0 ? transientEnvelope[frameIndex - 1] ?? 0 : current;
  const next = frameIndex < transientEnvelope.length - 1 ? transientEnvelope[frameIndex + 1] ?? 0 : current;
  if (current > 0.56 || (current > 0.34 && current >= prev && current >= next)) return 'attack';
  if (frameIndex > 2 && current < prev * 0.72 && current < 0.16) return 'release';
  return 'sustain';
}

function classifyRegister(centerHz: number): DonorRegisterLabel {
  if (centerHz < 220) return 'low';
  if (centerHz < 1760) return 'mid';
  return 'high';
}

export function extractDonorAnchors(
  source: AudioSourceAsset,
  options?: ExtractDonorAnchorsOptions,
): DonorAnchor[] {
  const cfg = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
  const cache = getAnalysisCacheOrThrow(source);
  const { width, height, data, transientEnvelope } = cache;
  const smoothedColumns: Float32Array[] = [];
  for (let x = 0; x < width; x += 1) {
    smoothedColumns.push(smoothColumn(getColumn(data, width, height, x), cfg.verticalSmoothingRadius));
  }

  const anchors: DonorAnchor[] = [];
  for (let x = 0; x < width; x += 1) {
    const column = smoothedColumns[x];
    const peaks = pickPeaks(column, cfg);
    for (let index = 0; index < peaks.length; index += 1) {
      const centerBin = peaks[index] ?? 0;
      const peakValue = column[centerBin] ?? 0;
      const bandwidthBins = estimateBandwidthBins(column, centerBin, peakValue);
      const ridgeness = computeLocalContrast(column, centerBin, peakValue);
      const transientStrength = transientEnvelope[x] ?? 0;
      const regime = classifyRegime(peakValue, ridgeness, bandwidthBins, transientStrength);
      const centerHz = carrierBinToHz(centerBin, height);
      const halfBandwidth = Math.ceil(bandwidthBins * 0.5);
      anchors.push({
        id: `donor-anchor-${x}-${index}-${centerBin}`,
        frameIndex: x,
        centerBin,
        centerHz,
        bandwidthBins,
        bandwidthHz: Math.abs(carrierBinToHz(clamp(centerBin + halfBandwidth, 0, height - 1), height) - carrierBinToHz(clamp(centerBin - halfBandwidth, 0, height - 1), height)),
        energy: peakValue,
        regime,
        phase: classifyPhase(transientEnvelope, x),
        register: classifyRegister(centerHz),
      });
    }
  }

  return anchors;
}
