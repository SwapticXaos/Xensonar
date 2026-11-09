export const CARRIER_LOOP_BODY_CURVE_CONTRACT_VERSION =
  'carrier-loop-body-curve-contract-3.2.91.6.9.159';

export type CarrierLoopBodyCurveRole =
  | 'pitch-detune-cents'
  | 'gain'
  | 'density'
  | 'roughness'
  | 'presence';

export type CarrierLoopBodyCurveSourceKind =
  | 'contract-only'
  | 'branch-c-interval-window-body-plan'
  | 'branch-b573-synth-window-body-plan'
  | 'branch-a-line-traffic-plan'
  | 'donatello-formant-plan'
  | 'rendered-material-body'
  | 'raw-material-body';

export type CarrierLoopBodyCurveWarning =
  | 'invalid-duration'
  | 'invalid-control-sample-rate'
  | 'invalid-base-hz'
  | 'empty-curve'
  | 'curve-length-mismatch'
  | 'non-finite-curve-value'
  | 'pitch-range-wide'
  | 'gain-range-out-of-bounds'
  | 'density-range-out-of-bounds'
  | 'roughness-range-out-of-bounds'
  | 'presence-range-out-of-bounds'
  | 'loop-edge-pitch-jump'
  | 'loop-edge-gain-jump'
  | 'loop-edge-presence-jump';

export type CarrierLoopBodyCurveLimits = {
  maxPitchRangeCents: number;
  maxLoopEdgePitchJumpCents: number;
  maxLoopEdgeGainJump: number;
  maxLoopEdgePresenceJump: number;
  edgeWindowMs: number;
};

export type CarrierLoopBodyCurveStats = {
  length: number;
  min: number;
  max: number;
  mean: number;
  first: number;
  last: number;
  maxAbs: number;
  containsNonFinite: boolean;
};

export type CarrierLoopBodyCurveSafety = {
  loopSafe: boolean;
  modulationSafe: boolean;
  warnings: CarrierLoopBodyCurveWarning[];
  expectedCurveLength: number;
  actualCurveLength: number;
  edgeWindowSamples: number;
  pitchEdgeJumpCents: number;
  gainEdgeJump: number;
  presenceEdgeJump: number;
};

export type CarrierLoopBodyBertPrismLaneRole = 'body-core' | 'spectral-surface' | 'residual-skin' | 'transient-articulation';

export type CarrierLoopBodyBertPrismLane = {
  id: string;
  role: CarrierLoopBodyBertPrismLaneRole;
  s: number;
  e: number;
  sc: number;
  ec: number;
  cc: number;
  g: number;
  r: number;
  t: number;
  l: number;
  eg: number[];
  dg: number[];
  cg: number[];
  sg: number[];
pg?: number[];
};

export type CarrierLoopBodyCurveSet = {
  version: typeof CARRIER_LOOP_BODY_CURVE_CONTRACT_VERSION;
  sourceIdentity: string;
  sourceKind: CarrierLoopBodyCurveSourceKind;
  durationSec: number;
  controlSampleRate: number;
  baseHz: number;
  pitchDetuneCents: Float32Array;
  gainCurve: Float32Array;
  densityCurve: Float32Array;
  roughnessCurve: Float32Array;
  presenceCurve: Float32Array;
  bl?: CarrierLoopBodyBertPrismLane[];
  loopSafe: boolean;
  modulationSafe: boolean;
  warnings: CarrierLoopBodyCurveWarning[];
};

export type CarrierLoopBodyCurveReport = {
  version: typeof CARRIER_LOOP_BODY_CURVE_CONTRACT_VERSION;
  sourceIdentity: string;
  sourceKind: CarrierLoopBodyCurveSourceKind;
  durationSec: number;
  controlSampleRate: number;
  baseHz: number;
  curveLength: number;
  pitchDetuneCents: CarrierLoopBodyCurveStats;
  gainCurve: CarrierLoopBodyCurveStats;
  densityCurve: CarrierLoopBodyCurveStats;
  roughnessCurve: CarrierLoopBodyCurveStats;
  presenceCurve: CarrierLoopBodyCurveStats;
  safety: CarrierLoopBodyCurveSafety;
};
