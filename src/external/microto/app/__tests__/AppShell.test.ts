import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  CLICK_TO_ENABLE_AUDIO,
  EXPORT_WORLD_COPY,
  EXPORT_WORLD_DOWNLOAD,
  IMPORT_WORLD_PASTE,
  IMPORT_WORLD_LOAD_FILE,
} from "../copy";
import { AppShell } from "../AppShell";
import { TOP_NAV_ROOMS } from "../roomRegistry";

describe("AppShell", () => {
  it("renders every top-nav room label and the active room intent", () => {
    const html = renderToString(
      createElement(
        AppShell,
        {
          room: "GAME",
          onSelectRoom: vi.fn(),
          audioCtx: { state: "running" } as AudioContext,
          onEnableAudio: vi.fn(async () => null),
        },
        createElement("div", null, "room content"),
      ),
    );

    for (const entry of TOP_NAV_ROOMS) {
      expect(html).toContain(entry.label);
    }
    expect(html).toContain("IV. IRRLICHT ARENA");
    expect(html).toContain("Projectile game loop");
  });

  it("shows enable-audio CTA when audio is not running and no error is present", () => {
    const html = renderToString(
      createElement(
        AppShell,
        {
          room: "MAIN",
          onSelectRoom: vi.fn(),
          audioCtx: null,
          onEnableAudio: vi.fn(async () => null),
        },
        createElement("div", null, "room content"),
      ),
    );

    expect(html).toContain(CLICK_TO_ENABLE_AUDIO);
    expect(html).not.toContain("Retry");
  });

  it("shows error text and retry when audio init failed", () => {
    const html = renderToString(
      createElement(
        AppShell,
        {
          room: "RESONANCE",
          onSelectRoom: vi.fn(),
          audioCtx: null,
          onEnableAudio: vi.fn(async () => null),
          audioError: "Could not start audio.",
        },
        createElement("div", null, "room content"),
      ),
    );

    expect(html).toContain("Could not start audio.");
    expect(html).toContain("Retry");
    expect(html).not.toContain(CLICK_TO_ENABLE_AUDIO);
  });

  it("shows Export row (Copy world / Download world / Paste world / Load world) when globalHarmonicContext and harmonicWorld are provided", () => {
    const harmonicWorld = {
      id: "test-scene",
      label: "Test World",
      description: null,
      baseFreq: 261.63,
      gridTuning: "17edo" as const,
      quantizeOn: true,
      quantizeBpm: 120,
      quantizeSubdivision: "32" as const,
      tags: ["17-EDO"],
      profile: { intensity: "balanced" as const },
    };
    const globalHarmonicContext = {
      baseFreq: 261.63,
      gridTuning: "17edo" as const,
      quantizeOn: true,
      quantizeBpm: 120,
      quantizeSubdivision: "32" as const,
    };
    const html = renderToString(
      createElement(
        AppShell,
        {
          room: "RESONANCE",
          onSelectRoom: vi.fn(),
          audioCtx: { state: "running" } as AudioContext,
          onEnableAudio: vi.fn(async () => null),
          globalHarmonicContext,
          harmonicWorld,
          onImportWorld: vi.fn(),
        },
        createElement("div", null, "room content"),
      ),
    );
    expect(html).toContain(EXPORT_WORLD_COPY);
    expect(html).toContain(EXPORT_WORLD_DOWNLOAD);
    expect(html).toContain(IMPORT_WORLD_PASTE);
    expect(html).toContain(IMPORT_WORLD_LOAD_FILE);
  });

  it("shows scene practice tip in shell HUD when currentSceneId matches a scene with practiceTip", () => {
    const harmonicWorld = {
      id: "ji_warm_pad_groove",
      label: "JI · Warm Pad Groove",
      description: null,
      baseFreq: 261.63,
      gridTuning: "ji" as const,
      quantizeOn: true,
      quantizeBpm: 96,
      quantizeSubdivision: "16" as const,
      tags: ["warm", "groove", "JI"],
      profile: null,
    };
    const globalHarmonicContext = {
      baseFreq: 261.63,
      gridTuning: "ji" as const,
      quantizeOn: true,
      quantizeBpm: 96,
      quantizeSubdivision: "16" as const,
    };
    const html = renderToString(
      createElement(
        AppShell,
        {
          room: "RESONANCE",
          onSelectRoom: vi.fn(),
          audioCtx: { state: "running" } as AudioContext,
          onEnableAudio: vi.fn(async () => null),
          globalHarmonicContext,
          harmonicWorld,
          currentSceneId: "ji_warm_pad_groove",
          onImportWorld: vi.fn(),
        },
        createElement("div", null, "room content"),
      ),
    );
    expect(html).toContain("Tip:");
    expect(html).toContain("Turn grid on and move the cursor along the JI ratios");
  });
});
