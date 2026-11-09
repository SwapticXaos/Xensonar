/**
 * Platformer completion pattern: movement events + theme → CompletionPattern (vote aggregation, fill, snap).
 * Extracted from platformerArrangement for LOC discipline and single-responsibility (vision §6 §8, STRUCTURE).
 */
import { clamp } from "../../shared/tuning/grid";
import { SCALE, CHORDS } from "./platformerState";
import {
  BAR_COUNT,
  LOOP_STEPS,
  clampPhaseIndex,
  dominantPhaseIndex,
  type CompletionPattern,
  type CompletionTheme,
  type MovementEvent,
  type MovementEventKind,
} from "./platformerArrangementTypes";
import { getEventDetail, normalizePitchClass, snapToChord } from "./platformerMotifHelpers";

const pickWinningNote = (votes: Map<number, number>): number | null => {
  let bestNote: number | null = null;
  let bestScore = -Infinity;
  votes.forEach((score, note) => {
    if (score > bestScore) {
      bestScore = score;
      bestNote = note;
    }
  });
  return bestNote;
};

const leadWeights: Record<MovementEventKind, number> = {
  motion: 0.45,
  step: 0.9,
  jump: 1.35,
  land: 0.82,
  coin: 1.75,
  npc_orb: 1.88,
  mode_shift: 1.48,
  puzzle_step: 1.72,
  gate_unlock: 1.92,
  checkpoint: 1.55,
  fall: 1.2,
  turn: 1.25,
  sync_gate: 1.95,
  phase_gate: 1.5,
  tuning_crystal: 1.7,
  chord_fork: 1.62,
  silence_field: 0.2,
};

