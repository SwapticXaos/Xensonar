import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import { SpectralData, type StampData } from '../spectralForge/audio/SpectralData';
import { stampPresets } from '../spectralForge/audio/stampPresets';
import { buildColorLUT, magma } from '../spectralForge/utils/colorMap';

const LUT = buildColorLUT(magma);

export type HistorySnapshot = {
  spectral: Float32Array;
  warpTime: Float32Array | null;
  warpPitch: Float32Array | null;
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function cloneFloat32OrNull(data: Float32Array | null | undefined) {
  return data ? data.slice() : null;
}

export function sanitizeName(input: string) {
  return input.trim().replace(/[\/:*?"<>|]/g, '-').slice(0, 80) || 'canonical-forge-material';
}

export function makeEmptySpectral(width = 1536, height = 384) {
  return new SpectralData(width, height);
}

export function buildRawPreviewAsset(source: AudioSourceAsset | null): AudioSourceAsset | null {
  if (!source) return null;
  return {
    ...source,
    importStartSec: 0,
    importDurationSec: Math.max(0.05, source.originalDuration),
  };
}

export function hasPlayableSource(asset: AudioSourceAsset | null) {
  return !!asset && asset.monoSamples.length > 0 && asset.sampleRate > 0;
}

export function cloneStamp(presetId: string): StampData {
  const preset = stampPresets.find((entry) => entry.id === presetId) ?? stampPresets[0];
  return {
    width: preset.stamp.width,
    height: preset.stamp.height,
    data: preset.stamp.data.slice(),
    grainData: preset.stamp.grainData.slice(),
  };
}

export function cloneStampData(stamp: StampData | null): StampData | null {
  return stamp ? {
    width: stamp.width,
    height: stamp.height,
    data: stamp.data.slice(),
    grainData: stamp.grainData.slice(),
  } : null;
}

export function createHistorySnapshot(
  spectralData: SpectralData,
  warpTime: Float32Array | null = null,
  warpPitch: Float32Array | null = null,
): HistorySnapshot {
  return {
    spectral: spectralData.cloneData(),
    warpTime: cloneFloat32OrNull(warpTime),
    warpPitch: cloneFloat32OrNull(warpPitch),
  };
}

export function restoreHistorySnapshot(
  spectralData: SpectralData,
  snapshot: HistorySnapshot,
  applyWarpSnapshot?: (warpTime: Float32Array | null, warpPitch: Float32Array | null) => void,
) {
  spectralData.restoreData(snapshot.spectral);
  applyWarpSnapshot?.(cloneFloat32OrNull(snapshot.warpTime), cloneFloat32OrNull(snapshot.warpPitch));
}

export function drawSpectralCanvas(
  ctx: CanvasRenderingContext2D,
  spectralData: SpectralData,
  widthPx: number,
  heightPx: number,
  playheadPosition: number,
  hoveredCell: { x: number; y: number } | null,
  brushSizePx: number,
  statusText: string,
  overlays?: {
    stampSelection?: { x0: number; y0: number; x1: number; y1: number } | null;
    stampPreview?: {
      centerX: number;
      centerY: number;
      halfW: number;
      halfH: number;
      outW: number;
      outH: number;
      stampData: StampData;
      transform: { scaleX: number; scaleY: number; rotation: number; flipX: boolean; flipY: boolean };
    } | null;
  },
) {
  const width = spectralData.width;
  const height = spectralData.height;
  const image = ctx.createImageData(widthPx, heightPx);
  const out = image.data;
  for (let py = 0; py < heightPx; py++) {
    const sy = Math.floor((py / heightPx) * height);
    for (let px = 0; px < widthPx; px++) {
      const sx = Math.floor((px / widthPx) * width);
      const value = clamp01(spectralData.data[sy * width + sx] ?? 0);
      const idx = (py * widthPx + px) * 4;
      const lutIdx = Math.max(0, Math.min(255, Math.round(value * 255)));
      out[idx] = LUT[lutIdx * 3];
      out[idx + 1] = LUT[lutIdx * 3 + 1];
      out[idx + 2] = LUT[lutIdx * 3 + 2];
      out[idx + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  ctx.strokeStyle = 'rgba(34,211,238,0.16)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    const x = (i / 8) * widthPx;
    ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, heightPx); ctx.stroke();
  }
  for (let i = 1; i < 6; i++) {
    const y = (i / 6) * heightPx;
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(widthPx, y + 0.5); ctx.stroke();
  }
  const playX = Math.max(0, Math.min(widthPx - 1, playheadPosition * widthPx));
  ctx.strokeStyle = 'rgba(74, 222, 128, 0.95)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(playX + 0.5, 0);
  ctx.lineTo(playX + 0.5, heightPx);
  ctx.stroke();

  if (hoveredCell) {
    const x = (hoveredCell.x / width) * widthPx;
    const y = (hoveredCell.y / height) * heightPx;
    ctx.strokeStyle = 'rgba(244, 244, 245, 0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, brushSizePx, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (overlays?.stampSelection) {
    const { x0, y0, x1, y1 } = overlays.stampSelection;
    const left = (Math.min(x0, x1) / width) * widthPx;
    const right = ((Math.max(x0, x1) + 1) / width) * widthPx;
    const top = (Math.min(y0, y1) / height) * heightPx;
    const bottom = ((Math.max(y0, y1) + 1) / height) * heightPx;
    ctx.fillStyle = 'rgba(34, 211, 238, 0.14)';
    ctx.fillRect(left, top, Math.max(1, right - left), Math.max(1, bottom - top));
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.96)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([8, 5]);
    ctx.strokeRect(left + 0.5, top + 0.5, Math.max(1, right - left - 1), Math.max(1, bottom - top - 1));
    ctx.setLineDash([]);
  }

  if (overlays?.stampPreview) {
    const { centerX, centerY, halfW, halfH, outW, outH, stampData, transform } = overlays.stampPreview;
    const left = ((centerX - halfW) / width) * widthPx;
    const right = ((centerX + halfW) / width) * widthPx;
    const top = ((centerY - halfH) / height) * heightPx;
    const bottom = ((centerY + halfH) / height) * heightPx;
    const drawW = Math.max(1, right - left);
    const drawH = Math.max(1, bottom - top);

    if (outW > 1 && outH > 1 && drawW > 1 && drawH > 1) {
      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = outW;
      previewCanvas.height = outH;
      const pctx = previewCanvas.getContext('2d');
      if (pctx) {
        const previewImage = pctx.createImageData(outW, outH);
        const pdata = previewImage.data;
        for (let dy = 0; dy < outH; dy++) {
          for (let dx = 0; dx < outW; dx++) {
            const sample = spectralData.sampleStampTransformed(stampData, dx - halfW, dy - halfH, transform);
            const val = clamp01(sample.amp);
            if (val <= 0.01) continue;
            const lutIdx = Math.max(0, Math.min(255, Math.round(val * 255)));
            const pIdx = (dy * outW + dx) * 4;
            pdata[pIdx] = LUT[lutIdx * 3];
            pdata[pIdx + 1] = LUT[lutIdx * 3 + 1];
            pdata[pIdx + 2] = LUT[lutIdx * 3 + 2];
            pdata[pIdx + 3] = 118;
          }
        }
        pctx.putImageData(previewImage, 0, 0);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(previewCanvas, left, top, drawW, drawH);
        ctx.restore();
      }
    }

    ctx.fillStyle = 'rgba(34, 211, 238, 0.10)';
    ctx.fillRect(left, top, drawW, drawH);
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.95)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(left + 0.5, top + 0.5, Math.max(1, drawW - 1), Math.max(1, drawH - 1));
    ctx.setLineDash([]);
  }

  if (statusText) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(8, 8, Math.min(widthPx - 16, Math.max(180, statusText.length * 6.5)), 20);
    ctx.fillStyle = 'rgba(236, 254, 255, 0.95)';
    ctx.font = '12px sans-serif';
    ctx.fillText(statusText, 14, 22);
  }
}

export function drawSmallView(
  ctx: CanvasRenderingContext2D,
  data: Float32Array,
  width: number,
  height: number,
  targetW: number,
  targetH: number,
  selected: boolean,
) {
  const image = ctx.createImageData(targetW, targetH);
  const out = image.data;
  for (let py = 0; py < targetH; py++) {
    const sy = Math.floor((py / targetH) * height);
    for (let px = 0; px < targetW; px++) {
      const sx = Math.floor((px / targetW) * width);
      const value = clamp01(data[sy * width + sx] ?? 0);
      const idx = (py * targetW + px) * 4;
      const lutIdx = Math.max(0, Math.min(255, Math.round(value * 255)));
      out[idx] = LUT[lutIdx * 3];
      out[idx + 1] = LUT[lutIdx * 3 + 1];
      out[idx + 2] = LUT[lutIdx * 3 + 2];
      out[idx + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  ctx.strokeStyle = selected ? 'rgba(34,211,238,1)' : 'rgba(255,255,255,0.22)';
  ctx.lineWidth = selected ? 2 : 1;
  ctx.strokeRect(0.5, 0.5, targetW - 1, targetH - 1);
}

export function renderWaveformRegion(
  ctx: CanvasRenderingContext2D,
  source: AudioSourceAsset,
  targetWidth: number,
  targetHeight: number,
  rangeStartSec: number,
  rangeDurationSec: number,
  highlightStartSec?: number,
  highlightDurationSec?: number,
  playheadSec?: number | null,
  playheadColor = 'rgba(250, 204, 21, 0.95)',
) {
  ctx.clearRect(0, 0, targetWidth, targetHeight);
  ctx.fillStyle = '#060913';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  const midY = targetHeight * 0.5;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(targetWidth, midY);
  ctx.stroke();

  const sampleRate = source.sampleRate;
  const totalStartSample = Math.max(0, Math.floor(rangeStartSec * sampleRate));
  const totalSamples = Math.max(1, Math.floor(rangeDurationSec * sampleRate));
  const maxSample = Math.min(source.monoSamples.length, totalStartSample + totalSamples);

  if (highlightStartSec != null && highlightDurationSec != null && rangeDurationSec > 0) {
    const relStart = (highlightStartSec - rangeStartSec) / rangeDurationSec;
    const relEnd = (highlightStartSec + highlightDurationSec - rangeStartSec) / rangeDurationSec;
    const leftClipped = relStart < 0;
    const rightClipped = relEnd > 1;
    const left = Math.floor(Math.max(0, relStart) * targetWidth);
    const right = Math.ceil(Math.min(1, relEnd) * targetWidth);
    if (right > left) {
      ctx.fillStyle = 'rgba(34, 211, 238, 0.12)';
      ctx.fillRect(left, 0, right - left, targetHeight);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.82)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(left + 0.5, 0.5, Math.max(1, right - left - 1), targetHeight - 1);
      if (leftClipped || rightClipped) {
        ctx.save();
        ctx.strokeStyle = 'rgba(103, 232, 249, 0.95)';
        ctx.fillStyle = 'rgba(103, 232, 249, 0.95)';
        ctx.lineWidth = 1.5;
        const markerHalf = Math.max(5, Math.min(10, targetHeight * 0.18));
        const drawEdgeMarker = (x: number, dir: 'left' | 'right') => {
          const tip = dir === 'left' ? 0 : targetWidth;
          const inner = dir === 'left' ? x + markerHalf : x - markerHalf;
          ctx.beginPath();
          ctx.moveTo(tip, midY);
          ctx.lineTo(inner, midY - markerHalf);
          ctx.lineTo(inner, midY + markerHalf);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x, 2);
          ctx.lineTo(x, targetHeight - 2);
          ctx.stroke();
        };
        if (leftClipped) drawEdgeMarker(1.5, 'left');
        if (rightClipped) drawEdgeMarker(targetWidth - 1.5, 'right');
        ctx.restore();
      }
    }
  }

  ctx.strokeStyle = 'rgba(248, 250, 252, 0.92)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < targetWidth; x++) {
    const start = totalStartSample + Math.floor((x / targetWidth) * totalSamples);
    const end = Math.max(start + 1, totalStartSample + Math.floor(((x + 1) / targetWidth) * totalSamples));
    let peak = 0;
    for (let i = start; i < end && i < maxSample; i++) {
      const abs = Math.abs(source.monoSamples[i] ?? 0);
      if (abs > peak) peak = abs;
    }
    const yTop = midY - peak * (targetHeight * 0.42);
    const yBottom = midY + peak * (targetHeight * 0.42);
    ctx.moveTo(x + 0.5, yTop);
    ctx.lineTo(x + 0.5, yBottom);
  }
  ctx.stroke();

  if (playheadSec != null && Number.isFinite(playheadSec) && rangeDurationSec > 0) {
    const rel = (playheadSec - rangeStartSec) / rangeDurationSec;
    if (rel >= 0 && rel <= 1) {
      const x = Math.max(0.5, Math.min(targetWidth - 0.5, rel * targetWidth));
      ctx.strokeStyle = playheadColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, targetHeight);
      ctx.stroke();
    }
  }
}

export function clampSelectionBounds(startSec: number, durationSec: number, maxDuration: number, minDuration = 0.05) {
  const safeDuration = Math.max(minDuration, Math.min(durationSec, maxDuration));
  const safeStart = Math.max(0, Math.min(maxDuration - safeDuration, startSec));
  return { startSec: safeStart, durationSec: safeDuration };
}

export function buildDetailViewport(startSec: number, durationSec: number, maxDuration: number, paddingFactor = 2.2) {
  const safeDuration = Math.max(0.15, Math.min(maxDuration, durationSec * paddingFactor));
  const center = startSec + durationSec * 0.5;
  return clampSelectionBounds(center - safeDuration * 0.5, safeDuration, maxDuration, 0.15);
}
