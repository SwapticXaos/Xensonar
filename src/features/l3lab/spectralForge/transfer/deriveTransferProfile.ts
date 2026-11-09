import {
  createDefaultLocalFieldState,
  resolveLocalFieldCurve,
  type LocalFieldModuleState,
} from '../../canonicalForge/localField';
import type {
  TransferMacroAxes,
  TransferMacroAxisId,
  TransferProfile,
  TransferProfileDetail,
  TransferProfilePresetId,
} from '../types/transferProfile';
import {
  DEFAULT_TRANSFER_MACRO_AXES,
  TRANSFER_PROFILE_PRESET_MACROS,
} from '../types/transferProfile';

export type TransferMacroCurveSet = Record<TransferMacroAxisId, LocalFieldModuleState>;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sampleLinear(values: number[], position: number): number {
  if (!values.length) return 0;
  const safePos = Math.max(0, Math.min(values.length - 1, position));
  const left = Math.floor(safePos);
  const right = Math.min(values.length - 1, left + 1);
  const mix = safePos - left;
  const leftValue = values[left] ?? 0;
  const rightValue = values[right] ?? leftValue;
  return leftValue * (1 - mix) + rightValue * mix;
}

function resampleNormalizedShape(shape: number[], targetCount: number): number[] {
  const normalized = shape.length ? shape.map((value) => clamp01(value)) : [0, 1];
  if (targetCount <= 1) return [normalized[0] ?? 0];
  if (normalized.length === targetCount) return normalized;
  return new Array(targetCount).fill(0).map((_, index) => {
    const ratio = index / Math.max(1, targetCount - 1);
    const position = ratio * Math.max(0, normalized.length - 1);
    return sampleLinear(normalized, position);
  });
}

function createCurveFromNormalizedShape(shape: number[]): LocalFieldModuleState {
  const field = createDefaultLocalFieldState();
  const resolution = Math.max(96, shape.length * 32);
  const normalized = resampleNormalizedShape(shape, resolution);
  const signed = normalized.map((value) => lerp(-1, 1, value));
  field.deformation.resolution = resolution;
  field.deformation.curve = [...signed];
  field.deformation.interior = [...signed];
  field.edgeHandles.left = signed[0] ?? 0;
  field.edgeHandles.right = signed[signed.length - 1] ?? 0;
  if (field.targetSlots?.['dynamic-fade']) {
    field.targetSlots['dynamic-fade'].deformation.resolution = resolution;
    field.targetSlots['dynamic-fade'].deformation.curve = [...signed];
    field.targetSlots['dynamic-fade'].deformation.interior = [...signed];
    field.targetSlots['dynamic-fade'].edgeHandles.left = signed[0] ?? 0;
    field.targetSlots['dynamic-fade'].edgeHandles.right = signed[signed.length - 1] ?? 0;
  }
  return field;
}

function sampleWarpCurve(field: LocalFieldModuleState, macroValue: number): number {
  const resolved = resolveLocalFieldCurve(field, 192).resolved;
  const position = clamp01(macroValue) * Math.max(0, resolved.length - 1);
  const signed = sampleLinear(resolved, position);
  return clamp01((signed + 1) * 0.5);
}

function emphasis(center: number, width: number, value: number): number {
  if (width <= 0) return 0;
  return clamp01(1 - Math.abs(value - center) / width);
}

export function createDefaultTransferMacroCurves(): TransferMacroCurveSet {
  return {
    carrierFidelity: createCurveFromNormalizedShape([0, 0.08, 0.24, 0.58, 0.84, 1]),
    donorLoad: createCurveFromNormalizedShape([0, 0.04, 0.18, 0.42, 0.72, 1]),
    materialFocus: createCurveFromNormalizedShape([0, 0.14, 0.36, 0.58, 0.82, 1]),
    leakProtection: createCurveFromNormalizedShape([0, 0.18, 0.4, 0.68, 0.9, 1]),
  };
}

