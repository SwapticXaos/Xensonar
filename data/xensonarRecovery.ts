export type RecoveryTrack = {
  id: string;
  name: string;
  status: "captured" | "partial" | "needs-rebuild" | "stabilized";
  summary: string;
  risks: string[];
  nextActions: string[];
};

export const recoveryTracks: RecoveryTrack[] = [
  {
    id: "audio-core",
    name: "Audio Core",
    status: "partial",
    summary:
      "AudioContext bootstrapping, buses, overtone infrastructure, recorder flow, and many scheduling helpers are present in the pasted source.",
    risks: [
      "One-file merges make lifecycle cleanup fragile.",
      "Large effect blocks hide dependency drift and duplicate audio nodes.",
      "Unclear ownership between UI state and mutable refs can create ghost audio.",
    ],
    nextActions: [
      "Extract audio helpers and bus setup into focused modules.",
      "Group effects by subsystem: drone, particles, recording, groove.",
      "Keep a single source of truth for params and runtime refs.",
    ],
  },
  {
    id: "visual-rooms",
    name: "Rooms & Canvases",
    status: "partial",
    summary:
      "Topology, arena, and resonance rooms are described with substantial canvas and interaction logic, but they should be reconstructed room-by-room instead of merged blindly.",
    risks: [
      "Canvas loops are easy to duplicate during copy-merge.",
      "Room state can conflict when logic remains mounted unintentionally.",
      "Missing support components can break the build late in the process.",
    ],
    nextActions: [
      "Split rooms into dedicated components before restoring full behavior.",
      "Define a small shared type layer for room IDs and runtime handles.",
      "Reintroduce canvases incrementally with one verified loop at a time.",
    ],
  },
  {
    id: "ui-schema",
    name: "Control Surface",
    status: "captured",
    summary:
      "The tuning, presets, rhythm, particle, wave, and recording control model is already clear from your source and can be restored from a typed schema first.",
    risks: [
      "Ad-hoc additions like temporary flags can desync UI and runtime state.",
      "Very wide state objects become error-prone when edited under pressure.",
      "Duplicate labels and hidden defaults obscure what is truly required.",
    ],
    nextActions: [
      "Create typed default params and option catalogs in separate files.",
      "Restore only controls that map to active logic in each pass.",
      "Use derived helpers instead of duplicating magic values in JSX.",
    ],
  },
  {
    id: "integration-strategy",
    name: "Merge Strategy",
    status: "stabilized",
    summary:
      "Instead of another direct mega-paste, the project should move through a prepared scaffold that mirrors the final app architecture but remains build-safe at every step.",
    risks: [
      "A second giant merge could fail again even if most code is valid.",
      "Type mismatches become hard to spot in very long files.",
      "Build success can hide runtime issues when no subsystem boundaries exist.",
    ],
    nextActions: [
      "Finish the modular shell first.",
      "Import source logic subsystem-by-subsystem.",
      "Build after each milestone: shell, data, room, audio, interaction.",
    ],
  },
];

export const recoveryPrinciples = [
  "Never merge the entire pasted source into one file again.",
  "Restore the app in layers that are individually buildable.",
  "Keep runtime refs, audio nodes, and UI state in clearly separated modules.",
  "Make missing support components explicit before wiring the main app.",
  "Prefer placeholders with typed contracts over broken unfinished wiring.",
];

export const recoveredFeatures = [
  "Topology room with semantic-node FM behavior",
  "Resonance room with grid tunings, drones, particles, waves, and recording",
  "Arena logic with anchors, orb, pickups, progression, and level variants",
  "Keyboard schemas for agent toggling, wave triggers, and pitch windows",
  "WAV export pipeline and crop-preview mechanics",
  "Preset catalogs for drone, particle, gradient, decay, drum, and bass behaviors",
];

export const implementationPhases = [
  {
    id: "phase-1",
    title: "Foundation extraction",
    description: "Move the shared source of truth into dedicated files: types, constants, defaults, and helper math.",
    outputs: [
      "Typed Xensonar domain model",
      "Shared option catalogs and tuning data",
      "Reusable helper utilities for grid, overtone, and recording logic",
    ],
  },
  {
    id: "phase-2",
    title: "Room scaffolding",
    description: "Recreate the room structure with isolated components before restoring any complex effects.",
    outputs: [
      "Room switcher and layout shell",
      "Stable placeholder canvases and HUD shells",
      "Explicit contracts for Topology, Game, and Resonance rooms",
    ],
  },
  {
    id: "phase-3",
    title: "Audio runtime",
    description: "Restore AudioContext, buses, recorder infrastructure, and safe lifecycle ownership.",
    outputs: [
      "Audio bootstrap and final mix routing",
      "Reusable playback helpers",
      "Recording and WAV export plumbing",
    ],
  },
  {
    id: "phase-4",
    title: "Behavior restoration",
    description: "Reconnect room interactions one subsystem at a time: topology, resonance, then arena.",
    outputs: [
      "Verified canvas loops",
      "Stable keyboard and pointer interactions",
      "Incremental build validation after each subsystem",
    ],
  },
  {
    id: "phase-5",
    title: "Final integration",
    description: "Polish controls, tune defaults, and match the intended Xensonar behavior as closely as possible.",
    outputs: [
      "Unified workstation UI",
      "Sound-design and control cleanup",
      "Ready-for-iteration Xensonar base",
    ],
  },
];
