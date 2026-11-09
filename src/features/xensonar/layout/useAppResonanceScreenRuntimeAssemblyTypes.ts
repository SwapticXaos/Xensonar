import type {
  AppResonanceScreenRuntimeSourceAuxPanelArgs,
  AppResonanceScreenRuntimeSourceChromeArgs,
  AppResonanceScreenRuntimeSourceCorePanelArgs,
  AppResonanceScreenRuntimeSourceSoundPaletteActionArgs,
} from './appResonanceScreenRuntimeSourceTypes';
import type { BuildAppResonanceScreenSoundPaletteSourceInput } from './appResonanceScreenSoundPaletteSourceTypes';
import type { BuildAppResonanceScreenStageSourceInput } from './appResonanceScreenStageSourceTypes';

export type AppResonanceScreenRuntimeAssemblyCorePanelsInput = Pick<
  AppResonanceScreenRuntimeSourceCorePanelArgs,
  'resonanceControl' | 'particleSystem'
>;

export type UseAppResonanceScreenRuntimeAssemblyArgs = {
  readonly chrome: AppResonanceScreenRuntimeSourceChromeArgs;
  readonly auxPanels: AppResonanceScreenRuntimeSourceAuxPanelArgs;
  readonly soundPaletteActions: AppResonanceScreenRuntimeSourceSoundPaletteActionArgs;
  readonly stage: BuildAppResonanceScreenStageSourceInput;
  readonly soundPalette: BuildAppResonanceScreenSoundPaletteSourceInput;
  readonly corePanels: AppResonanceScreenRuntimeAssemblyCorePanelsInput;
};
