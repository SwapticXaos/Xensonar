import type { SemanticNode } from '../xensonar/domain/runtimeTypes';
import { clamp } from '../xensonar/helpers';
import type { ConstellationSignature } from './constellationSignature';
import type { MyceliumSnapshot } from './myceliumSnapshot';
import type { NodalRelationLayer } from './nodalRelationLayer';
import { blendSpatialFieldIntoLegacySignature } from './myzelLegacySignatureBridge';
import type { MyzelSpatialFieldProbe } from './myzelSpatialFieldTypes';
import { buildMyzelTopologicalRelations } from './myzelTopologicalRelations';
import type { MyzelRoom3Cursor, MyzelRoom3Params } from './myzelRoom3FramePhysics';
import type { MyzelRoom3FrameMetrics } from './myzelRoom3FrameMetrics';

export type MyzelRoom3ConstellationState = {
  ratios: number[];
  tension: number;
  brightness: number;
  centroidX: number;
  centroidY: number;
  flux: number;
};

export type AssembleMyzelRoom3SnapshotArgs = {
  cursor: MyzelRoom3Cursor;
  params: MyzelRoom3Params;
  width: number;
  height: number;
  maxEnergy: number;
  dominantFreq: number;
  activeNode: SemanticNode | null;
  metrics: MyzelRoom3FrameMetrics;
  previousConstellation: MyzelRoom3ConstellationState;
  constellationSignature: ConstellationSignature;
  spatialFieldProbe: MyzelSpatialFieldProbe;
  nodalRelationLayer: NodalRelationLayer;
};

export type MyzelRoom3SnapshotAssembly = {
  snapshot: MyceliumSnapshot;
  constellationState: MyzelRoom3ConstellationState;
};

