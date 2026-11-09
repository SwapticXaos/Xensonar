import type { MicrotonalLogicWorkspaceProps } from './microtonalLogicWorkspace';

export type MicrotonalLogicWorkspaceHeaderProps = Pick<MicrotonalLogicWorkspaceProps,
  | 'logicView'
  | 'currentDrumPatternLabel'
  | 'currentDrumKitLabel'
  | 'currentMelodicPresetLabel'
>;

export type MicrotonalLogicWorkspaceDrumProps = Pick<MicrotonalLogicWorkspaceProps,
  | 'drumPatternOptions'
  | 'drumKitOptions'
  | 'drumPatternValue'
  | 'drumKitValue'
  | 'drumBarsValue'
  | 'drumSegmentsPerBarValue'
  | 'drumGridModeLabel'
  | 'drumHitCount'
  | 'drumStepCount'
  | 'drumViewport'
  | 'drumVisiblePercent'
  | 'drumCanvasWidth'
  | 'drumViewportWrapperRef'
  | 'drumCanvasRef'
  | 'drumNavigatorRef'
  | 'drumNavigatorHitRatios'
  | 'selectedDrumLaneId'
  | 'drumLaneKitOverrides'
  | 'drumLaneSettings'
  | 'onDrumPatternChange'
  | 'onSelectDrumLane'
  | 'onDrumKitChange'
  | 'onDrumLaneKitChange'
  | 'onDrumLaneLevelChange'
  | 'onDrumLaneDecayChange'
  | 'onDrumLanePanChange'
  | 'onDrumLaneChokeGroupChange'
  | 'onDrumBarsChange'
  | 'onDrumSegmentsPerBarChange'
  | 'onResetDrumToPreset'
  | 'onRandomizeDrum'
  | 'onClearDrum'
  | 'onPreviewDrum'
  | 'onStopDrumPreview'
  | 'onSendDrumToXensonar'
  | 'onDrumCanvasMouseDown'
  | 'onStartDrumNavigatorDrag'
  | 'onResetDrumViewport'
>;

export type MicrotonalLogicWorkspaceMelodicProps = Pick<MicrotonalLogicWorkspaceProps,
  | 'loopComposer'
  | 'bassPatternOptions'
  | 'activeLoopPitchIndex'
  | 'activeLoopPitchStep'
  | 'melodicPreviewNotes'
  | 'autoZoomOnDenseOverlap'
  | 'lockTrackEditing'
  | 'chordVoicing'
  | 'chordStrumSteps'
  | 'chordVelocitySlope'
  | 'composerCursor'
  | 'clipComposerRef'
  | 'composerOverviewRef'
  | 'composerVerticalOverviewRef'
  | 'onMutateLoopComposer'
  | 'onSetLoopTrackInstrumentPreset'
  | 'melodicInstrumentOptionGroups'
  | 'melodicSampleEntries'
  | 'onUploadMelodicSamples'
  | 'onImportSpectralSelectionAsMelodicSample'
  | 'canImportSpectralSelectionAsMelodicSample'
  | 'onDeleteMelodicSample'
  | 'onRenameMelodicSample'
  | 'onUpdateMelodicSampleBaseHz'
  | 'onPreviewMelodicSampleReferencePitch'
  | 'onSetMelodicSampleTempoProfile'
  | 'onPreviewMelodicSampleTempoProfile'
  | 'onUpdateMelodicSampleEnvelope'
  | 'melodicProjectChoices'
  | 'selectedMelodicProjectId'
  | 'canDeleteMelodicProject'
  | 'materialEntries'
  | 'materialImportRequestNonce'
  | 'onImportMaterialToMelodicLoop'
  | 'onFragmentMaterialBaseSelection'
  | 'materialFragmentPrepActive'
  | 'onLoadMelodicProject'
  | 'onComposeFromScratch'
  | 'onSaveMelodicProject'
  | 'onDeleteMelodicProject'
  | 'onExportWorkspaceArchive'
  | 'onImportWorkspaceArchive'
  | 'hasWorkspacePackageContent'
  | 'onToggleTrackEnabled'
  | 'onApplyTrackPatternPreset'
  | 'onResetTrackPattern'
  | 'onOnlyYouTrack'
  | 'onPreviewTrackInstrumentSelection'
  | 'onPreviewEnabledTracks'
  | 'onStopEnabledTracksPreview'
  | 'onSelectTrack'
  | 'onShiftPitchWindow'
  | 'onLoopBarsChange'
  | 'onLoopSegmentCountChange'
  | 'onLoopCanvasWheel'
  | 'onLoopCanvasMouseDown'
  | 'onLoopCanvasMouseMove'
  | 'onLoopCanvasMouseUp'
  | 'onLoopCanvasMouseLeave'
  | 'onLoopCanvasContextMenu'
  | 'onJumpHorizontalOverview'
  | 'onStartHorizontalOverviewDrag'
  | 'onJumpVerticalOverview'
  | 'onStartVerticalOverviewDrag'
  | 'onResetVerticalOverview'
  | 'onActivePitchOffsetChange'
  | 'onResetActivePitchOffset'
  | 'onZoomXChange'
  | 'onScrollXChange'
  | 'onZoomYChange'
  | 'onScrollYChange'
  | 'onBeatsPerBarChange'
  | 'onResetLoopZoom'
  | 'onAutoZoomChange'
  | 'onLockTrackEditingChange'
  | 'onChordVoicingChange'
  | 'onChordStrumStepsChange'
  | 'onChordVelocitySlopeChange'
  | 'onFreezeSelectedNoteToSample'
  | 'onPreviewSelectedNote'
