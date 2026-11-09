/**
 * Room → keymap index (vision §6: input/router modules by room).
 * Single place for "which room uses which keymap"; rooms still import their keymap
 * from the paths below. Use when adding a room or auditing input routing.
 */

import type { Room } from "../../app/roomRegistry";

/** Keymap module path or description per room. MAIN/NEXUS use welcome CTA; TOPOLOGY/WORLDLAB/WORLDGALLERY are pointer-only; SANDBOX is click-only. */
export const ROOM_KEYMAP_SOURCE: Record<Room, string> = {
  HEXEVO: "game/hexEvo/HexEvoBridgeRoom.tsx; embedded game owns input",
  MAIN: "app/copy.ts (ENABLE_AUDIO_OPEN_SYNTH); no keymap",
  NEXUS: "app/copy.ts (ENABLE_AUDIO_OPEN_SYNTH); no keymap",
  TOPOLOGY: "pointer-only; no keymap",
  GAME: "features/arena/gameKeymap.ts",
  RESONANCE: "features/resonance/resonanceKeymap.ts",
  COMMONS: "features/commons/commonsKeymap.ts",
  L3LAB: "features/level3/level3Keymap.ts",
  PLATFORMER: "game/jumpRunSoundtrack/platformerKeymap.ts",
  SANDBOX: "click-only; no keymap",
  TUNINGLAB: "features/tuningLab/tuningLabKeymap.ts",
   WORLDLAB: "pointer-only; no keymap",
  WORLDGALLERY: "pointer-only; no keymap",
};

/** Rooms that have a dedicated keymap module (useRoomInput with keydown/keyup). */
export const ROOMS_WITH_KEYMAP: Room[] = ["GAME", "RESONANCE", "COMMONS", "L3LAB", "PLATFORMER", "TUNINGLAB"];
