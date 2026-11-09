import type { SpectralData } from '../audio/SpectralData';
import type { CarrierIntegralSynthLabSelection } from './carrierIntegralSynthLab';
import type { CarrierIntegralHarmonicXploreProfile } from './carrierIntegralHarmonicXploreLens';
import type { CarrierIntegralHarmonicXploreDirectBuffer } from './carrierIntegralHarmonicXploreDirectEngine';
import {
  renderCarrierIntegralSpektralSynthesePreviewBuffer,
  buildSpektralSyntheseParamsHash,
  type SpektralSyntheseBodyRenderVariant,
} from './carrierIntegralSpektralSyntheseEngine';
import type { SpektralSyntheseRenderModifiers } from './carrierIntegralSpektralSyntheseRenderModifiers';
import type { SpektralStochasticConfig } from './carrierIntegralSpektralSyntheseStochastic';
import {
  type DonorTimbreDescriptor,
  FALLBACK_DONOR_TIMBRE_DESCRIPTOR,
} from './carrierIntegralDonorTimbreDescriptor';
import { carrierIntegralRound3 } from './carrierIntegralStableIdentity';

export type RenderCarrierIntegralDonatelloArgs = {
  spectralData?: SpectralData | null;
  synthLab: CarrierIntegralSynthLabSelection;
  durationSec: number;
  previewDurationSec: number;
  rootHz: number;
  gain: number;
  sampleRate?: number;
  onProgress?: (progress: number) => void;
  cooperative?: boolean;
  stochastic?: SpektralStochasticConfig | null;
  donorTimbre?: DonorTimbreDescriptor | null;
};

const clamp = (value: number, min: number, max: number): number => (
  !Number.isFinite(value) ? min : value < min ? min : value > max ? max : value
);
const unit3 = (value: number): number => carrierIntegralRound3(clamp(value, 0, 1));
const range3 = (value: number, min: number, max: number): number => carrierIntegralRound3(clamp(value, min, max));

function tintDonatelloProfile(
  profile: CarrierIntegralHarmonicXploreProfile,
  donor: DonorTimbreDescriptor,
): CarrierIntegralHarmonicXploreProfile {
  const donorFlat = donor.spectralFlatness;
  const timbreFlavor = donor.transientDensity > 0.62 && profile.timbreFlavor === 'resonator'
    ? 'bell'
    : donor.harmonicity > 0.74 && donor.transientDensity < 0.22 && profile.timbreFlavor === 'scatter'
      ? 'warm'
      : donorFlat > 0.68 && !['bell', 'warm', 'metallic'].includes(profile.timbreFlavor ?? '')
        ? 'metallic'
        : profile.timbreFlavor;
  return {
    ...profile,
    swarmDispersion: unit3((profile.swarmDispersion ?? 0) + (1 - donor.harmonicity) * 0.231),
    formantFocus: unit3((profile.formantFocus ?? 0.3) + (donor.spectralCentroid - 0.5) * 0.46),
    timbreFlavor,
  };
}

function tintDonatelloModifiers(
  modifiers: SpektralSyntheseRenderModifiers,
  donor: DonorTimbreDescriptor,
): SpektralSyntheseRenderModifiers {
  return modifiers.hasMaterial ? {
    ...modifiers,
    attackMs: range3(modifiers.attackMs - donor.transientDensity * 32, 4, 128),
    releaseMs: range3(modifiers.releaseMs + (1 - donor.transientDensity) * 80, 48, 620),
    gainSpread: range3(modifiers.gainSpread + (donor.brightness - 0.4) * 0.38, 1, 2.6),
    swarmExtra: unit3(modifiers.swarmExtra + (1 - donor.harmonicity) * 0.14),
  } : modifiers;
}

function buildDonatelloBodyVariant(donor: DonorTimbreDescriptor): SpektralSyntheseBodyRenderVariant {
  return {
    label: 'Donatello',
    presetPrefix: 'donatello',
    identityParts: [
      'donatello-donor-timbre-v3-shared-spektral-body',
      donor.donorTimbreKey,
      donor.spectralCentroid,
      donor.spectralFlatness,
      donor.harmonicity,
      donor.transientDensity,
      donor.brightness,
    ],
    profileTransform: (profile) => tintDonatelloProfile(profile, donor),
    modifiersTransform: (modifiers) => tintDonatelloModifiers(modifiers, donor),
  };
}

export async function renderCarrierIntegralDonatelloPreviewBuffer(
  args: RenderCarrierIntegralDonatelloArgs,
): Promise<CarrierIntegralHarmonicXploreDirectBuffer> {
  const donor = args.donorTimbre ?? FALLBACK_DONOR_TIMBRE_DESCRIPTOR;
  return renderCarrierIntegralSpektralSynthesePreviewBuffer({
    ...args,
    bodyVariant: buildDonatelloBodyVariant(donor),
  });
}

export function buildDonatelloPreviewParamsHash(args: {
  spectralData?: SpectralData | null;
  donorTimbre?: DonorTimbreDescriptor | null;
}): string {
  const donor = args.donorTimbre ?? FALLBACK_DONOR_TIMBRE_DESCRIPTOR;
  return buildSpektralSyntheseParamsHash(args.spectralData, null, buildDonatelloBodyVariant(donor));
}
