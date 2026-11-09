import type { SpectralData } from '../audio/SpectralData';
import type { CarrierIntegralSynthLabSelection } from './carrierIntegralSynthLab';
import { buildCarrierIntegralTimbreSnapshot, normalizeCarrierIntegralSynthLabSelection } from './carrierIntegralSynthLab';
import {
  createDefaultCarrierIntegralHarmonicXploreSelection,
  harmonicXplorePartialsToOscillators,
  normalizeCarrierIntegralHarmonicXploreSelection,
  resolveCarrierIntegralHarmonicXploreRenderConfig,
  type CarrierIntegralHarmonicXploreSelection,
  type CarrierIntegralHarmonicXploreRenderConfig,
} from './carrierIntegralHarmonicXploreRenderConfig';
import {
  buildCarrierIntegralHarmonicXploreOscillatorBank,
  resolveCarrierIntegralHarmonicXploreProfile,
  type CarrierIntegralHarmonicXploreProfile,
  type CarrierIntegralHarmonicXploreTimbreFlavor,
} from './carrierIntegralHarmonicXploreLens';
import { carrierIntegralHash31, carrierIntegralRound3 } from './carrierIntegralStableIdentity';
import type { RootFollowCarrierTimbreSnapshot } from '../../../xensonar/rootFollow/rootFollowTypes';
import { carrierIntegralDisplayLogHzFromY } from './carrierIntegralPitchAxisContract';

export const CARRIER_INTEGRAL_HARMONIC_XPLORE_DIRECT_ENGINE_VERSION =
  'harmonic-xplore-direct-carrier-engine-3.2.91.7.6.1-klangfarben-erweiterung';

export const HARMONIC_XPLORE_DIRECT_MACHINE_ID = 'harmonic-xplore-direct-carrier' as const;
export const HARMONIC_XPLORE_DIRECT_DEFAULT_PRESET_ID = 'harmonic-xplore-prime-spine';

export type CarrierIntegralHarmonicXploreDirectRenderSummary = {
  version: typeof CARRIER_INTEGRAL_HARMONIC_XPLORE_DIRECT_ENGINE_VERSION;
  rendererKind: 'harmonic-xplore-direct-ratio-carrier-buffer';
  presetId: string;
  carrierReading: string;
  oscillatorCount: number;
  series: number[];
  durationSec: number;
  sampleRate: number;
  carrierGestalt: CarrierIntegralHarmonicXploreDirectGestaltSummary;
  vectorMomentum: {
    enabled: true;
    maxVoices: number;
    maxPeaks: number;
    detailDensity: number;
    detailMode: 'balanced' | 'dense';
    peakThreshold: number;
    noiseDustSuppressed: true;
    matchingSpace: 'log-frequency-prediction';
  };
  antiWhoopContract: {
    rootMotionIsNotAttackGlide: true;
    noPerNoteInitialPitchSwoop: true;
    directRatioBodyMayOverformLegacySynth: true;
    continuousCentroidGlideEnabled: true;
    entropyDrivenDetuneAndWidth: true;
    controlRateDecoupledFromAudioRate: true;
    noiseDustSuppressedForPureCarrier: true;
    vectorMomentumPolyphony: true;
    lineProvenanceContinuity: true;
    fretlessMicrotonalScaling: true;
    grainChannelModulatesVoiceSlewAndDetune: true;
    wideIntervalVoiceSeeding: true;
    spectralEdgePeaksIncluded: true;
    registerBandVoiceAnchors: true;
    orphanRegisterVoiceActivation: true;
  };
  directEngineKey: string;
};

export type CarrierIntegralHarmonicXploreDirectGestaltSummary = {
  gestaltKey: string;
  hasSpectralData: boolean;
  energyMean: number;
  centroidMean: number;
  entropyMean: number;
  activeColumnRatio: number;
  peakMotionMean: number;
  columnSampleCount: number;
  /** Amplitude-weighted mean of the grain channel across all active cells.
   *  0 = short/noisy/percussive; 1 = long/tonal/legato. */
  grainMean: number;
  /** Approximate vertical/log-frequency span of active material in octaves. */
  paintedRegisterSpanOctaves: number;
};

export type CarrierIntegralHarmonicXploreDirectBuffer = {
  buffer: AudioBuffer;
  summary: CarrierIntegralHarmonicXploreDirectRenderSummary;
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return value < min ? min : value > max ? max : value;
}

