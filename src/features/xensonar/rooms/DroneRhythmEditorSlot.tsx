import { useEffect, useMemo, useState } from "react";
import {
  DRONE_RHYTHM_PRESETS,
  getDroneRhythmStepPattern,
  normalizeDroneRhythmSteps,
  type DroneRhythmMode,
} from "../../resonance/droneRhythmPatterns";
import { createDroneRhythmEditorDraft } from "../../resonance/droneRhythmEditorModel";
import { ResonanceInlineEditorSlot } from "./ResonanceInlineEditorSlot";
import { SegmentPatternGrid } from "./SegmentPatternGrid";

type DroneRhythmEditorSlotProps = {
  currentMode: string;
  currentCustomSteps: number[];
  open: boolean;
  onToggle: () => void;
  onSelectMode: (mode: DroneRhythmMode) => void;
  onChangeCustomSteps: (steps: number[]) => void;
};

export function DroneRhythmEditorSlot({
  currentMode,
  currentCustomSteps,
  open,
  onToggle,
  onSelectMode,
  onChangeCustomSteps,
}: DroneRhythmEditorSlotProps) {
  const [draftMode, setDraftMode] = useState(currentMode);
  const [draftCustomSteps, setDraftCustomSteps] = useState<number[]>(normalizeDroneRhythmSteps(currentCustomSteps));

  useEffect(() => {
    setDraftMode(currentMode);
  }, [currentMode]);

  useEffect(() => {
    setDraftCustomSteps(normalizeDroneRhythmSteps(currentCustomSteps));
  }, [currentCustomSteps]);

  const draft = useMemo(() => createDroneRhythmEditorDraft(draftMode, draftCustomSteps), [draftMode, draftCustomSteps]);

  return (
    <ResonanceInlineEditorSlot title="Drone-Werkbank öffnen" open={open} onToggle={onToggle}>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DRONE_RHYTHM_PRESETS.map((preset) => {
            const isActive = draft.mode === preset.mode;
            return (
              <button
                key={preset.mode}
                type="button"
                onClick={() => {
                  setDraftMode(preset.mode);
                  if (preset.mode !== "Custom") {
                    setDraftCustomSteps(getDroneRhythmStepPattern(preset.mode));
                  }
                  onSelectMode(preset.mode);
                }}
                className={`rounded border px-2 py-2 text-xs transition ${
                  isActive
                    ? "border-violet-400 bg-violet-700/40 text-violet-100"
                    : "border-neutral-700 bg-neutral-950 text-neutral-300 hover:bg-neutral-900"
                }`}
                title={preset.description}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[11px] text-neutral-400">
          <span>16er Raster</span>
          <span>{draft.subdivisionLabel}</span>
        </div>
        <SegmentPatternGrid
          label="Drone Rhythmus"
          steps={draft.steps}
          tone="neutral"
          onChange={(steps) => {
            const normalized = normalizeDroneRhythmSteps(steps);
            setDraftMode("Custom");
            setDraftCustomSteps(normalized);
            onChangeCustomSteps(normalized);
            onSelectMode("Custom");
          }}
        />
      </div>
    </ResonanceInlineEditorSlot>
  );
}
