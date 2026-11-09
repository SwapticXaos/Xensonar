import type { DrumKit, DrumPattern } from '../domain/instrumentData';
import type { DrumLaneKitOverrides as CanonicalDrumLaneKitOverrides } from '../groove/drumKitRoutingTypes';
import type { ParticleSampleProfileMode } from '../../soundLibrary/particleSamplePlayback';

export type ResonanceNParamsPatch = Record<string, unknown>;
export type UpdateResonanceNParams = (patch: ResonanceNParamsPatch) => void;

export type DrumLaneKitOverrides = CanonicalDrumLaneKitOverrides;

export type GrooveBassPanelNParams = {
  drumActive: boolean;
  drumAir: number;
  drumConfigId: string;
  drumConfigMode: 'preset' | 'exported';
  drumEdge: number;
  drumKit?: DrumKit;
  drumLaneKits?: DrumLaneKitOverrides;
  drumPattern: DrumPattern;
  drumSnap: number;
  drumSoftness: number;
  drumVolume: number;
  grooveSwing: number;
  bassActive: boolean;
  bassClipId?: string | null;
  bassGrit: number;
  bassPattern: string;
  bassPatternMode?: 'clip' | 'preset' | string;
  bassRootHz: number;
  bassRootMode: 'auto' | 'fixed' | string;
  bassTone: number;
  bassVolume: number;
};

export type OvertoneMixerTarget = 'drone' | 'waves';

export type ResonanceSoundPaletteNParams = {
  gridBase?: number;
  gridTuning?: string;
  agentEnabled: boolean[];
  agentVolumes: number[];
  droneJIOvertones: Record<string, number>;
  droneOvertoneWaveform: OscillatorType;
  dronePreset: string;
  keyboardHoldCustomSegments?: number;
  keyboardHoldPatternSteps?: number[];
  keyboardHoldReferenceBars?: number;
  keyboardHoldSegments?: number;
  keyboardHoldSoundPreset?: string;
  particleGradientX: string;
  particleGradientY: string;
  particleMute: boolean;
  particlePreset: string;
  particleSampleProfileMode?: ParticleSampleProfileMode;
  particleVolume: number;
  resonanceHotkeyMode: string;
  waveDecay?: string;
  waveOvertoneArpPattern: string;
  waveOvertoneArpRate: number;
  waveOvertoneArpSteps: number;
  waveOvertoneGlobalLevel?: number;
  waveOvertoneMode: string;
  waveOvertoneWaveform: OscillatorType;
  waveOvertones: Record<string, number>;
  waveOvertonesEnabled: boolean;
  waveRadius?: number;
  waveStarterHoldCustomSegments?: number;
  waveStarterHoldPatternSteps?: number[];
  waveStarterHoldReferenceBars?: number;
  waveStarterHoldSegments?: number;
  waveStarterHoldSoundPreset?: string;
  waveTimbreGradientEnabled: boolean;
  waveTimbreGradientX: string;
  waveVolumeGradientEnabled: boolean;
  waveVolumeGradientX: string;
};
