import type { AudioSourceAsset } from '../audio/AudioImporter';
import { buildOrderedFrames } from './buildOrderedModel';
import { buildResonanceFrames } from './buildResonanceModel';
import { buildResidualFrames } from './buildResidualModel';
import { buildTransientFrames } from './buildTransientModel';
import { buildLeakAuditFrames, summarizeLeakAuditFrames } from './buildLeakAuditModel';
import { summarizeOrderedModels } from './orderedDiagnostics';
import { summarizeResonanceModels } from './resonanceDiagnostics';
import { summarizeResidualModels } from './residualDiagnostics';
import { summarizeTransientModels } from './transientDiagnostics';
import type { AnchorRelativeTimbreTensor, DonorAnchor, DonorTimbreAtom } from '../types/carrierDonorV2Types';

export type BuildAnchorRelativeTimbreTensorOptions = {
  envelopeRadiusBins?: number;
  formantSmoothingRadius?: number;
  residualBandCount?: number;
  minAtomQuality?: number;
};

const DEFAULT_OPTIONS: Required<BuildAnchorRelativeTimbreTensorOptions> = {
  envelopeRadiusBins: 18,
  formantSmoothingRadius: 2,
  residualBandCount: 12,
  minAtomQuality: 0.08,
};

function getAnalysisCacheOrThrow(source: AudioSourceAsset) {
  if (!source.analysisCache) {
    throw new Error('Donor timbre tensor requires analysisCache');
  }
  return source.analysisCache;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sampleColumn(data: Float32Array, width: number, height: number, x: number): Float32Array {
  const out = new Float32Array(height);
  for (let y = 0; y < height; y += 1) out[y] = data[y * width + x] ?? 0;
  return out;
}

function smoothVector(values: Float32Array, radius: number): Float32Array {
  if (radius <= 0) return values.slice();
  const out = new Float32Array(values.length);
  for (let i = 0; i < values.length; i += 1) {
    let weighted = 0;
    let weightSum = 0;
    for (let di = -radius; di <= radius; di += 1) {
      const ii = i + di;
      if (ii < 0 || ii >= values.length) continue;
      const weight = radius + 1 - Math.abs(di);
      weighted += values[ii] * weight;
      weightSum += weight;
    }
    out[i] = weightSum > 0 ? weighted / weightSum : values[i];
  }
  return out;
}

function normalizeInPlace(values: Float32Array) {
  let maxVal = 0;
  for (let i = 0; i < values.length; i += 1) maxVal = Math.max(maxVal, values[i] ?? 0);
  if (maxVal <= 1e-6) return values;
  for (let i = 0; i < values.length; i += 1) values[i] = (values[i] ?? 0) / maxVal;
  return values;
}

function buildResidualBands(column: Float32Array, centerBin: number, radius: number, bandCount: number): Float32Array {
  const bands = new Float32Array(bandCount);
  const stride = Math.max(1, Math.floor(column.length / bandCount));
  for (let band = 0; band < bandCount; band += 1) {
    const start = band * stride;
    const end = band === bandCount - 1 ? column.length : Math.min(column.length, start + stride);
    let sum = 0;
    let count = 0;
    for (let y = start; y < end; y += 1) {
      if (Math.abs(y - centerBin) <= radius) continue;
      sum += column[y] ?? 0;
      count += 1;
    }
    bands[band] = count > 0 ? sum / count : 0;
  }
  return normalizeInPlace(bands);
}

function buildEnvelope(column: Float32Array, centerBin: number, radius: number): Float32Array {
  const size = radius * 2 + 1;
  const out = new Float32Array(size);
  for (let i = 0; i < size; i += 1) {
    const offset = i - radius;
    const yy = clamp(centerBin + offset, 0, column.length - 1);
    out[i] = column[yy] ?? 0;
  }
  return normalizeInPlace(out);
}

function estimateQuality(anchorEnergy: number, residualBands: Float32Array, transientValue: number, envelope: Float32Array): number {
  let residualMean = 0;
  for (let i = 0; i < residualBands.length; i += 1) residualMean += residualBands[i] ?? 0;
  residualMean /= Math.max(1, residualBands.length);
  let envelopeSpread = 0;
  for (let i = 0; i < envelope.length; i += 1) envelopeSpread += envelope[i] ?? 0;
  envelopeSpread /= Math.max(1, envelope.length);
  const quality = anchorEnergy * 0.5 + transientValue * 0.18 + envelopeSpread * 0.18 + (1 - residualMean) * 0.14;
  return clamp(quality, 0, 1);
}

export function buildAnchorRelativeTimbreTensor(
  source: AudioSourceAsset,
  anchors: DonorAnchor[],
  options?: BuildAnchorRelativeTimbreTensorOptions,
): AnchorRelativeTimbreTensor {
  const cfg = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
  const cache = getAnalysisCacheOrThrow(source);
  const { width, height, data, transientEnvelope } = cache;
  const atoms: DonorTimbreAtom[] = [];

  for (const anchor of anchors) {
    const column = sampleColumn(data, width, height, anchor.frameIndex);
    const relativeSpectralEnvelope = buildEnvelope(column, anchor.centerBin, cfg.envelopeRadiusBins);
    const formantEnvelope = smoothVector(relativeSpectralEnvelope, cfg.formantSmoothingRadius);
    normalizeInPlace(formantEnvelope);
    const residualBands = buildResidualBands(column, anchor.centerBin, Math.max(2, Math.floor(anchor.bandwidthBins * 0.5)), cfg.residualBandCount);
    const transientValue = transientEnvelope[anchor.frameIndex] ?? 0;
    const modulationProfile = new Float32Array([
      transientValue,
      Math.min(1, anchor.bandwidthBins / 24),
      anchor.energy,
      Math.max(0, 1 - Math.abs((transientEnvelope[Math.max(0, anchor.frameIndex - 1)] ?? transientValue) - (transientEnvelope[Math.min(transientEnvelope.length - 1, anchor.frameIndex + 1)] ?? transientValue))),
    ]);
    const quality = estimateQuality(anchor.energy, residualBands, transientValue, relativeSpectralEnvelope);
    if (quality < cfg.minAtomQuality) continue;
    atoms.push({
      id: `timbre-atom-${anchor.id}`,
      anchorId: anchor.id,
      frameIndex: anchor.frameIndex,
      centerHz: anchor.centerHz,
      transientValue,
      register: anchor.register,
      phase: anchor.phase,
      regime: anchor.regime,
      relativeSpectralEnvelope,
      residualBands,
      formantEnvelope,
      modulationProfile,
      quality,
    });
  }

  const tensorBase = {
    atoms,
    registerBoundariesHz: [220, 1760],
    sourceFrameCount: width,
  } satisfies Pick<AnchorRelativeTimbreTensor, 'atoms' | 'registerBoundariesHz' | 'sourceFrameCount'>;

  const orderedFrames = buildOrderedFrames(tensorBase);
  const orderedSummary = summarizeOrderedModels(orderedFrames, []);
  const resonanceFrames = buildResonanceFrames(tensorBase);
  const resonanceSummary = summarizeResonanceModels(resonanceFrames, []);
  const residualFrames = buildResidualFrames(tensorBase);
  const residualSummary = summarizeResidualModels(residualFrames, []);
  const transientFrames = buildTransientFrames(tensorBase);
  const transientSummary = summarizeTransientModels(transientFrames, []);
  const leakAuditTensor = {
    ...tensorBase,
    orderedFrames,
    resonanceFrames,
    residualFrames,
    transientFrames,
  } satisfies AnchorRelativeTimbreTensor;
  const leakAuditFrames = buildLeakAuditFrames(leakAuditTensor);
  const leakAuditSummary = summarizeLeakAuditFrames(leakAuditFrames);

  return {
    ...tensorBase,
    orderedFrames,
    orderedSummary,
    resonanceFrames,
    resonanceSummary,
    residualFrames,
    residualSummary,
    transientFrames,
    transientSummary,
    leakAuditFrames,
    leakAuditSummary,
  };
}