export function assembleMyzelRoom3Snapshot(args: AssembleMyzelRoom3SnapshotArgs): MyzelRoom3SnapshotAssembly {
  const {
    cursor: cur,
    params,
    width,
    height,
    maxEnergy,
    dominantFreq,
    activeNode,
    metrics,
    previousConstellation,
    constellationSignature,
    spatialFieldProbe,
    nodalRelationLayer,
  } = args;
  const { tension, slimLayers, rawReality } = params;
  const {
    nodeEnergyByLabel,
    layoutSpread,
    nearestNode,
    nearestNodeDist,
    coherence,
    tensionField,
  } = metrics;

  const ratioDelta = constellationSignature.ratios.reduce((sum, ratio, idx) => {
    const prevRatio = previousConstellation.ratios[idx] ?? ratio;
    return sum + Math.abs(ratio - prevRatio) / Math.max(0.001, prevRatio);
  }, 0) / Math.max(1, constellationSignature.ratios.length);
  const centroidDelta = Math.hypot(
    constellationSignature.centroidX - previousConstellation.centroidX,
    constellationSignature.centroidY - previousConstellation.centroidY,
  );
  const signatureDelta = clamp(
    ratioDelta * 0.65
      + Math.abs(constellationSignature.tension - previousConstellation.tension) * 0.55
      + Math.abs(constellationSignature.brightness - previousConstellation.brightness) * 0.45
      + centroidDelta * 0.4,
    0,
    1.25,
  );
  const constellationFluxRaw = clamp(previousConstellation.flux * 0.82 + signatureDelta * 0.52, 0, 1);
  const constellationTensionRaw = clamp(constellationSignature.tension * 0.68 + tensionField * 0.32, 0, 1);
  const constellationBrightnessRaw = clamp(constellationSignature.brightness * 0.72 + maxEnergy * 0.14 + coherence * 0.14, 0, 1);
  const spatialConstellation = blendSpatialFieldIntoLegacySignature({
    legacyTension: constellationTensionRaw,
    legacyBrightness: constellationBrightnessRaw,
    legacyFlux: constellationFluxRaw,
    probe: spatialFieldProbe,
  });

  const nearestNodeIdForSpatialSignature = nearestNode?.residentId ?? nearestNode?.label ?? null;
  const nearestSpatialNode = nearestNodeIdForSpatialSignature
    ? spatialFieldProbe.nodeConfigs.find((entry) => entry.id === nearestNodeIdForSpatialSignature) ?? null
    : null;
  const nearestAuraStrength = nearestSpatialNode
    ? clamp(
        spatialFieldProbe.ball.nearestNodeWeight * 0.62
          + (1 - clamp(nearestNodeDist / Math.max(48, nearestSpatialNode.config.modules[0]?.radius ?? 150), 0, 1)) * 0.28
          + nearestSpatialNode.energy * 0.1,
        0,
        1,
      )
    : 0;
  const myzelTopologicalRelations = buildMyzelTopologicalRelations(spatialFieldProbe, 6);
  const primaryTopologicalRelation = myzelTopologicalRelations[0] ?? null;
  const constellationFlux = spatialConstellation.constellationFlux;
  const constellationTension = spatialConstellation.constellationTension;
  const constellationBrightness = spatialConstellation.constellationBrightness;
  const constellationState: MyzelRoom3ConstellationState = {
    ...constellationSignature,
    tension: constellationTension,
    brightness: constellationBrightness,
    flux: constellationFlux,
  };

  return {
    constellationState,
    snapshot: {
      tension,
      slimLayers,
      rawReality,
      maxEnergy,
      dominantFreq,
      activeNodeLabel: activeNode?.label ?? null,
      activeNodeId: activeNode?.residentId ?? activeNode?.label ?? null,
      activeNodeFreq: activeNode?.freq ?? 0,
      cursorNormalizedX: clamp(cur.x / width, 0, 1),
      cursorNormalizedY: clamp(cur.y / height, 0, 1),
      myceliumBallSpeed: Math.hypot(cur.vx, cur.vy),
      nodeEnergyByLabel,
      layoutSpread: clamp(layoutSpread, 0, 1),
      nearestNodeLabel: nearestNode?.label ?? null,
      nearestNodeId: nearestNode?.residentId ?? nearestNode?.label ?? null,
      nearestNodeFreq: nearestNode?.freq ?? 0,
      nearestNodeEnergy: clamp(nearestNode?.energy ?? 0, 0, 1),
      ballToNearestNodeNormDist: clamp(nearestNodeDist / 220, 0, 1),
      coherence,
      tensionField,
      constellationRatios: constellationSignature.ratios,
      constellationTension,
      constellationFlux,
      constellationBrightness,
      constellationCentroidX: constellationSignature.centroidX,
      constellationCentroidY: constellationSignature.centroidY,
      myzelRelationTension: spatialFieldProbe.ball.relationTension,
      myzelVoidPressure: spatialFieldProbe.ball.voidPressure,
      myzelLocalRoughness: spatialFieldProbe.ball.localRoughness,
      myzelLocalBrightness: spatialFieldProbe.ball.localBrightness,
      myzelLocalBody: spatialFieldProbe.ball.localBody,
      myzelLocalFormant: spatialFieldProbe.ball.localFormantShift,
      myzelSpatialWavefolder: spatialFieldProbe.ball.spatialEffectMix.wavefolderAmount,
      myzelSpatialFormant: spatialFieldProbe.ball.spatialEffectMix.formantAmount,
      myzelSpatialShimmer: spatialFieldProbe.ball.spatialEffectMix.shimmerAmount,
      myzelSpatialBitcrusher: spatialFieldProbe.ball.spatialEffectMix.bitcrusherAmount,
      myzelSpatialSub: spatialFieldProbe.ball.spatialEffectMix.subAmount,
      myzelSpatialResonator: spatialFieldProbe.ball.spatialEffectMix.resonatorAmount,
      myzelSpatialGrainBlur: spatialFieldProbe.ball.spatialEffectMix.grainBlurAmount,
      myzelSpatialDrive: spatialFieldProbe.ball.spatialEffectMix.driveAmount,
      myzelSpatialChorus: spatialFieldProbe.ball.spatialEffectMix.chorusAmount,
      myzelSpatialSpectralTilt: spatialFieldProbe.ball.spatialEffectMix.spectralTilt,
      myzelSpatialQ: spatialFieldProbe.ball.spatialEffectMix.q,
      myzelClusterMass: spatialFieldProbe.gestalt.clusterMass,
      myzelGestaltAsymmetry: spatialFieldProbe.gestalt.asymmetry,
      myzelGestaltLinearity: spatialFieldProbe.gestalt.linearity,
      myzelPaletteGlassAir: spatialFieldProbe.gestalt.paletteWeights.glassAir,
      myzelPaletteMetalCluster: spatialFieldProbe.gestalt.paletteWeights.metalCluster,
      myzelPaletteReedFormant: spatialFieldProbe.gestalt.paletteWeights.reedFormant,
      myzelPaletteUnstableNoise: spatialFieldProbe.gestalt.paletteWeights.unstableNoise,
      myzelPaletteWarmChoir: spatialFieldProbe.gestalt.paletteWeights.warmChoir,
      myzelNearestPresetId: nearestSpatialNode?.config.presetId ?? null,
      myzelNearestPresetLabel: nearestSpatialNode?.config.presetLabel ?? null,
      myzelNearestPrimaryFamily: nearestSpatialNode?.config.modules[0]?.family ?? null,
      myzelNearestAuraStrength: nearestAuraStrength,
      myzelNearestAuraRadius: nearestSpatialNode?.config.auraRadius ?? 0,
      myzelNearestModuleTypes: nearestSpatialNode?.config.modules.map((module) => module.type) ?? [],
      myzelTopologicalRelations,
      nodalRelationLayer,
      myzelTopologicalRelationCount: myzelTopologicalRelations.length,
      myzelPrimaryRelationInterference: primaryTopologicalRelation?.interference ?? 0,
      myzelPrimaryRelationSparkle: primaryTopologicalRelation?.sparkle ?? 0,
      myzelPrimaryRelationRatioA: primaryTopologicalRelation?.ratioA ?? 1,
      myzelPrimaryRelationRatioB: primaryTopologicalRelation?.ratioB ?? 1,
    },
  };
}
