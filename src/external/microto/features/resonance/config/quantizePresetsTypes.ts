/**
 * Types for quantize macro presets. Data lives in quantizePresetsPart1.ts and quantizePresetsPart2.ts.
 */

import type { QuantizeSubdivision } from "../../../shared/tuning/grid";

export type QuantizeMacroKind =
  | "stable"
  | "groove"
  | "swing"
  | "push"
  | "human"
  | "drift"
  | "bp"
  | "polyrhythm";

export type QuantizeMacroPreset = {
  id: string;
  label: string;
  quantizeSubdivision: QuantizeSubdivision;
  quantizeMicroTightness: number;
  harmonyCascadeSteps: number;
  /**
   * Optional family tag used for grouping and future UX (dropdown optgroups, HUD hints).
   */
  kind?: QuantizeMacroKind;
};
