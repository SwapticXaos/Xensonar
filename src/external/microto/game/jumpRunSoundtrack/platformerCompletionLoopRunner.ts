/**
 * Platformer completion loop: runs the armed completion arrangement (intro + main loop).
 * Extracted from platformerAudio to reduce LOC and single-responsibility (STRUCTURE; vision §6 §8).
 */
import type { MutableRefObject } from "react";
import { clamp } from "../../shared/tuning/grid";
import {
  BAR_COUNT,
  buildCompletionArrangement,
  buildCompletionIntroPattern,
  createCycleMutation,
  getArrangementModeProfile,
  platformerPitchToFreq,
  snapToChord,
  type CompletionArrangement,
  type CompletionIntroPattern,
  type CompletionPattern,
  type CompletionTheme,
  type PlatformerArrangementForm,
  type PlatformerArrangementMode,
  type PlatformerTuningMode,
} from "./platformerArrangement";
import type { PlatformerSectionBias } from "./platformerSectionBias";

export type CompletionLoopState = {
  ctx: AudioContext | null;
  completionPhrase: number[];
  phrase: number[];
  completionLoopArmed: boolean;
  completionArrangement: CompletionArrangement | null;
  completionTheme: CompletionTheme | null;
  completionIntroPattern: CompletionIntroPattern | null;
  nextCompletionIntroAt: number;
  completionIntroStep: number;
  completionIntroComplete: boolean;
  nextCompletionAt: number;
  completionStep: number;
  completionPattern: CompletionPattern | null;
  completionCyclePattern: CompletionPattern | null;
  completionCycleKey: string;
  movementEvents: import("./platformerArrangement").MovementEvent[];
  filter: BiquadFilterNode | null;
};

export type PlayVoiceFn = (
  freq: number,
  type: OscillatorType,
  volume: number,
  duration: number,
  when?: number,
  detuneCents?: number,
) => void;

export type CreateCompletionLoopRunnerOpts = {
  musicRef: MutableRefObject<CompletionLoopState>;
  playVoice: PlayVoiceFn;
  arrangementMode: PlatformerArrangementMode;
  formMode: PlatformerArrangementForm;
  sectionBias: PlatformerSectionBias;
  arrangementEnergy: number;
  tempoFollowAmount: number;
  tuningMode: PlatformerTuningMode;
};

