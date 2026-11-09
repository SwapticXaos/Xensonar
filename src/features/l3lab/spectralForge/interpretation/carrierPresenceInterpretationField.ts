import type { Forge3PreviewField } from '../../forge3/bodyField';
import type { SpectralData } from '../audio/SpectralData';

export type CarrierPresenceFieldStats = {
  activeCellCount: number;
  totalPaintedEnergy: number;
  meanPaintedEnergy: number;
  maxPaintedEnergy: number;
  activeCoverageRatio: number;
  earlyEnergy: number;
  lateEnergy: number;
  earlyLateEnergySkew: number;
  timeEnergy: Float32Array;
  bandEnergy: Float32Array;
  activeColumnCount: number;
  activeBandCount: number;
  firstActiveColumn: number | null;
  lastActiveColumn: number | null;
  activeDurationRatio: number;
  maxColumnEnergy: number;
  meanActiveColumnEnergy: number;
};

export type CarrierPresenceField = {
  width: number;
  height: number;
  energy: Float32Array;
  paintedPresence: Float32Array;
  thickness: Float32Array;
  density: Float32Array;
  stats: CarrierPresenceFieldStats;
};

export type CarrierInterpretationFieldStats = {
  meanSourceWeight: number;
  meanBody: number;
  meanAir: number;
  meanImpact: number;
  meanTrace: number;
  dominantLayer: 'body' | 'air' | 'impact' | 'trace' | 'none';
};

export type CarrierInterpretationField = {
  width: number;
  height: number;
  sourceTime: Float32Array;
  sourceBand: Float32Array;
  sourceWeight: Float32Array;
  bodyBias: Float32Array;
  airBias: Float32Array;
  impactBias: Float32Array;
  traceBias: Float32Array;
  stats: CarrierInterpretationFieldStats;
};

export type CarrierPresenceInterpretationBridge = {
  presence: CarrierPresenceField;
  interpretation: CarrierInterpretationField;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function safeArray(source: Float32Array | undefined, size: number) {
  return source && source.length === size ? source : new Float32Array(size);
}

function computePresenceStats(energy: Float32Array, width: number, height: number): CarrierPresenceFieldStats {
  const size = Math.max(1, width * height);
  const timeEnergy = new Float32Array(Math.max(0, width));
  const bandEnergy = new Float32Array(Math.max(0, height));
  const activeThreshold = 0.0025;
  let activeCellCount = 0;
  let totalPaintedEnergy = 0;
  let maxPaintedEnergy = 0;
  let earlyEnergy = 0;
  let lateEnergy = 0;
  const split = Math.max(1, Math.floor(width / 2));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      const value = Math.max(0, energy[idx] ?? 0);
      if (value > activeThreshold) activeCellCount += 1;
      totalPaintedEnergy += value;
      timeEnergy[x] += value;
      bandEnergy[y] += value;
      maxPaintedEnergy = Math.max(maxPaintedEnergy, value);
      if (x < split) earlyEnergy += value;
      else lateEnergy += value;
    }
  }

  let activeColumnCount = 0;
  let activeColumnEnergy = 0;
  let firstActiveColumn: number | null = null;
  let lastActiveColumn: number | null = null;
  let maxColumnEnergy = 0;
  const activeColumnThreshold = activeThreshold * Math.max(1, height * 0.35);
  for (let x = 0; x < width; x += 1) {
    const columnEnergy = timeEnergy[x] ?? 0;
    maxColumnEnergy = Math.max(maxColumnEnergy, columnEnergy);
    if (columnEnergy > activeColumnThreshold) {
      activeColumnCount += 1;
      activeColumnEnergy += columnEnergy;
      if (firstActiveColumn === null) firstActiveColumn = x;
      lastActiveColumn = x;
    }
  }

  let activeBandCount = 0;
  const activeBandThreshold = activeThreshold * Math.max(1, width * 0.35);
  for (let y = 0; y < height; y += 1) {
    if ((bandEnergy[y] ?? 0) > activeBandThreshold) activeBandCount += 1;
  }

  const meanPaintedEnergy = totalPaintedEnergy / size;
  const earlyLateEnergySkew = (earlyEnergy - lateEnergy) / Math.max(1e-6, earlyEnergy + lateEnergy);

  return {
    activeCellCount,
    totalPaintedEnergy,
    meanPaintedEnergy,
    maxPaintedEnergy,
    activeCoverageRatio: activeCellCount / size,
    earlyEnergy,
    lateEnergy,
    earlyLateEnergySkew,
    timeEnergy,
    bandEnergy,
    activeColumnCount,
    activeBandCount,
    firstActiveColumn,
    lastActiveColumn,
    activeDurationRatio: width > 0 ? activeColumnCount / width : 0,
    maxColumnEnergy,
    meanActiveColumnEnergy: activeColumnCount > 0 ? activeColumnEnergy / activeColumnCount : 0,
  };
}

