import { describe, expect, it } from "vitest";

import { ROOMS_WITH_CONTENT, ROOMS_WITH_RENDERERS } from "../AppRoomContent";
import { ROOM_SHORTCUTS } from "../keyboardLegend";
import { ROOM_KEYMAP_SOURCE, ROOMS_WITH_KEYMAP } from "../../features/input/roomKeymapIndex";
import { getRoomFirstRunConfig, getRoomsWithPointerHints, TOP_NAV_ROOMS } from "../roomRegistry";

/**
 * Invariant: roomRegistry (TOP_NAV_ROOMS; ROOMS_WITH_CONTENT = TOP_NAV_ROOMS.map(r => r.id)),
 * AppRoomContent (re-exports ROOMS_WITH_CONTENT, defines ROOM_RENDERERS),
 * keyboard legend (ROOM_SHORTCUTS), and roomKeymapIndex (ROOM_KEYMAP_SOURCE) must stay in sync when adding a room.
 * Adding a room = update Room type, TOP_NAV_ROOMS (id, label, activeClass, intentLabel), ROOM_RENDERERS, ROOM_SHORTCUTS, ROOM_KEYMAP_SOURCE.
 * See NEW-ROOM-TEMPLATE-v1.md, FIX-NEXT-related-functions-and-situations-v1.md §2a.
 * ROOMS_WITH_RENDERERS from roomRegistry (content minus MAIN/NEXUS); ROOM_RENDERERS must have an entry for each.
 */
describe("roomRegistry ↔ AppRoomContent sync", () => {
  it("every TOP_NAV_ROOMS id has a case in AppRoomContent", () => {
    const contentSet = new Set(ROOMS_WITH_CONTENT);
    for (const entry of TOP_NAV_ROOMS) {
      expect(contentSet.has(entry.id), `TOP_NAV_ROOMS has ${entry.id} but AppRoomContent has no case`).toBe(
        true,
      );
    }
  });

  it("ROOMS_WITH_CONTENT and TOP_NAV_ROOMS cover the same rooms (no extra cases)", () => {
    const navIds = new Set(TOP_NAV_ROOMS.map((r) => r.id));
    expect(ROOMS_WITH_CONTENT.length).toBe(TOP_NAV_ROOMS.length);
    for (const room of ROOMS_WITH_CONTENT) {
      expect(navIds.has(room), `AppRoomContent has case for ${room} but TOP_NAV_ROOMS has no entry`).toBe(
        true,
      );
    }
  });

  it("every content room except MAIN/NEXUS has a ROOM_RENDERERS entry", () => {
    const contentOnly = ROOMS_WITH_CONTENT.filter((r) => r !== "MAIN" && r !== "NEXUS").sort();
    const withRenderers = [...ROOMS_WITH_RENDERERS].sort();
    expect(withRenderers).toEqual(contentOnly);
  });

  it("ROOMS_WITH_RENDERERS has exactly ten rooms (twelve total, MAIN/NEXUS have no renderer)", () => {
    expect(ROOMS_WITH_RENDERERS.length).toBe(10);
    expect(ROOMS_WITH_RENDERERS).toContain("SANDBOX");
    expect(ROOMS_WITH_RENDERERS).toContain("TUNINGLAB");
    expect(ROOMS_WITH_RENDERERS).toContain("WORLDGALLERY");
  });

  it("ROOM_SHORTCUTS has exactly the same keys as ROOMS_WITH_CONTENT", () => {
    const contentKeys = [...ROOMS_WITH_CONTENT].sort();
    const shortcutKeys = Object.keys(ROOM_SHORTCUTS).sort();
    expect(shortcutKeys).toEqual(contentKeys);
  });

  it("room keymap index stays in sync: ROOM_KEYMAP_SOURCE keys = ROOMS_WITH_CONTENT; ROOMS_WITH_KEYMAP ⊆ content", () => {
    const contentSet = new Set(ROOMS_WITH_CONTENT);
    const sourceKeys = Object.keys(ROOM_KEYMAP_SOURCE).sort();
    const contentKeys = [...ROOMS_WITH_CONTENT].sort();
    expect(sourceKeys).toEqual(contentKeys);
    for (const room of ROOMS_WITH_KEYMAP) {
      expect(contentSet.has(room), `ROOMS_WITH_KEYMAP has ${room} but not in ROOMS_WITH_CONTENT`).toBe(true);
    }
  });

  it("every playable room keeps pointer-first discoverability metadata in roomRegistry", () => {
    const playableRooms = TOP_NAV_ROOMS.filter((entry) => entry.id !== "MAIN" && entry.id !== "NEXUS");

    for (const entry of playableRooms) {
      expect(entry.intentLabel, `${entry.id} is missing intentLabel in TOP_NAV_ROOMS`).toBeTruthy();
      expect(entry.pointerHint, `${entry.id} is missing pointerHint in TOP_NAV_ROOMS`).toBeTruthy();
      expect(entry.firstRunHint, `${entry.id} is missing firstRunHint in TOP_NAV_ROOMS`).toBeTruthy();
      expect(entry.firstRunStorageKey, `${entry.id} is missing firstRunStorageKey in TOP_NAV_ROOMS`).toBeTruthy();
      expect((entry.firstRunHint as string).toLowerCase()).toMatch(/legend|keys|world|gallery|scroll|understand|json|structure|journey/);
    }
  });

  it("shared discoverability helpers expose the same canonical pointer-hint and first-run hint contract", () => {
    const pointerHintIds = getRoomsWithPointerHints().map((entry) => entry.id).sort();
    const expectedPointerHintIds = TOP_NAV_ROOMS.filter((entry) => entry.pointerHint)
      .map((entry) => entry.id)
      .sort();

    expect(pointerHintIds).toEqual(expectedPointerHintIds);
    expect(getRoomFirstRunConfig("MAIN")).toBeNull();
    expect(getRoomFirstRunConfig("NEXUS")).toBeNull();
    expect(getRoomFirstRunConfig("RESONANCE")).toEqual({
      hint: TOP_NAV_ROOMS.find((entry) => entry.id === "RESONANCE")?.firstRunHint,
      storageKey: TOP_NAV_ROOMS.find((entry) => entry.id === "RESONANCE")?.firstRunStorageKey,
    });
  });
});
