import { markLiveRuntimeResourceReleased, registerLiveRuntimeResource, snapshotLiveRuntimeDisposalRegistry } from '../runtime/liveRuntimeDisposalRegistry';
import type { LiveRuntimeDisposalRegistrySnapshot, LiveRuntimeResourceSnapshotEntry } from '../runtime/liveRuntimeDisposalRegistryTypes';
import { markAudioTrafficEvent, type AudioTrafficForensicsState } from './audioTrafficForensics';

export type QuantizedTrafficTimerRefs = {
  particleQuantizeRafRef: { current: number | null };
  particleQuantizeTimerRef: { current: number | null };
  waveCollisionQueueRef?: { current: unknown[] };
  trafficRef?: { current: AudioTrafficForensicsState };
};

export const QUANTIZED_TRAFFIC_PARTICLE_RAF_RESOURCE_ID = 'quantized-traffic:particle-loop-raf';
export const QUANTIZED_TRAFFIC_FLUSH_INTERVAL_RESOURCE_ID = 'quantized-traffic:flush-loop-interval';
export const QUANTIZED_TRAFFIC_PARTICLE_RAF_LABEL = 'quantized-traffic.particle-loop.raf';
export const QUANTIZED_TRAFFIC_FLUSH_INTERVAL_LABEL = 'quantized-traffic.flush-loop.interval';

let particleLoopRegistered = false;
let flushIntervalRegistered = false;

function markQuantizedTrafficLifecycleEvent(
  refs: Pick<QuantizedTrafficTimerRefs, 'trafficRef' | 'waveCollisionQueueRef'>,
  stage: string,
  detail: Record<string, string | number | boolean | null | undefined> = {},
) {
  markAudioTrafficEvent(refs.trafficRef?.current, {
    kind: 'stop-cleanup',
    subsystem: 'quantized-traffic',
    audioNowSec: null,
    detail: {
      stage,
      queueLength: refs.waveCollisionQueueRef?.current?.length ?? null,
      ...detail,
    },
  });
}

function ensureQuantizedTrafficParticleLoopRegistered(
  refs: QuantizedTrafficTimerRefs,
  meta: Record<string, string | number | boolean | null | undefined> = {},
) {
  if (particleLoopRegistered) return;
  particleLoopRegistered = true;
  registerLiveRuntimeResource({
    id: QUANTIZED_TRAFFIC_PARTICLE_RAF_RESOURCE_ID,
    kind: 'animation-frame',
    subsystem: 'quantized-traffic',
    label: QUANTIZED_TRAFFIC_PARTICLE_RAF_LABEL,
    owner: 'audioTraffic/quantizedTrafficTimerRegistry.ensureQuantizedTrafficParticleLoopRegistered',
    meta: {
      queueLength: refs.waveCollisionQueueRef?.current?.length ?? null,
      ...meta,
    },
  });
}

function ensureQuantizedTrafficFlushIntervalRegistered(
  refs: QuantizedTrafficTimerRefs,
  intervalMs: number,
  meta: Record<string, string | number | boolean | null | undefined> = {},
) {
  if (flushIntervalRegistered) return;
  flushIntervalRegistered = true;
  registerLiveRuntimeResource({
    id: QUANTIZED_TRAFFIC_FLUSH_INTERVAL_RESOURCE_ID,
    kind: 'interval',
    subsystem: 'quantized-traffic',
    label: QUANTIZED_TRAFFIC_FLUSH_INTERVAL_LABEL,
    owner: 'audioTraffic/quantizedTrafficTimerRegistry.ensureQuantizedTrafficFlushIntervalRegistered',
    meta: {
      intervalMs,
      queueLength: refs.waveCollisionQueueRef?.current?.length ?? null,
      ...meta,
    },
  });
}

export function scheduleQuantizedTrafficAnimationFrame(
  refs: QuantizedTrafficTimerRefs,
  callback: FrameRequestCallback,
  meta: Record<string, string | number | boolean | null | undefined> = {},
) {
  ensureQuantizedTrafficParticleLoopRegistered(refs, meta);
  const rafId = requestAnimationFrame(callback);
  refs.particleQuantizeRafRef.current = rafId;
  return rafId;
}

export function cancelQuantizedTrafficAnimationFrame(refs: QuantizedTrafficTimerRefs, reason = 'quantized-traffic-raf-cancelled') {
  const rafId = refs.particleQuantizeRafRef.current;
  if (rafId === null) return false;
  cancelAnimationFrame(rafId);
  refs.particleQuantizeRafRef.current = null;
  particleLoopRegistered = false;
  const released = markLiveRuntimeResourceReleased(QUANTIZED_TRAFFIC_PARTICLE_RAF_RESOURCE_ID, reason);
  markQuantizedTrafficLifecycleEvent(refs, reason, { rafId });
  return released;
}

export function startQuantizedTrafficFlushInterval(
  refs: QuantizedTrafficTimerRefs,
  callback: TimerHandler,
  intervalMs = 20,
  meta: Record<string, string | number | boolean | null | undefined> = {},
) {
  ensureQuantizedTrafficFlushIntervalRegistered(refs, intervalMs, meta);
  const intervalId = window.setInterval(callback, intervalMs);
  refs.particleQuantizeTimerRef.current = intervalId;
  return intervalId;
}

export function clearQuantizedTrafficFlushInterval(refs: Pick<QuantizedTrafficTimerRefs, 'particleQuantizeTimerRef' | 'trafficRef' | 'waveCollisionQueueRef'>, reason = 'quantized-traffic-interval-cleared') {
  const intervalId = refs.particleQuantizeTimerRef.current;
  if (intervalId === null) return false;
  window.clearInterval(intervalId);
  refs.particleQuantizeTimerRef.current = null;
  flushIntervalRegistered = false;
  const released = markLiveRuntimeResourceReleased(QUANTIZED_TRAFFIC_FLUSH_INTERVAL_RESOURCE_ID, reason);
  markQuantizedTrafficLifecycleEvent(refs, reason, { intervalId });
  return released;
}

export type QuantizedTrafficTimerRegistrySummary = {
  active: number;
  released: number;
  replaced: number;
  unknown: number;
  failed: number;
  activeAnimationFrames: number;
  activeIntervals: number;
  activeResources: LiveRuntimeResourceSnapshotEntry[];
  recent: LiveRuntimeResourceSnapshotEntry[];
};

function isQuantizedTrafficTimerResource(entry: LiveRuntimeResourceSnapshotEntry) {
  return entry.subsystem === 'quantized-traffic';
}

function countKind(entries: LiveRuntimeResourceSnapshotEntry[], kind: LiveRuntimeResourceSnapshotEntry['kind']) {
  return entries.filter((entry) => entry.kind === kind).length;
}

export function summarizeQuantizedTrafficTimerRegistry(
  snapshot: LiveRuntimeDisposalRegistrySnapshot = snapshotLiveRuntimeDisposalRegistry(),
): QuantizedTrafficTimerRegistrySummary {
  const activeResources = snapshot.activeResources.filter(isQuantizedTrafficTimerResource);
  const recent = snapshot.recent.filter(isQuantizedTrafficTimerResource);
  return {
    active: activeResources.length,
    released: recent.filter((entry) => entry.status === 'released').length,
    replaced: recent.filter((entry) => entry.status === 'replaced').length,
    unknown: recent.filter((entry) => entry.status === 'unknown').length,
    failed: recent.filter((entry) => entry.status === 'failed').length,
    activeAnimationFrames: countKind(activeResources, 'animation-frame'),
    activeIntervals: countKind(activeResources, 'interval'),
    activeResources,
    recent: recent.slice(-40),
  };
}
