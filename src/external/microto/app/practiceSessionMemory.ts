import type { ResonanceSceneId } from "../features/resonance/config/scenes";

const STORAGE_KEY = "xensonar_last_practice_scene";

export function getLastPracticeSceneId(): ResonanceSceneId | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return raw as ResonanceSceneId;
  } catch {
    return null;
  }
}

export function setLastPracticeSceneId(sceneId: ResonanceSceneId): void {
  try {
    localStorage.setItem(STORAGE_KEY, sceneId);
  } catch {
    // Ignore storage errors (private mode, quota, etc.)
  }
}

