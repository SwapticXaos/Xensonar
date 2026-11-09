import type { MelodicImportLanePlacement } from './melodicImportLanePolicy';
import type { RefObject, MouseEventHandler } from 'react';
import type { ChordVoicing, LoopComposerState, LoopNoteEvent, LoopPitchStep, LoopTrackPatternPreset } from './loopDrumDomain';
import type { LoopTrackInstrumentPreset } from './melodicSoundRegistry';
import type { MelodicProjectChoice } from './melodicProjectLibrary';
import type { MelodicSoundOptionGroup } from './melodicSoundRegistry';
import type { SavedMelodicSampleMeta } from './melodicSampleLibrary';
import type { DrumLaneKitOverrides } from '../../xensonar/groove/drumKitRoutingTypes';
import type { DrumLaneChokeGroup, DrumLaneSettingsMap } from '../../xensonar/groove/drumLaneSettings';
import { DrumMachinePanel } from './drumMachinePanel';
import { MelodicLoopPanel } from './melodicLoopPanel';
import { MaterialQuickAccessPanel } from './microtonalLogicPanels';
import type { LocalFieldModuleState } from './localField';
import type { WorkspacePackageImportMode } from '../../../core/systemMemory/packageCore';
import type { MaterialImportEntrySummary } from './materialImportChannel';
import type { SelectedNotePreviewOptions } from './selectedNotePreviewContract';

type LabeledOption = {
  value: string;
  label: string;
};

type MaterialRole = 'loop' | 'waveMaterial' | 'particleExciter' | 'droneTexture';

