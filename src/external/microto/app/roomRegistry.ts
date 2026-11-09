export type Room =
  | "MAIN"
  | "NEXUS"
  | "TOPOLOGY"
  | "GAME"
  | "RESONANCE"
  | "COMMONS"
  | "L3LAB"
  | "PLATFORMER"
  | "HEXEVO"
  | "SANDBOX"
  | "TUNINGLAB"
  | "WORLDLAB"
  | "WORLDGALLERY";

export type TopNavRoom = {
  id: Room;
  label: string;
  activeClass: string;
  /** Short intent label for tooltip (vision §5 discoverability). */
  intentLabel?: string;
  /** Pointer-first quickstart hint used by MAIN/NEXUS welcome and other discoverability surfaces. */
  pointerHint?: string;
  /** Room-local first-run hint shown inside the active room surface. */
  firstRunHint?: string;
  /** Stable storage key for dismissing the room-local first-run hint. */
  firstRunStorageKey?: string;
};

export type RoomFirstRunConfig = {
  hint: string;
  storageKey: string;
};

export const TOP_NAV_ROOMS: TopNavRoom[] = [
  { id: "MAIN", label: "I. DAS INSTRUMENT", activeClass: "bg-white text-black", intentLabel: "Welcome · Enable audio" },
  { id: "NEXUS", label: "II. DER NEXUS", activeClass: "bg-white text-black", intentLabel: "Welcome · Enable audio" },
  {
    id: "TOPOLOGY",
    label: "III. TOPOLOGICAL MANIFOLD",
    activeClass: "bg-white text-black",
    intentLabel: "Explore topology field",
    pointerHint: "Wander the cursor to hear the pitch landscape; activate Myzel to start motion and follow how the field responds.",
    firstRunHint: "Move cursor to drive pitch · Activate Myzel to start · See legend (?) for keys",
    firstRunStorageKey: "xensonar_topology_hint_seen",
  },
  {
    id: "GAME",
    label: "IV. IRRLICHT ARENA",
    activeClass: "bg-amber-200 text-black",
    intentLabel: "Projectile game loop",
    pointerHint: "Move the cursor to read the battlefield and HUD first; then add keyboard movement and shots when you want the full arena loop.",
    firstRunHint: "A/D or arrows to move, Space to shoot · See legend (?) for keys",
    firstRunStorageKey: "xensonar_arena_hint_seen",
  },
  {
    id: "RESONANCE",
    label: "V. XENSONAR SYNTH",
    activeClass: "bg-purple-300 text-black",
    intentLabel: "Synth + agents + groove",
    pointerHint: "Move the cursor over the synth canvas to hear the microtonal grid; Shift+R or «Set as root» in Grid/Quantize sets cursor pitch as global harmonic center; right-click toggles echo; Wave and Groove panels for texture.",
    firstRunHint:
      "Move mouse to change pitch · Shift+R or «Set as root» sets global root · Right click toggles echo · Shell bar shows Interval (when grid on) + Root pills · See legend (?) for keys",
    firstRunStorageKey: "xensonar_resonance_hint_seen",
  },
  {
    id: "COMMONS",
    label: "VI. RESONANCE COMMONS",
    activeClass: "bg-emerald-300 text-black",
    intentLabel: "JI/EDO practice space",
    pointerHint: "Glide the cursor through the shared field to stir agents; watch pulses and wisps react; no keyboard needed to explore the mood.",
    firstRunHint: "← → ↑ ↓ move, Space/Click fire pulse · A–L toggle agents · See legend (?)",
    firstRunStorageKey: "xensonar_commons_hint_seen",
  },
  {
    id: "L3LAB",
    label: "VII. L3 WORKSPACE",
    activeClass: "bg-blue-300 text-black",
    intentLabel: "L3 combat practice",
    pointerHint: "Aim with the mouse and fire sector waves; experiment with different angles and timings to feel the spatial rhythm.",
    firstRunHint: "Y/X/C/V sector waves, mouse or arrows to aim · See legend (?) for keys",
    firstRunStorageKey: "xensonar_l3_hint_seen",
  },
  {
    id: "PLATFORMER",
    label: "VIII. JUMP RUN JAM",
    activeClass: "bg-cyan-300 text-black",
    intentLabel: "Jump + Run soundtrack",
    pointerHint: "Start the route, then watch and listen: treat it as a living soundtrack and HUD even if you only poke with the mouse.",
    firstRunHint: "Left/Right or A/D to move, Space to jump · See legend (?) for keys",
    firstRunStorageKey: "xensonar_platformer_hint_seen",
  },

  {
    id: "HEXEVO",
    label: "IX. HEX EVO",
    activeClass: "bg-fuchsia-300 text-black",
    intentLabel: "Pantoffeltier → Melodic Loop",
    pointerHint: "Spiele Hex Evo bis ein Pantoffeltier steuerbar ist. Dann sende es mit dem Button im Spiel an Melodic Loop: mPRG projiziert DNA, Bewegung und Action-Ecology als Notenblöcke.",
    firstRunHint: "Hex Evo im mPRG-Host · erst Kreatur erzeugen, dann ‘Pantoffeltier an Melodic Loop senden’",
    firstRunStorageKey: "xensonar_hex_evo_hint_seen",
  },
  {
    id: "SANDBOX",
    label: "X. SANDBOX",
    activeClass: "bg-neutral-400 text-black",
    intentLabel: "Minimal click-to-play",
    pointerHint: "Click anywhere on the canvas to hear single tones; drag slowly to trace how pitch flows across the space.",
    firstRunHint: "Click canvas to play tone · See legend (?) for keys",
    firstRunStorageKey: "xensonar_sandbox_hint_seen",
  },
  {
    id: "TUNINGLAB",
    label: "XI. TUNING LAB",
    activeClass: "bg-teal-300 text-black",
    intentLabel: "Cursor-driven pitch",
    pointerHint: "Move the cursor vertically to sweep pitch; click or Space to play. Toggle JI grid (G or button) to snap to just-intonation ratios.",
    firstRunHint: "Move cursor for pitch, click or Space to play; G toggles JI grid · See legend (?) for keys",
    firstRunStorageKey: "xensonar_tuninglab_hint_seen",
  },
  {
    id: "WORLDLAB",
    label: "XII. WORLD LAB",
    activeClass: "bg-indigo-300 text-black",
    intentLabel: "Inspect harmonic worlds",
    pointerHint:
      "Inspect the active harmonic world: see tuning, groove, tags, and raw export JSON for sharing or future editing.",
    firstRunHint:
      "Use World Lab to understand the current harmonic world’s structure and export JSON you can save or tweak.",
    firstRunStorageKey: "xensonar_worldlab_hint_seen",
  },
  {
    id: "WORLDGALLERY",
    label: "XIII. WORLD GALLERY",
    activeClass: "bg-fuchsia-300 text-black",
    intentLabel: "Browse harmonic worlds",
    pointerHint: "Browse named harmonic worlds; click a world to load it into the synth, then follow the World Journey strip into other rooms.",
    firstRunHint: "Scroll the gallery, pick a world, then jump into Resonance or other rooms via the journey strip. See legend (?) for keys.",
    firstRunStorageKey: "xensonar_worldgallery_hint_seen",
  },
];

