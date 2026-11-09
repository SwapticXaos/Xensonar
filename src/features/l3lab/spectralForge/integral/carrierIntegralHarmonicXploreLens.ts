import type { CarrierIntegralSynthLabParams } from './carrierIntegralSynthLab';
import { carrierIntegralHash31, carrierIntegralRound3, stableCarrierIntegralJson } from './carrierIntegralStableIdentity';

export type CarrierIntegralHarmonicXploreSeriesType =
  | 'singular'
  | 'natural'
  | 'octave'
  | 'numOdd'
  | 'numEven'
  | 'numPrime'
  | 'numFibo'
  | 'upper'
  | 'lower'
  | 'under'
  | 'inharmonic';

export type CarrierIntegralHarmonicXplorePhase = 'phaseFull' | 'phaseUp' | 'phaseDown';

export type CarrierIntegralHarmonicXploreTimbreFlavor =
  | 'plain'
  | 'resonator'
  | 'scatter'
  | 'formant'
  | 'metallic'
  | 'warm'
  | 'bell'
  | 'chorus'
  | 'bright';

export type CarrierIntegralHarmonicXploreProfile = {
  id: string;
  label: string;
  seriesType: CarrierIntegralHarmonicXploreSeriesType;
  phase: CarrierIntegralHarmonicXplorePhase;
  count: number;
  summary: string;
  carrierReading: 'overtone-ribbon' | 'prime-skeleton' | 'fibonacci-shell' | 'undertone-mirror';
  timbreFlavor?: CarrierIntegralHarmonicXploreTimbreFlavor;
  swarmDispersion?: number;
  formantFocus?: number;
};

export type CarrierIntegralHarmonicXploreOscillator = {
  type: OscillatorType;
  gain: number;
  freqMul: number;
  detune: number;
};

const clamp = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
};

function isPrime(value: number): boolean {
  if (!Number.isFinite(value) || value < 2) return false;
  for (let divisor = 2; divisor <= Math.sqrt(value); divisor += 1) {
    if (value % divisor === 0) return false;
  }
  return true;
}

function generatePrimes(count: number): number[] {
  const result: number[] = [];
  let candidate = 2;
  while (result.length < count) {
    if (isPrime(candidate)) result.push(candidate);
    candidate += 1;
  }
  return result;
}

function generateFibonacci(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [1];
  const result = [1, 2];
  while (result.length < count) {
    result.push(result[result.length - 1]! + result[result.length - 2]!);
  }
  return result;
}

export function buildCarrierIntegralHarmonicXploreSeries(
  count: number,
  seriesType: CarrierIntegralHarmonicXploreSeriesType,
  phase: CarrierIntegralHarmonicXplorePhase = 'phaseFull',
): number[] {
  const safeCount = Math.max(1, Math.min(32, Math.floor(count || 1)));
  let series: number[];
  switch (seriesType) {
    case 'singular':
      series = [1];
      break;
    case 'octave':
      series = Array.from({ length: safeCount }, (_, index) => 2 ** index);
      break;
    case 'numOdd':
      series = Array.from({ length: safeCount }, (_, index) => 2 * index + 1);
      break;
    case 'numEven':
      series = Array.from({ length: safeCount }, (_, index) => 2 * (index + 1));
      break;
    case 'numPrime':
      series = generatePrimes(safeCount);
      break;
    case 'numFibo':
      series = generateFibonacci(safeCount);
      break;
    case 'upper':
      series = Array.from({ length: safeCount }, (_, index) => index + 2);
      break;
    case 'lower':
      series = Array.from({ length: safeCount }, (_, index) => 1 / (index + 2));
      break;
    case 'under':
      series = Array.from({ length: safeCount }, (_, index) => 1 / (index + 1));
      break;
    case 'inharmonic':
      series = Array.from({ length: safeCount }, (_, index) => Math.pow(index + 1, 1.41421356237));
      break;
    case 'natural':
    default:
      series = Array.from({ length: safeCount }, (_, index) => index + 1);
      break;
  }
  if (phase === 'phaseDown') return series.map((value) => -Math.abs(value));
  return series.map((value) => Math.abs(value));
}

