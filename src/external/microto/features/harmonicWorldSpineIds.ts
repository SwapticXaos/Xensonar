/**
 * World id normalization and journey position helpers for the harmonic world spine.
 * Extracted from harmonicWorldSpine for single responsibility and LOC discipline (vision §6).
 * Pure helpers: no gallery or scene data; spine composes these with WORLD_GALLERY / WORLD_JOURNEYS.
 */
import type { WorldJourney } from "../domain/worldGallery";

/**
 * Returns candidate string ids for matching a world/scene id against gallery or journey data.
 * Scene ids often use "_" (e.g. edo22_training_bridge); curated ids use "-" (e.g. 22edo-training-bridge).
 * Callers can use these to find journeys or gallery exports that match the current world.
 */
export function getWorldIdCandidates(worldId: string): string[] {
  const candidates = new Set<string>();
  candidates.add(worldId);
  if (worldId.includes("_")) {
    candidates.add(worldId.replace(/_/g, "-"));
  }
  const edoMatch = /^edo(\d+)_(.+)$/.exec(worldId);
  if (edoMatch) {
    const [, edo, rest] = edoMatch;
    const hyphenRest = rest.replace(/_/g, "-");
    candidates.add(`${edo}edo-${hyphenRest}`);
  }
  return Array.from(candidates);
}

export type JourneyProgress = {
  /** Zero-based index of the current world inside the journey's worldIds list. */
  index: number;
  /** Total number of worlds in the journey. */
  total: number;
};

/**
 * Returns the position of the given world inside a journey, if present.
 * Uses the same id-candidate logic as spine getJourneysForWorldId so that
 * scene ids like "edo22_training_bridge" can match curated world ids like "22edo-training-bridge".
 */
export function getJourneyProgressForWorld(
  journey: WorldJourney,
  worldId: string | null | undefined,
): JourneyProgress | null {
  if (!worldId) return null;
  const ids = journey.worldIds;
  if (ids.length === 0) return null;

  const candidates = getWorldIdCandidates(worldId);
  let index = -1;

  for (let i = 0; i < ids.length; i += 1) {
    if (candidates.includes(ids[i] as string)) {
      index = i;
      break;
    }
  }

  if (index === -1) return null;

  return { index, total: ids.length };
}
