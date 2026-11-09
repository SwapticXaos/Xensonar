/**
 * Quantize macro presets for one-click groove profiles.
 * Aligns with project-vision: optional pitch quantization, immediately playable.
 * Catalog split into quantizePresetsPart1.ts and quantizePresetsPart2.ts for LOC discipline.
 */

export type { QuantizeMacroKind, QuantizeMacroPreset } from "./quantizePresetsTypes";
import type { QuantizeMacroPreset } from "./quantizePresetsTypes";
import { QUANTIZE_MACRO_PRESETS_PART1 } from "./quantizePresetsPart1";
import { QUANTIZE_MACRO_PRESETS_PART2 } from "./quantizePresetsPart2";

export const QUANTIZE_MACRO_PRESETS: QuantizeMacroPreset[] = [
  ...QUANTIZE_MACRO_PRESETS_PART1,
  ...QUANTIZE_MACRO_PRESETS_PART2,
];

export type QuantizeMacroMatchParams = Pick<
  QuantizeMacroPreset,
  "quantizeSubdivision" | "quantizeMicroTightness" | "harmonyCascadeSteps"
>;

/**
 * Find the quantize macro preset that best matches the given subdivision,
 * micro-tightness, and harmonyCascadeSteps tuple.
 */
export function findQuantizeMacroPresetForParams(
  params: QuantizeMacroMatchParams,
  options?: { microTightnessTolerance?: number },
): QuantizeMacroPreset | null {
  const tolerance = options?.microTightnessTolerance ?? 0.05;
  const { quantizeSubdivision, quantizeMicroTightness, harmonyCascadeSteps } = params;

  const match = QUANTIZE_MACRO_PRESETS.find(
    (preset) =>
      preset.quantizeSubdivision === quantizeSubdivision &&
      Math.abs(preset.quantizeMicroTightness - quantizeMicroTightness) < tolerance &&
      preset.harmonyCascadeSteps === harmonyCascadeSteps,
  );

  return match ?? null;
}
