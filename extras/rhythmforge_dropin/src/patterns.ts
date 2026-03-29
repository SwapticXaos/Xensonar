import type {
  BassStep,
  DrumStep,
  GeneratedPattern,
  GrooveDescriptorVector,
} from "./types";

const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const JI_POOLS = {
  grounded: [1, 9 / 8, 6 / 5, 4 / 3, 3 / 2],
  bright: [1, 10 / 9, 5 / 4, 3 / 2, 5 / 3],
  dark: [1, 16 / 15, 6 / 5, 4 / 3, 8 / 5],
  unstable: [1, 7 / 6, 11 / 8, 3 / 2, 7 / 4],
};

const STEP_COUNT = 16;

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

const choosePool = (d: GrooveDescriptorVector) => {
  if (d.fracture > 0.62 || d.turbulence > 0.7) return JI_POOLS.unstable;
  if (d.crystallization > 0.58 && d.cohesion > 0.54) return JI_POOLS.bright;
  if (d.pressure > 0.55 && d.crystallization < 0.35) return JI_POOLS.dark;
  return JI_POOLS.grounded;
};

const baseKickTemplate = (d: GrooveDescriptorVector): DrumStep[] => {
  const dense = d.pressure > 0.55 || d.turbulence > 0.62;
  const broken = d.fracture > 0.52;
  return new Array(STEP_COUNT).fill(null).map((_, i) => ({
    active:
      i === 0 ||
      i === 8 ||
      (dense && (i === 4 || i === 12)) ||
      (broken && (i === 10 || i === 14)),
    accent: i === 0 ? 1 : i === 8 ? 0.9 : 0.6,
  }));
};

const baseSnareTemplate = (d: GrooveDescriptorVector): DrumStep[] => {
  const ghost = d.turbulence * 0.6 + d.fracture * 0.5;
  return new Array(STEP_COUNT).fill(null).map((_, i) => ({
    active: i === 4 || i === 12 || (ghost > 0.45 && (i === 7 || i === 15)),
    accent: i === 4 || i === 12 ? 1 : 0.42 + ghost * 0.3,
  }));
};

const baseHatTemplate = (d: GrooveDescriptorVector): DrumStep[] => {
  const density = clamp01(0.35 + d.pressure * 0.35 + d.orbitality * 0.2 + d.turbulence * 0.2);
  return new Array(STEP_COUNT).fill(null).map((_, i) => {
    const active = i % 2 === 0 || density > 0.58 || (density > 0.42 && i % 4 === 3);
    return {
      active,
      accent: i % 4 === 0 ? 0.72 : i % 2 === 0 ? 0.52 : 0.34 + density * 0.18,
    };
  });
};

const bassTemplate = (d: GrooveDescriptorVector, rng: () => number): BassStep[] => {
  const pool = choosePool(d);
  const noteBias = clamp01(0.24 + d.cohesion * 0.32 + d.pressure * 0.26 + d.crystallization * 0.18);
  const syncopation = clamp01(d.fracture * 0.42 + d.turbulence * 0.34 + (1 - d.recurrence) * 0.18);
  const steps: BassStep[] = new Array(STEP_COUNT).fill(null).map(() => ({
    active: false,
    ratio: 1,
    octave: -1,
    accent: 0.6,
  }));

  const anchors = [0, 3, 6, 8, 10, 12, 14];
  anchors.forEach((index, anchorIndex) => {
    const gateChance = anchorIndex === 0 ? 1 : noteBias - (index % 4 === 2 ? 0.08 : 0);
    if (rng() <= gateChance) {
      const ratioIndex = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
      const octave = d.pressure > 0.58 && index % 8 === 0 ? -2 : -1;
      steps[index] = {
        active: true,
        ratio: pool[ratioIndex],
        octave,
        accent: index === 0 || index === 8 ? 1 : 0.58 + d.pressure * 0.22,
        glideToNext: d.orbitality > 0.6 && rng() > 0.66,
      };
    }
  });

  // Tie or ghost the following step when cohesion is high; break it when fracture is high.
  for (let i = 0; i < STEP_COUNT - 1; i += 1) {
    if (!steps[i].active) continue;
    const canExtend = i % 2 === 0 && rng() < lerp(0.14, 0.54, d.cohesion);
    if (canExtend && !steps[i + 1].active) {
      steps[i].tie = true;
      if (rng() < syncopation * 0.7) {
        steps[i + 1] = {
          active: true,
          ratio: steps[i].ratio,
          octave: steps[i].octave,
          accent: 0.34,
        };
      }
    }
  }

  // Extra syncopation notes.
  if (syncopation > 0.42) {
    [5, 7, 11, 15].forEach((index) => {
      if (!steps[index].active && rng() < syncopation * 0.52) {
        const ratioIndex = Math.floor(rng() * pool.length);
        steps[index] = {
          active: true,
          ratio: pool[ratioIndex],
          octave: -1,
          accent: 0.38 + d.fracture * 0.26,
        };
      }
    });
  }

  // Keep at least a usable pulse.
  if (!steps.some((step) => step.active)) {
    steps[0] = { active: true, ratio: 1, octave: -1, accent: 1 };
    steps[8] = { active: true, ratio: pool[Math.min(1, pool.length - 1)], octave: -1, accent: 0.9 };
  }

  return steps;
};

function mutateDrums(template: DrumStep[], rng: () => number, amount: number): DrumStep[] {
  return template.map((step, index) => {
    if (!step.active) {
      const addGhost = rng() < amount * 0.16 && index % 2 === 1;
      if (addGhost) return { active: true, accent: 0.22 + amount * 0.18 };
      return { active: false, accent: step.accent ?? 0 };
    }
    if (rng() < amount * 0.12) {
      return { active: false, accent: 0 };
    }
    return {
      active: true,
      accent: clamp01((step.accent ?? 0.6) + (rng() - 0.5) * amount * 0.35),
    };
  });
}

export function generateGroovePattern(args: {
  barIndex: number;
  seed: number;
  rootHz: number;
  baseSwing: number;
  descriptors: GrooveDescriptorVector;
}): GeneratedPattern {
  const { barIndex, descriptors } = args;
  const rng = mulberry32(args.seed ^ (barIndex * 2654435761));
  const kick = mutateDrums(baseKickTemplate(descriptors), rng, descriptors.turbulence * 0.4 + descriptors.fracture * 0.3);
  const snare = mutateDrums(baseSnareTemplate(descriptors), rng, descriptors.fracture * 0.45);
  const hat = mutateDrums(baseHatTemplate(descriptors), rng, descriptors.turbulence * 0.5 + descriptors.orbitality * 0.24);
  const bass = bassTemplate(descriptors, rng);

  const swing = clamp01(args.baseSwing + descriptors.orbitality * 0.08 - descriptors.fracture * 0.03);
  const noteLength = clamp01(0.44 + descriptors.cohesion * 0.18 - descriptors.turbulence * 0.12 + descriptors.recurrence * 0.08);

  return {
    barIndex,
    bass,
    kick,
    snare,
    hat,
    swing,
    noteLength,
    rootHz: args.rootHz,
  };
}
