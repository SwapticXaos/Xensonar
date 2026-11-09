/**
 * Grid tuning and quantize controls for Resonance room.
 * Extracted from ResonanceSynthControls for LOC discipline and single responsibility.
 */
import { CHURCH_MODES, type ChurchMode } from "../../../shared/tuning/modes";
import type { GridTuning, QuantizeSubdivision } from "../../../shared/tuning/grid";
import type { ResonanceState } from "../config/state";
import type { ResonanceUiSlice } from "../config/stateSlices";
import {
  QUANTIZE_MACRO_PRESETS,
  type QuantizeMacroKind,
  type QuantizeMacroPreset,
  findQuantizeMacroPresetForParams,
} from "../config/quantizePresets";

type QuantizeGroupKey = QuantizeMacroKind | "other";

const PRESETS_BY_KIND: Map<QuantizeGroupKey, QuantizeMacroPreset[]> = QUANTIZE_MACRO_PRESETS.reduce(
  (acc, preset) => {
    const kind: QuantizeGroupKey = preset.kind ?? "other";
    const existing = acc.get(kind);
    if (existing) {
      existing.push(preset);
    } else {
      acc.set(kind, [preset]);
    }
    return acc;
  },
  new Map<QuantizeGroupKey, QuantizeMacroPreset[]>(),
);

const KIND_ORDER: QuantizeGroupKey[] = [
  "stable",
  "groove",
  "swing",
  "push",
  "human",
  "drift",
  "polyrhythm",
  "bp",
  "other",
];

const KIND_LABELS: Record<QuantizeGroupKey, string> = {
  stable: "Stable & tight",
  groove: "Groove",
  swing: "Swing",
  push: "Push",
  human: "Humanized",
  drift: "Drift / wash",
  polyrhythm: "Polyrhythm",
  bp: "Bohlen–Pierce",
  other: "Other",
};

type Props = {
  ui: ResonanceUiSlice;
  updateNParams: (partial: Partial<ResonanceState>) => void;
  setChurchMode: (mode: ChurchMode) => void;
  /** Set global root (gridBase) from current cursor pitch — harmonic center follows cursor. */
  setGlobalRootFromCursor?: () => void;
};

