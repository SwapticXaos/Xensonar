/**
 * Welcome (MAIN/NEXUS) entry handlers: enable audio, start in scene/journey/room, practice goals, mood/tag.
 * Single responsibility: zero-friction entry actions (vision §5 discoverability).
 * Extracted from WelcomeMainNexus for structure optimization (Branch C; LOC discipline).
 */

import type { Room } from "./roomRegistry";
import { getLastContentRoom } from "./sessionMemory";
import { ROOMS_WITH_RENDERERS } from "./roomRegistry";
import { RESONANCE_SCENES } from "../features/resonance/config/scenes";
import { filterScenes, getMoodsWithSceneCount, getTagsWithSceneCount, pickRandomScene } from "../features/resonance/config/sceneCatalog";
import { type PracticeGoalId } from "../domain/practiceGoals";
import { getTrainingFlows, type TrainingFlowId } from "../domain/trainingFlows";
import { getEntryWorldForJourney, getTrainingWorldJourneys, getAllWorldJourneys } from "../features/harmonicWorldSpine";
import { harmonicWorldSpineApi } from "../features/harmonicWorldSpineApi";
import type { HarmonicWorldExport } from "../domain/harmonicWorld";
import type { WorldJourney } from "../domain/worldGallery";
import type { ResonanceSceneId } from "../features/resonance/config/scenes";
import type { EnsureAudio } from "../shared/audio/audioInit";
import type { LaunchContext } from "../features/runtime/launch";
import { getLastPracticeSceneId } from "./practiceSessionMemory";
import {
  launchPracticeGoal,
  launchScene,
  launchTrainingFlow,
  launchRandomPracticeGoal,
  launchRandomTrainingFlow,
} from "../features/runtime/launch";

export type UseWelcomeMainNexusHandlersArgs = {
  setRoom: (r: Room) => void;
  initAudio: EnsureAudio;
  onSelectResonanceScene?: (sceneId: ResonanceSceneId) => void;
  onImportWorld?: (data: HarmonicWorldExport) => void;
};

/** Moods in display order (same as Shell "Start by mood"; vision §3 §5). */
const WELCOME_MOODS = getMoodsWithSceneCount().map((m) => m.mood);

export function useWelcomeMainNexusHandlers({
  setRoom,
  initAudio,
  onSelectResonanceScene,
  onImportWorld,
}: UseWelcomeMainNexusHandlersArgs) {
  const lastRoom = getLastContentRoom();

  const launchContext: LaunchContext = {
    initAudio,
    setRoom,
    onSelectResonanceScene,
    onImportWorld,
  };

  const handleStart = () => {
    void initAudio().then((ctx) => {
      if (ctx) setRoom("RESONANCE");
    });
  };

  const handleStartScene = (sceneId: ResonanceSceneId) => {
    void launchScene(sceneId, launchContext);
  };

  const handleStartPracticeGoal = (goalId: PracticeGoalId) => {
    void launchPracticeGoal(goalId, launchContext);
  };

  const handleStartByMood = (mood: string) => {
    const byMood = RESONANCE_SCENES.filter((s) => s.mood === mood);
    const scene = pickRandomScene((byMood.length > 0 ? byMood : RESONANCE_SCENES) as readonly (typeof RESONANCE_SCENES)[number][]);
    if (scene) handleStartScene(scene.id);
  };

  const handleStartByTag = (tag: string) => {
    const candidates = filterScenes({ tag });
    const pool = candidates.length > 0 ? candidates : [...RESONANCE_SCENES];
    const scene = pickRandomScene(pool);
    if (scene) handleStartScene(scene.id);
  };

  const handleStartTrainingFlow = (flowId: TrainingFlowId) => {
    void launchTrainingFlow(flowId, launchContext);
  };

  const handleSurprisePracticeGoal = () => {
    void launchRandomPracticeGoal(launchContext);
  };

  const handleSurpriseTrainingFlow = () => {
    void launchRandomTrainingFlow(launchContext);
  };

  const handleResumeLastRoom = () => {
    if (!lastRoom) return;
    void initAudio().then((ctx) => {
      if (ctx) setRoom(lastRoom);
    });
  };

  const handleSurpriseRoom = () => {
    const rooms = [...ROOMS_WITH_RENDERERS];
    if (rooms.length === 0) return;
    const room = rooms[Math.floor(Math.random() * rooms.length)];
    if (!room) return;
    void initAudio().then((ctx) => {
      if (ctx) setRoom(room);
    });
  };

  const handleStartJourney = (journey: WorldJourney) => {
    if (!onImportWorld) return;
    const entry = getEntryWorldForJourney(journey);
    if (!entry) return;
    void initAudio().then((ctx) => {
      if (ctx) {
        onImportWorld(entry);
        setRoom("RESONANCE");
      }
    });
  };

  const startableJourneys: WorldJourney[] = (() => {
    if (!onImportWorld) return [];
    const training = getTrainingWorldJourneys();
    const others = getAllWorldJourneys().filter((j) => !training.includes(j));
    const withEntry = (list: readonly WorldJourney[]) =>
      list.filter((j) => getEntryWorldForJourney(j) != null);
    const combined = [...withEntry(training), ...withEntry(others)];
    return combined.slice(0, 4);
  })();

  const lastPracticeScene = getLastPracticeSceneId();
  const nextPracticeEntry =
    lastPracticeScene != null
      ? harmonicWorldSpineApi.getNextSceneInAnyGoal(lastPracticeScene)
      : null;
  const lastPracticeGoals =
    lastPracticeScene != null
      ? harmonicWorldSpineApi.getPracticeGoalsForScene(lastPracticeScene)
      : [];
  const lastPracticeGoal = lastPracticeGoals[0] ?? null;
  const lastPracticeGoalScenes =
    lastPracticeGoal != null
      ? harmonicWorldSpineApi.getScenesForPracticeGoal(lastPracticeGoal.id)
      : [];

  return {
    handleStart,
    handleStartScene,
    handleStartPracticeGoal,
    handleStartByMood,
    handleStartByTag,
    handleStartTrainingFlow,
    handleSurprisePracticeGoal,
    handleSurpriseTrainingFlow,
    handleResumeLastRoom,
    handleSurpriseRoom,
    handleStartJourney,
    startableJourneys,
    lastPracticeGoal,
    lastPracticeGoalScenes,
    nextPracticeEntry,
    lastRoom,
    moods: WELCOME_MOODS,
    tagsWithCount: getTagsWithSceneCount(),
    trainingFlows: getTrainingFlows(),
    entryScenesForNewPlayer: harmonicWorldSpineApi.getEntryScenesForNewPlayer({ limit: 3 }),
  };
}
