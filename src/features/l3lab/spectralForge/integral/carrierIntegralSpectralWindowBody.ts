import type { SpectralData } from '../audio/SpectralData';
import {
  DONATELLO_FORMANT_ENGINE_LIMITS,
  DONATELLO_FORMANT_PLAN_DEFAULT_RESOLUTION,
  DONATELLO_FORMANT_PLAN_DEFAULT_SAFE_GAIN_CEILING,
} from './donatelloFormantDefaults';
import type {
  DonatelloBandRole,
  DonatelloFormantBandPlan,
  DonatelloFormantPlanBuildOptions,
  DonatelloFormantRenderPlan,
} from './donatelloFormantTypes';
import { DONATELLO_FORMANT_PLAN_SCHEMA_VERSION } from './donatelloFormantTypes';

export const CARRIER_INTEGRAL_SPECTRAL_WINDOW_BODY_VERSION =
  'carrier-integral-spectral-window-body-3.2.91.7.5.67';

export type CarrierIntegralSpectralWindowBodyBandDescriptor = {
  bandId: string;
  meanCenterRatio: number;
  meanBandwidthRatio: number;
  meanGain: number;
  meanContourConfidence: number;
  meanFieldWeight: number;
};

export type CarrierIntegralSpectralWindowBodyDescriptor = {
  version: typeof CARRIER_INTEGRAL_SPECTRAL_WINDOW_BODY_VERSION;
  descriptorKind: 'spectral-window-body-first-prototype';
  analysisMode: 'persistent-window-tracks';
  machineId: 'dieter-window-body';
  bandCount: number;
  curveResolution: number;
  activeSliceRatio: number;
  meanContourConfidence: number;
  meanFieldWeight: number;
  meanRoughness: number;
  loopClosure: {
    circularEdgeBlend: true;
    edgeBlendSlices: number;
    exactPhaseClosure: false;
    persistentPhasePolicy: 'prepared-for-renderer-phase-accumulators';
  };
  rootFollowContract: {
    tonalGravityPrepared: true;
    anchorHzDefault: number;
    hardQuantization: false;
  };
  bands: CarrierIntegralSpectralWindowBodyBandDescriptor[];
};

export type CarrierIntegralSpectralWindowBodyPlanResult = {
  plan: DonatelloFormantRenderPlan;
  descriptor: CarrierIntegralSpectralWindowBodyDescriptor;
};

type PeakCandidate = {
  y: number;
  value: number;
  widthBins: number;
  roughness: number;
  contourConfidence: number;
};

type WindowTrack = {
  centerRatioCurve: Array<number | null>;
  bandwidthRatioCurve: Array<number | null>;
  gainCurve: number[];
  confidenceCurve: number[];
  roughnessCurve: number[];
  lastCenterRatio: number | null;
  lastSlice: number;
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return value < min ? min : value > max ? max : value;
}

function smoothstep(value: number): number {
  const x = clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createFilled(length: number, value = 0): number[] {
  return Array.from({ length }, () => value);
}

function createNullable(length: number): Array<number | null> {
  return Array.from({ length }, () => null);
}

function interpolateMissing(values: Array<number | null>, fallback: number): number[] {
  const result = new Array(values.length).fill(fallback) as number[];
  let lastKnown = -1;
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] !== null && Number.isFinite(values[i] ?? NaN)) {
      const current = Number(values[i]);
      if (lastKnown < 0) {
        for (let k = 0; k <= i; k += 1) result[k] = current;
      } else {
        const start = result[lastKnown] ?? current;
        const span = Math.max(1, i - lastKnown);
        for (let k = lastKnown + 1; k <= i; k += 1) {
          const ratio = (k - lastKnown) / span;
          result[k] = start * (1 - ratio) + current * ratio;
        }
      }
      result[i] = current;
      lastKnown = i;
    }
  }
  if (lastKnown >= 0) {
    for (let i = lastKnown + 1; i < values.length; i += 1) result[i] = result[lastKnown] ?? fallback;
  }
  return result;
}

function circularEdgeBlend(curve: number[], edgeSlices: number): number[] {
  if (curve.length < 3 || edgeSlices <= 0) return curve.map((value) => Number(value) || 0);
  const result = curve.map((value) => Number(value) || 0);
  const safeEdge = Math.min(edgeSlices, Math.floor(curve.length / 4));
  for (let i = 0; i < safeEdge; i += 1) {
    const ratio = smoothstep((i + 1) / (safeEdge + 1));
    const leftIndex = i;
    const rightIndex = curve.length - 1 - i;
    const left = result[leftIndex] ?? 0;
    const right = result[rightIndex] ?? 0;
    const shared = left * ratio + right * (1 - ratio);
    result[leftIndex] = left * 0.72 + shared * 0.28;
    result[rightIndex] = right * 0.72 + shared * 0.28;
  }
  return result;
}

