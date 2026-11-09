import type { MutableRefObject } from 'react';
import type { MicrotonalLogicWorkspaceMelodicProps } from './microtonalLogicWorkspaceProps';
import type { SelectedNotePreviewOptions } from './selectedNotePreviewContract';

export type CanonicalMicrotonalMelodicActionArgs = {
  mutateLoopComposer: MicrotonalLogicWorkspaceMelodicProps['onMutateLoopComposer'];
  setLoopTrackInstrumentPreset: MicrotonalLogicWorkspaceMelodicProps['onSetLoopTrackInstrumentPreset'];
  uploadMelodicSamples: MicrotonalLogicWorkspaceMelodicProps['onUploadMelodicSamples'];
  importSpectralSelectionAsMelodicSample: MicrotonalLogicWorkspaceMelodicProps['onImportSpectralSelectionAsMelodicSample'];
  deleteMelodicSample: MicrotonalLogicWorkspaceMelodicProps['onDeleteMelodicSample'];
  renameMelodicSample: MicrotonalLogicWorkspaceMelodicProps['onRenameMelodicSample'];
  updateMelodicSampleBaseHz: MicrotonalLogicWorkspaceMelodicProps['onUpdateMelodicSampleBaseHz'];
  previewMelodicSampleReferencePitch: MicrotonalLogicWorkspaceMelodicProps['onPreviewMelodicSampleReferencePitch'];
  setMelodicSampleTempoProfile: MicrotonalLogicWorkspaceMelodicProps['onSetMelodicSampleTempoProfile'];
  previewMelodicSampleTempoProfile: MicrotonalLogicWorkspaceMelodicProps['onPreviewMelodicSampleTempoProfile'];
  updateMelodicSampleEnvelope: MicrotonalLogicWorkspaceMelodicProps['onUpdateMelodicSampleEnvelope'];
  importMaterialEntryIntoMelodicLoop: MicrotonalLogicWorkspaceMelodicProps['onImportMaterialToMelodicLoop'];
  fragmentSelectedMaterialBaseNote: MicrotonalLogicWorkspaceMelodicProps['onFragmentMaterialBaseSelection'];
  loadMelodicProject: MicrotonalLogicWorkspaceMelodicProps['onLoadMelodicProject'];
  composeMelodicFromScratch: MicrotonalLogicWorkspaceMelodicProps['onComposeFromScratch'];
  saveMelodicProject: MicrotonalLogicWorkspaceMelodicProps['onSaveMelodicProject'];
  deleteMelodicProject: MicrotonalLogicWorkspaceMelodicProps['onDeleteMelodicProject'];
  exportMelodicWorkspaceArchive: () => void | Promise<void>;
  requestMelodicWorkspaceImport: MicrotonalLogicWorkspaceMelodicProps['onImportWorkspaceArchive'];
  toggleLoopTrackEnabled: MicrotonalLogicWorkspaceMelodicProps['onToggleTrackEnabled'];
  applyTrackPatternPreset: MicrotonalLogicWorkspaceMelodicProps['onApplyTrackPatternPreset'];
  resetTrackPattern: MicrotonalLogicWorkspaceMelodicProps['onResetTrackPattern'];
  onlyYouTrack: MicrotonalLogicWorkspaceMelodicProps['onOnlyYouTrack'];
  previewTrackInstrumentSelection: MicrotonalLogicWorkspaceMelodicProps['onPreviewTrackInstrumentSelection'];
  startEnabledTracksPreview: () => void | Promise<void>;
  startComposerPreviewMode: (mode: 'selected-note' | 'selected-track' | 'visible-tracks' | 'enabled-tracks', options?: SelectedNotePreviewOptions) => void | Promise<void>;
  stopAllForge2Preview: (status?: string) => void;
  setComposerHover: (value: { stepIndex: number | null; gridStep: number | null }) => void;
  setDenseOverlapWarning: (value: { stepId: string; gridStep: number; count: number } | null) => void;
  setShowChordGhost: (value: boolean) => void;
  setComposerCursor: (value: 'grab' | 'grabbing' | 'ew-resize' | 'crosshair') => void;
  composerDragRef: MutableRefObject<{ type?: string } | null>;
  setComposerSelectionBox: (value: any) => void;
  shiftPitchWindow: MicrotonalLogicWorkspaceMelodicProps['onShiftPitchWindow'];
  handleLoopBarsChange: MicrotonalLogicWorkspaceMelodicProps['onLoopBarsChange'];
  handleLoopSegmentCountChange: MicrotonalLogicWorkspaceMelodicProps['onLoopSegmentCountChange'];
  handleLoopComposerWheel: MicrotonalLogicWorkspaceMelodicProps['onLoopCanvasWheel'];
  handleLoopComposerDown: MicrotonalLogicWorkspaceMelodicProps['onLoopCanvasMouseDown'];
  handleLoopComposerMove: NonNullable<MicrotonalLogicWorkspaceMelodicProps['onLoopCanvasMouseMove']>;
  releaseComposerInteractions: () => void;
  handleLoopComposerContextMenu: MicrotonalLogicWorkspaceMelodicProps['onLoopCanvasContextMenu'];
  jumpComposerViewportToPointer: MicrotonalLogicWorkspaceMelodicProps['onJumpHorizontalOverview'];
  startComposerViewportDrag: MicrotonalLogicWorkspaceMelodicProps['onStartHorizontalOverviewDrag'];
  jumpComposerVerticalViewportToPointer: MicrotonalLogicWorkspaceMelodicProps['onJumpVerticalOverview'];
  startComposerVerticalViewportDrag: MicrotonalLogicWorkspaceMelodicProps['onStartVerticalOverviewDrag'];
  activeLoopPitchIndex: number;
  setAutoZoomOnDenseOverlap: MicrotonalLogicWorkspaceMelodicProps['onAutoZoomChange'];
  setLockTrackEditing: MicrotonalLogicWorkspaceMelodicProps['onLockTrackEditingChange'];
  setChordVoicing: MicrotonalLogicWorkspaceMelodicProps['onChordVoicingChange'];
  setChordStrumSteps: MicrotonalLogicWorkspaceMelodicProps['onChordStrumStepsChange'];
  setChordVelocitySlope: MicrotonalLogicWorkspaceMelodicProps['onChordVelocitySlopeChange'];
  freezeSelectedLoopNoteToSample: () => void | Promise<void>;
  createDefaultLoopTimeGuides: (bars: number, beatsPerBar: number, segmentCount: number) => any;
  syncLoopNoteToState: (draft: any, note: any) => any;
};

