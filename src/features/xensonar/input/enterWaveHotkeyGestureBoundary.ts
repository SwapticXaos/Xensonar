import type { AppNexusParams } from '../rooms/nexusParamsInitialState';
import type { ResonanceNexusRuntimeRefs } from '../rooms/resonanceNexusRuntimeRefs';
import { pushResonanceRippleLaunch, type ResonanceWaveLaunchResult } from '../rooms/resonanceWaveLaunchActions';

export interface EnterWaveHotkeyGestureRuntime {
  refs: ResonanceNexusRuntimeRefs;
  params: Pick<AppNexusParams, 'waveRadius' | 'waveDecay'>;
  baseWaveMaxRadius: number;
  clampValue: (value: number, min: number, max: number) => number;
  markWaveLaunch: () => void;
  playWaveStartSound: (freq: number, quantized: boolean) => void;
  playAudio?: boolean;
  resolvePlayAudio?: (payload: { cursorY: number; freq: number }) => boolean;
  freqFromY: (y: number) => number;
}

export function runEnterWaveHotkeyGesture(
  runtime: EnterWaveHotkeyGestureRuntime,
): ResonanceWaveLaunchResult {
  const launch = pushResonanceRippleLaunch({
    refs: runtime.refs,
    waveRadius: runtime.params.waveRadius,
    waveDecay: runtime.params.waveDecay,
    baseWaveMaxRadius: runtime.baseWaveMaxRadius,
    clampValue: runtime.clampValue,
  });
  runtime.markWaveLaunch();
  const freq = runtime.freqFromY(launch.cursorY);
  const playAudio = runtime.resolvePlayAudio
    ? runtime.resolvePlayAudio({ cursorY: launch.cursorY, freq })
    : runtime.playAudio !== false;
  if (playAudio) {
    runtime.playWaveStartSound(freq, false);
  }
  return launch;
}
