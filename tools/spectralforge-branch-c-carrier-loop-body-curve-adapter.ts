import {
  BRANCH_C_CARRIER_LOOP_BODY_CURVE_ADAPTER_VERSION,
  branchCWindowLocalPitchCents,
  branchCWindowPaintedBaselineCents,
  buildCarrierLoopBodyCurvesFromBranchC,
} from '../src/features/l3lab/spectralForge/integral/buildCarrierLoopBodyCurvesFromBranchC';
import type {
  SpectralForgeV2IntervalWindow,
  SpectralForgeV2IntervalWindowBodyPlan,
} from '../src/features/l3lab/spectralForge/rootFollow/buildV2IntervalWindowBodyPlan';
import { hzToCents } from '../src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveMath';

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
    id: 'mock-window-0',
    startTimeIndex: 0,
    endTimeIndex: 95,
    startBeat: 0,
    endBeat: 16,
    layer: 'body',
    anchorCount: 12,
    bindingCount: 3,
    allocationCount: 2,
    yMinBin: 12,
    yMaxBin: 42,
    yCentroidBin: 28,
    ySpread: 7,
    energyGraph: [0.5, 0.75, 1],
    densityGraph: [0.2, 0.4, 0.6],
    centroidGraph: [1, 1, 1],
    spreadGraph: [0, 0, 0],
    frequencyStartHz: 880,
    frequencyEndHz: 880,
    frequencyCentroidHz: 880,
    continuity: 1,
    roughness: 0.25,
    transientness: 0.1,
    donorPigment: {
      resonanceTint: 0.1,
      residualTint: 0.2,
      transientTint: 0,
      noiseColor: 0.3,
      leakRisk: 0,
    },
    ...overrides,
  };
}

function makePlan(windows: SpectralForgeV2IntervalWindow[]): SpectralForgeV2IntervalWindowBodyPlan {
  return {
    windows,
    voices: [],
    summary: {
      intervalWindowCount: windows.length,
      intervalWindowVoiceCount: 0,
      densestWindowAnchorCount: Math.max(0, ...windows.map((window) => window.anchorCount)),
      maxWindowDensity: 1,
      denseColumnRatio: 1,
      windowedAnchorCount: windows.reduce((sum, window) => sum + window.anchorCount, 0),
      sourceAnchorCount: windows.reduce((sum, window) => sum + window.anchorCount, 0),
    },
  };
}

const fullWindowPlan = makePlan([makeWindow()]);
const body = buildCarrierLoopBodyCurvesFromBranchC({
  plan: fullWindowPlan,
  durationSec: 2,
  totalBeats: 16,
  baseHz: 440,
  sourcePresetId: 'scenario-branch-c',
  controlSampleRate: 1000,
});

const expectedBodyPitch = hzToCents(880, 440) + branchCWindowLocalPitchCents({ centroid: 1, spread: 0, role: 'body' });
const expectedSurfacePitch = hzToCents(880, 440) + branchCWindowLocalPitchCents({ centroid: 1, spread: 0, role: 'surface' });
const midpoint = Math.floor(body.pitchDetuneCents.length / 2);

check('Version is 9.170 branch C painted contour adapter', BRANCH_C_CARRIER_LOOP_BODY_CURVE_ADAPTER_VERSION.includes('3.2.91.6.9.170'));
check('Builder emits 9.159 curve contract version', body.version.includes('3.2.91.6.9.159'), body.version);
check('Builder emits branch C source kind', body.sourceKind === 'branch-c-interval-window-body-plan', body.sourceKind);
check('Builder maps duration/control rate to curve length', body.pitchDetuneCents.length === 2000, body.pitchDetuneCents.length);
check('All output curves share length', [body.gainCurve, body.densityCurve, body.roughnessCurve, body.presenceCurve].every((curve) => curve.length === body.pitchDetuneCents.length));
check('Body role pitch uses Branch C LocalField semitone semantics', closeEnough(body.pitchDetuneCents[midpoint], expectedBodyPitch, 0.01), { actual: body.pitchDetuneCents[midpoint], expectedBodyPitch });
check('Branch C local body pitch is not flattened to 25 cents', branchCWindowLocalPitchCents({ centroid: 1, spread: 0, role: 'body' }) > 100, branchCWindowLocalPitchCents({ centroid: 1, spread: 0, role: 'body' }));
check('Gain curve is normalized', body.gainCurve.every((value) => value >= 0 && value <= 1), { min: Math.min(...body.gainCurve), max: Math.max(...body.gainCurve) });
check('Density curve is normalized', body.densityCurve.every((value) => value >= 0 && value <= 1), { min: Math.min(...body.densityCurve), max: Math.max(...body.densityCurve) });
check('Roughness curve is normalized', body.roughnessCurve.every((value) => value >= 0 && value <= 1), { min: Math.min(...body.roughnessCurve), max: Math.max(...body.roughnessCurve) });
check('Presence curve is normalized', body.presenceCurve.every((value) => value >= 0 && value <= 1), { min: Math.min(...body.presenceCurve), max: Math.max(...body.presenceCurve) });
check('Full-window scenario is modulation safe', body.modulationSafe === true, body.warnings);

const surfaceBody = buildCarrierLoopBodyCurvesFromBranchC({
  plan: fullWindowPlan,
  durationSec: 2,
  totalBeats: 16,
  baseHz: 440,
  sourcePresetId: 'scenario-branch-c-surface',
  controlSampleRate: 1000,
  pitchRole: 'surface',
});
check('Surface pitch role keeps stronger Branch C role scale', closeEnough(surfaceBody.pitchDetuneCents[midpoint], expectedSurfacePitch, 0.01), { actual: surfaceBody.pitchDetuneCents[midpoint], expectedSurfacePitch });
check('Surface role has stronger local pitch than body role', surfaceBody.pitchDetuneCents[midpoint] > body.pitchDetuneCents[midpoint], { surface: surfaceBody.pitchDetuneCents[midpoint], body: body.pitchDetuneCents[midpoint] });

