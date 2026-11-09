/**
 * Pure helper functions for platformer room: obstacle influence, rect overlap, composer telemetry.
 * Extracted from JumpRunSoundtrackRoom to reduce room LOC and improve testability.
 */

import { clamp } from "../../shared/tuning/grid";
import type { ComposerObstacle } from "./platformerState";
import type { MovementEvent, MovementEventKind } from "./platformerArrangement";

export const COMPOSER_PHASE_LABELS = ["A", "B", "C"] as const;

export const isComposerObstacleEvent = (kind: MovementEventKind): boolean =>
  kind === "sync_gate"
  || kind === "phase_gate"
  || kind === "tuning_crystal"
  || kind === "chord_fork"
  || kind === "silence_field";

export const rectsOverlap = (
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

export const getComposerObstaclePulseStrength = (obstacle: ComposerObstacle, simTime: number): number => {
  const cycle = (simTime * obstacle.pulseRate + obstacle.pulseOffset) % 1;
  const normalized = cycle < 0 ? cycle + 1 : cycle;
  const distance = Math.abs(normalized - 0.5);
  return clamp(1 - distance / 0.5, 0, 1);
};

export const describeComposerObstacleHit = (event: MovementEvent | null): string | null => {
  if (!event || !isComposerObstacleEvent(event.kind)) return null;
  if (event.kind === "sync_gate") {
    const precision = Math.round((typeof event.detail === "number" ? event.detail : event.energy) * 100);
    return `Sync Gate ${precision}%`;
  }
  if (event.kind === "phase_gate") {
    const phaseIndex = Math.min(2, Math.max(0, Math.round(typeof event.detail === "number" ? event.detail : 1)));
    return `Phase Vine ${COMPOSER_PHASE_LABELS[phaseIndex]}`;
  }
  if (event.kind === "chord_fork") {
    return typeof event.detail === "number" && event.detail < 0 ? "Chord Fork Low" : "Chord Fork High";
  }
  if (event.kind === "silence_field") {
    const hush = Math.round((typeof event.detail === "number" ? event.detail : event.energy) * 100);
    return `Silence Field ${hush}%`;
  }
  const skew = Math.round(typeof event.detail === "number" ? event.detail : 0);
  return `Tuning Crystal ${skew >= 0 ? "+" : ""}${skew}`;
};

export type ComposerInfluenceSummary = {
  syncHits: number;
  phaseHits: number;
  tuningHits: number;
  forkHits: number;
  restHits: number;
  phaseFocus: string;
  tuningTilt: number;
  forkBias: number;
};

export const summarizeComposerInfluence = (events: MovementEvent[]): ComposerInfluenceSummary => {
  let syncHits = 0;
  let phaseHits = 0;
  let tuningHits = 0;
  let forkHits = 0;
  let restHits = 0;
  const phaseVotes = [0, 0, 0];
  let tuningSum = 0;
  let tuningCount = 0;
  let forkSum = 0;
  for (const event of events) {
    if (event.kind === "sync_gate") {
      syncHits += 1;
      continue;
    }
    if (event.kind === "phase_gate") {
      phaseHits += 1;
      const index = Math.min(2, Math.max(0, Math.round(typeof event.detail === "number" ? event.detail : 1)));
      phaseVotes[index] += 1 + event.energy;
      continue;
    }
    if (event.kind === "tuning_crystal") {
      tuningHits += 1;
      tuningSum += typeof event.detail === "number" ? event.detail : 0;
      tuningCount += 1;
      continue;
    }
    if (event.kind === "chord_fork") {
      forkHits += 1;
      forkSum += typeof event.detail === "number" ? event.detail : 0;
      continue;
    }
    if (event.kind === "silence_field") {
      restHits += 1;
    }
  }
  const dominantPhaseIndex = phaseVotes.reduce((best, value, index) => (value > phaseVotes[best] ? index : best), 0);
  return {
    syncHits,
    phaseHits,
    tuningHits,
    forkHits,
    restHits,
    phaseFocus: phaseHits > 0 ? COMPOSER_PHASE_LABELS[dominantPhaseIndex] : "--",
    tuningTilt: tuningCount > 0 ? tuningSum / tuningCount : 0,
    forkBias: forkHits > 0 ? forkSum / forkHits : 0,
  };
};
