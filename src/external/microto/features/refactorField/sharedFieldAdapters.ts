import type { SemanticNode } from "../../../../features/xensonar/domain/runtimeTypes";
import type { SharedFieldBall, SharedFieldEntity, SharedFieldSnapshot } from "./sharedFieldTypes";

type TopologyCursor = { x: number; y: number; vx: number; vy: number };

type TopologyToSharedFieldOptions = {
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function createSharedFieldSnapshotFromTopology(
  nodes: SemanticNode[],
  cursor: TopologyCursor,
  options: TopologyToSharedFieldOptions,
): SharedFieldSnapshot {
  const scaleX = options.targetWidth / Math.max(1, options.sourceWidth);
  const scaleY = options.targetHeight / Math.max(1, options.sourceHeight);

  const entities: SharedFieldEntity[] = nodes.map((node) => ({
    id: node.residentId ?? node.label,
    label: node.label,
    kind: "ji-node",
    position: {
      x: node.x * scaleX,
      y: node.y * scaleY,
    },
    energy: clamp01(node.energy ?? 0),
    ratio: node.ratio,
    muted: !!node.residentMuted,
  }));

  const ball: SharedFieldBall = {
    id: "oscillator-ball",
    kind: "oscillator-ball",
    position: {
      x: cursor.x * scaleX,
      y: cursor.y * scaleY,
    },
    velocity: {
      x: cursor.vx * scaleX,
      y: cursor.vy * scaleY,
    },
  };

  entities.push(ball);

  return {
    width: options.targetWidth,
    height: options.targetHeight,
    entities,
  };
}
