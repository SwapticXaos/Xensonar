/**
 * Platformer arrangement theme derivation: movement events → CompletionTheme and tempo.
 * Extracted from platformerArrangement for structure optimization (LOC discipline, single-responsibility).
 */
import { clamp } from "../../shared/tuning/grid";
import { SCALE } from "./platformerState";
import {
  buildPlatformerRouteProfileFromEvents,
} from "./platformerRouteProfile";
import {
  buildPlatformerRouteOrchestration,
} from "./platformerRouteOrchestration";
import {
  clampPhaseIndex,
  dominantPhaseIndex,
  type CompletionTheme,
  type MovementEvent,
  type MovementEventKind,
} from "./platformerArrangementTypes";
import {
  buildMotif,
  buildRootContour,
  fallbackPhraseSource,
  fallbackRootContour,
  getEventDetail,
  normalizePitchClass,
  normalizePhaseWeights,
  selectEventSemis,
} from "./platformerMotifHelpers";

export type { CompletionTheme, MovementEvent, MovementEventKind };

export const deriveMovementTheme = (
  events: MovementEvent[],
  fallbackPhrase: number[],
): CompletionTheme => {
  const orderedEvents = [...events].sort((a, b) => (a.t - b.t) || ((a.ordinal ?? 0) - (b.ordinal ?? 0)));
  const fallback = fallbackPhraseSource(fallbackPhrase);
  const routeProfile = buildPlatformerRouteProfileFromEvents(orderedEvents);
  const routeOrchestration = buildPlatformerRouteOrchestration(routeProfile);
  const phaseVotes: [number, number, number] = [1, 1, 1];
  let syncLike = 0;
  let tuningBiasSum = 0;
  let tuningBiasCount = 0;
  let forkBiasSum = 0;
  let forkBiasCount = 0;
  let restLike = 0;
  let laneSum = 0;
  orderedEvents.forEach((event) => {
    laneSum += event.lane;
    if (event.kind === "sync_gate") {
      syncLike += 0.45 + event.energy;
    }
    if (event.kind === "phase_gate") {
      phaseVotes[clampPhaseIndex(getEventDetail(event))] += 0.5 + event.energy;
    }
    if (event.kind === "tuning_crystal") {
      tuningBiasSum += clamp(getEventDetail(event), -2, 2);
      tuningBiasCount += 1;
    }
    if (event.kind === "chord_fork") {
      forkBiasSum += clamp(getEventDetail(event), -2, 2);
      forkBiasCount += 1;
    }
    if (event.kind === "silence_field") {
      restLike += 0.3 + event.energy * 0.7 + Math.abs(getEventDetail(event)) * 0.15;
    }
  });
  const normalizedPhase = normalizePhaseWeights(phaseVotes);
  const phaseIndex = dominantPhaseIndex(normalizedPhase);
  const phaseLift = [0, 2, 5][phaseIndex] ?? 0;
  const tuningBias = clamp(tuningBiasCount > 0 ? tuningBiasSum / tuningBiasCount / 2 : 0, -1, 1);
  const forkBias = clamp(forkBiasCount > 0 ? forkBiasSum / forkBiasCount : 0, -1, 1);
  const tuningLift = Math.round(tuningBias * 3);
  const routeBias = clamp((forkBias + routeProfile.branchBias * 0.7) / 1.7, -1, 1);
  const forkLift = routeBias > 0.2 ? 5 : routeBias < -0.2 ? -2 : 0;
  const routeTravelLift = routeProfile.splitMotion > 0.5 ? 2 : routeProfile.splitMotion < -0.5 ? -2 : 0;

  const groundSource = selectEventSemis(
    orderedEvents,
    (event) =>
      (!event.airborne && (event.kind === "motion" || event.kind === "step" || event.kind === "land"))
      || event.kind === "checkpoint"
      || event.kind === "sync_gate"
      || event.kind === "chord_fork",
    (event) =>
      event.semi
      + (event.kind === "sync_gate" ? 5 + Math.round(getEventDetail(event) * 2) : 0)
      + (event.kind === "chord_fork" ? (getEventDetail(event) >= 0 ? 7 : -2) + forkLift : 0),
  );
  const airSource = selectEventSemis(
    orderedEvents,
    (event) =>
      event.airborne
      || event.kind === "jump"
      || event.kind === "fall"
      || event.kind === "tuning_crystal"
      || event.kind === "npc_orb",
    (event, index) =>
      event.semi
      + (event.kind === "fall" ? -2 : 5)
      + (event.kind === "npc_orb" ? 7 : 0)
      + (event.kind === "tuning_crystal" ? tuningLift * 2 + 4 : 0)
      + (index % 3 === 2 ? 2 : 0),
  );
  const accentSource = selectEventSemis(
    orderedEvents,
    (event) =>
      event.kind === "coin"
      || event.kind === "npc_orb"
      || event.kind === "mode_shift"
      || event.kind === "checkpoint"
      || event.kind === "turn"
      || event.kind === "puzzle_step"
      || event.kind === "gate_unlock"
      || event.kind === "sync_gate"
      || event.kind === "phase_gate"
      || event.kind === "tuning_crystal"
      || event.kind === "chord_fork",
    (event, index) =>
      event.semi
      + (
        event.kind === "coin"
          ? 12
          : event.kind === "npc_orb"
            ? 9
            : event.kind === "mode_shift"
              ? 10
              : event.kind === "gate_unlock"
                ? 14
                : event.kind === "puzzle_step"
                  ? 11
                  : event.kind === "sync_gate"
                    ? 9
                    : 7
      )
      + (event.kind === "tuning_crystal" ? tuningLift * 2 : 0)
      + (event.kind === "chord_fork" ? (getEventDetail(event) >= 0 ? 7 : -5) + forkLift : 0)
      + (index % 2 === 0 ? 0 : 2),
  );
  const cadenceSource = selectEventSemis(
    orderedEvents.slice(-8),
    (event) => event.kind !== "motion",
    (event) =>
      event.semi
      + (event.kind === "phase_gate" ? phaseLift : 0)
      + (event.kind === "tuning_crystal" ? tuningLift : 0)
      + (event.kind === "chord_fork" ? forkLift : 0),
  );
  const rootSource = orderedEvents
    .filter((event) => event.kind !== "motion" || event.energy > 0.55)
    .map((event) => {
      if (event.kind === "phase_gate") {
        return normalizePitchClass([0, 3, 7][clampPhaseIndex(getEventDetail(event))] ?? event.semi);
      }
      if (event.kind === "tuning_crystal") {
        return normalizePitchClass((SCALE[((event.lane % SCALE.length) + SCALE.length) % SCALE.length] ?? event.semi) + tuningLift);
      }
      if (event.kind === "chord_fork") {
        return normalizePitchClass(
          (SCALE[((event.lane % SCALE.length) + SCALE.length) % SCALE.length] ?? event.semi)
          + (getEventDetail(event) >= 0 ? 5 : -2)
          + forkLift,
        );
      }
      return normalizePitchClass(SCALE[((event.lane % SCALE.length) + SCALE.length) % SCALE.length] ?? event.semi);
    });

  const groundMotif = buildMotif(
    groundSource,
    fallback,
    8,
    (semi) => semi + (phaseIndex === 0 ? 0 : phaseIndex === 1 ? 1 : 2) + Math.round(forkBias * 2),
  );
  const airMotif = buildMotif(
    airSource,
    groundMotif.map((semi, index) =>
      semi
      + (index % 2 === 0 ? 12 : 7)
      + tuningLift
      + Math.round(forkBias * 2)
      + (routeProfile.mode === "ceiling" || routeProfile.mode === "climb" ? 2 : 0)),
    6,
  );
  const accentMotif = buildMotif(
    accentSource,
    [
      ...groundMotif.slice(0, 2).map((semi) => semi + 12 + tuningLift + forkLift + routeTravelLift),
      ...fallback.slice(0, 2).map((semi) => semi + 7 + phaseLift + Math.round(forkBias * 2) + routeTravelLift),
    ],
    4,
  );
  const cadenceMotif = buildMotif(
    cadenceSource,
    [
      ...groundMotif.slice(-2).map((semi) => semi + phaseLift + forkLift + (routeProfile.mode === "floor" || routeProfile.mode === "drop" ? -2 : 0)),
      ...fallback.slice(-2).map((semi) => semi + tuningLift + routeTravelLift),
    ],
    4,
  );
  const rootContour = buildRootContour(
    rootSource.map((semi, index) => semi + (index % 3 === phaseIndex ? 2 : 0) + (routeProfile.mode === "floor" ? -1 : routeProfile.mode === "ceiling" ? 1 : 0)),
    fallbackRootContour(groundMotif).map((semi) => semi + (phaseIndex === 2 ? 2 : 0)),
    8,
  );

  const totalEvents = Math.max(1, orderedEvents.length);
  let strideLike = 0;
  let airLike = 0;
  let accentLike = 0;
  orderedEvents.forEach((event) => {
    if (!event.airborne && (event.kind === "motion" || event.kind === "step" || event.kind === "land")) {
      strideLike += 1;
    }
    if (event.airborne || event.kind === "jump" || event.kind === "fall" || event.kind === "npc_orb") {
      airLike += 1;
    }
    if (
      event.kind === "coin"
      || event.kind === "npc_orb"
      || event.kind === "mode_shift"
      || event.kind === "checkpoint"
      || event.kind === "turn"
      || event.kind === "puzzle_step"
      || event.kind === "gate_unlock"
      || event.kind === "sync_gate"
      || event.kind === "phase_gate"
      || event.kind === "tuning_crystal"
      || event.kind === "chord_fork"
    ) {
      accentLike += 1;
    }
  });

  return {
    groundMotif,
    airMotif,
    accentMotif,
    cadenceMotif,
    rootContour,
    strideDensity: clamp(strideLike / totalEvents, 0, 1),
    airDensity: clamp(airLike / totalEvents, 0, 1),
    accentDensity: clamp(accentLike / totalEvents, 0, 1),
    laneCenter: clamp(laneSum / totalEvents / Math.max(1, SCALE.length - 1), 0, 1),
    syncDensity: clamp(syncLike / Math.max(1, totalEvents * 0.68), 0, 1),
    phaseWeights: normalizedPhase,
    tuningBias,
    forkBias,
    restDensity: clamp(restLike / Math.max(1, totalEvents * 0.7), 0, 1),
    routeProfile,
    routeOrchestration,
  };
};

