/**
 * Tests for shared/tuning/grid.ts: clamp, createBoundGridHelpers shape,
 * and freqFromY/yFromFreq round-trip. Locks the tuning stack used by
 * App → useResonance → runtime (vision: harmonic systems first-class).
 */

import { describe, expect, it } from "vitest";
import {
  clamp,
  clampFreq,
  createBoundGridHelpers,
  quantizeStepSeconds,
  quantizeDivisor,
  QUANTIZE_BPM_MIN,
  QUANTIZE_BPM_MAX,
  type TuningGridConfig,
} from "../grid";

/** Minimal config for tests; no dependency on resonance config. */
const minimalConfig: TuningGridConfig = {
  minFreq: 90,
  maxFreq: 1800,
  height: 100,
  jiRatios: [1, 3/2, 5/4],
  bpRatios: [1, 1.05, 1.1, 1.16, 1.22, 1.28, 1.34, 1.41, 1.49, 1.57, 1.66, 1.76, 1.87],
};

describe("quantizeStepSeconds", () => {
  it("returns finite positive stepSeconds for BPM 30, 120, 240 (aligns with resonance quantizeBpm clamp)", () => {
    const at30 = quantizeStepSeconds(30, "16");
    const at120 = quantizeStepSeconds(120, "16");
    const at240 = quantizeStepSeconds(240, "16");
    expect(Number.isFinite(at30)).toBe(true);
    expect(at30).toBeGreaterThan(0);
    expect(Number.isFinite(at120)).toBe(true);
    expect(at120).toBeGreaterThan(0);
    expect(Number.isFinite(at240)).toBe(true);
    expect(at240).toBeGreaterThan(0);
    expect(at30).toBeGreaterThan(at240);
  });

  it("clamps BPM to QUANTIZE_BPM_MIN and QUANTIZE_BPM_MAX", () => {
    const below = quantizeStepSeconds(10, "16");
    const above = quantizeStepSeconds(999, "16");
    const atMin = quantizeStepSeconds(QUANTIZE_BPM_MIN, "16");
    const atMax = quantizeStepSeconds(QUANTIZE_BPM_MAX, "16");
    expect(below).toBe(quantizeStepSeconds(QUANTIZE_BPM_MIN, "16"));
    expect(above).toBe(quantizeStepSeconds(QUANTIZE_BPM_MAX, "16"));
    expect(atMin).toBe(60 / QUANTIZE_BPM_MIN / quantizeDivisor("16"));
    expect(atMax).toBe(60 / QUANTIZE_BPM_MAX / quantizeDivisor("16"));
  });
});

describe("clampFreq", () => {
  it("returns freq unchanged when within [min, max]", () => {
    expect(clampFreq(440, 90, 1800)).toBe(440);
    expect(clampFreq(90, 90, 1800)).toBe(90);
    expect(clampFreq(1800, 90, 1800)).toBe(1800);
  });

  it("octave-folds up when below min", () => {
    expect(clampFreq(50, 90, 1800)).toBe(100); // 50*2 in range
    expect(clampFreq(40, 90, 1800)).toBe(160); // 40*2=80 < 90, 80*2=160
    expect(clampFreq(40, 120, 480)).toBe(160); // 40*2*2
  });

  it("octave-folds down when above max", () => {
    expect(clampFreq(3000, 90, 1800)).toBe(1500); // 3000*0.5
    expect(clampFreq(4000, 120, 480)).toBe(250); // 4000*0.5^4
  });

  it("uses default min 90 and max 1800 when not provided", () => {
    expect(clampFreq(440)).toBe(440);
    expect(clampFreq(50)).toBe(100);
    expect(clampFreq(3000)).toBe(1500);
  });
});

describe("grid clamp", () => {
  it("clamps value to [min, max]", () => {
    expect(clamp(50, 0, 100)).toBe(50);
    expect(clamp(-1, 0, 100)).toBe(0);
    expect(clamp(101, 0, 100)).toBe(100);
  });

  it("clamps at boundaries", () => {
    expect(clamp(0, 0, 100)).toBe(0);
    expect(clamp(100, 0, 100)).toBe(100);
  });
});

describe("createBoundGridHelpers", () => {
  it("returns object with freqFromY, yFromFreq, snapYToGrid, descendingGridFrequency, stepYToGrid", () => {
    const helpers = createBoundGridHelpers(minimalConfig);
    expect(helpers).toHaveProperty("freqFromY", expect.any(Function));
    expect(helpers).toHaveProperty("yFromFreq", expect.any(Function));
    expect(helpers).toHaveProperty("snapYToGrid", expect.any(Function));
    expect(helpers).toHaveProperty("descendingGridFrequency", expect.any(Function));
    expect(helpers).toHaveProperty("stepYToGrid", expect.any(Function));
  });

  it("freqFromY maps y=0 to maxFreq and y=height to minFreq", () => {
    const helpers = createBoundGridHelpers(minimalConfig);
    expect(helpers.freqFromY(0)).toBe(minimalConfig.maxFreq);
    expect(helpers.freqFromY(minimalConfig.height)).toBe(minimalConfig.minFreq);
  });

  it("yFromFreq and freqFromY round-trip within tolerance", () => {
    const helpers = createBoundGridHelpers(minimalConfig);
    const height = minimalConfig.height;
    for (const y of [0, height / 4, height / 2, (3 * height) / 4, height]) {
      const freq = helpers.freqFromY(y);
      const backY = helpers.yFromFreq(freq);
      expect(Math.abs(backY - y)).toBeLessThanOrEqual(0.01);
    }
  });

  it("snapYToGrid returns a number in [0, height]", () => {
    const helpers = createBoundGridHelpers(minimalConfig);
    const y = 50;
    const snapped = helpers.snapYToGrid(y, 220, "ji");
    expect(snapped).toBeGreaterThanOrEqual(0);
    expect(snapped).toBeLessThanOrEqual(minimalConfig.height);
  });

  it("stepYToGrid returns a number in [0, height] for direction ±1", () => {
    const helpers = createBoundGridHelpers(minimalConfig);
    const y = 50;
    const up = helpers.stepYToGrid(y, 1, 220, "ji");
    const down = helpers.stepYToGrid(y, -1, 220, "ji");
    expect(up).toBeGreaterThanOrEqual(0);
    expect(up).toBeLessThanOrEqual(minimalConfig.height);
    expect(down).toBeGreaterThanOrEqual(0);
    expect(down).toBeLessThanOrEqual(minimalConfig.height);
  });
});
