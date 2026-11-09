/**
 * Agent/particle preset → one-shot tone mapping (vision §6 audio engine modules).
 * Single place for "what sound does this preset make"; used by orchestrator and
 * simulation. Keeps resonance domain clear and orchestrator thin.
 * Tone plan data lives in resonanceAgentTonePlans.ts (data/logic separation).
 */

import type { PlayOneShotTone } from "../audio";
import type { ParticlePreset } from "./config/types";
import {
  BASE_TONE_PLANS,
  SECTOR_DIRECTION_PROFILES,
  type NexusAgentToneDirection,
  type NexusAgentTonePlanEvent,
} from "./resonanceAgentTonePlans";

export type NexusAgentToneSource = "ripple" | "sector" | "collapse";
export type { NexusAgentToneDirection };
export type NexusAgentToneCue = {
  source?: NexusAgentToneSource;
  direction?: NexusAgentToneDirection;
  persistent?: boolean;
  density?: number;
  constellationIndex?: number;
  autonomy?: number;
};
export type NexusAgentToneCueInput = NexusAgentToneCue | NexusAgentToneSource;

type NexusAgentToneEvent = {
  freq: number;
  offsetSeconds: number;
  durationSeconds: number;
  type: OscillatorType;
  volume: number;
  q: number;
  cutoff: number;
};

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeNonNegativeInt(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value ?? 0));
}

function normalizeToneCue(cue: NexusAgentToneCueInput = "ripple"): Required<NexusAgentToneCue> {
  if (typeof cue === "string") {
    return {
      source: cue,
      direction: "right",
      persistent: false,
      density: 0,
      constellationIndex: 0,
      autonomy: 0,
    };
  }

  return {
    source: cue.source ?? "ripple",
    direction: cue.direction ?? "right",
    persistent: cue.persistent ?? false,
    density: clampUnit(cue.density ?? 0),
    constellationIndex: normalizeNonNegativeInt(cue.constellationIndex),
    autonomy: clampUnit(cue.autonomy ?? 0),
  };
}

function normalizeSectorWaveform(type: OscillatorType): OscillatorType {
  if (type === "sawtooth") return "triangle";
  if (type === "square") return "sine";
  return type;
}

function getConstellationDelaySeconds(cue: Required<NexusAgentToneCue>): number {
  if (cue.constellationIndex <= 0) return 0;
  const baseStep =
    cue.source === "collapse"
      ? 0.042
      : cue.source === "sector"
        ? cue.persistent
          ? 0.022
          : 0.028
        : 0.034;
  const directionMul =
    cue.source !== "sector"
      ? 1
      : cue.direction === "up"
        ? 0.82
        : cue.direction === "down"
          ? 1.14
          : cue.direction === "left"
            ? 1.08
            : 0.92;
  const stubbornLag = cue.autonomy * 0.008;
  const sway = cue.constellationIndex % 2 === 0 ? -1 : 1;
  const swing = cue.autonomy * 0.003 * sway;
  return Math.max(0, cue.constellationIndex * baseStep * directionMul + stubbornLag + swing);
}

function buildCollapseToneEvents(
  basePlan: NexusAgentTonePlanEvent[],
  freq: number,
  volume: number,
  cue: Required<NexusAgentToneCue>,
): NexusAgentToneEvent[] {
  const anchor = basePlan.reduce((lowest, event) =>
    event.freqMul < lowest.freqMul ? event : lowest,
  basePlan[0]);
  const densityVolumeMul = 1 - cue.density * 0.18;
  const densityDurationMul = 1 - cue.density * 0.24;
  const constellationDelay = getConstellationDelaySeconds(cue);
  const followerVolumeMul =
    cue.constellationIndex === 0
      ? 1
      : Math.max(0.68, 0.86 - cue.constellationIndex * 0.05 + cue.autonomy * 0.05);
  const followerDurationMul =
    cue.constellationIndex === 0 ? 1 : Math.max(0.72, 0.92 - cue.constellationIndex * 0.04);

  return [
    {
      freq: freq * anchor.freqMul * 0.5,
      offsetSeconds: constellationDelay,
      durationSeconds: Math.max(
        0.08,
        anchor.durationSeconds * 0.48 * densityDurationMul * followerDurationMul,
      ),
      type: anchor.type === "square" ? "triangle" : anchor.type,
      volume: volume * anchor.volumeMul * 0.48 * densityVolumeMul * followerVolumeMul,
      q: Math.max(0.8, anchor.q),
      cutoff: Math.max(
        620,
        anchor.cutoff - 650 - cue.density * 180 + cue.constellationIndex * 70 + cue.autonomy * 90,
      ),
    },
  ];
}

