import type {
  AnchorBindingPreview,
  AnchorBindingPreviewSummary,
  AnchorRelativeTimbreTensor,
  CarrierAnchorContinuityGraph,
  CarrierAnchorContinuitySummary,
  CarrierSpectralSkeleton,
  CarrierSpectralSkeletonSummary,
  DonorAnchor,
  DonorTimbreAnalysisSummary,
  DonorTimbreAtlas,
  DonorTimbreAtlasSummary,
} from '../types/carrierDonorV2Types';
import type {
  GestaltField,
  GestaltFieldSummary,
  MaterialAllocationPreview,
  MaterialAllocationSummary,
  MaterialField,
  MaterialFieldSummary,
} from '../types/gestaltMaterialField';
import type { CarrierDonorV2DonorUseMode } from '../types/carrierDonorV2RenderPolicy';
import type { TransferMacroAxes, TransferProfile, TransferProfilePresetId } from '../types/transferProfile';

export type V2StageStatus = 'missing' | 'dirty' | 'building' | 'ready' | 'error';

export type V2Fingerprint = {
  key: string;
  updatedAt: number;
};

export type V2StageMeta = {
  status: V2StageStatus;
  fingerprint: V2Fingerprint | null;
  reason: string;
  lastError: string | null;
};

export type CarrierDonorV2FreshnessState = {
  carrierInput: V2Fingerprint | null;
  donorInput: V2Fingerprint | null;
  skeletonMeta: V2StageMeta;
  continuityMeta: V2StageMeta;
  donorAnalysisMeta: V2StageMeta;
  donorAtlasMeta: V2StageMeta;
  bindingMeta: V2StageMeta;
  gestaltFieldMeta: V2StageMeta;
  materialFieldMeta: V2StageMeta;
  materialAllocationMeta: V2StageMeta;
  renderEligibility: {
    canPreviewV2: boolean;
    reason: string;
  };
};

export interface CarrierDonorV2State {
  skeleton: CarrierSpectralSkeleton | null;
  summary: CarrierSpectralSkeletonSummary | null;
  continuityGraph: CarrierAnchorContinuityGraph | null;
  continuitySummary: CarrierAnchorContinuitySummary | null;
  donorAnchors: DonorAnchor[];
  donorTensor: AnchorRelativeTimbreTensor | null;
  donorSummary: DonorTimbreAnalysisSummary | null;
  donorAtlas: DonorTimbreAtlas | null;
  donorAtlasSummary: DonorTimbreAtlasSummary | null;
  gestaltField: GestaltField | null;
  gestaltFieldSummary: GestaltFieldSummary | null;
  materialField: MaterialField | null;
  materialFieldSummary: MaterialFieldSummary | null;
  materialAllocationPreview: MaterialAllocationPreview | null;
  materialAllocationSummary: MaterialAllocationSummary | null;
  bindingPreview: AnchorBindingPreview[];
  bindingSummary: AnchorBindingPreviewSummary | null;
  overlayVisible: boolean;
  continuityOverlayVisible: boolean;
  bindingOverlayVisible: boolean;
  busy: 'none' | 'carrier' | 'donor' | 'binding';
  transferPresetId: TransferProfilePresetId;
  transferMacroAxes: TransferMacroAxes;
  transferProfile: TransferProfile;
  donorUseMode: CarrierDonorV2DonorUseMode;
  freshness: CarrierDonorV2FreshnessState;
}
