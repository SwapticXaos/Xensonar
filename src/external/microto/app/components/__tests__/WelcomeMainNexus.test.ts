import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  LAST_ROOM_PREFIX,
  RESUME_IN_ROOM,
  WELCOME_START_A_JOURNEY_LABEL,
  WELCOME_START_BY_MOOD_LABEL,
  WELCOME_SURPRISE_ROOM_LABEL,
} from "../../copy";
import { RESONANCE_SCENES } from "../../../features/resonance/config/scenes";
import { getRoomRegistryEntry, TOP_NAV_ROOMS } from "../../roomRegistry";
import { WelcomeMainNexus } from "../WelcomeMainNexus";

vi.mock("../../sessionMemory", () => ({
  getLastContentRoom: vi.fn(() => null as string | null),
}));

describe("WelcomeMainNexus", () => {
  it("renders pointer-first room hints from the canonical room registry metadata", () => {
    const html = renderToString(
      createElement(WelcomeMainNexus, {
        setRoom: vi.fn(),
        initAudio: vi.fn(async () => null),
      }),
    );

    const roomsWithPointerHints = TOP_NAV_ROOMS.filter((entry) => entry.pointerHint);

    for (const entry of roomsWithPointerHints) {
      expect(html).toContain(entry.label);
      expect(html).toContain(entry.pointerHint as string);
    }
    expect(html).toContain("IV. IRRLICHT ARENA");
    expect(html).toContain("battlefield and HUD");
  });

  it("renders last-room resume block when getLastContentRoom returns a room (session memory UX)", async () => {
    const { getLastContentRoom } = await import("../../sessionMemory");
    vi.mocked(getLastContentRoom).mockReturnValue("RESONANCE");

    const html = renderToString(
      createElement(WelcomeMainNexus, {
        setRoom: vi.fn(),
        initAudio: vi.fn(async () => null),
      }),
    );

    expect(html).toContain(LAST_ROOM_PREFIX);
    expect(html).toContain(RESUME_IN_ROOM);
    expect(html).toContain(getRoomRegistryEntry("RESONANCE").label);

    vi.mocked(getLastContentRoom).mockReturnValue(null);
  });

  it("renders Start by mood strip and mood chips when onSelectResonanceScene is provided (vision §3 §5)", () => {
    const html = renderToString(
      createElement(WelcomeMainNexus, {
        setRoom: vi.fn(),
        initAudio: vi.fn(async () => null),
        onSelectResonanceScene: vi.fn(),
      }),
    );

    expect(html).toContain(WELCOME_START_BY_MOOD_LABEL);
    const moodsWithScene = [...new Set(RESONANCE_SCENES.map((s) => s.mood).filter(Boolean))];
    for (const mood of moodsWithScene) {
      expect(html).toContain(mood as string);
    }
    expect(html).toContain("Harmonic worlds");
    expect(html).toContain("Surprise world");
  });

  it("renders Try a random room button (vision §2 multi-room, §5 discoverability)", () => {
    const html = renderToString(
      createElement(WelcomeMainNexus, {
        setRoom: vi.fn(),
        initAudio: vi.fn(async () => null),
      }),
    );
    expect(html).toContain(WELCOME_SURPRISE_ROOM_LABEL);
  });

  it("renders Start a journey strip when onImportWorld is provided (vision §3 §5)", () => {
    const html = renderToString(
      createElement(WelcomeMainNexus, {
        setRoom: vi.fn(),
        initAudio: vi.fn(async () => null),
        onImportWorld: vi.fn(),
      }),
    );
    expect(html).toContain(WELCOME_START_A_JOURNEY_LABEL);
    expect(html).toContain("Reference");
  });
});
