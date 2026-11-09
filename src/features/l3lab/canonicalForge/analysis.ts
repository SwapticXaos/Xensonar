import { SpectralData } from '../spectralForge/audio/SpectralData';
import type { AudioSourceAsset, AudioSourceAnalysisCache } from '../spectralForge/audio/AudioImporterTypes';

export type CanonicalSourceView =
  | 'energy'
  | 'transient'
  | 'harmonic'
  | 'noise'
  | 'contour'
  | 'synesthetic'
  | 'lowBand'
  | 'air'
  | 'stereo'
  | 'pulse';

export interface CanonicalAnalysisBundle {
  source: AudioSourceAsset;
  width: number;
  height: number;
  energy: Float32Array;
  transient: Float32Array;
  harmonic: Float32Array;
  noise: Float32Array;
  contour: Float32Array;
  synesthetic: Float32Array;
  lowBand: Float32Array;
  air: Float32Array;
  stereo: Float32Array;
  pulse: Float32Array;
  flux: Float32Array;
  centroid: Float32Array;
  waveform: Float32Array;
  stereoEnvelope: Float32Array;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function sampleGrid(data: Float32Array, width: number, height: number, x: number, y: number) {
  if (width <= 0 || height <= 0) return 0;
  const sx = clamp(x, 0, width - 1);
  const sy = clamp(y, 0, height - 1);
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = sx - x0;
  const ty = sy - y0;
  const v00 = data[y0 * width + x0] ?? 0;
  const v10 = data[y0 * width + x1] ?? 0;
  const v01 = data[y1 * width + x0] ?? 0;
  const v11 = data[y1 * width + x1] ?? 0;
  return v00 * (1 - tx) * (1 - ty) + v10 * tx * (1 - ty) + v01 * (1 - tx) * ty + v11 * tx * ty;
}

function resampleGrid(cache: AudioSourceAnalysisCache, targetWidth: number, targetHeight: number) {
  const out = new Float32Array(targetWidth * targetHeight);
  for (let y = 0; y < targetHeight; y++) {
    const sy = (y / Math.max(1, targetHeight - 1)) * (cache.height - 1);
    for (let x = 0; x < targetWidth; x++) {
      const sx = (x / Math.max(1, targetWidth - 1)) * (cache.width - 1);
      out[y * targetWidth + x] = sampleGrid(cache.data, cache.width, cache.height, sx, sy);
    }
  }
  return out;
}

function resampleEnvelope(envelope: Float32Array, targetWidth: number) {
  const out = new Float32Array(targetWidth);
  const srcWidth = envelope.length;
  if (srcWidth <= 0) return out;
  for (let x = 0; x < targetWidth; x++) {
    const sx = (x / Math.max(1, targetWidth - 1)) * Math.max(0, srcWidth - 1);
    const x0 = Math.floor(sx);
    const x1 = Math.min(srcWidth - 1, x0 + 1);
    const t = sx - x0;
    const a = envelope[x0] ?? 0;
    const b = envelope[x1] ?? 0;
    out[x] = a + (b - a) * t;
  }
  return out;
}

function normalizeField(field: Float32Array) {
  let max = 0;
  for (let i = 0; i < field.length; i++) max = Math.max(max, field[i] ?? 0);
  if (max <= 1e-6) return field;
  const out = new Float32Array(field.length);
  for (let i = 0; i < field.length; i++) out[i] = clamp(field[i] / max);
  return out;
}

function softenField(field: Float32Array, width: number, height: number, passes = 1) {
  let src = field;
  for (let pass = 0; pass < passes; pass++) {
    const out = new Float32Array(src.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let weightSum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const sx = Math.max(0, Math.min(width - 1, x + dx));
            const sy = Math.max(0, Math.min(height - 1, y + dy));
            const weight = dx === 0 && dy === 0 ? 4 : Math.abs(dx) + Math.abs(dy) === 2 ? 1 : 2;
            sum += (src[sy * width + sx] ?? 0) * weight;
            weightSum += weight;
          }
        }
        out[y * width + x] = weightSum > 0 ? sum / weightSum : 0;
      }
    }
    src = out;
  }
  return src;
}

