import {
  DRONE_MAX_FREQ,
  GAME_HEIGHT,
  GAME_WIDTH,
  JI_NODES,
  DRONE_JI_OVERTONES,
  getRasterPeriodRatio,
  getRasterStepCents,
} from "../domain/instrumentData";
import type {
  BassPattern,
  DrumPattern,
  GridTuning,
  ParticleGradientPreset,
  QuantizeGrid,
  WaveDecayPreset,
  WaveTimbreGradientPreset,
  WaveVolumeGradientPreset,
} from "../domain/instrumentData";
import type { ParticleSystem } from "../domain/instrumentData";
import type { PsyBassStyle } from "../../resonance/psybass/types";
import type { ParticleGradientAxes } from "../../resonance/modalBody";
import type { WaveOvertoneArpPattern, WaveOvertoneArpRate } from "./resonanceUiConfig";

export type ActiveWaveOvertone = { node: (typeof DRONE_JI_OVERTONES)[number]; amount: number };

export const BASE_WAVE_MAX_RADIUS = 168;
export const BASE_WAVE_SPEED = 2.5;
export const MAX_RECORDING_MS = 15 * 60 * 1000;
export const XENSONAR_LOOP_REFERENCE_BPM = 108;

export const hexToRgba = (hex: string, alpha: number) => {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((ch) => ch + ch).join("") : clean;
  const value = parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const isRhythmForgePattern = (pattern: DrumPattern | BassPattern) => pattern.startsWith("forge_");
export const isPsyBassPattern = (pattern: BassPattern) => pattern.startsWith("psy_");
export const getRhythmForgeFlavor = (pattern: DrumPattern | BassPattern): "rooted" | "braided" | "fractured" => {
  if (pattern === "forge_braided") return "braided";
  if (pattern === "forge_fractured") return "fractured";
  return "rooted";
};
export const getPsyBassStyle = (pattern: BassPattern): PsyBassStyle => {
  switch (pattern) {
    case "psy_rolling": return "rolling";
    case "psy_gallop": return "gallop";
    case "psy_triplet": return "tripletGhost";
    case "psy_dark": return "darkForest";
    default: return "classicOffbeat";
  }
};
export const foldFreqIntoRange = (freq: number, min: number, max: number) => {
  let out = Number.isFinite(freq) && freq > 0 ? freq : min;
  while (out < min) out *= 2;
  while (out > max) out /= 2;
  return clamp(out, min, max);
};
export const getSupportedRecordingMimeType = () => {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? "";
};
export const getQuantizeStepSeconds = (bpm: number, grid: QuantizeGrid, referenceBars = 1) => {
  const safeBpm = Math.max(1, bpm);
  const safeGrid = Math.max(1, Math.min(256, Math.round(Number.isFinite(grid) ? grid : 16)));
  const safeReferenceBars = Math.max(0.125, Math.min(16, Number.isFinite(referenceBars) ? referenceBars : 1));
  return (240 / safeBpm) * safeReferenceBars / safeGrid;
};
export const getWaveOvertoneArpStepSeconds = (bpm: number, rate: WaveOvertoneArpRate) =>
  getQuantizeStepSeconds(bpm, rate as QuantizeGrid);
export const buildWaveOvertoneArpSequence = (
  activeMix: ActiveWaveOvertone[],
  pattern: WaveOvertoneArpPattern,
  steps: number,
) => {
  const totalSteps = Math.max(1, Math.round(steps));
  if (!activeMix.length) return [] as ActiveWaveOvertone[];

  const ascending = [...activeMix].sort((a, b) => a.node.ratio - b.node.ratio || b.amount - a.amount);
  const descending = [...ascending].reverse();
  const upDown = ascending.length > 1 ? [...ascending, ...descending.slice(1, -1)] : ascending;

  if (pattern === "random") {
    const weighted = ascending.map((entry) => ({ entry, weight: Math.max(0.05, entry.amount * entry.amount + 0.08) }));
    let previousLabel = "";
    const out: ActiveWaveOvertone[] = [];
    for (let stepIndex = 0; stepIndex < totalSteps; stepIndex += 1) {
      const pool = weighted.filter(({ entry }) => weighted.length <= 1 || entry.node.label !== previousLabel);
      const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
      let cursor = Math.random() * Math.max(0.0001, totalWeight);
      let chosen = pool[pool.length - 1]?.entry ?? ascending[0];
      for (const item of pool) {
        cursor -= item.weight;
        if (cursor <= 0) {
          chosen = item.entry;
          break;
        }
      }
      out.push(chosen);
      previousLabel = chosen.node.label;
    }
    return out;
  }

  const source = pattern === "down" ? descending : pattern === "updown" ? upDown : ascending;
  return Array.from({ length: totalSteps }, (_, idx) => source[idx % source.length]);
};
const RESONANCE_VIEWPORT_SPAN_OCTAVES = 3;
let resonanceViewportBaseHz = DRONE_MAX_FREQ;

export const setResonanceViewportBaseHz = (baseHz: number) => {
  resonanceViewportBaseHz = Number.isFinite(baseHz) && baseHz > 0 ? baseHz : DRONE_MAX_FREQ;
};
export const getResonanceViewportRangeForBase = (baseHz: number) => {
  const safeBase = Number.isFinite(baseHz) && baseHz > 0 ? baseHz : DRONE_MAX_FREQ;
  const min = safeBase / Math.pow(2, RESONANCE_VIEWPORT_SPAN_OCTAVES);
  return {
    min,
    max: safeBase,
  };
};
export const getResonanceViewportRange = () => getResonanceViewportRangeForBase(resonanceViewportBaseHz);
export const freqFromY = (y: number) => {
  const { min, max } = getResonanceViewportRange();
  const normalized = 1 - clamp(y, 0, GAME_HEIGHT) / GAME_HEIGHT;
  return min + normalized * (max - min);
};
export const yFromFreq = (freq: number) => {
  const { min, max } = getResonanceViewportRange();
  const normalized = (freq - min) / (max - min);
  return clamp((1 - normalized) * GAME_HEIGHT, 0, GAME_HEIGHT);
};
export const gradientPresetValue = (preset: ParticleGradientPreset, normalized: number) => {
  const n = clamp(normalized, 0, 1);
  const centerDist = Math.abs(n - 0.5) * 2;
  switch (preset) {
    case "bright_max": return n;
    case "bright_min": return 1 - n;
    case "warm_center": return 1 - centerDist;
    case "edge_spark": return centerDist;
    case "metal_max": return Math.pow(n, 0.7);
    case "wood_min": return Math.pow(1 - n, 0.7);
    case "none":
    default: return 0;
  }
};
export const computeParticleGradientAxes = (
  x: number,
  y: number,
  xPreset: ParticleGradientPreset,
  yPreset: ParticleGradientPreset,
): ParticleGradientAxes => {
  const xNorm = clamp(x / GAME_WIDTH, 0, 1);
  const yNorm = clamp(1 - y / GAME_HEIGHT, 0, 1);
  const brightness = gradientPresetValue(xPreset, xNorm);
  const attackHardness = gradientPresetValue(yPreset, yNorm);
  return { brightness: clamp(brightness, 0, 1), attackHardness: clamp(attackHardness, 0, 1) };
};
export type WaveTimbreGradientState = {
  amount: number;
  wire: number;
  shine: number;
  coreCutoffMul: number;
  coreCutoffAdd: number;
  coreResonanceAdd: number;
  durationMul: number;
  coreVolumeMul: number;
  dryLateMul: number;
  colorMix: number;
  colorDelay: number;
  colorAttack: number;
  exciterPreGain: number;
  exciterDrive: number;
  jawariFreqStart: number;
  jawariFreqEnd: number;
  jawariQ: number;
  jawariGain: number;
  jawariDrive: number;
  vowel1Start: number;
  vowel1End: number;
  vowel2Start: number;
  vowel2End: number;
  vowel1Q: number;
  vowel2Q: number;
  vowel1Gain: number;
  vowel2Gain: number;
  shineHighpassStart: number;
  shineHighpassEnd: number;
  shineGain: number;
};
const smoothstep01 = (value: number) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
export const makeDriveCurve = (amount: number) => {
  const k = clamp(amount, 0.75, 8);
  const samples = 1024;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * k);
  }
  return curve;
};
export const computeWaveTimbreGradientState = (x: number, enabled: boolean, preset: WaveTimbreGradientPreset): WaveTimbreGradientState => {
  if (!enabled || preset === "none") {
    return {
      amount: 0, wire: 0, shine: 0, coreCutoffMul: 1, coreCutoffAdd: 0, coreResonanceAdd: 0, durationMul: 1, coreVolumeMul: 1,
      dryLateMul: 0.3, colorMix: 0, colorDelay: 0.001, colorAttack: 0.002, exciterPreGain: 1, exciterDrive: 1.3,
      jawariFreqStart: 1200, jawariFreqEnd: 1380, jawariQ: 4, jawariGain: 0, jawariDrive: 1.3,
      vowel1Start: 700, vowel1End: 820, vowel2Start: 2200, vowel2End: 2600, vowel1Q: 2.2, vowel2Q: 2,
      vowel1Gain: 0, vowel2Gain: 0, shineHighpassStart: 2400, shineHighpassEnd: 3200, shineGain: 0,
    };
  }
  const n = clamp(x / GAME_WIDTH, 0, 1);
  const left = smoothstep01(1 - n);
  const right = smoothstep01(n);
  const center = 1 - smoothstep01(Math.abs(n - 0.5) * 2);
  const edge = smoothstep01(Math.abs(n - 0.5) * 2);
  let wire = 0;
  let shine = 0;
  switch (preset) {
    case "sitar_rise": wire = right; shine = right * 0.08; break;
    case "psy_rise": shine = right; wire = right * 0.06; break;
    case "wire_to_psy": wire = left; shine = right; break;
    case "psy_to_wire": shine = left; wire = right; break;
    case "center_shine": shine = center; wire = center * 0.1; break;
    case "edge_tension": wire = edge * (0.52 + left * 0.34); shine = edge * (0.48 + right * 0.34); break;
    default: break;
  }
  wire = clamp(wire, 0, 1);
  shine = clamp(shine, 0, 1);
  const amount = clamp(Math.max(wire, shine), 0, 1);
  const contrast = clamp(Math.abs(wire - shine), 0, 1);
  const jawariBias = clamp(wire * 0.96 + shine * 0.12, 0, 1);
  const vowelBias = clamp(shine * 0.96 + wire * 0.16, 0, 1);
  const travel = clamp(0.14 + wire * 0.34 + shine * 0.7, 0, 1);
  return {
    amount, wire, shine,
    coreCutoffMul: 0.96 + shine * 0.18 + wire * 0.06,
    coreCutoffAdd: shine * 260 + wire * 80,
    coreResonanceAdd: wire * 0.24 + shine * 0.2,
    durationMul: 1 + wire * 0.05 - shine * 0.02,
    coreVolumeMul: 1 + amount * 0.02,
    dryLateMul: clamp(0.42 - amount * 0.16 - contrast * 0.1, 0.14, 0.42),
    colorMix: clamp(0.34 + amount * 0.34 + contrast * 0.16, 0.26, 0.82),
    colorDelay: 0.0003 + (1 - amount) * 0.0012,
    colorAttack: 0.0014 + amount * 0.0024,
    exciterPreGain: 1.45 + wire * 1.35 + shine * 1.8,
    exciterDrive: 2.1 + wire * 4.6 + shine * 5.8,
    jawariFreqStart: lerp(820, 1920, jawariBias),
    jawariFreqEnd: lerp(1180, 3240, clamp(jawariBias * 0.82 + travel * 0.5, 0, 1)),
    jawariQ: 4.2 + wire * 8.1 + shine * 0.9,
    jawariGain: 0.14 + wire * 0.62 + shine * 0.05,
    jawariDrive: 1.6 + wire * 5.2 + shine * 0.75,
    vowel1Start: lerp(560, 1320, vowelBias),
    vowel1End: lerp(920, 2480, clamp(vowelBias * 0.78 + travel * 0.42, 0, 1)),
    vowel2Start: lerp(1600, 3400, vowelBias),
    vowel2End: lerp(2500, 6400, clamp(vowelBias * 0.92 + travel * 0.64, 0, 1)),
    vowel1Q: 2.6 + wire * 1.4 + shine * 4.8,
    vowel2Q: 2.3 + wire * 0.8 + shine * 4.2,
    vowel1Gain: 0.1 + wire * 0.16 + shine * 0.26,
    vowel2Gain: 0.08 + wire * 0.06 + shine * 0.52,
    shineHighpassStart: 2100 + shine * 2300 + wire * 120,
    shineHighpassEnd: 3200 + shine * 4200 + wire * 240,
    shineGain: 0.05 + shine * 0.48 + wire * 0.02,
  };
};
export const computeWaveVolumeGradientMultiplier = (x: number, enabled: boolean, preset: WaveVolumeGradientPreset) => {
  if (!enabled || preset === "none") return 1;
  const n = smoothstep01(clamp(x / GAME_WIDTH, 0, 1));
  if (preset === "left_quiet_right_loud") return lerp(0.55, 1.35, n);
  if (preset === "left_loud_right_quiet") return lerp(1.35, 0.55, n);
  return 1;
};
export const waveIntensityScalar = (progress: number, decay: WaveDecayPreset) => {
  const p = clamp(progress, 0, 1);
  if (decay === "abrupt") return 1;
  if (decay === "linear") return Math.max(0.04, 1 - p);
  if (decay === "bellcurve") return Math.max(0.02, Math.exp(-Math.pow(p * 3.6, 2)));
  if (decay === "exponential") return Math.max(0.02, Math.exp(-p * 5.2));
  if (decay === "late_falloff") return p < 0.65 ? 1 - p * 0.18 : Math.max(0.02, 0.88 - Math.pow((p - 0.65) / 0.35, 1.35));
  return 1;
};
export const getImpactRippleHue = (system: ParticleSystem, index: number, total: number) => {
  if (total <= 0) return 0;
  if (system === "bp") {
    if (index === total - 1) return null;
    const gradientCount = Math.max(1, total - 1);
    const t = clamp(index / Math.max(1, gradientCount - 1), 0, 1);
    return 0 + t * 270;
  }
  const t = clamp(index / Math.max(1, total - 1), 0, 1);
  return 0 + t * 270;
};
const GRID_DESCRIPTOR_CACHE_LIMIT = 64;
const gridFrequencyCache = new Map<string, number[]>();
const keyboardGridFrequencyCache = new Map<string, number[]>();

