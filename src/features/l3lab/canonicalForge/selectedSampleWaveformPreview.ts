import { getSavedMelodicSampleBlob } from './melodicSampleLibrary';
import type { LoopNoteEvent } from './loopDrumDomain';

export type SelectedSampleWaveformPreview = {
  peaks: Float32Array;
  durationSec: number;
  segmentStartSec: number;
  segmentDurationSec: number;
  sourceDurationSec: number;
};

function buildPreviewPeaks(data: Float32Array, columns: number) {
  if (data.length === 0 || columns <= 0) return new Float32Array(columns);
  const peaks = new Float32Array(columns);
  for (let x = 0; x < columns; x += 1) {
    const start = Math.floor((x / columns) * data.length);
    const end = Math.max(start + 1, Math.floor(((x + 1) / columns) * data.length));
    let peak = 0;
    for (let i = start; i < end; i += 1) {
      const amp = Math.abs(data[i] ?? 0);
      if (amp > peak) peak = amp;
    }
    peaks[x] = peak;
  }
  return peaks;
}

function clampSeconds(value: number, max: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, value));
}

export async function loadSelectedSampleWaveformPreview(sampleId: string, selectedNote: LoopNoteEvent, fallbackDurationSec: number): Promise<SelectedSampleWaveformPreview | null> {
  const blob = await getSavedMelodicSampleBlob(sampleId);
  if (!blob) return null;
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  const ctx = new AudioCtx();
  try {
    const buffer = await ctx.decodeAudioData((await blob.arrayBuffer()).slice(0));
    const sourceDurationSec = buffer.duration || fallbackDurationSec || 0;
    const segmentStartSec = clampSeconds(selectedNote.sampleOffsetSec ?? 0, sourceDurationSec);
    const rawSegmentDurationSec = selectedNote.samplePlaybackDurationSec ?? Math.max(0.05, sourceDurationSec - segmentStartSec);
    const segmentDurationSec = Math.max(0.01, Math.min(rawSegmentDurationSec, Math.max(0.01, sourceDurationSec - segmentStartSec)));

    const startFrame = Math.max(0, Math.min(buffer.length - 1, Math.floor(segmentStartSec * buffer.sampleRate)));
    const endFrame = Math.max(startFrame + 1, Math.min(buffer.length, Math.ceil((segmentStartSec + segmentDurationSec) * buffer.sampleRate)));
    const mono = new Float32Array(endFrame - startFrame);
    const channels = Math.max(1, buffer.numberOfChannels);
    for (let channel = 0; channel < channels; channel += 1) {
      const source = buffer.getChannelData(channel);
      for (let i = startFrame; i < endFrame; i += 1) {
        mono[i - startFrame] += (source[i] ?? 0) / channels;
      }
    }

    return {
      peaks: buildPreviewPeaks(mono, 980),
      durationSec: segmentDurationSec,
      segmentStartSec,
      segmentDurationSec,
      sourceDurationSec,
    };
  } finally {
    void ctx.close().catch(() => undefined);
  }
}

export function drawSelectedSampleWaveformStrip(
  canvas: HTMLCanvasElement,
  preview: SelectedSampleWaveformPreview | null,
  maskStart: number,
  maskEnd: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, 'rgba(34,211,238,0.24)');
  gradient.addColorStop(1, 'rgba(248,250,252,0.18)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const midY = height * 0.5;
  ctx.strokeStyle = 'rgba(226,232,240,0.78)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, midY + 0.5);
  ctx.lineTo(width, midY + 0.5);
  ctx.stroke();

  if (preview?.peaks?.length) {
    ctx.strokeStyle = 'rgba(186,230,253,0.95)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < width; x += 1) {
      const idx = Math.min(preview.peaks.length - 1, Math.floor((x / Math.max(1, width - 1)) * preview.peaks.length));
      const amp = preview.peaks[idx] ?? 0;
      const top = midY - amp * (height * 0.38);
      const bottom = midY + amp * (height * 0.38);
      ctx.moveTo(x + 0.5, top);
      ctx.lineTo(x + 0.5, bottom);
    }
    ctx.stroke();
  }

  for (let i = 0; i <= 8; i += 1) {
    const x = (i / 8) * width;
    ctx.strokeStyle = i === 0 ? 'rgba(250,204,21,0.8)' : 'rgba(168,85,247,0.34)';
    ctx.lineWidth = i === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }

  const startX = Math.round(Math.max(0, Math.min(1, maskStart)) * width);
  const endX = Math.round(Math.max(maskStart, Math.min(1, maskEnd)) * width);
  const overlayW = Math.max(8, endX - startX);
  ctx.fillStyle = 'rgba(168,85,247,0.18)';
  ctx.fillRect(startX, 0, overlayW, height);
  ctx.strokeStyle = 'rgba(216,180,254,0.95)';
  ctx.lineWidth = 2;
  ctx.strokeRect(startX + 0.5, 1.5, Math.max(1, overlayW - 1), height - 3);

  ctx.fillStyle = 'rgba(233,213,255,0.9)';
  ctx.font = '11px sans-serif';
  ctx.fillText('Wirkbereich', Math.min(width - 80, startX + 8), 14);
}
