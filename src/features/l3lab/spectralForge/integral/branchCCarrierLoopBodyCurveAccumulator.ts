import type { SpectralForgeV2IntervalWindow } from '../rootFollow/buildV2IntervalWindowBodyPlan';
import {
  clamp01,
  clampRange,
} from './carrierLoopBodyCurveMath';
import type { CarrierLoopBodyCurveSet } from './carrierLoopBodyCurveTypes';
import {
  branchCPresenceValue,
  branchCRoughnessValue,
  branchCSampleGraphLinear,
  branchCWindowLocalPitchCents,
  branchCWindowPaintedBaselineCents,
  type BranchCCarrierLoopBodyPitchContourMode,
  type BranchCCarrierLoopBodyPitchRole,
} from './branchCCarrierLoopBodyResonanceMapping';

export const BRANCH_C_CARRIER_LOOP_BODY_CURVE_ACCUMULATOR_VERSION =
  'branch-c-carrier-loop-body-curve-accumulator-3.2.91.6.9.169';

export type BranchCCarrierLoopBodyCurveAccumulator = {
  pitchSum: Float32Array;
  pitchWeight: Float32Array;
  gainSum: Float32Array;
  gainWeight: Float32Array;
  densityCurve: Float32Array;
  roughnessCurve: Float32Array;
  presenceSum: Float32Array;
  presenceWeight: Float32Array;
};

export type BranchCWindowSampleRange = {
  startSample: number;
  endSample: number;
};

export type BranchCWindowCurveSample = {
  localRatio: number;
  energy: number;
  density: number;
  centroid: number;
  spread: number;
  pitchCents: number;
  gain: number;
  roughness: number;
  presence: number;
  weight: number;
};

export type BranchCAccumulateIntervalWindowCurvesArgs = {
  accumulator: BranchCCarrierLoopBodyCurveAccumulator;
  intervalWindow: SpectralForgeV2IntervalWindow;
  totalBeats: number;
  baseHz: number;
  pitchRole: BranchCCarrierLoopBodyPitchRole;
  pitchContourMode: BranchCCarrierLoopBodyPitchContourMode;
};

export type BranchCFinalizedCarrierLoopBodyCurves = Pick<
  CarrierLoopBodyCurveSet,
  'pitchDetuneCents' | 'gainCurve' | 'densityCurve' | 'roughnessCurve' | 'presenceCurve'
>;

export function createBranchCCarrierLoopBodyCurveAccumulator(
  length: number,
): BranchCCarrierLoopBodyCurveAccumulator {
  return {
    pitchSum: new Float32Array(length),
    pitchWeight: new Float32Array(length),
    gainSum: new Float32Array(length),
    gainWeight: new Float32Array(length),
    densityCurve: new Float32Array(length),
    roughnessCurve: new Float32Array(length),
    presenceSum: new Float32Array(length),
    presenceWeight: new Float32Array(length),
  };
}

export function branchCWindowSampleRange(args: {
  intervalWindow: SpectralForgeV2IntervalWindow;
  totalBeats: number;
  totalSamples: number;
}): BranchCWindowSampleRange {
  if (!Number.isFinite(args.totalBeats) || args.totalBeats <= 0 || args.totalSamples <= 0) {
    return { startSample: 0, endSample: 0 };
  }
  const startRatio = clamp01(args.intervalWindow.startBeat / args.totalBeats);
  const endRatio = clamp01(args.intervalWindow.endBeat / args.totalBeats);
  const startSample = Math.max(0, Math.min(args.totalSamples, Math.floor(startRatio * args.totalSamples)));
  const rawEndSample = Math.max(startSample + 1, Math.ceil(endRatio * args.totalSamples));
  const endSample = Math.max(startSample, Math.min(args.totalSamples, rawEndSample));
  return { startSample, endSample };
}

