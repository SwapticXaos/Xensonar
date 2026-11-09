/**
 * Platformer arrangement types and small pure utils.
 * Extracted from platformerArrangement for structure optimization (LOC discipline, single-responsibility).
 */
import { clamp } from "../../shared/tuning/grid";
import type { PlatformerRouteProfile } from "./platformerRouteProfile";
import type { PlatformerRouteOrchestration } from "./platformerRouteOrchestration";

export const LOOP_STEPS = 64;
export const BAR_COUNT = 8;
/** Max movement events kept in capture and preset (single source for capture + sanitize parity). */
export const MAX_MOVEMENT_EVENTS = 640;
/** Intro pattern length (8 bars × 8 steps). */
export const COMPLETION_INTRO_STEPS = 64;

export type PlatformerArrangementMode = "balanced" | "cinematic" | "percussive" | "glitch";
export type PlatformerArrangementForm = "auto" | "aaba" | "abab" | "abca" | "abcb" | "abac";
export type PlatformerAuditionSection = "A" | "B" | "C";
export type MovementEventKind =
  | "motion"
  | "step"
  | "jump"
  | "land"
  | "coin"
  | "npc_orb"
  | "mode_shift"
  | "puzzle_step"
  | "gate_unlock"
  | "checkpoint"
  | "fall"
  | "turn"
  | "sync_gate"
  | "phase_gate"
  | "tuning_crystal"
  | "chord_fork"
  | "silence_field";

export type MovementEvent = {
  kind: MovementEventKind;
  semi: number;
  energy: number;
  t: number;
  lane: number;
  airborne: boolean;
  ordinal?: number;
  detail?: number;
};

export type CompletionPattern = {
  lengthSteps: number;
  lead: Array<number | null>;
  arp: Array<number | null>;
  bass: Array<number | null>;
  kick: boolean[];
  snare: boolean[];
  hat: boolean[];
  accent: number[];
  barRoots: number[];
  barChords: number[][];
  ghost: boolean[];
  tension: number[];
  swing: number;
  density: number;
  airRatio: number;
};

export type CompletionTheme = {
  groundMotif: number[];
  airMotif: number[];
  accentMotif: number[];
  cadenceMotif: number[];
  rootContour: number[];
  strideDensity: number;
  airDensity: number;
  accentDensity: number;
  laneCenter: number;
  syncDensity: number;
  phaseWeights: [number, number, number];
  tuningBias: number;
  forkBias: number;
  restDensity: number;
  routeProfile: PlatformerRouteProfile;
  routeOrchestration: PlatformerRouteOrchestration;
};

export type CompletionIntroPattern = {
  lengthSteps: number;
  lead: Array<number | null>;
  answer: Array<number | null>;
  bass: Array<number | null>;
  accent: number[];
  chordRoots: number[];
};

export type CompletionArrangement = {
  sections: CompletionPattern[];
  order: number[];
  sectionLengthSteps: number;
  formLabel: string;
  targetBpm: number;
  complexity: number;
  seed: number;
  theme: CompletionTheme;
};

export const clampSemi = (semi: number) => Math.round(clamp(semi, -24, 36));
export const clampPhaseIndex = (detail: number) => Math.min(2, Math.max(0, Math.round(detail)));

export const dominantPhaseIndex = (phaseWeights: [number, number, number]) => {
  let bestIndex = 0;
  let bestScore = phaseWeights[0];
  for (let index = 1; index < phaseWeights.length; index += 1) {
    if (phaseWeights[index] > bestScore) {
      bestScore = phaseWeights[index];
      bestIndex = index;
    }
  }
  return bestIndex;
};
