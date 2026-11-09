#!/usr/bin/env node
/**
 * Current-line gate manifest for the 3.2.91.7.5.x refactor line.
 *
 * This file is intentionally data-only. It keeps the active acceptance
 * surface in one place so taxonomy, development-basis reporting, and the
 * current-line refactor suite do not each grow their own partly divergent
 * gate lists.
 */

export const CURRENT_LINE_GATE_CHECK_FILES = [
  "check-current-line-gate-manifest.mjs",
  "check-xensonar-development-basis-contract.mjs",
  "check-check-landscape-taxonomy-contract.mjs",
  "check-xensonar-contract-boundary-registry.mjs",
  "check-app-resonance-nexus-main-loop-boundary.mjs",
  "check-app-residual-audio-lifecycle-boundaries.mjs",
  "check-refucktor-runtime-ownership-boundaries.mjs",
  "check-room3-audio-frame-runtime-ownership.mjs",
  "check-app-xenpolar-game-arena-runtime-boundary.mjs",
  "check-diagnostic-surfaces-build-gate.mjs",
  "check-xenpolar-extras-runtime-build-gate.mjs",
  "check-xenpolar-extras-bridge-profile.mjs",
  "check-family-room-lazy-boundary.mjs",
  "check-audio-worklet-blob-module-boundary.mjs",
  "check-wave-starter-worklet-pilot.mjs",
  "check-wave-starter-worklet-runtime-ownership.mjs",
  "check-root-follow-worklet-shadow-report-boundary.mjs",
  "check-burst-diagnostics-source-audit-sediment-boundary.mjs",
  "check-product-terminology-contract.mjs",
  "check-package-complete-musical-payload-contract.mjs",
  "check-workspace-package-ledger.mjs",
  "check-package-title-contract.mjs",
  "run-spectralforge-ui-boundary-sanity.mjs",
  "check-spectralforge-carrier-donor-v2-embodiment-workflow-boundary.mjs",
  "check-spectralforge-audio-engine-renderer-facade-boundary.mjs",
  "check-melodic-material-import-runtime-boundaries.mjs",
];

