import type { ExportedMaterialMeta } from '../../materialLibrary';
import type { AudioSourceAsset } from '../audio/AudioImporter';
import type { SpectralData } from '../audio/SpectralData';
import { buildMaterialAllocationPreview, summarizeMaterialAllocationPreview } from '../bindingV2/buildMaterialAllocationPreview';
import { buildAnchorBindingPreview, summarizeAnchorBindingPreview } from '../bindingV2/buildAnchorBindingPreview';
import { buildCarrierFieldCoverageContract } from '../interpretation/carrierFieldCoverageContract';
import { buildCarrierPresenceInterpretationBridge } from '../interpretation/carrierPresenceInterpretationField';
import { buildSpectralForgeV2RootFollowEntryConfig, type SpectralForgeV2RootFollowPlanSummary } from '../rootFollow/buildV2RootFollowEvent';
import type { CarrierIntegralSelection } from '../integral/carrierIntegralSelection';
import { buildCarrierIntegralRouteSignature, buildCarrierIntegralTimbreSnapshot, resolveCarrierIntegralSelectionParams, type CarrierIntegralSynthLabSelection } from '../integral';
import type { CarrierDonorV2State } from '../state/store';
import type { TransferProfile } from '../types/transferProfile';
import {
  analyzeCarrierDonorV2AudioBuffer,
  buildCarrierDonorV2LoopMetadata,
  buildCarrierDonorV2ValidationReport,
  type CarrierDonorV2LoopMetadata,
  type CarrierDonorV2ValidationReport,
} from '../validation/evaluateCarrierDonorV2Validation';
import {
  analyzeRootFollowGranularAudioBufferProfile,
  buildRootFollowGranularAudioProfileFromMaterialProfile,
  serializeRootFollowGranularAudioProfile,
  type RootFollowGranularAudioProfile,
} from '../../../xensonar/rootFollow/rootFollowGranularSettings';
import { analyzeAudioMaterialSamplesProfile, type AudioMaterialInterpretationProfile } from '../../../xensonar/audioMaterial/audioMaterialInterpretationProfile';
import type { RootFollowBankEntryConfig } from '../../../xensonar/rootFollow/rootFollowTypes';

export type SpectralEmbodimentArtifactMeter = {
  bars: number;
  bpm: number;
  guideSegments: number;
  guideMarkers: number[];
  intendedLoopDurationSec: number;
};

export type SpectralEmbodimentArtifactInputs = {
  spectralData: SpectralData;
  current: CarrierDonorV2State;
  donorSource: AudioSourceAsset | null;
  renderedBuffer: AudioBuffer;
  sourceSignature: string;
  meter: SpectralEmbodimentArtifactMeter;
  carrierIntegralSelection?: CarrierIntegralSelection | null;
  carrierIntegralSynthLab?: CarrierIntegralSynthLabSelection | null;
};

export type SpectralEmbodimentArtifacts = {
  mode: 'carrier_donor_v2';
  sourceSignature: string;
  buffer: AudioBuffer;
  loopMetadata: CarrierDonorV2LoopMetadata;
  report: CarrierDonorV2ValidationReport;
  rootFollowConfig: RootFollowBankEntryConfig | null;
  rootFollowPlan: SpectralForgeV2RootFollowPlanSummary | null;
  rootFollowGranularProfile: RootFollowGranularAudioProfile | null;
  donorMaterialProfile: AudioMaterialInterpretationProfile | null;
  syntheticRootFollow: boolean;
};

export type SpectralEmbodimentMaterialExportMetaArgs = {
  artifacts: SpectralEmbodimentArtifacts;
  meter: Pick<SpectralEmbodimentArtifactMeter, 'guideSegments' | 'guideMarkers'>;
  materialName?: string | null;
  stableId: string;
};

export function buildSpectralEmbodimentSourceSignature(args: {
  source: AudioSourceAsset | null;
  bars: number;
  bpm: number;
  fallback?: string;
}) {
  if (!args.source) return args.fallback ?? 'carrier-donor-v2-front';
  return [
    args.source.fileName,
    args.source.importStartSec,
    args.source.importDurationSec,
    args.source.sampleRate,
    args.bars,
    Math.round(args.bpm),
  ].join(':');
}

