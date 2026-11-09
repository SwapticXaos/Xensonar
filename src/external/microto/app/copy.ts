/**
 * Shared UI copy (vision §8: reduce duplication; single source for user-facing strings).
 * Use when the same string appears in multiple components (e.g. welcome CTA and legend).
 */

/** One-click CTA on MAIN/NEXUS welcome (WelcomeMainNexus) and keyboard legend (ROOM_SHORTCUTS). */
export const ENABLE_AUDIO_OPEN_SYNTH = "Enable audio & open Synth";

/** Non-modal bar in AppShell when audio is not running (vision: zero-friction playability). */
export const CLICK_TO_ENABLE_AUDIO = "Click to enable audio";

/** Keyboard legend bar label (vision §5: controls understandable; ? toggles legend). */
export const SHORTCUTS_LEGEND_LABEL = "Shortcuts (?)";

/** Shown when AudioContext fails to start (vision §7: platform resilience). */
export const AUDIO_INIT_FAILED = "Could not start audio. Try again or check browser settings.";

/** Global room navigation shortcut (vision §5: controls understandable; avoid modal dead-ends). */
export const ROOM_NAV_SHORTCUT_KEYS = "Alt+1 .. Alt+0, Alt+-";
export const ROOM_NAV_SHORTCUT_ACTION = "Jump to room I–XI";

/** Diagnostics HUD actions (dev-only). */
export const EXPORT_LOG_COPY = "Copy log JSON";
export const EXPORT_LOG_DOWNLOAD = "Download log JSON";
export const IMPORT_LOG_LOAD = "Load log JSON";
export const IMPORT_LOG_PASTE = "Paste log JSON";

/** MAIN/NEXUS welcome tour suggestion (vision: single coherent instrument journey). */
export const WELCOME_TOUR_LABEL =
  "Suggested tour: V. XENSONAR SYNTH → VI. RESONANCE COMMONS → IV. IRRLICHT ARENA → VIII. JUMP RUN JAM.";

/** MAIN/NEXUS "Start by mood" strip (vision §3 harmonic first-class; §5 discoverability). */
export const WELCOME_START_BY_MOOD_LABEL = "Start by mood";

/** Shell / welcome: "Explore by tag" strip — one click loads a random scene with that tag (vision §3 §5 discoverability). */
export const WELCOME_EXPLORE_BY_TAG_LABEL = "Explore by tag";

/** Shell HUD: "Start by difficulty" strip — one click loads a random scene at that level (vision §3 §5 practice-oriented discoverability). */
export const WELCOME_START_BY_DIFFICULTY_LABEL = "Start by level";

/** Shell bar quick-start: load random world from full catalog (vision §5 discoverability). */
export const SHELL_SURPRISE_ME_LABEL = "Surprise me";

/** Global shortcut for Surprise me (vision §5: controls understandable). */
export const SHELL_SURPRISE_ME_SHORTCUT_KEYS = "Ctrl+Shift+S";
export const SHELL_SURPRISE_ME_SHORTCUT_ACTION = "Surprise me: load random world";

/** Shell discoverability: load a random curated scene and open Synth (vision §3 §5). */
export const SHELL_SURPRISE_SCENE_LABEL = "Surprise scene";
/** Global shortcut for Surprise scene (vision §5: controls understandable). */
export const SHELL_SURPRISE_SCENE_SHORTCUT_KEYS = "Ctrl+Shift+R";
export const SHELL_SURPRISE_SCENE_SHORTCUT_ACTION = "Surprise scene: load random scene and open Synth";

/** Shell bar quick-start: load first scene of a practice goal (vision §3 training flows; §5 discoverability). */
export const SHELL_START_A_GOAL_LABEL = "Start a goal";
/** Shell bar quick-start: let XENSONAR pick a random practice goal for you. */
export const SHELL_SURPRISE_GOAL_LABEL = "Surprise goal";
/** Optional global shortcut: let XENSONAR pick a practice goal. */
export const SHELL_SURPRISE_GOAL_SHORTCUT_KEYS = "Ctrl+Shift+G";
export const SHELL_SURPRISE_GOAL_SHORTCUT_ACTION = "Surprise goal: load a random practice goal and open Synth";

/** Optional global shortcut: let XENSONAR pick a training flow. */
export const SHELL_SURPRISE_FLOW_SHORTCUT_KEYS = "Ctrl+Shift+F";
export const SHELL_SURPRISE_FLOW_SHORTCUT_ACTION = "Surprise flow: load a random training flow and open Synth";

/** Keyboard legend line for shell quick-start bar (vision §5: controls understandable). */
export const SHELL_QUICK_START_LEGEND_KEYS = "Shell bar";
export const SHELL_QUICK_START_LEGEND_ACTION =
  "Surprise me, Surprise scene, Surprise similar, Surprise interval, Discover an interval (strip; today's ratio, Hear + Go), Similar scenes (strip), Go to interval (strip; Hear = preview tone), Start by mood, Start by level, Explore by tag, Start a goal, Surprise goal, Surprise flow, Start a journey (welcome): load world/scene and open Synth";

