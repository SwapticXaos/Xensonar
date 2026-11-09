/**
 * Drone and particle controls for Resonance room.
 * Extracted from ResonanceSynthControls for LOC discipline and single responsibility.
 */
import { DRONE_PRESETS, PARTICLE_PRESETS } from "../config/presets";
import type { DronePreset, ParticlePreset, ParticleSystem } from "../config/types";
import type { ResonanceState } from "../config/state";
import type { Dispatch, SetStateAction } from "react";
import type { ResonanceUiSlice } from "../config/stateSlices";

type Props = {
  ui: ResonanceUiSlice;
  updateNParams: (partial: Partial<ResonanceState>) => void;
  setDronePreset: (preset: DronePreset) => void;
  droneVolume: number;
  setDroneVolume: Dispatch<SetStateAction<number>>;
  setParticleSystem: (system: ParticleSystem) => void;
};

export function ResonanceDroneParticleControls({
  ui,
  updateNParams,
  setDronePreset,
  droneVolume,
  setDroneVolume,
  setParticleSystem,
}: Props) {
  return (
    <>
      <label className="text-sm text-neutral-300">
        Drone Volume
        <input
          className="w-full mt-1"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={droneVolume}
          onChange={(e) => setDroneVolume(parseFloat(e.target.value))}
        />
      </label>
      <label className="text-sm text-neutral-300">
        Drone Preset
        <select
          className="w-full mt-1 bg-neutral-900 border border-neutral-700 p-1"
          value={ui.drone.dronePreset}
          onChange={(e) => setDronePreset(e.target.value as DronePreset)}
        >
          {DRONE_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-neutral-300">
        Particle System
        <select
          className="w-full mt-1 bg-neutral-900 border border-neutral-700 p-1"
          value={ui.particle.particleSystem}
          onChange={(e) => setParticleSystem(e.target.value as ParticleSystem)}
        >
          <option value="ji">JI</option>
          <option value="12edo">12-EDO</option>
          <option value="bp">Bohlen-Pierce</option>
        </select>
      </label>
      <label className="text-sm text-neutral-300">
        Particle Preset
        <select
          className="w-full mt-1 bg-neutral-900 border border-neutral-700 p-1"
          value={ui.particle.particlePreset}
          onChange={(e) => updateNParams({ particlePreset: e.target.value as ParticlePreset })}
        >
          {PARTICLE_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-neutral-300">
        Particle Volume
        <input
          className="w-full mt-1"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={ui.particle.particleVolume}
          onChange={(e) => updateNParams({ particleVolume: parseFloat(e.target.value) })}
        />
      </label>
    </>
  );
}