function smoothstep(x: number): number {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

function slewCoef(timeConstantMs: number, sampleRate: number): number {
  if (timeConstantMs <= 0) return 1.0;
  return 1.0 - Math.exp(-1.0 / (sampleRate * (timeConstantMs / 1000.0)));
}

function waveformSample(type: OscillatorType, phase: number): number {
  const normalized = ((phase / (Math.PI * 2)) % 1 + 1) % 1;
  switch (type) {
    case 'square': return normalized < 0.5 ? 1 : -1;
    case 'sawtooth': return 2 * normalized - 1;
    case 'triangle': return 1 - 4 * Math.abs(normalized - 0.5);
    case 'sine':
    default: return Math.sin(phase);
  }
}


function seededSignedUnit(seed: string, a: number, b: number = 0): number {
  let hash = 2166136261;
  const key = `${seed}|${a}|${b}`;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return (hash / 0xffffffff) * 2 - 1;
}

function formantEnergy(hz: number): number {
  const centers = [500, 1500, 2500];
  let best = 0;
  for (const center of centers) {
    const octDistance = Math.log2(clamp(hz, 20, 20000) / center);
    const band = Math.exp(-(octDistance * octDistance) / (2 * 0.18 * 0.18));
    best = Math.max(best, band);
  }
  return best;
}

function applyHarmonicXploreFlavorTilt(args: {
  hz: number;
  baseTilt: number;
  flavor: CarrierIntegralHarmonicXploreTimbreFlavor;
  formantFocus: number;
  partialIndex: number;
  partialCount: number;
}): number {
  const focus = clamp(args.formantFocus, 0, 1);
  if (focus <= 0 && args.flavor !== 'resonator' && args.flavor !== 'metallic') {
    return args.baseTilt;
  }

  const formant = formantEnergy(args.hz);
  if (args.flavor === 'resonator' || args.flavor === 'formant') {
    const floor = 0.58;
    return args.baseTilt * (1 - focus + focus * (floor + (1 - floor) * formant));
  }

  if (args.flavor === 'metallic') {
    const indexRatio = args.partialIndex / Math.max(1, args.partialCount - 1);
    const metallicLift = 0.82 + 0.28 * Math.sin(indexRatio * Math.PI * 5);
    return args.baseTilt * clamp(metallicLift, 0.62, 1.16);
  }

  // warm: strong low-pass rolloff — high partials attenuated, fundamental full
  if (args.flavor === 'warm') {
    const indexRatio = args.partialIndex / Math.max(1, args.partialCount - 1);
    const warmRolloff = Math.pow(1 - indexRatio * 0.88, 2.1);
    return args.baseTilt * clamp(0.18 + warmRolloff * 0.82, 0.08, 1.0);
  }

  // bell: steep exponential decay per partial — sounds like a struck resonator
  if (args.flavor === 'bell') {
    const indexRatio = args.partialIndex / Math.max(1, args.partialCount - 1);
    // Primary bell lobe + weak overtone shimmer at ~35% of partials
    const bellBody = Math.exp(-indexRatio * 3.2);
    const shimmer = 0.12 * Math.exp(-Math.pow(indexRatio - 0.34, 2) * 28);
    return args.baseTilt * clamp(bellBody + shimmer, 0.05, 1.1);
  }

  // bright: lift mid/high partials, slight dip at fundamental for edge/buzz
  if (args.flavor === 'bright') {
    const indexRatio = args.partialIndex / Math.max(1, args.partialCount - 1);
    const brightLift = 0.42 + 1.0 * Math.pow(indexRatio, 0.55);
    return args.baseTilt * clamp(brightLift, 0.38, 1.38);
  }

  // chorus: gentle mid-boost, keeps fundamental audible with slight shimmer
  if (args.flavor === 'chorus') {
    const indexRatio = args.partialIndex / Math.max(1, args.partialCount - 1);
    const chorusShape = 0.72 + 0.42 * Math.sin(indexRatio * Math.PI);
    return args.baseTilt * clamp(chorusShape, 0.58, 1.14);
  }

  return args.baseTilt;
}

function createWritableBuffer(sampleCount: number, sampleRate: number, channels: number = 2): AudioBuffer {
  const length = Math.max(1, Math.round(sampleCount));
  const rate = Math.max(8000, Math.round(sampleRate || 44100));
  const AudioCtor = (globalThis as any).OfflineAudioContext || (globalThis as any).webkitOfflineAudioContext;
  if (AudioCtor) return new AudioCtor(channels, length, rate).createBuffer(channels, length, rate);
  const CtxCtor = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
  return new CtxCtor({ sampleRate: rate }).createBuffer(channels, length, rate);
}

function summarizeCarrierGestalt(spectralData: SpectralData | null | undefined): CarrierIntegralHarmonicXploreDirectGestaltSummary {
  const hasSpectralData = Boolean(spectralData && spectralData.width > 0 && spectralData.height > 0);
  if (!hasSpectralData) {
    const gestaltKey = carrierIntegralHash31('harmonic-xplore-direct/no-spectral-gestalt');
    return {
      gestaltKey,
      hasSpectralData: false,
      energyMean: 0.5,
      centroidMean: 0.5,
      entropyMean: 0,
      activeColumnRatio: 0,
      peakMotionMean: 0.5,
      grainMean: 0.5,
      paintedRegisterSpanOctaves: 0,
      columnSampleCount: 0,
    };
  }

  const width = spectralData!.width;
  const height = spectralData!.height;
  const stepX = Math.max(1, Math.floor(width / 32));
  let energySum = 0;
  let centroidSum = 0;
  let entropySum = 0;
  let peakSum = 0;
  let activeColumns = 0;
  let columnCount = 0;
  let grainWeightedSum = 0;
  let grainWeightTotal = 0;
  let minActiveY = Number.POSITIVE_INFINITY;
  let maxActiveY = Number.NEGATIVE_INFINITY;

  for (let x = 0; x < width; x += stepX) {
    let frameEnergy = 0;
    let weightedY = 0;
    let weightedY2 = 0;
    let peakVal = 0;
    let peakY = height / 2;

    for (let y = 0; y < height; y += 1) {
      const val = clamp(spectralData!.get(x, y), 0, 1);
      if (val <= 0.01) continue;
      minActiveY = Math.min(minActiveY, y);
      maxActiveY = Math.max(maxActiveY, y);
      const yPos = height - 1 - y;
      frameEnergy += val;
      weightedY += val * yPos;
      weightedY2 += val * yPos * yPos;
      if (val > peakVal) {
        peakVal = val;
        peakY = yPos;
      }
      // Amplitude-weighted grain accumulation across all active cells.
      grainWeightedSum += clamp(spectralData!.getGrain(x, y), 0, 1) * val;
      grainWeightTotal += val;
    }

    if (frameEnergy > 0.01) {
      activeColumns += 1;
      const centroid = weightedY / frameEnergy;
      const variance = Math.max(0, (weightedY2 / frameEnergy) - centroid * centroid);
      energySum += Math.min(1, frameEnergy / (height * 0.1));
      centroidSum += centroid / Math.max(1, height - 1);
      entropySum += clamp(Math.sqrt(variance) / (height * 0.1), 0, 1);
      peakSum += peakY / Math.max(1, height - 1);
    }
    columnCount += 1;
  }

  const divisor = Math.max(1, activeColumns);
  const energyMean = carrierIntegralRound3(clamp(energySum / divisor, 0, 1));
  const centroidMean = carrierIntegralRound3(clamp(centroidSum / divisor, 0, 1));
  const entropyMean = carrierIntegralRound3(clamp(entropySum / divisor, 0, 1));
  const peakMotionMean = carrierIntegralRound3(clamp(peakSum / divisor, 0, 1));
  const activeColumnRatio = carrierIntegralRound3(clamp(activeColumns / Math.max(1, columnCount), 0, 1));
  const grainMean = carrierIntegralRound3(
    grainWeightTotal > 1e-6 ? clamp(grainWeightedSum / grainWeightTotal, 0, 1) : 0.5,
  );
  const paintedRegisterSpanOctaves = carrierIntegralRound3(
    Number.isFinite(minActiveY) && Number.isFinite(maxActiveY)
      ? Math.abs(peakToRelativeLogHz(minActiveY, height, 128) - peakToRelativeLogHz(maxActiveY, height, 128))
      : 0,
  );
  const gestaltKey = carrierIntegralHash31([
    'harmonic-xplore-direct/vector-momentum-carrier-gestalt',
    String(width),
    String(height),
    String(columnCount),
    String(activeColumns),
    energyMean,
    centroidMean,
    entropyMean,
    peakMotionMean,
    activeColumnRatio,
    grainMean,
    paintedRegisterSpanOctaves,
    'grain-v1',
    'wide-interval-v1',
    'register-band-anchors-v1',
  ].join('|'));

  return {
    gestaltKey,
    hasSpectralData: true,
    energyMean,
    centroidMean,
    entropyMean,
    activeColumnRatio,
    peakMotionMean,
    grainMean,
    paintedRegisterSpanOctaves,
    columnSampleCount: columnCount,
  };
}

function normalizeDirectSynthLabSelection(selection: CarrierIntegralSynthLabSelection): CarrierIntegralSynthLabSelection {
  return normalizeCarrierIntegralSynthLabSelection(selection);
}

export function resolveCarrierIntegralHarmonicXploreDirectSynthLab(selection: CarrierIntegralSynthLabSelection): CarrierIntegralSynthLabSelection {
  return normalizeDirectSynthLabSelection(selection);
}

export function buildCarrierIntegralHarmonicXploreDirectTimbreSnapshot(
  selection: CarrierIntegralSynthLabSelection,
  harmonicXplore?: CarrierIntegralHarmonicXploreSelection | null,
): RootFollowCarrierTimbreSnapshot {
  const directSelection = normalizeDirectSynthLabSelection(selection);
  const hxSelection = normalizeCarrierIntegralHarmonicXploreSelection(harmonicXplore ?? createDefaultCarrierIntegralHarmonicXploreSelection());
  const timbre = buildCarrierIntegralTimbreSnapshot(directSelection);
  const config = resolveCarrierIntegralHarmonicXploreRenderConfig({
    synthLab: directSelection,
    harmonicXplore: hxSelection,
  });
  return {
    ...timbre,
    presetId: directSelection.presetId,
    paramsHash: carrierIntegralHash31([
      CARRIER_INTEGRAL_HARMONIC_XPLORE_DIRECT_ENGINE_VERSION,
      directSelection.presetId,
      config.configHash,
      'timbre-ratio-truth-split',
      'wave-mix-truth-v1',
    ].join('|')),
    oscillators: harmonicXplorePartialsToOscillators(config.partials, 32),
  };
}

function peakToRelativeLogHz(y: number, specHeight: number, anchorRootHz: number): number {
  // Shared pitch-axis contract: HarmonicXplorE/SpektralSynthese may still
  // derive ratio/partial color from their profiles, but the primary painted
  // ridge frequency is the same visible Hz axis as the SpectralForge HUD.
  void anchorRootHz;
  return carrierIntegralDisplayLogHzFromY(y, specHeight);
}

function fallbackRender(args: {
  oscillators: ReturnType<typeof buildCarrierIntegralHarmonicXploreOscillatorBank>;
  series: number[];
  timbre: RootFollowCarrierTimbreSnapshot;
  sampleCount: number;
  sampleRate: number;
  anchorRootHz: number;
  globalGain: number;
  releaseStart: number;
  outL: Float32Array;
  outR: Float32Array;
}): void {
  const oscillators = args.oscillators ?? args.timbre.oscillators;
  const phases = new Float64Array(oscillators.length);
  const panSpread = clamp(args.timbre.panSpread, 0, 1);
  const twoPi = Math.PI * 2;
  for (let i = 0; i < args.sampleCount; i += 1) {
    const ratio = i / Math.max(1, args.sampleCount - 1);
    const attack = smoothstep(Math.min(1, ratio / Math.max(0.005, args.timbre.attackScale * 0.1)));
    const release = ratio < args.releaseStart ? 1 : 1 - smoothstep((ratio - args.releaseStart) / Math.max(0.001, 1 - args.releaseStart));
    const env = args.globalGain * attack * release * 0.64;
    let sampleL = 0;
    let sampleR = 0;
    for (let o = 0; o < oscillators.length; o += 1) {
      const osc = oscillators[o]!;
      const ratioMul = clamp(Math.abs(osc.freqMul || args.series[o % Math.max(1, args.series.length)] || 1), 0.0625, 16);
      const cents = clamp(osc.detune ?? 0, -90, 90);
      const hz = clamp(args.anchorRootHz * ratioMul * Math.pow(2, cents / 1200), 10, args.sampleRate * 0.42);
      phases[o] += (twoPi * hz) / args.sampleRate;
      if (phases[o]! > twoPi) phases[o] -= twoPi * Math.floor(phases[o]! / twoPi);
      const panPos = (o % 2 === 0 ? -1 : 1) * panSpread * (o / Math.max(1, oscillators.length - 1));
      const panAngle = (panPos + 1) * 0.25 * Math.PI;
      const wave = waveformSample(osc.type, phases[o]!) * clamp(osc.gain, 0, 1);
      sampleL += wave * Math.cos(panAngle);
      sampleR += wave * Math.sin(panAngle);
    }
    const driveMod = 1.02 + args.timbre.drive * 1.25;
    args.outL[i] = Math.tanh(Math.tanh(sampleL * driveMod) * env);
    args.outR[i] = Math.tanh(Math.tanh(sampleR * driveMod) * env);
  }
}

export async function renderCarrierIntegralHarmonicXploreDirectPreviewBuffer(args: {
  spectralData?: SpectralData | null;
  synthLab: CarrierIntegralSynthLabSelection;
  harmonicXplore?: CarrierIntegralHarmonicXploreSelection | null;
  /** Optional descriptor-derived profile. Existing callers omit this. */
  derivedProfile?: CarrierIntegralHarmonicXploreProfile;
  durationSec: number;
  previewDurationSec: number;
  rootHz: number;
  gain: number;
  sampleRate?: number;
  onProgress?: (progress: number) => void;
  cooperative?: boolean;
}): Promise<CarrierIntegralHarmonicXploreDirectBuffer> {
  const sampleRate = Math.max(8000, Math.round(args.sampleRate ?? 44100));
  const durationSec = Math.max(0.25, Math.min(Math.max(args.durationSec, args.previewDurationSec), args.previewDurationSec || args.durationSec || 2));
  const sampleCount = Math.max(1, Math.round(durationSec * sampleRate));
  const directSelection = normalizeDirectSynthLabSelection(args.synthLab);
  const baseHxSelection = normalizeCarrierIntegralHarmonicXploreSelection(args.harmonicXplore ?? createDefaultCarrierIntegralHarmonicXploreSelection());
  const profile = args.derivedProfile
    ?? resolveCarrierIntegralHarmonicXploreProfile(baseHxSelection.profileId)
    ?? resolveCarrierIntegralHarmonicXploreProfile(HARMONIC_XPLORE_DIRECT_DEFAULT_PRESET_ID)!;
  const hxSelection = args.derivedProfile
    ? normalizeCarrierIntegralHarmonicXploreSelection({
        ...baseHxSelection,
        seriesType: profile.seriesType,
        phase: profile.phase,
        count: profile.count,
      }, baseHxSelection)
    : baseHxSelection;
  const renderConfig: CarrierIntegralHarmonicXploreRenderConfig = resolveCarrierIntegralHarmonicXploreRenderConfig({
    synthLab: directSelection,
    harmonicXplore: hxSelection,
    carrierVoiceCount: 6,
  });
  const timbre = buildCarrierIntegralHarmonicXploreDirectTimbreSnapshot(directSelection, hxSelection);
  const oscillators = harmonicXplorePartialsToOscillators(renderConfig.partials, 32);
  const series = renderConfig.renderSeries.filter((ratio) => ratio > 0);
  const carrierGestalt = summarizeCarrierGestalt(args.spectralData);
  const detailDensity = clamp(renderConfig.detailDensity, 0.2, 1);
  const detailMode = renderConfig.detailMode;
  const detailVoiceTarget = detailMode === 'dense' || detailDensity >= 0.86 ? 10 : detailDensity >= 0.58 ? 8 : 6;
  const detailPeakTarget = detailMode === 'dense' || detailDensity >= 0.86 ? 32 : detailDensity >= 0.58 ? 24 : 16;
  const voiceGainTrim = Math.sqrt(6 / Math.max(6, detailVoiceTarget));
  const globalGain = clamp(args.gain, 0, 1) * 0.38 * voiceGainTrim;
  const anchorRootHz = clamp(args.rootHz, 16, sampleRate * 0.24);
  const buffer = createWritableBuffer(sampleCount, sampleRate, 2);
  const outL = buffer.getChannelData(0);
  const outR = buffer.getChannelData(1);
  const oscCount = oscillators.length;
  const hasSpec = Boolean(args.spectralData && args.spectralData.width > 0 && args.spectralData.height > 0);
  const specWidth = hasSpec ? args.spectralData!.width : 0;
  const specHeight = hasSpec ? args.spectralData!.height : 0;
  const releaseStart = Math.max(0.1, 1 - Math.max(0.04, timbre.releaseScale * 0.08));
  const maxPanSpread = clamp(timbre.panSpread, 0, 1);
  const cooperative = Boolean(args.cooperative && args.onProgress);
  const yieldEverySamples = Math.max(1024, Math.round(sampleRate / 60));
  let lastProgressSample = -yieldEverySamples;
  const yieldIfNeeded = async (sampleIndex: number) => {
    if (!cooperative) return;
    if (sampleIndex - lastProgressSample < yieldEverySamples && sampleIndex < sampleCount - 1) return;
    lastProgressSample = sampleIndex;
    args.onProgress?.(clamp(sampleIndex / Math.max(1, sampleCount - 1), 0.02, 0.97));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  };
  args.onProgress?.(0.02);

  if (!hasSpec) {
    fallbackRender({ oscillators, series, timbre, sampleCount, sampleRate, anchorRootHz, globalGain, releaseStart, outL, outR });
  } else {
    const MAX_VOICES = detailVoiceTarget;
    const MAX_PEAKS = detailPeakTarget;
    // Raw candidate capacity is intentionally column-height based, not voice based:
    // a thick bass trace must not fill the candidate list before a distant high line
    // can even be considered. Final selection is still capped by MAX_PEAKS below.
    const RAW_PEAK_CAP = Math.max(MAX_PEAKS, specHeight);
    const vSmoothedLogHz = new Float64Array(MAX_VOICES).fill(Math.log2(anchorRootHz));
    const vTargetLogHz = new Float64Array(MAX_VOICES).fill(Math.log2(anchorRootHz));
    const vVelocityLog = new Float64Array(MAX_VOICES);
    const vSmoothedEn = new Float64Array(MAX_VOICES);
    const vTargetEn = new Float64Array(MAX_VOICES);
    const vMatched = new Uint8Array(MAX_VOICES);
    const vPhases = new Float64Array(MAX_VOICES * oscCount);
    // Per-voice grain state: 0 = short/noisy/percussive, 1 = long/tonal/legato.
    // Initialised to neutral 0.5; lazily updated from peak grain on each match.
    const vGrain = new Float64Array(MAX_VOICES).fill(0.5);
    const pLogHz = new Float64Array(MAX_PEAKS);
    const pEn = new Float64Array(MAX_PEAKS);
    const pMatched = new Uint8Array(MAX_PEAKS);
    // Grain sampled at each detected peak's spectral position.
    const pGrain = new Float64Array(MAX_PEAKS);
    // Register anchors are peaks selected to preserve a painted register band, not merely energy detail.
    const pRegisterAnchor = new Uint8Array(MAX_PEAKS);
    const rawLogHz = new Float64Array(RAW_PEAK_CAP);
    const rawEn = new Float64Array(RAW_PEAK_CAP);
    const rawGrain = new Float64Array(RAW_PEAK_CAP);
    const rawSelected = new Uint8Array(RAW_PEAK_CAP);
    const panPositions = new Float32Array(oscCount);
    const filterTiltPenalties = new Float32Array(oscCount);
    const flavor = profile.timbreFlavor ?? 'plain';
    const swarmDispersion = clamp(profile.swarmDispersion ?? 0, 0, 1);
    const formantFocus = clamp(profile.formantFocus ?? 0, 0, 1);
    const flavorSeed = `${renderConfig.configHash}|${profile.id}|${carrierGestalt.gestaltKey}`;
    const vSwarmCents = new Float32Array(MAX_VOICES);
    const phaseOffsets = new Float32Array(MAX_VOICES * oscCount);

    if (flavor === 'scatter' || flavor === 'metallic' || flavor === 'chorus') {
      // chorus uses a gentler spread (18 cents, 0.22 phase) for ensemble warmth
      // scatter/metallic use the full 28 cents / 0.33 phase for deliberate detune
      const centsScale = flavor === 'chorus' ? 18 : 28;
      const phaseScale = flavor === 'chorus' ? 0.22 : 0.33;
      for (let v = 0; v < MAX_VOICES; v += 1) {
        vSwarmCents[v] = seededSignedUnit(flavorSeed, v, 17) * swarmDispersion * centsScale;
        for (let o = 0; o < oscCount; o += 1) {
          phaseOffsets[v * oscCount + o] =
            seededSignedUnit(flavorSeed, v, o) * swarmDispersion * Math.PI * phaseScale;
        }
      }
    }

    for (let o = 0; o < oscCount; o++) {
      panPositions[o] = (o % 2 === 0 ? -1 : 1) * (o / Math.max(1, oscCount - 1));
      filterTiltPenalties[o] = o / Math.max(1, oscCount - 1);
    }

    let smoothedGlobalEnergy = 0;
    let smoothedDiffuseness = 0;
    const detailBoost = clamp((detailDensity - 0.2) / 0.8, 0, 1);
    const peakThreshold = 0.052 - detailBoost * 0.031;
    const activeBinThreshold = 0.012 - detailBoost * 0.005;
    const fineContrastThreshold = 0.026 - detailBoost * 0.014;
    const wallThreshold = 0.07 - detailBoost * 0.03;
    const matchDistanceLimit = 0.86 - detailBoost * 0.24;
    const voiceVelocityFollow = 0.28 + detailBoost * 0.18;
    const slewEnergyAtk = slewCoef(10 - detailBoost * 4, sampleRate);
    const slewEnergyRel = slewCoef(82 - detailBoost * 42, sampleRate);
    const slewEntropy = slewCoef(150 - detailBoost * 55, sampleRate);
    // Grain is updated once per spectral column, not once per audio sample.
    // Use a column-domain update rate so the intended ~80 ms material transition
    // stays audible instead of becoming seconds-long inertia on wide buffers.
    const spectralColumnUpdateRate = sampleRate * Math.max(1, specWidth) / Math.max(1, sampleCount);
    const grainSlewCoef = slewCoef(80, spectralColumnUpdateRate);
    const twoPi = Math.PI * 2;
    let lastCalculatedX = -1;

    for (let i = 0; i < sampleCount; i += 1) {
      await yieldIfNeeded(i);
      const ratio = i / Math.max(1, sampleCount - 1);
      const currentX = clamp(Math.floor(ratio * specWidth), 0, specWidth - 1);
      if (currentX !== lastCalculatedX) {
        lastCalculatedX = currentX;
        let frameEnergySum = 0;
        let nonZeroBins = 0;
        let rawPeakCount = 0;
        let peakCount = 0;
        let rawMinLogHz = Number.POSITIVE_INFINITY;
        let rawMaxLogHz = Number.NEGATIVE_INFINITY;

        for (let y = 0; y < specHeight; y += 1) {
          const val = clamp(args.spectralData!.get(currentX, y), 0, 1);
          frameEnergySum += val;
          if (val > activeBinThreshold) nonZeroBins += 1;
          const below = y > 0 ? clamp(args.spectralData!.get(currentX, y - 1), 0, 1) : 0;
          const above = y < specHeight - 1 ? clamp(args.spectralData!.get(currentX, y + 1), 0, 1) : 0;
          const localContrast = val - 0.5 * (below + above);
          const isLocalPeak = val >= below && val >= above;
          const contourCandidate = detailBoost > 0.15 && isLocalPeak && localContrast > fineContrastThreshold && val > activeBinThreshold;
          const filledBandCandidate = detailBoost > 0.55 && val > wallThreshold && Math.abs(above - below) < 0.018 + detailBoost * 0.014 && ((y + currentX) % Math.max(2, Math.round(5 - detailBoost * 3)) === 0);
          if (
            rawPeakCount < RAW_PEAK_CAP &&
            ((isLocalPeak && val > peakThreshold) || contourCandidate || filledBandCandidate)
          ) {
            rawLogHz[rawPeakCount] = peakToRelativeLogHz(y, specHeight, anchorRootHz);
            rawEn[rawPeakCount] = clamp(val + Math.max(0, localContrast) * (0.55 + detailBoost * 0.85) + (filledBandCandidate ? detailBoost * 0.08 : 0), 0, 1);
            rawGrain[rawPeakCount] = clamp(args.spectralData!.getGrain(currentX, y), 0, 1);
            rawSelected[rawPeakCount] = 0;
            rawMinLogHz = Math.min(rawMinLogHz, rawLogHz[rawPeakCount]!);
            rawMaxLogHz = Math.max(rawMaxLogHz, rawLogHz[rawPeakCount]!);
            rawPeakCount += 1;
          }
        }

        // Bring the strongest ridges to the front without allocating temporary objects.
        for (let a = 0; a < rawPeakCount; a += 1) {
          for (let b = a + 1; b < rawPeakCount; b += 1) {
            if (rawEn[b]! > rawEn[a]!) {
              const tmpLog = rawLogHz[a]!;
              const tmpEn = rawEn[a]!;
              const tmpGrain = rawGrain[a]!;
              rawLogHz[a] = rawLogHz[b]!;
              rawEn[a] = rawEn[b]!;
              rawGrain[a] = rawGrain[b]!;
              rawLogHz[b] = tmpLog;
              rawEn[b] = tmpEn;
              rawGrain[b] = tmpGrain;
            }
          }
        }

        const selectRawPeak = (index: number, registerAnchor: boolean = false) => {
          if (peakCount >= MAX_PEAKS || rawSelected[index]) return;
          pLogHz[peakCount] = rawLogHz[index]!;
          pEn[peakCount] = rawEn[index]!;
          pGrain[peakCount] = rawGrain[index]!;
          pMatched[peakCount] = 0;
          pRegisterAnchor[peakCount] = registerAnchor ? 1 : 0;
          rawSelected[index] = 1;
          peakCount += 1;
        };

        // First pass: reserve one strong peak per painted register band before
        // energy ranking can let a thick bass or mid ridge monopolize the voice list.
        // This is deliberately not a pitch grid: bands are derived from whatever
        // register span is actually painted in the current spectral column.
        const seedLogDistance = 0.12 - detailBoost * 0.05;
        const seedTarget = Math.min(MAX_VOICES, MAX_PEAKS, rawPeakCount);
        const rawRegisterSpan = Number.isFinite(rawMinLogHz) && Number.isFinite(rawMaxLogHz)
          ? Math.max(0, rawMaxLogHz - rawMinLogHz)
          : 0;
        const registerBandCount = Math.min(
          seedTarget,
          Math.max(1, Math.ceil(rawRegisterSpan / Math.max(0.05, seedLogDistance))),
        );
        for (let band = 0; band < registerBandCount && peakCount < seedTarget; band += 1) {
          const bandLo = rawMinLogHz + (rawRegisterSpan * band) / registerBandCount;
          const bandHi = band === registerBandCount - 1
            ? rawMaxLogHz + 1e-6
            : rawMinLogHz + (rawRegisterSpan * (band + 1)) / registerBandCount;
          let bestIndex = -1;
          let bestEnergy = -1;
          for (let r = 0; r < rawPeakCount; r += 1) {
            if (rawSelected[r]) continue;
            const hzLog = rawLogHz[r]!;
            if (hzLog < bandLo || hzLog >= bandHi) continue;
            if (rawEn[r]! > bestEnergy) {
              bestEnergy = rawEn[r]!;
              bestIndex = r;
            }
          }
          if (bestIndex !== -1) selectRawPeak(bestIndex, true);
        }

        // Second pass: reserve additional distinct painted registers by energy. This
        // catches sparse microtonal voices that sit between the coarse adaptive bands.
        for (let r = 0; r < rawPeakCount && peakCount < seedTarget; r += 1) {
          let tooCloseToSeed = false;
          for (let p = 0; p < peakCount; p += 1) {
            if (Math.abs(pLogHz[p]! - rawLogHz[r]!) < seedLogDistance) {
              tooCloseToSeed = true;
              break;
            }
          }
          if (!tooCloseToSeed) selectRawPeak(r, true);
        }

        // Third pass: fill the remaining detail budget by energy, preserving close
        // microtonal detail and brush texture after the wide-register anchors exist.
        for (let r = 0; r < rawPeakCount && peakCount < MAX_PEAKS; r += 1) {
          selectRawPeak(r, false);
        }

        for (let v = 0; v < MAX_VOICES; v += 1) {
          vMatched[v] = 0;
          if (vSmoothedEn[v]! > 0.01) {
            vTargetLogHz[v] = vSmoothedLogHz[v]! + vVelocityLog[v]!;
          }
        }

        for (let iter = 0; iter < Math.min(MAX_VOICES, peakCount); iter += 1) {
          let bestVoice = -1;
          let bestPeak = -1;
          let minDistance = Infinity;
          for (let v = 0; v < MAX_VOICES; v += 1) {
            if (vMatched[v] || vSmoothedEn[v]! < 0.01) continue;
            for (let p = 0; p < peakCount; p += 1) {
              if (pMatched[p]) continue;
              const distance = Math.abs(vTargetLogHz[v]! - pLogHz[p]!);
              if (distance < minDistance) {
                minDistance = distance;
                bestVoice = v;
                bestPeak = p;
              }
            }
          }
          if (bestVoice !== -1 && bestPeak !== -1 && minDistance < matchDistanceLimit) {
            vMatched[bestVoice] = 1;
            pMatched[bestPeak] = 1;
            const nextLogHz = pLogHz[bestPeak]!;
            vVelocityLog[bestVoice] = (nextLogHz - vSmoothedLogHz[bestVoice]!) * voiceVelocityFollow;
            vTargetLogHz[bestVoice] = nextLogHz;
            vTargetEn[bestVoice] = clamp(pEn[bestPeak]! * (1.28 + detailBoost * 0.26), 0, 1);
            // Slew grain toward the peak's grain value; avoids abrupt tonal-character
            // jumps when a voice re-targets a spectrally adjacent but texturally
            // different peak.
            vGrain[bestVoice] += (pGrain[bestPeak]! - vGrain[bestVoice]!) * grainSlewCoef;
          }
        }

        for (let p = 0; p < peakCount; p += 1) {
          if (pMatched[p]) continue;
          for (let v = 0; v < MAX_VOICES; v += 1) {
            if (!vMatched[v] && vSmoothedEn[v]! < 0.01) {
              vMatched[v] = 1;
              pMatched[p] = 1;
              vTargetLogHz[v] = pLogHz[p]!;
              vSmoothedLogHz[v] = pLogHz[p]!;
              vVelocityLog[v] = 0;
              vTargetEn[v] = clamp(pEn[p]! * (1.28 + detailBoost * 0.26), 0, 1);
              // Snap grain directly — voice is silent, no audible discontinuity.
              vGrain[v] = pGrain[p]!;
              break;
            }
          }
        }

        // Final protection pass for short, newly painted register anchors. If all
        // voices are still fading or tracking a nearby thick ridge, an upper/bass
        // step can otherwise remain visually present but never receive a voice.
        // Prefer stealing a redundant close-register voice; otherwise take the
        // quietest voice only for an actually orphaned register anchor.
        const orphanRegisterDistance = seedLogDistance * 1.15;
        for (let p = 0; p < peakCount; p += 1) {
          if (pMatched[p] || !pRegisterAnchor[p]) continue;
          let nearestVoiceDistance = Infinity;
          for (let v = 0; v < MAX_VOICES; v += 1) {
            if (vTargetEn[v]! <= 0.001 && vSmoothedEn[v]! <= 0.001) continue;
            nearestVoiceDistance = Math.min(nearestVoiceDistance, Math.abs(vTargetLogHz[v]! - pLogHz[p]!));
          }
          if (nearestVoiceDistance < orphanRegisterDistance) continue;

          let victim = -1;
          let victimScore = Infinity;
          for (let v = 0; v < MAX_VOICES; v += 1) {
            let siblingDistance = Infinity;
            for (let u = 0; u < MAX_VOICES; u += 1) {
              if (u === v) continue;
              if (vTargetEn[u]! <= 0.001 && vSmoothedEn[u]! <= 0.001) continue;
              siblingDistance = Math.min(siblingDistance, Math.abs(vTargetLogHz[v]! - vTargetLogHz[u]!));
            }
            const redundantRegisterBonus = siblingDistance < seedLogDistance ? -1.0 : 0.0;
            const energyCost = Math.max(vTargetEn[v]!, vSmoothedEn[v]!);
            const score = redundantRegisterBonus + energyCost;
            if (score < victimScore) {
              victimScore = score;
              victim = v;
            }
          }

          if (victim !== -1) {
            vMatched[victim] = 1;
            pMatched[p] = 1;
            const nextLogHz = pLogHz[p]!;
            const registerJump = Math.abs(vSmoothedLogHz[victim]! - nextLogHz);
            if (registerJump > 0.38 && vSmoothedEn[victim]! < 0.14) {
              // A quiet stolen voice should enter the orphaned register directly,
              // not whoop from the old ridge across the painted interval.
              vSmoothedLogHz[victim] = nextLogHz;
              vVelocityLog[victim] = 0;
            } else {
              vVelocityLog[victim] = (nextLogHz - vSmoothedLogHz[victim]!) * voiceVelocityFollow;
            }
            vTargetLogHz[victim] = nextLogHz;
            vTargetEn[victim] = clamp(pEn[p]! * (1.28 + detailBoost * 0.26), 0, 1);
            vGrain[victim] += (pGrain[p]! - vGrain[victim]!) * (vSmoothedEn[victim]! < 0.14 ? 1 : grainSlewCoef);
          }
        }

        for (let v = 0; v < MAX_VOICES; v += 1) {
          if (!vMatched[v]) vTargetEn[v] = 0;
        }

        const targetDiffuseness = clamp(nonZeroBins / specHeight, 0, 1);
        smoothedDiffuseness += (targetDiffuseness - smoothedDiffuseness) * slewEntropy;
        const targetGlobalEnergy = Math.min(1, frameEnergySum / (specHeight * 0.1));
        const energySlew = targetGlobalEnergy > smoothedGlobalEnergy ? slewEnergyAtk : slewEnergyRel;
        smoothedGlobalEnergy += (targetGlobalEnergy - smoothedGlobalEnergy) * energySlew;
      }

      const attack = smoothstep(Math.min(1, ratio / Math.max(0.005, timbre.attackScale * 0.1)));
      const release = ratio < releaseStart ? 1 : 1 - smoothstep((ratio - releaseStart) / Math.max(0.001, 1 - releaseStart));
      const globalEnv = globalGain * attack * release;
      const entropyTimbre = smoothstep(smoothedDiffuseness);
      let sampleL = 0;
      let sampleR = 0;

      for (let v = 0; v < MAX_VOICES; v += 1) {
        const energySlew = vTargetEn[v]! > vSmoothedEn[v]! ? slewEnergyAtk : slewEnergyRel;
        vSmoothedEn[v] += (vTargetEn[v]! - vSmoothedEn[v]!) * energySlew;
        if (vSmoothedEn[v]! <= 0.001) continue;

        // Per-voice pitch slew derived from grain.
        // grain=1 (tonal) → slow legato glide (up to ~52 ms at detailBoost=0).
        // grain=0 (noisy)  → fast percussive snap (down to ~8 ms at detailBoost=0).
        // detailBoost compresses the range toward the low end for dense passages.
        const grain = vGrain[v]!;
        const voiceSlewPitchMs = (8 + grain * 44) * (1 - detailBoost * 0.4);
        const voiceSlewPitch = slewCoef(voiceSlewPitchMs, sampleRate);
        vSmoothedLogHz[v] += (vTargetLogHz[v]! - vSmoothedLogHz[v]!) * voiceSlewPitch;
        const voiceHz = Math.pow(2, vSmoothedLogHz[v]!);
        const voiceSpread = MAX_VOICES > 1 ? (v - (MAX_VOICES - 1) / 2) / ((MAX_VOICES - 1) / 2) : 0;

        // Inharmonic detune spread driven by grain:
        // grain=0 (noisy) → up to ±10 cents added per partial, scaled by partial index
        // so the fundamental (o=0) is never spread, and the highest partial is
        // maximally spread. grain=1 (tonal) → no additional spread.
        const grainDetuneScale = (1 - grain) * 10;

        for (let o = 0; o < oscCount; o += 1) {
          const osc = oscillators[o]!;
          const ratioMul = clamp(Math.abs(osc.freqMul || series[o % Math.max(1, series.length)] || 1), 0.0625, 16);
          const entropyDetune = (o % 2 === 0 ? 1 : -1) * entropyTimbre * 6;
          const grainDetune = (o % 2 === 0 ? 1 : -1) * grainDetuneScale * (o / Math.max(1, oscCount - 1));
          const cents = clamp((osc.detune ?? 0) + entropyDetune + grainDetune + vSwarmCents[v]!, -90, 90);
          const hz = clamp(voiceHz * ratioMul * Math.pow(2, cents / 1200), 10, sampleRate * 0.42);
          const phaseIndex = v * oscCount + o;
          vPhases[phaseIndex] += (twoPi * hz) / sampleRate;
          if (vPhases[phaseIndex]! > twoPi) vPhases[phaseIndex] -= twoPi * Math.floor(vPhases[phaseIndex]! / twoPi);

          const harmonicPenalty = filterTiltPenalties[o]!;
          const baseSpectralTilt = clamp(
            1 - harmonicPenalty * (1 - smoothedGlobalEnergy * 0.88 - entropyTimbre * 0.22),
            0.06,
            1,
          );
          const spectralTilt = applyHarmonicXploreFlavorTilt({
            hz,
            baseTilt: baseSpectralTilt,
            flavor,
            formantFocus,
            partialIndex: o,
            partialCount: oscCount,
          });
          const phase = vPhases[phaseIndex]! + phaseOffsets[phaseIndex]!;
          const wave = waveformSample(osc.type, phase) * clamp(osc.gain, 0, 1) * spectralTilt;
          // chorus flavor widens stereo spread per voice for ensemble imaging
        const flavorPanBoost = flavor === 'chorus' ? 1.0 + swarmDispersion * 0.62 : 1.0;
        const currentPanSpread = maxPanSpread * (0.1 + entropyTimbre * 0.58) * flavorPanBoost;
          const panVal = clamp(panPositions[o]! * currentPanSpread + voiceSpread * 0.18 * currentPanSpread, -1, 1);
          const panAngle = (panVal + 1) * 0.25 * Math.PI;
          sampleL += wave * Math.cos(panAngle) * vSmoothedEn[v]!;
          sampleR += wave * Math.sin(panAngle) * vSmoothedEn[v]!;
        }
      }

      const driveMod = 1.02 + timbre.drive * 1.25 + entropyTimbre * 0.24;
      outL[i] = Math.tanh(Math.tanh(sampleL * driveMod) * globalEnv);
      outR[i] = Math.tanh(Math.tanh(sampleR * driveMod) * globalEnv);
    }
  }

  const directEngineKey = carrierIntegralHash31([
    CARRIER_INTEGRAL_HARMONIC_XPLORE_DIRECT_ENGINE_VERSION,
    directSelection.presetId,
    renderConfig.configHash,
    detailMode,
    String(detailDensity),
    profile.carrierReading,
    profile.timbreFlavor ?? 'plain',
    String(profile.swarmDispersion ?? 0),
    String(profile.formantFocus ?? 0),
    'flat-hearing-flavor-tilt-v1',
    'klangfarben-warm-bell-chorus-bright-v1',
    series.join(','),
    String(oscillators.length),
    timbre.paramsHash,
    carrierGestalt.gestaltKey,
    carrierGestalt.energyMean,
    carrierGestalt.centroidMean,
    carrierGestalt.entropyMean,
    carrierGestalt.activeColumnRatio,
    carrierGestalt.grainMean,
    carrierGestalt.paintedRegisterSpanOctaves,
    'contour-provenance-clean/no-noise-dust/log-frequency-prediction',
    'wide-interval-voice-seeding-v1',
    'register-band-voice-anchors-v1',
    'grain-voice-character-v1',
    'wave-mix-truth-v1',
  ].join('|'));

  args.onProgress?.(1);

  return {
    buffer,
    summary: {
      version: CARRIER_INTEGRAL_HARMONIC_XPLORE_DIRECT_ENGINE_VERSION,
      rendererKind: 'harmonic-xplore-direct-ratio-carrier-buffer',
      presetId: `${directSelection.presetId}×${hxSelection.profileId}`,
      carrierReading: profile.carrierReading,
      oscillatorCount: oscillators.length,
      series,
      durationSec,
      sampleRate,
      carrierGestalt,
      vectorMomentum: {
        enabled: true,
        maxVoices: detailVoiceTarget,
        maxPeaks: detailPeakTarget,
        detailDensity,
        detailMode,
        peakThreshold: carrierIntegralRound3(hasSpec ? (0.052 - clamp((detailDensity - 0.2) / 0.8, 0, 1) * 0.031) : 0),
        noiseDustSuppressed: true,
        matchingSpace: 'log-frequency-prediction',
      },
      antiWhoopContract: {
        rootMotionIsNotAttackGlide: true,
        noPerNoteInitialPitchSwoop: true,
        directRatioBodyMayOverformLegacySynth: true,
        continuousCentroidGlideEnabled: true,
        entropyDrivenDetuneAndWidth: true,
        controlRateDecoupledFromAudioRate: true,
        noiseDustSuppressedForPureCarrier: true,
        vectorMomentumPolyphony: true,
        lineProvenanceContinuity: true,
        fretlessMicrotonalScaling: true,
        grainChannelModulatesVoiceSlewAndDetune: true,
        wideIntervalVoiceSeeding: true,
        spectralEdgePeaksIncluded: true,
        registerBandVoiceAnchors: true,
        orphanRegisterVoiceActivation: true,
      },
      directEngineKey,
    },
  };
}
