/**
 * Sector pulse triggers for the resonance nexus (vision §6 simulation modules).
 * Owns directed-pulse throttle and wave launch/impact decay refs; orchestrator
 * composes this hook and passes through trigger APIs. Keeps pulse logic out of
 * useResonanceOrchestrator for clearer module boundaries.
 */
import { useRef, type MutableRefObject } from "react";
import { type PlayOneShotTone } from "../audio";
import type { DirectedPulse } from "../runtime/types";
import { clamp } from "../../shared/tuning/grid";
import { DRONE_JI_OVERTONES } from "./config/overtones";
import type { ResonanceState } from "./config/state";
import { getWaveStartSlice } from "./config/stateSlices";
import type { ResonanceOvertoneWaveform } from "./config/types";
import { droneFreqFromY } from "./runtimeConfig";
import type { NexusRuntimeRefsRef } from "./resonanceRefs";
import { getWaveDriveGain, isWaveOctaveBoostActive } from "./resonanceWavePerformance";

export type ScheduleToQuantizedGrid = (callback: () => void) => void;
export type DirectedPulseDirection = "left" | "right" | "up" | "down";
export type DirectedPulseMode = "one_shot" | "persistent";
export type DirectedPulseCastVoice = {
  freq: number;
  offsetSeconds: number;
  durationSeconds: number;
  type: OscillatorType;
  volume: number;
  q: number;
  cutoff: number;
};

export type UseResonanceSectorPulsesArgs = {
  nexusParamsRef: MutableRefObject<ResonanceState>;
  nexusRefs: NexusRuntimeRefsRef;
  nexusActive: boolean;
  gameHeight: number;
  playScheduledTone: PlayOneShotTone;
  scheduleToQuantizedGrid: ScheduleToQuantizedGrid;
  audioCtx: AudioContext | null;
};

export function buildDirectedPulseCastVoices(
  droneFreq: number,
  direction: DirectedPulseDirection,
  mode: DirectedPulseMode,
  mix: Record<string, number>,
  waveform: ResonanceOvertoneWaveform,
  octaveBoost: boolean,
  driveLevel: number,
): DirectedPulseCastVoice[] {
  const dirBoost =
    direction === "right"
      ? 1.08
      : direction === "left"
        ? 0.94
        : direction === "up"
          ? 1.18
          : 0.86;
  const octaveRatio = octaveBoost ? 2 : 1;
  const baseFreq = droneFreq * 0.52 * dirBoost * octaveRatio;
  const driveGain = getWaveDriveGain(driveLevel);
  const attackVolume = (mode === "persistent" ? 0.22 : 0.18) * driveGain;
  const brightCutoff =
    direction === "up" || direction === "right" ? 2200 : 1600;
  const fifthRatio = direction === "up" || direction === "down" ? 1.5 : 2.02;

  const voices: DirectedPulseCastVoice[] = [
    {
      freq: baseFreq,
      offsetSeconds: 0,
      durationSeconds: mode === "persistent" ? 0.22 : 0.18,
      type: waveform,
      volume: clamp(attackVolume, 0, 0.5),
      q: 1.4,
      cutoff: brightCutoff,
    },
    {
      freq: baseFreq * fifthRatio,
      offsetSeconds: 0.018,
      durationSeconds: mode === "persistent" ? 0.28 : 0.18,
      type: waveform,
      volume: clamp(attackVolume * 0.66, 0, 0.42),
      q: 0.9,
      cutoff: brightCutoff + 700,
    },
  ];

  const accentOvertones = DRONE_JI_OVERTONES
    .map((node) => ({
      ratio: node.ratio,
      amount: clamp(mix[node.label] ?? 0, 0, 1),
    }))
    .filter((node) => node.amount > 0.08)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  accentOvertones.forEach((node, index) => {
    voices.push({
      freq: baseFreq * node.ratio,
      offsetSeconds: 0.01 + index * 0.016,
      durationSeconds: mode === "persistent" ? 0.18 + index * 0.03 : 0.12 + index * 0.02,
      type: waveform,
      volume: clamp((0.03 + node.amount * 0.085) * driveGain, 0, 0.24),
      q: 1.1 + node.amount * 1.3,
      cutoff: brightCutoff + 350 + index * 180,
    });
  });

  if (mode === "persistent") {
    voices.push({
      freq: baseFreq * 0.5,
      offsetSeconds: 0.05,
      durationSeconds: 0.42,
      type: waveform,
      volume: clamp(attackVolume * 0.36, 0, 0.24),
      q: 1.1,
      cutoff: 1100,
    });
  }

  return voices;
}

