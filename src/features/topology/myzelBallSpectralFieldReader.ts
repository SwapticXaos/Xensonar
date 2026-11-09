import type { SemanticNode } from '../xensonar/domain/runtimeTypes';
import type {
  MyzelBallSpectralReading,
  MyzelNodeSpatialConfig,
  MyzelSpatialRelation,
} from './myzelSpatialFieldTypes';
import {
  addMyzelModuleToSpatialEffectMix,
  createEmptyMyzelSpatialEffectMix,
  getDominantMyzelModuleAmount,
  getPrimaryMyzelEffectFamily,
  normalizeMyzelSpatialEffectMix,
  resolveMyzelRelationCompatibility,
} from './myzelSpatialEffectMix';

type PointLike = { x: number; y: number };

type NodeLike = SemanticNode & {
  x: number;
  y: number;
  freq: number;
  energy: number;
  label: string;
  myzelEffectPresetId?: string;
  myzelEffectModuleType?: string;
  myzelEffectStrength?: number;
  myzelAuraRadius?: number;
};

type NodeSpatialConfigEntry = {
  id: string;
  label: string;
  x: number;
  y: number;
  energy: number;
  config: MyzelNodeSpatialConfig;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

function distanceToSegment(point: PointLike, a: PointLike, b: PointLike) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = point.x - a.x;
  const wy = point.y - a.y;
  const l2 = vx * vx + vy * vy;
  if (l2 <= 0.0001) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = clamp((wx * vx + wy * vy) / l2, 0, 1);
  return Math.hypot(point.x - (a.x + vx * t), point.y - (a.y + vy * t));
}

function gaussianAuraWeight(distance: number, radius: number, falloff = 1.7) {
  const safeRadius = Math.max(1, radius);
  const normalized = distance / safeRadius;
  return clamp01(Math.exp(-Math.pow(normalized, Math.max(0.7, falloff)) * 1.86));
}

