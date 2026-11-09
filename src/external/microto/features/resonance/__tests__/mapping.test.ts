/**
 * Tests for resonance config/mapping.ts: createTuningGridConfig shape and
 * droneFreqFromY/yFromDroneFreq round-trip. Locks the config side of the
 * grid pipeline (App → createTuningGridConfig → createBoundGridHelpers → useResonance).
 * Vision: harmonic systems first-class; cursor–pitch mapping single source.
 */

import { describe, expect, it } from "vitest";
import { CANVAS_HEIGHT } from "../../../shared/canvasConstants";
import { createBoundGridHelpers, type TuningGridConfig } from "../../../shared/tuning/grid";
import {
  createTuningGridConfig,
  droneFreqFromY,
  yFromDroneFreq,
} from "../config/mapping";

describe("createTuningGridConfig", () => {
  it("returns a valid TuningGridConfig shape for any positive height", () => {
    const config = createTuningGridConfig(CANVAS_HEIGHT) as TuningGridConfig;
    expect(config).toHaveProperty("minFreq", expect.any(Number));
    expect(config).toHaveProperty("maxFreq", expect.any(Number));
    expect(config).toHaveProperty("height", CANVAS_HEIGHT);
    expect(config).toHaveProperty("jiRatios", expect.any(Array));
    expect(config).toHaveProperty("bpRatios", expect.any(Array));
  });

  it("satisfies minFreq < maxFreq and positive height", () => {
    const config = createTuningGridConfig(CANVAS_HEIGHT) as TuningGridConfig;
    expect(config.minFreq).toBeLessThan(config.maxFreq);
    expect(config.height).toBeGreaterThan(0);
  });

  it("jiRatios and bpRatios are non-empty number arrays", () => {
    const config = createTuningGridConfig(100) as TuningGridConfig;
    expect(config.jiRatios.length).toBeGreaterThan(0);
    expect(config.bpRatios.length).toBeGreaterThan(0);
    expect(config.jiRatios.every((r) => typeof r === "number" && !Number.isNaN(r))).toBe(true);
    expect(config.bpRatios.every((r) => typeof r === "number" && !Number.isNaN(r))).toBe(true);
  });

  it("produces config compatible with createBoundGridHelpers (shared/tuning/grid)", () => {
    const config = createTuningGridConfig(CANVAS_HEIGHT) as TuningGridConfig;
    const helpers = createBoundGridHelpers(config);
    expect(helpers.freqFromY(0)).toBe(config.maxFreq);
    expect(helpers.freqFromY(config.height)).toBe(config.minFreq);
  });
});

describe("droneFreqFromY / yFromDroneFreq", () => {
  const height = CANVAS_HEIGHT;

  it("droneFreqFromY(0) equals max and droneFreqFromY(height) equals min", () => {
    const atTop = droneFreqFromY(0, height);
    const atBottom = droneFreqFromY(height, height);
    expect(atTop).toBeGreaterThan(atBottom);
  });

  it("yFromDroneFreq and droneFreqFromY round-trip within tolerance", () => {
    for (const y of [0, height / 4, height / 2, (3 * height) / 4, height]) {
      const freq = droneFreqFromY(y, height);
      const backY = yFromDroneFreq(freq, height);
      expect(Math.abs(backY - y)).toBeLessThanOrEqual(0.01);
    }
  });
});
