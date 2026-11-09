import type { HarmonicWorld } from "../../domain/harmonicWorld";
import { formatGridTuningLabel } from "../../shared/tuning/tuningLabels";

export type Level3HarmonicView = {
  modeLabel?: string;
  tuningLabel?: string;
};

export function mapWorldToLevel3View(world?: HarmonicWorld | null): Level3HarmonicView {
  if (!world) {
    return {};
  }

  const tuningLabel = formatGridTuningLabel(world.gridTuning);
  const modeLabel = world.label ?? `Welt: ${tuningLabel}`;

  return { modeLabel, tuningLabel };
}

