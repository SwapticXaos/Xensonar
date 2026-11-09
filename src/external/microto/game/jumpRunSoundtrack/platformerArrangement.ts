/**
 * Platformer arrangement: movement → motif extraction; section/phrase/form derivation;
 * tuning selection and pitch mapping. Extracted from platformerAudio to reduce LOC.
 * Types and motif helpers in platformerArrangementTypes, platformerMotifHelpers.
 */
import { clamp } from "../../shared/tuning/grid";
import { CHORDS } from "./platformerState";
import type { PlatformerRouteOrchestration } from "./platformerRouteOrchestration";
import type { PlatformerSectionBias } from "./platformerSectionBias";
import { deriveMovementTheme, deriveMovementTempo } from "./platformerArrangementTheme";
import { platformerPitchToFreq, type PlatformerTuningMode } from "./platformerArrangementTuning";
import { buildCompletionPattern } from "./platformerCompletionPattern";
import {
  clonePattern,
  createSectionVariant,
  getArrangementModeProfile,
  resolveArrangementOrder,
} from "./platformerArrangementOrder";
import {
  BAR_COUNT,
  COMPLETION_INTRO_STEPS,
  LOOP_STEPS,
  clampPhaseIndex,
  clampSemi,
  dominantPhaseIndex,
  type CompletionArrangement,
  type CompletionIntroPattern,
  type CompletionPattern,
  type CompletionTheme,
  type MovementEvent,
  type MovementEventKind,
  type PlatformerArrangementForm,
  type PlatformerArrangementMode,
  type PlatformerAuditionSection,
} from "./platformerArrangementTypes";
import { snapToChord } from "./platformerMotifHelpers";

export { platformerPitchToFreq };
export { snapToChord } from "./platformerMotifHelpers";
export type { PlatformerTuningMode };
export { clonePattern, getArrangementModeProfile } from "./platformerArrangementOrder";
export { BAR_COUNT, COMPLETION_INTRO_STEPS, LOOP_STEPS, clampPhaseIndex, clampSemi, dominantPhaseIndex };
export type {
  CompletionArrangement,
  CompletionIntroPattern,
  CompletionPattern,
  CompletionTheme,
  MovementEvent,
  MovementEventKind,
  PlatformerArrangementForm,
  PlatformerArrangementMode,
  PlatformerAuditionSection,
};

export { buildCompletionPattern } from "./platformerCompletionPattern";
export const normalizeEventsForLoop = (events: MovementEvent[], beatDur: number): MovementEvent[] => {
  if (events.length === 0) return [];
  let minT = events[0].t;
  let maxT = events[0].t;
  for (const ev of events) {
    if (ev.t < minT) minT = ev.t;
    if (ev.t > maxT) maxT = ev.t;
  }
  const span = Math.max(0.001, maxT - minT);
  const loopDuration = LOOP_STEPS * Math.max(0.01, beatDur);
  return events.map((ev) => ({
    ...ev,
    t: ((ev.t - minT) / span) * loopDuration,
  }));
};

export { deriveMovementTheme, deriveMovementTempo } from "./platformerArrangementTheme";
export { buildCompletionIntroPattern } from "./platformerCompletionIntroPattern";

const buildArrangementSeed = (events: MovementEvent[], fallbackPhrase: number[]): number => {
  let seed = 0x9e3779b9;
  for (let i = 0; i < events.length; i += 1) {
    const ev = events[i];
    const lanePart = (ev.lane & 0xff) << 16;
    const semiPart = (ev.semi + 48) & 0xff;
    const energyPart = Math.round(clamp(ev.energy, 0, 1) * 255) << 8;
    const kindPart = (ev.kind.charCodeAt(0) + i * 13) & 0xff;
    seed ^= lanePart ^ semiPart ^ energyPart ^ kindPart;
    seed = Math.imul(seed ^ (seed >>> 15), 2246822519);
    seed ^= Math.round(ev.t * 1000) + (ev.airborne ? 7919 : 104729);
  }
  for (let i = 0; i < fallbackPhrase.length; i += 1) {
    seed ^= (fallbackPhrase[i] + 64 + i * 5) << (i % 12);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489917);
  }
  seed >>>= 0;
  return seed === 0 ? 1 : seed;
};

