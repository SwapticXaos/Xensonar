import { clamp, quantizeStepSeconds, type QuantizeSubdivision } from "../../shared/tuning/grid";

export const MICRO_GATE_PATTERN = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0] as const;

export type HyperPatternContext = {
  hyperPattern: number[] | null;
  patternLen: number;
  hyper2Pattern: number[] | null;
  hyper2PitchOffsets: number[] | null;
  hyper2Len: number;
};

export type SequencerStepState = {
  step: number;
  baseStep: number;
  subStep: number;
  isMicroStep: boolean;
  longStepBase: number;
  longStep: number;
  longWeight: number;
  longWeightNear: number;
  finalHit: boolean;
  finalNearHit: boolean;
  heavyHitAllowed: boolean;
  bassHitAllowed: boolean;
  hatMicroGain: number;
};

export type HarmonyCascadeEvent = {
  time: number;
  bassFreq: number;
  bassVol: number;
  bassDur: number;
  leadFreq: number;
  leadDur: number;
  leadType: OscillatorType;
  leadVol: number;
  leadQ: number;
  leadCutoff: number;
};

export const quantizeSubFactor = (subdivision?: QuantizeSubdivision) =>
  subdivision === "64" ? 4 : subdivision === "32" ? 2 : 1;

export const buildHyperPatternContext = (args: {
  hyperCalibrateOn: boolean;
  hyperCalibratedReady: boolean;
  hyperCalibratedPattern: number[];
  hyperCali2On: boolean;
  hyperCali2Ready: boolean;
  hyperCali2Weights64: number[];
  hyperCali2PitchOffsets: number[];
}): HyperPatternContext => {
  const hyperPattern =
    args.hyperCalibrateOn &&
    args.hyperCalibratedReady &&
    Array.isArray(args.hyperCalibratedPattern)
      ? args.hyperCalibratedPattern
      : null;
  const patternLen = hyperPattern && hyperPattern.length > 0 ? hyperPattern.length : 16;

  const hyper2Pattern =
    args.hyperCali2On &&
    args.hyperCali2Ready &&
    Array.isArray(args.hyperCali2Weights64)
      ? args.hyperCali2Weights64
      : null;
  const hyper2PitchOffsets =
    args.hyperCali2On &&
    args.hyperCali2Ready &&
    Array.isArray(args.hyperCali2PitchOffsets)
      ? args.hyperCali2PitchOffsets
      : null;
  const hyper2Len = hyper2Pattern && hyper2Pattern.length > 0 ? hyper2Pattern.length : 64;

  return {
    hyperPattern,
    patternLen,
    hyper2Pattern,
    hyper2PitchOffsets,
    hyper2Len,
  };
};

export const computeSequencerStepState = (args: {
  nextStep: number;
  subFactor: number;
  stepsPerBar: number;
  grooveTightness: number;
  patterns: HyperPatternContext;
}): SequencerStepState => {
  const { nextStep, subFactor, stepsPerBar, patterns } = args;
  const grooveTightness = clamp(args.grooveTightness, 0, 1);

  const step = nextStep % stepsPerBar;
  const baseStep = Math.floor(step / subFactor) % 16;
  const subStep = step % subFactor;
  const isMicroStep = subFactor > 1 && subStep !== 0;

  const longStepBase = Math.floor(nextStep / subFactor);
  const longStep = longStepBase % patterns.hyper2Len;
  const longWeight = patterns.hyper2Pattern ? clamp(patterns.hyper2Pattern[longStep] ?? 0.5, 0, 1) : 1;
  const longWeightNear = patterns.hyper2Pattern
    ? Math.max(
        clamp(patterns.hyper2Pattern[(longStep - 1 + patterns.hyper2Len) % patterns.hyper2Len] ?? 0.5, 0, 1),
        longWeight,
        clamp(patterns.hyper2Pattern[(longStep + 1) % patterns.hyper2Len] ?? 0.5, 0, 1),
      )
    : 1;

  const baseHit = !patterns.hyperPattern || Boolean(patterns.hyperPattern[baseStep % patterns.patternLen]);
  const nearHit =
    !patterns.hyperPattern ||
    baseHit ||
    Boolean(patterns.hyperPattern[(baseStep - 1 + patterns.patternLen) % patterns.patternLen]) ||
    Boolean(patterns.hyperPattern[(baseStep + 1) % patterns.patternLen]);

  const macroHit = !patterns.hyper2Pattern || longWeight > 0.34;
  const macroNear = !patterns.hyper2Pattern || longWeightNear > 0.22;

  const subStepWeight = !isMicroStep ? 1 : subFactor === 2 ? 1 : subStep === 2 ? 1 : 0.42;
  const sideSubStepPenalty = subFactor === 4 && subStepWeight < 1 ? 0.1 : 0;
  const microThresholdBase = subFactor === 4 ? 0.3 : 0.26;
  const microWindowOpen =
    !isMicroStep ||
    (Boolean(MICRO_GATE_PATTERN[baseStep]) &&
      longWeightNear >
        microThresholdBase +
          grooveTightness * (subFactor === 4 ? 0.5 : 0.42) +
          sideSubStepPenalty);

  const finalHit = baseHit && macroHit && microWindowOpen;
  const finalNearHit =
    nearHit &&
    macroNear &&
    (!isMicroStep ||
      longWeightNear >
        0.2 +
          grooveTightness * (subFactor === 4 ? 0.42 : 0.35) +
          (subStepWeight < 1 ? 0.06 : 0));

  const heavyHitAllowed =
    !isMicroStep || (grooveTightness < 0.3 && longWeight > 0.8 && subStepWeight >= 1);
  const bassHitAllowed =
    !isMicroStep || (grooveTightness < 0.4 && longWeight > 0.7 && subStepWeight >= 1);

  const hatMicroGain =
    !isMicroStep
      ? 1
      : subFactor === 2
        ? 0.38 + (1 - grooveTightness) * 0.52
        : subStep === 2
          ? 0.28 + (1 - grooveTightness) * 0.5
          : 0.14 + (1 - grooveTightness) * 0.32;

  return {
    step,
    baseStep,
    subStep,
    isMicroStep,
    longStepBase,
    longStep,
    longWeight,
    longWeightNear,
    finalHit,
    finalNearHit,
    heavyHitAllowed,
    bassHitAllowed,
    hatMicroGain,
  };
};