export const deriveMovementTempo = (events: MovementEvent[]): number => {
  if (events.length === 0) return 108;
  let energySum = 0;
  let airborneCount = 0;
  let directionalCount = 0;
  let syncCount = 0;
  let phaseCount = 0;
  let tuningCount = 0;
  let forkCount = 0;
  let restCount = 0;
  const kindSet = new Set<MovementEventKind>();
  for (const ev of events) {
    energySum += ev.energy;
    kindSet.add(ev.kind);
    if (ev.airborne) airborneCount += 1;
    if (ev.kind === "turn" || ev.kind === "jump" || ev.kind === "fall") {
      directionalCount += 1;
    }
    if (ev.kind === "sync_gate") syncCount += 1;
    if (ev.kind === "phase_gate") phaseCount += 1;
    if (ev.kind === "tuning_crystal") tuningCount += 1;
    if (ev.kind === "chord_fork") forkCount += 1;
    if (ev.kind === "silence_field") restCount += 1;
  }
  const meanEnergy = clamp(energySum / events.length, 0.05, 1);
  const airborneRatio = clamp(airborneCount / events.length, 0, 1);
  const directionalRatio = clamp(directionalCount / events.length, 0, 1);
  const syncRatio = clamp(syncCount / events.length, 0, 1);
  const phaseRatio = clamp(phaseCount / events.length, 0, 1);
  const tuningRatio = clamp(tuningCount / events.length, 0, 1);
  const forkRatio = clamp(forkCount / events.length, 0, 1);
  const restRatio = clamp(restCount / events.length, 0, 1);
  const varietyBoost = kindSet.size * 3.2;
  return clamp(
    88 + meanEnergy * 46 + airborneRatio * 16 + directionalRatio * 18 + syncRatio * 18 + phaseRatio * 8 + tuningRatio * 6 + forkRatio * 10 - restRatio * 10 + varietyBoost,
    78,
    184,
  );
};
