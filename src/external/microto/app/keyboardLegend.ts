/**
 * Single source of truth for on-screen keyboard legend per room.
 * Vision: "controls should remain understandable from on-screen panels and keyboard legend."
 * Aligns with project-vision.txt Quality Goals — avoid modal dead-ends.
 */

import type { Room } from "./roomRegistry";
import {
  COPY_WORLD_SHORTCUT_ACTION,
  COPY_WORLD_SHORTCUT_KEYS,
  COPY_WORLD_LINK_SHORTCUT_ACTION,
  COPY_WORLD_LINK_SHORTCUT_KEYS,
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
  ROOM_NAV_SHORTCUT_KEYS,
  ROOM_NAV_SHORTCUT_ACTION,
  ROOT_BAR_LEGEND_KEYS,
  ROOT_BAR_LEGEND_ACTION,
  SETLIST_NEXT_KEYS,
  SETLIST_NEXT_ACTION,
  SETLIST_PREV_KEYS,
  SETLIST_PREV_ACTION,
  SETLIST_ADD_KEYS,
  SETLIST_ADD_ACTION,
  SHELL_QUICK_START_LEGEND_KEYS,
  SHELL_QUICK_START_LEGEND_ACTION,
  SHELL_SURPRISE_ME_SHORTCUT_KEYS,
  SHELL_SURPRISE_ME_SHORTCUT_ACTION,
  SHELL_SURPRISE_SCENE_SHORTCUT_KEYS,
  SHELL_SURPRISE_SCENE_SHORTCUT_ACTION,
  SHELL_SURPRISE_SIMILAR_SHORTCUT_KEYS,
  SHELL_SURPRISE_SIMILAR_SHORTCUT_ACTION,
  SIGNATURE_GO_TO_1_KEYS,
  SIGNATURE_GO_TO_1_ACTION,
  SIGNATURE_GO_TO_2_KEYS,
  SIGNATURE_GO_TO_2_ACTION,
  SIGNATURE_GO_TO_3_KEYS,
  SIGNATURE_GO_TO_3_ACTION,
  SCENE_JUMP_SHORTCUT_KEYS,
  SCENE_JUMP_SHORTCUT_ACTION,
} from "./copy";

export type ShortcutEntry = { keys: string; action: string };

/** Global shortcuts and bar hints shown in every room (vision §5: controls understandable). */
export const GLOBAL_SHORTCUTS: ShortcutEntry[] = [
  { keys: ROOM_NAV_SHORTCUT_KEYS, action: ROOM_NAV_SHORTCUT_ACTION },
  { keys: COPY_WORLD_SHORTCUT_KEYS, action: COPY_WORLD_SHORTCUT_ACTION },
  { keys: COPY_WORLD_LINK_SHORTCUT_KEYS, action: COPY_WORLD_LINK_SHORTCUT_ACTION },
  { keys: ROOT_BAR_LEGEND_KEYS, action: ROOT_BAR_LEGEND_ACTION },
  { keys: SHELL_QUICK_START_LEGEND_KEYS, action: SHELL_QUICK_START_LEGEND_ACTION },
  { keys: SHELL_SURPRISE_ME_SHORTCUT_KEYS, action: SHELL_SURPRISE_ME_SHORTCUT_ACTION },
  { keys: SHELL_SURPRISE_SCENE_SHORTCUT_KEYS, action: SHELL_SURPRISE_SCENE_SHORTCUT_ACTION },
  { keys: SHELL_SURPRISE_SIMILAR_SHORTCUT_KEYS, action: SHELL_SURPRISE_SIMILAR_SHORTCUT_ACTION },
  { keys: SETLIST_PREV_KEYS, action: SETLIST_PREV_ACTION },
  { keys: SETLIST_NEXT_KEYS, action: SETLIST_NEXT_ACTION },
  { keys: SETLIST_ADD_KEYS, action: SETLIST_ADD_ACTION },
  { keys: CYCLE_QUANTIZE_NEXT_KEYS, action: CYCLE_QUANTIZE_NEXT_ACTION },
  { keys: CYCLE_QUANTIZE_PREV_KEYS, action: CYCLE_QUANTIZE_PREV_ACTION },
  { keys: NEXT_IN_GOAL_SHORTCUT_KEYS, action: NEXT_IN_GOAL_SHORTCUT_ACTION },
  { keys: NEXT_SCENE_SHORTCUT_KEYS, action: NEXT_SCENE_SHORTCUT_ACTION },
  { keys: PREV_SCENE_SHORTCUT_KEYS, action: PREV_SCENE_SHORTCUT_ACTION },
  { keys: SIGNATURE_GO_TO_1_KEYS, action: SIGNATURE_GO_TO_1_ACTION },
  { keys: SIGNATURE_GO_TO_2_KEYS, action: SIGNATURE_GO_TO_2_ACTION },
  { keys: SIGNATURE_GO_TO_3_KEYS, action: SIGNATURE_GO_TO_3_ACTION },
  { keys: SCENE_JUMP_SHORTCUT_KEYS, action: SCENE_JUMP_SHORTCUT_ACTION },
];

