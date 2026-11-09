import type { ResonanceOvertoneWaveform } from "./config/types";
import type { NexusRuntimeRefs } from "./resonanceRefs";
import { getWaveDriveGain, isWaveOctaveBoostActive } from "./resonanceWavePerformance";

export type ResonanceWaveTelemetry = {
  droneWaveform: ResonanceOvertoneWaveform;
  waveStartWaveform: ResonanceOvertoneWaveform;
  octaveMode: "base" | "hold" | "latched";
  octaveBoostActive: boolean;
  driveLevel: number;
  driveGain: number;
};

type BuildResonanceWaveTelemetryArgs = {
  refs: Pick<
    NexusRuntimeRefs,
    "waveOctaveBoostHeld" | "waveOctaveBoostLatched" | "waveDriveLevel"
  >;
  droneWaveform: ResonanceOvertoneWaveform;
  waveStartWaveform: ResonanceOvertoneWaveform;
};

export function buildResonanceWaveTelemetry({
  refs,
  droneWaveform,
  waveStartWaveform,
}: BuildResonanceWaveTelemetryArgs): ResonanceWaveTelemetry {
  const octaveMode = refs.waveOctaveBoostLatched
    ? "latched"
    : refs.waveOctaveBoostHeld
      ? "hold"
      : "base";
  return {
    droneWaveform,
    waveStartWaveform,
    octaveMode,
    octaveBoostActive: isWaveOctaveBoostActive(refs),
    driveLevel: refs.waveDriveLevel,
    driveGain: getWaveDriveGain(refs.waveDriveLevel),
  };
}