export const CARRIER_INTEGRAL_HARMONIC_XPLORE_PROFILES: CarrierIntegralHarmonicXploreProfile[] = [
  {
    id: 'harmonic-xplore-natural-ribbon',
    label: 'Natur',
    seriesType: 'natural',
    phase: 'phaseUp',
    count: 8,
    carrierReading: 'overtone-ribbon',
    summary: 'HarmonicXplorE: natürliche Obertonreihe als Carrier-Band mit frei regelbarer Partialanzahl.',
  },
  {
    id: 'harmonic-xplore-prime-spine',
    label: 'Prim',
    seriesType: 'numPrime',
    phase: 'phaseUp',
    count: 8,
    carrierReading: 'prime-skeleton',
    summary: 'HarmonicXplorE: Primzahlen als kantiger Verhältnis-Körper; hohe Primzahlen werden registergefaltet statt gekappt.',
  },
  {
    id: 'harmonic-xplore-resonator-body',
    label: 'Resonator',
    seriesType: 'numOdd',
    phase: 'phaseUp',
    count: 10,
    carrierReading: 'prime-skeleton',
    timbreFlavor: 'resonator',
    formantFocus: 0.48,
    summary: 'HarmonicXplorE: hohler, ungerader Resonanzkörper mit sanftem Formantzug.',
  },
  {
    id: 'harmonic-xplore-scatter-body',
    label: 'Scatter',
    seriesType: 'numPrime',
    phase: 'phaseUp',
    count: 10,
    carrierReading: 'prime-skeleton',
    timbreFlavor: 'scatter',
    swarmDispersion: 0.62,
    summary: 'HarmonicXplorE: deterministische Schwarm-Streuung im Tuning und in der Phase.',
  },
  {
    id: 'harmonic-xplore-metallic-inharmonic',
    label: 'Metallisch',
    seriesType: 'inharmonic',
    phase: 'phaseUp',
    count: 12,
    carrierReading: 'fibonacci-shell',
    timbreFlavor: 'metallic',
    swarmDispersion: 0.24,
    formantFocus: 0.22,
    summary: 'HarmonicXplorE: inharmonische Spreizung für glockenartige, klirrende Körper.',
  },
  {
    id: 'harmonic-xplore-fibonacci-shell',
    label: 'Fibonacci',
    seriesType: 'numFibo',
    phase: 'phaseUp',
    count: 8,
    carrierReading: 'fibonacci-shell',
    summary: 'HarmonicXplorE: Fibonacci-Verhältnisse als organische Wachstumsfigur mit regelbarer Partialanzahl.',
  },
  {
    id: 'harmonic-xplore-undertone-mirror',
    label: 'Unterton',
    seriesType: 'under',
    phase: 'phaseFull',
    count: 8,
    carrierReading: 'undertone-mirror',
    summary: 'HarmonicXplorE: Untertonreihe für Sub-/Gegenkörper ohne Host-Raster-Überschreibung.',
  },
  {
    id: 'harmonic-xplore-gerade-halo',
    label: 'Gerade',
    seriesType: 'numEven',
    phase: 'phaseUp',
    count: 9,
    carrierReading: 'overtone-ribbon',
    timbreFlavor: 'warm',
    summary: 'HarmonicXplorE: gerade Obertöne als warmer, flötenartiger Körper — Grundton fehlt, Quinte dominiert.',
  },
  {
    id: 'harmonic-xplore-oktave-turm',
    label: 'Oktave',
    seriesType: 'octave',
    phase: 'phaseUp',
    count: 7,
    carrierReading: 'overtone-ribbon',
    timbreFlavor: 'bell',
    summary: 'HarmonicXplorE: reine Oktavleiter als kristalliner Glocken-/Bell-Körper mit steilem Partialdekay.',
  },
  {
    id: 'harmonic-xplore-chorus-raum',
    label: 'Chor',
    seriesType: 'natural',
    phase: 'phaseUp',
    count: 10,
    carrierReading: 'overtone-ribbon',
    timbreFlavor: 'chorus',
    swarmDispersion: 0.38,
    summary: 'HarmonicXplorE: natürliche Reihe als deterministisches Chorensemble — weiche Schwebungsbreite, breiter Stereoraum.',
  },
  {
    id: 'harmonic-xplore-upper-krone',
    label: 'Krone',
    seriesType: 'upper',
    phase: 'phaseUp',
    count: 9,
    carrierReading: 'prime-skeleton',
    timbreFlavor: 'bright',
    summary: 'HarmonicXplorE: Oberton-Krone ab dem zweiten Partial — heller, buzziger Körper ohne Grundton.',
  },
  {
    id: 'harmonic-xplore-tief-spiegel',
    label: 'Tief',
    seriesType: 'lower',
    phase: 'phaseUp',
    count: 6,
    carrierReading: 'undertone-mirror',
    timbreFlavor: 'resonator',
    formantFocus: 0.62,
    summary: 'HarmonicXplorE: Sub-Register-Spiegel — gebrochene Frequenzverhältnisse unter der Grundlinie mit Formantzug.',
  },
];