export function buildCanonicalAnalysisBundle(source: AudioSourceAsset, targetWidth = 1536, targetHeight = 384): CanonicalAnalysisBundle {
  const cache = source.analysisCache;
  if (!cache) throw new Error('Canonical bundle requires source.analysisCache');

  const energy = resampleGrid(cache, targetWidth, targetHeight);
  const transientEnvelope = resampleEnvelope(cache.transientEnvelope, targetWidth);
  const waveformEnvelope = resampleEnvelope(source.waveformPreview, targetWidth);
  const stereoEnvelope = resampleEnvelope(source.stereoWidthPreview, targetWidth);

  const transient = new Float32Array(targetWidth * targetHeight);
  const harmonic = new Float32Array(targetWidth * targetHeight);
  const noise = new Float32Array(targetWidth * targetHeight);
  const contour = new Float32Array(targetWidth * targetHeight);
  const synesthetic = new Float32Array(targetWidth * targetHeight);
  const lowBand = new Float32Array(targetWidth * targetHeight);
  const air = new Float32Array(targetWidth * targetHeight);
  const stereo = new Float32Array(targetWidth * targetHeight);
  const pulse = new Float32Array(targetWidth * targetHeight);
  const flux = new Float32Array(targetWidth);
  const centroid = new Float32Array(targetWidth);

  for (let x = 0; x < targetWidth; x++) {
    let last = 0;
    let energySum = 0;
    let centroidSum = 0;
    const attack = transientEnvelope[x] ?? 0;
    const waveform = waveformEnvelope[x] ?? 0;
    const stereoWidth = stereoEnvelope[x] ?? 0;
    for (let y = 0; y < targetHeight; y++) {
      const idx = y * targetWidth + x;
      const norm = energy[idx] ?? 0;
      const left = x > 0 ? energy[idx - 1] ?? norm : norm;
      const right = x < targetWidth - 1 ? energy[idx + 1] ?? norm : norm;
      const up = y > 0 ? energy[idx - targetWidth] ?? norm : norm;
      const down = y < targetHeight - 1 ? energy[idx + targetWidth] ?? norm : norm;
      const yNorm = y / Math.max(1, targetHeight - 1);
      const tonal = 1 - yNorm;
      const airy = yNorm;
      const centerBias = 1 - Math.abs(yNorm - 0.5) * 2;
      const timeEdge = Math.abs(norm - left) * 0.72 + Math.abs(right - norm) * 0.72;
      const verticalEdge = Math.abs(norm - up) * 0.5 + Math.abs(down - norm) * 0.5;
      const ridge = Math.max(0, norm - (up + down) * 0.5);
      const smoothVertical = 1 - clamp(verticalEdge * 1.45);
      const timeStability = 1 - clamp(timeEdge * 1.25);

      transient[idx] = clamp(norm * (0.18 + attack * 1.24 + waveform * 0.18) + timeEdge * 0.48);
      harmonic[idx] = clamp(norm * (0.28 + tonal * 0.22 + smoothVertical * 0.78 + timeStability * 0.28) + ridge * 0.42 - attack * 0.08);
      noise[idx] = clamp(norm * (0.18 + airy * 0.18) + timeEdge * 0.74 + verticalEdge * 0.52 + attack * 0.14);
      contour[idx] = clamp(Math.pow(clamp(ridge * 1.08 + Math.max(timeEdge, verticalEdge) * 1.34, 0, 1), 0.88));
      lowBand[idx] = clamp(norm * (0.16 + tonal * 1.08) + waveform * 0.18 - airy * 0.08);
      air[idx] = clamp(norm * (0.1 + airy * 1.1) + verticalEdge * 0.22 + timeEdge * 0.1);
      stereo[idx] = clamp(norm * (0.18 + stereoWidth * 0.92) * (0.55 + centerBias * 0.25 + airy * 0.2));
      pulse[idx] = clamp(norm * (0.2 + attack * 0.92 + waveform * 0.28) + timeEdge * 0.18 + tonal * waveform * 0.22);
      synesthetic[idx] = clamp(
        norm * 0.28 +
        harmonic[idx] * 0.16 +
        transient[idx] * 0.15 +
        contour[idx] * 0.12 +
        lowBand[idx] * 0.11 +
        air[idx] * 0.07 +
        stereo[idx] * 0.06 +
        pulse[idx] * 0.08 +
        noise[idx] * 0.05
      );

      flux[x] += Math.abs(norm - last);
      last = norm;
      energySum += norm;
      centroidSum += norm * tonal;
    }
    centroid[x] = energySum > 1e-6 ? centroidSum / energySum : 0;
    flux[x] = clamp(flux[x]);
  }

  return {
    source,
    width: targetWidth,
    height: targetHeight,
    energy: normalizeField(energy),
    transient: normalizeField(transient),
    harmonic: normalizeField(harmonic),
    noise: normalizeField(noise),
    contour: normalizeField(contour),
    synesthetic: normalizeField(softenField(synesthetic, targetWidth, targetHeight, 1)),
    lowBand: normalizeField(lowBand),
    air: normalizeField(air),
    stereo: normalizeField(stereo),
    pulse: normalizeField(pulse),
    flux: normalizeField(flux),
    centroid: normalizeField(centroid),
    waveform: normalizeField(waveformEnvelope),
    stereoEnvelope: normalizeField(stereoEnvelope),
  };
}

