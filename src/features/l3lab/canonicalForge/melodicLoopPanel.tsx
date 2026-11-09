import type { MelodicImportLanePlacement } from './melodicImportLanePolicy';
import * as React from 'react';
import type { ChordVoicing, LoopComposerState, LoopNoteEvent, LoopPitchStep, LoopTrackPatternPreset } from './loopDrumDomain';
import { effectiveLoopLineHz, getDefaultRepetitionModelForTuning, noteChannelIndex, rebuildLoopComposerPitchField, resolveLoopNoteSampleId } from './loopDrumDomain';
import type { LoopTrackInstrumentPreset } from './melodicSoundRegistry';
import { getMelodicSoundDisplayLabel, type MelodicSoundOptionGroup } from './melodicSoundRegistry';
import type { SavedMelodicSampleMeta } from './melodicSampleLibrary';
import { LoopComposerHorizontalOverview, LoopComposerVerticalOverview } from './miniMapPanels';
import { MelodicLoopSidebar } from './MelodicLoopSidebar';
import { MaterialBaseFragmentActionCard } from './MaterialBaseFragmentActionCard';
import { SpectralImportColorDialog } from './SpectralImportColorDialog';
import { isFragmentableLoopImportBody, isLoopImportTrackId, loopImportBodyLabel } from './loopImportExportContracts';
import type { MaterialImportEntrySummary } from './materialImportChannel';
import { useMelodicMaterialImportGateway } from './useMelodicMaterialImportGateway';
import { MelodicSampleLibraryPanel } from './MelodicSampleLibraryPanel';
import { useMelodicSampleInspectorState } from './useMelodicSampleInspectorState';
import { MelodicWorkspaceHeader } from './MelodicWorkspaceHeader';
import type { LocalFieldModuleState } from './localField';
import type { MelodicProjectChoice } from './melodicProjectLibrary';
import { GridTuningRackDialog } from '../../xensonar/rooms/GridTuningRackDialog';
import { APPLY_GRID_TUNING_TO_MELODIC_LOOP_EVENT, OPEN_MELODIC_LOOP_GRID_WORKBENCH_EVENT, sendGridTuningToMelodicLoop } from '../../xensonar/domain/gridWorkbenchBridge';
import { type GridTuning } from '../../xensonar/domain/instrumentData';
import { useGridTuningWorkbenchState } from '../../xensonar/domain/useGridTuningWorkbenchState';
import type { WorkspacePackageImportMode } from '../../../core/systemMemory/packageCore';
import { hitLoopComposerCanvas } from './loopComposerInteraction';

const TRACK_PATTERN_PRESETS: Array<{ id: LoopTrackPatternPreset; label: string }> = [
  { id: 'patternA', label: 'Muster A' },
  { id: 'patternB', label: 'Muster B' },
  { id: 'patternC', label: 'Muster C' },
];

type Option = { value: string; label: string };