/** Shell HUD: Pin recent world to favorites (vision §5 discoverability; single source for tooltips). */
export const SHELL_PIN_TO_FAVORITES_LABEL = "Add to favorites";
export const SHELL_ALREADY_IN_FAVORITES_LABEL = "Already in favorites";

/** Shell HUD: Try similar chip button prefix (vision §5 discoverability; single source for "Try similar: [label]"). */
export const SHELL_TRY_SIMILAR_LABEL = "Try similar";
/** Shell HUD: Surprise similar — load a random scene from same mood/tuning family (vision §3 §5 discoverability). */
export const SHELL_SURPRISE_SIMILAR_LABEL = "Surprise similar";
export const SHELL_SURPRISE_SIMILAR_SHORTCUT_KEYS = "Ctrl+Shift+T";
export const SHELL_SURPRISE_SIMILAR_SHORTCUT_ACTION = "Surprise similar: load random scene in same mood/tuning and open Synth";
/** Label for the "Suggested next" row in the shell HUD (vision §5 discoverability). */
export const SHELL_SUGGESTED_NEXT_LABEL = "Suggested next";
/** Label for the "Similar scenes" strip — scenes in same mood/tuning family (vision §5 discoverability). */
export const SHELL_SIMILAR_SCENES_LABEL = "Similar scenes";

/** Label for spine-backed calm/intro entry scenes row in shell HUD (vision §3 §5 gentle entry for new players). */
export const SHELL_ENTRY_SCENES_LABEL = "Calm intro scenes";

/** Tooltip for live interval explainer in shell (vision §5 §1: harmonic first-class, discoverability). */
export const SHELL_INTERVAL_EXPLAINER_TITLE = "Interval name and size in cents (harmonic feedback)";

/** MAIN/NEXUS: one-click jump to a random content room (vision §2 multi-room; §5 discoverability). */
export const WELCOME_SURPRISE_ROOM_LABEL = "Try a random room";
export const WELCOME_SURPRISE_ROOM_TITLE = "Enable audio and jump to a random playable room";

/** MAIN/NEXUS: Start a journey strip — load first world of a curated path and open Synth (vision §3 §5). */
export const WELCOME_START_A_JOURNEY_LABEL = "Start a journey";
export const WELCOME_START_JOURNEY_BUTTON_TITLE = "Load first world of this journey and open Synth";

/** MAIN/NEXUS pointer-first quickstart (vision §7: pointer-only fallback). */
export const WELCOME_POINTER_QUICKSTART =
  "Pointer-only quickstart: move the cursor over the synth canvas to hear the microtonal grid, drag to explore, and use the on-screen controls in each room. Keyboard shortcuts are always mirrored in the legend above.";

/** Session memory: last-visited room (vision §5 discoverability; resume across reloads). */
export const LAST_ROOM_PREFIX = "Last time:";
export const RESUME_IN_ROOM = "Resume there";

/** Harmonic world export (vision: harmonic systems first-class; save/share tuning + groove bundles). */
export const EXPORT_WORLD_COPY = "Copy world";
export const EXPORT_WORLD_COPIED = "Copied!";
export const EXPORT_WORLD_DOWNLOAD = "Download world";
export const EXPORT_WORLD_COPY_LINK = "Copy link";
export const EXPORT_WORLD_LINK_COPIED = "Link copied!";
export const EXPORT_WORLD_LINK_FAILED = "Link failed";

/** Global shortcut to copy current harmonic world (vision §3 §5: controls understandable). */
export const COPY_WORLD_SHORTCUT_KEYS = "Ctrl+Shift+E";
export const COPY_WORLD_SHORTCUT_ACTION = "Copy world to clipboard";

/** Global shortcut to copy a shareable world URL (no backend). */
export const COPY_WORLD_LINK_SHORTCUT_KEYS = "Ctrl+Shift+L";
export const COPY_WORLD_LINK_SHORTCUT_ACTION = "Copy share link to clipboard";

/** Harmonic world import (paste/load world from clipboard or file). */
export const IMPORT_WORLD_PASTE = "Paste world";
export const IMPORT_WORLD_LOAD_FILE = "Load world";
export const IMPORT_WORLD_LOADED = "Loaded";
export const IMPORT_WORLD_FAILED = "Failed to load world";

/** Global root (base frequency) quick-presets (vision §3 harmonic first-class; one-tap root change). */
export const ROOT_HZ_LABEL = "Root";
/** Legend line for bar Root pills (vision §5: controls understandable from keyboard legend). */
export const ROOT_BAR_LEGEND_KEYS = "Bar";
export const ROOT_BAR_LEGEND_ACTION = "Root pills set global root (Hz)";
export const ROOT_HZ_PRESETS: { hz: number; label: string; ariaLabel?: string }[] = [
  { hz: 55, label: "55", ariaLabel: "55 Hz (A1)" },
  { hz: 110, label: "110", ariaLabel: "110 Hz (A2)" },
  { hz: 220, label: "220", ariaLabel: "220 Hz (A3)" },
  { hz: 261.63, label: "C4", ariaLabel: "261.63 Hz (C4)" },
  { hz: 432, label: "432", ariaLabel: "432 Hz" },
  { hz: 440, label: "440", ariaLabel: "440 Hz (A4)" },
];