export function createCanonicalMelodicPreviewActions(
  args: CanonicalMicrotonalMelodicActionArgs,
): Pick<
  MicrotonalLogicWorkspaceMelodicProps,
  | 'onPreviewTrackInstrumentSelection'
  | 'onPreviewEnabledTracks'
  | 'onPreviewSelectedNote'
  | 'onStopEnabledTracksPreview'
> {
  return {
    onPreviewTrackInstrumentSelection: args.previewTrackInstrumentSelection,
    onPreviewEnabledTracks: () => void args.startEnabledTracksPreview(),
    onPreviewSelectedNote: (options) => void args.startComposerPreviewMode('selected-note', options),
    onStopEnabledTracksPreview: () =>
      args.stopAllForge2Preview('Vorschau der aktiven Instrumente gestoppt.'),
  };
}

export function createCanonicalMelodicCanvasActions(
  args: CanonicalMicrotonalMelodicActionArgs,
): Pick<
  MicrotonalLogicWorkspaceMelodicProps,
  | 'onSelectTrack'
  | 'onLoopCanvasMouseMove'
  | 'onLoopCanvasMouseUp'
  | 'onLoopCanvasMouseLeave'
> {
  return {
    onSelectTrack: (trackId) =>
      args.mutateLoopComposer(
        (draft: any) => {
          draft.selectedTrackId = trackId;
          draft.selectedNoteId =
            draft.notes.find((note: any) => note.trackId === trackId)?.id ?? null;
          if (!draft.activeTrackIds.includes(trackId)) {
            draft.activeTrackIds.push(trackId);
          }
        },
        undefined,
        { history: false },
      ),
    onLoopCanvasMouseMove: (event) => {
      if (args.composerDragRef.current) return;
      args.handleLoopComposerMove(event);
    },
    onLoopCanvasMouseUp: () => args.releaseComposerInteractions(),
    onLoopCanvasMouseLeave: () => {
      args.setComposerHover({ stepIndex: null, gridStep: null });
      args.setDenseOverlapWarning(null);
      args.setShowChordGhost(false);
      args.setComposerCursor('grab');
      if (args.composerDragRef.current?.type !== 'box-select') {
        args.setComposerSelectionBox(null);
      }
    },
  };
}

