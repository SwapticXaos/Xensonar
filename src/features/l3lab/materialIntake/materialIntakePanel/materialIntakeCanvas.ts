import { intersectRanges, rangeEnd } from '../selectionMath';
import type { MaterialIntakeMeterConfig, TimeRange } from '../types';

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function timeToX(timeSec: number, totalDurationSec: number, width: number) {
  if (totalDurationSec <= 0) return 0;
  return (timeSec / totalDurationSec) * width;
}

export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  waveform: Float32Array,
  width: number,
  height: number,
  fill: string,
) {
  const midY = height * 0.5;
  ctx.strokeStyle = fill;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < width; x += 1) {
    const idx = Math.min(waveform.length - 1, Math.floor((x / Math.max(1, width - 1)) * waveform.length));
    const amp = waveform[idx] ?? 0;
    const top = midY - amp * (height * 0.42);
    const bottom = midY + amp * (height * 0.42);
    ctx.moveTo(x + 0.5, top);
    ctx.lineTo(x + 0.5, bottom);
  }
  ctx.stroke();
}

export function buildRegionPreview(samples: Float32Array, sampleRate: number, range: TimeRange, columns: number) {
  const preview = new Float32Array(columns);
  if (samples.length === 0 || sampleRate <= 0) return preview;
  const startSample = Math.max(0, Math.floor(range.startSec * sampleRate));
  const endSample = Math.min(samples.length, Math.max(startSample + 1, Math.floor(rangeEnd(range) * sampleRate)));
  const span = Math.max(1, endSample - startSample);
  for (let x = 0; x < columns; x += 1) {
    const localStart = startSample + Math.floor((x / columns) * span);
    const localEnd = Math.min(endSample, startSample + Math.max(1, Math.floor(((x + 1) / columns) * span)));
    let peak = 0;
    for (let i = localStart; i < localEnd; i += 1) {
      const abs = Math.abs(samples[i] ?? 0);
      if (abs > peak) peak = abs;
    }
    preview[x] = peak;
  }
  return preview;
}

export function drawPlaystrip(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewport: TimeRange,
  loop: TimeRange,
  meter?: MaterialIntakeMeterConfig,
  playheadTimeSec?: number | null,
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(148,163,184,0.28)';
  ctx.beginPath();
  ctx.moveTo(0, height - 0.5);
  ctx.lineTo(width, height - 0.5);
  ctx.stroke();

  const visibleLoop = intersectRanges(loop, viewport);
  if (!visibleLoop) return;

  const viewportDuration = Math.max(0.0001, viewport.durationSec);
  const visibleStartRatio = (visibleLoop.startSec - viewport.startSec) / viewportDuration;
  const visibleDurationRatio = visibleLoop.durationSec / viewportDuration;
  const loopX = visibleStartRatio * width;
  const loopW = Math.max(2, visibleDurationRatio * width);

  ctx.fillStyle = 'rgba(34, 211, 238, 0.09)';
  ctx.fillRect(loopX, 0, loopW, height);
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.92)';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(loopX + 0.5, 0.5, Math.max(1, loopW - 1), height - 1);

  const bars = Math.max(1, Math.round(meter?.bars ?? 1));
  const markers = Array.isArray(meter?.guideMarkers) ? meter.guideMarkers : [];
  const loopStart = loop.startSec;
  const loopDuration = Math.max(0.0001, loop.durationSec);

  for (let bar = 0; bar <= bars; bar += 1) {
    const markerTime = loopStart + (bar / bars) * loopDuration;
    if (markerTime < viewport.startSec || markerTime > viewport.startSec + viewport.durationSec) continue;
    const ratio = (markerTime - viewport.startSec) / viewportDuration;
    const x = ratio * width;
    ctx.strokeStyle = bar === 0 ? 'rgba(250, 204, 21, 0.95)' : 'rgba(168, 85, 247, 0.82)';
    ctx.lineWidth = bar === 0 ? 2 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
    if (bar < bars) {
      ctx.fillStyle = bar === 0 ? 'rgba(250, 204, 21, 0.95)' : 'rgba(168, 85, 247, 0.88)';
      ctx.font = '11px sans-serif';
      ctx.fillText(String(bar + 1), Math.min(width - 12, x + 4), 11);
    }
  }

  for (let bar = 0; bar < bars; bar += 1) {
    const barStart = loopStart + (bar / bars) * loopDuration;
    const barDuration = loopDuration / bars;
    for (const marker of markers) {
      const markerTime = barStart + marker * barDuration;
      if (markerTime < viewport.startSec || markerTime > viewport.startSec + viewport.durationSec) continue;
      const ratio = (markerTime - viewport.startSec) / viewportDuration;
      const x = ratio * width;
      ctx.strokeStyle = 'rgba(248,250,252,0.42)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, height * 0.34);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }
  }

  ctx.fillStyle = 'rgba(148,163,184,0.82)';
  ctx.font = '10px sans-serif';
  const bpmText = meter?.bpm ? `${Math.round(meter.bpm)} BPM` : 'BPM offen';
  if (playheadTimeSec != null && playheadTimeSec >= loop.startSec && playheadTimeSec <= rangeEnd(loop)) {
    const ratio = (playheadTimeSec - viewport.startSec) / viewportDuration;
    const x = ratio * width;
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.98)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }

  ctx.fillText(`Taktometer · Start = 1 · ${bars} Takte · ${bpmText}`, 8, height - 7);
}