/** Single source of truth: rooms that have content (same as nav order). Adding a room = add to TOP_NAV_ROOMS only. */
export const ROOMS_WITH_CONTENT: readonly Room[] = TOP_NAV_ROOMS.map((r) => r.id);

/** Rooms that have a content renderer (content minus MAIN/NEXUS). Same as canvas rooms: all use useSimulationLoop. Single source for ROOM_RENDERERS keys and CANVAS_ROOMS. */
export const ROOMS_WITH_RENDERERS: readonly Room[] = ROOMS_WITH_CONTENT.filter(
  (r) => r !== "MAIN" && r !== "NEXUS",
);

export function getRoomRegistryEntry(room: Room): TopNavRoom {
  const entry = TOP_NAV_ROOMS.find((candidate) => candidate.id === room);
  if (!entry) {
    throw new Error(`[XENSONAR] Missing roomRegistry entry for "${room}".`);
  }
  return entry;
}

export function getRoomsWithPointerHints(): TopNavRoom[] {
  return TOP_NAV_ROOMS.filter((entry) => Boolean(entry.pointerHint));
}

export function getRoomFirstRunConfig(room: Room): RoomFirstRunConfig | null {
  const entry = getRoomRegistryEntry(room);
  if (!entry.firstRunHint || !entry.firstRunStorageKey) {
    return null;
  }
  return {
    hint: entry.firstRunHint,
    storageKey: entry.firstRunStorageKey,
  };
}

export function requireRoomFirstRunConfig(room: Room): RoomFirstRunConfig {
  const config = getRoomFirstRunConfig(room);
  if (!config) {
    throw new Error(`[XENSONAR] Missing first-run room discoverability config for "${room}".`);
  }
  return config;
}

export function getRoomFirstRunHint(room: Room): string | null {
  return getRoomFirstRunConfig(room)?.hint ?? null;
}

export function getRoomFirstRunStorageKey(room: Room): string | null {
  return getRoomFirstRunConfig(room)?.storageKey ?? null;
}