function yToCenterRatio(y: number, height: number): number {
  const yFromBottom = height - 1 - y;
  const normalized = clamp(yFromBottom / Math.max(1, height - 1), 0, 1);
  const octaves = (normalized - 0.5) * 5.0;
  return clamp(Math.pow(2, octaves), 0.0625, 24);
}

function widthToBandwidthRatio(widthBins: number, height: number): number {
  const normalized = clamp(widthBins / Math.max(1, height), 0, 1);
  return clamp(0.012 + normalized * 3.2, 0.006, 8);
}

function localAverage(spectralData: SpectralData, x: number, y: number, radius: number): number {
  const height = spectralData.height;
  let sum = 0;
  let count = 0;
  for (let yy = Math.max(0, y - radius); yy <= Math.min(height - 1, y + radius); yy += 1) {
    sum += clamp(spectralData.get(x, yy), 0, 1);
    count += 1;
  }
  return count > 0 ? sum / count : 0;
}

function estimatePeakWidth(spectralData: SpectralData, x: number, y: number, peak: number): number {
  const height = spectralData.height;
  const threshold = Math.max(0.01, peak * 0.42);
  let lower = y;
  let upper = y;
  while (lower > 0 && clamp(spectralData.get(x, lower - 1), 0, 1) >= threshold) lower -= 1;
  while (upper < height - 1 && clamp(spectralData.get(x, upper + 1), 0, 1) >= threshold) upper += 1;
  return Math.max(1, upper - lower + 1);
}

function buildPeakCandidates(args: {
  spectralData: SpectralData;
  sliceIndex: number;
  curveResolution: number;
  maxCandidates: number;
  minEnergy: number;
}): PeakCandidate[] {
  const { spectralData } = args;
  const width = spectralData.width;
  const height = spectralData.height;
  const x = clamp(Math.round((args.sliceIndex / Math.max(1, args.curveResolution - 1)) * Math.max(0, width - 1)), 0, width - 1);
  const candidates: PeakCandidate[] = [];
  for (let y = 1; y < height - 1; y += 1) {
    const value = clamp(spectralData.get(x, y), 0, 1);
    if (value < args.minEnergy) continue;
    if (value < clamp(spectralData.get(x, y - 1), 0, 1) || value < clamp(spectralData.get(x, y + 1), 0, 1)) continue;
    const widthBins = estimatePeakWidth(spectralData, x, y, value);
    const wideAverage = localAverage(spectralData, x, y, Math.max(2, Math.round(height * 0.025)));
    const broadAverage = localAverage(spectralData, x, y, Math.max(4, Math.round(height * 0.08)));
    const peakToValley = value / Math.max(0.0025, broadAverage);
    const sharpness = clamp((peakToValley - 1) / 6, 0, 1);
    const bandwidthPenalty = clamp(widthBins / Math.max(3, height * 0.12), 0, 1);
    const localContrast = clamp((value - wideAverage) / Math.max(0.01, value), 0, 1);
    const contourConfidence = clamp(0.18 + sharpness * 0.38 + localContrast * 0.34 - bandwidthPenalty * 0.28, 0, 1);
    const roughness = clamp(1 - contourConfidence + bandwidthPenalty * 0.45, 0, 1);
    candidates.push({ y, value, widthBins, roughness, contourConfidence });
  }
  candidates.sort((a, b) => b.value - a.value);
  return candidates.slice(0, args.maxCandidates);
}

function assignCandidateToTrack(args: {
  candidate: PeakCandidate;
  tracks: WindowTrack[];
  usedTracks: Set<number>;
  sliceIndex: number;
  height: number;
}): number {
  const centerRatio = yToCenterRatio(args.candidate.y, args.height);
  let bestTrack = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < args.tracks.length; i += 1) {
    if (args.usedTracks.has(i)) continue;
    const track = args.tracks[i]!;
    if (track.lastCenterRatio === null) {
      if (bestTrack === -1) bestTrack = i;
      continue;
    }
    const agePenalty = Math.max(0, args.sliceIndex - track.lastSlice - 1) * 0.18;
    const distance = Math.abs(Math.log2(centerRatio / Math.max(0.0001, track.lastCenterRatio))) + agePenalty;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestTrack = i;
    }
  }
  return bestTrack < 0 ? 0 : bestTrack;
}

