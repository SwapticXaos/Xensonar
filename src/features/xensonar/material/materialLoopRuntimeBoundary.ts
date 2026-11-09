import { useRef } from 'react';
import { stopMaterialLoopPlayback } from './materialLoopPlaybackWorkflow';
import { markMaterialTrackAllCacheEntriesReleased } from './materialTrackLifecycleRegistry';

export type MaterialLoopRuntimeBoundaryRefs = {
  cacheRef: { current: Map<string, AudioBuffer> };
  sourceRef: { current: AudioBufferSourceNode | null };
  gainRef: { current: GainNode | null };
  tokenRef: { current: number };
};

export function useMaterialLoopRuntimeBoundaryRefs(): MaterialLoopRuntimeBoundaryRefs {
  const cacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const tokenRef = useRef(0);
  return { cacheRef, sourceRef, gainRef, tokenRef };
}

export function stopMaterialLoopPlaybackNodesBoundary(refs: Pick<MaterialLoopRuntimeBoundaryRefs, 'sourceRef' | 'gainRef'>) {
  stopMaterialLoopPlayback({
    sourceRef: refs.sourceRef,
    gainRef: refs.gainRef,
  });
}

export function stopMaterialLoopRuntimeBoundary(refs: MaterialLoopRuntimeBoundaryRefs) {
  refs.tokenRef.current += 1;
  stopMaterialLoopPlaybackNodesBoundary(refs);
  markMaterialTrackAllCacheEntriesReleased(refs.cacheRef.current, 'material-loop-runtime-boundary-cache-cleared');
  refs.cacheRef.current.clear();
}
