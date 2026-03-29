import type { GrooveState } from "./types";

export interface SchwarmLikeState {
  time: number;
  raw?: {
    spectralCentroidHz?: number;
  };
  descriptors: {
    cohesion: number;
    turbulence: number;
    crystallization: number;
    pressure: number;
    fracture: number;
    orbitality: number;
    recurrence: number;
  };
}

export function grooveStateFromSchwarm(state: SchwarmLikeState): GrooveState {
  return {
    time: state.time,
    descriptors: {
      cohesion: state.descriptors.cohesion,
      turbulence: state.descriptors.turbulence,
      crystallization: state.descriptors.crystallization,
      pressure: state.descriptors.pressure,
      fracture: state.descriptors.fracture,
      orbitality: state.descriptors.orbitality,
      recurrence: state.descriptors.recurrence,
    },
    spectralCentroidHz: state.raw?.spectralCentroidHz,
  };
}
