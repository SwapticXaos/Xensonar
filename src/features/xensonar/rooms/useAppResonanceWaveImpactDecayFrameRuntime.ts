import { useEffect, type MutableRefObject } from "react";
import { getAudioNowSec } from "../../../core/time/unifiedTime";
import type { AppNexusParams } from "./nexusParamsInitialState";

export type AppResonanceWaveImpactDecayFrameRuntimeArgs = {
  audioCtx: AudioContext | null;
  impactDecayOn: boolean;
  particleVolume: number;
  nexusParamsRef: MutableRefObject<AppNexusParams>;
  waveLaunchAtRef: MutableRefObject<number>;
  waveImpactDecayRef: MutableRefObject<number>;
};

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function useAppResonanceWaveImpactDecayFrameRuntime(
  args: AppResonanceWaveImpactDecayFrameRuntimeArgs,
) {
  const {
    audioCtx,
    impactDecayOn,
    particleVolume,
    nexusParamsRef,
    waveLaunchAtRef,
    waveImpactDecayRef,
  } = args;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const params = nexusParamsRef.current;
      const baseVol = particleVolume;
      if (impactDecayOn && waveLaunchAtRef.current > 0) {
        const now = getAudioNowSec(audioCtx);
        const elapsed = Math.max(0, now - waveLaunchAtRef.current);
        const scalar = clampValue(1 - elapsed / 1.25, 0.2, 1);
        waveImpactDecayRef.current = scalar;
        params.particleVolume = baseVol * scalar;
      } else {
        waveImpactDecayRef.current = 1;
        params.particleVolume = baseVol;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [audioCtx, impactDecayOn, particleVolume]);
}
