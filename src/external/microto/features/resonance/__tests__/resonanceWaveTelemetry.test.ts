import { describe, expect, it } from "vitest";
import { buildResonanceWaveTelemetry } from "../resonanceWaveTelemetry";

describe("buildResonanceWaveTelemetry", () => {
  it("reports base mode when no octave boost is active", () => {
    const telemetry = buildResonanceWaveTelemetry({
      refs: {
        waveOctaveBoostHeld: false,
        waveOctaveBoostLatched: false,
        waveDriveLevel: 0,
      },
      droneWaveform: "sine",
      waveStartWaveform: "square",
    });

    expect(telemetry.octaveMode).toBe("base");
    expect(telemetry.octaveBoostActive).toBe(false);
    expect(telemetry.driveGain).toBe(1);
  });

  it("distinguishes hold and latched octave states and reflects drive gain", () => {
    const holdTelemetry = buildResonanceWaveTelemetry({
      refs: {
        waveOctaveBoostHeld: true,
        waveOctaveBoostLatched: false,
        waveDriveLevel: 0.5,
      },
      droneWaveform: "sawtooth",
      waveStartWaveform: "sine",
    });
    const latchedTelemetry = buildResonanceWaveTelemetry({
      refs: {
        waveOctaveBoostHeld: false,
        waveOctaveBoostLatched: true,
        waveDriveLevel: 1,
      },
      droneWaveform: "square",
      waveStartWaveform: "sawtooth",
    });

    expect(holdTelemetry.octaveMode).toBe("hold");
    expect(holdTelemetry.octaveBoostActive).toBe(true);
    expect(holdTelemetry.driveGain).toBeGreaterThan(1.7);
    expect(latchedTelemetry.octaveMode).toBe("latched");
    expect(latchedTelemetry.octaveBoostActive).toBe(true);
    expect(latchedTelemetry.driveGain).toBeGreaterThan(2.4);
  });
});
