export type AppResidentTrafficBridgeIoSnapshotId =
  | "frameInputSnapshot"
  | "residentEventCollectionSnapshot"
  | "quantizedBranchIoSnapshot"
  | "directBranchIoSnapshot"
  | "sharedResidentSoundResolutionSnapshot"
  | "queueProvenanceSnapshot"
  | "frameOrderSnapshot";

export type AppResidentTrafficBridgeIoSnapshotEntry = {
  readonly id: AppResidentTrafficBridgeIoSnapshotId;
  readonly currentOwner: string;
  readonly inputReads: readonly string[];
  readonly outputWrites: readonly string[];
  readonly timeBase: string;
  readonly frameOrderContract: string;
  readonly mutationBoundary: string;
  readonly equivalenceRequirementBeforeExtraction: string;
  readonly mustRemainDistinctFrom: readonly string[];
};

export const APP_RESIDENT_TRAFFIC_BRIDGE_IO_SNAPSHOT = [
  {
    id: "frameInputSnapshot",
    currentOwner: "App.tsx Resonance Nexus main loop RAF tick",
    inputReads: [
      "installationSharedFieldActive",
      "installationFieldConfigRef.current.residentsEnabled",
      "topologyRefs.current.nodes",
      "topologyRefs.current.cursor projected to installationOscillatorBall",
      "TOPO_WIDTH / TOPO_HEIGHT",
      "GAME_WIDTH / GAME_HEIGHT",
    ],
    outputWrites: ["residentFieldFrame local value"],
    timeBase: "visual/physics RAF frame coordinates, not audio-time seconds",
    frameOrderContract:
      "must be derived after the current topology cursor and oscillator-ball projection are available and before residentWaveEvents are collected",
    mutationBoundary:
      "pure frame value; must not mutate queue, audio nodes, quantize anchor, UI state, or Wellenstarter/Root-Follow state",
    equivalenceRequirementBeforeExtraction:
      "a later builder must receive the same active/config/nodes/oscillatorBall/source/target geometry inputs and return the same residentFieldFrame shape",
    mustRemainDistinctFrom: ["Room III topology render loop", "generic canvas renderer", "Wellenstarter live branch"],
  },
  {
    id: "residentEventCollectionSnapshot",
    currentOwner: "App.tsx Resonance Nexus main loop RAF tick",
    inputReads: [
      "residentFieldFrame",
      "installationSharedFieldActive && installationFieldConfigRef.current.residentsEnabled",
      "installationFieldConfigRef.current",
      "state.ripples",
      "state.sectorPulses",
      "installationNowMs/frameNowMs",
      "targetFreq",
    ],
    outputWrites: ["residentWaveEvents local array"],
    timeBase: "visual wave-field time in milliseconds plus current targetFreq",
    frameOrderContract:
      "must run after ripple/sector-pulse mutation for the current frame and before either quantized or direct resident audio branching",
    mutationBoundary:
      "event collection is side-effect-free locally; queue writes and direct audio calls happen only in later branches",
    equivalenceRequirementBeforeExtraction:
      "a later helper must not reorder collection before wave mutation or after grid/cursor drawing; residentWaveEvents must stay local to the same RAF tick unless a bridge output object is introduced",
    mustRemainDistinctFrom: ["particle simulation render", "ripple drawing", "generic event collector", "Stable Rhythm Lane"],
  },
  {
    id: "quantizedBranchIoSnapshot",
    currentOwner: "App.tsx Resonance Nexus main loop RAF tick",
    inputReads: [
      "residentWaveEvents",
      "p.quantizeOn === true",
      "audioCtxRef.current ?? audioCtx",
      "getAudioNowSec(ctx)",
      "getQuantizeStepSeconds(gridTempoBpm, quantizeGrid)",
      "resolveQuantizeAnchor(quantizeAnchorRef.current, now)",
      "resolveResidentSoundDefinition(...) per event",
      "resolveTrafficQuantizeSchedule({ nowSec, stepSec, anchorSec, sourceKey, targetKind: resident })",
      "getResidentCollisionOutputAmp(...) per event",
    ],
    outputWrites: [
      "quantizeAnchorRef.current = anchor",
      "waveCollisionQueueRef.current resident entries via mergeQueuedCollisionTrigger",
    ],
    timeBase: "audio-time seconds with quantize anchor provenance",
    frameOrderContract:
      "must run in the same frame after residentWaveEvents collection and before any later frame cleanup; schedule.dueTime/macroDueTime belong to audio-time, not RAF-time",
    mutationBoundary:
      "writes only quantizeAnchorRef and resident entries in waveCollisionQueueRef; must not fire direct resident tones or create a new queue policy",
    equivalenceRequirementBeforeExtraction:
      "a later boundary must preserve sourceKey, targetKind: resident, anchorSec, dueTime, macroDueTime, freq, amp, preset, x/y, and waveGain outputs for each event",
    mustRemainDistinctFrom: ["directResidentToneBranch", "Wellenstarter queue policy", "Root Follow live policy", "Stable Rhythm scheduler"],
  },
  {
    id: "directBranchIoSnapshot",
    currentOwner: "App.tsx Resonance Nexus main loop RAF tick",
    inputReads: [
      "residentWaveEvents",
      "p.quantizeOn === false",
      "resolveResidentSoundDefinition(...) per event",
      "getResidentCollisionOutputAmp(...) per event",
      "p.echoOn && state.delayNode",
      "playNexusAgentTone action port",
    ],
    outputWrites: ["immediate playNexusAgentTone(..., targetKind: resident) calls"],
    timeBase: "current RAF-frame immediacy; intentionally bypasses the quantized traffic queue when quantize is off",
    frameOrderContract:
      "must remain after residentWaveEvents collection and must not be delayed into the quantized queue without an explicit musical decision",
    mutationBoundary:
      "fires existing Nexus audio action port only; must not create a new event manager, queue, call-plan layer, or resident scheduling policy",
    equivalenceRequirementBeforeExtraction:
      "a later helper may call playNexusAgentTone through an injected action port, but direct-vs-queued branch separation must remain explicit",
    mustRemainDistinctFrom: ["quantizedResidentCollisionBranch", "Wellenstarter attack policy", "Nexus audio action surface ownership"],
  },
  {
    id: "sharedResidentSoundResolutionSnapshot",
    currentOwner: "App.tsx resident traffic branch point",
    inputReads: [
      "event.soundSelectionId",
      "event.elasticPitchEnabled",
      "installationFieldConfigRef.current.residentSound",
      "resolveResidentSoundDefinition",
      "event.freq / event.amp",
    ],
    outputWrites: [
      "residentSound.collision.freqMul applied to freq",
      "residentSound.collision.ampMul applied through getResidentCollisionOutputAmp",
      "residentSound.collision.preset passed to queue or direct action",
    ],
    timeBase: "per-resident-event branch-time lookup",
    frameOrderContract:
      "must be resolved inside the same event branch so queued and direct paths see the same resident identity source",
    mutationBoundary:
      "lookup/argument derivation only; no UI preset state mutation and no MetaPreset action involvement",
    equivalenceRequirementBeforeExtraction:
      "unifying this as a helper is allowed only if direct and queued branch args remain semantically identical to the current per-event code",
    mustRemainDistinctFrom: ["MetaPreset action boundary", "static resident catalog UI", "generic particle tone preset"],
  },
  {
    id: "queueProvenanceSnapshot",
    currentOwner: "App.tsx quantized resident collision branch",
    inputReads: [
      "event.targetId",
      "event.sourceKind",
      "sourceKey = resident:${event.targetId}:${event.sourceKind}",
      "targetKind: resident",
      "quantizeAnchorRef.current",
      "waveCollisionQueueRef.current",
    ],
    outputWrites: ["resident-targeted collision queue entries with sourceKey and targetKind provenance"],
    timeBase: "audio-time schedule plus resident source identity",
    frameOrderContract:
      "sourceKey/targetKind provenance must survive any later bridge extraction so resident entries do not overwrite or merge with unrelated wave users",
    mutationBoundary:
      "shared storage does not imply shared policy; resident queue entries stay a distinct occupant of waveCollisionQueueRef",
    equivalenceRequirementBeforeExtraction:
      "a later IO object must expose sourceKey and targetKind explicitly; never hide them inside a generic queue write command",
    mustRemainDistinctFrom: ["Wellenstarter collision queue", "particle quantize admission", "Stable Rhythm scheduler", "Root Follow cursor-follow policy"],
  },
  {
    id: "frameOrderSnapshot",
    currentOwner: "App.tsx Resonance Nexus main loop RAF tick",
    inputReads: [
      "mutated state.ripples",
      "mutated state.sectorPulses",
      "particle simulation/render result",
      "residentWaveEvents",
      "p.gridOn and focus/cursor drawing inputs",
    ],
    outputWrites: ["resident queue/direct audio side effects before later cursor/grid visualization continues"],
    timeBase: "single RAF tick with mixed visual-physics and audio side effects",
    frameOrderContract:
      "resident traffic bridge currently sits after wave and particle frame work but before later cursor/grid drawing; extraction must preserve this relative order",
    mutationBoundary:
      "do not move the bridge into a visual-only renderer or a generic audio scheduler; it is a live-instrument bridge between both domains",
    equivalenceRequirementBeforeExtraction:
      "a future boundary must accept already-current frame inputs and return/apply only the same queue/direct outputs, without reordering ripple/sector mutation or drawing phases",
    mustRemainDistinctFrom: ["generic canvas renderer", "generic audio scheduler", "UI assembly"],
  },
] as const satisfies readonly AppResidentTrafficBridgeIoSnapshotEntry[];

