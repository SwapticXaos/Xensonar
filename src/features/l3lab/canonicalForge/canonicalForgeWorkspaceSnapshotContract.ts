import type { CanonicalForgeSessionState } from './sessionTypes';
import type { BuildCanonicalForgeProjectSnapshotArgs } from './workspaceLibraryActions';

export type CanonicalForgeWorkspaceSnapshotContract = BuildCanonicalForgeProjectSnapshotArgs & {
  rawSourceAsset: CanonicalForgeSessionState['rawSourceAsset'];
  bundle: CanonicalForgeSessionState['bundle'];
  status: CanonicalForgeSessionState['status'];
  safeDrumViewport: NonNullable<CanonicalForgeSessionState['drumViewport']>;
};

export function buildCanonicalForgeWorkspaceSnapshotContract(
  snapshot: CanonicalForgeWorkspaceSnapshotContract,
): CanonicalForgeWorkspaceSnapshotContract {
  return snapshot;
}

export function buildCanonicalForgeProjectSnapshotArgs(
  snapshot: CanonicalForgeWorkspaceSnapshotContract,
): BuildCanonicalForgeProjectSnapshotArgs {
  return {
    materialExport: snapshot.materialExport,
    sourceAsset: snapshot.sourceAsset,
    spectralData: snapshot.spectralData,
    sourceView: snapshot.sourceView,
    secondaryView: snapshot.secondaryView,
    viewBlend: snapshot.viewBlend,
    activeTool: snapshot.activeTool,
    toolSettings: snapshot.toolSettings,
    synthMode: snapshot.synthMode,
    waveformMix: snapshot.waveformMix,
    stampPresetId: snapshot.stampPresetId,
    stampData: snapshot.stampData,
    stampScaleX: snapshot.stampScaleX,
    stampScaleY: snapshot.stampScaleY,
    stampRotation: snapshot.stampRotation,
    stampFlipX: snapshot.stampFlipX,
    stampFlipY: snapshot.stampFlipY,
    selectionStartSec: snapshot.selectionStartSec,
    selectionDurationSec: snapshot.selectionDurationSec,
    selectionDirty: snapshot.selectionDirty,
    detailSelectionStartSec: snapshot.detailSelectionStartSec,
    detailSelectionDurationSec: snapshot.detailSelectionDurationSec,
    detailSelectionDirty: snapshot.detailSelectionDirty,
    detailViewportStartSec: snapshot.detailViewportStartSec,
    detailViewportDurationSec: snapshot.detailViewportDurationSec,
    detailZoom: snapshot.detailZoom,
    detailOffset: snapshot.detailOffset,
    auditionView: snapshot.auditionView,
    auditionBlendAmount: snapshot.auditionBlendAmount,
    selectedProjectId: snapshot.selectedProjectId,
    sourcePreviewMode: snapshot.sourcePreviewMode,
    activeWorkspace: snapshot.activeWorkspace,
    logicView: snapshot.logicView,
    grooveMachine: snapshot.grooveMachine,
    drumComputer: snapshot.drumComputer,
    loopComposer: snapshot.loopComposer,
    selectedLoopNoteIds: snapshot.selectedLoopNoteIds,
    autoZoomOnDenseOverlap: snapshot.autoZoomOnDenseOverlap,
    lockTrackEditing: snapshot.lockTrackEditing,
    chordVoicing: snapshot.chordVoicing,
    chordStrumSteps: snapshot.chordStrumSteps,
    chordVelocitySlope: snapshot.chordVelocitySlope,
  };
}
