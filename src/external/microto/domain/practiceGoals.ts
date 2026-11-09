import type { ResonanceSceneId } from "../features/resonance/config/scenes";

export type PracticeGoalId =
  | "ladder_training"
  | "motion_training"
  | "ear_training"
  | "ambient_exploration"
  | "non_octave_bp_exploration";

export type PracticeGoal = {
  id: PracticeGoalId;
  label: string;
  description: string;
  /**
   * Optional weight used when randomly picking a goal (e.g. Surprise goal).
   * Higher weight increases likelihood; defaults to 1 when omitted.
   */
  weight?: number;
  /**
   * Ordered list of Resonance scene ids that best represent this goal.
   * The first entry is treated as the typical entry scene.
   */
  sceneIds: ResonanceSceneId[];
};

/**
 * Curated set of high-level practice goals that group scenes
 * into meaningful training and exploration flows.
 *
 * These are intentionally small and opinionated; callers can
 * map them to scenes and worlds using existing scene catalogs
 * and the harmonic world spine.
 */
export const PRACTICE_GOALS: PracticeGoal[] = [
  {
    id: "ladder_training",
    label: "Ladder training",
    description: "Step through tuned ladders that bridge the 12‑EDO reference into 17‑, 19‑, 22‑ and 31‑EDO systems.",
    weight: 1.2,
    sceneIds: [
      "edo12_reference_orbit",
      "edo17_training_ladder",
      "edo19_training_orbit",
      "edo22_training_bridge",
      "edo31_training_orbit",
    ],
  },
  {
    id: "motion_training",
    label: "Motion practice",
    description: "Practice rhythmic motion in worlds tuned for Arena and Platformer rooms.",
    weight: 1,
    sceneIds: ["bp_lantern_run", "edo22_arena_pulsefield", "edo19_string_swell_polyrhythm"],
  },
  {
    id: "ear_training",
    label: "Ear training (intervals)",
    description: "Listen for pure intervals and small tuning bends in Just Intonation and nearby EDO worlds.",
    weight: 1.4,
    sceneIds: [
      "ji_warm_pad_groove",
      "ji_commons_practice_space",
      "ji_commons_wash_orbit",
      "edo22_commons_wash_ladder",
      "ji_interval_ear_orbit",
    ],
  },
  {
    id: "ambient_exploration",
    label: "Ambient exploration",
    description: "Slow, spacious worlds for exploratory listening and gentle cursor wandering.",
    weight: 0.9,
    sceneIds: ["ji_slow_lanterns", "ji_ember_night_bridge", "bp_glass_halo", "ji_noon_exploration"],
  },
  {
    id: "non_octave_bp_exploration",
    label: "Non-octave BP exploration",
    description:
      "Explore the Bohlen–Pierce world from gentle glass halos into motion-ready lantern runs and dense constellations.",
    weight: 1,
    sceneIds: ["bp_glass_halo", "bp_noon_exploration", "bp_lantern_run", "bp_constellation_polyrhythm"],
  },
];

export function getPracticeGoals(): readonly PracticeGoal[] {
  return PRACTICE_GOALS;
}

export function getPracticeScenesForGoal(goalId: PracticeGoalId): readonly ResonanceSceneId[] {
  const goal = PRACTICE_GOALS.find((g) => g.id === goalId);
  return goal ? goal.sceneIds : [];
}

