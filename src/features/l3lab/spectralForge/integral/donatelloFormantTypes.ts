export type DonatelloBandRole =
  | 'core-line'
  | 'body-band'
  | 'surface-band'
  | 'residual-band'
  | 'transient-dust';

export type DonatelloFormantBandPlan = {
  id: string;
  role: DonatelloBandRole;
  centerRatioCurve: number[];
  bandwidthRatioCurve: number[];
  gainCurve: number[];
  confidenceCurve?: number[];
  roughnessCurve?: number[];
};

export type DonatelloFormantPlanSummary = {
  inputEnergy: number;
  retainedLineEnergy: number;
  textureEnergy: number;
  transientEnergy: number;
  rawMaxSliceGain: number;
  maxSliceGain: number;
  safeGainCeiling: number;
  gainCeilingScaleCount: number;
  bandCount: number;
  curveResolution: number;
  estimatedAutomationCurves: number;
  emptySliceCount: number;
  opposingTrackPairCount: number;
  maxResidualSlice: number;
  maxRoughnessSlice: number;
  maxTransientDustSlice: number;
};

export type DonatelloFormantRenderPlan = {
  schemaVersion: 'donatello-formant-plan-v1';
  machineId: 'donatello-formant-window-body' | 'dieter-window-body';
  curveResolution: number;
  maxBands: number;
  rootReferenceHz: number;
  durationBeats: number;
  bands: DonatelloFormantBandPlan[];
  roughnessCurve: number[];
  transientDustCurve: number[];
  residualEnergyCurve: number[];
  summary: DonatelloFormantPlanSummary;
};

export type DonatelloFormantPlanBuildOptions = {
  curveResolution?: number;
  maxBands?: number;
  safeGainCeiling?: number;
  minEnergy?: number;
  rootReferenceHz?: number;
  durationBeats?: number;
  machineId?: 'donatello-formant-window-body' | 'dieter-window-body';
};

export const DONATELLO_FORMANT_PLAN_SCHEMA_VERSION = 'donatello-formant-plan-v1';
