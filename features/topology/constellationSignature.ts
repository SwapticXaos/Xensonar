export interface ConstellationSignature {
  ratios: number[];
  tension: number;
  brightness: number;
  centroidX: number;
  centroidY: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const getQuantile = (sorted: number[], q: number) => {
  if (!sorted.length) return 0;
  const pos = clamp(q, 0, 1) * (sorted.length - 1);
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  if (lower === upper) return sorted[lower] ?? 0;
  const mix = pos - lower;
  return (sorted[lower] ?? 0) + ((sorted[upper] ?? 0) - (sorted[lower] ?? 0)) * mix;
};

export const computeConstellationSignature = (nodes: Array<{ x: number; y: number }>, width: number, height: number) => {
  if (!nodes.length) {
    return {
      ratios: [1.25, 1.5, 1.875],
      tension: 0,
      brightness: 0.5,
      centroidX: 0.5,
      centroidY: 0.5,
    };
  }

  const centroidXRaw = average(nodes.map((node) => node.x));
  const centroidYRaw = average(nodes.map((node) => node.y));
  const spreadX = Math.sqrt(average(nodes.map((node) => (node.x - centroidXRaw) ** 2)));
  const spreadY = Math.sqrt(average(nodes.map((node) => (node.y - centroidYRaw) ** 2)));

  const pairDistances: number[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      pairDistances.push(Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y));
    }
  }
  const sortedDistances = pairDistances.sort((a, b) => a - b);
  const meanDist = average(sortedDistances) || 120;
  const q1 = getQuantile(sortedDistances, 0.2) || meanDist;
  const q2 = getQuantile(sortedDistances, 0.5) || meanDist * 1.15;
  const q3 = getQuantile(sortedDistances, 0.8) || meanDist * 1.35;
  const distVariance = average(sortedDistances.map((distance) => (distance - meanDist) ** 2));
  const irregularity = clamp(Math.sqrt(distVariance) / Math.max(40, meanDist * 0.7), 0, 1);
  const closeCount = sortedDistances.slice(0, Math.min(6, sortedDistances.length));
  const closeness = average(closeCount.map((distance) => clamp((180 - distance) / 180, 0, 1)));
  const axisSkew = clamp(Math.abs(spreadX - spreadY) / Math.max(1, spreadX + spreadY), 0, 1);
  const compactness = clamp(1 - meanDist / 260, 0, 1);

  const ratios = [
    clamp(1.08 + (q1 / meanDist) * 0.42 + compactness * 0.08, 1.04, 1.82),
    clamp(1.24 + (q2 / meanDist) * 0.66 + irregularity * 0.12, 1.22, 2.35),
    clamp(1.52 + (q3 / meanDist) * 0.94 + axisSkew * 0.18, 1.45, 3.2),
  ];

  const tension = clamp(closeness * 0.48 + irregularity * 0.32 + axisSkew * 0.2, 0, 1);
  const brightness = clamp(irregularity * 0.36 + compactness * 0.18 + axisSkew * 0.22 + 0.24, 0, 1);

  return {
    ratios,
    tension,
    brightness,
    centroidX: clamp(centroidXRaw / Math.max(1, width), 0, 1),
    centroidY: clamp(centroidYRaw / Math.max(1, height), 0, 1),
  };
};