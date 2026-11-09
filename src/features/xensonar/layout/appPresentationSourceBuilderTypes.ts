import type { BuildAppResonanceAuxPanelRuntimeArgsInput } from './appResonanceAuxPanelRuntimeArgsTypes';
import type { BuildAppResonanceScreenStageSourceInput } from './appResonanceScreenStageSourceTypes';
import type { BuildAppResonanceScreenSoundPaletteSourceInput } from './appResonanceScreenSoundPaletteSourceTypes';
import type { AppResonanceScreenRuntimeAssemblyCorePanelsInput } from './useAppResonanceScreenRuntimeAssemblyTypes';
import type { AppResonanceScreenSoundPaletteActionSource } from './appResonanceScreenPanelRuntimeArgsTypes';
import type { BuildAppRoomSceneRuntimeSourceInput } from './appRoomSceneRuntimeSourceTypes';
import type { useSpectralForgeEntryUploadState } from '../rooms/useSpectralForgeEntryUploadState';

export type BuildAppResonanceAuxPanelPresentationSourceInput = BuildAppResonanceAuxPanelRuntimeArgsInput;
export type BuildAppResonanceSoundPaletteActionPresentationSourceInput = AppResonanceScreenSoundPaletteActionSource;
export type BuildAppResonanceScreenStagePresentationSourceInput = BuildAppResonanceScreenStageSourceInput;
export type BuildAppResonanceScreenSoundPalettePresentationSourceInput = BuildAppResonanceScreenSoundPaletteSourceInput;
export type BuildAppResonanceScreenCorePanelsPresentationSourceInput = AppResonanceScreenRuntimeAssemblyCorePanelsInput;

export type SpectralForgeEntryUploadState = ReturnType<typeof useSpectralForgeEntryUploadState>;

export type AppRoomSceneViewportPresentationSourceInput = Omit<
  BuildAppRoomSceneRuntimeSourceInput['viewport'],
  'spectralForgeEntryScene'
> & {
  readonly spectralForgeEntryUploadState: SpectralForgeEntryUploadState;
};

export type BuildAppRoomScenePresentationSourceInput = Omit<
  BuildAppRoomSceneRuntimeSourceInput,
  'viewport'
> & {
  readonly viewport: AppRoomSceneViewportPresentationSourceInput;
};
