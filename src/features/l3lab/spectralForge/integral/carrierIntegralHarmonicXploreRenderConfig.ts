import type { CarrierIntegralSynthLabSelection } from './carrierIntegralSynthLab';
import {
  DEFAULT_CARRIER_INTEGRAL_SYNTH_LAB_PARAMS,
  resolveCarrierIntegralSynthLabParams,
  type CarrierIntegralSynthLabParams,
} from './carrierIntegralSynthLab';
import {
  CARRIER_INTEGRAL_HARMONIC_XPLORE_PROFILES,
  buildCarrierIntegralHarmonicXploreSeries,
  resolveCarrierIntegralHarmonicXploreProfile,
  type CarrierIntegralHarmonicXplorePhase,
  type CarrierIntegralHarmonicXploreSeriesType,
} from './carrierIntegralHarmonicXploreLens';
import { carrierIntegralHash31, carrierIntegralRound3, stableCarrierIntegralJson } from './carrierIntegralStableIdentity';

export type CarrierIntegralHarmonicXploreRegisterFold = 'compact' | 'balanced' | 'open';
export type CarrierIntegralHarmonicXploreDetailMode = 'balanced' | 'dense';

export type CarrierIntegralHarmonicXploreSelection = {
  version: 'carrier-integral-harmonic-xplore-v1';
  profileId: string;
  seriesType: CarrierIntegralHarmonicXploreSeriesType;
  phase: CarrierIntegralHarmonicXplorePhase;
  count: number;
  rolloff: number;
  registerFold: CarrierIntegralHarmonicXploreRegisterFold;
  detailDensity: number;
  detailMode: CarrierIntegralHarmonicXploreDetailMode;
  updatedAt: number | null;
  source: 'default' | 'user' | 'project' | 'legacy-migration';
};

export type CarrierIntegralHarmonicXploreSelectionPatch = Partial<Pick<
  CarrierIntegralHarmonicXploreSelection,
  'profileId' | 'seriesType' | 'phase' | 'count' | 'rolloff' | 'registerFold' | 'detailDensity' | 'detailMode' | 'source'
>>;

export type CarrierIntegralHarmonicXploreWaveMix = {
  sine: number;
  triangle: number;
  sawtooth: number;
  square: number;
};

export type CarrierIntegralHarmonicXplorePartial = {
  index: number;
  rawRatio: number;
  renderRatio: number;
  foldOctaves: number;
  gain: number;
  phaseOffset: number;
  detune: number;
  waveMix: CarrierIntegralHarmonicXploreWaveMix;
  dominantType: OscillatorType;
};

export type CarrierIntegralHarmonicXploreWaveOscillator = {
  type: OscillatorType;
  gain: number;
  freqMul: number;
  detune: number;
};

export type CarrierIntegralHarmonicXploreRenderConfig = {
  version: 'carrier-integral-harmonic-xplore-render-config-v1';
  configHash: string;
  timbrePresetId: string;
  harmonicProfileId: string;
  seriesType: CarrierIntegralHarmonicXploreSeriesType;
  phase: CarrierIntegralHarmonicXplorePhase;
  count: number;
  rolloff: number;
  registerFold: CarrierIntegralHarmonicXploreRegisterFold;
  detailDensity: number;
  detailMode: CarrierIntegralHarmonicXploreDetailMode;
  rawSeries: number[];
  renderSeries: number[];
  partials: CarrierIntegralHarmonicXplorePartial[];
  estimatedVoiceCost: number;
};

const clamp = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
};

export const DEFAULT_CARRIER_INTEGRAL_HARMONIC_XPLORE_SELECTION: CarrierIntegralHarmonicXploreSelection = {
  version: 'carrier-integral-harmonic-xplore-v1',
  profileId: 'harmonic-xplore-natural-ribbon',
  seriesType: 'natural',
  phase: 'phaseUp',
  count: 8,
  rolloff: 0.82,
  registerFold: 'balanced',
  detailDensity: 0.62,
  detailMode: 'balanced',
  updatedAt: null,
  source: 'default',
};

