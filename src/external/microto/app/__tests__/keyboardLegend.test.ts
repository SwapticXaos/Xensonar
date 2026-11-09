/**
 * Locks GLOBAL_SHORTCUTS and room nav discoverability (vision §5).
 * Ensures keyboard legend includes Alt+1..0 room nav in every room.
 */

import { describe, expect, it } from "vitest";

import {
  COPY_WORLD_SHORTCUT_ACTION,
  COPY_WORLD_SHORTCUT_KEYS,
  COPY_WORLD_LINK_SHORTCUT_ACTION,
  COPY_WORLD_LINK_SHORTCUT_KEYS,
  NEXT_IN_GOAL_SHORTCUT_ACTION,
  NEXT_IN_GOAL_SHORTCUT_KEYS,
  NEXT_SCENE_SHORTCUT_ACTION,
  NEXT_SCENE_SHORTCUT_KEYS,
  PREV_SCENE_SHORTCUT_ACTION,
  PREV_SCENE_SHORTCUT_KEYS,
  SCENE_JUMP_SHORTCUT_ACTION,
  SCENE_JUMP_SHORTCUT_KEYS,
  ROOM_NAV_SHORTCUT_ACTION,
  ROOM_NAV_SHORTCUT_KEYS,
  ROOT_BAR_LEGEND_KEYS,
  ROOT_BAR_LEGEND_ACTION,
  SETLIST_ADD_KEYS,
  SETLIST_ADD_ACTION,
  SHELL_QUICK_START_LEGEND_ACTION,
  SHELL_QUICK_START_LEGEND_KEYS,
  SHELL_SURPRISE_SCENE_SHORTCUT_KEYS,
  SHELL_SURPRISE_SCENE_SHORTCUT_ACTION,
  SHELL_SURPRISE_SIMILAR_SHORTCUT_KEYS,
  SHELL_SURPRISE_SIMILAR_SHORTCUT_ACTION,
} from "../copy";
import { GLOBAL_SHORTCUTS, ROOM_SHORTCUTS } from "../keyboardLegend";
import { ROOMS_WITH_CONTENT } from "../AppRoomContent";

