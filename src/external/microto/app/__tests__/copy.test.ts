/**
 * Locks shared UI copy constants (vision §5 discoverability, §8 reduce duplication).
 * Ensures copy.ts exports expected strings so welcome, legend, bar, and first-run hints stay in sync.
 */

import { describe, expect, it } from "vitest";

import {
  AUDIO_INIT_FAILED,
  CLICK_TO_ENABLE_AUDIO,
  COPY_WORLD_LINK_SHORTCUT_ACTION,
  COPY_WORLD_LINK_SHORTCUT_KEYS,
  COPY_WORLD_SHORTCUT_ACTION,
  COPY_WORLD_SHORTCUT_KEYS,
  CYCLE_QUANTIZE_NEXT_KEYS,
  CYCLE_QUANTIZE_NEXT_ACTION,
  CYCLE_QUANTIZE_PREV_KEYS,
  CYCLE_QUANTIZE_PREV_ACTION,
  ENABLE_AUDIO_OPEN_SYNTH,
  NEXT_IN_GOAL_SHORTCUT_KEYS,
  NEXT_IN_GOAL_SHORTCUT_ACTION,
  NEXT_SCENE_SHORTCUT_KEYS,
  NEXT_SCENE_SHORTCUT_ACTION,
  PREV_SCENE_SHORTCUT_KEYS,
  PREV_SCENE_SHORTCUT_ACTION,
  SCENE_JUMP_SHORTCUT_KEYS,
  SCENE_JUMP_SHORTCUT_ACTION,
  LAST_ROOM_PREFIX,
  RESUME_IN_ROOM,
  ROOM_NAV_SHORTCUT_ACTION,
  ROOM_NAV_SHORTCUT_KEYS,
  ROOT_HZ_LABEL,
  SETLIST_ADD_KEYS,
  SETLIST_ADD_ACTION,
  SETLIST_ADD_BUTTON_LABEL,
  ROOT_HZ_PRESETS,
  SHELL_QUICK_START_LEGEND_ACTION,
  SHELL_QUICK_START_LEGEND_KEYS,
  SHELL_START_A_GOAL_LABEL,
  SHELL_SURPRISE_ME_LABEL,
  SHELL_SURPRISE_ME_SHORTCUT_KEYS,
  SHELL_SURPRISE_ME_SHORTCUT_ACTION,
  SHELL_SURPRISE_SCENE_LABEL,
  SHELL_SURPRISE_SCENE_SHORTCUT_KEYS,
  SHELL_SURPRISE_SCENE_SHORTCUT_ACTION,
  SHELL_SURPRISE_SIMILAR_LABEL,
  SHELL_SURPRISE_SIMILAR_SHORTCUT_KEYS,
  SHELL_SURPRISE_SIMILAR_SHORTCUT_ACTION,
  SHELL_PIN_TO_FAVORITES_LABEL,
  SHELL_ALREADY_IN_FAVORITES_LABEL,
  SHELL_TRY_SIMILAR_LABEL,
  SHELL_SUGGESTED_NEXT_LABEL,
  SHELL_SIMILAR_SCENES_LABEL,
  SHELL_FEATURED_INTERVAL_LABEL,
  SHELL_FEATURED_INTERVAL_GO_TITLE,
  SIGNATURE_PREVIEW_LABEL,
  SIGNATURE_PREVIEW_TITLE,
  SHORTCUTS_LEGEND_LABEL,
  WELCOME_POINTER_QUICKSTART,
  WELCOME_START_A_JOURNEY_LABEL,
  WELCOME_START_BY_MOOD_LABEL,
  WELCOME_EXPLORE_BY_TAG_LABEL,
  WELCOME_START_BY_DIFFICULTY_LABEL,
  WELCOME_START_JOURNEY_BUTTON_TITLE,
  WELCOME_SURPRISE_ROOM_LABEL,
  WELCOME_SURPRISE_ROOM_TITLE,
  WELCOME_TOUR_LABEL,
} from "../copy";

