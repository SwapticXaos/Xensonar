import type { MyceliumSnapshot } from "../topology/myceliumSnapshot";

export interface MyzelInterpreterMix {
  hybridBlend: number;
  weaveBlend: number;
  constellationBlend: number;
  driveAmount: number;
  driveResponse: number;
}

export interface MyzelInterpreterTargetDefinition {
  id: "drone" | "myzelLayer" | "drive" | "particles" | "waveStarts";
  label: string;
  description: string;
  scheduler: "continuous" | "step" | "event";
}

export const DEFAULT_MYZEL_INTERPRETER_MIX: MyzelInterpreterMix = {
  hybridBlend: 0.64,
  weaveBlend: 0.58,
  constellationBlend: 0.74,
  driveAmount: 0.22,
  driveResponse: 0.68,
};

export const MYZEL_INTERPRETER_TARGETS: MyzelInterpreterTargetDefinition[] = [
  { id: "drone", label: "Drone Bus", description: "Färbt Filter, Vibrato, Flanger und Formantwetness des Basissignals.", scheduler: "continuous" },
  { id: "myzelLayer", label: "Myzel Voice", description: "Leitet Grundton, Formanten und Obertöne aus dem Snapshot ab.", scheduler: "step" },
  { id: "drive", label: "Myzel Drive", description: "Nichtlineare Zuspitzung, reagiert auf Spannung, Flux und Helligkeit.", scheduler: "continuous" },
  { id: "particles", label: "Particle Accent", description: "Reservierter Target-Adapter für partikelbasierte Treffer- und Pingfärbung.", scheduler: "event" },
  { id: "waveStarts", label: "Wave Starter", description: "Reservierter Target-Adapter für Ripple- und Startimpulse.", scheduler: "event" },
];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const blendHz = (fromHz: number, toHz: number, mix: number, minHz: number, maxHz: number) => {
  const safeFrom = clamp(fromHz, minHz, maxHz);
  const safeTo = clamp(toHz, minHz, maxHz);
  if (safeFrom <= 0 || !Number.isFinite(safeFrom)) return safeTo;
  if (safeTo <= 0 || !Number.isFinite(safeTo)) return safeFrom;
  return clamp(safeFrom * Math.pow(safeTo / safeFrom, clamp(mix, 0, 1)), minHz, maxHz);
};

export const resolveAnchoredMyzelBaseHz = (
  anchoredY: number | null,
  fallbackY: number,
  freqFromY: (y: number) => number,
  minHz: number,
  maxHz: number,
) => clamp(freqFromY(anchoredY ?? fallbackY), minHz, maxHz);

export const resolveHybridMyzelBaseHz = (
  anchoredHz: number,
  snapshot: MyceliumSnapshot,
  minHz: number,
  maxHz: number,
) => {
  const dominantHz = snapshot.dominantFreq > 0
    ? clamp(snapshot.dominantFreq, minHz, maxHz)
    : anchoredHz;
  const energy = clamp(snapshot.maxEnergy, 0, 1);
  const coherence = clamp(snapshot.coherence ?? 0, 0, 1);
  const drift = clamp(snapshot.myceliumBallSpeed / 12, 0, 1);
  const pull = clamp(0.16 + energy * 0.26 + coherence * 0.18 + drift * 0.12, 0.14, 0.68);
  return blendHz(anchoredHz, dominantHz, pull, minHz, maxHz);
};

export const resolveInterpreterMyzelBaseHz = (
  anchoredY: number | null,
  fallbackY: number,
  snapshot: MyceliumSnapshot,
  freqFromY: (y: number) => number,
  minHz: number,
  maxHz: number,
  hybridBlend: number,
) => {
  const anchoredHz = resolveAnchoredMyzelBaseHz(anchoredY, fallbackY, freqFromY, minHz, maxHz);
  const hybridHz = resolveHybridMyzelBaseHz(anchoredHz, snapshot, minHz, maxHz);
  return blendHz(anchoredHz, hybridHz, hybridBlend, minHz, maxHz);
};