describe("keyboardLegend — GLOBAL_SHORTCUTS and ROOM_SHORTCUTS", () => {
  it("GLOBAL_SHORTCUTS includes room nav entry (vision §5 avoid modal dead-ends)", () => {
    expect(GLOBAL_SHORTCUTS.length).toBeGreaterThan(0);
    const roomNav = GLOBAL_SHORTCUTS.find(
      (e) => e.keys === ROOM_NAV_SHORTCUT_KEYS && e.action === ROOM_NAV_SHORTCUT_ACTION,
    );
    expect(roomNav, "GLOBAL_SHORTCUTS must include Alt+1..0 room nav").toBeDefined();
  });

  it("GLOBAL_SHORTCUTS room nav matches copy.ts constants", () => {
    const first = GLOBAL_SHORTCUTS[0];
    expect(first.keys).toBe(ROOM_NAV_SHORTCUT_KEYS);
    expect(first.action).toBe(ROOM_NAV_SHORTCUT_ACTION);
  });

  it("ROOM_SHORTCUTS has entry for every content room", () => {
    for (const room of ROOMS_WITH_CONTENT) {
      expect(ROOM_SHORTCUTS[room], `ROOM_SHORTCUTS missing ${room}`).toBeDefined();
      expect(Array.isArray(ROOM_SHORTCUTS[room])).toBe(true);
    }
  });

  it("RESONANCE legend includes right-click echo toggle", () => {
    expect(
      ROOM_SHORTCUTS.RESONANCE.some((entry) => entry.keys === "Right click" && entry.action === "Toggle echo on/off"),
    ).toBe(true);
  });

  it("RESONANCE legend includes Shift+R set global root (harmonic first-class)", () => {
    expect(
      ROOM_SHORTCUTS.RESONANCE.some(
        (entry) => entry.keys === "Shift+R" && entry.action === "Set cursor pitch as global harmonic root",
      ),
    ).toBe(true);
  });

  it("GLOBAL_SHORTCUTS includes Copy world (Ctrl+Shift+E) — vision §5 controls understandable", () => {
    const copyWorld = GLOBAL_SHORTCUTS.find(
      (e) => e.keys === COPY_WORLD_SHORTCUT_KEYS && e.action === COPY_WORLD_SHORTCUT_ACTION,
    );
    expect(copyWorld, "GLOBAL_SHORTCUTS must include Copy world shortcut").toBeDefined();
  });

  it("GLOBAL_SHORTCUTS includes Copy link (Ctrl+Shift+L) — vision §5 portability discoverability", () => {
    const copyLink = GLOBAL_SHORTCUTS.find(
      (e) => e.keys === COPY_WORLD_LINK_SHORTCUT_KEYS && e.action === COPY_WORLD_LINK_SHORTCUT_ACTION,
    );
    expect(copyLink, "GLOBAL_SHORTCUTS must include Copy link shortcut").toBeDefined();
  });

  it("GLOBAL_SHORTCUTS includes Bar Root pills (vision §5 harmonic first-class discoverability)", () => {
    const rootBar = GLOBAL_SHORTCUTS.find(
      (e) => e.keys === ROOT_BAR_LEGEND_KEYS && e.action === ROOT_BAR_LEGEND_ACTION,
    );
    expect(rootBar, "GLOBAL_SHORTCUTS must include Bar Root pills hint").toBeDefined();
  });

  it("GLOBAL_SHORTCUTS includes Shell quick-start (Surprise me, Surprise scene, Start by mood, Start a goal) — vision §5 discoverability", () => {
    const shellQuick = GLOBAL_SHORTCUTS.find(
      (e) => e.keys === SHELL_QUICK_START_LEGEND_KEYS && e.action === SHELL_QUICK_START_LEGEND_ACTION,
    );
    expect(shellQuick, "GLOBAL_SHORTCUTS must include Shell bar quick-start hint").toBeDefined();
  });

  it("GLOBAL_SHORTCUTS includes Surprise scene (Ctrl+Shift+R) — vision §3 §5 discoverability", () => {
    const surpriseScene = GLOBAL_SHORTCUTS.find(
      (e) => e.keys === SHELL_SURPRISE_SCENE_SHORTCUT_KEYS && e.action === SHELL_SURPRISE_SCENE_SHORTCUT_ACTION,
    );
    expect(surpriseScene, "GLOBAL_SHORTCUTS must include Surprise scene shortcut").toBeDefined();
  });

  it("GLOBAL_SHORTCUTS includes Surprise similar (Ctrl+Shift+T) — vision §3 §5 discoverability", () => {
    const surpriseSimilar = GLOBAL_SHORTCUTS.find(
      (e) => e.keys === SHELL_SURPRISE_SIMILAR_SHORTCUT_KEYS && e.action === SHELL_SURPRISE_SIMILAR_SHORTCUT_ACTION,
    );
    expect(surpriseSimilar, "GLOBAL_SHORTCUTS must include Surprise similar shortcut").toBeDefined();
  });

  it("GLOBAL_SHORTCUTS includes Add current world to setlist (Ctrl+Shift+A) — vision §2 §3 §5 performance setlist", () => {
    const addToSetlist = GLOBAL_SHORTCUTS.find(
      (e) => e.keys === SETLIST_ADD_KEYS && e.action === SETLIST_ADD_ACTION,
    );
    expect(addToSetlist, "GLOBAL_SHORTCUTS must include Add to setlist shortcut").toBeDefined();
  });

  it("GLOBAL_SHORTCUTS includes Next in goal (Ctrl+Shift+N) — vision §3 training flows §5 discoverability", () => {
    const nextInGoal = GLOBAL_SHORTCUTS.find(
      (e) => e.keys === NEXT_IN_GOAL_SHORTCUT_KEYS && e.action === NEXT_IN_GOAL_SHORTCUT_ACTION,
    );
    expect(nextInGoal, "GLOBAL_SHORTCUTS must include Next scene in practice goal shortcut").toBeDefined();
  });

  it("GLOBAL_SHORTCUTS includes Go to signature interval 1/2/3 (Ctrl+Shift+1/2/3) — vision §3 §5 harmonic first-class", () => {
    const sig1 = GLOBAL_SHORTCUTS.find(
      (e) => e.keys === "Ctrl+Shift+1" && e.action.includes("signature interval 1"),
    );
    const sig2 = GLOBAL_SHORTCUTS.find(
      (e) => e.keys === "Ctrl+Shift+2" && e.action.includes("signature interval 2"),
    );
    const sig3 = GLOBAL_SHORTCUTS.find(
      (e) => e.keys === "Ctrl+Shift+3" && e.action.includes("signature interval 3"),
    );
    expect(sig1, "GLOBAL_SHORTCUTS must include Go to signature 1 shortcut").toBeDefined();
    expect(sig2, "GLOBAL_SHORTCUTS must include Go to signature 2 shortcut").toBeDefined();
    expect(sig3, "GLOBAL_SHORTCUTS must include Go to signature 3 shortcut").toBeDefined();
  });

  it("GLOBAL_SHORTCUTS includes Next/Prev Resonance scene (Ctrl+Shift+↓/↑) — vision §5 discoverability", () => {
    const nextScene = GLOBAL_SHORTCUTS.find(
      (e) => e.keys === NEXT_SCENE_SHORTCUT_KEYS && e.action === NEXT_SCENE_SHORTCUT_ACTION,
    );
    const prevScene = GLOBAL_SHORTCUTS.find(
      (e) => e.keys === PREV_SCENE_SHORTCUT_KEYS && e.action === PREV_SCENE_SHORTCUT_ACTION,
    );
    expect(nextScene, "GLOBAL_SHORTCUTS must include Next Resonance scene shortcut").toBeDefined();
    expect(prevScene, "GLOBAL_SHORTCUTS must include Previous Resonance scene shortcut").toBeDefined();
  });

  it("RESONANCE room legend includes Next/Prev scene (catalog) shortcut", () => {
    const hasNextPrev = ROOM_SHORTCUTS.RESONANCE.some(
      (e) =>
        e.keys.includes(NEXT_SCENE_SHORTCUT_KEYS) &&
        e.keys.includes(PREV_SCENE_SHORTCUT_KEYS) &&
        e.action.toLowerCase().includes("scene"),
    );
    expect(hasNextPrev, "RESONANCE must show Next/previous scene (catalog) in legend").toBe(true);
  });

  it("GLOBAL_SHORTCUTS includes Jump to scene 1–9 (Ctrl+Alt+1..9) — vision §5 power-user discoverability", () => {
    const sceneJump = GLOBAL_SHORTCUTS.find(
      (e) => e.keys === SCENE_JUMP_SHORTCUT_KEYS && e.action === SCENE_JUMP_SHORTCUT_ACTION,
    );
    expect(sceneJump, "GLOBAL_SHORTCUTS must include Jump to Resonance scene 1–9 shortcut").toBeDefined();
  });
});
