import type { buildAppShellFrameProps } from './appShellFrameProps';
import type { buildAppChromeRuntimeBindings } from './appChromeRuntimeBindings';
import type { buildAppRoomSceneRuntimeBindings } from '../rooms/appRoomSceneRuntimeBindings';
import type { buildResonancePanelRuntimeBindings } from '../rooms/resonancePanelRuntimeBindings';

export type BuildAppResonanceScreenRuntimePropsArgs = {
  chrome: Parameters<typeof buildAppChromeRuntimeBindings>[0];
  resonancePanels: Parameters<typeof buildResonancePanelRuntimeBindings>[0];
};

export type BuildAppRoomSceneRuntimePropsArgs = Parameters<
  typeof buildAppRoomSceneRuntimeBindings
>[0];

export type BuildAppSurfaceRuntimePropsArgs = Parameters<typeof buildAppShellFrameProps>[0];
