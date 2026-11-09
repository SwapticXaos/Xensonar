import type { Room } from "../app/roomRegistry";
import type { HarmonicWorld,HarmonicWorldExport } from "../domain/harmonicWorld";
import {
getPracticeGoals,
getPracticeScenesForGoal,
type PracticeGoal,
type PracticeGoalId,
} from "../domain/practiceGoals";
import { getTrainingFlows,getTrainingFlowsForScene,type TrainingFlowId } from "../domain/trainingFlows";
import { WORLD_GALLERY,WORLD_JOURNEYS,type WorldJourney } from "../domain/worldGallery";
import { getRecommendedWorldExportsForRoom,getWorldRecommendedRooms } from "./harmonicWorldRecommendations";
import {
getWorldIdCandidates
} from "./harmonicWorldSpineIds";
import {
RESONANCE_SCENES,
getSceneById,
type ResonanceScene,
type ResonanceSceneId,
} from "./resonance/config/scenes";

export { getNextSceneInAnyGoal,getNextSceneInPracticeGoal } from "./harmonicWorldSpineGoals";
export type { JourneyProgress } from "./harmonicWorldSpineIds";
export {
getEntryScenesForNewPlayer,getNextSceneInTrainingFlow,getRandomSimilarScene,getSimilarScenes,getSuggestedNextScenes,getSuggestedSimilarScene,type SuggestedNextEntry
} from "./harmonicWorldSpineSuggestions";

/**
 * Harmonic World Spine (read-only)
 *
 * Centralizes "world/scenes/journeys/recommendations" lookups so UI surfaces
 * don't stitch together imports from multiple modules.
 *
 * This module is intentionally read-only and side-effect free.
 */

export { getSceneById };

export function hasSceneId(worldId: string | null | undefined): worldId is ResonanceSceneId {
  if (!worldId) return false;
  return RESONANCE_SCENES.some((s) => s.id === worldId);
}

export function getGalleryWorldExportById(worldId: string | null | undefined): HarmonicWorldExport | null {
  if (!worldId) return null;
  return WORLD_GALLERY.find((w) => w.id === worldId) ?? null;
}

export function getJourneysForWorldId(worldId: string | null | undefined): WorldJourney[] {
  if (!worldId) return [];
  const candidates = getWorldIdCandidates(worldId);
  return WORLD_JOURNEYS.filter((journey) =>
    journey.worldIds.some((wid) => candidates.includes(wid)),
  );
}

/**
 * Returns journeys that both (a) qualify as training journeys and (b) are
 * associated with the given harmonic world id. This is a thin convenience
 * wrapper so HUDs can surface a context-aware training entry point without
 * re-encoding filtering logic.
 */
export function getTrainingJourneysForWorldId(worldId: string | null | undefined): WorldJourney[] {
  if (!worldId) return [];
  const journeysForWorld = getJourneysForWorldId(worldId);
  const trainingAll = getTrainingWorldJourneys();
  if (journeysForWorld.length === 0 || trainingAll.length === 0) return [];
  const trainingIds = new Set(trainingAll.map((j) => j.id));
  return journeysForWorld.filter((journey) => trainingIds.has(journey.id));
}

export function getJourneyById(journeyId: string | null | undefined): WorldJourney | null {
  if (!journeyId) return null;
  return WORLD_JOURNEYS.find((j) => j.id === journeyId) ?? null;
}

export { getJourneyProgressForWorld } from "./harmonicWorldSpineIds";

/**
 * Returns the first gallery export that can serve as an entry point for a journey.
 * (Journeys are sequences of world ids; not every id must exist in the curated gallery.)
 */
export function getEntryWorldForJourney(journey: WorldJourney): HarmonicWorldExport | null {
  for (const worldId of journey.worldIds) {
    const match = getGalleryWorldExportById(worldId);
    if (match) return match;
  }
  return null;
}

export function getRecommendedRoomsForWorld(world: HarmonicWorld): Room[] {
  return getWorldRecommendedRooms(world);
}

export function getRecommendedWorldsForRoom(
  room: Room,
  options?: { limit?: number },
): HarmonicWorldExport[] {
  return getRecommendedWorldExportsForRoom(room, options);
}

export function getAllResonanceScenes(): readonly ResonanceScene[] {
  return RESONANCE_SCENES;
}

export function getAllGalleryWorldExports(): readonly HarmonicWorldExport[] {
  return WORLD_GALLERY;
}

export function getAllWorldJourneys(): readonly WorldJourney[] {
  return WORLD_JOURNEYS;
}

/**
 * Returns a small, opinionated subset of WORLD_JOURNEYS that are explicitly
 * framed as training flows (ladder practice, motion training, reference → training).
 *
 * Primary source of truth is the optional `kind: "training"` field on
 * WorldJourney. For backward compatibility with older data, journeys whose
 * ids/labels include "training" or "ladder" are also treated as training
 * when kind is not set.
 */
export function getTrainingWorldJourneys(): readonly WorldJourney[] {
  return WORLD_JOURNEYS.filter((journey) => {
    if (journey.kind === "training") {
      return true;
    }

    const id = journey.id.toLowerCase();
    const label = journey.label.toLowerCase();

    return (
      id.includes("training") ||
      id.includes("ladder") ||
      label.includes("training") ||
      label.includes("ladder")
    );
  });
}

export type JourneyStepDirection = "next" | "prev";

/**
 * Given a journey and the current harmonic world id, returns the next or previous
 * gallery export in that journey. If the current world is not in the journey,
 * falls back to the journey's entry world. Returns null when nothing resolves.
 */
