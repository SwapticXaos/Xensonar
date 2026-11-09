import { useEffect,useMemo,useRef,useState } from 'react';
import { buildMachineRoomHandoffProfile } from '../../xensonar/architecture/machineRooms';
import { DRUM_KITS } from '../../xensonar/domain/instrumentData';
import type { ForgeMode } from '../contracts/level3LabContracts';
import { getForgeMaterialAdapter,useForgeMaterialAdapters } from '../forgeBridge';
import { registerExternalMaterialPackage,useMaterialLibrary } from '../materialLibrary';
import { audioEngine } from '../spectralForge/audio/AudioEngine';
import { type MorphMode } from '../spectralForge/audio/SpectralData';
import { useCustomStampLibrary } from '../spectralForge/customStampLibrary';
import { computeLoopDurationSec } from '../spectralForge/state/storeMaterialExport';
import {
  flattenCanonicalControllerArgGroups,
  type CanonicalMaterialTransferControllerArgs,
  type CanonicalSourceIntakeControllerArgs,
  type CanonicalSourcePreviewControllerArgs,
} from './canonicalControllerArgBuilders';
import { CANONICAL_SOURCE_VIEW_OPTIONS } from './canonicalForgeContracts';
import {
  BASS_PATTERN_OPTIONS,
  CANONICAL_PRODUCER,
  DRUM_PATTERN_OPTIONS,
  XENSONAR_LOOP_REFERENCE_BPM,
  createTransferMetadata,
  estimateLoopAutocorrect,
  type MaterialExportConfig,
} from './canonicalForgeRoomContracts';
import { buildCanonicalForgeInitialState } from './canonicalForgeInitialState';
import { buildCanonicalForgeWorkspaceSnapshotContract } from './canonicalForgeWorkspaceSnapshotContract';
import type { CanonicalForgeMicrotonalActionBoundaries } from './canonicalForgeActionBoundaries';
import { createCanonicalMaterialTransferController } from './canonicalMaterialTransferController';
import { createCanonicalMelodicComposerStateController } from './canonicalMelodicComposerStateController';
import { createCanonicalMelodicTrackActionController } from './canonicalMelodicTrackActionController';
import { createCanonicalSourceIntakeController } from './canonicalSourceIntakeController';
import { createCanonicalSourcePreviewController } from './canonicalSourcePreviewController';
import { createCanonicalStampWorkflowController } from './canonicalStampWorkflowController';
import {
clampComposerLength,
cloneLoopComposerState,
countActiveDrumSteps,
createDefaultLoopTimeGuides,
noteDurationUnits,
noteStartUnit,
resizeDrumComputerState,
syncLoopNoteToState,
totalComposerSteps,
} from './loopDrumDomain';
import { stopLoopComposerPreview } from './loopPreview';
import { inferMaterialEntrySourceBpm } from './materialBaseWorkflow';
import { isMelodicLoopImportableMaterialEntry,toMaterialImportEntrySummary } from './materialImportChannel';
import { createMelodicPreviewTransportController } from './melodicPreviewTransportController';
import {
createBuiltInMelodicProjects,
syncPatternStoresAfterComposerMutation,
} from './melodicProjectLibrary';
import {
commitMelodicPatternStores,
type MelodicPatternLinkMap,
type MelodicPatternVariantMap,
} from './melodicPatternStoreContract';
import { createMelodicProjectWorkspaceController } from './melodicProjectWorkspaceController';
import { createMelodicSampleWorkspaceController } from './melodicSampleWorkspaceController';
import { buildMelodicInstrumentOptionGroups } from './melodicSoundRegistry';
import { MicrotonalLogicWorkspace } from './microtonalLogicWorkspace';
import { type SynthMode,type WaveformMix } from './selectionAudioTransfer';
import { getCanonicalForgeSession } from './session';
import type { CanonicalForgeWorkspace, CanonicalLogicView, CanonicalTool } from './sessionTypes';
import { hasPlayableSource } from './spectralWorkspaceUtils';
import { useCanonicalDrumWorkspaceRuntime } from './useCanonicalDrumWorkspaceRuntime';
import { useCanonicalForgeComposerInteractionState } from './useCanonicalForgeComposerInteractionState';
import { useCanonicalForgeComposerInteractionRefs } from './useCanonicalForgeComposerInteractionRefs';
import { useCanonicalForgeDerivedState } from './useCanonicalForgeDerivedState';
import { useCanonicalForgeLibraryLifecycle,useCanonicalForgeLibraryUiState } from './useCanonicalForgeLibraryLifecycle';
import { useCanonicalForgeLifecycleEffects } from './useCanonicalForgeLifecycleEffects';
import { useCanonicalForgePreviewRefs } from './useCanonicalForgePreviewRefs';
import { useCanonicalForgeRenderEffects } from './useCanonicalForgeRenderEffects';
import { useCanonicalForgeSelectionViewportState } from './useCanonicalForgeSelectionViewportState';
import { useCanonicalForgeSourceWorkspaceState } from './useCanonicalForgeSourceWorkspaceState';
import { useCanonicalForgeStampWorkflowState } from './useCanonicalForgeStampWorkflowState';
import { useCanonicalForgeSessionSync } from './useCanonicalForgeSessionSync';
import { useCanonicalForgeHistoryRuntime } from './useCanonicalForgeHistoryRuntime';
import { useCanonicalForgeHotkeyBridge } from './useCanonicalForgeHotkeyBridge';
import { useCanonicalForgeLogicViewBridge } from './useCanonicalForgeLogicViewBridge';
import { useCanonicalForgeMelodicWorkspaceState } from './useCanonicalForgeMelodicWorkspaceState';
import { useCanonicalForgeMaterialImportRequestBridge } from './useCanonicalForgeMaterialImportRequestBridge';
import { useCanonicalForgePackageStationBridge } from './useCanonicalForgePackageStationBridge';
import { useCanonicalForgeWarpProxyState } from './useCanonicalForgeWarpProxyState';
import { useCanonicalLoopComposerInteractions } from './useCanonicalLoopComposerInteractions';
import { useCanonicalMicrotonalWorkspaceConfig,type CanonicalMicrotonalWorkspaceConfigArgs } from './useCanonicalMicrotonalWorkspaceConfig';
import { useCanonicalStampHotkeys } from './useCanonicalStampHotkeys';
import { CanonicalForgeHeader,WaveMaterialArchivePanels,type CanonicalForgeHeaderProps,type WaveMaterialArchivePanelsProps } from './workspaceScaffoldPanels';

