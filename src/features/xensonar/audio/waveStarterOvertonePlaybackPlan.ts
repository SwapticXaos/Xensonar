import { DRONE_JI_OVERTONES, type WaveOvertoneWaveform } from "../domain/instrumentData";
import { clamp, type ActiveWaveOvertone } from "../rooms/resonanceRuntimeMath";

export type WaveStarterOvertoneMode = "direct" | "arp" | "hybrid";

export type WaveStarterOvertoneToneSpec = {
  toneFreq: number;
  delay: number;
  duration: number;
  waveform: WaveOvertoneWaveform;
  gain: number;
  resonance: number;
  cutoffHz: number;
  prominence: number;
};

export type WaveStarterOvertonePlaybackPlan = {
  activeMix: ActiveWaveOvertone[];
  directTones: WaveStarterOvertoneToneSpec[];
  enqueueArp: boolean;
};

export type ResolveWaveStarterOvertonePlaybackPlanArgs = {
  baseFreq: number;
  baseVolume: number;
  isSector: boolean;
  enabled: boolean;
  overtoneAmounts: Partial<Record<string, number>>;
  waveform: WaveOvertoneWaveform;
  mode: WaveStarterOvertoneMode;
  globalLevel: number;
};

export function resolveWaveStarterOvertonePlaybackPlan({
  baseFreq,
  baseVolume,
  isSector,
  enabled,
  overtoneAmounts,
  waveform,
  mode,
  globalLevel,
}: ResolveWaveStarterOvertonePlaybackPlanArgs): WaveStarterOvertonePlaybackPlan {
  if (!enabled) {
    return { activeMix: [], directTones: [], enqueueArp: false };
  }

  const activeMix = DRONE_JI_OVERTONES
    .map((node) => ({ node, amount: clamp(overtoneAmounts[node.label] ?? 0, 0, 1) }))
    .filter((entry) => entry.amount > 0.001);

  const strongestFirst = [...activeMix].sort((a, b) => b.amount - a.amount || a.node.ratio - b.node.ratio);
  const directMix = mode === "hybrid" ? strongestFirst.slice(0, 2) : mode === "direct" ? strongestFirst : [];
  const normalizer = directMix.length > 0 ? 1 / Math.sqrt(directMix.length) : 1;
  const directScalar = mode === "hybrid" ? 0.46 : 1;
  const overtoneGlobalLevel = clamp(globalLevel, 0, 2.5);
  const duration = isSector ? 0.46 : 0.38;

  const directTones = directMix.map(({ node, amount }) => ({
    toneFreq: baseFreq * node.ratio,
    delay: 0,
    duration,
    waveform,
    gain: baseVolume * amount * 0.34 * normalizer * directScalar * overtoneGlobalLevel,
    resonance: 1.6,
    cutoffHz: 2200,
    prominence: 0.18 + amount * 0.42,
  }));

  return {
    activeMix,
    directTones,
    enqueueArp: activeMix.length > 0,
  };
}
