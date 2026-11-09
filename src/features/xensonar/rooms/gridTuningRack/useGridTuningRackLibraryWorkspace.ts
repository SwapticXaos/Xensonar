import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent as ReactDragEvent } from 'react';
import type { WorkspacePackageImportMode } from '../../../../core/systemMemory/packageCore';
import {
  GRID_TUNING_ACTIVE_SLOT_COUNT,
  deleteStoredCustomGridTuning,
  getGridTuningLibraryOptions,
  getOptionLabel,
  saveStoredCustomGridTuning,
  type CustomGridTuningId,
  type GridTuning,
  type RasterDivisionKind,
  type RasterFamily,
} from '../../domain/instrumentData';
import { exportGridLibraryArchiveAction, importGridLibraryArchiveAction } from '../../domain/gridLibraryArchiveActions';
import {
  encodePlaylistDropTarget,
  resolvePlaylistDropPreview,
  suppressNativePlaylistDragImage,
  type PlaylistDropOperation,
} from '../../material/playlistDropOperation';
import { usePhaseShiftedPlaylistDragSession } from '../../ui/usePhaseShiftedPlaylistDragSession';
import type { PlaylistDragHudState } from '../PlaylistDragActionHud';
import {
  createCustomGridId,
  createDraftName,
  isCustomGridTuningId,
  type GridTuningEditorState,
} from './gridTuningEditorDomain';

export type GridTuningRackDragPayload =
  | { source: 'rack'; tuning: GridTuning; fromIndex: number }
  | { source: 'library'; tuning: GridTuning };

export type GridTuningDraftClassification = {
  family: RasterFamily;
  divisionKind: RasterDivisionKind;
  label: string;
};

