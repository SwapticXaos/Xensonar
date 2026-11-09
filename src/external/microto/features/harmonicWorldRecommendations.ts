import type { HarmonicWorld, HarmonicWorldExport } from "../domain/harmonicWorld";
import type { Room } from "../app/roomRegistry";
import { WORLD_GALLERY } from "../domain/worldGallery";

/**
 * Derive a small set of rooms that are especially well-suited for exploring
 * the given harmonic world. This is intentionally heuristic and based on
 * world tags + intensity, and can be refined over time without changing
 * callers.
 */
export function getWorldRecommendedRooms(world: HarmonicWorld): Room[] {
  const tagsLower = new Set(world.tags.map((tag) => tag.toLowerCase()));
  const rooms: Room[] = [];

  // Resonance is always a valid anchor for any world.
  rooms.push("RESONANCE");

  // Commons is a good fit for JI / practice-oriented worlds.
  if (
    tagsLower.has("commons") ||
    tagsLower.has("practice") ||
    tagsLower.has("training") ||
    tagsLower.has("just intonation") ||
    world.gridTuning === "ji"
  ) {
    rooms.push("COMMONS");
  }

  // L3 lab works well for denser / more rhythmic worlds.
  if (
    tagsLower.has("combat") ||
    tagsLower.has("l3") ||
    world.profile?.intensity === "dense"
  ) {
    rooms.push("L3LAB");
  }

  // Arena + Platformer are highlighted when tags mention them explicitly
  // or the world advertises groove / rhythmic focus.
  if (tagsLower.has("arena") || tagsLower.has("game") || tagsLower.has("groove")) {
    rooms.push("GAME");
  }

  if (tagsLower.has("platformer") || tagsLower.has("jump run")) {
    rooms.push("PLATFORMER");
  }

  // Topology is a strong fit for non-12EDO tunings where the field itself
  // is interesting to navigate.
  if (world.gridTuning !== "12edo") {
    rooms.push("TOPOLOGY");
  }

  // De-duplicate while preserving first occurrence order.
  const seen = new Set<Room>();
  const unique: Room[] = [];
  for (const room of rooms) {
    if (!seen.has(room)) {
      seen.add(room);
      unique.push(room);
    }
  }
  return unique;
}

type RecommendedWorldOptions = {
  /**
   * Maximum number of worlds to return.
   * Defaults to 4 to keep HUD surfaces compact.
   */
  limit?: number;
};

/**
 * Heuristic "worlds for this room" helper.
 *
 * This is intentionally data-driven and side-effect free:
 * - Uses WORLD_GALLERY exports (curated worlds only).
 * - Scores worlds by tags, tuning family, and mood hints.
 * - Can be refined over time without changing callers.
 */
export function getRecommendedWorldExportsForRoom(
  room: Room,
  options?: RecommendedWorldOptions,
): HarmonicWorldExport[] {
  const limit = options?.limit ?? 4;

  const scored = WORLD_GALLERY.map((world) => {
    const tagsLower = new Set(world.tags.map((tag) => tag.toLowerCase()));
    const moodLower = (world.mood ?? "").toLowerCase();
    let score = 0;

    // Baseline: all curated worlds are at least somewhat usable in Resonance.
    if (room === "RESONANCE") {
      score += 1;
      if (tagsLower.has("groove") || tagsLower.has("wash") || tagsLower.has("tight")) {
        score += 1;
      }
    }

    // Commons: JI / practice / training oriented fields.
    if (room === "COMMONS") {
      if (
        tagsLower.has("commons") ||
        tagsLower.has("practice") ||
        tagsLower.has("training") ||
        tagsLower.has("just intonation")
      ) {
        score += 3;
      }
      if (world.gridTuning === "ji") {
        score += 1;
      }
    }

    // Arena: rhythmic pulsefields and motion practice worlds.
    if (room === "GAME") {
      if (tagsLower.has("arena") || tagsLower.has("pulse") || tagsLower.has("groove")) {
        score += 3;
      }
      if (tagsLower.has("platformer") || tagsLower.has("practice")) {
        score += 1;
      }
    }

    // Platformer: motion-training worlds that pair with the Jump Run soundtrack.
    if (room === "PLATFORMER") {
      if (tagsLower.has("platformer") || tagsLower.has("jump run")) {
        score += 3;
      }
      if (tagsLower.has("arena") || tagsLower.has("practice")) {
        score += 1;
      }
    }

    // Topology: non-12EDO tunings where the field itself is interesting to explore.
    if (room === "TOPOLOGY") {
      if (world.gridTuning !== "12edo") {
        score += 2;
      }
      if (tagsLower.has("microtonal") || tagsLower.has("starscape")) {
        score += 1;
      }
    }

    // Tuning Lab: neutral reference + clear training ladders.
    if (room === "TUNINGLAB") {
      if (tagsLower.has("tuning lab") || moodLower.includes("neutral")) {
        score += 3;
      }
      if (tagsLower.has("ladder") || tagsLower.has("training")) {
        score += 2;
      }
      if (tagsLower.has("reference")) {
        score += 2;
      }
    }

    // L3 / Level 3: denser, combat-like or motion-focused worlds.
    if (room === "L3LAB") {
      if (tagsLower.has("l3") || tagsLower.has("combat")) {
        score += 3;
      }
      if (world.profile.intensity === "dense") {
        score += 1;
      }
    }

    // Sandbox: simple, broadly applicable worlds.
    if (room === "SANDBOX") {
      if (moodLower.includes("neutral") || tagsLower.has("reference")) {
        score += 2;
      }
      if (world.profile.intensity === "light" || world.profile.intensity === "balanced") {
        score += 1;
      }
    }

    // World Lab / Gallery: favor worlds with clear labels and descriptions.
    if (room === "WORLDLAB" || room === "WORLDGALLERY") {
      if (world.label && world.description) {
        score += 2;
      }
      if (world.tags.length > 0) {
        score += 1;
      }
    }

    return { world, score };
  });

  const filtered = scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.world);

  // Fallback: if heuristics did not pick anything, return a small neutral subset.
  if (filtered.length > 0) {
    return filtered;
  }

  return WORLD_GALLERY.slice(0, limit);
}


