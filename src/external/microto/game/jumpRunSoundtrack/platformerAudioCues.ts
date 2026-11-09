/**
 * Platformer audio cues: game event → sound + movement recording.
 * Extracted from platformerAudio to reduce LOC and clarify boundary (STRUCTURE opt #77).
 */
import type { MutableRefObject } from "react";
import { clamp } from "../../shared/tuning/grid";
import { SCALE, CHORDS, WORLD_W, MAX_SPEED, type Coin } from "./platformerState";
import type { PlatformerPuzzleToken } from "./platformerAdventure";
import {
  getPlatformerModeShiftSemis,
  getPlatformerNpcOrbSemi,
  getPlatformerTriadSemis,
  type PlatformerNpcNoteOrb,
} from "./platformerNpcMusic";
import { clampPhaseIndex, clampSemi, platformerPitchToFreq } from "./platformerArrangement";
import type { MusicState } from "./platformerAudio";
import type { PlatformerComposerObstacleHit } from "./platformerAudio";
import type { MovementEventKind, PlatformerTuningMode } from "./platformerArrangement";

export type PlayVoiceFn = (
  freq: number,
  type: OscillatorType,
  volume: number,
  duration: number,
  when?: number,
  detuneCents?: number,
) => void;

export type PlatformerAudioCuesOpts = {
  musicRef: MutableRefObject<MusicState>;
  playVoice: PlayVoiceFn;
  pushPhrase: (semi: number) => void;
  recordMovementEvent: (
    kind: MovementEventKind,
    semi: number,
    energy: number,
    lane?: number,
    airborne?: boolean,
    detail?: number,
  ) => void;
  tuningMode: PlatformerTuningMode;
};

export type PlatformerAudioCues = {
  playJumpCue: () => void;
  playLandCue: (energy: number) => void;
  playStepCue: (x: number, speed: number) => void;
  playCoinCue: (coin: Coin, modeShift: number, nextModeShift?: number) => void;
  playNpcOrbCue: (orb: PlatformerNpcNoteOrb, modeShift: number) => void;
  playPuzzleStepCue: (target: PlatformerPuzzleToken, stepIndex: number, success: boolean) => void;
  playGateUnlockCue: (label: string) => void;
  playCheckpointChord: (milestone: number) => void;
  playFallCue: () => void;
  captureComposerObstacleHit: (hit: PlatformerComposerObstacleHit) => void;
};

