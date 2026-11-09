import type {
  AppRecordingTakeAuxPanelBoundary,
  AppRecordingTakeAuxPanelBoundaryGroupedInput,
  AppRecordingTakeAuxPanelBoundaryInput,
  AppRecordingTakeAuxPanelProps,
} from './buildAppRecordingTakeAuxPanelBoundaryTypes';

export type * from './buildAppRecordingTakeAuxPanelBoundaryTypes';

export const APP_RECORDING_TAKE_AUX_PANEL_BOUNDARY_CONTRACT = {
  currentRole: 'app-aux-panel-input-montage',
  runtimeOwned: false,
  audioMutating: false,
  bridgeOwnsPanelPropBuild: false,
  acceptsRuntimeTakeDirectly: true,
  groups: [
    'source',
    'session',
    'exportActions',
    'timeline',
  ],
  explicitlyNotMoved: [
    'recording session runtime',
    'MediaRecorder lifecycle',
    'WAV export and crop export implementation',
    'recording preview object URL lifecycle',
    'timeline pointer/crop behavior',
    'marker hotkey listener workflow',
  ],
} as const;

function isGroupedRecordingTakeInput(
  input: AppRecordingTakeAuxPanelBoundaryInput,
): input is AppRecordingTakeAuxPanelBoundaryGroupedInput {
  return 'source' in input && 'session' in input && 'exportActions' in input && 'timeline' in input;
}

function groupRecordingTakeAuxPanelInput(
  recordingTake: AppRecordingTakeAuxPanelProps,
): AppRecordingTakeAuxPanelBoundaryGroupedInput {
  return {
    source: {
      recordingSourceMode: recordingTake.recordingSourceMode,
      setRecordingSourceMode: recordingTake.setRecordingSourceMode,
    },
    session: {
      recordingState: recordingTake.recordingState,
      stopRecording: recordingTake.stopRecording,
      startRecording: recordingTake.startRecording,
      formatDuration: recordingTake.formatDuration,
      addRecordingMarker: recordingTake.addRecordingMarker,
      setRecordingState: recordingTake.setRecordingState,
      recordingMarkers: recordingTake.recordingMarkers,
      maxRecordingMs: recordingTake.maxRecordingMs,
    },
    exportActions: {
      downloadRecordingWav: recordingTake.downloadRecordingWav,
      downloadRecordingCropWav: recordingTake.downloadRecordingCropWav,
      sendRecordingToMaterialForge: recordingTake.sendRecordingToMaterialForge,
    },
    timeline: {
      recordingCrop: recordingTake.recordingCrop,
      recordingPreviewUrl: recordingTake.recordingPreviewUrl,
      recordingPreviewAudioRef: recordingTake.recordingPreviewAudioRef,
      recordingTimelineRef: recordingTake.recordingTimelineRef,
      handleTimelinePointerDown: recordingTake.handleTimelinePointerDown,
      recordingWaveform: recordingTake.recordingWaveform,
      recordingCropDraft: recordingTake.recordingCropDraft,
      recordingPlayheadMs: recordingTake.recordingPlayheadMs,
    },
  };
}

export function buildAppRecordingTakeAuxPanelBoundary(
  input: AppRecordingTakeAuxPanelBoundaryInput,
): AppRecordingTakeAuxPanelBoundary {
  const { source, session, exportActions, timeline } = isGroupedRecordingTakeInput(input)
    ? input
    : groupRecordingTakeAuxPanelInput(input);

  return {
    ...source,
    ...session,
    ...exportActions,
    ...timeline,
  };
}