export function getCanonicalViewData(bundle: CanonicalAnalysisBundle, view: CanonicalSourceView) {
  switch (view) {
    case 'energy': return bundle.energy;
    case 'transient': return bundle.transient;
    case 'harmonic': return bundle.harmonic;
    case 'noise': return bundle.noise;
    case 'contour': return bundle.contour;
    case 'lowBand': return bundle.lowBand;
    case 'air': return bundle.air;
    case 'stereo': return bundle.stereo;
    case 'pulse': return bundle.pulse;
    case 'synesthetic':
    default:
      return bundle.synesthetic;
  }
}

export function buildSpectralDataFromBundle(bundle: CanonicalAnalysisBundle, view: CanonicalSourceView) {
  const source = getCanonicalViewData(bundle, view);
  const spectralData = new SpectralData(bundle.width, bundle.height);
  for (let y = 0; y < bundle.height; y++) {
    const tonalBias = 1 - y / Math.max(1, bundle.height - 1);
    for (let x = 0; x < bundle.width; x++) {
      const idx = y * bundle.width + x;
      const amp = source[idx] ?? 0;
      const transient = bundle.transient[idx] ?? 0;
      const harmonic = bundle.harmonic[idx] ?? 0;
      const noise = bundle.noise[idx] ?? 0;
      const air = bundle.air[idx] ?? 0;
      const pulse = bundle.pulse[idx] ?? 0;
      spectralData.data[idx] = amp;
      spectralData.grainData[idx] = clamp(0.14 + tonalBias * 0.28 + harmonic * 0.28 + air * 0.12 - transient * 0.18 - noise * 0.14 + pulse * 0.08, 0.05, 0.95);
    }
  }
  return spectralData;
}

export function cloneSpectralData(input: SpectralData) {
  const out = new SpectralData(input.width, input.height);
  out.data.set(input.data);
  out.grainData.set(input.grainData);
  return out;
}

export function sampleCanonicalView(bundle: CanonicalAnalysisBundle, view: CanonicalSourceView, x: number, y: number) {
  const data = getCanonicalViewData(bundle, view);
  return sampleGrid(data, bundle.width, bundle.height, x, y);
}

export function buildCompositeCanonicalData(bundle: CanonicalAnalysisBundle, primary: CanonicalSourceView, secondary: CanonicalSourceView | 'none', blend: number) {
  const primaryData = getCanonicalViewData(bundle, primary);
  if (!secondary || secondary === 'none' || blend <= 0) return primaryData;
  const secondaryData = getCanonicalViewData(bundle, secondary);
  const out = new Float32Array(primaryData.length);
  const b = clamp(blend, 0, 1);
  const a = 1 - b;
  for (let i = 0; i < out.length; i++) {
    out[i] = clamp((primaryData[i] ?? 0) * a + (secondaryData[i] ?? 0) * b);
  }
  return out;
}

export function buildSpectralDataFromComposite(bundle: CanonicalAnalysisBundle, primary: CanonicalSourceView, secondary: CanonicalSourceView | 'none', blend: number) {
  const source = buildCompositeCanonicalData(bundle, primary, secondary, blend);
  const spectralData = new SpectralData(bundle.width, bundle.height);
  for (let y = 0; y < bundle.height; y++) {
    const tonalBias = 1 - y / Math.max(1, bundle.height - 1);
    for (let x = 0; x < bundle.width; x++) {
      const idx = y * bundle.width + x;
      const amp = source[idx] ?? 0;
      const transient = bundle.transient[idx] ?? 0;
      const harmonic = bundle.harmonic[idx] ?? 0;
      const stereo = bundle.stereo[idx] ?? 0;
      const pulse = bundle.pulse[idx] ?? 0;
      spectralData.data[idx] = amp;
      spectralData.grainData[idx] = clamp(0.12 + tonalBias * 0.22 + harmonic * 0.22 + stereo * 0.12 + pulse * 0.14 - transient * 0.14, 0.05, 0.95);
    }
  }
  return spectralData;
}
