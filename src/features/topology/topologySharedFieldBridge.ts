import type { SemanticNode } from "../xensonar/domain/runtimeTypes";
import { createSharedFieldSnapshotFromTopology } from "../../external/microto/features/refactorField/sharedFieldAdapters";
import type { SharedFieldController } from "../../external/microto/features/refactorField/sharedFieldController";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type TopologyDragState = { nodeIndex: number | null; offsetX: number; offsetY: number };
type TopologyCursor = { x: number; y: number; vx: number; vy: number };
type TopologyRefsLike = { current: { nodes: SemanticNode[]; cursor: TopologyCursor } };
type TopologyDragRefLike = { current: TopologyDragState };

type CreateTopologySharedFieldControllerOptions = {
  topologyRefs: TopologyRefsLike;
  topologyDragRef: TopologyDragRefLike;
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
  active: boolean;
  interactive?: boolean;
  attractCursor?: boolean;
  attractOscillatorBall?: boolean;
  residentWaveExcitationEnabled?: boolean;
  residentBallCouplingEnabled?: boolean;
  particleSoundsMuted?: boolean;
};

export function beginTopologyNodeDrag(
  topologyRefs: TopologyRefsLike,
  topologyDragRef: TopologyDragRefLike,
  sourceWidth: number,
  sourceHeight: number,
  clientX: number,
  clientY: number,
  rect: DOMRect,
) {
  const scaleX = sourceWidth / rect.width;
  const scaleY = sourceHeight / rect.height;
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;
  const nodes = topologyRefs.current.nodes;
  let hitIndex: number | null = null;
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    const node = nodes[i];
    const radius = 10 + node.energy * 28;
    if (Math.hypot(node.x - x, node.y - y) <= radius) {
      hitIndex = i;
      break;
    }
  }
  if (hitIndex === null) return;
  const node = nodes[hitIndex];
  topologyDragRef.current = {
    nodeIndex: hitIndex,
    offsetX: x - node.x,
    offsetY: y - node.y,
  };
}

export function beginTopologyNodeDragById(
  topologyRefs: TopologyRefsLike,
  topologyDragRef: TopologyDragRefLike,
  sourceWidth: number,
  sourceHeight: number,
  nodeId: string,
  clientX: number,
  clientY: number,
  rect: DOMRect,
) {
  const scaleX = sourceWidth / rect.width;
  const scaleY = sourceHeight / rect.height;
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;
  const nodes = topologyRefs.current.nodes;
  const hitIndex = nodes.findIndex((node) => (node.residentId ?? node.label) === nodeId);
  if (hitIndex === -1) return;
  const node = nodes[hitIndex];
  topologyDragRef.current = {
    nodeIndex: hitIndex,
    offsetX: x - node.x,
    offsetY: y - node.y,
  };
}

export function continueTopologyNodeDrag(
  topologyRefs: TopologyRefsLike,
  topologyDragRef: TopologyDragRefLike,
  sourceWidth: number,
  sourceHeight: number,
  clientX: number,
  clientY: number,
  rect: DOMRect,
) {
  const drag = topologyDragRef.current;
  if (drag.nodeIndex === null) return;
  const scaleX = sourceWidth / rect.width;
  const scaleY = sourceHeight / rect.height;
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;
  const node = topologyRefs.current.nodes[drag.nodeIndex];
  if (!node) return;
  node.x = clamp(x - drag.offsetX, 16, sourceWidth - 16);
  node.y = clamp(y - drag.offsetY, 16, sourceHeight - 16);
}

export function endTopologyNodeDrag(topologyDragRef: TopologyDragRefLike) {
  topologyDragRef.current = { nodeIndex: null, offsetX: 0, offsetY: 0 };
}

export function createTopologySharedFieldController({
  topologyRefs,
  topologyDragRef,
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  active,
  interactive = false,
  attractCursor = false,
  attractOscillatorBall = false,
  residentWaveExcitationEnabled = false,
  residentBallCouplingEnabled = true,
  particleSoundsMuted = false,
}: CreateTopologySharedFieldControllerOptions): SharedFieldController {
  return {
    active,
    interactive,
    attractCursor,
    attractOscillatorBall,
    residentWaveExcitationEnabled,
    residentBallCouplingEnabled,
    particleSoundsMuted,
    getSnapshot: (width = targetWidth, height = targetHeight) => createSharedFieldSnapshotFromTopology(
      topologyRefs.current.nodes,
      topologyRefs.current.cursor,
      {
        sourceWidth,
        sourceHeight,
        targetWidth: width,
        targetHeight: height,
      },
    ),
    onNodeDragStart: (nodeId, clientX, clientY, rect) => {
      beginTopologyNodeDragById(topologyRefs, topologyDragRef, sourceWidth, sourceHeight, nodeId, clientX, clientY, rect);
    },
    onNodeDragMove: (_nodeId, clientX, clientY, rect) => {
      continueTopologyNodeDrag(topologyRefs, topologyDragRef, sourceWidth, sourceHeight, clientX, clientY, rect);
    },
    onNodeDragEnd: () => {
      endTopologyNodeDrag(topologyDragRef);
    },
  };
}