type MelodicLoopPanelProps = {
  loopComposer: LoopComposerState;
  bassPatternOptions: readonly Option[];
  activeLoopPitchIndex: number;
  activeLoopPitchStep: LoopPitchStep | null;
  melodicPreviewNotes: LoopNoteEvent[];
  autoZoomOnDenseOverlap: boolean;
  lockTrackEditing: boolean;
  chordVoicing: ChordVoicing;
  chordStrumSteps: number;
  chordVelocitySlope: number;
  composerCursor: string;
  clipComposerRef: React.RefObject<HTMLCanvasElement | null>;
  composerOverviewRef: React.RefObject<HTMLDivElement | null>;
  composerVerticalOverviewRef: React.RefObject<HTMLDivElement | null>;
  onMutateLoopComposer: (updater: (draft: LoopComposerState) => void, statusMessage?: string, options?: { history?: boolean }) => void;
  onSetLoopTrackInstrumentPreset: (trackId: string, preset: LoopTrackInstrumentPreset) => void;
  melodicInstrumentOptionGroups: MelodicSoundOptionGroup[];
  melodicSampleEntries: SavedMelodicSampleMeta[];
  onUploadMelodicSamples: (files: File[]) => void;
  onImportSpectralSelectionAsMelodicSample: () => void;
  canImportSpectralSelectionAsMelodicSample: boolean;
  onDeleteMelodicSample: (sampleId: string) => void;
  onRenameMelodicSample: (sampleId: string, name: string) => void;
  onUpdateMelodicSampleBaseHz: (sampleId: string, baseHz: number | null) => void;
  onPreviewMelodicSampleReferencePitch: (sampleId: string, overrideBaseHz?: number | null) => Promise<void> | void;
  onSetMelodicSampleTempoProfile: (sampleId: string, options: { tempoPitchLinked: boolean; playbackDurationSec: number | null }) => void;
  onPreviewMelodicSampleTempoProfile: (sampleId: string, playbackDurationSec: number) => Promise<void> | void;
  onUpdateMelodicSampleEnvelope: (sampleId: string, target: 'volumeEnvelope' | 'pitchEnvelope', field: LocalFieldModuleState | null) => void;
  melodicProjectChoices: MelodicProjectChoice[];
  selectedMelodicProjectId: string;
  canDeleteMelodicProject: boolean;
  materialEntries: MaterialImportEntrySummary[];
  materialImportRequestNonce: number;
  onImportMaterialToMelodicLoop: (materialId: string, anchorHz: number, lanePlacement?: MelodicImportLanePlacement | null) => Promise<void> | void;
  onFragmentMaterialBaseSelection: () => void;
  materialFragmentPrepActive: boolean;
  onLoadMelodicProject: (projectId: string) => void;
  onComposeFromScratch: () => void;
  onSaveMelodicProject: () => void;
  onDeleteMelodicProject: () => void;
  onExportWorkspaceArchive: () => void;
  onImportWorkspaceArchive: (mode: WorkspacePackageImportMode) => void;
  hasWorkspacePackageContent: boolean;
  onToggleTrackEnabled: (trackId: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onApplyTrackPatternPreset: (trackId: string, presetId: LoopTrackPatternPreset) => void;
  onResetTrackPattern: (trackId: string) => void;
  onOnlyYouTrack: (trackId: string) => void;
  onPreviewTrackInstrumentSelection: (trackId: string, preset: LoopTrackInstrumentPreset) => Promise<void> | void;
  onPreviewEnabledTracks: () => void;
  onPreviewSelectedNote: (options?: import('./selectedNotePreviewContract').SelectedNotePreviewOptions) => Promise<void> | void;
  onStopEnabledTracksPreview: (statusMessage?: string) => void;
  onSelectTrack: (trackId: string) => void;
  onShiftPitchWindow: (delta: number) => void;
  onBarsChange: (bars: number) => void;
  onSegmentCountChange: (count: number) => void;
  onCanvasWheel: React.WheelEventHandler<HTMLDivElement>;
  onCanvasMouseDown: React.MouseEventHandler<HTMLCanvasElement>;
  onCanvasMouseMove: React.MouseEventHandler<HTMLCanvasElement>;
  onCanvasMouseUp: React.MouseEventHandler<HTMLCanvasElement>;
  onCanvasMouseLeave: () => void;
  onCanvasContextMenu: React.MouseEventHandler<HTMLCanvasElement>;
  onJumpHorizontalOverview: (event: React.MouseEvent<HTMLDivElement>) => void;
  onStartHorizontalOverviewDrag: (event: React.MouseEvent<HTMLElement>, mode: 'move' | 'resize-start' | 'resize-end') => void;
  onJumpVerticalOverview: (event: React.MouseEvent<HTMLDivElement>) => void;
  onStartVerticalOverviewDrag: (event: React.MouseEvent<HTMLElement>, mode: 'move' | 'resize-start' | 'resize-end') => void;
  onResetVerticalOverview: () => void;
  onActivePitchOffsetChange: (cents: number) => void;
  onResetActivePitchOffset: () => void;
  onZoomXChange: (value: number) => void;
  onScrollXChange: (value: number) => void;
  onZoomYChange: (value: number) => void;
  onScrollYChange: (value: number) => void;
  onBeatsPerBarChange: (value: number) => void;
  onResetZoom: () => void;
  onAutoZoomChange: (value: boolean) => void;
  onLockTrackEditingChange: (value: boolean) => void;
  onChordVoicingChange: (value: ChordVoicing) => void;
  onChordStrumStepsChange: (value: number) => void;
  onChordVelocitySlopeChange: (value: number) => void;
  onFreezeSelectedNoteToSample: () => Promise<void> | void;
};

export function MelodicLoopPanel({
  loopComposer,
  bassPatternOptions: _bassPatternOptions,
  activeLoopPitchIndex,
  activeLoopPitchStep,
  melodicPreviewNotes,
  autoZoomOnDenseOverlap,
  lockTrackEditing,
  chordVoicing,
  chordStrumSteps,
  chordVelocitySlope,
  composerCursor,
  clipComposerRef,
  composerOverviewRef,
  composerVerticalOverviewRef,
  onMutateLoopComposer,
  onSetLoopTrackInstrumentPreset,
  melodicInstrumentOptionGroups,
  melodicSampleEntries,
  onUploadMelodicSamples,
  onImportSpectralSelectionAsMelodicSample,
  canImportSpectralSelectionAsMelodicSample,
  onDeleteMelodicSample,
  onRenameMelodicSample,
  onUpdateMelodicSampleBaseHz,
  onPreviewMelodicSampleReferencePitch,
  onSetMelodicSampleTempoProfile,
  onPreviewMelodicSampleTempoProfile,
  onUpdateMelodicSampleEnvelope,
  melodicProjectChoices,
  selectedMelodicProjectId,
  canDeleteMelodicProject,
  materialEntries,
  materialImportRequestNonce,
  onImportMaterialToMelodicLoop,
  onFragmentMaterialBaseSelection,
  materialFragmentPrepActive,
  onLoadMelodicProject,
  onComposeFromScratch,
  onSaveMelodicProject,
  onDeleteMelodicProject,
  onExportWorkspaceArchive,
  onImportWorkspaceArchive,
  hasWorkspacePackageContent,
  onToggleTrackEnabled,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onApplyTrackPatternPreset,
  onResetTrackPattern,
  onOnlyYouTrack,
  onPreviewTrackInstrumentSelection,
  onPreviewEnabledTracks,
  onPreviewSelectedNote,
  onStopEnabledTracksPreview,
  onSelectTrack,
  onShiftPitchWindow,
  onBarsChange,
  onSegmentCountChange,
  onCanvasWheel,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  onCanvasMouseLeave,
  onCanvasContextMenu,
  onJumpHorizontalOverview,
  onStartHorizontalOverviewDrag,
  onJumpVerticalOverview,
  onStartVerticalOverviewDrag,
  onResetVerticalOverview,
  onActivePitchOffsetChange,
  onResetActivePitchOffset,
  onZoomXChange,
  onScrollXChange,
  onZoomYChange,
  onScrollYChange,
  onBeatsPerBarChange,
  onResetZoom,
  onAutoZoomChange,
  onLockTrackEditingChange,
  onChordVoicingChange,
  onChordStrumStepsChange,
  onChordVelocitySlopeChange,
  onFreezeSelectedNoteToSample,
}: MelodicLoopPanelProps) {
  const [showSpectralSampleHelp, setShowSpectralSampleHelp] = React.useState(false);
  const pitchFrequencyEditorRef = React.useRef<HTMLDivElement | null>(null);
  const [pitchFrequencyEditor, setPitchFrequencyEditor] = React.useState<{ channelIndex: number; x: number; y: number; draft: string; error: string | null } | null>(null);
  const sampleInspector = useMelodicSampleInspectorState(melodicSampleEntries);
  const {
    importBodyRackRef, showMaterialImportMenu, setShowMaterialImportMenu,
    selectedMaterialImportId, setSelectedMaterialImportId,
    materialAnchorHzDraft, setMaterialAnchorHzDraft, materialImportBusy,
    materialImportActionMessage, setMaterialImportActionMessage,
    carrierPinkVariant, setCarrierPinkVariant, roundedAnchorPreview,
    pendingColoredImport, importLaneColorDraft, setImportLaneColorDraft, confirmColoredImport, cancelColoredImport,
    commitMaterialImportSelection, rebuildAndImportAudioPaintEntry, editAudioPaintEntryInSpectralForge,
  } = useMelodicMaterialImportGateway({
    materialEntries, materialImportRequestNonce, loopComposer,
    onMutateLoopComposer, onImportMaterialToMelodicLoop,
  });
  const scrollMelodicWorkspaceIntoView = React.useCallback(() => {
    window.requestAnimationFrame(() => {
      clipComposerRef.current?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    });
  }, [clipComposerRef]);

const spectralSamplePathAvailable = canImportSpectralSelectionAsMelodicSample || typeof onImportSpectralSelectionAsMelodicSample === 'function';

const [draggingSampleId, setDraggingSampleId] = React.useState<string | null>(null);
const [gridWorkbenchOpen, setGridWorkbenchOpen] = React.useState(false);
const {
  activeGridRack,
  libraryOptions: gridTuningOptions,
  setStoredActiveGridRack,
  resetStoredActiveGridRack,
  getLabel,
} = useGridTuningWorkbenchState();

const applyGridTuningToMelodicLoop = React.useCallback((tuning: GridTuning) => {
  const label = getLabel(tuning);
  onMutateLoopComposer((draft) => {
    draft.tuning = tuning;
    draft.repetitionModel = getDefaultRepetitionModelForTuning(tuning);
    const rebuilt = rebuildLoopComposerPitchField(draft);
    draft.pitchLines = rebuilt.nextPitchLines;
    draft.pitchSteps = rebuilt.nextPitchSteps;
    draft.notes = rebuilt.nextNotes;
    draft.selectedNoteId = rebuilt.validSelectedNoteId;
  }, `${label} im Melodic Loop genutzt.`);
}, [getLabel, onMutateLoopComposer]);

const handleActiveGridRackChange = React.useCallback((nextRack: GridTuning[]) => {
  setStoredActiveGridRack(nextRack);
}, [setStoredActiveGridRack]);

const handleResetActiveGridRack = React.useCallback(() => {
  resetStoredActiveGridRack();
}, [resetStoredActiveGridRack]);

const readDraggedSampleId = React.useCallback((event: React.DragEvent<HTMLElement>) => {
  const direct = event.dataTransfer.getData('application/xensonar-sample-id')
    || event.dataTransfer.getData('text/x-xensonar-sample-id')
    || event.dataTransfer.getData('text/plain');
  const candidate = (direct || draggingSampleId || '').trim();
  if (!candidate) return null;
  return melodicSampleEntries.some((entry) => entry.id === candidate) ? candidate : null;
}, [draggingSampleId, melodicSampleEntries]);

const canDropSampleOnTrack = React.useCallback((event: React.DragEvent<HTMLElement>, trackId: string) => {
  if (isLoopImportTrackId(trackId)) return false;
  if (draggingSampleId && melodicSampleEntries.some((entry) => entry.id === draggingSampleId)) return true;
  const types = Array.from(event.dataTransfer?.types ?? []);
  return types.includes('application/xensonar-sample-id')
    || types.includes('text/x-xensonar-sample-id')
    || types.includes('text/plain');
}, [draggingSampleId, melodicSampleEntries]);

const handleTrackSampleDrop = React.useCallback((event: React.DragEvent<HTMLElement>, trackId: string) => {
  if (isLoopImportTrackId(trackId)) return false;
  const sampleId = readDraggedSampleId(event);
  if (!sampleId) return false;
  event.preventDefault();
  event.stopPropagation();
  onSetLoopTrackInstrumentPreset(trackId, `sample:${sampleId}`);
  onSelectTrack(trackId);
  setDraggingSampleId(null);
  return true;
}, [onSelectTrack, onSetLoopTrackInstrumentPreset, readDraggedSampleId]);

React.useEffect(() => {
  if (!pitchFrequencyEditor) return;
  const handlePointerDown = (event: MouseEvent) => {
    if (pitchFrequencyEditorRef.current?.contains(event.target as Node | null)) return;
    setPitchFrequencyEditor(null);
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') setPitchFrequencyEditor(null);
  };
  window.addEventListener('mousedown', handlePointerDown);
  window.addEventListener('keydown', handleKeyDown);
  return () => {
    window.removeEventListener('mousedown', handlePointerDown);
    window.removeEventListener('keydown', handleKeyDown);
  };
}, [pitchFrequencyEditor]);

const commitPitchFrequencyEditor = React.useCallback(() => {
  if (!pitchFrequencyEditor) return;
  const parsed = Number.parseFloat(pitchFrequencyEditor.draft.trim().replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    setPitchFrequencyEditor((current) => current ? { ...current, error: 'Bitte eine positive Hz-Zahl eingeben.' } : current);
    return;
  }
  const targetHz = Math.round(parsed * 10) / 10;
  const sourceLine = loopComposer.pitchLines[pitchFrequencyEditor.channelIndex] ?? null;
  if (!sourceLine || !Number.isFinite(sourceLine.hz) || sourceLine.hz <= 0) {
    setPitchFrequencyEditor((current) => current ? { ...current, error: 'Rasterstufe ist nicht editierbar.' } : current);
    return;
  }
  const targetOffsetCents = 1200 * Math.log2(targetHz / sourceLine.hz);
  const minHz = sourceLine.hz * Math.pow(2, -240 / 1200);
  const maxHz = sourceLine.hz * Math.pow(2, 240 / 1200);
  if (targetOffsetCents < -240 - 1e-6 || targetOffsetCents > 240 + 1e-6) {
    setPitchFrequencyEditor((current) => current ? {
      ...current,
      error: `Außerhalb des bisherigen Dreiecks-Bereichs (${minHz.toFixed(1)}–${maxHz.toFixed(1)} Hz).`,
    } : current);
    return;
  }
  onMutateLoopComposer((draft) => {
    const line = draft.pitchLines[pitchFrequencyEditor.channelIndex];
    const step = draft.pitchSteps[pitchFrequencyEditor.channelIndex];
    if (!line) return;
    line.offsetCents = targetOffsetCents;
    if (step) step.offsetCents = targetOffsetCents;
  }, `Rasterstufe exakt gesetzt · ${targetHz.toFixed(1)} Hz`);
  setPitchFrequencyEditor(null);
}, [loopComposer.pitchLines, onMutateLoopComposer, pitchFrequencyEditor]);

const handleComposerContextMenu = React.useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = clipComposerRef.current;
  if (canvas) {
    const hit = hitLoopComposerCanvas(canvas, event.clientX, event.clientY, loopComposer, {
      lockTrackEditing,
      materialFragmentPrepActive,
    });
    if (hit?.inGutter) {
      event.preventDefault();
      event.stopPropagation();
      const line = loopComposer.pitchLines[hit.channelIndex] ?? null;
      if (!line) return;
      const canvasRect = canvas.getBoundingClientRect();
      const editorWidth = 196;
      const editorHeight = 104;
      const localX = Math.max(8, Math.min(canvasRect.width - editorWidth - 8, event.clientX - canvasRect.left + 10));
      const localY = Math.max(8, Math.min(canvasRect.height - editorHeight - 8, event.clientY - canvasRect.top - 18));
      setPitchFrequencyEditor({
        channelIndex: hit.channelIndex,
        x: localX,
        y: localY,
        draft: effectiveLoopLineHz(line).toFixed(1),
        error: null,
      });
      return;
    }
  }
  setPitchFrequencyEditor(null);
  onCanvasContextMenu(event);
}, [clipComposerRef, lockTrackEditing, loopComposer, materialFragmentPrepActive, onCanvasContextMenu]);

