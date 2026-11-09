import { buildAppRoomSceneRuntimeSource } from './appRoomSceneRuntimeSourceBuilder';
import type { AppRoomSceneViewportSpectralForgeEntrySourceArgs } from './appRoomSceneRuntimeSourceTypes';
import type { AppResonanceScreenSoundPaletteActionSource } from './appResonanceScreenPanelRuntimeArgsTypes';
import type {
  BuildAppResonanceAuxPanelPresentationSourceInput,
  BuildAppResonanceSoundPaletteActionPresentationSourceInput,
  BuildAppResonanceScreenStagePresentationSourceInput,
  BuildAppResonanceScreenSoundPalettePresentationSourceInput,
  BuildAppResonanceScreenCorePanelsPresentationSourceInput,
  SpectralForgeEntryUploadState,
  BuildAppRoomScenePresentationSourceInput,
} from './appPresentationSourceBuilderTypes';

export type * from './appPresentationSourceBuilderTypes';

export const APP_PRESENTATION_SOURCE_BUILDERS_PROBE = {
  cleanupKind: 'app-presentation-source-builders',
  ownsRuntime: false,
  mutatesAudio: false,
  ownsEffects: false,
  ownsScheduling: false,
  ownsRoomLifecycle: false,
  ownsPackagePersistence: false,
  onlyBuildsPresentationSourceObjects: true,
  movedFromAppCallsite: [
    'resonance aux panel source literal',
    'sound-palette action source literal',
    'SpectralForge entry consumed/scroll-intent callbacks inside room-scene source literal',
    'resonance screen stage source literal',
    'resonance screen sound-palette source literal',
    'resonance screen core-panel source literal',
  ] as const,
  explicitlyNotMoved: [
    'useAppResonancePanelPropsBoundary hook',
    'useAppResonanceScreenRuntimeAssembly hook',
    'stage handler construction, audio readiness bodies and grid/cursor action bodies',
    'sound-palette preview, roulette and overtone action bodies',
    'useAppRoomSceneRuntimeBoundary hook',
    'useStationaryRhythmWorkletProbeController hook',
    'useAppSurfaceFrameRuntimeBoundary hook',
    'WaveStarter, Root-Follow, Materialspur, SpectralForge and Stable-Rhythm behavior',
  ] as const,
} as const;


export function buildAppResonanceScreenStagePresentationSource(
  input: BuildAppResonanceScreenStagePresentationSourceInput,
): BuildAppResonanceScreenStagePresentationSourceInput {
  return input;
}

export function buildAppResonanceScreenSoundPalettePresentationSource(
  input: BuildAppResonanceScreenSoundPalettePresentationSourceInput,
): BuildAppResonanceScreenSoundPalettePresentationSourceInput {
  return input;
}

export function buildAppResonanceScreenCorePanelsPresentationSource(
  input: BuildAppResonanceScreenCorePanelsPresentationSourceInput,
): BuildAppResonanceScreenCorePanelsPresentationSourceInput {
  return input;
}

export function buildAppResonanceAuxPanelPresentationSource(
  input: BuildAppResonanceAuxPanelPresentationSourceInput,
): BuildAppResonanceAuxPanelPresentationSourceInput {
  return input;
}

export function buildAppResonanceSoundPaletteActionSource(
  input: BuildAppResonanceSoundPaletteActionPresentationSourceInput,
): AppResonanceScreenSoundPaletteActionSource {
  return input;
}

export function buildAppSpectralForgeEntrySceneSource(
  spectralForgeEntryUploadState: SpectralForgeEntryUploadState,
): AppRoomSceneViewportSpectralForgeEntrySourceArgs {
  return {
    externalAudioUploadFile: spectralForgeEntryUploadState.spectralForgeExternalAudioFile,
    externalAudioUploadOrigin: spectralForgeEntryUploadState.spectralForgeExternalAudioOrigin,
    entryScrollIntent: spectralForgeEntryUploadState.spectralForgeEntryScrollIntent,
    onExternalAudioUploadConsumed: () => {
      spectralForgeEntryUploadState.setSpectralForgeExternalAudioFile(null);
      spectralForgeEntryUploadState.setSpectralForgeExternalAudioOrigin(null);
    },
    onEntryScrollIntentConsumed: (token) => {
      spectralForgeEntryUploadState.setSpectralForgeEntryScrollIntent((current) =>
        current?.token === token ? null : current,
      );
    },
  } satisfies AppRoomSceneViewportSpectralForgeEntrySourceArgs;
}

export function buildAppRoomScenePresentationSource({
  contracts,
  topology,
  installation,
  viewport,
}: BuildAppRoomScenePresentationSourceInput): ReturnType<typeof buildAppRoomSceneRuntimeSource> {
  return buildAppRoomSceneRuntimeSource({
    contracts,
    topology,
    installation,
    viewport: {
      xenpolarScene: viewport.xenpolarScene,
      gameArenaScene: viewport.gameArenaScene,
      spectralForgeEntryScene: buildAppSpectralForgeEntrySceneSource(viewport.spectralForgeEntryUploadState),
    },
  });
}
