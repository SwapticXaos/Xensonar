import type { MutableRefObject } from "react";
import { RUN_EDOS, MICRO_RATIOS } from "../resonance/config/constants";
import type { PlayOneShotTone } from "../audio";
import { nextGameChaos } from "./arenaPhysics";
import type { ArenaGameState } from "./arenaState";

export type ArenaSoundCallbacks = {
  playPlayerShotMotif(anchorRatio: number): void;
  playOrbShotSound(anchorRatio: number, phase: string): void;
  playOrbHitSound(anchorRatio: number): void;
  playPlayerHitSound(anchorRatio: number): void;
  playHeartPickupChord(anchorRatio: number): void;
};

/**
 * Shared arena sound policy for Irrlicht Arena.
 * Keeps tone construction and hybrid JI/EDO frequency mapping out of the hook.
 */
export function createArenaSoundCallbacks(
  gameRefs: MutableRefObject<ArenaGameState>,
  clampFreq: (f: number, min: number, max: number) => number,
  playScheduledTone: PlayOneShotTone,
): ArenaSoundCallbacks {
  const edoFreq = (base: number, edo: number, step: number) => base * Math.pow(2, step / edo);

  const hybridFreq = (base: number, anchorRatio: number, register: number) => {
    const state = gameRefs.current;
    const c = nextGameChaos(state);
    const edo = RUN_EDOS[Math.floor(c * RUN_EDOS.length) % RUN_EDOS.length];
    const ratio = MICRO_RATIOS[Math.floor((c * 1000 + state.shotCount * 3) % MICRO_RATIOS.length)];
    const edoSpan = Math.max(4, Math.floor(edo * 0.78));
    const step = Math.floor((c * 997 + state.shotCount * 5) % edoSpan);
    const anchorBase = base * anchorRatio * Math.pow(2, register);
    const jiCandidate = anchorBase * ratio;
    const edoCandidate = edoFreq(anchorBase, edo, step);
    const blend = 0.28 + c * 0.48;
    return clampFreq(jiCandidate * (1 - blend) + edoCandidate * blend, 50, 2600);
  };

  const playPlayerShotMotif = (anchorRatio: number) => {
    const state = gameRefs.current;
    const c = nextGameChaos(state);
    const root = clampFreq(145 + 120 * c, 120, 480);
    const waveA: OscillatorType = c > 0.7 ? "sawtooth" : "square";
    const waveB: OscillatorType = c < 0.28 ? "sine" : "triangle";
    const f1 = hybridFreq(root, anchorRatio, c > 0.62 ? 0 : -1);
    const f2 = hybridFreq(root * 1.18, anchorRatio, 0);
    const f3 = hybridFreq(root * 0.92, anchorRatio, -1);
    const f4 = hybridFreq(root * 1.07, anchorRatio, 1);

    playScheduledTone(f1, 0, 0.075 + c * 0.03, waveA, 0.037 + c * 0.012, 2.2, 1700 + c * 1000);
    playScheduledTone(f2, 0.036, 0.09 + c * 0.03, waveB, 0.03 + c * 0.012, 2.5, 1300 + c * 900);
    if (state.shotCount % 2 === 0 || c > 0.63) {
      playScheduledTone(f3, 0.082, 0.1 + c * 0.05, "sine", 0.025 + c * 0.01, 1.9, 1200 + c * 700);
    }
    if (state.shotCount % 5 === 0 && c > 0.34) {
      playScheduledTone(f4, 0.118, 0.08 + c * 0.04, "triangle", 0.018 + c * 0.012, 2, 1800 + c * 1100);
    }
    state.shotCount += 1;
  };

  const playOrbShotSound = (anchorRatio: number, phase: string) => {
    const state = gameRefs.current;
    const c = nextGameChaos(state);
    const bloom = phase === "Radiant" ? 1.42 : phase === "Unstable" ? 1.22 : 1.08;
    const base = hybridFreq(110 + c * 90, anchorRatio * bloom, -1);
    const overtone = hybridFreq(180 + c * 140, anchorRatio * (1.2 + c * 0.3), 0);
    playScheduledTone(base, 0, 0.11 + c * 0.05, "triangle", 0.043 + c * 0.012, 2.6, 920 + c * 780);
    playScheduledTone(overtone, 0.028, 0.07 + c * 0.04, c > 0.56 ? "square" : "sine", 0.024 + c * 0.011, 1.7, 1500 + c * 1200);
  };

  const playOrbHitSound = (anchorRatio: number) => {
    const state = gameRefs.current;
    const c = nextGameChaos(state);
    const base = hybridFreq(210 + c * 220, anchorRatio, 0);
    const shardA = hybridFreq(320 + c * 200, anchorRatio * 1.11, 0);
    const shardB = hybridFreq(460 + c * 260, anchorRatio * 0.94, 1);
    playScheduledTone(base, 0, 0.1 + c * 0.04, "sine", 0.055 + c * 0.014, 2.8, 1800 + c * 1400);
    playScheduledTone(shardA, 0.026, 0.09 + c * 0.05, c > 0.65 ? "square" : "triangle", 0.034 + c * 0.016, 2.2, 1700 + c * 1300);
    playScheduledTone(shardB, 0.062, 0.11 + c * 0.05, "sine", 0.026 + c * 0.014, 1.9, 1500 + c * 1200);
  };

  const playPlayerHitSound = (anchorRatio: number) => {
    const state = gameRefs.current;
    const c = nextGameChaos(state);
    const base = hybridFreq(58 + c * 36, anchorRatio * (0.88 + c * 0.2), -2);
    const growl = hybridFreq(78 + c * 40, anchorRatio * 0.76, -2);
    const undertow = hybridFreq(96 + c * 28, anchorRatio * 1.03, -1);
    playScheduledTone(base, 0, 0.25 + c * 0.15, "sawtooth", 0.07 + c * 0.03, 3.8, 420 + c * 260);
    playScheduledTone(growl, 0.04, 0.3 + c * 0.16, "triangle", 0.064 + c * 0.024, 4.2, 350 + c * 220);
    playScheduledTone(undertow, 0.09, 0.2 + c * 0.08, "sine", 0.032 + c * 0.016, 2.3, 660 + c * 260);
  };

  const playHeartPickupChord = (anchorRatio: number) => {
    const state = gameRefs.current;
    const c = nextGameChaos(state);
    const root = clampFreq(210 + c * 130, 160, 780) * anchorRatio;
    const chordSets: number[][] = [
      [1, 5 / 4, 3 / 2],
      [1, 6 / 5, 3 / 2],
      [1, 4 / 3, 5 / 3],
      [1, 7 / 6, 14 / 9],
      [1, 9 / 8, 15 / 8],
    ];
    const set = chordSets[Math.floor((c * 100 + state.totalScore) % chordSets.length)];
    const edo = RUN_EDOS[Math.floor((c * 1000 + state.level) % RUN_EDOS.length)];
    const edoOffset = Math.floor((c * 17 + state.shotCount) % 5) - 2;
    const edoRatio = Math.pow(2, edoOffset / edo);
    const register = c > 0.55 ? 0 : -1;
    set.forEach((ratio, idx) => {
      const voice = clampFreq(root * ratio * edoRatio * Math.pow(2, register), 120, 2000);
      playScheduledTone(voice, idx * 0.045, 0.28 + c * 0.12, idx === 0 ? "triangle" : "sine", 0.042 - idx * 0.007, 1.7, 1700 + idx * 260 + c * 500);
    });
  };

  return {
    playPlayerShotMotif,
    playOrbShotSound,
    playOrbHitSound,
    playPlayerHitSound,
    playHeartPickupChord,
  };
}