export const APP_RESIDENT_TRAFFIC_BRIDGE_IO_SNAPSHOT_CONTRACT = {
  patch: "3.2.91.6.9.243_resident_traffic_bridge_io_snapshot",
  previousPatchLineage: 'patch: "3.2.91.6.9.242_resident_traffic_bridge_audit"',
  snapshotOnly: true,
  runtimeBoundaryExtracted: false,
  noUiChangedBySnapshot: true,
  noRuntimeCodeMoved: true,
  noAudioNodeLifecycleMoved: true,
  noResidentTrafficPolicyMoved: true,
  noFrameOrderMoved: true,
  noQuantizeAnchorRewrite: true,
  noQueuePolicyRewrite: true,
  noDirectVsQueuedBranchCollapse: true,
  noResidentSoundNormalization: true,
  noWellenstarterOrRootFollowPolicyOwnedHere: true,
  noStableLanePolicyOwnedHere: true,
  noNewEventQueueOrCallPlan: true,
  residentTrafficBridgeStillInlineInMainLoop: true,
  snapshotIds: [
    "frameInputSnapshot",
    "residentEventCollectionSnapshot",
    "quantizedBranchIoSnapshot",
    "directBranchIoSnapshot",
    "sharedResidentSoundResolutionSnapshot",
    "queueProvenanceSnapshot",
    "frameOrderSnapshot",
  ] as const,
  nextRecommendedMoves: [
    "resident traffic bridge pure builder/helper candidates only after direct-vs-queued parity is explicit",
    "sourceKey/targetKind/quantizeAnchor IO object before any boundary extraction",
    "no extraction of resident bridge until frame-order markers can be guarded against the actual App.tsx sequence",
  ] as const,
} as const;
