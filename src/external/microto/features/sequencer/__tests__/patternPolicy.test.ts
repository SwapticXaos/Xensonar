import { describe, expect, it } from "vitest";
import { resolveBassTrigger, resolveDrumTriggers, isDrumCascadeAnchor } from "../patternPolicy";

describe("pattern policy helpers", () => {
  it("resolves four-on-floor drum triggers", () => {
    const result = resolveDrumTriggers({
      drumPattern: "four_on_floor",
      baseStep: 0,
      finalHit: true,
      finalNearHit: true,
      heavyHitAllowed: true,
    });

    expect(result.kick).toBe(true);
    expect(result.snare).toBe(false);
    expect(result.hat).toBe(false);
  });

  it("identifies cascade anchors on heavy hits", () => {
    expect(
      isDrumCascadeAnchor({
        baseStep: 8,
        finalHit: true,
        heavyHitAllowed: true,
      }),
    ).toBe(true);

    expect(
      isDrumCascadeAnchor({
        baseStep: 2,
        finalHit: true,
        heavyHitAllowed: true,
      }),
    ).toBe(false);

    expect(
      isDrumCascadeAnchor({
        baseStep: 8,
        finalHit: true,
        heavyHitAllowed: false,
      }),
    ).toBe(false);
  });

  it("emits bass triggers per pattern rules", () => {
    const offbeat = resolveBassTrigger({
      bassPattern: "offbeat",
      baseStep: 2,
      finalHit: true,
      bassHitAllowed: true,
      root: 110,
    });
    expect(offbeat).toEqual({ freq: 110, durMul: 1.5 });

    const walking = resolveBassTrigger({
      bassPattern: "walking",
      baseStep: 4,
      finalHit: true,
      bassHitAllowed: true,
      root: 100,
    });
    expect(walking).not.toBeNull();
    expect(walking?.freq).toBeCloseTo(118.9, 3);

    const suppressed = resolveBassTrigger({
      bassPattern: "stotter",
      baseStep: 2,
      finalHit: true,
      bassHitAllowed: false,
      root: 90,
    });
    expect(suppressed).toBeNull();
  });

  it("emits trip hop and breakbeat patterns with expected accents", () => {
    const tripHop = resolveDrumTriggers({
      drumPattern: "trip_hop",
      baseStep: 10,
      finalHit: true,
      finalNearHit: true,
      heavyHitAllowed: true,
    });
    expect(tripHop.kick).toBe(true);
    expect(tripHop.snare).toBe(false);
    expect(tripHop.hat).toBe(true);

    const breakbeat = resolveDrumTriggers({
      drumPattern: "breakbeat",
      baseStep: 5,
      finalHit: true,
      finalNearHit: true,
      heavyHitAllowed: true,
    });
    expect(breakbeat.kick).toBe(true);
    expect(breakbeat.snare).toBe(false);
    expect(breakbeat.hat).toBe(true);
  });
});
