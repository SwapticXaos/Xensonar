import { describe, expect, it } from "vitest";

import {
  exportHarmonicWorld,
  exportMatchesWorld,
  HARMONIC_WORLD_EXPORT_VERSION,
  parseAndValidateHarmonicWorldExport,
  serializeHarmonicWorldExport,
  worldFromExport,
  type HarmonicWorld,
} from "../harmonicWorld";

describe("harmonicWorld export", () => {
  const sampleWorld: HarmonicWorld = {
    id: "starfield-17",
    label: "Starfield 17-EDO",
    description: "Constellation scene in 17-EDO.",
    baseFreq: 261.63,
    gridTuning: "17edo",
    quantizeOn: true,
    quantizeBpm: 120,
    quantizeSubdivision: "32",
    tags: ["17-EDO", "Microtonal", "Tight"],
    profile: { intensity: "balanced" },
  };

  it("exportHarmonicWorld returns versioned export with exportedAt", () => {
    const before = Date.now();
    const data = exportHarmonicWorld(sampleWorld);
    const after = Date.now();

    expect(data.version).toBe(HARMONIC_WORLD_EXPORT_VERSION);
    expect(data.id).toBe(sampleWorld.id);
    expect(data.label).toBe(sampleWorld.label);
    expect(data.mood).toBeUndefined();
    expect(data.baseFreq).toBe(sampleWorld.baseFreq);
    expect(data.gridTuning).toBe(sampleWorld.gridTuning);
    expect(data.quantizeOn).toBe(sampleWorld.quantizeOn);
    expect(data.quantizeBpm).toBe(sampleWorld.quantizeBpm);
    expect(data.quantizeSubdivision).toBe(sampleWorld.quantizeSubdivision);
    expect(data.tags).toEqual(sampleWorld.tags);
    expect(data.profile).toEqual(sampleWorld.profile);

    const exportedAt = new Date(data.exportedAt).getTime();
    expect(exportedAt).toBeGreaterThanOrEqual(before);
    expect(exportedAt).toBeLessThanOrEqual(after + 100);
  });

  it("exportHarmonicWorld does not mutate original world", () => {
    const tags = ["A", "B"];
    const world: HarmonicWorld = {
      id: "x",
      label: "X",
      description: null,
      baseFreq: 440,
      gridTuning: "ji",
      quantizeOn: false,
      quantizeBpm: 90,
      quantizeSubdivision: "16",
      tags,
      profile: { intensity: "light" },
    };
    const data = exportHarmonicWorld(world);
    expect(data.tags).toEqual(["A", "B"]);
    expect(world.tags).toBe(tags);
    data.tags.push("C");
    expect(world.tags).toHaveLength(2);
  });

  it("serializeHarmonicWorldExport(pretty) produces parseable JSON with newlines", () => {
    const data = exportHarmonicWorld(sampleWorld);
    const json = serializeHarmonicWorldExport(data, true);

    const parsed = JSON.parse(json) as unknown;
    expect(parsed).toMatchObject({
      version: HARMONIC_WORLD_EXPORT_VERSION,
      id: sampleWorld.id,
      label: sampleWorld.label,
      baseFreq: sampleWorld.baseFreq,
    });
    expect(json).toContain("\n");
  });

  it("serializeHarmonicWorldExport(compact) produces parseable single-line JSON", () => {
    const data = exportHarmonicWorld(sampleWorld);
    const json = serializeHarmonicWorldExport(data, false);

    expect(json).not.toContain("\n");
    const parsed = JSON.parse(json) as unknown;
    expect(parsed).toMatchObject({ version: HARMONIC_WORLD_EXPORT_VERSION });
  });

  it("exportHarmonicWorld and parse round-trip mood when present", () => {
    const worldWithMood: HarmonicWorld = { ...sampleWorld, mood: "Meditative" };
    const data = exportHarmonicWorld(worldWithMood);
    expect(data.mood).toBe("Meditative");
    const json = serializeHarmonicWorldExport(data, false);
    const result = parseAndValidateHarmonicWorldExport(json);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.mood).toBe("Meditative");
  });

  it("worldFromExport rehydrates export to world and matches for favorites/display", () => {
    const data = exportHarmonicWorld(sampleWorld);
    const rehydrated = worldFromExport(data);
    expect(rehydrated.id).toBe(sampleWorld.id);
    expect(rehydrated.label).toBe(sampleWorld.label);
    expect(rehydrated.baseFreq).toBe(sampleWorld.baseFreq);
    expect(rehydrated.gridTuning).toBe(sampleWorld.gridTuning);
    expect(rehydrated.quantizeOn).toBe(sampleWorld.quantizeOn);
    expect(rehydrated.profile.intensity).toBe(sampleWorld.profile.intensity);
    expect(exportMatchesWorld(data, rehydrated)).toBe(true);
  });

  it("worldFromExport defaults profile intensity to balanced when missing", () => {
    const data = exportHarmonicWorld(sampleWorld);
    const partial = { ...data, profile: undefined };
    const rehydrated = worldFromExport(partial as import("../harmonicWorld").HarmonicWorldExport);
    expect(rehydrated.profile).toBeDefined();
    expect(rehydrated.profile.intensity).toBe("balanced");
  });
});

describe("parseAndValidateHarmonicWorldExport", () => {
  const validExport = {
    version: HARMONIC_WORLD_EXPORT_VERSION,
    id: "ji_warm_pad_groove",
    label: "JI · Warm Pad Groove",
    description: null,
    baseFreq: 261.63,
    gridTuning: "ji",
    quantizeOn: true,
    quantizeBpm: 96,
    quantizeSubdivision: "16",
    tags: ["Just Intonation", "Groove"],
    profile: { intensity: "balanced" },
    exportedAt: "2026-03-11T12:00:00.000Z",
  };

  it("accepts valid export JSON (round-trip)", () => {
    const json = JSON.stringify(validExport);
    const result = parseAndValidateHarmonicWorldExport(json);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.version).toBe(HARMONIC_WORLD_EXPORT_VERSION);
      expect(result.data.gridTuning).toBe("ji");
      expect(result.data.quantizeSubdivision).toBe("16");
      expect(result.data.baseFreq).toBe(261.63);
    }
  });

  it("parses and preserves optional mood from export JSON", () => {
    const withMood = { ...validExport, mood: "Warm" };
    const result = parseAndValidateHarmonicWorldExport(JSON.stringify(withMood));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.mood).toBe("Warm");
  });

  it("rejects invalid JSON", () => {
    const result = parseAndValidateHarmonicWorldExport("not json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Invalid JSON");
  });

  it("rejects wrong version", () => {
    const result = parseAndValidateHarmonicWorldExport(
      JSON.stringify({ ...validExport, version: 99 })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Unsupported version");
  });

  it("rejects invalid gridTuning", () => {
    const result = parseAndValidateHarmonicWorldExport(
      JSON.stringify({ ...validExport, gridTuning: "invalid" })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Invalid gridTuning");
  });

  it("rejects invalid quantizeSubdivision", () => {
    const result = parseAndValidateHarmonicWorldExport(
      JSON.stringify({ ...validExport, quantizeSubdivision: "8" })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Invalid quantizeSubdivision");
  });

  it("rejects invalid baseFreq", () => {
    const result = parseAndValidateHarmonicWorldExport(
      JSON.stringify({ ...validExport, baseFreq: "not a number" })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Invalid baseFreq");
  });
});
