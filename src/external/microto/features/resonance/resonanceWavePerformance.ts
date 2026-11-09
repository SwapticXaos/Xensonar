import { clamp } from "../../shared/tuning/grid";
import type { NexusRuntimeRefs } from "./resonanceRefs";

export const WAVE_OCTAVE_LATCH_HOLD_MS = 3000;
const WAVE_DRIVE_ATTACK_PER_SECOND = 0.52;
const WAVE_DRIVE_RELEASE_PER_SECOND = 2.8;
const WAVE_DRIVE_GAIN_SPAN = 1.45;

export function handleWaveOctaveBoostKeyDown(refs: NexusRuntimeRefs, now: number): void {
  if (refs.waveOctaveBoostHeld) return;
  if (refs.waveOctaveBoostLatched) {
    refs.waveOctaveBoostLatched = false;
    refs.waveOctaveBoostHeld = false;
    refs.waveOctaveBoostPressedAt = 0;
    return;
  }
  refs.waveOctaveBoostHeld = true;
  refs.waveOctaveBoostPressedAt = now;
}

export function handleWaveOctaveBoostKeyUp(refs: NexusRuntimeRefs): void {
  refs.waveOctaveBoostHeld = false;
  refs.waveOctaveBoostPressedAt = 0;
}

export function setWaveDriveHeld(refs: NexusRuntimeRefs, held: boolean): void {
  refs.waveDriveHeld = held;
}

export function setWaveOctaveLatched(refs: NexusRuntimeRefs, latched: boolean): void {
  refs.waveOctaveBoostLatched = latched;
  refs.waveOctaveBoostHeld = false;
  refs.waveOctaveBoostPressedAt = 0;
}

export function syncWavePerformanceState(
  refs: NexusRuntimeRefs,
  dt: number,
  now: number,
): void {
  if (
    refs.waveOctaveBoostHeld &&
    !refs.waveOctaveBoostLatched &&
    refs.waveOctaveBoostPressedAt > 0 &&
    now - refs.waveOctaveBoostPressedAt >= WAVE_OCTAVE_LATCH_HOLD_MS
  ) {
    refs.waveOctaveBoostLatched = true;
    refs.waveOctaveBoostPressedAt = 0;
  }

  const delta = refs.waveDriveHeld
    ? WAVE_DRIVE_ATTACK_PER_SECOND * dt
    : -WAVE_DRIVE_RELEASE_PER_SECOND * dt;
  refs.waveDriveLevel = clamp(refs.waveDriveLevel + delta, 0, 1);
}

export function isWaveOctaveBoostActive(refs: Pick<NexusRuntimeRefs, "waveOctaveBoostHeld" | "waveOctaveBoostLatched">): boolean {
  return refs.waveOctaveBoostHeld || refs.waveOctaveBoostLatched;
}

export function getWaveDriveGain(level: number): number {
  return 1 + clamp(level, 0, 1) * WAVE_DRIVE_GAIN_SPAN;
}
