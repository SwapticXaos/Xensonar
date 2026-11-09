import {
  BRANCH_C_CARRIER_LOOP_BODY_ADAPTER_OPTIONS_VERSION,
  buildBranchCCarrierLoopBodySourceIdentity,
  resolveBranchCCarrierLoopBodyCurveAdapterOptions,
} from '../src/features/l3lab/spectralForge/integral/branchCCarrierLoopBodyAdapterOptions';
import type { SpectralForgeV2IntervalWindowBodyPlan } from '../src/features/l3lab/spectralForge/rootFollow/buildV2IntervalWindowBodyPlan';

const checked: string[] = [];
function check(name: string, condition: boolean, detail?: unknown) {
  checked.push(name);
  if (!condition) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}

const plan: SpectralForgeV2IntervalWindowBodyPlan = {
  windows: [],
  voices: [],
  summary: {
    intervalWindowCount: 0,
    intervalWindowVoiceCount: 0,
    densestWindowAnchorCount: 0,
    maxWindowDensity: 0,
    denseColumnRatio: 0,
    windowedAnchorCount: 0,
    sourceAnchorCount: 0,
  },
};

check('Adapter options version is 9.170', BRANCH_C_CARRIER_LOOP_BODY_ADAPTER_OPTIONS_VERSION.includes('3.2.91.6.9.170'));
const resolved = resolveBranchCCarrierLoopBodyCurveAdapterOptions({
  plan,
  durationSec: 2,
  totalBeats: 16,
  baseHz: 440,
  sourcePresetId: 'cecilia-options-scenario',
});
check('Default control sample rate remains 1000', resolved.controlSampleRate === 1000, resolved);
check('Default pitch role remains body', resolved.pitchRole === 'body', resolved);
check('Default contour mode remains painted-window-contour', resolved.pitchContourMode === 'painted-window-contour', resolved);
check('Resolved total samples uses duration/control rate', resolved.totalSamples === 2000, resolved);
check('Resolved identity includes source preset', resolved.sourceIdentity.includes('cecilia-options-scenario'), resolved.sourceIdentity);
check('Resolved identity includes pitch role', resolved.sourceIdentity.includes('pitch-role:body'), resolved.sourceIdentity);
check('Resolved identity includes control rate', resolved.sourceIdentity.includes('control-rate:1000.0000'), resolved.sourceIdentity);

const custom = resolveBranchCCarrierLoopBodyCurveAdapterOptions({
  plan,
  durationSec: 1.5,
  totalBeats: 12,
  baseHz: 330,
  sourcePresetId: 'cecilia-custom-options',
  controlSampleRate: 200,
  pitchRole: 'surface',
  pitchContourMode: 'static-window-centroid',
});
check('Custom control sample rate is preserved', custom.controlSampleRate === 200, custom);
check('Custom pitch role is preserved', custom.pitchRole === 'surface', custom);
check('Custom contour mode is preserved', custom.pitchContourMode === 'static-window-centroid', custom);
check('Custom total samples are deterministic', custom.totalSamples === 300, custom);
check('Custom identity distinguishes pitch role', custom.sourceIdentity.includes('pitch-role:surface'), custom.sourceIdentity);
check('Custom identity distinguishes contour mode', custom.sourceIdentity.includes('painted-contour:static-window-centroid'), custom.sourceIdentity);

const explicitIdentity = buildBranchCCarrierLoopBodySourceIdentity({
  plan,
  durationSec: 1,
  totalBeats: 4,
  baseHz: 220,
  sourcePresetId: 'ignored-because-explicit',
  sourceIdentity: 'explicit-source-identity',
});
check('Explicit source identity is never rewritten', explicitIdentity === 'explicit-source-identity', explicitIdentity);

console.log(JSON.stringify({
  ok: true,
  checkedScenarios: checked.length,
  defaultIdentity: resolved.sourceIdentity,
  customIdentity: custom.sourceIdentity,
}, null, 2));
