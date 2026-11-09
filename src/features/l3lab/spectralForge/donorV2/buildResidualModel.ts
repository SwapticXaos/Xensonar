import type {
  AnchorRelativeTimbreTensor,
  DonorTimbreAtom,
  ResidualFrameModel,
} from '../types/carrierDonorV2Types';

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

function spectralFlatness(profile: Float32Array): number {
  if (!profile.length) return 0;
  let geometric = 0;
  let arithmetic = 0;
  for (let i = 0; i < profile.length; i += 1) {
    const value = Math.max(1e-8, profile[i] ?? 0);
    geometric += Math.log(value);
    arithmetic += value;
  }
  geometric = Math.exp(geometric / profile.length);
  arithmetic /= profile.length;
  if (arithmetic <= 1e-9) return 0;
  return clamp01(geometric / arithmetic);
}

function baseline(profile: Float32Array): number {
  if (!profile.length) return 0;
  const sorted = Array.from(profile).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) * 0.5
    : sorted[mid] ?? 0;
}

function estimateResidualStrength(profile: Float32Array, flatness: number): number {
  if (!profile.length) return 0;
  const floor = baseline(profile);
  let active = 0;
  for (let i = 0; i < profile.length; i += 1) {
    if ((profile[i] ?? 0) > floor * 1.12) active += 1;
  }
  const coverage = active / profile.length;
  return clamp01(flatness * 0.62 + coverage * 0.38);
}

function buildResidualFrame(atom: DonorTimbreAtom): ResidualFrameModel {
  const residualProfile = normalize(atom.residualBands);
  const residualFlatness = spectralFlatness(residualProfile);
  return {
    atomId: atom.id,
    anchorId: atom.anchorId,
    register: atom.register,
    phase: atom.phase,
    regime: atom.regime,
    residualStrength: estimateResidualStrength(residualProfile, residualFlatness),
    noiseColorCentroid: centroid(residualProfile),
    residualFlatness,
    residualProfile,
  };
}

export function buildResidualFrames(
  tensor: AnchorRelativeTimbreTensor,
): ResidualFrameModel[] {
  return tensor.atoms.map(buildResidualFrame);
}
