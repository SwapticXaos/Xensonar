import {
  clamp,
  lerp,
  type WaveTimbreGradientState,
} from "../rooms/resonanceRuntimeMath";

export type WaveStarterGradientToneShapeArgs = {
  waveGradient: WaveTimbreGradientState;
  duration: number;
  gain: number;
  resonance: number;
  cutoffHz: number;
};

export type WaveStarterGradientToneShape = {
  gradientDuration: number;
  shapedVolume: number;
  shapedResonance: number;
  shapedCutoff: number;
  useScheduledTonePath: boolean;
};

export function resolveWaveStarterGradientToneShape(args: WaveStarterGradientToneShapeArgs): WaveStarterGradientToneShape {
  const gradientDuration = Math.max(0.04, args.duration * args.waveGradient.durationMul);
  const shapedVolume = args.gain * args.waveGradient.coreVolumeMul;
  const shapedResonance = Math.max(0.6, args.resonance + args.waveGradient.coreResonanceAdd);
  const shapedCutoff = clamp(
    args.cutoffHz * args.waveGradient.coreCutoffMul + args.waveGradient.coreCutoffAdd,
    260,
    7600,
  );

  return {
    gradientDuration,
    shapedVolume,
    shapedResonance,
    shapedCutoff,
    useScheduledTonePath: args.waveGradient.amount <= 0.018,
  };
}

export type WaveStarterGradientToneRenderPlanArgs = {
  waveGradient: WaveTimbreGradientState;
  toneFreq: number;
  now: number;
  gradientDuration: number;
  shapedVolume: number;
  activeCount: number;
  heldLong: boolean;
  gainScale: number;
  overloadSoftening: number;
  attackSoftening?: number;
};

export type WaveStarterGradientToneRenderPlan = {
  startAt: number;
  actualDur: number;
  coreAttack: number;
  corePeakAt: number;
  colorDelay: number;
  colorPeakAt: number;
  dryDuckAt: number;
  stopAt: number;
  jawariStart: number;
  jawariEnd: number;
  jawariPeak: number;
  vowel1Start: number;
  vowel1End: number;
  vowel1Peak: number;
  vowel2Start: number;
  vowel2End: number;
  vowel2Peak: number;
  shineHpStart: number;
  shineHpEnd: number;
  masterLevel: number;
  coreLevel: number;
  colorLevel: number;
};

export function resolveWaveStarterGradientToneRenderPlan(args: WaveStarterGradientToneRenderPlanArgs): WaveStarterGradientToneRenderPlan {
  const { waveGradient } = args;
  const actualDur = args.heldLong ? args.gradientDuration * 6 : args.gradientDuration;
  const attackSoftening = clamp(args.attackSoftening ?? 1, 1, 4);
  const coreAttack = Math.min(
    0.014,
    Math.max(0.001, actualDur * 0.024 * Math.min(args.overloadSoftening, 1.22) * attackSoftening),
  );
  const corePeakAt = args.now + coreAttack;
  const colorDelay = waveGradient.colorDelay + (args.activeCount >= 80 ? 0.0008 : 0);
  const colorPeakAt = args.now + colorDelay + waveGradient.colorAttack;
  const dryDuckAt = Math.min(args.now + Math.min(0.016, actualDur * 0.16), args.now + actualDur * 0.42);
  const stopAt = args.now + actualDur + 0.08;
  const noteTilt = Math.pow(clamp(args.toneFreq / 220, 0.5, 4), 0.08);
  const jawariStart = clamp(waveGradient.jawariFreqStart * noteTilt, 620, 3600);
  const jawariEnd = clamp(waveGradient.jawariFreqEnd * noteTilt, 780, 4600);
  const vowel1Start = clamp(waveGradient.vowel1Start * noteTilt, 360, 2300);
  const vowel1End = clamp(waveGradient.vowel1End * noteTilt, 480, 3100);
  const vowel2Start = clamp(waveGradient.vowel2Start * noteTilt, 1200, 5200);
  const vowel2End = clamp(waveGradient.vowel2End * noteTilt, 1600, 7200);
  const shineHpStart = clamp(waveGradient.shineHighpassStart * noteTilt, 1300, 6200);
  const shineHpEnd = clamp(waveGradient.shineHighpassEnd * noteTilt, 2000, 9200);
  const masterLevel = Math.max(0.0002, args.shapedVolume * args.gainScale);
  const attackLevelTrim = 1 / Math.sqrt(attackSoftening);
  const coreLevel = masterLevel * lerp(0.98, 0.78, waveGradient.amount) * attackLevelTrim;
  const colorLevel = masterLevel * waveGradient.colorMix / Math.max(1, args.overloadSoftening * 0.9 * Math.sqrt(attackSoftening));

  return {
    startAt: args.now,
    actualDur,
    coreAttack,
    corePeakAt,
    colorDelay,
    colorPeakAt,
    dryDuckAt,
    stopAt,
    jawariStart,
    jawariEnd,
    jawariPeak: Math.max(jawariStart * 1.02, lerp(jawariStart, jawariEnd, 0.58)),
    vowel1Start,
    vowel1End,
    vowel1Peak: Math.max(vowel1Start * 1.02, lerp(vowel1Start, vowel1End, 0.52)),
    vowel2Start,
    vowel2End,
    vowel2Peak: Math.max(vowel2Start * 1.03, lerp(vowel2Start, vowel2End, 0.62)),
    shineHpStart,
    shineHpEnd,
    masterLevel,
    coreLevel,
    colorLevel,
  };
}
