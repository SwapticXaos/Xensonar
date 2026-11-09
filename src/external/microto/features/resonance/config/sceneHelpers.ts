/**
 * Pure helpers for Resonance scenes: match state to scene, build patch, catalog navigation.
 * Scene catalog and types live in scenesData.ts; this file keeps logic separate from data.
 */
import type { ResonanceState } from "./state";
import { QUANTIZE_MACRO_PRESETS, type QuantizeMacroPreset } from "./quantizePresets";
import { RESONANCE_SCENES, type ResonanceScene } from "./scenesData";
import type { ResonanceSceneId } from "./scenesDataTypes";

/** Scene by id in catalog (single source for spine and suggestions). */
export function getSceneById(sceneId: ResonanceSceneId): ResonanceScene | null {
  return RESONANCE_SCENES.find((s) => s.id === sceneId) ?? null;
}

/** Index of scene by id in catalog, or -1 if not found. */
export function getSceneIndexById(scenes: ResonanceScene[], sceneId: string | undefined): number {
  if (!sceneId || scenes.length === 0) return -1;
  return scenes.findIndex((s) => s.id === sceneId);
}

/** Adjacent scene in catalog order (next or prev). Returns null if catalog empty. */
export function getAdjacentScene(
  scenes: ResonanceScene[],
  currentSceneId: string | undefined,
  direction: "next" | "prev",
): ResonanceScene | null {
  if (scenes.length === 0) return null;
  const idx = getSceneIndexById(scenes, currentSceneId);
  const len = scenes.length;
  const nextIdx =
    direction === "next"
      ? idx < 0
        ? 0
        : (idx + 1) % len
      : idx <= 0
        ? len - 1
        : (idx - 1 + len) % len;
  return scenes[nextIdx] ?? null;
}

/** Human-readable position in catalog (e.g. "12/90") for shell HUD. */
export function getScenePositionLabel(
  scenes: ResonanceScene[],
  currentSceneId: string | undefined,
): string | undefined {
  if (scenes.length === 0 || !currentSceneId) return undefined;
  const idx = getSceneIndexById(scenes, currentSceneId);
  if (idx < 0) return undefined;
  return `${idx + 1}/${scenes.length}`;
}

export const getSceneMacro = (scene: ResonanceScene): QuantizeMacroPreset | null =>
  QUANTIZE_MACRO_PRESETS.find((preset) => preset.id === scene.quantizeMacroId) ?? null;

const MACRO_TOLERANCE = 0.05;

/**
 * Best-effort match from current ResonanceState to a scene definition.
 * Uses tuning + drone preset + (optional) particle preset + quantize tuple.
 * Ignores BPM so players can freely adjust tempo without losing the scene label.
 */
export function findResonanceSceneForState(state: ResonanceState): ResonanceScene | null {
  for (const scene of RESONANCE_SCENES) {
    if (scene.gridTuning !== state.gridTuning) continue;
    if (scene.dronePreset !== state.dronePreset) continue;
    if (scene.particlePreset && scene.particlePreset !== state.particlePreset) continue;

    const macro = getSceneMacro(scene);
    if (!macro) continue;

    if (macro.quantizeSubdivision !== state.quantizeSubdivision) continue;
    if (Math.abs(macro.quantizeMicroTightness - state.quantizeMicroTightness) > MACRO_TOLERANCE) continue;
    if (macro.harmonyCascadeSteps !== state.harmonyCascadeSteps) continue;

    return scene;
  }
  return null;
}

/**
 * Build a minimal, constrained patch for ResonanceState that applies the given scene.
 * Keeps behavior data-driven: tuning + drone/particle + quantize macro + optional BPM.
 *
 * Callers should pass this into updateNParams(...) rather than mutating state directly.
 */
export function buildResonanceScenePatch(scene: ResonanceScene, state: ResonanceState): Partial<ResonanceState> {
  const patch: Partial<ResonanceState> = {
    gridTuning: scene.gridTuning,
    dronePreset: scene.dronePreset,
    quantizeOn: true,
  };

  if (scene.particlePreset) {
    patch.particlePreset = scene.particlePreset;
  }

  const macro = getSceneMacro(scene);
  if (macro) {
    patch.quantizeSubdivision = macro.quantizeSubdivision;
    patch.quantizeMicroTightness = macro.quantizeMicroTightness;
    patch.harmonyCascadeSteps = macro.harmonyCascadeSteps;
  }

  if (typeof scene.quantizeBpm === "number" && Number.isFinite(scene.quantizeBpm)) {
    patch.quantizeBpm = scene.quantizeBpm;
  } else {
    patch.quantizeBpm = state.quantizeBpm;
  }

  return patch;
}