export type MicrotonalLogicWorkspaceProps = {
  logicView: 'drums' | 'melodic';
  currentDrumPatternLabel: string;
  currentDrumKitLabel: string;
  currentMelodicPresetLabel: string;
  drumPatternOptions: readonly LabeledOption[];
  drumKitOptions: readonly LabeledOption[];
  drumPatternValue: string;
  drumKitValue: string;
  drumBarsValue: number;
  drumSegmentsPerBarValue: number;
  drumGridModeLabel: string;
  drumHitCount: number;
  drumStepCount: number;
  drumViewport: {
    startRatio: number;
    endRatio: number;
  };
  drumVisiblePercent: number;
  drumCanvasWidth: number;
  drumViewportWrapperRef: RefObject<HTMLDivElement | null>;
  drumCanvasRef: RefObject<HTMLCanvasElement | null>;
  drumNavigatorRef: RefObject<HTMLDivElement | null>;
  drumNavigatorHitRatios: number[];
  selectedDrumLaneId: 'kick' | 'snare' | 'hatClosed' | 'hatOpen' | 'clap' | 'perc';
  drumLaneKitOverrides: DrumLaneKitOverrides;
  drumLaneSettings: DrumLaneSettingsMap;
  onDrumPatternChange: (value: string) => void;
  onSelectDrumLane: (laneId: 'kick' | 'snare' | 'hatClosed' | 'hatOpen' | 'clap' | 'perc') => void;
  onDrumKitChange: (value: string) => void;
  onDrumLaneKitChange: (laneId: 'kick' | 'snare' | 'hatClosed' | 'hatOpen' | 'clap' | 'perc', value: string) => void;
  onDrumLaneLevelChange: (laneId: 'kick' | 'snare' | 'hatClosed' | 'hatOpen' | 'clap' | 'perc', value: number) => void;
  onDrumLaneDecayChange: (laneId: 'kick' | 'snare' | 'hatClosed' | 'hatOpen' | 'clap' | 'perc', value: number) => void;
  onDrumLanePanChange: (laneId: 'kick' | 'snare' | 'hatClosed' | 'hatOpen' | 'clap' | 'perc', value: number) => void;
  onDrumLaneChokeGroupChange: (laneId: 'kick' | 'snare' | 'hatClosed' | 'hatOpen' | 'clap' | 'perc', value: DrumLaneChokeGroup) => void;
  onDrumBarsChange: (value: number) => void;
  onDrumSegmentsPerBarChange: (value: number) => void;
  onResetDrumToPreset: () => void;
  onRandomizeDrum: () => void;
  onClearDrum: () => void;
  onPreviewDrum: () => void;
  onStopDrumPreview: () => void;
  onSendDrumToXensonar: () => void;
  onDrumCanvasMouseDown: MouseEventHandler<HTMLCanvasElement>;
  onStartDrumNavigatorDrag: (mode: 'pan' | 'start' | 'end', clientX: number) => void;
  onResetDrumViewport: () => void;
  loopComposer: LoopComposerState;
  bassPatternOptions: readonly LabeledOption[];
  activeLoopPitchIndex: number;
  activeLoopPitchStep: LoopPitchStep | null;
  melodicPreviewNotes: LoopNoteEvent[];
  autoZoomOnDenseOverlap: boolean;
  lockTrackEditing: boolean;
  chordVoicing: ChordVoicing;
  chordStrumSteps: number;
  chordVelocitySlope: number;
  composerCursor: string;
  clipComposerRef: RefObject<HTMLCanvasElement | null>;
  composerOverviewRef: RefObject<HTMLDivElement | null>;
  composerVerticalOverviewRef: RefObject<HTMLDivElement | null>;
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
  onApplyTrackPatternPreset: (trackId: string, presetId: LoopTrackPatternPreset) => void;
  onResetTrackPattern: (trackId: string) => void;
  onOnlyYouTrack: (trackId: string) => void;
  onPreviewTrackInstrumentSelection: (trackId: string, preset: LoopTrackInstrumentPreset) => Promise<void> | void;
  onPreviewEnabledTracks: () => void;
  onPreviewSelectedNote: (options?: SelectedNotePreviewOptions) => Promise<void> | void;
  onStopEnabledTracksPreview: () => void;
  onSelectTrack: (trackId: string) => void;
  onShiftPitchWindow: (delta: number) => void;
  onLoopBarsChange: (bars: number) => void;
  onLoopSegmentCountChange: (count: number) => void;
  onLoopCanvasWheel: React.WheelEventHandler<HTMLDivElement>;
  onLoopCanvasMouseDown: React.MouseEventHandler<HTMLCanvasElement>;
  onLoopCanvasMouseMove: React.MouseEventHandler<HTMLCanvasElement>;
  onLoopCanvasMouseUp: React.MouseEventHandler<HTMLCanvasElement>;
  onLoopCanvasMouseLeave: () => void;
  onLoopCanvasContextMenu: React.MouseEventHandler<HTMLCanvasElement>;
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
  onResetLoopZoom: () => void;
  onAutoZoomChange: (value: boolean) => void;
  onLockTrackEditingChange: (value: boolean) => void;
  onChordVoicingChange: (value: ChordVoicing) => void;
  onChordStrumStepsChange: (value: number) => void;
  onChordVelocitySlopeChange: (value: number) => void;
  onFreezeSelectedNoteToSample: () => Promise<void> | void;
  materialName: string;
  materialRole: MaterialRole;
  materialBpm: number;
  materialBars: number;
  rootFollowPreferred: boolean;
  busy: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasRawSourceAsset: boolean;
  onMaterialNameChange: (value: string) => void;
  onMaterialRoleChange: (value: MaterialRole) => void;
  onMaterialBpmChange: (value: number) => void;
  onMaterialBarsChange: (value: number) => void;
  onRootFollowPreferredChange: (value: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onStartMaterialGroovePreview: () => void;
  onSendMelodicLoopToXensonar: () => void;
  onSendToSpectralForge: () => void;
  onSendDirectSourceToXensonar: () => void;
};

export function MicrotonalLogicWorkspace({
  logicView,
  currentDrumPatternLabel: _currentDrumPatternLabel,
  currentDrumKitLabel: _currentDrumKitLabel,
  currentMelodicPresetLabel: _currentMelodicPresetLabel,
  drumPatternOptions,
  drumKitOptions,
  drumPatternValue,
  drumKitValue,
  drumBarsValue,
  drumSegmentsPerBarValue,
  drumGridModeLabel,
  drumHitCount,
  drumStepCount,
  drumViewport,
  drumVisiblePercent,
  drumCanvasWidth,
  drumViewportWrapperRef,
  drumCanvasRef,
  drumNavigatorRef,
  drumNavigatorHitRatios,
  selectedDrumLaneId,
  drumLaneKitOverrides,
  drumLaneSettings,
  onDrumPatternChange,
  onSelectDrumLane,
  onDrumKitChange,
  onDrumLaneKitChange,
  onDrumLaneLevelChange,
  onDrumLaneDecayChange,
  onDrumLanePanChange,
  onDrumLaneChokeGroupChange,
  onDrumBarsChange,
  onDrumSegmentsPerBarChange,
  onResetDrumToPreset,
  onRandomizeDrum,
  onClearDrum,
  onPreviewDrum,
  onStopDrumPreview,
  onSendDrumToXensonar,
  onDrumCanvasMouseDown,
  onStartDrumNavigatorDrag,
  onResetDrumViewport,
  loopComposer,
  bassPatternOptions,
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
  onApplyTrackPatternPreset,
  onResetTrackPattern,
  onOnlyYouTrack,
  onPreviewTrackInstrumentSelection,
  onPreviewEnabledTracks,
  onPreviewSelectedNote,
  onStopEnabledTracksPreview,
  onSelectTrack,
  onShiftPitchWindow,
  onLoopBarsChange,
  onLoopSegmentCountChange,
  onLoopCanvasWheel,
  onLoopCanvasMouseDown,
  onLoopCanvasMouseMove,
  onLoopCanvasMouseUp,
  onLoopCanvasMouseLeave,
  onLoopCanvasContextMenu,
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
  onResetLoopZoom,
  onAutoZoomChange,
  onLockTrackEditingChange,
  onChordVoicingChange,
  onChordStrumStepsChange,
  onChordVelocitySlopeChange,
  onFreezeSelectedNoteToSample,
  materialName,
  materialRole,
  materialBpm,
  materialBars,
  rootFollowPreferred,
  busy,
  canUndo,
  canRedo,
  hasRawSourceAsset,
  onMaterialNameChange,
  onMaterialRoleChange,
  onMaterialBpmChange,
  onMaterialBarsChange,
  onRootFollowPreferredChange,
  onUndo,
  onRedo,
  onStartMaterialGroovePreview,
  onSendMelodicLoopToXensonar,
  onSendToSpectralForge,
  onSendDirectSourceToXensonar,
}: MicrotonalLogicWorkspaceProps) {
  return (
    <div className="space-y-4 rounded border border-neutral-800 bg-neutral-950/70 p-4">
      {logicView === 'drums' ? (
        <DrumMachinePanel
          drumPatternOptions={drumPatternOptions}
          drumKitOptions={drumKitOptions}
          drumPatternValue={drumPatternValue}
          drumKitValue={drumKitValue}
          barsValue={drumBarsValue}
          segmentsPerBarValue={drumSegmentsPerBarValue}
          gridModeLabel={drumGridModeLabel}
          hitCount={drumHitCount}
          stepCount={drumStepCount}
          viewport={drumViewport}
          visiblePercent={drumVisiblePercent}
          drumCanvasWidth={drumCanvasWidth}
          drumViewportWrapperRef={drumViewportWrapperRef}
          drumCanvasRef={drumCanvasRef}
          drumNavigatorRef={drumNavigatorRef}
          drumNavigatorHitRatios={drumNavigatorHitRatios}
          selectedLaneId={selectedDrumLaneId}
          laneKitOverrides={drumLaneKitOverrides}
          laneSettings={drumLaneSettings}
          onDrumPatternChange={onDrumPatternChange}
          onSelectLane={onSelectDrumLane}
          onDrumKitChange={onDrumKitChange}
          onLaneKitChange={onDrumLaneKitChange}
          onLaneLevelChange={onDrumLaneLevelChange}
          onLaneDecayChange={onDrumLaneDecayChange}
          onLanePanChange={onDrumLanePanChange}
          onLaneChokeGroupChange={onDrumLaneChokeGroupChange}
          onBarsChange={onDrumBarsChange}
          onSegmentsPerBarChange={onDrumSegmentsPerBarChange}
          onResetToPreset={onResetDrumToPreset}
          onRandomize={onRandomizeDrum}
          onClear={onClearDrum}
          onPreview={onPreviewDrum}
          onStopPreview={onStopDrumPreview}
          onSendToXensonar={onSendDrumToXensonar}
          onCanvasMouseDown={onDrumCanvasMouseDown}
          onStartNavigatorDrag={onStartDrumNavigatorDrag}
          onResetViewport={onResetDrumViewport}
        />
      ) : (
        <MelodicLoopPanel
          loopComposer={loopComposer}
          bassPatternOptions={bassPatternOptions}
          activeLoopPitchIndex={activeLoopPitchIndex}
          activeLoopPitchStep={activeLoopPitchStep}
          melodicPreviewNotes={melodicPreviewNotes}
          autoZoomOnDenseOverlap={autoZoomOnDenseOverlap}
          lockTrackEditing={lockTrackEditing}
          chordVoicing={chordVoicing}
          chordStrumSteps={chordStrumSteps}
          chordVelocitySlope={chordVelocitySlope}
          composerCursor={composerCursor}
          clipComposerRef={clipComposerRef}
          composerOverviewRef={composerOverviewRef}
          composerVerticalOverviewRef={composerVerticalOverviewRef}
          onMutateLoopComposer={onMutateLoopComposer}
          onSetLoopTrackInstrumentPreset={onSetLoopTrackInstrumentPreset}
          melodicInstrumentOptionGroups={melodicInstrumentOptionGroups}
          melodicSampleEntries={melodicSampleEntries}
          onUploadMelodicSamples={onUploadMelodicSamples}
          onImportSpectralSelectionAsMelodicSample={onImportSpectralSelectionAsMelodicSample}
          canImportSpectralSelectionAsMelodicSample={canImportSpectralSelectionAsMelodicSample}
          onDeleteMelodicSample={onDeleteMelodicSample}
          onRenameMelodicSample={onRenameMelodicSample}
          onUpdateMelodicSampleBaseHz={onUpdateMelodicSampleBaseHz}
          onPreviewMelodicSampleReferencePitch={onPreviewMelodicSampleReferencePitch}
          onSetMelodicSampleTempoProfile={onSetMelodicSampleTempoProfile}
          onPreviewMelodicSampleTempoProfile={onPreviewMelodicSampleTempoProfile}
          onUpdateMelodicSampleEnvelope={onUpdateMelodicSampleEnvelope}
          melodicProjectChoices={melodicProjectChoices}
          selectedMelodicProjectId={selectedMelodicProjectId}
          canDeleteMelodicProject={canDeleteMelodicProject}
          materialEntries={materialEntries}
          materialImportRequestNonce={materialImportRequestNonce}
          onImportMaterialToMelodicLoop={onImportMaterialToMelodicLoop}
          onFragmentMaterialBaseSelection={onFragmentMaterialBaseSelection}
          materialFragmentPrepActive={materialFragmentPrepActive}
          onLoadMelodicProject={onLoadMelodicProject}
          onComposeFromScratch={onComposeFromScratch}
          onSaveMelodicProject={onSaveMelodicProject}
          onDeleteMelodicProject={onDeleteMelodicProject}
          onExportWorkspaceArchive={onExportWorkspaceArchive}
          onImportWorkspaceArchive={onImportWorkspaceArchive}
          hasWorkspacePackageContent={hasWorkspacePackageContent}
          onToggleTrackEnabled={onToggleTrackEnabled}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
          onApplyTrackPatternPreset={onApplyTrackPatternPreset}
          onResetTrackPattern={onResetTrackPattern}
          onOnlyYouTrack={onOnlyYouTrack}
          onPreviewTrackInstrumentSelection={onPreviewTrackInstrumentSelection}
          onPreviewEnabledTracks={onPreviewEnabledTracks}
          onPreviewSelectedNote={onPreviewSelectedNote}
          onStopEnabledTracksPreview={onStopEnabledTracksPreview}
          onSelectTrack={onSelectTrack}
          onShiftPitchWindow={onShiftPitchWindow}
          onBarsChange={onLoopBarsChange}
          onSegmentCountChange={onLoopSegmentCountChange}
          onCanvasWheel={onLoopCanvasWheel}
          onCanvasMouseDown={onLoopCanvasMouseDown}
          onCanvasMouseMove={onLoopCanvasMouseMove}
          onCanvasMouseUp={onLoopCanvasMouseUp}
          onCanvasMouseLeave={onLoopCanvasMouseLeave}
          onCanvasContextMenu={onLoopCanvasContextMenu}
          onJumpHorizontalOverview={onJumpHorizontalOverview}
          onStartHorizontalOverviewDrag={onStartHorizontalOverviewDrag}
          onJumpVerticalOverview={onJumpVerticalOverview}
          onStartVerticalOverviewDrag={onStartVerticalOverviewDrag}
          onResetVerticalOverview={onResetVerticalOverview}
          onActivePitchOffsetChange={onActivePitchOffsetChange}
          onResetActivePitchOffset={onResetActivePitchOffset}
          onZoomXChange={onZoomXChange}
          onScrollXChange={onScrollXChange}
          onZoomYChange={onZoomYChange}
          onScrollYChange={onScrollYChange}
          onBeatsPerBarChange={onBeatsPerBarChange}
          onResetZoom={onResetLoopZoom}
          onAutoZoomChange={onAutoZoomChange}
          onLockTrackEditingChange={onLockTrackEditingChange}
          onChordVoicingChange={onChordVoicingChange}
          onChordStrumStepsChange={onChordStrumStepsChange}
          onChordVelocitySlopeChange={onChordVelocitySlopeChange}
          onFreezeSelectedNoteToSample={onFreezeSelectedNoteToSample}
        />
      )}

      <MaterialQuickAccessPanel
        materialName={materialName}
        materialRole={materialRole}
        materialBpm={materialBpm}
        materialBars={materialBars}
        rootFollowPreferred={rootFollowPreferred}
        busy={busy}
        canUndo={canUndo}
        canRedo={canRedo}
        hasRawSourceAsset={hasRawSourceAsset}
        onMaterialNameChange={onMaterialNameChange}
        onMaterialRoleChange={onMaterialRoleChange}
        onMaterialBpmChange={onMaterialBpmChange}
        onMaterialBarsChange={onMaterialBarsChange}
        onRootFollowPreferredChange={onRootFollowPreferredChange}
        onUndo={onUndo}
        onRedo={onRedo}
        onStartMaterialGroovePreview={onStartMaterialGroovePreview}
        onSendMelodicLoopToXensonar={onSendMelodicLoopToXensonar}
        onSendToSpectralForge={onSendToSpectralForge}
        onSendDirectSourceToXensonar={onSendDirectSourceToXensonar}
      />
    </div>
  );
}