const HX_PROFILE_ID_SET = new Set(CARRIER_INTEGRAL_HARMONIC_XPLORE_PROFILES.map((profile) => profile.id));

export function isCarrierIntegralHarmonicXploreProfileId(value: unknown): value is string {
  return typeof value === 'string' && HX_PROFILE_ID_SET.has(value);
}

export function createDefaultCarrierIntegralHarmonicXploreSelection(): CarrierIntegralHarmonicXploreSelection {
  return { ...DEFAULT_CARRIER_INTEGRAL_HARMONIC_XPLORE_SELECTION };
}

function normalizeRegisterFold(value: unknown, fallback: CarrierIntegralHarmonicXploreRegisterFold): CarrierIntegralHarmonicXploreRegisterFold {
  return value === 'compact' || value === 'balanced' || value === 'open' ? value : fallback;
}

function normalizeDetailMode(value: unknown, fallback: CarrierIntegralHarmonicXploreDetailMode): CarrierIntegralHarmonicXploreDetailMode {
  if (value === 'balanced' || value === 'dense') return value;
  // Legacy compatibility for 5.70 projects: old detail-mode id now resolves to neutral "dense".
  if (value === `stamp${'-'}dense`) return 'dense';
  return fallback;
}

function normalizePhase(value: unknown, fallback: CarrierIntegralHarmonicXplorePhase): CarrierIntegralHarmonicXplorePhase {
  return value === 'phaseFull' || value === 'phaseUp' || value === 'phaseDown' ? value : fallback;
}

function normalizeSeriesType(value: unknown, fallback: CarrierIntegralHarmonicXploreSeriesType): CarrierIntegralHarmonicXploreSeriesType {
  return value === 'singular' ||
    value === 'natural' ||
    value === 'octave' ||
    value === 'numOdd' ||
    value === 'numEven' ||
    value === 'numPrime' ||
    value === 'numFibo' ||
    value === 'upper' ||
    value === 'lower' ||
    value === 'under' ||
    value === 'inharmonic'
    ? value
    : fallback;
}

export function normalizeCarrierIntegralHarmonicXploreSelection(
  incoming?: Partial<CarrierIntegralHarmonicXploreSelection> | null,
  fallback?: CarrierIntegralHarmonicXploreSelection,
): CarrierIntegralHarmonicXploreSelection {
  const base = fallback ?? createDefaultCarrierIntegralHarmonicXploreSelection();
  const incomingProfile = isCarrierIntegralHarmonicXploreProfileId(incoming?.profileId) ? incoming!.profileId! : base.profileId;
  const profile = resolveCarrierIntegralHarmonicXploreProfile(incomingProfile) ?? resolveCarrierIntegralHarmonicXploreProfile(base.profileId);
  const seriesType = normalizeSeriesType(incoming?.seriesType, profile?.seriesType ?? base.seriesType);
  const phase = normalizePhase(incoming?.phase, profile?.phase ?? base.phase);
  return {
    version: 'carrier-integral-harmonic-xplore-v1',
    profileId: profile?.id ?? base.profileId,
    seriesType,
    phase,
    count: Math.max(1, Math.min(32, Math.round(Number(incoming?.count ?? base.count ?? profile?.count ?? 8)))) ,
    rolloff: clamp(Number(incoming?.rolloff ?? base.rolloff ?? 0.82), 0.35, 2.25),
    registerFold: normalizeRegisterFold(incoming?.registerFold, base.registerFold ?? 'balanced'),
    detailDensity: clamp(Number(incoming?.detailDensity ?? base.detailDensity ?? 0.62), 0.2, 1),
    detailMode: normalizeDetailMode(incoming?.detailMode, base.detailMode ?? 'balanced'),
    updatedAt: typeof incoming?.updatedAt === 'number' ? incoming.updatedAt : base.updatedAt,
    source: incoming?.source ?? base.source ?? 'default',
  };
}

