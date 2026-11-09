import type { HarmonicWorld, HarmonicWorldExport } from "../domain/harmonicWorld";
import type { WorldJourney } from "../domain/worldGallery";
import type { Room } from "../app/roomRegistry";
import type { ResonanceScene, ResonanceSceneId } from "./resonance/config/scenes";
import type { PracticeGoal } from "../domain/practiceGoals";
import type { SuggestedNextEntry } from "./harmonicWorldSpine";
import {
  getAllGalleryWorldExports,
  getAllResonanceScenes,
  getAllWorldJourneys,
  getEntryWorldForJourney,
  getGalleryWorldExportById,
  getJourneyById,
  getJourneyProgressForWorld,
  getJourneysForWorldId,
  getNextSceneInAnyGoal,
  getPracticeGoalsForScene,
  getRecommendedRoomsForWorld,
  getRecommendedWorldsForRoom,
  getSceneById,
  getSimilarScenes,
  getStepWorldForJourney,
  getSuggestedNextScenes,
  getSuggestedSimilarScene,
  getTrainingWorldJourneys,
  getTrainingJourneysForWorldId,
  getTrainingFlowsForWorld,
  getWorldsForPracticeGoal,
  getWorldsForTrainingFlow,
  getScenesForPracticeGoal,
  getEntryScenesForNewPlayer,
  hasSceneId,
  type JourneyProgress,
} from "./harmonicWorldSpine";

/**
 * Harmonic World Spine API Facade
 *
 * This module provides a small, cohesive surface for UI layers to talk to the
 * harmonic-world spine without importing many individual helpers. It is
 * intentionally read-only and side-effect free.
 */

export type SpineJourneyProgress = JourneyProgress;

export const harmonicWorldSpineApi = {
  // Worlds & scenes
  getAllGalleryWorldExports,
  getAllWorldJourneys,
  getAllResonanceScenes,
  getSceneById,
  getGalleryWorldExportById,
  getJourneyById,
  getEntryWorldForJourney,
  getStepWorldForJourney,
  getJourneysForWorldId,
  getJourneyProgressForWorld,
  getWorldsForPracticeGoal,

  // Classification / predicates
  hasSceneId,
  getTrainingWorldJourneys,
  getTrainingJourneysForWorldId,

  // Recommendations
  getRecommendedRoomsForWorld,
  getRecommendedWorldsForRoom,
  getSimilarScenes,
  getSuggestedSimilarScene,
  getSuggestedNextScenes,

  // Entry recommendations
  getEntryScenesForNewPlayer,

  // Practice / training
  getPracticeGoalsForScene,
  getTrainingFlowsForWorld,
  getWorldsForTrainingFlow,
  getNextSceneInAnyGoal,
  getScenesForPracticeGoal,
} satisfies {
  // Worlds & scenes
  getAllGalleryWorldExports(): readonly HarmonicWorldExport[];
  getAllWorldJourneys(): readonly WorldJourney[];
  getAllResonanceScenes(): readonly ResonanceScene[];
  getSceneById(id: ResonanceSceneId | null | undefined): ResonanceScene | null;
  getGalleryWorldExportById(id: string | null | undefined): HarmonicWorldExport | null;
  getJourneyById(id: string | null | undefined): WorldJourney | null;
  getEntryWorldForJourney(journey: WorldJourney): HarmonicWorldExport | null;
  getStepWorldForJourney(
    journey: WorldJourney,
    currentWorldId: string | null | undefined,
    direction: "next" | "prev",
  ): HarmonicWorldExport | null;
  getJourneysForWorldId(worldId: string | null | undefined): WorldJourney[];
  getJourneyProgressForWorld(
    journey: WorldJourney,
    worldId: string | null | undefined,
  ): JourneyProgress | null;
  getWorldsForPracticeGoal(goalId: PracticeGoal["id"]): HarmonicWorldExport[];

  // Classification / predicates
  hasSceneId(worldId: string | null | undefined): worldId is ResonanceSceneId;
  getTrainingWorldJourneys(): readonly WorldJourney[];
  getTrainingJourneysForWorldId(worldId: string | null | undefined): WorldJourney[];

  // Recommendations
  getRecommendedRoomsForWorld(world: HarmonicWorld): Room[];
  getRecommendedWorldsForRoom(
    room: Room,
    options?: { limit?: number },
  ): HarmonicWorldExport[];
  getSimilarScenes(
    currentSceneId: ResonanceSceneId | null | undefined,
    options?: { limit?: number; byMood?: boolean; byTuning?: boolean },
  ): ResonanceScene[];
  getSuggestedSimilarScene(
    currentSceneId: ResonanceSceneId | null | undefined,
  ): ResonanceScene | null;
  getSuggestedNextScenes(
    currentSceneId: ResonanceSceneId | null | undefined,
    options?: { limit?: number },
  ): SuggestedNextEntry[];

  // Entry recommendations
  getEntryScenesForNewPlayer(options?: { limit?: number }): ResonanceScene[];

  // Practice / training
  getPracticeGoalsForScene(
    sceneId: ResonanceSceneId | null | undefined,
  ): PracticeGoal[];
  getTrainingFlowsForWorld(
    worldId: string | null | undefined,
  ): ReturnType<typeof getTrainingFlowsForWorld>;
  getWorldsForTrainingFlow(
    flowId: Parameters<typeof getWorldsForTrainingFlow>[0],
  ): ReturnType<typeof getWorldsForTrainingFlow>;
  getNextSceneInAnyGoal(
    currentSceneId: ResonanceSceneId | null | undefined,
  ): ReturnType<typeof getNextSceneInAnyGoal>;
  getScenesForPracticeGoal(
    goalId: PracticeGoal["id"],
  ): ResonanceScene[];
};

