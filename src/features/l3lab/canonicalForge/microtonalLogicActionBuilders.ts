import type { Dispatch, SetStateAction } from 'react';
import type { MaterialExportConfig } from './canonicalForgeRoomContracts';
import type { GrooveMachineConfig } from './loopDrumDomain';
import { sanitizeDrumKit, withDrumLaneKitOverride } from '../../xensonar/groove/drumKitRouting';
import type {
  MicrotonalLogicWorkspaceDrumProps,
  MicrotonalLogicWorkspaceMaterialProps,
  MicrotonalLogicWorkspaceMelodicProps,
} from './microtonalLogicWorkspaceProps';
import {
  createCanonicalMelodicCanvasActions,
  createCanonicalMelodicPitchActions,
  createCanonicalMelodicPreviewActions,
  createCanonicalMelodicViewportActions,
  type CanonicalMicrotonalMelodicActionArgs,
} from './microtonalMelodicActionSurface';

export type CanonicalMicrotonalDrumActionArgs = {
  showPresetDrumPattern: MicrotonalLogicWorkspaceDrumProps['onDrumPatternChange'];
  setSelectedDrumLaneId: Dispatch<SetStateAction<MicrotonalLogicWorkspaceDrumProps['selectedDrumLaneId']>>;
  setGrooveMachine: Dispatch<SetStateAction<GrooveMachineConfig>>;
  handleDrumBarsChange: MicrotonalLogicWorkspaceDrumProps['onDrumBarsChange'];
  handleDrumSegmentsChange: MicrotonalLogicWorkspaceDrumProps['onDrumSegmentsPerBarChange'];
  resetDrumComputerToPreset: MicrotonalLogicWorkspaceDrumProps['onResetDrumToPreset'];
  randomizeDrumComputer: MicrotonalLogicWorkspaceDrumProps['onRandomizeDrum'];
  clearDrumComputer: MicrotonalLogicWorkspaceDrumProps['onClearDrum'];
  startDrumPreview: (mode: 'none') => void | Promise<void>;
  stopAllForge2Preview: (status?: string) => void;
  exportDrumComputerToXensonar: () => void | Promise<void>;
  handleDrumComputerDown: MicrotonalLogicWorkspaceDrumProps['onDrumCanvasMouseDown'];
  startDrumNavigatorDrag: MicrotonalLogicWorkspaceDrumProps['onStartDrumNavigatorDrag'];
  setDrumViewport: Dispatch<SetStateAction<{ startRatio: number; endRatio: number }>>;
};

export function createCanonicalMicrotonalDrumActions(args: CanonicalMicrotonalDrumActionArgs): Pick<MicrotonalLogicWorkspaceDrumProps,
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
> {
  return {
    onDrumPatternChange: args.showPresetDrumPattern,
    onSelectDrumLane: args.setSelectedDrumLaneId,
    onDrumKitChange: (value) => args.setGrooveMachine((s) => ({ ...s, drumKit: sanitizeDrumKit(value) })),
    onDrumLaneKitChange: (laneId, value) => args.setGrooveMachine((state) => ({ ...state, drumLaneKitOverrides: withDrumLaneKitOverride(state.drumLaneKitOverrides, laneId, value) })),
    onDrumLaneLevelChange: (laneId, value) => args.setGrooveMachine((state) => ({ ...state, drumLaneSettings: { ...state.drumLaneSettings, [laneId]: { ...state.drumLaneSettings[laneId], level: value } } })),
    onDrumLaneDecayChange: (laneId, value) => args.setGrooveMachine((state) => ({ ...state, drumLaneSettings: { ...state.drumLaneSettings, [laneId]: { ...state.drumLaneSettings[laneId], decay: value } } })),
    onDrumLanePanChange: (laneId, value) => args.setGrooveMachine((state) => ({ ...state, drumLaneSettings: { ...state.drumLaneSettings, [laneId]: { ...state.drumLaneSettings[laneId], pan: value } } })),
    onDrumLaneChokeGroupChange: (laneId, value) => args.setGrooveMachine((state) => ({ ...state, drumLaneSettings: { ...state.drumLaneSettings, [laneId]: { ...state.drumLaneSettings[laneId], chokeGroup: value } } })),
    onDrumBarsChange: args.handleDrumBarsChange,
    onDrumSegmentsPerBarChange: args.handleDrumSegmentsChange,
    onResetDrumToPreset: args.resetDrumComputerToPreset,
    onRandomizeDrum: args.randomizeDrumComputer,
    onClearDrum: args.clearDrumComputer,
    onPreviewDrum: () => void args.startDrumPreview('none'),
    onStopDrumPreview: () => args.stopAllForge2Preview('Drum-Vorschau gestoppt.'),
    onSendDrumToXensonar: () => void args.exportDrumComputerToXensonar(),
    onDrumCanvasMouseDown: args.handleDrumComputerDown,
    onStartDrumNavigatorDrag: args.startDrumNavigatorDrag,
    onResetDrumViewport: () => args.setDrumViewport({ startRatio: 0, endRatio: 1 }),
  };
}