export const createCycleMutation = (
  base: CompletionPattern,
  cycle: number,
  seed: number,
  complexity: number,
  mode: PlatformerArrangementMode,
  evolution: number,
  routeOrchestration: PlatformerRouteOrchestration,
): CompletionPattern => {
  if (cycle <= 0) return base;
  const profile = getArrangementModeProfile(mode);
  const out = clonePattern(base);
  const strength = clamp(
    (0.08 + cycle * 0.055 + complexity * 0.08) * profile.mutation * (0.48 + evolution * 0.95),
    0.08,
    0.92,
  );
  let randState = (seed ^ Math.imul(cycle + 1, 1597334677)) >>> 0;
  const nextRand = () => {
    randState ^= randState << 13;
    randState ^= randState >>> 17;
    randState ^= randState << 5;
    return (randState >>> 0) / 4294967295;
  };

  const stepsPerBar = Math.max(1, Math.floor(out.lengthSteps / BAR_COUNT));
  for (let step = 0; step < out.lengthSteps; step += 1) {
    const bar = Math.min(BAR_COUNT - 1, Math.floor(step / stepsPerBar));
    const chord = out.barChords[bar] ?? [out.barRoots[bar] ?? 0, (out.barRoots[bar] ?? 0) + 7, (out.barRoots[bar] ?? 0) + 10];

    if (out.lead[step] != null && nextRand() < 0.09 * strength) {
      const shift = nextRand() < 0.5 ? -2 : 2;
      out.lead[step] = snapToChord((out.lead[step] as number) + shift, chord);
    }
    if (mode === "cinematic" && out.lead[step] != null && step % 16 === 0) {
      out.lead[step] = snapToChord((out.lead[step] as number) + 12, chord);
    }
    if (out.arp[step] != null && nextRand() < 0.11 * strength) {
      const octaveShift = nextRand() < 0.7 ? 12 : 24;
      out.arp[step] = snapToChord((out.arp[step] as number) + (nextRand() < 0.5 ? 2 : -2), chord) + octaveShift;
    }
    if (out.bass[step] != null && nextRand() < 0.07 * strength) {
      const shift = nextRand() < 0.5 ? -5 : 5;
      out.bass[step] = snapToChord((out.bass[step] as number) + shift, chord);
    }
    if (nextRand() < 0.12 * strength) {
      out.ghost[step] = !out.ghost[step];
    }
    if (nextRand() < 0.1 * strength * profile.drumBias * routeOrchestration.drumBias) {
      out.kick[step] = !out.kick[step];
    }
    if (nextRand() < 0.08 * strength * profile.drumBias * routeOrchestration.drumBias) {
      out.snare[step] = !out.snare[step];
    }
    if (nextRand() < 0.16 * strength * profile.hatBias * routeOrchestration.hatBias) {
      out.hat[step] = !out.hat[step];
    }
    if (mode === "percussive" && step % 4 !== 0 && nextRand() < 0.26 * strength) {
      out.hat[step] = true;
    }
    if (mode === "glitch" && out.lead[step] != null && nextRand() < profile.glitchChance * strength) {
      const jitter = nextRand() < 0.5 ? 7 : -7;
      out.lead[step] = snapToChord((out.lead[step] as number) + jitter, chord);
      if (nextRand() < 0.45) {
        out.arp[(step + 1) % out.lengthSteps] = (out.lead[step] as number) + 24;
      }
    }
    if (mode === "cinematic" && step % 8 === 0 && nextRand() < 0.18 * strength) {
      out.ghost[step] = true;
    }
    out.accent[step] = clamp(
      out.accent[step] + (nextRand() - 0.5) * 0.22 * strength + (mode === "percussive" ? 0.02 : 0) + routeOrchestration.accentBias * 0.4,
      0.15,
      1,
    );
    out.tension[step] = clamp(
      out.tension[step] + (nextRand() - 0.5) * 0.3 * strength + cycle * 0.01 + (mode === "glitch" ? 0.02 : 0),
      0.1,
      1,
    );
  }

  if (cycle % 2 === 1) {
    out.barRoots = out.barRoots.map((root, bar) => root + (bar % 2 === 0 ? Math.round(2 * profile.harmonicLift * routeOrchestration.harmonicLift) : 0));
  } else if (cycle % 3 === 0) {
    out.barRoots = out.barRoots.map((root, bar) => root + (bar % 3 === 0 ? Math.round(5 * profile.harmonicLift * routeOrchestration.harmonicLift) : 0));
  }
  out.barChords = out.barRoots.map((root, bar) => {
    const chordShift = (cycle + bar) % CHORDS.length;
    const source = CHORDS[chordShift] ?? CHORDS[0];
    return source.map((semi) => semi + root);
  });
  out.swing = clamp(
    out.swing + (nextRand() - 0.5) * 0.024 * strength * profile.swingPush * routeOrchestration.hatBias + cycle * 0.002,
    0.01,
    0.19,
  );
  out.density = clamp(
    out.density + (nextRand() - 0.35) * 0.2 * strength + cycle * 0.015 + (mode === "percussive" ? 0.02 : 0) + routeOrchestration.accentBias * 0.35,
    0.2,
    2.6,
  );
  out.airRatio = clamp(out.airRatio + (nextRand() - 0.55) * 0.16 * strength, 0, 1);
  return out;
};

