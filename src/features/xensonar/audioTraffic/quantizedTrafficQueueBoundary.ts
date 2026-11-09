import type { QueuedCollisionTrigger } from '../../soundLibrary/particlePitchRouting';
import type { QuantizeGrid } from '../domain/instrumentData';
import { markAudioTrafficEvent, updateWaveOvertoneArpTrafficState, type AudioTrafficForensicsState } from './audioTrafficForensics';
import { clearQuantizedTrafficFlushInterval } from './quantizedTrafficTimerRegistry';

export type QuantizedTrafficQueueBoundaryRefs = {
  quantizeAnchorRef: { current: number | null };
  nexusRefs: { current: { nextAbsoluteStep?: number | null } };
  waveCollisionQueueRef: { current: QueuedCollisionTrigger[] };
  particleQuantizeSeenRef: { current: number[] };
  particleQuantizeTimerRef: { current: number | null };
  waveOvertoneArpQueueRef: { current: unknown[] };
  trafficRef?: { current: AudioTrafficForensicsState };
};

function markWaveOvertoneArpTrafficQueueReset(refs: QuantizedTrafficQueueBoundaryRefs, reason: string) {
  const traffic = refs.trafficRef?.current;
  updateWaveOvertoneArpTrafficState(traffic, {
    queueLength: 0,
    lastStage: reason,
  });
  markAudioTrafficEvent(traffic, {
    kind: 'stop-cleanup',
    subsystem: 'wave-overtone-arp',
    audioNowSec: null,
    detail: { reason },
  });
}

export function resetQuantizedTrafficQueuesBoundary(refs: QuantizedTrafficQueueBoundaryRefs) {
  refs.quantizeAnchorRef.current = null;
  refs.nexusRefs.current.nextAbsoluteStep = null;
  refs.waveCollisionQueueRef.current = [];
  refs.particleQuantizeSeenRef.current = [];
  refs.waveOvertoneArpQueueRef.current = [];
  markWaveOvertoneArpTrafficQueueReset(refs, 'quantized-traffic-reset');
  clearQuantizedTrafficFlushInterval(refs, 'quantized-traffic-queue-reset');
}

export function createGridTempoBpmWithTrafficReset(args: {
  refs: QuantizedTrafficQueueBoundaryRefs;
  setGridTempoBpm: (bpm: number) => void;
}) {
  return (bpm: number) => {
    resetQuantizedTrafficQueuesBoundary(args.refs);
    args.setGridTempoBpm(bpm);
  };
}

export function createQuantizeGridModeWithTrafficReset(args: {
  refs: QuantizedTrafficQueueBoundaryRefs;
  setQuantizeGrid: (grid: QuantizeGrid) => void;
}) {
  return (grid: QuantizeGrid) => {
    resetQuantizedTrafficQueuesBoundary(args.refs);
    args.setQuantizeGrid(grid);
  };
}
