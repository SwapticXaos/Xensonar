import { describe, expect, it } from "vitest";
import { createInitialNexusRefsState } from "../resonanceRefs";
import {
  getWaveDriveGain,
  handleWaveOctaveBoostKeyDown,
  handleWaveOctaveBoostKeyUp,
  isWaveOctaveBoostActive,
  setWaveDriveHeld,
  syncWavePerformanceState,
  WAVE_OCTAVE_LATCH_HOLD_MS,
} from "../resonanceWavePerformance";

describe("resonanceWavePerformance", () => {
  it("latches octave boost after a 3 second hold and toggles off on the next press", () => {
    const refs = createInitialNexusRefsState(800, 600);
    handleWaveOctaveBoostKeyDown(refs, 1000);
    syncWavePerformanceState(refs, 0.016, 1000 + WAVE_OCTAVE_LATCH_HOLD_MS + 10);
    expect(isWaveOctaveBoostActive(refs)).toBe(true);
    expect(refs.waveOctaveBoostLatched).toBe(true);

    handleWaveOctaveBoostKeyUp(refs);
    expect(isWaveOctaveBoostActive(refs)).toBe(true);

    handleWaveOctaveBoostKeyDown(refs, 5000);
    expect(isWaveOctaveBoostActive(refs)).toBe(false);
    expect(refs.waveOctaveBoostLatched).toBe(false);
  });

  it("ramps wave-drive up while held and releases quickly when Space is lifted", () => {
    const refs = createInitialNexusRefsState(800, 600);
    setWaveDriveHeld(refs, true);
    syncWavePerformanceState(refs, 1, 1000);
    expect(refs.waveDriveLevel).toBeGreaterThan(0.5);
    expect(getWaveDriveGain(refs.waveDriveLevel)).toBeGreaterThan(1);

    setWaveDriveHeld(refs, false);
    syncWavePerformanceState(refs, 0.4, 1400);
    expect(refs.waveDriveLevel).toBeLessThan(0.2);
  });
});