>;

export type MicrotonalLogicWorkspaceMaterialProps = Pick<MicrotonalLogicWorkspaceProps,
  | 'materialName'
  | 'materialRole'
  | 'materialBpm'
  | 'materialBars'
  | 'rootFollowPreferred'
  | 'busy'
  | 'canUndo'
  | 'canRedo'
  | 'hasRawSourceAsset'
  | 'onMaterialNameChange'
  | 'onMaterialRoleChange'
  | 'onMaterialBpmChange'
  | 'onMaterialBarsChange'
  | 'onRootFollowPreferredChange'
  | 'onUndo'
  | 'onRedo'
  | 'onStartMaterialGroovePreview'
  | 'onSendMelodicLoopToXensonar'
  | 'onSendToSpectralForge'
  | 'onSendDirectSourceToXensonar'
>;

export function buildCanonicalMicrotonalDrumProps(args: {
  state: {
    drumPatternOptions: MicrotonalLogicWorkspaceDrumProps['drumPatternOptions'];
    drumKitOptions: MicrotonalLogicWorkspaceDrumProps['drumKitOptions'];
    drumPatternValue: MicrotonalLogicWorkspaceDrumProps['drumPatternValue'];
    drumKitValue: MicrotonalLogicWorkspaceDrumProps['drumKitValue'];
    drumBarsValue: MicrotonalLogicWorkspaceDrumProps['drumBarsValue'];
    drumSegmentsPerBarValue: MicrotonalLogicWorkspaceDrumProps['drumSegmentsPerBarValue'];
    drumGridModeLabel: MicrotonalLogicWorkspaceDrumProps['drumGridModeLabel'];
    drumHitCount: MicrotonalLogicWorkspaceDrumProps['drumHitCount'];
    drumStepCount: MicrotonalLogicWorkspaceDrumProps['drumStepCount'];
    drumViewport: MicrotonalLogicWorkspaceDrumProps['drumViewport'];
    drumVisiblePercent: MicrotonalLogicWorkspaceDrumProps['drumVisiblePercent'];
    drumCanvasWidth: MicrotonalLogicWorkspaceDrumProps['drumCanvasWidth'];
    selectedDrumLaneId: MicrotonalLogicWorkspaceDrumProps['selectedDrumLaneId'];
    drumLaneKitOverrides: MicrotonalLogicWorkspaceDrumProps['drumLaneKitOverrides'];
    drumLaneSettings: MicrotonalLogicWorkspaceDrumProps['drumLaneSettings'];
  };
  refs: {
    drumViewportWrapperRef: MicrotonalLogicWorkspaceDrumProps['drumViewportWrapperRef'];
    drumCanvasRef: MicrotonalLogicWorkspaceDrumProps['drumCanvasRef'];
    drumNavigatorRef: MicrotonalLogicWorkspaceDrumProps['drumNavigatorRef'];
    drumNavigatorHitRatios: MicrotonalLogicWorkspaceDrumProps['drumNavigatorHitRatios'];
  };
  actions: {
    onDrumPatternChange: MicrotonalLogicWorkspaceDrumProps['onDrumPatternChange'];
    onSelectDrumLane: MicrotonalLogicWorkspaceDrumProps['onSelectDrumLane'];
    onDrumKitChange: MicrotonalLogicWorkspaceDrumProps['onDrumKitChange'];
    onDrumLaneKitChange: MicrotonalLogicWorkspaceDrumProps['onDrumLaneKitChange'];
    onDrumLaneLevelChange: MicrotonalLogicWorkspaceDrumProps['onDrumLaneLevelChange'];
    onDrumLaneDecayChange: MicrotonalLogicWorkspaceDrumProps['onDrumLaneDecayChange'];
    onDrumLanePanChange: MicrotonalLogicWorkspaceDrumProps['onDrumLanePanChange'];
    onDrumLaneChokeGroupChange: MicrotonalLogicWorkspaceDrumProps['onDrumLaneChokeGroupChange'];
    onDrumBarsChange: MicrotonalLogicWorkspaceDrumProps['onDrumBarsChange'];
    onDrumSegmentsPerBarChange: MicrotonalLogicWorkspaceDrumProps['onDrumSegmentsPerBarChange'];
    onResetDrumToPreset: MicrotonalLogicWorkspaceDrumProps['onResetDrumToPreset'];
    onRandomizeDrum: MicrotonalLogicWorkspaceDrumProps['onRandomizeDrum'];
    onClearDrum: MicrotonalLogicWorkspaceDrumProps['onClearDrum'];
    onPreviewDrum: MicrotonalLogicWorkspaceDrumProps['onPreviewDrum'];
    onStopDrumPreview: MicrotonalLogicWorkspaceDrumProps['onStopDrumPreview'];
    onSendDrumToXensonar: MicrotonalLogicWorkspaceDrumProps['onSendDrumToXensonar'];
    onDrumCanvasMouseDown: MicrotonalLogicWorkspaceDrumProps['onDrumCanvasMouseDown'];
    onStartDrumNavigatorDrag: MicrotonalLogicWorkspaceDrumProps['onStartDrumNavigatorDrag'];
    onResetDrumViewport: MicrotonalLogicWorkspaceDrumProps['onResetDrumViewport'];
  };
}): MicrotonalLogicWorkspaceDrumProps {
  return {
    ...args.state,
    ...args.refs,
    ...args.actions,
  };
}

