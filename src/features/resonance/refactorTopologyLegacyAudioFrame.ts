import type { MyceliumSnapshot } from "../topology/myceliumSnapshot";
import { clamp, getNodeAuraSignature, lerp } from "./refactorTopologyNodeAura";

export type RefactorTopologyLegacyEnvelopeState = {
  activationStartedAt: number;
  relationTensionEnv: number;
  relationTensionRaw: number;
  voidPressureEnv: number;
  tensionReleaseSplash: number;
};

export const deriveRefactorTopologyLegacyAudioFrame = (
  now: number,
  rootHz: number,
  snapshot: MyceliumSnapshot,
  state: RefactorTopologyLegacyEnvelopeState,
) => {
  const startupRamp = clamp((now - state.activationStartedAt) / 0.28, 0, 1);
  const bassHz = clamp(rootHz * 0.5, 24, 220);
  const brightness = clamp(snapshot.constellationBrightness ?? 0.5, 0, 1);
  const tension = clamp(snapshot.constellationTension ?? 0, 0, 1);
  const flux = clamp(snapshot.constellationFlux ?? 0, 0, 1);
  const relationTension = clamp(snapshot.myzelRelationTension ?? 0, 0, 1);
  const voidPressure = clamp(snapshot.myzelVoidPressure ?? 0, 0, 1);
  const localRoughness = clamp(snapshot.myzelLocalRoughness ?? 0, 0, 1);
  const localBrightness = clamp(snapshot.myzelLocalBrightness ?? brightness, 0, 1);
  const localBody = clamp(snapshot.myzelLocalBody ?? 0.5, 0, 1);
  const localFormant = clamp(snapshot.myzelLocalFormant ?? 0.5, 0, 1);
  const spatialWavefolder = clamp(snapshot.myzelSpatialWavefolder ?? 0, 0, 1);
  const spatialFormant = clamp(snapshot.myzelSpatialFormant ?? 0, 0, 1);
  const spatialShimmer = clamp(snapshot.myzelSpatialShimmer ?? 0, 0, 1);
  const spatialBitcrusher = clamp(snapshot.myzelSpatialBitcrusher ?? 0, 0, 1);
  const spatialSub = clamp(snapshot.myzelSpatialSub ?? 0, 0, 1);
  const spatialResonator = clamp(snapshot.myzelSpatialResonator ?? 0, 0, 1);
  const spatialGrain = clamp(snapshot.myzelSpatialGrainBlur ?? 0, 0, 1);
  const spatialDrive = clamp(snapshot.myzelSpatialDrive ?? 0, 0, 1);
  const spatialChorus = clamp(snapshot.myzelSpatialChorus ?? 0, 0, 1);
  const spatialTilt = clamp(snapshot.myzelSpatialSpectralTilt ?? 0.5, 0, 1);
  const spatialQ = clamp(snapshot.myzelSpatialQ ?? 0.35, 0, 1);
  const clusterMass = clamp(snapshot.myzelClusterMass ?? 0, 0, 1);
  const gestaltAsymmetry = clamp(snapshot.myzelGestaltAsymmetry ?? 0, 0, 1);
  const gestaltLinearity = clamp(snapshot.myzelGestaltLinearity ?? 0, 0, 1);
  const paletteGlassAir = clamp(snapshot.myzelPaletteGlassAir ?? 0.28, 0, 1);
  const paletteMetalCluster = clamp(snapshot.myzelPaletteMetalCluster ?? 0, 0, 1);
  const paletteReedFormant = clamp(snapshot.myzelPaletteReedFormant ?? 0, 0, 1);
  const paletteUnstableNoise = clamp(snapshot.myzelPaletteUnstableNoise ?? 0, 0, 1);
  const paletteWarmChoir = clamp(snapshot.myzelPaletteWarmChoir ?? 0.72, 0, 1);
  const previousRawTension = state.relationTensionRaw;
  state.relationTensionEnv = clamp(lerp(state.relationTensionEnv, relationTension, relationTension > state.relationTensionEnv ? 0.35 : 0.015), 0, 1);
  state.voidPressureEnv = clamp(lerp(state.voidPressureEnv, voidPressure, 0.05), 0, 1);
  const tensionRelease = clamp(previousRawTension - relationTension, 0, 1);
  state.tensionReleaseSplash = clamp(Math.max(state.tensionReleaseSplash * 0.92, tensionRelease * 2.5), 0, 1);
  state.relationTensionRaw = relationTension;
  const tensionEnv = state.relationTensionEnv;
  const voidEnv = state.voidPressureEnv;
  const releaseSplash = state.tensionReleaseSplash;
  const spatialDistortion = clamp(spatialDrive * 0.5 + spatialWavefolder * 0.48 + spatialBitcrusher * 0.34 + spatialGrain * 0.22 + paletteMetalCluster * 0.16 + paletteUnstableNoise * 0.12 + tensionEnv * 0.12, 0, 1);
  const spatialAir = clamp(spatialShimmer * 0.48 + spatialChorus * 0.26 + Math.max(0, spatialTilt - 0.5) * 0.34 + paletteGlassAir * 0.12 + releaseSplash * 0.54, 0, 1);
  const fieldFormant = clamp(spatialFormant * 0.72 + paletteReedFormant * 0.24 + gestaltLinearity * 0.18 + localFormant * 0.12, 0, 1);
  const fieldVoidSub = clamp(spatialSub * 0.58 + voidEnv * 0.44 + spatialResonator * 0.2 + clusterMass * 0.08, 0, 1);
  const centroidPan = clamp((snapshot.constellationCentroidX ?? 0.5) * 2 - 1, -0.85, 0.85);
  const nearestPresetId = snapshot.myzelNearestPresetId ?? null;
  const nodeSignature = getNodeAuraSignature(nearestPresetId);
  const nearestAura = clamp(snapshot.myzelNearestAuraStrength ?? 0, 0, 1);
  const signaturePresence = clamp(nearestAura * 0.66 + (1 - clamp(snapshot.ballToNearestNodeNormDist, 0, 1)) * 0.2 + relationTension * 0.09 + voidPressure * 0.05, 0, 1);
  const signatureAir = nodeSignature.airBias * signaturePresence;
  const signatureSub = nodeSignature.subBias * signaturePresence;

  return {
    startupRamp,
    bassHz,
    brightness,
    tension,
    flux,
    relationTension,
    voidPressure,
    localRoughness,
    localBrightness,
    localBody,
    localFormant,
    spatialWavefolder,
    spatialFormant,
    spatialShimmer,
    spatialBitcrusher,
    spatialSub,
    spatialResonator,
    spatialGrain,
    spatialDrive,
    spatialChorus,
    spatialTilt,
    spatialQ,
    clusterMass,
    gestaltAsymmetry,
    gestaltLinearity,
    paletteGlassAir,
    paletteMetalCluster,
    paletteReedFormant,
    paletteUnstableNoise,
    paletteWarmChoir,
    tensionEnv,
    voidEnv,
    releaseSplash,
    spatialDistortion,
    spatialAir,
    fieldFormant,
    fieldVoidSub,
    centroidPan,
    nearestPresetId,
    nodeSignature,
    nearestAura,
    signaturePresence,
    signatureAir,
    signatureSub,
  };
};
