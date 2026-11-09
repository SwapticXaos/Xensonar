export const MIN_DRONE_RHYTHM_BPM = 40;
export const MAX_DRONE_RHYTHM_BPM = 240;

export type DroneRhythmMode = "Off" | "Puls 1/4" | "Puls 1/8" | "Puls 1/16" | "Synkope" | "Custom";

export type DroneRhythmPreset = {
  mode: DroneRhythmMode;
  label: string;
  description: string;
};

export const DRONE_RHYTHM_PRESETS: DroneRhythmPreset[] = [
  { mode: "Off", label: "Aus", description: "Durchgehend offen" },
  { mode: "Puls 1/4", label: "Langsamer Puls", description: "Ein Impuls pro Beat" },
  { mode: "Puls 1/8", label: "Treibender Puls", description: "Zwei Impulse pro Beat" },
  { mode: "Puls 1/16", label: "Stottern", description: "Vier Impulse pro Beat" },
  { mode: "Synkope", label: "Synkope", description: "Versetztes 16tel-Pattern" },
  { mode: "Custom", label: "Custom", description: "Eigenes 16tel-Pattern" },
];

const SYNCOPE_PATTERN = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0] as const;

export function normalizeDroneRhythmSteps(steps: readonly number[] | null | undefined): number[] {
  const safe = Array.from({ length: 16 }, (_, index) => (steps?.[index] ? 1 : 0));
  return safe.some(Boolean) ? safe : [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}

export function getDroneRhythmStepPattern(mode: string, customSteps?: readonly number[] | null): number[] {
  if (mode === "Off") {
    return Array.from({ length: 16 }, () => 1);
  }
  if (mode === "Puls 1/4") {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
  }
  if (mode === "Puls 1/8") {
    return [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
  }
  if (mode === "Puls 1/16") {
    return Array.from({ length: 16 }, () => 1);
  }
  if (mode === "Synkope") {
    return Array.from(SYNCOPE_PATTERN);
  }
  if (mode === "Custom") {
    return normalizeDroneRhythmSteps(customSteps);
  }
  return Array.from({ length: 16 }, () => 1);
}

export function getDroneRhythmSubdivisionLabel(mode: string): string {
  if (mode === "Puls 1/4") {
    return "1/4";
  }
  if (mode === "Puls 1/8") {
    return "1/8";
  }
  if (mode === "Puls 1/16" || mode === "Synkope" || mode === "Custom") {
    return "1/16";
  }
  return "durchgehend";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getDroneRhythmGain(mode: string, bpm: number, time: number, customSteps?: readonly number[] | null): number {
  if (mode === "Off") {
    return 1;
  }

  const tempo = clamp(bpm || 120, MIN_DRONE_RHYTHM_BPM, MAX_DRONE_RHYTHM_BPM);
  const beatLen = 60 / tempo;
  const step16 = beatLen / 4;

  if (mode === "Puls 1/4") {
    return Math.max(0, 1 - Math.pow((time % beatLen) / beatLen, 1.5));
  }

  if (mode === "Puls 1/8") {
    const step8 = beatLen / 2;
    return Math.max(0, 1 - Math.pow((time % step8) / step8, 1.2));
  }

  if (mode === "Puls 1/16") {
    return Math.max(0, 1 - (time % step16) / step16);
  }

  if (mode === "Synkope" || mode === "Custom") {
    const steps = mode === "Custom" ? normalizeDroneRhythmSteps(customSteps) : Array.from(SYNCOPE_PATTERN);
    const absoluteStep = Math.floor(time / step16);
    const step = absoluteStep % 16;
    const phase = (time % step16) / step16;
    return (steps[step] ?? 0) * Math.max(0, 1 - Math.pow(phase, 0.7));
  }

  return 1;
}
