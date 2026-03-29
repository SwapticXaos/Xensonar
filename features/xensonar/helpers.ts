import {
  BASE_CHURCH_MODES,
  BP_13TET_RATIOS,
  BP_CHURCH_MODES,
  CUSTOM_MODE_VALUE,
  DRONE_JI_OVERTONES,
  DRONE_MAX_FREQ,
  DRONE_MIN_FREQ,
  DRONE_OVERTONE_PRESET_DEFAULTS,
  DRONE_PRESETS,
  GAMELAN_PELOG_CENTS,
  GAME_HEIGHT,
  GAME_WIDTH,
  MAQAM_RAST_CENTS,
  GRID_TUNING_OPTIONS,
  JI_NODES,
} from "./constants";
import type {
  ChurchMode,
  DronePreset,
  GridLine,
  GridTuning,
  OvertoneMix,
  OvertoneMixByPreset,
  ParticleGradientPreset,
  ParticleNode,
  ParticleSystem,
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

export const getModesForSystem = (system: string) => (system === "bp" ? BP_CHURCH_MODES : BASE_CHURCH_MODES);

export const modeMask = (mode: ChurchMode, system: string = "12edo") => {
  const modeList = getModesForSystem(system);
  const fallbackList = [...BASE_CHURCH_MODES, ...BP_CHURCH_MODES];
  const entry = modeList.find((m) => m.value === mode) ?? fallbackList.find((m) => m.value === mode);
  const expectedLength = system === "bp" ? 13 : 12;
  const allowed = new Set(entry?.steps ?? []);
  return Array.from({ length: expectedLength }, (_, i) => allowed.has(i));
};

export const deriveModeMask = (mode: ChurchMode, system: string) => {
  const systemLength = system === "ji"
    ? JI_NODES.length
    : system === "bp"
      ? 13
      : system === "gamelan"
        ? GAMELAN_PELOG_CENTS.length
        : system === "maqam"
          ? MAQAM_RAST_CENTS.length
          : parseInt(system.replace("edo", ""), 10) || 12;

  if (mode === "chromatic") return Array.from({ length: systemLength }, () => true);
  if (system === "bp") return modeMask(mode, "bp");
  const mode12edo = modeMask(mode, "12edo");
  if (system === "12edo") return mode12edo;

  const idealCents = Array.from({ length: 12 }, (_, i) => i * 100);
  const targetCents = idealCents.filter((_, i) => mode12edo[i]);

  let systemCents: number[] = [];
  let length = 0;
  if (system === "ji") {
    systemCents = JI_NODES.map((n) => n.cents);
    length = JI_NODES.length;
  } else if (system === "gamelan") {
    systemCents = [...GAMELAN_PELOG_CENTS];
    length = GAMELAN_PELOG_CENTS.length;
  } else if (system === "maqam") {
    systemCents = [...MAQAM_RAST_CENTS];
    length = MAQAM_RAST_CENTS.length;
  } else {
    const edo = parseInt(system.replace("edo", ""), 10);
    if (Number.isNaN(edo)) return mode12edo;
    systemCents = Array.from({ length: edo }, (_, i) => (i / edo) * 1200);
    length = edo;
  }

  const mask = Array(length).fill(false);
  for (const ideal of targetCents) {
    let bestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < length; i += 1) {
      const diff = Math.abs(ideal - systemCents[i]);
      const wrappedDiff = Math.min(diff, Math.abs(diff - 1200), Math.abs(diff + 1200));
      if (wrappedDiff < minDiff) {
        minDiff = wrappedDiff;
        bestIdx = i;
      }
    }
    mask[bestIdx] = true;
  }
  return mask;
};

export const nextGridTuning = (current: GridTuning, direction: -1 | 1) => {
  const list = GRID_TUNING_OPTIONS.map((option) => option.value);
  const currentIndex = list.indexOf(current);
  if (currentIndex === -1) return current;
  return list[(currentIndex + direction + list.length) % list.length];
};

export const getTuningSteps = (tuning: GridTuning) => {
  if (tuning === "ji") return JI_NODES.length;
  if (tuning === "bp") return 13;
  if (tuning === "gamelan") return GAMELAN_PELOG_CENTS.length;
  if (tuning === "maqam") return MAQAM_RAST_CENTS.length;
  const edo = parseInt(tuning.replace("edo", ""), 10);
  return Number.isNaN(edo) ? 12 : edo;
};

