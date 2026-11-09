import type { ControlSchedulerMetrics } from "../..//resonance/controlScheduler";
import type { TransientRuntimeSnapshot } from "../..//resonance/transientRuntime";
import type { SchwarmMaterial } from "../..//resonance/schwarmdeuter";

export const SCHWARM_MATERIAL_OPTIONS: Array<{ value: SchwarmMaterial; label: string }> = [
  { value: "fungus", label: "Fungus" },
  { value: "resin", label: "Resin" },
  { value: "dust", label: "Dust" },
  { value: "glass", label: "Glass" },
  { value: "metal", label: "Metal" },
  { value: "plasma", label: "Plasma" },
];

export const getDefaultCollectiveMemoryUi = () => ({
  drone: { enabled: true, send: 0.32, wet: 0.18 },
  particles: { enabled: true, send: 0.16, wet: 0.08 },
  waves: { enabled: true, send: 0.14, wet: 0.07 },
  myzel: { enabled: true, send: 0.42, wet: 0.22 },
});

export const getDefaultPsychedelicSpiralUi = () => ({
  drive: 0.44,
  color: 0.6,
  motion: 0.54,
  feedback: 0.3,
  bloom: 0.48,
  mix: 0.86,
  stereoWidth: 0.84,
  outputGain: 0.9,
  drone: { enabled: true, send: 0.34 },
  particles: { enabled: true, send: 0.2 },
  waves: { enabled: true, send: 0.28 },
  myzel: { enabled: true, send: 0.38 },
});

export const getDefaultPsychedelicSpiralMonitor = () => ({
  drive: 0.44,
  color: 0.6,
  motion: 0.54,
  feedback: 0.3,
  bloom: 0.48,
  mix: 0.86,
  width: 0.84,
});

export const getDefaultEnterHoldPsyFxUi = () => ({
  depth: 0.68,
  color: 0.56,
  flicker: 0.72,
  mix: 0.5,
  bassMotion: 0.44,
  outputGain: 0.92,
  waveSend: 0.72,
  bassSend: 0.48,
  bassLink: true,
});

export const getDefaultTransientDriveUi = () => ({
  drone: { enabled: false, send: 0 },
  particles: { enabled: true, send: 0.22 },
  waves: { enabled: true, send: 0.28 },
  myzel: { enabled: false, send: 0.1 },
});

export const getDefaultSchwarmUi = () => ({
  amount: 0.58,
  interpretiveBias: 0.72,
  sensitivity: 0.66,
  memorySeconds: 1.6,
  densityBias: 0.5,
  weave: 0.56,
  material: "fungus" as SchwarmMaterial,
  updateMs: 120,
  drone: { enabled: false, send: 0 },
  particles: { enabled: true, send: 0.18 },
  waves: { enabled: false, send: 0.06 },
  myzel: { enabled: false, send: 0.04 },
});

export const getDefaultControlPerfMonitor = (): ControlSchedulerMetrics => ({
  avgFrameMs: 16.7,
  avgWorkMs: 0,
  workRatio: 0,
  taskRuns: 0,
  taskCount: 0,
});

export const getDefaultTransientRuntimeMonitor = (): TransientRuntimeSnapshot => ({
  activeVoices: 0,
  executionHandles: 0,
  policyReservations: 0,
  releaseTimers: 0,
  hardLimit: 84,
  load: 0,
  droppedVoices: 0,
  reducedEvents: 0,
  gatedSends: 0,
  bySource: { particle: 0, wave: 0, drum: 0, other: 0 },
});

export type CollectiveMemoryUi = ReturnType<typeof getDefaultCollectiveMemoryUi>;
export type CollectiveMemorySourceKey = keyof CollectiveMemoryUi;
export type CollectiveMemorySourcePatch = Partial<CollectiveMemoryUi[CollectiveMemorySourceKey]>;

export type PsychedelicSpiralUi = ReturnType<typeof getDefaultPsychedelicSpiralUi>;
export type PsychedelicSpiralSourceKey = Extract<keyof PsychedelicSpiralUi, "drone" | "particles" | "waves" | "myzel">;
export type PsychedelicSpiralSourcePatch = Partial<PsychedelicSpiralUi[PsychedelicSpiralSourceKey]>;

export type EnterHoldPsyFxUi = ReturnType<typeof getDefaultEnterHoldPsyFxUi>;

export type SchwarmUi = ReturnType<typeof getDefaultSchwarmUi>;
export type SchwarmSourceKey = Extract<keyof SchwarmUi, "drone" | "particles" | "waves" | "myzel">;
export type SchwarmSourcePatch = Partial<SchwarmUi[SchwarmSourceKey]>;

export type PsychedelicSpiralMonitor = ReturnType<typeof getDefaultPsychedelicSpiralMonitor>;
