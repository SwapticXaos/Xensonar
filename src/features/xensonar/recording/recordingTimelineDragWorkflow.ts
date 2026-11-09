import { clamp } from '../rooms/resonanceRuntimeMath';
import type { RecordingCropRange } from '../domain/runtimeTypes';
import {
  buildRecordingCropRange,
  getRecordingCropDurationMs,
  resolveRecordingSeekTimeMs,
} from './recordingTimelineSelection';
import {
  getRecordingTimelineDurationMs,
  getRecordingTimelineRatioFromClientX,
} from './recordingTimelineUtils';

export function beginRecordingTimelineSelection(args: {
  event: { clientX: number };
  hasTake: boolean;
  timelineElement: HTMLDivElement | null;
  previewAudio: HTMLAudioElement | null;
  recordedBuffer: AudioBuffer | null;
  fallbackDurationMs: number;
  setRecordingCropDraft: (range: RecordingCropRange | null) => void;
  setRecordingCrop: (range: RecordingCropRange | null) => void;
}) {
  const {
    event,
    hasTake,
    timelineElement,
    previewAudio,
    recordedBuffer,
    fallbackDurationMs,
    setRecordingCropDraft,
    setRecordingCrop,
  } = args;

  if (!hasTake) return;
  const durationMs = getRecordingTimelineDurationMs(recordedBuffer, fallbackDurationMs);
  if (!durationMs) return;

  const startRatio = getRecordingTimelineRatioFromClientX(timelineElement, event.clientX);
  let latestRatio = startRatio;
  let dragging = false;
  setRecordingCropDraft(buildRecordingCropRange(startRatio, startRatio, durationMs));

  const handleMove = (moveEvent: MouseEvent) => {
    latestRatio = getRecordingTimelineRatioFromClientX(timelineElement, moveEvent.clientX);
    dragging = dragging || Math.abs(latestRatio - startRatio) > 0.003;
    setRecordingCropDraft(buildRecordingCropRange(startRatio, latestRatio, durationMs));
  };

  const handleUp = (upEvent: MouseEvent) => {
    window.removeEventListener('mousemove', handleMove);
    window.removeEventListener('mouseup', handleUp);
    latestRatio = getRecordingTimelineRatioFromClientX(timelineElement, upEvent.clientX);
    const nextCrop = buildRecordingCropRange(startRatio, latestRatio, durationMs);
    const cropDuration = getRecordingCropDurationMs(nextCrop);
    setRecordingCropDraft(null);

    if (!dragging || cropDuration < 180) {
      setRecordingCrop(null);
      if (previewAudio) {
        previewAudio.currentTime = resolveRecordingSeekTimeMs(latestRatio, durationMs, clamp) / 1000;
      }
      return;
    }

    setRecordingCrop(nextCrop);
  };

  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handleUp);
}