export function getStepWorldForJourney(
  journey: WorldJourney,
  currentWorldId: string | null | undefined,
  direction: JourneyStepDirection,
): HarmonicWorldExport | null {
  const ids = journey.worldIds;
  if (ids.length === 0) return getEntryWorldForJourney(journey);

  const candidates = currentWorldId ? getWorldIdCandidates(currentWorldId) : [];
  let index = -1;
  if (candidates.length > 0) {
    for (let i = 0; i < ids.length; i += 1) {
      if (candidates.includes(ids[i] as string)) {
        index = i;
        break;
      }
    }
  }

  if (index === -1) {
    return getEntryWorldForJourney(journey);
  }

  const delta = direction === "next" ? 1 : -1;
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= ids.length) {
    return null;
  }

  const targetId = ids[nextIndex];
  return getGalleryWorldExportById(targetId);
}

/**
 * Returns the scenes associated with a high-level practice goal.
 * This is a thin read-only facade over PRACTICE_GOALS so that
 * UI surfaces can remain wired only to the harmonic world spine.
 */
export function getScenesForPracticeGoal(goalId: PracticeGoalId): ResonanceScene[] {
  const sceneIds = getPracticeScenesForGoal(goalId);
  if (sceneIds.length === 0) return [];
  return RESONANCE_SCENES.filter((scene) => sceneIds.includes(scene.id));
}

/**
 * Returns curated gallery worlds that best represent a high-level practice goal.
 * The mapping is intentionally lightweight: for each scene that belongs to the
 * goal, we look for a curated WORLD_GALLERY export whose id matches the scene id
 * (underscore ↔ hyphen tolerant) and de-duplicate by world id.
 *
 * Callers should treat the result as an optional, opinionated subset of the
 * full gallery; absence of worlds does not make a goal invalid.
 */
export function getWorldsForPracticeGoal(goalId: PracticeGoalId): HarmonicWorldExport[] {
  const scenes = getScenesForPracticeGoal(goalId);
  if (scenes.length === 0) return [];

  const seenIds = new Set<string>();
  const worlds: HarmonicWorldExport[] = [];

  for (const scene of scenes) {
    const candidates = getWorldIdCandidates(scene.id);
    for (const candidate of candidates) {
      const match = WORLD_GALLERY.find((w) => w.id === candidate);
      if (match) {
        const key = match.id ?? match.label ?? "";
        if (!key) continue;
        if (seenIds.has(key)) continue;
        seenIds.add(key);
        worlds.push(match);
      }
    }
  }

  return worlds;
}

/**
 * Returns practice goals that explicitly include the given scene id.
 * This lets world- or scene-aware HUDs surface high-level practice
 * intents (ladder training, motion practice, ear training, ambient
 * exploration) without hard-coding goal → world mappings.
 *
 * A goal is considered relevant when the given scene id appears in
 * its curated sceneIds list.
 */
export function getPracticeGoalsForScene(sceneId: ResonanceSceneId | null | undefined): PracticeGoal[] {
  if (!sceneId) return [];
  const goals = getPracticeGoals();
  const relevant: PracticeGoal[] = [];

  for (const goal of goals) {
    if (goal.sceneIds.includes(sceneId)) {
      relevant.push(goal);
    }
  }

  return relevant;
}

/**
 * Returns authored training flows that involve at least one scene whose id
 * matches the given harmonic world id (or its underscore ↔ hyphen variants).
 *
 * This lets HUDs and world-aware rooms ask "which training flows is this
 * world part of?" without re-encoding scene ids or traversal logic.
 */
export function getTrainingFlowsForWorld(worldId: string | null | undefined) {
  if (!worldId) return [];
  const candidates = getWorldIdCandidates(worldId);
  const flowsForAnyCandidate = new Map<string, ReturnType<typeof getTrainingFlowsForScene>>();
  for (const candidate of candidates) {
    const flows = getTrainingFlowsForScene(candidate as ResonanceSceneId);
    if (flows.length > 0) {
      flowsForAnyCandidate.set(candidate, flows);
    }
  }
  if (flowsForAnyCandidate.size === 0) return [];
  const merged: ReturnType<typeof getTrainingFlowsForScene>[number][] = [];
  const seen = new Set<string>();
  for (const flows of flowsForAnyCandidate.values()) {
    for (const flow of flows) {
      if (!seen.has(flow.id)) {
        seen.add(flow.id);
        merged.push(flow);
      }
    }
  }
  return merged;
}

/**
 * Returns curated gallery worlds that participate in a given training flow.
 * This is the training-flow analogue of getWorldsForPracticeGoal and lets
 * UI surfaces treat flows as first-class entry points without duplicating
 * scene→world wiring.
 */
export function getWorldsForTrainingFlow(flowId: TrainingFlowId): HarmonicWorldExport[] {
  const allFlows = getTrainingFlows();
  const flow = allFlows.find((f) => f.id === flowId);
  if (!flow) return [];

  const seenIds = new Set<string>();
  const worlds: HarmonicWorldExport[] = [];

  for (const sceneId of flow.sceneIds) {
    const candidates = getWorldIdCandidates(sceneId);
    for (const candidate of candidates) {
      const match = WORLD_GALLERY.find((w) => w.id === candidate);
      if (!match) continue;
      const key = match.id ?? match.label ?? "";
      if (!key || seenIds.has(key)) continue;
      seenIds.add(key);
      worlds.push(match);
    }
  }

  return worlds;
}


