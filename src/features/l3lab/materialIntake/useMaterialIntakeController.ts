import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AudioImportReadMode } from '../spectralForge/audio/AudioImporter';
import { loopPreviewEngine } from './LoopPreviewEngine';
import { getMaterialIntakeSessionSnapshot, setMaterialIntakeSessionSnapshot } from './sessionState';
import { repairLoopSelection } from './loopRepairBridge';
import { buildDetailViewport, clampSelectionBounds } from './selectionMath';
import {
  buildInitialSelectionForMaterialSource,
  buildLoopRepairStatus,
  buildRawSendStatusMessages,
  buildRepairCandidateSelection,
  buildRepairCandidateStatus,
  buildRepairUndoSnapshot,
  buildRepairedLoopSelection,
  cloneMaterialIntakeSelection,
  type MaterialIntakeRepairUndoSnapshot,
  sanitizeMaterialIntakeNameFromLabel,
} from './materialIntakeControllerActions';
import type {
  IntakeSelectionState,
  IntakeSource,
  LoopRepairCandidate,
  LoopRepairResult,
  MaterialIntakeExportMeta,
  MaterialIntakeMeterConfig,
  MaterialSourceAdapter,
  MaterialTargetAdapter,
  TimeRange,
} from './types';

export interface UseMaterialIntakeControllerArgs {
  sourceAdapters: MaterialSourceAdapter[];
  targetAdapter: MaterialTargetAdapter;
  rawTargetAdapter?: MaterialTargetAdapter;
  onMetaPatch?: (patch: Partial<MaterialIntakeExportMeta>) => void;
  meter?: MaterialIntakeMeterConfig;
  persistenceKey?: string;
}

