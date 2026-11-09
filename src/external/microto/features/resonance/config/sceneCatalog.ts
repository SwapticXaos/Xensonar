import {
  RESONANCE_SCENES,
  type ResonanceScene,
  type ResonanceSceneDifficulty,
} from "./scenesData";

export function getSceneMoods(): string[] {
  const moods = RESONANCE_SCENES.map((s) => s.mood).filter(
    (mood): mood is string => typeof mood === "string" && mood.trim().length > 0,
  );
  return Array.from(new Set(moods)).sort((a, b) => a.localeCompare(b));
}

/** Display order for mood pills in quick-start surfaces (discoverability). */
const MOOD_DISPLAY_ORDER = [
  "Meditative",
  "Exploratory",
  "Warm",
  "Training",
  "Rhythmic",
  "Ethereal",
  "Calm",
  "Reflective",
  "Gentle",
  "Precise",
  "Neutral",
] as const;

/**
 * Returns moods that have at least one scene, with counts, in a stable display order.
 * Use for "Start by mood" and other mood-based quick-start UI (vision §5 discoverability).
 */
export function getMoodsWithSceneCount(): { mood: string; count: number }[] {
  const byMood = new Map<string, number>();
  for (const scene of RESONANCE_SCENES) {
    const mood = scene.mood;
    if (typeof mood === "string" && mood.trim().length > 0) {
      byMood.set(mood, (byMood.get(mood) ?? 0) + 1);
    }
  }
  const ordered: { mood: string; count: number }[] = [];
  const orderedSet = new Set<string>();
  for (const mood of MOOD_DISPLAY_ORDER) {
    const count = byMood.get(mood);
    if (count != null) {
      ordered.push({ mood, count });
      orderedSet.add(mood);
    }
  }
  const remaining = Array.from(byMood.entries())
    .filter(([mood]) => !orderedSet.has(mood))
    .sort((a, b) => a[0].localeCompare(b[0]));
  for (const [mood, count] of remaining) {
    ordered.push({ mood, count });
  }
  return ordered;
}

export function getSceneTags(): string[] {
  const tags: string[] = [];
  for (const scene of RESONANCE_SCENES) {
    if (!scene.tags) continue;
    for (const tag of scene.tags) {
      if (typeof tag === "string" && tag.trim().length > 0) {
        tags.push(tag);
      }
    }
  }
  return Array.from(new Set(tags)).sort((a, b) => a.localeCompare(b));
}

/** Display order for tag pills in "Explore by tag" (vision §5 discoverability; high-signal tags first). */
const TAG_DISPLAY_ORDER = [
  "JI",
  "wash",
  "meditative",
  "Calm",
  "late-night",
  "early-morning",
  "exploratory",
  "training",
] as const;

/**
 * Returns tags that have at least one scene, with counts, in a stable display order.
 * Use for "Explore by tag" strip and other tag-based discovery (vision §3 §5).
 */
export function getTagsWithSceneCount(): { tag: string; count: number }[] {
  const byTag = new Map<string, number>();
  for (const scene of RESONANCE_SCENES) {
    if (!scene.tags) continue;
    for (const tag of scene.tags) {
      if (typeof tag === "string" && tag.trim().length > 0) {
        byTag.set(tag, (byTag.get(tag) ?? 0) + 1);
      }
    }
  }
  const ordered: { tag: string; count: number }[] = [];
  const orderedSet = new Set<string>();
  for (const t of TAG_DISPLAY_ORDER) {
    const count = byTag.get(t);
    if (count != null) {
      ordered.push({ tag: t, count });
      orderedSet.add(t);
    }
  }
  const remaining = Array.from(byTag.entries())
    .filter(([tag]) => !orderedSet.has(tag))
    .sort((a, b) => b[1] - a[1]); // desc by count, then tag name
  for (const [tag, count] of remaining) {
    ordered.push({ tag, count });
  }
  return ordered;
}

export function getSceneDifficulties(): ResonanceSceneDifficulty[] {
  const difficulties = RESONANCE_SCENES.map((s) => s.difficulty).filter(
    (difficulty): difficulty is ResonanceSceneDifficulty =>
      typeof difficulty === "string" && difficulty.trim().length > 0,
  );
  // Preserve a stable canonical order for UI pills.
  const order: ResonanceSceneDifficulty[] = ["Intro", "Intermediate", "Advanced"];
  const unique = Array.from(new Set(difficulties));
  return unique.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/** Canonical order for difficulty pills (Intro → Intermediate → Advanced). */
const DIFFICULTY_DISPLAY_ORDER: ResonanceSceneDifficulty[] = ["Intro", "Intermediate", "Advanced"];

/**
 * Returns difficulties that have at least one scene, with counts, in stable order.
 * Use for "Start by difficulty" and other level-based quick-start UI (vision §5 practice-oriented discoverability).
 */
export function getDifficultiesWithSceneCount(): {
  difficulty: ResonanceSceneDifficulty;
  count: number;
}[] {
  const byDiff = new Map<ResonanceSceneDifficulty, number>();
  for (const scene of RESONANCE_SCENES) {
    const d = scene.difficulty;
    if (d === "Intro" || d === "Intermediate" || d === "Advanced") {
      byDiff.set(d, (byDiff.get(d) ?? 0) + 1);
    }
  }
  return DIFFICULTY_DISPLAY_ORDER.filter((d) => (byDiff.get(d) ?? 0) > 0).map((difficulty) => ({
    difficulty,
    count: byDiff.get(difficulty) ?? 0,
  }));
}

export function filterScenes(opts: {
  mood?: string | null;
  tag?: string | null;
  difficulty?: ResonanceSceneDifficulty | null;
}): ResonanceScene[] {
  const { mood, tag, difficulty } = opts;
  return RESONANCE_SCENES.filter((scene) => {
    if (mood && scene.mood !== mood) {
      return false;
    }
    if (tag && (!scene.tags || !scene.tags.includes(tag))) {
      return false;
    }
    if (difficulty && scene.difficulty !== difficulty) {
      return false;
    }
    return true;
  });
}

export function pickRandomScene(scenes: readonly ResonanceScene[]): ResonanceScene | null {
  if (scenes.length === 0) return null;
  const index = Math.floor(Math.random() * scenes.length);
  return scenes[index] ?? null;
}

/**
 * Convenience helper for training flows:
 * returns all scenes whose mood is "Training" or whose tags include "training",
 * optionally limited to the first `limit` entries in catalog order.
 */
export function getTrainingScenes(limit?: number): ResonanceScene[] {
  const trainingScenes = RESONANCE_SCENES.filter((scene) => {
    if (scene.mood === "Training") return true;
    if (!scene.tags) return false;
    return scene.tags.some((tag) => tag.toLowerCase() === "training");
  });
  if (typeof limit === "number" && limit >= 0) {
    return trainingScenes.slice(0, limit);
  }
  return trainingScenes;
}

/**
 * Convenience helper for onboarding and quick-start surfaces:
 * returns all Intro scenes, optionally limited to the first `limit`
 * entries in catalog order.
 */
export function getIntroScenes(limit?: number): ResonanceScene[] {
  const introScenes = RESONANCE_SCENES.filter((scene) => scene.difficulty === "Intro");
  if (typeof limit === "number" && limit >= 0) {
    return introScenes.slice(0, limit);
  }
  return introScenes;
}
