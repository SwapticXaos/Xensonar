import type { HarmonicWorld, HarmonicWorldIntensity } from "../../domain/harmonicWorld";
import { formatGridTuningLabel } from "../../shared/tuning/tuningLabels";

export type TopologyHarmonicView = {
  modeLabel?: string;
  tuningLabel?: string;
  intensity?: HarmonicWorldIntensity;
};

export function mapWorldToTopologyView(world?: HarmonicWorld | null): TopologyHarmonicView {
  if (!world) {
    return {};
  }

  const tuningLabel = formatGridTuningLabel(world.gridTuning);
  const modeLabel = world.label ?? tuningLabel;
  const intensity = world.profile?.intensity;

  return { modeLabel, tuningLabel, intensity };
}

