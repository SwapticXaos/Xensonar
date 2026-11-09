export const MATERIAL_INTAKE_PENDING_RAW_MELODIC_SESSION_KEY =
  'xensonar:pending-material-intake-raw-melodic-import-v1';

export type MaterialIntakeRawMelodicImportDetail = {
  entryId?: string;
  anchorHz?: number | null;
  source?: 'spectral-forge-raw-audio';
};
