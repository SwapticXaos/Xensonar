export const VIRTUAL_BODY_ACTUALIZATION_SCHEMA_VERSION = 'virtual-body-actualization-v1' as const;

export type VirtualBodyActualizationSchemaVersion = typeof VIRTUAL_BODY_ACTUALIZATION_SCHEMA_VERSION;

export type LatentBodyFormSourceKind =
  | 'carrier-sketch'
  | 'nodal-constellation'
  | 'swarm-behavior'
  | 'material-clip';

export type LatentBodyTopologySummary = {
  continuity: number;
  density: number;
  complexity: number;
  fragmentation: number;
  crossingCount?: number;
  anchorCount?: number;
  peakPolyphony?: number;
  tonalRatio?: number;
  clusterRatio?: number;
  transientRatio?: number;
  noiseRatio?: number;
};

export type LatentBodyForm = {
  schemaVersion: VirtualBodyActualizationSchemaVersion;
  id: string;
  sourceKind: LatentBodyFormSourceKind;
  sourceId?: string;
  topology: LatentBodyTopologySummary;
  spectralSkeletonRef?: string;
  nodalGraphRef?: string;
  diagnostics: string[];
};

export type ActualizationMediumKind =
  | 'audio-donor'
  | 'neutral-pigment'
  | 'synth-bed'
  | 'material-body';

export type ActualizationMediumReadiness =
  | 'ready'
  | 'missing'
  | 'hydrated-fallback'
  | 'invalid';

export type ActualizationMediumPlan = {
  schemaVersion: VirtualBodyActualizationSchemaVersion;
  id: string;
  kind: ActualizationMediumKind;
  readiness: ActualizationMediumReadiness;
  timbreAtlasRef?: string;
  audioBufferRef?: string;
  sampleRate?: number;
  durationSec?: number;
  peak?: number;
  rms?: number;
  warnings: string[];
};

export type ActualizationReadiness = {
  storedEnergy: number;
  activationThreshold: number;
  allowFailOpen: boolean;
  minPeak: number;
  minRms: number;
};

export type ActualizationRoute =
  | 'pure-dieter'
  | 'dieter-v2'
  | 'donatello'
  | 'emilia';

export type ActualizedBodyKind =
  | 'direct-synth-body'
  | 'rendered-material-body'
  | 'formant-plan'
  | 'melodic-contour-plan';

export type ActualizationRootReference = {
  source: 'active-grid' | 'carrier-anchor' | 'material-anchor' | 'explicit-hz' | 'unknown';
  hz?: number;
};

export type ActualizationDecision = {
  schemaVersion: VirtualBodyActualizationSchemaVersion;
  route: ActualizationRoute;
  accepted: boolean;
  reason: string;
  medium: ActualizationMediumPlan;
  warnings: string[];
};

export type ActualizationDiagnostics = {
  mediumKind: ActualizationMediumKind;
  usedFailOpen: boolean;
  peak?: number;
  rms?: number;
  warnings: string[];
};

export type ActualizedBodyPlan = {
  schemaVersion: VirtualBodyActualizationSchemaVersion;
  id: string;
  route: ActualizationRoute;
  bodyKind: ActualizedBodyKind;
  rootReference: ActualizationRootReference;
  renderPlanRef?: string;
  diagnostics: ActualizationDiagnostics;
};

export type ActualizedAudioBufferReport = {
  peak: number;
  rms: number;
  length: number;
  durationSec: number;
  channelCount: number;
  sampleRate: number;
  playable: boolean;
  warnings: string[];
};

export const DEFAULT_ACTUALIZATION_READINESS: ActualizationReadiness = {
  storedEnergy: 1,
  activationThreshold: 0.001,
  allowFailOpen: true,
  minPeak: 0.0005,
  minRms: 0.00005,
};
