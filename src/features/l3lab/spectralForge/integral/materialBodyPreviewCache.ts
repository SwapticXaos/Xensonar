import type { CarrierIntegralMachineId } from './carrierIntegralContracts';
import type { CarrierIntegralTransferExecutorTargetId } from './carrierLoopBodyTransferTypes';
import { carrierIntegralFixed4, carrierIntegralFnv1aShortHash, stableCarrierIntegralJson } from './carrierIntegralStableIdentity';

export const MATERIAL_BODY_PREVIEW_CACHE_VERSION = 'material-body-preview-cache-6.9.0.17';

export type MaterialBodyPreviewCacheKeyArgs = {
  machineId: CarrierIntegralMachineId;
  targetId: CarrierIntegralTransferExecutorTargetId;
  entryId: string;
  snapshotName?: string;
  bars: number;
  bpm: number;
  previewVolume: number;
  previewPitchSemitones: number;
  valueSource: string;
  synthLabFingerprint?: unknown;
  selectionFingerprint?: unknown;
};

const materialBodyPreviewCache = new Map<string, AudioBuffer>();
const stableJson = stableCarrierIntegralJson;
const shortHash = carrierIntegralFnv1aShortHash;

export function buildMaterialBodyPreviewCacheKey(args: MaterialBodyPreviewCacheKeyArgs): string {
  const payload = {
    version: MATERIAL_BODY_PREVIEW_CACHE_VERSION,
    machineId: args.machineId,
    targetId: args.targetId,
    entryId: args.entryId,
    snapshotName: args.snapshotName ?? '',
    bars: Math.max(1, Math.round(args.bars || 1)),
    bpm: Math.max(1, Math.round(args.bpm || 1)),
    previewVolume: carrierIntegralFixed4(args.previewVolume),
    previewPitchSemitones: carrierIntegralFixed4(args.previewPitchSemitones),
    valueSource: args.valueSource,
    synthLabFingerprint: args.synthLabFingerprint ?? null,
    selectionFingerprint: args.selectionFingerprint ?? null,
  };
  return `material-body-preview:${args.machineId}:${args.targetId}:${shortHash(stableJson(payload))}`;
}

export function getCachedMaterialBodyPreviewBuffer(key: string | null | undefined): AudioBuffer | null {
  if (!key) return null;
  return materialBodyPreviewCache.get(key) ?? null;
}

export function storeCachedMaterialBodyPreviewBuffer(key: string | null | undefined, buffer: AudioBuffer | null | undefined) {
  if (!key || !buffer) return;
  materialBodyPreviewCache.set(key, buffer);
}

export function clearMaterialBodyPreviewCache() {
  materialBodyPreviewCache.clear();
}

export function getMaterialBodyPreviewCacheSize() {
  return materialBodyPreviewCache.size;
}