export const resolveComposerRootHz = (args: {
  bassRootMode: "auto" | "fixed";
  bassRootHz: number;
  cursorY: number;
  freqFromY: (y: number) => number;
}) => {
  if (args.bassRootMode === "fixed") return args.bassRootHz;
  let cursorFreq = args.freqFromY(args.cursorY);
  while (cursorFreq > 80) cursorFreq /= 2;
  return cursorFreq;
};

export const applyLongPatternPitchOffset = (args: {
  rootHz: number;
  longStepBase: number;
  hyper2PitchOffsets: number[] | null;
  longWeight: number;
}) => {
  let root = args.rootHz;
  if (args.hyper2PitchOffsets && args.hyper2PitchOffsets.length) {
    const offset = args.hyper2PitchOffsets[args.longStepBase % args.hyper2PitchOffsets.length] ?? 0;
    root *= Math.pow(2, clamp(offset, -7, 7) / 12);
  }
  return root * (0.94 + args.longWeight * 0.16);
};

export const deriveStepTiming = (bpm: number, subdivision?: QuantizeSubdivision) => {
  const subFactor = quantizeSubFactor(subdivision);
  return {
    subdivision: subdivision ?? "16",
    subFactor,
    stepsPerBar: 16 * subFactor,
    stepSeconds: quantizeStepSeconds(bpm, subdivision),
  };
};

export const buildHarmonyCascadePlan = (args: {
  harmonyCascadeSteps?: number;
  anchorTime: number;
  rootHz: number;
  baseStep: number;
  longWeight: number;
  ratios: number[];
  cursorX: number;
  gameWidth: number;
  stepSeconds: number;
  bassVolume: number;
  clampFreq: (freq: number, min?: number, max?: number) => number;
}): HarmonyCascadeEvent[] => {
  const repeats = Math.max(0, Math.min(8, Math.floor(args.harmonyCascadeSteps ?? 0)));
  if (repeats <= 0 || !args.ratios.length) return [];

  const steer = Math.floor((args.cursorX / args.gameWidth) * args.ratios.length);
  const stride = args.stepSeconds * (0.44 + (1 - args.longWeight) * 0.28);
  const baseVol = clamp(args.bassVolume * (0.58 + args.longWeight * 0.52), 0.02, 0.9);

  const plan: HarmonyCascadeEvent[] = [];
  for (let i = 1; i <= repeats; i += 1) {
    const idx = (args.baseStep + steer + i * 2) % args.ratios.length;
    const ratio = args.ratios[idx];
    const octave = i % 4 === 0 ? 2 : i % 3 === 0 ? 0.5 : 1;
    const bassFreq = args.clampFreq(args.rootHz * ratio * octave, 35, 520);
    const time = args.anchorTime + i * stride;
    const bassVol = baseVol * Math.max(0.14, 0.9 - i * 0.12);
    const bassDur = Math.max(args.stepSeconds * 0.35, args.stepSeconds * (0.9 - i * 0.08));
    const leadFreq = args.clampFreq(bassFreq * (i % 2 === 0 ? 2 : 1.5), 90, 2200);

    plan.push({
      time,
      bassFreq,
      bassVol,
      bassDur,
      leadFreq,
      leadDur: Math.max(0.08, bassDur * 0.55),
      leadType: i % 2 === 0 ? "triangle" : "sine",
      leadVol: bassVol * 0.22,
      leadQ: 1.4,
      leadCutoff: 1800 + i * 120,
    });
  }
  return plan;
};
