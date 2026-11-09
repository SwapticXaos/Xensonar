import type { SemanticNode } from '../xensonar/domain/runtimeTypes';
import { clamp } from '../xensonar/helpers';
import type { MyzelRoom3Cursor } from './myzelRoom3FramePhysics';

export type MyzelRoom3FrameMetricsArgs = {
  nodes: SemanticNode[];
  cursor: MyzelRoom3Cursor;
  tension: number;
  maxEnergy: number;
  activeNode: SemanticNode | null;
};

export type MyzelRoom3FrameMetrics = {
  statusLine: string;
  nodeEnergyByLabel: Record<string, number>;
  layoutSpread: number;
  nearestNode: SemanticNode | null;
  nearestNodeDist: number;
  coherence: number;
  tensionField: number;
};

export function computeMyzelRoom3FrameMetrics(args: MyzelRoom3FrameMetricsArgs): MyzelRoom3FrameMetrics {
  const { nodes, cursor, tension, maxEnergy, activeNode } = args;

  const statusLine = activeNode
    ? maxEnergy > 0.9
      ? `Strukturelle Resonanz: Myzel vibriert intensiv an [${activeNode.label}]`
      : `Lokale Verdichtung um [${activeNode.label}]`
    : 'Fließendes Myzel';

  const nodeEnergyByLabel = Object.fromEntries(nodes.map((node) => [node.label, node.energy]));
  const centerX = nodes.reduce((sum, node) => sum + node.x, 0) / Math.max(1, nodes.length);
  const centerY = nodes.reduce((sum, node) => sum + node.y, 0) / Math.max(1, nodes.length);
  const layoutSpread = nodes.length
    ? nodes.reduce((sum, node) => sum + Math.hypot(node.x - centerX, node.y - centerY), 0) / nodes.length / 220
    : 0;

  let nearestNode: SemanticNode | null = null;
  let nearestNodeDist = Number.POSITIVE_INFINITY;
  for (const node of nodes) {
    const nodeDist = Math.hypot(node.x - cursor.x, node.y - cursor.y);
    if (nodeDist < nearestNodeDist) {
      nearestNodeDist = nodeDist;
      nearestNode = node;
    }
  }

  const coherence = clamp(
    (1 - clamp(layoutSpread, 0, 1)) * 0.45
      + clamp(nearestNode?.energy ?? 0, 0, 1) * 0.35
      + (1 - clamp(nearestNodeDist / 220, 0, 1)) * 0.2,
    0,
    1,
  );
  const tensionField = clamp(
    tension * 0.45 + clamp(Math.hypot(cursor.vx, cursor.vy) / 12, 0, 1) * 0.3 + maxEnergy * 0.25,
    0,
    1,
  );

  return {
    statusLine,
    nodeEnergyByLabel,
    layoutSpread,
    nearestNode,
    nearestNodeDist,
    coherence,
    tensionField,
  };
}
