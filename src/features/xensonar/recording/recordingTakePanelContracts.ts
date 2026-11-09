import type { Dispatch, MouseEvent as ReactMouseEvent, MutableRefObject, SetStateAction } from 'react';
import type {
  RecordingCropRange,
  RecordingExportScope,
  RecordingMarker,
  RecordingSourceMode,
  RecordingState,
} from '../domain/runtimeTypes';
import type { formatDuration } from '../helpers';

export type RecordingMarkerSource = 'key' | 'logo' | 'side';

export type RecordingTakePanelProps = {
  recordingSourceMode: RecordingSourceMode;
  setRecordingSourceMode: Dispatch<SetStateAction<RecordingSourceMode>>;
  recordingState: RecordingState;
  stopRecording: () => void;
  startRecording: () => Promise<void>;
  formatDuration: typeof formatDuration;
  addRecordingMarker: (source?: RecordingMarkerSource) => boolean;
  setRecordingState: Dispatch<SetStateAction<RecordingState>>;
  recordingMarkers: RecordingMarker[];
  maxRecordingMs: number;
  downloadRecordingWav: () => void;
  downloadRecordingCropWav: () => void;
  sendRecordingToMaterialForge: (scope?: RecordingExportScope) => void;
  recordingCrop: RecordingCropRange | null;
  recordingPreviewUrl: string | null;
  recordingPreviewAudioRef: MutableRefObject<HTMLAudioElement | null>;
  recordingTimelineRef: MutableRefObject<HTMLDivElement | null>;
  handleTimelinePointerDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
  recordingWaveform: number[];
  recordingCropDraft: RecordingCropRange | null;
  recordingPlayheadMs: number;
};