export const buildCompletionArrangement = (
  events: MovementEvent[],
  fallbackPhrase: number[],
  beatDur: number,
  mode: PlatformerArrangementMode,
  evolution: number,
  formMode: PlatformerArrangementForm,
  sectionBias: PlatformerSectionBias,
): CompletionArrangement => {
  const orderedEvents = [...events].sort((a, b) => (a.t - b.t) || ((a.ordinal ?? 0) - (b.ordinal ?? 0)));
  const normalizedAll = normalizeEventsForLoop(orderedEvents, beatDur);
  const theme = deriveMovementTheme(orderedEvents, fallbackPhrase);
  const base = buildCompletionPattern(normalizedAll, fallbackPhrase, beatDur, theme);
  const firstT = orderedEvents[0]?.t ?? 0;
  const lastT = orderedEvents[orderedEvents.length - 1]?.t ?? firstT;
  const span = Math.max(0.001, lastT - firstT);
  const phaseAEnd = firstT + span * 0.34;
  const phaseBEnd = firstT + span * 0.68;
  const phaseA = orderedEvents.filter((ev) => ev.t <= phaseAEnd);
  const phaseB = orderedEvents.filter((ev) => ev.t > phaseAEnd && ev.t <= phaseBEnd);
  const phaseC = orderedEvents.filter((ev) => ev.t > phaseBEnd);
  const sourceA = phaseA.length >= 6 ? normalizeEventsForLoop(phaseA, beatDur) : normalizedAll;
  const sourceB = phaseB.length >= 6 ? normalizeEventsForLoop(phaseB, beatDur) : normalizedAll;
  const sourceC = phaseC.length >= 6 ? normalizeEventsForLoop(phaseC, beatDur) : normalizedAll;
  const themeA = deriveMovementTheme(phaseA.length >= 6 ? phaseA : orderedEvents, theme.groundMotif);
  const themeB = deriveMovementTheme(phaseB.length >= 6 ? phaseB : orderedEvents, theme.airMotif);
  const themeC = deriveMovementTheme(phaseC.length >= 6 ? phaseC : orderedEvents, theme.cadenceMotif);
  const sectionA = createSectionVariant(buildCompletionPattern(sourceA, fallbackPhrase, beatDur, themeA), "A", mode, themeA);
  const sectionB = createSectionVariant(buildCompletionPattern(sourceB, fallbackPhrase, beatDur, themeB), "B", mode, themeB);
  const sectionC = createSectionVariant(buildCompletionPattern(sourceC, fallbackPhrase, beatDur, themeC), "C", mode, themeC);

  const variety = new Set(orderedEvents.map((ev) => ev.kind)).size;
  const order = resolveArrangementOrder(base, variety, orderedEvents, mode, formMode, theme, sectionBias);
  const sectionLabels = ["A", "B", "C"];
  const formLabel = order.map((sectionId) => sectionLabels[sectionId] ?? "A").join("");
  const modeProfile = getArrangementModeProfile(mode);
  const targetBpm = clamp(
    deriveMovementTempo(orderedEvents)
    * modeProfile.tempoScale
    * (
      0.92
      + evolution * 0.12
      + theme.syncDensity * 0.04
      + Math.abs(theme.tuningBias) * 0.02
      + Math.abs(theme.forkBias) * 0.025
      + theme.routeOrchestration.tempoBias
      - theme.restDensity * 0.035
    ),
    78,
    196,
  );
  const complexity = clamp(
    (
      (sectionA.density + sectionB.density + sectionC.density) / 3
      + variety * 0.08
      + theme.syncDensity * 0.18
      + Math.abs(theme.tuningBias) * 0.12
      + Math.abs(theme.forkBias) * 0.1
      + Math.max(0, theme.routeOrchestration.harmonicLift - 1) * 0.16
      - theme.restDensity * 0.08
    ) * modeProfile.mutation * (0.85 + evolution * 0.35),
    0.25,
    2.6,
  );
  const seed = buildArrangementSeed(orderedEvents, fallbackPhrase);

  return {
    sections: [sectionA, sectionB, sectionC],
    order,
    sectionLengthSteps: base.lengthSteps,
    formLabel,
    targetBpm,
    complexity,
    seed,
    theme,
  };
};
