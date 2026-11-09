import { describe, it, expect } from "vitest";
import { snapToNearestJiNode } from "../jiSnap";

describe("jiSnap", () => {
  it("returns frequency and label within bounds when options provided", () => {
    const r = snapToNearestJiNode(220, { minFreq: 55, maxFreq: 520 });
    expect(r.freq).toBeGreaterThanOrEqual(55);
    expect(r.freq).toBeLessThanOrEqual(520);
    expect(typeof r.label).toBe("string");
    expect(r.label.length).toBeGreaterThan(0);
  });

  it("snaps 110 to Root (1/1) at default base", () => {
    const r = snapToNearestJiNode(110, { minFreq: 50, maxFreq: 600 });
    expect(r.label).toBe("Root");
    expect(r.freq).toBeCloseTo(110, 1);
  });

  it("snaps 165 toward 3/2 of 110 (165 Hz) when in range", () => {
    const r = snapToNearestJiNode(165, { minFreq: 55, maxFreq: 520 });
    expect(r.label).toBe("3/2");
    expect(r.freq).toBeCloseTo(165, 0);
  });

  it("respects custom minFreq/maxFreq and returns clamped result when no candidates", () => {
    const r = snapToNearestJiNode(30, { minFreq: 100, maxFreq: 200 });
    expect(r.freq).toBeGreaterThanOrEqual(100);
    expect(r.freq).toBeLessThanOrEqual(200);
  });
});
