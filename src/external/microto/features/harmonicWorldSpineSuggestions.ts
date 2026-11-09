/**
 * Harmonic world spine — similar scenes and suggested next (discoverability).
 * Single responsibility: "Surprise similar", "Try similar", "Suggested next" (vision §3 §5).
 * Re-exported by harmonicWorldSpine so callers keep a single import surface.
 */
import { RESONANCE_SCENES, getSceneById } from "./resonance/config/scenes";
import type { ResonanceSceneId, ResonanceScene } from "./resonance/config/scenes";
import { getNextSceneInAnyGoal } from "./harmonicWorldSpineGoals";
import { getTrainingFlowsForScene } from "../domain/trainingFlows";

/**
 * Returns scenes similar to the current one (same mood and/or same grid tuning) for discoverability.
 * Excludes the current scene. Order: same mood first (if current has mood), then same tuning.
 */
export function getSimilarScenes(
  currentSceneId: ResonanceSceneId | null,
  options?: { byMood?: boolean; byTuning?: boolean; limit?: number },
): ResonanceScene[] {
  const byMood = options?.byMood ?? true;
  const byTuning = options?.byTuning ?? true;
  const limit = options?.limit ?? 50;
  if (!currentSceneId || limit <= 0) return [];
  const current = getSceneById(currentSceneId);
  if (!current) return [];
  const others = RESONANCE_SCENES.filter((s) => s.id !== current.id);
  if (others.length === 0) return [];

  const sameMood =
    byMood && typeof current.mood === "string" && current.mood.trim().length > 0
      ? others.filter((s) => s.mood === current.mood)
      : [];
  const sameTuning = byTuning ? others.filter((s) => s.gridTuning === current.gridTuning) : [];
  const combined = new Map<string, ResonanceScene>();
  for (const s of sameMood) combined.set(s.id, s);
  for (const s of sameTuning) if (!combined.has(s.id)) combined.set(s.id, s);
  const out = Array.from(combined.values());
  return out.slice(0, limit);
}

/**
 * Picks a random scene from the same mood/tuning family, or any scene if none similar (discoverability).
 */
export function getRandomSimilarScene(currentSceneId: ResonanceSceneId | null): ResonanceScene | null {
  const similar = getSimilarScenes(currentSceneId, { byMood: true, byTuning: true });
  if (similar.length > 0) {
    return similar[Math.floor(Math.random() * similar.length)];
  }
  if (RESONANCE_SCENES.length > 0) {
    return RESONANCE_SCENES[Math.floor(Math.random() * RESONANCE_SCENES.length)];
  }
  return null;
}

/**
 * Suggests one scene similar to the current one (same mood or same grid tuning) for discoverability.
 */
export function getSuggestedSimilarScene(currentSceneId: ResonanceSceneId | null): ResonanceScene | null {
  if (!currentSceneId) return null;
  const current = getSceneById(currentSceneId);
  if (!current) return null;
  const others = RESONANCE_SCENES.filter((s) => s.id !== current.id);
  if (others.length === 0) return null;
  const sameMood =
    typeof current.mood === "string" && current.mood.trim().length > 0
      ? others.filter((s) => s.mood === current.mood)
      : [];
  if (sameMood.length > 0) return sameMood[0];
  const sameTuning = others.filter((s) => s.gridTuning === current.gridTuning);
  if (sameTuning.length > 0) return sameTuning[0];
  return others[0];
}

/**
 * Returns the next scene in the first training flow that contains the current scene and has a next step.
 */
export function getNextSceneInTrainingFlow(currentSceneId: ResonanceSceneId | null): ResonanceScene | null {
  if (!currentSceneId) return null;
  const flows = getTrainingFlowsForScene(currentSceneId);
  for (const flow of flows) {
    const idx = flow.sceneIds.indexOf(currentSceneId);
    if (idx >= 0 && idx < flow.sceneIds.length - 1) {
      const nextId = flow.sceneIds[idx + 1];
      const next = getSceneById(nextId);
      if (next) return next;
    }
  }
  return null;
}

export type SuggestedNextEntry = {
  id: ResonanceSceneId;
  label: string;
  hint?: string;
};

/**
 * Returns a short list of suggested next scenes for discoverability (vision §3 §5).
 * Order: next in practice goal, next in training flow, similar scene — deduplicated, up to limit.
 */
export function getSuggestedNextScenes(
  currentSceneId: ResonanceSceneId | null,
  options?: { limit?: number },
): SuggestedNextEntry[] {
  const limit = options?.limit ?? 3;
  if (!currentSceneId || limit <= 0) return [];

  const seen = new Set<ResonanceSceneId>();
  const out: SuggestedNextEntry[] = [];

  function push(scene: ResonanceScene | null, hint?: string) {
    if (!scene || seen.has(scene.id) || out.length >= limit) return;
    seen.add(scene.id);
    out.push({ id: scene.id, label: scene.label, hint });
  }

  const nextInGoal = getNextSceneInAnyGoal(currentSceneId);
  push(nextInGoal?.nextScene ?? null, nextInGoal ? "Next in goal" : undefined);

  const nextInFlow = getNextSceneInTrainingFlow(currentSceneId);
  push(nextInFlow, nextInFlow ? "Next in training flow" : undefined);

  const similar = getSuggestedSimilarScene(currentSceneId);
  push(similar, similar ? "Similar" : undefined);

  return out;
}

/**
 * Returns a small, opinionated set of entry scenes that are well-suited for
 * new players. Prefers scenes explicitly marked as Intro difficulty and with
 * calm / meditative moods or entry/intro tags, and falls back to the first
 * scenes in the catalog when nothing matches.
 */
export function getEntryScenesForNewPlayer(options?: { limit?: number }): ResonanceScene[] {
  const limit = options?.limit ?? 6;
  if (limit <= 0 || RESONANCE_SCENES.length === 0) return [];

  const introScenes = RESONANCE_SCENES.filter((scene) => {
    if (scene.difficulty !== "Intro") return false;

    const mood = scene.mood?.toLowerCase().trim() ?? "";
    const tags = scene.tags ?? [];

    const isCalmMood =
      mood.includes("calm") ||
      mood.includes("meditative") ||
      mood.includes("meditation") ||
      mood.includes("wash");

    const isEntryTagged = tags.includes("entry") || tags.includes("intro") || tags.includes("beginner");

    return isCalmMood || isEntryTagged;
  });

  if (introScenes.length === 0) {
    return RESONANCE_SCENES.slice(0, Math.min(limit, RESONANCE_SCENES.length));
  }

  return introScenes.slice(0, limit);
}
