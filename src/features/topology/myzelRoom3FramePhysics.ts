import type { SemanticNode } from '../xensonar/domain/runtimeTypes';

export type MyzelRoom3Cursor = { x: number; y: number; vx: number; vy: number };

export type MyzelRoom3Params = {
  tension: number;
  slimLayers: number;
  rawReality: number;
};

export type AdvanceMyzelRoom3CursorPhysicsArgs = {
  nodes: SemanticNode[];
  cursor: MyzelRoom3Cursor;
  params: MyzelRoom3Params;
  baseFreq: number;
  width: number;
  height: number;
};

export type MyzelRoom3CursorPhysicsState = {
  maxEnergy: number;
  dominantFreq: number;
  activeNode: SemanticNode | null;
};

export function advanceMyzelRoom3CursorPhysics(args: AdvanceMyzelRoom3CursorPhysicsArgs): MyzelRoom3CursorPhysicsState {
  const { nodes, cursor: cur, params, baseFreq, width, height } = args;
  const { tension, slimLayers } = params;
  const dissipationRate = 0.005 + slimLayers * 0.02;

  let maxEnergy = 0;
  let dominantFreq = baseFreq;
  let pullX = 0;
  let pullY = 0;
  let activeNode: SemanticNode | null = null;

  for (const node of nodes) {
    const dx = node.x - cur.x;
    const dy = node.y - cur.y;
    const nodeDist = Math.max(1, Math.hypot(dx, dy));
    const force = (1 / (nodeDist + 10)) * tension * 500;
    pullX += (dx / nodeDist) * force;
    pullY += (dy / nodeDist) * force;

    if (nodeDist < 80) node.energy += 0.015 * (1 - slimLayers * 0.5);
    node.energy = Math.max(0, Math.min(1, node.energy - dissipationRate));

    if (node.energy > maxEnergy) {
      maxEnergy = node.energy;
      dominantFreq = node.freq;
      if (node.energy > 0.7) activeNode = node;
    }
  }

  cur.vx += (Math.random() - 0.5) * 2.5;
  cur.vy += (Math.random() - 0.5) * 2.5;
  cur.vx += pullX;
  cur.vy += pullY;
  cur.vx *= 0.94;
  cur.vy *= 0.94;
  cur.x += cur.vx;
  cur.y += cur.vy;

  if (cur.x < 0) {
    cur.x = 0;
    cur.vx = Math.abs(cur.vx);
  } else if (cur.x > width) {
    cur.x = width;
    cur.vx = -Math.abs(cur.vx);
  }
  if (cur.y < 0) {
    cur.y = 0;
    cur.vy = Math.abs(cur.vy);
  } else if (cur.y > height) {
    cur.y = height;
    cur.vy = -Math.abs(cur.vy);
  }

  return { maxEnergy, dominantFreq, activeNode };
}
