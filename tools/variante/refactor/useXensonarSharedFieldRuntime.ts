import { useCallback, useEffect, useRef } from "react";
import type { SharedFieldBall, SharedFieldNode, SharedFieldSnapshot } from "../../../../external/microto/features/refactorField/sharedFieldTypes";
import { HEIGHT, WIDTH, clamp } from "./music";
import type { SharedFieldController } from "./sharedFieldController";

export type InstallationNode = {
  id: string;
  label: string;
  ratio: number;
  muted: boolean;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number;
  lastTrigger: number;
};

type SharedFieldRuntimeSnapshot = {
  snapshot: SharedFieldSnapshot | null;
  ball: SharedFieldBall | null;
  nodes: SharedFieldNode[];
};

export function useXensonarSharedFieldRuntime(sharedField: SharedFieldController | null) {
  const sharedFieldSnapshotRef = useRef<SharedFieldRuntimeSnapshot>({ snapshot: null, ball: null, nodes: [] });
  const installationNodesRef = useRef<Map<string, InstallationNode>>(new Map());
  const installationDragNodeIdRef = useRef<string | null>(null);

  const syncSharedField = useCallback(() => {
    if (!sharedField?.active) {
      sharedFieldSnapshotRef.current = { snapshot: null, ball: null, nodes: [] };
      installationNodesRef.current.clear();
      return;
    }

    const snapshot = sharedField.getSnapshot(WIDTH, HEIGHT);
    const nodes = snapshot.entities.filter((entity): entity is SharedFieldNode => entity.kind === "ji-node");
    const ball = snapshot.entities.find((entity): entity is SharedFieldBall => entity.kind === "oscillator-ball") ?? null;
    const registry = installationNodesRef.current;
    const alive = new Set<string>();

    for (const node of nodes) {
      alive.add(node.id);
      const existing = registry.get(node.id);
      if (!existing) {
        registry.set(node.id, {
          id: node.id,
          label: node.label,
          ratio: node.ratio ?? 1,
          muted: !!node.muted,
          homeX: node.position.x,
          homeY: node.position.y,
          x: node.position.x,
          y: node.position.y,
          vx: 0,
          vy: 0,
          energy: clamp(node.energy, 0, 1),
          lastTrigger: 0,
        });
        continue;
      }
      existing.label = node.label;
      existing.ratio = node.ratio ?? existing.ratio;
      existing.muted = !!node.muted;
      existing.homeX = node.position.x;
      existing.homeY = node.position.y;
      existing.energy = Math.max(existing.energy, clamp(node.energy, 0, 1));
    }

    for (const id of Array.from(registry.keys())) {
      if (!alive.has(id)) registry.delete(id);
    }

    sharedFieldSnapshotRef.current = { snapshot, ball, nodes };
  }, [sharedField]);

  const endSharedFieldDrag = useCallback(() => {
    if (!installationDragNodeIdRef.current) return;
    installationDragNodeIdRef.current = null;
    sharedField?.onNodeDragEnd?.();
  }, [sharedField]);

  useEffect(() => {
    if (!sharedField?.interactive) return;
    const handlePointerUp = () => {
      endSharedFieldDrag();
    };
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, [endSharedFieldDrag, sharedField?.interactive]);

  return {
    sharedFieldSnapshotRef,
    installationNodesRef,
    installationDragNodeIdRef,
    syncSharedField,
    endSharedFieldDrag,
  };
}
