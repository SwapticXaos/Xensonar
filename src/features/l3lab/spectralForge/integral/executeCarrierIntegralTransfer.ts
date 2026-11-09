import type { CarrierIntegralMachineId } from "./carrierIntegralContracts";
import type { CarrierIntegralTransferPlan } from "./carrierIntegralSendTargets";
import { resolveCarrierLoopBodyTransferExecutionPlan } from "./carrierLoopBodyTransferExecutionPlan";
import type { CarrierIntegralTransferExecutorTargetId } from "./carrierLoopBodyTransferTypes";
import type { CarrierIntegralPinkExportDetail } from "../../contracts/carrierIntegralPinkExportContract";
import type { MaterialEntry } from "../../materialLibrary";
import type { RootFollowBankEntryConfig } from "../../../xensonar/rootFollow/rootFollowTypes";
import type { CarrierIntegralTransferExecutionRequest } from "./carrierIntegralTransferExecutionTypes";
export type { CarrierIntegralTransferExecutionRequest } from "./carrierIntegralTransferExecutionTypes";
import {
  dispatchCarrierIntegralTransferSideEffects,
  registerCarrierIntegralTransferMaterial,
  renderCarrierIntegralTransferBody,
  resolveCarrierIntegralTransferExecutionContext,
} from "./carrierIntegralTransferExecutionPhases";

export const CARRIER_INTEGRAL_TRANSFER_EXECUTOR_EXTRACTION_VERSION =
  "carrier-integral-transfer-executor-phases-3.2.91.7.5.79";

export type CarrierIntegralTransferExecutionResult = {
  ok: true;
  projectName: string;
  machineId: CarrierIntegralMachineId;
  machineLabel: string;
  targetId: CarrierIntegralTransferExecutorTargetId;
  targetLabel: string;
  targetName: string;
  transferPlan: CarrierIntegralTransferPlan;
  materialEntry: MaterialEntry;
  rootFollowConfig: RootFollowBankEntryConfig | null;
  audioPaintImportDetail: CarrierIntegralPinkExportDetail;
  renderedAudio: {
    peak: number;
    rms: number;
    durationSec: number;
    sampleRate: number;
    blobSize: number;
    audioIdentityKey: string;
    audioIdentitySource: string;
  };
  warnings: string[];
  uiMessage: string;
};


export async function executeCarrierIntegralTransfer(
  args: CarrierIntegralTransferExecutionRequest,
): Promise<CarrierIntegralTransferExecutionResult> {
  const executionPlan = resolveCarrierLoopBodyTransferExecutionPlan({
    entry: args.entry,
    snapshot: args.snapshot,
    machineId: args.machineId,
    targetId: args.targetId,
    targetLabel: args.targetLabel,
    valueSource: args.valueSource,
    selectionOverride: args.selectionOverride,
    storedSynthLab: args.storedSynthLab,
    currentSynthLab: args.currentSynthLab,
    previewBpm: args.previewBpm,
    previewVolume: args.previewVolume,
    previewPitchSemitones: args.previewPitchSemitones,
  });
  const context = resolveCarrierIntegralTransferExecutionContext(args, executionPlan);
  const renderedBody = await renderCarrierIntegralTransferBody(args, context);
  const registeredMaterial = registerCarrierIntegralTransferMaterial(
    args,
    context,
    renderedBody,
  );
  dispatchCarrierIntegralTransferSideEffects(args, context, registeredMaterial);

  return {
    ok: true,
    projectName: args.entry.name,
    machineId: args.machineId,
    machineLabel: executionPlan.machineLabel,
    targetId: args.targetId,
    targetLabel: args.targetLabel,
    targetName: executionPlan.targetName,
    transferPlan: executionPlan.transferPlan,
    materialEntry: registeredMaterial.materialEntry,
    rootFollowConfig: context.artifact.config,
    audioPaintImportDetail: registeredMaterial.audioPaintImportDetail,
    renderedAudio: {
      peak: renderedBody.renderedStats.peak,
      rms: renderedBody.renderedStats.rms,
      durationSec: renderedBody.renderedDurationSec,
      sampleRate: renderedBody.renderedBuffer.sampleRate,
      blobSize: typeof renderedBody.renderedBlob.size === "number"
        ? renderedBody.renderedBlob.size
        : 0,
      audioIdentityKey: renderedBody.audioIdentityKey,
      audioIdentitySource: renderedBody.audioIdentitySource,
    },
    warnings:
      executionPlan.transferPlan.requiresAudibleRenderedBody &&
      renderedBody.renderedStats.peak <= 0.001
        ? ["Materialkörper liegt knapp über der Hörbarkeitsschwelle."]
        : [],
    uiMessage: `${args.targetLabel} · ${executionPlan.targetName}`,
  };
}
