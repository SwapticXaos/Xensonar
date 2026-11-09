import type { MetaPresetId } from '../domain/metaPresetTypes';
import type { ParticleSystemRuntimeProps } from '../rooms/buildParticleSystemProps';
import type { ResonanceControlRuntimeSpreadProps } from '../rooms/resonanceControlRuntimeTypes';
import type { WaveOvertoneMixPresetId } from '../rooms/resonanceUiConfig';
import type { AppResonanceAuxPanelRuntimeArgs } from './appResonanceAuxPanelRuntimeArgsTypes';
import type { BuildAppResonanceScreenRuntimePropsArgs } from './appSurfaceRuntimeCoordinatorTypes';

export type ResonanceScreenRuntimeArgs = BuildAppResonanceScreenRuntimePropsArgs;
export type ResonancePanelRuntimeArgs = ResonanceScreenRuntimeArgs['resonancePanels'];

export type AppResonanceScreenSoundPaletteCatalogKey =
  | 'dronePresets'
  | 'waveTimbreGradientPresets'
  | 'waveVolumeGradientPresets'
  | 'waveOvertoneModes'
  | 'waveOvertoneArpRates'
  | 'waveOvertoneArpPatterns'
  | 'droneJiOvertones'
  | 'waveOvertoneMixPresets'
  | 'waveDecayPresets'
  | 'metaPresets'
  | 'mandalaDotPositions';

export type AppResonanceScreenSoundPaletteCatalogArgs = Pick<
  ResonancePanelRuntimeArgs,
  AppResonanceScreenSoundPaletteCatalogKey
>;

export type AppResonanceScreenSoundPaletteActionAdapterKey =
  | 'setSelectedWaveOvertonePreset'
  | 'randomizeMetaPresetForSession'
  | 'applyMetaPreset';

export type AppResonanceScreenSoundPaletteActionArgs = Pick<
  ResonancePanelRuntimeArgs,
  AppResonanceScreenSoundPaletteActionAdapterKey
>;

export type AppResonanceScreenSoundPaletteActionSource = {
  readonly setSelectedWaveOvertonePreset: (value: WaveOvertoneMixPresetId) => void;
  readonly randomizeMetaPresetForSession: (presetId: MetaPresetId) => void;
  readonly applyMetaPreset: (presetId: MetaPresetId) => void;
};

export type AppResonanceScreenCorePanelArgs = Omit<
  ResonancePanelRuntimeArgs,
  | keyof AppResonanceAuxPanelRuntimeArgs
  | AppResonanceScreenSoundPaletteCatalogKey
  | AppResonanceScreenSoundPaletteActionAdapterKey
>;

export type AppResonanceScreenStageSourceKey =
  | 'nexusActive'
  | 'resonanceInputIndicator'
  | 'nexusCanvasRef'
  | 'gameWidth'
  | 'gameHeight'
  | 'installationSharedFieldActive'
  | 'installationSharedFieldController'
  | 'ensureAudioReady'
  | 'prewarmAudioRuntime'
  | 'resetResonanceTransientState'
  | 'setNexusActive'
  | 'updateNParams'
  | 'nexusParamsRef'
  | 'audioCtx'
  | 'updateFocusCursor'
  | 'activeGridDragStepRef'
  | 'activeGridDragStartYRef'
  | 'activeGridDragBaseOffsetRef'
  | 'activeGridDragMovedRef'
  | 'getVisibleGridLines'
  | 'yFromFreq'
  | 'setManualGridStepOffset'
  | 'nexusRefs'
  | 'commitResonanceCursorY'
  | 'toggleManualGridStepMute'
  | 'spawnNexusRipple'
  | 'setPlayfieldCursorInside';

export type AppResonanceScreenDynamicSoundPaletteSourceKey =
  | 'waveSoundPresets'
  | 'mandalaPresetColors'
  | 'mandalaRandomizingPresetId'
  | 'rouletteIsSpinning'
  | 'highlightedMandalaPresetId'
  | 'activeMetaPreset'
  | 'activeMetaPresetId'
  | 'sessionMetaOverrides'
  | 'waveSoundPreset'
  | 'waveSoundEnabled'
  | 'setWaveSoundEnabled'
  | 'waveSoundVolume'
  | 'setWaveSoundVolume'
  | 'activeOvertoneMixer'
  | 'setActiveOvertoneMixer'
  | 'selectedWaveOvertonePreset'
  | 'setDronePreset'
  | 'setWaveSoundPreset'
  | 'previewWavePresetSelection'
  | 'applyWaveOvertonePreset'
  | 'setWaveOvertone'
  | 'setDroneOvertone'
  | 'startMetaPresetRoulette'
  | 'hexToRgba';

export type AppResonanceScreenStageSourceArgs = Pick<
  AppResonanceScreenCorePanelArgs,
  AppResonanceScreenStageSourceKey
>;

export type AppResonanceScreenDynamicSoundPaletteSourceArgs = Pick<
  AppResonanceScreenCorePanelArgs,
  AppResonanceScreenDynamicSoundPaletteSourceKey
>;

export type AppResonanceScreenCorePanelSourceArgs = {
  readonly stage: AppResonanceScreenStageSourceArgs;
  readonly resonanceControl: ResonanceControlRuntimeSpreadProps;
  readonly particleSystem: ParticleSystemRuntimeProps;
  readonly soundPalette: AppResonanceScreenDynamicSoundPaletteSourceArgs;
};

export type AppResonanceScreenPanelRuntimeArgsInput = {
  readonly corePanelSource: AppResonanceScreenCorePanelSourceArgs;
  readonly soundPaletteActions: AppResonanceScreenSoundPaletteActionSource;
  readonly auxPanelArgs: AppResonanceAuxPanelRuntimeArgs;
};

export type AppResonanceScreenPanelRuntimeArgs = ResonancePanelRuntimeArgs;

