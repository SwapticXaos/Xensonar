import {
  CUSTOM_MODE_VALUE,
  DRONE_JI_OVERTONES,
  DRONE_MAX_FREQ,
  DRONE_MIN_FREQ,
  DRONE_OVERTONE_PRESET_DEFAULTS,
  DRONE_PRESETS,
  GAME_HEIGHT,
  GAME_WIDTH,
} from "./constants";
import {
  deriveModeMask as deriveModeMaskFromDomain,
  getModesForSystem as getModesForSystemFromDomain,
  getParticleNodes as getParticleNodesFromDomain,
  getTuningSteps as getTuningStepsFromDomain,
  nextGridTuning as nextGridTuningFromDomain,
  defaultAgentEnabled as defaultAgentEnabledFromDomain,
  getRasterStepCents,
  getRasterDefinition,
  type ChurchMode,
  type GridTuning,
  type ParticleSystem,
} from "./domain/instrumentData";
import {
  buildGridFrequencies as buildGridFrequenciesFromRuntime,
  buildKeyboardGridFrequencies as buildKeyboardGridFrequenciesFromRuntime,
  keyboardWindowFrequency as keyboardWindowFrequencyFromRuntime,
  shiftKeyboardWindowOffset as shiftKeyboardWindowOffsetFromRuntime,
  snapYToGrid as snapYToGridFromRuntime,
  stepYToGrid as stepYToGridFromRuntime,
} from "./rooms/resonanceRuntimeMath";
import { buildVisibleGridLines as buildVisibleGridLinesFromGridMath } from "./rooms/resonanceGridMath";
import type {
  DronePreset,
  GridLine,
  OvertoneMix,
  OvertoneMixByPreset,
  ParticleGradientPreset,
  ParticleNode,
  QuantizeGrid,
} from "./types";

export const FREQ = (base: number, cents: number) => base * Math.pow(2, cents / 1200);
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const formatDuration = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const getModesForSystem = (system: string) => getModesForSystemFromDomain(system);

export const modeMask = (mode: ChurchMode, system: string = "12edo") => deriveModeMaskFromDomain(mode, system);

export const deriveModeMask = (mode: ChurchMode, system: string) => deriveModeMaskFromDomain(mode, system);

export const nextGridTuning = (current: GridTuning, direction: -1 | 1) => nextGridTuningFromDomain(current, direction);

export const getTuningSteps = (tuning: GridTuning) => getTuningStepsFromDomain(tuning);

export const getParticleNodes = (system: ParticleSystem): ParticleNode[] => getParticleNodesFromDomain(system);

export const defaultAgentEnabled = (system: ParticleSystem, mode: ChurchMode) => defaultAgentEnabledFromDomain(system, mode);

export const getQuantizeStepSeconds = (bpm: number, grid: QuantizeGrid, referenceBars = 1) => {
  const safeBpm = Math.max(1, bpm);
  const safeGrid = Math.max(1, Math.min(256, Math.round(Number.isFinite(grid) ? grid : 16)));
  const safeReferenceBars = Math.max(0.125, Math.min(16, Number.isFinite(referenceBars) ? referenceBars : 1));
  return (240 / safeBpm) * safeReferenceBars / safeGrid;
};

export const freqFromY = (y: number) => {
  const normalized = 1 - clamp(y, 0, GAME_HEIGHT) / GAME_HEIGHT;
  return DRONE_MIN_FREQ + normalized * (DRONE_MAX_FREQ - DRONE_MIN_FREQ);
};

export const yFromFreq = (freq: number) => {
  const normalized = (freq - DRONE_MIN_FREQ) / (DRONE_MAX_FREQ - DRONE_MIN_FREQ);
  return clamp((1 - normalized) * GAME_HEIGHT, 0, GAME_HEIGHT);
};

export const gradientPresetValue = (preset: ParticleGradientPreset, normalized: number) => {
  const n = clamp(normalized, 0, 1);
  const centerDist = Math.abs(n - 0.5) * 2;
  switch (preset) {
    case "bright_max":
      return n;
    case "bright_min":
      return 1 - n;
    case "warm_center":
      return 1 - centerDist;
    case "edge_spark":
      return centerDist;
    case "metal_max":
      return Math.pow(n, 0.7);
    case "wood_min":
      return Math.pow(1 - n, 0.7);
    case "none":
    default:
      return 0;
  }
};

export const computeParticleGradientTimbre = (
  x: number,
  y: number,
  xPreset: ParticleGradientPreset,
  yPreset: ParticleGradientPreset,
) => {
  const xNorm = clamp(x / GAME_WIDTH, 0, 1);
  const yNorm = clamp(1 - y / GAME_HEIGHT, 0, 1);
  const xVal = gradientPresetValue(xPreset, xNorm);
  const yVal = gradientPresetValue(yPreset, yNorm);
  return clamp((xVal + yVal) / 2, 0, 1);
};

export const waveIntensityScalar = (progress: number, decay: import("./types").WaveDecayPreset) => {
  const p = clamp(progress, 0, 1);
  if (decay === "abrupt") return 1;
  if (decay === "linear") return Math.max(0.04, 1 - p);
  if (decay === "bellcurve") return Math.max(0.02, Math.exp(-Math.pow(p * 3.6, 2)));
  if (decay === "exponential") return Math.max(0.02, Math.exp(-p * 5.2));
  if (decay === "late_falloff") return p < 0.65 ? 1 - p * 0.18 : Math.max(0.02, 0.88 - Math.pow((p - 0.65) / 0.35, 1.35));
  return 1;
};

export const buildGridFrequencies = (
  base: number,
  tuning: GridTuning,
  manualMutedSteps: number[] = [],
  manualStepOffsets: number[] = [],
) => buildGridFrequenciesFromRuntime(base, tuning, manualMutedSteps, manualStepOffsets);

