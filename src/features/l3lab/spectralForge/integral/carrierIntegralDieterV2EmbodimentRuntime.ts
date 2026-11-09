import { SpectralData } from '../audio/SpectralData';
import { extractSpectralSkeleton } from '../carrierV2/extractSpectralSkeleton';
import { buildAnchorContinuityGraph } from '../carrierV2/buildAnchorContinuityGraph';
import { buildGestaltField } from '../carrierV2/buildGestaltField';
import { buildAnchorBindingPreview } from '../bindingV2/buildAnchorBindingPreview';
import { buildMaterialAllocationPreview } from '../bindingV2/buildMaterialAllocationPreview';
import { buildNeutralCarrierDonorV2Tensor } from '../donorV2/buildNeutralCarrierDonorV2Tensor';
import { buildDonorTimbreAtlas } from '../donorV2/buildDonorTimbreAtlas';
import { buildMaterialField } from '../donorV2/buildMaterialField';
import { buildV2EmbodimentField } from '../embodiment/buildV2EmbodimentField';
import { deriveTransferProfile } from '../transfer/deriveTransferProfile';
import { buildSpectralForgeV2RootFollowEntryConfig } from '../rootFollow/buildV2RootFollowEvent';
import { buildCarrierIntegralTimbreSnapshot } from './carrierIntegralSynthLab';
import { hydrateVirtualBodyMedium } from './virtualBodyMediumHydrator';
import { buildCarrierLatentBodyFormFromSkeleton } from './virtualBodyActualizationDiagnostics';
import type { CarrierIntegralAuditionContext } from './carrierIntegralAuditionContext';

export type CarrierIntegralDieterV2EmbodimentRuntimeArgs = {
  spectralData: SpectralData;
  durationSec: number;
  previewBpm: number;
  bars: number;
  carrierIntegralParams: CarrierIntegralAuditionContext['carrierIntegralParams'];
  routeSignature: CarrierIntegralAuditionContext['routeSignature'];
  synthLab: CarrierIntegralAuditionContext['synthLab'];
};

export type CarrierIntegralDieterV2EmbodimentRuntime = ReturnType<typeof buildDieterV2EmbodimentRuntime>;

export function buildDieterV2EmbodimentRuntime(args: CarrierIntegralDieterV2EmbodimentRuntimeArgs) {
  const skeleton = extractSpectralSkeleton(args.spectralData, args.durationSec);
  const latentForm = buildCarrierLatentBodyFormFromSkeleton({
    id: 'dieter-v2-carrier-latent-form',
    sourceId: 'carrier-integral-audition',
    skeleton,
  });
  const activeMedium = hydrateVirtualBodyMedium({
    durationSec: args.durationSec,
    requestedKind: 'neutral-pigment',
    idPrefix: 'dieter-v2',
  });
  const neutral = buildNeutralCarrierDonorV2Tensor();
  const donorAtlas = buildDonorTimbreAtlas(neutral.tensor);
  const continuityGraph = buildAnchorContinuityGraph(skeleton);
  const gestaltField = buildGestaltField(skeleton, continuityGraph);
  const materialField = buildMaterialField(donorAtlas);
  const transferProfile = deriveTransferProfile({ presetId: 'carrier_strict' });
  const bindingPreview = buildAnchorBindingPreview(skeleton, donorAtlas);
  const materialAllocationPreview = buildMaterialAllocationPreview(gestaltField, materialField, transferProfile);
  const embodimentField = buildV2EmbodimentField({
    spectralData: args.spectralData,
    skeleton,
    materialField,
    materialAllocationPreview,
    durationSec: args.durationSec,
    sourceSignature: 'carrier-integral-neutral-pigment:dieter-v2-auto-hydrated',
  });
  const rootFollowBuild = buildSpectralForgeV2RootFollowEntryConfig({
    skeleton,
    bindingPreview,
    donorAtlas,
    materialField,
    materialAllocationPreview,
    transferProfile,
    bars: args.bars,
    bpm: args.previewBpm,
    durationSec: args.durationSec,
    donorUseMode: 'synthetic_pigment',
    materialInterpretationProfile: null,
    carrierIntegralParams: args.carrierIntegralParams,
    carrierIntegralRouteSignature: args.routeSignature,
    carrierIntegralTimbre: buildCarrierIntegralTimbreSnapshot(args.synthLab),
  });
  const donorSourceAsset = activeMedium.sourceAsset;
  return {
    skeleton,
    latentForm,
    actualizationMedium: activeMedium,
    donorAtlas,
    bindingPreview,
    materialField,
    materialAllocationPreview,
    transferProfile,
    embodimentField,
    rootFollowBuild,
    donorSourceAsset,
  };
}
