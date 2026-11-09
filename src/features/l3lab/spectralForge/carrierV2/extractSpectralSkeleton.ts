import type { SpectralData } from '../audio/SpectralData';
import { DURATION } from '../spectralConstants';
import { carrierBinToHz } from './carrierCoordinateSystem';
import type { CarrierAnchor, CarrierAnchorRegime, CarrierSpectralSkeleton } from '../types/carrierDonorV2Types';

export type ExtractSpectralSkeletonOptions = {
  maxAnchorsPerFrame?: number;
  minPeakAmplitude?: number;
  verticalSmoothingRadius?: number;
  minPeakDistanceBins?: number;
};

const DEFAULT_OPTIONS: Required<ExtractSpectralSkeletonOptions> = {
  maxAnchorsPerFrame: 6,
  minPeakAmplitude: 0.08,
  verticalSmoothingRadius: 2,
  minPeakDistanceBins: 4,
};

function smoothColumn(column: Float32Array, radius: number): Float32Array {
  if (radius <= 0) return column.slice();
  const out = new Float32Array(column.length);
  for (let y = 0; y < column.length; y++) {
    let weighted = 0;
    let weightSum = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= column.length) continue;
      const w = radius + 1 - Math.abs(dy);
      weighted += column[yy] * w;
      weightSum += w;
    }
    out[y] = weightSum > 0 ? weighted / weightSum : column[y];
  }
  return out;
}

function estimateBandwidthBins(column: Float32Array, centerBin: number, peakValue: number): number {
  const threshold = Math.max(peakValue * 0.45, 0.025);
  let left = centerBin;
  while (left > 0 && column[left - 1] >= threshold) left--;
  let right = centerBin;
  while (right < column.length - 1 && column[right + 1] >= threshold) right++;
  return Math.max(1, right - left + 1);
}

function computeLocalContrast(column: Float32Array, centerBin: number, peakValue: number): number {
  let context = 0;
  let count = 0;
  for (let dy = -4; dy <= 4; dy++) {
    if (dy === 0) continue;
    const yy = centerBin + dy;
    if (yy < 0 || yy >= column.length) continue;
    context += column[yy];
    count += 1;
  }
  const meanContext = count > 0 ? context / count : 0;
  return Math.max(0, peakValue - meanContext);
}

function computeTransientStrength(prev: Float32Array | null, next: Float32Array | null, centerBin: number, peakValue: number): number {
  const prevVal = prev ? prev[centerBin] ?? 0 : 0;
  const nextVal = next ? next[centerBin] ?? 0 : 0;
  return Math.max(0, peakValue - Math.max(prevVal, nextVal));
}

function classifyRegime(peakValue: number, ridgeness: number, bandwidthBins: number, transientStrength: number): CarrierAnchorRegime {
  if (transientStrength > 0.16 && peakValue > 0.18) return 'transient';
  if (bandwidthBins >= 12 || (bandwidthBins >= 7 && peakValue > 0.14)) return 'cluster';
  if (ridgeness < 0.03 || peakValue < 0.11) return 'noise';
  return 'tonal';
}

function pickPeaks(column: Float32Array, raw: Float32Array, options: Required<ExtractSpectralSkeletonOptions>): number[] {
  const candidates: { y: number; value: number }[] = [];
  // Include image edges and collapse one flat ridge into one centre. Threshold
  // the original stroke: vertical smoothing must not erase a quiet thin line.
  for (let y = 0; y < column.length;) {
    const first = y;
    const value = column[y];
    while (y + 1 < column.length && Math.abs(column[y + 1] - value) <= 1e-7) y++;
    const last = y++;
    if (!(value > 0) || (first > 0 && column[first - 1] > value) || (last + 1 < column.length && column[last + 1] > value)) continue;
    const center = Math.floor((first + last) / 2);
    let originalPeak = 0;
    for (let j = Math.max(0, first - options.verticalSmoothingRadius); j <= Math.min(raw.length - 1, last + options.verticalSmoothingRadius); j++) originalPeak = Math.max(originalPeak, raw[j]);
    if (originalPeak < options.minPeakAmplitude) continue;
    candidates.push({ y: center, value: originalPeak });
  }
  candidates.sort((a, b) => b.value - a.value || a.y - b.y);
  const picked: number[] = [];
  for (const candidate of candidates) {
    if (picked.some(existing => Math.abs(existing - candidate.y) < options.minPeakDistanceBins)) continue;
    picked.push(candidate.y);
    if (picked.length >= options.maxAnchorsPerFrame) break;
  }
  return picked.sort((a, b) => a - b);
}

export function extractSpectralSkeleton(
  spectralData: SpectralData,
  durationSec: number = DURATION,
  options?: ExtractSpectralSkeletonOptions,
): CarrierSpectralSkeleton {
  const cfg = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
  const width = spectralData.width;
  const height = spectralData.height;
  const smoothedColumns: Float32Array[] = [];
  for (let x = 0; x < width; x++) {
    smoothedColumns.push(smoothColumn(spectralData.getColumn(x), cfg.verticalSmoothingRadius));
  }

  const anchorsByTime: CarrierAnchor[][] = Array.from({ length: width }, () => []);
  let previousCenters: number[] = [];

  for (let x = 0; x < width; x++) {
    const column = smoothedColumns[x];
    const prev = x > 0 ? smoothedColumns[x - 1] : null;
    const next = x < width - 1 ? smoothedColumns[x + 1] : null;
    const raw = spectralData.getColumn(x);
    const peaks = pickPeaks(column, raw, cfg);
    const anchors: CarrierAnchor[] = peaks.map((centerBin, index) => {
      const peakValue = column[centerBin] ?? 0;
      const bandwidthBins = estimateBandwidthBins(column, centerBin, peakValue);
      const ridgeness = computeLocalContrast(column, centerBin, peakValue);
      const transientStrength = computeTransientStrength(prev, next, centerBin, peakValue);
      const continuityDistance = previousCenters.length
        ? Math.min(...previousCenters.map((prevCenter) => Math.abs(prevCenter - centerBin)))
        : 0;
      const continuity = previousCenters.length
        ? Math.max(0, 1 - continuityDistance / 18)
        : 1;
      const regime = classifyRegime(peakValue, ridgeness, bandwidthBins, transientStrength);
      return {
        id: `carrier-anchor-${x}-${index}-${centerBin}`,
        timeIndex: x,
        centerBin,
        centerHz: carrierBinToHz(centerBin, height),
        bandwidthBins,
        bandwidthHz: Math.abs(carrierBinToHz(Math.min(height - 1, centerBin + Math.ceil(bandwidthBins / 2)), height) - carrierBinToHz(Math.max(0, centerBin - Math.ceil(bandwidthBins / 2)), height)),
        energy: Math.max(peakValue, ...raw.subarray(Math.max(0, centerBin - cfg.verticalSmoothingRadius), Math.min(height, centerBin + cfg.verticalSmoothingRadius + 1))),
        ridgeness,
        continuity,
        regime,
        clusterId: regime === 'cluster' ? `cluster-${x}-${index}` : null,
      } satisfies CarrierAnchor;
    });
    anchorsByTime[x] = anchors;
    previousCenters = anchors.map((anchor) => anchor.centerBin);
  }

  return {
    width,
    height,
    durationSec,
    anchorsByTime,
  };
}
