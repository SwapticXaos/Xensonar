import type { MyzelSpatialFieldProbe } from './myzelSpatialFieldTypes';

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

export interface MyzelLegacySignatureBlendArgs {
  legacyTension: number;
  legacyBrightness: number;
  legacyFlux: number;
  probe: MyzelSpatialFieldProbe;
}

export interface MyzelLegacySignatureBlend {
  constellationTension: number;
  constellationBrightness: number;
  constellationFlux: number;
}

export function blendSpatialFieldIntoLegacySignature(args: MyzelLegacySignatureBlendArgs): MyzelLegacySignatureBlend {
  const { legacyTension, legacyBrightness, legacyFlux, probe } = args;
  const weights = probe.gestalt.paletteWeights;
  const fieldTension = clamp01(
    probe.ball.relationTension * 0.5
      + probe.gestalt.clusterMass * 0.24
      + weights.unstableNoise * 0.14
      + probe.ball.localRoughness * 0.12,
  );
  const fieldBrightness = clamp01(
    probe.ball.localBrightness * 0.38
      + weights.glassAir * 0.22
      + weights.reedFormant * 0.14
      + weights.metalCluster * 0.12
      + probe.ball.spatialEffectMix.spectralTilt * 0.14,
  );
  const fieldFlux = clamp01(
    probe.ball.voidPressure * 0.24
      + probe.ball.relationTension * 0.36
      + probe.gestalt.asymmetry * 0.16
      + probe.gestalt.linearity * 0.08
      + probe.ball.localRoughness * 0.16,
  );
  return {
    constellationTension: clamp01(legacyTension * 0.82 + fieldTension * 0.18),
    constellationBrightness: clamp01(legacyBrightness * 0.84 + fieldBrightness * 0.16),
    constellationFlux: clamp01(legacyFlux * 0.86 + fieldFlux * 0.14),
  };
}