const discardLastAutoCorrect = (_value: unknown) => undefined;

export function CanonicalForgeRoom({
  onBack,
  onRequestModeChange,
  externalLogicView,
  onExternalLogicViewChange,
  hideTopLogicSwitch = false,
}: {
  onBack: () => void;
  onRequestModeChange?: (mode: ForgeMode) => void;
  externalLogicView?: CanonicalLogicView;
  onExternalLogicViewChange?: (mode: CanonicalLogicView) => void;
  hideTopLogicSwitch?: boolean;
}) {
  // Bootstrap exactly once. The persisted session is an initializer, not live render state.
  // Rebuilding this on ordinary parent renders would restore/copy the full spectral matrix.
  const [initialState] = useState(() => buildCanonicalForgeInitialState({
    initialSession: getCanonicalForgeSession(),
    externalLogicView,
  }));
  const [materialExport, setMaterialExport] = useState<MaterialExportConfig>(() => initialState.materialExport);
  const {
    rawSourceAsset, setRawSourceAsset, sourceAsset, setSourceAsset, bundle, setBundle, spectralData, setSpectralData,
    sourceView, setSourceView, secondaryView, setSecondaryView, viewBlend, setViewBlend, sourcePreviewMode, setSourcePreviewMode,
    playheadPosition, setPlayheadPosition, isPlaying, setIsPlaying, busy, setBusy, revision, setRevision,
    auditionView, auditionBlendAmount, selectedProjectId,
  } = useCanonicalForgeSourceWorkspaceState(initialState);
  const [activeTool] = useState<CanonicalTool>(() => initialState.activeTool);
  const [brushSize] = useState(() => initialState.brushSize);
  const [intensity] = useState(() => initialState.intensity);
  const [hardness] = useState(() => initialState.hardness);
  const [eraseMode, setEraseMode] = useState(() => initialState.eraseMode);
  const [morphMode] = useState<MorphMode>(() => initialState.morphMode);
  const [activeWorkspace, setActiveWorkspace] = useState<CanonicalForgeWorkspace>(() => initialState.activeWorkspace);
  const [status, setStatus] = useState(() => initialState.status);
  const [logicView, setLogicView] = useState<CanonicalLogicView>(() => initialState.logicView);
  const [materialImportRequestNonce, setMaterialImportRequestNonce] = useState(0);


  const applyLogicView = useCanonicalForgeLogicViewBridge({
    externalLogicView,
    onExternalLogicViewChange,
    setLogicView,
  });

  useCanonicalForgeMaterialImportRequestBridge({
    applyLogicView,
    setActiveWorkspace,
    setMaterialImportRequestNonce,
  });

  const [synthMode] = useState<SynthMode>(() => initialState.synthMode);
  const [waveformMix] = useState<WaveformMix>(() => initialState.waveformMix);
  const [hoveredCell] = useState<{ x: number; y: number } | null>(null);
  const {
    stampPresetId, stampData, setStampData, stampScaleX, setStampScaleX, stampScaleY, setStampScaleY,
    stampRotation, setStampRotation, stampFlipX, setStampFlipX, stampFlipY, setStampFlipY, stampPhase, setStampPhase, stampSelStart, setStampSelStart,
  } = useCanonicalForgeStampWorkflowState(initialState);
  const {
    selectionStartSec, setSelectionStartSec, selectionDurationSec, setSelectionDurationSec, selectionDirty, setSelectionDirty,
    detailSelectionStartSec, setDetailSelectionStartSec, detailSelectionDurationSec, setDetailSelectionDurationSec, detailSelectionDirty, setDetailSelectionDirty,
    detailViewportStartSec, setDetailViewportStartSec, detailViewportDurationSec, setDetailViewportDurationSec, detailZoom, detailOffset, setDetailOffset,
  } = useCanonicalForgeSelectionViewportState(initialState);
  const drumRuntime = useCanonicalDrumWorkspaceRuntime({
    initialDrumComputer: initialState.drumComputer,
    initialDrumViewport: initialState.drumViewport,
    initialGrooveMachine: initialState.grooveMachine,
    materialExportName: materialExport.name,
    setStatus,
  });
  const {
    grooveMachine, setGrooveMachine, drumComputer, setDrumComputer, setDrumViewport,
    selectedDrumLaneId, setSelectedDrumLaneId, drumMarkerDragIndex, visibleDrumComputer, safeDrumViewport,
    drumNavigatorHitRatios, drumCanvasWidth, refs: { drumComputerRef, drumViewportWrapperRef, drumNavigatorRef },
    actions: drumActions,
  } = drumRuntime;
  const {
    loopComposer, setLoopComposer, loopPatternVariants, setLoopPatternVariants, loopPatternLinks, setLoopPatternLinks,
    savedMelodicProjects, setSavedMelodicProjects, selectedMelodicProjectId, setSelectedMelodicProjectId,
    melodicSampleEntries, setMelodicSampleEntries, autoZoomOnDenseOverlap, setAutoZoomOnDenseOverlap,
    lockTrackEditing, setLockTrackEditing, chordVoicing, setChordVoicing, chordStrumSteps, setChordStrumSteps,
    chordVelocitySlope, setChordVelocitySlope, pendingImageImport, setPendingImageImport,
    materialFragmentGuideSnapshot, setMaterialFragmentGuideSnapshot, clipPreviewStep, setClipPreviewStep,
    selectionLoopPreviewPlaying, setSelectionLoopPreviewPlaying, setSelectionLoopPreviewPlayheadSec,
  } = useCanonicalForgeMelodicWorkspaceState(initialState);
  const {
    composerHover, setComposerHover, selectedLoopNoteIds, setSelectedLoopNoteIds, composerSelectionBox, setComposerSelectionBox,
    showChordGhost, setShowChordGhost, setDenseOverlapWarning, composerCursor, setComposerCursor,
  } = useCanonicalForgeComposerInteractionState(initialState);
  const setLastAutoCorrect = discardLastAutoCorrect;

  const forgeRootRef = useRef<HTMLElement | null>(null);
  const forgeHotkeyScopeActiveRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clipComposerRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    audioPreviewRef,
    selectionLoopPreviewCtxRef,
    selectionLoopPreviewSourceRef,
    selectionLoopPreviewGainRef,
    selectionLoopPreviewStartTimeRef,
    selectionLoopPreviewDurationRef,
    selectionLoopPreviewAnimationRef,
    sourceAuditionCtxRef,
    sourceAuditionSourceRef,
    sourceAuditionGainRef,
    sourceAuditionStartTimeRef,
    sourceAuditionDurationRef,
    sourceAuditionAnimationRef,
    sourceAuditionModeRef,
  } = useCanonicalForgePreviewRefs();
  const {
    proxyBaselineSnapshotRef,
    warpTimeColumnsRef,
    warpPitchColumnsRef,
    warpVersion,
    applyWarpSnapshot,
    updateProxyBaselineSnapshot,
  } = useCanonicalForgeWarpProxyState({
    initialProxyBaselineSnapshot: initialState.proxyBaselineSnapshot,
    spectralWidth: spectralData.width,
  });
  const stampSelEndRef = useRef<{ x: number; y: number } | null>(null);
  const isStampSelectingRef = useRef(false);
  const stampLoadedModeRef = useRef<'positive' | 'erase'>(initialState.stampLoadedMode);
  const stampArrowHoldRef = useRef<Record<string, number>>({});
  const {
    composerDragRef,
    composerOverviewRef,
    composerViewportDragRef,
    composerVerticalOverviewRef,
    composerVerticalViewportDragRef,
  } = useCanonicalForgeComposerInteractionRefs();
  const loopPatternVariantsRef = useRef<MelodicPatternVariantMap>(loopPatternVariants);
  const loopPatternLinksRef = useRef<MelodicPatternLinkMap>(loopPatternLinks);
  const materialEntries = useMaterialLibrary((s) => s.entries);
  const customStampEntries = useCustomStampLibrary((s) => s.entries);
  const { selectedMaterialId, setSelectedMaterialId, selectedStampId, setSelectedStampId,
    projectName, setProjectName, setCustomStampName, setMaterialRenameDraft } =
    useCanonicalForgeLibraryUiState(initialState.projectName);

  const adapters = useForgeMaterialAdapters();
  const selectedAdapter = useMemo(() => getForgeMaterialAdapter(materialExport.adapterId), [materialExport.adapterId, adapters]);
  const activeHandoffProfile = useMemo(() => buildMachineRoomHandoffProfile({ role: materialExport.role, workspaceOrigin: activeWorkspace }), [materialExport.role, activeWorkspace]);
  const loopDurationSec = useMemo(() => computeLoopDurationSec(materialExport.bars, materialExport.bpm), [materialExport.bars, materialExport.bpm]);
  const builtInMelodicProjects = useMemo(() => createBuiltInMelodicProjects(loopComposer.bars || grooveMachine.barsInterpretation || 4), [loopComposer.bars, grooveMachine.barsInterpretation]);
  const melodicProjectChoices = useMemo(() => ([
    ...builtInMelodicProjects,
    ...savedMelodicProjects.map((project) => ({ id: project.id, name: project.name, builtIn: false, project })),
  ]), [builtInMelodicProjects, savedMelodicProjects]);
  const melodicInstrumentOptionGroups = useMemo(() => buildMelodicInstrumentOptionGroups(melodicSampleEntries), [melodicSampleEntries]);
  const workspaceToolSettings = useMemo(
    () => ({ brushSize, intensity, hardness, eraseMode, morphMode }),
    [brushSize, intensity, hardness, eraseMode, morphMode],
  );
  const workspaceSnapshot = buildCanonicalForgeWorkspaceSnapshotContract({
    materialExport,
    rawSourceAsset,
    sourceAsset,
    bundle,
    spectralData,
    sourceView,
    secondaryView,
    viewBlend,
    activeTool,
    toolSettings: workspaceToolSettings,
    synthMode,
    waveformMix,
    status,
    stampPresetId,
    stampData,
    stampScaleX,
    stampScaleY,
    stampRotation,
    stampFlipX,
    stampFlipY,
    selectionStartSec,
    selectionDurationSec,
    selectionDirty,
    detailSelectionStartSec,
    detailSelectionDurationSec,
    detailSelectionDirty,
    detailViewportStartSec,
    detailViewportDurationSec,
    detailZoom,
    detailOffset,
    auditionView,
    auditionBlendAmount,
    selectedProjectId,
    sourcePreviewMode,
    activeWorkspace,
    logicView,
    grooveMachine,
    drumComputer,
    safeDrumViewport,
    loopComposer,
    selectedLoopNoteIds,
    autoZoomOnDenseOverlap,
    lockTrackEditing,
    chordVoicing,
    chordStrumSteps,
    chordVelocitySlope,
  });

  const {
    melodicPreviewNotes,
    selectedMaterial,
    currentDrumPatternLabel,
    currentDrumKitLabel,
    currentMelodicPresetLabel,
    selectedCustomStamp,
    activeLoopPitchIndex,
    activeLoopPitchStep,
    previewComposerGesture,
    chordGhostNotes,
    effectiveLoopPreviewSelection,
    destructiveAudioProfile,
    warpAudioProfile,
    selectionSeamScore,
  } = useCanonicalForgeDerivedState({
    loopComposer,
    grooveMachine,
    materialEntries,
    selectedMaterialId: selectedMaterialId ?? '',
    customStampEntries,
    selectedStampId: selectedStampId ?? '',
    composerHover,
    showChordGhost,
    lockTrackEditing,
    chordVoicing,
    chordStrumSteps,
    detailSelectionDirty,
    detailSelectionStartSec,
    detailSelectionDurationSec,
    selectionStartSec,
    selectionDurationSec,
    rawSourceAsset,
    sourceAsset,
    selectionDirty,
    spectralData,
    revision,
    proxyBaselineSnapshotRef,
    warpTimeColumnsRef,
    warpPitchColumnsRef,
    warpVersion,
    stampSelStart,
    stampSelEndRef,
    hoveredCell,
    activeTool,
    stampPhase,
    stampData,
    stampScaleX,
    stampScaleY,
    stampRotation,
    stampFlipX,
    stampFlipY,
    materialExport,
    DRUM_PATTERN_OPTIONS,
    DRUM_KITS,
    BASS_PATTERN_OPTIONS,
    setClipPreviewStep,
    setStatus,
  });

  useCanonicalForgeLibraryLifecycle({
    loopPatternVariants,
    loopPatternVariantsRef,
    loopPatternLinks,
    loopPatternLinksRef,
    savedMelodicProjects,
    setMelodicSampleEntries,
    setStatus,
    selectedMaterialId,
    materialEntries,
    setSelectedMaterialId,
    selectedStampId,
    customStampEntries,
    setSelectedStampId,
    materialExportName: materialExport.name,
    setProjectName,
    selectedCustomStampName: selectedCustomStamp?.name,
    projectName,
    setCustomStampName,
    selectedMaterialName: selectedMaterial?.name,
    setMaterialRenameDraft,
  });

  useCanonicalForgeSessionSync({
    forgeRootRef,
    forgeHotkeyScopeActiveRef,
    snapshot: workspaceSnapshot,
  });

  const { getStampArrowDelta } = createCanonicalStampWorkflowController({
    isStampSelectingRef,
    stampLoadedModeRef,
    stampArrowHoldRef,
    stampSelEndRef,
    eraseMode,
    setStampData,
    setStampPhase,
    setStampSelStart,
    setEraseMode,
    setStampScaleX,
    setStampScaleY,
    setStampRotation,
    setStampFlipX,
    setStampFlipY,
    setStatus,
  });

  const historyRuntime = useCanonicalForgeHistoryRuntime({
    spectralData,
    warpTimeColumnsRef,
    warpPitchColumnsRef,
    applyWarpSnapshot: (snapshot) => {
      applyWarpSnapshot(
        snapshot.time ? Float32Array.from(snapshot.time) : null,
        snapshot.pitch ? Float32Array.from(snapshot.pitch) : null,
      );
    },
    loopComposer,
    selectedMelodicProjectId,
    activeWorkspace,
    logicView,
    loopPatternVariantsRef,
    loopPatternLinksRef,
    setLoopComposer,
    setLoopPatternVariants,
    setLoopPatternLinks,
    setSelectedMelodicProjectId,
    setSelectedLoopNoteIds,
    setComposerSelectionBox,
    setShowChordGhost,
    setDenseOverlapWarning,
    setRevision,
    setStatus,
    invalidateAudioBuffer: () => audioEngine.invalidateBuffer(),
  });
  const { pushUndo, pushLoopComposerUndo, performActiveUndo, performActiveRedo } = historyRuntime;

  useEffect(() => {
    setLoopComposer((state) => {
      if (state.bars === grooveMachine.barsInterpretation) return state;
      const next = cloneLoopComposerState(state);
      next.bars = grooveMachine.barsInterpretation;
      const maxSteps = totalComposerSteps(next);
      next.notes = next.notes
        .filter((note) => noteStartUnit(next, note) < maxSteps)
        .map((note) => syncLoopNoteToState(next, { ...note, durationUnits: clampComposerLength(Math.min(noteDurationUnits(next, note), maxSteps - noteStartUnit(next, note))) }));
      const synced = syncPatternStoresAfterComposerMutation({
        previousComposer: state,
        nextComposer: next,
        variants: loopPatternVariantsRef.current,
        links: loopPatternLinksRef.current,
      });
      commitMelodicPatternStores({
        stores: synced,
        patternVariantsRef: loopPatternVariantsRef,
        patternLinksRef: loopPatternLinksRef,
        setLoopPatternVariants,
        setLoopPatternLinks,
      });
      return next;
    });
    setDrumComputer((state) => resizeDrumComputerState(state, grooveMachine.barsInterpretation, state.segmentsPerBar, state.segmentMarkers));
  }, [grooveMachine.barsInterpretation]);



  const { handleStampTransformKey } = useCanonicalStampHotkeys({
    forgeRootRef,
    forgeHotkeyScopeActiveRef,
    canvasRef,
    activeTool,
    stampPhase,
    stampData,
    isStampSelectingRef,
    stampSelEndRef,
    stampArrowHoldRef,
    setStampSelStart,
    setStampPhase,
    setStatus,
    setStampRotation,
    setStampScaleX,
    setStampScaleY,
    getStampArrowDelta,
  });

  useCanonicalForgeHotkeyBridge({
    forgeHotkeyScopeActiveRef,
    performActiveUndo,
    performActiveRedo,
    handleStampTransformKey,
  });

  const {
    applySelection,
    handleImport,
  } = createCanonicalSourceIntakeController(flattenCanonicalControllerArgGroups<CanonicalSourceIntakeControllerArgs>({
    state: {
      bundle,
      sourceView,
      secondaryView,
      viewBlend,
      rawSourceAsset,
      loopDurationSec,
      selectionStartSec,
      selectionDurationSec,
      pendingImageImport,
      spectralData,
      materialExport,
      synthMode,
      waveformMix,
      activeWorkspace,
      destructivePreviewProfile: destructiveAudioProfile,
      warpAudioProfile,
    },
    setters: {
      setBusy,
      setStatus,
      setSourceAsset,
      setRawSourceAsset,
      setBundle,
      setSpectralData,
      setSelectionStartSec,
      setSelectionDurationSec,
      setSelectionDirty,
      setDetailSelectionStartSec,
      setDetailSelectionDurationSec,
      setDetailSelectionDirty,
      setDetailViewportStartSec,
      setDetailViewportDurationSec,
      setDetailOffset,
      setRevision,
      setPendingImageImport,
      setMaterialExport,
      setLastAutoCorrect,
      setSourceView,
      setSecondaryView,
      setViewBlend,
      setSourcePreviewMode,
      setGrooveMachine,
    },
    deps: {
      updateProxyBaselineSnapshot,
      pushUndo,
      stopAllForge2Preview: (statusMessage) => stopAllForge2Preview(statusMessage),
      estimateLoopAutocorrect,
      sourceViews: CANONICAL_SOURCE_VIEW_OPTIONS,
    },
  }));

  const {
    mutateLoopComposer,
    handleLoopBarsChange,
    handleLoopSegmentCountChange,
    refreshSelectionFromBox,
    shiftPitchWindow,
  } = createCanonicalMelodicComposerStateController({
    loopComposer,
    selectedMelodicProjectId,
    selectedLoopNoteIds,
    loopPatternVariantsRef,
    loopPatternLinksRef,
    setLoopComposer,
    setLoopPatternVariants,
    setLoopPatternLinks,
    setSelectedLoopNoteIds,
    setComposerSelectionBox,
    pushLoopComposerUndo,
    setStatus,
  });

  const {
    releaseComposerInteractions,
    handleLoopComposerDown,
    handleLoopComposerMove,
    handleLoopComposerContextMenu,
    handleLoopComposerWheel,
    startComposerViewportDrag,
    jumpComposerViewportToPointer,
    startComposerVerticalViewportDrag,
    jumpComposerVerticalViewportToPointer,
  } = useCanonicalLoopComposerInteractions({
    clipComposerRef,
    composerOverviewRef,
    composerVerticalOverviewRef,
    composerDragRef,
    composerViewportDragRef,
    composerVerticalViewportDragRef,
    loopComposer,
    lockTrackEditing,
    materialFragmentPrepActive: materialFragmentGuideSnapshot !== null,
    autoZoomOnDenseOverlap,
    selectedLoopNoteIds,
    chordVoicing,
    chordStrumSteps,
    chordVelocitySlope,
    mutateLoopComposer,
    refreshSelectionFromBox,
    previewComposerGesture,
    setSelectedLoopNoteIds,
    setComposerSelectionBox,
    setComposerHover,
    setComposerCursor,
    setShowChordGhost,
    setDenseOverlapWarning,
    setStatus,
  });

  const syncVisiblePatternStores = () => {
    const synced = syncPatternStoresAfterComposerMutation({
      previousComposer: loopComposer,
      nextComposer: loopComposer,
      variants: loopPatternVariantsRef.current,
      links: loopPatternLinksRef.current,
    });
    return commitMelodicPatternStores({
      stores: synced,
      patternVariantsRef: loopPatternVariantsRef,
      patternLinksRef: loopPatternLinksRef,
      setLoopPatternVariants,
      setLoopPatternLinks,
    });
  };

  const {
    loadMelodicProject,
    composeMelodicFromScratch,
    saveMelodicProject,
    deleteMelodicProject,
    exportMelodicWorkspaceArchive,
    prepareMelodicWorkspaceArchiveDownload,
    importMelodicWorkspaceArchive,
  } = createMelodicProjectWorkspaceController({
    melodicProjectChoices,
    selectedMelodicProjectId,
    savedMelodicProjects,
    melodicSampleEntries,
    loopComposer,
    loopPatternVariantsRef,
    loopPatternLinksRef,
    pushLoopComposerUndo,
    syncVisiblePatternStores,
    applyLogicView,
    setLoopComposer,
    setLoopPatternVariants,
    setLoopPatternLinks,
    setSelectedMelodicProjectId,
    setSelectedLoopNoteIds,
    setSavedMelodicProjects,
    setMelodicSampleEntries,
    setActiveWorkspace,
    setStatus,
  });

  const {
    melodicWorkspaceImportInputRef,
    requestMelodicWorkspaceImport,
    handleMelodicWorkspaceArchiveImportInput,
    hasWorkspacePackageContent,
  } = useCanonicalForgePackageStationBridge({
    exportMelodicWorkspaceArchive,
    importMelodicWorkspaceArchive,
    prepareMelodicWorkspaceArchiveDownload,
    loopComposer,
    savedMelodicProjects,
    melodicSampleEntries,
    materialEntries,
  });

  const {
    registerMelodicSampleFromBlob,
    importMaterialEntryIntoMelodicLoop,
    fragmentSelectedMaterialBaseNote,
    uploadMelodicSamples,
    importSpectralSelectionAsMelodicSample,
    deleteMelodicSample,
    renameMelodicSample,
    updateMelodicSampleBaseHz,
    previewMelodicSampleReferencePitch,
    setMelodicSampleTempoProfile,
    previewMelodicSampleTempoProfile,
    updateMelodicSampleEnvelope,
    freezeSelectedLoopNoteToSample,
  } = createMelodicSampleWorkspaceController({
    loopComposer,
    melodicSampleEntries,
    materialEntries,
    materialFragmentGuideSnapshot,
    rawSourceAsset,
    materialExport,
    spectralData,
    synthMode,
    waveformMix,
    selectionStartSec,
    selectionDurationSec,
    sourceView,
    activeWorkspace,
    destructivePreviewProfile: destructiveAudioProfile,
    warpAudioProfile,
    setMelodicSampleEntries,
    setMaterialExport,
    setMaterialFragmentGuideSnapshot,
    setSelectedLoopNoteIds,
    mutateLoopComposer,
    setStatus,
  } as any);


  const {
    stopPreviewAudio,
    stopSelectionLoopPreview,
    startSelectionLoopPreview,
    startSourceAuditionPreview,
  } = createCanonicalSourcePreviewController(flattenCanonicalControllerArgGroups<CanonicalSourcePreviewControllerArgs>({
    state: {
      rawSourceAsset,
      effectiveLoopPreviewSelection,
      bundle,
      auditionView,
      synthMode,
      waveformMix,
      auditionBlendAmount,
      selectionStartSec,
      selectionDurationSec,
      destructiveAudioProfile,
      warpAudioProfile,
      selectionSeamScore,
      selectionLoopPreviewPlaying,
    },
    refs: {
      previewAudioRef: audioPreviewRef,
      sourceAuditionCtxRef,
      sourceAuditionSourceRef,
      sourceAuditionGainRef,
      sourceAuditionStartTimeRef,
      sourceAuditionDurationRef,
      sourceAuditionAnimationRef,
      sourceAuditionModeRef,
      selectionLoopPreviewCtxRef,
      selectionLoopPreviewSourceRef,
      selectionLoopPreviewGainRef,
      selectionLoopPreviewStartTimeRef,
      selectionLoopPreviewDurationRef,
      selectionLoopPreviewAnimationRef,
    },
    deps: {
      audioEngine,
      sourceViewOptions: CANONICAL_SOURCE_VIEW_OPTIONS,
      stopAllForge2Preview: (statusMessage) => stopAllForge2Preview(statusMessage),
    },
    actions: {
      setPlayheadPosition,
      setIsPlaying,
      setSelectionLoopPreviewPlayheadSec,
      setSelectionLoopPreviewPlaying,
      setStatus,
    },
  }));


  const forge2PreviewActions = {
    stopPreviewAudio,
    stopSelectionLoopPreview,
    setIsPlaying,
    setPlayheadPosition,
    setClipPreviewStep,
    setStatus,
  };

  const {
    stopAllForge2Preview,
    startMaterialGroovePreview,
    startDrumPreview,
    previewTrackInstrumentSelection,
    startEnabledTracksPreview,
    startComposerPreviewMode,
    handleLoopComposerExport,
    handleLoopComposerExportToForge1,
  } = createMelodicPreviewTransportController({
    forge2PreviewActions,
    loopComposer,
    materialExport,
    grooveMachine,
    drumComputer,
    spectralData,
    synthMode,
    waveformMix,
    loopDurationSec,
    activeHandoffProfile,
    selectedAdapterName: selectedAdapter.adapterName,
    canonicalProducer: CANONICAL_PRODUCER,
    onRequestModeChange,
    setPendingImageImport,
    setRawSourceAsset,
    setSelectionStartSec,
    setSelectionDurationSec,
    setMaterialExport,
    setLastAutoCorrect,
    setSourceView,
    setSecondaryView,
    setViewBlend,
    applySelection,
    setActiveWorkspace,
    setSourcePreviewMode,
    setBusy,
    setStatus,
    referenceBpm: XENSONAR_LOOP_REFERENCE_BPM,
  } as any);

  const {
    resetTrackPattern,
    applyTrackPatternPreset,
    setLoopTrackInstrumentPreset,
    toggleLoopTrackEnabled,
    onlyYouTrack,
  } = createCanonicalMelodicTrackActionController({
    loopComposer,
    melodicSampleEntries,
    loopPatternVariantsRef,
    loopPatternLinksRef,
    setLoopPatternVariants,
    setLoopPatternLinks,
    mutateLoopComposer,
    previewTrackInstrumentSelection,
  });

  useCanonicalForgeLifecycleEffects({
    stopPreviewAudio,
    stopLoopComposerPreview,
    stopSelectionLoopPreview,
    applyLogicView,
    setActiveWorkspace,
    setLoopComposer,
    setLoopPatternVariants,
    setLoopPatternLinks,
    loopPatternVariantsRef,
    loopPatternLinksRef,
    setSelectedMelodicProjectId,
    setSelectedLoopNoteIds,
    setMaterialExport,
    setStatus,
    stopAllForge2Preview,
    setPendingImageImport,
    setRawSourceAsset,
    setSelectionStartSec,
    setSelectionDurationSec,
    setLastAutoCorrect,
    setSourceView,
    setSecondaryView,
    setViewBlend,
    applySelection: applySelection as any,
    setSourcePreviewMode,
    selectionStartSec,
    selectionDurationSec,
    detailSelectionStartSec,
    detailSelectionDurationSec,
    detailSelectionDirty,
    selectionLoopPreviewPlaying,
    startSelectionLoopPreview,
    auditionView,
    auditionBlendAmount,
    isPlaying,
    sourceAuditionModeRef,
    startSourceAuditionPreview,
    playheadPosition,
    setIsPlaying,
    setPlayheadPosition,
    activeHandoffProfile,
    activeWorkspace,
    materialExport,
    spectralData,
    synthMode,
    waveformMix,
    sourceView,
    destructiveAudioProfile,
    warpAudioProfile,
    canonicalProducer: CANONICAL_PRODUCER as any,
    createTransferMetadata,
    registerMelodicSampleFromBlob: registerMelodicSampleFromBlob as any,
    setDetailSelectionStartSec,
    setDetailSelectionDurationSec,
    setDetailSelectionDirty,
    setDetailViewportStartSec,
    setDetailViewportDurationSec,
    setBusy,
  } as any);

  useCanonicalForgeRenderEffects({
    activeWorkspace,
    logicView,
    materialExportBars: materialExport.bars,
    drumComputerRef,
    visibleDrumComputer,
    clipPreviewRatio: 0,
    drumMarkerDragIndex,
    safeDrumViewport,
    clipComposerRef,
    loopComposer,
    selectedLoopNoteIds,
    composerHover,
    clipPreviewStep: clipPreviewStep ?? 0,
    grooveDrumPattern: grooveMachine.drumPattern,
    composerSelectionBox,
    chordGhostNotes,
    materialFragmentGuideSnapshot,
  } as any);

  const {
    handleExport,
  } = createCanonicalMaterialTransferController(flattenCanonicalControllerArgGroups<CanonicalMaterialTransferControllerArgs>({
    producer: CANONICAL_PRODUCER,
    state: {
      materialExport,
      spectralData,
      synthMode,
      waveformMix,
      rawSourceAsset,
      selectionStartSec,
      selectionDurationSec,
      sourceView,
      activeWorkspace,
      destructiveAudioProfile,
      warpAudioProfile,
      activeHandoffProfile,
      selectedAdapterName: selectedAdapter.adapterName,
    },
    deps: {
      invalidateAudioBuffer: () => audioEngine.invalidateBuffer(),
      registerExternalMaterialPackage,
      createTransferMetadata,
    },
    actions: {
      setBusy,
      setStatus,
    },
  } as any));

  const headerRuntimeArgs: CanonicalForgeHeaderProps = {
    activeWorkspace,
    hideTopLogicSwitch,
    logicView,
    currentDrumPatternLabel,
    currentDrumKitLabel,
    currentMelodicPresetLabel,
    onSelectLogicView: applyLogicView,
    onBack,
    fileInputRef,
    onImportFile: (file) => {
      void handleImport(file);
    },
  };

  const {
    showPresetDrumPattern, handleDrumBarsChange, handleDrumSegmentsChange, resetDrumComputerToPreset,
    startDrumNavigatorDrag, randomizeDrumComputer, clearDrumComputer, exportDrumComputerToXensonar, handleDrumComputerDown,
  } = drumActions;

  const microtonalActionBoundaries: CanonicalForgeMicrotonalActionBoundaries = {
    drumActions: {
      showPresetDrumPattern,
      setSelectedDrumLaneId,
      setGrooveMachine,
      handleDrumBarsChange,
      handleDrumSegmentsChange,
      resetDrumComputerToPreset,
      randomizeDrumComputer,
      clearDrumComputer,
      startDrumPreview,
      stopAllForge2Preview,
      exportDrumComputerToXensonar,
      handleDrumComputerDown,
      startDrumNavigatorDrag,
      setDrumViewport,
    },
    melodicActions: {
      mutateLoopComposer,
      setLoopTrackInstrumentPreset,
      uploadMelodicSamples,
      importSpectralSelectionAsMelodicSample,
      deleteMelodicSample,
      renameMelodicSample,
      updateMelodicSampleBaseHz,
      previewMelodicSampleReferencePitch,
      setMelodicSampleTempoProfile,
      previewMelodicSampleTempoProfile,
      updateMelodicSampleEnvelope,
      importMaterialEntryIntoMelodicLoop,
      fragmentSelectedMaterialBaseNote,
      loadMelodicProject,
      composeMelodicFromScratch,
      saveMelodicProject,
      deleteMelodicProject,
      exportMelodicWorkspaceArchive,
      requestMelodicWorkspaceImport,
      toggleLoopTrackEnabled,
      applyTrackPatternPreset,
      resetTrackPattern,
      onlyYouTrack,
      previewTrackInstrumentSelection,
      startEnabledTracksPreview,
      startComposerPreviewMode,
      stopAllForge2Preview,
      setComposerHover,
      setDenseOverlapWarning,
      setShowChordGhost,
      setComposerCursor,
      composerDragRef,
      setComposerSelectionBox,
      shiftPitchWindow,
      handleLoopBarsChange,
      handleLoopSegmentCountChange,
      handleLoopComposerWheel,
      handleLoopComposerDown,
      handleLoopComposerMove,
      releaseComposerInteractions,
      handleLoopComposerContextMenu,
      jumpComposerViewportToPointer,
      startComposerViewportDrag: startComposerViewportDrag as CanonicalMicrotonalWorkspaceConfigArgs['melodicActions']['startComposerViewportDrag'],
      jumpComposerVerticalViewportToPointer,
      startComposerVerticalViewportDrag: startComposerVerticalViewportDrag as CanonicalMicrotonalWorkspaceConfigArgs['melodicActions']['startComposerVerticalViewportDrag'],
      setAutoZoomOnDenseOverlap,
      setLockTrackEditing,
      setChordVoicing,
      setChordStrumSteps,
      setChordVelocitySlope,
      freezeSelectedLoopNoteToSample,
      createDefaultLoopTimeGuides,
      syncLoopNoteToState,
    },
    materialActions: {
      setMaterialExport,
      performActiveUndo,
      performActiveRedo,
      startMaterialGroovePreview,
      handleLoopComposerExport,
      handleLoopComposerExportToForge1,
      handleExport,
    },
  };

  const microtonalViewPanelRuntimeArgs: CanonicalMicrotonalWorkspaceConfigArgs = {
    logicView,
    currentDrumPatternLabel,
    currentDrumKitLabel,
    currentMelodicPresetLabel,
    drumState: {
      drumPatternOptions: DRUM_PATTERN_OPTIONS,
      drumKitOptions: DRUM_KITS,
      drumPatternValue: grooveMachine.drumPattern,
      drumKitValue: grooveMachine.drumKit,
      drumBarsValue: grooveMachine.barsInterpretation,
      drumSegmentsPerBarValue: visibleDrumComputer.segmentsPerBar,
      drumGridModeLabel: drumComputer.useCustom ? 'Custom Grid' : 'Preset Grid',
      drumHitCount: countActiveDrumSteps(visibleDrumComputer),
      drumStepCount: visibleDrumComputer.stepCount,
      drumViewport: safeDrumViewport,
      drumVisiblePercent: Math.round((safeDrumViewport.endRatio - safeDrumViewport.startRatio) * 100),
      drumCanvasWidth,
      selectedDrumLaneId,
      drumLaneKitOverrides: grooveMachine.drumLaneKitOverrides,
      drumLaneSettings: grooveMachine.drumLaneSettings,
    },
    drumRefs: {
      drumViewportWrapperRef,
      drumCanvasRef: drumComputerRef,
      drumNavigatorRef,
      drumNavigatorHitRatios,
    },
    drumActions: microtonalActionBoundaries.drumActions,
    melodicState: {
      loopComposer,
      bassPatternOptions: BASS_PATTERN_OPTIONS,
      activeLoopPitchIndex,
      activeLoopPitchStep,
      melodicPreviewNotes,
      autoZoomOnDenseOverlap,
      lockTrackEditing,
      chordVoicing,
      chordStrumSteps,
      chordVelocitySlope,
      composerCursor: String(composerCursor ?? ''),
      melodicInstrumentOptionGroups,
      melodicSampleEntries,
      canImportSpectralSelectionAsMelodicSample: Boolean((rawSourceAsset && hasPlayableSource(rawSourceAsset)) || spectralData?.data?.length),
      melodicProjectChoices,
      selectedMelodicProjectId,
      canDeleteMelodicProject: savedMelodicProjects.some((entry) => entry.id === selectedMelodicProjectId),
      materialEntries: materialEntries.filter(isMelodicLoopImportableMaterialEntry).map((entry) => toMaterialImportEntrySummary(entry, inferMaterialEntrySourceBpm(entry, loopComposer.beatsPerBar || 4))),
      materialImportRequestNonce,
      materialFragmentPrepActive: materialFragmentGuideSnapshot !== null,
      hasWorkspacePackageContent,
    },
    melodicRefs: {
      clipComposerRef,
      composerOverviewRef,
      composerVerticalOverviewRef,
    },
    melodicActions: microtonalActionBoundaries.melodicActions,
    materialState: {
      materialName: materialExport.name,
      materialRole: materialExport.role,
      materialBpm: materialExport.bpm,
      materialBars: materialExport.bars,
      rootFollowPreferred: materialExport.rootFollowPreferred,
      busy,
      canUndo: historyRuntime.canUndo,
      canRedo: historyRuntime.canRedo,
      hasRawSourceAsset: Boolean(rawSourceAsset),
    },
    materialActions: microtonalActionBoundaries.materialActions,
  };

  const microtonalLogicWorkspaceProps = useCanonicalMicrotonalWorkspaceConfig(microtonalViewPanelRuntimeArgs);


  const archivePanelRuntimeArgs: WaveMaterialArchivePanelsProps = { activeWorkspace };

  return (
    <section ref={forgeRootRef} data-hotkey-scope="forge" className="space-y-4">
      <CanonicalForgeHeader {...headerRuntimeArgs} />
      <input
        ref={melodicWorkspaceImportInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => { void handleMelodicWorkspaceArchiveImportInput(event); }}
      />
      {activeWorkspace === 'microtonal-logic' && (
        <MicrotonalLogicWorkspace {...microtonalLogicWorkspaceProps} />
      )}

      <WaveMaterialArchivePanels {...archivePanelRuntimeArgs} />
    </section>
  );
}


