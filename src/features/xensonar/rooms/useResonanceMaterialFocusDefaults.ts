import { useEffect } from 'react';
import type { DronePreset } from '../domain/instrumentData';
import { buildMaterialFocusNexusPatch, type NexusUiPatch } from './nexusParamsInitialState';

type UseResonanceMaterialFocusDefaultsArgs = {
  setDronePreset: (preset: DronePreset) => void;
  updateNParams: (patch: NexusUiPatch) => void;
  setDroneVolume: (value: number) => void;
  setWaveSoundVolume: (value: number) => void;
  setWaveSoundPreset: (preset: string) => void;
};

export function useResonanceMaterialFocusDefaults(args: UseResonanceMaterialFocusDefaultsArgs) {
  useEffect(() => {
    args.setDronePreset('fjord_tape');
    args.updateNParams(buildMaterialFocusNexusPatch());
    args.setDroneVolume(0.15);
    args.setWaveSoundVolume(0.22);
    args.setWaveSoundPreset('tape_halo');
  }, []);
}
