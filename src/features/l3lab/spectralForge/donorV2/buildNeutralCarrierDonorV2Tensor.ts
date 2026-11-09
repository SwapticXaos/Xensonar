import type {
  AnchorRelativeTimbreTensor,
  CarrierAnchorRegime,
  DonorAnchor,
  DonorAnchorPhase,
  DonorRegisterLabel,
  DonorTimbreAtom,
} from '../types/carrierDonorV2Types';

export type NeutralCarrierDonorV2TensorBundle = {
  anchors: DonorAnchor[];
  tensor: AnchorRelativeTimbreTensor;
};

export function buildNeutralCarrierDonorV2Tensor(): NeutralCarrierDonorV2TensorBundle {
  const registers: DonorRegisterLabel[] = ['low', 'mid', 'high'];
  const phases: DonorAnchorPhase[] = ['attack', 'sustain', 'release'];
  const regimes: CarrierAnchorRegime[] = ['tonal', 'cluster', 'noise', 'transient'];
  const centerHzByRegister: Record<DonorRegisterLabel, number> = { low: 110, mid: 440, high: 1760 };
  const atoms: DonorTimbreAtom[] = [];
  const anchors: DonorAnchor[] = [];
  let frameIndex = 0;

  const makeVector = (
    kind: 'envelope' | 'residual' | 'formant' | 'modulation',
    regime: CarrierAnchorRegime,
    phase: DonorAnchorPhase,
    register: DonorRegisterLabel,
    variant: number,
  ) => {
    const length = 32;
    const out = new Float32Array(length);
    const registerCenter = register === 'low' ? 0.22 : register === 'mid' ? 0.48 : 0.74;
    const regimeSpread = regime === 'tonal' ? 0.16 : regime === 'cluster' ? 0.24 : regime === 'noise' ? 0.36 : 0.12;
    const phaseTilt = phase === 'attack' ? 0.12 : phase === 'release' ? -0.08 : 0;
    for (let i = 0; i < length; i += 1) {
      const x = length <= 1 ? 0 : i / (length - 1);
      const distance = Math.abs(x - Math.min(0.95, Math.max(0.05, registerCenter + phaseTilt * 0.18 + (variant - 1) * 0.025)));
      const body = Math.max(0, 1 - distance / Math.max(0.08, regimeSpread));
      const fine = 0.08 * Math.sin((i + 1) * (variant + 1) * 0.73);
      if (kind === 'envelope') out[i] = Math.max(0.04, body * (regime === 'noise' ? 0.55 : 0.86) + 0.08 + fine);
      else if (kind === 'residual') out[i] = Math.max(0.03, (regime === 'noise' ? 0.54 : regime === 'transient' ? 0.32 : 0.14) + body * 0.16 + fine * 0.35);
      else if (kind === 'formant') out[i] = Math.max(0.03, body * (regime === 'cluster' ? 0.56 : 0.42) + 0.08 + fine * 0.25);
      else out[i] = Math.max(0.02, (phase === 'attack' ? 0.44 : phase === 'release' ? 0.18 : 0.26) * body + 0.04 + fine * 0.2);
    }
    return out;
  };

  for (const register of registers) {
    for (const phase of phases) {
      for (const regime of regimes) {
        for (let variant = 0; variant < 3; variant += 1) {
          const id = `neutral-${register}-${phase}-${regime}-${variant}`;
          const centerHz = centerHzByRegister[register] * (1 + (variant - 1) * 0.035);
          anchors.push({
            id: `anchor-${id}`,
            frameIndex,
            centerBin: Math.max(1, Math.min(511, Math.round(Math.log2(Math.max(20, centerHz) / 27.5) * 36 + 24))),
            centerHz,
            bandwidthBins: regime === 'noise' ? 28 : regime === 'cluster' ? 18 : 8,
            bandwidthHz: Math.max(40, centerHz * (regime === 'noise' ? 0.42 : regime === 'cluster' ? 0.24 : 0.08)),
            energy: phase === 'attack' ? 0.72 : phase === 'release' ? 0.44 : 0.6,
            regime,
            phase,
            register,
          });
          atoms.push({
            id,
            anchorId: `anchor-${id}`,
            frameIndex,
            centerHz,
            transientValue: phase === 'attack' || regime === 'transient' ? 0.58 : 0.18,
            register,
            phase,
            regime,
            relativeSpectralEnvelope: makeVector('envelope', regime, phase, register, variant),
            residualBands: makeVector('residual', regime, phase, register, variant),
            formantEnvelope: makeVector('formant', regime, phase, register, variant),
            modulationProfile: makeVector('modulation', regime, phase, register, variant),
            quality: 0.72,
          });
          frameIndex += 1;
        }
      }
    }
  }

  return {
    anchors,
    tensor: {
      atoms,
      registerBoundariesHz: [220, 1760],
      sourceFrameCount: Math.max(1, frameIndex),
      orderedFrames: [],
      orderedSummary: null,
      resonanceFrames: [],
      resonanceSummary: null,
      residualFrames: [],
      residualSummary: null,
      transientFrames: [],
      transientSummary: null,
      leakAuditFrames: [],
      leakAuditSummary: null,
    },
  };
}
