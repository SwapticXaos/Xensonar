import type { MyceliumSnapshot } from "../topology/myceliumSnapshot";
import type { Room3BodyControls } from "./timbreModel";

export interface Room3ModField {
  gateGlobal: number;
  gateBody: number;
  gateShimmer: number;
  motion: number;
  coherence: number;
  tension: number;
  brightness: number;
  density: number;
  asymmetry: number;
  drift: number;
  roughness: number;
  air: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const deriveRoom3ModField = (
  snapshot: MyceliumSnapshot,
  gate: number,
  controls: Room3BodyControls,
): Room3ModField => {
  const safeGate = clamp(gate, 0, 1);
  const flux = clamp(snapshot.constellationFlux ?? 0, 0, 1);
  const tension = clamp(snapshot.constellationTension ?? snapshot.tensionField ?? 0, 0, 1);
  const brightness = clamp(snapshot.constellationBrightness ?? 0.5, 0, 1);
  const coherence = clamp(snapshot.coherence ?? 0, 0, 1);
  const motion = clamp((snapshot.myceliumBallSpeed ?? 0) / 12, 0, 1);
  const density = clamp((1 - (snapshot.layoutSpread ?? 0)) * 0.62 + (snapshot.nearestNodeEnergy ?? 0) * 0.38, 0, 1);
  const centroidX = clamp(snapshot.constellationCentroidX ?? 0.5, 0, 1);
  const centroidY = clamp(snapshot.constellationCentroidY ?? 0.5, 0, 1);
  const asymmetry = clamp(Math.abs(centroidX - 0.5) * 1.45 + Math.abs(centroidY - 0.5) * 0.8, 0, 1);
  const drift = clamp(motion * (1 - coherence * 0.42) + flux * 0.25, 0, 1);
  const roughness = clamp(
    controls.roughness * 0.55
      + tension * 0.3
      + flux * 0.22
      + (1 - coherence) * 0.16
      + asymmetry * 0.12,
    0,
    1,
  );
  const air = clamp(
    controls.air * 0.58
      + brightness * 0.26
      + flux * 0.16
      + (1 - density) * 0.12,
    0,
    1,
  );

  return {
    gateGlobal: clamp(safeGate * (0.72 + controls.coupling * 0.28) + flux * 0.14, 0, 1),
    gateBody: clamp(safeGate * 0.58 + flux * 0.32 + tension * 0.18, 0, 1),
    gateShimmer: clamp(safeGate * 0.34 + brightness * 0.38 + air * 0.22, 0, 1),
    motion,
    coherence,
    tension,
    brightness,
    density,
    asymmetry,
    drift,
    roughness,
    air,
  };
};