export const buildCompletionPattern = (
  events: MovementEvent[],
  fallbackPhrase: number[],
  beatDur: number,
  theme: CompletionTheme,
): CompletionPattern => {
  const leadVotes = Array.from({ length: LOOP_STEPS }, () => new Map<number, number>());
  const arpVotes = Array.from({ length: LOOP_STEPS }, () => new Map<number, number>());
  const bassVotes = Array.from({ length: LOOP_STEPS }, () => new Map<number, number>());
  const barVotes = Array.from({ length: BAR_COUNT }, () => new Map<number, number>());
  const kick = Array.from({ length: LOOP_STEPS }, () => false);
  const snare = Array.from({ length: LOOP_STEPS }, () => false);
  const hat = Array.from({ length: LOOP_STEPS }, () => false);
  const ghost = Array.from({ length: LOOP_STEPS }, () => false);
  const accent = Array.from({ length: LOOP_STEPS }, () => 0);
  const tension = Array.from({ length: LOOP_STEPS }, () => 0);
  const stepsPerBar = Math.max(1, Math.floor(LOOP_STEPS / BAR_COUNT));
  let airborneCount = 0;
  let energeticCount = 0;

  const restMask = Array.from({ length: LOOP_STEPS }, () => false);
  const routeHighBias = theme.routeProfile.mode === "ceiling" || theme.routeProfile.mode === "climb";
  const routeLowBias = theme.routeProfile.mode === "floor" || theme.routeProfile.mode === "drop";
  const routeTravelLift = theme.routeProfile.splitMotion > 0.5 ? 2 : theme.routeProfile.splitMotion < -0.5 ? -2 : 0;
  const routeOrchestration = theme.routeOrchestration;

  for (const ev of events) {
    const rawStep = Math.floor(ev.t / Math.max(0.01, beatDur));
    const step = ((rawStep % LOOP_STEPS) + LOOP_STEPS) % LOOP_STEPS;
    const bar = Math.min(BAR_COUNT - 1, Math.floor(step / stepsPerBar));
    const energy = clamp(ev.energy, 0.05, 1);
    const detail = getEventDetail(ev);
    const phaseIndex = ev.kind === "phase_gate" ? clampPhaseIndex(detail) : 1;
    const tuningOffset = ev.kind === "tuning_crystal" ? Math.round(clamp(detail, -2, 2)) * 2 : 0;
    const forkOffset = ev.kind === "chord_fork" ? (detail >= 0 ? 5 : -2) : 0;
    if (ev.airborne) airborneCount += 1;
    if (energy > 0.66) energeticCount += 1;
    accent[step] = Math.max(accent[step], energy);
    tension[step] = Math.max(tension[step], energy * (ev.airborne ? 1.18 : 0.92));

    const rootVote = ev.kind === "phase_gate"
      ? ([0, 3, 7][phaseIndex] ?? 0)
      : ((SCALE[((ev.lane % SCALE.length) + SCALE.length) % SCALE.length] ?? 0) + tuningOffset + forkOffset);
    barVotes[bar].set(rootVote, (barVotes[bar].get(rootVote) ?? 0) + (0.45 + energy));

    const leadSemi = Math.round(clamp(
      ev.semi
        + (ev.airborne ? 2 : 0)
        + (ev.kind === "sync_gate" ? 5 + Math.round(detail * 2) : 0)
        + (ev.kind === "phase_gate" ? [0, 2, 5][phaseIndex] ?? 0 : 0)
        + tuningOffset
        + forkOffset,
      -18,
      24,
    ));
    const leadWeight = (leadWeights[ev.kind] ?? 0.5) * (0.6 + energy);
    leadVotes[step].set(leadSemi, (leadVotes[step].get(leadSemi) ?? 0) + leadWeight);
    if (
      ev.kind === "coin"
      || ev.kind === "npc_orb"
      || ev.kind === "mode_shift"
      || ev.kind === "puzzle_step"
      || ev.kind === "gate_unlock"
      || ev.kind === "jump"
      || ev.kind === "turn"
      || ev.kind === "sync_gate"
      || ev.kind === "tuning_crystal"
    ) {
      arpVotes[(step + 1) % LOOP_STEPS].set(leadSemi + 12, (arpVotes[(step + 1) % LOOP_STEPS].get(leadSemi + 12) ?? 0) + 0.7 + energy);
    }

    const bassSemi = Math.round(clamp(((ev.semi + tuningOffset + forkOffset) % 12) - 12, -24, 2));
    if (ev.kind !== "motion") {
      bassVotes[step].set(bassSemi, (bassVotes[step].get(bassSemi) ?? 0) + (0.8 + energy));
    }

    if (ev.kind === "step" || ev.kind === "land" || ev.kind === "fall") kick[step] = true;
    if (ev.kind === "jump" || ev.kind === "coin" || ev.kind === "npc_orb" || ev.kind === "puzzle_step") {
      snare[(step + 1) % LOOP_STEPS] = true;
    }
    if (ev.kind === "motion" || ev.kind === "step") hat[(step + 1) % LOOP_STEPS] = true;
    if (ev.airborne || ev.kind === "turn" || ev.kind === "coin" || ev.kind === "npc_orb" || ev.kind === "mode_shift") {
      ghost[(step + 3) % LOOP_STEPS] = true;
    }
    if (ev.kind === "npc_orb") {
      arpVotes[(step + 2) % LOOP_STEPS].set(
        leadSemi + 7,
        (arpVotes[(step + 2) % LOOP_STEPS].get(leadSemi + 7) ?? 0) + 0.86 + energy,
      );
      accent[step] = Math.max(accent[step], 0.64 + energy * 0.18);
      tension[step] = Math.max(tension[step], 0.54 + energy * 0.16);
    }
    if (ev.kind === "mode_shift") {
      kick[step] = true;
      ghost[(step + 1) % LOOP_STEPS] = true;
      ghost[(step + 4) % LOOP_STEPS] = true;
      arpVotes[(step + 3) % LOOP_STEPS].set(
        leadSemi + 12,
        (arpVotes[(step + 3) % LOOP_STEPS].get(leadSemi + 12) ?? 0) + 0.8 + energy,
      );
      tension[(step + 2) % LOOP_STEPS] = Math.max(tension[(step + 2) % LOOP_STEPS], 0.7 + energy * 0.12);
    }
    if (ev.kind === "puzzle_step") {
      accent[step] = Math.max(accent[step], 0.72 + energy * 0.12);
      ghost[(step + 2) % LOOP_STEPS] = true;
      arpVotes[(step + 2) % LOOP_STEPS].set(
        leadSemi + 12,
        (arpVotes[(step + 2) % LOOP_STEPS].get(leadSemi + 12) ?? 0) + 0.82 + energy,
      );
    }
    if (ev.kind === "gate_unlock") {
      kick[step] = true;
      snare[(step + 2) % LOOP_STEPS] = true;
      ghost[(step + 4) % LOOP_STEPS] = true;
      bassVotes[(step + stepsPerBar) % LOOP_STEPS].set(
        bassSemi + 5,
        (bassVotes[(step + stepsPerBar) % LOOP_STEPS].get(bassSemi + 5) ?? 0) + 1.2 + energy,
      );
      tension[step] = Math.max(tension[step], 0.82 + energy * 0.12);
    }
    if (ev.kind === "sync_gate") {
      kick[step] = true;
      snare[(step + 2) % LOOP_STEPS] = true;
      hat[(step + 1) % LOOP_STEPS] = true;
      hat[(step + 3) % LOOP_STEPS] = true;
      accent[step] = Math.max(accent[step], 0.68 + energy * 0.2);
      tension[step] = Math.max(tension[step], 0.72 + energy * 0.16);
    }
    if (ev.kind === "phase_gate") {
      kick[step] = true;
      snare[(step + 4) % LOOP_STEPS] = true;
      bassVotes[(step + stepsPerBar - 1) % LOOP_STEPS].set(
        ([0, -5, -2][phaseIndex] ?? bassSemi),
        (bassVotes[(step + stepsPerBar - 1) % LOOP_STEPS].get([0, -5, -2][phaseIndex] ?? bassSemi) ?? 0) + 1 + energy,
      );
      tension[(step + stepsPerBar - 1) % LOOP_STEPS] = Math.max(tension[(step + stepsPerBar - 1) % LOOP_STEPS], 0.66 + energy * 0.14);
    }
    if (ev.kind === "tuning_crystal") {
      ghost[step] = true;
      ghost[(step + 5) % LOOP_STEPS] = true;
      arpVotes[(step + 2) % LOOP_STEPS].set(
        leadSemi + 14 + tuningOffset,
        (arpVotes[(step + 2) % LOOP_STEPS].get(leadSemi + 14 + tuningOffset) ?? 0) + 0.9 + energy,
      );
      tension[step] = Math.max(tension[step], 0.6 + Math.abs(tuningOffset) * 0.06);
    }
    if (ev.kind === "chord_fork") {
      const branchLead = leadSemi + (detail >= 0 ? 7 : -5);
      leadVotes[(step + 2) % LOOP_STEPS].set(
        branchLead,
        (leadVotes[(step + 2) % LOOP_STEPS].get(branchLead) ?? 0) + 0.75 + energy,
      );
      bassVotes[(step + 4) % LOOP_STEPS].set(
        bassSemi + (detail >= 0 ? 5 : -2),
        (bassVotes[(step + 4) % LOOP_STEPS].get(bassSemi + (detail >= 0 ? 5 : -2)) ?? 0) + 0.9 + energy,
      );
      accent[step] = Math.max(accent[step], 0.66 + energy * 0.14);
    }
    if (ev.kind === "silence_field") {
      const restWindow = Math.max(2, Math.round(2 + detail * 4));
      for (let offset = 0; offset < restWindow; offset += 1) {
        restMask[(step + offset) % LOOP_STEPS] = true;
      }
      accent[step] = Math.min(accent[step], 0.34 + energy * 0.1);
      tension[step] = Math.min(Math.max(tension[step], 0.18), 0.4 + detail * 0.1);
    }
    if (ev.kind === "turn") {
      kick[step] = true;
      snare[step] = true;
      accent[step] = Math.max(accent[step], 0.82);
      tension[step] = Math.max(tension[step], 0.86);
    }
    if (ev.kind === "checkpoint") {
      kick[step] = true;
      snare[(step + 4) % LOOP_STEPS] = true;
      bassVotes[(step + 4) % LOOP_STEPS].set(
        bassSemi + 5,
        (bassVotes[(step + 4) % LOOP_STEPS].get(bassSemi + 5) ?? 0) + 1.1,
      );
    }
    if (ev.kind === "fall") {
      ghost[step] = true;
      tension[step] = Math.max(tension[step], 0.95);
    }
  }

  const phrase =
    theme.groundMotif.length > 0
      ? theme.groundMotif
      : (fallbackPhrase.length > 0 ? fallbackPhrase : [0, 3, 7, 10]);
  const airPhrase =
    theme.airMotif.length > 0
      ? theme.airMotif
      : phrase.map((semi, index) => semi + (index % 2 === 0 ? routeOrchestration.arpLift : routeOrchestration.responseShift) + Math.round(theme.forkBias * 2) + (routeHighBias ? 2 : 0));
  const accentPhrase =
    theme.accentMotif.length > 0
      ? theme.accentMotif
      : phrase.map((semi) => semi + 12 + (theme.forkBias > 0.2 ? 5 : theme.forkBias < -0.2 ? -2 : 0) + routeTravelLift + routeOrchestration.leadLift);
  const cadencePhrase =
    theme.cadenceMotif.length > 0
      ? theme.cadenceMotif
      : phrase.slice(-4).map((semi) => semi + routeOrchestration.responseShift);
  const rootContour =
    theme.rootContour.length > 0
      ? theme.rootContour
      : phrase.map((semi) => normalizePitchClass(semi));
  const barRoots = Array.from({ length: BAR_COUNT }, (_, bar) => {
    const voted = pickWinningNote(barVotes[bar]);
    if (voted != null) return voted;
    return rootContour[bar % rootContour.length] ?? normalizePitchClass(phrase[bar % phrase.length] ?? 0);
  });
  const barChords = barRoots.map((root, bar) => {
    const source = CHORDS[bar % CHORDS.length] ?? CHORDS[0];
    return source.map((semi) => semi + root);
  });

  const lead: Array<number | null> = Array.from({ length: LOOP_STEPS }, () => null);
  const arp: Array<number | null> = Array.from({ length: LOOP_STEPS }, () => null);
  const bass: Array<number | null> = Array.from({ length: LOOP_STEPS }, () => null);
  for (let step = 0; step < LOOP_STEPS; step += 1) {
    lead[step] = pickWinningNote(leadVotes[step]);
    arp[step] = pickWinningNote(arpVotes[step]);
    bass[step] = pickWinningNote(bassVotes[step]);
  }

  const density = clamp(events.length / LOOP_STEPS, 0.2, 1.6);
  const airRatio = clamp(
    (events.length > 0 ? airborneCount / events.length : 0) * 0.72 + theme.airDensity * 0.28,
    0,
    1,
  );
  const energyRatio = events.length > 0 ? clamp(energeticCount / events.length, 0, 1) : 0;
  const densityWithTheme = clamp(
    density
    + theme.strideDensity * 0.24
    + theme.accentDensity * 0.12
    + theme.syncDensity * 0.28
    + Math.abs(theme.tuningBias) * 0.06
    + Math.abs(theme.forkBias) * 0.08
    + routeOrchestration.accentBias
    - theme.restDensity * 0.28,
    0.2,
    1.9,
  );
  const swing = clamp(
    0.018 + airRatio * 0.06 + densityWithTheme * 0.018 + theme.syncDensity * 0.024 + (routeOrchestration.hatBias - 1) * 0.012 - theme.restDensity * 0.016,
    0.012,
    0.11,
  );
  const dominantPhase = dominantPhaseIndex(theme.phaseWeights);

  for (let step = 0; step < LOOP_STEPS; step += 1) {
    const bar = Math.min(BAR_COUNT - 1, Math.floor(step / stepsPerBar));
    const chord = barChords[bar] ?? barChords[0] ?? [0, 7, 10];
    const stepInBar = step % stepsPerBar;

    if (lead[step] == null) {
      if (stepInBar === stepsPerBar - 1) {
        lead[step] = snapToChord(cadencePhrase[bar % cadencePhrase.length] ?? (phrase[0] ?? 0), chord);
      } else if (step % 8 === 4 && accentPhrase.length > 0) {
        lead[step] = snapToChord(accentPhrase[Math.floor(step / 4) % accentPhrase.length] ?? (phrase[0] ?? 0), chord);
      } else if (step % 4 === 2 && airPhrase.length > 0) {
        lead[step] = snapToChord(airPhrase[Math.floor(step / 2) % airPhrase.length] ?? (phrase[0] ?? 0), chord);
      } else if (step % 2 === 0) {
        lead[step] = snapToChord((phrase[Math.floor(step / 2) % phrase.length] ?? 0) + routeOrchestration.leadLift, chord);
      }
    } else if (lead[step] != null) {
      lead[step] = snapToChord(lead[step] as number, chord);
    }
    if (bass[step] == null && step % 4 === 0) {
      const bassRoot = rootContour[(bar * 2 + Math.floor(stepInBar / 4)) % rootContour.length] ?? (chord[0] ?? 0);
      bass[step] = snapToChord(bassRoot - 12 + routeOrchestration.bassLift, chord);
    } else if (bass[step] != null) {
      bass[step] = snapToChord((bass[step] as number) - 12 + routeOrchestration.bassLift, chord);
    }

    if (arp[step] == null && lead[step] != null && step % 4 === 2) {
      const arpSource = airPhrase[Math.floor(step / 2) % Math.max(1, airPhrase.length)] ?? ((lead[step] as number) + routeOrchestration.arpLift);
      arp[step] = snapToChord(arpSource + routeOrchestration.arpLift, chord);
    } else if (arp[step] != null) {
      arp[step] = snapToChord(arp[step] as number, chord) + routeOrchestration.arpLift;
    }

    if (!kick[step] && step % 8 === 0) kick[step] = true;
    if (!snare[step] && step % 8 === 4) snare[step] = true;
    if (!hat[step] && (step % 2 === 1 || (densityWithTheme > 0.9 && step % 4 !== 0) || (routeOrchestration.hatBias > 1.08 && step % 8 === 3))) hat[step] = true;
    if (!ghost[step] && (step % 8 === 7 || (densityWithTheme > 1.05 && step % 4 === 3) || (routeOrchestration.ghostBias > 1.1 && step % 16 === 11))) ghost[step] = true;
    if (theme.forkBias > 0.28 && stepInBar === 2) {
      snare[step] = true;
      if (arp[step] == null && lead[step] != null) {
        arp[step] = snapToChord((lead[step] as number) + 14, chord);
      }
    } else if (theme.forkBias < -0.28 && stepInBar === 0) {
      kick[step] = true;
      if (bass[step] == null) {
        bass[step] = snapToChord((chord[0] ?? 0) - 17, chord);
      }
    }
    if (routeHighBias && stepInBar === 1) {
      hat[step] = true;
      if (arp[step] == null && lead[step] != null) {
        arp[step] = snapToChord((lead[step] as number) + routeOrchestration.arpLift + routeTravelLift, chord);
      }
    }
    if (routeLowBias && stepInBar === 4) {
      kick[step] = true;
      if (bass[step] == null) {
        bass[step] = snapToChord((chord[0] ?? 0) - 12 + routeTravelLift + routeOrchestration.bassLift, chord);
      }
    }
    if (dominantPhase === 1 && step % 4 === 2) {
      hat[step] = true;
      if (arp[step] == null && lead[step] != null) {
        arp[step] = snapToChord((lead[step] as number) + routeOrchestration.arpLift, chord);
      }
    }
    if (dominantPhase === 2 && stepInBar === stepsPerBar - 1) {
      snare[step] = true;
      accent[step] = Math.max(accent[step], 0.74);
    }
    if (dominantPhase === 0 && stepInBar === 0) {
      kick[step] = true;
      accent[step] = Math.max(accent[step], 0.62);
    }
    if (accent[step] <= 0) {
      const floorAccent = 0.24 + densityWithTheme * 0.06 + energyRatio * 0.08 + theme.accentDensity * 0.08 + theme.syncDensity * 0.06 + routeOrchestration.accentBias;
      accent[step] = lead[step] != null ? floorAccent + 0.14 : floorAccent;
    }
    if (restMask[step]) {
      lead[step] = null;
      arp[step] = null;
      if (step % 4 !== 0) bass[step] = null;
      hat[step] = false;
      ghost[step] = false;
      if (step % 8 !== 0) kick[step] = false;
      if (step % 8 !== 4) snare[step] = false;
      accent[step] = Math.min(accent[step], 0.32);
    }
    const prevTension = tension[(step - 1 + LOOP_STEPS) % LOOP_STEPS] ?? 0;
    if (tension[step] <= 0) {
      tension[step] = clamp(
        (accent[step] - 0.18) * 0.42
        + densityWithTheme * 0.14
        + energyRatio * 0.18
        + prevTension * 0.24
        + Math.abs(theme.tuningBias) * 0.08
        + Math.abs(theme.forkBias) * 0.05
        + Math.max(0, routeOrchestration.harmonicLift - 1) * 0.08
        - theme.restDensity * 0.12,
        0.1,
        1,
      );
    } else {
      tension[step] = clamp(tension[step] + (accent[step] - 0.2) * 0.22, 0.1, 1);
    }
  }

  return {
    lengthSteps: LOOP_STEPS,
    lead,
    arp,
    bass,
    kick,
    snare,
    hat,
    ghost,
    accent,
    tension,
    barRoots,
    barChords,
    swing,
    density: densityWithTheme,
    airRatio,
  };
};
