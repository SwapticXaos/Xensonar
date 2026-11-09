import type { MorphMode, SpectralData } from '../spectralForge/audio/SpectralData';
import {
  sampleCanonicalView,
  type CanonicalAnalysisBundle,
  type CanonicalSourceView,
} from './analysis';
import { clamp01 } from './loopDrumDomain';

export function applyCanonicalSourceAwareBrush(args: {
  cellX: number;
  cellY: number;
  bundle: CanonicalAnalysisBundle | null;
  bundleView: CanonicalSourceView;
  sourceView: CanonicalSourceView;
  spectralData: SpectralData;
  brushSize: number;
  hardness: number;
  intensity: number;
  sampleActiveSource: (x: number, y: number) => number;
  gain?: number;
  erase?: boolean;
}) {
  if (!args.bundle) return;
  const radius = Math.max(2, Math.round(args.brushSize));
  const r = Math.ceil(radius);
  const gain = args.gain ?? 1;
  const erase = args.erase ?? false;
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;
      const falloff = args.hardness >= 1
        ? 1
        : Math.exp(-((dist / radius) ** 2) / (2 * Math.max(0.08, 1 - args.hardness * 0.9) * 0.15));
      const x = args.cellX + dx;
      const y = args.cellY + dy;
      if (x < 0 || x >= args.spectralData.width || y < 0 || y >= args.spectralData.height) continue;
      const sample = args.bundleView === args.sourceView
        ? args.sampleActiveSource(x, y)
        : sampleCanonicalView(args.bundle, args.bundleView, x, y);
      const amount = sample * args.intensity * gain * falloff;
      if (erase) args.spectralData.subtract(x, y, amount);
      else args.spectralData.add(x, y, amount);
      const idx = y * args.spectralData.width + x;
      const harmonicVal = sampleCanonicalView(args.bundle, 'harmonic', x, y);
      const transientVal = sampleCanonicalView(args.bundle, 'transient', x, y);
      const noiseVal = sampleCanonicalView(args.bundle, 'noise', x, y);
      args.spectralData.grainData[idx] = clamp01(0.14 + harmonicVal * 0.54 - transientVal * 0.18 - noiseVal * 0.12);
    }
  }
}

export function applyCanonicalNoiseGate(args: {
  cellX: number;
  cellY: number;
  spectralData: SpectralData;
  brushSize: number;
  intensity: number;
  eraseMode: boolean;
}) {
  const radius = Math.max(2, Math.round(args.brushSize));
  const threshold = clamp01(args.intensity * 0.7 + 0.08);
  const r = Math.ceil(radius);
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;
      const x = args.cellX + dx;
      const y = args.cellY + dy;
      if (x < 0 || x >= args.spectralData.width || y < 0 || y >= args.spectralData.height) continue;
      const idx = y * args.spectralData.width + x;
      const current = args.spectralData.data[idx] ?? 0;
      if (!args.eraseMode) {
        if (current < threshold) {
          args.spectralData.data[idx] = 0;
          args.spectralData.grainData[idx] = 0.5;
        }
      } else {
        args.spectralData.data[idx] = clamp01(current + (threshold - current) * 0.18);
      }
    }
  }
}

export function applyCanonicalMorphWarpField(args: {
  cellX: number;
  spectralData: SpectralData;
  brushSize: number;
  intensity: number;
  morphMode: MorphMode;
  dragDX: number;
  dragDY: number;
  ensureWarpFields: () => { time: number[]; pitch: number[] };
}) {
  const { time, pitch } = args.ensureWarpFields();
  const radius = Math.max(2, args.brushSize);
  const safeAmount = Math.max(0, Math.min(1, args.intensity));
  const maxTimeCols = Math.max(6, args.spectralData.width * 0.12);
  const r = Math.ceil(radius);
  let changed = false;
  for (let x = Math.max(0, args.cellX - r); x <= Math.min(args.spectralData.width - 1, args.cellX + r); x += 1) {
    const nx = (x - args.cellX) / Math.max(1, radius);
    const radial = Math.max(0, 1 - Math.abs(nx));
    const falloff = radial * radial;
    let timeDeltaCols = 0;
    let pitchDelta = 0;
    if (args.morphMode === 'push') {
      timeDeltaCols = args.dragDX * safeAmount * falloff * 0.88;
      pitchDelta = (-args.dragDY / Math.max(1, args.spectralData.height - 1)) * 18 * falloff;
    } else if (args.morphMode === 'pinch' || args.morphMode === 'bloat') {
      const factor = args.morphMode === 'pinch' ? 0.58 : -0.42;
      timeDeltaCols = nx * safeAmount * falloff * radius * factor;
    } else if (args.morphMode === 'twirlCW' || args.morphMode === 'twirlCCW') {
      const sign = args.morphMode === 'twirlCW' ? -1 : 1;
      timeDeltaCols = sign * (-nx) * safeAmount * falloff * radius * 0.22;
      pitchDelta = sign * nx * safeAmount * falloff * 3.5;
    }
    if (Math.abs(timeDeltaCols) > 0.0001) {
      time[x] = Math.max(-maxTimeCols, Math.min(maxTimeCols, (time[x] ?? 0) + timeDeltaCols));
      changed = true;
    }
    if (Math.abs(pitchDelta) > 0.0001) {
      pitch[x] = Math.max(-12, Math.min(12, (pitch[x] ?? 0) + pitchDelta));
      changed = true;
    }
  }
  return changed;
}
