import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createInitialStableMusicLaneRuntimeSnapshot,
  type StableMusicLaneRuntimeSnapshot,
  type StableMusicLaneSnapshot,
} from './stableMusicLaneContracts';
import { createStableMusicLaneWorkletBridge, type StableMusicLaneWorkletBridge } from './stableMusicLaneWorkletBridge';

export type UseStableMusicLaneRuntimeBoundaryArgs = {
  enabled: boolean;
  audioCtx: AudioContext | null;
  resolveDestination: (ctx: AudioContext) => AudioNode;
  snapshot: StableMusicLaneSnapshot;
  snapshotKey: string;
};

export type StableMusicLaneRuntimeBoundary = {
  snapshot: StableMusicLaneRuntimeSnapshot;
  requestHeartbeat: () => void;
};

export function useStableMusicLaneRuntimeBoundary({
  enabled,
  audioCtx,
  resolveDestination,
  snapshot: laneSnapshot,
  snapshotKey,
}: UseStableMusicLaneRuntimeBoundaryArgs): StableMusicLaneRuntimeBoundary {
  const bridgeRef = useRef<StableMusicLaneWorkletBridge | null>(null);
  const latestLaneSnapshotRef = useRef(laneSnapshot);
  latestLaneSnapshotRef.current = laneSnapshot;
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<StableMusicLaneRuntimeSnapshot>(() =>
    createInitialStableMusicLaneRuntimeSnapshot(),
  );

  useEffect(() => {
    if (!enabled || !audioCtx) {
      bridgeRef.current?.stop();
      return;
    }
    const destination = resolveDestination(audioCtx);
    const bridge = createStableMusicLaneWorkletBridge(audioCtx, destination);
    bridgeRef.current = bridge;
    const unsubscribe = bridge.subscribe(setRuntimeSnapshot);
    let cancelled = false;
    bridge.start()
      .then(() => {
        if (!cancelled) bridge.sendSnapshot(latestLaneSnapshotRef.current);
      })
      .catch((error) => {
        if (!cancelled) {
          setRuntimeSnapshot((prev) => ({
            ...prev,
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            detail: 'stable-music-lane-start-failed',
          }));
        }
      });
    return () => {
      cancelled = true;
      unsubscribe();
      bridge.dispose();
      if (bridgeRef.current === bridge) bridgeRef.current = null;
    };
  }, [audioCtx, enabled, resolveDestination]);

  useEffect(() => {
    if (!enabled) return;
    bridgeRef.current?.sendSnapshot(laneSnapshot);
  }, [enabled, laneSnapshot, snapshotKey]);

  const requestHeartbeat = useMemo(
    () => () => bridgeRef.current?.requestHeartbeat(),
    [],
  );

  return { snapshot: runtimeSnapshot, requestHeartbeat };
}
