import { describe, expect, it } from "vitest";
import { buildNexusAgentToneEvents } from "../resonanceAgentTones";

describe("buildNexusAgentToneEvents", () => {
  it("keeps ripple hits richer than sector and collapse hits", () => {
    const ripple = buildNexusAgentToneEvents("fm_bell", 440, 0.2, "ripple");
    const sector = buildNexusAgentToneEvents("fm_bell", 440, 0.2, "sector");
    const collapse = buildNexusAgentToneEvents("fm_bell", 440, 0.2, "collapse");

    expect(ripple).toHaveLength(3);
    expect(sector).toHaveLength(2);
    expect(collapse).toHaveLength(1);
  });

  it("shortens and brightens sector hits so they read as precise wave catches", () => {
    const ripple = buildNexusAgentToneEvents("soft_pluck", 440, 0.2, "ripple");
    const sector = buildNexusAgentToneEvents("soft_pluck", 440, 0.2, {
      source: "sector",
      direction: "right",
    });

    expect(sector[0].durationSeconds).toBeLessThan(ripple[0].durationSeconds);
    expect(sector[0].cutoff).toBeGreaterThan(ripple[0].cutoff);
    expect(sector[0].type).toBe("triangle");
  });

  it("pushes collapse hits down and quieter to avoid huge piano-like chord blocks", () => {
    const ripple = buildNexusAgentToneEvents("glass_ping", 440, 0.2, "ripple");
    const collapse = buildNexusAgentToneEvents("glass_ping", 440, 0.2, "collapse");

    expect(collapse[0].freq).toBeLessThan(ripple[0].freq);
    expect(collapse[0].volume).toBeLessThan(ripple[0].volume);
    expect(collapse[0].durationSeconds).toBeLessThan(ripple[0].durationSeconds);
  });

  it("shapes sector hits by direction so upward catches cut sharper than downward sweeps", () => {
    const up = buildNexusAgentToneEvents("glass_ping", 440, 0.2, {
      source: "sector",
      direction: "up",
    });
    const down = buildNexusAgentToneEvents("glass_ping", 440, 0.2, {
      source: "sector",
      direction: "down",
    });

    expect(up[0].durationSeconds).toBeLessThan(down[0].durationSeconds);
    expect(up[0].cutoff).toBeGreaterThan(down[0].cutoff);
    expect(up[0].type).toBe("triangle");
    expect(down[0].type).toBe("sine");
  });

  it("builds gong preset with sustained fundamental and harmonic decay", () => {
    const ripple = buildNexusAgentToneEvents("gong", 220, 0.3, "ripple");
    expect(ripple).toHaveLength(4);
    expect(ripple[0].freq).toBe(220);
    expect(ripple[0].durationSeconds).toBeGreaterThan(0.5);
    expect(ripple[1].freq).toBeGreaterThan(ripple[0].freq);
  });

  it("builds chime preset with bright metallic bell character", () => {
    const ripple = buildNexusAgentToneEvents("chime", 440, 0.3, "ripple");
    expect(ripple).toHaveLength(3);
    expect(ripple[0].freq).toBe(440);
    expect(ripple[0].durationSeconds).toBeGreaterThan(0.3);
    expect(ripple[1].freq).toBeGreaterThan(ripple[0].freq);
    expect(ripple[0].cutoff).toBeGreaterThan(1500);
  });

  it("thins dense ripple clusters automatically to avoid muddy chord piles", () => {
    const sparse = buildNexusAgentToneEvents("fm_bell", 440, 0.2, {
      source: "ripple",
      density: 0,
    });
    const dense = buildNexusAgentToneEvents("fm_bell", 440, 0.2, {
      source: "ripple",
      density: 1,
    });

    expect(sparse).toHaveLength(3);
    expect(dense).toHaveLength(1);
    expect(dense[0].volume).toBeLessThan(sparse[0].volume);
    expect(dense[0].durationSeconds).toBeLessThan(sparse[0].durationSeconds);
  });

  it("delays follower notes in a constellation so simultaneous hits read as a melodic phrase", () => {
    const lead = buildNexusAgentToneEvents("glass_ping", 440, 0.2, {
      source: "ripple",
      constellationIndex: 0,
      autonomy: 0,
    });
    const follower = buildNexusAgentToneEvents("glass_ping", 440, 0.2, {
      source: "ripple",
      constellationIndex: 2,
      autonomy: 0.8,
    });

    expect(follower[0].offsetSeconds).toBeGreaterThan(lead[0].offsetSeconds);
    expect(follower[0].volume).toBeLessThan(lead[0].volume);
    expect(follower[0].cutoff).toBeGreaterThan(lead[0].cutoff);
  });
});
