export interface MyceliumSnapshot {
  tension: number;
  slimLayers: number;
  rawReality: number;

  maxEnergy: number;
  dominantFreq: number;
  activeNodeLabel: string | null;

  cursorNormalizedX: number;
  cursorNormalizedY: number;
  myceliumBallSpeed: number;

  nodeEnergyByLabel: Record<string, number>;

  layoutSpread: number;
  nearestNodeLabel: string | null;
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
}

export const createEmptyMyceliumSnapshot = (): MyceliumSnapshot => ({
  tension: 0,
  slimLayers: 0,
  rawReality: 0,
  maxEnergy: 0,
  dominantFreq: 0,
  activeNodeLabel: null,
  cursorNormalizedX: 0.5,
  cursorNormalizedY: 0.5,
  myceliumBallSpeed: 0,
  nodeEnergyByLabel: {},
  layoutSpread: 0,
  nearestNodeLabel: null,
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
});