export function buildCanonicalMicrotonalMelodicProps(args: {
  state: {
    loopComposer: MicrotonalLogicWorkspaceMelodicProps['loopComposer'];
    bassPatternOptions: MicrotonalLogicWorkspaceMelodicProps['bassPatternOptions'];
    activeLoopPitchIndex: MicrotonalLogicWorkspaceMelodicProps['activeLoopPitchIndex'];
    activeLoopPitchStep: MicrotonalLogicWorkspaceMelodicProps['activeLoopPitchStep'];
    melodicPreviewNotes: MicrotonalLogicWorkspaceMelodicProps['melodicPreviewNotes'];
    autoZoomOnDenseOverlap: MicrotonalLogicWorkspaceMelodicProps['autoZoomOnDenseOverlap'];
    lockTrackEditing: MicrotonalLogicWorkspaceMelodicProps['lockTrackEditing'];
    chordVoicing: MicrotonalLogicWorkspaceMelodicProps['chordVoicing'];
    chordStrumSteps: MicrotonalLogicWorkspaceMelodicProps['chordStrumSteps'];
    chordVelocitySlope: MicrotonalLogicWorkspaceMelodicProps['chordVelocitySlope'];
    composerCursor: MicrotonalLogicWorkspaceMelodicProps['composerCursor'];
    melodicInstrumentOptionGroups: MicrotonalLogicWorkspaceMelodicProps['melodicInstrumentOptionGroups'];
    melodicSampleEntries: MicrotonalLogicWorkspaceMelodicProps['melodicSampleEntries'];
    canImportSpectralSelectionAsMelodicSample: MicrotonalLogicWorkspaceMelodicProps['canImportSpectralSelectionAsMelodicSample'];
    melodicProjectChoices: MicrotonalLogicWorkspaceMelodicProps['melodicProjectChoices'];
    selectedMelodicProjectId: MicrotonalLogicWorkspaceMelodicProps['selectedMelodicProjectId'];
    canDeleteMelodicProject: MicrotonalLogicWorkspaceMelodicProps['canDeleteMelodicProject'];
    materialEntries: MicrotonalLogicWorkspaceMelodicProps['materialEntries'];
    materialImportRequestNonce: MicrotonalLogicWorkspaceMelodicProps['materialImportRequestNonce'];
    materialFragmentPrepActive: MicrotonalLogicWorkspaceMelodicProps['materialFragmentPrepActive'];
    hasWorkspacePackageContent: MicrotonalLogicWorkspaceMelodicProps['hasWorkspacePackageContent'];
  };
  refs: {
    clipComposerRef: MicrotonalLogicWorkspaceMelodicProps['clipComposerRef'];
    composerOverviewRef: MicrotonalLogicWorkspaceMelodicProps['composerOverviewRef'];
    composerVerticalOverviewRef: MicrotonalLogicWorkspaceMelodicProps['composerVerticalOverviewRef'];
  };
  actions: {
    onMutateLoopComposer: MicrotonalLogicWorkspaceMelodicProps['onMutateLoopComposer'];
    onSetLoopTrackInstrumentPreset: MicrotonalLogicWorkspaceMelodicProps['onSetLoopTrackInstrumentPreset'];
    onUploadMelodicSamples: MicrotonalLogicWorkspaceMelodicProps['onUploadMelodicSamples'];
    onImportSpectralSelectionAsMelodicSample: MicrotonalLogicWorkspaceMelodicProps['onImportSpectralSelectionAsMelodicSample'];
    onDeleteMelodicSample: MicrotonalLogicWorkspaceMelodicProps['onDeleteMelodicSample'];
    onRenameMelodicSample: MicrotonalLogicWorkspaceMelodicProps['onRenameMelodicSample'];
    onUpdateMelodicSampleBaseHz: MicrotonalLogicWorkspaceMelodicProps['onUpdateMelodicSampleBaseHz'];
    onPreviewMelodicSampleReferencePitch: MicrotonalLogicWorkspaceMelodicProps['onPreviewMelodicSampleReferencePitch'];
    onSetMelodicSampleTempoProfile: MicrotonalLogicWorkspaceMelodicProps['onSetMelodicSampleTempoProfile'];
    onPreviewMelodicSampleTempoProfile: MicrotonalLogicWorkspaceMelodicProps['onPreviewMelodicSampleTempoProfile'];
    onUpdateMelodicSampleEnvelope: MicrotonalLogicWorkspaceMelodicProps['onUpdateMelodicSampleEnvelope'];
    onImportMaterialToMelodicLoop: MicrotonalLogicWorkspaceMelodicProps['onImportMaterialToMelodicLoop'];
    onFragmentMaterialBaseSelection: MicrotonalLogicWorkspaceMelodicProps['onFragmentMaterialBaseSelection'];
    onLoadMelodicProject: MicrotonalLogicWorkspaceMelodicProps['onLoadMelodicProject'];
    onComposeFromScratch: MicrotonalLogicWorkspaceMelodicProps['onComposeFromScratch'];
    onSaveMelodicProject: MicrotonalLogicWorkspaceMelodicProps['onSaveMelodicProject'];
    onDeleteMelodicProject: MicrotonalLogicWorkspaceMelodicProps['onDeleteMelodicProject'];
    onExportWorkspaceArchive: MicrotonalLogicWorkspaceMelodicProps['onExportWorkspaceArchive'];
    onImportWorkspaceArchive: MicrotonalLogicWorkspaceMelodicProps['onImportWorkspaceArchive'];
    onToggleTrackEnabled: MicrotonalLogicWorkspaceMelodicProps['onToggleTrackEnabled'];
    onApplyTrackPatternPreset: MicrotonalLogicWorkspaceMelodicProps['onApplyTrackPatternPreset'];
    onResetTrackPattern: MicrotonalLogicWorkspaceMelodicProps['onResetTrackPattern'];
    onOnlyYouTrack: MicrotonalLogicWorkspaceMelodicProps['onOnlyYouTrack'];
    onPreviewTrackInstrumentSelection: MicrotonalLogicWorkspaceMelodicProps['onPreviewTrackInstrumentSelection'];
    onPreviewEnabledTracks: MicrotonalLogicWorkspaceMelodicProps['onPreviewEnabledTracks'];
    onPreviewSelectedNote: MicrotonalLogicWorkspaceMelodicProps['onPreviewSelectedNote'];
    onStopEnabledTracksPreview: MicrotonalLogicWorkspaceMelodicProps['onStopEnabledTracksPreview'];
    onSelectTrack: MicrotonalLogicWorkspaceMelodicProps['onSelectTrack'];
    onShiftPitchWindow: MicrotonalLogicWorkspaceMelodicProps['onShiftPitchWindow'];
    onLoopBarsChange: MicrotonalLogicWorkspaceMelodicProps['onLoopBarsChange'];
    onLoopSegmentCountChange: MicrotonalLogicWorkspaceMelodicProps['onLoopSegmentCountChange'];
    onLoopCanvasWheel: MicrotonalLogicWorkspaceMelodicProps['onLoopCanvasWheel'];
    onLoopCanvasMouseDown: MicrotonalLogicWorkspaceMelodicProps['onLoopCanvasMouseDown'];
    onLoopCanvasMouseMove: MicrotonalLogicWorkspaceMelodicProps['onLoopCanvasMouseMove'];
    onLoopCanvasMouseUp: MicrotonalLogicWorkspaceMelodicProps['onLoopCanvasMouseUp'];
    onLoopCanvasMouseLeave: MicrotonalLogicWorkspaceMelodicProps['onLoopCanvasMouseLeave'];
    onLoopCanvasContextMenu: MicrotonalLogicWorkspaceMelodicProps['onLoopCanvasContextMenu'];
    onJumpHorizontalOverview: MicrotonalLogicWorkspaceMelodicProps['onJumpHorizontalOverview'];
    onStartHorizontalOverviewDrag: MicrotonalLogicWorkspaceMelodicProps['onStartHorizontalOverviewDrag'];
    onJumpVerticalOverview: MicrotonalLogicWorkspaceMelodicProps['onJumpVerticalOverview'];
    onStartVerticalOverviewDrag: MicrotonalLogicWorkspaceMelodicProps['onStartVerticalOverviewDrag'];
    onResetVerticalOverview: MicrotonalLogicWorkspaceMelodicProps['onResetVerticalOverview'];
    onActivePitchOffsetChange: MicrotonalLogicWorkspaceMelodicProps['onActivePitchOffsetChange'];
    onResetActivePitchOffset: MicrotonalLogicWorkspaceMelodicProps['onResetActivePitchOffset'];
    onZoomXChange: MicrotonalLogicWorkspaceMelodicProps['onZoomXChange'];
    onScrollXChange: MicrotonalLogicWorkspaceMelodicProps['onScrollXChange'];
    onZoomYChange: MicrotonalLogicWorkspaceMelodicProps['onZoomYChange'];
    onScrollYChange: MicrotonalLogicWorkspaceMelodicProps['onScrollYChange'];
    onBeatsPerBarChange: MicrotonalLogicWorkspaceMelodicProps['onBeatsPerBarChange'];
    onResetLoopZoom: MicrotonalLogicWorkspaceMelodicProps['onResetLoopZoom'];
    onAutoZoomChange: MicrotonalLogicWorkspaceMelodicProps['onAutoZoomChange'];
    onLockTrackEditingChange: MicrotonalLogicWorkspaceMelodicProps['onLockTrackEditingChange'];
    onChordVoicingChange: MicrotonalLogicWorkspaceMelodicProps['onChordVoicingChange'];
    onChordStrumStepsChange: MicrotonalLogicWorkspaceMelodicProps['onChordStrumStepsChange'];
    onChordVelocitySlopeChange: MicrotonalLogicWorkspaceMelodicProps['onChordVelocitySlopeChange'];
    onFreezeSelectedNoteToSample: MicrotonalLogicWorkspaceMelodicProps['onFreezeSelectedNoteToSample'];
  };
}): MicrotonalLogicWorkspaceMelodicProps {
  return {
    ...args.state,
    ...args.refs,
    ...args.actions,
  };
}

