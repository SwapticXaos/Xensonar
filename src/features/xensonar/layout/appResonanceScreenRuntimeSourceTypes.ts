import type { BuildAppResonanceAuxPanelRuntimeArgsInput } from './appResonanceAuxPanelRuntimeArgsTypes';
import type {
  AppResonanceScreenCorePanelSourceArgs,
  AppResonanceScreenSoundPaletteActionSource,
  ResonanceScreenRuntimeArgs,
} from './appResonanceScreenPanelRuntimeArgsTypes';

export type AppResonanceScreenRuntimeSourceChromeArgs = ResonanceScreenRuntimeArgs['chrome'];
export type AppResonanceScreenRuntimeSourceAuxPanelArgs = BuildAppResonanceAuxPanelRuntimeArgsInput;
export type AppResonanceScreenRuntimeSourceSoundPaletteActionArgs = AppResonanceScreenSoundPaletteActionSource;
export type AppResonanceScreenRuntimeSourceCorePanelArgs = AppResonanceScreenCorePanelSourceArgs;

export type AppResonanceScreenRuntimeSourceArgs = {
  readonly chrome: AppResonanceScreenRuntimeSourceChromeArgs;
  readonly auxPanels: AppResonanceScreenRuntimeSourceAuxPanelArgs;
  readonly soundPaletteActions: AppResonanceScreenRuntimeSourceSoundPaletteActionArgs;
  readonly resonancePanels: AppResonanceScreenRuntimeSourceCorePanelArgs;
};

export type BuildAppResonanceScreenRuntimeSourceInput = {
  readonly chrome: AppResonanceScreenRuntimeSourceChromeArgs;
  readonly auxPanels: AppResonanceScreenRuntimeSourceAuxPanelArgs;
  readonly soundPaletteActions: AppResonanceScreenRuntimeSourceSoundPaletteActionArgs;
  readonly corePanels: AppResonanceScreenRuntimeSourceCorePanelArgs;
};
