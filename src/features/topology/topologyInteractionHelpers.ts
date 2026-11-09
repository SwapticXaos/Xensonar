import type { Dispatch, MutableRefObject, MouseEvent as ReactMouseEvent, SetStateAction } from 'react';
import type { SemanticNode } from '../xensonar/domain/runtimeTypes';
import { beginTopologyNodeDrag, continueTopologyNodeDrag, createTopologySharedFieldController, endTopologyNodeDrag } from './topologySharedFieldBridge';

type TopologyCursor = { x: number; y: number; vx: number; vy: number };
type TopologyRefs = MutableRefObject<{ nodes: SemanticNode[]; cursor: TopologyCursor }>;
type TopologyDragRef = MutableRefObject<{ nodeIndex: number | null; offsetX: number; offsetY: number }>;

export function handleTopologyCanvasMouseDown(
  event: ReactMouseEvent<HTMLCanvasElement>,
  topologyRefs: TopologyRefs,
  topologyDragRef: TopologyDragRef,
  sourceWidth: number,
  sourceHeight: number,
) {
  beginTopologyNodeDrag(
    topologyRefs,
    topologyDragRef,
    sourceWidth,
    sourceHeight,
    event.clientX,
    event.clientY,
    event.currentTarget.getBoundingClientRect(),
  );
}

export function handleTopologyCanvasMouseMove(
  event: ReactMouseEvent<HTMLCanvasElement>,
  topologyRefs: TopologyRefs,
  topologyDragRef: TopologyDragRef,
  sourceWidth: number,
  sourceHeight: number,
) {
  continueTopologyNodeDrag(
    topologyRefs,
    topologyDragRef,
    sourceWidth,
    sourceHeight,
    event.clientX,
    event.clientY,
    event.currentTarget.getBoundingClientRect(),
  );
}

export function handleTopologyCanvasMouseUp(topologyDragRef: TopologyDragRef) {
  endTopologyNodeDrag(topologyDragRef);
}

export function buildInstallationSharedFieldController(args: {
  topologyRefs: TopologyRefs;
  topologyDragRef: TopologyDragRef;
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
  active: boolean;
  attractCursor: boolean;
  attractOscillatorBall: boolean;
  residentWaveExcitationEnabled: boolean;
  residentBallCouplingEnabled: boolean;
  particleSoundsMuted: boolean;
}) {
  const {
    topologyRefs,
    topologyDragRef,
    sourceWidth,
    sourceHeight,
    targetWidth,
    targetHeight,
    active,
    attractCursor,
    attractOscillatorBall,
    residentWaveExcitationEnabled,
    residentBallCouplingEnabled,
    particleSoundsMuted,
  } = args;

  return createTopologySharedFieldController({
    topologyRefs,
    topologyDragRef,
    sourceWidth,
    sourceHeight,
    targetWidth,
    targetHeight,
    active,
    interactive: active,
    attractCursor,
    attractOscillatorBall,
    residentWaveExcitationEnabled,
    residentBallCouplingEnabled,
    particleSoundsMuted,
  });
}

export function toggleInstallAttractor(
  key: 'cursor' | 'oscillatorBall',
  setInstallAttractCursor: Dispatch<SetStateAction<boolean>>,
  setInstallAttractOscillatorBall: Dispatch<SetStateAction<boolean>>,
) {
  if (key === 'cursor') {
    setInstallAttractCursor((prev) => !prev);
    return;
  }
  setInstallAttractOscillatorBall((prev) => !prev);
}
