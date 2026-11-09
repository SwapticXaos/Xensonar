/**
 * getIntervalExplainer: human-readable interval names and cents for shell (vision §5 §1).
 */
import { describe, it, expect } from "vitest";
import { getIntervalExplainer } from "../intervalExplainer";

describe("getIntervalExplainer", () => {
  it("returns empty for empty label", () => {
    expect(getIntervalExplainer("", "ji").short).toBe("");
    expect(getIntervalExplainer("  ", "12edo").short).toBe("");
  });

  it("returns JI ratio name and cents for known ratios", () => {
    const five4 = getIntervalExplainer("5/4", "ji");
    expect(five4.short).toBe("Major third");
    expect(five4.cents).toBeCloseTo(386.3, 0);
    expect(getIntervalExplainer("3/2", "ji").short).toBe("Perfect fifth");
    expect(getIntervalExplainer("Root", "ji").short).toBe("Unison");
    expect(getIntervalExplainer("11/8", "ji").short).toBe("Neutral fourth");
  });

  it("returns 12-EDO step names and cents", () => {
    const p4 = getIntervalExplainer("+5", "12edo");
    expect(p4.short).toBe("Perfect 4th");
    expect(p4.cents).toBeCloseTo(500, -1);
    expect(getIntervalExplainer("Root", "12edo").short).toBe("Unison");
    expect(getIntervalExplainer("-2", "12edo").short).toBe("Major 2nd");
  });

  it("returns BP label as-is with hint", () => {
    const bp = getIntervalExplainer("BP +0:5", "bp");
    expect(bp.short).toBe("BP +0:5");
    expect(bp.hint).toContain("Bohlen–Pierce");
  });
});