const halfWindowBody = buildCarrierLoopBodyCurvesFromBranchC({
  plan: makePlan([makeWindow({ startBeat: 4, endBeat: 8, frequencyCentroidHz: 660, frequencyStartHz: 660, frequencyEndHz: 660 })]),
  durationSec: 4,
  totalBeats: 16,
  baseHz: 440,
  sourcePresetId: 'scenario-branch-c-window-placement',
  controlSampleRate: 100,
});
check('Beat window leaves pre-window samples at rest', halfWindowBody.gainCurve[0] === 0, halfWindowBody.gainCurve[0]);
check('Beat window writes expected middle-region samples', (halfWindowBody.gainCurve[150] ?? 0) > 0, halfWindowBody.gainCurve[150]);
check('Beat window leaves post-window samples at rest', halfWindowBody.gainCurve[300] === 0, halfWindowBody.gainCurve[300]);

const overlapBody = buildCarrierLoopBodyCurvesFromBranchC({
  plan: makePlan([
    makeWindow({ id: 'low', startBeat: 0, endBeat: 16, frequencyCentroidHz: 440, frequencyStartHz: 440, frequencyEndHz: 440, energyGraph: [0.3], densityGraph: [0.3], centroidGraph: [0], spreadGraph: [0], continuity: 1 }),
    makeWindow({ id: 'high', startBeat: 0, endBeat: 16, frequencyCentroidHz: 880, frequencyStartHz: 880, frequencyEndHz: 880, energyGraph: [0.9], densityGraph: [0.7], centroidGraph: [0], spreadGraph: [0], continuity: 1 }),
  ]),
  durationSec: 1,
  totalBeats: 16,
  baseHz: 440,
  sourcePresetId: 'scenario-branch-c-defensive-overlap',
  controlSampleRate: 100,
});
check('Defensive overlap weighting does not depend on last-window overwrite', overlapBody.pitchDetuneCents[50] > 800 && overlapBody.pitchDetuneCents[50] < 1200, overlapBody.pitchDetuneCents[50]);
check('Overlap output remains modulation safe', overlapBody.modulationSafe === true, overlapBody.warnings);


const glissWindow = makeWindow({
  id: 'gliss-painted-contour',
  startBeat: 0,
  endBeat: 16,
  frequencyStartHz: 440,
  frequencyCentroidHz: Math.sqrt(440 * 880),
  frequencyEndHz: 880,
  energyGraph: [1, 1, 1],
  densityGraph: [0.5, 0.5, 0.5],
  centroidGraph: [0, 0, 0],
  spreadGraph: [0, 0, 0],
});
const glissBody = buildCarrierLoopBodyCurvesFromBranchC({
  plan: makePlan([glissWindow]),
  durationSec: 2,
  totalBeats: 16,
  baseHz: 440,
  sourcePresetId: 'scenario-branch-c-painted-contour',
  controlSampleRate: 1000,
});
const glissStaticBody = buildCarrierLoopBodyCurvesFromBranchC({
  plan: makePlan([glissWindow]),
  durationSec: 2,
  totalBeats: 16,
  baseHz: 440,
  sourcePresetId: 'scenario-branch-c-static-contour',
  controlSampleRate: 1000,
  pitchContourMode: 'static-window-centroid',
});
check('Painted contour baseline starts near window start frequency', glissBody.pitchDetuneCents[0] < glissBody.pitchDetuneCents[glissBody.pitchDetuneCents.length - 1], { start: glissBody.pitchDetuneCents[0], end: glissBody.pitchDetuneCents[glissBody.pitchDetuneCents.length - 1] });
check('Painted contour mode preserves window start-to-end pitch motion', (glissBody.pitchDetuneCents[glissBody.pitchDetuneCents.length - 1] - glissBody.pitchDetuneCents[0]) > 900, { start: glissBody.pitchDetuneCents[0], end: glissBody.pitchDetuneCents[glissBody.pitchDetuneCents.length - 1] });
check('Static centroid mode keeps previous window-centroid behaviour', Math.abs(glissStaticBody.pitchDetuneCents[0] - glissStaticBody.pitchDetuneCents[glissStaticBody.pitchDetuneCents.length - 1]) < 1, { start: glissStaticBody.pitchDetuneCents[0], end: glissStaticBody.pitchDetuneCents[glissStaticBody.pitchDetuneCents.length - 1] });
check('Painted baseline helper follows quadratic start-centroid-end contour', closeEnough(
  branchCWindowPaintedBaselineCents({ intervalWindow: glissWindow, baseHz: 440, ratio: 0.5 }),
  600,
  0.01,
), branchCWindowPaintedBaselineCents({ intervalWindow: glissWindow, baseHz: 440, ratio: 0.5 }));

console.log(JSON.stringify({
  ok: true,
  checkedScenarios: checked.length,
  bodyPitchCents: body.pitchDetuneCents[midpoint],
  surfacePitchCents: surfaceBody.pitchDetuneCents[midpoint],
  branchCLocalBodyCents: branchCWindowLocalPitchCents({ centroid: 1, spread: 0, role: 'body' }),
  paintedContourPitchSpan: glissBody.pitchDetuneCents[glissBody.pitchDetuneCents.length - 1] - glissBody.pitchDetuneCents[0],
}, null, 2));