const selectedLoopNote = React.useMemo(() => loopComposer.notes.find((entry) => entry.id === loopComposer.selectedNoteId) ?? null, [loopComposer.notes, loopComposer.selectedNoteId]);
const selectedLoopTrack = React.useMemo(() => {
  if (!selectedLoopNote) return null;
  return loopComposer.tracks.find((track) => track.id === selectedLoopNote.trackId) ?? null;
}, [loopComposer.tracks, selectedLoopNote]);
const selectedLoopSampleId = React.useMemo(() => resolveLoopNoteSampleId(loopComposer, selectedLoopNote), [loopComposer, selectedLoopNote]);
const selectedLoopSample = React.useMemo(() => {
  if (!selectedLoopSampleId) return null;
  return melodicSampleEntries.find((entry) => entry.id === selectedLoopSampleId) ?? null;
}, [melodicSampleEntries, selectedLoopSampleId]);
const selectedMaterialBaseNote = React.useMemo(() => isFragmentableLoopImportBody(selectedLoopNote) ? selectedLoopNote : null, [selectedLoopNote]);
const fragmentTargetOptions = React.useMemo(() => loopComposer.notes
  .filter((note) => isFragmentableLoopImportBody(note))
  .map((note) => {
    const track = loopComposer.tracks.find((entry) => entry.id === note.trackId) ?? null;
    const bodyLabel = loopImportBodyLabel(note);
    const fragmentSuffix = (note.fragmentCount ?? 1) > 1
      ? ` ${Math.max(1, note.fragmentIndex ?? 1)}/${Math.max(1, note.fragmentCount ?? 1)}`
      : '';
    return {
      noteId: note.id,
      label: `${track?.label || bodyLabel} · ${bodyLabel}${fragmentSuffix}`,
      color: track?.color ?? '#ec4899',
      pendingAnchor: note.pendingPitchAnchor === true,
    };
  }), [loopComposer.notes, loopComposer.tracks]);
