import type { SemanticNode } from '../xensonar/domain/runtimeTypes';
import { computeMyzelAuraOverlaps } from './myzelAuraOverlapGeometry';
import { analyzeMyzelConstellationGestalt } from './myzelConstellationGestalt';
import { blendSpatialFieldIntoLegacySignature } from './myzelLegacySignatureBridge';
import {
  buildMyzelNodeSpatialConfig,
  getMyzelPresetWitnessHue,
} from './myzelNodeSpatialConfig';
import { readMyzelBallSpectralField } from './myzelBallSpectralFieldReader';
import type { MyzelSpatialFieldProbe } from './myzelSpatialFieldTypes';

export type {
  MyzelAuraOverlap,
  MyzelBallSpectralReading,
  MyzelConstellationGestalt,
  MyzelEffectFamily,
  MyzelEffectModuleType,
  MyzelNodeAuraBuildContext,
  MyzelNodeAuraPresetDefinition,
  MyzelNodeAuraSource,
  MyzelNodeEffectId,
  MyzelNodeEffectModule,
  MyzelNodePresetId,
  MyzelNodeSpatialConfig,
  MyzelNodeTimbreProfile,
  MyzelSpatialEffectMix,
  MyzelSpatialFieldProbe,
  MyzelSpatialRelation,
} from './myzelSpatialFieldTypes';
export { analyzeMyzelConstellationGestalt, blendSpatialFieldIntoLegacySignature, computeMyzelAuraOverlaps, getMyzelPresetWitnessHue };

type PointLike = { x: number; y: number };

type NodeLike = SemanticNode & { x: number; y: number; freq: number; energy: number; label: string; myzelEffectPresetId?: string; myzelEffectModuleType?: string; myzelEffectStrength?: number; myzelAuraRadius?: number };

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
function nodeId(node: NodeLike) {
  return node.residentId ?? node.label;
}

export function computeMyzelSpatialFieldProbe(args: {
  nodes: NodeLike[];
  ball: PointLike;
  width: number;
  height: number;
}): MyzelSpatialFieldProbe {
  const { nodes, ball, width, height } = args;
  const nodeConfigs = nodes.map((node, index) => ({
    id: nodeId(node),
    label: node.label,
    x: node.x,
    y: node.y,
    energy: clamp01(node.energy),
    config: buildMyzelNodeSpatialConfig(node, index, width, height),
  }));
  const auraOverlaps = computeMyzelAuraOverlaps(nodeConfigs);
  return {
    gestalt: analyzeMyzelConstellationGestalt(nodes, width, height),
    ball: readMyzelBallSpectralField({ ball, nodes, nodeConfigs, width, height }),
    auraOverlaps,
    nodeConfigs,
  };
}

