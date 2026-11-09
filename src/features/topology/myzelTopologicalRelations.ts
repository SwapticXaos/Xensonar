import type { MyzelTopologicalRelationSnapshot } from './myceliumSnapshot';
import type { MyzelSpatialFieldProbe } from './myzelSpatialFieldTypes';
import { parseJiRatioLabel } from '../resonance/weaveMath';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const relationPairKey = (nodeAId: string, nodeBId: string) => [nodeAId, nodeBId].sort().join('::');

export function buildMyzelTopologicalRelations(
  spatialFieldProbe: MyzelSpatialFieldProbe,
  limit = 6,
): MyzelTopologicalRelationSnapshot[] {
  const activeSpatialRelationsByPair = new Map(
    spatialFieldProbe.ball.activeRelations.map((relation) => [
      relationPairKey(relation.nodeAId, relation.nodeBId),
      relation,
    ]),
  );

  return spatialFieldProbe.auraOverlaps
    .map((overlap) => {
      const activeRelation = activeSpatialRelationsByPair.get(relationPairKey(overlap.nodeAId, overlap.nodeBId));
      const relationTensionValue = clamp(activeRelation?.tension ?? overlap.interference * 0.68 + overlap.overlap * 0.22, 0, 1);
      const crossModAmount = clamp(activeRelation?.crossModAmount ?? overlap.interference * 0.72 + overlap.sparkle * 0.16, 0, 1);
      return {
        nodeAId: overlap.nodeAId,
        nodeBId: overlap.nodeBId,
        nodeALabel: overlap.nodeALabel,
        nodeBLabel: overlap.nodeBLabel,
        presetA: overlap.presetA,
        presetB: overlap.presetB,
        familyA: overlap.familyA,
        familyB: overlap.familyB,
        ratioA: clamp(parseJiRatioLabel(overlap.nodeALabel) ?? 1, 0.25, 6),
        ratioB: clamp(parseJiRatioLabel(overlap.nodeBLabel) ?? 1, 0.25, 6),
        overlap: clamp(overlap.overlap, 0, 1),
        interference: clamp(overlap.interference, 0, 1),
        sparkle: clamp(overlap.sparkle, 0, 1),
        relationTension: relationTensionValue,
        crossModAmount,
        distance: Math.max(0, overlap.distance),
      };
    })
    .sort((a, b) => (b.interference * 0.52 + b.overlap * 0.26 + b.relationTension * 0.18 + b.sparkle * 0.04) - (a.interference * 0.52 + a.overlap * 0.26 + a.relationTension * 0.18 + a.sparkle * 0.04))
    .slice(0, Math.max(0, Math.floor(limit)));
}
