import type { AudioImportReadMode } from '../spectralForge/audio/AudioImporter';
import type { IntakeSelectionState, IntakeSource, LoopRepairResult } from './types';

export interface MaterialIntakeSessionSnapshot {
  source: IntakeSource | null;
  selection: IntakeSelectionState | null;
  sourceAdapterId: string;
  readMode: AudioImportReadMode;
  repairResult: LoopRepairResult | null;
  status: string;
}

const snapshots = new Map<string, MaterialIntakeSessionSnapshot>();

export function getMaterialIntakeSessionSnapshot(key?: string | null) {
  if (!key) return null;
  return snapshots.get(key) ?? null;
}

export function setMaterialIntakeSessionSnapshot(key: string | undefined | null, snapshot: MaterialIntakeSessionSnapshot) {
  if (!key) return;
  snapshots.set(key, snapshot);
}
