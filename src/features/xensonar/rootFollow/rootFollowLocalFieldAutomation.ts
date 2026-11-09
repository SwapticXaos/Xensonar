import { scheduleDynamicFieldGainAutomation } from "../../l3lab/canonicalForge/canonicalPreviewMaterialElastic";
import {
  ensureLocalFieldState,
  getLocalFieldTargetState,
  localFieldDynamicFadeGain,
  localFieldPitchSemitoneOffset,
  resolveLocalFieldCurve,
  type LocalFieldModuleState,
} from "../../l3lab/canonicalForge/localField";
import { clamp } from "../rooms/resonanceRuntimeMath";

export type RootFollowLocalField = LocalFieldModuleState | null | undefined;
export type RootFollowLocalFieldTarget = "dynamic-fade" | "pitch-elastic";

type RootFollowResolvedLocalField = ReturnType<typeof ensureLocalFieldState>;

function sampleRootFollowLocalCurveValue(
  curve: ArrayLike<number>,
  ratio: number,
) {
  const count = curve.length;
  if (!count) return 0;
  const safeRatio = clamp(ratio, 0, 1);
  const position = safeRatio * Math.max(0, count - 1);
  const left = Math.floor(position);
  const right = Math.min(count - 1, left + 1);
  const frac = position - left;
  const leftValue = Number(curve[left] ?? 0);
  const rightValue = Number(curve[right] ?? leftValue);
  return leftValue + (rightValue - leftValue) * frac;
}

function sampleRootFollowLocalFieldWithinRange(
  field: RootFollowResolvedLocalField,
  curve: number[],
  progressRatio: number,
) {
  const safeProgress = clamp(progressRatio, 0, 1);
  const start = clamp(field.range.startRatio, 0, 1);
  const end = clamp(field.range.endRatio, 0, 1);
  if (safeProgress < start || safeProgress > end) return 0;
  const localRatio = clamp(
    (safeProgress - start) / Math.max(0.0001, end - start),
    0,
    1,
  );
  return sampleRootFollowLocalCurveValue(curve, localRatio);
}

export function getActiveRootFollowLocalFieldTarget(
  fieldInput: RootFollowLocalField,
  target: RootFollowLocalFieldTarget,
) {
  if (!fieldInput) return null;
  const field = getLocalFieldTargetState(
    ensureLocalFieldState(fieldInput),
    target,
  );
  return field.enabled && !field.bypassed ? field : null;
}

export function buildRootFollowLocalPitchSemitoneCurve(
  fieldInput: RootFollowLocalField,
  sampleCount = 96,
) {
  const field = getActiveRootFollowLocalFieldTarget(
    fieldInput,
    "pitch-elastic",
  );
  if (!field) return null;
  const resolved = resolveLocalFieldCurve(
    field,
    Math.max(32, sampleCount),
  ).resolved;
  const mapped = new Float32Array(Math.max(32, sampleCount));
  for (let index = 0; index < mapped.length; index += 1) {
    const progress =
      mapped.length <= 1 ? 0 : index / Math.max(1, mapped.length - 1);
    mapped[index] = localFieldPitchSemitoneOffset(
      sampleRootFollowLocalFieldWithinRange(field, resolved, progress),
    );
  }
  return mapped;
}

export function scheduleRootFollowLocalPitchDetuneAutomation(
  detuneParam: AudioParam | null | undefined,
  fieldInput: RootFollowLocalField,
  startTime: number,
  durationSec: number,
) {
  if (!detuneParam || durationSec <= 0.01) return;
  const semitoneCurve = buildRootFollowLocalPitchSemitoneCurve(fieldInput, 96);
  if (!semitoneCurve || semitoneCurve.length < 2) return;
  const centsCurve = new Float32Array(semitoneCurve.length);
  for (let index = 0; index < semitoneCurve.length; index += 1) {
    centsCurve[index] = semitoneCurve[index] * 100;
  }
  try {
    detuneParam.cancelScheduledValues(startTime);
    detuneParam.setValueAtTime(0, startTime);
    detuneParam.setValueCurveAtTime(
      centsCurve,
      startTime,
      Math.max(0.012, durationSec),
    );
  } catch {
    detuneParam.setValueAtTime(centsCurve[0] ?? 0, startTime);
  }
}

