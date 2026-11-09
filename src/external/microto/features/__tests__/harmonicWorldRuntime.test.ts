import { describe, expect, it } from "vitest";
import { exportMatchesScene } from "../harmonicWorldRuntime";
import type { HarmonicWorldExport } from "../../domain/harmonicWorld";

describe("harmonicWorldRuntime", () => {
  describe("exportMatchesScene", () => {
    it("returns false when export.id is null", () => {
      const data: HarmonicWorldExport = {
        version: 1,
        id: null,
        label: "Custom",
        description: null,
        baseFreq: 261.63,
        gridTuning: "ji",
        quantizeOn: true,
        quantizeBpm: 96,
        quantizeSubdivision: "16",
        tags: [],
        profile: { intensity: "balanced" },
        exportedAt: new Date().toISOString(),
      };
      expect(exportMatchesScene(data)).toBe(false);
    });

    it("returns false when export.id is empty string", () => {
      const data: HarmonicWorldExport = {
        version: 1,
        id: "",
        label: "Custom",
        description: null,
        baseFreq: 261.63,
        gridTuning: "ji",
        quantizeOn: true,
        quantizeBpm: 96,
        quantizeSubdivision: "16",
        tags: [],
        profile: { intensity: "balanced" },
        exportedAt: new Date().toISOString(),
      };
      expect(exportMatchesScene(data)).toBe(false);
    });

    it("returns false when export.id does not match any RESONANCE_SCENES scene", () => {
      const data: HarmonicWorldExport = {
        version: 1,
        id: "custom-forked-world",
        label: "My custom world",
        description: null,
        baseFreq: 220,
        gridTuning: "ji",
        quantizeOn: true,
        quantizeBpm: 96,
        quantizeSubdivision: "16",
        tags: [],
        profile: { intensity: "balanced" },
        mood: "Warm",
        exportedAt: new Date().toISOString(),
      };
      expect(exportMatchesScene(data)).toBe(false);
    });

    it("returns true when export.id matches a curated scene", () => {
      const data: HarmonicWorldExport = {
        version: 1,
        id: "ji_warm_pad_groove",
        label: "JI · Warm Pad Groove",
        description: null,
        baseFreq: 261.63,
        gridTuning: "ji",
        quantizeOn: true,
        quantizeBpm: 96,
        quantizeSubdivision: "16",
        tags: [],
        profile: { intensity: "balanced" },
        exportedAt: new Date().toISOString(),
      };
      expect(exportMatchesScene(data)).toBe(true);
    });
  });
});
