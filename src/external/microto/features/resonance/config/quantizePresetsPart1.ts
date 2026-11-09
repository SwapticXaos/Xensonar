/**
 * Quantize macro presets (part 1 of 2): first 28 presets. Combined in quantizePresets.ts.
 */

import type { QuantizeMacroPreset } from "./quantizePresetsTypes";

export const QUANTIZE_MACRO_PRESETS_PART1: QuantizeMacroPreset[] = [
  { id: "16-stable", label: "16tel stable", quantizeSubdivision: "16", quantizeMicroTightness: 0.5, harmonyCascadeSteps: 2, kind: "stable" },
  { id: "16-groove", label: "16tel groove", quantizeSubdivision: "16", quantizeMicroTightness: 0.35, harmonyCascadeSteps: 3, kind: "groove" },
  { id: "16-swing", label: "16tel swing", quantizeSubdivision: "16", quantizeMicroTightness: 0.22, harmonyCascadeSteps: 5, kind: "swing" },
  { id: "16-push", label: "16tel push", quantizeSubdivision: "16", quantizeMicroTightness: 0.18, harmonyCascadeSteps: 4, kind: "push" },
  { id: "16-human", label: "16tel human", quantizeSubdivision: "16", quantizeMicroTightness: 0.28, harmonyCascadeSteps: 4, kind: "human" },
  { id: "16-human-tight", label: "16tel human (tight)", quantizeSubdivision: "16", quantizeMicroTightness: 0.32, harmonyCascadeSteps: 2, kind: "human" },
  { id: "16-polyrhythm", label: "16tel polyrhythm", quantizeSubdivision: "16", quantizeMicroTightness: 0.4, harmonyCascadeSteps: 7, kind: "polyrhythm" },
  { id: "16-drift", label: "16tel drift", quantizeSubdivision: "16", quantizeMicroTightness: 0.18, harmonyCascadeSteps: 6, kind: "drift" },
  { id: "16-steady", label: "16tel steady", quantizeSubdivision: "16", quantizeMicroTightness: 0.48, harmonyCascadeSteps: 2, kind: "stable" },
  { id: "16-stable-relaxed", label: "16tel stable (relaxed)", quantizeSubdivision: "16", quantizeMicroTightness: 0.38, harmonyCascadeSteps: 2, kind: "stable" },
  { id: "16-tight", label: "16tel tight", quantizeSubdivision: "16", quantizeMicroTightness: 0.85, harmonyCascadeSteps: 1, kind: "stable" },
  { id: "16-wash", label: "16tel wash", quantizeSubdivision: "16", quantizeMicroTightness: 0.4, harmonyCascadeSteps: 5, kind: "drift" },
  { id: "16-wash-relaxed", label: "16tel wash (relaxed)", quantizeSubdivision: "16", quantizeMicroTightness: 0.22, harmonyCascadeSteps: 3, kind: "drift" },
  { id: "16-wash-tight", label: "16tel wash (tight)", quantizeSubdivision: "16", quantizeMicroTightness: 0.88, harmonyCascadeSteps: 3, kind: "stable" },
  { id: "32-stable", label: "32tel stable", quantizeSubdivision: "32", quantizeMicroTightness: 0.72, harmonyCascadeSteps: 2, kind: "stable" },
  { id: "32-groove", label: "32tel groove", quantizeSubdivision: "32", quantizeMicroTightness: 0.45, harmonyCascadeSteps: 4, kind: "groove" },
  { id: "32-swing", label: "32tel swing", quantizeSubdivision: "32", quantizeMicroTightness: 0.22, harmonyCascadeSteps: 5, kind: "swing" },
  { id: "32-tight", label: "32tel tight", quantizeSubdivision: "32", quantizeMicroTightness: 0.85, harmonyCascadeSteps: 1, kind: "stable" },
  { id: "32-human", label: "32tel human", quantizeSubdivision: "32", quantizeMicroTightness: 0.4, harmonyCascadeSteps: 3, kind: "human" },
  { id: "32-drift", label: "32tel drift", quantizeSubdivision: "32", quantizeMicroTightness: 0.18, harmonyCascadeSteps: 6, kind: "drift" },
  { id: "32-push", label: "32tel push", quantizeSubdivision: "32", quantizeMicroTightness: 0.18, harmonyCascadeSteps: 4, kind: "push" },
  { id: "32-wash", label: "32tel wash", quantizeSubdivision: "32", quantizeMicroTightness: 0.4, harmonyCascadeSteps: 5, kind: "drift" },
  { id: "32-human-wash", label: "32tel human wash", quantizeSubdivision: "32", quantizeMicroTightness: 0.35, harmonyCascadeSteps: 7, kind: "human" },
  { id: "32-stable-relaxed", label: "32tel stable (relaxed)", quantizeSubdivision: "32", quantizeMicroTightness: 0.58, harmonyCascadeSteps: 2, kind: "stable" },
  { id: "64-drift", label: "64tel drift", quantizeSubdivision: "64", quantizeMicroTightness: 0.18, harmonyCascadeSteps: 6, kind: "drift" },
  { id: "64-stable", label: "64tel stable", quantizeSubdivision: "64", quantizeMicroTightness: 0.72, harmonyCascadeSteps: 2, kind: "stable" },
  { id: "64-stable-relaxed", label: "64tel stable (relaxed)", quantizeSubdivision: "64", quantizeMicroTightness: 0.55, harmonyCascadeSteps: 2, kind: "stable" },
  { id: "64-tight", label: "64tel tight", quantizeSubdivision: "64", quantizeMicroTightness: 0.88, harmonyCascadeSteps: 1, kind: "stable" },
];
