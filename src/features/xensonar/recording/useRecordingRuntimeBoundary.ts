import { useRef, useState, type Dispatch, type MouseEvent as ReactMouseEvent, type SetStateAction } from 'react';
import type { RecordingCropRange, RecordingExportScope, RecordingMarker, RecordingSourceMode, RecordingState } from '../domain/runtimeTypes';
import { MAX_RECORDING_MS, getSupportedRecordingMimeType } from '../rooms/resonanceRuntimeMath';
import { formatDuration } from '../helpers';
import { triggerSideMarkerPulse as triggerSideMarkerPulseWorkflow } from './recordingMarkerWorkflow';
import type { LogoMarkerPulse, SideMarkerPulse } from './recordingMarkerWorkflowTypes';
import { addRecordingMarkerAction, startRecordingSession, stopRecordingSession } from './recordingRuntimeActions';
import { exportRecordingBufferRange, handleRecordingTimelinePointerDown, sendRecordingBufferRangeToMaterialForge, updateRecordingPreviewUrlState } from './recordingUiActions';
import type { RecordingTakePanelProps } from './recordingTakePanelContracts';
import { useRecordingRuntimeLifecycle } from './useRecordingRuntimeLifecycle';

type EnsureRecordingDestination = (ctx: AudioContext, mode: RecordingSourceMode) => MediaStreamAudioDestinationNode | null;

type UseRecordingRuntimeBoundaryArgs = {
  ensureAudioReady: () => Promise<AudioContext>;
  ensureRecordingDestination: EnsureRecordingDestination;
  isEditableTarget: (target: EventTarget | null) => boolean;
  isForgeHotkeyTarget: (target: EventTarget | null) => boolean;
};

export type RecordingRuntimeBoundary = {
  recordingState: RecordingState;
  setRecordingState: Dispatch<SetStateAction<RecordingState>>;
  recordingActive: boolean;
  logoMarkerPulses: LogoMarkerPulse[];
  sideMarkerPulses: SideMarkerPulse[];
  addRecordingMarker: (source?: 'key' | 'logo' | 'side') => boolean;
  triggerSideMarkerPulse: (side: 'left' | 'right') => void;
  recordingTake: RecordingTakePanelProps;
};

