/**
 * getCursorIntervalLabel: harmonic feedback label for cursor pitch (JI / EDO / BP).
 * Aligns with cursor interval label drawn on Resonance canvas when grid is on.
 */

import { describe, expect, it } from "vitest";
import { getCursorIntervalLabel } from "../cursorIntervalLabel";

describe("getCursorIntervalLabel", () => {
  it("returns empty string for invalid gridBase or cursorFreq", () => {
    expect(getCursorIntervalLabel(0, "12edo", 440)).toBe("");
    expect(getCursorIntervalLabel(440, "12edo", 0)).toBe("");
    expect(getCursorIntervalLabel(NaN, "ji", 220)).toBe("");
    expect(getCursorIntervalLabel(220, "ji", -1)).toBe("");
  });

  it("JI: at root returns Root", () => {
    expect(getCursorIntervalLabel(220, "ji", 220)).toBe("Root");
    expect(getCursorIntervalLabel(440, "ji", 440)).toBe("Root");
  });

  it("JI: common ratios return expected labels", () => {
    expect(getCursorIntervalLabel(220, "ji", 220 * (3 / 2))).toBe("3/2");
    expect(getCursorIntervalLabel(220, "ji", 220 * (5 / 4))).toBe("5/4");
    expect(getCursorIntervalLabel(220, "ji", 220 * (4 / 3))).toBe("4/3");
  });

  it("JI: octave above root shows octave offset", () => {
    const label = getCursorIntervalLabel(220, "ji", 440);
    expect(label).toContain("Root");
    expect(label).toMatch(/\([+-]?\d+\)/);
  });

  it("EDO: step 0 returns Root", () => {
    expect(getCursorIntervalLabel(440, "12edo", 440)).toBe("Root");
  });

  it("EDO: positive step returns +N", () => {
    const fiveSemis = 440 * Math.pow(2, 5 / 12);
    expect(getCursorIntervalLabel(440, "12edo", fiveSemis)).toBe("+5");
  });

  it("EDO: negative step returns -N", () => {
    const downTwo = 440 * Math.pow(2, -2 / 12);
    expect(getCursorIntervalLabel(440, "12edo", downTwo)).toBe("-2");
  });

  it("BP: returns BP tritave:step format", () => {
    const base = 220;
    const atStep5 = base * Math.pow(3, 5 / 13);
    const label = getCursorIntervalLabel(base, "bp", atStep5);
    expect(label).toMatch(/^BP\s+[+-]?\d+:\d+$/);
  });

  it("returns empty for unsupported gridTuning string", () => {
    expect(getCursorIntervalLabel(440, "custom", 440)).toBe("");
  });
});
