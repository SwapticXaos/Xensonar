export type CarrierDonorV2DonorUseMode = 'timbre_projection' | 'synthetic_pigment' | 'raw_texture_overlay';

export const DEFAULT_CARRIER_DONOR_V2_DONOR_USE_MODE: CarrierDonorV2DonorUseMode = 'timbre_projection';

export const CARRIER_DONOR_V2_DONOR_USE_MODE_LABELS: Record<CarrierDonorV2DonorUseMode, string> = {
  timbre_projection: 'Donor-Projektion',
  synthetic_pigment: 'Synthetisches Pigment',
  raw_texture_overlay: 'Rohtextur-Layer',
};

export function shouldRenderCarrierDonorV2RawTextureOverlay(mode: CarrierDonorV2DonorUseMode): boolean {
  return mode === 'raw_texture_overlay';
}
