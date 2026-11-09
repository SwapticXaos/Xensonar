import type {
  CarrierIntegralMachineId,
  CarrierIntegralRouteKind,
  CarrierIntegralTargetId,
} from './carrierIntegralContracts';

export type CarrierIntegralSendDestination =
  | 'materialspur'
  | 'root-follow-loop'
  | 'loop-track-direct'
  | 'melodic-pink-lane';

export type CarrierIntegralSignalKind =
  | 'synthetic-carrier-body'
  | 'raw-audio-body'
  | 'rendered-material-body'
  | 'validation-artifact';

export type CarrierIntegralElasticityMode =
  | 'synthetic-time-elastic'
  | 'raw-granular-elastic'
  | 'raw-tape-coupled'
  | 'fixed-rendered-audio'
  | 'not-applicable';

export type CarrierIntegralElasticityTradeoff =
  | 'root-follow-synthetic-default'
  | 'pitch-time-independent-raw-stretch'
  | 'tape-like-pitch-time-coupling'
  | 'material-track-fixed-render'
  | 'diagnostic-only';

export type CarrierIntegralSendContract = {
  destination: CarrierIntegralSendDestination;
  targetId: CarrierIntegralTargetId;
  routeKind: CarrierIntegralRouteKind;
  signalKind: CarrierIntegralSignalKind;
  defaultElasticity: CarrierIntegralElasticityMode;
  allowedElasticities: CarrierIntegralElasticityMode[];
  defaultIsTimeElastic: boolean;
  canChooseElasticity: boolean;
  tradeoff: CarrierIntegralElasticityTradeoff;
  summary: string;
  guardrail: string;
};

export type CarrierIntegralMaterialEntryKind =
  | 'none'
  | 'raw-oscillator-material'
  | 'carrier-granular-material'
  | 'carrier-rendered-material'
  | 'audio-paint-field-clip';

export type CarrierIntegralRenderSourceKind =
  | 'raw-spectral-buffer'
  | 'root-follow-config-buffer'
  | 'donatello-formant-plan-buffer'
  | 'spectral-window-body-buffer';

export type CarrierIntegralRootFollowConfigKind =
  | 'none'
  | 'material-flowing'
  | 'artifact-config';

export type CarrierIntegralMelodicHandoffKind =
  | 'none'
  | 'raw-material'
  | 'audio-paint-field';

export type CarrierIntegralTransferPlan = {
  machineId: CarrierIntegralMachineId;
  targetId: CarrierIntegralTargetId;
  destination: CarrierIntegralSendDestination;
  contract: CarrierIntegralSendContract;
  materialEntryKind: CarrierIntegralMaterialEntryKind;
  renderSource: CarrierIntegralRenderSourceKind;
  rootFollowConfigKind: CarrierIntegralRootFollowConfigKind;
  melodicHandoffKind: CarrierIntegralMelodicHandoffKind;
  usesAudioPaintImportDetail: boolean;
  clearsAudioPaintPendingHandoff: boolean;
  clearsRawMaterialPendingHandoff: boolean;
  sourceVersion: string;
  renderModePrefix: string;
  stableIdPrefix: string;
  workspaceOrigin: string;
  projectionMode: 'last-hearing' | 'grained';
  rootFollowMembershipConfig: 'material-flowing' | 'artifact-config' | 'none';
  requiresAudibleRenderedBody: boolean;
  summary: string;
  guardrail: string;
};

export type CarrierIntegralDestinationSupport = {
  machineId: CarrierIntegralMachineId;
  materialspur: CarrierIntegralSendContract | null;
  rootFollowLoop: CarrierIntegralSendContract | null;
  loopTrackDirect: CarrierIntegralSendContract | null;
  melodicPinkLane: CarrierIntegralSendContract | null;
};

export const DESTINATION_TO_TARGET: Record<CarrierIntegralSendDestination, CarrierIntegralTargetId> = {
  materialspur: 'materialspur-export',
  'root-follow-loop': 'root-follow-export',
  'loop-track-direct': 'loop-track-direct-export',
  'melodic-pink-lane': 'melodic-pink-export',
};

export const TARGET_TO_DESTINATION: Partial<Record<CarrierIntegralTargetId, CarrierIntegralSendDestination>> = {
  'materialspur-export': 'materialspur',
  'root-follow-export': 'root-follow-loop',
  'loop-track-direct-export': 'loop-track-direct',
  'melodic-pink-export': 'melodic-pink-lane',
};

export const RAW_CARRIER_MATERIAL_WORKSPACE_ORIGIN = 'spectralforge-raw-oscillator-material';
export const RAW_CARRIER_MATERIAL_RENDER_PREFIX = 'raw-oscillator-material';
export const CARRIER_INTEGRAL_GRANULAR_MATERIAL_WORKSPACE_ORIGIN = 'spectralforge-carrier-integral-granular-material';
export const CARRIER_INTEGRAL_RENDERED_MATERIAL_WORKSPACE_ORIGIN = 'spectralforge-carrier-integral-rendered-material';
export const CARRIER_INTEGRAL_AUDIO_PAINT_WORKSPACE_ORIGIN = 'spectralforge-carrier-integral';

