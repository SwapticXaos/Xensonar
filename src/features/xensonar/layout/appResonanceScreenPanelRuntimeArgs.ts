import {
  DRONE_JI_OVERTONES,
  DRONE_PRESETS,
  WAVE_DECAY_PRESETS,
  WAVE_TIMBRE_GRADIENT_PRESETS,
  WAVE_VOLUME_GRADIENT_PRESETS,
} from '../domain/instrumentData';
import { META_PRESETS } from '../domain/metaPresets';
import type { MetaPresetId } from '../domain/metaPresetTypes';
import {
  MANDALA_DOT_POSITIONS,
  WAVE_OVERTONE_ARP_PATTERNS,
  WAVE_OVERTONE_ARP_RATES,
  WAVE_OVERTONE_MIX_PRESETS,
  WAVE_OVERTONE_MODES,
  type WaveOvertoneMixPresetId,
} from '../rooms/resonanceUiConfig';
import type {
  AppResonanceScreenCorePanelArgs,
  AppResonanceScreenCorePanelSourceArgs,
  AppResonanceScreenPanelRuntimeArgs,
  AppResonanceScreenPanelRuntimeArgsInput,
  AppResonanceScreenSoundPaletteActionArgs,
  AppResonanceScreenSoundPaletteActionSource,
  AppResonanceScreenSoundPaletteCatalogArgs,
  ResonancePanelRuntimeArgs,
} from './appResonanceScreenPanelRuntimeArgsTypes';

export type * from './appResonanceScreenPanelRuntimeArgsTypes';

export const APP_RESONANCE_SCREEN_PANEL_RUNTIME_ARGS_BUILDER_EXTRACT = {
  candidateModuleName: 'appResonanceScreenPanelRuntimeArgs',
  cleanupKind: 'app-resonance-screen-panel-runtime-args-builder-extract',
  boundaryOwnsScreenRuntimeEntryComposition: true,
  panelArgsModuleOwnsCorePanelFlattening: true,
  panelArgsModuleOwnsStaticSoundPaletteCatalogs: true,
  panelArgsModuleOwnsSoundPaletteActionAdapters: true,
  panelArgsModuleOwnsAuxPanelFlattening: false,
  panelArgsModuleOwnsRuntime: false,
  panelArgsModuleMutatesAudio: false,
  panelArgsModuleOwnsRoomLifecycle: false,
  panelArgsModuleOwnsPackagePersistence: false,
  extractedFromBoundary: 'useAppResonanceScreenRuntimeBoundary',
  preservedBuilder: 'buildAppResonanceScreenRuntimeEntry',
  composedPanelArgs: [
    'corePanelSource',
    'soundPaletteCatalogs',
    'soundPaletteActionAdapters',
    'auxPanelArgs',
  ] as const,
} as const;

export const APP_RESONANCE_SCREEN_CORE_PANEL_SOURCE_GROUP_MAP = {
  candidateBoundaryName: 'useAppResonanceScreenRuntimeBoundary',
  cleanupKind: 'app-resonance-screen-core-panel-source-group-map',
  appOwnsCorePanelSourceGrouping: true,
  boundaryOwnsCorePanelFlattening: true,
  panelArgsModuleOwnsCorePanelFlattening: true,
  boundaryOwnsRuntime: false,
  boundaryMutatesAudio: false,
  boundaryOwnsRoomLifecycle: false,
  boundaryOwnsPackagePersistence: false,
  sourceGroups: [
    'stage',
    'resonanceControl',
    'particleSystem',
    'soundPalette',
  ] as const,
  explicitlyNotMoved: [
    'stage canvas/audio readiness bodies',
    'resonanceControl grid/tuning/traffic/tone/myzel action bodies',
    'particleSystem agent action bodies',
    'soundPalette preview/audio action bodies',
  ] as const,
} as const;