const PROFILE_BY_ID = new Map(CARRIER_INTEGRAL_HARMONIC_XPLORE_PROFILES.map((profile) => [profile.id, profile] as const));

export function resolveCarrierIntegralHarmonicXploreProfile(
  presetId: string | null | undefined,
): CarrierIntegralHarmonicXploreProfile | null {
  return typeof presetId === 'string' ? PROFILE_BY_ID.get(presetId) ?? null : null;
}

function analyseRatios(ratios: number[]) {
  const magnitudes = ratios.map((ratio) => Math.abs(ratio)).filter((ratio) => Number.isFinite(ratio) && ratio > 0);
  const bounded = magnitudes.length ? magnitudes : [1];
  const logs = bounded.map((ratio) => Math.log2(clamp(ratio, 0.125, 8)));
  const highShare = bounded.filter((ratio) => ratio >= 2).length / bounded.length;
  const lowShare = bounded.filter((ratio) => ratio < 1).length / bounded.length;
  const logMean = logs.reduce((sum, value) => sum + value, 0) / logs.length;
  const logVariance = logs.reduce((sum, value) => sum + (value - logMean) ** 2, 0) / logs.length;
  const irregularity = clamp(Math.sqrt(logVariance) / 2.2, 0, 1);
  const verticality = clamp(Math.abs(logMean) / 2.4, 0, 1);
  return { highShare, lowShare, irregularity, verticality };
}

export function buildCarrierIntegralSynthLabPatchFromHarmonicXploreProfile(
  profile: CarrierIntegralHarmonicXploreProfile,
): Partial<CarrierIntegralSynthLabParams> {
  const series = buildCarrierIntegralHarmonicXploreSeries(profile.count, profile.seriesType, profile.phase);
  const { highShare, lowShare, irregularity, verticality } = analyseRatios(series);
  const primeLike = profile.seriesType === 'numPrime' ? 1 : 0;
  const fiboLike = profile.seriesType === 'numFibo' ? 1 : 0;
  const undertone = profile.seriesType === 'under' || profile.seriesType === 'lower' ? 1 : 0;
  return {
    sine: clamp(0.36 + undertone * 0.22 + fiboLike * 0.16 - primeLike * 0.12, 0, 1),
    triangle: clamp(0.22 + fiboLike * 0.24 + undertone * 0.08, 0, 1),
    sawtooth: clamp(0.14 + highShare * 0.28 + irregularity * 0.18 + primeLike * 0.18, 0, 1),
    square: clamp(0.03 + primeLike * 0.2 + irregularity * 0.12, 0, 1),
    sub: clamp(0.08 + lowShare * 0.34 + undertone * 0.18, 0, 1),
    overtone: clamp(0.1 + highShare * 0.28 + verticality * 0.2, 0, 1),
    detuneCents: clamp((profile.phase === 'phaseDown' ? -1 : 1) * (4 + irregularity * 18 + primeLike * 5), -48, 48),
    harmonicSpread: clamp(0.1 + verticality * 0.36 + irregularity * 0.28, 0, 1),
    filterFrequency: clamp(760 + highShare * 3800 + verticality * 1200 - undertone * 420, 160, 7200),
    filterQ: clamp(0.72 + irregularity * 3.2 + primeLike * 1.2, 0.1, 8),
    attackScale: clamp(0.035 + fiboLike * 0.045 + undertone * 0.08, 0.005, 0.6),
    releaseScale: clamp(0.24 + fiboLike * 0.28 + undertone * 0.32 + (1 - highShare) * 0.16, 0.04, 1.4),
    transientGain: clamp(0.06 + primeLike * 0.18 + highShare * 0.08, 0, 0.45),
    panSpread: clamp(0.08 + irregularity * 0.18 + fiboLike * 0.14, 0, 0.65),
    drive: clamp(0.08 + primeLike * 0.28 + highShare * 0.14, 0, 1),
    outputGain: clamp(0.78 - primeLike * 0.08 - highShare * 0.06 + undertone * 0.04, 0.18, 1),
  };
}

