import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { QuantizeGrid } from '../domain/instrumentData';
import { getNextQuantizeGrid } from './quantizeGridHelpers';
import { resetQuantizedTrafficQueuesBoundary, type QuantizedTrafficQueueBoundaryRefs } from '../audioTraffic/quantizedTrafficQueueBoundary';

type LegacyNexusRefs = MutableRefObject<{ nextAbsoluteStep: number | null }>;
type QueueRef<T = any> = MutableRefObject<T[]>;
type TimerRef = MutableRefObject<number | null>;

type LegacyCycleQuantizeGridArgs = {
  quantizeAnchorRef: MutableRefObject<number | null>;
  nexusRefs: LegacyNexusRefs;
  waveCollisionQueueRef: QueueRef;
  particleQuantizeSeenRef: QueueRef;
  waveOvertoneArpQueueRef: QueueRef;
  particleQuantizeTimerRef: TimerRef;
  setQuantizeGrid: Dispatch<SetStateAction<QuantizeGrid>>;
  onWaveOvertoneArpQueueClear?: (reason: string) => void;
};

type ContractCycleQuantizeGridArgs = {
  refs: QuantizedTrafficQueueBoundaryRefs;
  setQuantizeGrid: Dispatch<SetStateAction<QuantizeGrid>>;
  onWaveOvertoneArpQueueClear?: (reason: string) => void;
};

type CycleQuantizeGridArgs = LegacyCycleQuantizeGridArgs | ContractCycleQuantizeGridArgs;

function toQuantizedTrafficRefs(args: CycleQuantizeGridArgs): QuantizedTrafficQueueBoundaryRefs {
  if ('refs' in args) return args.refs;
  return {
    quantizeAnchorRef: args.quantizeAnchorRef,
    nexusRefs: args.nexusRefs,
    waveCollisionQueueRef: args.waveCollisionQueueRef,
    particleQuantizeSeenRef: args.particleQuantizeSeenRef,
    particleQuantizeTimerRef: args.particleQuantizeTimerRef,
    waveOvertoneArpQueueRef: args.waveOvertoneArpQueueRef,
  };
}

export function cycleQuantizeGridAction(args: CycleQuantizeGridArgs) {
  const refs = toQuantizedTrafficRefs(args);
  resetQuantizedTrafficQueuesBoundary(refs);
  args.onWaveOvertoneArpQueueClear?.('quantize-grid-cycle');
  args.setQuantizeGrid((prev) => getNextQuantizeGrid(prev));
}