export const snapYToGrid = (
  y: number,
  base: number,
  tuning: GridTuning,
  manualMutedSteps: number[] = [],
  manualStepOffsets: number[] = [],
) => snapYToGridFromRuntime(y, base, tuning, manualMutedSteps, manualStepOffsets);

export const buildKeyboardGridFrequencies = (
  base: number,
  tuning: GridTuning,
  manualMutedSteps: number[] = [],
  manualStepOffsets: number[] = [],
) => buildKeyboardGridFrequenciesFromRuntime(base, tuning, manualMutedSteps, manualStepOffsets);

export const keyboardWindowFrequency = (
  base: number,
  tuning: GridTuning,
  startOffset: number,
  stepDown: number,
  manualMutedSteps: number[] = [],
  manualStepOffsets: number[] = [],
) => keyboardWindowFrequencyFromRuntime(base, tuning, startOffset, stepDown, manualMutedSteps, manualStepOffsets);

export const shiftKeyboardWindowOffset = (
  base: number,
  tuning: GridTuning,
  currentOffset: number,
  direction: -1 | 1,
  manualMutedSteps: number[] = [],
  manualStepOffsets: number[] = [],
) => shiftKeyboardWindowOffsetFromRuntime(base, tuning, currentOffset, direction, manualMutedSteps, manualStepOffsets);

export const stepYToGrid = (
  currentY: number,
  direction: 1 | -1,
  base: number,
  tuning: GridTuning,
  manualMutedSteps: number[] = [],
  manualStepOffsets: number[] = [],
) => stepYToGridFromRuntime(currentY, direction, base, tuning, manualMutedSteps, manualStepOffsets);

export const normalizeMutedSteps = (steps: number[], len: number) =>
  [...new Set((steps ?? []).map((step) => ((step % len) + len) % len))].sort((a, b) => a - b);

export const getDisplayedModeValue = (system: string, mode: ChurchMode, manualMutedSteps: number[]) => {
  const len = getRasterStepCents(system).length || getRasterDefinition(system)?.steps || 12;
  const normalizedManual = normalizeMutedSteps(manualMutedSteps, len);
  const expectedMuted = normalizeMutedSteps(
    Array.from({ length: len }, (_, i) => i).filter((i) => !deriveModeMask(mode, system)[i]),
    len,
  );
  const same = normalizedManual.length === expectedMuted.length && normalizedManual.every((value, idx) => value === expectedMuted[idx]);
  return same ? mode : CUSTOM_MODE_VALUE;
};

export const createEmptyOvertoneMix = (): OvertoneMix =>
  Object.fromEntries(DRONE_JI_OVERTONES.map((node) => [node.label, 0])) as OvertoneMix;

export const createOvertoneMixByPreset = (): OvertoneMixByPreset => {
  const byPreset = {} as OvertoneMixByPreset;
  for (const preset of DRONE_PRESETS) {
    const mix = createEmptyOvertoneMix();
    const defaults = DRONE_OVERTONE_PRESET_DEFAULTS[preset.value] ?? {};
    for (const [label, value] of Object.entries(defaults)) {
      if (typeof value === "number") mix[label] = value;
    }
    byPreset[preset.value as DronePreset] = mix;
  }
  return byPreset;
};

export const cloneOvertoneMixByPreset = (source: OvertoneMixByPreset): OvertoneMixByPreset => {
  const copy = {} as OvertoneMixByPreset;
  for (const preset of DRONE_PRESETS) {
    copy[preset.value as DronePreset] = { ...source[preset.value as DronePreset] };
  }
  return copy;
};

export const getVisibleGridLines = (
  p: {
    gridBase: number;
    gridTuning: GridTuning;
    manualGridMutedSteps?: number[];
    manualGridStepOffsets?: number[];
  },
): GridLine[] => buildVisibleGridLinesFromGridMath({
  gridBase: p.gridBase,
  gridTuning: p.gridTuning,
  manualGridMutedSteps: p.manualGridMutedSteps ?? [],
  manualGridStepOffsets: p.manualGridStepOffsets ?? [],
});

export const floatToInt16 = (input: Float32Array) => {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = clamp(input[i], -1, 1);
    out[i] = sample < 0 ? Math.round(sample * 32768) : Math.round(sample * 32767);
  }
  return out;
};

export const getSupportedRecordingMimeType = () => {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? "";
};

export const interleaveStereo = (left: Int16Array, right: Int16Array) => {
  const out = new Int16Array(left.length + right.length);
  let index = 0;
  for (let i = 0; i < left.length; i += 1) {
    out[index++] = left[i];
    out[index++] = right[i];
  }
  return out;
};

export const writeAscii = (view: DataView, offset: number, text: string) => {
  for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
};

export const encodeWavBlob = (left: Float32Array, right: Float32Array, sampleRate: number) => {
  const leftPcm = floatToInt16(left);
  const rightPcm = floatToInt16(right);
  const interleaved = interleaveStereo(leftPcm, rightPcm);
  const bytesPerSample = 2;
  const numChannels = 2;
  const dataSize = interleaved.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < interleaved.length; i += 1) {
    view.setInt16(offset, interleaved[i], true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
};

export const trimChannelData = (channel: Float32Array, startSample: number, endSample: number) => channel.slice(startSample, endSample);

export const isTextEditingTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName.toLowerCase();
  if (tag === "textarea") return true;
  if (tag === "input") {
    const input = el as HTMLInputElement;
    const type = (input.type || "text").toLowerCase();
    return !["range", "checkbox", "button", "submit", "reset", "radio"].includes(type);
  }
  return false;
};

export { CUSTOM_MODE_VALUE };