export const HARMONIC_XPLORE_SYNTH_LAB_PRESETS = [] as const;
// Seit 3.2.91.7.5.69 sind HarmonicXplorE-Profile keine Synth-Labor-Presets mehr.
// Die leere Legacy-Konstante bleibt nur als Import-Fuse für ältere Checks erhalten.

function chooseOscillatorType(profile: CarrierIntegralHarmonicXploreProfile, index: number): OscillatorType {
  if (profile.seriesType === 'numPrime') return index % 3 === 0 ? 'sawtooth' : index % 3 === 1 ? 'square' : 'triangle';
  if (profile.seriesType === 'numFibo') return index % 2 === 0 ? 'triangle' : 'sine';
  if (profile.seriesType === 'under') return index <= 1 ? 'sine' : 'triangle';
  if (profile.seriesType === 'numOdd') return index % 2 === 0 ? 'square' : 'triangle';
  if (profile.seriesType === 'inharmonic') return index % 2 === 0 ? 'sine' : 'sawtooth';
  if (profile.seriesType === 'octave') return index === 0 ? 'sine' : index <= 2 ? 'triangle' : 'square';
  if (profile.seriesType === 'numEven') return index % 2 === 0 ? 'sine' : 'triangle';
  if (profile.seriesType === 'upper') return index % 2 === 0 ? 'sawtooth' : 'triangle';
  if (profile.seriesType === 'lower') return index === 0 ? 'sine' : index % 2 === 0 ? 'triangle' : 'sine';
  return index <= 1 ? 'sine' : index % 2 === 0 ? 'triangle' : 'sawtooth';
}

export function buildCarrierIntegralHarmonicXploreOscillatorBank(
  presetId: string | null | undefined,
  params: CarrierIntegralSynthLabParams,
  harmonicCount?: number,
  rolloff = 0.82,
): CarrierIntegralHarmonicXploreOscillator[] | null {
  const profile = resolveCarrierIntegralHarmonicXploreProfile(presetId);
  if (!profile) return null;
  const safeCount = Math.max(1, Math.min(32, Math.round(harmonicCount ?? profile.count ?? 8)));
  const rawSeries = buildCarrierIntegralHarmonicXploreSeries(safeCount, profile.seriesType, profile.phase)
    .map((ratio) => {
      const sign = ratio < 0 ? -1 : 1;
      let folded = Math.abs(ratio);
      while (folded > 12) folded /= 2;
      while (folded < 0.125) folded *= 2;
      return sign * folded;
    })
    .filter((ratio) => Math.abs(ratio) > 0.001);
  const series = rawSeries.length ? rawSeries : [1];
  const phaseSign = profile.phase === 'phaseDown' ? -1 : 1;
  const safeRolloff = clamp(rolloff, 0.35, 2.25);
  const weights = series.map((ratio, index) => {
    const decay = 1 / Math.pow(index + 1, safeRolloff);
    const verticalPenalty = Math.abs(ratio) > 8 ? 0.82 : 1;
    const subLift = Math.abs(ratio) < 1 ? 1.18 : 1;
    return decay * verticalPenalty * subLift;
  });
  const weightTotal = Math.max(0.001, weights.reduce((sum, value) => sum + value, 0));
  const driveGain = 1 + params.drive * 0.28;
  const targetGain = params.outputGain * (0.84 + params.overtone * 0.16);
  return series.map((ratio, index) => ({
    type: chooseOscillatorType(profile, index),
    gain: clamp((weights[index]! / weightTotal) * targetGain * driveGain, 0.004, 0.38),
    freqMul: Math.abs(ratio),
    detune: clamp(phaseSign * params.detuneCents * (index / Math.max(1, series.length - 1)) * 0.6, -120, 120),
  }));
}

export function buildCarrierIntegralHarmonicXploreDescriptor(presetId: string | null | undefined): string | null {
  const profile = resolveCarrierIntegralHarmonicXploreProfile(presetId);
  if (!profile) return null;
  const series = buildCarrierIntegralHarmonicXploreSeries(profile.count, profile.seriesType, profile.phase)
    .map((value) => carrierIntegralRound3(value));
  const hash = carrierIntegralHash31(stableCarrierIntegralJson({ id: profile.id, series }));
  return `${profile.carrierReading} · ${profile.seriesType}/${profile.phase} · ${series.join(' : ')} · ${hash}`;
}
