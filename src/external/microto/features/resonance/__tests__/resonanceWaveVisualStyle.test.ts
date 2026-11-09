import { describe, expect, it } from "vitest";

import {
  createResonanceAgentVisualStyle,
  createResonanceImpactMarkerStyle,
  createResonanceRippleFlashStyle,
  createResonanceSectorFlashStyle,
  createResonanceSectorGlyphStyle,
  createResonanceSectorTrailShardStyle,
  createResonanceCursorVisualStyle,
  createResonanceRippleVisualStyle,
  createResonanceSectorPulseVisualStyle,
} from "../resonanceWaveVisualStyle";
import type { ResonanceWaveTelemetry } from "../resonanceWaveTelemetry";

function createTelemetry(
  overrides: Partial<ResonanceWaveTelemetry> = {},
): ResonanceWaveTelemetry {
  return {
    droneWaveform: "sine",
    waveStartWaveform: "sine",
    octaveMode: "base",
    octaveBoostActive: false,
    driveLevel: 0,
    driveGain: 1,
    ...overrides,
  };
}

describe("resonanceWaveVisualStyle", () => {
  it("uses waveform-specific dash and cap policy for ripples", () => {
    const rippleStyle = createResonanceRippleVisualStyle(
      createTelemetry({ waveStartWaveform: "square", driveLevel: 0.5, driveGain: 1.85 }),
      { x: 0, y: 0, radius: 40, life: 0.7, direction: "right" },
    );

    expect(rippleStyle.lineDash.length).toBeGreaterThan(0);
    expect(rippleStyle.lineCap).toBe("square");
    expect(rippleStyle.lineWidth).toBeGreaterThan(2.5);
  });

  it("adds octave highlight and stronger width for persistent sector pulses", () => {
    const oneShot = createResonanceSectorPulseVisualStyle(
      createTelemetry({ waveStartWaveform: "sawtooth", driveLevel: 0.15, driveGain: 1.2 }),
      { x: 0, y: 0, radius: 50, life: 0.85, direction: "left", hitAgents: [] },
    );
    const persistent = createResonanceSectorPulseVisualStyle(
      createTelemetry({
        waveStartWaveform: "sawtooth",
        octaveMode: "latched",
        octaveBoostActive: true,
        driveLevel: 0.9,
        driveGain: 2.62,
      }),
      { x: 0, y: 0, radius: 50, life: 1, direction: "left", hitAgents: [], persistent: true },
    );

    expect(oneShot.highlightStrokeStyle).toBeNull();
    expect(persistent.highlightStrokeStyle).not.toBeNull();
    expect(persistent.lineWidth).toBeGreaterThan(oneShot.lineWidth);
    expect(persistent.glowLineWidth).toBeGreaterThan(oneShot.glowLineWidth);
  });

  it("expands cursor aura when drive and octave boost are active", () => {
    const base = createResonanceCursorVisualStyle(createTelemetry());
    const boosted = createResonanceCursorVisualStyle(
      createTelemetry({
        waveStartWaveform: "square",
        octaveMode: "hold",
        octaveBoostActive: true,
        driveLevel: 1,
        driveGain: 2.8,
      }),
    );

    expect(boosted.auraRadius).toBeGreaterThan(base.auraRadius);
    expect(boosted.dotRadius).toBeGreaterThan(base.dotRadius);
    expect(boosted.innerColor).not.toBe(base.innerColor);
  });

  it("intensifies agent halo and ring when recent hit glow rises", () => {
    const calm = createResonanceAgentVisualStyle(
      createTelemetry({ waveStartWaveform: "sine" }),
      0,
    );
    const excited = createResonanceAgentVisualStyle(
      createTelemetry({
        waveStartWaveform: "sawtooth",
        octaveMode: "hold",
        octaveBoostActive: true,
        driveLevel: 0.8,
        driveGain: 2.35,
      }),
      1,
    );

    expect(calm.ringStrokeStyle).toBeNull();
    expect(excited.ringStrokeStyle).not.toBeNull();
    expect(excited.haloRadius).toBeGreaterThan(calm.haloRadius);
    expect(excited.ringRadius).toBeGreaterThan(calm.ringRadius);
  });

  it("scales impact marker clusters with hit count and persistence", () => {
    const oneHit = createResonanceImpactMarkerStyle(createTelemetry(), 1, false);
    const sustained = createResonanceImpactMarkerStyle(
      createTelemetry({
        waveStartWaveform: "square",
        octaveMode: "latched",
        octaveBoostActive: true,
        driveLevel: 1,
        driveGain: 2.8,
      }),
      3,
      true,
    );

    expect(sustained.markerRadius).toBeGreaterThan(oneHit.markerRadius);
    expect(sustained.glowRadius).toBeGreaterThan(oneHit.glowRadius);
    expect(sustained.fillStyle).not.toBe(oneHit.fillStyle);
  });

  it("intensifies ripple flash rings when hits are fresh and dense", () => {
    const calm = createResonanceRippleFlashStyle(createTelemetry(), 0.1, 1);
    const excited = createResonanceRippleFlashStyle(
      createTelemetry({
        waveStartWaveform: "square",
        octaveMode: "hold",
        octaveBoostActive: true,
        driveLevel: 0.9,
        driveGain: 2.5,
      }),
      1,
      3,
    );

    expect(excited.lineWidth).toBeGreaterThan(calm.lineWidth);
    expect(excited.radiusOffset).toBeGreaterThan(calm.radiusOffset);
    expect(excited.strokeStyle).not.toBe(calm.strokeStyle);
  });

  it("creates stronger sector direction flashes for fresh persistent hits", () => {
    const base = createResonanceSectorFlashStyle(createTelemetry(), 0.2, false);
    const persistent = createResonanceSectorFlashStyle(
      createTelemetry({
        waveStartWaveform: "sawtooth",
        octaveMode: "latched",
        octaveBoostActive: true,
        driveLevel: 1,
        driveGain: 2.8,
      }),
      1,
      true,
    );

    expect(persistent.frontLineWidth).toBeGreaterThan(base.frontLineWidth);
    expect(persistent.rayWidth).toBeGreaterThan(base.rayWidth);
    expect(persistent.rayOuterOffset).toBeGreaterThan(base.rayOuterOffset);
  });

  it("maps sector directions to distinct fresh-hit glyph families", () => {
    const telemetry = createTelemetry({
      waveStartWaveform: "square",
      octaveMode: "latched",
      octaveBoostActive: true,
      driveLevel: 0.85,
      driveGain: 2.4,
    });

    const left = createResonanceSectorGlyphStyle(telemetry, "left", 0.55, false);
    const up = createResonanceSectorGlyphStyle(telemetry, "up", 0.85, true);
    const down = createResonanceSectorGlyphStyle(telemetry, "down", 1, false);

    expect(left.glyphKind).toBe("chevrons");
    expect(up.glyphKind).toBe("crown");
    expect(down.glyphKind).toBe("spear");
    expect(up.glyphCount).toBeGreaterThan(left.glyphCount);
    expect(up.glyphInset).toBeGreaterThan(left.glyphInset);
    expect(down.strokeStyle).not.toBe(left.strokeStyle);
  });

  it("maps sector directions to distinct trail-shard families and escalation", () => {
    const calm = createResonanceSectorTrailShardStyle(createTelemetry(), "right", 0.2, false);
    const up = createResonanceSectorTrailShardStyle(
      createTelemetry({
        waveStartWaveform: "square",
        octaveMode: "hold",
        octaveBoostActive: true,
        driveLevel: 0.75,
        driveGain: 2.1,
      }),
      "up",
      0.75,
      true,
    );
    const down = createResonanceSectorTrailShardStyle(
      createTelemetry({
        waveStartWaveform: "sawtooth",
        driveLevel: 1,
        driveGain: 2.8,
      }),
      "down",
      1,
      false,
    );

    expect(calm.shardKind).toBe("stagger");
    expect(up.shardKind).toBe("fan");
    expect(down.shardKind).toBe("tail");
    expect(up.shardCount).toBeGreaterThan(calm.shardCount);
    expect(up.shardLength).toBeGreaterThan(calm.shardLength);
    expect(down.strokeStyle).not.toBe(calm.strokeStyle);
  });
});
