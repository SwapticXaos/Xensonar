import {
  buildCarrierLoopBodyPreviewAuditionCacheToken,
  buildCarrierLoopBodyPreviewAuditionHookPlan,
  buildCarrierLoopBodyPreviewAuditionLifecycleMode,
  buildCarrierLoopBodyPreviewAuditionOptions,
  CARRIER_LOOP_BODY_PREVIEW_AUDITION_HOOK_VERSION,
  isCarrierLoopBodyPreviewAuditionHookEnabled,
  resolveCarrierLoopBodyPreviewAuditionRequestForMachine,
  type CarrierLoopBodyPreviewAuditionHookRequest,
} from '../src/features/l3lab/spectralForge/integral/carrierLoopBodyPreviewAuditionHook';
import {
  CARRIER_LOOP_BODY_CURVE_CONTRACT_VERSION,
  type CarrierLoopBodyCurveSet,
} from '../src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveTypes';

const checked: string[] = [];
function check(name: string, condition: boolean, detail?: unknown) {
  checked.push(name);
  if (!condition) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}

function makeCurve(length = 128, value = 0): Float32Array {
  const curve = new Float32Array(length);
  curve.fill(value);
  return curve;
}

function makeCurveBody(overrides: Partial<CarrierLoopBodyCurveSet> = {}): CarrierLoopBodyCurveSet {
  return {
    version: CARRIER_LOOP_BODY_CURVE_CONTRACT_VERSION,
    sourceIdentity: 'audition-hook|branch-c|mock-body',
    sourceKind: 'branch-c-interval-window-body-plan',
    durationSec: 2,
    controlSampleRate: 64,
    baseHz: 220,
    pitchDetuneCents: makeCurve(128, 12),
    gainCurve: makeCurve(128, 0.75),
    densityCurve: makeCurve(128, 0.35),
    roughnessCurve: makeCurve(128, 0.2),
    presenceCurve: makeCurve(128, 0.65),
    loopSafe: true,
    modulationSafe: true,
    warnings: [],
    ...overrides,
  };
}

const disabledPlan = buildCarrierLoopBodyPreviewAuditionHookPlan({
  request: null,
  curveBody: makeCurveBody(),
  supportedMachine: true,
});
check('Disabled hook reports disabled status', disabledPlan.status === 'disabled', disabledPlan);
check('Disabled hook is not enabled', isCarrierLoopBodyPreviewAuditionHookEnabled(null) === false);

const enabledRequest: CarrierLoopBodyPreviewAuditionHookRequest = {
  enabled: true,
  controlSampleRate: 1000,
  pitchRole: 'body',
  sampleRate: 12000,
  gain: 0.5,
  harmonicGain: 0.12,
  roughnessGain: 0.02,
  loopEdgeFadeMs: 4,
  renderDurationSec: 1.5,
};
check('Enabled hook remains enabled with explicit flag', isCarrierLoopBodyPreviewAuditionHookEnabled(enabledRequest) === true);

const ceciliaDefault = resolveCarrierLoopBodyPreviewAuditionRequestForMachine({
  machineId: 'branch-c-interval-body',
  request: null,
});
check('Cecilia resolves default preview request', ceciliaDefault?.enabled === true && ceciliaDefault.pitchRole === 'body', ceciliaDefault);
check('Other machines do not resolve default preview request', resolveCarrierLoopBodyPreviewAuditionRequestForMachine({
  machineId: 'branch-a-line-traffic',
  request: null,
}) === null);

const unsupported = buildCarrierLoopBodyPreviewAuditionHookPlan({
  request: enabledRequest,
  curveBody: makeCurveBody(),
  supportedMachine: false,
});
check('Unsupported machine does not become candidate-ready', unsupported.status === 'unsupported-machine', unsupported);

const missingBody = buildCarrierLoopBodyPreviewAuditionHookPlan({
  request: enabledRequest,
  curveBody: null,
  supportedMachine: true,
});
check('Missing curve body is reported without fallback claim', missingBody.status === 'missing-curve-body', missingBody);

const body = makeCurveBody();
const ready = buildCarrierLoopBodyPreviewAuditionHookPlan({
  request: enabledRequest,
  curveBody: body,
  supportedMachine: true,
});
check('Candidate-ready plan requires enabled request and curve body', ready.status === 'candidate-ready', ready);
check('Candidate-ready plan preserves source identity', ready.sourceIdentity === body.sourceIdentity, ready);
check('Candidate-ready plan remains Branch C limited', ready.sourceKind === 'branch-c-interval-window-body-plan', ready);

const options = buildCarrierLoopBodyPreviewAuditionOptions(enabledRequest);
check('Audition options forward sampleRate', options.sampleRate === 12000, options);
check('Audition options forward renderDurationSec', options.renderDurationSec === 1.5, options);
check('Audition options preserve body sonar reference default', options.referenceKind === 'body-sonar-reference', options);

const token = buildCarrierLoopBodyPreviewAuditionCacheToken({ curveBody: body, request: enabledRequest });
check('Cache token contains hook version', token.includes(CARRIER_LOOP_BODY_PREVIEW_AUDITION_HOOK_VERSION), token);
check('Cache token distinguishes source identity', token.includes(body.sourceIdentity), token);
check('Cache token distinguishes render duration', token.includes('render:1500'), token);

const renderedLifecycle = buildCarrierLoopBodyPreviewAuditionLifecycleMode({
  cacheHit: false,
  sourceKind: body.sourceKind,
});
const cachedLifecycle = buildCarrierLoopBodyPreviewAuditionLifecycleMode({
  cacheHit: true,
  sourceKind: body.sourceKind,
});
check('Lifecycle mode marks rendered candidate', renderedLifecycle.includes('rendered'), renderedLifecycle);
check('Lifecycle mode marks cached candidate', cachedLifecycle.includes('cached'), cachedLifecycle);

console.log(JSON.stringify({
  ok: true,
  checkedScenarios: checked.length,
  version: CARRIER_LOOP_BODY_PREVIEW_AUDITION_HOOK_VERSION,
}, null, 2));