export function normalizeCarrierIntegralHarmonicXplorePatch(
  current: CarrierIntegralHarmonicXploreSelection,
  patch: CarrierIntegralHarmonicXploreSelectionPatch,
): CarrierIntegralHarmonicXploreSelection {
  const profile = isCarrierIntegralHarmonicXploreProfileId(patch.profileId)
    ? resolveCarrierIntegralHarmonicXploreProfile(patch.profileId)
    : null;
  return normalizeCarrierIntegralHarmonicXploreSelection({
    ...current,
    ...patch,
    seriesType: patch.seriesType ?? profile?.seriesType ?? current.seriesType,
    phase: patch.phase ?? profile?.phase ?? current.phase,
    updatedAt: Date.now(),
    source: patch.source ?? 'user',
  }, current);
}

export function migrateLegacySynthLabPresetToHarmonicXploreSelection(
  synthLab?: Partial<CarrierIntegralSynthLabSelection> | null,
  fallback?: CarrierIntegralHarmonicXploreSelection,
): CarrierIntegralHarmonicXploreSelection {
  const profileId = synthLab?.presetId;
  if (isCarrierIntegralHarmonicXploreProfileId(profileId)) {
    const profile = resolveCarrierIntegralHarmonicXploreProfile(profileId)!;
    return normalizeCarrierIntegralHarmonicXploreSelection({
      profileId: profile.id,
      seriesType: profile.seriesType,
      phase: profile.phase,
      count: profile.count,
      source: 'legacy-migration',
    }, fallback);
  }
  return normalizeCarrierIntegralHarmonicXploreSelection(null, fallback);
}

function registerBounds(registerFold: CarrierIntegralHarmonicXploreRegisterFold): { min: number; max: number } {
  switch (registerFold) {
    case 'compact':
      return { min: 0.25, max: 6 };
    case 'open':
      return { min: 0.125, max: 16 };
    case 'balanced':
    default:
      return { min: 0.125, max: 12 };
  }
}

export function foldCarrierIntegralHarmonicXploreRatio(
  rawRatio: number,
  registerFold: CarrierIntegralHarmonicXploreRegisterFold,
): { rawRatio: number; renderRatio: number; foldOctaves: number; phaseOffset: number } {
  const { min, max } = registerBounds(registerFold);
  const phaseOffset = rawRatio < 0 ? Math.PI : 0;
  let value = Math.abs(Number.isFinite(rawRatio) && rawRatio !== 0 ? rawRatio : 1);
  let foldOctaves = 0;
  while (value > max) {
    value /= 2;
    foldOctaves += 1;
  }
  while (value < min) {
    value *= 2;
    foldOctaves -= 1;
  }
  return {
    rawRatio,
    renderRatio: value,
    foldOctaves,
    phaseOffset,
  };
}

function normalizeWaveMix(params: CarrierIntegralSynthLabParams): CarrierIntegralHarmonicXploreWaveMix {
  const total = Math.max(0.001, params.sine + params.triangle + params.sawtooth + params.square);
  return {
    sine: params.sine / total,
    triangle: params.triangle / total,
    sawtooth: params.sawtooth / total,
    square: params.square / total,
  };
}

