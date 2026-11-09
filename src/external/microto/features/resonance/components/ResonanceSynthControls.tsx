/**
 * Synth parameter control panel for Resonance room.
 * Composes ResonanceDroneParticleControls and ResonanceGridQuantizeControls.
 * Vision §8 clearer modules; STRUCTURE universal components.
 */
import type { DronePreset, ParticleSystem } from "../config/types";
import type { ChurchMode } from "../../../shared/tuning/modes";
import type { ResonanceState } from "../config/state";
import type { Dispatch, SetStateAction } from "react";
import { ResonanceDroneParticleControls } from "./ResonanceDroneParticleControls";
import { ResonanceGridQuantizeControls } from "./ResonanceGridQuantizeControls";
import { ResonanceOvertoneMixerControls } from "./ResonanceOvertoneMixerControls";
import { getResonanceUiSliceFromState } from "../config/stateSlices";

type ResonanceSynthControlsProps = {
  nParamsUI: ResonanceState;
  updateNParams: (partial: Partial<ResonanceState>) => void;
  setDronePreset: (preset: DronePreset) => void;
  droneVolume: number;
  setDroneVolume: Dispatch<SetStateAction<number>>;
  setParticleSystem: (system: ParticleSystem) => void;
  setChurchMode: (mode: ChurchMode) => void;
  /** Set global root from current cursor pitch (harmonic center follows cursor). */
  setGlobalRootFromCursor?: () => void;
};

export function ResonanceSynthControls({
  nParamsUI,
  updateNParams,
  setDronePreset,
  droneVolume,
  setDroneVolume,
  setParticleSystem,
  setChurchMode,
  setGlobalRootFromCursor,
}: ResonanceSynthControlsProps) {
  const ui = getResonanceUiSliceFromState(nParamsUI);
  return (
    <div className="border border-neutral-800 bg-black p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ResonanceDroneParticleControls
        ui={ui}
        updateNParams={updateNParams}
        setDronePreset={setDronePreset}
        droneVolume={droneVolume}
        setDroneVolume={setDroneVolume}
        setParticleSystem={setParticleSystem}
      />
      <ResonanceGridQuantizeControls
        ui={ui}
        updateNParams={updateNParams}
        setChurchMode={setChurchMode}
        setGlobalRootFromCursor={setGlobalRootFromCursor}
      />
      <div className="space-y-3">
        <ResonanceOvertoneMixerControls
          ui={ui}
          updateNParams={updateNParams}
        />
        <div className="text-[11px] leading-snug text-neutral-400 border border-neutral-800/60 bg-neutral-900/60 rounded px-2 py-1.5">
          <p className="font-semibold text-neutral-300 mb-1">
            Wave performance quick reference
          </p>
          <p>
            Hold the wave drive key to push the cast sound into a brighter, more
            intense register, then release to let it fall back. Hold the octave
            boost key briefly for a single jump, or keep it held to latch a
            higher octave focus for longer wave phrases.
          </p>
        </div>
      </div>
    </div>
  );
}
