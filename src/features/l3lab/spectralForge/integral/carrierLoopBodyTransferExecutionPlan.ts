import type { CarrierIntegralMachineId } from "./carrierIntegralContracts";
import type { CarrierIntegralSelection } from "./carrierIntegralSelection";
import {
  normalizeCarrierIntegralSynthLabSelection,
  type CarrierIntegralSynthLabSelection,
} from "./carrierIntegralSynthLab";
import {
  resolveCarrierIntegralTransferPlan,
  type CarrierIntegralTransferPlan,
} from "./carrierIntegralSendTargets";
import { resolveCarrierIntegralMachine } from "./carrierIntegralRegistry";
import { buildMaterialBodyPreviewCacheKey } from "./materialBodyPreviewCache";
import type { RootFollowBankEntryConfig, RootFollowCarrierTimbreSnapshot } from "../../../xensonar/rootFollow/rootFollowTypes";
import type { CarrierIntegralTransferExecutorTargetId } from "./carrierLoopBodyTransferTypes";
export type { CarrierIntegralTransferExecutorTargetId } from "./carrierLoopBodyTransferTypes";

export type CarrierIntegralAuditionValueSource = "stored-entry" | "right-override";

export type CarrierLoopBodyRootFollowArtifactSummary = {
  reason: string;
  config: (RootFollowBankEntryConfig & Record<string, unknown>) | null;
  baseHz: number | null;
  noteCount: number;
  trackCount: number;
  branchALineTrafficCount: number;
  b573WindowCount: number;
  intervalWindowCount: number;
  renderAudioIdentityKey?: string;
  renderAudioIdentitySource?: string;
};

export type CarrierLoopBodyAudioPaintImportDetail = {
  entryId: string;
  materialName: string;
  carrierProjectId: string;
  machineId: CarrierIntegralMachineId;
  prism: string;
  bars: number;
  bpm: number;
  rootHz: number | null;
  durationSec: number;
  config: RootFollowBankEntryConfig | null | undefined;
  carrierIntegralTimbre: RootFollowCarrierTimbreSnapshot | null | undefined;
  projectionMode: CarrierIntegralTransferPlan["projectionMode"];
  targetId: CarrierIntegralTransferExecutorTargetId;
  planReason: string;
  noteCount: number;
  trackCount: number;
  branchALineTrafficCount: number;
  b573WindowCount: number;
  intervalWindowCount: number;
  renderAudioIdentityKey?: string;
  renderAudioIdentitySource?: string;
};

export const CARRIER_LOOP_BODY_TRANSFER_EXECUTION_PLAN_VERSION =
  "carrier-loop-body-transfer-execution-plan-3.2.91.6.9.157";

export type CarrierLoopBodyMaterialExportSnapshot = {
  materialExport: {
    bars: number;
  };
};

export type CarrierLoopBodyTransferExecutionPlanInput = {
  entry: {
    id: string;
    name: string;
  };
  snapshot: CarrierLoopBodyMaterialExportSnapshot;
  machineId: CarrierIntegralMachineId;
  targetId: CarrierIntegralTransferExecutorTargetId;
  targetLabel: string;
  valueSource: CarrierIntegralAuditionValueSource;
  selectionOverride?: Partial<CarrierIntegralSelection> | null;
  storedSynthLab?: Partial<CarrierIntegralSynthLabSelection> | null;
  currentSynthLab: CarrierIntegralSynthLabSelection;
  previewBpm: number;
  previewVolume: number;
  previewPitchSemitones: number;
  timestampMs?: number;
};

export type CarrierLoopBodyTransferExecutionPlan = {
  transferPlan: CarrierIntegralTransferPlan;
  machineLabel: string;
  targetName: string;
  sourceBars: number;
  durationSec: number;
  previewGain: number;
  activeSynthLab: CarrierIntegralSynthLabSelection;
  materialEntryStableId: string;
  materialBodyPreviewCacheKey: string | null;
  registeredRenderBodyId: string | null;
  renderBodyCacheEnabled: boolean;
};

export function carrierLoopBodyMachineDisplayName(machineId: CarrierIntegralMachineId): string {
  switch (machineId) {
    case "harmonic-xplore-direct-carrier":
      return "HarmonicXplorE";
    case "spektral-synthese-body":
      return "SpektralSynthese";
    case "raw-darkpsy-oscillator":
      return "Pure Dieter";
    case "branch-a-line-traffic":
      return "Antonia";
    case "branch-b573-synth-window":
      return "Bert";
    case "branch-c-interval-body":
      return "Cecilia";
    default:
      return resolveCarrierIntegralMachine(machineId).shortLabel;
  }
}

export function carrierLoopBodyPreviewGain(
  machineId: CarrierIntegralMachineId,
  previewVolume: number,
): number {
  const balance = machineId === "raw-darkpsy-oscillator"
    ? 0.16
    : machineId === "harmonic-xplore-direct-carrier"
      ? 0.64
      : 0.92;
  return Math.max(0.04, Math.min(1, previewVolume * balance));
}

