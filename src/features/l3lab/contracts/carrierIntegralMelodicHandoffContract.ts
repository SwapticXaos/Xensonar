export const CARRIER_INTEGRAL_PENDING_PINK_MELODIC_SESSION_KEY =
  'xensonar:pending-carrier-integral-pink-export';

export const CARRIER_INTEGRAL_PENDING_RAW_MATERIAL_MELODIC_SESSION_KEY =
  'xensonar:pending-carrier-integral-raw-material-melodic-export';

export const CARRIER_INTEGRAL_MELODIC_HANDOFF_SESSION_KEYS = {
  pink: CARRIER_INTEGRAL_PENDING_PINK_MELODIC_SESSION_KEY,
  rawMaterial: CARRIER_INTEGRAL_PENDING_RAW_MATERIAL_MELODIC_SESSION_KEY,
} as const;

export type CarrierIntegralRawMaterialMelodicExportDetail = {
  entryId?: string;
  rootHz?: number | null;
  machineId?: string;
  granular?: boolean;
};
