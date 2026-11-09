import {
  resolveCarrierIntegralMachine,
  type CarrierIntegralBodySourceMode,
  type CarrierIntegralMachineId,
} from "../../integral";

export function bodySourceLabel(mode: CarrierIntegralBodySourceMode) {
  switch (mode) {
    case "raw_oscillator":
      return "Roh-Oszillator";
    case "harmonic_xplore":
      return "HarmonicXplorE Direkt";
    case "spektral_synthese":
      return "SpektralSynthese";
    case "neutral_pigment":
      return "Neutral-Pigment";
    case "audio_donor":
      return "Audio-Donor";
    case "legacy_direct":
      return "5.69 Legacy";
    default:
      return "Archivquelle";
  }
}

export type CarrierIntegralMachineUi = {
  glyph: string;
  pulse: string;
  chip: string;
  active: string;
  label: string;
};

export const MACHINE_UI: Partial<
  Record<CarrierIntegralMachineId, CarrierIntegralMachineUi>
> = {
  "raw-darkpsy-oscillator": {
    glyph: "◉",
    pulse: "Dieter",
    chip: "border-rose-600/55 text-rose-100 bg-rose-950/18",
    active:
      "border-rose-400 bg-rose-500/14 shadow-[0_0_18px_rgba(244,63,94,0.08)]",
    label: "Roh-Oszillator",
  },
  "harmonic-xplore-direct-carrier": {
    glyph: "✶",
    pulse: "HarmonicXplorE",
    chip: "border-lime-600/55 text-lime-100 bg-lime-950/18",
    active:
      "border-lime-400 bg-lime-500/14 shadow-[0_0_18px_rgba(163,230,53,0.08)]",
    label: "Ratio-Engine",
  },
  "spektral-synthese-body": {
    glyph: "✦",
    pulse: "SpektralSynthese",
    chip: "border-indigo-600/55 text-indigo-100 bg-indigo-950/18",
    active:
      "border-indigo-400 bg-indigo-500/14 shadow-[0_0_18px_rgba(129,140,248,0.08)]",
    label: "Bildkörper",
  },
  "legacy-supernote-5.69": {
    glyph: "5·69",
    pulse: "Legacy",
    chip: "border-amber-600/55 text-amber-100 bg-amber-950/18",
    active:
      "border-amber-400 bg-amber-500/14 shadow-[0_0_18px_rgba(245,158,11,0.08)]",
    label: "5.69 Legacy",
  },
  "branch-a-line-traffic": {
    glyph: "A",
    pulse: "Antonia",
    chip: "border-cyan-600/55 text-cyan-100 bg-cyan-950/18",
    active:
      "border-cyan-400 bg-cyan-500/14 shadow-[0_0_18px_rgba(34,211,238,0.08)]",
    label: "Antonia",
  },
  "branch-b573-synth-window": {
    glyph: "▥",
    pulse: "Bert",
    chip: "border-violet-600/55 text-violet-100 bg-violet-950/18",
    active:
      "border-violet-400 bg-violet-500/14 shadow-[0_0_18px_rgba(167,139,250,0.08)]",
    label: "Fenster / Prisma",
  },
  "branch-c-interval-body": {
    glyph: "◒",
    pulse: "Cecilia",
    chip: "border-emerald-600/55 text-emerald-100 bg-emerald-950/18",
    active:
      "border-emerald-400 bg-emerald-500/14 shadow-[0_0_18px_rgba(16,185,129,0.08)]",
    label: "Vocal / Polytrace",
  }
};

export function machineUi(
  machineId: CarrierIntegralMachineId,
): CarrierIntegralMachineUi {
  return (
    MACHINE_UI[machineId] ?? {
      glyph: "◇",
      pulse: "Gerät",
      chip: "border-neutral-700 text-neutral-200 bg-neutral-950/40",
      active: "border-neutral-500 bg-neutral-800/60",
      label: "Integralgerät",
    }
  );
}

export function prismDisplayName(machineId: CarrierIntegralMachineId): string {
  switch (machineId) {
    case "raw-darkpsy-oscillator":
      return "Pure Dieter";
    case "harmonic-xplore-direct-carrier":
      return "HarmonicXplorE";
    case "spektral-synthese-body":
      return "SpektralSynthese";
    case "legacy-supernote-5.69":
      return "5.69 Legacy";
    case "branch-a-line-traffic":
      return "Antonia";
    case "branch-b573-synth-window":
      return "Bert";
    case "branch-c-interval-body":
      return "Cecilia";
    default:
      return resolveCarrierIntegralMachine(machineId).shortLabel;
  }
}

export function exposesActiveBodySourceChoice(
  _machineId: CarrierIntegralMachineId,
): boolean {
  return false;
}

export function visibleBodySourceModes(
  _machineId: CarrierIntegralMachineId,
  modes: CarrierIntegralBodySourceMode[],
): CarrierIntegralBodySourceMode[] {
  return modes;
}

export function bodySourceScopeHint(machineId: CarrierIntegralMachineId): string {
  if (machineId === "harmonic-xplore-direct-carrier") {
    return "HarmonicXplorE · direkte Verhältnis-Engine";
  }
  if (machineId === "spektral-synthese-body") {
    return "SpektralSynthese · Descriptor-Körper";
  }
  if (
    machineId === "branch-a-line-traffic" ||
    machineId === "branch-b573-synth-window" ||
    machineId === "branch-c-interval-body"
  ) {
    return "Core-Hörweise: keine Timbre-Wahl ausstellen";
  }
  return "Körperquelle";
}

export function machinePreviewGain(machineId: CarrierIntegralMachineId, previewVolume: number): number {
  const balance = machineId === "raw-darkpsy-oscillator" ? 0.16 : machineId === "harmonic-xplore-direct-carrier" ? 0.64 : machineId === "spektral-synthese-body" ? 0.72 : 0.92;
  return Math.max(0.04, Math.min(1, previewVolume * balance));
}