export function createCanonicalMicrotonalMelodicActions(
  args: CanonicalMicrotonalMelodicActionArgs,
): Pick<MicrotonalLogicWorkspaceMelodicProps,
  | 'onMutateLoopComposer'
  | 'onSetLoopTrackInstrumentPreset'
  | 'onUploadMelodicSamples'
  | 'onImportSpectralSelectionAsMelodicSample'
  | 'onDeleteMelodicSample'
  | 'onRenameMelodicSample'
  | 'onUpdateMelodicSampleBaseHz'
  | 'onPreviewMelodicSampleReferencePitch'
  | 'onSetMelodicSampleTempoProfile'
  | 'onPreviewMelodicSampleTempoProfile'
  | 'onUpdateMelodicSampleEnvelope'
  | 'onImportMaterialToMelodicLoop'
  | 'onFragmentMaterialBaseSelection'
  | 'onLoadMelodicProject'
  | 'onComposeFromScratch'
  | 'onSaveMelodicProject'
  | 'onDeleteMelodicProject'
  | 'onExportWorkspaceArchive'
  | 'onImportWorkspaceArchive'
  | 'onToggleTrackEnabled'
  | 'onApplyTrackPatternPreset'
  | 'onResetTrackPattern'
  | 'onOnlyYouTrack'
  | 'onPreviewTrackInstrumentSelection'
  | 'onPreviewEnabledTracks'
  | 'onPreviewSelectedNote'
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
> {
  return {
    onMutateLoopComposer: args.mutateLoopComposer,
    onSetLoopTrackInstrumentPreset: args.setLoopTrackInstrumentPreset,
    onUploadMelodicSamples: args.uploadMelodicSamples,
    onImportSpectralSelectionAsMelodicSample: args.importSpectralSelectionAsMelodicSample,
    onDeleteMelodicSample: args.deleteMelodicSample,
    onRenameMelodicSample: args.renameMelodicSample,
    onUpdateMelodicSampleBaseHz: args.updateMelodicSampleBaseHz,
    onPreviewMelodicSampleReferencePitch: args.previewMelodicSampleReferencePitch,
    onSetMelodicSampleTempoProfile: args.setMelodicSampleTempoProfile,
    onPreviewMelodicSampleTempoProfile: args.previewMelodicSampleTempoProfile,
    onUpdateMelodicSampleEnvelope: args.updateMelodicSampleEnvelope,
    onImportMaterialToMelodicLoop: args.importMaterialEntryIntoMelodicLoop,
    onFragmentMaterialBaseSelection: args.fragmentSelectedMaterialBaseNote,
    onLoadMelodicProject: args.loadMelodicProject,
    onComposeFromScratch: args.composeMelodicFromScratch,
    onSaveMelodicProject: args.saveMelodicProject,
    onDeleteMelodicProject: args.deleteMelodicProject,
    onExportWorkspaceArchive: () => {
      void args.exportMelodicWorkspaceArchive();
    },
    onImportWorkspaceArchive: args.requestMelodicWorkspaceImport,
    onToggleTrackEnabled: args.toggleLoopTrackEnabled,
    onApplyTrackPatternPreset: args.applyTrackPatternPreset,
    onResetTrackPattern: args.resetTrackPattern,
    onOnlyYouTrack: args.onlyYouTrack,
    onShiftPitchWindow: args.shiftPitchWindow,
    onLoopBarsChange: args.handleLoopBarsChange,
    onLoopSegmentCountChange: args.handleLoopSegmentCountChange,
    onLoopCanvasWheel: args.handleLoopComposerWheel,
    onLoopCanvasMouseDown: args.handleLoopComposerDown,
    onLoopCanvasContextMenu: args.handleLoopComposerContextMenu,
    ...createCanonicalMelodicPreviewActions(args),
    ...createCanonicalMelodicCanvasActions(args),
    ...createCanonicalMelodicViewportActions(args),
    ...createCanonicalMelodicPitchActions(args),
  };
}

export type CanonicalMicrotonalMaterialActionArgs = {
  setMaterialExport: Dispatch<SetStateAction<MaterialExportConfig>>;
  performActiveUndo: MicrotonalLogicWorkspaceMaterialProps['onUndo'];
  performActiveRedo: MicrotonalLogicWorkspaceMaterialProps['onRedo'];
  startMaterialGroovePreview: (withSelection: boolean) => void | Promise<void>;
  handleLoopComposerExport: () => void | Promise<void>;
  handleLoopComposerExportToForge1: () => void | Promise<void>;
  handleExport: (mode: 'source-direct') => void | Promise<void>;
  clampBars: (value: number) => number;
};

export function createCanonicalMicrotonalMaterialActions(args: CanonicalMicrotonalMaterialActionArgs): Pick<MicrotonalLogicWorkspaceMaterialProps,
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
> {
  return {
    onMaterialNameChange: (value) => args.setMaterialExport((s) => ({ ...s, name: value })),
    onMaterialRoleChange: (value) => args.setMaterialExport((s) => ({ ...s, role: value })),
    onMaterialBpmChange: (value) => args.setMaterialExport((s) => ({ ...s, bpm: Math.max(40, Math.min(320, value || 108)) })),
    onMaterialBarsChange: (value) => args.setMaterialExport((s) => ({ ...s, bars: args.clampBars(value || 4) })),
    onRootFollowPreferredChange: (value) => args.setMaterialExport((s) => ({ ...s, rootFollowPreferred: value })),
    onUndo: args.performActiveUndo,
    onRedo: args.performActiveRedo,
    onStartMaterialGroovePreview: () => void args.startMaterialGroovePreview(true),
    onSendMelodicLoopToXensonar: () => void args.handleLoopComposerExport(),
    onSendToSpectralForge: () => void args.handleLoopComposerExportToForge1(),
    onSendDirectSourceToXensonar: () => void args.handleExport('source-direct'),
  };
}
