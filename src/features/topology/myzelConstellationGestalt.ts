import type { SemanticNode } from '../xensonar/domain/runtimeTypes';
import type { MyzelConstellationGestalt } from './myzelSpatialFieldTypes';

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

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export function analyzeMyzelConstellationGestalt(nodes: NodeLike[], width: number, height: number): MyzelConstellationGestalt {
  if (!nodes.length) {
    return {
      density: 0,
      asymmetry: 0,
      linearity: 0,
      clusterMass: 0,
      averageDistance: 0,
      centroidX: 0.5,
      centroidY: 0.5,
      axisAngle: 0,
      axisStrength: 0,
      paletteWeights: { glassAir: 0.28, metalCluster: 0, reedFormant: 0, unstableNoise: 0, warmChoir: 0.72 },
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let centroidX = 0;
  let centroidY = 0;
  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y);
    centroidX += node.x;
    centroidY += node.y;
  }
  centroidX /= nodes.length;
  centroidY /= nodes.length;

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const areaRatio = (spanX * spanY) / Math.max(1, width * height);
  const density = clamp01((nodes.length * 0.018) / Math.max(0.012, areaRatio));
  const boxCenterX = minX + spanX / 2;
  const boxCenterY = minY + spanY / 2;
  const asymmetry = clamp01(Math.hypot(centroidX - boxCenterX, centroidY - boxCenterY) / Math.max(spanX, spanY, 1));
  const linearity = clamp01(1 - Math.min(spanX, spanY) / Math.max(spanX, spanY));

  const pairDistances: number[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      pairDistances.push(Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y));
    }
  }
  const averageDistance = average(pairDistances);
  const clusterMass = pairDistances.length
    ? clamp01(average(pairDistances.map((distance) => clamp01((210 - distance) / 210))))
    : 0;

  let xx = 0;
  let yy = 0;
  let xy = 0;
  for (const node of nodes) {
    const dx = node.x - centroidX;
    const dy = node.y - centroidY;
    xx += dx * dx;
    yy += dy * dy;
    xy += dx * dy;
  }
  const axisAngle = 0.5 * Math.atan2(2 * xy, xx - yy || 0.0001);
  const axisStrength = clamp01(Math.hypot(xx - yy, 2 * xy) / Math.max(1, xx + yy));

  const glassAir = clamp01((1 - density) * 0.52 + (1 - asymmetry) * 0.14 + (1 - clusterMass) * 0.2);
  const metalCluster = clamp01(clusterMass * 0.52 + density * 0.32 + axisStrength * 0.12);
  const reedFormant = clamp01(linearity * 0.68 + axisStrength * 0.22 + (1 - density) * 0.08);
  const unstableNoise = clamp01(asymmetry * 0.5 + clusterMass * 0.24 + density * 0.16);
  const warmChoir = clamp01((1 - linearity) * 0.34 + (1 - density) * 0.28 + (1 - asymmetry) * 0.24);

  return {
    density,
    asymmetry,
    linearity,
    clusterMass,
    averageDistance,
    centroidX: clamp01(centroidX / Math.max(1, width)),
    centroidY: clamp01(centroidY / Math.max(1, height)),
    axisAngle,
    axisStrength,
    paletteWeights: { glassAir, metalCluster, reedFormant, unstableNoise, warmChoir },
  };
}