export function ResonanceGridQuantizeControls({
  ui,
  updateNParams,
  setChurchMode,
  setGlobalRootFromCursor,
}: Props) {
  const currentMacroPreset = findQuantizeMacroPresetForParams({
    quantizeSubdivision: ui.groove.quantizeSubdivision,
    quantizeMicroTightness: ui.groove.quantizeMicroTightness,
    harmonyCascadeSteps: ui.groove.harmonyCascadeSteps,
  });

  const applyQuantizeMacroPreset = (preset: QuantizeMacroPreset) => {
    updateNParams({
      quantizeSubdivision: preset.quantizeSubdivision,
      quantizeMicroTightness: preset.quantizeMicroTightness,
      harmonyCascadeSteps: preset.harmonyCascadeSteps,
    });
  };

  const handleSurpriseGrooveClick = () => {
    const pool: QuantizeMacroPreset[] =
      (currentMacroPreset?.kind && PRESETS_BY_KIND.get(currentMacroPreset.kind)) || QUANTIZE_MACRO_PRESETS;
    if (pool.length === 0) return;
    const next = pool[Math.floor(Math.random() * pool.length)];
    applyQuantizeMacroPreset(next);
  };

  return (
    <>
      <label className="text-sm text-neutral-300">
        Grid Tuning
        <select
          className="w-full mt-1 bg-neutral-900 border border-neutral-700 p-1"
          value={ui.grid.gridTuning}
          onChange={(e) => updateNParams({ gridTuning: e.target.value as GridTuning })}
        >
          <option value="ji">JI</option>
          <option value="12edo">12-EDO</option>
          <option value="17edo">17-EDO</option>
          <option value="19edo">19-EDO</option>
          <option value="22edo">22-EDO</option>
          <option value="31edo">31-EDO</option>
          <option value="bp">BP</option>
        </select>
      </label>
      <label className="text-sm text-neutral-300">
        Church Mode (12-EDO)
        <select
          className="w-full mt-1 bg-neutral-900 border border-neutral-700 p-1"
          value={ui.agent.churchMode}
          onChange={(e) => setChurchMode(e.target.value as ChurchMode)}
        >
          {CHURCH_MODES.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-neutral-300">
        Quantize BPM
        <input
          className="w-full mt-1"
          type="range"
          min="40"
          max="220"
          step="1"
          value={ui.quantize.quantizeBpm}
          onChange={(e) => updateNParams({ quantizeBpm: parseInt(e.target.value, 10) })}
        />
      </label>
      <button
        className={`px-3 py-2 border ${ui.quantize.quantizeOn ? "border-emerald-400 text-emerald-200" : "border-neutral-600 text-neutral-200"}`}
        onClick={() => updateNParams({ quantizeOn: !ui.quantize.quantizeOn })}
      >
        Quantize {ui.quantize.quantizeOn ? "ON" : "OFF"}
      </button>
      <button
        className={`px-3 py-2 border ${ui.grid.gridOn ? "border-blue-400 text-blue-200" : "border-neutral-600 text-neutral-200"}`}
        onClick={() => updateNParams({ gridOn: !ui.grid.gridOn })}
      >
        Grid {ui.grid.gridOn ? "ON" : "OFF"}
      </button>
      <button
        className={`px-3 py-2 border ${ui.grid.lockCursorToGrid ? "border-purple-400 text-purple-200" : "border-neutral-600 text-neutral-200"}`}
        onClick={() => updateNParams({ lockCursorToGrid: !ui.grid.lockCursorToGrid })}
      >
        Grid Lock {ui.grid.lockCursorToGrid ? "ON" : "OFF"}
      </button>
      {setGlobalRootFromCursor && (
        <button
          className="px-3 py-2 border border-amber-500/70 text-amber-200 hover:bg-amber-500/20 transition-colors"
          onClick={setGlobalRootFromCursor}
          title="Set the current cursor pitch as the global root (grid base). All rooms share this harmonic center."
        >
          Set as root
        </button>
      )}
      <label className="text-sm text-neutral-300">
        Quantize Subdivision
        <select
          className="w-full mt-1 bg-neutral-900 border border-neutral-700 p-1"
          value={ui.quantize.quantizeSubdivision}
          onChange={(e) => updateNParams({ quantizeSubdivision: e.target.value as QuantizeSubdivision })}
        >
          <option value="16">16</option>
          <option value="32">32</option>
          <option value="64">64</option>
        </select>
      </label>
      <label className="text-sm text-neutral-300">
        Micro Tightness
        <input
          className="w-full mt-1"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={ui.groove.quantizeMicroTightness}
          onChange={(e) => updateNParams({ quantizeMicroTightness: parseFloat(e.target.value) })}
        />
      </label>
      <label className="text-sm text-neutral-300">
        Groove preset
        <select
          className="w-full mt-1 bg-neutral-900 border border-neutral-700 p-1"
          value={
            currentMacroPreset?.id ?? ""
          }
          onChange={(e) => {
            const id = e.target.value;
            const preset = QUANTIZE_MACRO_PRESETS.find((p) => p.id === id);
            if (preset) {
              applyQuantizeMacroPreset(preset);
            }
          }}
        >
          <option value="">—</option>
          {KIND_ORDER.map((kind) => {
            const presetsForKind = PRESETS_BY_KIND.get(kind);
            if (!presetsForKind || presetsForKind.length === 0) {
              return null;
            }
            return (
              <optgroup key={kind} label={KIND_LABELS[kind]}>
                {presetsForKind.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </label>
      <p className="mt-1 text-xs text-neutral-400">
        {currentMacroPreset
          ? `${KIND_LABELS[currentMacroPreset.kind ?? "other"]} · ${currentMacroPreset.label}`
          : "Custom groove (adjust sliders or pick a preset)"}
      </p>
      <button
        type="button"
        className="mt-1 px-2 py-1 text-xs border border-neutral-700 text-neutral-200 hover:border-emerald-400 hover:text-emerald-200 transition-colors"
        onClick={handleSurpriseGrooveClick}
        title="Pick a random groove preset, biased toward the current groove family."
      >
        Surprise groove
      </button>
    </>
  );
}
