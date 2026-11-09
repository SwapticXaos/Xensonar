import type { MutableRefObject } from 'react';
import {
  createEmptyOvertoneMix,
  type DronePreset,
} from '../domain/instrumentData';
import {
  WAVE_OVERTONE_MIX_PRESETS,
  type WaveOvertoneMixPresetId,
} from './resonanceUiConfig';
import type { AppNexusParams, NexusUiPatch } from './nexusParamsInitialState';

export type AppResonanceOvertoneActionPorts = {
  readonly setDronePreset: (preset: DronePreset) => void;
  readonly setDroneOvertone: (label: string, value: number) => void;
  readonly setWaveOvertone: (label: string, value: number) => void;
  readonly applyWaveOvertonePreset: (presetId: WaveOvertoneMixPresetId) => void;
};

export type BuildAppResonanceOvertoneActionPortsInput = {
  readonly nexusParamsRef: MutableRefObject<AppNexusParams>;
  readonly updateNParams: (partial: NexusUiPatch) => void;
};

export const APP_RESONANCE_OVERTONE_ACTION_PORTS_PROBE = {
  cleanupKind: 'app-resonance-overtone-action-ports',
  ownsRuntime: false,
  ownsEffects: false,
  ownsAudioGraph: false,
  ownsWaveStarterHotPath: false,
  onlyMovesExistingOvertoneUiActions: true,
  movedFromAppCallsite: [
    'setDronePreset',
    'setDroneOvertone',
    'setWaveOvertone',
    'applyWaveOvertonePreset',
  ] as const,
  explicitlyNotMoved: [
    'wave-starter sound emission',
    'wave overtone ARP enqueue/runtime',
    'particle preview playback',
    'manual grid actions',
    'keyboard/root-follow/wellenstarter policy',
  ] as const,
} as const;

export function buildAppResonanceOvertoneActionPorts({
  nexusParamsRef,
  updateNParams,
}: BuildAppResonanceOvertoneActionPortsInput): AppResonanceOvertoneActionPorts {
  const setDronePreset = (preset: DronePreset) => {
    const byPreset = nexusParamsRef.current.droneJIOvertonesByPreset;
    const presetMix = byPreset[preset] ?? createEmptyOvertoneMix();
    updateNParams({
      dronePreset: preset,
      droneJIOvertones: { ...presetMix },
    });
  };

  const setDroneOvertone = (label: string, value: number) => {
    const activePreset = nexusParamsRef.current.dronePreset;
    const currentByPreset = nexusParamsRef.current.droneJIOvertonesByPreset;
    const nextForPreset = {
      ...(currentByPreset[activePreset] ?? createEmptyOvertoneMix()),
      [label]: value,
    };
    updateNParams({
      droneJIOvertones: nextForPreset,
      droneJIOvertonesByPreset: {
        ...currentByPreset,
        [activePreset]: nextForPreset,
      },
    });
  };

  const setWaveOvertone = (label: string, value: number) => {
    updateNParams({
      waveOvertones: {
        ...nexusParamsRef.current.waveOvertones,
        [label]: value,
      },
    });
  };

  const applyWaveOvertonePreset = (presetId: WaveOvertoneMixPresetId) => {
    const preset = WAVE_OVERTONE_MIX_PRESETS.find((entry) => entry.value === presetId);
    if (!preset) return;
    updateNParams({
      waveOvertonesEnabled: presetId === 'empty' ? nexusParamsRef.current.waveOvertonesEnabled : true,
      waveOvertones: { ...preset.mix },
      waveOvertoneGlobalLevel: preset.globalLevel,
    });
  };

  return {
    setDronePreset,
    setDroneOvertone,
    setWaveOvertone,
    applyWaveOvertonePreset,
  };
}
