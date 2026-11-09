/**
 * Platformer audition scheduler: preview arrangement build and pattern scheduling for section/form audition.
 * Extracted from platformerAudio to reduce LOC and keep single responsibility (vision §8, REFLECTION §4).
 */
import type { MutableRefObject } from "react";
import { clamp } from "../../shared/tuning/grid";
import {
  BAR_COUNT,
  buildCompletionArrangement,
  getArrangementModeProfile,
  platformerPitchToFreq,
  snapToChord,
  type CompletionArrangement,
  type CompletionPattern,
  type MovementEvent,
  type PlatformerArrangementForm,
  type PlatformerArrangementMode,
  type PlatformerAuditionSection,
  type PlatformerTuningMode,
} from "./platformerArrangement";
import type { PlatformerSectionBias } from "./platformerSectionBias";

export type PlatformerAuditionMusicRef = {
  movementEvents: MovementEvent[];
  phrase: number[];
  ctx: AudioContext | null;
  filter: BiquadFilterNode | null;
};

export type CreatePlatformerAuditionSchedulerDeps = {
  musicRef: MutableRefObject<PlatformerAuditionMusicRef>;
  playVoice: (
    freq: number,
    type: OscillatorType,
    volume: number,
    duration: number,
    when?: number,
    detuneCents?: number,
  ) => void;
  arrangementMode: PlatformerArrangementMode;
  formMode: PlatformerArrangementForm;
  sectionBias: PlatformerSectionBias;
  arrangementEnergy: number;
  tuningMode: PlatformerTuningMode;
  tempoFollowAmount: number;
};

function scheduleAuditionPattern(
  deps: CreatePlatformerAuditionSchedulerDeps,
  arrangement: CompletionArrangement,
  pattern: CompletionPattern,
  startTime: number,
  stepBeatDur: number,
  startStep: number,
  stepCount: number,
): void {
  const { musicRef, playVoice, arrangementMode, tuningMode } = deps;
  const m = musicRef.current;
  const routeOrchestration = arrangement.theme.routeOrchestration;
  const modeProfile = getArrangementModeProfile(arrangementMode);
  const stepsPerBar = Math.max(1, Math.floor(pattern.lengthSteps / BAR_COUNT));
  const auditionSteps = Math.max(1, Math.min(pattern.lengthSteps, stepCount));

  for (let stepOffset = 0; stepOffset < auditionSteps; stepOffset += 1) {
    const step = (startStep + stepOffset) % pattern.lengthSteps;
    const bar = Math.min(BAR_COUNT - 1, Math.floor(step / stepsPerBar));
    const stepInBar = step % stepsPerBar;
    const chord =
      pattern.barChords[bar] ??
      [
        pattern.barRoots[bar] ?? 0,
        (pattern.barRoots[bar] ?? 0) + 7,
        (pattern.barRoots[bar] ?? 0) + 10,
      ];
    const chordRoot = chord[0] ?? (pattern.barRoots[bar] ?? 0);
    const at =
      startTime +
      stepOffset * stepBeatDur +
      (step % 2 === 1 ? stepBeatDur * pattern.swing : 0);
    const accent = pattern.accent[step] ?? 0.3;
    const tension = pattern.tension[step] ?? accent;
    const leadSemi =
      pattern.lead[step] != null
        ? snapToChord(pattern.lead[step] as number, chord)
        : null;
    const arpSemi =
      pattern.arp[step] != null
        ? snapToChord(pattern.arp[step] as number, chord)
        : null;
    const bassSemi =
      pattern.bass[step] != null
        ? snapToChord(pattern.bass[step] as number, chord)
        : null;

    if (m.filter) {
      const cutoff = clamp(
        1600 +
          tension * 5200 +
          pattern.airRatio * 700 +
          (modeProfile.harmonicLift - 1) * 700 +
          routeOrchestration.filterBias,
        400,
        10000,
      );
      m.filter.frequency.setTargetAtTime(cutoff, at, 0.03);
    }

    if (stepInBar === 0) {
      chord.forEach((semi, idx) => {
        playVoice(
          platformerPitchToFreq(
            92 + pattern.airRatio * 18,
            semi + (idx === 0 ? -12 : 0),
            tuningMode,
          ),
          idx === 1 ? routeOrchestration.padWave : routeOrchestration.answerWave,
          0.012 + accent * 0.014,
          stepBeatDur * Math.max(3.2, stepsPerBar * 0.65),
          at + idx * 0.016,
        );
      });
    }

    if (leadSemi != null) {
      playVoice(
        platformerPitchToFreq(
          108 + arrangement.theme.airDensity * 18,
          leadSemi,
          tuningMode,
        ),
        step % 4 === 0 ? routeOrchestration.leadWave : routeOrchestration.answerWave,
        0.026 + accent * 0.03,
        0.08 + accent * 0.11,
        at,
      );
    }

    if (arpSemi != null && step % 2 === 1) {
      playVoice(
        platformerPitchToFreq(118 + pattern.airRatio * 18, arpSemi + 12, tuningMode),
        routeOrchestration.arpWave,
        0.011 + accent * 0.014,
        0.06,
        at + 0.012,
      );
    }

    if (bassSemi != null && step % 2 === 0) {
      const bassFreq = platformerPitchToFreq(72, bassSemi - 12, tuningMode);
      playVoice(bassFreq, routeOrchestration.bassWave, 0.032 + accent * 0.024, 0.14, at);
      playVoice(
        bassFreq * 0.5,
        routeOrchestration.padWave,
        0.016 + pattern.density * 0.01,
        0.16,
        at,
      );
    } else if (step % 8 === 0) {
      playVoice(
        platformerPitchToFreq(72, chordRoot - 12, tuningMode),
        routeOrchestration.bassWave,
        0.024,
        0.12,
        at,
      );
    }

    if (pattern.kick[step]) {
      playVoice(
        46 + accent * 14,
        routeOrchestration.bassWave,
        (0.06 + accent * 0.03) * routeOrchestration.drumBias,
        0.07,
        at,
      );
    }
    if (pattern.snare[step]) {
      playVoice(
        210 + accent * 120,
        routeOrchestration.answerWave,
        (0.02 + accent * 0.018) * routeOrchestration.drumBias,
        0.06,
        at + 0.01,
      );
      playVoice(
        1500 - accent * 420,
        routeOrchestration.ghostWave,
        0.01 + accent * 0.01,
        0.02,
        at + 0.012,
      );
    }
    if (pattern.hat[step]) {
      playVoice(
        2200 + (step % 4) * 150,
        routeOrchestration.ghostWave,
        (0.006 + accent * 0.008) * routeOrchestration.hatBias,
        0.016,
        at + 0.01,
      );
    }
    if (pattern.ghost[step]) {
      playVoice(
        860 + tension * 900 + (step % 4) * 70,
        routeOrchestration.ghostWave,
        (0.005 + tension * 0.008) * routeOrchestration.ghostBias,
        0.028,
        at + 0.018,
      );
    }
  }
}