export function useRecordingRuntimeBoundary(args: UseRecordingRuntimeBoundaryArgs): RecordingRuntimeBoundary {
  const { ensureAudioReady, ensureRecordingDestination, isEditableTarget, isForgeHotkeyTarget } = args;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartAtRef = useRef<number | null>(null);
  const recordingStopTimerRef = useRef<number | null>(null);
  const recordedBufferRef = useRef<AudioBuffer | null>(null);
  const recordingPreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const recordingPreviewUrlRef = useRef<string | null>(null);
  const recordingMarkersRef = useRef<RecordingMarker[]>([]);
  const recordingTimelineRef = useRef<HTMLDivElement | null>(null);
  const lastRecordingSourceModeRef = useRef<RecordingSourceMode>('with_drums');

  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    durationMs: 0,
    hasTake: false,
    filenameBase: 'xensonar-take',
    exportStatus: 'idle',
    exportMessage: '',
  });
  const [recordingMarkers, setRecordingMarkers] = useState<RecordingMarker[]>([]);
  const [recordingWaveform, setRecordingWaveform] = useState<number[]>([]);
  const [recordingPreviewUrl, setRecordingPreviewUrl] = useState<string | null>(null);
  const [recordingPlayheadMs, setRecordingPlayheadMs] = useState(0);
  const [recordingCrop, setRecordingCrop] = useState<RecordingCropRange | null>(null);
  const [recordingCropDraft, setRecordingCropDraft] = useState<RecordingCropRange | null>(null);
  const [recordingSourceMode, setRecordingSourceMode] = useState<RecordingSourceMode>('with_drums');
  const [logoMarkerPulses, setLogoMarkerPulses] = useState<LogoMarkerPulse[]>([]);
  const [sideMarkerPulses, setSideMarkerPulses] = useState<SideMarkerPulse[]>([]);

  const updateRecordingPreviewUrl = (blob: Blob | null) => updateRecordingPreviewUrlState({
    blob,
    recordingPreviewUrlRef,
    setRecordingPreviewUrl,
  });

  const downloadBufferRangeWav = (range: RecordingCropRange | null = null) => exportRecordingBufferRange({
    range,
    recordedBufferRef,
    filenameBase: recordingState.filenameBase,
    lastRecordingSourceModeRef,
    recordingMarkersRef,
    setRecordingMarkers,
    setRecordingState,
  });

  const handleTimelinePointerDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    handleRecordingTimelinePointerDown({
      event,
      hasTake: recordingState.hasTake,
      timelineElement: recordingTimelineRef.current,
      previewAudio: recordingPreviewAudioRef.current,
      recordedBuffer: recordedBufferRef.current,
      fallbackDurationMs: recordingState.durationMs,
      setRecordingCropDraft,
      setRecordingCrop,
    });
  };

  const stopRecording = () => {
    stopRecordingSession({
      recordingStopTimerRef,
      mediaRecorderRef,
      setRecordingState,
    });
  };

  const startRecording = async () => {
    await startRecordingSession({
      ensureAudioReady,
      recordingSourceMode,
      lastRecordingSourceModeRef,
      ensureRecordingDestination,
      recordedBufferRef,
      recordingChunksRef,
      recordingStartAtRef,
      recordingMarkersRef,
      setRecordingMarkers,
      setRecordingWaveform,
      setRecordingCrop,
      setRecordingCropDraft,
      setRecordingPlayheadMs,
      updateRecordingPreviewUrl,
      getSupportedRecordingMimeType,
      mediaRecorderRef,
      setRecordingState,
      stopRecording,
      recordingStopTimerRef,
      maxRecordingMs: MAX_RECORDING_MS,
    });
  };

  const downloadRecordingWav = () => {
    downloadBufferRangeWav(null);
  };

  const downloadRecordingCropWav = () => {
    if (!recordingCrop) return;
    downloadBufferRangeWav(recordingCrop);
  };

  const sendRecordingToMaterialForge = (scope: RecordingExportScope = 'full') => {
    const range = scope === 'crop' ? recordingCrop : null;
    if (scope === 'crop' && !range) return;
    sendRecordingBufferRangeToMaterialForge({
      range,
      recordedBufferRef,
      filenameBase: recordingState.filenameBase,
      lastRecordingSourceModeRef,
      recordingMarkersRef,
      setRecordingMarkers,
      setRecordingState,
    });
  };

  const addRecordingMarker = (source: 'key' | 'logo' | 'side' = 'key'): boolean => {
    if (source === 'side') {
      const accepted = addRecordingMarkerAction({
        source,
        isRecording: recordingState.isRecording,
        recordingStartAtRef,
        recordingMarkersRef,
        setRecordingMarkers,
        setRecordingState,
        setLogoMarkerPulses,
      }) as unknown as boolean;
      if (accepted) triggerSideMarkerPulseWorkflow('right', setSideMarkerPulses);
      return accepted === true;
    }
    return (addRecordingMarkerAction({
      source,
      isRecording: recordingState.isRecording,
      recordingStartAtRef,
      recordingMarkersRef,
      setRecordingMarkers,
      setRecordingState,
      setLogoMarkerPulses,
    }) as unknown as boolean) === true;
  };

  useRecordingRuntimeLifecycle({
    recordingMarkers,
    recordingMarkersRef,
    recordingPreviewUrlRef,
    recordingState,
    recordingStartAtRef,
    setRecordingState,
    addRecordingMarker,
    isEditableTarget,
    isForgeHotkeyTarget,
    recordingPreviewUrl,
    recordingPreviewAudioRef,
    recordedBufferRef,
    setRecordingPlayheadMs,
    recordingStopTimerRef,
    mediaRecorderRef,
  });

  const triggerSideMarkerPulse = (side: 'left' | 'right') => {
    triggerSideMarkerPulseWorkflow(side, setSideMarkerPulses);
  };

  return {
    recordingState,
    setRecordingState,
    recordingActive: recordingState.isRecording,
    logoMarkerPulses,
    sideMarkerPulses,
    addRecordingMarker,
    triggerSideMarkerPulse,
    recordingTake: {
      recordingSourceMode,
      setRecordingSourceMode,
      recordingState,
      stopRecording,
      startRecording,
      formatDuration,
      addRecordingMarker,
      setRecordingState,
      recordingMarkers,
      maxRecordingMs: MAX_RECORDING_MS,
      downloadRecordingWav,
      downloadRecordingCropWav,
      sendRecordingToMaterialForge,
      recordingCrop,
      recordingPreviewUrl,
      recordingPreviewAudioRef,
      recordingTimelineRef,
      handleTimelinePointerDown,
      recordingWaveform,
      recordingCropDraft,
      recordingPlayheadMs,
    },
  };
}
