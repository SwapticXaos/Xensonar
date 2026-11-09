import type { AppAuxPanelBoundaryInputContractMap } from './appAuxPanelBoundaryBaseTypes';

export type AppRecordingTakeAuxPanelProps = AppAuxPanelBoundaryInputContractMap['recordingTake'];

export type AppRecordingTakeSourceBoundary = Pick<
  AppRecordingTakeAuxPanelProps,
  'recordingSourceMode' | 'setRecordingSourceMode'
>;

export type AppRecordingTakeSessionBoundary = Pick<
  AppRecordingTakeAuxPanelProps,
  | 'recordingState'
  | 'stopRecording'
  | 'startRecording'
  | 'formatDuration'
  | 'addRecordingMarker'
  | 'setRecordingState'
  | 'recordingMarkers'
  | 'maxRecordingMs'
>;

export type AppRecordingTakeExportBoundary = Pick<
  AppRecordingTakeAuxPanelProps,
  'downloadRecordingWav' | 'downloadRecordingCropWav' | 'sendRecordingToMaterialForge'
>;

export type AppRecordingTakeTimelineBoundary = Pick<
  AppRecordingTakeAuxPanelProps,
  | 'recordingCrop'
  | 'recordingPreviewUrl'
  | 'recordingPreviewAudioRef'
  | 'recordingTimelineRef'
  | 'handleTimelinePointerDown'
  | 'recordingWaveform'
  | 'recordingCropDraft'
  | 'recordingPlayheadMs'
>;

export type AppRecordingTakeAuxPanelBoundaryGroupedInput = {
  source: AppRecordingTakeSourceBoundary;
  session: AppRecordingTakeSessionBoundary;
  exportActions: AppRecordingTakeExportBoundary;
  timeline: AppRecordingTakeTimelineBoundary;
};

export type AppRecordingTakeAuxPanelBoundaryInput =
  | AppRecordingTakeAuxPanelBoundaryGroupedInput
  | AppRecordingTakeAuxPanelProps;

export type AppRecordingTakeAuxPanelBoundary = AppRecordingTakeAuxPanelProps;
