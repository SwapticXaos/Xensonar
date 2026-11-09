import type { ControlSchedulerMetrics } from "@/features/resonance/controlScheduler";
import type { TransientRuntimeSnapshot } from "@/features/resonance/transientRuntime";

export const RESONANCE_CONTROL_PERF_MONITOR_EVENT = "xensonar:resonance-control-perf-monitor";
export const RESONANCE_TRANSIENT_RUNTIME_MONITOR_EVENT = "xensonar:resonance-transient-runtime-monitor";

export type ResonanceControlPerfMonitorEvent = CustomEvent<ControlSchedulerMetrics>;
export type ResonanceTransientRuntimeMonitorEvent = CustomEvent<TransientRuntimeSnapshot>;

export function publishResonanceControlPerfMonitor(metrics: ControlSchedulerMetrics): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RESONANCE_CONTROL_PERF_MONITOR_EVENT, { detail: metrics }));
}

export function publishResonanceTransientRuntimeMonitor(snapshot: TransientRuntimeSnapshot): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RESONANCE_TRANSIENT_RUNTIME_MONITOR_EVENT, { detail: snapshot }));
}