export const getParticleNodes = (system: ParticleSystem): ParticleNode[] => {
  if (system === "12edo") {
    return Array.from({ length: 12 }, (_, step) => ({
      ratio: Math.pow(2, step / 12),
      label: step === 0 ? "Root" : `${step}`,
    }));
  }
  if (system === "bp") {
    return Array.from({ length: 13 }, (_, step) => ({
      ratio: BP_13TET_RATIOS[step],
      label: step === 0 ? "Root" : `${step}`,
    }));
  }
  return JI_NODES.map((node) => ({ ratio: node.ratio, label: node.label }));
};

export const defaultAgentEnabled = (system: ParticleSystem, mode: ChurchMode) => deriveModeMask(mode, system);

export const getQuantizeStepSeconds = (bpm: number, grid: QuantizeGrid) => {
  const safeBpm = Math.max(1, bpm);
  const divisor = grid === 16 ? 4 : grid === 32 ? 8 : 16;
  return 60 / safeBpm / divisor;
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
) => {
  const frequencies: number[] = [];
  const octaves = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  const muted = new Set(manualMutedSteps);

  if (tuning === "ji") {
    for (const oct of octaves) {
      JI_NODES.forEach((ji, step) => {
        if (muted.has(step)) return;
        const offsetCents = (manualStepOffsets[step] ?? 0) * 10;
        const freq = base * ji.ratio * Math.pow(2, oct) * Math.pow(2, offsetCents / 1200);
        if (freq >= DRONE_MIN_FREQ && freq <= DRONE_MAX_FREQ) frequencies.push(freq);
      });
    }
  } else if (tuning === "bp") {
    const tritaveShifts = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
    for (const tri of tritaveShifts) {
      for (let step = 0; step < 13; step += 1) {
        if (muted.has(step)) continue;
        const offset = manualStepOffsets[step] ?? 0;
        const freq = base * Math.pow(3, (step + offset) / 13) * Math.pow(3, tri);
        if (freq >= DRONE_MIN_FREQ && freq <= DRONE_MAX_FREQ) frequencies.push(freq);
      }
    }
  } else if (tuning === "gamelan" || tuning === "maqam") {
    const centsList = tuning === "gamelan" ? GAMELAN_PELOG_CENTS : MAQAM_RAST_CENTS;
    for (const oct of octaves) {
      centsList.forEach((cents, step) => {
        if (muted.has(step)) return;
        const offsetCents = (manualStepOffsets[step] ?? 0) * 10;
        const ratio = Math.pow(2, (cents + offsetCents) / 1200);
        const freq = base * ratio * Math.pow(2, oct);
        if (freq >= DRONE_MIN_FREQ && freq <= DRONE_MAX_FREQ) frequencies.push(freq);
      });
    }
  } else {
    const edo = parseInt(tuning.replace("edo", ""), 10);
    for (const oct of octaves) {
      for (let step = 0; step < edo; step += 1) {
        if (muted.has(step)) continue;
        const offset = manualStepOffsets[step] ?? 0;
        const ratio = Math.pow(2, (step + offset) / edo);
        const freq = base * ratio * Math.pow(2, oct);
        if (freq >= DRONE_MIN_FREQ && freq <= DRONE_MAX_FREQ) frequencies.push(freq);
      }
    }
  }

  return [...new Set(frequencies.map((f) => Number(f.toFixed(4))))].sort((a, b) => a - b);
};

