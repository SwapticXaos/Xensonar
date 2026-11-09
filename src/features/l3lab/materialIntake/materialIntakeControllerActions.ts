import { buildDetailViewport } from './selectionMath';
import type {
  IntakeSelectionState,
  IntakeSource,
  LoopRepairCandidate,
  LoopRepairResult,
  TimeRange,
} from './types';

export const MATERIAL_INTAKE_DEFAULT_DETAIL_DURATION = 16;
export const MATERIAL_INTAKE_DEFAULT_LOOP_DURATION = 8;

export interface MaterialIntakeRepairUndoSnapshot {
  selection: IntakeSelectionState;
  repairResult: LoopRepairResult | null;
}

export function sanitizeMaterialIntakeNameFromLabel(label: string): string {
  return label.replace(/\.[^.]+$/, '').trim() || 'material';
}

export function buildInitialSelectionForMaterialSource(
  source: IntakeSource,
): IntakeSelectionState {
  const viewportDuration = Math.min(
    source.durationSec,
    Math.max(4, MATERIAL_INTAKE_DEFAULT_DETAIL_DURATION),
  );
  const fineDuration = Math.min(
    viewportDuration,
    Math.max(
      0.5,
      Math.min(MATERIAL_INTAKE_DEFAULT_LOOP_DURATION, source.durationSec),
    ),
  );

  return {
    detailViewport: { startSec: 0, durationSec: viewportDuration },
    fineLoopRange: { startSec: 0, durationSec: fineDuration },
  };
}

export function buildRepairUndoSnapshot(
  selection: IntakeSelectionState,
  repairResult: LoopRepairResult | null,
): MaterialIntakeRepairUndoSnapshot {
  return {
    selection: cloneMaterialIntakeSelection(selection),
    repairResult,
  };
}

export function cloneMaterialIntakeSelection(
  selection: IntakeSelectionState,
): IntakeSelectionState {
  return {
    detailViewport: { ...selection.detailViewport },
    fineLoopRange: { ...selection.fineLoopRange },
  };
}

export function buildRepairedLoopSelection(
  repaired: LoopRepairResult,
  sourceDurationSec: number,
): IntakeSelectionState {
  return {
    fineLoopRange: {
      startSec: repaired.primary.startSec,
      durationSec: repaired.primary.durationSec,
    },
    detailViewport: buildDetailViewport(
      repaired.primary.startSec,
      repaired.primary.durationSec,
      sourceDurationSec,
      2.6,
    ),
  };
}

export function buildRepairCandidateSelection(
  candidate: LoopRepairCandidate,
  sourceDurationSec: number,
): IntakeSelectionState {
  return {
    fineLoopRange: {
      startSec: candidate.startSec,
      durationSec: candidate.durationSec,
    },
    detailViewport: buildDetailViewport(
      candidate.startSec,
      candidate.durationSec,
      sourceDurationSec,
      2.6,
    ),
  };
}

export function buildLoopRepairStatus(
  repaired: LoopRepairResult,
  meter?: { bars?: number; bpm?: number },
): string {
  return `Loop korrigiert: Start blieb auf ${repaired.primary.startSec.toFixed(2)}s, Ende wurde auf ${rangeEnd(repaired.primary).toFixed(2)}s bezogen. Arbeitsmeter bleibt bei ${meter?.bars ?? repaired.primary.bars} Takten und ${meter?.bpm ?? repaired.primary.bpm} BPM.`;
}

export function buildRepairCandidateStatus(
  candidate: LoopRepairCandidate,
): string {
  return `Alternative übernommen: Start blieb auf ${candidate.startSec.toFixed(2)}s · Ende ${rangeEnd(candidate).toFixed(2)}s. Arbeitsmeter bleibt unverändert.`;
}

export function buildRawSendStatusMessages(targetLabel: string) {
  return {
    success: `Der Rohloop wurde an ${targetLabel} gesendet.`,
    failure: `Rohsendung an ${targetLabel} fehlgeschlagen.`,
  };
}

export function rangeEnd(range: TimeRange): number {
  return range.startSec + range.durationSec;
}
