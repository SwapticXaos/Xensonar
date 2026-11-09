export type NodalRelationRole =
  | 'near'
  | 'distant'
  | 'overlap'
  | 'tension'
  | 'cluster'
  | 'isolated';

export interface NodalRelationNodeLike {
  id?: string | null;
  residentId?: string | null;
  label: string;
  x: number;
  y: number;
  freq?: number | null;
  energy?: number | null;
  myzelAuraRadius?: number | null;
}

export interface NodalRelationSnapshot {
  sourceId: string;
  targetId: string;
  sourceLabel: string;
  targetLabel: string;
  distancePx: number;
  distanceNorm: number;
  proximity: number;
  overlap: number;
  tension: number;
  hierarchyDelta: number;
  angleRad: number;
  role: NodalRelationRole;
}

export interface NodalClusterSnapshot {
  id: string;
  nodeIds: string[];
  labels: string[];
  centerX: number;
  centerY: number;
  density: number;
  cohesion: number;
  tension: number;
  dominantNodeId?: string | null;
}

export interface NodalFieldMetrics {
  fieldTension: number;
  clusterDensity: number;
  isolation: number;
  symmetry: number;
  rootPull: number;
  interactionPressure: number;
}

export interface NodalRootDistanceEntry {
  nodeId: string;
  label: string;
  distanceNorm: number;
  influence: number;
}

export interface NodalRelationLayer {
  status: 'computed';
  referenceFrame: 'constellation';
  relationCount: number;
  strongestRelationIds: string[];
  relations: NodalRelationSnapshot[];
  clusters: NodalClusterSnapshot[];
  rootDistanceMap: Record<string, NodalRootDistanceEntry>;
  field: NodalFieldMetrics;
}

export interface ComputeNodalRelationLayerArgs {
  nodes: NodalRelationNodeLike[];
  width: number;
  height: number;
  rootPoint?: { x: number; y: number } | null;
  influenceRadiusPx?: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const average = (values: number[]): number => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const nodeId = (node: NodalRelationNodeLike, index: number): string => String(node.residentId ?? node.id ?? node.label ?? `node-${index}`);
const nodeEnergy = (node: NodalRelationNodeLike): number => clamp01(node.energy ?? 0);
const nodeAuraRadius = (node: NodalRelationNodeLike): number => clamp(node.myzelAuraRadius ?? 150, 44, 260);

function relationRole(proximity: number, overlap: number, tension: number): NodalRelationRole {
  if (overlap > 0.62) return 'overlap';
  if (proximity > 0.58) return 'near';
  if (tension > 0.42) return 'tension';
  if (proximity < 0.12) return 'distant';
  return 'tension';
}

function computeConnectedClusters(relations: NodalRelationSnapshot[], nodes: NodalRelationNodeLike[], width: number, height: number): NodalClusterSnapshot[] {
  const ids = nodes.map((node, index) => nodeId(node, index));
  const byId = new Map(ids.map((id, index) => [id, nodes[index]] as const));
  const graph = new Map<string, Set<string>>();
  ids.forEach((id) => graph.set(id, new Set()));
  relations.forEach((relation) => {
    if (relation.proximity < 0.58 && relation.overlap < 0.35) return;
    graph.get(relation.sourceId)?.add(relation.targetId);
    graph.get(relation.targetId)?.add(relation.sourceId);
  });

  const visited = new Set<string>();
  const clusters: NodalClusterSnapshot[] = [];
  ids.forEach((startId) => {
    if (visited.has(startId)) return;
    const stack = [startId];
    const component: string[] = [];
    visited.add(startId);
    while (stack.length) {
      const id = stack.pop()!;
      component.push(id);
      graph.get(id)?.forEach((next) => {
        if (visited.has(next)) return;
        visited.add(next);
        stack.push(next);
      });
    }
    if (component.length < 2) return;
    const componentNodes = component.map((id) => byId.get(id)).filter(Boolean) as NodalRelationNodeLike[];
    const centerX = average(componentNodes.map((node) => node.x));
    const centerY = average(componentNodes.map((node) => node.y));
    const pairRelations = relations.filter((relation) => component.includes(relation.sourceId) && component.includes(relation.targetId));
    const cohesion = clamp01(average(pairRelations.map((relation) => relation.proximity * 0.7 + relation.overlap * 0.3)));
    const tension = clamp01(average(pairRelations.map((relation) => relation.tension)));
    const density = clamp01(component.length / Math.max(2, ids.length) * 0.42 + cohesion * 0.58);
    const dominant = componentNodes.slice().sort((a, b) => nodeEnergy(b) - nodeEnergy(a))[0] ?? null;
    clusters.push({
      id: `cluster-${clusters.length + 1}`,
      nodeIds: component,
      labels: componentNodes.map((node) => node.label),
      centerX: clamp01(centerX / Math.max(1, width)),
      centerY: clamp01(centerY / Math.max(1, height)),
      density,
      cohesion,
      tension,
      dominantNodeId: dominant ? nodeId(dominant, nodes.indexOf(dominant)) : null,
    });
  });
  return clusters.sort((a, b) => b.density - a.density).slice(0, 8);
}

export function computeNodalRelationLayer(args: ComputeNodalRelationLayerArgs): NodalRelationLayer {
  const { nodes, width, height } = args;
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const diagonal = Math.max(1, Math.hypot(safeWidth, safeHeight));
  const influenceRadius = clamp(args.influenceRadiusPx ?? Math.min(260, Math.max(120, Math.min(safeWidth, safeHeight) * 0.36)), 80, 360);
  const rootPoint = args.rootPoint ?? { x: safeWidth * 0.5, y: safeHeight * 0.82 };
  const rootDistanceMap: Record<string, NodalRootDistanceEntry> = {};

  nodes.forEach((node, index) => {
    const id = nodeId(node, index);
    const distanceNorm = clamp01(Math.hypot(node.x - rootPoint.x, node.y - rootPoint.y) / diagonal);
    rootDistanceMap[id] = {
      nodeId: id,
      label: node.label,
      distanceNorm,
      influence: clamp01(1 - distanceNorm * 1.45),
    };
  });

  const relations: NodalRelationSnapshot[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const source = nodes[i];
      const target = nodes[j];
      const sourceId = nodeId(source, i);
      const targetId = nodeId(target, j);
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distancePx = Math.hypot(dx, dy);
      const distanceNorm = clamp01(distancePx / diagonal);
      const radiusA = nodeAuraRadius(source) * (0.78 + nodeEnergy(source) * 0.32);
      const radiusB = nodeAuraRadius(target) * (0.78 + nodeEnergy(target) * 0.32);
      const proximity = clamp01(1 - distancePx / influenceRadius);
      const overlap = clamp01((radiusA + radiusB - distancePx) / Math.max(1, Math.min(radiusA, radiusB)));
      const hierarchyDelta = clamp(
        (rootDistanceMap[targetId]?.influence ?? 0) - (rootDistanceMap[sourceId]?.influence ?? 0),
        -1,
        1,
      );
      const energyBlend = (nodeEnergy(source) + nodeEnergy(target)) * 0.5;
      const tension = clamp01(proximity * 0.42 + overlap * 0.34 + Math.abs(hierarchyDelta) * 0.12 + energyBlend * 0.12);
      relations.push({
        sourceId,
        targetId,
        sourceLabel: source.label,
        targetLabel: target.label,
        distancePx,
        distanceNorm,
        proximity,
        overlap,
        tension,
        hierarchyDelta,
        angleRad: Math.atan2(dy, dx),
        role: relationRole(proximity, overlap, tension),
      });
    }
  }

