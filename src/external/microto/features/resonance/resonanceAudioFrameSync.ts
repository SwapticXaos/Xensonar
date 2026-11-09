/**
 * Resonance frame-audio sync helpers.
 * Pure policy for frame-synchronous drone/JI/flanger state so the room keeps
 * a single per-frame authority inside useResonanceSimulation.
 */

import { clamp } from "../../shared/tuning/grid";
import { getDroneRhythmGain } from "../../../../features/resonance/droneRhythmPatterns";
import { DRONE_MAX_FREQ, DRONE_MIN_FREQ } from "./config/constants";
import { DRONE_JI_OVERTONES } from "./config/overtones";
import type { DroneSlice, QuantizeSlice } from "./config/stateSlices";
import type { NexusRuntimeRefs } from "./resonanceRefs";

export function getResonanceDroneRhythmGain(mode: string, bpm: number, time: number): number {
  return getDroneRhythmGain(mode, bpm, time);
}

type SyncResonanceAudioFrameArgs = {
  refs: NexusRuntimeRefs;
  audioTime: number;
  drone: DroneSlice;
  quantize: QuantizeSlice;
  droneVolume: number;
  baseFreq: number;
};

export function syncResonanceAudioFrame({
  refs,
  audioTime,
  drone,
  quantize,
  droneVolume,
  baseFreq,
}: SyncResonanceAudioFrameArgs): void {
  if (refs.droneVolumeBus) {
    refs.droneVolumeBus.gain.setTargetAtTime(clamp(droneVolume, 0, 1), audioTime, 0.03);
  }

  if (refs.droneRhythmGain) {
    refs.droneRhythmGain.gain.setTargetAtTime(
      getResonanceDroneRhythmGain(drone.droneRhythm, quantize.quantizeBpm, audioTime),
      audioTime,
      0.03,
    );
  }

  if (refs.manualJiMaster) {
    refs.manualJiMaster.gain.setTargetAtTime(1, audioTime, 0.05);
  }

  if (refs.flangerWet && refs.flangerFeedback) {
    const flangerAmt = clamp(drone.droneFlanger ?? 0, 0, 1);
    refs.flangerWet.gain.setTargetAtTime(flangerAmt * 0.8, audioTime, 0.05);
    refs.flangerFeedback.gain.setTargetAtTime(0.4 + flangerAmt * 0.5, audioTime, 0.05);
  }

  const timbre = clamp(drone.droneTimbre, 0, 1);
  const manualBaseGain = 0.004 + 0.1 * timbre;
  const overtoneBaseGain = 0.006 + timbre * 0.022;

  for (const overtone of DRONE_JI_OVERTONES) {
    const slider = clamp(drone.droneJIOvertones[overtone.label] ?? 0, 0, 1);
    const manualOsc = refs.manualJiOscs[overtone.label];
    const manualGain = refs.manualJiGains[overtone.label];
    const jiOsc = refs.jiOscs[overtone.label];
    const jiGain = refs.jiGains[overtone.label];
    const overtoneFreq = baseFreq * overtone.ratio;

    if (manualOsc) {
      if (manualOsc.type !== drone.droneOvertoneWaveform) {
        manualOsc.type = drone.droneOvertoneWaveform;
      }
      manualOsc.frequency.setTargetAtTime(overtoneFreq, audioTime, 0.03);
    }
    if (manualGain) {
      manualGain.gain.setTargetAtTime(slider * manualBaseGain, audioTime, 0.05);
    }
    if (jiOsc) {
      if (jiOsc.type !== drone.droneOvertoneWaveform) {
        jiOsc.type = drone.droneOvertoneWaveform;
      }
      jiOsc.frequency.setTargetAtTime(
        clamp(overtoneFreq, DRONE_MIN_FREQ * 0.5, DRONE_MAX_FREQ * 6),
        audioTime,
        0.04,
      );
    }
    if (jiGain) {
      jiGain.gain.setTargetAtTime(slider * overtoneBaseGain, audioTime, 0.05);
    }
  }
}