export function carrierLoopBodyDurationSecForBars(bars: number, bpm: number): number {
  return Math.max(
    0.25,
    Math.max(1, Math.round(bars || 1)) * 4 * (60 / Math.max(1, bpm || 108)),
  );
}

export function carrierLoopBodySourceBars(snapshot: CarrierLoopBodyMaterialExportSnapshot): number {
  return Math.max(1, Math.round(snapshot.materialExport.bars || 1));
}

export function buildCarrierLoopBodyMaterialEntryStableId(args: {
  stableIdPrefix: string;
  targetId: CarrierIntegralTransferExecutorTargetId;
  timestampMs?: number;
}): string {
  const timestamp = typeof args.timestampMs === "number" ? args.timestampMs : Date.now();
  return `${args.stableIdPrefix}-${args.targetId}-${Math.max(0, Math.round(timestamp)).toString(36)}`;
}

export function resolveCarrierLoopBodyTransferExecutionPlan(
  args: CarrierLoopBodyTransferExecutionPlanInput,
): CarrierLoopBodyTransferExecutionPlan {
  const transferPlan = resolveCarrierIntegralTransferPlan({
    machineId: args.machineId,
    targetId: args.targetId,
  });
  const machineLabel = carrierLoopBodyMachineDisplayName(args.machineId);
  if (!transferPlan) {
    throw new Error(`${machineLabel} unterstützt ${args.targetLabel} nicht.`);
  }

  const sourceBars = carrierLoopBodySourceBars(args.snapshot);
  const durationSec = carrierLoopBodyDurationSecForBars(
    args.snapshot.materialExport.bars,
    args.previewBpm,
  );
  const targetName = `${args.entry.name} · ${machineLabel}`;
  const previewGain = carrierLoopBodyPreviewGain(args.machineId, args.previewVolume);
  const activeSynthLab =
    args.valueSource === "right-override"
      ? args.currentSynthLab
      : normalizeCarrierIntegralSynthLabSelection(
          args.storedSynthLab,
          args.currentSynthLab,
        );
  const materialEntryStableId = buildCarrierLoopBodyMaterialEntryStableId({
    stableIdPrefix: transferPlan.stableIdPrefix,
    targetId: args.targetId,
    timestampMs: args.timestampMs,
  });
  const materialBodyPreviewCacheKey = buildMaterialBodyPreviewCacheKey({
    machineId: args.machineId,
    targetId: args.targetId,
    entryId: args.entry.id,
    snapshotName: args.entry.name,
    bars: sourceBars,
    bpm: args.previewBpm,
    previewVolume: args.previewVolume,
    previewPitchSemitones: args.previewPitchSemitones,
    valueSource: args.valueSource,
    synthLabFingerprint: activeSynthLab,
    selectionFingerprint: args.selectionOverride ?? null,
  });

  return {
    transferPlan,
    machineLabel,
    targetName,
    sourceBars,
    durationSec,
    previewGain,
    activeSynthLab,
    materialEntryStableId,
    materialBodyPreviewCacheKey,
    registeredRenderBodyId: null,
    renderBodyCacheEnabled: true,
  };
}

export function buildCarrierLoopBodyAudioPaintImportDetail(args: {
  materialEntryStableId: string;
  targetName: string;
  entryId: string;
  machineId: CarrierIntegralMachineId;
  machineLabel: string;
  sourceBars: number;
  previewBpm: number;
  durationSec: number;
  targetId: CarrierIntegralTransferExecutorTargetId;
  transferPlan: CarrierIntegralTransferPlan;
  artifact: CarrierLoopBodyRootFollowArtifactSummary;
  renderAudioIdentityKey?: string;
  renderAudioIdentitySource?: string;
}): CarrierLoopBodyAudioPaintImportDetail {
  return {
    entryId: args.materialEntryStableId,
    materialName: args.targetName,
    carrierProjectId: args.entryId,
    machineId: args.machineId,
    prism: args.machineLabel,
    bars: args.sourceBars,
    bpm: args.previewBpm,
    rootHz: args.artifact.baseHz,
    durationSec: args.durationSec,
    config: args.transferPlan.usesAudioPaintImportDetail
      ? (args.artifact.config ?? null)
      : null,
    carrierIntegralTimbre: args.transferPlan.usesAudioPaintImportDetail
      ? (args.artifact.config?.synthPatch?.carrierIntegralTimbre ?? null)
      : null,
    projectionMode: args.transferPlan.projectionMode,
    targetId: args.targetId,
    planReason: args.artifact.reason,
    noteCount: args.artifact.noteCount,
    trackCount: args.artifact.trackCount,
    branchALineTrafficCount: args.artifact.branchALineTrafficCount,
    b573WindowCount: args.artifact.b573WindowCount,
    intervalWindowCount: args.artifact.intervalWindowCount,
    renderAudioIdentityKey: args.renderAudioIdentityKey,
    renderAudioIdentitySource: args.renderAudioIdentitySource,
  };
}