describe("copy.ts — shared UI strings", () => {
  it("exports all discoverability constants as non-empty strings", () => {
    expect(typeof ENABLE_AUDIO_OPEN_SYNTH).toBe("string");
    expect(ENABLE_AUDIO_OPEN_SYNTH.length).toBeGreaterThan(0);

    expect(typeof CLICK_TO_ENABLE_AUDIO).toBe("string");
    expect(CLICK_TO_ENABLE_AUDIO.length).toBeGreaterThan(0);

    expect(typeof SHORTCUTS_LEGEND_LABEL).toBe("string");
    expect(SHORTCUTS_LEGEND_LABEL.length).toBeGreaterThan(0);

    expect(typeof AUDIO_INIT_FAILED).toBe("string");
    expect(AUDIO_INIT_FAILED.length).toBeGreaterThan(0);

    expect(typeof ROOM_NAV_SHORTCUT_KEYS).toBe("string");
    expect(ROOM_NAV_SHORTCUT_KEYS.length).toBeGreaterThan(0);

    expect(typeof ROOM_NAV_SHORTCUT_ACTION).toBe("string");
    expect(ROOM_NAV_SHORTCUT_ACTION.length).toBeGreaterThan(0);

    expect(typeof WELCOME_TOUR_LABEL).toBe("string");
    expect(WELCOME_TOUR_LABEL.length).toBeGreaterThan(0);

    expect(typeof WELCOME_START_BY_MOOD_LABEL).toBe("string");
    expect(WELCOME_START_BY_MOOD_LABEL.length).toBeGreaterThan(0);

    expect(typeof WELCOME_START_BY_DIFFICULTY_LABEL).toBe("string");
    expect(WELCOME_START_BY_DIFFICULTY_LABEL.length).toBeGreaterThan(0);

    expect(typeof WELCOME_EXPLORE_BY_TAG_LABEL).toBe("string");
    expect(WELCOME_EXPLORE_BY_TAG_LABEL.length).toBeGreaterThan(0);

    expect(typeof WELCOME_POINTER_QUICKSTART).toBe("string");
    expect(WELCOME_POINTER_QUICKSTART.length).toBeGreaterThan(0);

    expect(typeof LAST_ROOM_PREFIX).toBe("string");
    expect(LAST_ROOM_PREFIX.length).toBeGreaterThan(0);
    expect(typeof RESUME_IN_ROOM).toBe("string");
    expect(RESUME_IN_ROOM.length).toBeGreaterThan(0);
    expect(typeof WELCOME_SURPRISE_ROOM_LABEL).toBe("string");
    expect(WELCOME_SURPRISE_ROOM_LABEL.length).toBeGreaterThan(0);
    expect(typeof WELCOME_SURPRISE_ROOM_TITLE).toBe("string");
    expect(WELCOME_SURPRISE_ROOM_TITLE.length).toBeGreaterThan(0);
    expect(typeof WELCOME_START_A_JOURNEY_LABEL).toBe("string");
    expect(WELCOME_START_A_JOURNEY_LABEL.length).toBeGreaterThan(0);
    expect(typeof WELCOME_START_JOURNEY_BUTTON_TITLE).toBe("string");
    expect(WELCOME_START_JOURNEY_BUTTON_TITLE.length).toBeGreaterThan(0);
    expect(typeof COPY_WORLD_SHORTCUT_KEYS).toBe("string");
    expect(COPY_WORLD_SHORTCUT_KEYS.length).toBeGreaterThan(0);
    expect(typeof COPY_WORLD_SHORTCUT_ACTION).toBe("string");
    expect(COPY_WORLD_SHORTCUT_ACTION.length).toBeGreaterThan(0);

    expect(typeof COPY_WORLD_LINK_SHORTCUT_KEYS).toBe("string");
    expect(COPY_WORLD_LINK_SHORTCUT_KEYS.length).toBeGreaterThan(0);
    expect(typeof COPY_WORLD_LINK_SHORTCUT_ACTION).toBe("string");
    expect(COPY_WORLD_LINK_SHORTCUT_ACTION.length).toBeGreaterThan(0);

    expect(typeof SHELL_SURPRISE_ME_LABEL).toBe("string");
    expect(SHELL_SURPRISE_ME_LABEL.length).toBeGreaterThan(0);
    expect(typeof SHELL_SURPRISE_ME_SHORTCUT_KEYS).toBe("string");
    expect(SHELL_SURPRISE_ME_SHORTCUT_KEYS.length).toBeGreaterThan(0);
    expect(typeof SHELL_SURPRISE_ME_SHORTCUT_ACTION).toBe("string");
    expect(SHELL_SURPRISE_ME_SHORTCUT_ACTION.length).toBeGreaterThan(0);
    expect(typeof SHELL_SURPRISE_SCENE_LABEL).toBe("string");
    expect(SHELL_SURPRISE_SCENE_LABEL.length).toBeGreaterThan(0);
    expect(typeof SHELL_SURPRISE_SCENE_SHORTCUT_KEYS).toBe("string");
    expect(SHELL_SURPRISE_SCENE_SHORTCUT_KEYS.length).toBeGreaterThan(0);
    expect(typeof SHELL_SURPRISE_SCENE_SHORTCUT_ACTION).toBe("string");
    expect(SHELL_SURPRISE_SCENE_SHORTCUT_ACTION.length).toBeGreaterThan(0);
    expect(typeof SHELL_SURPRISE_SIMILAR_LABEL).toBe("string");
    expect(SHELL_SURPRISE_SIMILAR_LABEL.length).toBeGreaterThan(0);
    expect(typeof SHELL_SURPRISE_SIMILAR_SHORTCUT_KEYS).toBe("string");
    expect(SHELL_SURPRISE_SIMILAR_SHORTCUT_KEYS.length).toBeGreaterThan(0);
    expect(typeof SHELL_SURPRISE_SIMILAR_SHORTCUT_ACTION).toBe("string");
    expect(SHELL_SURPRISE_SIMILAR_SHORTCUT_ACTION.length).toBeGreaterThan(0);
    expect(typeof SHELL_START_A_GOAL_LABEL).toBe("string");
    expect(SHELL_START_A_GOAL_LABEL.length).toBeGreaterThan(0);
    expect(typeof SHELL_QUICK_START_LEGEND_KEYS).toBe("string");
    expect(SHELL_QUICK_START_LEGEND_KEYS.length).toBeGreaterThan(0);
    expect(typeof SHELL_QUICK_START_LEGEND_ACTION).toBe("string");
    expect(SHELL_QUICK_START_LEGEND_ACTION.length).toBeGreaterThan(0);
    expect(SHELL_QUICK_START_LEGEND_ACTION).toContain("Surprise similar");
    expect(SHELL_QUICK_START_LEGEND_ACTION).toContain("Start by level");
    expect(SHELL_QUICK_START_LEGEND_ACTION).toContain("Start a journey");
    expect(SHELL_QUICK_START_LEGEND_ACTION).toContain("Go to interval");
    expect(SHELL_QUICK_START_LEGEND_ACTION).toContain("Surprise interval");
    expect(SHELL_QUICK_START_LEGEND_ACTION).toContain("Discover an interval");
    expect(SHELL_QUICK_START_LEGEND_ACTION).toMatch(/Hear|preview tone/);
    expect(typeof SHELL_FEATURED_INTERVAL_LABEL).toBe("string");
    expect(SHELL_FEATURED_INTERVAL_LABEL.length).toBeGreaterThan(0);
    expect(typeof SHELL_FEATURED_INTERVAL_GO_TITLE).toBe("function");
    expect(SHELL_FEATURED_INTERVAL_GO_TITLE("3/2")).toContain("Open Synth");
    expect(SHELL_FEATURED_INTERVAL_GO_TITLE("3/2")).toContain("3/2");
    expect(typeof SHELL_PIN_TO_FAVORITES_LABEL).toBe("string");
    expect(SHELL_PIN_TO_FAVORITES_LABEL.length).toBeGreaterThan(0);
    expect(typeof SHELL_ALREADY_IN_FAVORITES_LABEL).toBe("string");
    expect(SHELL_ALREADY_IN_FAVORITES_LABEL.length).toBeGreaterThan(0);
    expect(typeof SHELL_TRY_SIMILAR_LABEL).toBe("string");
    expect(SHELL_TRY_SIMILAR_LABEL.length).toBeGreaterThan(0);
    expect(typeof SHELL_SUGGESTED_NEXT_LABEL).toBe("string");
    expect(SHELL_SUGGESTED_NEXT_LABEL.length).toBeGreaterThan(0);
    expect(typeof SHELL_SIMILAR_SCENES_LABEL).toBe("string");
    expect(SHELL_SIMILAR_SCENES_LABEL.length).toBeGreaterThan(0);
    expect(typeof SIGNATURE_PREVIEW_LABEL).toBe("string");
    expect(SIGNATURE_PREVIEW_LABEL.length).toBeGreaterThan(0);
    expect(typeof SIGNATURE_PREVIEW_TITLE).toBe("function");
    expect(SIGNATURE_PREVIEW_TITLE("3/2")).toContain("Preview");
    expect(SIGNATURE_PREVIEW_TITLE("3/2")).toContain("3/2");

    expect(typeof CYCLE_QUANTIZE_NEXT_KEYS).toBe("string");
    expect(CYCLE_QUANTIZE_NEXT_KEYS.length).toBeGreaterThan(0);
    expect(typeof CYCLE_QUANTIZE_NEXT_ACTION).toBe("string");
    expect(CYCLE_QUANTIZE_NEXT_ACTION.length).toBeGreaterThan(0);
    expect(typeof CYCLE_QUANTIZE_PREV_KEYS).toBe("string");
    expect(CYCLE_QUANTIZE_PREV_KEYS.length).toBeGreaterThan(0);
    expect(typeof CYCLE_QUANTIZE_PREV_ACTION).toBe("string");
    expect(CYCLE_QUANTIZE_PREV_ACTION.length).toBeGreaterThan(0);
    expect(typeof NEXT_IN_GOAL_SHORTCUT_KEYS).toBe("string");
    expect(NEXT_IN_GOAL_SHORTCUT_KEYS.length).toBeGreaterThan(0);
    expect(typeof NEXT_IN_GOAL_SHORTCUT_ACTION).toBe("string");
    expect(NEXT_IN_GOAL_SHORTCUT_ACTION.length).toBeGreaterThan(0);
    expect(typeof NEXT_SCENE_SHORTCUT_KEYS).toBe("string");
    expect(NEXT_SCENE_SHORTCUT_KEYS.length).toBeGreaterThan(0);
    expect(typeof NEXT_SCENE_SHORTCUT_ACTION).toBe("string");
    expect(NEXT_SCENE_SHORTCUT_ACTION.length).toBeGreaterThan(0);
    expect(typeof PREV_SCENE_SHORTCUT_KEYS).toBe("string");
    expect(PREV_SCENE_SHORTCUT_KEYS.length).toBeGreaterThan(0);
    expect(typeof PREV_SCENE_SHORTCUT_ACTION).toBe("string");
    expect(PREV_SCENE_SHORTCUT_ACTION.length).toBeGreaterThan(0);
    expect(typeof SCENE_JUMP_SHORTCUT_KEYS).toBe("string");
    expect(SCENE_JUMP_SHORTCUT_KEYS.length).toBeGreaterThan(0);
    expect(typeof SCENE_JUMP_SHORTCUT_ACTION).toBe("string");
    expect(SCENE_JUMP_SHORTCUT_ACTION.length).toBeGreaterThan(0);

    expect(typeof SETLIST_ADD_KEYS).toBe("string");
    expect(SETLIST_ADD_KEYS.length).toBeGreaterThan(0);
    expect(typeof SETLIST_ADD_ACTION).toBe("string");
    expect(SETLIST_ADD_ACTION.length).toBeGreaterThan(0);
    expect(SETLIST_ADD_ACTION).toContain("setlist");
    expect(typeof SETLIST_ADD_BUTTON_LABEL).toBe("string");
    expect(SETLIST_ADD_BUTTON_LABEL.length).toBeGreaterThan(0);
  });

  it("legend label directs user to ? key (vision §5 discoverability)", () => {
    expect(SHORTCUTS_LEGEND_LABEL).toContain("?");
    expect(SHORTCUTS_LEGEND_LABEL.toLowerCase()).toMatch(/shortcut/);
  });

  it("welcome copy still points users to pointer-first exploration and the legend", () => {
    expect(WELCOME_POINTER_QUICKSTART.toLowerCase()).toMatch(/pointer|cursor/);
    expect(WELCOME_POINTER_QUICKSTART.toLowerCase()).toMatch(/legend/);
  });

  it("exports root (base frequency) quick-preset label and presets for shell HUD (vision §3 harmonic first-class)", () => {
    expect(typeof ROOT_HZ_LABEL).toBe("string");
    expect(ROOT_HZ_LABEL.length).toBeGreaterThan(0);
    expect(Array.isArray(ROOT_HZ_PRESETS)).toBe(true);
    expect(ROOT_HZ_PRESETS.length).toBeGreaterThan(0);
    for (const p of ROOT_HZ_PRESETS) {
      expect(typeof p.hz).toBe("number");
      expect(Number.isFinite(p.hz)).toBe(true);
      expect(p.hz).toBeGreaterThanOrEqual(16);
      expect(p.hz).toBeLessThanOrEqual(4096);
      expect(typeof p.label).toBe("string");
      expect(p.label.length).toBeGreaterThan(0);
    }
  });
});
