import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  markRecordingMaxDurationTimeoutReleased,
  markRecordingMediaRecorderReleased,
  registerRecordingDurationDisplaySecondTick,
  registerRecordingPreviewPlayheadRaf,
} from './recordingDisposalRegistry';
import { getRecordingTimelineDurationMs } from './recordingTimelineUtils';

export function startRecordingDurationDisplaySecondTick(args: {
  isRecording: boolean;
  recordingStartAtRef: MutableRefObject<number | null>;
  setRecordingState: Dispatch<SetStateAction<import('../domain/runtimeTypes').RecordingState>>;
  resolveRecordingDurationMs: (startedAt: number, now?: number) => number;
}) {
  const { isRecording, recordingStartAtRef, setRecordingState, resolveRecordingDurationMs } = args;
  if (!isRecording) return () => {};

  let intervalId: number | null = null;
  const resource = registerRecordingDurationDisplaySecondTick();
  const commitVisibleSecond = () => {
    const startedAt = recordingStartAtRef.current ?? performance.now();
    const elapsedMs = resolveRecordingDurationMs(startedAt);
    const visibleDurationMs = Math.floor(elapsedMs / 1000) * 1000;
    setRecordingState((prev) => (
      prev.durationMs === visibleDurationMs ? prev : { ...prev, durationMs: visibleDurationMs }
    ));
  };

  commitVisibleSecond();
  intervalId = window.setInterval(commitVisibleSecond, 1000);

  return () => {
    if (intervalId !== null) window.clearInterval(intervalId);
    resource.markReleased('recording-duration-display-second-tick-cleared');
  };
}

export function createRecordingMarkerHotkeyHandler(args: {
  addRecordingMarker: (source?: 'key' | 'logo' | 'side') => void;
  isEditableTarget: (target: EventTarget | null) => boolean;
  isForgeHotkeyTarget: (target: EventTarget | null) => boolean;
}) {
  const { addRecordingMarker, isEditableTarget, isForgeHotkeyTarget } = args;
  return (event: KeyboardEvent) => {
    if (isEditableTarget(event.target) || isForgeHotkeyTarget(event.target)) return;
    const isMarkerHotkey = event.code === 'F9' || event.key === 'F9';
    if (!isMarkerHotkey) return;
    event.preventDefault();
    addRecordingMarker('key');
  };
}

export function startRecordingPreviewPlayheadLoop(args: {
  recordingPreviewUrl: string | null;
  recordingPreviewAudioRef: MutableRefObject<HTMLAudioElement | null>;
  recordedBufferRef: MutableRefObject<AudioBuffer | null>;
  fallbackDurationMs: number;
  setRecordingPlayheadMs: Dispatch<SetStateAction<number>>;
  clampValue: (value: number, min: number, max: number) => number;
}) {
  const {
    recordingPreviewUrl,
    recordingPreviewAudioRef,
    recordedBufferRef,
    fallbackDurationMs,
    setRecordingPlayheadMs,
    clampValue,
  } = args;

  if (!recordingPreviewUrl) {
    setRecordingPlayheadMs(0);
    return () => {};
  }

  let raf = 0;
  const resource = registerRecordingPreviewPlayheadRaf(true);
  const tick = () => {
    const el = recordingPreviewAudioRef.current;
    if (el) {
      setRecordingPlayheadMs(
        clampValue(
          Math.round(el.currentTime * 1000),
          0,
          getRecordingTimelineDurationMs(recordedBufferRef.current, fallbackDurationMs),
        ),
      );
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    resource.markReleased('recording-preview-playhead-raf-cancelled');
  };
}

export function cleanupRecordingRuntime(args: {
  recordingStopTimerRef: MutableRefObject<number | null>;
  mediaRecorderRef: MutableRefObject<MediaRecorder | null>;
  recordingPreviewUrlRef: MutableRefObject<string | null>;
  revokeManagedObjectUrl: (url: string | null | undefined) => void;
}) {
  const { recordingStopTimerRef, mediaRecorderRef, recordingPreviewUrlRef, revokeManagedObjectUrl } = args;
  if (recordingStopTimerRef.current !== null) {
    window.clearTimeout(recordingStopTimerRef.current);
    markRecordingMaxDurationTimeoutReleased('recording-cleanup-cleared-timeout');
    recordingStopTimerRef.current = null;
  }
  if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
  markRecordingMediaRecorderReleased('recording-cleanup-media-recorder-stopped-or-inactive');
  if (recordingPreviewUrlRef.current) {
    revokeManagedObjectUrl(recordingPreviewUrlRef.current);
    recordingPreviewUrlRef.current = null;
  }
}
