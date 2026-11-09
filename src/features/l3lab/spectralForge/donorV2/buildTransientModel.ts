import type {
  AnchorRelativeTimbreTensor,
  DonorTimbreAtom,
  TransientFrameModel,
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

function phaseBias(phase: DonorTimbreAtom['phase']): number {
  switch (phase) {
    case 'attack':
      return 1;
    case 'sustain':
      return 0.56;
    case 'release':
    default:
      return 0.28;
  }
}

function buildTransientProfile(atom: DonorTimbreAtom): Float32Array {
  const transient = atom.modulationProfile[0] ?? atom.transientValue ?? 0;
  const spread = atom.modulationProfile[1] ?? 0;
  const energySupport = atom.modulationProfile[2] ?? atom.quality ?? 0;
  const continuity = atom.modulationProfile[3] ?? 0;
  return normalize(
    new Float32Array([
      Math.max(0, transient),
      Math.max(0, 1 - continuity),
      Math.max(0, spread),
      Math.max(0, energySupport),
    ]),
  );
}

function estimateTransientStrength(atom: DonorTimbreAtom, profile: Float32Array): number {
  const transient = atom.modulationProfile[0] ?? atom.transientValue ?? 0;
  const contrast = profile[1] ?? 0;
  const support = profile[3] ?? 0;
  return clamp01(transient * 0.54 + phaseBias(atom.phase) * 0.24 + contrast * 0.12 + support * 0.1);
}

function estimateOnsetSharpness(atom: DonorTimbreAtom, profile: Float32Array): number {
  const transient = atom.modulationProfile[0] ?? atom.transientValue ?? 0;
  const contrast = profile[1] ?? 0;
  const attackBias = atom.phase === 'attack' ? 1 : atom.phase === 'sustain' ? 0.55 : 0.25;
  return clamp01(transient * 0.58 + contrast * 0.24 + attackBias * 0.18);
}

function estimateOnsetSpread(atom: DonorTimbreAtom, profile: Float32Array): number {
  const spread = profile[2] ?? 0;
  const transient = atom.modulationProfile[0] ?? atom.transientValue ?? 0;
  return clamp01(spread * (0.7 + transient * 0.3));
}

function estimateDecayTightness(atom: DonorTimbreAtom, profile: Float32Array): number {
  const support = profile[3] ?? 0;
  const contrast = profile[1] ?? 0;
  const phaseFactor = atom.phase === 'release' ? 0.42 : atom.phase === 'sustain' ? 0.68 : 0.84;
  return clamp01(phaseFactor * (0.48 + support * 0.34 + contrast * 0.18));
}

function buildTransientFrame(atom: DonorTimbreAtom): TransientFrameModel {
  const transientProfile = buildTransientProfile(atom);
  return {
    atomId: atom.id,
    anchorId: atom.anchorId,
    register: atom.register,
    phase: atom.phase,
    regime: atom.regime,
    transientStrength: estimateTransientStrength(atom, transientProfile),
    onsetSharpness: estimateOnsetSharpness(atom, transientProfile),
    onsetSpread: estimateOnsetSpread(atom, transientProfile),
    decayTightness: estimateDecayTightness(atom, transientProfile),
    transientProfile,
  };
}

export function buildTransientFrames(
  tensor: AnchorRelativeTimbreTensor,
): TransientFrameModel[] {
  return tensor.atoms.map(buildTransientFrame);
}
