import { fftMagnitudesReal } from './realSpectrum';
import { DURATION } from '../spectralConstants';
import type { AudioImportReadMode, AudioProjectionOptions, AudioSourceAnalysisCache, AudioSourceAsset } from './AudioImporterTypes';
import { SpectralData, yToFrequency } from './SpectralData';



function getChannelOrClone(buffer: AudioBuffer, channel: number): Float32Array {
  const { length, numberOfChannels } = buffer;
  const out = new Float32Array(length);
  if (numberOfChannels <= 0) return out;
  const src = buffer.getChannelData(Math.max(0, Math.min(numberOfChannels - 1, channel)));
  out.set(src);
  return out;
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const { numberOfChannels, length } = buffer;
  const mono = new Float32Array(length);
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) mono[i] += data[i] / numberOfChannels;
  }
  return mono;
}

function buildMidSide(left: Float32Array, right: Float32Array) {
  const length = Math.min(left.length, right.length);
  const mid = new Float32Array(length);
  const side = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    mid[i] = (l + r) * 0.5;
    side[i] = (l - r) * 0.5;
  }
  return { mid, side };
}

function buildHannWindow(size: number): Float32Array {
  const window = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / Math.max(1, size - 1)));
  }
  return window;
}



function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildWaveformPreview(samples: Float32Array, columns = 1024): Float32Array {
  const preview = new Float32Array(columns);
  if (samples.length === 0) return preview;
  for (let x = 0; x < columns; x++) {
    const start = Math.floor((x / columns) * samples.length);
    const end = Math.max(start + 1, Math.floor(((x + 1) / columns) * samples.length));
    let peak = 0;
    for (let i = start; i < end && i < samples.length; i++) {
      const abs = Math.abs(samples[i] ?? 0);
      if (abs > peak) peak = abs;
    }
    preview[x] = peak;
  }
  return preview;
}

function buildStereoWidthPreview(mid: Float32Array, side: Float32Array, columns = 1024): Float32Array {
  const preview = new Float32Array(columns);
  if (mid.length === 0 || side.length === 0) return preview;
  for (let x = 0; x < columns; x++) {
    const start = Math.floor((x / columns) * mid.length);
    const end = Math.max(start + 1, Math.floor(((x + 1) / columns) * mid.length));
    let midEnergy = 0;
    let sideEnergy = 0;
    let count = 0;
    for (let i = start; i < end && i < mid.length && i < side.length; i++) {
      const m = mid[i] ?? 0;
      const s = side[i] ?? 0;
      midEnergy += m * m;
      sideEnergy += s * s;
      count++;
    }
    if (count > 0) {
      const m = Math.sqrt(midEnergy / count);
      const s = Math.sqrt(sideEnergy / count);
      preview[x] = clamp(s / Math.max(1e-4, m + s), 0, 1);
    }
  }
  return preview;
}

function mapDbGridToUnit(dbGrid: Float32Array, fallbackFloorDb = -160) {
  let maxDb = -160;
  for (let i = 0; i < dbGrid.length; i++) {
    if (dbGrid[i] > maxDb) maxDb = dbGrid[i];
  }
  const floorDb = maxDb > -159 ? maxDb - 85 : fallbackFloorDb;
  const normalized = new Float32Array(dbGrid.length);
  for (let i = 0; i < dbGrid.length; i++) {
    let norm = (dbGrid[i] - floorDb) / Math.max(1, maxDb - floorDb);
    norm = Math.max(0, Math.min(1, norm));
    norm = Math.pow(norm, 0.78);
    if (norm < 0.02) norm = 0;
    normalized[i] = norm;
  }
  return normalized;
}

export interface AudioImportOptions {
  startSec: number;
  durationSec?: number;
}

export type { AudioImportReadMode, AudioProjectionOptions, AudioSourceAnalysisCache, AudioSourceAsset } from './AudioImporterTypes';

export interface ImportedAudioInfo {
  originalDuration: number;
  importedDuration: number;
  sampleRate: number;
  importStartSec: number;
}