export function createCompletionLoopRunner(opts: CreateCompletionLoopRunnerOpts): {
  scheduleCompletionLoop: (bpm: number) => void;
} {
  const {
    musicRef,
    playVoice,
    arrangementMode,
    formMode,
    sectionBias,
    arrangementEnergy,
    tempoFollowAmount,
    tuningMode,
  } = opts;

  const scheduleCompletionLoop = (bpm: number) => {
    const m = musicRef.current;
    const ctx = m.ctx;
    if (!ctx || !m.completionLoopArmed) return;
    const modeProfile = getArrangementModeProfile(arrangementMode);
    const fallbackPhrase = m.completionPhrase.length > 0 ? m.completionPhrase : m.phrase;
    if (fallbackPhrase.length === 0) return;

    const controlBpm = clamp(bpm, 50, 200);
    const seedBeatDur = 60 / controlBpm / 2;
    if (!m.completionArrangement) {
      m.completionArrangement = buildCompletionArrangement(
        m.movementEvents,
        fallbackPhrase,
        seedBeatDur,
        arrangementMode,
        arrangementEnergy,
        formMode,
        sectionBias,
      );
      m.completionPattern = m.completionArrangement.sections[0] ?? null;
    }
    const arrangement = m.completionArrangement;
    if (!arrangement || arrangement.sections.length === 0) return;
    if (!m.completionTheme) {
      m.completionTheme = arrangement.theme;
    }
    const routeOrchestration = (m.completionTheme ?? arrangement.theme).routeOrchestration;
    const blendedBpm = clamp(
      controlBpm * (1 - tempoFollowAmount) + arrangement.targetBpm * tempoFollowAmount,
      50,
      200,
    );
    const beatDur = 60 / blendedBpm / 2;

    if (!m.completionIntroPattern) {
      m.completionIntroPattern = buildCompletionIntroPattern(
        m.completionTheme ?? arrangement.theme,
        fallbackPhrase,
      );
    }

    if (!m.completionIntroComplete) {
      const intro = m.completionIntroPattern;
      if (intro && m.nextCompletionIntroAt <= 0) {
        m.nextCompletionIntroAt = ctx.currentTime + beatDur * 0.25;
      }

      while (intro && m.nextCompletionIntroAt <= ctx.currentTime + 0.16 && !m.completionIntroComplete) {
        const step = m.completionIntroStep;
        const bar = Math.min(intro.chordRoots.length - 1, Math.floor(step / 8));
        const chordRoot = intro.chordRoots[bar] ?? 0;
        const chordBar = Math.min(BAR_COUNT - 1, bar * 4);
        const chord =
          arrangement.sections[0]?.barChords[chordBar]
          ?? [chordRoot, chordRoot + 7, chordRoot + 10];
        const accent = intro.accent[step] ?? 0.3;
        const at = m.nextCompletionIntroAt + (step % 2 === 1 ? beatDur * (0.03 + arrangement.theme.airDensity * 0.12) : 0);

        if (step % 8 === 0) {
          chord.forEach((semi, idx) => {
            playVoice(
              platformerPitchToFreq(94 + arrangement.theme.laneCenter * 28, semi, tuningMode),
              idx === 1 ? routeOrchestration.padWave : routeOrchestration.answerWave,
              0.014 + accent * 0.016,
              beatDur * 2.6,
              at + idx * 0.018,
            );
          });
        }

        const leadSemi = intro.lead[step] != null ? snapToChord(intro.lead[step] as number, chord) : null;
        const answerSemi = intro.answer[step] != null ? snapToChord(intro.answer[step] as number, chord) : null;
        const bassSemi = intro.bass[step] != null ? snapToChord(intro.bass[step] as number, chord) : null;

        if (leadSemi != null) {
          playVoice(
            platformerPitchToFreq(108 + arrangement.theme.airDensity * 18, leadSemi, tuningMode),
            step % 4 === 0 ? routeOrchestration.leadWave : routeOrchestration.answerWave,
            0.03 + accent * 0.036,
            0.11 + accent * 0.16,
            at,
          );
        }
        if (answerSemi != null) {
          playVoice(
            platformerPitchToFreq(118 + arrangement.theme.airDensity * 24, answerSemi, tuningMode),
            routeOrchestration.answerWave,
            0.018 + accent * 0.022,
            0.08 + accent * 0.09,
            at + 0.022,
          );
        }
        if (bassSemi != null) {
          const bassFreq = platformerPitchToFreq(72, bassSemi, tuningMode);
          playVoice(bassFreq, routeOrchestration.bassWave, 0.032 + accent * 0.024, 0.14 + accent * 0.1, at);
          playVoice(bassFreq * 0.5, routeOrchestration.padWave, 0.018 + arrangement.theme.strideDensity * 0.012, 0.18, at);
        }
        if (accent > 0.32) {
          playVoice(52 + accent * 18, routeOrchestration.bassWave, 0.05 + accent * 0.025, 0.07, at);
        }
        if (accent > 0.5 && step % 4 === 2) {
          playVoice(1500 - accent * 360, routeOrchestration.ghostWave, 0.01 + accent * 0.015, 0.024, at + 0.012);
        }

        m.completionIntroStep += 1;
        m.nextCompletionIntroAt += beatDur;
        if (m.completionIntroStep >= intro.lengthSteps) {
          m.completionIntroComplete = true;
          m.nextCompletionAt = Math.max(m.nextCompletionAt, m.nextCompletionIntroAt + beatDur * 0.25);
        }
      }

      if (!m.completionIntroComplete) {
        return;
      }
    }

    if (m.nextCompletionAt <= 0) {
      m.nextCompletionAt = ctx.currentTime + beatDur * 0.5;
    }

    while (m.nextCompletionAt <= ctx.currentTime + 0.16) {
      const sectionLength = Math.max(1, arrangement.sectionLengthSteps);
      const sectionCycle = Math.floor(m.completionStep / sectionLength);
      const formIndex = sectionCycle % arrangement.order.length;
      const sectionId = arrangement.order[formIndex] ?? 0;
      const sectionBase = arrangement.sections[sectionId] ?? arrangement.sections[0];
      const cycleKey = `${sectionCycle}:${sectionId}`;
      if (m.completionCycleKey !== cycleKey || !m.completionCyclePattern) {
        m.completionCyclePattern = createCycleMutation(
          sectionBase,
          sectionCycle,
          arrangement.seed,
          arrangement.complexity,
          arrangementMode,
          arrangementEnergy,
          arrangement.theme.routeOrchestration,
        );
        m.completionCycleKey = cycleKey;
      }
      const pattern = m.completionCyclePattern ?? sectionBase;
      const cycleTempo = clamp(
        blendedBpm
        * (1
          + (pattern.density - 0.8) * 0.04
          + Math.sin(sectionCycle * 0.65 + sectionId) * (0.014 + arrangementEnergy * 0.016)
          + (arrangementMode === "glitch" ? Math.cos(sectionCycle * 0.55 + sectionId) * 0.006 : 0)),
        48,
        205,
      );
      const stepBeatDur = 60 / cycleTempo / 2;
      const step = m.completionStep % sectionLength;
      const cyclePhase = (sectionCycle + sectionId) % 4;
      const sectionBoundary = step === 0 && m.completionStep > 0;
      if (sectionBoundary) {
        const prevFormIndex = (formIndex - 1 + arrangement.order.length) % arrangement.order.length;
        const prevSectionId = arrangement.order[prevFormIndex] ?? sectionId;
        if (prevSectionId !== sectionId) {
          const markerChord = pattern.barChords[0] ?? [0, 7, 10];
          markerChord.forEach((semi, idx) => {
            playVoice(
              platformerPitchToFreq(118, semi, tuningMode),
              idx % 2 === 0 ? routeOrchestration.leadWave : routeOrchestration.answerWave,
              0.03 + arrangementEnergy * 0.018,
              0.18,
              m.nextCompletionAt + idx * 0.015,
            );
          });
        } else {
          playVoice(180 + sectionId * 24, routeOrchestration.ghostWave, 0.014 + arrangementEnergy * 0.012, 0.06, m.nextCompletionAt);
        }
        const riserEnergy = clamp(0.5 + pattern.density * 0.16 + pattern.airRatio * 0.2, 0.4, 1);
        const riserBase = 260 + sectionId * 40;
        for (let i = 0; i < 3; i += 1) {
          playVoice(
            riserBase + i * 110,
            arrangementMode === "cinematic" ? routeOrchestration.answerWave : routeOrchestration.leadWave,
            0.01 + riserEnergy * (0.01 + arrangementEnergy * 0.01),
            0.08 + i * 0.03,
            m.nextCompletionAt + i * 0.022,
          );
        }
      }

      m.completionPattern = pattern;
      const stepsPerBar = Math.max(1, Math.floor(pattern.lengthSteps / BAR_COUNT));
      const bar = Math.min(BAR_COUNT - 1, Math.floor(step / stepsPerBar));
      const stepInBar = step % stepsPerBar;
      const chord = pattern.barChords[bar] ?? [pattern.barRoots[bar] ?? 0, (pattern.barRoots[bar] ?? 0) + 7, (pattern.barRoots[bar] ?? 0) + 10];
      const chordRoot = chord[0] ?? (pattern.barRoots[bar] ?? 0);
      const swingOffset = step % 2 === 1 ? stepBeatDur * pattern.swing : 0;
      const at = m.nextCompletionAt + swingOffset;
      const stepAccent = pattern.accent[step] ?? 0.35;
      const tensionLevel = pattern.tension[step] ?? stepAccent;
      const leadSemi = pattern.lead[step] != null ? snapToChord(pattern.lead[step] as number, chord) : null;
      const arpSemi = pattern.arp[step] != null ? snapToChord(pattern.arp[step] as number, chord) : null;
      const bassSemi = pattern.bass[step] != null ? snapToChord(pattern.bass[step] as number, chord) : null;
      const phaseGain = (cyclePhase === 0 ? 0.92 : cyclePhase === 1 ? 1 : cyclePhase === 2 ? 1.08 : 0.95) * (0.92 + arrangementEnergy * 0.2);

      if (m.filter) {
        const cutoff = clamp(
          1700 + tensionLevel * 6400 + pattern.airRatio * 900 + cyclePhase * 220 + (modeProfile.harmonicLift - 1) * 900 + routeOrchestration.filterBias,
          400,
          12000,
        );
        m.filter.frequency.setTargetAtTime(cutoff, at, 0.035);
        m.filter.Q.setTargetAtTime(clamp(0.7 + tensionLevel * 4.3, 0.5, 9), at, 0.04);
      }

      if (stepInBar === 0) {
        const padRoot = 84 + pattern.airRatio * 14 + cyclePhase * 2;
        chord.forEach((semi, idx) => {
          const padSemi = semi + (idx === 0 ? -12 : 0) + (cyclePhase === 2 ? 12 : 0);
          playVoice(
            platformerPitchToFreq(padRoot, padSemi, tuningMode),
            idx === 1 ? routeOrchestration.padWave : routeOrchestration.answerWave,
            (0.01 + stepAccent * 0.014) * (idx === 0 ? 1 : 0.85),
            stepBeatDur * stepsPerBar * 0.85,
            at + idx * 0.02,
          );
        });
      }

      if (leadSemi != null) {
        const melodicSemi = cyclePhase === 2 && stepInBar === 0 ? leadSemi + 12 : leadSemi;
        const root = 104 + (pattern.airRatio * 16) + 10 * Math.sin((Math.PI * 2 * bar) / BAR_COUNT);
        const leadWave: OscillatorType =
          arrangementMode === "cinematic"
            ? (step % 8 === 0 ? routeOrchestration.leadWave : routeOrchestration.answerWave)
            : cyclePhase === 3
              ? routeOrchestration.answerWave
              : step % 8 === 0
                ? routeOrchestration.leadWave
                : step % 2 === 0
                  ? routeOrchestration.answerWave
                  : routeOrchestration.ghostWave;
        const freq = platformerPitchToFreq(root, melodicSemi, tuningMode);
        const leadVol = (0.038 + stepAccent * 0.056 + tensionLevel * 0.018 + (modeProfile.harmonicLift - 1) * 0.01) * phaseGain;
        const leadDur = 0.08 + stepAccent * 0.14 + pattern.density * 0.025 + tensionLevel * 0.03 + (arrangementMode === "cinematic" ? 0.04 : 0);
        playVoice(freq, leadWave, leadVol, leadDur, at);
        if (stepInBar === stepsPerBar - 1 && cyclePhase === 3) {
          playVoice(freq * 2, routeOrchestration.ghostWave, 0.022 + stepAccent * 0.025, 0.06, at + 0.02);
        }
        if (stepInBar === stepsPerBar - 2 && sectionCycle > 0) {
          const responseFreq = platformerPitchToFreq(root - 10, melodicSemi + (sectionCycle % 2 === 0 ? -5 : routeOrchestration.responseShift), tuningMode);
          playVoice(responseFreq, routeOrchestration.answerWave, 0.012 + tensionLevel * 0.015, 0.08, at + 0.028);
        }
      }

      if (arpSemi != null && cyclePhase !== 0 && step % 2 === 1) {
        const arpFreq = platformerPitchToFreq(118 + pattern.airRatio * 20, arpSemi + (cyclePhase === 2 ? 12 : 0), tuningMode);
        playVoice(
          arpFreq,
          arrangementMode === "glitch" ? routeOrchestration.ghostWave : routeOrchestration.arpWave,
          0.013 + stepAccent * 0.018 + tensionLevel * 0.009 + (modeProfile.harmonicLift - 1) * 0.005,
          arrangementMode === "cinematic" ? 0.1 : 0.06,
          at + 0.015,
        );
      }

      if (bassSemi != null && (step % 2 === 0 || (cyclePhase === 2 && step % 4 === 3))) {
        const bassFreq = platformerPitchToFreq(72, bassSemi - 12, tuningMode);
        playVoice(bassFreq, routeOrchestration.bassWave, (0.04 + stepAccent * 0.03 + tensionLevel * 0.01) * phaseGain, 0.16 + stepAccent * 0.1, at);
        playVoice(bassFreq * 0.5, routeOrchestration.padWave, 0.022 + pattern.density * 0.012, 0.18, at);
      } else if (step % 8 === 0) {
        const fallbackBass = platformerPitchToFreq(72, chordRoot - 12, tuningMode);
        playVoice(fallbackBass, routeOrchestration.bassWave, 0.028, 0.13, at);
      }

      const kickOn = pattern.kick[step] || (cyclePhase === 3 && stepInBar === 0) || (arrangementMode === "percussive" && step % 4 === 0);
      const snareOn = pattern.snare[step] || (cyclePhase === 2 && stepInBar === stepsPerBar - 2);
      const hatOn = pattern.hat[step] && (cyclePhase !== 0 || step % 4 === 1 || arrangementMode !== "cinematic");

      if (kickOn) {
        playVoice(46 + stepAccent * 16, routeOrchestration.bassWave, (0.08 + stepAccent * 0.045) * modeProfile.drumBias * routeOrchestration.drumBias, 0.08, at);
      }
      if (snareOn) {
        playVoice(220 + stepAccent * 140, routeOrchestration.answerWave, (0.026 + stepAccent * 0.02) * modeProfile.drumBias * routeOrchestration.drumBias, 0.07, at + 0.01);
        playVoice(1650 - stepAccent * 620, routeOrchestration.ghostWave, (0.011 + stepAccent * 0.012) * modeProfile.drumBias * routeOrchestration.drumBias, 0.024, at + 0.012);
      }
      if (hatOn) {
        const hatVol = (0.006 + stepAccent * 0.01) * (0.9 + pattern.density * 0.15) * modeProfile.hatBias * routeOrchestration.hatBias;
        playVoice(2400 + (step % 4) * 170, routeOrchestration.ghostWave, hatVol, 0.018, at + 0.014);
      }
      if (pattern.ghost[step] && (cyclePhase !== 0 || step % 8 === 3 || arrangementMode === "cinematic")) {
        const ghostFreq = 880 + tensionLevel * 1200 + (step % 4) * 90;
        playVoice(ghostFreq, routeOrchestration.ghostWave, (0.006 + tensionLevel * 0.01) * routeOrchestration.ghostBias, 0.03, at + 0.02);
      }

      m.completionStep += 1;
      m.nextCompletionAt += stepBeatDur;
    }
  };

  return { scheduleCompletionLoop };
}