function readReadyV2State(current: CarrierDonorV2State) {
  if (!current.freshness.renderEligibility.canPreviewV2) {
    throw new Error(current.freshness.renderEligibility.reason);
  }
  if (!current.skeleton || !current.donorAtlas || (current.donorUseMode !== 'timbre_projection' && !current.bindingPreview.length)) {
    throw new Error('V2 braucht Carrier-Skelett, Donor-Atlas und Binding.');
  }
  if (current.donorUseMode === 'raw_texture_overlay' && (!current.materialField || !current.materialAllocationPreview)) {
    throw new Error('Rohtextur-V2 braucht Materialfeld und Materialallokation.');
  }
  return {
    skeleton: current.skeleton,
    donorAtlas: current.donorAtlas,
    bindingPreview: current.bindingPreview,
    materialField: current.materialField,
    materialAllocationPreview: current.materialAllocationPreview,
    transferProfile: current.transferProfile,
    donorUseMode: current.donorUseMode,
  };
}

function ensureMaterialAllocationSummary(args: {
  current: CarrierDonorV2State;
  transferProfile: TransferProfile;
}) {
  if (args.current.materialAllocationPreview && args.current.materialAllocationSummary) {
    return {
      materialAllocationPreview: args.current.materialAllocationPreview,
      materialAllocationSummary: args.current.materialAllocationSummary,
    };
  }
  if (!args.current.gestaltField || !args.current.materialField) {
    return {
      materialAllocationPreview: args.current.materialAllocationPreview,
      materialAllocationSummary: args.current.materialAllocationSummary,
    };
  }
  const materialAllocationPreview = buildMaterialAllocationPreview(
    args.current.gestaltField,
    args.current.materialField,
    args.transferProfile,
  );
  return {
    materialAllocationPreview,
    materialAllocationSummary: summarizeMaterialAllocationPreview(materialAllocationPreview),
  };
}

function ensureBindingSummary(current: CarrierDonorV2State) {
  if (current.bindingPreview.length && current.bindingSummary) {
    return { bindingPreview: current.bindingPreview, bindingSummary: current.bindingSummary };
  }
  if (!current.skeleton || !current.donorAtlas) {
    return { bindingPreview: current.bindingPreview, bindingSummary: current.bindingSummary };
  }
  const bindingPreview = current.bindingPreview.length
    ? current.bindingPreview
    : buildAnchorBindingPreview(current.skeleton, current.donorAtlas);
  return { bindingPreview, bindingSummary: summarizeAnchorBindingPreview(current.skeleton, bindingPreview) };
}

export function buildSpectralEmbodimentArtifacts(args: SpectralEmbodimentArtifactInputs): SpectralEmbodimentArtifacts {
  const ready = readReadyV2State(args.current);
  const loopMetadata = buildCarrierDonorV2LoopMetadata({
    bars: args.meter.bars,
    bpm: args.meter.bpm,
    durationSec: args.meter.intendedLoopDurationSec,
    donorUseMode: ready.donorUseMode,
  });

  const bridge = buildCarrierPresenceInterpretationBridge(args.spectralData);
  const binding = ensureBindingSummary(args.current);
  const allocation = ensureMaterialAllocationSummary({
    current: args.current,
    transferProfile: ready.transferProfile,
  });
  const fieldCoverageContract = buildCarrierFieldCoverageContract(
    bridge.presence,
    ready.skeleton,
    binding.bindingPreview,
  );
  const donorMaterialProfile = args.donorSource
    ? analyzeAudioMaterialSamplesProfile({
        samples: args.donorSource.monoSamples,
        sampleRate: args.donorSource.sampleRate,
        startSec: args.donorSource.importStartSec,
        durationSec: args.donorSource.importDurationSec,
        route: 'spectralforge-carrier-donor',
        sourceRole: 'spectralforge-donor',
        name: args.donorSource.fileName,
      })
    : null;

  const carrierIntegralParams = args.carrierIntegralSelection
    ? resolveCarrierIntegralSelectionParams(args.carrierIntegralSelection)
    : null;
  const carrierIntegralRouteSignature = args.carrierIntegralSelection
    ? buildCarrierIntegralRouteSignature({
        machineId: args.carrierIntegralSelection.machineId,
        bodySourceMode: args.carrierIntegralSelection.bodySourceMode,
        params: carrierIntegralParams,
      })
    : null;

  const rootFollowBuild = ready.donorUseMode === 'synthetic_pigment'
    ? buildSpectralForgeV2RootFollowEntryConfig({
        skeleton: ready.skeleton,
        bindingPreview: binding.bindingPreview,
        donorAtlas: ready.donorAtlas,
        materialField: ready.materialField,
        materialAllocationPreview: allocation.materialAllocationPreview,
        transferProfile: ready.transferProfile,
        bars: args.meter.bars,
        bpm: args.meter.bpm,
        durationSec: args.meter.intendedLoopDurationSec,
        donorUseMode: ready.donorUseMode,
        materialInterpretationProfile: donorMaterialProfile,
        carrierIntegralParams,
        carrierIntegralRouteSignature,
        carrierIntegralTimbre: args.carrierIntegralSynthLab ? buildCarrierIntegralTimbreSnapshot(args.carrierIntegralSynthLab) : null,
      })
    : null;

  const rootFollowGranularProfile = donorMaterialProfile
    ? buildRootFollowGranularAudioProfileFromMaterialProfile(donorMaterialProfile)
    : analyzeRootFollowGranularAudioBufferProfile(args.renderedBuffer, {
        route: 'spectralforge-carrier-donor',
        durationSec: args.meter.intendedLoopDurationSec,
        bars: args.meter.bars,
        name: args.sourceSignature,
      });

  const report = buildCarrierDonorV2ValidationReport({
    sourceSignature: args.sourceSignature,
    loopMetadata,
    audioStats: analyzeCarrierDonorV2AudioBuffer(args.renderedBuffer),
    carrierSummary: args.current.summary,
    continuitySummary: args.current.continuitySummary,
    donorSummary: args.current.donorSummary,
    donorAtlasSummary: args.current.donorAtlasSummary,
    gestaltFieldSummary: args.current.gestaltFieldSummary,
    materialFieldSummary: args.current.materialFieldSummary,
    bindingSummary: binding.bindingSummary,
    materialAllocationSummary: allocation.materialAllocationSummary,
    transferProfile: ready.transferProfile,
    fieldCoverageContract,
    rootFollowPlan: rootFollowBuild?.summary ?? null,
  });

  const syntheticRootFollow = Boolean(rootFollowBuild?.summary.eligible)
    && loopMetadata.rootFollowEligibility.canSend
    && loopMetadata.rootFollowEligibility.mode === 'synthetic';

  return {
    mode: 'carrier_donor_v2',
    sourceSignature: args.sourceSignature,
    buffer: args.renderedBuffer,
    loopMetadata,
    report,
    rootFollowConfig: rootFollowBuild?.config ?? null,
    rootFollowPlan: rootFollowBuild?.summary ?? null,
    rootFollowGranularProfile,
    donorMaterialProfile,
    syntheticRootFollow,
  };
}