async function computeSpectralDbGrid(
  source: AudioSourceAsset,
  width: number,
  height: number,
  onProgress?: (progress: number) => void,
): Promise<Float32Array> {
  const mono = source.monoSamples;
  const sampleRate = source.sampleRate;
  const importedDuration = Math.max(0.05, source.importDurationSec);
  const startSample = Math.max(0, Math.floor(source.importStartSec * sampleRate));
  const maxImportSamples = Math.min(mono.length - startSample, Math.floor(importedDuration * sampleRate));
  const fftSize = 2048;
  const halfFft = fftSize / 2;
  const window = buildHannWindow(fftSize);
  const dbGrid = new Float32Array(width * height);
  dbGrid.fill(-160);

  for (let x = 0; x < width; x++) {
    const t = x / Math.max(1, width - 1);
    const localTimeSec = t * importedDuration;

    if (localTimeSec > importedDuration || maxImportSamples <= 0) {
      if (x % 24 === 0) {
        onProgress?.(x / Math.max(1, width - 1));
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      continue;
    }

    const centerSample = startSample + Math.floor(localTimeSec * sampleRate);
    const frame = new Float32Array(fftSize);

    for (let i = 0; i < fftSize; i++) {
      const srcIndex = centerSample - halfFft + i;
      const relativeIndex = srcIndex - startSample;
      const sample = relativeIndex >= 0 && relativeIndex < maxImportSamples && srcIndex < mono.length ? mono[srcIndex] : 0;
      frame[i] = sample * window[i];
    }

    const mags = fftMagnitudesReal(frame);
    const binHz = sampleRate / fftSize;

    for (let y = 0; y < height; y++) {
      const freq = yToFrequency(y, height);
      if (freq >= sampleRate * 0.5) continue;
      const bin = freq / binHz;
      const b0 = Math.floor(bin);
      const b1 = Math.min(mags.length - 1, b0 + 1);
      const frac = bin - b0;
      const mag0 = mags[b0] ?? 0;
      const mag1 = mags[b1] ?? 0;
      const mag = mag0 + (mag1 - mag0) * frac;
      dbGrid[y * width + x] = 20 * Math.log10(mag + 1e-9);
    }

    if (x % 24 === 0) {
      onProgress?.(x / Math.max(1, width - 1));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  onProgress?.(1);
  return dbGrid;
}

function computeTransientEnvelope(
  source: AudioSourceAsset,
  width: number,
): Float32Array {
  const envelope = new Float32Array(width);
  const sampleRate = source.sampleRate;
  const importedDuration = Math.max(0.05, source.importDurationSec);
  const startSample = Math.max(0, Math.floor(source.importStartSec * sampleRate));
  const maxImportSamples = Math.min(source.monoSamples.length - startSample, Math.floor(importedDuration * sampleRate));
  if (maxImportSamples <= 0) return envelope;

  let previousPeak = 0;
  const samplesPerStep = Math.max(32, Math.floor((importedDuration * sampleRate) / Math.max(1, width)));

  for (let x = 0; x < width; x++) {
    const t = x / Math.max(1, width - 1);
    const localTimeSec = t * importedDuration;
    if (localTimeSec > importedDuration) {
      envelope[x] = 0;
      continue;
    }
    const centerSample = startSample + Math.floor(localTimeSec * sampleRate);
    const start = Math.max(startSample, centerSample - Math.floor(samplesPerStep * 0.5));
    const end = Math.min(startSample + maxImportSamples, centerSample + Math.floor(samplesPerStep * 0.5));
    let peak = 0;
    let rms = 0;
    let count = 0;
    for (let i = start; i < end; i++) {
      const s = source.monoSamples[i] ?? 0;
      const abs = Math.abs(s);
      if (abs > peak) peak = abs;
      rms += s * s;
      count++;
    }
    const rmsNorm = count > 0 ? Math.sqrt(rms / count) : 0;
    const transient = Math.max(0, peak - previousPeak * 0.84) + rmsNorm * 0.22;
    envelope[x] = transient;
    previousPeak = peak;
  }

  let maxVal = 0;
  for (let i = 0; i < envelope.length; i++) {
    if (envelope[i] > maxVal) maxVal = envelope[i];
  }
  if (maxVal > 1e-6) {
    for (let i = 0; i < envelope.length; i++) {
      envelope[i] = Math.pow(clamp(envelope[i] / maxVal, 0, 1), 0.8);
    }
  }
  return envelope;
}

export async function buildAudioSourceAnalysisCache(
  source: AudioSourceAsset,
  onProgress?: (progress: number) => void,
): Promise<AudioSourceAnalysisCache> {
  const width = 4096;
  const height = 256;
  const dbGrid = await computeSpectralDbGrid(source, width, height, (p) => onProgress?.(p * 0.86));
  const data = mapDbGridToUnit(dbGrid);
  const transientEnvelope = computeTransientEnvelope(source, width);
  onProgress?.(1);
  return { width, height, data, transientEnvelope };
}

export async function attachAnalysisCacheToSourceAsset(
  source: AudioSourceAsset,
  onProgress?: (progress: number) => void,
): Promise<AudioSourceAsset> {
  const analysisCache = await buildAudioSourceAnalysisCache(source, onProgress);
  return { ...source, analysisCache };
}

export async function prepareAudioSourceAsset(
  file: File,
  onProgress?: (progress: number) => void
): Promise<AudioSourceAsset> {
  const audioContext = new AudioContext();

  try {
    const arrayBuffer = await file.arrayBuffer();
    onProgress?.(0.08);

    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    onProgress?.(0.32);

    const mono = mixToMono(decoded);
    const left = getChannelOrClone(decoded, 0);
    const right = decoded.numberOfChannels > 1 ? getChannelOrClone(decoded, 1) : left.slice();
    const { mid, side } = buildMidSide(left, right);
    const preview = buildWaveformPreview(mono, 1024);
    const stereoWidthPreview = buildStereoWidthPreview(mid, side, 1024);
    const importDurationSec = Math.min(decoded.duration, DURATION);

    onProgress?.(1);

    return {
      kind: 'audio',
      fileName: file.name,
      monoSamples: mono,
      leftSamples: left,
      rightSamples: right,
      midSamples: mid,
      sideSamples: side,
      sampleRate: decoded.sampleRate,
      originalDuration: decoded.duration,
      channelCount: decoded.numberOfChannels,
      importStartSec: 0,
      importDurationSec,
      waveformPreview: preview,
      stereoWidthPreview,
    };
  } finally {
    await audioContext.close().catch(() => undefined);
  }
}

export function retargetAudioSourceAsset(source: AudioSourceAsset, options: AudioImportOptions): AudioSourceAsset {
  const durationSec = Math.max(0.05, Math.min(options.durationSec ?? DURATION, source.originalDuration));
  const maxStart = Math.max(0, source.originalDuration - durationSec);
  const startSec = clamp(options.startSec, 0, maxStart);
  const remaining = Math.max(0.05, source.originalDuration - startSec);
  const importDurationSec = Math.max(0.05, Math.min(durationSec, remaining));
  return {
    ...source,
    importStartSec: startSec,
    importDurationSec,
    analysisCache: undefined,
  };
}

export function renderAudioImportPreview(
  ctx: CanvasRenderingContext2D,
  source: AudioSourceAsset,
  targetWidth: number,
  targetHeight: number,
  highlight: 'window' | 'full' = 'window',
) {
  ctx.clearRect(0, 0, targetWidth, targetHeight);
  ctx.fillStyle = '#060913';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const waveform = source.waveformPreview;
  const midY = targetHeight * 0.5;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(targetWidth, midY);
  ctx.stroke();

  if (highlight === 'window') {
    const startRatio = source.originalDuration > 0 ? source.importStartSec / source.originalDuration : 0;
    const endRatio = source.originalDuration > 0 ? (source.importStartSec + source.importDurationSec) / source.originalDuration : 1;
    const left = Math.floor(startRatio * targetWidth);
    const right = Math.ceil(endRatio * targetWidth);
    ctx.fillStyle = 'rgba(34, 211, 238, 0.12)';
    ctx.fillRect(left, 0, Math.max(2, right - left), targetHeight);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(left + 0.5, 0.5, Math.max(1, right - left - 1), targetHeight - 1);
  }

  ctx.strokeStyle = 'rgba(248, 250, 252, 0.92)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < targetWidth; x++) {
    const idx = Math.min(waveform.length - 1, Math.floor((x / targetWidth) * waveform.length));
    const amp = waveform[idx] ?? 0;
    const yTop = midY - amp * (targetHeight * 0.42);
    const yBottom = midY + amp * (targetHeight * 0.42);
    ctx.moveTo(x + 0.5, yTop);
    ctx.lineTo(x + 0.5, yBottom);
  }
  ctx.stroke();
}

export async function importAudioSourceToSpectralData(
  source: AudioSourceAsset,
  spectralData: SpectralData,
  optionsOrProgress?: AudioProjectionOptions | ((progress: number) => void),
  onProgress?: (progress: number) => void
): Promise<ImportedAudioInfo> {
  const projection: AudioProjectionOptions = typeof optionsOrProgress === 'function' || !optionsOrProgress
    ? { readMode: 'legacy' }
    : optionsOrProgress;
  const progress = typeof optionsOrProgress === 'function' ? optionsOrProgress : onProgress;
  const readMode: AudioImportReadMode = projection.readMode ?? 'legacy';

  spectralData.clear();
  const width = spectralData.width;
  const height = spectralData.height;
  const dbGrid = await computeSpectralDbGrid(source, width, height, (p) => progress?.(0.08 + p * 0.7));
  const normalized = mapDbGridToUnit(dbGrid);
  const transientEnvelope = computeTransientEnvelope(source, width);

  for (let y = 0; y < height; y++) {
    const tonalGrain = Math.max(0.15, Math.min(0.95, 0.88 - (y / Math.max(1, height - 1)) * 0.55));
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const norm = normalized[idx] ?? 0;
      const left = x > 0 ? normalized[idx - 1] ?? norm : norm;
      const right = x < width - 1 ? normalized[idx + 1] ?? norm : norm;
      const up = y > 0 ? normalized[idx - width] ?? norm : norm;
      const down = y < height - 1 ? normalized[idx + width] ?? norm : norm;
      const attack = transientEnvelope[x] ?? 0;

      const timeEdge = Math.max(0, Math.abs(norm - left) * 0.7 + Math.abs(right - norm) * 0.7);
      const ridge = Math.max(0, norm - (up + down) * 0.5);
      const contour = clamp(Math.pow(clamp(ridge * 1.8 + timeEdge * 0.95, 0, 1), 0.82) * (0.3 + attack * 0.82 + norm * 0.28), 0, 1);
      const hybrid = clamp(norm * 0.62 + contour * 0.86, 0, 1);

      const amp = readMode === 'legacy' ? norm : readMode === 'transient' ? contour : hybrid;
      spectralData.data[idx] = amp;

      if (amp > 0.001) {
        const transientShortening = readMode === 'legacy' ? 0 : readMode === 'transient' ? 0.24 : 0.12;
        spectralData.grainData[idx] = clamp(tonalGrain - transientShortening * attack - transientShortening * 0.75 * ridge + norm * 0.06, 0.05, 0.95);
      } else {
        spectralData.grainData[idx] = 0.5;
      }
    }
    if (y % 24 === 0) {
      progress?.(0.78 + 0.22 * (y / Math.max(1, height - 1)));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  progress?.(1);

  return {
    originalDuration: source.originalDuration,
    importedDuration: source.importDurationSec,
    sampleRate: source.sampleRate,
    importStartSec: source.importStartSec,
  };
}

export async function importAudioFileToSpectralData(
  file: File,
  spectralData: SpectralData,
  onProgress?: (progress: number) => void
): Promise<ImportedAudioInfo> {
  const asset = await prepareAudioSourceAsset(file, onProgress);
  return importAudioSourceToSpectralData(asset, spectralData, onProgress);
}
