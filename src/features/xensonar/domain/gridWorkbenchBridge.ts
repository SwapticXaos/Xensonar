import type { GridTuning } from "./instrumentData";

export const OPEN_MELODIC_LOOP_GRID_WORKBENCH_EVENT = "xensonar:open-grid-workbench-for-melodic-loop";
export const APPLY_GRID_TUNING_TO_MELODIC_LOOP_EVENT = "xensonar:apply-grid-tuning-to-melodic-loop";

export function requestOpenMelodicLoopGridWorkbench() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_MELODIC_LOOP_GRID_WORKBENCH_EVENT));
}

export function sendGridTuningToMelodicLoop(tuning: GridTuning) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(APPLY_GRID_TUNING_TO_MELODIC_LOOP_EVENT, { detail: { tuning } }));
}
