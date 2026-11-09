import {
  BRANCH_C_CARRIER_LOOP_BODY_CURVE_ACCUMULATOR_VERSION,
  accumulateBranchCIntervalWindowCurves,
  branchCWindowCurveSample,
  branchCWindowSampleRange,
  createBranchCCarrierLoopBodyCurveAccumulator,
  finalizeBranchCCarrierLoopBodyCurveAccumulator,
} from '../src/features/l3lab/spectralForge/integral/branchCCarrierLoopBodyCurveAccumulator';
import type { SpectralForgeV2IntervalWindow } from '../src/features/l3lab/spectralForge/rootFollow/buildV2IntervalWindowBodyPlan';

const checked: string[] = [];
function check(name: string, condition: boolean, detail?: unknown) {
  checked.push(name);
  if (!condition) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}
function closeEnough(actual: number, expected: number, tolerance = 0.001) {
  return Math.abs(actual - expected) <= tolerance;
}
function makeWindow(overrides: Partial<SpectralForgeV2IntervalWindow> = {}): SpectralForgeV2IntervalWindow {
  return {
    id: 'accumulator-window',
    startTimeIndex: 0,
    endTimeIndex: 95,
    startBeat: 4,
    endBeat: 8,
    layer: 'body',
    anchorCount: 16,
    bindingCount: 4,
    allocationCount: 2,
    yMinBin: 12,
    yMaxBin: 42,
    yCentroidBin: 28,
    ySpread: 7,
    energyGraph: [0.25, 0.5, 1],
    densityGraph: [0.1, 0.3, 0.7],
    centroidGraph: [-1, 0, 1],
    spreadGraph: [-1, 0, 1],
    frequencyStartHz: 440,
    frequencyEndHz: 880,
    frequencyCentroidHz: Math.sqrt(440 * 880),
    continuity: 0.75,
    roughness: 0.25,
    transientness: 0.2,
    donorPigment: {
      resonanceTint: 0.2,
      residualTint: 0.3,
      transientTint: 0.1,
      noiseColor: 0.4,
      leakRisk: 0.1,
    },
    ...overrides,
  };
}

check('Accumulator version is 9.169', BRANCH_C_CARRIER_LOOP_BODY_CURVE_ACCUMULATOR_VERSION.includes('3.2.91.6.9.169'));
const accumulator = createBranchCCarrierLoopBodyCurveAccumulator(1600);
check('Accumulator has equal curve lengths', accumulator.pitchSum.length === 1600 && accumulator.gainSum.length === 1600 && accumulator.presenceSum.length === 1600);
const window = makeWindow();
const range = branchCWindowSampleRange({ intervalWindow: window, totalBeats: 16, totalSamples: 1600 });
check('Window range maps beats to global samples', range.startSample === 400 && range.endSample === 800, range);
const sample = branchCWindowCurveSample({
  intervalWindow: window,
  localRatio: 0.5,
  baseHz: 440,
  pitchRole: 'body',
  pitchContourMode: 'painted-window-contour',
});
check('Curve sample clamps energy into 0..1', sample.energy >= 0 && sample.energy <= 1, sample.energy);
check('Curve sample keeps density into 0..1', sample.density >= 0 && sample.density <= 1, sample.density);
check('Curve sample creates finite pitch cents', Number.isFinite(sample.pitchCents), sample.pitchCents);
check('Curve sample keeps roughness into 0..1', sample.roughness >= 0 && sample.roughness <= 1, sample.roughness);
check('Curve sample keeps presence into 0..1', sample.presence >= 0 && sample.presence <= 1, sample.presence);
check('Curve sample has positive accumulation weight', sample.weight > 0, sample.weight);

accumulateBranchCIntervalWindowCurves({
  accumulator,
  intervalWindow: window,
  totalBeats: 16,
  baseHz: 440,
  pitchRole: 'body',
  pitchContourMode: 'painted-window-contour',
});
check('Accumulator leaves samples before window empty', closeEnough(accumulator.gainWeight[399] ?? 0, 0), accumulator.gainWeight[399]);
check('Accumulator writes samples inside window', (accumulator.gainWeight[500] ?? 0) > 0, accumulator.gainWeight[500]);
check('Accumulator leaves samples after window empty', closeEnough(accumulator.gainWeight[801] ?? 0, 0), accumulator.gainWeight[801]);

const overlapWindow = makeWindow({
  id: 'overlap-window',
  startBeat: 6,
  endBeat: 10,
  frequencyStartHz: 660,
  frequencyCentroidHz: 720,
  frequencyEndHz: 760,
  energyGraph: [1, 1, 1],
  densityGraph: [0.9, 0.9, 0.9],
  centroidGraph: [1, 1, 1],
  spreadGraph: [0, 0, 0],
  continuity: 1,
});
accumulateBranchCIntervalWindowCurves({
  accumulator,
  intervalWindow: overlapWindow,
  totalBeats: 16,
  baseHz: 440,
  pitchRole: 'body',
  pitchContourMode: 'painted-window-contour',
});
check('Defensive overlap weighting adds pitch weights rather than overwriting', (accumulator.pitchWeight[650] ?? 0) > (accumulator.pitchWeight[500] ?? 0), { overlap: accumulator.pitchWeight[650], single: accumulator.pitchWeight[500] });
const finalized = finalizeBranchCCarrierLoopBodyCurveAccumulator(accumulator);
check('Finalized pitch curve is finite in overlap region', Number.isFinite(finalized.pitchDetuneCents[650]), finalized.pitchDetuneCents[650]);
check('Finalized gain curve clamps into 0..1', (finalized.gainCurve[650] ?? 0) >= 0 && (finalized.gainCurve[650] ?? 0) <= 1, finalized.gainCurve[650]);
check('Finalized density curve preserves max-density gesture', (finalized.densityCurve[650] ?? 0) > 0.75, finalized.densityCurve[650]);
check('Finalized roughness curve remains normalized', (finalized.roughnessCurve[650] ?? 0) >= 0 && (finalized.roughnessCurve[650] ?? 0) <= 1, finalized.roughnessCurve[650]);
check('Finalized presence curve remains normalized', (finalized.presenceCurve[650] ?? 0) >= 0 && (finalized.presenceCurve[650] ?? 0) <= 1, finalized.presenceCurve[650]);

const invalidRange = branchCWindowSampleRange({ intervalWindow: window, totalBeats: 0, totalSamples: 1600 });
check('Invalid totalBeats produces empty range', invalidRange.startSample === 0 && invalidRange.endSample === 0, invalidRange);

console.log(JSON.stringify({
  ok: true,
  checkedScenarios: checked.length,
  range,
  overlapPitchWeight: accumulator.pitchWeight[650],
  overlapPitchCents: finalized.pitchDetuneCents[650],
  overlapGain: finalized.gainCurve[650],
}, null, 2));
