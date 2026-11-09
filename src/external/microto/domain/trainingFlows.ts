export type TrainingFlowId =
  | "reference-17edo-ladder"
  | "reference-19edo-training"
  | "reference-22edo-bridge"
  | "reference-31edo-training"
  | "reference-bp-intro"
  | "bp-motion-training"
  | "reference-22edo-commons-wash"
  | "reference-multi-edo-spiral"
  | "bp-reflection-journey";

export type TrainingFlow = {
  id: TrainingFlowId;
  label: string;
  description: string;
  /**
   * Optional weight used when randomly picking a training flow (e.g. Surprise flow).
   * Higher weight increases likelihood; defaults to 1 when omitted.
   */
  weight?: number;
  /**
   * Ordered list of Resonance scene ids that form this ladder.
   * The first scene is treated as the entry point.
   */
  sceneIds: import("../features/resonance/config/scenes").ResonanceSceneId[];
};

export const TRAINING_FLOWS: TrainingFlow[] = [
  {
    id: "reference-17edo-ladder",
    label: "Reference → 17-EDO Ladder",
    description:
      "Start in the neutral 12-EDO reference orbit, then step into a 17-EDO training ladder world to feel microtonal steps between familiar semitones.",
    sceneIds: ["edo12_reference_orbit", "edo17_training_ladder"],
    weight: 1.2,
  },
  {
    id: "reference-19edo-training",
    label: "Reference → 19-EDO Training",
    description:
      "Begin in the 12-EDO reference orbit, then move into a 19-EDO training orbit tuned for repeatable ladder practice.",
    sceneIds: ["edo12_reference_orbit", "edo19_training_orbit"],
    weight: 1.1,
  },
  {
    id: "reference-22edo-bridge",
    label: "Reference → 22-EDO Bridge",
    description:
      "Start from a neutral 12-EDO reference, then step into a 22-EDO training bridge world before exploring motion rooms.",
    sceneIds: ["edo12_reference_orbit", "edo22_training_bridge"],
    weight: 1,
  },
  {
    id: "reference-22edo-commons-wash",
    label: "Reference → 22-EDO Commons Wash",
    description:
      "Start from the 12-EDO reference orbit, then move into a 22-EDO commons wash ladder world before exploring motion rooms.",
    sceneIds: ["edo12_reference_orbit", "edo22_commons_wash_ladder", "edo22_arena_pulsefield"],
    weight: 1.1,
  },
  {
    id: "reference-31edo-training",
    label: "Reference → 31-EDO Training",
    description:
      "Move from the 12-EDO reference orbit into a 31-EDO training world tuned for precise ladder practice.",
    sceneIds: ["edo12_reference_orbit", "edo31_training_orbit"],
    weight: 1,
  },
  {
    id: "reference-bp-intro",
    label: "Reference → BP Intro",
    description:
      "Begin in the 12-EDO reference orbit, then move into a gentle Bohlen–Pierce glass halo before stepping into the BP lantern run practice world.",
    sceneIds: ["edo12_reference_orbit", "bp_glass_halo", "bp_lantern_run"],
    weight: 1.3,
  },
  {
    id: "bp-motion-training",
    label: "BP Motion Training",
    description:
      "Train motion in the non-octave Bohlen–Pierce world: start in a clear 16tel lantern run, then move into a dense constellation polyrhythm.",
    sceneIds: ["bp_lantern_run", "bp_constellation_polyrhythm"],
    weight: 1.1,
  },
  {
    id: "reference-multi-edo-spiral",
    label: "Reference → Multi-EDO Spiral",
    description:
      "Walk a slow spiral from the 12-EDO reference orbit through 17-, 19-, 22- and 31-EDO training worlds to feel how each system bends the familiar octave grid.",
    sceneIds: [
      "edo12_reference_orbit",
      "edo17_training_ladder",
      "edo19_training_orbit",
      "edo22_training_bridge",
      "edo31_training_orbit",
    ],
    weight: 0.9,
  },
  {
    id: "bp-reflection-journey",
    label: "BP Reflection Journey",
    description:
      "A quiet three-part Bohlen–Pierce reflection: move from a soft morning meditation, through a clear noon exploration, into a deep evening meditation wash.",
    sceneIds: ["bp_morning_meditation", "bp_noon_exploration", "bp_evening_meditation"],
    weight: 1,
  },
];

export function getTrainingFlows(): readonly TrainingFlow[] {
  return TRAINING_FLOWS;
}

export function getTrainingFlowsForScene(
  sceneId: import("../features/resonance/config/scenes").ResonanceSceneId | null | undefined,
): readonly TrainingFlow[] {
  if (!sceneId) return [];
  return TRAINING_FLOWS.filter((flow) => flow.sceneIds.includes(sceneId));
}


