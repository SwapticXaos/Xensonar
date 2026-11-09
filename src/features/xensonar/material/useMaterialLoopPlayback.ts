import { useEffect } from 'react';
import type { MaterialEntry } from '../../l3lab/materialLibrary';
import type { MaterialLoopTimeMode } from './materialLoopMath';
import { startMaterialLoopPlayback } from './materialLoopPlaybackWorkflow';
import { stopMaterialLoopPlaybackNodesBoundary, type MaterialLoopRuntimeBoundaryRefs } from './materialLoopRuntimeBoundary';

type UseMaterialLoopPlaybackArgs = {
  audioCtx: AudioContext | null;
  nexusActive: boolean;
  materialLoopActive: boolean;
  selectedLoopMaterial: MaterialEntry | null;
  quantizeBpm: number;
  materialLoopTimeMode: MaterialLoopTimeMode;
  materialLoopVolume: number;
  materialLoopSyncToBeat: boolean;
  refs: MaterialLoopRuntimeBoundaryRefs;
  getRhythmBus: (ctx: AudioContext) => AudioNode;
  ensureMyzelPostFxRouter: (ctx: AudioContext) => void;
  getForgeSend: () => GainNode | null;
};

export function useMaterialLoopPlayback({
  audioCtx,
  nexusActive,
  materialLoopActive,
  selectedLoopMaterial,
  quantizeBpm,
  materialLoopTimeMode,
  materialLoopVolume,
  materialLoopSyncToBeat,
  refs,
  getRhythmBus,
  ensureMyzelPostFxRouter,
  getForgeSend,
}: UseMaterialLoopPlaybackArgs) {
  useEffect(() => {
    const entry = selectedLoopMaterial;
    const ctx = audioCtx;

    if (!ctx || !nexusActive || !materialLoopActive || !entry) {
      stopMaterialLoopPlaybackNodesBoundary(refs);
      return;
    }

    let cancelled = false;
    refs.tokenRef.current += 1;

    void startMaterialLoopPlayback({
      ctx,
      entry,
      quantizeBpm,
      timeMode: materialLoopTimeMode,
      volume: materialLoopVolume,
      syncToBeat: materialLoopSyncToBeat,
      refs,
      getRhythmBus,
      ensureMyzelPostFxRouter,
      getForgeSend,
    }).catch((error) => {
      if (cancelled) return;
      console.error('[xensonar][material-loop]', error);
      stopMaterialLoopPlaybackNodesBoundary(refs);
    });

    return () => {
      cancelled = true;
      refs.tokenRef.current += 1;
      stopMaterialLoopPlaybackNodesBoundary(refs);
    };
  }, [
    audioCtx,
    nexusActive,
    materialLoopActive,
    selectedLoopMaterial,
    quantizeBpm,
    materialLoopTimeMode,
    materialLoopVolume,
    materialLoopSyncToBeat,
  ]);
}
