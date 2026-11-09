import type { AppNexusParams } from './nexusParamsInitialState';
import type { ResonanceNexusRuntimeRefs } from './resonanceNexusRuntimeRefs';
import {
  pushResonanceRippleLaunch,
  pushResonanceSectorPulseLaunch,
  type ResonanceWaveLaunchDirection,
  type ResonanceWaveLaunchResult,
} from './resonanceWaveLaunchActions';

export type NexusRippleGestureDirection = ResonanceWaveLaunchDirection;

export interface NexusRippleGestureRuntime {
  nexusActive: boolean;
  refs: ResonanceNexusRuntimeRefs;
  params: Pick<AppNexusParams, 'waveRadius' | 'waveDecay'>;
  baseWaveMaxRadius: number;
  clampValue: (value: number, min: number, max: number) => number;
  freqFromY: (y: number) => number;
  markWaveLaunch: () => void;
  playWaveStartSound: (baseFreq: number, isSector?: boolean) => void;
}

export type NexusRippleGestureResult = ResonanceWaveLaunchResult | null;

const completeNexusRippleGesture = (
  runtime: NexusRippleGestureRuntime,
  launch: ResonanceWaveLaunchResult,
): ResonanceWaveLaunchResult => {
  runtime.markWaveLaunch();
  runtime.playWaveStartSound(runtime.freqFromY(launch.cursorY), launch.isSector);
  return launch;
};

export function runNexusRippleGesture(
  runtime: NexusRippleGestureRuntime,
  direction?: NexusRippleGestureDirection,
): NexusRippleGestureResult {
  if (!runtime.nexusActive) return null;
  const launch = pushResonanceRippleLaunch({
    refs: runtime.refs,
    waveRadius: runtime.params.waveRadius,
    waveDecay: runtime.params.waveDecay,
    baseWaveMaxRadius: runtime.baseWaveMaxRadius,
    clampValue: runtime.clampValue,
    direction,
  });
  return completeNexusRippleGesture(runtime, launch);
}

export function runNexusDirectedPulseGesture(
  runtime: NexusRippleGestureRuntime,
  direction: NexusRippleGestureDirection,
): NexusRippleGestureResult {
  if (!runtime.nexusActive) return null;
  const launch = pushResonanceSectorPulseLaunch({
    refs: runtime.refs,
    waveRadius: runtime.params.waveRadius,
    waveDecay: runtime.params.waveDecay,
    baseWaveMaxRadius: runtime.baseWaveMaxRadius,
    clampValue: runtime.clampValue,
    direction,
  });
  return completeNexusRippleGesture(runtime, launch);
}
