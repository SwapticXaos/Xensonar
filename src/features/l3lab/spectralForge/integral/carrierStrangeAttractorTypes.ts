// Xensonar 3.2.91.7.5.98
// Strange Attractor · Schwarmkörper — passive Carrier plan contract.
//
// This file defines a synthetic interpretation plan. It is not a renderer,
// not a Materialschmiede import path, not a Melodic Loop export, and not an
// iframe/game audio capture bridge.

export const STRANGE_ATTRACTOR_CARRIER_MACHINE_ID = 'strange-attractor-schwarmkoerper' as const;
export const STRANGE_ATTRACTOR_CARRIER_PLAN_VERSION = 1 as const;

export type StrangeAttractorCarrierMachineId = typeof STRANGE_ATTRACTOR_CARRIER_MACHINE_ID;
export type StrangeAttractorCarrierTuning = 'free' | '12edo' | 'ji' | 'bp';
export type StrangeAttractorSwarmFamily = 'drift' | 'orbit' | 'spray' | 'cluster';
export type StrangeAttractorAmpShape = 'soft' | 'pulse' | 'grainy' | 'swarm';

export type StrangeAttractorCarrierWindowInput = {
  readonly t0: number;
  readonly t1: number;
  readonly centerHz?: number;
  readonly energy?: number;
  readonly density?: number;
  readonly bandwidth?: number;
  readonly roughness?: number;
  readonly presence?: number;
  readonly continuity?: number;
};

export type StrangeAttractorCarrierInput = {
  readonly sourceCarrierId?: string;
  readonly durationSec: number;
  readonly rootHz?: number;
  readonly windows: readonly StrangeAttractorCarrierWindowInput[];
};

export type StrangeAttractorCarrierOptions = {
  readonly seed?: number | string;
  readonly tuning?: StrangeAttractorCarrierTuning;
  readonly maxAttractors?: number;
  readonly maxSwarmEvents?: number;
  readonly minHz?: number;
  readonly maxHz?: number;
};

export type StrangeAttractoroughnessCurvePoint = {
  readonly t: number;
  readonly value: number;
};

export type StrangeAttractorHzCurvePoint = {
  readonly t: number;
  readonly hz: number;
};

export type StrangeAttractorFilteroughnessCurvePoint = {
  readonly t: number;
  readonly hz: number;
  readonly q: number;
};

export type StrangeAttractorMotionCurvePoint = {
  readonly t: number;
  readonly x: number;
  readonly y: number;
};

export type StrangeAttractorEffectCurvePoint = {
  readonly t: number;
  readonly phaser: number;
  readonly flanger: number;
  readonly saturation: number;
  readonly reverb: number;
};

export type StrangeAttractorDronePlan = {
  readonly rootHzCurve: readonly StrangeAttractorHzCurvePoint[];
  readonly energyCurve: readonly StrangeAttractoroughnessCurvePoint[];
  readonly filteroughnessCurve: readonly StrangeAttractorFilteroughnessCurvePoint[];
  readonly motionCurve: readonly StrangeAttractorMotionCurvePoint[];
  readonly effectCurve: readonly StrangeAttractorEffectCurvePoint[];
};

export type StrangeAttractorFamilyBias = Record<StrangeAttractorSwarmFamily, number>;

export type StrangeAttractorNodePlan = {
  readonly id: string;
  readonly t0: number;
  readonly t1: number;
  readonly x: number;
  readonly y: number;
  readonly hz: number;
  readonly strength: number;
  readonly radius: number;
  readonly familyBias: StrangeAttractorFamilyBias;
};

export type StrangeAttractorSwarmEvent = {
  readonly id: string;
  readonly family: StrangeAttractorSwarmFamily;
  readonly startSec: number;
  readonly durationSec: number;
  readonly hz: number;
  readonly amp: number;
  readonly pan: number;
  readonly x: number;
  readonly y: number;
  readonly attractorId?: string;
  readonly modulation: {
    readonly pitchBendCents?: number;
    readonly ampShape: StrangeAttractorAmpShape;
    readonly filterBias: number;
    readonly chaos: number;
  };
};

export type StrangeAttractorCarrieroughnessCurves = {
  readonly densityCurve: readonly StrangeAttractoroughnessCurvePoint[];
  readonly roughnessCurve: readonly StrangeAttractoroughnessCurvePoint[];
  readonly continuityCurve: readonly StrangeAttractoroughnessCurvePoint[];
  readonly presenceCurve: readonly StrangeAttractoroughnessCurvePoint[];
};

export type StrangeAttractorCarrierPlan = {
  readonly version: typeof STRANGE_ATTRACTOR_CARRIER_PLAN_VERSION;
  readonly machineId: StrangeAttractorCarrierMachineId;
  readonly sourceCarrierId?: string;
  readonly durationSec: number;
  readonly rootHz: number;
  readonly tuning: StrangeAttractorCarrierTuning;
  readonly drone: StrangeAttractorDronePlan;
  readonly attractors: readonly StrangeAttractorNodePlan[];
  readonly swarmEvents: readonly StrangeAttractorSwarmEvent[];
  readonly curves: StrangeAttractorCarrieroughnessCurves;
  readonly summary: {
    readonly attractorCount: number;
    readonly swarmEventCount: number;
    readonly meanDensity: number;
    readonly energyMean: number;
    readonly energyPeak: number;
    readonly driftBias: number;
    readonly orbitBias: number;
    readonly sprayBias: number;
    readonly clusterBias: number;
  };
  readonly debug: {
    readonly seed: number;
    readonly sourceWindowCount: number;
    readonly rejectedEventCount: number;
    readonly quantizationMode: StrangeAttractorCarrierTuning;
  };
};