export const snapYToGrid = (
  y: number,
  base: number,
  tuning: GridTuning,
  manualMutedSteps: number[] = [],
  manualStepOffsets: number[] = [],
) => {
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

export const buildKeyboardGridFrequencies = (
  base: number,
  tuning: GridTuning,
  manualMutedSteps: number[] = [],
  manualStepOffsets: number[] = [],
) => {
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

  return descendingGrid.slice(startIndex).filter((f) => f >= DRONE_MIN_FREQ && f <= DRONE_MAX_FREQ);
};

export const keyboardWindowFrequency = (
  base: number,
  tuning: GridTuning,
  startOffset: number,
  stepDown: number,
  manualMutedSteps: number[] = [],
  manualStepOffsets: number[] = [],
) => {
  const gridDesc = buildKeyboardGridFrequencies(base, tuning, manualMutedSteps, manualStepOffsets);
  if (!gridDesc.length) return null;
  const start = Math.max(0, Math.min(Math.round(startOffset), gridDesc.length - 1));
  return gridDesc[Math.min(gridDesc.length - 1, start + stepDown)] ?? null;
};

export const shiftKeyboardWindowOffset = (
  base: number,
  tuning: GridTuning,
  currentOffset: number,
  direction: -1 | 1,
  manualMutedSteps: number[] = [],
  manualStepOffsets: number[] = [],
) => {
  const gridDesc = buildKeyboardGridFrequencies(base, tuning, manualMutedSteps, manualStepOffsets);
  if (!gridDesc.length) return 0;
  return Math.max(0, Math.min(Math.round(currentOffset) + direction, gridDesc.length - 1));
};

export const stepYToGrid = (
  currentY: number,
  direction: 1 | -1,
  base: number,
  tuning: GridTuning,
  manualMutedSteps: number[] = [],
  manualStepOffsets: number[] = [],
) => {
  const target = freqFromY(currentY);
  const grid = buildGridFrequencies(base, tuning, manualMutedSteps, manualStepOffsets).sort((a, b) => a - b);
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

export const normalizeMutedSteps = (steps: number[], len: number) =>
  [...new Set((steps ?? []).map((step) => ((step % len) + len) % len))].sort((a, b) => a - b);

export const getDisplayedModeValue = (system: string, mode: ChurchMode, manualMutedSteps: number[]) => {
  const len = system === "ji" ? JI_NODES.length : system === "bp" ? 13 : system === "gamelan" ? GAMELAN_PELOG_CENTS.length : system === "maqam" ? MAQAM_RAST_CENTS.length : parseInt(system.replace("edo", ""), 10) || 12;
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
): GridLine[] => {
  const octaves = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  const manualMuted = new Set(p.manualGridMutedSteps ?? []);
  const offsets = p.manualGridStepOffsets ?? [];

  if (p.gridTuning === "ji") {
    return [0.125, 0.25, 0.5, 1, 2, 4]
      .flatMap((oct) =>
        JI_NODES.map((ji, idx) => {
          const offsetCents = (offsets[idx] ?? 0) * 10;
          const freq = p.gridBase * oct * ji.ratio * Math.pow(2, offsetCents / 1200);
          return {
            id: `ji-${oct}-${idx}`,
            label: `${ji.label} (${freq.toFixed(1)}Hz)`,
            freq,
            manualMuted: manualMuted.has(idx),
            modeMuted: false,
            stepIndex: idx,
          };
        }),
      )
      .filter((line) => line.freq >= 55 && line.freq <= 440);
  }

  if (p.gridTuning === "bp") {
    const tritaveShifts = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
    return tritaveShifts
      .flatMap((tri) =>
        BP_13TET_RATIOS.map((_, step) => {
          const offset = offsets[step] ?? 0;
          const freq = p.gridBase * Math.pow(3, (step + offset) / 13) * Math.pow(3, tri);
          return {
            id: `bp-${tri}-${step}`,
            label: step === 0 ? `BP Root (${freq.toFixed(1)}Hz)` : `BP ${step} (${freq.toFixed(1)}Hz)`,
            freq,
            manualMuted: manualMuted.has(step),
            modeMuted: false,
            stepIndex: step,
          };
        }),
      )
      .filter((line) => line.freq >= 55 && line.freq <= 440);
  }

  const edo = parseInt(p.gridTuning.replace("edo", ""), 10);
  if (!Number.isNaN(edo)) {
    return octaves
      .flatMap((oct) =>
        Array.from({ length: edo }, (_, step) => {
          const offset = offsets[step] ?? 0;
          const freq = p.gridBase * Math.pow(2, (step + offset) / edo) * Math.pow(2, oct);
          return {
            id: `${p.gridTuning}-${oct}-${step}`,
            label: oct === 0 && step === 0 ? `Root (${freq.toFixed(1)}Hz)` : `${step > 0 ? "+" : ""}${step} (${freq.toFixed(1)}Hz)`,
            freq,
            manualMuted: manualMuted.has(step),
            modeMuted: false,
            stepIndex: step,
          };
        }),
      )
      .filter((line) => line.freq >= 55 && line.freq <= 440);
  }
  return [];
};

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