const buildGridCacheListKey = (values: number[], includeZeros = true) => {
  if (!values.length) return '';
  if (includeZeros) return values.join(',');
  const sparse = values
    .map((value, idx) => (value ? `${idx}:${value}` : ''))
    .filter(Boolean);
  return sparse.join(',');
};

const buildGridCacheKey = (
  base: number,
  tuning: GridTuning,
  manualMutedSteps: number[],
  manualStepOffsets: number[],
  variant: 'grid' | 'keyboard',
) => `${variant}|${tuning}|${base.toFixed(6)}|m:${buildGridCacheListKey(manualMutedSteps)}|o:${buildGridCacheListKey(manualStepOffsets, false)}`;

const readCachedGridDescriptor = (cache: Map<string, number[]>, key: string) => {
  const cached = cache.get(key);
  if (!cached) return null;
  cache.delete(key);
  cache.set(key, cached);
  return cached;
};

const writeCachedGridDescriptor = (cache: Map<string, number[]>, key: string, values: number[]) => {
  cache.set(key, values);
  if (cache.size <= GRID_DESCRIPTOR_CACHE_LIMIT) return values;
  const oldest = cache.keys().next().value;
  if (oldest) cache.delete(oldest);
  return values;
};

export const buildGridFrequencies = (base: number, tuning: GridTuning, manualMutedSteps: number[] = [], manualStepOffsets: number[] = []) => {
  const cacheKey = buildGridCacheKey(base, tuning, manualMutedSteps, manualStepOffsets, 'grid');
  const cached = readCachedGridDescriptor(gridFrequencyCache, cacheKey);
  if (cached) return cached;
  const frequencies: number[] = [];
  const muted = new Set(manualMutedSteps);
  const { min, max } = getResonanceViewportRangeForBase(base);
  if (tuning === "ji") {
    const octaves = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
    for (const oct of octaves) {
      JI_NODES.forEach((ji, step) => {
        if (muted.has(step)) return;
        const offsetCents = (manualStepOffsets[step] ?? 0) * 10;
        const freq = base * ji.ratio * Math.pow(2, oct) * Math.pow(2, offsetCents / 1200);
        if (freq >= min && freq <= max) frequencies.push(freq);
      });
    }
    return writeCachedGridDescriptor(gridFrequencyCache, cacheKey, [...new Set(frequencies.map((f) => Number(f.toFixed(4))))].sort((a, b) => a - b));
  }

  const stepCents = getRasterStepCents(tuning);
  const periodRatio = getRasterPeriodRatio(tuning);
  if (!stepCents.length || !Number.isFinite(periodRatio) || periodRatio <= 1) return writeCachedGridDescriptor(gridFrequencyCache, cacheKey, []);

  const minShift = Math.floor(Math.log(Math.max(min, 0.0001) / Math.max(base, 0.0001)) / Math.log(periodRatio)) - 2;
  const maxShift = Math.ceil(Math.log(Math.max(max, 0.0001) / Math.max(base, 0.0001)) / Math.log(periodRatio)) + 2;

  for (let shift = minShift; shift <= maxShift; shift += 1) {
    const periodMultiplier = Math.pow(periodRatio, shift);
    stepCents.forEach((cents, step) => {
      if (muted.has(step)) return;
      const offsetCents = (manualStepOffsets[step] ?? 0) * 10;
      const freq = base * Math.pow(2, (cents + offsetCents) / 1200) * periodMultiplier;
      if (freq >= min && freq <= max) frequencies.push(freq);
    });
  }
  return writeCachedGridDescriptor(gridFrequencyCache, cacheKey, [...new Set(frequencies.map((f) => Number(f.toFixed(4))))].sort((a, b) => a - b));
};
export const snapYToGrid = (y: number, base: number, tuning: GridTuning, manualMutedSteps: number[] = [], manualStepOffsets: number[] = []) => {
  const target = freqFromY(y);
  const grid = buildGridFrequencies(base, tuning, manualMutedSteps, manualStepOffsets);
  if (!grid.length) return clamp(y, 0, GAME_HEIGHT);
  let nearest = grid[0];
  let best = Math.abs(target - nearest);
  for (let i = 1; i < grid.length; i += 1) {
    const d = Math.abs(target - grid[i]);
    if (d < best) {
      best = d;
      nearest = grid[i];
    }
  }
  return yFromFreq(nearest);
};
export const buildKeyboardGridFrequencies = (base: number, tuning: GridTuning, manualMutedSteps: number[] = [], manualStepOffsets: number[] = []) => {
  const cacheKey = buildGridCacheKey(base, tuning, manualMutedSteps, manualStepOffsets, 'keyboard');
  const cached = readCachedGridDescriptor(keyboardGridFrequencyCache, cacheKey);
  if (cached) return cached;
  const grid = buildGridFrequencies(base, tuning, manualMutedSteps, manualStepOffsets);
  const unoffsetGrid = buildGridFrequencies(base, tuning, manualMutedSteps, []);
  let unoffsetIndex = -1;
  for (let i = unoffsetGrid.length - 1; i >= 0; i -= 1) {
    if (unoffsetGrid[i] <= base * 1.001) {
      unoffsetIndex = i;
      break;
    }
  }
  if (unoffsetIndex === -1) unoffsetIndex = unoffsetGrid.length - 1;
  const descendingGrid = [...grid].reverse();
  const startIndex = grid.length - 1 - unoffsetIndex;
  const { min, max } = getResonanceViewportRangeForBase(base);
  return writeCachedGridDescriptor(keyboardGridFrequencyCache, cacheKey, descendingGrid.slice(startIndex).filter((f) => f >= min && f <= max));
};
export const keyboardWindowFrequency = (base: number, tuning: GridTuning, startOffset: number, stepDown: number, manualMutedSteps: number[] = [], manualStepOffsets: number[] = []) => {
  const gridDesc = buildKeyboardGridFrequencies(base, tuning, manualMutedSteps, manualStepOffsets);
  if (!gridDesc.length) return null;
  const start = Math.max(0, Math.min(Math.round(startOffset), gridDesc.length - 1));
  return gridDesc[Math.min(gridDesc.length - 1, start + stepDown)] ?? null;
};
export const shiftKeyboardWindowOffset = (base: number, tuning: GridTuning, currentOffset: number, direction: -1 | 1, manualMutedSteps: number[] = [], manualStepOffsets: number[] = []) => {
  const gridDesc = buildKeyboardGridFrequencies(base, tuning, manualMutedSteps, manualStepOffsets);
  if (!gridDesc.length) return 0;
  return Math.max(0, Math.min(Math.round(currentOffset) + direction, gridDesc.length - 1));
};
export const stepYToGrid = (currentY: number, direction: 1 | -1, base: number, tuning: GridTuning, manualMutedSteps: number[] = [], manualStepOffsets: number[] = []) => {
  const target = freqFromY(currentY);
  const grid = buildGridFrequencies(base, tuning, manualMutedSteps, manualStepOffsets);
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
  return yFromFreq(grid[next]);
};
export const createSoftClipCurve = (amount = 1.6) => {
  const n = 2048;
  const drive = Math.max(0.0001, amount <= 1 ? 1 + amount * 12 : amount);
  const norm = Math.tanh(drive);
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(drive * x) / norm;
  }
  return curve;
};
export const createMyzelDriveCurve = (amount = 0.35) => {
  const n = 4096;
  const drive = 1.2 + amount * 18;
  const foldDepth = 0.08 + amount * 0.32;
  const foldFreq = 2.2 + amount * 3.8;
  const norm = Math.tanh(drive * (1 + foldDepth));
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1;
    const folded = x + Math.sin(x * Math.PI * foldFreq) * foldDepth;
    curve[i] = clamp(Math.tanh(drive * folded) / norm, -1, 1);
  }
  return curve;
};
