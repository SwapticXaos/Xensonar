import type {
  GrooveDescriptorVector,
  PsyBassPattern,
  PsyBassStep,
  PsyBassStyle,
} from "./types";

const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const createStep = (partial: Partial<PsyBassStep> = {}): PsyBassStep => ({
  active: false,
  semitone: 0,
  octave: -2,
  accent: 0.74,
  length: 0.56,
  ...partial,
});

const STYLE_ORDER: PsyBassStyle[] = [
  "classicOffbeat",
  "rolling",
  "gallop",
  "tripletGhost",
  "darkForest",
];

function chooseStyle(descriptors: GrooveDescriptorVector, styleMorph: number, rng: () => number): PsyBassStyle {
  const d = descriptors;
  const morph = clamp01(styleMorph);
  if (morph < 0.14) return "classicOffbeat";
  if (d.fracture > 0.68 && d.turbulence > 0.58) return rng() > 0.4 ? "gallop" : "darkForest";
  if (d.orbitality > 0.6 && d.recurrence < 0.55) return "tripletGhost";
  if (d.cohesion > 0.62 && d.pressure > 0.55) return "rolling";
  if (morph > 0.82) return STYLE_ORDER[Math.floor(rng() * STYLE_ORDER.length)];
  return morph > 0.55 ? (rng() > 0.5 ? "rolling" : "gallop") : "classicOffbeat";
}

function offbeatIndices(stepCount: 16 | 32): number[] {
  if (stepCount === 32) return [2, 6, 10, 14, 18, 22, 26, 30];
  return [2, 6, 10, 14];
}


function setPatternAnchor(
  steps: PsyBassStep[],
  index: number,
  semitone: number,
  accent: number,
  length: number,
  extras: Partial<PsyBassStep> = {},
) {
  steps[index] = createStep({
    active: true,
    semitone,
    accent,
    length,
    ...extras,
  });
}

function buildClassicOffbeat(stepCount: 16 | 32, density: number, rng: () => number): PsyBassStep[] {
  const steps = new Array(stepCount).fill(null).map(() => createStep());
  const offs = offbeatIndices(stepCount);
  offs.forEach((index, n) => {
    const semitone = n % 4 === 3 && density > 0.7 && rng() > 0.55 ? 7 : 0;
    setPatternAnchor(steps, index, semitone, n === 0 ? 1 : 0.8, lerp(0.5, 0.66, density));
  });
  if (density > 0.72) {
    [stepCount - 1].forEach((idx) => setPatternAnchor(steps, idx, 0, 0.4, 0.18, { ghost: true }));
  }
  return steps;
}

function buildRolling(stepCount: 16 | 32, density: number, rng: () => number): PsyBassStep[] {
  const steps = buildClassicOffbeat(stepCount, density, rng);
  const extras = stepCount === 32 ? [3, 7, 11, 15, 19, 23, 27, 31] : [3, 7, 11, 15];
  extras.forEach((index, n) => {
    if (rng() < lerp(0.42, 0.78, density)) {
      const semitone = n % 3 === 2 && rng() > 0.62 ? 12 : 0;
      setPatternAnchor(steps, index, semitone, 0.42 + density * 0.15, 0.22 + density * 0.1, {
        ghost: true,
        glideToNext: rng() > 0.84,
      });
    }
  });
  return steps;
}

function buildGallop(stepCount: 16 | 32, density: number, rng: () => number): PsyBassStep[] {
  const steps = new Array(stepCount).fill(null).map(() => createStep());
  const groups = stepCount === 32 ? [2, 5, 10, 13, 18, 21, 26, 29] : [2, 5, 10, 13];
  groups.forEach((index, n) => {
    setPatternAnchor(steps, index, n % 2 === 0 ? 0 : 7, n % 2 === 0 ? 1 : 0.62, 0.42 + density * 0.12, {
      glideToNext: n % 2 === 1 && rng() > 0.45,
    });
  });
  const pickups = stepCount === 32 ? [7, 15, 23, 31] : [7, 15];
  pickups.forEach((index) => {
    if (rng() < 0.5 + density * 0.25) setPatternAnchor(steps, index, -5, 0.36, 0.18, { ghost: true });
  });
  return steps;
}

