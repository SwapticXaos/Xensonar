import {
  CARRIER_LOOP_BODY_CURVE_CONTRACT_VERSION,
  type CarrierLoopBodyCurveSet,
} from '../src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveTypes';
import {
  centsToHz,
  clamp01,
  clampSigned,
  evaluateCarrierLoopBodyCurveSafety,
  expectedCarrierLoopBodyCurveLength,
  hzToCents,
  withCarrierLoopBodyCurveSafety,
} from '../src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveMath';
import {
  buildCarrierLoopBodyCurveReport,
  formatCarrierLoopBodyCurveReport,
} from '../src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveReport';

const checked: string[] = [];
function check(name: string, condition: boolean, detail?: unknown) {
  checked.push(name);
  if (!condition) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}

function makeCurve(length: number, map: (index: number, ratio: number) => number): Float32Array {
  const curve = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    curve[index] = map(index, length > 1 ? index / (length - 1) : 0);
  }
  return curve;
}

const durationSec = 2;
const controlSampleRate = 1000;
const length = expectedCarrierLoopBodyCurveLength(durationSec, controlSampleRate);

const validBody: CarrierLoopBodyCurveSet = withCarrierLoopBodyCurveSafety({
  version: CARRIER_LOOP_BODY_CURVE_CONTRACT_VERSION,
  sourceIdentity: 'scenario:valid-loop-body',
  sourceKind: 'branch-c-interval-window-body-plan',
  durationSec,
  controlSampleRate,
  baseHz: 440,
  pitchDetuneCents: makeCurve(length, (_index, ratio) => Math.sin(ratio * Math.PI * 2) * 180),
  gainCurve: makeCurve(length, (_index, ratio) => clamp01(0.42 + Math.sin(ratio * Math.PI * 2) * 0.08)),
  densityCurve: makeCurve(length, (_index, ratio) => clamp01(0.35 + ratio * 0.25)),
  roughnessCurve: makeCurve(length, (_index, ratio) => clamp01(0.2 + Math.abs(Math.sin(ratio * Math.PI * 2)) * 0.2)),
  presenceCurve: makeCurve(length, (_index, ratio) => clamp01(0.5 + Math.cos(ratio * Math.PI * 2) * 0.08)),
});

check('Version is 9.159 curve contract', CARRIER_LOOP_BODY_CURVE_CONTRACT_VERSION.includes('3.2.91.6.9.159'));
check('Expected curve length maps duration/control rate', length === 2000, length);
check('Hz to cents maps octave', Math.abs(hzToCents(880, 440) - 1200) < 0.0001, hzToCents(880, 440));
check('Cents to Hz maps octave', Math.abs(centsToHz(1200, 440) - 880) < 0.0001, centsToHz(1200, 440));
check('Clamp helpers stay normalized', clamp01(2) === 1 && clampSigned(-2) === -1);
check('Valid body is loop safe', validBody.loopSafe === true, validBody);
check('Valid body is modulation safe', validBody.modulationSafe === true, validBody.warnings);
check('Valid body has no warnings', validBody.warnings.length === 0, validBody.warnings);

const validReport = buildCarrierLoopBodyCurveReport(validBody);
check('Report preserves source identity', validReport.sourceIdentity === validBody.sourceIdentity, validReport.sourceIdentity);
check('Report reports curve length', validReport.curveLength === length, validReport.curveLength);
check('Report formatter is pure string output', formatCarrierLoopBodyCurveReport(validReport).includes('CarrierLoopBodyCurveReport'), formatCarrierLoopBodyCurveReport(validReport));

const invalidBody = withCarrierLoopBodyCurveSafety({
  ...validBody,
  sourceIdentity: 'scenario:invalid-loop-body',
  pitchDetuneCents: makeCurve(length, (_index, ratio) => ratio < 0.5 ? -4200 : 4200),
  gainCurve: makeCurve(length - 1, () => 1.2),
});
const invalidSafety = evaluateCarrierLoopBodyCurveSafety(invalidBody);
check('Invalid body is not modulation safe', invalidSafety.modulationSafe === false, invalidSafety);
check('Invalid body reports length mismatch', invalidSafety.warnings.includes('curve-length-mismatch'), invalidSafety.warnings);
check('Invalid body reports pitch range', invalidSafety.warnings.includes('pitch-range-wide'), invalidSafety.warnings);
check('Invalid body reports gain bounds', invalidSafety.warnings.includes('gain-range-out-of-bounds'), invalidSafety.warnings);

console.log(JSON.stringify({
  ok: true,
  checkedScenarios: checked.length,
  version: CARRIER_LOOP_BODY_CURVE_CONTRACT_VERSION,
  valid: {
    loopSafe: validBody.loopSafe,
    modulationSafe: validBody.modulationSafe,
    warnings: validBody.warnings,
  },
  invalidWarnings: invalidSafety.warnings,
}, null, 2));
