export type SchwarmMaterial = "glass" | "metal" | "resin" | "fungus" | "dust" | "plasma";

export interface Bounds2D {
  width: number;
  height: number;
}

export interface ParticleVoiceSnapshot {
  id?: string | number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life?: number;
  energy?: number;
  ratio?: number;
  freq?: number;
  hue?: number;
  clusterId?: string | number | null;
  justSpawned?: boolean;
  collisionImpulse?: number;
}

export interface ParticleFrameInput {
  time: number;
  dt?: number;
  bounds?: Bounds2D;
  particles: ParticleVoiceSnapshot[];
}

export interface SwarmRawMetrics {
  activeCount: number;
  spawnRate: number;
  collisionRate: number;
  meanSpeed: number;
  speedVariance: number;
  directionCoherence: number;
  centerOfMassX: number;
  centerOfMassY: number;
  centerDrift: number;
  normalizedDispersion: number;
  localDensityPeak: number;
  clusterCount: number;
  pitchEntropy: number;
  intervalCohesion: number;
  topologyStability: number;
  energySlope: number;
  orbitality: number;
  recurrenceHint: number;
  spectralCentroidHz: number;
}

export interface SwarmDescriptorVector {
  cohesion: number;
  turbulence: number;
  crystallization: number;
  pressure: number;
  fracture: number;
  orbitality: number;
  recurrence: number;
}

export interface SwarmState {
  time: number;
  dt: number;
  raw: SwarmRawMetrics;
  descriptors: SwarmDescriptorVector;
}

export interface MaterialProfile {
  resonanceQ: number;
  resonanceSpread: number;
  shimmerDrive: number;
  brightness: number;
  feedback: number;
  stereoSpread: number;
  undercurrent: number;
}

export interface SchwarmdeuterParams {
  amount: number;
  interpretiveBias: number;
  sensitivity: number;
  memorySeconds: number;
  material: SchwarmMaterial;
  densityBias: number;
  weave: number;
  bypass: boolean;
}

export interface SchwarmdeuterOptions {
  params?: Partial<SchwarmdeuterParams>;
}

export const DEFAULT_SCHWARMDEUTER_PARAMS: SchwarmdeuterParams = {
  amount: 0.62,
  interpretiveBias: 0.72,
  sensitivity: 0.68,
  memorySeconds: 1.6,
  material: "fungus",
  densityBias: 0.5,
  weave: 0.55,
  bypass: false,
};