export function useMaterialIntakeController({
  sourceAdapters,
  targetAdapter,
  rawTargetAdapter,
  onMetaPatch,
  meter,
  persistenceKey,
}: UseMaterialIntakeControllerArgs) {
  const initialSnapshot = getMaterialIntakeSessionSnapshot(persistenceKey);
  const [source, setSource] = useState<IntakeSource | null>(() => initialSnapshot?.source ?? null);
  const [selection, setSelection] = useState<IntakeSelectionState | null>(() => initialSnapshot?.selection ?? null);
  const [sourceAdapterId, setSourceAdapterId] = useState<string>(() => initialSnapshot?.sourceAdapterId ?? sourceAdapters[0]?.id ?? 'local-file');
  const [readMode, setReadMode] = useState<AudioImportReadMode>(() => initialSnapshot?.readMode ?? 'hybrid');
  const [repairResult, setRepairResult] = useState<LoopRepairResult | null>(() => initialSnapshot?.repairResult ?? null);
  const [repairUndoState, setRepairUndoState] = useState<MaterialIntakeRepairUndoSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(() => initialSnapshot?.status ?? 'Noch keine Quelle geladen.');
  const [previewPlaying, setPreviewPlaying] = useState(false);

  const activeSourceAdapter = useMemo(
    () => sourceAdapters.find((adapter) => adapter.id === sourceAdapterId) ?? sourceAdapters[0] ?? null,
    [sourceAdapterId, sourceAdapters],
  );

  useEffect(() => () => loopPreviewEngine.stop(), []);

  useEffect(() => {
    setMaterialIntakeSessionSnapshot(persistenceKey, {
      source,
      selection,
      sourceAdapterId,
      readMode,
      repairResult,
      status,
    });
  }, [persistenceKey, readMode, repairResult, selection, source, sourceAdapterId, status]);

  const setDetailViewport = useCallback((range: TimeRange) => {
    setSelection((current) => {
      if (!current || !source) return current;
      return {
        ...current,
        detailViewport: clampSelectionBounds(range.startSec, range.durationSec, source.durationSec, 0.15),
      };
    });
  }, [source]);

  const setFineLoopRange = useCallback((range: TimeRange) => {
    setSelection((current) => {
      if (!current || !source) return current;
      return {
        ...current,
        fineLoopRange: clampSelectionBounds(range.startSec, range.durationSec, source.durationSec, 0.05),
      };
    });
  }, [source]);

  const loadSourceFromFile = useCallback(async (file: File): Promise<boolean> => {
    if (!activeSourceAdapter?.loadFromFile) {
      setStatus(activeSourceAdapter?.unavailableReason ?? 'Diese Quelle kann in diesem Build keine Dateien laden.');
      return false;
    }
    setBusy(true);
    setStatus(`Lade ${file.name} …`);
    try {
      const loaded = await activeSourceAdapter.loadFromFile(file);
      const nextSelection = buildInitialSelectionForMaterialSource(loaded);
      setSource(loaded);
      setSelection(nextSelection);
      setRepairResult(null);
      setRepairUndoState(null);
      setPreviewPlaying(false);
      onMetaPatch?.({ name: sanitizeMaterialIntakeNameFromLabel(loaded.label) });
      setStatus(`${loaded.label} geladen. Mitte zeigt die ganze WAV, unten den präzisen Loop.`);
      return true;
    } catch (error) {
      console.error('[xensonar][material-intake][load]', error);
      setStatus('Quelle konnte nicht geladen werden.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [activeSourceAdapter, onMetaPatch]);

  const fitViewportToFineLoop = useCallback((): boolean => {
    if (!source || !selection) return false;
    const viewport = buildDetailViewport(selection.fineLoopRange.startSec, selection.fineLoopRange.durationSec, source.durationSec, 2.4);
    setSelection((current) => current ? { ...current, detailViewport: viewport } : current);
    setStatus('Untere Feinauswahl bestimmt jetzt den oberen Sichtbereich, ohne die Feinauswahl selbst zu verändern.');
    return true;
  }, [selection, source]);

  const clearRepairUndo = useCallback(() => {
    setRepairUndoState(null);
    setRepairResult(null);
  }, []);

  const repairLoop = useCallback(async (): Promise<boolean> => {
    if (!source || !selection) return false;
    setBusy(true);
    setStatus('Loop-Reparatur nimmt deine gesetzte 1 ernst, misst das Tempo im Kontext und justiert dann vor allem das Ende.');
    try {
      const repaired = repairLoopSelection(
        source.sourceAsset,
        selection.fineLoopRange.startSec,
        selection.fineLoopRange.durationSec,
        {
          detailViewport: selection.detailViewport,
          meter,
        },
      );
      setRepairUndoState((current) => current ?? buildRepairUndoSnapshot(selection, repairResult));
      setRepairResult(repaired);
      setSelection((current) => current ? {
        ...current,
        ...buildRepairedLoopSelection(repaired, source.durationSec),
      } : current);
      loopPreviewEngine.stop();
      setPreviewPlaying(false);
      setStatus(buildLoopRepairStatus(repaired, meter));
      return true;
    } catch (error) {
      console.error('[xensonar][material-intake][repair]', error);
      setStatus('Loop-Reparatur fehlgeschlagen.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [meter, repairResult, selection, source]);

  const undoRepairLoop = useCallback((): boolean => {
    if (!repairUndoState) return false;
    loopPreviewEngine.stop();
    setPreviewPlaying(false);
    setSelection(cloneMaterialIntakeSelection(repairUndoState.selection));
    setRepairResult(repairUndoState.repairResult);
    setRepairUndoState(null);
    setStatus('Loop-Korrektur zurückgenommen. Start und Ende stehen wieder wie vor der Korrektur.');
    return true;
  }, [repairUndoState]);

  const applyRepairCandidate = useCallback((candidate: LoopRepairCandidate): boolean => {
    if (!source) return false;
    setSelection((current) => current ? {
      ...current,
      ...buildRepairCandidateSelection(candidate, source.durationSec),
    } : current);
    setStatus(buildRepairCandidateStatus(candidate));
    return true;
  }, [source]);

  const restartPreviewWithRange = useCallback(async (range: TimeRange, offsetSec = 0): Promise<boolean> => {
    if (!source) return false;
    try {
      await loopPreviewEngine.playLoop(source.sourceAsset, range, offsetSec);
      setPreviewPlaying(true);
      setStatus(offsetSec > 0
        ? 'Loop-Vorhörung springt an die angeklickte Stelle der unteren Maske.'
        : 'Loop-Vorhörung liest die aktuelle untere Maske.');
      return true;
    } catch (error) {
      console.error('[xensonar][material-intake][preview-restart]', error);
      setStatus('Loop-Vorhörung konnte nicht aktualisiert werden.');
      setPreviewPlaying(false);
      return false;
    }
  }, [source]);

  const scrubPreviewAt = useCallback(async (pointSec: number, rangeOverride?: TimeRange): Promise<boolean> => {
    if (!source || !selection) return false;
    const range = rangeOverride ?? selection.fineLoopRange;
    const offsetSec = Math.max(0, Math.min(Math.max(0, range.durationSec - 0.001), pointSec - range.startSec));
    return restartPreviewWithRange(range, offsetSec);
  }, [restartPreviewWithRange, selection, source]);

  const updateActivePreviewRange = useCallback((range: TimeRange): boolean => {
    const updated = loopPreviewEngine.updateLoopRangeLive(range);
    if (updated) {
      setPreviewPlaying(true);
      setStatus('Loop-Vorhörung folgt der verschobenen unteren Maske ohne Neustart.');
    }
    return updated;
  }, []);

  const togglePreview = useCallback(async (): Promise<boolean> => {
    if (!source || !selection) return false;
    if (loopPreviewEngine.isPlaying()) {
      loopPreviewEngine.stop();
      setPreviewPlaying(false);
      setStatus('Loop-Vorhörung gestoppt.');
      return true;
    }
    return restartPreviewWithRange(selection.fineLoopRange);
  }, [restartPreviewWithRange, selection, source]);

  const commitToTarget = useCallback(async (): Promise<boolean> => {
    if (!source || !selection) return false;
    setBusy(true);
    setStatus(`${targetAdapter.label} übernimmt den gewählten Loop …`);
    try {
      await targetAdapter.commitLoop({ source, selection, readMode, repairResult });
      setStatus('Loop wurde in die Forge-3-Werkbank übernommen.');
      return true;
    } catch (error) {
      console.error('[xensonar][material-intake][commit]', error);
      setStatus('Übernehmen in die Werkbank fehlgeschlagen.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [readMode, repairResult, selection, source, targetAdapter]);

  const sendRawToAdapter = useCallback(async (
    adapter: MaterialTargetAdapter,
    messages?: { success?: string; failure?: string },
    exportTitle?: string | null,
  ): Promise<boolean> => {
    if (!adapter || !source || !selection) return false;
    setBusy(true);
    setStatus(`${adapter.label} …`);
    try {
      await adapter.commitLoop({ source, selection, readMode, repairResult, exportTitle: exportTitle?.trim() || null });
      setStatus(messages?.success ?? `${adapter.label} abgeschlossen.`);
      return true;
    } catch (error) {
      console.error('[xensonar][material-intake][raw-send]', error);
      setStatus(messages?.failure ?? `${adapter.label} fehlgeschlagen.`);
      return false;
    } finally {
      setBusy(false);
    }
  }, [readMode, repairResult, selection, source]);

  const sendRawToTarget = useCallback(async (exportTitle?: string | null): Promise<boolean> => {
    if (!rawTargetAdapter) return false;
    return sendRawToAdapter(rawTargetAdapter, buildRawSendStatusMessages('Xensonar'), exportTitle);
  }, [rawTargetAdapter, sendRawToAdapter]);

  return {
    source,
    selection,
    repairResult,
    hasRepairUndo: !!repairUndoState,
    status,
    busy,
    previewPlaying,
    readMode,
    sourceAdapterId,
    activeSourceAdapter,
    setSourceAdapterId,
    setReadMode,
    loadSourceFromFile,
    setDetailViewport,
    setFineLoopRange,
    clearRepairUndo,
    fitViewportToFineLoop,
    repairLoop,
    undoRepairLoop,
    applyRepairCandidate,
    togglePreview,
    restartPreviewWithRange,
    scrubPreviewAt,
    updateActivePreviewRange,
    commitToTarget,
    sendRawToAdapter,
    sendRawToTarget,
  };
}