/** Performance setlist (vision §2 §3: step through prepared worlds during a set). */
export const SETLIST_NEXT_KEYS = "Ctrl+Shift+→";
export const SETLIST_NEXT_ACTION = "Setlist: next world";
export const SETLIST_PREV_KEYS = "Ctrl+Shift+←";
export const SETLIST_PREV_ACTION = "Setlist: previous world";
/** Add current harmonic world to performance setlist (vision §2 §3 §5: discoverability; up to 8). */
export const SETLIST_ADD_KEYS = "Ctrl+Shift+A";
export const SETLIST_ADD_ACTION = "Add current world to setlist";
/** Button label for Add to setlist (single source; used in WorldSetlistRow and legend). */
export const SETLIST_ADD_BUTTON_LABEL = "Add to setlist";

/** Global shortcut to cycle groove preset forward (vision §3 §5: expressive timbre, controls understandable). */
export const CYCLE_QUANTIZE_NEXT_KEYS = "Ctrl+Q";
export const CYCLE_QUANTIZE_NEXT_ACTION = "Next groove preset";
/** Global shortcut to cycle groove preset backward. */
export const CYCLE_QUANTIZE_PREV_KEYS = "Ctrl+Shift+Q";
export const CYCLE_QUANTIZE_PREV_ACTION = "Previous groove preset";

/** Global shortcut: next scene in current practice goal (vision §3 training flows; §5 discoverability). */
export const NEXT_IN_GOAL_SHORTCUT_KEYS = "Ctrl+Shift+N";
export const NEXT_IN_GOAL_SHORTCUT_ACTION = "Next scene in practice goal";

/** Global shortcut: next Resonance scene in catalog order (vision §5 discoverability). */
export const NEXT_SCENE_SHORTCUT_KEYS = "Ctrl+Shift+↓";
export const NEXT_SCENE_SHORTCUT_ACTION = "Next Resonance scene";
/** Global shortcut: previous Resonance scene in catalog order. */
export const PREV_SCENE_SHORTCUT_KEYS = "Ctrl+Shift+↑";
export const PREV_SCENE_SHORTCUT_ACTION = "Previous Resonance scene";

/** Global shortcut: jump to Resonance scene by catalog number 1–9 (vision §5 power-user discoverability). */
export const SCENE_JUMP_SHORTCUT_KEYS = "Ctrl+Alt+1 .. Ctrl+Alt+9";
export const SCENE_JUMP_SHORTCUT_ACTION = "Jump to Resonance scene 1–9";

/** Signature intervals: pin current cursor interval and recall with one click (vision §3 harmonic first-class). */
export const SIGNATURE_INTERVALS_LABEL = "Signature intervals";
export const SIGNATURE_PIN_CURRENT_LABEL = "Pin current";
export const SIGNATURE_PIN_CURRENT_TITLE = "Save current cursor interval (up to 3)";
export const SIGNATURE_GO_TO_LABEL = "Go to";
export const SIGNATURE_GO_TO_TITLE = (label: string) => `Move cursor to ${label} above root`;
/** Preview interval: play a short tone at this ratio above root (vision §3 harmonic first-class, discoverability). */
export const SIGNATURE_PREVIEW_TITLE = (label: string) => `Preview ${label}: play short tone`;
export const SIGNATURE_PREVIEW_LABEL = "Hear";
export const SIGNATURE_FULL_TITLE = "Pin and recall favorite intervals (harmonic first-class)";

/** Global shortcuts: jump to pinned signature interval 1/2/3 (vision §3 §5; Synth only). */
export const SIGNATURE_GO_TO_1_KEYS = "Ctrl+Shift+1";
export const SIGNATURE_GO_TO_1_ACTION = "Go to signature interval 1 (in Synth)";
export const SIGNATURE_GO_TO_2_KEYS = "Ctrl+Shift+2";
export const SIGNATURE_GO_TO_2_ACTION = "Go to signature interval 2 (in Synth)";
export const SIGNATURE_GO_TO_3_KEYS = "Ctrl+Shift+3";
export const SIGNATURE_GO_TO_3_ACTION = "Go to signature interval 3 (in Synth)";

/** Shell strip: one-click go to signature interval (discoverability when not in Synth). */
export const SHELL_SIGNATURE_STRIP_LABEL = "Go to interval";
/** Surprise interval: jump to a random discovery ratio (vision §3 exploratory). */
export const SHELL_SURPRISE_INTERVAL_LABEL = "Surprise interval";
/** Featured interval: today's harmonic discovery (vision §3 §5 discoverability; rotates daily). */
export const SHELL_FEATURED_INTERVAL_LABEL = "Discover an interval";
export const SHELL_FEATURED_INTERVAL_GO_TITLE = (label: string) => `Open Synth and move cursor to ${label}`;
