import { useCallback, useMemo, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { QueuedCollisionTrigger } from '../../soundLibrary/particlePitchRouting';
import type { QuantizeGrid } from '../domain/instrumentData';
import type { QuantizedCollisionLiveParams, QuantizedCollisionNexusRefs, QuantizedCollisionRuntimeRefs } from './quantizedCollisionRuntime';
import type { AudioTrafficForensicsState } from './audioTrafficForensics';
import {
  createGridTempoBpmWithTrafficReset,
  createQuantizeGridModeWithTrafficReset,
  resetQuantizedTrafficQueuesBoundary,
  type QuantizedTrafficQueueBoundaryRefs,
} from './quantizedTrafficQueueBoundary';
import { cycleQuantizeGridAction } from '../rooms/quantizeGridActions';
import { markWaveOvertoneArpQueueClear, type WaveOvertoneArpQueueEntry } from './waveOvertoneArpRuntime';

export type QuantizedTrafficBoundaryArgs = {
  nexusRefs: MutableRefObject<QuantizedCollisionNexusRefs>;
  nexusParamsRef: MutableRefObject<QuantizedCollisionLiveParams>;
  trafficRef: MutableRefObject<AudioTrafficForensicsState>;
  setGridTempoBpm: Dispatch<SetStateAction<number>>;
  setQuantizeGrid: Dispatch<SetStateAction<QuantizeGrid>>;
};

export type WaveOvertoneArpTrafficRefs = {
  waveOvertoneArpQueueRef: MutableRefObject<WaveOvertoneArpQueueEntry[]>;
  waveOvertoneArpTimerRef: MutableRefObject<number | null>;
  trafficRef: MutableRefObject<AudioTrafficForensicsState>;
};

export type QuantizedTrafficBoundary = {
  quantizeAnchorRef: MutableRefObject<number | null>;
  waveCollisionQueueRef: MutableRefObject<QueuedCollisionTrigger[]>;
  particleQuantizeSeenRef: MutableRefObject<number[]>;
  particleQuantizeRafRef: MutableRefObject<number | null>;
  particleQuantizeTimerRef: MutableRefObject<number | null>;
  waveOvertoneArpQueueRef: MutableRefObject<WaveOvertoneArpQueueEntry[]>;
  waveOvertoneArpTimerRef: MutableRefObject<number | null>;
  quantizedTrafficQueueRefs: QuantizedTrafficQueueBoundaryRefs & QuantizedCollisionRuntimeRefs;
  waveOvertoneArpTrafficRefs: WaveOvertoneArpTrafficRefs;
  resetQuantizedTrafficQueues: () => void;
  setGridTempoBpmWithTrafficReset: (bpm: number) => void;
  setQuantizeGridMode: (grid: QuantizeGrid) => void;
  cycleQuantizeGrid: () => void;
};

export function useQuantizedTrafficBoundary({
  nexusRefs,
  nexusParamsRef,
  trafficRef,
  setGridTempoBpm,
  setQuantizeGrid,
}: QuantizedTrafficBoundaryArgs): QuantizedTrafficBoundary {
  const quantizeAnchorRef = useRef<number | null>(null);
  const waveCollisionQueueRef = useRef<QueuedCollisionTrigger[]>([]);
  const particleQuantizeSeenRef = useRef<number[]>([]);
  const particleQuantizeRafRef = useRef<number | null>(null);
  const particleQuantizeTimerRef = useRef<number | null>(null);
  const waveOvertoneArpQueueRef = useRef<WaveOvertoneArpQueueEntry[]>([]);
  const waveOvertoneArpTimerRef = useRef<number | null>(null);

  const quantizedTrafficQueueRefs = useMemo(() => ({
    quantizeAnchorRef,
    nexusRefs,
    nexusParamsRef,
    waveCollisionQueueRef,
    particleQuantizeSeenRef,
    particleQuantizeRafRef,
    particleQuantizeTimerRef,
    waveOvertoneArpQueueRef,
    trafficRef,
  }), [nexusRefs, nexusParamsRef, trafficRef]);

  const waveOvertoneArpTrafficRefs = useMemo(() => ({
    waveOvertoneArpQueueRef,
    waveOvertoneArpTimerRef,
    trafficRef,
  }), [trafficRef]);

  const resetQuantizedTrafficQueues = useCallback(() => {
    resetQuantizedTrafficQueuesBoundary(quantizedTrafficQueueRefs);
  }, [quantizedTrafficQueueRefs]);

  const setGridTempoBpmWithTrafficReset = useMemo(() => createGridTempoBpmWithTrafficReset({
    refs: quantizedTrafficQueueRefs,
    setGridTempoBpm,
  }), [quantizedTrafficQueueRefs, setGridTempoBpm]);

  const setQuantizeGridMode = useMemo(() => createQuantizeGridModeWithTrafficReset({
    refs: quantizedTrafficQueueRefs,
    setQuantizeGrid,
  }), [quantizedTrafficQueueRefs, setQuantizeGrid]);

  const cycleQuantizeGrid = useCallback(() => cycleQuantizeGridAction({
    refs: quantizedTrafficQueueRefs,
    setQuantizeGrid,
    onWaveOvertoneArpQueueClear: (reason) => markWaveOvertoneArpQueueClear(waveOvertoneArpTrafficRefs, reason),
  }), [quantizedTrafficQueueRefs, setQuantizeGrid, waveOvertoneArpTrafficRefs]);

  return {
    quantizeAnchorRef,
    waveCollisionQueueRef,
    particleQuantizeSeenRef,
    particleQuantizeRafRef,
    particleQuantizeTimerRef,
    waveOvertoneArpQueueRef,
    waveOvertoneArpTimerRef,
    quantizedTrafficQueueRefs,
    waveOvertoneArpTrafficRefs,
    resetQuantizedTrafficQueues,
    setGridTempoBpmWithTrafficReset,
    setQuantizeGridMode,
    cycleQuantizeGrid,
  };
}