function closePlanCurves(plan: DonatelloFormantRenderPlan, edgeSlices: number): DonatelloFormantRenderPlan {
  return {
    ...plan,
    bands: plan.bands.map((band) => ({
      ...band,
      centerRatioCurve: circularEdgeBlend(band.centerRatioCurve, edgeSlices).map((value) => clamp(value, 0.0625, 64)),
      bandwidthRatioCurve: circularEdgeBlend(band.bandwidthRatioCurve, edgeSlices).map((value) => clamp(value, 0.0025, 12)),
      gainCurve: circularEdgeBlend(band.gainCurve, edgeSlices).map((value) => clamp(value, 0, 1)),
      confidenceCurve: band.confidenceCurve ? circularEdgeBlend(band.confidenceCurve, edgeSlices).map((value) => clamp(value, 0, 1)) : undefined,
      roughnessCurve: band.roughnessCurve ? circularEdgeBlend(band.roughnessCurve, edgeSlices).map((value) => clamp(value, 0, 1)) : undefined,
    })),
    roughnessCurve: circularEdgeBlend(plan.roughnessCurve, edgeSlices).map((value) => clamp(value, 0, 1)),
    transientDustCurve: circularEdgeBlend(plan.transientDustCurve, edgeSlices).map((value) => clamp(value, 0, 1)),
    residualEnergyCurve: circularEdgeBlend(plan.residualEnergyCurve, edgeSlices).map((value) => clamp(value, 0, 1)),
  };
}

function scaleGainCeiling(bands: DonatelloFormantBandPlan[], safeGainCeiling: number): { rawMaxSliceGain: number; maxSliceGain: number; gainCeilingScaleCount: number } {
  const resolution = bands[0]?.gainCurve.length ?? 0;
  let rawMaxSliceGain = 0;
  let gainCeilingScaleCount = 0;
  for (let slice = 0; slice < resolution; slice += 1) {
    const sum = bands.reduce((total, band) => total + clamp(band.gainCurve[slice] ?? 0, 0, 1), 0);
    rawMaxSliceGain = Math.max(rawMaxSliceGain, sum);
    if (sum <= safeGainCeiling || sum <= 0) continue;
    const scale = safeGainCeiling / sum;
    gainCeilingScaleCount += 1;
    for (const band of bands) band.gainCurve[slice] = clamp((band.gainCurve[slice] ?? 0) * scale, 0, 1);
  }
  const maxSliceGain = resolution > 0
    ? Math.max(...Array.from({ length: resolution }, (_, slice) => bands.reduce((sum, band) => sum + clamp(band.gainCurve[slice] ?? 0, 0, 1), 0)))
    : 0;
  return { rawMaxSliceGain, maxSliceGain: clamp(maxSliceGain, 0, 1), gainCeilingScaleCount };
}

function roleForBand(index: number): DonatelloBandRole {
  if (index === 0) return 'core-line';
  if (index <= 2) return 'body-band';
  if (index <= 4) return 'surface-band';
  return 'residual-band';
}

function buildDescriptor(plan: DonatelloFormantRenderPlan, edgeBlendSlices: number): CarrierIntegralSpectralWindowBodyDescriptor {
  const bands = plan.bands.map((band) => {
    const meanGain = mean(band.gainCurve.map((value) => clamp(value, 0, 1)));
    const meanContourConfidence = mean((band.confidenceCurve ?? []).map((value) => clamp(value, 0, 1)));
    return {
      bandId: band.id,
      meanCenterRatio: clamp(mean(band.centerRatioCurve), 0.0625, 64),
      meanBandwidthRatio: clamp(mean(band.bandwidthRatioCurve), 0.0025, 12),
      meanGain,
      meanContourConfidence,
      meanFieldWeight: clamp(1 - meanContourConfidence, 0, 1),
    };
  });
  const activeSlices = Array.from({ length: plan.curveResolution }, (_, slice) =>
    plan.bands.some((band) => (band.gainCurve[slice] ?? 0) > 0.01),
  ).filter(Boolean).length;
  const meanContourConfidence = bands.length ? mean(bands.map((band) => band.meanContourConfidence)) : 0;
  return {
    version: CARRIER_INTEGRAL_SPECTRAL_WINDOW_BODY_VERSION,
    descriptorKind: 'spectral-window-body-first-prototype',
    analysisMode: 'persistent-window-tracks',
    machineId: 'dieter-window-body',
    bandCount: plan.bands.length,
    curveResolution: plan.curveResolution,
    activeSliceRatio: clamp(activeSlices / Math.max(1, plan.curveResolution), 0, 1),
    meanContourConfidence,
    meanFieldWeight: clamp(1 - meanContourConfidence, 0, 1),
    meanRoughness: mean(plan.roughnessCurve.map((value) => clamp(value, 0, 1))),
    loopClosure: {
      circularEdgeBlend: true,
      edgeBlendSlices,
      exactPhaseClosure: false,
      persistentPhasePolicy: 'prepared-for-renderer-phase-accumulators',
    },
    rootFollowContract: {
      tonalGravityPrepared: true,
      anchorHzDefault: plan.rootReferenceHz,
      hardQuantization: false,
    },
    bands,
  };
}

