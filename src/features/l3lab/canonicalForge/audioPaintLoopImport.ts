import {
  CARRIER_INTEGRAL_PINK_VARIANTS,
  applyCarrierIntegralPinkLaneToDraft,
  normalizeCarrierIntegralPinkVariant,
  type CarrierIntegralPinkExportDetail,
} from './carrierIntegralPinkLaneBridge';
import type { CarrierIntegralPinkVariant, LoopComposerState } from './loopDrumDomain';
import type { MelodicImportLanePlacement } from './melodicImportLanePolicy';

export type AudioPaintLoopApplyResult = {
  applied: boolean;
  reason: string;
  variantId: CarrierIntegralPinkVariant;
  roundedAnchorHz?: number;
  roundedAnchorLabel?: string;
};

export function applyAudioPaintDetailToLoopDraft(
  draft: LoopComposerState,
  detail: CarrierIntegralPinkExportDetail | null | undefined,
  requestedVariant: unknown,
  anchorHz: number,
  lanePlacement?: MelodicImportLanePlacement | null,
): AudioPaintLoopApplyResult {
  if (!detail) {
    return { applied: false, reason: 'Audio-Paint-Vertrag fehlt. Bitte aus Gestalt-Projekte neu senden.', variantId: 'last-hearing' };
  }
  const variantId = normalizeCarrierIntegralPinkVariant(requestedVariant ?? detail.projectionMode);
  const variant = CARRIER_INTEGRAL_PINK_VARIANTS.find((entry) => entry.id === variantId);
  if (!variant?.enabled) {
    return {
      applied: false,
      reason: variant ? `${variant.label} ist vorbereitet, aber noch nicht gerendert.` : 'Diese Audio-Paint-Variante ist nicht verfügbar.',
      variantId,
    };
  }
  const result = applyCarrierIntegralPinkLaneToDraft(draft, { ...detail, projectionMode: variantId }, anchorHz, lanePlacement);
  return {
    applied: result.applied,
    reason: result.reason,
    variantId,
    roundedAnchorHz: result.roundedAnchorHz,
    roundedAnchorLabel: result.roundedAnchorLabel,
  };
}
