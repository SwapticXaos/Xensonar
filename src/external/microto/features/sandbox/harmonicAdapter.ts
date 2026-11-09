import type { HarmonicWorld } from "../../domain/harmonicWorld";
import type { GlobalHarmonicContext } from "../resonance/config/stateSlices";
import type { QuantizeSliceLike } from "../../shared/tuning/quantizeLabel";
import { formatGridTuningLabel } from "../../shared/tuning/tuningLabels";

export type SandboxHarmonicView = {
  modeLabel?: string;
  tuningLabel?: string;
  quantizeSlice: QuantizeSliceLike;
};

/**
 * Map the shared harmonic context + world into a lightweight view-model for the Sandbox HUD.
 *
 * Behavior:
 * - If a GlobalHarmonicContext is present, use its quantize settings as the primary source.
 * - If only a HarmonicWorld is present, fall back to its quantize fields.
 * - Mode label prefers the world label when available, else a simple "Frei".
 */
export function mapSandboxHarmonicView(
  global: GlobalHarmonicContext | null | undefined,
  world: HarmonicWorld | null | undefined,
): SandboxHarmonicView {
  const quantizeSlice: QuantizeSliceLike =
    global != null
      ? {
          quantizeOn: global.quantizeOn,
          quantizeBpm: global.quantizeBpm,
          quantizeSubdivision: global.quantizeSubdivision,
        }
      : world != null
        ? {
            quantizeOn: world.quantizeOn,
            quantizeBpm: world.quantizeBpm,
            quantizeSubdivision: world.quantizeSubdivision,
          }
        : {
            quantizeOn: false,
            quantizeBpm: 120,
            quantizeSubdivision: "16",
          };

  const tuningLabel = formatGridTuningLabel(global?.gridTuning ?? world?.gridTuning);
  const modeLabel = world?.label ?? "Frei";

  return { modeLabel, tuningLabel, quantizeSlice };
}

