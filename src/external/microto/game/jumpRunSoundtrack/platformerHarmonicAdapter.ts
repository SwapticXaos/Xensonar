import type { HarmonicWorld } from "../../domain/harmonicWorld";
import type { QuantizeSliceLike } from "../../shared/tuning/quantizeLabel";
import { formatGridTuningLabel } from "../../shared/tuning/tuningLabels";

export type PlatformerHarmonicView = {
  modeLabel?: string;
  tuningLabel?: string;
  quantizeSlice: QuantizeSliceLike;
};

/**
 * Build a lightweight harmonic view for the platformer room from the shared HarmonicWorld model.
 *
 * The adapter is intentionally read-only: it does not change platformer timing or tuning behavior,
 * it only drives HUD labels and optional quantize display. BPM falls back to the local transport
 * value so the HUD remains meaningful even if the world did not specify its own tempo.
 */
export function mapWorldToPlatformerView(
  world: HarmonicWorld | null | undefined,
  bpmFallback: number,
): PlatformerHarmonicView {
  if (!world) {
    return {
      modeLabel: undefined,
      tuningLabel: undefined,
      quantizeSlice: {
        quantizeOn: true,
        quantizeBpm: bpmFallback,
        quantizeSubdivision: "16",
      },
    };
  }

  const tuningLabel = formatGridTuningLabel(world.gridTuning);
  const modeLabel = world.label ?? tuningLabel;

  const quantizeSlice: QuantizeSliceLike = {
    quantizeOn: world.quantizeOn,
    quantizeBpm: world.quantizeBpm || bpmFallback,
    quantizeSubdivision: world.quantizeSubdivision,
  };

  return { modeLabel, tuningLabel, quantizeSlice };
}