function computeInterpretationStats(
  sourceWeight: Float32Array,
  bodyBias: Float32Array,
  airBias: Float32Array,
  impactBias: Float32Array,
  traceBias: Float32Array,
  presence: Float32Array,
): CarrierInterpretationFieldStats {
  let weightedCells = 0;
  let sourceWeightSum = 0;
  let bodySum = 0;
  let airSum = 0;
  let impactSum = 0;
  let traceSum = 0;

  for (let i = 0; i < presence.length; i += 1) {
    const w = Math.max(0, presence[i] ?? 0);
    if (w <= 0.0025) continue;
    weightedCells += 1;
    sourceWeightSum += (sourceWeight[i] ?? 0) * w;
    bodySum += (bodyBias[i] ?? 0) * w;
    airSum += (airBias[i] ?? 0) * w;
    impactSum += (impactBias[i] ?? 0) * w;
    traceSum += (traceBias[i] ?? 0) * w;
  }

  const divisor = Math.max(1e-6, Array.from(presence).reduce((sum, value) => sum + Math.max(0, value), 0));
  const meanSourceWeight = sourceWeightSum / divisor;
  const meanBody = bodySum / divisor;
  const meanAir = airSum / divisor;
  const meanImpact = impactSum / divisor;
  const meanTrace = traceSum / divisor;
  let dominantLayer: CarrierInterpretationFieldStats['dominantLayer'] = 'none';
  let dominantValue = 0;
  const candidateLayers: Array<[CarrierInterpretationFieldStats['dominantLayer'], number]> = [
    ['body', meanBody],
    ['air', meanAir],
    ['impact', meanImpact],
    ['trace', meanTrace],
  ];
  for (const [layer, value] of candidateLayers) {
    if (value > dominantValue) {
      dominantLayer = layer;
      dominantValue = value;
    }
  }

  return {
    meanSourceWeight: weightedCells ? meanSourceWeight : 0,
    meanBody: weightedCells ? meanBody : 0,
    meanAir: weightedCells ? meanAir : 0,
    meanImpact: weightedCells ? meanImpact : 0,
    meanTrace: weightedCells ? meanTrace : 0,
    dominantLayer,
  };
}

function buildDensityFromEnergy(energy: Float32Array, width: number, height: number) {
  const density = new Float32Array(energy.length);
  if (!width || !height) return density;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let yy = Math.max(0, y - 1); yy <= Math.min(height - 1, y + 1); yy += 1) {
        for (let xx = Math.max(0, x - 1); xx <= Math.min(width - 1, x + 1); xx += 1) {
          sum += Math.max(0, energy[yy * width + xx] ?? 0);
          count += 1;
        }
      }
      density[y * width + x] = count ? clamp01(sum / count) : 0;
    }
  }

  return density;
}

export function buildCarrierPresenceInterpretationBridge(
  spectralData: SpectralData,
  forge3Field?: Forge3PreviewField | null,
): CarrierPresenceInterpretationBridge {
  const width = spectralData.width;
  const height = spectralData.height;
  const size = width * height;
  const energy = spectralData.data;
  const paintedPresence = energy;
  const fieldBodyMass = safeArray(forge3Field?.bodyMass, size);
  const thickness = fieldBodyMass.length === size ? fieldBodyMass : energy;
  const density = buildDensityFromEnergy(energy, width, height);
  const sourceTime = safeArray(forge3Field?.sourceTime, size);
  const sourceBand = safeArray(forge3Field?.sourceBand, size);
  const sourceWeight = safeArray(forge3Field?.sourceWeight, size);
  const bodyBias = safeArray(forge3Field?.bodyBias, size);
  const airBias = safeArray(forge3Field?.airBias, size);
  const impactBias = safeArray(forge3Field?.impactBias, size);
  const traceBias = safeArray(forge3Field?.traceBias, size);

  const presence: CarrierPresenceField = {
    width,
    height,
    energy,
    paintedPresence,
    thickness,
    density,
    stats: computePresenceStats(energy, width, height),
  };

  return {
    presence,
    interpretation: {
      width,
      height,
      sourceTime,
      sourceBand,
      sourceWeight,
      bodyBias,
      airBias,
      impactBias,
      traceBias,
      stats: computeInterpretationStats(sourceWeight, bodyBias, airBias, impactBias, traceBias, paintedPresence),
    },
  };
}
