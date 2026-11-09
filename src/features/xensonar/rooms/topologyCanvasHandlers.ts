import type { MutableRefObject, MouseEvent as ReactMouseEvent } from 'react';
import type { SemanticNode } from '../domain/runtimeTypes';
import {
  handleTopologyCanvasMouseDown as handleTopologyCanvasMouseDownEvent,
  handleTopologyCanvasMouseMove as handleTopologyCanvasMouseMoveEvent,
  handleTopologyCanvasMouseUp as handleTopologyCanvasMouseUpEvent,
} from '../../topology/topologyInteractionHelpers';

type TopologyCursor = { x: number; y: number; vx: number; vy: number };
type TopologyRefs = MutableRefObject<{ nodes: SemanticNode[]; cursor: TopologyCursor }>;
type TopologyDragRef = MutableRefObject<{ nodeIndex: number | null; offsetX: number; offsetY: number }>;

type BuildTopologyCanvasHandlersArgs = {
  topologyRefs: TopologyRefs;
  topologyDragRef: TopologyDragRef;
  topologyWidth: number;
  topologyHeight: number;
  setSelectedResidentId: (value: string | null | ((prev: string | null) => string | null)) => void;
  setSystemState: (value: string) => void;
};

function getTopologyCanvasPoint(
  event: ReactMouseEvent<HTMLCanvasElement>,
  topologyWidth: number,
  topologyHeight: number,
) {
  const rect = event.currentTarget.getBoundingClientRect();
  const scaleX = topologyWidth / rect.width;
  const scaleY = topologyHeight / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function findHitNodeResidentId(nodes: SemanticNode[], x: number, y: number) {
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    const node = nodes[i];
    const radius = 10 + node.energy * 28;
    if (Math.hypot(node.x - x, node.y - y) <= radius) {
      return node.residentId ?? null;
    }
  }
  return null;
}

function findHitNodeSelectionKey(nodes: SemanticNode[], x: number, y: number) {
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    const node = nodes[i];
    const radius = 10 + node.energy * 28;
    if (Math.hypot(node.x - x, node.y - y) <= radius) {
      return node.residentId ?? node.label;
    }
  }
  return null;
}

export function buildTopologyCanvasHandlers(args: BuildTopologyCanvasHandlersArgs) {
  return {
    handleTopologyCanvasMouseDown: (event: ReactMouseEvent<HTMLCanvasElement>) => {
      if (event.button !== 0) return;
      const { x, y } = getTopologyCanvasPoint(event, args.topologyWidth, args.topologyHeight);
      const selected = findHitNodeSelectionKey(args.topologyRefs.current.nodes, x, y);
      args.setSelectedResidentId(selected);
      handleTopologyCanvasMouseDownEvent(event, args.topologyRefs, args.topologyDragRef, args.topologyWidth, args.topologyHeight);
    },
    handleTopologyCanvasContextMenu: (event: ReactMouseEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      const { x, y } = getTopologyCanvasPoint(event, args.topologyWidth, args.topologyHeight);
      const hitResidentId = findHitNodeResidentId(args.topologyRefs.current.nodes, x, y);
      if (!hitResidentId) return;
      if (args.topologyRefs.current.nodes.length <= 1) return;
      args.topologyRefs.current.nodes = args.topologyRefs.current.nodes.filter((node) => node.residentId !== hitResidentId);
      args.setSelectedResidentId((prev) => (
        prev === hitResidentId ? (args.topologyRefs.current.nodes[0]?.residentId ?? null) : prev
      ));
      args.setSystemState('Resident entfernt');
    },
    handleTopologyCanvasMouseMove: (event: ReactMouseEvent<HTMLCanvasElement>) => {
      handleTopologyCanvasMouseMoveEvent(event, args.topologyRefs, args.topologyDragRef, args.topologyWidth, args.topologyHeight);
    },
    handleTopologyCanvasMouseUp: () => {
      handleTopologyCanvasMouseUpEvent(args.topologyDragRef);
    },
  };
}
