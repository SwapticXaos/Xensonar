import type {
  AnchorRelativeTimbreTensor,
  DonorTimbreAtom,
  ResonanceFrameModel,
} from '../types/carrierDonorV2Types';

const RESONANCE_PROFILE_BIN_COUNT = 16;
const RESONANCE_PEAK_COUNT = 3;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function sum(values: Float32Array): number {
  let total = 0;
  for (let i = 0; i < values.length; i += 1) total += values[i] ?? 0;
  return total;
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

function centroid(profile: Float32Array): number {
  const total = sum(profile);
  if (total <= 1e-9) return 0.5;
  let weighted = 0;
  for (let i = 0; i < profile.length; i += 1) {
    const x = profile.length === 1 ? 0.5 : i / (profile.length - 1);
    weighted += x * (profile[i] ?? 0);
  }
  return clamp01(weighted / total);
}

function baseline(profile: Float32Array): number {
  if (!profile.length) return 0;
  const sorted = Array.from(profile).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) * 0.5
    : sorted[mid] ?? 0;
}

type Peak = {
  index: number;
  prominence: number;
  width: number;
};

function findResonancePeaks(profile: Float32Array): Peak[] {
  const floor = baseline(profile);
  const peaks: Peak[] = [];

  for (let i = 0; i < profile.length; i += 1) {
    const prev = i > 0 ? profile[i - 1] ?? profile[i] ?? 0 : profile[i] ?? 0;
    const curr = profile[i] ?? 0;
    const next = i < profile.length - 1 ? profile[i + 1] ?? curr : curr;
    if (curr < prev || curr < next || curr <= floor) continue;

    const prominence = Math.max(0, curr - floor);
    const halfHeight = floor + prominence * 0.5;

    let left = i;
    while (left > 0 && (profile[left - 1] ?? 0) >= halfHeight) left -= 1;
    let right = i;
    while (right < profile.length - 1 && (profile[right + 1] ?? 0) >= halfHeight) right += 1;

    const width = Math.max(1, right - left + 1);
    peaks.push({ index: i, prominence, width });
  }

  peaks.sort((a, b) => b.prominence - a.prominence);
  return peaks.slice(0, RESONANCE_PEAK_COUNT);
}

function estimateResonanceStrength(profile: Float32Array, peaks: Peak[]): number {
  if (!profile.length || !peaks.length) return 0;
  const peakMass = peaks.reduce((acc, peak) => acc + peak.prominence, 0);
  const total = sum(profile);
  if (total <= 1e-9) return 0;
  return clamp01((peakMass / total) * 1.8);
}

function estimateResonanceSharpness(peaks: Peak[]): number {
  if (!peaks.length) return 0;
  let weighted = 0;
  let total = 0;
  for (const peak of peaks) {
    const sharpness = 1 / Math.max(1, peak.width);
    weighted += sharpness * peak.prominence;
    total += peak.prominence;
  }
  if (total <= 1e-9) return 0;
  return clamp01((weighted / total) * 4);
}

function peaksToArrays(peaks: Peak[]): {
  centers: Float32Array;
  weights: Float32Array;
  widths: Float32Array;
} {
  const centers = new Float32Array(RESONANCE_PEAK_COUNT);
  const weights = new Float32Array(RESONANCE_PEAK_COUNT);
  const widths = new Float32Array(RESONANCE_PEAK_COUNT);

  for (let i = 0; i < RESONANCE_PEAK_COUNT; i += 1) {
    const peak = peaks[i];
    if (!peak) continue;
    centers[i] = peak.index / (RESONANCE_PROFILE_BIN_COUNT - 1);
    weights[i] = peak.prominence;
    widths[i] = peak.width / RESONANCE_PROFILE_BIN_COUNT;
  }

  return {
    centers,
    weights: normalize(weights),
    widths,
  };
}

function buildResonanceFrame(atom: DonorTimbreAtom): ResonanceFrameModel {
  const resonanceProfile = normalize(
    resampleToFixedBins(atom.formantEnvelope.length ? atom.formantEnvelope : atom.relativeSpectralEnvelope, RESONANCE_PROFILE_BIN_COUNT),
  );
  const peaks = findResonancePeaks(resonanceProfile);
  const arrays = peaksToArrays(peaks);

  return {
    atomId: atom.id,
    anchorId: atom.anchorId,
    register: atom.register,
    phase: atom.phase,
    regime: atom.regime,
    resonanceStrength: estimateResonanceStrength(resonanceProfile, peaks),
    bodyCentroid: centroid(resonanceProfile),
    resonanceSharpness: estimateResonanceSharpness(peaks),
    resonanceProfile,
    peakCenters: arrays.centers,
    peakWeights: arrays.weights,
    peakWidths: arrays.widths,
  };
}

export function buildResonanceFrames(
  tensor: AnchorRelativeTimbreTensor,
): ResonanceFrameModel[] {
  return tensor.atoms.map(buildResonanceFrame);
}
