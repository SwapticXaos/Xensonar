import { describe, expect, it } from "vitest";
import {
  COMPOSER_PHASE_LABELS,
  describeComposerObstacleHit,
  getComposerObstaclePulseStrength,
  isComposerObstacleEvent,
  rectsOverlap,
  summarizeComposerInfluence,
} from "../platformerHelpers";
import type { ComposerObstacle } from "../platformerState";

describe("platformerHelpers", () => {
  describe("COMPOSER_PHASE_LABELS", () => {
    it("exposes A, B, C as readonly tuple", () => {
      expect(COMPOSER_PHASE_LABELS).toEqual(["A", "B", "C"]);
      expect(COMPOSER_PHASE_LABELS).toHaveLength(3);
    });
  });

  describe("isComposerObstacleEvent", () => {
    it("returns true for composer obstacle kinds", () => {
      expect(isComposerObstacleEvent("sync_gate")).toBe(true);
      expect(isComposerObstacleEvent("phase_gate")).toBe(true);
      expect(isComposerObstacleEvent("tuning_crystal")).toBe(true);
      expect(isComposerObstacleEvent("chord_fork")).toBe(true);
      expect(isComposerObstacleEvent("silence_field")).toBe(true);
    });

    it("returns false for non-composer kinds", () => {
      expect(isComposerObstacleEvent("motion")).toBe(false);
      expect(isComposerObstacleEvent("step")).toBe(false);
      expect(isComposerObstacleEvent("jump")).toBe(false);
      expect(isComposerObstacleEvent("land")).toBe(false);
      expect(isComposerObstacleEvent("coin")).toBe(false);
      expect(isComposerObstacleEvent("checkpoint")).toBe(false);
    });
  });

  describe("rectsOverlap", () => {
    it("returns true when rects overlap horizontally and vertically", () => {
      expect(rectsOverlap(0, 0, 10, 10, 5, 5, 10, 10)).toBe(true);
      expect(rectsOverlap(10, 10, 20, 20, 15, 15, 10, 10)).toBe(true);
    });

    it("returns false when rects are separated", () => {
      expect(rectsOverlap(0, 0, 10, 10, 20, 20, 10, 10)).toBe(false);
      expect(rectsOverlap(0, 0, 10, 10, 10, 0, 10, 10)).toBe(false); // touching edge
    });

    it("returns true when rects touch (boundary case)", () => {
      expect(rectsOverlap(0, 0, 10, 10, 9, 9, 10, 10)).toBe(true);
    });
  });

  describe("getComposerObstaclePulseStrength", () => {
    const baseObstacle: ComposerObstacle = {
      id: 1,
      kind: "sync_gate",
      x: 100,
      y: 200,
      w: 40,
      h: 30,
      lane: 0,
      strength: 0.8,
      pulseRate: 2,
      pulseOffset: 0,
      activated: false,
      lastTriggeredAt: 0,
    };

    it("returns 1 at pulse peak (cycle 0.5)", () => {
      const obstacle = { ...baseObstacle, pulseRate: 2, pulseOffset: 0 };
      const simTime = 0.25; // 2 * 0.25 = 0.5
      expect(getComposerObstaclePulseStrength(obstacle, simTime)).toBeCloseTo(1, 5);
    });

    it("returns 0 at pulse trough (cycle 0 or 1)", () => {
      const obstacle = { ...baseObstacle, pulseRate: 2, pulseOffset: 0 };
      const simTime = 0; // cycle 0
      expect(getComposerObstaclePulseStrength(obstacle, simTime)).toBeCloseTo(0, 5);
    });

    it("clamps output to [0, 1]", () => {
      const obstacle = { ...baseObstacle, pulseRate: 1, pulseOffset: 0 };
      const strength = getComposerObstaclePulseStrength(obstacle, 0.5);
      expect(strength).toBeGreaterThanOrEqual(0);
      expect(strength).toBeLessThanOrEqual(1);
    });
  });

  describe("describeComposerObstacleHit", () => {
    it("returns null for null or non-composer event", () => {
      expect(describeComposerObstacleHit(null)).toBe(null);
      expect(describeComposerObstacleHit({ kind: "step", semi: 0, energy: 1, t: 0, lane: 0, airborne: false })).toBe(null);
    });

    it("formats sync_gate with precision percentage", () => {
      const event = { kind: "sync_gate" as const, semi: 0, energy: 0.85, t: 1, lane: 0, airborne: false };
      expect(describeComposerObstacleHit(event)).toBe("Sync Gate 85%");
    });

    it("formats phase_gate with phase label", () => {
      const eventA = { kind: "phase_gate" as const, semi: 0, energy: 1, t: 1, lane: 0, airborne: false, detail: 0 };
      const eventB = { kind: "phase_gate" as const, semi: 0, energy: 1, t: 1, lane: 0, airborne: false, detail: 1 };
      expect(describeComposerObstacleHit(eventA)).toBe("Phase Vine A");
      expect(describeComposerObstacleHit(eventB)).toBe("Phase Vine B");
    });

    it("formats chord_fork as Low or High", () => {
      const low = { kind: "chord_fork" as const, semi: 0, energy: 1, t: 1, lane: 0, airborne: false, detail: -1 };
      const high = { kind: "chord_fork" as const, semi: 0, energy: 1, t: 1, lane: 0, airborne: false, detail: 1 };
      expect(describeComposerObstacleHit(low)).toBe("Chord Fork Low");
      expect(describeComposerObstacleHit(high)).toBe("Chord Fork High");
    });

    it("formats silence_field with hush percentage", () => {
      const event = { kind: "silence_field" as const, semi: 0, energy: 0.6, t: 1, lane: 0, airborne: false, detail: 0.6 };
      expect(describeComposerObstacleHit(event)).toMatch(/Silence Field \d+%/);
    });

    it("formats tuning_crystal with skew", () => {
      const pos = { kind: "tuning_crystal" as const, semi: 0, energy: 1, t: 1, lane: 0, airborne: false, detail: 5 };
      const neg = { kind: "tuning_crystal" as const, semi: 0, energy: 1, t: 1, lane: 0, airborne: false, detail: -3 };
      expect(describeComposerObstacleHit(pos)).toBe("Tuning Crystal +5");
      expect(describeComposerObstacleHit(neg)).toBe("Tuning Crystal -3");
    });
  });

  describe("summarizeComposerInfluence", () => {
    it("returns zeros and defaults for empty events", () => {
      const result = summarizeComposerInfluence([]);
      expect(result).toEqual({
        syncHits: 0,
        phaseHits: 0,
        tuningHits: 0,
        forkHits: 0,
        restHits: 0,
        phaseFocus: "--",
        tuningTilt: 0,
        forkBias: 0,
      });
    });

    it("counts sync_gate hits", () => {
      const events = [
        { kind: "sync_gate" as const, semi: 0, energy: 0.9, t: 0, lane: 0, airborne: false },
        { kind: "sync_gate" as const, semi: 0, energy: 0.8, t: 0.5, lane: 0, airborne: false },
      ];
      const result = summarizeComposerInfluence(events);
      expect(result.syncHits).toBe(2);
    });

    it("computes phaseFocus from phase_gate votes", () => {
      const events = [
        { kind: "phase_gate" as const, semi: 0, energy: 1, t: 0, lane: 0, airborne: false, detail: 0 },
        { kind: "phase_gate" as const, semi: 0, energy: 1, t: 0.5, lane: 0, airborne: false, detail: 0 },
        { kind: "phase_gate" as const, semi: 0, energy: 0.5, t: 1, lane: 0, airborne: false, detail: 1 },
      ];
      const result = summarizeComposerInfluence(events);
      expect(result.phaseHits).toBe(3);
      expect(result.phaseFocus).toBe("A"); // A has more votes (2+1 vs 1+0.5)
    });

    it("computes tuningTilt from tuning_crystal details", () => {
      const events = [
        { kind: "tuning_crystal" as const, semi: 0, energy: 1, t: 0, lane: 0, airborne: false, detail: 0 },
        { kind: "tuning_crystal" as const, semi: 0, energy: 1, t: 0.5, lane: 0, airborne: false, detail: 4 },
      ];
      const result = summarizeComposerInfluence(events);
      expect(result.tuningHits).toBe(2);
      expect(result.tuningTilt).toBe(2); // (0 + 4) / 2
    });

    it("computes forkBias from chord_fork details", () => {
      const events = [
        { kind: "chord_fork" as const, semi: 0, energy: 1, t: 0, lane: 0, airborne: false, detail: -1 },
        { kind: "chord_fork" as const, semi: 0, energy: 1, t: 0.5, lane: 0, airborne: false, detail: 1 },
      ];
      const result = summarizeComposerInfluence(events);
      expect(result.forkHits).toBe(2);
      expect(result.forkBias).toBe(0); // (-1 + 1) / 2
    });

    it("counts silence_field as restHits", () => {
      const events = [
        { kind: "silence_field" as const, semi: 0, energy: 0.7, t: 0, lane: 0, airborne: false },
      ];
      const result = summarizeComposerInfluence(events);
      expect(result.restHits).toBe(1);
    });
  });
});
