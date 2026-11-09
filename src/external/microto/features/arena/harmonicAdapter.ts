import type { HarmonicWorld, HarmonicWorldIntensity } from "../../domain/harmonicWorld";
import { formatGridTuningLabel } from "../../shared/tuning/tuningLabels";

export type ArenaHarmonicView = {
  modeLabel?: string;
  tuningLabel?: string;
  intensity?: HarmonicWorldIntensity;
};

export function mapWorldToArenaView(world?: HarmonicWorld | null): ArenaHarmonicView {
  if (!world) {
    return {};
  }

  const tuningLabel = formatGridTuningLabel(world.gridTuning);
  const modeLabel = world.label ?? tuningLabel;
  const intensity = world.profile?.intensity;

  return { modeLabel, tuningLabel, intensity };
}

