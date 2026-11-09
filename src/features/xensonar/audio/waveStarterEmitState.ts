import type { WaveTimbreGradientPreset, WaveVolumeGradientPreset } from "../domain/instrumentData";
import { resolveWaveStarterPitch } from "../../soundLibrary/particlePitchRouting";
import {
  clamp,
  computeWaveTimbreGradientState,
  computeWaveVolumeGradientMultiplier,
  type WaveTimbreGradientState,
} from "../rooms/resonanceRuntimeMath";
import type { WaveStarterEmitOptions } from "./waveStarterLaneRuntimeBridge";

export type WaveStarterEmitStateArgs = {
  baseFreq: number;
  isSector: boolean;
  cursorX: number;
  octaveHeld: boolean;
  swell: number;
  runtimeVolume: number;
  waveTimbreGradientEnabled: boolean;
  waveTimbreGradientX: WaveTimbreGradientPreset;
  waveVolumeGradientEnabled: boolean;
  waveVolumeGradientX: WaveVolumeGradientPreset;
  options?: WaveStarterEmitOptions;
};

export type WaveStarterEmitState = {
  playbackFreq: number;
  volume: number;
  swellScalar: number;
  waveVolumeGradientMul: number;
  microGainScale: number;
  microVoiceDemandMul: number;
  waveGradient: WaveTimbreGradientState;
};

export function resolveWaveStarterEmitState(args: WaveStarterEmitStateArgs): WaveStarterEmitState {
  const waveGradient = computeWaveTimbreGradientState(
    args.cursorX,
    args.waveTimbreGradientEnabled,
    args.waveTimbreGradientX,
  );
  const { playbackFreq } = resolveWaveStarterPitch({
    baseFreq: args.baseFreq,
    isSector: args.isSector,
    octaveHeld: args.octaveHeld,
  });
  const swellScalar = 1 + args.swell * 2.35;
  const waveVolumeGradientMul = computeWaveVolumeGradientMultiplier(
    args.cursorX,
    args.waveVolumeGradientEnabled,
    args.waveVolumeGradientX,
  );
  const microGainScale = args.options?.microOrchestrated ? clamp(args.options.microGainScale ?? 0.84, 0.32, 1) : 1;
  const microVoiceDemandMul = args.options?.microOrchestrated ? clamp(args.options.microVoiceDemandMul ?? 0.82, 0.28, 1) : 1;
  const volume = args.runtimeVolume * swellScalar * waveVolumeGradientMul * microGainScale;

  return {
    playbackFreq,
    volume,
    swellScalar,
    waveVolumeGradientMul,
    microGainScale,
    microVoiceDemandMul,
    waveGradient,
  };
}