export function buildCanonicalMicrotonalMaterialProps(args: {
  state: {
    materialName: MicrotonalLogicWorkspaceMaterialProps['materialName'];
    materialRole: MicrotonalLogicWorkspaceMaterialProps['materialRole'];
    materialBpm: MicrotonalLogicWorkspaceMaterialProps['materialBpm'];
    materialBars: MicrotonalLogicWorkspaceMaterialProps['materialBars'];
    rootFollowPreferred: MicrotonalLogicWorkspaceMaterialProps['rootFollowPreferred'];
    busy: MicrotonalLogicWorkspaceMaterialProps['busy'];
    canUndo: MicrotonalLogicWorkspaceMaterialProps['canUndo'];
    canRedo: MicrotonalLogicWorkspaceMaterialProps['canRedo'];
    hasRawSourceAsset: MicrotonalLogicWorkspaceMaterialProps['hasRawSourceAsset'];
  };
  actions: {
    onMaterialNameChange: MicrotonalLogicWorkspaceMaterialProps['onMaterialNameChange'];
    onMaterialRoleChange: MicrotonalLogicWorkspaceMaterialProps['onMaterialRoleChange'];
    onMaterialBpmChange: MicrotonalLogicWorkspaceMaterialProps['onMaterialBpmChange'];
    onMaterialBarsChange: MicrotonalLogicWorkspaceMaterialProps['onMaterialBarsChange'];
    onRootFollowPreferredChange: MicrotonalLogicWorkspaceMaterialProps['onRootFollowPreferredChange'];
    onUndo: MicrotonalLogicWorkspaceMaterialProps['onUndo'];
    onRedo: MicrotonalLogicWorkspaceMaterialProps['onRedo'];
    onStartMaterialGroovePreview: MicrotonalLogicWorkspaceMaterialProps['onStartMaterialGroovePreview'];
    onSendMelodicLoopToXensonar: MicrotonalLogicWorkspaceMaterialProps['onSendMelodicLoopToXensonar'];
    onSendToSpectralForge: MicrotonalLogicWorkspaceMaterialProps['onSendToSpectralForge'];
    onSendDirectSourceToXensonar: MicrotonalLogicWorkspaceMaterialProps['onSendDirectSourceToXensonar'];
  };
}): MicrotonalLogicWorkspaceMaterialProps {
  return {
    ...args.state,
    ...args.actions,
  };
}

export function composeMicrotonalLogicWorkspaceProps(args: {
  header: MicrotonalLogicWorkspaceHeaderProps;
  drum: MicrotonalLogicWorkspaceDrumProps;
  melodic: MicrotonalLogicWorkspaceMelodicProps;
  material: MicrotonalLogicWorkspaceMaterialProps;
}): MicrotonalLogicWorkspaceProps {
  return {
    ...args.header,
    ...args.drum,
    ...args.melodic,
    ...args.material,
  };
}