export const APP_RESONANCE_SCREEN_SOUND_PALETTE_CATALOG_SOURCE_CLEANUP = {
  candidateBoundaryName: 'useAppResonanceScreenRuntimeBoundary',
  cleanupKind: 'app-resonance-screen-sound-palette-catalog-source-cleanup',
  appOwnsStaticSoundPaletteCatalogs: false,
  boundaryOwnsStaticSoundPaletteCatalogs: false,
  panelArgsModuleOwnsStaticSoundPaletteCatalogs: true,
  appOwnsDynamicSoundPaletteState: true,
  boundaryOwnsRuntime: false,
  boundaryMutatesAudio: false,
  boundaryOwnsRoomLifecycle: false,
  boundaryOwnsPackagePersistence: false,
  retainedDynamicAppInputs: [
    'waveSoundPresets',
    'particlePresets',
    'mandalaPresetColors',
    'activeMetaPreset',
    'sessionMetaOverrides',
  ] as const,
} as const;

export const APP_RESONANCE_SCREEN_SOUND_PALETTE_ACTION_SOURCE_CLEANUP = {
  candidateBoundaryName: 'useAppResonanceScreenRuntimeBoundary',
  cleanupKind: 'app-resonance-screen-sound-palette-action-source-cleanup',
  appOwnsSoundPaletteActionAdapters: false,
  boundaryOwnsSoundPaletteActionAdapters: false,
  panelArgsModuleOwnsSoundPaletteActionAdapters: true,
  appOwnsTypedSoundPaletteActions: true,
  boundaryOwnsRuntime: false,
  boundaryMutatesAudio: false,
  boundaryOwnsRoomLifecycle: false,
  boundaryOwnsPackagePersistence: false,
  adaptedStringPanelActions: [
    'setSelectedWaveOvertonePreset',
    'randomizeMetaPresetForSession',
    'applyMetaPreset',
  ] as const,
} as const;

export function buildAppResonanceScreenCorePanelArgs({
  stage,
  resonanceControl,
  particleSystem,
  soundPalette,
}: AppResonanceScreenCorePanelSourceArgs): AppResonanceScreenCorePanelArgs {
  return {
    ...stage,
    ...resonanceControl,
    ...particleSystem,
    ...soundPalette,
  };
}

export function buildAppResonanceScreenSoundPaletteCatalogArgs(): AppResonanceScreenSoundPaletteCatalogArgs {
  return {
    dronePresets: DRONE_PRESETS,
    waveTimbreGradientPresets: WAVE_TIMBRE_GRADIENT_PRESETS,
    waveVolumeGradientPresets: WAVE_VOLUME_GRADIENT_PRESETS,
    waveOvertoneModes: WAVE_OVERTONE_MODES,
    waveOvertoneArpRates: WAVE_OVERTONE_ARP_RATES,
    waveOvertoneArpPatterns: WAVE_OVERTONE_ARP_PATTERNS,
    droneJiOvertones: DRONE_JI_OVERTONES,
    waveOvertoneMixPresets: WAVE_OVERTONE_MIX_PRESETS,
    waveDecayPresets: WAVE_DECAY_PRESETS,
    metaPresets: META_PRESETS,
    mandalaDotPositions: MANDALA_DOT_POSITIONS,
  };
}

export function buildAppResonanceScreenSoundPaletteActionArgs(
  source: AppResonanceScreenSoundPaletteActionSource,
): AppResonanceScreenSoundPaletteActionArgs {
  return {
    setSelectedWaveOvertonePreset: (value) =>
      source.setSelectedWaveOvertonePreset(value as WaveOvertoneMixPresetId),
    randomizeMetaPresetForSession: (presetId) =>
      source.randomizeMetaPresetForSession(presetId as MetaPresetId),
    applyMetaPreset: (presetId) => source.applyMetaPreset(presetId as MetaPresetId),
  };
}

export function buildAppResonanceScreenPanelRuntimeArgs({
  corePanelSource,
  soundPaletteActions,
  auxPanelArgs,
}: AppResonanceScreenPanelRuntimeArgsInput): AppResonanceScreenPanelRuntimeArgs {
  const corePanelArgs = buildAppResonanceScreenCorePanelArgs(corePanelSource);
  const soundPaletteCatalogArgs = buildAppResonanceScreenSoundPaletteCatalogArgs();
  const soundPaletteActionArgs = buildAppResonanceScreenSoundPaletteActionArgs(soundPaletteActions);
  return {
    ...corePanelArgs,
    ...soundPaletteCatalogArgs,
    ...soundPaletteActionArgs,
    ...auxPanelArgs,
  } satisfies ResonancePanelRuntimeArgs;
}