export function buildCarrierIntegralSpectralWindowBodyPlan(args: {
  spectralData: SpectralData;
  durationSec: number;
  options?: DonatelloFormantPlanBuildOptions;
}): CarrierIntegralSpectralWindowBodyPlanResult {
  const curveResolution = Math.max(
    DONATELLO_FORMANT_ENGINE_LIMITS.minCurveResolution,
    Math.round(args.options?.curveResolution ?? DONATELLO_FORMANT_PLAN_DEFAULT_RESOLUTION),
  );
  const maxBands = Math.max(1, Math.min(8, Math.round(args.options?.maxBands ?? 5)));
  const safeGainCeiling = clamp(
    args.options?.safeGainCeiling ?? DONATELLO_FORMANT_PLAN_DEFAULT_SAFE_GAIN_CEILING,
    DONATELLO_FORMANT_ENGINE_LIMITS.minSafeGainCeiling,
    DONATELLO_FORMANT_ENGINE_LIMITS.maxSafeGainCeiling,
  );
  const minEnergy = Math.max(0.006, args.options?.minEnergy ?? 0.032);
  const rootReferenceHz = Math.max(1, args.options?.rootReferenceHz ?? 110);
  const durationBeats = Math.max(0.125, args.options?.durationBeats ?? 4);
  const tracks: WindowTrack[] = Array.from({ length: maxBands }, () => ({
    centerRatioCurve: createNullable(curveResolution),
    bandwidthRatioCurve: createNullable(curveResolution),
    gainCurve: createFilled(curveResolution),
    confidenceCurve: createFilled(curveResolution),
    roughnessCurve: createFilled(curveResolution),
    lastCenterRatio: null,
    lastSlice: -999,
  }));
  const roughnessCurve = createFilled(curveResolution);
  const transientDustCurve = createFilled(curveResolution);
  const residualEnergyCurve = createFilled(curveResolution);
  let inputEnergy = 0;
  let retainedLineEnergy = 0;
  let textureEnergy = 0;
  let transientEnergy = 0;
  let emptySliceCount = 0;
  let maxResidualSlice = 0;
  let maxRoughnessSlice = 0;
  let maxTransientDustSlice = 0;

  for (let slice = 0; slice < curveResolution; slice += 1) {
    const candidates = buildPeakCandidates({
      spectralData: args.spectralData,
      sliceIndex: slice,
      curveResolution,
      maxCandidates: Math.max(maxBands * 2, maxBands + 2),
      minEnergy,
    });
    if (!candidates.length) emptySliceCount += 1;
    const usedTracks = new Set<number>();
    let retainedSliceEnergy = 0;
    let roughSlice = 0;
    let transientSlice = 0;
    for (const candidate of candidates.slice(0, maxBands)) {
      const trackIndex = assignCandidateToTrack({ candidate, tracks, usedTracks, sliceIndex: slice, height: args.spectralData.height });
      const track = tracks[trackIndex] ?? tracks[0]!;
      usedTracks.add(trackIndex);
      const centerRatio = yToCenterRatio(candidate.y, args.spectralData.height);
      const bandwidthRatio = widthToBandwidthRatio(candidate.widthBins, args.spectralData.height);
      const gain = clamp(Math.sqrt(candidate.value) * 0.9, 0, 1);
      track.centerRatioCurve[slice] = centerRatio;
      track.bandwidthRatioCurve[slice] = bandwidthRatio;
      track.gainCurve[slice] = Math.max(track.gainCurve[slice] ?? 0, gain);
      track.confidenceCurve[slice] = Math.max(track.confidenceCurve[slice] ?? 0, candidate.contourConfidence);
      track.roughnessCurve[slice] = Math.max(track.roughnessCurve[slice] ?? 0, candidate.roughness);
      track.lastCenterRatio = centerRatio;
      track.lastSlice = slice;
      retainedSliceEnergy += gain * candidate.contourConfidence;
      roughSlice = Math.max(roughSlice, candidate.roughness);
      transientSlice = Math.max(transientSlice, clamp(gain * Math.max(0, candidate.contourConfidence - 0.72), 0, 1));
    }
    const residualSlice = clamp(candidates.slice(maxBands).reduce((sum, candidate) => sum + candidate.value, 0) / Math.max(1, args.spectralData.height * 0.1), 0, 1);
    roughnessCurve[slice] = roughSlice;
    transientDustCurve[slice] = transientSlice;
    residualEnergyCurve[slice] = residualSlice;
    inputEnergy += retainedSliceEnergy + residualSlice;
    retainedLineEnergy += retainedSliceEnergy;
    textureEnergy += residualSlice + roughSlice * 0.2;
    transientEnergy += transientSlice;
    maxResidualSlice = Math.max(maxResidualSlice, residualSlice);
    maxRoughnessSlice = Math.max(maxRoughnessSlice, roughSlice);
    maxTransientDustSlice = Math.max(maxTransientDustSlice, transientSlice);
  }

  const bands: DonatelloFormantBandPlan[] = tracks
    .map((track, index) => ({
      id: `dieter-window-body-band-${index + 1}`,
      role: roleForBand(index),
      centerRatioCurve: interpolateMissing(track.centerRatioCurve, 1).map((value) => clamp(value, 0.0625, 64)),
      bandwidthRatioCurve: interpolateMissing(track.bandwidthRatioCurve, 0.08).map((value) => clamp(value, 0.0025, 12)),
      gainCurve: track.gainCurve.map((value) => clamp(value, 0, 1)),
      confidenceCurve: track.confidenceCurve.map((value) => clamp(value, 0, 1)),
      roughnessCurve: track.roughnessCurve.map((value) => clamp(value, 0, 1)),
    }))
    .filter((band) => band.gainCurve.some((value) => value > 0.003));

  const ceiling = scaleGainCeiling(bands, safeGainCeiling);
  const edgeBlendSlices = Math.max(2, Math.min(12, Math.round(curveResolution * 0.08)));
  const plan = closePlanCurves({
    schemaVersion: DONATELLO_FORMANT_PLAN_SCHEMA_VERSION,
    machineId: 'dieter-window-body',
    curveResolution,
    maxBands,
    rootReferenceHz,
    durationBeats,
    bands,
    roughnessCurve,
    transientDustCurve,
    residualEnergyCurve,
    summary: {
      inputEnergy: clamp(inputEnergy / Math.max(1, curveResolution), 0, Number.MAX_SAFE_INTEGER),
      retainedLineEnergy: clamp(retainedLineEnergy / Math.max(1, curveResolution), 0, Number.MAX_SAFE_INTEGER),
      textureEnergy: clamp(textureEnergy / Math.max(1, curveResolution), 0, Number.MAX_SAFE_INTEGER),
      transientEnergy: clamp(transientEnergy / Math.max(1, curveResolution), 0, Number.MAX_SAFE_INTEGER),
      rawMaxSliceGain: ceiling.rawMaxSliceGain,
      maxSliceGain: ceiling.maxSliceGain,
      safeGainCeiling,
      gainCeilingScaleCount: ceiling.gainCeilingScaleCount,
      bandCount: bands.length,
      curveResolution,
      estimatedAutomationCurves: bands.length * 5 + 3,
      emptySliceCount,
      opposingTrackPairCount: 0,
      maxResidualSlice,
      maxRoughnessSlice,
      maxTransientDustSlice,
    },
  }, edgeBlendSlices);

  return { plan, descriptor: buildDescriptor(plan, edgeBlendSlices) };
}

export function describeCarrierIntegralSpectralWindowBodyDescriptor(
  descriptor: CarrierIntegralSpectralWindowBodyDescriptor,
): string {
  return `${descriptor.bandCount} Fensterkörper, Kontur ${descriptor.meanContourConfidence.toFixed(2)}, Feld ${descriptor.meanFieldWeight.toFixed(2)}, Loop-Kante ${descriptor.loopClosure.edgeBlendSlices} Slices zirkulär geglättet`;
}
