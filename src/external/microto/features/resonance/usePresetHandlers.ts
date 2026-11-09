/**
 * Preset save/load handlers for resonance state (vision §6: modular domains).
 * Single place for "save current state to storage" and "load from storage and apply constraints";
 * App composes this hook and passes handlers to useResonance so preset is a named domain.
 * Load routes through update (single mutator per CORE §3.1); save reads ref only.
 */

import type { MutableRefObject } from "react";
import type { ResonanceState } from "./config/state";
import { applyResonanceStateConstraints, createDefaultResonanceState } from "./config/defaults";
import { loadResonancePreset, saveResonancePreset } from "./presetPersistence";

export type UsePresetHandlersArgs = {
  nexusParamsRef: MutableRefObject<ResonanceState>;
  update: (partial: Partial<ResonanceState>) => void;
};

export function usePresetHandlers({ nexusParamsRef, update }: UsePresetHandlersArgs) {
  const savePreset = () => saveResonancePreset(nexusParamsRef.current);

  const loadPreset = () => {
    const loaded = loadResonancePreset();
    if (loaded) {
      const next = applyResonanceStateConstraints(createDefaultResonanceState(), loaded);
      update(next);
    }
  };

  return { savePreset, loadPreset };
}
