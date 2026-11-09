import type { AppResonanceScreenDynamicSoundPaletteSourceArgs } from './appResonanceScreenPanelRuntimeArgsTypes';

export type AppResonanceScreenSoundPalettePresetMenuSourceArgs = Pick<
  AppResonanceScreenDynamicSoundPaletteSourceArgs,
  'waveSoundPresets'
>;

export type AppResonanceScreenSoundPaletteMetaMandalaSourceArgs = Pick<
  AppResonanceScreenDynamicSoundPaletteSourceArgs,
  | 'mandalaPresetColors'
  | 'mandalaRandomizingPresetId'
  | 'rouletteIsSpinning'
  | 'highlightedMandalaPresetId'
  | 'activeMetaPreset'
  | 'activeMetaPresetId'
  | 'sessionMetaOverrides'
  | 'startMetaPresetRoulette'
  | 'hexToRgba'
>;

export type AppResonanceScreenSoundPaletteWaveControlSourceArgs = Pick<
  AppResonanceScreenDynamicSoundPaletteSourceArgs,
  | 'waveSoundPreset'
  | 'waveSoundEnabled'
  | 'setWaveSoundEnabled'
  | 'waveSoundVolume'
  | 'setWaveSoundVolume'
  | 'setDronePreset'
  | 'setWaveSoundPreset'
  | 'previewWavePresetSelection'
>;

export type AppResonanceScreenSoundPaletteOvertoneControlSourceArgs = Pick<
  AppResonanceScreenDynamicSoundPaletteSourceArgs,
  | 'activeOvertoneMixer'
  | 'setActiveOvertoneMixer'
  | 'selectedWaveOvertonePreset'
  | 'applyWaveOvertonePreset'
  | 'setWaveOvertone'
  | 'setDroneOvertone'
>;

export type BuildAppResonanceScreenSoundPaletteSourceInput = {
  readonly presetMenus: AppResonanceScreenSoundPalettePresetMenuSourceArgs;
  readonly metaMandala: AppResonanceScreenSoundPaletteMetaMandalaSourceArgs;
  readonly waveControls: AppResonanceScreenSoundPaletteWaveControlSourceArgs;
  readonly overtoneControls: AppResonanceScreenSoundPaletteOvertoneControlSourceArgs;
};
