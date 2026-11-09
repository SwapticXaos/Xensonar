/**
 * Apply a HarmonicWorldExport to ResonanceState (paste/load world).
 * Builds a patch for updateNParams; optionally merges matching scene preset.
 * Vision: harmonic systems first-class — restore tuning + groove (+ scene when id matches).
 */

import type { HarmonicWorldExport } from "../../../domain/harmonicWorld";
import { clampFreq } from "../../../shared/tuning/grid";
import type { ResonanceState } from "./state";
import { RESONANCE_SCENES, buildResonanceScenePatch, type ResonanceSceneId } from "./scenes";

/** Same range as setGlobalRootHz in App (vision: consistent root bounds). */
const ROOT_HZ_MIN = 16;
const ROOT_HZ_MAX = 4096;

/**
 * Resolve an export id (e.g. gallery "22edo-training-bridge" or "ji-commons-practice-space")
 * to a RESONANCE_SCENES scene id when they refer to the same logical scene.
 * Ensures "Start a goal" and paste/load of gallery worlds get full scene patch (drone/particle/macro).
 */
function resolveExportIdToScene(exportId: string): (typeof RESONANCE_SCENES)[number] | null {
  const direct = RESONANCE_SCENES.find((s) => s.id === (exportId as ResonanceSceneId));
  if (direct) return direct;
  const withUnderscore = exportId.replace(/-/g, "_");
  const byUnderscore = RESONANCE_SCENES.find((s) => s.id === (withUnderscore as ResonanceSceneId));
  if (byUnderscore) return byUnderscore;
  const edoGalleryMatch = /^(\d+)edo-(.+)$/.exec(exportId);
  if (edoGalleryMatch) {
    const [, n, rest] = edoGalleryMatch;
    const sceneId = `edo${n}_${rest.replace(/-/g, "_")}` as ResonanceSceneId;
    const scene = RESONANCE_SCENES.find((s) => s.id === sceneId) ?? null;
    if (scene) return scene;
  }
  return null;
}

/**
 * Build a Partial<ResonanceState> from an exported world.
 * Base patch: gridBase (clamped), gridTuning, quantizeOn, quantizeBpm, quantizeSubdivision.
 * If export.id matches a RESONANCE_SCENES scene (direct, hyphen variant, or gallery EDO form), merges that scene's patch (drone/particle/macro).
 */
export function buildResonancePatchFromWorldExport(
  data: HarmonicWorldExport,
  currentState: ResonanceState
): Partial<ResonanceState> {
  const basePatch: Partial<ResonanceState> = {
    gridBase: clampFreq(data.baseFreq, ROOT_HZ_MIN, ROOT_HZ_MAX),
    gridTuning: data.gridTuning,
    quantizeOn: data.quantizeOn,
    quantizeBpm: data.quantizeBpm,
    quantizeSubdivision: data.quantizeSubdivision,
  };

  if (data.id == null || data.id === "") {
    return basePatch;
  }

  const scene = resolveExportIdToScene(data.id);
  if (!scene) {
    return basePatch;
  }

  const scenePatch = buildResonanceScenePatch(scene, currentState);
  return { ...basePatch, ...scenePatch };
}
