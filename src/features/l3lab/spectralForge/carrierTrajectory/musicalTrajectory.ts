import type { ProjectionCarrierPlan } from '../donorV2/projectionCarrierPlan';

/**
 * Renderer-neutral musical motion. Pitch is absolute Hz so the carrier owns
 * melody/glissando independently from whichever donor/voice backend provides
 * timbre identity. Curves are sampled on normalized render time [0..1].
 */
export type MusicalVoiceTrajectory = {
  pitchHzCurve: number[];
  gainCurve: number[];
};

export type MusicalTrajectory = {
  version: 'musical-trajectory-v1';
  curveDomain: 'normalized-time';
  voices: MusicalVoiceTrajectory[];
};

export function projectionCarrierPlanToMusicalTrajectory(
  plan: ProjectionCarrierPlan,
): MusicalTrajectory {
  const rootReferenceHz = Number.isFinite(plan.rootReferenceHz)
    ? plan.rootReferenceHz
    : 1;
  return {
    version: 'musical-trajectory-v1',
    curveDomain: 'normalized-time',
    voices: plan.bands.map((band) => ({
      pitchHzCurve: band.centerRatioCurve.map((ratio) => ratio * rootReferenceHz),
      gainCurve: [...band.gainCurve],
    })),
  };
}

/**
 * Compatibility adapter for current DSP renderers. A 1 Hz reference makes the
 * carrier plan's ratio curve numerically equal to the trajectory's absolute Hz
 * curve; gain/silence semantics remain unchanged.
 */
export function musicalTrajectoryToProjectionCarrierPlan(
  trajectory: MusicalTrajectory,
): ProjectionCarrierPlan {
  return {
    rootReferenceHz: 1,
    bands: trajectory.voices.map((voice) => ({
      centerRatioCurve: [...voice.pitchHzCurve],
      gainCurve: [...voice.gainCurve],
    })),
  };
}