function buildTripletGhost(stepCount: 16 | 32, density: number, rng: () => number): PsyBassStep[] {
  const steps = buildClassicOffbeat(stepCount, density, rng);
  const ghostGrid = stepCount === 32 ? [5, 13, 21, 29] : [5, 13];
  ghostGrid.forEach((index) => {
    setPatternAnchor(steps, index, 0, 0.34 + density * 0.15, 0.16, { ghost: true });
  });
  const rises = stepCount === 32 ? [14, 30] : [14];
  rises.forEach((index) => {
    steps[index].glideToNext = true;
    if (index + 1 < stepCount && rng() > 0.42) {
      setPatternAnchor(steps, index + 1, 12, 0.52, 0.22, { ghost: true });
    }
  });
  return steps;
}

function buildDarkForest(stepCount: 16 | 32, density: number, rng: () => number): PsyBassStep[] {
  const steps = new Array(stepCount).fill(null).map(() => createStep());
  offbeatIndices(stepCount).forEach((index, n) => {
    const pick = [0, -1, -5, 0, 7][n % 5] ?? 0;
    setPatternAnchor(steps, index, pick, n === 0 ? 1 : 0.72, 0.46 + density * 0.08, {
      glideToNext: n % 2 === 0 && rng() > 0.52,
    });
  });
  const extras = stepCount === 32 ? [9, 25] : [9];
  extras.forEach((index) => {
    if (rng() < 0.66) setPatternAnchor(steps, index, -12, 0.34, 0.16, { ghost: true });
  });
  return steps;
}

function humanizePitch(steps: PsyBassStep[], descriptors: GrooveDescriptorVector, rng: () => number) {
  const mutationChance = clamp01(descriptors.fracture * 0.28 + descriptors.turbulence * 0.16);
  for (let i = 0; i < steps.length; i += 1) {
    if (!steps[i].active) continue;
    if (rng() < mutationChance) {
      const choices = [0, 7, 12, -5, 3];
      steps[i].semitone = choices[Math.floor(rng() * choices.length)] ?? 0;
      steps[i].accent = clamp01(steps[i].accent + 0.08);
    }
  }
}

export function generatePsyBassPattern(args: {
  barIndex: number;
  seed: number;
  rootHz: number;
  stepCount: 16 | 32;
  baseSwing: number;
  styleMorph: number;
  density: number;
  descriptors: GrooveDescriptorVector;
}): PsyBassPattern {
  const rng = mulberry32(args.seed ^ (args.barIndex * 2246822519));
  const style = chooseStyle(args.descriptors, args.styleMorph, rng);
  const density = clamp01(args.density * 0.7 + args.descriptors.pressure * 0.18 + args.descriptors.cohesion * 0.12);

  const builders: Record<PsyBassStyle, () => PsyBassStep[]> = {
    classicOffbeat: () => buildClassicOffbeat(args.stepCount, density, rng),
    rolling: () => buildRolling(args.stepCount, density, rng),
    gallop: () => buildGallop(args.stepCount, density, rng),
    tripletGhost: () => buildTripletGhost(args.stepCount, density, rng),
    darkForest: () => buildDarkForest(args.stepCount, density, rng),
  };

  const steps = builders[style]();
  humanizePitch(steps, args.descriptors, rng);

  const swing = clamp01(args.baseSwing + args.descriptors.orbitality * 0.05 - args.descriptors.fracture * 0.02);

  return {
    barIndex: args.barIndex,
    style,
    steps,
    stepCount: args.stepCount,
    rootHz: args.rootHz,
    swing,
  };
}

export function describePatternEnergy(pattern: PsyBassPattern) {
  const active = pattern.steps.filter((step) => step.active).length;
  const ghosts = pattern.steps.filter((step) => step.ghost).length;
  const accents = pattern.steps.reduce((sum, step) => sum + (step.active ? step.accent : 0), 0);
  return {
    active,
    ghosts,
    accents,
    density: active / pattern.steps.length,
  };
}
