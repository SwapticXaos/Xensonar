/**
 * Signature intervals: pin/recall harmonic ratios (vision §3 harmonic first-class).
 * Storage (get/set/add/remove) uses localStorage and is exercised in the app; here we test the pure label helper.
 */
import {
  ratioToShortLabel,
  ratioToCents,
  DISCOVERY_RATIOS,
  getRandomDiscoveryRatio,
  FEATURED_DISCOVERY,
  getFeaturedDiscoveryInterval,
} from "../signatureIntervals";

describe("signatureIntervals", () => {
  it("ratioToShortLabel returns known JI names for common ratios", () => {
    expect(ratioToShortLabel(1)).toBe("Root");
    expect(ratioToShortLabel(5 / 4)).toBe("5/4");
    expect(ratioToShortLabel(3 / 2)).toBe("3/2");
    expect(ratioToShortLabel(4 / 3)).toBe("4/3");
    expect(ratioToShortLabel(7 / 6)).toBe("7/6");
  });

  it("ratioToShortLabel normalizes octaves", () => {
    expect(ratioToShortLabel(2)).toBe("Root");
    expect(ratioToShortLabel(5 / 2)).toBe("5/4");
  });

  it("ratioToShortLabel returns decimal for unknown ratios", () => {
    const label = ratioToShortLabel(1.07);
    expect(label).toMatch(/^\d+\.\d{2}$/);
  });

  it("ratioToCents returns 0 for root, normalizes octave to 0, ~386 for 5/4", () => {
    expect(ratioToCents(1)).toBe(0);
    expect(ratioToCents(2)).toBe(0); // domain normalizes to [1, 2), so 2 → 1
    const fiveFourth = ratioToCents(5 / 4);
    expect(fiveFourth).toBeGreaterThan(380);
    expect(fiveFourth).toBeLessThan(390);
  });

  it("DISCOVERY_RATIOS has 12 entries in [1, 2) for Surprise interval (vision §3 exploratory)", () => {
    expect(DISCOVERY_RATIOS).toHaveLength(12);
    for (const r of DISCOVERY_RATIOS) {
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThan(2);
      expect(Number.isFinite(r)).toBe(true);
    }
  });

  it("getRandomDiscoveryRatio returns a ratio from the discovery set", () => {
    for (let i = 0; i < 30; i++) {
      const r = getRandomDiscoveryRatio();
      expect(DISCOVERY_RATIOS).toContain(r);
    }
  });

  it("FEATURED_DISCOVERY has 12 entries with ratio in [1, 2) and non-empty tip (vision §3 §5 discoverability)", () => {
    expect(FEATURED_DISCOVERY).toHaveLength(12);
    for (const { ratio, tip } of FEATURED_DISCOVERY) {
      expect(ratio).toBeGreaterThanOrEqual(1);
      expect(ratio).toBeLessThan(2);
      expect(Number.isFinite(ratio)).toBe(true);
      expect(typeof tip).toBe("string");
      expect(tip.length).toBeGreaterThan(0);
    }
  });

  it("getFeaturedDiscoveryInterval returns an entry from FEATURED_DISCOVERY (daily rotation)", () => {
    const entry = getFeaturedDiscoveryInterval();
    expect(entry).toHaveProperty("ratio");
    expect(entry).toHaveProperty("tip");
    const found = FEATURED_DISCOVERY.some(
      (e) => e.ratio === entry.ratio && e.tip === entry.tip,
    );
    expect(found).toBe(true);
  });
});
