import type { SemanticNode } from "../xensonar/domain/runtimeTypes";
import { mapFieldPoint } from "./installationFieldMapping";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type Vec2 = { x: number; y: number };

export function applyResidentBallCoupling(args: {
  active: boolean;
  enabled: boolean;
  nodes: SemanticNode[];
  oscillatorBall: Vec2 | null;
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
}) {
  const { active, enabled, nodes, oscillatorBall, sourceWidth, sourceHeight, targetWidth, targetHeight } = args;

  nodes.forEach((node) => {
    node.energy = Math.max(0, (node.energy ?? 0) * 0.965 - 0.0035);
  });

  if (!active || !enabled || !oscillatorBall) return;

  nodes.forEach((node) => {
    if (node.residentMuted) return;
    const mappedNode = mapFieldPoint(node, sourceWidth, sourceHeight, targetWidth, targetHeight);
    const dx = oscillatorBall.x - mappedNode.x;
    const dy = oscillatorBall.y - mappedNode.y;
    const dist = Math.hypot(dx, dy);
    const proximity = clamp(1 - dist / 92, 0, 1);
    if (proximity <= 0.04) return;
    node.energy = Math.max(node.energy, 0.12 + proximity * 0.8);
  });
}
