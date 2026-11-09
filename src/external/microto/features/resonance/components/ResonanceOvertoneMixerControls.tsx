/**
 * Shared overtone mixer UI for Resonance.
 * One toggle selects whether the sliders/waveform target the drone overtone layer
 * or the wave-start cast tone used by sector pulses.
 */
import { useState } from "react";
import { DRONE_JI_OVERTONES } from "../config/overtones";
import type { ResonanceState } from "../config/state";
import type { ResonanceUiSlice } from "../config/stateSlices";
import type { ResonanceOvertoneWaveform } from "../config/types";

type Props = {
  ui: ResonanceUiSlice;
  updateNParams: (partial: Partial<ResonanceState>) => void;
};

export function ResonanceOvertoneMixerControls({
  ui,
  updateNParams,
}: Props) {
  const [activeMixer, setActiveMixer] = useState<"drone" | "wave_start">("drone");
  const activeWaveform =
    activeMixer === "drone" ? ui.drone.droneOvertoneWaveform : ui.waveStart.waveStartWaveform;
  const activeMix =
    activeMixer === "drone" ? ui.drone.droneJIOvertones : ui.waveStart.waveStartOvertones;

  const updateWaveform = (waveform: ResonanceOvertoneWaveform) => {
    if (activeMixer === "drone") {
      updateNParams({ droneOvertoneWaveform: waveform });
      return;
    }
    updateNParams({ waveStartWaveform: waveform });
  };

  const updateOvertone = (label: string, value: number) => {
    if (activeMixer === "drone") {
      updateNParams({
        droneJIOvertones: {
          ...ui.drone.droneJIOvertones,
          [label]: value,
        },
        droneJIOvertonesByPreset: {
          ...ui.drone.droneJIOvertonesByPreset,
          [ui.drone.dronePreset]: {
            ...(ui.drone.droneJIOvertonesByPreset[ui.drone.dronePreset] ?? {}),
            [label]: value,
          },
        },
      });
      return;
    }
    updateNParams({
      waveStartOvertones: {
        ...ui.waveStart.waveStartOvertones,
        [label]: value,
      },
    });
  };

  return (
    <div className="md:col-span-2 lg:col-span-3 border border-neutral-800 bg-neutral-950/70 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-200">Overtone Mixer</p>
          <p className="text-xs text-neutral-500">
            Switch between Drone and Wave Start. Backspace lifts the cast sound by one octave; hold 3s to latch.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-3 py-2 border ${activeMixer === "drone" ? "border-emerald-400 text-emerald-200" : "border-neutral-700 text-neutral-300"}`}
            onClick={() => setActiveMixer("drone")}
          >
            Drone
          </button>
          <button
            className={`px-3 py-2 border ${activeMixer === "wave_start" ? "border-amber-400 text-amber-200" : "border-neutral-700 text-neutral-300"}`}
            onClick={() => setActiveMixer("wave_start")}
          >
            Wave Start
          </button>
        </div>
      </div>

      <label className="text-sm text-neutral-300 block">
        Waveform
        <select
          className="w-full mt-1 bg-neutral-900 border border-neutral-700 p-1"
          value={activeWaveform}
          onChange={(e) => updateWaveform(e.target.value as ResonanceOvertoneWaveform)}
        >
          <option value="sine">Sinus</option>
          <option value="square">Square</option>
          <option value="sawtooth">Saegezahn</option>
        </select>
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {DRONE_JI_OVERTONES.map((overtone) => (
          <label key={overtone.label} className="text-sm text-neutral-300">
            {overtone.label}
            <input
              className="w-full mt-1"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={activeMix[overtone.label] ?? 0}
              onChange={(e) => updateOvertone(overtone.label, parseFloat(e.target.value))}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