export function buildSpectralEmbodimentMaterialExportMeta(args: SpectralEmbodimentMaterialExportMetaArgs): ExportedMaterialMeta {
  const loopMetadata = args.artifacts.loopMetadata;
  const baseName = args.materialName?.trim() || 'SpectralForge V2';
  const durationSec = args.artifacts.buffer.length / Math.max(1, args.artifacts.buffer.sampleRate);
  return {
    name: baseName + (loopMetadata.donorUseMode === 'timbre_projection' ? ' · Donor-Projektion' : loopMetadata.donorUseMode === 'synthetic_pigment' ? ' · V2 synthetisch' : ' · V2 roh-granular'),
    role: 'loop',
    bpm: loopMetadata.bpm,
    bars: loopMetadata.bars,
    guideSegments: args.meter.guideSegments,
    guideMarkers: args.meter.guideMarkers,
    loopStartSec: 0,
    loopEndSec: loopMetadata.durationSec,
    rootHz: null,
    sourceVersion: 'xensonar-spectralforge-v2-4.103',
    renderMode: 'carrier-donor-v2:' + loopMetadata.donorUseMode,
    durationSec,
    intendedLoopDurationSec: loopMetadata.durationSec,
    workspaceOrigin: 'spectralforge-v2',
    transitionGuard: 'V2-Zeitvertrag: Takte und BPM aus der oberen SpectralForge-Zeit bleiben im Materialspur-Paket erhalten.',
    balanceCarrier: loopMetadata.donorUseMode === 'timbre_projection'
      ? 'Die Figur bestimmt Gestalt und Zeit; extrahiertes Donor-Material wird pro Stimme synthetisiert.'
      : loopMetadata.donorUseMode === 'synthetic_pigment'
      ? 'CarrierPresence ist Zeit-/Frequenzträger; Donor wirkt als synthetisches Pigment.'
      : 'CarrierPresence ist Zeit-/Frequenzträger; Donor wirkt zusätzlich als roh-granulare Textur.',
    routeSummary: loopMetadata.donorUseMode === 'timbre_projection' ? 'Donor-Körper aus derselben Synthese wie die Hörvorschau.' : 'SpectralForge V2 wurde aus Carrier-Skelett, Donor-Atlas, Binding und Materialallokation in einen Materialspur-Loop gerendert.',
    stabilizeBy: args.artifacts.report.summaryLine,
    stableId: args.stableId,
    rootFollowPreferred: args.artifacts.syntheticRootFollow,
    rootFollowGranularProfile: serializeRootFollowGranularAudioProfile(args.artifacts.rootFollowGranularProfile),
    spectralGranularBridge: args.artifacts.rootFollowGranularProfile?.bridgeProfile.summary,
  };
}

