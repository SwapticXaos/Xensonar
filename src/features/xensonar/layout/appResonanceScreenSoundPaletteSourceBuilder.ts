import type { AppResonanceScreenDynamicSoundPaletteSourceArgs } from './appResonanceScreenPanelRuntimeArgsTypes';
import type { BuildAppResonanceScreenSoundPaletteSourceInput } from './appResonanceScreenSoundPaletteSourceTypes';
export type {
  AppResonanceScreenSoundPaletteMetaMandalaSourceArgs,
  AppResonanceScreenSoundPaletteOvertoneControlSourceArgs,
  AppResonanceScreenSoundPalettePresetMenuSourceArgs,
  AppResonanceScreenSoundPaletteWaveControlSourceArgs,
  BuildAppResonanceScreenSoundPaletteSourceInput,
} from './appResonanceScreenSoundPaletteSourceTypes';

export const APP_RESONANCE_SCREEN_SOUND_PALETTE_SOURCE_BUILDER_PROBE = {
  candidateModuleName: 'appResonanceScreenSoundPaletteSourceBuilder',
  cleanupKind: 'app-resonance-screen-sound-palette-source-builder-probe',
  appOwnsSoundPaletteSourceInputComposition: true,
  builderOwnsSoundPaletteSourceFlattening: true,
  builderOwnsRuntime: false,
  builderMutatesAudio: false,
  builderOwnsRoomLifecycle: false,
  builderOwnsPackagePersistence: false,
  builderOwnsWaveStarterRuntime: false,
  builderOwnsParticleRuntime: false,
  builderCreatesPreviewHandlers: false,
  builderCreatesMetaRouletteBodies: false,
  builderCreatesAudioPreviewBodies: false,
  sourceGroups: [
    'presetMenus',
    'metaMandala',
    'waveControls',
    'overtoneControls',
  ] as const,
  explicitlyNotMoved: [
    'WaveStarter/Wellenstarter audio preview bodies remain App-owned inputs',
    'Meta-preset roulette/randomizer bodies remain App-owned inputs',
    'Drone/wave/overtone action bodies remain App-owned inputs',
    'static sound-palette catalogs remain in appResonanceScreenPanelRuntimeArgs',
    'string-facing action adapters remain in appResonanceScreenPanelRuntimeArgs',
  ] as const,
} as const;

export function buildAppResonanceScreenSoundPaletteSource({
  presetMenus,
  metaMandala,
  waveControls,
  overtoneControls,
}: BuildAppResonanceScreenSoundPaletteSourceInput): AppResonanceScreenDynamicSoundPaletteSourceArgs {
  return {
    ...presetMenus,
    ...metaMandala,
    ...waveControls,
    ...overtoneControls,
  } satisfies AppResonanceScreenDynamicSoundPaletteSourceArgs;
}
