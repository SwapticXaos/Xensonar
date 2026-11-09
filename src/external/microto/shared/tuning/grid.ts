export type GridTuning = "12edo" | "17edo" | "19edo" | "22edo" | "31edo" | "ji" | "bp";
export type QuantizeSubdivision = "16" | "32" | "64";

export type TuningGridConfig = {
  minFreq: number;
  maxFreq: number;
  height: number;
  jiRatios: number[];
  bpRatios: number[];
};

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Clamp frequency into [min, max] by octave folding (double/halve). Used by arena, resonance,
 * and sequencer for pitch bounds. Shared tuning/math (vision §6).
 */
export function clampFreq(freq: number, min = 90, max = 1800): number {
  let out = freq;
  while (out < min) out *= 2;
  while (out > max) out *= 0.5;
  return out;
}

export const quantizeDivisor = (subdivision?: QuantizeSubdivision) =>
  subdivision === "64" ? 16 : subdivision === "32" ? 8 : 4;

/** BPM range aligned with resonance defaults (config/defaults.ts quantizeBpm 30–240). */
export const QUANTIZE_BPM_MIN = 30;
export const QUANTIZE_BPM_MAX = 240;

export const quantizeStepSeconds = (bpm: number, subdivision?: QuantizeSubdivision) =>
  60 / clamp(bpm, QUANTIZE_BPM_MIN, QUANTIZE_BPM_MAX) / quantizeDivisor(subdivision);

export const freqFromY = (y: number, config: TuningGridConfig) => {
  const normalized = 1 - clamp(y, 0, config.height) / config.height;
  return config.minFreq + normalized * (config.maxFreq - config.minFreq);
};

export const yFromFreq = (freq: number, config: TuningGridConfig) => {
  const normalized = (freq - config.minFreq) / (config.maxFreq - config.minFreq);
  return clamp((1 - normalized) * config.height, 0, config.height);
};

export const buildGridFrequencies = (base: number, tuning: GridTuning, config: TuningGridConfig) => {
  const frequencies: number[] = [];
  const octaves = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

  if (tuning === "ji") {
    for (const oct of octaves) {
      for (const ratio of config.jiRatios) {
        const freq = base * ratio * Math.pow(2, oct);
        if (freq >= config.minFreq && freq <= config.maxFreq) frequencies.push(freq);
      }
    }
  } else if (tuning === "bp") {
    const tritaveShifts = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
    for (const tri of tritaveShifts) {
      for (let step = 0; step < config.bpRatios.length; step += 1) {
        const freq = base * config.bpRatios[step] * Math.pow(3, tri);
        if (freq >= config.minFreq && freq <= config.maxFreq) frequencies.push(freq);
      }
    }
  } else {
    const edo = parseInt(tuning.replace("edo", ""), 10);
    for (const oct of octaves) {
      for (let step = 0; step < edo; step += 1) {
        const ratio = Math.pow(2, step / edo);
        const freq = base * ratio * Math.pow(2, oct);
        if (freq >= config.minFreq && freq <= config.maxFreq) frequencies.push(freq);
      }
    }
  }

  return [...new Set(frequencies.map((f) => Number(f.toFixed(4))))].sort((a, b) => a - b);
};

export const snapYToGrid = (y: number, base: number, tuning: GridTuning, config: TuningGridConfig) => {
  const target = freqFromY(y, config);
  const grid = buildGridFrequencies(base, tuning, config);
  if (!grid.length) return clamp(y, 0, config.height);
  let nearest = grid[0];
  let best = Math.abs(target - nearest);
  for (let i = 1; i < grid.length; i += 1) {
    const d = Math.abs(target - grid[i]);
    if (d < best) {
      best = d;
      nearest = grid[i];
    }
  }
  return yFromFreq(nearest, config);
};

export const descendingGridFrequency = (
  base: number,
  tuning: GridTuning,
  stepDown: number,
  config: TuningGridConfig,
) => {
  const gridDesc = buildGridFrequencies(base, tuning, config)
    .filter((f) => f <= config.maxFreq)
    .sort((a, b) => b - a);
  if (!gridDesc.length) return null;
  const baseIdx = gridDesc.findIndex((f) => f <= base * 1.001);
  const start = baseIdx >= 0 ? baseIdx : 0;
  return gridDesc[Math.min(gridDesc.length - 1, start + stepDown)] ?? gridDesc[gridDesc.length - 1];
};

export const stepYToGrid = (
  currentY: number,
  direction: 1 | -1,
  base: number,
  tuning: GridTuning,
  config: TuningGridConfig,
) => {
  const target = freqFromY(currentY, config);
  const grid = buildGridFrequencies(base, tuning, config).sort((a, b) => a - b);
  if (!grid.length) return currentY;
  let idx = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < grid.length; i += 1) {
    const d = Math.abs(grid[i] - target);
    if (d < best) {
      best = d;
      idx = i;
    }
  }
  const next = clamp(idx + direction, 0, grid.length - 1);
  return yFromFreq(grid[next], config);
};

/** Bound helpers for a fixed TuningGridConfig; single place for resonance/orchestration to get freqFromY, yFromFreq, etc. */
export function createBoundGridHelpers(config: TuningGridConfig) {
  return {
    freqFromY: (y: number) => freqFromY(y, config),
    yFromFreq: (freq: number) => yFromFreq(freq, config),
    snapYToGrid: (y: number, base: number, tuning: GridTuning) => snapYToGrid(y, base, tuning, config),
    descendingGridFrequency: (base: number, tuning: GridTuning, stepDown: number) =>
      descendingGridFrequency(base, tuning, stepDown, config),
    stepYToGrid: (currentY: number, direction: 1 | -1, base: number, tuning: GridTuning) =>
      stepYToGrid(currentY, direction, base, tuning, config),
  };
}
