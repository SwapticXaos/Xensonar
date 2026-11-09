import { useEffect } from 'react';
import { setCanonicalForgeSession } from './session';
import { cloneStampData } from './spectralWorkspaceUtils';
import { cloneDrumComputerState, cloneGrooveMachineConfig, cloneLoopComposerState } from './loopDrumDomain';
import type { CanonicalForgeWorkspaceSnapshotContract } from './canonicalForgeWorkspaceSnapshotContract';

export function useCanonicalForgeSessionSync(args: {
  forgeRootRef: { current: HTMLElement | null };
  forgeHotkeyScopeActiveRef: { current: boolean };
  snapshot: CanonicalForgeWorkspaceSnapshotContract;
}): void {
  const { forgeRootRef, forgeHotkeyScopeActiveRef, snapshot } = args;
  const {
    materialExport,
    rawSourceAsset,
    sourceAsset,
    bundle,
    spectralData,
    sourceView,
    secondaryView,
    viewBlend,
    activeTool,
    toolSettings,
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
  } = snapshot;

  useEffect(() => {
    setCanonicalForgeSession({
      materialExport: { ...materialExport, guideMarkers: [...materialExport.guideMarkers] },
      rawSourceAsset,
      sourceAsset,
      bundle,
      spectralSnapshot: spectralData.cloneData(),
      sourceView,
      secondaryView,
      viewBlend,
      activeTool,
      toolSettings: { ...toolSettings },
      synthMode,
      waveformMix: { ...waveformMix },
      status,
      stampPresetId,
      stampData: cloneStampData(stampData),
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
      grooveMachine: cloneGrooveMachineConfig(grooveMachine),
      drumComputer: cloneDrumComputerState(drumComputer),
      drumViewport: { ...safeDrumViewport },
      loopComposer: cloneLoopComposerState(loopComposer),
      selectedLoopNoteIds: [...selectedLoopNoteIds],
      autoZoomOnDenseOverlap,
      lockTrackEditing,
      chordVoicing,
      chordStrumSteps,
      chordVelocitySlope,
    });
  }, [
    materialExport,
    rawSourceAsset,
    sourceAsset,
    bundle,
    spectralData,
    sourceView,
    secondaryView,
    viewBlend,
    activeTool,
    toolSettings,
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
  ]);

  useEffect(() => {
    const syncHotkeyScope = (target: EventTarget | null) => {
      const root = forgeRootRef.current;
      const el = target as Node | null;
      forgeHotkeyScopeActiveRef.current = !!root && !!el && root.contains(el);
    };
    const handlePointerDown = (event: PointerEvent) => syncHotkeyScope(event.target);
    const handleFocusIn = (event: FocusEvent) => syncHotkeyScope(event.target);
    const handleFocusOut = () => {
      const root = forgeRootRef.current;
      const active = document.activeElement as Node | null;
      forgeHotkeyScopeActiveRef.current = !!root && !!active && root.contains(active);
    };
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('focusin', handleFocusIn, true);
    window.addEventListener('focusout', handleFocusOut, true);
    return () => {
      forgeHotkeyScopeActiveRef.current = false;
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('focusin', handleFocusIn, true);
      window.removeEventListener('focusout', handleFocusOut, true);
    };
  }, [forgeRootRef, forgeHotkeyScopeActiveRef]);
}
