import type { GridTuning } from "./grid";

const GRID_TUNING_LABELS: Record<GridTuning, string> = {
  ji: "Just Intonation",
  bp: "Bohlen–Pierce",
  "12edo": "12-EDO",
  "17edo": "17-EDO",
  "19edo": "19-EDO",
  "22edo": "22-EDO",
  "31edo": "31-EDO",
};

export function formatGridTuningLabel(tuning: GridTuning | undefined): string | undefined {
  if (!tuning) return undefined;
  return GRID_TUNING_LABELS[tuning] ?? tuning.toUpperCase();
}