const handleFragmentTargetSelect = React.useCallback((noteId: string) => {
  const target = loopComposer.notes.find((note) => note.id === noteId && isFragmentableLoopImportBody(note)) ?? null;
  if (!target) return;
  const track = loopComposer.tracks.find((entry) => entry.id === target.trackId) ?? null;
  const bodyLabel = loopImportBodyLabel(target);
  onMutateLoopComposer((draft) => {
    const liveTarget = draft.notes.find((note) => note.id === noteId && isFragmentableLoopImportBody(note)) ?? null;
    if (!liveTarget) return;
    draft.selectedNoteId = liveTarget.id;
    draft.selectedTrackId = liveTarget.trackId;
    if (!draft.activeTrackIds.includes(liveTarget.trackId)) draft.activeTrackIds.push(liveTarget.trackId);
  }, `Schnittziel gewählt: ${track?.label || bodyLabel} · ${bodyLabel}.`, { history: false });
}, [loopComposer.notes, loopComposer.tracks, onMutateLoopComposer]);
const materialBaseFragmentCount = React.useMemo(() => {
  const trackIds = new Set(loopComposer.notes.filter((note) => isLoopImportTrackId(note.trackId)).map((note) => note.trackId));
  return `${trackIds.size} Importspur${trackIds.size === 1 ? '' : 'en'}`;
}, [loopComposer.notes]);