export function createPlatformerAudioCues(opts: PlatformerAudioCuesOpts): PlatformerAudioCues {
  const { musicRef, playVoice, pushPhrase, recordMovementEvent, tuningMode } = opts;

  const playJumpCue = () => {
    const root = 155;
    playVoice(root, "triangle", 0.12, 0.11);
    playVoice(root * 1.5, "sine", 0.08, 0.15, undefined, 4);
    pushPhrase(7);
    recordMovementEvent("jump", 7, 0.9);
  };

  const playLandCue = (energy: number) => {
    const thump = 70 + energy * 30;
    playVoice(thump, "sine", 0.12, 0.12);
    playVoice(thump * 2, "triangle", 0.05, 0.09);
    pushPhrase(0);
    recordMovementEvent("land", 0, energy);
  };

  const playCoinCue = (coin: Coin, modeShift: number, nextModeShift = modeShift) => {
    const lane = Math.floor((coin.x / WORLD_W) * SCALE.length) % SCALE.length;
    const now = musicRef.current.ctx?.currentTime;

    if (coin.kind === "mushroom") {
      const shiftSemis = getPlatformerModeShiftSemis(lane, nextModeShift);
      shiftSemis.forEach((semi, index) => {
        const at = now != null ? now + index * 0.055 : undefined;
        playVoice(
          platformerPitchToFreq(122 + nextModeShift * 4, semi, tuningMode),
          index === 1 ? "triangle" : "sine",
          0.08 + (2 - index) * 0.01,
          0.12 + index * 0.03,
          at,
          index === 2 ? 6 : 0,
        );
        pushPhrase(semi);
        recordMovementEvent("mode_shift", semi, clamp(0.9 - index * 0.08, 0.2, 1), lane, false, nextModeShift);
      });
      return;
    }

    const triadSemis = getPlatformerTriadSemis(coin.kind, lane, modeShift);
    const accentWave: OscillatorType = coin.kind === "coin_red" ? "sine" : "square";
    const accentDetail = coin.kind === "coin_red" ? 1 : -1;
    triadSemis.forEach((semi, index) => {
      const at = now != null ? now + index * 0.04 : undefined;
      playVoice(
        platformerPitchToFreq(130 + lane * 2, semi, tuningMode),
        index === 0 ? "triangle" : accentWave,
        0.11 - index * 0.018,
        0.11 + index * 0.025,
        at,
        index * 4,
      );
      pushPhrase(semi);
      recordMovementEvent("coin", semi, clamp(0.94 - index * 0.08, 0.2, 1), lane, false, accentDetail);
    });
  };

  const playNpcOrbCue = (orb: PlatformerNpcNoteOrb, modeShift: number) => {
    const semi = getPlatformerNpcOrbSemi(orb, modeShift);
    const now = musicRef.current.ctx?.currentTime;
    const disposition = orb.disposition ?? "mirror";
    const tarotOrientation = orb.tarotOrientation ?? "upright";
    const draftMotif = orb.draftMotif ?? [0, 5, 7, 12];
    const draftLift = draftMotif[orb.noteIndex % draftMotif.length] ?? 0;
    const memoryEchoSemi = clamp(orb.memoryEchoSemi ?? 0, -12, 12);
    const mirrorFacet = orb.mirrorFacet ?? "momentum";
    const leadWaveBase: OscillatorType =
      disposition === "guide"
        ? "sine"
        : disposition === "trickster"
          ? "sawtooth"
          : orb.throwStyle === "fan"
            ? "sine"
            : orb.throwStyle === "drift"
              ? "square"
            : orb.throwStyle === "skip"
              ? "sawtooth"
              : "triangle";
    const leadWave: OscillatorType =
      tarotOrientation === "reversed" && leadWaveBase === "sine" ? "triangle" : leadWaveBase;
    const companionInterval =
      disposition === "guide"
        ? (tarotOrientation === "upright" ? 7 : 5) + Math.round(draftLift * 0.18)
        : disposition === "trickster"
          ? (tarotOrientation === "upright" ? 8 : 6) + Math.round(draftLift * 0.22)
          : orb.noteIndex % 2 === 0
            ? (tarotOrientation === "upright" ? -5 : -6) + Math.round(draftLift * 0.12)
            : (tarotOrientation === "upright" ? 5 : 6) + Math.round(draftLift * 0.12);
    playVoice(
      platformerPitchToFreq(136 + orb.lane * 3, semi, tuningMode),
      leadWave,
      0.1,
      0.16,
      now,
      mirrorFacet === "precision"
        ? 4
        : mirrorFacet === "repetition"
          ? -4
          : mirrorFacet === "airtime"
            ? 9
            : 0,
    );
    playVoice(
      platformerPitchToFreq(146 + orb.lane * 2, semi + companionInterval, tuningMode),
      disposition === "trickster" ? "square" : "sine",
      disposition === "guide" ? 0.034 : 0.042,
      0.18,
      now != null ? now + 0.02 : undefined,
      disposition === "mirror"
        ? (tarotOrientation === "upright" ? 12 : -12) + memoryEchoSemi
        : orb.throwStyle === "drift"
          ? tarotOrientation === "upright" ? 8 : -8
          : tarotOrientation === "reversed" ? -6 : 0,
    );
    if (draftMotif.length > 0 && now != null) {
      playVoice(
        platformerPitchToFreq(122 + orb.lane * 2, semi + Math.round(draftLift * 0.6), tuningMode),
        disposition === "guide" ? "triangle" : "sine",
        0.016 + (mirrorFacet === "recovery" ? 0.01 : 0),
        0.11,
        now + 0.045,
        memoryEchoSemi * 2,
      );
    }
    pushPhrase(semi);
    recordMovementEvent(
      "npc_orb",
      semi,
      disposition === "guide" ? 0.82 : disposition === "trickster" ? 0.96 : 0.9,
      orb.lane,
      true,
      clamp(orb.rootOffset + (orb.pitchBias ?? 0), -8, 8),
    );
  };

  const playPuzzleStepCue = (target: PlatformerPuzzleToken, stepIndex: number, success: boolean) => {
    const now = musicRef.current.ctx?.currentTime;
    const baseSemi =
      target === "major"
        ? 4
        : target === "minor"
          ? 3
          : target === "npc"
            ? 7
            : 5;
    if (!success) {
      playVoice(platformerPitchToFreq(102, baseSemi - 7, tuningMode), "square", 0.05, 0.09, now);
      playVoice(platformerPitchToFreq(96, baseSemi - 12, tuningMode), "sine", 0.04, 0.1, now != null ? now + 0.02 : undefined);
      return;
    }
    [baseSemi, baseSemi + 5, baseSemi + 12].forEach((semi, index) => {
      playVoice(
        platformerPitchToFreq(126 + stepIndex * 4, semi, tuningMode),
        index === 1 ? "triangle" : "sine",
        0.08 - index * 0.012,
        0.1 + index * 0.03,
        now != null ? now + index * 0.03 : undefined,
      );
      pushPhrase(semi);
    });
    recordMovementEvent("puzzle_step", baseSemi + 12, clamp(0.82 + stepIndex * 0.04, 0.2, 1), stepIndex, false, stepIndex);
  };

  const playGateUnlockCue = (label: string) => {
    const now = musicRef.current.ctx?.currentTime;
    [0, 4, 7, 12].forEach((semi, index) => {
      playVoice(
        platformerPitchToFreq(118, semi + 7, tuningMode),
        index % 2 === 0 ? "triangle" : "sine",
        0.08,
        0.24 + index * 0.03,
        now != null ? now + index * 0.04 : undefined,
      );
    });
    pushPhrase(19);
    recordMovementEvent("gate_unlock", 19, 1, 0, false, Math.min(7, Math.max(1, label.length * 0.08)));
  };

  const playStepCue = (x: number, speed: number) => {
    const m = musicRef.current;
    const ctx = m.ctx;
    if (!ctx) return;
    if (ctx.currentTime - m.lastFootAt < 0.08) return;
    m.lastFootAt = ctx.currentTime;
    const degree = SCALE[Math.floor((x / 180) % SCALE.length)];
    const root = 90 + clamp(speed, 0, 420) * 0.06;
    playVoice(platformerPitchToFreq(root, degree, tuningMode), "triangle", 0.05, 0.06);
    pushPhrase(degree);
    recordMovementEvent("step", degree, clamp(speed / MAX_SPEED, 0.2, 1), Math.floor((x / 180) % SCALE.length), false);
    if (speed > 300) {
      playVoice(platformerPitchToFreq(root, degree + 12, tuningMode), "sine", 0.025, 0.05);
    }
  };

  const playCheckpointChord = (milestone: number) => {
    const chord = CHORDS[milestone % CHORDS.length];
    const now = musicRef.current.ctx?.currentTime;
    if (!now) return;
    chord.forEach((semi, idx) => {
      playVoice(platformerPitchToFreq(110, semi, tuningMode), idx % 2 === 0 ? "triangle" : "sine", 0.08, 0.35, now + idx * 0.02);
    });
    pushPhrase(chord[0] ?? 0);
    recordMovementEvent("checkpoint", chord[0] ?? 0, 1);
  };

  const playFallCue = () => {
    playVoice(62, "sawtooth", 0.14, 0.2);
    pushPhrase(-2);
    recordMovementEvent("fall", -2, 1);
  };

  const captureComposerObstacleHit = (hit: PlatformerComposerObstacleHit) => {
    const lane = ((Math.round(hit.lane) % SCALE.length) + SCALE.length) % SCALE.length;
    const energy = clamp(hit.energy, 0.15, 1);
    const now = musicRef.current.ctx?.currentTime;

    if (hit.kind === "sync_gate") {
      const precision = clamp(typeof hit.detail === "number" ? hit.detail : energy, 0, 1);
      const semi = clampSemi((SCALE[lane] ?? 0) + (hit.airborne ? 7 : 5) + Math.round(precision * 4));
      if (now != null) {
        playVoice(platformerPitchToFreq(128, semi, tuningMode), "triangle", 0.08 + precision * 0.04, 0.11, now);
        playVoice(platformerPitchToFreq(128, semi + 12, tuningMode), "square", 0.03 + precision * 0.025, 0.05, now + 0.02);
        playVoice(58 + precision * 18, "sine", 0.05 + precision * 0.03, 0.08, now);
      }
      pushPhrase(semi);
      recordMovementEvent("sync_gate", semi, energy, lane, hit.airborne, precision);
      return;
    }

    if (hit.kind === "phase_gate") {
      const phaseIndex = clampPhaseIndex(typeof hit.detail === "number" ? hit.detail : 1);
      const phaseRoot = [0, 3, 7][phaseIndex] ?? 0;
      const semi = clampSemi((SCALE[(lane + phaseIndex) % SCALE.length] ?? 0) + phaseRoot + (hit.airborne ? 5 : 0));
      if (now != null) {
        const rootFreq = platformerPitchToFreq(102 + phaseIndex * 9, phaseRoot, tuningMode);
        playVoice(rootFreq, "sine", 0.05 + energy * 0.03, 0.18, now);
        playVoice(platformerPitchToFreq(128, semi, tuningMode), "triangle", 0.08 + energy * 0.03, 0.16, now + 0.016);
        playVoice(platformerPitchToFreq(128, semi + 7, tuningMode), "sine", 0.04 + energy * 0.02, 0.14, now + 0.04);
      }
      pushPhrase(semi);
      recordMovementEvent("phase_gate", semi, energy, lane, hit.airborne, phaseIndex);
      return;
    }

    if (hit.kind === "chord_fork") {
      const branch = clamp(typeof hit.detail === "number" ? hit.detail : 0, -1, 1);
      const semi = clampSemi((SCALE[lane] ?? 0) + (branch >= 0 ? 7 : -2) + (hit.airborne ? 5 : 0));
      if (now != null) {
        playVoice(platformerPitchToFreq(124, semi, tuningMode), "triangle", 0.075 + energy * 0.03, 0.15, now);
        playVoice(platformerPitchToFreq(124, semi + (branch >= 0 ? 5 : -5), tuningMode), "sine", 0.045 + energy * 0.02, 0.18, now + 0.022);
        playVoice(platformerPitchToFreq(86, semi - 12, tuningMode), "sine", 0.04 + energy * 0.02, 0.14, now);
      }
      pushPhrase(semi);
      recordMovementEvent("chord_fork", semi, energy, lane, hit.airborne, branch);
      return;
    }

    if (hit.kind === "silence_field") {
      const hush = clamp(typeof hit.detail === "number" ? hit.detail : energy, 0.2, 1);
      const semi = clampSemi((SCALE[lane] ?? 0) + (hit.airborne ? 10 : 3));
      if (now != null) {
        playVoice(platformerPitchToFreq(112, semi, tuningMode), "sine", 0.026 + hush * 0.012, 0.22 + hush * 0.12, now);
        playVoice(980 - hush * 240, "square", 0.005 + hush * 0.008, 0.018, now + 0.03);
      }
      recordMovementEvent("silence_field", semi, Math.max(0.15, energy * 0.78), lane, hit.airborne, hush);
      return;
    }

    const tuningSkew = Math.round(clamp(typeof hit.detail === "number" ? hit.detail : 0, -2, 2));
    const semi = clampSemi((SCALE[lane] ?? 0) + 12 + tuningSkew * 2);
    if (now != null) {
      const detune = tuningSkew * 24;
      playVoice(platformerPitchToFreq(148, semi, tuningMode), "triangle", 0.08 + energy * 0.03, 0.16, now, detune);
      playVoice(platformerPitchToFreq(148, semi + 7, tuningMode), "sine", 0.05 + energy * 0.025, 0.22, now + 0.03, detune * 0.5);
      playVoice(1680 - tuningSkew * 90, "square", 0.014 + energy * 0.01, 0.03, now + 0.012);
    }
    pushPhrase(semi);
    recordMovementEvent("tuning_crystal", semi, energy, lane, hit.airborne, tuningSkew);
  };

  return {
    playJumpCue,
    playLandCue,
    playStepCue,
    playCoinCue,
    playNpcOrbCue,
    playPuzzleStepCue,
    playGateUnlockCue,
    playCheckpointChord,
    playFallCue,
    captureComposerObstacleHit,
  };
}
