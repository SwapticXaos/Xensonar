import type { NodalRelationLayer } from './nodalRelationLayer';

export interface MyzelTopologicalRelationSnapshot {
  nodeAId: string;
  nodeBId: string;
  nodeALabel: string;
  nodeBLabel: string;
  presetA: string;
  presetB: string;
  familyA: string;
  familyB: string;
  ratioA: number;
  ratioB: number;
  overlap: number;
  interference: number;
  sparkle: number;
  relationTension: number;
  crossModAmount: number;
  distance: number;
}

export interface MyceliumSnapshot {
  tension: number;
  slimLayers: number;
  rawReality: number;

  maxEnergy: number;
  dominantFreq: number;
  activeNodeLabel: string | null;
  activeNodeId: string | null;
  activeNodeFreq: number;

  cursorNormalizedX: number;
  cursorNormalizedY: number;
  myceliumBallSpeed: number;

  nodeEnergyByLabel: Record<string, number>;

  layoutSpread: number;
  nearestNodeLabel: string | null;
  nearestNodeId: string | null;
  nearestNodeFreq: number;
  nearestNodeEnergy: number;
  ballToNearestNodeNormDist: number;
  coherence: number;
  tensionField: number;
  constellationRatios: number[];
  constellationTension: number;
  constellationFlux: number;
  constellationBrightness: number;
  constellationCentroidX: number;
  constellationCentroidY: number;

  myzelRelationTension: number;
  myzelVoidPressure: number;
  myzelLocalRoughness: number;
  myzelLocalBrightness: number;
  myzelLocalBody: number;
  myzelLocalFormant: number;
  myzelSpatialWavefolder: number;
  myzelSpatialFormant: number;
  myzelSpatialShimmer: number;
  myzelSpatialBitcrusher: number;
  myzelSpatialSub: number;
  myzelSpatialResonator: number;
  myzelSpatialGrainBlur: number;
  myzelSpatialDrive: number;
  myzelSpatialChorus: number;
  myzelSpatialSpectralTilt: number;
  myzelSpatialQ: number;
  myzelClusterMass: number;
  myzelGestaltAsymmetry: number;
  myzelGestaltLinearity: number;
  myzelPaletteGlassAir: number;
  myzelPaletteMetalCluster: number;
  myzelPaletteReedFormant: number;
  myzelPaletteUnstableNoise: number;
  myzelPaletteWarmChoir: number;
  myzelNearestPresetId: string | null;
  myzelNearestPresetLabel: string | null;
  myzelNearestPrimaryFamily: string | null;
  myzelNearestAuraStrength: number;
  myzelNearestAuraRadius: number;
  myzelNearestModuleTypes: string[];

  myzelTopologicalRelations: MyzelTopologicalRelationSnapshot[];
  nodalRelationLayer: NodalRelationLayer | null;
  myzelTopologicalRelationCount: number;
  myzelPrimaryRelationInterference: number;
  myzelPrimaryRelationSparkle: number;
  myzelPrimaryRelationRatioA: number;
  myzelPrimaryRelationRatioB: number;
}


export const createEmptyMyceliumSnapshot = (): MyceliumSnapshot => ({
  tension: 0,
  slimLayers: 0,
  rawReality: 0,
  maxEnergy: 0,
  dominantFreq: 0,
  activeNodeLabel: null,
  activeNodeId: null,
  activeNodeFreq: 0,
  cursorNormalizedX: 0.5,
  cursorNormalizedY: 0.5,
  myceliumBallSpeed: 0,
  nodeEnergyByLabel: {},
  layoutSpread: 0,
  nearestNodeLabel: null,
  nearestNodeId: null,
  nearestNodeFreq: 0,
  nearestNodeEnergy: 0,
  ballToNearestNodeNormDist: 1,
  coherence: 0.5,
  tensionField: 0,
  constellationRatios: [1.25, 1.5, 1.875],
  constellationTension: 0,
  constellationFlux: 0,
  constellationBrightness: 0.5,
  constellationCentroidX: 0.5,
  constellationCentroidY: 0.5,
  myzelRelationTension: 0,
  myzelVoidPressure: 0,
  myzelLocalRoughness: 0,
  myzelLocalBrightness: 0.5,
  myzelLocalBody: 0.5,
  myzelLocalFormant: 0.5,
  myzelSpatialWavefolder: 0,
  myzelSpatialFormant: 0,
  myzelSpatialShimmer: 0,
  myzelSpatialBitcrusher: 0,
  myzelSpatialSub: 0,
  myzelSpatialResonator: 0,
  myzelSpatialGrainBlur: 0,
  myzelSpatialDrive: 0,
  myzelSpatialChorus: 0,
  myzelSpatialSpectralTilt: 0.5,
  myzelSpatialQ: 0.35,
  myzelClusterMass: 0,
  myzelGestaltAsymmetry: 0,
  myzelGestaltLinearity: 0,
  myzelPaletteGlassAir: 0.28,
  myzelPaletteMetalCluster: 0,
  myzelPaletteReedFormant: 0,
  myzelPaletteUnstableNoise: 0,
  myzelPaletteWarmChoir: 0.72,
  myzelNearestPresetId: null,
  myzelNearestPresetLabel: null,
  myzelNearestPrimaryFamily: null,
  myzelNearestAuraStrength: 0,
  myzelNearestAuraRadius: 0,
  myzelNearestModuleTypes: [],
  myzelTopologicalRelations: [],
  nodalRelationLayer: null,
  myzelTopologicalRelationCount: 0,
  myzelPrimaryRelationInterference: 0,
  myzelPrimaryRelationSparkle: 0,
  myzelPrimaryRelationRatioA: 1,
  myzelPrimaryRelationRatioB: 1,
});
