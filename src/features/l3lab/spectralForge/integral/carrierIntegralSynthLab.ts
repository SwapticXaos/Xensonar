import { carrierIntegralHash31, carrierIntegralRound3 } from './carrierIntegralStableIdentity';
import type { RootFollowCarrierTimbreSnapshot } from '../../../xensonar/rootFollow/rootFollowTypes';

export type CarrierIntegralSynthLabParams = {
  sine: number;
  triangle: number;
  sawtooth: number;
  square: number;
  sub: number;
  overtone: number;
  detuneCents: number;
  harmonicSpread: number;
  filterFrequency: number;
  filterQ: number;
  attackScale: number;
  releaseScale: number;
  transientGain: number;
  panSpread: number;
  drive: number;
  outputGain: number;
};

export type CarrierIntegralSynthLabSelection = {
  version: 'carrier-integral-synth-lab-v1';
  presetId: string;
  paramsPatch: Partial<CarrierIntegralSynthLabParams>;
  updatedAt: number | null;
  source: 'default' | 'user' | 'project' | 'timbre-extract';
};

export type CarrierIntegralSynthLabPreset = {
  id: string;
  label: string;
  params: CarrierIntegralSynthLabParams;
  summary: string;
};

export const DEFAULT_CARRIER_INTEGRAL_SYNTH_LAB_PARAMS: CarrierIntegralSynthLabParams = {
  sine: 0.48,
  triangle: 0.34,
  sawtooth: 0.14,
  square: 0.04,
  sub: 0.12,
  overtone: 0.16,
  detuneCents: 5,
  harmonicSpread: 0.18,
  filterFrequency: 1650,
  filterQ: 0.9,
  attackScale: 0.08,
  releaseScale: 0.42,
  transientGain: 0.1,
  panSpread: 0.14,
  drive: 0.18,
  outputGain: 0.82,
};

export const CARRIER_INTEGRAL_SYNTH_LAB_PRESETS: CarrierIntegralSynthLabPreset[] = [
  {
    id: 'neutral-body',
    label: 'Grundkörper',
    params: DEFAULT_CARRIER_INTEGRAL_SYNTH_LAB_PARAMS,
    summary: 'Ausgewogene Grundfarbe ohne starkes Register- oder Filter-Vorurteil.',
  },
  {
    id: 'saw-square-body',
    label: 'Säge/Rechteck',
    params: {
      sine: 0.22,
      triangle: 0.16,
      sawtooth: 0.46,
      square: 0.28,
      sub: 0.22,
      overtone: 0.26,
      detuneCents: 9,
      harmonicSpread: 0.34,
      filterFrequency: 1150,
      filterQ: 2.2,
      attackScale: 0.025,
      releaseScale: 0.24,
      transientGain: 0.2,
      panSpread: 0.08,
      drive: 0.48,
      outputGain: 0.74,
    },
    summary: 'Kantiger Säge-/Rechteck-Körper für direkte Carrier-Konturen; kein Pure-Dieter-Darkpsy-Modus.',
  },
  {
    id: 'glass-air',
    label: 'Glas/Luft',
    params: {
      sine: 0.62,
      triangle: 0.42,
      sawtooth: 0.03,
      square: 0.0,
      sub: 0.02,
      overtone: 0.3,
      detuneCents: 7,
      harmonicSpread: 0.26,
      filterFrequency: 3100,
      filterQ: 0.65,
      attackScale: 0.11,
      releaseScale: 0.58,
      transientGain: 0.05,
      panSpread: 0.24,
      drive: 0.05,
      outputGain: 0.78,
    },
    summary: 'Helleres, gläsernes Timbre für Fenster- und Intervallkörper.',
  },
  {
    id: 'soft-sub-body',
    label: 'Subkörper',
    params: {
      sine: 0.72,
      triangle: 0.24,
      sawtooth: 0.04,
      square: 0,
      sub: 0.34,
      overtone: 0.08,
      detuneCents: 2,
      harmonicSpread: 0.08,
      filterFrequency: 820,
      filterQ: 0.75,
      attackScale: 0.16,
      releaseScale: 0.72,
      transientGain: 0.04,
      panSpread: 0.08,
      drive: 0.12,
      outputGain: 0.86,
    },
    summary: 'Ruhiger, tiefer synthetischer Körper für längere Carrier- und Untertonfelder.',
  },
];