const selectedLoopStepLabel = React.useMemo(() => {
  if (!selectedLoopNote) return '—';
  const channelIndex = noteChannelIndex(loopComposer, selectedLoopNote);
  return loopComposer.pitchSteps[channelIndex]?.label ?? `Kanal ${channelIndex + 1}`;
}, [loopComposer, selectedLoopNote]);

React.useEffect(() => {
  const handleOpenGridWorkbench = () => setGridWorkbenchOpen(true);
  const handleApplyGridTuning = (event: Event) => {
    const detail = (event as CustomEvent<{ tuning?: GridTuning }>).detail;
    const tuning = detail?.tuning;
    if (!tuning) return;
    applyGridTuningToMelodicLoop(tuning);
  };
  window.addEventListener(OPEN_MELODIC_LOOP_GRID_WORKBENCH_EVENT, handleOpenGridWorkbench as EventListener);
  window.addEventListener(APPLY_GRID_TUNING_TO_MELODIC_LOOP_EVENT, handleApplyGridTuning as EventListener);
  return () => {
    window.removeEventListener(OPEN_MELODIC_LOOP_GRID_WORKBENCH_EVENT, handleOpenGridWorkbench as EventListener);
    window.removeEventListener(APPLY_GRID_TUNING_TO_MELODIC_LOOP_EVENT, handleApplyGridTuning as EventListener);
  };
}, [applyGridTuningToMelodicLoop]);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-3 rounded border border-neutral-800 bg-black/40 p-3">
          <div className="space-y-3">
            <MelodicWorkspaceHeader
            selectedMelodicProjectId={selectedMelodicProjectId}
            melodicProjectChoices={melodicProjectChoices}
            canDeleteMelodicProject={canDeleteMelodicProject}
            onLoadMelodicProject={onLoadMelodicProject}
            onComposeFromScratch={onComposeFromScratch}
            onSaveMelodicProject={onSaveMelodicProject}
            onDeleteMelodicProject={onDeleteMelodicProject}
            onExportWorkspaceArchive={onExportWorkspaceArchive}
            onImportWorkspaceArchive={onImportWorkspaceArchive}
            hasWorkspacePackageContent={hasWorkspacePackageContent}
            loopComposer={loopComposer}
            onMutateLoopComposer={onMutateLoopComposer}
            melodicInstrumentOptionGroups={melodicInstrumentOptionGroups}
            onSetLoopTrackInstrumentPreset={onSetLoopTrackInstrumentPreset}
            onPreviewTrackInstrumentSelection={onPreviewTrackInstrumentSelection}
            gridTuningOptions={gridTuningOptions}
          />
          <MelodicSampleLibraryPanel
            melodicSampleEntries={melodicSampleEntries}
            showSpectralSampleHelp={showSpectralSampleHelp}
            onToggleSpectralSampleHelp={() => setShowSpectralSampleHelp((value) => !value)}
            spectralSamplePathAvailable={spectralSamplePathAvailable}
            onUploadMelodicSamples={onUploadMelodicSamples}
            onDeleteMelodicSample={onDeleteMelodicSample}
            onRenameMelodicSample={onRenameMelodicSample}
            onUpdateMelodicSampleBaseHz={onUpdateMelodicSampleBaseHz}
            onPreviewMelodicSampleReferencePitch={onPreviewMelodicSampleReferencePitch}
            onSetMelodicSampleTempoProfile={onSetMelodicSampleTempoProfile}
            onPreviewMelodicSampleTempoProfile={onPreviewMelodicSampleTempoProfile}
            onUpdateMelodicSampleEnvelope={onUpdateMelodicSampleEnvelope}
            sampleContextMenuRef={sampleInspector.sampleContextMenuRef}
            sampleContextMenu={sampleInspector.sampleContextMenu}
            onOpenSampleContextMenu={sampleInspector.openSampleContextMenu}
            onCloseSampleContextMenu={sampleInspector.closeSampleContextMenu}
            selectedContextSample={sampleInspector.selectedContextSample}
            sampleBaseHzDraft={sampleInspector.sampleBaseHzDraft}
            onSampleBaseHzDraftChange={sampleInspector.setSampleBaseHzDraft}
            sampleDurationDraft={sampleInspector.sampleDurationDraft}
            onSampleDurationDraftChange={sampleInspector.setSampleDurationDraft}
            sampleTempoModeDraft={sampleInspector.sampleTempoModeDraft}
            onSampleTempoModeDraftChange={sampleInspector.setSampleTempoModeDraft}
            showMaterialImportMenu={showMaterialImportMenu}
            onOpenMaterialImportMenu={() => { setMaterialImportActionMessage(null); setShowMaterialImportMenu(true); }}
            onCloseMaterialImportMenu={() => { setMaterialImportActionMessage(null); setShowMaterialImportMenu(false); }}
            materialEntries={materialEntries}
            selectedMaterialImportId={selectedMaterialImportId}
            onSelectMaterialImportId={setSelectedMaterialImportId}
            materialAnchorHzDraft={materialAnchorHzDraft}
            onMaterialAnchorHzDraftChange={setMaterialAnchorHzDraft}
            roundedAnchorPreview={roundedAnchorPreview}
            materialImportBusy={materialImportBusy}
            audioPaintVariant={carrierPinkVariant}
            onAudioPaintVariantChange={setCarrierPinkVariant}
            onConfirmMaterialImport={commitMaterialImportSelection}
            onRepairAudioPaintEntry={rebuildAndImportAudioPaintEntry}
            onEditAudioPaintEntry={editAudioPaintEntryInSpectralForge}
            materialImportActionMessage={materialImportActionMessage}
            onSampleCardDragStart={setDraggingSampleId}
            onSampleCardDragEnd={() => setDraggingSampleId(null)}
          />
          <div className="flex flex-wrap gap-2 text-xs">
            <button type="button" onClick={onUndo} disabled={!canUndo} className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900 disabled:opacity-40">Undo</button>
            <button type="button" onClick={onRedo} disabled={!canRedo} className="rounded border border-neutral-700 px-3 py-2 text-neutral-200 hover:bg-neutral-900 disabled:opacity-40">Redo</button>
          </div>
          <div className="grid gap-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
            {loopComposer.tracks.map((track, index) => {
              const active = loopComposer.selectedTrackId === track.id;
              const presetLabel = getMelodicSoundDisplayLabel(track.instrumentPreset, melodicSampleEntries);
              const audible = track.enabled;
              const cardStyle = { borderColor: track.color, boxShadow: active ? `0 0 0 1px ${track.color}66 inset` : undefined } as const;
              return (
                <div
                  key={track.id}
                  className={`rounded border bg-neutral-950/60 p-2 text-xs ${active ? 'text-white' : 'text-neutral-300'}`}
                  style={cardStyle}
                  onDragOver={(event) => {
                    if (!canDropSampleOnTrack(event, track.id)) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'copy';
                  }}
                  onDrop={(event) => {
                    void handleTrackSampleDrop(event, track.id);
                  }}
                  onDragEnd={() => setDraggingSampleId(null)}
                  title={isLoopImportTrackId(track.id) ? undefined : 'Drop ein Sample aus der Datenbank hier, um Instrument 1–4 direkt umzuschalten.'}
                >
                  <button
                    type="button"
                    onClick={() => onSelectTrack(track.id)}
                    onDragOver={(event) => {
                      if (!canDropSampleOnTrack(event, track.id)) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'copy';
                    }}
                    onDrop={(event) => {
                      if (handleTrackSampleDrop(event, track.id)) return;
                    }}
                    className="w-full rounded border px-3 py-2 text-left transition hover:bg-neutral-900/70"
                    style={{ borderColor: track.color, background: active ? `${track.color}22` : undefined, color: active ? '#f8fafc' : undefined }}
                  >
                    <div className="font-semibold">{track.label || `Instrument ${index + 1}`}: {presetLabel}</div>
                    <div className="mt-1 text-[11px] text-neutral-400">{audible ? 'An' : 'Mute'} · {loopComposer.notes.filter((note) => note.trackId === track.id).length} Blöcke</div>
                  </button>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleTrackEnabled(track.id)}
                      className={`rounded border px-2 py-1 ${audible ? 'text-emerald-100' : 'text-amber-100'}`}
                      style={{ borderColor: track.color, background: audible ? `${track.color}22` : 'rgba(82,82,91,0.28)' }}
                    >
                      {audible ? 'An' : 'Mute'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onResetTrackPattern(track.id)}
                      className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => onOnlyYouTrack(track.id)}
                      className="rounded border border-fuchsia-700/70 px-2 py-1 text-fuchsia-100 hover:bg-fuchsia-950/30"
                    >
                      Only You
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {TRACK_PATTERN_PRESETS.map((preset) => {
                      const activePattern = (track as any).patternPresetId === preset.id;
                      return (
                        <button
                          key={`${track.id}-${preset.id}`}
                          type="button"
                          onClick={() => onApplyTrackPatternPreset(track.id, preset.id)}
                          className={`rounded border px-2 py-1 ${activePattern ? 'text-white' : 'text-neutral-300 hover:bg-neutral-900'}`}
                          style={{ borderColor: track.color, background: activePattern ? `${track.color}22` : undefined }}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="flex gap-2 self-start xl:justify-end">
              <button type="button" onClick={() => onShiftPitchWindow(-1)} className="rounded border border-neutral-700 px-3 py-1.5 text-neutral-200 hover:bg-neutral-900">Fenster ↑</button>
              <button type="button" onClick={() => onShiftPitchWindow(1)} className="rounded border border-neutral-700 px-3 py-1.5 text-neutral-200 hover:bg-neutral-900">Fenster ↓</button>
            </div>
          </div>
          </div>
          <div ref={importBodyRackRef} data-xensonar-melodic-import-body-rack="true" className="grid gap-3 rounded border border-neutral-800 bg-neutral-950/60 px-3 py-3 text-xs text-neutral-300 md:grid-cols-[10rem_minmax(15rem,1fr)] xl:grid-cols-[10rem_minmax(18rem,1fr)_auto]">
            <label className="space-y-1 text-xs text-neutral-400">
              <span className="uppercase tracking-[0.18em] text-neutral-500">Anzahl Takte</span>
              <input type="number" min={1} max={16} step={1} value={loopComposer.bars} onChange={(e) => onBarsChange(Number(e.target.value))} className="w-full border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100" />
            </label>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="uppercase tracking-[0.18em] text-neutral-500">Taktsegmente (Orientierungsmarker)</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => onSegmentCountChange(loopComposer.segmentCount - 1)} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900">−</button>
                  <input type="number" min={1} max={16} step={1} value={loopComposer.segmentCount} onChange={(e) => onSegmentCountChange(Number(e.target.value))} className="w-20 border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100" />
                  <button type="button" onClick={() => onSegmentCountChange(loopComposer.segmentCount + 1)} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900">+</button>
                </div>
              </div>
              <input type="range" min={1} max={16} step={1} value={loopComposer.segmentCount} onChange={(e) => onSegmentCountChange(Number(e.target.value))} className="w-full" />
            </div>
            <MaterialBaseFragmentActionCard
              materialFragmentPrepActive={materialFragmentPrepActive}
              materialBaseFragmentCount={materialBaseFragmentCount}
              selectedMaterialBaseNote={selectedMaterialBaseNote}
              selectedImportTrackLabel={selectedLoopTrack?.label ?? null}
              selectedImportTrackColor={selectedLoopTrack?.color ?? null}
              fragmentTargetOptions={fragmentTargetOptions}
              onSelectFragmentTarget={handleFragmentTargetSelect}
              onFragmentMaterialBaseSelection={onFragmentMaterialBaseSelection}
            />
          </div>
          <div className="flex items-stretch gap-3">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="relative overflow-hidden rounded border border-neutral-800 bg-black" onWheel={onCanvasWheel}>
                <canvas
                  ref={clipComposerRef}
                  width={1360}
                  height={700}
                  data-xensonar-melodic-loop-workspace-canvas="true"
                  className="block h-[700px] w-full bg-black"
                  style={{ cursor: composerCursor, userSelect: 'none', touchAction: 'none' }}
                  onDragStart={(event) => event.preventDefault()}
                  onMouseDown={onCanvasMouseDown}
                  onMouseMove={onCanvasMouseMove}
                  onMouseUp={onCanvasMouseUp}
                  onMouseLeave={onCanvasMouseLeave}
                  onContextMenu={handleComposerContextMenu}
                />
                {pitchFrequencyEditor ? (
                  <div
                    ref={pitchFrequencyEditorRef}
                    data-xensonar-grid-frequency-editor="true"
                    className="absolute z-30 w-[196px] rounded border border-sky-400/70 bg-slate-950/95 p-2 shadow-2xl shadow-black/70"
                    style={{ left: pitchFrequencyEditor.x, top: pitchFrequencyEditor.y }}
                    onMouseDown={(event) => event.stopPropagation()}
                    onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}
                  >
                    <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-sky-300/80">Rasterstufe · Hz exakt</div>
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        type="text"
                        inputMode="decimal"
                        value={pitchFrequencyEditor.draft}
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) => setPitchFrequencyEditor((current) => current ? { ...current, draft: event.target.value, error: null } : current)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') { event.preventDefault(); commitPitchFrequencyEditor(); }
                          if (event.key === 'Escape') { event.preventDefault(); setPitchFrequencyEditor(null); }
                        }}
                        aria-label="Rasterfrequenz in Hertz"
                        className="min-w-0 flex-1 rounded border border-sky-700/80 bg-black px-2 py-1.5 text-sm tabular-nums text-sky-50 outline-none focus:border-sky-300"
                      />
                      <span className="text-xs text-sky-200/75">Hz</span>
                      <button
                        type="button"
                        onClick={commitPitchFrequencyEditor}
                        className="rounded border border-sky-600/80 px-2 py-1.5 text-xs text-sky-100 hover:bg-sky-950/60"
                        title="Übernehmen"
                      >
                        ✓
                      </button>
                    </div>
                    <div className={`mt-1 text-[10px] ${pitchFrequencyEditor.error ? 'text-rose-300' : 'text-neutral-500'}`}>
                      {pitchFrequencyEditor.error ?? '1 Nachkommastelle · Enter übernimmt · Esc verwirft'}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="rounded border border-neutral-800 bg-neutral-950/60 px-3 py-3 text-xs text-neutral-400">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="uppercase tracking-[0.2em] text-neutral-500">Horizontales Zoom-Fenster</div>
                    <div className="mt-1 text-[11px] text-neutral-500">Innen greifen = Ausschnitt verschieben. Seiten greifen = verlängern oder verkürzen.</div>
                  </div>
                  <div className="text-[11px] text-neutral-500">Mausrad oder Zweifinger-Geste zoomt lokal. Shift+Rad zoomt vertikal.</div>
                </div>
                <LoopComposerHorizontalOverview
                  overviewRef={composerOverviewRef}
                  loopComposer={loopComposer}
                  onJump={onJumpHorizontalOverview}
                  onStartDrag={onStartHorizontalOverviewDrag}
                />
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button type="button" onClick={onPreviewEnabledTracks} className="rounded border border-violet-700/70 px-3 py-2 text-violet-100 hover:bg-violet-950/30">Aktive Instrumente hören (Loop)</button>
                <button type="button" onClick={() => onStopEnabledTracksPreview('Vorschau gestoppt.')} className="rounded border border-rose-700/70 px-3 py-2 text-rose-100 hover:bg-rose-950/30">Stopp</button>
              </div>
            </div>
            <div className="w-12 shrink-0 rounded border border-neutral-800 bg-neutral-950/60 p-2 text-[10px] text-neutral-500">
              <div className="mb-2 text-center uppercase tracking-[0.16em]">Y</div>
              <LoopComposerVerticalOverview
                overviewRef={composerVerticalOverviewRef}
                loopComposer={loopComposer}
                activeLoopPitchIndex={activeLoopPitchIndex}
                onJump={onJumpVerticalOverview}
                onStartDrag={onStartVerticalOverviewDrag}
                onReset={onResetVerticalOverview}
              />
            </div>
          </div>
          <MelodicLoopSidebar
            loopComposer={loopComposer}
            activeLoopPitchStep={activeLoopPitchStep}
            selectedLoopNote={selectedLoopNote}
            selectedLoopTrackLabel={selectedLoopTrack?.label ?? selectedLoopNote?.trackId ?? '—'}
            selectedLoopStepLabel={selectedLoopStepLabel}
            selectedLoopSample={selectedLoopSample}
            melodicPreviewNotes={melodicPreviewNotes}
            autoZoomOnDenseOverlap={autoZoomOnDenseOverlap}
            lockTrackEditing={lockTrackEditing}
            chordVoicing={chordVoicing}
            chordStrumSteps={chordStrumSteps}
            chordVelocitySlope={chordVelocitySlope}
            onMutateLoopComposer={onMutateLoopComposer}
            onOpenSampleDetails={sampleInspector.openSampleContextMenuAtDefaultPosition}
            onPreviewSelectedNote={onPreviewSelectedNote}
            onStopEnabledTracksPreview={onStopEnabledTracksPreview}
            onActivePitchOffsetChange={onActivePitchOffsetChange}
            onResetActivePitchOffset={onResetActivePitchOffset}
            onZoomXChange={onZoomXChange}
            onScrollXChange={onScrollXChange}
            onZoomYChange={onZoomYChange}
            onScrollYChange={onScrollYChange}
            onBeatsPerBarChange={onBeatsPerBarChange}
            onSegmentCountChange={onSegmentCountChange}
            onResetZoom={onResetZoom}
            onAutoZoomChange={onAutoZoomChange}
            onLockTrackEditingChange={onLockTrackEditingChange}
            onChordVoicingChange={onChordVoicingChange}
            onChordStrumStepsChange={onChordStrumStepsChange}
            onChordVelocitySlopeChange={onChordVelocitySlopeChange}
            onFreezeSelectedNoteToSample={onFreezeSelectedNoteToSample}
            onScrollToWorkspace={scrollMelodicWorkspaceIntoView}
          />
        </div>
      </div>
      <SpectralImportColorDialog
        open={pendingColoredImport != null}
        importLabel={pendingColoredImport?.importLabel ?? 'Importspur'}
        color={importLaneColorDraft}
        busy={materialImportBusy}
        onColorChange={setImportLaneColorDraft}
        onConfirm={() => { void confirmColoredImport(); }}
        onCancel={cancelColoredImport}
      />
      <GridTuningRackDialog
        open={gridWorkbenchOpen}
        currentTuning={loopComposer.tuning}
        activeRack={activeGridRack}
        onClose={() => setGridWorkbenchOpen(false)}
        onRackChange={handleActiveGridRackChange}
        onActivateTuning={applyGridTuningToMelodicLoop}
        onResetRack={handleResetActiveGridRack}
        onUseInMelodicLoop={sendGridTuningToMelodicLoop}
      />
    </div>
  );
}
