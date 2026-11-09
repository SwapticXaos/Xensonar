import type { CarrierSpectralSkeleton } from '../types/carrierDonorV2Types';
import type {
  DonatelloFormantBandPlan,
  DonatelloFormantPlanBuildOptions,
  DonatelloFormantRenderPlan,
} from './donatelloFormantTypes';
import { DONATELLO_FORMANT_PLAN_SCHEMA_VERSION } from './donatelloFormantTypes';
import {
  DONATELLO_FORMANT_ENGINE_LIMITS,
  DONATELLO_FORMANT_PLAN_DEFAULT_MAX_BANDS,
  DONATELLO_FORMANT_PLAN_DEFAULT_RESOLUTION,
  DONATELLO_FORMANT_PLAN_DEFAULT_SAFE_GAIN_CEILING,
} from './donatelloFormantDefaults';
import { clampCurve, clampNumber, interpolateMissingLinear, makeFilledCurve } from '../../../../core/math/curveMath';
import type { DonatelloContourPoint, DonatelloContourTraceResult, DonatelloContourTrack } from './donatelloContourTracer';
import { traceDonatelloContours } from './donatelloContourTracer';

function pointToSliceIndex(point: DonatelloContourPoint, curveResolution: number) {
  return Math.max(0, Math.min(curveResolution - 1, point.sliceIndex));
}

function buildBandFromTrack(args: {
  track: DonatelloContourTrack;
  index: number;
  curveResolution: number;
  rootReferenceHz: number;
}): DonatelloFormantBandPlan {
  const center: Array<number | null> = makeFilledCurve(args.curveResolution, 0).map(() => null);
  const bandwidth: Array<number | null> = makeFilledCurve(args.curveResolution, 0).map(() => null);
  const gain = makeFilledCurve(args.curveResolution);
  const confidence = makeFilledCurve(args.curveResolution);
  const roughness = makeFilledCurve(args.curveResolution);
  for (const point of args.track.points) {
    const slice = pointToSliceIndex(point, args.curveResolution);
    const centerRatio = clampNumber(point.centerHz / Math.max(1, args.rootReferenceHz), 0.0625, 64);
    const bandwidthRatio = clampNumber(point.widthHz / Math.max(1, args.rootReferenceHz), 0.0025, 12);
    const contourBoost = point.sharedCrossing ? 0.82 : 1;
    center[slice] = centerRatio;
    bandwidth[slice] = bandwidthRatio;
    gain[slice] = Math.max(gain[slice] ?? 0, clampNumber(Math.sqrt(Math.max(0, point.energy)) * contourBoost, 0, 1));
    confidence[slice] = Math.max(confidence[slice] ?? 0, clampNumber(point.confidence, 0, 1));
    roughness[slice] = Math.max(roughness[slice] ?? 0, clampNumber(point.roughness, 0, 1));
  }
  return {
    id: `donatello-formant-band-${args.index + 1}`,
    role: args.track.role,
    centerRatioCurve: interpolateMissingLinear(center, 1).map((value) => clampNumber(value, 0.0625, 64)),
    bandwidthRatioCurve: interpolateMissingLinear(bandwidth, 0.04).map((value) => clampNumber(value, 0.0025, 12)),
    gainCurve: clampCurve(gain, 0, 1),
    confidenceCurve: clampCurve(confidence, 0, 1),
    roughnessCurve: clampCurve(roughness, 0, 1),
  };
}

function scaleGainCeiling(bands: DonatelloFormantBandPlan[], safeGainCeiling: number) {
  const curveResolution = bands[0]?.gainCurve.length ?? 0;
  let rawMaxSliceGain = 0;
  let gainCeilingScaleCount = 0;
  for (let slice = 0; slice < curveResolution; slice += 1) {
    const sum = bands.reduce((total, band) => total + Math.max(0, band.gainCurve[slice] ?? 0), 0);
    rawMaxSliceGain = Math.max(rawMaxSliceGain, sum);
    if (sum <= safeGainCeiling || sum <= 0) continue;
    const scale = safeGainCeiling / sum;
    gainCeilingScaleCount += 1;
    for (const band of bands) band.gainCurve[slice] = Math.max(0, (band.gainCurve[slice] ?? 0) * scale);
  }
  const normalizedMaxSliceGain = bands.length
    ? Math.max(...new Array(curveResolution).fill(0).map((_, slice) => bands.reduce((sum, band) => sum + (band.gainCurve[slice] ?? 0), 0)))
    : 0;
  return { rawMaxSliceGain: clampNumber(rawMaxSliceGain, 0, Number.MAX_SAFE_INTEGER), normalizedMaxSliceGain: clampNumber(normalizedMaxSliceGain, 0, 1), gainCeilingScaleCount };
}