export function readMyzelBallSpectralField(args: {
  ball: PointLike;
  nodes: NodeLike[];
  nodeConfigs: NodeSpatialConfigEntry[];
  width: number;
  height: number;
}): MyzelBallSpectralReading {
  const { ball, nodes, nodeConfigs } = args;
  if (!nodes.length) {
    return {
      localHarmonicity: 0.5,
      localFormantShift: 0.5,
      localRoughness: 0,
      localBrightness: 0.5,
      localBody: 0.5,
      nearestNodeWeight: 0,
      relationTension: 0,
      voidPressure: 0,
      activeNodeIds: [],
      activeRelations: [],
      spatialEffectMix: createEmptyMyzelSpatialEffectMix(),
    };
  }

  let totalWeight = 0;
  let localBrightness = 0;
  let localRoughness = 0;
  let localBody = 0;
  let localFormantShift = 0;
  let harmonicAccumulator = 0;
  let nearestNodeWeight = 0;
  let nearestDistance = Infinity;
  const activeNodeIds: string[] = [];
  const mix = createEmptyMyzelSpatialEffectMix();
  mix.brightness = 0;
  mix.body = 0;

  nodeConfigs.forEach((entry) => {
    const dist = Math.hypot(entry.x - ball.x, entry.y - ball.y);
    const radius = clamp(entry.config.auraRadius * (0.72 + entry.energy * 0.45), 42, 260);
    const gravitationalWeight = gaussianAuraWeight(dist, radius, entry.config.modules[0]?.falloff ?? 1.8);
    const energyWeight = gravitationalWeight * (0.72 + entry.energy * 0.42);
    if (energyWeight > 0.015) activeNodeIds.push(entry.id);
    if (dist < nearestDistance) {
      nearestDistance = dist;
      nearestNodeWeight = clamp01(1 - dist / Math.max(1, radius));
    }
    totalWeight += energyWeight;
    localBrightness += entry.config.timbre.brightness * energyWeight;
    localRoughness += entry.config.timbre.roughness * energyWeight;
    localBody += entry.config.timbre.body * energyWeight;
    localFormantShift += entry.config.timbre.formant * energyWeight;
    harmonicAccumulator += (1 - entry.config.timbre.roughness * 0.58 - entry.config.timbre.metallicity * 0.2 + entry.config.timbre.body * 0.18) * energyWeight;
    mix.brightness += entry.config.timbre.brightness * energyWeight;
    mix.roughness += entry.config.timbre.roughness * energyWeight;
    mix.body += entry.config.timbre.body * energyWeight;
    entry.config.modules.forEach((module) => addMyzelModuleToSpatialEffectMix(mix, module, energyWeight));
  });

  const activeRelations: MyzelSpatialRelation[] = [];
  let relationTension = 0;
  let relationDistanceAcc = 0;
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodeConfigs[i];
      const b = nodeConfigs[j];
      if (!a || !b) continue;
      const distAB = Math.hypot(a.x - b.x, a.y - b.y);
      const distToBall = distanceToSegment(ball, a, b);
      const radiusA = clamp(a.config.auraRadius * (0.82 + a.energy * 0.28), 40, 260);
      const radiusB = clamp(b.config.auraRadius * (0.82 + b.energy * 0.28), 40, 260);
      const ballWeightA = gaussianAuraWeight(Math.hypot(ball.x - a.x, ball.y - a.y), radiusA, a.config.modules[0]?.falloff ?? 1.7);
      const ballWeightB = gaussianAuraWeight(Math.hypot(ball.x - b.x, ball.y - b.y), radiusB, b.config.modules[0]?.falloff ?? 1.7);
      const auraOverlapWeight = clamp01((a.config.auraRadius + b.config.auraRadius - distAB) / Math.max(1, Math.min(a.config.auraRadius, b.config.auraRadius)));
      const relationBand = clamp(Math.min(a.config.auraRadius, b.config.auraRadius) * 0.74, 58, 150);
      const lineWeight = gaussianAuraWeight(distToBall, relationBand, 1.55);
      const softIntersection = Math.sqrt(ballWeightA * ballWeightB);
      const familyA = getPrimaryMyzelEffectFamily(a.config);
      const familyB = getPrimaryMyzelEffectFamily(b.config);
      const proximityWeight = clamp01(softIntersection * 0.76 + auraOverlapWeight * 0.24);
      const energyWeight = 0.42 + (a.energy + b.energy) * 0.36;
      const chemistry = resolveMyzelRelationCompatibility(familyA, familyB);
      const tension = clamp01((softIntersection * 0.5 + proximityWeight * 0.24 + lineWeight * 0.18 + auraOverlapWeight * 0.08) * energyWeight * (0.55 + chemistry * 0.45));
      if (tension <= 0.012) continue;
      const crossModAmount = clamp01(tension * chemistry);
      relationTension = Math.max(relationTension, tension);
      relationDistanceAcc += distToBall * tension;
      activeRelations.push({
        nodeAId: a.id,
        nodeBId: b.id,
        nodeALabel: a.label,
        nodeBLabel: b.label,
        familyA,
        familyB,
        presetA: a.config.presetId,
        presetB: b.config.presetId,
        tension,
        crossModAmount,
        distance: distAB,
        distanceToBall: distToBall,
      });

      a.config.modules.forEach((module) => addMyzelModuleToSpatialEffectMix(mix, module, crossModAmount * 0.12));
      b.config.modules.forEach((module) => addMyzelModuleToSpatialEffectMix(mix, module, crossModAmount * 0.12));

      const distortionBoost = getDominantMyzelModuleAmount(a.config, 'distortion') + getDominantMyzelModuleAmount(b.config, 'distortion');
      const formantBoost = getDominantMyzelModuleAmount(a.config, 'formant') + getDominantMyzelModuleAmount(b.config, 'formant');
      const delayBoost = getDominantMyzelModuleAmount(a.config, 'delay') + getDominantMyzelModuleAmount(b.config, 'delay');
      const resonatorBoost = getDominantMyzelModuleAmount(a.config, 'resonator') + getDominantMyzelModuleAmount(b.config, 'resonator');
      mix.roughness += crossModAmount * (0.08 + distortionBoost * 0.08);
      mix.q += crossModAmount * (0.06 + formantBoost * 0.04 + resonatorBoost * 0.04);
      mix.shimmerAmount += crossModAmount * delayBoost * 0.08;
      mix.wavefolderAmount += crossModAmount * distortionBoost * 0.06;
    }
  }

  activeRelations.sort((a, b) => b.tension - a.tension);
  const voidPressure = clamp01((nearestDistance / 260) * 0.58 + (relationTension > 0 ? relationDistanceAcc / Math.max(1, activeRelations.length) / 280 : 0.14));
  const normalizedMix = normalizeMyzelSpatialEffectMix(mix, Math.max(0.0001, totalWeight));

  return {
    localHarmonicity: clamp01(harmonicAccumulator / Math.max(0.0001, totalWeight)),
    localFormantShift: clamp01(localFormantShift / Math.max(0.0001, totalWeight)),
    localRoughness: clamp01(localRoughness / Math.max(0.0001, totalWeight) + relationTension * 0.12),
    localBrightness: clamp01(localBrightness / Math.max(0.0001, totalWeight)),
    localBody: clamp01(localBody / Math.max(0.0001, totalWeight)),
    nearestNodeWeight,
    relationTension,
    voidPressure,
    activeNodeIds,
    activeRelations: activeRelations.slice(0, 12),
    spatialEffectMix: normalizedMix,
  };
}