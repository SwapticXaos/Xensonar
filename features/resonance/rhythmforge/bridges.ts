import type { MyceliumSnapshot } from '../../topology/myceliumSnapshot';
import type { GrooveState } from './types';
const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
export function grooveStateFromMycelium(snapshot: MyceliumSnapshot, time: number): GrooveState {
  const cohesion = clamp01(snapshot.coherence * 0.7 + (1 - snapshot.ballToNearestNodeNormDist) * 0.15 + snapshot.layoutSpread * 0.15);
  const turbulence = clamp01(snapshot.constellationFlux * 0.7 + snapshot.myceliumBallSpeed * 0.3);
  const crystallization = clamp01((1 - snapshot.layoutSpread) * 0.45 + snapshot.coherence * 0.35 + snapshot.constellationBrightness * 0.2);
  const pressure = clamp01(snapshot.maxEnergy * 0.55 + snapshot.nearestNodeEnergy * 0.25 + snapshot.tension * 0.2);
  const fracture = clamp01(snapshot.constellationTension * 0.5 + snapshot.tensionField * 0.35 + snapshot.rawReality * 0.15);
  const orbitality = clamp01(snapshot.myceliumBallSpeed * 0.55 + Math.abs(snapshot.constellationCentroidX - 0.5) * 0.25 + Math.abs(snapshot.constellationCentroidY - 0.5) * 0.2);
  const recurrence = clamp01(snapshot.coherence * 0.4 + (1 - snapshot.ballToNearestNodeNormDist) * 0.35 + (1 - snapshot.constellationFlux) * 0.25);
  return { time, descriptors: { cohesion, turbulence, crystallization, pressure, fracture, orbitality, recurrence }, spectralCentroidHz: snapshot.dominantFreq };
}
