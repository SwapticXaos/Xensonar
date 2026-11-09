import type { CarrierIntegralMachineId } from '../../integral';

/**
 * SpectralForge basis hearing surface.
 *
 * Regression contract 3.2.91-7.7.75: the user-facing hearing surface exposes
 * exactly one Antonia. That one Antonia is the former Branch-A / line-traffic
 * carrier reading. The 5.69 direct reading remains only legacy/compatibility
 * material and must not reappear as a second Antonia or as the active Antonia.
 */
export const SPECTRAL_FORGE_BASIS_HEARING_MACHINE_IDS: CarrierIntegralMachineId[] = [
  'raw-darkpsy-oscillator',
  'harmonic-xplore-direct-carrier',
  'spektral-synthese-body',
  'branch-a-line-traffic',
  'branch-b573-synth-window',
  'branch-c-interval-body',
];

export type SpectralForgeBasisHearingOption = {
  id: string;
  label: string;
  machineId: CarrierIntegralMachineId;
  harmonicXploreProfileId?: string;
  summary?: string;
};

export const SPECTRAL_FORGE_BASIS_HEARING_OPTIONS: SpectralForgeBasisHearingOption[] = [
  {
    id: 'pure-dieter',
    label: 'Pure Dieter',
    machineId: 'raw-darkpsy-oscillator',
  },
  {
    id: 'harmonic-xplore',
    label: 'HarmonicXplorE',
    machineId: 'harmonic-xplore-direct-carrier',
    summary: 'HX-Profil aus dem Strukturrack',
  },
  {
    id: 'spektral-synthese',
    label: 'SpektralSynthese',
    machineId: 'spektral-synthese-body',
    summary: 'Descriptor-modulierter HX-Körper',
  },
  {
    id: 'antonia',
    label: 'Antonia',
    machineId: 'branch-a-line-traffic',
    summary: 'Linienkörper-Lesung',
  },
  {
    id: 'bert',
    label: 'Bert',
    machineId: 'branch-b573-synth-window',
    summary: 'Fensterprisma',
  },
  {
    id: 'cecilia',
    label: 'Cecilia',
    machineId: 'branch-c-interval-body',
    summary: 'Vocal-Polytrace',
  },
];