export function activeRootFollowLocalFieldList(
  fieldInput: RootFollowLocalField,
  target: RootFollowLocalFieldTarget,
) {
  const field = getActiveRootFollowLocalFieldTarget(fieldInput, target);
  return field ? [field] : [];
}

export function sampleRootFollowLocalFieldTargetValue(
  fieldInput: RootFollowLocalField,
  target: RootFollowLocalFieldTarget,
  progressRatio: number,
  sampleCount = 144,
) {
  const field = getActiveRootFollowLocalFieldTarget(fieldInput, target);
  if (!field) return 0;
  const resolved = resolveLocalFieldCurve(
    field,
    Math.max(32, sampleCount),
  ).resolved;
  return sampleRootFollowLocalFieldWithinRange(field, resolved, progressRatio);
}

export function toRootFollowPitchSemitoneOffset(targetValue: number) {
  return localFieldPitchSemitoneOffset(targetValue);
}

export function scheduleRootFollowSegmentDynamicGainAutomation(args: {
  gain: GainNode;
  fieldInput: RootFollowLocalField;
  segmentStart: number;
  segmentDuration: number;
  noteStart: number;
  noteDuration: number;
  segmentEnd: number;
}) {
  const {
    gain,
    fieldInput,
    segmentStart,
    segmentDuration,
    noteStart,
    noteDuration,
    segmentEnd,
  } = args;
  const field = getActiveRootFollowLocalFieldTarget(fieldInput, "dynamic-fade");
  if (!field || segmentDuration <= 0.004 || noteDuration <= 0.004) {
    gain.gain.setValueAtTime(1, segmentStart);
    return;
  }
  const curveCount = 96;
  const resolved = resolveLocalFieldCurve(field, curveCount).resolved;
  const mapped = new Float32Array(curveCount);
  for (let index = 0; index < curveCount; index += 1) {
    const localProgress =
      curveCount <= 1 ? 0 : index / Math.max(1, curveCount - 1);
    const absoluteProgress = clamp(
      (segmentStart - noteStart + localProgress * segmentDuration) /
        Math.max(0.0001, noteDuration),
      0,
      1,
    );
    mapped[index] = localFieldDynamicFadeGain(
      sampleRootFollowLocalFieldWithinRange(field, resolved, absoluteProgress),
    );
  }
  try {
    gain.gain.setValueAtTime(mapped[0] ?? 1, segmentStart);
    gain.gain.setValueCurveAtTime(
      mapped,
      segmentStart,
      Math.max(0.006, segmentDuration),
    );
    gain.gain.setValueAtTime(mapped[mapped.length - 1] ?? 1, segmentEnd);
  } catch {
    gain.gain.setValueAtTime(mapped[0] ?? 1, segmentStart);
  }
}

export { scheduleDynamicFieldGainAutomation as scheduleRootFollowDynamicFieldGainAutomation };

/** Compile source and note gain fields once per render window, then sample cheaply. */
export function compileRootFollowGainSampler(fields: RootFollowLocalField[]) {
  const prepared = fields.map(field => getActiveRootFollowLocalFieldTarget(field, 'dynamic-fade')).filter((f): f is RootFollowResolvedLocalField => !!f)
    .map(field => ({ field, curve: resolveLocalFieldCurve(field, 96).resolved }));
  return (progress: number) => prepared.reduce((gain, item) => gain * localFieldDynamicFadeGain(sampleRootFollowLocalFieldWithinRange(item.field, item.curve, progress)), 1);
}

export function compileRootFollowFieldSampler(fieldInput: RootFollowLocalField, target: RootFollowLocalFieldTarget) {
  const field = getActiveRootFollowLocalFieldTarget(fieldInput, target);
  if (!field) return (_progress: number) => 0;
  const curve = resolveLocalFieldCurve(field, 144).resolved;
  return (progress: number) => sampleRootFollowLocalFieldWithinRange(field, curve, progress);
}