export function useResonanceSectorPulses({
  nexusParamsRef,
  nexusRefs,
  nexusActive,
  gameHeight,
  playScheduledTone,
  scheduleToQuantizedGrid,
  audioCtx,
}: UseResonanceSectorPulsesArgs) {
  const directedPulseAtRef = useRef(0);
  const waveLaunchAtRef = useRef(0);
  const waveImpactDecayRef = useRef(1);

  const triggerDirectedPulse = (
    direction: DirectedPulseDirection,
    mode: DirectedPulseMode = "one_shot",
  ) => {
    if (!nexusActive) return;
    const now = performance.now();
    if (mode !== "persistent" && now - directedPulseAtRef.current < 180) return;
    directedPulseAtRef.current = now;

    const refs = nexusRefs.current;
    if (mode === "persistent" && direction === "right") {
      const persistentRight = refs.sectorPulses.find(
        (p) => p.persistent && p.direction === "right",
      );
      if (persistentRight) {
        persistentRight.x = refs.cursorX;
        persistentRight.y = refs.cursorY;
        persistentRight.radius = 0;
        persistentRight.life = 1;
        persistentRight.hitAgents = [];
        persistentRight.speed = 3.2;
        persistentRight.lastImpactAt = 0;
      } else {
        const pulse: DirectedPulse = {
          x: refs.cursorX,
          y: refs.cursorY,
          radius: 0,
          life: 1,
          direction,
          hitAgents: [],
          persistent: true,
          speed: 3.2,
          lastImpactAt: 0,
        };
        refs.sectorPulses.push(pulse);
      }
    } else {
      const pulse: DirectedPulse = {
        x: refs.cursorX,
        y: refs.cursorY,
        radius: 0,
        life: 1,
        direction,
        hitAgents: [],
        lastImpactAt: 0,
      };
      refs.sectorPulses.push(pulse);
    }
    if (refs.sectorPulses.length > 18) {
      const firstDisposable = refs.sectorPulses.findIndex((p) => !p.persistent);
      if (firstDisposable >= 0) {
        refs.sectorPulses.splice(firstDisposable, 1);
      }
    }

    const droneFreq = droneFreqFromY(refs.cursorY, gameHeight);
    const waveStart = getWaveStartSlice(nexusParamsRef);
    buildDirectedPulseCastVoices(
      droneFreq,
      direction,
      mode,
      waveStart.waveStartOvertones,
      waveStart.waveStartWaveform,
      isWaveOctaveBoostActive(refs),
      refs.waveDriveLevel,
    ).forEach((voice) => {
      playScheduledTone(
        voice.freq,
        voice.offsetSeconds,
        voice.durationSeconds,
        voice.type,
        voice.volume,
        voice.q,
        voice.cutoff,
      );
    });
  };

  const triggerQuantizedSectorPulse = (
    direction: DirectedPulseDirection,
    mode: DirectedPulseMode = "one_shot",
  ) => {
    if (mode === "persistent") {
      triggerDirectedPulse(direction, mode);
      return;
    }
    scheduleToQuantizedGrid(() => {
      triggerDirectedPulse(direction, mode);
    });
  };

  const armWaveImpactDecay = () => {
    waveLaunchAtRef.current = audioCtx?.currentTime ?? performance.now() / 1000;
    waveImpactDecayRef.current = 1;
  };

  return {
    triggerDirectedPulse,
    triggerQuantizedSectorPulse,
    armWaveImpactDecay,
    waveLaunchAtRef,
    waveImpactDecayRef,
  };
}
