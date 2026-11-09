import { renderToString } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { WorldHintCard } from "../WorldHintCard";
import type { HarmonicWorld } from "../../../domain/harmonicWorld";

describe("WorldHintCard", () => {
  const minimalWorld: HarmonicWorld = {
    id: "w1",
    label: "Test World",
    description: null,
    baseFreq: 440,
    gridTuning: "12edo",
    quantizeOn: true,
    quantizeBpm: 120,
    quantizeSubdivision: "16",
    tags: [],
    profile: { intensity: "balanced" },
  };

  it("renders nothing when world is null", () => {
    const html = renderToString(<WorldHintCard world={null} />);
    expect(html).toBe("");
  });

  it("renders nothing when world is undefined", () => {
    const html = renderToString(<WorldHintCard world={undefined} />);
    expect(html).toBe("");
  });

  it("renders nothing when world has no label", () => {
    const html = renderToString(
      <WorldHintCard world={{ ...minimalWorld, label: null }} />,
    );
    expect(html).toBe("");
  });

  it("renders label when world has label", () => {
    const html = renderToString(<WorldHintCard world={minimalWorld} />);
    expect(html).toContain("Test World");
  });

  it("renders description when provided", () => {
    const html = renderToString(
      <WorldHintCard
        world={{ ...minimalWorld, description: "A test harmonic world." }}
      />,
    );
    expect(html).toContain("A test harmonic world.");
  });

  it("renders world tags as chips when tags are present", () => {
    const html = renderToString(
      <WorldHintCard
        world={{
          ...minimalWorld,
          tags: ["Just Intonation", "12-EDO"],
        }}
      />,
    );
    expect(html).toContain("Just Intonation");
    expect(html).toContain("12-EDO");
  });

  it("does not render tags when tags array is empty", () => {
    const html = renderToString(<WorldHintCard world={minimalWorld} />);
    expect(html).toContain("Test World");
    expect(html).not.toContain("Just Intonation");
  });
});
