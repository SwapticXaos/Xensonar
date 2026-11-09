import type { HarmonicWorld } from "../../domain/harmonicWorld";
import { formatGridTuningLabel } from "../../shared/tuning/tuningLabels";

export type CommonsHarmonicView = {
  modeLabel?: string;
  tuningLabel?: string;
};

export function mapWorldToCommonsView(world?: HarmonicWorld | null, fallbackMode?: "ji" | "edo12"): CommonsHarmonicView {
  if (!world) {
    if (!fallbackMode) {
      return {};
    }
    return {
      modeLabel: fallbackMode === "ji" ? "Just Intonation" : "12 EDO",
      tuningLabel: undefined,
    };
  }

  const tuningLabel = formatGridTuningLabel(world.gridTuning);
  const modeLabel = world.label ?? tuningLabel;

  return { modeLabel, tuningLabel };
}

