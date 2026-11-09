/**
 * Dev-only scheduler drift metric for DiagnosticsHUD.
 * Sequencer (drumBassScheduler) sets time-until-next-step (ms) when running; DiagnosticsHUD samples it.
 * Supports vision: "robust, artifact-free audio scheduling" and tuning observability.
 */

let schedulerDriftMs: number | null = null;

export function setSchedulerDriftMs(ms: number | null): void {
  schedulerDriftMs = ms;
}

export function getSchedulerDriftMs(): number | null {
  return schedulerDriftMs;
}
