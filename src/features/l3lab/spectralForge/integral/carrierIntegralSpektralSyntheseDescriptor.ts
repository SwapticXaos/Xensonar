/**
 * carrierIntegralSpektralSyntheseDescriptor — 3.2.91-7.7.12
 *
 * Pure, deterministic image/SpectralData descriptor for SpektralSynthese.
 * The live instrument receives only concrete descriptor and audio-identity
 * contracts; project-method vocabulary stays in the toolkit.
 */
import type { SpectralData } from '../audio/SpectralData';
import { carrierIntegralHash31, carrierIntegralRound3 } from './carrierIntegralStableIdentity';

export type SpektralSyntheseDescriptor = {
  hasMaterial: boolean;
  density: number;
  contrast: number;
  vertCenter: number;
  /**
   * 0 = mostly vertical strokes / horizontal gradients, 1 = mostly horizontal bands / vertical gradients.
   * This remains a musical-direction candidate and is protected by descriptor tests.
   */
  horizontality: number;
  edgeDensity: number;
  /** Histogram-based local energy entropy; not merely density/occupancy. */
  entropy: number;
  grainTexture: number;
  registerSpan: number;
  transientPositions: readonly number[];
  /** Compact structural digest from coarse column-energy/centroid bins. */
  spectralStructureKey: string;
  descriptorKey: string;
};

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
};

const round = (value: number): number => carrierIntegralRound3(clamp01(value));
const quantize1000 = (value: number): number => Math.round(clamp01(value) * 1000);

const EMPTY_DESCRIPTOR: SpektralSyntheseDescriptor = {
  hasMaterial: false,
  density: 0,
  contrast: 0,
  vertCenter: 0.5,
  horizontality: 0.5,
  edgeDensity: 0,
  entropy: 0,
  grainTexture: 0,
  registerSpan: 0,
  transientPositions: [],
  spectralStructureKey: 'spektral-synthese-structure-empty',
  descriptorKey: 'spektral-synthese-descriptor-empty-v2',
};

function buildCoarseStructureKey(
  energies: Float32Array,
  centroids: Float32Array,
  active: Uint8Array,
): string {
  const width = energies.length;
  if (width < 1) return 'spektral-synthese-structure-empty';
  const binCount = Math.min(16, Math.max(4, width));
  const parts: string[] = ['spektral-synthese-structure-v2', String(width), String(binCount)];
  for (let bin = 0; bin < binCount; bin += 1) {
    const lo = Math.floor((bin / binCount) * width);
    const hi = Math.max(lo + 1, Math.floor(((bin + 1) / binCount) * width));
    let energySum = 0;
    let centroidSum = 0;
    let activeCount = 0;
    for (let x = lo; x < Math.min(width, hi); x += 1) {
      const energy = energies[x] ?? 0;
      energySum += energy;
      if (active[x]) {
        centroidSum += centroids[x] ?? 0.5;
        activeCount += 1;
      }
    }
    const divisor = Math.max(1, hi - lo);
    parts.push(`${Math.round((energySum / divisor) * 31)}:${Math.round(((activeCount > 0 ? centroidSum / activeCount : 0.5)) * 31)}`);
  }
  return carrierIntegralHash31(parts.join('|'));
}

