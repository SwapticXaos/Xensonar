import type {
  AppResonanceScreenRuntimeSourceArgs,
  BuildAppResonanceScreenRuntimeSourceInput,
} from './appResonanceScreenRuntimeSourceTypes';
export type {
  AppResonanceScreenRuntimeSourceArgs,
  AppResonanceScreenRuntimeSourceAuxPanelArgs,
  AppResonanceScreenRuntimeSourceChromeArgs,
  AppResonanceScreenRuntimeSourceCorePanelArgs,
  AppResonanceScreenRuntimeSourceSoundPaletteActionArgs,
  BuildAppResonanceScreenRuntimeSourceInput,
} from './appResonanceScreenRuntimeSourceTypes';

export const APP_RESONANCE_SCREEN_RUNTIME_SOURCE_BUILDER_PROBE = {
  candidateModuleName: 'appResonanceScreenRuntimeSourceBuilder',
  cleanupKind: 'app-resonance-screen-runtime-source-builder-probe',
  appOwnsScreenRuntimeSourceInputComposition: true,
  builderOwnsScreenRuntimeSourceTopologyOrdering: true,
  builderOwnsRuntime: false,
  builderMutatesAudio: false,
  builderOwnsRoomLifecycle: false,
  builderOwnsPackagePersistence: false,
  builderOwnsRootFollowRuntime: false,
  builderOwnsStageRuntime: false,
  builderOwnsSoundPaletteRuntime: false,
  builderOwnsAuxPanelFlattening: false,
  builderOwnsPanelRuntimeArgsFlattening: false,
  builderOwnsScreenRuntimeEntryComposition: false,
  sourceSections: [
    'chrome',
    'auxPanels',
    'soundPaletteActions',
    'corePanels',
  ] as const,
  corePanelSections: [
    'stage',
    'resonanceControl',
    'particleSystem',
    'soundPalette',
  ] as const,
  explicitlyNotMoved: [
    'stage source group flattening remains in appResonanceScreenStageSourceBuilder',
    'SoundPalette source group flattening remains in appResonanceScreenSoundPaletteSourceBuilder',
    'aux panel source normalization and flattening remain in the AuxPanel boundary chain',
    'panel runtime args flattening remains in appResonanceScreenPanelRuntimeArgs',
    'screen runtime entry composition remains in useAppResonanceScreenRuntimeBoundary',
    'no Stage handler, audio-readiness, grid/cursor, Root-Follow gate, preview, roulette, scheduler or package behavior moved',
  ] as const,
} as const;

export function buildAppResonanceScreenRuntimeSource({
  chrome,
  auxPanels,
  soundPaletteActions,
  corePanels,
}: BuildAppResonanceScreenRuntimeSourceInput): AppResonanceScreenRuntimeSourceArgs {
  return {
    chrome,
    auxPanels,
    soundPaletteActions,
    resonancePanels: corePanels,
  } satisfies AppResonanceScreenRuntimeSourceArgs;
}
