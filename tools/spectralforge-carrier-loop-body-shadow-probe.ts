import {
  CARRIER_LOOP_BODY_SHADOW_PROBE_VERSION,
  buildCarrierLoopBodyShadowProbe,
} from '../src/features/l3lab/spectralForge/integral/carrierLoopBodyShadowProbe';
import type {
  SpectralForgeV2IntervalWindow,
  SpectralForgeV2IntervalWindowBodyPlan,
} from '../src/features/l3lab/spectralForge/rootFollow/buildV2IntervalWindowBodyPlan';

const checked: string[] = [];
function check(name: string, condition: boolean, detail?: unknown) {
  checked.push(name);
  if (!condition) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}

function makeWindow(overrides: Partial<SpectralForgeV2IntervalWindow> = {}): SpectralForgeV2IntervalWindow {
  return {
    id: 'shadow-probe-window-0',
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
    energyGraph: [0.4, 0.7, 0.9],
    densityGraph: [0.2, 0.35, 0.5],
    centroidGraph: [0, 0.5, 1],
    spreadGraph: [-0.2, 0, 0.2],
    frequencyStartHz: 440,
    frequencyEndHz: 660,
    frequencyCentroidHz: 550,
    continuity: 0.85,
    roughness: 0.2,
    transientness: 0.1,
    donorPigment: {
      resonanceTint: 0.12,
      residualTint: 0.18,
      transientTint: 0.04,
      noiseColor: 0.08,
      leakRisk: 0.02,
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
      denseColumnRatio: windows.length ? 1 : 0,
      windowedAnchorCount: windows.reduce((sum, window) => sum + window.anchorCount, 0),
      sourceAnchorCount: windows.reduce((sum, window) => sum + window.anchorCount, 0),
    },
  };
}

const disabled = buildCarrierLoopBodyShadowProbe({
  enabled: false,
  plan: makePlan([makeWindow()]),
  durationSec: 2,
  totalBeats: 16,
  baseHz: 440,
  sourcePresetId: 'shadow-disabled',
});
check('Disabled probe returns null', disabled === null, disabled);

const unavailable = buildCarrierLoopBodyShadowProbe({
  enabled: true,
  plan: null,
  durationSec: 2,
  totalBeats: 16,
  baseHz: 440,
  sourcePresetId: 'shadow-unavailable',
});
check('Enabled probe reports unavailable when Branch C plan is absent', unavailable?.status === 'unavailable', unavailable);
check('Unavailable probe has no curve report', unavailable?.curveReport === null, unavailable?.curveReport);

const built = buildCarrierLoopBodyShadowProbe({
  enabled: true,
  plan: makePlan([makeWindow()]),
  durationSec: 2,
  totalBeats: 16,
  baseHz: 440,
  sourcePresetId: 'shadow-built',
  controlSampleRate: 1000,
  pitchRole: 'body',
});
check('Version is 9.161 shadow probe', CARRIER_LOOP_BODY_SHADOW_PROBE_VERSION.includes('3.2.91.6.9.161'), CARRIER_LOOP_BODY_SHADOW_PROBE_VERSION);
check('Built probe reports built status', built?.status === 'built', built?.status);
check('Built probe preserves Branch C source reading', built?.sourceReading === 'branch-c-interval-window-body-plan', built?.sourceReading);
check('Built probe does not expose curve arrays directly', built !== null && !('pitchDetuneCents' in built), Object.keys(built ?? {}));
check('Built probe contains curve report stats only', built?.curveReport?.curveLength === 2000, built?.curveReport?.curveLength);
check('Built probe formats report without console side effects', typeof built?.formattedCurveReport === 'string' && built.formattedCurveReport.includes('CarrierLoopBodyCurveReport'), built?.formattedCurveReport);
check('Built probe forwards Branch C window count', built?.intervalWindowCount === 1, built?.intervalWindowCount);
check('Built probe remains modulation-safe for scenario', built?.curveReport?.safety.modulationSafe === true, built?.curveReport?.safety);

console.log(JSON.stringify({
  ok: true,
  checkedScenarios: checked.length,
  builtStatus: built?.status,
  curveLength: built?.curveReport?.curveLength,
  message: 'CarrierLoopBody shadow probe can optionally build Branch C curve-body reports without exposing arrays, touching renderers, transfer execution or UI.',
}, null, 2));
