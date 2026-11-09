/**
 * Harmonic world spine — practice goal navigation (next scene in goal).
 * Single responsibility: goal-based "next scene" for discoverability (vision §5).
 * Re-exported by harmonicWorldSpine so callers keep a single import surface.
 */
import { getSceneById } from "./resonance/config/scenes";
import type { ResonanceSceneId } from "./resonance/config/scenes";
import type { ResonanceScene } from "./resonance/config/scenes";
import { getPracticeGoals, getPracticeScenesForGoal } from "../domain/practiceGoals";
import type { PracticeGoal, PracticeGoalId } from "../domain/practiceGoals";

/**
 * Returns the next scene in a practice goal's sequence after the current scene.
 * Use this to offer "Next in [goal]" so users can step through a goal (e.g. ladder 12→17→19→22→31).
 * Returns null if current is not in the goal, is the last scene, or goal has no scenes.
 */
export function getNextSceneInPracticeGoal(
  goalId: PracticeGoalId,
  currentSceneId: ResonanceSceneId | null,
): ResonanceScene | null {
  if (!currentSceneId) return null;
  const sceneIds = getPracticeScenesForGoal(goalId);
  const idx = sceneIds.indexOf(currentSceneId);
  if (idx < 0 || idx >= sceneIds.length - 1) return null;
  const nextId = sceneIds[idx + 1];
  return getSceneById(nextId);
}

/**
 * Finds the first practice goal (in PRACTICE_GOALS order) that contains the current scene
 * and has a next scene in sequence. Returns that goal and the next scene for one-click
 * "Next in goal" UX (vision §5 discoverability).
 */
export function getNextSceneInAnyGoal(
  currentSceneId: ResonanceSceneId | null,
): { goal: PracticeGoal; nextScene: ResonanceScene } | null {
  if (!currentSceneId) return null;
  const goals = getPracticeGoals();
  for (const goal of goals) {
    const next = getNextSceneInPracticeGoal(goal.id, currentSceneId);
    if (next) return { goal, nextScene: next };
  }
  return null;
}