export function createCanonicalMelodicViewportActions(
  args: CanonicalMicrotonalMelodicActionArgs,
): Pick<
  MicrotonalLogicWorkspaceMelodicProps,
  | 'onJumpHorizontalOverview'
  | 'onStartHorizontalOverviewDrag'
  | 'onJumpVerticalOverview'
  | 'onStartVerticalOverviewDrag'
  | 'onResetVerticalOverview'
  | 'onResetLoopZoom'
  | 'onZoomXChange'
  | 'onScrollXChange'
  | 'onZoomYChange'
  | 'onScrollYChange'
> {
  return {
    onJumpHorizontalOverview: args.jumpComposerViewportToPointer,
    onStartHorizontalOverviewDrag: args.startComposerViewportDrag,
    onJumpVerticalOverview: args.jumpComposerVerticalViewportToPointer,
    onStartVerticalOverviewDrag: args.startComposerVerticalViewportDrag,
    onResetVerticalOverview: () =>
      args.mutateLoopComposer(
        (draft: any) => {
          draft.zoomY = 1;
          draft.scrollY = 0;
        },
        undefined,
        { history: false },
      ),
    onResetLoopZoom: () =>
      args.mutateLoopComposer(
        (draft: any) => {
          draft.zoom = 1;
          draft.scrollX = 0;
          draft.zoomY = 1;
          draft.scrollY = 0;
        },
        undefined,
        { history: false },
      ),
    onZoomXChange: (value) =>
      args.mutateLoopComposer((draft: any) => {
        draft.zoom = value;
      }, undefined, { history: false }),
    onScrollXChange: (value) =>
      args.mutateLoopComposer((draft: any) => {
        draft.scrollX = value;
      }, undefined, { history: false }),
    onZoomYChange: (value) =>
      args.mutateLoopComposer((draft: any) => {
        draft.zoomY = value;
      }, undefined, { history: false }),
    onScrollYChange: (value) =>
      args.mutateLoopComposer((draft: any) => {
        draft.scrollY = value;
      }, undefined, { history: false }),
  };
}

export function createCanonicalMelodicPitchActions(
  args: CanonicalMicrotonalMelodicActionArgs,
): Pick<
  MicrotonalLogicWorkspaceMelodicProps,
  | 'onActivePitchOffsetChange'
  | 'onResetActivePitchOffset'
  | 'onBeatsPerBarChange'
  | 'onAutoZoomChange'
  | 'onLockTrackEditingChange'
  | 'onChordVoicingChange'
  | 'onChordStrumStepsChange'
  | 'onChordVelocitySlopeChange'
  | 'onFreezeSelectedNoteToSample'
> {
  return {
    onActivePitchOffsetChange: (cents) =>
      args.mutateLoopComposer(
        (draft: any) => {
          const step = draft.pitchSteps[args.activeLoopPitchIndex];
          const line = draft.pitchLines[args.activeLoopPitchIndex];
          if (step) step.offsetCents = cents;
          if (line) line.offsetCents = cents;
        },
        undefined,
        { history: false },
      ),
    onResetActivePitchOffset: () =>
      args.mutateLoopComposer((draft: any) => {
        const step = draft.pitchSteps[args.activeLoopPitchIndex];
        const line = draft.pitchLines[args.activeLoopPitchIndex];
        if (step) step.offsetCents = 0;
        if (line) line.offsetCents = 0;
      }),
    onBeatsPerBarChange: (value) =>
      args.mutateLoopComposer((draft: any) => {
        draft.beatsPerBar = value;
        draft.timeGuideMarkers = args.createDefaultLoopTimeGuides(
          draft.bars,
          draft.beatsPerBar,
          draft.segmentCount,
        );
        draft.notes = draft.notes.map((note: any) =>
          args.syncLoopNoteToState(draft, { ...note }),
        );
      }),
    onAutoZoomChange: args.setAutoZoomOnDenseOverlap,
    onLockTrackEditingChange: args.setLockTrackEditing,
    onChordVoicingChange: args.setChordVoicing,
    onChordStrumStepsChange: args.setChordStrumSteps,
    onChordVelocitySlopeChange: args.setChordVelocitySlope,
    onFreezeSelectedNoteToSample: () => void args.freezeSelectedLoopNoteToSample(),
  };
}
