import {
  type HarmonicWorld,
  type HarmonicWorldExport,
  exportHarmonicWorld,
} from "./harmonicWorld";

/**
 * Small curated gallery of harmonic worlds.
 *
 * These are intentionally simple, authored snapshots that can be loaded
 * through the existing world import path (Copy/Download/Paste/Load world).
 * They are meant as quick starting points and examples, not an exhaustive catalog.
 */

const GALLERY_BASE_WORLDS: HarmonicWorld[] = [
  {
    id: "ji-commons-practice-space",
    label: "JI · Commons Practice Space",
    description:
      "Just Intonation practice orbit tuned for Commons and Arena: warm pad grid with gentle chimes on a steady 16tel groove.",
    baseFreq: 220,
    gridTuning: "ji",
    quantizeOn: true,
    quantizeBpm: 92,
    quantizeSubdivision: "16",
    tags: ["Just Intonation", "Commons", "Practice", "Groove"],
    profile: { intensity: "balanced" },
    mood: "Practice",
  },
  {
    id: "ji-commons-wash-orbit",
    label: "JI · Commons Wash Orbit",
    description:
      "Just Intonation wash orbit for Commons: warm pad chords and slow chimes on a 16tel wash grid for shared-field listening.",
    baseFreq: 220,
    gridTuning: "ji",
    quantizeOn: true,
    quantizeBpm: 76,
    quantizeSubdivision: "16",
    tags: ["Just Intonation", "Commons", "Wash", "Practice"],
    profile: { intensity: "balanced" },
    mood: "Warm",
  },
  {
    id: "ji-warm-constellation",
    label: "JI · Warm Constellation",
    description: "Just Intonation drone with balanced groove and constellation-friendly density.",
    baseFreq: 220,
    gridTuning: "ji",
    quantizeOn: true,
    quantizeBpm: 96,
    quantizeSubdivision: "16",
    tags: ["Just Intonation", "Groove", "Constellation"],
    profile: { intensity: "balanced" },
    mood: "Warm",
  },
  {
    id: "bp-wash-orbit",
    label: "BP · Wash Orbit",
    description: "Non-octave Bohlen–Pierce wash with dense rhythmic texture.",
    baseFreq: 330,
    gridTuning: "bp",
    quantizeOn: true,
    quantizeBpm: 120,
    quantizeSubdivision: "64",
    tags: ["Bohlen–Pierce", "Non-octave", "Wash"],
    profile: { intensity: "dense" },
    mood: "Ethereal",
  },
  {
    id: "bp-glass-halo",
    label: "BP · Glass Halo",
    description:
      "Introductory Bohlen–Pierce glass halo world: a clear 32tel grid with gentle motion for hearing the non-octave colours before stepping into denser motion worlds.",
    baseFreq: 330,
    gridTuning: "bp",
    quantizeOn: true,
    quantizeBpm: 84,
    quantizeSubdivision: "32",
    tags: ["Bohlen–Pierce", "Intro", "Glass", "Practice"],
    profile: { intensity: "light" },
    mood: "Ethereal",
  },
  {
    id: "bp-lantern-run",
    label: "BP · Lantern Run",
    description:
      "Non-octave Bohlen–Pierce lantern pulses tuned for motion: a clear 16tel grid that pairs naturally with Arena and Jump Run rooms.",
    baseFreq: 330,
    gridTuning: "bp",
    quantizeOn: true,
    quantizeBpm: 102,
    quantizeSubdivision: "16",
    tags: ["Bohlen–Pierce", "Arena", "Platformer", "Practice"],
    profile: { intensity: "balanced" },
    mood: "Rhythmic",
  },
  {
    id: "19edo-light-lattice",
    label: "19-EDO · Light Lattice",
    description: "Light-touch 19-EDO lattice with free-time feel for exploratory play.",
    baseFreq: 261.63,
    gridTuning: "19edo",
    quantizeOn: false,
    quantizeBpm: 110,
    quantizeSubdivision: "32",
    tags: ["19-EDO", "Microtonal", "Free-time"],
    profile: { intensity: "light" },
    mood: "Exploratory",
  },
  {
    id: "19edo-training-orbit",
    label: "19-EDO · Training Orbit",
    description:
      "19-EDO motion-training world at mid register: a clear 32tel human grid tuned for precise, repeatable ladder practice that bridges the 12-EDO reference and 19-EDO drift orbits.",
    baseFreq: 220,
    gridTuning: "19edo",
    quantizeOn: true,
    quantizeBpm: 100,
    quantizeSubdivision: "32",
    tags: ["19-EDO", "Ladder", "Training", "Arena", "Platformer"],
    profile: { intensity: "balanced" },
    mood: "Training",
  },
  {
    id: "22edo-arena-pulsefield",
    label: "22-EDO · Arena Pulsefield",
    description:
      "22-EDO copper pulses on a steady 16tel grid; tuned as a clear rhythmic practice orbit that still reveals quarter-tone colour.",
    baseFreq: 220,
    gridTuning: "22edo",
    quantizeOn: true,
    quantizeBpm: 104,
    quantizeSubdivision: "16",
    tags: ["22-EDO", "Arena", "Practice", "Pulse"],
    profile: { intensity: "balanced" },
    mood: "Rhythmic",
  },
  {
    id: "22edo-training-bridge",
    label: "22-EDO · Training Bridge",
    description:
      "22-EDO training bridge at mid register: a clear 32tel human grid that makes it easy to hear and repeat quarter-tone steps when coming from the 12-EDO reference orbit.",
    baseFreq: 220,
    gridTuning: "22edo",
    quantizeOn: true,
    quantizeBpm: 96,
    quantizeSubdivision: "32",
    tags: ["22-EDO", "Ladder", "Training"],
    profile: { intensity: "balanced" },
    mood: "Training",
  },
  {
    id: "22edo-commons-wash-ladder",
    label: "22-EDO · Commons Wash Ladder",
    description:
      "22-EDO commons wash world: copper bell chords and shimmer particles over a 16tel wash grid tuned for shared-field quarter-tone practice and gentle motion.",
    baseFreq: 220,
    gridTuning: "22edo",
    quantizeOn: true,
    quantizeBpm: 84,
    quantizeSubdivision: "16",
    tags: ["22-EDO", "Commons", "Wash", "Practice"],
    profile: { intensity: "balanced" },
    mood: "Warm",
  },
  {
    id: "31edo-training-orbit",
    label: "31-EDO · Training Orbit",
    description:
      "31-EDO motion-training world: a clear 32tel human grid at mid register tuned for precise, repeatable ladder practice in Arena and Platformer.",
    baseFreq: 220,
    gridTuning: "31edo",
    quantizeOn: true,
    quantizeBpm: 104,
    quantizeSubdivision: "32",
    tags: ["31-EDO", "Arena", "Platformer", "Practice"],
    profile: { intensity: "balanced" },
    mood: "Training",
  },
  {
    id: "17edo-training-ladder",
    label: "17-EDO · Training Ladder",
    description:
      "17-EDO ladder-training world at mid register: a clear 32tel human grid tuned for precise, repeatable microtonal step practice that bridges familiar 12-EDO and Just Intonation colours.",
    baseFreq: 220,
    gridTuning: "17edo",
    quantizeOn: true,
    quantizeBpm: 96,
    quantizeSubdivision: "32",
    tags: ["17-EDO", "Ladder", "Training"],
    profile: { intensity: "balanced" },
    mood: "Training",
  },
  {
    id: "tuninglab-reference-orbit",
    label: "Tuning Lab · Reference Orbit",
    description:
      "Neutral reference world for tuning experiments: steady 12-EDO grid at concert A with gentle wash for comparing JI, EDOs, and BP scenes.",
    baseFreq: 440,
    gridTuning: "12edo",
    quantizeOn: true,
    quantizeBpm: 96,
    quantizeSubdivision: "16",
    tags: ["Tuning Lab", "Reference", "12-EDO"],
    profile: { intensity: "balanced" },
    mood: "Neutral",
  },
  {
    id: "ji-interval-ear-orbit",
    label: "JI · Interval Ear Orbit",
    description:
      "Ear-training Just Intonation world: calm wash grid with minimal motion so pure intervals and small tuning bends stay in focus.",
    baseFreq: 220,
    gridTuning: "ji",
    quantizeOn: true,
    quantizeBpm: 72,
    quantizeSubdivision: "16",
    tags: ["Just Intonation", "Ear training", "Intervals", "Practice"],
    profile: { intensity: "light" },
    mood: "Training",
  },
];

