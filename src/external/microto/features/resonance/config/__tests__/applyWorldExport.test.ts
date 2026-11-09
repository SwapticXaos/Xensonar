import { describe, expect, it } from "vitest";

import type { HarmonicWorldExport } from "../../../../domain/harmonicWorld";
import { buildResonancePatchFromWorldExport } from "../applyWorldExport";
import { createDefaultResonanceState } from "../defaults";

describe("buildResonancePatchFromWorldExport", () => {
  const currentState = createDefaultResonanceState();

  it("returns base patch (gridBase, gridTuning, quantize) when export.id is null", () => {
    const data: HarmonicWorldExport = {
      version: 1,
      id: null,
      label: null,
      description: null,
      baseFreq: 220,
      gridTuning: "17edo",
      quantizeOn: true,
      quantizeBpm: 120,
      quantizeSubdivision: "32",
      tags: [],
      profile: { intensity: "balanced" },
      exportedAt: new Date().toISOString(),
    };
    const patch = buildResonancePatchFromWorldExport(data, currentState);
    expect(patch.gridBase).toBe(220);
    expect(patch.gridTuning).toBe("17edo");
    expect(patch.quantizeOn).toBe(true);
    expect(patch.quantizeBpm).toBe(120);
    expect(patch.quantizeSubdivision).toBe("32");
    expect(patch.dronePreset).toBeUndefined();
  });

  it("clamps baseFreq to root Hz range", () => {
    const data: HarmonicWorldExport = {
      version: 1,
      id: null,
      label: null,
      description: null,
      baseFreq: 5,
      gridTuning: "12edo",
      quantizeOn: false,
      quantizeBpm: 90,
      quantizeSubdivision: "16",
      tags: [],
      profile: { intensity: "light" },
      exportedAt: new Date().toISOString(),
    };
    const patch = buildResonancePatchFromWorldExport(data, currentState);
    expect(patch.gridBase).toBeGreaterThanOrEqual(16);
    expect(patch.gridBase).toBeLessThanOrEqual(4096);
  });

  it("merges scene patch when export.id matches a RESONANCE_SCENES scene", () => {
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
    const patch = buildResonancePatchFromWorldExport(data, currentState);
    expect(patch.gridBase).toBe(261.63);
    expect(patch.gridTuning).toBe("ji");
    expect(patch.dronePreset).toBe("warm_pad");
    expect(patch.quantizeBpm).toBe(96);
  });

  it("merges scene patch when export.id is gallery form (hyphen or 22edo-...) so Start a goal / paste get full patch", () => {
    const data: HarmonicWorldExport = {
      version: 1,
      id: "22edo-training-bridge",
      label: "22-EDO Training Bridge",
      description: null,
      baseFreq: 220,
      gridTuning: "22edo",
      quantizeOn: true,
      quantizeBpm: 72,
      quantizeSubdivision: "16",
      tags: [],
      profile: { intensity: "balanced" },
      exportedAt: new Date().toISOString(),
    };
    const patch = buildResonancePatchFromWorldExport(data, currentState);
    expect(patch.gridTuning).toBe("22edo");
    expect(patch.dronePreset).toBeDefined();
  });
});