function dominantOscillatorType(waveMix: CarrierIntegralHarmonicXploreWaveMix): OscillatorType {
  const entries: Array<[OscillatorType, number]> = [
    ['sine', waveMix.sine],
    ['triangle', waveMix.triangle],
    ['sawtooth', waveMix.sawtooth],
    ['square', waveMix.square],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? 'sine';
}

export function resolveCarrierIntegralHarmonicXploreRenderConfig(args: {
  synthLab: CarrierIntegralSynthLabSelection;
  harmonicXplore: CarrierIntegralHarmonicXploreSelection;
  carrierVoiceCount?: number;
}): CarrierIntegralHarmonicXploreRenderConfig {
  const synthParams = resolveCarrierIntegralSynthLabParams(args.synthLab);
  const hx = normalizeCarrierIntegralHarmonicXploreSelection(args.harmonicXplore);
  const rawSeries = buildCarrierIntegralHarmonicXploreSeries(hx.count, hx.seriesType, hx.phase);
  const detailDensity = clamp(hx.detailMode === 'dense' ? Math.max(hx.detailDensity, 0.86) : hx.detailDensity, 0.2, 1);
  const waveMix = normalizeWaveMix(synthParams);
  const dominantType = dominantOscillatorType(waveMix);
  const folded = rawSeries.map((ratio) => foldCarrierIntegralHarmonicXploreRatio(ratio, hx.registerFold));
  const safeRolloff = clamp(hx.rolloff, 0.35, 2.25);
  const rawWeights = folded.map((fold, index) => {
    const indexDecay = 1 / Math.pow(index + 1, safeRolloff);
    const subLift = fold.renderRatio < 1 ? 1.18 : 1;
    const highDamp = fold.renderRatio > 10 ? 0.88 : 1;
    return indexDecay * subLift * highDamp;
  });
  const weightSum = Math.max(0.001, rawWeights.reduce((sum, value) => sum + value, 0));
  const bodyGain = synthParams.outputGain * (0.78 + synthParams.overtone * 0.18) * (1 + synthParams.drive * 0.2);
  const partials = folded.map((fold, index): CarrierIntegralHarmonicXplorePartial => ({
    index,
    rawRatio: carrierIntegralRound3(fold.rawRatio),
    renderRatio: carrierIntegralRound3(fold.renderRatio),
    foldOctaves: fold.foldOctaves,
    gain: clamp((rawWeights[index]! / weightSum) * bodyGain, 0.002, 0.36),
    phaseOffset: fold.phaseOffset,
    detune: clamp((hx.phase === 'phaseDown' ? -1 : 1) * synthParams.detuneCents * (index / Math.max(1, folded.length - 1)) * 0.62, -120, 120),
    waveMix,
    dominantType,
  }));
  const hashPayload = {
    version: 'carrier-integral-harmonic-xplore-render-config-v1',
    timbrePresetId: args.synthLab.presetId,
    params: synthParams,
    harmonicXplore: hx,
    partials: partials.map((partial) => ({
      rawRatio: partial.rawRatio,
      renderRatio: partial.renderRatio,
      gain: carrierIntegralRound3(partial.gain),
      detune: carrierIntegralRound3(partial.detune),
      waveMix: partial.waveMix,
      dominantType: partial.dominantType,
    })),
  };
  return {
    version: 'carrier-integral-harmonic-xplore-render-config-v1',
    configHash: carrierIntegralHash31(stableCarrierIntegralJson(hashPayload)),
    timbrePresetId: args.synthLab.presetId,
    harmonicProfileId: hx.profileId,
    seriesType: hx.seriesType,
    phase: hx.phase,
    count: hx.count,
    rolloff: hx.rolloff,
    registerFold: hx.registerFold,
    detailDensity,
    detailMode: hx.detailMode,
    rawSeries: rawSeries.map((ratio) => carrierIntegralRound3(ratio)),
    renderSeries: partials.map((partial) => partial.renderRatio),
    partials,
    estimatedVoiceCost: Math.max(1, Math.round((args.carrierVoiceCount ?? 6) * partials.length)),
  };
}

const HARMONIC_XPLORE_WAVE_COMPONENTS: Array<[OscillatorType, keyof CarrierIntegralHarmonicXploreWaveMix, number, number]> = [
  ['sine', 'sine', 1.0, 0],
  ['triangle', 'triangle', 0.96, -1.5],
  ['sawtooth', 'sawtooth', 0.82, 2.0],
  ['square', 'square', 0.78, -2.25],
];

export function harmonicXplorePartialToOscillators(
  partial: CarrierIntegralHarmonicXplorePartial,
): CarrierIntegralHarmonicXploreWaveOscillator[] {
  const components = HARMONIC_XPLORE_WAVE_COMPONENTS
    .map(([type, key, spectralGain, detuneOffset]) => {
      const amount = clamp(partial.waveMix[key], 0, 1);
      return {
        type,
        amount,
        oscillator: {
          type,
          gain: partial.gain * amount * spectralGain,
          freqMul: partial.renderRatio,
          detune: partial.detune + detuneOffset * amount,
        } satisfies CarrierIntegralHarmonicXploreWaveOscillator,
      };
    })
    .filter((component) => component.amount > 0.0001 && component.oscillator.gain > 0.0008);

  if (components.length === 0) {
    return [{
      type: partial.dominantType,
      gain: partial.gain,
      freqMul: partial.renderRatio,
      detune: partial.detune,
    }];
  }

  const gainSum = Math.max(0.001, components.reduce((sum, component) => sum + component.oscillator.gain, 0));
  return components.map((component) => ({
    ...component.oscillator,
    gain: component.oscillator.gain * (partial.gain / gainSum),
  }));
}

export function harmonicXplorePartialsToOscillators(
  partials: CarrierIntegralHarmonicXplorePartial[],
  maxOscillators = 32,
): CarrierIntegralHarmonicXploreWaveOscillator[] {
  const budget = Math.max(1, Math.min(32, Math.round(maxOscillators)));
  const perPartial = partials.map((partial) =>
    harmonicXplorePartialToOscillators(partial)
      .sort((a, b) => clamp(b.gain, 0, 1) - clamp(a.gain, 0, 1)),
  );
  const bank: CarrierIntegralHarmonicXploreWaveOscillator[] = [];

  // First pass: keep the harmonic/ratio series intact by assigning each partial its
  // strongest waveform component before spending budget on secondary colors.
  for (const components of perPartial) {
    const primary = components[0];
    if (!primary) continue;
    bank.push(primary);
    if (bank.length >= budget) return bank;
  }

  // Later passes: add the remaining percentages round-robin so no single early
  // partial monopolizes the oscillator budget merely because the user mixed four
  // waveforms.
  for (let layer = 1; bank.length < budget; layer += 1) {
    let added = false;
    for (const components of perPartial) {
      const component = components[layer];
      if (!component) continue;
      bank.push(component);
      added = true;
      if (bank.length >= budget) return bank;
    }
    if (!added) break;
  }

  return bank;
}

export function harmonicXplorePartialToOscillator(
  partial: CarrierIntegralHarmonicXplorePartial,
): CarrierIntegralHarmonicXploreWaveOscillator {
  // Legacy helper: keep the old dominant-wave contract available for callers that need
  // exactly one oscillator, but HarmonicXplore Direct now uses the honest mix helper.
  return {
    type: partial.dominantType,
    gain: partial.gain,
    freqMul: partial.renderRatio,
    detune: partial.detune,
  };
}

export function describeCarrierIntegralHarmonicXploreSelection(selection: CarrierIntegralHarmonicXploreSelection): string {
  const hx = normalizeCarrierIntegralHarmonicXploreSelection(selection);
  const profile = resolveCarrierIntegralHarmonicXploreProfile(hx.profileId);
  const detailLabel = hx.detailMode === 'dense' ? 'dicht' : `Details ${carrierIntegralRound3(hx.detailDensity)}`;
  return `${profile?.label ?? hx.seriesType} · ${hx.count} Harmonics · ${hx.registerFold} · ${detailLabel} · Roll-off ${carrierIntegralRound3(hx.rolloff)}`;
}

export function createFallbackHarmonicXploreSelectionFromTimbrePreset(presetId: string | null | undefined): CarrierIntegralHarmonicXploreSelection {
  const fallback = createDefaultCarrierIntegralHarmonicXploreSelection();
  if (!isCarrierIntegralHarmonicXploreProfileId(presetId)) return fallback;
  return migrateLegacySynthLabPresetToHarmonicXploreSelection({
    version: 'carrier-integral-synth-lab-v1',
    presetId,
    paramsPatch: DEFAULT_CARRIER_INTEGRAL_SYNTH_LAB_PARAMS,
    updatedAt: null,
    source: 'project',
  });
}
