/**
 * HUD state factory and type for platformer room.
 * Single source for reset HUD shape and PlatformerHudState type; reduces duplication.
 * PlatformerHudState moved from platformerTick for clearer module boundaries (STRUCTURE).
 */

import type {
  PlatformerArrangementForm,
  PlatformerArrangementMode,
  PlatformerTuningMode,
} from "./platformerArrangement";

export type PlatformerHudState = {
  score: number;
  lives: number;
  collected: number;
  totalCoins: number;
  combo: number;
  form: string;
  events: number;
  syncHits: number;
  phaseHits: number;
  tuningHits: number;
  forkHits: number;
  restHits: number;
  phaseFocus: string;
  tuningTilt: number;
  forkBias: number;
  restDensity: number;
  previewSlots: number;
  puzzleSteps: number;
  puzzleTotal: number;
  gatesOpen: number;
  actionDrive: number;
  routeOne: string;
  routeTwo: string;
  routeMode: string;
  routeBias: number;
  routeTravel: number;
  routeColor: string;
  routeGroove: string;
  routeLeadVoice: string;
  sectionBias: string;
  targetTempo: number;
  complexity: number;
  cycle: number;
  tuning: PlatformerTuningMode;
  arrangement: PlatformerArrangementMode;
  formMode: PlatformerArrangementForm;
  evolution: number;
  tempoFollow: number;
  status: string;
};

const DEFAULT_RESET_HUD: PlatformerHudState = {
  score: 0,
  lives: 5,
  collected: 0,
  totalCoins: 0,
  combo: 4,
  form: "--",
  events: 0,
  syncHits: 0,
  phaseHits: 0,
  tuningHits: 0,
  forkHits: 0,
  restHits: 0,
  phaseFocus: "--",
  tuningTilt: 0,
  forkBias: 0,
  restDensity: 0,
  previewSlots: 0,
  puzzleSteps: 0,
  puzzleTotal: 0,
  gatesOpen: 0,
  actionDrive: 0,
  routeOne: "--",
  routeTwo: "--",
  routeMode: "BALANCED",
  routeBias: 0,
  routeTravel: 0,
  routeColor: "--",
  routeGroove: "--",
  routeLeadVoice: "--",
  sectionBias: "AUTO",
  targetTempo: 0,
  complexity: 0,
  cycle: 0,
  tuning: "12edo",
  arrangement: "balanced",
  formMode: "auto",
  evolution: 0.68,
  tempoFollow: 0.62,
  status: "Run zurueckgesetzt",
};

/** Returns base reset HUD with optional overrides (e.g. totalCoins, sectionBias, tuning, status). */
export function createResetPlatformerHud(overrides: Partial<PlatformerHudState> = {}): PlatformerHudState {
  return { ...DEFAULT_RESET_HUD, ...overrides };
}
