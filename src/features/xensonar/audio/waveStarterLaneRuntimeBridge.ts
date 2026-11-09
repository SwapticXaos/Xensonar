import type { MutableRefObject } from 'react';
import {
  createWaveStarterLaneRuntime,
  type WaveStarterEmitOptions,
  type WaveStarterLaneRuntime,
  type WaveStarterLaneRuntimeDeps,
} from './waveStarterLaneRuntime';

export type WaveStarterLaneRuntimeRef = MutableRefObject<WaveStarterLaneRuntime | null>;

export type WaveStarterLaneRuntimeBridgeDeps = WaveStarterLaneRuntimeDeps & {
  runtimeRef: WaveStarterLaneRuntimeRef;
};

export const getOrCreateWaveStarterLaneRuntime = ({
  runtimeRef,
  ...deps
}: WaveStarterLaneRuntimeBridgeDeps): WaveStarterLaneRuntime => {
  if (!runtimeRef.current) {
    runtimeRef.current = createWaveStarterLaneRuntime(deps);
  }
  return runtimeRef.current;
};

export const requestWaveStarterLaneAttack = (
  deps: WaveStarterLaneRuntimeBridgeDeps,
  baseFreq: number,
  isSector = false,
  options?: WaveStarterEmitOptions,
) => {
  getOrCreateWaveStarterLaneRuntime(deps).request(baseFreq, isSector, options);
};

export const disposeWaveStarterLaneRuntimeRef = (runtimeRef: WaveStarterLaneRuntimeRef) => {
  runtimeRef.current?.dispose();
  runtimeRef.current = null;
};

export type { WaveStarterEmitOptions, WaveStarterLaneRuntime };
