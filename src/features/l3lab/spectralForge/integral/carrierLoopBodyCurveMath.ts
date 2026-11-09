import type {
  CarrierLoopBodyCurveLimits,
  CarrierLoopBodyCurveSafety,
  CarrierLoopBodyCurveSet,
  CarrierLoopBodyCurveStats,
  CarrierLoopBodyCurveWarning,
} from './carrierLoopBodyCurveTypes';

export const DEFAULT_CARRIER_LOOP_BODY_CURVE_LIMITS: CarrierLoopBodyCurveLimits = {
  maxPitchRangeCents: 7200,
  maxLoopEdgePitchJumpCents: 80,
  maxLoopEdgeGainJump: 0.18,
  maxLoopEdgePresenceJump: 0.22,
  edgeWindowMs: 20,
};

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function clampSigned(value: number): number {
  return Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function clampRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function hzToCents(hz: number, baseHz: number): number {
  if (!Number.isFinite(hz) || !Number.isFinite(baseHz) || hz <= 0 || baseHz <= 0) return 0;
  return 1200 * Math.log2(hz / baseHz);
}

export function centsToHz(cents: number, baseHz: number): number {
  if (!Number.isFinite(cents) || !Number.isFinite(baseHz) || baseHz <= 0) return 0;
  return baseHz * Math.pow(2, cents / 1200);
}

export function expectedCarrierLoopBodyCurveLength(durationSec: number, controlSampleRate: number): number {
  if (!Number.isFinite(durationSec) || !Number.isFinite(controlSampleRate)) return 0;
  if (durationSec <= 0 || controlSampleRate <= 0) return 0;
  return Math.max(1, Math.ceil(durationSec * controlSampleRate));
}

export function safeFloat32ArrayStats(values: Float32Array): CarrierLoopBodyCurveStats {
  if (!values.length) {
    return {
      length: 0,
      min: 0,
      max: 0,
      mean: 0,
      first: 0,
      last: 0,
      maxAbs: 0,
      containsNonFinite: false,
    };
  }

  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let maxAbs = 0;
  let containsNonFinite = false;

  for (const value of values) {
    if (!Number.isFinite(value)) {
      containsNonFinite = true;
      continue;
    }
    min = Math.min(min, value);
    max = Math.max(max, value);
    sum += value;
    maxAbs = Math.max(maxAbs, Math.abs(value));
  }

  if (min === Infinity || max === -Infinity) {
    min = 0;
    max = 0;
  }

  const first = Number.isFinite(values[0]) ? values[0] : 0;
  const last = Number.isFinite(values[values.length - 1]) ? values[values.length - 1] : 0;

  return {
    length: values.length,
    min,
    max,
    mean: sum / values.length,
    first,
    last,
    maxAbs,
    containsNonFinite,
  };
}

function averageWindow(values: Float32Array, start: number, end: number): number {
  const safeStart = Math.max(0, Math.min(values.length, start));
  const safeEnd = Math.max(safeStart, Math.min(values.length, end));
  if (safeEnd <= safeStart) return 0;
  let sum = 0;
  let count = 0;
  for (let index = safeStart; index < safeEnd; index += 1) {
    const value = values[index];
    if (!Number.isFinite(value)) continue;
    sum += value;
    count += 1;
  }
  return count > 0 ? sum / count : 0;
}

export function evaluateLoopEdgeContinuity(args: {
  pitchDetuneCents: Float32Array;
  gainCurve: Float32Array;
  presenceCurve: Float32Array;
  controlSampleRate: number;
  limits?: Partial<CarrierLoopBodyCurveLimits>;
}): Pick<CarrierLoopBodyCurveSafety, 'edgeWindowSamples' | 'pitchEdgeJumpCents' | 'gainEdgeJump' | 'presenceEdgeJump'> {
  const limits = { ...DEFAULT_CARRIER_LOOP_BODY_CURVE_LIMITS, ...(args.limits ?? {}) };
  const edgeWindowSamples = Math.max(1, Math.ceil((limits.edgeWindowMs / 1000) * Math.max(1, args.controlSampleRate)));
  const length = Math.min(args.pitchDetuneCents.length, args.gainCurve.length, args.presenceCurve.length);
  if (length <= 0) {
    return {
      edgeWindowSamples,
      pitchEdgeJumpCents: 0,
      gainEdgeJump: 0,
      presenceEdgeJump: 0,
    };
  }
  const endStart = Math.max(0, length - edgeWindowSamples);
  return {
    edgeWindowSamples,
    pitchEdgeJumpCents: Math.abs(
      averageWindow(args.pitchDetuneCents, 0, edgeWindowSamples) -
      averageWindow(args.pitchDetuneCents, endStart, length),
    ),
    gainEdgeJump: Math.abs(
      averageWindow(args.gainCurve, 0, edgeWindowSamples) -
      averageWindow(args.gainCurve, endStart, length),
    ),
    presenceEdgeJump: Math.abs(
      averageWindow(args.presenceCurve, 0, edgeWindowSamples) -
      averageWindow(args.presenceCurve, endStart, length),
    ),
  };
}

function hasOutOfRange(stats: CarrierLoopBodyCurveStats, min: number, max: number): boolean {
  if (stats.length === 0) return false;
  return stats.min < min || stats.max > max;
}

export function evaluateCarrierLoopBodyCurveSafety(
  body: Pick<CarrierLoopBodyCurveSet,
    | 'durationSec'
    | 'controlSampleRate'
    | 'baseHz'
    | 'pitchDetuneCents'
    | 'gainCurve'
    | 'densityCurve'
    | 'roughnessCurve'
    | 'presenceCurve'
  >,
  limitsOverride: Partial<CarrierLoopBodyCurveLimits> = {},
): CarrierLoopBodyCurveSafety {
  const limits = { ...DEFAULT_CARRIER_LOOP_BODY_CURVE_LIMITS, ...limitsOverride };
  const warnings = new Set<CarrierLoopBodyCurveWarning>();
  const expectedCurveLength = expectedCarrierLoopBodyCurveLength(body.durationSec, body.controlSampleRate);
  const lengths = [
    body.pitchDetuneCents.length,
    body.gainCurve.length,
    body.densityCurve.length,
    body.roughnessCurve.length,
    body.presenceCurve.length,
  ];
  const actualCurveLength = lengths[0] ?? 0;

  if (!Number.isFinite(body.durationSec) || body.durationSec <= 0) warnings.add('invalid-duration');
  if (!Number.isFinite(body.controlSampleRate) || body.controlSampleRate <= 0) warnings.add('invalid-control-sample-rate');
  if (!Number.isFinite(body.baseHz) || body.baseHz <= 0) warnings.add('invalid-base-hz');
  if (actualCurveLength <= 0) warnings.add('empty-curve');
  if (expectedCurveLength > 0 && lengths.some((length) => length !== expectedCurveLength)) warnings.add('curve-length-mismatch');
  if (lengths.some((length) => length !== actualCurveLength)) warnings.add('curve-length-mismatch');

  const pitchStats = safeFloat32ArrayStats(body.pitchDetuneCents);
  const gainStats = safeFloat32ArrayStats(body.gainCurve);
  const densityStats = safeFloat32ArrayStats(body.densityCurve);
  const roughnessStats = safeFloat32ArrayStats(body.roughnessCurve);
  const presenceStats = safeFloat32ArrayStats(body.presenceCurve);

  if ([pitchStats, gainStats, densityStats, roughnessStats, presenceStats].some((stats) => stats.containsNonFinite)) {
    warnings.add('non-finite-curve-value');
  }
  if (pitchStats.max - pitchStats.min > limits.maxPitchRangeCents) warnings.add('pitch-range-wide');
  if (hasOutOfRange(gainStats, 0, 1)) warnings.add('gain-range-out-of-bounds');
  if (hasOutOfRange(densityStats, 0, 1)) warnings.add('density-range-out-of-bounds');
  if (hasOutOfRange(roughnessStats, 0, 1)) warnings.add('roughness-range-out-of-bounds');
  if (hasOutOfRange(presenceStats, 0, 1)) warnings.add('presence-range-out-of-bounds');

  const edge = evaluateLoopEdgeContinuity({
    pitchDetuneCents: body.pitchDetuneCents,
    gainCurve: body.gainCurve,
    presenceCurve: body.presenceCurve,
    controlSampleRate: body.controlSampleRate,
    limits,
  });

  if (edge.pitchEdgeJumpCents > limits.maxLoopEdgePitchJumpCents) warnings.add('loop-edge-pitch-jump');
  if (edge.gainEdgeJump > limits.maxLoopEdgeGainJump) warnings.add('loop-edge-gain-jump');
  if (edge.presenceEdgeJump > limits.maxLoopEdgePresenceJump) warnings.add('loop-edge-presence-jump');

  const warningList = [...warnings];
  const modulationBlockingWarnings: CarrierLoopBodyCurveWarning[] = [
    'invalid-duration',
    'invalid-control-sample-rate',
    'invalid-base-hz',
    'empty-curve',
    'curve-length-mismatch',
    'non-finite-curve-value',
    'pitch-range-wide',
    'gain-range-out-of-bounds',
    'density-range-out-of-bounds',
    'roughness-range-out-of-bounds',
    'presence-range-out-of-bounds',
  ];
  const loopWarnings: CarrierLoopBodyCurveWarning[] = [
    'loop-edge-pitch-jump',
    'loop-edge-gain-jump',
    'loop-edge-presence-jump',
  ];

  return {
    loopSafe: !warningList.some((warning) => loopWarnings.includes(warning)),
    modulationSafe: !warningList.some((warning) => modulationBlockingWarnings.includes(warning)),
    warnings: warningList,
    expectedCurveLength,
    actualCurveLength,
    ...edge,
  };
}

export function withCarrierLoopBodyCurveSafety(
  body: Omit<CarrierLoopBodyCurveSet, 'loopSafe' | 'modulationSafe' | 'warnings'>,
): CarrierLoopBodyCurveSet {
  const safety = evaluateCarrierLoopBodyCurveSafety(body);
  return {
    ...body,
    loopSafe: safety.loopSafe,
    modulationSafe: safety.modulationSafe,
    warnings: safety.warnings,
  };
}
