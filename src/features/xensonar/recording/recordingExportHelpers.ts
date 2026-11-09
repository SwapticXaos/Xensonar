import type { RecordingCropRange } from '../domain/runtimeTypes';
import { getBufferRange } from './recordingBufferUtils';

export function resolveRecordingExportAudio(buffer: AudioBuffer, range: RecordingCropRange | null = null) {
  let left = buffer.getChannelData(0);
  let right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : buffer.getChannelData(0);
  let effectiveDurationMs = Math.round(buffer.duration * 1000);

  if (range) {
    const sliced = getBufferRange(buffer, range.startMs, range.endMs);
    left = sliced.left;
    right = sliced.right;
    effectiveDurationMs = sliced.durationMs;
  }

  return {
    left,
    right,
    effectiveDurationMs,
  };
}

export function formatRecordingExportReadyMessage(range: RecordingCropRange | null, wavBlobSize: number) {
  return `${range ? 'Crop' : 'WAV'}-Download angestoßen (${(wavBlobSize / 1024 / 1024).toFixed(2)} MB).`;
}