export function mergeTransferMacroAxes(partial: Partial<TransferMacroAxes>): TransferMacroAxes {
  return {
    carrierFidelity: clamp01(partial.carrierFidelity ?? DEFAULT_TRANSFER_MACRO_AXES.carrierFidelity),
    donorLoad: clamp01(partial.donorLoad ?? DEFAULT_TRANSFER_MACRO_AXES.donorLoad),
    materialFocus: clamp01(partial.materialFocus ?? DEFAULT_TRANSFER_MACRO_AXES.materialFocus),
    leakProtection: clamp01(partial.leakProtection ?? DEFAULT_TRANSFER_MACRO_AXES.leakProtection),
  };
}

export function getTransferMacroAxesForPreset(presetId: TransferProfilePresetId): TransferMacroAxes {
  return { ...TRANSFER_PROFILE_PRESET_MACROS[presetId] };
}

export function deriveTransferProfile(args?: {
  presetId?: TransferProfilePresetId;
  macro?: Partial<TransferMacroAxes>;
  curves?: Partial<TransferMacroCurveSet>;
}): TransferProfile {
  const presetId = args?.presetId ?? 'carrier_strict';
  const macro = mergeTransferMacroAxes({
    ...getTransferMacroAxesForPreset(presetId),
    ...(args?.macro ?? {}),
  });
  const curves: TransferMacroCurveSet = {
    ...createDefaultTransferMacroCurves(),
    ...(args?.curves ?? {}),
  };

  const carrier = sampleWarpCurve(curves.carrierFidelity, macro.carrierFidelity);
  const donor = sampleWarpCurve(curves.donorLoad, macro.donorLoad);
  const material = sampleWarpCurve(curves.materialFocus, macro.materialFocus);
  const leak = sampleWarpCurve(curves.leakProtection, macro.leakProtection);

  const resonantFocus = emphasis(0.2, 0.28, material);
  const mixedFocus = emphasis(0.5, 0.24, material);
  const residualFocus = emphasis(0.78, 0.26, material);
  const transientFocus = clamp01((material - 0.52) / 0.48);
  const orderedFocus = clamp01((0.6 - material) / 0.6);

  const detail: TransferProfileDetail = {
    verticalFidelity: clamp01(0.18 + 0.82 * carrier),
    continuityFidelity: clamp01(0.12 + 0.88 * Math.pow(carrier, 0.85)),
    sparseRespect: clamp01(0.16 + 0.84 * carrier),
    anchorFocus: clamp01(0.22 + 0.78 * carrier * (1 - donor * 0.18)),

    resonanceLoad: clamp01(donor * (0.25 + 0.75 * resonantFocus)),
    residualLoad: clamp01(donor * (0.2 + 0.8 * residualFocus)),
    transientLoad: clamp01(donor * (0.18 + 0.82 * transientFocus)),
    microModulationLoad: clamp01(donor * (0.2 + 0.45 * mixedFocus + 0.2 * resonantFocus) * (1 - leak * 0.35)),

    bandwidthSpread: clamp01(0.16 + donor * 0.44 + residualFocus * 0.22 + (1 - carrier) * 0.18),
    inharmonicFreedom: clamp01(0.12 + residualFocus * 0.38 + transientFocus * 0.18 + (1 - carrier) * 0.2 + mixedFocus * 0.12),
    zoneCoupling: clamp01(0.14 + (1 - carrier) * 0.28 + donor * 0.22 + mixedFocus * 0.18 + residualFocus * 0.12),
    polyAnchorBlend: clamp01(0.2 + carrier * 0.42 + donor * 0.12 + mixedFocus * 0.16 + residualFocus * 0.08),

    prosodySuppression: clamp01(0.08 + 0.92 * leak),
    sequenceDecoupling: clamp01(0.1 + 0.9 * Math.pow(leak, 0.85)),
    cellDisentanglement: clamp01(0.06 + 0.94 * leak),
    orderednessPenalty: clamp01(0.08 + leak * (0.58 + 0.22 * orderedFocus + 0.12 * donor)),
  };

  return {
    presetId,
    macro,
    detail,
  };
}