export const CURRENT_LINE_GATE_SCRIPTS = [
  {
    label: "Current-line gate manifest contract",
    script: "xensonar:check-current-line-gate-manifest",
    category: "suite-contract",
    file: "check-current-line-gate-manifest.mjs",
  },
  {
    label: "Development basis contract",
    script: "xensonar:check-development-basis-contract",
    category: "development-basis",
    file: "check-xensonar-development-basis-contract.mjs",
  },
  {
    label: "Development basis report",
    script: "xensonar:report-development-basis",
    category: "development-basis",
  },
  {
    label: "Check landscape taxonomy contract",
    script: "xensonar:check-check-landscape-taxonomy-contract",
    category: "check-landscape",
    file: "check-check-landscape-taxonomy-contract.mjs",
  },
  {
    label: "Check landscape taxonomy report",
    script: "xensonar:report-check-landscape-taxonomy",
    category: "check-landscape",
  },
  {
    label: "Contract boundary registry",
    script: "xensonar:check-contract-boundary-registry",
    category: "contract-boundary-registry",
    file: "check-xensonar-contract-boundary-registry.mjs",
    note: "Data-driven ownership guard for runtime facades and pure type contracts; replaces version-specific type-boundary marker checks.",
  },
  {
    label: "Resonance Nexus main-loop boundary",
    script: "xensonar:check-app-resonance-nexus-main-loop-boundary",
    category: "app-runtime-boundary",
    file: "check-app-resonance-nexus-main-loop-boundary.mjs",
    note: "Patch 260 whole-body ownership move: preserves hook order, effect dependencies, synchronous loop start, frame order, JI fallback ambiguity, and creation/cleanup coupling while moving the Nexus main-loop out of App.tsx.",
  },
  {
    label: "App residual audio lifecycle boundaries",
    script: "xensonar:check-app-residual-audio-lifecycle-boundaries",
    category: "app-runtime-boundary",
    file: "check-app-residual-audio-lifecycle-boundaries.mjs",
    note: "Shared external audio/PCM capture and the secondary Drone oscB/filter-LFO lifecycle live outside App.tsx; secondary Drone restarts only on its actual room/power/audio-context lifetime dependencies after Patch 291.",
  },
  {
    label: "Refucktor runtime ownership boundaries",
    script: "xensonar:check-refucktor-runtime-ownership-boundaries",
    category: "app-runtime-boundary",
    file: "check-refucktor-runtime-ownership-boundaries.mjs",
    note: "Room III Refucktor split: keyboard scope, simulation frame, RAF runtime, and audio session each have one owner while the room remains UI/composition orchestration.",
  },
  {
    label: "Room III audio frame runtime ownership",
    script: "xensonar:check-room3-audio-frame-runtime-ownership",
    category: "app-runtime-boundary",
    file: "check-room3-audio-frame-runtime-ownership.mjs",
    note: "Room III node-device and legacy-topology audio keep separate RAF/effect owners behind the unchanged combined facade.",
  },
  {
    label: "Irrlicht Arena single-frame runtime boundary",
    script: "xensonar:check-app-xenpolar-game-arena-runtime-boundary",
    category: "app-runtime-boundary",
    file: "check-app-xenpolar-game-arena-runtime-boundary.mjs",
    note: "Full-browser Irrlicht Arena: four Patch-281 RAF owners are consolidated into one frame session; gameplay, rendering, and Level-3 commons writes have explicit owners while core-test keeps the dormant replacement.",
  },
  {
    label: "Current parallel-refactor suite",
    script: "xensonar:sanity:parallel-refactor",
    command: "node",
    args: [
      "tools/run-xensonar-parallel-refactor-sanity.mjs",
      "--skip-roundtrip",
    ],
    category: "parallel-refactor",
    note: "The full package roundtrip remains a canonical gate, but the refactor suite runs the parallel source gates without duplicating the heavy roundtrip proof.",
  },
  {
    label: "Diagnostic surfaces build gate",
    script: "xensonar:check-diagnostic-surfaces-build-gate",
    category: "build-profile",
    file: "check-diagnostic-surfaces-build-gate.mjs",
  },
  {
    label: "Xenpolar extras runtime build gate",
    script: "xensonar:check-xenpolar-extras-runtime-build-gate",
    category: "build-profile",
    file: "check-xenpolar-extras-runtime-build-gate.mjs",
  },
  {
    label: "Xenpolar extras bridge profile",
    command: "node",
    args: ["tools/check-xenpolar-extras-bridge-profile.mjs"],
    category: "build-profile",
    file: "check-xenpolar-extras-bridge-profile.mjs",
  },
  {
    label: "Family room lazy boundary",
    script: "xensonar:check-family-room-lazy-boundary",
    category: "lazy-boundary",
    file: "check-family-room-lazy-boundary.mjs",
  },
  {
    label: "AudioWorklet blob module boundary",
    script: "xensonar:check-audio-worklet-blob-module-boundary",
    category: "audio-worklet-boundary",
    file: "check-audio-worklet-blob-module-boundary.mjs",
  },
  {
    label: "WaveStarter worklet pilot report boundary",
    script: "xensonar:check-wave-starter-worklet-pilot",
    category: "audio-worklet-boundary",
    file: "check-wave-starter-worklet-pilot.mjs",
  },
  {
    label: "WaveStarter Worklet runtime ownership",
    script: "xensonar:check-wave-starter-worklet-runtime-ownership",
    category: "audio-worklet-boundary",
    file: "check-wave-starter-worklet-runtime-ownership.mjs",
    note: "Normal visible Wellenstarter remains 90.61/main-thread; Worklet VoiceSpec/failover/voice-pool orchestration is explicit-special-path only, with Balanciert shadow mirroring off.",
  },
  {
    label: "Root-Follow worklet shadow report boundary",
    script: "xensonar:check-root-follow-worklet-shadow-report-boundary",
    category: "audio-worklet-boundary",
    file: "check-root-follow-worklet-shadow-report-boundary.mjs",
  },
  {
    label: "Burst diagnostics source audit sediment boundary",
    script: "xensonar:check-burst-diagnostics-source-audit-sediment-boundary",
    category: "source-tool-boundary",
    file: "check-burst-diagnostics-source-audit-sediment-boundary.mjs",
  },

  {
    label: "Product terminology contract",
    script: "xensonar:check-product-terminology-contract",
    category: "terminology-contract",
    file: "check-product-terminology-contract.mjs",
    note: "UI/product names are canonical; CanonicalForge/Forge2 survive only as explicit compatibility aliases.",
  },

  {
    label: "SpectralForge UI boundary sanity",
    script: "xensonar:sanity:spectralforge-ui-boundary",
    category: "spectralforge-ui-boundary",
    file: "run-spectralforge-ui-boundary-sanity.mjs",
    note: "Source-shape/static sanity for UI boundary refactors; not a browser DOM smoke test or Klang proof.",
  },
  {
    label: "SpectralForge Carrier/Donor V2 embodiment workflow boundary",
    script: "xensonar:check-spectralforge-carrier-donor-v2-embodiment-workflow-boundary",
    category: "spectralforge-runtime-boundary",
    file: "check-spectralforge-carrier-donor-v2-embodiment-workflow-boundary.mjs",
    note: "Keeps the V2 Carrier/Donor embodiment transaction outside SpectralForgeRoom while preserving the store-stage sequence and failure fanout.",
  },
  {
    label: "SpectralForge AudioEngine renderer facade boundary",
    script: "xensonar:check-spectralforge-audio-engine-renderer-facade-boundary",
    category: "spectralforge-runtime-boundary",
    file: "check-spectralforge-audio-engine-renderer-facade-boundary.mjs",
    note: "Keeps AudioEngine as the public playback/context facade while Carrier/Donor, spectral synthesis, and Forge3 buffer algorithms live in dedicated renderer owners.",
  },
  {
    label: "Melodic material import runtime boundaries",
    script: "xensonar:check-melodic-material-import-runtime-boundaries",
    category: "canonicalforge-runtime-boundary",
    file: "check-melodic-material-import-runtime-boundaries.mjs",
    note: "Carrier event/session handoff and import-rack DOM/RAF focus lifecycle live outside the Melodic material import gateway while selection and import transaction semantics remain in the gateway.",
  },
  {
    label: "Workspace package import ledger contract",
    script: "xensonar:check-package-ledger",
    category: "package",
    file: "check-workspace-package-ledger.mjs",
  },
  {
    label: "Workspace package title contract",
    script: "xensonar:check-package-title-contract",
    category: "package",
    file: "check-package-title-contract.mjs",
  },
  {
    label: "Package complete musical payload contract",
    script: "xensonar:check-package-complete-musical-payload-contract",
    category: "package",
    file: "check-package-complete-musical-payload-contract.mjs",
    runInRefactorSuite: false,
    coveredBy: "xensonar:sanity:parallel-refactor",
  },
  {
    label: "Package complete musical payload roundtrip",
    script: "xensonar:prove-package-complete-musical-payload-roundtrip",
    category: "package",
    runInRefactorSuite: false,
    coveredBy: "xensonar:sanity:parallel-refactor",
  },
];

export const CURRENT_LINE_CANONICAL_GATE_SCRIPTS = Array.from(
  new Set([
    "xensonar:sanity:refactor-suite",
    "xensonar:sanity:parallel-refactor",
    ...CURRENT_LINE_GATE_SCRIPTS.map((gate) => gate.script).filter(Boolean),
    "typecheck:micro:xensonar-rooms-panels",
    "typecheck:micro:xensonar-layout",
    "typecheck:micro:xensonar-audio",
    "typecheck:micro:xensonar-root-follow",
  ]),
);

export function currentLineGateCheckFileSet() {
  return new Set(CURRENT_LINE_GATE_CHECK_FILES);
}
