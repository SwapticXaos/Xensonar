import { getSavedMelodicSampleBlob } from './melodicSampleLibrary';

export type MelodicSampleAmplitudePreview = {
  peaks: Float32Array;
  durationSec: number;
};

const amplitudePreviewCache = new Map<string, MelodicSampleAmplitudePreview | null>();
const amplitudePreviewPending = new Map<string, Promise<MelodicSampleAmplitudePreview | null>>();

function buildAmplitudePeaks(buffer: AudioBuffer, columns = 192) {
  const safeColumns = Math.max(24, Math.min(512, Math.round(columns)));
  const peaks = new Float32Array(safeColumns);
  const channels = Math.max(1, buffer.numberOfChannels);
  const frameCount = Math.max(1, buffer.length);
  for (let column = 0; column < safeColumns; column += 1) {
    const start = Math.floor((column / safeColumns) * frameCount);
    const end = Math.max(start + 1, Math.min(frameCount, Math.floor(((column + 1) / safeColumns) * frameCount)));
    let peak = 0;
    for (let frame = start; frame < end; frame += 1) {
      let mixed = 0;
      for (let channel = 0; channel < channels; channel += 1) {
        mixed += Math.abs(buffer.getChannelData(channel)[frame] ?? 0) / channels;
      }
      if (mixed > peak) peak = mixed;
    }
    peaks[column] = Math.max(0, Math.min(1, peak));
  }
  return peaks;
}

async function decodeAmplitudePreview(sampleId: string): Promise<MelodicSampleAmplitudePreview | null> {
  const blob = await getSavedMelodicSampleBlob(sampleId);
  if (!blob || typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  const ctx = new AudioCtx();
  try {
    const buffer = await ctx.decodeAudioData((await blob.arrayBuffer()).slice(0));
    return {
      peaks: buildAmplitudePeaks(buffer),
      durationSec: Math.max(0.001, buffer.duration || 0.001),
    };
  } finally {
    void ctx.close().catch(() => undefined);
  }
}

export function getCachedMelodicSampleAmplitudePreview(sampleId: string) {
  return amplitudePreviewCache.get(sampleId) ?? null;
}

export function ensureMelodicSampleAmplitudePreview(sampleId: string) {
  if (amplitudePreviewCache.has(sampleId)) return Promise.resolve(amplitudePreviewCache.get(sampleId) ?? null);
  const pending = amplitudePreviewPending.get(sampleId);
  if (pending) return pending;
  const request = decodeAmplitudePreview(sampleId)
    .then((preview) => {
      amplitudePreviewCache.set(sampleId, preview);
      return preview;
    })
    .catch(() => {
      amplitudePreviewCache.set(sampleId, null);
      return null;
    })
    .finally(() => {
      amplitudePreviewPending.delete(sampleId);
    });
  amplitudePreviewPending.set(sampleId, request);
  return request;
}