export function computeSpektralSyntheseDescriptor(
  spectralData: SpectralData | null | undefined,
): SpektralSyntheseDescriptor {
  if (!spectralData || spectralData.width < 1 || spectralData.height < 1) return EMPTY_DESCRIPTOR;

  const width = spectralData.width;
  const height = spectralData.height;
  const heightDen = Math.max(1, height - 1);

  let minValue = 1;
  let maxValue = 0;
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      const raw = clamp01(spectralData.get(x, y));
      minValue = Math.min(minValue, raw);
      maxValue = Math.max(maxValue, raw);
    }
  }

  const rawSpan = Math.max(0, maxValue - minValue);
  if (rawSpan <= 0.008 && maxValue <= 0.018) return EMPTY_DESCRIPTOR;

  // Prevent dark canvas/background floor from becoming phantom painted material.
  const backgroundFloor = minValue > 0.002 ? minValue : 0;
  const activeThreshold = Math.max(
    backgroundFloor + 0.006,
    backgroundFloor + rawSpan * 0.035,
    0.01,
  );
  const activeValueDen = Math.max(1e-6, 1 - backgroundFloor);
  const energyNormalizer = Math.max(1, height * 0.12);

  const energies = new Float32Array(width);
  const rawColumnEnergy = new Float32Array(width);
  const centroids = new Float32Array(width);
  const spreads = new Float32Array(width);
  const grainWeighted = new Float32Array(width);
  const grainWeights = new Float32Array(width);
  const active = new Uint8Array(width);
  const entropyBins = new Float64Array(16);

  let activeCellCount = 0;
  let activeEnergySum = 0;
  let brightnessSum = 0;
  let brightnessSumSq = 0;
  let gradientXSum = 0;
  let gradientYSum = 0;
  let gradientMagnitudeSum = 0;
  let gradientSampleCount = 0;

  for (let x = 0; x < width; x += 1) {
    let energy = 0;
    let weightedY = 0;
    let weightedY2 = 0;
    let grainNum = 0;
    let grainDen = 0;

    for (let y = 0; y < height; y += 1) {
      const raw = clamp01(spectralData.get(x, y));
      brightnessSum += raw;
      brightnessSumSq += raw * raw;
      if (raw <= activeThreshold) continue;

      const value = clamp01((raw - backgroundFloor) / activeValueDen);
      if (value <= 1e-6) continue;
      const yNorm = (height - 1 - y) / heightDen;
      energy += value;
      activeEnergySum += value;
      activeCellCount += 1;
      weightedY += value * yNorm;
      weightedY2 += value * yNorm * yNorm;
      const grain = clamp01(spectralData.getGrain(x, y));
      grainNum += grain * value;
      grainDen += value;
      entropyBins[Math.min(entropyBins.length - 1, Math.floor(value * entropyBins.length))] += value;

      const rightRaw = x < width - 1 ? clamp01(spectralData.get(x + 1, y)) : raw;
      const downRaw = y < height - 1 ? clamp01(spectralData.get(x, y + 1)) : raw;
      const rightValue = clamp01((rightRaw - backgroundFloor) / activeValueDen);
      const downValue = clamp01((downRaw - backgroundFloor) / activeValueDen);
      const dX = Math.abs(rightValue - value);
      const dY = Math.abs(downValue - value);
      gradientXSum += dX;
      gradientYSum += dY;
      gradientMagnitudeSum += Math.max(dX, dY);
      gradientSampleCount += 1;
    }

    rawColumnEnergy[x] = energy;
    if (energy > 1e-6) {
      active[x] = 1;
      energies[x] = Math.min(1, energy / energyNormalizer);
      const centroid = weightedY / energy;
      centroids[x] = centroid;
      spreads[x] = clamp01(Math.sqrt(Math.max(0, weightedY2 / energy - centroid * centroid)) / 0.12);
      grainWeighted[x] = grainNum;
      grainWeights[x] = grainDen;
    } else {
      centroids[x] = 0.5;
    }
  }

  if (activeCellCount < 1 || activeEnergySum <= 1e-6) {
    return {
      ...EMPTY_DESCRIPTOR,
      spectralStructureKey: carrierIntegralHash31(['spektral-synthese-structure-v2-empty', width, height, quantize1000(backgroundFloor), quantize1000(maxValue)].join('|')),
      descriptorKey: carrierIntegralHash31(['spektral-synthese-descriptor-v2-empty', width, height, quantize1000(backgroundFloor), quantize1000(maxValue)].join('|')),
    };
  }

  let activeColumnCount = 0;
  let energySum = 0;
  let centroidSum = 0;
  let spreadSum = 0;
  let grainNumSum = 0;
  let grainDenSum = 0;

  for (let x = 0; x < width; x += 1) {
    if (!active[x]) continue;
    activeColumnCount += 1;
    energySum += energies[x]!;
    centroidSum += centroids[x]!;
    spreadSum += spreads[x]!;
    grainNumSum += grainWeighted[x]!;
    grainDenSum += grainWeights[x]!;
  }

  const divisor = Math.max(1, activeColumnCount);
  const energyMean = energySum / divisor;
  const centroidMean = centroidSum / divisor;
  const rawMean = brightnessSum / Math.max(1, width * height);
  const rawVariance = Math.max(0, brightnessSumSq / Math.max(1, width * height) - rawMean * rawMean);

  let energyVariance = 0;
  let centroidVariance = 0;
  let edgeSum = 0;
  let edgeCount = 0;
  let previousEnergy = 0;
  let maxRawColumnEnergy = 0;
  let minCentroid = 1;
  let maxCentroid = 0;
  const transientCandidates: Array<{ ratio: number; diff: number }> = [];

  for (let x = 0; x < width; x += 1) maxRawColumnEnergy = Math.max(maxRawColumnEnergy, rawColumnEnergy[x] ?? 0);
  const minTransientDelta = Math.max(0.018, maxRawColumnEnergy * 0.12);

  for (let x = 0; x < width; x += 1) {
    const currentEnergy = active[x] ? energies[x]! : 0;
    const rawEnergy = rawColumnEnergy[x] ?? 0;
    if (active[x]) {
      const centroid = centroids[x]!;
      energyVariance += (currentEnergy - energyMean) ** 2;
      centroidVariance += (centroid - centroidMean) ** 2;
      minCentroid = Math.min(minCentroid, centroid);
      maxCentroid = Math.max(maxCentroid, centroid);
    }
    if (x > 0) {
      const diff = Math.abs(currentEnergy - previousEnergy);
      edgeSum += diff;
      edgeCount += 1;
      const rawDiff = Math.abs(rawEnergy - (rawColumnEnergy[x - 1] ?? 0));
      const relativeDiff = rawDiff / Math.max(1e-6, Math.max(rawEnergy, rawColumnEnergy[x - 1] ?? 0));
      if (rawDiff > minTransientDelta && relativeDiff > 0.22) {
        transientCandidates.push({ ratio: x / Math.max(1, width - 1), diff: rawDiff * relativeDiff });
      }
    }
    previousEnergy = currentEnergy;
  }

  transientCandidates.sort((a, b) => b.diff - a.diff);
  const transientPositions = transientCandidates
    .slice(0, 5)
    .map((candidate) => carrierIntegralRound3(clamp01(candidate.ratio)))
    .sort((a, b) => a - b);

  let histogramEntropy = 0;
  if (activeEnergySum > 1e-9) {
    for (let index = 0; index < entropyBins.length; index += 1) {
      const probability = entropyBins[index]! / activeEnergySum;
      if (probability > 1e-12) histogramEntropy -= probability * Math.log2(probability);
    }
    histogramEntropy /= Math.log2(entropyBins.length);
  }

  const totalGradient = gradientXSum + gradientYSum;
  const gradientHorizontality = totalGradient > 1e-9 ? gradientYSum / totalGradient : 0.5;
  const averageEdge = gradientSampleCount > 0 ? gradientMagnitudeSum / gradientSampleCount : 0;
  const spectralStructureKey = buildCoarseStructureKey(energies, centroids, active);

  const descriptor = {
    hasMaterial: true,
    density: round(activeColumnCount / Math.max(1, width)),
    contrast: round(Math.max(Math.sqrt(energyVariance / divisor) * 2.4, Math.sqrt(rawVariance) * 3.2)),
    vertCenter: round(centroidMean),
    horizontality: round(gradientHorizontality),
    edgeDensity: round(Math.max(edgeCount > 0 ? (edgeSum / edgeCount) * 3.2 : 0, averageEdge * 3.0)),
    entropy: round(Math.max(histogramEntropy * 0.82, spreadSum / divisor * 0.32)),
    grainTexture: round(grainDenSum > 1e-6 ? grainNumSum / grainDenSum : 0),
    registerSpan: round((maxCentroid - minCentroid) / 0.85),
    transientPositions,
    spectralStructureKey,
  } satisfies Omit<SpektralSyntheseDescriptor, 'descriptorKey'>;

  const descriptorKey = carrierIntegralHash31([
    'spektral-synthese-descriptor-v2',
    width,
    height,
    quantize1000(backgroundFloor),
    quantize1000(maxValue),
    activeColumnCount,
    activeCellCount,
    descriptor.density,
    descriptor.contrast,
    descriptor.vertCenter,
    descriptor.horizontality,
    descriptor.edgeDensity,
    descriptor.entropy,
    descriptor.grainTexture,
    descriptor.registerSpan,
    descriptor.transientPositions.join(','),
    descriptor.spectralStructureKey,
  ].join('|'));

  return {
    ...descriptor,
    descriptorKey,
  };
}