const PRESET_BY_ID = new Map(CARRIER_INTEGRAL_SYNTH_LAB_PRESETS.map((preset) => [preset.id, preset] as const));

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function stableSynthParamsHash(params: CarrierIntegralSynthLabParams): string {
  const normalized = [
    params.sine,
    params.triangle,
    params.sawtooth,
    params.square,
    params.sub,
    params.overtone,
    params.detuneCents,
    params.harmonicSpread,
    params.filterFrequency,
    params.filterQ,
    params.attackScale,
    params.releaseScale,
    params.transientGain,
    params.panSpread,
    params.drive,
    params.outputGain,
  ].map((value) => carrierIntegralRound3(value)).join('|');
  return carrierIntegralHash31(normalized);
}

export function clampCarrierIntegralSynthLabParams(params: Partial<CarrierIntegralSynthLabParams> | null | undefined): CarrierIntegralSynthLabParams {
  const base = { ...DEFAULT_CARRIER_INTEGRAL_SYNTH_LAB_PARAMS, ...(params ?? {}) };
  return {
    sine: clamp(base.sine, 0, 1),
    triangle: clamp(base.triangle, 0, 1),
    sawtooth: clamp(base.sawtooth, 0, 1),
    square: clamp(base.square, 0, 1),
    sub: clamp(base.sub, 0, 1),
    overtone: clamp(base.overtone, 0, 1),
    detuneCents: clamp(base.detuneCents, -48, 48),
    harmonicSpread: clamp(base.harmonicSpread, 0, 1),
    filterFrequency: clamp(base.filterFrequency, 160, 7200),
    filterQ: clamp(base.filterQ, 0.1, 8),
    attackScale: clamp(base.attackScale, 0.005, 0.6),
    releaseScale: clamp(base.releaseScale, 0.04, 1.4),
    transientGain: clamp(base.transientGain, 0, 0.45),
    panSpread: clamp(base.panSpread, 0, 0.65),
    drive: clamp(base.drive, 0, 1),
    outputGain: clamp(base.outputGain, 0.18, 1),
  };
}

export function createDefaultCarrierIntegralSynthLabSelection(): CarrierIntegralSynthLabSelection {
  return {
    version: 'carrier-integral-synth-lab-v1',
    presetId: 'neutral-body',
    paramsPatch: {},
    updatedAt: null,
    source: 'default',
  };
}

export function normalizeCarrierIntegralSynthLabSelection(
  incoming?: Partial<CarrierIntegralSynthLabSelection> | null,
  fallback?: CarrierIntegralSynthLabSelection,
): CarrierIntegralSynthLabSelection {
  const base = fallback ?? createDefaultCarrierIntegralSynthLabSelection();
  const presetId = typeof incoming?.presetId === 'string' && PRESET_BY_ID.has(incoming.presetId) ? incoming.presetId : base.presetId;
  return {
    version: 'carrier-integral-synth-lab-v1',
    presetId,
    paramsPatch: { ...(incoming?.paramsPatch ?? base.paramsPatch ?? {}) },
    updatedAt: typeof incoming?.updatedAt === 'number' ? incoming.updatedAt : base.updatedAt,
    source: incoming?.source ?? base.source,
  };
}

export function resolveCarrierIntegralSynthLabParams(selection: CarrierIntegralSynthLabSelection): CarrierIntegralSynthLabParams {
  const preset = PRESET_BY_ID.get(selection.presetId) ?? CARRIER_INTEGRAL_SYNTH_LAB_PRESETS[0]!;
  return clampCarrierIntegralSynthLabParams({ ...preset.params, ...selection.paramsPatch });
}

export function buildCarrierIntegralTimbreSnapshot(
  selection: CarrierIntegralSynthLabSelection,
): RootFollowCarrierTimbreSnapshot {
  const params = resolveCarrierIntegralSynthLabParams(selection);
  const totalMain = Math.max(0.001, params.sine + params.triangle + params.sawtooth + params.square);
  const driveGain = 1 + params.drive * 0.42;
  const osc = [
    { type: 'sine' as const, gain: params.sine / totalMain * 0.34 * params.outputGain * driveGain, freqMul: 1, detune: 0 },
    { type: 'triangle' as const, gain: params.triangle / totalMain * 0.3 * params.outputGain * driveGain, freqMul: 1, detune: -params.detuneCents * 0.22 },
    { type: 'sawtooth' as const, gain: params.sawtooth / totalMain * 0.28 * params.outputGain * driveGain, freqMul: 1, detune: params.detuneCents },
    { type: 'square' as const, gain: params.square / totalMain * 0.24 * params.outputGain * driveGain, freqMul: 1, detune: -params.detuneCents },
    { type: 'sine' as const, gain: params.sub * 0.18 * params.outputGain, freqMul: 0.5, detune: 0 },
    { type: 'sine' as const, gain: params.overtone * 0.16 * params.outputGain, freqMul: 2 + params.harmonicSpread * 1.5, detune: params.detuneCents * 0.5 },
  ].filter((entry) => entry.gain > 0.003).slice(0, 6);
  return {
    schemaVersion: 'carrier-integral-timbre-v1',
    presetId: selection.presetId,
    paramsHash: stableSynthParamsHash(params),
    oscillators: osc,
    filterType: params.filterFrequency < 950 ? 'lowpass' : params.filterFrequency > 2400 ? 'highpass' : 'bandpass',
    filterFrequency: params.filterFrequency,
    filterQ: params.filterQ,
    attackScale: params.attackScale,
    releaseScale: params.releaseScale,
    transientGain: params.transientGain,
    panSpread: params.panSpread,
    drive: params.drive,
    outputGain: params.outputGain,
  };
}