export function branchCWindowCurveSample(args: {
  intervalWindow: SpectralForgeV2IntervalWindow;
  localRatio: number;
  baseHz: number;
  pitchRole: BranchCCarrierLoopBodyPitchRole;
  pitchContourMode: BranchCCarrierLoopBodyPitchContourMode;
}): BranchCWindowCurveSample {
  const energy = clamp01(branchCSampleGraphLinear(args.intervalWindow.energyGraph, args.localRatio, 0));
  const density = clamp01(branchCSampleGraphLinear(args.intervalWindow.densityGraph, args.localRatio, 0));
  const centroid = clampRange(branchCSampleGraphLinear(args.intervalWindow.centroidGraph, args.localRatio, 0), -1, 1);
  const spread = clampRange(branchCSampleGraphLinear(args.intervalWindow.spreadGraph, args.localRatio, 0), -1, 1);
  const continuity = clamp01(args.intervalWindow.continuity);
  const paintedBaselineCents = branchCWindowPaintedBaselineCents({
    intervalWindow: args.intervalWindow,
    baseHz: args.baseHz,
    ratio: args.localRatio,
    contourMode: args.pitchContourMode,
  });
  const localPitchCents = branchCWindowLocalPitchCents({
    centroid,
    spread,
    role: args.pitchRole,
  });
  const weight = Math.max(0.0001, (0.18 + energy * 0.62 + density * 0.2) * (0.35 + continuity * 0.65));
  return {
    localRatio: clamp01(args.localRatio),
    energy,
    density,
    centroid,
    spread,
    pitchCents: paintedBaselineCents + localPitchCents,
    gain: clamp01(energy * (0.76 + continuity * 0.24)),
    roughness: branchCRoughnessValue(args.intervalWindow, spread),
    presence: branchCPresenceValue({ intervalWindow: args.intervalWindow, energy, density }),
    weight,
  };
}

export function accumulateBranchCIntervalWindowCurves(
  args: BranchCAccumulateIntervalWindowCurvesArgs,
): void {
  const totalSamples = args.accumulator.pitchSum.length;
  const { startSample, endSample } = branchCWindowSampleRange({
    intervalWindow: args.intervalWindow,
    totalBeats: args.totalBeats,
    totalSamples,
  });
  const windowSampleCount = endSample - startSample;
  if (windowSampleCount <= 0) return;
  const densityWeight = clamp01(args.intervalWindow.anchorCount / Math.max(1, args.intervalWindow.anchorCount + 8));

  for (let sampleIndex = startSample; sampleIndex < endSample; sampleIndex += 1) {
    const localRatio = windowSampleCount <= 1
      ? 0
      : (sampleIndex - startSample) / Math.max(1, windowSampleCount - 1);
    const sample = branchCWindowCurveSample({
      intervalWindow: args.intervalWindow,
      localRatio,
      baseHz: args.baseHz,
      pitchRole: args.pitchRole,
      pitchContourMode: args.pitchContourMode,
    });

    args.accumulator.pitchSum[sampleIndex] += sample.pitchCents * sample.weight;
    args.accumulator.pitchWeight[sampleIndex] += sample.weight;
    args.accumulator.gainSum[sampleIndex] += sample.gain * sample.weight;
    args.accumulator.gainWeight[sampleIndex] += sample.weight;
    args.accumulator.densityCurve[sampleIndex] = Math.max(
      args.accumulator.densityCurve[sampleIndex] ?? 0,
      clamp01(sample.density * (0.82 + densityWeight * 0.18)),
    );
    args.accumulator.roughnessCurve[sampleIndex] = Math.max(
      args.accumulator.roughnessCurve[sampleIndex] ?? 0,
      sample.roughness,
    );
    args.accumulator.presenceSum[sampleIndex] += sample.presence * sample.weight;
    args.accumulator.presenceWeight[sampleIndex] += sample.weight;
  }
}

export function finalizeBranchCCarrierLoopBodyCurveAccumulator(
  accumulator: BranchCCarrierLoopBodyCurveAccumulator,
): BranchCFinalizedCarrierLoopBodyCurves {
  const length = accumulator.pitchSum.length;
  const pitchDetuneCents = new Float32Array(length);
  const gainCurve = new Float32Array(length);
  const presenceCurve = new Float32Array(length);

  for (let index = 0; index < length; index += 1) {
    const pitchWeight = accumulator.pitchWeight[index] ?? 0;
    const gainWeight = accumulator.gainWeight[index] ?? 0;
    const presenceWeight = accumulator.presenceWeight[index] ?? 0;
    pitchDetuneCents[index] = pitchWeight > 0 ? (accumulator.pitchSum[index] ?? 0) / pitchWeight : 0;
    gainCurve[index] = gainWeight > 0 ? clamp01((accumulator.gainSum[index] ?? 0) / gainWeight) : 0;
    presenceCurve[index] = presenceWeight > 0 ? clamp01((accumulator.presenceSum[index] ?? 0) / presenceWeight) : 0;
  }

  return {
    pitchDetuneCents,
    gainCurve,
    densityCurve: accumulator.densityCurve,
    roughnessCurve: accumulator.roughnessCurve,
    presenceCurve,
  };
}
