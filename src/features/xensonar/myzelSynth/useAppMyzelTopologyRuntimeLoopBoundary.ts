import { useEffect, useRef } from "react";
import { GAME_HEIGHT, TOPO_HEIGHT, TOPO_WIDTH } from "../domain/instrumentData";
import type { Room } from "../domain/runtimeTypes";
import type { Room3TopologyStateRefs } from "../room3/room3TopologyUiStateTypes";
import {
  advanceMyzelSynthRoom3Runtime,
  renderMyzelSynthRoom3RuntimeCanvas,
} from "./myzelRoom3RuntimeBoundary";

type MyzelTopologyParams = {
  readonly tension: number;
  readonly slimLayers: number;
  readonly rawReality: number;
  readonly intensityGlobal: number;
};

type AppMyzelTopologyRuntimeLoopBoundaryArgs = Pick<
  Room3TopologyStateRefs,
  | "topologyCanvasRef"
  | "topologyDragRef"
  | "topologyRefs"
  | "myceliumSnapshotRef"
  | "constellationStateRef"
  | "topologyLoopErrorRef"
  | "topologyLastStatusRef"
  | "myzelPrimedYRef"
> & {
  readonly myzelEnabled: boolean;
  readonly room: Room;
  readonly tParams: MyzelTopologyParams;
  readonly bassRootMode: "auto" | string;
  readonly selectedResidentId: string | null;
  readonly setSystemState: (next: string) => void;
  readonly resetMyzelTopologyNodes: () => void;
  readonly primeMyzelFromY: (y: number, source: "topology") => void;
  readonly noUiChangedByBoundary: true;
  readonly noAudioPolicyChangedByBoundary: true;
  readonly noWaveStarterOrRootFollowPolicyOwnedHere: true;
};

export type AppMyzelTopologyRuntimeLoopBoundary = {
  readonly myzelTopologyRuntimeLoopBoundaryExtractedFromAppTsx: true;
  readonly ownsTopologyRafOnly: true;
  readonly preservesSnapshotAndCanvasContracts: true;
  readonly noUiChangedByBoundary: true;
  readonly noAudioPolicyChangedByBoundary: true;
  readonly noWaveStarterOrRootFollowPolicyOwnedHere: true;
};

export function useAppMyzelTopologyRuntimeLoopBoundary(
  args: AppMyzelTopologyRuntimeLoopBoundaryArgs,
): AppMyzelTopologyRuntimeLoopBoundary {
  const {
    myzelEnabled,
    room,
    tParams,
    bassRootMode,
    selectedResidentId,
    topologyCanvasRef,
    topologyDragRef,
    topologyRefs,
    myceliumSnapshotRef,
    constellationStateRef,
    topologyLoopErrorRef,
    topologyLastStatusRef,
    myzelPrimedYRef,
    setSystemState,
    resetMyzelTopologyNodes,
    primeMyzelFromY,
  } = args;

  const selectedResidentIdRef = useRef(selectedResidentId);
  selectedResidentIdRef.current = selectedResidentId;

  useEffect(() => {
    if (!myzelEnabled) return;

    const baseFreq = 220;
    topologyLoopErrorRef.current = null;
    if (!topologyRefs.current.nodes.length) {
      resetMyzelTopologyNodes();
    }
    topologyRefs.current.cursor = topologyRefs.current.cursor.x || topologyRefs.current.cursor.y
      ? topologyRefs.current.cursor
      : { x: TOPO_WIDTH / 2, y: TOPO_HEIGHT / 2, vx: 0, vy: 0 };

    const setTopologyStatus = (next: string) => {
      if (topologyLastStatusRef.current !== next) {
        topologyLastStatusRef.current = next;
        setSystemState(next);
      }
    };

    let animId = 0;
    let alive = true;
    const loop = () => {
      try {
        const refs = topologyRefs.current;
        const frame = advanceMyzelSynthRoom3Runtime({
          nodes: refs.nodes,
          cursor: refs.cursor,
          params: tParams,
          baseFreq,
          width: TOPO_WIDTH,
          height: TOPO_HEIGHT,
          targetGameHeight: GAME_HEIGHT,
          previousConstellation: constellationStateRef.current,
        });

        constellationStateRef.current = frame.constellationState;
        myceliumSnapshotRef.current = frame.snapshot;
        setTopologyStatus(frame.statusLine);

        if (myzelEnabled && bassRootMode === "auto" && (room === "TOPOLOGY" || myzelPrimedYRef.current === null)) {
          primeMyzelFromY(frame.cursorYForGame, "topology");
        }

        const drawTopology = room === "TOPOLOGY" ? topologyCanvasRef.current : null;
        const c = drawTopology?.getContext("2d") ?? null;
        if (c) {
          renderMyzelSynthRoom3RuntimeCanvas({
            ctx: c,
            nodes: refs.nodes,
            cursor: refs.cursor,
            width: TOPO_WIDTH,
            height: TOPO_HEIGHT,
            spatialFieldProbe: frame.spatialFieldProbe,
            selectedResidentId: selectedResidentIdRef.current,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        topologyLoopErrorRef.current = message;
        console.error("[xensonar][topology-loop]", error);
        setTopologyStatus(`Myzel Fehler: ${message}`);
      } finally {
        if (alive) animId = requestAnimationFrame(loop);
      }
    };

    animId = requestAnimationFrame(loop);

    return () => {
      alive = false;
      topologyDragRef.current = { nodeIndex: null, offsetX: 0, offsetY: 0 };
      cancelAnimationFrame(animId);
    };
  }, [myzelEnabled, tParams, room, bassRootMode]);

  return {
    myzelTopologyRuntimeLoopBoundaryExtractedFromAppTsx: true,
    ownsTopologyRafOnly: true,
    preservesSnapshotAndCanvasContracts: true,
    noUiChangedByBoundary: true,
    noAudioPolicyChangedByBoundary: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  };
}
