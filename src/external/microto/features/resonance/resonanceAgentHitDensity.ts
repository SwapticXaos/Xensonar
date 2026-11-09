/**
 * Audible hit density tracking for resonance agent simulation.
 * Extracted from resonanceAgentUpdate to meet policy ≤300 LOC; single concern.
 */
import { clamp } from "../../shared/tuning/grid";

export const AUDIBLE_HIT_WINDOW_MS = 320;
export const AUDIBLE_HIT_SOFT_CAP = 6;

export type HitDensityState = {
  recentAudibleHitWindowStartedAt: number;
  recentAudibleHitCount: number;
};

export function resetAudibleHitWindowIfNeeded(
  state: HitDensityState,
  frameNow: number,
): void {
  if (
    state.recentAudibleHitWindowStartedAt <= 0 ||
    frameNow < state.recentAudibleHitWindowStartedAt ||
    frameNow - state.recentAudibleHitWindowStartedAt > AUDIBLE_HIT_WINDOW_MS
  ) {
    state.recentAudibleHitWindowStartedAt = frameNow;
    state.recentAudibleHitCount = 0;
  }
}

/** Returns density factor 0..1 for tone cue; mutates state. */
export function registerAudibleHitDensity(
  state: HitDensityState,
  frameNow: number,
): number {
  resetAudibleHitWindowIfNeeded(state, frameNow);
  state.recentAudibleHitCount += 1;
  return clamp(
    (state.recentAudibleHitCount - 1) / Math.max(1, AUDIBLE_HIT_SOFT_CAP - 1),
    0,
    1,
  );
}