export function useGridTuningRackLibraryWorkspace(args: {
  open: boolean;
  currentTuning: GridTuning;
  activeRack: GridTuning[];
  editor: GridTuningEditorState;
  draftClassification: GridTuningDraftClassification;
  onRackChange: (nextRack: GridTuning[]) => void;
  onActivateTuning: (tuning: GridTuning) => void;
  onMessage: (message: string) => void;
  loadTuning: (tuning: GridTuning) => void;
  markSaved: (savedId: CustomGridTuningId, label: string) => void;
}) {
  const {
    open,
    currentTuning,
    activeRack,
    editor,
    draftClassification,
    onRackChange,
    onActivateTuning,
    onMessage,
    loadTuning,
    markSaved,
  } = args;
  const [selectedTuning, setSelectedTuning] = useState<GridTuning>(currentTuning);
  const [dragPayload, setDragPayload] = useState<GridTuningRackDragPayload | null>(null);
  const [rackDropTarget, setRackDropTarget] = useState('');
  const [dragHud, setDragHud] = useState<PlaylistDragHudState | null>(null);
  const [libraryVersion, setLibraryVersion] = useState(0);
  const selectedLibraryEntryRef = useRef<HTMLDivElement | null>(null);
  const gridLibraryImportInputRef = useRef<HTMLInputElement | null>(null);
  const pendingGridLibraryImportModeRef = useRef<WorkspacePackageImportMode>('merge');
  const rackDragSession = usePhaseShiftedPlaylistDragSession<GridTuningRackDragPayload>();

  useEffect(() => {
    if (!open) return;
    setSelectedTuning(currentTuning);
    setDragPayload(null);
    setRackDropTarget('');
  }, [open, currentTuning]);

  const libraryOptions = useMemo(() => getGridTuningLibraryOptions(), [libraryVersion]);
  useEffect(() => {
    if (!open) return;
    selectedLibraryEntryRef.current?.scrollIntoView({ block: 'nearest' });
  }, [open, selectedTuning, libraryVersion]);

  const activeRackSlots = useMemo<(GridTuning | null)[]>(
    () => Array.from({ length: GRID_TUNING_ACTIVE_SLOT_COUNT }, (_, index) => activeRack[index] ?? null),
    [activeRack],
  );

  const rackDropPreview = resolvePlaylistDropPreview(
    rackDropTarget,
    activeRackSlots.map((entry, index) => ({
      id: String(index),
      title: entry ? getOptionLabel(libraryOptions, entry) : `Slot ${index + 1} leer`,
    })),
    dragPayload?.source === 'rack' ? String(dragPayload.fromIndex) : undefined,
  );
  const rackInsertNeighborIds = new Set(
    rackDropPreview && rackDropPreview.operation !== 'swap' ? rackDropPreview.highlightedEntryIds : [],
  );

  const commitRack = (nextRack: Array<GridTuning | null>) => {
    onRackChange(nextRack.filter((entry): entry is GridTuning => !!entry));
  };

  const handleDropToSlot = (
    slotIndex: number,
    operation: PlaylistDropOperation,
    payload: GridTuningRackDragPayload | null = dragPayload,
  ) => {
    if (!payload) return;
    const nextRack = [...activeRackSlots];
    const existingIndex = nextRack.findIndex((entry) => entry === payload.tuning);
    if (payload.source === 'rack') {
      const draggedValue = nextRack[payload.fromIndex] ?? null;
      if (!draggedValue) return;
      if (operation === 'swap') {
        const displaced = nextRack[slotIndex] ?? null;
        nextRack[payload.fromIndex] = displaced;
        nextRack[slotIndex] = draggedValue;
      } else {
        nextRack.splice(payload.fromIndex, 1);
        const rawTarget = operation === 'insert-before' ? slotIndex : slotIndex + 1;
        const adjustedTarget = rawTarget > payload.fromIndex ? Math.max(0, rawTarget - 1) : rawTarget;
        nextRack.splice(Math.max(0, Math.min(nextRack.length, adjustedTarget)), 0, draggedValue);
      }
      commitRack(nextRack);
      onMessage(`Aktives Rack neu geordnet: ${getOptionLabel(libraryOptions, draggedValue)}.`);
      return;
    }
    if (existingIndex >= 0) {
      onMessage(`${getOptionLabel(libraryOptions, payload.tuning)} ist bereits im aktiven Rack.`);
      return;
    }
    if (operation === 'insert-before' || operation === 'insert-after') {
      const insertIndex = operation === 'insert-before' ? slotIndex : slotIndex + 1;
      nextRack.splice(Math.max(0, Math.min(nextRack.length, insertIndex)), 0, payload.tuning);
      nextRack.splice(GRID_TUNING_ACTIVE_SLOT_COUNT);
    } else {
      nextRack[slotIndex] = payload.tuning;
    }
    commitRack(nextRack);
    onMessage(`${getOptionLabel(libraryOptions, payload.tuning)} in Slot ${slotIndex + 1} geladen.`);
  };

  const handleRackDragOver = (event: ReactDragEvent<HTMLElement>) => {
    const target = rackDragSession.updatePreviewFromDragEvent(event);
    if (!target) return;
    event.preventDefault();
    setDragHud({ x: event.clientX, y: event.clientY });
    setRackDropTarget(encodePlaylistDropTarget(target.operation, target.entryId));
  };

  const handleRackDrop = (event: ReactDragEvent<HTMLElement>) => {
    const session = rackDragSession.getSession();
    if (!session) return;
    const target = rackDragSession.getDropTarget();
    event.preventDefault();
    if (target) handleDropToSlot(Number(target.entryId), target.operation, session.payload);
    rackDragSession.clearDrag();
    setDragPayload(null);
    setRackDropTarget('');
    setDragHud(null);
  };

  const endDrag = () => {
    rackDragSession.clearDrag();
    setDragPayload(null);
    setRackDropTarget('');
    setDragHud(null);
  };

  const beginRackDrag = (event: ReactDragEvent<HTMLElement>, tuning: GridTuning, fromIndex: number) => {
    suppressNativePlaylistDragImage(event.dataTransfer);
    const payload: GridTuningRackDragPayload = { source: 'rack', tuning, fromIndex };
    rackDragSession.beginDrag({
      draggedId: String(fromIndex),
      originVisibleIds: activeRackSlots.map((_, slotIndex) => String(slotIndex)),
      payload,
    });
    setDragPayload(payload);
  };

  const beginLibraryDrag = (event: ReactDragEvent<HTMLElement>, tuning: GridTuning) => {
    suppressNativePlaylistDragImage(event.dataTransfer);
    const payload: GridTuningRackDragPayload = { source: 'library', tuning };
    rackDragSession.beginDrag({
      draggedId: `library:${tuning}`,
      originVisibleIds: activeRackSlots.map((_, slotIndex) => String(slotIndex)),
      payload,
    });
    setDragPayload(payload);
  };

  const handleRemoveFromRack = (slotIndex: number) => {
    const target = activeRackSlots[slotIndex];
    if (!target) return;
    const nextRack = [...activeRackSlots];
    nextRack.splice(slotIndex, 1);
    nextRack.push(null);
    commitRack(nextRack);
    onMessage(`${getOptionLabel(libraryOptions, target)} aus dem aktiven Rack genommen. In der Bibliothek bleibt es erhalten.`);
  };

  const handleMoveRackEntry = (slotIndex: number, direction: -1 | 1) => {
    const targetIndex = slotIndex + direction;
    if (targetIndex < 0 || targetIndex >= GRID_TUNING_ACTIVE_SLOT_COUNT) return;
    const nextRack = [...activeRackSlots];
    const current = nextRack[slotIndex];
    nextRack[slotIndex] = nextRack[targetIndex] ?? null;
    nextRack[targetIndex] = current ?? null;
    commitRack(nextRack);
  };

  const selectRackTuning = (tuning: GridTuning) => {
    setSelectedTuning(tuning);
    loadTuning(tuning);
    onActivateTuning(tuning);
  };

  const selectLibraryTuning = (tuning: GridTuning) => {
    setSelectedTuning(tuning);
    loadTuning(tuning);
  };

  const handleSaveDraft = () => {
    const id = editor.editingCustomId ?? createCustomGridId();
    const label = editor.name.trim() || createDraftName(
      editor.periodFamily,
      editor.periodCents,
      editor.stepCents,
      editor.jiTrackedCents,
    );
    const savedId = saveStoredCustomGridTuning({
      id,
      label,
      family: draftClassification.family,
      periodFamily: editor.periodFamily,
      divisionKind: draftClassification.divisionKind,
      steps: editor.stepCents.length,
      defaultModePolicy: 'church_projection',
      hotkeyCycleEligible: true,
      description: `${draftClassification.label} · ${editor.periodFamily === 'tritave' ? 'Tritave' : 'Oktave'} · ${editor.periodCents.toFixed(1)}c`,
      periodCents: editor.periodCents,
      stepCents: editor.stepCents,
      builtIn: false,
      updatedAt: Date.now(),
    });
    if (!savedId) {
      onMessage('Raster konnte nicht gespeichert werden.');
      return;
    }
    setLibraryVersion((value) => value + 1);
    setSelectedTuning(savedId);
    markSaved(savedId, label);
    onMessage(`${label} gespeichert. Das Raster liegt jetzt in der Bibliothek und wird erst per Drag & Drop ins aktive Rack übernommen.`);
  };

  const handleDeleteCustom = (tuning: GridTuning) => {
    if (!isCustomGridTuningId(tuning)) return;
    const nextRack = activeRackSlots.map((entry) => (entry === tuning ? null : entry));
    const fallbackFromRack = nextRack.find((entry): entry is GridTuning => !!entry) ?? '12edo';
    deleteStoredCustomGridTuning(tuning);
    if (activeRack.includes(tuning)) commitRack(nextRack);
    setLibraryVersion((value) => value + 1);
    const fallback = currentTuning === tuning ? fallbackFromRack : (activeRack[0] ?? currentTuning);
    setSelectedTuning(fallback);
    loadTuning(fallback);
    if (currentTuning === tuning) onActivateTuning(fallback);
    onMessage('Custom-Raster aus der Bibliothek gelöscht.');
  };

  const requestGridLibraryImport = (mode: WorkspacePackageImportMode) => {
    pendingGridLibraryImportModeRef.current = mode;
    gridLibraryImportInputRef.current?.click();
  };

  const handleGridLibraryImportInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const result = await importGridLibraryArchiveAction({
        file,
        mode: pendingGridLibraryImportModeRef.current,
        fallbackCurrentTuning: currentTuning,
      });
      setLibraryVersion((value) => value + 1);
      if (result.mode === 'replace') {
        onRackChange(result.nextRack);
        setSelectedTuning(result.nextSelectedTuning);
        loadTuning(result.nextSelectedTuning);
        onActivateTuning(result.nextSelectedTuning);
      } else if (result.nextSelectedTuning) {
        setSelectedTuning(result.nextSelectedTuning);
        loadTuning(result.nextSelectedTuning);
      }
      onMessage(result.statusMessage);
    } catch (error) {
      console.error('[xensonar][grid-library][import]', error);
      onMessage(error instanceof Error
        ? `Raster-Paket konnte nicht geladen werden: ${error.message}`
        : 'Raster-Paket konnte nicht geladen werden.');
    }
  };

  const handleExportGridLibraryArchive = async () => {
    const { statusMessage } = await exportGridLibraryArchiveAction({
      currentTuning: selectedTuning,
      activeRack,
      label: 'Raster-Bibliothek',
    });
    onMessage(statusMessage);
  };

  return {
    selectedTuning,
    setSelectedTuning,
    dragPayload,
    rackDropTarget,
    dragHud,
    libraryOptions,
    activeRackSlots,
    selectedLibraryEntryRef,
    gridLibraryImportInputRef,
    rackDropPreview,
    rackInsertNeighborIds,
    registerRackRow: rackDragSession.registerRow,
    handleRackDragOver,
    handleRackDrop,
    beginRackDrag,
    beginLibraryDrag,
    endDrag,
    handleRemoveFromRack,
    handleMoveRackEntry,
    selectRackTuning,
    selectLibraryTuning,
    handleSaveDraft,
    handleDeleteCustom,
    requestGridLibraryImport,
    handleGridLibraryImportInput,
    handleExportGridLibraryArchive,
  };
}
