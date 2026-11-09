export type TransferMacroAxisId =
  | 'carrierFidelity'
  | 'donorLoad'
  | 'materialFocus'
  | 'leakProtection';

export type TransferMacroAxes = Record<TransferMacroAxisId, number>;

export type TransferProfilePresetId =
  | 'carrier_strict'
  | 'resonant_voice'
  | 'noisy_cluster'
  | 'experimental_loose'
  | 'custom';

export type TransferProfileDetail = {
  verticalFidelity: number;
  continuityFidelity: number;
  sparseRespect: number;
  anchorFocus: number;

  resonanceLoad: number;
  residualLoad: number;
  transientLoad: number;
  microModulationLoad: number;

  bandwidthSpread: number;
  inharmonicFreedom: number;
  zoneCoupling: number;
  polyAnchorBlend: number;

  prosodySuppression: number;
  sequenceDecoupling: number;
  cellDisentanglement: number;
  orderednessPenalty: number;
};

export type TransferProfile = {
  presetId: TransferProfilePresetId;
  macro: TransferMacroAxes;
  detail: TransferProfileDetail;
};

export const DEFAULT_TRANSFER_MACRO_AXES: TransferMacroAxes = {
  carrierFidelity: 0.72,
  donorLoad: 0.45,
  materialFocus: 0.5,
  leakProtection: 0.68,
};

export const TRANSFER_PROFILE_PRESET_MACROS: Record<TransferProfilePresetId, TransferMacroAxes> = {
  custom: { ...DEFAULT_TRANSFER_MACRO_AXES },
  carrier_strict: {
    carrierFidelity: 0.86,
    donorLoad: 0.34,
    materialFocus: 0.44,
    leakProtection: 0.82,
  },
  resonant_voice: {
    carrierFidelity: 0.8,
    donorLoad: 0.52,
    materialFocus: 0.28,
    leakProtection: 0.86,
  },
  noisy_cluster: {
    carrierFidelity: 0.58,
    donorLoad: 0.72,
    materialFocus: 0.78,
    leakProtection: 0.48,
  },
  experimental_loose: {
    carrierFidelity: 0.42,
    donorLoad: 0.84,
    materialFocus: 0.63,
    leakProtection: 0.18,
  },
};
