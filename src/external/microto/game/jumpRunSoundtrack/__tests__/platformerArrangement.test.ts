import { describe, expect, it } from "vitest";
import {
  BAR_COUNT,
  clampPhaseIndex,
  clampSemi,
  deriveMovementTheme,
  LOOP_STEPS,
  platformerPitchToFreq,
  snapToChord,
} from "../platformerArrangement";

describe("platformerArrangement", () => {
  describe("LOOP_STEPS and BAR_COUNT", () => {
    it("exposes expected constants", () => {
      expect(LOOP_STEPS).toBe(64);
      expect(BAR_COUNT).toBe(8);
    });
  });

  describe("platformerPitchToFreq", () => {
    it("returns 12edo semitone frequency for root 132", () => {
      const f0 = platformerPitchToFreq(132, 0, "12edo");
      expect(f0).toBeCloseTo(132, 1);
      const f12 = platformerPitchToFreq(132, 12, "12edo");
      expect(f12).toBeCloseTo(264, 1);
    });

    it("returns fallback 110 for invalid root", () => {
      expect(platformerPitchToFreq(0, 0, "12edo")).toBe(110);
      expect(platformerPitchToFreq(-1, 0, "12edo")).toBe(110);
      expect(platformerPitchToFreq(NaN, 0, "12edo")).toBe(110);
    });

    it("returns root for invalid pitch in 12edo", () => {
      expect(platformerPitchToFreq(132, NaN, "12edo")).toBe(132);
    });

    it("returns BP tuning for bp mode", () => {
      const f = platformerPitchToFreq(132, 0, "bp");
      expect(f).toBeGreaterThan(0);
      expect(Number.isFinite(f)).toBe(true);
    });

    it("returns JI tuning for ji mode", () => {
      const f = platformerPitchToFreq(132, 0, "ji");
      expect(f).toBeCloseTo(132, 1);
    });
  });

  describe("snapToChord", () => {
    it("returns semi unchanged when chord is empty", () => {
      expect(snapToChord(0, [])).toBe(0);
      expect(snapToChord(7, [])).toBe(7);
    });

    it("snaps to nearest chord tone", () => {
      expect(snapToChord(1, [0, 4, 7])).toBe(0);
      expect(snapToChord(5, [0, 4, 7])).toBe(4);
      expect(snapToChord(8, [0, 4, 7])).toBe(7);
    });

    it("snaps across octaves", () => {
      expect(snapToChord(13, [0, 4, 7])).toBe(12);
    });
  });

  describe("clampSemi", () => {
    it("clamps to [-24, 36] and rounds", () => {
      expect(clampSemi(0)).toBe(0);
      expect(clampSemi(-24)).toBe(-24);
      expect(clampSemi(-30)).toBe(-24);
      expect(clampSemi(36)).toBe(36);
      expect(clampSemi(50)).toBe(36);
    });
  });

  describe("clampPhaseIndex", () => {
    it("clamps to [0, 2] and rounds", () => {
      expect(clampPhaseIndex(0)).toBe(0);
      expect(clampPhaseIndex(1)).toBe(1);
      expect(clampPhaseIndex(2)).toBe(2);
      expect(clampPhaseIndex(-1)).toBe(0);
      expect(clampPhaseIndex(5)).toBe(2);
    });
  });

  describe("deriveMovementTheme", () => {
    it("returns valid theme for empty events with fallback phrase", () => {
      const theme = deriveMovementTheme([], [0, 3, 7, 10]);
      expect(theme).toBeDefined();
      expect(theme.groundMotif).toBeInstanceOf(Array);
      expect(theme.airMotif).toBeInstanceOf(Array);
      expect(theme.accentMotif).toBeInstanceOf(Array);
      expect(theme.cadenceMotif).toBeInstanceOf(Array);
      expect(theme.rootContour).toBeInstanceOf(Array);
      expect(typeof theme.strideDensity).toBe("number");
      expect(typeof theme.airDensity).toBe("number");
      expect(typeof theme.accentDensity).toBe("number");
    });

    it("returns valid theme for empty events with empty fallback", () => {
      const theme = deriveMovementTheme([], []);
      expect(theme).toBeDefined();
      expect(theme.groundMotif.length).toBeGreaterThan(0);
    });
  });
});