export const WORLD_GALLERY: HarmonicWorldExport[] = GALLERY_BASE_WORLDS.map((world) =>
  exportHarmonicWorld(world),
);

export type WorldJourney = {
  id: string;
  label: string;
  description: string;
  /**
   * Ordered list of world ids that belong to this journey.
   * Buttons in the shell HUD currently use the first world as the entry point,
   * but the full sequence is kept here so future slices can build richer flows.
   */
  worldIds: string[];
  /**
   * Optional classification for this journey. When set, "training" journeys
   * are used by spine helpers and UI surfaces to highlight practice-oriented
   * flows without relying on id/label string heuristics.
   */
  kind?: "training" | "exploration" | "comparison";
};

export const WORLD_JOURNEYS: WorldJourney[] = [
  {
    id: "reference-ji-19edo",
    label: "Reference → JI → 19-EDO",
    description:
      "Start from a neutral 12-EDO reference orbit, then step into a warm JI constellation and a light 19-EDO lattice to hear how tuning bends the same grid.",
    worldIds: ["tuninglab-reference-orbit", "ji-warm-constellation", "19edo-light-lattice"],
  },
  {
    id: "ji-practice-motion",
    label: "JI Practice → Motion Rooms",
    description:
      "Start in a steady Just Intonation practice space, then carry that same harmonic world into motion rooms for Arena/Platformer practice and shared-field play.",
    worldIds: ["ji-commons-practice-space", "22edo-arena-pulsefield", "bp-lantern-run"],
  },
  {
    id: "reference-to-bp",
    label: "Reference → BP",
    description:
      "Begin in the 12-EDO reference orbit, then jump into a dense Bohlen–Pierce wash orbit to compare octave-based and non-octave harmonic worlds.",
    worldIds: ["tuninglab-reference-orbit", "bp-wash-orbit"],
  },
  {
    id: "arena-commons-platformer",
    label: "Arena → Commons → Platformer",
    description:
      "Walk a rhythmic path: start in a 22-EDO arena pulsefield, cool down in a shared JI commons wash, then listen to the same world drive the Jump Run soundtrack.",
    worldIds: ["22edo-arena-pulsefield", "ji-warm-constellation", "tuninglab-reference-orbit"],
  },
  {
    id: "reference-bp-intro",
    label: "Reference → BP Intro",
    description:
      "Start in the neutral 12-EDO reference orbit, then move into a gentle Bohlen–Pierce glass halo before stepping into the BP lantern run motion world.",
    worldIds: ["tuninglab-reference-orbit", "bp-glass-halo", "bp-lantern-run"],
    kind: "training",
  },
  {
    id: "bp-motion-training",
    label: "BP Motion Training",
    description:
      "Train motion in the non-octave Bohlen–Pierce world: start with a clear 16tel BP Lantern Run orbit, then move into a denser BP Wash Orbit for flowing, high-density practice.",
    worldIds: ["bp-lantern-run", "bp-wash-orbit"],
    kind: "training",
  },
  {
    id: "reference-31edo-training",
    label: "Reference → 31-EDO Training",
    description:
      "Start in the neutral 12-EDO reference orbit, then step into a 31-EDO training world tuned for precise ladder practice that carries into Arena and Platformer.",
    worldIds: ["tuninglab-reference-orbit", "31edo-training-orbit"],
    kind: "training",
  },
  {
    id: "reference-22edo-bridge",
    label: "Reference → 22-EDO Bridge",
    description:
      "Begin in the neutral 12-EDO reference orbit, then move into a 22-EDO training bridge world before stepping into the 22-EDO arena pulsefield for motion practice.",
    worldIds: [
      "tuninglab-reference-orbit",
      "22edo-training-bridge",
      "22edo-commons-wash-ladder",
      "22edo-arena-pulsefield",
    ],
    kind: "training",
  },
  {
    id: "reference-17edo-ladder",
    label: "Reference → 17-EDO Ladder",
    description:
      "Start in the neutral 12-EDO reference orbit, then move into a 17-EDO training ladder world to feel microtonal steps between familiar semitones before carrying the same shapes into motion rooms.",
    worldIds: ["tuninglab-reference-orbit", "17edo-training-ladder"],
    kind: "training",
  },
  {
    id: "reference-19edo-training",
    label: "Reference → 19-EDO Training",
    description:
      "Start in the neutral 12-EDO reference orbit, then move into a 19-EDO training orbit tuned for microtonal ladder practice before exploring freer 19-EDO drift worlds.",
    worldIds: ["tuninglab-reference-orbit", "19edo-training-orbit", "19edo-light-lattice"],
    kind: "training",
  },
];

export function getJourneysForWorldId(worldId: string | null | undefined): WorldJourney[] {
  if (!worldId) return [];
  return WORLD_JOURNEYS.filter((journey) => journey.worldIds.includes(worldId));
}