export function createPlatformerAuditionScheduler(deps: CreatePlatformerAuditionSchedulerDeps): {
  auditionPreviewSection: (section: PlatformerAuditionSection, bpm: number) => boolean;
  auditionPreviewForm: (bpm: number) => boolean;
} {
  const {
    musicRef,
    arrangementMode,
    formMode,
    sectionBias,
    arrangementEnergy,
    tempoFollowAmount,
  } = deps;

  const buildPreviewArrangement = (bpm: number): CompletionArrangement | null => {
    const m = musicRef.current;
    if (m.movementEvents.length === 0) return null;
    const melodic = m.movementEvents
      .filter((event) => event.kind !== "motion")
      .map((event) => event.semi);
    const fallbackPhrase =
      melodic.length > 0
        ? melodic.slice(-24)
        : m.phrase.length > 0
          ? [...m.phrase]
          : [];
    if (fallbackPhrase.length === 0) return null;
    const controlBpm = clamp(bpm, 50, 200);
    return buildCompletionArrangement(
      m.movementEvents,
      fallbackPhrase.length > 0 ? fallbackPhrase : [0, 3, 7, 10],
      60 / controlBpm / 2,
      arrangementMode,
      arrangementEnergy,
      formMode,
      sectionBias,
    );
  };

  const auditionPreviewSection = (
    section: PlatformerAuditionSection,
    bpm: number,
  ): boolean => {
    const ctx = musicRef.current.ctx;
    if (!ctx) return false;
    const arrangement = buildPreviewArrangement(bpm);
    if (!arrangement) return false;
    const sectionId = section === "A" ? 0 : section === "B" ? 1 : 2;
    const pattern = arrangement.sections[sectionId] ?? arrangement.sections[0];
    if (!pattern) return false;
    const blendedBpm = clamp(
      clamp(bpm, 50, 200) * (1 - tempoFollowAmount) +
        arrangement.targetBpm * tempoFollowAmount,
      50,
      200,
    );
    scheduleAuditionPattern(
      deps,
      arrangement,
      pattern,
      ctx.currentTime + 0.05,
      60 / blendedBpm / 2,
      0,
      Math.max(8, Math.floor(pattern.lengthSteps / BAR_COUNT)),
    );
    return true;
  };

  const auditionPreviewForm = (bpm: number): boolean => {
    const ctx = musicRef.current.ctx;
    if (!ctx) return false;
    const arrangement = buildPreviewArrangement(bpm);
    if (!arrangement) return false;
    const blendedBpm = clamp(
      clamp(bpm, 50, 200) * (1 - tempoFollowAmount) +
        arrangement.targetBpm * tempoFollowAmount,
      50,
      200,
    );
    const stepBeatDur = 60 / blendedBpm / 2;
    const stepCount = Math.max(
      8,
      Math.floor(arrangement.sectionLengthSteps / BAR_COUNT),
    );
    let cursor = ctx.currentTime + 0.05;
    arrangement.order.slice(0, 4).forEach((sectionId, index) => {
      const pattern = arrangement.sections[sectionId] ?? arrangement.sections[0];
      if (!pattern) return;
      scheduleAuditionPattern(
        deps,
        arrangement,
        pattern,
        cursor,
        stepBeatDur,
        (index * stepCount) % pattern.lengthSteps,
        stepCount,
      );
      cursor += stepBeatDur * stepCount + 0.06;
    });
    return true;
  };

  return { auditionPreviewSection, auditionPreviewForm };
}