function buildSectorToneEvents(
  basePlan: NexusAgentTonePlanEvent[],
  freq: number,
  volume: number,
  cue: Required<NexusAgentToneCue>,
): NexusAgentToneEvent[] {
  const profile = SECTOR_DIRECTION_PROFILES[cue.direction];
  const densityVolumeMul = 1 - cue.density * 0.28;
  const densityDurationMul = 1 - cue.density * 0.32;
  const maxVoices = cue.density >= 0.66 ? 1 : Math.min(2, basePlan.length);
  const sectorDurationBase = cue.persistent ? 0.74 : 0.62;
  const sectorVolumeBase = cue.persistent ? 0.78 : 0.72;
  const constellationDelay = getConstellationDelaySeconds(cue);
  const followerVolumeMul =
    cue.constellationIndex === 0
      ? 1
      : Math.max(0.66, 0.88 - cue.constellationIndex * 0.06 + cue.autonomy * 0.05);
  const followerDurationMul =
    cue.constellationIndex === 0 ? 1 : Math.max(0.7, 0.9 - cue.constellationIndex * 0.04);

  return basePlan.slice(0, maxVoices).map((event, index) => ({
    freq:
      freq *
      (index === 0 ? event.freqMul : Math.min(event.freqMul, profile.accentFreqMul)),
    offsetSeconds: Math.max(0, event.offsetSeconds * profile.offsetMul + constellationDelay),
    durationSeconds: Math.max(
      0.05,
      event.durationSeconds *
        sectorDurationBase *
        profile.durationMul *
        densityDurationMul *
        followerDurationMul,
    ),
    type: index === 0 ? profile.leadType : normalizeSectorWaveform(event.type),
    volume:
      volume *
      event.volumeMul *
      sectorVolumeBase *
      profile.volumeMul *
      densityVolumeMul *
      followerVolumeMul,
    q: index === 0 ? Math.max(1.2, event.q) : event.q,
    cutoff: Math.max(
      760,
      event.cutoff +
        profile.cutoffLift -
        cue.density * 220 +
        cue.constellationIndex * 90 +
        cue.autonomy * 140,
    ),
  }));
}

function buildRippleToneEvents(
  basePlan: NexusAgentTonePlanEvent[],
  freq: number,
  volume: number,
  cue: Required<NexusAgentToneCue>,
): NexusAgentToneEvent[] {
  const densityVolumeMul = 1 - cue.density * 0.3;
  const densityDurationMul = 1 - cue.density * 0.34;
  const densityCutoffDrop = cue.density * 420;
  const maxVoices =
    cue.density >= 0.82 ? 1 : cue.density >= 0.45 ? Math.min(2, basePlan.length) : basePlan.length;
  const constellationDelay = getConstellationDelaySeconds(cue);
  const followerVolumeMul =
    cue.constellationIndex === 0
      ? 1
      : Math.max(0.68, 0.9 - cue.constellationIndex * 0.05 + cue.autonomy * 0.04);
  const followerDurationMul =
    cue.constellationIndex === 0 ? 1 : Math.max(0.74, 0.92 - cue.constellationIndex * 0.04);

  return basePlan.slice(0, maxVoices).map((event) => ({
    freq: freq * event.freqMul,
    offsetSeconds: Math.max(0, event.offsetSeconds + constellationDelay),
    durationSeconds: Math.max(
      0.06,
      event.durationSeconds * 0.86 * densityDurationMul * followerDurationMul,
    ),
    type: event.type,
    volume: volume * event.volumeMul * 0.82 * densityVolumeMul * followerVolumeMul,
    q: event.q,
    cutoff: Math.max(
      520,
      event.cutoff - densityCutoffDrop + cue.constellationIndex * 70 + cue.autonomy * 110,
    ),
  }));
}

export function buildNexusAgentToneEvents(
  preset: ParticlePreset,
  freq: number,
  volume: number,
  cue: NexusAgentToneCueInput = "ripple",
): NexusAgentToneEvent[] {
  const basePlan = BASE_TONE_PLANS[preset];
  if (!basePlan) return [];
  const normalizedCue = normalizeToneCue(cue);

  if (normalizedCue.source === "collapse") {
    return buildCollapseToneEvents(basePlan, freq, volume, normalizedCue);
  }

  if (normalizedCue.source === "sector") {
    return buildSectorToneEvents(basePlan, freq, volume, normalizedCue);
  }

  return buildRippleToneEvents(basePlan, freq, volume, normalizedCue);
}

export function playNexusAgentToneByPreset(
  preset: ParticlePreset,
  freq: number,
  volume: number,
  playScheduledTone: PlayOneShotTone,
  targetDestination?: AudioNode,
  cue: NexusAgentToneCueInput = "ripple",
): void {
  buildNexusAgentToneEvents(preset, freq, volume, cue).forEach((event) => {
    playScheduledTone(
      event.freq,
      event.offsetSeconds,
      event.durationSeconds,
      event.type,
      event.volume,
      event.q,
      event.cutoff,
      targetDestination,
    );
  });
}
