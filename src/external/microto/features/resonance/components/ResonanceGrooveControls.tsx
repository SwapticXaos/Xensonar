/**
 * Groove/sequencer control panel for Resonance room: drum/bass toggles and patterns/volumes,
 * harmony cascade steps, swarm profile and count. Keeps ResonanceRoom focused; vision §8 clearer modules.
 */

import { BASS_PATTERNS, DRUM_PATTERNS } from "../config/constants";
import { type BassPattern, type DrumPattern } from "../config/types";
import { type ResonanceState } from "../config/state";
import {
  QUANTIZE_MACRO_PRESETS,
  findQuantizeMacroPresetForParams,
} from "../config/quantizePresets";
import type { ResonanceUiSlice } from "../config/stateSlices";

type ResonanceGrooveControlsProps = {
  ui: ResonanceUiSlice;
  updateNParams: (partial: Partial<ResonanceState>) => void;
  setSwarmProfile: (profile: "tight_groove" | "wild_orbit") => void;
  setSwarmCount: (count: number) => void;
};

export function ResonanceGrooveControls({
  ui,
  updateNParams,
  setSwarmProfile,
  setSwarmCount,
}: ResonanceGrooveControlsProps) {
  const pickRandom = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

  const currentMacro = ui.quantize.quantizeOn
    ? findQuantizeMacroPresetForParams({
        quantizeSubdivision: ui.groove.quantizeSubdivision,
        quantizeMicroTightness: ui.groove.quantizeMicroTightness,
        harmonyCascadeSteps: ui.groove.harmonyCascadeSteps,
      })
    : null;

  const handleSurpriseGrooveClick = () => {
    const drumPreset = pickRandom(DRUM_PATTERNS).value as DrumPattern;
    const bassPreset = pickRandom(BASS_PATTERNS).value as BassPattern;
    const macro = pickRandom(QUANTIZE_MACRO_PRESETS);

    const nextPartial: Partial<ResonanceState> = {
      drumActive: true,
      bassActive: true,
      drumPattern: drumPreset,
      bassPattern: bassPreset,
      drumVolume: 0.3 + Math.random() * 0.4,
      bassVolume: 0.4 + Math.random() * 0.3,
      quantizeOn: true,
      quantizeSubdivision: macro.quantizeSubdivision,
      quantizeMicroTightness: macro.quantizeMicroTightness,
      harmonyCascadeSteps: macro.harmonyCascadeSteps,
    };

    updateNParams(nextPartial);

    const nextProfile: "tight_groove" | "wild_orbit" = Math.random() < 0.5 ? "tight_groove" : "wild_orbit";
    setSwarmProfile(nextProfile);

    const nextSwarmCount = 4 + Math.floor(Math.random() * (48 - 4 + 1));
    setSwarmCount(nextSwarmCount);
  };

  return (
    <div className="border border-neutral-800 bg-black p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <button
        className="px-3 py-2 border border-purple-400 text-purple-200"
        onClick={handleSurpriseGrooveClick}
      >
        Surprise Groove
      </button>

      <div className="text-xs text-neutral-300 flex items-center">
        <span className="mr-1 font-semibold text-neutral-200">Groove preset:</span>
        {ui.quantize.quantizeOn ? (
          <span>{currentMacro ? currentMacro.label : "Benutzerdefiniert"}</span>
        ) : (
          <span>Frei</span>
        )}
      </div>

      <button
        className={`px-3 py-2 border ${ui.groove.drumActive ? "border-amber-400 text-amber-200" : "border-neutral-600 text-neutral-200"}`}
        onClick={() => updateNParams({ drumActive: !ui.groove.drumActive })}
      >
        Drum {ui.groove.drumActive ? "ON" : "OFF"}
      </button>

      <label className="text-sm text-neutral-300">
        Drum Pattern
        <select
          className="w-full mt-1 bg-neutral-900 border border-neutral-700 p-1"
          value={ui.groove.drumPattern}
          onChange={(e) => updateNParams({ drumPattern: e.target.value as DrumPattern })}
        >
          {DRUM_PATTERNS.map((pattern) => (
            <option key={pattern.value} value={pattern.value}>
              {pattern.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm text-neutral-300">
        Drum Volume
        <input
          className="w-full mt-1"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={ui.groove.drumVolume}
          onChange={(e) => updateNParams({ drumVolume: parseFloat(e.target.value) })}
        />
      </label>

      <button
        className={`px-3 py-2 border ${ui.groove.bassActive ? "border-cyan-400 text-cyan-200" : "border-neutral-600 text-neutral-200"}`}
        onClick={() => updateNParams({ bassActive: !ui.groove.bassActive })}
      >
        Bass {ui.groove.bassActive ? "ON" : "OFF"}
      </button>

      <label className="text-sm text-neutral-300">
        Bass Pattern
        <select
          className="w-full mt-1 bg-neutral-900 border border-neutral-700 p-1"
          value={ui.groove.bassPattern}
          onChange={(e) => updateNParams({ bassPattern: e.target.value as BassPattern })}
        >
          {BASS_PATTERNS.map((pattern) => (
            <option key={pattern.value} value={pattern.value}>
              {pattern.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm text-neutral-300">
        Bass Volume
        <input
          className="w-full mt-1"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={ui.groove.bassVolume}
          onChange={(e) => updateNParams({ bassVolume: parseFloat(e.target.value) })}
        />
      </label>

      <label className="text-sm text-neutral-300">
        Harmony Cascade Steps
        <input
          className="w-full mt-1"
          type="range"
          min="0"
          max="12"
          step="1"
          value={ui.groove.harmonyCascadeSteps}
          onChange={(e) => updateNParams({ harmonyCascadeSteps: parseInt(e.target.value, 10) })}
        />
      </label>

      <label className="text-sm text-neutral-300">
        Swarm Profile
        <select
          className="w-full mt-1 bg-neutral-900 border border-neutral-700 p-1"
          value={ui.agent.swarmProfile}
          onChange={(e) => setSwarmProfile(e.target.value as "tight_groove" | "wild_orbit")}
        >
          <option value="wild_orbit">Wild Orbit</option>
          <option value="tight_groove">Tight Groove</option>
        </select>
      </label>

      <label className="text-sm text-neutral-300">
        Swarm Count
        <input
          className="w-full mt-1"
          type="range"
          min="4"
          max="48"
          step="1"
          value={ui.agent.swarmCount}
          onChange={(e) => setSwarmCount(parseInt(e.target.value, 10))}
        />
      </label>
    </div>
  );
}
