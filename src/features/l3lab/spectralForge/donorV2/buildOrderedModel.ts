import type {
  AnchorRelativeTimbreTensor,
  DonorTimbreAtom,
  OrderedFrameModel,
} from '../types/carrierDonorV2Types';

const ORDERED_PARTIAL_BIN_COUNT = 12;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function sum(values: Float32Array): number {
  let total = 0;
  for (let i = 0; i < values.length; i += 1) total += values[i] ?? 0;
  return total;
}

function mean(values: Float32Array): number {
  if (!values.length) return 0;
  return sum(values) / values.length;
}

function normalize(values: Float32Array): Float32Array {
  const total = sum(values);
  if (total <= 1e-9) return new Float32Array(values.length);
  const out = new Float32Array(values.length);
  for (let i = 0; i < values.length; i += 1) out[i] = (values[i] ?? 0) / total;
  return out;
}

function resampleToFixedBins(source: Float32Array, targetBins: number): Float32Array {
  if (!source.length || targetBins <= 0) return new Float32Array(targetBins);
  const out = new Float32Array(targetBins);
  const maxIndex = source.length - 1;

  for (let i = 0; i < targetBins; i += 1) {
    const t = targetBins === 1 ? 0 : i / (targetBins - 1);
    const sourcePos = t * maxIndex;
    const i0 = Math.floor(sourcePos);
    const i1 = Math.min(maxIndex, i0 + 1);
    const frac = sourcePos - i0;
    out[i] = (source[i0] ?? 0) * (1 - frac) + (source[i1] ?? 0) * frac;
  }

  return out;
}

function estimateSpectralSlope(weights: Float32Array): number {
  if (weights.length < 2) return 0;
  let weightedX = 0;
  let weightedY = 0;
  let weightedXX = 0;
  let weightedXY = 0;
  let total = 0;

  for (let i = 0; i < weights.length; i += 1) {
    const x = i;
    const y = Math.log(Math.max(1e-8, weights[i] ?? 0));
    weightedX += x;
    weightedY += y;
    weightedXX += x * x;
    weightedXY += x * y;
    total += 1;
  }

  const denom = total * weightedXX - weightedX * weightedX;
  if (Math.abs(denom) < 1e-9) return 0;
  return (total * weightedXY - weightedX * weightedY) / denom;
}

function estimateOddEvenBalance(weights: Float32Array): number {
  let odd = 0;
  let even = 0;
  for (let i = 0; i < weights.length; i += 1) {
    if (i % 2 === 0) even += weights[i] ?? 0;
    else odd += weights[i] ?? 0;
  }
  const total = odd + even;
  if (total <= 1e-9) return 0;
  return (odd - even) / total;
}

function estimateOrderedness(weights: Float32Array): number {
  if (!weights.length) return 0;
  const avg = mean(weights);
  let peakMass = 0;
  let valleyMass = 0;

  for (let i = 0; i < weights.length; i += 1) {
    const value = weights[i] ?? 0;
    if (value >= avg) peakMass += value;
    else valleyMass += value;
  }

  const contrast = peakMass > 0 ? (peakMass - valleyMass) / (peakMass + valleyMass + 1e-9) : 0;

  let localVariation = 0;
  for (let i = 1; i < weights.length; i += 1) {
    localVariation += Math.abs((weights[i] ?? 0) - (weights[i - 1] ?? 0));
  }
  const smoothnessPenalty = clamp01(localVariation / Math.max(1e-9, weights.length - 1));

  return clamp01(contrast * (1 - 0.35 * smoothnessPenalty));
}

function estimateInharmonicSpread(weights: Float32Array): number {
  if (weights.length < 3) return 0;

  let curvature = 0;
  for (let i = 1; i < weights.length - 1; i += 1) {
    const prev = weights[i - 1] ?? 0;
    const curr = weights[i] ?? 0;
    const next = weights[i + 1] ?? 0;
    curvature += Math.abs((prev + next) * 0.5 - curr);
  }

  return clamp01(curvature / (weights.length - 2));
}

function buildOrderedFrame(atom: DonorTimbreAtom): OrderedFrameModel {
  const partialWeights = normalize(
    resampleToFixedBins(atom.relativeSpectralEnvelope, ORDERED_PARTIAL_BIN_COUNT),
  );

  const partialBins = new Float32Array(ORDERED_PARTIAL_BIN_COUNT);
  for (let i = 0; i < ORDERED_PARTIAL_BIN_COUNT; i += 1) {
    partialBins[i] = i + 1;
  }

  return {
    atomId: atom.id,
    anchorId: atom.anchorId,
    register: atom.register,
    phase: atom.phase,
    regime: atom.regime,

    orderedness: estimateOrderedness(partialWeights),
    partialBins,
    partialWeights,
    spectralSlope: estimateSpectralSlope(partialWeights),
    oddEvenBalance: estimateOddEvenBalance(partialWeights),
    inharmonicSpread: estimateInharmonicSpread(partialWeights),
  };
}

export function buildOrderedFrames(
  tensor: AnchorRelativeTimbreTensor,
): OrderedFrameModel[] {
  return tensor.atoms.map(buildOrderedFrame);
}
