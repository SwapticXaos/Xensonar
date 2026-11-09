export type CarrierIntegralMachineId =
  | 'legacy-supernote-5.69'
  | 'raw-darkpsy-oscillator'
  | 'harmonic-xplore-direct-carrier'
  | 'spektral-synthese-body'
  | 'dieter-window-body'
  | 'branch-a-line-traffic'
  | 'branch-b573-synth-window'
  | 'branch-c-interval-body'
  | 'material-render-body'
  | 'donor-timbre-embodiment'
  | 'donatello-formant-window-body'
  | 'strange-attractor-schwarmkoerper';

export type CarrierIntegralMachineFamily =
  | 'legacy-direct-segment-machine'
  | 'raw-oscillator-direct-machine'
  | 'harmonic-ratio-carrier-machine'
  | 'spectral-window-body-machine'
  | 'line-traffic-machine'
  | 'synth-window-machine'
  | 'interval-body-machine'
  | 'material-render-machine'
  | 'donor-informed-machine'
  | 'formant-filter-machine'
  | 'attractor-swarm-machine';

export type CarrierIntegralBodySourceMode =
  | 'raw_oscillator'
  | 'neutral_pigment'
  | 'audio_donor'
  | 'material_render'
  | 'legacy_direct'
  | 'formant_window'
  | 'spectral_window'
  | 'harmonic_xplore'
  | 'spektral_synthese'
  | 'attractor_schwarm';

export type CarrierIntegralTargetId =
  | 'material-preview'
  | 'root-follow-preview'
  | 'materialspur-export'
  | 'root-follow-export'
  | 'loop-track-direct-export'
  | 'melodic-pink-export'
  | 'validation'
  | 'abc-root-comparison';

export type CarrierIntegralAntiBurstStrategy =
  | 'direct-segment-supernote'
  | 'raw-oscillator-direct'
  | 'traffic-line-shaping'
  | 'b573-synth-window-body'
  | 'interval-window-body'
  | 'material-render-body'
  | 'donor-informed-body'
  | 'formant-window-body'
  | 'spectral-window-body'
  | 'harmonic-xplore-direct-carrier'
  | 'attractor-schwarm-body';

export type CarrierIntegralRouteKind =
  | 'synthetic-root-follow-plan'
  | 'rendered-material-body'
  | 'raw-loop-track-synth-body'
  | 'artifact-validation-only'
  | 'formant-window-body'
  | 'spectral-window-body'
  | 'harmonic-xplore-direct-carrier'
  | 'attractor-schwarm-body';

export type CarrierIntegralSafetyMode = 'frei' | 'ausgewogen' | 'streng';

export type CarrierIntegralMachineParams = {
  maxVoices: number;
  maxLines: number;
  maxWindows: number;
  minVoiceDurationBeats: number;
  fadeInBeats: number;
  fadeOutBeats: number;
  densityCompression: number;
  energyThreshold: number;
  clusterMergeStrength: number;
  microOffsetStrength: number;
  localFieldDepth: number;
  stretchElasticity: number;
  headroomDb: number;
  safetyMode: CarrierIntegralSafetyMode;
};

export type CarrierIntegralMachineDefinition = {
  id: CarrierIntegralMachineId;
  label: string;
  shortLabel: string;
  family: CarrierIntegralMachineFamily;
  sourceBranches: string[];
  bodySourceModes: CarrierIntegralBodySourceMode[];
  antiBurstStrategy: CarrierIntegralAntiBurstStrategy;
  rootFollowRoute: CarrierIntegralRouteKind;
  materialRoute: CarrierIntegralRouteKind;
  targetSupport: Partial<Record<CarrierIntegralTargetId, boolean>>;
  defaultParams: CarrierIntegralMachineParams;
  treatAsDistinctMachine: boolean;
  canBePresetOf?: CarrierIntegralMachineFamily[];
  summary: string;
  guardrail: string;
};

export type CarrierIntegralPresetDefinition = {
  id: string;
  machineId: CarrierIntegralMachineId;
  label: string;
  bodySourceMode?: CarrierIntegralBodySourceMode;
  params: Partial<CarrierIntegralMachineParams>;
  source: '5.69' | 'branch-a' | 'branch-b-5.73' | 'branch-b-5.82' | 'branch-c' | 'new-integral' | 'harmonic-xplore' | 'strange-attractor';
  intendedCarrierUse: string;
};

export type CarrierIntegralRouteSignature = {
  machineId: CarrierIntegralMachineId;
  bodySourceMode: CarrierIntegralBodySourceMode;
  antiBurstStrategy: CarrierIntegralAntiBurstStrategy;
  rootFollowRoute: CarrierIntegralRouteKind;
  materialRoute: CarrierIntegralRouteKind;
  paramsHash: string;
};
