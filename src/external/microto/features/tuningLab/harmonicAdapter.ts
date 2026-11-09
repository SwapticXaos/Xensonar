import type { HarmonicWorld, HarmonicWorldIntensity } from "../../domain/harmonicWorld";
import { formatGridTuningLabel } from "../../shared/tuning/tuningLabels";

export type TuningLabHarmonicView = {
  modeLabel?: string;
  tuningLabel?: string;
  intensity?: HarmonicWorldIntensity;
};

/**
 * Maps HarmonicWorld to HUD labels for Tuning Lab.
 * Keeps world spine consistent with Topology, Arena, Commons (FIX-NEXT-harmonic-world-adapters-v1).
 */
export function mapWorldToTuningLabView(
  world?: HarmonicWorld | null
): TuningLabHarmonicView {
  if (!world) {
    return {};
  }

  const tuningLabel = formatGridTuningLabel(world.gridTuning);
  const modeLabel = world.label ?? (tuningLabel ? `Welt: ${tuningLabel}` : undefined);
  const intensity = world.profile?.intensity;

  return { modeLabel, tuningLabel, intensity };
}
