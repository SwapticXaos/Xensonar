/**
 * Derived state for AppShellHarmonicWorldHud: spine-backed world source, journey, scenes, recommendations.
 * Single responsibility (vision §6 §8); keeps HUD component focused on layout and callbacks.
 */

import { exportMatchesWorld, type HarmonicWorld } from "../domain/harmonicWorld";
import type { WorldJourney } from "../domain/worldGallery";
import type { Room } from "./roomRegistry";
import type { ResonanceSceneId, ResonanceScene } from "../features/resonance/config/scenes";
import type { PracticeGoal } from "../domain/practiceGoals";
import type { JourneyProgress, SuggestedNextEntry } from "../features/harmonicWorldSpine";
import { harmonicWorldSpineApi } from "../features/harmonicWorldSpineApi";

export type WorldSource = "scene" | "gallery" | "custom" | null;

function inferWorldSource(harmonicWorld: HarmonicWorld | null | undefined): WorldSource {
  if (!harmonicWorld) return null;
  if (harmonicWorldSpineApi.hasSceneId(harmonicWorld.id)) {
    return "scene";
  }
  const matchesGallery = harmonicWorldSpineApi.getAllGalleryWorldExports().some((entry) => exportMatchesWorld(entry, harmonicWorld));
  if (matchesGallery) return "gallery";
  return "custom";
}

function findActiveJourneyForWorld(harmonicWorld: HarmonicWorld | null | undefined): WorldJourney | null {
  const journeys = harmonicWorldSpineApi.getJourneysForWorldId(harmonicWorld?.id);
  return journeys[0] ?? null;
}

export type UseShellHarmonicWorldHudDerivedResult = {
  worldSource: WorldSource;
  activeJourney: WorldJourney | null;
  activeJourneyProgress: JourneyProgress | null;
  journeys: readonly WorldJourney[];
  trainingJourneys: ReturnType<typeof harmonicWorldSpineApi.getTrainingWorldJourneys>;
  /** Context-aware primary training journey for the current world, when available. */
  primaryTrainingJourney: WorldJourney | null;
  scenes: ReturnType<typeof harmonicWorldSpineApi.getAllResonanceScenes>;
  /** Spine-backed calm/intro scenes recommended for new players. */
  entryScenesForNewPlayer: ResonanceScene[];
  recommendedRooms: Room[];
  recommendedWorldsForActiveRoom: ReturnType<typeof harmonicWorldSpineApi.getRecommendedWorldsForRoom>;
  trainingFlowsForWorld: ReturnType<typeof harmonicWorldSpineApi.getTrainingFlowsForWorld>;
  practiceGoalsForScene: ReturnType<typeof harmonicWorldSpineApi.getPracticeGoalsForScene>;
  nextInGoal: { goal: PracticeGoal; nextScene: ResonanceScene } | null;
  /** Optional: first practice goal that contains the current scene (for ladder review/label). */
  primaryPracticeGoal: PracticeGoal | null;
  similarScene: ResonanceScene | null;
  suggestedNextScenes: SuggestedNextEntry[];
  similarScenes: ResonanceScene[];
};

export function useShellHarmonicWorldHudDerived(
  harmonicWorld: HarmonicWorld | null | undefined,
  room: Room,
  currentSceneId: ResonanceSceneId | null | undefined,
): UseShellHarmonicWorldHudDerivedResult {
  const worldSource = inferWorldSource(harmonicWorld ?? null);
  const activeJourney = findActiveJourneyForWorld(harmonicWorld ?? null);
  const activeJourneyProgress =
    activeJourney && harmonicWorld
      ? harmonicWorldSpineApi.getJourneyProgressForWorld(activeJourney, harmonicWorld.id ?? null)
      : null;
  const journeys = harmonicWorldSpineApi.getAllWorldJourneys();
  const trainingJourneys = harmonicWorldSpineApi.getTrainingWorldJourneys();
  const primaryTrainingJourney =
    harmonicWorld && harmonicWorld.id
      ? harmonicWorldSpineApi.getTrainingJourneysForWorldId(harmonicWorld.id)[0] ?? trainingJourneys[0] ?? null
      : trainingJourneys[0] ?? null;
  const scenes = harmonicWorldSpineApi.getAllResonanceScenes();
  const entryScenesForNewPlayer = harmonicWorldSpineApi.getEntryScenesForNewPlayer({ limit: 6 });
  const recommendedRooms = harmonicWorld ? harmonicWorldSpineApi.getRecommendedRoomsForWorld(harmonicWorld) : [];
  const recommendedWorldsForActiveRoom = harmonicWorldSpineApi.getRecommendedWorldsForRoom(room, { limit: 3 });
  const trainingFlowsForWorld = harmonicWorldSpineApi.getTrainingFlowsForWorld(harmonicWorld?.id ?? null);
  const practiceGoalsForScene = harmonicWorldSpineApi.getPracticeGoalsForScene(currentSceneId ?? null);
  const primaryPracticeGoal = practiceGoalsForScene[0] ?? null;
  const nextInGoal = harmonicWorldSpineApi.getNextSceneInAnyGoal(currentSceneId ?? null);
  const similarScene = harmonicWorldSpineApi.getSuggestedSimilarScene(currentSceneId ?? null);
  const suggestedNextScenes = harmonicWorldSpineApi.getSuggestedNextScenes(currentSceneId ?? null, { limit: 3 });
  const similarScenes = harmonicWorldSpineApi.getSimilarScenes(currentSceneId ?? null, {
    byMood: true,
    byTuning: true,
    limit: 4,
  });

  return {
    worldSource,
    activeJourney,
    activeJourneyProgress,
    journeys,
    trainingJourneys,
    primaryTrainingJourney,
    scenes,
    entryScenesForNewPlayer,
    recommendedRooms,
    recommendedWorldsForActiveRoom,
    trainingFlowsForWorld,
    practiceGoalsForScene,
    primaryPracticeGoal,
    nextInGoal,
    similarScene,
    suggestedNextScenes,
    similarScenes,
  };
}