/** Room-specific shortcuts shown in the legend. Empty array = no keys or pointer-only. */
export const ROOM_SHORTCUTS: Record<Room, ShortcutEntry[]> = {
  HEXEVO: [],
  MAIN: [{ keys: "Click", action: `'${ENABLE_AUDIO_OPEN_SYNTH}' or use nav bar` }],
  NEXUS: [{ keys: "Click", action: `'${ENABLE_AUDIO_OPEN_SYNTH}' or use nav bar` }],
  TOPOLOGY: [{ keys: "Mouse / pointer", action: "Disturb field · hear topology-linked pitch" }],
  GAME: [
    { keys: "A / D or ← →", action: "Move orb between anchors" },
    { keys: "Space", action: "Shoot projectiles at Irrlicht" },
  ],
  RESONANCE: [
    { keys: "Shell bar", action: "Interval + BPM when grid on" },
    { keys: NEXT_SCENE_SHORTCUT_KEYS + " / " + PREV_SCENE_SHORTCUT_KEYS, action: "Next / previous scene (catalog)" },
    { keys: SCENE_JUMP_SHORTCUT_KEYS, action: SCENE_JUMP_SHORTCUT_ACTION },
    { keys: CYCLE_QUANTIZE_NEXT_KEYS + " / " + CYCLE_QUANTIZE_PREV_KEYS, action: "Cycle groove preset" },
    { keys: "← → ↑ ↓", action: "Move cursor over microtonal grid" },
    { keys: "1–0, Q–P", action: "Play note + jump cursor to pitch (current tuning)" },
    { keys: "Shift+R", action: "Set cursor pitch as global harmonic root" },
    { keys: "Y X C V", action: "Cast sector waves into the field" },
    { keys: "Right click", action: "Toggle echo on/off" },
    { keys: "Backspace", action: "Temporary high octave; hold to latch" },
    { keys: "Space", action: "Wave-drive swell for new tones" },
    { keys: "A–L", action: "Toggle agent voices on/off" },
    { keys: "Save / Load preset", action: "Store / recall Resonance setup" },
  ],
  COMMONS: [
    { keys: "← → ↑ ↓", action: "Move focus over agents" },
    { keys: "Space / Click", action: "Fire pulse into commons field" },
    { keys: "A–L", action: "Toggle individual commons agents" },
  ],
  L3LAB: [
    { keys: "← → ↑ ↓", action: "Aim focus around L3 field" },
    { keys: "Y / X / C / V", action: "Cast sector waves (left / right / up / down)" },
  ],
  PLATFORMER: [
    { keys: "A / D or ← →", action: "Move hero; trace harmonic route" },
    { keys: "Space / W / ↑", action: "Jump; collect motifs and hit forks" },
  ],
  SANDBOX: [{ keys: "Click canvas", action: "Play tone (enable audio if needed)" }],
  TUNINGLAB: [
    { keys: "Mouse / pointer", action: "Move cursor to choose frequency" },
    { keys: "Click / Space", action: "Play tone at current cursor pitch" },
    { keys: "G", action: "Toggle JI pitch grid (snap to just-intonation ratios)" },
  ],
  WORLDLAB: [
    { keys: "Mouse / pointer", action: "Scroll and inspect world details" },
    { keys: "Click", action: "Copy or edit world export JSON for later use" },
  ],
  WORLDGALLERY: [
    { keys: "Mouse / pointer", action: "Browse worlds · click a card to load into Synth" },
    { keys: "World Journey strip", action: "Jump from active world into other rooms" },
  ],
};
