/**
 * Platformer NPC scale and animal catalog: static profiles and anchor layout.
 * Single source for scale intervals, animal colors, tarot/disposition metadata, and level NPC placement.
 * Extracted from platformerNpcMusic for LOC discipline (STRUCTURE/REFLECTION: soft target policy ≤700).
 */

export type PlatformerScaleId =
  | "major"
  | "dorian"
  | "lydian"
  | "harmonic_minor"
  | "maqam_hijaz"
  | "chinese_pentatonic"
  | "whole_tone"
  | "yo_pentatonic";

export type PlatformerNpcAnimal =
  | "camel"
  | "panda"
  | "owl"
  | "fox"
  | "wolf"
  | "crane"
  | "frog"
  | "cat";

export type PlatformerNpcThrowStyle = "arc" | "fan" | "drift" | "skip";
export type PlatformerNpcDisposition = "guide" | "trickster" | "mirror";
export type PlatformerNpcTarotCard =
  | "magician"
  | "fool"
  | "hierophant"
  | "tower"
  | "star"
  | "justice"
  | "moon"
  | "devil";

export type PlatformerScaleProfile = {
  id: PlatformerScaleId;
  label: string;
  intervals: number[];
};

export type PlatformerAnimalProfile = {
  animal: PlatformerNpcAnimal;
  label: string;
  scaleId: PlatformerScaleId;
  color: string;
  throwStyle: PlatformerNpcThrowStyle;
  throwInterval: number;
  rootOffset: number;
  tarotCard: PlatformerNpcTarotCard;
  tarotTitle: string;
  modernRole: string;
  giftLabel: string;
  shadowLabel: string;
  lessonLabel: string;
  preferredDisposition: PlatformerNpcDisposition;
  guideBias: number;
  tricksterBias: number;
  mirrorBias: number;
};

const SCALE_LIBRARY: Record<PlatformerScaleId, PlatformerScaleProfile> = {
  major: { id: "major", label: "Dur", intervals: [0, 2, 4, 5, 7, 9, 11] },
  dorian: { id: "dorian", label: "Dorian", intervals: [0, 2, 3, 5, 7, 9, 10] },
  lydian: { id: "lydian", label: "Lydian", intervals: [0, 2, 4, 6, 7, 9, 11] },
  harmonic_minor: {
    id: "harmonic_minor",
    label: "Harmonic Minor",
    intervals: [0, 2, 3, 5, 7, 8, 11],
  },
  maqam_hijaz: {
    id: "maqam_hijaz",
    label: "Maqam Hijaz",
    intervals: [0, 1, 4, 5, 7, 8, 10],
  },
  chinese_pentatonic: {
    id: "chinese_pentatonic",
    label: "Chinese Pentatonic",
    intervals: [0, 2, 4, 7, 9],
  },
  whole_tone: { id: "whole_tone", label: "Whole Tone", intervals: [0, 2, 4, 6, 8, 10] },
  yo_pentatonic: { id: "yo_pentatonic", label: "Yo Pentatonic", intervals: [0, 2, 5, 7, 9] },
};

