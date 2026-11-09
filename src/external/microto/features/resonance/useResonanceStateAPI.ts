/**
 * Resonance state facade (vision §6 modular domains).
 * Single entry point for read (snapshot) + write (update) with constraints applied inside.
 * Replaces raw nexusParamsRef + updateNParams spread; App composes this hook.
 */

import { useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { ResonanceState } from "./config/state";
import { applyResonanceStateConstraints, createDefaultResonanceState } from "./config/defaults";

export type ResonanceStateAPI = {
  nexusParamsRef: MutableRefObject<ResonanceState>;
  nParamsUI: ResonanceState;
  setNParamsUI: (next: ResonanceState) => void;
  snapshot: () => ResonanceState;
  update: (partial: Partial<ResonanceState>) => void;
};

/**
 * Owns nexusParamsRef and nParamsUI; returns snapshot + update with constraints.
 * Use in App; pass nexusParamsRef + update to usePresetHandlers, nParamsUI + update to useResonance.
 */
export function useResonanceStateAPI(): ResonanceStateAPI {
  const nexusParamsRef = useRef<ResonanceState>(createDefaultResonanceState());
  const [nParamsUI, setNParamsUI] = useState<ResonanceState>({ ...nexusParamsRef.current });

  const update = (partial: Partial<ResonanceState>) => {
    const next = applyResonanceStateConstraints(nexusParamsRef.current, partial);
    nexusParamsRef.current = next;
    setNParamsUI({ ...next });
  };

  const snapshot = () => nexusParamsRef.current;

  return { nexusParamsRef, nParamsUI, setNParamsUI, snapshot, update };
}
