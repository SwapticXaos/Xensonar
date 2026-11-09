import type { Agent, Mode, Params, RatioNode, Tuning } from "./types";

export const WIDTH = 1100;
export const HEIGHT = 580;
export const CENTER_X = WIDTH * 0.5;
export const CENTER_Y = HEIGHT * 0.5;
export const TWO_PI = Math.PI * 2;
export const BP_STEPS = 13;
export const BP_BASE = 3;
export const MIN_VISIBLE_FREQ = 55;
export const MAX_VISIBLE_FREQ = 1760;

export const MODE_PATTERNS: Record<Mode, number[]> = {
  chromatic: Array.from({ length: 12 }, (_, i) => i),
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  ukr_dorian: [0, 2, 3, 6, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  bp_lambda: [0, 3, 5, 7, 10],
  bp_major: [0, 2, 5, 7, 9],
  bp_minor: [0, 2, 4, 7, 9],
};

export const WESTERN_MODES: Mode[] = ["chromatic", "ionian", "dorian", "ukr_dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian"];
export const BP_MODES: Mode[] = ["bp_lambda", "bp_major", "bp_minor"];

export const MODE_LABELS: Record<Mode, string> = {
  chromatic: "Chromatisch",
  ionian: "Ionisch",
  dorian: "Dorisch",
  ukr_dorian: "ukr-dorisch",
  phrygian: "Phrygisch",
  lydian: "Lydisch",
  mixolydian: "Mixolydisch",
  aeolian: "Aeolisch",
  locrian: "Lokrisch",
  bp_lambda: "BP Lambda",
  bp_major: "BP Dur",
  bp_minor: "BP Moll",
};

export const JI_RATIOS: RatioNode[] = [
  { ratio: 1 / 1, cents: 0, label: "1/1" },
  { ratio: 16 / 15, cents: 111.73, label: "16/15" },
  { ratio: 9 / 8, cents: 203.91, label: "9/8" },
  { ratio: 6 / 5, cents: 315.64, label: "6/5" },
  { ratio: 5 / 4, cents: 386.31, label: "5/4" },
  { ratio: 4 / 3, cents: 498.04, label: "4/3" },
  { ratio: 45 / 32, cents: 590.22, label: "45/32" },
  { ratio: 3 / 2, cents: 701.96, label: "3/2" },
  { ratio: 8 / 5, cents: 813.69, label: "8/5" },
  { ratio: 5 / 3, cents: 884.36, label: "5/3" },
  { ratio: 9 / 5, cents: 1017.6, label: "9/5" },
  { ratio: 15 / 8, cents: 1088.27, label: "15/8" },
];

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function hsl(h: number, s: number, l: number, a = 1) {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

export function seedHue(step: number, stepsPerOctave: number) {
  return (step / Math.max(1, stepsPerOctave)) * 300 + 40;
}

export function getStepsPerOctave(tuning: Tuning) {
  if (tuning === "12edo") return 12;
  if (tuning === "19edo") return 19;
  if (tuning === "31edo") return 31;
  if (tuning === "bp") return BP_STEPS;
  return 12;
}

export function getRowCount(tuning: Tuning) {
  return tuning === "bp" ? BP_STEPS : getStepsPerOctave(tuning);
}

export function freqFromY(y: number) {
  const normalized = 1 - clamp(y / HEIGHT, 0, 1);
  return MIN_VISIBLE_FREQ + normalized * (MAX_VISIBLE_FREQ - MIN_VISIBLE_FREQ);
}

export function yFromFreq(freq: number) {
  const normalized = (freq - MIN_VISIBLE_FREQ) / (MAX_VISIBLE_FREQ - MIN_VISIBLE_FREQ);
  return clamp((1 - normalized) * HEIGHT, 0, HEIGHT);
}

export function getVisibleOctaves(tuning: Tuning) {
  if (tuning === "bp") return 3;
  return 4;
}

export function yFromAbsoluteStep(step: number, tuning: Tuning, perspective: "natural" | "equalized", tonicHz = 220) {
  const ratioNode = ratioForStep(step, tuning);
  const freq = tonicHz * ratioNode.ratio;
  if (perspective === "natural") return yFromFreq(freq);

  const cents = ratioNode.cents;
  const totalVisibleCents = tuning === "bp" ? Math.log2(Math.pow(BP_BASE, getVisibleOctaves(tuning))) * 1200 : getVisibleOctaves(tuning) * 1200;
  const normalized = clamp(cents / Math.max(1, totalVisibleCents), 0, 1);
  return (1 - normalized) * HEIGHT;
}

export function stepFromY(y: number, tuning: Tuning, perspective: "natural" | "equalized", tonicHz = 220) {
  const stepsPerOctave = getRowCount(tuning);
  const totalSteps = stepsPerOctave * getVisibleOctaves(tuning);

  let bestStep = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let step = 0; step < totalSteps; step += 1) {
    const sy = yFromAbsoluteStep(step, tuning, perspective, tonicHz);
    const d = Math.abs(sy - y);
    if (d < bestDistance) {
      bestDistance = d;
      bestStep = step;
    }
  }
  return bestStep;
}

export function yFromStep(step: number, tuning: Tuning, perspective: "natural" | "equalized", tonicHz = 220) {
  return yFromAbsoluteStep(step, tuning, perspective, tonicHz);
}

export function falloffValue(kind: "linear" | "abrupt" | "bell" | "late" | "exponential", normalized: number) {
  const t = clamp(normalized, 0, 1);
  if (kind === "abrupt") return t > 0.82 ? 1 : 0;
  if (kind === "linear") return t;
  if (kind === "bell") {
    const x = (t - 0.5) / 0.28;
    return Math.exp(-(x * x));
  }
  if (kind === "late") return Math.pow(t, 3.2);
  return 1 - Math.exp(-4 * t);
}

export function modeAllowsStep(mode: Mode, step: number, tuning: Tuning) {
  if (tuning === "bp") {
    const degree = ((step % BP_STEPS) + BP_STEPS) % BP_STEPS;
    return (MODE_PATTERNS[mode] ?? []).includes(degree);
  }

  const pattern = MODE_PATTERNS[mode] ?? MODE_PATTERNS.chromatic;
  const degree = ((step % 12) + 12) % 12;
  return pattern.includes(degree);
}

export function ratioForStep(step: number, tuning: Tuning): RatioNode {
  if (tuning === "ji") {
    const idx = ((step % 12) + 12) % 12;
    const octave = Math.floor(step / 12);
    const base = JI_RATIOS[idx];
    return {
      ratio: base.ratio * Math.pow(2, octave),
      cents: base.cents + octave * 1200,
      label: `${base.label}${octave !== 0 ? ` * 2^${octave}` : ""}`,
    };
  }

  if (tuning === "bp") {
    const octave = Math.floor(step / BP_STEPS);
    const local = ((step % BP_STEPS) + BP_STEPS) % BP_STEPS;
    const ratio = Math.pow(BP_BASE, local / BP_STEPS) * Math.pow(BP_BASE, octave);
    return {
      ratio,
      cents: Math.log2(ratio) * 1200,
      label: `bp:${local}${octave !== 0 ? `@${octave}` : ""}`,
    };
  }

  const steps = getStepsPerOctave(tuning);
  const ratio = Math.pow(2, step / steps);
  return {
    ratio,
    cents: (step / steps) * 1200,
    label: `${step}/${steps}`,
  };
}

export function frequencyForStep(step: number, params: Params) {
  const node = ratioForStep(step, params.tuning);
  return params.tonicHz * node.ratio;
}

export function quantizedTime(audioTime: number, params: Params) {
  if (!params.quantizeOn) return audioTime;
  const beat = 60 / params.quantizeBpm;
  const grid = beat / 4;
  return Math.ceil(audioTime / grid) * grid;
}

export function pitchColor(cents: number) {
  const wrapped = ((cents % 1200) + 1200) % 1200;
  return seedHue(wrapped / 100, 12);
}

export function createAgent(step: number, tuning: Tuning, enabled: boolean, ringIndex: number, ringCount: number): Agent {
  const node = ratioForStep(step, tuning);
  const ringRadius = 90 + ringIndex * 58;
  const angle = (step / Math.max(1, ringCount)) * TWO_PI + ringIndex * 0.22;
  const x = CENTER_X + Math.cos(angle) * ringRadius;
  const y = CENTER_Y + Math.sin(angle) * ringRadius;
  return {
    id: step + ringIndex * 1000,
    step,
    ratio: node.ratio,
    cents: node.cents,
    label: node.label,
    enabled,
    baseX: x,
    baseY: y,
    x,
    y,
    vx: 0,
    vy: 0,
    phase: Math.random() * TWO_PI,
    energy: enabled ? 0.55 + Math.random() * 0.2 : 0.15,
    hue: seedHue(step, getStepsPerOctave(tuning)),
    lastTrigger: 0,
  };
}

export function buildAgents(params: Params): Agent[] {
  const stepsPerOctave = params.tuning === "bp" ? BP_STEPS : getStepsPerOctave(params.tuning);
  const count = Math.max(8, params.density);
  const total = Math.min(48, count);
  const agents: Agent[] = [];
  for (let i = 0; i < total; i += 1) {
    const step = i;
    agents.push(createAgent(step, params.tuning, modeAllowsStep(params.mode, step, params.tuning), Math.floor(i / stepsPerOctave), stepsPerOctave));
  }
  return agents;
}

export function normalizePointer(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * WIDTH;
  const y = ((clientY - rect.top) / rect.height) * HEIGHT;
  return { x, y };
}

export function formatFreq(f: number) {
  return `${f.toFixed(f < 100 ? 2 : 1)} Hz`;
}

export type GridLine = {
  id: string;
  label: string;
  freq: number;
  y: number;
  stepIndex: number;
  muted: boolean;
  offset: number;
};

export function getTuningSteps(tuning: Tuning) {
  if (tuning === "ji") return JI_RATIOS.length;
  if (tuning === "bp") return BP_STEPS;
  return getStepsPerOctave(tuning);
}

export function ensureStepOffsetArray(tuning: Tuning, offsets: number[]) {
  const len = getTuningSteps(tuning);
  return Array.from({ length: len }, (_, i) => offsets[i] ?? 0);
}

export function buildGridLines(params: Params): GridLine[] {
  const lines: GridLine[] = [];
  const steps = getTuningSteps(params.tuning);
  const manualMuted = new Set(params.manualMutedSteps ?? []);
  const offsets = ensureStepOffsetArray(params.tuning, params.manualStepOffsets ?? []);

  const octaveShifts = params.tuning === "bp" ? [-3, -2, -1, 0, 1, 2, 3] : [-4, -3, -2, -1, 0, 1, 2, 3, 4];

  for (const octaveShift of octaveShifts) {
    for (let step = 0; step < steps; step += 1) {
      const offset = offsets[step] ?? 0;
      const localStep = step + offset;

      let freq = 0;
      if (params.tuning === "ji") {
        const node = JI_RATIOS[step] ?? JI_RATIOS[0];
        freq = params.tonicHz * node.ratio * Math.pow(2, octaveShift) * Math.pow(2, offset / 1200);
      } else if (params.tuning === "bp") {
        const ratio = Math.pow(BP_BASE, localStep / BP_STEPS) * Math.pow(BP_BASE, octaveShift);
        freq = params.tonicHz * ratio;
      } else {
        const edo = getStepsPerOctave(params.tuning);
        freq = params.tonicHz * Math.pow(2, localStep / edo) * Math.pow(2, octaveShift);
      }

      if (freq < MIN_VISIBLE_FREQ || freq > MAX_VISIBLE_FREQ) continue;
      lines.push({
        id: `${params.tuning}-${octaveShift}-${step}`,
        label: step === 0 ? `Root` : `${step}`,
        freq,
        y: yFromFreq(freq),
        stepIndex: step,
        muted: manualMuted.has(step),
        offset,
      });
    }
  }

  return lines.sort((a, b) => a.freq - b.freq);
}

export function nearestGridLine(lines: GridLine[], y: number) {
  let best: GridLine | null = null;
  let dist = Number.POSITIVE_INFINITY;
  for (const line of lines) {
    const d = Math.abs(line.y - y);
    if (d < dist) {
      dist = d;
      best = line;
    }
  }
  return best;
}

export function snapYToGrid(y: number, params: Params) {
  const lines = buildGridLines(params).filter((line) => !line.muted);
  const nearest = nearestGridLine(lines, y);
  return nearest ? nearest.y : y;
}

export function buildKeyboardWindowFrequencies(params: Params) {
  const lines = buildGridLines(params)
    .filter((line) => !line.muted)
    .sort((a, b) => b.freq - a.freq);
  return lines;
}

export function keyboardWindowFrequency(params: Params, windowStart: number, stepDown: number) {
  const lines = buildKeyboardWindowFrequencies(params);
  if (!lines.length) return null;
  const idx = clamp(windowStart + stepDown, 0, lines.length - 1);
  return lines[idx] ?? null;
}