  const sortedRelations = relations.sort((a, b) => (b.tension + b.proximity * 0.25 + b.overlap * 0.18) - (a.tension + a.proximity * 0.25 + a.overlap * 0.18));
  const clusters = computeConnectedClusters(sortedRelations, nodes, safeWidth, safeHeight);
  const rootInfluences = Object.values(rootDistanceMap).map((entry) => entry.influence);
  const centerX = nodes.length ? average(nodes.map((node) => node.x / safeWidth)) : 0.5;
  const symmetry = clamp01(1 - Math.abs(centerX - 0.5) * 1.8);
  const isolationValues = nodes.map((node, index) => {
    const id = nodeId(node, index);
    const strongest = sortedRelations
      .filter((relation) => relation.sourceId === id || relation.targetId === id)
      .reduce((best, relation) => Math.max(best, relation.proximity), 0);
    return clamp01(1 - strongest);
  });
  const isolation = clamp01(average(isolationValues));
  const clusterDensity = clamp01(average(clusters.map((cluster) => cluster.density)) || 0);
  const fieldTension = clamp01(average(sortedRelations.slice(0, 8).map((relation) => relation.tension)) * 0.72 + isolation * 0.18 + clusterDensity * 0.1);
  const rootPull = clamp01(average(rootInfluences));
  const interactionPressure = clamp01(fieldTension * 0.54 + clusterDensity * 0.28 + isolation * 0.18);

  return {
    status: 'computed',
    referenceFrame: 'constellation',
    relationCount: sortedRelations.length,
    strongestRelationIds: sortedRelations.slice(0, 6).map((relation) => `${relation.sourceId}::${relation.targetId}`),
    relations: sortedRelations.slice(0, 24),
    clusters,
    rootDistanceMap,
    field: {
      fieldTension,
      clusterDensity,
      isolation,
      symmetry,
      rootPull,
      interactionPressure,
    },
  };
}
