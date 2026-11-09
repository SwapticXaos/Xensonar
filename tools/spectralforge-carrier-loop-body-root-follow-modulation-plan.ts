import {
  buildCarrierLoopBodyRootFollowModulationPlan,
  isCarrierLoopBodyRootFollowModulationPlanReady,
} from '../src/features/l3lab/spectralForge/integral/carrierLoopBodyRootFollowModulationPlan';
import {
  CARRIER_LOOP_BODY_CURVE_CONTRACT_VERSION,
  type CarrierLoopBodyCurveSet,
} from '../src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveTypes';

type Assertion = { label: string; ok: boolean };
const assertions: Assertion[] = [];
function assert(label: string, ok: boolean) {
  assertions.push({ label, ok });
  if (!ok) throw new Error(label);
}

function makeBody(overrides: Partial<CarrierLoopBodyCurveSet> = {}): CarrierLoopBodyCurveSet {
  const pitch = new Float32Array([0, 100, -80, 40]);
  const gain = new Float32Array([0.1, 0.7, 0.6, 0.2]);
  const density = new Float32Array([0.2, 0.4, 0.8, 0.3]);
  const roughness = new Float32Array([0.1, 0.2, 0.4, 0.1]);
  const presence = new Float32Array([0.1, 0.8, 0.7, 0.2]);
  return {
    version: CARRIER_LOOP_BODY_CURVE_CONTRACT_VERSION,
    sourceIdentity: 'test-branch-c-painted-carrier',
    sourceKind: 'branch-c-interval-window-body-plan',
    durationSec: 2,
    controlSampleRate: 2,
    baseHz: 220,
    pitchDetuneCents: pitch,
    gainCurve: gain,
    densityCurve: density,
    roughnessCurve: roughness,
    presenceCurve: presence,
    loopSafe: true,
    modulationSafe: true,
    warnings: [],
    ...overrides,
  };
}

const plan = buildCarrierLoopBodyRootFollowModulationPlan(makeBody());
assert('Plan preserves source identity', plan.sourceIdentity === 'test-branch-c-painted-carrier');
assert('Plan keeps Branch-C curve source', plan.sourceKind === 'branch-c-interval-window-body-plan');
assert('Plan uses live root anchor policy', plan.anchorPolicy === 'live-root-frequency-anchor');
assert('Pitch is applied as detune over live root', plan.pitchApplication === 'detune-cents-over-live-root');
assert('Plan keeps pitch unquantized', plan.keepsPitchUnquantized === true);
assert('Plan allows live Root Follow base modulation', plan.allowsLiveRootFollowBaseModulation === true);
assert('Plan is shadow-only, not runtime attached', plan.runtimeAttached === false && plan.renderReady === false);
assert('Plan is ready for safe body', plan.readiness === 'ready-for-shadow-root-follow-modulation');
assert('Ready helper accepts safe shadow plan', isCarrierLoopBodyRootFollowModulationPlanReady(plan) === true);
assert('Pitch axis targets RootFollow detune', plan.axes.some((axis) => axis.id === 'pitch-detune-cents' && axis.mutableByLiveRootFollow));
assert('Gain axis targets dynamic body', plan.axes.some((axis) => axis.id === 'gain' && axis.target.includes('dynamic')));
assert('Density remains hint-only', plan.densityApplication === 'density-hint-only');
assert('Pitch range is measured', plan.diagnostics.pitchRangeCents === 180);

const unsafePlan = buildCarrierLoopBodyRootFollowModulationPlan(makeBody({ modulationSafe: false, warnings: ['pitch-range-wide'] }));
assert('Unsafe body does not become ready', unsafePlan.readiness === 'curve-body-unsafe');
assert('Ready helper rejects unsafe body', isCarrierLoopBodyRootFollowModulationPlanReady(unsafePlan) === false);
assert('Warnings are preserved', unsafePlan.warnings.includes('pitch-range-wide'));

const emptyPlan = buildCarrierLoopBodyRootFollowModulationPlan(makeBody({
  durationSec: 0,
  pitchDetuneCents: new Float32Array(),
  gainCurve: new Float32Array(),
  densityCurve: new Float32Array(),
  roughnessCurve: new Float32Array(),
  presenceCurve: new Float32Array(),
}));
assert('Empty body reports invalid readiness', emptyPlan.readiness === 'empty-or-invalid-curve-body');
assert('Ready helper rejects empty body', isCarrierLoopBodyRootFollowModulationPlanReady(emptyPlan) === false);

process.stdout.write(JSON.stringify({ ok: true, checkedScenarios: assertions.length }, null, 2));
