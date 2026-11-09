import type { MutableRefObject } from 'react';
import {
  previewParticlePresetSelection,
  previewWaveStarterPresetSelection,
} from '../../soundLibrary/presetPreviewActions';
import type { AppNexusAgentToneAction } from '../audio/useAppNexusAudioActionSurfaceBoundary';
import type { WaveOvertoneArpQueueEntry } from '../audioTraffic/waveOvertoneArpRuntime';
import type { AppNexusParams } from './nexusParamsInitialState';

type WaveSoundRuntimeState = {
  enabled: boolean;
  volume: number;
  preset: string;
};

export type AppResonancePresetPreviewActionPorts = {
  readonly previewWavePresetSelection: (selectionId: string) => Promise<void>;
  readonly previewParticlePresetSelectionAction: (selectionId: string) => Promise<void>;
};

export type BuildAppResonancePresetPreviewActionPortsInput = {
  readonly initAudio: () => Promise<AudioContext | null | undefined>;
  readonly waveSoundRuntimeRef: MutableRefObject<WaveSoundRuntimeState>;
  readonly nexusParamsRef: MutableRefObject<Pick<AppNexusParams, 'waveOvertonesEnabled' | 'particleVolume'>>;
  readonly waveOvertoneArpQueueRef: MutableRefObject<WaveOvertoneArpQueueEntry[]>;
  readonly playWaveStartSound: (freq: number, isSector: boolean) => void;
  readonly playNexusAgentTone: AppNexusAgentToneAction;
  readonly gameWidth: number;
  readonly gameHeight: number;
};

export const APP_RESONANCE_PRESET_PREVIEW_ACTION_PORTS_PROBE = {
  cleanupKind: 'app-resonance-preset-preview-action-ports',
  ownsRuntime: false,
  ownsEffects: false,
  ownsAudioGraph: false,
  ownsWaveStarterHotPath: false,
  ownsParticleRuntime: false,
  onlyMovesExistingPresetPreviewCallsiteWiring: true,
  movedFromAppCallsite: [
    'previewWavePresetSelection',
    'previewParticlePresetSelectionAction',
  ] as const,
  explicitlyNotMoved: [
    'previewWaveStarterPresetSelection behavior',
    'previewParticlePresetSelection behavior',
    'wave-starter sound emission policy',
    'particle-agent tone rendering',
    'Wellenstarter, keyboard and Root-Follow behavior',
  ] as const,
} as const;

export function buildAppResonancePresetPreviewActionPorts({
  initAudio,
  waveSoundRuntimeRef,
  nexusParamsRef,
  waveOvertoneArpQueueRef,
  playWaveStartSound,
  playNexusAgentTone,
  gameWidth,
  gameHeight,
}: BuildAppResonancePresetPreviewActionPortsInput): AppResonancePresetPreviewActionPorts {
  const previewWavePresetSelection = async (selectionId: string) => previewWaveStarterPresetSelection({
    initAudio,
    waveSoundRuntimeRef,
    nexusParamsRef,
    waveOvertoneArpQueueRef,
    playWaveStartSound,
    selectionId,
  });

  const previewParticlePresetSelectionAction = async (selectionId: string) => previewParticlePresetSelection({
    initAudio,
    nexusParamsRef,
    playNexusAgentTone,
    selectionId,
    gameWidth,
    gameHeight,
  });

  return {
    previewWavePresetSelection,
    previewParticlePresetSelectionAction,
  };
}
