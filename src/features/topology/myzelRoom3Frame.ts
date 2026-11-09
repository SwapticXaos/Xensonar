import type { SemanticNode } from '../xensonar/domain/runtimeTypes';
import { advanceMyzelRoom3CursorPhysics } from './myzelRoom3FramePhysics';
import type { MyzelRoom3Cursor, MyzelRoom3Params } from './myzelRoom3FramePhysics';
import type { MyceliumSnapshot } from './myceliumSnapshot';
import { computeConstellationSignature } from './constellationSignature';
import { computeMyzelSpatialFieldProbe } from './myzelSpatialEffectField';
import { computeNodalRelationLayer } from './nodalRelationLayer';
import { computeMyzelRoom3FrameMetrics } from './myzelRoom3FrameMetrics';
import { assembleMyzelRoom3Snapshot } from './myzelRoom3SnapshotAssembly';
import type { MyzelRoom3ConstellationState } from './myzelRoom3SnapshotAssembly';
export { renderMyzelRoom3Canvas } from './myzelRoom3CanvasRenderer';

export type { MyzelRoom3Cursor, MyzelRoom3Params } from './myzelRoom3FramePhysics';

export type { MyzelRoom3ConstellationState } from './myzelRoom3SnapshotAssembly';

export type MyzelRoom3SpatialFieldProbe = ReturnType<typeof computeMyzelSpatialFieldProbe>;

export type AdvanceMyzelRoom3FrameArgs = {
  nodes: SemanticNode[];
  cursor: MyzelRoom3Cursor;
  params: MyzelRoom3Params;
  baseFreq: number;
  width: number;
  height: number;
  targetGameHeight: number;
  previousConstellation: MyzelRoom3ConstellationState;
};

export type MyzelRoom3Frame = {
  snapshot: MyceliumSnapshot;
  constellationState: MyzelRoom3ConstellationState;
  statusLine: string;
  cursorYForGame: number;
  spatialFieldProbe: MyzelRoom3SpatialFieldProbe;
};

export function advanceMyzelRoom3Frame(args: AdvanceMyzelRoom3FrameArgs): MyzelRoom3Frame {
  const { nodes, cursor: cur, params, baseFreq, width, height, targetGameHeight, previousConstellation } = args;
  const { tension } = params;
  const { maxEnergy, dominantFreq, activeNode } = advanceMyzelRoom3CursorPhysics({
    nodes,
    cursor: cur,
    params,
    baseFreq,
    width,
    height,
  });

  const frameMetrics = computeMyzelRoom3FrameMetrics({
    nodes,
    cursor: cur,
    tension,
    maxEnergy,
    activeNode,
  });
  const constellationSignature = computeConstellationSignature(nodes, width, height);
  const spatialFieldProbe = computeMyzelSpatialFieldProbe({
    nodes,
    ball: cur,
    width,
    height,
  });
  const nodalRelationLayer = computeNodalRelationLayer({
    nodes,
    width,
    height,
    rootPoint: { x: width * 0.5, y: height * 0.82 },
  });
  const snapshotAssembly = assembleMyzelRoom3Snapshot({
    cursor: cur,
    params,
    width,
    height,
    maxEnergy,
    dominantFreq,
    activeNode,
    metrics: frameMetrics,
    previousConstellation,
    constellationSignature,
    spatialFieldProbe,
    nodalRelationLayer,
  });

  return {
    statusLine: frameMetrics.statusLine,
    cursorYForGame: (cur.y / height) * targetGameHeight,
    spatialFieldProbe,
    constellationState: snapshotAssembly.constellationState,
    snapshot: snapshotAssembly.snapshot,
  };
}