function mergeTraceTextureCurves(trace: DonatelloContourTraceResult, curveResolution: number) {
  return {
    roughnessCurve: makeFilledCurve(curveResolution).map((_, index) => clampNumber(trace.roughnessCurve[index] ?? 0, 0, 1)),
    transientDustCurve: makeFilledCurve(curveResolution).map((_, index) => clampNumber(trace.transientDustCurve[index] ?? 0, 0, 1)),
    residualEnergyCurve: makeFilledCurve(curveResolution).map((_, index) => clampNumber(trace.residualEnergyCurve[index] ?? 0, 0, 1)),
  };
}

export function buildDonatelloFormantPlan(
  skeleton: CarrierSpectralSkeleton,
  options: DonatelloFormantPlanBuildOptions = {},
): DonatelloFormantRenderPlan {
  const curveResolution = Math.max(DONATELLO_FORMANT_ENGINE_LIMITS.minCurveResolution, Math.round(options.curveResolution ?? DONATELLO_FORMANT_PLAN_DEFAULT_RESOLUTION));
  const maxBands = Math.max(1, Math.min(DONATELLO_FORMANT_ENGINE_LIMITS.maxBandCount, Math.round(options.maxBands ?? DONATELLO_FORMANT_PLAN_DEFAULT_MAX_BANDS)));
  const safeGainCeiling = clampNumber(options.safeGainCeiling ?? DONATELLO_FORMANT_PLAN_DEFAULT_SAFE_GAIN_CEILING, DONATELLO_FORMANT_ENGINE_LIMITS.minSafeGainCeiling, DONATELLO_FORMANT_ENGINE_LIMITS.maxSafeGainCeiling);
  const rootReferenceHz = Math.max(1, options.rootReferenceHz ?? 220);
  const durationBeats = Math.max(0.125, options.durationBeats ?? 4);
  const minEnergy = Math.max(0, options.minEnergy ?? 0.035);

  const contourTrace = traceDonatelloContours(skeleton, { curveResolution, maxTracks: maxBands, minEnergy });
  const planBands = contourTrace.tracks
    .slice(0, maxBands)
    .map((track, index) => buildBandFromTrack({ track, index, curveResolution, rootReferenceHz }));
  const gainCeilingReport = scaleGainCeiling(planBands, safeGainCeiling);
  const textureCurves = mergeTraceTextureCurves(contourTrace, curveResolution);

  const perSliceMax = gainCeilingReport.normalizedMaxSliceGain;
  const emptySliceCount = new Array(curveResolution).fill(0).filter((_, slice) => planBands.every((band) => (band.gainCurve[slice] ?? 0) <= 0.0005)).length;

  return {
    schemaVersion: DONATELLO_FORMANT_PLAN_SCHEMA_VERSION,
    machineId: options.machineId ?? 'donatello-formant-window-body',
    curveResolution,
    maxBands,
    rootReferenceHz,
    durationBeats,
    bands: planBands,
    roughnessCurve: textureCurves.roughnessCurve,
    transientDustCurve: textureCurves.transientDustCurve,
    residualEnergyCurve: textureCurves.residualEnergyCurve,
    summary: {
      inputEnergy: contourTrace.summary.capturedLineEnergy + contourTrace.summary.residualEnergy + contourTrace.summary.transientEnergy,
      retainedLineEnergy: contourTrace.summary.capturedLineEnergy,
      textureEnergy: contourTrace.summary.roughnessEnergy + contourTrace.summary.residualEnergy,
      transientEnergy: contourTrace.summary.transientEnergy,
      rawMaxSliceGain: gainCeilingReport.rawMaxSliceGain,
      maxSliceGain: clampNumber(perSliceMax, 0, 1),
      safeGainCeiling,
      gainCeilingScaleCount: gainCeilingReport.gainCeilingScaleCount,
      bandCount: planBands.length,
      curveResolution,
      estimatedAutomationCurves: planBands.length * 3 + 3,
      emptySliceCount,
      opposingTrackPairCount: contourTrace.summary.opposingTrackPairCount,
      maxResidualSlice: contourTrace.summary.maxResidualSlice,
      maxRoughnessSlice: contourTrace.summary.maxRoughnessSlice,
      maxTransientDustSlice: contourTrace.summary.maxTransientDustSlice,
    },
  };
}
