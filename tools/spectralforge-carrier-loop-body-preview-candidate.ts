import {
  CARRIER_LOOP_BODY_PREVIEW_CANDIDATE_VERSION,
  renderCarrierLoopBodyPreviewSamples,
} from '../src/features/l3lab/spectralForge/integral/carrierLoopBodyPreviewBuffer';
import {
  CARRIER_LOOP_BODY_CURVE_CONTRACT_VERSION,
  type CarrierLoopBodyCurveSet,
} from '../src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveTypes';

const checked: string[] = [];
function check(name: string, condition: boolean, detail?: unknown) {
  checked.push(name);
  if (!condition) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}

function makeRamp(length: number, mapper: (index: number, ratio: number) => number): Float32Array {
  const values = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    const ratio = length <= 1 ? 0 : index / (length - 1);
    values[index] = mapper(index, ratio);
  }
  return values;
}

function makeCurveBody(overrides: Partial<CarrierLoopBodyCurveSet> = {}): CarrierLoopBodyCurveSet {
  const length = 1000;
  return {
    version: CARRIER_LOOP_BODY_CURVE_CONTRACT_VERSION,
    sourceIdentity: 'preview-candidate-scenario|branch-c|mock',
    sourceKind: 'branch-c-interval-window-body-plan',
    durationSec: 1,
    controlSampleRate: 1000,
    baseHz: 220,
    pitchDetuneCents: makeRamp(length, (_index, ratio) => -120 + ratio * 240),
    gainCurve: makeRamp(length, (_index, ratio) => 0.25 + Math.sin(ratio * Math.PI) * 0.65),
    densityCurve: makeRamp(length, (_index, ratio) => 0.2 + ratio * 0.6),
    roughnessCurve: makeRamp(length, (_index, ratio) => 0.1 + ratio * 0.4),
    presenceCurve: makeRamp(length, (_index, ratio) => 0.2 + Math.sin(ratio * Math.PI) * 0.7),
    loopSafe: false,
    modulationSafe: true,
    warnings: ['loop-edge-pitch-jump'],
    ...overrides,
  };
}

const body = makeCurveBody();
const rendered = renderCarrierLoopBodyPreviewSamples(body, {
  sampleRate: 12000,
  gain: 0.5,
  loopEdgeFadeMs: 5,
});

check('Version is 9.162 preview candidate', CARRIER_LOOP_BODY_PREVIEW_CANDIDATE_VERSION.includes('3.2.91.6.9.162'), CARRIER_LOOP_BODY_PREVIEW_CANDIDATE_VERSION);
check('Renderer preserves source identity', rendered.sourceIdentity === body.sourceIdentity, rendered.sourceIdentity);
check('Renderer preserves source kind', rendered.sourceKind === body.sourceKind, rendered.sourceKind);
check('Renderer emits body sonar reference kind', rendered.referenceKind === 'body-sonar-reference', rendered.referenceKind);
check('Renderer maps duration and sample rate to sample count', rendered.channelData.length === 12000, rendered.stats);
check('Renderer emits finite samples', rendered.stats.containsNonFinite === false, rendered.stats);
check('Renderer emits audible non-zero RMS', rendered.stats.rms > 0.01, rendered.stats);
check('Renderer remains soft-limited', rendered.stats.peak <= 1, rendered.stats);
check('Renderer applies loop-edge fade at beginning', Math.abs(rendered.channelData[0] ?? 1) < 0.000001, rendered.channelData[0]);
check('Renderer applies loop-edge fade at end', Math.abs(rendered.channelData[rendered.channelData.length - 1] ?? 1) < 0.0005, rendered.channelData[rendered.channelData.length - 1]);

const silent = renderCarrierLoopBodyPreviewSamples(makeCurveBody({
  gainCurve: new Float32Array(1000),
  presenceCurve: new Float32Array(1000),
}), { sampleRate: 8000 });
check('Zero gain curve stays silent', silent.stats.peak === 0, silent.stats);

const highPitch = renderCarrierLoopBodyPreviewSamples(makeCurveBody({
  baseHz: 880,
  pitchDetuneCents: makeRamp(1000, () => 1200),
}), { sampleRate: 16000, roughnessGain: 0 });
check('High pitch candidate still renders finite samples', highPitch.stats.containsNonFinite === false, highPitch.stats);
check('High pitch candidate remains bounded', highPitch.stats.peak <= 1, highPitch.stats);

console.log(JSON.stringify({
  ok: true,
  checkedScenarios: checked.length,
  renderedSampleCount: rendered.channelData.length,
  rms: rendered.stats.rms,
  peak: rendered.stats.peak,
}, null, 2));
