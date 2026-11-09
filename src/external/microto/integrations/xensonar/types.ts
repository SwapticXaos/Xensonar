import type { MovementEvent, PlatformerArrangementForm, PlatformerArrangementMode, PlatformerTuningMode } from "../../game/jumpRunSoundtrack/platformerArrangement";
import type { PlatformerSectionBias } from "../../game/jumpRunSoundtrack/platformerSectionBias";

export type MicrotoXensonarLoopExport = {
  name: string;
  blob: Blob;
  bars: number;
  durationSec: number;
  rootHz?: number | null;
  sourceDevice: "MicrotoSynFlow" | "IrrlichtArena" | "MelodicQuest" | "Resonanzwanderer" | "Xenpolar3" | "HexEvo";
  sourceVersion: string;
  renderMode: "platformer-offline-loop";
  notes?: string;
};

export type MicrotoXensonarLoopExportHandler = (
  payload: MicrotoXensonarLoopExport,
) => void | Promise<void>;


export type MicrotoMprgBridgeMetadata = {
  protocol: "mprg-xensonar-head-bridge/v1";
  sourceKind: "trail-loop-body" | "envelope" | "unknown";
  loopBodyKey?: string | null;
  determinismKey?: string | null;
  internalTuningId?: string | null;
  externalRootId?: string | null;
  antiWhoopProtected: boolean;
  nestedTuningProtected: boolean;
  truthBoundary: {
    headlessTruthAccepted: boolean;
    audioTruthClaimRejected: boolean;
    dynamicCandidateOnly: boolean;
  };
  /**
   * Optional creature-to-score analysis produced by the mPRG hosted Hex Evo projector.
   * It is intentionally metadata only: Melodic Loop receives notes through movementEvents,
   * while this structure preserves how the pantoffel creature was read as four organismic slots.
   */
  hexEvoProjection?: {
    projectionKey: string;
    tuning?: unknown;
    rhythm?: unknown;
    slots?: Array<{
      slotIndex: number;
      role: string;
      label: string;
      reductionRole?: string;
      eventCount?: number;
      dominantSemi?: number;
      timbre?: unknown;
      rhythmRole?: string;
    }>;
    contracts?: Record<string, unknown>;
  };
};

export type MicrotoMelodicLoopSeedExport = {
  name: string;
  bars: number;
  rootHz?: number | null;
  movementEvents: MovementEvent[];
  fallbackPhrase: number[];
  arrangementMode: PlatformerArrangementMode;
  formMode: PlatformerArrangementForm;
  sectionBias: PlatformerSectionBias;
  tuningMode: PlatformerTuningMode;
  evolutionDepth: number;
  sourceDevice: "MicrotoSynFlow" | "IrrlichtArena" | "MelodicQuest" | "Resonanzwanderer" | "Xenpolar3" | "HexEvo";
  sourceVersion: string;
  notes?: string;
  /**
   * Optional Xensonar-side overlay for mPRG Whole-Head / TrailLoopBody imports.
   * Microto remains the seed-body adapter; this metadata preserves the larger
   * mPRG truth-boundary and anti-whoop/nested-tuning contracts.
   */
  mprgBridge?: MicrotoMprgBridgeMetadata;
};

export type MicrotoMelodicLoopSeedExportHandler = (
  payload: MicrotoMelodicLoopSeedExport,
) => void | Promise<void>;
