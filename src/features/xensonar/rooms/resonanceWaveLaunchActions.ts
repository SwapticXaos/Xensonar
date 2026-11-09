import type { WaveDecayPreset } from '../domain/instrumentData';
import type { DirectedPulse, NexusRipple } from '../domain/runtimeTypes';
import type { ResonanceNexusRuntimeRefs } from './resonanceNexusRuntimeRefs';

export type ResonanceWaveLaunchDirection = NonNullable<NexusRipple['direction']>;

export type ResonanceWaveLaunchArgs = {
  refs: ResonanceNexusRuntimeRefs;
  waveRadius: number | undefined;
  waveDecay: WaveDecayPreset | undefined;
  baseWaveMaxRadius: number;
  clampValue: (value: number, min: number, max: number) => number;
};

export type ResonanceRippleLaunchArgs = ResonanceWaveLaunchArgs & {
  direction?: ResonanceWaveLaunchDirection;
};

export type ResonanceSectorPulseLaunchArgs = ResonanceWaveLaunchArgs & {
  direction: ResonanceWaveLaunchDirection;
  maxSectorPulses?: number;
};

export type ResonanceWaveLaunchResult = {
  cursorX: number;
  cursorY: number;
  isSector: boolean;
  direction?: ResonanceWaveLaunchDirection;
};

const resolveWaveLaunchMaxRadius = ({
  waveRadius,
  baseWaveMaxRadius,
  clampValue,
}: Pick<ResonanceWaveLaunchArgs, 'waveRadius' | 'baseWaveMaxRadius' | 'clampValue'>) => (
  baseWaveMaxRadius * clampValue(waveRadius ?? 1, 0.35, 2.2)
);

const getVisualLaunchNowMs = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

export const pushResonanceRippleLaunch = ({
  refs,
  waveRadius,
  waveDecay,
  baseWaveMaxRadius,
  clampValue,
  direction,
}: ResonanceRippleLaunchArgs): ResonanceWaveLaunchResult => {
  const launchedAtMs = getVisualLaunchNowMs();
  const ripple: NexusRipple = {
    x: refs.cursorX,
    y: refs.cursorY,
    radius: 0,
    life: 1,
    maxRadius: resolveWaveLaunchMaxRadius({ waveRadius, baseWaveMaxRadius, clampValue }),
    decay: waveDecay ?? 'linear',
    direction,
    hitAgents: [],
    launchedAtMs,
    timeLocked: true,
    displayRadius: 0,
    displayPrevRadius: 0,
  };
  refs.ripples.push(ripple);
  return {
    cursorX: refs.cursorX,
    cursorY: refs.cursorY,
    isSector: false,
    direction,
  };
};

export const pushResonanceSectorPulseLaunch = ({
  refs,
  waveRadius,
  waveDecay,
  baseWaveMaxRadius,
  clampValue,
  direction,
  maxSectorPulses = 18,
}: ResonanceSectorPulseLaunchArgs): ResonanceWaveLaunchResult => {
  const launchedAtMs = getVisualLaunchNowMs();
  const pulse: DirectedPulse = {
    x: refs.cursorX,
    y: refs.cursorY,
    radius: 0,
    life: 1,
    maxRadius: resolveWaveLaunchMaxRadius({ waveRadius, baseWaveMaxRadius, clampValue }),
    decay: waveDecay ?? 'linear',
    direction,
    hitAgents: [],
    launchedAtMs,
    timeLocked: true,
    displayRadius: 0,
    displayPrevRadius: 0,
  };
  refs.sectorPulses.push(pulse);
  if (refs.sectorPulses.length > maxSectorPulses) {
    refs.sectorPulses.shift();
  }
  return {
    cursorX: refs.cursorX,
    cursorY: refs.cursorY,
    isSector: true,
    direction,
  };
};
