// Shared pure data contracts for Room-III/Myzel spatial-field reading.
// Keep this file free of runtime readers, UI code and WebAudio nodes.

export type MyzelEffectModuleType =
  | 'wavefolder'
  | 'formant_filter'
  | 'shimmer_delay'
  | 'bitcrusher'
  | 'sub_harmonic'
  | 'comb_filter'
  | 'spectral_tilt'
  | 'grain_blur'
  | 'drive'
  | 'chorus'
  | 'resonator';

export type MyzelEffectFamily =
  | 'distortion'
  | 'formant'
  | 'delay'
  | 'resonator'
  | 'grain'
  | 'spectral'
  | 'sub'
  | 'noise'
  | 'filter'
  | 'modulation';

export type MyzelNodePresetId =
  | 'koerper'
  | 'glas'
  | 'metall'
  | 'luft'
  | 'koernung'
  | 'vokal'
  | 'dreckecke'
  | 'vokalecke'
  | 'shimmerhof'
  | 'metallcluster'
  | 'subwurzel'
  | 'custom';

export type MyzelNodeEffectId = MyzelEffectModuleType;

export interface MyzelNodeTimbreProfile {
  brightness: number;
  roughness: number;
  metallicity: number;
  breath: number;
  body: number;
  formant: number;
  partialBias: number;
  resonanceMass: number;
}

export interface MyzelNodeEffectModule {
  type: MyzelEffectModuleType;
  family: MyzelEffectFamily;
  intensity: number;
  radius: number;
  falloff: number;
  params: {
    drive?: number;
    color?: number;
    vowel?: number;
    time?: number;
    feedback?: number;
    q?: number;
    mix?: number;
    tilt?: number;
    grainSize?: number;
    body?: number;
    depth?: number;
  };
}

export type MyzelNodeAuraSource = 'node_effect_default' | 'explicit_node_effect' | 'legacy_preset_compat' | 'custom_placeholder';

export interface MyzelNodeAuraBuildContext {
  normalizedX: number;
  normalizedY: number;
  energy: number;
  freq: number;
  timbre: MyzelNodeTimbreProfile;
}

export interface MyzelNodeAuraPresetDefinition {
  id: MyzelNodePresetId;
  label: string;
  defaultRadius: number;
  modules: (context: MyzelNodeAuraBuildContext) => MyzelNodeEffectModule[];
}

export interface MyzelNodeSpatialConfig {
  presetId: MyzelNodePresetId;
  presetLabel: string;
  effectId: MyzelNodeEffectId;
  effectLabel: string;
  auraRadius: number;
  source: MyzelNodeAuraSource;
  timbre: MyzelNodeTimbreProfile;
  modules: MyzelNodeEffectModule[];
}

export interface MyzelConstellationGestalt {
  density: number;
  asymmetry: number;
  linearity: number;
  clusterMass: number;
  averageDistance: number;
  centroidX: number;
  centroidY: number;
  axisAngle: number;
  axisStrength: number;
  paletteWeights: {
    glassAir: number;
    metalCluster: number;
    reedFormant: number;
    unstableNoise: number;
    warmChoir: number;
  };
}

export interface MyzelSpatialEffectMix {
  wavefolderAmount: number;
  formantAmount: number;
  shimmerAmount: number;
  bitcrusherAmount: number;
  subAmount: number;
  resonatorAmount: number;
  grainBlurAmount: number;
  driveAmount: number;
  chorusAmount: number;
  spectralTilt: number;
  brightness: number;
  roughness: number;
  body: number;
  vowel: number;
  q: number;
}

export interface MyzelSpatialRelation {
  nodeAId: string;
  nodeBId: string;
  nodeALabel: string;
  nodeBLabel: string;
  familyA: MyzelEffectFamily;
  familyB: MyzelEffectFamily;
  presetA: MyzelNodePresetId;
  presetB: MyzelNodePresetId;
  tension: number;
  crossModAmount: number;
  distance: number;
  distanceToBall: number;
}

export interface MyzelBallSpectralReading {
  localHarmonicity: number;
  localFormantShift: number;
  localRoughness: number;
  localBrightness: number;
  localBody: number;
  nearestNodeWeight: number;
  relationTension: number;
  voidPressure: number;
  activeNodeIds: string[];
  activeRelations: MyzelSpatialRelation[];
  spatialEffectMix: MyzelSpatialEffectMix;
}

export interface MyzelAuraOverlap {
  nodeAId: string;
  nodeBId: string;
  nodeALabel: string;
  nodeBLabel: string;
  presetA: MyzelNodePresetId;
  presetB: MyzelNodePresetId;
  familyA: MyzelEffectFamily;
  familyB: MyzelEffectFamily;
  x: number;
  y: number;
  distance: number;
  overlap: number;
  softness: number;
  interference: number;
  sparkle: number;
  hue: number;
}

export interface MyzelSpatialFieldProbe {
  gestalt: MyzelConstellationGestalt;
  ball: MyzelBallSpectralReading;
  auraOverlaps: MyzelAuraOverlap[];
  nodeConfigs: Array<{ id: string; label: string; x: number; y: number; energy: number; config: MyzelNodeSpatialConfig }>;
}