export function buildCarrierIntegralSynthLabPatchFromDonorSummary(summary: {
  meanOrderedness?: number | null;
  meanResidualStrength?: number | null;
  meanNoiseColorCentroid?: number | null;
  meanTransientStrength?: number | null;
  meanResonanceStrength?: number | null;
  meanResonanceSharpness?: number | null;
  meanPitchLeakRisk?: number | null;
  meanProsodicTrace?: number | null;
}): Partial<CarrierIntegralSynthLabParams> {
  const ordered = clamp(Number(summary.meanOrderedness ?? 0), 0, 1);
  const residual = clamp(Number(summary.meanResidualStrength ?? 0), 0, 1);
  const noiseColor = clamp(Number(summary.meanNoiseColorCentroid ?? 0), 0, 1);
  const transient = clamp(Number(summary.meanTransientStrength ?? 0), 0, 1);
  const resonance = clamp(Number(summary.meanResonanceStrength ?? 0), 0, 1);
  const sharpness = clamp(Number(summary.meanResonanceSharpness ?? 0), 0, 1);
  const pitchLeak = clamp(Number(summary.meanPitchLeakRisk ?? 0), 0, 1);
  const prosody = clamp(Number(summary.meanProsodicTrace ?? 0), 0, 1);
  return clampCarrierIntegralSynthLabParams({
    sine: 0.34 + ordered * 0.34 + resonance * 0.12 - residual * 0.16,
    triangle: 0.24 + resonance * 0.22 + ordered * 0.1,
    sawtooth: 0.08 + residual * 0.34 + noiseColor * 0.18,
    square: 0.03 + transient * 0.22 + residual * 0.12,
    sub: 0.08 + (1 - noiseColor) * 0.16,
    overtone: 0.08 + resonance * 0.22 + sharpness * 0.16,
    detuneCents: (sharpness * 18) - (pitchLeak * 12),
    harmonicSpread: 0.12 + residual * 0.38 + resonance * 0.18,
    filterFrequency: 640 + noiseColor * 4300 + ordered * 900,
    filterQ: 0.55 + sharpness * 4.2 + resonance * 0.8,
    attackScale: 0.018 + (1 - transient) * 0.11 + prosody * 0.05,
    releaseScale: 0.18 + ordered * 0.38 + resonance * 0.26 + prosody * 0.16,
    transientGain: 0.04 + transient * 0.28,
    panSpread: 0.08 + residual * 0.22 + prosody * 0.16,
    drive: 0.08 + residual * 0.32 + transient * 0.18,
    outputGain: 0.72 - pitchLeak * 0.14 + ordered * 0.08,
  });
}

export function isCarrierIntegralSynthLabParamExtreme(key: keyof CarrierIntegralSynthLabParams, value: number): boolean {
  switch (key) {
    case 'sine':
    case 'triangle':
    case 'sawtooth':
    case 'square':
    case 'sub':
    case 'overtone':
      return false;
    case 'detuneCents': return Math.abs(value) >= 30;
    case 'harmonicSpread': return value >= 0.9;
    case 'filterFrequency': return value <= 220 || value >= 6800;
    case 'filterQ': return value >= 5.8;
    case 'attackScale': return value <= 0.01 || value >= 0.52;
    case 'releaseScale': return value >= 1.24;
    case 'transientGain': return value >= 0.38;
    case 'panSpread': return value >= 0.58;
    case 'drive': return value >= 0.86;
    case 'outputGain': return value >= 0.98;
  }
}