const ANIMAL_LIBRARY: Record<PlatformerNpcAnimal, PlatformerAnimalProfile> = {
  camel: {
    animal: "camel",
    label: "Camel",
    scaleId: "maqam_hijaz",
    color: "#f59e0b",
    throwStyle: "arc",
    throwInterval: 1.18,
    rootOffset: 0,
    tarotCard: "hierophant",
    tarotTitle: "Hierophant",
    modernRole: "Threshold Keeper",
    giftLabel: "ritual",
    shadowLabel: "dogma",
    lessonLabel: "decode foreign patterns",
    preferredDisposition: "mirror",
    guideBias: 0.36,
    tricksterBias: 0.18,
    mirrorBias: 0.46,
  },
  panda: {
    animal: "panda",
    label: "Panda",
    scaleId: "chinese_pentatonic",
    color: "#f1f5f9",
    throwStyle: "fan",
    throwInterval: 1.02,
    rootOffset: 2,
    tarotCard: "star",
    tarotTitle: "Star",
    modernRole: "Restorer",
    giftLabel: "hope",
    shadowLabel: "overprotection",
    lessonLabel: "recover momentum",
    preferredDisposition: "guide",
    guideBias: 0.72,
    tricksterBias: 0.08,
    mirrorBias: 0.2,
  },
  owl: {
    animal: "owl",
    label: "Owl",
    scaleId: "lydian",
    color: "#a78bfa",
    throwStyle: "drift",
    throwInterval: 1.36,
    rootOffset: 4,
    tarotCard: "moon",
    tarotTitle: "Moon",
    modernRole: "Dream Mirror",
    giftLabel: "intuition",
    shadowLabel: "projection",
    lessonLabel: "read the hidden route",
    preferredDisposition: "mirror",
    guideBias: 0.18,
    tricksterBias: 0.22,
    mirrorBias: 0.6,
  },
  fox: {
    animal: "fox",
    label: "Fox",
    scaleId: "harmonic_minor",
    color: "#fb7185",
    throwStyle: "skip",
    throwInterval: 0.94,
    rootOffset: -2,
    tarotCard: "devil",
    tarotTitle: "Devil",
    modernRole: "Temptation Broker",
    giftLabel: "desire",
    shadowLabel: "compulsion",
    lessonLabel: "spot the bait",
    preferredDisposition: "trickster",
    guideBias: 0.14,
    tricksterBias: 0.58,
    mirrorBias: 0.28,
  },
  wolf: {
    animal: "wolf",
    label: "Wolf",
    scaleId: "dorian",
    color: "#60a5fa",
    throwStyle: "arc",
    throwInterval: 1.24,
    rootOffset: 1,
    tarotCard: "tower",
    tarotTitle: "Tower",
    modernRole: "Shock Breaker",
    giftLabel: "release",
    shadowLabel: "shock",
    lessonLabel: "break repetition",
    preferredDisposition: "trickster",
    guideBias: 0.12,
    tricksterBias: 0.62,
    mirrorBias: 0.26,
  },
  crane: {
    animal: "crane",
    label: "Crane",
    scaleId: "yo_pentatonic",
    color: "#67e8f9",
    throwStyle: "fan",
    throwInterval: 1.12,
    rootOffset: 3,
    tarotCard: "justice",
    tarotTitle: "Justice",
    modernRole: "Balancer",
    giftLabel: "equilibrium",
    shadowLabel: "rigidity",
    lessonLabel: "correct the phrase",
    preferredDisposition: "mirror",
    guideBias: 0.28,
    tricksterBias: 0.18,
    mirrorBias: 0.54,
  },
  frog: {
    animal: "frog",
    label: "Frog",
    scaleId: "whole_tone",
    color: "#4ade80",
    throwStyle: "drift",
    throwInterval: 0.88,
    rootOffset: -1,
    tarotCard: "fool",
    tarotTitle: "Fool",
    modernRole: "Wild Leaper",
    giftLabel: "play",
    shadowLabel: "carelessness",
    lessonLabel: "jump offbeat",
    preferredDisposition: "trickster",
    guideBias: 0.18,
    tricksterBias: 0.48,
    mirrorBias: 0.34,
  },
  cat: {
    animal: "cat",
    label: "Cat",
    scaleId: "major",
    color: "#fcd34d",
    throwStyle: "skip",
    throwInterval: 1.05,
    rootOffset: 0,
    tarotCard: "magician",
    tarotTitle: "Magician",
    modernRole: "Initiator",
    giftLabel: "intent",
    shadowLabel: "manipulation",
    lessonLabel: "shape the opening",
    preferredDisposition: "guide",
    guideBias: 0.52,
    tricksterBias: 0.18,
    mirrorBias: 0.3,
  },
};

export type NpcAnchor = {
  platformId: string;
  animal: PlatformerNpcAnimal;
  side?: "left" | "right" | "center";
  yLift?: number;
  direction?: 1 | -1;
};

export const NPC_ANCHORS: NpcAnchor[] = [
  { platformId: "start", animal: "cat", side: "right", yLift: 28, direction: 1 },
  { platformId: "plateau-1", animal: "frog", side: "left", yLift: 28, direction: 1 },
  { platformId: "plateau-2", animal: "camel", side: "right", yLift: 30, direction: 1 },
  { platformId: "fork-1-base", animal: "wolf", side: "center", yLift: 34, direction: 1 },
  { platformId: "merge-1", animal: "panda", side: "center", yLift: 28, direction: -1 },
  { platformId: "mid-1", animal: "crane", side: "right", yLift: 34, direction: -1 },
  { platformId: "mid-2", animal: "owl", side: "left", yLift: 34, direction: 1 },
  { platformId: "finish-platform", animal: "fox", side: "right", yLift: 32, direction: -1 },
];

export function getPlatformerScaleProfile(scaleId: PlatformerScaleId): PlatformerScaleProfile {
  return SCALE_LIBRARY[scaleId];
}

export function getPlatformerAnimalProfile(animal: PlatformerNpcAnimal): PlatformerAnimalProfile {
  return ANIMAL_LIBRARY[animal];
}
