import type { StableLaneSabTransportReadinessSnapshot } from "../rootFollow/rootFollowSharedArrayBufferReadiness";
import { PERFORMANCE_CRISIS_PRESETS } from "./performanceCrisisPresetRegistry";
import type {
  CrisisQuantizationGridSelection,
  CrisisQuantizationModeSelection,
  ParticleLoadReductionSelection,
  PerformanceCrisisPresetId,
} from "./performanceCrisisTypes";

export type PerformanceCrisisTab = "granular" | "particles" | "wave";

export const TAB_LABELS: Record<PerformanceCrisisTab, string> = {
  granular: "Granular / Root-Follow",
  particles: "Partikel",
  wave: "Wellenstarter",
};

export const QUANTIZATION_MODE_OPTIONS: readonly {
  id: Exclude<CrisisQuantizationModeSelection, "preset">;
  label: string;
}[] = [
  { id: "off", label: "Aus" },
  { id: "fallback", label: "Als Fallback" },
  { id: "strict", label: "Strikt" },
] as const;

export const QUANTIZATION_GRID_OPTIONS: readonly {
  id: Exclude<CrisisQuantizationGridSelection, "preset">;
  label: string;
}[] = [
  { id: "16", label: "16tel" },
  { id: "32", label: "32stel" },
  { id: "64", label: "64stel" },
  { id: "other", label: "other" },
] as const;

export function formatQuantizationGridLabel(grid: CrisisQuantizationGridSelection) {
  if (grid === "16") return "16tel";
  if (grid === "32") return "32stel";
  if (grid === "64") return "64stel";
  if (grid === "other") return "other";
  return "nicht gesetzt";
}

export const coerceQuantizationModeValue = (
  mode: CrisisQuantizationModeSelection,
): Exclude<CrisisQuantizationModeSelection, "preset"> =>
  mode === "preset" ? "fallback" : mode;

export const coerceQuantizationGridValue = (
  grid: CrisisQuantizationGridSelection,
): Exclude<CrisisQuantizationGridSelection, "preset"> =>
  grid === "preset" ? "16" : grid;

export const clampSegmentsPerBar = (value: number) =>
  Math.max(1, Math.min(256, Number.isFinite(value) ? Math.round(value) : 32));

export function formatSabReadinessValue(
  snapshot: StableLaneSabTransportReadinessSnapshot | null,
  stressComparison: any,
) {
  const readiness =
    snapshot?.stableLaneSabTransportReadiness ??
    stressComparison?.workletStableLaneSabTransportReadiness ??
    "unknown";
  const reason =
    snapshot?.stableLaneSabTransportReadinessReason ??
    stressComparison?.workletStableLaneSabTransportReadinessReason ??
    "runtime-probe-pending";
  const singleFileBlocked =
    snapshot?.stableLaneSabTransportSingleFileHtmlLikelyBlocked ??
    stressComparison?.workletStableLaneSabTransportSingleFileHtmlLikelyBlocked ??
    false;
  return `${readiness} · ${reason}${singleFileBlocked ? " · singlefile/html blockiert" : ""}`;
}

export const PARTICLE_CRISIS_MODE_OPTIONS = [
  { id: "preset", label: "Stilvorlage übernimmt" },
  { id: "off", label: "Aus / roh" },
  { id: "quantization-loosening", label: "Quantisierungs-Lockerung" },
  { id: "quantization-pyramid", label: "Quantisierungs-Pyramide" },
  { id: "quantization-liberation", label: "Quantisierungs-Befreiung" },
  { id: "stability-first", label: "Stabilität zuerst" },
] as const;

export const PARTICLE_AMBIENT_MOTION_OPTIONS = [
  { id: "preset", label: "Stilvorlage übernimmt" },
  { id: "off", label: "Bewegung nicht dämpfen" },
  { id: "gentle", label: "Sanft zäher Schwarm" },
  { id: "viscous", label: "Deutlich zähes Medium" },
] as const;

export const PARTICLE_LOAD_REDUCTION_OPTIONS: readonly {
  id: ParticleLoadReductionSelection;
  label: string;
}[] = [
  { id: "preset", label: "Stilvorlage übernimmt" },
  { id: "off", label: "Keine Dichte-Senkung" },
  { id: "soft-taper", label: "Sanfte Dichtekurve" },
  { id: "adaptive-thin", label: "Adaptive Ausdünnung" },
  { id: "emergency-thin", label: "Notbremse" },
] as const;

export function formatNumber(value: unknown, digits = 0) {
  const numeric =
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  return numeric.toFixed(digits);
}

export function formatOptionalNumber(value: unknown, digits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

export function formatStableLaneState(args: {
  proven?: unknown;
  reliefReady?: unknown;
  warmupReason?: unknown;
  fallbackReason?: unknown;
}) {
  if (args.reliefReady === true) return "sustained / relief-ready";
  if (args.proven === true) {
    return typeof args.warmupReason === "string" && args.warmupReason
      ? `warmup: ${args.warmupReason}`
      : "proven / warmup";
  }
  if (typeof args.fallbackReason === "string" && args.fallbackReason) {
    return `fallback: ${args.fallbackReason}`;
  }
  return "kein Proof im Fenster";
}


export function formatWaveStarterPresetOptionLabel(
  presetId: PerformanceCrisisPresetId,
) {
  const preset = PERFORMANCE_CRISIS_PRESETS[presetId];
  const admission = preset.waveStarter.admissionMode;
  const admissionLabel =
    admission === "open"
      ? "offener Slot"
      : admission === "defer"
        ? "Defer-Slot"
        : "druckgegated";
  return `${preset.label} · Wellenstarter: ${admissionLabel}`;
}

