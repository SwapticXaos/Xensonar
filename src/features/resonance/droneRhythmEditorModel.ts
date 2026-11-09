import {
  getDroneRhythmStepPattern,
  getDroneRhythmSubdivisionLabel,
} from "./droneRhythmPatterns";

export type DroneRhythmEditorDraft = {
  mode: string;
  steps: number[];
  subdivisionLabel: string;
};

export function createDroneRhythmEditorDraft(mode: string, customSteps?: readonly number[] | null): DroneRhythmEditorDraft {
  return {
    mode,
    steps: getDroneRhythmStepPattern(mode, customSteps),
    subdivisionLabel: getDroneRhythmSubdivisionLabel(mode),
  };
}
