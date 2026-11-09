import type { SpectralData } from '../audio/SpectralData';
import { extractSpectralSkeleton } from '../carrierV2/extractSpectralSkeleton';
import { buildAnchorBindingPreview } from '../bindingV2/buildAnchorBindingPreview';
import { buildNeutralCarrierDonorV2Tensor } from '../donorV2/buildNeutralCarrierDonorV2Tensor';
import { buildDonorTimbreAtlas } from '../donorV2/buildDonorTimbreAtlas';
import { deriveTransferProfile } from '../transfer/deriveTransferProfile';
import {
  buildSpectralForgeV2RootFollowEntryConfig,
  type SpectralForgeV2RootFollowBuildResult,
} from '../rootFollow/buildV2RootFollowEvent';
import type { CarrierIntegralAuditionContext } from './carrierIntegralAuditionContext';
import type { CarrierIntegralAuditionRequest } from './carrierIntegralAuditionRequest';
import { buildCarrierIntegralTimbreSnapshot } from './carrierIntegralSynthLab';
import { buildCarrierIntegralHarmonicXploreDirectTimbreSnapshot } from './carrierIntegralHarmonicXploreDirectEngine';
import {
  resolveCarrierLoopBodyPreviewAuditionRequestForMachine,
  type CarrierLoopBodyPreviewAuditionHookRequest,
} from './carrierLoopBodyPreviewAuditionHook';

export type CarrierIntegralSyntheticRootFollowBuildArgs = {
  request: CarrierIntegralAuditionRequest;
  context: CarrierIntegralAuditionContext;
  spectralData: SpectralData;
};

export type CarrierIntegralSyntheticRootFollowBuild = {
  rootFollowBuild: SpectralForgeV2RootFollowBuildResult;
  carrierLoopBodyAuditionRequest: CarrierLoopBodyPreviewAuditionHookRequest | null;
};

export function buildCarrierIntegralSyntheticRootFollowBuild(
  args: CarrierIntegralSyntheticRootFollowBuildArgs,
): CarrierIntegralSyntheticRootFollowBuild {
  const { request, context, spectralData } = args;
  const skeleton = extractSpectralSkeleton(spectralData, context.durationSec);
  const neutral = buildNeutralCarrierDonorV2Tensor();
  const donorAtlas = buildDonorTimbreAtlas(neutral.tensor);
  const bindingPreview = buildAnchorBindingPreview(skeleton, donorAtlas);
  const transferProfile = deriveTransferProfile({ presetId: 'carrier_strict' });
  const carrierLoopBodyAuditionRequest =
    resolveCarrierLoopBodyPreviewAuditionRequestForMachine({
      machineId: request.machineId,
      request: request.carrierLoopBodyPreviewCandidate,
    });
  const rootFollowBuild = buildSpectralForgeV2RootFollowEntryConfig({
    skeleton,
    bindingPreview,
    donorAtlas,
    materialField: null,
    materialAllocationPreview: null,
    transferProfile,
    bars: request.snapshot.materialExport.bars,
    bpm: context.previewBpm,
    durationSec: context.durationSec,
    donorUseMode: 'synthetic_pigment',
    materialInterpretationProfile: null,
    carrierIntegralParams: context.carrierIntegralParams,
    carrierIntegralRouteSignature: context.routeSignature,
    carrierIntegralTimbre: context.machineId === 'harmonic-xplore-direct-carrier'
      ? buildCarrierIntegralHarmonicXploreDirectTimbreSnapshot(context.synthLab, context.harmonicXplore)
      : buildCarrierIntegralTimbreSnapshot(context.synthLab),
    carrierLoopBodyPreviewCandidate: carrierLoopBodyAuditionRequest,
  });

  return { rootFollowBuild, carrierLoopBodyAuditionRequest };
}
